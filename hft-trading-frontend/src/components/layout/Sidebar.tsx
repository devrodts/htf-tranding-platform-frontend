/**
 * Sidebar - Navigation sidebar for the trading platform
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  TrendingUp, 
  Briefcase, 
  Settings, 
  Shield, 
  Users, 
  Activity,
  PieChart,
  DollarSign,
  AlertTriangle,
  BookOpen,
  Bot,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/useAuth'
import { User } from '@/auth/domain/entities/User'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  permission?: { resource: string; action: string }
  role?: string
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Monitor,
  },
  {
    title: 'Trading',
    href: '/trading',
    icon: TrendingUp,
    permission: { resource: 'trading', action: 'execute' }
  },
  {
    title: 'Portfolio',
    href: '/portfolio',
    icon: Briefcase,
    permission: { resource: 'portfolio', action: 'read' }
  },
  {
    title: 'Market Data',
    href: '/market-data',
    icon: BarChart3,
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: Activity,
    permission: { resource: 'trading', action: 'read' }
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: PieChart,
    permission: { resource: 'analytics', action: 'read' }
  },
  {
    title: 'P&L',
    href: '/pnl',
    icon: DollarSign,
    permission: { resource: 'portfolio', action: 'read' }
  },
  {
    title: 'Risk Management',
    href: '/risk',
    icon: AlertTriangle,
    permission: { resource: 'risk', action: 'read' }
  },
  {
    title: 'Strategies',
    href: '/strategies',
    icon: Bot,
    permission: { resource: 'strategies', action: 'read' }
  },
  {
    title: 'Research',
    href: '/research',
    icon: BookOpen,
  }
]

const adminNavigation: NavItem[] = [
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    role: 'ADMIN'
  },
  {
    title: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
    role: 'ADMIN'
  },
  {
    title: 'Compliance',
    href: '/admin/compliance',
    icon: Shield,
    role: 'ADMIN'
  }
]

export const Sidebar: React.FC<SidebarProps> = ({ open, onOpenChange, user }) => {
  const pathname = usePathname()
  const { hasPermission } = usePermissions()

  const isNavItemVisible = (item: NavItem): boolean => {
    if (item.role && user?.role !== item.role) {
      return false
    }
    if (item.permission && !hasPermission(item.permission.resource, item.permission.action)) {
      return false
    }
    return true
  }

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const NavLink: React.FC<{ item: NavItem }> = ({ item }) => (
    <Link href={item.href} key={item.href}>
      <Button
        variant={isActive(item.href) ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start h-10',
          isActive(item.href) && 'bg-secondary shadow-sm',
          !open && 'px-2'
        )}
      >
        <item.icon className={cn('h-4 w-4', open ? 'mr-2' : '')} />
        {open && (
          <>
            <span className="truncate">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    </Link>
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-background border-r transition-all duration-300',
          open ? 'w-64' : 'w-16',
          'lg:relative lg:translate-x-0',
          !open && 'lg:translate-x-0',
          !open && 'translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-center px-4 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            {open && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold">HFT Platform</span>
                <span className="text-xs text-muted-foreground">Trading</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-auto py-4">
          <div className="space-y-1 px-3">
            {/* Main Navigation */}
            {navigation.filter(isNavItemVisible).map((item) => (
              <NavLink key={item.href} item={item} />
            ))}

            {/* Admin Navigation */}
            {adminNavigation.filter(isNavItemVisible).length > 0 && (
              <>
                <div className="py-2">
                  <Separator />
                </div>
                {open && (
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Administration
                    </p>
                  </div>
                )}
                {adminNavigation.filter(isNavItemVisible).map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* User Info */}
        {open && user && (
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}