/**
 * HTTP User Repository - Connects to C++ backend API
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { User, Email, Username } from '@/auth/domain/entities/User'
import type { UserRepository } from '@/auth/domain/repositories/IUserRepository'

export class HttpUserRepository implements UserRepository {
  private readonly baseUrl: string

  constructor(baseUrl = 'http://localhost:8080/api/auth') {
    this.baseUrl = baseUrl
  }

  async save(user: User): Promise<Result<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id.toString(),
          username: user.username.value,
          email: user.email.value,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          status: user.status,
          permissions: user.permissions,
          preferences: user.preferences,
          twoFactorEnabled: user.twoFactorEnabled,
          apiKeyEnabled: user.apiKeyEnabled,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<void>(`Failed to save user: ${error}`)
      }

      return Result.ok<void>()
    } catch (error) {
      return Result.fail<void>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findById(id: UniqueEntityID): Promise<Result<User | null>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${id.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.status === 404) {
        return Result.ok<User | null>(null)
      }

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<User | null>(`Failed to find user: ${error}`)
      }

      const data = await response.json()
      const user = this.mapResponseToUser(data)
      
      if (!user) {
        return Result.fail<User | null>('Invalid user data received')
      }

      return Result.ok<User | null>(user)
    } catch (error) {
      return Result.fail<User | null>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<Result<User | null>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/find?query=${encodeURIComponent(emailOrUsername)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.status === 404) {
        return Result.ok<User | null>(null)
      }

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<User | null>(`Failed to find user: ${error}`)
      }

      const data = await response.json()
      const user = this.mapResponseToUser(data)
      
      if (!user) {
        return Result.fail<User | null>('Invalid user data received')
      }

      return Result.ok<User | null>(user)
    } catch (error) {
      return Result.fail<User | null>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async exists(email: Email): Promise<Result<boolean>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/exists?email=${encodeURIComponent(email.value)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<boolean>(`Failed to check user existence: ${error}`)
      }

      const data = await response.json()
      return Result.ok<boolean>(data.exists === true)
    } catch (error) {
      return Result.fail<boolean>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async existsByUsername(username: Username): Promise<Result<boolean>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/exists?username=${encodeURIComponent(username.value)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const error = await response.text()
        return Result.fail<boolean>(`Failed to check username existence: ${error}`)
      }

      const data = await response.json()
      return Result.ok<boolean>(data.exists === true)
    } catch (error) {
      return Result.fail<boolean>(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private mapResponseToUser(data: any): User | null {
    try {
      const emailResult = Email.create(data.email)
      const usernameResult = Username.create(data.username)

      if (emailResult.isFailure || usernameResult.isFailure) {
        return null
      }

      const userResult = User.create({
        username: usernameResult.getValue(),
        email: emailResult.getValue(),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        status: data.status,
        permissions: data.permissions || [],
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
        apiKeyEnabled: data.apiKeyEnabled || false,
        lastLogin: data.lastLogin ? new Date(data.lastLogin) : undefined
      }, new UniqueEntityID(data.id))

      if (userResult.isFailure) {
        return null
      }

      const user = userResult.getValue()
      
      // Set timestamps if available
      if (data.createdAt) {
        user.createdAt = new Date(data.createdAt)
      }
      if (data.updatedAt) {
        user.updatedAt = new Date(data.updatedAt)
      }

      return user
    } catch (error) {
      console.error('Error mapping response to user:', error)
      return null
    }
  }
}