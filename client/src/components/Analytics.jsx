import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MousePointerClick, Link2, FolderKanban, TrendingUp } from 'lucide-react';
import { api } from '../api.js';

const RANGES = [7, 30, 90];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.stats(days).then(setStats).catch(() => {});
  }, [days]);

  if (!stats) return <div className="text-zinc-500">Loading…</div>;

  const maxDay = Math.max(1, ...stats.byDay.map((d) => d.clicks));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {RANGES.map((r) => (
          <button key={r} onClick={() => setDays(r)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${days === r ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-900'}`}>
            {r}d
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={MousePointerClick} label={`Clicks (${days}d)`} value={stats.totals.clicks} />
        <Stat icon={TrendingUp} label="Clicks all-time" value={stats.totals.clicks_all_time} />
        <Stat icon={Link2} label="Links" value={stats.totals.links} />
        <Stat icon={FolderKanban} label="Campaigns" value={stats.totals.campaigns} />
      </div>

      {/* clicks over time */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">Clicks over time</h3>
        {stats.byDay.length === 0 ? (
          <p className="text-sm text-zinc-500">No clicks in this range yet — share a /r/ short link to start tracking.</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {stats.byDay.map((d) => (
              <motion.div
                key={d.day}
                initial={{ height: 0 }}
                animate={{ height: `${(d.clicks / maxDay) * 100}%` }}
                className="flex-1 bg-emerald-500/70 hover:bg-emerald-400 rounded-t min-w-[4px]"
                title={`${d.day}: ${d.clicks} clicks`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Breakdown title="By source" rows={stats.bySource} />
        <Breakdown title="By medium" rows={stats.byMedium} />
        <Breakdown title="By device" rows={stats.byDevice} />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3">Top links ({days}d)</h3>
        {stats.topLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.topLinks.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-sm">
                <span className="text-zinc-300 truncate flex-1">{l.base_url.replace(/^https?:\/\//, '')}</span>
                <span className="text-[11px] bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">{l.source}/{l.medium}</span>
                <span className="font-semibold tabular-nums">{l.clicks}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3">
      <div className="text-xs text-zinc-500 flex items-center gap-1.5"><Icon className="w-3 h-3" /> {label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Breakdown({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.clicks));
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="text-zinc-300">{r.key || '—'}</span>
                <span className="tabular-nums text-zinc-400">{r.clicks}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.clicks / max) * 100}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
