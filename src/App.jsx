import { useState } from 'react'
import { Activity, Zap, Database, Fuel, Clock, Hash, Search, ArrowUpRight } from 'lucide-react'
import { useChainData } from './hooks/useChainData.js'
import { formatUSD, formatCount, shortAddress, formatTime, weiToGwei } from './lib/monad.js'
import HeartbeatBar from './components/HeartbeatBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import StatCard from './components/StatCard.jsx'
import TPSChart from './components/TPSChart.jsx'
import BlockChart from './components/BlockChart.jsx'
import BlocksTable from './components/BlocksTable.jsx'
import WalletLookup from './components/WalletLookup.jsx'
import Section from './components/Section.jsx'
import EcosystemPage from './components/EcosystemPage.jsx'
import DexPage from './components/DexPage.jsx'
import YieldsPage from './components/YieldsPage.jsx'
import WatchlistPage from './components/WatchlistPage.jsx'

// ─── OVERVIEW PAGE ──────────────────────────────────────────────────────────
function OverviewPage({ chain }) {
  const loading = chain.status === 'connecting'
  const lb = chain.latestBlock

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '12px' }}>
        <StatCard label="Live TPS" value={chain.tps} unit="tx/s"
          sub="Real-time throughput" accent="var(--purple)" loading={loading} icon={Zap} />
        <StatCard label="Block Height" value={lb?.number}
          sub={lb ? formatTime(lb.timestamp) : 'Connecting…'}
          accent="var(--purple-bright)" loading={loading} icon={Hash} />
        <StatCard label="Block Txns" value={lb?.txCount}
          sub="Latest block" loading={loading} icon={Activity} />
        <StatCard label="Gas Price" value={chain.gasPrice}
          unit="Gwei" sub="Current base fee" loading={loading} icon={Fuel} />
        <StatCard label="Gas Utilization"
          value={lb ? Math.round((lb.gasUsed / lb.gasLimit) * 100) : null}
          unit="%" sub="Latest block" loading={loading} icon={Database} />
        <StatCard label="Block Time" value="~1" unit="sec"
          sub="Target: 1s finality" accent="var(--green)" icon={Clock} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
        <Section title="Live TPS" subtitle="Transactions per second — updates every 2s">
          <TPSChart data={chain.tpsHistory} loading={loading} />
        </Section>
        <Section title="Gas Utilization" subtitle="Per-block usage %">
          <BlockChart data={chain.blockHistory} loading={loading} />
        </Section>
      </div>

      {/* Latest block detail */}
      {lb && (
        <Section title="Latest Block" subtitle={`#${lb.number?.toLocaleString()}`}
          action={
            <a href={`https://monadvision.com/block/${lb.number}`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--purple)', fontSize: '12px', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
              Explorer <ArrowUpRight size={12} />
            </a>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Block Hash',    value: shortAddress(lb.hash),                           mono: true },
              { label: 'Transactions',  value: lb.txCount?.toLocaleString() },
              { label: 'Gas Used',      value: (lb.gasUsed / 1e6).toFixed(2) + 'M' },
              { label: 'Gas Limit',     value: (lb.gasLimit / 1e6).toFixed(2) + 'M' },
              { label: 'Validator',     value: shortAddress(lb.miner),                          mono: true },
              { label: 'Timestamp',     value: formatTime(lb.timestamp) },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>{item.label}</div>
                <div style={{ fontFamily: item.mono ? 'var(--font-mono)' : 'var(--font-display)', fontSize: item.mono ? '12px' : '15px', fontWeight: item.mono ? 400 : 600, color: item.mono ? 'var(--purple-bright)' : 'var(--text-primary)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ─── BLOCKS PAGE ────────────────────────────────────────────────────────────
function BlocksPage({ chain }) {
  const loading = chain.status === 'connecting'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Section
        title="Live Block Feed"
        subtitle="Updates every ~1 second"
        noPad
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80', animation: 'pulse-dot 2s ease infinite' }} />
            LIVE
          </div>
        }
      >
        <BlocksTable blocks={chain.recentBlocks} loading={loading} />
      </Section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Section title="Gas Utilization" subtitle="Per-block trend">
          <BlockChart data={chain.blockHistory} loading={loading} />
        </Section>
        <Section title="TPS History" subtitle="Rolling throughput">
          <TPSChart data={chain.tpsHistory} loading={loading} />
        </Section>
      </div>
    </div>
  )
}

// ─── CHARTS PAGE ─────────────────────────────────────────────────────────────
function ChartsPage({ chain }) {
  const loading = chain.status === 'connecting'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Section title="Transactions Per Second" subtitle="Live rolling TPS from Monad RPC">
        <TPSChart data={chain.tpsHistory} loading={loading} />
      </Section>
      <Section title="Block Gas Utilization" subtitle="How full each block is — closer to 100% = more demand">
        <BlockChart data={chain.blockHistory} loading={loading} />
      </Section>
    </div>
  )
}

// ─── WALLET LOOKUP PAGE ───────────────────────────────────────────────────────
function WalletPage() {
  return (
    <div style={{ maxWidth: '580px' }}>
      <Section title="Wallet Inspector" subtitle="Look up any Monad address">
        <WalletLookup />
      </Section>
    </div>
  )
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────
const PAGE_META = {
  overview:  { title: 'Overview',    sub: 'Live Monad chain metrics' },
  blocks:    { title: 'Blocks',      sub: 'Real-time block feed' },
  charts:    { title: 'Live Charts', sub: 'TPS & gas analytics' },
  ecosystem: { title: 'Ecosystem',   sub: 'TVL, protocols & stablecoins — DefiLlama' },
  dex:       { title: 'DEX Volume',  sub: 'Swap activity on Monad — DefiLlama' },
  yields:    { title: 'Yields',      sub: 'Live APY pools on Monad — DefiLlama' },
  wallet:    { title: 'Wallet',      sub: 'Inspect any Monad address' },
  watchlist: { title: 'Watchlist',   sub: 'Track & tag wallets' },
}

export default function App() {
  const [page, setPage] = useState('overview')
  const chain = useChainData()

  function renderPage() {
    switch (page) {
      case 'overview':  return <OverviewPage chain={chain} />
      case 'blocks':    return <BlocksPage chain={chain} />
      case 'charts':    return <ChartsPage chain={chain} />
      case 'ecosystem': return <EcosystemPage />
      case 'dex':       return <DexPage />
      case 'yields':    return <YieldsPage />
      case 'wallet':    return <WalletPage />
      case 'watchlist': return <WatchlistPage />
      default:          return <OverviewPage chain={chain} />
    }
  }

  const meta = PAGE_META[page]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={page} onNav={setPage} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Signature heartbeat bar */}
        <HeartbeatBar tpsHistory={chain.tpsHistory} tps={chain.tps} status={chain.status} />

        {/* Page header */}
        <div style={{
          padding: '18px 28px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'rgba(7,5,15,0.8)',
          backdropFilter: 'blur(8px)',
        }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              {meta.title}
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              {meta.sub}
            </p>
          </div>
          {chain.lastUpdated && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              {new Date(chain.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {renderPage()}
        </div>
      </div>
    </div>
  )
}
