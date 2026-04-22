import React, { useRef, useState } from 'react'
import { User, Save, Upload, KeyRound, LogOut, Trash2, Download, Check, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthContext'

const PAGE_CHOICES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'macros', label: 'Macros' },
  { id: 'journal', label: 'Journal' },
  { id: 'chores', label: 'Chore Planner' },
  { id: 'browser', label: 'Browser' },
  { id: 'ai', label: 'AI Workstation' },
]

const ACCENTS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#64748b', '#14b8a6']

async function fileToDataUrl(file, maxDim = 256) {
  const img = new Image()
  const reader = new FileReader()
  const url = await new Promise((res, rej) => {
    reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(file)
  })
  img.src = url
  await new Promise(res => { img.onload = res; img.onerror = res })
  const cnv = document.createElement('canvas')
  const size = Math.min(maxDim, Math.max(img.width, img.height) || maxDim)
  const scale = Math.min(1, size / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale); const h = Math.round(img.height * scale)
  cnv.width = w; cnv.height = h
  const ctx = cnv.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  try { return cnv.toDataURL('image/jpeg', 0.85) } catch { return url }
}

export default function ProfileSection() {
  const { user, updateProfile, changePassword, logout, deleteAccount } = useAuth()
  const fileRef = useRef(null)
  const [form, setForm] = useState(() => ({
    displayName: user?.displayName || '',
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    bannerColor: user?.bannerColor || '#6366f1',
    avatarDataUrl: user?.avatarDataUrl || '',
    preferences: {
      theme: 'dark',
      accentColor: '#6366f1',
      defaultPage: 'dashboard',
      sidebarDensity: 'comfortable',
      soundsOn: true,
      ...(user?.preferences || {}),
    },
  }))
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('')
  const [pwForm, setPwForm] = useState({ old: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')

  if (!user) return null

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const updatePref = (key, value) => setForm(f => ({ ...f, preferences: { ...f.preferences, [key]: value } }))

  const onPickAvatar = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    try {
      const dataUrl = await fileToDataUrl(f)
      update('avatarDataUrl', dataUrl)
    } catch { setError('Could not read that image.') }
  }

  const onSave = async () => {
    setError(''); setSaveMsg('')
    const r = await updateProfile(form)
    if (r?.success) {
      setSaveMsg('Profile saved.')
      // apply accent immediately
      if (form.preferences?.accentColor) document.documentElement.style.setProperty('--accent', form.preferences.accentColor)
      setTimeout(() => setSaveMsg(''), 1800)
    } else setError(r?.error || 'Could not save profile.')
  }

  const onChangePw = async () => {
    setPwError(''); setPwMsg('')
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return }
    const r = await changePassword({ oldPassword: pwForm.old, newPassword: pwForm.next })
    if (r?.success) { setPwForm({ old: '', next: '', confirm: '' }); setPwMsg('Password updated.'); setTimeout(() => setPwMsg(''), 2000) }
    else setPwError(r?.error || 'Failed to update password.')
  }

  const onDelete = async () => {
    const r = await deleteAccount({ password: deletePw })
    if (!r?.success) setError(r?.error || 'Could not delete account.')
  }

  const initials = (user.displayName || user.username || '?').charAt(0).toUpperCase()

  return (
    <div className="card mb-16">
      <div className="card-title mb-16"><User size={14} className="card-title-icon" /> Profile</div>

      {/* Banner + avatar */}
      <div style={{ borderRadius: 'var(--r)', height: 70, background: `linear-gradient(135deg, ${form.bannerColor}, var(--bg-3))`, position: 'relative', marginBottom: 14 }}>
        <div style={{ position: 'absolute', left: 16, bottom: -22, width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, boxShadow: '0 6px 16px rgba(0,0,0,0.4)', border: '3px solid var(--bg-1)', overflow: 'hidden' }}>
          {form.avatarDataUrl ? <img src={form.avatarDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', right: 8, bottom: 8 }} onClick={() => fileRef.current?.click()}>
          <Upload size={12} /> Change avatar
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickAvatar} />
      </div>
      <div style={{ height: 14 }} />

      <div className="grid grid-2 gap-14">
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input className="input" value={form.displayName} onChange={e => update('displayName', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="input" value={form.username} onChange={e => update('username', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Email (optional)</label>
        <input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Bio</label>
        <textarea className="input" rows={3} value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="A short description (supports plain text)" />
      </div>

      <div className="form-group">
        <label className="form-label">Banner color</label>
        <div className="swatch-row">
          {ACCENTS.map(c => (
            <div key={c} className={`swatch ${form.bannerColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => update('bannerColor', c)} />
          ))}
        </div>
      </div>

      <div className="grid grid-2 gap-14">
        <div className="form-group">
          <label className="form-label">Accent color (per profile)</label>
          <div className="swatch-row">
            {ACCENTS.map(c => (
              <div key={c} className={`swatch ${form.preferences.accentColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => { updatePref('accentColor', c); document.documentElement.style.setProperty('--accent', c) }} />
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Default landing page</label>
          <select className="input" value={form.preferences.defaultPage} onChange={e => updatePref('defaultPage', e.target.value)}>
            {PAGE_CHOICES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-2 gap-14">
        <div className="form-group">
          <label className="form-label">Sidebar density</label>
          <select className="input" value={form.preferences.sidebarDensity} onChange={e => updatePref('sidebarDensity', e.target.value)}>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notification sounds</label>
          <select className="input" value={form.preferences.soundsOn ? 'on' : 'off'} onChange={e => updatePref('soundsOn', e.target.value === 'on')}>
            <option value="on">On</option>
            <option value="off">Off (silent)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-8 mt-8">
        <button className="btn btn-primary" onClick={onSave}><Save size={13} /> {saveMsg ? 'Saved!' : 'Save Profile'}</button>
        <button className="btn btn-ghost" onClick={logout}><LogOut size={13} /> Sign out</button>
        {error && <span className="text-xs" style={{ color: 'var(--red)' }}><AlertCircle size={11} style={{ verticalAlign: 'middle' }} /> {error}</span>}
        {saveMsg && <span className="text-xs" style={{ color: 'var(--green)' }}><Check size={11} style={{ verticalAlign: 'middle' }} /> {saveMsg}</span>}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0 14px' }} />

      <div className="card-title mb-16"><KeyRound size={14} className="card-title-icon" /> Change password</div>
      <div className="grid grid-2 gap-14">
        <div className="form-group">
          <label className="form-label">Current password</label>
          <input className="input" type="password" value={pwForm.old} onChange={e => setPwForm(f => ({ ...f, old: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">New password</label>
          <input className="input" type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Confirm new password</label>
        <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
      </div>
      <div className="flex items-center gap-8">
        <button className="btn btn-secondary" onClick={onChangePw}><KeyRound size={13} /> Update password</button>
        {pwError && <span className="text-xs" style={{ color: 'var(--red)' }}>{pwError}</span>}
        {pwMsg && <span className="text-xs" style={{ color: 'var(--green)' }}>{pwMsg}</span>}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0 14px' }} />

      <div className="card-title mb-16" style={{ color: 'var(--red)' }}><Trash2 size={14} className="card-title-icon" /> Danger zone</div>
      {!confirmDelete ? (
        <button className="btn btn-ghost" onClick={() => setConfirmDelete(true)} style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <Trash2 size={13} /> Delete this account
        </button>
      ) : (
        <div className="flex-col gap-8">
          <div className="text-xs text-muted">Deleting removes your account and all personal data for this profile. This cannot be undone.</div>
          <div className="flex gap-8 items-center">
            <input className="input" type="password" placeholder="Password to confirm" value={deletePw} onChange={e => setDeletePw(e.target.value)} style={{ maxWidth: 240 }} />
            <button className="btn" style={{ background: 'var(--red)', color: '#fff' }} onClick={onDelete}>Delete permanently</button>
            <button className="btn btn-ghost" onClick={() => { setConfirmDelete(false); setDeletePw('') }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
