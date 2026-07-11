import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Layers, Download } from 'lucide-react';
import { api } from '../api.js';
import LinksTable from './LinksTable.jsx';

const FIELDS = [
  { id: 'source', label: 'utm_source', required: true, hint: 'where: google, newsletter…' },
  { id: 'medium', label: 'utm_medium', required: true, hint: 'how: cpc, email, social…' },
  { id: 'campaign', label: 'utm_campaign', required: true, hint: 'what: spring_sale…' },
  { id: 'term', label: 'utm_term', required: false, hint: 'paid keyword (optional)' },
  { id: 'content', label: 'utm_content', required: false, hint: 'variant: ad_a, ad_b (optional)' }
];

export default function Builder({ settings }) {
  const [form, setForm] = useState({ base_url: '', source: '', medium: '', campaign: '', term: '', content: '' });
  const [campaignId, setCampaignId] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [links, setLinks] = useState([]);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [showBulk, setShowBulk] = useState(false);

  const refresh = useCallback(async () => {
    const [ls, cs] = await Promise.all([api.links(), api.campaigns()]);
    setLinks(ls);
    setCampaigns(cs);
    const sugg = {};
    await Promise.all(FIELDS.map(async (f) => { sugg[f.id] = await api.suggestions(f.id).catch(() => []); }));
    setSuggestions(sugg);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const previewUrl = (() => {
    try {
      const u = new URL(form.base_url);
      FIELDS.forEach((f) => {
        const v = form[f.id].trim().toLowerCase().replace(/\s+/g, '_');
        if (v) u.searchParams.set('utm_' + f.id, v);
      });
      return u.toString();
    } catch { return ''; }
  })();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const link = await api.createLink({ ...form, campaign_id: campaignId || null });
      setCreated(link);
      setForm((f) => ({ ...f, term: '', content: '' }));
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Build a tagged link</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
              <Layers className="w-3.5 h-3.5" /> Bulk from CSV
            </button>
            <a href="/api/export.csv"
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Destination URL *</span>
          <input
            value={form.base_url}
            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            placeholder="https://yoursite.com/landing-page"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </label>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FIELDS.map((f) => (
            <label key={f.id} className="block space-y-1">
              <span className="text-xs text-zinc-400">{f.label}{f.required && ' *'}</span>
              <input
                list={`sugg-${f.id}`}
                value={form[f.id]}
                onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                placeholder={f.hint}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
              <datalist id={`sugg-${f.id}`}>
                {(suggestions[f.id] || []).map((s) => <option key={s} value={s} />)}
              </datalist>
            </label>
          ))}
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Campaign group</span>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">— none —</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>

        {previewUrl && (
          <div className="text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-3 break-all text-emerald-400/80">
            {previewUrl}
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create link
          </button>
          <span className="text-[11px] text-zinc-600">
            Values auto-normalize (lowercase, spaces→underscores) so "Email" and "email" never split your reports.
          </span>
        </div>
      </form>

      <AnimatePresence>
        {created && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm"
          >
            <div className="font-medium text-emerald-400 mb-1">Link created ✓</div>
            <div className="text-xs text-zinc-300 break-all">Tagged: {created.tagged_url}</div>
            <div className="text-xs text-zinc-300 mt-0.5">
              Short (tracked): <span className="text-emerald-400">{(settings?.base_url || window.location.origin).replace(/\/$/, '')}/r/{created.short_code}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LinksTable links={links} settings={settings} onChanged={refresh} />

      {showBulk && <BulkModal campaigns={campaigns} onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); refresh(); }} />}
    </div>
  );
}

function BulkModal({ campaigns, onClose, onDone }) {
  const [csv, setCsv] = useState('base_url,source,medium,campaign,term,content\nhttps://yoursite.com/page,facebook,cpc,spring_sale,,ad_a\nhttps://yoursite.com/page,facebook,cpc,spring_sale,,ad_b');
  const [campaignId, setCampaignId] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.bulkLinks(csv, campaignId || null);
      setResult(r);
      if (r.created.length && !r.errors.length) setTimeout(onDone, 900);
    } catch (err) {
      setResult({ created: [], errors: [{ line: 0, message: err.message }] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
      >
        <h2 className="font-semibold">Bulk generate from CSV</h2>
        <p className="text-xs text-zinc-500">
          Columns: <code>base_url,source,medium,campaign,term,content</code> (header optional). Perfect for 10 ad-set variants at once.
        </p>
        <textarea
          value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} spellCheck={false}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-y"
        />
        <div className="flex items-center gap-3">
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            <option value="">No campaign group</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={run} disabled={busy}
            className="text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-medium px-4 py-2 rounded-lg transition-colors">
            {busy ? 'Generating…' : 'Generate links'}
          </button>
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
        </div>
        {result && (
          <div className="text-sm space-y-1">
            <div className="text-emerald-400">{result.created.length} link(s) created</div>
            {result.errors.map((e, i) => (
              <div key={i} className="text-red-400 text-xs">line {e.line}: {e.message}</div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
