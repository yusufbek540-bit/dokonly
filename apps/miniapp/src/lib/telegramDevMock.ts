const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function noop() {}

function createDevInitData(): string {
  const user = {
    id: Number(import.meta.env.VITE_DEV_TG_USER_ID ?? 777000),
    first_name: import.meta.env.VITE_DEV_TG_FIRST_NAME ?? 'Local',
    username: import.meta.env.VITE_DEV_TG_USERNAME ?? 'local_dev',
    language_code: 'ru',
  }

  return new URLSearchParams({
    query_id: 'dev',
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: 'dev',
  }).toString()
}

export function isLocalTelegramDevMockEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    LOCAL_HOSTS.has(window.location.hostname) &&
    import.meta.env.VITE_DISABLE_TELEGRAM_DEV_MOCK !== '1'
  )
}

export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData ?? (isLocalTelegramDevMockEnabled() ? createDevInitData() : '')
}

function getDevUser() {
  const initData = getTelegramInitData()
  return JSON.parse(new URLSearchParams(initData).get('user') ?? '{}')
}

function getDevTenant() {
  const now = new Date().toISOString()
  return {
    id: '00000000-0000-4000-8000-000000000001',
    owner_id: '00000000-0000-4000-8000-000000000002',
    name: 'Local Dev Shop',
    slug: 'local-dev-shop',
    country: 'UZ',
    currency: 'UZS',
    locale: 'ru',
    tier: 'business',
    subscription_status: 'active',
    bot_username: 'local_dev_bot',
    logo_url: null,
    cover_url: null,
    accent_color: 'emerald',
    typography_bundle: 'modern',
    layout: 'boutique',
    category: 'fashion',
    description: 'Local development store',
    contact_info: {},
    settings: {
      delivery_methods: ['pickup', 'courier'],
      payment_methods: ['cash_on_delivery'],
      notification_preferences: {},
    },
    is_active: true,
    created_at: now,
    updated_at: now,
  }
}

function getDevAnalytics() {
  return {
    total_revenue: 0,
    today_revenue: 0,
    yesterday_revenue: 0,
    total_orders: 0,
    today_orders: 0,
    new_orders: 0,
    product_count: 0,
    customer_count: 0,
    refund_amount: 0,
    top_products: [],
    revenue_series: [],
  }
}

export function getTelegramDevApiResponse<T>(path: string, init?: RequestInit): T | undefined {
  if (!isLocalTelegramDevMockEnabled()) return undefined

  const method = init?.method ?? 'GET'
  const pathname = path.split('?')[0]
  if (method !== 'GET') return { ok: true } as T

  if (pathname === '/api/v1/miniapp/me') {
    return { tg_user: getDevUser(), tenant: getDevTenant() } as T
  }
  if (pathname === '/api/v1/miniapp/analytics/summary') return getDevAnalytics() as T
  if (pathname === '/api/v1/miniapp/analytics/viral') {
    return { shares: 0, clicks: 0, conversions: 0, top_products: [] } as T
  }
  if (pathname === '/api/v1/miniapp/achievements') {
    return { unlocked: [], locked: [], stats: { unlocked_count: 0, total_count: 0 } } as T
  }
  if (pathname === '/api/v1/miniapp/streak') {
    return { current_streak: 0, best_streak: 0, today_at_risk: false, calendar: [] } as T
  }
  if (pathname === '/api/v1/miniapp/dashboard/badges') return {} as T
  if (pathname === '/api/v1/miniapp/tours/pending') return null as T
  if (pathname === '/api/v1/miniapp/subscription') {
    return { tier: 'business', status: 'active', trial_ends_at: null, next_billing_at: null } as T
  }
  if (pathname === '/api/v1/public/help-articles') return [] as T

  const emptyArrayPaths = [
    '/api/v1/miniapp/products',
    '/api/v1/miniapp/orders',
    '/api/v1/miniapp/categories',
    '/api/v1/miniapp/returns',
    '/api/v1/miniapp/promo-codes',
    '/api/v1/miniapp/mailings',
    '/api/v1/miniapp/stories',
    '/api/v1/miniapp/abandoned-carts',
    '/api/v1/miniapp/team',
    '/api/v1/miniapp/invoices',
    '/api/v1/miniapp/channel-posts',
    '/api/v1/miniapp/customers',
  ]
  if (emptyArrayPaths.includes(pathname)) return [] as T

  return undefined
}

export function installTelegramDevMock() {
  if (!isLocalTelegramDevMockEnabled()) return
  if (window.Telegram?.WebApp?.initData) return

  const initData = createDevInitData()
  const user = JSON.parse(new URLSearchParams(initData).get('user') ?? '{}')
  const mainButton = {
    text: '',
    color: '#00B383',
    textColor: '#ffffff',
    isVisible: false,
    isActive: true,
    show: noop,
    hide: noop,
    enable: noop,
    disable: noop,
    setText: noop,
    onClick: noop,
    offClick: noop,
    setParams: noop,
  }

  window.Telegram = {
    ...window.Telegram,
    WebApp: {
      ready: noop,
      expand: noop,
      close: noop,
      disableVerticalSwipes: noop,
      requestFullscreen: noop,
      initData,
      initDataUnsafe: { user },
      MainButton: mainButton,
      BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
      HapticFeedback: {
        impactOccurred: noop,
        notificationOccurred: noop,
        selectionChanged: noop,
      },
      colorScheme: 'light',
      viewportHeight: window.innerHeight,
      safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      isFullscreen: false,
      openLink: (url: string) => window.open(url, '_blank'),
      openTelegramLink: (url: string) => window.open(url, '_blank'),
      switchInlineQuery: noop,
      shareToStory: noop,
      onEvent: noop,
      offEvent: noop,
    } as any,
  }
}
