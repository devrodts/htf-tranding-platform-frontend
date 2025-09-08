'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Zap,
  Target,
  BarChart3,
  PieChart as PieIcon,
  Settings,
  Info
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

interface GreeksSensitivity {
  underlyingPrice: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

interface GreeksRiskMetrics {
  portfolioValue: number;
  deltaRisk: number;      // Risk from 1% price move
  gammaRisk: number;      // Risk from delta hedge error
  thetaDecay: number;     // Daily time decay
  vegaRisk: number;       // Risk from 1% vol change
  rhoRisk: number;        // Risk from 1% rate change
}

interface GreeksAnalyzerProps {
  legs: OptionLeg[];
  currentPrice: number;
  symbol: string;
  volatility?: number;
  riskFreeRate?: number;
  daysToExpiration?: number;
  priceRange?: [number, number];
  showSensitivity?: boolean;
  showRiskMetrics?: boolean;
  showHeatmap?: boolean;
  theme?: 'light' | 'dark';
}

const GreeksAnalyzer: React.FC<GreeksAnalyzerProps> = ({
  legs,
  currentPrice,
  symbol,
  volatility = 0.25,
  riskFreeRate = 0.02,
  daysToExpiration = 30,
  priceRange,
  showSensitivity = true,
  showRiskMetrics = true,
  showHeatmap = true,
  theme = 'dark'
}) => {
  const [selectedGreek, setSelectedGreek] = useState<'delta' | 'gamma' | 'theta' | 'vega' | 'rho'>('delta');
  const [viewMode, setViewMode] = useState<'chart' | 'heatmap' | 'summary'>('chart');

  // Calculate aggregated Greeks for the portfolio
  const portfolioGreeks = useMemo(() => {
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;
    let netRho = 0;
    let totalValue = 0;

    legs.forEach(leg => {
      const multiplier = leg.action === 'buy' ? 1 : -1;
      const contractMultiplier = 100;
      const legValue = leg.premium * leg.quantity * contractMultiplier;
      
      netDelta += leg.greeks.delta * multiplier * leg.quantity;
      netGamma += leg.greeks.gamma * multiplier * leg.quantity;
      netTheta += leg.greeks.theta * multiplier * leg.quantity;
      netVega += leg.greeks.vega * multiplier * leg.quantity;
      netRho += leg.greeks.rho * multiplier * leg.quantity;
      
      totalValue += leg.action === 'buy' ? -legValue : legValue;
    });

    return {
      delta: netDelta,
      gamma: netGamma,
      theta: netTheta,
      vega: netVega,
      rho: netRho,
      totalValue
    };
  }, [legs]);

  // Calculate Greeks sensitivity across price range
  const sensitivityData = useMemo((): GreeksSensitivity[] => {
    const [minPrice, maxPrice] = priceRange || [currentPrice * 0.7, currentPrice * 1.3];
    const points: GreeksSensitivity[] = [];
    const numPoints = 100;
    const priceStep = (maxPrice - minPrice) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const underlyingPrice = minPrice + i * priceStep;
      
      // Simplified Greeks calculations - in production would use proper Black-Scholes derivatives
      let totalDelta = 0;
      let totalGamma = 0;
      let totalTheta = 0;
      let totalVega = 0;
      let totalRho = 0;

      legs.forEach(leg => {
        const multiplier = leg.action === 'buy' ? 1 : -1;
        
        // Adjust Greeks based on moneyness (simplified model)
        const moneyness = leg.type === 'call' 
          ? underlyingPrice / leg.strike 
          : leg.strike / underlyingPrice;
        
        const timeToExp = daysToExpiration / 365;
        const volAdjustment = Math.exp(-0.5 * Math.pow(Math.log(moneyness) / (volatility * Math.sqrt(timeToExp)), 2));
        
        let adjustedDelta = leg.greeks.delta;
        let adjustedGamma = leg.greeks.gamma * volAdjustment;
        let adjustedTheta = leg.greeks.theta;
        let adjustedVega = leg.greeks.vega * volAdjustment;
        let adjustedRho = leg.greeks.rho;

        // Adjust delta based on price movement
        const priceDiff = (underlyingPrice - currentPrice) / currentPrice;
        adjustedDelta += leg.greeks.gamma * priceDiff * currentPrice;
        
        totalDelta += adjustedDelta * multiplier * leg.quantity;
        totalGamma += adjustedGamma * multiplier * leg.quantity;
        totalTheta += adjustedTheta * multiplier * leg.quantity;
        totalVega += adjustedVega * multiplier * leg.quantity;
        totalRho += adjustedRho * multiplier * leg.quantity;
      });

      points.push({
        underlyingPrice,
        delta: totalDelta,
        gamma: totalGamma,
        theta: totalTheta,
        vega: totalVega,
        rho: totalRho
      });
    }

    return points;
  }, [legs, currentPrice, priceRange, daysToExpiration, volatility]);

  // Calculate risk metrics
  const riskMetrics = useMemo((): GreeksRiskMetrics => {
    const priceMove = currentPrice * 0.01; // 1% move
    const volMove = 0.01; // 1% volatility move
    const rateMove = 0.01; // 1% rate move

    return {
      portfolioValue: portfolioGreeks.totalValue,
      deltaRisk: Math.abs(portfolioGreeks.delta * priceMove),
      gammaRisk: Math.abs(portfolioGreeks.gamma * priceMove * priceMove * 0.5),
      thetaDecay: Math.abs(portfolioGreeks.theta),
      vegaRisk: Math.abs(portfolioGreeks.vega * volMove),
      rhoRisk: Math.abs(portfolioGreeks.rho * rateMove)
    };
  }, [portfolioGreeks, currentPrice]);

  // Greeks data for pie chart
  const greeksDistribution = [
    { name: 'Delta Risk', value: Math.abs(portfolioGreeks.delta), color: '#3b82f6' },
    { name: 'Gamma Risk', value: Math.abs(portfolioGreeks.gamma) * 100, color: '#10b981' },
    { name: 'Theta Risk', value: Math.abs(portfolioGreeks.theta), color: '#f59e0b' },
    { name: 'Vega Risk', value: Math.abs(portfolioGreeks.vega), color: '#8b5cf6' },
    { name: 'Rho Risk', value: Math.abs(portfolioGreeks.rho), color: '#ef4444' }
  ];

  // Format number with appropriate precision
  const formatGreek = useCallback((value: number, decimals: number = 3): string => {
    return value.toFixed(decimals);
  }, []);

  // Format currency
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }, []);

  // Get Greek description
  const getGreekDescription = useCallback((greek: string): string => {
    const descriptions = {
      delta: 'Sensitivity to underlying price changes (option price change per $1 underlying move)',
      gamma: 'Rate of change of delta (delta change per $1 underlying move)',
      theta: 'Time decay (option price change per day)',
      vega: 'Sensitivity to volatility changes (option price change per 1% volatility move)',
      rho: 'Sensitivity to interest rate changes (option price change per 1% rate move)'
    };
    return descriptions[greek as keyof typeof descriptions] || '';
  }, []);

  const themeClasses = {
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    header: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    card: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-yellow-400'
  };

  if (legs.length === 0) {
    return (
      <div className={`${themeClasses.background} ${themeClasses.border} border rounded-lg p-8 text-center`}>
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className={themeClasses.textMuted}>
          Add strategy legs to analyze Greeks
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
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${themeClasses.text}`}>
              Greeks Analysis - {symbol}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedGreek}
              onChange={(e) => setSelectedGreek(e.target.value as any)}
              className={`px-2 py-1 text-sm rounded border ${themeClasses.card} ${themeClasses.border}`}
            >
              <option value="delta">Delta</option>
              <option value="gamma">Gamma</option>
              <option value="theta">Theta</option>
              <option value="vega">Vega</option>
              <option value="rho">Rho</option>
            </select>
            
            <div className="flex border rounded">
              {['chart', 'heatmap', 'summary'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-xs capitalize ${
                    viewMode === mode 
                      ? 'bg-blue-600 text-white' 
                      : `${themeClasses.card} ${themeClasses.textMuted} hover:opacity-80`
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Portfolio Greeks Summary */}
        <div className="grid grid-cols-5 gap-4 mt-4">
          {Object.entries(portfolioGreeks).slice(0, 5).map(([greek, value]) => (
            <div key={greek} className={`text-center ${themeClasses.card} p-2 rounded`}>
              <div className={`text-xs ${themeClasses.textMuted} capitalize`}>
                Net {greek}
              </div>
              <div className={`font-mono font-semibold ${
                value > 0 ? themeClasses.positive :
                value < 0 ? themeClasses.negative :
                themeClasses.neutral
              }`}>
                {value > 0 ? '+' : ''}{formatGreek(value as number)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Chart View */}
        {viewMode === 'chart' && showSensitivity && (
          <div>
            <div className="mb-4">
              <h4 className={`font-medium mb-2 ${themeClasses.text} flex items-center`}>
                <BarChart3 className="w-4 h-4 mr-2" />
                {selectedGreek.charAt(0).toUpperCase() + selectedGreek.slice(1)} Sensitivity
              </h4>
              
              <p className={`text-xs ${themeClasses.textMuted} mb-4`}>
                {getGreekDescription(selectedGreek)}
              </p>
            </div>
            
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sensitivityData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
                  />
                  
                  <XAxis
                    dataKey="underlyingPrice"
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    style={{ fontSize: '12px' }}
                  />
                  
                  <YAxis
                    tickFormatter={(value) => formatGreek(value)}
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    style={{ fontSize: '12px' }}
                  />
                  
                  <Tooltip
                    formatter={(value: any) => [formatGreek(value), selectedGreek]}
                    labelFormatter={(value) => `Price: $${Number(value).toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      color: theme === 'dark' ? '#ffffff' : '#000000'
                    }}
                  />
                  
                  <ReferenceLine 
                    x={currentPrice} 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: `Current: $${currentPrice.toFixed(2)}`, position: 'top' }}
                  />
                  
                  <ReferenceLine y={0} stroke={theme === 'dark' ? '#6b7280' : '#9ca3af'} />
                  
                  <Line
                    type="monotone"
                    dataKey={selectedGreek}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    name={selectedGreek}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Heatmap View */}
        {viewMode === 'heatmap' && (
          <div>
            <h4 className={`font-medium mb-4 ${themeClasses.text} flex items-center`}>
              <Target className="w-4 h-4 mr-2" />
              Greeks Heatmap
            </h4>
            
            <div className="grid grid-cols-5 gap-4">
              {legs.map((leg, index) => (
                <div key={leg.id} className={`${themeClasses.card} p-3 rounded-lg`}>
                  <div className={`font-medium text-sm mb-2 ${themeClasses.text}`}>
                    Leg {index + 1}
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div className={`${themeClasses.textMuted}`}>
                      {leg.action.toUpperCase()} {leg.type.toUpperCase()} ${leg.strike}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Δ:</span>
                        <span className={`font-mono ${leg.greeks.delta >= 0 ? themeClasses.positive : themeClasses.negative}`}>
                          {formatGreek(leg.greeks.delta)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Γ:</span>
                        <span className={`font-mono ${themeClasses.text}`}>
                          {formatGreek(leg.greeks.gamma)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Θ:</span>
                        <span className={`font-mono ${leg.greeks.theta <= 0 ? themeClasses.negative : themeClasses.positive}`}>
                          {formatGreek(leg.greeks.theta)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>ν:</span>
                        <span className={`font-mono ${themeClasses.text}`}>
                          {formatGreek(leg.greeks.vega)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>ρ:</span>
                        <span className={`font-mono ${themeClasses.text}`}>
                          {formatGreek(leg.greeks.rho)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary View */}
        {viewMode === 'summary' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Risk Metrics */}
            <div>
              <h4 className={`font-medium mb-4 ${themeClasses.text} flex items-center`}>
                <Zap className="w-4 h-4 mr-2" />
                Risk Metrics
              </h4>
              
              <div className={`${themeClasses.card} p-4 rounded-lg space-y-3`}>
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Portfolio Value:</span>
                  <span className={`font-mono font-semibold ${
                    riskMetrics.portfolioValue >= 0 ? themeClasses.positive : themeClasses.negative
                  }`}>
                    {formatCurrency(riskMetrics.portfolioValue)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Delta Risk (1% move):</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {formatCurrency(riskMetrics.deltaRisk)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Gamma Risk:</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {formatCurrency(riskMetrics.gammaRisk)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Daily Theta Decay:</span>
                  <span className={`font-mono ${themeClasses.negative}`}>
                    -{formatCurrency(riskMetrics.thetaDecay)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Vega Risk (1% vol):</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {formatCurrency(riskMetrics.vegaRisk)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Rho Risk (1% rate):</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {formatCurrency(riskMetrics.rhoRisk)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Greeks Distribution */}
            <div>
              <h4 className={`font-medium mb-4 ${themeClasses.text} flex items-center`}>
                <PieIcon className="w-4 h-4 mr-2" />
                Greeks Distribution
              </h4>
              
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={greeksDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {greeksDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name) => [formatGreek(value), name]}
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`${themeClasses.header} p-3 border-t ${themeClasses.border}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className={themeClasses.textMuted}>
              Greeks calculated using Black-Scholes model
            </span>
            <span className={themeClasses.textMuted}>
              Vol: {(volatility * 100).toFixed(1)}% • Rate: {(riskFreeRate * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Info className="w-3 h-3 text-gray-400" />
            <span className={themeClasses.textMuted}>
              Click chart legend to toggle Greeks visibility
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GreeksAnalyzer);