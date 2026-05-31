import Link from 'next/link'
import type { ReactNode } from 'react'

interface MarketingButtonProps {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

const variantClass = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'bg-white text-gray-950 ring-1 ring-gray-200 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:text-gray-950 hover:bg-gray-100',
}

export function MarketingButton({ href, children, variant = 'primary', className = '' }: MarketingButtonProps) {
  const isExternal = href.startsWith('http')
  const classes = `inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition ${variantClass[variant]} ${className}`

  if (isExternal) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  )
}
