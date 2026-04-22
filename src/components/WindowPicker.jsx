import React, { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, Monitor, X } from 'lucide-react'

/**
 * Reusable window picker.
 *
 * Value shape (what `onChange` receives and `value` contains):
 *   null | { hwnd, pid, processName, titlePattern, className, title }
 *
 * `titlePattern` is the substring used for re-resolve when the stored HWND
 * goes stale between runs. We default it to the exact title the user picked;
 * users can override it in the free-text input if they want fuzzier matching.
 */
export default function WindowPicker({ value, onChange, compact = false }) {
  const [windows, setWindows] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const isElectron = !!window.api

  const refresh = async () => {
    if (!isElectron) return
    setLoading(true)
    try {
      const list = await window.api.windowTools.listDetailed()
      setWindows(Array.isArray(list) ? list : [])
    } catch {
      setWindows([])
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return windows
    return windows.filter(w =>
      (w.title || '').toLowerCase().includes(q) ||
      (w.processName || '').toLowerCase().includes(q) ||
      (w.className || '').toLowerCase().includes(q)
    )
  }, [windows, query])

  const pick = (w) => {
    onChange({
      hwnd: w.hwnd,
      pid: w.pid,
      processName: w.processName || '',
      className: w.className || '',
      title: w.title || '',
      // Default titlePattern to processName so later title changes don't break re-resolve.
      titlePattern: w.processName || w.title || '',
    })
    setOpen(false)
  }

  const clear = () => onChange(null)

  return (
    <div className="window-picker">
      <div className="flex gap-8 items-center">
        <div className="input flex-1 flex items-center gap-8" style={{ cursor: 'pointer', padding: '6px 10px' }} onClick={() => setOpen(o => !o)}>
          <Monitor size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <div className="flex-1" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value ? (
              <span>
                <strong>{value.processName || '(process)'}</strong>
                {value.title ? ` — ${value.title}` : ''}
              </span>
            ) : (
              <span style={{ color: 'var(--text-3)' }}>Pick a target window…</span>
            )}
          </div>
          {value && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); clear() }} title="Clear"><X size={10} /></button>
          )}
        </div>
        <button className="btn btn-secondary btn-sm btn-icon" onClick={refresh} disabled={loading} title="Refresh window list">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {open && (
        <div className="card window-picker-panel" style={{ padding: 0, marginTop: 6, maxHeight: compact ? 240 : 340, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={12} style={{ color: 'var(--text-3)' }} />
            <input className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by process, title, or class…" autoFocus />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div className="text-muted text-sm" style={{ padding: 16, textAlign: 'center' }}>
                {loading ? 'Loading…' : 'No windows match.'}
              </div>
            ) : (
              filtered.map(w => (
                <button
                  key={`${w.hwnd}-${w.pid}`}
                  className="window-picker-row"
                  onClick={() => pick(w)}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: 8,
                    padding: '8px 12px', border: 'none', background: 'transparent',
                    borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Monitor size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  <div className="flex-1" style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong>{w.processName || '(unknown)'}</strong>
                      <span style={{ color: 'var(--text-2)' }}> — {w.title}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--mono, monospace)', marginTop: 2 }}>
                      class: {w.className || '?'} · pid: {w.pid} · hwnd: {w.hwnd}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
