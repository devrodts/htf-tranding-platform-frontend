/**
 * Result pattern for better error handling
 * Based on functional programming principles
 */

export class Result<T> {
  public isSuccess: boolean
  public isFailure: boolean
  public error: T | string | null
  private _value: T | null

  constructor(isSuccess: boolean, error?: T | string | null, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error')
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message')
    }

    this.isSuccess = isSuccess
    this.isFailure = !isSuccess
    this.error = error || null
    this._value = value || null

    Object.freeze(this)
  }

  public getValue(): T {
    if (!this.isSuccess) {
      console.error('Cannot get the value of an error result. Use getErrorValue() instead.')
      throw new Error('Cannot get the value of an error result. Use getErrorValue() instead.')
    }

    return this._value as T
  }

  public getErrorValue(): T {
    return this.error as T
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, null, value)
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error)
  }

  public static combine(results: Result<any>[]): Result<any> {
    for (let result of results) {
      if (result.isFailure) return result
    }
    return Result.ok()
  }

  /**
   * Map function for successful results
   */
  public map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail(this.error as string)
    }
    
    try {
      return Result.ok(fn(this.getValue()))
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * FlatMap function for chaining results
   */
  public flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail(this.error as string)
    }

    return fn(this.getValue())
  }

  /**
   * Match function for pattern matching
   */
  public match<U>(
    onSuccess: (value: T) => U,
    onFailure: (error: string) => U
  ): U {
    if (this.isSuccess) {
      return onSuccess(this.getValue())
    } else {
      return onFailure(this.error as string)
    }
  }
}

/**
 * Either type for functional programming style
 */
export type Either<L, R> = Left<L, R> | Right<L, R>

export class Left<L, R> {
  readonly value: L

  constructor(value: L) {
    this.value = value
  }

  isLeft(): this is Left<L, R> {
    return true
  }

  isRight(): this is Right<L, R> {
    return false
  }

  map<U>(_fn: (value: R) => U): Either<L, U> {
    return new Left(this.value)
  }

  flatMap<U>(_fn: (value: R) => Either<L, U>): Either<L, U> {
    return new Left(this.value)
  }

  mapLeft<U>(fn: (value: L) => U): Either<U, R> {
    return new Left(fn(this.value))
  }

  fold<U>(fnL: (left: L) => U, _fnR: (right: R) => U): U {
    return fnL(this.value)
  }
}

export class Right<L, R> {
  readonly value: R

  constructor(value: R) {
    this.value = value
  }

  isLeft(): this is Left<L, R> {
    return false
  }

  isRight(): this is Right<L, R> {
    return true
  }

  map<U>(fn: (value: R) => U): Either<L, U> {
    return new Right(fn(this.value))
  }

  flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U> {
    return fn(this.value)
  }

  mapLeft<U>(_fn: (value: L) => U): Either<U, R> {
    return new Right(this.value)
  }

  fold<U>(_fnL: (left: L) => U, fnR: (right: R) => U): U {
    return fnR(this.value)
  }
}

export const left = <L, R>(l: L): Either<L, R> => new Left(l)
export const right = <L, R>(r: R): Either<L, R> => new Right(r)

/**
 * Guard class for validation
 */
export interface IGuardResult {
  succeeded: boolean
  message?: string
}

export interface IGuardArgument {
  argument: any
  argumentName: string
}

export type GuardArgumentCollection = IGuardArgument[]

export class Guard {
  public static combine(guardResults: IGuardResult[]): IGuardResult {
    for (let result of guardResults) {
      if (result.succeeded === false) return result
    }

    return { succeeded: true }
  }

  public static greaterThan(minValue: number, actualValue: number): IGuardResult {
    return actualValue > minValue
      ? { succeeded: true }
      : { succeeded: false, message: `Number given {${actualValue}} is not greater than {${minValue}}` }
  }

  public static againstAtLeast(numChars: number, text: string): IGuardResult {
    return text.length >= numChars
      ? { succeeded: true }
      : { succeeded: false, message: `Text is not at least ${numChars} chars.` }
  }

  public static againstAtMost(numChars: number, text: string): IGuardResult {
    return text.length <= numChars
      ? { succeeded: true }
      : { succeeded: false, message: `Text is greater than ${numChars} chars.` }
  }

  public static againstNullOrUndefined(argument: any, argumentName: string): IGuardResult {
    if (argument === null || argument === undefined) {
      return { succeeded: false, message: `${argumentName} is null or undefined` }
    } else {
      return { succeeded: true }
    }
  }

  public static againstNullOrUndefinedBulk(args: GuardArgumentCollection): IGuardResult {
    for (let arg of args) {
      const result = this.againstNullOrUndefined(arg.argument, arg.argumentName)
      if (!result.succeeded) return result
    }

    return { succeeded: true }
  }

  public static isOneOf(value: any, validValues: any[], argumentName: string): IGuardResult {
    let isValid = false
    for (let validValue of validValues) {
      if (value === validValue) {
        isValid = true
      }
    }

    if (isValid) {
      return { succeeded: true }
    } else {
      return {
        succeeded: false,
        message: `${argumentName} isn't oneOf the correct types in ${JSON.stringify(validValues)}. Got "${value}".`
      }
    }
  }

  public static inRange(num: number, min: number, max: number, argumentName: string): IGuardResult {
    const isInRange = num >= min && num <= max
    if (!isInRange) {
      return { succeeded: false, message: `${argumentName} is not within range ${min} to ${max}.` }
    } else {
      return { succeeded: true }
    }
  }

  public static allInRange(numbers: number[], min: number, max: number, argumentName: string): IGuardResult {
    let failingResult: IGuardResult | null = null
    
    for (let num of numbers) {
      const numIsInRangeResult = this.inRange(num, min, max, argumentName)
      if (!numIsInRangeResult.succeeded) failingResult = numIsInRangeResult
    }

    if (failingResult) {
      return { succeeded: false, message: `${argumentName} is not within the range.` }
    } else {
      return { succeeded: true }
    }
  }
}