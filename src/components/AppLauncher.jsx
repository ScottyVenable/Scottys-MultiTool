import React, { useState, useEffect } from 'react'
import { Rocket, Plus, Trash2, ExternalLink, X, Save } from 'lucide-react'

const COMMON_APPS = [
  { name: 'Notepad', path: 'notepad.exe' },
  { name: 'Calculator', path: 'calc.exe' },
  { name: 'Task Manager', path: 'taskmgr.exe' },
  { name: 'Explorer', path: 'explorer.exe' },
  { name: 'Paint', path: 'mspaint.exe' },
  { name: 'Command Prompt', path: 'cmd.exe' },
  { name: 'PowerShell', path: 'powershell.exe' },
  { name: 'Notepad++', path: 'C:\\Program Files\\Notepad++\\notepad++.exe' },
  { name: 'VS Code', path: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe' },
  { name: 'Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
]

export default function AppLauncher() {
  const [launchers, setLaunchers] = useState([])
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [editing, setEditing] = useState(null)
  const isElectron = !!window.api

  useEffect(() => { load() }, [])

  const load = async () => {
    if (!isElectron) { setLaunchers([]); return }
    const data = await window.api.store.get('appLaunchers')
    setLaunchers(data || [])
  }

  const save = async () => {
    if (!name.trim() || !path.trim()) return
    const item = { id: editing?.id || `app-${Date.now()}`, name: name.trim(), path: path.trim() }
    const list = editing ? launchers.map(x => x.id === editing.id ? item : x) : [...launchers, item]
    setLaunchers(list)
    if (isElectron) await window.api.store.set('appLaunchers', list)
    setName(''); setPath(''); setEditing(null)
  }

  const remove = async (id) => {
    const list = launchers.filter(x => x.id !== id)
    setLaunchers(list)
    if (isElectron) await window.api.store.set('appLaunchers', list)
  }

  const launch = (p) => {
    if (isElectron) window.api.app.launch(p)
  }

  const addCommon = async (app) => {
    if (launchers.find(l => l.path === app.path)) return
    const list = [...launchers, { id: `app-${Date.now()}-${Math.random()}`, ...app }]
    setLaunchers(list)
    if (isElectron) await window.api.store.set('appLaunchers', list)
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">App Launcher</div>
          <div className="page-subtitle">Quick-launch applications with a single click</div>
        </div>
      </div>

      <div className="grid-2 gap-16" style={{ alignItems: 'start' }}>
        <div className="flex-col gap-16">
          <div className="card">
            <div className="card-title mb-12"><Rocket size={14} className="card-title-icon" /> {editing ? 'Edit' : 'Add'} App</div>
            <div className="flex-col gap-10">
              <div className="form-group">
                <label className="form-label">App Name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Notepad" />
              </div>
              <div className="form-group">
                <label className="form-label">Executable Path</label>
                <input className="input mono" value={path} onChange={e => setPath(e.target.value)} placeholder="e.g. notepad.exe or C:\path\app.exe" />
              </div>
              <div className="flex gap-8 justify-between">
                {editing && <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(null); setName(''); setPath('') }}>Cancel</button>}
                <button className="btn btn-primary" onClick={save} disabled={!name || !path}>
                  <Save size={13} /> {editing ? 'Update' : 'Add App'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title mb-12">Common Apps</div>
            <div className="flex-col gap-4">
              {COMMON_APPS.map(app => (
                <div key={app.path} className="flex items-center gap-8 justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-1)' }}>{app.name}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => addCommon(app)}>+ Add</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-12"><Rocket size={14} className="card-title-icon" /> Your Apps ({launchers.length})</div>
          {launchers.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <Rocket size={28} className="empty-state-icon" />
              <div className="empty-state-sub">Add apps to launch them with one click</div>
            </div>
          ) : (
            <div className="flex-col gap-6">
              {launchers.map(app => (
                <div key={app.id} className="list-item">
                  <div className="list-item-icon"><Rocket size={13} /></div>
                  <div className="list-item-body">
                    <div className="list-item-title">{app.name}</div>
                    <div className="list-item-sub font-mono">{app.path}</div>
                  </div>
                  <div className="list-item-actions">
                    <button className="btn btn-success btn-sm btn-icon" onClick={() => launch(app.path)} data-tip="Launch">
                      <ExternalLink size={12} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditing(app); setName(app.name); setPath(app.path) }} data-tip="Edit">
                      <Plus size={12} style={{ transform: 'rotate(45deg)' }} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(app.id)} data-tip="Remove">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
