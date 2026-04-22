import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import LoginScreen from './LoginScreen'
import RegisterScreen from './RegisterScreen'

export default function AuthGate({ children }) {
  const { user, users, loading } = useAuth()
  const [mode, setMode] = useState(null) // null | 'login' | 'register'

  // No Electron — skip auth (running in browser for dev/preview)
  if (!window.api) return children

  if (loading) {
    return <div className="auth-loading">Loading…</div>
  }

  if (user) return children

  const resolvedMode = mode || (users.length === 0 ? 'register' : 'login')

  if (resolvedMode === 'register') {
    return <RegisterScreen onLogin={users.length > 0 ? () => setMode('login') : undefined} />
  }
  return <LoginScreen onRegister={() => setMode('register')} />
}
