import React, { useEffect, useRef, useState, useCallback } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import {
  FolderOpen, FileText, ChevronRight, ChevronDown, RefreshCw,
  Save, Terminal as TerminalIcon, Sparkles, Send, Play, Square,
  Plus, FolderPlus, Trash2,
} from 'lucide-react'
import { useToast } from './Toast'
import { safeCall } from '../utils/logger'

// Configure Monaco to load from the npm package (Vite serves the assets).
// The wrapper library already resolves this by default; this line keeps the
// behavior explicit and avoids a CDN fallback if the user is offline.
try { loader.config({ paths: { vs: 'monaco-editor/min/vs' } }) } catch {}

const LANG_BY_EXT = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  json: 'json', md: 'markdown', html: 'html', css: 'css', scss: 'scss',
  yml: 'yaml', yaml: 'yaml', xml: 'xml', sh: 'shell', ps1: 'powershell',
  java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp', sql: 'sql',
  txt: 'plaintext', log: 'plaintext',
}
const langFor = (name) => LANG_BY_EXT[(name.split('.').pop() || '').toLowerCase()] || 'plaintext'

function FileTree({ rootDir, onOpen, refreshKey, onRefresh }) {
  const [expanded, setExpanded] = useState({})
  const [children, setChildren] = useState({})
  const hasApi = !!window.api
  const toast = useToast()

  const load = useCallback(async (dir) => {
    if (!hasApi) return
    const list = await safeCall(() => window.api.fs.readdir(dir), { where: 'fs.readdir', toast, fallback: [] })
    setChildren(prev => ({ ...prev, [dir]: list }))
  }, [hasApi, toast])

  useEffect(() => { if (rootDir) { load(rootDir); setExpanded({ [rootDir]: true }) } }, [rootDir, refreshKey, load])

  const toggle = (dir, isDir) => {
    if (!isDir) return
    if (!expanded[dir]) { load(dir); setExpanded(e => ({ ...e, [dir]: true })) }
    else setExpanded(e => ({ ...e, [dir]: false }))
  }

  const Node = ({ item, depth }) => {
    const isDir = item.isDirectory
    const isOpen = !!expanded[item.path]
    const Icon = isDir ? (isOpen ? ChevronDown : ChevronRight) : FileText
    return (
      <div>
        <div
          className="ide-tree-row"
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => isDir ? toggle(item.path, true) : onOpen(item.path, item.name)}
        >
          <Icon size={12} style={{ color: isDir ? 'var(--yellow)' : 'var(--text-3)' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        </div>
        {isDir && isOpen && (children[item.path] || []).map(c => (
          <Node key={c.path} item={c} depth={depth + 1} />
        ))}
      </div>
    )
  }

  if (!rootDir) return <div className="text-sm text-muted" style={{ padding: 8 }}>Loading project…</div>
  const rootName = rootDir.split(/[\\/]/).filter(Boolean).pop() || 'projects'
  const topItems = children[rootDir] || []

  return (
    <div className="ide-tree">
      <div className="ide-tree-header">
        <FolderOpen size={11} /> <span>{rootName}</span>
        <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={onRefresh} title="Refresh"><RefreshCw size={10} /></button>
      </div>
      {topItems.length === 0 && <div className="text-xs text-muted" style={{ padding: 8 }}>Empty. Create a file to begin.</div>}
      {topItems.map(it => <Node key={it.path} item={it} depth={0} />)}
    </div>
  )
}

// Terminal pane shares a PowerShell session via the existing shell:* IPC.
function IDETerminal() {
  const [output, setOutput] = useState('')
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const ref = useRef(null)
  const hasApi = !!window.api

  useEffect(() => {
    if (!hasApi) return
    const onData = (t) => {
      setOutput(o => o + t)
      setTimeout(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, 0)
    }
    const onClose = () => setRunning(false)
    window.api.on('shell:data', onData)
    window.api.on('shell:closed', onClose)
  }, [])

  const start = async () => { setOutput(''); setRunning(true); await window.api.shell.spawn() }
  const stop = async () => { await window.api.shell.kill(); setRunning(false) }
  const send = async () => {
    if (!input.trim()) return
    setOutput(o => o + `\n> ${input}\n`)
    await window.api.shell.write(input)
    setInput('')
  }

  return (
    <div className="ide-terminal">
      <div className="ide-terminal-bar">
        <TerminalIcon size={11} /> <span style={{ fontWeight: 600 }}>Terminal</span>
        {!running
          ? <button className="btn btn-success btn-sm" style={{ marginLeft: 'auto' }} onClick={start}><Play size={10} /> Start</button>
          : <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={stop}><Square size={10} /> Kill</button>}
      </div>
      <div ref={ref} className="terminal-output" style={{ flex: 1, minHeight: 0, fontSize: 11 }}>
        {output || (running ? 'Session started.\n' : 'Click Start to spawn a PowerShell session.')}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '4px 6px', borderTop: '1px solid var(--border)' }}>
        <input className="input mono" value={input} disabled={!running}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={running ? 'command…' : '(start session first)'} style={{ flex: 1, fontSize: 11 }} />
        <button className="btn btn-primary btn-sm" onClick={send} disabled={!running || !input.trim()}><Send size={10} /></button>
      </div>
    </div>
  )
}

// A very small AI side panel that asks the configured model to explain or
// modify the currently-open file. Keeps everything local — no external calls
// unless the user has configured an endpoint.
function IDEAIPanel({ activeFileName, activeContent }) {
  const toast = useToast()
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const hasApi = !!window.api

  const run = async (preset) => {
    const q = preset || prompt
    if (!q.trim() || !hasApi) return
    setBusy(true); setAnswer('')
    const s = (await window.api.store.get('settings')) || {}
    const body = `File: ${activeFileName || '(none)'}\n\n\`\`\`\n${(activeContent || '').slice(0, 4000)}\n\`\`\`\n\nTask: ${q}`
    const r = await safeCall(() => window.api.ai.query({
      prompt: body,
      endpoint: s.aiApiBase || 'http://localhost:1234',
      apiKey: s.aiApiKey,
      model: s.aiModel,
      temperature: 0.3,
      maxTokens: 800,
    }), { where: 'ai.query', toast })
    setBusy(false)
    if (r?.success) setAnswer(r.content || '')
  }

  return (
    <div className="ide-ai">
      <div className="ide-ai-bar"><Sparkles size={11} /> <span style={{ fontWeight: 600 }}>AI Assist</span></div>
      <div style={{ padding: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => run('Explain this file briefly.')}>Explain</button>
        <button className="btn btn-ghost btn-sm" onClick={() => run('Find potential bugs or smells.')}>Review</button>
        <button className="btn btn-ghost btn-sm" onClick={() => run('Suggest refactors to improve readability.')}>Refactor</button>
      </div>
      <div style={{ padding: '0 8px' }}>
        <textarea className="input" rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask anything about this file…" style={{ fontSize: 11, width: '100%' }} />
        <button className="btn btn-primary btn-sm" onClick={() => run()} disabled={busy} style={{ marginTop: 4 }}>
          {busy ? 'Thinking…' : <><Send size={10} /> Ask</>}
        </button>
      </div>
      <div className="ide-ai-out">
        {answer ? answer : <div className="text-xs text-muted">Responses appear here.</div>}
      </div>
    </div>
  )
}

export default function IDE() {
  const toast = useToast()
  const [projectsDir, setProjectsDir] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [openFile, setOpenFile] = useState(null) // { path, name, content, dirty }
  const [showAI, setShowAI] = useState(true)
  const hasApi = !!window.api

  useEffect(() => {
    if (!hasApi) return
    safeCall(() => window.api.ide.projectsDir(), { where: 'ide.projectsDir', toast }).then(d => setProjectsDir(d || null))
  }, [])

  const openPath = async (path, name) => {
    const content = await safeCall(() => window.api.fs.readfile(path, 1_000_000), { where: 'fs.readfile', toast, fallback: '' })
    setOpenFile({ path, name, content: content ?? '', dirty: false })
  }

  const save = async () => {
    if (!openFile) return
    const r = await safeCall(() => window.api.fs.writefile(openFile.path, openFile.content), { where: 'fs.writefile', toast })
    if (r) { setOpenFile(f => ({ ...f, dirty: false })); toast.show({ type: 'success', title: 'Saved', message: openFile.name }) }
  }

  // Ctrl+S to save.
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [openFile])

  const [creating, setCreating] = useState(null) // 'file' | 'folder' | null
  const [newName, setNewName] = useState('')
  const confirmCreate = async () => {
    const name = newName.trim()
    if (!name || !projectsDir) { setCreating(null); setNewName(''); return }
    const p = `${projectsDir}\\${name}`
    if (creating === 'file') {
      await safeCall(() => window.api.fs.writefile(p, ''), { where: 'fs.writefile', toast })
      setCreating(null); setNewName(''); setRefreshKey(k => k + 1)
      openPath(p, name)
    } else {
      await safeCall(() => window.api.fs.mkdir(p), { where: 'fs.mkdir', toast })
      setCreating(null); setNewName(''); setRefreshKey(k => k + 1)
    }
  }

  return (
    <div className="animate-in ide-root">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">IDE</div>
          <div className="page-subtitle">Monaco editor · file tree · terminal · AI assist</div>
        </div>
        <div className="flex gap-6">
          <button className="btn btn-secondary btn-sm" onClick={() => { setCreating('file'); setNewName('') }}><Plus size={12} /> New file</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setCreating('folder'); setNewName('') }}><FolderPlus size={12} /> New folder</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAI(s => !s)}><Sparkles size={12} /> {showAI ? 'Hide' : 'Show'} AI</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!openFile}><Save size={12} /> Save</button>
        </div>
      </div>

      {creating && (
        <div style={{ display:'flex', gap:6, padding: '6px 0' }}>
          <input autoFocus className="input" value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder={creating==='file' ? 'e.g. notes.md' : 'folder name'}
            onKeyDown={e => { if (e.key==='Enter') confirmCreate(); if (e.key==='Escape') { setCreating(null); setNewName('') } }}
            style={{ flex:1, fontSize:12 }} />
          <button className="btn btn-primary btn-sm" onClick={confirmCreate}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setCreating(null); setNewName('') }}>Cancel</button>
        </div>
      )}

      <div className="ide-shell">
        <div className="ide-sidebar">
          <FileTree rootDir={projectsDir} onOpen={openPath} refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />
        </div>
        <div className="ide-main">
          <div className="ide-editor">
            {openFile ? (
              <>
                <div className="ide-tabbar">
                  <div className="ide-tab active">
                    <FileText size={11} /> {openFile.name}{openFile.dirty && <span style={{ color: 'var(--yellow)' }}>•</span>}
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={langFor(openFile.name)}
                    value={openFile.content}
                    onChange={(v) => setOpenFile(f => ({ ...f, content: v ?? '', dirty: true }))}
                    options={{
                      fontSize: 13, minimap: { enabled: false },
                      scrollBeyondLastLine: false, automaticLayout: true,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="ide-empty">
                <FileText size={36} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
                <div>Select a file from the tree to begin editing.</div>
                <div className="text-xs text-muted mt-8">Your project root is <span className="mono">{projectsDir || '…'}</span></div>
              </div>
            )}
          </div>
          <div className="ide-bottom">
            <IDETerminal />
          </div>
        </div>
        {showAI && (
          <div className="ide-ai-panel">
            <IDEAIPanel activeFileName={openFile?.name} activeContent={openFile?.content} />
          </div>
        )}
      </div>
    </div>
  )
}
