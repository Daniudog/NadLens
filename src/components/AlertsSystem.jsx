import { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, Plus, Trash2, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import { getBalance, getTransactionCount, weiToMon, shortAddress } from '../lib/monad.js'
import { getWatchlist } from '../lib/whales.js'
import Section from './Section.jsx'

const ALERTS_KEY  = 'nadlens_alerts'
const HISTORY_KEY = 'nadlens_alert_history'

function loadAlerts()  { try { return JSON.parse(localStorage.getItem(ALERTS_KEY)  || '[]') } catch { return [] } }
function saveAlerts(a) { try { localStorage.setItem(ALERTS_KEY, JSON.stringify(a)) } catch {} }
function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
function saveHistory(h){ try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50))) } catch {} }

async function checkWallet(address) {
  const [balWei, txCount] = await Promise.all([
    getBalance(address).catch(() => 0),
    getTransactionCount(address).catch(() => 0),
  ])
  return { balance: parseFloat(weiToMon(balWei)), txCount }
}

export default function AlertsSystem() {
  const [alerts,  setAlerts]  = useState(loadAlerts)
  const [history, setHistory] = useState(loadHistory)
  const [input,   setInput]   = useState('')
  const [label,   setLabel]   = useState('')
  const [threshold, setThreshold] = useState('')
  const [type,    setType]    = useState('tx') // 'tx' | 'balance'
  const [error,   setError]   = useState('')
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const prevRef = useRef({}) // stores last known state per address

  // ── Polling loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function poll() {
      const currentAlerts = loadAlerts()
      if (!currentAlerts.length) return

      for (const alert of currentAlerts) {
        try {
          const data = await checkWallet(alert.address)
          const prev = prevRef.current[alert.address]

          if (prev) {
            const triggered =
              (alert.type === 'tx'      && data.txCount  > prev.txCount) ||
              (alert.type === 'balance' && Math.abs(data.balance - prev.balance) >= (alert.threshold || 0))

            if (triggered) {
              const msg = alert.type === 'tx'
                ? `New transaction — ${shortAddress(alert.address)} now has ${data.txCount} txns`
                : `Balance changed — ${shortAddress(alert.address)}: ${data.balance.toFixed(4)} MON`

              // Browser notification
              if (Notification.permission === 'granted') {
                try {
                  new Notification('NadLens Alert', { body: msg, icon: '/favicon.svg' })
                } catch {}
              }

              // Add to history
              const entry = { id: Date.now(), address: alert.address, label: alert.label, message: msg, time: Date.now(), type: alert.type }
              setHistory(h => {
                const next = [entry, ...h].slice(0, 50)
                saveHistory(next)
                return next
              })
            }
          }

          prevRef.current[alert.address] = data
        } catch {}
      }
    }

    poll()
    const interval = setInterval(poll, 15000) // poll every 15s
    return () => clearInterval(interval)
  }, [alerts])

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
  }

  function addAlert() {
    const addr = input.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { setError('Invalid Monad address'); return }
    if (alerts.find(a => a.address.toLowerCase() === addr.toLowerCase() && a.type === type)) {
      setError('Alert already exists for this address and type'); return
    }
    setError('')
    const next = [...alerts, {
      id: Date.now(),
      address: addr,
      label: label.trim() || shortAddress(addr),
      type,
      threshold: parseFloat(threshold) || 0,
      createdAt: Date.now(),
    }]
    setAlerts(next)
    saveAlerts(next)
    setInput(''); setLabel(''); setThreshold('')
  }

  function removeAlert(id) {
    const next = alerts.filter(a => a.id !== id)
    setAlerts(next)
    saveAlerts(next)
  }

  function clearHistory() {
    setHistory([])
    saveHistory([])
  }

  // Import from watchlist
  function importWatchlist() {
    const wl = getWatchlist()
    const existing = new Set(alerts.map(a => a.address.toLowerCase()))
    const toAdd = wl.filter(w => !existing.has(w.address.toLowerCase()))
    const next = [...alerts, ...toAdd.map(w => ({
      id: Date.now() + Math.random(),
      address: w.address,
      label: w.label || shortAddress(w.address),
      type: 'tx',
      threshold: 0,
      createdAt: Date.now(),
    }))]
    setAlerts(next)
    saveAlerts(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Notification permission banner */}
      {notifPerm !== 'granted' && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          background: 'var(--yellow-dim)',
          border: '1px solid rgba(252,211,77,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={16} color="var(--yellow)" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {notifPerm === 'denied'
                ? 'Browser notifications are blocked. Enable them in your browser settings to receive alerts.'
                : 'Enable browser notifications to get alerted when wallets move.'}
            </span>
          </div>
          {notifPerm !== 'denied' && (
            <button onClick={requestPermission} style={{
              padding: '7px 16px', background: 'var(--yellow)', border: 'none',
              borderRadius: '7px', color: '#000', fontFamily: 'var(--font-body)',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}>
              Enable Notifications
            </button>
          )}
        </div>
      )}

      {/* Add alert form */}
      <Section title="Create Alert" subtitle="Get browser notifications when a wallet moves">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input value={input} onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && addAlert()}
              placeholder="Wallet address (0x…)"
              style={{ flex: '2 1 240px', padding: '9px 13px', background: 'var(--bg-base)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = 'var(--purple)'}
              onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)' }}
            />
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Label (optional)"
              style={{ flex: '1 1 140px', padding: '9px 13px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = 'var(--purple)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>Alert on:</span>
            {[['tx', 'Any transaction'], ['balance', 'Balance change']].map(([val, lbl]) => (
              <button key={val} onClick={() => setType(val)} style={{
                padding: '5px 12px', borderRadius: '6px', border: '1px solid',
                borderColor: type === val ? 'var(--purple)' : 'var(--border)',
                background: type === val ? 'var(--purple-dim)' : 'transparent',
                color: type === val ? 'var(--purple-bright)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
              }}>{lbl}</button>
            ))}
            {type === 'balance' && (
              <input value={threshold} onChange={e => setThreshold(e.target.value)}
                placeholder="Min change (MON)"
                type="number" min="0" step="0.1"
                style={{ width: '140px', padding: '5px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', outline: 'none' }}
              />
            )}
          </div>

          {error && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={addAlert} style={{
              padding: '9px 20px', background: 'var(--purple)', border: 'none', borderRadius: '8px',
              color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Bell size={14} /> Create Alert
            </button>
            {getWatchlist().length > 0 && (
              <button onClick={importWatchlist} style={{
                padding: '9px 16px', background: 'transparent', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Eye size={13} /> Import Watchlist
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Active alerts */}
      <Section title={`Active Alerts (${alerts.length})`} subtitle="Checked every 15 seconds" noPad>
        {alerts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <Bell size={24} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
              No alerts set up yet. Add a wallet address above.
            </div>
          </div>
        ) : alerts.map(alert => (
          <div key={alert.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={12} color="var(--purple)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {alert.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {shortAddress(alert.address)} · {alert.type === 'tx' ? 'Any transaction' : `Balance Δ ≥ ${alert.threshold} MON`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.06em' }}>WATCHING</span>
              <button onClick={() => removeAlert(alert.id)} style={{
                background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px',
                padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s', display: 'flex',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* Alert history */}
      {history.length > 0 && (
        <Section
          title="Alert History"
          subtitle={`${history.length} recent alerts`}
          noPad
          action={
            <button onClick={clearHistory} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px', transition: 'all 0.15s' }}>
              Clear
            </button>
          }
        >
          {history.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <CheckCircle size={13} color="var(--green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{h.message}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {new Date(h.time).toLocaleTimeString()} · {new Date(h.time).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
