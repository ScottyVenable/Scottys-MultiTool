import React, { useState } from 'react'
import { Users, Wifi, WifiOff, UserPlus, Circle, Activity } from 'lucide-react'
import { useFriends } from './FriendsContext'
import { useToast } from './Toast'

const STATUS_LABEL = {
  online:    { color: 'var(--green)',  label: 'Online' },
  focusing:  { color: 'var(--accent)', label: 'Focusing' },
  idle:      { color: 'var(--yellow)', label: 'Idle' },
  offline:   { color: 'var(--text-3)', label: 'Offline' },
}

function statusMeta(p) {
  if (!p || !p.online) return STATUS_LABEL.offline
  return STATUS_LABEL[p.status] || STATUS_LABEL.online
}

function FriendRow({ userId, presence }) {
  const p = presence[userId]
  const meta = statusMeta(p)
  const displayName = userId.replace(/^user-/, '').slice(0, 8)
  const activity = p?.activity || ''
  return (
    <div className="friend-row">
      <div className="friend-avatar">
        {displayName.charAt(0).toUpperCase()}
        <span className="friend-status-dot" style={{ background: meta.color }} />
      </div>
      <div className="friend-info">
        <span className="friend-name">{displayName}</span>
        {activity
          ? <span className="friend-activity">{activity}</span>
          : <span className="friend-status-label" style={{ color: meta.color }}>{meta.label}</span>
        }
      </div>
    </div>
  )
}

export default function FriendsPanel() {
  const { connected, myId, friends, presence, addFriend } = useFriends()
  const toast = useToast()
  const [addInput, setAddInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    const id = addInput.trim()
    if (!id) return
    setAdding(true)
    const ok = await addFriend(id)
    setAdding(false)
    if (ok) {
      toast?.({ message: `Added ${id}`, type: 'success' })
      setAddInput('')
      setShowAdd(false)
    } else {
      toast?.({ message: 'Could not add friend — server may be offline', type: 'error' })
    }
  }

  const onlineFriends = friends.filter(id => presence[id]?.online)
  const offlineFriends = friends.filter(id => !presence[id]?.online)

  return (
    <div className="friends-panel">
      <div className="friends-header">
        <div className="friends-title-row">
          <Users size={16} />
          <span>Friends</span>
          {connected
            ? <span className="friends-conn-pill online"><Wifi size={10} /> Connected</span>
            : <span className="friends-conn-pill offline"><WifiOff size={10} /> Offline</span>
          }
        </div>
        <div className="friends-my-id">Your ID: <code>{myId}</code></div>
      </div>

      {friends.length === 0 ? (
        <div className="friends-empty">
          <Users size={32} strokeWidth={1.2} />
          <p>No friends yet.</p>
          <p>Share your ID above and add theirs below.</p>
        </div>
      ) : (
        <>
          {onlineFriends.length > 0 && (
            <section className="friends-section">
              <div className="friends-section-label">
                <Activity size={11} /> Online — {onlineFriends.length}
              </div>
              {onlineFriends.map(id => (
                <FriendRow key={id} userId={id} presence={presence} />
              ))}
            </section>
          )}
          {offlineFriends.length > 0 && (
            <section className="friends-section">
              <div className="friends-section-label muted">Offline — {offlineFriends.length}</div>
              {offlineFriends.map(id => (
                <FriendRow key={id} userId={id} presence={presence} />
              ))}
            </section>
          )}
        </>
      )}

      {showAdd ? (
        <form className="friends-add-form" onSubmit={handleAdd}>
          <input
            className="friends-add-input"
            placeholder="Friend's user ID"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            autoFocus
          />
          <button className="friends-add-btn" type="submit" disabled={adding || !addInput.trim()}>
            {adding ? '…' : 'Add'}
          </button>
          <button className="friends-add-btn cancel" type="button" onClick={() => setShowAdd(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button className="friends-add-trigger" onClick={() => setShowAdd(true)}>
          <UserPlus size={14} /> Add friend
        </button>
      )}
    </div>
  )
}
