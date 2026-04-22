import React, { useState, useEffect } from 'react'
import { Image, Plus, Trash2, Paperclip, X, Search, Play, Music, FileText } from 'lucide-react'
import { useToast } from './Toast'
import { safeCall } from '../utils/logger'
import { useAIAttachments } from '../utils/aiAttachment'

function TypeIcon({ type, size = 14 }) {
  if (type === 'video') return <Play size={size} />
  if (type === 'audio') return <Music size={size} />
  if (type === 'image') return <Image size={size} />
  return <FileText size={size} />
}

export default function MediaLibrary() {
  const toast = useToast()
  const { add: attachToAI } = useAIAttachments()
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [preview, setPreview] = useState(null)
  const isElectron = !!window.api

  useEffect(() => { refresh() }, [])

  const refresh = async () => {
    if (!isElectron) return
    const list = await safeCall(() => window.api.media.list(), { where: 'media.list', toast, fallback: [] })
    setItems(list)
  }

  const importFiles = async () => {
    const paths = await safeCall(() => window.api.media.pick(), { where: 'media.pick', toast, fallback: [] })
    if (!paths?.length) return
    const added = await safeCall(() => window.api.media.import(paths), { where: 'media.import', toast, fallback: [] })
    toast.show({ type: 'success', title: 'Imported', message: `${added.length} files added` })
    refresh()
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete this media file?')) return
    await safeCall(() => window.api.media.delete(id), { where: 'media.delete', toast })
    setPreview(null)
    refresh()
  }

  const updateTags = async (id, tagsStr) => {
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean)
    await safeCall(() => window.api.media.update(id, { tags }), { where: 'media.update', toast })
    setItems(prev => prev.map(m => m.id === id ? { ...m, tags } : m))
    if (preview?.id === id) setPreview(prev => ({ ...prev, tags }))
  }

  const attachToChat = (item) => {
    if (item.type === 'image') {
      attachToAI({ type: 'image', path: item.relPath, name: item.filename, dataUrl: `media:///${item.relPath.replace(/\\/g, '/')}` })
      toast.show({ type: 'success', title: 'Attached', message: `${item.filename} → Chat` })
    } else {
      toast.show({ type: 'warning', message: 'Only images can be attached to AI right now.' })
    }
  }

  const filtered = items.filter(m => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false
    if (!filter) return true
    const q = filter.toLowerCase()
    return m.filename.toLowerCase().includes(q) || (m.tags || []).some(t => t.toLowerCase().includes(q))
  })

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Media Library</div>
          <div className="page-subtitle">Images, video, and audio — attach to AI or open externally</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={importFiles}><Plus size={13} /> Import</button>
      </div>

      <div className="flex gap-8 mb-12">
        <div className="flex-1" style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input className="input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search filename or tag…" style={{ paddingLeft: 30 }} />
        </div>
        {['all', 'image', 'video', 'audio'].map(t => (
          <button key={t} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter(t)}>
            {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {filtered.length === 0 && (
          <div className="text-muted text-sm" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center' }}>
            <Image size={32} style={{ opacity: 0.3, marginBottom: 8 }} /><div>No media yet. Import images, videos, or audio above.</div>
          </div>
        )}
        {filtered.map(m => (
          <div key={m.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setPreview(m)}>
            <div style={{ aspectRatio: '1', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {m.type === 'image'
                ? <img src={`media:///${m.relPath.replace(/\\/g, '/')}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={m.filename} />
                : <TypeIcon type={m.type} size={32} />
              }
            </div>
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.filename}</div>
              <div className="text-xs text-muted">{(m.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreview(null)}>
          <div className="modal" style={{ width: 640 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.filename}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPreview(null)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-3)', borderRadius: 6, padding: 8, marginBottom: 12, textAlign: 'center', maxHeight: 400, overflow: 'hidden' }}>
                {preview.type === 'image' && <img src={`media:///${preview.relPath.replace(/\\/g, '/')}`} style={{ maxWidth: '100%', maxHeight: 380 }} />}
                {preview.type === 'video' && <video src={`media:///${preview.relPath.replace(/\\/g, '/')}`} controls style={{ maxWidth: '100%', maxHeight: 380 }} />}
                {preview.type === 'audio' && <audio src={`media:///${preview.relPath.replace(/\\/g, '/')}`} controls style={{ width: '100%' }} />}
                {preview.type === 'other' && <div className="text-muted text-sm" style={{ padding: 40 }}>No preview available</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input className="input" defaultValue={(preview.tags || []).join(', ')} onBlur={e => updateTags(preview.id, e.target.value)} placeholder="vacation, family, ..." />
              </div>
              <div className="text-xs text-muted">
                Size: {(preview.size / 1024).toFixed(1)} KB • Added {new Date(preview.addedAt).toLocaleString()}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => deleteItem(preview.id)}><Trash2 size={12} /> Delete</button>
              <div className="flex-1" />
              <button className="btn btn-ghost btn-sm" onClick={() => window.api.media.open(preview.id)}>Open externally</button>
              {preview.type === 'image' && <button className="btn btn-primary btn-sm" onClick={() => attachToChat(preview)}><Paperclip size={12} /> Attach to AI</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
