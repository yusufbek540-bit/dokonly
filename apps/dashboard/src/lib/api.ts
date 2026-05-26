import { useAuth } from '@/store/auth'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuth.getState().token
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  // Platform Ops
  platform: {
    stats: () => request<any>('/api/v1/platform/stats'),
    activity: () => request<any[]>('/api/v1/platform/activity'),
    tenants: (params?: { q?: string; tier?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.q) qs.set('q', params.q)
      if (params?.tier) qs.set('tier', params.tier)
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/platform/tenants?${qs}`)
    },
    tenant: (id: string) => request<any>(`/api/v1/platform/tenants/${id}`),
    updateTenant: (id: string, body: object) =>
      request<any>(`/api/v1/platform/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    suspendTenant: (id: string, reason: string) =>
      request<any>(`/api/v1/platform/tenants/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
    unsuspendTenant: (id: string) =>
      request<any>(`/api/v1/platform/tenants/${id}/unsuspend`, { method: 'POST' }),
    tenantActivity: (id: string) => request<any[]>(`/api/v1/platform/tenants/${id}/activity`),
    tenantSubscription: (id: string) => request<any>(`/api/v1/platform/tenants/${id}/subscription`),
    tenantProducts: (id: string) => request<any>(`/api/v1/platform/tenants/${id}/products`),
    tenantTeam: (id: string) => request<any[]>(`/api/v1/platform/tenants/${id}/team`),
    tenantNotes: (id: string) => request<any[]>(`/api/v1/platform/tenants/${id}/notes`),
    addTenantNote: (id: string, content: string) =>
      request<any>(`/api/v1/platform/tenants/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
    impersonateTenant: (id: string, justification: string) =>
      request<{ token: string; url: string }>(`/api/v1/platform/tenants/${id}/impersonate`, { method: 'POST', body: JSON.stringify({ justification }) }),
    tenantOrders: (id: string) => request<any>(`/api/v1/platform/tenants/${id}/orders`),
    orders: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/platform/orders?${qs}`)
    },
    subscriptions: (params?: { q?: string; tier?: string; status?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.q) qs.set('q', params.q)
      if (params?.tier) qs.set('tier', params.tier)
      if (params?.status) qs.set('status', params.status)
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/platform/subscriptions?${qs}`)
    },
    extendTrial: (id: string, days: number) =>
      request<any>(`/api/v1/platform/subscriptions/${id}/extend-trial`, { method: 'POST', body: JSON.stringify({ days }) }),
    cancelSubscription: (id: string) =>
      request<any>(`/api/v1/platform/subscriptions/${id}/cancel`, { method: 'POST' }),
    invoices: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/platform/invoices?${qs}`)
    },
    refunds: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/platform/refunds?${qs}`)
    },
    failedPayments: () => request<any[]>('/api/v1/platform/failed-payments'),
    issueRefund: (invoiceId: string, amount: number, reason: string) =>
      request<any>(`/api/v1/platform/invoices/${invoiceId}/refund`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
    analytics: {
      growth: () => request<any>('/api/v1/platform/analytics/growth'),
      revenue: () => request<any>('/api/v1/platform/analytics/revenue'),
      aiCosts: () => request<any>('/api/v1/platform/analytics/ai-costs'),
      productUsage: () => request<any>('/api/v1/platform/analytics/product-usage'),
    },
    team: () => request<any[]>('/api/v1/platform/team'),
    inviteTeamMember: (body: { email: string; role: string }) =>
      request<any>('/api/v1/platform/team/invite', { method: 'POST', body: JSON.stringify(body) }),
    removeTeamMember: (id: string) =>
      request<void>(`/api/v1/platform/team/${id}`, { method: 'DELETE' }),
    auditLog: (params?: { action?: string; user_id?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.action) qs.set('action', params.action)
      if (params?.user_id) qs.set('user_id', params.user_id)
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/platform/audit?${qs}`)
    },
    systemStatus: () => request<any>('/api/v1/platform/status'),
    config: {
      countries: () => request<any>('/api/v1/platform/config/countries'),
      updateCountries: (body: object) => request<any>('/api/v1/platform/config/countries', { method: 'PATCH', body: JSON.stringify(body) }),
      paymentProviders: () => request<any>('/api/v1/platform/config/payment-providers'),
      updatePaymentProviders: (body: object) => request<any>('/api/v1/platform/config/payment-providers', { method: 'PATCH', body: JSON.stringify(body) }),
      features: () => request<any>('/api/v1/platform/config/features'),
      updateFeatures: (body: object) => request<any>('/api/v1/platform/config/features', { method: 'PATCH', body: JSON.stringify(body) }),
      aiConfig: () => request<any>('/api/v1/platform/config/ai'),
      updateAiConfig: (body: object) => request<any>('/api/v1/platform/config/ai', { method: 'PATCH', body: JSON.stringify(body) }),
    },
    helpArticles: () =>
      request<{ id: string; title: string; category: string; content: string; slug: string; published?: boolean }[]>('/api/v1/platform/content/help-articles'),
    createHelpArticle: (body: object) =>
      request<any>('/api/v1/platform/content/help-articles', { method: 'POST', body: JSON.stringify(body) }),
    updateHelpArticle: (id: string, body: object) =>
      request<any>(`/api/v1/platform/content/help-articles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteHelpArticle: (id: string) =>
      request<void>(`/api/v1/platform/content/help-articles/${id}`, { method: 'DELETE' }),
    auth: {
      setup2fa: () => request<{ qr_url: string; secret: string }>('/api/v1/platform/auth/setup-2fa'),
      verify2fa: (code: string) => request<{ ok: boolean; token?: string }>('/api/v1/platform/auth/verify-2fa', {
        method: 'POST', body: JSON.stringify({ code }),
      }),
      status2fa: () => request<{ enabled: boolean; required: boolean }>('/api/v1/platform/auth/2fa-status'),
    },
  },
  notifications: {
    list: () => request<{ id: string; type: string; title: string; body?: string; action_url?: string; read_at?: string; created_at: string }[]>('/api/v1/notifications'),
    markRead: (id: string) => request<void>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request<void>('/api/v1/notifications/read-all', { method: 'POST' }),
  },
  merchant: {
    subscription: () => request<any>('/api/v1/miniapp/subscription'),
    invoices: () => request<any[]>('/api/v1/miniapp/invoices'),
    upgradePlan: (plan: string) => request<any>('/api/v1/miniapp/subscription/upgrade', { method: 'POST', body: JSON.stringify({ plan }) }),
    analytics: (period?: string) => request<any>(`/api/v1/miniapp/analytics/summary${period ? `?period=${period}` : ''}`),
    customers: (params?: { q?: string; segment?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.q) qs.set('q', params.q)
      if (params?.segment) qs.set('segment', params.segment)
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/miniapp/customers?${qs}`)
    },
    customer: (id: string) => request<any>(`/api/v1/miniapp/customers/${id}`),
    customerNotes: (id: string) => request<{ id: string; content: string; created_at: string }[]>(`/api/v1/miniapp/customers/${id}/notes`),
    addCustomerNote: (id: string, content: string) =>
      request<{ id: string; content: string; created_at: string }>(`/api/v1/miniapp/customers/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
    deleteCustomerNote: (id: string, noteId: string) =>
      request<void>(`/api/v1/miniapp/customers/${id}/notes/${noteId}`, { method: 'DELETE' }),
    addCustomerTag: (id: string, tag: string) =>
      request<{ tags: string[] }>(`/api/v1/miniapp/customers/${id}/tags`, { method: 'POST', body: JSON.stringify({ tag }) }),
    removeCustomerTag: (id: string, tag: string) =>
      request<{ tags: string[] }>(`/api/v1/miniapp/customers/${id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
    mailings: () => request<any[]>('/api/v1/miniapp/mailings'),
    createMailing: (body: object) => request<any>('/api/v1/miniapp/mailings', { method: 'POST', body: JSON.stringify(body) }),
    sendMailing: (id: string) => request<any>(`/api/v1/miniapp/mailings/${id}/send`, { method: 'POST' }),
    deleteMailing: (id: string) => request<void>(`/api/v1/miniapp/mailings/${id}`, { method: 'DELETE' }),
    coupons: () => request<any[]>('/api/v1/miniapp/promo-codes'),
    createCoupon: (body: object) => request<any>('/api/v1/miniapp/promo-codes', { method: 'POST', body: JSON.stringify(body) }),
    deleteCoupon: (id: string) => request<void>(`/api/v1/miniapp/promo-codes/${id}`, { method: 'DELETE' }),
    team: () => request<any[]>('/api/v1/miniapp/team'),
    inviteTeam: (body: object) => request<any>('/api/v1/miniapp/team/invite', { method: 'POST', body: JSON.stringify(body) }),
    removeTeam: (id: string) => request<void>(`/api/v1/miniapp/team/${id}`, { method: 'DELETE' }),
    loyaltyConfig: () => request<any>('/api/v1/miniapp/loyalty-config'),
    updateLoyaltyConfig: (body: object) => request<any>('/api/v1/miniapp/loyalty-config', { method: 'PATCH', body: JSON.stringify(body) }),
    referralConfig: () => request<any>('/api/v1/miniapp/referral-config'),
    updateReferralConfig: (body: object) => request<any>('/api/v1/miniapp/referral-config', { method: 'PATCH', body: JSON.stringify(body) }),
    stories: () => request<any[]>('/api/v1/miniapp/stories'),
    createStory: (body: object) => request<any>('/api/v1/miniapp/stories', { method: 'POST', body: JSON.stringify(body) }),
    deleteStory: (id: string) => request<void>(`/api/v1/miniapp/stories/${id}`, { method: 'DELETE' }),
    abandonedCarts: () => request<any[]>('/api/v1/miniapp/abandoned-carts'),
    sendAbandonedCartReminder: (cartId: string) => request<any>(`/api/v1/miniapp/abandoned-carts/${cartId}/remind`, { method: 'POST' }),
    aiChat: (messages: { role: string; content: string }[]) =>
      request<{ reply: string }>('/api/v1/miniapp/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      }),
    generateMailing: (topic: string, audience?: string) =>
      request<{ text: string; title: string }>('/api/v1/miniapp/ai/generate-mailing', {
        method: 'POST',
        body: JSON.stringify({ topic, audience: audience ?? 'all' }),
      }),
    updateTeamNotifications: (id: string, prefs: { new_orders?: boolean; payment_failures?: boolean; low_stock?: boolean; daily_summary?: boolean }) =>
      request<any>(`/api/v1/miniapp/team/${id}/notifications`, { method: 'PATCH', body: JSON.stringify(prefs) }),
  },
  getTenant: () => request<Tenant>('/api/v1/tenants/me'),
  createTenant: (body: { name: string; slug: string; currency: string }) =>
    request<Tenant>('/api/v1/tenants', { method: 'POST', body: JSON.stringify(body) }),
  getProducts: () => request<Product[]>('/api/v1/products'),
  createProduct: (body: Partial<Product>) =>
    request<Product>('/api/v1/products', { method: 'POST', body: JSON.stringify(body) }),
  deleteProduct: (id: string) =>
    request<void>(`/api/v1/products/${id}`, { method: 'DELETE' }),
  getOrders: (statusFilter?: string) =>
    request<Order[]>(`/api/v1/orders${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
  updateOrderStatus: (id: string, status: string) =>
    request<Order>(`/api/v1/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  configureBotMenu: () =>
    request<{ ok: boolean; url: string }>('/api/v1/tenants/me/configure-bot', { method: 'POST' }),
  getHelpArticles: () =>
    request<{ id: string; title: string; category: string; content: string; slug: string }[]>('/api/v1/public/help-articles'),
}

export interface Tenant {
  id: string
  name: string
  slug: string
  currency: string
  tier: string
  is_active: boolean
}

export interface Product {
  id: string
  name: string
  price: string | number
  currency: string
  stock: number | null
  description?: string
  images: string[]
  is_active: boolean
}

export interface Order {
  id: string
  status: string
  payment_method: string
  payment_status: string
  total: string | number
  currency: string
  created_at: string
}
