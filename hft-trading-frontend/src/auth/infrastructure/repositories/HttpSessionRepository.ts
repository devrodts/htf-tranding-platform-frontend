/**
 * HTTP Session Repository - Connects to C++ backend API
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Session } from '@/auth/domain/entities/Session'
import type { SessionRepository } from '@/auth/domain/repositories/ISessionRepository'

export class HttpSessionRepository implements SessionRepository {
  private readonly baseUrl: string

  constructor(baseUrl = 'http://localhost:8080/api/auth') {
    this.baseUrl = baseUrl
  }

  async save(session: Session): Promise<Result<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: session.id.toString(),
          userId: session.userId.toString(),
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt.toISOString(),
          isActive: session.isActive(),
          metadata: session.metadata,
          lastActivity: session.lastActivity.toISOString(),
          createdAt: session.createdAt.toISOString(),
          revokedAt: session.revokedAt?.toISOString(),
          revokedReason: session.revokedReason
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<void>(`Failed to save session: ${error}`)
      }

      return Result.ok<void>()
    } catch (error) {
      return Result.fail<void>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findById(id: UniqueEntityID): Promise<Result<Session | null>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${id.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.status === 404) {
        return Result.ok<Session | null>(null)
      }

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<Session | null>(`Failed to find session: ${error}`)
      }

      const data = await response.json()
      const session = this.mapResponseToSession(data)
      
      if (!session) {
        return Result.fail<Session | null>('Invalid session data received')
      }

      return Result.ok<Session | null>(session)
    } catch (error) {
      return Result.fail<Session | null>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findByAccessToken(accessToken: string): Promise<Result<Session | null>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/by-token?token=${encodeURIComponent(accessToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.status === 404) {
        return Result.ok<Session | null>(null)
      }

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<Session | null>(`Failed to find session: ${error}`)
      }

      const data = await response.json()
      const session = this.mapResponseToSession(data)
      
      if (!session) {
        return Result.fail<Session | null>('Invalid session data received')
      }

      return Result.ok<Session | null>(session)
    } catch (error) {
      return Result.fail<Session | null>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findByRefreshToken(refreshToken: string): Promise<Result<Session | null>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/by-refresh-token?token=${encodeURIComponent(refreshToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.status === 404) {
        return Result.ok<Session | null>(null)
      }

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<Session | null>(`Failed to find session: ${error}`)
      }

      const data = await response.json()
      const session = this.mapResponseToSession(data)
      
      if (!session) {
        return Result.fail<Session | null>('Invalid session data received')
      }

      return Result.ok<Session | null>(session)
    } catch (error) {
      return Result.fail<Session | null>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findActiveSessions(userId: UniqueEntityID): Promise<Result<Session[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/active?userId=${userId.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<Session[]>(`Failed to find active sessions: ${error}`)
      }

      const data = await response.json()
      const sessions: Session[] = []

      if (Array.isArray(data.sessions)) {
        for (const sessionData of data.sessions) {
          const session = this.mapResponseToSession(sessionData)
          if (session) {
            sessions.push(session)
          }
        }
      }

      return Result.ok<Session[]>(sessions)
    } catch (error) {
      return Result.fail<Session[]>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async revokeAllForUser(userId: UniqueEntityID, reason?: string): Promise<Result<number>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/revoke-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId.toString(),
          reason: reason || 'User requested'
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<number>(`Failed to revoke sessions: ${error}`)
      }

      const data = await response.json()
      return Result.ok<number>(data.revokedCount || 0)
    } catch (error) {
      return Result.fail<number>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private mapResponseToSession(data: any): Session | null {
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

      const session = sessionResult.getValue()
      
      // Set timestamps if available
      if (data.createdAt) {
        session.createdAt = new Date(data.createdAt)
      }
      if (data.lastActivity) {
        session.lastActivity = new Date(data.lastActivity)
      }
      if (data.revokedAt) {
        session.revokedAt = new Date(data.revokedAt)
      }
      if (data.revokedReason) {
        session.revokedReason = data.revokedReason
      }

      return session
    } catch (error) {
      console.error('Error mapping response to session:', error)
      return null
    }
  }
}