// Monad Mainnet RPC endpoints - rotated for rate limit resilience
const RPC_ENDPOINTS = [
  'https://rpc2.monad.xyz',   // Goldsky - 300/10s, supports historical
  'https://rpc3.monad.xyz',   // Ankr - 300/10s
  'https://rpc.monad.xyz',    // QuickNode - 25 rps
]

let rpcIndex = 0

async function rpcCall(method, params = []) {
  const endpoint = RPC_ENDPOINTS[rpcIndex % RPC_ENDPOINTS.length]
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.result
  } catch (err) {
    rpcIndex = (rpcIndex + 1) % RPC_ENDPOINTS.length
    throw err
  }
}

export async function getLatestBlockNumber() {
  const hex = await rpcCall('eth_blockNumber')
  return parseInt(hex, 16)
}

export async function getBlock(blockNumberOrTag = 'latest') {
  const tag = typeof blockNumberOrTag === 'number'
    ? '0x' + blockNumberOrTag.toString(16)
    : blockNumberOrTag
  return rpcCall('eth_getBlockByNumber', [tag, false])
}

export async function getBlockWithTxns(blockNumberOrTag = 'latest') {
  const tag = typeof blockNumberOrTag === 'number'
    ? '0x' + blockNumberOrTag.toString(16)
    : blockNumberOrTag
  return rpcCall('eth_getBlockByNumber', [tag, true])
}

export async function getGasPrice() {
  const hex = await rpcCall('eth_gasPrice')
  return parseInt(hex, 16)
}

export async function getBalance(address) {
  const hex = await rpcCall('eth_getBalance', [address, 'latest'])
  return parseInt(hex, 16)
}

export async function getTransactionCount(address) {
  const hex = await rpcCall('eth_getTransactionCount', [address, 'latest'])
  return parseInt(hex, 16)
}

export async function getRecentBlocks(count = 20) {
  const latest = await getLatestBlockNumber()
  const promises = []
  for (let i = 0; i < count; i++) {
    promises.push(getBlock(latest - i).catch(() => null))
  }
  const blocks = await Promise.all(promises)
  return blocks.filter(Boolean)
}

export function calculateTPS(blocks) {
  if (blocks.length < 2) return 0
  const sorted = [...blocks].sort((a, b) => parseInt(a.number, 16) - parseInt(b.number, 16))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const timeSpan = parseInt(last.timestamp, 16) - parseInt(first.timestamp, 16)
  if (timeSpan === 0) return 0
  const totalTxns = sorted.reduce((sum, b) => sum + (b.transactions?.length ?? 0), 0)
  return Math.round(totalTxns / timeSpan)
}

export function weiToMon(wei) {
  return (Number(BigInt(wei)) / 1e18).toFixed(4)
}

export function weiToGwei(wei) {
  return (wei / 1e9).toFixed(4)
}

export function shortAddress(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export function formatNumber(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toLocaleString()
}

export function formatCount(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export function formatTime(timestamp) {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 16) : timestamp
  const now = Math.floor(Date.now() / 1000)
  const diff = now - ts
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function formatUSD(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(2)
}

export function pct(a, b) {
  if (!b) return 0
  return ((a - b) / b * 100).toFixed(1)
}
