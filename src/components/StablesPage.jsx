import { useEcosystemData } from '../hooks/useDefiData.js'
import { formatUSD } from '../lib/monad.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'

const STABLE_COLORS = ['#4ADE80','#60A5FA','#FCD34D','#FB923C','#F472B6','#A78BFA']

function StableHistoryChart({ history }) {
  if (!history?.length) return <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={history} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="stableGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#4ADE80" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="label"
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false} interval={6} />
        <YAxis
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(0)}M` : `$${(v/1e3).toFixed(0)}K`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [formatUSD(v), 'Stablecoin Supply']}
        />
        <Area type="monotone" dataKey="mcap" stroke="#4ADE80" strokeWidth={2}
          fill="url(#stableGrad)" dot={false}
          activeDot={{ r: 4, fill: '#4ADE80', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function StablesPage() {
  const eco = useEcosystemData()
  const loading = eco.loading
  const stables = eco.stables
  const history = stables?.history || []

  // 7d change
  const change7d = history.length >= 8
    ? ((history[history.length - 1]?.mcap - history[history.length - 8]?.mcap) / (history[history.length - 8]?.mcap || 1) * 100)
    : null

  // 30d change
  const change30d = history.length >= 30
    ? ((history[history.length - 1]?.mcap - history[0]?.mcap) / (history[0]?.mcap || 1) * 100)
    : null

  const isUp7d  = (change7d  || 0) > 0
  const isUp30d = (change30d || 0) > 0

  // Peak
  const peak = history.reduce((max, d) => d.mcap > max ? d.mcap : max, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <StatCard
          label="Total Stablecoin Supply"
          value={stables?.current ? stables.current / 1e6 : null}
          prefix="$" suffix="M" decimals={2}
          accent="var(--green)" loading={loading} icon={DollarSign}
          change={change7d} changeLabel="7d"
        />
        <StatCard
          label="7d Change"
          value={change7d != null ? Math.abs(change7d) : null}
          suffix="%" decimals={2}
          accent={isUp7d ? 'var(--green)' : 'var(--red)'}
          loading={loading}
          icon={isUp7d ? TrendingUp : TrendingDown}
          sub={isUp7d ? 'Supply growing' : 'Supply shrinking'}
        />
        <StatCard
          label="30d Change"
          value={change30d != null ? Math.abs(change30d) : null}
          suffix="%" decimals={2}
          accent={isUp30d ? 'var(--green)' : 'var(--red)'}
          loading={loading}
          sub="Month over month"
        />
        <StatCard
          label="30d Peak Supply"
          value={peak ? peak / 1e6 : null}
          prefix="$" suffix="M" decimals={2}
          loading={loading}
          sub="Highest in 30 days"
        />
      </div>

      {/* History chart */}
      <Section
        title="Stablecoin Supply History"
        subtitle="Total stablecoin circulating supply on Monad — source: DefiLlama"
      >
        <StableHistoryChart history={history} />
      </Section>

      {/* Context */}
      <Section title="Why Stablecoin Supply Matters" subtitle="Signal for ecosystem health">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {[
            {
              label: 'Liquidity Signal',
              color: 'var(--green)',
              text: 'Growing stablecoin supply means more capital is flowing into the Monad ecosystem — a strong indicator of user and protocol adoption.',
            },
            {
              label: 'DeFi Readiness',
              color: 'var(--blue)',
              text: 'Protocols like lending and DEXes need deep stablecoin liquidity to function well. High supply means the ecosystem can support complex DeFi.',
            },
            {
              label: 'Monad vs. Others',
              color: 'var(--purple)',
              text: 'Ethereum hit $80B+ stablecoin supply. Solana $10B+. Monad is early — this supply number is one of the most important metrics to watch over the next 12 months.',
            },
          ].map(item => (
            <div key={item.label} style={{
              padding: '16px 18px',
              borderRadius: '10px',
              background: 'var(--bg-base)',
              border: `1px solid ${item.color}20`,
              borderLeft: `3px solid ${item.color}`,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: item.color, marginBottom: '6px' }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
