import type { Locale } from '@/content/marketing/types'

interface HomeProofStripProps {
  locale: Locale
}

const copy = {
  ru: {
    title: 'Telegram-продавцы получают понятный путь от просмотра до заказа',
    logos: ['Одежда', 'Косметика', 'Цветы', 'Еда', 'Обучение', 'Товары для дома'],
    cases: [
      {
        stat: '-40%',
        metric: 'повторных вопросов',
        title: 'Одежда и аксессуары',
        body: 'Размеры, цвета, фото и корзина собраны в одном сценарии.',
      },
      {
        stat: '2x',
        metric: 'быстрее заказ',
        title: 'Косметика и уход',
        body: 'Покупатель выбирает набор и оставляет контакт без длинной переписки.',
      },
      {
        stat: '+25%',
        metric: 'возврат клиентов',
        title: 'Доставка и предзаказ',
        body: 'Напоминания, промокоды и история заказов помогают продавать повторно.',
      },
    ],
  },
  uz: {
    title: 'Telegram sotuvchilari ko‘rishdan buyurtmagacha aniq yo‘l oladi',
    logos: ['Kiyim', 'Kosmetika', 'Gullar', 'Taom', 'Ta’lim', 'Uy tovarlari'],
    cases: [
      {
        stat: '-40%',
        metric: 'takroriy savollar',
        title: 'Kiyim va aksessuarlar',
        body: 'O‘lcham, rang, foto va savat bitta ssenariyda jamlanadi.',
      },
      {
        stat: '2x',
        metric: 'tezroq buyurtma',
        title: 'Kosmetika va parvarish',
        body: 'Xaridor to‘plamni tanlab, uzun yozishmasiz kontakt qoldiradi.',
      },
      {
        stat: '+25%',
        metric: 'mijoz qaytishi',
        title: 'Yetkazish va oldindan buyurtma',
        body: 'Eslatmalar, promokodlar va buyurtma tarixi takroriy savdoga yordam beradi.',
      },
    ],
  },
} as const

export function HomeProofStrip({ locale }: HomeProofStripProps) {
  const text = copy[locale]

  return (
    <section className="bg-[#f4f7f6] py-12 md:py-16">
      <div className="marketing-shell">
        <h2 className="mx-auto max-w-4xl text-center text-3xl font-black leading-tight text-slate-950 md:text-4xl">
          {text.title}
        </h2>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-y border-slate-200 py-6">
          {text.logos.map((item) => (
            <span key={item} className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {text.cases.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-4xl font-black tracking-tight text-emerald-600">{item.stat}</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-slate-500">{item.metric}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Dokonly</span>
              </div>
              <h3 className="mt-12 text-lg font-black text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
