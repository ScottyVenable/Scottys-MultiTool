import React, { useState, useEffect } from 'react'
import { Smartphone, Wifi, Play, ToggleLeft, ToggleRight, Copy, RefreshCw, Globe } from 'lucide-react'

export default function MobileRemote() {
  const [status, setStatus] = useState({ running: false, ip: '...', port: 8765 })
  const [copied, setCopied] = useState(false)
  const [macros, setMacros] = useState([])
  const isElectron = !!window.api

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    if (!isElectron) {
      setStatus({ running: false, ip: '192.168.1.100', port: 8765 })
      return
    }
    const [s, m] = await Promise.all([window.api.mobile.status(), window.api.macros.list()])
    setStatus(s)
    setMacros(m)
  }

  const toggle = async () => {
    if (!isElectron) return
    if (status.running) {
      await window.api.mobile.stop()
    } else {
      const result = await window.api.mobile.start(status.port)
      setStatus(s => ({ ...s, ...result, running: true }))
    }
    await load()
  }

  const mobileUrl = `http://${status.ip}:${status.port}`

  const copyUrl = () => {
    navigator.clipboard?.writeText(mobileUrl)
    if (isElectron) window.api.clipboard.write(mobileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Mobile Remote</div>
          <div className="page-subtitle">Control MacroBot from your phone on the same WiFi network</div>
        </div>
      </div>

      <div className="grid-2 gap-16" style={{ alignItems: 'start' }}>
        {/* Connection */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Wifi size={14} className="card-title-icon" /> Local Server</div>
            <div className="flex items-center gap-6">
              {status.running && <><div className="dot-live" /><span className="text-sm text-muted">Running</span></>}
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {/* Visual phone icon */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: status.running ? 'var(--green-dim)' : 'var(--bg-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              border: `2px solid ${status.running ? 'var(--green)' : 'var(--border)'}`,
              transition: 'all 0.3s',
            }}>
              <Smartphone size={32} style={{ color: status.running ? 'var(--green)' : 'var(--text-3)' }} />
            </div>

            <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text-0)', marginBottom: 6 }}>
              {mobileUrl}
            </div>
            <div className="text-muted text-sm mb-16">
              Open this URL on your phone (same WiFi required)
            </div>

            <div className="flex gap-8" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={copyUrl}>
                <Copy size={12} /> {copied ? 'Copied!' : 'Copy URL'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={load}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          <div className="divider" />

          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-0)' }}>Mobile Server</div>
              <div className="text-sm text-muted">Serve remote control web app on your local network</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={status.running} onChange={toggle} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

        {/* Info & Instructions */}
        <div className="flex-col gap-16">
          <div className="card">
            <div className="card-title mb-12"><Globe size={14} className="card-title-icon" /> How It Works</div>
            <div className="flex-col gap-10">
              {[
                { num: '1', title: 'Enable Server', sub: 'Toggle the switch to start the local web server' },
                { num: '2', title: 'Connect Phone', sub: 'Open the URL on your phone\'s browser while on the same WiFi' },
                { num: '3', title: 'Run Macros', sub: 'Tap any macro to run it on your desktop remotely' },
                { num: '4', title: 'Monitor Status', sub: 'See real-time status, CPU, and memory from your phone' },
              ].map(s => (
                <div key={s.num} className="flex items-start gap-10">
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent-h)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {s.num}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-0)' }}>{s.title}</div>
                    <div className="text-sm text-muted">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title mb-12"><Play size={14} className="card-title-icon" /> Available Macros ({macros.length})</div>
            {macros.length === 0 ? (
              <div className="text-sm text-muted">No macros created yet. Create macros in the Macros section to control them from your phone.</div>
            ) : (
              <div className="flex-col gap-4">
                {macros.slice(0, 8).map(m => (
                  <div key={m.id} className="flex items-center gap-8 justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12.5 }}>{m.name}</span>
                    <span className="badge badge-accent">{m.steps?.length || 0} steps</span>
                  </div>
                ))}
                {macros.length > 8 && <div className="text-xs text-muted">+{macros.length - 8} more</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
