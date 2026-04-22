import React, { useState, useEffect, useRef, useCallback } from 'react'
import { BookOpen, Plus, Trash2, Download, Eye, Edit3, Search, Tag, X } from 'lucide-react'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899']

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function MarkdownPreview({ content }) {
  const html = content
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
  return <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} style={{ padding: 16, minHeight: 200, lineHeight: 1.7, fontSize: 14 }} />
}

export default function Notebook() {
  const [notes, setNotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [preview, setPreview] = useState(false)
  const [search, setSearch] = useState('')
  const debounceRef = useRef(null)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.notes.list().then(list => {
      setNotes(list || [])
      if (list?.length) selectNote(list[0])
    })
  }, [])

  const selectNote = (note) => {
    setSelected(note.id)
    setTitle(note.title || '')
    setContent(note.content || '')
    setColor(note.color || COLORS[0])
    setTags(note.tags || [])
  }

  const save = useCallback(async (overrides = {}) => {
    if (!isElectron || !selected) return
    const note = { id: selected, title: overrides.title ?? title, content: overrides.content ?? content, color: overrides.color ?? color, tags: overrides.tags ?? tags, updatedAt: new Date().toISOString() }
    await window.api.notes.save(note)
    setNotes(prev => prev.map(n => n.id === selected ? { ...n, ...note } : n))
  }, [selected, title, content, color, tags])

  const handleContentChange = (val) => {
    setContent(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save({ content: val }), 500)
  }
  const handleTitleChange = (val) => {
    setTitle(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save({ title: val }), 500)
  }

  const newNote = async () => {
    if (!isElectron) return
    const note = { id: uid(), title: 'New Note', content: '', color: COLORS[0], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await window.api.notes.save(note)
    setNotes(prev => [note, ...prev])
    selectNote(note)
  }

  const deleteNote = async (id, e) => {
    e.stopPropagation()
    if (!isElectron) return
    if (!confirm('Delete this note?')) return
    await window.api.notes.delete(id)
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (selected === id) {
      if (remaining.length) selectNote(remaining[0])
      else { setSelected(null); setTitle(''); setContent(''); setTags([]) }
    }
  }

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTags = [...new Set([...tags, tagInput.trim()])]
      setTags(newTags)
      setTagInput('')
      save({ tags: newTags })
    }
  }
  const removeTag = (tag) => {
    const newTags = tags.filter(t => t !== tag)
    setTags(newTags)
    save({ tags: newTags })
  }

  const exportTxt = async () => {
    if (!isElectron) return
    await window.api.notes.exportFile({ content, title, ext: 'txt' })
  }
  const exportMd = async () => {
    if (!isElectron) return
    await window.api.notes.exportFile({ content, title, ext: 'md' })
  }

  const filtered = notes.filter(n =>
    (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Notebook</div>
          <div className="page-subtitle">Rich notes with markdown and export</div>
        </div>
        <button className="btn btn-primary" onClick={newNote}><Plus size={14} /> New Note</button>
      </div>

      <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 220, minWidth: 180, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-1)' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input className="input" style={{ paddingLeft: 28, height: 30, fontSize: 12 }} placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && <div className="text-muted text-sm" style={{ padding: 16 }}>No notes yet</div>}
            {filtered.map(n => (
              <div key={n.id} onClick={() => selectNote(n)}
                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected === n.id ? 'var(--bg-3)' : 'transparent', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color || COLORS[0], marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title || 'Untitled'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(n.content || '').slice(0, 40)}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={(e) => deleteNote(n.id, e)} style={{ padding: 2, opacity: 0.5 }}><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
              <input className="input" value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Note title…" style={{ flex: 1, fontWeight: 600, fontSize: 15, border: 'none', background: 'transparent', padding: '2px 4px' }} />
              {COLORS.map(c => (
                <button key={c} onClick={() => { setColor(c); save({ color: c }) }}
                  style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: color === c ? '2px solid var(--text-0)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(v => !v)} title="Toggle Preview">
                {preview ? <Edit3 size={14} /> : <Eye size={14} />}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={exportMd} title="Export .md"><Download size={14} />md</button>
              <button className="btn btn-ghost btn-sm" onClick={exportTxt} title="Export .txt"><Download size={14} />txt</button>
            </div>
            {/* Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <Tag size={12} style={{ color: 'var(--text-3)' }} />
              {tags.map(t => (
                <span key={t} className="tag-chip">
                  {t} <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}><X size={10} /></button>
                </span>
              ))}
              <input style={{ border: 'none', background: 'transparent', fontSize: 12, outline: 'none', width: 100 }} placeholder="Add tag…" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} />
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {preview
                ? <MarkdownPreview content={content} />
                : <textarea value={content} onChange={e => handleContentChange(e.target.value)} placeholder="Start writing… (supports Markdown)" style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', resize: 'none', padding: 16, fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.7, outline: 'none', color: 'var(--text-0)', boxSizing: 'border-box' }} />
              }
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-3)' }}>
            <BookOpen size={40} />
            <div>Select a note or create a new one</div>
          </div>
        )}
      </div>
    </div>
  )
}
