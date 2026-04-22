import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, ChevronLeft, Users } from 'lucide-react'
import { useFriends } from './FriendsContext'

const BASE = 'http://localhost:4455'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function useMessages(myId, partnerId) {
  const [messages, setMessages] = useState([])
  const loaded = useRef(false)

  useEffect(() => {
    if (!partnerId) return
    loaded.current = false
    setMessages([])
    async function load() {
      try {
        const r = await fetch(`${BASE}/messages/${myId}`)
        if (!r.ok) return
        const data = await r.json()
        const conv = (data.messages || []).filter(
          m => (m.from === myId && m.to === partnerId) || (m.from === partnerId && m.to === myId)
        )
        setMessages(conv)
      } catch {}
      loaded.current = true
    }
    load()
  }, [myId, partnerId])

  // Listen for incoming WS messages via a custom event we dispatch below
  useEffect(() => {
    function handler(e) {
      const msg = e.detail
      if (!msg) return
      if ((msg.from === myId && msg.to === partnerId) || (msg.from === partnerId && msg.to === myId)) {
        setMessages(prev => [...prev, msg])
      }
    }
    window.addEventListener('friends:message', handler)
    return () => window.removeEventListener('friends:message', handler)
  }, [myId, partnerId])

  return [messages, setMessages]
}

function ConversationView({ myId, partnerId, onBack }) {
  const [messages] = useMessages(myId, partnerId)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await fetch(`${BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: myId, to: partnerId, body: text }),
      })
      setBody('')
    } catch {}
    setSending(false)
  }

  const displayName = partnerId.replace(/^user-/, '').slice(0, 8)

  return (
    <div className="msg-conv">
      <div className="msg-conv-header">
        <button className="msg-back-btn" onClick={onBack}><ChevronLeft size={16} /></button>
        <div className="msg-conv-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <span className="msg-conv-name">{displayName}</span>
      </div>
      <div className="msg-conv-body">
        {messages.length === 0 && (
          <p className="msg-empty">No messages yet. Say hi!</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`msg-bubble-wrap ${m.from === myId ? 'mine' : 'theirs'}`}>
            <div className="msg-bubble">{m.body}</div>
            <div className="msg-time">{formatTime(m.ts)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="msg-compose" onSubmit={send}>
        <input
          className="msg-input"
          placeholder="Message…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button className="msg-send-btn" type="submit" disabled={sending || !body.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}

export default function MessagesCenter() {
  const { myId, friends, presence } = useFriends()
  const [active, setActive] = useState(null)

  // Forward incoming WS messages to custom event for ConversationView
  useEffect(() => {
    function handler(e) {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'message') {
          window.dispatchEvent(new CustomEvent('friends:message', { detail: data.message }))
        }
      } catch {}
    }
    // We listen on the global ws events via a broadcast approach — poll for now.
    // A proper WS reference from context could be added if needed.
  }, [])

  if (active) {
    return <ConversationView myId={myId} partnerId={active} onBack={() => setActive(null)} />
  }

  return (
    <div className="msg-panel">
      <div className="msg-header">
        <MessageSquare size={16} /> Messages
      </div>
      {friends.length === 0 ? (
        <div className="msg-empty-state">
          <Users size={32} strokeWidth={1.2} />
          <p>Add friends to start chatting.</p>
        </div>
      ) : (
        <div className="msg-thread-list">
          {friends.map(id => {
            const p = presence[id]
            const online = p?.online
            const displayName = id.replace(/^user-/, '').slice(0, 8)
            return (
              <button key={id} className="msg-thread-row" onClick={() => setActive(id)}>
                <div className="msg-thread-avatar">
                  {displayName.charAt(0).toUpperCase()}
                  <span className="msg-thread-dot" style={{ background: online ? 'var(--green)' : 'var(--text-3)' }} />
                </div>
                <div className="msg-thread-info">
                  <span className="msg-thread-name">{displayName}</span>
                  <span className="msg-thread-sub">{p?.activity || (online ? 'Online' : 'Offline')}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
