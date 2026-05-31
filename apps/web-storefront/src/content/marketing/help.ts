import type { HelpArticle, Locale, LocalizedRoute, LocalizedText } from './types'

export const requiredHelpIds = [
  'getting-started',
  'create-store',
  'connect-telegram-bot',
  'add-products',
  'import-products',
  'manage-orders',
  'payments',
  'delivery',
  'customers-crm',
  'promos',
  'cart-reminders',
  'channel-integration',
  'analytics',
  'troubleshooting',
] as const

function article(
  id: string,
  slug: LocalizedRoute,
  categoryId: string,
  title: LocalizedText,
  relatedArticleIds: string[],
): HelpArticle {
  return {
    id,
    slug,
    categoryId,
    title,
    description: {
      ru: 'Короткая инструкция по настройке Dokonly для продаж в Telegram.',
      uz: 'Telegram’da savdo qilish uchun Dokonly sozlamalari bo‘yicha qisqa yo‘riqnoma.',
    },
    steps: {
      ru: ['Откройте нужный раздел Dokonly.', 'Проверьте обязательные поля и заполните данные магазина.', 'Сохраните изменения и протестируйте путь покупателя в Telegram.'],
      uz: ['Dokonly ichida kerakli bo‘limni oching.', 'Majburiy maydonlarni tekshiring va do‘kon ma’lumotlarini kiriting.', 'O‘zgarishlarni saqlang va Telegram’da mijoz yo‘lini sinab ko‘ring.'],
    },
    relatedArticleIds,
  }
}

export const helpArticles = [
  article(
    'getting-started',
    { ru: '/pomoshch/kak-nachat', uz: '/uz/yordam/qanday-boshlash' },
    'start',
    { ru: 'Как начать работу с Dokonly', uz: 'Dokonly bilan qanday boshlash kerak' },
    ['create-store', 'connect-telegram-bot'],
  ),
  article(
    'create-store',
    { ru: '/pomoshch/sozdat-magazin', uz: '/uz/yordam/dokon-yaratish' },
    'start',
    { ru: 'Как создать магазин', uz: 'Do‘konni qanday yaratish kerak' },
    ['getting-started', 'add-products'],
  ),
  article(
    'connect-telegram-bot',
    { ru: '/pomoshch/podklyuchit-telegram-bot', uz: '/uz/yordam/telegram-botni-ulash' },
    'start',
    { ru: 'Как подключить Telegram-бот', uz: 'Telegram-botni qanday ulash kerak' },
    ['create-store', 'troubleshooting'],
  ),
  article(
    'add-products',
    { ru: '/pomoshch/dobavit-tovary', uz: '/uz/yordam/mahsulot-qoshish' },
    'catalog',
    { ru: 'Как добавить товары', uz: 'Mahsulotlarni qanday qo‘shish kerak' },
    ['import-products', 'manage-orders'],
  ),
  article(
    'import-products',
    { ru: '/pomoshch/import-tovarov', uz: '/uz/yordam/mahsulot-importi' },
    'catalog',
    { ru: 'Как импортировать товары', uz: 'Mahsulotlarni qanday import qilish kerak' },
    ['add-products', 'troubleshooting'],
  ),
  article(
    'manage-orders',
    { ru: '/pomoshch/upravlenie-zakazami', uz: '/uz/yordam/buyurtmalarni-boshqarish' },
    'orders',
    { ru: 'Как управлять заказами', uz: 'Buyurtmalarni qanday boshqarish kerak' },
    ['payments', 'delivery'],
  ),
  article(
    'payments',
    { ru: '/pomoshch/oplata', uz: '/uz/yordam/tolov' },
    'orders',
    { ru: 'Как настроить оплату', uz: 'To‘lovni qanday sozlash kerak' },
    ['manage-orders', 'delivery'],
  ),
  article(
    'delivery',
    { ru: '/pomoshch/dostavka', uz: '/uz/yordam/yetkazib-berish' },
    'orders',
    { ru: 'Как настроить доставку', uz: 'Yetkazib berishni qanday sozlash kerak' },
    ['manage-orders', 'payments'],
  ),
  article(
    'customers-crm',
    { ru: '/pomoshch/klienty-crm', uz: '/uz/yordam/mijozlar-crm' },
    'growth',
    { ru: 'Как работать с клиентами и CRM', uz: 'Mijozlar va CRM bilan qanday ishlash kerak' },
    ['promos', 'cart-reminders'],
  ),
  article(
    'promos',
    { ru: '/pomoshch/promokody', uz: '/uz/yordam/promokodlar' },
    'growth',
    { ru: 'Как создавать промокоды', uz: 'Promokodlarni qanday yaratish kerak' },
    ['customers-crm', 'cart-reminders'],
  ),
  article(
    'cart-reminders',
    { ru: '/pomoshch/napominaniya-o-korzine', uz: '/uz/yordam/savat-eslatmalari' },
    'growth',
    { ru: 'Как работают напоминания о корзине', uz: 'Savat eslatmalari qanday ishlaydi' },
    ['promos', 'customers-crm'],
  ),
  article(
    'channel-integration',
    { ru: '/pomoshch/integratsiya-kanala', uz: '/uz/yordam/kanal-integratsiyasi' },
    'growth',
    { ru: 'Как связать магазин с Telegram-каналом', uz: 'Do‘konni Telegram-kanal bilan qanday bog‘lash kerak' },
    ['analytics', 'promos'],
  ),
  article(
    'analytics',
    { ru: '/pomoshch/analitika', uz: '/uz/yordam/analitika' },
    'growth',
    { ru: 'Как смотреть аналитику', uz: 'Analitikani qanday ko‘rish kerak' },
    ['channel-integration', 'customers-crm'],
  ),
  article(
    'troubleshooting',
    { ru: '/pomoshch/nepoladki', uz: '/uz/yordam/muammolar' },
    'support',
    { ru: 'Что делать, если что-то не работает', uz: 'Biror narsa ishlamasa nima qilish kerak' },
    ['connect-telegram-bot', 'import-products'],
  ),
] satisfies HelpArticle[]

export function getHelpArticleBySlug(slug: string, locale: Locale) {
  return helpArticles.find((article) => article.slug[locale].split('/').pop() === slug) ?? null
}

export function getRelatedHelpArticles(currentId: string) {
  return helpArticles.filter((article) => article.id !== currentId).slice(0, 4)
}
