import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function fmtRevenue(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' UZS'
}

const STAT_CARDS = [
  { key: 'total_tenants', label: 'Всего магазинов', icon: '🏪', color: '#4F46E5' },
  { key: 'trial_tenants', label: 'На пробном', icon: '⏳', color: '#F59E0B' },
  { key: 'total_orders', label: 'Заказов всего', icon: '🛒', color: '#10B981' },
  { key: 'new_tenants_7d', label: 'Новых (7 дн.)', icon: '✨', color: '#8B5CF6' },
  { key: 'new_orders_7d', label: 'Заказов (7 дн.)', icon: '📦', color: '#EC4899' },
  { key: 'total_revenue', label: 'Общая выручка', icon: '💰', color: '#059669', isRevenue: true },
]

export function PlatformOverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: api.platform.stats,
    refetchInterval: 60000,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold font-display mb-6">Platform Overview</h1>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {STAT_CARDS.map(card => {
            const value = stats?.[card.key] ?? '—'
            return (
              <div key={card.key} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">{card.label}</span>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="font-mono font-bold text-xl" style={{ color: card.color }}>
                  {card.isRevenue && value !== '—'
                    ? fmtRevenue(Number(value))
                    : value}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
