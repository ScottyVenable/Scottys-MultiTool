import React, { useState, useRef, useEffect } from 'react'
import { Bell, Check, X, Trash2, CheckCheck, ListTodo, Cpu, Users } from 'lucide-react'
import { useNotifications } from './NotificationsContext'

const ICON = { task: ListTodo, system: Cpu, social: Users }

function formatTime(ts) {
  const d = new Date(ts)
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleString()
}

export default function NotificationsCenter({ onNavigate }) {
  const { items, unread, markRead, markAllRead, remove, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const ref = useRef(null)

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const visible = filter === 'all' ? items : items.filter(n => n.category === filter)

  const click = (n) => {
    markRead(n.id)
    if (n.route && onNavigate) { onNavigate(n.route); setOpen(false) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="win-btn" onClick={() => setOpen(o => !o)} title="Notifications" style={{ position: 'relative' }}>
        <Bell size={12} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 14, height: 14, borderRadius: 7,
            background: 'var(--red)', color: 'white',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <span style={{ fontWeight: 600, fontSize: 12 }}>Notifications</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={markAllRead} disabled={unread === 0} title="Mark all read"><CheckCheck size={11} /></button>
              <button className="btn btn-ghost btn-sm" onClick={clearAll} disabled={items.length === 0} title="Clear all"><Trash2 size={11} /></button>
            </div>
          </div>
          <div className="notif-filters">
            {['all', 'task', 'system', 'social'].map(f => (
              <button key={f} className={`notif-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="notif-list">
            {visible.length === 0 && (
              <div className="notif-empty">
                <Bell size={22} style={{ color: 'var(--text-3)', marginBottom: 6 }} />
                <div>You're all caught up.</div>
              </div>
            )}
            {visible.map(n => {
              const Icon = ICON[n.category] || Cpu
              return (
                <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => click(n)}>
                  <div className="notif-icon"><Icon size={12} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notif-title">{n.title}</div>
                    {n.body && <div className="notif-body">{n.body}</div>}
                    <div className="notif-time">{formatTime(n.ts)}</div>
                  </div>
                  <div className="notif-actions" onClick={e => e.stopPropagation()}>
                    {!n.read && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => markRead(n.id)} title="Mark read"><Check size={10} /></button>}
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(n.id)} title="Dismiss"><X size={10} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
