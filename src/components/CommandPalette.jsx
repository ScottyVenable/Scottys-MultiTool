import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search, ArrowRight, Zap, BookOpen, Bell, Trophy, Globe, Bot, Settings as SettingsIcon, LayoutDashboard } from 'lucide-react'

const NAV_COMMANDS = [
  { id: 'dashboard', label: 'Go to Dashboard', kind: 'nav', target: 'dashboard', icon: LayoutDashboard },
  { id: 'macros', label: 'Go to Macros', kind: 'nav', target: 'macros', icon: Zap },
  { id: 'hotkeys', label: 'Go to Hotkeys', kind: 'nav', target: 'hotkeys', icon: Zap },
  { id: 'text-expander', label: 'Go to Text Expander', kind: 'nav', target: 'text-expander', icon: Zap },
  { id: 'auto-clicker', label: 'Go to Auto Clicker', kind: 'nav', target: 'auto-clicker', icon: Zap },
  { id: 'scheduler', label: 'Go to Scheduler', kind: 'nav', target: 'scheduler', icon: Zap },
  { id: 'app-launcher', label: 'Go to App Launcher', kind: 'nav', target: 'app-launcher', icon: Zap },
  { id: 'clipboard', label: 'Go to Clipboard', kind: 'nav', target: 'clipboard', icon: Zap },
  { id: 'notebook', label: 'Go to Notebook', kind: 'nav', target: 'notebook', icon: BookOpen },
  { id: 'window-tools', label: 'Go to Window Snapper', kind: 'nav', target: 'window-tools', icon: Zap },
  { id: 'timer', label: 'Go to Focus Timer', kind: 'nav', target: 'timer', icon: Zap },
  { id: 'volume', label: 'Go to Volume Control', kind: 'nav', target: 'volume', icon: Zap },
  { id: 'color-picker', label: 'Go to Color Picker', kind: 'nav', target: 'color-picker', icon: Zap },
  { id: 'system', label: 'Go to System Monitor', kind: 'nav', target: 'system', icon: Zap },
  { id: 'file-manager', label: 'Go to File Manager', kind: 'nav', target: 'file-manager', icon: Zap },
  { id: 'journal', label: 'Go to Journal', kind: 'nav', target: 'journal', icon: BookOpen },
  { id: 'reminders', label: 'Go to Reminders', kind: 'nav', target: 'reminders', icon: Bell },
  { id: 'chores', label: 'Go to Chore Planner', kind: 'nav', target: 'chores', icon: Trophy },
  { id: 'media', label: 'Go to Media Library', kind: 'nav', target: 'media', icon: Zap },
  { id: 'browser', label: 'Go to Browser', kind: 'nav', target: 'browser', icon: Globe },
  { id: 'ai', label: 'Go to AI Workstation', kind: 'nav', target: 'ai', icon: Bot },
  { id: 'mobile', label: 'Go to Mobile Remote', kind: 'nav', target: 'mobile', icon: Zap },
  { id: 'settings', label: 'Go to Settings', kind: 'nav', target: 'settings', icon: SettingsIcon },
  { id: 'help', label: 'Go to Help', kind: 'nav', target: 'help', icon: Zap },
]

function fuzzyMatch(needle, hay) {
  if (!needle) return 1
  const n = needle.toLowerCase()
  const h = hay.toLowerCase()
  if (h.includes(n)) return 100 - (h.indexOf(n))
  let score = 0, i = 0
  for (const ch of h) { if (i < n.length && ch === n[i]) { score++; i++ } }
  return i === n.length ? score : 0
}

export default function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [dyn, setDyn] = useState([]) // dynamic: macros, notes, reminders
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQ(''); setSel(0)
    setTimeout(() => inputRef.current?.focus(), 50)
    loadDynamic()
  }, [open])

  const loadDynamic = async () => {
    if (!window.api) return
    try {
      const [macros, reminders, chores] = await Promise.all([
        window.api.macros.list().catch(() => []),
        window.api.reminders?.list?.().catch(() => []) || [],
        window.api.chores?.list?.().catch(() => []) || [],
      ])
      const items = []
      for (const m of (macros || [])) items.push({ id: `macro-${m.id}`, label: `Run macro: ${m.name}`, kind: 'macro', target: m.id, icon: Zap })
      for (const r of (reminders || [])) items.push({ id: `rem-${r.id}`, label: `Reminder: ${r.text || r.title}`, kind: 'nav', target: 'reminders', icon: Bell })
      for (const c of (chores || [])) items.push({ id: `chore-${c.id}`, label: `Chore: ${c.title}`, kind: 'nav', target: 'chores', icon: Trophy })
      setDyn(items)
    } catch {}
  }

  const results = useMemo(() => {
    const all = [...NAV_COMMANDS, ...dyn]
    if (!q) return all.slice(0, 40)
    return all
      .map(c => ({ c, s: fuzzyMatch(q, c.label) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map(x => x.c)
  }, [q, dyn])

  const run = async (cmd) => {
    onClose()
    if (cmd.kind === 'nav') onNavigate(cmd.target)
    else if (cmd.kind === 'macro') {
      try { await window.api.macros.run(cmd.target) } catch {}
    }
  }

  const onKey = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) run(results[sel]) }
  }

  if (!open) return null

  return (
    <div className="cmdp-overlay" onClick={onClose}>
      <div className="cmdp" onClick={e => e.stopPropagation()}>
        <div className="cmdp-search">
          <Search size={16} />
          <input
            ref={inputRef}
            className="cmdp-input"
            placeholder="Type a command or search…"
            value={q}
            onChange={e => { setQ(e.target.value); setSel(0) }}
            onKeyDown={onKey}
          />
          <span className="cmdp-kbd">ESC</span>
        </div>
        <div className="cmdp-list">
          {results.length === 0 && <div className="cmdp-empty">No matches.</div>}
          {results.map((cmd, i) => {
            const Icon = cmd.icon || Zap
            return (
              <div
                key={cmd.id}
                className={`cmdp-item ${i === sel ? 'sel' : ''}`}
                onMouseEnter={() => setSel(i)}
                onClick={() => run(cmd)}
              >
                <Icon size={14} />
                <span className="cmdp-item-label">{cmd.label}</span>
                <ArrowRight size={12} className="cmdp-item-arrow" />
              </div>
            )
          })}
        </div>
        <div className="cmdp-hint">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
