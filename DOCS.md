# Scotty's Multitool — Complete Documentation

A local-first Windows productivity and automation suite built on Electron + React.
Nothing you type, record, or save leaves your computer unless you explicitly connect
an external AI endpoint.

---

## Table of Contents

1. [Installation & First Launch](#installation--first-launch)
2. [Architecture Overview](#architecture-overview)
3. [Accounts, Authentication & Recovery](#accounts-authentication--recovery)
4. [Dashboard](#dashboard)
5. [Global Search & Command Palette](#global-search--command-palette)
6. [Macros](#macros)
7. [Hotkeys](#hotkeys)
8. [Text Expander](#text-expander)
9. [Auto Clicker](#auto-clicker)
10. [Scheduler](#scheduler)
11. [App Launcher](#app-launcher)
12. [Clipboard Manager](#clipboard-manager)
13. [Notebook](#notebook)
14. [Window Snapper / Window Tools](#window-snapper--window-tools)
15. [Focus Timer](#focus-timer)
16. [Volume Control](#volume-control)
17. [Color Picker](#color-picker)
18. [System Monitor](#system-monitor)
19. [File Manager](#file-manager)
20. [Journal (PIN-Protected)](#journal-pin-protected)
21. [Reminders](#reminders)
22. [Chore Planner](#chore-planner)
23. [Media Library](#media-library)
24. [Media Player Bar](#media-player-bar)
25. [Browser](#browser)
26. [AI Workstation](#ai-workstation)
27. [Mobile Remote](#mobile-remote)
28. [Components Tab](#components-tab)
29. [Settings & Backup](#settings--backup)
30. [Keyboard Shortcuts](#keyboard-shortcuts)
31. [Data Storage & Privacy](#data-storage--privacy)
32. [Troubleshooting](#troubleshooting)
33. [Development & Testing](#development--testing)

---

## Installation & First Launch

**Requirements**

- Windows 10 / 11 (64-bit)
- PowerShell 5.1+ (ships with Windows)
- ~200 MB free disk space
- Optional: a local LLM endpoint (LM Studio, Ollama, etc.) or an OpenAI API key for the AI Workstation.

**Running from source**

```powershell
# Install dependencies once
npm install

# Development (Vite dev server + Electron, hot reload)
npm run dev

# Production build
npm run build
npm start     # launches the packaged renderer in Electron
```

**Packaged builds** produce a single `Scotty MacroBot.exe` via electron-builder.
Double-click `Start MacroBot.bat` for the user-friendly launcher.

At first launch you'll be asked to create a local account (see
[Accounts, Authentication & Recovery](#accounts-authentication--recovery)).

---

## Architecture Overview

| Layer | Tech | Notes |
|-------|------|-------|
| Main process | Electron 29 (Node) | `electron/main.js` — IPC, filesystem, PowerShell bridge |
| Renderer | React 18 + Vite 5 | `src/` — single-window frameless UI |
| Data store | JSON file | `%APPDATA%/scotty-multitool/store.json` |
| Native bridge | PowerShell | Win32 P/Invoke via `Add-Type` for SendKeys, WASAPI, windows, SMTC |
| Auth | scrypt (Node `crypto`) | Per-account salt + recovery code |
| PIN (Journal) | SHA-256 | Web Crypto API, 4 digits, global setting |

All system-level work (keystrokes, window control, audio, media session access)
runs through a single `psRun(script)` helper in the main process. The renderer
never touches the OS directly — everything goes over IPC defined in
`electron/preload.js`, exposed as `window.api.*`.

---

## Accounts, Authentication & Recovery

Multiple local accounts are supported. All credentials are hashed with **scrypt**
and stored only on this machine.

**Registration** produces a 12-character **recovery code** (displayed once).
Write this down or save it in a password manager — it's the only way to regain
access if you forget your password **or** your Journal PIN.

**Forgot password?** Click *Recover account* on the login screen. Provide your
username, recovery code, and a new password. Using the recovery code rotates it
— a fresh code is issued after the reset.

**Forgot PIN?** On the Journal's PIN screen, click *Forgot PIN?*. Enter your
account recovery code to clear the PIN. The recovery code itself is not
consumed by this operation (it only rotates on password reset).

**Account data** (preferences, per-user accent color, default page) lives under
`store.accounts[<id>]`. Journal entries, notes, reminders, etc. are global —
they are not partitioned per account.

---

## Dashboard

The home screen. Shows:

- Today's reminders
- Recent journal entries (locked by PIN preview)
- Macro count and quick-run of your most-used macros
- System stats (CPU / memory / disk)
- Quick links to every tool

Customize the default landing page from **Settings → Preferences → Default page**.

---

## Global Search & Command Palette

**Global Search (`Global Search` tab)** — full-text search across notes, journal
entries, reminders, bookmarks, macro names, and hotkey bindings. Results group
by source.

**Command Palette (`Ctrl+K` / `Cmd+K`)** — opens anywhere. Type to fuzzy-match
any component name or action. Use it as the fastest way to jump between pages.

---

## Macros

Macros are named sequences of steps that can be triggered manually, by a
hotkey, or on a schedule.

### Step Types

| Type | Description | Example |
|------|-------------|---------|
| Key Press | Send a keyboard shortcut | `ctrl+alt+.` |
| Type Text | Type text character-by-character | `Hello, world` |
| Delay | Wait in milliseconds | `500` |
| Mouse Click | Click at absolute screen coordinates | `960,540` |
| Repeat Key | Press the same key N times | `ctrl+right` × 10 |
| Launch App | Open an application by path | `C:\Windows\notepad.exe` |

### Key Combo Syntax

Combine modifiers with `+`:
`ctrl+c`, `ctrl+shift+s`, `alt+f4`, `ctrl+alt+.`, `win+d`.

### Loops and Groups

A step can be wrapped in a **loop** with a count. Nested loops are supported.
Use loops for things like "advance 20 slides, pause 1 second between each".

### Window Targeting (Background Macros)

Each macro has an optional **target window**. Options:

- **Active window** — default. Keys go wherever the cursor focus is.
- **Specific window** — pick from the list of open windows. The macro will send
  its keystrokes to that window *without* stealing focus. You can keep working
  in another app while the macro runs in the background.

Background targeting uses Win32 `PostMessage`/`SendMessage` via a small P/Invoke
wrapper in PowerShell. Some applications that bypass the message queue
(full-screen games, DRM'd apps) may ignore background input; fall back to
*Active window* mode for those.

### Running & Stopping

- **Run** — manual play.
- **Stop** — halts execution mid-sequence.
- Status events (`macro:status`, `macro:progress`) stream back to the UI so you
  see progress in real time.

---

## Hotkeys

Bind any macro to a global keyboard shortcut. Works even when Multitool is
minimized.

- Registered via Electron's `globalShortcut` API.
- Conflicts with other apps (e.g. Win+E) will fail silently — pick a different
  combo.
- Binding is live: save the hotkey and it's active immediately.

---

## Text Expander

Type a short **abbreviation** and have it replaced with a longer **snippet** in
any application.

- Runs a background PowerShell watcher that listens for your configured
  triggers and emits replacement keystrokes.
- Start/stop from the Text Expander page (it's off by default).
- Supports multi-line snippets; newlines are sent as `Enter`.
- Date tokens: `{{date}}`, `{{time}}`, `{{datetime}}` expand live.

---

## Auto Clicker

A precision, interval-based clicker.

- Configure clicks-per-second, button (left/right/middle), and optional
  hotkey to start/stop.
- Click location: current mouse position or a fixed coordinate.
- Progress events (`autoclicker:tick`) update the UI counter in real time.

---

## Scheduler

Run macros automatically.

- **Interval** — every N minutes.
- **Daily** — at a specific HH:MM.
- **Once** — at a specific date/time, then the schedule auto-disables.

An event fires on the renderer (`scheduler:ran`) so the Dashboard can show the
last run. Missed runs while the app was closed are not back-filled.

---

## App Launcher

Pin frequently-used apps. Each entry stores a path; clicking launches it via
Electron's `shell.openPath`. Supports drag-and-drop of `.exe`, `.lnk`, and
documents.

---

## Clipboard Manager

Maintains a history of the last 50 clipboard entries.

- Click any item to re-copy it.
- Delete individual items or clear all history.
- Persists across app restarts.

---

## Notebook

Markdown notes with live preview.

- Export individual notes as **PDF** (uses Electron's built-in printToPDF) or
  plain `.md` / `.txt`.
- Full-text search across titles and bodies.
- No folders — use tags in titles (`[work] Meeting notes`) if you need
  organization.

---

## Window Snapper / Window Tools

Lists every top-level window with a visible title.

- **Snap** buttons: left half, right half, top/bottom half, all four
  quarters, and thirds.
- **Activate** — bring a background window to the foreground.
- **Detailed list** — includes process name and window handle, useful for
  targeting macros.

---

## Focus Timer

Pomodoro-style timer with configurable work/break durations. Plays a short
notification when a phase ends.

---

## Volume Control

System volume with **live** slider response — dragging the slider applies
changes immediately (debounced to ~60ms to avoid flooding WASAPI).

- Initial volume is read from the default audio endpoint via WASAPI; a retry
  runs after 500ms if PowerShell's cold-start delayed the first read.
- Quick presets: 0, 10, 25, 50, 75, 100.
- Mute toggle (uses WASAPI's `SetMute`, falls back to the `VK_VOLUME_MUTE` key
  if the WASAPI call is rejected).
- Affects the **system default** device. Changing the default in Windows
  Sound settings switches which device this panel controls.

---

## Color Picker

Click *Pick color* and move your mouse over any pixel on screen. Copies the
hex value to clipboard.

---

## System Monitor

Real-time CPU, memory, disk, and process list. Updated every ~2 seconds via
`systeminformation` running in the main process. The running-process panel
lets you spot runaway apps at a glance.

---

## File Manager

A minimal file browser with copy / move / delete / rename and simple search.
Operations use Node's `fs.promises`; deletes move items to the OS recycle bin
where possible (otherwise a hard delete).

---

## Journal (PIN-Protected)

A private journal behind a 4-digit PIN.

**Setting the PIN** — Settings → Security → *Set journal PIN*. The PIN is
hashed with SHA-256 and stored at `store.settings.pin`. It is **separate** from
your account password.

**Entering the PIN**
- **Desktop** — the PIN screen auto-focuses a hidden input; just start typing.
  Password-manager autofill works. Four dots show how many digits you've
  entered.
- **Mobile (Mobile Remote clients)** — a rounded on-screen keypad is shown
  instead.

**Forgot PIN** — click the *Forgot PIN?* link, enter your account recovery
code, and the PIN is cleared. Set a new one from Settings.

**Entries** are markdown. Full-text search indexes content and date. Nothing
journal-related is ever sent to external services, even with AI Context
enabled (the Journal is excluded by default).

---

## Reminders

Schedule Windows toast notifications.

- One-time or recurring (daily / weekly).
- Native notifications via Electron's `Notification` API.
- Dismiss from the toast or from the Reminders panel.

---

## Chore Planner

A gamified chore tracker.

- Create recurring chores, assign them to household members.
- Mark complete to earn points and unlock achievements.
- Profiles persist per device (not per account).

---

## Media Library

Import photos, videos, and audio clips. Each item stores a thumbnail and
metadata; originals stay wherever they were imported from. Double-click opens
the file in the system default viewer.

---

## Media Player Bar

A persistent bar at the bottom of the app showing whatever's **currently
playing** on your system (Spotify, YouTube in Edge, Windows Media Player,
foobar2000, etc.).

- Reads from Windows' **System Media Transport Controls** (SMTC) via the
  `Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager`
  WinRT API.
- Polls every 2 seconds.
- Controls: previous, play/pause, next.
- Hidden automatically when no media session is active.
- Shows album art when the source provides it.

If you don't see your player, make sure it supports SMTC (most modern
Windows media apps do; some older players and some browser tabs don't).

---

## Browser

An embedded `<webview>` browser.

- Bookmarks toolbar.
- Separate from your system browser (cookies and history don't leak in or
  out).

---

## AI Workstation

Connect to any **OpenAI-compatible** endpoint and chat, run an agent, or
delegate computer-use tasks.

### Modes

- **Chat** — classic back-and-forth. Optional *Context* checkbox lets the
  assistant read from your recent notes and reminders (Journal is excluded).
  Supports image attachments for vision-capable models.
- **Agent CLI** — the model can execute shell commands in a sandboxed
  spawned shell, stream output back, and iterate.
- **Computer Use** — the model takes screenshots, reasons about them, and
  emits click/key actions. Enforces a strict JSON-action schema and refuses
  actions outside the defined set.

### Providers

Tested with:
- OpenAI (`https://api.openai.com`, requires `OPENAI_API_KEY`)
- LM Studio (local, typically `http://localhost:1234`)
- Ollama (local, `http://localhost:11434/v1`)
- Anything else that exposes `/v1/chat/completions`

### Settings

- Temperature, top-p, max tokens
- System prompt (persisted)
- Context sources (toggle per category)
- Response format (text vs. JSON-object where supported)

---

## Mobile Remote

Trigger macros from your phone.

1. On your PC: open **Mobile Remote**, click *Start server*. You'll see a URL
   like `http://192.168.1.50:3847`.
2. Make sure your phone is on the **same Wi-Fi network**.
3. Open that URL in your phone's browser.
4. Tap a macro to run it on your PC.

- Server is HTTP-only on your LAN; no port is exposed to the internet.
- Stop the server when you're done.

---

## Components Tab

Browse every tool in the app with descriptions, grouped by section.

- **Installed** — the catalog of built-in components. Click a card to jump
  straight to that tool.
- **Marketplace** — (coming soon) community-shared plugins.
- **Create** — (coming soon) a visual builder for custom tools.

---

## Settings & Backup

| Setting | Effect |
|---------|--------|
| Accent color | Per-user UI accent |
| Theme | Light / Dark / System |
| Default page | What opens on launch |
| Journal PIN | Set / change / clear (requires account recovery code for clear) |
| Startup behavior | Launch with Windows (via Task Scheduler) |

**Backup → Export** — writes every JSON store to a single `.json` file you pick.
Includes all accounts, macros, notes, journal, reminders, bookmarks, settings.

**Backup → Import** — pick a previous export to restore. **Overwrites** current
data; confirm carefully.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Palette |
| `Ctrl+F` | Focus search in current page (where supported) |
| Per-macro | Configurable via the Hotkeys tab |

---

## Data Storage & Privacy

- **Location**: `%APPDATA%/scotty-multitool/store.json` (Windows).
- **Format**: plain JSON.
- **Network**: no telemetry, no auto-updates, no analytics. The only outbound
  HTTP traffic is:
  - AI Workstation requests to whatever endpoint you've configured.
  - The embedded Browser (acts like a normal browser).
  - The Mobile Remote server (LAN only).
- **Passwords**: scrypt hashed per account. PIN: SHA-256 hashed.
- **Delete everything**: quit the app, delete the `scotty-multitool` folder
  under `%APPDATA%`.

---

## Troubleshooting

**"Macros do nothing" / keystrokes don't register**
- Some apps run as Administrator and will reject input from non-admin
  processes. Run Multitool as Administrator.
- Anti-cheat software will block synthetic input in many games.

**"Volume slider doesn't update on load"**
- PowerShell cold-start can take > 500ms on some machines. The panel retries
  once. If it still doesn't populate, tap the slider to force a read.

**"Media Player Bar is always empty"**
- Your media app doesn't expose SMTC (rare for modern apps). Try a different
  player to confirm.

**"Forgot PIN recovery says invalid code"**
- Codes are case-sensitive; enter exactly what you were shown. Dashes are
  optional.

**"AI Workstation says connection refused"**
- The endpoint URL is wrong or the local LLM isn't running. Check with
  `curl http://localhost:1234/v1/models` (LM Studio) or equivalent.

**"App launches then closes immediately"**
- Check `%APPDATA%/scotty-multitool/crash.log` if present. Likely a
  corrupted `store.json` — back it up, then delete to regenerate.

---

## Development & Testing

**Project structure**

```
electron/         Main process, IPC, PowerShell bridge
src/              React renderer
  components/     One file per tab + shared UI
  styles/app.css  All CSS (design tokens at top)
  utils/          Helpers (markdown, AI attachment context)
mobile/           Phone-side HTML for Mobile Remote
tests/e2e/        Playwright Electron tests
```

**Scripts**

```powershell
npm run dev          # Vite + Electron with hot reload
npm run build        # Production build
npm test             # Playwright E2E (launches Electron)
npm run lint         # Not configured by default
```

**Playwright userData** — tests create a throwaway Electron profile under
`%TEMP%/macrobot-playwright/userdata-*` so your real data is never touched
and the repo stays clean.

**Contributing**

This is a personal project by Scotty, but PRs with well-scoped changes are
welcome. Keep UI additions consistent with the existing design tokens
(`--accent`, `--bg-*`, `--text-*`, `--border`) — no hardcoded colors.

---

*Last updated with the "7 tasks" release: background-window macro targeting,
keyboard-first PIN entry, Forgot PIN flow, live volume slider, SMTC media
player bar, Components tab, and this documentation.*
