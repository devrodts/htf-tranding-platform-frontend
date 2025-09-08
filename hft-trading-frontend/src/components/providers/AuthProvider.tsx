/**
 * Auth Provider - Authentication context provider
 */

'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { status, validateSession, refreshToken, logout } = useAuth({
    autoRefresh: true,
    refreshThresholdMinutes: 5,
    onTokenExpired: () => {
      console.log('Token expired, logging out user')
    },
    onSessionExpired: () => {
      console.log('Session expired, logging out user')
    },
  })

  // Initialize auth on app start
  useEffect(() => {
    const initAuth = async () => {
      // Validate existing session on app load
      const result = await validateSession()
      if (!result.valid) {
        if (result.error === 'No access token') {
          // No token means user is not authenticated
          logout()
        } else {
          console.warn('Session validation failed:', result.error)
          // Session validation failed, logout user
          logout()
        }
      }
    }

    initAuth()
  }, [validateSession, logout])

  // Show loading screen during initial auth check
  if (status === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Initializing application...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}