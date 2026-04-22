import React, { useEffect, useState } from 'react'
import { Package, Rocket, CheckSquare, Square, Plus } from 'lucide-react'

/**
 * Renders a custom component built through the Visual Creator. Rather than
 * eval'ing user-authored JSX (which would be a massive security surface), we
 * switch on a known `template` name and pass `config` as data. This keeps the
 * attack surface to exactly the templates defined below.
 */
export default function CustomComponent({ comp }) {
  if (!comp) return null
  const { template, config = {}, name, icon } = comp
  switch (template) {
    case 'card':     return <CardTemplate title={name} config={config} />
    case 'list':     return <ListTemplate title={name} config={config} />
    case 'launcher': return <LauncherTemplate title={name} config={config} />
    case 'stats':    return <StatsTemplate title={name} config={config} />
    default:         return <UnknownTemplate name={name} template={template} />
  }
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

function CardTemplate({ title, config }) {
  const fields = Array.isArray(config.fields) ? config.fields : []
  return (
    <div className="animate-in">
      <PageHeader title={title} subtitle={config.description} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {fields.length === 0
          ? <div className="card"><div className="text-muted">No fields configured.</div></div>
          : fields.map((f, i) => (
            <div key={i} className="card">
              <div className="card-title mb-8">{f.label || `Field ${i + 1}`}</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{f.value || '—'}</div>
              {f.note && <div className="text-xs text-muted mt-4">{f.note}</div>}
            </div>
          ))
        }
      </div>
    </div>
  )
}

function ListTemplate({ title, config }) {
  const initial = Array.isArray(config.items)
    ? config.items.map((t, i) => ({ id: i, text: t, done: false }))
    : []
  const [items, setItems] = useState(initial)
  const [draft, setDraft] = useState('')
  const add = () => {
    if (!draft.trim()) return
    setItems([...items, { id: Date.now(), text: draft.trim(), done: false }])
    setDraft('')
  }
  return (
    <div className="animate-in">
      <PageHeader title={title} subtitle={config.description} />
      <div className="card">
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Add item…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={add}><Plus size={13} /> Add</button>
        </div>
        {items.length === 0
          ? <div className="text-muted text-sm">Empty list.</div>
          : items.map(it => (
            <div
              key={it.id}
              onClick={() => setItems(items.map(x => x.id === it.id ? { ...x, done: !x.done } : x))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            >
              {it.done ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-3)" />}
              <span style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--text-3)' : 'var(--text-0)' }}>{it.text}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function LauncherTemplate({ title, config }) {
  const apps = Array.isArray(config.apps) ? config.apps : []
  const launch = (path) => {
    if (!path) return
    if (window.api?.shell?.openPath) window.api.shell.openPath(path).catch(() => {})
  }
  return (
    <div className="animate-in">
      <PageHeader title={title} subtitle={config.description} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {apps.length === 0
          ? <div className="card"><div className="text-muted">No apps configured.</div></div>
          : apps.map((a, i) => (
            <button key={i} className="card component-card" onClick={() => launch(a.path)} style={{ textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Rocket size={18} color="var(--accent)" />
                <div style={{ fontWeight: 600 }}>{a.label || 'App'}</div>
              </div>
              {a.path && <div className="text-xs text-muted mt-4" style={{ wordBreak: 'break-all' }}>{a.path}</div>}
            </button>
          ))
        }
      </div>
    </div>
  )
}

function StatsTemplate({ title, config }) {
  const stats = Array.isArray(config.stats) ? config.stats : []
  return (
    <div className="animate-in">
      <PageHeader title={title} subtitle={config.description} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {stats.length === 0
          ? <div className="card"><div className="text-muted">No stats configured.</div></div>
          : stats.map((s, i) => (
            <div key={i} className="card">
              <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: s.color || 'var(--accent)' }}>{s.value || '0'}</div>
              {s.unit && <div className="text-xs text-muted">{s.unit}</div>}
            </div>
          ))
        }
      </div>
    </div>
  )
}

function UnknownTemplate({ name, template }) {
  return (
    <div className="animate-in">
      <PageHeader title={name} />
      <div className="card">
        <Package size={32} color="var(--yellow)" />
        <div className="card-title mt-8">Unknown template: {template}</div>
        <div className="text-muted text-sm">This component was created with a template not recognized by this version of Multitool.</div>
      </div>
    </div>
  )
}
