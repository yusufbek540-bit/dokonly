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
  return res.json()
}

export const api = {
  // Public buyer endpoints
  getShop: (slug: string) =>
    request<{
      id: string; name: string; currency: string; logo_url: string | null;
      cover_url?: string | null; accent_color?: string; typography_bundle?: string; settings?: any
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
    request<{ avg_rating: number | null; review_count: number }>(`/api/v1/shop/${tenantId}/stats`),
  validateCoupon: (tenantId: string, code: string, subtotal: number, productIds?: string[]) =>
    request<{ valid: boolean; discount_type: string; discount_value: number; discount_amount: number }>(
      `/api/v1/shop/${tenantId}/coupon?code=${encodeURIComponent(code)}&subtotal=${subtotal}${productIds?.length ? `&product_ids=${productIds.join(',')}` : ''}`,
    ),
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
  cancelOrder: (tenantId: string, orderId: string) =>
    request<{ ok: boolean; status: string }>(`/api/v1/shop/${tenantId}/orders/${orderId}/cancel`, {
      method: 'POST',
    }),
  reviewOrder: (tenantId: string, orderId: string, rating: number, text: string) =>
    request<{ ok: boolean; rating: number }>(`/api/v1/shop/${tenantId}/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, text }),
    }),
  getProductReviews: (tenantId: string, productId: string) =>
    request<{ avg_rating: number | null; count: number; reviews: { rating: number; text: string; reviewer_name: string; created_at: string }[] }>(
      `/api/v1/shop/${tenantId}/products/${productId}/reviews`,
    ),
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
    updateSettings: (body: object) =>
      request<any>('/api/v1/miniapp/settings', { method: 'PATCH', body: JSON.stringify(body) }),
    analytics: (period?: string) => request<any>(`/api/v1/miniapp/analytics/summary${period ? `?period=${period}` : ''}`),
    achievements: () => request<any>('/api/v1/miniapp/achievements'),
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
