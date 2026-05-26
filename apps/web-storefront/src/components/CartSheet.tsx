'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { fmtPrice } from '@/lib/api'

interface CartSheetProps {
  open: boolean
  onClose: () => void
  slug: string
  currency: string
}

export function CartSheet({ open, onClose, slug, currency }: CartSheetProps) {
  const items = useCart((s) => s.items)
  const update = useCart((s) => s.update)
  const remove = useCart((s) => s.remove)
  const total = useCart((s) => s.total())
  const overlayRef = useRef<HTMLDivElement>(null)
  const itemList = Object.values(items)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Корзина
            {itemList.length > 0 && (
              <span className="ml-2 text-sm font-medium text-gray-400">({itemList.length})</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {itemList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Корзина пуста</p>
                <p className="text-sm text-gray-400 mt-1">Добавьте товары чтобы начать покупки</p>
              </div>
              <button
                onClick={onClose}
                className="text-sm font-medium text-white px-6 py-2.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              >
                Продолжить покупки
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {itemList.map((item) => (
                <li key={item.productId} className="flex gap-3 px-5 py-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.name}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--accent)' }}>
                      {fmtPrice(item.price, currency)}
                    </p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => update(item.productId, item.qty - 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => update(item.productId, item.qty + 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => remove(item.productId)}
                    className="text-gray-300 hover:text-red-400 transition-colors self-start mt-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — total + checkout */}
        {itemList.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">Итого</span>
              <span className="text-lg font-bold text-gray-900">{fmtPrice(total, currency)}</span>
            </div>
            <Link
              href={`/${slug}/cart`}
              onClick={onClose}
              className="block w-full text-center text-white font-semibold py-3 rounded-full transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Оформить заказ
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
