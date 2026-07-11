import React, { useState } from 'react';
import { Copy, Trash2, Check, MousePointerClick } from 'lucide-react';
import { api, timeAgo, shortLink } from '../api.js';

export default function LinksTable({ links, settings, onChanged, compact = false }) {
  const [copied, setCopied] = useState(null);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch { /* clipboard unavailable */ }
  };

  if (!links.length) {
    return <div className="text-center text-zinc-500 py-12 border border-dashed border-zinc-800 rounded-xl">No links yet — build your first tagged link above.</div>;
  }

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 bg-zinc-950/80">
            <th className="text-left font-medium px-4 py-2.5">Link</th>
            <th className="text-left font-medium px-3 py-2.5 hidden md:table-cell">source / medium / campaign</th>
            <th className="text-right font-medium px-3 py-2.5">Clicks</th>
            {!compact && <th className="text-right font-medium px-3 py-2.5 hidden sm:table-cell">Created</th>}
            <th className="w-28" />
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/40">
              <td className="px-4 py-2.5 max-w-[280px]">
                <div className="truncate text-zinc-200">{l.base_url.replace(/^https?:\/\//, '')}</div>
                <div className="text-[11px] text-emerald-400/80 truncate">/r/{l.short_code}</div>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <div className="flex gap-1 flex-wrap">
                  {[l.source, l.medium, l.campaign].map((v, i) => (
                    <span key={i} className="text-[11px] bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-300">{v}</span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-flex items-center gap-1 tabular-nums font-medium">
                  <MousePointerClick className="w-3 h-3 text-zinc-500" /> {l.click_count}
                </span>
              </td>
              {!compact && (
                <td className="px-3 py-2.5 text-right text-xs text-zinc-500 hidden sm:table-cell">{timeAgo(l.created_at)}</td>
              )}
              <td className="px-2 py-2.5">
                <div className="flex justify-end gap-1">
                  <button
                    title="Copy tagged URL"
                    onClick={() => copy(l.tagged_url, 'u' + l.id)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400"
                  >
                    {copied === 'u' + l.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    title="Copy tracked short link"
                    onClick={() => copy(shortLink(settings, l.short_code), 's' + l.id)}
                    className="px-1.5 rounded-lg hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400"
                  >
                    {copied === 's' + l.id ? <Check className="w-3.5 h-3.5 text-emerald-400 inline" /> : '/r/'}
                  </button>
                  <button
                    title="Delete"
                    onClick={async () => { if (confirm('Delete this link (and its click history)?')) { await api.deleteLink(l.id); onChanged(); } }}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-red-400/70"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
