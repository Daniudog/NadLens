import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Wallet, ExternalLink, Copy, CheckCircle } from 'lucide-react'
import { getBalance, getTransactionCount, weiToMon, shortAddress, formatTime } from '../lib/monad.js'
import { resolveNadName, getPrimaryName } from '../lib/nns.js'
import { classifyWallet } from '../lib/whales.js'

const PORTFOLIO_KEY = 'nadlens_portfolio'

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || '[]') } catch { return [] }
}
function savePortfolio(p) {
  try { localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(p)) } catch {}
}

async function resolveAddress(input) {
  const trimmed = input.trim()
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    const nadName = await getPrimaryName(trimmed).catch(() => null)
    return { address: trimmed, nadName }
  }
  // Try .nad resolution
  const resolved = await resolveNadName(trimmed).catch(() => null)
  if (resolved?.address) return { address: resolved.address, nadName: resolved.name }
  return null
}

async function fetchWalletSnapshot(address) {
  const [balWei, txCount] = await Promise.all([
    getBalance(address),
    getTransactionCount(address),
  ])
  const balance = parseFloat(weiToMon(balWei))
  return { balance, txCount, fetchedAt: Date.now() }
}

// ── Wallet row in portfolio ───────────────────────────────────────────────────
function PortfolioRow({ entry, onRemove, monPrice, totalBalance }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const pct = data && totalBalance > 0 ? ((data.balance / totalBalance) * 100).toFixed(1) : null
  const usdVal = data && monPrice ? (data.balance * monPrice) : null
  const classification = data ? classifyWallet(data.txCount) : null

  useEffect(() => {
    fetchWalletSnapshot(entry.address)
      .then(setData)
      .catch(() => setData({ balance: 0, txCount: 0 }))
      .finally(() => setLoading(false))
  }, [entry.address])

  async function copy() {
    await navigator.clipboard.writeText(entry.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 110px 100px 80px 70px 70px',
      alignItems: 'center',
      gap: '10px',
      padding: '13px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wallet size={13} color="var(--purple)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {entry.label && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{entry.label}</span>
            )}
            {entry.nadName && (
              <span style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                @{entry.nadName}
              </span>
            )}
            {classification && !entry.label && (
              <span style={{ background: `${classification.color}18`, color: classification.color, fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                {classification.label}
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {shortAddress(entry.address)}
            <button onClick={copy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-muted)', padding: 0, display: 'flex' }}>
              {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div style={{ textAlign: 'right' }}>
        {loading
          ? <div className="skeleton" style={{ height: '16px', width: '70px', marginLeft: 'auto' }} />
          : <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--purple-bright)' }}>
              {data?.balance?.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginLeft: '3px' }}>MON</span>
            </div>
        }
      </div>

      {/* USD value */}
      <div style={{ textAlign: 'right' }}>
        {loading
          ? <div className="skeleton" style={{ height: '14px', width: '55px', marginLeft: 'auto' }} />
          : <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {usdVal != null ? `$${usdVal < 0.01 ? usdVal.toFixed(6) : usdVal < 1 ? usdVal.toFixed(4) : usdVal.toFixed(2)}` : '—'}
            </div>
        }
      </div>

      {/* Share % */}
      <div style={{ textAlign: 'right' }}>
        {!loading && pct && (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>{pct}%</div>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--purple)', borderRadius: '2px', transition: 'width 0.8s ease' }} />
            </div>
          </>
        )}
      </div>

      {/* Txns */}
      <div style={{ textAlign: 'right' }}>
        {loading
          ? <div className="skeleton" style={{ height: '14px', width: '40px', marginLeft: 'auto' }} />
          : <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {data?.txCount?.toLocaleString()}
            </div>
        }
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
        <a href={`https://monadvision.com/address/${entry.address}`} target="_blank" rel="noreferrer"
          style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}>
          <ExternalLink size={11} />
        </a>
        <button onClick={() => onRemove(entry.address)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '4px', display: 'flex', transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(loadPortfolio)
  const [input, setInput]         = useState('')
  const [label, setLabel]         = useState('')
  const [error, setError]         = useState('')
  const [adding, setAdding]       = useState(false)
  const [allData, setAllData]     = useState({})
  const [monPrice, setMonPrice]   = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch MON price
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=monad&vs_currencies=usd')
      .then(r => r.json())
      .then(d => { if (d?.monad?.usd) setMonPrice(d.monad.usd) })
      .catch(() => {})
  }, [])

  // Fetch all wallet balances for aggregate stats
  useEffect(() => {
    if (!portfolio.length) return
    async function fetchAll() {
      const results = {}
      await Promise.allSettled(
        portfolio.map(async e => {
          try {
            const data = await fetchWalletSnapshot(e.address)
            results[e.address] = data
          } catch {}
        })
      )
      setAllData(results)
    }
    fetchAll()
  }, [portfolio])

  const totalBalance = Object.values(allData).reduce((s, d) => s + (d?.balance || 0), 0)
  const totalUSD     = monPrice ? totalBalance * monPrice : null
  const totalTxns    = Object.values(allData).reduce((s, d) => s + (d?.txCount || 0), 0)

  async function handleAdd() {
    if (!input.trim()) return
    setAdding(true)
    setError('')
    try {
      const resolved = await resolveAddress(input)
      if (!resolved) { setError('Address not found. Try a 0x address or .nad name.'); setAdding(false); return }
      if (portfolio.find(e => e.address.toLowerCase() === resolved.address.toLowerCase())) {
        setError('Already in portfolio.'); setAdding(false); return
      }
      const next = [...portfolio, { address: resolved.address, nadName: resolved.nadName, label: label.trim(), addedAt: Date.now() }]
      setPortfolio(next)
      savePortfolio(next)
      setInput(''); setLabel('')
    } catch { setError('Failed to resolve address.') }
    setAdding(false)
  }

  function handleRemove(address) {
    const next = portfolio.filter(e => e.address.toLowerCase() !== address.toLowerCase())
    setPortfolio(next)
    savePortfolio(next)
    const updated = { ...allData }
    delete updated[address]
    setAllData(updated)
  }

  async function handleRefresh() {
    setRefreshing(true)
    const results = {}
    await Promise.allSettled(
      portfolio.map(async e => {
        try { results[e.address] = await fetchWalletSnapshot(e.address) } catch {}
      })
    )
    setAllData(results)
    setRefreshing(false)
  }

  function exportCSV() {
    const header = 'Address,Label,.nad Name,Balance (MON),USD Value,Transactions'
    const rows = portfolio.map(e => {
      const d = allData[e.address]
      const usd = d && monPrice ? (d.balance * monPrice).toFixed(4) : ''
      return `${e.address},${e.label || ''},${e.nadName || ''},${d?.balance || ''},${usd},${d?.txCount || ''}`
    }).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'nadlens-portfolio.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Aggregate stats */}
      {portfolio.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total Wallets',  value: portfolio.length.toString(),          color: 'var(--text-primary)' },
            { label: 'Total Balance',  value: totalBalance.toFixed(4) + ' MON',     color: 'var(--purple-bright)' },
            { label: 'USD Value',      value: totalUSD != null ? `$${totalUSD < 1 ? totalUSD.toFixed(4) : totalUSD.toFixed(2)}` : '—', color: 'var(--green)' },
            { label: 'Total Txns',     value: totalTxns.toLocaleString(),           color: 'var(--text-secondary)' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: item.color, letterSpacing: '-0.02em' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add wallet form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Add Wallet</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Track up to 20 wallets. Accepts 0x addresses or .nad names.
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            value={input} onChange={e => { setInput(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="0x address or .nad name"
            style={{ flex: '2 1 220px', padding: '9px 13px', background: 'var(--bg-base)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => { if (!error) e.target.style.borderColor = 'var(--purple)' }}
            onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)' }}
          />
          <input
            value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Label (e.g. Main wallet)"
            style={{ flex: '1 1 150px', padding: '9px 13px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--purple)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={handleAdd} disabled={adding || !input.trim()} style={{
            padding: '9px 20px', background: adding ? 'var(--border)' : 'var(--purple)', border: 'none',
            borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px',
            fontWeight: 600, cursor: adding ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'opacity 0.15s', opacity: (!input.trim() || adding) ? 0.5 : 1,
          }}>
            {adding ? <div style={{ width: '13px', height: '13px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'portfolioSpin 0.7s linear infinite' }} /> : <Plus size={14} />}
            Add
          </button>
        </div>
        {error && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--red)', marginTop: '8px' }}>{error}</div>}
      </div>

      {/* Wallet table */}
      {portfolio.length > 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Portfolio</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{portfolio.length} wallet{portfolio.length !== 1 ? 's' : ''} tracked</div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <RefreshCw size={12} style={{ animation: refreshing ? 'portfolioSpin 1s linear infinite' : 'none' }} />
                Refresh
              </button>
              <button onClick={exportCSV} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 80px 70px 70px', gap: '10px', padding: '8px 18px', borderBottom: '1px solid var(--border)' }}>
            {['Wallet', 'Balance', 'USD Value', 'Share', 'Txns', ''].map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: ['Balance','USD Value','Share','Txns'].includes(h) ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {portfolio.map(entry => (
            <PortfolioRow
              key={entry.address}
              entry={entry}
              onRemove={handleRemove}
              monPrice={monPrice}
              totalBalance={totalBalance}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '48px 32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <Wallet size={28} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            No wallets tracked yet
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto', lineHeight: 1.6 }}>
            Add Monad wallet addresses or .nad names to track their combined balance, USD value, and transaction activity in one place.
          </div>
        </div>
      )}
      <style>{`@keyframes portfolioSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
