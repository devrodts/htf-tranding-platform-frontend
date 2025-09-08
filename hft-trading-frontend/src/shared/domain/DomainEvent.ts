/**
 * Domain Event base class following DDD principles
 */

import { UniqueEntityID } from './Entity'

export interface IDomainEvent {
  dateTimeOccurred: Date
  getAggregateId(): UniqueEntityID
  markAsDispatched(): void
  wasDispatched(): boolean
}

export abstract class DomainEvent implements IDomainEvent {
  public dateTimeOccurred: Date
  private _dispatched = false

  constructor(
    private aggregateId: UniqueEntityID,
    dateTimeOccurred?: Date
  ) {
    this.dateTimeOccurred = dateTimeOccurred ?? new Date()
  }

  getAggregateId(): UniqueEntityID {
    return this.aggregateId
  }

  markAsDispatched(): void {
    this._dispatched = true
  }

  wasDispatched(): boolean {
    return this._dispatched
  }
}

/**
 * Domain Event Dispatcher for handling events
 */
export interface IDomainEventHandler<TDomainEvent extends DomainEvent> {
  setupSubscriptions(): void
  handle(event: TDomainEvent): Promise<void>
}

export class DomainEventDispatcher {
  private static _instance: DomainEventDispatcher
  private _handlers: Map<string, IDomainEventHandler<any>[]> = new Map()

  static get instance(): DomainEventDispatcher {
    if (!DomainEventDispatcher._instance) {
      DomainEventDispatcher._instance = new DomainEventDispatcher()
    }
    return DomainEventDispatcher._instance
  }

  register<TDomainEvent extends DomainEvent>(
    eventClassName: string,
    handler: IDomainEventHandler<TDomainEvent>
  ): void {
    if (!this._handlers.has(eventClassName)) {
      this._handlers.set(eventClassName, [])
    }
    this._handlers.get(eventClassName)!.push(handler)
  }

  clearHandlers(): void {
    this._handlers.clear()
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const eventClassName = event.constructor.name
    const handlers = this._handlers.get(eventClassName) || []

    for (const handler of handlers) {
      await handler.handle(event)
    }

    event.markAsDispatched()
  }

  async dispatchEventsForAggregate(id: UniqueEntityID, events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      if (event.getAggregateId().equals(id) && !event.wasDispatched()) {
        await this.dispatch(event)
      }
    }
  }
}