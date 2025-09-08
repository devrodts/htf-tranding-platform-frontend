/**
 * Session Entity - Domain model for user sessions
 */

import { Entity } from '@/shared/domain/Entity'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Result } from '@/shared/domain/Result'

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

export interface SessionMetadata {
  userAgent?: string
  ipAddress?: string
  device?: string
  location?: string
  platform?: string
}

interface SessionProps {
  userId: UniqueEntityID
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  status: SessionStatus
  metadata: SessionMetadata
  createdAt: Date
  lastActivityAt: Date
  revokedAt?: Date
  revokedReason?: string
}

export class Session extends Entity<UniqueEntityID> {
  protected readonly props: SessionProps

  private constructor(props: SessionProps, id?: UniqueEntityID) {
    super(id || new UniqueEntityID())
    this.props = props
  }

  public static create(
    userId: UniqueEntityID,
    accessToken: string,
    expiresAt: Date,
    metadata: SessionMetadata = {},
    refreshToken?: string,
    id?: UniqueEntityID
  ): Result<Session> {
    const now = new Date()
    
    if (expiresAt <= now) {
      return Result.fail<Session>('Session expiration date must be in the future')
    }

    const sessionProps: any = {
      userId,
      accessToken,
      expiresAt,
      status: SessionStatus.ACTIVE,
      metadata,
      createdAt: now,
      lastActivityAt: now
    }

    if (refreshToken) {
      sessionProps.refreshToken = refreshToken
    }

    return Result.ok<Session>(new Session(sessionProps, id))
  }

  get userId(): UniqueEntityID {
    return this.props.userId
  }

  get accessToken(): string {
    return this.props.accessToken
  }

  get refreshToken(): string | undefined {
    return this.props.refreshToken
  }

  get expiresAt(): Date {
    return this.props.expiresAt
  }

  get status(): SessionStatus {
    return this.props.status
  }

  get metadata(): SessionMetadata {
    return { ...this.props.metadata }
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get lastActivityAt(): Date {
    return this.props.lastActivityAt
  }

  get revokedAt(): Date | undefined {
    return this.props.revokedAt
  }

  get revokedReason(): string | undefined {
    return this.props.revokedReason
  }

  get duration(): number {
    const endTime = this.props.revokedAt || new Date()
    return endTime.getTime() - this.props.createdAt.getTime()
  }

  public isActive(): boolean {
    return this.props.status === SessionStatus.ACTIVE && !this.isExpired()
  }

  public isExpired(): boolean {
    return new Date() >= this.props.expiresAt
  }

  public updateActivity(): Result<void> {
    if (!this.isActive()) {
      return Result.fail<void>('Cannot update activity for inactive session')
    }

    this.props.lastActivityAt = new Date()
    return Result.ok<void>()
  }

  public revoke(reason?: string): Result<void> {
    if (this.props.status === SessionStatus.REVOKED) {
      return Result.fail<void>('Session is already revoked')
    }

    this.props.status = SessionStatus.REVOKED
    this.props.revokedAt = new Date()
    if (reason) {
      this.props.revokedReason = reason
    }
    return Result.ok<void>()
  }

  public expire(): Result<void> {
    if (this.props.status === SessionStatus.EXPIRED) {
      return Result.fail<void>('Session is already expired')
    }

    this.props.status = SessionStatus.EXPIRED
    return Result.ok<void>()
  }

  public extend(newExpirationDate: Date): Result<void> {
    if (!this.isActive()) {
      return Result.fail<void>('Cannot extend inactive session')
    }

    if (newExpirationDate <= new Date()) {
      return Result.fail<void>('New expiration date must be in the future')
    }

    this.props.expiresAt = newExpirationDate
    return Result.ok<void>()
  }

  public updateMetadata(metadata: Partial<SessionMetadata>): Result<void> {
    this.props.metadata = {
      ...this.props.metadata,
      ...metadata
    }
    return Result.ok<void>()
  }

  public getRemainingTime(): number {
    if (!this.isActive()) {
      return 0
    }
    return Math.max(0, this.props.expiresAt.getTime() - new Date().getTime())
  }

  public getRemainingTimeInMinutes(): number {
    return Math.floor(this.getRemainingTime() / (1000 * 60))
  }

  public willExpireWithin(minutes: number): boolean {
    const remainingMinutes = this.getRemainingTimeInMinutes()
    return remainingMinutes > 0 && remainingMinutes <= minutes
  }
}