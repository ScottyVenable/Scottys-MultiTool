import React, { useEffect, useState, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react'

// Persistent bottom bar showing the current Windows SMTC media session.
// Hidden entirely when there's no session. Polls every 2 seconds.
export default function MediaPlayerBar() {
  const [info, setInfo]   = useState(null)   // {hasSession, title, artist, status, thumbnail, thumbnailMime}
  const [busy, setBusy]   = useState(false)
  const timerRef          = useRef(null)
  const isElectron = !!window.api

  const poll = async () => {
    if (!isElectron) return
    try {
      const s = await window.api.mediaPlayer.status()
      setInfo(s && s.hasSession ? s : null)
    } catch {
      setInfo(null)
    }
  }

  useEffect(() => {
    if (!isElectron) return
    poll()
    timerRef.current = setInterval(poll, 2000)
    return () => clearInterval(timerRef.current)
  }, [])

  const control = async (action) => {
    if (!isElectron || busy) return
    setBusy(true)
    try { await window.api.mediaPlayer.control(action) } catch {}
    setBusy(false)
    // Refresh quickly after a control press so the icon updates.
    setTimeout(poll, 250)
  }

  if (!isElectron || !info || !info.hasSession) return null

  const isPlaying = (info.status || '').toLowerCase() === 'playing'
  const art = info.thumbnail
    ? `data:${info.thumbnailMime || 'image/png'};base64,${info.thumbnail}`
    : null

  return (
    <div className="media-player-bar">
      <div className="mpb-art">
        {art ? <img src={art} alt="" /> : <Music size={20} />}
      </div>
      <div className="mpb-meta">
        <div className="mpb-title" title={info.title}>{info.title || 'Unknown title'}</div>
        <div className="mpb-artist" title={info.artist}>{info.artist || info.albumTitle || ''}</div>
      </div>
      <div className="mpb-controls">
        <button className="btn btn-ghost btn-sm" onClick={() => control('previous')} title="Previous">
          <SkipBack size={14} />
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => control('playpause')}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => control('next')} title="Next">
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  )
}
