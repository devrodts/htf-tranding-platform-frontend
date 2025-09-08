/**
 * User Entity - Domain model for authenticated users
 */

import { Entity } from '@/shared/domain/Entity'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { Result } from '@/shared/domain/Result'
import { ValueObject } from '@/shared/domain/ValueObject'

export enum UserRole {
  ADMIN = 'ADMIN',
  TRADER = 'TRADER',
  VIEWER = 'VIEWER',
  RISK_MANAGER = 'RISK_MANAGER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export class Email extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props)
  }

  public static create(value: string): Result<Email> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return Result.fail<Email>('Invalid email format')
    }
    return Result.ok<Email>(new Email({ value }))
  }

  get value(): string {
    return this.props.value
  }
}

export class Username extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props)
  }

  public static create(value: string): Result<Username> {
    if (!value || value.length < 3) {
      return Result.fail<Username>('Username must be at least 3 characters')
    }
    if (value.length > 50) {
      return Result.fail<Username>('Username must not exceed 50 characters')
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return Result.fail<Username>('Username can only contain letters, numbers, hyphens, and underscores')
    }
    return Result.ok<Username>(new Username({ value }))
  }

  get value(): string {
    return this.props.value
  }
}

export interface UserPermission {
  resource: string
  actions: string[]
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  defaultSymbols: string[]
  dashboardLayout?: Record<string, any>
  notifications: {
    email: boolean
    push: boolean
    priceAlerts: boolean
    orderUpdates: boolean
  }
}

interface UserProps {
  username: Username
  email: Email
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
  permissions: UserPermission[]
  preferences: UserPreferences
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  profileImageUrl?: string
  phone?: string
  twoFactorEnabled: boolean
  apiKeyEnabled: boolean
  riskLimits?: {
    maxPositionSize: number
    maxDailyLoss: number
    maxOrderSize: number
    allowedSymbols: string[]
  }
}

export class User extends Entity<UniqueEntityID> {
  private props: UserProps

  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(id || new UniqueEntityID())
    this.props = props
  }

  public static create(props: Omit<UserProps, 'createdAt' | 'updatedAt'>, id?: UniqueEntityID): Result<User> {
    const now = new Date()
    const userProps: UserProps = {
      ...props,
      createdAt: now,
      updatedAt: now
    }

    return Result.ok<User>(new User(userProps, id))
  }

  get username(): Username {
    return this.props.username
  }

  get email(): Email {
    return this.props.email
  }

  get firstName(): string {
    return this.props.firstName
  }

  get lastName(): string {
    return this.props.lastName
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`
  }

  get role(): UserRole {
    return this.props.role
  }

  get status(): UserStatus {
    return this.props.status
  }

  get permissions(): UserPermission[] {
    return [...this.props.permissions]
  }

  get preferences(): UserPreferences {
    return { ...this.props.preferences }
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get profileImageUrl(): string | undefined {
    return this.props.profileImageUrl
  }

  get twoFactorEnabled(): boolean {
    return this.props.twoFactorEnabled
  }

  get apiKeyEnabled(): boolean {
    return this.props.apiKeyEnabled
  }

  get riskLimits(): UserProps['riskLimits'] {
    return this.props.riskLimits ? { ...this.props.riskLimits } : undefined
  }

  public updateLastLogin(): void {
    this.props.lastLoginAt = new Date()
    this.props.updatedAt = new Date()
  }

  public updatePreferences(preferences: Partial<UserPreferences>): Result<void> {
    this.props.preferences = {
      ...this.props.preferences,
      ...preferences
    }
    this.props.updatedAt = new Date()
    return Result.ok<void>()
  }

  public changeStatus(status: UserStatus): Result<void> {
    if (this.props.status === UserStatus.SUSPENDED && status !== UserStatus.ACTIVE) {
      return Result.fail<void>('Suspended users can only be activated')
    }
    
    this.props.status = status
    this.props.updatedAt = new Date()
    return Result.ok<void>()
  }

  public hasPermission(resource: string, action: string): boolean {
    return this.props.permissions.some(permission => 
      permission.resource === resource && 
      (permission.actions.includes(action) || permission.actions.includes('*'))
    )
  }

  public isActive(): boolean {
    return this.props.status === UserStatus.ACTIVE
  }

  public canTrade(): boolean {
    return this.isActive() && 
           (this.props.role === UserRole.TRADER || this.props.role === UserRole.ADMIN) &&
           this.hasPermission('trading', 'execute')
  }

  public canViewPortfolio(): boolean {
    return this.isActive() && this.hasPermission('portfolio', 'read')
  }

  public canManageRisk(): boolean {
    return this.isActive() && 
           (this.props.role === UserRole.RISK_MANAGER || this.props.role === UserRole.ADMIN) &&
           this.hasPermission('risk', 'manage')
  }

  public enableTwoFactor(): Result<void> {
    if (this.props.twoFactorEnabled) {
      return Result.fail<void>('Two-factor authentication is already enabled')
    }
    
    this.props.twoFactorEnabled = true
    this.props.updatedAt = new Date()
    return Result.ok<void>()
  }

  public disableTwoFactor(): Result<void> {
    if (!this.props.twoFactorEnabled) {
      return Result.fail<void>('Two-factor authentication is already disabled')
    }
    
    this.props.twoFactorEnabled = false
    this.props.updatedAt = new Date()
    return Result.ok<void>()
  }

  public updateRiskLimits(riskLimits: UserProps['riskLimits']): Result<void> {
    if (riskLimits) {
      if (riskLimits.maxPositionSize <= 0) {
        return Result.fail<void>('Max position size must be positive')
      }
      if (riskLimits.maxDailyLoss <= 0) {
        return Result.fail<void>('Max daily loss must be positive')
      }
      if (riskLimits.maxOrderSize <= 0) {
        return Result.fail<void>('Max order size must be positive')
      }
    }
    
    if (riskLimits) {
      this.props.riskLimits = { ...riskLimits }
    } else {
      delete this.props.riskLimits
    }
    this.props.updatedAt = new Date()
    return Result.ok<void>()
  }
}