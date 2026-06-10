// Whale / wallet tracking utilities
// Uses Monad RPC to scan large balance wallets and known protocol addresses

// Known Monad ecosystem contract addresses for labeling
export const KNOWN_LABELS = {
  '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A': { name: 'Wrapped MON', type: 'token', tag: 'WMON' },
  '0xcA11bde05977b3631167028862bE2a173976CA11': { name: 'Multicall3', type: 'infra', tag: 'INFRA' },
  '0x000000000022d473030f116ddee9f6b43ac78ba3': { name: 'Permit2 (Uniswap)', type: 'defi', tag: 'UNI' },
  '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789': { name: 'ERC-4337 EntryPoint', type: 'infra', tag: 'AA' },
  '0x69f4D1788e39c87893C980c06EdF4b7f686e2938': { name: 'Safe Singleton', type: 'wallet', tag: 'SAFE' },
}

// Watchlist stored in localStorage
const WATCHLIST_KEY = 'nadlens_watchlist'
const TAGS_KEY = 'nadlens_wallet_tags'

export function getWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function addToWatchlist(address, label = '') {
  const list = getWatchlist()
  if (!list.find(w => w.address.toLowerCase() === address.toLowerCase())) {
    list.unshift({ address, label, addedAt: Date.now() })
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list.slice(0, 50)))
  }
  return getWatchlist()
}

export function removeFromWatchlist(address) {
  const list = getWatchlist().filter(w => w.address.toLowerCase() !== address.toLowerCase())
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list))
  return list
}

export function getUserTags() {
  try {
    const raw = localStorage.getItem(TAGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function tagWallet(address, tag) {
  const tags = getUserTags()
  tags[address.toLowerCase()] = tag
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
}

export function getLabel(address) {
  if (!address) return null
  const known = KNOWN_LABELS[address]
  if (known) return known
  const tags = getUserTags()
  const userTag = tags[address.toLowerCase()]
  if (userTag) return { name: userTag, type: 'user', tag: 'TAGGED' }
  return null
}

// Classify wallet activity level based on tx count
export function classifyWallet(txCount) {
  if (txCount > 10000) return { label: 'Whale', color: '#A78BFA' }
  if (txCount > 1000) return { label: 'Active', color: '#4ADE80' }
  if (txCount > 100) return { label: 'Regular', color: '#60A5FA' }
  if (txCount > 10) return { label: 'Casual', color: '#FCD34D' }
  return { label: 'New', color: '#94A3B8' }
}

// Risk score based on heuristics (0-100)
export function riskScore(txCount, balance) {
  // Simple heuristic for demo — in prod this would use Snowball ORS or similar
  let score = 50
  if (txCount > 5000) score -= 20  // experienced user, lower risk
  if (txCount < 5) score += 20     // very new, higher risk
  if (balance > 10000) score -= 10 // large holder, likely not scammer
  return Math.max(0, Math.min(100, score))
}
