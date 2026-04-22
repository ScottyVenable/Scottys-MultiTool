import React, { useState, useEffect, useRef } from 'react'
import { Timer, Play, Pause, Square, RotateCcw, Coffee, Brain, Settings } from 'lucide-react'

const PRESETS = [
  { label: 'Pomodoro', work: 25, shortBreak: 5, longBreak: 15 },
  { label: 'Short', work: 15, shortBreak: 3, longBreak: 10 },
  { label: 'Deep Work', work: 50, shortBreak: 10, longBreak: 20 },
  { label: 'Quick', work: 5, shortBreak: 1, longBreak: 5 },
]

export default function FocusTimer() {
  const [workMin, setWorkMin] = useState(25)
  const [shortBreak, setShortBreak] = useState(5)
  const [longBreak, setLongBreak] = useState(15)
  const [sessionsUntilLong, setSessionsUntilLong] = useState(4)
  const [phase, setPhase] = useState('work') // 'work' | 'short' | 'long'
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessionsComplete, setSessionsComplete] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const timerRef = useRef(null)

  const totalSeconds = phase === 'work' ? workMin * 60 : phase === 'short' ? shortBreak * 60 : longBreak * 60
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(timerRef.current)
            setRunning(false)
            handlePhaseEnd()
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [running])

  const handlePhaseEnd = () => {
    if (phase === 'work') {
      const newCount = sessionsComplete + 1
      setSessionsComplete(newCount)
      if (newCount % sessionsUntilLong === 0) {
        setPhase('long')
        setSeconds(longBreak * 60)
      } else {
        setPhase('short')
        setSeconds(shortBreak * 60)
      }
    } else {
      setPhase('work')
      setSeconds(workMin * 60)
    }
  }

  const toggleRun = () => setRunning(r => !r)

  const reset = () => {
    setRunning(false)
    const s = phase === 'work' ? workMin * 60 : phase === 'short' ? shortBreak * 60 : longBreak * 60
    setSeconds(s)
  }

  const switchPhase = (p) => {
    setRunning(false)
    setPhase(p)
    setSeconds(p === 'work' ? workMin * 60 : p === 'short' ? shortBreak * 60 : longBreak * 60)
  }

  const applyPreset = (preset) => {
    setRunning(false)
    setWorkMin(preset.work)
    setShortBreak(preset.shortBreak)
    setLongBreak(preset.longBreak)
    setSeconds(preset.work * 60)
    setPhase('work')
  }

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const phaseColor = phase === 'work' ? 'var(--accent)' : phase === 'short' ? 'var(--green)' : 'var(--blue)'
  const phaseLabel = phase === 'work' ? 'Focus Time' : phase === 'short' ? 'Short Break' : 'Long Break'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Focus Timer</div>
          <div className="page-subtitle">Pomodoro-style timer to maintain productive work sessions</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={13} /> Settings
        </button>
      </div>

      <div className="grid-2 gap-16" style={{ alignItems: 'start' }}>
        {/* Timer */}
        <div className="card text-center" style={{ padding: 32 }}>
          {/* Phase tabs */}
          <div className="flex gap-6 mb-24" style={{ justifyContent: 'center' }}>
            {[
              { id: 'work', label: 'Focus', icon: Brain },
              { id: 'short', label: 'Short Break', icon: Coffee },
              { id: 'long', label: 'Long Break', icon: Coffee },
            ].map(p => {
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  className={`btn btn-sm ${phase === p.id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => switchPhase(p.id)}
                >
                  <Icon size={12} /> {p.label}
                </button>
              )
            })}
          </div>

          {/* Progress Ring */}
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 24px' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r="88" fill="none" stroke="var(--bg-3)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="88"
                fill="none"
                stroke={phaseColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 200, fontFamily: 'var(--mono)', color: 'var(--text-0)', letterSpacing: -2 }}>
                {formatTime(seconds)}
              </div>
              <div style={{ fontSize: 12, color: phaseColor, fontWeight: 600 }}>{phaseLabel}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-8" style={{ justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-icon" onClick={reset} data-tip="Reset">
              <RotateCcw size={15} />
            </button>
            <button
              className="btn btn-lg"
              style={{ background: phaseColor, color: 'white', padding: '10px 32px' }}
              onClick={toggleRun}
            >
              {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {seconds === totalSeconds ? 'Start' : 'Resume'}</>}
            </button>
          </div>

          {/* Session counter */}
          <div className="flex gap-6 mt-20" style={{ justifyContent: 'center' }}>
            {Array.from({ length: sessionsUntilLong }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: i < (sessionsComplete % sessionsUntilLong) ? 'var(--accent)' : 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <div className="text-xs text-muted mt-8">
            {sessionsComplete} sessions complete · {sessionsUntilLong - (sessionsComplete % sessionsUntilLong)} until long break
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex-col gap-16">
          {/* Presets */}
          <div className="card">
            <div className="card-title mb-12"><Timer size={14} className="card-title-icon" /> Presets</div>
            <div className="flex-col gap-6">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  className="btn btn-secondary w-full"
                  style={{ justifyContent: 'space-between' }}
                  onClick={() => applyPreset(p)}
                >
                  <span>{p.label}</span>
                  <span className="text-muted text-sm">{p.work}m / {p.shortBreak}m / {p.longBreak}m</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="card animate-in">
              <div className="card-title mb-12"><Settings size={14} className="card-title-icon" /> Timer Settings</div>
              <div className="flex-col gap-12">
                {[
                  { label: 'Focus (min)', value: workMin, set: setWorkMin, min: 1, max: 120 },
                  { label: 'Short break (min)', value: shortBreak, set: setShortBreak, min: 1, max: 30 },
                  { label: 'Long break (min)', value: longBreak, set: setLongBreak, min: 1, max: 60 },
                  { label: 'Sessions until long break', value: sessionsUntilLong, set: setSessionsUntilLong, min: 1, max: 10 },
                ].map(({ label, value, set, min, max }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="form-label">{label}</span>
                      <span className="slider-value">{value}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={value}
                      onChange={e => { set(parseInt(e.target.value)); if (!running) reset() }}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats today */}
          <div className="card">
            <div className="card-title mb-12"><Brain size={14} className="card-title-icon" /> Today</div>
            <div className="stat-grid">
              <div>
                <div className="stat-label">Sessions</div>
                <div className="stat-value">{sessionsComplete}</div>
              </div>
              <div>
                <div className="stat-label">Focus time</div>
                <div className="stat-value">{Math.floor(sessionsComplete * workMin / 60)}h {(sessionsComplete * workMin) % 60}m</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
