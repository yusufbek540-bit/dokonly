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
  { id: 'all',   label: 'Всё время' },
]

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

  const statusCounts = orders.reduce((acc: Record<string, number>, o: any) => {
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
          {/* Revenue hero */}
          <div style={{ padding:'20px', borderRadius:16, background:'linear-gradient(135deg, var(--accent) 0%, #005c40 100%)', marginBottom:16, color:'white' }}>
            <div style={{ fontSize:13, opacity:0.8, marginBottom:8 }}>Общая выручка</div>
            <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:26, marginBottom:4 }}>
              {summary ? fmtPrice(summary.total_revenue, tenant.currency) : '—'}
            </div>
            <div style={{ fontSize:12, opacity:0.7 }}>{summary?.total_orders ?? 0} заказов всего</div>
          </div>

          {/* Today vs Yesterday */}
          {summary && (
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

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { label:'Заказов', value: summary?.total_orders ?? '—', icon:'box' },
              { label:'Новых', value: summary?.new_orders ?? '—', icon:'starFilled' },
              { label:'Товаров', value: summary?.product_count ?? '—', icon:'cart' },
              { label:'Завершено', value: statusCounts['completed'] ?? 0, icon:'check' },
            ].map(s => (
              <div key={s.label} style={{ padding:'14px 16px', borderRadius:14, background:'var(--card)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>{s.label}</span>
                  <Icon name={s.icon} size={14} color="var(--muted)"/>
                </div>
                <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:18, color:'var(--ink)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Orders by status */}
          {orders.length > 0 && (
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { label:'Покупателей', value: summary.customer_count ?? 0, icon:'users', sub:'всего' },
                { label:'Новых за неделю', value: summary.new_customers_week ?? 0, icon:'starFilled', sub:'покупателей' },
              ].map(s => (
                <div key={s.label} style={{ padding:'14px 16px', borderRadius:14, background:'var(--card)', border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{s.label}</span>
                    <Icon name={s.icon} size={14} color="var(--muted)"/>
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:22, color:'var(--ink)', marginBottom:2 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{s.sub}</div>
                </div>
              ))}
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

          {/* Coming soon */}
          <div style={{ padding:'20px', borderRadius:16, background:'var(--subtle)', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
            <div style={{ fontFamily:'Sora', fontWeight:600, fontSize:15, color:'var(--ink)', marginBottom:6 }}>Детальная аналитика</div>
            <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>
              Графики продаж, конверсия и сравнение периодов — в тарифе Бизнес+
            </div>
          </div>
        </>
      )}
    </div>
  )
}
