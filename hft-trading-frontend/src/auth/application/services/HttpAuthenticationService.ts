/**
 * HTTP Authentication Service - Direct API calls to C++ backend
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { User, Email, Username } from '@/auth/domain/entities/User'
import { Session } from '@/auth/domain/entities/Session'
import type { SessionMetadata } from '@/auth/domain/entities/Session'

export interface LoginCredentials {
  emailOrUsername: string
  password: string
  twoFactorCode?: string
  rememberMe?: boolean
}

export interface LoginResult {
  user: User
  session: Session
  accessToken: string
  refreshToken?: string
  expiresAt: Date
}

export interface RegisterData {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

export class HttpAuthenticationService {
  private readonly baseUrl: string

  constructor(baseUrl = 'http://localhost:8080/api/auth') {
    this.baseUrl = baseUrl
  }

  public async login(credentials: LoginCredentials, metadata: SessionMetadata): Promise<Result<LoginResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          emailOrUsername: credentials.emailOrUsername,
          password: credentials.password,
          twoFactorCode: credentials.twoFactorCode,
          rememberMe: credentials.rememberMe,
          metadata: {
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
            device: metadata.device,
            platform: metadata.platform
          }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<LoginResult>(`Authentication failed: ${error}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        return Result.fail<LoginResult>(data.message || 'Authentication failed')
      }

      // Map the response to domain objects
      const loginResult = this.mapLoginResponse(data)
      if (!loginResult) {
        return Result.fail<LoginResult>('Invalid response format')
      }

      return Result.ok<LoginResult>(loginResult)

    } catch (error) {
      console.error('Login error:', error)
      return Result.fail<LoginResult>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  public async register(data: RegisterData): Promise<Result<User>> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<User>(`Registration failed: ${error}`)
      }

      const responseData = await response.json()
      
      if (!responseData.success) {
        return Result.fail<User>(responseData.message || 'Registration failed')
      }

      // Map the response to User object
      const user = this.mapUserResponse(responseData.user)
      if (!user) {
        return Result.fail<User>('Invalid user data received')
      }

      return Result.ok<User>(user)

    } catch (error) {
      console.error('Registration error:', error)
      return Result.fail<User>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  public async logout(sessionId: UniqueEntityID): Promise<Result<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId.toString()
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<void>(`Logout failed: ${error}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        return Result.fail<void>(data.message || 'Logout failed')
      }

      return Result.ok<void>()

    } catch (error) {
      console.error('Logout error:', error)
      return Result.fail<void>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  public async refreshToken(refreshToken: string, metadata: SessionMetadata): Promise<Result<LoginResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: refreshToken,
          metadata: {
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
            device: metadata.device,
            platform: metadata.platform
          }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<LoginResult>(`Token refresh failed: ${error}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        return Result.fail<LoginResult>(data.message || 'Token refresh failed')
      }

      const loginResult = this.mapLoginResponse(data)
      if (!loginResult) {
        return Result.fail<LoginResult>('Invalid response format')
      }

      return Result.ok<LoginResult>(loginResult)

    } catch (error) {
      console.error('Token refresh error:', error)
      return Result.fail<LoginResult>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  public async validateSession(accessToken: string): Promise<Result<{ user: User; session: Session }>> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          accessToken: accessToken
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<{ user: User; session: Session }>(`Session validation failed: ${error}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        return Result.fail<{ user: User; session: Session }>(data.message || 'Session validation failed')
      }

      const user = this.mapUserResponse(data.user)
      const session = this.mapSessionResponse(data.session)

      if (!user || !session) {
        return Result.fail<{ user: User; session: Session }>('Invalid response data')
      }

      return Result.ok<{ user: User; session: Session }>({ user, session })

    } catch (error) {
      console.error('Session validation error:', error)
      return Result.fail<{ user: User; session: Session }>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  public async changePassword(userId: UniqueEntityID, oldPassword: string, newPassword: string): Promise<Result<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userId: userId.toString(),
          oldPassword: oldPassword,
          newPassword: newPassword
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<void>(`Password change failed: ${error}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        return Result.fail<void>(data.message || 'Password change failed')
      }

      return Result.ok<void>()

    } catch (error) {
      console.error('Password change error:', error)
      return Result.fail<void>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  public async revokeAllSessions(userId: UniqueEntityID, reason?: string): Promise<Result<number>> {
    try {
      const response = await fetch(`${this.baseUrl}/revoke-all-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userId: userId.toString(),
          reason: reason || 'User requested'
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<number>(`Session revocation failed: ${error}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        return Result.fail<number>(data.message || 'Session revocation failed')
      }

      return Result.ok<number>(data.revokedCount || 0)

    } catch (error) {
      console.error('Session revocation error:', error)
      return Result.fail<number>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private mapLoginResponse(data: any): LoginResult | null {
    try {
      const user = this.mapUserResponse(data.user)
      if (!user) {
        console.error('Failed to map user from response')
        return null
      }

      // Create a mock session since backend doesn't provide session details
      const sessionData = {
        id: `session_${Date.now()}`,
        userId: data.user.id,
        accessToken: data.tokens?.accessToken,
        refreshToken: data.tokens?.refreshToken,
        expiresAt: data.tokens?.expiresAt,
        status: 'ACTIVE',
        metadata: {
          userAgent: navigator?.userAgent || 'Unknown',
          ipAddress: '127.0.0.1',
          device: 'desktop',
          platform: navigator?.platform || 'Unknown'
        }
      }

      const session = this.mapSessionResponse(sessionData)
      if (!session) {
        console.error('Failed to create session')
        return null
      }

      return {
        user,
        session,
        accessToken: data.tokens?.accessToken || '',
        refreshToken: data.tokens?.refreshToken,
        expiresAt: new Date(data.tokens?.expiresAt || Date.now() + 15 * 60 * 1000) // Default to 15 min from now
      }
    } catch (error) {
      console.error('Error mapping login response:', error)
      return null
    }
  }

  private mapUserResponse(data: any): User | null {
    try {
      const emailResult = Email.create(data.email)
      const usernameResult = Username.create(data.username)

      if (emailResult.isFailure || usernameResult.isFailure) {
        console.error('Failed to create email or username:', { email: data.email, username: data.username })
        return null
      }

      // Map permissions from backend format to frontend format
      const permissions = Array.isArray(data.permissions) 
        ? data.permissions.map((perm: string) => ({
            resource: perm.toLowerCase(),
            actions: ['read', 'execute']
          }))
        : [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'trading', actions: ['read', 'execute'] },
            { resource: 'portfolio', actions: ['read'] },
            { resource: 'profile', actions: ['read', 'update'] }
          ]

      const userProps: any = {
        username: usernameResult.getValue(),
        email: emailResult.getValue(),
        firstName: data.firstName || 'User',
        lastName: data.lastName || '',
        phone: data.phone,
        role: data.role || 'TRADER',
        status: data.status || 'ACTIVE',
        permissions: permissions,
        preferences: data.preferences || {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          defaultSymbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
          notifications: {
            email: true,
            push: false,
            priceAlerts: true,
            orderUpdates: true
          }
        },
        twoFactorEnabled: data.twoFactorEnabled || false,
        apiKeyEnabled: data.apiKeyEnabled || false
      }

      if (data.lastLogin) {
        userProps.lastLoginAt = new Date(data.lastLogin)
      }

      const userResult = User.create(userProps, new UniqueEntityID(data.id))

      if (userResult.isFailure) {
        console.error('Failed to create user:', userResult.getErrorValue())
        return null
      }

      return userResult.getValue()
    } catch (error) {
      console.error('Error mapping user response:', error)
      return null
    }
  }

  private mapSessionResponse(data: any): Session | null {
    try {
      const userId = new UniqueEntityID(data.userId)
      const expiresAt = new Date(data.expiresAt)
      const metadata = data.metadata || {
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1',
        device: 'desktop',
        platform: 'Unknown'
      }

      const sessionResult = Session.create(
        userId,
        data.accessToken,
        expiresAt,
        metadata,
        data.refreshToken,
        new UniqueEntityID(data.id)
      )

      if (sessionResult.isFailure) {
        return null
      }

      return sessionResult.getValue()
    } catch (error) {
      console.error('Error mapping session response:', error)
      return null
    }
  }
}