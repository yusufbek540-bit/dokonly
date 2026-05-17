'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccentColor, getAccentSoft } from '@/lib/theme'
import { type Shop, type Product } from '@/lib/api'
import { StoreHeader } from '@/components/StoreHeader'
import { StoreFooter } from '@/components/StoreFooter'
import { ProductGrid } from '@/components/ProductGrid'

interface SearchClientProps {
  shop: Shop
  products: Product[]
  slug: string
  initialQuery: string
}

export function SearchClient({ shop, products, slug, initialQuery }: SearchClientProps) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  useEffect(() => {
    const accent = getAccentColor(shop.accent_color)
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--accent-soft', getAccentSoft(shop.accent_color))
  }, [shop.accent_color])

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.category_name ?? '').toLowerCase().includes(q)
    )
  }, [products, query])

  const handleSearch = (q: string) => {
    setQuery(q)
    if (q.trim()) {
      router.replace(`/${slug}/search?q=${encodeURIComponent(q)}`, { scroll: false })
    } else {
      router.replace(`/${slug}/search`, { scroll: false })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <StoreHeader shop={shop} slug={slug} onSearch={handleSearch} searchQuery={query} />

      <main className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Search header */}
        <div className="mb-6">
          {query.trim() ? (
            <>
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                Результаты для: <span style={{ color: 'var(--accent)' }}>&quot;{query}&quot;</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Найдено {filtered.length}{' '}
                {filtered.length === 1 ? 'товар' : filtered.length < 5 ? 'товара' : 'товаров'}
              </p>
            </>
          ) : (
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
              Все товары
            </h1>
          )}
        </div>

        {/* Inline search bar */}
        <div className="mb-8 max-w-lg">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Поиск товаров..."
              autoFocus
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-10 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
              style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
            />
            {query && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <ProductGrid products={filtered} slug={slug} currency={shop.currency} />
      </main>

      <StoreFooter shop={shop} slug={slug} />
    </div>
  )
}
