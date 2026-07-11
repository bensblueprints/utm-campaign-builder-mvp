import React, { useEffect, useState } from 'react';
import { Save, ShieldCheck, Globe } from 'lucide-react';
import { api } from '../api.js';

export default function Settings({ onSaved }) {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.settings().then(setS).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-400">{error}</div>;
  if (!s) return <div className="text-zinc-500">Loading…</div>;

  const enforce = s.enforce_naming === '1' || s.enforce_naming === 'true';

  const save = async (e) => {
    e.preventDefault();
    await api.saveSettings(s);
    setSaved(true);
    onSaved && onSaved();
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="font-medium flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400" /> Short links</h2>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Public base URL of this install</span>
          <input
            value={s.base_url || ''}
            onChange={(e) => setS({ ...s, base_url: e.target.value })}
            placeholder="https://links.yourdomain.com"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[11px] text-zinc-600">Used when copying tracked short links (/r/code). Clicks only register when the short link goes through this server.</span>
        </label>
      </section>

      <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Naming convention enforcer</h2>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={enforce}
            onChange={(e) => setS({ ...s, enforce_naming: e.target.checked ? '1' : '0' })}
            className="accent-emerald-500 w-4 h-4"
          />
          Lock sources & mediums to the allowed lists below
        </label>
        <p className="text-xs text-zinc-500">
          Stops the team creating "Email", "email", and "e-mail" as three different sources. All values are also auto-normalized (lowercase, underscores) regardless of this setting.
        </p>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Allowed sources (comma-separated)</span>
          <textarea
            value={s.allowed_sources || ''} rows={2}
            onChange={(e) => setS({ ...s, allowed_sources: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-y"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Allowed mediums (comma-separated)</span>
          <textarea
            value={s.allowed_mediums || ''} rows={2}
            onChange={(e) => setS({ ...s, allowed_mediums: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-y"
          />
        </label>
      </section>

      <button className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-4 py-2 rounded-lg transition-colors">
        <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save settings'}
      </button>
    </form>
  );
}
