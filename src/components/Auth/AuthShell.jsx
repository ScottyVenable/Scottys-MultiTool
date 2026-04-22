import React from 'react'
import { Wrench } from 'lucide-react'

// Shared wrapper for the auth screens — themed matches the splash screen.
export default function AuthShell({ children, subtitle }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell-bg" />
      <div className="auth-shell-card animate-in">
        <div className="auth-shell-brand">
          <div className="auth-shell-logo">
            <Wrench size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div className="auth-shell-title">Scotty's Multitool</div>
            <div className="auth-shell-subtitle">{subtitle || 'Local account — your data stays on this device'}</div>
          </div>
        </div>
        {children}
        <div className="auth-shell-footnote">
          Local authentication protects this installation only. It is not cloud-synced.
        </div>
      </div>
    </div>
  )
}
