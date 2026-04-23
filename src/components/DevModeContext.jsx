import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

// Dev-mode flag lives alongside regular settings in `window.api.store.settings`
// (falling back to localStorage in non-Electron runs). Flipping it on reveals
// the "Dev Tools" panel and unlocks features like dummy friends and coin
// adjustments. Off by default so normal users never see it.

const DevModeContext = createContext(null)

async function readSetting() {
  try {
    if (window.api?.store) {
      const s = await window.api.store.get('settings')
      return !!s?.devMode
    }
  } catch {}
  try { return localStorage.getItem('devMode') === '1' } catch { return false }
}

async function writeSetting(value) {
  try {
    if (window.api?.store) {
      const s = (await window.api.store.get('settings')) || {}
      await window.api.store.set('settings', { ...s, devMode: !!value })
    } else {
      localStorage.setItem('devMode', value ? '1' : '0')
    }
  } catch {}
}

export function DevModeProvider({ children }) {
  const [devMode, setDevMode] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    (async () => {
      setDevMode(await readSetting())
      setHydrated(true)
    })()
  }, [])

  const toggle = useCallback(async (next) => {
    const value = typeof next === 'boolean' ? next : !devMode
    setDevMode(value)
    await writeSetting(value)
    window.dispatchEvent(new CustomEvent('devmode:change', { detail: { enabled: value } }))
  }, [devMode])

  return (
    <DevModeContext.Provider value={{ devMode, toggle, hydrated }}>
      {children}
    </DevModeContext.Provider>
  )
}

export function useDevMode() {
  const ctx = useContext(DevModeContext)
  if (!ctx) return { devMode: false, toggle: () => {}, hydrated: true }
  return ctx
}
