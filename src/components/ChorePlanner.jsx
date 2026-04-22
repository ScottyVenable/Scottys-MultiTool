import React, { useState, useEffect, useMemo } from 'react'
import { Trophy, Plus, Check, Trash2, Sparkles, Star, Flame, X, User, Calendar, Award, Tag, Users, Home as HomeIcon } from 'lucide-react'
import { useToast } from './Toast'
import { logError, safeCall } from '../utils/logger'

const DAYS = [
  { id: 'daily', label: 'Daily' },
  { id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' }, { id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' },
]
const TODAY_KEY = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]

const CATEGORIES = [
  { id: 'General',  color: '#64748b' },
  { id: 'Cleaning', color: '#0ea5e9' },
  { id: 'Kitchen',  color: '#f59e0b' },
  { id: 'Yard',     color: '#10b981' },
  { id: 'Pets',     color: '#8b5cf6' },
  { id: 'Errand',   color: '#f43f5e' },
  { id: 'Self-care',color: '#14b8a6' },
  { id: 'Work',     color: '#6366f1' },
]
const catColor = (name) => (CATEGORIES.find(c => c.id === name)?.color) || '#64748b'

function xpForLevel(level) { return Math.pow(level, 2) * 50 }
function levelForXp(xp) { return Math.floor(Math.sqrt(xp / 50)) }

// Given a chore `day` field ('daily' or mon..sun), compute the next
// calendar date that matches at 9am local time. Returns null if unknown.
function nextDueDate(day) {
  const now = new Date()
  const target = new Date(now)
  target.setHours(9, 0, 0, 0)
  if (day === 'daily') {
    if (target <= now) target.setDate(target.getDate() + 1)
    return target
  }
  const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
  if (!(day in map)) return null
  const want = map[day]
  let delta = (want - now.getDay() + 7) % 7
  if (delta === 0 && target <= now) delta = 7
  target.setDate(target.getDate() + delta)
  return target
}

function ChoreModal({ chore, onSave, onClose, memberOptions }) {
  const [title, setTitle] = useState(chore?.title || '')
  const [description, setDescription] = useState(chore?.description || '')
  const [day, setDay] = useState(chore?.day || 'daily')
  const [difficulty, setDifficulty] = useState(chore?.difficulty || 1)
  const [owner, setOwner] = useState(chore?.owner || (memberOptions?.[0]?.name) || 'me')
  const [category, setCategory] = useState(chore?.category || 'General')
  const [tagsText, setTagsText] = useState((chore?.tags || []).join(', '))

  const save = () => {
    if (!title.trim()) return
    const tags = tagsText.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    onSave({ ...chore, title: title.trim(), description, day, difficulty, owner, category, tags, points: difficulty * 10 })
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
            <label className="form-label">Category</label>
            <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                  className={`btn btn-sm ${category === c.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={category === c.id ? { background: c.color, borderColor: c.color } : { borderLeft: `3px solid ${c.color}` }}>
                  {c.id}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated, e.g. #urgent, #kitchen)</label>
            <input className="input" value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="urgent, weekly" />
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
            {memberOptions && memberOptions.length > 0 ? (
              <select className="input" value={owner} onChange={e => setOwner(e.target.value)}>
                {memberOptions.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            ) : (
              <input className="input" value={owner} onChange={e => setOwner(e.target.value)} placeholder="me" />
            )}
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
  const [achievementDefs, setAchievementDefs] = useState([])
  const [filterCat, setFilterCat] = useState('all')
  const [filterText, setFilterText] = useState('')
  // Households: persisted via generic store under key 'choreHouseholds'. Shape:
  //   [{ id, name, members: [{ id, name, color }] }]
  // Also tracks `activeHouseholdId` for the selector.
  const [households, setHouseholds] = useState([])
  const [activeHouseholdId, setActiveHouseholdId] = useState(null)
  // Calendar view state (month offset from current month; 0 = this month).
  const [calOffset, setCalOffset] = useState(0)
  const isElectron = !!window.api

  useEffect(() => {
    if (isElectron) { refresh(); loadHouseholds() }
  }, [])

  const loadHouseholds = async () => {
    const saved = await safeCall(() => window.api.store.get('choreHouseholds'), { where: 'store.get(choreHouseholds)', toast, fallback: null })
    const list = Array.isArray(saved?.list) ? saved.list : (Array.isArray(saved) ? saved : [])
    setHouseholds(list)
    setActiveHouseholdId(saved?.activeId || list[0]?.id || null)
  }

  const saveHouseholds = async (nextList, nextActiveId) => {
    const payload = { list: nextList, activeId: nextActiveId ?? activeHouseholdId }
    await safeCall(() => window.api.store.set('choreHouseholds', payload), { where: 'store.set(choreHouseholds)', toast })
    setHouseholds(nextList)
    if (nextActiveId !== undefined) setActiveHouseholdId(nextActiveId)
  }

  const activeHousehold = households.find(h => h.id === activeHouseholdId) || null
  const memberOptions = activeHousehold?.members && activeHousehold.members.length
    ? activeHousehold.members
    : [{ id: 'me', name: 'me', color: 'var(--accent)' }]
  const memberColor = (ownerName) => {
    const m = memberOptions.find(m => m.name === ownerName)
    return m?.color || 'var(--text-3)'
  }

  const refresh = async () => {
    const c = await safeCall(() => window.api.chores.list(), { where: 'chores.list', toast, fallback: [] })
    const p = await safeCall(() => window.api.chores.profile(), { where: 'chores.profile', toast, fallback: { xp: 0, level: 0, achievements: [], history: [] } })
    setChores(c); setProfile(p)
    // Optional achievements catalog from backend, non-fatal if not exposed yet
    try {
      if (window.api.chores.achievements) {
        const defs = await window.api.chores.achievements()
        if (Array.isArray(defs)) setAchievementDefs(defs)
      }
    } catch {}
  }

  const saveChore = async (chore) => {
    const saved = await safeCall(() => window.api.chores.save(chore), { where: 'chores.save', toast })
    // Auto-mint a reminder for the next occurrence of this chore, linked by
    // `source: 'chore:<id>'` so duplicates from repeated edits are idempotent.
    try {
      const when = nextDueDate(chore.day)
      if (when && window.api.reminders?.save) {
        const idForThis = saved?.id || chore.id
        const rid = `chore_${idForThis || Date.now().toString(36)}`
        // Remove any prior reminder for this chore first (best-effort).
        try {
          const existing = await window.api.reminders.list()
          for (const r of (existing || [])) {
            if (r.source === `chore:${idForThis}`) await window.api.reminders.delete(r.id)
          }
        } catch {}
        await window.api.reminders.save({
          id: rid,
          title: chore.title,
          due: when.toISOString(),
          source: `chore:${idForThis}`,
          dismissed: false,
        })
      }
    } catch (e) { /* reminder mint is best-effort */ }
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
    const prevAchievements = new Set(profile.achievements || [])
    const result = await safeCall(() => window.api.chores.complete(chore.id, chore.owner), { where: 'chores.complete', toast })
    if (result?.profile) {
      setProfile(result.profile)
      setChores(prev => prev.map(c => c.id === chore.id ? result.chore : c))
      toast.show({ type: 'success', title: `+${chore.points || chore.difficulty*10} XP`, message: chore.title })
      if (result.profile.level > prevLevel) {
        toast.show({ type: 'success', title: `🎉 Level up!`, message: `You are now level ${result.profile.level}` })
      }
      // Announce any newly unlocked achievements (backend engine sets them on profile.achievements)
      for (const a of (result.profile.achievements || [])) {
        if (!prevAchievements.has(a)) {
          const def = achievementDefs.find(d => d.id === a)
          toast.show({ type: 'success', title: '🏆 Achievement', message: def?.name || a })
        }
      }
    }
  }

  const generateChores = async () => {
    setGenerating(true)
    const s = await safeCall(() => window.api.store.get('settings'), { where: 'store.get', toast, fallback: {} }) || {}
    const prompt = `Generate 5 realistic household chores as a JSON array. Each item must have: title (string), description (short string), day (one of: daily,mon,tue,wed,thu,fri,sat,sun), difficulty (integer 1-5), category (one of: General,Cleaning,Kitchen,Yard,Pets,Errand,Self-care,Work). Return ONLY the JSON array, no prose.`
    const result = await safeCall(() => window.api.ai.query({
      prompt, endpoint: s.aiApiBase || 'http://localhost:1234', apiKey: s.aiApiKey, model: s.aiModel,
      temperature: 0.9, maxTokens: 800,
    }), { where: 'ai.query', toast })
    setGenerating(false)
    if (!result?.success) return
    try {
      const match = result.content.match(/\[[\s\S]*\]/)
      const raw = JSON.parse(match ? match[0] : result.content)
      // Validate shape strictly — anything bogus is dropped
      const items = (Array.isArray(raw) ? raw : []).filter(it =>
        it && typeof it.title === 'string' && it.title.trim().length > 0
      )
      for (const it of items) {
        await window.api.chores.save({
          title: String(it.title).slice(0, 120),
          description: String(it.description || '').slice(0, 400),
          day: DAYS.some(d => d.id === it.day) ? it.day : 'daily',
          difficulty: Math.max(1, Math.min(5, parseInt(it.difficulty) || 1)),
          category: CATEGORIES.some(c => c.id === it.category) ? it.category : 'General',
          tags: [],
          owner: 'me',
          points: (parseInt(it.difficulty) || 1) * 10,
        })
      }
      toast.show({ type: 'success', title: 'AI generated', message: `Added ${items.length} chores` })
      refresh()
    } catch (e) {
      logError('chores.generate', e, toast)
    }
  }

  const filteredChores = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return chores.filter(c => {
      if (filterCat !== 'all' && (c.category || 'General') !== filterCat) return false
      if (q) {
        const hay = `${c.title || ''} ${c.description || ''} ${(c.tags || []).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [chores, filterCat, filterText])

  const todaysChores = filteredChores.filter(c => c.day === 'daily' || c.day === TODAY_KEY)
  const currentLevelXp = xpForLevel(profile.level)
  const nextLevelXp = xpForLevel(profile.level + 1)
  const pct = Math.min(100, Math.round(((profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))

  const leaderboard = (() => {
    const totals = {}
    for (const h of profile.history || []) totals[h.owner || 'me'] = (totals[h.owner || 'me'] || 0) + (h.points || 0)
    let entries = Object.entries(totals)
    // If a household is active, scope the board to its members and also
    // surface members who have 0 points yet so the ranking feels complete.
    if (activeHousehold && (activeHousehold.members || []).length) {
      const names = new Set(activeHousehold.members.map(m => m.name))
      entries = entries.filter(([n]) => names.has(n))
      for (const m of activeHousehold.members) {
        if (!(m.name in totals)) entries.push([m.name, 0])
      }
    }
    return entries.sort((a, b) => b[1] - a[1])
  })()

  const unlocked = new Set(profile.achievements || [])

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
          <div className="flex gap-8 items-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {(profile.achievements || []).slice(0, 6).map(a => {
              const def = achievementDefs.find(d => d.id === a)
              return <span key={a} className="tag-chip" title={def?.description || a}><Trophy size={10} /> {def?.name || a}</span>
            })}
          </div>
        </div>
        <div style={{ width: '100%', height: 8, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--green))', transition: 'width 0.4s' }} />
        </div>
      </div>

      <div className="tab-bar mb-16">
        <button className={`tab-item ${tab === 'today' ? 'tab-active' : ''}`} onClick={() => setTab('today')}><Calendar size={13} /> Today</button>
        <button className={`tab-item ${tab === 'week' ? 'tab-active' : ''}`} onClick={() => setTab('week')}><Calendar size={13} /> Week</button>
        <button className={`tab-item ${tab === 'calendar' ? 'tab-active' : ''}`} onClick={() => setTab('calendar')}><Calendar size={13} /> Calendar</button>
        <button className={`tab-item ${tab === 'badges' ? 'tab-active' : ''}`} onClick={() => setTab('badges')}><Award size={13} /> Badges</button>
        <button className={`tab-item ${tab === 'board' ? 'tab-active' : ''}`} onClick={() => setTab('board')}><User size={13} /> Leaderboard</button>
        <button className={`tab-item ${tab === 'household' ? 'tab-active' : ''}`} onClick={() => setTab('household')}><Users size={13} /> Household</button>
      </div>

      {tab !== 'badges' && (
        <div className="flex items-center gap-8 mb-12" style={{ flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search title, description, tag…" value={filterText} onChange={e => setFilterText(e.target.value)} style={{ maxWidth: 260, fontSize: 12 }} />
          <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${filterCat === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterCat('all')}>All</button>
            {CATEGORIES.map(c => (
              <button key={c.id} className={`btn btn-sm ${filterCat === c.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterCat(c.id)}
                style={filterCat === c.id ? { background: c.color, borderColor: c.color } : { borderLeft: `3px solid ${c.color}` }}>
                {c.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'today' && (
        <div className="grid-2 gap-12">
          {todaysChores.length === 0 && <div className="text-muted text-sm">No chores for today. Click "New Chore" to add one.</div>}
          {todaysChores.map(c => {
            const doneToday = c.lastCompleted === new Date().toISOString().slice(0, 10)
            return (
              <div key={c.id} className="card chore-card" style={{ padding: 14, opacity: doneToday ? 0.55 : 1, borderLeft: `3px solid ${catColor(c.category)}` }}>
                <div className="flex items-center justify-between mb-6">
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div className="flex gap-4">
                    {[...Array(c.difficulty || 1)].map((_, i) => <Star key={i} size={11} fill="var(--yellow)" color="var(--yellow)" />)}
                  </div>
                </div>
                {c.description && <div className="text-xs text-muted mb-8">{c.description}</div>}
                {(c.category || (c.tags && c.tags.length)) && (
                  <div className="flex gap-4 mb-8" style={{ flexWrap: 'wrap' }}>
                    {c.category && c.category !== 'General' && <span className="tag-chip" style={{ background: catColor(c.category) + '33', color: catColor(c.category) }}>{c.category}</span>}
                    {(c.tags || []).map(t => <span key={t} className="tag-chip"><Tag size={9} /> {t}</span>)}
                  </div>
                )}
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
                {filteredChores.filter(c => c.day === d.id).map(c => (
                  <div key={c.id} className="card" style={{ padding: 6, fontSize: 11, background: 'var(--bg-3)', borderLeft: `3px solid ${catColor(c.category)}` }}>
                    {c.title}
                    <div style={{ color: 'var(--text-3)', fontSize: 10 }}>+{(c.difficulty||1)*10} XP</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'badges' && (
        <div>
          <div className="text-xs text-muted mb-12">{unlocked.size}/{achievementDefs.length || '?'} unlocked</div>
          <div className="grid-2 gap-8">
            {(achievementDefs.length ? achievementDefs : [
              { id: 'first_complete', name: 'First Step', description: 'Complete your first chore.' },
              { id: 'streak_3', name: '3-Day Streak', description: 'Complete any chore 3 days in a row.' },
              { id: 'streak_7', name: 'Week Warrior', description: 'Complete any chore 7 days in a row.' },
              { id: 'streak_30', name: 'Iron Discipline', description: 'Complete any chore 30 days in a row.' },
              { id: 'level_5', name: 'Level 5', description: 'Reach level 5.' },
              { id: 'level_10', name: 'Level 10', description: 'Reach level 10.' },
              { id: 'variety_5', name: 'Variety', description: 'Complete chores in 5 different categories.' },
              { id: 'early_bird', name: 'Early Bird', description: 'Complete a chore before 9am.' },
              { id: 'night_owl', name: 'Night Owl', description: 'Complete a chore after 10pm.' },
              { id: 'ten_done', name: 'Ten Done', description: 'Complete 10 chores total.' },
              { id: 'fifty_done', name: 'Fifty Done', description: 'Complete 50 chores total.' },
            ]).map(a => {
              const got = unlocked.has(a.id)
              return (
                <div key={a.id} className={`achievement-card ${got ? '' : 'locked'}`}>
                  <div className="achievement-icon"><Trophy size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="achievement-name">{a.name}{got && <span style={{ marginLeft: 6, color: 'var(--green)' }}>✓</span>}</div>
                    <div className="achievement-desc">{a.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'board' && (
        <div className="card">
          <div className="card-title mb-12"><Trophy size={14} className="card-title-icon" /> Leaderboard {activeHousehold && <span className="text-xs text-muted" style={{ fontWeight: 400 }}>· {activeHousehold.name}</span>}</div>
          {leaderboard.length === 0
            ? <div className="text-sm text-muted">No completions yet.</div>
            : leaderboard.map(([name, pts], i) => (
              <div key={name} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-8">
                  <div style={{ width: 28, textAlign: 'center', fontWeight: 700, color: i === 0 ? 'var(--yellow)' : 'var(--text-2)' }}>{i + 1}</div>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: memberColor(name) }} />
                  <div style={{ fontWeight: 500 }}>{name}</div>
                </div>
                <div style={{ fontFamily: 'var(--mono)' }}>{pts} XP</div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarTab
          chores={filteredChores}
          offset={calOffset}
          setOffset={setCalOffset}
          memberColor={memberColor}
        />
      )}

      {tab === 'household' && (
        <HouseholdTab
          households={households}
          activeHouseholdId={activeHouseholdId}
          onChange={(list, activeId) => saveHouseholds(list, activeId)}
        />
      )}

      {editing && <ChoreModal chore={editing} memberOptions={memberOptions} onSave={saveChore} onClose={() => setEditing(null)} />}
    </div>
  )
}

// ── Calendar tab ─────────────────────────────────────────────────────────────
function CalendarTab({ chores, offset, setOffset, memberColor }) {
  const now = new Date()
  const viewed = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = viewed.getFullYear()
  const month = viewed.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = viewed.toLocaleString('default', { month: 'long', year: 'numeric' })
  const todayKey = new Date().toISOString().slice(0, 10)

  // Determine which chores land on each date. `day` can be 'daily' or a weekday
  // abbrev. We also surface `lastCompleted === ISO date` completion marks.
  const cellsByDay = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const iso = date.toISOString().slice(0, 10)
    const dow = ['sun','mon','tue','wed','thu','fri','sat'][date.getDay()]
    const scheduled = chores.filter(c => c.day === 'daily' || c.day === dow)
    const completions = chores.filter(c => c.lastCompleted === iso)
    cellsByDay.push({ d, iso, isToday: iso === todayKey, scheduled, completions })
  }

  const pad = Array.from({ length: firstDow }, (_, i) => ({ pad: true, key: `p-${i}` }))
  const cells = [...pad, ...cellsByDay]

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="flex items-center justify-between mb-12">
        <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset - 1)}>←</button>
        <div style={{ fontWeight: 600 }}>{monthLabel}</div>
        <div className="flex gap-6">
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset + 1)}>→</button>
        </div>
      </div>
      <div className="chore-cal-grid">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(lbl => (
          <div key={lbl} className="chore-cal-h">{lbl}</div>
        ))}
        {cells.map((c, i) => c.pad ? (
          <div key={c.key} className="chore-cal-cell chore-cal-pad" />
        ) : (
          <div key={c.iso} className={`chore-cal-cell ${c.isToday ? 'chore-cal-today' : ''}`}>
            <div className="chore-cal-date">{c.d}</div>
            <div className="chore-cal-dots">
              {c.scheduled.slice(0, 6).map((ch, idx) => (
                <span
                  key={`s-${idx}-${ch.id}`}
                  className="chore-cal-dot"
                  title={`${ch.title} · ${ch.owner || 'me'}`}
                  style={{ background: memberColor(ch.owner) }}
                />
              ))}
              {c.scheduled.length > 6 && (
                <span className="chore-cal-more">+{c.scheduled.length - 6}</span>
              )}
            </div>
            {c.completions.length > 0 && (
              <div className="chore-cal-done" title={`${c.completions.length} completed`}>
                ✓ {c.completions.length}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Household tab ────────────────────────────────────────────────────────────
function HouseholdTab({ households, activeHouseholdId, onChange }) {
  const [newHouseName, setNewHouseName] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberColor, setNewMemberColor] = useState('#ff6b35')
  const active = households.find(h => h.id === activeHouseholdId)

  const addHousehold = () => {
    if (!newHouseName.trim()) return
    const id = `h_${Date.now().toString(36)}`
    const h = { id, name: newHouseName.trim(), members: [] }
    onChange([...households, h], id)
    setNewHouseName('')
  }
  const removeHousehold = (id) => {
    if (!confirm('Delete this household and all of its members?')) return
    const next = households.filter(h => h.id !== id)
    onChange(next, next[0]?.id || null)
  }
  const addMember = () => {
    if (!active || !newMemberName.trim()) return
    const m = { id: `m_${Date.now().toString(36)}`, name: newMemberName.trim(), color: newMemberColor }
    const next = households.map(h => h.id === active.id ? { ...h, members: [...(h.members || []), m] } : h)
    onChange(next)
    setNewMemberName('')
  }
  const removeMember = (mid) => {
    if (!active) return
    const next = households.map(h => h.id === active.id ? { ...h, members: h.members.filter(m => m.id !== mid) } : h)
    onChange(next)
  }

  return (
    <div className="grid-2 gap-12">
      <div className="card" style={{ padding: 14 }}>
        <div className="card-title mb-10"><HomeIcon size={14} className="card-title-icon" /> Households</div>
        {households.length === 0 && <div className="text-sm text-muted mb-8">No households yet. Add one below to start tracking who does what.</div>}
        {households.map(h => (
          <div key={h.id} className="flex items-center justify-between" style={{ padding: '6px 8px', borderRadius: 4, background: h.id === activeHouseholdId ? 'var(--bg-3)' : 'transparent', cursor: 'pointer' }} onClick={() => onChange(households, h.id)}>
            <div style={{ fontWeight: 500 }}>{h.name}</div>
            <div className="flex gap-6 items-center">
              <span className="text-xs text-muted">{h.members?.length || 0} members</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); removeHousehold(h.id) }}><Trash2 size={11} /></button>
            </div>
          </div>
        ))}
        <div className="flex gap-6 mt-12">
          <input className="input" value={newHouseName} placeholder="Household name (e.g. Smith family)" onChange={e => setNewHouseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHousehold()} />
          <button className="btn btn-primary btn-sm" onClick={addHousehold}><Plus size={12} /> Add</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="card-title mb-10"><Users size={14} className="card-title-icon" /> Members {active && <span className="text-xs text-muted" style={{ fontWeight: 400 }}>· {active.name}</span>}</div>
        {!active && <div className="text-sm text-muted">Select a household to manage its members.</div>}
        {active && (
          <>
            {(active.members || []).length === 0 && <div className="text-sm text-muted mb-8">No members yet. Add the first one below.</div>}
            {(active.members || []).map(m => (
              <div key={m.id} className="flex items-center justify-between" style={{ padding: '6px 8px' }}>
                <div className="flex items-center gap-8">
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeMember(m.id)}><Trash2 size={11} /></button>
              </div>
            ))}
            <div className="flex gap-6 mt-12" style={{ alignItems: 'center' }}>
              <input className="input" value={newMemberName} placeholder="Name" onChange={e => setNewMemberName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember()} />
              <input type="color" value={newMemberColor} onChange={e => setNewMemberColor(e.target.value)} style={{ width: 36, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent' }} />
              <button className="btn btn-primary btn-sm" onClick={addMember}><Plus size={12} /> Add</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
