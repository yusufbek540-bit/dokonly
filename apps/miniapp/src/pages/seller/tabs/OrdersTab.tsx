import React, { useState, useRef } from 'react'
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
  { id: '', label: 'Все' },
  { id: 'new', label: 'Новые', next: 'confirmed' },
  { id: 'confirmed', label: 'Готовятся', next: 'shipping' },
  { id: 'shipping', label: 'Доставка', next: 'delivered' },
  { id: 'delivered', label: 'Доставлено', next: 'completed' },
  { id: 'completed', label: 'Завершено', next: null },
  { id: 'cancelled', label: 'Отмена' },
  { id: 'archive', label: 'Архив', next: null },
]

const ARCHIVE_STATUSES = ['completed', 'cancelled']

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
  const [note, setNote] = useState<string>(order.seller_note ?? '')
  const [noteSaved, setNoteSaved] = useState(false)
  const [showPicking, setShowPicking] = useState(false)
  const [pickedItems, setPickedItems] = useState<Set<number>>(new Set())

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.seller.updateOrderStatus(id, status),
    onSuccess: (data) => onStatusUpdate(data),
  })

  const noteMutation = useMutation({
    mutationFn: (text: string) => api.seller.updateOrderNote(order.id, text),
    onSuccess: (data) => {
      onStatusUpdate(data)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    },
  })

  const verifyPaymentMutation = useMutation({
    mutationFn: () => api.seller.verifyPayment(order.id),
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
          {order.customer_phone && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: order.customer_email ? 2 : 10 }}>{order.customer_phone}</div>}
          {order.customer_email && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{order.customer_email}</div>}
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
            {order.customer_telegram_id && (
              <button
                onClick={() => {
                  const url = `tg://user?id=${order.customer_telegram_id}`;
                  (window as any).Telegram?.WebApp?.openLink?.(url) ?? window.open(`https://t.me/${order.customer_telegram_id}`, '_blank')
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 999,
                  background: 'var(--subtle)', border: '1px solid var(--border)',
                  fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                }}
              >
                👤 Профиль
              </button>
            )}
            {(order.items ?? []).length > 0 && (
              <button
                onClick={() => setShowPicking(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 999,
                  background: 'var(--subtle)', border: '1px solid var(--border)',
                  fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                }}
              >
                📋 Чеклист сборки
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

        {/* Payment screenshot */}
        {order.meta?.payment_screenshot && (
          <div style={{ margin: '12px 16px 0', padding: '14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Скриншот оплаты</div>
              {order.payment_status === 'paid'
                ? <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>✓ Оплата подтверждена</span>
                : (
                  <button
                    onClick={() => verifyPaymentMutation.mutate()}
                    disabled={verifyPaymentMutation.isPending}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      background: '#10B981', color: 'white',
                      fontWeight: 700, fontSize: 12, border: 'none',
                      cursor: verifyPaymentMutation.isPending ? 'default' : 'pointer',
                      opacity: verifyPaymentMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {verifyPaymentMutation.isPending ? '...' : '✓ Подтвердить'}
                  </button>
                )
              }
            </div>
            <a href={order.meta.payment_screenshot} target="_blank" rel="noopener noreferrer">
              <img
                src={order.meta.payment_screenshot}
                alt="Скриншот оплаты"
                style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8, display: 'block' }}
              />
            </a>
          </div>
        )}

        {/* Customer note */}
        {order.customer_note && (
          <div style={{ margin: '12px 16px 0', padding: '14px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Заметка покупателя</div>
            <div style={{ fontSize: 14, color: '#78350F', lineHeight: 1.5 }}>{order.customer_note}</div>
          </div>
        )}

        {/* Seller note */}
        <div style={{ margin: '12px 16px 0', padding: '14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Заметка (внутренняя)</div>
            {noteSaved && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✓ Сохранено</span>}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Для служебного пользования..."
            rows={3}
            style={{
              width: '100%', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--subtle)', padding: '10px 12px',
              fontSize: 14, color: 'var(--ink)', resize: 'none', outline: 'none',
              lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
          {note !== (order.seller_note ?? '') && (
            <button
              onClick={() => noteMutation.mutate(note)}
              disabled={noteMutation.isPending}
              style={{
                marginTop: 8, height: 38, padding: '0 16px', borderRadius: 10,
                background: 'var(--accent)', color: 'white',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                opacity: noteMutation.isPending ? 0.7 : 1,
              }}
            >
              {noteMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
          )}
        </div>

        {/* Buyer review */}
        {order.meta?.review_rating && (
          <div style={{ margin: '12px 16px 0', padding: '14px', borderRadius: 14, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Отзыв покупателя</div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= order.meta.review_rating ? 'var(--accent)' : 'none'} stroke="var(--accent)" strokeWidth="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              ))}
            </div>
            {order.meta.review_text && (
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{order.meta.review_text}</div>
            )}
          </div>
        )}

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

      {/* Picking checklist modal */}
      {showPicking && (
        <div
          onClick={() => setShowPicking(false)}
          onTouchMove={e => e.preventDefault()}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', maxHeight: '80vh', overflow: 'auto', overscrollBehavior: 'contain' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <div style={{ padding: '12px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
                📋 Чеклист сборки
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Отмечайте товары по мере сборки заказа
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {(order.items ?? []).map((item: any, idx: number, arr: any[]) => {
                  const picked = pickedItems.has(idx)
                  return (
                    <div
                      key={idx}
                      onClick={() => setPickedItems(prev => {
                        const next = new Set(prev)
                        if (next.has(idx)) next.delete(idx)
                        else next.add(idx)
                        return next
                      })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px', background: picked ? 'var(--accent-soft)' : 'var(--card)',
                        borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${picked ? 'var(--accent)' : 'var(--border)'}`,
                        background: picked ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {picked && (
                          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 500, color: 'var(--ink)',
                          textDecoration: picked ? 'line-through' : 'none',
                          opacity: picked ? 0.6 : 1,
                        }}>
                          {item.product_name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                          {item.quantity} шт.{item.size ? ` · ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                {pickedItems.size} из {(order.items ?? []).length} собрано
              </div>
              {pickedItems.size === (order.items ?? []).length && (order.items ?? []).length > 0 && (
                <div style={{ fontSize: 14, fontWeight: 600, color: '#10B981', textAlign: 'center' }}>
                  ✓ Все товары собраны!
                </div>
              )}
              <button
                onClick={() => setShowPicking(false)}
                style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15 }}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, currency, onAdvance, onCancel, onTap }: { order: any; currency: string; onAdvance: () => void; onCancel: (reason?: string) => void; onTap: () => void }) {
  const statusDef = STATUSES.find(s => s.id === order.status)
  const canAdvance = !!statusDef?.next
  const canCancel = order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'delivered'
  const touchStartX = useRef<number | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const [swiped, setSwiped] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const THRESHOLD = 80

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    if (dx > 0 && canAdvance) setSwipeX(Math.min(dx, THRESHOLD + 20))
    else if (dx < 0 && canCancel) setSwipeX(Math.max(dx, -(THRESHOLD + 20)))
  }

  const handleTouchEnd = () => {
    if (swipeX >= THRESHOLD && canAdvance && !swiped) {
      setSwiped(true)
      onAdvance()
      setTimeout(() => setSwiped(false), 500)
    } else if (swipeX <= -THRESHOLD && canCancel) {
      setShowCancelConfirm(true)
    }
    setSwipeX(0)
    touchStartX.current = null
  }

  return (
    <>
    <div
      style={{ position: 'relative', marginBottom: 8, borderRadius: 14, overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe-right reveal: advance status */}
      {canAdvance && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', paddingLeft: 16,
          borderRadius: 14,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
            → {NEXT_LABEL[order.status]}
          </span>
        </div>
      )}
      {/* Swipe-left reveal: cancel */}
      {canCancel && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20,
          borderRadius: 14,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Отменить ✕</span>
        </div>
      )}
    <div onClick={onTap} style={{
      padding: '14px', borderRadius: 14,
      background: 'var(--card)', border: '1px solid var(--border)',
      cursor: 'pointer',
      transform: `translateX(${swipeX}px)`,
      transition: swipeX === 0 ? 'transform 0.3s ease' : 'none',
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
    </div>

    {/* Cancel confirmation */}
    {showCancelConfirm && (
      <div
        onClick={() => setShowCancelConfirm(false)}
        onTouchMove={e => e.preventDefault()}
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px' }}
        >
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 8 }}>
            Отменить заказ?
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
            Заказ #{order.id.slice(0, 8).toUpperCase()} будет отменён. Это действие нельзя отменить.
          </div>
          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Причина отмены (необязательно)"
            rows={2}
            style={{
              width: '100%', borderRadius: 12, border: '1px solid var(--border)',
              padding: '10px 12px', fontSize: 14, color: 'var(--ink)',
              background: 'var(--card)', resize: 'none', outline: 'none',
              marginBottom: 14, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setShowCancelConfirm(false); setCancelReason('') }}
              style={{ flex: 1, height: 48, borderRadius: 14, background: 'var(--subtle)', fontWeight: 600, fontSize: 15 }}
            >
              Назад
            </button>
            <button
              onClick={() => { setShowCancelConfirm(false); onCancel(cancelReason); setCancelReason('') }}
              style={{ flex: 1, height: 48, borderRadius: 14, background: '#EF4444', color: 'white', fontWeight: 700, fontSize: 15 }}
            >
              Отменить заказ
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: 'Запрошен', approved: 'Одобрен', rejected: 'Отклонён',
  received: 'Получен', completed: 'Завершён',
}
const RETURN_STATUS_COLORS: Record<string, string> = {
  requested: '#F59E0B', approved: '#8B5CF6', rejected: '#EF4444',
  received: '#3B82F6', completed: '#10B981',
}

function ReturnsView({ currency }: { currency: string }) {
  const qc = useQueryClient()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['seller-returns'],
    queryFn: () => api.seller.returns(),
    refetchInterval: 30_000,
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => api.seller.approveReturn(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-returns'] }),
  })
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.seller.rejectReturn(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-returns'] })
      setRejectId(null)
      setRejectReason('')
    },
  })
  const refundMut = useMutation({
    mutationFn: (id: string) => api.seller.markReturnRefunded(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-returns'] }),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if ((returns as any[]).length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
        <div style={{ fontSize: 14 }}>Возвратов нет</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(returns as any[]).map((r: any) => (
        <div key={r.id} style={{
          background: 'var(--card)', borderRadius: 16, padding: 16,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                Заказ #{String(r.order_id ?? '').slice(-6).toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {r.customer_name ?? 'Покупатель'}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
              background: (RETURN_STATUS_COLORS[r.status] ?? '#888') + '22',
              color: RETURN_STATUS_COLORS[r.status] ?? '#888',
            }}>
              {RETURN_STATUS_LABELS[r.status] ?? r.status}
            </span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
            <span style={{ color: 'var(--muted)', marginRight: 4 }}>Причина:</span>
            {r.reason ?? '—'}
          </div>

          {r.refund_amount && (
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
              <span style={{ color: 'var(--muted)', marginRight: 4 }}>Сумма:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {Number(r.refund_amount).toLocaleString()} {currency}
              </span>
            </div>
          )}

          {r.photos?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {r.photos.map((photo: string, i: number) => (
                <img key={i} src={photo} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
              ))}
            </div>
          )}

          {r.status === 'requested' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => approveMut.mutate(r.id)}
                disabled={approveMut.isPending}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer',
                  opacity: approveMut.isPending ? 0.6 : 1,
                }}
              >
                ✓ Одобрить
              </button>
              <button
                onClick={() => setRejectId(r.id)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: 'var(--subtle)', color: '#EF4444', border: 'none', cursor: 'pointer',
                }}
              >
                ✕ Отклонить
              </button>
            </div>
          )}

          {r.status === 'received' && (
            <button
              onClick={() => refundMut.mutate(r.id)}
              disabled={refundMut.isPending}
              style={{
                width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: '#10B98122', color: '#10B981', border: 'none', cursor: 'pointer',
                opacity: refundMut.isPending ? 0.6 : 1,
              }}
            >
              💳 Подтвердить возврат средств
            </button>
          )}
        </div>
      ))}

      {rejectId && (
        <div
          onTouchMove={e => e.preventDefault()}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div onTouchMove={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Причина отклонения</div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Укажите причину..."
              style={{
                width: '100%', border: '1px solid var(--border)', borderRadius: 12,
                padding: '10px 12px', fontSize: 14, resize: 'none',
                background: 'var(--subtle)', color: 'var(--text)',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={() => { setRejectId(null); setRejectReason('') }}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, fontSize: 14,
                  background: 'var(--subtle)', border: 'none', cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => rejectMut.mutate({ id: rejectId, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMut.isPending}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer',
                  opacity: !rejectReason.trim() || rejectMut.isPending ? 0.5 : 1,
                }}
              >
                {rejectMut.isPending ? 'Отклоняем...' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function OrdersTab({ tenant }: Props) {
  const [activeStatus, setActiveStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => api.seller.orders(),
  })

  const { data: returns = [] } = useQuery({
    queryKey: ['seller-returns'],
    queryFn: () => api.seller.returns(),
    refetchInterval: 30_000,
  })

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.seller.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders'] }),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.seller.updateOrderStatus(id, 'cancelled').then(async r => {
        if (reason?.trim()) await api.seller.updateOrderNote(id, reason.trim())
        return r
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders'] }),
  })

  const filteredOrders = orders.filter((o: any) => {
    if (activeStatus === '') return true // All orders
    if (activeStatus === 'archive') return ARCHIVE_STATUSES.includes(o.status)
    if (activeStatus === 'cancelled') return o.status === 'cancelled'
    return o.status === activeStatus
  })
  const countsByStatus = Object.fromEntries(
    STATUSES.map(s => [
      s.id,
      s.id === ''
        ? orders.length // All
        : s.id === 'archive'
        ? orders.filter((o: any) => ARCHIVE_STATUSES.includes(o.status)).length
        : s.id === 'cancelled'
        ? orders.filter((o: any) => o.status === 'cancelled').length
        : orders.filter((o: any) => o.status === s.id).length,
    ])
  )
  const pendingReturnsCount = (returns as any[]).filter((r: any) => r.status === 'requested').length

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
        <button onClick={() => setActiveStatus('returns')} style={{
          flexShrink: 0, padding: '8px 14px',
          borderBottom: `2px solid ${activeStatus === 'returns' ? 'var(--accent)' : 'transparent'}`,
          color: activeStatus === 'returns' ? 'var(--accent)' : 'var(--muted)',
          fontSize: 13, fontWeight: activeStatus === 'returns' ? 700 : 500,
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}>
          🔄 Возвраты
          {pendingReturnsCount > 0 && (
            <span style={{
              marginLeft: 6, fontSize: 11, fontWeight: 700,
              padding: '1px 6px', borderRadius: 999,
              background: activeStatus === 'returns' ? 'var(--accent)' : '#EF444422',
              color: activeStatus === 'returns' ? 'white' : '#EF4444',
            }}>{pendingReturnsCount}</span>
          )}
        </button>
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '12px 16px 100px' }}>
        {activeStatus === 'returns' ? (
          <ReturnsView currency={tenant.currency} />
        ) : isLoading ? (
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
                onCancel={(reason) => cancelMutation.mutate({ id: o.id, reason })}
                onTap={() => setSelectedOrder(o)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
