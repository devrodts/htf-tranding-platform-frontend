/**
 * Order Manager Entity - Manages order lifecycle and execution
 */

import { Entity } from '@/shared/domain/Entity'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Result } from '@/shared/domain/Result'
import { Order, OrderStatus, OrderSide, OrderType, TimeInForce } from '@/trading/domain/entities/Order'
import { OrderBook } from './OrderBook'
import Decimal from 'decimal.js'

export interface OrderExecution {
  id: string
  orderId: string
  executedQuantity: Decimal
  executedPrice: Decimal
  executionTime: Date
  commission: Decimal
  venue: string
  executionId: string
}

export interface OrderReject {
  orderId: string
  reason: string
  timestamp: Date
  errorCode: string
}

export interface RiskCheck {
  orderId: string
  passed: boolean
  violations: string[]
  timestamp: Date
}

export interface PositionRisk {
  symbol: string
  currentPosition: Decimal
  averagePrice: Decimal
  unrealizedPnL: Decimal
  exposure: Decimal
  marginUsed: Decimal
}

interface OrderManagerProps {
  portfolioId: string
  orders: Map<string, Order>
  executions: Map<string, OrderExecution[]>
  rejections: Map<string, OrderReject>
  orderBooks: Map<string, OrderBook>
  riskLimits: {
    maxOrderSize: Decimal
    maxDailyVolume: Decimal
    maxPositionSize: Decimal
    maxLeverage: Decimal
    allowedSymbols: string[]
    blacklistedSymbols: string[]
  }
  dailyVolume: Decimal
  createdAt: Date
  lastUpdateTime: Date
}

export class OrderManager extends Entity<UniqueEntityID> {
  private constructor(props: OrderManagerProps, id?: UniqueEntityID) {
    super(props, id)
  }

  public static create(portfolioId: string, id?: UniqueEntityID): Result<OrderManager> {
    if (!portfolioId || portfolioId.trim().length === 0) {
      return Result.fail<OrderManager>('Portfolio ID is required')
    }

    const props: OrderManagerProps = {
      portfolioId,
      orders: new Map(),
      executions: new Map(),
      rejections: new Map(),
      orderBooks: new Map(),
      riskLimits: {
        maxOrderSize: new Decimal(1000000),
        maxDailyVolume: new Decimal(10000000),
        maxPositionSize: new Decimal(5000000),
        maxLeverage: new Decimal(4),
        allowedSymbols: [],
        blacklistedSymbols: []
      },
      dailyVolume: new Decimal(0),
      createdAt: new Date(),
      lastUpdateTime: new Date()
    }

    return Result.ok<OrderManager>(new OrderManager(props, id))
  }

  get portfolioId(): string {
    return this.props.portfolioId
  }

  get orders(): Order[] {
    return Array.from(this.props.orders.values())
  }

  get activeOrders(): Order[] {
    return this.orders.filter(order => 
      order.status === OrderStatus.PENDING ||
      order.status === OrderStatus.PARTIAL_FILLED ||
      order.status === OrderStatus.ACCEPTED
    )
  }

  get completedOrders(): Order[] {
    return this.orders.filter(order => 
      order.status === OrderStatus.FILLED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.EXPIRED
    )
  }

  get dailyVolume(): Decimal {
    return this.props.dailyVolume
  }

  get riskLimits(): typeof this.props.riskLimits {
    return { ...this.props.riskLimits }
  }

  public submitOrder(order: Order): Result<void> {
    // Perform pre-submission validation
    const validationResult = this.validateOrder(order)
    if (validationResult.isFailure) {
      this.rejectOrder(order.id.toString(), validationResult.getErrorValue(), 'VALIDATION_FAILED')
      return validationResult
    }

    // Perform risk checks
    const riskResult = this.performRiskCheck(order)
    if (riskResult.isFailure) {
      this.rejectOrder(order.id.toString(), riskResult.getErrorValue(), 'RISK_CHECK_FAILED')
      return riskResult
    }

    // Add order to manager
    this.props.orders.set(order.id.toString(), order)
    this.props.executions.set(order.id.toString(), [])

    // Update order status to pending
    const statusResult = order.updateStatus(OrderStatus.PENDING)
    if (statusResult.isFailure) {
      return statusResult
    }

    this.props.lastUpdateTime = new Date()

    // For market orders, attempt immediate execution
    if (order.type === OrderType.MARKET) {
      this.attemptMarketExecution(order)
    }

    return Result.ok<void>()
  }

  public cancelOrder(orderId: string, reason = 'User requested'): Result<void> {
    const order = this.props.orders.get(orderId)
    if (!order) {
      return Result.fail<void>('Order not found')
    }

    if (!this.isOrderCancellable(order)) {
      return Result.fail<void>('Order cannot be cancelled in current status')
    }

    const cancelResult = order.cancel(reason)
    if (cancelResult.isFailure) {
      return cancelResult
    }

    this.props.lastUpdateTime = new Date()
    return Result.ok<void>()
  }

  public modifyOrder(orderId: string, newQuantity?: Decimal, newPrice?: Decimal): Result<void> {
    const order = this.props.orders.get(orderId)
    if (!order) {
      return Result.fail<void>('Order not found')
    }

    if (!this.isOrderModifiable(order)) {
      return Result.fail<void>('Order cannot be modified in current status')
    }

    // Create modified order (simplified - in real system would handle order replacement)
    if (newQuantity) {
      const modifyResult = order.updateQuantity(newQuantity)
      if (modifyResult.isFailure) {
        return modifyResult
      }
    }

    if (newPrice && (order.type === OrderType.LIMIT || order.type === OrderType.STOP_LOSS)) {
      const modifyResult = order.updatePrice(newPrice)
      if (modifyResult.isFailure) {
        return modifyResult
      }
    }

    this.props.lastUpdateTime = new Date()
    return Result.ok<void>()
  }

  public executeOrder(orderId: string, executedQuantity: Decimal, executedPrice: Decimal, venue = 'EXCHANGE'): Result<OrderExecution> {
    const order = this.props.orders.get(orderId)
    if (!order) {
      return Result.fail<OrderExecution>('Order not found')
    }

    // Create execution record
    const execution: OrderExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      executedQuantity,
      executedPrice,
      executionTime: new Date(),
      commission: this.calculateCommission(executedQuantity, executedPrice),
      venue,
      executionId: `${venue}_${Date.now()}`
    }

    // Update order with execution
    const fillResult = order.fill(executedQuantity, executedPrice)
    if (fillResult.isFailure) {
      return Result.fail<OrderExecution>(fillResult.getErrorValue())
    }

    // Store execution
    const executions = this.props.executions.get(orderId) || []
    executions.push(execution)
    this.props.executions.set(orderId, executions)

    // Update daily volume
    const notionalValue = executedQuantity.times(executedPrice)
    this.props.dailyVolume = this.props.dailyVolume.plus(notionalValue)

    this.props.lastUpdateTime = new Date()

    return Result.ok<OrderExecution>(execution)
  }

  public rejectOrder(orderId: string, reason: string, errorCode: string): void {
    const order = this.props.orders.get(orderId)
    if (order) {
      order.updateStatus(OrderStatus.REJECTED)
    }

    const rejection: OrderReject = {
      orderId,
      reason,
      timestamp: new Date(),
      errorCode
    }

    this.props.rejections.set(orderId, rejection)
    this.props.lastUpdateTime = new Date()
  }

  public updateOrderBook(symbol: string, orderBook: OrderBook): Result<void> {
    this.props.orderBooks.set(symbol, orderBook)
    
    // Check if any pending orders can be executed
    this.checkPendingOrders(symbol)
    
    return Result.ok<void>()
  }

  public getOrder(orderId: string): Order | undefined {
    return this.props.orders.get(orderId)
  }

  public getOrdersBySymbol(symbol: string): Order[] {
    return this.orders.filter(order => order.symbol === symbol)
  }

  public getOrderExecutions(orderId: string): OrderExecution[] {
    return this.props.executions.get(orderId) || []
  }

  public getOrderRejection(orderId: string): OrderReject | undefined {
    return this.props.rejections.get(orderId)
  }

  public getOrderBook(symbol: string): OrderBook | undefined {
    return this.props.orderBooks.get(symbol)
  }

  public calculatePositionRisk(symbol: string): PositionRisk | undefined {
    const orders = this.getOrdersBySymbol(symbol)
    let currentPosition = new Decimal(0)
    let totalCost = new Decimal(0)
    let totalQuantity = new Decimal(0)

    // Calculate position from executed orders
    for (const order of orders) {
      if (order.status === OrderStatus.FILLED || order.status === OrderStatus.PARTIAL_FILLED) {
        const executions = this.getOrderExecutions(order.id.toString())
        for (const execution of executions) {
          const quantity = order.side === OrderSide.BUY 
            ? execution.executedQuantity 
            : execution.executedQuantity.negated()
          
          currentPosition = currentPosition.plus(quantity)
          totalCost = totalCost.plus(execution.executedQuantity.times(execution.executedPrice))
          totalQuantity = totalQuantity.plus(execution.executedQuantity)
        }
      }
    }

    if (totalQuantity.equals(0)) {
      return undefined
    }

    const averagePrice = totalCost.dividedBy(totalQuantity)
    const orderBook = this.getOrderBook(symbol)
    const currentPrice = orderBook?.getMidPrice() || averagePrice

    const unrealizedPnL = currentPosition.times(currentPrice.minus(averagePrice))
    const exposure = currentPosition.abs().times(currentPrice)
    const marginUsed = exposure.times(0.25) // Assume 25% margin requirement

    return {
      symbol,
      currentPosition,
      averagePrice,
      unrealizedPnL,
      exposure,
      marginUsed
    }
  }

  public updateRiskLimits(newLimits: Partial<typeof this.props.riskLimits>): Result<void> {
    this.props.riskLimits = { ...this.props.riskLimits, ...newLimits }
    this.props.lastUpdateTime = new Date()
    return Result.ok<void>()
  }

  public getOrderStatistics(): {
    totalOrders: number
    activeOrders: number
    filledOrders: number
    cancelledOrders: number
    rejectedOrders: number
    totalVolume: Decimal
    averageExecutionPrice: Decimal
    fillRate: number
  } {
    const totalOrders = this.orders.length
    const activeOrders = this.activeOrders.length
    const filledOrders = this.orders.filter(o => o.status === OrderStatus.FILLED).length
    const cancelledOrders = this.orders.filter(o => o.status === OrderStatus.CANCELLED).length
    const rejectedOrders = this.orders.filter(o => o.status === OrderStatus.REJECTED).length

    let totalVolume = new Decimal(0)
    let totalNotional = new Decimal(0)
    let totalExecuted = new Decimal(0)

    for (const order of this.orders) {
      const executions = this.getOrderExecutions(order.id.toString())
      for (const execution of executions) {
        const notional = execution.executedQuantity.times(execution.executedPrice)
        totalVolume = totalVolume.plus(execution.executedQuantity)
        totalNotional = totalNotional.plus(notional)
        totalExecuted = totalExecuted.plus(execution.executedQuantity)
      }
    }

    const averageExecutionPrice = totalExecuted.equals(0) 
      ? new Decimal(0) 
      : totalNotional.dividedBy(totalExecuted)

    const fillRate = totalOrders === 0 ? 0 : (filledOrders / totalOrders) * 100

    return {
      totalOrders,
      activeOrders,
      filledOrders,
      cancelledOrders,
      rejectedOrders,
      totalVolume,
      averageExecutionPrice,
      fillRate
    }
  }

  private validateOrder(order: Order): Result<void> {
    // Basic validation
    if (!order.symbol || order.symbol.trim().length === 0) {
      return Result.fail<void>('Symbol is required')
    }

    if (order.quantity.lessThanOrEqualTo(0)) {
      return Result.fail<void>('Quantity must be positive')
    }

    if (order.type === OrderType.LIMIT && (!order.price || order.price.lessThanOrEqualTo(0))) {
      return Result.fail<void>('Price is required for limit orders')
    }

    // Symbol restrictions
    if (this.props.riskLimits.blacklistedSymbols.includes(order.symbol)) {
      return Result.fail<void>(`Symbol ${order.symbol} is blacklisted`)
    }

    if (this.props.riskLimits.allowedSymbols.length > 0 && 
        !this.props.riskLimits.allowedSymbols.includes(order.symbol)) {
      return Result.fail<void>(`Symbol ${order.symbol} is not in allowed list`)
    }

    return Result.ok<void>()
  }

  private performRiskCheck(order: Order): Result<void> {
    // Order size check
    const orderValue = order.price 
      ? order.quantity.times(order.price)
      : order.quantity.times(100) // Estimate for market orders

    if (orderValue.greaterThan(this.props.riskLimits.maxOrderSize)) {
      return Result.fail<void>(`Order size ${orderValue} exceeds limit ${this.props.riskLimits.maxOrderSize}`)
    }

    // Daily volume check
    if (this.props.dailyVolume.plus(orderValue).greaterThan(this.props.riskLimits.maxDailyVolume)) {
      return Result.fail<void>('Order would exceed daily volume limit')
    }

    // Position size check (simplified)
    const positionRisk = this.calculatePositionRisk(order.symbol)
    if (positionRisk) {
      const newExposure = positionRisk.exposure.plus(orderValue)
      if (newExposure.greaterThan(this.props.riskLimits.maxPositionSize)) {
        return Result.fail<void>('Order would exceed position size limit')
      }
    }

    return Result.ok<void>()
  }

  private attemptMarketExecution(order: Order): void {
    const orderBook = this.getOrderBook(order.symbol)
    if (!orderBook) {
      this.rejectOrder(order.id.toString(), 'No order book available', 'NO_MARKET_DATA')
      return
    }

    // Calculate market impact
    const impact = orderBook.getMarketImpact(order.side === OrderSide.BUY ? 'ask' : 'bid', order.quantity)
    if (!impact || !impact.executable) {
      this.rejectOrder(order.id.toString(), 'Insufficient liquidity', 'INSUFFICIENT_LIQUIDITY')
      return
    }

    // Execute at average price
    this.executeOrder(order.id.toString(), order.quantity, impact.averagePrice)
  }

  private checkPendingOrders(symbol: string): void {
    const pendingOrders = this.orders.filter(order => 
      order.symbol === symbol && 
      (order.status === OrderStatus.PENDING || order.status === OrderStatus.ACCEPTED)
    )

    const orderBook = this.getOrderBook(symbol)
    if (!orderBook) return

    for (const order of pendingOrders) {
      if (order.type === OrderType.LIMIT) {
        this.checkLimitOrderExecution(order, orderBook)
      } else if (order.type === OrderType.STOP_LOSS) {
        this.checkStopOrderTrigger(order, orderBook)
      }
    }
  }

  private checkLimitOrderExecution(order: Order, orderBook: OrderBook): void {
    if (!order.price) return

    const bestPrice = order.side === OrderSide.BUY 
      ? orderBook.getBestAsk()
      : orderBook.getBestBid()

    if (!bestPrice) return

    const shouldExecute = order.side === OrderSide.BUY
      ? bestPrice.price.lessThanOrEqualTo(order.price)
      : bestPrice.price.greaterThanOrEqualTo(order.price)

    if (shouldExecute) {
      const executionQuantity = Decimal.min(order.remainingQuantity, bestPrice.size)
      this.executeOrder(order.id.toString(), executionQuantity, bestPrice.price)
    }
  }

  private checkStopOrderTrigger(order: Order, orderBook: OrderBook): void {
    if (!order.stopPrice) return

    const midPrice = orderBook.getMidPrice()
    if (!midPrice) return

    const shouldTrigger = order.side === OrderSide.BUY
      ? midPrice.greaterThanOrEqualTo(order.stopPrice)
      : midPrice.lessThanOrEqualTo(order.stopPrice)

    if (shouldTrigger) {
      // Convert to market order and execute
      order.updateType(OrderType.MARKET)
      this.attemptMarketExecution(order)
    }
  }

  private calculateCommission(quantity: Decimal, price: Decimal): Decimal {
    // Simple commission calculation: 0.1% of notional value
    const notionalValue = quantity.times(price)
    return notionalValue.times(0.001)
  }

  private isOrderCancellable(order: Order): boolean {
    return order.status === OrderStatus.PENDING || 
           order.status === OrderStatus.ACCEPTED ||
           order.status === OrderStatus.PARTIAL_FILLED
  }

  private isOrderModifiable(order: Order): boolean {
    return order.status === OrderStatus.PENDING || 
           order.status === OrderStatus.ACCEPTED
  }

  public resetDailyVolume(): void {
    this.props.dailyVolume = new Decimal(0)
    this.props.lastUpdateTime = new Date()
  }

  public exportOrders(): any[] {
    return this.orders.map(order => ({
      id: order.id.toString(),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity.toNumber(),
      price: order.price?.toNumber(),
      status: order.status,
      filledQuantity: order.filledQuantity.toNumber(),
      averageFillPrice: order.averageFillPrice?.toNumber(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      executions: this.getOrderExecutions(order.id.toString()).map(exec => ({
        id: exec.id,
        executedQuantity: exec.executedQuantity.toNumber(),
        executedPrice: exec.executedPrice.toNumber(),
        executionTime: exec.executionTime.toISOString(),
        commission: exec.commission.toNumber(),
        venue: exec.venue
      }))
    }))
  }
}