import Link from 'next/link'
import type { Locale } from '@/content/marketing/types'
import { ctas, navigation } from '@/content/marketing/site'
import { routeFor } from '@/lib/marketing/i18n'
import { MarketingButton } from './MarketingButton'

interface MarketingFooterProps {
  locale: Locale
}

const footerCopy = {
  ru: {
    tagline: 'Telegram-магазины для продавцов, которым нужны каталог, заказы и CRM без разработки.',
    navigation: 'Навигация',
    cta: 'Запустить продажи в Telegram',
    rights: 'Все права защищены.',
  },
  uz: {
    tagline: 'Katalog, buyurtmalar va CRM kerak bo‘lgan sotuvchilar uchun Telegram do‘konlar.',
    navigation: 'Navigatsiya',
    cta: 'Telegram’da savdoni boshlang',
    rights: 'Barcha huquqlar himoyalangan.',
  },
}

export function MarketingFooter({ locale }: MarketingFooterProps) {
  const copy = footerCopy[locale]

  return (
    <footer className="border-t border-slate-200 bg-white pb-24 md:pb-0">
      <div className="marketing-shell grid gap-10 py-12 md:grid-cols-[1.1fr_1fr_1fr]">
        <div>
          <Link href={routeFor(navigation[0].href, locale)} className="text-lg font-bold text-gray-950">
            Dokonly
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-gray-600">{copy.tagline}</p>
        </div>

        <nav aria-label={copy.navigation}>
          <h2 className="text-sm font-semibold text-gray-950">{copy.navigation}</h2>
          <div className="mt-4 grid gap-3">
            {navigation.map((item) => (
              <Link key={item.label.ru} href={routeFor(item.href, locale)} className="text-sm font-medium text-gray-600 hover:text-gray-950">
                {item.label[locale]}
              </Link>
            ))}
          </div>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-gray-950">{copy.cta}</h2>
          <div className="mt-4">
            <MarketingButton href={routeFor(ctas.createStore.href, locale)}>{ctas.createStore.label[locale]}</MarketingButton>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="marketing-shell py-5 text-sm text-gray-500">
          © {new Date().getFullYear()} Dokonly. {copy.rights}
        </div>
      </div>
    </footer>
  )
}
