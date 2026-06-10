import { useEcosystemData } from '../hooks/useDefiData.js'
import { formatUSD } from '../lib/monad.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import { ExternalLink } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, AreaChart, Area
} from 'recharts'

const DEX_COLORS = ['#836EF9','#A78BFA','#4ADE80','#60A5FA','#FCD34D','#FB923C','#F472B6','#34D399','#818CF8','#C084FC']

function VolumeBar({ data }) {
  if (!data?.length) return <div className="skeleton" style={{ height: '220px', borderRadius: '8px' }} />
  const top = data.slice(0, 8)
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={top} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`} />
        <YAxis type="category" dataKey="name" width={80}
          tick={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [formatUSD(v), '24h Volume']}
        />
        <Bar dataKey="total24h" radius={[0, 4, 4, 0]}>
          {top.map((_, i) => <Cell key={i} fill={DEX_COLORS[i % DEX_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function VolumeHistory({ data }) {
  if (!data?.length) return <div className="skeleton" style={{ height: '180px', borderRadius: '8px' }} />
  const chart = data.slice(-30).map(([ts, vol]) => ({
    date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volume: vol,
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false} interval={6} />
        <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [formatUSD(v), 'Volume']}
        />
        <Area type="monotone" dataKey="volume" stroke="#4ADE80" strokeWidth={2}
          fill="url(#volGrad)" dot={false}
          activeDot={{ r: 3, fill: '#4ADE80' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function DexRow({ protocol, rank }) {
  const share = protocol._totalVolume24h && protocol.total24h
    ? (protocol.total24h / protocol._totalVolume24h * 100).toFixed(1)
    : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 110px 110px 70px 32px',
      alignItems: 'center',
      gap: '8px',
      padding: '11px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>{rank}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {protocol.logo && (
          <img src={protocol.logo} alt="" width={20} height={20}
            style={{ borderRadius: '50%', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none' }} />
        )}
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {protocol.name}
        </span>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
        {formatUSD(protocol.total24h)}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {formatUSD(protocol.total7d)}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--purple)', textAlign: 'right' }}>
        {share ? `${share}%` : '—'}
      </span>
      <a href={`https://defillama.com/dex/${protocol.slug}`} target="_blank" rel="noreferrer"
        style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

export default function DexPage() {
  const eco = useEcosystemData()
  const loading = eco.loading
  const dex = eco.dex

  const protocolsWithTotal = (dex?.protocols || []).map(p => ({
    ...p,
    _totalVolume24h: dex?.total24h,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard label="24h DEX Volume" value={dex?.total24h ? dex.total24h / 1e6 : null}
          prefix="$" suffix="M" decimals={2} accent="var(--green)" loading={loading} />
        <StatCard label="7d DEX Volume" value={dex?.total7d ? dex.total7d / 1e6 : null}
          prefix="$" suffix="M" decimals={2} loading={loading} />
        <StatCard label="All-time Volume" value={dex?.totalAllTime ? dex.totalAllTime / 1e6 : null}
          prefix="$" suffix="M" decimals={1} loading={loading} sub="Since mainnet" />
        <StatCard label="Active DEXes" value={dex?.protocols?.length} loading={loading}
          sub="Tracked by DefiLlama" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
        <Section title="DEX Volume Ranking" subtitle="24h volume by protocol">
          <VolumeBar data={dex?.protocols} />
        </Section>
        <Section title="Daily Volume History" subtitle="30-day trend on Monad">
          <VolumeHistory data={dex?.dailyChart} />
        </Section>
      </div>

      <Section title="DEX Leaderboard" subtitle="All tracked DEXes on Monad — source: DefiLlama" noPad>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 110px 110px 70px 32px',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {['#', 'Protocol', '24h Vol', '7d Vol', 'Share', ''].map(h => (
            <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === '#' || h === '' ? 'center' : 'right' }}>{h}</span>
          ))}
        </div>
        {loading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '44px', margin: '4px 16px', borderRadius: '6px' }} />
            ))
          : protocolsWithTotal.map((p, i) => <DexRow key={p.name} protocol={p} rank={i + 1} />)
        }
      </Section>
    </div>
  )
}
