'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Locale, LocalizedRoute } from '@/content/marketing/types'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas, navigation } from '@/content/marketing/site'
import { oppositeLocale, routeFor } from '@/lib/marketing/i18n'
import { MarketingButton } from './MarketingButton'

interface MarketingHeaderProps {
  locale: Locale
  currentRoute: LocalizedRoute
}

const menuText = {
  ru: { open: 'Меню', close: 'Закрыть', ariaOpen: 'Открыть меню', ariaClose: 'Закрыть меню' },
  uz: { open: 'Menyu', close: 'Yopish', ariaOpen: 'Menyuni ochish', ariaClose: 'Menyuni yopish' },
}

export function MarketingHeader({ locale, currentRoute }: MarketingHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const switchLocale = oppositeLocale(locale)
  const switchHref = routeFor(currentRoute, switchLocale)
  const createStoreHref = routeFor(ctas.createStore.href, locale)
  const labels = menuText[locale]

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#f8faf9]/80 py-3 backdrop-blur">
        <div className="marketing-shell flex min-h-16 items-center justify-between gap-4 rounded-full border border-slate-200/90 bg-white/95 px-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur md:px-6">
          <Link href={routeFor(marketingRoutes.home, locale)} className="text-lg font-bold tracking-[0.01em] text-gray-950">
            Dokonly
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label={locale === 'ru' ? 'Основная навигация' : 'Asosiy navigatsiya'}>
            {navigation.map((item) => (
              <Link
                key={item.label.ru}
                href={routeFor(item.href, locale)}
                className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                {item.label[locale]}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href={switchHref}
              className="rounded-full px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
            >
              {switchLocale.toUpperCase()}
            </Link>
            <MarketingButton href={createStoreHref} className="rounded-full px-6">{ctas.createStore.label[locale]}</MarketingButton>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href={switchHref}
              className="rounded-full px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
            >
              {switchLocale.toUpperCase()}
            </Link>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-gray-950"
              aria-expanded={isOpen}
              aria-label={isOpen ? labels.ariaClose : labels.ariaOpen}
              onClick={() => setIsOpen((value) => !value)}
            >
              {isOpen ? labels.close : labels.open}
            </button>
          </div>
        </div>

        {isOpen ? (
          <nav className="md:hidden" aria-label={locale === 'ru' ? 'Мобильная навигация' : 'Mobil navigatsiya'}>
            <div className="marketing-shell mt-2 grid gap-1 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              {navigation.map((item) => (
                <Link
                  key={item.label.ru}
                  href={routeFor(item.href, locale)}
                  className="rounded-lg px-3 py-3 text-base font-semibold text-gray-800 transition hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label[locale]}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <MarketingButton href={createStoreHref} className="w-full">
          {ctas.createStore.label[locale]}
        </MarketingButton>
      </div>
    </>
  )
}
