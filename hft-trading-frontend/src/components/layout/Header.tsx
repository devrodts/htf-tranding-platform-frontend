/**
 * Header - Top navigation header with user controls
 */

'use client'

import React, { useState } from 'react'
import { useTheme } from 'next-themes'
import { 
  Menu, 
  Sun, 
  Moon, 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User,
  ChevronDown,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { useAuth, useConnectionStatus } from '@/hooks/useAuth'
import { useMarketDataStore } from '@/store/marketDataStore'
import { cn } from '@/lib/utils'
import { User as UserEntity } from '@/auth/domain/entities/User'

interface HeaderProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
  user: UserEntity | null
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  sidebarOpen, 
  user 
}) => {
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()
  const { connectionStatus } = useMarketDataStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'connecting': case 'reconnecting': return 'text-yellow-500'
      case 'disconnected': case 'failed': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getConnectionStatusIcon = () => {
    if (connectionStatus === 'connected') {
      return <Wifi className="w-4 h-4" />
    }
    return <WifiOff className="w-4 h-4" />
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Search */}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search symbols, orders..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Symbol Selector */}
        <Select defaultValue="AAPL">
          <SelectTrigger className="w-32 hidden lg:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AAPL">AAPL</SelectItem>
            <SelectItem value="GOOGL">GOOGL</SelectItem>
            <SelectItem value="MSFT">MSFT</SelectItem>
            <SelectItem value="TSLA">TSLA</SelectItem>
            <SelectItem value="NVDA">NVDA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Connection Status */}
        <div className={cn(
          'flex items-center space-x-2 px-2 py-1 rounded-md text-xs font-medium',
          getConnectionStatusColor()
        )}>
          {getConnectionStatusIcon()}
          <span className="hidden md:inline capitalize">
            {connectionStatus}
          </span>
        </div>

        {/* Market Status */}
        <Badge variant="secondary" className="hidden md:inline-flex">
          <Activity className="w-3 h-3 mr-1" />
          Market Open
        </Badge>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
          >
            3
          </Badge>
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User Menu */}
        {user && (
          <Dialog open={showUserMenu} onOpenChange={setShowUserMenu}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 pl-2 pr-1">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user.firstName}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>User Menu</DialogTitle>
                <DialogDescription>
                  Manage your account and preferences
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <hr />
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </header>
  )
}