import { useState, useRef } from 'react'
import { useCart } from '@/store/cart'
import { Icon } from '@/components/Icon'
import { api } from '@/lib/api'

interface Props {
  currency: string
  tenantId: string
  shopSettings?: any
  onCheckout: () => void
  onShowCatalog: () => void
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

export function CartTab({ currency, tenantId, shopSettings, onCheckout, onShowCatalog }: Props) {
  const items = useCart((s) => s.items)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const cartTotal = useCart((s) => s.total)()
  const couponCode = useCart((s) => s.couponCode)
  const couponDiscount = useCart((s) => s.couponDiscount)
  const setCoupon = useCart((s) => s.setCoupon)

  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  const swipeStartX = useRef<Record<string, number>>({})
  const [swipeOffset, setSwipeOffset] = useState<Record<string, number>>({})

  const minOrderAmount = shopSettings?.min_order_amount ? Number(shopSettings.min_order_amount) : 0
  const finalTotal = Math.max(0, cartTotal - couponDiscount)
  const belowMin = minOrderAmount > 0 && cartTotal < minOrderAmount
  const remaining = minOrderAmount - cartTotal

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const result = await api.validateCoupon(tenantId, code, cartTotal)
      if (result.valid || result.discount_amount > 0) {
        setCoupon(code, result.discount_amount)
        setCouponInput('')
      } else {
        setCouponError('Купон недействителен или истёк')
      }
    } catch (e: any) {
      const msg = e?.message ?? ''
      if (msg.includes('expired')) setCouponError('Срок действия купона истёк')
      else if (msg.includes('exhausted') || msg.includes('max')) setCouponError('Купон уже использован максимальное количество раз')
      else setCouponError('Купон недействителен')
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setCoupon(null, 0)
    setCouponInput('')
    setCouponError('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
      }}>
        <div style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
          Корзина
        </div>
        {items.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {items.reduce((s, i) => s + i.qty, 0)} шт.
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 999,
            background: 'var(--subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Icon name="cart" size={36} color="var(--muted)"/>
          </div>
          <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
            Корзина пуста
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>
            Добавьте товары из каталога, чтобы оформить заказ
          </p>
          <button
            onClick={onShowCatalog}
            style={{
              height: 50, padding: '0 32px', borderRadius: 14,
              background: 'var(--accent)', color: 'white',
              fontWeight: 700, fontSize: 15,
            }}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <>
          <div className="screen-scroll" style={{ flex: 1, paddingBottom: 100 }}>
            {/* Items */}
            <div style={{ padding: '12px 16px 0' }}>
              {items.map(item => (
                <div key={item.key} style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
                  {/* Red delete bg shown on swipe */}
                  <div style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, width: 80,
                    background: '#EF4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                    </svg>
                  </div>
                  <div
                    onTouchStart={e => { swipeStartX.current[item.key] = e.touches[0].clientX }}
                    onTouchMove={e => {
                      const dx = e.touches[0].clientX - (swipeStartX.current[item.key] ?? e.touches[0].clientX)
                      if (dx < 0) setSwipeOffset(s => ({ ...s, [item.key]: Math.max(dx, -120) }))
                    }}
                    onTouchEnd={() => {
                      const offset = swipeOffset[item.key] ?? 0
                      if (offset < -60) {
                        remove(item.key)
                      }
                      setSwipeOffset(s => ({ ...s, [item.key]: 0 }))
                    }}
                    style={{
                      display: 'flex', gap: 12, padding: '12px 0',
                      transform: `translateX(${swipeOffset[item.key] ?? 0}px)`,
                      transition: swipeOffset[item.key] ? 'none' : 'transform 0.2s ease',
                      background: 'var(--bg)',
                    }}
                  >
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, objectFit: 'cover' }}/>
                    : <div className="img-ph" data-tone={item.tone ?? 0} style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, fontSize: 11 }}>
                        <span>{item.name.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                  }

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>
                        {item.name}
                      </div>
                      <button
                        onClick={() => remove(item.key)}
                        style={{
                          flexShrink: 0, width: 28, height: 28, borderRadius: 999,
                          background: 'var(--subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icon name="x" size={12} color="var(--muted)"/>
                      </button>
                    </div>

                    {/* Size / color badges */}
                    {(item.size || item.color) && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {item.size && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--subtle)', padding: '2px 7px', borderRadius: 6 }}>
                            {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', background: item.color, padding: '2px 7px', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {item.color}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                        {fmtPrice(item.price * item.qty, currency)}
                      </span>

                      {/* Qty controls */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--subtle)', borderRadius: 8 }}>
                        <button
                          onClick={() => item.qty === 1 ? remove(item.key) : setQty(item.key, item.qty - 1)}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Icon name={item.qty === 1 ? 'x' : 'minus'} size={14}/>
                        </button>
                        <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => setQty(item.key, item.qty + 1)}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Icon name="plus" size={14}/>
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon input */}
            <div style={{ margin: '16px 16px 0', padding: '14px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                🎟 Промокод
              </div>
              {couponCode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    height: 42, padding: '0 12px', borderRadius: 10,
                    background: 'var(--accent-soft)', border: '1.5px solid var(--accent)',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
                      {couponCode}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto' }}>
                      -{fmtPrice(couponDiscount, currency)}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Icon name="x" size={14} color="var(--muted)"/>
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Введите промокод"
                      style={{
                        flex: 1, height: 42, padding: '0 12px', borderRadius: 10,
                        background: 'var(--bg)', border: `1px solid ${couponError ? '#EF4444' : 'var(--border)'}`,
                        outline: 'none', fontSize: 14, color: 'var(--ink)',
                        fontFamily: 'JetBrains Mono', letterSpacing: '0.05em',
                      }}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || couponLoading}
                      style={{
                        height: 42, padding: '0 16px', borderRadius: 10,
                        background: couponInput.trim() ? 'var(--accent)' : 'var(--subtle)',
                        color: couponInput.trim() ? 'white' : 'var(--muted)',
                        fontWeight: 600, fontSize: 14, flexShrink: 0,
                        opacity: couponLoading ? 0.7 : 1,
                      }}
                    >
                      {couponLoading ? '...' : 'Применить'}
                    </button>
                  </div>
                  {couponError && (
                    <div style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{couponError}</div>
                  )}
                </>
              )}
            </div>

            {/* Order summary */}
            <div style={{ margin: '12px 16px 0', padding: 16, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: couponDiscount > 0 ? 8 : 0 }}>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                  {items.reduce((s, i) => s + i.qty, 0)} товара
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                  {fmtPrice(cartTotal, currency)}
                </span>
              </div>
              {couponDiscount > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: 'var(--accent)' }}>Скидка ({couponCode})</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14, color: 'var(--accent)' }}>
                      -{fmtPrice(couponDiscount, currency)}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Итого</span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                        {fmtPrice(finalTotal, currency)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {couponDiscount === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Итого</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                    {fmtPrice(cartTotal, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Min order amount warning */}
            {belowMin && (
              <div style={{
                margin: '12px 16px 0', padding: '12px 14px', borderRadius: 12,
                background: '#FFF7ED', border: '1px solid #FDE68A',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 2 }}>
                    Минимальная сумма заказа: {fmtPrice(minOrderAmount, currency)}
                  </div>
                  <div style={{ fontSize: 12, color: '#B45309' }}>
                    Добавьте ещё на {fmtPrice(remaining, currency)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checkout button */}
          <div style={{
            position: 'sticky', bottom: 0,
            padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
            background: 'var(--bg)', borderTop: '1px solid var(--border)',
            zIndex: 30,
          }}>
            <button
              onClick={onCheckout}
              disabled={belowMin}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: belowMin ? 'var(--border)' : 'var(--accent)',
                color: belowMin ? 'var(--muted)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontWeight: 700, fontSize: 15,
                cursor: belowMin ? 'not-allowed' : 'pointer',
              }}
            >
              {belowMin
                ? `Ещё ${fmtPrice(remaining, currency)} до минимума`
                : `Оформить заказ · ${fmtPrice(finalTotal, currency)}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
