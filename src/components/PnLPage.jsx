import { useState, useCallback } from 'react'
import { Search, TrendingUp, TrendingDown, ArrowUp, ArrowDown, ExternalLink, Info, RefreshCw } from 'lucide-react'
import { shortAddress, formatTime, weiToMon } from '../lib/monad.js'
import { getPrimaryName } from '../lib/nns.js'
import { resolveNadName } from '../lib/nns.js'
import { classifyWallet } from '../lib/whales.js'
import Section from './Section.jsx'

const RPC = 'https://rpc2.monad.xyz'

async function rpc(method, params = []) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.result
}

// Scan recent blocks for all txs involving this address
async function scanWalletActivity(address, blockWindow = 200) {
  const latestHex = await rpc('eth_blockNumber')
  const latest = parseInt(latestHex, 16)
  const from = Math.max(0, latest - blockWindow)

  const txs = []
  // Batch requests for speed
  const BATCH = 20
  for (let b = latest; b >= from && txs.length < 200; b -= BATCH) {
    const batchReqs = []
    for (let i = 0; i < BATCH && b - i >= from; i++) {
      batchReqs.push({
        jsonrpc: '2.0', id: i,
        method: 'eth_getBlockByNumber',
        params: ['0x' + (b - i).toString(16), true],
      })
    }
    try {
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchReqs),
      })
      const results = await res.json()
      const blocks = Array.isArray(results) ? results.map(r => r.result).filter(Boolean) : []
      for (const block of blocks) {
        if (!block?.transactions) continue
        const ts = parseInt(block.timestamp, 16)
        const blockNum = parseInt(block.number, 16)
        for (const tx of block.transactions) {
          const addr = address.toLowerCase()
          const isFrom = tx.from?.toLowerCase() === addr
          const isTo   = tx.to?.toLowerCase() === addr
          if (!isFrom && !isTo) continue
          const value = parseInt(tx.value || '0x0', 16)
          const gasPrice = parseInt(tx.gasPrice || '0x0', 16)
          const gasUsed = tx.gas ? parseInt(tx.gas, 16) : 21000
          const gasCost = isFrom ? gasPrice * gasUsed : 0
          txs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value,
            gasCost,
            blockNum,
            timestamp: ts,
            direction: isFrom ? 'out' : 'in',
            isContractCall: tx.input && tx.input !== '0x',
          })
        }
      }
    } catch { break }
  }
  return txs
}

async function computePnL(address) {
  const [balance, txs, nadName] = await Promise.all([
    rpc('eth_getBalance', [address, 'latest']).then(h => parseInt(h, 16)),
    scanWalletActivity(address, 500),
    getPrimaryName(address).catch(() => null),
  ])

  const balanceMON = balance / 1e18

  // Money in = all received MON
  const totalIn = txs
    .filter(t => t.direction === 'in')
    .reduce((s, t) => s + t.value, 0) / 1e18

  // Money out = all sent MON + gas costs
  const totalOutRaw = txs
    .filter(t => t.direction === 'out')
    .reduce((s, t) => s + t.value, 0) / 1e18
  const totalGas = txs
    .filter(t => t.direction === 'out')
    .reduce((s, t) => s + t.gasCost, 0) / 1e18

  // Net flow = what came in minus what went out (excluding gas)
  const netFlow = totalIn - totalOutRaw

  // Largest single transactions
  const largestIn  = [...txs].filter(t => t.direction === 'in').sort((a, b) => b.value - a.value)[0]
  const largestOut = [...txs].filter(t => t.direction === 'out').sort((a, b) => b.value - a.value)[0]

  // Activity breakdown
  const contractCalls = txs.filter(t => t.isContractCall && t.direction === 'out').length
  const transfers     = txs.filter(t => !t.isContractCall).length

  // Daily activity (last 7 days)
  const now = Math.floor(Date.now() / 1000)
  const dailyActivity = []
  for (let d = 6; d >= 0; d--) {
    const dayStart = now - (d + 1) * 86400
    const dayEnd   = now - d * 86400
    const dayTxs   = txs.filter(t => t.timestamp >= dayStart && t.timestamp < dayEnd)
    const label    = new Date((now - d * 86400) * 1000).toLocaleDateString('en-US', { weekday: 'short' })
    dailyActivity.push({
      label,
      txCount: dayTxs.length,
      inFlow: dayTxs.filter(t => t.direction === 'in').reduce((s, t) => s + t.value, 0) / 1e18,
      outFlow: dayTxs.filter(t => t.direction === 'out').reduce((s, t) => s + t.value, 0) / 1e18,
    })
  }

  const classification = classifyWallet(txs.length)

  return {
    address,
    nadName,
    balanceMON,
    totalIn,
    totalOut: totalOutRaw,
    totalGas,
    netFlow,
    txCount: txs.length,
    contractCalls,
    transfers,
    recentTxs: txs.slice(0, 25),
    largestIn,
    largestOut,
    dailyActivity,
    classification,
    scannedBlocks: 500,
  }
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function DailyChart({ data }) {
  if (!data?.length) return null
  const maxVal = Math.max(...data.map(d => Math.max(d.inFlow, d.outFlow)), 0.001)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px', marginTop: '8px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '60px' }}>
            <div style={{ flex: 1, background: 'var(--green)', borderRadius: '2px 2px 0 0', height: `${(d.inFlow / maxVal) * 100}%`, minHeight: d.inFlow > 0 ? '2px' : '0', opacity: 0.8 }} />
            <div style={{ flex: 1, background: 'var(--red)', borderRadius: '2px 2px 0 0', height: `${(d.outFlow / maxVal) * 100}%`, minHeight: d.outFlow > 0 ? '2px' : '0', opacity: 0.7 }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PnLPage() {
  const [input,   setInput]   = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const analyze = useCallback(async (addr) => {
    let address = (addr || input).trim()
    if (!address) return

    // .nad resolution
    if (!address.startsWith('0x') || address.endsWith('.nad')) {
      try {
        const resolved = await resolveNadName(address)
        if (resolved?.address) address = resolved.address
        else { setError('.nad name not found.'); return }
      } catch { setError('Could not resolve name.'); return }
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Enter a valid 0x address or .nad name.')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)
    try {
      const data = await computePnL(address)
      setResult(data)
    } catch (e) {
      setError('Analysis failed: ' + e.message)
    }
    setLoading(false)
  }, [input])

  const isPositive = (result?.netFlow || 0) >= 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header description */}
      <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(131,110,249,0.06)', border: '1px solid rgba(131,110,249,0.15)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Info size={15} color="var(--purple)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--purple-bright)' }}>Wallet P&L Tracker</strong> — Enter any Monad address or .nad name to see their MON flow, activity breakdown, largest transactions, and daily patterns. Scans the last 500 blocks for activity. No sign-in required.
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: '280px',
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--bg-card)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          transition: 'border-color 0.2s',
        }}
        onFocusCapture={e => { if (!error) e.currentTarget.style.borderColor = 'var(--purple)' }}
        onBlurCapture={e => { if (!error) e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="0x address or .nad name (e.g. salmo.nad)"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
          />
        </div>
        <button onClick={() => analyze()} disabled={loading} style={{
          padding: '10px 24px', background: 'var(--purple)', border: 'none',
          borderRadius: 'var(--radius-md)', color: '#fff',
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
          cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
          display: 'flex', alignItems: 'center', gap: '7px', transition: 'opacity 0.15s',
        }}>
          {loading ? <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pnlSpin 0.7s linear infinite' }} /> : <TrendingUp size={14} />}
          {loading ? 'Scanning…' : 'Analyze'}
        </button>
      </div>

      {error && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--red)', padding: '0 2px' }}>{error}</div>}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid var(--purple)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pnlSpin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Scanning on-chain activity…
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Reading last 500 blocks · This takes 10–20 seconds
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fade-in 0.4s ease' }}>
          {/* Wallet identity */}
          <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={16} color="var(--purple)" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--purple-bright)', fontWeight: 700 }}>{shortAddress(result.address)}</span>
                  {result.nadName && (
                    <span style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                      @{result.nadName}
                    </span>
                  )}
                  {result.classification && (
                    <span style={{ background: `${result.classification.color}18`, color: result.classification.color, fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {result.classification.label}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {result.txCount} txns in last {result.scannedBlocks} blocks scanned
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => analyze(result.address)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)', fontSize: '11px', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
              <a href={`https://monadvision.com/address/${result.address}`} target="_blank" rel="noreferrer"
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)', fontSize: '11px' }}>
                Explorer <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* P&L hero cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Current Balance', value: result.balanceMON.toFixed(4) + ' MON', color: 'var(--purple-bright)', bg: 'var(--purple-dim)' },
              { label: 'Total MON In', value: '+' + result.totalIn.toFixed(4), color: 'var(--green)', bg: 'var(--green-dim)' },
              { label: 'Total MON Out', value: '-' + result.totalOut.toFixed(4), color: 'var(--red)', bg: 'var(--red-dim)' },
              { label: 'Net Flow', value: (result.netFlow >= 0 ? '+' : '') + result.netFlow.toFixed(4), color: isPositive ? 'var(--green)' : 'var(--red)', bg: isPositive ? 'var(--green-dim)' : 'var(--red-dim)' },
              { label: 'Gas Spent', value: result.totalGas.toFixed(6) + ' MON', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: item.color, opacity: 0.5 }} />
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: item.color, letterSpacing: '-0.02em' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Charts + breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Daily activity */}
            <Section title="7-Day Activity" subtitle="Green = in · Red = out">
              <DailyChart data={result.dailyActivity} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                {[
                  { label: 'Total Txns', value: result.txCount },
                  { label: 'Contract Calls', value: result.contractCalls },
                  { label: 'Transfers', value: result.transfers },
                ].map(item => (
                  <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Largest txns */}
            <Section title="Biggest Transactions" subtitle="Largest single MON movements">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Largest Received', tx: result.largestIn, icon: ArrowDown, color: 'var(--green)' },
                  { label: 'Largest Sent', tx: result.largestOut, icon: ArrowUp, color: 'var(--red)' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '12px 14px', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{item.label}</div>
                    {item.tx ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: item.color }}>
                            {(item.tx.value / 1e18).toFixed(4)} MON
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {formatTime(item.tx.timestamp)}
                          </div>
                        </div>
                        <a href={`https://monadvision.com/tx/${item.tx.hash}`} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--text-muted)' }}>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>None found in window</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Recent transactions */}
          <Section title="Recent Transactions" subtitle={`${result.recentTxs.length} most recent in scanned window`} noPad>
            {result.recentTxs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                No transactions found in scanned window
              </div>
            ) : (
              <div>
                {result.recentTxs.map((tx, i) => {
                  const monVal = (tx.value / 1e18).toFixed(4)
                  const isIn = tx.direction === 'in'
                  return (
                    <div key={tx.hash || i} style={{
                      display: 'grid', gridTemplateColumns: '26px 1fr 110px 80px 32px',
                      alignItems: 'center', gap: '10px',
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.025)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: isIn ? 'var(--green-dim)' : 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isIn ? <ArrowDown size={11} color="var(--green)" /> : <ArrowUp size={11} color="var(--red)" />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isIn ? `From ${shortAddress(tx.from)}` : `To ${shortAddress(tx.to)}`}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          Block #{tx.blockNum?.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: isIn ? 'var(--green)' : 'var(--red)' }}>
                          {isIn ? '+' : '-'}{monVal} MON
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {formatTime(tx.timestamp)}
                      </div>
                      <a href={`https://monadvision.com/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Disclaimer */}
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Data is based on scanning the last 500 blocks (~8 minutes at 1s blocks). Full historical P&L requires an indexer. For complete history, view on MonadVision. This is not financial advice.
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div style={{ padding: '48px 32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <TrendingUp size={32} color="var(--text-muted)" style={{ marginBottom: '14px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Track any wallet's MON flow
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
            Enter a Monad address or .nad name to see their balance, total MON in/out, gas spent, net flow, and recent transaction history.
          </div>
        </div>
      )}

      <style>{`@keyframes pnlSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
