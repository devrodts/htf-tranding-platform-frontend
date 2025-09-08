/**
 * Algorithm Engine - Trading algorithms and automated strategy execution
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { 
  Bot,
  Play, 
  Pause,
  Square,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Algorithm {
  id: string
  name: string
  type: 'SCALPING' | 'MOMENTUM' | 'MEAN_REVERSION' | 'ARBITRAGE' | 'MARKET_MAKING'
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR'
  pnl: number
  trades: number
  winRate: number
  maxDrawdown: number
  avgTrade: number
  created: Date
  lastSignal?: Date
  settings: {
    maxPosition: number
    stopLoss: number
    takeProfit: number
    timeframe: string
  }
}

export interface AlgorithmSignal {
  id: string
  algorithmId: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  price: number
  quantity: number
  timestamp: Date
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED'
}

interface AlgorithmEngineProps {
  className?: string
}

export const AlgorithmEngine: React.FC<AlgorithmEngineProps> = ({ className }) => {
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([
    {
      id: '1',
      name: 'Momentum Scalper',
      type: 'SCALPING',
      status: 'ACTIVE',
      pnl: 12450.30,
      trades: 156,
      winRate: 68.5,
      maxDrawdown: -2.1,
      avgTrade: 79.81,
      created: new Date('2024-01-15'),
      lastSignal: new Date(),
      settings: {
        maxPosition: 10000,
        stopLoss: 0.5,
        takeProfit: 1.5,
        timeframe: '1m'
      }
    },
    {
      id: '2',
      name: 'Mean Reversion Pro',
      type: 'MEAN_REVERSION',
      status: 'ACTIVE',
      pnl: 8920.75,
      trades: 89,
      winRate: 74.2,
      maxDrawdown: -1.8,
      avgTrade: 100.23,
      created: new Date('2024-01-20'),
      lastSignal: new Date(Date.now() - 300000),
      settings: {
        maxPosition: 15000,
        stopLoss: 1.0,
        takeProfit: 2.0,
        timeframe: '5m'
      }
    },
    {
      id: '3',
      name: 'Arbitrage Hunter',
      type: 'ARBITRAGE',
      status: 'PAUSED',
      pnl: 5641.20,
      trades: 234,
      winRate: 89.3,
      maxDrawdown: -0.8,
      avgTrade: 24.11,
      created: new Date('2024-01-10'),
      settings: {
        maxPosition: 50000,
        stopLoss: 0.2,
        takeProfit: 0.5,
        timeframe: '1s'
      }
    },
    {
      id: '4',
      name: 'Market Maker Bot',
      type: 'MARKET_MAKING',
      status: 'STOPPED',
      pnl: -1240.50,
      trades: 45,
      winRate: 42.2,
      maxDrawdown: -5.3,
      avgTrade: -27.57,
      created: new Date('2024-02-01'),
      settings: {
        maxPosition: 25000,
        stopLoss: 2.0,
        takeProfit: 1.0,
        timeframe: '30s'
      }
    }
  ])

  const [signals, setSignals] = useState<AlgorithmSignal[]>([
    {
      id: '1',
      algorithmId: '1',
      symbol: 'AAPL',
      action: 'BUY',
      confidence: 0.85,
      price: 175.43,
      quantity: 100,
      timestamp: new Date(),
      status: 'EXECUTED'
    },
    {
      id: '2',
      algorithmId: '2',
      symbol: 'TSLA',
      action: 'SELL',
      confidence: 0.72,
      price: 248.56,
      quantity: 50,
      timestamp: new Date(Date.now() - 120000),
      status: 'PENDING'
    },
    {
      id: '3',
      algorithmId: '1',
      symbol: 'MSFT',
      action: 'BUY',
      confidence: 0.91,
      price: 334.78,
      quantity: 75,
      timestamp: new Date(Date.now() - 300000),
      status: 'EXECUTED'
    }
  ])

  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('1')

  const handleAlgorithmAction = (algorithmId: string, action: 'start' | 'pause' | 'stop') => {
    setAlgorithms(prev => prev.map(algo => 
      algo.id === algorithmId 
        ? { 
            ...algo, 
            status: action === 'start' ? 'ACTIVE' : action === 'pause' ? 'PAUSED' : 'STOPPED' 
          }
        : algo
    ))
  }

  const getStatusColor = (status: Algorithm['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-bull bg-bull/10 border-bull/20'
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'STOPPED':
        return 'text-muted-foreground bg-muted border-border'
      case 'ERROR':
        return 'text-bear bg-bear/10 border-bear/20'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  const getStatusIcon = (status: Algorithm['status']) => {
    switch (status) {
      case 'ACTIVE':
        return CheckCircle2
      case 'PAUSED':
        return Pause
      case 'STOPPED':
        return Square
      case 'ERROR':
        return AlertTriangle
      default:
        return Clock
    }
  }

  const getTypeColor = (type: Algorithm['type']) => {
    switch (type) {
      case 'SCALPING':
        return 'bg-blue-100 text-blue-700'
      case 'MOMENTUM':
        return 'bg-green-100 text-green-700'
      case 'MEAN_REVERSION':
        return 'bg-purple-100 text-purple-700'
      case 'ARBITRAGE':
        return 'bg-orange-100 text-orange-700'
      case 'MARKET_MAKING':
        return 'bg-indigo-100 text-indigo-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update algorithm P&L
      setAlgorithms(prev => prev.map(algo => 
        algo.status === 'ACTIVE' 
          ? {
              ...algo,
              pnl: algo.pnl + (Math.random() - 0.45) * 100, // Slight positive bias
              trades: algo.trades + (Math.random() < 0.1 ? 1 : 0),
              lastSignal: Math.random() < 0.3 ? new Date() : algo.lastSignal
            }
          : algo
      ))

      // Generate random signals
      if (Math.random() < 0.2) {
        const activeAlgos = algorithms.filter(a => a.status === 'ACTIVE')
        if (activeAlgos.length > 0) {
          const algo = activeAlgos[Math.floor(Math.random() * activeAlgos.length)]
          const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA']
          const symbol = symbols[Math.floor(Math.random() * symbols.length)]
          
          const newSignal: AlgorithmSignal = {
            id: Date.now().toString(),
            algorithmId: algo.id,
            symbol,
            action: Math.random() < 0.5 ? 'BUY' : 'SELL',
            confidence: 0.6 + Math.random() * 0.3,
            price: 100 + Math.random() * 300,
            quantity: Math.floor(Math.random() * 200) + 10,
            timestamp: new Date(),
            status: 'PENDING'
          }
          
          setSignals(prev => [newSignal, ...prev.slice(0, 9)])
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [algorithms])

  const totalPnL = algorithms.reduce((sum, algo) => sum + algo.pnl, 0)
  const totalTrades = algorithms.reduce((sum, algo) => sum + algo.trades, 0)
  const activeAlgorithms = algorithms.filter(algo => algo.status === 'ACTIVE').length
  const avgWinRate = algorithms.length > 0 
    ? algorithms.reduce((sum, algo) => sum + algo.winRate, 0) / algorithms.length 
    : 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Algorithm Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={cn(
                  "text-2xl font-bold font-mono",
                  totalPnL >= 0 ? "text-bull" : "text-bear"
                )}>
                  ${totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                {totalPnL >= 0 ? 
                  <TrendingUp className="h-5 w-5 text-bull" /> : 
                  <TrendingDown className="h-5 w-5 text-bear" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Algorithms</p>
                <p className="text-2xl font-bold font-mono text-bull">
                  {activeAlgorithms}/{algorithms.length}
                </p>
              </div>
              <div className="p-2 bg-bull/10 rounded-lg">
                <Bot className="h-5 w-5 text-bull" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold font-mono">
                  {totalTrades.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Win Rate</p>
                <p className="text-2xl font-bold font-mono text-bull">
                  {avgWinRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-bull/10 rounded-lg">
                <Target className="h-5 w-5 text-bull" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <span>Algorithm Management</span>
              </div>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {algorithms.map((algo) => {
                const StatusIcon = getStatusIcon(algo.status)
                
                return (
                  <div
                    key={algo.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors",
                      selectedAlgorithm === algo.id ? "bg-muted border-primary" : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedAlgorithm(algo.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{algo.name}</span>
                          <Badge className={getTypeColor(algo.type)} size="sm">
                            {algo.type}
                          </Badge>
                        </div>
                        <Badge className={getStatusColor(algo.status)} size="sm">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {algo.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">P&L:</span>
                          <span className={cn(
                            "ml-1 font-mono font-medium",
                            algo.pnl >= 0 ? "text-bull" : "text-bear"
                          )}>
                            ${algo.pnl.toFixed(0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trades:</span>
                          <span className="ml-1 font-mono font-medium">
                            {algo.trades}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Win Rate:</span>
                          <span className="ml-1 font-mono font-medium text-bull">
                            {algo.winRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {algo.lastSignal ? 
                            `Last signal: ${algo.lastSignal.toLocaleTimeString()}` :
                            'No recent signals'
                          }
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAlgorithmAction(algo.id, 'start')
                            }}
                            disabled={algo.status === 'ACTIVE'}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAlgorithmAction(algo.id, 'pause')
                            }}
                            disabled={algo.status !== 'ACTIVE'}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAlgorithmAction(algo.id, 'stop')
                            }}
                            disabled={algo.status === 'STOPPED'}
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Signals */}
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Recent Signals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {signals.map((signal) => {
                const algorithm = algorithms.find(a => a.id === signal.algorithmId)
                
                return (
                  <div
                    key={signal.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{signal.symbol}</span>
                          <Badge
                            variant={signal.action === 'BUY' ? 'default' : 'destructive'}
                            size="sm"
                          >
                            {signal.action}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {algorithm?.name} • {signal.timestamp.toLocaleTimeString()}
                        </p>
                        <div className="flex items-center space-x-3 text-xs">
                          <span>
                            <span className="text-muted-foreground">Price:</span>
                            <span className="ml-1 font-mono">${signal.price.toFixed(2)}</span>
                          </span>
                          <span>
                            <span className="text-muted-foreground">Qty:</span>
                            <span className="ml-1 font-mono">{signal.quantity}</span>
                          </span>
                          <span>
                            <span className="text-muted-foreground">Conf:</span>
                            <span className="ml-1 font-mono">{(signal.confidence * 100).toFixed(0)}%</span>
                          </span>
                        </div>
                      </div>
                      
                      <Badge
                        variant={signal.status === 'EXECUTED' ? 'default' : 'secondary'}
                        size="sm"
                      >
                        {signal.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analytics */}
      <Card className="trading-widget">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Performance Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Best Performer</h4>
              <div className="space-y-1">
                {algorithms
                  .sort((a, b) => b.pnl - a.pnl)
                  .slice(0, 1)
                  .map(algo => (
                    <div key={algo.id} className="flex items-center justify-between">
                      <span className="text-sm">{algo.name}</span>
                      <span className="text-sm font-mono text-bull">
                        +${algo.pnl.toFixed(0)}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Highest Win Rate</h4>
              <div className="space-y-1">
                {algorithms
                  .sort((a, b) => b.winRate - a.winRate)
                  .slice(0, 1)
                  .map(algo => (
                    <div key={algo.id} className="flex items-center justify-between">
                      <span className="text-sm">{algo.name}</span>
                      <span className="text-sm font-mono text-bull">
                        {algo.winRate.toFixed(1)}%
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Most Active</h4>
              <div className="space-y-1">
                {algorithms
                  .sort((a, b) => b.trades - a.trades)
                  .slice(0, 1)
                  .map(algo => (
                    <div key={algo.id} className="flex items-center justify-between">
                      <span className="text-sm">{algo.name}</span>
                      <span className="text-sm font-mono">
                        {algo.trades} trades
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Lowest Drawdown</h4>
              <div className="space-y-1">
                {algorithms
                  .sort((a, b) => b.maxDrawdown - a.maxDrawdown)
                  .slice(0, 1)
                  .map(algo => (
                    <div key={algo.id} className="flex items-center justify-between">
                      <span className="text-sm">{algo.name}</span>
                      <span className="text-sm font-mono text-bear">
                        {algo.maxDrawdown.toFixed(1)}%
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AlgorithmEngine