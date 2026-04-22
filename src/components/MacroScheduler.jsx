import React, { useState, useEffect } from 'react'
import { CalendarClock, Plus, Trash2, X, ToggleLeft, ToggleRight, AlertCircle, Clock, Calendar, Repeat } from 'lucide-react'

const TYPE_LABELS = { interval: 'Interval', daily: 'Daily', once: 'One-time' }
const TYPE_ICONS  = { interval: Repeat, daily: Calendar, once: Clock }

function TaskModal({ task, macros, onSave, onClose }) {
  const [name, setName]       = useState(task?.name || '')
  const [macroId, setMacroId] = useState(task?.macroId || '')
  const [type, setType]       = useState(task?.type || 'interval')
  const [intervalValue, setIntervalValue] = useState(task?.intervalValue ?? task?.intervalMinutes ?? 60)
  const [intervalUnit, setIntervalUnit] = useState(task?.intervalUnit || 'minutes')
  const [time, setTime]       = useState(task?.time || '09:00')
  const [datetime, setDatetime] = useState(task?.datetime || '')
  const [enabled, setEnabled] = useState(task?.enabled !== false)

  const save = () => {
    if (!name.trim() || !macroId) return
    onSave({
      id: task?.id || `task-${Date.now()}`,
      name: name.trim(),
      macroId,
      type,
      intervalValue: parseInt(intervalValue) || 60,
      intervalMinutes: intervalUnit === 'minutes' ? (parseInt(intervalValue) || 60) : Math.ceil((parseInt(intervalValue) || 60) / 60),
      intervalUnit,
      time,
      datetime,
      enabled,
      createdAt: task?.createdAt || new Date().toISOString(),
      ran: task?.ran || false,
      lastRun: task?.lastRun || null,
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 500 }}>
        <div className="modal-header">
          <div className="modal-title">{task?.id ? 'Edit Task' : 'New Scheduled Task'}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Task Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning backup" />
          </div>

          <div className="form-group">
            <label className="form-label">Macro to Run</label>
            <select className="input" value={macroId} onChange={e => setMacroId(e.target.value)}>
              <option value="">Select a macro...</option>
              {macros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Schedule Type</label>
            <div className="flex gap-8">
              {['interval', 'daily', 'once'].map(t => {
                const Icon = TYPE_ICONS[t]
                return (
                  <button
                    key={t}
                    className={`btn flex-1 ${type === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setType(t)}
                  >
                    <Icon size={12} /> {TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {type === 'interval' && (
            <div className="form-group">
              <label className="form-label">Run Every</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="input mono" type="number" min={1} value={intervalValue} onChange={e => setIntervalValue(e.target.value)} style={{ width: 90 }} />
                <button className={`btn btn-sm ${intervalUnit === 'seconds' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIntervalUnit('seconds')}>Seconds</button>
                <button className={`btn btn-sm ${intervalUnit === 'minutes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIntervalUnit('minutes')}>Minutes</button>
              </div>
              <div className="text-xs text-muted mt-4">
                {intervalUnit === 'seconds'
                  ? `Every ${intervalValue}s`
                  : intervalValue >= 60
                    ? `Every ${Math.floor(intervalValue / 60)}h${intervalValue % 60 ? ` ${intervalValue % 60}m` : ''}`
                    : `Every ${intervalValue} minute${intervalValue != 1 ? 's' : ''}`}
              </div>
            </div>
          )}

          {type === 'daily' && (
            <div className="form-group">
              <label className="form-label">Run At (time)</label>
              <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          )}

          {type === 'once' && (
            <div className="form-group">
              <label className="form-label">Run At (date + time)</label>
              <input className="input" type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} />
            </div>
          )}

          <div className="flex items-center justify-between" style={{ padding: '10px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>Enabled</span>
            <label className="toggle">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!name.trim() || !macroId}>
            Save Task
          </button>
        </div>
      </div>
    </div>
  )
}

function describeSchedule(task) {
  if (task.type === 'interval') {
    const v = task.intervalValue || task.intervalMinutes || 60
    const unit = task.intervalUnit || 'minutes'
    if (unit === 'seconds') return `Every ${v}s`
    if (v >= 60) return `Every ${Math.floor(v / 60)}h${v % 60 ? ` ${v % 60}m` : ''}`
    return `Every ${v}m`
  }
  if (task.type === 'daily') return `Daily at ${task.time || '09:00'}`
  if (task.type === 'once') return task.ran ? 'Completed' : `Once at ${task.datetime ? new Date(task.datetime).toLocaleString() : '(unset)'}`
  return ''
}

export default function MacroScheduler() {
  const [tasks, setTasks]   = useState([])
  const [macros, setMacros] = useState([])
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const isElectron = !!window.api

  useEffect(() => { load() }, [])

  const load = async () => {
    if (!isElectron) { setTasks([]); setMacros([]); return }
    const [t, m] = await Promise.all([window.api.scheduler.list(), window.api.macros.list()])
    setTasks(t || [])
    setMacros(m || [])
  }

  const saveTask = async (task) => {
    if (!isElectron) return
    await window.api.scheduler.save(task)
    await load()
    setShowModal(false)
    setEditing(null)
  }

  const deleteTask = async (id) => {
    if (!isElectron) return
    await window.api.scheduler.delete(id)
    await load()
  }

  const toggleTask = async (task) => {
    await saveTask({ ...task, enabled: !task.enabled })
  }

  const getMacroName = (id) => macros.find(m => m.id === id)?.name || 'Unknown macro'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Scheduler</div>
          <div className="page-subtitle">Run macros automatically on a schedule</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }} disabled={macros.length === 0}>
          <Plus size={14} /> New Task
        </button>
      </div>

      {macros.length === 0 && (
        <div className="card mb-16" style={{ borderColor: 'var(--yellow)', background: 'var(--yellow-dim)' }}>
          <div className="flex items-center gap-8">
            <AlertCircle size={16} style={{ color: 'var(--yellow)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>
              Create at least one macro first before scheduling tasks.
            </span>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CalendarClock size={36} className="empty-state-icon" />
            <div className="empty-state-title">No scheduled tasks</div>
            <div className="empty-state-sub">Schedule macros to run automatically at set times or intervals</div>
          </div>
        </div>
      ) : (
        <div className="flex-col gap-8">
          {tasks.map(task => {
            const Icon = TYPE_ICONS[task.type] || Clock
            const isDone = task.type === 'once' && task.ran
            return (
              <div key={task.id} className="card" style={{ padding: '14px 16px', opacity: !task.enabled ? 0.5 : 1 }}>
                <div className="flex items-center gap-12">
                  <div className="list-item-icon" style={{
                    background: isDone ? 'var(--bg-3)' : task.enabled ? 'var(--accent-dim)' : 'var(--bg-3)',
                    color: isDone ? 'var(--text-3)' : task.enabled ? 'var(--accent)' : 'var(--text-3)',
                  }}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1">
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-0)', marginBottom: 4 }}>{task.name}</div>
                    <div className="flex items-center gap-8">
                      <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                        {describeSchedule(task)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>→ {getMacroName(task.macroId)}</span>
                    </div>
                    {task.lastRun && (
                      <div className="text-xs text-muted mt-4">
                        Last run: {new Date(task.lastRun).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-8">
                    {!isDone && (
                      <label className="toggle">
                        <input type="checkbox" checked={task.enabled} onChange={() => toggleTask(task)} />
                        <span className="toggle-track" />
                      </label>
                    )}
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditing(task); setShowModal(true) }}>
                      <CalendarClock size={12} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteTask(task.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card mt-16">
        <div className="card-title mb-8"><CalendarClock size={14} className="card-title-icon" /> How It Works</div>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
          The scheduler checks every 30 seconds for tasks that are due. <strong>Interval</strong> tasks run every N minutes.
          <strong> Daily</strong> tasks run once per day at the specified time. <strong>One-time</strong> tasks fire once at
          the given date/time and then mark themselves as completed. All schedules persist across app restarts.
        </p>
      </div>

      {showModal && (
        <TaskModal
          task={editing}
          macros={macros}
          onSave={saveTask}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
