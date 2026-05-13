import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useTelegram } from '@/hooks/useTelegram'
import { useCart } from '@/store/cart'
import { ProductCard } from './ProductCard'

interface Props {
  tenantId: string
  currency: string
}

export function Storefront({ tenantId, currency }: Props) {
  const { tg } = useTelegram()
  const total = useCart((s) => s.total)
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: () => api.getProducts(tenantId),
  })

  useEffect(() => {
    const t = total()
    if (t > 0) {
      tg!.MainButton.text = `Оформить заказ — ${t.toLocaleString()} ${currency}`
      tg!.MainButton.show()
    } else {
      tg?.MainButton.hide()
    }
  }, [total()])

  if (isLoading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 grid grid-cols-2 gap-3">
      {products.map((p: any) => (
        <ProductCard
          key={p.id}
          id={p.id}
          name={p.name}
          price={Number(p.price)}
          currency={currency}
          images={p.images ?? []}
          description={p.description}
        />
      ))}
    </div>
  )
}
