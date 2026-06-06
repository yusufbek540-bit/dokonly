import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { StructuredData } from '@/components/marketing/StructuredData'
import { getHelpArticleBySlug, getRelatedHelpArticles, helpArticles } from '@/content/marketing/help'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { absoluteUrl, buildMetadata } from '@/lib/marketing/seo'

interface PageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return helpArticles.map((article) => ({
    slug: article.slug.uz.split('/').pop() ?? article.slug.uz,
  }))
}

export function generateMetadata({ params }: PageProps) {
  const article = getHelpArticleBySlug(params.slug, 'uz')

  if (!article) {
    notFound()
  }

  return buildMetadata(
    {
      title: article.title,
      description: article.description,
    },
    'uz',
    article.slug,
  )
}

export default function UzbekHelpArticlePage({ params }: PageProps) {
  const article = getHelpArticleBySlug(params.slug, 'uz')

  if (!article) {
    notFound()
  }

  const relatedArticles = getRelatedHelpArticles(article.id)
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Yordam',
        item: absoluteUrl(marketingRoutes.help.uz),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: article.title.uz,
        item: absoluteUrl(article.slug.uz),
      },
    ],
  }

  return (
    <MarketingLayout locale="uz" currentRoute={article.slug}>
      <StructuredData data={breadcrumbJsonLd} />

      <article>
        <section className="marketing-shell pb-12 pt-10 lg:pt-14">
          <div className="max-w-3xl">
            <Link href={marketingRoutes.help.uz} className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700 transition hover:text-emerald-800">
              Yordam
            </Link>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">{article.title.uz}</h1>
            <p className="mt-6 text-xl font-semibold leading-8 text-gray-800">{article.description.uz}</p>
          </div>
        </section>

        <section className="marketing-section bg-white">
          <div className="marketing-shell grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-start">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-black leading-tight text-gray-950">Bosqichma-bosqich yo‘riqnoma</h2>
              <ol className="mt-6 space-y-4">
                {article.steps.uz.map((step, index) => (
                  <li key={step} className="marketing-card flex gap-4 p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-base leading-7 text-gray-700">{step}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-7">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Yordam kerakmi</p>
                <h2 className="mt-3 text-2xl font-black leading-tight text-gray-950">Dokonly bilan do‘konni ishga tushiring</h2>
                <p className="mt-3 text-base leading-7 text-gray-700">
                  Telegram-bot orqali do‘kon yarating yoki sozlash bo‘yicha yordam kerak bo‘lsa, bizga yozing.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
                  <MarketingButton href={marketingRoutes.contact.uz} variant="secondary">
                    Yordam xizmatiga yozish
                  </MarketingButton>
                </div>
              </div>
            </div>

            <aside className="marketing-card p-5">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">O‘xshash maqolalar</p>
              <div className="mt-4 grid gap-3">
                {relatedArticles.map((relatedArticle) => (
                  <Link key={relatedArticle.id} href={relatedArticle.slug.uz} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-950 transition hover:border-emerald-200 hover:text-emerald-700">
                    {relatedArticle.title.uz}
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </article>
    </MarketingLayout>
  )
}
