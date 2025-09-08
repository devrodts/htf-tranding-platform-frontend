'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';

// Professional Market Depth Types
interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  count: number;
  side: 'bid' | 'ask';
}

interface MarketDepthData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercentage: number;
  midPrice: number;
  timestamp: number;
}

interface MarketDepthProps {
  symbol: string;
  data: MarketDepthData;
  maxLevels?: number;
  precision?: number;
  onPriceClick?: (price: number, side: 'bid' | 'ask') => void;
  showSpreadInfo?: boolean;
  animateChanges?: boolean;
  theme?: 'light' | 'dark';
  height?: number;
}

interface PriceLevel {
  price: number;
  size: number;
  total: number;
  count: number;
  percentage: number;
  barWidth: number;
  isChanged?: boolean;
  changeType?: 'increase' | 'decrease' | 'new';
}

const MarketDepth: React.FC<MarketDepthProps> = ({
  symbol,
  data,
  maxLevels = 20,
  precision = 4,
  onPriceClick,
  showSpreadInfo = true,
  animateChanges = true,
  theme = 'dark',
  height = 600
}) => {
  const [previousData, setPreviousData] = useState<MarketDepthData | null>(null);
  const [highlightedChanges, setHighlightedChanges] = useState<Set<number>>(new Set());

  // Process and normalize order book data
  const processedData = useMemo(() => {
    const { bids, asks } = data;
    
    // Limit levels and calculate percentages
    const limitedBids = bids.slice(0, maxLevels);
    const limitedAsks = asks.slice(0, maxLevels);
    
    // Find maximum size for bar scaling
    const maxBidSize = Math.max(...limitedBids.map(level => level.size), 0);
    const maxAskSize = Math.max(...limitedAsks.map(level => level.size), 0);
    const maxSize = Math.max(maxBidSize, maxAskSize);
    
    // Calculate total volume for percentage calculations
    const totalBidVolume = limitedBids.reduce((sum, level) => sum + level.size, 0);
    const totalAskVolume = limitedAsks.reduce((sum, level) => sum + level.size, 0);
    
    // Process bids (descending price order)
    const processedBids: PriceLevel[] = limitedBids.map(level => ({
      price: level.price,
      size: level.size,
      total: level.total,
      count: level.count,
      percentage: (level.size / totalBidVolume) * 100,
      barWidth: (level.size / maxSize) * 100,
    }));
    
    // Process asks (ascending price order)
    const processedAsks: PriceLevel[] = limitedAsks.map(level => ({
      price: level.price,
      size: level.size,
      total: level.total,
      count: level.count,
      percentage: (level.size / totalAskVolume) * 100,
      barWidth: (level.size / maxSize) * 100,
    }));

    return {
      bids: processedBids,
      asks: processedAsks,
      maxSize,
      totalBidVolume,
      totalAskVolume,
    };
  }, [data, maxLevels]);

  // Detect changes for animation
  useEffect(() => {
    if (previousData && animateChanges) {
      const changedPrices = new Set<number>();
      
      // Check for changes in bids
      data.bids.forEach(currentLevel => {
        const previousLevel = previousData.bids.find(l => l.price === currentLevel.price);
        if (!previousLevel || previousLevel.size !== currentLevel.size) {
          changedPrices.add(currentLevel.price);
        }
      });
      
      // Check for changes in asks
      data.asks.forEach(currentLevel => {
        const previousLevel = previousData.asks.find(l => l.price === currentLevel.price);
        if (!previousLevel || previousLevel.size !== currentLevel.size) {
          changedPrices.add(currentLevel.price);
        }
      });
      
      setHighlightedChanges(changedPrices);
      
      // Clear highlights after animation
      const timer = setTimeout(() => {
        setHighlightedChanges(new Set());
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    setPreviousData(data);
  }, [data, previousData, animateChanges]);

  // Handle price level click
  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    if (onPriceClick) {
      onPriceClick(price, side);
    }
  }, [onPriceClick]);

  // Format number for display
  const formatNumber = useCallback((num: number, digits: number = precision) => {
    return num.toFixed(digits);
  }, [precision]);

  // Format size with appropriate units
  const formatSize = useCallback((size: number) => {
    if (size >= 1000000) {
      return `${(size / 1000000).toFixed(2)}M`;
    } else if (size >= 1000) {
      return `${(size / 1000).toFixed(1)}K`;
    }
    return size.toFixed(0);
  }, []);

  const themeClasses = {
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    header: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    bidRow: theme === 'dark' ? 'hover:bg-green-900/20' : 'hover:bg-green-50',
    askRow: theme === 'dark' ? 'hover:bg-red-900/20' : 'hover:bg-red-50',
    bidBar: 'bg-green-500/20',
    askBar: 'bg-red-500/20',
    spreadBox: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
  };

  return (
    <div 
      className={`${themeClasses.background} ${themeClasses.border} border rounded-lg overflow-hidden`}
      style={{ height }}
    >
      {/* Header */}
      <div className={`${themeClasses.header} ${themeClasses.border} p-3 border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${themeClasses.text}`}>
              Market Depth - {symbol}
            </h3>
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <span className={themeClasses.textMuted}>
              Levels: {Math.min(data.bids.length, data.asks.length, maxLevels)}
            </span>
            <span className={themeClasses.textMuted}>
              Last: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Order Book */}
        <div className="flex-1">
          {/* Column Headers */}
          <div className={`grid grid-cols-5 gap-2 p-2 text-xs font-medium ${themeClasses.textMuted} ${themeClasses.header} border-b ${themeClasses.border}`}>
            <span className="text-right">Total</span>
            <span className="text-right">Size</span>
            <span className="text-right">Bid</span>
            <span className="text-left">Ask</span>
            <span className="text-left">Size</span>
          </div>
          
          {/* Order Book Rows */}
          <div className="overflow-y-auto" style={{ height: height - 140 }}>
            {Array.from({ length: maxLevels }).map((_, index) => {
              const bid = processedData.bids[maxLevels - 1 - index];
              const ask = processedData.asks[index];
              
              return (
                <div key={`level-${index}`} className="grid grid-cols-5 gap-2 relative">
                  {/* Bid Side */}
                  <div className="col-span-3 relative">
                    {bid && (
                      <>
                        {/* Bid Volume Bar */}
                        <div
                          className={`absolute inset-y-0 right-0 ${themeClasses.bidBar} transition-all duration-300`}
                          style={{ width: `${bid.barWidth}%` }}
                        />
                        
                        {/* Bid Data */}
                        <div 
                          className={`relative grid grid-cols-3 gap-2 p-1 cursor-pointer ${themeClasses.bidRow} ${
                            highlightedChanges.has(bid.price) ? 'animate-pulse bg-green-400/30' : ''
                          }`}
                          onClick={() => handlePriceClick(bid.price, 'bid')}
                        >
                          <span className="text-xs text-right font-mono text-gray-400">
                            {formatSize(bid.total)}
                          </span>
                          <span className="text-xs text-right font-mono text-green-400">
                            {formatSize(bid.size)}
                          </span>
                          <span className="text-xs text-right font-mono text-green-400 font-semibold">
                            {formatNumber(bid.price)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Ask Side */}
                  <div className="col-span-2 relative">
                    {ask && (
                      <>
                        {/* Ask Volume Bar */}
                        <div
                          className={`absolute inset-y-0 left-0 ${themeClasses.askBar} transition-all duration-300`}
                          style={{ width: `${ask.barWidth}%` }}
                        />
                        
                        {/* Ask Data */}
                        <div 
                          className={`relative grid grid-cols-2 gap-2 p-1 cursor-pointer ${themeClasses.askRow} ${
                            highlightedChanges.has(ask.price) ? 'animate-pulse bg-red-400/30' : ''
                          }`}
                          onClick={() => handlePriceClick(ask.price, 'ask')}
                        >
                          <span className="text-xs text-left font-mono text-red-400 font-semibold">
                            {formatNumber(ask.price)}
                          </span>
                          <span className="text-xs text-left font-mono text-red-400">
                            {formatSize(ask.size)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spread Information Panel */}
        {showSpreadInfo && (
          <div className={`w-64 ${themeClasses.border} border-l`}>
            <div className={`${themeClasses.spreadBox} p-4 border-b ${themeClasses.border}`}>
              <h4 className={`font-medium mb-3 ${themeClasses.text} flex items-center`}>
                <DollarSign className="w-4 h-4 mr-2" />
                Spread Analysis
              </h4>
              
              <div className="space-y-3">
                <div>
                  <span className={`text-xs ${themeClasses.textMuted}`}>Spread</span>
                  <div className={`text-lg font-mono ${themeClasses.text}`}>
                    ${formatNumber(data.spread, 6)}
                  </div>
                  <div className="text-sm text-yellow-500">
                    {data.spreadPercentage.toFixed(4)}%
                  </div>
                </div>
                
                <div>
                  <span className={`text-xs ${themeClasses.textMuted}`}>Mid Price</span>
                  <div className={`text-lg font-mono ${themeClasses.text}`}>
                    ${formatNumber(data.midPrice)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-xs text-gray-400">Total Bids</div>
                    <div className="font-mono text-green-400 text-sm">
                      {formatSize(processedData.totalBidVolume)}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-xs text-gray-400">Total Asks</div>
                    <div className="font-mono text-red-400 text-sm">
                      {formatSize(processedData.totalAskVolume)}
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <span className={`text-xs ${themeClasses.textMuted}`}>Bid/Ask Ratio</span>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-red-400 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        background: `linear-gradient(to right, #4ade80 ${(processedData.totalBidVolume / (processedData.totalBidVolume + processedData.totalAskVolume)) * 100}%, #f87171 ${(processedData.totalBidVolume / (processedData.totalBidVolume + processedData.totalAskVolume)) * 100}%)`
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((processedData.totalBidVolume / processedData.totalAskVolume) * 100).toFixed(1)}% bullish
                  </div>
                </div>
              </div>
            </div>
            
            {/* Market Statistics */}
            <div className="p-4">
              <h5 className={`font-medium mb-3 text-sm ${themeClasses.text}`}>Market Stats</h5>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Best Bid:</span>
                  <span className="font-mono text-green-400">
                    ${formatNumber(data.bids[0]?.price || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Best Ask:</span>
                  <span className="font-mono text-red-400">
                    ${formatNumber(data.asks[0]?.price || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Bid Size:</span>
                  <span className="font-mono text-green-400">
                    {formatSize(data.bids[0]?.size || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Ask Size:</span>
                  <span className="font-mono text-red-400">
                    {formatSize(data.asks[0]?.size || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className={themeClasses.textMuted}>Depth:</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {data.bids.length}/{data.asks.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={`${themeClasses.header} p-2 border-t ${themeClasses.border}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={themeClasses.textMuted}>
            Click price levels to place orders
          </span>
          <span className={themeClasses.textMuted}>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MarketDepth);