import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from './Auth/AuthContext'

// Pool of verbs for the animated "Ready to ___" subtitle.
// Each entry ties to a CSS variable so the hue follows the user's theme.
const VERBS = [
  { verb: 'automate',  color: 'var(--accent)' },
  { verb: 'focus',     color: 'var(--yellow)' },
  { verb: 'plan',      color: 'var(--blue)' },
  { verb: 'create',    color: 'var(--green)' },
  { verb: 'organize',  color: 'var(--accent)' },
  { verb: 'browse',    color: 'var(--blue)' },
  { verb: 'journal',   color: 'var(--red)' },
  { verb: 'learn',     color: 'var(--green)' },
  { verb: 'build',     color: 'var(--accent)' },
  { verb: 'remember',  color: 'var(--yellow)' },
  { verb: 'launch',    color: 'var(--red)' },
  { verb: 'explore',   color: 'var(--blue)' },
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
  'Press Ctrl+K anywhere to open the command palette.',
  'Macros can target a background window without stealing focus.',
  'The Notebook exports to PDF via File → Export.',
  'Pin your favorite components to the sidebar via the Components tab.',
  'Use the Scheduler to run macros at specific times — daily, once, or at intervals.',
  'The Text Expander replaces abbreviations as you type. Start it from its tab.',
  'Your Journal is locked with a 4-digit PIN. You can type it — no keypad needed.',
  'Everything is local. No telemetry, no analytics, no cloud.',
]

export default function WelcomeHero() {
  const { user } = useAuth()
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * VERBS.length))
  const [fading, setFading] = useState(false)
  const lastIdxRef = useRef(idx)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        // Pick a new verb that isn't the same as the current one.
        let next = lastIdxRef.current
        while (next === lastIdxRef.current) {
          next = Math.floor(Math.random() * VERBS.length)
        }
        lastIdxRef.current = next
        setIdx(next)
        setFading(false)
      }, 320)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  const name = user?.displayName || user?.username || 'friend'
  const current = VERBS[idx]

  return (
    <div className="welcome-hero">
      <div className="welcome-hero-greeting">
        {timeOfDayGreeting()},{' '}
        <span className="welcome-hero-name">{name}</span>
        <span className="welcome-hero-punct">.</span>
      </div>
      <div className="welcome-hero-sub">
        Ready to{' '}
        <span
          className={`welcome-hero-verb ${fading ? 'fading' : ''}`}
          style={{ color: current.color, textDecorationColor: current.color }}
          aria-live="polite"
        >
          {current.verb}
        </span>
        <span className="welcome-hero-punct">?</span>
      </div>
      <div className="welcome-hero-tip">
        <span className="welcome-hero-tip-label">Tip</span>
        {tip}
      </div>
    </div>
  )
}
