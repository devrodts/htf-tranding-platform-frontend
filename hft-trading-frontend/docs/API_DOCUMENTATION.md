## Overview

The HFT Trading Platform Frontend provides a comprehensive REST API and WebSocket interface for ultra-low latency trading operations. This documentation covers all available endpoints, data structures, and integration patterns.

### API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HFT Frontend API                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   REST API      │  │   WebSocket     │  │  GraphQL     │ │
│  │   Port: 3000    │  │   Port: 8081    │  │  Port: 4000  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Authentication  │  │ Market Data     │  │ Order Mgmt   │ │
│  │ Clean Arch      │  │ Real-time       │  │ FIX Protocol │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   C++ Trading Engine                        │
│                   Port: 8080 (HTTP)                         │
└─────────────────────────────────────────────────────────────┘
```

### Performance Specifications

- **API Response Time:** P99 < 50ms
- **WebSocket Latency:** < 1ms message processing
- **Throughput:** 10,000+ requests/second
- **Concurrent Connections:** 1000+ WebSocket connections
- **Market Data Frequency:** 10Hz (100ms intervals)

---

## Base URLs

### Development Environment
```
REST API:     http://localhost:3000/api
WebSocket:    ws://localhost:8081/ws
C++ Backend:  http://localhost:8080/api
```

### Production Environment
```
REST API:     https://api-hft.trading.com/api
WebSocket:    wss://ws-hft.trading.com/ws
C++ Backend:  https://engine-hft.trading.com/api
```

---

## Authentication

### JWT Token Authentication

All API requests require authentication via JWT tokens in the Authorization header.

```typescript
interface AuthenticationRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: UserProfile;
}
```

#### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-API-Version: 1.0
X-Client-ID: <client_identifier>
```

---

## REST API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and obtain JWT tokens.

**Request Body:**
```json
{
  "email": "trader@institution.com",
  "password": "secure_password",
  "twoFactorCode": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "user_123",
      "email": "trader@institution.com",
      "role": "SENIOR_TRADER",
      "permissions": ["TRADE", "VIEW_POSITIONS", "MANAGE_ORDERS"]
    }
  }
}
```

#### POST /api/auth/refresh
Refresh JWT access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/logout
Revoke user session and invalidate tokens.

### Market Data Endpoints

#### GET /api/market-data/symbols
Retrieve available trading symbols.

**Query Parameters:**
- `exchange` (optional): Filter by exchange (NYSE, NASDAQ, LSE)
- `sector` (optional): Filter by sector
- `limit` (optional): Maximum results (default: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "sector": "Technology",
      "exchange": "NASDAQ",
      "currency": "USD",
      "lotSize": 100,
      "tickSize": 0.01,
      "tradingHours": {
        "preMarket": "04:00-09:30",
        "regular": "09:30-16:00",
        "afterHours": "16:00-20:00"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 8,
    "hasNext": false
  }
}
```

#### GET /api/market-data/quotes/{symbol}
Get real-time quote for specific symbol.

**Path Parameters:**
- `symbol`: Trading symbol (e.g., AAPL)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "bid": 175.25,
    "ask": 175.27,
    "last": 175.26,
    "volume": 12500000,
    "change": 2.15,
    "changePercent": 1.24,
    "high": 176.50,
    "low": 173.80,
    "open": 174.10,
    "previousClose": 173.11,
    "timestamp": 1699459200000,
    "marketStatus": "OPEN"
  }
}
```

#### GET /api/market-data/depth/{symbol}
Get Level 2 market depth data.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "bids": [
      {"price": 175.25, "size": 1000, "orders": 5},
      {"price": 175.24, "size": 2500, "orders": 12}
    ],
    "asks": [
      {"price": 175.27, "size": 800, "orders": 3},
      {"price": 175.28, "size": 1500, "orders": 7}
    ],
    "timestamp": 1699459200000
  }
}
```

### Trading Endpoints

#### GET /api/trading/portfolio
Retrieve user's portfolio information.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accountId": "ACC_123456",
    "totalValue": 125750.00,
    "cash": 25000.00,
    "investedValue": 100750.00,
    "dayPnL": 2500.00,
    "totalPnL": 25750.00,
    "buyingPower": 50000.00,
    "marginUsed": 30000.00,
    "positions": [
      {
        "symbol": "AAPL",
        "quantity": 100,
        "averagePrice": 175.00,
        "currentPrice": 177.50,
        "marketValue": 17750.00,
        "unrealizedPnL": 250.00,
        "realizedPnL": 0.00,
        "side": "LONG"
      }
    ],
    "timestamp": 1699459200000
  }
}
```

#### POST /api/trading/orders
Submit new trading order.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 100,
  "price": 175.00,
  "timeInForce": "DAY",
  "clientOrderId": "ORDER_123456",
  "stopPrice": null,
  "algorithmParams": {
    "strategy": "VWAP",
    "participationRate": 0.1,
    "maxOrderSize": 1000
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD_789012",
    "clientOrderId": "ORDER_123456",
    "symbol": "AAPL",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 100,
    "price": 175.00,
    "status": "PENDING_NEW",
    "timeInForce": "DAY",
    "createdAt": 1699459200000,
    "updatedAt": 1699459200000
  }
}
```

#### GET /api/trading/orders
Retrieve user's order history.

**Query Parameters:**
- `status` (optional): Filter by order status
- `symbol` (optional): Filter by symbol
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): Pagination offset

#### PUT /api/trading/orders/{orderId}
Modify existing order.

**Path Parameters:**
- `orderId`: Order identifier

**Request Body:**
```json
{
  "quantity": 150,
  "price": 174.50
}
```

#### DELETE /api/trading/orders/{orderId}
Cancel existing order.

### Risk Management Endpoints

#### GET /api/risk/limits
Retrieve current risk limits.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accountId": "ACC_123456",
    "limits": {
      "maxOrderValue": 100000.00,
      "maxPositionSize": 10000,
      "maxLeverage": 4.0,
      "maxDailyLoss": 50000.00,
      "maxSymbolExposure": 25000.00
    },
    "current": {
      "totalExposure": 75000.00,
      "leverage": 2.5,
      "dailyPnL": -5000.00,
      "violations": []
    },
    "timestamp": 1699459200000
  }
}
```

### Analytics Endpoints

#### GET /api/analytics/performance
Retrieve performance analytics.

**Query Parameters:**
- `period`: Time period (1D, 1W, 1M, 1Y)
- `metrics`: Comma-separated list of metrics

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "1M",
    "metrics": {
      "totalReturn": 0.1245,
      "sharpeRatio": 1.85,
      "maxDrawdown": -0.0523,
      "volatility": 0.1876,
      "beta": 1.12,
      "alpha": 0.0234,
      "winRate": 0.65,
      "avgWin": 145.50,
      "avgLoss": -89.25
    },
    "dailyReturns": [
      {"date": "2025-08-01", "return": 0.0125},
      {"date": "2025-08-02", "return": -0.0089}
    ],
    "timestamp": 1699459200000
  }
}
```

---

## WebSocket API

### Connection

Connect to WebSocket endpoint for real-time data:

```javascript
const ws = new WebSocket('ws://localhost:8081/ws');
```

### Message Format

All WebSocket messages follow this format:

```typescript
interface WebSocketMessage {
  type: string;
  timestamp: number;
  [key: string]: any;
}
```

### Subscription Management

#### Subscribe to Market Data
```json
{
  "type": "SUBSCRIBE",
  "symbols": ["AAPL", "GOOGL", "MSFT"],
  "timestamp": 1699459200000
}
```

#### Unsubscribe from Market Data
```json
{
  "type": "UNSUBSCRIBE",
  "symbols": ["AAPL"],
  "timestamp": 1699459200000
}
```

### Real-time Messages

#### Market Data Update
```json
{
  "type": "MARKET_DATA",
  "symbols": [
    {
      "symbol": "AAPL",
      "price": 175.26,
      "bid": 175.25,
      "ask": 175.27,
      "volume": 12500000,
      "change": 2.15,
      "changePercent": 1.24,
      "timestamp": 1699459200000
    }
  ],
  "timestamp": 1699459200000
}
```

#### Order Update
```json
{
  "type": "ORDER_UPDATE",
  "orderId": "ORD_789012",
  "symbol": "AAPL",
  "status": "FILLED",
  "filledQuantity": 100,
  "averagePrice": 175.12,
  "timestamp": 1699459200000
}
```

#### Position Update
```json
{
  "type": "POSITION_UPDATE",
  "symbol": "AAPL",
  "quantity": 200,
  "averagePrice": 175.06,
  "unrealizedPnL": 400.00,
  "timestamp": 1699459200000
}
```

#### Heartbeat
```json
{
  "type": "HEARTBEAT",
  "timestamp": 1699459200000,
  "status": "CONNECTED"
}
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ORDER",
    "message": "Order quantity exceeds position limits",
    "details": {
      "field": "quantity",
      "maxAllowed": 1000,
      "requested": 1500
    },
    "timestamp": 1699459200000,
    "requestId": "req_12345"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_FAILED` | Invalid credentials |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `INVALID_ORDER` | Order parameters are invalid |
| `INSUFFICIENT_FUNDS` | Not enough buying power |
| `MARKET_CLOSED` | Trading outside market hours |
| `SYMBOL_NOT_FOUND` | Invalid trading symbol |
| `ORDER_NOT_FOUND` | Order ID not found |
| `RISK_LIMIT_EXCEEDED` | Order violates risk limits |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

---

## Rate Limiting

### REST API Limits

- **General Endpoints**: 1000 requests/minute per user
- **Market Data**: 5000 requests/minute per user
- **Trading**: 100 orders/minute per user
- **WebSocket**: 1000+ concurrent connections

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699459260
X-RateLimit-Window: 60
```

---

## SDK Integration

### TypeScript/JavaScript SDK

```typescript
import { HFTTradingSDK } from '@hft-platform/sdk';

const sdk = new HFTTradingSDK({
  baseUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:8081/ws',
  apiKey: 'your-api-key'
});

// Authenticate
await sdk.auth.login({
  email: 'trader@institution.com',
  password: 'password'
});

// Subscribe to real-time data
sdk.marketData.subscribe(['AAPL', 'GOOGL']);

// Place order
const order = await sdk.trading.createOrder({
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 100,
  price: 175.00
});
```

---

## Testing

### Test Data

The development environment includes realistic test data:

**Symbols:** AAPL, GOOGL, MSFT, TSLA, AMZN, META, NVDA, BRK.A  
**Price Range:** $99.00 - $101.00 (base)  
**Update Frequency:** 100ms intervals  
**Daily Volume:** 1M - 6M shares  

### Mock Responses

All endpoints provide consistent mock data for development and testing.

### Performance Testing

- **Load Testing**: 10,000+ concurrent connections
- **Latency Testing**: Sub-millisecond WebSocket processing
- **Stress Testing**: Order burst handling (1000+ orders/second)

---

## Monitoring & Observability

### Health Check

#### GET /api/health
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": 1699459200000,
  "services": {
    "database": "healthy",
    "websocket": "healthy",
    "tradingEngine": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "memoryUsage": "245MB",
    "activeConnections": 1247
  }
}
```

### Metrics Endpoints

- **GET /api/metrics**: Prometheus-compatible metrics
- **GET /api/metrics/trading**: Trading-specific metrics
- **GET /api/metrics/performance**: Performance metrics

---

## Security

### API Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent API abuse
- **CORS**: Cross-origin request protection
- **Input Validation**: Comprehensive request validation
- **Audit Logging**: Complete request/response logging

### WebSocket Security

- **Connection Authentication**: JWT validation on connect
- **Message Signing**: Optional message integrity verification
- **Rate Limiting**: Per-connection message limits
- **Origin Validation**: Whitelist allowed origins

---

## Compliance & Audit

### Regulatory Requirements

- **MiFID II**: Transaction reporting and timestamp accuracy
- **SEC Rule 15c3-5**: Market access controls
- **GDPR**: Personal data protection
- **SOX**: Financial reporting controls

### Audit Trail

All API calls are logged with:
- User identification
- Request/response payload
- Timestamp (microsecond precision)
- Source IP address
- Request outcome
