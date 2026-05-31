import Link from 'next/link'
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

export const metadata = buildMetadata(homeCopy.seo, 'uz', marketingRoutes.home)

const howItWorks = [
  'Do‘kon yarating va Telegram-botni ulang.',
  'Mahsulotlar, kategoriyalar, promokodlar va yetkazish shartlarini qo‘shing.',
  'Mijoz tushunarli ssenariyda buyurtma beradi.',
  'Sotuvchi buyurtma, kontakt va mijoz tarixini oladi.',
]

const proofItems = [
  {
    title: 'Ortiqcha yozishmasiz katalog',
    body: 'Mijoz mahsulot, narx, tavsif va keyingi qadamni Telegram ichida ko‘radi.',
  },
  {
    title: 'Buyurtmalar bitta navbatda',
    body: 'Yangi arizalar shaxsiy xabarlarda yo‘qolmaydi va sotuvchiga tezroq yetib boradi.',
  },
  {
    title: 'Takroriy savdolar',
    body: 'Mijoz izohlari, teglar, promokodlar va eslatmalar xaridorlarni qaytarishga yordam beradi.',
  },
]

const statItems = ['10 daqiqada ishga tushirish', '8 tayyor soha', '6 xarid bosqichi', 'Saytda 2 til']

export default function UzbekHomePage() {
  return (
    <MarketingLayout locale="uz" currentRoute={marketingRoutes.home}>
      <StructuredData data={faqJsonLd(faqs, 'uz')} />

      <section className="marketing-shell grid gap-10 pb-14 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Telegram savdosi uchun Dokonly</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl lg:text-6xl">
            {homeCopy.hero.h1.uz}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">{homeCopy.hero.body.uz}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
            <MarketingButton href={marketingRoutes.demo.uz} variant="secondary">
              Namunani ko‘rish
            </MarketingButton>
          </div>
        </div>
        <PhoneDemo locale="uz" />
      </section>

      <section className="border-y border-gray-200 bg-white">
        <div className="marketing-shell grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {homeCopy.trust.uz.map((item) => (
            <div key={item} className="rounded-lg bg-[#f8faf9] px-4 py-3 text-sm font-bold text-gray-800">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Muammo</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Savdo yozishma orqali yursa, tartib tez buziladi</h2>
            <ul className="mt-6 space-y-3">
              {homeCopy.problems.uz.map((problem) => (
                <li key={problem} className="rounded-lg border border-rose-100 bg-white px-4 py-3 text-gray-700">
                  {problem}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Yechim</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Dokonly mijoz yo‘lini bitta Telegram ssenariysiga yig‘adi</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {homeCopy.solutions.uz.map((solution) => (
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

      <section className="marketing-section bg-gray-950 text-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-300">Qiymat isboti</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">Kamroq qo‘l mehnati, ko‘proq boshqariladigan buyurtmalar</h2>
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Konsultatsiya</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
            O‘z sohangiz uchun do‘kon namunasini oling
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
            Telegram’da nima sotishingizni ayting, biz katalog, buyurtma va mijozlar bilan ishlash qanday ko‘rinishini ko‘rsatamiz.
          </p>
          <div className="mt-6">
            <MarketingButton href={ctas.leadOffer.href.uz}>{ctas.leadOffer.label.uz}</MarketingButton>
          </div>
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
