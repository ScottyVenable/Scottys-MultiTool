import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { StandaloneCLI } from './components/AIAssistant'
import './styles/app.css'

// Detached-window routes: electron can open index.html#cli for a dedicated
// CLI window. Everything else loads the full app.
const hash = (typeof window !== 'undefined' && window.location.hash) || ''
const route = hash.replace(/^#/, '').split('?')[0]

const Root = route === 'cli' ? <StandaloneCLI /> : <App />
ReactDOM.createRoot(document.getElementById('root')).render(Root)
