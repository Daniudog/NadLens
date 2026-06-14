import { useState, useEffect, useRef } from 'react'
import { Activity, Users, FileCode, Zap, TrendingUp, Clock, Database } from 'lucide-react'
import Section from './Section.jsx'
import StatCard from './StatCard.jsx'
import { formatCount, formatTime } from '../lib/monad.js'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts'

const RPC = 'https://rpc2.monad.xyz'
const FALLBACK = 'https://rpc3.monad.xyz'

async function rpc(method, params = [], endpoint = RPC) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (data.result !== undefined) return data.result
  } catch {}
  if (endpoint === RPC) return rpc(method, params, FALLBACK)
  return null
}

async function batchBlocks(blockNums) {
  const batch = blockNums.map((n, i) => ({
    jsonrpc: '2.0', id: i,
    method: 'eth_getBlockByNumber',
    params: ['0x' + n.toString(16), true],
  }))
  try {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(15000),
    })
    const results = await res.json()
    return Array.isArray(results) ? results.map(r => r.result).filter(Boolean) : []
  } catch { return [] }
}

async function fetchNetworkStats() {
  const latestHex = await rpc('eth_blockNumber')
  const latest = parseInt(latestHex, 16)

  // Scan last 100 blocks for deep stats
  const SCAN = 100
  const blockNums = Array.from({ length: SCAN }, (_, i) => latest - i)
  const blocks = await batchBlocks(blockNums)

  if (!blocks.length) return null

  const sorted = [...blocks].sort((a, b) => parseInt(a.number, 16) - parseInt(b.number, 16))
  const first  = sorted[0]
  const last   = sorted[sorted.length - 1]

  const timeSpan = parseInt(last.timestamp, 16) - parseInt(first.timestamp, 16)
  const avgBlockTime = timeSpan > 0 ? (timeSpan / (sorted.length - 1)).toFixed(2) : '—'

  // Unique addresses in window
  const addresses = new Set()
  const contracts = new Set()
  let totalTxns = 0
  let totalGasUsed = 0

  // Tx type distribution
  const txTypes = { transfer: 0, swap: 0, tokenSend: 0, contractCall: 0, deploy: 0, stake: 0 }
  const SWAP_SELS = new Set(['0x38ed1739','0x7ff36ab5','0x18cbafe5','0x5c11d795','0x791ac947','0x04e45aaf','0xb858183f'])
  const STAKE_SELS = new Set(['0xa694fc3a','0x2e17de78','0x3d18b912'])

  // Per-block data for charts
  const blockChart = sorted.map(b => {
    const txs = b.transactions || []
    const gas = parseInt(b.gasUsed || '0x0', 16)
    const limit = parseInt(b.gasLimit || '0x1', 16)
    const ts = parseInt(b.timestamp, 16)
    const blockNum = parseInt(b.number, 16)

    txs.forEach(tx => {
      if (tx.from) addresses.add(tx.from.toLowerCase())
      if (tx.to)   addresses.add(tx.to.toLowerCase())
      else         contracts.add(tx.hash) // contract deploy

      const sel = tx.input?.slice(0, 10)
      if (!tx.to)                        txTypes.deploy++
      else if (!tx.input || tx.input === '0x') txTypes.transfer++
      else if (tx.input?.startsWith('0xa9059cbb') || tx.input?.startsWith('0x23b872dd')) txTypes.tokenSend++
      else if (SWAP_SELS.has(sel))       txTypes.swap++
      else if (STAKE_SELS.has(sel))      txTypes.stake++
      else                               txTypes.contractCall++
    })

    totalTxns   += txs.length
    totalGasUsed += gas

    return {
      block: blockNum,
      txCount: txs.length,
      gasUtil: limit > 0 ? Math.round((gas / limit) * 100) : 0,
      timestamp: ts,
    }
  })

  // Hourly activity (group by hour)
  const hourMap = {}
  blockChart.forEach(b => {
    const hour = new Date(b.timestamp * 1000).getHours()
    if (!hourMap[hour]) hourMap[hour] = { hour, txns: 0, count: 0 }
    hourMap[hour].txns  += b.txCount
    hourMap[hour].count += 1
  })
  const hourlyActivity = Object.values(hourMap)
    .sort((a, b) => a.hour - b.hour)
    .map(h => ({ label: `${h.hour}:00`, avgTxns: Math.round(h.txns / h.count) }))

  const avgTxPerBlock = (totalTxns / blocks.length).toFixed(1)
  const avgGasPerBlock = Math.round(totalGasUsed / blocks.length)
  const tps = timeSpan > 0 ? (totalTxns / timeSpan).toFixed(1) : '—'

  return {
    latestBlock: latest,
    scannedBlocks: blocks.length,
    uniqueAddresses: addresses.size,
    contractDeploys: contracts.size,
    totalTxns,
    avgBlockTime,
    avgTxPerBlock,
    avgGasPerBlock,
    tps,
    txTypes,
    blockChart,
    hourlyActivity,
    timeSpan,
  }
}

// TX type donut
function TxTypeBreakdown({ types }) {
  if (!types) return <div className="skeleton" style={{ height: '180px', borderRadius: '8px' }} />
  const total = Object.values(types).reduce((a, b) => a + b, 0)
  if (!total) return null

  const items = [
    { label: 'Transfers',      key: 'transfer',     color: '#4ADE80' },
    { label: 'Swaps',          key: 'swap',          color: '#836EF9' },
    { label: 'Token Sends',    key: 'tokenSend',     color: '#60A5FA' },
    { label: 'Contract Calls', key: 'contractCall',  color: '#FB923C' },
    { label: 'Deploys',        key: 'deploy',        color: '#F472B6' },
    { label: 'Staking',        key: 'stake',         color: '#34D399' },
  ].filter(i => types[i.key] > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map(item => {
        const pct = ((types[item.key] / total) * 100).toFixed(1)
        return (
          <div key={item.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                {item.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: item.color, fontWeight: 600 }}>
                {types[item.key].toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Block activity chart
function BlockActivityChart({ data }) {
  if (!data?.length) return <div className="skeleton" style={{ height: '160px', borderRadius: '8px' }} />
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#836EF9" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#836EF9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="block" hide />
        <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [v, 'Txns']}
          labelFormatter={v => `Block #${v?.toLocaleString()}`}
        />
        <Area type="monotone" dataKey="txCount" stroke="#836EF9" strokeWidth={1.5} fill="url(#txGrad)" dot={false} activeDot={{ r: 3, fill: '#A78BFA' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Gas utilization chart
function GasChart({ data }) {
  if (!data?.length) return <div className="skeleton" style={{ height: '120px', borderRadius: '8px' }} />
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="15%">
        <XAxis dataKey="block" hide />
        <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          formatter={v => [`${v}%`, 'Gas Used']}
          labelFormatter={v => `Block #${v?.toLocaleString()}`}
        />
        <Bar dataKey="gasUtil" radius={[2, 2, 0, 0]}>
          {data.map((b, i) => (
            <Cell key={i} fill={b.gasUtil > 80 ? '#A78BFA' : b.gasUtil > 50 ? '#836EF9' : 'rgba(131,110,249,0.35)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function NetworkStatsPage() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNetworkStats()
      if (!data) throw new Error('No data returned')
      setStats(data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard label="Latest Block"    value={stats?.latestBlock}       loading={loading} icon={Database}   accent="var(--purple)" />
        <StatCard label="Unique Addresses" value={stats?.uniqueAddresses}  loading={loading} icon={Users}      sub={`In last ${stats?.scannedBlocks || 100} blocks`} />
        <StatCard label="Contract Deploys" value={stats?.contractDeploys}  loading={loading} icon={FileCode}   sub="New contracts" accent="var(--blue)" />
        <StatCard label="Total Txns"       value={stats?.totalTxns}        loading={loading} icon={Activity}   sub={`${stats?.scannedBlocks || 100} blocks`} />
        <StatCard label="Avg Block Time"   value={stats?.avgBlockTime}     loading={loading} icon={Clock}      unit="sec" accent="var(--green)" />
        <StatCard label="Avg Txns/Block"   value={stats?.avgTxPerBlock ? parseFloat(stats.avgTxPerBlock) : null} loading={loading} icon={Zap} decimals={1} />
      </div>

      {error && (
        <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--red)' }}>
          Failed to load network stats: {error}. <button onClick={load} style={{ background: 'transparent', border: 'none', color: 'var(--purple)', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '14px' }}>
        <Section
          title="Block Transaction Volume"
          subtitle={`Last ${stats?.scannedBlocks || 100} blocks`}
          action={lastUpdated && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              Updated {lastUpdated}
            </span>
          )}
        >
          <BlockActivityChart data={stats?.blockChart} />
        </Section>

        <Section title="Transaction Breakdown" subtitle="By type in scanned window">
          <TxTypeBreakdown types={stats?.txTypes} />
        </Section>
      </div>

      {/* Gas chart */}
      <Section title="Gas Utilization Per Block" subtitle="How full each block is — higher = more demand on Monad">
        <GasChart data={stats?.blockChart} />
      </Section>

      {/* Network health panel */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            {
              label: 'Network Throughput',
              value: `${stats.tps} TPS`,
              sub: `${stats.totalTxns.toLocaleString()} txns in ${stats.timeSpan}s window`,
              color: 'var(--purple)',
              icon: Zap,
            },
            {
              label: 'Active Participants',
              value: `${stats.uniqueAddresses.toLocaleString()} wallets`,
              sub: `Unique addresses in ${stats.scannedBlocks} blocks`,
              color: 'var(--green)',
              icon: Users,
            },
            {
              label: 'Developer Activity',
              value: `${stats.contractDeploys} deploys`,
              sub: 'New contracts published on-chain',
              color: 'var(--blue)',
              icon: FileCode,
            },
            {
              label: 'Gas Efficiency',
              value: `${(stats.avgGasPerBlock / 1e6).toFixed(2)}M avg`,
              sub: 'Average gas used per block',
              color: 'var(--yellow)',
              icon: Database,
            },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.label} style={{ padding: '16px 18px', background: 'var(--bg-card)', border: `1px solid ${item.color}20`, borderLeft: `3px solid ${item.color}`, borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Icon size={13} color={item.color} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: item.color, marginBottom: '4px', letterSpacing: '-0.02em' }}>{item.value}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.sub}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
