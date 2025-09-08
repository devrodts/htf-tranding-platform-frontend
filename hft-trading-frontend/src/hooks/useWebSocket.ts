/**
 * @file useWebSocket.ts
 * @brief Ultra-Low Latency WebSocket Hook for HFT Trading Platform
 * @author HFT Development Team
 * 
 * Enterprise-grade WebSocket hook implementing:
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring with heartbeat
 * - Message queuing during disconnections
 * - Performance metrics tracking
 * - Type-safe message handling
 * - Memory-efficient message processing
 * 
 * Performance Targets:
 * - Connection establishment: < 50ms
 * - Message processing latency: < 1ms
 * - Automatic reconnection: < 2s
 * - Memory usage: < 10MB for 1000+ messages
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// WebSocket connection states
export type ConnectionStatus = 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'DISCONNECTING' 
  | 'DISCONNECTED' 
  | 'ERROR' 
  | 'RECONNECTING';

// WebSocket message types for HFT platform
export interface WebSocketMessage {
  type: string;
  timestamp: number;
  [key: string]: any;
}

// Market data message structure
export interface MarketDataMessage extends WebSocketMessage {
  type: 'MARKET_DATA';
  symbols: Array<{
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    volume: number;
    change: number;
    changePercent: number;
    timestamp: number;
  }>;
}

// Order update message structure
export interface OrderUpdateMessage extends WebSocketMessage {
  type: 'ORDER_UPDATE';
  orderId: string;
  symbol: string;
  status: string;
  filledQty: number;
  avgPrice: number;
}

// WebSocket configuration
export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  
  // Reconnection settings
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number; // Base interval in ms
  maxReconnectInterval?: number; // Max interval in ms
  reconnectDecay?: number; // Exponential backoff factor
  
  // Connection settings  
  connectionTimeout?: number; // ms
  heartbeatInterval?: number; // ms
  messageQueueSize?: number; // max queued messages
  
  // Performance settings
  enablePerformanceMetrics?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Performance metrics tracking
export interface WebSocketMetrics {
  messagesReceived: number;
  messagesSent: number;
  connectionAttempts: number;
  successfulConnections: number;
  averageLatency: number; // milliseconds
  lastMessageTime: number;
  connectionTime: number;
  dataTransferred: number; // bytes
}

// WebSocket hook return interface
export interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  lastMessage: WebSocketMessage | null;
  lastJsonMessage: any;
  sendMessage: (message: any) => boolean;
  sendJsonMessage: (message: object) => boolean;
  getWebSocket: () => WebSocket | null;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Subscription management
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  
  // Performance monitoring
  metrics: WebSocketMetrics;
  isHealthy: boolean;
  
  // Message filtering
  getLastMessageOfType: <T extends WebSocketMessage>(type: string) => T | null;
  getMessageHistory: (type?: string, limit?: number) => WebSocketMessage[];
}

// Default configuration optimized for HFT
const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: '',
  protocols: [],
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 1000, // Start with 1 second
  maxReconnectInterval: 30000, // Max 30 seconds
  reconnectDecay: 1.5, // Exponential backoff
  connectionTimeout: 10000, // 10 seconds
  heartbeatInterval: 30000, // 30 seconds
  messageQueueSize: 1000,
  enablePerformanceMetrics: true,
  logLevel: 'info' as const
};

/**
 * Ultra-low latency WebSocket hook for HFT trading platform
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnections  
 * - Performance metrics tracking
 * - Type-safe message handling
 * - Memory-efficient circular buffer for message history
 * 
 * @param config WebSocket configuration
 * @returns WebSocket hook interface with connection management
 */
export const useWebSocket = (config: WebSocketConfig): UseWebSocketReturn => {
  const fullConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastJsonMessage, setLastJsonMessage] = useState<any>(null);
  const [isHealthy, setIsHealthy] = useState(false);
  
  // Refs for performance-critical data
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<any[]>([]);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  
  // Circular buffer for message history (memory efficient)
  const messageHistoryRef = useRef<WebSocketMessage[]>([]);
  const messageHistoryIndexRef = useRef(0);
  
  // Performance metrics
  const [metrics, setMetrics] = useState<WebSocketMetrics>({
    messagesReceived: 0,
    messagesSent: 0,
    connectionAttempts: 0,
    successfulConnections: 0,
    averageLatency: 0,
    lastMessageTime: 0,
    connectionTime: 0,
    dataTransferred: 0
  });
  
  // Logging utility
  const log = useCallback((level: string, message: string, ...args: any[]) => {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[fullConfig.logLevel];
    const messageLevel = levels[level as keyof typeof levels];
    
    if (messageLevel >= configLevel) {
      console[level as keyof Console](`[WebSocket HFT] ${message}`, ...args);
    }
  }, [fullConfig.logLevel]);
  
  // Add message to circular buffer history
  const addToMessageHistory = useCallback((message: WebSocketMessage) => {
    const history = messageHistoryRef.current;
    const index = messageHistoryIndexRef.current;
    
    history[index] = message;
    messageHistoryIndexRef.current = (index + 1) % fullConfig.messageQueueSize;
    
    // If buffer is full, we've wrapped around
    if (history.length < fullConfig.messageQueueSize) {
      history.push(message);
    }
  }, [fullConfig.messageQueueSize]);
  
  // Get message history with optional filtering
  const getMessageHistory = useCallback((type?: string, limit: number = 100): WebSocketMessage[] => {
    const history = messageHistoryRef.current;
    const filtered = type ? history.filter(msg => msg?.type === type) : history;
    return filtered.slice(-limit);
  }, []);
  
  // Get last message of specific type
  const getLastMessageOfType = useCallback(<T extends WebSocketMessage>(type: string): T | null => {
    const history = messageHistoryRef.current;
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg?.type === type) {
        return msg as T;
      }
    }
    return null;
  }, []);
  
  // Update performance metrics
  const updateMetrics = useCallback((update: Partial<WebSocketMetrics>) => {
    setMetrics(prev => {
      const newMetrics = { ...prev, ...update };
      
      // Calculate average latency if needed
      if (update.messagesReceived !== undefined) {
        const totalMessages = newMetrics.messagesReceived;
        if (totalMessages > 0 && update.averageLatency !== undefined) {
          newMetrics.averageLatency = (prev.averageLatency * (totalMessages - 1) + update.averageLatency) / totalMessages;
        }
      }
      
      return newMetrics;
    });
  }, []);
  
  // Send heartbeat to maintain connection
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const heartbeat = {
        type: 'HEARTBEAT',
        timestamp: Date.now()
      };
      
      wsRef.current.send(JSON.stringify(heartbeat));
      log('debug', 'Heartbeat sent');
      
      updateMetrics({ messagesSent: metrics.messagesSent + 1 });
    }
  }, [log, updateMetrics, metrics.messagesSent]);
  
  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setInterval(sendHeartbeat, fullConfig.heartbeatInterval);
    log('debug', `Heartbeat started with ${fullConfig.heartbeatInterval}ms interval`);
  }, [sendHeartbeat, fullConfig.heartbeatInterval, log]);
  
  // Stop heartbeat interval
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
      log('debug', 'Heartbeat stopped');
    }
  }, [log]);
  
  // Process queued messages after reconnection
  const processMessageQueue = useCallback(() => {
    const queue = messageQueueRef.current;
    if (queue.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      log('info', `Processing ${queue.length} queued messages`);
      
      while (queue.length > 0) {
        const message = queue.shift();
        wsRef.current.send(JSON.stringify(message));
        updateMetrics({ messagesSent: metrics.messagesSent + 1 });
      }
    }
  }, [log, updateMetrics, metrics.messagesSent]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      log('warn', 'Connection already exists or is connecting');
      return;
    }
    
    try {
      setConnectionStatus('CONNECTING');
      updateMetrics({ connectionAttempts: metrics.connectionAttempts + 1 });
      
      log('info', `Connecting to ${fullConfig.url}...`);
      const startTime = Date.now();
      
      // Create new WebSocket connection
      const ws = new WebSocket(fullConfig.url, fullConfig.protocols);
      wsRef.current = ws;
      
      // Connection timeout
      const timeoutId = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          log('error', 'Connection timeout');
          ws.close();
          setConnectionStatus('ERROR');
        }
      }, fullConfig.connectionTimeout);
      
      ws.onopen = (event) => {
        clearTimeout(timeoutId);
        const connectionTime = Date.now() - startTime;
        
        log('info', `Connected in ${connectionTime}ms`);
        setConnectionStatus('CONNECTED');
        setIsHealthy(true);
        
        reconnectAttemptsRef.current = 0;
        
        updateMetrics({
          successfulConnections: metrics.successfulConnections + 1,
          connectionTime
        });
        
        // Start heartbeat
        startHeartbeat();
        
        // Process any queued messages
        processMessageQueue();
        
        // Re-subscribe to previously subscribed symbols
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          log('info', `Re-subscribing to ${symbols.length} symbols:`, symbols);
          
          ws.send(JSON.stringify({
            type: 'SUBSCRIBE',
            symbols: symbols,
            timestamp: Date.now()
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const messageStartTime = performance.now();
          const data = JSON.parse(event.data);
          const messageEndTime = performance.now();
          const processingLatency = messageEndTime - messageStartTime;
          
          // Update metrics
          updateMetrics({
            messagesReceived: metrics.messagesReceived + 1,
            lastMessageTime: Date.now(),
            averageLatency: processingLatency,
            dataTransferred: metrics.dataTransferred + event.data.length
          });
          
          // Add timestamp if not present
          if (!data.timestamp) {
            data.timestamp = Date.now();
          }
          
          // Update state
          setLastMessage(data);
          setLastJsonMessage(data);
          
          // Add to message history
          addToMessageHistory(data);
          
          // Update health status based on recent messages
          setIsHealthy(true);
          
          if (fullConfig.enablePerformanceMetrics) {
            log('debug', `Message processed in ${processingLatency.toFixed(3)}ms:`, data.type);
          }
          
        } catch (error) {
          log('error', 'Failed to parse message:', error, event.data);
        }
      };
      
      ws.onerror = (error) => {
        log('error', 'WebSocket error:', error);
        setConnectionStatus('ERROR');
        setIsHealthy(false);
        stopHeartbeat();
      };
      
      ws.onclose = (event) => {
        log('info', `Connection closed: ${event.code} ${event.reason}`);
        setConnectionStatus('DISCONNECTED');
        setIsHealthy(false);
        stopHeartbeat();
        
        // Auto-reconnect if enabled and not a clean close
        if (fullConfig.autoReconnect && event.code !== 1000) {
          scheduleReconnect();
        }
      };
      
    } catch (error) {
      log('error', 'Failed to create WebSocket:', error);
      setConnectionStatus('ERROR');
      setIsHealthy(false);
    }
  }, [fullConfig, log, updateMetrics, metrics, startHeartbeat, processMessageQueue, addToMessageHistory, stopHeartbeat]);
  
  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= fullConfig.maxReconnectAttempts) {
      log('error', `Max reconnect attempts (${fullConfig.maxReconnectAttempts}) exceeded`);
      setConnectionStatus('ERROR');
      return;
    }
    
    const attempt = reconnectAttemptsRef.current++;
    const delay = Math.min(
      fullConfig.reconnectInterval * Math.pow(fullConfig.reconnectDecay, attempt),
      fullConfig.maxReconnectInterval
    );
    
    log('info', `Scheduling reconnect attempt ${attempt + 1} in ${delay}ms`);
    setConnectionStatus('RECONNECTING');
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (fullConfig.autoReconnect) {
        connect();
      }
    }, delay);
  }, [fullConfig, log, connect]);
  
  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      setConnectionStatus('DISCONNECTING');
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    setConnectionStatus('DISCONNECTED');
    setIsHealthy(false);
    log('info', 'Disconnected');
  }, [stopHeartbeat, log]);
  
  // Reconnect WebSocket
  const reconnect = useCallback(() => {
    log('info', 'Manual reconnect requested');
    disconnect();
    setTimeout(connect, 100); // Brief delay to ensure clean disconnect
  }, [disconnect, connect, log]);
  
  // Send raw message
  const sendMessage = useCallback((message: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(message);
        updateMetrics({ messagesSent: metrics.messagesSent + 1 });
        return true;
      } catch (error) {
        log('error', 'Failed to send message:', error);
        return false;
      }
    } else {
      // Queue message if disconnected and auto-reconnect is enabled
      if (fullConfig.autoReconnect && messageQueueRef.current.length < fullConfig.messageQueueSize) {
        messageQueueRef.current.push(message);
        log('debug', 'Message queued (disconnected)');
        return true;
      }
      
      log('warn', 'Cannot send message: not connected');
      return false;
    }
  }, [log, fullConfig, updateMetrics, metrics.messagesSent]);
  
  // Send JSON message
  const sendJsonMessage = useCallback((message: object): boolean => {
    try {
      const jsonString = JSON.stringify({
        ...message,
        timestamp: Date.now()
      });
      return sendMessage(jsonString);
    } catch (error) {
      log('error', 'Failed to serialize JSON message:', error);
      return false;
    }
  }, [sendMessage, log]);
  
  // Subscribe to market data symbols
  const subscribe = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    const subscribeMessage = {
      type: 'SUBSCRIBE',
      symbols: symbols,
      timestamp: Date.now()
    };
    
    const success = sendJsonMessage(subscribeMessage);
    if (success) {
      log('info', `Subscribed to symbols: ${symbols.join(', ')}`);
    } else {
      log('warn', `Failed to subscribe to symbols: ${symbols.join(', ')}`);
    }
    
    return success;
  }, [sendJsonMessage, log]);
  
  // Unsubscribe from market data symbols
  const unsubscribe = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.delete(symbol));
    
    const unsubscribeMessage = {
      type: 'UNSUBSCRIBE',
      symbols: symbols,
      timestamp: Date.now()
    };
    
    const success = sendJsonMessage(unsubscribeMessage);
    if (success) {
      log('info', `Unsubscribed from symbols: ${symbols.join(', ')}`);
    } else {
      log('warn', `Failed to unsubscribe from symbols: ${symbols.join(', ')}`);
    }
    
    return success;
  }, [sendJsonMessage, log]);
  
  // Get current WebSocket instance
  const getWebSocket = useCallback(() => wsRef.current, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  // Health monitoring
  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      const healthCheckInterval = setInterval(() => {
        const timeSinceLastMessage = Date.now() - metrics.lastMessageTime;
        const isStale = timeSinceLastMessage > fullConfig.heartbeatInterval * 2;
        
        if (isStale && isHealthy) {
          log('warn', `No messages received for ${timeSinceLastMessage}ms - connection may be stale`);
          setIsHealthy(false);
        }
      }, fullConfig.heartbeatInterval);
      
      return () => clearInterval(healthCheckInterval);
    }
  }, [connectionStatus, metrics.lastMessageTime, fullConfig.heartbeatInterval, isHealthy, log]);
  
  return {
    connectionStatus,
    lastMessage,
    lastJsonMessage,
    sendMessage,
    sendJsonMessage,
    getWebSocket,
    connect,
    disconnect,
    reconnect,
    subscribe,
    unsubscribe,
    metrics,
    isHealthy,
    getLastMessageOfType,
    getMessageHistory
  };
};