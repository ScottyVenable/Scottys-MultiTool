import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Globe, ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Star, BookOpen, Search as SearchIcon, Clock, Sparkles } from 'lucide-react'
import { useToast } from './Toast'
import { safeCall } from '../utils/logger'

const HOME_URL = 'https://duckduckgo.com'

const READING_MODE_SCRIPT = `
(function() {
  const darkBg = '#111', darkText = '#ecebe8';
  const candidates = Array.from(document.querySelectorAll('article, main, [role=main]'))
  let el = candidates[0]
  if (!el) {
    const ps = Array.from(document.querySelectorAll('p'))
    if (ps.length) el = ps.reduce((a, b) => (a.textContent.length > b.textContent.length ? a : b)).closest('section,div,article') || document.body
  }
  if (!el) return
  const content = el.innerHTML
  const title = document.title
  document.body.innerHTML = '<div id="rm-root" style="max-width:720px;margin:40px auto;padding:0 24px;font-family:Georgia,serif;font-size:18px;line-height:1.7"><h1 style="font-size:28px;margin-bottom:24px">' + title + '</h1>' + content + '</div>'
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  document.body.style.background = isDark ? darkBg : '#fafafa'
  document.body.style.color = isDark ? darkText : '#222'
  document.querySelectorAll('#rm-root a').forEach(a => { a.style.color = '#818cf8' })
})()
`

export default function Browser() {
  const toast = useToast()
  const [tabs, setTabs] = useState([{ id: 't-1', url: HOME_URL, title: 'New Tab', favicon: '', loading: false }])
  const [activeId, setActiveId] = useState('t-1')
  const [addressBar, setAddressBar] = useState(HOME_URL)
  const [bookmarks, setBookmarks] = useState([])
  const [recentlyClosed, setRecentlyClosed] = useState([])
  const [findOpen, setFindOpen] = useState(false)
  const [findText, setFindText] = useState('')
  const addressRef = useRef(null)
  const webviewRef = useRef(null)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    safeCall(() => window.api.bookmarks.list(), { where: 'bookmarks.list', toast, fallback: [] }).then(setBookmarks)
  }, [])

  const active = tabs.find(t => t.id === activeId) || tabs[0]

  useEffect(() => { if (active) setAddressBar(active.url) }, [activeId])

  const patchTab = useCallback((id, patch) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }, [])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    const onNav = (e) => { patchTab(activeId, { url: e.url }); setAddressBar(e.url) }
    const onTitle = (e) => patchTab(activeId, { title: e.title || 'Untitled' })
    const onFavicon = (e) => patchTab(activeId, { favicon: (e.favicons && e.favicons[0]) || '' })
    const onStart = () => patchTab(activeId, { loading: true })
    const onStop = () => patchTab(activeId, { loading: false })
    wv.addEventListener('did-navigate', onNav)
    wv.addEventListener('did-navigate-in-page', onNav)
    wv.addEventListener('page-title-updated', onTitle)
    wv.addEventListener('page-favicon-updated', onFavicon)
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('did-fail-load', onStop)
    return () => {
      try { wv.removeEventListener('did-navigate', onNav) } catch {}
      try { wv.removeEventListener('did-navigate-in-page', onNav) } catch {}
      try { wv.removeEventListener('page-title-updated', onTitle) } catch {}
      try { wv.removeEventListener('page-favicon-updated', onFavicon) } catch {}
      try { wv.removeEventListener('did-start-loading', onStart) } catch {}
      try { wv.removeEventListener('did-stop-loading', onStop) } catch {}
      try { wv.removeEventListener('did-fail-load', onStop) } catch {}
    }
  }, [activeId, patchTab])

  const navigate = (url) => {
    let u = String(url || '').trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u) && !u.startsWith('file:')) {
      if (u.includes('.') && !u.includes(' ')) u = 'https://' + u
      else u = 'https://duckduckgo.com/?q=' + encodeURIComponent(u)
    }
    setAddressBar(u)
    patchTab(activeId, { url: u })
    try { webviewRef.current?.loadURL(u) } catch {}
  }

  const newTab = (url = HOME_URL) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    setTabs(prev => [...prev, { id, url, title: 'New Tab', favicon: '', loading: false }])
    setActiveId(id)
  }

  const closeTab = (id) => {
    setTabs(prev => {
      const closed = prev.find(t => t.id === id)
      if (closed && closed.url && closed.url !== HOME_URL) {
        setRecentlyClosed(rc => [{ url: closed.url, title: closed.title || closed.url, closedAt: Date.now() }, ...rc].slice(0, 10))
      }
      const next = prev.filter(t => t.id !== id)
      if (next.length === 0) return [{ id: 't-1', url: HOME_URL, title: 'New Tab', favicon: '', loading: false }]
      if (id === activeId) setActiveId(next[0].id)
      return next
    })
  }

  const reopenClosed = () => {
    const [last, ...rest] = recentlyClosed
    if (!last) return
    setRecentlyClosed(rest)
    newTab(last.url)
  }

  const cycleTab = (dir = 1) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === activeId)
      if (idx < 0) return prev
      const nextIdx = (idx + dir + prev.length) % prev.length
      setActiveId(prev[nextIdx].id)
      return prev
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

  const runFind = (q, forward = true) => {
    if (!q) return
    try {
      const wv = webviewRef.current
      if (!wv) return
      if (wv.findInPage) wv.findInPage(q, { forward, findNext: true })
      else wv.executeJavaScript(`window.find(${JSON.stringify(q)}, false, ${!forward}, true)`)
    } catch {}
  }
  const stopFind = () => { try { webviewRef.current?.stopFindInPage?.('clearSelection') } catch {} }

  const summarizeWithAI = async () => {
    try {
      const text = await webviewRef.current.executeJavaScript(`(function(){
        const a = document.querySelector('article, main, [role=main]');
        return (a ? a.innerText : document.body.innerText).slice(0, 8000);
      })()`)
      window.__aiAttachmentText = { title: active.title, url: active.url, text }
      toast.show({ type: 'info', title: 'Ready to summarize', message: 'Switch to AI Workstation — the page text is attached.' })
    } catch { toast.show({ type: 'error', title: 'Could not read page', message: '' }) }
  }

  // Keyboard shortcuts: Ctrl+T/W/L/F/Tab/Shift+T
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 't' && e.shiftKey) { e.preventDefault(); reopenClosed() }
      else if (k === 't') { e.preventDefault(); newTab() }
      else if (k === 'w') { e.preventDefault(); closeTab(activeId) }
      else if (k === 'l') { e.preventDefault(); addressRef.current?.focus(); addressRef.current?.select() }
      else if (k === 'f') { e.preventDefault(); setFindOpen(true) }
      else if (e.key === 'Tab') { e.preventDefault(); cycleTab(e.shiftKey ? -1 : 1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeId, recentlyClosed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', position: 'relative' }}>
      <div className="browser-tabstrip">
        {tabs.map(t => (
          <div key={t.id}
            onClick={() => setActiveId(t.id)}
            onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(t.id) } }}
            title={t.title}
            className={`browser-tab ${t.id === activeId ? 'active' : ''}`}>
            {t.favicon
              ? <img className="browser-tab-favicon" src={t.favicon} alt="" onError={e => { e.currentTarget.style.display = 'none' }} />
              : <Globe size={11} />}
            <span className="browser-tab-title">{t.title || 'New Tab'}</span>
            <button className="btn btn-ghost btn-icon" style={{ width: 18, height: 18, padding: 0 }} onClick={e => { e.stopPropagation(); closeTab(t.id) }}><X size={10} /></button>
            {t.loading && <div className="browser-tab-loading" />}
          </div>
        ))}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => newTab()} title="New tab (Ctrl+T)"><Plus size={12} /></button>
        {recentlyClosed.length > 0 && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={reopenClosed} title="Reopen last closed tab (Ctrl+Shift+T)"><Clock size={12} /></button>
        )}
      </div>

      <div className="browser-addressbar">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doBack} title="Back"><ArrowLeft size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doForward} title="Forward"><ArrowRight size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doReload} title="Reload"><RotateCw size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(HOME_URL)} title="Home"><Home size={13} /></button>
        <input ref={addressRef} className="input mono flex-1" value={addressBar} onChange={e => setAddressBar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && navigate(addressBar)}
          placeholder="Enter URL or search (Ctrl+L)..." style={{ fontSize: 12 }} />
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setFindOpen(v => !v)} title="Find in page (Ctrl+F)"><SearchIcon size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={doReading} title="Reading Mode"><BookOpen size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={summarizeWithAI} title="Summarize with AI"><Sparkles size={13} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={addBookmark} title="Bookmark"><Star size={13} /></button>
      </div>

      {findOpen && (
        <div className="browser-find">
          <SearchIcon size={12} />
          <input autoFocus className="input" value={findText} onChange={e => setFindText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runFind(findText, !e.shiftKey); if (e.key === 'Escape') { setFindOpen(false); stopFind() } }}
            placeholder="Find in page" style={{ fontSize: 12, padding: '4px 8px', minWidth: 180 }} />
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => runFind(findText, true)} title="Next">↓</button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => runFind(findText, false)} title="Previous">↑</button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setFindOpen(false); stopFind() }}><X size={12} /></button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
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
          {recentlyClosed.length > 0 && (
            <>
              <div className="text-xs text-muted mt-8 mb-8" style={{ fontWeight: 600 }}>RECENTLY CLOSED</div>
              {recentlyClosed.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center" style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                  onClick={() => newTab(r.url)} title={r.url}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                </div>
              ))}
            </>
          )}
        </div>

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
