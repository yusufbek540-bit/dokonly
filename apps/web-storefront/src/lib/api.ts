function getApiBase() {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL
  if (configuredBase) return configuredBase.replace(/\/$/, '')

  if (process.env.NODE_ENV === 'development') return 'http://localhost:8000'
  if (typeof window === 'undefined') return process.env.API_PROXY_TARGET?.replace(/\/$/, '') ?? ''
  return ''
}

const BASE = getApiBase()

export interface Shop {
  id: string
  name: string
  currency: string
  logo_url: string | null
  cover_url: string | null
  accent_color: string
  typography_bundle: string
  description?: string | null
  settings: {
    phone?: string | null
    email?: string | null
    address?: string | null
    telegram?: string | null
    instagram?: string | null
    [key: string]: unknown
  }
}

export interface Product {
  id: string
  name: string
  description?: string | null
  price: number
  old_price?: number | null
  images?: string[]
  image_url?: string | null
  category_id?: string | null
  category_name?: string | null
  stock?: number | null
  in_stock?: boolean
  rating?: number | null
  review_count?: number | null
  [key: string]: unknown
}

export interface Review {
  id: string
  rating: number
  comment?: string | null
  author_name?: string | null
  created_at?: string | null
}

export async function fetchShop(slug: string): Promise<Shop | null> {
  try {
    const res = await fetch(`${BASE}/api/v1/shop/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json() as Promise<Shop>
  } catch {
    return null
  }
}

export async function fetchProducts(slug: string): Promise<Product[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/shop/${slug}/products`, { next: { revalidate: 30 } })
    if (!res.ok) return []
    return res.json() as Promise<Product[]>
  } catch {
    return []
  }
}

export async function fetchProduct(slug: string, productId: string): Promise<Product | null> {
  try {
    const res = await fetch(`${BASE}/api/v1/shop/${slug}/products/${productId}`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    return res.json() as Promise<Product>
  } catch {
    return null
  }
}

export async function fetchProductReviews(slug: string, productId: string): Promise<Review[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/shop/${slug}/products/${productId}/reviews`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export interface Story {
  id: string
  title?: string | null
  media_url: string
  media_type?: string | null
  thumbnail_url?: string | null
}

export async function fetchStories(slug: string): Promise<Story[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/shop/${slug}/stories`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json() as Promise<Story[]>
  } catch {
    return []
  }
}

export function fmtPrice(n: number, currency: string): string {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

export function getProductImage(product: Product): string | null {
  if (product.images && product.images.length > 0) return product.images[0]
  return product.image_url ?? null
}

export async function validateCoupon(
  shopId: string,
  code: string,
  subtotal: number
): Promise<{ valid: boolean; discount_amount: number; discount_type: string } | null> {
  try {
    const res = await fetch(
      `${BASE}/api/v1/shop/${shopId}/coupon?code=${encodeURIComponent(code)}&subtotal=${subtotal}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function createOrder(
  shopId: string,
  body: {
    items: { product_id: string; qty: number; price: number }[]
    name: string
    phone: string
    email?: string
    delivery_method: string
    address?: string
    comment?: string
    payment_method: string
    coupon_code?: string
  }
): Promise<{ id: string; order_number?: string } | null> {
  try {
    const res = await fetch(`${BASE}/api/v1/shop/${shopId}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
