/**
 * Base Entity class following DDD principles
 * Implements identity equality and domain events
 */

import { DomainEvent } from './DomainEvent'

export abstract class Entity<T> {
  protected readonly _id: T
  private _domainEvents: DomainEvent[] = []

  constructor(id: T) {
    this._id = id
  }

  get id(): T {
    return this._id
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents]
  }

  /**
   * Compare two entities by their identity
   */
  public equals(object?: Entity<T>): boolean {
    if (object === null || object === undefined) {
      return false
    }

    if (this === object) {
      return true
    }

    if (!(object instanceof Entity)) {
      return false
    }

    return this._id === object._id
  }

  /**
   * Add domain event to be dispatched
   */
  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent)
  }

  /**
   * Clear all domain events
   */
  public clearEvents(): void {
    this._domainEvents = []
  }

  /**
   * Mark events as dispatched
   */
  public markEventsAsDispatched(): void {
    this._domainEvents.forEach(event => event.markAsDispatched())
  }
}

/**
 * Unique Entity ID implementation
 */
export class UniqueEntityID {
  private readonly value: string

  constructor(id?: string) {
    this.value = id ?? UniqueEntityID.generate()
  }

  public equals(id?: UniqueEntityID): boolean {
    if (id === null || id === undefined) {
      return false
    }
    
    if (!(id instanceof UniqueEntityID)) {
      return false
    }

    return id.toValue() === this.value
  }

  toString(): string {
    return String(this.value)
  }

  toValue(): string {
    return this.value
  }

  private static generate(): string {
    // In a real application, you might want to use a proper UUID library
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}