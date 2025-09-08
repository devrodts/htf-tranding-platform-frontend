/**
 * Portfolio Store - Zustand with Immer for portfolio state management
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { persist } from 'zustand/middleware'
import { Portfolio, PortfolioMetrics, PortfolioSummary } from '@/portfolio/domain/entities/Portfolio'
import { Position, PositionSide } from '@/portfolio/domain/entities/Position'
import { UniqueEntityID } from '@/shared/domain/Entity'

export interface PortfolioAlert {
  id: string
  type: 'risk' | 'profit' | 'loss' | 'concentration' | 'margin'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  positionId?: string
  timestamp: Date
  acknowledged: boolean
}

export interface PerformanceMetrics {
  sharpeRatio: number
  maxDrawdown: number
  volatility: number
  beta: number
  alpha: number
  informationRatio: number
  calmarRatio: number
  sortinoRatio: number
}

interface PortfolioState {
  // Current portfolio
  portfolio: Portfolio | null
  
  // Real-time metrics
  metrics: PortfolioMetrics | null
  summary: PortfolioSummary | null
  performanceMetrics: PerformanceMetrics | null
  
  // Alerts and notifications
  alerts: PortfolioAlert[]
  unreadAlertsCount: number
  
  // Watch lists
  watchLists: Map<string, string[]>
  
  // P&L tracking
  dailyPnL: number[]
  weeklyPnL: number[]
  monthlyPnL: number[]
  
  // Loading states
  isLoading: boolean
  isUpdatingPrices: boolean
  
  // Errors
  error: string | null
  
  // Settings
  autoRefresh: boolean
  refreshInterval: number
  riskWarningsEnabled: boolean
  
  // Last update
  lastUpdateTime: Date | null
}

interface PortfolioActions {
  // Portfolio management
  setPortfolio: (portfolio: Portfolio) => void
  createPortfolio: (accountId: string, name: string, initialBalance: number) => void
  
  // Position management
  addPosition: (position: Position) => void
  removePosition: (positionId: string) => void
  updatePosition: (positionId: string, updates: Partial<Position>) => void
  
  // Price updates
  updateMarketPrices: (priceUpdates: Map<string, number>) => void
  
  // Metrics and calculations
  refreshMetrics: () => void
  refreshSummary: () => void
  calculatePerformanceMetrics: () => void
  
  // Alerts management
  addAlert: (alert: Omit<PortfolioAlert, 'id' | 'timestamp'>) => void
  acknowledgeAlert: (alertId: string) => void
  clearAlerts: () => void
  
  // Watch lists
  createWatchList: (name: string, symbols: string[]) => void
  updateWatchList: (name: string, symbols: string[]) => void
  deleteWatchList: (name: string) => void
  
  // P&L tracking
  recordDailyPnL: (pnl: number) => void
  recordWeeklyPnL: (pnl: number) => void
  recordMonthlyPnL: (pnl: number) => void
  
  // Settings
  updateSettings: (settings: Partial<{
    autoRefresh: boolean
    refreshInterval: number
    riskWarningsEnabled: boolean
  }>) => void
  
  // Loading and error states
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // Utility functions
  getPosition: (symbol: string) => Position | undefined
  getPositionById: (positionId: string) => Position | undefined
  getTotalValue: () => number
  getDiversification: () => Map<string, number>
  getTopPositions: (count?: number) => Position[]
  getBestPerformers: (count?: number) => Position[]
  getWorstPerformers: (count?: number) => Position[]
  
  // Export functions
  exportPortfolio: () => Record<string, any> | null
  exportPositions: () => any[]
  exportAlerts: () => PortfolioAlert[]
}

type PortfolioStore = PortfolioState & PortfolioActions

const initialState: PortfolioState = {
  portfolio: null,
  metrics: null,
  summary: null,
  performanceMetrics: null,
  alerts: [],
  unreadAlertsCount: 0,
  watchLists: new Map(),
  dailyPnL: [],
  weeklyPnL: [],
  monthlyPnL: [],
  isLoading: false,
  isUpdatingPrices: false,
  error: null,
  autoRefresh: true,
  refreshInterval: 5000,
  riskWarningsEnabled: true,
  lastUpdateTime: null
}

export const usePortfolioStore = create<PortfolioStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer<PortfolioStore>((set, get) => ({
          ...initialState,

          // Portfolio management
          setPortfolio: (portfolio) => set((state) => {
            state.portfolio = portfolio
            state.lastUpdateTime = new Date()
            get().refreshMetrics()
            get().refreshSummary()
          }),

          createPortfolio: (accountId, name, initialBalance) => set((state) => {
            const result = Portfolio.create(accountId, name, initialBalance)
            if (result.isSuccess) {
              state.portfolio = result.getValue()
              state.lastUpdateTime = new Date()
              get().refreshMetrics()
              get().refreshSummary()
            } else {
              state.error = result.getErrorValue()
            }
          }),

          // Position management
          addPosition: (position) => set((state) => {
            if (!state.portfolio) {
              state.error = 'No portfolio available'
              return
            }

            const result = state.portfolio.addPosition(position)
            if (result.isSuccess) {
              state.lastUpdateTime = new Date()
              get().refreshMetrics()
              get().refreshSummary()
              
              // Check for risk alerts
              if (state.riskWarningsEnabled) {
                get().checkRiskAlerts()
              }
            } else {
              state.error = result.getErrorValue()
            }
          }),

          removePosition: (positionId) => set((state) => {
            if (!state.portfolio) {
              state.error = 'No portfolio available'
              return
            }

            const id = new UniqueEntityID(positionId)
            const result = state.portfolio.removePosition(id)
            if (result.isSuccess) {
              state.lastUpdateTime = new Date()
              get().refreshMetrics()
              get().refreshSummary()
            } else {
              state.error = result.getErrorValue()
            }
          }),

          updatePosition: (positionId, updates) => set((state) => {
            if (!state.portfolio) return

            const position = state.portfolio.getPositionById(new UniqueEntityID(positionId))
            if (position) {
              // Apply updates to position
              Object.assign(position, updates)
              state.lastUpdateTime = new Date()
              get().refreshMetrics()
            }
          }),

          // Price updates
          updateMarketPrices: (priceUpdates) => set((state) => {
            if (!state.portfolio) return

            state.isUpdatingPrices = true
            const result = state.portfolio.updatePositionPrices(priceUpdates)
            
            if (result.isSuccess) {
              state.lastUpdateTime = new Date()
              get().refreshMetrics()
              
              // Check for alerts based on price changes
              if (state.riskWarningsEnabled) {
                get().checkPriceAlerts()
              }
            }
            
            state.isUpdatingPrices = false
          }),

          // Metrics and calculations
          refreshMetrics: () => set((state) => {
            if (!state.portfolio) return

            state.metrics = state.portfolio.calculateMetrics()
            
            // Record P&L for tracking
            if (state.metrics) {
              const dailyPnL = state.metrics.dayPnL.toNumber()
              if (state.dailyPnL.length === 0 || 
                  state.dailyPnL[state.dailyPnL.length - 1] !== dailyPnL) {
                state.dailyPnL.push(dailyPnL)
                
                // Keep only last 30 days
                if (state.dailyPnL.length > 30) {
                  state.dailyPnL = state.dailyPnL.slice(-30)
                }
              }
            }
          }),

          refreshSummary: () => set((state) => {
            if (!state.portfolio) return
            state.summary = state.portfolio.calculateSummary()
          }),

          calculatePerformanceMetrics: () => set((state) => {
            if (!state.portfolio || state.dailyPnL.length < 30) return

            // Calculate advanced performance metrics
            const returns = state.dailyPnL
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
            const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length
            const volatility = Math.sqrt(variance) * Math.sqrt(252) // Annualized

            // Simplified calculations (in real implementation, would use proper formulas)
            const sharpeRatio = volatility > 0 ? (avgReturn * 252) / volatility : 0
            const maxDrawdown = Math.min(...returns.map((_, i) => 
              Math.min(...returns.slice(0, i + 1).map((_, j) => 
                returns.slice(j, i + 1).reduce((a, b) => a + b, 0)
              ))
            )) / state.portfolio.initialBalance.toNumber()

            state.performanceMetrics = {
              sharpeRatio,
              maxDrawdown,
              volatility,
              beta: 1.0, // Placeholder
              alpha: avgReturn * 252, // Simplified
              informationRatio: sharpeRatio, // Simplified
              calmarRatio: sharpeRatio, // Simplified
              sortinoRatio: sharpeRatio // Simplified
            }
          }),

          // Alerts management
          addAlert: (alert) => set((state) => {
            const newAlert: PortfolioAlert = {
              ...alert,
              id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
              acknowledged: false
            }
            
            state.alerts.unshift(newAlert)
            state.unreadAlertsCount += 1
            
            // Keep only last 100 alerts
            if (state.alerts.length > 100) {
              state.alerts = state.alerts.slice(0, 100)
            }
          }),

          acknowledgeAlert: (alertId) => set((state) => {
            const alert = state.alerts.find(a => a.id === alertId)
            if (alert && !alert.acknowledged) {
              alert.acknowledged = true
              state.unreadAlertsCount = Math.max(0, state.unreadAlertsCount - 1)
            }
          }),

          clearAlerts: () => set((state) => {
            state.alerts = []
            state.unreadAlertsCount = 0
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

          // P&L tracking
          recordDailyPnL: (pnl) => set((state) => {
            state.dailyPnL.push(pnl)
            if (state.dailyPnL.length > 365) {
              state.dailyPnL = state.dailyPnL.slice(-365)
            }
          }),

          recordWeeklyPnL: (pnl) => set((state) => {
            state.weeklyPnL.push(pnl)
            if (state.weeklyPnL.length > 52) {
              state.weeklyPnL = state.weeklyPnL.slice(-52)
            }
          }),

          recordMonthlyPnL: (pnl) => set((state) => {
            state.monthlyPnL.push(pnl)
            if (state.monthlyPnL.length > 12) {
              state.monthlyPnL = state.monthlyPnL.slice(-12)
            }
          }),

          // Settings
          updateSettings: (settings) => set((state) => {
            Object.assign(state, settings)
          }),

          // Loading and error states
          setLoading: (loading) => set((state) => {
            state.isLoading = loading
            if (loading) {
              state.error = null
            }
          }),

          setError: (error) => set((state) => {
            state.error = error
            state.isLoading = false
          }),

          clearError: () => set((state) => {
            state.error = null
          }),

          // Utility functions
          getPosition: (symbol) => {
            const state = get()
            return state.portfolio?.getPosition(symbol)
          },

          getPositionById: (positionId) => {
            const state = get()
            return state.portfolio?.getPositionById(new UniqueEntityID(positionId))
          },

          getTotalValue: () => {
            const state = get()
            return state.metrics?.totalValue.toNumber() || 0
          },

          getDiversification: () => {
            const state = get()
            return state.portfolio?.getDiversification() || new Map()
          },

          getTopPositions: (count = 10) => {
            const state = get()
            return state.portfolio?.getTopPositions(count) || []
          },

          getBestPerformers: (count = 10) => {
            const state = get()
            return state.portfolio?.getBestPerformers(count) || []
          },

          getWorstPerformers: (count = 10) => {
            const state = get()
            return state.portfolio?.getWorstPerformers(count) || []
          },

          // Export functions
          exportPortfolio: () => {
            const state = get()
            return state.portfolio?.export() || null
          },

          exportPositions: () => {
            const state = get()
            return state.portfolio?.positions.map(p => ({
              id: p.id.toString(),
              symbol: p.symbol,
              side: p.side,
              quantity: p.openQuantity.value,
              averagePrice: p.averageOpenPrice.toNumber(),
              currentPrice: p.currentPrice?.toNumber(),
              unrealizedPnL: p.unrealizedPnL?.toNumber(),
              marketValue: p.marketValue?.toNumber(),
              openedAt: p.openedAt.toISOString()
            })) || []
          },

          exportAlerts: () => {
            const state = get()
            return [...state.alerts]
          },

          // Internal helper functions
          checkRiskAlerts: () => {
            const state = get()
            if (!state.portfolio || !state.metrics) return

            const { addAlert } = get()

            // Check leverage
            if (state.metrics.leverage > 3) {
              addAlert({
                type: 'risk',
                severity: 'high',
                message: `High leverage detected: ${state.metrics.leverage.toFixed(2)}:1`
              })
            }

            // Check concentration
            const diversification = state.portfolio.getDiversification()
            for (const [symbol, percentage] of diversification) {
              if (percentage > 25) {
                addAlert({
                  type: 'concentration',
                  severity: 'medium',
                  message: `High concentration in ${symbol}: ${percentage.toFixed(1)}%`
                })
              }
            }

            // Check daily loss
            if (state.metrics.dayPnL.toNumber() < -state.portfolio.riskLimits.maxDailyLoss.toNumber()) {
              addAlert({
                type: 'loss',
                severity: 'critical',
                message: `Daily loss limit exceeded: ${state.metrics.dayPnL.toNumber().toFixed(2)}`
              })
            }
          },

          checkPriceAlerts: () => {
            const state = get()
            if (!state.portfolio) return

            const { addAlert } = get()

            // Check individual position alerts
            for (const position of state.portfolio.positions) {
              const roi = position.getROI()
              if (roi !== undefined) {
                if (roi < -10) {
                  addAlert({
                    type: 'loss',
                    severity: 'medium',
                    message: `${position.symbol} down ${roi.toFixed(1)}%`,
                    positionId: position.id.toString()
                  })
                } else if (roi > 20) {
                  addAlert({
                    type: 'profit',
                    severity: 'low',
                    message: `${position.symbol} up ${roi.toFixed(1)}%`,
                    positionId: position.id.toString()
                  })
                }
              }
            }
          }
        })),
        {
          name: 'portfolio-store',
          partialize: (state) => ({
            watchLists: Array.from(state.watchLists.entries()),
            dailyPnL: state.dailyPnL.slice(-30), // Keep last 30 days
            weeklyPnL: state.weeklyPnL.slice(-12), // Keep last 12 weeks
            monthlyPnL: state.monthlyPnL.slice(-12), // Keep last 12 months
            autoRefresh: state.autoRefresh,
            refreshInterval: state.refreshInterval,
            riskWarningsEnabled: state.riskWarningsEnabled
          }),
          storage: {
            getItem: (name) => {
              const str = localStorage.getItem(name)
              if (!str) return null
              const data = JSON.parse(str)
              return {
                state: {
                  ...data.state,
                  watchLists: new Map(data.state.watchLists || [])
                },
                version: data.version
              }
            },
            setItem: (name, value) => {
              const serialized = {
                state: {
                  ...value.state,
                  watchLists: Array.from((value.state.watchLists as Map<string, string[]>).entries())
                },
                version: value.version
              }
              localStorage.setItem(name, JSON.stringify(serialized))
            },
            removeItem: (name) => localStorage.removeItem(name)
          }
        }
      )
    ),
    {
      name: 'portfolio-store'
    }
  )
)

// Selectors for optimized subscriptions
export const selectPortfolio = (state: PortfolioStore) => state.portfolio
export const selectMetrics = (state: PortfolioStore) => state.metrics
export const selectSummary = (state: PortfolioStore) => state.summary
export const selectPerformanceMetrics = (state: PortfolioStore) => state.performanceMetrics
export const selectPositions = (state: PortfolioStore) => state.portfolio?.positions || []
export const selectAlerts = (state: PortfolioStore) => state.alerts
export const selectUnreadAlertsCount = (state: PortfolioStore) => state.unreadAlertsCount
export const selectIsLoading = (state: PortfolioStore) => state.isLoading
export const selectError = (state: PortfolioStore) => state.error
export const selectTotalValue = (state: PortfolioStore) => state.getTotalValue()
export const selectDailyPnL = (state: PortfolioStore) => state.dailyPnL

// Position selectors
export const selectPosition = (symbol: string) => (state: PortfolioStore) => 
  state.getPosition(symbol)

export const selectPositionById = (positionId: string) => (state: PortfolioStore) => 
  state.getPositionById(positionId)

export const selectTopPositions = (count = 10) => (state: PortfolioStore) => 
  state.getTopPositions(count)

export const selectBestPerformers = (count = 10) => (state: PortfolioStore) => 
  state.getBestPerformers(count)

export const selectWorstPerformers = (count = 10) => (state: PortfolioStore) => 
  state.getWorstPerformers(count)