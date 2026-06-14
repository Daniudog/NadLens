import { Activity, Blocks, Search, BarChart2, Globe, TrendingUp, Layers, Eye, Cpu, Trophy, Coins, Bell, DollarSign, Zap, ReceiptText, LineChart } from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Chain',
    items: [
      { id: 'overview',  label: 'Overview',    icon: Activity },
      { id: 'blocks',    label: 'Blocks',      icon: Blocks },
      { id: 'charts',    label: 'Live Charts', icon: BarChart2 },
      { id: 'execution', label: 'Execution',   icon: Cpu },
    ],
  },
  {
    label: 'Ecosystem',
    items: [
      { id: 'ecosystem',   label: 'Ecosystem',    icon: Layers },
      { id: 'dex',         label: 'DEX Volume',   icon: TrendingUp },
      { id: 'yields',      label: 'Yields',       icon: BarChart2 },
      { id: 'stables',     label: 'Stablecoins',  icon: DollarSign },
      { id: 'fees',        label: 'Fees',         icon: ReceiptText },
      { id: 'tokens',      label: 'Tokens',       icon: Coins },
      { id: 'leaderboard', label: 'Leaderboard',  icon: Trophy },
    ],
  },
  {
    label: 'Activity',
    items: [
      { id: 'feed',     label: 'Live Feed',   icon: Zap },
      { id: 'pnl',      label: 'P&L Tracker', icon: LineChart },
      { id: 'alerts',   label: 'Alerts',      icon: Bell },
    ],
  },
  {
    label: 'Wallets',
    items: [
      { id: 'wallet',    label: 'Wallet',      icon: Search },
      { id: 'watchlist', label: 'Watchlist',   icon: Eye },
    ],
  },
]

export default function Sidebar({ active, onNav, mobile, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {mobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
          }}
        />
      )}

      <div style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        ...(mobile ? {
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
          zIndex: 50,
        } : {}),
      }}>
        {/* Logo */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{
              width: '34px', height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #5B47D4 0%, #A78BFA 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(131,110,249,0.4)',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.8" fill="none"/>
                <circle cx="8" cy="8" r="2.2" fill="white"/>
                <line x1="11.8" y1="11.8" x2="16" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}>NadLens</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--purple)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginTop: '1px',
              }}>Monad Analytics</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} style={{ marginBottom: gi < NAV_GROUPS.length - 1 ? '20px' : 0 }}>
              <div style={{
                padding: '0 10px',
                marginBottom: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}>{group.label}</div>
              {group.items.map(item => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <button key={item.id} onClick={() => { onNav(item.id); if (mobile && onClose) onClose() }} style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isActive ? 'var(--purple-dim)' : 'transparent',
                    color: isActive ? 'var(--purple-bright)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: '1px',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                  }}
                  >
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        left: 0, top: '50%',
                        transform: 'translateY(-50%)',
                        width: '3px', height: '16px',
                        borderRadius: '0 2px 2px 0',
                        background: 'var(--purple)',
                      }} />
                    )}
                    <Icon size={14} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        background: 'rgba(74,222,128,0.15)',
                        color: 'var(--green)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '8px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}>{item.badge}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Globe size={11} color="var(--text-muted)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              Monad Mainnet · Chain 143
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Data: Monad RPC + DefiLlama
          </div>
          <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            [ ] or Alt+← → to navigate<br/>⌘K to search
          </div>
        </div>
      </div>
    </>
  )
}
