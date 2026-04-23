import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Users, Play, Pause, SkipForward, LogOut, Plus, RefreshCw, Timer } from 'lucide-react'
import { useFriends } from './FriendsContext'
import { useCurrency } from './CurrencyContext'
import { useToast } from './Toast'

const BASE = 'http://localhost:4455'

function fmt(seconds) {
  const s = Math.max(0, Math.round(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function useRoomTimer(room) {
  const [display, setDisplay] = useState('--:--')
  const [fraction, setFraction] = useState(0)

  useEffect(() => {
    if (!room || !room.startTs || room.phase === 'waiting') { setDisplay('--:--'); setFraction(0); return }
    const totalMs = (room.phase === 'work' ? room.workMin : room.breakMin) * 60_000

    function tick() {
      const elapsed = room.pausedAt
        ? (room.pausedAt - room.startTs)
        : (Date.now() - room.startTs)
      const remaining = Math.max(0, totalMs - elapsed)
      setDisplay(fmt(remaining / 1000))
      setFraction(Math.min(1, elapsed / totalMs))
    }

    tick()
    if (room.pausedAt) return
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [room])

  return { display, fraction }
}

function RoomLobby({ rooms, myId, onCreate, onJoin, loading }) {
  const [name, setName] = useState('')
  const [workMin, setWorkMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [creating, setCreating] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    await onCreate({ name: name.trim() || undefined, workMin, breakMin })
    setCreating(false)
    setName('')
  }

  return (
    <div className="fwf-lobby">
      <div className="fwf-lobby-head">
        <Timer size={15} /> Focus with Friends
      </div>

      <form className="fwf-create-form" onSubmit={handleCreate}>
        <input className="fwf-input" placeholder="Room name (optional)" value={name} onChange={e => setName(e.target.value)} />
        <div className="fwf-row">
          <label className="fwf-label">Work <input className="fwf-num" type="number" min={1} max={120} value={workMin} onChange={e => setWorkMin(Number(e.target.value))} /> min</label>
          <label className="fwf-label">Break <input className="fwf-num" type="number" min={1} max={60} value={breakMin} onChange={e => setBreakMin(Number(e.target.value))} /> min</label>
        </div>
        <button className="fwf-btn primary" type="submit" disabled={creating || loading}>
          <Plus size={13} /> {creating ? 'Creating…' : 'Create Room'}
        </button>
      </form>

      {rooms.length > 0 && (
        <div className="fwf-room-list">
          <div className="fwf-room-list-label">Open rooms</div>
          {rooms.map(room => (
            <div key={room.id} className="fwf-room-row">
              <div className="fwf-room-info">
                <span className="fwf-room-name">{room.name}</span>
                <span className="fwf-room-meta">{room.members.length} member{room.members.length !== 1 ? 's' : ''} · {room.workMin}m / {room.breakMin}m · {room.phase}</span>
              </div>
              {!room.members.includes(myId) && (
                <button className="fwf-btn small" onClick={() => onJoin(room.id)} disabled={loading}>Join</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoomView({ room, myId, onAction, onLeave }) {
  const { display, fraction } = useRoomTimer(room)
  const toast = useToast()
  const { award } = useCurrency()
  const prevPhase = useRef(room?.phase)
  const isHost = room?.host === myId
  const isPaused = !!room?.pausedAt
  const hasVoted = room?.pauseVotes?.includes(myId)
  const quorum = Math.ceil((room?.members?.length || 1) / 2)

  useEffect(() => {
    if (!room) return
    if (prevPhase.current === 'work' && room.phase === 'break') {
      award('focus_complete', { label: `Focus with friends · ${room.workMin}m` })
      toast?.show?.({ type: 'success', title: 'Work session done', message: 'Break time.' })
    }
    prevPhase.current = room.phase
  }, [room?.phase])

  if (!room) return null

  // Match FocusTimer's visuals: 200px ring, same strokeDasharray math, same
  // phase-colored palette, same big digit font. Keeps the two surfaces visually
  // consistent so users know they behave alike.
  const phase = room.phase === 'waiting' ? 'work' : room.phase
  const phaseColor = phase === 'work' ? 'var(--accent)' : 'var(--green)'
  const phaseLabel = room.phase === 'waiting' ? 'Waiting to start' : phase === 'work' ? 'Focus Time' : 'Break'
  const progressPct = Math.min(100, Math.round(fraction * 100))
  const radius = 88
  const circumference = 2 * Math.PI * radius

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">{room.name}</div>
          <div className="page-subtitle">Shared focus session with {room.members.length} member{room.members.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLeave} data-tip="Leave room">
          <LogOut size={13} /> Leave
        </button>
      </div>

      <div className="grid-2 gap-16" style={{ alignItems: 'start' }}>
        {/* Timer card (mirrors FocusTimer) */}
        <div className="card text-center" style={{ padding: 32 }}>
          {/* Phase tabs (read-only indicator for non-hosts) */}
          <div className="flex gap-6 mb-24" style={{ justifyContent: 'center' }}>
            {[
              { id: 'work', label: 'Focus' },
              { id: 'break', label: 'Break' },
            ].map(p => (
              <button
                key={p.id}
                className={`btn btn-sm ${phase === p.id ? 'btn-primary' : 'btn-ghost'}`}
                disabled={!isHost || room.phase === 'waiting'}
                onClick={() => onAction('phase', { phase: p.id })}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Progress ring */}
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 24px' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--bg-3)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r={radius}
                fill="none"
                stroke={phaseColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${circumference * (1 - progressPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 200, fontFamily: 'var(--mono)', color: 'var(--text-0)', letterSpacing: -2 }}>
                {display}
              </div>
              <div style={{ fontSize: 12, color: phaseColor, fontWeight: 600 }}>{phaseLabel}</div>
              {isPaused && <div style={{ fontSize: 10, color: 'var(--yellow)', marginTop: 4, letterSpacing: '.08em', textTransform: 'uppercase' }}>Paused</div>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-8" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {room.phase === 'waiting' && isHost && (
              <button className="btn btn-lg" style={{ background: phaseColor, color: 'white', padding: '10px 32px' }} onClick={() => onAction('start')}>
                <Play size={16} /> Start
              </button>
            )}
            {room.phase !== 'waiting' && !isPaused && (
              <button className="btn btn-secondary" onClick={() => onAction('pause-vote')} disabled={hasVoted}>
                <Pause size={15} /> {hasVoted ? `Voted (${room.pauseVotes.length}/${quorum})` : `Vote to pause (${room.pauseVotes.length}/${quorum})`}
              </button>
            )}
            {room.phase !== 'waiting' && isPaused && isHost && (
              <button className="btn btn-lg" style={{ background: phaseColor, color: 'white', padding: '10px 32px' }} onClick={() => onAction('resume')}>
                <Play size={16} /> Resume
              </button>
            )}
            {room.phase !== 'waiting' && isHost && (
              <button className="btn btn-secondary btn-icon" onClick={() => onAction('phase', { phase: phase === 'work' ? 'break' : 'work' })} data-tip="Skip phase">
                <SkipForward size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex-col gap-16">
          {/* Members card */}
          <div className="card">
            <div className="card-title mb-12"><Users size={14} className="card-title-icon" /> Members ({room.members.length})</div>
            <div className="flex-col gap-6">
              {room.members.map(uid => {
                const initial = uid.replace(/^user-/, '').charAt(0).toUpperCase()
                const voted = room.pauseVotes?.includes(uid)
                const isRoomHost = uid === room.host
                const isMe = uid === myId
                return (
                  <div key={uid} className="flex items-center gap-8" style={{ padding: '4px 2px' }}>
                    <div
                      className="fwf-member-avatar"
                      data-host={isRoomHost}
                      title={uid}
                      style={{ flexShrink: 0 }}
                    >{initial}</div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                      <div style={{ color: 'var(--text-1)' }}>
                        {isMe ? 'You' : uid}
                        {isRoomHost && <span style={{ color: 'var(--yellow)', marginLeft: 6, fontSize: 10 }}>HOST</span>}
                      </div>
                    </div>
                    {voted && <span className="fwf-vote-dot" title="Voted to pause" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Room info */}
          <div className="card">
            <div className="card-title mb-12"><Timer size={14} className="card-title-icon" /> Session</div>
            <div className="flex-col gap-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Work</span>
                <span className="mono">{room.workMin}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Break</span>
                <span className="mono">{room.breakMin}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Phase</span>
                <span style={{ color: phaseColor, fontWeight: 600, textTransform: 'capitalize' }}>{room.phase}</span>
              </div>
              {!isHost && room.phase !== 'waiting' && (
                <div className="text-xs text-muted mt-8" style={{ lineHeight: 1.5 }}>
                  Only the host can start, resume, or skip phases. Members can
                  vote to pause — {quorum} vote{quorum !== 1 ? 's' : ''} required.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FocusWithFriends() {
  const { myId } = useFriends()
  const toast = useToast()
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const wsRef = useRef(null)

  const loadRooms = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/focus-rooms`)
      if (!r.ok) return
      const data = await r.json()
      setRooms(data.rooms || [])
    } catch {}
  }, [])

  const loadRoom = useCallback(async (id) => {
    try {
      const r = await fetch(`${BASE}/focus-rooms/${id}`)
      if (!r.ok) return
      const data = await r.json()
      setActiveRoom(data.room)
    } catch {}
  }, [])

  // Subscribe to WS for live room updates
  useEffect(() => {
    function handler(e) {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'focus:room') {
          const room = msg.room
          setRooms(prev => {
            const idx = prev.findIndex(r => r.id === room.id)
            if (idx >= 0) { const next = [...prev]; next[idx] = room; return next }
            return [...prev, room]
          })
          setActiveRoom(prev => prev?.id === room.id ? room : prev)
        }
      } catch {}
    }
    // Connect our own WS listener alongside FriendsContext
    let ws
    function connect() {
      ws = new WebSocket('ws://localhost:4455/ws')
      ws.onmessage = handler
      ws.onclose = () => setTimeout(connect, 5000)
      ws.onerror = () => ws.close()
      wsRef.current = ws
    }
    connect()
    loadRooms()
    return () => ws?.close()
  }, [loadRooms])

  async function onCreate({ name, workMin, breakMin }) {
    setLoading(true)
    try {
      const r = await fetch(`${BASE}/focus-rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: myId, name, workMin, breakMin }),
      })
      const data = await r.json()
      if (data.ok) { setActiveRoom(data.room); setRooms(prev => [...prev, data.room]) }
      else toast?.show?.({ type: 'error', title: 'Could not create room' })
    } catch { toast?.show?.({ type: 'error', title: 'Server offline' }) }
    setLoading(false)
  }

  async function onJoin(roomId) {
    setLoading(true)
    try {
      const r = await fetch(`${BASE}/focus-rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId }),
      })
      const data = await r.json()
      if (data.ok) setActiveRoom(data.room)
      else toast?.show?.({ type: 'error', title: 'Could not join room' })
    } catch { toast?.show?.({ type: 'error', title: 'Server offline' }) }
    setLoading(false)
  }

  async function onAction(action, body = {}) {
    if (!activeRoom) return
    try {
      const r = await fetch(`${BASE}/focus-rooms/${activeRoom.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, ...body }),
      })
      const data = await r.json()
      if (data.ok) setActiveRoom(data.room)
    } catch {}
  }

  async function onLeave() {
    if (!activeRoom) return
    try {
      await fetch(`${BASE}/focus-rooms/${activeRoom.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId }),
      })
    } catch {}
    setActiveRoom(null)
    loadRooms()
  }

  if (activeRoom) {
    return <RoomView room={activeRoom} myId={myId} onAction={onAction} onLeave={onLeave} />
  }

  return (
    <RoomLobby rooms={rooms.filter(r => !r.done)} myId={myId} onCreate={onCreate} onJoin={onJoin} loading={loading} />
  )
}
