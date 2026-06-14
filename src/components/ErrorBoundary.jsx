import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('NadLens error:', error, info)
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '300px', padding: '40px', textAlign: 'center',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
      }}>
        <AlertTriangle size={32} color="var(--yellow)" style={{ marginBottom: '14px' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Something went wrong
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '380px', lineHeight: 1.6 }}>
          {this.state.error?.message || 'An unexpected error occurred on this page.'}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 20px', background: 'var(--purple)', border: 'none',
            borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    )
  }
}
