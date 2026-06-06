'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import type { Locale } from '@/content/marketing/types'

interface PhoneDemoProps {
  locale: Locale
  mode?: 'interactive' | 'mockup'
  videoSrc?: string
  posterSrc?: string
}

const tabs = [
  {
    id: 'fashion',
    label: { ru: 'Одежда', uz: 'Kiyim' },
    product: { ru: 'Летнее платье', uz: 'Yozgi ko‘ylak' },
    detail: { ru: 'Размеры S-L, 3 цвета', uz: 'S-L o‘lcham, 3 rang' },
  },
  {
    id: 'beauty',
    label: { ru: 'Косметика', uz: 'Kosmetika' },
    product: { ru: 'Сыворотка для лица', uz: 'Yuz uchun serum' },
    detail: { ru: 'Для утреннего ухода', uz: 'Ertalabki parvarish uchun' },
  },
  {
    id: 'food',
    label: { ru: 'Еда', uz: 'Taom' },
    product: { ru: 'Набор круассанов', uz: 'Kruassan to‘plami' },
    detail: { ru: 'Предзаказ на завтра', uz: 'Ertaga oldindan buyurtma' },
  },
  {
    id: 'flowers',
    label: { ru: 'Цветы', uz: 'Gullar' },
    product: { ru: 'Букет роз', uz: 'Atirgul guldastasi' },
    detail: { ru: 'Доставка к событию', uz: 'Tadbirga yetkazib berish' },
  },
] as const

const states = [
  { ru: 'Каталог', uz: 'Katalog' },
  { ru: 'Товар', uz: 'Mahsulot' },
  { ru: 'Корзина', uz: 'Savat' },
  { ru: 'Оформление', uz: 'Rasmiylashtirish' },
  { ru: 'Заказ продавцу', uz: 'Sotuvchiga buyurtma' },
  { ru: 'CRM', uz: 'CRM' },
] as const

const copy = {
  header: { ru: 'Магазин в Telegram', uz: 'Telegram ichidagi do‘kon' },
  mockupAlt: { ru: 'Телефон с Telegram-магазином Dokonly', uz: 'Dokonly Telegram-do‘koni ko‘rsatilgan telefon' },
  demo: { ru: 'Живой демо', uz: 'Jonli demo' },
  categories: { ru: 'Категории', uz: 'Kategoriyalar' },
  price: { ru: 'от 120 000 сум', uz: '120 000 so‘mdan' },
  cart: { ru: 'В корзине 1 товар', uz: 'Savatda 1 mahsulot' },
  checkout: { ru: 'Имя, телефон и адрес доставки', uz: 'Ism, telefon va yetkazish manzili' },
  seller: { ru: 'Новый заказ пришел продавцу', uz: 'Yangi buyurtma sotuvchiga keldi' },
  crm: { ru: 'Клиент сохранен для повторной продажи', uz: 'Mijoz takroriy savdo uchun saqlandi' },
  next: { ru: 'Следующий шаг', uz: 'Keyingi qadam' },
  step: { ru: 'Шаг', uz: 'Bosqich' },
} as const

const productStyles = [
  {
    bg: 'from-rose-50 via-white to-emerald-50',
    rail: 'bg-rose-300',
    block: 'bg-emerald-600',
    accent: 'bg-amber-300',
  },
  {
    bg: 'from-pink-50 via-white to-lime-50',
    rail: 'bg-pink-300',
    block: 'bg-lime-500',
    accent: 'bg-slate-300',
  },
  {
    bg: 'from-amber-50 via-white to-orange-50',
    rail: 'bg-amber-300',
    block: 'bg-orange-500',
    accent: 'bg-emerald-500',
  },
  {
    bg: 'from-fuchsia-50 via-white to-emerald-50',
    rail: 'bg-fuchsia-300',
    block: 'bg-emerald-600',
    accent: 'bg-rose-300',
  },
] as const

export function PhoneDemo({ locale, mode = 'interactive', posterSrc, videoSrc }: PhoneDemoProps) {
  const isMockup = mode === 'mockup'
  const [activeTab, setActiveTab] = useState(0)
  const [activeState, setActiveState] = useState(0)
  const tab = tabs[activeTab]
  const state = states[activeState]
  const productStyle = productStyles[activeTab]

  const stateText = useMemo(() => {
    switch (activeState) {
      case 0:
        return copy.categories[locale]
      case 1:
        return tab.detail[locale]
      case 2:
        return copy.cart[locale]
      case 3:
        return copy.checkout[locale]
      case 4:
        return copy.seller[locale]
      default:
        return copy.crm[locale]
    }
  }, [activeState, locale, tab])

  return (
    <section
      className={`relative mx-auto w-full ${isMockup ? 'max-w-[330px] sm:max-w-[440px] lg:max-w-[520px]' : 'max-w-[300px] sm:max-w-[420px] lg:max-w-[480px]'}`}
      aria-label={copy.header[locale]}
    >
      <div className={`relative ${isMockup ? 'aspect-[56/59]' : 'aspect-[2/3]'}`}>
        <Image
          src={isMockup ? '/marketing/hero/phone-hand-video-mockup.png' : '/marketing/hero/phone-hand-mockup.webp'}
          alt={isMockup ? copy.mockupAlt[locale] : ''}
          fill
          priority
          sizes={isMockup ? '(min-width: 1024px) 520px, (min-width: 640px) 440px, 330px' : '(min-width: 1024px) 480px, (min-width: 640px) 420px, 300px'}
          className={`pointer-events-none select-none object-contain object-bottom ${isMockup ? 'z-20' : 'z-0'}`}
        />

        {isMockup && videoSrc ? (
          <div className="absolute left-[19%] top-[1.4%] z-10 h-[84.3%] w-[44.3%] overflow-hidden rounded-[28px] bg-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
            <video
              aria-hidden="true"
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              poster={posterSrc}
              src={videoSrc}
            />
          </div>
        ) : null}

        {mode === 'interactive' ? (
          <div className="absolute left-[28.6%] top-[15.7%] h-[57.5%] w-[42.4%] overflow-hidden rounded-b-[28px] rounded-t-[16px] bg-[#f6f8f5] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
            <div className="flex h-full flex-col px-2.5 pb-2.5 pt-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase leading-none tracking-[0.12em] text-emerald-700">Dokonly</p>
                    <h2 className="mt-1 text-[13px] font-black leading-tight text-slate-950">{copy.header[locale]}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black leading-none text-emerald-700">
                    {copy.demo[locale]}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-6 gap-1" aria-label={`${copy.step[locale]} ${activeState + 1}/6`}>
                  {states.map((item, index) => (
                    <button
                      key={item.ru}
                      type="button"
                      aria-label={`${copy.step[locale]} ${index + 1}: ${item[locale]}`}
                      aria-pressed={activeState === index}
                      onClick={() => setActiveState(index)}
                      className={`h-1.5 rounded-full transition ${
                        index <= activeState ? 'bg-emerald-500' : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label={copy.categories[locale]}>
                {tabs.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={activeTab === index}
                    className={`min-h-7 shrink-0 rounded-full px-1.5 text-[8px] font-black transition ${
                      activeTab === index
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      setActiveTab(index)
                      setActiveState(0)
                    }}
                  >
                    {item.label[locale]}
                  </button>
                ))}
              </div>

              <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                    {state[locale]}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {activeState + 1}/6
                  </span>
                </div>

                <div className={`mt-2 min-h-0 flex-1 overflow-hidden rounded-2xl bg-gradient-to-br ${productStyle.bg} p-3`}>
                  <div className="flex h-full flex-col justify-between rounded-xl border border-white/80 bg-white/70 p-2.5 shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500">{tab.label[locale]}</p>
                      <h3 className="mt-1 line-clamp-2 text-[14px] font-black leading-tight text-slate-950">{tab.product[locale]}</h3>
                    </div>
                    <div aria-hidden="true" className="space-y-1.5">
                      <div className={`h-2 w-16 rounded-full ${productStyle.rail}`} />
                      <div className="flex gap-1">
                        <span className={`h-6 w-6 rounded-lg ${productStyle.block}`} />
                        <span className={`h-6 w-6 rounded-lg ${productStyle.accent}`} />
                        <span className="h-6 w-6 rounded-lg bg-white ring-1 ring-slate-200" />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-[11px] font-bold leading-4 text-slate-700">{stateText}</p>

                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-[11px] font-bold text-slate-800">{tab.product[locale]}</span>
                    <span className="whitespace-nowrap text-[11px] font-black text-slate-950">{copy.price[locale]}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-2 hidden min-h-10 w-full rounded-2xl bg-slate-950 px-4 text-[12px] font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.99] sm:block"
                onClick={() => setActiveState((value) => (value + 1) % states.length)}
              >
                {copy.next[locale]}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
