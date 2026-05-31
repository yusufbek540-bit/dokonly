import type { LocalizedRoute, LocalizedText, Niche } from './types'

export const requiredNicheIds = [
  'fashion-boutiques',
  'beauty-cosmetics',
  'food-cafes-bakeries',
  'flowers-gifts',
  'electronics-accessories',
  'home-decor-furniture',
  'kids-products',
  'services-courses-bookings',
] as const

const sharedPainPoints = {
  ru: ['Покупатели спрашивают одно и то же в личке.', 'Заказы сложно собрать в одну понятную очередь.', 'После первой покупки клиента легко потерять.'],
  uz: ['Mijozlar shaxsiy xabarda bir xil savollarni beradi.', 'Buyurtmalarni bitta tushunarli navbatga yig‘ish qiyin.', 'Birinchi xariddan keyin mijozni yo‘qotish oson.'],
}

const sharedBuyerFlow = {
  ru: ['Покупатель открывает Telegram-бот.', 'Выбирает товары или услугу в каталоге.', 'Оформляет заказ без переписки.', 'Продавец видит заказ и данные клиента.'],
  uz: ['Mijoz Telegram-botni ochadi.', 'Katalogdan mahsulot yoki xizmatni tanlaydi.', 'Yozishmasiz buyurtma beradi.', 'Sotuvchi buyurtma va mijoz ma’lumotlarini ko‘radi.'],
}

function niche(
  id: string,
  slug: LocalizedRoute,
  name: LocalizedText,
  promise: LocalizedText,
  description: LocalizedText,
  benefits: { ru: string[]; uz: string[] },
  relatedBlogIds: string[],
): Niche {
  return {
    id,
    slug,
    name,
    h1: { ru: `${name.ru}: продажи в Telegram`, uz: `${name.uz}: Telegram’da savdo` },
    promise,
    description,
    painPoints: sharedPainPoints,
    benefits,
    buyerFlow: sharedBuyerFlow,
    proof: {
      ru: 'Dokonly соединяет каталог, заказы, промокоды и клиентскую базу в одном Telegram-сценарии.',
      uz: 'Dokonly katalog, buyurtmalar, promokodlar va mijozlar bazasini bitta Telegram ssenariysida birlashtiradi.',
    },
    faqs: [
      {
        question: { ru: 'Нужен ли разработчик для запуска?', uz: 'Ishga tushirish uchun dasturchi kerakmi?' },
        answer: { ru: 'Нет, базовый магазин можно собрать через готовые настройки Dokonly.', uz: 'Yo‘q, asosiy do‘konni Dokonly tayyor sozlamalari orqali yig‘ish mumkin.' },
      },
      {
        question: { ru: 'Можно ли вести повторные продажи?', uz: 'Takroriy savdolarni yuritish mumkinmi?' },
        answer: { ru: 'Да, используйте клиентские заметки, теги, промокоды и напоминания.', uz: 'Ha, mijoz izohlari, teglar, promokodlar va eslatmalardan foydalaning.' },
      },
    ],
    image: `/marketing/niches/${id}.jpg`,
    relatedBlogIds,
  }
}

export const niches = [
  niche(
    'fashion-boutiques',
    { ru: '/nishi/odezhda-butiki', uz: '/uz/sohalar/kiyim-butiklar' },
    { ru: 'Одежда и бутики', uz: 'Kiyim va butiklar' },
    { ru: 'Покажите размеры, цвета и остатки так, чтобы заказ не терялся в переписке.', uz: 'O‘lcham, rang va qoldiqlarni ko‘rsating, buyurtma yozishmada yo‘qolmasin.' },
    { ru: 'Для бутиков, шоурумов и продавцов одежды, которые продают через Telegram-канал, личку и рекомендации.', uz: 'Telegram-kanal, shaxsiy xabarlar va tavsiyalar orqali sotadigan butiklar, shourumlar va kiyim sotuvchilari uchun.' },
    {
      ru: ['Карточки с размерами и цветами.', 'Быстрое оформление заказа.', 'Промокоды для сезонных подборок.'],
      uz: ['O‘lcham va rangli kartochkalar.', 'Tez buyurtma rasmiylashtirish.', 'Mavsumiy to‘plamlar uchun promokodlar.'],
    },
    ['boutique-sell-clothes-telegram', 'telegram-channel-sales-showcase'],
  ),
  niche(
    'beauty-cosmetics',
    { ru: '/nishi/kosmetika-krasota', uz: '/uz/sohalar/kosmetika-gozallik' },
    { ru: 'Косметика и красота', uz: 'Kosmetika va go‘zallik' },
    { ru: 'Соберите каталог ухода, наборов и услуг с понятным повторным заказом.', uz: 'Parvarish, to‘plamlar va xizmatlar katalogini takroriy buyurtma bilan yig‘ing.' },
    { ru: 'Для магазинов косметики, мастеров красоты и салонов, которым важны консультации и повторные покупки.', uz: 'Konsultatsiya va takroriy xarid muhim bo‘lgan kosmetika do‘konlari, go‘zallik ustalari va salonlar uchun.' },
    {
      ru: ['Категории по типу ухода.', 'Теги клиентов по интересам.', 'Акции для повторной покупки.'],
      uz: ['Parvarish turi bo‘yicha kategoriyalar.', 'Qiziqishlar bo‘yicha mijoz teglari.', 'Takroriy xarid uchun aksiyalar.'],
    },
    ['cosmetics-repeat-purchases', 'crm-small-telegram-store'],
  ),
  niche(
    'food-cafes-bakeries',
    { ru: '/nishi/eda-kafe-vypechka', uz: '/uz/sohalar/taom-kafe-pishiriqlar' },
    { ru: 'Еда, кафе и выпечка', uz: 'Taom, kafe va pishiriqlar' },
    { ru: 'Принимайте предзаказы, наборы и доставку без ручного списка в чате.', uz: 'Oldindan buyurtma, setlar va yetkazib berishni chatdagi qo‘l ro‘yxatisiz qabul qiling.' },
    { ru: 'Для кафе, пекарен, домашних кондитеров и продавцов готовой еды.', uz: 'Kafe, nonvoyxona, uy qandolatchilari va tayyor taom sotuvchilari uchun.' },
    {
      ru: ['Меню с фото и описанием.', 'Предзаказы к нужной дате.', 'Статусы заказа для команды.'],
      uz: ['Rasm va tavsifli menyu.', 'Kerakli sanaga oldindan buyurtma.', 'Jamoa uchun buyurtma statuslari.'],
    },
    ['cafe-bakery-preorders-telegram', 'telegram-orders-without-chaos'],
  ),
  niche(
    'flowers-gifts',
    { ru: '/nishi/tsvety-podarki', uz: '/uz/sohalar/gullar-sovgalar' },
    { ru: 'Цветы и подарки', uz: 'Gullar va sovg‘alar' },
    { ru: 'Помогите покупателю быстро выбрать букет, подарок и доставку к событию.', uz: 'Mijozga tadbir uchun guldasta, sovg‘a va yetkazib berishni tez tanlashga yordam bering.' },
    { ru: 'Для цветочных, подарочных магазинов и продавцов наборов к праздникам.', uz: 'Gul do‘konlari, sovg‘a do‘konlari va bayram to‘plamlari sotuvchilari uchun.' },
    {
      ru: ['Подборки по событию.', 'Адрес и комментарий в заказе.', 'Промокоды к праздникам.'],
      uz: ['Tadbir bo‘yicha to‘plamlar.', 'Buyurtmada manzil va izoh.', 'Bayramlar uchun promokodlar.'],
    },
    ['flowers-gifts-telegram-store', 'promo-codes-telegram-store'],
  ),
  niche(
    'electronics-accessories',
    { ru: '/nishi/elektronika-aksessuary', uz: '/uz/sohalar/elektronika-aksessuarlar' },
    { ru: 'Электроника и аксессуары', uz: 'Elektronika va aksessuarlar' },
    { ru: 'Покажите характеристики, комплектации и наличие без длинных уточнений.', uz: 'Xususiyat, komplekt va mavjudlikni uzoq aniqlashtirishsiz ko‘rsating.' },
    { ru: 'Для продавцов гаджетов, аксессуаров, комплектующих и сервисных товаров.', uz: 'Gadjetlar, aksessuarlar, ehtiyot qismlar va servis mahsulotlari sotuvchilari uchun.' },
    {
      ru: ['Карточки с характеристиками.', 'Категории по брендам.', 'CRM для гарантийных обращений.'],
      uz: ['Xususiyatli kartochkalar.', 'Brendlar bo‘yicha kategoriyalar.', 'Kafolat murojaatlari uchun CRM.'],
    },
    ['telegram-bot-online-store-guide', 'crm-small-telegram-store'],
  ),
  niche(
    'home-decor-furniture',
    { ru: '/nishi/dom-dekor-mebel', uz: '/uz/sohalar/uy-dekor-mebel' },
    { ru: 'Дом, декор и мебель', uz: 'Uy, dekor va mebel' },
    { ru: 'Продавайте крупные товары и подборки для дома с понятной заявкой.', uz: 'Uy uchun yirik mahsulotlar va to‘plamlarni tushunarli ariza bilan soting.' },
    { ru: 'Для магазинов мебели, декора, текстиля и товаров для дома.', uz: 'Mebel, dekor, tekstil va uy mahsulotlari do‘konlari uchun.' },
    {
      ru: ['Группы по комнатам и стилям.', 'Заявки с параметрами доставки.', 'Заметки по клиентским проектам.'],
      uz: ['Xona va uslub bo‘yicha guruhlar.', 'Yetkazib berish parametrlari bilan arizalar.', 'Mijoz loyihalari bo‘yicha izohlar.'],
    },
    ['telegram-channel-sales-showcase', 'telegram-orders-without-chaos'],
  ),
  niche(
    'kids-products',
    { ru: '/nishi/detskie-tovary', uz: '/uz/sohalar/bolalar-mahsulotlari' },
    { ru: 'Детские товары', uz: 'Bolalar mahsulotlari' },
    { ru: 'Упростите выбор по возрасту, размеру и назначению товара.', uz: 'Yosh, o‘lcham va mahsulot vazifasi bo‘yicha tanlovni soddalashtiring.' },
    { ru: 'Для продавцов игрушек, одежды, ухода, школьных и детских товаров.', uz: 'O‘yinchoq, kiyim, parvarish, maktab va bolalar mahsulotlari sotuvchilari uchun.' },
    {
      ru: ['Фильтрация по возрасту.', 'Повторные предложения для родителей.', 'Акции на наборы и комплекты.'],
      uz: ['Yosh bo‘yicha saralash.', 'Ota-onalar uchun takroriy takliflar.', 'Set va komplektlar uchun aksiyalar.'],
    },
    ['promo-codes-telegram-store', 'recover-abandoned-carts'],
  ),
  niche(
    'services-courses-bookings',
    { ru: '/nishi/uslugi-kursy-zapisi', uz: '/uz/sohalar/xizmatlar-kurslar-yozilish' },
    { ru: 'Услуги, курсы и записи', uz: 'Xizmatlar, kurslar va yozilish' },
    { ru: 'Принимайте заявки на услуги, консультации и курсы прямо в Telegram.', uz: 'Xizmat, konsultatsiya va kurslarga arizalarni Telegram ichida qabul qiling.' },
    { ru: 'Для экспертов, школ, студий, мастеров и сервисных команд.', uz: 'Ekspertlar, maktablar, studiyalar, ustalar va servis jamoalari uchun.' },
    {
      ru: ['Описание программ и услуг.', 'Заявки с контактами клиента.', 'Сегменты для повторных приглашений.'],
      uz: ['Dastur va xizmatlar tavsifi.', 'Mijoz kontaktlari bilan arizalar.', 'Takroriy takliflar uchun segmentlar.'],
    },
    ['telegram-mini-app-sales', 'crm-small-telegram-store'],
  ),
] satisfies Niche[]
