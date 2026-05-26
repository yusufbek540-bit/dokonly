import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function fmtRevenue(n: number, currency: string) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toLocaleString()
}

function MiniLineChart({ values, color = '#4F46E5' }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null
  const h = 40, w = 120
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return `${x},${y}`
  })
  const fill = `${pts.join(' ')} ${w},${h} 0,${h}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`hg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#hg-${color.replace('#', '')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface MerchantHomeProps {
  tenant: any
}

export function MerchantHome({ tenant }: MerchantHomeProps) {
  const currency = tenant?.currency ?? 'UZS'

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['merchant-analytics-home'],
    queryFn: () => api.merchant.analytics('30d'),
    enabled: !!tenant,
    refetchInterval: 60000,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
    enabled: !!tenant,
    refetchInterval: 30000,
  })

  const pendingOrders = (orders as any[]).filter((o: any) => ['new', 'created', 'confirmed'].includes(o.status))
  const todayOrders = (orders as any[]).filter((o: any) => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const statsCards = [
    {
      label: 'Заказов сегодня',
      value: todayOrders.length,
      icon: '🛒',
      color: '#4F46E5',
      sparkKey: 'daily_orders_7d',
    },
    {
      label: 'Ожидают обработки',
      value: pendingOrders.length,
      icon: '⏳',
      color: '#F59E0B',
      sparkKey: null,
    },
    {
      label: 'Выручка (30 дн.)',
      value: analytics ? fmtRevenue(Number(analytics.total_revenue ?? 0), currency) + ' ' + currency : '—',
      icon: '💰',
      color: '#10B981',
      sparkKey: 'revenue_daily',
    },
    {
      label: 'Всего клиентов',
      value: analytics ? Number(analytics.total_customers ?? 0).toLocaleString() : '—',
      icon: '👥',
      color: '#8B5CF6',
      sparkKey: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{tenant?.name ?? 'Мой магазин'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="font-mono">{tenant?.slug}</span>
            {' · '}
            <a
              href={`https://dokonly-miniapp.pages.dev?shop=${tenant?.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              Открыть магазин
            </a>
          </p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${
          tenant?.tier === 'premium' ? 'bg-emerald-100 text-emerald-700' :
          tenant?.tier === 'business' ? 'bg-purple-100 text-purple-700' :
          tenant?.tier === 'start' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {(tenant?.tier ?? 'trial').toUpperCase()}
        </span>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map(card => {
            const spark: number[] = analytics?.[card.sparkKey ?? ''] ?? []
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">{card.label}</span>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="font-mono font-bold text-2xl mb-3" style={{ color: card.color }}>
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </div>
                {spark.length >= 2 && <MiniLineChart values={spark} color={card.color} />}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Последние заказы</h2>
            <a href="/orders" className="text-xs text-accent font-medium">Все заказы →</a>
          </div>
          {(orders as any[]).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Нет заказов</p>
          ) : (
            <div className="space-y-1">
              {(orders as any[]).slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">#{order.id?.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-gray-800">
                      {Number(order.total).toLocaleString()} {order.currency}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === 'new' ? 'bg-blue-100 text-blue-600' :
                      order.status === 'completed' ? 'bg-green-100 text-green-600' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics summary */}
        {analytics && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Итоги (30 дн.)</h2>
            <div className="space-y-3">
              {[
                { label: 'Всего заказов', value: analytics.total_orders ?? 0 },
                { label: 'Завершено', value: analytics.completed_orders ?? 0 },
                { label: 'Отменено', value: analytics.cancelled_orders ?? 0 },
                { label: 'Конверсия', value: analytics.conversion_rate ? (analytics.conversion_rate * 100).toFixed(1) + '%' : '—' },
                { label: 'Средний чек', value: analytics.avg_order_value ? fmtRevenue(Number(analytics.avg_order_value), currency) + ' ' + currency : '—' },
                { label: 'Новых клиентов', value: analytics.new_customers ?? 0 },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-semibold text-gray-800">{typeof row.value === 'number' ? row.value.toLocaleString() : row.value}</span>
                </div>
              ))}
            </div>

            {analytics.revenue_chart && analytics.revenue_chart.length >= 2 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">Выручка (30 дн.)</p>
                <div className="flex items-end gap-1 h-12">
                  {(analytics.revenue_chart as number[]).map((v, i) => {
                    const max = Math.max(...(analytics.revenue_chart as number[]), 1)
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{ height: `${Math.max((v / max) * 100, 4)}%`, background: '#10B981', opacity: 0.7 }}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
