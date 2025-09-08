# Frontend Architecture Documentation

**Version:** 1.0.0  
**Last Updated:** 2025-09-08  
**Classification:** Technical Architecture  

---

## Executive Summary

The HFT Trading Platform Frontend implements a sophisticated Clean Architecture pattern with Domain-Driven Design principles, optimized for ultra-low latency financial operations. The system processes real-time market data at 10Hz frequency while maintaining sub-millisecond UI responsiveness.

### Architectural Principles

- **Clean Architecture:** Clear separation of concerns across layers
- **Domain-Driven Design:** Business logic encapsulated in domain entities
- **SOLID Principles:** Maintainable and extensible code structure
- **Performance First:** Sub-millisecond real-time data processing
- **Type Safety:** Comprehensive TypeScript coverage with strict mode

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HFT Frontend Architecture                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    Presentation Layer (React)                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │   Pages     │  │ Components  │  │   Hooks     │  │  Providers │ │ │
│  │  │ (App Router)│  │   (UI)      │  │ (Business)  │  │ (Context)  │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                   Application Layer (Services)                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │   Auth      │  │   Trading   │  │ Market Data │  │ Portfolio  │ │ │
│  │  │  Services   │  │  Services   │  │  Services   │  │  Services  │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     Domain Layer (Entities)                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │    User     │  │    Order    │  │  Position   │  │ Portfolio  │ │ │
│  │  │   Session   │  │    Trade    │  │ MarketTick  │  │   Asset    │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                Infrastructure Layer (External)                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │  REST API   │  │  WebSocket  │  │ Local Store │  │   Cache    │ │ │
│  │  │   Client    │  │   Client    │  │ Repository  │  │ Repository │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Architecture Deep Dive

### Presentation Layer

**Technology Stack:**
- Next.js 15 (App Router)
- React 18.3.1 (Concurrent Features)
- TypeScript 5.3 (Strict Mode)
- Tailwind CSS 3.3 (Utility-First)

**Components Architecture:**
```typescript
// Component Hierarchy
src/components/
├── layout/              // Application shell and navigation
│   ├── AppShell.tsx     // Main layout container
│   ├── Header.tsx       // Navigation header with user menu
│   └── Sidebar.tsx      // Collapsible navigation sidebar
├── trading/             // Core trading interface
│   ├── MarketDashboard.tsx      // Main trading dashboard
│   ├── OrderBookWidget.tsx      // Level 2 market data
│   ├── RealTimeTickerGrid.tsx   // Multi-symbol quotes
│   ├── AlgorithmEngine.tsx      // Strategy execution
│   └── RiskManagement.tsx       // Risk controls
├── charts/              // Financial visualizations
│   ├── TradingViewChart.tsx     // Professional charting
│   ├── MarketDepth.tsx          // Depth visualization
│   └── VolumeProfile.tsx        // Volume analysis
├── analytics/           // Performance metrics
│   ├── PerformanceDashboard.tsx // P&L analytics
│   └── PortfolioComposition.tsx // Asset allocation
├── options/             // Options trading
│   ├── OptionsChain.tsx         // Options pricing
│   ├── GreeksAnalyzer.tsx       // Risk Greeks
│   └── PayoffDiagram.tsx        // Strategy visualization
├── auth/                // Authentication
│   ├── LoginForm.tsx            // Login interface
│   ├── RegisterForm.tsx         // Registration
│   └── ProtectedRoute.tsx       // Access control
└── ui/                  // Base components
    ├── Button.tsx               // Action buttons
    ├── Input.tsx                // Form inputs
    ├── Card.tsx                 // Content containers
    └── Table.tsx                // Data tables
```

**Performance Optimizations:**
- React.memo with custom comparisons
- useCallback for event handlers
- useMemo for expensive calculations
- Virtual scrolling for large datasets
- Code splitting with React.lazy
- Bundle optimization with Next.js

### Application Layer

**Service Architecture:**
```typescript
// Service Layer Structure
src/*/application/services/
├── auth/
│   ├── AuthenticationService.ts    // User authentication
│   ├── PasswordService.ts          // Password management
│   ├── TokenService.ts             // JWT handling
│   └── TwoFactorService.ts         // 2FA implementation
├── trading/
│   ├── OrderService.ts             // Order lifecycle
│   ├── ExecutionService.ts         // Trade execution
│   ├── PositionService.ts          // Position management
│   └── RiskService.ts              // Risk validation
├── market-data/
│   ├── RealTimeDataService.ts      // Live data processing
│   ├── HistoricalDataService.ts    // Historical data
│   └── MarketDataProcessor.ts      // Data normalization
└── portfolio/
    ├── PortfolioService.ts         // Portfolio management
    ├── PerformanceService.ts       // Analytics calculation
    └── ReportingService.ts         // Report generation
```

**Use Case Implementation:**
```typescript
// Example: Order Submission Use Case
export class SubmitOrderUseCase {
  constructor(
    private orderService: OrderService,
    private riskService: RiskService,
    private portfolioService: PortfolioService
  ) {}

  async execute(orderRequest: OrderRequest): Promise<OrderResult> {
    // 1. Validate order parameters
    const validationResult = await this.orderService.validate(orderRequest);
    if (!validationResult.isValid) {
      return OrderResult.failure(validationResult.errors);
    }

    // 2. Check risk limits
    const riskCheck = await this.riskService.checkLimits(orderRequest);
    if (!riskCheck.approved) {
      return OrderResult.failure(['Risk limit exceeded']);
    }

    // 3. Submit order to trading engine
    const order = await this.orderService.submit(orderRequest);
    
    // 4. Update portfolio projections
    await this.portfolioService.updateProjections(order);

    return OrderResult.success(order);
  }
}
```

### Domain Layer

**Entity Design:**
```typescript
// Domain Entity Example
export class Order extends Entity<OrderId> {
  private constructor(
    id: OrderId,
    private props: OrderProps
  ) {
    super(id);
  }

  // Factory method
  static create(props: CreateOrderProps): Result<Order> {
    const validatedProps = this.validateProps(props);
    if (validatedProps.isFailure) {
      return Result.fail(validatedProps.error);
    }

    const order = new Order(
      OrderId.create(),
      validatedProps.getValue()
    );

    // Emit domain event
    order.addDomainEvent(new OrderCreatedEvent(order));
    
    return Result.ok(order);
  }

  // Business logic methods
  public canBeModified(): boolean {
    return this.props.status.canBeModified();
  }

  public modify(newQuantity: Quantity, newPrice?: Price): Result<void> {
    if (!this.canBeModified()) {
      return Result.fail('Order cannot be modified in current status');
    }

    this.props.quantity = newQuantity;
    if (newPrice) {
      this.props.price = newPrice;
    }

    this.addDomainEvent(new OrderModifiedEvent(this));
    return Result.ok();
  }

  // Value object getters
  get symbol(): Symbol { return this.props.symbol; }
  get quantity(): Quantity { return this.props.quantity; }
  get price(): Price { return this.props.price; }
  get status(): OrderStatus { return this.props.status; }
}
```

**Value Objects:**
```typescript
// Price Value Object
export class Price extends ValueObject<PriceProps> {
  private constructor(props: PriceProps) {
    super(props);
  }

  static create(value: number, currency: Currency): Result<Price> {
    if (value <= 0) {
      return Result.fail('Price must be positive');
    }

    if (value > 1000000) {
      return Result.fail('Price exceeds maximum allowed');
    }

    return Result.ok(new Price({ value, currency }));
  }

  get value(): number {
    return this.props.value;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  formatForDisplay(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency.code
    }).format(this.value);
  }

  equals(price: Price): boolean {
    return this.props.value === price.value && 
           this.props.currency.equals(price.currency);
  }
}
```

**Domain Events:**
```typescript
// Domain Event System
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly aggregateId: string;

  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
  }
}

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly order: Order
  ) {
    super(order.id.toString());
  }
}

// Event Handler
export class OrderCreatedEventHandler {
  constructor(
    private portfolioService: PortfolioService,
    private riskService: RiskService
  ) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    // Update portfolio projections
    await this.portfolioService.projectOrder(event.order);
    
    // Update risk metrics
    await this.riskService.updateExposure(event.order);
    
    // Emit UI update
    EventBus.emit('order-created', event.order);
  }
}
```

### Infrastructure Layer

**Repository Pattern:**
```typescript
// Repository Interface (Domain Layer)
export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}

// Repository Implementation (Infrastructure Layer)
export class HttpUserRepository implements IUserRepository {
  constructor(
    private httpClient: HttpClient,
    private mapper: UserMapper
  ) {}

  async findById(id: UserId): Promise<User | null> {
    try {
      const response = await this.httpClient.get(`/users/${id.value}`);
      return this.mapper.toDomain(response.data);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async save(user: User): Promise<void> {
    const dto = this.mapper.toDTO(user);
    await this.httpClient.post('/users', dto);
  }
}
```

**WebSocket Infrastructure:**
```typescript
// WebSocket Client Architecture
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempts = 0;

  constructor(
    private config: WebSocketConfig,
    private eventBus: EventBus
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.processMessageQueue();
        this.eventBus.emit('websocket:connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.handleDisconnection();
      };

      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    // Route message to appropriate handler
    switch (message.type) {
      case 'MARKET_DATA':
        this.eventBus.emit('market-data:update', message.data);
        break;
      case 'ORDER_UPDATE':
        this.eventBus.emit('order:update', message.data);
        break;
      case 'POSITION_UPDATE':
        this.eventBus.emit('position:update', message.data);
        break;
    }
  }

  subscribe(symbol: string, callback: (data: any) => void): void {
    const subscription = new Subscription(symbol, callback);
    this.subscriptions.set(symbol, subscription);
    
    this.send({
      type: 'SUBSCRIBE',
      symbol: symbol,
      timestamp: Date.now()
    });
  }
}
```

---

## Data Flow Architecture

### Real-Time Data Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Data Flow Pipeline                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Market Data Feeds                                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   │
│  │  Exchange A │   │  Exchange B │   │  Exchange C │                   │
│  │   (NYSE)    │   │  (NASDAQ)   │   │    (LSE)    │                   │
│  └─────┬───────┘   └─────┬───────┘   └─────┬───────┘                   │
│        │                 │                 │                           │
│        └─────────────────┼─────────────────┘                           │
│                          │                                             │
├─────────────────────────┬┼─────────────────────────────────────────────┤
│  C++ Trading Engine     ││                                             │
│  ┌─────────────────────┐││                                             │
│  │   Market Data       │││  ┌─────────────────────────────────────────┐│
│  │   Aggregation       │││  │            WebSocket Server             ││
│  │   (Sub-μs latency)  │││  │         (Node.js + ws library)         ││
│  └─────────────────────┘││  │                                         ││
│                         ││  │  • 10Hz broadcast frequency             ││
│                         ││  │  • 1000+ concurrent connections        ││
│                         ││  │  • Message queuing & replay            ││
│                         ││  │  • Auto-reconnection logic             ││
│                         ││  └─────────────────────────────────────────┘│
├─────────────────────────┘└─────────────────────────────────────────────┤
│  Frontend (React)                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    WebSocket Hook                                   ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               ││
│  │  │   Message   │   │   Message   │   │   Message   │               ││
│  │  │   Buffer    │───│  Processor  │───│ Distributor │               ││
│  │  │ (Circular)  │   │ (Batching)  │   │  (PubSub)   │               ││
│  │  └─────────────┘   └─────────────┘   └─────────────┘               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                 │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                   Component Layer                                   ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               ││
│  │  │   Market    │   │    Order    │   │  Portfolio  │               ││
│  │  │ Dashboard   │   │    Book     │   │   Monitor   │               ││
│  │  └─────────────┘   └─────────────┘   └─────────────┘               ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### State Management Architecture

```typescript
// State Management Flow
┌─────────────────────────────────────────────────────────────────────────┐
│                        State Management                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Server State                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │ TanStack    │  │   Market    │  │   Orders    │  │ Portfolio  │ │ │
│  │  │   Query     │  │    Data     │  │   State     │  │   State    │ │ │
│  │  │ (Caching)   │  │  (Real-time)│  │ (Commands)  │  │(Derived)   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Client State                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │   Zustand   │  │    Auth     │  │     UI      │  │  Settings  │ │ │
│  │  │    Store    │  │   Store     │  │   Store     │  │   Store    │ │ │
│  │  │  (Global)   │  │ (Session)   │  │  (Local)    │  │(Persistent)│ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

// Store Implementation Example
export const useMarketDataStore = create<MarketDataState>((set, get) => ({
  // State
  symbols: new Map(),
  subscriptions: new Set(),
  connectionStatus: 'DISCONNECTED',
  lastUpdate: 0,

  // Actions
  updateSymbol: (symbol: string, data: MarketTick) => {
    set(state => {
      const newSymbols = new Map(state.symbols);
      newSymbols.set(symbol, {
        ...data,
        timestamp: Date.now()
      });
      
      return {
        symbols: newSymbols,
        lastUpdate: Date.now()
      };
    });
  },

  subscribe: (symbols: string[]) => {
    const { subscriptions } = get();
    const newSubscriptions = new Set([...subscriptions, ...symbols]);
    
    set({ subscriptions: newSubscriptions });
    
    // Trigger WebSocket subscription
    WebSocketService.subscribe(symbols);
  },

  // Selectors
  getSymbol: (symbol: string) => {
    const { symbols } = get();
    return symbols.get(symbol);
  },

  getSymbolsByFilter: (filter: SymbolFilter) => {
    const { symbols } = get();
    return Array.from(symbols.values()).filter(filter);
  }
}));
```

---

## Security Architecture

### Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Authentication Flow                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │
│  │    User     │   │  Frontend   │   │    API      │   │    Auth     │ │
│  │  Browser    │   │Application  │   │  Gateway    │   │  Service    │ │
│  └─────┬───────┘   └─────┬───────┘   └─────┬───────┘   └─────┬───────┘ │
│        │                 │                 │                 │         │
│        │  1. Login Form  │                 │                 │         │
│        ├────────────────→│                 │                 │         │
│        │                 │ 2. Credentials  │                 │         │
│        │                 ├────────────────→│ 3. Authenticate │         │
│        │                 │                 ├────────────────→│         │
│        │                 │                 │  4. JWT Tokens  │         │
│        │                 │  5. Auth Token  │←────────────────┤         │
│        │  6. Dashboard   │←────────────────┤                 │         │
│        │←────────────────┤                 │                 │         │
│        │                 │                 │                 │         │
│        │  7. API Request │                 │                 │         │
│        │    + JWT Token  │                 │                 │         │
│        ├────────────────→│  8. Validate    │                 │         │
│        │                 ├────────────────→│ 9. Verify Token │         │
│        │                 │                 ├────────────────→│         │
│        │                 │                 │ 10. User Claims │         │
│        │                 │ 11. API Response│←────────────────┤         │
│        │ 12. Update UI   │←────────────────┤                 │         │
│        │←────────────────┤                 │                 │         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Security Implementation

```typescript
// JWT Token Management
export class TokenService {
  private static readonly ACCESS_TOKEN_KEY = 'hft_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'hft_refresh_token';
  private refreshTimer: NodeJS.Timeout | null = null;

  static setTokens(accessToken: string, refreshToken: string): void {
    // Store in secure httpOnly cookies
    document.cookie = `${this.ACCESS_TOKEN_KEY}=${accessToken}; Secure; HttpOnly; SameSite=Strict`;
    document.cookie = `${this.REFRESH_TOKEN_KEY}=${refreshToken}; Secure; HttpOnly; SameSite=Strict`;
    
    // Schedule automatic refresh
    this.scheduleTokenRefresh(accessToken);
  }

  private static scheduleTokenRefresh(token: string): void {
    const payload = this.decodeToken(token);
    const expiryTime = payload.exp * 1000;
    const refreshTime = expiryTime - (5 * 60 * 1000); // 5 minutes before expiry
    const delay = refreshTime - Date.now();

    if (delay > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, delay);
    }
  }

  static async refreshToken(): Promise<void> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const { accessToken, refreshToken } = await response.json();
        this.setTokens(accessToken, refreshToken);
      } else {
        // Redirect to login
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
    }
  }
}

// Permission-Based Access Control
export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};
```

### Input Validation & Sanitization

```typescript
// Validation Schema System
export const OrderValidationSchema = z.object({
  symbol: z.string()
    .regex(/^[A-Z0-9]{1,12}$/, 'Invalid symbol format')
    .min(1, 'Symbol is required')
    .max(12, 'Symbol too long'),
    
  quantity: z.number()
    .positive('Quantity must be positive')
    .max(1000000, 'Quantity exceeds maximum')
    .int('Quantity must be whole number'),
    
  price: z.number()
    .positive('Price must be positive')
    .max(1000000, 'Price exceeds maximum')
    .optional(),
    
  side: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'Side must be BUY or SELL' })
  }),
  
  orderType: z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'], {
    errorMap: () => ({ message: 'Invalid order type' })
  }),
  
  timeInForce: z.enum(['DAY', 'IOC', 'FOK', 'GTC']).optional()
}).refine(data => {
  // Custom validation: LIMIT orders require price
  if (data.orderType === 'LIMIT' && !data.price) {
    return false;
  }
  return true;
}, {
  message: 'LIMIT orders require a price',
  path: ['price']
});

// Sanitization Utilities
export class InputSanitizer {
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, 1000);  // Limit length
  }

  static sanitizeNumber(input: number): number {
    if (!Number.isFinite(input)) {
      throw new Error('Invalid number');
    }
    return Math.round(input * 100) / 100; // Limit precision
  }

  static sanitizeSymbol(input: string): string {
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 12);
  }
}
```

---

## Performance Architecture

### Optimization Strategies

```typescript
// Performance Monitoring Hook
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    wsLatency: 0,
    apiResponseTime: 0
  });

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          setMetrics(prev => ({
            ...prev,
            [entry.name]: entry.duration
          }));
        }
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });
    
    // Memory monitoring
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1048576) // MB
        }));
      }
    }, 5000);

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, []);

  return metrics;
};

// Virtual Scrolling Implementation
export const useVirtualScrolling = <T>(
  items: T[],
  containerHeight: number,
  itemHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
    
    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
};

// Debounced Search Hook
export const useDebouncedSearch = <T>(
  items: T[],
  searchTerm: string,
  searchFn: (item: T, term: string) => boolean,
  delay: number = 300
) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const [filteredItems, setFilteredItems] = useState(items);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  // Filter items
  useEffect(() => {
    if (!debouncedTerm) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => searchFn(item, debouncedTerm));
      setFilteredItems(filtered);
    }
  }, [items, debouncedTerm, searchFn]);

  return filteredItems;
};
```

### Memory Management

```typescript
// Memory Pool for Market Data
export class MarketDataPool {
  private pool: MarketTick[] = [];
  private maxSize = 1000;

  acquire(): MarketTick {
    return this.pool.pop() || this.createNew();
  }

  release(tick: MarketTick): void {
    if (this.pool.length < this.maxSize) {
      // Reset object for reuse
      Object.keys(tick).forEach(key => {
        delete (tick as any)[key];
      });
      this.pool.push(tick);
    }
  }

  private createNew(): MarketTick {
    return {} as MarketTick;
  }
}

// Circular Buffer for Message History
export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  getAll(): T[] {
    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size);
    }
    
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head)
    ];
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
  }
}
```

---

## Testing Architecture

### Testing Strategy

```typescript
// Test Architecture Overview
tests/
├── unit/                    // Component/hook unit tests
│   ├── components/         // Component testing
│   ├── hooks/             // Hook testing
│   ├── services/          // Service layer testing
│   └── utils/             // Utility function testing
├── integration/            // Integration tests
│   ├── api/              // API integration
│   ├── websocket/        // WebSocket integration
│   └── workflows/        // User workflow testing
├── e2e/                   // End-to-end tests
│   ├── trading/          // Trading workflows
│   ├── auth/             // Authentication flows
│   └── performance/      // Performance testing
└── __mocks__/             // Test mocks and stubs
    ├── websocket.ts      // WebSocket mock
    ├── api.ts           // API mock
    └── market-data.ts   // Market data mock
```

### Testing Implementation

```typescript
// Component Testing Example
describe('OrderBookWidget', () => {
  const mockOrderBookData = {
    symbol: 'AAPL',
    bids: [
      { price: 175.25, size: 1000, orders: 5 },
      { price: 175.24, size: 2500, orders: 12 }
    ],
    asks: [
      { price: 175.27, size: 800, orders: 3 },
      { price: 175.28, size: 1500, orders: 7 }
    ],
    timestamp: Date.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render order book levels correctly', () => {
    render(
      <OrderBookWidget 
        symbol="AAPL" 
        data={mockOrderBookData}
        levels={10}
      />
    );

    expect(screen.getByText('175.25')).toBeInTheDocument();
    expect(screen.getByText('175.27')).toBeInTheDocument();
  });

  it('should handle price clicks for trading', () => {
    const mockOnPriceClick = jest.fn();
    
    render(
      <OrderBookWidget 
        symbol="AAPL"
        data={mockOrderBookData}
        onPriceClick={mockOnPriceClick}
        enableClick={true}
      />
    );

    fireEvent.click(screen.getByTestId('bid-price-175.25'));
    
    expect(mockOnPriceClick).toHaveBeenCalledWith(175.25, 'BID');
  });

  it('should update in real-time without re-rendering parent', () => {
    const { rerender } = render(
      <OrderBookWidget symbol="AAPL" data={mockOrderBookData} />
    );

    const updatedData = {
      ...mockOrderBookData,
      bids: [{ price: 175.26, size: 1200, orders: 6 }]
    };

    rerender(
      <OrderBookWidget symbol="AAPL" data={updatedData} />
    );

    expect(screen.getByText('175.26')).toBeInTheDocument();
  });
});

// Hook Testing Example
describe('useWebSocket', () => {
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.CONNECTING
    } as any;

    (global.WebSocket as any) = jest.fn(() => mockWebSocket);
  });

  it('should establish WebSocket connection', async () => {
    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8081/ws' })
    );

    expect(result.current.connectionStatus).toBe('CONNECTING');

    // Simulate connection open
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open') as any);
    });

    expect(result.current.connectionStatus).toBe('CONNECTED');
  });

  it('should handle message subscription', () => {
    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8081/ws' })
    );

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      result.current.subscribe(['AAPL', 'GOOGL']);
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SUBSCRIBE',
        symbols: ['AAPL', 'GOOGL'],
        timestamp: expect.any(Number)
      })
    );
  });
});

// E2E Testing Example
describe('Trading Workflow', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.login('trader@institution.com', 'password123');
  });

  it('should complete full order submission workflow', () => {
    // Navigate to trading interface
    cy.get('[data-testid=sidebar-trading]').click();
    
    // Enter order details
    cy.get('[data-testid=symbol-input]').type('AAPL');
    cy.get('[data-testid=quantity-input]').type('100');
    cy.get('[data-testid=price-input]').type('175.00');
    cy.get('[data-testid=side-select]').select('BUY');
    cy.get('[data-testid=order-type-select]').select('LIMIT');

    // Submit order
    cy.get('[data-testid=submit-order-button]').click();

    // Verify order confirmation
    cy.get('[data-testid=order-confirmation-modal]')
      .should('be.visible')
      .within(() => {
        cy.contains('AAPL');
        cy.contains('100');
        cy.contains('175.00');
        cy.contains('BUY');
        cy.contains('LIMIT');
      });

    // Confirm order
    cy.get('[data-testid=confirm-order-button]').click();

    // Verify order appears in order list
    cy.get('[data-testid=active-orders-table]')
      .should('contain', 'AAPL')
      .should('contain', '100')
      .should('contain', '175.00')
      .should('contain', 'PENDING_NEW');
  });

  it('should validate order parameters', () => {
    cy.get('[data-testid=submit-order-button]').click();
    
    cy.get('[data-testid=symbol-error]')
      .should('contain', 'Symbol is required');
    
    cy.get('[data-testid=quantity-error]')
      .should('contain', 'Quantity is required');
  });
});
```

---

## Error Handling Architecture

### Error Boundary System

```typescript
// Global Error Boundary
export class GlobalErrorBoundary extends Component<
  PropsWithChildren<{}>,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Global Error Boundary caught an error:', error, errorInfo);
    
    // Send error to monitoring service
    ErrorReportingService.captureException(error, {
      componentStack: errorInfo.componentStack,
      userId: this.getUserId(),
      timestamp: new Date().toISOString(),
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

// Error Reporting Service
export class ErrorReportingService {
  static captureException(error: Error, context?: any) {
    // Send to Sentry
    Sentry.captureException(error, {
      contexts: { trading: context },
      tags: {
        component: 'frontend',
        environment: process.env.NODE_ENV
      }
    });

    // Send to custom analytics
    analytics.track('Error Occurred', {
      error: error.message,
      stack: error.stack,
      ...context
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error, context);
    }
  }
}

// Result Pattern for Error Handling
export abstract class Result<T, E = string> {
  abstract isSuccess(): boolean;
  abstract isFailure(): boolean;
  abstract getValue(): T;
  abstract getError(): E;

  static ok<U>(value: U): Result<U, never> {
    return new Ok(value);
  }

  static fail<U>(error: U): Result<never, U> {
    return new Fail(error);
  }
}

class Ok<T> extends Result<T, never> {
  constructor(private value: T) {
    super();
  }

  isSuccess(): boolean { return true; }
  isFailure(): boolean { return false; }
  getValue(): T { return this.value; }
  getError(): never { throw new Error('Ok result has no error'); }
}

class Fail<E> extends Result<never, E> {
  constructor(private error: E) {
    super();
  }

  isSuccess(): boolean { return false; }
  isFailure(): boolean { return true; }
  getValue(): never { throw new Error('Failed result has no value'); }
  getError(): E { return this.error; }
}
```

---

## Deployment Architecture

### Build & Deployment Pipeline

```yaml
# .github/workflows/frontend-deploy.yml
name: Frontend Deployment

on:
  push:
    branches: [main, staging]
    paths: ['hft-trading-frontend/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: 'hft-trading-frontend/package-lock.json'
        
    - name: Install dependencies
      working-directory: hft-trading-frontend
      run: npm ci --only=production
      
    - name: Type checking
      working-directory: hft-trading-frontend
      run: npm run type-check
      
    - name: Run tests
      working-directory: hft-trading-frontend
      run: npm run test -- --coverage --watchAll=false
      
    - name: Build application
      working-directory: hft-trading-frontend
      run: |
        npm run build
        
    - name: Security audit
      working-directory: hft-trading-frontend
      run: npm audit --audit-level moderate
      
    - name: Build Docker image
      run: |
        docker build -t hft-frontend:${{ github.sha }} ./hft-trading-frontend
        
    - name: Deploy to staging
      if: github.ref == 'refs/heads/staging'
      run: |
        kubectl apply -f k8s/staging/
        kubectl set image deployment/hft-frontend frontend=hft-frontend:${{ github.sha }}
        
    - name: Deploy to production
      if: github.ref == 'refs/heads/main'
      run: |
        kubectl apply -f k8s/production/
        kubectl set image deployment/hft-frontend frontend=hft-frontend:${{ github.sha }}
```

### Container Configuration

```dockerfile
# Multi-stage Docker build for optimal production image
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

---

## Monitoring & Observability

### Performance Monitoring

```typescript
// Performance Metrics Collection
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  
  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
    
    // Send to monitoring service periodically
    if (values.length % 10 === 0) {
      this.sendMetrics(name, values);
    }
  }
  
  static getMetricSummary(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  private static sendMetrics(name: string, values: number[]): void {
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: name,
        values: values,
        timestamp: Date.now()
      })
    }).catch(console.error);
  }
}

// Custom Performance Hooks
export const useRenderPerformance = (componentName: string) => {
  const renderStart = useRef<number>(0);
  
  useEffect(() => {
    renderStart.current = performance.now();
  });
  
  useLayoutEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    PerformanceMonitor.recordMetric(`render.${componentName}`, renderTime);
  });
};

export const useApiPerformance = () => {
  return useCallback((endpoint: string, startTime: number) => {
    const duration = performance.now() - startTime;
    PerformanceMonitor.recordMetric(`api.${endpoint}`, duration);
  }, []);
};
```

---

## Conclusion

The HFT Trading Platform Frontend architecture represents a sophisticated implementation of modern web application patterns optimized for financial trading operations. The Clean Architecture approach ensures maintainability and scalability, while performance optimizations deliver the ultra-low latency requirements essential for high-frequency trading.

Key architectural strengths:

- **Separation of Concerns:** Clear layer boundaries enable independent development and testing
- **Type Safety:** Comprehensive TypeScript coverage prevents runtime errors
- **Performance:** Sub-millisecond real-time data processing with optimized React patterns  
- **Security:** Multi-layer security architecture with JWT authentication and input validation
- **Testability:** Comprehensive testing strategy from unit to E2E levels
- **Scalability:** Modular design supports horizontal scaling and feature extension

The architecture successfully balances the competing demands of financial software: ultra-low latency performance, regulatory compliance, security requirements, and developer productivity.

---

*Architecture documentation maintained by the HFT Frontend Architecture Team*