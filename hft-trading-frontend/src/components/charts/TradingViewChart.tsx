'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  PriceScaleMode,
  TickMarkType,
  Time,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  UTCTimestamp,
  DeepPartial,
  ChartOptions,
  SeriesOptionsCommon
} from 'lightweight-charts';

// Professional HFT Chart Types
interface OHLCVData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketDepthLevel {
  price: number;
  size: number;
  side: 'bid' | 'ask';
}

interface TechnicalIndicator {
  name: string;
  type: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'VWAP';
  period?: number;
  enabled: boolean;
  color: string;
}

interface TradingViewChartProps {
  symbol: string;
  data: OHLCVData[];
  marketDepth?: MarketDepthLevel[];
  indicators?: TechnicalIndicator[];
  timeframe: '1s' | '5s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  onCrosshairMove?: (price: number, time: Time) => void;
  onOrderPlace?: (price: number, side: 'buy' | 'sell') => void;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  enableTrading?: boolean;
  showVolume?: boolean;
  showDepth?: boolean;
  realTimeUpdates?: boolean;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  data,
  marketDepth = [],
  indicators = [],
  timeframe,
  onCrosshairMove,
  onOrderPlace,
  width = 1200,
  height = 600,
  theme = 'dark',
  enableTrading = true,
  showVolume = true,
  showDepth = false,
  realTimeUpdates = true
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [volume24h, setVolume24h] = useState<number>(0);

  // Professional HFT Chart Configuration
  const chartOptions: DeepPartial<ChartOptions> = useMemo(() => ({
    width,
    height,
    layout: {
      background: {
        type: ColorType.Solid,
        color: theme === 'dark' ? '#0f0f0f' : '#ffffff',
      },
      textColor: theme === 'dark' ? '#d1d4dc' : '#191919',
      fontSize: 11,
      fontFamily: '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    },
    grid: {
      vertLines: {
        color: theme === 'dark' ? '#1e1e1e' : '#f0f0f0',
        style: LineStyle.Solid,
      },
      horzLines: {
        color: theme === 'dark' ? '#1e1e1e' : '#f0f0f0',
        style: LineStyle.Solid,
      },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: theme === 'dark' ? '#758696' : '#6a7179',
        width: 1,
        style: LineStyle.Dashed,
      },
      horzLine: {
        color: theme === 'dark' ? '#758696' : '#6a7179',
        width: 1,
        style: LineStyle.Dashed,
      },
    },
    rightPriceScale: {
      scaleMargins: {
        top: 0.1,
        bottom: showVolume ? 0.4 : 0.1,
      },
      mode: PriceScaleMode.Normal,
      autoScale: true,
      borderColor: theme === 'dark' ? '#2a2a2a' : '#cccccc',
    },
    timeScale: {
      borderColor: theme === 'dark' ? '#2a2a2a' : '#cccccc',
      timeVisible: true,
      secondsVisible: timeframe.includes('s'),
      tickMarkFormatter: (time: UTCTimestamp, tickMarkType: TickMarkType) => {
        const date = new Date(time * 1000);
        switch (tickMarkType) {
          case TickMarkType.Year:
            return date.getFullYear().toString();
          case TickMarkType.Month:
            return date.toLocaleString('en-US', { month: 'short' });
          case TickMarkType.DayOfMonth:
            return date.getDate().toString();
          case TickMarkType.Time:
            return timeframe.includes('s') 
              ? date.toLocaleTimeString('en-US', { hour12: false })
              : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          default:
            return '';
        }
      },
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false,
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true,
    },
  }), [width, height, theme, timeframe, showVolume]);

  // Initialize Chart with Professional Configuration
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    // Create main chart
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // Add candlestick series (main price action)
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add volume series if enabled
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: theme === 'dark' ? '#26a69a40' : '#26a69a60',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // Professional crosshair handling
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.point) {
        const price = candlestickSeries.coordinateToPrice(param.point.y);
        if (price && onCrosshairMove) {
          onCrosshairMove(price, param.time);
        }
      }
    });

    // Trading interaction (right-click for orders)
    if (enableTrading) {
      chartContainerRef.current.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (onOrderPlace && chartRef.current) {
          const rect = chartContainerRef.current!.getBoundingClientRect();
          const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const price = candlestickSeries.coordinateToPrice(point.y);
          if (price) {
            // Show order placement modal/menu
            onOrderPlace(price, e.shiftKey ? 'sell' : 'buy');
          }
        }
      });
    }

    setIsLoading(false);
  }, [chartOptions, showVolume, theme, enableTrading, onCrosshairMove, onOrderPlace]);

  // Calculate Technical Indicators
  const calculateSMA = useCallback((data: OHLCVData[], period: number): LineData[] => {
    const result: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      result.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return result;
  }, []);

  const calculateEMA = useCallback((data: OHLCVData[], period: number): LineData[] => {
    const result: LineData[] = [];
    const multiplier = 2 / (period + 1);
    
    // Initialize with first SMA
    const firstSMA = data.slice(0, period).reduce((acc, curr) => acc + curr.close, 0) / period;
    result.push({ time: data[period - 1].time, value: firstSMA });
    
    for (let i = period; i < data.length; i++) {
      const ema = (data[i].close - result[result.length - 1].value) * multiplier + result[result.length - 1].value;
      result.push({ time: data[i].time, value: ema });
    }
    return result;
  }, []);

  const calculateVWAP = useCallback((data: OHLCVData[]): LineData[] => {
    let cumulativeTPV = 0; // Typical Price * Volume
    let cumulativeVolume = 0;
    
    return data.map(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeTPV += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
      
      return {
        time: candle.time,
        value: cumulativeTPV / cumulativeVolume,
      };
    });
  }, []);

  // Add Technical Indicators
  const updateIndicators = useCallback(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    // Clear existing indicators
    indicatorSeriesRef.current.forEach(series => {
      chartRef.current!.removeSeries(series);
    });
    indicatorSeriesRef.current.clear();

    // Add enabled indicators
    indicators.forEach(indicator => {
      if (!indicator.enabled) return;

      let indicatorData: LineData[] = [];
      
      switch (indicator.type) {
        case 'SMA':
          indicatorData = calculateSMA(data, indicator.period || 20);
          break;
        case 'EMA':
          indicatorData = calculateEMA(data, indicator.period || 20);
          break;
        case 'VWAP':
          indicatorData = calculateVWAP(data);
          break;
        // Add more indicators as needed
      }

      if (indicatorData.length > 0) {
        const series = chartRef.current!.addLineSeries({
          color: indicator.color,
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          crosshairMarkerVisible: true,
          title: `${indicator.name} (${indicator.period || ''})`,
        });
        
        series.setData(indicatorData);
        indicatorSeriesRef.current.set(indicator.name, series);
      }
    });
  }, [data, indicators, calculateSMA, calculateEMA, calculateVWAP]);

  // Update chart data
  const updateChartData = useCallback(() => {
    if (!candlestickSeriesRef.current || !data.length) return;

    // Update candlestick data
    candlestickSeriesRef.current.setData(data);

    // Update volume data
    if (volumeSeriesRef.current && showVolume) {
      const volumeData: HistogramData[] = data.map(candle => ({
        time: candle.time,
        value: candle.volume,
        color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Calculate and display current metrics
    if (data.length > 0) {
      const latest = data[data.length - 1];
      const previous = data.length > 1 ? data[data.length - 2] : latest;
      
      setCurrentPrice(latest.close);
      setPriceChange(((latest.close - previous.close) / previous.close) * 100);
      
      // Calculate 24h volume
      const volume24h = data.slice(-24).reduce((sum, candle) => sum + candle.volume, 0);
      setVolume24h(volume24h);
    }

    // Update indicators
    updateIndicators();
  }, [data, showVolume, updateIndicators]);

  // Real-time data updates
  const handleRealtimeUpdate = useCallback((newCandle: OHLCVData) => {
    if (!candlestickSeriesRef.current) return;

    candlestickSeriesRef.current.update(newCandle);
    
    if (volumeSeriesRef.current && showVolume) {
      volumeSeriesRef.current.update({
        time: newCandle.time,
        value: newCandle.volume,
        color: newCandle.close >= newCandle.open ? '#26a69a80' : '#ef535080',
      });
    }

    setCurrentPrice(newCandle.close);
  }, [showVolume]);

  // Initialize chart on mount
  useEffect(() => {
    initializeChart();
    
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [initializeChart]);

  // Update data when props change
  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">{symbol}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-mono text-white">
              ${currentPrice.toFixed(4)}
            </span>
            <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>24h Vol: {(volume24h / 1000000).toFixed(2)}M</span>
          <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium">
            {timeframe}
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
            <div className="text-white">Loading chart data...</div>
          </div>
        )}
        
        <div 
          ref={chartContainerRef} 
          className="w-full" 
          style={{ height: height - 60 }}
        />
        
        {/* Trading Controls Overlay */}
        {enableTrading && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button 
              onClick={() => onOrderPlace?.(currentPrice, 'buy')}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium transition-colors"
            >
              BUY
            </button>
            <button 
              onClick={() => onOrderPlace?.(currentPrice, 'sell')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors"
            >
              SELL
            </button>
          </div>
        )}
      </div>

      {/* Chart Footer */}
      <div className="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>Professional Trading Chart • Real-time Data</span>
          <span>Right-click to place orders • Shift+Right-click to sell</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TradingViewChart);