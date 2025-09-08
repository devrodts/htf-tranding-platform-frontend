/**
 * View Trading SDK Integration
 * Enterprise-grade trading SDK with advanced features
 */

import { Result } from '@/shared/domain/Result'
import { Order, OrderType, OrderSide, TimeInForce } from '@/trading/domain/entities/Order'
import { Symbol, Price, Quantity } from '@/shared/domain/ValueObject'

export interface MarketDataSnapshot {
  symbol: string
  bid: number
  ask: number
  last: number
  volume: number
  high: number
  low: number
  open: number
  change: number
  changePercent: number
  timestamp: number
}

export interface Level2Quote {
  price: number
  size: number
  orders: number
}

export interface Level2Data {
  symbol: string
  bids: Level2Quote[]
  asks: Level2Quote[]
  timestamp: number
}

export interface Trade {
  symbol: string
  price: number
  size: number
  timestamp: number
  side: 'BUY' | 'SELL'
  tradeId: string
}

export interface AccountInfo {
  accountId: string
  balance: number
  availableBalance: number
  equity: number
  margin: number
  marginUsed: number
  marginAvailable: number
  currency: string
}

export interface Position {
  symbol: string
  side: 'LONG' | 'SHORT' | 'FLAT'
  size: number
  avgPrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
  timestamp: number
}

export interface OrderResponse {
  orderId: string
  clientOrderId?: string
  status: string
  message?: string
  timestamp: number
}

export interface HistoricalBar {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ViewTradingConfig {
  apiKey: string
  secretKey: string
  baseUrl: string
  websocketUrl: string
  environment: 'sandbox' | 'production'
  timeout: number
  retryAttempts: number
}

export interface SubscriptionOptions {
  symbols: string[]
  types: ('quotes' | 'trades' | 'level2' | 'news')[]
  throttleMs?: number
}

export class ViewTradingSDK {
  private config: ViewTradingConfig
  private wsConnection: WebSocket | null = null
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(config: ViewTradingConfig) {
    this.config = config
    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('API key is required')
    }
    if (!this.config.secretKey) {
      throw new Error('Secret key is required')
    }
    if (!this.config.baseUrl) {
      throw new Error('Base URL is required')
    }
    if (!this.config.websocketUrl) {
      throw new Error('WebSocket URL is required')
    }
  }

  /**
   * Authentication and Connection Management
   */
  public async connect(): Promise<Result<void>> {
    try {
      await this.authenticateAndConnect()
      return Result.ok()
    } catch (error) {
      return Result.fail(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close()
      this.wsConnection = null
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    this.subscriptions.clear()
  }

  private async authenticateAndConnect(): Promise<void> {
    // REST API Authentication
    const authResponse = await this.makeRequest('POST', '/auth/token', {
      apiKey: this.config.apiKey,
      secretKey: this.config.secretKey
    })

    if (!authResponse.ok) {
      throw new Error('Authentication failed')
    }

    const { token } = await authResponse.json()

    // WebSocket Connection
    return new Promise((resolve, reject) => {
      this.wsConnection = new WebSocket(this.config.websocketUrl)
      
      this.wsConnection.onopen = () => {
        // Authenticate WebSocket connection
        this.wsConnection?.send(JSON.stringify({
          type: 'auth',
          token: token
        }))
        
        this.startHeartbeat()
        resolve()
      }

      this.wsConnection.onerror = (error) => {
        reject(new Error(`WebSocket connection failed: ${error}`))
      }

      this.wsConnection.onmessage = (event) => {
        this.handleWebSocketMessage(event)
      }

      this.wsConnection.onclose = () => {
        this.handleWebSocketClose()
      }
    })
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'quote':
          this.dispatchToSubscribers('quotes', data)
          break
        case 'trade':
          this.dispatchToSubscribers('trades', data)
          break
        case 'level2':
          this.dispatchToSubscribers('level2', data)
          break
        case 'news':
          this.dispatchToSubscribers('news', data)
          break
        case 'pong':
          // Heartbeat response
          break
        default:
          console.warn('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private handleWebSocketClose(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect()
      }, Math.pow(2, this.reconnectAttempts) * 1000) // Exponential backoff
    }
  }

  private dispatchToSubscribers(type: string, data: any): void {
    const subscribers = this.subscriptions.get(type)
    if (subscribers) {
      subscribers.forEach(callback => callback(data))
    }
  }

  /**
   * Market Data Methods
   */
  public async getMarketData(symbols: string[]): Promise<Result<MarketDataSnapshot[]>> {
    try {
      const response = await this.makeRequest('GET', '/market-data/snapshot', {
        symbols: symbols.join(',')
      })

      if (!response.ok) {
        return Result.fail(`Failed to fetch market data: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data.snapshots)
    } catch (error) {
      return Result.fail(`Market data request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getLevel2Data(symbol: string): Promise<Result<Level2Data>> {
    try {
      const response = await this.makeRequest('GET', `/market-data/level2/${symbol}`)

      if (!response.ok) {
        return Result.fail(`Failed to fetch Level 2 data: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data)
    } catch (error) {
      return Result.fail(`Level 2 data request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getHistoricalData(
    symbol: string,
    interval: string,
    from: Date,
    to: Date
  ): Promise<Result<HistoricalBar[]>> {
    try {
      const response = await this.makeRequest('GET', `/market-data/historical/${symbol}`, {
        interval,
        from: from.toISOString(),
        to: to.toISOString()
      })

      if (!response.ok) {
        return Result.fail(`Failed to fetch historical data: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data.bars)
    } catch (error) {
      return Result.fail(`Historical data request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Trading Methods
   */
  public async submitOrder(order: Order): Promise<Result<OrderResponse>> {
    try {
      const orderPayload = {
        symbol: order.symbol.ticker,
        side: order.side.toLowerCase(),
        type: order.type.toLowerCase(),
        quantity: order.quantity.value,
        price: order.price?.value,
        stopPrice: order.stopPrice?.value,
        timeInForce: order.timeInForce,
        clientOrderId: order.clientOrderId
      }

      const response = await this.makeRequest('POST', '/orders', orderPayload)

      if (!response.ok) {
        const errorData = await response.json()
        return Result.fail(`Order submission failed: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      return Result.ok({
        orderId: data.orderId,
        clientOrderId: data.clientOrderId,
        status: data.status,
        message: data.message,
        timestamp: data.timestamp
      })
    } catch (error) {
      return Result.fail(`Order submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async cancelOrder(orderId: string): Promise<Result<OrderResponse>> {
    try {
      const response = await this.makeRequest('DELETE', `/orders/${orderId}`)

      if (!response.ok) {
        const errorData = await response.json()
        return Result.fail(`Order cancellation failed: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      return Result.ok({
        orderId: data.orderId,
        status: data.status,
        message: data.message,
        timestamp: data.timestamp
      })
    } catch (error) {
      return Result.fail(`Order cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getOrders(status?: string): Promise<Result<any[]>> {
    try {
      const params = status ? { status } : {}
      const response = await this.makeRequest('GET', '/orders', params)

      if (!response.ok) {
        return Result.fail(`Failed to fetch orders: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data.orders)
    } catch (error) {
      return Result.fail(`Get orders request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getOrder(orderId: string): Promise<Result<any>> {
    try {
      const response = await this.makeRequest('GET', `/orders/${orderId}`)

      if (!response.ok) {
        return Result.fail(`Failed to fetch order: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data)
    } catch (error) {
      return Result.fail(`Get order request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Account Methods
   */
  public async getAccountInfo(): Promise<Result<AccountInfo>> {
    try {
      const response = await this.makeRequest('GET', '/account')

      if (!response.ok) {
        return Result.fail(`Failed to fetch account info: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data)
    } catch (error) {
      return Result.fail(`Account info request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getPositions(): Promise<Result<Position[]>> {
    try {
      const response = await this.makeRequest('GET', '/positions')

      if (!response.ok) {
        return Result.fail(`Failed to fetch positions: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data.positions)
    } catch (error) {
      return Result.fail(`Positions request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getPosition(symbol: string): Promise<Result<Position>> {
    try {
      const response = await this.makeRequest('GET', `/positions/${symbol}`)

      if (!response.ok) {
        return Result.fail(`Failed to fetch position: ${response.statusText}`)
      }

      const data = await response.json()
      return Result.ok(data)
    } catch (error) {
      return Result.fail(`Position request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Subscription Methods
   */
  public subscribe(options: SubscriptionOptions, callback: (data: any) => void): void {
    // Subscribe to WebSocket streams
    options.types.forEach(type => {
      if (!this.subscriptions.has(type)) {
        this.subscriptions.set(type, new Set())
      }
      this.subscriptions.get(type)!.add(callback)
    })

    // Send subscription message
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'subscribe',
        symbols: options.symbols,
        subscriptions: options.types,
        throttleMs: options.throttleMs
      }))
    }
  }

  public unsubscribe(options: SubscriptionOptions, callback?: (data: any) => void): void {
    options.types.forEach(type => {
      const subscribers = this.subscriptions.get(type)
      if (subscribers) {
        if (callback) {
          subscribers.delete(callback)
        } else {
          subscribers.clear()
        }
      }
    })

    // Send unsubscription message
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'unsubscribe',
        symbols: options.symbols,
        subscriptions: options.types
      }))
    }
  }

  /**
   * Utility Methods
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-API-Secret': this.config.secretKey,
      'User-Agent': 'HFT-Trading-Platform/1.0.0'
    }

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    }

    if (data) {
      if (method === 'GET') {
        const params = new URLSearchParams(data)
        return fetch(`${url}?${params}`, options)
      } else {
        options.body = JSON.stringify(data)
      }
    }

    return fetch(url, options)
  }

  /**
   * Health Check
   */
  public async healthCheck(): Promise<Result<boolean>> {
    try {
      const response = await this.makeRequest('GET', '/health')
      return Result.ok(response.ok)
    } catch (error) {
      return Result.fail(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (!this.wsConnection) return 'disconnected'
    
    switch (this.wsConnection.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'error'
    }
  }
}

/**
 * Factory function for creating ViewTradingSDK instance
 */
export function createViewTradingSDK(config: Partial<ViewTradingConfig>): ViewTradingSDK {
  const defaultConfig: ViewTradingConfig = {
    apiKey: process.env['VIEW_TRADING_API_KEY'] || '',
    secretKey: process.env['VIEW_TRADING_SECRET_KEY'] || '',
    baseUrl: process.env['VIEW_TRADING_BASE_URL'] || 'https://api.viewtrading.com',
    websocketUrl: process.env['VIEW_TRADING_WS_URL'] || 'wss://ws.viewtrading.com',
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
    timeout: 10000,
    retryAttempts: 3
  }

  return new ViewTradingSDK({ ...defaultConfig, ...config })
}