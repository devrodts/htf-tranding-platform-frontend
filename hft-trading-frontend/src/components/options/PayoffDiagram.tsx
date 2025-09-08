'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  Settings,
  Download,
  Maximize2,
  RotateCcw
} from 'lucide-react';

// Types from StrategyBuilder
interface OptionLeg {
  id: string;
  type: 'call' | 'put';
  action: 'buy' | 'sell';
  strike: number;
  expiration: string;
  quantity: number;
  premium: number;
  impliedVolatility: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
  };
}

interface PayoffPoint {
  underlyingPrice: number;
  payoff: number;
  payoffAtExpiration: number;
  probabilityDensity?: number;
  breakeven?: boolean;
  maxProfit?: boolean;
  maxLoss?: boolean;
}

interface PayoffDiagramProps {
  legs: OptionLeg[];
  currentPrice: number;
  symbol: string;
  volatility?: number;
  riskFreeRate?: number;
  dividendYield?: number;
  daysToExpiration?: number;
  priceRange?: [number, number];
  showProbability?: boolean;
  showTimeDecay?: boolean;
  showBreakeven?: boolean;
  showGreeks?: boolean;
  theme?: 'light' | 'dark';
  onPriceHover?: (price: number, payoff: number) => void;
}

const PayoffDiagram: React.FC<PayoffDiagramProps> = ({
  legs,
  currentPrice,
  symbol,
  volatility = 0.25,
  riskFreeRate = 0.02,
  dividendYield = 0,
  daysToExpiration = 30,
  priceRange,
  showProbability = true,
  showTimeDecay = true,
  showBreakeven = true,
  showGreeks = false,
  theme = 'dark',
  onPriceHover
}) => {
  const [timeToExpiration, setTimeToExpiration] = useState(daysToExpiration);
  const [selectedVolatility, setSelectedVolatility] = useState(volatility);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<PayoffPoint | null>(null);

  // Calculate price range if not provided
  const calculatedPriceRange = useMemo((): [number, number] => {
    if (priceRange) return priceRange;
    
    const strikes = legs.map(leg => leg.strike);
    const minStrike = Math.min(...strikes, currentPrice);
    const maxStrike = Math.max(...strikes, currentPrice);
    const range = Math.max(maxStrike - minStrike, currentPrice * 0.4);
    
    return [
      Math.max(0.01, currentPrice - range * 0.6),
      currentPrice + range * 0.6
    ];
  }, [legs, currentPrice, priceRange]);

  // Black-Scholes option pricing function
  const calculateOptionPrice = useCallback((
    spotPrice: number,
    strike: number,
    timeToExp: number,
    vol: number,
    rate: number,
    dividend: number,
    optionType: 'call' | 'put'
  ): number => {
    if (timeToExp <= 0) {
      // At expiration, option value is intrinsic value
      if (optionType === 'call') {
        return Math.max(0, spotPrice - strike);
      } else {
        return Math.max(0, strike - spotPrice);
      }
    }

    const t = timeToExp / 365;
    const d1 = (Math.log(spotPrice / strike) + (rate - dividend + 0.5 * vol * vol) * t) / (vol * Math.sqrt(t));
    const d2 = d1 - vol * Math.sqrt(t);

    const normCDF = (x: number): number => {
      return 0.5 * (1 + erf(x / Math.sqrt(2)));
    };

    const erf = (x: number): number => {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;
      
      const sign = x >= 0 ? 1 : -1;
      x = Math.abs(x);
      
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      
      return sign * y;
    };

    if (optionType === 'call') {
      return spotPrice * Math.exp(-dividend * t) * normCDF(d1) - strike * Math.exp(-rate * t) * normCDF(d2);
    } else {
      return strike * Math.exp(-rate * t) * normCDF(-d2) - spotPrice * Math.exp(-dividend * t) * normCDF(-d1);
    }
  }, []);

  // Calculate payoff data points
  const payoffData = useMemo((): PayoffPoint[] => {
    const [minPrice, maxPrice] = calculatedPriceRange;
    const points: PayoffPoint[] = [];
    const numPoints = 200;
    const priceStep = (maxPrice - minPrice) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const underlyingPrice = minPrice + i * priceStep;
      let currentPayoff = 0;
      let expirationPayoff = 0;

      // Calculate payoff for each leg
      legs.forEach(leg => {
        const multiplier = leg.action === 'buy' ? 1 : -1;
        const contractMultiplier = 100; // Standard option contract size

        // Current payoff (with time value)
        const currentOptionValue = calculateOptionPrice(
          underlyingPrice,
          leg.strike,
          timeToExpiration,
          selectedVolatility,
          riskFreeRate,
          dividendYield,
          leg.type
        );

        // Payoff at expiration (intrinsic value only)
        const expirationValue = leg.type === 'call' 
          ? Math.max(0, underlyingPrice - leg.strike)
          : Math.max(0, leg.strike - underlyingPrice);

        // Account for premium paid/received
        const premiumCost = leg.action === 'buy' ? -leg.premium : leg.premium;

        currentPayoff += (multiplier * currentOptionValue + premiumCost) * leg.quantity * contractMultiplier;
        expirationPayoff += (multiplier * expirationValue + premiumCost) * leg.quantity * contractMultiplier;
      });

      // Calculate probability density for this price (log-normal distribution)
      const mu = Math.log(currentPrice) + (riskFreeRate - dividendYield - 0.5 * selectedVolatility * selectedVolatility) * (timeToExpiration / 365);
      const sigma = selectedVolatility * Math.sqrt(timeToExpiration / 365);
      const probabilityDensity = (1 / (underlyingPrice * sigma * Math.sqrt(2 * Math.PI))) * 
        Math.exp(-0.5 * Math.pow((Math.log(underlyingPrice) - mu) / sigma, 2));

      points.push({
        underlyingPrice,
        payoff: currentPayoff,
        payoffAtExpiration: expirationPayoff,
        probabilityDensity: probabilityDensity * 1000, // Scale for visualization
        breakeven: Math.abs(expirationPayoff) < 50, // Within $50 of breakeven
        maxProfit: false,
        maxLoss: false
      });
    }

    // Mark max profit and max loss points
    const maxProfitValue = Math.max(...points.map(p => p.payoffAtExpiration));
    const maxLossValue = Math.min(...points.map(p => p.payoffAtExpiration));
    
    points.forEach(point => {
      if (Math.abs(point.payoffAtExpiration - maxProfitValue) < 1) {
        point.maxProfit = true;
      }
      if (Math.abs(point.payoffAtExpiration - maxLossValue) < 1) {
        point.maxLoss = true;
      }
    });

    return points;
  }, [legs, calculatedPriceRange, timeToExpiration, selectedVolatility, riskFreeRate, dividendYield, currentPrice, calculateOptionPrice]);

  // Find breakeven points
  const breakevenPoints = useMemo(() => {
    const breakevens: number[] = [];
    
    for (let i = 1; i < payoffData.length; i++) {
      const prev = payoffData[i - 1].payoffAtExpiration;
      const curr = payoffData[i].payoffAtExpiration;
      
      // Check if payoff crosses zero
      if ((prev <= 0 && curr > 0) || (prev > 0 && curr <= 0)) {
        // Linear interpolation to find exact breakeven point
        const ratio = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
        const breakevenPrice = payoffData[i - 1].underlyingPrice + 
          ratio * (payoffData[i].underlyingPrice - payoffData[i - 1].underlyingPrice);
        breakevens.push(breakevenPrice);
      }
    }
    
    return breakevens;
  }, [payoffData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload as PayoffPoint;
    
    return (
      <div className={`p-3 rounded-lg border shadow-lg ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-600 text-white' 
          : 'bg-white border-gray-300 text-gray-900'
      }`}>
        <div className="font-medium mb-2">
          Underlying: ${Number(label).toFixed(2)}
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between space-x-4">
            <span>Current P&L:</span>
            <span className={`font-mono ${data.payoff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.payoff >= 0 ? '+' : ''}${data.payoff.toFixed(0)}
            </span>
          </div>
          
          <div className="flex justify-between space-x-4">
            <span>At Expiration:</span>
            <span className={`font-mono ${data.payoffAtExpiration >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.payoffAtExpiration >= 0 ? '+' : ''}${data.payoffAtExpiration.toFixed(0)}
            </span>
          </div>
          
          {showProbability && data.probabilityDensity && (
            <div className="flex justify-between space-x-4">
              <span>Probability:</span>
              <span className="font-mono">
                {(data.probabilityDensity).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle mouse hover
  const handleMouseMove = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const point = data.activePayload[0].payload as PayoffPoint;
      setHoveredPoint(point);
      onPriceHover?.(point.underlyingPrice, point.payoff);
    }
  }, [onPriceHover]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const themeClasses = {
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    header: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    card: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    input: theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300',
  };

  if (legs.length === 0) {
    return (
      <div className={`${themeClasses.background} ${themeClasses.border} border rounded-lg p-8 text-center`}>
        <LineChart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className={themeClasses.textMuted}>
          Add strategy legs to see the payoff diagram
        </p>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.background} ${themeClasses.border} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${themeClasses.header} p-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${themeClasses.text}`}>
              Payoff Diagram - {symbol}
            </h3>
            <span className="text-sm px-2 py-1 bg-blue-600 text-white rounded">
              {legs.length} legs
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded ${themeClasses.card} hover:opacity-80`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              className={`p-2 rounded ${themeClasses.card} hover:opacity-80`}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              className={`p-2 rounded ${themeClasses.card} hover:opacity-80`}
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center justify-between mt-3 text-sm">
          <div className="flex items-center space-x-6">
            <div>
              <span className={themeClasses.textMuted}>Current Price: </span>
              <span className={`font-mono font-semibold ${themeClasses.text}`}>
                ${currentPrice.toFixed(2)}
              </span>
            </div>
            
            <div>
              <span className={themeClasses.textMuted}>Days to Exp: </span>
              <span className={`font-mono ${themeClasses.text}`}>
                {timeToExpiration}
              </span>
            </div>
            
            <div>
              <span className={themeClasses.textMuted}>Volatility: </span>
              <span className={`font-mono ${themeClasses.text}`}>
                {(selectedVolatility * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          {breakevenPoints.length > 0 && (
            <div className="text-xs">
              <span className={themeClasses.textMuted}>Breakeven: </span>
              <span className={`font-mono ${themeClasses.text}`}>
                {breakevenPoints.map(be => `$${be.toFixed(2)}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`${themeClasses.header} p-4 border-b ${themeClasses.border}`}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.textMuted}`}>
                Days to Expiration
              </label>
              <input
                type="number"
                value={timeToExpiration}
                onChange={(e) => setTimeToExpiration(Number(e.target.value))}
                className={`w-full p-2 text-sm rounded border ${themeClasses.input}`}
                min="0"
                max="365"
              />
            </div>
            
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.textMuted}`}>
                Implied Volatility (%)
              </label>
              <input
                type="number"
                value={(selectedVolatility * 100).toFixed(1)}
                onChange={(e) => setSelectedVolatility(Number(e.target.value) / 100)}
                className={`w-full p-2 text-sm rounded border ${themeClasses.input}`}
                min="1"
                max="200"
                step="0.1"
              />
            </div>
            
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.textMuted}`}>
                Risk-Free Rate (%)
              </label>
              <input
                type="number"
                value={(riskFreeRate * 100).toFixed(2)}
                className={`w-full p-2 text-sm rounded border ${themeClasses.input}`}
                min="0"
                max="10"
                step="0.01"
                readOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={payoffData}
              onMouseMove={handleMouseMove}
              margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
              />
              
              <XAxis
                dataKey="underlyingPrice"
                domain={calculatedPriceRange}
                type="number"
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                style={{ fontSize: '12px' }}
              />
              
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                style={{ fontSize: '12px' }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Zero line */}
              <ReferenceLine y={0} stroke={theme === 'dark' ? '#6b7280' : '#9ca3af'} strokeWidth={1} />
              
              {/* Current price line */}
              <ReferenceLine 
                x={currentPrice} 
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ value: `Current: $${currentPrice.toFixed(2)}`, position: 'top' }}
              />
              
              {/* Breakeven lines */}
              {showBreakeven && breakevenPoints.map((breakeven, index) => (
                <ReferenceLine
                  key={`breakeven-${index}`}
                  x={breakeven}
                  stroke="#eab308"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: `BE: $${breakeven.toFixed(0)}`, position: 'bottom' }}
                />
              ))}
              
              {/* Payoff at expiration */}
              <Line
                type="monotone"
                dataKey="payoffAtExpiration"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                name="At Expiration"
              />
              
              {/* Current payoff (with time value) */}
              {showTimeDecay && (
                <Line
                  type="monotone"
                  dataKey="payoff"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Current"
                />
              )}
              
              {/* Probability distribution */}
              {showProbability && (
                <Area
                  type="monotone"
                  dataKey="probabilityDensity"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  name="Probability"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend and Info */}
      <div className={`${themeClasses.header} p-4 border-t ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span className={themeClasses.textMuted}>At Expiration</span>
            </div>
            
            {showTimeDecay && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-0.5 bg-purple-500 border-dashed"></div>
                <span className={themeClasses.textMuted}>Current (Time Value)</span>
              </div>
            )}
            
            {showProbability && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-2 bg-cyan-500/20 border border-cyan-500"></div>
                <span className={themeClasses.textMuted}>Probability Distribution</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-blue-500 border-dashed"></div>
              <span className={themeClasses.textMuted}>Current Price</span>
            </div>
            
            {showBreakeven && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-0.5 bg-yellow-500 border-dashed"></div>
                <span className={themeClasses.textMuted}>Breakeven</span>
              </div>
            )}
          </div>
          
          {hoveredPoint && (
            <div className="text-sm">
              <span className={themeClasses.textMuted}>Hover P&L: </span>
              <span className={`font-mono font-semibold ${
                hoveredPoint.payoff >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {hoveredPoint.payoff >= 0 ? '+' : ''}${hoveredPoint.payoff.toFixed(0)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PayoffDiagram);