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
    analytics: {
      growth: () => request<any>('/api/v1/platform/analytics/growth'),
      revenue: () => request<any>('/api/v1/platform/analytics/revenue'),
      aiCosts: () => request<any>('/api/v1/platform/analytics/ai-costs'),
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
    helpArticles: () =>
      request<{ id: string; title: string; category: string; content: string; slug: string; published?: boolean }[]>('/api/v1/platform/content/help-articles'),
    createHelpArticle: (body: object) =>
      request<any>('/api/v1/platform/content/help-articles', { method: 'POST', body: JSON.stringify(body) }),
    updateHelpArticle: (id: string, body: object) =>
      request<any>(`/api/v1/platform/content/help-articles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteHelpArticle: (id: string) =>
      request<void>(`/api/v1/platform/content/help-articles/${id}`, { method: 'DELETE' }),
  },
  merchant: {
    analytics: (period?: string) => request<any>(`/api/v1/miniapp/analytics/summary${period ? `?period=${period}` : ''}`),
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
