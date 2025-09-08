/**
 * Token Service - JWT token generation and validation
 */

import { Result } from '@/shared/domain/Result'
import { User } from '@/auth/domain/entities/User'
import * as jwt from 'jsonwebtoken'

export interface TokenPayload {
  userId: string
  username: string
  email: string
  role: string
  permissions: string[]
  sessionId?: string
}

export interface TokenOptions {
  expiresIn?: string | number
  audience?: string
  issuer?: string
}

export class TokenService {
  private readonly secretKey: string
  private readonly refreshSecretKey: string
  private readonly defaultOptions: TokenOptions

  constructor() {
    // In production, these should come from environment variables
    this.secretKey = process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-this-in-production'
    this.refreshSecretKey = process.env['JWT_REFRESH_SECRET'] || 'your-super-secret-refresh-key-change-this-in-production'
    
    this.defaultOptions = {
      expiresIn: '15m', // Access tokens expire in 15 minutes
      issuer: 'trading-platform',
      audience: 'trading-platform-users'
    }
  }

  public async generateAccessToken(user: User, sessionId?: string): Promise<string> {
    const payload: any = {
      userId: user.id.toString(),
      username: user.username.value,
      email: user.email.value,
      role: user.role,
      permissions: user.permissions.map(p => `${p.resource}:${p.actions.join(',')}`)
    }

    if (sessionId) {
      payload.sessionId = sessionId
    }

    return jwt.sign(payload, this.secretKey, {
      ...this.defaultOptions,
      expiresIn: '15m'
    })
  }

  public async generateRefreshToken(user: User, sessionId?: string): Promise<string> {
    const payload: any = {
      userId: user.id.toString(),
      username: user.username.value,
      email: user.email.value,
      role: user.role,
      permissions: [] // Refresh tokens don't need permissions
    }

    if (sessionId) {
      payload.sessionId = sessionId
    }

    return jwt.sign(payload, this.refreshSecretKey, {
      ...this.defaultOptions,
      expiresIn: '7d' // Refresh tokens expire in 7 days
    })
  }

  public async verifyAccessToken(token: string): Promise<Result<TokenPayload>> {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        audience: this.defaultOptions.audience,
        issuer: this.defaultOptions.issuer
      }) as TokenPayload

      return Result.ok<TokenPayload>(decoded)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Result.fail<TokenPayload>('Token has expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        return Result.fail<TokenPayload>('Invalid token')
      } else {
        return Result.fail<TokenPayload>('Token verification failed')
      }
    }
  }

  public async verifyRefreshToken(token: string): Promise<Result<TokenPayload>> {
    try {
      const decoded = jwt.verify(token, this.refreshSecretKey, {
        audience: this.defaultOptions.audience,
        issuer: this.defaultOptions.issuer
      }) as TokenPayload

      return Result.ok<TokenPayload>(decoded)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Result.fail<TokenPayload>('Refresh token has expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        return Result.fail<TokenPayload>('Invalid refresh token')
      } else {
        return Result.fail<TokenPayload>('Refresh token verification failed')
      }
    }
  }

  public async decodeToken(token: string): Promise<Result<TokenPayload>> {
    try {
      const decoded = jwt.decode(token) as TokenPayload
      
      if (!decoded) {
        return Result.fail<TokenPayload>('Unable to decode token')
      }

      return Result.ok<TokenPayload>(decoded)
    } catch (error) {
      return Result.fail<TokenPayload>('Token decode failed')
    }
  }

  public getTokenExpiration(token: string): Result<Date> {
    try {
      const decoded = jwt.decode(token) as any
      
      if (!decoded || !decoded.exp) {
        return Result.fail<Date>('Unable to get token expiration')
      }

      return Result.ok<Date>(new Date(decoded.exp * 1000))
    } catch (error) {
      return Result.fail<Date>('Failed to get token expiration')
    }
  }

  public isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any
      
      if (!decoded || !decoded.exp) {
        return true
      }

      return Date.now() >= decoded.exp * 1000
    } catch (error) {
      return true
    }
  }

  public getTimeUntilExpiration(token: string): number {
    try {
      const decoded = jwt.decode(token) as any
      
      if (!decoded || !decoded.exp) {
        return 0
      }

      const expirationTime = decoded.exp * 1000
      const currentTime = Date.now()
      
      return Math.max(0, expirationTime - currentTime)
    } catch (error) {
      return 0
    }
  }

  public shouldRefreshToken(token: string, refreshThresholdMinutes = 5): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration(token)
    const refreshThreshold = refreshThresholdMinutes * 60 * 1000 // Convert to milliseconds
    
    return timeUntilExpiration < refreshThreshold && timeUntilExpiration > 0
  }

  public generateApiKey(user: User, name: string): Result<string> {
    try {
      const payload = {
        userId: user.id.toString(),
        username: user.username.value,
        type: 'api_key',
        name,
        createdAt: Date.now()
      }

      // API keys don't expire by default
      const token = jwt.sign(payload, this.secretKey, {
        issuer: this.defaultOptions.issuer,
        audience: 'trading-api'
      })

      return Result.ok<string>(token)
    } catch (error) {
      return Result.fail<string>('Failed to generate API key')
    }
  }

  public verifyApiKey(apiKey: string): Result<{ userId: string; username: string; name: string }> {
    try {
      const decoded = jwt.verify(apiKey, this.secretKey, {
        audience: 'trading-api',
        issuer: this.defaultOptions.issuer
      }) as any

      if (decoded.type !== 'api_key') {
        return Result.fail('Invalid API key type')
      }

      return Result.ok({
        userId: decoded.userId,
        username: decoded.username,
        name: decoded.name
      })
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return Result.fail('Invalid API key')
      } else {
        return Result.fail('API key verification failed')
      }
    }
  }

  public createPasswordResetToken(user: User): Result<string> {
    try {
      const payload = {
        userId: user.id.toString(),
        email: user.email.value,
        type: 'password_reset',
        timestamp: Date.now()
      }

      const token = jwt.sign(payload, this.secretKey, {
        expiresIn: '1h', // Password reset tokens expire in 1 hour
        issuer: this.defaultOptions.issuer,
        audience: 'password-reset'
      })

      return Result.ok<string>(token)
    } catch (error) {
      return Result.fail<string>('Failed to generate password reset token')
    }
  }

  public verifyPasswordResetToken(token: string): Result<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        audience: 'password-reset',
        issuer: this.defaultOptions.issuer
      }) as any

      if (decoded.type !== 'password_reset') {
        return Result.fail('Invalid token type')
      }

      return Result.ok({
        userId: decoded.userId,
        email: decoded.email
      })
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Result.fail('Password reset token has expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        return Result.fail('Invalid password reset token')
      } else {
        return Result.fail('Password reset token verification failed')
      }
    }
  }

  public createEmailVerificationToken(user: User): Result<string> {
    try {
      const payload = {
        userId: user.id.toString(),
        email: user.email.value,
        type: 'email_verification',
        timestamp: Date.now()
      }

      const token = jwt.sign(payload, this.secretKey, {
        expiresIn: '24h', // Email verification tokens expire in 24 hours
        issuer: this.defaultOptions.issuer,
        audience: 'email-verification'
      })

      return Result.ok<string>(token)
    } catch (error) {
      return Result.fail<string>('Failed to generate email verification token')
    }
  }

  public verifyEmailVerificationToken(token: string): Result<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        audience: 'email-verification',
        issuer: this.defaultOptions.issuer
      }) as any

      if (decoded.type !== 'email_verification') {
        return Result.fail('Invalid token type')
      }

      return Result.ok({
        userId: decoded.userId,
        email: decoded.email
      })
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Result.fail('Email verification token has expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        return Result.fail('Invalid email verification token')
      } else {
        return Result.fail('Email verification token verification failed')
      }
    }
  }
}