import { useState, useEffect } from 'react'
import { Activity, Zap, Database, Fuel, Clock, Hash, ArrowUpRight, Menu } from 'lucide-react'
import { useChainData } from './hooks/useChainData.js'
import { useEcosystemData } from './hooks/useDefiData.js'
import { shortAddress, formatTime, formatUSD } from './lib/monad.js'
import { addToWatchlist } from './lib/whales.js'
import HeartbeatBar    from './components/HeartbeatBar.jsx'
import Sidebar         from './components/Sidebar.jsx'
import StatCard        from './components/StatCard.jsx'
import TPSChart        from './components/TPSChart.jsx'
import BlockChart      from './components/BlockChart.jsx'
import BlocksTable     from './components/BlocksTable.jsx'
import WalletLookup    from './components/WalletLookup.jsx'
import Section         from './components/Section.jsx'
import EcosystemPage   from './components/EcosystemPage.jsx'
import DexPage         from './components/DexPage.jsx'
import YieldsPage      from './components/YieldsPage.jsx'
import StablesPage     from './components/StablesPage.jsx'
import FeesPage        from './components/FeesPage.jsx'
import PnLPage         from './components/PnLPage.jsx'
import WatchlistPage   from './components/WatchlistPage.jsx'
import ExecutionPage   from './components/ExecutionPage.jsx'
import LeaderboardPage from './components/LeaderboardPage.jsx'
import TokensPage      from './components/TokensPage.jsx'
import GlobalSearch    from './components/GlobalSearch.jsx'
import GrantsBanner    from './components/GrantsBanner.jsx'
import ShareCard       from './components/ShareCard.jsx'
import ActivityFeed    from './components/ActivityFeed.jsx'
import AlertsSystem    from './components/AlertsSystem.jsx'
import ErrorBoundary   from './components/ErrorBoundary.jsx'
import MONPriceTicker  from './components/MONPriceTicker.jsx'

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function OverviewPage({ chain }) {
  const loading = chain.status === 'connecting'
  const lb = chain.latestBlock
  const eco = useEcosystemData()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GrantsBanner />

      {/* Chain stats */}
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
        <StatCard label="Block Time" value={chain.blockTime} unit="sec"
          decimals={2} sub="Avg of last 10 blocks" accent="var(--green)" loading={loading} icon={Clock} />
      </div>

      {/* Ecosystem summary strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px',
        padding: '14px 18px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}>
        {[
          { label: 'Ecosystem TVL', value: eco.tvl ? `$${(eco.tvl/1e6).toFixed(1)}M` : '—', color: 'var(--purple)' },
          { label: 'DEX Volume 24h', value: eco.dex?.total24h ? `$${(eco.dex.total24h/1e6).toFixed(1)}M` : '—', color: 'var(--green)' },
          { label: 'Stablecoin Supply', value: eco.stables?.current ? `$${(eco.stables.current/1e6).toFixed(1)}M` : '—', color: 'var(--blue)' },
          { label: 'Protocol Fees 24h', value: eco.fees?.total24h ? `$${(eco.fees.total24h/1e3).toFixed(1)}K` : '—', color: 'var(--yellow)' },
          { label: 'Active Protocols', value: eco.protocols?.length ? `${eco.protocols.length}` : '—', color: 'var(--text-secondary)' },
          { label: 'Block Height', value: chain.latestBlock?.number ? chain.latestBlock.number.toLocaleString() : '—', color: 'var(--text-secondary)' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: item.color, letterSpacing: '-0.02em' }}>
              {eco.loading ? <span className="skeleton" style={{ display: 'inline-block', width: '60px', height: '20px', verticalAlign: 'middle' }} /> : item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
        <Section title="Live TPS" subtitle="Transactions per second — updates every 2s">
          <TPSChart data={chain.tpsHistory} loading={loading} />
        </Section>
        <Section title="Gas Utilization" subtitle="Per-block usage %">
          <BlockChart data={chain.blockHistory} loading={loading} />
        </Section>
      </div>

      {/* Latest block */}
      {lb && (
        <Section title="Latest Block" subtitle={`#${lb.number?.toLocaleString()}`}
          action={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ShareCard type="chain" label="Share" data={{ tps: chain.tps, blockNumber: lb.number, gasPrice: chain.gasPrice, tvl: eco.tvl ? `$${(eco.tvl/1e6).toFixed(1)}M` : '—' }} />
              <a href={`https://monadvision.com/block/${lb.number}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--purple)', fontSize: '12px', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
                Explorer <ArrowUpRight size={12} />
              </a>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Block Hash',   value: shortAddress(lb.hash),                 mono: true },
              { label: 'Transactions', value: lb.txCount?.toLocaleString() },
              { label: 'Gas Used',     value: (lb.gasUsed / 1e6).toFixed(2) + 'M' },
              { label: 'Gas Limit',    value: (lb.gasLimit / 1e6).toFixed(2) + 'M' },
              { label: 'Validator',    value: shortAddress(lb.miner),                mono: true },
              { label: 'Timestamp',    value: formatTime(lb.timestamp) },
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

function BlocksPage({ chain }) {
  const loading = chain.status === 'connecting'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Section title="Live Block Feed" subtitle="Updates every ~1 second" noPad
        action={<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80', animation: 'pulse-dot 2s ease infinite' }} /><span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>LIVE</span></div>}
      >
        <BlocksTable blocks={chain.recentBlocks} loading={loading} />
      </Section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Section title="Gas Utilization"><BlockChart data={chain.blockHistory} loading={loading} /></Section>
        <Section title="TPS History"><TPSChart data={chain.tpsHistory} loading={loading} /></Section>
      </div>
    </div>
  )
}

function ChartsPage({ chain }) {
  const loading = chain.status === 'connecting'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Section title="Transactions Per Second" subtitle="Live rolling TPS from Monad RPC">
        <TPSChart data={chain.tpsHistory} loading={loading} />
      </Section>
      <Section title="Block Gas Utilization" subtitle="Closer to 100% = higher demand">
        <BlockChart data={chain.blockHistory} loading={loading} />
      </Section>
    </div>
  )
}

function WalletPage({ prefillAddress }) {
  return (
    <div style={{ maxWidth: '680px' }}>
      <Section title="Wallet Inspector" subtitle="Full on-chain data — balance, history, tokens, age">
        <WalletLookup prefillAddress={prefillAddress} />
      </Section>
    </div>
  )
}

// ── PAGE META ─────────────────────────────────────────────────────────────────
const PAGE_META = {
  overview:    { title: 'Overview',      sub: 'Live Monad chain metrics + ecosystem summary',    src: 'rpc' },
  blocks:      { title: 'Blocks',        sub: 'Real-time block feed',                            src: 'rpc' },
  charts:      { title: 'Live Charts',   sub: 'TPS & gas analytics',                            src: 'rpc' },
  execution:   { title: 'Execution',     sub: "Monad's parallel execution — visualized live",    src: 'rpc' },
  ecosystem:   { title: 'Ecosystem',     sub: 'TVL, protocols & stablecoins — DefiLlama',        src: 'defillama' },
  dex:         { title: 'DEX Volume',    sub: 'Swap activity on Monad — DefiLlama',              src: 'defillama' },
  yields:      { title: 'Yields',        sub: 'Live APY pools on Monad — DefiLlama',             src: 'defillama' },
  stables:     { title: 'Stablecoins',   sub: 'Stablecoin supply history — DefiLlama',           src: 'defillama' },
  fees:        { title: 'Protocol Fees', sub: 'Revenue generated by Monad protocols — DefiLlama',src: 'defillama' },
  tokens:      { title: 'Tokens',        sub: 'Protocol tokens on Monad — DefiLlama',            src: 'defillama' },
  leaderboard: { title: 'Leaderboard',   sub: 'Top protocols by TVL & 24h movement',             src: 'defillama' },
  feed:        { title: 'Live Feed',     sub: 'Real-time transaction feed from Monad blocks',    src: 'rpc' },
  alerts:      { title: 'Alerts',        sub: 'Browser notifications for wallet activity',       src: 'rpc' },
  pnl:         { title: 'P&L Tracker',    sub: 'Wallet profit & loss — MON in/out, net flow, activity',src: 'rpc' },
  wallet:      { title: 'Wallet',        sub: 'Inspect any Monad address — full on-chain data',  src: 'rpc' },
  watchlist:   { title: 'Watchlist',     sub: 'Track & tag wallets — saved in your browser',     src: 'rpc' },
}

function DataBadge({ src }) {
  const cfg = { rpc: { label: 'Monad RPC', color: 'var(--purple)' }, defillama: { label: 'DefiLlama', color: 'var(--green)' } }
  const b = cfg[src] || cfg.rpc
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: b.color, letterSpacing: '0.08em' }}>
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: b.color }} />
      {b.label}
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]               = useState('overview')
  const [walletPrefill, setWalletPrefill] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 768)
  const chain = useChainData()

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Keyboard navigation — only when not focused on an input
  useEffect(() => {
    const PAGE_ORDER = ['overview','blocks','charts','execution','ecosystem','dex','yields','stables','fees','tokens','leaderboard','feed','pnl','alerts','wallet','watchlist']
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '[' || (e.key === 'ArrowLeft' && e.altKey)) {
        e.preventDefault()
        const idx = PAGE_ORDER.indexOf(page)
        if (idx > 0) setPage(PAGE_ORDER[idx - 1])
      }
      if (e.key === ']' || (e.key === 'ArrowRight' && e.altKey)) {
        e.preventDefault()
        const idx = PAGE_ORDER.indexOf(page)
        if (idx < PAGE_ORDER.length - 1) setPage(PAGE_ORDER[idx + 1])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [page])

  function handleSearchNav(targetPage, data) {
    if (targetPage === 'wallet' && data)    setWalletPrefill(data)
    if (targetPage === 'watchlist' && data) addToWatchlist(data)
    setPage(targetPage)
  }

  function renderPage() {
    switch (page) {
      case 'overview':    return <OverviewPage chain={chain} />
      case 'blocks':      return <BlocksPage chain={chain} />
      case 'charts':      return <ChartsPage chain={chain} />
      case 'execution':   return <ExecutionPage />
      case 'ecosystem':   return <EcosystemPage />
      case 'dex':         return <DexPage />
      case 'yields':      return <YieldsPage />
      case 'stables':     return <StablesPage />
      case 'fees':        return <FeesPage />
      case 'tokens':      return <TokensPage />
      case 'leaderboard': return <LeaderboardPage />
      case 'feed':        return <ActivityFeed />
      case 'pnl':         return <PnLPage />
      case 'alerts':      return <AlertsSystem />
      case 'wallet':      return <WalletPage prefillAddress={walletPrefill} />
      case 'watchlist':   return <WatchlistPage />
      default:            return <OverviewPage chain={chain} />
    }
  }

  const meta = PAGE_META[page] || PAGE_META.overview

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {(!isMobile || sidebarOpen) && (
        <Sidebar active={page} onNav={p => { setPage(p); setSidebarOpen(false) }}
          mobile={isMobile} onClose={() => setSidebarOpen(false)} />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <HeartbeatBar tpsHistory={chain.tpsHistory} tps={chain.tps} status={chain.status} />

        {/* Header */}
        <div style={{
          padding: '10px 22px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'rgba(7,5,15,0.93)',
          backdropFilter: 'blur(12px)',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Menu size={16} />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.title}
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.sub}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <MONPriceTicker />
            {!isMobile && <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />}
            {!isMobile && <GlobalSearch onNavigate={handleSearchNav} />}
            <DataBadge src={meta.src} />
            {!isMobile && chain.lastUpdated && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                {new Date(chain.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Mobile search */}
        {isMobile && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <GlobalSearch onNavigate={handleSearchNav} />
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <ErrorBoundary key={page}>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
