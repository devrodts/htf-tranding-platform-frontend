'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity,
  Target,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Zap,
  Shield
} from 'lucide-react';

// Professional Performance Analytics Types
export interface PerformanceData {
  timestamp: number;
  portfolioValue: number;
  pnl: number;
  dailyPnl: number;
  cumulativePnl: number;
  drawdown: number;
  volume: number;
  tradesCount: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  benchmarkReturn?: number;
}

export interface RiskMetrics {
  valueAtRisk: number;          // VaR 95%
  conditionalVaR: number;       // CVaR 95%
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  beta: number;
  alpha: number;
  correlation: number;
  volatility: number;
  downsideDeviation: number;
  trackingError: number;
}

export interface TradeMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  largestWin: number;
  largestLoss: number;
  avgTradeSize: number;
  avgHoldingPeriod: number;
}

interface PerformanceDashboardProps {
  data: PerformanceData[];
  riskMetrics: RiskMetrics;
  tradeMetrics: TradeMetrics;
  benchmark?: PerformanceData[];
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
  onTimeframeChange?: (timeframe: string) => void;
  theme?: 'light' | 'dark';
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  data,
  riskMetrics,
  tradeMetrics,
  benchmark = [],
  timeframe,
  onTimeframeChange,
  theme = 'dark'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'trades' | 'attribution'>('overview');
  const [chartType, setChartType] = useState<'cumulative' | 'daily' | 'drawdown' | 'rolling'>('cumulative');

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (data.length === 0) return null;

    const latest = data[data.length - 1];
    const earliest = data[0];
    const totalReturn = ((latest.portfolioValue - earliest.portfolioValue) / earliest.portfolioValue) * 100;
    
    // Calculate rolling Sharpe ratio (last 30 periods)
    const recent = data.slice(-30);
    const avgReturn = recent.reduce((sum, d) => sum + d.dailyPnl, 0) / recent.length;
    const variance = recent.reduce((sum, d) => sum + Math.pow(d.dailyPnl - avgReturn, 2), 0) / recent.length;
    const rollingSharpe = Math.sqrt(252) * avgReturn / Math.sqrt(variance);
    
    // Calculate win streak
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].dailyPnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else if (data[i].dailyPnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    }

    return {
      totalReturn,
      rollingSharpe,
      maxWinStreak,
      maxLossStreak,
      currentStreak: data[data.length - 1]?.dailyPnl > 0 ? currentWinStreak : -currentLossStreak,
      avgDailyPnl: recent.reduce((sum, d) => sum + d.dailyPnl, 0) / recent.length,
      volatility: Math.sqrt(variance * 252),
      bestDay: Math.max(...data.map(d => d.dailyPnl)),
      worstDay: Math.min(...data.map(d => d.dailyPnl))
    };
  }, [data]);

  // Prepare chart data based on selected type
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      date: new Date(d.timestamp).toLocaleDateString(),
      benchmarkValue: benchmark.find(b => Math.abs(b.timestamp - d.timestamp) < 86400000)?.portfolioValue
    }));
  }, [data, benchmark]);

  // Performance summary cards data
  const performanceCards = useMemo(() => {
    if (!derivedMetrics) return [];
    
    const latest = data[data.length - 1];
    
    return [
      {
        title: 'Portfolio Value',
        value: formatCurrency(latest?.portfolioValue || 0),
        change: derivedMetrics.totalReturn,
        icon: DollarSign,
        color: 'blue'
      },
      {
        title: 'Total P&L',
        value: formatCurrency(latest?.cumulativePnl || 0),
        change: null,
        icon: TrendingUp,
        color: latest?.cumulativePnl >= 0 ? 'green' : 'red'
      },
      {
        title: 'Sharpe Ratio',
        value: riskMetrics.sharpeRatio.toFixed(2),
        change: null,
        icon: Target,
        color: riskMetrics.sharpeRatio > 1 ? 'green' : riskMetrics.sharpeRatio > 0 ? 'yellow' : 'red'
      },
      {
        title: 'Max Drawdown',
        value: `${(riskMetrics.maxDrawdown * 100).toFixed(2)}%`,
        change: null,
        icon: AlertTriangle,
        color: 'red'
      },
      {
        title: 'Win Rate',
        value: `${(tradeMetrics.winRate * 100).toFixed(1)}%`,
        change: null,
        icon: Target,
        color: tradeMetrics.winRate > 0.6 ? 'green' : tradeMetrics.winRate > 0.4 ? 'yellow' : 'red'
      },
      {
        title: 'Volatility',
        value: `${(riskMetrics.volatility * 100).toFixed(2)}%`,
        change: null,
        icon: Activity,
        color: 'purple'
      }
    ];
  }, [data, riskMetrics, tradeMetrics, derivedMetrics]);

  // Format currency
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }, []);

  // Format percentage
  const formatPercent = useCallback((value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  }, []);

  const themeClasses = {
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    header: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    card: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    hover: theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
  };

  return (
    <div className={`${themeClasses.background} ${themeClasses.border} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${themeClasses.header} p-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${themeClasses.text}`}>
              Performance Analytics
            </h3>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Timeframe Selector */}
            <div className="flex border rounded">
              {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange?.(tf)}
                  className={`px-3 py-1 text-xs ${
                    timeframe === tf 
                      ? 'bg-blue-600 text-white' 
                      : `${themeClasses.card} ${themeClasses.textMuted} ${themeClasses.hover}`
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            
            {/* Chart Type Selector */}
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className={`px-2 py-1 text-sm rounded border ${themeClasses.card} ${themeClasses.border}`}
            >
              <option value="cumulative">Cumulative P&L</option>
              <option value="daily">Daily P&L</option>
              <option value="drawdown">Drawdown</option>
              <option value="rolling">Rolling Metrics</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {performanceCards.map((card, index) => {
          const IconComponent = card.icon;
          const colorClasses = {
            blue: 'text-blue-500',
            green: 'text-green-500',
            red: 'text-red-500',
            yellow: 'text-yellow-500',
            purple: 'text-purple-500'
          };
          
          return (
            <div key={index} className={`${themeClasses.card} p-3 rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs ${themeClasses.textMuted}`}>
                  {card.title}
                </span>
                <IconComponent className={`w-4 h-4 ${colorClasses[card.color as keyof typeof colorClasses]}`} />
              </div>
              
              <div className={`text-lg font-semibold ${themeClasses.text} mb-1`}>
                {card.value}
              </div>
              
              {card.change !== null && (
                <div className={`text-xs ${card.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {card.change >= 0 ? '+' : ''}{card.change.toFixed(2)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <div className={`${themeClasses.header} px-4 border-b ${themeClasses.border}`}>
        <div className="flex space-x-4">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'risk', label: 'Risk Analysis', icon: Shield },
            { id: 'trades', label: 'Trade Analytics', icon: Zap },
            { id: 'attribution', label: 'Attribution', icon: Target }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-500' 
                    : `border-transparent ${themeClasses.textMuted} ${themeClasses.hover}`
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Main Chart */}
            <div>
              <h4 className={`font-medium mb-4 ${themeClasses.text}`}>
                {chartType === 'cumulative' && 'Cumulative Performance'}
                {chartType === 'daily' && 'Daily P&L'}
                {chartType === 'drawdown' && 'Drawdown Analysis'}
                {chartType === 'rolling' && 'Rolling Sharpe Ratio'}
              </h4>
              
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'cumulative' && (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="date" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <YAxis tickFormatter={formatCurrency} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <Tooltip 
                        formatter={([value]: [number]) => [formatCurrency(value), 'Portfolio Value']}
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="portfolioValue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      {benchmark.length > 0 && (
                        <Line type="monotone" dataKey="benchmarkValue" stroke="#6b7280" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                      )}
                    </LineChart>
                  )}
                  
                  {chartType === 'daily' && (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="date" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <YAxis tickFormatter={formatCurrency} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <Tooltip 
                        formatter={([value]: [number]) => [formatCurrency(value), 'Daily P&L']}
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          borderRadius: '8px'
                        }}
                      />
                      <ReferenceLine y={0} stroke={theme === 'dark' ? '#6b7280' : '#9ca3af'} />
                      <Bar dataKey="dailyPnl" fill={(data: any) => data.dailyPnl >= 0 ? '#10b981' : '#ef4444'} />
                    </BarChart>
                  )}
                  
                  {chartType === 'drawdown' && (
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="date" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <YAxis tickFormatter={formatPercent} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <Tooltip 
                        formatter={([value]: [number]) => [formatPercent(value), 'Drawdown']}
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          borderRadius: '8px'
                        }}
                      />
                      <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Risk Metrics */}
            <div className={`${themeClasses.card} p-4 rounded-lg`}>
              <h4 className={`font-medium mb-4 ${themeClasses.text}`}>Risk Metrics</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Value at Risk (95%):</span>
                  <span className={`font-mono text-red-400`}>
                    {formatCurrency(riskMetrics.valueAtRisk)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Conditional VaR:</span>
                  <span className={`font-mono text-red-400`}>
                    {formatCurrency(riskMetrics.conditionalVaR)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Sharpe Ratio:</span>
                  <span className={`font-mono ${riskMetrics.sharpeRatio > 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {riskMetrics.sharpeRatio.toFixed(3)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Sortino Ratio:</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {riskMetrics.sortinoRatio.toFixed(3)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Beta:</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {riskMetrics.beta.toFixed(3)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Alpha:</span>
                  <span className={`font-mono ${riskMetrics.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(riskMetrics.alpha)}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawdown Analysis */}
            <div className={`${themeClasses.card} p-4 rounded-lg`}>
              <h4 className={`font-medium mb-4 ${themeClasses.text}`}>Drawdown Analysis</h4>
              
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis dataKey="date" hide />
                    <YAxis tickFormatter={formatPercent} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '10px' }} />
                    <Tooltip formatter={([value]: [number]) => [formatPercent(value), 'Drawdown']} />
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Trade Statistics */}
            <div className={`${themeClasses.card} p-4 rounded-lg`}>
              <h4 className={`font-medium mb-4 ${themeClasses.text}`}>Trade Statistics</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Total Trades:</span>
                  <span className={`font-mono ${themeClasses.text}`}>
                    {tradeMetrics.totalTrades.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Win Rate:</span>
                  <span className={`font-mono ${tradeMetrics.winRate > 0.6 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {formatPercent(tradeMetrics.winRate)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Profit Factor:</span>
                  <span className={`font-mono ${tradeMetrics.profitFactor > 1 ? 'text-green-400' : 'text-red-400'}`}>
                    {tradeMetrics.profitFactor.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Avg Win:</span>
                  <span className={`font-mono text-green-400`}>
                    {formatCurrency(tradeMetrics.avgWin)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>Avg Loss:</span>
                  <span className={`font-mono text-red-400`}>
                    {formatCurrency(Math.abs(tradeMetrics.avgLoss))}
                  </span>
                </div>
              </div>
            </div>

            {/* Win/Loss Distribution */}
            <div className={`${themeClasses.card} p-4 rounded-lg col-span-2`}>
              <h4 className={`font-medium mb-4 ${themeClasses.text}`}>Trade Distribution</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {tradeMetrics.winningTrades}
                  </div>
                  <div className={`text-xs ${themeClasses.textMuted}`}>Winning Trades</div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full" 
                      style={{ width: `${tradeMetrics.winRate * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {tradeMetrics.losingTrades}
                  </div>
                  <div className={`text-xs ${themeClasses.textMuted}`}>Losing Trades</div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-red-400 h-2 rounded-full" 
                      style={{ width: `${(1 - tradeMetrics.winRate) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attribution' && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className={themeClasses.textMuted}>
              Performance attribution analysis coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PerformanceDashboard);