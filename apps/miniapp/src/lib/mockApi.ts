import {
  applyDemoSettingsPatch,
  findProductName,
  maybeResetDemoStateFromUrl,
  readDemoCategories,
  readDemoChannelPosts,
  readDemoLoyaltyConfig,
  readDemoMailings,
  readDemoOrders,
  readDemoProducts,
  readDemoProfile,
  readDemoPromoCodes,
  readDemoReferralConfig,
  readDemoReturns,
  readDemoShop,
  readDemoStories,
  readDemoTeam,
  readDemoWishlist,
  tenantId,
  writeDemoCategories,
  writeDemoChannelPosts,
  writeDemoLoyaltyConfig,
  writeDemoMailings,
  writeDemoOrders,
  writeDemoProducts,
  writeDemoProfile,
  writeDemoPromoCodes,
  writeDemoReferralConfig,
  writeDemoReturns,
  writeDemoShop,
  writeDemoStories,
  writeDemoTeam,
  writeDemoWishlist,
} from './mockApiState'

let resetChecked = false

const now = () => new Date().toISOString()

const achievements = [
  {
    id: 'first_product',
    category: 'milestone',
    icon: 'box',
    name_ru: 'Первый товар',
    desc_ru: 'Добавьте первый товар в каталог.',
    tier: 'bronze',
    unlocked: true,
    unlocked_at: now(),
  },
  {
    id: 'first_order',
    category: 'milestone',
    icon: 'cart',
    name_ru: 'Первый заказ',
    desc_ru: 'Получите первый заказ через Telegram-магазин.',
    tier: 'bronze',
    unlocked: true,
    unlocked_at: now(),
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

function body(init?: RequestInit) {
  if (!init?.body) return {}
  try {
    return JSON.parse(String(init.body))
  } catch {
    return {}
  }
}

function idFromPath(path: string, prefix: string) {
  return path.slice(prefix.length).split('/')[0]
}

function segmentFromEnd(path: string, offset: number) {
  const parts = path.split('/')
  return parts[parts.length - offset]
}

function upsertById(list: any[], item: any) {
  const idx = list.findIndex((entry) => entry.id === item.id)
  if (idx === -1) return [item, ...list]
  return list.map((entry) => (entry.id === item.id ? item : entry))
}

function normalizeProduct(input: any, existing?: any) {
  const products = readDemoProducts()
  const categories = readDemoCategories()
  const category = categories.find((cat: any) => cat.id === input.category_id || cat.name === input.category)
  const id = existing?.id ?? `product-${Date.now()}`
  return {
    ...existing,
    ...input,
    id,
    tenant_id: tenantId,
    currency: input.currency ?? existing?.currency ?? 'UZS',
    price: Number(input.price ?? existing?.price ?? 0),
    compare_at_price: input.compare_at_price ?? input.compare_price ?? existing?.compare_at_price ?? null,
    category_id: input.category_id ?? category?.id ?? existing?.category_id ?? null,
    category_name: input.category_name ?? input.category ?? category?.name ?? existing?.category_name ?? 'Без категории',
    images: input.images ?? existing?.images ?? [],
    is_active: input.is_active ?? existing?.is_active ?? true,
    stock: Number(input.stock ?? existing?.stock ?? 0),
    sort_order: input.sort_order ?? existing?.sort_order ?? products.length + 1,
    attributes: input.attributes ?? existing?.attributes ?? {},
    created_at: existing?.created_at ?? now(),
    updated_at: now(),
  }
}

function createOrderFromCheckout(input: any) {
  const products = readDemoProducts()
  const profile = readDemoProfile()
  const rawItems = input.items ?? input.cart_items ?? []
  const items = rawItems.map((item: any, index: number) => {
    const product = products.find((p: any) => p.id === item.product_id || p.id === item.id)
    const quantity = Number(item.quantity ?? item.qty ?? 1)
    const price = Number(item.price ?? product?.price ?? 0)
    return {
      id: item.id ?? `item-${Date.now()}-${index}`,
      product_id: item.product_id ?? item.id,
      product_name: item.product_name ?? product?.name ?? findProductName(item.product_id ?? item.id, products),
      price,
      quantity,
      subtotal: price * quantity,
    }
  })
  const subtotal = Number(input.subtotal ?? items.reduce((sum: number, item: any) => sum + item.subtotal, 0))
  const discount = Number(input.discount ?? input.discount_amount ?? 0)
  const deliveryPrice = Number(input.delivery_price ?? 0)
  const paymentMethod = input.payment_method ?? input.paymentMethod ?? 'cash'
  const createdAt = now()
  return {
    id: `order-${Date.now()}`,
    status: 'new',
    payment_method: paymentMethod,
    payment_status: paymentMethod === 'cash' ? 'pending' : 'pending',
    subtotal,
    discount,
    delivery_price: deliveryPrice,
    total: Number(input.total ?? Math.max(0, subtotal - discount + deliveryPrice)),
    currency: 'UZS',
    customer_name: input.customer_name ?? input.name ?? `${profile.first_name} ${profile.last_name}`.trim(),
    customer_phone: input.customer_phone ?? input.phone ?? profile.phone,
    customer_telegram_id: 20001,
    delivery_type: input.delivery_type ?? input.deliveryMethod ?? 'pickup',
    delivery_address: input.delivery_address ?? input.address ?? profile.saved_address,
    customer_note: input.customer_note ?? input.note ?? '',
    seller_note: '',
    created_at: createdAt,
    updated_at: createdAt,
    items,
    meta: {
      ...(input.meta ?? {}),
      coupon_code: input.coupon_code ?? input.couponCode ?? null,
      payment_screenshot: input.payment_screenshot ?? input.paymentScreenshot ?? null,
    },
  }
}

function createManualOrder(input: any) {
  return createOrderFromCheckout({
    ...input,
    items: (input.items ?? []).map((item: any) => ({
      product_id: item.product_id,
      quantity: item.qty ?? item.quantity ?? 1,
      price: item.price,
    })),
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    payment_method: input.payment_method ?? 'cash',
    customer_note: input.note ?? '',
    total: input.total,
  })
}

function updateOrder(id: string, patch: Record<string, any>) {
  const orders = readDemoOrders()
  const updated = orders.map((order: any) =>
    order.id === id
      ? { ...order, ...patch, meta: { ...(order.meta ?? {}), ...(patch.meta ?? {}) }, updated_at: now() }
      : order,
  )
  writeDemoOrders(updated)
  return updated.find((order: any) => order.id === id) ?? { ok: true }
}

function createReturn(orderId: string, input: any) {
  const order = readDemoOrders().find((entry: any) => entry.id === orderId)
  const created = {
    id: `return-${Date.now()}`,
    order_id: orderId,
    order,
    status: 'requested',
    reason: input.reason,
    description: input.description,
    item_ids: input.item_ids ?? [],
    photos: input.photos ?? [],
    resolution_type: input.resolution_type ?? 'refund',
    refund_amount: order?.total ?? 0,
    created_at: now(),
    updated_at: now(),
  }
  const returns = readDemoReturns()
  writeDemoReturns([created, ...returns])
  updateOrder(orderId, { status: 'return_requested', meta: { return_id: created.id } })
  return created
}

function updateReturn(id: string, patch: Record<string, any>) {
  const returns = readDemoReturns()
  const updated = returns.map((entry: any) => (entry.id === id ? { ...entry, ...patch, updated_at: now() } : entry))
  writeDemoReturns(updated)
  return updated.find((entry: any) => entry.id === id) ?? { ok: true }
}

function validateCoupon(code: string, subtotal: number) {
  const coupon = readDemoPromoCodes().find((entry: any) => entry.code?.toLowerCase() === code.toLowerCase() && entry.is_active !== false)
  if (!coupon) return { valid: false, discount_type: 'none', discount_value: 0, discount_amount: 0 }
  const discountAmount = coupon.discount_type === 'fixed'
    ? Number(coupon.discount_value ?? 0)
    : Math.round((subtotal * Number(coupon.discount_value ?? 0)) / 100)
  return {
    valid: true,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value ?? 0),
    discount_amount: Math.min(subtotal, discountAmount),
  }
}

export function isMockApiEnabled() {
  if (!resetChecked) {
    maybeResetDemoStateFromUrl()
    resetChecked = true
  }
  return new URLSearchParams(window.location.search).get('mock_api') === '1'
}

export function mockUpload(file?: File) {
  return { url: file ? URL.createObjectURL(file) : 'https://placehold.co/900x900?text=Dokonly' }
}

export async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, window.location.origin)
  const pathname = url.pathname
  const method = init?.method ?? 'GET'
  const demoShop = readDemoShop()
  const products = readDemoProducts()
  const categories = readDemoCategories()
  const orders = readDemoOrders()

  if (path === '/api/v1/miniapp/me') {
    return ok({ tg_user: (window as any).Telegram?.WebApp?.initDataUnsafe?.user, tenant: role() === 'owner' ? demoShop : null }) as T
  }

  if (path === '/api/v1/miniapp/onboard' && method === 'POST') return ok(demoShop) as T
  if (path === '/api/v1/miniapp/setup-bot' && method === 'POST') {
    return ok({ ok: true, bot_username: 'dokonlydemobot', mini_app_url: `${window.location.origin}?shop=test&mock_api=1` }) as T
  }

  if (path === '/api/v1/shop/test/role') return ok({ role: role(), tenant_id: tenantId }) as T
  if (path === '/api/v1/shop/test') return ok(demoShop) as T
  if (path.startsWith('/api/v1/shop/test?')) return ok(demoShop) as T
  if (path === `/api/v1/shop/${tenantId}/products`) return ok(products.filter((p: any) => p.is_active !== false)) as T
  if (path === `/api/v1/shop/${tenantId}/stats`) return ok({ avg_rating: 4.8, review_count: 18, customer_count: 124 }) as T
  if (path === `/api/v1/shop/${tenantId}/stories`) return ok(readDemoStories().filter((story: any) => story.is_active !== false)) as T
  if (path === `/api/v1/shop/${tenantId}/check-channel-membership`) return ok({ is_member: true }) as T
  if (path === `/api/v1/shop/${tenantId}/wishlist`) return ok(readDemoWishlist()) as T
  if (path === `/api/v1/shop/${tenantId}/wishlist/toggle` && method === 'POST') {
    const productId = body(init).product_id
    const wishlist = readDemoWishlist()
    const inWishlist = !wishlist.includes(productId)
    writeDemoWishlist(inWishlist ? [productId, ...wishlist] : wishlist.filter((id) => id !== productId))
    return ok({ in_wishlist: inWishlist, product_id: productId }) as T
  }
  if (path === `/api/v1/shop/${tenantId}/my-profile`) {
    if (method === 'PATCH') {
      const updated = { ...readDemoProfile(), ...body(init) }
      writeDemoProfile(updated)
      return ok({ ok: true, ...updated }) as T
    }
    if (method === 'DELETE') {
      const updated = { ...readDemoProfile(), phone: null, email: null, birthday: null, saved_address: null, custom_avatar_url: null }
      writeDemoProfile(updated)
      return ok({ ok: true }) as T
    }
    return ok(readDemoProfile()) as T
  }
  if (path === `/api/v1/shop/${tenantId}/profile/avatar` && method === 'DELETE') {
    writeDemoProfile({ ...readDemoProfile(), custom_avatar_url: null })
    return ok({ ok: true }) as T
  }
  if (path === `/api/v1/shop/${tenantId}/my-orders`) return ok(readDemoOrders()) as T
  if (path === `/api/v1/shop/${tenantId}/orders` && method === 'POST') {
    const created = createOrderFromCheckout(body(init))
    writeDemoOrders([created, ...readDemoOrders()])
    return ok(created) as T
  }
  if (pathname === `/api/v1/shop/${tenantId}/coupon`) {
    return ok(validateCoupon(url.searchParams.get('code') ?? '', Number(url.searchParams.get('subtotal') ?? 0))) as T
  }
  if (pathname.startsWith(`/api/v1/shop/${tenantId}/orders/`) && pathname.endsWith('/cancel') && method === 'POST') {
    const id = segmentFromEnd(pathname, 2)
    return ok(updateOrder(id, { status: 'cancelled' })) as T
  }
  if (pathname.startsWith(`/api/v1/shop/${tenantId}/orders/`) && pathname.endsWith('/review') && method === 'POST') {
    const id = segmentFromEnd(pathname, 2)
    return ok(updateOrder(id, { meta: { review: body(init) } })) as T
  }
  if (pathname.startsWith(`/api/v1/shop/${tenantId}/orders/`) && pathname.endsWith('/payment-screenshot') && method === 'POST') {
    const id = segmentFromEnd(pathname, 2)
    return ok(updateOrder(id, { meta: { payment_screenshot: 'uploaded' } })) as T
  }
  if (path === `/api/v1/shop/${tenantId}/my-returns`) return ok(readDemoReturns()) as T
  if (path === `/api/v1/shop/${tenantId}/returns` && method === 'POST') return ok(createReturn(body(init).order_id, body(init))) as T
  if (pathname.includes('/reviews')) return ok({ avg_rating: 4.8, count: 2, reviews: [{ rating: 5, text: 'Отлично', reviewer_name: 'Demo Buyer', created_at: now() }] }) as T
  if (pathname.includes('/recommendations')) return ok(products.slice(0, 2)) as T
  if (pathname.endsWith('/share-intent')) return ok({ share_id: `share-${Date.now()}`, referral_code: 'DEMO', deep_link: `${window.location.origin}?shop=test` }) as T
  if (pathname.endsWith('/share-prepare')) return ok({ id: `mock-prepared-${Date.now()}` }) as T
  if (path === `/api/v1/shop/${tenantId}/my-loyalty-history`) return ok([{ id: 'loyalty-1', type: 'earn', points: 10, description: 'Demo order reward', created_at: now() }]) as T
  if (path === `/api/v1/shop/${tenantId}/my-referral`) {
    return ok({ is_active: true, code: 'DEMO', link: `${window.location.origin}?shop=test&ref=DEMO`, stats: { invited: 2, completed: 1, pending: 1, earned: 12000 }, friends: [] }) as T
  }
  if (pathname.includes('/ai/chat')) return ok({ reply: 'Demo javob: bu mahsulot omborda bor, buyurtma berishingiz mumkin.' }) as T
  if (path === '/api/v1/public/help-articles') return ok([{ id: '1', slug: 'how-to-order', title: 'Как сделать заказ', category: 'orders', content: 'Выберите товар, добавьте в корзину и оформите заказ.' }]) as T

  if (path === '/api/v1/miniapp/products') {
    if (method === 'POST') {
      const created = normalizeProduct(body(init))
      writeDemoProducts([created, ...products])
      return ok(created) as T
    }
    return ok(products) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/products/')) {
    const id = idFromPath(pathname, '/api/v1/miniapp/products/')
    const existing = products.find((p: any) => p.id === id)
    if (method === 'PATCH') {
      const updated = normalizeProduct(body(init), existing)
      writeDemoProducts(upsertById(products, updated))
      return ok(updated) as T
    }
    if (method === 'DELETE') {
      writeDemoProducts(products.filter((p: any) => p.id !== id))
      return ok({ ok: true }) as T
    }
  }
  if (path === '/api/v1/miniapp/categories') {
    if (method === 'POST') {
      const created = { id: `cat-${Date.now()}`, tenant_id: tenantId, sort_order: categories.length + 1, ...body(init) }
      writeDemoCategories([created, ...categories])
      return ok(created) as T
    }
    return ok(categories) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/categories/') && method === 'DELETE') {
    const id = idFromPath(pathname, '/api/v1/miniapp/categories/')
    writeDemoCategories(categories.filter((cat: any) => cat.id !== id))
    return ok({ ok: true }) as T
  }
  if (path === '/api/v1/miniapp/orders/manual' && method === 'POST') {
    const created = createManualOrder(body(init))
    writeDemoOrders([created, ...readDemoOrders()])
    return ok(created) as T
  }
  if (pathname === '/api/v1/miniapp/orders') {
    const status = url.searchParams.get('status')
    return ok(status ? orders.filter((order: any) => order.status === status) : orders) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/orders/') && pathname.endsWith('/status') && method === 'PATCH') {
    const id = segmentFromEnd(pathname, 2)
    return ok(updateOrder(id, body(init))) as T
  }
  if (path === '/api/v1/miniapp/settings' && method === 'PATCH') {
    const updatedShop = applyDemoSettingsPatch(demoShop, body(init))
    writeDemoShop(updatedShop)
    return ok(updatedShop) as T
  }
  if (path === '/api/v1/miniapp/settings') return ok(demoShop) as T

  if (pathname.includes('/analytics/summary')) {
    const currentOrders = readDemoOrders()
    const totalRevenue = currentOrders.reduce((sum: number, order: any) => sum + Number(order.total ?? 0), 0)
    return ok({
      total_revenue: totalRevenue,
      total_orders: currentOrders.length,
      new_orders: currentOrders.filter((order: any) => order.status === 'new').length,
      product_count: readDemoProducts().length,
      today_revenue: totalRevenue,
      today_orders: currentOrders.length,
      yesterday_revenue: 280000,
      customers: 12,
      conversion_rate: 8.4,
      returns_count: readDemoReturns().length,
    }) as T
  }
  if (pathname.includes('/analytics/viral')) return ok({ shares: 14, referral_orders: 3 }) as T
  if (path === '/api/v1/miniapp/dashboard/badges') {
    return ok({ products: readDemoProducts().length, orders: readDemoOrders().length, subscription: false, achievements: true }) as T
  }
  if (path === '/api/v1/miniapp/achievements') {
    return ok({
      achievements,
      unlocked_count: achievements.filter((a) => a.unlocked).length,
      total_count: achievements.length,
    }) as T
  }
  if (path === '/api/v1/miniapp/promo-codes') {
    const promoCodes = readDemoPromoCodes()
    if (method === 'POST') {
      const created = { id: `promo-${Date.now()}`, is_active: true, ...body(init) }
      writeDemoPromoCodes([created, ...promoCodes])
      return ok(created) as T
    }
    return ok(promoCodes) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/promo-codes/') && method === 'DELETE') {
    const id = idFromPath(pathname, '/api/v1/miniapp/promo-codes/')
    writeDemoPromoCodes(readDemoPromoCodes().filter((promo: any) => promo.id !== id))
    return ok({ ok: true }) as T
  }
  if (path === '/api/v1/miniapp/abandoned-carts') return ok([{ id: 'cart-1', customer_name: 'Demo Buyer', customer_telegram_id: 20001, total: 120000, items_count: 1, abandoned_at: now() }]) as T
  if (pathname.startsWith('/api/v1/miniapp/abandoned-carts/') && pathname.endsWith('/remind')) return ok({ ok: true }) as T
  if (path === '/api/v1/miniapp/mailings') {
    const mailings = readDemoMailings()
    if (method === 'POST') {
      const created = { id: `mailing-${Date.now()}`, status: 'draft', created_at: now(), ...body(init) }
      writeDemoMailings([created, ...mailings])
      return ok(created) as T
    }
    return ok(mailings) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/mailings/')) {
    const id = idFromPath(pathname, '/api/v1/miniapp/mailings/')
    if (pathname.endsWith('/send')) {
      const updated = readDemoMailings().map((mailing: any) => (mailing.id === id ? { ...mailing, status: 'sent', sent_at: now() } : mailing))
      writeDemoMailings(updated)
      return ok(updated.find((mailing: any) => mailing.id === id)) as T
    }
    if (method === 'DELETE') {
      writeDemoMailings(readDemoMailings().filter((mailing: any) => mailing.id !== id))
      return ok({ ok: true }) as T
    }
  }
  if (path === '/api/v1/miniapp/stories') {
    const stories = readDemoStories()
    if (method === 'POST') {
      const payload = body(init)
      const created = {
        id: `${payload.kind === 'banner' ? 'banner' : 'story'}-${Date.now()}`,
        is_active: true,
        sort_order: stories.length,
        ...payload,
        media_url: payload.media_url ?? payload.image_url ?? '',
        image_url: payload.image_url ?? payload.media_url ?? '',
      }
      writeDemoStories([...stories, created])
      return ok(created) as T
    }
    return ok([...stories].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/stories/') && method === 'PATCH') {
    const id = idFromPath(pathname, '/api/v1/miniapp/stories/')
    const payload = body(init)
    const updated = readDemoStories().map((story: any) => {
      if (story.id !== id) return story
      return {
        ...story,
        ...payload,
        media_url: payload.media_url ?? payload.image_url ?? story.media_url ?? story.image_url ?? '',
        image_url: payload.image_url ?? payload.media_url ?? story.image_url ?? story.media_url ?? '',
        updated_at: now(),
      }
    })
    writeDemoStories(updated)
    return ok(updated.find((story: any) => story.id === id)) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/stories/') && method === 'DELETE') {
    const id = idFromPath(pathname, '/api/v1/miniapp/stories/')
    writeDemoStories(readDemoStories().filter((story: any) => story.id !== id))
    return ok({ ok: true }) as T
  }
  if (path === '/api/v1/miniapp/team') return ok(readDemoTeam()) as T
  if (path === '/api/v1/miniapp/team/invite' && method === 'POST') {
    const created = { id: `team-${Date.now()}`, status: 'invited', ...body(init) }
    writeDemoTeam([created, ...readDemoTeam()])
    return ok(created) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/team/') && pathname.endsWith('/notifications') && method === 'PATCH') {
    const id = segmentFromEnd(pathname, 2)
    const updated = readDemoTeam().map((member: any) => (member.id === id ? { ...member, notifications: { ...(member.notifications ?? {}), ...body(init) } } : member))
    writeDemoTeam(updated)
    return ok(updated.find((member: any) => member.id === id)) as T
  }
  if (pathname.startsWith('/api/v1/miniapp/team/') && method === 'DELETE') {
    const id = idFromPath(pathname, '/api/v1/miniapp/team/')
    writeDemoTeam(readDemoTeam().filter((member: any) => member.id !== id))
    return ok({ ok: true }) as T
  }
  if (path === '/api/v1/miniapp/channel-posts') {
    const posts = readDemoChannelPosts()
    if (method === 'POST') {
      const created = { id: `post-${Date.now()}`, status: 'draft', created_at: now(), ...body(init) }
      writeDemoChannelPosts([created, ...posts])
      return ok(created) as T
    }
    return ok(posts) as T
  }
  if (path === '/api/v1/miniapp/loyalty-config') {
    if (method === 'PATCH') {
      const updated = { ...readDemoLoyaltyConfig(), ...body(init) }
      writeDemoLoyaltyConfig(updated)
      return ok(updated) as T
    }
    return ok(readDemoLoyaltyConfig()) as T
  }
  if (path === '/api/v1/miniapp/referral-config') {
    if (method === 'PATCH') {
      const updated = { ...readDemoReferralConfig(), ...body(init) }
      writeDemoReferralConfig(updated)
      return ok(updated) as T
    }
    return ok(readDemoReferralConfig()) as T
  }
  if (path === '/api/v1/miniapp/returns') return ok(readDemoReturns()) as T
  if (pathname.startsWith('/api/v1/miniapp/returns/')) {
    const id = idFromPath(pathname, '/api/v1/miniapp/returns/')
    if (pathname.endsWith('/approve')) return ok(updateReturn(id, { status: 'approved' })) as T
    if (pathname.endsWith('/reject')) return ok(updateReturn(id, { status: 'rejected', rejection_reason: body(init).reason })) as T
    if (pathname.endsWith('/refund')) return ok(updateReturn(id, { status: 'refunded', refunded_at: now() })) as T
  }
  if (pathname.includes('/ai-imports')) return ok({ id: 'ai-import-1', status: 'done', products: [] }) as T
  if (pathname.includes('/ai/')) return ok({ description: 'Demo AI generated text', title: 'Demo', text: 'Demo campaign text', insights: [] }) as T
  if (path === '/api/v1/miniapp/invoices') return ok([]) as T
  if (path === '/api/v1/miniapp/streak') return ok({ current_streak: 3, best_streak: 5, today_at_risk: false, calendar: [] }) as T
  if (path === '/api/v1/miniapp/streak/freeze') return ok({ ok: true, freezes_remaining: 1 }) as T
  if (path === '/api/v1/miniapp/channel/verify-admin') return ok({ ok: true, bot_is_admin: true, channel_title: 'Demo Channel' }) as T
  if (path === '/api/v1/miniapp/channel/pin-card') return ok({ ok: true, message_id: 101 }) as T
  if (path === '/api/v1/miniapp/tours/pending') return ok(null) as T
  if (pathname.includes('/api/v1/miniapp/tours/')) return ok({ ok: true }) as T

  return ok({ ok: true }) as T
}
