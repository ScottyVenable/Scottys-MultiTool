import React, { useState, useEffect } from 'react'
import { Clipboard, Trash2, Copy, X, Search, Clock } from 'lucide-react'

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
  return `${Math.floor(diff/86400000)}d ago`
}

export default function ClipboardManager() {
  const [history, setHistory] = useState([])
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(null)
  const isElectron = !!window.api

  useEffect(() => {
    load()
    if (!isElectron) return
    window.api.on('clipboard:update', (h) => setHistory(h))
  }, [])

  const load = async () => {
    if (!isElectron) { setHistory(DEMOS); return }
    const h = await window.api.clipboard.history()
    setHistory(h || [])
  }

  const paste = async (item) => {
    if (isElectron) await window.api.clipboard.write(item.text)
    else navigator.clipboard?.writeText(item.text)
    setCopied(item.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const remove = async (id) => {
    if (isElectron) await window.api.clipboard.delete(id)
    setHistory(h => h.filter(x => x.id !== id))
  }

  const clearAll = async () => {
    if (isElectron) await window.api.clipboard.clear()
    setHistory([])
  }

  const filtered = history.filter(h => h.text.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Clipboard History</div>
          <div className="page-subtitle">Access and reuse your recent clipboard entries</div>
        </div>
        {history.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card mb-16" style={{ padding: '12px 14px' }}>
        <div className="flex items-center gap-8">
          <Search size={14} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clipboard history..."
            style={{ border: 'none', background: 'transparent', padding: '0', outline: 'none' }}
          />
          {search && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSearch('')}><X size={12} /></button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Clipboard size={36} className="empty-state-icon" />
            <div className="empty-state-title">{search ? 'No matching entries' : 'Clipboard history is empty'}</div>
            <div className="empty-state-sub">{search ? 'Try a different search' : 'Copy some text and it will appear here automatically'}</div>
          </div>
        </div>
      ) : (
        <div className="flex-col gap-6">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className="card"
              style={{ padding: '12px 14px', cursor: 'pointer', borderColor: copied === item.id ? 'var(--green)' : undefined }}
              onClick={() => paste(item)}
            >
              <div className="flex items-start gap-10">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <pre style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    color: 'var(--text-1)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 80,
                    overflow: 'hidden',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    {item.text.slice(0, 300)}{item.text.length > 300 ? '...' : ''}
                  </pre>
                  <div className="flex items-center gap-8 mt-8">
                    <Clock size={11} style={{ color: 'var(--text-3)' }} />
                    <span className="text-xs text-muted">{timeAgo(item.time)}</span>
                    <span className="text-xs text-muted">{item.text.length} chars</span>
                    {i === 0 && <span className="badge badge-accent">Latest</span>}
                  </div>
                </div>
                <div className="flex gap-4" style={{ flexShrink: 0 }}>
                  {copied === item.id ? (
                    <span className="badge badge-green">Copied!</span>
                  ) : (
                    <button className="btn btn-ghost btn-icon btn-sm" data-tip="Copy to clipboard" onClick={e => { e.stopPropagation(); paste(item) }}>
                      <Copy size={12} />
                    </button>
                  )}
                  <button className="btn btn-ghost btn-icon btn-sm" data-tip="Remove" onClick={e => { e.stopPropagation(); remove(item.id) }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEMOS = [
  { id: 1, text: 'Hello, this is a sample clipboard entry that was copied earlier.', time: new Date(Date.now()-60000).toISOString() },
  { id: 2, text: 'npm install electron react vite --save-dev', time: new Date(Date.now()-300000).toISOString() },
  { id: 3, text: 'https://example.com/some/long/url/that/was/copied', time: new Date(Date.now()-900000).toISOString() },
]
