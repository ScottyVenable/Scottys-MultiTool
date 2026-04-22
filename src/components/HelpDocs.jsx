import React, { useState } from 'react'
import { HelpCircle, BookOpen, Zap, Keyboard, Type, MousePointer2, Smartphone, Bot, Timer, ChevronRight } from 'lucide-react'

const DOCS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    content: `
## Getting Started with MacroBot

MacroBot is a local automation tool that lets you create keyboard macros, manage hotkeys, expand text, and control your computer automatically — all without any internet connection.

### Quick Start

1. **Create a Macro** — Go to the Macros section and click "New Macro"
2. **Add Steps** — Each step is an action: key press, text input, delay, or click
3. **Bind a Hotkey** — In Hotkeys, bind a global shortcut to trigger your macro
4. **Run It** — Press your hotkey anywhere on your computer

### Key Concepts

**Macros** are sequences of automated actions. They can press keys, type text, wait, click the mouse, or launch apps.

**Hotkeys** are global keyboard shortcuts that trigger macros from any application — even when MacroBot is minimized.

**Text Expander** monitors your typing and replaces abbreviations with full text automatically.

### Example Use Case: Training Videos

If you record training videos and use "Next" button shortcuts:
1. Create a macro with step: KEY \`ctrl+alt+.\`
2. Bind it to a convenient hotkey
3. While presenting, press the hotkey to advance slides
    `
  },
  {
    id: 'macros',
    title: 'Macros',
    icon: Zap,
    content: `
## Macros

Macros are the core feature of MacroBot. Each macro is a named sequence of steps that can be run manually or triggered by a hotkey.

### Step Types

| Type | Description | Example |
|------|-------------|---------|
| Key Press | Sends a keyboard shortcut | \`ctrl+alt+.\` |
| Type Text | Types text as if you typed it | \`Hello World\` |
| Delay | Waits before next step | \`500\` (ms) |
| Mouse Click | Clicks at screen coordinates | \`960,540\` |
| Repeat Key | Repeatedly presses a key | \`ctrl+alt+.\` × 10 |
| Launch App | Opens an application | \`C:\\notepad.exe\` |

### Key Format

Use \`+\` to combine modifiers:
- \`ctrl+c\` — Copy
- \`ctrl+alt+.\` — Ctrl+Alt+Period
- \`f5\` — Function key
- \`enter\`, \`tab\`, \`esc\` — Special keys
- \`ctrl+shift+f1\` — Triple modifier

### Tips

- Add a **Delay** step between actions if apps need time to respond
- Use **Repeat Key** for advancing through slides or items quickly
- Name your macros descriptively so they're easy to find
    `
  },
  {
    id: 'hotkeys',
    title: 'Hotkeys',
    icon: Keyboard,
    content: `
## Global Hotkeys

Hotkeys let you trigger macros from any application by pressing a key combination, even when MacroBot is not in focus.

### Hotkey Format

MacroBot uses Electron's global shortcut format:

- \`CommandOrControl+Shift+F1\`
- \`Alt+F2\`
- \`CommandOrControl+Alt+P\`

**CommandOrControl** maps to Ctrl on Windows.

### Recording a Hotkey

1. Click **Record** in the hotkey editor
2. Press your desired key combination
3. The combo is captured automatically
4. Select which macro to trigger

### Best Practices

- Avoid system shortcuts like \`Ctrl+Alt+Del\` or \`Alt+Tab\`
- Use function keys (\`F9\`–\`F12\`) for quick access
- Use \`CommandOrControl+Alt\` combinations for safety
- Test each hotkey after creating to confirm it works

### Disabling Hotkeys

Toggle the switch next to any hotkey to temporarily disable it without deleting it.
    `
  },
  {
    id: 'text-expander',
    title: 'Text Expander',
    icon: Type,
    content: `
## Text Expander

Text Expander lets you define short abbreviations that automatically expand to longer text when typed.

### How It Works

1. Define an abbreviation (e.g., \`;sig\`)
2. Define the expansion (e.g., \`Best regards,\\nScott\`)
3. When you type \`;sig\` followed by Space or Enter, it replaces with the full text

### Abbreviation Tips

- Prefix with \`;\` or \`;;\` to avoid accidental triggers
- Use all-lowercase for consistency
- Keep abbreviations short (3–6 characters)

### Common Use Cases

| Abbreviation | Expansion |
|---|---|
| \`;sig\` | Your email signature |
| \`;addr\` | Your mailing address |
| \`;phone\` | Your phone number |
| \`;ty\` | "Thank you for your message..." |
| \`;mt\` | Current meeting template |

### Integration with Macros

Create a macro with a **Type Text** step to programmatically insert expanded text in any context, not just keyboard triggers.
    `
  },
  {
    id: 'auto-clicker',
    title: 'Auto Clicker',
    icon: MousePointer2,
    content: `
## Auto Clicker

The Auto Clicker automatically clicks at a screen position at a set interval.

### Configuration

- **X, Y Coordinates** — The screen position to click (pixels from top-left)
- **Interval** — Time between clicks (50ms to 10 seconds)
- **Max Clicks** — Stop after N clicks (0 = unlimited)

### Finding Coordinates

To find the coordinates of a button:
1. Open Windows Snipping Tool or hover over the target
2. Note the position shown in the title bar or taskbar
3. Or use Task Manager > Performance to see screen resolution

### 3-Second Countdown

When you press Start, a 3-second countdown begins. Use this time to:
1. Click outside MacroBot to switch to your target window
2. Position your cursor if needed
3. The auto-clicker then clicks at your configured coordinates

### Safety

- Always keep the Stop button accessible (use the hotkey or taskbar)
- Set a Max Clicks limit to prevent runaway clicking
- The auto-clicker pauses if the target window changes focus
    `
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    icon: Bot,
    content: `
## AI Assistant

The AI Assistant helps you create macros, suggests automations, and answers questions about productivity shortcuts.

### LM Studio (Local, Free)

The recommended setup — no API key, no internet required:

1. Download LM Studio from lmstudio.ai
2. Download a model (e.g., Mistral 7B, LLaMA 3)
3. Start the server (Local Server tab, click Start)
4. In MacroBot Settings, set provider to LM Studio, URL to \`http://localhost:1234\`

### API Key Providers

If you prefer a cloud provider:
- **OpenAI** — Set your \`sk-...\` key
- **Anthropic** — Set your Anthropic API key
- **Custom** — Any OpenAI-compatible endpoint

### What to Ask

- "Create a macro to save and close files"
- "What's the shortcut to take a screenshot?"
- "Build a macro for my morning routine tasks"
- "Suggest hotkeys for VS Code development"
    `
  },
  {
    id: 'mobile-remote',
    title: 'Mobile Remote',
    icon: Smartphone,
    content: `
## Mobile Remote Control

The mobile remote lets you control MacroBot from your smartphone or tablet over your local WiFi network.

### Setup

1. Go to Mobile Remote → enable the server toggle
2. Note the IP address shown (e.g., \`http://192.168.1.100:8765\`)
3. On your phone, open a browser and navigate to that URL
4. The mobile control panel loads — no app installation needed!

### Features on Mobile

- View all your macros
- Tap to run any macro remotely
- See real-time system status (CPU/RAM)
- Monitor running macros

### Requirements

- Phone and computer must be on the **same WiFi network**
- MacroBot must be running on your desktop
- The mobile server must be enabled

### Security

The server only accepts connections from your local network.
There is no authentication — keep your WiFi network private.
    `
  },
  {
    id: 'focus-timer',
    title: 'Focus Timer',
    icon: Timer,
    content: `
## Focus Timer (Pomodoro)

The Focus Timer helps you maintain productivity using the Pomodoro Technique — alternating focus sessions with short breaks.

### The Pomodoro Technique

1. Work for 25 minutes (one "pomodoro")
2. Take a 5-minute short break
3. Repeat 4 times
4. Take a 15-minute long break
5. Reset and repeat

### Presets

| Preset | Focus | Short Break | Long Break |
|--------|-------|-------------|------------|
| Pomodoro | 25m | 5m | 15m |
| Short | 15m | 3m | 10m |
| Deep Work | 50m | 10m | 20m |
| Quick | 5m | 1m | 5m |

### Customizing

Use the Settings panel within the timer to adjust all durations and the number of sessions before a long break.

### Tips

- Close distracting apps during focus sessions
- Use the Auto Clicker or macros to set up your workspace at the start of each session
- The session counter shows your progress toward a long break
    `
  },
  {
    id: 'modular',
    title: 'Adding New Tools',
    icon: HelpCircle,
    content: `
## Adding New Tools (Modular Architecture)

MacroBot is designed to be extended. Here's how to add a new feature panel:

### Steps to Add a Module

**1. Create your component:**
\`\`\`
src/components/MyNewTool.jsx
\`\`\`

**2. Add it to App.jsx:**
\`\`\`javascript
import MyNewTool from './components/MyNewTool'

// In the NAV array:
{ id: 'my-tool', label: 'My Tool', icon: SomeIcon, section: 'tools' }

// In PAGE_MAP:
'my-tool': MyNewTool,
\`\`\`

**3. Add IPC handlers (if needed) in electron/main.js:**
\`\`\`javascript
ipcMain.handle('mytool:action', (_, params) => {
  // Your logic here
  return result
})
\`\`\`

**4. Expose it via preload.js:**
\`\`\`javascript
myTool: {
  action: (params) => ipcRenderer.invoke('mytool:action', params)
}
\`\`\`

**5. Add docs** by adding an entry to the DOCS array in HelpDocs.jsx.

### Ideas for New Tools

- **Window Snapper** — Snap windows to grid positions
- **Scheduled Tasks** — Run macros on a timer/schedule
- **Screen Ruler** — Measure screen elements
- **Color Picker** — Pick colors from screen
- **Script Runner** — Execute PowerShell/batch scripts
- **File Watcher** — Trigger macros when files change
- **Form Filler** — Auto-fill web forms
- **Mouse Recorder** — Record mouse movements
    `
  },
]

function renderContent(md) {
  const parts = md.trim().split('\n')
  const elements = []
  let inPre = false
  let preContent = []
  let key = 0

  for (const line of parts) {
    if (line.startsWith('```')) {
      if (inPre) {
        elements.push(<pre key={key++}><code>{preContent.join('\n')}</code></pre>)
        preContent = []
        inPre = false
      } else {
        inPre = true
      }
      continue
    }
    if (inPre) { preContent.push(line); continue }

    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++}>{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++}>{line.slice(4)}</h3>)
    } else if (line.startsWith('- ')) {
      elements.push(<li key={key++} dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />)
    } else if (line.startsWith('| ')) {
      // Skip table lines (simplified)
    } else if (line.startsWith('1. ') || line.match(/^\d+\./)) {
      elements.push(<li key={key++} dangerouslySetInnerHTML={{ __html: processInline(line.replace(/^\d+\.\s*/, '')) }} />)
    } else if (line.trim() === '') {
      elements.push(<br key={key++} />)
    } else {
      elements.push(<p key={key++} dangerouslySetInnerHTML={{ __html: processInline(line) }} />)
    }
  }
  return elements
}

function processInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

export default function HelpDocs() {
  const [activeDoc, setActiveDoc] = useState('getting-started')
  const doc = DOCS.find(d => d.id === activeDoc)

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Help & Documentation</div>
          <div className="page-subtitle">Interactive guides for all MacroBot features</div>
        </div>
      </div>

      <div className="flex gap-20" style={{ alignItems: 'flex-start' }}>
        {/* TOC */}
        <div className="card" style={{ width: 200, minWidth: 200, position: 'sticky', top: 0 }}>
          <div className="card-title mb-10"><BookOpen size={13} className="card-title-icon" /> Contents</div>
          <div className="help-toc">
            {DOCS.map(d => {
              const Icon = d.icon
              return (
                <div
                  key={d.id}
                  className={`help-toc-item flex items-center gap-7`}
                  style={{ fontWeight: activeDoc === d.id ? 600 : undefined, color: activeDoc === d.id ? 'var(--accent-h)' : undefined, background: activeDoc === d.id ? 'var(--accent-dim)' : undefined }}
                  onClick={() => setActiveDoc(d.id)}
                >
                  <Icon size={12} style={{ flexShrink: 0 }} />
                  {d.title}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="help-content flex-1">
          <div className="help-article animate-in" key={activeDoc}>
            {doc && <div className="help-article">{renderContent(doc.content)}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
