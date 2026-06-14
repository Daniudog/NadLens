import { useEffect, useRef, useState } from 'react'
import { useChainData } from '../hooks/useChainData.js'
import { formatCount, formatTime } from '../lib/monad.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import { Zap, Cpu, Activity } from 'lucide-react'

// Parallel execution visualizer
// Monad processes tx in parallel lanes — we simulate visible lanes from block data
function ParallelLanes({ blocks, tps }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particlesRef = useRef([])
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const LANES = 8
    const LANE_H = canvas.height / LANES
    const COLORS = [
      '#836EF9','#A78BFA','#4ADE80','#60A5FA',
      '#FCD34D','#FB923C','#F472B6','#34D399',
    ]

    function spawnParticles(count) {
      for (let i = 0; i < Math.min(count, 20); i++) {
        const lane = Math.floor(Math.random() * LANES)
        particlesRef.current.push({
          x: 0,
          y: (lane + 0.5) * LANE_H,
          lane,
          speed: 2 + Math.random() * 4,
          size: 2 + Math.random() * 3,
          color: COLORS[lane],
          alpha: 0.8 + Math.random() * 0.2,
          life: 1,
        })
      }
    }

    function draw() {
      frameRef.current++
      const W = canvas.width
      const H = canvas.height

      // Fade trail
      ctx.fillStyle = 'rgba(7,5,15,0.18)'
      ctx.fillRect(0, 0, W, H)

      // Lane separators
      for (let i = 1; i < LANES; i++) {
        ctx.strokeStyle = 'rgba(131,110,249,0.07)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 8])
        ctx.beginPath()
        ctx.moveTo(0, i * LANE_H)
        ctx.lineTo(W, i * LANE_H)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // Lane labels on left
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = 'rgba(131,110,249,0.25)'
        ctx.font = '9px Space Mono, monospace'
        ctx.fillText(`L${i + 1}`, 6, (i + 0.65) * LANE_H)
      }

      // Spawn new particles based on TPS
      if (frameRef.current % Math.max(1, Math.floor(30 / (tps || 1) * 10)) === 0) {
        spawnParticles(Math.ceil((tps || 1) / 100) + 2)
      }

      // Draw + update particles
      particlesRef.current = particlesRef.current.filter(p => p.x < W && p.life > 0)
      particlesRef.current.forEach(p => {
        // Glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        grad.addColorStop(0, p.color + 'CC')
        grad.addColorStop(1, p.color + '00')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        ctx.globalAlpha = 1

        p.x += p.speed
        p.life -= 0.002
      })

      // Right edge flash when tx complete
      particlesRef.current.forEach(p => {
        if (p.x > W - 20 && p.x < W - 18) {
          ctx.strokeStyle = p.color + '80'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(W - 2, p.y - 8)
          ctx.lineTo(W - 2, p.y + 8)
          ctx.stroke()
        }
      })

      // TPS readout
      ctx.fillStyle = 'rgba(131,110,249,0.6)'
      ctx.font = 'bold 11px Space Mono, monospace'
      ctx.fillText(`${tps || 0} TX/S`, W - 70, 18)

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [tps])

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={220}
        style={{
          width: '100%',
          height: '220px',
          borderRadius: '8px',
          background: '#07050F',
          display: 'block',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'rgba(131,110,249,0.4)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        pointerEvents: 'none',
      }}>
        ← Transaction flow across parallel execution lanes →
      </div>
    </div>
  )
}

// Block utilization heatmap — last 60 blocks as a grid
function BlockHeatmap({ blockHistory }) {
  if (!blockHistory?.length) {
    return <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
  }

  const cells = [...blockHistory].slice(-60)
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(20, 1fr)',
        gap: '3px',
      }}>
        {cells.map((b, i) => {
          const util = b.gasLimit > 0 ? b.gasUsed / b.gasLimit : 0
          const alpha = 0.1 + util * 0.9
          return (
            <div
              key={i}
              title={`Block #${b.number?.toLocaleString()} · ${(util * 100).toFixed(1)}% full · ${b.txCount} txns`}
              style={{
                height: '18px',
                borderRadius: '3px',
                background: `rgba(131,110,249,${alpha})`,
                cursor: 'default',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scaleY(1.3)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scaleY(1)'}
            />
          )
        })}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--text-muted)',
      }}>
        <span>← {cells[0]?.number?.toLocaleString()}</span>
        <span>Block utilization (last 60 blocks)</span>
        <span>{cells[cells.length - 1]?.number?.toLocaleString()} →</span>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>Empty</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].map(a => (
          <div key={a} style={{ width: '16px', height: '10px', borderRadius: '2px', background: `rgba(131,110,249,${a})` }} />
        ))}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>Full</span>
      </div>
    </div>
  )
}

// Network health score
function HealthScore({ tps, gasPrice, latestBlock }) {
  const scores = {
    throughput: Math.min(100, (tps / 1000) * 100),
    gasEfficiency: Math.max(0, 100 - (gasPrice || 0) * 20),
    blockTime: latestBlock ? Math.max(0, 100 - Math.max(0, (Date.now() / 1000 - latestBlock.timestamp - 1)) * 10) : 50,
  }
  const overall = Math.round((scores.throughput + scores.gasEfficiency + scores.blockTime) / 3)

  const healthColor = overall > 70 ? 'var(--green)' : overall > 40 ? 'var(--yellow)' : 'var(--red)'
  const healthLabel = overall > 70 ? 'Healthy' : overall > 40 ? 'Degraded' : 'Stressed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Overall score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={healthColor}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - overall / 100)}`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: healthColor, lineHeight: 1 }}>{overall}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px' }}>/100</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: healthColor, marginBottom: '4px' }}>{healthLabel}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>Network health score</div>
        </div>
      </div>

      {/* Sub-scores */}
      {[
        { label: 'Throughput', score: scores.throughput, detail: `${tps} TPS` },
        { label: 'Gas Efficiency', score: scores.gasEfficiency, detail: `${gasPrice?.toFixed(4) || '—'} Gwei` },
        { label: 'Block Cadence', score: scores.blockTime, detail: '~1s target' },
      ].map(item => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{item.detail}</span>
          </div>
          <div style={{ height: '5px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${item.score}%`,
              borderRadius: '3px',
              background: item.score > 70 ? 'var(--green)' : item.score > 40 ? 'var(--yellow)' : 'var(--red)',
              transition: 'width 1s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ExecutionPage() {
  const chain = useChainData()
  const loading = chain.status === 'connecting'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard label="Live TPS" value={chain.tps} unit="tx/s"
          accent="var(--purple)" loading={loading} icon={Zap}
          sub="Real-time throughput" />
        <StatCard label="Parallel Lanes" value={8} sub="Monad execution lanes"
          accent="var(--purple-bright)" icon={Cpu} />
        <StatCard label="Block Height" value={chain.latestBlock?.number}
          loading={loading} icon={Activity} sub={chain.latestBlock ? formatTime(chain.latestBlock.timestamp) : '—'} />
        <StatCard label="Gas Price" value={chain.gasPrice}
          unit="Gwei" loading={loading} sub="Current base fee" />
      </div>

      {/* Parallel execution visualizer */}
      <Section
        title="Parallel Execution Visualizer"
        subtitle="Live transaction flow across Monad's parallel execution lanes — each dot is a transaction"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green)',
              animation: 'pulse-dot 2s ease infinite',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>LIVE</span>
          </div>
        }
      >
        <ParallelLanes blocks={chain.blockHistory} tps={chain.tps} />
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(131,110,249,0.06)',
          border: '1px solid rgba(131,110,249,0.15)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--purple-bright)' }}>Monad's parallel execution</strong> processes thousands of transactions simultaneously across independent lanes — unlike Ethereum which processes them sequentially. This is what enables 10,000+ TPS with 1-second finality.
        </div>
      </Section>

      {/* Heatmap + Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '14px' }}>
        <Section title="Block Utilization Heatmap" subtitle="Last 60 blocks — hover for details">
          <BlockHeatmap blockHistory={chain.blockHistory} />
        </Section>
        <Section title="Network Health" subtitle="Live performance score">
          <HealthScore
            tps={chain.tps}
            gasPrice={chain.gasPrice}
            latestBlock={chain.latestBlock}
          />
        </Section>
      </div>
    </div>
  )
}
