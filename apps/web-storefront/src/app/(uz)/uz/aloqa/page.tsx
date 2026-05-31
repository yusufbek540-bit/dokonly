import { LeadForm } from '@/components/marketing/LeadForm'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Консультация',
    uz: 'Konsultatsiya',
  },
  description: {
    ru: 'Получите консультацию по запуску Telegram-магазина и примеру магазина для вашей ниши.',
    uz: 'Telegram-do‘konni ishga tushirish va sohangiz uchun do‘kon namunasi bo‘yicha konsultatsiya oling.',
  },
}

const expectations = ['Nima sotishingiz', 'Buyurtmalarni hozir qanday qabul qilishingiz', 'Xaridorga qanday ssenariylar kerakligi']

export const metadata = buildMetadata(seo, 'uz', marketingRoutes.contact)

export default function UzbekContactPage() {
  return (
    <MarketingLayout locale="uz" currentRoute={marketingRoutes.contact}>
      <section className="marketing-shell pb-14 pt-10 lg:pt-14">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Konsultatsiya</p>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">
              Sohangiz uchun do‘kon namunasini oling
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Mahsulotlar, buyurtmalar va Telegram-kanalingiz haqida ayting. Katalog, buyurtma berish va takroriy savdoni Dokonly’da qanday yig‘ishni ko‘rsatamiz.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
              <MarketingButton href={marketingRoutes.demo.uz} variant="secondary">
                Namunani ko‘rish
              </MarketingButton>
            </div>
          </div>

          <LeadForm locale="uz" defaultNiche="Telegram-do‘kon" />
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Nima tayyorlash kerak</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {expectations.map((item) => (
              <div key={item} className="marketing-card p-5">
                <h2 className="text-xl font-black text-gray-950">{item}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Shu ma’lumotlar birinchi do‘kon ssenariysi va tushunarli ishga tushirishni muhokama qilish uchun yetarli.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
