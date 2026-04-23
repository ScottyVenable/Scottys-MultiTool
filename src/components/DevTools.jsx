import React, { useState, useEffect } from 'react'
import { Wrench, Users, Coins, Database, Trash2, Plus, RefreshCw, Zap, Award, AlertTriangle } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { useFriends } from './FriendsContext'
import { useToast } from './Toast'
import { useDevMode } from './DevModeContext'

// Dev Tools panel. Only rendered when dev mode is on (see App.jsx routing).
// Exposes debug-only affordances: inject dummy friends to exercise the social
// UI without another running instance, adjust coin balance, inspect & clear
// persisted stores, and trigger common award events manually.

const DUMMY_NAMES = [
  { id: 'dev-alice',   name: 'Alice',   activity: 'focusing on Midnight Feature',    status: 'online' },
  { id: 'dev-bob',     name: 'Bob',     activity: 'playing Stardew Valley',          status: 'online' },
  { id: 'dev-charlie', name: 'Charlie', activity: 'relaxing',                         status: 'online' },
  { id: 'dev-diana',   name: 'Diana',   activity: 'taking a break',                   status: 'away' },
  { id: 'dev-eve',     name: 'Eve',     activity: '',                                 status: 'offline' },
]

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card mb-12">
      <div className="card-title mb-12"><Icon size={14} className="card-title-icon" /> {title}</div>
      {children}
    </div>
  )
}

export default function DevTools() {
  const { devMode, toggle } = useDevMode()
  const { coins, transactions, purchases, grant, reset, award } = useCurrency()
  const { dummyFriends = [], addDummyFriend, removeDummyFriend, clearDummyFriends, friends, myId } = useFriends()
  const toast = useToast()
  const [storeKeys, setStoreKeys] = useState([])
  const [rawValue, setRawValue] = useState('')
  const [activeKey, setActiveKey] = useState('')
  const [grantAmount, setGrantAmount] = useState(100)

  const isElectron = !!window.api

  async function refreshStoreKeys() {
    if (!isElectron) return
    // No API for listing keys — show the known ones used across the app.
    setStoreKeys([
      'settings', 'macros', 'hotkeys', 'expanderRules', 'notes', 'journal', 'reminders',
      'clipboard', 'scheduler', 'chores', 'choreHouseholds', 'choreProfile',
      'customComponents', 'marketplace', 'bookmarks', 'aiSettings', 'mediaLibrary',
    ])
  }

  useEffect(() => { refreshStoreKeys() }, [])

  async function inspectKey(key) {
    if (!isElectron) return
    setActiveKey(key)
    try {
      const v = await window.api.store.get(key)
      setRawValue(JSON.stringify(v, null, 2))
    } catch (e) {
      setRawValue(`// error: ${e?.message || e}`)
    }
  }

  async function clearKey(key) {
    if (!isElectron || !confirm(`Clear store key "${key}"? This cannot be undone.`)) return
    try {
      await window.api.store.set(key, null)
      toast.show({ type: 'success', title: 'Cleared', message: key })
      if (activeKey === key) setRawValue('null')
    } catch (e) {
      toast.show({ type: 'error', title: 'Failed to clear', message: String(e?.message || e) })
    }
  }

  function addRandomDummy() {
    const remaining = DUMMY_NAMES.filter(d => !dummyFriends.find(f => f.id === d.id))
    const pick = remaining[0]
    if (!pick) { toast.show({ type: 'info', title: 'All dummy friends already added' }); return }
    addDummyFriend({
      id: pick.id,
      name: pick.name,
      presence: { userId: pick.id, status: pick.status, activity: pick.activity, online: pick.status !== 'offline', ts: Date.now() },
    })
    toast.show({ type: 'success', title: 'Dummy friend added', message: pick.name })
  }

  function clearErrorLog() {
    try { localStorage.removeItem('macrobot:errors'); toast.show({ type: 'success', title: 'Error log cleared' }) }
    catch (e) { toast.show({ type: 'error', title: 'Failed', message: String(e?.message || e) }) }
  }

  function clearChatHistory() {
    try {
      localStorage.removeItem('ai-chat-history')
      localStorage.removeItem('ai-cli-state')
      toast.show({ type: 'success', title: 'Chat + CLI history cleared' })
    } catch (e) { toast.show({ type: 'error', title: 'Failed', message: String(e?.message || e) }) }
  }

  if (!devMode) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">Dev Tools</div>
            <div className="page-subtitle">Developer-only utilities</div>
          </div>
        </div>
        <div className="card text-center" style={{ padding: 32 }}>
          <AlertTriangle size={28} style={{ color: 'var(--yellow)', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Dev Mode is off</div>
          <div className="text-sm text-muted mb-16">Enable it in Settings → Developer to access debug utilities.</div>
          <button className="btn btn-primary btn-sm" onClick={() => toggle(true)}>
            <Zap size={13} /> Enable Dev Mode
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Dev Tools</div>
          <div className="page-subtitle">Developer-only utilities — changes affect local data</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => toggle(false)}>Disable Dev Mode</button>
      </div>

      <div className="grid-2 gap-12" style={{ alignItems: 'start' }}>
        <div>
          <Section title="Dummy Friends" icon={Users}>
            <div className="text-xs text-muted mb-8">
              Inject fake friend entries into the Friends panel to exercise presence states and layouts.
            </div>
            <div className="flex gap-6 mb-12" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={addRandomDummy}><Plus size={11} /> Add dummy friend</button>
              <button className="btn btn-ghost btn-sm" onClick={clearDummyFriends} disabled={!dummyFriends.length}>
                <Trash2 size={11} /> Clear all
              </button>
            </div>
            {dummyFriends.length === 0 ? (
              <div className="text-sm text-muted">No dummy friends added yet.</div>
            ) : (
              <div className="flex-col gap-6">
                {dummyFriends.map(d => (
                  <div key={d.id} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                    <div className="flex items-center gap-8">
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: d.presence?.online ? 'var(--green)' : 'var(--text-3)',
                      }} />
                      <span style={{ fontWeight: 500 }}>{d.name}</span>
                      {d.presence?.activity && <span className="text-xs text-muted">· {d.presence.activity}</span>}
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeDummyFriend(d.id)}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-muted mt-8">
              My ID: <span className="mono">{myId}</span> · Real friends: {friends.length - dummyFriends.length}
            </div>
          </Section>

          <Section title="Currency" icon={Coins}>
            <div className="flex items-center gap-8 mb-8">
              <div className="text-sm">Balance: <b style={{ color: 'var(--yellow)' }}>{coins.toLocaleString()} coins</b></div>
            </div>
            <div className="flex gap-6 items-center mb-8" style={{ flexWrap: 'wrap' }}>
              <input
                type="number"
                className="input mono"
                value={grantAmount}
                onChange={e => setGrantAmount(parseInt(e.target.value) || 0)}
                style={{ width: 100 }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => grant(grantAmount, 'Dev grant')}>
                <Plus size={11} /> Grant
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => grant(-Math.abs(grantAmount), 'Dev deduct')}>
                Deduct
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (!confirm('Reset all currency state? This will zero out coins and transactions.')) return
                reset()
                toast.show({ type: 'success', title: 'Currency reset' })
              }}>
                <RefreshCw size={11} /> Reset
              </button>
            </div>
            <div className="flex gap-6 flex-wrap">
              {['focus_complete','chore_complete','reminder_ack','macro_run'].map(kind => (
                <button key={kind} className="btn btn-ghost btn-sm" onClick={() => award(kind, { label: `[dev] ${kind}` })}>
                  <Award size={11} /> Trigger {kind}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted mt-8">
              Recent transactions: {transactions.length} · Purchases: {purchases.length}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Persisted Store" icon={Database}>
            <div className="text-xs text-muted mb-8">
              Inspect and clear any known store key. Changes take effect immediately.
            </div>
            <div className="flex gap-4 mb-8" style={{ flexWrap: 'wrap' }}>
              {storeKeys.map(k => (
                <button
                  key={k}
                  className={`btn btn-sm ${activeKey === k ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => inspectKey(k)}
                  style={{ fontSize: 10.5 }}
                >
                  {k}
                </button>
              ))}
            </div>
            {activeKey && (
              <div className="flex-col gap-6">
                <div className="flex items-center gap-6">
                  <span className="text-sm" style={{ fontWeight: 600 }}>{activeKey}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => inspectKey(activeKey)} title="Reload">
                    <RefreshCw size={10} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => clearKey(activeKey)}>
                    <Trash2 size={10} /> Clear
                  </button>
                </div>
                <pre
                  className="mono"
                  style={{
                    background: 'var(--bg-0)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 11,
                    maxHeight: 320,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >{rawValue || '(empty)'}</pre>
              </div>
            )}
          </Section>

          <Section title="Maintenance" icon={Wrench}>
            <div className="flex-col gap-8">
              <button className="btn btn-secondary btn-sm" onClick={clearErrorLog}>
                <Trash2 size={11} /> Clear error log (localStorage)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={clearChatHistory}>
                <Trash2 size={11} /> Clear AI chat + CLI history
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                if (!confirm('This will reload the window. Continue?')) return
                location.reload()
              }}>
                <RefreshCw size={11} /> Reload window
              </button>
              <div className="text-xs text-muted">
                Error log entries are kept in <span className="mono">localStorage['macrobot:errors']</span>.
                Chat history lives under <span className="mono">ai-chat-history</span>.
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
