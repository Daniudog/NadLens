import { useState, useEffect } from 'react'
import {
  getMonadTVL, getMonadTVLHistory, getMonadProtocols,
  getMonadDexVolume, getMonadFees, getMonadStablecoins,
  getMonadYields, getMonPrice
} from '../lib/defillama.js'

// Cache to avoid hammering DefiLlama on every render
const cache = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function cached(key, fn) {
  const now = Date.now()
  if (cache[key] && (now - cache[key].ts) < CACHE_TTL) return cache[key].data
  const data = await fn()
  cache[key] = { data, ts: now }
  return data
}

export function useEcosystemData() {
  const [data, setData] = useState({
    tvl: null,
    tvlHistory: [],
    protocols: [],
    dex: null,
    fees: null,
    stables: null,
    yields: [],
    monPrice: null,
    loading: true,
    error: null,
    lastUpdated: null,
  })

  useEffect(() => {
    async function fetch() {
      try {
        const [tvl, tvlHistory, protocols, dex, fees, stables, yields, monPrice] = await Promise.allSettled([
          cached('tvl', getMonadTVL),
          cached('tvlHistory', getMonadTVLHistory),
          cached('protocols', getMonadProtocols),
          cached('dex', getMonadDexVolume),
          cached('fees', getMonadFees),
          cached('stables', getMonadStablecoins),
          cached('yields', getMonadYields),
          cached('monPrice', getMonPrice),
        ])

        setData({
          tvl: tvl.status === 'fulfilled' ? tvl.value : null,
          tvlHistory: tvlHistory.status === 'fulfilled' ? tvlHistory.value : [],
          protocols: protocols.status === 'fulfilled' ? protocols.value : [],
          dex: dex.status === 'fulfilled' ? dex.value : null,
          fees: fees.status === 'fulfilled' ? fees.value : null,
          stables: stables.status === 'fulfilled' ? stables.value : null,
          yields: yields.status === 'fulfilled' ? yields.value : [],
          monPrice: monPrice.status === 'fulfilled' ? monPrice.value : null,
          loading: false,
          error: null,
          lastUpdated: Date.now(),
        })
      } catch (err) {
        setData(prev => ({ ...prev, loading: false, error: err.message }))
      }
    }

    fetch()
    // Refresh every 5 minutes
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return data
}

export function useProtocolDetail(slug) {
  const [data, setData] = useState({ protocol: null, loading: true, error: null })

  useEffect(() => {
    if (!slug) return
    async function fetch() {
      try {
        const res = await window.fetch(`https://api.llama.fi/protocol/${slug}`)
        if (!res.ok) throw new Error('Not found')
        const protocol = await res.json()
        setData({ protocol, loading: false, error: null })
      } catch (err) {
        setData({ protocol: null, loading: false, error: err.message })
      }
    }
    fetch()
  }, [slug])

  return data
}
