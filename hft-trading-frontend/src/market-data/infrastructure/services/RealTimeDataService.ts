/**
 * Real-Time Data Service - Advanced WebSocket management with fault tolerance
 * Implements enterprise patterns: Circuit Breaker, Retry, Backoff, Health Check
 */

import { EventEmitter } from 'events'

export interface MarketDataUpdate {
  symbol: string
  type: 'QUOTE' | 'TRADE' | 'LEVEL2' | 'NEWS' | 'HEARTBEAT'
  timestamp: number
  data: any
}

export interface QuoteData {
  bid: number
  ask: number
  bidSize: number
  askSize: number
  spread: number
}

export interface TradeData {
  price: number
  size: number
  side: 'BUY' | 'SELL'
  tradeId: string
}

export interface Level2Data {
  bids: Array<{ price: number; size: number; orders: number }>
  asks: Array<{ price: number; size: number; orders: number }>
}

export interface ConnectionConfig {
  url: string
  apiKey: string
  reconnectAttempts: number
  reconnectDelayMs: number
  heartbeatIntervalMs: number
  messageTimeoutMs: number
  circuitBreakerThreshold: number
  circuitBreakerResetTimeMs: number
}

export interface SubscriptionRequest {
  symbols: string[]
  types: Array<'quotes' | 'trades' | 'level2' | 'news'>
  throttleMs?: number
  depth?: number // For Level 2 data
}

enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED'
}

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class RealTimeDataService extends EventEmitter {
  private ws: WebSocket | null = null
  private config: ConnectionConfig
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED
  private reconnectAttempt = 0
  private failureCount = 0
  private lastFailureTime = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private messageTimeouts = new Map<string, NodeJS.Timeout>()
  private subscriptions = new Set<string>()
  private pendingSubscriptions = new Set<string>()
  private messageQueue: string[] = []
  private metrics = {
    messagesReceived: 0,
    messagesDropped: 0,
    connectionUptime: 0,
    lastConnectionTime: 0,
    averageLatency: 0,
    latencyHistory: [] as number[]
  }

  constructor(config: ConnectionConfig) {
    super()
    this.config = config
    this.setupEventHandlers()
  }

  /**
   * Public API Methods
   */
  public async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      return Promise.resolve()
    }

    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      if (timeSinceLastFailure < this.config.circuitBreakerResetTimeMs) {
        throw new Error('Circuit breaker is open. Connection blocked.')
      } else {
        this.circuitBreakerState = CircuitBreakerState.HALF_OPEN
      }
    }

    return this.establishConnection()
  }

  public disconnect(): void {
    this.connectionState = ConnectionState.DISCONNECTED
    this.clearTimers()
    this.clearMessageTimeouts()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.emit('disconnected', { reason: 'client_initiated' })
  }

  public subscribe(request: SubscriptionRequest): void {
    const subscriptionKey = this.createSubscriptionKey(request)
    
    if (this.subscriptions.has(subscriptionKey)) {
      return // Already subscribed
    }

    this.subscriptions.add(subscriptionKey)

    if (this.connectionState === ConnectionState.CONNECTED) {
      this.sendSubscriptionMessage(request)
    } else {
      this.pendingSubscriptions.add(subscriptionKey)
    }
  }

  public unsubscribe(request: SubscriptionRequest): void {
    const subscriptionKey = this.createSubscriptionKey(request)
    
    if (!this.subscriptions.has(subscriptionKey)) {
      return // Not subscribed
    }

    this.subscriptions.delete(subscriptionKey)
    this.pendingSubscriptions.delete(subscriptionKey)

    if (this.connectionState === ConnectionState.CONNECTED) {
      this.sendUnsubscriptionMessage(request)
    }
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState
  }

  public getMetrics(): typeof this.metrics {
    return { ...this.metrics }
  }

  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions)
  }

  /**
   * Connection Management
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionState = ConnectionState.CONNECTING
        this.emit('connecting')

        const wsUrl = `${this.config.url}?apiKey=${encodeURIComponent(this.config.apiKey)}`
        this.ws = new WebSocket(wsUrl)

        const connectionTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close()
            this.handleConnectionFailure(new Error('Connection timeout'))
            reject(new Error('Connection timeout'))
          }
        }, 10000) // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout)
          this.handleConnectionSuccess()
          resolve()
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          this.handleConnectionFailure(error)
          reject(error)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onclose = (event) => {
          this.handleConnectionClose(event)
        }

      } catch (error) {
        this.handleConnectionFailure(error)
        reject(error)
      }
    })
  }

  private handleConnectionSuccess(): void {
    this.connectionState = ConnectionState.CONNECTED
    this.reconnectAttempt = 0
    this.failureCount = 0
    this.metrics.lastConnectionTime = Date.now()
    this.circuitBreakerState = CircuitBreakerState.CLOSED

    this.startHeartbeat()
    this.processPendingSubscriptions()
    this.flushMessageQueue()

    this.emit('connected')
  }

  private handleConnectionFailure(error: any): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitBreakerState = CircuitBreakerState.OPEN
    }

    this.emit('error', { error, failureCount: this.failureCount })

    if (this.shouldReconnect()) {
      this.scheduleReconnect()
    } else {
      this.connectionState = ConnectionState.FAILED
      this.emit('failed', { error, attempts: this.reconnectAttempt })
    }
  }

  private handleConnectionClose(event: CloseEvent): void {
    const wasConnected = this.connectionState === ConnectionState.CONNECTED
    this.connectionState = ConnectionState.DISCONNECTED
    this.clearTimers()
    this.ws = null

    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    })

    // Auto-reconnect for unexpected closures
    if (!event.wasClean && wasConnected && this.shouldReconnect()) {
      this.scheduleReconnect()
    }
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempt < this.config.reconnectAttempts &&
           this.circuitBreakerState !== CircuitBreakerState.OPEN
  }

  private scheduleReconnect(): void {
    this.connectionState = ConnectionState.RECONNECTING
    this.reconnectAttempt++

    const delay = this.calculateBackoffDelay()
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.establishConnection()
      } catch (error) {
        // Error handling is done in establishConnection
      }
    }, delay)

    this.emit('reconnecting', {
      attempt: this.reconnectAttempt,
      delay,
      maxAttempts: this.config.reconnectAttempts
    })
  }

  private calculateBackoffDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectDelayMs
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(this.reconnectAttempt - 1, 8))
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, 30000) // Max 30 seconds
  }

  /**
   * Message Handling
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const startTime = performance.now()
      const message = JSON.parse(event.data)
      
      this.metrics.messagesReceived++
      this.updateLatencyMetrics(startTime)

      switch (message.type) {
        case 'HEARTBEAT':
          this.handleHeartbeat(message)
          break
        case 'QUOTE':
          this.handleQuoteUpdate(message)
          break
        case 'TRADE':
          this.handleTradeUpdate(message)
          break
        case 'LEVEL2':
          this.handleLevel2Update(message)
          break
        case 'NEWS':
          this.handleNewsUpdate(message)
          break
        case 'SUBSCRIPTION_ACK':
          this.handleSubscriptionAck(message)
          break
        case 'ERROR':
          this.handleServerError(message)
          break
        default:
          console.warn('Unknown message type:', message.type)
      }

    } catch (error) {
      this.metrics.messagesDropped++
      this.emit('messageError', { error, rawMessage: event.data })
    }
  }

  private handleHeartbeat(message: any): void {
    // Reset heartbeat timer
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.startHeartbeat()
    }

    // Send heartbeat response if required
    if (message.requiresResponse) {
      this.sendMessage({
        type: 'HEARTBEAT_RESPONSE',
        timestamp: Date.now()
      })
    }
  }

  private handleQuoteUpdate(message: any): void {
    const update: MarketDataUpdate = {
      symbol: message.symbol,
      type: 'QUOTE',
      timestamp: message.timestamp || Date.now(),
      data: {
        bid: message.bid,
        ask: message.ask,
        bidSize: message.bidSize,
        askSize: message.askSize,
        spread: message.ask - message.bid
      } as QuoteData
    }

    this.emit('quote', update)
    this.emit('marketData', update)
  }

  private handleTradeUpdate(message: any): void {
    const update: MarketDataUpdate = {
      symbol: message.symbol,
      type: 'TRADE',
      timestamp: message.timestamp || Date.now(),
      data: {
        price: message.price,
        size: message.size,
        side: message.side,
        tradeId: message.tradeId
      } as TradeData
    }

    this.emit('trade', update)
    this.emit('marketData', update)
  }

  private handleLevel2Update(message: any): void {
    const update: MarketDataUpdate = {
      symbol: message.symbol,
      type: 'LEVEL2',
      timestamp: message.timestamp || Date.now(),
      data: {
        bids: message.bids || [],
        asks: message.asks || []
      } as Level2Data
    }

    this.emit('level2', update)
    this.emit('marketData', update)
  }

  private handleNewsUpdate(message: any): void {
    const update: MarketDataUpdate = {
      symbol: message.symbol,
      type: 'NEWS',
      timestamp: message.timestamp || Date.now(),
      data: message.news
    }

    this.emit('news', update)
    this.emit('marketData', update)
  }

  private handleSubscriptionAck(message: any): void {
    this.emit('subscriptionAck', {
      symbols: message.symbols,
      types: message.types,
      success: message.success
    })
  }

  private handleServerError(message: any): void {
    this.emit('serverError', {
      code: message.code,
      message: message.message,
      details: message.details
    })
  }

  /**
   * Subscription Management
   */
  private processPendingSubscriptions(): void {
    this.pendingSubscriptions.forEach(subscriptionKey => {
      const request = this.parseSubscriptionKey(subscriptionKey)
      if (request) {
        this.sendSubscriptionMessage(request)
      }
    })
    this.pendingSubscriptions.clear()
  }

  private sendSubscriptionMessage(request: SubscriptionRequest): void {
    const message = {
      type: 'SUBSCRIBE',
      symbols: request.symbols,
      subscriptions: request.types,
      throttleMs: request.throttleMs,
      depth: request.depth,
      timestamp: Date.now()
    }

    this.sendMessage(message)
  }

  private sendUnsubscriptionMessage(request: SubscriptionRequest): void {
    const message = {
      type: 'UNSUBSCRIBE',
      symbols: request.symbols,
      subscriptions: request.types,
      timestamp: Date.now()
    }

    this.sendMessage(message)
  }

  private createSubscriptionKey(request: SubscriptionRequest): string {
    return JSON.stringify({
      symbols: request.symbols.sort(),
      types: request.types.sort(),
      throttleMs: request.throttleMs,
      depth: request.depth
    })
  }

  private parseSubscriptionKey(key: string): SubscriptionRequest | null {
    try {
      return JSON.parse(key)
    } catch {
      return null
    }
  }

  /**
   * Message Sending
   */
  private sendMessage(message: any): void {
    if (this.connectionState === ConnectionState.CONNECTED && this.ws) {
      try {
        const messageStr = JSON.stringify(message)
        this.ws.send(messageStr)
      } catch (error) {
        this.metrics.messagesDropped++
        this.emit('sendError', { error, message })
      }
    } else {
      // Queue message for later sending
      this.messageQueue.push(JSON.stringify(message))
      if (this.messageQueue.length > 100) {
        // Prevent memory leak
        this.messageQueue.shift()
      }
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws) {
      const message = this.messageQueue.shift()!
      try {
        this.ws.send(message)
      } catch (error) {
        this.metrics.messagesDropped++
        break // Stop flushing on error
      }
    }
  }

  /**
   * Heartbeat Management
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setTimeout(() => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        // Connection seems dead, trigger reconnect
        this.emit('heartbeatTimeout')
        this.handleConnectionFailure(new Error('Heartbeat timeout'))
      }
    }, this.config.heartbeatIntervalMs)
  }

  /**
   * Utility Methods
   */
  private setupEventHandlers(): void {
    this.setMaxListeners(100) // Increase limit for high-frequency updates
    
    // Internal event handlers
    this.on('error', (data) => {
      console.error('RealTimeDataService error:', data?.error || data)
    })
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private clearMessageTimeouts(): void {
    this.messageTimeouts.forEach(timeout => clearTimeout(timeout))
    this.messageTimeouts.clear()
  }

  private updateLatencyMetrics(startTime: number): void {
    const latency = performance.now() - startTime
    this.metrics.latencyHistory.push(latency)
    
    // Keep only last 100 measurements
    if (this.metrics.latencyHistory.length > 100) {
      this.metrics.latencyHistory.shift()
    }

    // Calculate rolling average
    this.metrics.averageLatency = this.metrics.latencyHistory.reduce((a, b) => a + b, 0) / this.metrics.latencyHistory.length
  }

  /**
   * Health Check
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, boolean>
    metrics: typeof this.metrics
  } {
    const checks = {
      connected: this.connectionState === ConnectionState.CONNECTED,
      circuitBreakerClosed: this.circuitBreakerState === CircuitBreakerState.CLOSED,
      lowLatency: this.metrics.averageLatency < 100, // Less than 100ms average
      recentMessages: this.metrics.messagesReceived > 0
    }

    const healthyChecks = Object.values(checks).filter(Boolean).length
    let status: 'healthy' | 'degraded' | 'unhealthy'

    if (healthyChecks === Object.keys(checks).length) {
      status = 'healthy'
    } else if (healthyChecks >= Object.keys(checks).length / 2) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return { status, checks, metrics: this.metrics }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.disconnect()
    this.removeAllListeners()
    this.subscriptions.clear()
    this.pendingSubscriptions.clear()
    this.messageQueue = []
  }
}