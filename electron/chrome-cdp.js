// Chrome DevTools Protocol bridge for the AI computer-use tab.
// Launches Chrome with --remote-debugging-port, attaches via
// chrome-remote-interface, and exposes a narrow command surface:
//   detect, launch, attach, listTargets, navigate, screenshot, action, close
// Actions are intentionally coarse (click by selector, type text, scroll).
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

let CDP = null
try { CDP = require('chrome-remote-interface') } catch (e) { /* optional at install time */ }

const state = {
  client: null,
  proc: null,
  port: 9222,
  userDataDir: null,
  logFile: null,
}

function log(msg) {
  try {
    if (!state.logFile) return
    fs.appendFileSync(state.logFile, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
}

function findChromePath() {
  // Common install locations on Windows. PATH first, then Program Files.
  const candidates = [
    path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Microsoft/Edge/Application/msedge.exe'),
  ]
  for (const c of candidates) { try { if (c && fs.existsSync(c)) return c } catch {} }
  return null
}

async function detect() {
  const exe = findChromePath()
  return { ok: !!exe, path: exe, hasLib: !!CDP }
}

async function launch({ port, userDataDir, url } = {}) {
  if (!CDP) throw new Error('chrome-remote-interface is not installed')
  if (state.proc) throw new Error('Chrome is already running')
  const exe = findChromePath()
  if (!exe) throw new Error('Chrome/Edge executable not found')
  state.port = Number(port) || 9222
  state.userDataDir = userDataDir || path.join(os.tmpdir(), 'scotty-cdp-profile')
  try { fs.mkdirSync(state.userDataDir, { recursive: true }) } catch {}
  const args = [
    `--remote-debugging-port=${state.port}`,
    `--user-data-dir=${state.userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    url || 'about:blank',
  ]
  state.proc = spawn(exe, args, { detached: false, stdio: 'ignore' })
  log(`launched ${exe} port=${state.port}`)
  // Wait briefly for the debugger to come up.
  for (let i = 0; i < 20; i++) {
    try {
      const v = await CDP.Version({ port: state.port })
      if (v) return { ok: true, port: state.port, product: v.Browser }
    } catch {}
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error('Chrome launched but CDP did not respond')
}

async function attach({ port } = {}) {
  if (!CDP) throw new Error('chrome-remote-interface is not installed')
  state.port = Number(port) || state.port || 9222
  if (state.client) { try { await state.client.close() } catch {} state.client = null }
  state.client = await CDP({ port: state.port })
  const { Page, DOM, Runtime, Input } = state.client
  await Promise.all([Page.enable(), DOM.enable(), Runtime.enable()])
  log(`attached port=${state.port}`)
  return { ok: true, port: state.port }
}

async function listTargets() {
  if (!CDP) throw new Error('chrome-remote-interface is not installed')
  const list = await CDP.List({ port: state.port })
  return list.filter(t => t.type === 'page').map(t => ({ id: t.id, title: t.title, url: t.url }))
}

async function navigate({ url }) {
  if (!state.client) throw new Error('Not attached')
  const { Page } = state.client
  await Page.navigate({ url })
  await Page.loadEventFired()
  return { ok: true }
}

async function screenshot() {
  if (!state.client) throw new Error('Not attached')
  const { Page } = state.client
  const { data } = await Page.captureScreenshot({ format: 'png' })
  return { ok: true, dataUrl: `data:image/png;base64,${data}` }
}

// Perform a scripted action. Kept deliberately minimal to avoid acting as
// a general-purpose browser automation tool — enough for AI experiments.
async function action({ kind, selector, text, x, y }) {
  if (!state.client) throw new Error('Not attached')
  const { Runtime } = state.client
  const esc = (s) => JSON.stringify(String(s ?? ''))
  let expr = ''
  switch (kind) {
    case 'click':
      expr = `(() => { const el = document.querySelector(${esc(selector)}); if (!el) return { ok:false, error:'not found' }; el.click(); return { ok:true } })()`
      break
    case 'type':
      expr = `(() => { const el = document.querySelector(${esc(selector)}); if (!el) return { ok:false, error:'not found' }; el.focus(); el.value = ${esc(text)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return { ok:true } })()`
      break
    case 'scroll':
      expr = `(() => { window.scrollTo(${Number(x)||0}, ${Number(y)||0}); return { ok:true } })()`
      break
    case 'text':
      expr = `(() => { const el = document.querySelector(${esc(selector)}); return { ok:!!el, value: el ? (el.innerText||el.value||'') : '' } })()`
      break
    default:
      throw new Error('unknown action kind: ' + kind)
  }
  const r = await Runtime.evaluate({ expression: expr, returnByValue: true })
  log(`action ${kind} ${selector || ''} -> ${JSON.stringify(r.result?.value)}`)
  return r.result?.value || { ok: false }
}

async function close() {
  try { if (state.client) await state.client.close() } catch {}
  state.client = null
  try { if (state.proc) state.proc.kill() } catch {}
  state.proc = null
  log('closed')
  return { ok: true }
}

function registerIpc(ipcMain, app) {
  const logsDir = path.join(app.getPath('userData'), 'logs')
  try { fs.mkdirSync(logsDir, { recursive: true }) } catch {}
  state.logFile = path.join(logsDir, `cdp-${new Date().toISOString().slice(0,10)}.log`)

  ipcMain.handle('cdp:detect', async () => detect())
  ipcMain.handle('cdp:launch', async (_, opts) => launch(opts || {}))
  ipcMain.handle('cdp:attach', async (_, opts) => attach(opts || {}))
  ipcMain.handle('cdp:listTargets', async () => listTargets())
  ipcMain.handle('cdp:navigate', async (_, opts) => navigate(opts || {}))
  ipcMain.handle('cdp:screenshot', async () => screenshot())
  ipcMain.handle('cdp:action', async (_, opts) => action(opts || {}))
  ipcMain.handle('cdp:close', async () => close())
}

module.exports = { registerIpc }
