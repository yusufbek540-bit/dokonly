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
