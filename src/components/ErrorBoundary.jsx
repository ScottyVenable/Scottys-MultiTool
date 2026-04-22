import React from 'react'
import { AlertCircle } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    try {
      const log = JSON.parse(localStorage.getItem('macrobot:errors') || '[]')
      log.push({ when: new Date().toISOString(), msg: String(error?.message || error), stack: String(error?.stack || ''), where: info?.componentStack?.slice(0, 500) || '' })
      localStorage.setItem('macrobot:errors', JSON.stringify(log.slice(-50)))
    } catch {}
  }
  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ padding: 24, maxWidth: 600, margin: '40px auto', borderLeft: '3px solid var(--red)' }}>
          <div className="flex items-center gap-8 mb-12"><AlertCircle size={16} color="var(--red)" /><div className="card-title">Something went wrong</div></div>
          <div className="text-sm text-muted mb-12">This page crashed. Other tabs are still working.</div>
          <pre style={{ fontSize: 11, background: 'var(--bg-3)', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 240 }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button className="btn btn-secondary btn-sm mt-12" onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}
