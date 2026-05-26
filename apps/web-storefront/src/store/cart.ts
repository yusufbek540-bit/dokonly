'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: number
  qty: number
  imageUrl?: string
  currency?: string
}

interface CartStore {
  items: Record<string, CartItem>
  add: (item: Omit<CartItem, 'qty'>) => void
  remove: (productId: string) => void
  update: (productId: string, qty: number) => void
  clear: () => void
  total: () => number
  count: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: {},
      add: (item) =>
        set((s) => ({
          items: {
            ...s.items,
            [item.productId]: s.items[item.productId]
              ? { ...s.items[item.productId], qty: s.items[item.productId].qty + 1 }
              : { ...item, qty: 1 },
          },
        })),
      remove: (productId) =>
        set((s) => {
          const next = { ...s.items }
          delete next[productId]
          return { items: next }
        }),
      update: (productId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? Object.fromEntries(Object.entries(s.items).filter(([k]) => k !== productId))
              : { ...s.items, [productId]: { ...s.items[productId], qty } },
        })),
      clear: () => set({ items: {} }),
      total: () =>
        Object.values(get().items).reduce((sum, i) => sum + i.price * i.qty, 0),
      count: () =>
        Object.values(get().items).reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'dokonly-web-cart' }
  )
)
