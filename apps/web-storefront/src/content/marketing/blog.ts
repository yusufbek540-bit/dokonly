import type { BlogPost, LocalizedRoute, LocalizedText } from './types'

export const requiredBlogIds = [
  'create-telegram-store-uzbekistan',
  'telegram-mini-app-sales',
  'telegram-orders-without-chaos',
  'telegram-bot-online-store-guide',
  'boutique-sell-clothes-telegram',
  'cosmetics-repeat-purchases',
  'cafe-bakery-preorders-telegram',
  'flowers-gifts-telegram-store',
  'promo-codes-telegram-store',
  'recover-abandoned-carts',
  'crm-small-telegram-store',
  'telegram-channel-sales-showcase',
] as const

function post(
  id: string,
  slug: LocalizedRoute,
  title: LocalizedText,
  category: LocalizedText,
  relatedNicheIds: string[],
): BlogPost {
  return {
    id,
    slug,
    title,
    description: {
      ru: 'Практическая статья для продавцов, которые хотят продавать в Telegram системно и без лишней ручной работы.',
      uz: 'Telegram’da tartibli va ortiqcha qo‘l mehnatisiz sotmoqchi bo‘lgan sotuvchilar uchun amaliy maqola.',
    },
    category,
    date: '2026-05-31',
    readingMinutes: 5,
    body: {
      ru: [
        'Начните с понятного каталога: покупатель должен видеть товар, цену, условия и следующий шаг без длинной переписки.',
        'Разделите путь покупателя на простые действия: выбор, корзина, контакты, подтверждение и обработка заказа продавцом.',
        'После запуска добавьте промокоды, напоминания и клиентские теги, чтобы возвращать покупателей к повторным заказам.',
      ],
      uz: [
        'Tushunarli katalogdan boshlang: mijoz mahsulot, narx, shartlar va keyingi qadamni uzoq yozishmasiz ko‘rishi kerak.',
        'Mijoz yo‘lini oddiy harakatlarga ajrating: tanlash, savat, kontaktlar, tasdiqlash va sotuvchi tomonidan ishlov berish.',
        'Ishga tushirgandan keyin promokodlar, eslatmalar va mijoz teglarini qo‘shib, xaridorlarni takroriy buyurtmaga qaytaring.',
      ],
    },
    relatedNicheIds,
  }
}

export const blogPosts = [
  post(
    'create-telegram-store-uzbekistan',
    { ru: '/blog/kak-sozdat-telegram-magazin-v-uzbekistane', uz: '/uz/blog/ozbekistonda-telegram-dokon-yaratish' },
    { ru: 'Как создать Telegram-магазин в Узбекистане', uz: 'O‘zbekistonda Telegram-do‘konni qanday yaratish mumkin' },
    { ru: 'Запуск', uz: 'Ishga tushirish' },
    ['fashion-boutiques', 'beauty-cosmetics'],
  ),
  post(
    'telegram-mini-app-sales',
    { ru: '/blog/mini-prilozhenie-telegram-dlya-prodazh', uz: '/uz/blog/savdo-uchun-telegram-mini-ilovasi' },
    { ru: 'Мини-приложение Telegram для продаж: что это и кому подходит', uz: 'Savdo uchun Telegram mini-ilovasi: bu nima va kimga mos' },
    { ru: 'Продукт', uz: 'Mahsulot' },
    ['services-courses-bookings', 'electronics-accessories'],
  ),
  post(
    'telegram-orders-without-chaos',
    { ru: '/blog/zakazy-v-telegram-bez-haosa', uz: '/uz/blog/telegramda-buyurtmalarni-tartibli-qabul-qilish' },
    { ru: 'Как принимать заказы в Telegram без хаоса в личке', uz: 'Telegram’da buyurtmalarni tartibli qabul qilish' },
    { ru: 'Заказы', uz: 'Buyurtmalar' },
    ['food-cafes-bakeries', 'home-decor-furniture'],
  ),
  post(
    'telegram-bot-online-store-guide',
    { ru: '/blog/telegram-bot-dlya-internet-magazina', uz: '/uz/blog/internet-dokon-uchun-telegram-bot' },
    { ru: 'Telegram-бот для интернет-магазина: пошаговый гид', uz: 'Internet-do‘kon uchun Telegram-bot: bosqichma-bosqich qo‘llanma' },
    { ru: 'Гид', uz: 'Qo‘llanma' },
    ['electronics-accessories', 'kids-products'],
  ),
  post(
    'boutique-sell-clothes-telegram',
    { ru: '/blog/kak-butiku-prodavat-odezhdu-v-telegram', uz: '/uz/blog/butik-telegram-orqali-kiyim-sotishi' },
    { ru: 'Как бутику продавать одежду через Telegram', uz: 'Butik Telegram orqali kiyimni qanday sotishi mumkin' },
    { ru: 'Ниши', uz: 'Sohalar' },
    ['fashion-boutiques'],
  ),
  post(
    'cosmetics-repeat-purchases',
    { ru: '/blog/kosmetika-povtornye-pokupki', uz: '/uz/blog/kosmetika-takroriy-xaridlar' },
    { ru: 'Как магазину косметики увеличить повторные покупки', uz: 'Kosmetika do‘koni takroriy xaridlarni qanday oshiradi' },
    { ru: 'Повторные продажи', uz: 'Takroriy savdo' },
    ['beauty-cosmetics'],
  ),
  post(
    'cafe-bakery-preorders-telegram',
    { ru: '/blog/kafe-pekarnya-predzakazy-v-telegram', uz: '/uz/blog/kafe-nonvoyxona-oldindan-buyurtma' },
    { ru: 'Как кафе и пекарне принимать предзаказы в Telegram', uz: 'Kafe va nonvoyxonalar Telegram’da oldindan buyurtma qabul qilishi' },
    { ru: 'Предзаказы', uz: 'Oldindan buyurtma' },
    ['food-cafes-bakeries'],
  ),
  post(
    'flowers-gifts-telegram-store',
    { ru: '/blog/telegram-magazin-dlya-tsvetov-i-podarkov', uz: '/uz/blog/gullar-sovgalar-uchun-telegram-dokon' },
    { ru: 'Telegram-магазин для цветов и подарков', uz: 'Gullar va sovg‘alar uchun Telegram-do‘kon' },
    { ru: 'Ниши', uz: 'Sohalar' },
    ['flowers-gifts'],
  ),
  post(
    'promo-codes-telegram-store',
    { ru: '/blog/promokody-dlya-telegram-magazina', uz: '/uz/blog/telegram-dokon-uchun-promokodlar' },
    { ru: 'Промокоды для Telegram-магазина: идеи кампаний', uz: 'Telegram-do‘kon uchun promokod kampaniyalari' },
    { ru: 'Маркетинг', uz: 'Marketing' },
    ['flowers-gifts', 'kids-products'],
  ),
  post(
    'recover-abandoned-carts',
    { ru: '/blog/vernut-pokupateley-s-broshennoy-korziny', uz: '/uz/blog/tashlab-ketilgan-savatdan-mijozni-qaytarish' },
    { ru: 'Как вернуть покупателей с брошенной корзины', uz: 'Tashlab ketilgan savatdan mijozni qanday qaytarish mumkin' },
    { ru: 'Возврат покупателей', uz: 'Mijozni qaytarish' },
    ['kids-products', 'fashion-boutiques'],
  ),
  post(
    'crm-small-telegram-store',
    { ru: '/blog/crm-dlya-malenkogo-telegram-magazina', uz: '/uz/blog/kichik-telegram-dokon-uchun-crm' },
    { ru: 'CRM для маленького Telegram-магазина', uz: 'Kichik Telegram-do‘kon uchun CRM' },
    { ru: 'CRM', uz: 'CRM' },
    ['beauty-cosmetics', 'services-courses-bookings'],
  ),
  post(
    'telegram-channel-sales-showcase',
    { ru: '/blog/telegram-kanal-vitrina-prodazh', uz: '/uz/blog/telegram-kanal-savdo-vitrinasi' },
    { ru: 'Как превратить Telegram-канал в витрину продаж', uz: 'Telegram-kanalni savdo vitrinasiga aylantirish' },
    { ru: 'Канал', uz: 'Kanal' },
    ['fashion-boutiques', 'home-decor-furniture'],
  ),
] satisfies BlogPost[]
