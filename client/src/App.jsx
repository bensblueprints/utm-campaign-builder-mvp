import React, { useEffect, useState, useCallback } from 'react';
import { Target, Settings as SettingsIcon, LogOut, ChartColumn, Link2, FolderKanban } from 'lucide-react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Builder from './components/Builder.jsx';
import Campaigns from './components/Campaigns.jsx';
import Analytics from './components/Analytics.jsx';
import Settings from './components/Settings.jsx';

const TABS = [
  { id: 'builder', label: 'Builder', icon: Link2 },
  { id: 'campaigns', label: 'Campaigns', icon: FolderKanban },
  { id: 'analytics', label: 'Analytics', icon: ChartColumn }
];

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [tab, setTab] = useState('builder');
  const [settings, setSettings] = useState(null);

  const loadSettings = useCallback(() => {
    api.settings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed) loadSettings();
  }, [authed, loadSettings]);

  if (authed === null) {
    return <div className="min-h-screen grid place-items-center text-zinc-500">Loading…</div>;
  }
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => setTab('builder')} className="flex items-center gap-2 font-semibold tracking-tight">
            <Target className="w-5 h-5 text-emerald-400" />
            UTMcraft
          </button>
          <span className="text-xs text-zinc-500 hidden sm:block">tagged links + click tracking, pay once</span>
          <nav className="flex items-center gap-1 ml-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  tab === t.id ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-900'}`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <button
            onClick={() => setTab('settings')}
            className={`p-2 rounded-lg hover:bg-zinc-800 transition-colors ${tab === 'settings' ? 'text-emerald-400' : 'text-zinc-400'}`}
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
          <button
            onClick={async () => { await api.logout(); setAuthed(false); }}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'builder' && <Builder settings={settings} />}
        {tab === 'campaigns' && <Campaigns settings={settings} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'settings' && <Settings onSaved={loadSettings} />}
      </main>
    </div>
  );
}
