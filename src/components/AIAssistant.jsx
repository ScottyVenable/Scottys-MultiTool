import React, { useState, useEffect, useRef } from 'react'
import { Bot, Send, Settings, Loader, Trash2, Terminal, Cpu, Play, Square, Eye, Camera, CheckCircle, XCircle, Database, Sliders, Save, Plus, X, Paperclip, Mic, MicOff, AlertTriangle, RefreshCw, Clock, Zap, ScrollText } from 'lucide-react'
import { MarkdownRenderer } from '../utils/markdown'
import { useToast } from './Toast'
import { useAIAttachments } from '../utils/aiAttachment'
import { safeCall, logError } from '../utils/logger'

const DEFAULT_SYSTEM_PROMPT = `You are MacroBot AI, an expert assistant for creating keyboard macros, hotkeys, and Windows automation.

When suggesting macros, use this step format clearly:
- KEY: ctrl+s
- TEXT: Hello World
- DELAY: 500
- CLICK: 960,540

Be concise and practical. Use markdown formatting to make your responses easy to read.`

const SUGGESTIONS = [
  'Create a macro for Ctrl+Alt+. training video navigation',
  'Write a macro that saves and closes a file',
  'Suggest a morning routine automation workflow',
  'How do I loop a macro 10 times with a delay?',
]

function ChatTab({ aiConfig }) {
  const toast = useToast()
  const { attachments, remove, clear } = useAIAttachments()
  const [messages, setMessages] = useState([
    { id: 0, role: 'ai', content: "Hello! I'm your AI automation assistant. Ask me anything or try a suggestion below." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [useContext, setUseContext] = useState(false)
  const [listening, setListening] = useState(false)
  const recogRef = useRef(null)
  const bottomRef = useRef(null)
  const isElectron = !!window.api

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast?.show?.('Speech recognition not supported in this runtime', 'warning'); return }
    if (listening) { recogRef.current?.stop(); return }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      let txt = ''
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
      setInput(txt)
    }
    rec.onend = () => { setListening(false); recogRef.current = null }
    rec.onerror = () => { setListening(false); recogRef.current = null }
    recogRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const userEntry = { id: Date.now(), role: 'user', content: msg, attached: attachments.map(a => a.name) }
    setMessages(m => [...m, userEntry])
    setLoading(true)
    try {
      if (!isElectron) {
        await new Promise(r => setTimeout(r, 500))
        setMessages(m => [...m, { id: Date.now(), role: 'ai', content: `## Preview Mode\n\n> ${msg}\n\nConnect to an AI in the AI Settings tab.` }])
        return
      }
      const endpoint = aiConfig.apiBase || 'http://localhost:1234'
      const images = []
      for (const a of attachments) {
        if (a.type === 'image' && a.dataUrl) images.push(a.dataUrl)
      }
      const result = await window.api.ai.query({
        prompt: msg,
        systemPrompt: aiConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        endpoint,
        apiKey: (aiConfig.provider === 'openai' || aiConfig.provider === 'anthropic') ? aiConfig.apiKey : undefined,
        model: aiConfig.model || 'local-model',
        images: images.length ? images : undefined,
        useContext,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
        topP: aiConfig.topP,
      })
      clear()
      setMessages(m => [...m, { id: Date.now(), role: 'ai', content: result.success ? result.content : `**Error:** ${result.error}` }])
    } catch (e) {
      logError('chat.send', e, toast)
      setMessages(m => [...m, { id: Date.now(), role: 'ai', content: `**Error:** ${e.message}` }])
    } finally { setLoading(false) }
  }

  return (
    <div className="card flex-col" style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
      <div className="chat-messages" style={{ flex: 1 }}>
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg ${msg.role}`}>
            <div className="chat-avatar">{msg.role === 'user' ? 'S' : <Bot size={12} />}</div>
            <div className="chat-bubble">
              {msg.role === 'ai' ? <MarkdownRenderer content={msg.content} /> : <span>{msg.content}</span>}
              {msg.attached?.length > 0 && <div className="text-xs text-muted mt-4"><Paperclip size={9} /> {msg.attached.join(', ')}</div>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg ai">
            <div className="chat-avatar"><Bot size={12} /></div>
            <div className="chat-bubble"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}><Loader size={12} className="animate-spin" /> Thinking...</span></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 1 && (
        <div className="flex" style={{ flexWrap: 'wrap', gap: 6, padding: '0 16px 12px' }}>
          {SUGGESTIONS.map(s => <button key={s} className="btn btn-secondary btn-sm" onClick={() => send(s)} style={{ fontSize: 11.5 }}>{s}</button>)}
        </div>
      )}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 16px', flexWrap: 'wrap' }}>
          {attachments.map(a => (
            <span key={a.id} className="tag-chip"><Paperclip size={10} /> {a.name} <button className="btn btn-ghost btn-icon" style={{ width: 14, height: 14 }} onClick={() => remove(a.id)}><X size={9} /></button></span>
          ))}
        </div>
      )}
      <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-3)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={useContext} onChange={e => setUseContext(e.target.checked)} />
          <Database size={11} /> Include my data (journal, notes, reminders)
        </label>
      </div>
      <div className="chat-input-row">
        <button className="btn btn-ghost btn-sm" onClick={() => setMessages([{ id: 0, role: 'ai', content: 'Chat cleared.' }])}><Trash2 size={13} /></button>
        <button className={`btn btn-sm ${listening ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleMic} title={listening ? 'Stop listening' : 'Voice input'}>
          {listening ? <MicOff size={13} /> : <Mic size={13} />}
        </button>
        <input className="input flex-1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Ask about macros, hotkeys, or automations..." disabled={loading} />
        <button className="btn btn-primary btn-icon" onClick={() => send()} disabled={!input.trim() || loading}><Send size={14} /></button>
      </div>
    </div>
  )
}

function AgentCLITab() {
  const [output, setOutput] = useState('')
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const outputRef = useRef(null)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.on('shell:data', (text) => {
      setOutput(o => o + text)
      setTimeout(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight }, 0)
    })
    window.api.on('shell:closed', () => { setRunning(false) })
  }, [])

  const spawn = async () => { if (!isElectron) return; setOutput(''); setRunning(true); await window.api.shell.spawn() }
  const sendCmd = async () => {
    if (!isElectron || !input.trim()) return
    setOutput(o => o + `\n> ${input}\n`)
    await window.api.shell.write(input); setInput('')
  }
  const kill = async () => { if (!isElectron) return; await window.api.shell.kill(); setRunning(false) }

  return (
    <div className="flex-col gap-12" style={{ flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!running
          ? <button className="btn btn-success" onClick={spawn}><Play size={14} /> Start PowerShell</button>
          : <button className="btn btn-danger" onClick={kill}><Square size={14} /> Kill</button>
        }
        <span className="text-xs text-muted">Persistent PowerShell session. Type commands below.</span>
      </div>
      <div ref={outputRef} className="terminal-output" style={{ flex: 1, minHeight: 300, maxHeight: '60vh' }}>
        {output || (running ? 'Session started.\n' : 'Start a session to begin.')}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input mono flex-1" value={input} disabled={!running}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendCmd()}
          placeholder="Enter command..." style={{ fontSize: 13 }} />
        <button className="btn btn-primary" onClick={sendCmd} disabled={!running || !input.trim()}><Send size={14} /></button>
      </div>
    </div>
  )
}

const COMPUTER_USE_SYSTEM = `You are a computer use agent controlling a Windows PC. Analyze the screenshot and determine the single best next action to achieve the goal.

Respond with a single JSON object — no markdown, no code fences, just raw JSON:
{
  "thought": "<brief reasoning, max 20 words>",
  "action": "CLICK" | "TYPE" | "KEY" | "SCROLL" | "WAIT" | "DONE",
  "x": <integer, for CLICK/SCROLL>,
  "y": <integer, for CLICK/SCROLL>,
  "text": "<string, for TYPE>",
  "combo": "<string, for KEY, e.g. ctrl+s, win+r, alt+f4, enter>",
  "direction": "up" | "down" | "left" | "right",
  "amount": <integer, scroll clicks, default 3>,
  "ms": <integer, milliseconds for WAIT>,
  "reason": "<string, for DONE>"
}

Rules:
- Use pixel coordinates visible in the screenshot for CLICK and SCROLL.
- DONE when the goal is fully achieved or clearly impossible.
- Omit fields that do not apply to the chosen action.`

function parseAction(text) {
  const raw = text || ''
  let thought = '', action = null, error = null
  // Try JSON parse first (structured output mode)
  try {
    // Strip markdown code fences if the model wraps them anyway
    const jsonStr = raw.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim()
    const j = JSON.parse(jsonStr)
    thought = (j.thought || '').trim()
    const type = (j.action || '').toLowerCase()
    if (type === 'click') {
      const x = parseInt(j.x), y = parseInt(j.y)
      if (!isNaN(x) && !isNaN(y)) action = { type: 'click', x, y }
      else error = 'CLICK missing x/y'
    } else if (type === 'type') {
      action = { type: 'type', text: String(j.text ?? '') }
    } else if (type === 'key') {
      action = { type: 'key', combo: String(j.combo || '').trim() }
    } else if (type === 'scroll') {
      action = { type: 'scroll', x: parseInt(j.x) || 0, y: parseInt(j.y) || 0,
        direction: (j.direction || 'down').toLowerCase(), amount: parseInt(j.amount) || 3 }
    } else if (type === 'wait') {
      action = { type: 'wait', ms: Math.min(parseInt(j.ms) || 500, 10000) }
    } else if (type === 'done') {
      action = { type: 'done', reason: String(j.reason || '').trim() }
    } else {
      error = `Unknown action type: "${j.action}"`
    }
  } catch {
    // Fallback: parse legacy THOUGHT/ACTION line format
    const normalized = raw
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .replace(/([^\n])\s+(ACTION:)/gi, '$1\n$2')
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)
    thought = (lines.find(l => /^THOUGHT:/i.test(l)) || '').replace(/^THOUGHT:\s*/i, '').trim()
    const actionLine = lines.find(l => /^ACTION:/i.test(l)) || ''
    const a = actionLine.replace(/^ACTION:\s*/i, '').trim()
    let m
    if (!a) {
      error = 'No ACTION line found in response'
    } else if ((m = a.match(/^CLICK\s+(\d+)\s+(\d+)/i))) {
      action = { type: 'click', x: parseInt(m[1]), y: parseInt(m[2]) }
    } else if ((m = a.match(/^TYPE\s+"(.*)"/i))) {
      action = { type: 'type', text: m[1] }
    } else if ((m = a.match(/^TYPE\s+([\s\S]+)/i))) {
      action = { type: 'type', text: m[1].trim() }
    } else if ((m = a.match(/^KEY\s+(.+)/i))) {
      action = { type: 'key', combo: m[1].trim() }
    } else if ((m = a.match(/^SCROLL\s+(\d+)\s+(\d+)\s+(up|down|left|right)(?:\s+(\d+))?/i))) {
      action = { type: 'scroll', x: parseInt(m[1]), y: parseInt(m[2]), direction: m[3].toLowerCase(), amount: parseInt(m[4] || '3') }
    } else if ((m = a.match(/^WAIT\s+(\d+)/i))) {
      action = { type: 'wait', ms: Math.min(parseInt(m[1]), 10000) }
    } else if (/^DONE/i.test(a)) {
      action = { type: 'done', reason: a.replace(/^DONE\s*/i, '').trim() }
    } else {
      error = `Unrecognized action: "${a.slice(0, 50)}"`
    }
  }
  return { thought, action, error, raw }
}

function describeAction(action) {
  if (!action) return '(null)'
  switch (action.type) {
    case 'click':  return `Click at (${action.x}, ${action.y})`
    case 'type':   return `Type: "${action.text}"`
    case 'key':    return `Press: ${action.combo}`
    case 'scroll': return `Scroll ${action.direction} at (${action.x}, ${action.y}) ×${action.amount}`
    case 'wait':   return `Wait ${action.ms}ms`
    case 'done':   return `Done: ${action.reason}`
    default:       return JSON.stringify(action)
  }
}

function ComputerUseTab({ aiConfig }) {
  const toast = useToast()
  const [goal, setGoal] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [running, setRunning] = useState(false)
  const [pending, _setPending] = useState(null)
  const [iteration, _setIteration] = useState(0)
  const [autoApprove, setAutoApprove] = useState(false)
  const [stepDelay, setStepDelay] = useState(1500)
  const [debugMode, setDebugMode] = useState(false)
  const [imgFull, setImgFull] = useState(false)
  const [actionError, setActionError] = useState(null)
  const transcriptRef = useRef(null)
  const runRef = useRef(false)
  const pendingRef = useRef(null)
  const iterRef = useRef(0)
  const approveRef = useRef(null)
  const errorCapRef = useRef(null)
  const MAX_ITER = 20
  const isElectron = !!window.api

  const setPending = (v) => { pendingRef.current = v; _setPending(v) }
  const setIteration = (v) => {
    const next = typeof v === 'function' ? v(iterRef.current) : v
    iterRef.current = next; _setIteration(next)
  }
  useEffect(() => { runRef.current = running }, [running])

  const scrollLog = () => setTimeout(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, 30)

  const addEntry = (entry) => {
    setTranscript(t => [...t, { id: Date.now() + Math.random(), ts: new Date().toLocaleTimeString('en-US', { hour12: false }), ...entry }])
    scrollLog()
  }

  const takeScreenshot = async () => {
    const sources = await safeCall(() => window.api.screen.sources(), { where: 'screen.sources', toast, fallback: [] })
    if (!sources?.length) return null
    const cap = await safeCall(() => window.api.screen.capture(sources[0].id), { where: 'screen.capture', toast, fallback: null })
    if (cap?.success) setScreenshot(cap.dataUrl)
    return cap
  }

  const requestNextAction = async (cap, retryNote) => {
    const step = iterRef.current + 1
    const promptText = retryNote
      ? `GOAL: ${goal}\n\nYour previous response could not be parsed: ${retryNote}\nRespond with a valid JSON object only, no markdown or extra text.`
      : `GOAL: ${goal}\n\nStep ${step}. Analyze the screenshot and give the next single action.`
    const result = await safeCall(() => window.api.ai.query({
      prompt: promptText,
      systemPrompt: COMPUTER_USE_SYSTEM,
      endpoint: aiConfig.apiBase || 'http://localhost:1234',
      apiKey: (aiConfig.provider === 'openai' || aiConfig.provider === 'anthropic') ? aiConfig.apiKey : undefined,
      model: aiConfig.model || 'local-model',
      images: [cap.dataUrl],
      temperature: 0.1,
      maxTokens: 300,
      responseFormat: 'json_object',
    }), { where: 'ai.query', toast, fallback: { success: false, error: 'AI call failed' } })
    if (!runRef.current) return
    if (!result?.success) {
      addEntry({ type: 'error', text: `AI error: ${result?.error || 'unknown'}` })
      errorCapRef.current = cap
      setActionError({ msg: result?.error || 'AI call failed', canRetry: true })
      setRunning(false); runRef.current = false; return
    }
    const parsed = parseAction(result.content)
    if (debugMode) addEntry({ type: 'debug', text: result.content.slice(0, 400) })
    if (parsed.thought) addEntry({ type: 'thought', text: parsed.thought })
    if (parsed.error) addEntry({ type: 'error', text: `Parse: ${parsed.error}` })
    if (!parsed.action) {
      if (!retryNote) {
        addEntry({ type: 'system', text: 'Parse failed — retrying with corrective prompt…' })
        await requestNextAction(cap, `"${(result.content || '').slice(0, 80)}"`)
      } else {
        addEntry({ type: 'error', text: 'Could not parse action after retry. Stopping.' })
        errorCapRef.current = cap
        setActionError({ msg: 'Unparseable response (2 attempts). Check your model supports vision.', canRetry: false })
        setRunning(false); runRef.current = false
      }
      return
    }
    if (parsed.action.type === 'done') {
      addEntry({ type: 'done', text: parsed.action.reason || 'Goal complete.' })
      setRunning(false); runRef.current = false; return
    }
    setPending({ ...parsed.action, _raw: result.content })
  }

  const approve = async () => {
    const action = pendingRef.current
    if (!action) return
    const clean = { ...action }
    delete clean._raw
    addEntry({ type: 'action', text: describeAction(clean) })
    setPending(null); setActionError(null)
    const res = await safeCall(() => window.api.action.execute(clean), { where: 'action.execute', toast, fallback: { success: false } })
    if (!runRef.current) return
    if (!res?.success) {
      addEntry({ type: 'error', text: `Execution failed: ${res?.error || 'unknown'}` })
      setActionError({ msg: res?.error || 'Action execution failed', canRetry: false })
      setRunning(false); runRef.current = false; return
    }
    setIteration(i => i + 1)
    if (iterRef.current >= MAX_ITER) {
      addEntry({ type: 'system', text: `Max iterations (${MAX_ITER}) reached.` })
      setRunning(false); runRef.current = false; return
    }
    await new Promise(r => setTimeout(r, 500))
    if (!runRef.current) return
    const cap = await takeScreenshot()
    if (cap?.success) await requestNextAction(cap)
    else { addEntry({ type: 'error', text: 'Screenshot failed after action.' }); setRunning(false); runRef.current = false }
  }
  approveRef.current = approve

  useEffect(() => {
    if (!pending || !autoApprove || !running) return
    const tid = setTimeout(() => { if (runRef.current) approveRef.current?.() }, stepDelay)
    return () => clearTimeout(tid)
  }, [pending, autoApprove, running, stepDelay])

  const reject = () => {
    setPending(null)
    addEntry({ type: 'system', text: 'Action rejected by user.' })
    setRunning(false); runRef.current = false
  }

  const abort = () => {
    setRunning(false); runRef.current = false
    setPending(null); setActionError(null)
    addEntry({ type: 'system', text: 'Aborted.' })
  }

  const start = async () => {
    if (!goal.trim() || !isElectron) return
    setRunning(true); runRef.current = true
    setTranscript([]); setIteration(0); setPending(null); setActionError(null)
    errorCapRef.current = null
    addEntry({ type: 'system', text: `Goal: "${goal}"` })
    const cap = await takeScreenshot()
    if (!cap?.success) {
      addEntry({ type: 'error', text: 'Screen capture failed. Check Electron screen-capture permissions.' })
      setRunning(false); runRef.current = false; return
    }
    await requestNextAction(cap)
  }

  const retryFromError = async () => {
    const cap = errorCapRef.current
    setActionError(null); setRunning(true); runRef.current = true
    if (cap?.success) { await requestNextAction(cap); return }
    const newCap = await takeScreenshot()
    if (newCap?.success) await requestNextAction(newCap)
    else { addEntry({ type: 'error', text: 'Retry screenshot failed.' }); setRunning(false); runRef.current = false }
  }

  const ENTRY_STYLE = {
    thought: { bg: 'color-mix(in srgb, var(--blue, #3b82f6) 15%, transparent)', icon: '💭' },
    action:  { bg: 'color-mix(in srgb, var(--accent) 15%, transparent)', icon: '▶' },
    system:  { bg: 'var(--bg-3)', icon: '·' },
    error:   { bg: 'color-mix(in srgb, var(--red, #ef4444) 20%, transparent)', icon: '✗' },
    debug:   { bg: 'var(--bg-2)', icon: '»' },
    done:    { bg: 'color-mix(in srgb, var(--green, #22c55e) 20%, transparent)', icon: '✓' },
  }

  return (
    <div className="card flex-col gap-12" style={{ flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="card-title"><Eye size={14} className="card-title-icon" /> Computer Use Agent</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer' }}>
            <input type="checkbox" checked={debugMode} onChange={e => setDebugMode(e.target.checked)} />
            Debug
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: autoApprove ? 'var(--yellow)' : undefined, fontWeight: autoApprove ? 600 : 400 }}>
            <input type="checkbox" checked={autoApprove} onChange={e => setAutoApprove(e.target.checked)} />
            Auto-approve
          </label>
        </div>
      </div>

      <div className="text-xs" style={{ background: 'var(--bg-3)', padding: '7px 10px', borderRadius: 6, borderLeft: `3px solid ${autoApprove ? 'var(--yellow)' : 'var(--accent)'}` }}>
        {autoApprove
          ? <><b style={{ color: 'var(--yellow)' }}>⚠ Auto-approve ON</b> — actions execute after {(stepDelay / 1000).toFixed(1)}s. The agent controls your mouse and keyboard without prompting.</>
          : <>Manual mode — every proposed action needs approval. Requires a vision model (GPT-4o, Claude 3.5 Sonnet, LLaVA).</>
        }
      </div>

      {autoApprove && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
          <Clock size={12} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-2)', minWidth: 75 }}>Step delay</span>
          <input type="range" min={500} max={5000} step={250} value={stepDelay} onChange={e => setStepDelay(+e.target.value)} style={{ flex: 1 }} />
          <span style={{ minWidth: 44, color: 'var(--text-1)', fontFamily: 'var(--mono)' }}>{(stepDelay / 1000).toFixed(2)}s</span>
        </div>
      )}

      <div className="flex gap-8">
        <input className="input flex-1" value={goal} onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !running && start()}
          placeholder="e.g. Open Notepad and type hello world" disabled={running} />
        {!running
          ? <button className="btn btn-primary" onClick={start} disabled={!goal.trim() || !isElectron}><Play size={13} /> Start</button>
          : <button className="btn btn-danger" onClick={abort}><Square size={13} /> Abort</button>
        }
      </div>

      {(running || iterRef.current > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-2)' }}>
          <div style={{ flex: 1, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(iterRef.current / MAX_ITER) * 100}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontFamily: 'var(--mono)' }}>step {iterRef.current}/{MAX_ITER}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="text-xs text-muted mb-6" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Camera size={11} />
            <span>Screenshot{iterRef.current > 0 ? ` (after step ${iterRef.current})` : ''}</span>
            {screenshot && <button className="btn btn-ghost" style={{ padding: '1px 6px', fontSize: 10, marginLeft: 'auto' }} onClick={() => setImgFull(true)}>Full</button>}
          </div>
          <div style={{ flex: 1, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: screenshot ? 'zoom-in' : 'default' }}
            onClick={() => screenshot && setImgFull(true)}>
            {screenshot
              ? <img src={screenshot} style={{ maxWidth: '100%', maxHeight: '100%' }} alt="screen" />
              : <span className="text-xs text-muted">No screenshot yet</span>
            }
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
          {pending && (
            <div className="card" style={{ padding: 10, border: '1px solid var(--accent)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 600, fontSize: 12 }}>
                <Zap size={12} style={{ color: 'var(--accent)' }} /> Proposed Action
                {autoApprove && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--yellow)' }}>Auto in {(stepDelay / 1000).toFixed(1)}s…</span>}
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--mono)', background: 'var(--bg-3)', padding: 6, borderRadius: 4, marginBottom: 8, color: 'var(--text-0)' }}>
                {describeAction(pending)}
              </div>
              {debugMode && pending._raw && (
                <details style={{ marginBottom: 8 }}>
                  <summary style={{ fontSize: 10, color: 'var(--text-3)', cursor: 'pointer' }}>Raw AI response</summary>
                  <pre style={{ fontSize: 10, color: 'var(--text-2)', whiteSpace: 'pre-wrap', marginTop: 4, maxHeight: 100, overflow: 'auto' }}>{pending._raw}</pre>
                </details>
              )}
              {!autoApprove && (
                <div className="flex gap-6 justify-end">
                  <button className="btn btn-danger btn-sm" onClick={reject}><XCircle size={12} /> Reject</button>
                  <button className="btn btn-success btn-sm" onClick={approve}><CheckCircle size={12} /> Approve</button>
                </div>
              )}
            </div>
          )}

          {actionError && (
            <div className="card" style={{ padding: 10, border: '1px solid var(--red, #ef4444)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red, #ef4444)', fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                <AlertTriangle size={12} /> Error
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-1)', marginBottom: 8 }}>{actionError.msg}</div>
              <div className="flex gap-6">
                {actionError.canRetry !== false && <button className="btn btn-secondary btn-sm" onClick={retryFromError}><RefreshCw size={12} /> Retry</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => setActionError(null)}>Dismiss</button>
              </div>
            </div>
          )}

          <div className="card" style={{ flex: 1, minHeight: 0, padding: 10, display: 'flex', flexDirection: 'column' }}>
            <div className="text-xs text-muted mb-6" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ScrollText size={11} /> Transcript
              {transcript.length > 0 && <button className="btn btn-ghost" style={{ padding: '1px 6px', fontSize: 10, marginLeft: 'auto' }} onClick={() => setTranscript([])}>Clear</button>}
            </div>
            <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {transcript.length === 0 && <div className="text-xs text-muted">Set a goal and click Start.</div>}
              {transcript.map(t => {
                const s = ENTRY_STYLE[t.type] || { bg: 'var(--bg-3)', icon: '·' }
                return (
                  <div key={t.id} style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, background: s.bg, fontFamily: 'var(--mono)', lineHeight: 1.5 }}>
                    <span style={{ opacity: 0.5, marginRight: 4 }}>{s.icon}</span>
                    <span style={{ opacity: 0.4, fontSize: 9, marginRight: 5 }}>{t.ts}</span>
                    {t.text}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {imgFull && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setImgFull(false)}>
          <img src={screenshot} style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} alt="fullscreen" />
        </div>
      )}
    </div>
  )
}

function AISettingsTab({ aiConfig, setAiConfig, saveAll }) {
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const isElectron = !!window.api
  const toast = useToast()

  const update = (patch) => setAiConfig(c => ({ ...c, ...patch }))

  const fetchModels = async () => {
    if (!isElectron) return
    setLoadingModels(true)
    const list = await safeCall(() => window.api.ai.models(aiConfig.apiBase), { where: 'ai.models', toast, fallback: [] })
    setModels(list || []); setLoadingModels(false)
    toast.show({ type: 'success', title: 'Models', message: `${list?.length || 0} found` })
  }

  const addPrompt = () => {
    const name = window.prompt('Prompt name:')
    if (!name) return
    const body = window.prompt('Prompt body:', DEFAULT_SYSTEM_PROMPT) || DEFAULT_SYSTEM_PROMPT
    const list = [...(aiConfig.prompts || []), { id: `p-${Date.now()}`, name, body }]
    update({ prompts: list })
  }

  const activatePrompt = (p) => update({ systemPrompt: p.body, activePromptId: p.id })
  const deletePrompt = (id) => update({ prompts: (aiConfig.prompts || []).filter(p => p.id !== id) })

  return (
    <div className="flex-col gap-12" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="card">
        <div className="card-title mb-12"><Settings size={14} className="card-title-icon" /> Connection</div>
        <div className="grid-2 gap-12">
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select className="input" value={aiConfig.provider} onChange={e => update({ provider: e.target.value })}>
              <option value="lmstudio">LM Studio (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic / Claude</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Base URL</label>
            <input className="input mono" value={aiConfig.apiBase} onChange={e => update({ apiBase: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input className="input mono" type="password" value={aiConfig.apiKey} onChange={e => update({ apiKey: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Model</label>
            <div className="flex gap-6">
              {models.length
                ? <select className="input flex-1" value={aiConfig.model} onChange={e => update({ model: e.target.value })}>
                    <option value="">Auto</option>{models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                : <input className="input mono flex-1" value={aiConfig.model} onChange={e => update({ model: e.target.value })} placeholder="auto" />
              }
              <button className="btn btn-secondary btn-sm" onClick={fetchModels} disabled={loadingModels}>{loadingModels ? <Loader size={12} className="animate-spin" /> : <Cpu size={12} />}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-12"><Sliders size={14} className="card-title-icon" /> Sampling</div>
        <div className="grid-2 gap-12">
          <div className="form-group">
            <label className="form-label">Temperature ({aiConfig.temperature ?? 0.7})</label>
            <input type="range" min={0} max={1} step={0.05} value={aiConfig.temperature ?? 0.7} onChange={e => update({ temperature: parseFloat(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Tokens ({aiConfig.maxTokens ?? 1024})</label>
            <input type="range" min={128} max={4096} step={128} value={aiConfig.maxTokens ?? 1024} onChange={e => update({ maxTokens: parseInt(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Top P ({aiConfig.topP ?? 1})</label>
            <input type="range" min={0} max={1} step={0.05} value={aiConfig.topP ?? 1} onChange={e => update({ topP: parseFloat(e.target.value) })} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-12">
          <div className="card-title"><Database size={14} className="card-title-icon" /> System Prompts</div>
          <button className="btn btn-secondary btn-sm" onClick={addPrompt}><Plus size={12} /> Add</button>
        </div>
        <div className="form-group">
          <label className="form-label">Active Prompt</label>
          <textarea className="input mono" rows={5} value={aiConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT} onChange={e => update({ systemPrompt: e.target.value })} />
        </div>
        {(aiConfig.prompts || []).length > 0 && (
          <div className="flex-col gap-6 mt-8">
            {(aiConfig.prompts || []).map(p => (
              <div key={p.id} className="flex items-center justify-between" style={{ padding: 6, background: aiConfig.activePromptId === p.id ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-3)', borderRadius: 4 }}>
                <span className="text-sm">{p.name}</span>
                <div className="flex gap-4">
                  <button className="btn btn-ghost btn-sm" onClick={() => activatePrompt(p)}>Use</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deletePrompt(p.id)}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end" style={{ position: 'sticky', bottom: 0, padding: '8px 0', background: 'var(--bg-0)' }}>
        <button className="btn btn-primary" onClick={saveAll}><Save size={14} /> Save All Settings</button>
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const toast = useToast()
  const [tab, setTab] = useState('chat')
  const [aiConfig, setAiConfig] = useState({
    provider: 'lmstudio',
    apiKey: '',
    apiBase: 'http://localhost:1234',
    model: '',
    temperature: 0.7,
    maxTokens: 1024,
    topP: 1,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    prompts: [],
    activePromptId: null,
  })
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.store.get('settings').then(s => {
      if (!s) return
      setAiConfig(c => ({
        ...c,
        provider: s.aiProvider || c.provider,
        apiKey: s.aiApiKey || c.apiKey,
        apiBase: s.aiApiBase || c.apiBase,
        model: s.aiModel || c.model,
        temperature: s.aiTemperature ?? c.temperature,
        maxTokens: s.aiMaxTokens ?? c.maxTokens,
        topP: s.aiTopP ?? c.topP,
        systemPrompt: s.aiSystemPrompt || c.systemPrompt,
        prompts: s.aiPrompts || c.prompts,
        activePromptId: s.aiActivePromptId || c.activePromptId,
      }))
    })
  }, [])

  const saveAll = async () => {
    if (!isElectron) return
    const s = (await window.api.store.get('settings')) || {}
    await window.api.store.set('settings', {
      ...s,
      aiProvider: aiConfig.provider,
      aiApiKey: aiConfig.apiKey,
      aiApiBase: aiConfig.apiBase,
      aiModel: aiConfig.model,
      aiTemperature: aiConfig.temperature,
      aiMaxTokens: aiConfig.maxTokens,
      aiTopP: aiConfig.topP,
      aiSystemPrompt: aiConfig.systemPrompt,
      aiPrompts: aiConfig.prompts,
      aiActivePromptId: aiConfig.activePromptId,
    })
    toast.show({ type: 'success', title: 'Saved', message: 'AI settings updated' })
  }

  const TABS = [
    { id: 'chat', label: 'Chat', icon: Bot },
    { id: 'cli', label: 'Agent CLI', icon: Terminal },
    { id: 'computer', label: 'Computer Use', icon: Eye },
    { id: 'settings', label: 'AI Settings', icon: Settings },
  ]

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' }}>
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div className="page-header-left">
          <div className="page-title">AI Workstation</div>
          <div className="page-subtitle">Chat, CLI automation, visual agent, and AI configuration</div>
        </div>
      </div>

      <div className="tab-bar mb-16">
        {TABS.map(t => (
          <button key={t.id} className={`tab-item ${tab === t.id ? 'tab-active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'chat' && <ChatTab aiConfig={aiConfig} />}
      {tab === 'cli' && <AgentCLITab />}
      {tab === 'computer' && <ComputerUseTab aiConfig={aiConfig} />}
      {tab === 'settings' && <AISettingsTab aiConfig={aiConfig} setAiConfig={setAiConfig} saveAll={saveAll} />}
    </div>
  )
}
