import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

interface Props {
  tenantId: string
  currency: string
  shop?: any
  onProduct?: (id: string) => void
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

function StarRatingModal({ onSubmit, onClose }: { onSubmit: (rating: number, text: string) => void; onClose: () => void }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg)', borderRadius: '20px 20px 0 0',
          padding: '24px 24px calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 6, textAlign: 'center' }}>
          Оценить заказ
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 20 }}>
          Насколько вам понравился заказ?
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[1,2,3,4,5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: (hovered || rating) >= star ? 'var(--accent-soft)' : 'var(--subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={(hovered || rating) >= star ? 'var(--accent)' : 'none'} stroke="var(--accent)" strokeWidth="1.5">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </button>
          ))}
        </div>

        <textarea
          placeholder="Ваш отзыв (необязательно)"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          style={{
            width: '100%', borderRadius: 12,
            border: '1px solid var(--border)', background: 'var(--card)',
            padding: '10px 12px', fontSize: 14, color: 'var(--ink)',
            resize: 'none', outline: 'none', boxSizing: 'border-box',
            marginBottom: 14,
          }}
        />

        <button
          disabled={rating === 0 || submitting}
          onClick={async () => {
            setSubmitting(true)
            await onSubmit(rating, text)
          }}
          style={{
            width: '100%', height: 50, borderRadius: 14,
            background: rating === 0 ? 'var(--border)' : 'var(--accent)',
            color: rating === 0 ? 'var(--muted)' : 'white',
            fontWeight: 700, fontSize: 15,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Отправляем...' : 'Отправить отзыв'}
        </button>
      </div>
    </div>
  )
}

function OrderDetail({ order: initialOrder, currency, tenantId, onBack, shop }: { order: any; currency: string; tenantId: string; onBack: () => void; shop?: any }) {
  const [order, setOrder] = useState(initialOrder)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)

  const qc = useQueryClient()

  const { mutate: cancelOrder, isPending: isCancelling } = useMutation({
    mutationFn: () => api.cancelOrder(tenantId, order.id),
    onSuccess: () => {
      setOrder({ ...order, status: 'cancelled' })
      setCancelling(false)
      setCancelDone(true)
      qc.invalidateQueries({ queryKey: ['my-orders', tenantId] })
    },
  })

  async function handleReviewSubmit(rating: number, text: string) {
    try {
      await api.reviewOrder(tenantId, order.id, rating, text)
      setOrder({ ...order, meta: { ...(order.meta || {}), review_rating: rating, review_text: text } })
      setShowReview(false)
      setReviewDone(true)
      qc.invalidateQueries({ queryKey: ['my-orders', tenantId] })
    } catch {
      setShowReview(false)
    }
  }

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

        {/* Buyer actions */}
        <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Contact seller */}
          {shop?.contact_info?.telegram && (
            <button
              onClick={() => {
                const handle = (shop.contact_info.telegram ?? '').replace('@', '')
                const url = `https://t.me/${handle}`;
                (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, '_blank')
              }}
              style={{
                height: 46, borderRadius: 12,
                background: 'var(--card)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
              }}
            >
              <span>💬</span> Написать продавцу
            </button>
          )}

          {/* Cancel order */}
          {['new', 'created'].includes(order.status) && !cancelDone && (
            cancelling ? (
              <div style={{ borderRadius: 12, background: 'var(--card)', border: '1.5px solid var(--danger)', padding: '14px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', marginBottom: 12, textAlign: 'center' }}>
                  Отменить заказ?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setCancelling(false)}
                    style={{
                      flex: 1, height: 40, borderRadius: 10,
                      background: 'var(--subtle)', border: '1px solid var(--border)',
                      fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
                    }}
                  >
                    Нет
                  </button>
                  <button
                    onClick={() => cancelOrder()}
                    disabled={isCancelling}
                    style={{
                      flex: 1, height: 40, borderRadius: 10,
                      background: 'var(--danger)', border: 'none',
                      fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer',
                    }}
                  >
                    {isCancelling ? '...' : 'Да, отменить'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCancelling(true)}
                style={{
                  height: 46, borderRadius: 12,
                  background: 'transparent', border: '1.5px solid var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 600, color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                <span>✕</span> Отменить заказ
              </button>
            )
          )}
          {cancelDone && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              textAlign: 'center', fontSize: 14, color: '#DC2626', fontWeight: 600,
            }}>
              Заказ отменён
            </div>
          )}

          {/* Return request — only within 14-day window */}
          {order.status === 'completed' && (() => {
            const daysSince = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
            return daysSince <= 14
          })() && (
            <button
              onClick={() => {
                const tg = (window as any).Telegram?.WebApp
                const handle = shop?.contact_info?.telegram?.replace('@', '')
                const orderRef = '#' + (order.id ?? '').slice(0, 8).toUpperCase()
                if (handle) {
                  const msg = encodeURIComponent(`Хочу оформить возврат по заказу ${orderRef}`)
                  const url = `https://t.me/${handle}?text=${msg}`
                  tg?.openTelegramLink?.(url) ?? window.open(url, '_blank')
                }
              }}
              style={{
                height: 46, borderRadius: 12,
                background: 'transparent', border: '1.5px solid var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
              }}
            >
              <span>🔄</span> Запросить возврат
            </button>
          )}

          {/* Rate order */}
          {['delivered', 'completed'].includes(order.status) && !order.meta?.review_rating && !reviewDone && (
            <button
              onClick={() => setShowReview(true)}
              style={{
                height: 46, borderRadius: 12,
                background: 'var(--card)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
              }}
            >
              <span>⭐</span> Оценить заказ
            </button>
          )}

          {/* Already reviewed */}
          {(order.meta?.review_rating || reviewDone) && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'var(--accent-soft)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, color: 'var(--accent)',
            }}>
              {'⭐'.repeat(order.meta?.review_rating ?? 5)} Отзыв оставлен
            </div>
          )}
        </div>
      </div>

      {showReview && (
        <StarRatingModal
          onSubmit={handleReviewSubmit}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  )
}

// ─── AboutStore ───────────────────────────────────────────────────────────────

function AboutStore({ shop, currency, tenantId, onBack }: { shop: any; currency: string; tenantId: string; onBack: () => void }) {
  const contact = shop.contact_info ?? {}
  const settings = shop.settings ?? {}
  const deliveryMethods: any[] = settings.delivery_methods ?? []
  const enabledDeliveries = deliveryMethods.filter((d: any) => d.enabled)

  const { data: stats } = useQuery({
    queryKey: ['shop-stats', tenantId],
    queryFn: () => api.getShopStats(tenantId),
    retry: false,
  })

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

        {/* Name + rating */}
        <div style={{ padding: '32px 16px 0' }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 6 }}>
            {shop.name}
          </div>
          {stats && stats.avg_rating && stats.review_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                {stats.avg_rating.toFixed(1)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                ({stats.review_count} {stats.review_count === 1 ? 'отзыв' : stats.review_count < 5 ? 'отзыва' : 'отзывов'})
              </span>
            </div>
          )}
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

// ─── EditProfile ─────────────────────────────────────────────────────────────

function EditProfile({ tenantId, onBack }: { tenantId: string; onBack: () => void }) {
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', tenantId],
    queryFn: () => api.getMyProfile(tenantId),
  })

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [email, setEmail] = useState('')
  const [birthday, setBirthday] = useState('')
  const [savedAddress, setSavedAddress] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || tgUser?.first_name || '')
      setLastName(profile.last_name || tgUser?.last_name || '')
      setPhone(profile.phone || '')
      setPhoneVerified(!!profile.phone)
      setEmail(profile.email || '')
      setBirthday(profile.birthday || '')
      setSavedAddress(profile.saved_address || '')
    }
  }, [profile])

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () => api.updateMyProfile(tenantId, {
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      email: email || null,
      birthday: birthday || null,
      saved_address: savedAddress || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile', tenantId] })
      setSaved(true)
      setTimeout(() => { setSaved(false); onBack() }, 1200)
    },
  })

  const requestPhone = () => {
    if ((window as any).Telegram?.WebApp?.requestContact) {
      (window as any).Telegram.WebApp.requestContact((ok: boolean, contact: any) => {
        if (ok && contact?.phone_number) {
          setPhone(contact.phone_number)
          setPhoneVerified(true)
        }
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>
          Редактировать профиль
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, border: '2.5px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          <div className="screen-scroll" style={{ flex: 1, paddingBottom: 100 }}>
            {/* Avatar placeholder */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 8px' }}>
              {tgUser?.photo_url ? (
                <img src={tgUser.photo_url} alt="" style={{ width: 72, height: 72, borderRadius: 999, objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: 999, background: 'var(--accent)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 700, fontSize: 26,
                }}>
                  {(firstName[0] || tgUser?.first_name?.[0] || 'П').toUpperCase()}
                </div>
              )}
              {tgUser?.username && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>@{tgUser.username}</div>
              )}
            </div>

            {/* Fields */}
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Name row */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Имя</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Имя"
                    style={{
                      width: '100%', height: 46, padding: '0 12px',
                      borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
                      outline: 'none', fontSize: 14, color: 'var(--ink)',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Фамилия</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Фамилия"
                    style={{
                      width: '100%', height: 46, padding: '0 12px',
                      borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
                      outline: 'none', fontSize: 14, color: 'var(--ink)',
                    }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>📞 Телефон</label>
                {phoneVerified && phone ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    height: 46, padding: '0 12px',
                    borderRadius: 12, background: 'var(--card)', border: '1.5px solid var(--accent)',
                  }}>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{phone}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>✓</span>
                    <button
                      onClick={() => { setPhone(''); setPhoneVerified(false) }}
                      style={{ fontSize: 12, color: 'var(--muted)', background: 'none', cursor: 'pointer' }}
                    >
                      изм.
                    </button>
                  </div>
                ) : (window as any).Telegram?.WebApp?.requestContact ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={requestPhone}
                      style={{
                        height: 46, borderRadius: 12,
                        background: 'var(--accent-soft)', border: '1.5px solid var(--accent)',
                        color: 'var(--accent)', fontWeight: 600, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      📱 Поделиться через Telegram
                    </button>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      type="tel"
                      style={{
                        width: '100%', height: 46, padding: '0 12px',
                        borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
                        outline: 'none', fontSize: 14, color: 'var(--ink)',
                      }}
                    />
                  </div>
                ) : (
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    type="tel"
                    style={{
                      width: '100%', height: 46, padding: '0 12px',
                      borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
                      outline: 'none', fontSize: 14, color: 'var(--ink)',
                    }}
                  />
                )}
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>✉ Email (необязательно)</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  style={{
                    width: '100%', height: 46, padding: '0 12px',
                    borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
                    outline: 'none', fontSize: 14, color: 'var(--ink)',
                  }}
                />
              </div>

              {/* Birthday */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🎂 День рождения (необязательно)</label>
                <input
                  value={birthday}
                  onChange={e => setBirthday(e.target.value)}
                  type="date"
                  style={{
                    width: '100%', height: 46, padding: '0 12px',
                    borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
                    outline: 'none', fontSize: 14, color: birthday ? 'var(--ink)' : 'var(--muted)',
                  }}
                />
              </div>

              {/* Address */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🏠 Адрес доставки (необязательно)</label>
                <input
                  value={savedAddress}
                  onChange={e => setSavedAddress(e.target.value)}
                  placeholder="Ташкент, ул. Амира Темура 108"
                  style={{
                    width: '100%', height: 46, padding: '0 12px',
                    borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
                    outline: 'none', fontSize: 14, color: 'var(--ink)',
                  }}
                />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Сохраним для быстрого оформления заказа
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div style={{
            position: 'sticky', bottom: 0,
            padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
            background: 'var(--bg)', borderTop: '1px solid var(--border)', zIndex: 30,
          }}>
            <button
              onClick={() => saveProfile()}
              disabled={isPending || saved}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: saved ? '#10B981' : 'var(--accent)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 700, fontSize: 15, transition: 'background 0.2s',
              }}
            >
              {isPending ? (
                <><div style={{ width: 18, height: 18, borderRadius: 999, border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/> Сохранение...</>
              ) : saved ? '✓ Сохранено' : 'Сохранить'}
            </button>
          </div>
        </>
      )}
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

export function ProfileTab({ tenantId, currency, shop, onProduct }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showWishlist, setShowWishlist] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
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

  const [wishlistSort, setWishlistSort] = useState<'recent' | 'price_asc' | 'price_desc'>('recent')

  const wishlistProducts = (allProducts as any[])
    .filter(p => wishlistIds.includes(p.id))
    .sort((a: any, b: any) => {
      if (wishlistSort === 'price_asc') return Number(a.price) - Number(b.price)
      if (wishlistSort === 'price_desc') return Number(b.price) - Number(a.price)
      // 'recent': order by position in wishlistIds array
      return wishlistIds.indexOf(a.id) - wishlistIds.indexOf(b.id)
    })

  if (showEditProfile) {
    return <EditProfile tenantId={tenantId} onBack={() => setShowEditProfile(false)} />
  }

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        currency={currency}
        tenantId={tenantId}
        shop={shop}
        onBack={() => setSelectedOrder(null)}
      />
    )
  }

  if (showAbout && shop) {
    return <AboutStore shop={shop} currency={currency} tenantId={tenantId} onBack={() => setShowAbout(false)} />
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
            Избранное {wishlistIds.length > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>({wishlistIds.length})</span>}
          </span>
          <select
            value={wishlistSort}
            onChange={e => setWishlistSort(e.target.value as any)}
            style={{
              fontSize: 12, color: 'var(--muted)', background: 'var(--subtle)',
              border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px',
              outline: 'none',
            }}
          >
            <option value="recent">Недавние</option>
            <option value="price_asc">Дешевле</option>
            <option value="price_desc">Дороже</option>
          </select>
        </div>
        <div className="screen-scroll" style={{ flex: 1, padding: 16, paddingBottom: 40 }}>
          {wishlistProducts.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❤</div>
              <p style={{ fontSize: 14 }}>Нажмите ❤ на товаре чтобы сохранить</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {wishlistProducts.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => onProduct?.(p.id)}
                  style={{ textAlign: 'left' }}
                >
                  <div style={{ position: 'relative' }}>
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', aspectRatio: '1/1', borderRadius: 12, objectFit: 'cover' }}/>
                      : <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 12, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.name.split(' ').slice(0,2).join(' ')}</span>
                        </div>
                    }
                    {p.stock === 0 && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 12,
                        background: 'rgba(0,0,0,0.45)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 600, fontSize: 11,
                      }}>Нет в наличии</div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); removeFromWishlist(p.id) }}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 30, height: 30, borderRadius: 999,
                        background: 'rgba(255,255,255,0.92)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5">
                        <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.8a3.5 3.5 0 0 1 6.5 1.7C14.5 9.5 8 13.5 8 13.5z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div style={{ padding: '8px 2px 0' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4, height: 34, overflow: 'hidden' }}>
                      {p.name}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: p.compare_at_price ? 'var(--accent)' : 'var(--ink)' }}>
                      {fmtPrice(Number(p.price), currency)}
                    </div>
                  </div>
                </button>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
                {displayName}
              </div>
              {username && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  @{username}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              style={{
                flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 8,
                background: 'var(--subtle)', border: '1px solid var(--border)',
                fontSize: 13, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
              }}
            >
              Изм.
            </button>
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

          {/* Returns link */}
          {orders.length > 0 && (
            <button
              onClick={() => setOrderTab('completed')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                background: 'var(--card)', border: '1px solid var(--border)',
                marginBottom: 8, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🔄</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Мои заказы
              </span>
              {orders.filter((o: any) => ['new', 'created', 'confirmed', 'shipping'].includes(o.status)).length > 0 && (
                <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                  {orders.filter((o: any) => ['new', 'created', 'confirmed', 'shipping'].includes(o.status)).length}
                </span>
              )}
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

                  const step = statusToStep(statusKey)
                  const isCancelled = statusKey === 'cancelled'

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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                            #{orderId}
                          </span>
                          {date && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {fmtDate(date)}
                            </span>
                          )}
                        </div>
                        {/* Progress dots or cancelled badge */}
                        {isCancelled ? (
                          <div style={{ marginBottom: 5 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                              {statusLabel}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                            {[0, 1, 2, 3].map(i => (
                              <div key={i} style={{
                                height: 5, flex: 1, borderRadius: 999,
                                background: i <= step ? 'var(--accent)' : 'var(--border)',
                                transition: 'background 0.2s',
                              }}/>
                            ))}
                            <span style={{ fontSize: 11, fontWeight: 600, color: statusStyle.color, marginLeft: 4, whiteSpace: 'nowrap' }}>
                              {statusLabel}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                            {fmtPrice(Number(total), currency)}
                          </span>
                          {items.length > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {items.length} {items.length === 1 ? 'товар' : items.length < 5 ? 'товара' : 'товаров'}
                            </span>
                          )}
                        </div>
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
