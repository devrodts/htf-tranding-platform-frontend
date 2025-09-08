// Professional HFT Chart Type Definitions

import { UTCTimestamp, Time } from 'lightweight-charts';

// Core Market Data Types
export interface OHLCVData {
  time: UTCTimestamp;
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
  exchange?: string;
  tradeId?: string;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  count: number;
  side: 'bid' | 'ask';
}

export interface MarketDepthData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercentage: number;
  midPrice: number;
  timestamp: number;
  symbol: string;
}

// Technical Indicators
export interface TechnicalIndicator {
  name: string;
  type: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'VWAP' | 'PIVOT' | 'STOCH' | 'ADX' | 'CCI';
  period?: number;
  enabled: boolean;
  color: string;
  lineWidth?: number;
  params?: Record<string, number>;
}

export interface IndicatorData {
  time: UTCTimestamp;
  value: number | number[];
  color?: string;
}

// Volume Analysis
export interface VolumeNode {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  transactions: number;
  percentage: number;
  avgTradeSize: number;
}

export interface VolumeProfileData {
  nodes: VolumeNode[];
  totalVolume: number;
  valueAreaHigh: number;
  valueAreaLow: number;
  pointOfControl: number;
  valueAreaVolume: number;
  timeframe: string;
  symbol: string;
}

// Chart Configuration
export type ChartTimeframe = '1s' | '5s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface ChartTheme {
  name: 'light' | 'dark' | 'professional';
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  crosshairColor: string;
  upColor: string;
  downColor: string;
  volumeUpColor: string;
  volumeDownColor: string;
  borderColor: string;
}

export interface ChartSettings {
  timeframe: ChartTimeframe;
  theme: ChartTheme;
  showVolume: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  showOrders: boolean;
  showPositions: boolean;
  autoScale: boolean;
  priceScale: 'normal' | 'logarithmic' | 'percentage';
  maxCandles: number;
  enableTrading: boolean;
  enableAlerts: boolean;
}

// Trading Chart Events
export interface ChartCrosshairEvent {
  time: Time | null;
  price: number | null;
  seriesData: Map<string, any>;
}

export interface ChartClickEvent {
  time: Time;
  price: number;
  coordinate: {
    x: number;
    y: number;
  };
}

export interface OrderPlacementEvent {
  price: number;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop-limit';
  quantity?: number;
}

// Market Statistics
export interface MarketStats {
  symbol: string;
  lastPrice: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  vwap24h: number;
  marketCap?: number;
  turnover24h?: number;
  fundingRate?: number;
  openInterest?: number;
}

// Level II Data
export interface Level2Update {
  symbol: string;
  side: 'bid' | 'ask';
  price: number;
  size: number;
  action: 'insert' | 'update' | 'delete';
  timestamp: number;
}

export interface Level2Snapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  sequence: number;
}

// Real-time Data Feed
export interface MarketDataMessage {
  type: 'ticker' | 'trade' | 'orderbook' | 'level2' | 'kline' | 'depth';
  symbol: string;
  timestamp: number;
  data: any;
}

export interface WebSocketSubscription {
  channel: string;
  symbol: string;
  params?: Record<string, any>;
}

// Chart Drawing Tools
export interface DrawingTool {
  id: string;
  type: 'line' | 'rectangle' | 'fibonacci' | 'support' | 'resistance' | 'text' | 'arrow';
  points: Array<{ time: Time; price: number }>;
  style: {
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
  };
  text?: string;
  isVisible: boolean;
  isLocked: boolean;
}

export interface FibonacciLevel {
  level: number;
  price: number;
  label: string;
  color: string;
}

// Alert System
export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: 'above' | 'below' | 'cross';
  isActive: boolean;
  message: string;
  created: number;
  triggered?: number;
}

export interface VolumeAlert {
  id: string;
  symbol: string;
  volumeThreshold: number;
  timeframe: ChartTimeframe;
  isActive: boolean;
  message: string;
  created: number;
  triggered?: number;
}

// Performance Metrics
export interface ChartPerformanceMetrics {
  renderTime: number;
  dataProcessingTime: number;
  memoryUsage: number;
  fps: number;
  dataPoints: number;
  lastUpdate: number;
}

// Chart Data Provider Interface
export interface ChartDataProvider {
  getHistoricalData: (symbol: string, timeframe: ChartTimeframe, limit: number) => Promise<OHLCVData[]>;
  getMarketDepth: (symbol: string, levels: number) => Promise<MarketDepthData>;
  getVolumeProfile: (symbol: string, timeframe: ChartTimeframe) => Promise<VolumeProfileData>;
  getTrades: (symbol: string, limit: number) => Promise<TickData[]>;
  subscribeToRealTimeData: (symbols: string[], callback: (data: MarketDataMessage) => void) => void;
  unsubscribeFromRealTimeData: (symbols: string[]) => void;
}

// Error Types
export interface ChartError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export type ChartErrorCode = 
  | 'DATA_FETCH_ERROR'
  | 'WEBSOCKET_CONNECTION_ERROR'
  | 'INVALID_SYMBOL'
  | 'INSUFFICIENT_DATA'
  | 'RENDERING_ERROR'
  | 'CONFIGURATION_ERROR';

// Export all types
export type {
  Time,
  UTCTimestamp
} from 'lightweight-charts';