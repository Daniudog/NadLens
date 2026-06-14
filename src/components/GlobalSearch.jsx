import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Hash, Wallet, ArrowRight, X, FileText, AtSign } from 'lucide-react'
import { globalSearch, RESULT_TYPES } from '../lib/search.js'
import { shortAddress, formatTime } from '../lib/monad.js'

// ── Result cards ─────────────────────────────────────────────────────────────
function ResultCard({ result, onNavigate, onClose }) {
  if (!result) return null

  if (result.error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', marginBottom: '6px' }}>
          {result.type === RESULT_TYPES.TX ? 'Transaction not found' : 'No results found'}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Try a wallet address (0x + 40 chars), transaction hash (0x + 64 chars), or block number
        </div>
      </div>
    )
  }

  if (result.type === RESULT_TYPES.ADDRESS) {
    return (
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={14} color="var(--purple)" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--purple-bright)', fontWeight: 700 }}>Wallet Address</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>{result.query}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { onNavigate('wallet', result.query); onClose() }}
            style={{ flex: 1, padding: '9px 12px', background: 'var(--purple)', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
          >
            Inspect Wallet <ArrowRight size={12} />
          </button>
          <button
            onClick={() => { onNavigate('watchlist', result.query); onClose() }}
            style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
          >
            + Watch
          </button>
        </div>
      </div>
    )
  }

  if (result.type === RESULT_TYPES.BLOCK) {
    const b = result.data
    const num      = b?.number    ? parseInt(b.number,    16) : null
    const txCount  = b?.transactions?.length ?? 0
    const ts       = b?.timestamp ? parseInt(b.timestamp, 16) : null
    const gasUsed  = b?.gasUsed   ? parseInt(b.gasUsed,   16) : 0
    const gasLimit = b?.gasLimit  ? parseInt(b.gasLimit,  16) : 1
    const util     = gasLimit > 0 ? ((gasUsed / gasLimit) * 100).toFixed(1) : '0'
    return (
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hash size={14} color="var(--blue)" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Block #{num?.toLocaleString()}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{ts ? formatTime(ts) : '—'}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Transactions', value: txCount.toLocaleString() },
            { label: 'Gas Used',     value: (gasUsed / 1e6).toFixed(2) + 'M' },
            { label: 'Utilization',  value: util + '%' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg-base)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <a href={`https://monadvision.com/block/${num}`} target="_blank" rel="noreferrer" onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '8px', color: 'var(--blue)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600 }}>
          View on MonadVision <ArrowRight size={12} />
        </a>
      </div>
    )
  }

  if (result.type === RESULT_TYPES.TX) {
    const tx      = result.data
    const value   = tx?.value    ? (parseInt(tx.value,    16) / 1e18).toFixed(6) : '0'
    const gasPrice= tx?.gasPrice ? (parseInt(tx.gasPrice, 16) / 1e9 ).toFixed(4) : '—'
    const success = tx?.receipt?.status === '0x1'
    const blockNum= tx?.blockNumber ? parseInt(tx.blockNumber, 16) : null
    return (
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(251,146,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={14} color="var(--orange)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Transaction</span>
              {tx?.receipt && (
                <span style={{ background: success ? 'var(--green-dim)' : 'var(--red-dim)', color: success ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {success ? 'Success' : 'Failed'}
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shortAddress(tx?.hash)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '14px' }}>
          {[
            { label: 'From',      value: shortAddress(tx?.from),                              mono: true  },
            { label: 'To',        value: tx?.to ? shortAddress(tx.to) : 'Contract Deploy',   mono: !!tx?.to },
            { label: 'Value',     value: `${value} MON`,                                      mono: false },
            { label: 'Gas Price', value: `${gasPrice} Gwei`,                                  mono: false },
            { label: 'Block',     value: blockNum?.toLocaleString() || '—',                   mono: false },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</span>
              <span style={{ fontFamily: item.mono ? 'var(--font-mono)' : 'var(--font-display)', fontSize: '12px', color: item.mono ? 'var(--purple-bright)' : 'var(--text-primary)', fontWeight: item.mono ? 400 : 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
        <a href={`https://monadvision.com/tx/${tx?.hash}`} target="_blank" rel="noreferrer" onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px', background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: '8px', color: 'var(--orange)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600 }}>
          View on MonadVision <ArrowRight size={12} />
        </a>
      </div>
    )
  }

  if (result.type === RESULT_TYPES.NAD) {
    if (!result.data) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', marginBottom: '6px' }}>
            .nad name not found
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>{result.query}</strong> is not registered or could not be resolved on Monad mainnet.
          </div>
        </div>
      )
    }
    return (
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AtSign size={14} color="#A78BFA" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: '#A78BFA' }}>{result.data.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Nad Name Service · Resolved</div>
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Resolved Address</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--purple-bright)', wordBreak: 'break-all' }}>{result.data.address}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { onNavigate('wallet', result.data.address); onClose() }} style={{ flex: 1, padding: '9px 12px', background: 'var(--purple)', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            Inspect Wallet <ArrowRight size={12} />
          </button>
          <button onClick={() => { onNavigate('watchlist', result.data.address); onClose() }} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}>
            + Watch
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ── Search Modal rendered into document.body via Portal ──────────────────────
function SearchModal({ onClose, onNavigate }) {
  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef  = useRef(null)
  const debounce  = useRef(null)

  useEffect(() => {
    // Focus input immediately
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResult(null); setLoading(false); return }
    setLoading(true)
    try {
      const res = await globalSearch(q.trim())
      setResult(res)
    } catch {
      setResult({ type: RESULT_TYPES.UNKNOWN, error: 'Search failed', query: q })
    }
    setLoading(false)
  }, [])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    setResult(null)
    clearTimeout(debounce.current)
    if (!val.trim()) { setLoading(false); return }
    // Full address or tx hash — fire immediately
    if (/^0x[0-9a-fA-F]{40}$/.test(val.trim()) || /^0x[0-9a-fA-F]{64}$/.test(val.trim())) {
      runSearch(val.trim())
      return
    }
    // .nad name — fire when it ends with .nad or has reasonable length
    if (val.trim().endsWith('.nad') && val.trim().length > 4) {
      runSearch(val.trim())
      return
    }
    // Block number — debounce 400ms
    if (/^\d{3,}$/.test(val.trim())) {
      debounce.current = setTimeout(() => runSearch(val.trim()), 400)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      clearTimeout(debounce.current)
      runSearch(query.trim())
    }
  }

  function clearInput() {
    setQuery('')
    setResult(null)
    inputRef.current?.focus()
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#0F0D1A',
          border: '1px solid #3D3460',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(131,110,249,0.12)',
          animation: 'searchFadeIn 0.15s ease',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #251F3D' }}>
          {loading ? (
            <div style={{ width: '16px', height: '16px', border: '2px solid #836EF9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'searchSpin 0.7s linear infinite', flexShrink: 0 }} />
          ) : (
            <Search size={15} color="#4A4268" style={{ flexShrink: 0 }} />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Address · Tx hash · Block number"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F0EEFF',
              fontFamily: "'Space Mono', monospace",
              fontSize: '14px',
              minWidth: 0,
            }}
          />
          {query && (
            <button onClick={clearInput} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4A4268', display: 'flex', padding: '2px', flexShrink: 0 }}>
              <X size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{ background: '#251F3D', border: 'none', cursor: 'pointer', color: '#6B5FA8', fontFamily: "'Space Mono', monospace", fontSize: '10px', padding: '4px 8px', borderRadius: '5px', flexShrink: 0 }}
          >
            ESC
          </button>
        </div>

        {/* Body */}
        {result ? (
          <ResultCard result={result} onNavigate={onNavigate} onClose={onClose} />
        ) : query && !loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#4A4268' }}>Press Enter to search</div>
          </div>
        ) : !query ? (
          <div style={{ padding: '16px 18px 20px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#4A4268', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>
              What you can search
            </div>
            {[
              { icon: AtSign,   label: '.nad name',        hint: 'e.g. salmo.nad',    color: '#A78BFA' },
              { icon: Wallet,   label: 'Wallet address',   hint: '0x + 40 hex chars', color: '#836EF9' },
              { icon: FileText, label: 'Transaction hash', hint: '0x + 64 hex chars', color: '#FB923C' },
              { icon: Hash,     label: 'Block number',     hint: 'e.g. 80565593',     color: '#60A5FA' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', marginBottom: '3px', background: 'rgba(255,255,255,0.025)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={13} color={item.color} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#8B80B8' }}>{item.label}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4A4268', marginTop: '1px' }}>{item.hint}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(131,110,249,0.06)', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4A4268', lineHeight: 1.5 }}>
              .nad names · addresses · hashes · blocks · Enter to search
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes searchFadeIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
        @keyframes searchSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  )
}

// ── Trigger button ────────────────────────────────────────────────────────────
export default function GlobalSearch({ onNavigate }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px',
          background: '#1A1630',
          border: '1px solid #251F3D',
          borderRadius: '8px',
          color: '#4A4268',
          fontFamily: "'Inter', sans-serif",
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          minWidth: '160px',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3D3460'; e.currentTarget.style.color = '#8B80B8' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#251F3D'; e.currentTarget.style.color = '#4A4268' }}
      >
        <Search size={12} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
        <kbd style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', background: '#251F3D', padding: '2px 5px', borderRadius: '3px', color: '#4A4268' }}>⌘K</kbd>
      </button>

      {open && (
        <SearchModal
          onClose={() => setOpen(false)}
          onNavigate={onNavigate}
        />
      )}
    </>
  )
}
