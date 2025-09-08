/**
 * Register Form Component - User registration form with validation
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Separator } from '@/components/ui/Separator'
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RegisterFormProps {
  redirectTo?: string
  onSuccess?: () => void
  className?: string
}

interface FormErrors {
  username?: string
  email?: string
  password?: string
  confirmPassword?: string
  firstName?: string
  lastName?: string
  phone?: string
}

interface FormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  phone: string
  acceptTerms: boolean
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  redirectTo = '/login',
  onSuccess,
  className
}) => {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuth()

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    acceptTerms: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores'
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters long'
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters long'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else {
      const passwordValidation = validatePassword(formData.password)
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0] // Show first error
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Phone validation (optional)
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'acceptTerms' ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear global error
    if (error) {
      clearError()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!formData.acceptTerms) {
      setFormErrors({ acceptTerms: 'You must accept the terms and conditions' } as any)
      return
    }

    const result = await register({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      ...(formData.phone && { phone: formData.phone.trim() })
    })

    if (result.success) {
      setRegistrationSuccess(true)
      onSuccess?.()
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(redirectTo)
      }, 2000)
    }
  }

  if (registrationSuccess) {
    return (
      <Card className={cn('w-full max-w-md mx-auto', className)}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Registration Successful!
          </CardTitle>
          <CardDescription>
            Your account has been created successfully. Redirecting to login page...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>
          Join the HFT Trading Platform and start trading
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Global Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium leading-none">
              Username *
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleInputChange('username')}
              className={formErrors.username ? 'border-destructive' : ''}
              disabled={isLoading}
              autoComplete="username"
            />
            {formErrors.username && (
              <p className="text-sm text-destructive">{formErrors.username}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              Email Address *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange('email')}
              className={formErrors.email ? 'border-destructive' : ''}
              disabled={isLoading}
              autoComplete="email"
            />
            {formErrors.email && (
              <p className="text-sm text-destructive">{formErrors.email}</p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium leading-none">
                First Name *
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                className={formErrors.firstName ? 'border-destructive' : ''}
                disabled={isLoading}
                autoComplete="given-name"
              />
              {formErrors.firstName && (
                <p className="text-sm text-destructive">{formErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium leading-none">
                Last Name *
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                className={formErrors.lastName ? 'border-destructive' : ''}
                disabled={isLoading}
                autoComplete="family-name"
              />
              {formErrors.lastName && (
                <p className="text-sm text-destructive">{formErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Phone Field (Optional) */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium leading-none">
              Phone Number (Optional)
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              className={formErrors.phone ? 'border-destructive' : ''}
              disabled={isLoading}
              autoComplete="tel"
            />
            {formErrors.phone && (
              <p className="text-sm text-destructive">{formErrors.phone}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none">
              Password *
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange('password')}
                className={cn(
                  'pr-10',
                  formErrors.password ? 'border-destructive' : ''
                )}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {formErrors.password && (
              <p className="text-sm text-destructive">{formErrors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
              Confirm Password *
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={cn(
                  'pr-10',
                  formErrors.confirmPassword ? 'border-destructive' : ''
                )}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {formErrors.confirmPassword && (
              <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-2">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={handleInputChange('acceptTerms')}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5"
              disabled={isLoading}
            />
            <label htmlFor="acceptTerms" className="text-sm leading-relaxed">
              I accept the{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  // Terms and conditions modal would go here
                  console.log('Terms and conditions clicked')
                }}
              >
                Terms and Conditions
              </button>{' '}
              and{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  // Privacy policy modal would go here
                  console.log('Privacy policy clicked')
                }}
              >
                Privacy Policy
              </button>
            </label>
          </div>

          {/* Create Account Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <Separator className="mb-4" />
        <div className="text-sm text-muted-foreground text-center">
          Already have an account?{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => router.push('/login')}
          >
            Sign in here
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default RegisterForm