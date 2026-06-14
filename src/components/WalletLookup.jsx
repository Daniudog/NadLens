import { useState, useEffect } from 'react'
import { Search, Wallet, ArrowUpRight, Plus, Copy, CheckCircle, Clock, ArrowUp, ArrowDown, ExternalLink, RefreshCw } from 'lucide-react'
import {
  getBalance, getTransactionCount, weiToMon,
  findFirstTxBlock, getBlock, getRecentTxsForAddress,
  getTokenTransfers, getLatestBlockNumber, shortAddress, formatTime
} from '../lib/monad.js'
import { resolveNadName, getPrimaryName } from '../lib/nns.js'
import { addToWatchlist, getLabel, classifyWallet } from '../lib/whales.js'

// ── Data fetcher ─────────────────────────────────────────────────────────────
async function fetchFullWalletData(address) {
  const results = await Promise.allSettled([
    getBalance(address),
    getTransactionCount(address),
    findFirstTxBlock(address),
    getRecentTxsForAddress(address, 100),
    getTokenTransfers(address),
    getLatestBlockNumber(),
    getPrimaryName(address),
  ])

  const balance  = results[0].status === 'fulfilled' ? results[0].value : 0
  const txCount  = results[1].status === 'fulfilled' ? results[1].value : 0
  const firstBlk = results[2].status === 'fulfilled' ? results[2].value : null
  const recentTxs= results[3].status === 'fulfilled' ? results[3].value : []
  const tokenData= results[4].status === 'fulfilled' ? results[4].value : { logs: [], tokenContracts: [] }
  const latest   = results[5].status === 'fulfilled' ? results[5].value : 0

  // Get block info for first tx to calculate wallet age
  let firstBlockData = null
  if (firstBlk) {
    try { firstBlockData = await getBlock(firstBlk) } catch {}
  }

  // Calculate stats from recent txs
  const outTxs = recentTxs.filter(t => t.direction === 'out')
  const inTxs  = recentTxs.filter(t => t.direction === 'in')
  const highestTx = recentTxs.reduce((max, t) => t.value > max ? t.value : max, 0)
  const totalOut  = outTxs.reduce((s, t) => s + t.value, 0)
  const totalIn   = inTxs.reduce((s, t) => s + t.value, 0)
  const avgGas    = recentTxs.length > 0
    ? recentTxs.reduce((s, t) => s + t.gasPrice, 0) / recentTxs.length / 1e9
    : 0

  // Wallet age
  let createdDate = null
  let ageBlocks = null
  if (firstBlockData) {
    const ts = parseInt(firstBlockData.timestamp, 16)
    createdDate = new Date(ts * 1000)
    ageBlocks = latest - firstBlk
  }

  const nadName = results[6].status === 'fulfilled' ? results[6].value : null

  return {
    balance: parseFloat(weiToMon(balance)),
    txCount,
    firstBlock: firstBlk,
    createdDate,
    ageBlocks,
    recentTxs,
    tokenContracts: tokenData.tokenContracts,
    tokenCount: tokenData.tokenContracts.length,
    highestTxValue: highestTx / 1e18,
    totalSent: totalOut / 1e18,
    totalReceived: totalIn / 1e18,
    avgGasPrice: avgGas,
    inTxCount: inTxs.length,
    outTxCount: outTxs.length,
    nadName,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DataRow({ label, value, mono = false, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', fontSize: '13px', fontWeight: mono ? 400 : 600, color: accent || (mono ? 'var(--purple-bright)' : 'var(--text-primary)') }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '4px', marginTop: '16px' }}>
      {children}
    </div>
  )
}

function TxRow({ tx }) {
  const isIn = tx.direction === 'in'
  const monVal = (tx.value / 1e18).toFixed(4)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: isIn ? 'var(--green-dim)' : 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isIn ? <ArrowDown size={12} color="var(--green)" /> : <ArrowUp size={12} color="var(--red)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isIn ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
          {isIn ? 'Received' : 'Sent'} · <span style={{ color: 'var(--text-muted)' }}>{formatTime(tx.timestamp)}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isIn ? `From ${shortAddress(tx.from)}` : `To ${shortAddress(tx.to)}`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: isIn ? 'var(--green)' : 'var(--red)' }}>
          {isIn ? '+' : '-'}{monVal}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>MON</div>
      </div>
      <a href={`https://monadvision.com/tx/${tx.hash}`} target="_blank" rel="noreferrer"
        style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WalletLookup({ prefillAddress }) {
  const [input, setInput]       = useState('')
  const [queried, setQueried]   = useState('')
  const [walletData, setWalletData] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [added, setAdded]       = useState(false)
  const [copied, setCopied]     = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab]           = useState('overview')

  // Prefill from search navigation
  useEffect(() => {
    if (prefillAddress && prefillAddress !== queried) {
      setInput(prefillAddress)
      lookup(prefillAddress)
    }
  }, [prefillAddress])

  async function lookup(addr) {
    let address = (addr || input).trim()
    // Resolve .nad name if needed
    if (!address.startsWith('0x') || address.endsWith('.nad')) {
      try {
        setError('')
        setLoading(true)
        const resolved = await resolveNadName(address)
        if (resolved?.address) {
          address = resolved.address
          setInput(resolved.name + ' → ' + shortAddress(address))
        } else {
          setError('.nad name not found — check spelling or try the full 0x address.')
          setLoading(false)
          return
        }
      } catch {
        setError('Could not resolve .nad name. Try the full 0x address.')
        setLoading(false)
        return
      }
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Invalid address — must be 0x followed by 40 hex characters, or a .nad name.')
      return
    }
    setError('')
    setQueried(address)
    setLoading(true)
    setWalletData(null)
    setAdded(false)
    setTab('overview')
    try {
      const data = await fetchFullWalletData(address)
      setWalletData(data)
    } catch (e) {
      setError('Failed to fetch wallet data: ' + e.message)
    }
    setLoading(false)
  }

  async function refresh() {
    if (!queried) return
    setRefreshing(true)
    try {
      const data = await fetchFullWalletData(queried)
      setWalletData(data)
    } catch {}
    setRefreshing(false)
  }

  async function copyAddr() {
    await navigator.clipboard.writeText(queried)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleAdd() { addToWatchlist(queried); setAdded(true) }

  const label = queried ? getLabel(queried) : null
  const classification = walletData ? classifyWallet(walletData.txCount) : null

  function formatAge(date) {
    if (!date) return '—'
    const days = Math.floor((Date.now() - date.getTime()) / 86400000)
    if (days < 1)  return 'Today'
    if (days === 1) return '1 day ago'
    if (days < 30)  return `${days} days ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${(days / 365).toFixed(1)} years ago`
  }

  const TABS = ['overview', 'transactions', 'tokens']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Search bar */}
      <div style={{
        display: 'flex', gap: '8px',
        background: 'var(--bg-base)',
        border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px', alignItems: 'center',
        transition: 'border-color 0.2s',
      }}
      onFocusCapture={e => { if (!error) e.currentTarget.style.borderColor = 'var(--purple)' }}
      onBlurCapture={e => { if (!error) e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && lookup()}
          placeholder="Address (0x…) or .nad name (e.g. salmo.nad)"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
        />
        <button onClick={() => lookup()} style={{
          background: 'var(--purple)', border: 'none', borderRadius: '6px',
          padding: '6px 14px', color: '#fff', fontFamily: 'var(--font-body)',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Look up
        </button>
      </div>

      {error && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--red)', padding: '0 2px' }}>{error}</div>}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
          <div style={{ width: '28px', height: '28px', border: '2px solid var(--purple)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            FETCHING WALLET DATA…
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Scanning recent blocks for transaction history
          </div>
        </div>
      )}

      {/* Results */}
      {walletData && !loading && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden', animation: 'fade-in 0.3s ease' }}>

          {/* Wallet header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(131,110,249,0.06) 0%, transparent 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                  <Wallet size={14} color="var(--purple)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--purple-bright)', fontWeight: 700 }}>
                    {shortAddress(queried)}
                  </span>
                  {classification && (
                    <span style={{ background: `${classification.color}18`, color: classification.color, fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {classification.label}
                    </span>
                  )}
                  {walletData?.nadName && (
                    <span style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      @ {walletData.nadName}
                    </span>
                  )}
                  {label && (
                    <span style={{ background: 'var(--purple-dim)', color: 'var(--purple-bright)', fontFamily: 'var(--font-body)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      {label.name}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {queried}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                <button onClick={refresh} title="Refresh" style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', color: refreshing ? 'var(--purple)' : 'var(--text-muted)', transition: 'all 0.15s', display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                </button>
                <button onClick={copyAddr} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 9px', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-muted)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)', fontSize: '11px' }}>
                  {copied ? <CheckCircle size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={handleAdd} disabled={added} style={{ background: added ? 'var(--green-dim)' : 'transparent', border: `1px solid ${added ? 'var(--green)' : 'var(--border)'}`, borderRadius: '6px', padding: '6px 9px', cursor: added ? 'default' : 'pointer', color: added ? 'var(--green)' : 'var(--text-muted)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)', fontSize: '11px' }}>
                  <Plus size={12} /> {added ? 'Watching' : 'Watch'}
                </button>
                {walletData && (
                  <ShareCard type="wallet" label="Share" data={{
                    address: queried,
                    balance: walletData.balance,
                    txCount: walletData.txCount,
                    classification: walletData.classification?.label,
                  }} />
                )}
                <a href={`https://monadvision.com/address/${queried}`} target="_blank" rel="noreferrer" style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 9px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)', fontSize: '11px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  Explorer <ArrowUpRight size={11} />
                </a>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 18px',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t ? 'var(--purple)' : 'transparent'}`,
                color: tab === t ? 'var(--purple-bright)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                fontWeight: tab === t ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
              }}>
                {t}
                {t === 'transactions' && walletData.recentTxs.length > 0 && (
                  <span style={{ marginLeft: '5px', background: 'var(--purple-dim)', color: 'var(--purple)', fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' }}>
                    {walletData.recentTxs.length}
                  </span>
                )}
                {t === 'tokens' && walletData.tokenCount > 0 && (
                  <span style={{ marginLeft: '5px', background: 'var(--green-dim)', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' }}>
                    {walletData.tokenCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '16px 20px' }}>

            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div>
                {/* Hero stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                  {[
                    { label: 'MON Balance', value: walletData.balance?.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' MON', accent: 'var(--purple-bright)' },
                    { label: 'Total Transactions', value: walletData.txCount?.toLocaleString(), accent: 'var(--text-primary)' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--bg-base)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{item.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: item.accent, letterSpacing: '-0.02em' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <SectionTitle>Identity</SectionTitle>
                <DataRow label="Wallet Age" value={walletData.createdDate ? `${formatAge(walletData.createdDate)} (${walletData.createdDate.toLocaleDateString()})` : 'No transactions yet'} />
                <DataRow label="First Block" value={walletData.firstBlock ? `#${walletData.firstBlock.toLocaleString()}` : '—'} mono />
                <DataRow label="Wallet Type" value={classification?.label || '—'} accent={classification?.color} />
                <DataRow label="Known Label" value={label?.name || 'Unlabeled'} />

                <SectionTitle>Activity (Recent Blocks)</SectionTitle>
                <DataRow label="Sent Transactions" value={walletData.outTxCount?.toLocaleString()} />
                <DataRow label="Received Transactions" value={walletData.inTxCount?.toLocaleString()} />
                <DataRow label="Total Sent" value={walletData.totalSent > 0 ? walletData.totalSent.toFixed(4) + ' MON' : '0 MON'} />
                <DataRow label="Total Received" value={walletData.totalReceived > 0 ? walletData.totalReceived.toFixed(4) + ' MON' : '0 MON'} />
                <DataRow label="Highest Single Tx" value={walletData.highestTxValue > 0 ? walletData.highestTxValue.toFixed(4) + ' MON' : '—'} accent="var(--yellow)" />
                <DataRow label="Avg Gas Price" value={walletData.avgGasPrice > 0 ? walletData.avgGasPrice.toFixed(4) + ' Gwei' : '—'} />

                <SectionTitle>Tokens</SectionTitle>
                <DataRow label="Token Contracts Interacted" value={walletData.tokenCount > 0 ? walletData.tokenCount.toString() : '0'} />
                <div style={{ marginTop: '6px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {walletData.tokenCount > 0
                    ? `This wallet has interacted with ${walletData.tokenCount} ERC20 token contract${walletData.tokenCount !== 1 ? 's' : ''} in the scanned window.`
                    : 'No ERC20 token transfers found in the scanned block window.'
                  }
                </div>
              </div>
            )}

            {/* TRANSACTIONS TAB */}
            {tab === 'transactions' && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  {walletData.recentTxs.length > 0
                    ? `${walletData.recentTxs.length} RECENT TRANSACTIONS FOUND`
                    : 'NO RECENT TRANSACTIONS IN SCANNED WINDOW'
                  }
                </div>
                {walletData.recentTxs.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
                      No transactions found in the last 100 blocks.<br />
                      This address may be inactive or have only older history.
                    </div>
                    <a href={`https://monadvision.com/address/${queried}`} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: 'var(--purple)', fontFamily: 'var(--font-body)', fontSize: '12px', textDecoration: 'none' }}>
                      View full history on MonadVision <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  <div>
                    {walletData.recentTxs.map((tx, i) => <TxRow key={tx.hash || i} tx={tx} />)}
                    <a href={`https://monadvision.com/address/${queried}`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '12px', padding: '9px', background: 'rgba(131,110,249,0.06)', border: '1px solid rgba(131,110,249,0.15)', borderRadius: '8px', color: 'var(--purple)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600 }}>
                      View full history on MonadVision <ArrowUpRight size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* TOKENS TAB */}
            {tab === 'tokens' && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  {walletData.tokenCount > 0
                    ? `${walletData.tokenCount} TOKEN CONTRACT${walletData.tokenCount !== 1 ? 'S' : ''} FOUND`
                    : 'NO TOKEN TRANSFERS FOUND'
                  }
                </div>
                {walletData.tokenContracts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
                      No ERC20 token transfers detected in the scanned block window.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {walletData.tokenContracts.map((addr, i) => (
                      <div key={addr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--purple-bright)' }}>{shortAddress(addr)}</div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>ERC20 Token Contract</div>
                        </div>
                        <a href={`https://monadvision.com/address/${addr}`} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--text-muted)' }}>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ))}
                    <div style={{ marginTop: '8px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Token names and balances require a dedicated indexer. Full token data available on MonadVision.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!queried && !loading && (
        <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <Search size={24} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Enter any Monad address to inspect balance, transaction history,<br />tokens, wallet age, and activity stats.
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
