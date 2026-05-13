import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Order } from '@/lib/api'

const STATUSES: { key: string; label: string }[] = [
  { key: 'new', label: '🆕 Новые' },
  { key: 'confirmed', label: '✅ Подтверждены' },
  { key: 'packing', label: '📦 Сборка' },
  { key: 'shipped', label: '🚚 Отправлены' },
  { key: 'delivered', label: '🎉 Доставлены' },
]

const NEXT: Record<string, string> = {
  new: 'confirmed',
  confirmed: 'packing',
  packing: 'shipped',
  shipped: 'delivered',
}

export function OrdersPage() {
  const qc = useQueryClient()
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
  })

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold font-display mb-6">Заказы</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((col) => {
          const colOrders = orders.filter((o: Order) => o.status === col.key)
          return (
            <div key={col.key} className="flex-shrink-0 w-64">
              <div className="text-sm font-semibold text-gray-500 mb-3">
                {col.label} · {colOrders.length}
              </div>
              <div className="space-y-2">
                {colOrders.map((o: Order) => (
                  <div key={o.id} className="bg-white border rounded-xl p-3 shadow-sm">
                    <p className="font-mono text-xs text-gray-400">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="font-semibold mt-1">
                      {Number(o.total).toLocaleString()} {o.currency}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{o.payment_method}</p>
                    {NEXT[o.status] && (
                      <button
                        onClick={() =>
                          advance.mutate({ id: o.id, status: NEXT[o.status] })
                        }
                        disabled={advance.isPending}
                        className="mt-2 w-full text-xs bg-accent/10 text-accent rounded-lg py-1.5 font-medium disabled:opacity-50"
                      >
                        → {STATUSES.find((s) => s.key === NEXT[o.status])?.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
