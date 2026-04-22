import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard, Zap, Keyboard, Type, MousePointer2,
  Clipboard, Timer, Monitor, Bot, Smartphone, Settings, HelpCircle,
  Rocket, BookOpen, AppWindow, CalendarClock, Volume2, Pipette,
  BookHeart, Bell, FolderOpen, Trophy, Globe, Image as ImageIcon, Search,
  LayoutGrid, Store, Plus, Package, Sparkles, ExternalLink,
  Download, Upload, Github, Trash2, Star
} from 'lucide-react'
import { useToast } from './Toast'

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

      {tab === 'marketplace' && <MarketplaceTab />}

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

// ─── Marketplace Tab ─────────────────────────────────────────────────────────
// Handles browsing installed .mbcomp packs plus importing from a local file
// picker or a GitHub raw URL. All IPC calls are best-effort: failures surface
// as toast errors rather than throwing, so the UI stays responsive.
const SAMPLE_PACKS = [
  {
    name: 'Weather Widget', version: '1.0.0', author: 'Multitool Team',
    description: 'At-a-glance local weather card with 3-day forecast.',
    category: 'Personal', preview: '☀️',
    component: { template: 'card', config: { source: 'weather' } },
    rating: 4.6,
  },
  {
    name: 'Quick Notes', version: '1.2.0', author: 'Community',
    description: 'Floating sticky-note strip pinned to the dashboard.',
    category: 'Tools', preview: '📝',
    component: { template: 'list', config: { items: [] } },
    rating: 4.2,
  },
  {
    name: 'Crypto Ticker', version: '0.9.0', author: 'Community',
    description: 'Live price tracker for a handful of cryptocurrencies.',
    category: 'Connect', preview: '📈',
    component: { template: 'stats', config: { symbols: ['BTC','ETH','SOL'] } },
    rating: 3.9,
  },
]

function MarketplaceTab() {
  const toast = useToast()
  const [installed, setInstalled] = useState([])
  const [githubUrl, setGithubUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const hasApi = !!window.api?.marketplace

  const refresh = async () => {
    if (!hasApi) return
    try { setInstalled(await window.api.marketplace.list() || []) } catch {}
  }
  useEffect(() => { refresh() }, [])

  const install = async (pack) => {
    if (!hasApi) return
    setBusy(true)
    const r = await window.api.marketplace.install(pack)
    setBusy(false)
    if (r?.success) { toast.show({ type: 'success', title: 'Installed', message: pack.name }); refresh() }
    else toast.show({ type: 'error', title: 'Install failed', message: r?.error || 'Unknown error' })
  }
  const uninstall = async (name) => {
    if (!hasApi) return
    await window.api.marketplace.uninstall(name)
    toast.show({ type: 'info', title: 'Uninstalled', message: name })
    refresh()
  }
  const importFile = async () => {
    if (!hasApi) return
    const r = await window.api.marketplace.importFromFile()
    if (r?.canceled) return
    if (r?.success) install(r.pack)
    else toast.show({ type: 'error', title: 'Import failed', message: r?.error || 'Unknown error' })
  }
  const importGithub = async () => {
    if (!hasApi || !githubUrl.trim()) return
    setBusy(true)
    const r = await window.api.marketplace.importFromGithub(githubUrl.trim())
    setBusy(false)
    if (r?.success) { install(r.pack); setGithubUrl('') }
    else toast.show({ type: 'error', title: 'GitHub import failed', message: r?.error || 'Unknown error' })
  }
  const exportPack = async (pack) => {
    if (!hasApi) return
    const r = await window.api.marketplace.export(pack)
    if (r?.success) toast.show({ type: 'success', title: 'Exported', message: r.filePath })
    else if (!r?.canceled) toast.show({ type: 'error', title: 'Export failed', message: r?.error || 'Unknown error' })
  }

  const installedNames = new Set(installed.map(p => p.name))

  return (
    <div>
      <div className="card mb-16" style={{ padding: 14 }}>
        <div className="card-title mb-8"><Store size={14} className="card-title-icon" /> Import Packs</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={importFile} disabled={!hasApi || busy}>
            <Upload size={13} /> Import .mbcomp file
          </button>
          <div style={{ flex: 1, minWidth: 260, display: 'flex', gap: 6 }}>
            <input
              className="input"
              placeholder="https://raw.githubusercontent.com/..."
              value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={importGithub}
              disabled={!hasApi || busy || !githubUrl.trim()}
            >
              <Github size={13} /> Install from URL
            </button>
          </div>
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 8 }}>
          Paste a raw GitHub URL or a github.com/.../blob/... URL pointing to a <code>.mbcomp</code> or <code>.json</code> file.
        </div>
      </div>

      <div className="nav-section-label" style={{ padding: '8px 0' }}>Installed ({installed.length})</div>
      {installed.length === 0
        ? <div className="card mb-16"><div className="text-muted">No packs installed yet. Try one of the samples below or import from a URL.</div></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
            {installed.map(p => (
              <div key={p.name} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 22 }}>{p.preview || '📦'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                    <div className="text-xs text-muted">v{p.version} · {p.author || 'unknown'}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 10 }}>{p.description}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => exportPack(p)}>
                    <Download size={12} /> Export
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => uninstall(p.name)} style={{ color: 'var(--red)' }}>
                    <Trash2 size={12} /> Uninstall
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <div className="nav-section-label" style={{ padding: '8px 0' }}>Sample Packs</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {SAMPLE_PACKS.map(p => {
          const isInstalled = installedNames.has(p.name)
          return (
            <div key={p.name} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 22 }}>{p.preview}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                  <div className="text-xs text-muted">v{p.version} · {p.author}</div>
                </div>
                <div className="text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--yellow)' }}>
                  <Star size={11} fill="currentColor" /> {p.rating}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 10 }}>{p.description}</div>
              <button
                className={`btn btn-sm ${isInstalled ? 'btn-ghost' : 'btn-primary'}`}
                onClick={() => isInstalled ? uninstall(p.name) : install(p)}
                disabled={!hasApi || busy}
              >
                {isInstalled ? <><Trash2 size={12} /> Uninstall</> : <><Download size={12} /> Install</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
