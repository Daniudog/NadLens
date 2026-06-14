import { useState, useEffect, useRef } from 'react'
import { ArrowUp, ArrowDown, FileCode, Zap, ExternalLink } from 'lucide-react'
import { shortAddress, formatTime, weiToMon } from '../lib/monad.js'
import Section from './Section.jsx'

const RPC = 'https://rpc2.monad.xyz'

async function rpc(method, params = []) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  })
  const data = await res.json()
  return data.result
}

// Known Monad-native + common EVM contract selectors
const SWAP_SELECTORS = new Set([
  '0x38ed1739', // swapExactTokensForTokens (Uniswap V2)
  '0x7ff36ab5', // swapExactETHForTokens
  '0x18cbafe5', // swapExactTokensForETH
  '0x5c11d795', // swapExactTokensForTokensSupportingFeeOnTransferTokens
  '0x791ac947', // swapExactTokensForETHSupportingFeeOnTransferTokens
  '0x04e45aaf', // exactInputSingle (Uniswap V3)
  '0xb858183f', // exactInput (Uniswap V3)
  '0x414bf389', // exactOutputSingle
  '0xe449022e', // uniswapV3SwapCallback
  '0x128acb08', // Uni V3 swap
  '0xd0e30db0', // deposit (WETH/WMON wrap)
  '0x2e1a7d4d', // withdraw (WETH/WMON unwrap)
])

const STAKE_SELECTORS = new Set([
  '0xa694fc3a', // stake
  '0x2e17de78', // unstake
  '0x3d18b912', // getReward
  '0xe9fad8ee', // exit
  '0x1249c58b', // mint (liquid staking)
])

function classifyTx(tx) {
  if (!tx.to)                        return { label: 'Deploy',          color: '#F472B6', icon: FileCode }
  if (tx.input === '0x' || tx.input === '0x0') return { label: 'Transfer', color: '#4ADE80', icon: ArrowUp }
  const sel = tx.input?.slice(0, 10)
  if (sel === '0xa9059cbb')          return { label: 'Token Send',       color: '#60A5FA', icon: ArrowUp }
  if (sel === '0x23b872dd')          return { label: 'Token Send',       color: '#60A5FA', icon: ArrowUp }
  if (SWAP_SELECTORS.has(sel))       return { label: 'Swap',             color: '#A78BFA', icon: Zap }
  if (STAKE_SELECTORS.has(sel))      return { label: 'Stake',            color: '#4ADE80', icon: Zap }
  if (sel === '0x095ea7b3')          return { label: 'Approve',          color: '#FCD34D', icon: FileCode }
  if (sel === '0x40c10f19')          return { label: 'Mint',             color: '#F472B6', icon: FileCode }
  if (sel === '0xa22cb465')          return { label: 'NFT Approve',      color: '#FB923C', icon: FileCode }
  if (sel === '0x42842e0e' || sel === '0xb88d4fde') return { label: 'NFT Transfer', color: '#34D399', icon: ArrowUp }
  return { label: 'Contract Call',   color: '#FB923C', icon: FileCode }
}

export default function ActivityFeed() {
  const [txs, setTxs]       = useState([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('all')
  const seenRef             = useRef(new Set())
  const pausedRef           = useRef(false)

  useEffect(() => { pausedRef.current = paused }, [paused])

  // Pause when tab is hidden to save resources
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) pausedRef.current = true
      else if (!paused) pausedRef.current = false
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [paused])

  useEffect(() => {
    let interval

    async function poll() {
      if (pausedRef.current || document.hidden) return
      try {
        const blockHex = await rpc('eth_blockNumber')
        const block    = await rpc('eth_getBlockByNumber', [blockHex, true])
        if (!block?.transactions?.length) return

        const blockNum = parseInt(block.number, 16)
        if (seenRef.current.has(blockNum)) return
        seenRef.current.add(blockNum)

        const ts = parseInt(block.timestamp, 16)
        const newTxs = block.transactions.slice(0, 30).map(tx => ({
          hash:      tx.hash,
          from:      tx.from,
          to:        tx.to,
          value:     parseInt(tx.value || '0x0', 16),
          input:     tx.input,
          blockNum,
          timestamp: ts,
          ...classifyTx(tx),
        }))

        setTxs(prev => {
          const combined = [...newTxs, ...prev]
          const unique   = combined.filter((t, i, arr) => arr.findIndex(x => x.hash === t.hash) === i)
          return unique.slice(0, 100)
        })
      } catch {}
    }

    poll()
    interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [])

  const FILTERS = ['all', 'Transfer', 'Swap', 'Token Transfer', 'Contract Call', 'Deploy']
  const filtered = filter === 'all' ? txs : txs.filter(t => t.label === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Section
        title="Live Transaction Feed"
        subtitle="Real-time transactions from the latest Monad blocks"
        noPad
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Live/Pause toggle */}
            <button
              onClick={() => setPaused(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px',
                background: paused ? 'var(--yellow-dim)' : 'var(--green-dim)',
                border: `1px solid ${paused ? 'var(--yellow)' : 'var(--green)'}`,
                borderRadius: '6px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                color: paused ? 'var(--yellow)' : 'var(--green)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: paused ? 'var(--yellow)' : 'var(--green)',
                animation: paused ? 'none' : 'pulse-dot 2s ease infinite',
              }} />
              {paused ? 'PAUSED' : 'LIVE'}
            </button>

            {/* Tx count badge */}
            {txs.length > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                {txs.length} txns
              </span>
            )}
          </div>
        }
      >
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 10px',
              borderRadius: '5px',
              border: '1px solid',
              borderColor: filter === f ? 'var(--purple)' : 'var(--border)',
              background: filter === f ? 'var(--purple-dim)' : 'transparent',
              color: filter === f ? 'var(--purple-bright)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontSize: '11px',
              cursor: 'pointer', transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>

        {/* Feed */}
        <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ width: '24px', height: '24px', border: '2px solid var(--purple)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                WAITING FOR TRANSACTIONS…
              </div>
            </div>
          ) : (
            filtered.map((tx, i) => {
              const Icon = tx.icon
              const monValue = tx.value > 0 ? (tx.value / 1e18).toFixed(4) : null
              return (
                <div
                  key={tx.hash}
                  className={i === 0 ? 'fade-in' : ''}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 100px 120px 36px',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.025)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Type icon */}
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '7px',
                    background: `${tx.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={12} color={tx.color} />
                  </div>

                  {/* From → To */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--purple-bright)', fontWeight: 600 }}>
                        {shortAddress(tx.from)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>→</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: tx.to ? 'var(--text-secondary)' : 'var(--pink)', fontWeight: tx.to ? 400 : 600 }}>
                        {tx.to ? shortAddress(tx.to) : 'New Contract'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                      Block #{tx.blockNum?.toLocaleString()} · {formatTime(tx.timestamp)}
                    </div>
                  </div>

                  {/* Value */}
                  <div style={{ textAlign: 'right' }}>
                    {monValue ? (
                      <>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {parseFloat(monValue).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>MON</div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                    )}
                  </div>

                  {/* Type badge */}
                  <span style={{
                    background: `${tx.color}12`,
                    color: tx.color,
                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                    fontWeight: 700, letterSpacing: '0.04em',
                    padding: '3px 7px', borderRadius: '5px',
                    textAlign: 'center', whiteSpace: 'nowrap',
                  }}>{tx.label}</span>

                  {/* Link */}
                  <a
                    href={`https://monadvision.com/tx/${tx.hash}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              )
            })
          )}
        </div>
      </Section>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
