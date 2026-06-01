import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FeatureBento } from '@/components/feature-bento'
import { HomeHero } from '@/components/marketing/HomeHero'
import { HomeProofStrip } from '@/components/marketing/HomeProofStrip'
import { LeadForm } from '@/components/marketing/LeadForm'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { NicheCard } from '@/components/marketing/NicheCard'
import { ProblemSolutionShowcase } from '@/components/marketing/ProblemSolutionShowcase'
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

      <HomeHero locale="ru" />
      <HomeProofStrip locale="ru" />

      <FeatureBento locale="ru" />

      <ProblemSolutionShowcase
        locale="ru"
        trustItems={homeCopy.trust.ru}
        problems={homeCopy.problems.ru}
        solutions={homeCopy.solutions.ru}
      />

      <section className="bg-white pt-10 pb-12 md:pt-12 md:pb-14 lg:pt-12 lg:pb-16">
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
          <LeadForm locale="ru" defaultNiche="Telegram-магазин" variant="embedded" />
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
