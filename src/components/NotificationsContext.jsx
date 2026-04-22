import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

// Local-only notifications center. Backed by window.api.store when available,
// falls back to localStorage in the browser. Kept deliberately tiny: the whole
// surface is a list of records with a timestamp, a read flag, and an optional
// source route so the user can jump to wherever the notification came from.
const NotificationsContext = createContext(null)
const KEY = 'notifications'
const MAX = 200

const loadFrom = async () => {
  try {
    if (window.api?.store?.get) {
      const v = await window.api.store.get(KEY)
      if (Array.isArray(v)) return v
    }
  } catch {}
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
const saveTo = async (list) => {
  try {
    if (window.api?.store?.set) return void window.api.store.set(KEY, list)
  } catch {}
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => { loadFrom().then(v => { setItems(v); setReady(true) }) }, [])
  useEffect(() => { if (ready) saveTo(items) }, [items, ready])

  // Wire up live feeds from the Electron main process so reminders and
  // scheduler activity show up in the center without each component having
  // to know about notifications.
  useEffect(() => {
    if (!window.api?.on) return
    const onReminder = (r) => {
      if (!r) return
      setItems(list => [{
        id: Date.now() + Math.random(),
        ts: Date.now(),
        category: 'task',
        title: r.title || 'Reminder',
        body: r.description || '',
        route: 'reminders',
        read: false,
      }, ...list].slice(0, MAX))
    }
    const onScheduler = (payload) => {
      setItems(list => [{
        id: Date.now() + Math.random(),
        ts: Date.now(),
        category: 'system',
        title: 'Scheduled task ran',
        body: `Task ${payload?.id || ''} fired at ${new Date(payload?.time || Date.now()).toLocaleTimeString()}`,
        route: 'scheduler',
        read: false,
      }, ...list].slice(0, MAX))
    }
    window.api.on('reminder:due', onReminder)
    window.api.on('scheduler:ran', onScheduler)
  }, [])

  const push = useCallback((entry) => {
    const rec = {
      id: Date.now() + Math.random(),
      ts: Date.now(),
      category: entry.category || 'system', // 'task' | 'system' | 'social'
      title: entry.title || '(untitled)',
      body: entry.body || '',
      route: entry.route || null,
      read: false,
    }
    setItems(list => [rec, ...list].slice(0, MAX))
    return rec
  }, [])
  const markRead = useCallback((id) => setItems(list => list.map(n => n.id === id ? { ...n, read: true } : n)), [])
  const markAllRead = useCallback(() => setItems(list => list.map(n => ({ ...n, read: true }))), [])
  const remove = useCallback((id) => setItems(list => list.filter(n => n.id !== id)), [])
  const clearAll = useCallback(() => setItems([]), [])
  const unread = items.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{ items, unread, push, markRead, markAllRead, remove, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
