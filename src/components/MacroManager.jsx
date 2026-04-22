import React, { useState, useEffect } from 'react'
import { Zap, Plus, Trash2, Play, Edit2, X, Square, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react'
import WindowPicker from './WindowPicker'

const STEP_TYPES = [
  { value: 'key',    label: 'Key Press',   placeholder: 'e.g. ctrl+alt+.  or  f5' },
  { value: 'text',   label: 'Type Text',   placeholder: 'Text to type...' },
  { value: 'delay',  label: 'Delay (ms)',  placeholder: 'e.g. 500' },
  { value: 'click',  label: 'Mouse Click', placeholder: 'x,y  e.g. 960,540' },
  { value: 'repeat', label: 'Repeat Key',  placeholder: 'key  e.g. ctrl+alt+.' },
  { value: 'app',    label: 'Launch App',  placeholder: 'C:\\path\\to\\app.exe' },
]

function StepRow({ step, index, onChange, onDelete }) {
  const type = STEP_TYPES.find(t => t.value === step.type) || STEP_TYPES[0]
  return (
    <div className="step-item">
      <div className="step-num">{index + 1}</div>
      <select className="input" value={step.type} onChange={e => onChange({ ...step, type: e.target.value, value: '' })} style={{ width: 120, flexShrink: 0 }}>
        {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input className="input mono flex-1" value={step.value || ''} placeholder={type.placeholder} onChange={e => onChange({ ...step, value: e.target.value })} />
      {step.type === 'repeat' && (
        <>
          <input className="input mono" value={step.count||'1'} onChange={e => onChange({...step, count: e.target.value})} placeholder="×" style={{ width: 52 }} />
          <input className="input mono" value={step.interval||'100'} onChange={e => onChange({...step, interval: e.target.value})} placeholder="ms" style={{ width: 72 }} />
        </>
      )}
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete}><X size={12} /></button>
    </div>
  )
}

function MacroModal({ macro, onSave, onClose }) {
  const [name, setName]               = useState(macro?.name || '')
  const [description, setDescription] = useState(macro?.description || '')
  const [steps, setSteps]             = useState(macro?.steps || [])
  const [showAdvanced, setShowAdvanced] = useState(false)
  // Advanced options
  const [loopCount, setLoopCount]     = useState(macro?.loopCount ?? 1)
  const [loopDelay, setLoopDelay]     = useState(macro?.loopDelay ?? 0)
  const [maxDuration, setMaxDuration] = useState(macro?.maxDuration ?? 0)
  const [cancelKey, setCancelKey]     = useState(macro?.cancelKey || '')
  const [targetWindow, setTargetWindow] = useState(macro?.targetWindow || '')
  const [targetWindowRef, setTargetWindowRef] = useState(macro?.targetWindowRef || null)
  const [sendMode, setSendMode]       = useState(macro?.sendMode || 'foreground')
  const [windowList, setWindowList]   = useState([])

  useEffect(() => {
    if (window.api) window.api.system.windows().then(setWindowList).catch(() => {})
  }, [])

  const addStep = (type) => setSteps(s => [...s, { id: Date.now(), type, value: '' }])
  const updateStep = (id, updated) => setSteps(s => s.map(step => step.id === id ? updated : step))
  const deleteStep = (id) => setSteps(s => s.filter(step => step.id !== id))

  const save = () => {
    if (!name.trim()) return
    onSave({
      id: macro?.id || `macro-${Date.now()}`,
      name: name.trim(), description,
      steps,
      loopCount: parseInt(loopCount) || 1,
      loopDelay: parseInt(loopDelay) || 0,
      maxDuration: parseInt(maxDuration) || 0,
      cancelKey: cancelKey.trim(),
      targetWindow: targetWindow.trim(),
      targetWindowRef: targetWindowRef || null,
      sendMode,
      createdAt: macro?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 660, maxHeight: '88vh' }}>
        <div className="modal-header">
          <div className="modal-title">{macro?.id ? 'Edit Macro' : 'New Macro'}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="grid-2 gap-16">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="My Macro" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Steps */}
          <div className="form-group">
            <div className="flex items-center justify-between mb-8">
              <label className="form-label">Steps ({steps.length})</label>
              <div className="flex gap-4">
                {STEP_TYPES.slice(0, 4).map(t => (
                  <button key={t.value} className="btn btn-secondary btn-sm" onClick={() => addStep(t.value)}>+ {t.label}</button>
                ))}
              </div>
            </div>
            <div className="step-list">
              {steps.length === 0 && (
                <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--r)', padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                  Add steps above to build your automation
                </div>
              )}
              {steps.map((step, i) => (
                <StepRow key={step.id} step={step} index={i} onChange={updated => updateStep(step.id, updated)} onDelete={() => deleteStep(step.id)} />
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              className="btn btn-ghost btn-sm w-full"
              style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', borderRadius: 0, padding: '10px 0' }}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Advanced Options</span>
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showAdvanced && (
              <div className="flex-col gap-14 mt-12 animate-in">
                {/* Loop settings */}
                <div className="card" style={{ padding: '14px 16px', background: 'var(--bg-3)' }}>
                  <div className="card-title mb-12" style={{ fontSize: 11 }}>Loop & Duration</div>
                  <div className="grid-2 gap-12">
                    <div className="form-group">
                      <label className="form-label">Loop Count <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(0 = infinite)</span></label>
                      <div className="slider-wrap">
                        <input type="range" min={0} max={100} value={loopCount} onChange={e => setLoopCount(parseInt(e.target.value))} style={{ flex: 1 }} />
                        <span className="slider-value">{loopCount === 0 ? '∞' : loopCount}</span>
                      </div>
                      <input className="input mono mt-8" type="number" value={loopCount} onChange={e => setLoopCount(parseInt(e.target.value)||0)} placeholder="1" min={0} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Delay Between Loops (ms)</label>
                      <div className="slider-wrap">
                        <input type="range" min={0} max={10000} step={100} value={loopDelay} onChange={e => setLoopDelay(parseInt(e.target.value))} style={{ flex: 1 }} />
                        <span className="slider-value">{loopDelay}ms</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Duration (seconds, 0 = no limit)</label>
                      <input className="input mono" type="number" value={maxDuration} onChange={e => setMaxDuration(parseInt(e.target.value)||0)} placeholder="0" min={0} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cancel Shortcut <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                      <input className="input mono" value={cancelKey} onChange={e => setCancelKey(e.target.value)} placeholder="e.g. Alt+F10" />
                      <div className="text-xs text-muted mt-4">Press this key anytime to stop the macro</div>
                    </div>
                  </div>
                </div>

                {/* Window targeting */}
                <div className="card" style={{ padding: '14px 16px', background: 'var(--bg-3)' }}>
                  <div className="card-title mb-12" style={{ fontSize: 11 }}>Window Targeting</div>

                  <div className="form-group">
                    <label className="form-label">Target Window</label>
                    <WindowPicker value={targetWindowRef} onChange={setTargetWindowRef} />
                    <div className="flex items-start gap-6 mt-8">
                      <Info size={11} style={{ color: 'var(--text-3)', marginTop: 1, flexShrink: 0 }} />
                      <span className="text-xs text-muted">
                        Pick a window to target. Leave empty to send to whatever window is active when the macro runs.
                      </span>
                    </div>
                  </div>

                  <div className="form-group mt-12">
                    <label className="form-label">Send Mode</label>
                    <div className="send-mode-group">
                      <button
                        type="button"
                        className={`btn btn-sm flex-1 ${sendMode === 'foreground' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSendMode('foreground')}
                      >
                        Foreground (reliable)
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm flex-1 ${sendMode === 'background' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSendMode('background')}
                      >
                        Background (no focus steal)
                      </button>
                    </div>
                    <div className="text-xs text-muted mt-6">
                      {sendMode === 'foreground'
                        ? 'Activates the target window (brings it to front) before each loop. Works everywhere.'
                        : 'Posts input directly to the window — keeps your current focus. Coordinates for clicks are window-relative.'}
                    </div>
                    {sendMode === 'background' && (
                      <div className="bg-warning-banner mt-8">
                        <AlertTriangle size={12} />
                        <span>Some apps ignore background input — notably games (DirectInput/RawInput), Chromium-based apps (Discord, Chrome, VS Code), and windows running as administrator. Test before scheduling.</span>
                      </div>
                    )}
                  </div>

                  {/* Legacy title field — kept for compatibility with old macros */}
                  {!targetWindowRef && targetWindow && (
                    <div className="form-group mt-12">
                      <label className="form-label">Legacy Target Title <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(from older version)</span></label>
                      <div className="flex gap-8">
                        <input
                          className="input mono flex-1"
                          value={targetWindow}
                          onChange={e => setTargetWindow(e.target.value)}
                          placeholder="e.g. Chrome  or  Notepad  (partial match)"
                          list="window-list"
                        />
                        <button className="btn btn-ghost btn-sm" onClick={() => setTargetWindow('')}>Clear</button>
                      </div>
                      <datalist id="window-list">
                        {windowList.map((w, i) => <option key={i} value={w} />)}
                      </datalist>
                      <div className="text-xs text-muted mt-4">Pick a window above to upgrade to the new picker.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="help-callout">
            <p style={{ fontSize: 12 }}>
              <strong>Key format:</strong> <code>ctrl+c</code>, <code>ctrl+alt+.</code>, <code>f5</code>, <code>enter</code>, <code>tab</code> — use <code>+</code> to combine modifiers.
              Delays are in milliseconds.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>Save Macro</button>
        </div>
      </div>
    </div>
  )
}

export default function MacroManager() {
  const [macros, setMacros]     = useState([])
  const [editing, setEditing]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [running, setRunning]   = useState({})
  const [progress, setProgress] = useState({})
  const isElectron = !!window.api

  useEffect(() => {
    load()
    if (!isElectron) return
    window.api.on('macro:status', ({ id, status }) => setRunning(r => ({ ...r, [id]: status === 'running' })))
    window.api.on('macro:progress', ({ id, pct }) => setProgress(p => ({ ...p, [id]: pct || 0 })))
  }, [])

  const load = async () => {
    if (!isElectron) { setMacros(DEMOS); return }
    setMacros(await window.api.macros.list())
  }

  const saveMacro = async (macro) => {
    if (isElectron) await window.api.macros.save(macro)
    else setMacros(m => { const i = m.findIndex(x => x.id === macro.id); return i >= 0 ? m.map(x => x.id === macro.id ? macro : x) : [...m, macro] })
    await load()
    setShowModal(false); setEditing(null)
  }

  const deleteMacro = async (id) => {
    if (isElectron) await window.api.macros.delete(id)
    else setMacros(m => m.filter(x => x.id !== id))
    await load()
  }

  const runMacro = async (id) => {
    if (!isElectron) return
    setRunning(r => ({ ...r, [id]: true }))
    await window.api.macros.run(id)
    setRunning(r => ({ ...r, [id]: false }))
    setProgress(p => ({ ...p, [id]: 0 }))
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Macros</div>
          <div className="page-subtitle">Build and run key sequences, automations, and loops</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={14} /> New Macro
        </button>
      </div>

      {macros.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Zap size={36} className="empty-state-icon" />
            <div className="empty-state-title">No macros yet</div>
            <div className="empty-state-sub">Create a macro to automate key presses, text, clicks, and more</div>
            <button className="btn btn-primary mt-8" onClick={() => { setEditing(null); setShowModal(true) }}>
              <Plus size={14} /> Create First Macro
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-col gap-8">
          {macros.map(macro => {
            const isRunning = running[macro.id]
            const loopLabel = macro.loopCount === 0 ? '∞ loops' : macro.loopCount > 1 ? `×${macro.loopCount}` : null
            return (
              <div key={macro.id} className="card" style={{ padding: '14px 16px' }}>
                <div className="flex items-center gap-12">
                  <div className="list-item-icon" style={{ background: isRunning ? 'var(--green-dim)' : 'var(--accent-dim)', color: isRunning ? 'var(--green)' : 'var(--accent-h)' }}>
                    <Zap size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-8">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{macro.name}</span>
                      {isRunning && <span className="badge badge-green animate-pulse">Running</span>}
                      <span className="badge badge-accent">{macro.steps?.length || 0} steps</span>
                      {loopLabel && <span className="badge" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>{loopLabel}</span>}
                      {macro.targetWindowRef?.processName && (
                        <span className="badge" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>
                          → {macro.targetWindowRef.processName.slice(0,20)}{macro.sendMode === 'background' ? ' (bg)' : ''}
                        </span>
                      )}
                      {!macro.targetWindowRef && macro.targetWindow && (
                        <span className="badge" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>→ {macro.targetWindow.slice(0,20)}</span>
                      )}
                    </div>
                    {macro.description && <div className="text-muted text-sm mt-4">{macro.description}</div>}
                    {isRunning && (
                      <div className="mt-8">
                        <div className="progress-bar">
                          <div className="progress-fill green" style={{ width: `${progress[macro.id] || 0}%` }} />
                        </div>
                        <div className="text-xs text-muted mt-4">
                          {progress[macro.id] || 0}% {macro.cancelKey && `· Press ${macro.cancelKey} to cancel`}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    {isRunning ? (
                      <button className="btn btn-danger btn-sm" onClick={() => isElectron && window.api.macros.stop(macro.id)}>
                        <Square size={11} /> Stop
                      </button>
                    ) : (
                      <button className="btn btn-success btn-sm" onClick={() => runMacro(macro.id)}>
                        <Play size={11} /> Run
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => { setEditing(macro); setShowModal(true) }}><Edit2 size={12} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteMacro(macro.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <MacroModal macro={editing} onSave={saveMacro} onClose={() => { setShowModal(false); setEditing(null) }} />}
    </div>
  )
}

const DEMOS = [
  { id: 'd1', name: 'Next Slide (Training Video)', description: 'Press Ctrl+Alt+. to advance', steps: [{ id: 1, type: 'key', value: 'ctrl+alt+.' }], loopCount: 1, createdAt: new Date().toISOString() },
  { id: 'd2', name: 'Save & Close', steps: [{ id: 1, type: 'key', value: 'ctrl+s' }, { id: 2, type: 'delay', value: '300' }, { id: 3, type: 'key', value: 'ctrl+w' }], loopCount: 1, createdAt: new Date().toISOString() },
]
