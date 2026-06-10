import { shortAddress, formatTime } from '../lib/monad.js'

export default function BlocksTable({ blocks, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '8px' }} />
        ))}
      </div>
    )
  }

  if (!blocks?.length) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        letterSpacing: '0.1em',
      }}>
        WAITING FOR BLOCKS...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
        padding: '6px 12px',
        marginBottom: '4px',
      }}>
        {['Block', 'Txns', 'Gas Used', 'Utilization', 'Age'].map(h => (
          <span key={h} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>{h}</span>
        ))}
      </div>

      {blocks.map((block, i) => {
        const utilization = block.gasLimit > 0
          ? ((block.gasUsed / block.gasLimit) * 100).toFixed(1)
          : '0'
        const utilizationNum = parseFloat(utilization)

        return (
          <div
            key={block.number}
            className={i === 0 ? 'fade-in' : ''}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
              padding: '10px 12px',
              borderRadius: '8px',
              background: i === 0 ? 'rgba(131,110,249,0.06)' : 'transparent',
              border: `1px solid ${i === 0 ? 'rgba(131,110,249,0.15)' : 'transparent'}`,
              transition: 'background 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              if (i !== 0) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
            }}
            onMouseLeave={e => {
              if (i !== 0) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--purple-bright)',
              fontWeight: 700,
            }}>
              #{block.number?.toLocaleString()}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--text-primary)',
            }}>
              {block.txCount?.toLocaleString()}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}>
              {block.gasUsed ? (block.gasUsed / 1e6).toFixed(2) + 'M' : '—'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--border)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${utilization}%`,
                  height: '100%',
                  borderRadius: '2px',
                  background: utilizationNum > 80 ? '#A78BFA' : utilizationNum > 50 ? '#836EF9' : 'rgba(131,110,249,0.5)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>{utilization}%</span>
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}>
              {block.timestamp ? formatTime(block.timestamp) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
