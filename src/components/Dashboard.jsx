import React, { useState, useEffect } from 'react'
import { Zap, Keyboard, Type, Clock, Activity, Play, ChevronRight, TrendingUp } from 'lucide-react'

export default function Dashboard({ onNavigate }) {
  const [macros, setMacros] = useState([])
  const [hotkeys, setHotkeys] = useState([])
  const [sysInfo, setSysInfo] = useState(null)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.macros.list().then(setMacros).catch(() => {})
    window.api.hotkeys.list().then(setHotkeys).catch(() => {})
    window.api.system.info().then(setSysInfo).catch(() => {})
    const handler = (info) => setSysInfo(info)
    window.api.on('system:update', handler)
  }, [])

  const runMacro = async (id) => {
    if (!isElectron) return
    await window.api.macros.run(id)
  }

  const stats = [
    { label: 'Macros', value: macros.length, icon: Zap, color: 'var(--accent)', action: 'macros' },
    { label: 'Hotkeys', value: hotkeys.filter(h => h.enabled).length, icon: Keyboard, color: 'var(--green)', action: 'hotkeys' },
    { label: 'Active', value: hotkeys.filter(h => h.enabled).length, icon: Activity, color: 'var(--yellow)', action: 'hotkeys' },
    { label: 'CPU', value: sysInfo ? `${sysInfo.cpu}%` : '--', icon: TrendingUp, color: 'var(--blue)', action: 'system' },
  ]

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview of your automation workspace</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-16">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div className="stat-card" key={s.label} style={{ cursor: 'pointer' }} onClick={() => onNavigate(s.action)}>
              <div className="flex items-center justify-between mb-8">
                <div className="stat-label">{s.label}</div>
                <Icon size={14} style={{ color: s.color }} />
              </div>
              <div className="stat-value">{s.value}</div>
            </div>
          )
        })}
      </div>

      <div className="grid-2 gap-16">
        {/* Recent Macros */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Zap size={14} className="card-title-icon" /> Recent Macros</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('macros')}>
              View all <ChevronRight size={12} />
            </button>
          </div>
          {macros.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <Zap size={24} className="empty-state-icon" />
              <div className="empty-state-title">No macros yet</div>
              <div className="empty-state-sub">Create your first macro to get started</div>
              <button className="btn btn-primary btn-sm mt-8" onClick={() => onNavigate('macros')}>
                Create Macro
              </button>
            </div>
          ) : (
            <div className="list">
              {macros.slice(0, 5).map(m => (
                <div className="list-item" key={m.id}>
                  <div className="list-item-icon"><Zap size={14} /></div>
                  <div className="list-item-body">
                    <div className="list-item-title">{m.name}</div>
                    <div className="list-item-sub">{m.steps?.length || 0} steps</div>
                  </div>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => runMacro(m.id)} data-tip="Run">
                    <Play size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Zap size={14} className="card-title-icon" /> Quick Actions</div>
          </div>
          <div className="flex-col gap-8">
            {[
              { label: 'New Macro', sub: 'Create a key sequence or automation', page: 'macros', icon: Zap },
              { label: 'Bind Hotkey', sub: 'Map a global shortcut to a macro', page: 'hotkeys', icon: Keyboard },
              { label: 'Text Expander', sub: 'Add an abbreviation expansion', page: 'text-expander', icon: Type },
              { label: 'AI Assistant', sub: 'Use AI to build automations', page: 'ai', icon: Activity },
              { label: 'Mobile Remote', sub: 'Control this app from your phone', page: 'mobile', icon: Clock },
            ].map(a => {
              const Icon = a.icon
              return (
                <div
                  key={a.page}
                  className="list-item"
                  onClick={() => onNavigate(a.page)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="list-item-icon"><Icon size={14} /></div>
                  <div className="list-item-body">
                    <div className="list-item-title">{a.label}</div>
                    <div className="list-item-sub">{a.sub}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* System Overview */}
      {sysInfo && (
        <div className="card mt-16">
          <div className="card-header">
            <div className="card-title"><Activity size={14} className="card-title-icon" /> System</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('system')}>Details</button>
          </div>
          <div className="grid-2 gap-16">
            <div>
              <div className="flex items-center justify-between mb-8">
                <span className="text-muted text-sm">CPU Usage</span>
                <span className="font-mono text-sm">{sysInfo.cpu}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${sysInfo.cpu}%`, background: sysInfo.cpu > 80 ? 'var(--red)' : sysInfo.cpu > 50 ? 'var(--yellow)' : 'var(--green)' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-8">
                <span className="text-muted text-sm">Memory</span>
                <span className="font-mono text-sm">{sysInfo.memPercent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${sysInfo.memPercent}%`, background: sysInfo.memPercent > 80 ? 'var(--red)' : sysInfo.memPercent > 60 ? 'var(--yellow)' : 'var(--blue)' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
