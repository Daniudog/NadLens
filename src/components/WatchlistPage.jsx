import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, Copy, ExternalLink, Tag } from 'lucide-react'
import {
  getWatchlist, addToWatchlist, removeFromWatchlist,
  getLabel, classifyWallet, tagWallet
} from '../lib/whales.js'
import { getBalance, getTransactionCount, weiToMon, shortAddress } from '../lib/monad.js'
import Section from './Section.jsx'

function WalletCard({ entry, onRemove, onTag }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagging, setTagging] = useState(false)

  const label = getLabel(entry.address)

  useEffect(() => {
    async function fetch() {
      try {
        const [balWei, txCount] = await Promise.all([
          getBalance(entry.address),
          getTransactionCount(entry.address),
        ])
        const balance = parseFloat(weiToMon(balWei))
        setData({ balance, txCount })
      } catch { setData({ balance: 0, txCount: 0 }) }
      finally { setLoading(false) }
    }
    fetch()
  }, [entry.address])

  const classification = data ? classifyWallet(data.txCount) : null

  async function copyAddr() {
    await navigator.clipboard.writeText(entry.address)
    setCopying(true)
    setTimeout(() => setCopying(false), 1200)
  }

  function submitTag(e) {
    e.preventDefault()
    if (tagInput.trim()) {
      tagWallet(entry.address, tagInput.trim())
      onTag()
      setTagging(false)
      setTagInput('')
    }
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      transition: 'border-color 0.2s',
      animation: 'fade-in 0.3s ease',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--purple-bright)', fontWeight: 700 }}>
              {shortAddress(entry.address)}
            </span>
            {classification && (
              <span className="tag" style={{
                background: `${classification.color}18`,
                color: classification.color,
              }}>{classification.label}</span>
            )}
          </div>
          {(entry.label || label?.name) && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {entry.label || label?.name}
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Added {new Date(entry.addedAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={copyAddr} title="Copy address" style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '5px 7px', cursor: 'pointer',
            color: copying ? 'var(--green)' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            <Copy size={12} />
          </button>
          <button onClick={() => setTagging(!tagging)} title="Tag wallet" style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '5px 7px', cursor: 'pointer',
            color: tagging ? 'var(--purple)' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            <Tag size={12} />
          </button>
          <a href={`https://monadvision.com/address/${entry.address}`} target="_blank" rel="noreferrer"
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <ExternalLink size={12} />
          </a>
          <button onClick={() => onRemove(entry.address)} title="Remove" style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '5px 7px', cursor: 'pointer',
            color: 'var(--text-muted)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Tag input */}
      {tagging && (
        <div style={{ marginBottom: '14px' }}>
          <form onSubmit={submitTag} style={{ display: 'flex', gap: '6px' }}>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Label this wallet..."
              autoFocus
              style={{
                flex: 1, padding: '6px 10px',
                background: 'var(--bg-base)', border: '1px solid var(--border-bright)',
                borderRadius: '6px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none',
              }}
            />
            <button type="submit" style={{
              padding: '6px 12px', background: 'var(--purple)',
              border: 'none', borderRadius: '6px', color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>Save</button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { label: 'MON Balance', value: loading ? null : data?.balance?.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' MON' },
          { label: 'Transactions', value: loading ? null : data?.txCount?.toLocaleString() },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--bg-base)', borderRadius: '8px',
            padding: '10px 12px', border: '1px solid var(--border)',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              {item.label}
            </div>
            {loading
              ? <div className="skeleton" style={{ height: '18px', width: '70%' }} />
              : <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.value}
                </div>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WatchlistPage() {
  const [list, setList] = useState(getWatchlist)
  const [input, setInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [error, setError] = useState('')
  const [, forceUpdate] = useState(0)

  function handleAdd() {
    const addr = input.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError('Invalid address — must be 0x followed by 40 hex characters.')
      return
    }
    setError('')
    setList(addToWatchlist(addr, labelInput.trim()))
    setInput('')
    setLabelInput('')
  }

  function handleRemove(addr) {
    setList(removeFromWatchlist(addr))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
      {/* Add wallet section */}
      <Section title="Add to Watchlist" subtitle="Track up to 50 wallets — saved in your browser">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Wallet address (0x...)"
              style={{
                flex: '2 1 260px', padding: '10px 14px',
                background: 'var(--bg-base)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: '8px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = 'var(--purple)' }}
              onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)' }}
            />
            <input
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              placeholder="Label (optional)"
              style={{
                flex: '1 1 160px', padding: '10px 14px',
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--purple)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button onClick={handleAdd} style={{
              padding: '10px 20px', background: 'var(--purple)', border: 'none',
              borderRadius: '8px', color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'opacity 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={14} /> Add Wallet
            </button>
          </div>
          {error && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>
      </Section>

      {/* Watchlist */}
      {list.length === 0 ? (
        <div style={{
          padding: '48px', textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          <Eye size={28} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            No wallets tracked yet
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
            Add a Monad address above to start monitoring it
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {list.length} wallet{list.length !== 1 ? 's' : ''} tracked
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => {
                const header = 'Address,Label,Added'
                const rows = list.map(w => `${w.address},${w.label || ''},${new Date(w.addedAt).toISOString()}`).join('\n')
                const csv = header + '\n' + rows
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'nadlens-watchlist.csv'; a.click()
                URL.revokeObjectURL(url)
              }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                Export CSV
              </button>
              <button onClick={() => { setList([]); localStorage.setItem('nadlens_watchlist', '[]') }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                Clear All
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '12px' }}>
            {list.map(entry => (
              <WalletCard
                key={entry.address}
                entry={entry}
                onRemove={handleRemove}
                onTag={() => forceUpdate(n => n + 1)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
