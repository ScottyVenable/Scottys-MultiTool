import React, { useState, useEffect } from 'react'
import { BookHeart, Plus, Trash2, Eye, Edit3, Search, Tag, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import PinLock from './PinLock'

const MOODS = ['😄','😊','😐','😔','😢']
const MOOD_LABELS = ['Great','Good','Okay','Down','Rough']

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
function todayStr() { return new Date().toISOString().slice(0,10) }

function parseChips(text) {
  const tags = [...text.matchAll(/#(\w+)/g)].map(m => m[1])
  const people = [...text.matchAll(/@(\w+)/g)].map(m => m[1])
  return { tags, people }
}

export default function Journal() {
  const [entries, setEntries] = useState([])
  const [unlocked, setUnlocked] = useState(false)
  const [pinHash, setPinHash] = useState(null)
  const [tab, setTab] = useState('today')
  const [date, setDate] = useState(todayStr())
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(null)
  const [preview, setPreview] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.store.get('settings').then(s => {
      const hash = s?.pin || null
      setPinHash(hash)
      if (!hash) setUnlocked(true)
    })
    window.api.journal.list().then(list => {
      setEntries(list || [])
      loadForDate(date, list || [])
    })
  }, [])

  const loadForDate = (d, list) => {
    const entry = (list || entries).find(e => e.date === d)
    setContent(entry?.content || '')
    setMood(entry?.mood ?? null)
  }

  const changeDate = (delta) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    const s = d.toISOString().slice(0,10)
    setDate(s)
    loadForDate(s, entries)
  }

  const saveEntry = async () => {
    if (!isElectron) return
    const existing = entries.find(e => e.date === date)
    const { tags, people } = parseChips(content)
    const entry = { id: existing?.id || uid(), date, content, mood, tags, people, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
    await window.api.journal.save(entry)
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id)
      if (idx >= 0) { const a = [...prev]; a[idx] = entry; return a }
      return [entry, ...prev]
    })
  }

  const deleteEntry = async (id) => {
    if (!confirm('Delete this entry?')) return
    await window.api.journal.delete(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    loadForDate(date, entries.filter(e => e.id !== id))
  }

  const doSearch = async () => {
    if (!isElectron || !search.trim()) return
    const results = await window.api.journal.search(search)
    setSearchResults(results)
  }

  const { tags: parsedTags, people: parsedPeople } = parseChips(content)

  if (pinHash && !unlocked) return <PinLock storedHash={pinHash} onUnlock={() => setUnlocked(true)} />

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Journal</div>
          <div className="page-subtitle">Private daily journal with mood tracking</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['today','all','search'].map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)}>
            {t === 'today' ? 'Today' : t === 'all' ? 'All Entries' : 'Search'}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="card flex-col gap-16">
          {/* Date nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => changeDate(-1)}><ChevronLeft size={16} /></button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
              {new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => changeDate(1)} disabled={date >= todayStr()}><ChevronRight size={16} /></button>
          </div>

          {/* Mood */}
          <div>
            <label className="form-label mb-8">How are you feeling?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {MOODS.map((m, i) => (
                <button key={m} onClick={() => setMood(i)}
                  title={MOOD_LABELS[i]}
                  style={{ fontSize: 28, background: mood === i ? 'var(--bg-3)' : 'transparent', border: mood === i ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 'var(--r-lg)', padding: '6px 10px', cursor: 'pointer', transition: 'all .15s' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label">Entry</label>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(v => !v)}>
                {preview ? <Edit3 size={13} /> : <Eye size={13} />} {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview
              ? <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--r)', padding: 16, minHeight: 180, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content || <span style={{ color: 'var(--text-3)' }}>Nothing written yet…</span>}</div>
              : <textarea className="input" value={content} onChange={e => setContent(e.target.value)} placeholder={`Write about your day… Use #tags and @people`} style={{ width: '100%', minHeight: 180, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7 }} />
            }
          </div>

          {/* Parsed chips */}
          {(parsedTags.length > 0 || parsedPeople.length > 0) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {parsedTags.map(t => <span key={t} className="tag-chip">#{t}</span>)}
              {parsedPeople.map(p => <span key={p} className="person-chip">@{p}</span>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveEntry}>Save Entry</button>
            {entries.find(e => e.date === date) && (
              <button className="btn btn-danger" onClick={() => deleteEntry(entries.find(e => e.date === date)?.id)}>Delete</button>
            )}
          </div>
        </div>
      )}

      {tab === 'all' && (
        <div className="flex-col gap-8">
          {entries.length === 0 && <div className="text-muted text-sm" style={{ padding: 16 }}>No entries yet.</div>}
          {[...entries].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
            <div key={e.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { setDate(e.date); setTab('today'); loadForDate(e.date, entries) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{e.date}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {e.mood != null && <span style={{ fontSize: 20 }}>{MOODS[e.mood]}</span>}
                  <button className="btn btn-ghost btn-sm" onClick={ev => { ev.stopPropagation(); deleteEntry(e.id) }}><Trash2 size={12} /></button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{e.content}</div>
              {(e.tags?.length > 0 || e.people?.length > 0) && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {(e.tags||[]).map(t => <span key={t} className="tag-chip">#{t}</span>)}
                  {(e.people||[]).map(p => <span key={p} className="person-chip">@{p}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'search' && (
        <div className="flex-col gap-12">
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Search entries by keyword or #tag…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
            <button className="btn btn-primary" onClick={doSearch}><Search size={14} /></button>
          </div>
          {searchResults.map(e => (
            <div key={e.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { setDate(e.date); setTab('today'); loadForDate(e.date, entries) }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{e.date}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{e.content?.slice(0, 120)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
