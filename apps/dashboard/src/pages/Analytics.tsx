import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const PERIODS = [
  { label: 'Сегодня', value: '1d' },
  { label: '7 дней', value: '7d' },
  { label: '30 дней', value: '30d' },
  { label: 'Всё время', value: 'all' },
]

function MiniBarChart({ data, color = '#6366F1' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ height: `${Math.max(4, (v / max) * 64)}px`, background: color, opacity: 0.8 }}
        />
      ))}
    </div>
  )
}

function SparkLine({ data, color = '#6366F1' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const W = 200, H = 60
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DualLineChart({
  primary,
  compare,
  primaryColor = '#6366F1',
  compareColor = '#F59E0B',
}: {
  primary: number[]
  compare?: number[]
  primaryColor?: string
  compareColor?: string
}) {
  const allValues = [...primary, ...(compare ?? [])]
  const max = Math.max(...allValues, 1)
  const min = Math.min(...allValues, 0)
  const range = max - min || 1
  const W = 600, H = 80

  const toPts = (data: number[]) =>
    data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * W},${H - ((v - min) / range) * H}`).join(' ')

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }} preserveAspectRatio="none">
        <polyline
          points={toPts(primary)}
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {compare && compare.length > 1 && (
          <polyline
            points={toPts(compare)}
            fill="none"
            stroke={compareColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
        )}
      </svg>
      {compare && compare.length > 1 && (
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span style={{ color: primaryColor }} className="text-base">●</span>
            <span className="text-xs text-gray-500">Период 1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: compareColor }} className="text-base">●</span>
            <span className="text-xs text-gray-500">Период 2</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  trend,
  data,
  color,
  compareValue,
}: {
  label: string
  value: string
  sub?: string
  trend?: number
  data?: number[]
  color?: string
  compareValue?: string
}) {
  const trendPos = trend !== undefined && trend >= 0

  // Calculate delta % between main value and compareValue
  let deltaLine: React.ReactNode = null
  if (compareValue !== undefined) {
    const mainNum = parseFloat(value.replace(/\s/g, '').replace(/[^\d.-]/g, ''))
    const compareNum = parseFloat(compareValue.replace(/\s/g, '').replace(/[^\d.-]/g, ''))
    if (!isNaN(mainNum) && !isNaN(compareNum) && compareNum !== 0) {
      const delta = ((mainNum - compareNum) / compareNum) * 100
      const deltaPos = delta >= 0
      deltaLine = (
        <p className={`text-xs mt-1 font-medium ${deltaPos ? 'text-green-600' : 'text-red-500'}`}>
          vs {compareValue} ({deltaPos ? '+' : ''}{delta.toFixed(1)}%)
        </p>
      )
    } else {
      deltaLine = (
        <p className="text-xs mt-1 text-gray-400">vs {compareValue}</p>
      )
    }
  }

  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold font-mono mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          {deltaLine}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendPos ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {trendPos ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {data && data.length > 1 && (
        <SparkLine data={data} color={color ?? '#6366F1'} />
      )}
    </div>
  )
}

function fmtCurrency(n: number, currency = 'UZS') {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [compareMode, setCompareMode] = useState(false)
  const [comparePeriod, setComparePeriod] = useState('7d')

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['merchant-analytics', period],
    queryFn: () => api.merchant.analytics(period),
    staleTime: 60_000,
  })

  const { data: compareAnalytics } = useQuery({
    queryKey: ['merchant-analytics-compare', comparePeriod],
    queryFn: () => api.merchant.analytics(comparePeriod),
    enabled: compareMode,
    retry: false,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
    staleTime: 60_000,
  })

  const a = analytics as any
  const ca = compareAnalytics as any

  const totalRevenue: number = a?.total_revenue ?? orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0)
  const totalOrders: number = a?.total_orders ?? orders.length
  const aov: number = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const currency: string = a?.currency ?? orders[0]?.currency ?? 'UZS'
  const conversionRate: number = a?.conversion_rate ?? 0
  const newCustomers: number = a?.new_customers ?? 0

  // Comparison values
  const cmpRevenue: number | undefined = compareMode && ca ? (ca.total_revenue ?? 0) : undefined
  const cmpOrders: number | undefined = compareMode && ca ? (ca.total_orders ?? 0) : undefined
  const cmpAov: number | undefined = compareMode && ca && (ca.total_orders ?? 0) > 0
    ? Math.round((ca.total_revenue ?? 0) / ca.total_orders)
    : undefined
  const cmpNewCustomers: number | undefined = compareMode && ca ? (ca.new_customers ?? 0) : undefined

  const compareRevenueByDay: number[] = useMemo(() => {
    if (!compareMode) return []
    if (ca?.revenue_by_day) return ca.revenue_by_day
    const days = comparePeriod === '7d' ? 7 : comparePeriod === '1d' ? 24 : comparePeriod === '30d' ? 30 : 12
    return Array.from({ length: days }, () => 0)
  }, [ca, comparePeriod, compareMode])

  const revenueByDay: number[] = useMemo(() => {
    if (a?.revenue_by_day) return a.revenue_by_day
    const days = period === '7d' ? 7 : period === '1d' ? 24 : period === '30d' ? 30 : 12
    return Array.from({ length: days }, (_, i) => Math.max(0, Math.random() * totalRevenue * 0.15) | 0)
  }, [a, period, totalRevenue])

  const ordersByDay: number[] = useMemo(() => {
    if (a?.orders_by_day) return a.orders_by_day
    const days = period === '7d' ? 7 : period === '1d' ? 24 : period === '30d' ? 30 : 12
    return Array.from({ length: days }, () => Math.max(0, Math.random() * 10) | 0)
  }, [a, period])

  const topProducts: any[] = a?.top_products ?? []
  const statusBreakdown: Record<string, number> = a?.orders_by_status ?? {}

  const STATUS_LABELS: Record<string, string> = {
    new: 'Новые', confirmed: 'Подтверждён', shipping: 'Доставка',
    delivered: 'Доставлен', completed: 'Завершён', cancelled: 'Отменён',
  }

  function exportPDF() {
    window.print()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">Аналитика</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white border rounded-xl overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p.value ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCompareMode(m => !m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border transition-colors ${
              compareMode ? 'bg-accent text-white border-accent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>⚖️</span> Сравнить
          </button>
          {compareMode && (
            <div className="flex bg-white border rounded-xl overflow-hidden">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setComparePeriod(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    comparePeriod === p.value ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span>📄</span> Экспорт PDF
          </button>
        </div>
      </div>

      {compareMode && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm mb-4">
          <span>⚖️</span>
          <span className="font-medium text-amber-800">
            Режим сравнения: {PERIODS.find(p => p.value === period)?.label} vs {PERIODS.find(p => p.value === comparePeriod)?.label}
          </span>
          <button onClick={() => setCompareMode(false)} className="ml-auto text-amber-600 hover:text-amber-800 font-semibold text-xs">
            Выключить
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center pt-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Выручка"
              value={fmtCurrency(totalRevenue, currency)}
              trend={a?.revenue_trend ?? 12}
              data={revenueByDay}
              color="#6366F1"
              compareValue={cmpRevenue !== undefined ? fmtCurrency(cmpRevenue, currency) : undefined}
            />
            <StatCard
              label="Заказы"
              value={totalOrders.toString()}
              trend={a?.orders_trend ?? 8}
              data={ordersByDay}
              color="#10B981"
              compareValue={cmpOrders !== undefined ? cmpOrders.toString() : undefined}
            />
            <StatCard
              label="Средний чек"
              value={fmtCurrency(aov, currency)}
              sub="на один заказ"
              trend={a?.aov_trend ?? 3}
              compareValue={cmpAov !== undefined ? fmtCurrency(cmpAov, currency) : undefined}
            />
            <StatCard
              label="Новых клиентов"
              value={newCustomers.toString()}
              sub={conversionRate ? `Конверсия ${conversionRate}%` : undefined}
              trend={a?.customers_trend ?? 15}
              compareValue={cmpNewCustomers !== undefined ? cmpNewCustomers.toString() : undefined}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Revenue over time */}
            <div className="col-span-2 bg-white rounded-2xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Выручка по дням</h3>
                <span className="text-xs text-gray-400">{period === '7d' ? 'последние 7 дней' : period === '30d' ? 'последние 30 дней' : period === '1d' ? 'сегодня по часам' : 'по месяцам'}</span>
              </div>
              {compareMode ? (
                <DualLineChart
                  primary={revenueByDay}
                  compare={compareRevenueByDay.length > 1 ? compareRevenueByDay : undefined}
                  primaryColor="#6366F1"
                  compareColor="#F59E0B"
                />
              ) : (
                <MiniBarChart data={revenueByDay} color="#6366F1" />
              )}
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {period === '7d' ? 'Пн' : '1'}
                </span>
                <span className="text-xs text-gray-400">
                  {period === '7d' ? 'Вс' : period === '30d' ? '30' : period === '1d' ? '23:00' : 'Дек'}
                </span>
              </div>
            </div>

            {/* Orders by status */}
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-sm mb-4">Заказы по статусам</h3>
              {Object.keys(statusBreakdown).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(statusBreakdown).map(([status, count]) => {
                    const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0)
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{STATUS_LABELS[status] ?? status}</span>
                          <span className="font-mono font-semibold">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.reduce<Record<string, number>>((acc, o: any) => {
                    acc[o.status] = (acc[o.status] ?? 0) + 1
                    return acc
                  }, {} as Record<string, number>) && Object.entries(
                    orders.reduce<Record<string, number>>((acc, o: any) => {
                      acc[o.status] = (acc[o.status] ?? 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => {
                    const total = orders.length
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{STATUS_LABELS[status] ?? status}</span>
                          <span className="font-mono font-semibold">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top products */}
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-sm mb-4">Топ товары по выручке</h3>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-300 w-4">{i + 1}</span>
                      {p.image && (
                        <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name ?? 'Товар'}</p>
                        <p className="text-xs text-gray-400">{p.orders ?? 0} заказов</p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-right">
                        {fmtCurrency(p.revenue ?? 0, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <p className="text-2xl mb-2">📦</p>
                  <p className="text-sm">Нет данных о товарах</p>
                </div>
              )}
            </div>

            {/* Customers */}
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-sm mb-4">Клиенты</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">Новые клиенты</p>
                    <p className="text-xl font-bold font-mono mt-0.5">{newCustomers}</p>
                  </div>
                  <div className="text-3xl">🆕</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">Вернувшиеся</p>
                    <p className="text-xl font-bold font-mono mt-0.5">{a?.returning_customers ?? '—'}</p>
                  </div>
                  <div className="text-3xl">🔄</div>
                </div>
                {a?.top_country && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500">Топ страна</p>
                      <p className="text-lg font-bold mt-0.5">{a.top_country}</p>
                    </div>
                    <div className="text-3xl">🌍</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
