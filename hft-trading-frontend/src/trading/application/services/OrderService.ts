/**
 * Order Service - Application layer service following SOLID principles
 */

import { Result } from '@/shared/domain/Result'
import { Order, OrderType, OrderSide, TimeInForce, OrderStatus } from '@/trading/domain/entities/Order'
import { Symbol, Price, Quantity } from '@/shared/domain/ValueObject'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { ViewTradingSDK } from '@/trading/infrastructure/sdk/ViewTradingSDK'
import { DomainEventDispatcher } from '@/shared/domain/DomainEvent'

export interface IOrderRepository {
  save(order: Order): Promise<Result<void>>
  findById(id: UniqueEntityID): Promise<Result<Order | null>>
  findByClientOrderId(clientOrderId: string): Promise<Result<Order | null>>
  findActiveOrders(): Promise<Result<Order[]>>
  findOrdersBySymbol(symbol: Symbol): Promise<Result<Order[]>>
  update(order: Order): Promise<Result<void>>
  delete(id: UniqueEntityID): Promise<Result<void>>
}

export interface IOrderValidationService {
  validateOrderCreation(order: Order): Promise<Result<void>>
  validateOrderCancellation(orderId: UniqueEntityID): Promise<Result<void>>
  validateOrderModification(orderId: UniqueEntityID, modifications: any): Promise<Result<void>>
}

export interface IRiskManagementService {
  checkPreTradeRisk(order: Order): Promise<Result<void>>
  checkPostTradeRisk(order: Order): Promise<Result<void>>
  validatePositionLimits(order: Order): Promise<Result<void>>
  validateOrderLimits(order: Order): Promise<Result<void>>
}

export interface CreateOrderRequest {
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  timeInForce?: TimeInForce
  clientOrderId?: string
  icebergVisibleQuantity?: number
  pegOffset?: number
}

export interface ModifyOrderRequest {
  orderId: string
  price?: number
  quantity?: number
}

export interface OrderServiceResult {
  orderId: string
  status: OrderStatus
  message?: string
}

export class OrderService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly validationService: IOrderValidationService,
    private readonly riskService: IRiskManagementService,
    private readonly tradingSDK: ViewTradingSDK,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  /**
   * Create and submit a new order
   */
  public async createOrder(request: CreateOrderRequest): Promise<Result<OrderServiceResult>> {
    try {
      // 1. Create domain objects
      const symbol = Symbol.create(request.symbol)
      const quantity = Quantity.create(request.quantity)
      const price = request.price ? Price.create(request.price) : undefined
      const stopPrice = request.stopPrice ? Price.create(request.stopPrice) : undefined

      // 2. Create order based on type
      const orderResult = await this.createOrderByType(
        request.type,
        symbol,
        request.side,
        quantity,
        price,
        stopPrice,
        request.timeInForce || TimeInForce.GTC,
        request.clientOrderId,
        request.icebergVisibleQuantity,
        request.pegOffset
      )

      if (orderResult.isFailure) {
        return Result.fail(orderResult.getErrorValue())
      }

      const order = orderResult.getValue()

      // 3. Validate order
      const validationResult = await this.validationService.validateOrderCreation(order)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.getErrorValue())
      }

      // 4. Check pre-trade risk
      const riskResult = await this.riskService.checkPreTradeRisk(order)
      if (riskResult.isFailure) {
        return Result.fail(riskResult.getErrorValue())
      }

      // 5. Save order to repository
      const saveResult = await this.orderRepository.save(order)
      if (saveResult.isFailure) {
        return Result.fail(saveResult.getErrorValue())
      }

      // 6. Submit order to trading system
      const submissionResult = await this.tradingSDK.submitOrder(order)
      if (submissionResult.isFailure) {
        // Mark order as rejected and save
        order.cancel()
        await this.orderRepository.update(order)
        return Result.fail(submissionResult.getErrorValue())
      }

      const response = submissionResult.getValue()

      // 7. Dispatch domain events
      await this.eventDispatcher.dispatchEventsForAggregate(order.id, order.domainEvents)
      order.markEventsAsDispatched()

      return Result.ok({
        orderId: response.orderId,
        status: order.status,
        message: response.message
      })

    } catch (error) {
      return Result.fail(`Order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cancel an existing order
   */
  public async cancelOrder(orderId: string): Promise<Result<OrderServiceResult>> {
    try {
      // 1. Find order
      const orderResult = await this.orderRepository.findById(new UniqueEntityID(orderId))
      if (orderResult.isFailure) {
        return Result.fail(orderResult.getErrorValue())
      }

      const order = orderResult.getValue()
      if (!order) {
        return Result.fail('Order not found')
      }

      // 2. Validate cancellation
      const validationResult = await this.validationService.validateOrderCancellation(order.id)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.getErrorValue())
      }

      // 3. Check if order can be cancelled
      if (!order.canBeCancelled()) {
        return Result.fail('Order cannot be cancelled in current status')
      }

      // 4. Cancel order in trading system
      const cancellationResult = await this.tradingSDK.cancelOrder(orderId)
      if (cancellationResult.isFailure) {
        return Result.fail(cancellationResult.getErrorValue())
      }

      // 5. Update order status
      const cancelResult = order.cancel()
      if (cancelResult.isFailure) {
        return Result.fail(cancelResult.getErrorValue())
      }

      // 6. Save updated order
      const saveResult = await this.orderRepository.update(order)
      if (saveResult.isFailure) {
        return Result.fail(saveResult.getErrorValue())
      }

      // 7. Dispatch domain events
      await this.eventDispatcher.dispatchEventsForAggregate(order.id, order.domainEvents)
      order.markEventsAsDispatched()

      const response = cancellationResult.getValue()

      return Result.ok({
        orderId: response.orderId,
        status: order.status,
        message: response.message
      })

    } catch (error) {
      return Result.fail(`Order cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Modify an existing order
   */
  public async modifyOrder(request: ModifyOrderRequest): Promise<Result<OrderServiceResult>> {
    try {
      // 1. Find order
      const orderResult = await this.orderRepository.findById(new UniqueEntityID(request.orderId))
      if (orderResult.isFailure) {
        return Result.fail(orderResult.getErrorValue())
      }

      const order = orderResult.getValue()
      if (!order) {
        return Result.fail('Order not found')
      }

      // 2. Validate modification
      const validationResult = await this.validationService.validateOrderModification(order.id, request)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.getErrorValue())
      }

      // 3. Check if order can be modified
      if (!order.canBeModified()) {
        return Result.fail('Order cannot be modified in current status')
      }

      // 4. Apply modifications
      if (request.price !== undefined) {
        const newPrice = Price.create(request.price)
        const priceResult = order.modifyPrice(newPrice)
        if (priceResult.isFailure) {
          return Result.fail(priceResult.getErrorValue())
        }
      }

      if (request.quantity !== undefined) {
        const newQuantity = Quantity.create(request.quantity)
        const quantityResult = order.modifyQuantity(newQuantity)
        if (quantityResult.isFailure) {
          return Result.fail(quantityResult.getErrorValue())
        }
      }

      // 5. Check post-modification risk
      const riskResult = await this.riskService.checkPreTradeRisk(order)
      if (riskResult.isFailure) {
        return Result.fail(riskResult.getErrorValue())
      }

      // 6. Save updated order
      const saveResult = await this.orderRepository.update(order)
      if (saveResult.isFailure) {
        return Result.fail(saveResult.getErrorValue())
      }

      // 7. Dispatch domain events
      await this.eventDispatcher.dispatchEventsForAggregate(order.id, order.domainEvents)
      order.markEventsAsDispatched()

      return Result.ok({
        orderId: request.orderId,
        status: order.status,
        message: 'Order modified successfully'
      })

    } catch (error) {
      return Result.fail(`Order modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get order by ID
   */
  public async getOrder(orderId: string): Promise<Result<Order | null>> {
    return await this.orderRepository.findById(new UniqueEntityID(orderId))
  }

  /**
   * Get orders by symbol
   */
  public async getOrdersBySymbol(symbol: string): Promise<Result<Order[]>> {
    const symbolVO = Symbol.create(symbol)
    return await this.orderRepository.findOrdersBySymbol(symbolVO)
  }

  /**
   * Get all active orders
   */
  public async getActiveOrders(): Promise<Result<Order[]>> {
    return await this.orderRepository.findActiveOrders()
  }

  /**
   * Handle order fill from external source
   */
  public async handleOrderFill(
    orderId: string,
    fillPrice: number,
    fillQuantity: number
  ): Promise<Result<void>> {
    try {
      // 1. Find order
      const orderResult = await this.orderRepository.findById(new UniqueEntityID(orderId))
      if (orderResult.isFailure) {
        return Result.fail(orderResult.getErrorValue())
      }

      const order = orderResult.getValue()
      if (!order) {
        return Result.fail('Order not found')
      }

      // 2. Apply fill
      const price = Price.create(fillPrice)
      const quantity = Quantity.create(fillQuantity)
      
      const fillResult = order.fill(quantity, price)
      if (fillResult.isFailure) {
        return Result.fail(fillResult.getErrorValue())
      }

      // 3. Check post-trade risk
      const riskResult = await this.riskService.checkPostTradeRisk(order)
      if (riskResult.isFailure) {
        return Result.fail(riskResult.getErrorValue())
      }

      // 4. Save updated order
      const saveResult = await this.orderRepository.update(order)
      if (saveResult.isFailure) {
        return Result.fail(saveResult.getErrorValue())
      }

      // 5. Dispatch domain events
      await this.eventDispatcher.dispatchEventsForAggregate(order.id, order.domainEvents)
      order.markEventsAsDispatched()

      return Result.ok()

    } catch (error) {
      return Result.fail(`Order fill handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Private helper methods
   */
  private async createOrderByType(
    type: OrderType,
    symbol: Symbol,
    side: OrderSide,
    quantity: Quantity,
    price?: Price,
    stopPrice?: Price,
    timeInForce: TimeInForce = TimeInForce.GTC,
    clientOrderId?: string,
    icebergVisibleQuantity?: number,
    pegOffset?: number
  ): Promise<Result<Order>> {
    switch (type) {
      case OrderType.LIMIT:
        if (!price) {
          return Result.fail('Price is required for limit orders')
        }
        return Order.createLimitOrder(symbol, side, quantity, price, timeInForce, clientOrderId)

      case OrderType.MARKET:
        return Order.createMarketOrder(symbol, side, quantity, timeInForce, clientOrderId)

      case OrderType.STOP_LOSS:
        if (!stopPrice) {
          return Result.fail('Stop price is required for stop loss orders')
        }
        return Order.createStopLossOrder(symbol, side, quantity, stopPrice, timeInForce, clientOrderId)

      case OrderType.ICEBERG:
        if (!price || !icebergVisibleQuantity) {
          return Result.fail('Price and visible quantity are required for iceberg orders')
        }
        const visibleQuantity = Quantity.create(icebergVisibleQuantity)
        return Order.createIcebergOrder(symbol, side, quantity, price, visibleQuantity, timeInForce, clientOrderId)

      default:
        return Result.fail(`Order type ${type} is not yet supported`)
    }
  }

  /**
   * Bulk operations
   */
  public async createBulkOrders(requests: CreateOrderRequest[]): Promise<Result<OrderServiceResult[]>> {
    const results: OrderServiceResult[] = []
    const errors: string[] = []

    for (const request of requests) {
      const result = await this.createOrder(request)
      if (result.isSuccess) {
        results.push(result.getValue())
      } else {
        errors.push(`Order ${request.clientOrderId || 'unknown'}: ${result.getErrorValue()}`)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return Result.fail(`All orders failed: ${errors.join('; ')}`)
    }

    return Result.ok(results)
  }

  public async cancelAllOrders(symbol?: string): Promise<Result<OrderServiceResult[]>> {
    try {
      const activeOrdersResult = symbol 
        ? await this.getOrdersBySymbol(symbol)
        : await this.getActiveOrders()

      if (activeOrdersResult.isFailure) {
        return Result.fail(activeOrdersResult.getErrorValue())
      }

      const activeOrders = activeOrdersResult.getValue()
      const results: OrderServiceResult[] = []
      const errors: string[] = []

      for (const order of activeOrders) {
        if (order.canBeCancelled()) {
          const result = await this.cancelOrder(order.id.toString())
          if (result.isSuccess) {
            results.push(result.getValue())
          } else {
            errors.push(`Order ${order.id.toString()}: ${result.getErrorValue()}`)
          }
        }
      }

      return Result.ok(results)

    } catch (error) {
      return Result.fail(`Bulk cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}