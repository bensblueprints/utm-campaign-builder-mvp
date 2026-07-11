async function req(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
    body: options.body != null ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  me: () => req('/api/me'),
  login: (password) => req('/api/login', { method: 'POST', body: { password } }),
  logout: () => req('/api/logout', { method: 'POST' }),

  campaigns: () => req('/api/campaigns'),
  createCampaign: (name) => req('/api/campaigns', { method: 'POST', body: { name } }),
  deleteCampaign: (id) => req(`/api/campaigns/${id}`, { method: 'DELETE' }),

  links: (campaignId) => req(`/api/links${campaignId ? `?campaign_id=${campaignId}` : ''}`),
  createLink: (body) => req('/api/links', { method: 'POST', body }),
  deleteLink: (id) => req(`/api/links/${id}`, { method: 'DELETE' }),
  bulkLinks: (csv, campaign_id) => req('/api/links/bulk', { method: 'POST', body: { csv, campaign_id } }),
  linkClicks: (id) => req(`/api/links/${id}/clicks`),
  suggestions: (field) => req(`/api/suggestions?field=${field}`),

  stats: (days = 30) => req(`/api/stats?days=${days}`),
  settings: () => req('/api/settings'),
  saveSettings: (body) => req('/api/settings', { method: 'PUT', body })
};

export function timeAgo(ms) {
  if (!ms) return 'never';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function shortLink(settings, code) {
  const base = (settings?.base_url || window.location.origin).replace(/\/$/, '');
  return `${base}/r/${code}`;
}
