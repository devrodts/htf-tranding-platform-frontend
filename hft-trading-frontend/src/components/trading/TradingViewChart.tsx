/**
 * TradingView Chart Component - Professional trading charts with real-time data
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, LineStyle, Time } from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2, 
  Settings, 
  Maximize2,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react'
import { useMarketData } from '@/hooks/useMarketData'
import { cn } from '@/lib/utils'

export interface CandlestickData {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface ChartConfig {
  symbol: string
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  chartType: 'candlestick' | 'line' | 'area'
  showVolume: boolean
  showIndicators: boolean
}

interface TradingViewChartProps {
  symbol: string
  height?: number
  config?: Partial<ChartConfig>
  onPriceClick?: (price: number) => void
  className?: string
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  height = 400,
  config,
  onPriceClick,
  className
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    symbol,
    interval: '15m',
    chartType: 'candlestick',
    showVolume: true,
    showIndicators: false,
    ...config
  })
  
  const marketData = useMarketData([symbol])
  const symbolData = marketData.getSymbolData(symbol)

  // Generate mock historical data
  const generateHistoricalData = (basePrice: number, periods = 100): CandlestickData[] => {
    const data: CandlestickData[] = []
    const now = Date.now()
    const intervalMs = chartConfig.interval === '1m' ? 60000 : 
                     chartConfig.interval === '5m' ? 300000 :
                     chartConfig.interval === '15m' ? 900000 :
                     chartConfig.interval === '1h' ? 3600000 :
                     chartConfig.interval === '4h' ? 14400000 : 86400000
    
    let currentPrice = basePrice
    
    for (let i = periods; i >= 0; i--) {
      const time = Math.floor((now - (i * intervalMs)) / 1000) as Time
      
      const open = currentPrice
      const volatility = basePrice * 0.02 // 2% volatility
      const change = (Math.random() - 0.5) * volatility
      const close = Math.max(0.01, open + change)
      
      const range = Math.abs(close - open) + (basePrice * 0.005)
      const high = Math.max(open, close) + (Math.random() * range * 0.5)
      const low = Math.min(open, close) - (Math.random() * range * 0.5)
      
      const volume = Math.floor(Math.random() * 1000000) + 100000
      
      data.push({
        time,
        open,
        high,
        low,
        close,
        volume
      })
      
      currentPrice = close
    }
    
    return data
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !symbolData) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#758696',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: LineStyle.Dashed,
        },
      },
      priceScale: {
        borderColor: '#485c7b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true,
        secondsVisible: false,
      },
      watermark: {
        color: 'rgba(11, 94, 29, 0.4)',
        visible: true,
        text: symbol,
        fontSize: 24,
        horzAlign: 'left',
        vertAlign: 'bottom',
      },
    })

    chartRef.current = chart

    // Create main price series based on chart type
    if (chartConfig.chartType === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      candlestickSeriesRef.current = candlestickSeries
    } else {
      const lineSeries = chart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
      })
      lineSeriesRef.current = lineSeries
    }

    // Add volume series if enabled
    if (chartConfig.showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      })
      
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      })
      
      volumeSeriesRef.current = volumeSeries
    }

    // Generate and set historical data
    const historicalData = generateHistoricalData(symbolData.price)
    
    if (chartConfig.chartType === 'candlestick' && candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setData(historicalData)
    } else if (lineSeriesRef.current) {
      const lineData = historicalData.map(d => ({
        time: d.time,
        value: d.close
      }))
      lineSeriesRef.current.setData(lineData)
    }
    
    if (chartConfig.showVolume && volumeSeriesRef.current) {
      const volumeData = historicalData.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? '#26a69a80' : '#ef535080'
      }))
      volumeSeriesRef.current.setData(volumeData)
    }

    // Handle click events
    chart.subscribeClick((param) => {
      if (param.point && param.time && onPriceClick) {
        const price = chart.priceScale('right').coordinateToPrice(param.point.y)
        if (price) {
          onPriceClick(price)
        }
      }
    })

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [chartConfig, symbolData, height, onPriceClick])

  // Update with real-time data
  useEffect(() => {
    if (!symbolData || !chartRef.current) return

    const now = Math.floor(Date.now() / 1000) as Time
    
    if (chartConfig.chartType === 'candlestick' && candlestickSeriesRef.current) {
      // Update last candle
      candlestickSeriesRef.current.update({
        time: now,
        open: symbolData.price * 0.999,
        high: symbolData.price * 1.002,
        low: symbolData.price * 0.998,
        close: symbolData.price,
      })
    } else if (lineSeriesRef.current) {
      lineSeriesRef.current.update({
        time: now,
        value: symbolData.price
      })
    }
  }, [symbolData, chartConfig.chartType])

  const handleIntervalChange = (interval: ChartConfig['interval']) => {
    setChartConfig(prev => ({ ...prev, interval }))
  }

  const handleChartTypeChange = (chartType: ChartConfig['chartType']) => {
    setChartConfig(prev => ({ ...prev, chartType }))
  }

  const toggleVolume = () => {
    setChartConfig(prev => ({ ...prev, showVolume: !prev.showVolume }))
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!symbolData) {
    return (
      <Card className={cn("trading-widget", className)}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <Activity className="h-8 w-8 animate-pulse mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("trading-widget", isFullscreen && "fixed inset-4 z-50", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center space-x-4">
          <CardTitle className="text-lg font-semibold">
            {symbol}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {chartConfig.interval}
            </span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Badge variant={symbolData.changePercent >= 0 ? 'default' : 'destructive'} size="sm">
              {symbolData.changePercent >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {symbolData.changePercent.toFixed(2)}%
            </Badge>
            <span className={cn(
              "text-lg font-mono font-semibold",
              symbolData.changePercent >= 0 ? "text-bull" : "text-bear"
            )}>
              ${symbolData.price.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Interval Selector */}
          <div className="flex items-center space-x-1">
            {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((interval) => (
              <Button
                key={interval}
                variant={chartConfig.interval === interval ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleIntervalChange(interval)}
                className="h-7 px-2 text-xs"
              >
                {interval}
              </Button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center space-x-1">
            <Button
              variant={chartConfig.chartType === 'candlestick' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleChartTypeChange('candlestick')}
              className="h-7 px-2"
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
            <Button
              variant={chartConfig.chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleChartTypeChange('line')}
              className="h-7 px-2"
            >
              <Activity className="h-3 w-3" />
            </Button>
          </div>

          {/* Volume Toggle */}
          <Button
            variant={chartConfig.showVolume ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleVolume}
            className="h-7 px-2"
          >
            <Volume2 className="h-3 w-3" />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <Settings className="h-3 w-3" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-7 px-2"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          ref={chartContainerRef} 
          className="w-full"
          style={{ height: `${height}px` }}
        />
        
        {/* Real-time stats bar */}
        <div className="flex items-center justify-between p-3 border-t bg-muted/20">
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-1">
              <span className="text-muted-foreground">O:</span>
              <span className="font-mono">{symbolData.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-muted-foreground">H:</span>
              <span className="font-mono text-bull">{symbolData.high.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-muted-foreground">L:</span>
              <span className="font-mono text-bear">{symbolData.low.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-muted-foreground">C:</span>
              <span className="font-mono">{symbolData.price.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-1">
              <Volume2 className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono">{symbolData.volume.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono">Spread: {symbolData.spread.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TradingViewChart