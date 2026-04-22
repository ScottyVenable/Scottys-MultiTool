import React, { useState, useMemo } from 'react'
import { UserPlus, LogIn, Copy, Check } from 'lucide-react'
import AuthShell from './AuthShell'
import { useAuth } from './AuthContext'

function passwordStrength(pw) {
  let score = 0
  if (!pw) return { score: 0, label: 'Empty' }
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  return { score, label: labels[Math.min(score, 5)] }
}

export default function RegisterScreen({ onLogin }) {
  const { register, login } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [tos, setTos] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [copied, setCopied] = useState(false)

  const strength = useMemo(() => passwordStrength(password), [password])

  const submit = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (!tos) { setError('Please accept the local terms.'); return }
    setBusy(true)
    try {
      const r = await register({ username, password, displayName, email })
      if (!r?.success) { setError(r?.error || 'Registration failed'); return }
      setRecoveryCode(r.recoveryCode || '')
      // auto-login after showing recovery code
    } finally { setBusy(false) }
  }

  const proceed = async () => {
    const r = await login({ username, password, rememberMe: true })
    if (!r?.success) setError(r?.error || 'Login failed')
  }

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(recoveryCode); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  if (recoveryCode) {
    return (
      <AuthShell subtitle="Save your recovery code before continuing">
        <div className="auth-recovery">
          <div className="auth-recovery-hint">Store this in a safe place. You'll need it if you forget your password. We can't show it again.</div>
          <div className="auth-recovery-code">
            <code>{recoveryCode}</code>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copyCode} title="Copy">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
          <button className="btn btn-primary btn-block" onClick={proceed}><LogIn size={14} /> Continue to app</button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell subtitle="Create your local profile">
      <form onSubmit={submit} className="auth-form">
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="input" autoFocus value={username} onChange={e => setUsername(e.target.value)} placeholder="letters, digits, _ . -" />
        </div>
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="What should we call you?" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {password && (
            <div className="auth-strength">
              <div className={`auth-strength-bar s${strength.score}`} />
              <span>{strength.label}</span>
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email (optional)</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="not required and not shared" />
        </div>
        <label className="auth-checkbox">
          <input type="checkbox" checked={tos} onChange={e => setTos(e.target.checked)} />
          <span>I understand this account is stored locally on this device only.</span>
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          <UserPlus size={14} /> {busy ? 'Creating…' : 'Create account'}
        </button>
        {onLogin && (
          <div className="auth-links">
            <button type="button" className="auth-link" onClick={onLogin}><LogIn size={12} /> Sign in instead</button>
          </div>
        )}
      </form>
    </AuthShell>
  )
}
