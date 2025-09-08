/**
 * Dashboard Content - Main trading dashboard content
 */

'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import OrderBookWidget from '@/components/trading/OrderBookWidget'
import { useRealTimeData, useMarketData, useConnectionStatus } from '@/hooks/useRealTimeData'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  BarChart3, 
  PieChart, 
  Search,
  Plus,
  Minus,
  RefreshCw
} from 'lucide-react'

// Loading components
const LoadingWidget = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <span>{title}</span>
        <Activity className="h-4 w-4 animate-pulse" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

// Market Overview Component
const MarketOverview: React.FC = () => {
  const marketData = useMarketData()
  const connectionStatus = useConnectionStatus()

  const watchListSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX']

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Market Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {connectionStatus}
          </Badge>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {watchListSymbols.map(symbol => {
            // Mock data for now since we don't have the full market data yet
            const mockData = {
              price: Math.random() * 200 + 50,
              change: Math.random() * 10 - 5,
              changePercent: Math.random() * 5 - 2.5,
              spread: Math.random() * 0.1
            }
            
            return (
              <div
                key={symbol}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{symbol}</span>
                  <div className={cn(
                    'flex items-center text-xs',
                    mockData.change >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {mockData.change >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {mockData.changePercent.toFixed(2)}%
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="text-lg font-mono">
                    ${mockData.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Spread: ${mockData.spread.toFixed(4)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Order Component
const QuickOrder: React.FC = () => {
  const [symbol, setSymbol] = useState('AAPL')
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState(100)
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('LIMIT')
  const [price, setPrice] = useState(150)

  const handleSubmitOrder = () => {
    console.log('Submitting order:', { symbol, side, quantity, orderType, price })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Quick Order</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Symbol Selection */}
        <div>
          <label className="text-sm font-medium">Symbol</label>
          <div className="flex items-center space-x-2 mt-1">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              placeholder="Symbol"
            />
            <Button variant="outline" size="sm">
              <Search className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Side Selection */}
        <div>
          <label className="text-sm font-medium">Side</label>
          <div className="flex space-x-2 mt-1">
            <Button
              variant={side === 'BUY' ? 'default' : 'outline'}
              size="sm"
              className={cn('flex-1', side === 'BUY' && 'bg-green-600 hover:bg-green-700')}
              onClick={() => setSide('BUY')}
            >
              BUY
            </Button>
            <Button
              variant={side === 'SELL' ? 'default' : 'outline'}
              size="sm"
              className={cn('flex-1', side === 'SELL' && 'bg-red-600 hover:bg-red-700')}
              onClick={() => setSide('SELL')}
            >
              SELL
            </Button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-sm font-medium">Quantity</label>
          <div className="flex items-center space-x-2 mt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 10))}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border rounded-md text-sm text-center"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(quantity + 10)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="text-sm font-medium">Order Type</label>
          <div className="flex space-x-2 mt-1">
            <Button
              variant={orderType === 'MARKET' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setOrderType('MARKET')}
            >
              MARKET
            </Button>
            <Button
              variant={orderType === 'LIMIT' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setOrderType('LIMIT')}
            >
              LIMIT
            </Button>
          </div>
        </div>

        {/* Price (for limit orders) */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="text-sm font-medium">Price</label>
            <div className="mt-1">
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          variant="default"
          className={cn(
            'w-full',
            side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          )}
          onClick={handleSubmitOrder}
        >
          {side} {quantity} {symbol} @ {orderType === 'MARKET' ? 'Market' : `$${price}`}
        </Button>
      </CardContent>
    </Card>
  )
}

// Portfolio Summary Component
const PortfolioSummary: React.FC = () => {
  // Mock portfolio data
  const portfolioData = {
    totalValue: 1250000,
    dayChange: 15750,
    dayChangePercent: 1.28,
    positions: [
      { symbol: 'AAPL', quantity: 500, avgPrice: 150, currentPrice: 152.5, unrealizedPnL: 1250 },
      { symbol: 'GOOGL', quantity: 100, avgPrice: 2800, currentPrice: 2825, unrealizedPnL: 2500 },
      { symbol: 'MSFT', quantity: 300, avgPrice: 380, currentPrice: 375, unrealizedPnL: -1500 },
    ]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PieChart className="h-4 w-4" />
          <span>Portfolio</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Value */}
          <div>
            <div className="text-2xl font-bold">
              ${portfolioData.totalValue.toLocaleString()}
            </div>
            <div className={cn(
              'flex items-center text-sm',
              portfolioData.dayChange >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {portfolioData.dayChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              ${Math.abs(portfolioData.dayChange).toLocaleString()} 
              ({portfolioData.dayChangePercent.toFixed(2)}%)
            </div>
          </div>

          <Separator />

          {/* Positions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Positions</h4>
            {portfolioData.positions.map(position => (
              <div key={position.symbol} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{position.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    {position.quantity} @ ${position.avgPrice}
                  </div>
                </div>
                <div className="text-right">
                  <div>${position.currentPrice}</div>
                  <div className={cn(
                    'text-xs',
                    position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Dashboard Content Component
export const DashboardContent: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  
  const { subscribeToSymbols } = useRealTimeData({ autoConnect: true })

  // Subscribe to watchlist symbols on mount
  useEffect(() => {
    const watchListSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX']
    subscribeToSymbols(watchListSymbols, ['quotes', 'trades', 'level2'])
  }, [subscribeToSymbols])

  const handleOrderBookPriceClick = (price: number, side: 'bid' | 'ask') => {
    console.log(`Order book price clicked: ${side} ${price}`)
  }

  return (
    <div className="space-y-6">
      {/* Top Row - Market Overview */}
      <MarketOverview />

      {/* Main Trading Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <QuickOrder />
          <PortfolioSummary />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Book */}
            <div>
              <Suspense fallback={<LoadingWidget title="Order Book" />}>
                <OrderBookWidget
                  symbol={selectedSymbol}
                  depth={15}
                  showSpread={true}
                  showVolume={true}
                  showTotals={true}
                  enableTrading={true}
                  onPriceClick={handleOrderBookPriceClick}
                  className="h-fit"
                />
              </Suspense>
            </div>

            {/* Chart Area */}
            <div>
              <Card className="h-96">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>{selectedSymbol} Chart</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Advanced trading chart will be implemented here</p>
                      <p className="text-sm">Features: TradingView integration, multiple timeframes, technical indicators</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Row - Orders and Trades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No active orders</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No recent trades</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}