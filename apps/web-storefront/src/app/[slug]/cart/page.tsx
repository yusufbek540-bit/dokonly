'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCart } from '@/store/cart'
import { fmtPrice } from '@/lib/api'

export default function CartPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const items = useCart((s) => s.items)
  const update = useCart((s) => s.update)
  const remove = useCart((s) => s.remove)
  const clear = useCart((s) => s.clear)
  const total = useCart((s) => s.total())
  const itemList = Object.values(items)

  // Detect currency from first item (best effort)
  const currency = itemList[0]?.currency ?? 'UZS'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
          <Link
            href={`/${slug}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Продолжить покупки
          </Link>
          <h1
            className="font-bold text-gray-900 ml-auto"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Корзина
          </h1>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {itemList.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">Корзина пуста</p>
              <p className="text-sm text-gray-400 mt-1">Добавьте товары из каталога, чтобы начать покупки</p>
            </div>
            <Link
              href={`/${slug}`}
              className="text-sm font-medium text-white px-6 py-3 rounded-full transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              В каталог
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Items list */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">
                  {itemList.length}{' '}
                  {itemList.length === 1 ? 'товар' : itemList.length < 5 ? 'товара' : 'товаров'}
                </h2>
                <button
                  onClick={clear}
                  className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                  Очистить корзину
                </button>
              </div>

              <div className="space-y-3">
                {itemList.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm"
                  >
                    {/* Image */}
                    <Link href={`/${slug}/p/${item.productId}`}>
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-7 h-7 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/${slug}/p/${item.productId}`}>
                        <p className="font-medium text-gray-900 hover:underline line-clamp-2">{item.name}</p>
                      </Link>
                      <p className="text-sm font-bold mt-1" style={{ color: 'var(--accent)' }}>
                        {fmtPrice(item.price, currency)}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        {/* Qty controls */}
                        <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => update(item.productId, item.qty - 1)}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 font-bold text-base"
                          >
                            −
                          </button>
                          <span className="px-4 py-1.5 text-sm font-semibold text-gray-900">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => update(item.productId, item.qty + 1)}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 font-bold text-base"
                          >
                            +
                          </button>
                        </div>

                        {/* Line total */}
                        <p className="text-sm font-bold text-gray-900">
                          {fmtPrice(item.price * item.qty, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => remove(item.productId)}
                      className="text-gray-300 hover:text-red-400 transition-colors self-start"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Order summary */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h2 className="font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                  Итог заказа
                </h2>

                <div className="space-y-3 mb-5">
                  {itemList.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-gray-600 line-clamp-1 flex-1 mr-4">
                        {item.name} × {item.qty}
                      </span>
                      <span className="text-gray-800 font-medium shrink-0">
                        {fmtPrice(item.price * item.qty, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Итого</span>
                    <span className="text-xl font-bold text-gray-900">{fmtPrice(total, currency)}</span>
                  </div>
                </div>

                {/* Checkout button */}
                <Link
                  href={`/${slug}/checkout`}
                  className="block w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 text-center"
                  style={{ background: 'var(--accent)' }}
                >
                  Оформить заказ
                </Link>

                <p className="text-xs text-gray-400 text-center mt-3">
                  Доставка и оплата рассчитываются при оформлении
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
