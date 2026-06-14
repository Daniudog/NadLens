import { shortAddress, formatTime } from '../lib/monad.js'
import { ArrowUpRight } from 'lucide-react'

export default function BlocksTable({ blocks, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 16px' }}>
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '8px' }} />
        ))}
      </div>
    )
  }

  if (!blocks?.length) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>
        WAITING FOR BLOCKS...
      </div>
    )
  }

  const COLS = '80px 70px 90px 1fr 80px 40px'

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: COLS,
        gap: '8px', padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        {['Block', 'Txns', 'Gas Used', 'Utilization', 'Age', ''].map(h => (
          <span key={h} style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>{h}</span>
        ))}
      </div>

      {blocks.map((block, i) => {
        const util = block.gasLimit > 0 ? (block.gasUsed / block.gasLimit) : 0
        const utilPct = (util * 100).toFixed(1)
        const barColor = util > 0.8 ? 'var(--purple-bright)' : util > 0.5 ? 'var(--purple)' : 'rgba(131,110,249,0.4)'

        return (
          <div
            key={block.number}
            className={i === 0 ? 'fade-in' : ''}
            style={{
              display: 'grid', gridTemplateColumns: COLS,
              gap: '8px', padding: '11px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              background: i === 0 ? 'rgba(131,110,249,0.05)' : 'transparent',
              transition: 'background 0.2s',
              alignItems: 'center',
            }}
            onMouseEnter={e => { if (i !== 0) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            onMouseLeave={e => { if (i !== 0) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--purple-bright)', fontWeight: 700 }}>
              #{block.number?.toLocaleString()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>
              {block.txCount?.toLocaleString()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {block.gasUsed ? (block.gasUsed / 1e6).toFixed(2) + 'M' : '—'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${utilPct}%`, height: '100%', borderRadius: '2px', background: barColor, transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', width: '38px', textAlign: 'right' }}>
                {utilPct}%
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              {block.timestamp ? formatTime(block.timestamp) : '—'}
            </span>
            <a
              href={`https://monadvision.com/block/${block.number}`}
              target="_blank" rel="noreferrer"
              style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <ArrowUpRight size={12} />
            </a>
          </div>
        )
      })}
    </div>
  )
}
