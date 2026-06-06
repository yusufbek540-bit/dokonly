export const MOCK_SHOP_STORAGE_KEY = 'dokonly_mock_shop'

const tenantId = '5a534d64-86d5-4659-b48a-228206f56918'
const prefix = 'dokonly_mock_v2_'

const storageKeys = {
  products: `${prefix}products`,
  categories: `${prefix}categories`,
  orders: `${prefix}orders`,
  returns: `${prefix}returns`,
  wishlist: `${prefix}wishlist`,
  profile: `${prefix}profile`,
  promoCodes: `${prefix}promo_codes`,
  mailings: `${prefix}mailings`,
  stories: `${prefix}stories`,
  team: `${prefix}team`,
  channelPosts: `${prefix}channel_posts`,
  loyaltyConfig: `${prefix}loyalty_config`,
  referralConfig: `${prefix}referral_config`,
}

export function createDemoShop(nowIso = new Date().toISOString()) {
  return {
    id: tenantId,
    name: 'Dokonly Demo Store',
    slug: 'test',
    currency: 'UZS',
    tier: 'business',
    is_active: true,
    created_at: nowIso,
    next_billing_at: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    logo_url: null as string | null,
    cover_url: null as string | null,
    accent_color: 'emerald',
    typography_bundle: 'modern',
    layout: 'boutique',
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
      delivery_methods: [
        { id: 'pickup', label: 'Самовывоз', enabled: true, price: 0 },
        { id: 'delivery', label: 'Доставка курьером', enabled: true, price: 15000 },
        { id: 'discuss', label: 'Обсудить с продавцом', enabled: true, price: 0 },
      ],
      minimum_order_amount: 0,
      required_checkout_fields: ['name', 'phone'],
      stories_enabled: true,
      stories_style: 'instagram',
      featured_banner_enabled: true,
      featured_banner_autorotate: true,
      trust_strip_enabled: true,
      trust_strip_items: ['delivery', 'returns', 'payment', 'rating'],
      categories_enabled: true,
      categories_style: 'scrolling',
      card_style: 'vertical',
      card_columns: 2,
      about_block_enabled: true,
      reviews_enabled: true,
      reviews_min_rating: 1,
      recently_viewed_enabled: true,
      return_policy: 'Возврат можно запросить в течение 14 дней после завершения заказа.',
      manual_transfer: {
        card_number: '8600 0000 0000 0000',
        card_holder: 'DOKONLY DEMO',
        bank_name: 'Demo Bank',
      },
    },
    bot_username: 'dokonlydemobot',
  }
}

export type DemoShop = ReturnType<typeof createDemoShop>

const topLevelSettingKeys = new Set([
  'name',
  'description',
  'logo_url',
  'cover_url',
  'contact_info',
  'accent_color',
  'typography_bundle',
  'layout',
])

export function applyDemoSettingsPatch(shop: DemoShop, patch: Record<string, any>): DemoShop {
  const next: DemoShop = {
    ...shop,
    settings: { ...shop.settings },
    contact_info: { ...shop.contact_info },
  }

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'contact_info' && value && typeof value === 'object') {
      next.contact_info = { ...next.contact_info, ...value }
      continue
    }
    if (topLevelSettingKeys.has(key)) {
      ;(next as any)[key] = value
      if (key === 'accent_color' || key === 'typography_bundle' || key === 'layout') {
        ;(next.settings as any)[key] = value
      }
      continue
    }
    ;(next.settings as any)[key] = value
  }

  return next
}

export function createDemoCategories() {
  return [
    { id: 'cat-1', tenant_id: tenantId, name: 'Одежда', sort_order: 1 },
    { id: 'cat-2', tenant_id: tenantId, name: 'Аксессуары', sort_order: 2 },
    { id: 'cat-3', tenant_id: tenantId, name: 'Подарки', sort_order: 3 },
  ]
}

export function createDemoProducts() {
  return [
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
}

export function createDemoOrders(nowIso = new Date().toISOString()) {
  return [
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
      created_at: nowIso,
      updated_at: nowIso,
      items: [{ id: 'item-1', product_id: 'product-1', product_name: 'Летнее платье', price: 120000, quantity: 1, subtotal: 120000 }],
      meta: {},
    },
  ]
}

export function createDemoProfile() {
  return {
    first_name: 'Demo',
    last_name: 'Buyer',
    username: 'demo_buyer',
    phone: '+998901234567',
    email: null as string | null,
    birthday: null as string | null,
    saved_address: 'Tashkent',
    custom_avatar_url: null as string | null,
    locale: 'ru',
  }
}

export function createDemoPromoCodes() {
  return [{ id: 'promo-1', code: 'DEMO10', discount_type: 'percent', discount_value: 10, is_active: true, min_order_amount: 0 }]
}

export function createDemoMailings(nowIso = new Date().toISOString()) {
  return [{ id: 'mailing-1', title: 'Demo mailing', text: 'Demo text', status: 'draft', created_at: nowIso }]
}

export function createDemoStories() {
  return [
    { id: 'story-1', title: 'Новинки', image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80', is_active: true },
  ]
}

export function createDemoTeam() {
  return [{ id: 'team-1', name: 'Demo Manager', role: 'manager', status: 'active', notifications: { new_orders: true, daily_summary: true } }]
}

export function createDemoChannelPosts(nowIso = new Date().toISOString()) {
  return [{ id: 'post-1', title: 'Пост с товарами', status: 'draft', created_at: nowIso }]
}

export function createDemoReturns() {
  return [] as any[]
}

export function readStored<T>(key: string, fallback: () => T, storage: Pick<Storage, 'getItem'> = localStorage): T {
  try {
    const saved = storage.getItem(key)
    return saved ? JSON.parse(saved) : fallback()
  } catch {
    return fallback()
  }
}

export function writeStored<T>(key: string, value: T, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(key, JSON.stringify(value))
}

export function readDemoShop(storage: Pick<Storage, 'getItem'> = localStorage): DemoShop {
  try {
    const saved = storage.getItem(MOCK_SHOP_STORAGE_KEY)
    if (!saved) return createDemoShop()
    const parsed = JSON.parse(saved)
    return { ...createDemoShop(), ...parsed, settings: { ...createDemoShop().settings, ...(parsed.settings ?? {}) } }
  } catch {
    return createDemoShop()
  }
}

export function writeDemoShop(shop: DemoShop, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(MOCK_SHOP_STORAGE_KEY, JSON.stringify(shop))
}

export function resetDemoState(storage: Storage = localStorage) {
  storage.removeItem(MOCK_SHOP_STORAGE_KEY)
  Object.values(storageKeys).forEach((key) => storage.removeItem(key))
}

export function maybeResetDemoStateFromUrl() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (params.get('mock_reset') !== '1') return
  resetDemoState()
  params.delete('mock_reset')
  const query = params.toString()
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
}

export const readDemoProducts = () => readStored(storageKeys.products, createDemoProducts)
export const writeDemoProducts = (value: any[]) => writeStored(storageKeys.products, value)
export const readDemoCategories = () => readStored(storageKeys.categories, createDemoCategories)
export const writeDemoCategories = (value: any[]) => writeStored(storageKeys.categories, value)
export const readDemoOrders = () => readStored(storageKeys.orders, createDemoOrders)
export const writeDemoOrders = (value: any[]) => writeStored(storageKeys.orders, value)
export const readDemoReturns = () => readStored(storageKeys.returns, createDemoReturns)
export const writeDemoReturns = (value: any[]) => writeStored(storageKeys.returns, value)
export const readDemoWishlist = () => readStored(storageKeys.wishlist, () => ['product-2'])
export const writeDemoWishlist = (value: string[]) => writeStored(storageKeys.wishlist, value)
export const readDemoProfile = () => readStored(storageKeys.profile, createDemoProfile)
export const writeDemoProfile = (value: any) => writeStored(storageKeys.profile, value)
export const readDemoPromoCodes = () => readStored(storageKeys.promoCodes, createDemoPromoCodes)
export const writeDemoPromoCodes = (value: any[]) => writeStored(storageKeys.promoCodes, value)
export const readDemoMailings = () => readStored(storageKeys.mailings, createDemoMailings)
export const writeDemoMailings = (value: any[]) => writeStored(storageKeys.mailings, value)
export const readDemoStories = () => readStored(storageKeys.stories, createDemoStories)
export const writeDemoStories = (value: any[]) => writeStored(storageKeys.stories, value)
export const readDemoTeam = () => readStored(storageKeys.team, createDemoTeam)
export const writeDemoTeam = (value: any[]) => writeStored(storageKeys.team, value)
export const readDemoChannelPosts = () => readStored(storageKeys.channelPosts, createDemoChannelPosts)
export const writeDemoChannelPosts = (value: any[]) => writeStored(storageKeys.channelPosts, value)
export const readDemoLoyaltyConfig = () => readStored(storageKeys.loyaltyConfig, () => ({ enabled: true, points_per_order: 10, points_per_sum: 10000 }))
export const writeDemoLoyaltyConfig = (value: any) => writeStored(storageKeys.loyaltyConfig, value)
export const readDemoReferralConfig = () => readStored(storageKeys.referralConfig, () => ({ enabled: true, reward_type: 'discount', reward_value: 10 }))
export const writeDemoReferralConfig = (value: any) => writeStored(storageKeys.referralConfig, value)

export function findProductName(productId: string, products = readDemoProducts()) {
  return products.find((p: any) => p.id === productId)?.name ?? 'Demo product'
}

export { tenantId }
