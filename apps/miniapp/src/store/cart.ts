import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  key: string
  productId: string
  name: string
  price: number
  qty: number
  size?: string
  color?: string
  tone?: number
  imageUrl?: string
}

interface CartStore {
  items: CartItem[]
  couponCode: string | null
  couponDiscount: number
  loyaltyDiscount: number
  add: (item: Omit<CartItem, 'key' | 'qty'> & { qty?: number }) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  setCoupon: (code: string | null, discount: number) => void
  setLoyalty: (discount: number) => void
  total: () => number
  count: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
  items: [],
  couponCode: null,
  couponDiscount: 0,
  loyaltyDiscount: 0,
  setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
  setLoyalty: (discount) => set({ loyaltyDiscount: discount }),
  add: (item) => {
    const key = `${item.productId}_${item.size ?? ''}_${item.color ?? ''}`
    set((s) => {
      const existing = s.items.find((i) => i.key === key)
      if (existing) {
        return { items: s.items.map((i) => i.key === key ? { ...i, qty: i.qty + (item.qty ?? 1) } : i) }
      }
      return { items: [...s.items, { ...item, key, qty: item.qty ?? 1 }] }
    })
  },
  setQty: (key, qty) =>
    set((s) => ({
      items: qty <= 0
        ? s.items.filter((i) => i.key !== key)
        : s.items.map((i) => i.key === key ? { ...i, qty } : i),
    })),
  remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
  clear: () => set({ items: [], couponCode: null, couponDiscount: 0, loyaltyDiscount: 0 }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'dokonly-cart' }
  )
)
