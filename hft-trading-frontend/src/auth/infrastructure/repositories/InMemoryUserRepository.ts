/**
 * In-Memory User Repository - Infrastructure implementation for development/testing
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { User, Email, Username } from '@/auth/domain/entities/User'
import { UserRepository, UserSearchCriteria } from '@/auth/domain/repositories/IUserRepository'

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map()
  private usersByEmail: Map<string, User> = new Map()
  private usersByUsername: Map<string, User> = new Map()

  private demoPasswords: Map<string, string> = new Map()

  constructor() {
    // Initialize with some demo users
    this.initializeDemoUsers()
  }

  private setDemoPassword(userId: UniqueEntityID, password: string): void {
    this.demoPasswords.set(userId.toString(), password)
  }

  public getDemoPassword(userId: UniqueEntityID): string | undefined {
    return this.demoPasswords.get(userId.toString())
  }

  async save(user: User): Promise<Result<void>> {
    try {
      if (!user) {
        console.error('Save user error: User is null or undefined')
        return Result.fail<void>('User is null or undefined')
      }
      
      if (!user.id || !user.email || !user.username) {
        console.error('Save user error: User properties are missing', { 
          hasId: !!user.id, 
          hasEmail: !!user.email, 
          hasUsername: !!user.username 
        })
        return Result.fail<void>('User properties are missing')
      }

      const userId = user.id.toString()
      
      // If updating existing user, remove old indexes
      if (this.users.has(userId)) {
        const existingUser = this.users.get(userId)!
        this.usersByEmail.delete(existingUser.email.value)
        this.usersByUsername.delete(existingUser.username.value)
      }
      
      // Store user
      this.users.set(userId, user)
      this.usersByEmail.set(user.email.value, user)
      this.usersByUsername.set(user.username.value, user)
      
      return Result.ok<void>()
    } catch (error) {
      console.error('Save user error:', error)
      return Result.fail<void>('Failed to save user')
    }
  }

  async findById(id: UniqueEntityID): Promise<Result<User | null>> {
    try {
      const user = this.users.get(id.toString()) || null
      return Result.ok<User | null>(user)
    } catch (error) {
      console.error('Find user by id error:', error)
      return Result.fail<User | null>('Failed to find user')
    }
  }

  async findByEmail(email: Email): Promise<Result<User | null>> {
    try {
      const user = this.usersByEmail.get(email.value) || null
      return Result.ok<User | null>(user)
    } catch (error) {
      console.error('Find user by email error:', error)
      return Result.fail<User | null>('Failed to find user')
    }
  }

  async findByUsername(username: Username): Promise<Result<User | null>> {
    try {
      const user = this.usersByUsername.get(username.value) || null
      return Result.ok<User | null>(user)
    } catch (error) {
      console.error('Find user by username error:', error)
      return Result.fail<User | null>('Failed to find user')
    }
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<Result<User | null>> {
    try {
      // Try to find by email first
      let user = this.usersByEmail.get(emailOrUsername)
      
      // If not found, try username
      if (!user) {
        user = this.usersByUsername.get(emailOrUsername)
      }
      
      return Result.ok<User | null>(user || null)
    } catch (error) {
      console.error('Find user by email or username error:', error)
      return Result.fail<User | null>('Failed to find user')
    }
  }

  async search(criteria: UserSearchCriteria): Promise<Result<User[]>> {
    try {
      let users = Array.from(this.users.values())
      
      // Apply filters
      if (criteria.email) {
        users = users.filter(user => user.email.value.includes(criteria.email!))
      }
      
      if (criteria.username) {
        users = users.filter(user => user.username.value.includes(criteria.username!))
      }
      
      if (criteria.role) {
        users = users.filter(user => user.role === criteria.role)
      }
      
      if (criteria.status) {
        users = users.filter(user => user.status === criteria.status)
      }
      
      if (criteria.createdAfter) {
        users = users.filter(user => user.createdAt >= criteria.createdAfter!)
      }
      
      if (criteria.createdBefore) {
        users = users.filter(user => user.createdAt <= criteria.createdBefore!)
      }
      
      if (criteria.lastLoginAfter && criteria.lastLoginAfter) {
        users = users.filter(user => user.lastLoginAt && user.lastLoginAt >= criteria.lastLoginAfter!)
      }
      
      if (criteria.lastLoginBefore) {
        users = users.filter(user => user.lastLoginAt && user.lastLoginAt <= criteria.lastLoginBefore!)
      }
      
      // Apply pagination
      const offset = criteria.offset || 0
      const limit = criteria.limit || users.length
      
      users = users.slice(offset, offset + limit)
      
      return Result.ok<User[]>(users)
    } catch (error) {
      console.error('Search users error:', error)
      return Result.fail<User[]>('Failed to search users')
    }
  }

  async count(criteria?: Partial<UserSearchCriteria>): Promise<Result<number>> {
    try {
      if (!criteria) {
        return Result.ok<number>(this.users.size)
      }
      
      const searchResult = await this.search(criteria as UserSearchCriteria)
      if (searchResult.isFailure) {
        return Result.fail<number>(searchResult.getErrorValue())
      }
      
      return Result.ok<number>(searchResult.getValue().length)
    } catch (error) {
      console.error('Count users error:', error)
      return Result.fail<number>('Failed to count users')
    }
  }

  async delete(id: UniqueEntityID): Promise<Result<void>> {
    try {
      const user = this.users.get(id.toString())
      if (!user) {
        return Result.fail<void>('User not found')
      }
      
      this.users.delete(id.toString())
      this.usersByEmail.delete(user.email.value)
      this.usersByUsername.delete(user.username.value)
      
      return Result.ok<void>()
    } catch (error) {
      console.error('Delete user error:', error)
      return Result.fail<void>('Failed to delete user')
    }
  }

  async exists(email: Email): Promise<Result<boolean>> {
    try {
      const exists = this.usersByEmail.has(email.value)
      return Result.ok<boolean>(exists)
    } catch (error) {
      console.error('Check email exists error:', error)
      return Result.fail<boolean>('Failed to check if email exists')
    }
  }

  async existsByUsername(username: Username): Promise<Result<boolean>> {
    try {
      const exists = this.usersByUsername.has(username.value)
      return Result.ok<boolean>(exists)
    } catch (error) {
      console.error('Check username exists error:', error)
      return Result.fail<boolean>('Failed to check if username exists')
    }
  }

  async getAllActive(): Promise<Result<User[]>> {
    try {
      const activeUsers = Array.from(this.users.values()).filter(user => user.isActive())
      return Result.ok<User[]>(activeUsers)
    } catch (error) {
      console.error('Get all active users error:', error)
      return Result.fail<User[]>('Failed to get active users')
    }
  }

  async getByRole(role: string): Promise<Result<User[]>> {
    try {
      const users = Array.from(this.users.values()).filter(user => user.role === role)
      return Result.ok<User[]>(users)
    } catch (error) {
      console.error('Get users by role error:', error)
      return Result.fail<User[]>('Failed to get users by role')
    }
  }

  async updateLastLogin(id: UniqueEntityID): Promise<Result<void>> {
    try {
      const user = this.users.get(id.toString())
      if (!user) {
        return Result.fail<void>('User not found')
      }
      
      user.updateLastLogin()
      await this.save(user)
      
      return Result.ok<void>()
    } catch (error) {
      console.error('Update last login error:', error)
      return Result.fail<void>('Failed to update last login')
    }
  }

  private async initializeDemoUsers(): Promise<void> {
    try {
      // Create demo admin user
      const adminEmail = Email.create('admin@trading.com').getValue()!
      const adminUsername = Username.create('admin').getValue()!
      
      const adminUserResult = User.create({
        username: adminUsername,
        email: adminEmail,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN' as any,
        status: 'ACTIVE' as any,
        permissions: [
          { resource: '*', actions: ['*'] }
        ],
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'UTC',
          defaultSymbols: ['SPY', 'QQQ', 'IWM'],
          notifications: {
            email: true,
            push: true,
            priceAlerts: true,
            orderUpdates: true
          }
        },
        twoFactorEnabled: false,
        apiKeyEnabled: true
      }, new UniqueEntityID('admin-123'))

      if (adminUserResult.isFailure) {
        console.error('Failed to create admin user:', adminUserResult.getErrorValue())
        return
      }

      const adminUser = adminUserResult.getValue()
      const adminSaveResult = await this.save(adminUser)
      if (adminSaveResult.isFailure) {
        console.error('Failed to save admin user:', adminSaveResult.getErrorValue())
        return
      }


      // Create demo trader user
      const traderEmail = Email.create('trader@trading.com').getValue()!
      const traderUsername = Username.create('trader').getValue()!
      
      const traderUserResult = User.create({
        username: traderUsername,
        email: traderEmail,
        firstName: 'John',
        lastName: 'Trader',
        role: 'TRADER' as any,
        status: 'ACTIVE' as any,
        permissions: [
          { resource: 'trading', actions: ['read', 'execute'] },
          { resource: 'portfolio', actions: ['read'] },
          { resource: 'profile', actions: ['read', 'update'] }
        ],
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'America/New_York',
          defaultSymbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
          notifications: {
            email: true,
            push: false,
            priceAlerts: true,
            orderUpdates: true
          }
        },
        twoFactorEnabled: false,
        apiKeyEnabled: false,
        riskLimits: {
          maxPositionSize: 1000000,
          maxDailyLoss: 50000,
          maxOrderSize: 10000,
          allowedSymbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'SPY', 'QQQ']
        }
      }, new UniqueEntityID('trader-123'))

      if (traderUserResult.isFailure) {
        console.error('Failed to create trader user:', traderUserResult.getErrorValue())
        return
      }

      const traderUser = traderUserResult.getValue()
      const traderSaveResult = await this.save(traderUser)
      if (traderSaveResult.isFailure) {
        console.error('Failed to save trader user:', traderSaveResult.getErrorValue())
        return
      }


      console.log('Demo users initialized:')
      console.log('- Admin: admin@trading.com / admin')
      console.log('- Trader: trader@trading.com / trader')
      
    } catch (error) {
      console.error('Failed to initialize demo users:', error)
    }
  }
}