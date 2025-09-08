/**
 * Protected Route Component - Route guard for authenticated users
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredPermissions?: Array<{ resource: string; action: string }>
  requiredRole?: string
  fallbackComponent?: React.ComponentType
  redirectTo?: string
  onUnauthorized?: () => void
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredPermissions = [],
  requiredRole,
  fallbackComponent: FallbackComponent,
  redirectTo,
  onUnauthorized
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    hasPermission,
    validateSession 
  } = useAuth()

  const [isValidating, setIsValidating] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      setIsValidating(true)

      // If authentication is not required, allow access
      if (!requireAuth) {
        setHasAccess(true)
        setIsValidating(false)
        return
      }

      // If not authenticated, deny access
      if (!isAuthenticated) {
        setHasAccess(false)
        setIsValidating(false)
        
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(pathname)
        const loginUrl = redirectTo || `/login?returnUrl=${returnUrl}`
        router.push(loginUrl)
        return
      }

      // Validate session
      const sessionResult = await validateSession()
      if (!sessionResult.valid) {
        setHasAccess(false)
        setIsValidating(false)
        
        // Session is invalid, redirect to login
        const returnUrl = encodeURIComponent(pathname)
        const loginUrl = redirectTo || `/login?returnUrl=${returnUrl}`
        router.push(loginUrl)
        return
      }

      // Check role requirement
      if (requiredRole && user?.role !== requiredRole) {
        setHasAccess(false)
        setIsValidating(false)
        onUnauthorized?.()
        return
      }

      // Check permission requirements
      const hasRequiredPermissions = requiredPermissions.every(({ resource, action }) =>
        hasPermission(resource, action)
      )

      if (requiredPermissions.length > 0 && !hasRequiredPermissions) {
        setHasAccess(false)
        setIsValidating(false)
        onUnauthorized?.()
        return
      }

      // All checks passed
      setHasAccess(true)
      setIsValidating(false)
    }

    checkAccess()
  }, [
    requireAuth,
    isAuthenticated,
    user?.role,
    requiredRole,
    requiredPermissions,
    hasPermission,
    validateSession,
    pathname,
    router,
    redirectTo,
    onUnauthorized
  ])

  // Show loading state
  if (isLoading || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verifying access...
          </p>
        </div>
      </div>
    )
  }

  // Show unauthorized state
  if (!hasAccess) {
    if (FallbackComponent) {
      return <FallbackComponent />
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">[LOCKED]</div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You don't have the required permissions to access this page.
          </p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Render children if all checks pass
  return <>{children}</>
}

// Higher-order component for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  const AuthenticatedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  )

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  return AuthenticatedComponent
}

// Specific role-based route guards
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredRole="ADMIN"
    requiredPermissions={[{ resource: 'admin', action: 'access' }]}
  >
    {children}
  </ProtectedRoute>
)

export const TraderRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredPermissions={[{ resource: 'trading', action: 'execute' }]}
  >
    {children}
  </ProtectedRoute>
)

export const RiskManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredRole="RISK_MANAGER"
    requiredPermissions={[{ resource: 'risk', action: 'manage' }]}
  >
    {children}
  </ProtectedRoute>
)

// Hook for checking access within components
export function useRouteAccess(
  requiredPermissions: Array<{ resource: string; action: string }> = [],
  requiredRole?: string
) {
  const { isAuthenticated, user, hasPermission } = useAuth()

  const hasAccess = React.useMemo(() => {
    if (!isAuthenticated) return false

    // Check role requirement
    if (requiredRole && user?.role !== requiredRole) {
      return false
    }

    // Check permission requirements
    const hasRequiredPermissions = requiredPermissions.every(({ resource, action }) =>
      hasPermission(resource, action)
    )

    if (requiredPermissions.length > 0 && !hasRequiredPermissions) {
      return false
    }

    return true
  }, [isAuthenticated, user?.role, requiredRole, requiredPermissions, hasPermission])

  return {
    hasAccess,
    isAuthenticated,
    user,
    role: user?.role,
    checkPermission: hasPermission
  }
}

export default ProtectedRoute