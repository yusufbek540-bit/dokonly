import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function fmtRevenue(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

function MiniLineChart({ values, color = '#4F46E5' }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null
  const h = 48, w = 200
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 8) - 4
    return `${x},${y}`
  })
  const fill = `${pts.join(' ')} ${w},${h} 0,${h}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#g-${color.replace('#', '')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ACTIVITY_ICONS: Record<string, string> = {
  tenant_signup: '🏪',
  tenant_upgrade: '⬆️',
  tenant_downgrade: '⬇️',
  tenant_suspended: '🚫',
  tenant_reactivated: '✅',
  subscription_paid: '💳',
  subscription_failed: '❌',
  ai_cost_alert: '⚠️',
  support_ticket: '💬',
}

const STAT_CARDS = [
  { key: 'total_tenants',    label: 'Всего магазинов',    icon: '🏪', color: '#4F46E5', sparkKey: 'tenant_growth' },
  { key: 'active_tenants',   label: 'Активных',           icon: '✅', color: '#10B981', sparkKey: null },
  { key: 'trial_tenants',    label: 'На пробном',         icon: '⏳', color: '#F59E0B', sparkKey: null },
  { key: 'total_orders',     label: 'Заказов всего',      icon: '🛒', color: '#8B5CF6', sparkKey: 'order_growth' },
  { key: 'new_tenants_7d',   label: 'Новых (7 дн.)',      icon: '✨', color: '#EC4899', sparkKey: null },
  { key: 'total_revenue',    label: 'Общая выручка (UZS)', icon: '💰', color: '#059669', sparkKey: 'revenue_growth', isRevenue: true },
]

export function PlatformOverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: api.platform.stats,
    refetchInterval: 60000,
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['platform-activity'],
    queryFn: api.platform.activity,
    refetchInterval: 30000,
    retry: false,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Platform Overview</h1>
        <span className="text-sm text-gray-400">
          Обновлено: {new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* KPI Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {STAT_CARDS.map(card => {
            const value = stats?.[card.key] ?? 0
            const spark: number[] = stats?.[card.sparkKey ?? ''] ?? []
            return (
              <div key={card.key} className="bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">{card.label}</span>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="font-mono font-bold text-2xl mb-3" style={{ color: card.color }}>
                  {card.isRevenue
                    ? fmtRevenue(Number(value)) + ' UZS'
                    : Number(value).toLocaleString()}
                </div>
                {spark.length >= 2 && (
                  <MiniLineChart values={spark} color={card.color} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        {stats?.monthly_revenue && stats.monthly_revenue.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Выручка по месяцам</h2>
            <div className="flex items-end gap-2 h-32">
              {(stats.monthly_revenue as { month: string; revenue: number }[]).map((m, i, arr) => {
                const maxRev = Math.max(...arr.map(x => x.revenue), 1)
                const pct = (m.revenue / maxRev) * 100
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      title={`${m.month}: ${fmtRevenue(m.revenue)}`}
                      style={{ height: `${Math.max(pct, 4)}%`, background: '#4F46E520', borderRadius: '6px 6px 0 0', width: '100%', position: 'relative' }}
                    >
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `100%`, background: '#4F46E5', borderRadius: '6px 6px 0 0', opacity: 0.8 }} />
                    </div>
                    <span className="text-xs text-gray-400" style={{ fontSize: 9 }}>{m.month.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tier breakdown */}
        {stats?.tier_breakdown && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Распределение по тарифам</h2>
            <div className="space-y-3">
              {(Object.entries(stats.tier_breakdown) as [string, number][]).map(([tier, count]) => {
                const total = Object.values(stats.tier_breakdown as Record<string, number>).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                const colors: Record<string, string> = {
                  trial: '#F59E0B', start: '#3B82F6', business: '#8B5CF6', premium: '#10B981',
                }
                return (
                  <div key={tier}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium" style={{ color: colors[tier] ?? '#6B7280' }}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, height: '100%', background: colors[tier] ?? '#6B7280', borderRadius: 999, transition: 'width 0.5s ease' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Последние события</h2>
        {(activity as any[]).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>
        ) : (
          <div className="space-y-1">
            {(activity as any[]).slice(0, 20).map((evt: any, i) => (
              <div key={evt.id ?? i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-lg flex-shrink-0">{ACTIVITY_ICONS[evt.type] ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{evt.description ?? evt.type}</p>
                  {evt.tenant_name && (
                    <p className="text-xs text-gray-400 mt-0.5">{evt.tenant_name}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {evt.created_at ? fmtDate(evt.created_at) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
