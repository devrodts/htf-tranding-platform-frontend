/**
 * In-Memory Session Repository - Infrastructure implementation for development/testing
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Session, SessionStatus } from '@/auth/domain/entities/Session'
import { SessionRepository, SessionSearchCriteria } from '@/auth/domain/repositories/ISessionRepository'

export class InMemorySessionRepository implements SessionRepository {
  private sessions: Map<string, Session> = new Map()
  private sessionsByAccessToken: Map<string, Session> = new Map()
  private sessionsByRefreshToken: Map<string, Session> = new Map()
  private sessionsByUserId: Map<string, Session[]> = new Map()

  constructor() {
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000) // Cleanup every 5 minutes
  }

  async save(session: Session): Promise<Result<void>> {
    try {
      const sessionId = session.id.toString()
      const userId = session.userId.toString()
      
      // If updating existing session, remove old indexes
      if (this.sessions.has(sessionId)) {
        const existingSession = this.sessions.get(sessionId)!
        this.sessionsByAccessToken.delete(existingSession.accessToken)
        if (existingSession.refreshToken) {
          this.sessionsByRefreshToken.delete(existingSession.refreshToken)
        }
        
        // Remove from user sessions
        const userSessions = this.sessionsByUserId.get(userId) || []
        const index = userSessions.findIndex(s => s.id.equals(session.id))
        if (index !== -1) {
          userSessions.splice(index, 1)
        }
      }
      
      // Store session
      this.sessions.set(sessionId, session)
      this.sessionsByAccessToken.set(session.accessToken, session)
      
      if (session.refreshToken) {
        this.sessionsByRefreshToken.set(session.refreshToken, session)
      }
      
      // Add to user sessions
      const userSessions = this.sessionsByUserId.get(userId) || []
      userSessions.push(session)
      this.sessionsByUserId.set(userId, userSessions)
      
      return Result.ok<void>()
    } catch (error) {
      console.error('Save session error:', error)
      return Result.fail<void>('Failed to save session')
    }
  }

  async findById(id: UniqueEntityID): Promise<Result<Session | null>> {
    try {
      const session = this.sessions.get(id.toString()) || null
      return Result.ok<Session | null>(session)
    } catch (error) {
      console.error('Find session by id error:', error)
      return Result.fail<Session | null>('Failed to find session')
    }
  }

  async findByAccessToken(accessToken: string): Promise<Result<Session | null>> {
    try {
      const session = this.sessionsByAccessToken.get(accessToken) || null
      return Result.ok<Session | null>(session)
    } catch (error) {
      console.error('Find session by access token error:', error)
      return Result.fail<Session | null>('Failed to find session')
    }
  }

  async findByRefreshToken(refreshToken: string): Promise<Result<Session | null>> {
    try {
      const session = this.sessionsByRefreshToken.get(refreshToken) || null
      return Result.ok<Session | null>(session)
    } catch (error) {
      console.error('Find session by refresh token error:', error)
      return Result.fail<Session | null>('Failed to find session')
    }
  }

  async findByUserId(userId: UniqueEntityID): Promise<Result<Session[]>> {
    try {
      const sessions = this.sessionsByUserId.get(userId.toString()) || []
      return Result.ok<Session[]>([...sessions])
    } catch (error) {
      console.error('Find sessions by user id error:', error)
      return Result.fail<Session[]>('Failed to find sessions')
    }
  }

  async findActiveSessions(userId: UniqueEntityID): Promise<Result<Session[]>> {
    try {
      const allSessions = this.sessionsByUserId.get(userId.toString()) || []
      const activeSessions = allSessions.filter(session => session.isActive())
      return Result.ok<Session[]>(activeSessions)
    } catch (error) {
      console.error('Find active sessions error:', error)
      return Result.fail<Session[]>('Failed to find active sessions')
    }
  }

  async search(criteria: SessionSearchCriteria): Promise<Result<Session[]>> {
    try {
      let sessions = Array.from(this.sessions.values())
      
      // Apply filters
      if (criteria.userId) {
        sessions = sessions.filter(session => session.userId.equals(criteria.userId!))
      }
      
      if (criteria.status) {
        sessions = sessions.filter(session => session.status === criteria.status)
      }
      
      if (criteria.createdAfter) {
        sessions = sessions.filter(session => session.createdAt >= criteria.createdAfter!)
      }
      
      if (criteria.createdBefore) {
        sessions = sessions.filter(session => session.createdAt <= criteria.createdBefore!)
      }
      
      if (criteria.expiresAfter) {
        sessions = sessions.filter(session => session.expiresAt >= criteria.expiresAfter!)
      }
      
      if (criteria.expiresBefore) {
        sessions = sessions.filter(session => session.expiresAt <= criteria.expiresBefore!)
      }
      
      if (criteria.ipAddress) {
        sessions = sessions.filter(session => session.metadata.ipAddress === criteria.ipAddress)
      }
      
      if (criteria.userAgent) {
        sessions = sessions.filter(session => 
          session.metadata.userAgent?.includes(criteria.userAgent!) || false
        )
      }
      
      // Apply pagination
      const offset = criteria.offset || 0
      const limit = criteria.limit || sessions.length
      
      sessions = sessions.slice(offset, offset + limit)
      
      return Result.ok<Session[]>(sessions)
    } catch (error) {
      console.error('Search sessions error:', error)
      return Result.fail<Session[]>('Failed to search sessions')
    }
  }

  async count(criteria?: Partial<SessionSearchCriteria>): Promise<Result<number>> {
    try {
      if (!criteria) {
        return Result.ok<number>(this.sessions.size)
      }
      
      const searchResult = await this.search(criteria as SessionSearchCriteria)
      if (searchResult.isFailure) {
        return Result.fail<number>(searchResult.getErrorValue())
      }
      
      return Result.ok<number>(searchResult.getValue().length)
    } catch (error) {
      console.error('Count sessions error:', error)
      return Result.fail<number>('Failed to count sessions')
    }
  }

  async delete(id: UniqueEntityID): Promise<Result<void>> {
    try {
      const session = this.sessions.get(id.toString())
      if (!session) {
        return Result.fail<void>('Session not found')
      }
      
      const userId = session.userId.toString()
      
      // Remove from all indexes
      this.sessions.delete(id.toString())
      this.sessionsByAccessToken.delete(session.accessToken)
      
      if (session.refreshToken) {
        this.sessionsByRefreshToken.delete(session.refreshToken)
      }
      
      // Remove from user sessions
      const userSessions = this.sessionsByUserId.get(userId) || []
      const index = userSessions.findIndex(s => s.id.equals(id))
      if (index !== -1) {
        userSessions.splice(index, 1)
        this.sessionsByUserId.set(userId, userSessions)
      }
      
      return Result.ok<void>()
    } catch (error) {
      console.error('Delete session error:', error)
      return Result.fail<void>('Failed to delete session')
    }
  }

  async deleteExpired(): Promise<Result<number>> {
    try {
      const expiredSessions = Array.from(this.sessions.values()).filter(session => session.isExpired())
      let deletedCount = 0
      
      for (const session of expiredSessions) {
        // Mark as expired
        session.expire()
        
        // Delete the session
        const deleteResult = await this.delete(session.id)
        if (deleteResult.isSuccess) {
          deletedCount++
        }
      }
      
      return Result.ok<number>(deletedCount)
    } catch (error) {
      console.error('Delete expired sessions error:', error)
      return Result.fail<number>('Failed to delete expired sessions')
    }
  }

  async revokeAllForUser(userId: UniqueEntityID, reason?: string): Promise<Result<number>> {
    try {
      const userSessions = this.sessionsByUserId.get(userId.toString()) || []
      let revokedCount = 0
      
      for (const session of userSessions) {
        if (session.isActive()) {
          const revokeResult = session.revoke(reason)
          if (revokeResult.isSuccess) {
            await this.save(session)
            revokedCount++
          }
        }
      }
      
      return Result.ok<number>(revokedCount)
    } catch (error) {
      console.error('Revoke all sessions for user error:', error)
      return Result.fail<number>('Failed to revoke sessions')
    }
  }

  async revokeOtherSessions(userId: UniqueEntityID, currentSessionId: UniqueEntityID): Promise<Result<number>> {
    try {
      const userSessions = this.sessionsByUserId.get(userId.toString()) || []
      let revokedCount = 0
      
      for (const session of userSessions) {
        if (session.isActive() && !session.id.equals(currentSessionId)) {
          const revokeResult = session.revoke('Other sessions revoked by user')
          if (revokeResult.isSuccess) {
            await this.save(session)
            revokedCount++
          }
        }
      }
      
      return Result.ok<number>(revokedCount)
    } catch (error) {
      console.error('Revoke other sessions error:', error)
      return Result.fail<number>('Failed to revoke other sessions')
    }
  }

  async cleanupExpiredSessions(): Promise<Result<number>> {
    try {
      const now = new Date()
      const expiredSessions = Array.from(this.sessions.values()).filter(session => 
        session.expiresAt <= now || session.status === SessionStatus.EXPIRED
      )
      
      let cleanedCount = 0
      
      for (const session of expiredSessions) {
        const deleteResult = await this.delete(session.id)
        if (deleteResult.isSuccess) {
          cleanedCount++
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired sessions`)
      }
      
      return Result.ok<number>(cleanedCount)
    } catch (error) {
      console.error('Cleanup expired sessions error:', error)
      return Result.fail<number>('Failed to cleanup expired sessions')
    }
  }

  async updateActivity(sessionId: UniqueEntityID): Promise<Result<void>> {
    try {
      const session = this.sessions.get(sessionId.toString())
      if (!session) {
        return Result.fail<void>('Session not found')
      }
      
      const updateResult = session.updateActivity()
      if (updateResult.isFailure) {
        return updateResult
      }
      
      await this.save(session)
      return Result.ok<void>()
    } catch (error) {
      console.error('Update session activity error:', error)
      return Result.fail<void>('Failed to update session activity')
    }
  }

  // Utility methods for monitoring
  getSessionStats(): {
    total: number
    active: number
    expired: number
    revoked: number
  } {
    const sessions = Array.from(this.sessions.values())
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.isActive()).length,
      expired: sessions.filter(s => s.status === SessionStatus.EXPIRED).length,
      revoked: sessions.filter(s => s.status === SessionStatus.REVOKED).length
    }
  }

  getUserSessionCounts(): Map<string, number> {
    const counts = new Map<string, number>()
    
    for (const [userId, sessions] of this.sessionsByUserId) {
      const activeSessions = sessions.filter(s => s.isActive())
      counts.set(userId, activeSessions.length)
    }
    
    return counts
  }
}