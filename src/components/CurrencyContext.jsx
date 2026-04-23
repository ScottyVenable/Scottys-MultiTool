import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

// Local-only currency + challenges. Everything persists to window.api.store
// under the "currency" key so it survives relaunches. Social/premium tiers
// are deliberately deferred until the companion server ships real auth.

const CurrencyContext = createContext(null)
const KEY = 'currency'
const MAX_TX = 500

// Earn rules — single source of truth. Anything in the app that wants to
// reward the user calls `award(kind, meta)`. The kind decides the amount so
// we can tweak the economy in one place.
export const EARN_RULES = {
  focus_complete:    { amount: 50, label: 'Focus session completed' },
  chore_complete:    { amount: 20, label: 'Chore marked done' },
  reminder_ack:      { amount: 5,  label: 'Reminder acknowledged' },
  challenge_complete:{ amount: 100,label: 'Daily challenge' },
  macro_run:         { amount: 2,  label: 'Macro run' },
}

// Challenges refresh daily. `goal` is a count of a specific event kind. We
// keep them lightweight; fancier progression is a future-server concern.
const DEFAULT_CHALLENGES = [
  { id: 'focus-3',   title: 'Focus 3 times',    goal: 3, track: 'focus_complete',     reward: 150 },
  { id: 'chore-2',   title: 'Finish 2 chores',  goal: 2, track: 'chore_complete',     reward: 80 },
  { id: 'remind-5',  title: 'Ack 5 reminders',  goal: 5, track: 'reminder_ack',       reward: 60 },
]

function todayKey() { return new Date().toISOString().slice(0, 10) }

async function load() {
  try {
    const raw = window.api?.store ? await window.api.store.get(KEY) : localStorage.getItem(KEY)
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch { return null }
}
async function save(state) {
  try {
    if (window.api?.store) await window.api.store.set(KEY, state)
    else localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}

export function CurrencyProvider({ children }) {
  const [state, setState] = useState({ coins: 0, transactions: [], challenges: DEFAULT_CHALLENGES.map(c => ({ ...c, progress: 0 })), day: todayKey(), purchases: [] })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    (async () => {
      const loaded = await load()
      if (loaded) {
        // Roll over challenges once per local day.
        if (loaded.day !== todayKey()) {
          loaded.challenges = DEFAULT_CHALLENGES.map(c => ({ ...c, progress: 0 }))
          loaded.day = todayKey()
        }
        setState((prev) => ({ ...prev, ...loaded }))
      }
      setHydrated(true)
    })()
  }, [])

  useEffect(() => { if (hydrated) save(state) }, [state, hydrated])

  const award = useCallback((kind, meta = {}) => {
    const rule = EARN_RULES[kind]
    if (!rule) return
    setState(prev => {
      const tx = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), kind, amount: rule.amount, label: meta.label || rule.label, ts: Date.now() }
      const transactions = [tx, ...prev.transactions].slice(0, MAX_TX)

      // Advance any matching challenges; award bonus when one completes.
      let bonusCoins = 0
      const challenges = prev.challenges.map(c => {
        if (c.track !== kind || c.progress >= c.goal) return c
        const progress = c.progress + 1
        if (progress >= c.goal) {
          bonusCoins += c.reward
          transactions.unshift({ id: Date.now() + '-c-' + c.id, kind: 'challenge_complete', amount: c.reward, label: c.title, ts: Date.now() })
        }
        return { ...c, progress }
      })

      return { ...prev, coins: prev.coins + rule.amount + bonusCoins, transactions, challenges }
    })
  }, [])

  const spend = useCallback((amount, label) => {
    if (amount <= 0) return false
    let ok = false
    setState(prev => {
      if (prev.coins < amount) return prev
      ok = true
      const tx = { id: Date.now() + '-s-' + Math.random().toString(36).slice(2, 6), kind: 'spend', amount: -amount, label: label || 'Spent', ts: Date.now() }
      return { ...prev, coins: prev.coins - amount, transactions: [tx, ...prev.transactions].slice(0, MAX_TX) }
    })
    return ok
  }, [])

  const purchase = useCallback((itemId, label, cost) => {
    let ok = false
    setState(prev => {
      if (prev.purchases?.includes(itemId)) return prev
      if (prev.coins < cost) return prev
      ok = true
      const tx = { id: Date.now() + '-p-' + itemId, kind: 'spend', amount: -cost, label: label, ts: Date.now() }
      return {
        ...prev,
        coins: prev.coins - cost,
        transactions: [tx, ...prev.transactions].slice(0, MAX_TX),
        purchases: [...(prev.purchases || []), itemId],
      }
    })
    return ok
  }, [])

  // Dev-mode helper: directly set the coin balance to an arbitrary amount.
  // Logs a `grant` transaction so the change is visible in history. Meant for
  // debugging only — gated behind the Dev Tools panel in the UI.
  const grant = useCallback((amount, label = 'Dev grant') => {
    if (!Number.isFinite(amount) || amount === 0) return
    setState(prev => {
      const tx = { id: Date.now() + '-g-' + Math.random().toString(36).slice(2, 6), kind: amount > 0 ? 'grant' : 'spend', amount, label, ts: Date.now() }
      return { ...prev, coins: Math.max(0, prev.coins + amount), transactions: [tx, ...prev.transactions].slice(0, MAX_TX) }
    })
  }, [])

  const reset = useCallback(() => {
    setState({ coins: 0, transactions: [], challenges: DEFAULT_CHALLENGES.map(c => ({ ...c, progress: 0 })), day: todayKey(), purchases: [] })
  }, [])

  const value = { ...state, award, spend, purchase, grant, reset }
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  // Safe fallback so components don't crash if the provider isn't mounted
  // (e.g. during isolated tests).
  if (!ctx) return { coins: 0, transactions: [], challenges: [], purchases: [], award: () => {}, spend: () => false, purchase: () => false, grant: () => {}, reset: () => {} }
  return ctx
}
