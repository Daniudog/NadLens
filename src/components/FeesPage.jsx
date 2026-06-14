import { useEcosystemData } from '../hooks/useDefiData.js'
import { formatUSD } from '../lib/monad.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import { ExternalLink, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell
} from 'recharts'

const FEE_COLORS = ['#836EF9','#4ADE80','#60A5FA','#FCD34D','#FB923C','#F472B6','#A78BFA','#34D399']

function FeesHistoryChart({ data }) {
  if (!data?.length) return <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
  const chart = data.slice(-30).map(([ts, fees]) => ({
    date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fees,
  }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="feesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#FCD34D" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#FCD34D" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false} interval={5} />
        <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [formatUSD(v), 'Fees']}
        />
        <Area type="monotone" dataKey="fees" stroke="#FCD34D" strokeWidth={2}
          fill="url(#feesGrad)" dot={false}
          activeDot={{ r: 4, fill: '#FCD34D', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ProtocolFeesBar({ protocols }) {
  if (!protocols?.length) return <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
  const top = protocols.slice(0, 8)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`} />
        <YAxis type="category" dataKey="name" width={90}
          tick={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [formatUSD(v), '24h Fees']}
        />
        <Bar dataKey="total24h" radius={[0, 4, 4, 0]}>
          {top.map((_, i) => <Cell key={i} fill={FEE_COLORS[i % FEE_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ProtocolFeeRow({ protocol, rank }) {
  const isUp = (protocol.change_1d || 0) > 0
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 1fr 110px 110px 80px 36px',
      alignItems: 'center', gap: '8px',
      padding: '11px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>{rank}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {protocol.logo && <img src={protocol.logo} alt="" width={20} height={20} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{protocol.name}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)' }}>{protocol.category || '—'}</div>
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{formatUSD(protocol.total24h)}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatUSD(protocol.total7d)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
        {protocol.change_1d != null ? (
          <>
            {isUp ? <TrendingUp size={10} color="var(--green)" /> : <TrendingDown size={10} color="var(--red)" />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: isUp ? 'var(--green)' : 'var(--red)' }}>
              {isUp ? '+' : ''}{protocol.change_1d?.toFixed(1)}%
            </span>
          </>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
      </div>
      <a href={`https://defillama.com/protocol/${protocol.slug || protocol.name?.toLowerCase()}`}
        target="_blank" rel="noreferrer"
        style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

export default function FeesPage() {
  const eco = useEcosystemData()
  const loading = eco.loading
  const fees = eco.fees

  const protocols = fees?.protocols || []
  const totalRevenue7d = protocols.reduce((s, p) => s + (p.total7d || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <StatCard label="Fees 24h" value={fees?.total24h ? fees.total24h / 1e3 : null}
          prefix="$" suffix="K" decimals={2} accent="var(--yellow)" loading={loading} icon={DollarSign}
          sub="All protocols on Monad" />
        <StatCard label="Fees 7d" value={fees?.total7d ? fees.total7d / 1e3 : null}
          prefix="$" suffix="K" decimals={1} loading={loading} sub="7-day total" />
        <StatCard label="Protocol Revenue 7d" value={totalRevenue7d ? totalRevenue7d / 1e3 : null}
          prefix="$" suffix="K" decimals={1} loading={loading} sub="Combined protocols" />
        <StatCard label="Protocols Generating Fees" value={protocols.filter(p => p.total24h > 0).length}
          loading={loading} sub="Active earners" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
        <Section title="Daily Fees History" subtitle="30-day protocol fee trend on Monad — DefiLlama">
          <FeesHistoryChart data={fees?.dailyChart} />
        </Section>
        <Section title="Top Fee Generators" subtitle="24h fees by protocol">
          <ProtocolFeesBar protocols={protocols} />
        </Section>
      </div>

      <Section title="Protocol Fee Breakdown" subtitle="Revenue sorted by 24h — source: DefiLlama" noPad>
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px 80px 36px', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          {['#', 'Protocol', '24h Fees', '7d Fees', '1d %', ''].map(h => (
            <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: ['24h Fees','7d Fees','1d %'].includes(h) ? 'right' : h === '#' || h === '' ? 'center' : 'left' }}>{h}</span>
          ))}
        </div>
        {loading
          ? Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '44px', margin: '4px 16px', borderRadius: '6px' }} />)
          : protocols.length === 0
            ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>NO FEE DATA AVAILABLE</div>
            : protocols.map((p, i) => <ProtocolFeeRow key={p.name || i} protocol={p} rank={i + 1} />)
        }
      </Section>
    </div>
  )
}
