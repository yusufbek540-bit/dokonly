import type { ReactNode } from 'react'
import type { Locale, LocalizedRoute } from '@/content/marketing/types'
import { MarketingFooter } from './MarketingFooter'
import { MarketingHeader } from './MarketingHeader'

interface MarketingLayoutProps {
  locale: Locale
  currentRoute: LocalizedRoute
  children: ReactNode
}

export function MarketingLayout({ locale, currentRoute, children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-950">
      <MarketingHeader locale={locale} currentRoute={currentRoute} />
      <main>{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  )
}
