/**
 * Password Service - Handles password hashing, verification, and validation
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import * as bcrypt from 'bcryptjs'

export interface PasswordValidationRule {
  name: string
  validate: (password: string) => boolean
  message: string
}

export interface PasswordRequirements {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  forbidCommonPasswords: boolean
  maxLength?: number
}

export class PasswordService {
  private readonly saltRounds = 12
  private readonly passwordStore: Map<string, string> = new Map() // In-memory store for demo
  private readonly demoPasswords: Map<string, string> = new Map() // Simple demo passwords
  
  private readonly requirements: PasswordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true,
    maxLength: 128
  }

  constructor() {
    // Initialize demo passwords synchronously
    this.initializeDemoPasswords()
  }

  private initializeDemoPasswords() {
    // Set demo passwords (pre-hashed for development)
    // admin hash: $2a$12$demo...
    // trader hash: $2a$12$demo...
    // For development, we'll use simpler comparison
    this.passwordStore.set('admin-123', 'admin')
    this.passwordStore.set('trader-123', 'trader')
  }

  private readonly commonPasswords = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    '1234567890', 'dragon', 'master', 'hello', 'superman'
  ])

  public async hash(password: string, userId: UniqueEntityID): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds)
      this.passwordStore.set(userId.toString(), hashedPassword)
      return hashedPassword
    } catch (error) {
      console.error('Password hashing error:', error)
      throw new Error('Failed to hash password')
    }
  }

  public async verify(password: string, userId: UniqueEntityID): Promise<boolean> {
    try {
      const storedPassword = this.passwordStore.get(userId.toString())
      if (!storedPassword) {
        return false
      }

      // For demo accounts, use simple comparison
      if (userId.toString() === 'admin-123' || userId.toString() === 'trader-123') {
        return password === storedPassword
      }

      // For real users, use bcrypt
      return await bcrypt.compare(password, storedPassword)
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }

  public validate(password: string): Result<void> {
    // Allow demo passwords to bypass validation
    if (password === 'admin' || password === 'trader') {
      return Result.ok<void>()
    }

    const validationErrors: string[] = []

    // Length validation
    if (password.length < this.requirements.minLength) {
      validationErrors.push(`Password must be at least ${this.requirements.minLength} characters long`)
    }

    if (this.requirements.maxLength && password.length > this.requirements.maxLength) {
      validationErrors.push(`Password must not exceed ${this.requirements.maxLength} characters`)
    }

    // Character type requirements
    if (this.requirements.requireUppercase && !/[A-Z]/.test(password)) {
      validationErrors.push('Password must contain at least one uppercase letter')
    }

    if (this.requirements.requireLowercase && !/[a-z]/.test(password)) {
      validationErrors.push('Password must contain at least one lowercase letter')
    }

    if (this.requirements.requireNumbers && !/\d/.test(password)) {
      validationErrors.push('Password must contain at least one number')
    }

    if (this.requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      validationErrors.push('Password must contain at least one special character')
    }

    // Common password check
    if (this.requirements.forbidCommonPasswords && this.commonPasswords.has(password.toLowerCase())) {
      validationErrors.push('Password is too common, please choose a stronger password')
    }

    // Sequential characters check
    if (this.hasSequentialChars(password)) {
      validationErrors.push('Password should not contain sequential characters (e.g., 123, abc)')
    }

    // Repeated characters check
    if (this.hasRepeatedChars(password)) {
      validationErrors.push('Password should not contain excessive repeated characters')
    }

    if (validationErrors.length > 0) {
      return Result.fail<void>(validationErrors.join('. '))
    }

    return Result.ok<void>()
  }

  public calculateStrength(password: string): {
    score: number // 0-100
    level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'
    feedback: string[]
  } {
    let score = 0
    const feedback: string[] = []

    // Length scoring
    if (password.length >= 8) score += 20
    else feedback.push('Use at least 8 characters')

    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 10

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10
    else feedback.push('Add lowercase letters')

    if (/[A-Z]/.test(password)) score += 10
    else feedback.push('Add uppercase letters')

    if (/\d/.test(password)) score += 10
    else feedback.push('Add numbers')

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15
    else feedback.push('Add special characters')

    // Complexity bonuses
    const uniqueChars = new Set(password).size
    if (uniqueChars >= 8) score += 10

    // Penalties
    if (this.commonPasswords.has(password.toLowerCase())) {
      score -= 30
      feedback.push('Avoid common passwords')
    }

    if (this.hasSequentialChars(password)) {
      score -= 15
      feedback.push('Avoid sequential characters')
    }

    if (this.hasRepeatedChars(password)) {
      score -= 10
      feedback.push('Avoid repeated characters')
    }

    // Cap the score
    score = Math.max(0, Math.min(100, score))

    // Determine level
    let level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'
    if (score < 20) level = 'very-weak'
    else if (score < 40) level = 'weak'
    else if (score < 60) level = 'fair'
    else if (score < 80) level = 'good'
    else level = 'strong'

    return { score, level, feedback }
  }

  public generateSecurePassword(length = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const allChars = lowercase + uppercase + numbers + specialChars
    
    // Ensure at least one character from each required set
    let password = ''
    password += this.getRandomChar(lowercase)
    password += this.getRandomChar(uppercase)
    password += this.getRandomChar(numbers)
    password += this.getRandomChar(specialChars)
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars)
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  public getPasswordRequirements(): PasswordRequirements {
    return { ...this.requirements }
  }

  public async changePassword(userId: UniqueEntityID, newPassword: string): Promise<Result<void>> {
    try {
      const validation = this.validate(newPassword)
      if (validation.isFailure) {
        return validation
      }

      await this.hash(newPassword, userId)
      return Result.ok<void>()
    } catch (error) {
      console.error('Change password error:', error)
      return Result.fail<void>('Failed to change password')
    }
  }

  public async isPasswordExpired(userId: UniqueEntityID, maxDays = 90): Promise<boolean> {
    // In a real implementation, this would check the password creation/change date
    // For now, we'll return false
    return false
  }

  private getRandomChar(charset: string): string {
    const randomIndex = Math.floor(Math.random() * charset.length)
    const char = charset.charAt(randomIndex)
    return char || charset.charAt(0)
  }

  private hasSequentialChars(password: string): boolean {
    const sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', '9876543210', 'zyxwvutsrqponmlkjihgfedcba']
    
    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const substr = sequence.substring(i, i + 3)
        if (password.toLowerCase().includes(substr)) {
          return true
        }
      }
    }
    
    return false
  }

  private hasRepeatedChars(password: string): boolean {
    let consecutiveCount = 1
    let maxConsecutive = 1
    
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        consecutiveCount++
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount)
      } else {
        consecutiveCount = 1
      }
    }
    
    return maxConsecutive > 2
  }
}