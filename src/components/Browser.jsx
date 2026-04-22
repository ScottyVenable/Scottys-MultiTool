import React, { useState, useEffect, useRef } from 'react'
import { Globe, ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Star, BookOpen, Image as ImageIcon } from 'lucide-react'
import { useToast } from './Toast'
import { safeCall } from '../utils/logger'

const HOME_URL = 'https://duckduckgo.com'

const READING_MODE_SCRIPT = `
(function() {
  const candidates = Array.from(document.querySelectorAll('article, main, [role=main]'))
  let el = candidates[0]
  if (!el) {
    const ps = Array.from(document.querySelectorAll('p'))
    if (ps.length) el = ps.reduce((a, b) => (a.textContent.length > b.textContent.length ? a : b)).closest('section,div,article') || document.body
  }
  if (!el) return
  const content = el.innerHTML
  const title = document.title
  document.body.innerHTML = '<div style="max-width:720px;margin:40px auto;padding:0 24px;font-family:Georgia,serif;font-size:18px;line-height:1.7;color:#222"><h1 style="font-size:28px;margin-bottom:24px">' + title + '</h1>' + content + '</div>'
  document.body.style.background = '#fafafa'
})()
`

export default function Browser() {
  const toast = useToast()
  const [tabs, setTabs] = useState([{ id: 't-1', url: HOME_URL, title: 'New Tab' }])
  const [activeId, setActiveId] = useState('t-1')
  const [addressBar, setAddressBar] = useState(HOME_URL)
  const [bookmarks, setBookmarks] = useState([])
  const webviewRef = useRef(null)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    safeCall(() => window.api.bookmarks.list(), { where: 'bookmarks.list', toast, fallback: [] }).then(setBookmarks)
  }, [])

  const active = tabs.find(t => t.id === activeId) || tabs[0]

  useEffect(() => {
    if (active) setAddressBar(active.url)
  }, [activeId])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    const onNav = (e) => {
      setTabs(prev => prev.map(t => t.id === activeId ? { ...t, url: e.url } : t))
      setAddressBar(e.url)
    }
    const onTitle = (e) => {
      setTabs(prev => prev.map(t => t.id === activeId ? { ...t, title: e.title || 'Untitled' } : t))
    }
    wv.addEventListener('did-navigate', onNav)
    wv.addEventListener('did-navigate-in-page', onNav)
    wv.addEventListener('page-title-updated', onTitle)
    return () => {
      try { wv.removeEventListener('did-navigate', onNav) } catch {}
      try { wv.removeEventListener('did-navigate-in-page', onNav) } catch {}
      try { wv.removeEventListener('page-title-updated', onTitle) } catch {}
    }
  }, [activeId])

  const navigate = (url) => {
    let u = url.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u) && !u.startsWith('file:')) {
      if (u.includes('.') && !u.includes(' ')) u = 'https://' + u
      else u = 'https://duckduckgo.com/?q=' + encodeURIComponent(u)
    }
    setAddressBar(u)
    setTabs(prev => prev.map(t => t.id === activeId ? { ...t, url: u } : t))
    try { webviewRef.current?.loadURL(u) } catch {}
  }

  const newTab = () => {
    const id = `t-${Date.now()}`
    setTabs(prev => [...prev, { id, url: HOME_URL, title: 'New Tab' }])
    setActiveId(id)
  }

  const closeTab = (id) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      if (next.length === 0) return [{ id: 't-1', url: HOME_URL, title: 'New Tab' }]
      if (id === activeId) setActiveId(next[0].id)
      return next
    })
  }

  const addBookmark = async () => {
    if (!active) return
    const bm = { id: `bm-${Date.now()}`, title: active.title, url: active.url }
    const list = await safeCall(() => window.api.bookmarks.save(bm), { where: 'bookmarks.save', toast, fallback: null })
    if (list) { setBookmarks(list); toast.show({ type: 'success', title: 'Bookmarked', message: active.title }) }
  }

  const removeBookmark = async (id) => {
    await safeCall(() => window.api.bookmarks.delete(id), { where: 'bookmarks.delete', toast })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const doBack = () => { try { webviewRef.current?.goBack() } catch {} }
  const doForward = () => { try { webviewRef.current?.goForward() } catch {} }
  const doReload = () => { try { webviewRef.current?.reload() } catch {} }
  const doReading = () => { try { webviewRef.current?.executeJavaScript(READING_MODE_SCRIPT) } catch {} }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 8px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-end' }}>
        {tabs.map(t => (
          <div key={t.id}
            onClick={() => setActiveId(t.id)}
            className={t.id === activeId ? 'tab-active' : ''}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, borderRadius: '6px 6px 0 0', background: t.id === activeId ? 'var(--bg-2)' : 'var(--bg-3)', cursor: 'pointer', maxWidth: 200 }}>
            <Globe size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title || 'New Tab'}</span>
            <button className="btn btn-ghost btn-icon" style={{ width: 18, height: 18, padding: 0 }} onClick={e => { e.stopPropagation(); closeTab(t.id) }}><X size={10} /></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={newTab}><Plus size={12} /></button>
      </div>

      {/* Address bar */}
      <div style={{ display: 'flex', gap: 6, padding: 8, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doBack}><ArrowLeft size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doForward}><ArrowRight size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doReload}><RotateCw size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(HOME_URL)}><Home size={13} /></button>
        <input className="input mono flex-1" value={addressBar} onChange={e => setAddressBar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && navigate(addressBar)}
          placeholder="Enter URL or search..." style={{ fontSize: 12 }} />
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doReading} title="Reading Mode"><BookOpen size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={addBookmark} title="Bookmark"><Star size={13} /></button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Bookmarks sidebar */}
        <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: 8, overflowY: 'auto', background: 'var(--bg-1)' }}>
          <div className="text-xs text-muted mb-8" style={{ fontWeight: 600 }}>BOOKMARKS</div>
          {bookmarks.length === 0 && <div className="text-xs text-muted">No bookmarks yet</div>}
          {bookmarks.map(b => (
            <div key={b.id} className="flex items-center justify-between" style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => navigate(b.url)}>{b.title}</span>
              <button className="btn btn-ghost btn-icon" style={{ width: 16, height: 16, padding: 0 }} onClick={() => removeBookmark(b.id)}><X size={9} /></button>
            </div>
          ))}
        </div>

        {/* Webview */}
        <div style={{ flex: 1, background: '#fff' }}>
          {isElectron
            ? <webview ref={webviewRef} src={active.url} style={{ width: '100%', height: '100%', display: 'inline-flex' }} allowpopups="true" />
            : <div className="text-muted text-sm" style={{ padding: 24 }}>Browser only works in the Electron app.</div>
          }
        </div>
      </div>
    </div>
  )
}
