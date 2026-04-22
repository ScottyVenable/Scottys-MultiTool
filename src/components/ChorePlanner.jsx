import React, { useState, useEffect } from 'react'
import { Trophy, Plus, Check, Trash2, Sparkles, Star, Flame, X, User, Calendar } from 'lucide-react'
import { useToast } from './Toast'
import { logError, safeCall } from '../utils/logger'

const DAYS = [
  { id: 'daily', label: 'Daily' },
  { id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' }, { id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' },
]
const TODAY_KEY = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]

function xpForLevel(level) { return Math.pow(level, 2) * 50 }
function levelForXp(xp) { return Math.floor(Math.sqrt(xp / 50)) }

function ChoreModal({ chore, onSave, onClose }) {
  const [title, setTitle] = useState(chore?.title || '')
  const [description, setDescription] = useState(chore?.description || '')
  const [day, setDay] = useState(chore?.day || 'daily')
  const [difficulty, setDifficulty] = useState(chore?.difficulty || 1)
  const [owner, setOwner] = useState(chore?.owner || 'me')

  const save = () => {
    if (!title.trim()) return
    onSave({ ...chore, title: title.trim(), description, day, difficulty, owner, points: difficulty * 10 })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 460 }}>
        <div className="modal-header">
          <div className="modal-title">{chore?.id ? 'Edit Chore' : 'New Chore'}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Take out trash" />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Day</label>
            <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
              {DAYS.map(d => (
                <button key={d.id} className={`btn btn-sm ${day === d.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDay(d.id)}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Difficulty ({difficulty} ★ → {difficulty * 10} XP)</label>
            <input type="range" min={1} max={5} value={difficulty} onChange={e => setDifficulty(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Owner</label>
            <input className="input" value={owner} onChange={e => setOwner(e.target.value)} placeholder="me" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}><Check size={13} /> Save</button>
        </div>
      </div>
    </div>
  )
}

export default function ChorePlanner() {
  const toast = useToast()
  const [tab, setTab] = useState('today')
  const [chores, setChores] = useState([])
  const [profile, setProfile] = useState({ xp: 0, level: 0, achievements: [], history: [] })
  const [editing, setEditing] = useState(null)
  const [generating, setGenerating] = useState(false)
  const isElectron = !!window.api

  useEffect(() => { if (isElectron) refresh() }, [])

  const refresh = async () => {
    const c = await safeCall(() => window.api.chores.list(), { where: 'chores.list', toast, fallback: [] })
    const p = await safeCall(() => window.api.chores.profile(), { where: 'chores.profile', toast, fallback: { xp: 0, level: 0, achievements: [], history: [] } })
    setChores(c); setProfile(p)
  }

  const saveChore = async (chore) => {
    await safeCall(() => window.api.chores.save(chore), { where: 'chores.save', toast })
    setEditing(null)
    refresh()
    toast.show({ type: 'success', title: 'Chore saved' })
  }

  const deleteChore = async (id) => {
    if (!confirm('Delete this chore?')) return
    await safeCall(() => window.api.chores.delete(id), { where: 'chores.delete', toast })
    refresh()
  }

  const complete = async (chore) => {
    const prevLevel = profile.level
    const result = await safeCall(() => window.api.chores.complete(chore.id, chore.owner), { where: 'chores.complete', toast })
    if (result?.profile) {
      setProfile(result.profile)
      setChores(prev => prev.map(c => c.id === chore.id ? result.chore : c))
      toast.show({ type: 'success', title: `+${chore.points || chore.difficulty*10} XP`, message: chore.title })
      if (result.profile.level > prevLevel) {
        toast.show({ type: 'success', title: `🎉 Level up!`, message: `You are now level ${result.profile.level}` })
      }
      // Simple achievement checks
      if (result.chore.streak === 7 && !(profile.achievements || []).includes('streak-7')) {
        const newProfile = { ...result.profile, achievements: [...(result.profile.achievements || []), 'streak-7'] }
        await safeCall(() => window.api.chores.setProfile(newProfile), { where: 'chores.setProfile', toast })
        setProfile(newProfile)
        toast.show({ type: 'success', title: '🏆 Achievement', message: '7-day streak!' })
      }
    }
  }

  const generateChores = async () => {
    setGenerating(true)
    const s = await safeCall(() => window.api.store.get('settings'), { where: 'store.get', toast, fallback: {} }) || {}
    const prompt = `Generate 5 realistic household chores as a JSON array. Each item should have fields: title (string), description (string, short), day (one of: daily,mon,tue,wed,thu,fri,sat,sun), difficulty (1-5). Return ONLY the JSON array, no prose.`
    const result = await safeCall(() => window.api.ai.query({
      prompt, endpoint: s.aiApiBase || 'http://localhost:1234', apiKey: s.aiApiKey, model: s.aiModel,
      temperature: 0.9, maxTokens: 800,
    }), { where: 'ai.query', toast })
    setGenerating(false)
    if (!result?.success) return
    try {
      const match = result.content.match(/\[[\s\S]*\]/)
      const items = JSON.parse(match ? match[0] : result.content)
      for (const it of items) {
        await window.api.chores.save({
          title: it.title, description: it.description || '', day: it.day || 'daily',
          difficulty: Math.max(1, Math.min(5, parseInt(it.difficulty) || 1)),
          owner: 'me', points: (parseInt(it.difficulty) || 1) * 10,
        })
      }
      toast.show({ type: 'success', title: 'AI generated', message: `Added ${items.length} chores` })
      refresh()
    } catch (e) {
      logError('chores.generate', e, toast)
    }
  }

  const todaysChores = chores.filter(c => c.day === 'daily' || c.day === TODAY_KEY)
  const currentLevelXp = xpForLevel(profile.level)
  const nextLevelXp = xpForLevel(profile.level + 1)
  const pct = Math.min(100, Math.round(((profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))

  const leaderboard = (() => {
    const totals = {}
    for (const h of profile.history || []) totals[h.owner || 'me'] = (totals[h.owner || 'me'] || 0) + (h.points || 0)
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  })()

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Chore Planner</div>
          <div className="page-subtitle">Gamified chores — earn XP, level up, unlock achievements</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-sm" onClick={generateChores} disabled={generating || !isElectron}>
            <Sparkles size={13} /> {generating ? 'Generating…' : 'AI Generate'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({})}><Plus size={13} /> New Chore</button>
        </div>
      </div>

      {/* XP bar */}
      <div className="card mb-12" style={{ padding: 14 }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-8">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent-h)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{profile.level}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Level {profile.level}</div>
              <div className="text-xs text-muted">{profile.xp} XP • Next at {nextLevelXp} XP</div>
            </div>
          </div>
          <div className="flex gap-8 items-center">
            {(profile.achievements || []).map(a => <span key={a} className="tag-chip"><Trophy size={10} /> {a}</span>)}
          </div>
        </div>
        <div style={{ width: '100%', height: 8, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--green))', transition: 'width 0.4s' }} />
        </div>
      </div>

      <div className="tab-bar mb-16">
        <button className={`tab-item ${tab === 'today' ? 'tab-active' : ''}`} onClick={() => setTab('today')}><Calendar size={13} /> Today</button>
        <button className={`tab-item ${tab === 'week' ? 'tab-active' : ''}`} onClick={() => setTab('week')}><Calendar size={13} /> Week</button>
        <button className={`tab-item ${tab === 'board' ? 'tab-active' : ''}`} onClick={() => setTab('board')}><User size={13} /> Leaderboard</button>
      </div>

      {tab === 'today' && (
        <div className="grid-2 gap-12">
          {todaysChores.length === 0 && <div className="text-muted text-sm">No chores for today. Click "New Chore" to add one.</div>}
          {todaysChores.map(c => {
            const doneToday = c.lastCompleted === new Date().toISOString().slice(0, 10)
            return (
              <div key={c.id} className="card chore-card" style={{ padding: 14, opacity: doneToday ? 0.55 : 1 }}>
                <div className="flex items-center justify-between mb-6">
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div className="flex gap-4">
                    {[...Array(c.difficulty || 1)].map((_, i) => <Star key={i} size={11} fill="var(--yellow)" color="var(--yellow)" />)}
                  </div>
                </div>
                {c.description && <div className="text-xs text-muted mb-8">{c.description}</div>}
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 items-center text-xs text-muted">
                    <span>+{c.points || (c.difficulty||1)*10} XP</span>
                    {c.streak > 0 && <span style={{ color: 'var(--yellow)' }}><Flame size={10} /> {c.streak}</span>}
                  </div>
                  <div className="flex gap-6">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteChore(c.id)}><Trash2 size={11} /></button>
                    <button className="btn btn-success btn-sm" disabled={doneToday} onClick={() => complete(c)}><Check size={11} /> {doneToday ? 'Done' : 'Complete'}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
          {DAYS.map(d => (
            <div key={d.id} className="card" style={{ padding: 8, minHeight: 200 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>{d.label}</div>
              <div className="flex-col gap-6">
                {chores.filter(c => c.day === d.id).map(c => (
                  <div key={c.id} className="card" style={{ padding: 6, fontSize: 11, background: 'var(--bg-3)' }}>
                    {c.title}
                    <div style={{ color: 'var(--text-3)', fontSize: 10 }}>+{(c.difficulty||1)*10} XP</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'board' && (
        <div className="card">
          <div className="card-title mb-12"><Trophy size={14} className="card-title-icon" /> Leaderboard</div>
          {leaderboard.length === 0
            ? <div className="text-sm text-muted">No completions yet.</div>
            : leaderboard.map(([name, pts], i) => (
              <div key={name} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-8">
                  <div style={{ width: 28, textAlign: 'center', fontWeight: 700, color: i === 0 ? 'var(--yellow)' : 'var(--text-2)' }}>{i + 1}</div>
                  <div style={{ fontWeight: 500 }}>{name}</div>
                </div>
                <div style={{ fontFamily: 'var(--mono)' }}>{pts} XP</div>
              </div>
            ))
          }
        </div>
      )}

      {editing && <ChoreModal chore={editing} onSave={saveChore} onClose={() => setEditing(null)} />}
    </div>
  )
}
