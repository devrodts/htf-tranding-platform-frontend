/**
 * Real-Time Data Hook - Enterprise-grade data management with Zustand
 */

'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { useMarketDataStore } from '@/store/marketDataStore'
import { RealTimeDataService, SubscriptionRequest, type ConnectionConfig } from '@/market-data/infrastructure/services/RealTimeDataService'

let globalDataService: RealTimeDataService | null = null

export interface UseRealTimeDataOptions {
  autoConnect?: boolean
  reconnectOnMount?: boolean
  config?: Partial<ConnectionConfig>
}

export function useRealTimeData(options: UseRealTimeDataOptions = {}) {
  const {
    autoConnect = false, // Disabled since we're using REST API only
    reconnectOnMount = false,
    config = {}
  } = options

  const {
    connectionStatus,
    setConnectionStatus,
    addSubscription,
    removeSubscription,
    updateMarketData,
    getSubscriptions,
    metrics,
    updateMetrics
  } = useMarketDataStore()

  // Initialize service if not already created
  const dataService = useMemo(() => {
    if (!globalDataService) {
      const defaultConfig: ConnectionConfig = {
        url: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.viewtrading.com/ws',
        apiKey: process.env.NEXT_PUBLIC_VIEW_TRADING_API_KEY || '',
        reconnectAttempts: 5,
        reconnectDelayMs: 1000,
        heartbeatIntervalMs: 30000,
        messageTimeoutMs: 10000,
        circuitBreakerThreshold: 5,
        circuitBreakerResetTimeMs: 60000,
        ...config
      }

      globalDataService = new RealTimeDataService(defaultConfig)

      // Set up event listeners
      globalDataService.on('connecting', () => {
        console.log('WebSocket connecting...')
        setConnectionStatus('connecting')
      })

      globalDataService.on('connected', () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
      })

      globalDataService.on('disconnected', (data) => {
        console.log('WebSocket disconnected:', data)
        setConnectionStatus('disconnected')
      })

      globalDataService.on('reconnecting', (data) => {
        console.log(`WebSocket reconnecting (${data.attempt}/${data.maxAttempts})`)
        setConnectionStatus('reconnecting')
      })

      globalDataService.on('failed', (data) => {
        console.error('WebSocket connection failed:', data)
        setConnectionStatus('failed')
      })

      globalDataService.on('error', (data) => {
        console.error('WebSocket error:', data)
      })

      // Market data event listeners
      globalDataService.on('quote', (data) => {
        updateMarketData(data.symbol, {
          type: 'quote',
          data: data.data,
          timestamp: data.timestamp
        })
      })

      globalDataService.on('trade', (data) => {
        updateMarketData(data.symbol, {
          type: 'trade',
          data: data.data,
          timestamp: data.timestamp
        })
      })

      globalDataService.on('level2', (data) => {
        updateMarketData(data.symbol, {
          type: 'level2',
          data: data.data,
          timestamp: data.timestamp
        })
      })

      globalDataService.on('news', (data) => {
        updateMarketData(data.symbol, {
          type: 'news',
          data: data.data,
          timestamp: data.timestamp
        })
      })

      // Metrics updates
      const metricsInterval = setInterval(() => {
        if (globalDataService) {
          const serviceMetrics = globalDataService.getMetrics()
          updateMetrics({
            messagesReceived: serviceMetrics.messagesReceived,
            messagesDropped: serviceMetrics.messagesDropped,
            averageLatency: serviceMetrics.averageLatency,
            connectionUptime: Date.now() - serviceMetrics.lastConnectionTime,
            subscriptions: getSubscriptions().length,
            lastUpdate: new Date()
          })
        }
      }, 5000)

      // Cleanup on service destruction
      const originalDestroy = globalDataService.destroy.bind(globalDataService)
      globalDataService.destroy = () => {
        clearInterval(metricsInterval)
        originalDestroy()
        globalDataService = null
      }
    }

    return globalDataService
  }, [config, setConnectionStatus, updateMarketData, getSubscriptions, updateMetrics])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && connectionStatus === 'disconnected') {
      dataService.connect().catch(console.error)
    }
  }, [autoConnect, connectionStatus, dataService])

  // Reconnect on mount if specified
  useEffect(() => {
    if (reconnectOnMount && connectionStatus === 'disconnected') {
      dataService.connect().catch(console.error)
    }
  }, [reconnectOnMount, connectionStatus, dataService])

  // Connect function
  const connect = useCallback(async () => {
    try {
      await dataService.connect()
      return { success: true }
    } catch (error) {
      console.error('Failed to connect:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, [dataService])

  // Disconnect function
  const disconnect = useCallback(() => {
    dataService.disconnect()
  }, [dataService])

  // Subscribe function
  const subscribe = useCallback((request: SubscriptionRequest, callback?: (data: any) => void) => {
    // Add to store
    const subscriptionId = `${request.symbols.join(',')}_${request.types.join(',')}`
    addSubscription({
      id: subscriptionId,
      symbols: request.symbols,
      types: request.types,
      callback,
      createdAt: new Date()
    })

    // Subscribe via service
    if (callback) {
      request.types.forEach(type => {
        dataService.on(type, callback)
      })
    }

    dataService.subscribe(request)

    return subscriptionId
  }, [dataService, addSubscription])

  // Unsubscribe function
  const unsubscribe = useCallback((request: SubscriptionRequest, callback?: (data: any) => void) => {
    // Remove from store
    const subscriptionId = `${request.symbols.join(',')}_${request.types.join(',')}`
    removeSubscription(subscriptionId)

    // Unsubscribe via service
    if (callback) {
      request.types.forEach(type => {
        dataService.off(type, callback)
      })
    }

    dataService.unsubscribe(request)
  }, [dataService, removeSubscription])

  // Subscribe to multiple symbols at once
  const subscribeToSymbols = useCallback((
    symbols: string[],
    types: SubscriptionRequest['types'] = ['quotes', 'trades'],
    callback?: (data: any) => void
  ) => {
    return subscribe({ symbols, types }, callback)
  }, [subscribe])

  // Subscribe to quotes only
  const subscribeToQuotes = useCallback((symbols: string[], callback?: (data: any) => void) => {
    return subscribe({ symbols, types: ['quotes'] }, callback)
  }, [subscribe])

  // Subscribe to trades only
  const subscribeToTrades = useCallback((symbols: string[], callback?: (data: any) => void) => {
    return subscribe({ symbols, types: ['trades'] }, callback)
  }, [subscribe])

  // Subscribe to level 2 data
  const subscribeToLevel2 = useCallback((
    symbols: string[], 
    depth = 20, 
    callback?: (data: any) => void
  ) => {
    return subscribe({ symbols, types: ['level2'], depth }, callback)
  }, [subscribe])

  // Health check
  const getHealthStatus = useCallback(() => {
    return dataService.getHealthStatus()
  }, [dataService])

  // Get service metrics
  const getServiceMetrics = useCallback(() => {
    return dataService.getMetrics()
  }, [dataService])

  // Get current subscriptions from service
  const getActiveSubscriptions = useCallback(() => {
    return dataService.getSubscriptions()
  }, [dataService])

  return {
    // Connection management
    connect,
    disconnect,
    connectionStatus,
    
    // Subscription management
    subscribe,
    unsubscribe,
    subscribeToSymbols,
    subscribeToQuotes,
    subscribeToTrades,
    subscribeToLevel2,
    
    // State and metrics
    metrics,
    getHealthStatus,
    getServiceMetrics,
    getActiveSubscriptions,
    
    // Service instance (for advanced use cases)
    dataService
  }
}

// Hook for accessing market data from store
export function useMarketData(symbol?: string) {
  const { marketData, getSymbolData } = useMarketDataStore()

  if (symbol) {
    return getSymbolData(symbol)
  }

  return marketData
}

// Hook for connection status only
export function useConnectionStatus() {
  const { connectionStatus } = useMarketDataStore()
  return connectionStatus
}

// Hook for subscription management
export function useSubscriptions() {
  const { subscriptions, addSubscription, removeSubscription } = useMarketDataStore()
  
  return {
    subscriptions,
    addSubscription,
    removeSubscription,
    subscriptionCount: subscriptions.length
  }
}