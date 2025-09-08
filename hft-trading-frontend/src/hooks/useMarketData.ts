/**
 * Market Data Hooks - Real-time market data management
 */

import { useState, useEffect, useCallback } from 'react'
import { useMarketDataStore } from '@/store/marketDataStore'
import { Symbol } from '@/trading/domain/value-objects/Symbol'
import { Price } from '@/trading/domain/value-objects/Price'

export interface MarketDataPoint {
  symbol: string
  price: number
  bid: number
  ask: number
  spread: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  timestamp: Date
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  lastHeartbeat?: Date
  reconnectAttempts?: number
}

/**
 * Hook for real-time market data
 */
export function useMarketData(symbols?: string[]) {
  const [data, setData] = useState<Record<string, MarketDataPoint>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from C++ backend
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8080/api/market-data')
      if (!response.ok) {
        throw new Error('Failed to fetch market data')
      }
      const backendData = await response.json()
      
      // Transform backend data to our format
      const transformedData: Record<string, MarketDataPoint> = {}
      
      if (Array.isArray(backendData)) {
        backendData.forEach((item: any) => {
          // Skip invalid data (inf, NaN values)
          if (!isFinite(item.last) || !isFinite(item.bid) || !isFinite(item.ask) || 
              !isFinite(item.change) || !isFinite(item.change_percent)) {
            return
          }
          
          transformedData[item.symbol] = {
            symbol: item.symbol,
            price: item.last,
            bid: item.bid,
            ask: item.ask,
            spread: item.ask - item.bid,
            change: item.change,
            changePercent: item.change_percent,
            volume: item.volume,
            high: item.high || item.last * 1.02,
            low: item.low || item.last * 0.98,
            timestamp: new Date(item.timestamp)
          }
        })
      }
      
      // If no valid data from backend, use mock data
      if (Object.keys(transformedData).length === 0) {
        throw new Error('No valid market data from backend')
      }
      
      setData(transformedData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Fallback to mock data on error
      const mockData: Record<string, MarketDataPoint> = {
      'AAPL': {
        symbol: 'AAPL',
        price: 175.43,
        bid: 175.40,
        ask: 175.46,
        spread: 0.06,
        change: 2.34,
        changePercent: 1.35,
        volume: 45678900,
        high: 176.89,
        low: 173.21,
        timestamp: new Date()
      },
      'GOOGL': {
        symbol: 'GOOGL',
        price: 2845.67,
        bid: 2845.50,
        ask: 2845.84,
        spread: 0.34,
        change: -15.43,
        changePercent: -0.54,
        volume: 1234567,
        high: 2867.89,
        low: 2834.56,
        timestamp: new Date()
      },
      'MSFT': {
        symbol: 'MSFT',
        price: 334.78,
        bid: 334.75,
        ask: 334.81,
        spread: 0.06,
        change: 4.56,
        changePercent: 1.38,
        volume: 23456789,
        high: 336.12,
        low: 331.45,
        timestamp: new Date()
      },
      'TSLA': {
        symbol: 'TSLA',
        price: 248.56,
        bid: 248.50,
        ask: 248.62,
        spread: 0.12,
        change: -8.94,
        changePercent: -3.47,
        volume: 98765432,
        high: 256.78,
        low: 245.23,
        timestamp: new Date()
      },
      'AMZN': {
        symbol: 'AMZN',
        price: 3234.56,
        bid: 3234.20,
        ask: 3234.92,
        spread: 0.72,
        change: 45.67,
        changePercent: 1.43,
        volume: 3456789,
        high: 3267.89,
        low: 3198.45,
        timestamp: new Date()
      },
      'NVDA': {
        symbol: 'NVDA',
        price: 456.78,
        bid: 456.72,
        ask: 456.84,
        spread: 0.12,
        change: 12.34,
        changePercent: 2.78,
        volume: 45678900,
        high: 467.89,
        low: 445.23,
        timestamp: new Date()
      },
      'META': {
        symbol: 'META',
        price: 345.67,
        bid: 345.60,
        ask: 345.74,
        spread: 0.14,
        change: -6.78,
        changePercent: -1.92,
        volume: 12345678,
        high: 352.34,
        low: 342.89,
        timestamp: new Date()
      },
      'NFLX': {
        symbol: 'NFLX',
        price: 456.89,
        bid: 456.82,
        ask: 456.96,
        spread: 0.14,
        change: 8.94,
        changePercent: 2.00,
        volume: 6789012,
        high: 463.45,
        low: 448.67,
        timestamp: new Date()
      }
      }
      
      setData(mockData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarketData()
    
    // Refresh data every 5 seconds from backend
    const interval = setInterval(fetchMarketData, 5000)

    return () => clearInterval(interval)
  }, [fetchMarketData])

  const getSymbolData = useCallback((symbol: string) => {
    return data[symbol] || null
  }, [data])

  const getMultipleSymbolData = useCallback((symbolList: string[]) => {
    return symbolList.reduce((acc, symbol) => {
      const symbolData = data[symbol]
      if (symbolData) {
        acc[symbol] = symbolData
      }
      return acc
    }, {} as Record<string, MarketDataPoint>)
  }, [data])

  return {
    data,
    loading,
    error,
    getSymbolData,
    getMultipleSymbolData,
    subscribe: (symbol: string) => {
      // Mock subscription logic
      console.log(`Subscribed to ${symbol}`)
    },
    unsubscribe: (symbol: string) => {
      // Mock unsubscription logic
      console.log(`Unsubscribed from ${symbol}`)
    }
  }
}

/**
 * Hook for WebSocket connection status
 */
export function useConnectionStatus(): string {
  const [status, setStatus] = useState<string>('connected')
  const [heartbeat, setHeartbeat] = useState<Date>(new Date())

  useEffect(() => {
    // Mock connection status
    const interval = setInterval(() => {
      setHeartbeat(new Date())
      // Occasionally simulate disconnection
      if (Math.random() < 0.05) { // 5% chance
        setStatus('disconnected')
        setTimeout(() => setStatus('connected'), 3000)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return status
}

/**
 * Hook for market statistics
 */
export function useMarketStats() {
  const { data } = useMarketData()
  
  const stats = {
    advancing: 0,
    declining: 0,
    unchanged: 0,
    totalVolume: 0,
    averageChange: 0
  }

  Object.values(data).forEach(item => {
    if (item.changePercent > 0) stats.advancing++
    else if (item.changePercent < 0) stats.declining++
    else stats.unchanged++
    
    stats.totalVolume += item.volume
  })

  const totalSymbols = Object.keys(data).length
  if (totalSymbols > 0) {
    stats.averageChange = Object.values(data)
      .reduce((sum, item) => sum + item.changePercent, 0) / totalSymbols
  }

  return stats
}

/**
 * Hook for watchlist management
 */
export function useWatchlist(initialSymbols: string[] = []) {
  const [watchlist, setWatchlist] = useState<string[]>(initialSymbols)
  const marketData = useMarketData()

  const addSymbol = useCallback((symbol: string) => {
    setWatchlist(prev => {
      if (!prev.includes(symbol)) {
        marketData.subscribe(symbol)
        return [...prev, symbol]
      }
      return prev
    })
  }, [marketData])

  const removeSymbol = useCallback((symbol: string) => {
    setWatchlist(prev => {
      const newList = prev.filter(s => s !== symbol)
      if (prev.includes(symbol)) {
        marketData.unsubscribe(symbol)
      }
      return newList
    })
  }, [marketData])

  const watchlistData = marketData.getMultipleSymbolData(watchlist)

  return {
    watchlist,
    watchlistData,
    addSymbol,
    removeSymbol,
    loading: marketData.loading
  }
}