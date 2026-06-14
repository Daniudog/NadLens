import { useState } from 'react'
import { useEcosystemData } from '../hooks/useDefiData.js'
import { formatUSD } from '../lib/monad.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import { ExternalLink, Flame } from 'lucide-react'

const APY_COLOR = (apy) => {
  if (apy > 50) return 'var(--red)'
  if (apy > 20) return 'var(--yellow)'
  if (apy > 5)  return 'var(--green)'
  return 'var(--text-secondary)'
}

function ApyBadge({ apy }) {
  if (!apy) return <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>—</span>
  const hot = apy > 30
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {hot && <Flame size={11} color="var(--red)" />}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700,
        color: APY_COLOR(apy),
      }}>{apy.toFixed(2)}%</span>
    </div>
  )
}

function PoolRow({ pool, rank }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 80px 120px 110px 80px 36px',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>{rank}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {pool.symbol}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
          {pool.project}
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase' }}>
        {pool.chain}
      </span>
      <div style={{ textAlign: 'right' }}>
        <ApyBadge apy={pool.apy} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
        {formatUSD(pool.tvlUsd)}
      </span>
      <div style={{ textAlign: 'right' }}>
        {pool.apyPct7D !== null && pool.apyPct7D !== undefined ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: pool.apyPct7D > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {pool.apyPct7D > 0 ? '+' : ''}{pool.apyPct7D?.toFixed(1)}%
          </span>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
      </div>
      <a href={`https://defillama.com/yields?chain=Monad`} target="_blank" rel="noreferrer"
        style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

export default function YieldsPage() {
  const eco = useEcosystemData()
  const loading = eco.loading
  const [minApy, setMinApy] = useState(0)
  const [sortBy, setSortBy] = useState('tvl')

  const pools = (eco.yields || [])
    .filter(p => (p.apy || 0) >= minApy)
    .sort((a, b) => sortBy === 'tvl' ? (b.tvlUsd - a.tvlUsd) : (b.apy - a.apy))

  const avgApy = pools.length ? (pools.reduce((s, p) => s + (p.apy || 0), 0) / pools.length) : 0
  const totalYieldTvl = pools.reduce((s, p) => s + (p.tvlUsd || 0), 0)
  const hotPools = pools.filter(p => (p.apy || 0) > 20).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard label="Pools Tracked" value={pools.length} loading={loading} sub="On Monad" />
        <StatCard label="Avg APY" value={avgApy} suffix="%" decimals={2} accent="var(--yellow)" loading={loading} sub="Across all pools" />
        <StatCard label="Yield TVL" value={totalYieldTvl ? totalYieldTvl / 1e6 : null} prefix="$" suffix="M" decimals={2} loading={loading} />
        <StatCard label="Hot Pools (>20%)" value={hotPools} loading={loading} accent="var(--red)" sub="High APY pools" />
      </div>

      <Section
        title="Yield Pools"
        subtitle="Live APY data from DefiLlama"
        noPad
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>Min APY:</span>
            {[0, 5, 10, 20].map(v => (
              <button key={v} onClick={() => setMinApy(v)} style={{
                padding: '3px 9px',
                borderRadius: '5px',
                border: '1px solid',
                borderColor: minApy === v ? 'var(--purple)' : 'var(--border)',
                background: minApy === v ? 'var(--purple-dim)' : 'transparent',
                color: minApy === v ? 'var(--purple-bright)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{v}%+</button>
            ))}
            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>Sort:</span>
            {[['tvl', 'TVL'], ['apy', 'APY']].map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)} style={{
                padding: '3px 9px',
                borderRadius: '5px',
                border: '1px solid',
                borderColor: sortBy === val ? 'var(--purple)' : 'var(--border)',
                background: sortBy === val ? 'var(--purple-dim)' : 'transparent',
                color: sortBy === val ? 'var(--purple-bright)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        }
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 80px 120px 110px 80px 36px',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {['#', 'Pool', 'Chain', 'APY', 'TVL', '7d Δ', ''].map(h => (
            <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'APY' || h === 'TVL' || h === '7d Δ' ? 'right' : 'center' }}>{h}</span>
          ))}
        </div>
        {loading
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '48px', margin: '4px 16px', borderRadius: '6px' }} />
            ))
          : pools.length === 0
            ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                NO POOLS MATCH FILTER
              </div>
            : pools.slice(0, 25).map((p, i) => <PoolRow key={p.pool || i} pool={p} rank={i + 1} />)
        }
      </Section>
    </div>
  )
}
