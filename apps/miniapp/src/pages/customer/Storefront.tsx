import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'
import { useCart } from '@/store/cart'
import { useTelegramMainButton } from '@/hooks/useTelegram'

interface Props {
  shop: { id: string; name: string; currency: string; logo_url: string | null }
  onProduct: (id: string) => void
  initialCategory?: string
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function tone(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % 8
}

const PAGE_SIZE = 20

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'popular' | 'top_rated'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Новинки',
  price_asc: 'Дешевле',
  price_desc: 'Дороже',
  name_asc: 'А-Я',
  popular: 'Популярные',
  top_rated: 'По рейтингу',
}

export function CatalogContent({ shop, onProduct, initialCategory }: Props) {
  const [cat, setCat] = useState(initialCategory ?? 'Все')
  const prevInitCat = useRef(initialCategory)

  useEffect(() => {
    if (initialCategory !== prevInitCat.current) {
      prevInitCat.current = initialCategory
      if (initialCategory) setCat(initialCategory)
    }
  }, [initialCategory])
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dokonly_recent_searches') || '[]') } catch { return [] }
  })

  // Full-screen search overlay state
  const [showSearchScreen, setShowSearchScreen] = useState(false)
  const [overlaySearch, setOverlaySearch] = useState('')
  const [debouncedOverlay, setDebouncedOverlay] = useState('')
  const overlayInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedOverlay(overlaySearch), 300)
    return () => clearTimeout(t)
  }, [overlaySearch])

  useEffect(() => {
    if (showSearchScreen) {
      setTimeout(() => overlayInputRef.current?.focus(), 50)
    }
  }, [showSearchScreen])

  const saveSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5)
    setRecentSearches(updated)
    try { localStorage.setItem('dokonly_recent_searches', JSON.stringify(updated)) } catch {}
  }

  const closeSearchOverlay = (confirmedSearch?: string) => {
    if (confirmedSearch !== undefined) {
      setSearch(confirmedSearch)
    }
    setShowSearchScreen(false)
    setOverlaySearch('')
    setDebouncedOverlay('')
  }

  const [sort, setSort] = useState<SortOption>('newest')
  const [showSort, setShowSort] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [filterMinPrice, setFilterMinPrice] = useState('')
  const [filterMaxPrice, setFilterMaxPrice] = useState('')
  const [filterInStock, setFilterInStock] = useState(false)
  const [filterHasDiscount, setFilterHasDiscount] = useState(false)
  const [filterHasVideo, setFilterHasVideo] = useState(false)
  const [activeMinPrice, setActiveMinPrice] = useState('')
  const [activeMaxPrice, setActiveMaxPrice] = useState('')
  const [activeInStock, setActiveInStock] = useState(false)
  const [activeHasDiscount, setActiveHasDiscount] = useState(false)
  const [activeHasVideo, setActiveHasVideo] = useState(false)

  // Attribute filters state
  const [filterAttrs, setFilterAttrs] = useState<Record<string, string[]>>({})
  const [activeAttrs, setActiveAttrs] = useState<Record<string, string[]>>({})

  const hasActiveFilters = !!(
    activeMinPrice || activeMaxPrice || activeInStock || activeHasDiscount || activeHasVideo ||
    Object.values(activeAttrs).some(v => v.length > 0)
  )
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', shop.id],
    queryFn: () => api.getProducts(shop.id) as Promise<any[]>,
  })

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist', shop.id],
    queryFn: () => api.getWishlist(shop.id),
    retry: false,
  })

  const addToCart = useCart((s) => s.add)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  // Price slider bounds derived from product list
  const allPrices = (products as any[]).filter(p => p.is_active).map((p: any) => Number(p.price)).filter((n: number) => !isNaN(n))
  const priceMin = allPrices.length > 0 ? Math.floor(Math.min(...allPrices)) : 0
  const priceMax = allPrices.length > 0 ? Math.ceil(Math.max(...allPrices)) : 100000
  const sliderMin = filterMinPrice !== '' ? Number(filterMinPrice) : priceMin
  const sliderMax = filterMaxPrice !== '' ? Number(filterMaxPrice) : priceMax

  const handleQuickAdd = (e: React.MouseEvent, p: any) => {
    e.stopPropagation()
    addToCart({
      productId: p.id,
      name: p.name,
      price: Number(p.price),
      qty: 1,
      imageUrl: p.images?.[0] ?? undefined,
    })
    setJustAdded(p.id)
    setTimeout(() => setJustAdded(null), 1200)
  }

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [cat, search, sort, activeMinPrice, activeMaxPrice, activeInStock, activeHasDiscount, activeHasVideo, activeAttrs])

  const loadMore = useCallback(() => {
    setVisibleCount(n => n + PAGE_SIZE)
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  const { mutate: toggleWishlist } = useMutation({
    mutationFn: (productId: string) => api.toggleWishlist(shop.id, productId),
    onMutate: async (productId: string) => {
      await qc.cancelQueries({ queryKey: ['wishlist', shop.id] })
      const prev = qc.getQueryData<string[]>(['wishlist', shop.id]) ?? []
      const next = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
      qc.setQueryData(['wishlist', shop.id], next)
      return { prev }
    },
    onError: (_err: any, _vars: any, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['wishlist', shop.id], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['wishlist', shop.id] })
    },
  })

  const activeProducts = products.filter((p: any) => p.is_active)
  const uniqueCats = Array.from(new Set(activeProducts.map((p: any) => p.category).filter(Boolean))) as string[]
  const catCounts: Record<string, number> = { 'Все': activeProducts.length }
  for (const c of uniqueCats) catCounts[c] = activeProducts.filter((p: any) => p.category === c).length
  const categories = ['Все', ...uniqueCats]

  // Collect attribute options from all active products
  const attrOptions: Record<string, string[]> = {}
  for (const p of activeProducts) {
    if (p.attributes && typeof p.attributes === 'object') {
      for (const [k, v] of Object.entries(p.attributes as Record<string, any>)) {
        if (!attrOptions[k]) attrOptions[k] = []
        const sv = String(v)
        if (!attrOptions[k].includes(sv)) attrOptions[k].push(sv)
      }
    }
  }
  // Only show attributes with 2+ options
  const filterableAttrs = Object.entries(attrOptions).filter(([, vals]) => vals.length >= 2)

  // Trending searches: top 5 products by order_count
  const trendingSearches = [...activeProducts]
    .sort((a: any, b: any) => (Number(b.order_count) || 0) - (Number(a.order_count) || 0))
    .slice(0, 5)
    .map((p: any) => p.name as string)

  const visible = activeProducts
    .filter((p: any) => {
      if (cat !== 'Все' && p.category !== cat) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.description ?? '').toLowerCase().includes(search.toLowerCase())) return false
      const price = Number(p.price)
      if (activeMinPrice && price < Number(activeMinPrice)) return false
      if (activeMaxPrice && price > Number(activeMaxPrice)) return false
      if (activeInStock && (p.stock === null || p.stock === undefined || p.stock === 0)) return false
      if (activeHasDiscount && !(p.compare_at_price && Number(p.compare_at_price) > price)) return false
      if (activeHasVideo && !p.video_url) return false
      // Attribute filters
      if (Object.keys(activeAttrs).length > 0) {
        for (const [k, selected] of Object.entries(activeAttrs)) {
          if (selected.length > 0) {
            const pVal = (p.attributes as Record<string, any> | null)?.[k] !== undefined
              ? String((p.attributes as Record<string, any>)[k])
              : null
            if (!pVal || !selected.includes(pVal)) return false
          }
        }
      }
      return true
    })
    .sort((a: any, b: any) => {
      if (sort === 'price_asc') return Number(a.price) - Number(b.price)
      if (sort === 'price_desc') return Number(b.price) - Number(a.price)
      if (sort === 'name_asc') return a.name.localeCompare(b.name, 'ru')
      if (sort === 'popular') return (Number(b.order_count) || 0) - (Number(a.order_count) || 0)
      if (sort === 'top_rated') return (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0)
      return 0
    })

  const allActive = products.filter((p: any) => p.is_active)
  const trulyFeatured = allActive.filter((p: any) => p.is_featured)
  const featured = trulyFeatured.length > 0 ? trulyFeatured.slice(0, 4) : allActive.slice(0, 4)

  const pendingFilterCount = activeProducts.filter((p: any) => {
    if (cat !== 'Все' && p.category !== cat) return false
    const price = Number(p.price)
    if (filterMinPrice && price < Number(filterMinPrice)) return false
    if (filterMaxPrice && price > Number(filterMaxPrice)) return false
    if (filterInStock && (p.stock === null || p.stock === undefined || p.stock === 0)) return false
    if (filterHasDiscount && !(p.compare_at_price && Number(p.compare_at_price) > price)) return false
    if (filterHasVideo && !p.video_url) return false
    // Pending attribute filters
    if (Object.keys(filterAttrs).length > 0) {
      for (const [k, selected] of Object.entries(filterAttrs)) {
        if (selected.length > 0) {
          const pVal = (p.attributes as Record<string, any> | null)?.[k] !== undefined
            ? String((p.attributes as Record<string, any>)[k])
            : null
          if (!pVal || !selected.includes(pVal)) return false
        }
      }
    }
    return true
  }).length

  const handleApplyFilter = () => {
    setActiveMinPrice(filterMinPrice)
    setActiveMaxPrice(filterMaxPrice)
    setActiveInStock(filterInStock)
    setActiveHasDiscount(filterHasDiscount)
    setActiveHasVideo(filterHasVideo)
    setActiveAttrs(filterAttrs)
    setShowFilter(false)
  }

  useTelegramMainButton({
    text: `Применить (${pendingFilterCount})`,
    onClick: handleApplyFilter,
    isVisible: showFilter,
  })

  // Live overlay search results
  const overlayResults = debouncedOverlay.trim()
    ? activeProducts
        .filter((p: any) =>
          p.name.toLowerCase().includes(debouncedOverlay.toLowerCase()) ||
          (p.description ?? '').toLowerCase().includes(debouncedOverlay.toLowerCase())
        )
        .slice(0, 20)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Full-screen search overlay */}
      {showSearchScreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={overlayInputRef}
                placeholder="Поиск товаров..."
                value={overlaySearch}
                onChange={e => setOverlaySearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && overlaySearch.trim()) {
                    saveSearch(overlaySearch.trim())
                    closeSearchOverlay(overlaySearch.trim())
                  }
                }}
                style={{
                  width: '100%', height: 44, paddingLeft: 38, paddingRight: overlaySearch ? 36 : 12,
                  borderRadius: 12, background: 'var(--card)',
                  border: '1px solid var(--border)', outline: 'none',
                  fontSize: 15, color: 'var(--ink)',
                  boxSizing: 'border-box',
                }}
              />
              {overlaySearch.length > 0 && (
                <button
                  onClick={() => setOverlaySearch('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'var(--subtle)', border: 'none', borderRadius: 999,
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--muted)', fontSize: 14, lineHeight: 1,
                  }}
                >×</button>
              )}
            </div>
            <button
              onClick={() => closeSearchOverlay()}
              style={{
                background: 'none', border: 'none', padding: '0 4px',
                fontSize: 15, fontWeight: 500, color: 'var(--accent)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Отмена
            </button>
          </div>

          {/* Overlay body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {overlaySearch.trim() === '' ? (
              /* Empty state: recent + trending */
              <div>
                {recentSearches.length > 0 && (
                  <div>
                    <div style={{
                      padding: '14px 16px 6px',
                      fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Недавние
                    </div>
                    {recentSearches.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          saveSearch(s)
                          closeSearchOverlay(s)
                        }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', background: 'none', border: 'none',
                          borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span style={{ flex: 1, fontSize: 15, color: 'var(--ink)' }}>{s}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            const updated = recentSearches.filter(r => r !== s)
                            setRecentSearches(updated)
                            try { localStorage.setItem('dokonly_recent_searches', JSON.stringify(updated)) } catch {}
                          }}
                          style={{
                            background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                            fontSize: 18, color: 'var(--muted)', lineHeight: 1,
                          }}
                        >×</button>
                      </button>
                    ))}
                  </div>
                )}
                {trendingSearches.length > 0 && (
                  <div>
                    <div style={{
                      padding: '14px 16px 6px',
                      fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Популярные
                    </div>
                    {trendingSearches.map((name, i) => (
                      <button
                        key={name}
                        onClick={() => {
                          saveSearch(name)
                          closeSearchOverlay(name)
                        }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', background: 'none', border: 'none',
                          borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: 999,
                          background: 'var(--accent-soft)', color: 'var(--accent)',
                          fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 15, color: 'var(--ink)' }}>{name}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : overlayResults.length === 0 ? (
              /* No results */
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)', fontSize: 15 }}>
                Ничего не найдено. Попробуйте другие слова.
              </div>
            ) : (
              /* Search results */
              <div>
                {overlayResults.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      saveSearch(overlaySearch.trim())
                      closeSearchOverlay(overlaySearch.trim())
                      onProduct(p.id)
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {p.images?.[0]
                      ? <img
                          src={p.images[0]} alt={p.name}
                          style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                        />
                      : <div style={{
                          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                          background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: 4,
                        }}>
                          {p.name.slice(0, 2)}
                        </div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 500, color: 'var(--ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{p.name}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                        {fmtPrice(Number(p.price), shop.currency)}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky top */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
          <div style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
            Каталог
          </div>
          <button
            onClick={() => setShowSort(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 999,
              background: sort !== 'newest' ? 'var(--accent-soft)' : 'var(--subtle)',
              border: `1px solid ${sort !== 'newest' ? 'var(--accent)' : 'var(--border)'}`,
              fontSize: 13, fontWeight: 500,
              color: sort !== 'newest' ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            {SORT_LABELS[sort]}
            <Icon name="chevronRight" size={12} color={sort !== 'newest' ? 'var(--accent)' : 'var(--muted)'}/>
          </button>
          {/* Filter button */}
          <button
            onClick={() => {
              setFilterMinPrice(activeMinPrice)
              setFilterMaxPrice(activeMaxPrice)
              setFilterInStock(activeInStock)
              setFilterHasDiscount(activeHasDiscount)
              setFilterHasVideo(activeHasVideo)
              setFilterAttrs(activeAttrs)
              setShowFilter(true)
            }}
            style={{
              position: 'relative',
              width: 36, height: 36, borderRadius: 10,
              background: hasActiveFilters ? 'var(--accent-soft)' : 'var(--subtle)',
              border: `1px solid ${hasActiveFilters ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={hasActiveFilters ? 'var(--accent)' : 'var(--ink)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            {hasActiveFilters && (
              <div style={{
                position: 'absolute', top: -3, right: -3,
                width: 10, height: 10, borderRadius: 999,
                background: 'var(--accent)', border: '1.5px solid var(--bg)',
              }}/>
            )}
          </button>
        </div>
      </div>

      {/* Sort bottom sheet */}
      {showSort && (
        <div
          onClick={() => setShowSort(false)}
          onTouchMove={e => e.preventDefault()}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '0 16px 32px' }}
          >
            <button onClick={() => setShowSort(false)} style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '12px 0 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </button>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 16 }}>
              Сортировка
            </div>
            {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
              <button
                key={opt}
                onClick={() => { setSort(opt); setShowSort(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '13px 16px', borderRadius: 12, marginBottom: 6,
                  background: sort === opt ? 'var(--accent-soft)' : 'var(--card)',
                  border: `1.5px solid ${sort === opt ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 15, fontWeight: sort === opt ? 700 : 500,
                  color: sort === opt ? 'var(--accent)' : 'var(--ink)',
                }}
              >
                {SORT_LABELS[opt]}
                {sort === opt && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="9" fill="var(--accent)"/>
                    <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bottom sheet */}
      {showFilter && (
        <div
          onClick={() => setShowFilter(false)}
          onTouchMove={e => e.preventDefault()}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0',
              padding: '0 16px 32px', maxHeight: '80vh', overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            <button onClick={() => setShowFilter(false)} style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '12px 0 8px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Фильтры</div>
              <button
                onClick={() => {
                  setFilterMinPrice(''); setFilterMaxPrice('')
                  setFilterInStock(false); setFilterHasDiscount(false); setFilterHasVideo(false)
                  setFilterAttrs({})
                }}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Сбросить
              </button>
            </div>

            {/* Price range dual-slider */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-strong)', marginBottom: 10 }}>Цена</div>
              {/* Value labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {fmtPrice(sliderMin, shop.currency)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {sliderMax === priceMax ? '∞' : fmtPrice(sliderMax, shop.currency)}
                </span>
              </div>
              {/* Dual slider track */}
              <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
                {/* Track background */}
                <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                {/* Active track */}
                <div style={{
                  position: 'absolute', height: 4, borderRadius: 2, background: 'var(--accent)',
                  left: `${((sliderMin - priceMin) / Math.max(1, priceMax - priceMin)) * 100}%`,
                  right: `${100 - ((sliderMax - priceMin) / Math.max(1, priceMax - priceMin)) * 100}%`,
                }} />
                {/* Min range input */}
                <input
                  type="range"
                  min={priceMin}
                  max={priceMax}
                  value={sliderMin}
                  onChange={e => {
                    const v = Number(e.target.value)
                    if (v <= sliderMax) setFilterMinPrice(v === priceMin ? '' : String(v))
                  }}
                  style={{
                    position: 'absolute', width: '100%', height: 4,
                    appearance: 'none', background: 'transparent', outline: 'none', cursor: 'pointer',
                    pointerEvents: sliderMin > sliderMax - (priceMax - priceMin) * 0.05 ? 'none' : 'auto',
                  }}
                />
                {/* Max range input */}
                <input
                  type="range"
                  min={priceMin}
                  max={priceMax}
                  value={sliderMax}
                  onChange={e => {
                    const v = Number(e.target.value)
                    if (v >= sliderMin) setFilterMaxPrice(v === priceMax ? '' : String(v))
                  }}
                  style={{
                    position: 'absolute', width: '100%', height: 4,
                    appearance: 'none', background: 'transparent', outline: 'none', cursor: 'pointer',
                  }}
                />
              </div>
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
                  background: var(--accent); border: 2px solid white;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer;
                }
                input[type=range]::-moz-range-thumb {
                  width: 20px; height: 20px; border-radius: 50%;
                  background: var(--accent); border: 2px solid white;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer;
                }
              `}</style>
            </div>

            {/* Toggles */}
            {[
              { label: 'Только в наличии', value: filterInStock, set: setFilterInStock },
              { label: 'Со скидкой', value: filterHasDiscount, set: setFilterHasDiscount },
              { label: 'Есть видео 🎬', value: filterHasVideo, set: setFilterHasVideo },
            ].map(({ label, value, set }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
                <button
                  onClick={() => set(!value)}
                  style={{
                    width: 48, height: 28, borderRadius: 999,
                    background: value ? 'var(--accent)' : 'var(--border)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, width: 22, height: 22,
                    borderRadius: 999, background: 'white',
                    left: value ? 23 : 3, transition: 'left 0.2s',
                  }}/>
                </button>
              </div>
            ))}

            {/* Dynamic attribute filters */}
            {filterableAttrs.map(([attrKey, attrVals]) => (
              <div key={attrKey} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-strong)', marginBottom: 8, textTransform: 'capitalize' }}>
                  {attrKey}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {attrVals.map(val => {
                    const isSelected = (filterAttrs[attrKey] ?? []).includes(val)
                    return (
                      <button
                        key={val}
                        onClick={() => {
                          const current = filterAttrs[attrKey] ?? []
                          const next = isSelected
                            ? current.filter(x => x !== val)
                            : [...current, val]
                          setFilterAttrs(prev => ({ ...prev, [attrKey]: next }))
                        }}
                        style={{
                          padding: '6px 14px', borderRadius: 999,
                          background: isSelected ? 'var(--accent)' : 'var(--subtle)',
                          color: isSelected ? 'white' : 'var(--ink)',
                          border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          fontSize: 13, fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                        }}
                      >
                        {val}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Apply */}
            <button
              onClick={handleApplyFilter}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 15, marginTop: 8,
              }}
            >
              Применить ({pendingFilterCount})
            </button>
          </div>
        </div>
      )}

      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24 }}>
        {/* Search */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={18} color="var(--muted)" style={{ position: 'absolute', left: 14, top: 15 }}/>
            <input
              placeholder="Поиск товаров"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => {
                setShowSearchScreen(true)
                setOverlaySearch(search)
              }}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={e => {
                if (e.key === 'Enter' && search.trim()) {
                  const trimmed = search.trim()
                  const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5)
                  setRecentSearches(updated)
                  try { localStorage.setItem('dokonly_recent_searches', JSON.stringify(updated)) } catch {}
                  setSearchFocused(false)
                }
              }}
              style={{
                width: '100%', height: 48, paddingLeft: 42, paddingRight: 14,
                borderRadius: 12, background: 'var(--card)',
                border: '1px solid var(--border)', outline: 'none',
                fontSize: 15, color: 'var(--ink)',
              }}
            />
          </div>
          {/* Recent searches dropdown */}
          {searchFocused && !search && recentSearches.length > 0 && (
            <div style={{
              marginTop: 4, borderRadius: 12,
              background: 'var(--card)', border: '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Недавние
              </div>
              {recentSearches.map(s => (
                <button
                  key={s}
                  onClick={() => { setSearch(s); setSearchFocused(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
                    borderTop: '1px solid var(--border)',
                    textAlign: 'left',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{s}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      const updated = recentSearches.filter(r => r !== s)
                      setRecentSearches(updated)
                      try { localStorage.setItem('dokonly_recent_searches', JSON.stringify(updated)) } catch {}
                    }}
                    style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', fontSize: 16, color: 'var(--muted)' }}
                  >×</button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', flexWrap: 'wrap' }}>
            {activeMinPrice && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                от {activeMinPrice}
                <button onClick={() => setActiveMinPrice('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {activeMaxPrice && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                до {activeMaxPrice}
                <button onClick={() => setActiveMaxPrice('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {activeInStock && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                В наличии
                <button onClick={() => setActiveInStock(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {activeHasDiscount && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                Со скидкой
                <button onClick={() => setActiveHasDiscount(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {activeHasVideo && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                Есть видео 🎬
                <button onClick={() => setActiveHasVideo(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {/* Active attribute filter chips */}
            {Object.entries(activeAttrs).flatMap(([k, vals]) =>
              vals.map(val => (
                <span
                  key={`${k}:${val}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}
                >
                  {val}
                  <button
                    onClick={() => {
                      const updated = { ...activeAttrs, [k]: activeAttrs[k].filter(v => v !== val) }
                      setActiveAttrs(updated)
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >×</button>
                </span>
              ))
            )}
          </div>
        )}

        {/* Categories */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 16px', overflowX: 'auto' }}>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 999,
                  background: cat === c ? 'var(--ink)' : 'var(--subtle)',
                  color: cat === c ? 'var(--bg)' : 'var(--ink)',
                  fontSize: 13, fontWeight: 500,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  border: '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {c}
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: cat === c ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                  borderRadius: 999, padding: '1px 5px',
                  color: cat === c ? 'var(--bg)' : 'var(--muted)',
                }}>
                  {catCounts[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Featured strip */}
        {cat === 'Все' && !search && featured.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px 10px' }}>
              <Icon name="starFilled" size={14} color="var(--warning)"/>
              <span style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Хиты</span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }}>
              {featured.map((p: any) => (
                <button key={p.id} onClick={() => onProduct(p.id)} style={{ flexShrink: 0, width: 148, textAlign: 'left' }}>
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} style={{ width: 148, height: 148, borderRadius: 12, objectFit: 'cover' }}/>
                    : <div className="img-ph" data-tone={tone(p.name)} style={{ width: 148, height: 148 }}><span>{p.name.split(' ').slice(0,2).join(' ')}</span></div>
                  }
                  <div style={{ padding: '8px 2px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>
                      {fmtPrice(Number(p.price), shop.currency)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product grid */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)', margin: 0 }}>
              {cat === 'Все' ? 'Все товары' : cat}
            </h3>
            {!isLoading && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {visible.length} {visible.length === 1 ? 'товар' : visible.length < 5 ? 'товара' : 'товаров'}
              </span>
            )}
          </div>
          {isLoading ? (
            <>
              <style>{`
                @keyframes shimmer { 0%,100%{opacity:.45} 50%{opacity:.85} }
                .sk{animation:shimmer 1.4s ease-in-out infinite;background:var(--subtle);border-radius:12px}
              `}</style>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <div className="sk" style={{ width: '100%', aspectRatio: '1/1', animationDelay: `${i * 0.1}s` }}/>
                    <div style={{ padding: '8px 2px 0' }}>
                      <div className="sk" style={{ height: 13, width: '80%', marginBottom: 6, animationDelay: `${i * 0.1 + 0.05}s` }}/>
                      <div className="sk" style={{ height: 13, width: '55%', animationDelay: `${i * 0.1 + 0.1}s` }}/>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              {search ? 'Ничего не найдено' : 'Товары появятся скоро'}
            </div>
          ) : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {visible.slice(0, visibleCount).map((p: any) => {
                const inWishlist = wishlistIds.includes(p.id)
                return (
                  <div key={p.id} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onProduct(p.id)}>
                    <div style={{ position: 'relative' }}>
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', aspectRatio: '1/1', borderRadius: 12, objectFit: 'cover' }}/>
                        : <div className="img-ph" data-tone={tone(p.name)}><span>{p.name.split(' ').slice(0,2).join(' ')}</span></div>
                      }
                      {p.stock === 0 && (
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 12,
                          background: 'rgba(0,0,0,0.45)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 600, fontSize: 12,
                        }}>Нет в наличии</div>
                      )}
                      {/* Discount badge */}
                      {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                        <div style={{
                          position: 'absolute', top: 6, left: 6,
                          background: 'var(--accent)', color: 'white',
                          borderRadius: 6, fontSize: 11, fontWeight: 700,
                          padding: '2px 6px',
                        }}>
                          -{Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)}%
                        </div>
                      )}
                      {/* Low stock badge */}
                      {p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5 && p.stock !== 0 && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6,
                          background: 'rgba(217,119,6,0.9)', color: 'white',
                          borderRadius: 6, fontSize: 10, fontWeight: 700,
                          padding: '2px 6px',
                        }}>
                          ⚡ Мало
                        </div>
                      )}
                      {/* Video badge */}
                      {p.video_url && !p.compare_at_price && (
                        <div style={{
                          position: 'absolute', top: 6, left: 6,
                          background: 'rgba(0,0,0,0.55)', color: 'white',
                          borderRadius: 6, fontSize: 11, fontWeight: 700,
                          padding: '2px 6px',
                        }}>
                          🎬
                        </div>
                      )}
                      {/* Wishlist heart */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleWishlist(p.id) }}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 30, height: 30, borderRadius: 999,
                          background: 'rgba(255,255,255,0.92)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill={inWishlist ? 'var(--accent)' : 'none'} stroke={inWishlist ? 'var(--accent)' : 'var(--muted)'} strokeWidth="1.5">
                          <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.8a3.5 3.5 0 0 1 6.5 1.7C14.5 9.5 8 13.5 8 13.5z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    <div style={{ padding: '8px 2px 0' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4, height: 34, overflow: 'hidden' }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: p.compare_at_price ? 'var(--accent)' : 'var(--ink)' }}>
                            {fmtPrice(Number(p.price), shop.currency)}
                          </span>
                          {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)', textDecoration: 'line-through' }}>
                              {fmtPrice(Number(p.compare_at_price), shop.currency)}
                            </div>
                          )}
                        </div>
                        {/* Quick-add button for products without variants */}
                        {(!p.sizes?.length && !p.colors?.length) && p.stock !== 0 && (
                          <button
                            onClick={e => handleQuickAdd(e, p)}
                            style={{
                              width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                              background: justAdded === p.id ? 'var(--accent)' : 'var(--subtle)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.2s, transform 0.15s',
                              transform: justAdded === p.id ? 'scale(0.9)' : 'scale(1)',
                            }}
                          >
                            {justAdded === p.id
                              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <Icon name="plus" size={14} color="var(--ink)"/>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Sentinel for infinite scroll */}
            {visibleCount < visible.length && (
              <div ref={sentinelRef} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Legacy alias kept for any other imports
export { CatalogContent as Storefront }
