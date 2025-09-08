/**
 * Order Domain Events following DDD principles
 */

import { DomainEvent } from '@/shared/domain/DomainEvent'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Order } from '../entities/Order'

/**
 * Order Created Event
 */
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    public readonly order: Order,
    dateTimeOccurred?: Date
  ) {
    super(aggregateId, dateTimeOccurred)
  }
}

/**
 * Order Updated Event
 */
export class OrderUpdatedEvent extends DomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    public readonly order: Order,
    dateTimeOccurred?: Date
  ) {
    super(aggregateId, dateTimeOccurred)
  }
}

/**
 * Order Cancelled Event
 */
export class OrderCancelledEvent extends DomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    public readonly order: Order,
    dateTimeOccurred?: Date
  ) {
    super(aggregateId, dateTimeOccurred)
  }
}

/**
 * Order Filled Event
 */
export class OrderFilledEvent extends DomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    public readonly order: Order,
    public readonly fillPrice: number,
    public readonly fillQuantity: number,
    dateTimeOccurred?: Date
  ) {
    super(aggregateId, dateTimeOccurred)
  }
}

/**
 * Order Rejected Event
 */
export class OrderRejectedEvent extends DomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    public readonly order: Order,
    public readonly rejectionReason: string,
    dateTimeOccurred?: Date
  ) {
    super(aggregateId, dateTimeOccurred)
  }
}

/**
 * Order Expired Event
 */
export class OrderExpiredEvent extends DomainEvent {
  constructor(
    aggregateId: UniqueEntityID,
    public readonly order: Order,
    dateTimeOccurred?: Date
  ) {
    super(aggregateId, dateTimeOccurred)
  }
}