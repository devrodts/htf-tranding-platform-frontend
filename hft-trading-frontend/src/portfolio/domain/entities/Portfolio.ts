/**
 * Portfolio Entity - Domain model for trading portfolio
 */

import { Entity } from '@/shared/domain/Entity'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Result } from '@/shared/domain/Result'
import { Position, PositionSide, PositionStatus, Price, Quantity } from './Position'
import Decimal from 'decimal.js'

export interface PortfolioMetrics {
  totalValue: Price
  cashBalance: Price
  marketValue: Price
  totalPnL: Price
  realizedPnL: Price
  unrealizedPnL: Price
  dayPnL: Price
  dayPnLPercent: number
  totalReturn: number
  totalReturnPercent: number
  portfolioValue: Price
  marginUsed: Price
  marginAvailable: Price
  buyingPower: Price
  leverage: number
}

export interface PortfolioSummary {
  positionsCount: number
  openPositionsCount: number
  closedPositionsCount: number
  longPositions: number
  shortPositions: number
  totalCommission: Price
  winRate: number
  profitFactor: number
  largestWin: Price
  largestLoss: Price
  averageWin: Price
  averageLoss: Price
}

interface RiskLimits {
  maxPositionSize: Price
  maxDailyLoss: Price
  maxLeverage: number
  concentrationLimit: number // percentage
  stopLossPercent: number
}

interface PortfolioProps {
  accountId: string
  name: string
  baseCurrency: string
  initialBalance: Price
  cashBalance: Price
  positions: Position[]
  closedPositions: Position[]
  riskLimits: RiskLimits
  createdAt: Date
  lastUpdatedAt: Date
  metadata: Record<string, any>
}

export class Portfolio extends Entity<UniqueEntityID> {
  private constructor(props: PortfolioProps, id?: UniqueEntityID) {
    super(props, id)
  }

  public static create(
    accountId: string,
    name: string,
    initialBalance: number,
    baseCurrency = 'USD',
    id?: UniqueEntityID
  ): Result<Portfolio> {
    if (!accountId || accountId.trim().length === 0) {
      return Result.fail<Portfolio>('Account ID is required')
    }

    if (!name || name.trim().length === 0) {
      return Result.fail<Portfolio>('Portfolio name is required')
    }

    if (initialBalance <= 0) {
      return Result.fail<Portfolio>('Initial balance must be positive')
    }

    const initialBalancePrice = Price.create(initialBalance, baseCurrency).getValue()!

    const props: PortfolioProps = {
      accountId,
      name,
      baseCurrency,
      initialBalance: initialBalancePrice,
      cashBalance: initialBalancePrice,
      positions: [],
      closedPositions: [],
      riskLimits: {
        maxPositionSize: Price.create(initialBalance * 0.1, baseCurrency).getValue()!, // 10% max position
        maxDailyLoss: Price.create(initialBalance * 0.05, baseCurrency).getValue()!, // 5% daily loss limit
        maxLeverage: 3.0,
        concentrationLimit: 20, // 20% max in single security
        stopLossPercent: 10 // 10% stop loss
      },
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      metadata: {}
    }

    return Result.ok<Portfolio>(new Portfolio(props, id))
  }

  get accountId(): string {
    return this.props.accountId
  }

  get name(): string {
    return this.props.name
  }

  get baseCurrency(): string {
    return this.props.baseCurrency
  }

  get initialBalance(): Price {
    return this.props.initialBalance
  }

  get cashBalance(): Price {
    return this.props.cashBalance
  }

  get positions(): Position[] {
    return [...this.props.positions]
  }

  get closedPositions(): Position[] {
    return [...this.props.closedPositions]
  }

  get allPositions(): Position[] {
    return [...this.props.positions, ...this.props.closedPositions]
  }

  get riskLimits(): RiskLimits {
    return { ...this.props.riskLimits }
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get lastUpdatedAt(): Date {
    return this.props.lastUpdatedAt
  }

  get metadata(): Record<string, any> {
    return { ...this.props.metadata }
  }

  public addPosition(position: Position): Result<void> {
    // Check if position already exists
    const existingPosition = this.props.positions.find(p => p.id.equals(position.id))
    if (existingPosition) {
      return Result.fail<void>('Position already exists in portfolio')
    }

    // Check risk limits
    const riskCheck = this.checkRiskLimits(position)
    if (riskCheck.isFailure) {
      return Result.fail<void>(riskCheck.getErrorValue())
    }

    // Update cash balance
    const positionValue = position.notionalValue
    if (this.props.cashBalance.value.lessThan(positionValue.value)) {
      return Result.fail<void>('Insufficient cash balance')
    }

    this.props.cashBalance = new (Price as any)({
      value: this.props.cashBalance.value.minus(positionValue.value),
      currency: this.props.baseCurrency
    })

    this.props.positions.push(position)
    this.props.lastUpdatedAt = new Date()

    return Result.ok<void>()
  }

  public removePosition(positionId: UniqueEntityID): Result<Position> {
    const positionIndex = this.props.positions.findIndex(p => p.id.equals(positionId))
    if (positionIndex === -1) {
      return Result.fail<Position>('Position not found')
    }

    const position = this.props.positions[positionIndex]
    this.props.positions.splice(positionIndex, 1)

    // If position is closed, move to closed positions
    if (position.isClosed()) {
      this.props.closedPositions.push(position)
      
      // Return cash including P&L
      const returnValue = position.marketValue || position.notionalValue
      const pnl = position.totalPnL || Price.create(0).getValue()!
      
      this.props.cashBalance = new (Price as any)({
        value: this.props.cashBalance.value.plus(returnValue.value).plus(pnl.value),
        currency: this.props.baseCurrency
      })
    }

    this.props.lastUpdatedAt = new Date()
    return Result.ok<Position>(position)
  }

  public getPosition(symbol: string): Position | undefined {
    return this.props.positions.find(p => p.symbol === symbol.toUpperCase())
  }

  public getPositionById(positionId: UniqueEntityID): Position | undefined {
    return this.props.positions.find(p => p.id.equals(positionId))
  }

  public updatePositionPrices(priceUpdates: Map<string, number>): Result<void> {
    for (const position of this.props.positions) {
      const newPrice = priceUpdates.get(position.symbol)
      if (newPrice !== undefined) {
        const priceObj = Price.create(newPrice, this.props.baseCurrency).getValue()!
        position.updateCurrentPrice(priceObj)
      }
    }

    this.props.lastUpdatedAt = new Date()
    return Result.ok<void>()
  }

  public calculateMetrics(): PortfolioMetrics {
    let marketValue = new Decimal(0)
    let totalPnL = new Decimal(0)
    let realizedPnL = new Decimal(0)
    let unrealizedPnL = new Decimal(0)

    // Calculate from open positions
    for (const position of this.props.positions) {
      const positionMarketValue = position.marketValue
      if (positionMarketValue) {
        marketValue = marketValue.plus(positionMarketValue.value)
      }

      const positionTotalPnL = position.totalPnL
      if (positionTotalPnL) {
        totalPnL = totalPnL.plus(positionTotalPnL.value)
      }

      realizedPnL = realizedPnL.plus(position.realizedPnL.value)

      const positionUnrealizedPnL = position.unrealizedPnL
      if (positionUnrealizedPnL) {
        unrealizedPnL = unrealizedPnL.plus(positionUnrealizedPnL.value)
      }
    }

    // Add realized P&L from closed positions
    for (const closedPosition of this.props.closedPositions) {
      realizedPnL = realizedPnL.plus(closedPosition.realizedPnL.value)
      totalPnL = totalPnL.plus(closedPosition.realizedPnL.value)
    }

    const totalValue = this.props.cashBalance.value.plus(marketValue)
    const portfolioValue = totalValue
    const totalReturn = totalValue.minus(this.props.initialBalance.value)
    const totalReturnPercent = totalReturn.dividedBy(this.props.initialBalance.value).times(100).toNumber()

    // Calculate day P&L (simplified - would need historical data in real implementation)
    const dayPnL = unrealizedPnL // Placeholder
    const dayPnLPercent = dayPnL.dividedBy(this.props.initialBalance.value).times(100).toNumber()

    // Calculate margin and leverage
    const marginUsed = marketValue.times(0.3) // Assume 30% margin requirement
    const marginAvailable = this.props.cashBalance.value.minus(marginUsed)
    const buyingPower = this.props.cashBalance.value.times(3) // 3:1 leverage
    const leverage = marketValue.dividedBy(totalValue).toNumber()

    return {
      totalValue: new (Price as any)({ value: totalValue, currency: this.props.baseCurrency }),
      cashBalance: this.props.cashBalance,
      marketValue: new (Price as any)({ value: marketValue, currency: this.props.baseCurrency }),
      totalPnL: new (Price as any)({ value: totalPnL, currency: this.props.baseCurrency }),
      realizedPnL: new (Price as any)({ value: realizedPnL, currency: this.props.baseCurrency }),
      unrealizedPnL: new (Price as any)({ value: unrealizedPnL, currency: this.props.baseCurrency }),
      dayPnL: new (Price as any)({ value: dayPnL, currency: this.props.baseCurrency }),
      dayPnLPercent,
      totalReturn: totalReturn.toNumber(),
      totalReturnPercent,
      portfolioValue: new (Price as any)({ value: portfolioValue, currency: this.props.baseCurrency }),
      marginUsed: new (Price as any)({ value: marginUsed, currency: this.props.baseCurrency }),
      marginAvailable: new (Price as any)({ value: marginAvailable, currency: this.props.baseCurrency }),
      buyingPower: new (Price as any)({ value: buyingPower, currency: this.props.baseCurrency }),
      leverage
    }
  }

  public calculateSummary(): PortfolioSummary {
    const allPositions = this.allPositions
    const closedPositions = allPositions.filter(p => p.isClosed())
    
    let totalCommission = new Decimal(0)
    let winCount = 0
    let lossCount = 0
    let totalWins = new Decimal(0)
    let totalLosses = new Decimal(0)
    let largestWin = new Decimal(0)
    let largestLoss = new Decimal(0)

    for (const position of allPositions) {
      totalCommission = totalCommission.plus(position.commission.value)

      if (position.isClosed()) {
        const pnl = position.realizedPnL.value
        if (pnl.greaterThan(0)) {
          winCount++
          totalWins = totalWins.plus(pnl)
          if (pnl.greaterThan(largestWin)) {
            largestWin = pnl
          }
        } else if (pnl.lessThan(0)) {
          lossCount++
          totalLosses = totalLosses.plus(pnl.abs())
          if (pnl.abs().greaterThan(largestLoss)) {
            largestLoss = pnl.abs()
          }
        }
      }
    }

    const totalTrades = winCount + lossCount
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0
    const profitFactor = totalLosses.greaterThan(0) ? totalWins.dividedBy(totalLosses).toNumber() : 0
    const averageWin = winCount > 0 ? totalWins.dividedBy(winCount) : new Decimal(0)
    const averageLoss = lossCount > 0 ? totalLosses.dividedBy(lossCount) : new Decimal(0)

    return {
      positionsCount: allPositions.length,
      openPositionsCount: this.props.positions.length,
      closedPositionsCount: this.props.closedPositions.length,
      longPositions: this.props.positions.filter(p => p.isLong()).length,
      shortPositions: this.props.positions.filter(p => p.isShort()).length,
      totalCommission: new (Price as any)({ value: totalCommission, currency: this.props.baseCurrency }),
      winRate,
      profitFactor,
      largestWin: new (Price as any)({ value: largestWin, currency: this.props.baseCurrency }),
      largestLoss: new (Price as any)({ value: largestLoss, currency: this.props.baseCurrency }),
      averageWin: new (Price as any)({ value: averageWin, currency: this.props.baseCurrency }),
      averageLoss: new (Price as any)({ value: averageLoss, currency: this.props.baseCurrency })
    }
  }

  public updateRiskLimits(newLimits: Partial<RiskLimits>): Result<void> {
    this.props.riskLimits = { ...this.props.riskLimits, ...newLimits }
    this.props.lastUpdatedAt = new Date()
    return Result.ok<void>()
  }

  public updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
    this.props.lastUpdatedAt = new Date()
  }

  private checkRiskLimits(position: Position): Result<void> {
    const positionValue = position.notionalValue

    // Check max position size
    if (positionValue.value.greaterThan(this.props.riskLimits.maxPositionSize.value)) {
      return Result.fail<void>(`Position size exceeds limit of ${this.props.riskLimits.maxPositionSize.value}`)
    }

    // Check concentration limit
    const metrics = this.calculateMetrics()
    const concentrationPercent = positionValue.value
      .dividedBy(metrics.totalValue.value)
      .times(100)
      .toNumber()

    if (concentrationPercent > this.props.riskLimits.concentrationLimit) {
      return Result.fail<void>(`Position concentration exceeds ${this.props.riskLimits.concentrationLimit}% limit`)
    }

    // Check leverage
    const newMarketValue = metrics.marketValue.value.plus(positionValue.value)
    const newLeverage = newMarketValue.dividedBy(metrics.totalValue.value).toNumber()

    if (newLeverage > this.props.riskLimits.maxLeverage) {
      return Result.fail<void>(`Leverage would exceed ${this.props.riskLimits.maxLeverage}:1 limit`)
    }

    return Result.ok<void>()
  }

  public getDiversification(): Map<string, number> {
    const metrics = this.calculateMetrics()
    const diversification = new Map<string, number>()

    for (const position of this.props.positions) {
      const marketValue = position.marketValue
      if (marketValue) {
        const percentage = marketValue.value
          .dividedBy(metrics.marketValue.value)
          .times(100)
          .toNumber()
        diversification.set(position.symbol, percentage)
      }
    }

    return diversification
  }

  public getTopPositions(count = 10): Position[] {
    return this.props.positions
      .filter(p => p.marketValue)
      .sort((a, b) => {
        const aValue = a.marketValue!.value.toNumber()
        const bValue = b.marketValue!.value.toNumber()
        return bValue - aValue
      })
      .slice(0, count)
  }

  public getWorstPerformers(count = 10): Position[] {
    return this.props.positions
      .filter(p => p.unrealizedPnL)
      .sort((a, b) => {
        const aReturn = a.unrealizedPnL!.value.toNumber()
        const bReturn = b.unrealizedPnL!.value.toNumber()
        return aReturn - bReturn
      })
      .slice(0, count)
  }

  public getBestPerformers(count = 10): Position[] {
    return this.props.positions
      .filter(p => p.unrealizedPnL)
      .sort((a, b) => {
        const aReturn = a.unrealizedPnL!.value.toNumber()
        const bReturn = b.unrealizedPnL!.value.toNumber()
        return bReturn - aReturn
      })
      .slice(0, count)
  }

  public export(): Record<string, any> {
    const metrics = this.calculateMetrics()
    const summary = this.calculateSummary()

    return {
      id: this.id.toString(),
      accountId: this.props.accountId,
      name: this.props.name,
      baseCurrency: this.props.baseCurrency,
      metrics: {
        totalValue: metrics.totalValue.toNumber(),
        cashBalance: metrics.cashBalance.toNumber(),
        marketValue: metrics.marketValue.toNumber(),
        totalPnL: metrics.totalPnL.toNumber(),
        realizedPnL: metrics.realizedPnL.toNumber(),
        unrealizedPnL: metrics.unrealizedPnL.toNumber(),
        totalReturnPercent: metrics.totalReturnPercent,
        leverage: metrics.leverage
      },
      summary,
      positions: this.props.positions.map(p => ({
        id: p.id.toString(),
        symbol: p.symbol,
        side: p.side,
        quantity: p.openQuantity.value,
        averagePrice: p.averageOpenPrice.toNumber(),
        currentPrice: p.currentPrice?.toNumber(),
        unrealizedPnL: p.unrealizedPnL?.toNumber(),
        marketValue: p.marketValue?.toNumber()
      })),
      createdAt: this.props.createdAt.toISOString(),
      lastUpdatedAt: this.props.lastUpdatedAt.toISOString()
    }
  }
}