import { BlogCard } from '@/components/marketing/BlogCard'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { blogPosts } from '@/content/marketing/blog'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Блог о продажах в Telegram',
    uz: 'Telegram savdosi haqida blog',
  },
  description: {
    ru: 'Практические материалы о запуске Telegram-магазина, заказах, промокодах, CRM и повторных продажах.',
    uz: 'Telegram-do‘konni ishga tushirish, buyurtmalar, promokodlar, CRM va takroriy savdo bo‘yicha amaliy materiallar.',
  },
}

export const metadata = buildMetadata(seo, 'uz', marketingRoutes.blog)

export default function UzbekBlogPage() {
  return (
    <MarketingLayout locale="uz" currentRoute={marketingRoutes.blog}>
      <section className="marketing-shell pb-14 pt-10 lg:pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Blog</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">Telegram savdosi haqida blog</h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Sotuvchilar Telegram ichida katalog, buyurtmalar, mijozlarni qaytarish va mijozlar bilan ishlashni qanday yo‘lga qo‘yishini ko‘rib chiqamiz.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
            <MarketingButton href={marketingRoutes.niches.uz} variant="secondary">
              Sohalarni ko‘rish
            </MarketingButton>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} locale="uz" />
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-shell text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight text-gray-950">O‘z Telegram-do‘koningizni ishga tushiring</h2>
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
