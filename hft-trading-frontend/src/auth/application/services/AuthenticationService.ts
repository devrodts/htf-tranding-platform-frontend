/**
 * Authentication Service - Application layer service for authentication operations
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { User, Email, Username } from '@/auth/domain/entities/User'
import { Session } from '@/auth/domain/entities/Session'
import type { SessionMetadata } from '@/auth/domain/entities/Session'
import type { UserRepository } from '@/auth/domain/repositories/IUserRepository'
import type { SessionRepository } from '@/auth/domain/repositories/ISessionRepository'
import { PasswordService } from './PasswordService'
import { TokenService } from './TokenService'
import { TwoFactorService } from './TwoFactorService'

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

export interface AuthenticationServiceConfig {
  sessionDurationMinutes: number
  refreshTokenDurationDays: number
  maxConcurrentSessions: number
  requireTwoFactor: boolean
  passwordMinLength: number
}

export class AuthenticationService {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private twoFactorService: TwoFactorService,
    private config: AuthenticationServiceConfig
  ) {}

  public async login(credentials: LoginCredentials, metadata: SessionMetadata): Promise<Result<LoginResult>> {
    try {
      // Find user
      const userResult = await this.userRepository.findByEmailOrUsername(credentials.emailOrUsername)
      if (userResult.isFailure) {
        return Result.fail<LoginResult>('Authentication failed')
      }

      const user = userResult.getValue()
      if (!user) {
        return Result.fail<LoginResult>('Authentication failed')
      }

      // Check if user is active
      if (!user.isActive()) {
        return Result.fail<LoginResult>('Account is not active')
      }

      // Verify password
      const passwordValid = await this.passwordService.verify(credentials.password, user.id)
      if (!passwordValid) {
        return Result.fail<LoginResult>('Authentication failed')
      }

      // Verify two-factor if enabled
      if (user.twoFactorEnabled) {
        if (!credentials.twoFactorCode) {
          return Result.fail<LoginResult>('Two-factor authentication code required')
        }

        const twoFactorValid = await this.twoFactorService.verify(user.id, credentials.twoFactorCode)
        if (!twoFactorValid) {
          return Result.fail<LoginResult>('Invalid two-factor authentication code')
        }
      }

      // Check concurrent sessions limit
      const activeSessionsResult = await this.sessionRepository.findActiveSessions(user.id)
      if (activeSessionsResult.isFailure) {
        return Result.fail<LoginResult>('Unable to verify session limits')
      }

      const activeSessions = activeSessionsResult.getValue()
      if (activeSessions.length >= this.config.maxConcurrentSessions) {
        // Revoke oldest session
        const oldestSession = activeSessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
        if (oldestSession) {
          const revokeResult = oldestSession.revoke('Exceeded maximum concurrent sessions')
          if (revokeResult.isSuccess) {
            await this.sessionRepository.save(oldestSession)
          }
        }
      }

      // Create session
      const sessionDuration = credentials.rememberMe 
        ? this.config.refreshTokenDurationDays * 24 * 60 
        : this.config.sessionDurationMinutes
      
      const expiresAt = new Date(Date.now() + sessionDuration * 60 * 1000)
      const accessToken = await this.tokenService.generateAccessToken(user)
      const refreshToken = credentials.rememberMe ? await this.tokenService.generateRefreshToken(user) : undefined

      const sessionResult = Session.create(user.id, accessToken, expiresAt, metadata, refreshToken)
      if (sessionResult.isFailure) {
        return Result.fail<LoginResult>('Failed to create session')
      }

      const session = sessionResult.getValue()
      const saveSessionResult = await this.sessionRepository.save(session)
      if (saveSessionResult.isFailure) {
        return Result.fail<LoginResult>('Failed to create session')
      }

      // Update user's last login
      user.updateLastLogin()
      await this.userRepository.save(user)

      return Result.ok<LoginResult>({
        user,
        session,
        accessToken,
        expiresAt,
        ...(refreshToken && { refreshToken })
      })

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return Result.fail<LoginResult>('Authentication failed')
    }
  }

  public async register(data: RegisterData): Promise<Result<User>> {
    try {
      // Validate email
      const emailResult = Email.create(data.email)
      if (emailResult.isFailure) {
        return Result.fail<User>('Invalid email format')
      }

      // Validate username
      const usernameResult = Username.create(data.username)
      if (usernameResult.isFailure) {
        return Result.fail<User>('Invalid username format')
      }

      const email = emailResult.getValue()
      const username = usernameResult.getValue()

      // Check if email already exists
      const emailExistsResult = await this.userRepository.exists(email)
      if (emailExistsResult.isFailure) {
        return Result.fail<User>('Unable to verify email availability')
      }

      if (emailExistsResult.getValue()) {
        return Result.fail<User>('Email is already registered')
      }

      // Check if username already exists
      const usernameExistsResult = await this.userRepository.existsByUsername(username)
      if (usernameExistsResult.isFailure) {
        return Result.fail<User>('Unable to verify username availability')
      }

      if (usernameExistsResult.getValue()) {
        return Result.fail<User>('Username is already taken')
      }

      // Validate password
      const passwordValidation = this.passwordService.validate(data.password)
      if (passwordValidation.isFailure) {
        return Result.fail<User>('Password validation failed')
      }

      // Create user
      const userResult = User.create({
        username,
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'TRADER' as any, // Default role
        status: 'PENDING_VERIFICATION' as any, // Require email verification
        permissions: [
          { resource: 'trading', actions: ['read', 'execute'] },
          { resource: 'portfolio', actions: ['read'] },
          { resource: 'profile', actions: ['read', 'update'] }
        ],
        preferences: {
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
        ...(data.phone && { phone: data.phone }),
        twoFactorEnabled: false,
        apiKeyEnabled: false
      })

      if (userResult.isFailure) {
        return Result.fail<User>('User creation failed')
      }

      const user = userResult.getValue()

      // Hash and store password
      await this.passwordService.hash(data.password, user.id)

      // Save user
      const saveResult = await this.userRepository.save(user)
      if (saveResult.isFailure) {
        return Result.fail<User>('Failed to create user account')
      }

      return Result.ok<User>(user)

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return Result.fail<User>('Registration failed')
    }
  }

  public async logout(sessionId: UniqueEntityID): Promise<Result<void>> {
    try {
      const sessionResult = await this.sessionRepository.findById(sessionId)
      if (sessionResult.isFailure || !sessionResult.getValue()) {
        return Result.fail<void>('Session not found')
      }

      const session = sessionResult.getValue()!
      const revokeResult = session.revoke('User logout')
      if (revokeResult.isFailure) {
        return Result.fail<void>('Failed to revoke session')
      }

      await this.sessionRepository.save(session)
      return Result.ok<void>()

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return Result.fail<void>('Logout failed')
    }
  }

  public async refreshToken(refreshToken: string, metadata: SessionMetadata): Promise<Result<LoginResult>> {
    try {
      const sessionResult = await this.sessionRepository.findByRefreshToken(refreshToken)
      if (sessionResult.isFailure || !sessionResult.getValue()) {
        return Result.fail<LoginResult>('Invalid refresh token')
      }

      const session = sessionResult.getValue()!
      if (!session.isActive()) {
        return Result.fail<LoginResult>('Session is not active')
      }

      const userResult = await this.userRepository.findById(session.userId)
      if (userResult.isFailure || !userResult.getValue()) {
        return Result.fail<LoginResult>('User not found')
      }

      const user = userResult.getValue()!
      if (!user.isActive()) {
        return Result.fail<LoginResult>('Account is not active')
      }

      // Generate new tokens
      const newAccessToken = await this.tokenService.generateAccessToken(user)
      const newRefreshToken = await this.tokenService.generateRefreshToken(user)

      // Update session
      const expiresAt = new Date(Date.now() + this.config.refreshTokenDurationDays * 24 * 60 * 60 * 1000)
      session.extend(expiresAt)
      session.updateMetadata(metadata)
      
      await this.sessionRepository.save(session)

      return Result.ok<LoginResult>({
        user,
        session,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt
      })

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return Result.fail<LoginResult>('Token refresh failed')
    }
  }

  public async validateSession(accessToken: string): Promise<Result<{ user: User; session: Session }>> {
    try {
      const sessionResult = await this.sessionRepository.findByAccessToken(accessToken)
      if (sessionResult.isFailure || !sessionResult.getValue()) {
        return Result.fail<{ user: User; session: Session }>('Invalid session')
      }

      const session = sessionResult.getValue()!
      if (!session.isActive()) {
        return Result.fail<{ user: User; session: Session }>('Session is not active')
      }

      const userResult = await this.userRepository.findById(session.userId)
      if (userResult.isFailure || !userResult.getValue()) {
        return Result.fail<{ user: User; session: Session }>('User not found')
      }

      const user = userResult.getValue()!
      if (!user.isActive()) {
        return Result.fail<{ user: User; session: Session }>('Account is not active')
      }

      // Update session activity
      session.updateActivity()
      await this.sessionRepository.save(session)

      return Result.ok<{ user: User; session: Session }>({ user, session })

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return Result.fail<{ user: User; session: Session }>('Session validation failed')
    }
  }

  public async revokeAllSessions(userId: UniqueEntityID, reason?: string): Promise<Result<number>> {
    try {
      const result = await this.sessionRepository.revokeAllForUser(userId, reason)
      return result
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return Result.fail<number>('Failed to revoke sessions')
    }
  }

  public async changePassword(userId: UniqueEntityID, oldPassword: string, newPassword: string): Promise<Result<void>> {
    try {
      // Verify old password
      const oldPasswordValid = await this.passwordService.verify(oldPassword, userId)
      if (!oldPasswordValid) {
        return Result.fail<void>('Current password is incorrect')
      }

      // Validate new password
      const passwordValidation = this.passwordService.validate(newPassword)
      if (passwordValidation.isFailure) {
        return Result.fail<void>('Password validation failed')
      }

      // Hash and store new password
      await this.passwordService.hash(newPassword, userId)

      // Revoke all sessions except current one would be handled by the controller
      return Result.ok<void>()

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return Result.fail<void>('Password change failed')
    }
  }
}