import { LeadForm } from '@/components/marketing/LeadForm'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Тарифы',
    uz: 'Tariflar',
  },
  description: {
    ru: 'Выберите тариф Dokonly для запуска Telegram-магазина, роста заказов и работы команды.',
    uz: 'Telegram-do‘konni ishga tushirish, buyurtmalarni oshirish va jamoa ishi uchun Dokonly tarifini tanlang.',
  },
}

const plans = [
  {
    name: 'Старт',
    description: 'Для первого запуска каталога и приема заказов в Telegram.',
    features: ['Каталог товаров', 'Оформление заказа', 'Базовые настройки магазина'],
  },
  {
    name: 'Рост',
    description: 'Для продавцов, которым нужны промокоды, возврат покупателей и больше контроля.',
    features: ['Промокоды', 'Напоминания о корзине', 'Заметки и теги клиентов'],
  },
  {
    name: 'Команда',
    description: 'Для магазинов, где заказы обрабатывают несколько сотрудников.',
    features: ['Очередь заказов', 'Роли сотрудников', 'Помощь с запуском'],
  },
]

export const metadata = buildMetadata(seo, 'ru', marketingRoutes.pricing)

export default function RussianPricingPage() {
  return (
    <MarketingLayout locale="ru" currentRoute={marketingRoutes.pricing}>
      <section className="marketing-shell pb-14 pt-10 lg:pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Тарифы</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">Тарифы Dokonly</h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Начните с простого Telegram-магазина и добавляйте инструменты для повторных продаж, когда заказов становится больше.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.ru} variant="secondary">
              Получить консультацию
            </MarketingButton>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="marketing-card flex flex-col p-6">
              <h2 className="text-2xl font-black text-gray-950">{plan.name}</h2>
              <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm font-semibold text-gray-800">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-lg bg-[#f8faf9] px-4 py-3">
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <MarketingButton href={ctas.createStore.href.ru} className="w-full">
                  {ctas.createStore.label.ru}
                </MarketingButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Консультация</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
              Поможем выбрать тариф под вашу нишу
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Расскажите, что продаете, сколько заказов обрабатываете и какие сценарии нужны в Telegram.
            </p>
          </div>
          <LeadForm locale="ru" defaultNiche="Подбор тарифа" />
        </div>
      </section>
    </MarketingLayout>
  )
}
