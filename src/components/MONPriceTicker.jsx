import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, X, ExternalLink } from 'lucide-react'
import { createPortal } from 'react-dom'

async function fetchMONPrice() {
  // Primary: CoinGecko free API (no key needed, rate limited to 30 req/min)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=monad&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true',
      { signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.monad?.usd) return {
        price:     data.monad.usd,
        change24h: data.monad.usd_24h_change ?? null,
        marketCap: data.monad.usd_market_cap ?? null,
        volume24h: data.monad.usd_24h_vol    ?? null,
      }
    }
  } catch {}
  // Fallback: DefiLlama (no rate limit, slightly delayed)
  try {
    const res = await fetch('https://coins.llama.fi/prices/current/coingecko:monad', { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const data = await res.json()
      const entry = Object.values(data?.coins || {})[0]
      if (entry?.price) return { price: entry.price, change24h: null, marketCap: null, volume24h: null }
    }
  } catch {}
  return null
}

// ── Expanded price modal ──────────────────────────────────────────────────────
function PriceModal({ data, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isUp = (data.change24h ?? 0) >= 0

  function fmt(n, decimals = 2, prefix = '$') {
    if (!n && n !== 0) return '—'
    if (n >= 1e9) return prefix + (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return prefix + (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return prefix + (n / 1e3).toFixed(2) + 'K'
    return prefix + n.toFixed(decimals)
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '60px 24px 0' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '280px', background: '#0F0D1A', border: '1px solid #3D3460', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.7)', animation: 'fade-in 0.15s ease' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #251F3D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #5B47D4, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, color: '#fff' }}>M</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: '#F0EEFF' }}>Monad (MON)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#4A4268', letterSpacing: '0.1em' }}>MONAD MAINNET</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4A4268', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        {/* Price */}
        <div style={{ padding: '18px 18px 14px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 800, color: '#F0EEFF', letterSpacing: '-0.03em', marginBottom: '6px' }}>
            ${data.price < 0.01 ? data.price.toFixed(6) : data.price < 1 ? data.price.toFixed(4) : data.price.toFixed(2)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isUp ? <TrendingUp size={13} color="var(--green)" /> : <TrendingDown size={13} color="var(--red)" />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--red)' }}>
              {data.change24h != null ? `${isUp ? '+' : ''}${data.change24h.toFixed(2)}%` : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#4A4268' }}>24h</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Market Cap',   value: fmt(data.marketCap) },
            { label: '24h Volume',   value: fmt(data.volume24h) },
            { label: 'Source',       value: 'CoinGecko' },
            { label: 'Updates',      value: 'Every 60s' },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px', border: '1px solid #251F3D' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: '#4A4268', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, color: '#F0EEFF' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div style={{ padding: '0 14px 14px', display: 'flex', gap: '6px' }}>
          <a href="https://www.coingecko.com/en/coins/monad" target="_blank" rel="noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', background: 'rgba(131,110,249,0.08)', border: '1px solid rgba(131,110,249,0.2)', borderRadius: '7px', color: 'var(--purple)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600 }}>
            CoinGecko <ExternalLink size={10} />
          </a>
          <a href="https://coinmarketcap.com/currencies/monad/" target="_blank" rel="noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '7px', color: 'var(--green)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600 }}>
            CMC <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main ticker ───────────────────────────────────────────────────────────────
export default function MONPriceTicker() {
  const [priceData, setPriceData] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState(false)

  useEffect(() => {
    async function load() {
      const data = await fetchMONPrice()
      if (data?.price) setPriceData(data)
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="skeleton" style={{ width: '90px', height: '20px', borderRadius: '4px' }} />
  if (!priceData) return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>MON —</div>

  const { price, change24h } = priceData
  const change = change24h ?? 0
  const isUp   = change >= 0

  return (
    <>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 6px', borderRadius: '6px', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(131,110,249,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--purple)', boxShadow: '0 0 5px var(--purple)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>MON</span>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          ${price < 0.01 ? price.toFixed(6) : price < 1 ? price.toFixed(4) : price.toFixed(2)}
        </span>
        {change24h != null && Math.abs(change) > 0.001 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {isUp ? <TrendingUp size={9} color="var(--green)" /> : <TrendingDown size={9} color="var(--red)" />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )}
      </button>
      {expanded && <PriceModal data={priceData} onClose={() => setExpanded(false)} />}
    </>
  )
}
