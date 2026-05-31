import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LeadForm } from '@/components/marketing/LeadForm'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { NicheCard } from '@/components/marketing/NicheCard'
import { PhoneDemo } from '@/components/marketing/PhoneDemo'
import { StructuredData } from '@/components/marketing/StructuredData'
import { blogPosts } from '@/content/marketing/blog'
import { faqs } from '@/content/marketing/faqs'
import { helpArticles } from '@/content/marketing/help'
import { niches } from '@/content/marketing/niches'
import { ctas, homeCopy } from '@/content/marketing/site'
import { marketingRoutes } from '@/content/marketing/routes'
import { buildMetadata, faqJsonLd } from '@/lib/marketing/seo'
import { resolveShopRedirect } from '@/lib/marketing/shopRedirect'

export const metadata = buildMetadata(homeCopy.seo, 'ru', marketingRoutes.home)

const howItWorks = [
  'Создайте магазин и подключите Telegram-бот.',
  'Добавьте товары, категории, промокоды и условия доставки.',
  'Покупатель оформляет заказ в понятном сценарии.',
  'Продавец получает заказ, контакт и историю клиента.',
]

const proofItems = [
  {
    title: 'Каталог без лишней переписки',
    body: 'Покупатель видит товары, цены, описание и следующий шаг прямо в Telegram.',
  },
  {
    title: 'Заказы в одной очереди',
    body: 'Новые заявки не теряются в личных сообщениях и быстрее доходят до продавца.',
  },
  {
    title: 'Повторные продажи',
    body: 'Клиентские заметки, теги, промокоды и напоминания помогают возвращать покупателей.',
  },
]

const statItems = ['10 минут до запуска', '8 готовых ниш', '6 шагов покупки', '2 языка сайта']

export default function RootPage({
  searchParams,
}: {
  searchParams: { shop?: string }
}) {
  const redirectPath = resolveShopRedirect(searchParams)
  if (redirectPath) {
    redirect(redirectPath)
  }

  return (
    <MarketingLayout locale="ru" currentRoute={marketingRoutes.home}>
      <StructuredData data={faqJsonLd(faqs, 'ru')} />

      <section className="marketing-shell grid gap-10 pb-14 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Dokonly для Telegram-продаж</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl lg:text-6xl">
            {homeCopy.hero.h1.ru}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">{homeCopy.hero.body.ru}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
            <MarketingButton href={marketingRoutes.demo.ru} variant="secondary">
              Посмотреть демо
            </MarketingButton>
          </div>
        </div>
        <PhoneDemo locale="ru" />
      </section>

      <section className="border-y border-gray-200 bg-white">
        <div className="marketing-shell grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {homeCopy.trust.ru.map((item) => (
            <div key={item} className="rounded-lg bg-[#f8faf9] px-4 py-3 text-sm font-bold text-gray-800">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Проблема</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Когда продажи идут через переписку, порядок быстро ломается</h2>
            <ul className="mt-6 space-y-3">
              {homeCopy.problems.ru.map((problem) => (
                <li key={problem} className="rounded-lg border border-rose-100 bg-white px-4 py-3 text-gray-700">
                  {problem}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Решение</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Dokonly собирает путь покупателя в один Telegram-сценарий</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {homeCopy.solutions.ru.map((solution) => (
                <li key={solution} className="rounded-lg border border-emerald-100 bg-white px-4 py-3 font-semibold text-gray-800">
                  {solution}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Ниши</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Готовые сценарии для разных продавцов</h2>
            </div>
            <MarketingButton href={marketingRoutes.niches.ru} variant="secondary">
              Все ниши
            </MarketingButton>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {niches.map((niche) => (
              <NicheCard key={niche.id} niche={niche} locale="ru" />
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Как это работает</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">От пустого магазина до первого заказа</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {howItWorks.map((step, index) => (
            <div key={step} className="rounded-lg border border-gray-200 bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-white">{index + 1}</span>
              <p className="mt-5 text-base font-bold leading-6 text-gray-900">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section bg-gray-950 text-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-300">Что доказывает ценность</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">Меньше ручной работы, больше управляемых заказов</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {proofItems.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="marketing-shell mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <div key={item} className="rounded-lg border border-white/10 px-4 py-3 text-sm font-bold text-emerald-100">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Консультация</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
              Получите пример магазина для своей ниши
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Расскажите, что продаете в Telegram, а мы покажем, как может выглядеть каталог, заказ и работа с клиентами.
            </p>
          </div>
          <LeadForm locale="ru" defaultNiche="Telegram-магазин" />
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Блог</p>
                <h2 className="mt-3 text-3xl font-black text-gray-950">Идеи для продаж</h2>
              </div>
              <Link href={marketingRoutes.blog.ru} className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
                Все статьи
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {blogPosts.slice(0, 3).map((post) => (
                <Link key={post.id} href={post.slug.ru} className="block rounded-lg border border-gray-200 p-4 transition hover:border-emerald-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{post.category.ru}</p>
                  <h3 className="mt-2 font-bold leading-6 text-gray-950">{post.title.ru}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{post.description.ru}</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Помощь</p>
                <h2 className="mt-3 text-3xl font-black text-gray-950">Быстрые инструкции</h2>
              </div>
              <Link href={marketingRoutes.help.ru} className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
                Вся помощь
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {helpArticles.slice(0, 3).map((article) => (
                <Link key={article.id} href={article.slug.ru} className="block rounded-lg border border-gray-200 p-4 transition hover:border-emerald-200">
                  <h3 className="font-bold leading-6 text-gray-950">{article.title.ru}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{article.description.ru}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Вопросы</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Частые вопросы</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <div key={item.question.ru} className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="font-bold leading-6 text-gray-950">{item.question.ru}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer.ru}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell text-center">
          <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight text-gray-950">
            Запустите Telegram-магазин без долгой разработки
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Начните с каталога и заказов, а затем добавьте промокоды, напоминания и CRM для роста продаж.
          </p>
          <div className="mt-7 flex justify-center">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
