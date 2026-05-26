'use client'

import Link from 'next/link'
import { useCart } from '@/store/cart'
import { fmtPrice, getProductImage, type Product } from '@/lib/api'

interface ProductCardProps {
  product: Product
  slug: string
  currency: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function ProductCard({ product, slug, currency }: ProductCardProps) {
  const add = useCart((s) => s.add)
  const items = useCart((s) => s.items)
  const imageUrl = getProductImage(product)
  const isInCart = !!items[product.id]

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    add({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: imageUrl ?? undefined,
      currency,
    })
  }

  return (
    <Link href={`/${slug}/p/${product.id}`} className="group block">
      <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* "Out of stock" badge */}
          {product.in_stock === false && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-white text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
                Нет в наличии
              </span>
            </div>
          )}

          {/* Discount badge */}
          {product.old_price && product.old_price > product.price && (
            <div
              className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent)' }}
            >
              -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}%
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3">
            <button
              onClick={handleAdd}
              className={`text-sm font-semibold px-5 py-2 rounded-full transition-colors ${
                isInCart
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
            >
              {isInCart ? '✓ В корзине' : 'В корзину'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          {product.category_name && (
            <p className="text-xs text-gray-400 mb-1">{product.category_name}</p>
          )}
          <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{product.name}</p>

          {/* Rating */}
          {product.rating != null && product.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <StarRating rating={product.rating} />
              <span className="text-xs text-gray-400">({product.review_count ?? 0})</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {fmtPrice(product.price, currency)}
            </p>
            {product.old_price && product.old_price > product.price && (
              <p className="text-xs text-gray-400 line-through">{fmtPrice(product.old_price, currency)}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
