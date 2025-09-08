/**
 * Badge Component - Shadcn/ui style with trading-specific variants
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        // Trading specific variants
        bull: 'border-transparent bg-bull-500 text-white shadow hover:bg-bull-600',
        bear: 'border-transparent bg-bear-500 text-white shadow hover:bg-bear-600',
        neutral: 'border-transparent bg-neutral-500 text-white shadow hover:bg-neutral-600',
        'bull-outline': 'border-bull-500 text-bull-600 hover:bg-bull-50',
        'bear-outline': 'border-bear-500 text-bear-600 hover:bg-bear-50',
        'status-new': 'border-transparent bg-blue-500 text-white shadow',
        'status-filled': 'border-transparent bg-bull-500 text-white shadow',
        'status-cancelled': 'border-transparent bg-neutral-500 text-white shadow',
        'status-rejected': 'border-transparent bg-bear-500 text-white shadow',
        'status-pending': 'border-transparent bg-warning-500 text-white shadow',
      },
      size: {
        default: 'text-xs',
        sm: 'text-2xs px-1.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }