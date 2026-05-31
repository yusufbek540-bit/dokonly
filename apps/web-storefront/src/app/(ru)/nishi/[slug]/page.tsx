import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LeadForm } from '@/components/marketing/LeadForm'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { StructuredData } from '@/components/marketing/StructuredData'
import { blogPosts } from '@/content/marketing/blog'
import { getNicheBySlug, niches } from '@/content/marketing/niches'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { buildMetadata, faqJsonLd } from '@/lib/marketing/seo'

interface PageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return niches.map((niche) => ({
    slug: niche.slug.ru.split('/').pop() ?? niche.slug.ru,
  }))
}

export function generateMetadata({ params }: PageProps) {
  const niche = getNicheBySlug(params.slug, 'ru')

  if (!niche) {
    notFound()
  }

  return buildMetadata(
    {
      title: niche.h1,
      description: niche.description,
    },
    'ru',
    niche.slug,
  )
}

export default function RussianNicheDetailPage({ params }: PageProps) {
  const niche = getNicheBySlug(params.slug, 'ru')

  if (!niche) {
    notFound()
  }

  const relatedPosts = niche.relatedBlogIds
    .map((id) => blogPosts.find((post) => post.id === id))
    .filter((post): post is (typeof blogPosts)[number] => Boolean(post))

  return (
    <MarketingLayout locale="ru" currentRoute={niche.slug}>
      <StructuredData data={faqJsonLd(niche.faqs, 'ru')} />

      <section className="marketing-shell grid gap-10 pb-14 pt-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">{niche.name.ru}</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">{niche.h1.ru}</h1>
          <p className="mt-6 text-xl font-semibold leading-8 text-gray-800">{niche.promise.ru}</p>
          <p className="mt-4 text-base leading-7 text-gray-600">{niche.description.ru}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.ru} variant="secondary">
              Получить консультацию
            </MarketingButton>
          </div>
        </div>
        <div className="marketing-card p-5">
          <div className="rounded-lg bg-gray-950 p-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold">Dokonly</span>
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-gray-950">Telegram</span>
            </div>
            <div className="mt-5 space-y-3">
              {niche.benefits.ru.map((benefit) => (
                <div key={benefit} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold">
                  {benefit}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-black text-gray-950">Оформить заказ</div>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Что мешает продажам</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Типичные проблемы ниши</h2>
            <div className="mt-6 grid gap-3">
              {niche.painPoints.ru.map((point) => (
                <div key={point} className="marketing-card p-5 text-gray-700">
                  {point}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Что дает Dokonly</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Польза для продавца</h2>
            <div className="mt-6 grid gap-3">
              {niche.benefits.ru.map((benefit) => (
                <div key={benefit} className="marketing-card p-5 font-semibold text-gray-900">
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Путь покупателя</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">От открытия бота до готового заказа</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {niche.buyerFlow.ru.map((step, index) => (
              <div key={step} className="marketing-card p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-white">{index + 1}</span>
                <p className="mt-5 text-sm font-bold leading-6 text-gray-900">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section bg-gray-950 text-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-300">Подтверждение</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">Почему сценарий работает</h2>
          </div>
          <p className="text-lg font-semibold leading-8 text-gray-100">{niche.proof.ru}</p>
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Следующий шаг</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
              Покажем, как может выглядеть магазин для ниши «{niche.name.ru}»
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Начните с готового каталога и оформления заказа, а детали подстроите под свои товары, услуги и процесс продаж.
            </p>
          </div>
          <LeadForm locale="ru" defaultNiche={niche.name.ru} variant="embedded" />
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Вопросы</p>
            <h2 className="mt-3 text-3xl font-black text-gray-950">Частые вопросы</h2>
            <div className="mt-6 grid gap-4">
              {niche.faqs.map((item) => (
                <div key={item.question.ru} className="marketing-card p-5">
                  <h3 className="font-bold leading-6 text-gray-950">{item.question.ru}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer.ru}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Блог</p>
            <h2 className="mt-3 text-3xl font-black text-gray-950">Материалы по теме</h2>
            <div className="mt-6 grid gap-4">
              {relatedPosts.map((post) => (
                <Link key={post.id} href={post.slug.ru} className="marketing-card block p-5 transition hover:border-emerald-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{post.category.ru}</p>
                  <h3 className="mt-2 font-bold leading-6 text-gray-950">{post.title.ru}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{post.description.ru}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight text-gray-950">
          Запустите Telegram-магазин для своей ниши
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
          Dokonly помогает начать с каталога и заказов, а затем развивать повторные продажи через промокоды и CRM.
        </p>
        <div className="mt-7 flex justify-center">
          <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
        </div>
      </section>
    </MarketingLayout>
  )
}
