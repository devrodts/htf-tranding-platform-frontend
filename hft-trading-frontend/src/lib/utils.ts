/**
 * Utility functions for the application
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as currency
 */
export function formatCurrency(
  value: number,
  currency = 'USD',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

/**
 * Format number with commas
 */
export function formatNumber(
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value / 100)
}

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number, symbol?: string): string {
  // Different symbols have different price precision
  const decimals = getPriceDecimals(symbol)
  return formatNumber(price, decimals, decimals)
}

/**
 * Get appropriate decimal places for price formatting
 */
export function getPriceDecimals(symbol?: string): number {
  if (!symbol) return 2
  
  // Forex typically has 4-5 decimals
  if (symbol.includes('/') || symbol.length === 6) {
    return 5
  }
  
  // Crypto can have more decimals
  if (symbol.includes('BTC') || symbol.includes('ETH')) {
    return 8
  }
  
  // Stocks typically have 2 decimals
  return 2
}

/**
 * Format quantity with appropriate decimal places
 */
export function formatQuantity(quantity: number): string {
  if (quantity >= 1000000) {
    return `${(quantity / 1000000).toFixed(2)}M`
  } else if (quantity >= 1000) {
    return `${(quantity / 1000).toFixed(2)}K`
  }
  return formatNumber(quantity, 0, 2)
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Format time for trading displays
 */
export function formatTime(date: Date | string | number, includeSeconds = false): string {
  const d = new Date(date)
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }
  
  if (includeSeconds) {
    options.second = '2-digit'
  }
  
  return d.toLocaleTimeString('en-US', options)
}

/**
 * Format date for trading displays
 */
export function formatDate(date: Date | string | number, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = new Date(date)
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      })
    case 'long':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    default:
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
  }
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string | number): string {
  return `${formatDate(date)} ${formatTime(date, true)}`
}

/**
 * Check if market is open (basic implementation)
 */
export function isMarketOpen(timezone = 'America/New_York'): boolean {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const marketTime = new Date(utc + getTimezoneOffset(timezone) * 60000)
  
  const day = marketTime.getDay()
  const hour = marketTime.getHours()
  
  // Basic market hours: Monday-Friday, 9:30 AM - 4:00 PM ET
  return day >= 1 && day <= 5 && hour >= 9.5 && hour < 16
}

/**
 * Get timezone offset in minutes
 */
function getTimezoneOffset(timezone: string): number {
  const timezoneOffsets: Record<string, number> = {
    'America/New_York': -5 * 60, // EST
    'America/Chicago': -6 * 60,  // CST
    'America/Denver': -7 * 60,   // MST
    'America/Los_Angeles': -8 * 60, // PST
    'Europe/London': 0,          // GMT
    'Europe/Frankfurt': 1 * 60,  // CET
    'Asia/Tokyo': 9 * 60,        // JST
    'Asia/Hong_Kong': 8 * 60,    // HKT
  }
  
  return timezoneOffsets[timezone] || 0
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

/**
 * Sleep function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(str: string, defaultValue: T): T {
  try {
    return JSON.parse(str)
  } catch {
    return defaultValue
  }
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Round to specific decimal places
 */
export function roundTo(value: number, decimals: number): number {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals)
}

/**
 * Check if value is numeric
 */
export function isNumeric(value: any): boolean {
  return !isNaN(value) && !isNaN(parseFloat(value))
}

/**
 * Get color for price change
 */
export function getPriceChangeColor(change: number, neutral = 'text-gray-500'): string {
  if (change > 0) return 'text-bull-600'
  if (change < 0) return 'text-bear-600'
  return neutral
}

/**
 * Get background color for price change
 */
export function getPriceChangeBgColor(change: number, neutral = 'bg-gray-100'): string {
  if (change > 0) return 'bg-bull-100'
  if (change < 0) return 'bg-bear-100'
  return neutral
}

/**
 * Format market cap
 */
export function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`
  }
  return formatCurrency(value)
}

/**
 * Calculate stop loss and take profit levels
 */
export function calculateStopLossTakeProfit(
  entryPrice: number,
  side: 'BUY' | 'SELL',
  stopLossPercent: number,
  takeProfitPercent: number
): { stopLoss: number; takeProfit: number } {
  if (side === 'BUY') {
    return {
      stopLoss: entryPrice * (1 - stopLossPercent / 100),
      takeProfit: entryPrice * (1 + takeProfitPercent / 100),
    }
  } else {
    return {
      stopLoss: entryPrice * (1 + stopLossPercent / 100),
      takeProfit: entryPrice * (1 - takeProfitPercent / 100),
    }
  }
}

/**
 * Calculate position size based on risk
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): number {
  const riskAmount = accountBalance * (riskPercent / 100)
  const priceRisk = Math.abs(entryPrice - stopLoss)
  return riskAmount / priceRisk
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}