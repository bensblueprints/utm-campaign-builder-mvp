import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, FolderKanban } from 'lucide-react';
import { api } from '../api.js';
import LinksTable from './LinksTable.jsx';

export default function Campaigns({ settings }) {
  const [campaigns, setCampaigns] = useState([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(null); // campaign id
  const [links, setLinks] = useState([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setCampaigns(await api.campaigns());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (open) api.links(open).then(setLinks);
    else setLinks([]);
  }, [open]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.createCampaign(name.trim());
      setName('');
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex gap-2 items-start">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="New campaign group (e.g. Spring Sale 2026)"
          className="flex-1 max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-3 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!campaigns.length && (
        <div className="text-center text-zinc-500 py-16 border border-dashed border-zinc-800 rounded-xl">
          <FolderKanban className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
          Group links into campaigns to compare channels per launch.
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div
              className="px-5 py-4 flex items-center gap-4 cursor-pointer"
              onClick={() => setOpen(open === c.id ? null : c.id)}
            >
              <span className="font-medium flex-1">{c.name}</span>
              <span className="text-xs text-zinc-500">{c.link_count} links</span>
              <span className="text-sm font-semibold tabular-nums">{c.click_count} clicks</span>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Delete campaign "${c.name}"? Links are kept, just ungrouped.`)) {
                    await api.deleteCampaign(c.id);
                    refresh();
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-red-400/70"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {open === c.id && (
              <div className="px-5 pb-5">
                <LinksTable links={links} settings={settings} onChanged={() => api.links(c.id).then(setLinks)} compact />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
