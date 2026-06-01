import { Clock3, Code2, MessagesSquare, RefreshCw, type LucideIcon } from 'lucide-react'
import { ctas, homeCopy } from '@/content/marketing/site'
import { marketingRoutes } from '@/content/marketing/routes'
import type { Locale } from '@/content/marketing/types'
import { HeroCloudBackground } from './HeroCloudBackground'
import { MarketingButton } from './MarketingButton'
import { PhoneDemo } from './PhoneDemo'

interface HomeHeroProps {
  locale: Locale
}

interface HeroMetricCard {
  icon: LucideIcon
  kicker: string
  value: string
  label: string
}

type HomeHeroCopy = {
  eyebrow: string
  secondaryCta: string
  animatedLead: string
  animatedItems: string[]
  animatedFull: string
  cards: HeroMetricCard[]
}

const copy: Record<Locale, HomeHeroCopy> = {
  ru: {
    eyebrow: 'Dokonly для Telegram-продаж',
    secondaryCta: 'Посмотреть демо',
    animatedLead: 'Dokonly помогает продавцам',
    animatedItems: ['принимать заказы', 'показывать каталог', 'возвращать покупателей', 'управлять клиентами'],
    animatedFull: 'Dokonly помогает продавцам принимать заказы, показывать каталог, возвращать покупателей и управлять клиентами прямо в Telegram.',
    cards: [
      { icon: Clock3, kicker: 'Запуск', value: '10 минут', label: 'магазин готов без долгой разработки' },
      { icon: Code2, kicker: 'Настройка', value: 'Без кода', label: 'товары и сценарии меняются продавцом' },
      { icon: MessagesSquare, kicker: 'Покупка', value: 'Меньше переписки', label: 'вопросы уходят в понятный путь заказа' },
      { icon: RefreshCw, kicker: 'Возврат', value: 'Клиент возвращается', label: 'промокоды, корзины и история после заказа' },
    ],
  },
  uz: {
    eyebrow: 'Telegram savdosi uchun Dokonly',
    secondaryCta: 'Namunani ko‘rish',
    animatedLead: 'Dokonly sotuvchilarga yordam beradi',
    animatedItems: ['buyurtmalar qabul qilishga', 'katalog ko‘rsatishga', 'xaridorlarni qaytarishga', 'mijozlarni boshqarishga'],
    animatedFull: 'Dokonly sotuvchilarga buyurtmalar qabul qilish, katalog ko‘rsatish, xaridorlarni qaytarish va mijozlarni Telegram ichida boshqarishga yordam beradi.',
    cards: [
      { icon: Clock3, kicker: 'Boshlash', value: '10 daqiqa', label: 'do‘kon uzoq ishlab chiqishsiz tayyor' },
      { icon: Code2, kicker: 'Sozlash', value: 'Kodsiz', label: 'tovar va ssenariylarni sotuvchi o‘zi o‘zgartiradi' },
      { icon: MessagesSquare, kicker: 'Xarid yo‘li', value: 'Kamroq yozishma', label: 'savollar aniq buyurtma jarayoniga o‘tadi' },
      { icon: RefreshCw, kicker: 'Qaytish', value: 'Mijoz qaytadi', label: 'promokod, savat va tarix xariddan keyin ishlaydi' },
    ],
  },
}

function HeroFloatingCard({
  card,
  className,
  animationClass,
}: {
  card: HeroMetricCard
  className: string
  animationClass: string
}) {
  const Icon = card.icon

  return (
    <div className={`hero-float-card ${animationClass} pointer-events-none absolute z-20 hidden rounded-3xl border border-white/70 bg-white/82 p-5 text-left shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur lg:block ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_12px_28px_rgba(0,121,92,0.24)]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{card.kicker}</p>
          <p className="mt-2 text-2xl font-black leading-tight text-slate-950">{card.value}</p>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">{card.label}</p>
        </div>
      </div>
    </div>
  )
}

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
          <HeroFloatingCard card={text.cards[0]} animationClass="hero-float-card-1" className="left-[4%] top-[24%] w-[250px] -rotate-3" />
          <HeroFloatingCard card={text.cards[2]} animationClass="hero-float-card-2" className="right-[4%] top-[20%] w-[250px] rotate-2" />
          <HeroFloatingCard card={text.cards[1]} animationClass="hero-float-card-3" className="bottom-[18%] left-[12%] w-[250px] rotate-2" />
          <HeroFloatingCard card={text.cards[3]} animationClass="hero-float-card-4" className="bottom-[22%] right-[12%] w-[270px] -rotate-2" />

          <PhoneDemo locale={locale} mode="mockup" />
        </div>
      </div>
    </section>
  )
}
