export const MOCK_SHOP_STORAGE_KEY = 'dokonly_mock_shop'

const tenantId = '5a534d64-86d5-4659-b48a-228206f56918'

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
        { id: 'delivery', label: 'Доставка курьером', enabled: false, price: 0 },
        { id: 'discuss', label: 'Обсудить с продавцом', enabled: false, price: 0 },
      ],
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

export function readDemoShop(storage: Pick<Storage, 'getItem'> = localStorage): DemoShop {
  try {
    const saved = storage.getItem(MOCK_SHOP_STORAGE_KEY)
    if (!saved) return createDemoShop()
    return { ...createDemoShop(), ...JSON.parse(saved) }
  } catch {
    return createDemoShop()
  }
}

export function writeDemoShop(shop: DemoShop, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(MOCK_SHOP_STORAGE_KEY, JSON.stringify(shop))
}

export function resetDemoShop(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(MOCK_SHOP_STORAGE_KEY)
}
