// Lightweight local server for social / multiplayer features.
//
// Runs standalone (node server/index.js) and is managed by the launcher CLI.
// All state lives in a single JSON file under the user's APPDATA so multiple
// instances on the same machine can share data without a real database.
// Logs go to both the console (with color prefixes) and a rolling log file
// the launcher can tail.
//
// Endpoints are deliberately tiny and unauthenticated for now — this is the
// scaffolding that lets the desktop client light up a "server connected"
// indicator and start pushing presence. A real auth layer lands later.

const http = require('http')
const path = require('path')
const fs = require('fs')
const os = require('os')
const express = require('express')
const cors = require('cors')
const { WebSocketServer } = require('ws')

const PORT = Number(process.env.SCOTTY_SERVER_PORT || 4455)
const APPDATA = process.env.APPDATA || path.join(os.homedir(), '.scotty-multitool')
const DATA_DIR = path.join(APPDATA, 'scotty-multitool', 'server')
const LOG_DIR  = path.join(DATA_DIR, 'logs')
const DB_FILE  = path.join(DATA_DIR, 'state.json')
fs.mkdirSync(LOG_DIR, { recursive: true })

const LOG_FILE = path.join(LOG_DIR, `server-${new Date().toISOString().slice(0, 10)}.log`)
const color = { dim: '\x1b[2m', red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', cyan: '\x1b[36m', magenta: '\x1b[35m', reset: '\x1b[0m' }
function log(level, tag, msg) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${tag}] ${msg}`
  const c = level === 'error' ? color.red : level === 'warn' ? color.yellow : level === 'ok' ? color.green : color.cyan
  process.stdout.write(`${c}${line}${color.reset}\n`)
  try { fs.appendFileSync(LOG_FILE, line + '\n') } catch {}
}

// ---------- tiny JSON store ----------
function loadState() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
  catch { return { users: {}, friends: {}, presence: {}, messages: [], households: {}, currency: {} } }
}
function saveState(state) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2)) }
  catch (e) { log('error', 'store', e.message) }
}
let state = loadState()
let saveTimer = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => { saveTimer = null; saveState(state) }, 250)
}

// ---------- HTTP ----------
const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '256kb' }))
app.use((req, _res, next) => { log('info', 'http', `${req.method} ${req.url}`); next() })

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'scotty-multitool-server',
    version: '0.1.0',
    uptime: process.uptime(),
    users: Object.keys(state.users).length,
    online: Object.values(state.presence).filter(p => p?.online).length,
  })
})

// Friends (very simple: each user has a list of friend IDs).
app.get('/friends/:userId', (req, res) => {
  res.json({ ok: true, friends: state.friends[req.params.userId] || [] })
})
app.post('/friends/:userId/add', (req, res) => {
  const { userId } = req.params
  const { friendId } = req.body || {}
  if (!friendId) return res.status(400).json({ ok: false, error: 'friendId required' })
  state.friends[userId] = Array.from(new Set([...(state.friends[userId] || []), friendId]))
  state.friends[friendId] = Array.from(new Set([...(state.friends[friendId] || []), userId]))
  scheduleSave()
  res.json({ ok: true, friends: state.friends[userId] })
})

// Presence — lightweight ring buffer of current status per user.
app.post('/presence/:userId', (req, res) => {
  const { userId } = req.params
  const { status, activity, online } = req.body || {}
  state.presence[userId] = { userId, status: status || 'idle', activity: activity || '', online: online !== false, ts: Date.now() }
  scheduleSave()
  broadcast({ type: 'presence', presence: state.presence[userId] })
  res.json({ ok: true, presence: state.presence[userId] })
})
app.get('/presence', (_req, res) => res.json({ ok: true, presence: state.presence }))

// Messages — flat list for now, UI filters by conversation.
app.get('/messages/:userId', (req, res) => {
  const mine = state.messages.filter(m => m.to === req.params.userId || m.from === req.params.userId)
  res.json({ ok: true, messages: mine })
})
app.post('/messages', (req, res) => {
  const { from, to, body } = req.body || {}
  if (!from || !to || !body) return res.status(400).json({ ok: false, error: 'from/to/body required' })
  const msg = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), from, to, body: String(body).slice(0, 2000), ts: Date.now() }
  state.messages.push(msg)
  if (state.messages.length > 5000) state.messages.splice(0, state.messages.length - 5000)
  scheduleSave()
  broadcast({ type: 'message', message: msg })
  res.json({ ok: true, message: msg })
})

// ---------- WebSocket for push events ----------
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress
  log('ok', 'ws', `client connected from ${ip}`)
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }))
  ws.on('close', () => log('info', 'ws', `client ${ip} disconnected`))
  ws.on('error', (e) => log('error', 'ws', e.message))
})
function broadcast(payload) {
  const data = JSON.stringify(payload)
  for (const c of wss.clients) { if (c.readyState === 1) { try { c.send(data) } catch {} } }
}

// Periodic heartbeat so clients can detect stale connections.
setInterval(() => broadcast({ type: 'heartbeat', ts: Date.now() }), 15000)

// ---------- lifecycle ----------
server.listen(PORT, () => {
  log('ok', 'boot', `listening on http://localhost:${PORT}`)
  log('info', 'boot', `data dir: ${DATA_DIR}`)
  log('info', 'boot', `log file: ${LOG_FILE}`)
})
server.on('error', (e) => log('error', 'boot', e.message))

function shutdown(sig) {
  log('warn', 'boot', `received ${sig}, shutting down`)
  try { saveState(state) } catch {}
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
