import React, { useState, useEffect, useRef } from 'react'
import { StickyNote, Plus, Trash2, Save, Search, Tag, X } from 'lucide-react'

const COLORS = [
  { id: 'default', bg: 'var(--bg-2)', border: 'var(--border)', label: 'Default' },
  { id: 'yellow',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  label: 'Yellow' },
  { id: 'blue',    bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.3)',  label: 'Blue' },
  { id: 'green',   bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.3)',   label: 'Green' },
  { id: 'red',     bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.3)',   label: 'Red' },
  { id: 'purple',  bg: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.3)',  label: 'Purple' },
]

const COLOR_MAP = Object.fromEntries(COLORS.map(c => [c.id, c]))

function NoteCard({ note, onEdit, onDelete }) {
  const color = COLOR_MAP[note.color] || COLOR_MAP.default
  const preview = note.content?.slice(0, 200) || ''
  const lines = preview.split('\n').slice(0, 6).join('\n')

  return (
    <div
      className="card"
      style={{
        background: color.bg,
        borderColor: color.border,
        cursor: 'pointer',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        position: 'relative',
      }}
      onClick={() => onEdit(note)}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div className="flex items-start justify-between gap-8 mb-8">
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-0)', flex: 1 }}>
          {note.title || 'Untitled'}
        </div>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          style={{ flexShrink: 0, opacity: 0.5 }}
          onClick={e => { e.stopPropagation(); onDelete(note.id) }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {note.tag && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600,
          background: 'var(--accent-dim)', color: 'var(--accent-h)', borderRadius: 99, padding: '2px 8px', marginBottom: 8 }}>
          <Tag size={9} />{note.tag}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {lines}{preview.length > lines.length ? '\n...' : ''}
      </div>

      <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--text-3)' }}>
        {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}

function NoteEditor({ note, onSave, onClose }) {
  const [title, setTitle]     = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tag, setTag]         = useState(note?.tag || '')
  const [color, setColor]     = useState(note?.color || 'default')
  const textRef = useRef(null)

  useEffect(() => { textRef.current?.focus() }, [])

  const save = () => {
    if (!title.trim() && !content.trim()) return onClose()
    onSave({
      id: note?.id || `note-${Date.now()}`,
      title: title.trim() || content.split('\n')[0]?.slice(0, 40) || 'Untitled',
      content: content.trim(),
      tag: tag.trim(),
      color,
      createdAt: note?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  const colorObj = COLOR_MAP[color]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (save(), onClose())}>
      <div className="modal" style={{ width: 580, maxHeight: '80vh', background: colorObj?.bg || 'var(--bg-2)', borderColor: colorObj?.border || 'var(--border)' }}>
        <div className="modal-header">
          <input
            className="input"
            style={{ flex: 1, fontWeight: 600, fontSize: 14, background: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Note title..."
          />
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { save(); onClose() }}><X size={14} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            ref={textRef}
            className="input"
            style={{ minHeight: 280, resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.7, fontSize: 13, background: 'transparent', userSelect: 'text' }}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start typing your note..."
          />
          <div className="flex items-center gap-12">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Tag</label>
              <input className="input" value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. work, ideas..." />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="flex gap-6">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    title={c.label}
                    onClick={() => setColor(c.id)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: c.bg === 'var(--bg-2)' ? 'var(--bg-3)' : c.bg,
                      border: `2px solid ${color === c.id ? 'var(--accent)' : c.border}`,
                      cursor: 'pointer',
                      outline: color === c.id ? '2px solid var(--accent)' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Discard</button>
          <button className="btn btn-primary btn-sm" onClick={() => { save(); onClose() }}>
            <Save size={13} /> Save Note
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuickNotes() {
  const [notes, setNotes]       = useState([])
  const [search, setSearch]     = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [editing, setEditing]   = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const isElectron = !!window.api

  useEffect(() => { load() }, [])

  const load = async () => {
    if (!isElectron) { setNotes(DEMOS); return }
    const data = await window.api.notes.list()
    setNotes(data || [])
  }

  const save = async (note) => {
    if (!isElectron) {
      setNotes(ns => {
        const idx = ns.findIndex(n => n.id === note.id)
        return idx >= 0 ? ns.map(n => n.id === note.id ? note : n) : [...ns, note]
      })
      return
    }
    await window.api.notes.save(note)
    await load()
  }

  const remove = async (id) => {
    if (!isElectron) { setNotes(ns => ns.filter(n => n.id !== id)); return }
    await window.api.notes.delete(id)
    await load()
  }

  const openNew = () => { setEditing(null); setShowEditor(true) }
  const openEdit = (note) => { setEditing(note); setShowEditor(true) }

  const allTags = [...new Set(notes.map(n => n.tag).filter(Boolean))]

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase())
    const matchTag = !tagFilter || n.tag === tagFilter
    return matchSearch && matchTag
  }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Quick Notes</div>
          <div className="page-subtitle">Persistent notes with color coding and tags</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={14} /> New Note
        </button>
      </div>

      <div className="flex gap-8 mb-16">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-6">
            <button
              className={`btn btn-sm ${!tagFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTagFilter('')}
            >All</button>
            {allTags.map(t => (
              <button
                key={t}
                className={`btn btn-sm ${tagFilter === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTagFilter(t === tagFilter ? '' : t)}
              >
                <Tag size={10} /> {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <StickyNote size={36} className="empty-state-icon" />
            <div className="empty-state-title">{search || tagFilter ? 'No matching notes' : 'No notes yet'}</div>
            <div className="empty-state-sub">{!search && !tagFilter && 'Click New Note to capture your first thought'}</div>
            {!search && !tagFilter && (
              <button className="btn btn-primary btn-sm mt-8" onClick={openNew}>New Note</button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-auto gap-16">
          {filtered.map(note => (
            <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={remove} />
          ))}
        </div>
      )}

      {showEditor && (
        <NoteEditor
          note={editing}
          onSave={save}
          onClose={() => { setShowEditor(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

const DEMOS = [
  { id: 'd1', title: 'Macro Ideas', content: 'Ideas for automation:\n- Auto-save every 5 minutes\n- Morning startup sequence\n- Deploy shortcut', tag: 'ideas', color: 'blue', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'd2', title: 'Meeting Notes', content: 'Discussed macro performance improvements.\nAction items:\n1. Test loop delays\n2. Check window targeting', tag: 'work', color: 'yellow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]
