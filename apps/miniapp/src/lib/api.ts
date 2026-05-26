const BASE = import.meta.env.VITE_API_URL ?? ''

function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getInitData(),
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const api = {
  // Public buyer endpoints
  getShop: (slug: string) =>
    request<{
      id: string; name: string; currency: string; logo_url: string | null;
      cover_url?: string | null; accent_color?: string; typography_bundle?: string; settings?: any;
      layout?: string
    }>(
      `/api/v1/shop/${slug}`,
    ),
  getShopFull: (slug: string) =>
    request<{
      id: string; name: string; currency: string; logo_url: string | null;
      cover_url: string | null; accent_color: string; typography_bundle: string; settings: any
    }>(`/api/v1/shop/${slug}`),
  getShopRole: (slug: string) =>
    request<{ role: 'owner' | 'buyer'; tenant_id?: string }>(`/api/v1/shop/${slug}/role`),
  getProducts: (tenantId: string) =>
    request<any[]>(`/api/v1/shop/${tenantId}/products`),
  createOrder: (tenantId: string, body: object) =>
    request(`/api/v1/shop/${tenantId}/orders`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getMyOrders: (tenantId: string) =>
    request<any[]>(`/api/v1/shop/${tenantId}/my-orders`),
  getShopStats: (tenantId: string) =>
    request<{ avg_rating: number | null; review_count: number; customer_count: number }>(`/api/v1/shop/${tenantId}/stats`),
  validateCoupon: (tenantId: string, code: string, subtotal: number, productIds?: string[]) =>
    request<{ valid: boolean; discount_type: string; discount_value: number; discount_amount: number }>(
      `/api/v1/shop/${tenantId}/coupon?code=${encodeURIComponent(code)}&subtotal=${subtotal}${productIds?.length ? `&product_ids=${productIds.join(',')}` : ''}`,
    ),
  getStories: (tenantId: string) =>
    request<any[]>(`/api/v1/shop/${tenantId}/stories`),
  checkChannelMembership: (tenantId: string) =>
    request<{ is_member: boolean }>(`/api/v1/shop/${tenantId}/check-channel-membership`),
  getWishlist: (tenantId: string) =>
    request<string[]>(`/api/v1/shop/${tenantId}/wishlist`),
  toggleWishlist: (tenantId: string, productId: string) =>
    request<{ in_wishlist: boolean; product_id: string }>(
      `/api/v1/shop/${tenantId}/wishlist/toggle`,
      { method: 'POST', body: JSON.stringify({ product_id: productId }) },
    ),
  getMyProfile: (tenantId: string) =>
    request<{
      first_name: string; last_name: string; username: string;
      phone: string | null; email: string | null; birthday: string | null;
      saved_address: string | null; custom_avatar_url: string | null; locale: string;
    }>(`/api/v1/shop/${tenantId}/my-profile`),
  updateMyProfile: (tenantId: string, body: object) =>
    request<{ ok: boolean }>(`/api/v1/shop/${tenantId}/my-profile`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMyProfile: (tenantId: string) =>
    request<{ ok: boolean }>(`/api/v1/shop/${tenantId}/my-profile`, {
      method: 'DELETE',
    }),
  cancelOrder: (tenantId: string, orderId: string) =>
    request<{ ok: boolean; status: string }>(`/api/v1/shop/${tenantId}/orders/${orderId}/cancel`, {
      method: 'POST',
    }),
  reviewOrder: (tenantId: string, orderId: string, rating: number, text: string) =>
    request<{ ok: boolean; rating: number }>(`/api/v1/shop/${tenantId}/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, text }),
    }),
  getLoyaltyHistory: (tenantId: string) =>
    request<{ id: string; type: string; points: number; description: string; created_at: string }[]>(
      `/api/v1/shop/${tenantId}/my-loyalty-history`,
    ),
  getMyReferral: (tenantId: string) =>
    request<{
      is_active: boolean; code: string; link: string;
      stats: { invited: number; completed: number; pending: number; earned: number };
      friends: { name: string; status: string; date: string }[]
    }>(`/api/v1/shop/${tenantId}/my-referral`),
  getProductReviews: (tenantId: string, productId: string) =>
    request<{ avg_rating: number | null; count: number; reviews: { rating: number; text: string; reviewer_name: string; created_at: string }[] }>(
      `/api/v1/shop/${tenantId}/products/${productId}/reviews`,
    ),
  aiChat: (tenantId: string, messages: { role: string; content: string }[]) =>
    request<{ reply: string }>(`/api/v1/shop/${tenantId}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
  getMyReturns: (tenantId: string) =>
    request<any[]>(`/api/v1/shop/${tenantId}/my-returns`),
  createReturn: (tenantId: string, body: object) =>
    request<any>(`/api/v1/shop/${tenantId}/returns`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  uploadPaymentScreenshot: async (tenantId: string, orderId: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE}/api/v1/shop/${tenantId}/orders/${orderId}/payment-screenshot`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': getInitData() },
      body: formData,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  getHelpArticles: () =>
    request<{ id: string; title: string; category: string; content: string; slug: string }[]>('/api/v1/public/help-articles'),
  uploadBuyerAvatar: async (tenantId: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE}/api/v1/shop/${tenantId}/profile/avatar`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': getInitData() },
      body: formData,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  resetBuyerAvatar: (tenantId: string) =>
    request<{ ok: boolean }>(`/api/v1/shop/${tenantId}/profile/avatar`, { method: 'DELETE' }),
  createShareIntent: (tenantId: string, productId: string) =>
    request<{ share_id: string; referral_code: string | null; deep_link: string }>(
      `/api/v1/shop/${tenantId}/products/${productId}/share-intent`,
      { method: 'POST' },
    ),
  getRecommendations: (tenantId: string, productId: string) =>
    request<any[]>(`/api/v1/shop/${tenantId}/products/${productId}/recommendations`),

  // Seller Mini App endpoints (Telegram initData auth)
  seller: {
    me: () => request<{ tg_user: any; tenant: any | null }>('/api/v1/miniapp/me'),
    onboard: (body: object) =>
      request<any>('/api/v1/miniapp/onboard', { method: 'POST', body: JSON.stringify(body) }),
    setupBot: (bot_token: string) =>
      request<{ ok: boolean; bot_username: string; mini_app_url: string }>(
        '/api/v1/miniapp/setup-bot',
        { method: 'POST', body: JSON.stringify({ bot_token }) },
      ),
    products: () => request<any[]>('/api/v1/miniapp/products'),
    createProduct: (body: object) =>
      request<any>('/api/v1/miniapp/products', { method: 'POST', body: JSON.stringify(body) }),
    updateProduct: (id: string, body: object) =>
      request<any>(`/api/v1/miniapp/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteProduct: (id: string) =>
      request<void>(`/api/v1/miniapp/products/${id}`, { method: 'DELETE' }),
    orders: (status?: string) =>
      request<any[]>(`/api/v1/miniapp/orders${status ? `?status=${status}` : ''}`),
    customers: (q?: string, segment?: string) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (segment) params.set('segment', segment)
      const suffix = params.toString()
      return request<any[]>(`/api/v1/miniapp/customers${suffix ? `?${suffix}` : ''}`)
    },
    getCustomer: (id: string) =>
      request<any>(`/api/v1/miniapp/customers/${id}`),
    getCustomerNotes: (id: string) =>
      request<{ id: string; content: string; created_at: string }[]>(`/api/v1/miniapp/customers/${id}/notes`),
    addCustomerNote: (id: string, content: string) =>
      request<{ id: string; content: string; created_at: string }>(
        `/api/v1/miniapp/customers/${id}/notes`,
        { method: 'POST', body: JSON.stringify({ content }) },
      ),
    deleteCustomerNote: (id: string, noteId: string) =>
      request<void>(`/api/v1/miniapp/customers/${id}/notes/${noteId}`, { method: 'DELETE' }),
    addCustomerTag: (id: string, tag: string) =>
      request<{ tags: string[] }>(`/api/v1/miniapp/customers/${id}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag }),
      }),
    removeCustomerTag: (id: string, tag: string) =>
      request<void>(`/api/v1/miniapp/customers/${id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
    updateOrderStatus: (id: string, status: string) =>
      request<any>(`/api/v1/miniapp/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updateOrderNote: (id: string, seller_note: string) =>
      request<any>(`/api/v1/miniapp/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ seller_note }),
      }),
    verifyPayment: (id: string) =>
      request<any>(`/api/v1/miniapp/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_status: 'paid' }),
      }),
    updateSettings: (body: object) =>
      request<any>('/api/v1/miniapp/settings', { method: 'PATCH', body: JSON.stringify(body) }),
    analytics: (period?: string) => request<any>(`/api/v1/miniapp/analytics/summary${period ? `?period=${period}` : ''}`),
    viralAnalytics: () => request<any>('/api/v1/miniapp/analytics/viral'),
    abandonedCarts: () => request<{ id: string; customer_name: string; customer_telegram_id?: number; total: number; items_count: number; abandoned_at: string }[]>('/api/v1/miniapp/abandoned-carts'),
    sendAbandonedCartReminder: (cartId: string) =>
      request<{ ok: boolean }>(`/api/v1/miniapp/abandoned-carts/${cartId}/remind`, { method: 'POST' }),
    achievements: () => request<any>('/api/v1/miniapp/achievements'),
    invoices: () => request<{ id: string; amount: number; currency: string; status: string; created_at: string; pdf_url?: string }[]>('/api/v1/miniapp/invoices'),
    streak: () => request<{ current_streak: number; best_streak: number; today_at_risk: boolean; calendar: { date: string; has_orders: boolean }[] }>('/api/v1/miniapp/streak'),
    categories: () => request<any[]>('/api/v1/miniapp/categories'),
    createCategory: (body: object) =>
      request<any>('/api/v1/miniapp/categories', { method: 'POST', body: JSON.stringify(body) }),
    deleteCategory: (id: string) =>
      request<void>(`/api/v1/miniapp/categories/${id}`, { method: 'DELETE' }),
    promoCodes: () => request<any[]>('/api/v1/miniapp/promo-codes'),
    createPromoCode: (body: object) =>
      request<any>('/api/v1/miniapp/promo-codes', { method: 'POST', body: JSON.stringify(body) }),
    deletePromoCode: (id: string) =>
      request<void>(`/api/v1/miniapp/promo-codes/${id}`, { method: 'DELETE' }),
    mailings: () => request<any[]>('/api/v1/miniapp/mailings'),
    createMailing: (body: object) =>
      request<any>('/api/v1/miniapp/mailings', { method: 'POST', body: JSON.stringify(body) }),
    sendMailing: (id: string) =>
      request<any>(`/api/v1/miniapp/mailings/${id}/send`, { method: 'POST' }),
    deleteMailing: (id: string) =>
      request<void>(`/api/v1/miniapp/mailings/${id}`, { method: 'DELETE' }),
    stories: () => request<any[]>('/api/v1/miniapp/stories'),
    createStory: (body: object) =>
      request<any>('/api/v1/miniapp/stories', { method: 'POST', body: JSON.stringify(body) }),
    deleteStory: (id: string) =>
      request<void>(`/api/v1/miniapp/stories/${id}`, { method: 'DELETE' }),
    teamMembers: () => request<any[]>('/api/v1/miniapp/team'),
    inviteTeamMember: (body: object) =>
      request<any>('/api/v1/miniapp/team/invite', { method: 'POST', body: JSON.stringify(body) }),
    removeTeamMember: (id: string) =>
      request<void>(`/api/v1/miniapp/team/${id}`, { method: 'DELETE' }),
    updateTeamMemberNotifications: (id: string, prefs: { new_orders?: boolean; payment_failures?: boolean; low_stock?: boolean; daily_summary?: boolean }) =>
      request<any>(`/api/v1/miniapp/team/${id}/notifications`, { method: 'PATCH', body: JSON.stringify(prefs) }),
    channelPosts: () => request<any[]>('/api/v1/miniapp/channel-posts'),
    createChannelPost: (body: object) =>
      request<any>('/api/v1/miniapp/channel-posts', { method: 'POST', body: JSON.stringify(body) }),
    loyaltyConfig: () => request<any>('/api/v1/miniapp/loyalty-config'),
    updateLoyaltyConfig: (body: object) =>
      request<any>('/api/v1/miniapp/loyalty-config', { method: 'PATCH', body: JSON.stringify(body) }),
    referralConfig: () => request<any>('/api/v1/miniapp/referral-config'),
    updateReferralConfig: (body: object) =>
      request<any>('/api/v1/miniapp/referral-config', { method: 'PATCH', body: JSON.stringify(body) }),
    badges: () => request<{
      products?: number; orders?: number; subscription?: boolean; achievements?: boolean;
    }>('/api/v1/miniapp/dashboard/badges'),
    returns: () => request<any[]>('/api/v1/miniapp/returns'),
    approveReturn: (id: string) =>
      request<any>(`/api/v1/miniapp/returns/${id}/approve`, { method: 'POST' }),
    rejectReturn: (id: string, reason: string) =>
      request<any>(`/api/v1/miniapp/returns/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    markReturnRefunded: (id: string) =>
      request<any>(`/api/v1/miniapp/returns/${id}/refund`, { method: 'POST' }),
    startAiPhotoImport: (photoUrls: string[]) =>
      request<{ id: string; status: string }>('/api/v1/miniapp/ai-imports', {
        method: 'POST',
        body: JSON.stringify({ photo_urls: photoUrls }),
      }),
    getAiImport: (id: string) =>
      request<{
        id: string; status: 'pending' | 'processing' | 'done' | 'failed';
        products: { name: string; description: string; price: number; category: string; images: string[] }[];
        error?: string;
      }>(`/api/v1/miniapp/ai-imports/${id}`),
    generateDescription: (name: string, category?: string) =>
      request<{ description: string }>('/api/v1/miniapp/ai/generate-description', {
        method: 'POST',
        body: JSON.stringify({ name, category }),
      }),
    fillFromPhoto: (imageUrl: string) =>
      request<{ name: string; description: string | null; price: number | null }>('/api/v1/miniapp/ai/fill-from-photo', {
        method: 'POST',
        body: JSON.stringify({ image_url: imageUrl }),
      }),
    removeBackground: (imageUrl: string) =>
      request<{ url: string }>('/api/v1/miniapp/ai/remove-background', {
        method: 'POST',
        body: JSON.stringify({ image_url: imageUrl }),
      }),
    generateMailing: (topic: string, audience?: string) =>
      request<{ text: string; title: string }>('/api/v1/miniapp/ai/generate-mailing', {
        method: 'POST',
        body: JSON.stringify({ topic, audience: audience ?? 'all' }),
      }),
    aiInsights: () =>
      request<{ insights: { type: string; message: string; action?: string }[] }>('/api/v1/miniapp/ai/insights'),
    useStreakFreeze: () =>
      request<{ ok: boolean; freezes_remaining: number }>('/api/v1/miniapp/streak/freeze', { method: 'POST' }),
    createOrderManually: (body: { customer_name: string; customer_phone: string; items: { product_id: string; qty: number; price: number }[]; total: number; payment_method?: string; note?: string }) =>
      request<any>('/api/v1/miniapp/orders/manual', { method: 'POST', body: JSON.stringify(body) }),
    verifyChannelAdmin: (channel_username: string) =>
      request<{ ok: boolean; bot_is_admin: boolean; channel_title?: string }>('/api/v1/miniapp/channel/verify-admin', {
        method: 'POST',
        body: JSON.stringify({ channel_username }),
      }),
    pinChannelCard: () =>
      request<{ ok: boolean; message_id: number }>('/api/v1/miniapp/channel/pin-card', { method: 'POST' }),
    pendingTour: () =>
      request<{ id: string; tour_id: string; current_step: number; total_steps: number } | null>('/api/v1/miniapp/tours/pending'),
    skipTour: (tourId: string) =>
      request<{ ok: boolean }>(`/api/v1/miniapp/tours/${tourId}/skip`, { method: 'POST' }),
    completeTourStep: (tourId: string, step: number) =>
      request<{ ok: boolean }>(`/api/v1/miniapp/tours/${tourId}/step/${step}/complete`, { method: 'POST' }),
    updateTour: (id: string, body: { current_step?: number; status: string }) =>
      request<{ ok: boolean }>(`/api/v1/miniapp/tours/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    uploadFile: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE}/api/v1/miniapp/upload`, {
        method: 'POST',
        headers: { 'X-Telegram-Init-Data': getInitData() },
        body: form,
      }).then(async r => {
        if (!r.ok) throw new Error(await r.text())
        return r.json() as Promise<{ url: string }>
      })
    },
  },
}
