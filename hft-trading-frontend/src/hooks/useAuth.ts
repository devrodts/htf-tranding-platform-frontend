/**
 * Authentication Hook - React hook for auth operations
 */

'use client'

import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { HttpAuthenticationService, LoginCredentials, RegisterData } from '@/auth/application/services/HttpAuthenticationService'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { SessionMetadata } from '@/auth/domain/entities/Session'

// Global service instances (singleton pattern)
let authService: HttpAuthenticationService | null = null

const getAuthService = (): HttpAuthenticationService => {
  if (!authService) {
    authService = new HttpAuthenticationService('http://localhost:8080/api/auth')
  }
  
  return authService
}

export interface UseAuthOptions {
  autoRefresh?: boolean
  refreshThresholdMinutes?: number
  onTokenExpired?: () => void
  onSessionExpired?: () => void
}

export function useAuth(options: UseAuthOptions = {}) {
  const {
    autoRefresh = true,
    refreshThresholdMinutes = 5,
    onTokenExpired,
    onSessionExpired
  } = options

  const {
    status,
    user,
    session,
    tokens,
    error,
    isLoading,
    login: setLoginState,
    logout: clearAuthState,
    setLoading,
    setError,
    clearError,
    updateTokens,
    updateActivity,
    isAuthenticated,
    isTokenExpired,
    shouldRefreshToken,
    getTimeUntilExpiration,
    hasPermission,
    canTrade,
    canViewPortfolio,
    canManageRisk
  } = useAuthStore()

  // Get session metadata from browser
  const getSessionMetadata = useCallback((): SessionMetadata => {
    return {
      userAgent: navigator.userAgent,
      ipAddress: '127.0.0.1', // In production, get from server
      device: /Mobile|Android|iP(hone|od|ad)/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      platform: navigator.platform
    }
  }, [])

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      clearError()

      const authService = getAuthService()
      const metadata = getSessionMetadata()
      
      const result = await authService.login(credentials, metadata)
      
      if (result.isSuccess) {
        const loginResult = result.getValue()
        setLoginState(loginResult.user, loginResult.session, {
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
          expiresAt: loginResult.expiresAt
        })
        return { success: true }
      } else {
        const errorMessage = result.getErrorValue()
        setError({
          code: 'LOGIN_FAILED',
          message: errorMessage
        })
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError({
        code: 'LOGIN_ERROR',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [setLoading, clearError, setLoginState, setError, getSessionMetadata])

  // Register function
  const register = useCallback(async (data: RegisterData) => {
    try {
      setLoading(true)
      clearError()

      const authService = getAuthService()
      const result = await authService.register(data)
      
      if (result.isSuccess) {
        return { success: true }
      } else {
        const errorMessage = result.getErrorValue()
        setError({
          code: 'REGISTER_FAILED',
          message: errorMessage
        })
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setError({
        code: 'REGISTER_ERROR',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [setLoading, clearError, setError])

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (session) {
        const authService = getAuthService()
        await authService.logout(session.id)
      }
      
      clearAuthState()
      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      // Clear state anyway on logout errors
      clearAuthState()
      return { success: false, error: error instanceof Error ? error.message : 'Logout failed' }
    }
  }, [session, clearAuthState])

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available')
      }

      setLoading(true)
      const authService = getAuthService()
      const metadata = getSessionMetadata()
      
      const result = await authService.refreshToken(tokens.refreshToken, metadata)
      
      if (result.isSuccess) {
        const loginResult = result.getValue()
        updateTokens({
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
          expiresAt: loginResult.expiresAt
        })
        return { success: true }
      } else {
        const errorMessage = result.getErrorValue()
        setError({
          code: 'REFRESH_FAILED',
          message: errorMessage
        })
        // On refresh failure, logout user
        await logout()
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed'
      setError({
        code: 'REFRESH_ERROR',
        message: errorMessage
      })
      await logout()
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [tokens, setLoading, updateTokens, setError, logout, getSessionMetadata])

  // Validate session function
  const validateSession = useCallback(async () => {
    try {
      if (!tokens?.accessToken) {
        return { valid: false, error: 'No access token' }
      }

      const authService = getAuthService()
      const result = await authService.validateSession(tokens.accessToken)
      
      if (result.isSuccess) {
        updateActivity()
        return { valid: true }
      } else {
        return { valid: false, error: result.getErrorValue() }
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Session validation failed' 
      }
    }
  }, [tokens, updateActivity])

  // Change password function
  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      setLoading(true)
      clearError()

      const authService = getAuthService()
      const result = await authService.changePassword(user.id, oldPassword, newPassword)
      
      if (result.isSuccess) {
        // Optionally revoke other sessions
        await authService.revokeAllSessions(user.id, 'Password changed')
        return { success: true }
      } else {
        const errorMessage = result.getErrorValue()
        setError({
          code: 'CHANGE_PASSWORD_FAILED',
          message: errorMessage
        })
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed'
      setError({
        code: 'CHANGE_PASSWORD_ERROR',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [user, setLoading, clearError, setError])

  // Auto-refresh token effect
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated() || isLoading) {
      return
    }

    const checkTokenExpiration = () => {
      if (isTokenExpired()) {
        onTokenExpired?.()
        logout()
        return
      }

      if (shouldRefreshToken(refreshThresholdMinutes)) {
        refreshToken().catch(console.error)
      }
    }

    // Check immediately
    checkTokenExpiration()

    // Set up interval to check every minute
    const interval = setInterval(checkTokenExpiration, 60 * 1000)

    return () => clearInterval(interval)
  }, [
    autoRefresh,
    isAuthenticated,
    isLoading,
    isTokenExpired,
    shouldRefreshToken,
    refreshThresholdMinutes,
    refreshToken,
    logout,
    onTokenExpired
  ])

  // Session expiration warning effect
  useEffect(() => {
    if (!isAuthenticated() || !session) {
      return
    }

    const checkSessionExpiration = () => {
      if (!session.isActive()) {
        onSessionExpired?.()
        logout()
      }
    }

    const interval = setInterval(checkSessionExpiration, 30 * 1000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [isAuthenticated, session, logout, onSessionExpired])

  return {
    // State
    status,
    user,
    session,
    tokens,
    error,
    isLoading,
    
    // Computed state
    isAuthenticated: isAuthenticated(),
    isTokenExpired: isTokenExpired(),
    shouldRefreshToken: shouldRefreshToken(refreshThresholdMinutes),
    timeUntilExpiration: getTimeUntilExpiration(),
    
    // Permissions
    hasPermission,
    canTrade: canTrade(),
    canViewPortfolio: canViewPortfolio(),
    canManageRisk: canManageRisk(),
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    validateSession,
    changePassword,
    clearError,
    
    // Utility
    updateActivity
  }
}

// Hook for authentication status only
export function useAuthStatus() {
  const { status, isAuthenticated, isLoading, error } = useAuthStore()
  
  return {
    status,
    isAuthenticated: isAuthenticated(),
    isLoading,
    error
  }
}

// Hook for user information only
export function useUser() {
  const { user, updateUser, updateUserPreferences } = useAuthStore()
  
  return {
    user,
    updateUser,
    updateUserPreferences
  }
}

// Hook for permissions checking
export function usePermissions() {
  const { 
    hasPermission, 
    canTrade, 
    canViewPortfolio, 
    canManageRisk 
  } = useAuthStore()
  
  return {
    hasPermission,
    canTrade: canTrade(),
    canViewPortfolio: canViewPortfolio(),
    canManageRisk: canManageRisk()
  }
}