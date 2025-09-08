/**
 * Order Entity Tests - Following TDD principles
 */

import { Order, OrderType, OrderSide, OrderStatus, TimeInForce } from '../Order'
import { Symbol, Price, Quantity } from '@/shared/domain/ValueObject'
import { UniqueEntityID } from '@/shared/domain/Entity'

describe('Order Entity', () => {
  describe('Factory Methods', () => {
    describe('createLimitOrder', () => {
      it('should create a valid limit order', () => {
        // Arrange
        const symbol = Symbol.create('AAPL')
        const quantity = Quantity.create(100)
        const price = Price.create(150.00)

        // Act
        const result = Order.createLimitOrder(symbol, OrderSide.BUY, quantity, price)

        // Assert
        expect(result.isSuccess).toBe(true)
        const order = result.getValue()
        expect(order.symbol).toEqual(symbol)
        expect(order.side).toBe(OrderSide.BUY)
        expect(order.type).toBe(OrderType.LIMIT)
        expect(order.quantity).toEqual(quantity)
        expect(order.price).toEqual(price)
        expect(order.status).toBe(OrderStatus.PENDING)
        expect(order.filledQuantity.value).toBe(0)
        expect(order.remainingQuantity).toEqual(quantity)
        expect(order.domainEvents).toHaveLength(1)
      })

      it('should create limit order with custom time in force', () => {
        // Arrange
        const symbol = Symbol.create('AAPL')
        const quantity = Quantity.create(100)
        const price = Price.create(150.00)

        // Act
        const result = Order.createLimitOrder(
          symbol, 
          OrderSide.BUY, 
          quantity, 
          price, 
          TimeInForce.IOC
        )

        // Assert
        expect(result.isSuccess).toBe(true)
        const order = result.getValue()
        expect(order.timeInForce).toBe(TimeInForce.IOC)
      })

      it('should create limit order with client order ID', () => {
        // Arrange
        const symbol = Symbol.create('AAPL')
        const quantity = Quantity.create(100)
        const price = Price.create(150.00)
        const clientOrderId = 'client-123'

        // Act
        const result = Order.createLimitOrder(
          symbol, 
          OrderSide.BUY, 
          quantity, 
          price, 
          TimeInForce.GTC,
          clientOrderId
        )

        // Assert
        expect(result.isSuccess).toBe(true)
        const order = result.getValue()
        expect(order.clientOrderId).toBe(clientOrderId)
      })
    })

    describe('createMarketOrder', () => {
      it('should create a valid market order', () => {
        // Arrange
        const symbol = Symbol.create('AAPL')
        const quantity = Quantity.create(100)

        // Act
        const result = Order.createMarketOrder(symbol, OrderSide.SELL, quantity)

        // Assert
        expect(result.isSuccess).toBe(true)
        const order = result.getValue()
        expect(order.symbol).toEqual(symbol)
        expect(order.side).toBe(OrderSide.SELL)
        expect(order.type).toBe(OrderType.MARKET)
        expect(order.quantity).toEqual(quantity)
        expect(order.price).toBeUndefined()
        expect(order.status).toBe(OrderStatus.PENDING)
        expect(order.timeInForce).toBe(TimeInForce.IOC)
      })
    })

    describe('createStopLossOrder', () => {
      it('should create a valid stop loss order', () => {
        // Arrange
        const symbol = Symbol.create('AAPL')
        const quantity = Quantity.create(100)
        const stopPrice = Price.create(140.00)

        // Act
        const result = Order.createStopLossOrder(symbol, OrderSide.SELL, quantity, stopPrice)

        // Assert
        expect(result.isSuccess).toBe(true)
        const order = result.getValue()
        expect(order.symbol).toEqual(symbol)
        expect(order.side).toBe(OrderSide.SELL)
        expect(order.type).toBe(OrderType.STOP_LOSS)
        expect(order.quantity).toEqual(quantity)
        expect(order.stopPrice).toEqual(stopPrice)
        expect(order.status).toBe(OrderStatus.PENDING)
      })
    })

    describe('createIcebergOrder', () => {
      it('should create a valid iceberg order', () => {
        // Arrange
        const symbol = Symbol.create('AAPL')
        const quantity = Quantity.create(1000)
        const price = Price.create(150.00)
        const visibleQuantity = Quantity.create(100)

        // Act
        const result = Order.createIcebergOrder(
          symbol, 
          OrderSide.BUY, 
          quantity, 
          price, 
          visibleQuantity
        )

        // Assert
        expect(result.isSuccess).toBe(true)
        const order = result.getValue()
        expect(order.type).toBe(OrderType.ICEBERG)
        expect(order.icebergVisibleQuantity).toEqual(visibleQuantity)
      })

      it('should fail when visible quantity exceeds total quantity', () => {
        // Arrange
        const symbol = Symbol.create('AAPL')
        const quantity = Quantity.create(100)
        const price = Price.create(150.00)
        const visibleQuantity = Quantity.create(200)

        // Act
        const result = Order.createIcebergOrder(
          symbol, 
          OrderSide.BUY, 
          quantity, 
          price, 
          visibleQuantity
        )

        // Assert
        expect(result.isFailure).toBe(true)
        expect(result.getErrorValue()).toBe('Visible quantity cannot be greater than total quantity')
      })
    })
  })

  describe('Business Logic', () => {
    let order: Order

    beforeEach(() => {
      const symbol = Symbol.create('AAPL')
      const quantity = Quantity.create(100)
      const price = Price.create(150.00)
      const result = Order.createLimitOrder(symbol, OrderSide.BUY, quantity, price)
      order = result.getValue()
      // Clear initial domain event
      order.clearEvents()
    })

    describe('canBeCancelled', () => {
      it('should return true for NEW orders', () => {
        // Act & Assert
        expect(order.canBeCancelled()).toBe(true)
      })

      it('should return true for PARTIALLY_FILLED orders', () => {
        // Arrange
        const fillQuantity = Quantity.create(50)
        const fillPrice = Price.create(150.00)
        order.fill(fillQuantity, fillPrice)

        // Act & Assert
        expect(order.canBeCancelled()).toBe(true)
      })

      it('should return false for FILLED orders', () => {
        // Arrange
        const fillQuantity = Quantity.create(100)
        const fillPrice = Price.create(150.00)
        order.fill(fillQuantity, fillPrice)

        // Act & Assert
        expect(order.canBeCancelled()).toBe(false)
      })

      it('should return false for CANCELLED orders', () => {
        // Arrange
        order.cancel()

        // Act & Assert
        expect(order.canBeCancelled()).toBe(false)
      })
    })

    describe('fill', () => {
      it('should partially fill order correctly', () => {
        // Arrange
        const fillQuantity = Quantity.create(50)
        const fillPrice = Price.create(151.00)

        // Act
        const result = order.fill(fillQuantity, fillPrice)

        // Assert
        expect(result.isSuccess).toBe(true)
        expect(order.filledQuantity.value).toBe(50)
        expect(order.remainingQuantity.value).toBe(50)
        expect(order.status).toBe(OrderStatus.PARTIALLY_FILLED)
        expect(order.averageFillPrice).toEqual(fillPrice)
        expect(order.getFillPercentage()).toBe(50)
        expect(order.domainEvents).toHaveLength(1)
      })

      it('should completely fill order correctly', () => {
        // Arrange
        const fillQuantity = Quantity.create(100)
        const fillPrice = Price.create(151.00)

        // Act
        const result = order.fill(fillQuantity, fillPrice)

        // Assert
        expect(result.isSuccess).toBe(true)
        expect(order.filledQuantity.value).toBe(100)
        expect(order.remainingQuantity.value).toBe(0)
        expect(order.status).toBe(OrderStatus.FILLED)
        expect(order.averageFillPrice).toEqual(fillPrice)
        expect(order.getFillPercentage()).toBe(100)
      })

      it('should calculate average fill price correctly for multiple fills', () => {
        // Arrange
        const firstFillQuantity = Quantity.create(30)
        const firstFillPrice = Price.create(150.00)
        const secondFillQuantity = Quantity.create(70)
        const secondFillPrice = Price.create(152.00)

        // Act
        order.fill(firstFillQuantity, firstFillPrice)
        order.fill(secondFillQuantity, secondFillPrice)

        // Assert
        const expectedAvgPrice = (30 * 150.00 + 70 * 152.00) / 100
        expect(order.averageFillPrice?.value).toBe(expectedAvgPrice)
      })

      it('should fail when fill quantity exceeds remaining quantity', () => {
        // Arrange
        const fillQuantity = Quantity.create(150) // More than order quantity

        // Act
        const result = order.fill(fillQuantity, Price.create(150.00))

        // Assert
        expect(result.isFailure).toBe(true)
        expect(result.getErrorValue()).toBe('Fill quantity exceeds remaining quantity')
      })

      it('should fail when order is not active', () => {
        // Arrange
        order.cancel()
        const fillQuantity = Quantity.create(50)

        // Act
        const result = order.fill(fillQuantity, Price.create(150.00))

        // Assert
        expect(result.isFailure).toBe(true)
        expect(result.getErrorValue()).toBe('Order is not active')
      })
    })

    describe('cancel', () => {
      it('should cancel order successfully', () => {
        // Act
        const result = order.cancel()

        // Assert
        expect(result.isSuccess).toBe(true)
        expect(order.status).toBe(OrderStatus.CANCELLED)
        expect(order.domainEvents).toHaveLength(1)
      })

      it('should fail to cancel filled order', () => {
        // Arrange
        order.fill(Quantity.create(100), Price.create(150.00))

        // Act
        const result = order.cancel()

        // Assert
        expect(result.isFailure).toBe(true)
        expect(result.getErrorValue()).toBe('Order cannot be cancelled in current status')
      })
    })

    describe('modifyPrice', () => {
      it('should modify price successfully', () => {
        // Arrange
        const newPrice = Price.create(152.00)

        // Act
        const result = order.modifyPrice(newPrice)

        // Assert
        expect(result.isSuccess).toBe(true)
        expect(order.price).toEqual(newPrice)
        expect(order.domainEvents).toHaveLength(1)
      })

      it('should fail to modify price for market orders', () => {
        // Arrange
        const marketOrderResult = Order.createMarketOrder(
          Symbol.create('AAPL'),
          OrderSide.BUY,
          Quantity.create(100)
        )
        const marketOrder = marketOrderResult.getValue()
        marketOrder.clearEvents()

        // Act
        const result = marketOrder.modifyPrice(Price.create(150.00))

        // Assert
        expect(result.isFailure).toBe(true)
        expect(result.getErrorValue()).toBe('Market orders cannot have price modified')
      })

      it('should fail to modify price for cancelled orders', () => {
        // Arrange
        order.cancel()

        // Act
        const result = order.modifyPrice(Price.create(152.00))

        // Assert
        expect(result.isFailure).toBe(true)
        expect(result.getErrorValue()).toBe('Order cannot be modified in current status')
      })
    })

    describe('modifyQuantity', () => {
      it('should modify quantity successfully', () => {
        // Arrange
        const newQuantity = Quantity.create(200)

        // Act
        const result = order.modifyQuantity(newQuantity)

        // Assert
        expect(result.isSuccess).toBe(true)
        expect(order.quantity).toEqual(newQuantity)
        expect(order.remainingQuantity).toEqual(newQuantity)
        expect(order.domainEvents).toHaveLength(1)
      })

      it('should adjust remaining quantity correctly after partial fill', () => {
        // Arrange
        order.fill(Quantity.create(30), Price.create(150.00))
        order.clearEvents()
        const newQuantity = Quantity.create(150)

        // Act
        const result = order.modifyQuantity(newQuantity)

        // Assert
        expect(result.isSuccess).toBe(true)
        expect(order.quantity).toEqual(newQuantity)
        expect(order.remainingQuantity.value).toBe(120) // 150 - 30 filled
      })

      it('should fail when new quantity is less than filled quantity', () => {
        // Arrange
        order.fill(Quantity.create(50), Price.create(150.00))
        order.clearEvents()

        // Act
        const result = order.modifyQuantity(Quantity.create(30))

        // Assert
        expect(result.isFailure).toBe(true)
        expect(result.getErrorValue()).toBe('New quantity cannot be less than filled quantity')
      })
    })
  })

  describe('Value Calculations', () => {
    let order: Order

    beforeEach(() => {
      const symbol = Symbol.create('AAPL')
      const quantity = Quantity.create(100)
      const price = Price.create(150.00)
      const result = Order.createLimitOrder(symbol, OrderSide.BUY, quantity, price)
      order = result.getValue()
    })

    describe('getNotionalValue', () => {
      it('should calculate notional value correctly', () => {
        // Act
        const notionalValue = order.getNotionalValue()

        // Assert
        expect(notionalValue?.amount).toBe(15000) // 100 * 150.00
        expect(notionalValue?.currency).toBe('USD')
      })

      it('should return undefined for market orders', () => {
        // Arrange
        const marketOrderResult = Order.createMarketOrder(
          Symbol.create('AAPL'),
          OrderSide.BUY,
          Quantity.create(100)
        )
        const marketOrder = marketOrderResult.getValue()

        // Act
        const notionalValue = marketOrder.getNotionalValue()

        // Assert
        expect(notionalValue).toBeUndefined()
      })
    })

    describe('getFillPercentage', () => {
      it('should return 0 for unfilled order', () => {
        // Act & Assert
        expect(order.getFillPercentage()).toBe(0)
      })

      it('should calculate fill percentage correctly', () => {
        // Arrange
        order.fill(Quantity.create(25), Price.create(150.00))

        // Act & Assert
        expect(order.getFillPercentage()).toBe(25)
      })

      it('should return 100 for fully filled order', () => {
        // Arrange
        order.fill(Quantity.create(100), Price.create(150.00))

        // Act & Assert
        expect(order.getFillPercentage()).toBe(100)
      })

      it('should handle zero quantity orders', () => {
        // Arrange
        const zeroQuantityResult = Order.createLimitOrder(
          Symbol.create('AAPL'),
          OrderSide.BUY,
          Quantity.create(0),
          Price.create(150.00)
        )
        const zeroQuantityOrder = zeroQuantityResult.getValue()

        // Act & Assert
        expect(zeroQuantityOrder.getFillPercentage()).toBe(0)
      })
    })
  })

  describe('Status Queries', () => {
    let order: Order

    beforeEach(() => {
      const symbol = Symbol.create('AAPL')
      const quantity = Quantity.create(100)
      const price = Price.create(150.00)
      const result = Order.createLimitOrder(symbol, OrderSide.BUY, quantity, price)
      order = result.getValue()
    })

    it('should identify active orders correctly', () => {
      expect(order.isActive()).toBe(true)
      
      order.fill(Quantity.create(50), Price.create(150.00))
      expect(order.isActive()).toBe(true)
      
      order.fill(Quantity.create(50), Price.create(150.00))
      expect(order.isActive()).toBe(false)
    })

    it('should identify filled orders correctly', () => {
      expect(order.isFilled()).toBe(false)
      
      order.fill(Quantity.create(100), Price.create(150.00))
      expect(order.isFilled()).toBe(true)
    })

    it('should identify partially filled orders correctly', () => {
      expect(order.isPartiallyFilled()).toBe(false)
      
      order.fill(Quantity.create(50), Price.create(150.00))
      expect(order.isPartiallyFilled()).toBe(true)
      
      order.fill(Quantity.create(50), Price.create(150.00))
      expect(order.isPartiallyFilled()).toBe(false)
    })
  })

  describe('Persistence', () => {
    it('should convert to persistence format correctly', () => {
      // Arrange
      const symbol = Symbol.create('AAPL')
      const quantity = Quantity.create(100)
      const price = Price.create(150.00)
      const result = Order.createLimitOrder(symbol, OrderSide.BUY, quantity, price)
      const order = result.getValue()

      // Act
      const persistence = order.toPersistence()

      // Assert
      expect(persistence.symbol).toBe('AAPL')
      expect(persistence.side).toBe(OrderSide.BUY)
      expect(persistence.type).toBe(OrderType.LIMIT)
      expect(persistence.quantity).toBe(100)
      expect(persistence.price).toBe(150.00)
      expect(persistence.status).toBe(OrderStatus.PENDING)
      expect(persistence.filledQuantity).toBe(0)
      expect(persistence.remainingQuantity).toBe(100)
      expect(persistence.createdAt).toBeInstanceOf(Date)
      expect(persistence.updatedAt).toBeInstanceOf(Date)
    })

    it('should reconstruct from persistence correctly', () => {
      // Arrange
      const persistenceData = {
        id: 'order-123',
        symbol: Symbol.create('AAPL'),
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: Quantity.create(100),
        price: Price.create(150.00),
        timeInForce: TimeInForce.GTC,
        status: OrderStatus.NEW,
        filledQuantity: Quantity.create(25),
        remainingQuantity: Quantity.create(75),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Act
      const order = Order.fromPersistence(persistenceData)

      // Assert
      expect(order.id.toString()).toBe('order-123')
      expect(order.symbol).toEqual(persistenceData.symbol)
      expect(order.side).toBe(persistenceData.side)
      expect(order.type).toBe(persistenceData.type)
      expect(order.quantity).toEqual(persistenceData.quantity)
      expect(order.price).toEqual(persistenceData.price)
      expect(order.filledQuantity).toEqual(persistenceData.filledQuantity)
      expect(order.remainingQuantity).toEqual(persistenceData.remainingQuantity)
    })
  })

  describe('Domain Events', () => {
    it('should raise OrderCreatedEvent on creation', () => {
      // Arrange & Act
      const result = Order.createLimitOrder(
        Symbol.create('AAPL'),
        OrderSide.BUY,
        Quantity.create(100),
        Price.create(150.00)
      )
      const order = result.getValue()

      // Assert
      expect(order.domainEvents).toHaveLength(1)
      expect(order.domainEvents[0].constructor.name).toBe('OrderCreatedEvent')
    })

    it('should raise OrderUpdatedEvent on fill', () => {
      // Arrange
      const result = Order.createLimitOrder(
        Symbol.create('AAPL'),
        OrderSide.BUY,
        Quantity.create(100),
        Price.create(150.00)
      )
      const order = result.getValue()
      order.clearEvents()

      // Act
      order.fill(Quantity.create(50), Price.create(150.00))

      // Assert
      expect(order.domainEvents).toHaveLength(1)
      expect(order.domainEvents[0].constructor.name).toBe('OrderUpdatedEvent')
    })

    it('should raise OrderCancelledEvent on cancellation', () => {
      // Arrange
      const result = Order.createLimitOrder(
        Symbol.create('AAPL'),
        OrderSide.BUY,
        Quantity.create(100),
        Price.create(150.00)
      )
      const order = result.getValue()
      order.clearEvents()

      // Act
      order.cancel()

      // Assert
      expect(order.domainEvents).toHaveLength(1)
      expect(order.domainEvents[0].constructor.name).toBe('OrderCancelledEvent')
    })
  })
})