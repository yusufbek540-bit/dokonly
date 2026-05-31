import type { FaqItem } from './types'

export const faqs = [
  {
    question: { ru: 'Что такое Dokonly?', uz: 'Dokonly nima?' },
    answer: { ru: 'Dokonly помогает запустить каталог, заказы и CRM для продаж внутри Telegram.', uz: 'Dokonly Telegram ichida katalog, buyurtmalar va CRMni ishga tushirishga yordam beradi.' },
  },
  {
    question: { ru: 'Можно ли запустить магазин без разработчика?', uz: 'Do‘konni dasturchisiz ishga tushirish mumkinmi?' },
    answer: { ru: 'Да, базовый сценарий магазина собирается через готовые настройки.', uz: 'Ha, asosiy do‘kon ssenariysi tayyor sozlamalar orqali yig‘iladi.' },
  },
  {
    question: { ru: 'Подходит ли Dokonly для Telegram-канала?', uz: 'Dokonly Telegram-kanal uchun mosmi?' },
    answer: { ru: 'Да, канал можно использовать как витрину и вести покупателя в бот для заказа.', uz: 'Ha, kanalni vitrina sifatida ishlatib, mijozni buyurtma uchun botga olib borish mumkin.' },
  },
  {
    question: { ru: 'Какие ниши лучше всего подходят?', uz: 'Qaysi sohalar eng mos keladi?' },
    answer: { ru: 'Одежда, косметика, еда, цветы, электроника, товары для дома, детские товары, услуги и курсы.', uz: 'Kiyim, kosmetika, taom, gullar, elektronika, uy mahsulotlari, bolalar mahsulotlari, xizmatlar va kurslar.' },
  },
] satisfies FaqItem[]
