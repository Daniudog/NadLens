import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const animRef = useRef(null)

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) return
    const start = prevRef.current ?? 0
    const end = value
    const duration = 700
    const startTime = performance.now()

    if (animRef.current) cancelAnimationFrame(animRef.current)

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current))
      if (progress < 1) animRef.current = requestAnimationFrame(tick)
      else prevRef.current = end
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [value, decimals])

  if (display === null || display === undefined || isNaN(display)) return <span>—</span>
  const formatted = typeof display === 'number'
    ? (decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString())
    : display
  return <span>{prefix}{formatted}{suffix}</span>
}

export default function StatCard({
  label, value, unit, sub, accent,
  loading, icon: Icon, change, changeLabel,
  prefix = '', suffix = '', decimals = 0,
  size = 'normal', // 'normal' | 'large'
  onClick,
}) {
  const isPositive = change > 0
  const isNegative = change < 0
  const changeColor = isPositive ? 'var(--green)' : isNegative ? 'var(--red)' : 'var(--text-muted)'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: size === 'large' ? '24px 28px' : '18px 20px',
        transition: 'border-color 0.2s, background 0.2s',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-bright)'
        if (onClick) e.currentTarget.style.background = 'var(--bg-card-hover)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--bg-card)'
      }}
    >
      {/* Top accent line */}
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${accent} 40%, ${accent} 60%, transparent 100%)`,
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>{label}</span>
        {Icon && <Icon size={13} color="var(--text-muted)" />}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: change !== undefined ? '8px' : 0 }}>
        {loading ? (
          <div className="skeleton" style={{ width: '70px', height: size === 'large' ? '36px' : '28px' }} />
        ) : (
          <>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: size === 'large' ? '32px' : '26px',
              fontWeight: 700,
              color: accent || 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              animation: 'count-up 0.4s ease',
            }}>
              {typeof value === 'number'
                ? <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
                : (value ?? '—')}
            </span>
            {unit && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
              }}>{unit}</span>
            )}
          </>
        )}
      </div>

      {/* Change + Sub row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        {sub && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            {sub}
          </div>
        )}
        {change !== undefined && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {isPositive ? <TrendingUp size={11} color={changeColor} /> :
             isNegative ? <TrendingDown size={11} color={changeColor} /> :
             <Minus size={11} color={changeColor} />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: changeColor, fontWeight: 600 }}>
              {isPositive ? '+' : ''}{change?.toFixed(1)}%
            </span>
            {changeLabel && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', marginLeft: '2px' }}>
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
