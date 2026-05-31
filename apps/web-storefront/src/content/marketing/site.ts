import { marketingRoutes } from './routes'

export const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dokonly.com'
export const createStoreBotUrl = process.env.NEXT_PUBLIC_CREATE_STORE_BOT_URL ?? 'https://t.me/dokonlybot'
export const telegramExampleUrl = process.env.NEXT_PUBLIC_DEMO_BOT_URL ?? ''

export const navigation = [
  { label: { ru: 'Продукт', uz: 'Mahsulot' }, href: marketingRoutes.home },
  { label: { ru: 'Ниши', uz: 'Sohalar' }, href: marketingRoutes.niches },
  { label: { ru: 'Демо', uz: 'Namuna' }, href: marketingRoutes.demo },
  { label: { ru: 'Тарифы', uz: 'Tariflar' }, href: marketingRoutes.pricing },
  { label: { ru: 'Блог', uz: 'Blog' }, href: marketingRoutes.blog },
  { label: { ru: 'Помощь', uz: 'Yordam' }, href: marketingRoutes.help },
]

export const ctas = {
  createStore: { label: { ru: 'Создать магазин', uz: 'Do‘kon yaratish' }, href: { ru: createStoreBotUrl, uz: createStoreBotUrl } },
  viewDemo: { label: { ru: 'Посмотреть пример', uz: 'Namunani ko‘rish' }, href: marketingRoutes.demo },
  openTelegramExample: { label: { ru: 'Открыть пример в Telegram', uz: 'Telegram’da namunani ochish' }, href: { ru: telegramExampleUrl, uz: telegramExampleUrl } },
  leadOffer: { label: { ru: 'Получить пример магазина для моей ниши + консультацию', uz: 'Mening soham uchun do‘kon namunasi va konsultatsiya olish' }, href: marketingRoutes.contact },
}

export const homeCopy = {
  seo: {
    title: {
      ru: 'Dokonly - Telegram-магазин за 10 минут',
      uz: 'Dokonly - Telegram do‘kon 10 daqiqada',
    },
    description: {
      ru: 'Запустите каталог, прием заказов, промокоды и CRM для продаж в Telegram без разработчика.',
      uz: 'Telegram ichida katalog, buyurtmalar, promokodlar va CRMni dasturchisiz ishga tushiring.',
    },
  },
  hero: {
    h1: { ru: 'Запустите магазин в Telegram за 10 минут', uz: 'Telegram’da do‘konni 10 daqiqada ishga tushiring' },
    body: {
      ru: 'Dokonly помогает продавцам принимать заказы, показывать каталог, возвращать покупателей и управлять клиентами прямо в Telegram.',
      uz: 'Dokonly sotuvchilarga katalog ko‘rsatish, buyurtma qabul qilish, mijozlarni qaytarish va Telegram ichida savdoni boshqarishga yordam beradi.',
    },
  },
  trust: {
    ru: ['Без разработчика', 'Каталог и заказы в Telegram', 'Промокоды и брошенные корзины', 'CRM для повторных продаж'],
    uz: ['Dasturchisiz', 'Katalog va buyurtmalar Telegram’da', 'Promokodlar va tashlab ketilgan savatlar', 'Takroriy savdolar uchun CRM'],
  },
  problems: {
    ru: ['Заказы теряются в личных сообщениях.', 'Продавец снова и снова отвечает на одни и те же вопросы.', 'Покупатели забывают товары в корзине.', 'Нет простой CRM для повторных продаж.', 'Telegram-канал дает внимание, но не всегда приводит к заказам.'],
    uz: ['Buyurtmalar shaxsiy xabarlarda yo‘qolib ketadi.', 'Sotuvchi bir xil savollarga qayta-qayta javob beradi.', 'Mijozlar savatdagi mahsulotlarni unutib qo‘yadi.', 'Takroriy savdolar uchun sodda CRM yo‘q.', 'Telegram-kanal e’tibor beradi, lekin har doim buyurtmaga olib kelmaydi.'],
  },
  solutions: {
    ru: ['Удобный каталог.', 'Единый путь оформления заказа.', 'Панель заказов для продавца.', 'Заметки и теги по клиентам.', 'Промокоды.', 'Напоминания о корзине.', 'Сценарии для бота и канала.'],
    uz: ['Qulay katalog.', 'Buyurtmani rasmiylashtirishning yagona yo‘li.', 'Sotuvchi uchun buyurtmalar paneli.', 'Mijozlar bo‘yicha izohlar va teglar.', 'Promokodlar.', 'Savat eslatmalari.', 'Bot va kanal uchun ssenariylar.'],
  },
}
