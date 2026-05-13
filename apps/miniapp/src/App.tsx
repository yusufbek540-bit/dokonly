import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useTelegram } from '@/hooks/useTelegram'
import { Storefront } from '@/pages/customer/Storefront'

const SHOP_SLUG = new URLSearchParams(window.location.search).get('shop') ?? 'demo'

export default function App() {
  useTelegram()
  const { data: shop, isLoading } = useQuery({
    queryKey: ['shop', SHOP_SLUG],
    queryFn: () => api.getShop(SHOP_SLUG),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Магазин не найден</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-3 shadow-sm">
        <h1 className="text-lg font-bold">{shop.name}</h1>
      </header>
      <Storefront tenantId={shop.id} currency={shop.currency} />
    </div>
  )
}
