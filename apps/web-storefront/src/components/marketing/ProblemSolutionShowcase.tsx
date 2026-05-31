'use client'

import { useState } from 'react'
import type { Locale } from '@/content/marketing/types'

interface ProblemSolutionShowcaseProps {
  locale: Locale
  trustItems: string[]
  problems: string[]
  solutions: string[]
}

const copy = {
  ru: {
    eyebrow: 'Диагностика продаж',
    title: 'Из хаоса в переписке в управляемый сценарий покупки',
    body: 'Выберите часть воронки и посмотрите, как Dokonly превращает разрозненные сообщения в понятный процесс для покупателя и продавца.',
    before: 'Как сейчас',
    engine: 'Dokonly',
    after: 'Что получает продавец',
    problemsTitle: 'Узкие места',
    solutionsTitle: 'Автоматизация',
    stageLabel: 'Активный сценарий',
    stages: [
      {
        title: 'Каталог',
        metric: '1 экран',
        metricLabel: 'для выбора товара',
        before: 'Покупатель спрашивает цену, наличие и фото в личных сообщениях.',
        engine: 'Карточки товаров, категории, фото и следующий шаг собраны в одном Telegram-сценарии.',
        after: 'Меньше повторных вопросов и быстрее переход к оформлению заказа.',
      },
      {
        title: 'Заказ',
        metric: '6 шагов',
        metricLabel: 'до заявки',
        before: 'Адрес, телефон, доставка и комментарий собираются вручную.',
        engine: 'Форма заказа ведет покупателя по одному маршруту и сохраняет данные.',
        after: 'Продавец получает структурированный заказ вместо длинной переписки.',
      },
      {
        title: 'Возврат',
        metric: '24/7',
        metricLabel: 'напоминания',
        before: 'Корзины забываются, а повторные касания зависят от памяти продавца.',
        engine: 'Промокоды, напоминания и сценарии бота возвращают клиента в покупку.',
        after: 'Повторные продажи становятся частью процесса, а не ручной задачей.',
      },
      {
        title: 'CRM',
        metric: '1 база',
        metricLabel: 'клиентов',
        before: 'История клиента разбросана по чатам и быстро теряется.',
        engine: 'Заметки, теги и история заказов помогают продолжать разговор с контекстом.',
        after: 'Команда видит, кто покупал, что важно и какой следующий шаг предложить.',
      },
    ],
  },
  uz: {
    eyebrow: 'Savdoni tahlil qilish',
    title: 'Tartibsiz yozishmadan boshqariladigan xarid ssenariysiga',
    body: 'Voronka qismini tanlang va Dokonly alohida xabarlarni mijoz va sotuvchi uchun tushunarli jarayonga qanday aylantirishini ko‘ring.',
    before: 'Hozir qanday',
    engine: 'Dokonly',
    after: 'Sotuvchi nima oladi',
    problemsTitle: 'Tor joylar',
    solutionsTitle: 'Avtomatlashtirish',
    stageLabel: 'Faol ssenariy',
    stages: [
      {
        title: 'Katalog',
        metric: '1 ekran',
        metricLabel: 'mahsulot tanlash',
        before: 'Mijoz narx, mavjudlik va suratlarni shaxsiy xabarda so‘raydi.',
        engine: 'Mahsulot kartalari, kategoriyalar, suratlar va keyingi qadam Telegram ssenariysida jamlanadi.',
        after: 'Takroriy savollar kamayadi va buyurtmaga o‘tish tezlashadi.',
      },
      {
        title: 'Buyurtma',
        metric: '6 qadam',
        metricLabel: 'arizagacha',
        before: 'Manzil, telefon, yetkazish va izoh qo‘lda yig‘iladi.',
        engine: 'Buyurtma formasi mijozni bitta yo‘l bo‘yicha olib boradi va ma’lumotlarni saqlaydi.',
        after: 'Sotuvchi uzun yozishma o‘rniga tartibli buyurtma oladi.',
      },
      {
        title: 'Qaytarish',
        metric: '24/7',
        metricLabel: 'eslatmalar',
        before: 'Savatlar unutiladi, takroriy aloqa sotuvchining esida qolishiga bog‘liq.',
        engine: 'Promokodlar, eslatmalar va bot ssenariylari mijozni xaridga qaytaradi.',
        after: 'Takroriy savdo qo‘l vazifasi emas, jarayonning bir qismiga aylanadi.',
      },
      {
        title: 'CRM',
        metric: '1 baza',
        metricLabel: 'mijozlar',
        before: 'Mijoz tarixi chatlarda tarqalib ketadi va tez yo‘qoladi.',
        engine: 'Izohlar, teglar va buyurtma tarixi suhbatni kontekst bilan davom ettirishga yordam beradi.',
        after: 'Jamoa kim nima olganini, nima muhimligini va keyingi qadamni ko‘radi.',
      },
    ],
  },
} as const

const iconPaths = [
  'M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Zm3 1h10M7 12h4m-4 3h7',
  'M6 5h12l-1 10H7L6 5Zm0 0L5 3H3m6 16.5h.01M16 19.5h.01M8 8h8',
  'M5 12a7 7 0 0 1 12-4.9M19 12a7 7 0 0 1-12 4.9M17 3v4h-4M7 21v-4h4',
  'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM8 9h8M8 12h5M8 15h7',
] as const

function ShowcaseIcon({ index }: { index: number }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPaths[index % iconPaths.length]} />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}

export function ProblemSolutionShowcase({ locale, trustItems, problems, solutions }: ProblemSolutionShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const text = copy[locale]
  const activeStage = text.stages[activeIndex]

  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-[#f6faf7]">
      <div className="showcase-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="marketing-shell relative py-10 md:py-20">
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:overflow-visible lg:pb-0">
          <div className="flex gap-3 lg:grid lg:grid-cols-4">
            {trustItems.map((item, index) => {
              const selected = activeIndex === index
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`group flex min-h-16 w-[280px] shrink-0 items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left text-sm font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-[310px] lg:w-auto ${
                    selected
                      ? 'border-emerald-500 bg-white text-emerald-950 shadow-[0_16px_40px_rgba(0,121,92,0.14)]'
                      : 'border-slate-200 bg-white/75 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:text-slate-950'
                  }`}
                  aria-pressed={selected}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700'}`}>
                      <ShowcaseIcon index={index} />
                    </span>
                    <span>{item}</span>
                  </span>
                  <span className="text-xs font-black text-slate-400">0{index + 1}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:mt-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="showcase-reveal">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">{text.eyebrow}</p>
            <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight text-slate-950 md:text-4xl">{text.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">{text.body}</p>

            <div className="mt-8 hidden gap-3 md:grid">
              <div className="rounded-lg border border-rose-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-slate-950">{text.problemsTitle}</h3>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{problems.length}</span>
                </div>
                <ul className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-1">
                  {problems.slice(0, 3).map((problem) => (
                    <li key={problem} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 transition hover:border-rose-200 hover:bg-white">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                      <span>{problem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-slate-950">{text.solutionsTitle}</h3>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{solutions.length}</span>
                </div>
                <ul className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-1">
                  {solutions.slice(0, 3).map((solution) => (
                    <li key={solution} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold leading-6 text-slate-800 transition hover:border-emerald-200 hover:bg-white">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden="true">
                        <CheckIcon />
                      </span>
                      <span>{solution}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="showcase-reveal rounded-lg border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-5" style={{ animationDelay: '90ms' }}>
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{text.stageLabel}</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{activeStage.title}</h3>
              </div>
              <div className="hidden rounded-lg bg-slate-100 p-1 md:inline-flex" role="tablist" aria-label={text.stageLabel}>
                {text.stages.map((stage, index) => (
                  <button
                    key={stage.title}
                    type="button"
                    role="tab"
                    aria-selected={activeIndex === index}
                    onClick={() => setActiveIndex(index)}
                    className={`min-h-10 rounded-md px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      activeIndex === index ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {stage.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
              <div className="rounded-lg border border-rose-100 bg-rose-50/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-700">{text.before}</p>
                <p className="mt-4 text-base font-semibold leading-7 text-slate-800">{activeStage.before}</p>
              </div>

              <div className="showcase-path hidden w-16 items-center justify-center md:flex" aria-hidden="true">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm">
                  <ShowcaseIcon index={activeIndex} />
                </span>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{text.after}</p>
                <p className="mt-4 text-base font-semibold leading-7 text-slate-800">{activeStage.after}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-300">{text.engine}</p>
                  <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-100">{activeStage.engine}</p>
                </div>
                <div className="shrink-0 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-left md:text-right">
                  <p className="text-2xl font-black text-white">{activeStage.metric}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-300">{activeStage.metricLabel}</p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${((activeIndex + 1) / text.stages.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
