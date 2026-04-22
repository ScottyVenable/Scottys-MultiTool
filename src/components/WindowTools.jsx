import React, { useState, useEffect } from 'react'
import { AppWindow, LayoutGrid, Maximize2, RefreshCw, ExternalLink } from 'lucide-react'

const SNAP_POSITIONS = [
  { id: 'top-left',     label: 'Top Left',     grid: [0, 0, 1, 1] },
  { id: 'top',          label: 'Top Half',      grid: [0, 0, 2, 1] },
  { id: 'top-right',    label: 'Top Right',     grid: [1, 0, 1, 1] },
  { id: 'left',         label: 'Left Half',     grid: [0, 0, 1, 2] },
  { id: 'full',         label: 'Full Screen',   grid: [0, 0, 2, 2] },
  { id: 'right',        label: 'Right Half',    grid: [1, 0, 1, 2] },
  { id: 'bottom-left',  label: 'Bottom Left',   grid: [0, 1, 1, 1] },
  { id: 'bottom',       label: 'Bottom Half',   grid: [0, 1, 2, 1] },
  { id: 'bottom-right', label: 'Bottom Right',  grid: [1, 1, 1, 1] },
]

function SnapGrid({ onSnap }) {
  const [hover, setHover] = useState(null)

  const hoverSnap = hover ? SNAP_POSITIONS.find(p => p.id === hover) : null

  const isHighlighted = (col, row) => {
    if (!hoverSnap) return false
    const [sc, sr, sw, sh] = hoverSnap.grid
    return col >= sc && col < sc + sw && row >= sr && row < sr + sh
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: 180 }}>
        {SNAP_POSITIONS.filter(p => p.id !== 'full').map(pos => {
          const [col, row] = [pos.grid[0], pos.grid[1]]
          return (
            <button
              key={pos.id}
              title={pos.label}
              style={{
                height: 52,
                borderRadius: 'var(--r)',
                border: `1.5px solid ${hover === pos.id ? 'var(--accent)' : 'var(--border)'}`,
                background: hover === pos.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                cursor: 'pointer',
                transition: 'all 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10.5,
                color: hover === pos.id ? 'var(--accent-h)' : 'var(--text-2)',
                fontWeight: 500,
              }}
              onMouseEnter={() => setHover(pos.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSnap(pos.id)}
            >
              <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>
                  {pos.id === 'top-left' ? '↖' : pos.id === 'top' ? '⬆' : pos.id === 'top-right' ? '↗' :
                   pos.id === 'left' ? '⬅' : pos.id === 'right' ? '➡' :
                   pos.id === 'bottom-left' ? '↙' : pos.id === 'bottom' ? '⬇' : '↘'}
                </div>
                {pos.label.replace(' Half', '').replace(' Screen', '')}
              </div>
            </button>
          )
        })}
      </div>
      <button
        style={{
          marginTop: 4,
          width: 180,
          height: 38,
          borderRadius: 'var(--r)',
          border: `1.5px solid ${hover === 'full' ? 'var(--accent)' : 'var(--border)'}`,
          background: hover === 'full' ? 'var(--accent-dim)' : 'var(--bg-3)',
          cursor: 'pointer',
          transition: 'all 0.1s',
          fontSize: 12,
          fontWeight: 600,
          color: hover === 'full' ? 'var(--accent-h)' : 'var(--text-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
        onMouseEnter={() => setHover('full')}
        onMouseLeave={() => setHover(null)}
        onClick={() => onSnap('full')}
      >
        <Maximize2 size={12} /> Maximize / Full
      </button>
    </div>
  )
}

export default function WindowTools() {
  const [windows, setWindows]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [snapResult, setSnapResult] = useState('')
  const [activating, setActivating] = useState(null)
  const isElectron = !!window.api

  useEffect(() => { refreshWindows() }, [])

  const refreshWindows = async () => {
    setLoading(true)
    if (!isElectron) {
      setWindows(['Notepad', 'Google Chrome', 'Visual Studio Code', 'File Explorer', 'Task Manager'])
      setLoading(false)
      return
    }
    try {
      const list = await window.api.windowTools.list()
      setWindows(list || [])
    } catch {}
    setLoading(false)
  }

  const snap = async (position) => {
    if (!isElectron) { setSnapResult(`Snap: ${position} (demo)`); return }
    const pos = SNAP_POSITIONS.find(p => p.id === position)
    setSnapResult(`Snapping to ${pos?.label}...`)
    await window.api.windowTools.snap(position)
    setTimeout(() => setSnapResult(''), 2000)
  }

  const activate = async (title) => {
    if (!isElectron) return
    setActivating(title)
    await window.api.windowTools.activate(title)
    setTimeout(() => setActivating(null), 1000)
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Window Snapper</div>
          <div className="page-subtitle">Snap the active window to any position or bring any window to focus</div>
        </div>
      </div>

      <div className="grid-2 gap-16" style={{ alignItems: 'start' }}>
        {/* Snap Grid */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><LayoutGrid size={14} className="card-title-icon" /> Snap Active Window</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
            <SnapGrid onSnap={snap} />
            {snapResult && (
              <div style={{ fontSize: 12, color: 'var(--accent-h)', background: 'var(--accent-dim)', padding: '6px 12px', borderRadius: 'var(--r)' }}>
                {snapResult}
              </div>
            )}
            <div className="help-callout" style={{ width: '100%' }}>
              <p style={{ fontSize: 12 }}>
                Hover over a position to preview it, then click to snap the currently focused window.
                Works with any window — browsers, editors, file managers, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Open Windows */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><AppWindow size={14} className="card-title-icon" /> Open Windows ({windows.length})</div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={refreshWindows} disabled={loading}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          {windows.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <AppWindow size={28} className="empty-state-icon" />
              <div className="empty-state-sub">{loading ? 'Scanning windows...' : 'No windows found'}</div>
            </div>
          ) : (
            <div className="list">
              {windows.map((title, i) => (
                <div key={i} className="list-item">
                  <div className="list-item-icon"><AppWindow size={13} /></div>
                  <div className="list-item-body">
                    <div className="list-item-title" style={{ fontSize: 12.5 }}>
                      {title.length > 60 ? title.slice(0, 57) + '…' : title}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, color: activating === title ? 'var(--green)' : undefined }}
                    onClick={() => activate(title)}
                    disabled={!isElectron}
                  >
                    {activating === title ? '✓ Focused' : <><ExternalLink size={11} /> Focus</>}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-muted mt-12">Click <strong>Focus</strong> to bring any window to the front. Refresh to update the list.</div>
        </div>
      </div>

      {/* Keyboard shortcuts reference */}
      <div className="card mt-16">
        <div className="card-title mb-12"><LayoutGrid size={14} className="card-title-icon" /> Windows Snap Shortcuts (Native)</div>
        <div className="grid-3 gap-8">
          {[
            { keys: 'Win + ←', action: 'Snap left half' },
            { keys: 'Win + →', action: 'Snap right half' },
            { keys: 'Win + ↑', action: 'Maximize / top half' },
            { keys: 'Win + ↓', action: 'Minimize / restore' },
            { keys: 'Win + ↑ + ←', action: 'Top-left quarter' },
            { keys: 'Win + ↑ + →', action: 'Top-right quarter' },
          ].map(s => (
            <div key={s.keys} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="kbd" style={{ fontSize: 10.5 }}>{s.keys}</span>
              <span className="text-muted text-sm">{s.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
