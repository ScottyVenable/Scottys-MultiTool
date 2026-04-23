import React, { useState, useEffect } from 'react'
import { Settings, Key, Smartphone, Bell, Palette, Save, Check, RefreshCw, Lock, X, Download, FileCog, Code2 } from 'lucide-react'
import { sha256 } from './PinLock'
import ProfileSection from './Auth/ProfileSection'
import { useDevMode } from './DevModeContext'

const ACCENT_PRESETS = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Sky',    color: '#0ea5e9' },
  { name: 'Emerald',color: '#10b981' },
  { name: 'Amber',  color: '#f59e0b' },
  { name: 'Rose',   color: '#f43f5e' },
  { name: 'Slate',  color: '#64748b' },
  { name: 'Teal',   color: '#14b8a6' },
]

export default function AppSettings() {
  const { devMode, toggle: toggleDevMode } = useDevMode()
  const [settings, setSettings] = useState({
    aiProvider: 'lmstudio',
    aiApiKey: '',
    aiApiBase: 'http://localhost:1234',
    aiModel: '',
    mobileEnabled: false,
    mobilePort: 8765,
    startMinimized: false,
    minimizeToTray: true,
    clipboardHistoryMax: 50,
    theme: 'dark',
    startWithWindows: false,
    accentColor: '#6366f1',
  })
  const [saved, setSaved] = useState(false)
  const [pin, setPin] = useState('') // stored hash or ''
  const [pinInput, setPinInput] = useState('')
  const [pinMode, setPinMode] = useState(null) // 'set' | 'change' | null
  const [pinMsg, setPinMsg] = useState('')
  const [updateStatus, setUpdateStatus] = useState('')
  const isElectron = !!window.api

  useEffect(() => { load() }, [])

  const load = async () => {
    if (!isElectron) return
    const s = await window.api.store.get('settings')
    if (s) {
      setSettings(prev => ({ ...prev, ...s }))
      setPin(s.pin || '')
    }
  }

  const save = async () => {
    if (isElectron) await window.api.store.set('settings', settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const savePin = async () => {
    if (!pinInput || pinInput.length < 4) { setPinMsg('Enter at least 4 digits.'); return }
    const hash = await sha256(pinInput)
    const s = (await window.api.store.get('settings')) || {}
    await window.api.store.set('settings', { ...s, pin: hash })
    setPin(hash)
    setPinInput('')
    setPinMode(null)
    setPinMsg('PIN saved.')
    setTimeout(() => setPinMsg(''), 3000)
  }

  const removePin = async () => {
    const s = (await window.api.store.get('settings')) || {}
    delete s.pin
    await window.api.store.set('settings', s)
    setPin('')
    setPinMsg('PIN removed.')
    setTimeout(() => setPinMsg(''), 3000)
  }

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }))

  const applyAccent = (color) => {
    update('accentColor', color)
    document.documentElement.style.setProperty('--accent', color)
  }

  const checkForUpdates = async () => {
    setUpdateStatus('Checking…')
    try {
      const r = await fetch('https://api.github.com/repos/ScottyVenable/Scottys-MultiTool/releases/latest', { cache: 'no-store' })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const json = await r.json()
      const latest = (json.tag_name || '').replace(/^v/, '')
      const current = '1.0.0'
      if (!latest) setUpdateStatus('No releases found.')
      else if (latest === current) setUpdateStatus(`You are up to date (v${current}).`)
      else setUpdateStatus(`New version available: v${latest} (current v${current}).`)
    } catch (e) {
      setUpdateStatus('Update check failed: ' + (e?.message || 'network error'))
    }
    setTimeout(() => setUpdateStatus(''), 8000)
  }

  const Section = ({ icon: Icon, title, children }) => (
    <div className="card mb-16">
      <div className="card-title mb-16"><Icon size={14} className="card-title-icon" /> {title}</div>
      <div className="flex-col gap-14">{children}</div>
    </div>
  )

  const Toggle = ({ label, sub, settingKey }) => (
    <div className="flex items-center justify-between">
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-0)' }}>{label}</div>
        {sub && <div className="text-sm text-muted">{sub}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={!!settings[settingKey]} onChange={e => update(settingKey, e.target.checked)} />
        <span className="toggle-track" />
      </label>
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure MacroBot preferences and integrations</div>
        </div>
        <button className="btn btn-primary" onClick={save}>
          {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Settings</>}
        </button>
      </div>

      {/* Profile & Account */}
      <ProfileSection />

      {/* AI */}
      <Section title="AI Integration" icon={Key}>
        <div className="form-group">
          <label className="form-label">AI Provider</label>
          <select className="input" value={settings.aiProvider} onChange={e => update('aiProvider', e.target.value)}>
            <option value="lmstudio">LM Studio (Local — no API key needed)</option>
            <option value="openai">OpenAI API</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="custom">Custom OpenAI-compatible endpoint</option>
          </select>
        </div>

        {(settings.aiProvider === 'lmstudio' || settings.aiProvider === 'custom') && (
          <div className="form-group">
            <label className="form-label">API Base URL</label>
            <input
              className="input mono"
              value={settings.aiApiBase}
              onChange={e => update('aiApiBase', e.target.value)}
              placeholder="http://localhost:1234"
            />
            <div className="text-xs text-muted mt-8">
              For LM Studio: start the server in LM Studio app, default port is 1234.
              The AI Assistant will use this endpoint for all queries.
            </div>
          </div>
        )}

        {(settings.aiProvider === 'openai' || settings.aiProvider === 'anthropic') && (
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              className="input mono"
              type="password"
              value={settings.aiApiKey}
              onChange={e => update('aiApiKey', e.target.value)}
              placeholder="sk-..."
            />
            <div className="text-xs text-muted mt-8">
              Your API key is stored locally on this device only. Never shared externally.
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Model Name (optional)</label>
          <input
            className="input mono"
            value={settings.aiModel}
            onChange={e => update('aiModel', e.target.value)}
            placeholder={settings.aiProvider === 'lmstudio' ? 'auto-detected from LM Studio' : 'gpt-4o-mini'}
          />
        </div>
      </Section>

      {/* Mobile */}
      <Section title="Mobile Remote" icon={Smartphone}>
        <Toggle
          label="Enable Mobile Remote Server"
          sub="Start the local web server so your phone can control MacroBot"
          settingKey="mobileEnabled"
        />
        <div className="form-group">
          <label className="form-label">Server Port</label>
          <div className="slider-wrap">
            <input
              type="range"
              min={1024}
              max={65535}
              step={1}
              value={settings.mobilePort}
              onChange={e => update('mobilePort', parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <span className="slider-value">{settings.mobilePort}</span>
          </div>
          <div className="text-xs text-muted mt-4">Default: 8765. Change if another app uses this port.</div>
        </div>
      </Section>

      {/* App Behavior */}
      <Section title="App Behavior" icon={Settings}>
        <Toggle label="Start minimized" sub="Launch MacroBot minimized to system tray" settingKey="startMinimized" />
        <Toggle label="Minimize to tray" sub="When closed, minimize to system tray instead of quitting" settingKey="minimizeToTray" />
        <div className="form-group">
          <label className="form-label">Clipboard History Limit</label>
          <div className="slider-wrap">
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={settings.clipboardHistoryMax}
              onChange={e => update('clipboardHistoryMax', parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <span className="slider-value">{settings.clipboardHistoryMax}</span>
          </div>
        </div>
      </Section>

      {/* Windows Shell Integration */}
      <Section title="Windows Integration" icon={FileCog}>
        <ShellIntegrationPanel />
      </Section>

      {/* PIN Lock */}
      <Section title="Journal PIN Lock" icon={Lock}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-0)' }}>{pin ? 'PIN is set' : 'No PIN set'}</div>
            <div className="text-sm text-muted">Protects the Journal tab with a 4-digit PIN</div>
          </div>
          <div className="flex gap-8">
            {pin && <button className="btn btn-danger btn-sm" onClick={removePin}><X size={12} /> Remove PIN</button>}
            <button className="btn btn-secondary btn-sm" onClick={() => { setPinMode('set'); setPinInput('') }}>{pin ? 'Change PIN' : 'Set PIN'}</button>
          </div>
        </div>
        {pinMode === 'set' && (
          <div className="flex gap-8 items-center mt-8">
            <input className="input mono" type="password" maxLength={8} placeholder="Enter new PIN digits" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))} style={{ width: 180 }} />
            <button className="btn btn-primary btn-sm" onClick={savePin}><Check size={12} /> Save PIN</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setPinMode(null); setPinInput('') }}>Cancel</button>
          </div>
        )}
        {pinMsg && <div className="text-xs" style={{ color: 'var(--green)' }}>{pinMsg}</div>}
      </Section>

      {/* Theme */}
      <Section title="Appearance" icon={Palette}>
        <div className="form-group">
          <label className="form-label">Accent Color</label>
          <div className="swatch-row">
            {ACCENT_PRESETS.map(p => (
              <div
                key={p.color}
                className={`swatch ${settings.accentColor === p.color ? 'active' : ''}`}
                style={{ background: p.color }}
                title={p.name}
                onClick={() => applyAccent(p.color)}
              />
            ))}
            <input
              type="color"
              value={settings.accentColor || '#6366f1'}
              onChange={e => applyAccent(e.target.value)}
              style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
              title="Custom color"
            />
          </div>
          <div className="text-xs text-muted mt-4">Click Save Settings to persist your accent color choice.</div>
        </div>
      </Section>

      {/* Updates */}
      <Section title="Updates" icon={Download}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-0)' }}>Scotty's Multitool v1.0.0</div>
            <div className="text-sm text-muted">Check GitHub Releases for newer versions</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={checkForUpdates}>
            <Download size={12} /> Check for Updates
          </button>
        </div>
        {updateStatus && <div className="text-xs" style={{ color: 'var(--text-1)' }}>{updateStatus}</div>}
      </Section>

      {/* Data */}
      <Section title="Data & Backup" icon={RefreshCw}>
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <RefreshCw size={12} /> Reload Settings
          </button>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            if (!isElectron) return
            const r = await window.api.backup.export()
            if (r?.success) alert(`Backup saved:\n${r.path}`)
          }}>Export Backup…</button>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            if (!isElectron) return
            if (!confirm('Import will replace all current data. Continue?')) return
            const r = await window.api.backup.import()
            if (r?.success) { alert('Backup imported. Restarting UI…'); location.reload() }
          }}>Import Backup…</button>
        </div>
        <div className="text-sm text-muted">
          All data (macros, hotkeys, settings) is stored locally on your computer. No data is ever sent to external servers unless you configure an API key for AI features.
        </div>
      </Section>

      {/* Developer */}
      <Section title="Developer" icon={Code2}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 500 }}>Dev Mode</div>
            <div className="text-sm text-muted">
              Unlocks the Dev Tools page for injecting dummy friends, granting coins, inspecting the persisted store, and clearing caches.
            </div>
          </div>
          <label className="toggle" title={devMode ? 'Disable dev mode' : 'Enable dev mode'}>
            <input type="checkbox" checked={devMode} onChange={e => toggleDevMode(e.target.checked)} />
            <span className="toggle-track" />
          </label>
        </div>
        {devMode && (
          <div className="text-xs" style={{ color: 'var(--yellow)', marginTop: 8 }}>
            Dev Mode is on — see the "Dev Tools" entry in the sidebar.
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Windows Shell Integration panel ──────────────────────────────────────────
// Lets the user register/unregister Multitool as an "Open with" option for
// a small set of file extensions. Uses HKCU under the hood (reversible).
function ShellIntegrationPanel() {
  const DEFAULT_EXTS = ['.txt', '.md', '.json', '.log', '.csv']
  const [exts, setExts] = React.useState(DEFAULT_EXTS)
  const [busy, setBusy] = React.useState(false)
  const [status, setStatus] = React.useState(null)
  const isElectron = !!window.api

  const toggle = (e) => {
    setExts(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  const register = async () => {
    if (!isElectron) return
    setBusy(true); setStatus(null)
    const r = await window.api.shellIntegration.register(exts)
    setBusy(false)
    setStatus(r?.success
      ? { ok: true, msg: `Registered: ${exts.join(', ')}. Right-click a matching file → Open with → Choose another app.` }
      : { ok: false, msg: r?.error || 'Failed to register' })
  }
  const unregister = async () => {
    if (!isElectron) return
    setBusy(true); setStatus(null)
    const r = await window.api.shellIntegration.unregister(DEFAULT_EXTS)
    setBusy(false)
    setStatus(r?.success
      ? { ok: true, msg: 'Unregistered. Multitool will no longer appear in "Open with".' }
      : { ok: false, msg: r?.error || 'Failed to unregister' })
  }

  return (
    <div>
      <div className="text-sm text-muted mb-8">
        Register Multitool as an "Open with" handler for these file types. Files opened this way land in the File Manager preview.
      </div>
      <div className="flex gap-6 mb-12" style={{ flexWrap: 'wrap' }}>
        {DEFAULT_EXTS.map(e => (
          <button key={e}
            className={`btn btn-sm ${exts.includes(e) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => toggle(e)}>
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-8">
        <button className="btn btn-primary btn-sm" onClick={register} disabled={busy || !isElectron || exts.length === 0}>
          Register selected
        </button>
        <button className="btn btn-ghost btn-sm" onClick={unregister} disabled={busy || !isElectron}>
          Unregister
        </button>
      </div>
      {status && (
        <div className="text-xs mt-8" style={{ color: status.ok ? 'var(--green)' : 'var(--red)' }}>
          {status.msg}
        </div>
      )}
    </div>
  )
}
