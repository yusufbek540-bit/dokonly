import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

const STATUSES = [
  { id: 'new', label: 'Новые', next: 'confirmed' },
  { id: 'confirmed', label: 'Готовятся', next: 'shipping' },
  { id: 'shipping', label: 'Доставка', next: 'delivered' },
  { id: 'delivered', label: 'Доставлено', next: 'completed' },
  { id: 'completed', label: 'Завершено', next: null },
]

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6', confirmed: '#8B5CF6', shipping: '#F59E0B',
  delivered: '#10B981', completed: '#00B383', cancelled: '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', shipping: 'Доставка',
  delivered: 'Доставлен', completed: 'Завершён', cancelled: 'Отменён',
}

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Карта', click: 'Click', payme: 'Payme', cash: 'Наличные', stars: 'Stars',
}

const TIMELINE_STEPS = [
  { id: 'new', label: 'Создан' },
  { id: 'confirmed', label: 'Подтверждён' },
  { id: 'shipping', label: 'Доставка' },
  { id: 'delivered', label: 'Доставлен' },
  { id: 'completed', label: 'Завершён' },
]

const NEXT_STATUS: Record<string, string> = {
  new: 'confirmed', confirmed: 'shipping', shipping: 'delivered', delivered: 'completed',
}

const NEXT_LABEL: Record<string, string> = {
  new: 'Подтвердить заказ', confirmed: 'Отправить', shipping: 'Отметить доставленным', delivered: 'Завершить',
}

interface Props { tenant: any }

function OrderDetail({ order, currency, onBack, onStatusUpdate }: {
  order: any
  currency: string
  onBack: () => void
  onStatusUpdate: (updated: any) => void
}) {
  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.seller.updateOrderStatus(id, status),
    onSuccess: (data) => onStatusUpdate(data),
  })

  const nextStatus = NEXT_STATUS[order.status]
  const currentIdx = TIMELINE_STEPS.findIndex(s => s.id === order.status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg)', minHeight: 0 }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <Icon name="arrowLeft" size={18}/>
        </button>
        <div style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
          Заказ #{order.id.slice(0, 8).toUpperCase()}
        </div>
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: (STATUS_COLORS[order.status] ?? '#888') + '20', color: STATUS_COLORS[order.status] ?? '#888', fontWeight: 700 }}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="screen-scroll" style={{ flex: 1, paddingBottom: nextStatus ? 0 : 40 }}>
        {/* Customer section */}
        <div style={{ margin: '16px 16px 0', padding: '14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Покупатель</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{order.customer_name || 'Не указано'}</div>
          {order.customer_phone && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{order.customer_phone}</div>}
          {/* Quick action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {order.customer_phone && (
              <a
                href={`tel:${order.customer_phone}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 999,
                  background: 'var(--subtle)', border: '1px solid var(--border)',
                  fontSize: 13, fontWeight: 500, color: 'var(--ink)', textDecoration: 'none',
                }}
              >
                📞 Позвонить
              </a>
            )}
            {order.customer_telegram_id && (
              <button
                onClick={() => {
                  const url = `tg://user?id=${order.customer_telegram_id}`;
                  (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, '_blank')
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 999,
                  background: 'var(--subtle)', border: '1px solid var(--border)',
                  fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                }}
              >
                💬 Написать
              </button>
            )}
          </div>
          {order.delivery_address && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <Icon name="pin" size={13} color="var(--muted)"/>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{order.delivery_address}</span>
            </div>
          )}
          {order.delivery_type === 'pickup' && <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>Самовывоз</div>}
        </div>

        {/* Items section */}
        <div style={{ margin: '12px 16px 0', padding: '14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Товары</div>
          {(order.items ?? []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Нет данных о товарах</div>
          ) : (
            <>
              {(order.items ?? []).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{item.product_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {item.quantity} шт.{item.size ? ` · ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)', flexShrink: 0, marginLeft: 12 }}>
                    {fmtPrice(Number(item.subtotal), currency)}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Итого</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{fmtPrice(Number(order.total), currency)}</span>
              </div>
            </>
          )}
        </div>

        {/* Status timeline */}
        <div style={{ margin: '12px 16px 0', padding: '14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Статус</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {TIMELINE_STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: idx < TIMELINE_STEPS.length - 1 ? 'none' : 1 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 999,
                    background: idx <= currentIdx ? 'var(--accent)' : 'var(--border)',
                    border: idx === currentIdx ? '3px solid var(--accent)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {idx < currentIdx && <Icon name="check" size={10} color="white"/>}
                  </div>
                  <div style={{ fontSize: 9, color: idx <= currentIdx ? 'var(--accent)' : 'var(--muted)', textAlign: 'center', marginTop: 4, maxWidth: 44, lineHeight: 1.2 }}>{step.label}</div>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: idx < currentIdx ? 'var(--accent)' : 'var(--border)', margin: '0 3px', marginBottom: 16 }}/>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Payment section */}
        <div style={{ margin: '12px 16px 0', padding: '14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Оплата</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>Метод</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>Статус</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: order.payment_status === 'paid' ? 'var(--accent)' : 'var(--muted)' }}>
              {order.payment_status === 'paid' ? 'Оплачено ✓' : 'Ожидает оплаты'}
            </span>
          </div>
        </div>

        {/* Spacer so content doesn't hide behind sticky button */}
        {nextStatus && <div style={{ height: 90 }}/>}
      </div>

      {/* Action button — sticky bottom */}
      {nextStatus && (
        <div style={{ padding: '10px 16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <button
            disabled={advanceMutation.isPending}
            onClick={() => advanceMutation.mutate({ id: order.id, status: nextStatus })}
            style={{ width: '100%', height: 52, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: advanceMutation.isPending ? 'default' : 'pointer' }}
          >
            {advanceMutation.isPending ? 'Сохраняем...' : NEXT_LABEL[order.status]}
          </button>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, currency, onAdvance, onTap }: { order: any; currency: string; onAdvance: () => void; onTap: () => void }) {
  const statusDef = STATUSES.find(s => s.id === order.status)
  const canAdvance = !!statusDef?.next

  return (
    <div onClick={onTap} style={{
      padding: '14px', borderRadius: 14,
      background: 'var(--card)', border: '1px solid var(--border)',
      marginBottom: 8, cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {order.customer_name || 'Покупатель'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {order.customer_phone} · {order.created_at ? timeAgo(order.created_at) : ''}
          </div>
        </div>
        <span style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 6,
          background: (STATUS_COLORS[order.status] ?? '#888') + '20',
          color: STATUS_COLORS[order.status] ?? '#888',
          fontWeight: 600,
        }}>{statusDef?.label ?? order.status}</span>
      </div>

      {/* Items */}
      {order.items?.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--subtle)' }}>
          {order.items.map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted-strong)', marginBottom: i < order.items.length - 1 ? 4 : 0 }}>
              <span>{item.product_name} × {item.quantity}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{fmtPrice(Number(item.subtotal), currency)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
          {fmtPrice(Number(order.total), currency)}
        </div>
        {canAdvance && (
          <button onClick={(e) => { e.stopPropagation(); onAdvance() }} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10,
            background: 'var(--accent)', color: 'white',
            fontSize: 13, fontWeight: 600,
          }}>
            Далее <Icon name="arrowRight" size={14}/>
          </button>
        )}
      </div>

      {order.delivery_address && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Icon name="pin" size={13} color="var(--muted)" style={{ flexShrink: 0, marginTop: 1 }}/>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{order.delivery_address}</span>
        </div>
      )}
    </div>
  )
}

export function OrdersTab({ tenant }: Props) {
  const [activeStatus, setActiveStatus] = useState('new')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => api.seller.orders(),
  })

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.seller.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders'] }),
  })

  const filteredOrders = orders.filter((o: any) => o.status === activeStatus)
  const countsByStatus = Object.fromEntries(
    STATUSES.map(s => [s.id, orders.filter((o: any) => o.status === s.id).length])
  )

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        currency={tenant.currency}
        onBack={() => setSelectedOrder(null)}
        onStatusUpdate={(updated) => {
          setSelectedOrder(updated)
          qc.invalidateQueries({ queryKey: ['seller-orders'] })
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Status tabs */}
      <div style={{
        display: 'flex', overflowX: 'auto', padding: '14px 16px 0',
        borderBottom: '1px solid var(--border)', gap: 0,
      }}>
        {STATUSES.map(s => (
          <button key={s.id} onClick={() => setActiveStatus(s.id)} style={{
            flexShrink: 0, padding: '8px 14px',
            borderBottom: `2px solid ${activeStatus === s.id ? 'var(--accent)' : 'transparent'}`,
            color: activeStatus === s.id ? 'var(--accent)' : 'var(--muted)',
            fontSize: 13, fontWeight: activeStatus === s.id ? 700 : 500,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {s.label}
            {countsByStatus[s.id] > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700,
                padding: '1px 6px', borderRadius: 999,
                background: activeStatus === s.id ? 'var(--accent)' : 'var(--subtle)',
                color: activeStatus === s.id ? 'white' : 'var(--muted)',
              }}>{countsByStatus[s.id]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '12px 16px 100px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14 }}>Нет заказов в этом статусе</div>
          </div>
        ) : (
          filteredOrders.map((o: any) => {
            const statusDef = STATUSES.find(s => s.id === o.status)
            return (
              <OrderCard
                key={o.id}
                order={o}
                currency={tenant.currency}
                onAdvance={() => statusDef?.next && advanceMutation.mutate({ id: o.id, status: statusDef.next })}
                onTap={() => setSelectedOrder(o)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
