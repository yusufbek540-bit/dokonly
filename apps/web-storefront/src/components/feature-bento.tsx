'use client'

import Link from 'next/link'
import { ArrowUpRight, MessageCircle, RefreshCw, ShoppingBag, Tags, UsersRound, Zap } from 'lucide-react'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import type { Locale } from '@/content/marketing/types'

interface FeatureBentoProps {
  locale: Locale
}

const copy = {
  ru: {
    eyebrow: 'Функции Dokonly',
    title: 'Что получает продавец после запуска Telegram-магазина',
    body: 'Не отдельные виджеты, а собранный сценарий: покупатель выбирает товар, оформляет заказ, а продавец видит заявку и историю клиента.',
    live: 'Рабочий сценарий',
    flowTitle: 'Каталог, корзина и заказ без хаоса в личке',
    flowBody: 'Все шаги покупки идут внутри Telegram: категории, карточка товара, корзина, контакт и передача заказа продавцу.',
    flow: ['Категории', 'Товар', 'Корзина', 'Заказ'],
    sellerPanel: 'Панель продавца',
    sellerItems: ['Новый заказ', 'Контакт клиента', 'История покупки'],
    launchValue: '10 мин',
    launchTitle: 'до первого магазина',
    launchBody: 'Старт без разработчика и долгой настройки.',
    cartTitle: 'Корзина возвращает покупателя',
    cartBody: 'Промокоды и напоминания помогают довести клиента до заказа.',
    ctaKicker: 'Запуск',
    ctaTitle: 'Создать магазин в Telegram',
    ctaBody: 'Откроется бот Dokonly, где можно начать настройку магазина.',
    crmTitle: 'CRM для повторных продаж',
    crmBody: 'Заметки, теги и история заказов помогают продавать тем же клиентам снова.',
  },
  uz: {
    eyebrow: 'Dokonly imkoniyatlari',
    title: 'Telegram-do‘kon ishga tushgandan keyin sotuvchi nima oladi',
    body: 'Alohida vidjetlar emas, balki tayyor ssenariy: xaridor mahsulot tanlaydi, buyurtma beradi, sotuvchi esa ariza va mijoz tarixini ko‘radi.',
    live: 'Ishlaydigan ssenariy',
    flowTitle: 'Katalog, savat va buyurtma shaxsiy xabarlarsiz',
    flowBody: 'Xarid bosqichlari Telegram ichida yuradi: kategoriya, mahsulot kartasi, savat, kontakt va buyurtmani sotuvchiga yuborish.',
    flow: ['Kategoriya', 'Mahsulot', 'Savat', 'Buyurtma'],
    sellerPanel: 'Sotuvchi paneli',
    sellerItems: ['Yangi buyurtma', 'Mijoz kontakti', 'Xarid tarixi'],
    launchValue: '10 daq',
    launchTitle: 'birinchi do‘kongacha',
    launchBody: 'Dasturchisiz va uzoq sozlashlarsiz start.',
    cartTitle: 'Savat xaridorni qaytaradi',
    cartBody: 'Promokodlar va eslatmalar mijozni buyurtmaga olib keladi.',
    ctaKicker: 'Boshlash',
    ctaTitle: 'Telegram’da do‘kon yaratish',
    ctaBody: 'Dokonly bot ochiladi va do‘kon sozlashni boshlaysiz.',
    crmTitle: 'Takroriy savdo uchun CRM',
    crmBody: 'Izohlar, teglar va buyurtma tarixi o‘sha mijozlarga yana sotishga yordam beradi.',
  },
} as const

export function FeatureBento({ locale }: FeatureBentoProps) {
  const text = copy[locale]
  const createHref = ctas.createStore.href[locale]
  const demoHref = marketingRoutes.demo[locale]

  return (
    <section className="showcase-grid bg-[#f7fbf8] py-12 md:py-16">
      <div className="marketing-shell">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">{text.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 md:text-4xl">{text.title}</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">{text.body}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 md:auto-rows-[190px] lg:grid-cols-4 lg:auto-rows-[210px]">
          <article className="group relative overflow-hidden rounded-lg bg-slate-950 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)] md:col-span-2 md:row-span-2 md:p-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-300" aria-hidden="true" />
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl transition-transform duration-500 group-hover:scale-125" aria-hidden="true" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" aria-hidden="true" />
                  {text.live}
                </span>
                <h3 className="mt-5 max-w-xl text-3xl font-black leading-tight md:text-4xl">{text.flowTitle}</h3>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">{text.flowBody}</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_0.82fr] lg:items-end">
                <div className="grid grid-cols-2 gap-2">
                  {text.flow.map((item, index) => (
                    <div
                      key={item}
                      className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 transition duration-200 group-hover:border-emerald-300/40 group-hover:bg-white/[0.1]"
                    >
                      <span className="text-xs font-black text-emerald-200">0{index + 1}</span>
                      <p className="mt-1 text-sm font-bold text-white">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-100">
                    <MessageCircle className="h-4 w-4" />
                    {text.sellerPanel}
                  </div>
                  <div className="mt-3 space-y-2">
                    {text.sellerItems.map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-md bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-100">
                        <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="group rounded-lg bg-emerald-600 p-5 text-white shadow-[0_18px_40px_rgba(0,121,92,0.16)] transition duration-200 hover:-translate-y-1">
            <div className="flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-4xl font-black tracking-tight">{text.launchValue}</p>
                <h3 className="mt-1 text-lg font-black leading-tight">{text.launchTitle}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-emerald-50">{text.launchBody}</p>
              </div>
            </div>
          </article>

          <article className="group rounded-lg border border-amber-200 bg-amber-50 p-5 text-slate-950 transition duration-200 hover:-translate-y-1 hover:border-amber-300">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <Tags className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xl font-black leading-tight">{text.cartTitle}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{text.cartBody}</p>
              </div>
            </div>
          </article>

          <Link
            href={createHref}
            className="group rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_20px_48px_rgba(0,121,92,0.14)]"
          >
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                  {text.ctaKicker}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white transition duration-200 group-hover:rotate-45 group-hover:bg-emerald-600">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black leading-tight">{text.ctaTitle}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{text.ctaBody}</p>
              </div>
            </div>
          </Link>

          <article className="group rounded-lg border border-rose-100 bg-white p-5 text-slate-950 transition duration-200 hover:-translate-y-1 hover:border-rose-200">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                  <UsersRound className="h-5 w-5" />
                </div>
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-black leading-tight">{text.crmTitle}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{text.crmBody}</p>
                <Link href={demoHref} className="mt-4 inline-flex items-center gap-1 text-sm font-black text-emerald-700 hover:text-emerald-800">
                  {ctas.viewDemo.label[locale]}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
