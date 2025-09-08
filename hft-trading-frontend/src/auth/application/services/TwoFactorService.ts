/**
 * Two-Factor Authentication Service
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import * as crypto from 'crypto'

export interface TwoFactorSecret {
  secret: string
  backupCodes: string[]
  qrCode: string
}

export interface TwoFactorConfig {
  issuer: string
  digits: number
  period: number
  window: number
}

export class TwoFactorService {
  private readonly secrets: Map<string, string> = new Map() // In-memory store for demo
  private readonly backupCodes: Map<string, Set<string>> = new Map()
  private readonly usedCodes: Map<string, Set<string>> = new Map()

  private readonly config: TwoFactorConfig = {
    issuer: 'Trading Platform',
    digits: 6,
    period: 30,
    window: 1 // Allow 1 time step tolerance
  }

  public async generateSecret(userId: UniqueEntityID, email: string): Promise<Result<TwoFactorSecret>> {
    try {
      // Generate a random secret
      const secret = this.generateRandomSecret()
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes()
      
      // Create QR code URL
      const qrCode = this.generateQRCodeUrl(email, secret)
      
      // Store secret and backup codes (in production, encrypt these)
      this.secrets.set(userId.toString(), secret)
      this.backupCodes.set(userId.toString(), new Set(backupCodes))
      this.usedCodes.set(userId.toString(), new Set())

      return Result.ok<TwoFactorSecret>({
        secret,
        backupCodes,
        qrCode
      })
    } catch (error) {
      console.error('Generate 2FA secret error:', error)
      return Result.fail<TwoFactorSecret>('Failed to generate two-factor secret')
    }
  }

  public async verify(userId: UniqueEntityID, code: string): Promise<boolean> {
    try {
      const userIdStr = userId.toString()
      const secret = this.secrets.get(userIdStr)
      
      if (!secret) {
        return false
      }

      // Check if it's a backup code
      const userBackupCodes = this.backupCodes.get(userIdStr)
      const userUsedCodes = this.usedCodes.get(userIdStr) || new Set()
      
      if (userBackupCodes && userBackupCodes.has(code)) {
        if (userUsedCodes.has(code)) {
          return false // Backup code already used
        }
        
        // Mark backup code as used
        userUsedCodes.add(code)
        userBackupCodes.delete(code)
        
        return true
      }

      // Verify TOTP code
      return this.verifyTOTP(secret, code)
    } catch (error) {
      console.error('2FA verification error:', error)
      return false
    }
  }

  public async disable(userId: UniqueEntityID): Promise<Result<void>> {
    try {
      const userIdStr = userId.toString()
      
      this.secrets.delete(userIdStr)
      this.backupCodes.delete(userIdStr)
      this.usedCodes.delete(userIdStr)
      
      return Result.ok<void>()
    } catch (error) {
      console.error('Disable 2FA error:', error)
      return Result.fail<void>('Failed to disable two-factor authentication')
    }
  }

  public async regenerateBackupCodes(userId: UniqueEntityID): Promise<Result<string[]>> {
    try {
      const userIdStr = userId.toString()
      
      if (!this.secrets.has(userIdStr)) {
        return Result.fail<string[]>('Two-factor authentication is not enabled')
      }

      const newBackupCodes = this.generateBackupCodes()
      this.backupCodes.set(userIdStr, new Set(newBackupCodes))
      
      // Clear used codes since we have new backup codes
      this.usedCodes.set(userIdStr, new Set())
      
      return Result.ok<string[]>(newBackupCodes)
    } catch (error) {
      console.error('Regenerate backup codes error:', error)
      return Result.fail<string[]>('Failed to regenerate backup codes')
    }
  }

  public getBackupCodesRemaining(userId: UniqueEntityID): number {
    const userBackupCodes = this.backupCodes.get(userId.toString())
    return userBackupCodes ? userBackupCodes.size : 0
  }

  public isEnabled(userId: UniqueEntityID): boolean {
    return this.secrets.has(userId.toString())
  }

  private generateRandomSecret(): string {
    // Generate a 32-character base32 secret
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''
    
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return secret
  }

  private generateBackupCodes(count = 8): string[] {
    const codes: string[] = []
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character backup codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      codes.push(code)
    }
    
    return codes
  }

  private generateQRCodeUrl(email: string, secret: string): string {
    const encodedIssuer = encodeURIComponent(this.config.issuer)
    const encodedEmail = encodeURIComponent(email)
    const encodedSecret = encodeURIComponent(secret)
    
    const otpAuthUrl = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${encodedSecret}&issuer=${encodedIssuer}&digits=${this.config.digits}&period=${this.config.period}`
    
    // Return Google Charts QR code URL (in production, use a proper QR code library)
    return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`
  }

  private verifyTOTP(secret: string, token: string): boolean {
    const currentTime = Math.floor(Date.now() / 1000)
    const timeStep = Math.floor(currentTime / this.config.period)
    
    // Check current time step and adjacent ones (for time sync tolerance)
    for (let i = -this.config.window; i <= this.config.window; i++) {
      const testTimeStep = timeStep + i
      const expectedToken = this.generateTOTP(secret, testTimeStep)
      
      if (this.constantTimeCompare(token, expectedToken)) {
        return true
      }
    }
    
    return false
  }

  private generateTOTP(secret: string, timeStep: number): string {
    // Convert base32 secret to buffer
    const secretBuffer = this.base32Decode(secret)
    
    // Create time-based counter
    const counter = Buffer.allocUnsafe(8)
    counter.fill(0)
    counter.writeUInt32BE(timeStep, 4)
    
    // Generate HMAC
    const hmac = crypto.createHmac('sha1', secretBuffer)
    hmac.update(counter)
    const digest = hmac.digest()
    
    // Dynamic truncation
    const lastByte = digest[digest.length - 1]
    const offset = (lastByte || 0) & 0x0f
    const code = (digest.readUInt32BE(offset) & 0x7fffffff) % Math.pow(10, this.config.digits)
    
    return code.toString().padStart(this.config.digits, '0')
  }

  private base32Decode(encoded: string): Buffer {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let bits = 0
    let value = 0
    let output = []
    
    for (let i = 0; i < encoded.length; i++) {
      const char = encoded.charAt(i)
      const charValue = base32Chars.indexOf(char.toUpperCase())
      
      if (charValue === -1) {
        continue // Skip invalid characters
      }
      
      value = (value << 5) | charValue
      bits += 5
      
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255)
        bits -= 8
      }
    }
    
    return Buffer.from(output)
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }

  public async sendSMSCode(userId: UniqueEntityID, phoneNumber: string): Promise<Result<void>> {
    try {
      // Generate 6-digit SMS code
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store code with expiration (5 minutes)
      const expiration = Date.now() + (5 * 60 * 1000)
      const smsKey = `sms_${userId.toString()}`
      
      // In production, this would use a real SMS service
      console.log(`SMS Code for ${phoneNumber}: ${code} (expires in 5 minutes)`)
      
      // Store in memory (in production, use Redis or similar)
      this.usedCodes.set(smsKey, new Set([`${code}:${expiration}`]))
      
      return Result.ok<void>()
    } catch (error) {
      console.error('Send SMS code error:', error)
      return Result.fail<void>('Failed to send SMS code')
    }
  }

  public async verifySMSCode(userId: UniqueEntityID, code: string): Promise<boolean> {
    try {
      const smsKey = `sms_${userId.toString()}`
      const storedCodes = this.usedCodes.get(smsKey)
      
      if (!storedCodes) {
        return false
      }
      
      const currentTime = Date.now()
      
      for (const storedCode of storedCodes) {
        const [savedCode, expiration] = storedCode.split(':')
        
        if (savedCode === code && expiration && currentTime < parseInt(expiration)) {
          // Remove used code
          storedCodes.delete(storedCode)
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Verify SMS code error:', error)
      return false
    }
  }
}