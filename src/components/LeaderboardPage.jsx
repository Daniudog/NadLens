import { useState, useEffect } from 'react'
import { useEcosystemData } from '../hooks/useDefiData.js'
import { formatUSD } from '../lib/monad.js'
import { getWatchlist, addToWatchlist, classifyWallet } from '../lib/whales.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import { Trophy, TrendingUp, TrendingDown, Plus, ExternalLink, Layers } from 'lucide-react'

// Protocol leaderboard - ranked by TVL change
function ProtocolLeaderboard({ protocols, loading }) {
  const sorted = [...(protocols || [])]
    .filter(p => p.tvl > 0)
    .sort((a, b) => (b.change_1d || 0) - (a.change_1d || 0))
    .slice(0, 15)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px' }} />)}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {sorted.map((p, i) => {
        const isUp = (p.change_1d || 0) > 0
        const medals = ['🥇', '🥈', '🥉']
        return (
          <div key={p.slug || i} style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 100px 80px 36px',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 16px',
            borderRadius: '8px',
            background: i < 3 ? 'rgba(131,110,249,0.05)' : 'transparent',
            border: `1px solid ${i < 3 ? 'rgba(131,110,249,0.12)' : 'transparent'}`,
            marginBottom: '2px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = i < 3 ? 'rgba(131,110,249,0.05)' : 'transparent'}
          >
            <div style={{ textAlign: 'center' }}>
              {i < 3
                ? <span style={{ fontSize: '16px' }}>{medals[i]}</span>
                : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{i + 1}</span>
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              {p.logo
                ? <img src={p.logo} alt="" width={20} height={20} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--purple)' }}>{p.name?.[0]}</span>
                  </div>
              }
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)' }}>{p.category}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatUSD(p.tvl)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>TVL</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
              {p.change_1d != null ? (
                <>
                  {isUp ? <TrendingUp size={10} color="var(--green)" /> : <TrendingDown size={10} color="var(--red)" />}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    {isUp ? '+' : ''}{p.change_1d.toFixed(1)}%
                  </span>
                </>
              ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
            </div>
            <a href={`https://defillama.com/protocol/${p.slug}`} target="_blank" rel="noreferrer"
              style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
              <ExternalLink size={11} />
            </a>
          </div>
        )
      })}
    </div>
  )
}

// Top gainers vs losers
function GainersLosers({ protocols, loading }) {
  const valid = (protocols || []).filter(p => p.tvl > 0 && p.change_1d != null)
  const gainers = [...valid].sort((a, b) => (b.change_1d || 0) - (a.change_1d || 0)).slice(0, 5)
  const losers  = [...valid].sort((a, b) => (a.change_1d || 0) - (b.change_1d || 0)).slice(0, 5)

  function Row({ p, type }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {p.logo && <img src={p.logo} alt="" width={18} height={18} style={{ borderRadius: '50%' }} onError={e => e.target.style.display = 'none'} />}
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)' }}>{p.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {type === 'gainer' ? <TrendingUp size={11} color="var(--green)" /> : <TrendingDown size={11} color="var(--red)" />}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: type === 'gainer' ? 'var(--green)' : 'var(--red)' }}>
            {p.change_1d > 0 ? '+' : ''}{p.change_1d?.toFixed(1)}%
          </span>
        </div>
      </div>
    )
  }

  if (loading) return <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <TrendingUp size={11} /> Top Gainers (24h)
        </div>
        {gainers.map(p => <Row key={p.slug} p={p} type="gainer" />)}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <TrendingDown size={11} /> Top Losers (24h)
        </div>
        {losers.map(p => <Row key={p.slug} p={p} type="loser" />)}
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const eco = useEcosystemData()
  const loading = eco.loading

  const totalTVL = (eco.protocols || []).reduce((s, p) => s + (p.tvl || 0), 0)
  const topProtocol = (eco.protocols || [])[0]
  const mostActive = [...(eco.protocols || [])].sort((a, b) => (b.change_1d || 0) - (a.change_1d || 0))[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <StatCard label="Total Ecosystem TVL" value={totalTVL ? totalTVL / 1e6 : null}
          prefix="$" suffix="M" decimals={2} accent="var(--purple)" loading={loading} icon={Layers} />
        <StatCard label="Protocols Ranked" value={eco.protocols?.length} loading={loading} sub="On Monad mainnet" />
        <StatCard label="Top Protocol" value={topProtocol?.name || '—'} loading={loading} sub={topProtocol ? formatUSD(topProtocol.tvl) + ' TVL' : ''} accent="var(--yellow)" />
        <StatCard label="Biggest Mover" value={mostActive?.name || '—'} loading={loading}
          sub={mostActive?.change_1d != null ? `+${mostActive.change_1d?.toFixed(1)}% 24h` : ''} accent="var(--green)" />
      </div>

      {/* Gainers / Losers */}
      <Section title="24h Movers" subtitle="Biggest TVL changes on Monad in the last 24 hours">
        <GainersLosers protocols={eco.protocols} loading={loading} />
      </Section>

      {/* Full leaderboard */}
      <Section
        title="Protocol Leaderboard"
        subtitle="Ranked by 24h TVL change — source: DefiLlama"
        noPad
      >
        <div style={{ padding: '0 4px' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 80px 36px', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            {['#', 'Protocol', 'TVL', '24h %', ''].map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'TVL' || h === '24h %' ? 'right' : h === '#' || h === '' ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          <div style={{ padding: '8px 4px' }}>
            <ProtocolLeaderboard protocols={eco.protocols} loading={loading} />
          </div>
        </div>
      </Section>
    </div>
  )
}
