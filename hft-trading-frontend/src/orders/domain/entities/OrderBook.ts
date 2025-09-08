/**
 * Order Book Entity - Domain model for market order book
 */

import { Entity } from '@/shared/domain/Entity'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Result } from '@/shared/domain/Result'
import Decimal from 'decimal.js'

export interface BookLevel {
  price: Decimal
  size: Decimal
  orders: number
  timestamp: Date
}

export interface OrderBookSnapshot {
  symbol: string
  bids: BookLevel[]
  asks: BookLevel[]
  timestamp: Date
  sequence: number
}

export interface OrderBookUpdate {
  symbol: string
  side: 'bid' | 'ask'
  price: Decimal
  size: Decimal
  operation: 'add' | 'update' | 'delete'
  timestamp: Date
  sequence: number
}

interface OrderBookProps {
  symbol: string
  bids: Map<string, BookLevel> // price -> level
  asks: Map<string, BookLevel> // price -> level
  lastUpdateTime: Date
  sequence: number
  maxDepth: number
}

export class OrderBook extends Entity<UniqueEntityID> {
  private constructor(props: OrderBookProps, id?: UniqueEntityID) {
    super(props, id)
  }

  public static create(symbol: string, maxDepth = 50, id?: UniqueEntityID): Result<OrderBook> {
    if (!symbol || symbol.trim().length === 0) {
      return Result.fail<OrderBook>('Symbol is required')
    }

    if (maxDepth <= 0 || maxDepth > 1000) {
      return Result.fail<OrderBook>('Max depth must be between 1 and 1000')
    }

    const props: OrderBookProps = {
      symbol: symbol.toUpperCase(),
      bids: new Map(),
      asks: new Map(),
      lastUpdateTime: new Date(),
      sequence: 0,
      maxDepth
    }

    return Result.ok<OrderBook>(new OrderBook(props, id))
  }

  get symbol(): string {
    return this.props.symbol
  }

  get lastUpdateTime(): Date {
    return this.props.lastUpdateTime
  }

  get sequence(): number {
    return this.props.sequence
  }

  get maxDepth(): number {
    return this.props.maxDepth
  }

  public applySnapshot(snapshot: OrderBookSnapshot): Result<void> {
    if (snapshot.symbol !== this.props.symbol) {
      return Result.fail<void>('Snapshot symbol does not match order book symbol')
    }

    // Clear existing levels
    this.props.bids.clear()
    this.props.asks.clear()

    // Apply bid levels
    for (const level of snapshot.bids) {
      const priceKey = level.price.toString()
      this.props.bids.set(priceKey, { ...level })
    }

    // Apply ask levels
    for (const level of snapshot.asks) {
      const priceKey = level.price.toString()
      this.props.asks.set(priceKey, { ...level })
    }

    this.props.lastUpdateTime = snapshot.timestamp
    this.props.sequence = snapshot.sequence

    this.trimToMaxDepth()

    return Result.ok<void>()
  }

  public applyUpdate(update: OrderBookUpdate): Result<void> {
    if (update.symbol !== this.props.symbol) {
      return Result.fail<void>('Update symbol does not match order book symbol')
    }

    if (update.sequence <= this.props.sequence) {
      // Ignore out-of-sequence updates
      return Result.ok<void>()
    }

    const priceKey = update.price.toString()
    const levelMap = update.side === 'bid' ? this.props.bids : this.props.asks

    switch (update.operation) {
      case 'add':
      case 'update':
        if (update.size.equals(0)) {
          // Size 0 means delete
          levelMap.delete(priceKey)
        } else {
          const existingLevel = levelMap.get(priceKey)
          levelMap.set(priceKey, {
            price: update.price,
            size: update.size,
            orders: existingLevel?.orders || 1,
            timestamp: update.timestamp
          })
        }
        break

      case 'delete':
        levelMap.delete(priceKey)
        break

      default:
        return Result.fail<void>(`Unknown operation: ${update.operation}`)
    }

    this.props.lastUpdateTime = update.timestamp
    this.props.sequence = update.sequence

    this.trimToMaxDepth()

    return Result.ok<void>()
  }

  public getBids(depth?: number): BookLevel[] {
    const requestedDepth = depth || this.props.maxDepth
    return Array.from(this.props.bids.values())
      .sort((a, b) => b.price.comparedTo(a.price)) // Descending order
      .slice(0, requestedDepth)
  }

  public getAsks(depth?: number): BookLevel[] {
    const requestedDepth = depth || this.props.maxDepth
    return Array.from(this.props.asks.values())
      .sort((a, b) => a.price.comparedTo(b.price)) // Ascending order
      .slice(0, requestedDepth)
  }

  public getBestBid(): BookLevel | undefined {
    const bids = this.getBids(1)
    return bids[0]
  }

  public getBestAsk(): BookLevel | undefined {
    const asks = this.getAsks(1)
    return asks[0]
  }

  public getSpread(): Decimal | undefined {
    const bestBid = this.getBestBid()
    const bestAsk = this.getBestAsk()
    
    if (!bestBid || !bestAsk) {
      return undefined
    }

    return bestAsk.price.minus(bestBid.price)
  }

  public getSpreadPercent(): Decimal | undefined {
    const spread = this.getSpread()
    const bestBid = this.getBestBid()
    
    if (!spread || !bestBid) {
      return undefined
    }

    return spread.dividedBy(bestBid.price).times(100)
  }

  public getMidPrice(): Decimal | undefined {
    const bestBid = this.getBestBid()
    const bestAsk = this.getBestAsk()
    
    if (!bestBid || !bestAsk) {
      return undefined
    }

    return bestBid.price.plus(bestAsk.price).dividedBy(2)
  }

  public getTotalBidSize(): Decimal {
    return Array.from(this.props.bids.values())
      .reduce((total, level) => total.plus(level.size), new Decimal(0))
  }

  public getTotalAskSize(): Decimal {
    return Array.from(this.props.asks.values())
      .reduce((total, level) => total.plus(level.size), new Decimal(0))
  }

  public getBidSizeAtPrice(price: Decimal): Decimal {
    const level = this.props.bids.get(price.toString())
    return level?.size || new Decimal(0)
  }

  public getAskSizeAtPrice(price: Decimal): Decimal {
    const level = this.props.asks.get(price.toString())
    return level?.size || new Decimal(0)
  }

  public getVolumeWeightedAveragePrice(side: 'bid' | 'ask', size: Decimal): Decimal | undefined {
    const levels = side === 'bid' ? this.getBids() : this.getAsks()
    let remainingSize = size
    let weightedSum = new Decimal(0)
    let totalSize = new Decimal(0)

    for (const level of levels) {
      if (remainingSize.lessThanOrEqualTo(0)) break

      const levelSize = Decimal.min(level.size, remainingSize)
      weightedSum = weightedSum.plus(level.price.times(levelSize))
      totalSize = totalSize.plus(levelSize)
      remainingSize = remainingSize.minus(levelSize)
    }

    if (totalSize.equals(0)) {
      return undefined
    }

    return weightedSum.dividedBy(totalSize)
  }

  public getMarketImpact(side: 'bid' | 'ask', size: Decimal): {
    averagePrice: Decimal
    worstPrice: Decimal
    totalCost: Decimal
    priceImpact: Decimal
    executable: boolean
  } | undefined {
    const levels = side === 'bid' ? this.getAsks() : this.getBids() // Cross side for market orders
    const midPrice = this.getMidPrice()
    
    if (!midPrice) {
      return undefined
    }

    let remainingSize = size
    let totalCost = new Decimal(0)
    let worstPrice = new Decimal(0)
    let executable = true

    for (const level of levels) {
      if (remainingSize.lessThanOrEqualTo(0)) break

      const levelSize = Decimal.min(level.size, remainingSize)
      totalCost = totalCost.plus(level.price.times(levelSize))
      worstPrice = level.price
      remainingSize = remainingSize.minus(levelSize)
    }

    if (remainingSize.greaterThan(0)) {
      executable = false
    }

    const averagePrice = totalCost.dividedBy(size.minus(remainingSize))
    const priceImpact = averagePrice.minus(midPrice).dividedBy(midPrice).times(100)

    return {
      averagePrice,
      worstPrice,
      totalCost,
      priceImpact,
      executable
    }
  }

  public getSnapshot(): OrderBookSnapshot {
    return {
      symbol: this.props.symbol,
      bids: this.getBids(),
      asks: this.getAsks(),
      timestamp: this.props.lastUpdateTime,
      sequence: this.props.sequence
    }
  }

  public clear(): void {
    this.props.bids.clear()
    this.props.asks.clear()
    this.props.lastUpdateTime = new Date()
    this.props.sequence = 0
  }

  public isEmpty(): boolean {
    return this.props.bids.size === 0 && this.props.asks.size === 0
  }

  public getAge(): number {
    return Date.now() - this.props.lastUpdateTime.getTime()
  }

  public isStale(maxAgeMs = 30000): boolean {
    return this.getAge() > maxAgeMs
  }

  private trimToMaxDepth(): void {
    // Trim bids to max depth (keep highest prices)
    if (this.props.bids.size > this.props.maxDepth) {
      const sortedBids = Array.from(this.props.bids.entries())
        .sort(([, a], [, b]) => b.price.comparedTo(a.price))
        .slice(0, this.props.maxDepth)
      
      this.props.bids.clear()
      for (const [price, level] of sortedBids) {
        this.props.bids.set(price, level)
      }
    }

    // Trim asks to max depth (keep lowest prices)
    if (this.props.asks.size > this.props.maxDepth) {
      const sortedAsks = Array.from(this.props.asks.entries())
        .sort(([, a], [, b]) => a.price.comparedTo(b.price))
        .slice(0, this.props.maxDepth)
      
      this.props.asks.clear()
      for (const [price, level] of sortedAsks) {
        this.props.asks.set(price, level)
      }
    }
  }

  public validate(): Result<void> {
    // Check that bids are in descending order
    const bids = this.getBids()
    for (let i = 1; i < bids.length; i++) {
      if (bids[i].price.greaterThan(bids[i - 1].price)) {
        return Result.fail<void>('Bids are not in descending order')
      }
    }

    // Check that asks are in ascending order
    const asks = this.getAsks()
    for (let i = 1; i < asks.length; i++) {
      if (asks[i].price.lessThan(asks[i - 1].price)) {
        return Result.fail<void>('Asks are not in ascending order')
      }
    }

    // Check that best ask >= best bid (no crossed market)
    const bestBid = this.getBestBid()
    const bestAsk = this.getBestAsk()
    
    if (bestBid && bestAsk && bestAsk.price.lessThan(bestBid.price)) {
      return Result.fail<void>('Crossed market: best ask < best bid')
    }

    // Check for negative prices or sizes
    for (const level of [...bids, ...asks]) {
      if (level.price.lessThanOrEqualTo(0)) {
        return Result.fail<void>('Invalid price: must be positive')
      }
      if (level.size.lessThan(0)) {
        return Result.fail<void>('Invalid size: must be non-negative')
      }
    }

    return Result.ok<void>()
  }

  public getStatistics(): {
    bidLevels: number
    askLevels: number
    totalBidSize: Decimal
    totalAskSize: Decimal
    spread: Decimal | undefined
    spreadPercent: Decimal | undefined
    midPrice: Decimal | undefined
    imbalance: Decimal // (bid_size - ask_size) / (bid_size + ask_size)
  } {
    const bidLevels = this.props.bids.size
    const askLevels = this.props.asks.size
    const totalBidSize = this.getTotalBidSize()
    const totalAskSize = this.getTotalAskSize()
    const spread = this.getSpread()
    const spreadPercent = this.getSpreadPercent()
    const midPrice = this.getMidPrice()
    
    const totalSize = totalBidSize.plus(totalAskSize)
    const imbalance = totalSize.equals(0) 
      ? new Decimal(0)
      : totalBidSize.minus(totalAskSize).dividedBy(totalSize)

    return {
      bidLevels,
      askLevels,
      totalBidSize,
      totalAskSize,
      spread,
      spreadPercent,
      midPrice,
      imbalance
    }
  }
}