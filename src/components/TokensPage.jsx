import { useState, useEffect } from 'react'
import { ExternalLink, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { formatUSD } from '../lib/monad.js'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'

async function fetchMonadTokens() {
  // DefiLlama coins API for tokens on Monad
  // Also fetch from protocols to get token info
  const [coinsRes, protocolsRes] = await Promise.allSettled([
    fetch('https://coins.llama.fi/prices/current/coingecko:monad-ecosystem,coingecko:shmonad,coingecko:apr-token').then(r => r.json()),
    fetch('https://api.llama.fi/protocols').then(r => r.json()),
  ])

  const tokens = []

  // Extract from protocol tokens field
  if (protocolsRes.status === 'fulfilled') {
    const monadProtos = protocolsRes.value.filter(p => p.chains?.includes('Monad') && p.symbol)
    monadProtos.forEach(p => {
      if (p.symbol && p.tvl > 0) {
        tokens.push({
          id: p.slug,
          name: p.name,
          symbol: p.symbol?.toUpperCase(),
          logo: p.logo,
          tvl: p.tvl,
          mcap: p.mcap,
          price: p.price || null,
          change1d: p.change_1d,
          change7d: p.change_7d,
          category: p.category,
        })
      }
    })
  }

  // Deduplicate by symbol
  const seen = new Set()
  return tokens.filter(t => {
    if (seen.has(t.symbol)) return false
    seen.add(t.symbol)
    return true
  }).sort((a, b) => (b.tvl || 0) - (a.tvl || 0)).slice(0, 40)
}

function TokenRow({ token, rank }) {
  const isUp = (token.change1d || 0) > 0
  const mcapTvl = token.mcap && token.tvl ? (token.mcap / token.tvl).toFixed(2) : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 1fr 100px 90px 80px 80px 36px',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {token.logo
          ? <img src={token.logo} alt="" width={22} height={22} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
          : <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--purple)' }}>{token.symbol?.[0]}</span>
            </div>
        }
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{token.symbol}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.name}</div>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {token.price ? `$${token.price.toFixed(token.price < 0.01 ? 6 : 4)}` : '—'}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatUSD(token.tvl)}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        {token.mcap ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {formatUSD(token.mcap)}
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
        {token.change1d != null ? (
          <>
            {isUp ? <TrendingUp size={10} color="var(--green)" /> : <TrendingDown size={10} color="var(--red)" />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: isUp ? 'var(--green)' : 'var(--red)' }}>
              {isUp ? '+' : ''}{token.change1d?.toFixed(1)}%
            </span>
          </>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
      </div>

      <a href={`https://defillama.com/protocol/${token.id}`} target="_blank" rel="noreferrer"
        style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

export default function TokensPage() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchMonadTokens()
      .then(setTokens)
      .catch(() => setTokens([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = tokens.filter(t =>
    !filter || t.symbol?.toLowerCase().includes(filter.toLowerCase()) || t.name?.toLowerCase().includes(filter.toLowerCase())
  )

  const totalMcap = tokens.reduce((s, t) => s + (t.mcap || 0), 0)
  const totalTVL  = tokens.reduce((s, t) => s + (t.tvl || 0), 0)
  const topGainer = [...tokens].sort((a, b) => (b.change1d || 0) - (a.change1d || 0))[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <StatCard label="Tokens Tracked" value={tokens.length} loading={loading} sub="Protocol tokens on Monad" />
        <StatCard label="Total Mcap" value={totalMcap ? totalMcap / 1e6 : null} prefix="$" suffix="M" decimals={2} loading={loading} />
        <StatCard label="Total TVL" value={totalTVL ? totalTVL / 1e6 : null} prefix="$" suffix="M" decimals={2} loading={loading} accent="var(--purple)" />
        <StatCard label="Top Gainer" value={topGainer?.symbol || '—'} loading={loading}
          sub={topGainer?.change1d != null ? `+${topGainer.change1d.toFixed(1)}% today` : ''}
          accent="var(--green)" />
      </div>

      {/* Token table */}
      <Section
        title="Monad Token Tracker"
        subtitle="Protocol tokens with TVL on Monad — source: DefiLlama"
        noPad
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 10px' }}>
            <Search size={12} color="var(--text-muted)" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter tokens…"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', width: '120px' }}
            />
          </div>
        }
      >
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 100px 90px 80px 80px 36px', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          {['#', 'Token', 'Price', 'TVL', 'Mcap', '24h %', ''].map(h => (
            <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Price' || h === 'TVL' || h === 'Mcap' || h === '24h %' ? 'right' : h === '#' || h === '' ? 'center' : 'left' }}>{h}</span>
          ))}
        </div>

        {loading
          ? Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '44px', margin: '4px 16px', borderRadius: '6px' }} />)
          : filtered.length === 0
            ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                {filter ? 'NO TOKENS MATCH FILTER' : 'NO TOKEN DATA AVAILABLE'}
              </div>
            : filtered.map((t, i) => <TokenRow key={t.id} token={t} rank={i + 1} />)
        }
      </Section>

      {/* Data notice */}
      <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(131,110,249,0.05)', border: '1px solid rgba(131,110,249,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Token data sourced from DefiLlama's protocol database. Only tokens with TVL on Monad mainnet are shown.
          Price data may not be available for all tokens. For real-time price feeds, individual tokens can be tracked via CoinGecko.
        </span>
      </div>
    </div>
  )
}
