import { ArrowUpRight, CheckCircle2, Clock3, Code2, MessagesSquare, RefreshCw } from 'lucide-react'
import { ctas, homeCopy } from '@/content/marketing/site'
import { marketingRoutes } from '@/content/marketing/routes'
import type { Locale } from '@/content/marketing/types'
import { HeroCloudBackground } from './HeroCloudBackground'
import { MarketingButton } from './MarketingButton'
import { PhoneDemo } from './PhoneDemo'

interface HomeHeroProps {
  locale: Locale
}

const copy = {
  ru: {
    eyebrow: 'Dokonly для Telegram-продаж',
    secondaryCta: 'Посмотреть демо',
    animatedLead: 'Dokonly помогает продавцам',
    animatedItems: ['принимать заказы', 'показывать каталог', 'возвращать покупателей', 'управлять клиентами'],
    animatedFull: 'Dokonly помогает продавцам принимать заказы, показывать каталог, возвращать покупателей и управлять клиентами прямо в Telegram.',
    cards: [
      { icon: Clock3, value: '10 минут', label: 'запуск без долгой разработки' },
      { icon: Code2, value: 'Без кода', label: 'каталог, заказ и CRM в одном сценарии' },
      { icon: MessagesSquare, value: 'Меньше переписки', label: 'вопросы уходят в понятный путь покупки' },
      { icon: RefreshCw, value: 'Повторные продажи', label: 'промокоды, корзины и клиентская история' },
    ],
    badge: 'Каталог + заказ + CRM',
  },
  uz: {
    eyebrow: 'Telegram savdosi uchun Dokonly',
    secondaryCta: 'Namunani ko‘rish',
    animatedLead: 'Dokonly sotuvchilarga yordam beradi',
    animatedItems: ['buyurtmalar qabul qilishga', 'katalog ko‘rsatishga', 'xaridorlarni qaytarishga', 'mijozlarni boshqarishga'],
    animatedFull: 'Dokonly sotuvchilarga buyurtmalar qabul qilish, katalog ko‘rsatish, xaridorlarni qaytarish va mijozlarni Telegram ichida boshqarishga yordam beradi.',
    cards: [
      { icon: Clock3, value: '10 daqiqa', label: 'uzoq ishlab chiqishsiz start' },
      { icon: Code2, value: 'Kodsiz', label: 'katalog, buyurtma va CRM bitta ssenariyda' },
      { icon: MessagesSquare, value: 'Kamroq yozishma', label: 'savollar aniq xarid yo‘liga o‘tadi' },
      { icon: RefreshCw, value: 'Takroriy savdo', label: 'promokod, savat va mijoz tarixi' },
    ],
    badge: 'Katalog + buyurtma + CRM',
  },
} as const

export function HomeHero({ locale }: HomeHeroProps) {
  const text = copy[locale]

  return (
    <section className="relative z-10 overflow-hidden bg-[#68b8d7]">
      <HeroCloudBackground />
      <div className="marketing-shell relative z-10 flex min-h-[760px] flex-col items-center pt-10 text-center md:min-h-[820px] lg:min-h-[860px] lg:pt-14">
        <div className="relative mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-800">{text.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.01em] text-slate-950 sm:text-6xl lg:text-7xl">
            {homeCopy.hero.h1[locale]}
          </h1>
          <div className="hero-animated-copy mx-auto mt-5 max-w-3xl text-slate-700">
            <p className="sr-only">{text.animatedFull}</p>
            <div aria-hidden="true">
              <p className="text-base font-semibold leading-7 sm:text-lg">{text.animatedLead}</p>
              <div className="hero-rotator mt-1 text-2xl font-black leading-none text-slate-950 sm:text-3xl">
                {text.animatedItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href[locale]} className="min-w-[190px] shadow-[0_18px_36px_rgba(0,121,92,0.18)]">
              {ctas.createStore.label[locale]}
            </MarketingButton>
            <MarketingButton href={marketingRoutes.demo[locale]} variant="secondary" className="min-w-[170px] bg-white/90">
              {text.secondaryCta}
            </MarketingButton>
          </div>
        </div>

        <div className="relative mt-auto w-full pt-8">
          <div className="pointer-events-none absolute left-[4%] top-[24%] z-20 hidden w-[250px] -rotate-3 rounded-3xl border border-white/70 bg-white/82 p-5 text-left shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur lg:block">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-black uppercase tracking-[0.12em]">{text.badge}</span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-950">{text.cards[0].value}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{text.cards[0].label}</p>
          </div>

          <div className="pointer-events-none absolute right-[4%] top-[20%] z-20 hidden w-[220px] rotate-2 rounded-3xl border border-white/70 bg-white/82 p-5 text-left shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur lg:block">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-700">{text.cards[2].value}</p>
            <p className="mt-2 text-base font-bold leading-6 text-slate-700">{text.cards[2].label}</p>
          </div>

          <div className="pointer-events-none absolute bottom-[18%] left-[12%] z-20 hidden w-[210px] rotate-2 rounded-3xl border border-white/70 bg-white/82 p-5 text-left shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur lg:block">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-700">{text.cards[1].value}</p>
            <p className="mt-2 text-base font-bold leading-6 text-slate-700">{text.cards[1].label}</p>
          </div>

          <div className="pointer-events-none absolute bottom-[22%] right-[12%] z-20 hidden w-[250px] -rotate-2 rounded-3xl border border-white/70 bg-white/82 p-5 text-left shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <ArrowUpRight className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-black text-slate-950">{text.cards[3].value}</p>
                <p className="text-sm font-semibold leading-5 text-slate-600">{text.cards[3].label}</p>
              </div>
            </div>
          </div>

          <PhoneDemo locale={locale} mode="mockup" />
        </div>
      </div>
    </section>
  )
}
