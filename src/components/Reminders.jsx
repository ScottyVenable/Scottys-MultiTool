import React, { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, Check, Clock, Edit3, X } from 'lucide-react'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

const RECUR = [
  { value: '', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function ReminderModal({ reminder, onSave, onClose }) {
  const [title, setTitle] = useState(reminder?.title || '')
  const [desc, setDesc] = useState(reminder?.description || '')
  const [dt, setDt] = useState(reminder?.datetime || new Date(Date.now() + 3600000).toISOString().slice(0,16))
  const [recur, setRecur] = useState(reminder?.recurring || '')

  const save = () => {
    if (!title.trim()) return
    onSave({ id: reminder?.id || uid(), title, description: desc, datetime: dt, recurring: recur, notified: false, dismissed: false, createdAt: reminder?.createdAt || new Date().toISOString() })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div className="card" style={{ width: 420, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{reminder?.id ? 'Edit Reminder' : 'New Reminder'}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="form-group mb-12">
          <label className="form-label">Title *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Reminder title" autoFocus />
        </div>
        <div className="form-group mb-12">
          <label className="form-label">Description</label>
          <textarea className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional details…" style={{ minHeight: 60, resize: 'vertical' }} />
        </div>
        <div className="form-group mb-12">
          <label className="form-label">Date & Time</label>
          <input className="input" type="datetime-local" value={dt} onChange={e => setDt(e.target.value)} />
        </div>
        <div className="form-group mb-20">
          <label className="form-label">Repeat</label>
          <select className="input" value={recur} onChange={e => setRecur(e.target.value)}>
            {RECUR.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function Reminders() {
  const [reminders, setReminders] = useState([])
  const [modal, setModal] = useState(null) // null | {} | reminder obj
  const isElectron = !!window.api

  const load = async () => {
    if (!isElectron) return
    const list = await window.api.reminders.list()
    setReminders((list || []).sort((a,b) => new Date(a.datetime) - new Date(b.datetime)))
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (reminder) => {
    if (!isElectron) return
    await window.api.reminders.save(reminder)
    setModal(null)
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete reminder?')) return
    await window.api.reminders.delete(id)
    load()
  }

  const dismiss = async (id) => {
    await window.api.reminders.dismiss(id)
    load()
  }

  const snooze = async (reminder) => {
    const newDt = new Date(Date.now() + 3600000).toISOString().slice(0,16)
    await window.api.reminders.save({ ...reminder, datetime: newDt, notified: false, dismissed: false })
    load()
  }

  const now = Date.now()
  const overdue = reminders.filter(r => !r.dismissed && new Date(r.datetime).getTime() < now)
  const upcoming = reminders.filter(r => !r.dismissed && new Date(r.datetime).getTime() >= now)
  const done = reminders.filter(r => r.dismissed)

  const Section = ({ title, list, color }) => list.length === 0 ? null : (
    <div className="mb-16">
      <div style={{ fontWeight: 600, fontSize: 12, color: `var(--${color})`, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <div className="flex-col gap-8">
        {list.map(r => (
          <div key={r.id} className="card" style={{ borderLeft: `3px solid var(--${color})` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
                {r.description && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{r.description}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'flex', gap: 8 }}>
                  <Clock size={11} />
                  {new Date(r.datetime).toLocaleString()}
                  {r.recurring && <span style={{ background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 10 }}>↻ {r.recurring}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!r.dismissed && <>
                  <button className="btn btn-ghost btn-sm" onClick={() => snooze(r)} title="Snooze 1hr"><Clock size={12} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => dismiss(r.id)} title="Mark done"><Check size={12} /></button>
                </>}
                <button className="btn btn-ghost btn-sm" onClick={() => setModal(r)} title="Edit"><Edit3 size={12} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => del(r.id)} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Reminders</div>
          <div className="page-subtitle">Schedule and manage your reminders with OS notifications</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}><Plus size={14} /> New Reminder</button>
      </div>

      {reminders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
          <Bell size={36} style={{ margin: '0 auto 12px' }} />
          <div>No reminders yet. Create one to get started.</div>
        </div>
      )}

      <Section title="Overdue" list={overdue} color="red" />
      <Section title="Upcoming" list={upcoming} color="accent" />
      <Section title="Completed" list={done} color="text-3" />

      {modal !== null && <ReminderModal reminder={Object.keys(modal).length ? modal : null} onSave={save} onClose={() => setModal(null)} />}
    </div>
  )
}
