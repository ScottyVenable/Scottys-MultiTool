import React, { useEffect, useState } from 'react'
import { Server, Bot, Monitor, Activity } from 'lucide-react'

// Fixed bottom status bar. Shows a colored pill for the companion server plus
// lightweight indicators for AI connection and CDP state so users can see at
// a glance whether everything is wired up. Kept deliberately small — one row,
// monospaced, no interactive chrome beyond the server pill's start/stop menu.

const STATE_META = {
  idle:       { label: 'offline',    color: 'var(--red)' },
  connecting: { label: 'connecting', color: 'var(--yellow)' },
  connected:  { label: 'online',     color: 'var(--green)' },
  error:      { label: 'error',      color: 'var(--red)' },
}

export default function StatusBar() {
  const [server, setServer] = useState({ state: 'idle', port: 4455 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [ai, setAi] = useState({ state: 'idle' })
  const [cdp, setCdp] = useState({ connected: false })

  useEffect(() => {
    const api = window.api
    if (!api?.server) return
    let off = null
    api.server.status().then((s) => s && setServer(s))
    if (api.on) off = api.on('server:state', (s) => setServer(s))
    return () => { if (typeof off === 'function') off() }
  }, [])

  // AI connection: listen for a global custom event the AI client dispatches.
  useEffect(() => {
    const h = (e) => setAi(e.detail || { state: 'idle' })
    window.addEventListener('ai:state', h)
    return () => window.removeEventListener('ai:state', h)
  }, [])

  // CDP state: similarly event-driven so we don't poll the main process.
  useEffect(() => {
    const h = (e) => setCdp(e.detail || { connected: false })
    window.addEventListener('cdp:state', h)
    return () => window.removeEventListener('cdp:state', h)
  }, [])

  const meta = STATE_META[server.state] || STATE_META.idle

  async function toggleServer() {
    setMenuOpen(false)
    if (server.state === 'connected' || server.state === 'connecting') {
      await window.api?.server?.stop?.()
    } else {
      await window.api?.server?.start?.()
    }
  }

  return (
    <div className="status-bar" role="status">
      <div className="status-left">
        <button
          type="button"
          className="status-pill"
          onClick={() => setMenuOpen((v) => !v)}
          title={server.error ? `server: ${server.error}` : `server: ${meta.label} (port ${server.port})`}
        >
          <Server size={12} />
          <span className="status-dot" style={{ background: meta.color }} />
          <span className="status-label">server {meta.label}</span>
        </button>
        {menuOpen && (
          <div className="status-menu" onMouseLeave={() => setMenuOpen(false)}>
            <div className="status-menu-row"><span>port</span><b>{server.port}</b></div>
            {server.info?.uptime != null && (
              <div className="status-menu-row"><span>uptime</span><b>{Math.round(server.info.uptime)}s</b></div>
            )}
            {server.error && <div className="status-menu-row err">{server.error}</div>}
            <button className="status-menu-btn" onClick={toggleServer}>
              {server.state === 'connected' || server.state === 'connecting' ? 'Stop server' : 'Start server'}
            </button>
          </div>
        )}
      </div>

      <div className="status-right">
        <span
          className={`status-ind${ai.state === 'generating' ? ' generating' : ''}`}
          title={`AI: ${ai.state || 'idle'}`}
        >
          <Bot size={12} />
          <span
            className="status-dot"
            style={{
              background:
                ai.state === 'generating' ? 'var(--accent)'
                : ai.state === 'ready' ? 'var(--green)'
                : ai.state === 'error' ? 'var(--red)'
                : 'var(--text-3)',
            }}
          />
          {ai.state === 'generating' && <span className="status-ai-label">generating…</span>}
        </span>
        <span className="status-ind" title={`CDP: ${cdp.connected ? 'attached' : 'detached'}`}>
          <Monitor size={12} />
          <span className="status-dot" style={{ background: cdp.connected ? 'var(--green)' : 'var(--text-3)' }} />
        </span>
        <span className="status-ind" title="Activity">
          <Activity size={12} />
        </span>
      </div>
    </div>
  )
}
