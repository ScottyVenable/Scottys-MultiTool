import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const isElectron = !!window.api

  const refreshUsers = useCallback(async () => {
    if (!isElectron) { setUsers([]); return [] }
    try {
      const list = await window.api.auth.listUsers()
      setUsers(list || [])
      return list || []
    } catch { setUsers([]); return [] }
  }, [isElectron])

  const refreshCurrent = useCallback(async () => {
    if (!isElectron) { setUser(null); return null }
    try {
      const u = await window.api.auth.currentUser()
      setUser(u || null)
      return u || null
    } catch { setUser(null); return null }
  }, [isElectron])

  useEffect(() => {
    (async () => {
      if (!isElectron) { setLoading(false); return }
      await refreshUsers()
      await refreshCurrent()
      setLoading(false)
    })()
    if (!isElectron) return
    const onChange = (u) => setUser(u || null)
    try { window.api.on?.('auth:changed', onChange) } catch {}
    return () => { try { window.api.off?.('auth:changed', onChange) } catch {} }
  }, [isElectron, refreshUsers, refreshCurrent])

  const login = async (payload) => {
    const r = await window.api.auth.login(payload)
    if (r?.success) { setUser(r.user); await refreshUsers() }
    return r
  }
  const logout = async () => {
    await window.api.auth.logout()
    setUser(null)
  }
  const register = async (payload) => {
    const r = await window.api.auth.register(payload)
    if (r?.success) await refreshUsers()
    return r
  }
  const updateProfile = async (patch) => {
    const r = await window.api.auth.updateProfile(patch)
    if (r?.success) { setUser(r.user); await refreshUsers() }
    return r
  }
  const changePassword = async (payload) => window.api.auth.changePassword(payload)
  const deleteAccount = async (payload) => {
    const r = await window.api.auth.deleteAccount(payload)
    if (r?.success) { setUser(null); await refreshUsers() }
    return r
  }
  const recoveryLogin = async (payload) => {
    const r = await window.api.auth.recoveryLogin(payload)
    if (r?.success) await refreshUsers()
    return r
  }

  return (
    <AuthContext.Provider value={{ user, users, loading, login, logout, register, updateProfile, changePassword, deleteAccount, recoveryLogin, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
