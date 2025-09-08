'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { BarChart3, TrendingUp, Target, Activity } from 'lucide-react';

// Professional Volume Profile Types
interface VolumeNode {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  transactions: number;
  percentage: number;
}

interface VolumeProfileData {
  nodes: VolumeNode[];
  totalVolume: number;
  valueAreaHigh: number;
  valueAreaLow: number;
  pointOfControl: number;
  valueAreaVolume: number;
  timeframe: string;
}

interface VolumeProfileProps {
  data: VolumeProfileData;
  currentPrice?: number;
  height?: number;
  showValueArea?: boolean;
  showPOC?: boolean;
  showDelta?: boolean;
  onPriceClick?: (price: number) => void;
  theme?: 'light' | 'dark';
  orientation?: 'vertical' | 'horizontal';
}

interface ProcessedNode extends VolumeNode {
  barWidth: number;
  buyPercentage: number;
  sellPercentage: number;
  isInValueArea: boolean;
  isPOC: boolean;
  distanceFromPrice: number;
}

const VolumeProfile: React.FC<VolumeProfileProps> = ({
  data,
  currentPrice,
  height = 600,
  showValueArea = true,
  showPOC = true,
  showDelta = true,
  onPriceClick,
  theme = 'dark',
  orientation = 'vertical'
}) => {
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  // Process volume profile data
  const processedData = useMemo(() => {
    const { nodes, valueAreaHigh, valueAreaLow, pointOfControl } = data;
    
    if (!nodes || nodes.length === 0) return { nodes: [], stats: null };

    // Find maximum volume for scaling
    const maxVolume = Math.max(...nodes.map(node => node.volume));
    
    // Process each volume node
    const processedNodes: ProcessedNode[] = nodes.map(node => {
      const buyPercentage = node.volume > 0 ? (node.buyVolume / node.volume) * 100 : 50;
      const sellPercentage = 100 - buyPercentage;
      
      return {
        ...node,
        barWidth: (node.volume / maxVolume) * 100,
        buyPercentage,
        sellPercentage,
        isInValueArea: node.price >= valueAreaLow && node.price <= valueAreaHigh,
        isPOC: Math.abs(node.price - pointOfControl) < 0.001,
        distanceFromPrice: currentPrice ? Math.abs(node.price - currentPrice) : Infinity,
      };
    });

    // Sort by price (ascending)
    processedNodes.sort((a, b) => b.price - a.price);

    // Calculate statistics
    const valueAreaNodes = processedNodes.filter(node => node.isInValueArea);
    const totalBuyVolume = nodes.reduce((sum, node) => sum + node.buyVolume, 0);
    const totalSellVolume = nodes.reduce((sum, node) => sum + node.sellVolume, 0);
    const buyVolumePercentage = data.totalVolume > 0 ? (totalBuyVolume / data.totalVolume) * 100 : 50;
    
    const stats = {
      totalBuyVolume,
      totalSellVolume,
      buyVolumePercentage,
      sellVolumePercentage: 100 - buyVolumePercentage,
      valueAreaPercentage: data.totalVolume > 0 ? (data.valueAreaVolume / data.totalVolume) * 100 : 0,
      maxVolumeNode: processedNodes.reduce((max, node) => 
        node.volume > max.volume ? node : max, processedNodes[0]
      ),
      priceRange: processedNodes.length > 0 ? 
        processedNodes[0].price - processedNodes[processedNodes.length - 1].price : 0,
    };

    return { nodes: processedNodes, stats };
  }, [data, currentPrice]);

  // Handle price level click
  const handlePriceClick = useCallback((price: number) => {
    setSelectedPrice(price === selectedPrice ? null : price);
    onPriceClick?.(price);
  }, [selectedPrice, onPriceClick]);

  // Format price
  const formatPrice = useCallback((price: number) => {
    return price.toFixed(4);
  }, []);

  // Format volume
  const formatVolume = useCallback((volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toFixed(0);
  }, []);

  const themeClasses = {
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    header: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    card: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    buyVolume: 'bg-green-500',
    sellVolume: 'bg-red-500',
    valueArea: theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-500/20',
    poc: theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-500/30',
  };

  if (!processedData.nodes.length) {
    return (
      <div className={`${themeClasses.background} ${themeClasses.border} border rounded-lg p-8 text-center`}>
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className={themeClasses.textMuted}>No volume profile data available</p>
      </div>
    );
  }

  return (
    <div 
      className={`${themeClasses.background} ${themeClasses.border} border rounded-lg overflow-hidden`}
      style={{ height }}
    >
      {/* Header */}
      <div className={`${themeClasses.header} p-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${themeClasses.text}`}>
              Volume Profile
            </h3>
            <span className={`text-sm px-2 py-1 rounded ${themeClasses.card} ${themeClasses.textMuted}`}>
              {data.timeframe}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`text-xs px-2 py-1 rounded ${themeClasses.card} ${themeClasses.text} hover:opacity-80`}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Volume Profile Chart */}
        <div className="flex-1 p-4">
          {/* Legend */}
          <div className="flex items-center justify-between mb-4 text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                <span className={themeClasses.textMuted}>Buy Volume</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-sm" />
                <span className={themeClasses.textMuted}>Sell Volume</span>
              </div>
              {showValueArea && (
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 ${themeClasses.valueArea} border border-blue-500 rounded-sm`} />
                  <span className={themeClasses.textMuted}>Value Area (70%)</span>
                </div>
              )}
              {showPOC && (
                <div className="flex items-center space-x-1">
                  <Target className="w-3 h-3 text-yellow-500" />
                  <span className={themeClasses.textMuted}>Point of Control</span>
                </div>
              )}
            </div>
            
            <div className={`text-xs ${themeClasses.textMuted}`}>
              Total: {formatVolume(data.totalVolume)}
            </div>
          </div>

          {/* Volume Bars */}
          <div className="relative" style={{ height: height - 200 }}>
            <div className="absolute inset-0 overflow-y-auto">
              {processedData.nodes.map((node, index) => {
                const isSelected = selectedPrice === node.price;
                const isNearCurrentPrice = currentPrice && Math.abs(node.price - currentPrice) < (processedData.stats?.priceRange || 1) * 0.02;
                
                return (
                  <div
                    key={`volume-${node.price}`}
                    className={`relative mb-px group cursor-pointer ${
                      isSelected ? 'z-10' : ''
                    } ${
                      isNearCurrentPrice ? 'ring-2 ring-blue-400' : ''
                    }`}
                    onClick={() => handlePriceClick(node.price)}
                  >
                    {/* Value Area Background */}
                    {showValueArea && node.isInValueArea && (
                      <div className={`absolute inset-0 ${themeClasses.valueArea}`} />
                    )}
                    
                    {/* POC Background */}
                    {showPOC && node.isPOC && (
                      <div className={`absolute inset-0 ${themeClasses.poc} border-l-2 border-yellow-500`} />
                    )}
                    
                    {/* Volume Bar Container */}
                    <div className="relative flex items-center h-6 px-2">
                      {/* Price Label */}
                      <div className={`w-20 text-xs font-mono ${themeClasses.text} flex-shrink-0`}>
                        {formatPrice(node.price)}
                      </div>
                      
                      {/* Volume Bar */}
                      <div className="flex-1 relative">
                        <div 
                          className="h-4 flex overflow-hidden rounded-sm"
                          style={{ width: `${node.barWidth}%` }}
                        >
                          {/* Buy Volume */}
                          <div 
                            className={`${themeClasses.buyVolume} transition-all duration-200 group-hover:opacity-80`}
                            style={{ width: `${node.buyPercentage}%` }}
                          />
                          
                          {/* Sell Volume */}
                          <div 
                            className={`${themeClasses.sellVolume} transition-all duration-200 group-hover:opacity-80`}
                            style={{ width: `${node.sellPercentage}%` }}
                          />
                        </div>
                        
                        {/* Volume Label */}
                        <div className={`absolute right-2 top-0 text-xs ${themeClasses.textMuted} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          {formatVolume(node.volume)}
                        </div>
                      </div>
                      
                      {/* Delta Indicator */}
                      {showDelta && (
                        <div className="w-12 text-xs text-right">
                          <span className={node.buyVolume > node.sellVolume ? 'text-green-400' : 'text-red-400'}>
                            {node.buyVolume > node.sellVolume ? '+' : '-'}
                            {Math.abs(node.buyVolume - node.sellVolume).toFixed(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-blue-400 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Current Price Line */}
            {currentPrice && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-blue-400 z-20 pointer-events-none"
                style={{
                  top: `${((processedData.nodes[0]?.price - currentPrice) / (processedData.stats?.priceRange || 1)) * 100}%`
                }}
              >
                <div className="absolute left-2 -top-3 text-xs bg-blue-400 text-white px-1 rounded">
                  {formatPrice(currentPrice)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Panel */}
        {showDetails && processedData.stats && (
          <div className={`w-80 ${themeClasses.border} border-l overflow-y-auto`}>
            <div className="p-4 space-y-4">
              {/* Key Metrics */}
              <div className={`${themeClasses.card} p-3 rounded-lg`}>
                <h4 className={`font-medium mb-3 ${themeClasses.text} flex items-center`}>
                  <Target className="w-4 h-4 mr-2" />
                  Key Levels
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={themeClasses.textMuted}>Point of Control:</span>
                    <span className={`font-mono ${themeClasses.text} font-semibold text-yellow-500`}>
                      ${formatPrice(data.pointOfControl)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={themeClasses.textMuted}>Value Area High:</span>
                    <span className={`font-mono ${themeClasses.text}`}>
                      ${formatPrice(data.valueAreaHigh)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={themeClasses.textMuted}>Value Area Low:</span>
                    <span className={`font-mono ${themeClasses.text}`}>
                      ${formatPrice(data.valueAreaLow)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t border-gray-600">
                    <span className={themeClasses.textMuted}>VA Volume %:</span>
                    <span className={`font-mono ${themeClasses.text}`}>
                      {processedData.stats.valueAreaPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume Statistics */}
              <div className={`${themeClasses.card} p-3 rounded-lg`}>
                <h4 className={`font-medium mb-3 ${themeClasses.text} flex items-center`}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Volume Analysis
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={themeClasses.textMuted}>Total Volume:</span>
                    <span className={`font-mono ${themeClasses.text}`}>
                      {formatVolume(data.totalVolume)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-400">Buy Volume:</span>
                    <span className="font-mono text-green-400">
                      {formatVolume(processedData.stats.totalBuyVolume)}
                      <span className="text-xs ml-1">
                        ({processedData.stats.buyVolumePercentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-red-400">Sell Volume:</span>
                    <span className="font-mono text-red-400">
                      {formatVolume(processedData.stats.totalSellVolume)}
                      <span className="text-xs ml-1">
                        ({processedData.stats.sellVolumePercentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  
                  {/* Volume Imbalance Bar */}
                  <div className="pt-2">
                    <div className="text-xs text-gray-400 mb-1">Volume Imbalance</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-red-400 h-2 rounded-full"
                        style={{ 
                          background: `linear-gradient(to right, #4ade80 ${processedData.stats.buyVolumePercentage}%, #f87171 ${processedData.stats.buyVolumePercentage}%)`
                        }}
                      />
                    </div>
                    <div className={`text-xs mt-1 ${processedData.stats.buyVolumePercentage > 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {processedData.stats.buyVolumePercentage > 50 ? 'Bullish' : 'Bearish'} bias
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Price Details */}
              {selectedPrice !== null && (
                <div className={`${themeClasses.card} p-3 rounded-lg border-2 border-blue-400`}>
                  <h4 className={`font-medium mb-3 ${themeClasses.text}`}>
                    Price Level Details
                  </h4>
                  
                  {(() => {
                    const selectedNode = processedData.nodes.find(n => n.price === selectedPrice);
                    if (!selectedNode) return null;
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={themeClasses.textMuted}>Price:</span>
                          <span className={`font-mono ${themeClasses.text} font-semibold`}>
                            ${formatPrice(selectedNode.price)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className={themeClasses.textMuted}>Total Volume:</span>
                          <span className={`font-mono ${themeClasses.text}`}>
                            {formatVolume(selectedNode.volume)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-green-400">Buy Volume:</span>
                          <span className="font-mono text-green-400">
                            {formatVolume(selectedNode.buyVolume)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-red-400">Sell Volume:</span>
                          <span className="font-mono text-red-400">
                            {formatVolume(selectedNode.sellVolume)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className={themeClasses.textMuted}>Transactions:</span>
                          <span className={`font-mono ${themeClasses.text}`}>
                            {selectedNode.transactions.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className={themeClasses.textMuted}>% of Total:</span>
                          <span className={`font-mono ${themeClasses.text}`}>
                            {selectedNode.percentage.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`${themeClasses.header} p-2 border-t ${themeClasses.border}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={themeClasses.textMuted}>
            Click price levels for details • POC: Point of Control • VA: Value Area (70% volume)
          </span>
          <span className={themeClasses.textMuted}>
            {processedData.nodes.length} price levels
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(VolumeProfile);