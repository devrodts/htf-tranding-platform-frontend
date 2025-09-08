/**
 * Risk Management Component - Advanced risk analysis and position sizing
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown,
  Target,
  DollarSign,
  BarChart3,
  Activity,
  Zap,
  Settings,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketData } from '@/hooks/useMarketData'
import { cn } from '@/lib/utils'

export interface RiskMetrics {
  portfolioValue: number
  totalExposure: number
  maxDrawdown: number
  sharpeRatio: number
  volatility: number
  varDaily: number
  betaToMarket: number
  concentration: number
}

export interface PositionRisk {
  symbol: string
  exposure: number
  var: number
  beta: number
  correlation: number
  maxLoss: number
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface RiskManagementProps {
  className?: string
}

export const RiskManagement: React.FC<RiskManagementProps> = ({ className }) => {
  const portfolio = usePortfolioStore()
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    portfolioValue: 1000000,
    totalExposure: 750000,
    maxDrawdown: -0.08,
    sharpeRatio: 1.45,
    volatility: 0.18,
    varDaily: -25000,
    betaToMarket: 0.95,
    concentration: 0.35
  })
  
  const [positionRisks, setPositionRisks] = useState<PositionRisk[]>([
    {
      symbol: 'AAPL',
      exposure: 150000,
      var: -5200,
      beta: 1.15,
      correlation: 0.78,
      maxLoss: -12000,
      riskScore: 'MEDIUM'
    },
    {
      symbol: 'TSLA',
      exposure: 200000,
      var: -12000,
      beta: 2.1,
      correlation: 0.65,
      maxLoss: -35000,
      riskScore: 'HIGH'
    },
    {
      symbol: 'GOOGL',
      exposure: 120000,
      var: -4800,
      beta: 1.05,
      correlation: 0.82,
      maxLoss: -8500,
      riskScore: 'LOW'
    },
    {
      symbol: 'NVDA',
      exposure: 180000,
      var: -8500,
      beta: 1.85,
      correlation: 0.71,
      maxLoss: -22000,
      riskScore: 'HIGH'
    }
  ])

  const [alerts, setAlerts] = useState([
    {
      id: '1',
      type: 'WARNING',
      message: 'Portfolio concentration in Tech sector exceeds 60%',
      severity: 'MEDIUM',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'ALERT',
      message: 'TSLA position size exceeds maximum single position limit',
      severity: 'HIGH',
      timestamp: new Date()
    },
    {
      id: '3',
      type: 'INFO',
      message: 'VaR has increased by 15% since yesterday',
      severity: 'LOW',
      timestamp: new Date()
    }
  ])

  const calculatePositionSize = (
    accountBalance: number,
    riskPercent: number,
    entryPrice: number,
    stopLoss: number
  ) => {
    const riskAmount = accountBalance * (riskPercent / 100)
    const priceRisk = Math.abs(entryPrice - stopLoss)
    return Math.floor(riskAmount / priceRisk)
  }

  const getRiskColor = (score: PositionRisk['riskScore']) => {
    switch (score) {
      case 'LOW':
        return 'text-bull bg-bull/10 border-bull/20'
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'HIGH':
        return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'CRITICAL':
        return 'text-bear bg-bear/10 border-bear/20'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  const getRiskIcon = (score: PositionRisk['riskScore']) => {
    switch (score) {
      case 'LOW':
        return Shield
      case 'MEDIUM':
        return AlertTriangle
      case 'HIGH':
        return AlertCircle
      case 'CRITICAL':
        return AlertTriangle
      default:
        return Activity
    }
  }

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRiskMetrics(prev => ({
        ...prev,
        varDaily: prev.varDaily + (Math.random() - 0.5) * 2000,
        volatility: Math.max(0.1, prev.volatility + (Math.random() - 0.5) * 0.02),
        sharpeRatio: Math.max(0, prev.sharpeRatio + (Math.random() - 0.5) * 0.1)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Portfolio VaR (1d)</p>
                <p className="text-2xl font-bold font-mono text-bear">
                  ${Math.abs(riskMetrics.varDaily).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-bear/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-bear" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className="text-2xl font-bold font-mono text-bull">
                  {riskMetrics.sharpeRatio.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-bull/10 rounded-lg">
                <Target className="h-5 w-5 text-bull" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
                <p className="text-2xl font-bold font-mono text-bear">
                  {(riskMetrics.maxDrawdown * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-bear/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-bear" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-widget">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Beta to Market</p>
                <p className="text-2xl font-bold font-mono">
                  {riskMetrics.betaToMarket.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Risk Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Position Risk Analysis</span>
              </div>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positionRisks.map((risk) => {
                const RiskIcon = getRiskIcon(risk.riskScore)
                
                return (
                  <div key={risk.symbol} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{risk.symbol}</span>
                        <Badge className={getRiskColor(risk.riskScore)} size="sm">
                          <RiskIcon className="h-3 w-3 mr-1" />
                          {risk.riskScore}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ${risk.exposure.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">VaR:</span>
                        <span className="ml-1 font-mono font-medium text-bear">
                          ${Math.abs(risk.var).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Beta:</span>
                        <span className="ml-1 font-mono font-medium">
                          {risk.beta.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Loss:</span>
                        <span className="ml-1 font-mono font-medium text-bear">
                          ${Math.abs(risk.maxLoss).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {positionRisks.indexOf(risk) < positionRisks.length - 1 && <Separator />}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Risk Alerts */}
        <Card className="trading-widget">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Risk Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    alert.severity === 'HIGH' && "bg-red-50 border-red-200",
                    alert.severity === 'MEDIUM' && "bg-yellow-50 border-yellow-200",
                    alert.severity === 'LOW' && "bg-blue-50 border-blue-200"
                  )}
                >
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className={cn(
                      "h-4 w-4 mt-0.5",
                      alert.severity === 'HIGH' && "text-red-600",
                      alert.severity === 'MEDIUM' && "text-yellow-600",
                      alert.severity === 'LOW' && "text-blue-600"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Controls */}
      <Card className="trading-widget">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Risk Controls & Position Sizing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Position Size</label>
              <div className="p-2 bg-muted rounded text-sm font-mono">
                ${(riskMetrics.portfolioValue * 0.1).toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Risk Per Trade</label>
              <div className="p-2 bg-muted rounded text-sm font-mono">
                2.0% (${(riskMetrics.portfolioValue * 0.02).toLocaleString()})
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Daily Loss</label>
              <div className="p-2 bg-bear/10 rounded text-sm font-mono text-bear">
                ${(riskMetrics.portfolioValue * 0.05).toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Correlation Limit</label>
              <div className="p-2 bg-muted rounded text-sm font-mono">
                0.7 (70%)
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Position Size Calculator</p>
              <p className="text-xs text-muted-foreground">
                Calculate optimal position size based on risk parameters
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <DollarSign className="h-3 w-3 mr-2" />
                Calculate
              </Button>
              <Button variant="outline" size="sm">
                <Zap className="h-3 w-3 mr-2" />
                Auto-Size
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RiskManagement