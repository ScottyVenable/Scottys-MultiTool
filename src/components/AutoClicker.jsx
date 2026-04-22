import React, { useState, useEffect, useRef } from 'react'
import { MousePointer2, Play, Square, Target, Info, Camera, Eye, EyeOff, Crosshair } from 'lucide-react'

export default function AutoClicker() {
  const [x, setX] = useState(960)
  const [y, setY] = useState(540)
  const [interval, setInterval2] = useState(1000)
  const [maxClicks, setMaxClicks] = useState(0)
  const [running, setRunning] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [livePos, setLivePos] = useState({ x: 0, y: 0 })
  const [captureDelay, setCaptureDelay] = useState(3)
  const [capturing, setCapturing] = useState(false)
  const [captureCountdown, setCaptureCountdown] = useState(0)
  const [liveLook, setLiveLook] = useState(false)
  const countdownRef = useRef(null)
  const captureRef = useRef(null)
  const posRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const isElectron = !!window.api

  // Live mouse position polling
  useEffect(() => {
    if (!isElectron || running) return
    posRef.current = setInterval(async () => {
      try { const p = await window.api.mouse.pos(); setLivePos(p) } catch {}
    }, 100)
    return () => clearInterval(posRef.current)
  }, [isElectron, running])

  useEffect(() => {
    if (!isElectron) return
    window.api.on('autoclicker:tick', ({ count }) => setClickCount(count))
    window.api.on('autoclicker:stopped', () => { setRunning(false); setClickCount(0) })
  }, [])

  // Live look
  useEffect(() => {
    if (!liveLook) {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      return
    }
    const startStream = async () => {
      try {
        const { desktopCapturer } = window.require ? window.require('electron') : {}
        if (!desktopCapturer) return
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sources[0].id, minWidth: 1280, maxWidth: 1920 } }
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (e) { console.error('Live look error:', e); setLiveLook(false) }
    }
    startStream()
    return () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null } }
  }, [liveLook])

  const capturePosition = () => {
    if (capturing) return
    setCapturing(true)
    setCaptureCountdown(captureDelay)
    let c = captureDelay
    captureRef.current = setInterval(async () => {
      c--
      setCaptureCountdown(c)
      if (c <= 0) {
        clearInterval(captureRef.current)
        setCapturing(false)
        try {
          const p = await window.api.mouse.pos()
          setX(p.x); setY(p.y)
        } catch {}
        setCaptureCountdown(0)
      }
    }, 1000)
  }

  const start = async () => {
    if (!isElectron) { alert('Auto-clicker requires Electron'); return }
    setCountdown(3)
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current)
          setRunning(true)
          setClickCount(0)
          window.api.autoClicker.start({ x: parseInt(x), y: parseInt(y), interval: interval, max: maxClicks })
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const stop = async () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); setCountdown(0) }
    if (!isElectron) return
    await window.api.autoClicker.stop()
    setRunning(false)
  }

  const progressPct = maxClicks > 0 ? Math.min((clickCount / maxClicks) * 100, 100) : 0

  // Live look scale
  const liveW = 400, liveH = 225

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Auto Clicker</div>
          <div className="page-subtitle">Automate mouse clicks at a specific screen position</div>
        </div>
      </div>

      {/* Live mouse position bar */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--mono)', fontSize: 13 }}>
        <Crosshair size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-muted">Mouse:</span>
        <strong style={{ color: 'var(--text-0)', minWidth: 80 }}>X: {livePos.x}</strong>
        <strong style={{ color: 'var(--text-0)', minWidth: 80 }}>Y: {livePos.y}</strong>
        {!isElectron && <span className="text-muted text-xs">(requires Electron)</span>}
      </div>

      <div className="grid-2 gap-16" style={{ alignItems: 'start' }}>
        <div className="flex-col gap-16">
          {/* Position */}
          <div className="card">
            <div className="card-title mb-16"><Target size={14} className="card-title-icon" /> Click Position</div>
            <div className="grid-2 gap-12">
              <div className="form-group">
                <label className="form-label">X Coordinate</label>
                <input className="input mono" type="number" value={x} onChange={e => setX(e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Y Coordinate</label>
                <input className="input mono" type="number" value={y} onChange={e => setY(e.target.value)} min={0} />
              </div>
            </div>

            {/* Capture from mouse */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
              <select className="input" style={{ width: 120 }} value={captureDelay} onChange={e => setCaptureDelay(parseInt(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}s delay</option>)}
              </select>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={capturePosition} disabled={capturing}>
                <Camera size={14} />
                {capturing ? `Capturing in ${captureCountdown}s…` : 'Capture from Mouse'}
              </button>
            </div>
            <div className="text-xs text-muted mt-8">Move your mouse to the target after clicking Capture.</div>
          </div>

          {/* Timing */}
          <div className="card">
            <div className="card-title mb-16"><MousePointer2 size={14} className="card-title-icon" /> Timing</div>
            <div className="form-group mb-16">
              <label className="form-label">Click Interval</label>
              <div className="slider-wrap">
                <input type="range" min={50} max={10000} step={50} value={interval} onChange={e => setInterval2(parseInt(e.target.value))} style={{ flex: 1 }} />
                <span className="slider-value">{interval >= 1000 ? `${(interval/1000).toFixed(1)}s` : `${interval}ms`}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Max Clicks (0 = unlimited)</label>
              <div className="slider-wrap">
                <input type="range" min={0} max={500} step={1} value={maxClicks} onChange={e => setMaxClicks(parseInt(e.target.value))} style={{ flex: 1 }} />
                <span className="slider-value">{maxClicks === 0 ? '∞' : maxClicks}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-16">
          {/* Status & Control */}
          <div className="card">
            <div className="card-title mb-16"><MousePointer2 size={14} className="card-title-icon" /> Control</div>
            <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--r-lg)', padding: '20px', textAlign: 'center' }}>
              {countdown > 0 ? (
                <>
                  <div style={{ fontSize: 48, fontWeight: 200, color: 'var(--yellow)', fontFamily: 'var(--mono)' }}>{countdown}</div>
                  <div className="text-muted text-sm">Starting in...</div>
                </>
              ) : running ? (
                <>
                  <div style={{ fontSize: 48, fontWeight: 200, color: 'var(--green)', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>{clickCount}</div>
                  <div className="text-muted text-sm">Clicks completed</div>
                  {maxClicks > 0 && (
                    <div className="mt-12">
                      <div className="progress-bar" style={{ height: 8 }}>
                        <div className="progress-fill green" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="text-xs text-muted mt-8">{clickCount} / {maxClicks}</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, color: 'var(--text-3)' }}><MousePointer2 size={36} style={{ margin: '0 auto' }} /></div>
                  <div className="text-muted text-sm mt-8">Ready to click</div>
                  <div className="text-xs text-muted mt-4">Position: ({x}, {y}) · {interval >= 1000 ? `${(interval/1000).toFixed(1)}s` : `${interval}ms`} interval</div>
                </>
              )}
            </div>
            <div className="flex gap-8 mt-12">
              {!running && countdown === 0 ? (
                <button className="btn btn-success btn-lg w-full" onClick={start}>
                  <Play size={16} /> Start (3s countdown)
                </button>
              ) : (
                <button className="btn btn-danger btn-lg w-full" onClick={stop}>
                  <Square size={16} /> Stop
                </button>
              )}
            </div>
          </div>

          {/* Live Look */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: liveLook ? 12 : 0 }}>
              <div className="card-title" style={{ margin: 0 }}><Eye size={14} className="card-title-icon" /> Live Look</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setLiveLook(v => !v)}>
                {liveLook ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
              </button>
            </div>
            {liveLook && (
              <div style={{ position: 'relative', width: liveW, height: liveH, background: '#000', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {/* SVG crosshair overlay */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <circle
                    cx={`${(x / (window.screen?.width || 1920)) * 100}%`}
                    cy={`${(y / (window.screen?.height || 1080)) * 100}%`}
                    r={8} fill="none" stroke="#f00" strokeWidth={2}
                  />
                  <line
                    x1={`${(x / (window.screen?.width || 1920)) * 100}%`} y1="0"
                    x2={`${(x / (window.screen?.width || 1920)) * 100}%`} y2="100%"
                    stroke="rgba(255,0,0,0.4)" strokeWidth={1}
                  />
                  <line
                    x1="0" y1={`${(y / (window.screen?.height || 1080)) * 100}%`}
                    x2="100%" y2={`${(y / (window.screen?.height || 1080)) * 100}%`}
                    stroke="rgba(255,0,0,0.4)" strokeWidth={1}
                  />
                </svg>
              </div>
            )}
            {!liveLook && <div className="text-xs text-muted mt-4">Show a live screen preview with target crosshair overlay.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
