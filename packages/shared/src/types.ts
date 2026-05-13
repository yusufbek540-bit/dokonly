export type Locale = 'ru' | 'uz' | 'en'
export type Currency = 'UZS' | 'USD' | 'KZT' | 'RUB'
export type Country = 'UZ' | 'KZ' | 'KG' | 'RU'

export type TierSlug = 'start' | 'business' | 'premium' | 'enterprise'

export interface Tenant {
  id: string
  name: string
  country: Country
  currency: Currency
  locale: Locale
  tier: TierSlug
  bot_token_hash: string
  created_at: string
}

export interface Product {
  id: string
  tenant_id: string
  name: string
  description: string
  price: number
  currency: Currency
  stock: number | null
  is_active: boolean
  images: string[]
  created_at: string
}

export interface Order {
  id: string
  tenant_id: string
  customer_telegram_id: number
  status: OrderStatus
  total: number
  currency: Currency
  items: OrderItem[]
  created_at: string
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  price: number
}
