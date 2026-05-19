import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'
import { useTelegramMainButton } from '@/hooks/useTelegram'

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

function fmtJoinedAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days < 1) return 'сегодня'
  if (days < 30) return `${days} дн.`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} мес.`
  return `${Math.floor(months / 12)} лет`
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
  const [screenshotUploading, setScreenshotUploading] = useState(false)
  const [screenshotDone, setScreenshotDone] = useState(false)
  const [showReturnWizard, setShowReturnWizard] = useState(false)
  const [returnStep, setReturnStep] = useState(1)
  const [returnItems, setReturnItems] = useState<Set<string>>(new Set())
  const [returnReason, setReturnReason] = useState('')
  const [returnDesc, setReturnDesc] = useState('')
  const [returnPhotos, setReturnPhotos] = useState<string[]>([])
  const [returnPhotoUploading, setReturnPhotoUploading] = useState(false)
  const [returnType, setReturnType] = useState<'refund' | 'exchange'>('refund')
  const [returnSubmitted, setReturnSubmitted] = useState(false)
  const qcReturn = useQueryClient()

  function resetReturnWizard() {
    setReturnStep(1)
    setReturnItems(new Set())
    setReturnReason('')
    setReturnDesc('')
    setReturnPhotos([])
    setReturnType('refund')
    setShowReturnWizard(false)
  }

  async function handleReturnPhotoUpload(file: File) {
    setReturnPhotoUploading(true)
    try {
      const res = await api.seller.uploadFile(file)
      setReturnPhotos(prev => [...prev, res.url])
    } catch { /* ignore */ }
    setReturnPhotoUploading(false)
  }

  const returnMutation = useMutation({
    mutationFn: () => api.createReturn(tenantId, {
      order_id: order.id,
      item_ids: Array.from(returnItems),
      reason: returnReason,
      description: returnDesc,
      photos: returnPhotos,
      resolution_type: returnType,
    }),
    onSuccess: () => {
      setReturnSubmitted(true)
      resetReturnWizard()
      qcReturn.invalidateQueries({ queryKey: ['my-returns', tenantId] })
    },
  })

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
              {order.delivery_address && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>
                  {order.delivery_address}
                </div>
              )}
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
              {order.payment_status === 'paid' && (
                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3, fontWeight: 500 }}>✓ Оплачено</div>
              )}
              {order.payment_status === 'pending' && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Ожидает оплаты</div>
              )}
            </div>
          )}
        </div>

        {/* Payment screenshot upload (card transfer, pending) */}
        {order.payment_method === 'card' && order.payment_status !== 'paid' && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card)', border: '1.5px solid var(--accent)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>
                💳 Перевод на карту — прикрепите скриншот
              </div>
              {order.meta?.payment_screenshot ? (
                <div>
                  <a href={order.meta.payment_screenshot} target="_blank" rel="noopener noreferrer">
                    <img src={order.meta.payment_screenshot} alt="Скриншот оплаты" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, display: 'block', marginBottom: 8 }} />
                  </a>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Скриншот загружен, ожидаем подтверждения продавца</div>
                </div>
              ) : screenshotDone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Скриншот загружен
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setScreenshotUploading(true)
                      try {
                        await api.uploadPaymentScreenshot(tenantId, order.id, file)
                        setScreenshotDone(true)
                        setOrder({ ...order, meta: { ...(order.meta || {}), payment_screenshot: 'uploaded' } })
                      } catch {
                        // silently ignore
                      } finally {
                        setScreenshotUploading(false)
                      }
                    }}
                  />
                  <div style={{
                    height: 42, borderRadius: 10,
                    background: 'var(--accent)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontWeight: 600, fontSize: 14,
                    opacity: screenshotUploading ? 0.7 : 1,
                  }}>
                    {screenshotUploading ? 'Загружаем...' : '📸 Прикрепить скриншот оплаты'}
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

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
          {order.status === 'completed' && !returnSubmitted && (() => {
            const daysSince = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
            return daysSince <= 14
          })() && (
            <button
              onClick={() => { setReturnReason(''); setReturnDesc(''); setShowReturnWizard(true) }}
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
          {returnSubmitted && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent)', fontSize: 14, fontWeight: 600, color: 'var(--accent)', textAlign: 'center' }}>
              ✓ Заявка на возврат отправлена
            </div>
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

          {/* Loyalty earned */}
          {(order.meta?.loyalty_points_earned || order.meta?.cashback_earned) && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'var(--subtle)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13,
            }}>
              <span style={{ fontSize: 20 }}>🎁</span>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Начислено за заказ: </span>
                {order.meta?.loyalty_points_earned && (
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    +{Number(order.meta.loyalty_points_earned).toLocaleString()} баллов
                  </span>
                )}
                {order.meta?.loyalty_points_earned && order.meta?.cashback_earned && <span style={{ color: 'var(--muted)' }}> · </span>}
                {order.meta?.cashback_earned && (
                  <span style={{ color: '#10B981', fontWeight: 700 }}>
                    +{fmtPrice(Number(order.meta.cashback_earned), currency)} кэшбэк
                  </span>
                )}
              </div>
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

      {showReturnWizard && (
        <div onTouchMove={e => e.preventDefault()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div onTouchMove={e => e.stopPropagation()} style={{ width: '100%', maxHeight: 'calc(90vh - var(--tg-content-safe-area-inset-top, 0px))', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={resetReturnWizard} style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '12px 0 4px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </button>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Запрос на возврат</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[1,2,3,4,5].map(s => (
                    <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: s <= returnStep ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Шаг {returnStep} из 5</div>
              </div>
              <button onClick={resetReturnWizard} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            {/* Step 1: Select items */}
            {returnStep === 1 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Выберите товары для возврата</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(order.items ?? []).map((item: any) => {
                    const selected = returnItems.has(item.id ?? item.product_id)
                    return (
                      <button
                        key={item.id ?? item.product_id}
                        onClick={() => {
                          const id = item.id ?? item.product_id
                          setReturnItems(prev => {
                            const next = new Set(prev)
                            if (next.has(id)) next.delete(id)
                            else next.add(id)
                            return next
                          })
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                          borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                          background: selected ? 'var(--accent-soft)' : 'var(--subtle)',
                          border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                      >
                        {item.image && <img src={item.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: selected ? 'var(--accent)' : 'var(--ink)' }}>{item.name ?? item.product_name}</div>
                          {item.variant && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.variant}</div>}
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{item.quantity} шт.</div>
                        </div>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: selected ? 'var(--accent)' : 'transparent', border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setReturnStep(2)}
                  disabled={returnItems.size === 0}
                  style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', marginTop: 16, opacity: returnItems.size === 0 ? 0.5 : 1 }}
                >
                  Далее →
                </button>
              </div>
            )}

            {/* Step 2: Reason */}
            {returnStep === 2 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Причина возврата</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'wrong_size', label: 'Не подошёл размер' },
                    { id: 'defective', label: 'Брак / дефект' },
                    { id: 'not_as_described', label: 'Не соответствует описанию' },
                    { id: 'changed_mind', label: 'Передумал(а)' },
                    { id: 'other', label: 'Другое' },
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setReturnReason(r.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                        background: returnReason === r.id ? 'var(--accent-soft)' : 'var(--subtle)',
                        border: `1.5px solid ${returnReason === r.id ? 'var(--accent)' : 'var(--border)'}`,
                        color: returnReason === r.id ? 'var(--accent)' : 'var(--ink)',
                        fontWeight: returnReason === r.id ? 600 : 400, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Дополнительные детали (необязательно)..."
                  value={returnDesc}
                  onChange={e => setReturnDesc(e.target.value)}
                  rows={3}
                  style={{ width: '100%', marginTop: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setReturnStep(1)} style={{ flex: 1, height: 48, borderRadius: 14, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>← Назад</button>
                  <button
                    onClick={() => setReturnStep(3)}
                    disabled={!returnReason}
                    style={{ flex: 2, height: 48, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: !returnReason ? 0.5 : 1 }}
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Photos */}
            {returnStep === 3 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                  Фотографии {returnReason === 'defective' ? <span style={{ color: 'var(--danger)', fontSize: 12 }}>* обязательно</span> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>(необязательно)</span>}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Загрузите 1-5 фото, подтверждающих проблему</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {returnPhotos.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
                      <button
                        onClick={() => setReturnPhotos(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 999, background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                  ))}
                  {returnPhotos.length < 5 && (
                    <label style={{ width: 72, height: 72, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', gap: 4 }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleReturnPhotoUpload(f) }} />
                      {returnPhotoUploading ? <div style={{ width: 20, height: 20, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/> : <span style={{ fontSize: 24, color: 'var(--muted)' }}>+</span>}
                    </label>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setReturnStep(2)} style={{ flex: 1, height: 48, borderRadius: 14, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>← Назад</button>
                  <button
                    onClick={() => setReturnStep(4)}
                    disabled={returnReason === 'defective' && returnPhotos.length === 0}
                    style={{ flex: 2, height: 48, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: (returnReason === 'defective' && returnPhotos.length === 0) ? 0.5 : 1 }}
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Refund vs Exchange */}
            {returnStep === 4 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Что вы хотите?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { id: 'refund' as const, label: 'Вернуть деньги', icon: '💳', desc: 'Возврат на карту или кошелёк в течение 3-5 дней' },
                    { id: 'exchange' as const, label: 'Обменять товар', icon: '🔄', desc: 'Замена на аналогичный или другой товар' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setReturnType(opt.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                        borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                        background: returnType === opt.id ? 'var(--accent-soft)' : 'var(--subtle)',
                        border: `2px solid ${returnType === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: returnType === opt.id ? 'var(--accent)' : 'var(--ink)' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setReturnStep(3)} style={{ flex: 1, height: 48, borderRadius: 14, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>← Назад</button>
                  <button onClick={() => setReturnStep(5)} style={{ flex: 2, height: 48, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>Далее →</button>
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {returnStep === 5 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Проверьте заявку</p>
                <div style={{ background: 'var(--subtle)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Товаров</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{returnItems.size} шт.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Причина</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {{ wrong_size: 'Не подошёл размер', defective: 'Брак', not_as_described: 'Не как описано', changed_mind: 'Передумал(а)', other: 'Другое' }[returnReason] ?? returnReason}
                    </span>
                  </div>
                  {returnPhotos.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>Фото</span>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{returnPhotos.length} шт.</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Решение</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{returnType === 'refund' ? 'Возврат денег' : 'Обмен'}</span>
                  </div>
                </div>
                {returnPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {returnPhotos.map((url, i) => <img key={i} src={url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />)}
                  </div>
                )}
                {returnMutation.isError && (
                  <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>Ошибка. Попробуйте ещё раз.</p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setReturnStep(4)} style={{ flex: 1, height: 50, borderRadius: 14, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>← Назад</button>
                  <button
                    onClick={() => returnMutation.mutate()}
                    disabled={returnMutation.isPending}
                    style={{ flex: 2, height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', opacity: returnMutation.isPending ? 0.6 : 1 }}
                  >
                    {returnMutation.isPending ? 'Отправляем...' : '✓ Отправить заявку'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HelpFAQView ──────────────────────────────────────────────────────────────

function HelpFAQView({ shop, tenantId, onBack }: { shop: any; tenantId: string; onBack: () => void }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['help-articles'],
    queryFn: () => api.getHelpArticles(),
    retry: false,
  })

  const filtered = (articles as any[]).filter(a =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory: Record<string, any[]> = {}
  for (const a of filtered) {
    const cat = a.category ?? 'Общее'
    byCategory[cat] = byCategory[cat] ?? []
    byCategory[cat].push(a)
  }

  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'var(--ink)', flex: 1 }}>{selected.title}</span>
        </div>
        <div style={{ padding: '16px 16px 100px', flex: 1, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{selected.content}</p>
          <div style={{ marginTop: 32, padding: '16px', borderRadius: 14, background: 'var(--subtle)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Не нашли ответ?</div>
            <button
              onClick={() => {
                const tg = (window as any).Telegram?.WebApp
                if (shop?.contact_info?.telegram) {
                  tg?.openTelegramLink?.(`https://t.me/${shop.contact_info.telegram.replace('@', '')}`)
                } else if (shop?.bot_username) {
                  tg?.openTelegramLink?.(`https://t.me/${shop.bot_username}`)
                }
              }}
              style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
            >
              Написать продавцу
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>Помощь и FAQ</span>
      </div>
      <div style={{ padding: '12px 16px 0' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по статьям..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ flex: 1, padding: '12px 16px 100px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', padding: '40px 0' }}>Статьи не найдены</p>
        ) : (
          Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{cat}</div>
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {items.map((article: any, i: number, arr: any[]) => (
                  <button
                    key={article.id}
                    onClick={() => setSelected(article)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'var(--card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{article.title}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        <div style={{ marginTop: 24, padding: '16px', borderRadius: 14, background: 'var(--subtle)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Не нашли ответ?</div>
          <button
            onClick={() => {
              const tg = (window as any).Telegram?.WebApp
              if (shop?.contact_info?.telegram) {
                tg?.openTelegramLink?.(`https://t.me/${shop.contact_info.telegram.replace('@', '')}`)
              } else if (shop?.bot_username) {
                tg?.openTelegramLink?.(`https://t.me/${shop.bot_username}`)
              }
            }}
            style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
          >
            Написать продавцу
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PrivacyView ─────────────────────────────────────────────────────────────

function PrivacyView({ tenantId, onBack }: { tenantId: string; onBack: () => void }) {
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleDelete() {
    if (confirm !== 'УДАЛИТЬ') return
    setDeleting(true)
    try {
      await api.deleteMyProfile(tenantId)
      setDeleted(true)
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  if (deleted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>Профиль удалён</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Ваши данные анонимизированы. Заказы сохранены без личной информации.
        </div>
        <button
          onClick={() => (window as any).Telegram?.WebApp?.close?.()}
          style={{ height: 48, padding: '0 24px', borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15 }}
        >
          Закрыть магазин
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>Приватность и данные</span>
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 48 }}>
        {/* What we store */}
        <div style={{ padding: '16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Что хранит магазин
          </div>
          {['Имя и контакты', 'История заказов', 'Список избранного', 'Сохранённый адрес доставки'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>{item}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
            Все данные хранятся на защищённых серверах Dokonly и не передаются третьим лицам.
          </div>
        </div>

        {/* Legal links */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          {[
            { label: 'Условия использования', url: 'https://dokonly.com/terms' },
            { label: 'Политика конфиденциальности', url: 'https://dokonly.com/privacy' },
          ].map(({ label, url }) => (
            <button
              key={url}
              onClick={() => {
                const tg = (window as any).Telegram?.WebApp
                tg?.openLink?.(url) ?? window.open(url, '_blank')
              }}
              style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Delete profile */}
        <div style={{ padding: '16px', borderRadius: 14, background: '#FEF2F2', border: '1px solid #FEE2E2' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            ⚠ Удалить профиль
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 14 }}>
            Удалит ваши личные данные навсегда. Заказы останутся в системе с обезличенной информацией.
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              style={{ height: 42, padding: '0 18px', borderRadius: 10, background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
            >
              Удалить профиль
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 8 }}>
                Введите УДАЛИТЬ для подтверждения:
              </div>
              <input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="УДАЛИТЬ"
                style={{
                  width: '100%', height: 42, borderRadius: 10, border: '1.5px solid #FCA5A5',
                  padding: '0 12px', fontSize: 14, color: 'var(--ink)', background: 'white',
                  marginBottom: 10, boxSizing: 'border-box', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowConfirm(false); setConfirm('') }}
                  style={{ flex: 1, height: 42, borderRadius: 10, background: 'var(--subtle)', fontWeight: 600, fontSize: 14, border: '1px solid var(--border)' }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirm !== 'УДАЛИТЬ' || deleting}
                  style={{
                    flex: 1, height: 42, borderRadius: 10,
                    background: confirm === 'УДАЛИТЬ' ? '#DC2626' : '#FCA5A5',
                    color: 'white', fontWeight: 700, fontSize: 14, border: 'none',
                    cursor: confirm === 'УДАЛИТЬ' && !deleting ? 'pointer' : 'default',
                  }}
                >
                  {deleting ? 'Удаляем...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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

        {/* Working hours */}
        {contact.working_hours && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                🕐 Часы работы
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {contact.working_hours}
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

        {/* Return policy */}
        {settings.return_policy && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                🔄 Политика возврата
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {settings.return_policy}
              </div>
            </div>
          </div>
        )}

        {/* Powered by footer — only for Старт plan */}
        {shop.settings?.show_dokonly_branding && (
          <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--muted)' }}>
            Работает на <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Dokonly</span>
          </div>
        )}
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
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || tgUser?.first_name || '')
      setLastName(profile.last_name || tgUser?.last_name || '')
      setPhone(profile.phone || '')
      setPhoneVerified(!!profile.phone)
      setEmail(profile.email || '')
      setBirthday(profile.birthday || '')
      setSavedAddress(profile.saved_address || '')
      setCustomAvatarUrl(profile.custom_avatar_url || null)
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

  useTelegramMainButton({
    text: saved ? '✓ Сохранено' : isPending ? 'Сохранение...' : 'Сохранить',
    onClick: () => saveProfile(),
    isVisible: true,
    color: saved ? '#10B981' : null,
    disabled: isPending || saved,
  })

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
            {/* Avatar with upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 8px' }}>
              <label style={{ position: 'relative', cursor: 'pointer', display: 'block' }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setAvatarUploading(true)
                    try {
                      const result = await api.uploadBuyerAvatar(tenantId, file)
                      setCustomAvatarUrl(result.url)
                      qc.invalidateQueries({ queryKey: ['my-profile', tenantId] })
                    } catch {
                      // ignore upload errors
                    } finally {
                      setAvatarUploading(false)
                    }
                  }}
                />
                {customAvatarUrl ? (
                  <img src={customAvatarUrl} alt="" style={{ width: 80, height: 80, borderRadius: 999, objectFit: 'cover' }} />
                ) : tgUser?.photo_url ? (
                  <img src={tgUser.photo_url} alt="" style={{ width: 80, height: 80, borderRadius: 999, objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: 999, background: 'var(--accent)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 700, fontSize: 28,
                  }}>
                    {(firstName[0] || tgUser?.first_name?.[0] || 'П').toUpperCase()}
                  </div>
                )}
                {/* Camera overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: 999,
                  background: avatarUploading ? 'var(--border)' : 'var(--accent)',
                  border: '2px solid var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {avatarUploading ? (
                    <div style={{ width: 12, height: 12, borderRadius: 999, border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </div>
              </label>
              {tgUser?.username && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>@{tgUser.username}</div>
              )}
              {customAvatarUrl && (
                <button
                  onClick={async () => {
                    await api.resetBuyerAvatar(tenantId)
                    setCustomAvatarUrl(null)
                    qc.invalidateQueries({ queryKey: ['my-profile', tenantId] })
                  }}
                  style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Сбросить к Telegram
                </button>
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

        </>
      )}
    </div>
  )
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────

type OrderTabId = 'active' | 'all' | 'completed' | 'returns'
const ORDER_TABS: { id: OrderTabId; label: string; statuses: string[] | null }[] = [
  { id: 'active',    label: 'Активные',    statuses: ['new', 'created', 'confirmed', 'shipping'] },
  { id: 'all',       label: 'Все',         statuses: null },
  { id: 'completed', label: 'Завершённые', statuses: ['delivered', 'completed'] },
  { id: 'returns',   label: 'Возвраты',    statuses: [] },
]

// ── LoyaltyPage ───────────────────────────────────────────────────────────────
const TIERS = [
  { id: 'bronze',   label: '🥉 Bronze',   icon: '🥉', minPts: 0,    maxPts: 1000, cashback: 1 },
  { id: 'silver',   label: '🥈 Silver',   icon: '🥈', minPts: 1000, maxPts: 3000, cashback: 2 },
  { id: 'gold',     label: '🥇 Gold',     icon: '🥇', minPts: 3000, maxPts: 7000, cashback: 3 },
  { id: 'platinum', label: '💎 Platinum', icon: '💎', minPts: 7000, maxPts: Infinity, cashback: 5 },
]

function LoyaltyPage({ tenantId, currency, onBack }: { tenantId: string; currency: string; onBack: () => void }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', tenantId],
    queryFn: () => api.getMyProfile(tenantId),
    retry: false,
  })

  const { data: loyaltyHistory = [] } = useQuery({
    queryKey: ['loyalty-history', tenantId],
    queryFn: () => api.getLoyaltyHistory(tenantId),
    retry: false,
  })

  const points: number = (profile as any)?.loyalty_points ?? 0
  const cashbackBalance: number = (profile as any)?.cashback_balance ?? 0

  const currentTierIdx = TIERS.findIndex((t, i) =>
    points >= t.minPts && (i === TIERS.length - 1 || points < TIERS[i + 1].minPts)
  )
  const tierIdx = Math.max(0, currentTierIdx)
  const tier = TIERS[tierIdx]
  const nextTier = TIERS[tierIdx + 1]
  const pct = nextTier
    ? Math.round(((points - tier.minPts) / (nextTier.minPts - tier.minPts)) * 100)
    : 100

  function fmtAmt(n: number) {
    if (currency === 'UZS') return n.toLocaleString() + ' сум'
    return n.toLocaleString() + ' ' + currency
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg)' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--subtle)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
          Программа лояльности
        </span>
      </div>

      {isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!isLoading && (
        <div className="screen-scroll" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tier card */}
          <div style={{
            borderRadius: 20, padding: '20px',
            background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, black) 100%)',
            color: 'white',
          }}>
            <div style={{ fontSize: 30, marginBottom: 4 }}>{tier.icon}</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, marginBottom: 2 }}>{tier.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono', fontWeight: 700, marginBottom: 4 }}>
              {points.toLocaleString()} баллов
            </div>
            {cashbackBalance > 0 && (
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 10 }}>
                {fmtAmt(cashbackBalance)} кэшбэк-баланс
              </div>
            )}
            {nextTier && (
              <>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'white', transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Ещё {(nextTier.minPts - points).toLocaleString()} баллов до {nextTier.label}
                </div>
              </>
            )}
          </div>

          {/* Earning methods */}
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Как заработать
            </div>
            {[
              { icon: '🛍', text: '1 балл за каждые 100 сум покупок' },
              { icon: '🎂', text: 'Бонус в день рождения' },
              { icon: '🎁', text: 'Пригласите друга — получите баллы' },
              { icon: '⭐', text: 'Оставьте отзыв после заказа' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 3 ? 10 : 0 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Tier benefits */}
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Привилегии по уровням
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {TIERS.map((t, idx) => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  background: t.id === tier.id ? 'var(--accent-soft)' : 'var(--card)',
                  borderBottom: idx < TIERS.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.id === tier.id ? 'var(--accent)' : 'var(--ink)' }}>
                      {t.label}
                      {t.id === tier.id && <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.7 }}>← вы здесь</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {t.cashback}% кэшбэк{t.id === 'silver' ? ' + бесплатная доставка' : t.id === 'gold' ? ' + приоритетная поддержка' : t.id === 'platinum' ? ' + ранний доступ' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          {(loyaltyHistory as any[]).length > 0 && (
            <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Последние операции
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(loyaltyHistory as any[]).slice(0, 20).map((tx: any, i: number, arr: any[]) => (
                  <div key={tx.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{tx.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {new Date(tx.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14,
                      color: tx.points > 0 ? 'var(--accent)' : '#EF4444',
                    }}>
                      {tx.points > 0 ? '+' : ''}{tx.points} пт
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer info */}
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
              ℹ Баллы действуют 12 месяцев с момента начисления.
              Кэшбэк можно использовать при оформлении следующего заказа.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ReferralPage ──────────────────────────────────────────────────────────────
function ReferralPage({ tenantId, currency, onBack }: { tenantId: string; currency: string; onBack: () => void }) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-referral', tenantId],
    queryFn: () => api.getMyReferral(tenantId),
    retry: false,
  })

  function fmtAmt(n: number) {
    if (currency === 'UZS') return n.toLocaleString() + ' сум'
    return n.toLocaleString() + ' ' + currency
  }

  function copyText(text: string, setCopied: (b: boolean) => void) {
    navigator.clipboard.writeText(text).catch(() => {})
    ;(window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--subtle)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
          Пригласить друга
        </span>
      </div>

      {isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!isLoading && data && (
        <div className="screen-scroll" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hero banner */}
          <div style={{ borderRadius: 20, background: 'var(--accent)', padding: '24px 20px', textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, marginBottom: 6 }}>
              Приглашайте друзей
            </div>
            <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>
              Поделитесь своим кодом и получайте вознаграждение за каждого друга, совершившего первый заказ
            </div>
          </div>

          {/* Referral code */}
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Ваш реферальный код
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 20, color: 'var(--ink)', letterSpacing: '0.1em' }}>
                {data.code}
              </span>
              <button
                onClick={() => copyText(data.code, setCodeCopied)}
                style={{ padding: '8px 14px', borderRadius: 10, background: codeCopied ? '#10B981' : 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700 }}
              >
                {codeCopied ? '✓' : '📋 Скопировать'}
              </button>
            </div>
          </div>

          {/* Referral link */}
          {data.link && (
            <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Ваша ссылка
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--subtle)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>
                  {data.link}
                </div>
                <button
                  onClick={() => copyText(data.link, setLinkCopied)}
                  style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 10, background: linkCopied ? '#10B981' : 'var(--subtle)', border: '1px solid var(--border)', color: linkCopied ? 'white' : 'var(--ink)', fontSize: 13, fontWeight: 700 }}
                >
                  {linkCopied ? '✓' : '📋'}
                </button>
              </div>
              <button
                onClick={() => {
                  const tg = (window as any).Telegram?.WebApp
                  const text = `Привет! Купи в этом магазине по моей ссылке: ${data.link}`
                  if (tg?.switchInlineQuery) {
                    tg.switchInlineQuery(text, ['users', 'groups'])
                  } else {
                    const url = `https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent('Привет! Купи в этом магазине по моей ссылке!')}`
                    tg?.openLink?.(url) ?? window.open(url, '_blank')
                  }
                }}
                style={{ width: '100%', marginTop: 12, height: 44, borderRadius: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 14 }}
              >
                📤 Поделиться
              </button>
            </div>
          )}

          {/* Stats */}
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              📊 Ваша статистика
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Приглашено', value: data.stats.invited },
                { label: 'Совершили заказ', value: data.stats.completed },
                { label: 'Ожидают', value: data.stats.pending },
                { label: '💰 Заработано', value: fmtAmt(data.stats.earned), accent: true },
              ].map(s => (
                <div key={s.label} style={{ padding: '12px', borderRadius: 12, background: 'var(--subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.accent ? 'var(--accent)' : 'var(--ink)', fontFamily: 'JetBrains Mono' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Friends list */}
          {data.friends.length > 0 && (
            <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Приглашённые друзья
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.friends.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', borderRadius: 10, background: 'var(--subtle)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      👤
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{f.name || 'Аноним'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                        {f.status === 'completed' ? '✓ Заказал' : '⏳ Зарегистрирован'} · {f.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const LOCALE_LABELS: Record<string, string> = { ru: 'Русский', uz: "O'zbek", en: 'English' }

function LanguageView({ tenantId, currentLocale, onBack }: { tenantId: string; currentLocale: string; onBack: () => void }) {
  const [selected, setSelected] = useState(currentLocale || 'ru')
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()

  async function handleSelect(locale: string) {
    setSelected(locale)
    setSaving(true)
    try {
      await api.updateMyProfile(tenantId, { locale })
      qc.invalidateQueries({ queryKey: ['my-profile', tenantId] })
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
    setTimeout(() => onBack(), 400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>Язык</span>
        {saving && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Сохраняем...</span>}
      </div>
      <div className="screen-scroll" style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(['ru', 'uz', 'en'] as const).map(locale => (
          <button
            key={locale}
            onClick={() => handleSelect(locale)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px', borderRadius: 14,
              background: selected === locale ? 'var(--accent-soft)' : 'var(--card)',
              border: `1.5px solid ${selected === locale ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: selected === locale ? 'var(--accent)' : 'var(--ink)' }}>
                {LOCALE_LABELS[locale]}
              </div>
            </div>
            {selected === locale && (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l5 5 8-8" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProfileTab({ tenantId, currency, shop, onProduct }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showWishlist, setShowWishlist] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showLanguage, setShowLanguage] = useState(false)
  const [showReferral, setShowReferral] = useState(false)
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [orderTab, setOrderTab] = useState<OrderTabId>('active')

  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user

  const firstName = tgUser?.first_name ?? ''
  const lastName = tgUser?.last_name ?? ''
  const username = tgUser?.username ?? ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Покупатель'
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'П'

  const qc = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['my-profile', tenantId],
    queryFn: () => api.getMyProfile(tenantId),
    retry: false,
  })

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', tenantId],
    queryFn: () => api.getMyOrders(tenantId),
    retry: false,
  })

  const { data: returns = [] } = useQuery({
    queryKey: ['my-returns', tenantId],
    queryFn: () => api.getMyReturns(tenantId),
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
  const [wishlistShareProd, setWishlistShareProd] = useState<any>(null)
  const [wishlistCopied, setWishlistCopied] = useState(false)
  const [wishlistFilterAvailable, setWishlistFilterAvailable] = useState(false)
  const [wishlistFilterOnSale, setWishlistFilterOnSale] = useState(false)

  const wishlistProducts = (allProducts as any[])
    .filter(p => wishlistIds.includes(p.id))
    .filter(p => !wishlistFilterAvailable || (p.stock == null || p.stock > 0))
    .filter(p => !wishlistFilterOnSale || (p.compare_price != null && Number(p.compare_price) > Number(p.price)))
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

  if (showLoyalty) {
    return <LoyaltyPage tenantId={tenantId} currency={currency} onBack={() => setShowLoyalty(false)} />
  }

  if (showReferral) {
    return <ReferralPage tenantId={tenantId} currency={currency} onBack={() => setShowReferral(false)} />
  }

  if (showPrivacy) {
    return <PrivacyView tenantId={tenantId} onBack={() => setShowPrivacy(false)} />
  }

  if (showHelp) {
    return <HelpFAQView shop={shop} tenantId={tenantId} onBack={() => setShowHelp(false)} />
  }

  if (showLanguage) {
    return <LanguageView tenantId={tenantId} currentLocale={(profile as any)?.locale || 'ru'} onBack={() => setShowLanguage(false)} />
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
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, padding: '8px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { label: 'В наличии', active: wishlistFilterAvailable, toggle: () => setWishlistFilterAvailable(v => !v) },
            { label: 'Со скидкой', active: wishlistFilterOnSale, toggle: () => setWishlistFilterOnSale(v => !v) },
          ].map(f => (
            <button
              key={f.label}
              onClick={f.toggle}
              style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: f.active ? 'var(--accent)' : 'var(--subtle)',
                color: f.active ? 'white' : 'var(--muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="screen-scroll" style={{ flex: 1, padding: 16, paddingBottom: 40 }}>
          {wishlistProducts.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❤</div>
              <p style={{ fontSize: 14 }}>
                {wishlistFilterAvailable || wishlistFilterOnSale ? 'Нет товаров по выбранным фильтрам' : 'Нажмите ❤ на товаре чтобы сохранить'}
              </p>
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
                    {/* Share button */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setWishlistShareProd(p)
                      }}
                      style={{
                        position: 'absolute', top: 6, right: 42,
                        width: 30, height: 30, borderRadius: 999,
                        background: 'rgba(255,255,255,0.92)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                    </button>
                    {/* Remove from wishlist */}
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

        {/* Wishlist share bottom sheet */}
        {wishlistShareProd && (() => {
          const botUsername = shop?.settings?.bot_username
          const prodUrl = botUsername
            ? `https://t.me/${botUsername}/store?startapp=p_${wishlistShareProd.id}`
            : `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(wishlistShareProd.name)}`
          const tg = (window as any).Telegram?.WebApp
          return (
            <div
              onClick={() => { setWishlistShareProd(null); setWishlistCopied(false) }}
              onTouchMove={e => e.preventDefault()}
              style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                onTouchMove={e => e.stopPropagation()}
                style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '0 16px calc(28px + env(safe-area-inset-bottom))' }}
              >
                <button onClick={() => { setWishlistShareProd(null); setWishlistCopied(false) }} style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '12px 0 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
                </button>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
                  Поделиться
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wishlistShareProd.name}
                </div>
                {/* Send via Telegram */}
                <button
                  onClick={() => {
                    if (botUsername && tg?.switchInlineQuery) {
                      tg.switchInlineQuery(`${wishlistShareProd.id}`, ['users', 'groups', 'channels'])
                    } else {
                      tg?.openLink(`https://t.me/share/url?url=${encodeURIComponent(prodUrl)}&text=${encodeURIComponent(wishlistShareProd.name)}`)
                    }
                    setWishlistShareProd(null)
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                    background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(37,161,228,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#25A1E4">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 6.628 5.374 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.829.941z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Отправить в Telegram</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Поделитесь с друзьями в чате</div>
                  </div>
                </button>
                {/* Share to Story */}
                {!!(tg?.shareToStory) && wishlistShareProd.images?.[0] && (
                  <button
                    onClick={() => {
                      tg.shareToStory(wishlistShareProd.images[0], { widget_link: { url: prodUrl, name: wishlistShareProd.name } })
                      setWishlistShareProd(null)
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                      background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(131,58,180,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#833AB4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Добавить в Stories</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Поделитесь в Telegram Stories</div>
                    </div>
                  </button>
                )}
                {/* Copy link */}
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(prodUrl).then(() => {
                      setWishlistCopied(true)
                      setTimeout(() => setWishlistCopied(false), 2000)
                    })
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 14,
                    background: wishlistCopied ? 'var(--accent-soft)' : 'var(--card)',
                    border: `1px solid ${wishlistCopied ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: wishlistCopied ? 'var(--accent-soft)' : 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {wishlistCopied
                      ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    }
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: wishlistCopied ? 'var(--accent)' : 'var(--ink)' }}>
                      {wishlistCopied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prodUrl}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )
        })()}
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
            {(profile as any)?.custom_avatar_url || tgUser?.photo_url ? (
              <img
                src={(profile as any)?.custom_avatar_url || tgUser.photo_url}
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
              {(profile as any)?.phone && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  📞 {(profile as any).phone}
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

        {/* Loyalty mini-card */}
        {shop?.settings?.loyalty_enabled && (profile as any)?.loyalty_points !== undefined && (() => {
          const pts: number = (profile as any).loyalty_points ?? 0
          const cashback: number = (profile as any).cashback_balance ?? 0
          const tierIdx = Math.max(0, TIERS.findIndex((t, i) =>
            pts >= t.minPts && (i === TIERS.length - 1 || pts < TIERS[i + 1].minPts)
          ))
          const tier = TIERS[tierIdx]
          const nextTier = TIERS[tierIdx + 1]
          const pct = nextTier
            ? Math.min(100, Math.round(((pts - tier.minPts) / (nextTier.minPts - tier.minPts)) * 100))
            : 100
          return (
            <div style={{ padding: '0 16px 16px' }}>
              <button
                onClick={() => setShowLoyalty(true)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '14px 16px', borderRadius: 16,
                  background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, #000) 100%)',
                  border: 'none', cursor: 'pointer', color: 'white',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{tier.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'white' }}>{tier.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>{pts} баллов</div>
                    </div>
                  </div>
                  {cashback > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Кешбэк</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'white' }}>
                        {cashback.toLocaleString('ru-RU')}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 999, height: 5, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'white', borderRadius: 999, transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                  {nextTier ? `${nextTier.minPts - pts} до ${nextTier.label}` : 'Максимальный уровень'}
                </div>
              </button>
            </div>
          )
        })()}

        {/* Quick stats */}
        {(orders.length > 0 || (profile as any)?.created_at) && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 0, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>
                  {orders.length}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>заказов</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px 8px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 11, color: 'var(--ink)' }}>
                  {fmtPrice(orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0), currency)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>потрачено</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                  {(profile as any)?.created_at ? fmtJoinedAgo((profile as any).created_at) : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>с нами</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick menu */}
        <div style={{ padding: '0 16px 16px' }}>
          {/* Group 1: Shopping */}
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
            {/* My Orders */}
            <button
              onClick={() => setOrderTab('active')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>📦</span>
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
            {/* Wishlist */}
            <button
              onClick={() => setShowWishlist(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>❤</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Избранное
              </span>
              {wishlistIds.length > 0 && (
                <span style={{
                  minWidth: 22, height: 22, borderRadius: 999,
                  background: 'var(--subtle)', color: 'var(--muted)',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 6px',
                }}>{wishlistIds.length}</span>
              )}
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
            {/* Loyalty */}
            <button
              onClick={() => setShowLoyalty(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>⭐</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Программа лояльности
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
            {/* Returns tab */}
            <button
              onClick={() => setOrderTab('returns')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🔄</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Возвраты
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
            {/* Referral */}
            <button
              onClick={() => setShowReferral(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🎁</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Пригласить друга
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
          </div>

          {/* Group 2: Store info & support */}
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
            {shop && (
              <button
                onClick={() => setShowAbout(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'var(--card)',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 18 }}>🏪</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                  О магазине
                </span>
                <Icon name="chevronRight" size={16} color="var(--muted)" />
              </button>
            )}
            {shop?.contact_info?.telegram && (
              <button
                onClick={() => {
                  const handle = (shop.contact_info.telegram ?? '').replace('@', '')
                  const url = `https://t.me/${handle}`;
                  (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, '_blank')
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'var(--card)', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 18 }}>💬</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                  Связаться с продавцом
                </span>
                <Icon name="chevronRight" size={16} color="var(--muted)" />
              </button>
            )}
          </div>

          {/* Group 3: Settings & legal */}
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowHelp(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>❓</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Помощь и FAQ
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
            <button
              onClick={() => setShowLanguage(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🌐</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Язык: {LOCALE_LABELS[(profile as any)?.locale || 'ru'] ?? 'Русский'}
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🔒</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                Приватность и данные
              </span>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </button>
            <button
              onClick={() => (window as any).Telegram?.WebApp?.close?.()}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🚪</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--muted)', textAlign: 'left' }}>
                Закрыть магазин
              </span>
            </button>
          </div>
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
            if (orderTab === 'returns') {
              const RETURN_STATUS_LABEL: Record<string, string> = {
                requested: 'На рассмотрении', approved: 'Одобрен', rejected: 'Отклонён',
                refunded: 'Возврат выполнен', exchanged: 'Обмен выполнен',
              }
              const RETURN_STATUS_COLOR: Record<string, string> = {
                requested: '#F59E0B', approved: '#10B981', rejected: '#EF4444',
                refunded: '#00B383', exchanged: '#8B5CF6',
              }
              if ((returns as any[]).length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
                    <p style={{ fontSize: 14, marginBottom: 6 }}>Возвратов нет</p>
                    <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                      Запросить возврат можно из<br/>завершённого заказа
                    </p>
                  </div>
                )
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(returns as any[]).map((r: any) => {
                    const statusLabel = RETURN_STATUS_LABEL[r.status] ?? r.status
                    const statusColor = RETURN_STATUS_COLOR[r.status] ?? 'var(--muted)'
                    const retId = (r.id ?? '').slice(0, 8).toUpperCase()
                    const ordId = (r.order_id ?? '').slice(0, 8).toUpperCase()
                    return (
                      <div key={r.id} style={{
                        padding: '12px 14px', borderRadius: 14,
                        background: 'var(--card)', border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                            #RET-{retId}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: statusColor + '20', color: statusColor }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          По заказу #{ordId} · {r.reason ?? ''}
                        </div>
                        {r.refund_amount && (
                          <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>
                            {fmtPrice(Number(r.refund_amount), currency)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            }

            const tab = ORDER_TABS.find(t => t.id === orderTab)!
            const filtered = tab.statuses && tab.statuses.length > 0
              ? (orders as any[]).filter(o => tab.statuses!.includes(o.status))
              : orderTab === 'all' ? (orders as any[]) : []

            if (filtered.length === 0) {
              const emptyMsg = orderTab === 'active' ? 'Нет активных заказов'
                : orderTab === 'completed' ? 'Завершённых заказов нет'
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
