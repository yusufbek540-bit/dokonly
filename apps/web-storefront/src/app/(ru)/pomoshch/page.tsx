import Link from 'next/link'
import { HelpSearch } from '@/components/marketing/HelpSearch'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { helpArticles } from '@/content/marketing/help'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Помощь Dokonly',
    uz: 'Dokonly yordami',
  },
  description: {
    ru: 'Инструкции по запуску Telegram-магазина, каталогу, заказам, оплате, доставке, CRM и продвижению в Dokonly.',
    uz: 'Dokonly’da Telegram-do‘kon, katalog, buyurtmalar, to‘lov, yetkazib berish, CRM va targ‘ibot bo‘yicha yo‘riqnomalar.',
  },
}

const categories = [
  {
    id: 'start',
    title: 'Запуск магазина',
    description: 'Первые шаги: создать магазин, подключить Telegram-бот и проверить путь покупателя.',
  },
  {
    id: 'catalog',
    title: 'Каталог и товары',
    description: 'Добавление товаров, импорт и подготовка витрины для покупателей.',
  },
  {
    id: 'orders',
    title: 'Заказы, оплата и доставка',
    description: 'Как принимать заказы и настроить условия оплаты и доставки.',
  },
  {
    id: 'growth',
    title: 'Повторные продажи',
    description: 'CRM, промокоды, напоминания и связка с Telegram-каналом.',
  },
]

export const metadata = buildMetadata(seo, 'ru', marketingRoutes.help)

export default function RussianHelpPage() {
  const popularArticles = helpArticles.slice(0, 6)

  return (
    <MarketingLayout locale="ru" currentRoute={marketingRoutes.help}>
      <section className="marketing-shell pb-14 pt-10 lg:pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Помощь</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">Помощь Dokonly</h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Найдите инструкцию по настройке магазина в Telegram: от первого запуска и товаров до заказов, клиентов и повторных продаж.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.ru} variant="secondary">
              Связаться с поддержкой
            </MarketingButton>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell">
          <HelpSearch articles={helpArticles} locale="ru" />
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Популярные инструкции</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Быстрый путь к настройке</h2>
            <div className="mt-6 grid gap-3">
              {popularArticles.map((article) => (
                <Link key={article.id} href={article.slug.ru} className="rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-950 transition hover:border-emerald-200 hover:text-emerald-700">
                  {article.title.ru}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Разделы</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {categories.map((category) => (
                <div key={category.id} className="marketing-card p-5">
                  <h3 className="text-xl font-black text-gray-950">{category.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{category.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-gray-950 text-white">
        <div className="marketing-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-300">Следующий шаг</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">Создайте магазин или получите помощь с запуском</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
              Начните с Telegram-бота Dokonly или напишите нам, если нужна помощь с вашей нишей.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.ru} variant="secondary">
              Написать в поддержку
            </MarketingButton>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
