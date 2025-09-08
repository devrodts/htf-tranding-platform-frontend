/**
 * Trading Dashboard Page - Main HFT trading interface with protected routes
 */

'use client'

import type { Metadata } from 'next'
import React, { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardContent } from './DashboardContent'
import { MarketDashboard } from '@/components/trading/MarketDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Activity, RefreshCw, TrendingUp, TrendingDown, Search, Zap, Plus, Minus, PieChart } from 'lucide-react'
import { useMarketData, useConnectionStatus } from '@/hooks/useMarketData'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/Separator'

// Metadata is handled by layout since this is a client component

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
            variant={connectionStatus === 'connected' ? 'bull' : 'bear'}
            size="sm"
          >
            {connectionStatus}
          </Badge>
          <Button variant="ghost" size="icon-sm">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {watchListSymbols.map(symbol => {
            const symbolData = marketData.getSymbolData(symbol)
            const quote = symbolData
            const dailyStats = symbolData
            
            return (
              <div
                key={symbol}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{symbol}</span>
                  {dailyStats && (
                    <div className={cn(
                      'flex items-center text-xs',
                      dailyStats.change >= 0 ? 'text-bull-600' : 'text-bear-600'
                    )}>
                      {dailyStats.change >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {dailyStats.changePercent.toFixed(2)}%
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <div className="text-lg font-mono">
                    {quote ? `$${quote.bid.toFixed(2)}` : '--'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {quote ? `Spread: $${quote.spread.toFixed(4)}` : 'No data'}
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

  const marketData = useMarketData([symbol])
  const quote = marketData.getSymbolData(symbol)

  useEffect(() => {
    if (quote) {
      setPrice(side === 'BUY' ? quote.price * 0.999 : quote.price * 1.001)
    }
  }, [quote, side])

  const handleSubmitOrder = () => {
    // Order submission logic would go here
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
              variant={side === 'BUY' ? 'buy' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setSide('BUY')}
            >
              BUY
            </Button>
            <Button
              variant={side === 'SELL' ? 'sell' : 'outline'}
              size="sm"
              className="flex-1"
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
              size="icon-sm"
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
              size="icon-sm"
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

        {/* Market Data Display */}
        {quote && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Bid: ${quote.bid.toFixed(2)}</span>
              <span>Ask: ${quote.ask.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Spread: ${quote.spread.toFixed(4)} ({((quote.spread / quote.bid) * 100).toFixed(3)}%)
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          variant={side === 'BUY' ? 'buy' : 'sell'}
          className="w-full"
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
  // Mock portfolio data - in real app this would come from API/store
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
              portfolioData.dayChange >= 0 ? 'text-bull-600' : 'text-bear-600'
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
                    position.unrealizedPnL >= 0 ? 'text-bull-600' : 'text-bear-600'
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

export default function DashboardPage() {
  return (
    <ProtectedRoute
      requireAuth={true}
      requiredPermissions={[
        { resource: 'dashboard', action: 'read' },
        { resource: 'trading', action: 'read' }
      ]}
    >
      <AppShell>
        <MarketDashboard />
      </AppShell>
    </ProtectedRoute>
  )
}