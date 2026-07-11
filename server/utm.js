'use strict';
/**
 * UTM core logic: tagged-URL building, validation, naming-convention
 * normalization, and bulk CSV parsing. Pure functions — unit-tested directly
 * by the smoke test and shared by all endpoints.
 */

const UTM_FIELDS = ['source', 'medium', 'campaign', 'term', 'content'];

/** Validate a base URL (http/https only). Returns URL object or null. */
function parseBaseUrl(base) {
  try {
    const u = new URL(String(base).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

/**
 * Normalize a UTM value per convention: trim, lowercase, spaces→underscores.
 * (UTM values are case-sensitive in every analytics tool — "Email" and
 * "email" split your reports. Normalizing kills that class of bug.)
 */
function normalizeValue(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._%+-]/g, '');
}

/**
 * Build the tagged URL. Existing query params on the base are preserved;
 * existing utm_* params are overwritten by the new values.
 * @returns {string|null} null if the base URL is invalid
 */
function buildUrl(base, params) {
  const u = parseBaseUrl(base);
  if (!u) return null;
  for (const f of UTM_FIELDS) {
    const val = params[f];
    if (val != null && String(val).trim() !== '') {
      u.searchParams.set('utm_' + f, String(val));
    } else {
      u.searchParams.delete('utm_' + f);
    }
  }
  return u.toString();
}

/**
 * Enforce naming conventions.
 * @param {object} params { source, medium, ... } (already normalized or not)
 * @param {object} rules  { enforce: bool, allowed_sources: [], allowed_mediums: [] }
 * @returns {{ ok: true, params } | { ok: false, error }}
 */
function enforceNaming(params, rules = {}) {
  const out = {};
  for (const f of UTM_FIELDS) out[f] = normalizeValue(params[f]);
  if (!out.source) return { ok: false, error: 'utm_source is required' };
  if (!out.medium) return { ok: false, error: 'utm_medium is required' };
  if (!out.campaign) return { ok: false, error: 'utm_campaign is required' };

  if (rules.enforce) {
    const allowedS = (rules.allowed_sources || []).map(normalizeValue).filter(Boolean);
    const allowedM = (rules.allowed_mediums || []).map(normalizeValue).filter(Boolean);
    if (allowedS.length && !allowedS.includes(out.source)) {
      return { ok: false, error: `utm_source "${out.source}" is not in the allowed list (${allowedS.join(', ')})` };
    }
    if (allowedM.length && !allowedM.includes(out.medium)) {
      return { ok: false, error: `utm_medium "${out.medium}" is not in the allowed list (${allowedM.join(', ')})` };
    }
  }
  return { ok: true, params: out };
}

/**
 * Parse bulk CSV text. Header row: base_url,source,medium,campaign[,term][,content]
 * (header optional if columns are in that exact order). Returns
 * { rows: [{base_url, source, ...}], errors: [{line, message}] }.
 */
function parseBulkCsv(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return { rows: [], errors: [{ line: 0, message: 'empty input' }] };

  const splitLine = (l) => {
    // simple CSV: handles quoted fields with commas
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (inQ) {
        if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const defaultCols = ['base_url', 'source', 'medium', 'campaign', 'term', 'content'];
  let cols = defaultCols;
  let startIdx = 0;
  const first = splitLine(lines[0]).map((c) => c.toLowerCase().replace(/^utm_/, ''));
  if (first.includes('base_url') || (first.includes('source') && first.includes('medium'))) {
    cols = first.map((c) => (c === 'url' ? 'base_url' : c));
    startIdx = 1;
  }

  const rows = [];
  const errors = [];
  for (let i = startIdx; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    const row = {};
    cols.forEach((c, j) => { row[c] = vals[j] || ''; });
    if (!row.base_url) { errors.push({ line: i + 1, message: 'missing base_url' }); continue; }
    if (!parseBaseUrl(row.base_url)) { errors.push({ line: i + 1, message: 'invalid base_url: ' + row.base_url }); continue; }
    rows.push(row);
  }
  return { rows, errors };
}

/** Crude-but-useful device classification from a User-Agent. */
function deviceFromUA(ua = '') {
  const s = String(ua).toLowerCase();
  if (/bot|crawler|spider|preview|fetch|monitor/.test(s)) return 'bot';
  if (/ipad|tablet/.test(s)) return 'tablet';
  if (/mobi|iphone|android/.test(s)) return 'mobile';
  if (!s) return 'unknown';
  return 'desktop';
}

/** CSV field escaping for exports. */
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

module.exports = { UTM_FIELDS, parseBaseUrl, normalizeValue, buildUrl, enforceNaming, parseBulkCsv, deviceFromUA, csvEscape };
