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

// ── Phase 3 wallet enrichment ──────────────────────────────────────────────

// Get multiple blocks in batch for faster fetching
export async function batchGetBlocks(blockNumbers) {
  const RPC = 'https://rpc2.monad.xyz'
  const batch = blockNumbers.map((n, i) => ({
    jsonrpc: '2.0', id: i + 1, method: 'eth_getBlockByNumber',
    params: ['0x' + n.toString(16), false],
  }))
  try {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
    const data = await res.json()
    return Array.isArray(data) ? data.map(d => d.result).filter(Boolean) : []
  } catch { return [] }
}

// Binary search for approximate first block of a wallet
// Uses tx count at different block heights to narrow down
export async function findFirstTxBlock(address) {
  try {
    const latest = await getLatestBlockNumber()
    let lo = 0, hi = latest
    // Quick check — if tx count at genesis is > 0 it was pre-existing
    const countAtLatest = await getTransactionCount(address)
    if (countAtLatest === 0) return null

    // Binary search: find earliest block where txCount > 0
    for (let i = 0; i < 10; i++) {
      const mid = Math.floor((lo + hi) / 2)
      try {
        const hexBlock = '0x' + mid.toString(16)
        const res = await fetch('https://rpc2.monad.xyz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionCount', params: [address, hexBlock] }),
        })
        const data = await res.json()
        const count = parseInt(data.result, 16)
        if (count === 0) lo = mid + 1
        else hi = mid
      } catch { break }
    }
    return hi
  } catch { return null }
}

// Get recent transactions for an address via eth_getBlockByNumber scanning
// Uses a small window of recent blocks
export async function getRecentTxsForAddress(address, blockCount = 50) {
  try {
    const latest = await getLatestBlockNumber()
    const startBlock = Math.max(0, latest - blockCount)
    const txs = []
    // Fetch in batches of 10
    for (let b = latest; b >= startBlock && txs.length < 20; b -= 10) {
      const blockNums = Array.from({ length: Math.min(10, b - startBlock + 1) }, (_, i) => b - i)
      const batch = blockNums.map((n, i) => ({
        jsonrpc: '2.0', id: i + 1,
        method: 'eth_getBlockByNumber',
        params: ['0x' + n.toString(16), true],
      }))
      try {
        const res = await fetch('https://rpc2.monad.xyz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        })
        const data = await res.json()
        const blocks = Array.isArray(data) ? data.map(d => d.result).filter(Boolean) : []
        for (const block of blocks) {
          if (!block?.transactions) continue
          for (const tx of block.transactions) {
            const addr = address.toLowerCase()
            if (tx.from?.toLowerCase() === addr || tx.to?.toLowerCase() === addr) {
              txs.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: parseInt(tx.value || '0x0', 16),
                blockNumber: parseInt(block.number, 16),
                timestamp: parseInt(block.timestamp, 16),
                direction: tx.from?.toLowerCase() === addr ? 'out' : 'in',
                gasPrice: parseInt(tx.gasPrice || '0x0', 16),
              })
              if (txs.length >= 20) break
            }
          }
          if (txs.length >= 20) break
        }
      } catch { break }
    }
    return txs
  } catch { return [] }
}

// Get ERC20 token transfers for address using eth_getLogs
export async function getTokenTransfers(address) {
  try {
    const latest = await getLatestBlockNumber()
    const fromBlock = '0x' + Math.max(0, latest - 10000).toString(16)
    // ERC20 Transfer event topic
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const addrPadded = '0x' + address.slice(2).toLowerCase().padStart(64, '0')

    // Incoming transfers
    const res = await fetch('https://rpc2.monad.xyz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_getLogs',
        params: [{ fromBlock, toBlock: 'latest', topics: [TRANSFER_TOPIC, null, addrPadded] }],
      }),
    })
    const data = await res.json()
    const logs = data.result || []
    // Get unique token contracts
    const contracts = [...new Set(logs.map(l => l.address))]
    return { logs: logs.slice(0, 50), tokenContracts: contracts.slice(0, 10) }
  } catch { return { logs: [], tokenContracts: [] } }
}
