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
    slug: niche.slug.uz.split('/').pop() ?? niche.slug.uz,
  }))
}

export function generateMetadata({ params }: PageProps) {
  const niche = getNicheBySlug(params.slug, 'uz')

  if (!niche) {
    notFound()
  }

  return buildMetadata(
    {
      title: niche.h1,
      description: niche.description,
    },
    'uz',
    niche.slug,
  )
}

export default function UzbekNicheDetailPage({ params }: PageProps) {
  const niche = getNicheBySlug(params.slug, 'uz')

  if (!niche) {
    notFound()
  }

  const relatedPosts = niche.relatedBlogIds
    .map((id) => blogPosts.find((post) => post.id === id))
    .filter((post): post is (typeof blogPosts)[number] => Boolean(post))

  return (
    <MarketingLayout locale="uz" currentRoute={niche.slug}>
      <StructuredData data={faqJsonLd(niche.faqs, 'uz')} />

      <section className="marketing-shell grid gap-10 pb-14 pt-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">{niche.name.uz}</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">{niche.h1.uz}</h1>
          <p className="mt-6 text-xl font-semibold leading-8 text-gray-800">{niche.promise.uz}</p>
          <p className="mt-4 text-base leading-7 text-gray-600">{niche.description.uz}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.uz} variant="secondary">
              Konsultatsiya olish
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
              {niche.benefits.uz.map((benefit) => (
                <div key={benefit} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold">
                  {benefit}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-black text-gray-950">Buyurtma berish</div>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Savdoga nima xalaqit beradi</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Sohadagi odatiy muammolar</h2>
            <div className="mt-6 grid gap-3">
              {niche.painPoints.uz.map((point) => (
                <div key={point} className="marketing-card p-5 text-gray-700">
                  {point}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Dokonly nima beradi</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Sotuvchi uchun foyda</h2>
            <div className="mt-6 grid gap-3">
              {niche.benefits.uz.map((benefit) => (
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
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Mijoz yo‘li</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Botni ochishdan tayyor buyurtmagacha</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {niche.buyerFlow.uz.map((step, index) => (
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
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-300">Isbot</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">Nega bu ssenariy ishlaydi</h2>
          </div>
          <p className="text-lg font-semibold leading-8 text-gray-100">{niche.proof.uz}</p>
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Keyingi qadam</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
              «{niche.name.uz}» sohasi uchun do‘kon qanday ko‘rinishini ko‘rsatamiz
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Tayyor katalog va buyurtma rasmiylashtirishdan boshlang, tafsilotlarni esa mahsulot, xizmat va savdo jarayoningizga moslang.
            </p>
          </div>
          <LeadForm locale="uz" defaultNiche={niche.name.uz} />
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Savollar</p>
            <h2 className="mt-3 text-3xl font-black text-gray-950">Ko‘p so‘raladigan savollar</h2>
            <div className="mt-6 grid gap-4">
              {niche.faqs.map((item) => (
                <div key={item.question.uz} className="marketing-card p-5">
                  <h3 className="font-bold leading-6 text-gray-950">{item.question.uz}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer.uz}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Blog</p>
            <h2 className="mt-3 text-3xl font-black text-gray-950">Mavzuga oid materiallar</h2>
            <div className="mt-6 grid gap-4">
              {relatedPosts.map((post) => (
                <Link key={post.id} href={post.slug.uz} className="marketing-card block p-5 transition hover:border-emerald-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{post.category.uz}</p>
                  <h3 className="mt-2 font-bold leading-6 text-gray-950">{post.title.uz}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{post.description.uz}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight text-gray-950">
          O‘z sohangiz uchun Telegram-do‘konni ishga tushiring
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
          Dokonly katalog va buyurtmalardan boshlashga, keyin esa promokodlar va CRM orqali takroriy savdoni rivojlantirishga yordam beradi.
        </p>
        <div className="mt-7 flex justify-center">
          <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
        </div>
      </section>
    </MarketingLayout>
  )
}
