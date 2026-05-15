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
    orders: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.skip !== undefined) qs.set('skip', String(params.skip))
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return request<any[]>(`/api/v1/platform/orders?${qs}`)
    },
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
