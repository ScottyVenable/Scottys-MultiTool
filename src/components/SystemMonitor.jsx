import React, { useState, useEffect } from 'react'
import { Monitor, Cpu, MemoryStick, HardDrive, Clock, RefreshCw, Server, Activity } from 'lucide-react'

const MAX_HISTORY = 60
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: Activity },
  { id: 'disk',       label: 'Disk',        icon: HardDrive },
  { id: 'processes',  label: 'Processes',   icon: Server },
  { id: 'info',       label: 'System Info', icon: Monitor },
]

function Sparkline({ data, color, height = 40 }) {
  const w = 200, h = height
  if (data.length < 2) return null
  const pts = data.map((v, i) => {
    const x = (i / (MAX_HISTORY - 1)) * w
    const y = h - (v / 100) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.08" strokeWidth="0" />
    </svg>
  )
}

function MonitorBar({ label, value, color }) {
  return (
    <div className="monitor-bar-wrap">
      <span className="monitor-bar-label">{label}</span>
      <div className="monitor-bar-track flex-1">
        <div className="monitor-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="monitor-bar-pct">{value}%</span>
    </div>
  )
}

function DiskBar({ drive }) {
  const pct = drive.Total > 0 ? Math.round((drive.Used / drive.Total) * 100) : 0
  const color = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--yellow)' : 'var(--blue)'
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="flex items-center justify-between mb-8">
        <div style={{ fontWeight: 600, fontSize: 14 }}>{drive.Name}:</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          {drive.Used?.toFixed(1)} / {drive.Total?.toFixed(1)} GB
        </div>
      </div>
      <div style={{ background: 'var(--bg-3)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
      <div className="flex items-center justify-between mt-6">
        <span className="text-xs text-muted">{drive.Free?.toFixed(1)} GB free</span>
        <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color }}>{pct}%</span>
      </div>
    </div>
  )
}

export default function SystemMonitor() {
  const [tab, setTab]             = useState('overview')
  const [info, setInfo]           = useState(null)
  const [cpuHistory, setCpuHistory] = useState([])
  const [memHistory, setMemHistory] = useState([])
  const [disks, setDisks]         = useState([])
  const [processes, setProcesses] = useState([])
  const [loadingDisk, setLoadingDisk]   = useState(false)
  const [loadingProc, setLoadingProc]   = useState(false)
  const [sortProc, setSortProc]   = useState('cpu')
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) {
      const fakeInfo = {
        cpu: 18, memPercent: 64, memTotal: 16384, memUsed: 10486, platform: 'win32',
        hostname: 'MY-PC', uptime: 14400, arch: 'x64', cpuModel: 'Intel Core i7-12700K',
        cpuCores: 12, cpuSpeed: 3600,
      }
      setInfo(fakeInfo)
      setCpuHistory([18]); setMemHistory([64])
      setDisks([{ Name: 'C', Used: 120, Free: 360, Total: 480 }, { Name: 'D', Used: 800, Free: 200, Total: 1000 }])
      setProcesses([{ Name: 'chrome', CPU: 8.2, RAM: 1024 }, { Name: 'node', CPU: 3.1, RAM: 256 }, { Name: 'code', CPU: 1.4, RAM: 512 }])
      const t = setInterval(() => {
        const cpu = Math.floor(Math.random() * 40 + 10)
        const mem = Math.floor(Math.random() * 20 + 50)
        setInfo(i => ({ ...i, cpu, memPercent: mem }))
        setCpuHistory(h => [...h.slice(-(MAX_HISTORY - 1)), cpu])
        setMemHistory(h => [...h.slice(-(MAX_HISTORY - 1)), mem])
      }, 2000)
      return () => clearInterval(t)
    }
    window.api.system.info().then(i => {
      if (i) { setInfo(i); setCpuHistory([i.cpu]); setMemHistory([i.memPercent]) }
    })
    window.api.on('system:update', (i) => {
      setInfo(i)
      setCpuHistory(h => [...h.slice(-(MAX_HISTORY - 1)), i.cpu])
      setMemHistory(h => [...h.slice(-(MAX_HISTORY - 1)), i.memPercent])
    })
  }, [])

  useEffect(() => {
    if (tab === 'disk' && isElectron) loadDisk()
    if (tab === 'processes' && isElectron) loadProcesses()
  }, [tab])

  const loadDisk = async () => {
    setLoadingDisk(true)
    const d = await window.api.system.disk().catch(() => [])
    setDisks(d || [])
    setLoadingDisk(false)
  }

  const loadProcesses = async () => {
    setLoadingProc(true)
    const p = await window.api.system.processes().catch(() => [])
    setProcesses(p || [])
    setLoadingProc(false)
  }

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }
  const formatMem = (mb) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`

  const sortedProc = [...processes].sort((a, b) => sortProc === 'cpu' ? b.CPU - a.CPU : b.RAM - a.RAM)

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">System Monitor</div>
          <div className="page-subtitle">Real-time CPU, memory, disk, and process information</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="dot-live" />
          <span className="text-sm text-muted">Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar mb-16">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              className={`tab-item ${tab === t.id ? 'tab-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={13} /> {t.label}
            </button>
          )
        })}
      </div>

      {!info ? (
        <div className="empty-state">
          <Monitor size={36} className="empty-state-icon" />
          <div className="empty-state-sub">Loading system data...</div>
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <>
              <div className="stat-grid mb-16">
                {[
                  { label: 'CPU Usage',   value: `${info.cpu}%`,         color: info.cpu > 80 ? 'var(--red)' : info.cpu > 50 ? 'var(--yellow)' : 'var(--green)', icon: Cpu },
                  { label: 'Memory',      value: `${info.memPercent}%`,   color: 'var(--blue)', icon: MemoryStick },
                  { label: 'RAM Total',   value: formatMem(info.memTotal), color: 'var(--text-1)', icon: MemoryStick },
                  { label: 'Uptime',      value: formatUptime(info.uptime), color: 'var(--text-1)', icon: Clock },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div className="stat-card" key={s.label}>
                      <div className="flex items-center justify-between mb-8">
                        <div className="stat-label">{s.label}</div>
                        <Icon size={14} style={{ color: s.color }} />
                      </div>
                      <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  )
                })}
              </div>

              <div className="grid-2 gap-16">
                <div className="card">
                  <div className="card-header">
                    <div className="card-title"><Cpu size={14} className="card-title-icon" /> CPU History</div>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: info.cpu > 80 ? 'var(--red)' : info.cpu > 50 ? 'var(--yellow)' : 'var(--green)' }}>{info.cpu}%</span>
                  </div>
                  <MonitorBar label="CPU" value={info.cpu} color={info.cpu > 80 ? 'var(--red)' : info.cpu > 50 ? 'var(--yellow)' : 'var(--green)'} />
                  <div style={{ marginTop: 12, background: 'var(--bg-3)', borderRadius: 'var(--r)', overflow: 'hidden', padding: '8px 0' }}>
                    <Sparkline data={cpuHistory} color={info.cpu > 80 ? '#ef4444' : info.cpu > 50 ? '#f59e0b' : '#22c55e'} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title"><MemoryStick size={14} className="card-title-icon" /> Memory History</div>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{info.memPercent}%</span>
                  </div>
                  <MonitorBar label="RAM" value={info.memPercent} color="var(--blue)" />
                  <div className="text-xs text-muted mt-8">{formatMem(info.memUsed)} used of {formatMem(info.memTotal)}</div>
                  <div style={{ marginTop: 12, background: 'var(--bg-3)', borderRadius: 'var(--r)', overflow: 'hidden', padding: '8px 0' }}>
                    <Sparkline data={memHistory} color="#3b82f6" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── DISK ── */}
          {tab === 'disk' && (
            <>
              <div className="flex items-center justify-between mb-12">
                <div className="text-sm text-muted">{disks.length} drive{disks.length !== 1 ? 's' : ''} detected</div>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={loadDisk} disabled={loadingDisk}>
                  <RefreshCw size={13} className={loadingDisk ? 'animate-spin' : ''} />
                </button>
              </div>
              {disks.length === 0 ? (
                <div className="card">
                  <div className="empty-state"><HardDrive size={28} className="empty-state-icon" />
                    <div className="empty-state-sub">{loadingDisk ? 'Scanning drives…' : 'No drives found'}</div>
                  </div>
                </div>
              ) : (
                <div className="grid-2 gap-12">
                  {disks.map((d, i) => <DiskBar key={i} drive={d} />)}
                </div>
              )}
            </>
          )}

          {/* ── PROCESSES ── */}
          {tab === 'processes' && (
            <>
              <div className="flex items-center justify-between mb-12">
                <div className="flex gap-8">
                  <button className={`btn btn-sm ${sortProc === 'cpu' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortProc('cpu')}>Sort: CPU</button>
                  <button className={`btn btn-sm ${sortProc === 'ram' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortProc('ram')}>Sort: RAM</button>
                </div>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={loadProcesses} disabled={loadingProc}>
                  <RefreshCw size={13} className={loadingProc ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em' }}>Process</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', textAlign: 'right' }}>CPU %</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', textAlign: 'right' }}>RAM</span>
                </div>
                {sortedProc.slice(0, 20).map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.Name}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: p.CPU > 20 ? 'var(--yellow)' : 'var(--text-2)', textAlign: 'right' }}>{p.CPU?.toFixed(1)}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-2)', textAlign: 'right' }}>{formatMem(p.RAM)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── INFO ── */}
          {tab === 'info' && (
            <div className="grid-2 gap-16">
              <div className="card">
                <div className="card-title mb-12"><Cpu size={14} className="card-title-icon" /> CPU</div>
                {[
                  { label: 'Model',  value: info.cpuModel || 'Unknown' },
                  { label: 'Cores',  value: info.cpuCores || '—' },
                  { label: 'Speed',  value: info.cpuSpeed ? `${info.cpuSpeed} MHz` : '—' },
                  { label: 'Usage',  value: `${info.cpu}%` },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="text-muted text-sm">{row.label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-1)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title mb-12"><Monitor size={14} className="card-title-icon" /> System</div>
                {[
                  { label: 'Hostname',  value: info.hostname || '—' },
                  { label: 'Platform',  value: info.platform || '—' },
                  { label: 'Arch',      value: info.arch || '—' },
                  { label: 'Uptime',    value: formatUptime(info.uptime) },
                  { label: 'RAM',       value: formatMem(info.memTotal) },
                  { label: 'RAM Free',  value: formatMem(info.memTotal - info.memUsed) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="text-muted text-sm">{row.label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-1)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
