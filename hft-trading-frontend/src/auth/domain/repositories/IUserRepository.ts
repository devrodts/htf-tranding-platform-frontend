/**
 * User Repository Interface - Domain contract for user persistence
 */

import { Result } from '@/shared/domain/Result'
import { UniqueEntityID } from '@/shared/domain/Entity'
import { User, Email, Username } from '../entities/User'

export interface UserSearchCriteria {
  email?: string
  username?: string
  role?: string
  status?: string
  createdAfter?: Date
  createdBefore?: Date
  lastLoginAfter?: Date
  lastLoginBefore?: Date
  limit?: number
  offset?: number
}

export interface UserRepository {
  save(user: User): Promise<Result<void>>
  findById(id: UniqueEntityID): Promise<Result<User | null>>
  findByEmail(email: Email): Promise<Result<User | null>>
  findByUsername(username: Username): Promise<Result<User | null>>
  findByEmailOrUsername(emailOrUsername: string): Promise<Result<User | null>>
  search(criteria: UserSearchCriteria): Promise<Result<User[]>>
  count(criteria?: Partial<UserSearchCriteria>): Promise<Result<number>>
  delete(id: UniqueEntityID): Promise<Result<void>>
  exists(email: Email): Promise<Result<boolean>>
  existsByUsername(username: Username): Promise<Result<boolean>>
  getAllActive(): Promise<Result<User[]>>
  getByRole(role: string): Promise<Result<User[]>>
  updateLastLogin(id: UniqueEntityID): Promise<Result<void>>
}