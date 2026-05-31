import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { NicheCard } from '@/components/marketing/NicheCard'
import { niches } from '@/content/marketing/niches'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Ниши для Telegram-магазина',
    uz: 'Telegram-do‘kon uchun sohalar',
  },
  description: {
    ru: 'Выберите нишу и посмотрите, как Dokonly помогает продавать через Telegram: каталог, заказы, промокоды и CRM.',
    uz: 'Sohani tanlang va Dokonly Telegram orqali sotishga qanday yordam berishini ko‘ring: katalog, buyurtmalar, promokodlar va CRM.',
  },
}

export const metadata = buildMetadata(seo, 'ru', marketingRoutes.niches)

export default function RussianNichesPage() {
  return (
    <MarketingLayout locale="ru" currentRoute={marketingRoutes.niches}>
      <section className="marketing-shell pb-14 pt-10 lg:pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Ниши</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">
            Ниши, для которых подходит Dokonly
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Dokonly подходит продавцам, которым нужен понятный каталог, оформление заказа и работа с клиентами прямо в Telegram.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
            <MarketingButton href={marketingRoutes.contact.ru} variant="secondary">
              Обсудить свою нишу
            </MarketingButton>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {niches.map((niche) => (
              <NicheCard key={niche.id} niche={niche} locale="ru" />
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
