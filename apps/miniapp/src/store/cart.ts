import { create } from 'zustand'

interface CartItem {
  productId: string
  name: string
  price: number
  qty: number
}

interface CartStore {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'>) => void
  remove: (productId: string) => void
  clear: () => void
  total: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  add: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.productId === item.productId)
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i,
          ),
        }
      }
      return { items: [...s.items, { ...item, qty: 1 }] }
    }),
  remove: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}))
