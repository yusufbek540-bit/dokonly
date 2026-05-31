import { LeadForm } from '@/components/marketing/LeadForm'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { PhoneDemo } from '@/components/marketing/PhoneDemo'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas, telegramExampleUrl } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Пример магазина в Telegram',
    uz: 'Telegram do‘kon namunasi',
  },
  description: {
    ru: 'Посмотрите, как покупатель выбирает товар, оформляет заказ и попадает в CRM продавца внутри Telegram.',
    uz: 'Xaridor Telegram ichida mahsulot tanlashi, buyurtma berishi va sotuvchi CRMiga tushishini ko‘ring.',
  },
}

export const metadata = buildMetadata(seo, 'ru', marketingRoutes.demo)

export default function RussianDemoPage() {
  return (
    <MarketingLayout locale="ru" currentRoute={marketingRoutes.demo}>
      <section className="marketing-shell grid gap-10 pb-14 pt-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Демо</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">
            Посмотрите пример магазина в Telegram
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            В примере показан путь покупателя: категории, карточка товара, корзина, оформление заказа и передача заявки продавцу.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
            {telegramExampleUrl ? (
              <MarketingButton href={ctas.openTelegramExample.href.ru} variant="secondary">
                {ctas.openTelegramExample.label.ru}
              </MarketingButton>
            ) : null}
          </div>
        </div>
        <PhoneDemo locale="ru" />
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-4 md:grid-cols-3">
          {['Каталог с категориями', 'Заказ без ручной переписки', 'Клиент в базе для повторных продаж'].map((item) => (
            <div key={item} className="marketing-card p-5">
              <h2 className="text-xl font-black text-gray-950">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Покажите покупателю понятный следующий шаг и сохраните данные заказа в одном сценарии.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Ваш пример</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
              Покажем демо под вашу нишу
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Опишите товары и поток заказов, чтобы мы подготовили понятный сценарий Telegram-магазина.
            </p>
          </div>
          <LeadForm locale="ru" defaultNiche="Демо магазина" variant="embedded" />
        </div>
      </section>
    </MarketingLayout>
  )
}
