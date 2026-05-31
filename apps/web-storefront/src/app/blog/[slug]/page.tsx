import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BlogCard } from '@/components/marketing/BlogCard'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { StructuredData } from '@/components/marketing/StructuredData'
import { blogPosts, getBlogPostBySlug, getRelatedPosts } from '@/content/marketing/blog'
import { getNicheRoute, niches } from '@/content/marketing/niches'
import { ctas } from '@/content/marketing/site'
import { articleJsonLd, buildMetadata } from '@/lib/marketing/seo'

interface PageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug.ru.split('/').pop() ?? post.slug.ru,
  }))
}

export function generateMetadata({ params }: PageProps) {
  const post = getBlogPostBySlug(params.slug, 'ru')

  if (!post) {
    notFound()
  }

  return buildMetadata(
    {
      title: post.title,
      description: post.description,
    },
    'ru',
    post.slug,
  )
}

export default function RussianBlogDetailPage({ params }: PageProps) {
  const post = getBlogPostBySlug(params.slug, 'ru')

  if (!post) {
    notFound()
  }

  const relatedNiches = post.relatedNicheIds
    .map((id) => niches.find((niche) => niche.id === id))
    .filter((niche): niche is (typeof niches)[number] => Boolean(niche))
  const relatedPosts = getRelatedPosts(post.id)

  return (
    <MarketingLayout locale="ru" currentRoute={post.slug}>
      <StructuredData data={articleJsonLd(post, 'ru')} />

      <article>
        <section className="marketing-shell pb-12 pt-10 lg:pt-14">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
              <span>{post.category.ru}</span>
              <span aria-hidden="true">/</span>
              <time dateTime={post.date}>{post.date}</time>
              <span aria-hidden="true">/</span>
              <span>{post.readingMinutes} мин чтения</span>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">{post.title.ru}</h1>
            <p className="mt-6 text-xl font-semibold leading-8 text-gray-800">{post.description.ru}</p>
          </div>
        </section>

        <section className="marketing-section bg-white">
          <div className="marketing-shell grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-start">
            <div className="max-w-3xl">
              <p className="text-lg leading-8 text-gray-700">{post.body.ru[0]}</p>

              <div className="my-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-7">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Следующий шаг</p>
                <h2 className="mt-3 text-2xl font-black leading-tight text-gray-950">Соберите Telegram-магазин без ручного хаоса</h2>
                <p className="mt-3 text-base leading-7 text-gray-700">
                  Начните с каталога и оформления заказа, а затем добавьте промокоды, теги клиентов и напоминания.
                </p>
                <div className="mt-5">
                  <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
                </div>
              </div>

              <div className="space-y-6 text-lg leading-8 text-gray-700">
                {post.body.ru.slice(1).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            {relatedNiches.length > 0 ? (
              <aside className="marketing-card p-5">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Связанные ниши</p>
                <div className="mt-4 grid gap-3">
                  {relatedNiches.map((niche) => (
                    <Link key={niche.id} href={getNicheRoute(niche.id, 'ru')} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-950 transition hover:border-emerald-200 hover:text-emerald-700">
                      {niche.name.ru}
                    </Link>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        </section>
      </article>

      <section className="marketing-section marketing-shell">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Для продавцов</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">Запустите магазин там, где покупатели уже пишут вам</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
            Dokonly помогает превратить Telegram в понятный путь от просмотра товара до готового заказа.
          </p>
          <div className="mt-6">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Блог</p>
              <h2 className="mt-3 text-3xl font-black text-gray-950">Похожие материалы</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {relatedPosts.map((relatedPost) => (
              <BlogCard key={relatedPost.id} post={relatedPost} locale="ru" />
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
