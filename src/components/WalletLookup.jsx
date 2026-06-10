import { useState } from 'react'
import { Search, Wallet, ArrowUpRight } from 'lucide-react'
import { useWalletData } from '../hooks/useChainData.js'
import { shortAddress } from '../lib/monad.js'

export default function WalletLookup() {
  const [input, setInput] = useState('')
  const [queried, setQueried] = useState('')

  const { balance, txCount, loading, error } = useWalletData(queried)

  function handleSearch() {
    const trimmed = input.trim()
    if (trimmed) setQueried(trimmed)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search input */}
      <div style={{
        display: 'flex',
        gap: '8px',
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 14px',
        alignItems: 'center',
        transition: 'border-color 0.2s',
      }}
      onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--purple)'}
      onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Enter wallet address (0x...)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            background: 'var(--purple)',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 12px',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Look up
        </button>
      </div>

      {/* Results */}
      {queried && (
        <div style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px',
          animation: 'fade-in 0.3s ease',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={14} color="var(--purple)" />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--purple-bright)',
              }}>
                {shortAddress(queried)}
              </span>
            </div>
            <a
              href={`https://monadvision.com/address/${queried}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-muted)',
                fontSize: '11px',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              MonadVision <ArrowUpRight size={11} />
            </a>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton" style={{ height: '20px', width: '60%' }} />
              <div className="skeleton" style={{ height: '20px', width: '40%' }} />
            </div>
          ) : error ? (
            <div style={{
              color: 'var(--red)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}>
              {error === 'Invalid address' ? 'Not a valid address — must start with 0x followed by 40 hex chars.' : `Error: ${error}`}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Balance', value: `${balance?.toLocaleString()} MON`, accent: 'var(--purple-bright)' },
                { label: 'Transactions', value: txCount?.toLocaleString(), accent: 'var(--text-primary)' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '6px',
                  }}>{item.label}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: item.accent,
                    letterSpacing: '-0.02em',
                  }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!queried && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.1em',
        }}>
          ENTER ANY MONAD ADDRESS TO INSPECT
        </div>
      )}
    </div>
  )
}
