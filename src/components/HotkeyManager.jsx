import React, { useState, useEffect } from 'react'
import { Keyboard, Plus, Trash2, X, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'

const ELECTRON_COMBOS = [
  'CommandOrControl+Shift+F1', 'CommandOrControl+Shift+F2', 'CommandOrControl+Shift+F3',
  'Alt+F1', 'Alt+F2', 'Alt+F3', 'Alt+F4', 'Alt+F5',
  'CommandOrControl+Alt+1', 'CommandOrControl+Alt+2', 'CommandOrControl+Alt+3',
]

function HotkeyModal({ hotkey, macros, onSave, onClose }) {
  const [combo, setCombo] = useState(hotkey?.combo || '')
  const [macroId, setMacroId] = useState(hotkey?.macroId || '')
  const [enabled, setEnabled] = useState(hotkey?.enabled !== false)
  const [recording, setRecording] = useState(false)

  const save = () => {
    if (!combo || !macroId) return
    onSave({
      id: hotkey?.id || `hk-${Date.now()}`,
      combo,
      macroId,
      enabled,
    })
  }

  const handleKeyDown = (e) => {
    if (!recording) return
    e.preventDefault()
    const mods = []
    if (e.ctrlKey || e.metaKey) mods.push('CommandOrControl')
    if (e.altKey) mods.push('Alt')
    if (e.shiftKey) mods.push('Shift')
    const key = e.key
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return
    const combo = [...mods, key.length === 1 ? key.toUpperCase() : key].join('+')
    setCombo(combo)
    setRecording(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{hotkey?.id ? 'Edit Hotkey' : 'New Hotkey'}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Key Combination</label>
            <div className="flex gap-8">
              <input
                className="input mono flex-1"
                value={combo}
                onChange={e => setCombo(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={recording ? 'Press your key combo...' : 'e.g. CommandOrControl+Shift+F1'}
                style={{ borderColor: recording ? 'var(--accent)' : undefined }}
              />
              <button
                className={`btn ${recording ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setRecording(!recording)}
              >
                {recording ? 'Cancel' : 'Record'}
              </button>
            </div>
            {recording && (
              <div className="text-sm text-muted mt-8 animate-pulse">Press any key combination now...</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Trigger Macro</label>
            <select className="input" value={macroId} onChange={e => setMacroId(e.target.value)}>
              <option value="">Select a macro...</option>
              {macros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between" style={{ padding: '10px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>Enabled</span>
            <label className="toggle">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>

          <div className="help-callout">
            <p style={{ fontSize: 12 }}>
              Use <code>CommandOrControl</code> for Ctrl/Cmd, <code>Alt</code>, <code>Shift</code>.
              Example: <code>CommandOrControl+Alt+P</code>. Click <strong>Record</strong> to capture a combo.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Quick Presets</label>
            <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
              {ELECTRON_COMBOS.map(c => (
                <button key={c} className="kbd" style={{ cursor: 'pointer' }} onClick={() => setCombo(c)}>{c}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!combo || !macroId}>Save Hotkey</button>
        </div>
      </div>
    </div>
  )
}

export default function HotkeyManager() {
  const [hotkeys, setHotkeys] = useState([])
  const [macros, setMacros] = useState([])
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const isElectron = !!window.api

  useEffect(() => { load() }, [])

  const load = async () => {
    if (!isElectron) { setHotkeys([]); setMacros([]); return }
    const [hks, mcs] = await Promise.all([window.api.hotkeys.list(), window.api.macros.list()])
    setHotkeys(hks)
    setMacros(mcs)
  }

  const saveHotkey = async (hotkey) => {
    if (!isElectron) return
    await window.api.hotkeys.save(hotkey)
    await load()
    setShowModal(false)
    setEditing(null)
  }

  const deleteHotkey = async (id) => {
    if (!isElectron) return
    await window.api.hotkeys.delete(id)
    await load()
  }

  const toggleHotkey = async (hk) => {
    await saveHotkey({ ...hk, enabled: !hk.enabled })
  }

  const getMacroName = (id) => macros.find(m => m.id === id)?.name || 'Unknown macro'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Hotkeys</div>
          <div className="page-subtitle">Bind global keyboard shortcuts to trigger macros instantly</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }} disabled={macros.length === 0}>
          <Plus size={14} /> New Hotkey
        </button>
      </div>

      {macros.length === 0 && (
        <div className="card mb-16" style={{ borderColor: 'var(--yellow)', background: 'var(--yellow-dim)' }}>
          <div className="flex items-center gap-8">
            <AlertCircle size={16} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>
              Create at least one macro before binding hotkeys. Hotkeys trigger macros when pressed anywhere.
            </span>
          </div>
        </div>
      )}

      {hotkeys.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Keyboard size={36} className="empty-state-icon" />
            <div className="empty-state-title">No hotkeys configured</div>
            <div className="empty-state-sub">Bind a keyboard shortcut to run macros from any application</div>
          </div>
        </div>
      ) : (
        <div className="flex-col gap-8">
          {hotkeys.map(hk => (
            <div key={hk.id} className="card" style={{ padding: '14px 16px', opacity: hk.enabled ? 1 : 0.5 }}>
              <div className="flex items-center gap-12">
                <div className="list-item-icon" style={{ background: hk.enabled ? 'var(--green-dim)' : 'var(--bg-3)', color: hk.enabled ? 'var(--green)' : 'var(--text-3)' }}>
                  <Keyboard size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-8">
                    <span className="kbd">{hk.combo}</span>
                    <span style={{ color: 'var(--text-3)' }}>→</span>
                    <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{getMacroName(hk.macroId)}</span>
                  </div>
                  <div className="flex items-center gap-8 mt-8">
                    {hk.enabled ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>Disabled</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <label className="toggle" data-tip={hk.enabled ? 'Disable' : 'Enable'}>
                    <input type="checkbox" checked={hk.enabled} onChange={() => toggleHotkey(hk)} />
                    <span className="toggle-track" />
                  </label>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteHotkey(hk.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <HotkeyModal
          hotkey={editing}
          macros={macros}
          onSave={saveHotkey}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
