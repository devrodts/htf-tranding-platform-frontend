import '@testing-library/jest-dom'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    pathname: '/',
    route: '/',
    asPath: '/',
    query: {},
    isReady: true,
    isFallback: false,
    isPreview: false,
    isLocaleDomain: false,
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb
  }
  observe() {
    return null
  }
  unobserve() {
    return null
  }
  disconnect() {
    return null
  }
}

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    setTimeout(() => {
      if (this.onopen) {
        this.onopen()
      }
    }, 0)
  }
  
  send(data) {
    // Mock send
  }
  
  close() {
    this.readyState = 3 // CLOSED
    if (this.onclose) {
      this.onclose()
    }
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler
  }
  
  removeEventListener(event, handler) {
    this[`on${event}`] = null
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock performance.now
global.performance.now = jest.fn(() => Date.now())

// Mock crypto for UUID generation
Object.defineProperty(global.self, 'crypto', {
  value: {
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
    getRandomValues: (array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    },
  },
})

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Setup global test utilities
global.testUtils = {
  createMockOrder: (overrides = {}) => ({
    id: 'order-123',
    symbol: 'AAPL',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 100,
    price: 150.00,
    status: 'NEW',
    filledQuantity: 0,
    remainingQuantity: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  createMockPosition: (overrides = {}) => ({
    symbol: 'AAPL',
    side: 'LONG',
    size: 100,
    avgPrice: 150.00,
    marketValue: 15000.00,
    unrealizedPnL: 500.00,
    realizedPnL: 0.00,
    timestamp: Date.now(),
    ...overrides,
  }),
  
  createMockMarketData: (overrides = {}) => ({
    symbol: 'AAPL',
    bid: 149.95,
    ask: 150.05,
    last: 150.00,
    volume: 1000000,
    high: 152.00,
    low: 148.00,
    open: 149.00,
    change: 1.00,
    changePercent: 0.67,
    timestamp: Date.now(),
    ...overrides,
  }),
  
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
}

// Setup test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_ENV = 'test'