/**
 * Root Layout - Main app layout with providers
 */

import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
// @ts-ignore
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from '@/components/ui/Toaster'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'HFT Trading Platform',
    template: '%s | HFT Trading Platform',
  },
  description: 'High-Frequency Trading Platform - Next.js 15 with enterprise-grade architecture',
  keywords: ['trading', 'HFT', 'high-frequency', 'algorithmic', 'fintech', 'market data'],
  authors: [{ name: 'HFT Trading Team' }],
  creator: 'HFT Trading Platform',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hft-trading.com',
    title: 'HFT Trading Platform',
    description: 'Professional high-frequency trading platform',
    siteName: 'HFT Trading Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HFT Trading Platform',
    description: 'Professional high-frequency trading platform',
    creator: '@hfttrading',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    ],
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}