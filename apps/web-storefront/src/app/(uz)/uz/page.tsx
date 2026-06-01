import Link from 'next/link'
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

export const metadata = buildMetadata(homeCopy.seo, 'uz', marketingRoutes.home)

const howItWorks = [
  'Do‘kon yarating va Telegram-botni ulang.',
  'Mahsulotlar, kategoriyalar, promokodlar va yetkazish shartlarini qo‘shing.',
  'Mijoz tushunarli ssenariyda buyurtma beradi.',
  'Sotuvchi buyurtma, kontakt va mijoz tarixini oladi.',
]

export default function UzbekHomePage() {
  return (
    <MarketingLayout locale="uz" currentRoute={marketingRoutes.home}>
      <StructuredData data={faqJsonLd(faqs, 'uz')} />

      <HomeHero locale="uz" />
      <HomeProofStrip locale="uz" />

      <FeatureBento locale="uz" />

      <ProblemSolutionShowcase
        locale="uz"
        trustItems={homeCopy.trust.uz}
        problems={homeCopy.problems.uz}
        solutions={homeCopy.solutions.uz}
      />

      <section className="bg-white pt-10 pb-12 md:pt-12 md:pb-14 lg:pt-12 lg:pb-16">
        <div className="marketing-shell">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Sohalar</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Turli sotuvchilar uchun tayyor ssenariylar</h2>
            </div>
            <MarketingButton href={marketingRoutes.niches.uz} variant="secondary">
              Barcha sohalar
            </MarketingButton>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {niches.map((niche) => (
              <NicheCard key={niche.id} niche={niche} locale="uz" />
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Qanday ishlaydi</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Bo‘sh do‘kondan birinchi buyurtmagacha</h2>
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
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Konsultatsiya</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
              O‘z sohangiz uchun do‘kon namunasini oling
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Telegram’da nima sotishingizni ayting, biz katalog, buyurtma va mijozlar bilan ishlash qanday ko‘rinishini ko‘rsatamiz.
            </p>
          </div>
          <LeadForm locale="uz" defaultNiche="Telegram-do‘kon" variant="embedded" />
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Blog</p>
                <h2 className="mt-3 text-3xl font-black text-gray-950">Savdo uchun g‘oyalar</h2>
              </div>
              <Link href={marketingRoutes.blog.uz} className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
                Barcha maqolalar
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {blogPosts.slice(0, 3).map((post) => (
                <Link key={post.id} href={post.slug.uz} className="block rounded-lg border border-gray-200 p-4 transition hover:border-emerald-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{post.category.uz}</p>
                  <h3 className="mt-2 font-bold leading-6 text-gray-950">{post.title.uz}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{post.description.uz}</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Yordam</p>
                <h2 className="mt-3 text-3xl font-black text-gray-950">Tez yo‘riqnomalar</h2>
              </div>
              <Link href={marketingRoutes.help.uz} className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
                Barcha yordam
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {helpArticles.slice(0, 3).map((article) => (
                <Link key={article.id} href={article.slug.uz} className="block rounded-lg border border-gray-200 p-4 transition hover:border-emerald-200">
                  <h3 className="font-bold leading-6 text-gray-950">{article.title.uz}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{article.description.uz}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Savollar</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Ko‘p so‘raladigan savollar</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <div key={item.question.uz} className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="font-bold leading-6 text-gray-950">{item.question.uz}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer.uz}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell text-center">
          <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight text-gray-950">
            Telegram-do‘konni uzoq ishlab chiqishsiz ishga tushiring
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Katalog va buyurtmalardan boshlang, keyin savdoni oshirish uchun promokodlar, eslatmalar va CRM qo‘shing.
          </p>
          <div className="mt-7 flex justify-center">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
