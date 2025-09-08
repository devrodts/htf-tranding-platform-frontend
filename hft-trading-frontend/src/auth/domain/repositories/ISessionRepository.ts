/**
 * Session Repository Interface - Domain contract for session persistence
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Session, SessionStatus } from '../entities/Session'

export interface SessionSearchCriteria {
  userId?: UniqueEntityID
  status?: SessionStatus
  createdAfter?: Date
  createdBefore?: Date
  expiresAfter?: Date
  expiresBefore?: Date
  ipAddress?: string
  userAgent?: string
  limit?: number
  offset?: number
}

export interface SessionRepository {
  save(session: Session): Promise<Result<void>>
  findById(id: UniqueEntityID): Promise<Result<Session | null>>
  findByAccessToken(accessToken: string): Promise<Result<Session | null>>
  findByRefreshToken(refreshToken: string): Promise<Result<Session | null>>
  findByUserId(userId: UniqueEntityID): Promise<Result<Session[]>>
  findActiveSessions(userId: UniqueEntityID): Promise<Result<Session[]>>
  search(criteria: SessionSearchCriteria): Promise<Result<Session[]>>
  count(criteria?: Partial<SessionSearchCriteria>): Promise<Result<number>>
  delete(id: UniqueEntityID): Promise<Result<void>>
  deleteExpired(): Promise<Result<number>>
  revokeAllForUser(userId: UniqueEntityID, reason?: string): Promise<Result<number>>
  revokeOtherSessions(userId: UniqueEntityID, currentSessionId: UniqueEntityID): Promise<Result<number>>
  cleanupExpiredSessions(): Promise<Result<number>>
  updateActivity(sessionId: UniqueEntityID): Promise<Result<void>>
}