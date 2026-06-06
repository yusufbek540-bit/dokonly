import { LeadForm } from '@/components/marketing/LeadForm'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Тарифы',
    uz: 'Tariflar',
  },
  description: {
    ru: 'Выберите тариф Dokonly для запуска Telegram-магазина, роста заказов и работы команды.',
    uz: 'Telegram-do‘konni ishga tushirish, buyurtmalarni oshirish va jamoa ishi uchun Dokonly tarifini tanlang.',
  },
}

const plans = [
  {
    name: 'Start',
    description: 'Katalogni birinchi marta ishga tushirish va Telegram’da buyurtma qabul qilish uchun.',
    features: ['Mahsulot katalogi', 'Buyurtmani rasmiylashtirish', 'Do‘konning asosiy sozlamalari'],
  },
  {
    name: 'O‘sish',
    description: 'Promokodlar, mijozlarni qaytarish va ko‘proq nazorat kerak bo‘lgan sotuvchilar uchun.',
    features: ['Promokodlar', 'Savat eslatmalari', 'Mijoz izohlari va teglari'],
  },
  {
    name: 'Jamoa',
    description: 'Buyurtmalarni bir nechta xodim qayta ishlaydigan do‘konlar uchun.',
    features: ['Buyurtmalar navbati', 'Xodim rollari', 'Ishga tushirishda yordam'],
  },
]

export const metadata = buildMetadata(seo, 'uz', marketingRoutes.pricing)

export default function UzbekPricingPage() {
  return (
    <MarketingLayout locale="uz" currentRoute={marketingRoutes.pricing}>
      <section className="marketing-shell pb-14 pt-10 lg:pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Tariflar</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">Dokonly tariflari</h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Oddiy Telegram-do‘kondan boshlang va buyurtmalar ko‘payganda takroriy savdo vositalarini qo‘shing.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.uz} variant="secondary">
              Konsultatsiya olish
            </MarketingButton>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="marketing-card flex flex-col p-6">
              <h2 className="text-2xl font-black text-gray-950">{plan.name}</h2>
              <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm font-semibold text-gray-800">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-lg bg-[#f8faf9] px-4 py-3">
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <MarketingButton href={ctas.createStore.href.uz} className="w-full">
                  {ctas.createStore.label.uz}
                </MarketingButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-shell">
        <div className="grid gap-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Konsultatsiya</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
              Sohangizga mos tarif tanlashga yordam beramiz
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Nima sotishingiz, qancha buyurtma qayta ishlashingiz va Telegram’da qanday ssenariylar kerakligini ayting.
            </p>
          </div>
          <LeadForm locale="uz" defaultNiche="Tarif tanlash" variant="embedded" />
        </div>
      </section>
    </MarketingLayout>
  )
}
