import { useEffect, useRef } from 'react'

export default function HeartbeatBar({ tpsHistory, tps, status }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const dataRef = useRef([])

  useEffect(() => {
    if (tpsHistory && tpsHistory.length > 0) {
      dataRef.current = tpsHistory.map(p => p.tps)
    }
  }, [tpsHistory])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let offset = 0

    function resize() {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      const points = dataRef.current.length > 0 ? dataRef.current : Array(60).fill(0)
      const max = Math.max(...points, 50)
      const len = points.length

      // Glow fill
      const gradient = ctx.createLinearGradient(0, 0, 0, H)
      gradient.addColorStop(0, 'rgba(131,110,249,0.2)')
      gradient.addColorStop(1, 'rgba(131,110,249,0)')

      ctx.beginPath()
      points.forEach((val, i) => {
        const x = (i / (len - 1)) * W
        const y = H - (val / max) * (H - 6) - 3
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      // Line
      ctx.beginPath()
      ctx.strokeStyle = '#836EF9'
      ctx.lineWidth = 1.5
      ctx.shadowColor = '#836EF9'
      ctx.shadowBlur = 8
      points.forEach((val, i) => {
        const x = (i / (len - 1)) * W
        const y = H - (val / max) * (H - 6) - 3
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0

      // Live dot
      if (points.length > 0) {
        const lastVal = points[points.length - 1]
        const dotX = W - 2
        const dotY = H - (lastVal / max) * (H - 6) - 3
        ctx.beginPath()
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(131,110,249,0.25)'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#A78BFA'
        ctx.fill()
      }

      offset = (offset + 0.4) % W
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const statusColor = status === 'live' ? '#4ADE80' : status === 'error' ? '#F87171' : '#FCD34D'
  const statusLabel = status === 'live' ? 'LIVE' : status === 'error' ? 'ERROR' : 'CONNECTING'

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '44px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(131,110,249,0.03)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Status */}
      <div style={{
        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', gap: '7px', zIndex: 2,
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: statusColor,
          boxShadow: status === 'live' ? `0 0 6px ${statusColor}` : 'none',
          animation: status === 'live' ? 'pulse-dot 2s ease infinite' : 'none',
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: statusColor, letterSpacing: '0.1em',
        }}>{statusLabel}</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Center label */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2, pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'rgba(131,110,249,0.35)', letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}>NadLens · Monad Mainnet · Chain 143</span>
      </div>

      {/* TPS readout */}
      <div style={{
        position: 'absolute', right: '16px', top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 2, display: 'flex', alignItems: 'baseline', gap: '4px',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '17px',
          fontWeight: 700, color: 'var(--purple-bright)', letterSpacing: '-0.02em',
        }}>{(tps || 0).toLocaleString()}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '9px',
          color: 'var(--text-muted)', letterSpacing: '0.1em',
        }}>TPS</span>
      </div>
    </div>
  )
}
