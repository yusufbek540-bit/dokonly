import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

type AnalyticsTab = 'growth' | 'revenue' | 'usage' | 'ai'

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

const ANALYTICS_TABS: { key: AnalyticsTab; label: string; icon: string }[] = [
  { key: 'growth', label: 'Рост', icon: '📈' },
  { key: 'revenue', label: 'Выручка', icon: '💰' },
  { key: 'usage', label: 'Использование', icon: '🔧' },
  { key: 'ai', label: 'AI расходы', icon: '🤖' },
]

export function PlatformAnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('growth')

  const { data: growth, isLoading: gLoading } = useQuery({
    queryKey: ['platform-analytics-growth'],
    queryFn: api.platform.analytics.growth,
    refetchInterval: 300000,
    enabled: tab === 'growth',
  })

  const { data: revenue, isLoading: rLoading } = useQuery({
    queryKey: ['platform-analytics-revenue'],
    queryFn: api.platform.analytics.revenue,
    refetchInterval: 300000,
    enabled: tab === 'revenue',
  })

  const { data: aiCosts, isLoading: aLoading } = useQuery({
    queryKey: ['platform-analytics-ai'],
    queryFn: api.platform.analytics.aiCosts,
    refetchInterval: 300000,
    enabled: tab === 'ai',
  })

  const { data: usage, isLoading: uLoading } = useQuery({
    queryKey: ['platform-analytics-usage'],
    queryFn: api.platform.analytics.productUsage,
    refetchInterval: 300000,
    enabled: tab === 'usage',
  })

  const isLoading = (tab === 'growth' && gLoading) || (tab === 'revenue' && rLoading) || (tab === 'ai' && aLoading) || (tab === 'usage' && uLoading)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Аналитика платформы</h1>
        <span className="text-sm text-gray-400">Обновление каждые 5 мин</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {ANALYTICS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Growth metrics */}
          {tab === 'growth' && growth && (
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
          {tab === 'revenue' && revenue && (
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
          {tab === 'ai' && aiCosts && (
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

          {/* Product Usage */}
          {tab === 'usage' && usage && (
            <div className="space-y-6">
              {usage.top_features && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Топ фичи</h2>
                  <div className="space-y-3">
                    {(usage.top_features as { feature: string; count: number }[]).map((f) => {
                      const maxCount = Math.max(...(usage.top_features as { feature: string; count: number }[]).map((x: { count: number }) => x.count), 1)
                      const pct = Math.round((f.count / maxCount) * 100)
                      return (
                        <div key={f.feature}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 capitalize">{f.feature.replace(/_/g, ' ')}</span>
                            <span className="text-gray-500 font-mono">{f.count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div style={{ width: `${pct}%`, height: '100%', background: '#4F46E5', borderRadius: 999 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {usage.ai_adoption_by_plan && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">AI-функции по тарифам</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                          <th className="pb-2 font-medium">Тариф</th>
                          <th className="pb-2 font-medium text-right">Активаций</th>
                          <th className="pb-2 font-medium text-right">% использ.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.entries(usage.ai_adoption_by_plan) as [string, { activations: number; usage_pct: number }][]).map(([plan, data]) => (
                          <tr key={plan} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 font-medium capitalize" style={{ color: ({ trial: '#F59E0B', start: '#3B82F6', business: '#8B5CF6', premium: '#10B981' } as Record<string, string>)[plan] ?? '#6B7280' }}>{plan}</td>
                            <td className="py-2 text-right font-mono text-gray-600">{data.activations?.toLocaleString()}</td>
                            <td className="py-2 text-right font-mono text-gray-600">{data.usage_pct?.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {usage.channel_gate_adoption && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Каналы продаж</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {(Object.entries(usage.channel_gate_adoption) as [string, number][]).map(([channel, pct]) => (
                      <div key={channel} className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1 capitalize">{channel.replace(/_/g, ' ')}</p>
                        <p className="font-mono font-bold text-xl text-indigo-600">{(pct as number).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'usage' && !usage && !uLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Нет данных использования
            </div>
          )}

          {(!growth && tab === 'growth') && !gLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Нет данных аналитики
            </div>
          )}
        </>
      )}
    </div>
  )
}
