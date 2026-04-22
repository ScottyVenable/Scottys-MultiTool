import React, { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX, Volume1, Headphones } from 'lucide-react'

const PRESETS = [0, 10, 25, 50, 75, 100]

export default function VolumeControl() {
  const [volume, setVolume]   = useState(50)
  const [muted, setMuted]     = useState(false)
  const [device, setDevice]   = useState('')
  const [setting, setSetting] = useState(false)
  const [loaded, setLoaded]   = useState(false)
  const applyTimer = useRef(null)
  const lastApplied = useRef(null)
  const isElectron = !!window.api

  // Load initial state — retry once if it doesn't return a number first time
  // (WASAPI script can be slow on cold start).
  useEffect(() => {
    if (!isElectron) { setLoaded(true); return }
    let cancelled = false
    const fetchAll = async () => {
      try {
        const [info, lvl] = await Promise.all([
          window.api.volume.get().catch(() => null),
          window.api.volume.getLevel().catch(() => null),
        ])
        if (cancelled) return
        if (info?.name) setDevice(info.name)
        if (typeof lvl === 'number' && isFinite(lvl)) {
          setVolume(Math.max(0, Math.min(100, Math.round(lvl))))
          setLoaded(true)
          return true
        }
      } catch {}
      return false
    }
    ;(async () => {
      const ok = await fetchAll()
      if (!ok && !cancelled) {
        // Retry once after 500ms (cold PowerShell start).
        setTimeout(fetchAll, 500)
        setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Apply volume to system — debounced so rapid slider drags coalesce into
  // one IPC call per ~60ms (roughly one frame). We also skip duplicates.
  const applyDebounced = (level) => {
    if (!isElectron) return
    if (applyTimer.current) clearTimeout(applyTimer.current)
    applyTimer.current = setTimeout(async () => {
      if (lastApplied.current === level) return
      lastApplied.current = level
      setSetting(true)
      await window.api.volume.set(level).catch(() => {})
      setSetting(false)
    }, 60)
  }

  const onSliderChange = (level) => {
    setVolume(level)
    if (muted && level > 0) setMuted(false)
    applyDebounced(level)
  }

  const applyNow = (level) => {
    setVolume(level)
    if (!isElectron) return
    if (applyTimer.current) clearTimeout(applyTimer.current)
    lastApplied.current = level
    window.api.volume.set(level).catch(() => {})
  }

  const toggleMute = async () => {
    const next = !muted
    setMuted(next)
    if (!isElectron) return
    await window.api.volume.mute().catch(() => {})
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 40 ? Volume1 : Volume2
  const arcColor = muted ? 'var(--text-3)' : volume > 80 ? 'var(--red)' : volume > 50 ? 'var(--yellow)' : 'var(--green)'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Volume Control</div>
          <div className="page-subtitle">Quickly adjust system volume and mute</div>
        </div>
      </div>

      {/* Big volume display */}
      <div className="card mb-16" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          {/* Circular indicator */}
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-3)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke={arcColor}
                strokeWidth="8"
                strokeDasharray={`${(muted ? 0 : volume) / 100 * 314} 314`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.15s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <VolumeIcon size={20} style={{ color: arcColor, transition: 'color 0.3s' }} />
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: muted ? 'var(--text-3)' : 'var(--text-0)' }}>
                {muted ? 'Mute' : `${volume}%`}
              </span>
            </div>
          </div>

          {/* Slider — live application via onChange (debounced) */}
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div className="slider-wrap">
              <button
                className={`btn btn-sm ${muted ? 'btn-danger' : 'btn-ghost'}`}
                onClick={toggleMute}
                title={muted ? 'Unmute' : 'Mute'}
              >
                <VolumeX size={13} />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                style={{ accentColor: arcColor }}
                onChange={e => onSliderChange(parseInt(e.target.value))}
                disabled={muted}
              />
              <span className="slider-value">{muted ? '—' : `${volume}%`}</span>
            </div>
          </div>

          {!loaded && isElectron && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Reading current volume…</div>
          )}
          {setting && loaded && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Applying…</div>
          )}
        </div>
      </div>

      {/* Presets */}
      <div className="card mb-16">
        <div className="card-title mb-12"><Volume2 size={14} className="card-title-icon" /> Quick Presets</div>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button
              key={p}
              className={`btn ${volume === p && !muted ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minWidth: 64 }}
              onClick={() => { setMuted(false); applyNow(p) }}
            >
              {p === 0 ? <><VolumeX size={12} /> Mute</> : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Device info */}
      {device && (
        <div className="card">
          <div className="card-title mb-8"><Headphones size={14} className="card-title-icon" /> Audio Device</div>
          <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{device}</div>
          <div className="text-xs text-muted mt-4">Volume controls affect the system default audio device.</div>
        </div>
      )}

      {!isElectron && (
        <div className="card mt-16" style={{ borderColor: 'var(--yellow)', background: 'var(--yellow-dim)' }}>
          <div style={{ fontSize: 13, color: 'var(--yellow)' }}>
            Preview mode — volume changes require the Electron app to take effect.
          </div>
        </div>
      )}
    </div>
  )
}
