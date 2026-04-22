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
      toast?.({ message: 'Work session done! Break time.', type: 'success' })
    }
    prevPhase.current = room.phase
  }, [room?.phase])

  if (!room) return null

  const circumference = 2 * Math.PI * 48
  const dashOffset = circumference * (1 - fraction)

  return (
    <div className="fwf-room">
      <div className="fwf-room-header">
        <span className="fwf-room-title">{room.name}</span>
        <button className="fwf-icon-btn danger" title="Leave room" onClick={onLeave}><LogOut size={14} /></button>
      </div>

      <div className="fwf-phase-pill" data-phase={room.phase}>
        {room.phase === 'waiting' ? 'Waiting to start' : room.phase === 'work' ? 'Focus' : 'Break'}
      </div>

      <div className="fwf-clock-wrap">
        <svg className="fwf-ring" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="48" className="fwf-ring-bg" />
          <circle cx="55" cy="55" r="48" className="fwf-ring-fg" data-phase={room.phase}
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform="rotate(-90 55 55)" />
        </svg>
        <div className="fwf-clock-text">
          <span className="fwf-clock-time">{display}</span>
          {isPaused && <span className="fwf-clock-sub">Paused</span>}
        </div>
      </div>

      <div className="fwf-members">
        {room.members.map(uid => {
          const initial = uid.replace(/^user-/, '').charAt(0).toUpperCase()
          const voted = room.pauseVotes?.includes(uid)
          return (
            <div key={uid} className="fwf-member-dot" title={uid}>
              <div className="fwf-member-avatar" data-host={uid === room.host}>{initial}</div>
              {voted && <span className="fwf-vote-dot" title="Voted to pause" />}
            </div>
          )
        })}
      </div>

      <div className="fwf-controls">
        {room.phase === 'waiting' && isHost && (
          <button className="fwf-btn primary" onClick={() => onAction('start')}>
            <Play size={13} /> Start
          </button>
        )}
        {room.phase !== 'waiting' && !isPaused && (
          <button className="fwf-btn" onClick={() => onAction('pause-vote')} disabled={hasVoted}>
            <Pause size={13} /> {hasVoted ? `Voted (${room.pauseVotes.length}/${quorum})` : 'Pause vote'}
          </button>
        )}
        {room.phase !== 'waiting' && isPaused && isHost && (
          <button className="fwf-btn primary" onClick={() => onAction('resume')}>
            <Play size={13} /> Resume
          </button>
        )}
        {room.phase !== 'waiting' && isHost && (
          <button className="fwf-btn" onClick={() => onAction('phase', { phase: room.phase === 'work' ? 'break' : 'work' })}>
            <SkipForward size={13} /> Skip phase
          </button>
        )}
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
      else toast?.({ message: 'Could not create room', type: 'error' })
    } catch { toast?.({ message: 'Server offline', type: 'error' }) }
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
      else toast?.({ message: 'Could not join room', type: 'error' })
    } catch { toast?.({ message: 'Server offline', type: 'error' }) }
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
