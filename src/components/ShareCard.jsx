import { useState, useRef } from 'react'
import { Share2, Download, X, Twitter, Copy, CheckCircle } from 'lucide-react'

// Generates a shareable text card summary — canvas-based
function generateShareText(type, data) {
  if (type === 'chain') {
    return {
      title: 'NadLens · Monad Chain Snapshot',
      lines: [
        `🔴 Live TPS: ${data.tps?.toLocaleString() || '—'} tx/s`,
        `📦 Block: #${data.blockNumber?.toLocaleString() || '—'}`,
        `⛽ Gas: ${data.gasPrice || '—'} Gwei`,
        `📊 TVL: ${data.tvl || '—'}`,
        '',
        'nadlens.vercel.app · Monad Mainnet',
      ],
      color: '#836EF9',
    }
  }
  if (type === 'wallet') {
    return {
      title: 'NadLens · Wallet Snapshot',
      lines: [
        `💜 Address: ${data.address?.slice(0, 10)}...${data.address?.slice(-6)}`,
        `💰 Balance: ${data.balance?.toLocaleString()} MON`,
        `📨 Transactions: ${data.txCount?.toLocaleString()}`,
        `🏷 Status: ${data.classification || 'Unknown'}`,
        '',
        'nadlens.vercel.app · Monad Mainnet',
      ],
      color: '#4ADE80',
    }
  }
  return null
}

function ShareModal({ type, data, onClose }) {
  const [copied, setCopied] = useState(false)
  const card = generateShareText(type, data)
  if (!card) return null

  const shareText = card.lines.filter(Boolean).join('\n')
  const tweetText = encodeURIComponent(card.lines.slice(0, 4).join('\n') + '\n\nTrack Monad live → nadlens.vercel.app')

  async function copyText() {
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-bright)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'fade-in 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600 }}>Share Snapshot</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Preview card */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #07050F 0%, #1A1630 100%)',
            border: `1px solid ${card.color}40`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: `0 0 24px ${card.color}20`,
          }}>
            {/* NadLens logo row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, #5B47D4, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                  <circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.8" fill="none"/>
                  <circle cx="8" cy="8" r="2.2" fill="white"/>
                  <line x1="11.8" y1="11.8" x2="16" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: '#F0EEFF' }}>NadLens</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: card.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Monad Analytics</span>
            </div>

            {/* Stats */}
            {card.lines.filter(Boolean).slice(0, -1).map((line, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#C4B8FF', marginBottom: '6px', lineHeight: 1.5 }}>
                {line}
              </div>
            ))}

            {/* Footer */}
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${card.color}30`, fontFamily: 'var(--font-mono)', fontSize: '9px', color: card.color, letterSpacing: '0.1em' }}>
              nadlens.vercel.app · Monad Mainnet · Chain 143
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={`https://twitter.com/intent/tweet?text=${tweetText}`}
              target="_blank" rel="noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px', background: '#1DA1F2',
                borderRadius: '8px', color: '#fff', textDecoration: 'none',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Twitter size={14} /> Share on X
            </a>
            <button onClick={copyText} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px',
              background: copied ? 'var(--green-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: '8px',
              color: copied ? 'var(--green)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Trigger button — embeds in any page
export default function ShareCard({ type, data, label = 'Share' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '6px 12px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '7px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)', fontSize: '12px',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Share2 size={12} /> {label}
      </button>
      {open && <ShareModal type={type} data={data} onClose={() => setOpen(false)} />}
    </>
  )
}
