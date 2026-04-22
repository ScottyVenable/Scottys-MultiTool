import React, { useState, useEffect, useRef } from 'react'
import { Lock, KeyRound, ArrowLeft } from 'lucide-react'

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Detect mobile: viewport width + touch. Mobile keeps the keypad.
function isMobileDevice() {
  if (typeof window === 'undefined') return false
  if (window.api) return false // Electron desktop always uses keyboard mode
  const narrow = window.matchMedia?.('(max-width: 768px)')?.matches
  const touch  = ('ontouchstart' in window) || navigator.maxTouchPoints > 0
  return narrow && touch
}

export default function PinLock({ storedHash, onUnlock }) {
  const [digits, setDigits]   = useState([])
  const [error, setError]     = useState('')
  const [mode, setMode]       = useState('pin')
  const [mobile]              = useState(() => isMobileDevice())
  const hiddenRef             = useRef(null)

  useEffect(() => {
    if (!mobile && mode === 'pin') hiddenRef.current?.focus()
  }, [mode, mobile])

  const verify = async (d) => {
    const hash = await sha256(d.join(''))
    if (hash === storedHash) {
      onUnlock()
    } else {
      setError('Incorrect PIN')
      setTimeout(() => { setDigits([]); setError('') }, 800)
    }
  }

  const press = async (d) => {
    if (digits.length >= 4) return
    const next = [...digits, d]
    setDigits(next)
    if (next.length === 4) await verify(next)
  }

  const onKeyInput = async (e) => {
    const v = (e.target.value || '').replace(/\D/g, '').slice(0, 4)
    const arr = v.split('')
    setDigits(arr)
    if (arr.length === 4) {
      await verify(arr)
      e.target.value = ''
    }
  }

  const handleBackspace = () => setDigits(p => p.slice(0, -1))

  if (mode === 'forgot') {
    return <ForgotPin onCancel={() => setMode('pin')} onDone={onUnlock} />
  }

  return (
    <div className="pin-lock" onClick={() => !mobile && hiddenRef.current?.focus()}>
      <Lock size={32} style={{ color: 'var(--accent)' }} />
      <div className="pin-title">Enter PIN</div>
      <div className="pin-sub">
        {mobile ? 'Tap to enter your 4-digit PIN' : 'Type your 4-digit PIN'}
      </div>

      <div className="pin-dots">
        {[0,1,2,3].map(i => (
          <div key={i} className={`pin-dot ${i < digits.length ? 'filled' : ''} ${error ? 'error' : ''}`} />
        ))}
      </div>

      {error && <div className="pin-error">{error}</div>}

      {!mobile && (
        <>
          <input
            ref={hiddenRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="current-password"
            name="pin"
            aria-label="PIN"
            onInput={onKeyInput}
            onBlur={() => setTimeout(() => hiddenRef.current?.focus(), 50)}
            className="pin-hidden-input"
          />
          <div className="pin-hint">Keep typing or paste from your password manager</div>
        </>
      )}

      {mobile && (
        <div className="pin-keypad">
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
            <button
              key={i}
              onClick={() => d === '⌫' ? handleBackspace() : d !== '' ? press(String(d)) : null}
              disabled={d === ''}
              className={`pin-key ${d === '' ? 'empty' : ''}`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <button className="pin-forgot-link" onClick={() => setMode('forgot')}>
        <KeyRound size={12} /> Forgot PIN?
      </button>
    </div>
  )
}

function ForgotPin({ onCancel, onDone }) {
  const [code, setCode]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const isElectron = !!window.api

  const submit = async () => {
    if (!code.trim()) return
    if (!isElectron) { setError('Recovery requires the desktop app.'); return }
    setBusy(true); setError('')
    try {
      const res = await window.api.auth.verifyRecoveryCode({ recoveryCode: code.trim() })
      if (!res?.success) {
        setError(res?.error || 'Invalid recovery code')
        setBusy(false)
        return
      }
      const settings = (await window.api.store.get('settings')) || {}
      delete settings.pin
      await window.api.store.set('settings', settings)
      onDone()
    } catch {
      setError('Something went wrong. Try again.')
    }
    setBusy(false)
  }

  return (
    <div className="pin-lock">
      <KeyRound size={32} style={{ color: 'var(--accent)' }} />
      <div className="pin-title">Reset PIN</div>
      <div className="pin-sub" style={{ maxWidth: 320, textAlign: 'center' }}>
        Enter your account recovery code to clear your PIN. You can set a new one afterwards in Settings.
      </div>
      <input
        className="input mono"
        style={{ width: 320, textAlign: 'center', letterSpacing: 2 }}
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="XXXX-XXXX-XXXX"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
      />
      {error && <div className="pin-error">{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          <ArrowLeft size={12} /> Back
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !code.trim()}>
          {busy ? 'Verifying…' : 'Reset PIN'}
        </button>
      </div>
      <div className="text-xs text-muted" style={{ maxWidth: 320, textAlign: 'center' }}>
        Your recovery code was shown when you created your account. It looks like three groups of characters separated by dashes.
      </div>
    </div>
  )
}

export { sha256 }
