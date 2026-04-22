import React, { useState } from 'react'
import { Lock } from 'lucide-react'

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PinLock({ storedHash, onUnlock }) {
  const [digits, setDigits] = useState([])
  const [error, setError] = useState('')

  const press = async (d) => {
    if (digits.length >= 4) return
    const next = [...digits, d]
    setDigits(next)
    if (next.length === 4) {
      const hash = await sha256(next.join(''))
      if (hash === storedHash) {
        onUnlock()
      } else {
        setError('Incorrect PIN')
        setTimeout(() => { setDigits([]); setError('') }, 800)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 24 }}>
      <Lock size={32} style={{ color: 'var(--accent)' }} />
      <div style={{ fontSize: 18, fontWeight: 600 }}>Enter PIN</div>
      {/* Dots */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: i < digits.length ? 'var(--accent)' : 'var(--bg-3)', border: '2px solid var(--border)', transition: 'background .15s' }} />
        ))}
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
          <button key={i} onClick={() => d === '⌫' ? setDigits(p => p.slice(0,-1)) : d !== '' ? press(String(d)) : null}
            disabled={d === ''}
            style={{ width: 60, height: 60, borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', background: d === '' ? 'transparent' : 'var(--bg-2)', fontSize: 20, fontWeight: 500, cursor: d === '' ? 'default' : 'pointer', color: 'var(--text-0)' }}>
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

export { sha256 }
