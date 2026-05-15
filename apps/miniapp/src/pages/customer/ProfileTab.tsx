import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

interface Props {
  tenantId: string
  currency: string
  shop?: any
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const STATUS_LABEL: Record<string, string> = {
  created: 'Новый',
  new: 'Новый',
  confirmed: 'Подтверждён',
  shipping: 'В пути',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  created:   { bg: '#EFF6FF', color: '#1D4ED8' },
  new:       { bg: '#EFF6FF', color: '#1D4ED8' },
  confirmed: { bg: '#F0FDF4', color: '#15803D' },
  shipping:  { bg: '#FFF7ED', color: '#C2410C' },
  delivered: { bg: '#F0FDF4', color: '#166534' },
  cancelled: { bg: '#FEF2F2', color: '#DC2626' },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Банковская карта',
  click: 'Click',
  payme: 'Payme',
  uzum: 'Uzum',
}

const DELIVERY_LABELS: Record<string, string> = {
  pickup: 'Самовывоз',
  delivery: 'Доставка',
  yandex: 'Яндекс Go',
  bts: 'BTS Express',
}

const TIMELINE_STEPS = ['Новый', 'Подтверждён', 'В пути', 'Доставлен']

function statusToStep(status: string): number {
  switch (status) {
    case 'new':
    case 'created':
      return 0
    case 'confirmed':
      return 1
    case 'shipping':
      return 2
    case 'delivered':
    case 'completed':
      return 3
    default:
      return 0
  }
}

// ─── OrderDetail ──────────────────────────────────────────────────────────────

function OrderDetail({ order, currency, onBack }: { order: any; currency: string; onBack: () => void }) {
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
  const firstName = tgUser?.first_name ?? ''
  const lastName = tgUser?.last_name ?? ''
  const username = tgUser?.username ?? ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Покупатель'

  const statusKey = order.status ?? 'new'
  const statusLabel = STATUS_LABEL[statusKey] ?? statusKey
  const statusStyle = STATUS_COLOR[statusKey] ?? { bg: 'var(--subtle)', color: 'var(--muted)' }
  const orderId = '#' + (order.id ?? '').slice(0, 8).toUpperCase()
  const total = order.total_amount ?? order.total ?? 0
  const currentStep = statusToStep(statusKey)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 999,
            background: 'var(--subtle)', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: 'var(--ink)', flex: 1 }}>
          {orderId}
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
          background: statusStyle.bg, color: statusStyle.color,
        }}>
          {statusLabel}
        </span>
      </div>

      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 32 }}>
        {/* Customer info */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: 'var(--card)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Покупатель
            </div>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
              {displayName}
            </div>
            {username && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                @{username}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Состав заказа
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {order.items.map((item: any, idx: number) => {
                  const qty = item.quantity ?? item.qty ?? 1
                  const price = item.price ?? 0
                  const subtotal = qty * price
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--subtle)', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
                          {item.product_name ?? item.name ?? 'Товар'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {item.size && <span>{item.size} · </span>}
                          {qty} шт · {fmtPrice(price, currency)}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)', flexShrink: 0 }}>
                        {fmtPrice(subtotal, currency)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Delivery & Payment */}
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 10 }}>
          {order.delivery_type && (
            <div style={{
              flex: 1, padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Доставка
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {DELIVERY_LABELS[order.delivery_type] ?? order.delivery_type}
              </div>
            </div>
          )}
          {order.payment_method && (
            <div style={{
              flex: 1, padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Оплата
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
              </div>
            </div>
          )}
        </div>

        {/* Status timeline */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            padding: '16px', borderRadius: 14,
            background: 'var(--card)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Статус заказа
            </div>
            {/* Dots row */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              {/* Background connector line — sits at dot center (dot is 12px tall, line is 2px → top: 5px) */}
              <div style={{
                position: 'absolute', top: 8, left: 10, right: 10,
                height: 2, background: 'var(--border)', zIndex: 0,
              }} />
              {/* Filled connector up to current step */}
              {currentStep > 0 && (
                <div style={{
                  position: 'absolute', top: 8, left: 10,
                  width: `calc(${(currentStep / (TIMELINE_STEPS.length - 1)) * 100}% - 20px)`,
                  height: 2, background: 'var(--accent)', zIndex: 1,
                }} />
              )}
              {TIMELINE_STEPS.map((step, idx) => {
                const done = idx <= currentStep
                const isCurrent = idx === currentStep
                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 2, flex: 1 }}>
                    <div style={{
                      width: isCurrent ? 18 : 12,
                      height: isCurrent ? 18 : 12,
                      borderRadius: 999,
                      background: done ? 'var(--accent)' : 'var(--bg)',
                      border: done ? 'none' : '2px solid var(--border)',
                      boxShadow: isCurrent ? '0 0 0 3px var(--accent-soft)' : 'none',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 10, fontWeight: isCurrent ? 700 : 400,
                      color: done ? 'var(--accent)' : 'var(--muted)',
                      textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Total */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            padding: '16px', borderRadius: 14,
            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              Итого
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>
              {fmtPrice(Number(total), currency)}
            </span>
          </div>
        </div>

        {/* Date */}
        {order.created_at && (
          <div style={{ padding: '10px 16px 0', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Заказ от {fmtDate(order.created_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AboutStore ───────────────────────────────────────────────────────────────

function AboutStore({ shop, currency, onBack }: { shop: any; currency: string; onBack: () => void }) {
  const contact = shop.contact_info ?? {}
  const settings = shop.settings ?? {}
  const deliveryMethods: any[] = settings.delivery_methods ?? []
  const enabledDeliveries = deliveryMethods.filter((d: any) => d.enabled)

  function fmt(price: number) {
    if (currency === 'UZS') return price === 0 ? 'Бесплатно' : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
    return price === 0 ? 'Бесплатно' : price + ' ' + currency
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 999,
            background: 'var(--subtle)', flexShrink: 0,
          }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>
          О магазине
        </span>
      </div>

      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 40 }}>
        {/* Cover + Logo hero */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          {shop.cover_url ? (
            <img src={shop.cover_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: 120, background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--subtle) 100%)' }} />
          )}
          <div style={{
            position: 'absolute', bottom: -28, left: 16,
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--card)', border: '3px solid var(--bg)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            {shop.logo_url
              ? <img src={shop.logo_url} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>
                  {shop.name?.[0]?.toUpperCase() ?? '?'}
                </span>
            }
          </div>
        </div>

        {/* Name */}
        <div style={{ padding: '32px 16px 0' }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 4 }}>
            {shop.name}
          </div>
        </div>

        {/* Description */}
        {shop.description && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                О магазине
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
                {shop.description}
              </div>
            </div>
          </div>
        )}

        {/* Contacts */}
        {(contact.phone || contact.telegram || contact.instagram || contact.address) && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Контакты
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none' }}>
                    <span style={{ fontSize: 16 }}>📞</span>
                    <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>{contact.phone}</span>
                  </a>
                )}
                {contact.telegram && (
                  <a href={`https://t.me/${contact.telegram.replace('@','')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none' }}>
                    <span style={{ fontSize: 16 }}>✈️</span>
                    <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>{contact.telegram.startsWith('@') ? contact.telegram : `@${contact.telegram}`}</span>
                  </a>
                )}
                {contact.instagram && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 16 }}>📷</span>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>{contact.instagram.startsWith('@') ? contact.instagram : `@${contact.instagram}`}</span>
                  </div>
                )}
                {contact.address && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>{contact.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delivery */}
        {enabledDeliveries.length > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                🚚 Доставка
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {enabledDeliveries.map((d: any) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>{d.label ?? d.id}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: d.price === 0 ? 'var(--accent)' : 'var(--ink)' }}>
                      {fmt(d.price ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Powered by footer */}
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--muted)' }}>
          Работает на <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Dokonly</span>
        </div>
      </div>
    </div>
  )
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────

type OrderTabId = 'active' | 'all' | 'completed' | 'cancelled'
const ORDER_TABS: { id: OrderTabId; label: string; statuses: string[] | null }[] = [
  { id: 'active',    label: 'Активные',    statuses: ['new', 'created', 'confirmed', 'shipping'] },
  { id: 'all',       label: 'Все',         statuses: null },
  { id: 'completed', label: 'Завершённые', statuses: ['delivered', 'completed'] },
  { id: 'cancelled', label: 'Отменённые',  statuses: ['cancelled'] },
]

export function ProfileTab({ tenantId, currency, shop }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showWishlist, setShowWishlist] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [orderTab, setOrderTab] = useState<OrderTabId>('active')

  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user

  const firstName = tgUser?.first_name ?? ''
  const lastName = tgUser?.last_name ?? ''
  const username = tgUser?.username ?? ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Покупатель'
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'П'

  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', tenantId],
    queryFn: () => api.getMyOrders(tenantId),
    retry: false,
  })

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist', tenantId],
    queryFn: () => api.getWishlist(tenantId),
    retry: false,
  })

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: () => api.getProducts(tenantId),
    retry: false,
    enabled: showWishlist,
  })

  const { mutate: removeFromWishlist } = useMutation({
    mutationFn: (productId: string) => api.toggleWishlist(tenantId, productId),
    onMutate: async (productId: string) => {
      await qc.cancelQueries({ queryKey: ['wishlist', tenantId] })
      const prev = qc.getQueryData<string[]>(['wishlist', tenantId]) ?? []
      qc.setQueryData(['wishlist', tenantId], prev.filter(id => id !== productId))
      return { prev }
    },
    onError: (_e: any, _v: any, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['wishlist', tenantId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['wishlist', tenantId] })
    },
  })

  const wishlistProducts = (allProducts as any[]).filter(p => wishlistIds.includes(p.id))

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        currency={currency}
        onBack={() => setSelectedOrder(null)}
      />
    )
  }

  if (showAbout && shop) {
    return <AboutStore shop={shop} currency={currency} onBack={() => setShowAbout(false)} />
  }

  if (showWishlist) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg)', borderBottom: '1px solid var(--border)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            onClick={() => setShowWishlist(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 999,
              background: 'var(--subtle)', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Icon name="arrowLeft" size={18} color="var(--ink)" />
          </button>
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>
            Избранное
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{wishlistIds.length}</span>
        </div>
        <div className="screen-scroll" style={{ flex: 1, padding: 16, paddingBottom: 40 }}>
          {wishlistProducts.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❤</div>
              <p style={{ fontSize: 14 }}>Сохраняйте товары сердечком</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wishlistProducts.map((p: any) => (
                <div key={p.id} style={{
                  display: 'flex', gap: 12, padding: '12px',
                  background: 'var(--card)', borderRadius: 14,
                  border: '1px solid var(--border)',
                  alignItems: 'center',
                }}>
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}/>
                    : <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--subtle)', flexShrink: 0 }}/>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                      {fmtPrice(Number(p.price), currency)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromWishlist(p.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 999,
                      background: 'var(--subtle)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5">
                      <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.8a3.5 3.5 0 0 1 6.5 1.7C14.5 9.5 8 13.5 8 13.5z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
      }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
          Профиль
        </div>
      </div>

      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24 }}>
        {/* User card */}
        <div style={{ padding: '20px 16px 16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px', borderRadius: 16,
            background: 'var(--card)', border: '1px solid var(--border)',
          }}>
            {tgUser?.photo_url ? (
              <img
                src={tgUser.photo_url}
                alt={displayName}
                style={{ width: 56, height: 56, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 999, flexShrink: 0,
                background: 'var(--accent)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Sora', fontWeight: 700, fontSize: 22,
              }}>
                {avatarLetter}
              </div>
            )}
            <div>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
                {displayName}
              </div>
              {username && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  @{username}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        {orders.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 10, padding: '14px 16px',
              borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>
                  {orders.length}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>заказов</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                  {fmtPrice(orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0), currency)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>потрачено</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick menu */}
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={() => setShowWishlist(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
              marginBottom: 8, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18 }}>❤</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
              Избранное
            </span>
            {wishlistIds.length > 0 && (
              <span style={{
                minWidth: 22, height: 22, borderRadius: 999,
                background: 'var(--accent)', color: 'white',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 6px',
              }}>{wishlistIds.length}</span>
            )}
            <Icon name="chevronRight" size={16} color="var(--muted)" />
          </button>

          {shop?.contact_info?.telegram && (
            <button
              onClick={() => {
                const handle = (shop.contact_info.telegram ?? '').replace('@', '')
                const url = `https://t.me/${handle}`;
                (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, '_blank')
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                background: 'var(--card)', border: '1px solid var(--border)',
                marginBottom: 8, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>💬</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Написать продавцу
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
          )}

          {shop && (
            <button
              onClick={() => setShowAbout(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                background: 'var(--card)', border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🏪</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                О магазине
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
          )}
        </div>

        {/* Orders section */}
        <div style={{ padding: '0 16px' }}>
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 12 }}>
            Мои заказы
          </h3>

          {/* Filter tabs */}
          {orders.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, marginBottom: 12,
              overflowX: 'auto', scrollbarWidth: 'none',
            }}>
              {ORDER_TABS.map(t => {
                const count = t.statuses
                  ? (orders as any[]).filter(o => t.statuses!.includes(o.status)).length
                  : (orders as any[]).length
                return (
                  <button
                    key={t.id}
                    onClick={() => setOrderTab(t.id)}
                    style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 999,
                      background: orderTab === t.id ? 'var(--accent)' : 'var(--card)',
                      border: `1px solid ${orderTab === t.id ? 'var(--accent)' : 'var(--border)'}`,
                      color: orderTab === t.id ? 'white' : 'var(--ink)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {t.label}{count > 0 ? ` (${count})` : ''}
                  </button>
                )
              })}
            </div>
          )}

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                border: '2px solid var(--accent)', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }}/>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (() => {
            const tab = ORDER_TABS.find(t => t.id === orderTab)!
            const filtered = tab.statuses
              ? (orders as any[]).filter(o => tab.statuses!.includes(o.status))
              : (orders as any[])

            if (filtered.length === 0) {
              const emptyMsg = orderTab === 'active' ? 'Нет активных заказов'
                : orderTab === 'completed' ? 'Завершённых заказов нет'
                : orderTab === 'cancelled' ? 'Отменённых заказов нет'
                : 'Заказов пока нет'
              return (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
                  <p style={{ fontSize: 14 }}>{emptyMsg}</p>
                </div>
              )
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map((order: any) => {
                  const statusKey = order.status ?? 'new'
                  const statusLabel = STATUS_LABEL[statusKey] ?? statusKey
                  const statusStyle = STATUS_COLOR[statusKey] ?? { bg: 'var(--subtle)', color: 'var(--muted)' }
                  const orderId = (order.id ?? '').slice(0, 8).toUpperCase()
                  const total = order.total_amount ?? order.total ?? 0
                  const date = order.created_at ?? order.date ?? ''
                  const items: any[] = order.items ?? []
                  const firstImage = items.find(i => i.image_url)?.image_url ?? null

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: '12px 14px', borderRadius: 14,
                        background: 'var(--card)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {/* Thumbnail */}
                      {firstImage ? (
                        <img src={firstImage} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                          background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 20 }}>📦</span>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                            #{orderId}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: statusStyle.bg, color: statusStyle.color,
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                            {fmtPrice(Number(total), currency)}
                          </span>
                          {date && (
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {fmtDate(date)}
                            </span>
                          )}
                        </div>
                        {items.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {items.length} {items.length === 1 ? 'товар' : items.length < 5 ? 'товара' : 'товаров'}
                          </div>
                        )}
                      </div>
                      <Icon name="chevronRight" size={16} color="var(--muted)" />
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
