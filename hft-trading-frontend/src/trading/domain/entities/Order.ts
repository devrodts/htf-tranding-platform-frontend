/**
 * Order Aggregate Root - Core trading entity following DDD principles
 */

import { Entity, UniqueEntityID } from '@/shared/domain/Entity'
import { Result } from '@/shared/domain/Result'
import { Price, Quantity, Symbol, Money } from '@/shared/domain/ValueObject'
import { OrderCreatedEvent, OrderUpdatedEvent, OrderCancelledEvent } from '../events/OrderEvents'

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LIMIT = 'STOP_LIMIT',
  ICEBERG = 'ICEBERG',
  PEGGED = 'PEGGED',
  TWAP = 'TWAP',
  VWAP = 'VWAP'
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancelled
  IOC = 'IOC', // Immediate Or Cancel
  FOK = 'FOK', // Fill Or Kill
  DAY = 'DAY', // Day Order
  GTD = 'GTD'  // Good Till Date
}

interface OrderProps {
  symbol: Symbol
  side: OrderSide
  type: OrderType
  quantity: Quantity
  price?: Price
  stopPrice?: Price
  timeInForce: TimeInForce
  status: OrderStatus
  filledQuantity: Quantity
  remainingQuantity: Quantity
  averageFillPrice?: Price
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  clientOrderId?: string
  parentOrderId?: UniqueEntityID
  // Advanced order parameters
  icebergVisibleQuantity?: Quantity
  pegOffset?: Price
  minExecutionQuantity?: Quantity
  maxFloorQuantity?: Quantity
  hideNotSlide?: boolean
}

export class Order extends Entity<UniqueEntityID> {
  private constructor(
    private props: OrderProps,
    id?: UniqueEntityID
  ) {
    super(id || new UniqueEntityID())
  }

  get symbol(): Symbol {
    return this.props.symbol
  }

  get side(): OrderSide {
    return this.props.side
  }

  get type(): OrderType {
    return this.props.type
  }

  get quantity(): Quantity {
    return this.props.quantity
  }

  get price(): Price | undefined {
    return this.props.price
  }

  get stopPrice(): Price | undefined {
    return this.props.stopPrice
  }

  get timeInForce(): TimeInForce {
    return this.props.timeInForce
  }

  get status(): OrderStatus {
    return this.props.status
  }

  get filledQuantity(): Quantity {
    return this.props.filledQuantity
  }

  get remainingQuantity(): Quantity {
    return this.props.remainingQuantity
  }

  get averageFillPrice(): Price | undefined {
    return this.props.averageFillPrice
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get expiresAt(): Date | undefined {
    return this.props.expiresAt
  }

  get clientOrderId(): string | undefined {
    return this.props.clientOrderId
  }

  get parentOrderId(): UniqueEntityID | undefined {
    return this.props.parentOrderId
  }

  get icebergVisibleQuantity(): Quantity | undefined {
    return this.props.icebergVisibleQuantity
  }

  get pegOffset(): Price | undefined {
    return this.props.pegOffset
  }

  get minExecutionQuantity(): Quantity | undefined {
    return this.props.minExecutionQuantity
  }

  get maxFloorQuantity(): Quantity | undefined {
    return this.props.maxFloorQuantity
  }

  get hideNotSlide(): boolean {
    return this.props.hideNotSlide ?? false
  }

  /**
   * Business logic methods
   */
  public canBeCancelled(): boolean {
    return this.props.status === OrderStatus.NEW || 
           this.props.status === OrderStatus.PARTIALLY_FILLED
  }

  public canBeModified(): boolean {
    return this.props.status === OrderStatus.NEW || 
           this.props.status === OrderStatus.PARTIALLY_FILLED
  }

  public isActive(): boolean {
    return this.props.status === OrderStatus.NEW || 
           this.props.status === OrderStatus.PARTIALLY_FILLED
  }

  public isFilled(): boolean {
    return this.props.status === OrderStatus.FILLED
  }

  public isPartiallyFilled(): boolean {
    return this.props.status === OrderStatus.PARTIALLY_FILLED
  }

  public getNotionalValue(): Money | undefined {
    if (!this.props.price) return undefined
    const amount = this.props.quantity.value * this.props.price.value
    return Money.create(amount, 'USD') // Default currency, should be configurable
  }

  public getFillPercentage(): number {
    if (this.props.quantity.value === 0) return 0
    return (this.props.filledQuantity.value / this.props.quantity.value) * 100
  }

  /**
   * Domain operations
   */
  public cancel(): Result<void> {
    if (!this.canBeCancelled()) {
      return Result.fail('Order cannot be cancelled in current status')
    }

    this.props.status = OrderStatus.CANCELLED
    this.props.updatedAt = new Date()
    
    this.addDomainEvent(new OrderCancelledEvent(this.id, this))
    
    return Result.ok()
  }

  public fill(quantity: Quantity, price: Price): Result<void> {
    if (!this.isActive()) {
      return Result.fail('Order is not active')
    }

    if (!this.props.remainingQuantity.canSubtract(quantity)) {
      return Result.fail('Fill quantity exceeds remaining quantity')
    }

    // Update quantities
    this.props.filledQuantity = this.props.filledQuantity.add(quantity)
    this.props.remainingQuantity = this.props.remainingQuantity.subtract(quantity)
    
    // Update average fill price
    this.updateAverageFillPrice(quantity, price)
    
    // Update status
    if (this.props.remainingQuantity.isZero()) {
      this.props.status = OrderStatus.FILLED
    } else {
      this.props.status = OrderStatus.PARTIALLY_FILLED
    }
    
    this.props.updatedAt = new Date()
    
    this.addDomainEvent(new OrderUpdatedEvent(this.id, this))
    
    return Result.ok()
  }

  public modifyPrice(newPrice: Price): Result<void> {
    if (!this.canBeModified()) {
      return Result.fail('Order cannot be modified in current status')
    }

    if (this.props.type === OrderType.MARKET) {
      return Result.fail('Market orders cannot have price modified')
    }

    this.props.price = newPrice
    this.props.updatedAt = new Date()
    
    this.addDomainEvent(new OrderUpdatedEvent(this.id, this))
    
    return Result.ok()
  }

  public modifyQuantity(newQuantity: Quantity): Result<void> {
    if (!this.canBeModified()) {
      return Result.fail('Order cannot be modified in current status')
    }

    if (newQuantity.isLessThan(this.props.filledQuantity)) {
      return Result.fail('New quantity cannot be less than filled quantity')
    }

    this.props.quantity = newQuantity
    this.props.remainingQuantity = newQuantity.subtract(this.props.filledQuantity)
    this.props.updatedAt = new Date()
    
    this.addDomainEvent(new OrderUpdatedEvent(this.id, this))
    
    return Result.ok()
  }

  private updateAverageFillPrice(fillQuantity: Quantity, fillPrice: Price): void {
    if (!this.props.averageFillPrice) {
      this.props.averageFillPrice = fillPrice
      return
    }

    const previousFillValue = this.props.filledQuantity.subtract(fillQuantity).value * this.props.averageFillPrice.value
    const currentFillValue = fillQuantity.value * fillPrice.value
    const totalValue = previousFillValue + currentFillValue
    const totalQuantity = this.props.filledQuantity.value
    
    this.props.averageFillPrice = Price.create(totalValue / totalQuantity, fillPrice.precision)
  }

  /**
   * Factory methods
   */
  public static createLimitOrder(
    symbol: Symbol,
    side: OrderSide,
    quantity: Quantity,
    price: Price,
    timeInForce: TimeInForce = TimeInForce.GTC,
    clientOrderId?: string
  ): Result<Order> {
    const props: OrderProps = {
      symbol,
      side,
      type: OrderType.LIMIT,
      quantity,
      price,
      timeInForce,
      status: OrderStatus.PENDING,
      filledQuantity: Quantity.create(0),
      remainingQuantity: quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(clientOrderId && { clientOrderId })
    }

    const order = new Order(props)
    order.addDomainEvent(new OrderCreatedEvent(order.id, order))
    
    return Result.ok(order)
  }

  public static createMarketOrder(
    symbol: Symbol,
    side: OrderSide,
    quantity: Quantity,
    timeInForce: TimeInForce = TimeInForce.IOC,
    clientOrderId?: string
  ): Result<Order> {
    const props: OrderProps = {
      symbol,
      side,
      type: OrderType.MARKET,
      quantity,
      timeInForce,
      status: OrderStatus.PENDING,
      filledQuantity: Quantity.create(0),
      remainingQuantity: quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(clientOrderId && { clientOrderId })
    }

    const order = new Order(props)
    order.addDomainEvent(new OrderCreatedEvent(order.id, order))
    
    return Result.ok(order)
  }

  public static createStopLossOrder(
    symbol: Symbol,
    side: OrderSide,
    quantity: Quantity,
    stopPrice: Price,
    timeInForce: TimeInForce = TimeInForce.GTC,
    clientOrderId?: string
  ): Result<Order> {
    const props: OrderProps = {
      symbol,
      side,
      type: OrderType.STOP_LOSS,
      quantity,
      stopPrice,
      timeInForce,
      status: OrderStatus.PENDING,
      filledQuantity: Quantity.create(0),
      remainingQuantity: quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(clientOrderId && { clientOrderId })
    }

    const order = new Order(props)
    order.addDomainEvent(new OrderCreatedEvent(order.id, order))
    
    return Result.ok(order)
  }

  public static createIcebergOrder(
    symbol: Symbol,
    side: OrderSide,
    quantity: Quantity,
    price: Price,
    visibleQuantity: Quantity,
    timeInForce: TimeInForce = TimeInForce.GTC,
    clientOrderId?: string
  ): Result<Order> {
    if (visibleQuantity.isGreaterThan(quantity)) {
      return Result.fail('Visible quantity cannot be greater than total quantity')
    }

    const props: OrderProps = {
      symbol,
      side,
      type: OrderType.ICEBERG,
      quantity,
      price,
      timeInForce,
      status: OrderStatus.PENDING,
      filledQuantity: Quantity.create(0),
      remainingQuantity: quantity,
      icebergVisibleQuantity: visibleQuantity,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(clientOrderId && { clientOrderId })
    }

    const order = new Order(props)
    order.addDomainEvent(new OrderCreatedEvent(order.id, order))
    
    return Result.ok(order)
  }

  /**
   * Reconstruct from persistence
   */
  public static fromPersistence(props: OrderProps & { id: string }): Order {
    return new Order({
      ...props
    }, new UniqueEntityID(props.id))
  }

  /**
   * Convert to persistence
   */
  public toPersistence(): any {
    return {
      id: this.id.toString(),
      symbol: this.props.symbol.toString(),
      side: this.props.side,
      type: this.props.type,
      quantity: this.props.quantity.value,
      price: this.props.price?.value,
      stopPrice: this.props.stopPrice?.value,
      timeInForce: this.props.timeInForce,
      status: this.props.status,
      filledQuantity: this.props.filledQuantity.value,
      remainingQuantity: this.props.remainingQuantity.value,
      averageFillPrice: this.props.averageFillPrice?.value,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      expiresAt: this.props.expiresAt,
      clientOrderId: this.props.clientOrderId,
      parentOrderId: this.props.parentOrderId?.toString(),
      icebergVisibleQuantity: this.props.icebergVisibleQuantity?.value,
      pegOffset: this.props.pegOffset?.value,
      minExecutionQuantity: this.props.minExecutionQuantity?.value,
      maxFloorQuantity: this.props.maxFloorQuantity?.value,
      hideNotSlide: this.props.hideNotSlide
    }
  }
}