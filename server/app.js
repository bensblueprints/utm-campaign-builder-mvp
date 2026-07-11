const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { openDb, genCode, getSettings, setSettings, namingRules } = require('./db');
const { UTM_FIELDS, buildUrl, enforceNaming, parseBulkCsv, deviceFromUA, csvEscape, parseBaseUrl } = require('./utm');

const SESSION_COOKIE = 'uc_session';

function createApp({ dbPath, adminPassword, autologinToken = null } = {}) {
  const db = openDb(dbPath);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(cookieParser());

  app.locals.db = db;

  const findLink = db.prepare('SELECT * FROM links WHERE id = ?');
  const findByCode = db.prepare('SELECT * FROM links WHERE short_code = ?');

  function requireAuth(req, res, next) {
    const token = req.cookies[SESSION_COOKIE];
    if (token && db.prepare('SELECT id FROM sessions WHERE token = ?').get(token)) return next();
    res.status(401).json({ error: 'unauthorized' });
  }

  function createSession(res) {
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token, created_at) VALUES (?, ?)').run(token, Date.now());
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax' });
  }

  // ── redirect endpoint (public, BEFORE json parsing, fast) ───────────────
  app.get('/r/:code', (req, res) => {
    const link = findByCode.get(req.params.code);
    if (!link) return res.status(404).send('Unknown link');
    try {
      const ip = (req.ip || '').replace('::ffff:', '');
      const country = String(
        req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-country-code'] || ''
      ).slice(0, 8);
      db.prepare('INSERT INTO clicks (link_id, at, referrer, geo_country, device, ip) VALUES (?, ?, ?, ?, ?, ?)')
        .run(
          link.id, Date.now(),
          String(req.headers.referer || '').slice(0, 500),
          country,
          deviceFromUA(req.headers['user-agent']),
          ip
        );
    } catch (e) {
      console.warn('[click]', e.message); // never let tracking break the redirect
    }
    res.redirect(302, link.tagged_url);
  });

  app.use(express.json({ limit: '2mb' }));

  // ── auth ─────────────────────────────────────────────────────────────
  app.get('/api/health', (req, res) => res.json({ ok: true, app: 'utmcraft' }));

  app.post('/api/login', (req, res) => {
    if ((req.body || {}).password !== adminPassword) return res.status(401).json({ error: 'wrong password' });
    createSession(res);
    res.json({ ok: true });
  });

  app.post('/api/logout', (req, res) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.clearCookie(SESSION_COOKIE);
    res.json({ ok: true });
  });

  app.get('/auth/auto', (req, res) => {
    if (autologinToken && req.query.token === autologinToken) createSession(res);
    res.redirect('/');
  });

  app.get('/api/me', requireAuth, (req, res) => res.json({ ok: true }));

  // ── campaigns ──────────────────────────────────────────────────────────
  app.get('/api/campaigns', requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT c.*, COUNT(l.id) AS link_count,
             (SELECT COUNT(*) FROM clicks k JOIN links l2 ON l2.id = k.link_id WHERE l2.campaign_id = c.id) AS click_count
      FROM campaigns c LEFT JOIN links l ON l.campaign_id = c.id
      GROUP BY c.id ORDER BY c.created_at DESC
    `).all();
    res.json(rows);
  });

  app.post('/api/campaigns', requireAuth, (req, res) => {
    const name = String((req.body || {}).name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const info = db.prepare('INSERT INTO campaigns (name, created_at) VALUES (?, ?)').run(name, Date.now());
      res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(info.lastInsertRowid));
    } catch (e) {
      res.status(409).json({ error: 'a campaign with that name already exists' });
    }
  });

  app.delete('/api/campaigns/:id', requireAuth, (req, res) => {
    db.prepare('UPDATE links SET campaign_id = NULL WHERE campaign_id = ?').run(req.params.id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ── links ──────────────────────────────────────────────────────────────
  function serializeLink(l) {
    const clicks = db.prepare('SELECT COUNT(*) AS n, MAX(at) AS last FROM clicks WHERE link_id = ?').get(l.id);
    return { ...l, click_count: clicks.n, last_click_at: clicks.last };
  }

  function createLinkRow(body, rules) {
    const base = String(body.base_url || '').trim();
    if (!parseBaseUrl(base)) return { error: 'base_url must be a valid http(s) URL' };
    const check = enforceNaming(body, rules);
    if (!check.ok) return { error: check.error };
    const p = check.params;
    const tagged = buildUrl(base, p);
    const now = Date.now();
    let code = genCode();
    while (findByCode.get(code)) code = genCode(); // collision paranoia
    const info = db.prepare(`
      INSERT INTO links (campaign_id, base_url, source, medium, campaign, term, content, tagged_url, short_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(body.campaign_id || null, base, p.source, p.medium, p.campaign, p.term, p.content, tagged, code, now);
    return { link: findLink.get(info.lastInsertRowid) };
  }

  app.get('/api/links', requireAuth, (req, res) => {
    const rows = req.query.campaign_id
      ? db.prepare('SELECT * FROM links WHERE campaign_id = ? ORDER BY created_at DESC').all(req.query.campaign_id)
      : db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
    res.json(rows.map(serializeLink));
  });

  app.post('/api/links', requireAuth, (req, res) => {
    const rules = namingRules(getSettings(db));
    const r = createLinkRow(req.body || {}, rules);
    if (r.error) return res.status(400).json({ error: r.error });
    res.status(201).json(serializeLink(r.link));
  });

  app.delete('/api/links/:id', requireAuth, (req, res) => {
    const l = findLink.get(req.params.id);
    if (!l) return res.status(404).json({ error: 'not found' });
    db.prepare('DELETE FROM clicks WHERE link_id = ?').run(l.id);
    db.prepare('DELETE FROM links WHERE id = ?').run(l.id);
    res.json({ ok: true });
  });

  // Bulk: body { csv, campaign_id? } → { created: [...], errors: [...] }
  app.post('/api/links/bulk', requireAuth, (req, res) => {
    const { csv, campaign_id } = req.body || {};
    if (!csv || !String(csv).trim()) return res.status(400).json({ error: 'csv text is required' });
    const rules = namingRules(getSettings(db));
    const { rows, errors } = parseBulkCsv(csv);
    const created = [];
    for (let i = 0; i < rows.length; i++) {
      const r = createLinkRow({ ...rows[i], campaign_id }, rules);
      if (r.error) errors.push({ line: i + 1, message: r.error });
      else created.push(serializeLink(r.link));
    }
    res.status(created.length ? 201 : 400).json({ created, errors });
  });

  // Autocomplete history per field
  app.get('/api/suggestions', requireAuth, (req, res) => {
    const field = String(req.query.field || '');
    if (!UTM_FIELDS.includes(field)) return res.status(400).json({ error: 'invalid field' });
    const rows = db.prepare(
      `SELECT ${field} AS v, COUNT(*) AS n FROM links WHERE ${field} != '' GROUP BY ${field} ORDER BY n DESC LIMIT 25`
    ).all();
    res.json(rows.map((r) => r.v));
  });

  // CSV export of all links + click counts
  app.get('/api/export.csv', requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT l.*, (SELECT COUNT(*) FROM clicks k WHERE k.link_id = l.id) AS click_count,
             c.name AS campaign_name
      FROM links l LEFT JOIN campaigns c ON c.id = l.campaign_id
      ORDER BY l.created_at DESC
    `).all();
    const base = getSettings(db).base_url;
    const header = 'created_at,campaign_group,base_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,tagged_url,short_link,clicks';
    const lines = rows.map((l) => [
      new Date(l.created_at).toISOString(),
      l.campaign_name || '',
      l.base_url, l.source, l.medium, l.campaign, l.term, l.content,
      l.tagged_url,
      (base ? base.replace(/\/$/, '') : '') + '/r/' + l.short_code,
      l.click_count
    ].map(csvEscape).join(','));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="utmcraft-links.csv"');
    res.send([header, ...lines].join('\n') + '\n');
  });

  // ── stats ──────────────────────────────────────────────────────────────
  app.get('/api/stats', requireAuth, (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = Date.now() - days * 86400000;
    const byDay = db.prepare(`
      SELECT date(at/1000, 'unixepoch') AS day, COUNT(*) AS clicks
      FROM clicks WHERE at >= ? GROUP BY day ORDER BY day
    `).all(since);
    const bySource = db.prepare(`
      SELECT l.source AS key, COUNT(*) AS clicks FROM clicks k JOIN links l ON l.id = k.link_id
      WHERE k.at >= ? GROUP BY l.source ORDER BY clicks DESC LIMIT 12
    `).all(since);
    const byMedium = db.prepare(`
      SELECT l.medium AS key, COUNT(*) AS clicks FROM clicks k JOIN links l ON l.id = k.link_id
      WHERE k.at >= ? GROUP BY l.medium ORDER BY clicks DESC LIMIT 12
    `).all(since);
    const byDevice = db.prepare(`
      SELECT device AS key, COUNT(*) AS clicks FROM clicks WHERE at >= ? GROUP BY device ORDER BY clicks DESC
    `).all(since);
    const topLinks = db.prepare(`
      SELECT l.id, l.base_url, l.source, l.medium, l.campaign, l.short_code, COUNT(*) AS clicks
      FROM clicks k JOIN links l ON l.id = k.link_id
      WHERE k.at >= ? GROUP BY l.id ORDER BY clicks DESC LIMIT 10
    `).all(since);
    const totals = {
      links: db.prepare('SELECT COUNT(*) AS n FROM links').get().n,
      campaigns: db.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n,
      clicks: db.prepare('SELECT COUNT(*) AS n FROM clicks WHERE at >= ?').get(since).n,
      clicks_all_time: db.prepare('SELECT COUNT(*) AS n FROM clicks').get().n
    };
    res.json({ days, totals, byDay, bySource, byMedium, byDevice, topLinks });
  });

  app.get('/api/links/:id/clicks', requireAuth, (req, res) => {
    const l = findLink.get(req.params.id);
    if (!l) return res.status(404).json({ error: 'not found' });
    const rows = db.prepare('SELECT at, referrer, geo_country, device FROM clicks WHERE link_id = ? ORDER BY at DESC LIMIT 200').all(l.id);
    res.json(rows);
  });

  // ── settings ───────────────────────────────────────────────────────────
  app.get('/api/settings', requireAuth, (req, res) => res.json(getSettings(db)));
  app.put('/api/settings', requireAuth, (req, res) => {
    setSettings(db, req.body || {});
    res.json(getSettings(db));
  });

  // ── static frontend ────────────────────────────────────────────────────
  const dist = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/r/')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  return app;
}

module.exports = { createApp };
