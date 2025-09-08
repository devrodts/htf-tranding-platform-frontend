/**
 * Market Dashboard - Comprehensive trading dashboard with multiple charts and data
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { TradingViewChart } from './TradingViewChart'
import { OrderBookWidget } from './OrderBookWidget'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  Volume2,
  Zap,
  RefreshCw,
  Star
} from 'lucide-react'
import { useMarketData, useMarketStats } from '@/hooks/useMarketData'
import { cn } from '@/lib/utils'

interface MarketDashboardProps {
  className?: string
}

export const MarketDashboard: React.FC<MarketDashboardProps> = ({ className }) => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [watchlist] = useState(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'])
  
  const marketData = useMarketData(watchlist)
  const marketStats = useMarketStats()

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol)
  }

  const handlePriceClick = (price: number) => {
    console.log('Price clicked:', price)
    // Here you could open an order dialog or similar
  }

  const topMovers = Object.values(marketData.data)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5)

  const marketMetrics = [
    {
      label: 'Market Cap',
      value: '$45.2T',
      change: '+2.1%',
      positive: true,
      icon: DollarSign
    },
    {
      label: 'Active Traders',
      value: '12.4K',
      change: '+156',
      positive: true,
      icon: Users
    },
    {
      label: 'Total Volume',
      value: '$89.5B',
      change: '+5.2%',
      positive: true,
      icon: Volume2
    },
    {
      label: 'Volatility Index',
      value: '18.3',
      change: '-1.2%',
      positive: false,
      icon: Activity
    }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketMetrics.map((metric) => (
          <Card key={metric.label} className="trading-widget">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold font-mono">{metric.value}</p>
                  <div className="flex items-center space-x-1">
                    {metric.positive ? (
                      <TrendingUp className="h-3 w-3 text-bull" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-bear" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      metric.positive ? "text-bull" : "text-bear"
                    )}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <metric.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Watchlist */}
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4" />
                <span>Watchlist</span>
              </div>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {watchlist.map((symbol) => {
                const symbolData = marketData.getSymbolData(symbol)
                if (!symbolData) return null
                
                return (
                  <div
                    key={symbol}
                    onClick={() => handleSymbolSelect(symbol)}
                    className={cn(
                      "flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                      selectedSymbol === symbol && "bg-muted"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{symbol}</span>
                        {symbolData.changePercent >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-bull" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-bear" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vol: {(symbolData.volume / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-mono font-semibold">
                        ${symbolData.price.toFixed(2)}
                      </p>
                      <p className={cn(
                        "text-xs font-medium",
                        symbolData.changePercent >= 0 ? "text-bull" : "text-bear"
                      )}>
                        {symbolData.changePercent >= 0 ? '+' : ''}
                        {symbolData.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Chart */}
        <div className="lg:col-span-2">
          <TradingViewChart
            symbol={selectedSymbol}
            height={500}
            onPriceClick={handlePriceClick}
            config={{
              interval: '15m',
              chartType: 'candlestick',
              showVolume: true,
              showIndicators: false
            }}
          />
        </div>

        {/* Order Book */}
        <OrderBookWidget symbol={selectedSymbol} />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Movers */}
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Top Movers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMovers.map((data) => (
                <div key={data.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{data.symbol}</span>
                    {data.changePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-bull" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-bear" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm">
                      ${data.price.toFixed(2)}
                    </span>
                    <Badge
                      variant={data.changePercent >= 0 ? 'default' : 'destructive'}
                      size="sm"
                    >
                      {data.changePercent >= 0 ? '+' : ''}
                      {data.changePercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Stats */}
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Market Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Advancing</span>
                <span className="font-mono font-semibold text-bull">
                  {marketStats.advancing}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Declining</span>
                <span className="font-mono font-semibold text-bear">
                  {marketStats.declining}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unchanged</span>
                <span className="font-mono font-semibold">
                  {marketStats.unchanged}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Volume</span>
                <span className="font-mono font-semibold">
                  {(marketStats.totalVolume / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Change</span>
                <span className={cn(
                  "font-mono font-semibold",
                  marketStats.averageChange >= 0 ? "text-bull" : "text-bear"
                )}>
                  {marketStats.averageChange >= 0 ? '+' : ''}
                  {marketStats.averageChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full trading-button-buy" size="sm">
                Quick Buy {selectedSymbol}
              </Button>
              <Button className="w-full trading-button-sell" size="sm">
                Quick Sell {selectedSymbol}
              </Button>
              <Separator />
              <Button variant="outline" className="w-full" size="sm">
                <PieChart className="h-3 w-3 mr-2" />
                Portfolio Analysis
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Activity className="h-3 w-3 mr-2" />
                Risk Assessment
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <BarChart3 className="h-3 w-3 mr-2" />
                Market Screener
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MarketDashboard