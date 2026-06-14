import { useState, useEffect } from 'react'
import { TrendingUp, Zap, Clock, Database, ExternalLink } from 'lucide-react'
import Section from './Section.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'

// Static benchmarks — sourced from public data, updated periodically
// Monad: live from RPC. Others: documented peak/average performance.
const CHAIN_SPECS = [
  {
    id: 'monad',
    name: 'Monad',
    color: '#836EF9',
    emoji: '💜',
    chainId: 143,
    maxTPS: 10000,
    avgBlockTime: 1,
    finality: 1,
    evm: true,
    consensus: 'MonadBFT',
    parallelExecution: true,
    mainnetLaunch: 'Nov 2025',
    tvlUSD: 400,   // $M
    description: 'Parallel EVM blockchain with 10,000 TPS capacity and 1s finality. Fully EVM-compatible.',
    links: { website: 'https://monad.xyz', docs: 'https://docs.monad.xyz', explorer: 'https://monadvision.com' },
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    color: '#627EEA',
    emoji: '⟠',
    maxTPS: 30,
    avgBlockTime: 12,
    finality: 780,  // ~13 min
    evm: true,
    consensus: 'PoS (Gasper)',
    parallelExecution: false,
    mainnetLaunch: 'Jul 2015',
    tvlUSD: 60000,
    description: 'The original smart contract platform. Decentralized, battle-tested, most developer ecosystem.',
    links: { website: 'https://ethereum.org', docs: 'https://ethereum.org/developers', explorer: 'https://etherscan.io' },
  },
  {
    id: 'solana',
    name: 'Solana',
    color: '#9945FF',
    emoji: '◎',
    maxTPS: 65000,
    avgBlockTime: 0.4,
    finality: 12.8,
    evm: false,
    consensus: 'PoH + Tower BFT',
    parallelExecution: true,
    mainnetLaunch: 'Mar 2020',
    tvlUSD: 10000,
    description: 'High-performance L1 with parallel transaction processing. Non-EVM, Rust-based smart contracts.',
    links: { website: 'https://solana.com', docs: 'https://docs.solana.com', explorer: 'https://solscan.io' },
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    color: '#28A0F0',
    emoji: '🔵',
    maxTPS: 4000,
    avgBlockTime: 0.25,
    finality: 604800, // 7 days (optimistic)
    evm: true,
    consensus: 'Optimistic Rollup',
    parallelExecution: false,
    mainnetLaunch: 'Aug 2021',
    tvlUSD: 4000,
    description: 'Ethereum L2 optimistic rollup. EVM-compatible with high throughput, but 7-day withdrawal period.',
    links: { website: 'https://arbitrum.io', docs: 'https://docs.arbitrum.io', explorer: 'https://arbiscan.io' },
  },
  {
    id: 'base',
    name: 'Base',
    color: '#0052FF',
    emoji: '🔷',
    maxTPS: 2000,
    avgBlockTime: 2,
    finality: 604800,
    evm: true,
    consensus: 'Optimistic Rollup',
    parallelExecution: false,
    mainnetLaunch: 'Aug 2023',
    tvlUSD: 8000,
    description: 'Coinbase-built Ethereum L2. EVM-compatible, growing consumer app ecosystem.',
    links: { website: 'https://base.org', docs: 'https://docs.base.org', explorer: 'https://basescan.org' },
  },
  {
    id: 'megaeth',
    name: 'MegaETH',
    color: '#FF6B6B',
    emoji: '⚡',
    maxTPS: 100000,
    avgBlockTime: 0.001, // 1ms
    finality: 0.01,
    evm: true,
    consensus: 'Based Sequencer',
    parallelExecution: true,
    mainnetLaunch: 'Testnet 2025',
    tvlUSD: 0,
    description: 'Real-time EVM chain targeting 100,000 TPS with 1ms block times. Currently on testnet.',
    links: { website: 'https://megaeth.com', docs: 'https://docs.megaeth.com', explorer: 'https://www.megaeth.com' },
  },
]

function fmt(n) {
  if (n >= 1000000) return (n / 1000).toFixed(0) + 'K'
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtTime(s) {
  if (s >= 86400) return `${(s / 86400).toFixed(0)}d`
  if (s >= 3600)  return `${(s / 3600).toFixed(0)}h`
  if (s >= 60)    return `${(s / 60).toFixed(0)}m`
  if (s < 1)      return `${(s * 1000).toFixed(0)}ms`
  return `${s}s`
}

const METRIC_DEFS = [
  { key: 'maxTPS',       label: 'Max TPS',       good: 'high',  format: fmt },
  { key: 'avgBlockTime', label: 'Block Time',     good: 'low',   format: v => fmtTime(v) },
  { key: 'finality',     label: 'Finality',       good: 'low',   format: v => fmtTime(v) },
  { key: 'tvlUSD',       label: 'TVL ($M)',       good: 'high',  format: v => `$${v.toLocaleString()}M` },
]

export default function ComparisonPage() {
  const [liveMonTPS, setLiveMonTPS] = useState(null)
  const [selected, setSelected]     = useState(new Set(['monad', 'ethereum', 'solana', 'arbitrum', 'base']))

  // Fetch live Monad TPS
  useEffect(() => {
    async function fetchTPS() {
      try {
        const res = await fetch('https://rpc2.monad.xyz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
          ]),
        })
        const [blockRes] = await res.json()
        const latest = parseInt(blockRes.result, 16)

        // Fetch last 20 blocks
        const batchReqs = Array.from({ length: 20 }, (_, i) => ({
          jsonrpc: '2.0', id: i + 1,
          method: 'eth_getBlockByNumber',
          params: ['0x' + (latest - i).toString(16), false],
        }))
        const batchRes = await fetch('https://rpc2.monad.xyz', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchReqs),
        })
        const blocks = (await batchRes.json()).map(r => r.result).filter(Boolean)
        if (blocks.length < 2) return
        const sorted = [...blocks].sort((a, b) => parseInt(a.number, 16) - parseInt(b.number, 16))
        const timeSpan = parseInt(sorted[sorted.length - 1].timestamp, 16) - parseInt(sorted[0].timestamp, 16)
        const totalTxns = sorted.reduce((s, b) => s + (b.transactions?.length ?? 0), 0)
        if (timeSpan > 0) setLiveMonTPS(Math.round(totalTxns / timeSpan))
      } catch {}
    }
    fetchTPS()
    const iv = setInterval(fetchTPS, 5000)
    return () => clearInterval(iv)
  }, [])

  const toggleChain = id => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 2) next.delete(id) }
      else next.add(id)
      return next
    })
  }

  const visibleChains = CHAIN_SPECS.filter(c => selected.has(c.id))

  // TPS bar chart data — use live for Monad
  const tpsData = visibleChains.map(c => ({
    name: c.name,
    tps: c.id === 'monad' && liveMonTPS ? liveMonTPS : c.maxTPS,
    color: c.color,
    isLive: c.id === 'monad',
  }))

  // Radar scores (normalized 0-100)
  const radarData = [
    { metric: 'TPS', ...Object.fromEntries(visibleChains.map(c => [c.name, Math.min(100, (c.maxTPS / 100000) * 100)])) },
    { metric: 'Speed', ...Object.fromEntries(visibleChains.map(c => [c.name, Math.max(0, 100 - (c.avgBlockTime / 12) * 100)])) },
    { metric: 'EVM', ...Object.fromEntries(visibleChains.map(c => [c.name, c.evm ? 100 : 30])) },
    { metric: 'Parallel', ...Object.fromEntries(visibleChains.map(c => [c.name, c.parallelExecution ? 100 : 0])) },
    { metric: 'TVL', ...Object.fromEntries(visibleChains.map(c => [c.name, Math.min(100, (c.tvlUSD / 60000) * 100)])) },
    { metric: 'Finality', ...Object.fromEntries(visibleChains.map(c => [c.name, Math.max(0, 100 - (Math.log10(c.finality + 1) / 6) * 100)])) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Chain toggles */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          Select chains to compare
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>(min 2)</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CHAIN_SPECS.map(c => (
            <button key={c.id} onClick={() => toggleChain(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '7px 14px', borderRadius: '8px', border: '1px solid',
              borderColor: selected.has(c.id) ? c.color : 'var(--border)',
              background: selected.has(c.id) ? `${c.color}14` : 'transparent',
              color: selected.has(c.id) ? c.color : 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: selected.has(c.id) ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '14px' }}>{c.emoji}</span>
              {c.name}
              {c.id === 'monad' && liveMonTPS && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', background: `${c.color}20`, padding: '1px 5px', borderRadius: '4px' }}>
                  LIVE
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TPS comparison */}
      <Section
        title="Throughput Comparison"
        subtitle="Max TPS capacity — Monad shows live RPC data"
        action={
          liveMonTPS && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#836EF9' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#836EF9', animation: 'pulse-dot 2s ease infinite' }} />
              Monad live: {liveMonTPS} TPS
            </div>
          )
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tpsData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
              formatter={(v, _, p) => [`${fmt(v)} TPS${p.payload.isLive ? ' (live)' : ' (max)'}`, 'Throughput']}
            />
            <Bar dataKey="tps" radius={[4, 4, 0, 0]}>
              {tpsData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Metrics table */}
      <Section title="Side-by-Side Metrics" subtitle="Key performance indicators across chains" noPad>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${visibleChains.length}, 1fr)`, gap: '8px', padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Metric</span>
          {visibleChains.map(c => (
            <span key={c.id} style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: c.color, textAlign: 'center' }}>
              {c.emoji} {c.name}
            </span>
          ))}
        </div>

        {METRIC_DEFS.map(metric => (
          <div key={metric.key} style={{ display: 'grid', gridTemplateColumns: `140px repeat(${visibleChains.length}, 1fr)`, gap: '8px', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{metric.label}</span>
            {visibleChains.map(c => {
              const raw = c.id === 'monad' && metric.key === 'maxTPS' && liveMonTPS ? liveMonTPS : c[metric.key]
              // Determine best value for highlighting
              const allVals = visibleChains.map(ch => ch[metric.key])
              const best = metric.good === 'high' ? Math.max(...allVals) : Math.min(...allVals)
              const isBest = c[metric.key] === best
              return (
                <div key={c.id} style={{ textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: isBest ? 700 : 500,
                    color: isBest ? c.color : 'var(--text-secondary)',
                    background: isBest ? `${c.color}12` : 'transparent',
                    padding: isBest ? '2px 8px' : '0',
                    borderRadius: '5px',
                  }}>
                    {c.id === 'monad' && metric.key === 'maxTPS' && liveMonTPS
                      ? fmt(liveMonTPS) + ' ⚡'
                      : metric.format(c[metric.key])}
                  </span>
                </div>
              )
            })}
          </div>
        ))}

        {/* Extra rows */}
        {[
          { label: 'EVM Compatible', key: 'evm', format: v => v ? '✅ Yes' : '❌ No' },
          { label: 'Parallel Execution', key: 'parallelExecution', format: v => v ? '✅ Yes' : '❌ No' },
          { label: 'Consensus', key: 'consensus', format: v => v },
          { label: 'Mainnet Since', key: 'mainnetLaunch', format: v => v },
        ].map(row => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: `140px repeat(${visibleChains.length}, 1fr)`, gap: '8px', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
            {visibleChains.map(c => (
              <div key={c.id} style={{ textAlign: 'center', fontFamily: typeof c[row.key] === 'boolean' ? 'var(--font-body)' : 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                {row.format(c[row.key])}
              </div>
            ))}
          </div>
        ))}
      </Section>

      {/* Chain cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {visibleChains.map(c => (
          <div key={c.id} style={{ padding: '16px 18px', background: 'var(--bg-card)', border: `1px solid ${c.color}25`, borderLeft: `3px solid ${c.color}`, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{c.emoji}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: c.color }}>{c.name}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>{c.description}</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {Object.entries(c.links).map(([key, href]) => (
                <a key={key} href={href} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', background: `${c.color}10`, border: `1px solid ${c.color}25`, borderRadius: '5px', color: c.color, textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 600, textTransform: 'capitalize', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {key} <ExternalLink size={9} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Monad TPS is measured live from the chain. Other chains show documented max/theoretical TPS. TVL data from DefiLlama. Finality times are approximate and methodology varies per chain.
        </span>
      </div>
    </div>
  )
}
