const tenantId = '5a534d64-86d5-4659-b48a-228206f56918'
const now = new Date().toISOString()

const shop = {
  id: tenantId,
  name: 'Dokonly Demo Store',
  slug: 'test',
  currency: 'UZS',
  tier: 'business',
  is_active: true,
  created_at: now,
  next_billing_at: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
  logo_url: null,
  cover_url: null,
  accent_color: 'emerald',
  typography_bundle: 'modern',
  description: 'Demo Telegram do‘koni',
  contact_info: {
    telegram: '@dokonly_support',
    phone: '+998 90 123 45 67',
  },
  settings: {
    business_category: 'fashion',
    description: 'Kiyim va aksessuarlar uchun demo katalog',
    owner_tg_id: '10001',
    ai_consultant_enabled: true,
    channel_subscription_gate: false,
    payment_methods: ['cash', 'manual_transfer'],
    manual_transfer: {
      card_number: '8600 0000 0000 0000',
      card_holder: 'DOKONLY DEMO',
      bank_name: 'Demo Bank',
    },
  },
  bot_username: 'dokonlydemobot',
}

const products = [
  {
    id: 'product-1',
    tenant_id: tenantId,
    name: 'Летнее платье',
    description: 'Легкое платье для Telegram-витрины. Есть размеры S, M, L.',
    price: 120000,
    compare_at_price: 160000,
    currency: 'UZS',
    category_id: 'cat-1',
    category_name: 'Одежда',
    images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80'],
    is_active: true,
    stock: 12,
    sort_order: 1,
    attributes: { sizes: ['S', 'M', 'L'], colors: ['Белый', 'Зеленый'] },
  },
  {
    id: 'product-2',
    tenant_id: tenantId,
    name: 'Мини сумка',
    description: 'Аксессуар для повторных продаж и рекомендаций.',
    price: 95000,
    compare_at_price: null,
    currency: 'UZS',
    category_id: 'cat-2',
    category_name: 'Аксессуары',
    images: ['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80'],
    is_active: true,
    stock: 8,
    sort_order: 2,
    attributes: { colors: ['Черный', 'Бежевый'] },
  },
  {
    id: 'product-3',
    tenant_id: tenantId,
    name: 'Подарочный набор',
    description: 'Товар для теста корзины, промокода и оформления заказа.',
    price: 180000,
    compare_at_price: 210000,
    currency: 'UZS',
    category_id: 'cat-3',
    category_name: 'Подарки',
    images: ['https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80'],
    is_active: true,
    stock: 5,
    sort_order: 3,
    attributes: {},
  },
]

const orders = [
  {
    id: 'order-1',
    status: 'new',
    payment_method: 'cash',
    payment_status: 'pending',
    subtotal: 120000,
    discount: 0,
    total: 120000,
    currency: 'UZS',
    customer_name: 'Demo Buyer',
    customer_phone: '+998901234567',
    customer_telegram_id: 20001,
    delivery_type: 'delivery',
    delivery_address: 'Tashkent, demo address',
    customer_note: 'Проверочный заказ',
    seller_note: '',
    created_at: now,
    items: [{ id: 'item-1', product_id: 'product-1', product_name: 'Летнее платье', price: 120000, quantity: 1, subtotal: 120000 }],
  },
]

const categories = [
  { id: 'cat-1', tenant_id: tenantId, name: 'Одежда', sort_order: 1 },
  { id: 'cat-2', tenant_id: tenantId, name: 'Аксессуары', sort_order: 2 },
  { id: 'cat-3', tenant_id: tenantId, name: 'Подарки', sort_order: 3 },
]

const achievements = [
  {
    id: 'first_product',
    category: 'milestone',
    icon: 'box',
    name_ru: 'Первый товар',
    desc_ru: 'Добавьте первый товар в каталог.',
    tier: 'bronze',
    unlocked: true,
    unlocked_at: now,
  },
  {
    id: 'first_order',
    category: 'milestone',
    icon: 'cart',
    name_ru: 'Первый заказ',
    desc_ru: 'Получите первый заказ через Telegram-магазин.',
    tier: 'bronze',
    unlocked: true,
    unlocked_at: now,
  },
  {
    id: 'repeat_sales',
    category: 'feature',
    icon: 'refresh',
    name_ru: 'Повторные продажи',
    desc_ru: 'Запустите промокоды, рассылку или возврат брошенной корзины.',
    tier: 'silver',
    unlocked: false,
    progress: 1,
    target: 3,
  },
]

function role() {
  return new URLSearchParams(window.location.search).get('mock_role') === 'owner' ? 'owner' : 'buyer'
}

function ok(body: unknown) {
  return body
}

export function isMockApiEnabled() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get('mock_api') === '1'
}

export function mockUpload(file?: File) {
  return { url: file ? URL.createObjectURL(file) : 'https://placehold.co/900x900?text=Dokonly' }
}

export async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, window.location.origin)
  const method = init?.method ?? 'GET'

  if (path === '/api/v1/miniapp/me') {
    return ok({ tg_user: (window as any).Telegram?.WebApp?.initDataUnsafe?.user, tenant: role() === 'owner' ? shop : null }) as T
  }

  if (path === '/api/v1/miniapp/onboard' && method === 'POST') return ok(shop) as T
  if (path === '/api/v1/miniapp/setup-bot' && method === 'POST') {
    return ok({ ok: true, bot_username: 'dokonlydemobot', mini_app_url: `${window.location.origin}?shop=test&mock_api=1` }) as T
  }

  if (path === '/api/v1/shop/test/role') return ok({ role: role(), tenant_id: tenantId }) as T
  if (path.startsWith('/api/v1/shop/test')) return ok(shop) as T
  if (path === `/api/v1/shop/${tenantId}/products`) return ok(products) as T
  if (path === `/api/v1/shop/${tenantId}/stats`) return ok({ avg_rating: 4.8, review_count: 18, customer_count: 124 }) as T
  if (path === `/api/v1/shop/${tenantId}/stories`) return ok([]) as T
  if (path === `/api/v1/shop/${tenantId}/wishlist`) return ok(['product-2']) as T
  if (path === `/api/v1/shop/${tenantId}/wishlist/toggle`) return ok({ in_wishlist: true, product_id: 'product-1' }) as T
  if (path === `/api/v1/shop/${tenantId}/my-profile`) {
    return ok({ first_name: 'Demo', last_name: 'Buyer', username: 'demo_buyer', phone: '+998901234567', email: null, birthday: null, saved_address: 'Tashkent', custom_avatar_url: null, locale: 'ru' }) as T
  }
  if (path === `/api/v1/shop/${tenantId}/my-orders`) return ok(orders) as T
  if (path === `/api/v1/shop/${tenantId}/orders` && method === 'POST') return ok({ ...orders[0], id: `order-${Date.now()}` }) as T
  if (url.pathname.endsWith('/coupon')) return ok({ valid: true, discount_type: 'percent', discount_value: 10, discount_amount: 12000 }) as T
  if (path.includes('/reviews')) return ok({ avg_rating: 4.8, count: 2, reviews: [{ rating: 5, text: 'Отлично', reviewer_name: 'Demo Buyer', created_at: now }] }) as T
  if (path.includes('/recommendations')) return ok(products.slice(0, 2)) as T
  if (path.includes('/ai/chat')) return ok({ reply: 'Demo javob: bu mahsulot omborda bor, buyurtma berishingiz mumkin.' }) as T
  if (path === '/api/v1/public/help-articles') return ok([{ id: '1', slug: 'how-to-order', title: 'Как сделать заказ', category: 'orders', content: 'Выберите товар, добавьте в корзину и оформите заказ.' }]) as T

  if (path === '/api/v1/miniapp/products') return ok(products) as T
  if (path === '/api/v1/miniapp/categories') return ok(categories) as T
  if (path === '/api/v1/miniapp/orders' || path.startsWith('/api/v1/miniapp/orders?')) return ok(orders) as T
  if (path.includes('/status') || path.includes('/cancel') || method === 'PATCH' || method === 'POST' || method === 'DELETE') {
    if (path.includes('/products')) return ok(products[0]) as T
    if (path.includes('/categories')) return ok(categories[0]) as T
    if (path.includes('/promo-codes')) return ok({ id: 'promo-1', code: 'DEMO10', discount_type: 'percent', discount_value: 10 }) as T
    return ok({ ok: true, id: 'mock-id', status: 'ok' }) as T
  }
  if (path === '/api/v1/miniapp/settings') return ok(shop) as T
  if (path.includes('/analytics/summary')) {
    return ok({
      total_revenue: 2400000,
      total_orders: 18,
      new_orders: 3,
      product_count: products.length,
      today_revenue: 360000,
      today_orders: 3,
      yesterday_revenue: 280000,
      customers: 12,
      conversion_rate: 8.4,
    }) as T
  }
  if (path.includes('/analytics/viral')) return ok({ shares: 14, referral_orders: 3 }) as T
  if (path === '/api/v1/miniapp/dashboard/badges') return ok({ products: 3, orders: 1, subscription: false, achievements: true }) as T
  if (path === '/api/v1/miniapp/achievements') {
    return ok({
      achievements,
      unlocked_count: achievements.filter((a) => a.unlocked).length,
      total_count: achievements.length,
    }) as T
  }
  if (path === '/api/v1/miniapp/promo-codes') return ok([{ id: 'promo-1', code: 'DEMO10', discount_type: 'percent', discount_value: 10, is_active: true }]) as T
  if (path === '/api/v1/miniapp/abandoned-carts') return ok([{ id: 'cart-1', customer_name: 'Demo Buyer', customer_telegram_id: 20001, total: 120000, items_count: 1, abandoned_at: now }]) as T
  if (path === '/api/v1/miniapp/mailings') return ok([{ id: 'mailing-1', title: 'Demo mailing', text: 'Demo text', status: 'draft' }]) as T
  if (path === '/api/v1/miniapp/stories') return ok([]) as T
  if (path === '/api/v1/miniapp/team') return ok([]) as T
  if (path === '/api/v1/miniapp/channel-posts') return ok([]) as T
  if (path === '/api/v1/miniapp/loyalty-config') return ok({ enabled: true, points_per_order: 10 }) as T
  if (path === '/api/v1/miniapp/referral-config') return ok({ enabled: true, reward_type: 'discount', reward_value: 10 }) as T
  if (path === '/api/v1/miniapp/returns') return ok([]) as T
  if (path.includes('/ai/')) return ok({ description: 'Demo AI generated text', title: 'Demo', text: 'Demo campaign text', insights: [] }) as T
  if (path === '/api/v1/miniapp/invoices') return ok([]) as T
  if (path === '/api/v1/miniapp/streak') return ok({ current_streak: 3, best_streak: 5, today_at_risk: false, calendar: [] }) as T
  if (path === '/api/v1/miniapp/tours/pending') return ok(null) as T

  return ok({ ok: true }) as T
}
