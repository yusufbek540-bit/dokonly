'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getAccentColor, getAccentSoft } from '@/lib/theme'
import { fmtPrice, type Shop, type Product, type Story } from '@/lib/api'
import { useCart } from '@/store/cart'
import { StoreHeader } from '@/components/StoreHeader'
import { StoreFooter } from '@/components/StoreFooter'
import { ProductGrid } from '@/components/ProductGrid'
import { FilterSidebar } from '@/components/FilterSidebar'
import { StoriesCarousel } from '@/components/StoriesCarousel'

interface StoreClientProps {
  shop: Shop
  products: Product[]
  stories: Story[]
  slug: string
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name_asc'

export function StoreClient({ shop, products, stories, slug }: StoreClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [inStockOnly, setInStockOnly] = useState(false)
  const cartCount = useCart((s) => s.count())
  const cartTotal = useCart((s) => s.total())

  // Apply accent color from shop theme
  useEffect(() => {
    const accent = getAccentColor(shop.accent_color)
    const accentSoft = getAccentSoft(shop.accent_color)
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--accent-soft', accentSoft)
  }, [shop.accent_color])

  // Build category list from products
  const categories = useMemo(() => {
    const map = new Map<string | null, { name: string; count: number }>()
    products.forEach((p) => {
      const id = p.category_id ?? null
      const name = p.category_name ?? 'Без категории'
      const existing = map.get(id)
      if (existing) {
        existing.count++
      } else {
        map.set(id, { name, count: 1 })
      }
    })
    return Array.from(map.entries()).map(([id, { name, count }]) => ({ id, name, count }))
  }, [products])

  // Filter + sort products
  const filtered = useMemo(() => {
    let list = [...products]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.category_name ?? '').toLowerCase().includes(q)
      )
    }

    if (selectedCategory !== null) {
      list = list.filter((p) => (p.category_id ?? null) === selectedCategory)
    }

    if (inStockOnly) {
      list = list.filter((p) => p.in_stock !== false)
    }

    switch (sortKey) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'name_asc':
        list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        break
    }

    return list
  }, [products, searchQuery, selectedCategory, sortKey, inStockOnly])

  const accentColor = getAccentColor(shop.accent_color)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <StoreHeader
        shop={shop}
        slug={slug}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
      />

      {/* Hero cover */}
      {shop.cover_url && (
        <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-[400px] overflow-hidden bg-gray-200">
          <img
            src={shop.cover_url}
            alt={`${shop.name} cover`}
            className="w-full h-full object-cover"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* Store name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="max-w-[1280px] mx-auto">
              <h1
                className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold drop-shadow-sm"
                style={{ fontFamily: 'var(--font-display)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
              >
                {shop.name}
              </h1>
              {shop.description && (
                <p className="text-white/80 text-sm sm:text-base mt-1 max-w-xl drop-shadow-sm">
                  {shop.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No cover — show simple header banner */}
      {!shop.cover_url && (
        <div className="w-full py-10 px-4" style={{ background: getAccentSoft(shop.accent_color) }}>
          <div className="max-w-[1280px] mx-auto">
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: accentColor, fontFamily: 'var(--font-display)' }}
            >
              {shop.name}
            </h1>
            {shop.description && (
              <p className="text-gray-600 text-sm sm:text-base mt-1">{shop.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Stories */}
      {stories.length > 0 && (
        <section className="py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1280px] mx-auto">
            <StoriesCarousel stories={stories} shopName={shop.name} />
          </div>
        </section>
      )}

      {/* Main content */}
      <main className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Category chips — mobile/tablet horizontal scroll */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide lg:hidden">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === null ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
              style={selectedCategory === null ? { background: accentColor } : {}}
            >
              Все ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id ?? 'uncategorized'}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
                style={selectedCategory === cat.id ? { background: accentColor } : {}}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          {categories.length > 1 && (
            <div className="hidden lg:block">
              <FilterSidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
              />
            </div>
          )}

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {filtered.length}{' '}
                {filtered.length === 1 ? 'товар' : filtered.length < 5 ? 'товара' : 'товаров'}
              </p>
              <div className="flex items-center gap-3">
                {/* In-stock toggle (mobile) */}
                <label className="lg:hidden flex items-center gap-1.5 cursor-pointer">
                  <div
                    onClick={() => setInStockOnly(!inStockOnly)}
                    className="w-8 h-4 rounded-full transition-colors relative"
                    style={{ background: inStockOnly ? accentColor : '#e5e7eb' }}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                        inStockOnly ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-gray-600">В наличии</span>
                </label>

                {/* Sort */}
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                >
                  <option value="default">По умолчанию</option>
                  <option value="price_asc">Сначала дешевле</option>
                  <option value="price_desc">Сначала дороже</option>
                  <option value="name_asc">По названию</option>
                </select>
              </div>
            </div>

            <ProductGrid products={filtered} slug={slug} currency={shop.currency} />
          </div>
        </div>
      </main>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <Link
          href={`/${slug}/cart`}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-3 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: accentColor }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
          </svg>
          <div className="leading-none">
            <p className="text-xs font-medium opacity-80">{cartCount} товар{cartCount === 1 ? '' : cartCount < 5 ? 'а' : 'ов'}</p>
            <p className="text-sm font-bold">{fmtPrice(cartTotal, shop.currency)}</p>
          </div>
        </Link>
      )}

      <StoreFooter shop={shop} slug={slug} />
    </div>
  )
}
