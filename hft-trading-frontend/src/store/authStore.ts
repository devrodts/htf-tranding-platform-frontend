/**
 * Authentication Store - Zustand with Immer for auth state management
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { persist } from 'zustand/middleware'
import { User } from '@/auth/domain/entities/User'
import { Session } from '@/auth/domain/entities/Session'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthError {
  code: string
  message: string
  details?: any
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
}

interface AuthState {
  status: AuthStatus
  user: User | null
  session: Session | null
  tokens: AuthTokens | null
  error: AuthError | null
  isLoading: boolean
  lastActivity: Date | null
  sessionWarningShown: boolean
}

interface AuthActions {
  // Authentication actions
  login: (user: User, session: Session, tokens: AuthTokens) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: AuthError | null) => void
  clearError: () => void
  
  // Session management
  updateSession: (session: Session) => void
  updateTokens: (tokens: AuthTokens) => void
  updateActivity: () => void
  setSessionWarningShown: (shown: boolean) => void
  
  // User management
  updateUser: (user: User) => void
  updateUserPreferences: (preferences: Partial<User['preferences']>) => void
  
  // Utility methods
  isAuthenticated: () => boolean
  isTokenExpired: () => boolean
  shouldRefreshToken: (thresholdMinutes?: number) => boolean
  getTimeUntilExpiration: () => number
  hasPermission: (resource: string, action: string) => boolean
  canTrade: () => boolean
  canViewPortfolio: () => boolean
  canManageRisk: () => boolean
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  status: 'idle',
  user: null,
  session: null,
  tokens: null,
  error: null,
  isLoading: false,
  lastActivity: null,
  sessionWarningShown: false
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer<AuthStore>((set, get) => ({
          ...initialState,

          // Authentication actions
          login: (user, session, tokens) => set((state) => {
            state.status = 'authenticated'
            state.user = user
            state.session = session
            state.tokens = tokens
            state.error = null
            state.isLoading = false
            state.lastActivity = new Date()
            state.sessionWarningShown = false
          }),

          logout: () => set((state) => {
            state.status = 'unauthenticated'
            state.user = null
            state.session = null
            state.tokens = null
            state.error = null
            state.isLoading = false
            state.lastActivity = null
            state.sessionWarningShown = false
          }),

          setLoading: (loading) => set((state) => {
            state.isLoading = loading
            if (loading) {
              state.error = null
            }
          }),

          setError: (error) => set((state) => {
            state.error = error
            state.isLoading = false
            if (error) {
              state.status = 'error'
            }
          }),

          clearError: () => set((state) => {
            state.error = null
            if (state.status === 'error') {
              state.status = state.user ? 'authenticated' : 'unauthenticated'
            }
          }),

          // Session management
          updateSession: (session) => set((state) => {
            state.session = session
            state.lastActivity = new Date()
          }),

          updateTokens: (tokens) => set((state) => {
            state.tokens = tokens
            state.lastActivity = new Date()
          }),

          updateActivity: () => set((state) => {
            state.lastActivity = new Date()
          }),

          setSessionWarningShown: (shown) => set((state) => {
            state.sessionWarningShown = shown
          }),

          // User management
          updateUser: (user) => set((state) => {
            state.user = user
          }),

          updateUserPreferences: (preferences) => set((state) => {
            if (state.user) {
              const result = state.user.updatePreferences(preferences)
              if (result.isSuccess) {
                // User object is updated by reference
              }
            }
          }),

          // Utility methods
          isAuthenticated: () => {
            const state = get()
            return state.status === 'authenticated' && 
                   state.user !== null && 
                   state.session !== null &&
                   state.session.isActive()
          },

          isTokenExpired: () => {
            const state = get()
            if (!state.tokens) return true
            
            return new Date() >= state.tokens.expiresAt
          },

          shouldRefreshToken: (thresholdMinutes = 5) => {
            const state = get()
            if (!state.tokens) return false
            
            const timeUntilExpiration = get().getTimeUntilExpiration()
            const refreshThreshold = thresholdMinutes * 60 * 1000 // Convert to milliseconds
            
            return timeUntilExpiration < refreshThreshold && timeUntilExpiration > 0
          },

          getTimeUntilExpiration: () => {
            const state = get()
            if (!state.tokens) return 0
            
            const expirationTime = state.tokens.expiresAt.getTime()
            const currentTime = Date.now()
            
            return Math.max(0, expirationTime - currentTime)
          },

          hasPermission: (resource, action) => {
            const state = get()
            if (!state.user) return false
            
            return state.user.hasPermission(resource, action)
          },

          canTrade: () => {
            const state = get()
            if (!state.user) return false
            
            return state.user.canTrade()
          },

          canViewPortfolio: () => {
            const state = get()
            if (!state.user) return false
            
            return state.user.canViewPortfolio()
          },

          canManageRisk: () => {
            const state = get()
            if (!state.user) return false
            
            return state.user.canManageRisk()
          }
        })),
        {
          name: 'auth-store',
          partialize: (state) => ({
            tokens: state.tokens,
            lastActivity: state.lastActivity,
            sessionWarningShown: state.sessionWarningShown
          }),
          storage: {
            getItem: (name) => {
              const str = localStorage.getItem(name)
              if (!str) return null
              const data = JSON.parse(str)
              return {
                state: {
                  ...data.state,
                  tokens: data.state.tokens ? {
                    ...data.state.tokens,
                    expiresAt: new Date(data.state.tokens.expiresAt)
                  } : null,
                  lastActivity: data.state.lastActivity ? new Date(data.state.lastActivity) : null
                },
                version: data.version
              }
            },
            setItem: (name, value) => {
              const serialized = {
                state: {
                  ...value.state,
                  tokens: value.state.tokens ? {
                    ...value.state.tokens,
                    expiresAt: value.state.tokens.expiresAt.toISOString()
                  } : null,
                  lastActivity: value.state.lastActivity?.toISOString() || null
                },
                version: value.version
              }
              localStorage.setItem(name, JSON.stringify(serialized))
            },
            removeItem: (name) => localStorage.removeItem(name)
          }
        }
      )
    ),
    {
      name: 'auth-store'
    }
  )
)

// Selectors for optimized subscriptions
export const selectAuthStatus = (state: AuthStore) => state.status
export const selectUser = (state: AuthStore) => state.user
export const selectSession = (state: AuthStore) => state.session
export const selectTokens = (state: AuthStore) => state.tokens
export const selectError = (state: AuthStore) => state.error
export const selectIsLoading = (state: AuthStore) => state.isLoading
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated()
export const selectCanTrade = (state: AuthStore) => state.canTrade()
export const selectCanViewPortfolio = (state: AuthStore) => state.canViewPortfolio()
export const selectCanManageRisk = (state: AuthStore) => state.canManageRisk()
export const selectTimeUntilExpiration = (state: AuthStore) => state.getTimeUntilExpiration()

// Permission selector factory
export const selectHasPermission = (resource: string, action: string) => (state: AuthStore) => 
  state.hasPermission(resource, action)

// User info selectors
export const selectUserInfo = (state: AuthStore) => state.user ? {
  id: state.user.id.toString(),
  username: state.user.username.value,
  email: state.user.email.value,
  fullName: state.user.fullName,
  role: state.user.role,
  status: state.user.status
} : null

export const selectUserPreferences = (state: AuthStore) => state.user?.preferences || null

// Session info selectors
export const selectSessionInfo = (state: AuthStore) => state.session ? {
  id: state.session.id.toString(),
  createdAt: state.session.createdAt,
  lastActivityAt: state.session.lastActivityAt,
  expiresAt: state.session.expiresAt,
  isActive: state.session.isActive(),
  remainingTime: state.session.getRemainingTime(),
  metadata: state.session.metadata
} : null