import React, { useState, useEffect, useRef } from 'react'
import { Zap, Sparkles, ArrowRight, Compass, Keyboard, Bot, Music, Bookmark, Clock, Command } from 'lucide-react'
import { useAuth } from './Auth/AuthContext'

// Verbs cycle in the "Ready to ___" line. Each pairs with a theme color and
// an icon so the whole hero feels alive, not just text.
const VERBS = [
  { verb: 'automate',  color: 'var(--accent)', Icon: Zap },
  { verb: 'focus',     color: 'var(--yellow)', Icon: Clock },
  { verb: 'plan',      color: 'var(--blue)',   Icon: Bookmark },
  { verb: 'create',    color: 'var(--green)',  Icon: Sparkles },
  { verb: 'organize',  color: 'var(--accent)', Icon: Command },
  { verb: 'explore',   color: 'var(--blue)',   Icon: Compass },
  { verb: 'build',     color: 'var(--accent)', Icon: Zap },
  { verb: 'remember',  color: 'var(--yellow)', Icon: Bookmark },
  { verb: 'play',      color: 'var(--red)',    Icon: Music },
  { verb: 'learn',     color: 'var(--green)',  Icon: Sparkles },
  { verb: 'chat',      color: 'var(--blue)',   Icon: Bot },
  { verb: 'launch',    color: 'var(--red)',    Icon: Zap },
]

function timeOfDayGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Good night'
}

const TIPS = [
  { label: 'Palette',   text: 'Press Ctrl+K from anywhere to open the command palette.' },
  { label: 'Macros',    text: 'Macros can target a specific background window without stealing focus.' },
  { label: 'Notebook',  text: 'The Notebook exports to PDF via File → Export.' },
  { label: 'Components',text: 'Pin your favorite tools to the sidebar from the Components tab.' },
  { label: 'Scheduler', text: 'Run macros at specific times — daily, once, or at intervals.' },
  { label: 'Expander',  text: 'The Text Expander replaces abbreviations globally as you type.' },
  { label: 'Privacy',   text: 'Everything is local. No telemetry, no analytics, no cloud.' },
  { label: 'CLI',       text: 'Pop the PowerShell CLI into its own window for a focused shell.' },
]

// Quick-launch targets shown as tiles under the hero. Clicking one calls
// onNavigate with the corresponding page id from PAGE_MAP.
const QUICK_ACTIONS = [
  { id: 'macros',         label: 'Macros',       Icon: Zap,      tint: 'var(--accent)' },
  { id: 'assistant',      label: 'AI Assistant', Icon: Bot,      tint: 'var(--blue)' },
  { id: 'browser',        label: 'Browser',      Icon: Compass,  tint: 'var(--green)' },
  { id: 'hotkeys',        label: 'Hotkeys',      Icon: Keyboard, tint: 'var(--yellow)' },
  { id: 'focus-timer',    label: 'Focus Timer',  Icon: Clock,    tint: 'var(--red)' },
  { id: 'command-palette',label: 'Palette',      Icon: Command,  tint: 'var(--blue)' },
]

export default function WelcomeScreen({ onNavigate }) {
  const { user } = useAuth()
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * VERBS.length))
  const [fading, setFading] = useState(false)
  const lastIdxRef = useRef(idx)
  const [tip, setTip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])

  // Rotate the verb on a steady cadence with a crisp fade-out/fade-in.
  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        let next = lastIdxRef.current
        while (next === lastIdxRef.current) next = Math.floor(Math.random() * VERBS.length)
        lastIdxRef.current = next
        setIdx(next)
        setFading(false)
      }, 380)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  // Rotate the tip less frequently so it doesn't compete with the verb.
  useEffect(() => {
    const id = setInterval(() => {
      setTip(prev => {
        let next = prev
        while (next === prev) next = TIPS[Math.floor(Math.random() * TIPS.length)]
        return next
      })
    }, 9000)
    return () => clearInterval(id)
  }, [])

  const name = user?.displayName || user?.username || 'friend'
  const current = VERBS[idx]
  const Icon = current.Icon

  const handleQuick = (id) => { if (typeof onNavigate === 'function') onNavigate(id) }

  return (
    <div className="welcome-screen animate-in">
      {/* Ambient blobs that drift in the background */}
      <div className="welcome-bg">
        <div className="welcome-blob welcome-blob-1" />
        <div className="welcome-blob welcome-blob-2" />
        <div className="welcome-blob welcome-blob-3" />
      </div>

      <div className="welcome-inner">
        <div className="welcome-greeting">
          {timeOfDayGreeting()},{' '}
          <span className="welcome-name">{name}</span>
          <span className="welcome-punct">.</span>
        </div>

        <div className="welcome-sub">
          Ready to{' '}
          <span
            className={`welcome-verb ${fading ? 'fading' : ''}`}
            style={{ color: current.color }}
            aria-live="polite"
          >
            <Icon size={28} strokeWidth={2.2} className="welcome-verb-icon" />
            {current.verb}
          </span>
          <span className="welcome-punct">?</span>
        </div>

        <div className="welcome-actions">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              className="welcome-action"
              onClick={() => handleQuick(a.id)}
              style={{ '--tint': a.tint }}
              title={`Go to ${a.label}`}
            >
              <span className="welcome-action-icon"><a.Icon size={18} /></span>
              <span className="welcome-action-label">{a.label}</span>
              <ArrowRight size={14} className="welcome-action-arrow" />
            </button>
          ))}
        </div>

        <div className="welcome-tip" key={tip.label /* forces fade-in on change */}>
          <span className="welcome-tip-label">{tip.label}</span>
          <span className="welcome-tip-text">{tip.text}</span>
        </div>
      </div>
    </div>
  )
}
