import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Check, X, Info, AlertTriangle, AlertCircle } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = { success: Check, info: Info, warning: AlertTriangle, error: AlertCircle }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((opts) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const t = { id, type: opts.type || 'info', title: opts.title || '', message: opts.message || '', duration: opts.duration ?? 4500 }
    setToasts(prev => [...prev, t])
    if (t.duration > 0) setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), t.duration)
    return id
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  // Bridge OS notifications → in-app toasts
  useEffect(() => {
    if (!window.api?.on) return
    window.api.on('toast:push', (payload) => show(payload))
    window.api.on('reminder:due', (r) => show({ type: 'info', title: 'Reminder', message: r?.title || 'Reminder due' }))
  }, [show])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => {
          const Icon = ICONS[t.type] || Info
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={14} className="toast-icon" />
              <div className="toast-body">
                {t.title && <div className="toast-title">{t.title}</div>}
                {t.message && <div className="toast-message">{t.message}</div>}
              </div>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={12} /></button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { show: () => {}, dismiss: () => {} }
  return ctx
}
