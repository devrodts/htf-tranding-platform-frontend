/**
 * Order Book Widget - Real-time Level 2 market data display
 * Enterprise-grade trading component with advanced features
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { cn, formatPrice, formatQuantity, getPriceChangeColor } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Settings, 
  Maximize2, 
  Minimize2,
  Volume2,
  Clock
} from 'lucide-react'
import { useRealTimeData } from '@/hooks/useRealTimeData'

export interface OrderBookLevel {
  price: number
  size: number
  orders: number
  total?: number
}

export interface OrderBookData {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  timestamp: number
  spread: number
  spreadPercent: number
}

export interface OrderBookWidgetProps {
  symbol: string
  depth?: number
  precision?: number
  showSpread?: boolean
  showVolume?: boolean
  showOrders?: boolean
  showTotals?: boolean
  enableTrading?: boolean
  compact?: boolean
  className?: string
  onPriceClick?: (price: number, side: 'bid' | 'ask') => void
  onSizeClick?: (size: number, price: number, side: 'bid' | 'ask') => void
}

interface OrderBookSettings {
  groupBy: number
  depth: number
  showSpread: boolean
  showVolume: boolean
  showOrders: boolean
  showTotals: boolean
  highlightChanges: boolean
  autoScroll: boolean
}

export const OrderBookWidget: React.FC<OrderBookWidgetProps> = ({
  symbol,
  depth = 20,
  precision = 2,
  showSpread = true,
  showVolume = true,
  showOrders = false,
  showTotals = true,
  enableTrading = true,
  compact = false,
  className,
  onPriceClick,
  onSizeClick
}) => {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [settings, setSettings] = useState<OrderBookSettings>({
    groupBy: 0.01,
    depth,
    showSpread,
    showVolume,
    showOrders,
    showTotals,
    highlightChanges: true,
    autoScroll: true
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [priceChanges, setPriceChanges] = useState<Map<number, 'up' | 'down'>>(new Map())

  const containerRef = useRef<HTMLDivElement>(null)
  const { subscribe, unsubscribe, connectionStatus } = useRealTimeData()

  // Subscribe to real-time order book data
  useEffect(() => {
    const handleOrderBookUpdate = (data: any) => {
      if (data.symbol !== symbol) return

      const newOrderBook: OrderBookData = {
        symbol: data.symbol,
        bids: data.data.bids || [],
        asks: data.data.asks || [],
        timestamp: data.timestamp,
        spread: 0,
        spreadPercent: 0
      }

      // Calculate spread
      if (newOrderBook.bids.length > 0 && newOrderBook.asks.length > 0) {
        newOrderBook.spread = newOrderBook.asks[0].price - newOrderBook.bids[0].price
        newOrderBook.spreadPercent = (newOrderBook.spread / newOrderBook.bids[0].price) * 100
      }

      // Calculate running totals
      let bidTotal = 0
      let askTotal = 0

      newOrderBook.bids = newOrderBook.bids.map(bid => {
        bidTotal += bid.size
        return { ...bid, total: bidTotal }
      })

      newOrderBook.asks = newOrderBook.asks.map(ask => {
        askTotal += ask.size
        return { ...ask, total: askTotal }
      })

      // Track price changes for highlighting
      if (settings.highlightChanges && orderBook) {
        const changes = new Map<number, 'up' | 'down'>()
        
        // Check bid changes
        newOrderBook.bids.forEach(bid => {
          const oldBid = orderBook.bids.find(b => Math.abs(b.price - bid.price) < 0.001)
          if (oldBid && oldBid.size !== bid.size) {
            changes.set(bid.price, bid.size > oldBid.size ? 'up' : 'down')
          }
        })

        // Check ask changes
        newOrderBook.asks.forEach(ask => {
          const oldAsk = orderBook.asks.find(a => Math.abs(a.price - ask.price) < 0.001)
          if (oldAsk && oldAsk.size !== ask.size) {
            changes.set(ask.price, ask.size > oldAsk.size ? 'up' : 'down')
          }
        })

        setPriceChanges(changes)
        
        // Clear highlights after animation
        setTimeout(() => setPriceChanges(new Map()), 1000)
      }

      setOrderBook(newOrderBook)
      setLastUpdate(new Date())
    }

    subscribe({
      symbols: [symbol],
      types: ['level2'],
      throttleMs: 100
    }, handleOrderBookUpdate)

    return () => {
      unsubscribe({
        symbols: [symbol],
        types: ['level2']
      }, handleOrderBookUpdate)
    }
  }, [symbol, subscribe, unsubscribe, settings.highlightChanges, orderBook])

  // Group price levels
  const groupedOrderBook = useMemo(() => {
    if (!orderBook || settings.groupBy <= 0) return orderBook

    const groupPrice = (price: number) => 
      Math.floor(price / settings.groupBy) * settings.groupBy

    const groupedBids = new Map<number, OrderBookLevel>()
    const groupedAsks = new Map<number, OrderBookLevel>()

    orderBook.bids.forEach(bid => {
      const groupedPrice = groupPrice(bid.price)
      const existing = groupedBids.get(groupedPrice)
      if (existing) {
        existing.size += bid.size
        existing.orders += bid.orders
      } else {
        groupedBids.set(groupedPrice, { ...bid, price: groupedPrice })
      }
    })

    orderBook.asks.forEach(ask => {
      const groupedPrice = groupPrice(ask.price)
      const existing = groupedAsks.get(groupedPrice)
      if (existing) {
        existing.size += ask.size
        existing.orders += ask.orders
      } else {
        groupedAsks.set(groupedPrice, { ...ask, price: groupedPrice })
      }
    })

    return {
      ...orderBook,
      bids: Array.from(groupedBids.values())
        .sort((a, b) => b.price - a.price)
        .slice(0, settings.depth),
      asks: Array.from(groupedAsks.values())
        .sort((a, b) => a.price - b.price)
        .slice(0, settings.depth)
    }
  }, [orderBook, settings.groupBy, settings.depth])

  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    if (onPriceClick) {
      onPriceClick(price, side)
    }
  }, [onPriceClick])

  const handleSizeClick = useCallback((size: number, price: number, side: 'bid' | 'ask') => {
    if (onSizeClick) {
      onSizeClick(size, price, side)
    }
  }, [onSizeClick])

  const renderOrderBookRow = useCallback((
    level: OrderBookLevel,
    side: 'bid' | 'ask',
    maxSize: number,
    index: number
  ) => {
    const sizePercentage = (level.size / maxSize) * 100
    const hasChange = priceChanges.has(level.price)
    const changeDirection = priceChanges.get(level.price)

    return (
      <div
        key={`${side}-${level.price}-${index}`}
        className={cn(
          'relative flex items-center justify-between px-2 py-0.5 text-xs hover:bg-muted/50 cursor-pointer transition-all duration-200',
          hasChange && changeDirection === 'up' && 'animate-pulse bg-bull-100/20',
          hasChange && changeDirection === 'down' && 'animate-pulse bg-bear-100/20',
          compact ? 'h-5' : 'h-6'
        )}
        onClick={() => handlePriceClick(level.price, side)}
      >
        {/* Size bar background */}
        <div
          className={cn(
            'absolute inset-y-0 transition-all duration-300',
            side === 'bid' ? 'right-0 bg-bull-500/10' : 'left-0 bg-bear-500/10'
          )}
          style={{
            width: `${sizePercentage}%`
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between w-full">
          {side === 'bid' ? (
            <>
              <span
                className="font-mono text-bull-600 hover:text-bull-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePriceClick(level.price, side)
                }}
              >
                {formatPrice(level.price, symbol)}
              </span>
              <div className="flex items-center space-x-2 text-muted-foreground">
                {settings.showOrders && (
                  <span className="text-2xs">{level.orders}</span>
                )}
                <span
                  className="hover:text-foreground cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSizeClick(level.size, level.price, side)
                  }}
                >
                  {formatQuantity(level.size)}
                </span>
                {settings.showTotals && level.total && (
                  <span className="text-2xs opacity-70">
                    {formatQuantity(level.total)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 text-muted-foreground">
                {settings.showTotals && level.total && (
                  <span className="text-2xs opacity-70">
                    {formatQuantity(level.total)}
                  </span>
                )}
                <span
                  className="hover:text-foreground cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSizeClick(level.size, level.price, side)
                  }}
                >
                  {formatQuantity(level.size)}
                </span>
                {settings.showOrders && (
                  <span className="text-2xs">{level.orders}</span>
                )}
              </div>
              <span
                className="font-mono text-bear-600 hover:text-bear-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePriceClick(level.price, side)
                }}
              >
                {formatPrice(level.price, symbol)}
              </span>
            </>
          )}
        </div>
      </div>
    )
  }, [priceChanges, compact, settings, symbol, handlePriceClick, handleSizeClick])

  if (!groupedOrderBook) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground animate-pulse" />
            <p className="mt-2 text-sm text-muted-foreground">
              Loading order book data...
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const maxBidSize = Math.max(...groupedOrderBook.bids.map(b => b.size), 0)
  const maxAskSize = Math.max(...groupedOrderBook.asks.map(a => a.size), 0)
  const maxSize = Math.max(maxBidSize, maxAskSize)

  const bestBid = groupedOrderBook.bids[0]
  const bestAsk = groupedOrderBook.asks[0]

  return (
    <Card className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-sm">Order Book</h3>
          <Badge variant="outline" className="text-xs">
            {symbol}
          </Badge>
          <div className={cn(
            'h-2 w-2 rounded-full',
            connectionStatus === 'connected' ? 'bg-bull-500' : 'bg-bear-500'
          )} />
        </div>
        
        <div className="flex items-center space-x-1">
          {lastUpdate && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      {!compact && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center space-x-4">
            <span>Price</span>
            {settings.showOrders && <span>Orders</span>}
            <span>Size</span>
            {settings.showTotals && <span>Total</span>}
          </div>
          <div className="flex items-center space-x-2">
            {settings.showVolume && <Volume2 className="h-3 w-3" />}
          </div>
        </div>
      )}

      {/* Order Book Content */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-hidden',
          isExpanded ? 'h-96' : 'h-64'
        )}
      >
        {/* Asks (Sell Orders) - Top half, reversed order */}
        <div className="flex-1 flex flex-col-reverse overflow-hidden">
          {groupedOrderBook.asks.map((ask, index) =>
            renderOrderBookRow(ask, 'ask', maxSize, index)
          )}
        </div>

        {/* Spread Display */}
        {settings.showSpread && bestBid && bestAsk && (
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-y">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Spread:</span>
              <span className="text-xs font-mono">
                {formatPrice(groupedOrderBook.spread, symbol)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({groupedOrderBook.spreadPercent.toFixed(3)}%)
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <span className={getPriceChangeColor(bestAsk.price - bestBid.price)}>
                {bestAsk.price > bestBid.price ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
              </span>
            </div>
          </div>
        )}

        {/* Bids (Buy Orders) - Bottom half */}
        <div className="flex-1 overflow-hidden">
          {groupedOrderBook.bids.map((bid, index) =>
            renderOrderBookRow(bid, 'bid', maxSize, index)
          )}
        </div>
      </div>

      {/* Footer with quick actions */}
      {enableTrading && (
        <div className="flex items-center justify-between p-3 border-t bg-muted/30">
          <div className="flex items-center space-x-2">
            {bestBid && (
              <Button
                variant="buy-outline"
                size="trading-xs"
                onClick={() => handlePriceClick(bestBid.price, 'bid')}
              >
                Buy {formatPrice(bestBid.price, symbol)}
              </Button>
            )}
            {bestAsk && (
              <Button
                variant="sell-outline"
                size="trading-xs"
                onClick={() => handlePriceClick(bestAsk.price, 'ask')}
              >
                Sell {formatPrice(bestAsk.price, symbol)}
              </Button>
            )}
          </div>
          
          <Button variant="ghost" size="icon-sm">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Card>
  )
}

export default OrderBookWidget