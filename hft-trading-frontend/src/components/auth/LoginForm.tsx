/**
 * Login Form Component - Modern authentication form with validation
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
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  redirectTo?: string
  onSuccess?: () => void
  className?: string
}

interface FormErrors {
  emailOrUsername?: string
  password?: string
  twoFactorCode?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({
  redirectTo = '/dashboard',
  onSuccess,
  className
}) => {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    twoFactorCode: '',
    rememberMe: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.emailOrUsername.trim()) {
      errors.emailOrUsername = 'Email or username is required'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    }

    if (showTwoFactor && !formData.twoFactorCode.trim()) {
      errors.twoFactorCode = 'Two-factor authentication code is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value
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

    const result = await login({
      emailOrUsername: formData.emailOrUsername.trim(),
      password: formData.password,
      twoFactorCode: formData.twoFactorCode || undefined,
      rememberMe: formData.rememberMe
    })

    if (result.success) {
      onSuccess?.()
      router.push(redirectTo)
    } else if (result.error?.includes('Two-factor authentication code required')) {
      setShowTwoFactor(true)
    }
  }

  const handleDemoLogin = async (userType: 'admin' | 'trader') => {
    setFormData({
      emailOrUsername: userType === 'admin' ? 'admin@trading.com' : 'trader@trading.com',
      password: userType,
      twoFactorCode: '',
      rememberMe: false
    })

    const result = await login({
      emailOrUsername: userType === 'admin' ? 'admin@trading.com' : 'trader@trading.com',
      password: userType,
      rememberMe: false
    })

    if (result.success) {
      onSuccess?.()
      router.push(redirectTo)
    }
  }

  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your trading account
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

          {/* Email/Username Field */}
          <div className="space-y-2">
            <label htmlFor="emailOrUsername" className="text-sm font-medium leading-none">
              Email or Username
            </label>
            <Input
              id="emailOrUsername"
              type="text"
              placeholder="Enter your email or username"
              value={formData.emailOrUsername}
              onChange={handleInputChange('emailOrUsername')}
              className={formErrors.emailOrUsername ? 'border-destructive' : ''}
              disabled={isLoading}
              autoComplete="username"
            />
            {formErrors.emailOrUsername && (
              <p className="text-sm text-destructive">{formErrors.emailOrUsername}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange('password')}
                className={cn(
                  'pr-10',
                  formErrors.password ? 'border-destructive' : ''
                )}
                disabled={isLoading}
                autoComplete="current-password"
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

          {/* Two-Factor Code Field */}
          {showTwoFactor && (
            <div className="space-y-2">
              <label htmlFor="twoFactorCode" className="text-sm font-medium leading-none">
                Two-Factor Authentication Code
              </label>
              <Input
                id="twoFactorCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={formData.twoFactorCode}
                onChange={handleInputChange('twoFactorCode')}
                className={formErrors.twoFactorCode ? 'border-destructive' : ''}
                disabled={isLoading}
                maxLength={6}
                autoComplete="one-time-code"
              />
              {formErrors.twoFactorCode && (
                <p className="text-sm text-destructive">{formErrors.twoFactorCode}</p>
              )}
            </div>
          )}

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              id="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleInputChange('rememberMe')}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="text-sm font-medium leading-none">
              Keep me signed in
            </label>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Demo Login Section */}
        <div className="mt-6">
          <Separator className="mb-4" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="text-xs"
              >
                Admin Demo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('trader')}
                disabled={isLoading}
                className="text-xs"
              >
                Trader Demo
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              // Forgot password functionality would go here
              console.log('Forgot password clicked')
            }}
          >
            Forgot your password?
          </button>
        </div>
        <div className="text-sm text-muted-foreground text-center">
          Don't have an account?{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              // Navigate to register page
              router.push('/register')
            }}
          >
            Sign up here
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default LoginForm