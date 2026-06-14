import { useState } from 'react'
import { X, ExternalLink, Zap, DollarSign, Users, Code } from 'lucide-react'

export default function GrantsBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('nadlens_grants_dismissed') === '1' } catch { return false }
  })

  function dismiss() {
    try { localStorage.setItem('nadlens_grants_dismissed', '1') } catch {}
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div style={{
      margin: '0 0 20px',
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(135deg, rgba(91,71,212,0.15) 0%, rgba(74,222,128,0.08) 100%)',
      border: '1px solid rgba(131,110,249,0.3)',
      padding: '18px 20px',
      position: 'relative',
      animation: 'fade-in 0.4s ease',
    }}>
      {/* Dismiss */}
      <button onClick={dismiss} style={{
        position: 'absolute', top: '12px', right: '12px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', display: 'flex', padding: '2px',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <X size={14} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        {/* Icon */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #5B47D4, #4ADE80)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <DollarSign size={18} color="white" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Monad Foundation Grants — Build on Monad
            </span>
            <span style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.06em' }}>
              OPEN
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px' }}>
            The Monad Momentum program funds builders shipping native infrastructure — analytics platforms, tooling, DeFi primitives. Projects like NadLens are exactly what the foundation supports.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[
              { icon: DollarSign, text: 'Up to $50K grants' },
              { icon: Users,      text: 'Ecosystem support' },
              { icon: Zap,        text: 'Fast decisions' },
              { icon: Code,       text: 'Dev resources' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <item.icon size={11} color="var(--purple-bright)" />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a
              href="https://www.monad.xyz/ecosystem"
              target="_blank" rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '8px 16px',
                background: 'var(--purple)',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Apply for Grant <ExternalLink size={11} />
            </a>
            <a
              href="https://docs.monad.xyz"
              target="_blank" rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--border-bright)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)', fontSize: '12px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              Monad Docs <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
