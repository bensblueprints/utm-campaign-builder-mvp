const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

function nativeBindingPath() {
  // Under Electron the Node-ABI binding won't load; use the vendored Electron prebuild.
  if (!process.versions.electron) return null;
  const p = path.join(__dirname, '..', 'vendor', 'better_sqlite3-electron.node');
  return fs.existsSync(p) ? p : null;
}

// short-code alphabet: unambiguous base58-ish
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function genCode(len = 7) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function openDb(dbPath) {
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const nativeBinding = nativeBindingPath();
  const db = new Database(dbPath, nativeBinding ? { nativeBinding } : {});
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      base_url TEXT NOT NULL,
      source TEXT NOT NULL,
      medium TEXT NOT NULL,
      campaign TEXT NOT NULL,
      term TEXT DEFAULT '',
      content TEXT DEFAULT '',
      tagged_url TEXT NOT NULL,
      short_code TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL,
      at INTEGER NOT NULL,
      referrer TEXT DEFAULT '',
      geo_country TEXT DEFAULT '',
      device TEXT DEFAULT '',
      ip TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_links_campaign ON links(campaign_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_clicks_link ON clicks(link_id, at);
    CREATE INDEX IF NOT EXISTS idx_clicks_at ON clicks(at);
  `);

  return db;
}

const DEFAULT_SETTINGS = {
  base_url: '',                       // public URL of this install, for short links
  enforce_naming: '0',
  allowed_sources: 'google, facebook, instagram, twitter, linkedin, tiktok, youtube, newsletter, email',
  allowed_mediums: 'cpc, social, email, organic, referral, display, affiliate, qr'
};

function getSettings(db) {
  const out = { ...DEFAULT_SETTINGS };
  if (process.env.BASE_URL) out.base_url = process.env.BASE_URL;
  for (const r of db.prepare('SELECT key, value FROM settings').all()) {
    if (r.value !== '' && r.value != null) out[r.key] = r.value;
  }
  return out;
}

function setSettings(db, obj) {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) {
      if (k in DEFAULT_SETTINGS) stmt.run(k, String(v ?? ''));
    }
  });
  tx(Object.entries(obj));
}

function namingRules(settings) {
  return {
    enforce: settings.enforce_naming === '1' || settings.enforce_naming === 'true',
    allowed_sources: String(settings.allowed_sources || '').split(',').map((s) => s.trim()).filter(Boolean),
    allowed_mediums: String(settings.allowed_mediums || '').split(',').map((s) => s.trim()).filter(Boolean)
  };
}

module.exports = { openDb, genCode, getSettings, setSettings, namingRules, DEFAULT_SETTINGS };
