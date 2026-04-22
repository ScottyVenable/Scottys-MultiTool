import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Zap, Keyboard, Type, MousePointer2,
  Clipboard, Timer, Monitor, Bot, Smartphone, Settings, HelpCircle,
  Minus, Square, X, Rocket, StickyNote, AppWindow, CalendarClock, Volume2, Wrench, Pipette,
  BookOpen, BookHeart, Bell, FolderOpen, Trophy, Globe, Image as ImageIcon, Search,
  User as UserIcon, LogOut, ChevronUp, LayoutGrid, Sparkles, Code2, Users, MessageSquare, ShoppingBag
} from 'lucide-react'
import WelcomeScreen from './components/WelcomeScreen'
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
import IDE from './components/IDE'
import MediaPlayerBar from './components/MediaPlayerBar'
import StatusBar from './components/StatusBar'
import { ToastProvider } from './components/Toast'
import { NotificationsProvider } from './components/NotificationsContext'
import NotificationsCenter from './components/NotificationsCenter'
import { CurrencyProvider } from './components/CurrencyContext'
import CoinsPill from './components/CoinsPill'
import CoinsShop from './components/CoinsShop'
import FriendsPanel from './components/FriendsPanel'
import MessagesCenter from './components/MessagesCenter'
import FocusWithFriends from './components/FocusWithFriends'
import { FriendsProvider } from './components/FriendsContext'
import ErrorBoundary from './components/ErrorBoundary'
import { AIAttachmentProvider } from './utils/aiAttachment'
import CommandPalette from './components/CommandPalette'
import { AuthProvider, useAuth } from './components/Auth/AuthContext'
import AuthGate from './components/Auth/AuthGate'

const NAV = [
  { id: 'welcome',       label: 'Welcome',         icon: Sparkles,        section: 'main' },
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
  { id: 'ide',           label: 'IDE',             icon: Code2,           section: 'tools' },
  { id: 'journal',       label: 'Journal',         icon: BookHeart,       section: 'personal' },
  { id: 'reminders',     label: 'Reminders',       icon: Bell,            section: 'personal' },
  { id: 'chores',        label: 'Chore Planner',   icon: Trophy,          section: 'personal' },
  { id: 'media',         label: 'Media Library',   icon: ImageIcon,       section: 'personal' },
  { id: 'friends',       label: 'Friends',         icon: Users,           section: 'connect' },
  { id: 'messages',      label: 'Messages',        icon: MessageSquare,   section: 'connect' },
  { id: 'focus-friends', label: 'Focus Together',  icon: Timer,           section: 'connect' },
  { id: 'browser',       label: 'Browser',         icon: Globe,           section: 'connect' },
  { id: 'ai',            label: 'AI Workstation',  icon: Bot,             section: 'connect' },
  { id: 'mobile',        label: 'Mobile Remote',   icon: Smartphone,      section: 'connect' },
  { id: 'components',    label: 'Components',      icon: LayoutGrid,      section: 'config' },
  { id: 'shop',          label: 'Rewards Shop',    icon: ShoppingBag,     section: 'config' },
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
  welcome: WelcomeScreen,
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
  ide: IDE,
  journal: Journal,
  reminders: Reminders,
  chores: ChorePlanner,
  media: MediaLibrary,
  friends: FriendsPanel,
  messages: MessagesCenter,
  'focus-friends': FocusWithFriends,
  browser: Browser,
  ai: AIAssistant,
  mobile: MobileRemote,
  components: ComponentsPage,
  shop: CoinsShop,
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
  const [page, setPage] = useState(() => user?.preferences?.defaultPage || 'welcome')
  const [macroCounts, setMacroCounts] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const isElectron = !!window.api

  useEffect(() => {
    if (!isElectron) return
    window.api.macros.list().then(m => setMacroCounts(m.length)).catch(() => {})
  }, [page])

  // If Windows launched the app with a file path ("Open with Multitool"),
  // route to the File Manager once on mount. Backend pops the value so this
  // only fires on cold start.
  useEffect(() => {
    if (!isElectron || !window.api.shellIntegration?.getLaunchFile) return
    window.api.shellIntegration.getLaunchFile().then(f => {
      if (f) {
        try { sessionStorage.setItem('launchFile', f) } catch {}
        setPage('file-manager')
      }
    }).catch(() => {})
  }, [])

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
          <div className="sidebar-logo-icon" aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
              <path d="M78 62 a34 34 0 1 0 48 48 L176 160 l18 -18 L144 92 a34 34 0 0 0 -48 -48 a34 34 0 0 0 -28 12 l22 22 a14 14 0 1 1 -20 20 l-22 -22 a34 34 0 0 0 0 16 z" fill="currentColor" stroke="none"/>
              <path d="M142 168 l24 24 l-24 24 M166 168 l24 24 l-24 24"/>
            </svg>
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
            <CoinsPill />
            <NotificationsCenter onNavigate={setPage} />
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
        <StatusBar />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={setPage} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationsProvider>
          <CurrencyProvider>
            <FriendsProvider>
              <AIAttachmentProvider>
                <AuthGate>
                  <MainApp />
                </AuthGate>
              </AIAttachmentProvider>
            </FriendsProvider>
          </CurrencyProvider>
        </NotificationsProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
