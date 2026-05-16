import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function fmtRevenue(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function MiniBar({ values, color = '#4F46E5' }: { values: number[]; color?: string }) {
  if (!values || values.length === 0) return null
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all"
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, background: color, opacity: 0.8 }}
          title={String(v)}
        />
      ))}
    </div>
  )
}

export function PlatformAnalyticsPage() {
  const { data: growth, isLoading: gLoading } = useQuery({
    queryKey: ['platform-analytics-growth'],
    queryFn: api.platform.analytics.growth,
    refetchInterval: 300000,
  })

  const { data: revenue, isLoading: rLoading } = useQuery({
    queryKey: ['platform-analytics-revenue'],
    queryFn: api.platform.analytics.revenue,
    refetchInterval: 300000,
  })

  const { data: aiCosts, isLoading: aLoading } = useQuery({
    queryKey: ['platform-analytics-ai'],
    queryFn: api.platform.analytics.aiCosts,
    refetchInterval: 300000,
  })

  const isLoading = gLoading || rLoading || aLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Аналитика платформы</h1>
        <span className="text-sm text-gray-400">Обновление каждые 5 мин</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Growth metrics */}
          {growth && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Рост платформы</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Новых магазинов (мес.)', value: growth.new_tenants_month ?? 0, color: '#4F46E5' },
                  { label: 'MRR', value: fmtRevenue(growth.mrr ?? 0) + ' UZS', color: '#10B981' },
                  { label: 'Churn rate', value: (growth.churn_rate ?? 0).toFixed(1) + '%', color: '#F59E0B' },
                  { label: 'ARPU', value: fmtRevenue(growth.arpu ?? 0) + ' UZS', color: '#8B5CF6' },
                ].map(item => (
                  <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className="font-mono font-bold text-xl" style={{ color: item.color }}>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</p>
                  </div>
                ))}
              </div>

              {growth.weekly_new_tenants && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">Новые магазины (7 дн.)</p>
                  <MiniBar values={growth.weekly_new_tenants} color="#4F46E5" />
                </div>
              )}
            </div>
          )}

          {/* Revenue breakdown */}
          {revenue && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {revenue.by_tier && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Выручка по тарифам</h2>
                  <div className="space-y-3">
                    {(Object.entries(revenue.by_tier) as [string, number][]).map(([tier, amount]) => {
                      const total = Object.values(revenue.by_tier as Record<string, number>).reduce((a: number, b: number) => a + b, 0)
                      const pct = total > 0 ? Math.round((amount / total) * 100) : 0
                      const colors: Record<string, string> = { trial: '#F59E0B', start: '#3B82F6', business: '#8B5CF6', premium: '#10B981' }
                      return (
                        <div key={tier}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium capitalize" style={{ color: colors[tier] ?? '#6B7280' }}>{tier}</span>
                            <span className="text-gray-500">{fmtRevenue(amount)} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div style={{ width: `${pct}%`, height: '100%', background: colors[tier] ?? '#6B7280', borderRadius: 999, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {revenue.monthly && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">MRR по месяцам</h2>
                  <div className="flex items-end gap-2 h-32">
                    {(revenue.monthly as { month: string; amount: number }[]).map((m, i, arr) => {
                      const maxAmt = Math.max(...arr.map(x => x.amount), 1)
                      const pct = (m.amount / maxAmt) * 100
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            title={`${m.month}: ${fmtRevenue(m.amount)}`}
                            style={{ height: `${Math.max(pct, 4)}%`, background: '#4F46E5', borderRadius: '6px 6px 0 0', width: '100%', opacity: 0.8 }}
                          />
                          <span className="text-gray-400" style={{ fontSize: 9 }}>{m.month.slice(5)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI costs */}
          {aiCosts && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">AI Расходы</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-orange-50 rounded-xl">
                  <p className="text-xs text-orange-400 mb-1">Всего (мес.)</p>
                  <p className="font-mono font-bold text-xl text-orange-600">${(aiCosts.total_this_month ?? 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Сегодня</p>
                  <p className="font-mono font-bold text-xl text-gray-700">${(aiCosts.total_today ?? 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Топ фича</p>
                  <p className="font-bold text-lg text-gray-700">{aiCosts.top_feature ?? '—'}</p>
                </div>
              </div>

              {aiCosts.by_feature && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 mb-3">По фичам</p>
                  {(Object.entries(aiCosts.by_feature) as [string, number][]).sort(([, a], [, b]) => b - a).map(([feature, cost]) => (
                    <div key={feature} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700 capitalize">{feature.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-sm text-gray-500">${(cost as number).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}

              {aiCosts.top_spenders && aiCosts.top_spenders.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-3">Топ-10 по расходам</p>
                  <div className="space-y-2">
                    {(aiCosts.top_spenders as any[]).slice(0, 10).map((s: any, i: number) => (
                      <div key={s.tenant_id ?? i} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                          <span className="text-sm text-gray-700">{s.tenant_name ?? s.tenant_id}</span>
                        </div>
                        <span className="font-mono text-sm text-orange-600">${(s.cost ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(!growth && !revenue && !aiCosts) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Нет данных аналитики
            </div>
          )}
        </>
      )}
    </div>
  )
}
