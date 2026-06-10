import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getLatestBlockNumber, getBlock, getBlockWithTxns,
  getRecentBlocks, calculateTPS, getGasPrice, weiToGwei,
  getBalance, getTransactionCount, weiToMon
} from '../lib/monad.js'

const POLL_INTERVAL = 2000

export function useChainData() {
  const [data, setData] = useState({
    latestBlock: null, tps: 0, gasPrice: null,
    blockHistory: [], tpsHistory: [], recentBlocks: [],
    status: 'connecting', lastUpdated: null,
  })
  const blockHistoryRef = useRef([])
  const tpsHistoryRef = useRef([])
  const seenBlocksRef = useRef(new Set())

  const fetchChainData = useCallback(async () => {
    try {
      const [latestBlockNum, gasPriceWei] = await Promise.all([
        getLatestBlockNumber(), getGasPrice(),
      ])
      const latestBlock = await getBlockWithTxns(latestBlockNum)
      if (!latestBlock) return

      const blockNum = parseInt(latestBlock.number, 16)

      if (!seenBlocksRef.current.has(blockNum)) {
        seenBlocksRef.current.add(blockNum)

        blockHistoryRef.current = [
          ...blockHistoryRef.current.slice(-59),
          {
            number: blockNum,
            timestamp: parseInt(latestBlock.timestamp, 16),
            txCount: latestBlock.transactions?.length ?? 0,
            gasUsed: parseInt(latestBlock.gasUsed, 16),
            gasLimit: parseInt(latestBlock.gasLimit, 16),
          }
        ]

        const recentBlocks = await getRecentBlocks(10)
        const currentTPS = calculateTPS(recentBlocks)
        const now = Date.now()

        tpsHistoryRef.current = [
          ...tpsHistoryRef.current.slice(-59),
          { time: now, tps: currentTPS, block: blockNum }
        ]

        setData(prev => ({
          ...prev,
          latestBlock: {
            number: blockNum,
            hash: latestBlock.hash,
            timestamp: parseInt(latestBlock.timestamp, 16),
            txCount: latestBlock.transactions?.length ?? 0,
            gasUsed: parseInt(latestBlock.gasUsed, 16),
            gasLimit: parseInt(latestBlock.gasLimit, 16),
            miner: latestBlock.miner,
          },
          tps: currentTPS,
          gasPrice: parseFloat(weiToGwei(gasPriceWei)),
          blockHistory: [...blockHistoryRef.current],
          tpsHistory: [...tpsHistoryRef.current],
          recentBlocks: [...blockHistoryRef.current].slice(-10).reverse(),
          status: 'live',
          lastUpdated: now,
        }))
      } else {
        setData(prev => ({
          ...prev,
          gasPrice: parseFloat(weiToGwei(gasPriceWei)),
          status: 'live',
        }))
      }
    } catch (err) {
      console.error('Chain data error:', err)
      setData(prev => ({ ...prev, status: 'error' }))
    }
  }, [])

  useEffect(() => {
    fetchChainData()
    const interval = setInterval(fetchChainData, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchChainData])

  return data
}

export function useWalletData(address) {
  const [data, setData] = useState({ balance: null, txCount: null, loading: true, error: null })

  useEffect(() => {
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setData({ balance: null, txCount: null, loading: false, error: 'Invalid address' })
      return
    }
    async function fetchWallet() {
      setData(prev => ({ ...prev, loading: true, error: null }))
      try {
        const [balWei, txCount] = await Promise.all([
          getBalance(address), getTransactionCount(address),
        ])
        setData({ balance: parseFloat(weiToMon(balWei)), txCount, loading: false, error: null })
      } catch (err) {
        setData({ balance: null, txCount: null, loading: false, error: err.message })
      }
    }
    fetchWallet()
  }, [address])

  return data
}
