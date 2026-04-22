import React, { useState, useEffect, useMemo } from 'react'
import { Search, Zap, BookOpen, Bell, Trophy, FileText, StickyNote } from 'lucide-react'

export default function GlobalSearch({ onNavigate }) {
  const [q, setQ] = useState('')
  const [data, setData] = useState({ macros: [], notes: [], journal: [], reminders: [], chores: [] })
  const isElectron = !!window.api

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    if (!isElectron) return
    try {
      const [macros, notes, journal, reminders, chores] = await Promise.all([
        window.api.macros.list().catch(() => []),
        window.api.notes?.list?.().catch(() => []) || [],
        window.api.journal?.list?.().catch(() => []) || [],
        window.api.reminders?.list?.().catch(() => []) || [],
        window.api.chores?.list?.().catch(() => []) || [],
      ])
      setData({ macros, notes, journal, reminders, chores })
    } catch {}
  }

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    const match = (s) => !n || (s || '').toLowerCase().includes(n)
    return {
      macros: (data.macros || []).filter(m => match(m.name) || match(m.description)),
      notes: (data.notes || []).filter(x => match(x.title) || match(x.content)),
      journal: (data.journal || []).filter(x => match(x.title) || match(x.content)),
      reminders: (data.reminders || []).filter(x => match(x.text) || match(x.title)),
      chores: (data.chores || []).filter(x => match(x.title)),
    }
  }, [q, data])

  const Group = ({ title, icon: Icon, items, onClick, render }) => items.length > 0 && (
    <div className="card mb-16">
      <div className="card-title mb-12"><Icon size={14} className="card-title-icon" /> {title} <span className="text-sm text-muted">({items.length})</span></div>
      <div className="flex-col gap-6">
        {items.slice(0, 20).map(it => (
          <div key={it.id} className="nav-item" onClick={() => onClick(it)}>
            {render(it)}
          </div>
        ))}
        {items.length > 20 && <div className="text-xs text-muted">…and {items.length - 20} more</div>}
      </div>
    </div>
  )

  const totalCount = filtered.macros.length + filtered.notes.length + filtered.journal.length + filtered.reminders.length + filtered.chores.length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Global Search</div>
          <div className="page-subtitle">Search across macros, notes, journal, reminders, and chores</div>
        </div>
      </div>

      <div className="card mb-16">
        <div className="flex gap-8 items-center">
          <Search size={16} style={{ color: 'var(--text-2)' }} />
          <input
            autoFocus
            className="input flex-1"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Type to search everywhere…"
          />
        </div>
        {q && <div className="text-xs text-muted mt-8">{totalCount} result{totalCount === 1 ? '' : 's'}</div>}
      </div>

      <Group title="Macros" icon={Zap} items={filtered.macros}
        onClick={() => onNavigate && onNavigate('macros')}
        render={m => <><Zap size={13} className="nav-icon" /> {m.name}</>}
      />
      <Group title="Notes" icon={StickyNote} items={filtered.notes}
        onClick={() => onNavigate && onNavigate('notebook')}
        render={n => <><StickyNote size={13} className="nav-icon" /> {n.title || 'Untitled'}</>}
      />
      <Group title="Journal" icon={BookOpen} items={filtered.journal}
        onClick={() => onNavigate && onNavigate('journal')}
        render={j => <><BookOpen size={13} className="nav-icon" /> {j.title || j.date || 'Entry'}</>}
      />
      <Group title="Reminders" icon={Bell} items={filtered.reminders}
        onClick={() => onNavigate && onNavigate('reminders')}
        render={r => <><Bell size={13} className="nav-icon" /> {r.text || r.title}</>}
      />
      <Group title="Chores" icon={Trophy} items={filtered.chores}
        onClick={() => onNavigate && onNavigate('chores')}
        render={c => <><Trophy size={13} className="nav-icon" /> {c.title}</>}
      />

      {q && totalCount === 0 && (
        <div className="card text-center text-muted" style={{ padding: 32 }}>
          <FileText size={24} style={{ opacity: 0.4 }} />
          <div className="mt-8">No results for "{q}"</div>
        </div>
      )}
    </div>
  )
}
