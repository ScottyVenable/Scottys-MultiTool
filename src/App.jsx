import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Zap, Keyboard, Type, MousePointer2,
  Clipboard, Timer, Monitor, Bot, Smartphone, Settings, HelpCircle,
  Minus, Square, X, Rocket, StickyNote, AppWindow, CalendarClock, Volume2, Wrench, Pipette,
  BookOpen, BookHeart, Bell, FolderOpen, Trophy, Globe, Image as ImageIcon, Search,
  User as UserIcon, LogOut, ChevronUp, LayoutGrid
} from 'lucide-react'
import Dashboard from './components/Dashboard'
import MacroManager from './components/MacroManager'
import HotkeyManager from './components/HotkeyManager'
import TextExpander from './components/TextExpander'
import AutoClicker from './components/AutoClicker'
import ClipboardManager from './components/ClipboardManager'
import FocusTimer from './components/FocusTimer'
import SystemMonitor from './components/SystemMonitor'
import AIAssistant from './components/AIAssistant'
import MobileRemote from './components/MobileRemote'
import AppSettings from './components/AppSettings'
import HelpDocs from './components/HelpDocs'
import AppLauncher from './components/AppLauncher'
import Notebook from './components/Notebook'
import WindowTools from './components/WindowTools'
import MacroScheduler from './components/MacroScheduler'
import VolumeControl from './components/VolumeControl'
import ColorPicker from './components/ColorPicker'
import Journal from './components/Journal'
import Reminders from './components/Reminders'
import FileManager from './components/FileManager'
import ChorePlanner from './components/ChorePlanner'
import Browser from './components/Browser'
import MediaLibrary from './components/MediaLibrary'
import GlobalSearch from './components/GlobalSearch'
import ComponentsPage from './components/ComponentsPage'
import MediaPlayerBar from './components/MediaPlayerBar'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { AIAttachmentProvider } from './utils/aiAttachment'
import CommandPalette from './components/CommandPalette'
import { AuthProvider, useAuth } from './components/Auth/AuthContext'
import AuthGate from './components/Auth/AuthGate'

const NAV = [
  { id: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard, section: 'main' },
  { id: 'search',        label: 'Global Search',   icon: Search,          section: 'main' },
  { id: 'macros',        label: 'Macros',          icon: Zap,             section: 'automation' },
  { id: 'hotkeys',       label: 'Hotkeys',         icon: Keyboard,        section: 'automation' },
  { id: 'text-expander', label: 'Text Expander',   icon: Type,            section: 'automation' },
  { id: 'auto-clicker',  label: 'Auto Clicker',    icon: MousePointer2,   section: 'automation' },
  { id: 'scheduler',     label: 'Scheduler',       icon: CalendarClock,   section: 'automation' },
  { id: 'app-launcher',  label: 'App Launcher',    icon: Rocket,          section: 'tools' },
  { id: 'clipboard',     label: 'Clipboard',       icon: Clipboard,       section: 'tools' },
  { id: 'notebook',      label: 'Notebook',        icon: BookOpen,        section: 'tools' },
  { id: 'window-tools',  label: 'Window Snapper',  icon: AppWindow,       section: 'tools' },
  { id: 'timer',         label: 'Focus Timer',     icon: Timer,           section: 'tools' },
  { id: 'volume',        label: 'Volume Control',  icon: Volume2,         section: 'tools' },
  { id: 'color-picker',  label: 'Color Picker',    icon: Pipette,         section: 'tools' },
  { id: 'system',        label: 'System Monitor',  icon: Monitor,         section: 'tools' },
  { id: 'file-manager',  label: 'File Manager',    icon: FolderOpen,      section: 'tools' },
  { id: 'journal',       label: 'Journal',         icon: BookHeart,       section: 'personal' },
  { id: 'reminders',     label: 'Reminders',       icon: Bell,            section: 'personal' },
  { id: 'chores',        label: 'Chore Planner',   icon: Trophy,          section: 'personal' },
  { id: 'media',         label: 'Media Library',   icon: ImageIcon,       section: 'personal' },
  { id: 'browser',       label: 'Browser',         icon: Globe,           section: 'connect' },
  { id: 'ai',            label: 'AI Workstation',  icon: Bot,             section: 'connect' },
  { id: 'mobile',        label: 'Mobile Remote',   icon: Smartphone,      section: 'connect' },
  { id: 'components',    label: 'Components',      icon: LayoutGrid,      section: 'config' },
  { id: 'settings',      label: 'Settings',        icon: Settings,        section: 'config' },
  { id: 'help',          label: 'Help',            icon: HelpCircle,      section: 'config' },
]

const SECTIONS = [
  { id: 'main',       label: null },
  { id: 'automation', label: 'Automation' },
  { id: 'tools',      label: 'Tools' },
  { id: 'personal',   label: 'Personal' },
  { id: 'connect',    label: 'Connect' },
  { id: 'config',     label: 'Config' },
]

const PAGE_MAP = {
  dashboard: Dashboard,
  search: GlobalSearch,
  macros: MacroManager,
  hotkeys: HotkeyManager,
  'text-expander': TextExpander,
  'auto-clicker': AutoClicker,
  scheduler: MacroScheduler,
  'app-launcher': AppLauncher,
  clipboard: ClipboardManager,
  notebook: Notebook,
  'window-tools': WindowTools,
  timer: FocusTimer,
  volume: VolumeControl,
  'color-picker': ColorPicker,
  system: SystemMonitor,
  'file-manager': FileManager,
  journal: Journal,
  reminders: Reminders,
  chores: ChorePlanner,
  media: MediaLibrary,
  browser: Browser,
  ai: AIAssistant,
  mobile: MobileRemote,
  components: ComponentsPage,
  settings: AppSettings,
  help: HelpDocs,
}

function SidebarUser({ onNavigate }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return null
  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase()
  return (
    <div className="sidebar-user" style={{ position: 'relative' }}>
      {open && (
        <div className="sidebar-user-menu" role="menu">
          <button className="sidebar-user-menu-item" onClick={() => { setOpen(false); onNavigate('settings') }}>
            <UserIcon size={13} /> Profile & Settings
          </button>
          <button className="sidebar-user-menu-item danger" onClick={async () => { setOpen(false); await logout() }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}
      <button className="sidebar-user-btn" onClick={() => setOpen(v => !v)} aria-haspopup="true" aria-expanded={open}>
        <div className="sidebar-user-avatar">
          {user.avatarDataUrl ? <img src={user.avatarDataUrl} alt="" /> : initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-user-name">{user.displayName || user.username}</div>
          <div className="sidebar-user-sub">@{user.username}</div>
        </div>
        <ChevronUp size={12} style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
    </div>
  )
}

function MainApp() {
  const { user } = useAuth()
  const [page, setPage] = useState(() => user?.preferences?.defaultPage || 'dashboard')
  const [macroCounts, setMacroCounts] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.macros.list().then(m => setMacroCounts(m.length)).catch(() => {})
  }, [page])

  // Apply per-user accent + theme whenever the active user changes
  useEffect(() => {
    if (user?.preferences?.accentColor) {
      document.documentElement.style.setProperty('--accent', user.preferences.accentColor)
    } else if (isElectron) {
      window.api.store.get('settings').then(s => {
        if (s?.accentColor) document.documentElement.style.setProperty('--accent', s.accentColor)
      }).catch(() => {})
    }
    if (user?.preferences?.defaultPage) setPage(user.preferences.defaultPage)
  }, [user?.id])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const PageComponent = PAGE_MAP[page] || Dashboard

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wrench size={14} strokeWidth={2.5} />
          </div>
          <span className="sidebar-logo-text">Multitool</span>
        </div>

        <nav className="sidebar-nav">
          {SECTIONS.map(section => {
            const items = NAV.filter(n => n.section === section.id)
            return (
              <div key={section.id}>
                {section.label && <div className="nav-section-label">{section.label}</div>}
                {items.map(item => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className={`nav-item ${page === item.id ? 'active' : ''}`}
                      onClick={() => setPage(item.id)}
                    >
                      <Icon size={15} className="nav-icon" />
                      {item.label}
                      {item.id === 'macros' && macroCounts > 0 && (
                        <span className="nav-badge">{macroCounts}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <SidebarUser onNavigate={setPage} />

        <div className="sidebar-bottom">
          <div className="text-xs text-muted text-center" style={{ padding: '4px 0' }}>
            Scotty's Multitool v1.0
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{NAV.find(n => n.id === page)?.label}</span>
          </div>
          <div className="topbar-right">
            <button className="win-btn" onClick={() => isElectron && window.api.window.minimize()}><Minus size={12} /></button>
            <button className="win-btn" onClick={() => isElectron && window.api.window.maximize()}><Square size={11} /></button>
            <button className="win-btn close" onClick={() => isElectron && window.api.window.close()}><X size={12} /></button>
          </div>
        </header>

        <main className="content">
          <ErrorBoundary key={page}>
            <PageComponent onNavigate={setPage} />
          </ErrorBoundary>
        </main>
        <MediaPlayerBar />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={setPage} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AIAttachmentProvider>
          <AuthGate>
            <MainApp />
          </AuthGate>
        </AIAttachmentProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
