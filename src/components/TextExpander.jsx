import React, { useState, useEffect } from 'react'
import { Type, Plus, Trash2, Save, Play, Square, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

export default function TextExpander() {
  const [expanders, setExpanders] = useState([])
  const [editing, setEditing]     = useState(null)
  const [abbr, setAbbr]           = useState('')
  const [expansion, setExpansion] = useState('')
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState(null) // { running, ahkPath }
  const [statusMsg, setStatusMsg] = useState('')
  const isElectron = !!window.api

  useEffect(() => { load(); loadStatus() }, [])

  const load = async () => {
    if (!isElectron) { setExpanders(DEMOS); return }
    const data = await window.api.store.get('expanders')
    setExpanders(data || [])
  }

  const loadStatus = async () => {
    if (!isElectron) return
    const s = await window.api.expander.status()
    setStatus(s)
  }

  const saveEntry = async () => {
    if (!abbr.trim() || !expansion.trim()) return
    const item = {
      id: editing?.id || `exp-${Date.now()}`,
      abbr: abbr.trim(),
      expansion: expansion.trim(),
      createdAt: editing?.createdAt || new Date().toISOString(),
    }
    const list = editing ? expanders.map(e => e.id === editing.id ? item : e) : [...expanders, item]
    setExpanders(list)
    if (isElectron) {
      await window.api.store.set('expanders', list)
      if (status?.running) await window.api.expander.restart()
    }
    cancel()
  }

  const remove = async (id) => {
    const list = expanders.filter(e => e.id !== id)
    setExpanders(list)
    if (isElectron) {
      await window.api.store.set('expanders', list)
      if (status?.running) await window.api.expander.restart()
    }
  }

  const edit = (item) => { setEditing(item); setAbbr(item.abbr); setExpansion(item.expansion) }
  const cancel = () => { setEditing(null); setAbbr(''); setExpansion('') }

  const startExpander = async () => {
    if (!isElectron) return
    setStatusMsg('Starting...')
    const result = await window.api.expander.start()
    await loadStatus()
    setStatusMsg(result.ok ? '' : result.reason)
  }

  const stopExpander = async () => {
    if (!isElectron) return
    await window.api.expander.stop()
    await loadStatus()
    setStatusMsg('')
  }

  const filtered = expanders.filter(e =>
    e.abbr.toLowerCase().includes(search.toLowerCase()) ||
    e.expansion.toLowerCase().includes(search.toLowerCase())
  )

  const hasAHK = status?.ahkPath
  const isRunning = status?.running

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Text Expander</div>
          <div className="page-subtitle">Type short abbreviations that expand to full text — powered by AutoHotkey</div>
        </div>
        {isElectron && (
          <div className="flex items-center gap-8">
            {isRunning
              ? <><div className="dot-live" /><span className="text-sm" style={{ color: 'var(--green)' }}>Active</span></>
              : <span className="text-sm text-muted">Inactive</span>
            }
            {isRunning
              ? <button className="btn btn-danger btn-sm" onClick={stopExpander}><Square size={12} /> Stop</button>
              : <button className="btn btn-success btn-sm" onClick={startExpander} disabled={!hasAHK && expanders.length === 0}><Play size={12} /> Start</button>
            }
            {isRunning && (
              <button className="btn btn-secondary btn-sm" onClick={async () => { setStatusMsg('Restarting...'); await window.api.expander.restart(); await loadStatus(); setStatusMsg('') }}>
                <RefreshCw size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* AHK status banner */}
      {isElectron && !hasAHK && (
        <div className="card mb-16" style={{ borderColor: 'var(--yellow)', background: 'var(--yellow-dim)' }}>
          <div className="flex items-start gap-10">
            <AlertCircle size={16} style={{ color: 'var(--yellow)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-0)', marginBottom: 4 }}>AutoHotkey not found</div>
              <div className="text-sm text-muted">
                Text Expander requires AutoHotkey to be installed. Download it free from <strong>autohotkey.com</strong> (v1 or v2).
                Once installed, click Start above.
              </div>
            </div>
          </div>
        </div>
      )}

      {isElectron && hasAHK && !isRunning && expanders.length > 0 && (
        <div className="card mb-16" style={{ borderColor: 'var(--blue)', background: 'var(--blue-dim)' }}>
          <div className="flex items-center gap-10">
            <CheckCircle size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>
              AutoHotkey is installed. Click <strong>Start</strong> to activate {expanders.length} text expansion{expanders.length !== 1 ? 's' : ''}.
            </span>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className="card mb-16" style={{ borderColor: 'var(--red)', background: 'var(--red-dim)' }}>
          <span style={{ fontSize: 13, color: 'var(--red)' }}>{statusMsg}</span>
        </div>
      )}

      <div className="grid-2 gap-16" style={{ alignItems: 'start' }}>
        {/* Editor */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Type size={14} className="card-title-icon" /> {editing ? 'Edit Entry' : 'New Entry'}</div>
            {editing && <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>}
          </div>
          <div className="flex-col gap-12">
            <div className="form-group">
              <label className="form-label">Abbreviation</label>
              <input className="input mono" value={abbr} onChange={e => setAbbr(e.target.value)} placeholder=";sig  or  ;;email  or  /ty" />
              <div className="text-xs text-muted mt-4">Prefix with ; or ;; to avoid accidental triggers. Type this + Space/Enter to expand.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Expands To</label>
              <textarea className="input" value={expansion} onChange={e => setExpansion(e.target.value)} placeholder="The full text to insert..." rows={5} />
              <div className="text-xs text-muted mt-4">Supports multiple lines. Will type exactly as entered.</div>
            </div>
            {abbr && expansion && (
              <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--r)', padding: '8px 12px' }}>
                <div className="text-xs text-muted mb-4">Preview</div>
                <div className="flex items-center gap-8">
                  <span className="kbd">{abbr}</span>
                  <span style={{ color: 'var(--text-3)' }}>→</span>
                  <span style={{ fontSize: 12, color: 'var(--text-1)', fontStyle: 'italic' }}>
                    {expansion.slice(0, 60)}{expansion.length > 60 ? '...' : ''}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={saveEntry} disabled={!abbr.trim() || !expansion.trim()}>
                <Save size={13} /> {editing ? 'Update' : 'Add'} Entry
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Type size={14} className="card-title-icon" /> Entries ({filtered.length})</div>
          </div>
          <input className="input mb-12" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." />
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <Type size={24} className="empty-state-icon" />
              <div className="empty-state-sub">{search ? 'No results' : 'No entries yet'}</div>
            </div>
          ) : (
            <div className="list">
              {filtered.map(item => (
                <div key={item.id} className="list-item" onClick={() => edit(item)}>
                  <div className="list-item-body">
                    <div className="flex items-center gap-8">
                      <span className="kbd" style={{ flexShrink: 0 }}>{item.abbr}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 11 }}>→</span>
                      <span className="list-item-title">
                        {item.expansion.slice(0, 50)}{item.expansion.length > 50 ? '...' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="list-item-actions">
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); remove(item.id) }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-title mb-8"><Type size={14} className="card-title-icon" /> How It Works</div>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
          Text Expander uses <strong>AutoHotkey</strong> running silently in the background. When you type an abbreviation
          followed by a space or Enter, it replaces the abbreviation with the full expansion — in any application.
          Changes to entries are applied immediately (the AHK script restarts automatically). The expander runs
          independently of this window, so you can minimize Multitool and it keeps working.
        </p>
      </div>
    </div>
  )
}

const DEMOS = [
  { id: 'd1', abbr: ';sig', expansion: 'Best regards,\nScott', createdAt: new Date().toISOString() },
  { id: 'd2', abbr: ';addr', expansion: '123 Main Street, City, ST 12345', createdAt: new Date().toISOString() },
  { id: 'd3', abbr: ';;ty', expansion: 'Thank you for your message. I will get back to you shortly.', createdAt: new Date().toISOString() },
]
