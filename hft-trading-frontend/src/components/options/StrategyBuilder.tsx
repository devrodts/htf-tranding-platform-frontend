'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Calculator,
  Target,
  Zap,
  AlertTriangle,
  Save,
  Share,
  RefreshCw
} from 'lucide-react';

// Professional Options Strategy Types
export interface OptionLeg {
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

export interface StrategyTemplate {
  name: string;
  description: string;
  category: 'bullish' | 'bearish' | 'neutral' | 'volatility';
  legs: Omit<OptionLeg, 'id' | 'premium' | 'impliedVolatility' | 'greeks'>[];
  riskProfile: 'low' | 'medium' | 'high';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  marketOutlook: string;
}

export interface StrategyMetrics {
  maxProfit: number;
  maxLoss: number;
  breakeven: number[];
  probabilityOfProfit: number;
  riskRewardRatio: number;
  totalPremium: number;
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  netRho: number;
  marginRequirement: number;
  daysToExpiration: number;
}

interface StrategyBuilderProps {
  symbol: string;
  underlyingPrice: number;
  availableStrikes: number[];
  availableExpirations: string[];
  onStrategyCreate?: (strategy: { legs: OptionLeg[]; metrics: StrategyMetrics }) => void;
  onLegTrade?: (leg: OptionLeg) => void;
  theme?: 'light' | 'dark';
}

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  symbol,
  underlyingPrice,
  availableStrikes,
  availableExpirations,
  onStrategyCreate,
  onLegTrade,
  theme = 'dark'
}) => {
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);

  // Pre-defined strategy templates
  const strategyTemplates: StrategyTemplate[] = [
    {
      name: 'Long Call',
      description: 'Buy call option to profit from price increase',
      category: 'bullish',
      legs: [{
        type: 'call',
        action: 'buy',
        strike: underlyingPrice + 10,
        expiration: availableExpirations[0] || '',
        quantity: 1
      }],
      riskProfile: 'medium',
      complexity: 'beginner',
      marketOutlook: 'Moderately bullish'
    },
    {
      name: 'Long Put',
      description: 'Buy put option to profit from price decrease',
      category: 'bearish',
      legs: [{
        type: 'put',
        action: 'buy',
        strike: underlyingPrice - 10,
        expiration: availableExpirations[0] || '',
        quantity: 1
      }],
      riskProfile: 'medium',
      complexity: 'beginner',
      marketOutlook: 'Moderately bearish'
    },
    {
      name: 'Bull Call Spread',
      description: 'Buy lower strike call, sell higher strike call',
      category: 'bullish',
      legs: [
        {
          type: 'call',
          action: 'buy',
          strike: underlyingPrice + 5,
          expiration: availableExpirations[0] || '',
          quantity: 1
        },
        {
          type: 'call',
          action: 'sell',
          strike: underlyingPrice + 15,
          expiration: availableExpirations[0] || '',
          quantity: 1
        }
      ],
      riskProfile: 'low',
      complexity: 'intermediate',
      marketOutlook: 'Moderately bullish'
    },
    {
      name: 'Bear Put Spread',
      description: 'Buy higher strike put, sell lower strike put',
      category: 'bearish',
      legs: [
        {
          type: 'put',
          action: 'buy',
          strike: underlyingPrice - 5,
          expiration: availableExpirations[0] || '',
          quantity: 1
        },
        {
          type: 'put',
          action: 'sell',
          strike: underlyingPrice - 15,
          expiration: availableExpirations[0] || '',
          quantity: 1
        }
      ],
      riskProfile: 'low',
      complexity: 'intermediate',
      marketOutlook: 'Moderately bearish'
    },
    {
      name: 'Iron Condor',
      description: 'Sell OTM call spread and OTM put spread',
      category: 'neutral',
      legs: [
        {
          type: 'put',
          action: 'buy',
          strike: underlyingPrice - 20,
          expiration: availableExpirations[0] || '',
          quantity: 1
        },
        {
          type: 'put',
          action: 'sell',
          strike: underlyingPrice - 10,
          expiration: availableExpirations[0] || '',
          quantity: 1
        },
        {
          type: 'call',
          action: 'sell',
          strike: underlyingPrice + 10,
          expiration: availableExpirations[0] || '',
          quantity: 1
        },
        {
          type: 'call',
          action: 'buy',
          strike: underlyingPrice + 20,
          expiration: availableExpirations[0] || '',
          quantity: 1
        }
      ],
      riskProfile: 'low',
      complexity: 'advanced',
      marketOutlook: 'Neutral/Range-bound'
    },
    {
      name: 'Long Straddle',
      description: 'Buy call and put at same strike for volatility play',
      category: 'volatility',
      legs: [
        {
          type: 'call',
          action: 'buy',
          strike: underlyingPrice,
          expiration: availableExpirations[0] || '',
          quantity: 1
        },
        {
          type: 'put',
          action: 'buy',
          strike: underlyingPrice,
          expiration: availableExpirations[0] || '',
          quantity: 1
        }
      ],
      riskProfile: 'high',
      complexity: 'intermediate',
      marketOutlook: 'High volatility expected'
    },
    {
      name: 'Long Strangle',
      description: 'Buy OTM call and put for volatility play',
      category: 'volatility',
      legs: [
        {
          type: 'call',
          action: 'buy',
          strike: underlyingPrice + 10,
          expiration: availableExpirations[0] || '',
          quantity: 1
        },
        {
          type: 'put',
          action: 'buy',
          strike: underlyingPrice - 10,
          expiration: availableExpirations[0] || '',
          quantity: 1
        }
      ],
      riskProfile: 'high',
      complexity: 'intermediate',
      marketOutlook: 'High volatility expected'
    }
  ];

  // Calculate strategy metrics
  const strategyMetrics = useMemo((): StrategyMetrics => {
    if (legs.length === 0) {
      return {
        maxProfit: 0,
        maxLoss: 0,
        breakeven: [],
        probabilityOfProfit: 0,
        riskRewardRatio: 0,
        totalPremium: 0,
        netDelta: 0,
        netGamma: 0,
        netTheta: 0,
        netVega: 0,
        netRho: 0,
        marginRequirement: 0,
        daysToExpiration: 0
      };
    }

    let totalPremium = 0;
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;
    let netRho = 0;

    legs.forEach(leg => {
      const multiplier = leg.action === 'buy' ? 1 : -1;
      const premiumMultiplier = leg.action === 'buy' ? -1 : 1;
      
      totalPremium += leg.premium * premiumMultiplier * leg.quantity * 100;
      netDelta += leg.greeks.delta * multiplier * leg.quantity;
      netGamma += leg.greeks.gamma * multiplier * leg.quantity;
      netTheta += leg.greeks.theta * multiplier * leg.quantity;
      netVega += leg.greeks.vega * multiplier * leg.quantity;
      netRho += leg.greeks.rho * multiplier * leg.quantity;
    });

    // Simplified calculations (would use Black-Scholes in production)
    const maxProfit = calculateMaxProfit(legs);
    const maxLoss = calculateMaxLoss(legs, totalPremium);
    const breakeven = calculateBreakeven(legs);
    const probabilityOfProfit = calculateProbabilityOfProfit(legs, underlyingPrice);
    const riskRewardRatio = maxLoss !== 0 ? Math.abs(maxProfit / maxLoss) : Infinity;
    const marginRequirement = calculateMarginRequirement(legs);
    const daysToExpiration = calculateDaysToExpiration(legs);

    return {
      maxProfit,
      maxLoss,
      breakeven,
      probabilityOfProfit,
      riskRewardRatio,
      totalPremium,
      netDelta,
      netGamma,
      netTheta,
      netVega,
      netRho,
      marginRequirement,
      daysToExpiration
    };
  }, [legs, underlyingPrice]);

  // Add new leg
  const addLeg = useCallback(() => {
    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'call',
      action: 'buy',
      strike: underlyingPrice,
      expiration: availableExpirations[0] || '',
      quantity: 1,
      premium: 5.00,
      impliedVolatility: 0.25,
      greeks: {
        delta: 0.5,
        gamma: 0.02,
        theta: -0.05,
        vega: 0.15,
        rho: 0.03
      }
    };
    setLegs(prev => [...prev, newLeg]);
  }, [underlyingPrice, availableExpirations]);

  // Remove leg
  const removeLeg = useCallback((legId: string) => {
    setLegs(prev => prev.filter(leg => leg.id !== legId));
  }, []);

  // Update leg
  const updateLeg = useCallback((legId: string, updates: Partial<OptionLeg>) => {
    setLegs(prev => prev.map(leg => 
      leg.id === legId ? { ...leg, ...updates } : leg
    ));
  }, []);

  // Apply strategy template
  const applyTemplate = useCallback((templateName: string) => {
    const template = strategyTemplates.find(t => t.name === templateName);
    if (!template) return;

    const newLegs: OptionLeg[] = template.legs.map((templateLeg, index) => ({
      id: `leg-${Date.now()}-${index}`,
      ...templateLeg,
      premium: 5.00, // Mock premium - would fetch from API
      impliedVolatility: 0.25,
      greeks: {
        delta: templateLeg.type === 'call' ? 0.5 : -0.5,
        gamma: 0.02,
        theta: -0.05,
        vega: 0.15,
        rho: 0.03
      }
    }));

    setLegs(newLegs);
    setSelectedTemplate(templateName);
  }, [strategyTemplates]);

  // Format currency
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
    input: theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300',
  };

  return (
    <div className={`${themeClasses.background} ${themeClasses.border} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${themeClasses.header} p-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${themeClasses.text}`}>
              Options Strategy Builder - {symbol}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`px-3 py-1 text-sm rounded ${themeClasses.card} ${themeClasses.hover}`}
            >
              Templates
            </button>
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`px-3 py-1 text-sm rounded ${themeClasses.card} ${themeClasses.hover}`}
            >
              Metrics
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm">
            <span className={themeClasses.textMuted}>Underlying: </span>
            <span className={`font-mono font-semibold ${themeClasses.text}`}>
              ${underlyingPrice.toFixed(2)}
            </span>
          </div>
          
          {selectedTemplate && (
            <div className="text-sm">
              <span className={themeClasses.textMuted}>Strategy: </span>
              <span className={`font-medium ${themeClasses.text}`}>
                {selectedTemplate}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Strategy Templates Sidebar */}
        {showTemplates && (
          <div className={`w-80 ${themeClasses.border} border-r overflow-y-auto max-h-96`}>
            <div className="p-4">
              <h4 className={`font-medium mb-3 ${themeClasses.text}`}>
                Strategy Templates
              </h4>
              
              <div className="space-y-2">
                {strategyTemplates.map(template => {
                  const isSelected = selectedTemplate === template.name;
                  
                  return (
                    <button
                      key={template.name}
                      onClick={() => applyTemplate(template.name)}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : `${themeClasses.card} ${themeClasses.border} ${themeClasses.hover}`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{template.name}</span>
                        <div className="flex items-center space-x-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            template.category === 'bullish' ? 'bg-green-100 text-green-800' :
                            template.category === 'bearish' ? 'bg-red-100 text-red-800' :
                            template.category === 'neutral' ? 'bg-gray-100 text-gray-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {template.category}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`text-xs ${isSelected ? 'text-blue-200' : themeClasses.textMuted} mb-2`}>
                        {template.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className={isSelected ? 'text-blue-200' : themeClasses.textMuted}>
                          {template.complexity} • {template.legs.length} legs
                        </span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          template.riskProfile === 'low' ? 'bg-green-200 text-green-800' :
                          template.riskProfile === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {template.riskProfile} risk
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Strategy Builder */}
        <div className="flex-1">
          {/* Strategy Legs */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className={`font-medium ${themeClasses.text}`}>
                Strategy Legs ({legs.length})
              </h4>
              
              <div className="flex space-x-2">
                <button
                  onClick={addLeg}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Leg</span>
                </button>
                
                {legs.length > 0 && (
                  <button
                    onClick={() => onStrategyCreate?.({ legs, metrics: strategyMetrics })}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium"
                  >
                    <Save className="w-4 h-4" />
                    <span>Create Strategy</span>
                  </button>
                )}
              </div>
            </div>

            {/* Legs Table */}
            {legs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`${themeClasses.header} border-b ${themeClasses.border}`}>
                      <th className="px-3 py-2 text-left">Action</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Strike</th>
                      <th className="px-3 py-2 text-left">Expiration</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Premium</th>
                      <th className="px-3 py-2 text-left">IV</th>
                      <th className="px-3 py-2 text-left">Delta</th>
                      <th className="px-3 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {legs.map((leg, index) => (
                      <tr key={leg.id} className={`border-b ${themeClasses.border} ${themeClasses.hover}`}>
                        <td className="px-3 py-3">
                          <select
                            value={leg.action}
                            onChange={(e) => updateLeg(leg.id, { action: e.target.value as 'buy' | 'sell' })}
                            className={`p-1 rounded border ${themeClasses.input} text-sm`}
                          >
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                          </select>
                        </td>
                        
                        <td className="px-3 py-3">
                          <select
                            value={leg.type}
                            onChange={(e) => updateLeg(leg.id, { type: e.target.value as 'call' | 'put' })}
                            className={`p-1 rounded border ${themeClasses.input} text-sm`}
                          >
                            <option value="call">Call</option>
                            <option value="put">Put</option>
                          </select>
                        </td>
                        
                        <td className="px-3 py-3">
                          <select
                            value={leg.strike}
                            onChange={(e) => updateLeg(leg.id, { strike: Number(e.target.value) })}
                            className={`p-1 rounded border ${themeClasses.input} text-sm font-mono`}
                          >
                            {availableStrikes.map(strike => (
                              <option key={strike} value={strike}>
                                ${strike.toFixed(0)}
                              </option>
                            ))}
                          </select>
                        </td>
                        
                        <td className="px-3 py-3">
                          <select
                            value={leg.expiration}
                            onChange={(e) => updateLeg(leg.id, { expiration: e.target.value })}
                            className={`p-1 rounded border ${themeClasses.input} text-sm`}
                          >
                            {availableExpirations.map(exp => (
                              <option key={exp} value={exp}>
                                {new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </option>
                            ))}
                          </select>
                        </td>
                        
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={leg.quantity}
                            onChange={(e) => updateLeg(leg.id, { quantity: Number(e.target.value) })}
                            className={`w-16 p-1 rounded border ${themeClasses.input} text-sm font-mono`}
                            min="1"
                          />
                        </td>
                        
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={leg.premium}
                            onChange={(e) => updateLeg(leg.id, { premium: Number(e.target.value) })}
                            className={`w-20 p-1 rounded border ${themeClasses.input} text-sm font-mono`}
                            step="0.01"
                            min="0"
                          />
                        </td>
                        
                        <td className="px-3 py-3">
                          <span className="text-sm font-mono">
                            {formatPercent(leg.impliedVolatility)}
                          </span>
                        </td>
                        
                        <td className="px-3 py-3">
                          <span className={`text-sm font-mono ${
                            leg.greeks.delta >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {leg.greeks.delta.toFixed(3)}
                          </span>
                        </td>
                        
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => onLegTrade?.(leg)}
                              className="p-1 text-blue-500 hover:bg-blue-500/20 rounded"
                              title="Trade this leg"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeLeg(leg.id)}
                              className="p-1 text-red-500 hover:bg-red-500/20 rounded"
                              title="Remove leg"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className={themeClasses.textMuted}>
                  No strategy legs added. Click "Add Leg" or select a template to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Strategy Metrics Sidebar */}
        {showMetrics && legs.length > 0 && (
          <div className={`w-80 ${themeClasses.border} border-l overflow-y-auto`}>
            <div className="p-4">
              <h4 className={`font-medium mb-4 ${themeClasses.text} flex items-center`}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Strategy Metrics
              </h4>
              
              <div className="space-y-4">
                {/* P&L Metrics */}
                <div className={`${themeClasses.card} p-3 rounded-lg`}>
                  <h5 className={`font-medium mb-2 ${themeClasses.text}`}>Risk/Reward</h5>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Max Profit:</span>
                      <span className={`font-mono ${strategyMetrics.maxProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(strategyMetrics.maxProfit)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Max Loss:</span>
                      <span className={`font-mono ${strategyMetrics.maxLoss <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(Math.abs(strategyMetrics.maxLoss))}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Risk/Reward:</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {strategyMetrics.riskRewardRatio.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Breakeven:</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {strategyMetrics.breakeven.length > 0 
                          ? strategyMetrics.breakeven.map(be => `$${be.toFixed(2)}`).join(', ')
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Greeks */}
                <div className={`${themeClasses.card} p-3 rounded-lg`}>
                  <h5 className={`font-medium mb-2 ${themeClasses.text}`}>Portfolio Greeks</h5>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Delta:</span>
                      <span className={`font-mono ${strategyMetrics.netDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {strategyMetrics.netDelta.toFixed(3)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Gamma:</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {strategyMetrics.netGamma.toFixed(3)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Theta:</span>
                      <span className={`font-mono ${strategyMetrics.netTheta <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {strategyMetrics.netTheta.toFixed(3)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Vega:</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {strategyMetrics.netVega.toFixed(3)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Rho:</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {strategyMetrics.netRho.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strategy Info */}
                <div className={`${themeClasses.card} p-3 rounded-lg`}>
                  <h5 className={`font-medium mb-2 ${themeClasses.text}`}>Strategy Info</h5>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Total Premium:</span>
                      <span className={`font-mono ${strategyMetrics.totalPremium >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(strategyMetrics.totalPremium)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Margin Req:</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {formatCurrency(strategyMetrics.marginRequirement)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>Days to Exp:</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {strategyMetrics.daysToExpiration}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className={themeClasses.textMuted}>P(Profit):</span>
                      <span className={`font-mono ${themeClasses.text}`}>
                        {formatPercent(strategyMetrics.probabilityOfProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Utility functions for strategy calculations
function calculateMaxProfit(legs: OptionLeg[]): number {
  // Simplified calculation - would need proper options pricing model
  let maxProfit = 0;
  legs.forEach(leg => {
    if (leg.action === 'sell') {
      maxProfit += leg.premium * leg.quantity * 100;
    }
  });
  return maxProfit;
}

function calculateMaxLoss(legs: OptionLeg[], totalPremium: number): number {
  // Simplified calculation
  return Math.abs(totalPremium);
}

function calculateBreakeven(legs: OptionLeg[]): number[] {
  // Simplified calculation - would need proper breakeven analysis
  const strikes = legs.map(leg => leg.strike);
  return strikes.filter((strike, index, self) => self.indexOf(strike) === index);
}

function calculateProbabilityOfProfit(legs: OptionLeg[], underlyingPrice: number): number {
  // Simplified calculation - would use actual probability models
  return 0.45; // Mock 45% probability
}

function calculateMarginRequirement(legs: OptionLeg[]): number {
  // Simplified margin calculation
  let margin = 0;
  legs.forEach(leg => {
    if (leg.action === 'sell') {
      margin += leg.strike * leg.quantity * 0.2; // 20% of strike value
    }
  });
  return margin;
}

function calculateDaysToExpiration(legs: OptionLeg[]): number {
  if (legs.length === 0) return 0;
  const nearestExpiration = legs.reduce((nearest, leg) => {
    const expDate = new Date(leg.expiration).getTime();
    const nearestDate = new Date(nearest.expiration).getTime();
    return expDate < nearestDate ? leg : nearest;
  });
  
  const now = new Date().getTime();
  const expTime = new Date(nearestExpiration.expiration).getTime();
  return Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));
}

export default React.memo(StrategyBuilder);