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
    title: 'Do‘konni ishga tushirish',
    description: 'Birinchi qadamlar: do‘kon yaratish, Telegram-botni ulash va mijoz yo‘lini tekshirish.',
  },
  {
    id: 'catalog',
    title: 'Katalog va mahsulotlar',
    description: 'Mahsulot qo‘shish, import qilish va xaridorlar uchun vitrinni tayyorlash.',
  },
  {
    id: 'orders',
    title: 'Buyurtmalar, to‘lov va yetkazib berish',
    description: 'Buyurtmalarni qabul qilish, to‘lov va yetkazib berish shartlarini sozlash.',
  },
  {
    id: 'growth',
    title: 'Takroriy savdo',
    description: 'CRM, promokodlar, eslatmalar va Telegram-kanal bilan bog‘lash.',
  },
]

export const metadata = buildMetadata(seo, 'uz', marketingRoutes.help)

export default function UzbekHelpPage() {
  const popularArticles = helpArticles.slice(0, 6)

  return (
    <MarketingLayout locale="uz" currentRoute={marketingRoutes.help}>
      <section className="marketing-shell pb-14 pt-10 lg:pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Yordam</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">Dokonly yordami</h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Telegram’da do‘konni sozlash bo‘yicha yo‘riqnomani toping: birinchi ishga tushirish va mahsulotlardan buyurtmalar, mijozlar va takroriy savdogacha.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.uz} variant="secondary">
              Yordam xizmatiga yozish
            </MarketingButton>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell">
          <HelpSearch articles={helpArticles} locale="uz" />
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Ommabop yo‘riqnomalar</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">Sozlash uchun tez yo‘l</h2>
            <div className="mt-6 grid gap-3">
              {popularArticles.map((article) => (
                <Link key={article.id} href={article.slug.uz} className="rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-950 transition hover:border-emerald-200 hover:text-emerald-700">
                  {article.title.uz}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Bo‘limlar</p>
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
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-300">Keyingi qadam</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">Do‘kon yarating yoki ishga tushirish bo‘yicha yordam oling</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
              Dokonly Telegram-botidan boshlang yoki sohangiz bo‘yicha yordam kerak bo‘lsa, bizga yozing.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.uz} variant="secondary">
              Yordamga yozish
            </MarketingButton>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
