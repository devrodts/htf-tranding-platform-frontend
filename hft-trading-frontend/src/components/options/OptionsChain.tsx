'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity,
  Filter,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';

// Professional Options Types
export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionData {
  strike: number;
  expiration: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  greeks: OptionGreeks;
  intrinsicValue: number;
  timeValue: number;
  breakeven: number;
  moneyness: 'ITM' | 'ATM' | 'OTM';
  lastTrade?: {
    price: number;
    size: number;
    timestamp: number;
  };
}

export interface OptionsChainData {
  symbol: string;
  underlyingPrice: number;
  expirations: string[];
  strikes: number[];
  options: Record<string, Record<number, { call?: OptionData; put?: OptionData }>>;
  timestamp: number;
}

interface OptionsChainProps {
  symbol: string;
  data: OptionsChainData;
  selectedExpiration?: string;
  onExpirationChange?: (expiration: string) => void;
  onOptionSelect?: (option: OptionData) => void;
  onOptionTrade?: (option: OptionData, action: 'buy' | 'sell') => void;
  showGreeks?: boolean;
  showVolume?: boolean;
  showOpenInterest?: boolean;
  theme?: 'light' | 'dark';
  maxStrikes?: number;
}

interface FilterState {
  moneyness: 'all' | 'ITM' | 'ATM' | 'OTM';
  minVolume: number;
  maxStrike: number | null;
  minStrike: number | null;
  showZeroBid: boolean;
}

const OptionsChain: React.FC<OptionsChainProps> = ({
  symbol,
  data,
  selectedExpiration,
  onExpirationChange,
  onOptionSelect,
  onOptionTrade,
  showGreeks = true,
  showVolume = true,
  showOpenInterest = true,
  theme = 'dark',
  maxStrikes = 50
}) => {
  const [currentExpiration, setCurrentExpiration] = useState(
    selectedExpiration || data.expirations[0] || ''
  );
  const [selectedOption, setSelectedOption] = useState<OptionData | null>(null);
  const [sortBy, setSortBy] = useState<'strike' | 'volume' | 'iv' | 'delta'>('strike');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<FilterState>({
    moneyness: 'all',
    minVolume: 0,
    maxStrike: null,
    minStrike: null,
    showZeroBid: true
  });
  const [showFilters, setShowFilters] = useState(false);

  // Process and filter options data
  const processedOptions = useMemo(() => {
    const expirationData = data.options[currentExpiration];
    if (!expirationData) return [];

    let strikes = Object.keys(expirationData).map(Number).sort((a, b) => a - b);

    // Apply filters
    strikes = strikes.filter(strike => {
      const callOption = expirationData[strike]?.call;
      const putOption = expirationData[strike]?.put;

      // Strike range filter
      if (filters.minStrike && strike < filters.minStrike) return false;
      if (filters.maxStrike && strike > filters.maxStrike) return false;

      // Volume filter
      const totalVolume = (callOption?.volume || 0) + (putOption?.volume || 0);
      if (totalVolume < filters.minVolume) return false;

      // Zero bid filter
      if (!filters.showZeroBid) {
        const hasValidBid = (callOption?.bid || 0) > 0 || (putOption?.bid || 0) > 0;
        if (!hasValidBid) return false;
      }

      // Moneyness filter
      if (filters.moneyness !== 'all') {
        const callMoneyness = callOption?.moneyness;
        const putMoneyness = putOption?.moneyness;
        if (callMoneyness !== filters.moneyness && putMoneyness !== filters.moneyness) {
          return false;
        }
      }

      return true;
    });

    // Sort strikes
    if (sortBy === 'strike') {
      strikes.sort((a, b) => sortOrder === 'asc' ? a - b : b - a);
    } else if (sortBy === 'volume') {
      strikes.sort((a, b) => {
        const aVol = (expirationData[a]?.call?.volume || 0) + (expirationData[a]?.put?.volume || 0);
        const bVol = (expirationData[b]?.call?.volume || 0) + (expirationData[b]?.put?.volume || 0);
        return sortOrder === 'asc' ? aVol - bVol : bVol - aVol;
      });
    } else if (sortBy === 'iv') {
      strikes.sort((a, b) => {
        const aIV = Math.max(
          expirationData[a]?.call?.impliedVolatility || 0,
          expirationData[a]?.put?.impliedVolatility || 0
        );
        const bIV = Math.max(
          expirationData[b]?.call?.impliedVolatility || 0,
          expirationData[b]?.put?.impliedVolatility || 0
        );
        return sortOrder === 'asc' ? aIV - bIV : bIV - aIV;
      });
    }

    // Limit strikes
    strikes = strikes.slice(0, maxStrikes);

    return strikes.map(strike => ({
      strike,
      call: expirationData[strike]?.call,
      put: expirationData[strike]?.put
    }));
  }, [data.options, currentExpiration, filters, sortBy, sortOrder, maxStrikes]);

  // Handle expiration change
  const handleExpirationChange = useCallback((expiration: string) => {
    setCurrentExpiration(expiration);
    onExpirationChange?.(expiration);
  }, [onExpirationChange]);

  // Handle option selection
  const handleOptionClick = useCallback((option: OptionData) => {
    setSelectedOption(option);
    onOptionSelect?.(option);
  }, [onOptionSelect]);

  // Format number with appropriate precision
  const formatNumber = useCallback((num: number, decimals: number = 2): string => {
    if (num === 0) return '0.00';
    return num.toFixed(decimals);
  }, []);

  // Format percentage
  const formatPercent = useCallback((num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  }, []);

  // Get color based on moneyness
  const getMoneynessColor = useCallback((moneyness: string): string => {
    switch (moneyness) {
      case 'ITM':
        return 'text-green-400';
      case 'ATM':
        return 'text-yellow-400';
      case 'OTM':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  }, []);

  // Calculate days to expiration
  const getDaysToExpiration = useCallback((expiration: string): number => {
    const expirationDate = new Date(expiration);
    const now = new Date();
    return Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  const themeClasses = {
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    header: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    card: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    hover: theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100',
    selected: theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100/30',
  };

  return (
    <div className={`${themeClasses.background} ${themeClasses.border} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${themeClasses.header} p-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <h3 className={`font-semibold ${themeClasses.text}`}>
                Options Chain - {symbol}
              </h3>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${themeClasses.textMuted}`}>Underlying:</span>
              <span className={`font-mono font-semibold ${themeClasses.text}`}>
                ${formatNumber(data.underlyingPrice, 2)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded ${themeClasses.card} ${themeClasses.hover}`}
              title="Filter Options"
            >
              <Filter className="w-4 h-4" />
            </button>
            
            <button className={`p-2 rounded ${themeClasses.card} ${themeClasses.hover}`} title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            
            <button className={`p-2 rounded ${themeClasses.card} ${themeClasses.hover}`} title="Export">
              <Download className="w-4 h-4" />
            </button>
            
            <button className={`p-2 rounded ${themeClasses.card} ${themeClasses.hover}`} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expiration Selector */}
        <div className="mt-4">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className={themeClasses.textMuted}>Expiration:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {data.expirations.map(expiration => {
              const daysToExp = getDaysToExpiration(expiration);
              const isSelected = expiration === currentExpiration;
              
              return (
                <button
                  key={expiration}
                  onClick={() => handleExpirationChange(expiration)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : `${themeClasses.card} ${themeClasses.border} ${themeClasses.hover}`
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-medium">
                      {new Date(expiration).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className={`text-xs ${isSelected ? 'text-blue-200' : themeClasses.textMuted}`}>
                      {daysToExp}d
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className={`mt-4 p-3 ${themeClasses.card} rounded-lg`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className={`block mb-1 ${themeClasses.textMuted}`}>Moneyness</label>
                <select
                  value={filters.moneyness}
                  onChange={(e) => setFilters(prev => ({ ...prev, moneyness: e.target.value as any }))}
                  className={`w-full p-2 rounded border ${themeClasses.background} ${themeClasses.border}`}
                >
                  <option value="all">All</option>
                  <option value="ITM">In-The-Money</option>
                  <option value="ATM">At-The-Money</option>
                  <option value="OTM">Out-of-The-Money</option>
                </select>
              </div>
              
              <div>
                <label className={`block mb-1 ${themeClasses.textMuted}`}>Min Volume</label>
                <input
                  type="number"
                  value={filters.minVolume}
                  onChange={(e) => setFilters(prev => ({ ...prev, minVolume: Number(e.target.value) }))}
                  className={`w-full p-2 rounded border ${themeClasses.background} ${themeClasses.border}`}
                  min="0"
                />
              </div>
              
              <div>
                <label className={`block mb-1 ${themeClasses.textMuted}`}>Strike Range</label>
                <div className="flex space-x-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minStrike || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minStrike: e.target.value ? Number(e.target.value) : null 
                    }))}
                    className={`w-full p-2 rounded border ${themeClasses.background} ${themeClasses.border}`}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxStrike || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxStrike: e.target.value ? Number(e.target.value) : null 
                    }))}
                    className={`w-full p-2 rounded border ${themeClasses.background} ${themeClasses.border}`}
                  />
                </div>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showZeroBid}
                    onChange={(e) => setFilters(prev => ({ ...prev, showZeroBid: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className={`text-sm ${themeClasses.textMuted}`}>Show Zero Bid</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options Chain Table */}
      <div className="overflow-x-auto">
        {/* Table Header */}
        <div className={`grid grid-cols-13 gap-2 p-2 text-xs font-medium ${themeClasses.textMuted} ${themeClasses.header} border-b ${themeClasses.border}`}>
          {/* Call Headers */}
          <div className="col-span-6 grid grid-cols-6 gap-2">
            <span className="text-center">OI</span>
            <span className="text-center">Vol</span>
            <span className="text-center">IV</span>
            <span className="text-center">Delta</span>
            <span className="text-center">Bid</span>
            <span className="text-center">Ask</span>
          </div>
          
          {/* Strike Header */}
          <div className="text-center font-bold">
            Strike
          </div>
          
          {/* Put Headers */}
          <div className="col-span-6 grid grid-cols-6 gap-2">
            <span className="text-center">Bid</span>
            <span className="text-center">Ask</span>
            <span className="text-center">Delta</span>
            <span className="text-center">IV</span>
            <span className="text-center">Vol</span>
            <span className="text-center">OI</span>
          </div>
        </div>

        {/* Options Data */}
        <div className="max-h-96 overflow-y-auto">
          {processedOptions.map(({ strike, call, put }, index) => {
            const isAtTheMoney = Math.abs(strike - data.underlyingPrice) < 5; // Within $5
            
            return (
              <div 
                key={`${strike}-${index}`}
                className={`grid grid-cols-13 gap-2 p-2 text-xs border-b ${themeClasses.border} ${themeClasses.hover} ${
                  isAtTheMoney ? 'bg-yellow-500/5' : ''
                }`}
              >
                {/* Call Option Data */}
                <div className="col-span-6 grid grid-cols-6 gap-2">
                  {call ? (
                    <>
                      <span className="text-center">{call.openInterest.toLocaleString()}</span>
                      <span className="text-center">{call.volume.toLocaleString()}</span>
                      <span className="text-center">{formatPercent(call.impliedVolatility)}</span>
                      <span className={`text-center ${call.greeks.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatNumber(call.greeks.delta, 3)}
                      </span>
                      <button
                        onClick={() => handleOptionClick(call)}
                        className="text-center text-green-400 hover:bg-green-500/20 rounded px-1"
                      >
                        {formatNumber(call.bid, 2)}
                      </button>
                      <button
                        onClick={() => handleOptionClick(call)}
                        className="text-center text-red-400 hover:bg-red-500/20 rounded px-1"
                      >
                        {formatNumber(call.ask, 2)}
                      </button>
                    </>
                  ) : (
                    Array(6).fill(null).map((_, i) => <span key={i} className="text-center">-</span>)
                  )}
                </div>

                {/* Strike Price */}
                <div className={`text-center font-mono font-bold ${
                  strike === data.underlyingPrice ? 'text-yellow-400' :
                  strike < data.underlyingPrice ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatNumber(strike, 0)}
                </div>

                {/* Put Option Data */}
                <div className="col-span-6 grid grid-cols-6 gap-2">
                  {put ? (
                    <>
                      <button
                        onClick={() => handleOptionClick(put)}
                        className="text-center text-green-400 hover:bg-green-500/20 rounded px-1"
                      >
                        {formatNumber(put.bid, 2)}
                      </button>
                      <button
                        onClick={() => handleOptionClick(put)}
                        className="text-center text-red-400 hover:bg-red-500/20 rounded px-1"
                      >
                        {formatNumber(put.ask, 2)}
                      </button>
                      <span className={`text-center ${put.greeks.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatNumber(put.greeks.delta, 3)}
                      </span>
                      <span className="text-center">{formatPercent(put.impliedVolatility)}</span>
                      <span className="text-center">{put.volume.toLocaleString()}</span>
                      <span className="text-center">{put.openInterest.toLocaleString()}</span>
                    </>
                  ) : (
                    Array(6).fill(null).map((_, i) => <span key={i} className="text-center">-</span>)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Option Details */}
      {selectedOption && (
        <div className={`p-4 border-t ${themeClasses.border} ${themeClasses.header}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-medium ${themeClasses.text}`}>
                {symbol} {selectedOption.strike} {selectedOption.type.toUpperCase()} • {selectedOption.expiration}
              </h4>
              <div className="flex items-center space-x-4 mt-1 text-sm">
                <span className={getMoneynessColor(selectedOption.moneyness)}>
                  {selectedOption.moneyness}
                </span>
                <span className={themeClasses.textMuted}>
                  IV: {formatPercent(selectedOption.impliedVolatility)}
                </span>
                <span className={themeClasses.textMuted}>
                  Vol: {selectedOption.volume.toLocaleString()}
                </span>
                <span className={themeClasses.textMuted}>
                  OI: {selectedOption.openInterest.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => onOptionTrade?.(selectedOption, 'buy')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium"
              >
                Buy ${formatNumber(selectedOption.ask, 2)}
              </button>
              <button
                onClick={() => onOptionTrade?.(selectedOption, 'sell')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium"
              >
                Sell ${formatNumber(selectedOption.bid, 2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`${themeClasses.header} p-2 border-t ${themeClasses.border}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={themeClasses.textMuted}>
            {processedOptions.length} strikes shown • Click prices to view details
          </span>
          <span className={themeClasses.textMuted}>
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OptionsChain);