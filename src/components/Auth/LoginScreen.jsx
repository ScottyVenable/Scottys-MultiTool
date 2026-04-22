import React, { useState } from 'react'
import { LogIn, UserPlus, User as UserIcon, KeyRound } from 'lucide-react'
import AuthShell from './AuthShell'
import { useAuth } from './AuthContext'

export default function LoginScreen({ onRegister }) {
  const { users, login, recoveryLogin } = useAuth()
  const [username, setUsername] = useState(users[0]?.username || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('login') // login | recovery
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPw, setNewPw] = useState('')

  const submit = async (e) => {
    e?.preventDefault?.()
    setError(''); setBusy(true)
    try {
      const r = await login({ username, password, rememberMe })
      if (!r?.success) setError(r?.error || 'Login failed')
    } finally { setBusy(false) }
  }

  const submitRecovery = async (e) => {
    e?.preventDefault?.()
    setError(''); setBusy(true)
    try {
      const r = await recoveryLogin({ username, recoveryCode, newPassword: newPw })
      if (!r?.success) setError(r?.error || 'Recovery failed')
      else { setMode('login'); setPassword(newPw); setError('Password reset — please sign in.') }
    } finally { setBusy(false) }
  }

  return (
    <AuthShell subtitle={mode === 'recovery' ? 'Reset with recovery code' : 'Sign in to your local profile'}>
      {users.length > 0 && mode === 'login' && (
        <div className="auth-user-switcher">
          {users.slice(0, 6).map(u => (
            <button
              key={u.id}
              type="button"
              className={`auth-user-pill ${username === u.username ? 'active' : ''}`}
              onClick={() => setUsername(u.username)}
              title={u.displayName || u.username}
            >
              {u.avatarDataUrl
                ? <img src={u.avatarDataUrl} alt="" />
                : <span className="auth-user-initial">{(u.displayName || u.username || '?').charAt(0).toUpperCase()}</span>}
              <span>{u.displayName || u.username}</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="input" autoFocus value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <label className="auth-checkbox">
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
            <span>Remember me on this device</span>
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            <LogIn size={14} /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="auth-links">
            {onRegister && (
              <button type="button" className="auth-link" onClick={onRegister}>
                <UserPlus size={12} /> Create new account
              </button>
            )}
            <button type="button" className="auth-link" onClick={() => { setMode('recovery'); setError('') }}>
              <KeyRound size={12} /> Forgot password
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submitRecovery} className="auth-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="input" autoFocus value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Recovery Code</label>
            <input className="input mono" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}><KeyRound size={14} /> Reset password</button>
          <div className="auth-links">
            <button type="button" className="auth-link" onClick={() => { setMode('login'); setError('') }}>
              <UserIcon size={12} /> Back to sign in
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
