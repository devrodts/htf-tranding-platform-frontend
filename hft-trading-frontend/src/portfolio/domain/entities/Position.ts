/**
 * Position Entity - Domain model for trading positions
 */

import { Entity } from '@/shared/domain/Entity'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Result } from '@/shared/domain/Result'
import { ValueObject } from '@/shared/domain/ValueObject'
import Decimal from 'decimal.js'

export enum PositionSide {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum PositionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PARTIAL = 'PARTIAL'
}

export class Quantity extends ValueObject<{ value: number }> {
  private constructor(props: { value: number }) {
    super(props)
  }

  public static create(value: number): Result<Quantity> {
    if (value <= 0) {
      return Result.fail<Quantity>('Quantity must be positive')
    }
    if (!Number.isFinite(value)) {
      return Result.fail<Quantity>('Quantity must be finite')
    }
    return Result.ok<Quantity>(new Quantity({ value }))
  }

  get value(): number {
    return this.props.value
  }

  public add(other: Quantity): Quantity {
    return new Quantity({ value: this.props.value + other.props.value })
  }

  public subtract(other: Quantity): Result<Quantity> {
    const newValue = this.props.value - other.props.value
    if (newValue < 0) {
      return Result.fail<Quantity>('Cannot subtract more quantity than available')
    }
    return Result.ok<Quantity>(new Quantity({ value: newValue }))
  }

  public multiply(factor: number): Quantity {
    return new Quantity({ value: this.props.value * factor })
  }

  public isGreaterThan(other: Quantity): boolean {
    return this.props.value > other.props.value
  }

  public equals(other: Quantity): boolean {
    return this.props.value === other.props.value
  }
}

export class Price extends ValueObject<{ value: Decimal; currency: string }> {
  private constructor(props: { value: Decimal; currency: string }) {
    super(props)
  }

  public static create(value: number, currency = 'USD'): Result<Price> {
    if (value <= 0) {
      return Result.fail<Price>('Price must be positive')
    }
    if (!Number.isFinite(value)) {
      return Result.fail<Price>('Price must be finite')
    }
    return Result.ok<Price>(new Price({ 
      value: new Decimal(value), 
      currency 
    }))
  }

  get value(): Decimal {
    return this.props.value
  }

  get currency(): string {
    return this.props.currency
  }

  public toNumber(): number {
    return this.props.value.toNumber()
  }

  public subtract(other: Price): Result<Price> {
    if (this.props.currency !== other.props.currency) {
      return Result.fail<Price>('Cannot subtract prices with different currencies')
    }
    const difference = this.props.value.minus(other.props.value)
    return Result.ok<Price>(new Price({ 
      value: difference, 
      currency: this.props.currency 
    }))
  }

  public multiply(quantity: Quantity): Price {
    return new Price({
      value: this.props.value.times(quantity.value),
      currency: this.props.currency
    })
  }

  public divide(quantity: Quantity): Price {
    return new Price({
      value: this.props.value.dividedBy(quantity.value),
      currency: this.props.currency
    })
  }

  public isGreaterThan(other: Price): boolean {
    return this.props.value.greaterThan(other.props.value)
  }
}

export interface Trade {
  id: string
  quantity: Quantity
  price: Price
  side: PositionSide
  timestamp: Date
  commission: Price
}

interface PositionProps {
  symbol: string
  side: PositionSide
  status: PositionStatus
  openQuantity: Quantity
  totalQuantity: Quantity
  averageOpenPrice: Price
  currentPrice?: Price
  trades: Trade[]
  openedAt: Date
  closedAt?: Date
  commission: Price
  realizedPnL: Price
  unrealizedPnL?: Price
  metadata: Record<string, any>
}

export class Position extends Entity<UniqueEntityID> {
  private constructor(props: PositionProps, id?: UniqueEntityID) {
    super(props, id)
  }

  public static create(
    symbol: string,
    initialTrade: Omit<Trade, 'id'>,
    id?: UniqueEntityID
  ): Result<Position> {
    if (!symbol || symbol.trim().length === 0) {
      return Result.fail<Position>('Symbol is required')
    }

    const tradeWithId: Trade = {
      ...initialTrade,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    const props: PositionProps = {
      symbol: symbol.toUpperCase(),
      side: initialTrade.side,
      status: PositionStatus.OPEN,
      openQuantity: initialTrade.quantity,
      totalQuantity: initialTrade.quantity,
      averageOpenPrice: initialTrade.price,
      trades: [tradeWithId],
      openedAt: initialTrade.timestamp,
      commission: initialTrade.commission,
      realizedPnL: Price.create(0).getValue()!,
      metadata: {}
    }

    return Result.ok<Position>(new Position(props, id))
  }

  get symbol(): string {
    return this.props.symbol
  }

  get side(): PositionSide {
    return this.props.side
  }

  get status(): PositionStatus {
    return this.props.status
  }

  get openQuantity(): Quantity {
    return this.props.openQuantity
  }

  get totalQuantity(): Quantity {
    return this.props.totalQuantity
  }

  get averageOpenPrice(): Price {
    return this.props.averageOpenPrice
  }

  get currentPrice(): Price | undefined {
    return this.props.currentPrice
  }

  get trades(): Trade[] {
    return [...this.props.trades]
  }

  get openedAt(): Date {
    return this.props.openedAt
  }

  get closedAt(): Date | undefined {
    return this.props.closedAt
  }

  get commission(): Price {
    return this.props.commission
  }

  get realizedPnL(): Price {
    return this.props.realizedPnL
  }

  get unrealizedPnL(): Price | undefined {
    return this.props.unrealizedPnL
  }

  get totalPnL(): Price | undefined {
    if (!this.props.unrealizedPnL) return undefined
    
    const total = this.props.realizedPnL.value.plus(this.props.unrealizedPnL.value)
    return new (Price as any)({ 
      value: total, 
      currency: this.props.realizedPnL.currency 
    })
  }

  get marketValue(): Price | undefined {
    if (!this.props.currentPrice) return undefined
    return this.props.currentPrice.multiply(this.props.openQuantity)
  }

  get notionalValue(): Price {
    return this.props.averageOpenPrice.multiply(this.props.openQuantity)
  }

  get metadata(): Record<string, any> {
    return { ...this.props.metadata }
  }

  public updateCurrentPrice(price: Price): Result<void> {
    this.props.currentPrice = price
    this.calculateUnrealizedPnL()
    return Result.ok<void>()
  }

  public addTrade(trade: Omit<Trade, 'id'>): Result<void> {
    const tradeWithId: Trade = {
      ...trade,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Check if trade is in the same direction as position
    if (trade.side === this.props.side) {
      // Adding to position
      const newTotalQuantity = this.props.totalQuantity.add(trade.quantity)
      const newTotalValue = this.props.averageOpenPrice
        .multiply(this.props.totalQuantity)
        .value
        .plus(trade.price.multiply(trade.quantity).value)
      
      const newAveragePrice = Price.create(
        newTotalValue.dividedBy(newTotalQuantity.value).toNumber(),
        this.props.averageOpenPrice.currency
      ).getValue()!

      this.props.totalQuantity = newTotalQuantity
      this.props.openQuantity = this.props.openQuantity.add(trade.quantity)
      this.props.averageOpenPrice = newAveragePrice
    } else {
      // Reducing/closing position
      const closingQuantity = Quantity.create(
        Math.min(trade.quantity.value, this.props.openQuantity.value)
      ).getValue()!

      // Calculate realized P&L for the closing portion
      const priceDifference = this.props.side === PositionSide.LONG
        ? trade.price.subtract(this.props.averageOpenPrice).getValue()!
        : this.props.averageOpenPrice.subtract(trade.price).getValue()!

      const realizedPnL = priceDifference.multiply(closingQuantity)
      this.props.realizedPnL = new (Price as any)({
        value: this.props.realizedPnL.value.plus(realizedPnL.value),
        currency: this.props.realizedPnL.currency
      })

      // Update quantities
      const remainingQuantity = this.props.openQuantity.subtract(closingQuantity).getValue()!
      this.props.openQuantity = remainingQuantity

      if (this.props.openQuantity.value === 0) {
        this.props.status = PositionStatus.CLOSED
        this.props.closedAt = trade.timestamp
      } else if (this.props.openQuantity.value < this.props.totalQuantity.value) {
        this.props.status = PositionStatus.PARTIAL
      }
    }

    // Add commission
    this.props.commission = new (Price as any)({
      value: this.props.commission.value.plus(trade.commission.value),
      currency: this.props.commission.currency
    })

    this.props.trades.push(tradeWithId)
    this.calculateUnrealizedPnL()

    return Result.ok<void>()
  }

  public close(closingPrice: Price, timestamp: Date): Result<void> {
    if (this.props.status === PositionStatus.CLOSED) {
      return Result.fail<void>('Position is already closed')
    }

    const closingTrade: Omit<Trade, 'id'> = {
      quantity: this.props.openQuantity,
      price: closingPrice,
      side: this.props.side === PositionSide.LONG ? PositionSide.SHORT : PositionSide.LONG,
      timestamp,
      commission: Price.create(0).getValue()! // Assume no commission for manual close
    }

    return this.addTrade(closingTrade)
  }

  public updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
  }

  private calculateUnrealizedPnL(): void {
    if (!this.props.currentPrice || this.props.status === PositionStatus.CLOSED) {
      this.props.unrealizedPnL = undefined
      return
    }

    const priceDifference = this.props.side === PositionSide.LONG
      ? this.props.currentPrice.subtract(this.props.averageOpenPrice).getValue()!
      : this.props.averageOpenPrice.subtract(this.props.currentPrice).getValue()!

    this.props.unrealizedPnL = priceDifference.multiply(this.props.openQuantity)
  }

  public getDuration(): number {
    const endTime = this.props.closedAt || new Date()
    return endTime.getTime() - this.props.openedAt.getTime()
  }

  public getROI(): number | undefined {
    const totalPnL = this.totalPnL
    if (!totalPnL) return undefined

    const costBasis = this.notionalValue.value.plus(this.props.commission.value)
    return totalPnL.value.dividedBy(costBasis).times(100).toNumber()
  }

  public isLong(): boolean {
    return this.props.side === PositionSide.LONG
  }

  public isShort(): boolean {
    return this.props.side === PositionSide.SHORT
  }

  public isOpen(): boolean {
    return this.props.status === PositionStatus.OPEN
  }

  public isClosed(): boolean {
    return this.props.status === PositionStatus.CLOSED
  }
}