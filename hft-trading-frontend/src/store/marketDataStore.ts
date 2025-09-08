/**
 * Market Data Store - Zustand with Immer for immutable updates
 * Enterprise-grade state management for real-time trading data
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'

export interface MarketDataPoint {
  type: 'quote' | 'trade' | 'level2' | 'news'
  data: any
  timestamp: number
}

export interface SymbolMarketData {
  symbol: string
  quote?: {
    bid: number
    ask: number
    bidSize: number
    askSize: number
    spread: number
    timestamp: number
  }
  lastTrade?: {
    price: number
    size: number
    side: 'BUY' | 'SELL'
    timestamp: number
  }
  level2?: {
    bids: Array<{ price: number; size: number; orders: number }>
    asks: Array<{ price: number; size: number; orders: number }>
    timestamp: number
  }
  dailyStats?: {
    open: number
    high: number
    low: number
    close: number
    volume: number
    change: number
    changePercent: number
  }
  news?: Array<{
    id: string
    headline: string
    summary: string
    timestamp: number
    source: string
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
  lastUpdate: Date
}

export interface Subscription {
  id: string
  symbols: string[]
  types: Array<'quotes' | 'trades' | 'level2' | 'news'>
  callback?: (data: any) => void
  createdAt: Date
}

export interface ConnectionMetrics {
  messagesReceived: number
  messagesDropped: number
  averageLatency: number
  connectionUptime: number
  subscriptions: number
  lastUpdate: Date
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

interface MarketDataState {
  // Connection state
  connectionStatus: ConnectionStatus
  lastConnectionTime: Date | null
  
  // Market data
  marketData: Map<string, SymbolMarketData>
  
  // Subscriptions
  subscriptions: Subscription[]
  
  // Metrics
  metrics: ConnectionMetrics
  
  // Watch lists
  watchLists: Map<string, string[]>
  
  // Alerts
  priceAlerts: Array<{
    id: string
    symbol: string
    condition: 'above' | 'below'
    price: number
    isActive: boolean
    createdAt: Date
  }>
}

interface MarketDataActions {
  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => void
  
  // Market data management
  updateMarketData: (symbol: string, data: MarketDataPoint) => void
  clearMarketData: (symbol?: string) => void
  getSymbolData: (symbol: string) => SymbolMarketData | undefined
  
  // Subscription management
  addSubscription: (subscription: Subscription) => void
  removeSubscription: (id: string) => void
  clearSubscriptions: () => void
  getSubscriptions: () => Subscription[]
  
  // Metrics
  updateMetrics: (metrics: Partial<ConnectionMetrics>) => void
  resetMetrics: () => void
  
  // Watch lists
  createWatchList: (name: string, symbols: string[]) => void
  updateWatchList: (name: string, symbols: string[]) => void
  deleteWatchList: (name: string) => void
  addToWatchList: (name: string, symbol: string) => void
  removeFromWatchList: (name: string, symbol: string) => void
  
  // Price alerts
  addPriceAlert: (symbol: string, condition: 'above' | 'below', price: number) => string
  removePriceAlert: (id: string) => void
  togglePriceAlert: (id: string) => void
  checkPriceAlerts: (symbol: string, price: number) => void
}

type MarketDataStore = MarketDataState & MarketDataActions

const initialMetrics: ConnectionMetrics = {
  messagesReceived: 0,
  messagesDropped: 0,
  averageLatency: 0,
  connectionUptime: 0,
  subscriptions: 0,
  lastUpdate: new Date()
}

export const useMarketDataStore = create<MarketDataStore>()(
  devtools(
    subscribeWithSelector(
      immer<MarketDataStore>((set, get) => ({
        // Initial state
        connectionStatus: 'disconnected',
        lastConnectionTime: null,
        marketData: new Map(),
        subscriptions: [],
        metrics: initialMetrics,
        watchLists: new Map(),
        priceAlerts: [],

        // Connection management
        setConnectionStatus: (status) => set((state) => {
          state.connectionStatus = status
          if (status === 'connected') {
            state.lastConnectionTime = new Date()
          }
        }),

        // Market data management
        updateMarketData: (symbol, data) => set((state) => {
          const existing = state.marketData.get(symbol) || {
            symbol,
            lastUpdate: new Date()
          }

          switch (data.type) {
            case 'quote':
              existing.quote = {
                ...data.data,
                spread: data.data.ask - data.data.bid,
                timestamp: data.timestamp
              }
              break

            case 'trade':
              existing.lastTrade = {
                ...data.data,
                timestamp: data.timestamp
              }
              
              // Update daily stats if needed
              if (!existing.dailyStats) {
                existing.dailyStats = {
                  open: data.data.price,
                  high: data.data.price,
                  low: data.data.price,
                  close: data.data.price,
                  volume: data.data.size,
                  change: 0,
                  changePercent: 0
                }
              } else {
                existing.dailyStats.high = Math.max(existing.dailyStats.high, data.data.price)
                existing.dailyStats.low = Math.min(existing.dailyStats.low, data.data.price)
                existing.dailyStats.close = data.data.price
                existing.dailyStats.volume += data.data.size
                existing.dailyStats.change = data.data.price - existing.dailyStats.open
                existing.dailyStats.changePercent = (existing.dailyStats.change / existing.dailyStats.open) * 100
              }
              break

            case 'level2':
              existing.level2 = {
                ...data.data,
                timestamp: data.timestamp
              }
              break

            case 'news':
              if (!existing.news) {
                existing.news = []
              }
              existing.news.unshift({
                id: `${symbol}_${data.timestamp}`,
                ...data.data,
                timestamp: data.timestamp
              })
              // Keep only last 50 news items
              if (existing.news.length > 50) {
                existing.news = existing.news.slice(0, 50)
              }
              break
          }

          existing.lastUpdate = new Date()
          state.marketData.set(symbol, existing)

          // Check price alerts
          if (data.type === 'quote' || data.type === 'trade') {
            const price = data.type === 'quote' ? (data.data.bid + data.data.ask) / 2 : data.data.price
            get().checkPriceAlerts(symbol, price)
          }
        }),

        clearMarketData: (symbol) => set((state) => {
          if (symbol) {
            state.marketData.delete(symbol)
          } else {
            state.marketData.clear()
          }
        }),

        getSymbolData: (symbol) => {
          return get().marketData.get(symbol)
        },

        // Subscription management
        addSubscription: (subscription) => set((state) => {
          // Remove existing subscription with same id
          state.subscriptions = state.subscriptions.filter(s => s.id !== subscription.id)
          state.subscriptions.push(subscription)
        }),

        removeSubscription: (id) => set((state) => {
          state.subscriptions = state.subscriptions.filter(s => s.id !== id)
        }),

        clearSubscriptions: () => set((state) => {
          state.subscriptions = []
        }),

        getSubscriptions: () => get().subscriptions,

        // Metrics
        updateMetrics: (newMetrics) => set((state) => {
          state.metrics = { ...state.metrics, ...newMetrics }
        }),

        resetMetrics: () => set((state) => {
          state.metrics = { ...initialMetrics, lastUpdate: new Date() }
        }),

        // Watch lists
        createWatchList: (name, symbols) => set((state) => {
          state.watchLists.set(name, [...symbols])
        }),

        updateWatchList: (name, symbols) => set((state) => {
          state.watchLists.set(name, [...symbols])
        }),

        deleteWatchList: (name) => set((state) => {
          state.watchLists.delete(name)
        }),

        addToWatchList: (name, symbol) => set((state) => {
          const watchList = state.watchLists.get(name) || []
          if (!watchList.includes(symbol)) {
            watchList.push(symbol)
            state.watchLists.set(name, watchList)
          }
        }),

        removeFromWatchList: (name, symbol) => set((state) => {
          const watchList = state.watchLists.get(name) || []
          const filtered = watchList.filter(s => s !== symbol)
          state.watchLists.set(name, filtered)
        }),

        // Price alerts
        addPriceAlert: (symbol, condition, price) => {
          const id = `${symbol}_${condition}_${price}_${Date.now()}`
          set((state) => {
            state.priceAlerts.push({
              id,
              symbol,
              condition,
              price,
              isActive: true,
              createdAt: new Date()
            })
          })
          return id
        },

        removePriceAlert: (id) => set((state) => {
          state.priceAlerts = state.priceAlerts.filter(alert => alert.id !== id)
        }),

        togglePriceAlert: (id) => set((state) => {
          const alert = state.priceAlerts.find(a => a.id === id)
          if (alert) {
            alert.isActive = !alert.isActive
          }
        }),

        checkPriceAlerts: (symbol, price) => {
          const alerts = get().priceAlerts.filter(
            alert => alert.symbol === symbol && alert.isActive
          )

          alerts.forEach(alert => {
            const triggered = 
              (alert.condition === 'above' && price > alert.price) ||
              (alert.condition === 'below' && price < alert.price)

            if (triggered) {
              // Trigger alert (you can dispatch custom events, show notifications, etc.)
              console.log(`Price Alert: ${symbol} ${alert.condition} ${alert.price} (current: ${price})`)
              
              // Optionally remove one-time alerts
              set((state) => {
                const alertIndex = state.priceAlerts.findIndex(a => a.id === alert.id)
                if (alertIndex !== -1) {
                  state.priceAlerts[alertIndex].isActive = false
                }
              })
            }
          })
        }
      }))
    ),
    {
      name: 'market-data-store',
      partialize: (state) => ({
        watchLists: Array.from(state.watchLists.entries()),
        priceAlerts: state.priceAlerts
      })
    }
  )
)

// Selectors for optimized subscriptions
export const selectConnectionStatus = (state: MarketDataStore) => state.connectionStatus
export const selectMetrics = (state: MarketDataStore) => state.metrics
export const selectSubscriptions = (state: MarketDataStore) => state.subscriptions
export const selectWatchLists = (state: MarketDataStore) => state.watchLists
export const selectPriceAlerts = (state: MarketDataStore) => state.priceAlerts

export const selectSymbolData = (symbol: string) => (state: MarketDataStore) => 
  state.marketData.get(symbol)

export const selectSymbolQuote = (symbol: string) => (state: MarketDataStore) => 
  state.marketData.get(symbol)?.quote

export const selectSymbolTrade = (symbol: string) => (state: MarketDataStore) => 
  state.marketData.get(symbol)?.lastTrade

export const selectSymbolLevel2 = (symbol: string) => (state: MarketDataStore) => 
  state.marketData.get(symbol)?.level2