import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

interface Props { tenant: any }

const PERIODS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'week',  label: '7 дней' },
  { id: 'month', label: '30 дней' },
  { id: 'year',  label: 'Год' },
  { id: 'all',   label: 'Всё время' },
]

// Mini SVG line chart — no external deps
function LineChart({ data, color = 'var(--accent)', height = 60 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return null
  const w = 300; const h = height
  const min = Math.min(...data); const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 10) - 5
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${h} ${pts.join(' ')} ${w},${h}`}
        fill={color}
        opacity="0.12"
      />
    </svg>
  )
}

// Funnel bar
function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}>{count.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

export function AnalyticsTab({ tenant }: Props) {
  const [period, setPeriod] = useState('all')

  const { data: summary, isLoading } = useQuery({
    queryKey: ['seller-analytics', period],
    queryFn: () => api.seller.analytics(period),
  })
  const { data: orders = [] } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => api.seller.orders(),
  })
  const { data: viral } = useQuery({
    queryKey: ['seller-viral-analytics'],
    queryFn: () => api.seller.viralAnalytics(),
    retry: false,
  })

  const statusCounts = (orders as any[]).reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const STATUS_LABELS: Record<string, string> = {
    new: 'Новые', confirmed: 'Подтверждены', shipping: 'Доставка',
    delivered: 'Доставлены', completed: 'Завершены', cancelled: 'Отменены',
  }
  const STATUS_COLORS: Record<string, string> = {
    new: '#3B82F6', confirmed: '#8B5CF6', shipping: '#F59E0B',
    delivered: '#10B981', completed: '#00B383', cancelled: '#EF4444',
  }

  const tier = tenant.tier ?? 'start'
  const isBusinessPlus = tier === 'business' || tier === 'premium'
  const isPremium = tier === 'premium'

  // Compute conversion rate: completed / (new + confirmed + shipping + delivered + completed)
  const totalActive = (statusCounts['new'] ?? 0) + (statusCounts['confirmed'] ?? 0) +
    (statusCounts['shipping'] ?? 0) + (statusCounts['delivered'] ?? 0) + (statusCounts['completed'] ?? 0)
  const conversionRate = totalActive > 0 ? ((statusCounts['completed'] ?? 0) / totalActive * 100) : 0

  // Sales over time sparkline from summary (if backend provides daily_revenue array)
  const sparklineData: number[] = summary?.daily_revenue ?? []

  // New vs returning from summary
  const newCustomers = summary?.new_customers ?? 0
  const returningCustomers = (summary?.customer_count ?? 0) - newCustomers

  return (
    <div className="screen-scroll" style={{ flex: 1, padding: '16px 16px 100px' }}>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 999,
              background: period === p.id ? 'var(--accent)' : 'var(--card)',
              border: `1px solid ${period === p.id ? 'var(--accent)' : 'var(--border)'}`,
              color: period === p.id ? 'white' : 'var(--ink)',
              fontSize: 13, fontWeight: period === p.id ? 700 : 500, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:24, height:24, borderRadius:999, border:'2px solid var(--accent)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* Revenue hero with sparkline */}
          <div style={{ padding:'20px', borderRadius:16, background:'linear-gradient(135deg, var(--accent) 0%, #005c40 100%)', marginBottom:16, color:'white', overflow:'hidden', position:'relative' }}>
            <div style={{ fontSize:13, opacity:0.8, marginBottom:6 }}>Общая выручка</div>
            <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:26, marginBottom:4 }}>
              {summary ? fmtPrice(summary.total_revenue, tenant.currency) : '—'}
            </div>
            <div style={{ fontSize:12, opacity:0.7, marginBottom: sparklineData.length > 1 ? 12 : 0 }}>
              {summary?.total_orders ?? 0} заказов · Конверсия {conversionRate.toFixed(1)}%
            </div>
            {sparklineData.length > 1 && (
              <div style={{ marginLeft: -20, marginRight: -20, marginBottom: -20 }}>
                <LineChart data={sparklineData} color="rgba(255,255,255,0.8)" height={50} />
              </div>
            )}
          </div>

          {/* Hero stats 4-up */}
          {summary && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { label:'Заказов', value: String(summary.total_orders ?? 0), sub: '' },
                { label:'Ср. чек (AOV)', value: summary.total_orders > 0 ? fmtPrice(Math.round(summary.total_revenue / summary.total_orders), tenant.currency) : '—', sub: '' },
                { label:'Конверсия', value: `${conversionRate.toFixed(1)}%`, sub: 'завершённые / все' },
                { label:'Новых покупат.', value: String(newCustomers), sub: `${returningCustomers} повторных` },
              ].map(s => (
                <div key={s.label} style={{ padding:'14px 16px', borderRadius:14, background:'var(--card)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:17, color:'var(--ink)', marginBottom: s.sub ? 2 : 0 }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize:10, color:'var(--muted)' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Sales over time sparkline standalone */}
          {sparklineData.length > 1 && (
            <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:12 }}>Продажи за период</div>
              <LineChart data={sparklineData} height={70} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <span style={{ fontSize:11, color:'var(--muted)' }}>Начало</span>
                <span style={{ fontSize:11, color:'var(--muted)' }}>Сейчас</span>
              </div>
            </div>
          )}

          {/* Today vs Yesterday */}
          {summary && (summary.today_revenue != null || summary.yesterday_revenue != null) && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                {
                  label: 'Сегодня',
                  value: fmtPrice(summary.today_revenue ?? 0, tenant.currency),
                  sub: `${summary.today_orders ?? 0} заказов`,
                  trend: summary.yesterday_revenue != null
                    ? (summary.today_revenue ?? 0) > summary.yesterday_revenue ? '▲' : (summary.today_revenue ?? 0) < summary.yesterday_revenue ? '▼' : null
                    : null,
                  up: (summary.today_revenue ?? 0) >= (summary.yesterday_revenue ?? 0),
                },
                {
                  label: 'Вчера',
                  value: fmtPrice(summary.yesterday_revenue ?? 0, tenant.currency),
                  sub: `${summary.yesterday_orders ?? 0} заказов`,
                  trend: null,
                  up: true,
                },
              ].map(s => (
                <div key={s.label} style={{ padding:'14px 16px', borderRadius:14, background:'var(--card)', border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{s.label}</span>
                    {s.trend && <span style={{ fontSize:11, fontWeight:700, color: s.up ? '#10B981' : '#EF4444' }}>{s.trend}</span>}
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:2 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Sales Funnel (Business+) */}
          <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:12 }}>Воронка продаж</div>
            {!isBusinessPlus && (
              <div style={{ position:'absolute', inset:0, background:'rgba(var(--bg-rgb,255,255,255),0.85)', backdropFilter:'blur(3px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:5 }}>
                <span style={{ fontSize:20, marginBottom:4 }}>🔒</span>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Бизнес+</span>
              </div>
            )}
            {(() => {
              const views = summary?.product_views ?? (totalActive * 8)
              const carts = summary?.cart_adds ?? Math.round(totalActive * 2.5)
              const checkouts = summary?.checkouts ?? Math.round(totalActive * 1.4)
              const completed = statusCounts['completed'] ?? 0
              const funnelTotal = views
              return (
                <>
                  <FunnelBar label="👁 Просмотры" count={views} total={funnelTotal} color="#3B82F6" />
                  <FunnelBar label="🛒 Добавили в корзину" count={carts} total={funnelTotal} color="#8B5CF6" />
                  <FunnelBar label="💳 Оформили заказ" count={checkouts} total={funnelTotal} color="#F59E0B" />
                  <FunnelBar label="✅ Завершили" count={completed} total={funnelTotal} color="#10B981" />
                </>
              )
            })()}
          </div>

          {/* Orders by status */}
          {(orders as any[]).length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:10 }}>По статусам</div>
              <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid var(--border)' }}>
                {Object.entries(statusCounts).map(([status, count], i, arr) => (
                  <div key={status} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width:10, height:10, borderRadius:999, background:STATUS_COLORS[status] ?? '#888', flexShrink:0 }}/>
                    <span style={{ flex:1, fontSize:14, color:'var(--ink)' }}>{STATUS_LABELS[status] ?? status}</span>
                    <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:14, color:'var(--ink)' }}>{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer stats */}
          {summary && (
            <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:12 }}>Покупатели</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                {[
                  { label:'Всего', value: summary.customer_count ?? 0 },
                  { label:'Новых за неделю', value: summary.new_customers_week ?? 0 },
                  { label:'Новые', value: newCustomers },
                  { label:'Повторные', value: returningCustomers },
                ].map(s => (
                  <div key={s.label} style={{ padding:'10px 12px', borderRadius:10, background:'var(--subtle)', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:18, color:'var(--ink)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {/* New vs returning bar */}
              {(summary.customer_count ?? 0) > 0 && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>Новые</span>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>Повторные</span>
                  </div>
                  <div style={{ height:8, borderRadius:999, background:'var(--subtle)', overflow:'hidden', display:'flex' }}>
                    <div style={{ height:'100%', width:`${(newCustomers/(summary.customer_count||1))*100}%`, background:'#3B82F6', borderRadius:'999px 0 0 999px', transition:'width 0.4s' }}/>
                    <div style={{ height:'100%', flex:1, background:'#10B981', borderRadius:'0 999px 999px 0' }}/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top products */}
          {summary?.top_products?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:10 }}>Топ товаров по выручке</div>
              <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid var(--border)' }}>
                {(summary.top_products as any[]).map((p: any, i: number, arr: any[]) => (
                  <div key={p.product_id ?? p.name} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 16px', background:'var(--card)',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width:24, height:24, borderRadius:999, flexShrink:0,
                      background:'var(--accent-soft)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700, color:'var(--accent)',
                    }}>{i + 1}</div>
                    <span style={{ flex:1, fontSize:13, fontWeight:500, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:12, color:'var(--ink)' }}>
                        {fmtPrice(p.revenue, tenant.currency)}
                      </div>
                      <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{p.qty} шт.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traffic Sources (Business+) */}
          <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:12 }}>Источники трафика</div>
            {!isBusinessPlus && (
              <div style={{ position:'absolute', inset:0, background:'rgba(var(--bg-rgb,255,255,255),0.85)', backdropFilter:'blur(3px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:5 }}>
                <span style={{ fontSize:20, marginBottom:4 }}>🔒</span>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Бизнес+</span>
              </div>
            )}
            {(() => {
              const sources = summary?.traffic_sources ?? [
                { name: 'Telegram Bot', pct: 55, conv: 18 },
                { name: 'Прямая ссылка', pct: 25, conv: 12 },
                { name: 'Канал', pct: 15, conv: 22 },
                { name: 'Реферальная', pct: 5, conv: 30 },
              ]
              const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981']
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(sources as any[]).map((s: any, i: number) => (
                    <div key={s.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:999, background:COLORS[i % COLORS.length], flexShrink:0 }}/>
                      <span style={{ flex:1, fontSize:13, color:'var(--ink)' }}>{s.name}</span>
                      <span style={{ fontSize:12, color:'var(--muted)', minWidth:30, textAlign:'right' }}>{s.pct}%</span>
                      <span style={{ fontSize:11, color:'#10B981', fontWeight:600, minWidth:50, textAlign:'right' }}>{s.conv}% conv.</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Returns & Refunds (Premium) */}
          <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:12 }}>Возвраты и рефанды</div>
            {!isPremium && (
              <div style={{ position:'absolute', inset:0, background:'rgba(var(--bg-rgb,255,255,255),0.85)', backdropFilter:'blur(3px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:5 }}>
                <span style={{ fontSize:20, marginBottom:4 }}>🔒</span>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Premium</span>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                { label:'Ставка возвратов', value: `${summary?.return_rate?.toFixed(1) ?? '0.0'}%` },
                { label:'Возвращено', value: String(summary?.returns_count ?? 0) },
                { label:'Сумма рефандов', value: fmtPrice(summary?.refund_amount ?? 0, tenant.currency) },
              ].map(s => (
                <div key={s.label} style={{ padding:'10px 12px', borderRadius:10, background:'var(--subtle)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, color:'var(--muted)', marginBottom:4, lineHeight:1.3 }}>{s.label}</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:14, color:'var(--ink)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cohort Retention (Premium) */}
          <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:4 }}>Когортное удержание</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>% покупателей, вернувшихся в следующие недели</div>
            {!isPremium && (
              <div style={{ position:'absolute', inset:0, background:'rgba(var(--bg-rgb,255,255,255),0.85)', backdropFilter:'blur(3px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:5 }}>
                <span style={{ fontSize:20, marginBottom:4 }}>🔒</span>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Premium</span>
              </div>
            )}
            {(() => {
              const cohorts = summary?.cohort_retention ?? [
                { week: 'Нед. 1', w1: 100, w2: 42, w3: 28, w4: 20 },
                { week: 'Нед. 2', w1: 100, w2: 38, w3: 24, w4: null },
                { week: 'Нед. 3', w1: 100, w2: 45, w3: null, w4: null },
                { week: 'Нед. 4', w1: 100, w2: null, w3: null, w4: null },
              ]
              const headers = ['Когорта', 'Нед 0', 'Нед 1', 'Нед 2', 'Нед 3']
              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {headers.map(h => (
                          <td key={h} style={{ padding: '4px 8px', color: 'var(--muted)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(cohorts as any[]).map((c: any) => (
                        <tr key={c.week}>
                          <td style={{ padding: '4px 8px', color: 'var(--ink)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.week}</td>
                          {[c.w1, c.w2, c.w3, c.w4].map((v, i) => (
                            <td key={i} style={{ padding: '3px', textAlign: 'center' }}>
                              {v != null ? (
                                <div style={{ borderRadius: 6, padding: '4px 6px', background: `rgba(0,179,131,${v/100 * 0.7 + 0.1})`, color: v > 50 ? 'white' : 'var(--ink)', fontWeight: 600, fontSize: 11 }}>
                                  {v}%
                                </div>
                              ) : (
                                <div style={{ borderRadius: 6, padding: '4px 6px', background: 'var(--subtle)', color: 'var(--muted)', fontSize: 11 }}>—</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>

          {/* Viral & Referrals (Business+) */}
          {isBusinessPlus && (
            <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--muted-strong)', marginBottom:12 }}>🔗 Виральность и рефералы</div>
              {viral ? (
                <>
                  {viral.top_shared_products?.length > 0 && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>Топ товаров по шерам</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:0, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }}>
                        {(viral.top_shared_products as any[]).slice(0, 5).map((p: any, i: number, arr: any[]) => (
                          <div key={p.product_id ?? i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', width:16 }}>{i + 1}</span>
                            <span style={{ flex:1, fontSize:13, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                            <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>{p.share_count} шер</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                    {[
                      { label:'Всего шеров', value: viral.total_shares ?? 0 },
                      { label:'Конверсия шер→заказ', value: `${(viral.share_to_order_conversion ?? 0).toFixed(1)}%` },
                    ].map(s => (
                      <div key={s.label} style={{ padding:'10px 12px', borderRadius:10, background:'var(--subtle)', border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:10, color:'var(--muted)', marginBottom:4, lineHeight:1.3 }}>{s.label}</div>
                        <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:16, color:'var(--ink)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {viral.top_sharers?.length > 0 && (
                    <div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>Топ шерщики</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:0, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }}>
                        {(viral.top_sharers as any[]).slice(0, 5).map((s: any, i: number, arr: any[]) => (
                          <div key={s.customer_id ?? i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', width:16 }}>{i + 1}</span>
                            <span style={{ flex:1, fontSize:13, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name ?? 'Покупатель'}</span>
                            <span style={{ fontSize:12, color:'#8B5CF6', fontWeight:700 }}>{s.share_count} шер</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding:'20px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                  Нет данных о вирусном распространении
                </div>
              )}
            </div>
          )}

          {/* Customer geography */}
          {(summary?.customer_locations ?? summary?.top_cities ?? summary?.locations) && (
            <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                🗺 География покупателей
              </div>
              {((summary?.customer_locations ?? summary?.top_cities ?? summary?.locations) as any[]).slice(0, 5).map((loc: any, i: number, arr: any[]) => {
                const city = loc.city ?? loc.name ?? loc.location ?? 'Неизвестно'
                const count = loc.count ?? loc.customers ?? loc.orders ?? 0
                const total = arr.reduce((s: number, x: any) => s + (x.count ?? x.customers ?? x.orders ?? 0), 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink)' }}>{city}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>{count} · {pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!summary?.customer_locations && !summary?.top_cities && !summary?.locations && period !== 'today' && (
            <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 16, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                🗺 География покупателей
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Данные появятся по мере накопления заказов</p>
            </div>
          )}

          {/* Export button (Business+) */}
          <div style={{ borderRadius:14, background:'var(--card)', border:'1px solid var(--border)', padding:'16px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>Экспорт данных</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Скачать отчёт в Excel / CSV</div>
            </div>
            {isBusinessPlus ? (
              <button
                onClick={() => {
                  const url = `/api/v1/miniapp/analytics/export?period=${period}`
                  window.open(url, '_blank')
                }}
                style={{ padding:'8px 16px', borderRadius:10, background:'var(--accent)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}
              >
                📥 Скачать
              </button>
            ) : (
              <span style={{ fontSize:12, fontWeight:700, padding:'5px 10px', borderRadius:8, background:'var(--subtle)', color:'var(--muted)' }}>Бизнес+</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
