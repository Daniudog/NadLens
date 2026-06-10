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

    function draw() {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const points = dataRef.current.length > 0 ? dataRef.current : Array(60).fill(0)
      const max = Math.max(...points, 100)
      const len = points.length

      // Draw grid lines (subtle)
      ctx.strokeStyle = 'rgba(131,110,249,0.08)'
      ctx.lineWidth = 1
      for (let i = 1; i < 4; i++) {
        const y = (H * i) / 4
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // Draw glow fill
      const gradient = ctx.createLinearGradient(0, 0, 0, H)
      gradient.addColorStop(0, 'rgba(131,110,249,0.25)')
      gradient.addColorStop(1, 'rgba(131,110,249,0)')

      ctx.beginPath()
      points.forEach((val, i) => {
        const x = ((i / (len - 1)) * W + offset) % W
        const y = H - (val / max) * (H - 8) - 4
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      // Draw line
      ctx.beginPath()
      ctx.strokeStyle = '#836EF9'
      ctx.lineWidth = 1.5
      ctx.shadowColor = '#836EF9'
      ctx.shadowBlur = 6
      points.forEach((val, i) => {
        const x = (i / (len - 1)) * W
        const y = H - (val / max) * (H - 8) - 4
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0

      // Draw live dot at end
      if (points.length > 0) {
        const lastVal = points[points.length - 1]
        const dotX = W - 2
        const dotY = H - (lastVal / max) * (H - 8) - 4

        // Outer glow
        ctx.beginPath()
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(131,110,249,0.3)'
        ctx.fill()

        // Inner dot
        ctx.beginPath()
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#A78BFA'
        ctx.fill()
      }

      offset = (offset + 0.3) % W
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '48px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(131,110,249,0.04)',
      overflow: 'hidden',
    }}>
      {/* Left label */}
      <div style={{
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 2,
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: status === 'live' ? '#4ADE80' : status === 'error' ? '#F87171' : '#FCD34D',
          boxShadow: status === 'live' ? '0 0 6px #4ADE80' : 'none',
          animation: status === 'live' ? 'pulse-dot 2s ease infinite' : 'none',
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {status === 'live' ? 'LIVE' : status === 'error' ? 'ERROR' : 'CONNECTING'}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={48}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Right TPS readout */}
      <div style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 2,
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--purple-bright)',
          letterSpacing: '-0.02em',
        }}>
          {tps.toLocaleString()}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
        }}>TPS</span>
      </div>

      {/* Center label */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'rgba(131,110,249,0.4)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>Monad Mainnet · Chain 143</span>
      </div>
    </div>
  )
}
