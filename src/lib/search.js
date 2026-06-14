import { getBlock } from './monad.js'

const RPC_ENDPOINTS = [
  'https://rpc2.monad.xyz',
  'https://rpc3.monad.xyz',
  'https://rpc.monad.xyz',
]

async function rpcCall(method, params = []) {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      })
      const data = await res.json()
      if (!data.error) return data.result
    } catch {}
  }
  throw new Error('All RPC endpoints failed')
}

export const RESULT_TYPES = {
  BLOCK:   'block',
  ADDRESS: 'address',
  TX:      'tx',
  NAD:     'nad',
  UNKNOWN: 'unknown',
}

function isAddress(q)  { return /^0x[0-9a-fA-F]{40}$/.test(q) }
function isTxHash(q)   { return /^0x[0-9a-fA-F]{64}$/.test(q) }
function isBlockNum(q) { return /^\d+$/.test(q) }
function isNadName(q)  { return q.endsWith('.nad') || (!q.startsWith('0x') && /^[a-zA-Z0-9_\-💜]+$/.test(q) && q.length >= 2) }

export async function globalSearch(query) {
  const q = query.trim()
  if (!q) return null

  // .nad name resolution — check first before anything else
  if (isNadName(q)) {
    try {
      const { resolveNadName } = await import('./nns.js')
      const resolved = await resolveNadName(q)
      if (resolved?.address) {
        return {
          type: RESULT_TYPES.NAD,
          data: { address: resolved.address, name: resolved.name },
          query: q,
        }
      }
    } catch {}
    // If .nad lookup failed and it looks like it could be a name, return not found
    if (q.endsWith('.nad')) {
      return { type: RESULT_TYPES.NAD, data: null, query: q, error: `.nad name not found or not registered` }
    }
  }

  // Block number
  if (isBlockNum(q)) {
    try {
      const block = await rpcCall('eth_getBlockByNumber', ['0x' + parseInt(q).toString(16), false])
      if (block) return { type: RESULT_TYPES.BLOCK, data: block, query: q }
    } catch {}
  }

  // Transaction hash
  if (isTxHash(q)) {
    try {
      const tx = await rpcCall('eth_getTransactionByHash', [q])
      if (tx) {
        const receipt = await rpcCall('eth_getTransactionReceipt', [q]).catch(() => null)
        return { type: RESULT_TYPES.TX, data: { ...tx, receipt }, query: q }
      }
    } catch {}
    return { type: RESULT_TYPES.TX, data: null, query: q, error: 'Transaction not found' }
  }

  // Wallet address
  if (isAddress(q)) {
    // Also try to get primary .nad name for this address
    let nadName = null
    try {
      const { getPrimaryName } = await import('./nns.js')
      nadName = await getPrimaryName(q)
    } catch {}
    return { type: RESULT_TYPES.ADDRESS, data: { address: q, nadName }, query: q }
  }

  return { type: RESULT_TYPES.UNKNOWN, data: null, query: q, error: 'No results found. Try a wallet address, .nad name, tx hash, or block number.' }
}
