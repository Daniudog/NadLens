import { useState } from 'react'
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { useEcosystemData } from '../hooks/useDefiData.js'
import { formatUSD, formatCount } from '../lib/monad.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'

const CATEGORY_COLORS = {
  'Dexes': '#836EF9',
  'Lending': '#4ADE80',
  'Liquid Staking': '#60A5FA',
  'CDP': '#FCD34D',
  'Bridge': '#FB923C',
  'Yield': '#F472B6',
  'Derivatives': '#A78BFA',
  'Other': '#4A4268',
}

function TVLChart({ history, loading }) {
  if (loading || !history?.length) {
    return <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
  }
  const recent = history.slice(-60)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={recent} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#836EF9" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#836EF9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false} interval={9} />
        <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(0)}M` : `$${(v/1e3).toFixed(0)}K`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          labelStyle={{ color: 'var(--text-muted)' }}
          formatter={v => [formatUSD(v), 'TVL']}
        />
        <Area type="monotone" dataKey="tvl" stroke="#836EF9" strokeWidth={2}
          fill="url(#tvlGrad)" dot={false}
          activeDot={{ r: 4, fill: '#A78BFA', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ProtocolRow({ protocol, rank }) {
  const change = protocol.change_1d
  const isUp = change > 0
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 1fr 100px 100px 80px 80px',
      alignItems: 'center',
      gap: '8px',
      padding: '11px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      transition: 'background 0.15s',
      cursor: 'default',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
        {rank}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {protocol.logo ? (
          <img src={protocol.logo} alt="" width={22} height={22}
            style={{ borderRadius: '50%', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--purple-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--purple)' }}>
              {protocol.name?.[0]?.toUpperCase()}
            </span>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {protocol.name}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {protocol.category}
          </div>
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
        {formatUSD(protocol.tvl)}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {protocol.tvl && protocol.mcap ? `${(protocol.mcap / protocol.tvl).toFixed(2)}x` : '—'}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
        {change !== null && change !== undefined ? (
          <>
            {isUp ? <TrendingUp size={10} color="var(--green)" /> : <TrendingDown size={10} color="var(--red)" />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isUp ? '+' : ''}{change?.toFixed(1)}%
            </span>
          </>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
      </div>
      <a
        href={`https://defillama.com/protocol/${protocol.slug}`}
        target="_blank" rel="noreferrer"
        style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-muted)', textDecoration: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        <ExternalLink size={12} />
      </a>
    </div>
  )
}

function CategoryPie({ protocols }) {
  const cats = {}
  protocols.forEach(p => {
    const c = p.category || 'Other'
    cats[c] = (cats[c] || 0) + (p.tvl || 0)
  })
  const data = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
          paddingAngle={3} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#4A4268'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [formatUSD(v), '']}
        />
        <Legend
          iconType="circle" iconSize={8}
          wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default function EcosystemPage() {
  const eco = useEcosystemData()
  const [filter, setFilter] = useState('all')
  const loading = eco.loading

  // Compute TVL change from history
  const tvlHistory = eco.tvlHistory || []
  const tvlChange7d = tvlHistory.length >= 8
    ? ((tvlHistory[tvlHistory.length - 1]?.tvl - tvlHistory[tvlHistory.length - 8]?.tvl) / tvlHistory[tvlHistory.length - 8]?.tvl * 100)
    : null

  const categories = ['all', ...new Set((eco.protocols || []).map(p => p.category).filter(Boolean))]
  const filtered = filter === 'all'
    ? (eco.protocols || []).slice(0, 30)
    : (eco.protocols || []).filter(p => p.category === filter).slice(0, 30)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <StatCard label="Total TVL" value={eco.tvl ? eco.tvl / 1e6 : null} prefix="$" suffix="M"
          decimals={2} accent="var(--purple)" loading={loading}
          change={tvlChange7d} changeLabel="7d" />
        <StatCard label="Protocols" value={eco.protocols?.length} loading={loading}
          sub="on Monad mainnet" />
        <StatCard label="DEX Volume 24h" value={eco.dex?.total24h ? eco.dex.total24h / 1e6 : null}
          prefix="$" suffix="M" decimals={2} loading={loading}
          sub="Across all DEXes" />
        <StatCard label="Stablecoin Mcap" value={eco.stables?.current ? eco.stables.current / 1e6 : null}
          prefix="$" suffix="M" decimals={2} loading={loading}
          sub="Total on Monad" />
        <StatCard label="Fees 24h" value={eco.fees?.total24h ? eco.fees.total24h / 1e3 : null}
          prefix="$" suffix="K" decimals={1} loading={loading}
          sub="Protocol fees" />
        <StatCard label="MON Price" value={eco.monPrice?.price} prefix="$" decimals={4}
          loading={loading} sub="via CoinGecko" accent="var(--purple-bright)" />
      </div>

      {/* TVL chart + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '14px' }}>
        <Section title="TVL History" subtitle="Total Value Locked on Monad — source: DefiLlama">
          <TVLChart history={eco.tvlHistory} loading={loading} />
        </Section>
        <Section title="TVL by Category" subtitle="Protocol type breakdown">
          {loading
            ? <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
            : <CategoryPie protocols={eco.protocols || []} />}
        </Section>
      </div>

      {/* Protocol table */}
      <Section
        title="Protocols"
        subtitle={`${filtered.length} shown · Sorted by TVL`}
        noPad
        action={
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.slice(0, 6).map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filter === cat ? 'var(--purple)' : 'var(--border)',
                background: filter === cat ? 'var(--purple-dim)' : 'transparent',
                color: filter === cat ? 'var(--purple-bright)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s',
              }}>{cat}</button>
            ))}
          </div>
        }
      >
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 100px 100px 80px 80px',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {['#', 'Protocol', 'TVL', 'Mcap/TVL', '1d %', ''].map(h => (
            <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: h === '#' ? 'center' : h === 'TVL' || h === 'Mcap/TVL' || h === '1d %' ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
          ))}
        </div>
        {loading
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '44px', margin: '4px 16px', borderRadius: '6px' }} />
            ))
          : filtered.length === 0
            ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>NO DATA</div>
            : filtered.map((p, i) => <ProtocolRow key={p.slug || i} protocol={p} rank={i + 1} />)
        }
      </Section>
    </div>
  )
}
