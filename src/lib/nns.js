// Nad Name Service (.nad) — pure RPC implementation
// No external SDK required. Uses eth_call directly against Monad mainnet.
// Based on NNS registry contract on Monad mainnet.

const MONAD_RPC = 'https://rpc2.monad.xyz'
const FALLBACK_RPC = 'https://rpc3.monad.xyz'

// NNS Registry contract address on Monad mainnet
const NNS_REGISTRY = '0xc6d566ca6cba99cFdaf06B629A3e99CbC01b6b2'

// ── ABI selectors ─────────────────────────────────────────────────────────────
// addr(bytes32 node) → address
const ADDR_SELECTOR = '0x3b3b57de'
// resolver(bytes32 node) → address
const RESOLVER_SELECTOR = '0x0178b8bf'
// name(bytes32 node) → string (reverse registrar)
const NAME_SELECTOR = '0x691f3431'
// Reverse registrar for addr→name lookup
const REVERSE_REGISTRAR = '0x9062C0A6Dbd7FE00D09B6E6c52d6c94c8F5a1c8'

async function ethCall(to, data) {
  for (const rpc of [MONAD_RPC, FALLBACK_RPC]) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
        }),
      })
      const json = await res.json()
      if (json.result && json.result !== '0x') return json.result
    } catch {}
  }
  return null
}

// ── ENS-compatible namehash ───────────────────────────────────────────────────
async function keccak256(data) {
  // Use Web Crypto API for keccak — but Web Crypto only has SHA-256 not keccak
  // We implement keccak256 via a small lookup table approach using the RPC
  // Actually: use eth_call with a helper or inline keccak256
  // Simplest correct approach: use the RPC to compute keccak
  try {
    const res = await fetch(MONAD_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'web3_sha3',
        params: ['0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')],
      }),
    })
    const json = await res.json()
    return json.result // already 0x prefixed hex
  } catch {
    return null
  }
}

async function namehash(name) {
  let node = '0000000000000000000000000000000000000000000000000000000000000000'
  if (!name || name === '') return '0x' + node

  const labels = name.toLowerCase().split('.').reverse()
  for (const label of labels) {
    // keccak256(label)
    const enc = new TextEncoder()
    const labelBytes = enc.encode(label)
    const labelHash = await keccak256(labelBytes)
    if (!labelHash) return null

    // keccak256(node + labelHash)
    const nodeBytes  = hexToBytes(node)
    const labelBytes2 = hexToBytes(labelHash.slice(2))
    const combined = new Uint8Array(64)
    combined.set(nodeBytes, 0)
    combined.set(labelBytes2, 32)
    const nextHash = await keccak256(combined)
    if (!nextHash) return null
    node = nextHash.slice(2)
  }
  return '0x' + node
}

function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }
  return bytes
}

function decodeAddress(hex) {
  if (!hex || hex === '0x') return null
  // Address is last 20 bytes of 32-byte return
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length < 64) return null
  const addr = '0x' + clean.slice(-40)
  if (addr === '0x0000000000000000000000000000000000000000') return null
  return addr
}

function decodeString(hex) {
  if (!hex || hex === '0x') return null
  try {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex
    // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
    const lenHex = clean.slice(64, 128)
    const len = parseInt(lenHex, 16)
    if (!len || len > 200) return null
    const strHex = clean.slice(128, 128 + len * 2)
    let result = ''
    for (let i = 0; i < strHex.length; i += 2) {
      result += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16))
    }
    return result || null
  } catch { return null }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function resolveNadName(input) {
  const name = input.trim().toLowerCase()
  const nadName = name.endsWith('.nad') ? name : `${name}.nad`

  try {
    // 1. Compute namehash
    const node = await namehash(nadName)
    if (!node) return null

    // 2. Get resolver address from registry
    const nodeParam = node.slice(2).padStart(64, '0')
    const resolverHex = await ethCall(NNS_REGISTRY, RESOLVER_SELECTOR + nodeParam)
    const resolverAddr = decodeAddress(resolverHex)

    if (!resolverAddr) {
      // Try direct addr lookup on registry as fallback
      const directHex = await ethCall(NNS_REGISTRY, ADDR_SELECTOR + nodeParam)
      const directAddr = decodeAddress(directHex)
      if (directAddr) return { address: directAddr, name: nadName }
      return null
    }

    // 3. Call addr() on resolver
    const addrHex = await ethCall(resolverAddr, ADDR_SELECTOR + nodeParam)
    const address = decodeAddress(addrHex)
    if (address) return { address, name: nadName }

    return null
  } catch { return null }
}

export async function getPrimaryName(address) {
  try {
    // Reverse lookup: addr.reverse → name
    const cleanAddr = address.toLowerCase().slice(2)
    const reverseName = `${cleanAddr}.addr.reverse`
    const node = await namehash(reverseName)
    if (!node) return null

    const nodeParam = node.slice(2).padStart(64, '0')

    // Get reverse resolver
    const resolverHex = await ethCall(NNS_REGISTRY, RESOLVER_SELECTOR + nodeParam)
    const resolverAddr = decodeAddress(resolverHex)
    if (!resolverAddr) return null

    // Call name() on reverse resolver
    const nameHex = await ethCall(resolverAddr, NAME_SELECTOR + nodeParam)
    const name = decodeString(nameHex)
    return name?.endsWith('.nad') ? name : name ? `${name}.nad` : null
  } catch { return null }
}
