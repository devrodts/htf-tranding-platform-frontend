/**
 * App Shell - Main layout component for authenticated app
 */

'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
}

export const AppShell: React.FC<AppShellProps> = ({ children, className }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className={cn('flex h-screen bg-background', className)}>
      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen} 
        onOpenChange={setSidebarOpen}
        user={user}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          user={user}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="h-full p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}