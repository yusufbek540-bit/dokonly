import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCart } from '@/store/cart'
import { Icon } from '@/components/Icon'
import { useTelegramMainButton } from '@/hooks/useTelegram'

interface Props {
  tenantId: string
  currency: string
  shopSettings?: any
  onBack: () => void
  onDone: () => void
  onTrackOrder?: () => void
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Наличные', card: 'Карта', click: 'Click',
  payme: 'Payme', uzum: 'Uzum', stars: 'Stars',
}

const DEFAULT_DELIVERY = [
  { id: 'pickup', label: 'Самовывоз', icon: 'pin', price: 0, enabled: true },
]

function tone(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % 8
}

export function Checkout({ tenantId, currency, shopSettings, onBack, onDone, onTrackOrder }: Props) {
  const items = useCart((s) => s.items)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const cartTotal = useCart((s) => s.total)()
  const clear = useCart((s) => s.clear)
  const cartCouponCode = useCart((s) => s.couponCode)
  const cartCouponDiscount = useCart((s) => s.couponDiscount)

  // Build delivery options from shop settings, fall back to defaults
  const deliveryOptions: { id: string; label: string; icon: string; price: number }[] =
    (shopSettings?.delivery_methods ?? DEFAULT_DELIVERY)
      .filter((d: any) => d.enabled)
      .map((d: any) => ({
        id: d.id,
        label: d.label,
        icon: d.id === 'pickup' ? 'pin' : 'truck',
        price: Number(d.price ?? 0),
      }))

  // Build payment options from shop settings, fall back to ['cash']
  const enabledPayments: string[] = shopSettings?.payment_methods?.length
    ? ['cash', ...(shopSettings.payment_methods as string[])]
    : ['cash', 'card', 'click', 'payme']

  const paymentOptions = [...new Set(enabledPayments)].map(id => ({
    id, label: PAYMENT_LABELS[id] ?? id,
  }))

  const firstDelivery = deliveryOptions[0]?.id ?? 'pickup'
  const firstPayment = paymentOptions[0]?.id ?? 'cash'

  const [delivery, setDelivery] = useState(firstDelivery)
  const [payment, setPayment] = useState(firstPayment)
  const [name, setName] = useState<string>(() => {
    const u = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
    return u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : ''
  })
  const [phone, setPhone] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['my-profile', tenantId],
    queryFn: () => api.getMyProfile(tenantId),
    retry: false,
  })

  useEffect(() => {
    if (profile && !profileLoaded) {
      if (profile.phone && !phone) setPhone(profile.phone)
      if (profile.email && !email) setEmail(profile.email)
      if (profile.saved_address && !address) setAddress(profile.saved_address)
      setProfileLoaded(true)
    }
  }, [profile, profileLoaded, phone, email, address])
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountAmount: number; discountType: string; discountValue: number } | null>(
    cartCouponCode ? { code: cartCouponCode, discountAmount: cartCouponDiscount, discountType: 'fixed', discountValue: cartCouponDiscount } : null,
  )
  const [couponError, setCouponError] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderIdFull, setOrderIdFull] = useState<string | null>(null)
  const [orderItemsSnapshot, setOrderItemsSnapshot] = useState<typeof items>([])
  const [orderTotalSnapshot, setOrderTotalSnapshot] = useState(0)
  const [orderDeliverySnapshot, setOrderDeliverySnapshot] = useState('')
  const [paymentMethodSnapshot, setPaymentMethodSnapshot] = useState('')
  const [screenshotUploading, setScreenshotUploading] = useState(false)
  const [screenshotDone, setScreenshotDone] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const deliveryCost = deliveryOptions.find(d => d.id === delivery)?.price ?? 0
  const discount = couponApplied?.discountAmount ?? 0
  const grandTotal = Math.max(cartTotal - discount, 0) + deliveryCost

  const requiredFields: string[] = shopSettings?.required_checkout_fields ?? ['name', 'phone']
  const isRequired = (field: string) => requiredFields.includes(field)

  const minOrderAmount: number = shopSettings?.min_order_amount ? Number(shopSettings.min_order_amount) : 0
  const belowMinOrder = minOrderAmount > 0 && cartTotal < minOrderAmount

  const fieldMissing =
    belowMinOrder ||
    (isRequired('name') && !name.trim()) ||
    (isRequired('phone') && !phone.trim()) ||
    (isRequired('email') && !email.trim()) ||
    (isRequired('address') && delivery !== 'pickup' && delivery !== 'discuss' && !address.trim()) ||
    (isRequired('note') && !customerNote.trim())

  const { mutate: applyCoupon, isPending: applyingCoupon } = useMutation({
    mutationFn: () => api.validateCoupon(tenantId, coupon, cartTotal, items.map(i => i.productId)),
    onSuccess: (data) => {
      setCouponApplied({ code: coupon.toUpperCase(), discountAmount: data.discount_amount, discountType: data.discount_type, discountValue: data.discount_value })
      setCouponError('')
    },
    onError: (e: any) => {
      setCouponError(e.message ?? 'Недействительный промокод')
      setCouponApplied(null)
    },
  })

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () => api.createOrder(tenantId, {
      items: items.map(i => ({ product_id: i.productId, qty: i.qty, size: i.size, color: i.color })),
      customer_name: name,
      customer_phone: phone,
      customer_email: email.trim() || null,
      delivery_address: address || null,
      delivery_type: delivery,
      payment_method: payment,
      coupon_code: couponApplied?.code || null,
      customer_note: customerNote.trim() || null,
    }),
    onSuccess: (data: any) => {
      setOrderItemsSnapshot([...items])
      setOrderTotalSnapshot(grandTotal)
      setOrderDeliverySnapshot(deliveryOptions.find(d => d.id === delivery)?.label ?? 'Доставка')
      setPaymentMethodSnapshot(payment)
      setOrderId(data.id?.slice(0, 8).toUpperCase() ?? 'НОВЫЙ')
      setOrderIdFull(data.id ?? null)
      clear()
    },
  })

  useTelegramMainButton({
    text: isPending ? 'Оформление...' : `Оформить заказ · ${fmtPrice(grandTotal, currency)}`,
    onClick: () => placeOrder(),
    isVisible: true,
    disabled: fieldMissing || isPending,
  })

  const deliveryText = deliveryOptions.find(d => d.id === delivery)?.label ?? 'Доставка'

  if (orderId) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        minHeight: '100vh', padding: '48px 24px 40px', textAlign: 'center',
        background: 'var(--bg)',
      }}>
        <style>{`
          @keyframes circleIn {
            to { stroke-dashoffset: 0; }
          }
          @keyframes checkIn {
            to { stroke-dashoffset: 0; }
          }
          @keyframes popIn {
            0% { transform: scale(0.7); opacity: 0; }
            60% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Animated checkmark */}
        <div style={{ animation: 'popIn 0.5s ease forwards', marginBottom: 28 }}>
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
            <circle
              cx="48" cy="48" r="44"
              stroke="var(--accent-soft)"
              strokeWidth="8"
              fill="var(--accent-soft)"
            />
            <circle
              cx="48" cy="48" r="44"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="276"
              strokeDashoffset="276"
              style={{ animation: 'circleIn 0.6s ease 0.1s forwards' }}
            />
            <path
              d="M30 48l14 14 22-26"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="56"
              strokeDashoffset="56"
              style={{ animation: 'checkIn 0.4s ease 0.55s forwards' }}
            />
          </svg>
        </div>

        <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 6 }}>
          Заказ оформлен!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: shopSettings?.order_confirmation_message ? 12 : 24 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--ink)' }}>#{orderId}</span>
          {' '}· Продавец скоро свяжется с вами
        </p>
        {shopSettings?.order_confirmation_message && (
          <div style={{
            fontSize: 14, color: 'var(--ink)', lineHeight: 1.6,
            padding: '12px 16px', borderRadius: 12,
            background: 'var(--accent-soft)', marginBottom: 24,
            maxWidth: 320, textAlign: 'center',
          }}>
            {shopSettings.order_confirmation_message}
          </div>
        )}

        {/* Order summary card */}
        <div style={{
          width: '100%', maxWidth: 320, borderRadius: 16, overflow: 'hidden', marginBottom: 28,
          border: '1px solid var(--border)', background: 'var(--card)',
          textAlign: 'left',
        }}>
          {/* Items */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            {orderItemsSnapshot.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: idx < orderItemsSnapshot.length - 1 ? 8 : 0,
                marginBottom: idx < orderItemsSnapshot.length - 1 ? 8 : 0,
                borderBottom: idx < orderItemsSnapshot.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, marginRight: 8 }}>
                  {item.name}
                  {item.size ? ` · ${item.size}` : ''}
                  {item.qty > 1 ? ` ×${item.qty}` : ''}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>
                  {fmtPrice(item.price * item.qty, currency)}
                </span>
              </div>
            ))}
          </div>
          {/* Total row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--accent-soft)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{orderDeliverySnapshot}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
              {fmtPrice(orderTotalSnapshot, currency)}
            </span>
          </div>
        </div>

        {/* Manual transfer instructions */}
        {paymentMethodSnapshot === 'card' && (shopSettings?.transfer_card_number || shopSettings?.transfer_card_holder) && (
          <div style={{
            width: '100%', maxWidth: 320, borderRadius: 16, marginBottom: 20,
            border: '1.5px solid var(--accent)', background: 'var(--accent-soft)',
            padding: '16px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
              💳 Перевод на карту
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shopSettings.transfer_card_number && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Номер карты</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'var(--ink)', letterSpacing: '0.05em' }}>
                      {shopSettings.transfer_card_number}
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard?.writeText(shopSettings.transfer_card_number)}
                    style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: 'white', border: '1px solid var(--border)',
                      fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Копировать
                  </button>
                </div>
              )}
              {shopSettings.transfer_card_holder && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Получатель</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{shopSettings.transfer_card_holder}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Сумма перевода</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
                  {fmtPrice(orderTotalSnapshot, currency)}
                </div>
              </div>
              {/* Screenshot upload */}
              {!screenshotDone ? (
                <div>
                  <label style={{ cursor: 'pointer', display: 'block' }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !orderIdFull) return
                        setScreenshotUploading(true)
                        try {
                          await api.uploadPaymentScreenshot(tenantId, orderIdFull, file)
                          setScreenshotDone(true)
                        } catch {
                          // ignore upload error — buyer can still send manually
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
                      {screenshotUploading ? 'Загружаем...' : '📸 Прикрепить скриншот'}
                    </div>
                  </label>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 0', borderTop: '1px solid var(--border)' }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Скриншот загружен</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Share with friends */}
        <div style={{
          width: '100%', maxWidth: 320, borderRadius: 16,
          border: '1px solid var(--border)', background: 'var(--card)',
          padding: '16px', marginBottom: 24, textAlign: 'left',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            💚 Расскажите друзьям
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Поделитесь магазином — пусть друзья тоже оценят!
          </div>
          <button
            onClick={() => {
              const tg = (window as any).Telegram?.WebApp
              const shopUrl = window.location.href.split('?')[0]
              const msg = `Заказал(а) здесь, советую: ${shopUrl}`
              if (tg?.shareUrl) {
                tg.shareUrl(shopUrl, msg)
              } else if (tg?.openTelegramLink) {
                tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shopUrl)}&text=${encodeURIComponent(msg)}`)
              } else {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(shopUrl)}&text=${encodeURIComponent(msg)}`, '_blank')
              }
            }}
            style={{
              width: '100%', height: 42, borderRadius: 10,
              background: 'var(--accent)', color: 'white',
              fontWeight: 600, fontSize: 13,
            }}
          >
            Поделиться в Telegram ↗
          </button>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
          {onTrackOrder && (
            <button
              onClick={onTrackOrder}
              style={{
                height: 52, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 15, width: '100%',
              }}
            >
              Мои заказы
            </button>
          )}
          <button
            onClick={onDone}
            style={{
              height: 52, borderRadius: 14,
              background: 'var(--subtle)', color: 'var(--ink)',
              fontWeight: 600, fontSize: 15, width: '100%',
              border: '1px solid var(--border)',
            }}
          >
            Продолжить покупки
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon name="cart" size={32} color="var(--muted)"/>
        </div>
        <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>Корзина пуста</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>Добавьте товары из каталога</p>
        <button onClick={onBack} style={{
          width: '100%', maxWidth: 320, height: 52, borderRadius: 14,
          background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15,
        }}>В каталог</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
      }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowLeft" size={18}/>
        </button>
        <div style={{ flex: 1, fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
          Корзина
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{items.reduce((s, i) => s + i.qty, 0)} товара</span>
      </div>

      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 100 }}>
        {/* Cart items */}
        <div style={{ padding: '12px 16px 0' }}>
          {items.map(item => (
            <div key={item.key} style={{
              display: 'flex', gap: 12, padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt={item.name} style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, objectFit: 'cover' }}/>
                : <div className="img-ph" data-tone={item.tone ?? 0} style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, fontSize: 11 }}>
                    <span>{item.name.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {item.size && <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--subtle)', padding: '2px 7px', borderRadius: 6 }}>{item.size}</span>}
                  {item.color && <span style={{ fontSize: 11, color: 'var(--muted)', background: item.color, padding: '2px 7px', borderRadius: 6, border: '1px solid var(--border)' }}>{item.color}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                    {fmtPrice(item.price * item.qty, currency)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--subtle)', borderRadius: 8 }}>
                    <button onClick={() => item.qty === 1 ? remove(item.key) : setQty(item.key, item.qty - 1)}
                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={item.qty === 1 ? 'x' : 'minus'} size={14}/>
                    </button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{item.qty}</span>
                    <button onClick={() => setQty(item.key, item.qty + 1)}
                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="plus" size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div style={{ padding: '16px 16px 0' }}>
          {couponApplied ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--accent-soft)', border: '1.5px solid var(--accent)',
            }}>
              <span style={{ fontSize: 16 }}>🎟</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{couponApplied.code}</div>
                <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 1 }}>
                  {couponApplied.discountType === 'percent'
                    ? `-${couponApplied.discountValue}%`
                    : `-${fmtPrice(couponApplied.discountAmount, currency)}`
                  } — применён ✓
                </div>
              </div>
              <button
                onClick={() => { setCouponApplied(null); setCoupon(''); setCouponError('') }}
                style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="x" size={14} color="var(--accent)"/>
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    placeholder="Промокод"
                    value={coupon}
                    onChange={e => { setCoupon(e.target.value); setCouponError('') }}
                    onKeyDown={e => e.key === 'Enter' && coupon.trim() && applyCoupon()}
                    style={{
                      width: '100%', height: 46, paddingLeft: 14, paddingRight: 14,
                      borderRadius: 12, background: 'var(--card)',
                      border: couponError ? '1.5px solid var(--danger)' : '1px solid var(--border)',
                      outline: 'none', fontSize: 14, color: 'var(--ink)',
                      textTransform: 'uppercase',
                    }}
                  />
                </div>
                <button
                  onClick={() => applyCoupon()}
                  disabled={!coupon.trim() || applyingCoupon}
                  style={{
                    height: 46, padding: '0 16px', borderRadius: 12,
                    background: coupon.trim() ? 'var(--accent)' : 'var(--subtle)',
                    color: coupon.trim() ? 'white' : 'var(--muted)',
                    fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {applyingCoupon ? '...' : 'Применить'}
                </button>
              </div>
              {couponError && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>{couponError}</div>
              )}
            </>
          )}
        </div>

        {/* Delivery */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 10 }}>Доставка</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deliveryOptions.map(d => (
              <button key={d.id} onClick={() => setDelivery(d.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${delivery === d.id ? 'var(--accent)' : 'var(--border)'}`,
                background: delivery === d.id ? 'var(--accent-soft)' : 'var(--card)',
                transition: 'all 0.15s', textAlign: 'left',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: delivery === d.id ? 'rgba(0,179,131,0.15)' : 'var(--subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name={d.icon} size={18} color={delivery === d.id ? 'var(--accent)' : 'var(--muted)'}/>
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{d.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: delivery === d.id ? 'var(--accent)' : 'var(--muted)' }}>
                  {d.price === 0 ? 'Бесплатно' : fmtPrice(d.price, currency)}
                </span>
                <div style={{
                  width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                  border: `2px solid ${delivery === d.id ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {delivery === d.id && <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)' }}/>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Address (for courier delivery only, not pickup or discuss) */}
        {delivery !== 'pickup' && delivery !== 'discuss' && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ position: 'relative' }}>
              <Icon name="pin" size={16} color="var(--muted)" style={{ position: 'absolute', left: 14, top: 16 }}/>
              <input
                placeholder="Адрес доставки"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{
                  width: '100%', height: 48, paddingLeft: 40, paddingRight: 14,
                  borderRadius: 12, background: 'var(--card)',
                  border: '1px solid var(--border)', outline: 'none',
                  fontSize: 14, color: 'var(--ink)',
                }}
              />
            </div>
          </div>
        )}

        {/* Payment */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 10 }}>Оплата</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {paymentOptions.map(p => (
              <button key={p.id} onClick={() => setPayment(p.id)} style={{
                padding: '8px 16px', borderRadius: 10,
                border: `1.5px solid ${payment === p.id ? 'var(--accent)' : 'var(--border)'}`,
                background: payment === p.id ? 'var(--accent-soft)' : 'var(--card)',
                color: payment === p.id ? 'var(--accent-ink)' : 'var(--ink)',
                fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 10 }}>Контакты</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              placeholder={isRequired('name') ? 'Ваше имя *' : 'Ваше имя'}
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', height: 48, padding: '0 14px',
                borderRadius: 12, background: 'var(--card)',
                border: isRequired('name') && !name.trim() ? '1px solid var(--border)' : '1px solid var(--border)',
                outline: 'none', fontSize: 14, color: 'var(--ink)',
              }}
            />
            {phoneVerified ? (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 48, padding: '0 14px',
                  borderRadius: 12, background: 'var(--card)',
                  border: '1.5px solid var(--accent)',
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: 999, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{phone}</span>
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>Подтверждён</span>
                </div>
                <button
                  onClick={() => { setPhone(''); setPhoneVerified(false) }}
                  style={{ fontSize: 12, color: 'var(--muted)', background: 'none', marginTop: 6, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Использовать другой номер?
                </button>
              </div>
            ) : (window as any).Telegram?.WebApp?.requestContact ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => {
                    (window as any).Telegram.WebApp.requestContact((ok: boolean, contact: any) => {
                      if (ok && contact?.phone_number) {
                        setPhone(contact.phone_number)
                        setPhoneVerified(true)
                      }
                    })
                  }}
                  style={{
                    height: 48, borderRadius: 12,
                    background: 'var(--accent-soft)', border: '1.5px solid var(--accent)',
                    color: 'var(--accent)', fontWeight: 600, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  📱 Поделиться номером через Telegram
                </button>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>или введите вручную</div>
                <input
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  type="tel"
                  style={{
                    width: '100%', height: 48, padding: '0 14px',
                    borderRadius: 12, background: 'var(--card)',
                    border: '1px solid var(--border)', outline: 'none',
                    fontSize: 14, color: 'var(--ink)',
                  }}
                />
              </div>
            ) : (
              <input
                placeholder="Номер телефона"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="tel"
                style={{
                  width: '100%', height: 48, padding: '0 14px',
                  borderRadius: 12, background: 'var(--card)',
                  border: '1px solid var(--border)', outline: 'none',
                  fontSize: 14, color: 'var(--ink)',
                }}
              />
            )}
            {isRequired('email') && (
              <input
                placeholder="Email *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                style={{
                  width: '100%', height: 48, padding: '0 14px',
                  borderRadius: 12, background: 'var(--card)',
                  border: '1px solid var(--border)', outline: 'none',
                  fontSize: 14, color: 'var(--ink)',
                }}
              />
            )}
          </div>
        </div>

        {/* Customer note */}
        <div style={{ padding: '12px 16px 0' }}>
          <textarea
            placeholder={isRequired('note') ? 'Примечание к заказу *' : 'Примечание к заказу (необязательно)'}
            value={customerNote}
            onChange={e => setCustomerNote(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              background: 'var(--card)', border: '1px solid var(--border)',
              outline: 'none', fontSize: 14, color: 'var(--ink)',
              resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Order summary */}
        <div style={{ margin: '20px 16px 0', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button
            onClick={() => setSummaryOpen(o => !o)}
            style={{
              width: '100%', padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
              Итог · {items.reduce((s, i) => s + i.qty, 0)} шт.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>
                {fmtPrice(grandTotal, currency)}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ transform: summaryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </button>
          {summaryOpen && (
            <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: idx === 0 ? 12 : 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, marginRight: 8 }}>
                    {item.name}{item.size ? ` · ${item.size}` : ''}{item.qty > 1 ? ` ×${item.qty}` : ''}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>
                    {fmtPrice(item.price * item.qty, currency)}
                  </span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
                <span>Товары</span>
                <span style={{ fontFamily: 'JetBrains Mono' }}>{fmtPrice(cartTotal, currency)}</span>
              </div>
              {couponApplied && discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--accent)' }}>
                  <span>Скидка ({couponApplied.code})</span>
                  <span style={{ fontFamily: 'JetBrains Mono' }}>−{fmtPrice(discount, currency)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
                <span>Доставка</span>
                <span style={{ fontFamily: 'JetBrains Mono' }}>{deliveryCost === 0 ? 'Бесплатно' : fmtPrice(deliveryCost, currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--ink)', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                <span>К оплате</span>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>{fmtPrice(grandTotal, currency)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {belowMinOrder && (
        <div style={{
          padding: '10px 16px',
          fontSize: 13, color: 'var(--danger)', textAlign: 'center', fontWeight: 500,
        }}>
          Минимальная сумма заказа: {fmtPrice(minOrderAmount, currency)}
        </div>
      )}
    </div>
  )
}
