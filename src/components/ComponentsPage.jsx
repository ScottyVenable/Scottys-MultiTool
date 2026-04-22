import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard, Zap, Keyboard, Type, MousePointer2,
  Clipboard, Timer, Monitor, Bot, Smartphone, Settings, HelpCircle,
  Rocket, BookOpen, AppWindow, CalendarClock, Volume2, Pipette,
  BookHeart, Bell, FolderOpen, Trophy, Globe, Image as ImageIcon, Search,
  LayoutGrid, Store, Plus, Package, Sparkles, ExternalLink,
  Download, Upload, Github, Trash2, Star, ChevronRight, Save, X
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

      {tab === 'create' && <CreateTab />}
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

// ── Create tab: a small visual wizard that builds a local component "pack" ──
// The wizard keeps things safe: no raw JSX eval. Instead we emit a structured
// pack that the Marketplace installer stores, and the Installed list renders
// via a small switch over known templates. This matches the .mbcomp shape so
// users can export the result like any other pack.
const CREATE_TEMPLATES = [
  { id: 'card',     label: 'Card',     description: 'A titled card with a description and an accent.' },
  { id: 'list',     label: 'List',     description: 'A vertical list of items with optional counts.' },
  { id: 'launcher', label: 'Launcher', description: 'A grid of clickable shortcut tiles.' },
  { id: 'stats',    label: 'Stats',    description: 'A row of big-number metrics.' },
  { id: 'form',     label: 'Form',     description: 'A simple form with labelled fields.' },
]

function CreateTab() {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [template, setTemplate] = useState('card')
  const [meta, setMeta] = useState({ name: '', version: '1.0.0', author: '', description: '', category: 'Custom' })
  const [fields, setFields] = useState([{ key: 'title', value: 'My Component' }])
  const hasApi = !!window.api

  const addField = () => setFields(f => [...f, { key: `field_${f.length}`, value: '' }])
  const setField = (i, patch) => setFields(f => f.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  const removeField = (i) => setFields(f => f.filter((_, idx) => idx !== i))

  const pack = {
    name: meta.name.trim(),
    version: meta.version.trim() || '1.0.0',
    author: meta.author.trim() || 'You',
    description: meta.description.trim() || 'Custom component',
    category: meta.category || 'Custom',
    component: {
      template,
      // Config is a plain object — fields become key→value entries.
      config: Object.fromEntries(fields.filter(f => f.key).map(f => [f.key, f.value])),
    },
    // A rating of 0 marks this as user-authored vs. curated.
    rating: 0,
  }

  const save = async () => {
    if (!pack.name) { toast.show({ type: 'error', title: 'Name required' }); return }
    if (!hasApi) return
    const r = await window.api.marketplace.install(pack)
    if (r?.success) { toast.show({ type: 'success', title: 'Component saved', message: pack.name }); setStep(4) }
    else toast.show({ type: 'error', title: 'Save failed', message: r?.error || 'Unknown error' })
  }

  const exportPack = async () => {
    if (!pack.name) { toast.show({ type: 'error', title: 'Name required' }); return }
    if (!hasApi) return
    const r = await window.api.marketplace.export(pack)
    if (r?.success) toast.show({ type: 'success', title: 'Exported', message: r.path })
    else if (r?.error) toast.show({ type: 'error', title: 'Export failed', message: r.error })
  }

  const steps = ['Template', 'Metadata', 'Fields', 'Preview', 'Done']

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Step indicator */}
      <div className="flex items-center gap-8 mb-16">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: i === step ? 'var(--accent)' : 'var(--bg-3)',
              color: i === step ? 'white' : 'var(--text-2)',
              border: i < step ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
            }}>{i + 1}. {s}</div>
            {i < steps.length - 1 && <ChevronRight size={12} style={{ color: 'var(--text-3)' }} />}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <div>
          <div className="text-sm mb-12" style={{ fontWeight: 600 }}>Choose a template</div>
          <div className="grid-2 gap-8">
            {CREATE_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setTemplate(t.id)}
                className={`card component-card`}
                style={{
                  padding: 12, textAlign: 'left',
                  borderColor: template === t.id ? 'var(--accent)' : 'var(--border)',
                  background: template === t.id ? 'var(--bg-3)' : 'var(--bg-2)',
                  cursor: 'pointer',
                }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
                <div className="text-xs text-muted">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex-col gap-10">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="input" value={meta.name} onChange={e => setMeta({ ...meta, name: e.target.value })} placeholder="e.g. Morning Routine" />
          </div>
          <div className="flex gap-8">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Version</label>
              <input className="input mono" value={meta.version} onChange={e => setMeta({ ...meta, version: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Author</label>
              <input className="input" value={meta.author} onChange={e => setMeta({ ...meta, author: e.target.value })} placeholder="You" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <input className="input" value={meta.category} onChange={e => setMeta({ ...meta, category: e.target.value })} placeholder="Custom" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input" rows={3} value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} placeholder="What does this component do?" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-12">
            <div className="text-sm" style={{ fontWeight: 600 }}>Fields (for the <span style={{ color: 'var(--accent)' }}>{template}</span> template)</div>
            <button className="btn btn-secondary btn-sm" onClick={addField}><Plus size={12} /> Add field</button>
          </div>
          <div className="flex-col gap-6">
            {fields.map((f, i) => (
              <div key={i} className="flex gap-6" style={{ alignItems: 'center' }}>
                <input className="input mono" value={f.key} onChange={e => setField(i, { key: e.target.value })} placeholder="key" style={{ maxWidth: 160 }} />
                <input className="input" value={f.value} onChange={e => setField(i, { value: e.target.value })} placeholder="value" />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeField(i)}><X size={12} /></button>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted mt-8">Fields become the config passed to the template renderer. For `list`, use keys like <span className="mono">items</span> separated by commas.</div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="text-sm mb-8" style={{ fontWeight: 600 }}>Preview</div>
          <CustomComponentPreview template={template} config={pack.component.config} />
          <div className="text-xs text-muted mt-12">Everything below will be saved to a local <span className="mono">.mbcomp</span> pack.</div>
          <pre className="mono" style={{
            marginTop: 8, padding: 10, background: 'var(--bg-3)', borderRadius: 'var(--r)',
            fontSize: 11, maxHeight: 200, overflow: 'auto',
          }}>{JSON.stringify(pack, null, 2)}</pre>
        </div>
      )}

      {step === 4 && (
        <div className="text-center" style={{ padding: 20 }}>
          <Sparkles size={28} style={{ color: 'var(--accent)', margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Saved</div>
          <div className="text-sm text-muted mb-12">Your component is installed and will appear under Installed → Marketplace.</div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setStep(0); setMeta({ name: '', version: '1.0.0', author: '', description: '', category: 'Custom' }); setFields([{ key: 'title', value: 'My Component' }]) }}>Create another</button>
        </div>
      )}

      {step < 4 && (
        <div className="flex justify-between mt-16">
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>← Back</button>
          <div className="flex gap-6">
            {step === 3 && <button className="btn btn-secondary btn-sm" onClick={exportPack}><Upload size={12} /> Export .mbcomp</button>}
            {step < 3 && <button className="btn btn-primary btn-sm" onClick={() => setStep(s => s + 1)}>Next →</button>}
            {step === 3 && <button className="btn btn-primary btn-sm" onClick={save}><Save size={12} /> Save & Install</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// Tiny sandboxed renderer for preview and Installed display. Only interprets
// the known template ids — nothing is evaluated from strings.
function CustomComponentPreview({ template, config }) {
  const c = config || {}
  if (template === 'card') {
    return (
      <div className="card" style={{ padding: 14, borderLeft: `3px solid var(--accent)` }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title || 'Untitled'}</div>
        <div className="text-sm text-muted">{c.description || c.body || ''}</div>
      </div>
    )
  }
  if (template === 'list') {
    const items = String(c.items || '').split(',').map(s => s.trim()).filter(Boolean)
    return (
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.title || 'List'}</div>
        {items.length === 0 && <div className="text-sm text-muted">(no items)</div>}
        {items.map((it, i) => (
          <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>{it}</div>
        ))}
      </div>
    )
  }
  if (template === 'launcher') {
    const items = String(c.items || '').split(',').map(s => s.trim()).filter(Boolean)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} className="card" style={{ padding: 10, textAlign: 'center', fontSize: 12, cursor: 'pointer' }}>{it}</div>
        ))}
      </div>
    )
  }
  if (template === 'stats') {
    const pairs = Object.entries(c).filter(([k]) => k !== 'title')
    return (
      <div className="card" style={{ padding: 14 }}>
        {c.title && <div style={{ fontWeight: 600, marginBottom: 10 }}>{c.title}</div>}
        <div style={{ display: 'flex', gap: 16 }}>
          {pairs.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{v}</div>
              <div className="text-xs text-muted">{k}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (template === 'form') {
    const pairs = Object.entries(c).filter(([k]) => k !== 'title')
    return (
      <div className="card" style={{ padding: 14 }}>
        {c.title && <div style={{ fontWeight: 600, marginBottom: 10 }}>{c.title}</div>}
        {pairs.map(([k, v]) => (
          <div key={k} className="form-group">
            <label className="form-label">{k}</label>
            <input className="input" defaultValue={v} />
          </div>
        ))}
      </div>
    )
  }
  return <div className="text-sm text-muted">Unknown template: {template}</div>
}

export { CustomComponentPreview }
