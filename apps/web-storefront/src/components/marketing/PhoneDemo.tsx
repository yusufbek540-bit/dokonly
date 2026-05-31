'use client'

import { useMemo, useState } from 'react'
import type { Locale } from '@/content/marketing/types'

interface PhoneDemoProps {
  locale: Locale
}

const tabs = [
  {
    id: 'fashion',
    label: { ru: 'Одежда', uz: 'Kiyim' },
    product: { ru: 'Летнее платье', uz: 'Yozgi ko‘ylak' },
    detail: { ru: 'Размеры S-L, 3 цвета', uz: 'S-L o‘lcham, 3 rang' },
  },
  {
    id: 'beauty',
    label: { ru: 'Косметика', uz: 'Kosmetika' },
    product: { ru: 'Сыворотка для лица', uz: 'Yuz uchun serum' },
    detail: { ru: 'Для утреннего ухода', uz: 'Ertalabki parvarish uchun' },
  },
  {
    id: 'food',
    label: { ru: 'Еда', uz: 'Taom' },
    product: { ru: 'Набор круассанов', uz: 'Kruassan to‘plami' },
    detail: { ru: 'Предзаказ на завтра', uz: 'Ertaga oldindan buyurtma' },
  },
  {
    id: 'flowers',
    label: { ru: 'Цветы', uz: 'Gullar' },
    product: { ru: 'Букет роз', uz: 'Atirgul guldastasi' },
    detail: { ru: 'Доставка к событию', uz: 'Tadbirga yetkazib berish' },
  },
] as const

const states = [
  { ru: 'Каталог', uz: 'Katalog' },
  { ru: 'Товар', uz: 'Mahsulot' },
  { ru: 'Корзина', uz: 'Savat' },
  { ru: 'Оформление', uz: 'Rasmiylashtirish' },
  { ru: 'Заказ продавцу', uz: 'Sotuvchiga buyurtma' },
  { ru: 'CRM', uz: 'CRM' },
] as const

const copy = {
  header: { ru: 'Магазин в Telegram', uz: 'Telegram ichidagi do‘kon' },
  categories: { ru: 'Категории', uz: 'Kategoriyalar' },
  price: { ru: 'от 120 000 сум', uz: '120 000 so‘mdan' },
  cart: { ru: 'В корзине 1 товар', uz: 'Savatda 1 mahsulot' },
  checkout: { ru: 'Имя, телефон и адрес доставки', uz: 'Ism, telefon va yetkazish manzili' },
  seller: { ru: 'Новый заказ пришел продавцу', uz: 'Yangi buyurtma sotuvchiga keldi' },
  crm: { ru: 'Клиент сохранен для повторной продажи', uz: 'Mijoz takroriy savdo uchun saqlandi' },
  next: { ru: 'Следующий шаг', uz: 'Keyingi qadam' },
  step: { ru: 'Шаг', uz: 'Bosqich' },
} as const

export function PhoneDemo({ locale }: PhoneDemoProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [activeState, setActiveState] = useState(0)
  const tab = tabs[activeTab]
  const state = states[activeState]

  const stateText = useMemo(() => {
    switch (activeState) {
      case 0:
        return copy.categories[locale]
      case 1:
        return tab.detail[locale]
      case 2:
        return copy.cart[locale]
      case 3:
        return copy.checkout[locale]
      case 4:
        return copy.seller[locale]
      default:
        return copy.crm[locale]
    }
  }, [activeState, locale, tab])

  return (
    <section
      className="mx-auto w-full max-w-[390px] rounded-[32px] border border-gray-900 bg-gray-950 p-3 shadow-2xl shadow-emerald-950/20"
      aria-label={copy.header[locale]}
    >
      <div className="overflow-hidden rounded-[24px] bg-[#f4f7f4]">
        <div className="flex items-center justify-between bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Dokonly
            </p>
            <h2 className="text-base font-bold text-gray-950">{copy.header[locale]}</h2>
          </div>
          <div className="h-8 w-8 rounded-full bg-emerald-600" aria-hidden="true" />
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2" aria-label={copy.categories[locale]}>
            {tabs.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={activeTab === index}
                className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition ${
                  activeTab === index
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setActiveTab(index)
                  setActiveState(0)
                }}
              >
                {item.label[locale]}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-[310px] rounded-xl bg-white p-4 ring-1 ring-gray-200">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {state[locale]}
              </span>
              <span className="text-xs font-medium text-gray-500">
                {copy.step[locale]} {activeState + 1}/6
              </span>
            </div>

            <div className="mt-5 aspect-[4/3] rounded-xl bg-gradient-to-br from-emerald-100 via-white to-amber-100 p-4">
              <div className="flex h-full flex-col justify-between rounded-lg border border-white/70 bg-white/70 p-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{tab.label[locale]}</p>
                  <h3 className="mt-2 text-xl font-bold leading-tight text-gray-950">{tab.product[locale]}</h3>
                </div>
                <p className="text-sm font-medium text-gray-700">{stateText}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                <span className="text-sm font-semibold text-gray-800">{tab.product[locale]}</span>
                <span className="text-sm font-bold text-gray-950">{copy.price[locale]}</span>
              </div>
              <button
                type="button"
                className="w-full rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                onClick={() => setActiveState((value) => (value + 1) % states.length)}
              >
                {copy.next[locale]}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
