'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAccentColor, getAccentSoft } from '@/lib/theme'
import { fmtPrice, getProductImage, type Shop, type Product, type Review } from '@/lib/api'
import { useCart } from '@/store/cart'
import { StoreHeader } from '@/components/StoreHeader'
import { StoreFooter } from '@/components/StoreFooter'
import { ProductCard } from '@/components/ProductCard'

interface ProductDetailClientProps {
  shop: Shop
  product: Product
  reviews: Review[]
  relatedProducts: Product[]
  slug: string
}

function StarRating({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`${interactive ? 'cursor-pointer' : ''} w-4 h-4 transition-colors ${
            star <= (hovered || Math.round(rating)) ? 'text-amber-400' : 'text-gray-200'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function ProductDetailClient({
  shop,
  product,
  reviews,
  relatedProducts,
  slug,
}: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const add = useCart((s) => s.add)
  const cartItems = useCart((s) => s.items)
  const isInCart = !!cartItems[product.id]

  const images = product.images && product.images.length > 0
    ? product.images
    : product.image_url
    ? [product.image_url]
    : []

  const accentColor = getAccentColor(shop.accent_color)

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor)
    document.documentElement.style.setProperty('--accent-soft', getAccentSoft(shop.accent_color))
  }, [shop.accent_color, accentColor])

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      add({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: images[0],
        currency: shop.currency,
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <StoreHeader shop={shop} slug={slug} />

      {/* Breadcrumb */}
      <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link href={`/${slug}`} className="hover:text-gray-700 transition-colors">
            {shop.name}
          </Link>
          <span>/</span>
          {product.category_name && (
            <>
              <span className="hover:text-gray-700 cursor-pointer">{product.category_name}</span>
              <span>/</span>
            </>
          )}
          <span className="text-gray-700 line-clamp-1">{product.name}</span>
        </nav>
      </div>

      {/* Product detail */}
      <main className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Images */}
          <div className="space-y-3">
            {/* Main image */}
            <div
              className="relative aspect-square rounded-3xl overflow-hidden bg-gray-100 cursor-zoom-in"
              onClick={() => images.length > 0 && setLightboxOpen(true)}
            >
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-20 h-20 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Out of stock overlay */}
              {product.in_stock === false && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-white text-gray-800 font-semibold px-5 py-2 rounded-full text-sm">
                    Нет в наличии
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                      idx === selectedImage ? 'border-transparent' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={idx === selectedImage ? { borderColor: accentColor } : {}}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            {product.category_name && (
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: getAccentSoft(shop.accent_color), color: accentColor }}
              >
                {product.category_name}
              </span>
            )}

            <h1
              className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {product.name}
            </h1>

            {/* Rating */}
            {product.rating != null && product.rating > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={product.rating} />
                <span className="text-sm text-gray-500">
                  {product.rating.toFixed(1)} ({product.review_count ?? 0} отзывов)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold" style={{ color: accentColor }}>
                {fmtPrice(product.price, shop.currency)}
              </span>
              {product.old_price && product.old_price > product.price && (
                <span className="text-lg text-gray-400 line-through">
                  {fmtPrice(product.old_price, shop.currency)}
                </span>
              )}
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  product.in_stock === false ? 'bg-red-400' : 'bg-green-400'
                }`}
              />
              <span className="text-sm text-gray-600">
                {product.in_stock === false
                  ? 'Нет в наличии'
                  : product.stock != null
                  ? `В наличии: ${product.stock} шт.`
                  : 'В наличии'}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="prose prose-sm text-gray-600 max-w-none leading-relaxed">
                {product.description.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}

            {/* Add to cart controls */}
            {product.in_stock !== false && (
              <div className="flex items-center gap-3 pt-2">
                {/* Qty */}
                <div className="flex items-center gap-0 rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="px-4 py-2.5 text-sm font-semibold text-gray-900 min-w-[3rem] text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-lg leading-none"
                  >
                    +
                  </button>
                </div>

                {/* Add to cart button */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 px-6 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: accentColor }}
                >
                  {isInCart ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Добавлено
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
                      </svg>
                      В корзину
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Go to cart link */}
            {isInCart && (
              <Link
                href={`/${slug}/cart`}
                className="block w-full text-center py-2.5 px-6 rounded-xl font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
              >
                Перейти в корзину →
              </Link>
            )}
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              Отзывы ({reviews.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {review.author_name ?? 'Покупатель'}
                    </span>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                  )}
                  {review.created_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              Похожие товары
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} slug={slug} currency={shop.currency} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Mobile sticky add to cart */}
      {product.in_stock !== false && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 shadow-2xl z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-50 font-bold">−</button>
              <span className="px-3 py-2 text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-gray-600 hover:bg-gray-50 font-bold">+</button>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex-1 py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2"
              style={{ background: accentColor }}
            >
              В корзину · {fmtPrice(product.price * qty, shop.currency)}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white/70 hover:text-white p-2"
                onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage - 1 + images.length) % images.length) }}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-4 text-white/70 hover:text-white p-2"
                onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage + 1) % images.length) }}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          <img
            src={images[selectedImage]}
            alt={product.name}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="pb-20 lg:pb-0">
        <StoreFooter shop={shop} slug={slug} />
      </div>
    </div>
  )
}
