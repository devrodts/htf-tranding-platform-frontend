/**
 * Home Page - Landing page with authentication check
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Home | HFT Trading Platform',
  description: 'High-frequency trading platform with enterprise-grade architecture',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">HFT Platform</span>
          </div>
          <nav className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            High-Frequency
            <span className="text-primary block">Trading Platform</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Enterprise-grade trading platform built with Next.js 15, featuring real-time market data, 
            algorithmic trading, and comprehensive risk management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                Launch Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ultra-Fast Execution</h3>
            <p className="text-muted-foreground">
              Sub-millisecond order execution with advanced routing algorithms and low-latency infrastructure.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Analytics</h3>
            <p className="text-muted-foreground">
              Advanced charting, market data visualization, and comprehensive portfolio analytics.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Risk Management</h3>
            <p className="text-muted-foreground">
              Sophisticated risk controls, position monitoring, and automated compliance systems.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-8">Built with Modern Technology</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="p-4 rounded-lg border bg-card">
              <div className="font-semibold">Next.js 15</div>
              <div className="text-sm text-muted-foreground">React Framework</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="font-semibold">TypeScript</div>
              <div className="text-sm text-muted-foreground">Type Safety</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="font-semibold">Zustand</div>
              <div className="text-sm text-muted-foreground">State Management</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="font-semibold">TailwindCSS</div>
              <div className="text-sm text-muted-foreground">Styling</div>
            </div>
          </div>
        </div>

        {/* Demo Access */}
        <div className="mt-16 text-center p-8 rounded-lg border bg-muted/50">
          <h3 className="text-2xl font-bold mb-4">Try the Demo</h3>
          <p className="text-muted-foreground mb-6">
            Experience the platform with our demo accounts - no registration required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button variant="outline" className="w-full sm:w-auto">
                Admin Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full sm:w-auto">
                Trader Demo
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Use admin@trading.com/admin or trader@trading.com/trader
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 HFT Trading Platform. Built for demonstration purposes.</p>
        </div>
      </footer>
    </div>
  )
}