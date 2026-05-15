import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

interface Props { tenant: any }

export function CustomersTab({ tenant }: Props) {
  const [search, setSearch] = useState('')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => api.seller.orders(),
  })

  const customers = useMemo(() => {
    const map = new Map<string, {
      name: string
      phone: string
      orderCount: number
      totalSpent: number
      lastOrderAt: string
    }>()

    for (const order of orders as any[]) {
      const key = order.customer_telegram_id ?? `${order.customer_name}_${order.customer_phone}`
      const existing = map.get(key)
      if (existing) {
        existing.orderCount++
        existing.totalSpent += Number(order.total ?? 0)
        if (order.created_at > existing.lastOrderAt) existing.lastOrderAt = order.created_at
      } else {
        map.set(key, {
          name: order.customer_name ?? 'Покупатель',
          phone: order.customer_phone ?? '',
          orderCount: 1,
          totalSpent: Number(order.total ?? 0),
          lastOrderAt: order.created_at ?? '',
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [orders])

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    )
  }, [customers, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px' }}>
        {/* Summary row */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 28, color: 'var(--accent)' }}>
            {customers.length}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8 }}>
            уникальных покупателей
          </span>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <Icon
            name="search"
            size={16}
            color="var(--muted)"
            style={{ position: 'absolute', left: 12, top: 14 }}
          />
          <input
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 44,
              paddingLeft: 38,
              paddingRight: 12,
              borderRadius: 10,
              background: 'var(--subtle)',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 80 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '2.5px solid var(--accent)',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 32px' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: 'var(--subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Icon name="users" size={28} color="var(--muted)"/>
            </div>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
              Покупателей пока нет
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Здесь появятся покупатели, когда поступят первые заказы
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 32px' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
              Ничего не найдено
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Попробуйте другой запрос
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg)',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'white',
                  fontFamily: 'Sora',
                  fontWeight: 700,
                  fontSize: 16,
                }}>
                  {(c.name[0] ?? '?').toUpperCase()}
                </div>

                {/* Name + phone */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </div>
                  {c.phone ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {c.phone}
                    </div>
                  ) : null}
                </div>

                {/* Right side: orders count + total + last date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                    {c.orderCount} {c.orderCount === 1 ? 'заказ' : c.orderCount < 5 ? 'заказа' : 'заказов'}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    fontFamily: 'JetBrains Mono',
                  }}>
                    {fmtPrice(c.totalSpent, tenant.currency)}
                  </div>
                  {c.lastOrderAt ? (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {fmtDate(c.lastOrderAt)}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
