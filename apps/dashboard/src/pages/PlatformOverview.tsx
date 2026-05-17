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
  { key: 'mrr',              label: 'MRR (USD)',           icon: '💎', color: '#059669', sparkKey: 'revenue_growth', isRevenue: false },
  { key: 'churn_rate',       label: 'Отток (30 дн.)',     icon: '📉', color: '#EF4444', sparkKey: null, isPercent: true },
  { key: 'ai_cost_today',    label: 'AI расходы сегодня', icon: '🤖', color: '#8B5CF6', sparkKey: null },
  { key: 'active_tickets',   label: 'Тикетов открытых',  icon: '💬', color: '#F59E0B', sparkKey: null },
  { key: 'total_orders',     label: 'Заказов всего',      icon: '🛒', color: '#8B5CF6', sparkKey: 'order_growth' },
  { key: 'new_tenants_7d',   label: 'Новых (7 дн.)',      icon: '✨', color: '#EC4899', sparkKey: null },
  { key: 'total_revenue',    label: 'Общая выручка (UZS)', icon: '💰', color: '#059669', sparkKey: 'revenue_growth', isRevenue: true },
]

const DONUT_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

function DonutChart({ data }: { data: { category: string; count: number }[] }) {
  const top5 = data.slice(0, 5)
  const total = top5.reduce((s, d) => s + d.count, 0) || 1
  const cx = 60, cy = 60, r = 50, innerR = 28
  const gap = 0.03 // radians gap between segments

  let angle = -Math.PI / 2
  const segments = top5.map((d, i) => {
    const sweep = (d.count / total) * (2 * Math.PI) - gap
    const startAngle = angle + gap / 2
    const endAngle = startAngle + sweep
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)
    const large = sweep > Math.PI ? 1 : 0
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`
    angle += sweep + gap
    return { path, color: DONUT_COLORS[i], ...d }
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={120} height={120} viewBox="0 0 120 120" className="flex-shrink-0">
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} />
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fill="#6B7280" fontWeight="600">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 truncate flex-1">{s.category}</span>
            <span className="text-gray-500 font-mono text-xs">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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

  const { data: growthData } = useQuery({
    queryKey: ['platform-analytics-growth'],
    queryFn: api.platform.analytics.growth,
    retry: false,
  })

  const { data: aiCostsData } = useQuery({
    queryKey: ['platform-analytics-ai-costs'],
    queryFn: api.platform.analytics.aiCosts,
    retry: false,
  })

  const monthlySignups: { month: string; new_signups: number; churned: number }[] =
    growthData?.monthly_signups ?? []
  const conversionFunnel: { trial: number; activated: number; active: number } | undefined =
    growthData?.conversion_funnel
  const topCountries: { country: string; count: number }[] =
    growthData?.top_countries ?? []
  const topCategories: { category: string; count: number }[] =
    growthData?.top_categories ?? []
  const aiDaily: { date: string; cost: number }[] =
    (aiCostsData?.daily ?? []).slice(-30)

  // Derived values for funnel
  const funnelMax = conversionFunnel ? Math.max(conversionFunnel.trial, 1) : 1

  // Derived values for AI cost chart
  const aiValues = aiDaily.map(d => d.cost)
  const aiMax = aiValues.length > 0 ? Math.max(...aiValues) : 0
  const aiChartH = 80, aiChartW = 400
  const aiPts = aiValues.length >= 2
    ? aiValues.map((v, i) => {
        const x = (i / (aiValues.length - 1)) * aiChartW
        const y = aiChartH - ((v - 0) / (aiMax || 1)) * (aiChartH - 8) - 4
        return `${x},${y}`
      })
    : []

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
                  {(card as any).isRevenue
                    ? fmtRevenue(Number(value)) + ' UZS'
                    : (card as any).isPercent
                      ? Number(value).toFixed(1) + '%'
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

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Tenant Growth Stacked Bar */}
        {monthlySignups.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Рост магазинов</h2>
            <div className="flex items-end gap-1.5 h-28">
              {monthlySignups.map((m) => {
                const maxVal = Math.max(...monthlySignups.map(x => x.new_signups + x.churned), 1)
                const signupPct = (m.new_signups / maxVal) * 100
                const churnPct = (m.churned / maxVal) * 100
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                    <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                      <div
                        title={`Новых: ${m.new_signups}`}
                        style={{ height: `${Math.max(signupPct, 2)}%`, background: '#4F46E5', borderRadius: '4px 4px 0 0' }}
                      />
                      <div
                        title={`Отток: ${m.churned}`}
                        style={{ height: `${Math.max(churnPct, 2)}%`, background: '#EF4444', borderRadius: '0 0 4px 4px', marginTop: 1 }}
                      />
                    </div>
                    <span className="text-gray-400 mt-1" style={{ fontSize: 9 }}>{m.month.slice(5)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#4F46E5' }} />
                Новые
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#EF4444' }} />
                Отток
              </div>
            </div>
          </div>
        )}

        {/* 2. AI Cost Line Chart */}
        {aiValues.length >= 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">AI расходы (центы/день)</h2>
              <span className="text-xs text-gray-400 font-mono">max: {aiMax.toFixed(2)}¢</span>
            </div>
            <svg
              width="100%"
              viewBox={`0 0 ${aiChartW} ${aiChartH}`}
              style={{ overflow: 'visible' }}
              className="block"
            >
              <defs>
                <linearGradient id="g-ai-cost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`${aiPts.join(' ')} ${aiChartW},${aiChartH} 0,${aiChartH}`}
                fill="url(#g-ai-cost)"
              />
              <polyline
                points={aiPts.join(' ')}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{aiDaily[0]?.date?.slice(5) ?? ''}</span>
              <span>{aiDaily[aiDaily.length - 1]?.date?.slice(5) ?? ''}</span>
            </div>
          </div>
        )}

        {/* 4. Top Countries Bar Chart */}
        {topCountries.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Топ стран</h2>
            <div className="space-y-2">
              {topCountries.slice(0, 5).map((c) => {
                const maxCount = Math.max(...topCountries.slice(0, 5).map(x => x.count), 1)
                const pct = (c.count / maxCount) * 100
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-28 flex-shrink-0 truncate">{c.country}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(pct, 4)}%`, height: '100%', background: '#4F46E5', borderRadius: 999, opacity: 0.8 }}
                      />
                    </div>
                    <span className="text-sm font-mono text-gray-500 w-8 text-right flex-shrink-0">{c.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 5. Top Categories Donut Chart */}
        {topCategories.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Категории бизнеса</h2>
            <DonutChart data={topCategories} />
          </div>
        )}
      </div>

      {/* 3. Conversion Funnel — full width */}
      {conversionFunnel && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-5">Воронка конверсии</h2>
          <div className="flex items-stretch gap-3">
            {[
              {
                label: 'Trial',
                value: conversionFunnel.trial,
                color: '#F59E0B',
                pct: 100,
              },
              {
                label: 'Активированы',
                value: conversionFunnel.activated,
                color: '#3B82F6',
                pct: conversionFunnel.trial > 0
                  ? Math.round((conversionFunnel.activated / conversionFunnel.trial) * 100)
                  : 0,
              },
              {
                label: 'Активны',
                value: conversionFunnel.active,
                color: '#10B981',
                pct: conversionFunnel.trial > 0
                  ? Math.round((conversionFunnel.active / conversionFunnel.trial) * 100)
                  : 0,
              },
            ].map((stage, i) => {
              const barWidth = (stage.value / funnelMax) * 100
              return (
                <div key={stage.label} className="flex-1 flex flex-col gap-2">
                  {i > 0 && (
                    <div className="text-xs text-gray-400 text-center mb-1">
                      ▼ {stage.pct}%
                    </div>
                  )}
                  {i === 0 && <div className="mb-1 h-4" />}
                  <div className="h-12 bg-gray-100 rounded-xl overflow-hidden relative">
                    <div
                      style={{
                        width: `${Math.max(barWidth, 4)}%`,
                        height: '100%',
                        background: stage.color,
                        borderRadius: '12px',
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="font-mono font-bold text-lg" style={{ color: stage.color }}>
                      {stage.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{stage.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
