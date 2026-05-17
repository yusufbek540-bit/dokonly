'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { fmtPrice, createOrder, validateCoupon, Shop } from '@/lib/api'

const DELIVERY_OPTIONS = [
  { id: 'pickup', label: 'Самовывоз', cost: 0 },
  { id: 'courier', label: 'Курьером', cost: 0, requiresAddress: true },
  { id: 'discuss', label: 'Обсудить с продавцом', cost: 0 },
]

const PAYMENT_OPTIONS = [
  { id: 'click', label: 'Click', description: 'Онлайн-оплата' },
  { id: 'payme', label: 'Payme', description: 'Онлайн-оплата' },
  { id: 'cash', label: 'Наличные при получении', description: '' },
  { id: 'transfer', label: 'Перевод на карту', description: 'Реквизиты после оформления' },
]

export function CheckoutClient({ shop, slug }: { shop: Shop; slug: string }) {
  const items = useCart((s) => s.items)
  const clear = useCart((s) => s.clear)
  const router = useRouter()
  const itemList = Object.values(items)
  const subtotal = useCart((s) => s.total())

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [delivery, setDelivery] = useState('pickup')
  const [address, setAddress] = useState('')
  const [comment, setComment] = useState('')
  const [payment, setPayment] = useState('click')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<{ id: string; number?: string } | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount_amount: number; discount_type: string } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  if (itemList.length === 0 && !confirmed) {
    router.replace(`/${slug}/cart`)
    return null
  }

  const requiresAddress = delivery === 'courier'
  const discount = couponResult?.valid ? couponResult.discount_amount : 0
  const finalTotal = subtotal - discount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) { setError('Заполните имя и телефон'); return }
    if (requiresAddress && !address.trim()) { setError('Укажите адрес доставки'); return }
    setLoading(true)
    setError(null)
    const result = await createOrder(shop.id, {
      items: itemList.map((i) => ({ product_id: i.productId, qty: i.qty, price: i.price })),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      delivery_method: delivery,
      address: requiresAddress ? address.trim() : undefined,
      comment: comment.trim() || undefined,
      payment_method: payment,
      coupon_code: couponResult?.valid ? couponCode : undefined,
    })
    setLoading(false)
    if (!result) { setError('Не удалось оформить заказ. Попробуйте ещё раз.'); return }
    clear()
    setConfirmed({ id: result.id, number: result.order_number })
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--accent-soft)' }}>
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Заказ оформлен!</h1>
          {confirmed.number && (
            <p className="text-sm text-gray-500 mb-1">Заказ #{confirmed.number}</p>
          )}
          <p className="text-gray-500 text-sm mb-6">Продавец свяжется с вами для подтверждения заказа.</p>
          <Link
            href={`/${slug}`}
            className="inline-block px-8 py-3 rounded-xl font-semibold text-white text-sm"
            style={{ background: 'var(--accent)' }}
          >
            Вернуться в магазин
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
          <Link href={`/${slug}/cart`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Корзина
          </Link>
          <h1 className="font-bold text-gray-900 ml-auto" style={{ fontFamily: 'var(--font-display)' }}>
            Оформление заказа
          </h1>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
          {/* Left: form */}
          <div className="flex-1 space-y-5">
            {/* Contact */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Контактные данные</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 000 00 00"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (необязательно)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Доставка</h2>
              <div className="space-y-3">
                {DELIVERY_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors" style={delivery === opt.id ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}}>
                    <input
                      type="radio"
                      name="delivery"
                      value={opt.id}
                      checked={delivery === opt.id}
                      onChange={() => setDelivery(opt.id)}
                      className="sr-only"
                    />
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: delivery === opt.id ? 'var(--accent)' : '#D1D5DB' }}>
                      {delivery === opt.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                    {opt.cost > 0 && <span className="ml-auto text-sm text-gray-500">+{fmtPrice(opt.cost, shop.currency)}</span>}
                  </label>
                ))}
              </div>

              {requiresAddress && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Адрес доставки *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Улица, дом, квартира"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    required={requiresAddress}
                  />
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий к заказу (необязательно)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Пожелания, уточнения..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Способ оплаты</h2>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors" style={payment === opt.id ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}}>
                    <input
                      type="radio"
                      name="payment"
                      value={opt.id}
                      checked={payment === opt.id}
                      onChange={() => setPayment(opt.id)}
                      className="sr-only"
                    />
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: payment === opt.id ? 'var(--accent)' : '#D1D5DB' }}>
                      {payment === opt.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      {opt.description && <p className="text-xs text-gray-400">{opt.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h2 className="font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                Итог заказа
              </h2>
              <div className="space-y-3 mb-5">
                {itemList.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600 line-clamp-1 flex-1 mr-4">{item.name} × {item.qty}</span>
                    <span className="text-gray-800 font-medium shrink-0">{fmtPrice(item.price * item.qty, shop.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Сумма</span>
                  <span className="text-sm text-gray-800">{fmtPrice(subtotal, shop.currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-green-600">Скидка</span>
                    <span className="text-sm text-green-600">−{fmtPrice(discount, shop.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold text-gray-900">Итого</span>
                  <span className="text-xl font-bold text-gray-900">{fmtPrice(finalTotal, shop.currency)}</span>
                </div>
              </div>

              {/* Coupon */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                    placeholder="Промокод"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!couponCode.trim() || checkingCoupon}
                    onClick={async () => {
                      setCheckingCoupon(true)
                      const res = await validateCoupon(shop.id, couponCode, subtotal)
                      setCouponResult(res)
                      setCheckingCoupon(false)
                    }}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {checkingCoupon ? '...' : 'Применить'}
                  </button>
                </div>
                {couponResult && (
                  <p className={`text-xs mt-1.5 ${couponResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                    {couponResult.valid ? `✓ Скидка ${fmtPrice(couponResult.discount_amount, shop.currency)}` : '✗ Промокод недействителен'}
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {loading ? 'Оформляем...' : `Оформить заказ · ${fmtPrice(finalTotal, shop.currency)}`}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Нажимая кнопку, вы соглашаетесь с условиями оферты
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
