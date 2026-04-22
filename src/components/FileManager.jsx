import React, { useState, useEffect, useRef } from 'react'
import { FolderOpen, Folder, File, ChevronRight, ArrowLeft, Search, Copy, Scissors, Clipboard, Trash2, Plus, Edit3, ExternalLink, RefreshCw, X } from 'lucide-react'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1048576).toFixed(1)} MB`
}
function ext(name) { return name.includes('.') ? name.split('.').pop().toLowerCase() : '' }
function isText(name) { return ['txt','md','js','ts','jsx','tsx','json','css','html','py','sh','bat','log','yaml','yml','xml','csv','ini','env'].includes(ext(name)) }
function isImage(name) { return ['png','jpg','jpeg','gif','webp','bmp','svg','ico'].includes(ext(name)) }

export default function FileManager() {
  const [cwd, setCwd] = useState('')
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [preview, setPreview] = useState(null) // { type, content, name }
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [clipboard, setClipboard] = useState(null) // { path, op: 'copy'|'cut' }
  const [renaming, setRenaming] = useState(null) // { path, name }
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [loading, setLoading] = useState(false)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.fs.homedir().then(h => navigate(h))
  }, [])

  const navigate = async (dir) => {
    setLoading(true)
    try {
      const list = await window.api.fs.readdir(dir)
      setEntries(list)
      setCwd(dir)
      setSelected(null)
      setPreview(null)
      setSearchResults(null)
    } catch (e) { alert('Cannot open: ' + e.message) }
    setLoading(false)
  }

  const goUp = () => {
    const sep = cwd.includes('/') ? '/' : '\\'
    const parts = cwd.split(sep).filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    const parent = (cwd.startsWith('/') ? '/' : '') + parts.join(sep) + sep
    navigate(parent)
  }

  const open = async (entry) => {
    const full = joinPath(cwd, entry.name)
    setSelected(full)
    if (entry.isDir) { navigate(full); return }
    if (isImage(entry.name)) {
      setPreview({ type: 'image', path: full, name: entry.name })
    } else if (isText(entry.name)) {
      const txt = await window.api.fs.readfile(full, 51200)
      setPreview({ type: 'text', content: txt, name: entry.name })
    } else {
      setPreview({ type: 'none', name: entry.name })
    }
  }

  const joinPath = (dir, name) => {
    const sep = dir.includes('/') ? '/' : '\\'
    return dir.replace(/[\\/]$/, '') + sep + name
  }

  const doDelete = async (path, isDir) => {
    if (!confirm(`Delete "${path.split(/[\\/]/).pop()}"? (goes to Recycle Bin)`)) return
    if (isDir) await window.api.fs.deletedir(path)
    else await window.api.fs.delete(path)
    navigate(cwd)
  }

  const doPaste = async () => {
    if (!clipboard) return
    const destName = clipboard.path.split(/[\\/]/).pop()
    const dest = joinPath(cwd, destName)
    if (clipboard.op === 'copy') await window.api.fs.copy(clipboard.path, dest)
    else await window.api.fs.move(clipboard.path, dest)
    setClipboard(null)
    navigate(cwd)
  }

  const startRename = (entry) => {
    setRenaming({ path: joinPath(cwd, entry.name), name: entry.name })
  }

  const doRename = async () => {
    if (!renaming) return
    const newPath = joinPath(cwd, renaming.name)
    if (newPath !== renaming.path) await window.api.fs.rename(renaming.path, newPath)
    setRenaming(null)
    navigate(cwd)
  }

  const doSearch = async () => {
    if (!search.trim() || !cwd) return
    const results = await window.api.fs.search(cwd, search)
    setSearchResults(results)
  }

  const doNewFolder = async () => {
    if (!newFolderName.trim()) return
    await window.api.fs.mkdir(joinPath(cwd, newFolderName))
    setNewFolderMode(false)
    setNewFolderName('')
    navigate(cwd)
  }

  // Breadcrumbs
  const sep = cwd.includes('/') ? '/' : '\\'
  const parts = cwd.split(/[\\/]/).filter(Boolean)
  const crumbs = parts.map((p, i) => {
    const path = (cwd.startsWith('/') ? '/' : '') + parts.slice(0, i+1).join(sep) + sep
    return { label: p, path }
  })

  const displayEntries = searchResults || entries

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">File Manager</div>
          <div className="page-subtitle">Browse and manage your files</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={goUp} disabled={!cwd}><ArrowLeft size={14} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(cwd)}><RefreshCw size={14} /></button>
        {/* Breadcrumbs */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, overflow: 'hidden' }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={c.path}>
              {i > 0 && <ChevronRight size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
              <button onClick={() => navigate(c.path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: '2px 4px', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</button>
            </React.Fragment>
          ))}
        </div>
        {clipboard && <button className="btn btn-secondary btn-sm" onClick={doPaste}><Clipboard size={12} /> Paste ({clipboard.op})</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => setNewFolderMode(true)}><Plus size={12} /> Folder</button>
        {/* Search */}
        <input className="input" style={{ width: 140, height: 30, fontSize: 12 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
        {searchResults && <button className="btn btn-ghost btn-sm" onClick={() => { setSearchResults(null); setSearch('') }}><X size={12} /></button>}
      </div>

      {newFolderMode && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input className="input" autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doNewFolder()} placeholder="New folder name…" style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={doNewFolder}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setNewFolderMode(false)}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* File list */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
          {loading && <div className="text-muted text-sm" style={{ padding: 16 }}>Loading…</div>}
          {!loading && displayEntries.length === 0 && <div className="text-muted text-sm" style={{ padding: 16 }}>Empty folder</div>}
          {displayEntries.map(entry => {
            const full = entry.path || joinPath(cwd, entry.name)
            const isActive = selected === full
            return (
              <div key={full}
                onDoubleClick={() => open(entry)}
                onClick={() => setSelected(full)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer', background: isActive ? 'var(--bg-3)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                {entry.isDir ? <Folder size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} /> : <File size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                {renaming?.path === full ? (
                  <input autoFocus className="input" style={{ flex: 1, height: 24, padding: '0 6px', fontSize: 13 }}
                    value={renaming.name} onChange={e => setRenaming(r => ({ ...r, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRenaming(null) }}
                    onBlur={doRename} />
                ) : (
                  <span style={{ flex: 1, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{entry.isDir ? '' : formatSize(entry.size || 0)}</span>
                {isActive && !renaming && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="btn btn-ghost" style={{ padding: 3 }} onClick={e => { e.stopPropagation(); setClipboard({ path: full, op: 'copy' }) }} title="Copy"><Copy size={11} /></button>
                    <button className="btn btn-ghost" style={{ padding: 3 }} onClick={e => { e.stopPropagation(); setClipboard({ path: full, op: 'cut' }) }} title="Cut"><Scissors size={11} /></button>
                    <button className="btn btn-ghost" style={{ padding: 3 }} onClick={e => { e.stopPropagation(); startRename(entry) }} title="Rename"><Edit3 size={11} /></button>
                    <button className="btn btn-ghost" style={{ padding: 3 }} onClick={e => { e.stopPropagation(); window.api.fs.open(full) }} title="Open"><ExternalLink size={11} /></button>
                    <button className="btn btn-ghost" style={{ padding: 3, color: 'var(--red)' }} onClick={e => { e.stopPropagation(); doDelete(full, entry.isDir) }} title="Delete"><Trash2 size={11} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Preview */}
        {preview && (
          <div style={{ width: 300, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}><X size={12} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {preview.type === 'image' && <img src={`file://${preview.path}`} alt={preview.name} style={{ maxWidth: '100%', borderRadius: 4 }} />}
              {preview.type === 'text' && <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--mono)', lineHeight: 1.5, margin: 0 }}>{preview.content}</pre>}
              {preview.type === 'none' && <div className="text-muted text-sm" style={{ textAlign: 'center', paddingTop: 40 }}>No preview available</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
