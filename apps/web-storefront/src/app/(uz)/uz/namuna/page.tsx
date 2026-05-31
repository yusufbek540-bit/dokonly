import { MarketingButton } from '@/components/marketing/MarketingButton'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { PhoneDemo } from '@/components/marketing/PhoneDemo'
import { marketingRoutes } from '@/content/marketing/routes'
import { ctas, telegramExampleUrl } from '@/content/marketing/site'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: {
    ru: 'Пример магазина в Telegram',
    uz: 'Telegram do‘kon namunasi',
  },
  description: {
    ru: 'Посмотрите, как покупатель выбирает товар, оформляет заказ и попадает в CRM продавца внутри Telegram.',
    uz: 'Xaridor Telegram ichida mahsulot tanlashi, buyurtma berishi va sotuvchi CRMiga tushishini ko‘ring.',
  },
}

export const metadata = buildMetadata(seo, 'uz', marketingRoutes.demo)

export default function UzbekDemoPage() {
  return (
    <MarketingLayout locale="uz" currentRoute={marketingRoutes.demo}>
      <section className="marketing-shell grid gap-10 pb-14 pt-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Namuna</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] text-gray-950 sm:text-5xl">
            Telegram do‘kon namunasini ko‘ring
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Namunada xaridor yo‘li ko‘rsatilgan: kategoriyalar, mahsulot kartasi, savat, buyurtmani rasmiylashtirish va arizani sotuvchiga yuborish.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href={ctas.createStore.href.uz}>{ctas.createStore.label.uz}</MarketingButton>
            {telegramExampleUrl ? (
              <MarketingButton href={ctas.openTelegramExample.href.uz} variant="secondary">
                {ctas.openTelegramExample.label.uz}
              </MarketingButton>
            ) : null}
          </div>
        </div>
        <PhoneDemo locale="uz" />
      </section>

      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-4 md:grid-cols-3">
          {['Kategoriyali katalog', 'Qo‘l yozishmasiz buyurtma', 'Takroriy savdo uchun mijoz bazasi'].map((item) => (
            <div key={item} className="marketing-card p-5">
              <h2 className="text-xl font-black text-gray-950">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Xaridorga tushunarli keyingi qadamni ko‘rsating va buyurtma ma’lumotlarini bitta ssenariyda saqlang.
              </p>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  )
}
