const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, screen, Notification, dialog, shell: electronShell, desktopCapturer, session, protocol } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { exec, spawn } = require('child_process')
const http = require('http')
const express = require('express')
const { WebSocketServer } = require('ws')
const authLib = require('./auth')

const isDev = process.argv.includes('--dev')

// Register the custom media:// scheme as privileged so <video>/<audio> can
// stream from it (range requests, CORS-safe). Must happen before app.ready.
try {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
  ])
} catch {}

// ─── Persistent Storage ───────────────────────────────────────────────────────
const userData = app.getPath('userData')
const storePath = path.join(userData, 'macrobot-data.json')

function loadStore() {
  try {
    if (fs.existsSync(storePath)) return JSON.parse(fs.readFileSync(storePath, 'utf8'))
  } catch {}
  return { macros: [], hotkeys: [], expanders: [], settings: {}, clipboardHistory: [], appLaunchers: [], notes: [], scheduledTasks: [], journal: [], reminders: [], mediaLibrary: [], bookmarks: [], chores: [], choreProfile: { xp: 0, level: 0, achievements: [], history: [] }, aiSettings: { prompts: [], activePromptId: null, model: '', temperature: 0.7, maxTokens: 1024, topP: 1.0, endpoint: 'http://localhost:1234', apiKey: '', knowledgeBase: [] } }
}
function saveStore(data) {
  try { fs.writeFileSync(storePath, JSON.stringify(data, null, 2)) } catch (e) { console.error('Store save error:', e) }
}
let store = loadStore()
// One-time migration: move pre-auth data into a default user bucket.
authLib.ensureShape(store)
authLib.migrateIfNeeded(store, saveStore)

// ─── Key Simulation ───────────────────────────────────────────────────────────
function convertToSendKeys(combo) {
  const parts = combo.toLowerCase().split('+').map(s => s.trim())
  let mods = '', key = ''
  const specialMap = {
    enter: '{ENTER}', return: '{ENTER}', tab: '{TAB}', esc: '{ESC}', escape: '{ESC}',
    space: '{SPACE}', backspace: '{BACKSPACE}', delete: '{DELETE}', del: '{DELETE}',
    up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}',
    home: '{HOME}', end: '{END}', pageup: '{PGUP}', pagedown: '{PGDN}',
    f1:'{F1}',f2:'{F2}',f3:'{F3}',f4:'{F4}',f5:'{F5}',f6:'{F6}',
    f7:'{F7}',f8:'{F8}',f9:'{F9}',f10:'{F10}',f11:'{F11}',f12:'{F12}',
    '.':'.', ',':',', '/':'/', '-':'-', '=':'=', '[':'[', ']':']', ';':';'
  }
  for (const p of parts) {
    if (p === 'ctrl' || p === 'control') mods += '^'
    else if (p === 'alt') mods += '%'
    else if (p === 'shift') mods += '+'
    else key = specialMap[p] || p
  }
  return mods && key ? `${mods}(${key})` : (mods + key)
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))

async function psRun(script) {
  return new Promise((resolve) => {
    const child = exec('powershell -NonInteractive -NoProfile -Command -')
    let out = ''
    child.stdout?.on('data', d => out += d)
    child.stdin.write(script)
    child.stdin.end()
    child.on('close', () => resolve(out.trim()))
    child.on('error', () => resolve(''))
    setTimeout(() => { try { child.kill() } catch {}; resolve('') }, 8000)
  })
}

async function sendKeys(combo) {
  const sk = convertToSendKeys(combo)
  await psRun(`Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 150; [System.Windows.Forms.SendKeys]::SendWait('${sk.replace(/'/g, "''")}')`)
}

async function typeText(text) {
  const escaped = text.replace(/'/g, "''").replace(/[+^%~(){}[\]]/g, '{$&}')
  await psRun(`Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 150; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`)
}

async function mouseClick(x, y) {
  await psRun(`
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class Mouse { [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int i); }
"@
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
Start-Sleep -Milliseconds 50
[Mouse]::mouse_event(0x0002,0,0,0,0); [Mouse]::mouse_event(0x0004,0,0,0,0)`)
}

async function activateWindow(titleSearch) {
  await psRun(`$wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate('${titleSearch.replace(/'/g, "''")}') | Out-Null`)
  await delay(250)
}

// ─── Background Window Targeting (no focus steal) ─────────────────────────────
// Uses user32!PostMessageW to deliver WM_KEYDOWN/WM_KEYUP/WM_CHAR/WM_LBUTTON* to
// a specific HWND. Works for most classic Win32 apps (Notepad, Explorer, WinForms,
// WPF). Many modern apps (games with DirectInput/RawInput, Chromium/Electron,
// elevated admin windows) will ignore these messages — users are warned in the UI.

// Shared P/Invoke + helpers block injected into every background PS call.
const BG_WINTOOLS_PREFIX = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class MB_Win {
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
  [DllImport("user32.dll", CharSet=CharSet.Auto, SetLastError=true)] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll", CharSet=CharSet.Auto, SetLastError=true)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll", CharSet=CharSet.Auto, SetLastError=true)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern short VkKeyScan(char ch);
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);
  public const uint WM_KEYDOWN    = 0x0100;
  public const uint WM_KEYUP      = 0x0101;
  public const uint WM_CHAR       = 0x0102;
  public const uint WM_SYSKEYDOWN = 0x0104;
  public const uint WM_SYSKEYUP   = 0x0105;
  public const uint WM_LBUTTONDOWN = 0x0201;
  public const uint WM_LBUTTONUP   = 0x0202;
  public const uint WM_RBUTTONDOWN = 0x0204;
  public const uint WM_RBUTTONUP   = 0x0205;
}
"@
`

// Enumerate all top-level visible windows with title, class, pid, process name.
async function getWindowsDetailed() {
  const script = `${BG_WINTOOLS_PREFIX}
$results = New-Object System.Collections.ArrayList
$callback = [MB_Win+EnumWindowsProc] {
  param($hWnd, $lParam)
  if (-not [MB_Win]::IsWindowVisible($hWnd)) { return $true }
  $len = [MB_Win]::GetWindowTextLength($hWnd)
  if ($len -le 0) { return $true }
  $sb = New-Object System.Text.StringBuilder ($len + 2)
  [MB_Win]::GetWindowText($hWnd, $sb, $sb.Capacity) | Out-Null
  $title = $sb.ToString()
  if ([string]::IsNullOrWhiteSpace($title)) { return $true }
  $cn = New-Object System.Text.StringBuilder 256
  [MB_Win]::GetClassName($hWnd, $cn, 256) | Out-Null
  $procId = 0
  [MB_Win]::GetWindowThreadProcessId($hWnd, [ref]$procId) | Out-Null
  $procName = ''
  try { $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName } catch {}
  $null = $results.Add([PSCustomObject]@{
    hwnd = [int64]$hWnd
    pid = [int]$procId
    title = $title
    className = $cn.ToString()
    processName = $procName
  })
  return $true
}
[MB_Win]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
$results | ConvertTo-Json -Compress -Depth 3
`
  const out = await psRun(script)
  try {
    const d = JSON.parse(out)
    return Array.isArray(d) ? d : (d ? [d] : [])
  } catch { return [] }
}

// Re-resolve an HWND from a saved ref when the stored hwnd is no longer valid.
// Ref shape: { hwnd, pid, processName, titlePattern, className }
async function resolveHwnd(ref) {
  if (!ref) return 0
  // Try the stored hwnd first.
  if (ref.hwnd) {
    const verify = await psRun(`${BG_WINTOOLS_PREFIX}
if ([MB_Win]::IsWindow([IntPtr]${ref.hwnd})) { "1" } else { "0" }`)
    if (verify.trim() === '1') return Number(ref.hwnd)
  }
  // Fallback: re-enumerate and match by processName + titlePattern (case-insensitive substring).
  const all = await getWindowsDetailed()
  const wantProc = (ref.processName || '').toLowerCase()
  const wantTitle = (ref.titlePattern || '').toLowerCase()
  const match = all.find(w => {
    if (wantProc && (w.processName || '').toLowerCase() !== wantProc) return false
    if (wantTitle && !(w.title || '').toLowerCase().includes(wantTitle)) return false
    return true
  })
  return match ? Number(match.hwnd) : 0
}

// Map a single token (like 'enter', 'f5', 'a', '.') to a Windows virtual key code.
const VK_MAP = {
  enter: 0x0D, return: 0x0D, tab: 0x09, esc: 0x1B, escape: 0x1B, space: 0x20,
  backspace: 0x08, delete: 0x2E, del: 0x2E, insert: 0x2D, ins: 0x2D,
  up: 0x26, down: 0x28, left: 0x25, right: 0x27,
  home: 0x24, end: 0x23, pageup: 0x21, pagedown: 0x22,
  f1: 0x70, f2: 0x71, f3: 0x72, f4: 0x73, f5: 0x74, f6: 0x75,
  f7: 0x76, f8: 0x77, f9: 0x78, f10: 0x79, f11: 0x7A, f12: 0x7B,
  ctrl: 0x11, control: 0x11, alt: 0x12, shift: 0x10, win: 0x5B, meta: 0x5B,
}

function tokenToVk(tok) {
  const t = (tok || '').toLowerCase().trim()
  if (!t) return 0
  if (VK_MAP[t] != null) return VK_MAP[t]
  if (t.length === 1) {
    const ch = t.toUpperCase().charCodeAt(0)
    if (ch >= 0x30 && ch <= 0x39) return ch       // 0-9
    if (ch >= 0x41 && ch <= 0x5A) return ch       // A-Z
  }
  return 0
}

// Post a full chord (Ctrl+Alt+Key style) to an HWND. Falls back to main-key-only
// if modifier VKs couldn't be parsed.
async function sendKeysToHwnd(hwnd, combo) {
  if (!hwnd) return
  const parts = (combo || '').split('+').map(s => s.trim()).filter(Boolean)
  const mods = []
  let mainTok = ''
  for (const p of parts) {
    const low = p.toLowerCase()
    if (low === 'ctrl' || low === 'control') mods.push(0x11)
    else if (low === 'alt') mods.push(0x12)
    else if (low === 'shift') mods.push(0x10)
    else if (low === 'win' || low === 'meta') mods.push(0x5B)
    else mainTok = p
  }
  const mainVk = tokenToVk(mainTok)
  if (!mainVk) return
  // Build PS commands that post modifier down -> key down -> key up -> modifier up.
  const downs = mods.map(m => `[MB_Win]::PostMessage([IntPtr]${hwnd}, [MB_Win]::WM_KEYDOWN, [IntPtr]${m}, [IntPtr]0) | Out-Null`).join("`n")
  const ups   = mods.slice().reverse().map(m => `[MB_Win]::PostMessage([IntPtr]${hwnd}, [MB_Win]::WM_KEYUP,   [IntPtr]${m}, [IntPtr]0) | Out-Null`).join("`n")
  const script = `${BG_WINTOOLS_PREFIX}
${downs}
[MB_Win]::PostMessage([IntPtr]${hwnd}, [MB_Win]::WM_KEYDOWN, [IntPtr]${mainVk}, [IntPtr]0) | Out-Null
Start-Sleep -Milliseconds 15
[MB_Win]::PostMessage([IntPtr]${hwnd}, [MB_Win]::WM_KEYUP,   [IntPtr]${mainVk}, [IntPtr]0) | Out-Null
${ups}
`
  await psRun(script)
}

// Type Unicode text into HWND via WM_CHAR (handles any codepoint natively).
async function sendTextToHwnd(hwnd, text) {
  if (!hwnd || !text) return
  const codes = []
  for (const ch of String(text)) codes.push(ch.codePointAt(0))
  const lines = codes.map(c => `[MB_Win]::PostMessage([IntPtr]${hwnd}, [MB_Win]::WM_CHAR, [IntPtr]${c}, [IntPtr]0) | Out-Null`).join("`n")
  const script = `${BG_WINTOOLS_PREFIX}
${lines}
`
  await psRun(script)
}

// Click at client-relative (x,y) on HWND.
async function clickHwnd(hwnd, x, y, button = 'left') {
  if (!hwnd) return
  const cx = Math.max(0, parseInt(x) || 0)
  const cy = Math.max(0, parseInt(y) || 0)
  const lParam = ((cy & 0xFFFF) << 16) | (cx & 0xFFFF)
  const downMsg = button === 'right' ? '[MB_Win]::WM_RBUTTONDOWN' : '[MB_Win]::WM_LBUTTONDOWN'
  const upMsg   = button === 'right' ? '[MB_Win]::WM_RBUTTONUP'   : '[MB_Win]::WM_LBUTTONUP'
  const script = `${BG_WINTOOLS_PREFIX}
[MB_Win]::PostMessage([IntPtr]${hwnd}, ${downMsg}, [IntPtr]1, [IntPtr]${lParam}) | Out-Null
Start-Sleep -Milliseconds 20
[MB_Win]::PostMessage([IntPtr]${hwnd}, ${upMsg},   [IntPtr]0, [IntPtr]${lParam}) | Out-Null
`
  await psRun(script)
}

function launchApp(appPath) {
  try { exec(`start "" "${appPath}"`) } catch {}
}

// ─── Macro Execution ──────────────────────────────────────────────────────────
let runningMacros = {}

// ctx: { sendMode: 'foreground'|'background', hwnd: number }
async function executeStep(step, ctx) {
  const bg = ctx && ctx.sendMode === 'background' && ctx.hwnd
  switch (step.type) {
    case 'key':
      if (bg) await sendKeysToHwnd(ctx.hwnd, step.value)
      else    await sendKeys(step.value)
      break
    case 'text':
      if (bg) await sendTextToHwnd(ctx.hwnd, step.value)
      else    await typeText(step.value)
      break
    case 'delay':
      await delay(parseInt(step.value) || 500)
      break
    case 'click': {
      const [x, y] = (step.value || '0,0').split(',').map(Number)
      if (bg) await clickHwnd(ctx.hwnd, x, y)
      else    await mouseClick(x, y)
      break
    }
    case 'app':
      launchApp(step.value)
      break
    case 'repeat':
      for (let r = 0; r < (parseInt(step.count) || 1); r++) {
        if (bg) await sendKeysToHwnd(ctx.hwnd, step.value)
        else    await sendKeys(step.value)
        await delay(parseInt(step.interval) || 100)
      }
      break
  }
}

async function executeMacro(macroId, overrides) {
  const macro = store.macros.find(m => m.id === macroId)
  if (!macro) return { success: false, error: 'Macro not found' }
  if (runningMacros[macroId]) return { success: false, error: 'Already running' }

  // Merge any scheduler overrides onto the macro (overrides win).
  const effective = { ...macro, ...(overrides || {}) }
  const sendMode = effective.sendMode === 'background' ? 'background' : 'foreground'
  // Build a targetWindowRef from new-style field, or migrate legacy targetWindow string.
  let targetRef = effective.targetWindowRef || null
  if (!targetRef && effective.targetWindow?.trim()) {
    targetRef = { titlePattern: effective.targetWindow.trim() }
  }

  runningMacros[macroId] = true
  mainWindow?.webContents.send('macro:status', { id: macroId, status: 'running' })
  broadcastToMobile({ type: 'macro:status', id: macroId, status: 'running' })

  // Register temporary cancel shortcut
  const cancelKey = effective.cancelKey
  if (cancelKey) {
    try {
      globalShortcut.register(cancelKey, () => {
        delete runningMacros[macroId]
        mainWindow?.webContents.send('macro:status', { id: macroId, status: 'cancelled' })
      })
    } catch {}
  }

  try {
    const loopCount = parseInt(effective.loopCount) || 1
    const infinite = loopCount === 0
    const maxDuration = parseInt(effective.maxDuration) || 0
    const startTime = Date.now()
    const steps = effective.steps || []
    let loop = 0

    while (infinite || loop < loopCount) {
      if (!runningMacros[macroId]) break
      if (maxDuration > 0 && (Date.now() - startTime) > maxDuration * 1000) break

      // Window targeting: foreground activates, background re-resolves HWND.
      let ctx = { sendMode, hwnd: 0 }
      if (targetRef) {
        if (sendMode === 'background') {
          ctx.hwnd = await resolveHwnd(targetRef)
          if (!ctx.hwnd) {
            mainWindow?.webContents.send('macro:status', { id: macroId, status: 'error', error: 'Target window not found' })
            break
          }
        } else {
          // Legacy foreground path — activate by title.
          const title = targetRef.titlePattern || targetRef.title
          if (title) await activateWindow(title)
        }
      }

      for (let i = 0; i < steps.length; i++) {
        if (!runningMacros[macroId]) break
        const pct = Math.round(((loop * steps.length + i) / ((infinite ? 1 : loopCount) * steps.length)) * 100)
        mainWindow?.webContents.send('macro:progress', { id: macroId, step: i, total: steps.length, loop, loopCount: infinite ? '∞' : loopCount, pct })
        await executeStep(steps[i], ctx)
      }

      // Inter-loop delay
      if (effective.loopDelay && parseInt(effective.loopDelay) > 0) {
        await delay(parseInt(effective.loopDelay))
      }

      loop++
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  } finally {
    delete runningMacros[macroId]
    if (cancelKey) { try { globalShortcut.unregister(cancelKey) } catch {} }
    mainWindow?.webContents.send('macro:status', { id: macroId, status: 'idle' })
    broadcastToMobile({ type: 'macro:status', id: macroId, status: 'idle' })
  }
}

// ─── Hotkey Manager ───────────────────────────────────────────────────────────
function registerAllHotkeys() {
  globalShortcut.unregisterAll()
  for (const hk of (store.hotkeys || [])) {
    if (!hk.enabled || !hk.combo || !hk.macroId) continue
    try { globalShortcut.register(hk.combo, async () => { await executeMacro(hk.macroId) }) } catch {}
  }
}

// ─── Auto Clicker ─────────────────────────────────────────────────────────────
let autoClickerTimer = null
function startAutoClicker(x, y, intervalMs, maxClicks) {
  let count = 0
  autoClickerTimer = setInterval(async () => {
    if (maxClicks > 0 && count >= maxClicks) { stopAutoClicker(); return }
    await mouseClick(x, y)
    count++
    mainWindow?.webContents.send('autoclicker:tick', { count, max: maxClicks })
  }, intervalMs)
}
function stopAutoClicker() {
  if (autoClickerTimer) { clearInterval(autoClickerTimer); autoClickerTimer = null }
  mainWindow?.webContents.send('autoclicker:stopped', {})
}

// ─── System Monitor ───────────────────────────────────────────────────────────
let cpuPrev = null
function getCpuUsage() {
  const cpus = os.cpus()
  if (!cpuPrev) { cpuPrev = cpus; return 0 }
  let totalIdle = 0, totalTick = 0
  for (let i = 0; i < cpus.length; i++) {
    const prev = cpuPrev[i], curr = cpus[i]
    for (const t in curr.times) totalTick += curr.times[t] - (prev.times[t] || 0)
    totalIdle += curr.times.idle - (prev.times.idle || 0)
  }
  cpuPrev = cpus
  return Math.round(100 - (100 * totalIdle / totalTick))
}

function getSystemInfo() {
  const total = os.totalmem(), free = os.freemem(), used = total - free
  const cpus = os.cpus()
  return {
    cpu: getCpuUsage(),
    cpuCores: cpus.length,
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuSpeed: cpus[0]?.speed || 0,
    memTotal: Math.round(total / 1024 / 1024),
    memUsed: Math.round(used / 1024 / 1024),
    memPercent: Math.round((used / total) * 100),
    platform: os.platform(),
    hostname: os.hostname(),
    uptime: Math.round(os.uptime()),
    arch: os.arch(),
  }
}

async function getDiskInfo() {
  const result = await psRun(`Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object { [PSCustomObject]@{ Name=$_.Name; Used=[math]::Round($_.Used/1GB,1); Free=[math]::Round($_.Free/1GB,1); Total=[math]::Round(($_.Used+$_.Free)/1GB,1) } } | ConvertTo-Json -Compress`)
  try {
    const d = JSON.parse(result)
    return Array.isArray(d) ? d : [d]
  } catch { return [] }
}

async function getTopProcesses() {
  const result = await psRun(`Get-Process | Where-Object {$_.CPU -ne $null} | Sort-Object CPU -Descending | Select-Object -First 10 Name,@{N='CPU';E={[math]::Round($_.CPU,1)}},@{N='RAM';E={[math]::Round($_.WorkingSet/1MB,0)}} | ConvertTo-Json -Compress`)
  try {
    const d = JSON.parse(result)
    return Array.isArray(d) ? d : [d]
  } catch { return [] }
}

async function getOpenWindows() {
  const result = await psRun(`Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -ExpandProperty MainWindowTitle | ConvertTo-Json -Compress`)
  try {
    const d = JSON.parse(result)
    return Array.isArray(d) ? d : [d]
  } catch { return [] }
}

// ─── Window Snapper ───────────────────────────────────────────────────────────
async function snapWindow(position) {
  const snapScript = `
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class WinSnap {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$sw = $screen.Width; $sh = $screen.Height; $sx = $screen.X; $sy = $screen.Y
$hwnd = [WinSnap]::GetForegroundWindow()
[WinSnap]::ShowWindow($hwnd, 1) | Out-Null
${(() => {
    const snaps = {
      'left':         `[WinSnap]::MoveWindow($hwnd, $sx, $sy, [int]($sw/2), $sh, $true)`,
      'right':        `[WinSnap]::MoveWindow($hwnd, $sx+[int]($sw/2), $sy, [int]($sw/2), $sh, $true)`,
      'top':          `[WinSnap]::MoveWindow($hwnd, $sx, $sy, $sw, [int]($sh/2), $true)`,
      'bottom':       `[WinSnap]::MoveWindow($hwnd, $sx, $sy+[int]($sh/2), $sw, [int]($sh/2), $true)`,
      'full':         `[WinSnap]::MoveWindow($hwnd, $sx, $sy, $sw, $sh, $true)`,
      'top-left':     `[WinSnap]::MoveWindow($hwnd, $sx, $sy, [int]($sw/2), [int]($sh/2), $true)`,
      'top-right':    `[WinSnap]::MoveWindow($hwnd, $sx+[int]($sw/2), $sy, [int]($sw/2), [int]($sh/2), $true)`,
      'bottom-left':  `[WinSnap]::MoveWindow($hwnd, $sx, $sy+[int]($sh/2), [int]($sw/2), [int]($sh/2), $true)`,
      'bottom-right': `[WinSnap]::MoveWindow($hwnd, $sx+[int]($sw/2), $sy+[int]($sh/2), [int]($sw/2), [int]($sh/2), $true)`,
    }
    return snaps[position] || snaps['full']
  })()}
`
  await psRun(snapScript)
}

// ─── Text Expander (AutoHotkey) ───────────────────────────────────────────────
let ahkProcess = null
const ahkScriptPath = path.join(userData, 'expanders.ahk')

function findAutoHotkey() {
  const candidates = [
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey32.exe',
    'C:\\Program Files\\AutoHotkey\\AutoHotkey64.exe',
    'C:\\Program Files\\AutoHotkey\\AutoHotkey.exe',
    'C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe',
    'C:\\Program Files (x86)\\AutoHotkey\\v2\\AutoHotkey.exe',
  ]
  for (const p of candidates) { if (fs.existsSync(p)) return p }
  return null
}

function generateAHKScript(expanders) {
  const ahkPath = findAutoHotkey()
  const isV2 = ahkPath && ahkPath.toLowerCase().includes('v2')
  const lines = isV2
    ? ['#Requires AutoHotkey v2.0', '#SingleInstance Force', '']
    : ['#SingleInstance Force', '']
  for (const exp of (expanders || [])) {
    if (!exp.abbr?.trim() || !exp.expansion?.trim()) continue
    const esc = exp.expansion.replace(/`/g, '``').replace(/"/g, isV2 ? '`"' : '"')
    const nl = isV2 ? '`n' : '`n'
    const expansion = esc.replace(/\r?\n/g, nl)
    if (isV2) {
      lines.push(`::${exp.abbr}::`)
      lines.push(`{`)
      lines.push(`  SendText("${expansion}")`)
      lines.push(`}`)
    } else {
      lines.push(`::${exp.abbr}::`)
      lines.push(`SendRaw ${expansion}`)
      lines.push(`return`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function startTextExpander() {
  stopTextExpander()
  const expanders = store.expanders || []
  if (!expanders.length) return { ok: false, reason: 'No expanders configured' }
  const ahkPath = findAutoHotkey()
  if (!ahkPath) return { ok: false, reason: 'AutoHotkey not found. Please install it from autohotkey.com' }
  const script = generateAHKScript(expanders)
  fs.writeFileSync(ahkScriptPath, script, 'utf8')
  ahkProcess = spawn(ahkPath, [ahkScriptPath], { detached: false, stdio: 'ignore' })
  ahkProcess.on('error', (e) => { ahkProcess = null })
  ahkProcess.on('exit', () => { ahkProcess = null })
  return { ok: true, ahkPath }
}

function stopTextExpander() {
  if (ahkProcess) { try { ahkProcess.kill() } catch {}; ahkProcess = null }
}

// ─── Macro Scheduler ─────────────────────────────────────────────────────────
let schedulerInterval = null

function startScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval)
  schedulerInterval = setInterval(checkScheduledTasks, 30000) // check every 30s
  checkScheduledTasks()
}

function checkScheduledTasks() {
  const now = new Date()
  const tasks = store.scheduledTasks || []
  for (const task of tasks) {
    if (!task.enabled) continue
    if (!shouldRunTask(task, now)) continue
    // Scheduler may override the macro's target window and send mode.
    const overrides = {}
    if (task.overrideTarget && task.targetWindowRef) overrides.targetWindowRef = task.targetWindowRef
    if (task.overrideTarget && task.sendMode) overrides.sendMode = task.sendMode
    executeMacro(task.macroId, overrides)
    task.lastRun = now.toISOString()
    mainWindow?.webContents.send('scheduler:ran', { id: task.id, time: task.lastRun })
  }
  saveStore(store)
}

function shouldRunTask(task, now) {
  const last = task.lastRun ? new Date(task.lastRun) : null
  if (task.type === 'interval') {
    let intervalMs
    if (task.intervalUnit === 'seconds') {
      intervalMs = (parseInt(task.intervalValue) || 60) * 1000
    } else {
      const mins = parseInt(task.intervalValue ?? task.intervalMinutes) || 60
      intervalMs = mins * 60 * 1000
    }
    if (!last) return true
    return (now - last) >= intervalMs
  }
  if (task.type === 'daily') {
    const [h, m] = (task.time || '09:00').split(':').map(Number)
    const todayRun = new Date(now); todayRun.setHours(h, m, 0, 0)
    if (now < todayRun) return false
    if (!last) return true
    return last < todayRun
  }
  if (task.type === 'once') {
    if (task.ran) return false
    const runAt = new Date(task.datetime)
    if (now >= runAt) { task.ran = true; return true }
  }
  return false
}

// ─── Reminder Poller ─────────────────────────────────────────────────────────
let reminderPoller = null
function startReminderPoller() {
  if (reminderPoller) clearInterval(reminderPoller)
  reminderPoller = setInterval(checkReminders, 60000)
  checkReminders()
}
function checkReminders() {
  const now = new Date()
  const reminders = store.reminders || []
  let changed = false
  for (const r of reminders) {
    if (r.dismissed || r.notified) continue
    const due = new Date(r.datetime)
    if (now >= due) {
      try { new Notification({ title: String(r.title || 'Reminder'), body: String(r.description || '') }).show() } catch {}
      mainWindow?.webContents.send('reminder:due', r)
      r.notified = true
      if (r.recurring?.type && r.recurring.type !== 'none') {
        const next = new Date(due)
        if (r.recurring.type === 'daily') next.setDate(next.getDate() + 1)
        else if (r.recurring.type === 'weekly') next.setDate(next.getDate() + 7)
        else if (r.recurring.type === 'monthly') next.setMonth(next.getMonth() + 1)
        r.datetime = next.toISOString()
        r.notified = false
      }
      changed = true
    }
  }
  if (changed) saveStore(store)
}

// ─── Clipboard History ────────────────────────────────────────────────────────
let lastClipboard = '', clipboardInterval = null
function startClipboardWatcher() {
  clipboardInterval = setInterval(() => {
    try {
      const text = clipboard.readText()
      if (text && text !== lastClipboard && text.length < 10000) {
        lastClipboard = text
        const history = store.clipboardHistory || []
        history.unshift({ id: Date.now(), text, time: new Date().toISOString() })
        store.clipboardHistory = history.slice(0, 100)
        saveStore(store)
        mainWindow?.webContents.send('clipboard:update', store.clipboardHistory)
      }
    } catch {}
  }, 1000)
}

// ─── Mobile Remote Server ─────────────────────────────────────────────────────
let mobileServer = null, wss = null
const mobileClients = new Set()

function broadcastToMobile(data) {
  const msg = JSON.stringify(data)
  mobileClients.forEach(ws => { try { ws.send(msg) } catch {} })
}

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

function startMobileServer(port = 8765) {
  if (mobileServer) return { port, ip: getLocalIP() }
  const app2 = express()
  app2.use(express.json())
  app2.use(express.static(path.join(__dirname, '../mobile')))
  app2.get('/api/macros', (req, res) => res.json(store.macros || []))
  app2.get('/api/status', (req, res) => res.json({ ok: true, name: "Scotty's Multitool" }))
  app2.post('/api/run/:id', async (req, res) => res.json(await executeMacro(req.params.id)))
  app2.get('/api/system', (req, res) => res.json(getSystemInfo()))
  mobileServer = http.createServer(app2)
  wss = new WebSocketServer({ server: mobileServer })
  wss.on('connection', (ws) => {
    mobileClients.add(ws)
    ws.send(JSON.stringify({ type: 'connected', macros: store.macros }))
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw)
        if (msg.type === 'run') await executeMacro(msg.id)
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }))
      } catch {}
    })
    ws.on('close', () => mobileClients.delete(ws))
  })
  mobileServer.listen(port)
  return { port, ip: getLocalIP() }
}

function stopMobileServer() {
  if (mobileServer) { mobileServer.close(); mobileServer = null; wss = null }
}

// ─── Main Window & Splash ────────────────────────────────────────────────────
let mainWindow
let splashWindow

function createSplash() {
  try {
    splashWindow = new BrowserWindow({
      width: 420, height: 520, frame: false, transparent: true,
      resizable: false, movable: true, alwaysOnTop: true, show: false,
      skipTaskbar: true, backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'splash-preload.js'),
        contextIsolation: true, nodeIntegration: false,
      },
    })
    splashWindow.loadFile(path.join(__dirname, 'splash.html'))
    splashWindow.once('ready-to-show', () => { try { splashWindow.show() } catch {} })
    splashWindow.on('closed', () => { splashWindow = null })
  } catch (e) { splashWindow = null }
}

function splashProgress(step, percent, label) {
  try {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash:progress', { step, percent, label })
    }
  } catch {}
}

function closeSplash() {
  try {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash:done')
      setTimeout(() => { try { splashWindow && !splashWindow.isDestroyed() && splashWindow.close() } catch {} }, 450)
    }
  } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0d0d0d', symbolColor: '#f5f5f5', height: 40 },
    backgroundColor: '#0d0d0d',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  })
  if (isDev) mainWindow.loadURL('http://localhost:5173')
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  mainWindow.on('closed', () => { mainWindow = null })

  splashProgress(1, 20, 'Loading store…')
  loadAdBlockList()
  installAdBlocker()
  splashProgress(2, 40, 'Starting background services…')
  startClipboardWatcher()
  splashProgress(3, 55, 'Registering hotkeys…')
  registerAllHotkeys()
  splashProgress(4, 70, 'Scheduling tasks…')
  startScheduler()
  startReminderPoller()
  if (store.settings?.mobileEnabled) startMobileServer(store.settings?.mobilePort || 8765)
  if (store.settings?.textExpanderEnabled) startTextExpander()
  splashProgress(5, 90, 'Warming UI…')

  setInterval(() => { if (mainWindow) mainWindow.webContents.send('system:update', getSystemInfo()) }, 2000)

  const reveal = () => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return
      if (!mainWindow.isVisible()) mainWindow.show()
      splashProgress(6, 100, 'Ready.')
      closeSplash()
    } catch {}
  }
  // Don't block on ready-to-show forever.
  mainWindow.once('ready-to-show', reveal)
  setTimeout(reveal, 4000)
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('store:get', (_, key) => key ? store[key] : store)
ipcMain.handle('store:set', (_, key, value) => { store[key] = value; saveStore(store); return true })

// ─── Auth / Accounts ──────────────────────────────────────────────────────────
function currentUserRecord() {
  authLib.ensureShape(store)
  const id = store.session?.activeUserId
  if (!id) return null
  return store.accounts.find(u => u.id === id) || null
}

function emitAuthChange() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth:changed', authLib.redactUser(currentUserRecord()))
    }
  } catch {}
}

ipcMain.handle('auth:listUsers', () => {
  authLib.ensureShape(store)
  return store.accounts.map(u => ({
    id: u.id, username: u.username, displayName: u.displayName,
    avatarDataUrl: u.avatarDataUrl || '', hasPassword: !!u.passwordHash,
    lastLoginAt: u.lastLoginAt || null,
  }))
})

ipcMain.handle('auth:currentUser', () => {
  authLib.ensureShape(store)
  if (!authLib.isSessionValid(store)) return null
  return authLib.redactUser(currentUserRecord())
})

ipcMain.handle('auth:register', (_, payload) => {
  authLib.ensureShape(store)
  const { username, password, displayName, email } = payload || {}
  const uerr = authLib.validateUsername(username); if (uerr) return { success: false, error: uerr }
  const perr = authLib.validatePassword(password); if (perr) return { success: false, error: perr }
  const norm = authLib.normaliseUsername(username)
  if (store.accounts.some(u => authLib.normaliseUsername(u.username) === norm)) {
    return { success: false, error: 'That username is already taken.' }
  }
  const { salt, hash } = authLib.hashPassword(password)
  const recovery = authLib.generateRecoveryCode()
  const recoveryMix = authLib.hashPassword(recovery)
  const id = authLib.generateId()
  const user = {
    id, username: username.trim(), displayName: (displayName || '').trim() || username.trim(),
    avatarDataUrl: '', email: (email || '').trim(), bio: '', bannerColor: '#6366f1',
    passwordHash: hash, salt,
    recoveryCodeHash: recoveryMix.hash, recoveryCodeSalt: recoveryMix.salt,
    createdAt: new Date().toISOString(), lastLoginAt: null,
    preferences: { theme: 'dark', accentColor: '#6366f1', defaultPage: 'dashboard', sidebarDensity: 'comfortable', soundsOn: true },
  }
  store.accounts.push(user)
  store.userData[id] = store.userData[id] || {}
  saveStore(store)
  return { success: true, user: authLib.redactUser(user), recoveryCode: recovery }
})

ipcMain.handle('auth:login', (_, payload) => {
  authLib.ensureShape(store)
  const { username, password, rememberMe } = payload || {}
  const locked = authLib.isLockedOut(username)
  if (locked.locked) return { success: false, error: `Too many attempts. Try again in ${Math.ceil(locked.retryMs / 1000)}s.` }
  const norm = authLib.normaliseUsername(username)
  const user = store.accounts.find(u => authLib.normaliseUsername(u.username) === norm)
  if (!user) { authLib.recordFailure(username); return { success: false, error: 'Invalid username or password.' } }
  // Migrated (password-less) accounts: allow login with empty password and set one on first change.
  const ok = user.passwordHash ? authLib.verifyPassword(password || '', user) : (password === '' || password == null)
  if (!ok) { authLib.recordFailure(username); return { success: false, error: 'Invalid username or password.' } }
  authLib.clearFailures(username)
  user.lastLoginAt = new Date().toISOString()
  store.session = {
    activeUserId: user.id,
    rememberMe: !!rememberMe,
    expiresAt: rememberMe ? Date.now() + authLib.SESSION_TTL_MS : 0,
    sessionToken: authLib.generateSessionToken(),
  }
  saveStore(store)
  emitAuthChange()
  return { success: true, user: authLib.redactUser(user) }
})

ipcMain.handle('auth:logout', () => {
  authLib.ensureShape(store)
  store.session = { activeUserId: null, rememberMe: false, expiresAt: 0, sessionToken: null }
  saveStore(store)
  emitAuthChange()
  return { success: true }
})

ipcMain.handle('auth:updateProfile', (_, patch) => {
  authLib.ensureShape(store)
  const user = currentUserRecord()
  if (!user) return { success: false, error: 'Not signed in.' }
  const allowed = ['displayName', 'avatarDataUrl', 'email', 'bio', 'bannerColor', 'preferences']
  for (const k of allowed) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) {
      if (k === 'preferences') user.preferences = { ...(user.preferences || {}), ...(patch.preferences || {}) }
      else user[k] = patch[k]
    }
  }
  // Username: unique, validated
  if (patch && typeof patch.username === 'string' && authLib.normaliseUsername(patch.username) !== authLib.normaliseUsername(user.username)) {
    const uerr = authLib.validateUsername(patch.username); if (uerr) return { success: false, error: uerr }
    const norm = authLib.normaliseUsername(patch.username)
    if (store.accounts.some(u => u.id !== user.id && authLib.normaliseUsername(u.username) === norm)) {
      return { success: false, error: 'That username is already taken.' }
    }
    user.username = patch.username.trim()
  }
  saveStore(store)
  emitAuthChange()
  return { success: true, user: authLib.redactUser(user) }
})

ipcMain.handle('auth:changePassword', (_, payload) => {
  authLib.ensureShape(store)
  const user = currentUserRecord()
  if (!user) return { success: false, error: 'Not signed in.' }
  const { oldPassword, newPassword } = payload || {}
  // Migrated accounts without existing password may set one without verifying old.
  if (user.passwordHash) {
    if (!authLib.verifyPassword(oldPassword || '', user)) return { success: false, error: 'Current password is incorrect.' }
  }
  const perr = authLib.validatePassword(newPassword); if (perr) return { success: false, error: perr }
  const { salt, hash } = authLib.hashPassword(newPassword)
  user.salt = salt; user.passwordHash = hash
  saveStore(store)
  return { success: true }
})

ipcMain.handle('auth:deleteAccount', (_, payload) => {
  authLib.ensureShape(store)
  const user = currentUserRecord()
  if (!user) return { success: false, error: 'Not signed in.' }
  if (user.passwordHash && !authLib.verifyPassword(payload?.password || '', user)) {
    return { success: false, error: 'Password is incorrect.' }
  }
  store.accounts = store.accounts.filter(u => u.id !== user.id)
  if (store.userData) delete store.userData[user.id]
  store.session = { activeUserId: null, rememberMe: false, expiresAt: 0, sessionToken: null }
  saveStore(store)
  emitAuthChange()
  return { success: true }
})

ipcMain.handle('auth:recoveryLogin', (_, payload) => {
  authLib.ensureShape(store)
  const { username, recoveryCode, newPassword } = payload || {}
  const norm = authLib.normaliseUsername(username)
  const user = store.accounts.find(u => authLib.normaliseUsername(u.username) === norm)
  if (!user || !user.recoveryCodeHash) return { success: false, error: 'Invalid recovery code.' }
  const { hash } = authLib.hashPassword(recoveryCode || '', user.recoveryCodeSalt)
  const a = Buffer.from(hash, 'hex'); const b = Buffer.from(user.recoveryCodeHash, 'hex')
  const ok = a.length === b.length && require('crypto').timingSafeEqual(a, b)
  if (!ok) return { success: false, error: 'Invalid recovery code.' }
  const perr = authLib.validatePassword(newPassword); if (perr) return { success: false, error: perr }
  const p = authLib.hashPassword(newPassword)
  user.salt = p.salt; user.passwordHash = p.hash
  // Burn the used recovery code and issue a fresh one
  const newRecovery = authLib.generateRecoveryCode()
  const rm = authLib.hashPassword(newRecovery)
  user.recoveryCodeHash = rm.hash; user.recoveryCodeSalt = rm.salt
  saveStore(store)
  return { success: true, recoveryCode: newRecovery }
})

// Verify the signed-in user's recovery code (used by Forgot-PIN flow).
// Returns { success: true } without modifying anything on match.
ipcMain.handle('auth:verifyRecoveryCode', (_, payload) => {
  authLib.ensureShape(store)
  const user = currentUserRecord()
  if (!user || !user.recoveryCodeHash) return { success: false, error: 'No recovery code on file.' }
  const code = (payload?.recoveryCode || '').trim()
  if (!code) return { success: false, error: 'Enter your recovery code.' }
  const { hash } = authLib.hashPassword(code, user.recoveryCodeSalt)
  const a = Buffer.from(hash, 'hex'); const b = Buffer.from(user.recoveryCodeHash, 'hex')
  const ok = a.length === b.length && require('crypto').timingSafeEqual(a, b)
  if (!ok) return { success: false, error: 'Invalid recovery code.' }
  return { success: true }
})

// ─── Per-user data access helpers ─────────────────────────────────────────────
// Private slices are stored under store.userData[activeUserId]. Reads fall back
// to top-level values for backwards compatibility during migration.
function getUserBucket() {
  authLib.ensureShape(store)
  const id = store.session?.activeUserId
  if (!id) return null
  if (!store.userData[id]) store.userData[id] = {}
  return store.userData[id]
}

// Route a list of keys to the per-user bucket, mutating store.userData.
function pbGet(key, fallback) {
  const b = getUserBucket()
  if (b && b[key] !== undefined) return b[key]
  // backwards-compat: old top-level data
  return store[key] !== undefined ? store[key] : fallback
}
function pbSet(key, value) {
  const b = getUserBucket()
  if (b) { b[key] = value } else { store[key] = value }
  saveStore(store)
}

// Signal a session event on startup so the renderer knows if a remembered user is active
app.on('browser-window-created', () => { setTimeout(emitAuthChange, 500) })

ipcMain.handle('macro:run', (_, id) => executeMacro(id))

ipcMain.handle('macro:stop', (_, id) => { delete runningMacros[id]; return true })
ipcMain.handle('macro:save', (_, macro) => {
  const idx = store.macros.findIndex(m => m.id === macro.id)
  if (idx >= 0) store.macros[idx] = macro; else store.macros.push(macro)
  saveStore(store); return macro
})
ipcMain.handle('macro:delete', (_, id) => { store.macros = store.macros.filter(m => m.id !== id); saveStore(store); return true })
ipcMain.handle('macro:list', () => store.macros)

ipcMain.handle('hotkey:save', (_, hotkey) => {
  const idx = store.hotkeys.findIndex(h => h.id === hotkey.id)
  if (idx >= 0) store.hotkeys[idx] = hotkey; else store.hotkeys.push(hotkey)
  saveStore(store); registerAllHotkeys(); return hotkey
})
ipcMain.handle('hotkey:delete', (_, id) => { store.hotkeys = store.hotkeys.filter(h => h.id !== id); saveStore(store); registerAllHotkeys(); return true })
ipcMain.handle('hotkey:list', () => store.hotkeys)

ipcMain.handle('autoclicker:start', (_, { x, y, interval, max }) => { startAutoClicker(x, y, interval, max); return true })
ipcMain.handle('autoclicker:stop', () => { stopAutoClicker(); return true })

ipcMain.handle('system:info', () => getSystemInfo())
ipcMain.handle('system:disk', () => getDiskInfo())
ipcMain.handle('system:processes', () => getTopProcesses())
ipcMain.handle('system:windows', () => getOpenWindows())

ipcMain.handle('clipboard:history', () => store.clipboardHistory || [])
ipcMain.handle('clipboard:write', (_, text) => { clipboard.writeText(text); return true })
ipcMain.handle('clipboard:clear', () => { store.clipboardHistory = []; saveStore(store); return true })
ipcMain.handle('clipboard:delete', (_, id) => { store.clipboardHistory = (store.clipboardHistory||[]).filter(c => c.id !== id); saveStore(store); return true })

ipcMain.handle('mobile:start', (_, port) => startMobileServer(port || 8765))
ipcMain.handle('mobile:stop', () => { stopMobileServer(); return true })
ipcMain.handle('mobile:ip', () => ({ ip: getLocalIP(), port: 8765 }))
ipcMain.handle('mobile:status', () => ({ running: !!mobileServer, ip: getLocalIP(), port: 8765 }))

ipcMain.handle('expander:start', () => {
  const result = startTextExpander()
  if (result.ok) { store.settings = { ...(store.settings||{}), textExpanderEnabled: true }; saveStore(store) }
  return result
})
ipcMain.handle('expander:stop', () => {
  stopTextExpander()
  store.settings = { ...(store.settings||{}), textExpanderEnabled: false }
  saveStore(store)
  return { ok: true }
})
ipcMain.handle('expander:status', () => ({ running: !!ahkProcess, ahkPath: findAutoHotkey() }))
ipcMain.handle('expander:restart', () => {
  const result = startTextExpander()
  return result
})

ipcMain.handle('window:snap', (_, position) => snapWindow(position))
ipcMain.handle('window:list', () => getOpenWindows())
ipcMain.handle('window:listDetailed', () => getWindowsDetailed())
ipcMain.handle('window:activate', (_, title) => activateWindow(title))

ipcMain.handle('scheduler:list', () => store.scheduledTasks || [])
ipcMain.handle('scheduler:save', (_, task) => {
  if (!store.scheduledTasks) store.scheduledTasks = []
  const idx = store.scheduledTasks.findIndex(t => t.id === task.id)
  if (idx >= 0) store.scheduledTasks[idx] = task; else store.scheduledTasks.push(task)
  saveStore(store); return task
})
ipcMain.handle('scheduler:delete', (_, id) => { store.scheduledTasks = (store.scheduledTasks||[]).filter(t => t.id !== id); saveStore(store); return true })

ipcMain.handle('notes:list', () => pbGet('notes', []))
ipcMain.handle('notes:save', (_, note) => {
  let list = pbGet('notes', [])
  const idx = list.findIndex(n => n.id === note.id)
  if (idx >= 0) list[idx] = note; else list = [...list, note]
  pbSet('notes', list)
  return note
})
ipcMain.handle('notes:delete', (_, id) => { pbSet('notes', (pbGet('notes', [])).filter(n => n.id !== id)); return true })

// Shared WASAPI Add-Type definitions (compiled once per PS session — we inject inline)
const WASAPI_TYPES = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorCls {}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  void EnumAudioEndpoints(int dataFlow, uint dwStateMask, out IntPtr ppDevices);
  void GetDefaultAudioEndpoint(int dataFlow, int role, [MarshalAs(UnmanagedType.Interface)] out object ppEndpoint);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  void Activate(ref Guid iid, uint dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.Interface)] out object ppInterface);
  void OpenPropertyStore(uint stgmAccess, out IntPtr ppProperties);
  void GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
  void GetState(out uint pdwState);
}
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  void RegisterControlChangeNotify(IntPtr pNotify);
  void UnregisterControlChangeNotify(IntPtr pNotify);
  void GetChannelCount(out uint pnChannelCount);
  void SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
  void SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
  void GetMasterVolumeLevel(out float pfLevelDB);
  void GetMasterVolumeLevelScalar(out float pfLevel);
  void SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
  void SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
  void GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
  void GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
  void SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
  void GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}
"@ -ErrorAction Stop
function Get-AudioEndpoint {
  $en = [Activator]::CreateInstance([MMDeviceEnumeratorCls]) -as [IMMDeviceEnumerator]
  $devObj = $null; $en.GetDefaultAudioEndpoint(0, 1, [ref]$devObj)
  $dev = $devObj -as [IMMDevice]
  $iid = [Guid]"5CDF2C82-841E-4546-9722-0CF74078229A"
  $volObj = $null; $dev.Activate([ref]$iid, 23, [IntPtr]::Zero, [ref]$volObj)
  return $volObj -as [IAudioEndpointVolume]
}`

ipcMain.handle('volume:set', async (_, level) => {
  const pct = Math.max(0, Math.min(100, Number(level) || 0))
  const scalar = (pct / 100).toFixed(6)
  try {
    await psRun(`${WASAPI_TYPES}
$ep = Get-AudioEndpoint; $g = [Guid]::Empty; $ep.SetMasterVolumeLevelScalar([float]${scalar}, [ref]$g)`)
  } catch (e) {
    // Fallback: use VK_VOLUME_DOWN/UP keys to approximate the target level
    // First get current, then nudge (rough fallback for systems where WASAPI fails)
    const fallback = `
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class AudioCtrl { [DllImport("winmm.dll")] public static extern int waveOutSetVolume(IntPtr h, uint v); }
"@
$vol = [uint32][math]::Round(${pct} / 100.0 * 0xFFFF)
$combined = ($vol -shl 16) -bor $vol
[AudioCtrl]::waveOutSetVolume([IntPtr]::Zero, $combined)`
    try { await psRun(fallback) } catch {}
  }
  return true
})

ipcMain.handle('volume:getLevel', async () => {
  try {
    const result = await psRun(`${WASAPI_TYPES}
$ep = Get-AudioEndpoint; $v = [float]0; $ep.GetMasterVolumeLevelScalar([ref]$v); Write-Output ([math]::Round($v * 100))`)
    return parseInt(result) || 0
  } catch {
    try {
      const result = await psRun(`
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class AudioGet { [DllImport("winmm.dll")] public static extern int waveOutGetVolume(IntPtr h, ref uint v); }
"@
$v = [uint32]0; [AudioGet]::waveOutGetVolume([IntPtr]::Zero, [ref]$v)
Write-Output ([math]::Round(($v -band 0xFFFF) / 0xFFFF * 100))`)
      return parseInt(result) || 0
    } catch { return 50 }
  }
})

ipcMain.handle('volume:get', async () => {
  try {
    const r = await psRun(`${WASAPI_TYPES}
$ep = Get-AudioEndpoint; $dev = $null
$en = [Activator]::CreateInstance([MMDeviceEnumeratorCls]) -as [IMMDeviceEnumerator]
$devObj = $null; $en.GetDefaultAudioEndpoint(0, 1, [ref]$devObj)
$d = $devObj -as [IMMDevice]; $id = ''; $d.GetId([ref]$id); Write-Output $id`)
    return { name: r?.trim() || 'Default Audio Device' }
  } catch {
    return { name: 'Default Audio Device' }
  }
})

ipcMain.handle('volume:mute', async () => {
  try {
    await psRun(`${WASAPI_TYPES}
$ep = Get-AudioEndpoint; $muted = $false; $ep.GetMute([ref]$muted); $g = [Guid]::Empty; $ep.SetMute(-not $muted, [ref]$g)`)
  } catch {
    // Fallback: send VK_VOLUME_MUTE key
    await psRun(`
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class KeySim { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo); }
"@
[KeySim]::keybd_event(0xAD, 0, 0, [UIntPtr]::Zero); [KeySim]::keybd_event(0xAD, 0, 2, [UIntPtr]::Zero)`).catch(() => {})
  }
  return true
})

// ── Windows SMTC: media playback info + controls ─────────────────────────────
// Uses Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager
// via PowerShell WinRT. Polled by MediaPlayerBar.
const SMTC_AWAIT_HELPER = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
function Await($op, $resultType) {
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' } |
    Select-Object -First 1
  $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($op))
  $task.Wait(-1) | Out-Null
  $task.Result
}
function AwaitAction($op) {
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } |
    Select-Object -First 1
  $task = $asTask.Invoke($null, @($op))
  $task.Wait(-1) | Out-Null
}
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSession,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.Buffer,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
`

ipcMain.handle('media:status', async () => {
  try {
    const script = `${SMTC_AWAIT_HELPER}
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
if ($mgr -eq $null) { Write-Output 'NOSESSION'; exit }
$session = $mgr.GetCurrentSession()
if ($session -eq $null) { Write-Output 'NOSESSION'; exit }
$props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$info  = $session.GetPlaybackInfo()
$status = $info.PlaybackStatus.ToString()
$obj = @{
  hasSession = $true
  title      = [string]$props.Title
  artist     = [string]$props.Artist
  albumTitle = [string]$props.AlbumTitle
  status     = $status
  appId      = [string]$session.SourceAppUserModelId
}
# Thumbnail
try {
  if ($props.Thumbnail -ne $null) {
    $stream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    $size = [int]$stream.Size
    if ($size -gt 0 -and $size -lt 3000000) {
      $reader = [Windows.Storage.Streams.DataReader]::new($stream)
      Await ($reader.LoadAsync($size)) ([uint32]) | Out-Null
      $bytes = New-Object byte[] $size
      $reader.ReadBytes($bytes)
      $obj.thumbnail = [Convert]::ToBase64String($bytes)
      $obj.thumbnailMime = [string]$stream.ContentType
    }
  }
} catch {}
$obj | ConvertTo-Json -Depth 4 -Compress`
    const raw = await psRun(script)
    const t = (raw || '').trim()
    if (!t || t === 'NOSESSION') return { hasSession: false }
    try { return JSON.parse(t) } catch { return { hasSession: false } }
  } catch {
    return { hasSession: false, error: 'unavailable' }
  }
})

ipcMain.handle('media:control', async (_, action) => {
  const map = {
    play:       'TryPlayAsync',
    pause:      'TryPauseAsync',
    playpause:  'TryTogglePlayPauseAsync',
    next:       'TrySkipNextAsync',
    previous:   'TrySkipPreviousAsync',
    stop:       'TryStopAsync',
  }
  const method = map[action]
  if (!method) return { success: false, error: 'Unknown action' }
  try {
    const script = `${SMTC_AWAIT_HELPER}
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
if ($mgr -eq $null) { Write-Output 'NOSESSION'; exit }
$session = $mgr.GetCurrentSession()
if ($session -eq $null) { Write-Output 'NOSESSION'; exit }
$r = Await ($session.${method}()) ([bool])
Write-Output ([string]$r)`
    const out = await psRun(script)
    const ok = (out || '').trim().toLowerCase() === 'true'
    return { success: ok }
  } catch (e) {
    return { success: false, error: String(e?.message || e) }
  }
})


ipcMain.handle('ai:query', async (_, { prompt, endpoint, apiKey, model, images, temperature, maxTokens, topP, systemPrompt, useContext, responseFormat }) => {
  // Translate raw network/HTTP errors into a structured object so the UI can
  // render actionable guidance (docs link, common fixes) rather than a naked
  // "ECONNREFUSED" string.
  const diagnoseConnection = (raw) => {
    const msg = String(raw?.message || raw || '')
    const code = raw?.code || ''
    const isLocal = /127\.0\.0\.1|localhost/i.test(String(endpoint || ''))
    const base = endpoint || 'https://api.openai.com'
    if (code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(msg)) {
      return {
        code: 'AI_ENDPOINT_OFFLINE',
        error: isLocal
          ? `Can't reach ${base}. LM Studio (or your local server) isn't responding.`
          : `Can't reach ${base}. The server refused the connection.`,
        guidance: isLocal
          ? ['Open LM Studio → Developer tab → "Start Server".',
             'Verify the port matches your settings (default http://localhost:1234).',
             'If you use a firewall, allow Node/Electron to connect to localhost.']
          : ['Check the endpoint URL in Settings → AI.',
             'Verify your internet connection and that the server is up.'],
        docsHint: 'help#ai',
      }
    }
    if (code === 'ENOTFOUND' || /ENOTFOUND|getaddrinfo/i.test(msg)) {
      return { code: 'AI_DNS', error: `Host not found: ${base}`, guidance: ['Double-check the endpoint URL for typos.', 'Verify DNS / internet access.'], docsHint: 'help#ai' }
    }
    if (code === 'ETIMEDOUT' || /timed out/i.test(msg)) {
      return { code: 'AI_TIMEOUT', error: 'The model took too long to respond.', guidance: ['Try a smaller model or shorter prompt.', 'Check CPU/GPU usage in LM Studio.'], docsHint: 'help#ai' }
    }
    return { code: 'AI_UNKNOWN', error: msg || 'Unknown error', guidance: [], docsHint: 'help#ai' }
  }

  return new Promise(async (resolve) => {
    try {
      const baseUrl = endpoint || 'https://api.openai.com'
      const url = new URL(`${baseUrl}/v1/chat/completions`)

      // Optional: prepend context from stores
      let sys = systemPrompt || ''
      if (useContext) {
        try {
          const q = String(prompt || '').toLowerCase()
          const match = (text) => (text || '').toLowerCase().includes(q.slice(0, 40))
          const jrn = (store.journal || []).filter(e => match(e.content)).slice(-5).map(e => `[Journal ${e.date}] ${e.content.slice(0,300)}`)
          const nts = (store.notes || []).filter(n => match(n.title) || match(n.content)).slice(-5).map(n => `[Note: ${n.title}] ${(n.content||'').slice(0,300)}`)
          const rms = (store.reminders || []).filter(r => match(r.title) || match(r.description)).slice(-5).map(r => `[Reminder] ${r.title} @ ${r.datetime}: ${r.description || ''}`)
          const ctx = [...jrn, ...nts, ...rms].join('\n')
          if (ctx) sys = (sys + '\n\nUser context (for reference):\n' + ctx).trim()
        } catch {}
      }

      // Build messages: support image attachments (OpenAI vision format)
      const messages = []
      if (sys) messages.push({ role: 'system', content: sys })
      if (images && images.length) {
        messages.push({ role: 'user', content: [
          { type: 'text', text: prompt },
          ...images.map(src => ({ type: 'image_url', image_url: { url: src } }))
        ]})
      } else {
        messages.push({ role: 'user', content: prompt })
      }

      const body = JSON.stringify({
        model: model || 'local-model',
        messages,
        max_tokens: maxTokens || 2000,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        top_p: typeof topP === 'number' ? topP : 1.0,
        stream: false,
      })
      const options = {
        hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
        timeout: 120000,
      }
      const proto = url.protocol === 'https:' ? require('https') : http
      const req = proto.request(options, (res) => {
        let data = ''
        res.on('data', d => data += d)
        res.on('end', () => {
          try {
            const p = JSON.parse(data)
            if (p.error) return resolve({ success: false, code: 'AI_API_ERROR', error: p.error?.message || JSON.stringify(p.error), guidance: ['The model server returned an error response. Check model name and request parameters.'], docsHint: 'help#ai' })
            resolve({ success: true, content: p.choices?.[0]?.message?.content || data })
          }
          catch { resolve({ success: false, code: 'AI_BAD_RESPONSE', error: data.slice(0, 300), guidance: ['The server returned non-JSON data. Is the endpoint actually an OpenAI-compatible API?'], docsHint: 'help#ai' }) }
        })
      })
      req.on('error', (e) => resolve({ success: false, ...diagnoseConnection(e) }))
      req.on('timeout', () => { req.destroy(); resolve({ success: false, code: 'AI_TIMEOUT', error: 'Request timed out after 120s', guidance: ['Try a smaller model.', 'Increase resources allocated to LM Studio.'], docsHint: 'help#ai' }) })
      req.write(body); req.end()
    } catch (e) { resolve({ success: false, ...diagnoseConnection(e) }) }
  })
})

ipcMain.handle('ai:buildContext', (_, query) => {
  const q = String(query || '').toLowerCase()
  const match = (text) => !q || (text || '').toLowerCase().includes(q.slice(0, 40))
  const jrn = (store.journal || []).filter(e => match(e.content)).slice(-5).map(e => ({ source: 'journal', date: e.date, text: e.content }))
  const nts = (store.notes || []).filter(n => match(n.title) || match(n.content)).slice(-5).map(n => ({ source: 'notebook', title: n.title, text: n.content }))
  const rms = (store.reminders || []).filter(r => match(r.title) || match(r.description)).slice(-5).map(r => ({ source: 'reminder', title: r.title, datetime: r.datetime, text: r.description }))
  return { journal: jrn, notes: nts, reminders: rms }
})

ipcMain.handle('app:launch', (_, appPath) => { launchApp(appPath); return true })
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
ipcMain.handle('window:close', () => { app.quit() })

ipcMain.handle('color:pick', async (_, delay = 3) => {
  return new Promise((resolve) => {
    const wait = Math.max(0, Math.min(10, parseInt(delay) || 3))
    const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Start-Sleep -Seconds ${wait}
$pt = [System.Windows.Forms.Cursor]::Position
$bmp = New-Object System.Drawing.Bitmap(1, 1)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($pt.X, $pt.Y, 0, 0, [System.Drawing.Size]::new(1, 1))
$px = $bmp.GetPixel(0, 0)
Write-Output ("{0},{1},{2}" -f $px.R, $px.G, $px.B)
$g.Dispose(); $bmp.Dispose()
`
    psRun(script).then(out => {
      const parts = (out || '').trim().split(',').map(Number)
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        const [r, g, b] = parts
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
        resolve({ r, g, b, hex })
      } else {
        resolve(null)
      }
    }).catch(() => resolve(null))
  })
})

// ─── Mouse Position ───────────────────────────────────────────────────────────
ipcMain.handle('mouse:pos', () => screen.getCursorScreenPoint())

// ─── Journal IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('journal:list', () => pbGet('journal', []))
ipcMain.handle('journal:save', (_, entry) => {
  let list = pbGet('journal', [])
  const idx = list.findIndex(e => e.id === entry.id)
  if (idx >= 0) list[idx] = entry; else list = [...list, entry]
  pbSet('journal', list); return entry
})
ipcMain.handle('journal:delete', (_, id) => { pbSet('journal', (pbGet('journal', [])).filter(e => e.id !== id)); return true })
ipcMain.handle('journal:search', (_, query) => {
  const q = (query||'').toLowerCase()
  return (pbGet('journal', [])).filter(e => (e.content||'').toLowerCase().includes(q) || (e.tags||[]).some(t => t.toLowerCase().includes(q))).slice(-5)
})

// ─── Reminders IPC ───────────────────────────────────────────────────────────
ipcMain.handle('reminders:list', () => pbGet('reminders', []))
ipcMain.handle('reminders:save', (_, reminder) => {
  let list = pbGet('reminders', [])
  const idx = list.findIndex(r => r.id === reminder.id)
  if (idx >= 0) list[idx] = reminder; else list = [...list, reminder]
  pbSet('reminders', list); return reminder
})
ipcMain.handle('reminders:delete', (_, id) => { pbSet('reminders', (pbGet('reminders', [])).filter(r => r.id !== id)); return true })
ipcMain.handle('reminders:dismiss', (_, id) => {
  const list = pbGet('reminders', [])
  const r = list.find(r => r.id === id)
  if (r) { r.dismissed = true; pbSet('reminders', list) }
  return true
})

// ─── Notifications IPC ────────────────────────────────────────────────────────
ipcMain.handle('notifications:show', (_, { title, body }) => {
  try { new Notification({ title: String(title||''), body: String(body||'') }).show() } catch {}
  return true
})

// ─── Notes Export ────────────────────────────────────────────────────────────
ipcMain.handle('notes:exportPdf', async (_, { content, title }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Note as PDF',
    defaultPath: `${title || 'note'}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (!filePath) return { ok: false }
  try {
    const pdfData = await mainWindow.webContents.printToPDF({ printBackground: true })
    fs.writeFileSync(filePath, pdfData)
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('notes:exportFile', async (_, { content, title, ext }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Export Note`,
    defaultPath: `${title || 'note'}.${ext}`,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  })
  if (!filePath) return { ok: false }
  try { fs.writeFileSync(filePath, content || '', 'utf8'); return { ok: true } }
  catch (e) { return { ok: false, error: e.message } }
})

// ─── AI Settings IPC ─────────────────────────────────────────────────────────
ipcMain.handle('aiSettings:get', () => store.aiSettings || {})
ipcMain.handle('aiSettings:set', (_, val) => { store.aiSettings = { ...(store.aiSettings||{}), ...val }; saveStore(store); return store.aiSettings })
ipcMain.handle('ai:models', async (_, endpoint) => {
  return new Promise((resolve) => {
    try {
      const base = endpoint || 'http://localhost:1234'
      const url = new URL(`${base}/v1/models`)
      const proto = url.protocol === 'https:' ? require('https') : http
      const req = proto.request({ hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname, method: 'GET', timeout: 5000 }, (res) => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => {
          try { const j = JSON.parse(d); resolve((j.data||[]).map(m => m.id || m)) } catch { resolve([]) }
        })
      })
      req.on('error', () => resolve([])); req.on('timeout', () => { req.destroy(); resolve([]) }); req.end()
    } catch { resolve([]) }
  })
})

// ─── File System IPC ─────────────────────────────────────────────────────────
function safePath(p) {
  if (!path.isAbsolute(p)) throw new Error('Path must be absolute')
  if (p.includes('..')) throw new Error('Path traversal not allowed')
  return p
}
ipcMain.handle('fs:homedir', () => os.homedir())
ipcMain.handle('fs:readdir', async (_, dirPath) => {
  const safe = safePath(dirPath)
  const entries = await fs.promises.readdir(safe, { withFileTypes: true })
  return entries.map(e => {
    let size = 0, modified = ''
    try { const st = fs.statSync(path.join(safe, e.name)); size = st.size; modified = st.mtime.toISOString() } catch {}
    return { name: e.name, isDir: e.isDirectory(), size, modified }
  })
})
ipcMain.handle('fs:stat', async (_, p) => {
  const st = fs.statSync(safePath(p))
  return { size: st.size, modified: st.mtime.toISOString(), isDir: st.isDirectory() }
})
ipcMain.handle('fs:readfile', async (_, p, maxBytes = 51200) => {
  const safe = safePath(p)
  const buf = Buffer.alloc(maxBytes)
  const fd = fs.openSync(safe, 'r')
  const bytesRead = fs.readSync(fd, buf, 0, maxBytes, 0)
  fs.closeSync(fd)
  return buf.slice(0, bytesRead).toString('utf8')
})
ipcMain.handle('fs:writefile', async (_, p, content) => {
  // Write UTF-8 content to an arbitrary path. Caller is expected to supply a
  // fully qualified, user-chosen path; safePath blocks obvious traversal.
  const safe = safePath(p)
  await fs.promises.mkdir(path.dirname(safe), { recursive: true })
  await fs.promises.writeFile(safe, String(content ?? ''), 'utf8')
  return true
})
// Default workspace root for the IDE — stored under %APPDATA%/scotty-multitool/projects.
ipcMain.handle('ide:projectsDir', async () => {
  const dir = path.join(app.getPath('userData'), 'projects')
  await fs.promises.mkdir(dir, { recursive: true })
  return dir
})
ipcMain.handle('fs:copy', async (_, src, dest) => { await fs.promises.copyFile(safePath(src), safePath(dest)); return true })
ipcMain.handle('fs:move', async (_, src, dest) => { await fs.promises.rename(safePath(src), safePath(dest)); return true })
ipcMain.handle('fs:delete', async (_, p) => {
  const safe = safePath(p)
  await psRun(`Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${safe.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`)
  return true
})
ipcMain.handle('fs:deletedir', async (_, p) => {
  const safe = safePath(p)
  await psRun(`Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('${safe.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`)
  return true
})
ipcMain.handle('fs:mkdir', async (_, p) => { await fs.promises.mkdir(safePath(p), { recursive: true }); return true })
ipcMain.handle('fs:rename', async (_, oldP, newP) => { await fs.promises.rename(safePath(oldP), safePath(newP)); return true })
ipcMain.handle('fs:open', async (_, p) => { await electronShell.openPath(safePath(p)); return true })
ipcMain.handle('fs:search', async (_, dir, query) => {
  const safe = safePath(dir)
  const q = (query||'').toLowerCase()
  const results = []
  function walk(d, depth) {
    if (depth > 4 || results.length >= 200) return
    let entries
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (results.length >= 200) return
      if (e.name.toLowerCase().includes(q)) results.push({ path: path.join(d, e.name), name: e.name, isDir: e.isDirectory() })
      if (e.isDirectory()) walk(path.join(d, e.name), depth + 1)
    }
  }
  walk(safe, 0)
  return results
})

// ─── Shell (Agent CLI) IPC ────────────────────────────────────────────────────
let shellProcess = null
// Broadcast shell stdout/stderr/exit to the main window AND any detached CLI windows.
function broadcastShell(channel, payload) {
  try { mainWindow?.webContents.send(channel, payload) } catch {}
  for (const w of cliWindows) {
    try { if (w && !w.isDestroyed()) w.webContents.send(channel, payload) } catch {}
  }
}
ipcMain.handle('shell:spawn', () => {
  if (shellProcess) { try { shellProcess.kill() } catch {} }
  shellProcess = spawn('powershell.exe', ['-NoLogo', '-NoExit', '-Command', '-'], { stdio: ['pipe','pipe','pipe'] })
  shellProcess.stdout.on('data', d => broadcastShell('shell:data', d.toString()))
  shellProcess.stderr.on('data', d => broadcastShell('shell:data', d.toString()))
  shellProcess.on('close', () => { shellProcess = null; broadcastShell('shell:closed') })
  return true
})
ipcMain.handle('shell:write', (_, text) => { if (shellProcess) { shellProcess.stdin.write(text + '\n') } return true })
ipcMain.handle('shell:kill', () => { if (shellProcess) { try { shellProcess.kill() } catch {}; shellProcess = null } return true })

// ─── Detachable CLI Window ────────────────────────────────────────────────────
const cliWindows = new Set()
ipcMain.handle('cli:open', () => {
  const win = new BrowserWindow({
    width: 900, height: 620, minWidth: 560, minHeight: 360,
    frame: false, titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0d0d0d', symbolColor: '#f5f5f5', height: 36 },
    backgroundColor: '#0d0d0d',
    title: 'Multitool · CLI',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const target = isDev ? 'http://localhost:5173/#cli' : `file://${path.join(__dirname, '../dist/index.html')}#cli`
  win.loadURL(target)
  cliWindows.add(win)
  win.on('closed', () => { cliWindows.delete(win) })
  return true
})

// ─── Companion Server (background Node process) ──────────────────────────────
// Manages the local server under server/index.js. The renderer can start/stop
// it and polls `server:status` for the bottom status bar pill. We also ping
// /health from the main process and broadcast `server:state` to the UI so the
// pill updates without polling.
const SERVER_PORT = Number(process.env.SCOTTY_SERVER_PORT || 4455)
let serverProc = null
let serverState = { state: 'idle', port: SERVER_PORT, lastOk: 0, error: null }

function broadcastServerState() {
  for (const w of BrowserWindow.getAllWindows()) {
    try { w.webContents.send('server:state', serverState) } catch {}
  }
}

function pingServer() {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: SERVER_PORT, path: '/health', timeout: 1500 }, (res) => {
      let body = ''
      res.on('data', (c) => { body += c })
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve({ ok: true, data: JSON.parse(body) }) }
          catch { resolve({ ok: true, data: null }) }
        } else resolve({ ok: false, error: `HTTP ${res.statusCode}` })
      })
    })
    req.on('error', (e) => resolve({ ok: false, error: e.code || e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }) })
  })
}

async function refreshServerState() {
  const wasRunning = !!serverProc
  const r = await pingServer()
  if (r.ok) {
    serverState = { state: 'connected', port: SERVER_PORT, lastOk: Date.now(), error: null, info: r.data }
  } else if (wasRunning) {
    serverState = { ...serverState, state: 'connecting', error: r.error }
  } else {
    serverState = { ...serverState, state: 'idle', error: null }
  }
  broadcastServerState()
}

ipcMain.handle('server:getPort', () => SERVER_PORT)
ipcMain.handle('server:status', async () => { await refreshServerState(); return serverState })

ipcMain.handle('server:start', async () => {
  if (serverProc) return { ok: true, alreadyRunning: true, pid: serverProc.pid }
  const script = path.join(__dirname, '..', 'server', 'index.js')
  if (!fs.existsSync(script)) return { ok: false, error: 'server/index.js not found' }
  try {
    serverProc = spawn(process.execPath, [script], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, SCOTTY_SERVER_PORT: String(SERVER_PORT), ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    serverState = { ...serverState, state: 'connecting', error: null }
    broadcastServerState()
    const onData = (buf) => { try { process.stdout.write('[server] ' + buf.toString()) } catch {} }
    serverProc.stdout?.on('data', onData)
    serverProc.stderr?.on('data', onData)
    serverProc.on('exit', (code) => {
      serverProc = null
      serverState = { ...serverState, state: 'idle', error: code ? `exit ${code}` : null }
      broadcastServerState()
    })
    setTimeout(refreshServerState, 600)
    return { ok: true, pid: serverProc.pid }
  } catch (e) {
    serverProc = null
    serverState = { ...serverState, state: 'idle', error: e.message }
    broadcastServerState()
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('server:stop', async () => {
  if (!serverProc) return { ok: true, alreadyStopped: true }
  try { serverProc.kill() } catch {}
  return { ok: true }
})

// Poll server state every 5s so the UI stays in sync if the user started the
// server externally (via launcher.ps1).
setInterval(() => { refreshServerState().catch(() => {}) }, 5000)

// ─── Screen Capture (Computer Use Agent) ──────────────────────────────────────
ipcMain.handle('screen:sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 320, height: 180 } })
  return sources.map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }))
})

ipcMain.handle('screen:capture', async (_, sourceIdOrOpts, maybeOpts) => {
  // Back-compat: first arg can be sourceId (string) or an opts object.
  let sourceId = null; let opts = {}
  if (typeof sourceIdOrOpts === 'string') { sourceId = sourceIdOrOpts; opts = maybeOpts || {} }
  else if (sourceIdOrOpts && typeof sourceIdOrOpts === 'object') { opts = sourceIdOrOpts; sourceId = opts.sourceId || null }
  const maxDim = Math.max(320, Math.min(2560, parseInt(opts.maxDim) || 1280))
  const asJpeg = opts.format === 'jpeg'
  const quality = Math.max(30, Math.min(100, parseInt(opts.quality) || 75))
  const thumbH = Math.round(maxDim * (opts.aspect === 'wide' ? 0.5625 : 0.625)) // roughly 16:10
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: maxDim, height: thumbH } })
  const src = sourceId ? sources.find(s => s.id === sourceId) : sources[0]
  if (!src) return { success: false, error: 'No screen source found' }
  const size = src.thumbnail.getSize()
  try {
    const dataUrl = asJpeg ? src.thumbnail.toJPEG(quality).toString('base64') : null
    return {
      success: true,
      dataUrl: asJpeg ? `data:image/jpeg;base64,${dataUrl}` : src.thumbnail.toDataURL(),
      width: size.width, height: size.height,
      format: asJpeg ? 'jpeg' : 'png',
    }
  } catch {
    return { success: true, dataUrl: src.thumbnail.toDataURL(), width: size.width, height: size.height, format: 'png' }
  }
})

// ─── Action Execute (Computer Use Agent) ──────────────────────────────────────
ipcMain.handle('action:execute', async (_, action) => {
  try {
    const psEscape = (s) => String(s).replace(/'/g, "''").replace(/[{}[\]]/g, c => `{${c}}`)
    if (action.type === 'click') {
      const x = parseInt(action.x), y = parseInt(action.y)
      await psRun(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, int i);' -Name U32 -Namespace W -ErrorAction SilentlyContinue
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
Start-Sleep -Milliseconds 80
[W.U32]::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 30
[W.U32]::mouse_event(0x04, 0, 0, 0, 0)`)
    } else if (action.type === 'move') {
      const x = parseInt(action.x), y = parseInt(action.y)
      await psRun(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`)
    } else if (action.type === 'type') {
      // Use clipboard paste for reliable text input (avoids SendKeys special-char escaping)
      const text = (action.text || '').replace(/'/g, "''")
      await psRun(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);' -Name KeySend2 -Namespace KS2 -ErrorAction SilentlyContinue
[System.Windows.Forms.Clipboard]::SetText('${text}')
Start-Sleep -Milliseconds 80
[KeySend2]::keybd_event(0x11, 0, 0, 0)
[KeySend2]::keybd_event(0x56, 0, 0, 0)
Start-Sleep -Milliseconds 30
[KeySend2]::keybd_event(0x56, 0, 2, 0)
[KeySend2]::keybd_event(0x11, 0, 2, 0)`)
    } else if (action.type === 'key') {
      // Use keybd_event with VK codes — handles Win key, all modifiers, function keys
      const VK = { win:0x5B, ctrl:0x11, alt:0x12, shift:0x10, enter:0x0D, return:0x0D,
        tab:0x09, esc:0x1B, escape:0x1B, backspace:0x08, delete:0x2E, del:0x2E,
        up:0x26, down:0x28, left:0x25, right:0x27, home:0x24, end:0x23,
        pageup:0x21, pagedown:0x22, space:0x20, insert:0x2D,
        f1:0x70,f2:0x71,f3:0x72,f4:0x73,f5:0x74,f6:0x75,
        f7:0x76,f8:0x77,f9:0x78,f10:0x79,f11:0x7A,f12:0x7B }
      const parts = (action.combo || '').toLowerCase().split('+').map(s => s.trim()).filter(Boolean)
      const vkCodes = parts.map(p => {
        if (VK[p] !== undefined) return VK[p]
        if (p.length === 1) return p.toUpperCase().charCodeAt(0)  // A-Z, 0-9
        const fm = p.match(/^f(\d+)$/)
        if (fm) return 0x6F + parseInt(fm[1])  // F1-F24
        return null
      }).filter(v => v !== null)
      if (vkCodes.length > 0) {
        const presses = vkCodes.map(vk => `[KeySend]::keybd_event(${vk}, 0, 0, 0)`).join('; ')
        const releases = [...vkCodes].reverse().map(vk => `[KeySend]::keybd_event(${vk}, 0, 2, 0)`).join('; ')
        await psRun(`
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);' -Name KeySend -Namespace KS -ErrorAction SilentlyContinue
${presses}
Start-Sleep -Milliseconds 50
${releases}`)
      }
    } else if (action.type === 'scroll') {
      const x = parseInt(action.x), y = parseInt(action.y)
      const amt = parseInt(action.amount || 3)
      const delta = (action.direction === 'down' || action.direction === 'right') ? -(amt * 120) : (amt * 120)
      await psRun(`
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, int i);' -Name U32sc -Namespace W -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
Start-Sleep -Milliseconds 50
[W.U32sc]::mouse_event(0x0800, 0, 0, [uint]${delta}, 0)`)
    } else if (action.type === 'wait') {
      await new Promise(r => setTimeout(r, Math.min(parseInt(action.ms) || 500, 10000)))
    } else if (action.type === 'done') {
      // No-op: caller handles DONE
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ─── Media Library ────────────────────────────────────────────────────────────
const mediaDir = path.join(userData, 'media')
try { if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true }) } catch {}

ipcMain.handle('media:list', () => pbGet('mediaLibrary', []))
ipcMain.handle('media:import', async (_, filePaths) => {
  const imported = []
  let lib = pbGet('mediaLibrary', [])
  for (const src of filePaths || []) {
    try {
      const filename = path.basename(src)
      const id = `media-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
      const dest = path.join(mediaDir, `${id}-${filename}`)
      await fs.promises.copyFile(src, dest)
      const stat = await fs.promises.stat(dest)
      const ext = path.extname(filename).toLowerCase()
      const type = ['.png','.jpg','.jpeg','.gif','.webp','.bmp'].includes(ext) ? 'image'
                 : ['.mp4','.webm','.mov','.mkv','.avi'].includes(ext) ? 'video'
                 : ['.mp3','.wav','.ogg','.flac','.m4a'].includes(ext) ? 'audio' : 'other'
      const entry = { id, filename, relPath: dest, type, tags: [], notes: '', size: stat.size, addedAt: new Date().toISOString() }
      lib = [...lib, entry]
      imported.push(entry)
    } catch (e) { /* skip bad file */ }
  }
  pbSet('mediaLibrary', lib)
  return imported
})
ipcMain.handle('media:delete', async (_, id) => {
  const lib = pbGet('mediaLibrary', [])
  const item = lib.find(m => m.id === id)
  if (item) { try { await fs.promises.unlink(item.relPath) } catch {} }
  pbSet('mediaLibrary', lib.filter(m => m.id !== id))
  return true
})
ipcMain.handle('media:update', (_, id, patch) => {
  pbSet('mediaLibrary', (pbGet('mediaLibrary', [])).map(m => m.id === id ? { ...m, ...patch } : m))
  return true
})
ipcMain.handle('media:open', (_, id) => {
  const item = (pbGet('mediaLibrary', [])).find(m => m.id === id)
  if (item) electronShell.openPath(item.relPath)
  return true
})
ipcMain.handle('media:pick', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Media', extensions: ['png','jpg','jpeg','gif','webp','bmp','mp4','webm','mov','mkv','avi','mp3','wav','ogg','flac','m4a'] }]
  })
  return res.canceled ? [] : res.filePaths
})

// ─── Bookmarks / Browser ──────────────────────────────────────────────────────
ipcMain.handle('bookmarks:list', () => pbGet('bookmarks', []))
ipcMain.handle('bookmarks:save', (_, bm) => {
  let list = pbGet('bookmarks', [])
  const i = list.findIndex(b => b.id === bm.id)
  if (i >= 0) list[i] = bm; else list = [...list, { ...bm, id: bm.id || `bm-${Date.now()}`, addedAt: bm.addedAt || new Date().toISOString() }]
  pbSet('bookmarks', list)
  return list
})
ipcMain.handle('bookmarks:delete', (_, id) => {
  pbSet('bookmarks', (pbGet('bookmarks', [])).filter(b => b.id !== id))
  return true
})

// ─── Backup / Restore ─────────────────────────────────────────────────────────
ipcMain.handle('settings:export', async () => {
  const res = await dialog.showSaveDialog(mainWindow, { defaultPath: `macrobot-backup-${Date.now()}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] })
  if (res.canceled) return { ok: false }
  fs.writeFileSync(res.filePath, JSON.stringify(store, null, 2))
  return { ok: true, path: res.filePath }
})
ipcMain.handle('settings:import', async () => {
  const res = await dialog.showOpenDialog(mainWindow, { filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] })
  if (res.canceled) return { ok: false }
  try {
    const data = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'))
    Object.assign(store, data)
    saveStore(store)
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

// ─── Chores ───────────────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id: 'first_complete', name: 'First Step',        description: 'Complete your first chore.',        rule: (p) => (p.history||[]).length >= 1 },
  { id: 'streak_3',       name: '3-Day Streak',      description: 'Complete any chore 3 days in a row.',rule: (_, ctx) => ctx?.chore?.streak >= 3 },
  { id: 'streak_7',       name: 'Week Warrior',      description: 'Complete any chore 7 days in a row.',rule: (_, ctx) => ctx?.chore?.streak >= 7 },
  { id: 'streak_30',      name: 'Iron Discipline',   description: 'Complete any chore 30 days in a row.',rule: (_, ctx) => ctx?.chore?.streak >= 30 },
  { id: 'level_5',        name: 'Level 5',           description: 'Reach level 5.',                     rule: (p) => (p.level||0) >= 5 },
  { id: 'level_10',       name: 'Level 10',          description: 'Reach level 10.',                    rule: (p) => (p.level||0) >= 10 },
  { id: 'variety_5',      name: 'Variety',           description: 'Complete chores in 5 categories.',   rule: (_, ctx) => {
      const cats = new Set(); for (const h of ctx?.allHistoryWithCats || []) if (h.category) cats.add(h.category)
      return cats.size >= 5 } },
  { id: 'early_bird',     name: 'Early Bird',        description: 'Complete a chore before 9am.',       rule: (_, ctx) => { const h = new Date().getHours(); return h < 9 } },
  { id: 'night_owl',      name: 'Night Owl',         description: 'Complete a chore after 10pm.',       rule: (_, ctx) => { const h = new Date().getHours(); return h >= 22 } },
  { id: 'ten_done',       name: 'Ten Done',          description: 'Complete 10 chores total.',          rule: (p) => (p.history||[]).length >= 10 },
  { id: 'fifty_done',     name: 'Fifty Done',        description: 'Complete 50 chores total.',          rule: (p) => (p.history||[]).length >= 50 },
]

function evaluateAchievements(profile, ctx) {
  const unlocked = new Set(profile.achievements || [])
  const newly = []
  for (const def of ACHIEVEMENT_DEFS) {
    if (unlocked.has(def.id)) continue
    try {
      if (def.rule(profile, ctx)) { unlocked.add(def.id); newly.push(def) }
    } catch {}
  }
  profile.achievements = Array.from(unlocked)
  return newly
}

ipcMain.handle('chores:achievements', () => ACHIEVEMENT_DEFS)
ipcMain.handle('chores:list', () => pbGet('chores', []))
ipcMain.handle('chores:save', (_, chore) => {
  let list = pbGet('chores', [])
  const i = list.findIndex(c => c.id === chore.id)
  const normalized = {
    ...chore,
    id: chore.id || `chore-${Date.now()}`,
    createdAt: chore.createdAt || new Date().toISOString(),
    category: chore.category || 'General',
    tags: Array.isArray(chore.tags) ? chore.tags : [],
    assignedTo: chore.assignedTo || chore.owner || 'anyone',
  }
  if (i >= 0) list[i] = normalized; else list = [...list, normalized]
  pbSet('chores', list)
  return list
})
ipcMain.handle('chores:delete', (_, id) => {
  pbSet('chores', (pbGet('chores', [])).filter(c => c.id !== id))
  return true
})
ipcMain.handle('chores:profile', () => pbGet('choreProfile', { xp: 0, level: 0, achievements: [], history: [] }))
ipcMain.handle('chores:setProfile', (_, p) => { pbSet('choreProfile', p); return p })
ipcMain.handle('chores:complete', (_, id, owner) => {
  const chores = pbGet('chores', [])
  const chore = chores.find(c => c.id === id)
  if (!chore) return null
  const profile = pbGet('choreProfile', { xp: 0, level: 0, achievements: [], history: [] })
  const today = new Date().toISOString().slice(0, 10)
  const pts = chore.points || (chore.difficulty || 1) * 10
  profile.xp = (profile.xp || 0) + pts
  profile.level = Math.floor(Math.sqrt(profile.xp / 50))
  profile.history = [...(profile.history || []), { date: today, choreId: id, points: pts, owner: owner || chore.assignedTo || 'me', category: chore.category || 'General' }].slice(-500)
  // Streak
  const last = chore.lastCompleted
  if (last) {
    const d1 = new Date(last); const d2 = new Date()
    const diffDays = Math.floor((d2 - d1) / 86400000)
    chore.streak = diffDays === 1 ? (chore.streak || 0) + 1 : diffDays === 0 ? (chore.streak || 1) : 1
  } else { chore.streak = 1 }
  chore.lastCompleted = today
  const newly = evaluateAchievements(profile, { chore, allHistoryWithCats: profile.history })
  // Persist both chore list and profile
  pbSet('chores', chores.map(c => c.id === id ? chore : c))
  pbSet('choreProfile', profile)
  return { profile, chore, newAchievements: newly }
})

// ─── Ad-blocker init ──────────────────────────────────────────────────────────
let adBlockList = new Set()
function loadAdBlockList() {
  try {
    const p = path.join(__dirname, '..', 'assets', 'blocklist.txt')
    if (fs.existsSync(p)) {
      adBlockList = new Set(fs.readFileSync(p, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')))
    }
  } catch {}
}
function installAdBlocker() {
  try {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      try {
        const u = new URL(details.url)
        if (adBlockList.has(u.hostname)) return callback({ cancel: true })
      } catch {}
      callback({ cancel: false })
    })
  } catch {}
}


// ─── Windows File Associations ("Open with Multitool") ───────────────────────
// Registers the app under HKCU so Windows can offer it as an "Open with"
// choice for a small set of text-ish file extensions. Uses HKCU so no elevated
// permissions are needed; the per-user registry writes are fully reversible.
const APP_REG_KEY = 'ScottyMultitool.1'
function ensureAppCommandKey() {
  // Build a canonical exec command line that forwards the file path to the app.
  const exe = process.execPath.replace(/'/g, "''")
  const args = isDev ? '--dev ' : ''
  const cmd = `"${exe.replace(/"/g, '\\"')}" ${args}"%1"`
  const quoted = cmd.replace(/'/g, "''")
  return `
New-Item -Path "HKCU:\\Software\\Classes\\${APP_REG_KEY}" -Force | Out-Null
New-ItemProperty -Path "HKCU:\\Software\\Classes\\${APP_REG_KEY}" -Name "(Default)" -Value "Scotty Multitool" -PropertyType String -Force | Out-Null
New-Item -Path "HKCU:\\Software\\Classes\\${APP_REG_KEY}\\shell\\open\\command" -Force | Out-Null
New-ItemProperty -Path "HKCU:\\Software\\Classes\\${APP_REG_KEY}\\shell\\open\\command" -Name "(Default)" -Value '${quoted}' -PropertyType String -Force | Out-Null
`
}
ipcMain.handle('shell:registerFileAssoc', async (_, exts) => {
  const list = Array.isArray(exts) && exts.length ? exts : ['.txt','.md','.json','.log','.csv']
  const parts = [ensureAppCommandKey()]
  for (const raw of list) {
    const ext = String(raw).trim().toLowerCase()
    if (!/^\.[a-z0-9]+$/.test(ext)) continue
    parts.push(`
New-Item -Path "HKCU:\\Software\\Classes\\${ext}\\OpenWithProgids" -Force | Out-Null
New-ItemProperty -Path "HKCU:\\Software\\Classes\\${ext}\\OpenWithProgids" -Name "${APP_REG_KEY}" -Value "" -PropertyType String -Force | Out-Null
`)
  }
  try { await psRun(parts.join('\n')); return { success: true, registered: list } }
  catch (e) { return { success: false, error: String(e?.message || e) } }
})
ipcMain.handle('shell:unregisterFileAssoc', async (_, exts) => {
  const list = Array.isArray(exts) && exts.length ? exts : ['.txt','.md','.json','.log','.csv']
  const parts = []
  for (const raw of list) {
    const ext = String(raw).trim().toLowerCase()
    if (!/^\.[a-z0-9]+$/.test(ext)) continue
    parts.push(`Remove-ItemProperty -Path "HKCU:\\Software\\Classes\\${ext}\\OpenWithProgids" -Name "${APP_REG_KEY}" -ErrorAction SilentlyContinue`)
  }
  parts.push(`Remove-Item -Path "HKCU:\\Software\\Classes\\${APP_REG_KEY}" -Recurse -ErrorAction SilentlyContinue`)
  try { await psRun(parts.join('\n')); return { success: true } }
  catch (e) { return { success: false, error: String(e?.message || e) } }
})

// When Windows launches us with a file path argv, stash it so the renderer can
// read it once it finishes booting and route to the appropriate component.
let launchedWithFile = null
{
  // Drop electron's own exec path + dev flags; the last non-flag token is the file.
  const args = process.argv.slice(1).filter(a => a && !a.startsWith('--'))
  const candidate = args[args.length - 1]
  if (candidate && /\.(txt|md|json|log|csv)$/i.test(candidate)) {
    try {
      const full = path.resolve(candidate)
      if (fs.existsSync(full)) launchedWithFile = full
    } catch {}
  }
}
ipcMain.handle('shell:getLaunchFile', () => {
  const f = launchedWithFile
  launchedWithFile = null
  return f
})

// ─── Component Marketplace IPC ──────────────────────────────────────────────
// Local .mbcomp packs are plain JSON files stored under the app's userData
// folder. A pack is {name, version, author, description, preview, category,
// component:{template,config}, rating?}. Installed packs are tracked in
// electron-store at `marketplace.installed` (array of pack objects) so the
// renderer can enumerate them without touching the filesystem on every call.
const MARKET_DIR = path.join(userData, 'marketplace')
function ensureMarketDir() {
  try { if (!fs.existsSync(MARKET_DIR)) fs.mkdirSync(MARKET_DIR, { recursive: true }) } catch {}
}
function readPackFile(fp) {
  const raw = fs.readFileSync(fp, 'utf-8')
  const pack = JSON.parse(raw)
  if (!pack || typeof pack !== 'object' || !pack.name || !pack.version) {
    throw new Error('Invalid .mbcomp pack: missing name/version')
  }
  return pack
}
ipcMain.handle('marketplace:list', () => pbGet('marketplace', { installed: [] }).installed || [])
ipcMain.handle('marketplace:install', (_, pack) => {
  ensureMarketDir()
  if (!pack?.name || !pack?.version) return { success: false, error: 'Invalid pack' }
  const safeName = String(pack.name).replace(/[^a-z0-9-_]/gi, '_')
  const fp = path.join(MARKET_DIR, `${safeName}-${pack.version}.mbcomp`)
  try { fs.writeFileSync(fp, JSON.stringify(pack, null, 2), 'utf-8') }
  catch (e) { return { success: false, error: String(e?.message || e) } }
  const state = pbGet('marketplace', { installed: [] })
  state.installed = (state.installed || []).filter(p => p.name !== pack.name)
  state.installed.push({ ...pack, installedAt: new Date().toISOString(), filePath: fp })
  pbSet('marketplace', state)
  return { success: true, pack }
})
ipcMain.handle('marketplace:uninstall', (_, name) => {
  const state = pbGet('marketplace', { installed: [] })
  const removed = (state.installed || []).find(p => p.name === name)
  state.installed = (state.installed || []).filter(p => p.name !== name)
  pbSet('marketplace', state)
  if (removed?.filePath) { try { fs.unlinkSync(removed.filePath) } catch {} }
  return { success: true }
})
ipcMain.handle('marketplace:importFromFile', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Import .mbcomp pack',
    filters: [{ name: 'Multitool Component', extensions: ['mbcomp', 'json'] }],
    properties: ['openFile'],
  })
  if (res.canceled || !res.filePaths?.[0]) return { success: false, canceled: true }
  try {
    const pack = readPackFile(res.filePaths[0])
    return { success: true, pack }
  } catch (e) { return { success: false, error: String(e?.message || e) } }
})
ipcMain.handle('marketplace:importFromGithub', async (_, url) => {
  if (typeof url !== 'string' || !url.trim()) return { success: false, error: 'URL required' }
  // Accept raw.githubusercontent.com URLs, or convert github.com/<o>/<r>/blob/<b>/<p>
  // to the equivalent raw URL so users can paste either form.
  let fetchUrl = url.trim()
  const blobMatch = fetchUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i)
  if (blobMatch) {
    fetchUrl = `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}/${blobMatch[4]}`
  }
  if (!/^https:\/\/(raw\.githubusercontent\.com|github\.com)\//i.test(fetchUrl)) {
    return { success: false, error: 'Only GitHub URLs are allowed' }
  }
  try {
    const { net } = require('electron')
    const text = await new Promise((resolve, reject) => {
      const req = net.request(fetchUrl)
      let body = ''
      req.on('response', (resp) => {
        if (resp.statusCode >= 400) { reject(new Error(`HTTP ${resp.statusCode}`)); return }
        resp.on('data', chunk => { body += chunk.toString('utf-8') })
        resp.on('end', () => resolve(body))
      })
      req.on('error', reject)
      req.end()
    })
    const pack = JSON.parse(text)
    if (!pack?.name || !pack?.version) throw new Error('Invalid pack: missing name/version')
    return { success: true, pack }
  } catch (e) { return { success: false, error: String(e?.message || e) } }
})
ipcMain.handle('marketplace:export', async (_, pack) => {
  if (!pack?.name) return { success: false, error: 'Pack required' }
  const res = await dialog.showSaveDialog({
    title: 'Export .mbcomp pack',
    defaultPath: `${pack.name}-${pack.version || '1.0.0'}.mbcomp`,
    filters: [{ name: 'Multitool Component', extensions: ['mbcomp'] }],
  })
  if (res.canceled || !res.filePath) return { success: false, canceled: true }
  try {
    fs.writeFileSync(res.filePath, JSON.stringify(pack, null, 2), 'utf-8')
    return { success: true, filePath: res.filePath }
  } catch (e) { return { success: false, error: String(e?.message || e) } }
})

// ─── Custom Components IPC (Visual Creator output) ──────────────────────────
// These are user-authored "components" built via the form wizard. Unlike
// marketplace packs, they live directly in the nav bar. Stored as a list at
// `customComponents` in electron-store. Each has {id, name, icon, template,
// config, createdAt}. No arbitrary code execution — the renderer looks up a
// whitelisted template by name.
ipcMain.handle('customComponents:list', () => pbGet('customComponents', []))
ipcMain.handle('customComponents:save', (_, comp) => {
  if (!comp?.id || !comp?.name) return { success: false, error: 'Invalid component' }
  const list = pbGet('customComponents', [])
  const idx = list.findIndex(c => c.id === comp.id)
  const next = { ...comp, updatedAt: new Date().toISOString() }
  if (idx >= 0) list[idx] = next; else list.push({ ...next, createdAt: next.updatedAt })
  pbSet('customComponents', list)
  return { success: true, component: next }
})
ipcMain.handle('customComponents:delete', (_, id) => {
  pbSet('customComponents', pbGet('customComponents', []).filter(c => c.id !== id))
  return { success: true }
})

app.whenReady().then(() => {
  // Skip splash in test mode to keep Playwright's firstWindow() deterministic.
  if (!process.env.MACROBOT_TEST) createSplash()
  createWindow()
  try { require('./chrome-cdp').registerIpc(ipcMain, app) } catch (e) { console.error('cdp register failed', e) }
  // Expose imported media to the renderer via a custom protocol. Using file://
  // directly is blocked by Electron's default webSecurity, which is why images
  // weren't rendering in the Media Library.
  try {
    const mediaRoot = path.join(app.getPath('userData'), 'media')
    protocol.registerFileProtocol('media', (request, cb) => {
      try {
        const rel = decodeURIComponent(request.url.replace(/^media:\/\//, ''))
        // Accept either a bare filename (media://<name>) or an absolute path
        // (media:///C:/...) for backward-compat with stored entries.
        let resolved
        if (/^[a-zA-Z]:[\\/]/.test(rel)) resolved = rel
        else if (rel.startsWith('/')) resolved = rel.slice(1)
        else resolved = path.join(mediaRoot, rel)
        cb({ path: resolved })
      } catch (e) { cb({ error: -6 }) }
    })
  } catch (e) { console.error('media protocol register failed', e) }

  // Graceful handling of certificate errors and permissions for embedded
  // webviews. Previously an expired/self-signed cert would pop a scary
  // "suspicious content" interstitial; we now show a lightweight in-app toast
  // instead and let the renderer decide how to recover.
  try {
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      event.preventDefault()
      // Reject by default — the renderer sees a did-fail-load event and can
      // surface a friendly banner.
      callback(false)
      try { webContents.send('browser:cert-error', { url, error }) } catch {}
    })
    app.on('web-contents-created', (_event, contents) => {
      if (contents.getType && contents.getType() === 'webview') {
        contents.setWindowOpenHandler(({ url }) => {
          electronShell.openExternal(url).catch(() => {})
          return { action: 'deny' }
        })
      }
    })
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      // Deny sensitive permissions by default. Users can add exceptions later.
      const allowed = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen']
      callback(allowed.includes(permission))
    })
  } catch (e) { console.error('security handlers failed', e) }
})
app.on('window-all-closed', () => { globalShortcut.unregisterAll(); if (process.platform !== 'darwin') app.quit() })
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopMobileServer()
  stopTextExpander()
  if (schedulerInterval) clearInterval(schedulerInterval)
  if (clipboardInterval) clearInterval(clipboardInterval)
  if (reminderPoller) clearInterval(reminderPoller)
  if (shellProcess) { try { shellProcess.kill() } catch {} }
})
