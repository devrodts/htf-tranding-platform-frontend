/**
 * Login Page - Authentication page for the trading platform
 */

import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In | HFT Trading Platform',
  description: 'Sign in to your high-frequency trading account',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <div className="text-2xl font-bold text-primary-foreground">HFT</div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Platform</h1>
          <p className="text-muted-foreground mt-2">
            High-frequency trading made simple
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          © 2024 HFT Trading Platform. All rights reserved.
        </p>
      </footer>
    </div>
  )
}