'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWebSocket } from './useWebSocket';

// Professional Chart Data Types
export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickData {
  price: number;
  size: number;
  timestamp: number;
  side: 'buy' | 'sell';
}

export interface MarketDepthLevel {
  price: number;
  size: number;
  total: number;
  count: number;
  side: 'bid' | 'ask';
}

export interface MarketDepthData {
  bids: MarketDepthLevel[];
  asks: MarketDepthLevel[];
  spread: number;
  spreadPercentage: number;
  midPrice: number;
  timestamp: number;
}

export interface VolumeNode {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  transactions: number;
  percentage: number;
}

export interface VolumeProfileData {
  nodes: VolumeNode[];
  totalVolume: number;
  valueAreaHigh: number;
  valueAreaLow: number;
  pointOfControl: number;
  valueAreaVolume: number;
  timeframe: string;
}

interface ChartDataState {
  candleData: OHLCVData[];
  tickData: TickData[];
  marketDepth: MarketDepthData | null;
  volumeProfile: VolumeProfileData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
}

interface UseChartDataOptions {
  symbol: string;
  timeframe: '1s' | '5s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  maxCandles?: number;
  maxTicks?: number;
  enableRealTime?: boolean;
  enableMarketDepth?: boolean;
  enableVolumeProfile?: boolean;
}

export const useChartData = (options: UseChartDataOptions) => {
  const {
    symbol,
    timeframe,
    maxCandles = 1000,
    maxTicks = 10000,
    enableRealTime = true,
    enableMarketDepth = true,
    enableVolumeProfile = true
  } = options;

  // State management
  const [state, setState] = useState<ChartDataState>({
    candleData: [],
    tickData: [],
    marketDepth: null,
    volumeProfile: null,
    isLoading: true,
    error: null,
    lastUpdate: Date.now()
  });

  // Refs for real-time processing
  const candleBufferRef = useRef<Map<number, OHLCVData>>(new Map());
  const tickBufferRef = useRef<TickData[]>([]);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection for real-time data
  const { 
    isConnected, 
    sendMessage,
    lastMessage 
  } = useWebSocket({
    url: 'ws://localhost:8081/ws',
    enabled: enableRealTime,
    reconnectAttempts: 10,
    reconnectInterval: 1000
  });

  // Subscribe to market data when connected
  useEffect(() => {
    if (isConnected) {
      const subscriptionMessage = {
        type: 'subscribe',
        channels: [
          'ticker',
          ...(enableMarketDepth ? ['orderbook'] : []),
          ...(enableVolumeProfile ? ['trades'] : [])
        ],
        symbols: [symbol]
      };
      
      sendMessage(subscriptionMessage);
      
      setState(prev => ({ ...prev, error: null }));
    }
  }, [isConnected, symbol, enableMarketDepth, enableVolumeProfile, sendMessage]);

  // Convert tick data to OHLCV candles
  const processTicksToCandles = useCallback((ticks: TickData[]): OHLCVData[] => {
    if (ticks.length === 0) return [];

    // Group ticks by timeframe
    const timeframeMs = getTimeframeInMs(timeframe);
    const candleMap = new Map<number, OHLCVData>();

    ticks.forEach(tick => {
      const candleTime = Math.floor(tick.timestamp / timeframeMs) * timeframeMs;
      
      const existingCandle = candleMap.get(candleTime);
      
      if (existingCandle) {
        // Update existing candle
        existingCandle.high = Math.max(existingCandle.high, tick.price);
        existingCandle.low = Math.min(existingCandle.low, tick.price);
        existingCandle.close = tick.price;
        existingCandle.volume += tick.size;
      } else {
        // Create new candle
        candleMap.set(candleTime, {
          time: candleTime,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.size
        });
      }
    });

    return Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
  }, [timeframe]);

  // Calculate volume profile from tick data
  const calculateVolumeProfile = useCallback((ticks: TickData[]): VolumeProfileData => {
    if (ticks.length === 0) {
      return {
        nodes: [],
        totalVolume: 0,
        valueAreaHigh: 0,
        valueAreaLow: 0,
        pointOfControl: 0,
        valueAreaVolume: 0,
        timeframe
      };
    }

    // Group ticks by price level (rounded to appropriate precision)
    const priceMap = new Map<number, VolumeNode>();
    const priceStep = getPriceStep(Math.max(...ticks.map(t => t.price)));
    
    ticks.forEach(tick => {
      const roundedPrice = Math.round(tick.price / priceStep) * priceStep;
      
      const existing = priceMap.get(roundedPrice);
      
      if (existing) {
        existing.volume += tick.size;
        existing.transactions += 1;
        
        if (tick.side === 'buy') {
          existing.buyVolume += tick.size;
        } else {
          existing.sellVolume += tick.size;
        }
      } else {
        priceMap.set(roundedPrice, {
          price: roundedPrice,
          volume: tick.size,
          buyVolume: tick.side === 'buy' ? tick.size : 0,
          sellVolume: tick.side === 'sell' ? tick.size : 0,
          transactions: 1,
          percentage: 0
        });
      }
    });

    const nodes = Array.from(priceMap.values());
    const totalVolume = nodes.reduce((sum, node) => sum + node.volume, 0);

    // Calculate percentages
    nodes.forEach(node => {
      node.percentage = totalVolume > 0 ? (node.volume / totalVolume) * 100 : 0;
    });

    // Find Point of Control (highest volume)
    const pointOfControl = nodes.reduce((max, node) => 
      node.volume > max.volume ? node : max, nodes[0]
    );

    // Calculate Value Area (70% of volume around POC)
    nodes.sort((a, b) => b.volume - a.volume);
    let valueAreaVolume = 0;
    const targetVolume = totalVolume * 0.7;
    const valueAreaNodes: VolumeNode[] = [];

    for (const node of nodes) {
      if (valueAreaVolume < targetVolume) {
        valueAreaNodes.push(node);
        valueAreaVolume += node.volume;
      } else {
        break;
      }
    }

    const valueAreaPrices = valueAreaNodes.map(n => n.price).sort((a, b) => a - b);
    const valueAreaHigh = valueAreaPrices[valueAreaPrices.length - 1] || 0;
    const valueAreaLow = valueAreaPrices[0] || 0;

    // Sort nodes by price for display
    nodes.sort((a, b) => b.price - a.price);

    return {
      nodes,
      totalVolume,
      valueAreaHigh,
      valueAreaLow,
      pointOfControl: pointOfControl?.price || 0,
      valueAreaVolume,
      timeframe
    };
  }, [timeframe]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data = JSON.parse(lastMessage);
      
      switch (data.type) {
        case 'ticker':
          if (data.symbol === symbol) {
            const tick: TickData = {
              price: data.price,
              size: data.size || data.volume,
              timestamp: data.timestamp || Date.now(),
              side: data.side || (Math.random() > 0.5 ? 'buy' : 'sell')
            };
            
            // Add to tick buffer
            tickBufferRef.current.push(tick);
            
            // Limit tick buffer size
            if (tickBufferRef.current.length > maxTicks) {
              tickBufferRef.current = tickBufferRef.current.slice(-maxTicks);
            }
          }
          break;

        case 'orderbook':
          if (data.symbol === symbol && enableMarketDepth) {
            const marketDepth: MarketDepthData = {
              bids: data.bids?.map((bid: any) => ({
                price: bid.price,
                size: bid.size,
                total: bid.total || bid.size,
                count: bid.count || 1,
                side: 'bid' as const
              })) || [],
              asks: data.asks?.map((ask: any) => ({
                price: ask.price,
                size: ask.size,
                total: ask.total || ask.size,
                count: ask.count || 1,
                side: 'ask' as const
              })) || [],
              spread: 0,
              spreadPercentage: 0,
              midPrice: 0,
              timestamp: data.timestamp || Date.now()
            };
            
            // Calculate spread and mid price
            if (marketDepth.bids.length > 0 && marketDepth.asks.length > 0) {
              const bestBid = marketDepth.bids[0].price;
              const bestAsk = marketDepth.asks[0].price;
              marketDepth.spread = bestAsk - bestBid;
              marketDepth.midPrice = (bestBid + bestAsk) / 2;
              marketDepth.spreadPercentage = (marketDepth.spread / marketDepth.midPrice) * 100;
            }

            setState(prev => ({
              ...prev,
              marketDepth,
              lastUpdate: Date.now()
            }));
          }
          break;

        case 'trade':
          if (data.symbol === symbol) {
            const tick: TickData = {
              price: data.price,
              size: data.size,
              timestamp: data.timestamp || Date.now(),
              side: data.side
            };
            
            tickBufferRef.current.push(tick);
            
            if (tickBufferRef.current.length > maxTicks) {
              tickBufferRef.current = tickBufferRef.current.slice(-maxTicks);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      setState(prev => ({
        ...prev,
        error: 'Error processing real-time data'
      }));
    }
  }, [lastMessage, symbol, maxTicks, enableMarketDepth]);

  // Process tick buffer periodically
  useEffect(() => {
    if (enableRealTime) {
      processingIntervalRef.current = setInterval(() => {
        if (tickBufferRef.current.length > 0) {
          const currentTicks = [...tickBufferRef.current];
          
          // Update candle data
          const newCandles = processTicksToCandles(currentTicks);
          
          // Update volume profile
          let newVolumeProfile: VolumeProfileData | null = null;
          if (enableVolumeProfile) {
            newVolumeProfile = calculateVolumeProfile(currentTicks);
          }

          setState(prev => ({
            ...prev,
            candleData: mergeCandleData(prev.candleData, newCandles, maxCandles),
            tickData: currentTicks.slice(-maxTicks),
            volumeProfile: newVolumeProfile || prev.volumeProfile,
            isLoading: false,
            lastUpdate: Date.now()
          }));
        }
      }, getProcessingInterval(timeframe));
    }

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    };
  }, [enableRealTime, timeframe, maxCandles, maxTicks, enableVolumeProfile, processTicksToCandles, calculateVolumeProfile]);

  // Load initial historical data
  useEffect(() => {
    const loadHistoricalData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Simulate loading historical data
        // In production, this would fetch from your backend API
        const historicalCandles = await generateMockHistoricalData(symbol, timeframe, maxCandles);
        
        setState(prev => ({
          ...prev,
          candleData: historicalCandles,
          isLoading: false,
          lastUpdate: Date.now()
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to load historical data',
          isLoading: false
        }));
      }
    };

    loadHistoricalData();
  }, [symbol, timeframe, maxCandles]);

  // Memoized computed values
  const currentPrice = useMemo(() => {
    if (state.candleData.length > 0) {
      return state.candleData[state.candleData.length - 1].close;
    }
    if (state.tickData.length > 0) {
      return state.tickData[state.tickData.length - 1].price;
    }
    return 0;
  }, [state.candleData, state.tickData]);

  const priceChange = useMemo(() => {
    if (state.candleData.length < 2) return 0;
    const current = state.candleData[state.candleData.length - 1].close;
    const previous = state.candleData[state.candleData.length - 2].close;
    return ((current - previous) / previous) * 100;
  }, [state.candleData]);

  const volume24h = useMemo(() => {
    const last24h = state.candleData.slice(-24);
    return last24h.reduce((sum, candle) => sum + candle.volume, 0);
  }, [state.candleData]);

  // Public API
  return {
    // Data
    candleData: state.candleData,
    tickData: state.tickData,
    marketDepth: state.marketDepth,
    volumeProfile: state.volumeProfile,
    
    // Computed values
    currentPrice,
    priceChange,
    volume24h,
    
    // State
    isLoading: state.isLoading,
    error: state.error,
    isConnected,
    lastUpdate: state.lastUpdate,
    
    // Actions
    subscribe: (newSymbol: string) => {
      if (isConnected) {
        sendMessage({
          type: 'subscribe',
          channels: ['ticker', 'orderbook', 'trades'],
          symbols: [newSymbol]
        });
      }
    },
    
    unsubscribe: (symbolToRemove: string) => {
      if (isConnected) {
        sendMessage({
          type: 'unsubscribe',
          symbols: [symbolToRemove]
        });
      }
    }
  };
};

// Utility functions
function getTimeframeInMs(timeframe: string): number {
  const timeframes: Record<string, number> = {
    '1s': 1000,
    '5s': 5000,
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000
  };
  return timeframes[timeframe] || 60000;
}

function getPriceStep(maxPrice: number): number {
  if (maxPrice > 1000) return 1;
  if (maxPrice > 100) return 0.1;
  if (maxPrice > 10) return 0.01;
  return 0.001;
}

function getProcessingInterval(timeframe: string): number {
  const intervals: Record<string, number> = {
    '1s': 100,
    '5s': 500,
    '1m': 1000,
    '5m': 5000,
    '15m': 15000,
    '1h': 60000,
    '4h': 240000,
    '1d': 900000
  };
  return intervals[timeframe] || 1000;
}

function mergeCandleData(existing: OHLCVData[], newCandles: OHLCVData[], maxCandles: number): OHLCVData[] {
  const candleMap = new Map<number, OHLCVData>();
  
  // Add existing candles
  existing.forEach(candle => {
    candleMap.set(candle.time, candle);
  });
  
  // Update with new candles
  newCandles.forEach(candle => {
    candleMap.set(candle.time, candle);
  });
  
  // Sort and limit
  const merged = Array.from(candleMap.values())
    .sort((a, b) => a.time - b.time)
    .slice(-maxCandles);
    
  return merged;
}

async function generateMockHistoricalData(symbol: string, timeframe: string, count: number): Promise<OHLCVData[]> {
  // Mock historical data generation
  const timeframeMs = getTimeframeInMs(timeframe);
  const now = Date.now();
  const data: OHLCVData[] = [];
  
  let price = 100 + Math.random() * 900; // Start with random price
  
  for (let i = count - 1; i >= 0; i--) {
    const time = now - (i * timeframeMs);
    const volatility = 0.02; // 2% volatility
    
    const open = price;
    const change = (Math.random() - 0.5) * price * volatility;
    const close = Math.max(0.01, open + change);
    
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.random() * 1000000;
    
    data.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
    
    price = close;
  }
  
  return data;
}

export default useChartData;