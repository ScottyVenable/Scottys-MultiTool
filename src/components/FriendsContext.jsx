import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const SERVER_PORT = 4455
const BASE = `http://localhost:${SERVER_PORT}`
const WS_URL = `ws://localhost:${SERVER_PORT}/ws`

const FriendsContext = createContext(null)

export function FriendsProvider({ children }) {
  const [connected, setConnected] = useState(false)
  const [presence, setPresence] = useState({})   // userId -> { status, activity, online, ts }
  const [friends, setFriends] = useState([])      // array of userId strings
  const [myId, setMyId] = useState(() => {
    let id = localStorage.getItem('scotty-my-id')
    if (!id) { id = 'user-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('scotty-my-id', id) }
    return id
  })
  const ws = useRef(null)
  const reconnectTimer = useRef(null)

  // Fetch friends list from server
  const fetchFriends = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/friends/${myId}`)
      if (!r.ok) return
      const data = await r.json()
      setFriends(data.friends || [])
    } catch {}
  }, [myId])

  // Fetch all presence data
  const fetchPresence = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/presence`)
      if (!r.ok) return
      const data = await r.json()
      setPresence(data.presence || {})
    } catch {}
  }, [])

  // Push our own presence to the server
  const publishPresence = useCallback(async (status = 'online', activity = '') => {
    try {
      await fetch(`${BASE}/presence/${myId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, activity, online: true }),
      })
    } catch {}
  }, [myId])

  // Add a friend by ID
  const addFriend = useCallback(async (friendId) => {
    if (!friendId || friendId === myId) return false
    try {
      const r = await fetch(`${BASE}/friends/${myId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId }),
      })
      if (!r.ok) return false
      const data = await r.json()
      setFriends(data.friends || [])
      return true
    } catch { return false }
  }, [myId])

  // Connect (or reconnect) WebSocket
  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState < 2) return
    try {
      const socket = new WebSocket(WS_URL)
      ws.current = socket
      socket.onopen = () => {
        setConnected(true)
        fetchFriends()
        fetchPresence()
        publishPresence('online')
      }
      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'presence') {
            setPresence(prev => ({ ...prev, [msg.presence.userId]: msg.presence }))
          }
        } catch {}
      }
      socket.onclose = () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, 5000)
      }
      socket.onerror = () => socket.close()
    } catch {}
  }, [fetchFriends, fetchPresence, publishPresence])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  // Announce "offline" on unload
  useEffect(() => {
    const handler = () => {
      try {
        navigator.sendBeacon(`${BASE}/presence/${myId}`, JSON.stringify({ status: 'offline', online: false }))
      } catch {}
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [myId])

  return (
    <FriendsContext.Provider value={{ connected, myId, friends, presence, addFriend, publishPresence, fetchFriends }}>
      {children}
    </FriendsContext.Provider>
  )
}

export function useFriends() {
  const ctx = useContext(FriendsContext)
  if (!ctx) throw new Error('useFriends must be used inside FriendsProvider')
  return ctx
}
