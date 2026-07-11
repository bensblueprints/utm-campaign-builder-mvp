// UTMcraft smoke test — boots the real server, exercises builder → naming
// enforcement → bulk CSV → redirect click tracking → stats → CSV export over
// real HTTP against a temp DB, and asserts rows land in SQLite.
// Kills ONLY the spawned server child (never broad-kills node processes).
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const TEST_PORT = 5392;
const ADMIN_PASSWORD = 'smoke-test-password';
const DB_PATH = path.join(__dirname, 'smoke.db');
const BASE = `http://127.0.0.1:${TEST_PORT}`;

for (const f of [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm']) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

let serverProc = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(fn, label, tries = 40, delay = 250) {
  for (let i = 0; i < tries; i++) {
    try {
      const v = await fn();
      if (v) return v;
    } catch { /* retry */ }
    await sleep(delay);
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

let cookie = '';
async function api(pathname, options = {}) {
  const res = await fetch(BASE + pathname, {
    redirect: 'manual',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  // 0. pure logic first (no server needed)
  console.log('0. Pure UTM logic: buildUrl, normalization, CSV parsing');
  const { buildUrl, normalizeValue, enforceNaming, parseBulkCsv, deviceFromUA } = require('../server/utm');
  assert.strictEqual(
    buildUrl('https://x.com/page?ref=1', { source: 'google', medium: 'cpc', campaign: 'spring_sale' }),
    'https://x.com/page?ref=1&utm_source=google&utm_medium=cpc&utm_campaign=spring_sale',
    'buildUrl preserves existing params and appends utm params'
  );
  assert.strictEqual(buildUrl('notaurl', { source: 'x' }), null, 'invalid base URL → null');
  assert.strictEqual(buildUrl('ftp://x.com', { source: 'x' }), null, 'non-http protocol rejected');
  assert.strictEqual(normalizeValue('  Spring Sale! '), 'spring_sale', 'normalize lowercases + underscores + strips junk');
  const enf = enforceNaming({ source: 'Email', medium: 'newsletter', campaign: 'x' },
    { enforce: true, allowed_sources: ['email'], allowed_mediums: ['email'] });
  assert.ok(!enf.ok && enf.error.includes('utm_medium'), 'enforcement rejects out-of-list medium (post-normalization)');
  const enfOk = enforceNaming({ source: 'Email', medium: 'Email', campaign: 'x' },
    { enforce: true, allowed_sources: ['email'], allowed_mediums: ['email'] });
  assert.ok(enfOk.ok && enfOk.params.source === 'email', '"Email" normalizes to allowed "email"');
  const csv = parseBulkCsv('base_url,source,medium,campaign\nhttps://a.com,fb,cpc,c1\nbadurl,fb,cpc,c2\n"https://b.com/x?a=1,b",ig,social,c3');
  assert.strictEqual(csv.rows.length, 2, 'CSV: 2 valid rows parsed');
  assert.strictEqual(csv.errors.length, 1, 'CSV: 1 invalid row rejected');
  assert.strictEqual(csv.rows[1].base_url, 'https://b.com/x?a=1,b', 'CSV: quoted field with comma parsed');
  assert.strictEqual(deviceFromUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'mobile', 'UA → mobile');
  assert.strictEqual(deviceFromUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'desktop', 'UA → desktop');
  console.log('   pure logic OK');

  console.log('1. Booting UTMcraft on port', TEST_PORT, 'with temp DB');
  serverProc = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT), ADMIN_PASSWORD, DB_PATH },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverProc.stdout.on('data', (d) => process.stdout.write(`   [server] ${d}`));
  serverProc.stderr.on('data', (d) => process.stderr.write(`   [server] ${d}`));

  await waitFor(async () => (await api('/api/health')).data.ok, 'server health');

  console.log('   Auth: wrong password → 401, unauthenticated list → 401, login → 200');
  const bad = await api('/api/login', { method: 'POST', body: { password: 'wrong' } });
  assert.strictEqual(bad.status, 401, 'wrong password must 401');
  cookie = '';
  const unauth = await api('/api/links');
  assert.strictEqual(unauth.status, 401, 'admin API must require auth');
  const good = await api('/api/login', { method: 'POST', body: { password: ADMIN_PASSWORD } });
  assert.strictEqual(good.status, 200, 'login must succeed');

  console.log('2. Campaign + link creation with normalization');
  const camp = await api('/api/campaigns', { method: 'POST', body: { name: 'Spring Sale 2026' } });
  assert.strictEqual(camp.status, 201, 'campaign create must 201');
  const dupCamp = await api('/api/campaigns', { method: 'POST', body: { name: 'Spring Sale 2026' } });
  assert.strictEqual(dupCamp.status, 409, 'duplicate campaign name must 409');

  const link = await api('/api/links', {
    method: 'POST',
    body: {
      campaign_id: camp.data.id,
      base_url: 'https://example.com/landing?ref=abc',
      source: 'Face Book', medium: 'CPC', campaign: 'Spring Sale', content: 'Ad A'
    }
  });
  assert.strictEqual(link.status, 201, 'link create must 201');
  assert.strictEqual(link.data.source, 'face_book', 'source normalized');
  assert.strictEqual(link.data.medium, 'cpc', 'medium normalized');
  assert.strictEqual(
    link.data.tagged_url,
    'https://example.com/landing?ref=abc&utm_source=face_book&utm_medium=cpc&utm_campaign=spring_sale&utm_content=ad_a',
    'tagged URL built correctly with existing params preserved'
  );
  assert.ok(link.data.short_code && link.data.short_code.length >= 6, 'short code generated');

  const noUrl = await api('/api/links', { method: 'POST', body: { base_url: 'nope', source: 'a', medium: 'b', campaign: 'c' } });
  assert.strictEqual(noUrl.status, 400, 'invalid base_url must 400');
  const noSource = await api('/api/links', { method: 'POST', body: { base_url: 'https://x.com', medium: 'b', campaign: 'c' } });
  assert.strictEqual(noSource.status, 400, 'missing source must 400');

  console.log('3. Naming enforcement blocks off-list values when locked');
  await api('/api/settings', {
    method: 'PUT',
    body: { enforce_naming: '1', allowed_sources: 'google, facebook, newsletter', allowed_mediums: 'cpc, email, social' }
  });
  const blocked = await api('/api/links', {
    method: 'POST',
    body: { base_url: 'https://example.com', source: 'tiktok', medium: 'cpc', campaign: 'x' }
  });
  assert.strictEqual(blocked.status, 400, 'off-list source must 400 when enforced');
  assert.ok(blocked.data.error.includes('tiktok'), 'error names the offending value');
  const allowed = await api('/api/links', {
    method: 'POST',
    body: { base_url: 'https://example.com', source: 'NEWSLETTER', medium: 'Email', campaign: 'july_promo' }
  });
  assert.strictEqual(allowed.status, 201, 'case-variant of allowed value passes (normalized)');
  await api('/api/settings', { method: 'PUT', body: { enforce_naming: '0' } });

  console.log('4. Bulk CSV → multiple links at once');
  const bulk = await api('/api/links/bulk', {
    method: 'POST',
    body: {
      campaign_id: camp.data.id,
      csv: 'base_url,source,medium,campaign,term,content\n' +
        'https://example.com/p,facebook,cpc,spring_sale,,ad_a\n' +
        'https://example.com/p,facebook,cpc,spring_sale,,ad_b\n' +
        'https://example.com/p,instagram,social,spring_sale,,ad_a\n' +
        'not-a-url,x,y,z,,'
    }
  });
  assert.strictEqual(bulk.status, 201, 'bulk create must 201');
  assert.strictEqual(bulk.data.created.length, 3, 'bulk created 3 links');
  assert.strictEqual(bulk.data.errors.length, 1, 'bulk reported 1 bad row');
  assert.ok(new Set(bulk.data.created.map((l) => l.short_code)).size === 3, 'each bulk link gets a unique code');

  console.log('5. Redirect endpoint: 302 to tagged URL + click rows in SQLite');
  const redirect = await fetch(`${BASE}/r/${link.data.short_code}`, {
    redirect: 'manual',
    headers: {
      Referer: 'https://www.facebook.com/',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      'CF-IPCountry': 'US'
    }
  });
  assert.strictEqual(redirect.status, 302, 'redirect must 302');
  assert.strictEqual(redirect.headers.get('location'), link.data.tagged_url, 'redirect location is the tagged URL');
  await fetch(`${BASE}/r/${link.data.short_code}`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });

  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH, { readonly: true });
  const clickRows = db.prepare('SELECT * FROM clicks WHERE link_id = ? ORDER BY id').all(link.data.id);
  assert.strictEqual(clickRows.length, 2, 'two click rows recorded in SQLite');
  assert.strictEqual(clickRows[0].referrer, 'https://www.facebook.com/', 'click records referrer');
  assert.strictEqual(clickRows[0].device, 'mobile', 'click classifies device from UA');
  assert.strictEqual(clickRows[0].geo_country, 'US', 'click stores country header when provided');
  assert.strictEqual(clickRows[1].device, 'desktop', 'second click classified desktop');

  const badCode = await fetch(`${BASE}/r/nope-not-real`, { redirect: 'manual' });
  assert.strictEqual(badCode.status, 404, 'unknown short code must 404');

  console.log('6. Stats aggregates reflect the clicks');
  const stats = await api('/api/stats?days=7');
  assert.strictEqual(stats.status, 200, 'stats must 200');
  assert.strictEqual(stats.data.totals.clicks, 2, 'stats count 2 clicks');
  const fbRow = stats.data.bySource.find((r) => r.key === 'face_book');
  assert.ok(fbRow && fbRow.clicks === 2, 'bySource aggregates under normalized source');
  assert.ok(stats.data.byDevice.some((r) => r.key === 'mobile'), 'byDevice includes mobile');
  assert.ok(stats.data.byDay.length >= 1 && stats.data.byDay[0].clicks >= 1, 'byDay has today');
  assert.ok(stats.data.topLinks[0].id === link.data.id, 'top link is the clicked one');

  console.log('7. Campaign rollups + link listing');
  const camps = await api('/api/campaigns');
  const c = camps.data.find((x) => x.id === camp.data.id);
  assert.strictEqual(c.link_count, 4, 'campaign groups 4 links (1 + 3 bulk)');
  assert.strictEqual(c.click_count, 2, 'campaign rolls up 2 clicks');
  const filtered = await api(`/api/links?campaign_id=${camp.data.id}`);
  assert.strictEqual(filtered.data.length, 4, 'links filter by campaign');
  assert.strictEqual(filtered.data.find((l) => l.id === link.data.id).click_count, 2, 'link click_count serialized');

  console.log('8. Suggestions (autocomplete history)');
  const sugg = await api('/api/suggestions?field=source');
  assert.ok(sugg.data.includes('face_book') && sugg.data.includes('facebook'), 'source history returned');
  const badField = await api('/api/suggestions?field=;drop table');
  assert.strictEqual(badField.status, 400, 'invalid suggestion field must 400');

  console.log('9. CSV export includes links + click counts');
  const csvRes = await fetch(`${BASE}/api/export.csv`, { headers: { Cookie: cookie } });
  assert.strictEqual(csvRes.status, 200, 'export must 200');
  assert.ok(csvRes.headers.get('content-type').includes('text/csv'), 'export content-type is csv');
  const csvText = await csvRes.text();
  const lines = csvText.trim().split('\n');
  // links created: 1 (builder) + 1 (enforcement pass) + 3 (bulk) = 5
  assert.strictEqual(lines.length, 1 + 5, 'export has header + 5 link rows');
  assert.ok(lines[0].startsWith('created_at,campaign_group,base_url,utm_source'), 'export header correct');
  const clickedLine = lines.find((l) => l.includes(link.data.short_code));
  assert.ok(clickedLine.trim().endsWith(',2'), 'export row carries click count 2');
  assert.ok(clickedLine.includes('Spring Sale 2026'), 'export row carries campaign group name');

  console.log('10. Link deletion cleans up clicks');
  await api(`/api/links/${link.data.id}`, { method: 'DELETE' });
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM clicks WHERE link_id = ?').get(link.data.id).n, 0,
    'deleting a link removes its click rows');

  db.close();
  console.log('\n✅ All smoke tests passed');
}

async function cleanup(code) {
  // kill ONLY the child we spawned — never broad-kill node/electron
  if (serverProc && !serverProc.killed) serverProc.kill();
  await sleep(300);
  for (const f of [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm']) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* windows file lock — harmless */ }
  }
  process.exit(code);
}

main()
  .then(() => cleanup(0))
  .catch(async (err) => {
    console.error('\n❌ Smoke test failed:', err.message);
    await cleanup(1);
  });
