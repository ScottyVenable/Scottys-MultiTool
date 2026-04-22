import React, { useState } from 'react'
import {
  LayoutDashboard, Zap, Keyboard, Type, MousePointer2,
  Clipboard, Timer, Monitor, Bot, Smartphone, Settings, HelpCircle,
  Rocket, BookOpen, AppWindow, CalendarClock, Volume2, Pipette,
  BookHeart, Bell, FolderOpen, Trophy, Globe, Image as ImageIcon, Search,
  LayoutGrid, Store, Plus, Package, Sparkles, ExternalLink
} from 'lucide-react'

// Mirror of the NAV registry in App.jsx — used to enumerate every component
// in the app as a browsable catalog. Keep in sync when adding new tools.
const CATALOG = [
  { id: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard, section: 'Main',       desc: 'At-a-glance overview of your macros, reminders, and stats.' },
  { id: 'search',        label: 'Global Search',   icon: Search,          section: 'Main',       desc: 'Search across notes, journal, reminders, and more.' },
  { id: 'macros',        label: 'Macros',          icon: Zap,             section: 'Automation', desc: 'Create sequences of keys, clicks, and delays. Background-window targeting supported.' },
  { id: 'hotkeys',       label: 'Hotkeys',         icon: Keyboard,        section: 'Automation', desc: 'Bind global shortcuts to trigger macros from any app.' },
  { id: 'text-expander', label: 'Text Expander',   icon: Type,            section: 'Automation', desc: 'Type abbreviations that auto-expand to longer snippets.' },
  { id: 'auto-clicker',  label: 'Auto Clicker',    icon: MousePointer2,   section: 'Automation', desc: 'Click at a steady interval; start/stop with a hotkey.' },
  { id: 'scheduler',     label: 'Scheduler',       icon: CalendarClock,   section: 'Automation', desc: 'Run macros at intervals, daily, or once at a specific time.' },
  { id: 'app-launcher',  label: 'App Launcher',    icon: Rocket,          section: 'Tools',      desc: 'Quick-launch your pinned applications.' },
  { id: 'clipboard',     label: 'Clipboard',       icon: Clipboard,       section: 'Tools',      desc: 'History of everything you\u2019ve copied. Click to re-paste.' },
  { id: 'notebook',      label: 'Notebook',        icon: BookOpen,        section: 'Tools',      desc: 'Markdown notes with export to PDF and other formats.' },
  { id: 'window-tools',  label: 'Window Snapper',  icon: AppWindow,       section: 'Tools',      desc: 'Snap windows to halves, quarters, or thirds of the screen.' },
  { id: 'timer',         label: 'Focus Timer',     icon: Timer,           section: 'Tools',      desc: 'Pomodoro-style timer with break intervals.' },
  { id: 'volume',        label: 'Volume Control',  icon: Volume2,         section: 'Tools',      desc: 'Adjust system volume with live slider response.' },
  { id: 'color-picker',  label: 'Color Picker',    icon: Pipette,         section: 'Tools',      desc: 'Sample any pixel color on screen.' },
  { id: 'system',        label: 'System Monitor',  icon: Monitor,         section: 'Tools',      desc: 'CPU, memory, disk, and running process info.' },
  { id: 'file-manager',  label: 'File Manager',    icon: FolderOpen,      section: 'Tools',      desc: 'Browse, open, copy, move and search local files.' },
  { id: 'journal',       label: 'Journal',         icon: BookHeart,       section: 'Personal',   desc: 'PIN-protected private journal with full-text search.' },
  { id: 'reminders',     label: 'Reminders',       icon: Bell,            section: 'Personal',   desc: 'Schedule native notifications for anything.' },
  { id: 'chores',        label: 'Chore Planner',   icon: Trophy,          section: 'Personal',   desc: 'Track household chores; earn achievements.' },
  { id: 'media',         label: 'Media Library',   icon: ImageIcon,       section: 'Personal',   desc: 'Import and catalog photos / videos / audio.' },
  { id: 'browser',       label: 'Browser',         icon: Globe,           section: 'Connect',    desc: 'Embedded web browser with bookmarks.' },
  { id: 'ai',            label: 'AI Workstation',  icon: Bot,             section: 'Connect',    desc: 'Chat, Computer-Use agent, and CLI with OpenAI-compatible endpoints.' },
  { id: 'mobile',        label: 'Mobile Remote',   icon: Smartphone,      section: 'Connect',    desc: 'Trigger macros from your phone over Wi-Fi.' },
  { id: 'settings',      label: 'Settings',        icon: Settings,        section: 'Config',     desc: 'App preferences, accent color, account management, backup.' },
  { id: 'help',          label: 'Help',            icon: HelpCircle,      section: 'Config',     desc: 'In-app documentation for every feature.' },
]

export default function ComponentsPage({ onNavigate }) {
  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState('installed')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? CATALOG.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.section.toLowerCase().includes(q))
    : CATALOG

  const bySection = filtered.reduce((acc, c) => {
    (acc[c.section] = acc[c.section] || []).push(c)
    return acc
  }, {})

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title"><LayoutGrid size={18} style={{ verticalAlign: -3, marginRight: 6 }} /> Components</div>
          <div className="page-subtitle">Every tool in the app, in one place. Browse, launch, or create your own.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button
          className={`btn ${tab === 'installed' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('installed')}
        >
          <Package size={13} /> Installed <span className="nav-badge" style={{ marginLeft: 6 }}>{CATALOG.length}</span>
        </button>
        <button
          className={`btn ${tab === 'marketplace' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('marketplace')}
        >
          <Store size={13} /> Marketplace
        </button>
        <button
          className={`btn ${tab === 'create' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('create')}
        >
          <Plus size={13} /> Create
        </button>
      </div>

      {tab === 'installed' && (
        <>
          <div className="card mb-16" style={{ padding: '10px 12px' }}>
            <input
              className="input"
              placeholder="Search components…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {Object.keys(bySection).length === 0 && (
            <div className="card"><div className="text-muted">No components match that search.</div></div>
          )}

          {Object.entries(bySection).map(([section, items]) => (
            <div key={section} className="mb-16">
              <div className="nav-section-label" style={{ padding: '8px 0' }}>{section}</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12,
              }}>
                {items.map(c => {
                  const Icon = c.icon
                  return (
                    <button
                      key={c.id}
                      className="card component-card"
                      onClick={() => onNavigate?.(c.id)}
                      style={{ textAlign: 'left', cursor: 'pointer', padding: 14 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 'var(--r)',
                          background: 'var(--accent-dim)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-0)' }}>{c.label}</div>
                          <div className="text-xs text-muted">{c.section}</div>
                        </div>
                        <ExternalLink size={12} style={{ color: 'var(--text-3)' }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{c.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'marketplace' && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <Store size={36} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <div className="card-title" style={{ justifyContent: 'center' }}>Component Marketplace</div>
          <div className="text-muted mt-8" style={{ maxWidth: 440, margin: '8px auto 0' }}>
            Discover and install community-built plugins, themes, and workflow extensions.
          </div>
          <div className="mt-16" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '6px 12px', background: 'var(--yellow-dim)', color: 'var(--yellow)', borderRadius: 999, fontSize: 12 }}>
            <Sparkles size={12} /> Coming soon
          </div>
        </div>
      )}

      {tab === 'create' && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <Plus size={36} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <div className="card-title" style={{ justifyContent: 'center' }}>Create a Component</div>
          <div className="text-muted mt-8" style={{ maxWidth: 440, margin: '8px auto 0' }}>
            Build your own custom tools using a visual editor or JSX. Export to share with the community.
          </div>
          <div className="mt-16" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '6px 12px', background: 'var(--yellow-dim)', color: 'var(--yellow)', borderRadius: 999, fontSize: 12 }}>
            <Sparkles size={12} /> Coming soon
          </div>
        </div>
      )}
    </div>
  )
}
