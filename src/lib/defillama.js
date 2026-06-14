// DefiLlama Free API — no key required
// Docs: https://api-docs.defillama.com
const BASE = 'https://api.llama.fi'
const STABLECOINS_BASE = 'https://stablecoins.llama.fi'

async function llamaFetch(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DefiLlama ${res.status}: ${url}`)
  return res.json()
}

// Chain TVL — current for all chains, then filter Monad
export async function getMonadTVL() {
  const chains = await llamaFetch(`${BASE}/v2/chains`)
  const monad = chains.find(c => c.name?.toLowerCase() === 'monad')
  return monad ? monad.tvl : null
}

// Historical TVL for Monad — array of { date, tvl }
export async function getMonadTVLHistory() {
  const data = await llamaFetch(`${BASE}/v2/historicalChainTvl/Monad`)
  return data.map(d => ({
    date: d.date,
    tvl: d.tvl,
    label: new Date(d.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))
}

// All protocols on Monad
export async function getMonadProtocols() {
  const all = await llamaFetch(`${BASE}/protocols`)
  return all
    .filter(p => p.chains?.includes('Monad'))
    .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
}

// DEX volume overview for Monad
export async function getMonadDexVolume() {
  try {
    const data = await llamaFetch(`${BASE}/overview/dexs/Monad?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume`)
    return {
      total24h: data.total24h || 0,
      total7d: data.total7d || 0,
      totalAllTime: data.totalAllTime || 0,
      protocols: (data.protocols || []).sort((a, b) => (b.total24h || 0) - (a.total24h || 0)).slice(0, 10),
      dailyChart: data.totalDataChart || [],
    }
  } catch {
    return { total24h: 0, total7d: 0, totalAllTime: 0, protocols: [], dailyChart: [] }
  }
}

// Fees overview for Monad
export async function getMonadFees() {
  try {
    const data = await llamaFetch(`${BASE}/overview/fees/Monad?excludeTotalDataChart=false&dataType=dailyFees`)
    return {
      total24h: data.total24h || 0,
      total7d: data.total7d || 0,
      protocols: (data.protocols || []).sort((a, b) => (b.total24h || 0) - (a.total24h || 0)).slice(0, 10),
      dailyChart: data.totalDataChart || [],
    }
  } catch {
    return { total24h: 0, total7d: 0, protocols: [], dailyChart: [] }
  }
}

// Stablecoin mcap on Monad
export async function getMonadStablecoins() {
  try {
    const data = await llamaFetch(`${STABLECOINS_BASE}/stablecoincharts/Monad`)
    if (!data || !data.length) return { current: 0, history: [] }
    const latest = data[data.length - 1]
    const current = Object.values(latest.totalCirculatingUSD || {}).reduce((a, b) => a + b, 0)
    const history = data.slice(-30).map(d => ({
      date: d.date,
      mcap: Object.values(d.totalCirculatingUSD || {}).reduce((a, b) => a + b, 0),
      label: new Date(d.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
    return { current, history }
  } catch {
    return { current: 0, history: [] }
  }
}

// Yields/pools on Monad
export async function getMonadYields() {
  try {
    const data = await llamaFetch('https://yields.llama.fi/pools')
    const monadPools = data.data
      .filter(p => p.chain?.toLowerCase() === 'monad')
      .sort((a, b) => (b.tvlUsd || 0) - (a.tvlUsd || 0))
      .slice(0, 20)
    return monadPools
  } catch {
    return []
  }
}

// MON token price via DefiLlama coins API
export async function getMonPrice() {
  try {
    const data = await llamaFetch(`${BASE}/prices/current/coingecko:monad-ecosystem`)
    const coins = data.coins || {}
    const entry = Object.values(coins)[0]
    return entry ? { price: entry.price, confidence: entry.confidence } : null
  } catch {
    return null
  }
}
