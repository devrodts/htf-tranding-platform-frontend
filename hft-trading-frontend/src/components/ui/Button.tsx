/**
 * Button Component - Shadcn/ui style with advanced trading-specific variants
 */

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Trading specific variants
        buy: 'bg-bull-600 text-white shadow hover:bg-bull-700 focus-visible:ring-bull-500',
        sell: 'bg-bear-600 text-white shadow hover:bg-bear-700 focus-visible:ring-bear-500',
        cancel: 'bg-warning-600 text-white shadow hover:bg-warning-700 focus-visible:ring-warning-500',
        'buy-outline': 'border border-bull-600 text-bull-600 hover:bg-bull-50 hover:text-bull-700',
        'sell-outline': 'border border-bear-600 text-bear-600 hover:bg-bear-50 hover:text-bear-700',
        'trading-ghost': 'text-muted-foreground hover:bg-muted hover:text-foreground',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-10 w-10',
        'trading-xs': 'h-6 px-2 text-2xs',
        'trading-sm': 'h-7 px-3 text-xs',
      },
      animation: {
        none: '',
        pulse: 'animate-pulse',
        bounce: 'animate-bounce-subtle',
        glow: 'animate-glow',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  tooltip?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      animation,
      asChild = false,
      loading = false,
      loadingText,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    
    const isDisabled = disabled || loading

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, animation, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || 'Loading...'}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="mr-2">{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className="ml-2">{icon}</span>
            )}
          </>
        )}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }