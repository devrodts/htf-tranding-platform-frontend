/**
 * Value Object base class following DDD principles
 * Implements value equality and immutability
 */

interface ValueObjectProps {
  [index: string]: any
}

export abstract class ValueObject<T extends ValueObjectProps> {
  public readonly props: T

  constructor(props: T) {
    this.props = Object.freeze(props)
  }

  /**
   * Compare two value objects by their values
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false
    }

    if (vo.props === undefined) {
      return false
    }

    return this.shallowEqual(this.props, vo.props)
  }

  private shallowEqual(object1: T, object2: T): boolean {
    const keys1 = Object.keys(object1)
    const keys2 = Object.keys(object2)

    if (keys1.length !== keys2.length) {
      return false
    }

    for (let key of keys1) {
      if (object1[key] !== object2[key]) {
        return false
      }
    }

    return true
  }
}

/**
 * Common Value Objects for Trading Domain
 */

export class Money extends ValueObject<{ amount: number; currency: string }> {
  get amount(): number {
    return this.props.amount
  }

  get currency(): string {
    return this.props.currency
  }

  public static create(amount: number, currency: string): Money {
    return new Money({ amount, currency })
  }

  public add(money: Money): Money {
    if (this.currency !== money.currency) {
      throw new Error('Cannot add money with different currencies')
    }
    return Money.create(this.amount + money.amount, this.currency)
  }

  public subtract(money: Money): Money {
    if (this.currency !== money.currency) {
      throw new Error('Cannot subtract money with different currencies')
    }
    return Money.create(this.amount - money.amount, this.currency)
  }

  public multiply(factor: number): Money {
    return Money.create(this.amount * factor, this.currency)
  }

  public divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero')
    }
    return Money.create(this.amount / divisor, this.currency)
  }

  public isPositive(): boolean {
    return this.amount > 0
  }

  public isNegative(): boolean {
    return this.amount < 0
  }

  public isZero(): boolean {
    return this.amount === 0
  }

  public toString(): string {
    return `${this.amount} ${this.currency}`
  }
}

export class Price extends ValueObject<{ value: number; precision?: number }> {
  get value(): number {
    return this.props.value
  }

  get precision(): number {
    return this.props.precision ?? 2
  }

  public static create(value: number, precision = 2): Price {
    if (value < 0) {
      throw new Error('Price cannot be negative')
    }
    return new Price({ value, precision })
  }

  public toFixed(): string {
    return this.value.toFixed(this.precision)
  }

  public isGreaterThan(price: Price): boolean {
    return this.value > price.value
  }

  public isLessThan(price: Price): boolean {
    return this.value < price.value
  }

  public difference(price: Price): number {
    return Math.abs(this.value - price.value)
  }

  public percentageChange(oldPrice: Price): number {
    if (oldPrice.value === 0) {
      return 0
    }
    return ((this.value - oldPrice.value) / oldPrice.value) * 100
  }
}

export class Quantity extends ValueObject<{ value: number }> {
  get value(): number {
    return this.props.value
  }

  public static create(value: number): Quantity {
    if (value < 0) {
      throw new Error('Quantity cannot be negative')
    }
    return new Quantity({ value })
  }

  public add(quantity: Quantity): Quantity {
    return Quantity.create(this.value + quantity.value)
  }

  public subtract(quantity: Quantity): Quantity {
    const result = this.value - quantity.value
    if (result < 0) {
      throw new Error('Resulting quantity cannot be negative')
    }
    return Quantity.create(result)
  }

  public isZero(): boolean {
    return this.value === 0
  }

  public isGreaterThan(quantity: Quantity): boolean {
    return this.value > quantity.value
  }

  public isLessThan(quantity: Quantity): boolean {
    return this.value < quantity.value
  }

  public canSubtract(quantity: Quantity): boolean {
    return this.value >= quantity.value
  }
}

export class Symbol extends ValueObject<{ ticker: string; exchange?: string }> {
  get ticker(): string {
    return this.props.ticker
  }

  get exchange(): string | undefined {
    return this.props.exchange
  }

  public static create(ticker: string, exchange?: string): Symbol {
    if (!ticker || ticker.trim().length === 0) {
      throw new Error('Ticker cannot be empty')
    }
    return new Symbol({ ticker: ticker.trim().toUpperCase(), exchange })
  }

  public toString(): string {
    return this.exchange ? `${this.ticker}:${this.exchange}` : this.ticker
  }
}

export class Percentage extends ValueObject<{ value: number }> {
  get value(): number {
    return this.props.value
  }

  public static create(value: number): Percentage {
    if (value < 0 || value > 100) {
      throw new Error('Percentage must be between 0 and 100')
    }
    return new Percentage({ value })
  }

  public toDecimal(): number {
    return this.value / 100
  }

  public toString(): string {
    return `${this.value}%`
  }
}