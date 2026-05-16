import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/Icon'
import { api } from '@/lib/api'
import { useCart } from '@/store/cart'

interface ShopData {
  id: string
  name: string
  currency: string
  logo_url: string | null
  cover_url?: string | null
  accent_color?: string
  typography_bundle?: string
  description?: string | null
  contact_info?: {
    phone?: string
    telegram?: string
    instagram?: string
    address?: string
  }
  settings?: any
}

interface Props {
  shop: ShopData
  tenantId: string
  products: any[]
  onProduct: (id: string) => void
  onShowCatalog: (category?: string) => void
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

export function HomeTab({ shop, tenantId, products, onProduct, onShowCatalog }: Props) {
  const qc = useQueryClient()
  const addToCart = useCart(s => s.add)
  const activeProducts = products.filter((p: any) => p.is_active)
  const featuredProducts = activeProducts.filter((p: any) => p.is_featured)
  const featured = (featuredProducts.length > 0 ? featuredProducts : activeProducts).slice(0, 5)
  const preview = activeProducts.slice(0, 4)

  const uniqueCats = Array.from(new Set(activeProducts.map((p: any) => p.category).filter(Boolean))) as string[]
  const catCounts: Record<string, number> = {}
  for (const c of uniqueCats) catCounts[c] = activeProducts.filter((p: any) => p.category === c).length

  const hasCover = !!shop.cover_url

  const [carouselIdx, setCarouselIdx] = useState(0)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const recentlyViewedIds: string[] = JSON.parse(
    localStorage.getItem(`dokonly_viewed_${tenantId}`) ?? '[]'
  ).slice(0, 8)
  const recentlyViewed = recentlyViewedIds
    .map(id => activeProducts.find((p: any) => p.id === id))
    .filter(Boolean) as any[]

  const handleViewProduct = (id: string) => {
    const key = `dokonly_viewed_${tenantId}`
    const prev: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const next = [id, ...prev.filter(x => x !== id)].slice(0, 20)
    localStorage.setItem(key, JSON.stringify(next))
    onProduct(id)
  }

  const handleQuickAdd = (e: React.MouseEvent, p: any) => {
    e.stopPropagation()
    addToCart({ productId: p.id, name: p.name, price: Number(p.price), imageUrl: p.images?.[0], tone: tone(p.name) })
    ;(window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')
    setJustAdded(p.id)
    setTimeout(() => setJustAdded(null), 1200)
  }

  const { data: stories = [] } = useQuery({
    queryKey: ['shop-stories', tenantId],
    queryFn: () => api.getStories(tenantId),
    staleTime: 5 * 60 * 1000,
  })
  const [activeStory, setActiveStory] = useState<any | null>(null)
  const [storyProgress, setStoryProgress] = useState(0)

  useEffect(() => {
    if (!activeStory) return
    setStoryProgress(0)
    const interval = setInterval(() => {
      setStoryProgress(p => {
        if (p >= 100) {
          const idx = (stories as any[]).findIndex((s: any) => s.id === activeStory.id)
          if (idx < (stories as any[]).length - 1) {
            setActiveStory((stories as any[])[idx + 1])
          } else {
            setActiveStory(null)
          }
          return 0
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [activeStory, stories])

  const { data: shopStats } = useQuery({
    queryKey: ['shopStats', tenantId],
    queryFn: () => api.getShopStats(tenantId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: wishlistIds = [] } = useQuery<string[]>({
    queryKey: ['wishlist', tenantId],
    queryFn: () => api.getWishlist(tenantId),
  })

  const { mutate: toggleWishlist } = useMutation({
    mutationFn: (productId: string) => api.toggleWishlist(tenantId, productId),
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: ['wishlist', tenantId] })
      const prev = qc.getQueryData<string[]>(['wishlist', tenantId]) ?? []
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
      qc.setQueryData(['wishlist', tenantId], next)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['wishlist', tenantId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['wishlist', tenantId] }),
  })

  useEffect(() => {
    if (featured.length <= 1) return
    const t = setInterval(() => setCarouselIdx(i => (i + 1) % featured.length), 5000)
    return () => clearInterval(t)
  }, [featured.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24 }}>

        {/* Hero */}
        <div style={{
          height: 200,
          position: 'relative',
          overflow: 'hidden',
          background: hasCover
            ? 'var(--subtle)'
            : 'linear-gradient(135deg, var(--accent) 0%, var(--accent) 100%)',
        }}>
          {hasCover ? (
            <>
              <img
                src={shop.cover_url!}
                alt={shop.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
              }}/>
            </>
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, var(--accent) 0%, rgba(0,0,0,0.15) 100%)',
              opacity: 0.88,
            }}/>
          )}

          {/* Bottom row: logo + store name */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16, right: 16,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {shop.logo_url && (
              <img
                src={shop.logo_url}
                alt={shop.name}
                style={{
                  width: 48, height: 48, borderRadius: 999,
                  objectFit: 'cover', flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.5)',
                }}
              />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  fontFamily: 'Sora', fontWeight: 700, fontSize: 22,
                  color: 'white',
                  textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  letterSpacing: '-0.02em',
                }}>
                  {shop.name}
                </div>
                {(shop as any).is_verified && (
                  <div title="Проверенный магазин" style={{
                    width: 20, height: 20, borderRadius: 999,
                    background: '#1DA1F2', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              {(shopStats?.avg_rating != null || (shopStats?.customer_count ?? 0) >= 10) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                  {shopStats?.avg_rating != null && (
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                      ⭐ {shopStats.avg_rating} ({shopStats.review_count})
                    </span>
                  )}
                  {(shopStats?.customer_count ?? 0) >= 10 && (
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                      👥 {shopStats!.customer_count}+ покупателей
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search shortcut */}
        <div style={{ padding: '14px 16px 0' }}>
          <button
            onClick={() => onShowCatalog()}
            style={{
              width: '100%', height: 46, borderRadius: 12,
              background: 'var(--card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
              paddingLeft: 14, paddingRight: 14,
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--muted)', textAlign: 'left' }}>Поиск товаров</span>
          </button>
        </div>

        {/* Stories carousel */}
        {(stories as any[]).length > 0 && (
          <div style={{ padding: '12px 16px 0', display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {(stories as any[]).map((s: any) => (
              <button
                key={s.id}
                onClick={() => setActiveStory(s)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{
                  width: 60, height: 60, borderRadius: 999,
                  padding: 2,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #005c40 100%)',
                  flexShrink: 0,
                }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', border: '2px solid var(--bg)', background: 'var(--subtle)' }}>
                    {s.media_url
                      ? <img src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎬</div>
                    }
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 500, maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.caption?.split(' ').slice(0, 2).join(' ') || 'Story'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Categories chips */}
        {uniqueCats.length > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {uniqueCats.map(c => (
              <button
                key={c}
                onClick={() => onShowCatalog(c)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 999,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {c}
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(0,0,0,0.06)',
                  borderRadius: 999, padding: '1px 5px', color: 'var(--muted)',
                }}>
                  {catCounts[c]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Store info: description + contact buttons */}
        {(shop.description || shop.contact_info?.phone || shop.contact_info?.telegram || shop.contact_info?.instagram || shop.contact_info?.address) && (
          <div style={{ padding: '16px 16px 0' }}>
            {shop.description && (
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
                {shop.description}
              </p>
            )}
            {(shop.contact_info?.phone || shop.contact_info?.telegram || shop.contact_info?.instagram || shop.contact_info?.address) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {shop.contact_info?.phone && (
                  <a
                    href={`tel:${shop.contact_info.phone}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 999,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                      textDecoration: 'none',
                    }}
                  >
                    📞 Позвонить
                  </a>
                )}
                {shop.contact_info?.telegram && (
                  <button
                    onClick={() => {
                      const handle = (shop.contact_info?.telegram ?? '').replace('@', '')
                      const url = `https://t.me/${handle}`;
                      (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, '_blank')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 999,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                    }}
                  >
                    💬 Написать
                  </button>
                )}
                {shop.contact_info?.instagram && (
                  <button
                    onClick={() => {
                      const handle = (shop.contact_info?.instagram ?? '').replace('@', '')
                      window.open(`https://instagram.com/${handle}`, '_blank')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 999,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                    }}
                  >
                    📷 Instagram
                  </button>
                )}
                {shop.contact_info?.address && (
                  <button
                    onClick={() => {
                      const encoded = encodeURIComponent(shop.contact_info?.address ?? '')
                      window.open(`https://maps.google.com/?q=${encoded}`, '_blank')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 999,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                    }}
                  >
                    📍 Адрес
                  </button>
                )}
                {(shop.contact_info as any)?.email && (
                  <a
                    href={`mailto:${(shop.contact_info as any).email}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 999,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                      textDecoration: 'none',
                    }}
                  >
                    ✉ Email
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Featured carousel */}
        {featured.length > 0 && (
          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="starFilled" size={14} color="var(--warning)"/>
                <span style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>Хиты продаж</span>
              </div>
              {featured.length > 1 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {featured.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIdx(i)}
                      style={{
                        width: i === carouselIdx ? 16 : 6, height: 6, borderRadius: 3,
                        background: i === carouselIdx ? 'var(--accent)' : 'var(--border)',
                        transition: 'width 0.3s, background 0.3s', padding: 0, border: 'none', cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Carousel card */}
            <div style={{ padding: '0 16px' }}>
              {(() => {
                const p = featured[carouselIdx]
                if (!p) return null
                const hasDiscount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
                return (
                  <button
                    key={p.id}
                    onClick={() => handleViewProduct(p.id)}
                    style={{
                      width: '100%', borderRadius: 16, overflow: 'hidden', textAlign: 'left',
                      background: 'var(--card)', border: '1px solid var(--border)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      position: 'relative',
                    }}
                  >
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div
                        className="img-ph"
                        data-tone={tone(p.name)}
                        style={{ width: '100%', height: 200 }}
                      >
                        <span>{p.name.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: 120,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
                    }}/>
                    {/* Discount badge */}
                    {hasDiscount && (
                      <div style={{
                        position: 'absolute', top: 12, left: 12,
                        background: 'var(--accent)', color: 'white',
                        borderRadius: 8, fontSize: 12, fontWeight: 700,
                        padding: '3px 8px',
                      }}>
                        -{Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)}%
                      </div>
                    )}
                    {p.is_featured && (
                      <div style={{
                        position: 'absolute', top: 12, right: 12,
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                        borderRadius: 8, padding: '3px 8px', fontSize: 12, fontWeight: 700, color: 'white',
                      }}>⭐ Хит</div>
                    )}
                    {/* Info overlay */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 14px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'white' }}>
                          {fmtPrice(Number(p.price), shop.currency)}
                        </span>
                        {hasDiscount && (
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'line-through' }}>
                            {fmtPrice(Number(p.compare_at_price), shop.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })()}
            </div>
          </div>
        )}

        {/* Quick product grid preview */}
        {preview.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)', margin: 0 }}>
                Товары
              </h3>
              <button
                onClick={() => onShowCatalog()}
                style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Все <Icon name="chevronRight" size={14} color="var(--accent)"/>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {preview.map((p: any) => {
                const inWishlist = wishlistIds.includes(p.id)
                return (
                <button key={p.id} onClick={() => handleViewProduct(p.id)} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
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
                    {p.video_url && (
                      <div style={{
                        position: 'absolute', top: 6, left: 6,
                        background: 'rgba(0,0,0,0.55)', borderRadius: 6,
                        padding: '2px 6px', fontSize: 12,
                      }}>🎬</div>
                    )}
                  </div>
                  <div style={{ padding: '8px 2px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4, height: 34, overflow: 'hidden' }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                        {fmtPrice(Number(p.price), shop.currency)}
                      </div>
                      {!p.sizes?.length && !p.colors?.length && p.stock !== 0 && (
                        <button
                          onClick={e => handleQuickAdd(e, p)}
                          style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
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
                </button>
              )})}
            </div>

            {activeProducts.length > 4 && (
              <button
                onClick={() => onShowCatalog()}
                style={{
                  width: '100%', height: 46, marginTop: 16, borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--card)',
                  color: 'var(--ink)', fontSize: 14, fontWeight: 600,
                }}
              >
                Смотреть все товары ({activeProducts.length})
              </button>
            )}
          </div>
        )}

        {activeProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🛍</div>
            <p style={{ fontSize: 14 }}>Товары появятся скоро</p>
          </div>
        )}

        {/* Trust strip */}
        {shop.settings?.show_trust_strip !== false && activeProducts.length > 0 && (() => {
          const strips: { icon: string; text: string }[] = []
          const si = shop.contact_info as any
          const ss = shop.settings as any
          const stats = shopStats as any
          if (si?.address) strips.push({ icon: '📍', text: si.address })
          if (stats?.review_count > 0) strips.push({ icon: '⭐', text: `${stats.avg_rating ?? '5.0'} (${stats.review_count} отзывов)` })
          if (ss?.delivery_methods?.some((m: any) => m.id === 'delivery' && m.enabled))
            strips.push({ icon: '🚚', text: 'Есть доставка' })
          if (ss?.return_policy) strips.push({ icon: '↩', text: 'Возврат принимается' })
          if (strips.length === 0) return null
          return (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', overflowX: 'auto', gap: 8, scrollbarWidth: 'none' }}>
                {strips.map((s, i) => (
                  <div key={i} style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 999,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap',
                  }}>
                    <span>{s.icon}</span>
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Recently viewed */}
        {recentlyViewed.length > 0 && (
          <div style={{ padding: '0 16px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
              Недавно просматривали
            </div>
            <div style={{ display: 'flex', overflowX: 'auto', gap: 10, scrollbarWidth: 'none', paddingBottom: 4 }}>
              {recentlyViewed.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => handleViewProduct(p.id)}
                  style={{
                    flexShrink: 0, width: 120, background: 'var(--card)',
                    border: '1px solid var(--border)', borderRadius: 12,
                    overflow: 'hidden', textAlign: 'left',
                  }}
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: 90, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      🛍
                    </div>
                  )}
                  <div style={{ padding: '8px 8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                      {fmtPrice(Number(p.price), shop.currency)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Story viewer overlay */}
      {activeStory && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', flexDirection: 'column' }}
          onClick={() => setActiveStory(null)}
        >
          {/* Progress bars */}
          <div style={{ display: 'flex', gap: 3, padding: '12px 12px 8px', zIndex: 10 }}>
            {(stories as any[]).map((s: any) => (
              <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999, background: 'white',
                  width: s.id === activeStory.id ? `${storyProgress}%` : (stories as any[]).indexOf(s) < (stories as any[]).findIndex((x: any) => x.id === activeStory.id) ? '100%' : '0%',
                  transition: s.id === activeStory.id ? 'width 0.1s linear' : 'none',
                }} />
              </div>
            ))}
          </div>
          {/* Media */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeStory.media_url
              ? <img src={activeStory.media_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <div style={{ fontSize: 60 }}>🎬</div>
            }
          </div>
          {/* Caption + CTA */}
          {(activeStory.caption || activeStory.cta_text) && (
            <div style={{ padding: '16px 20px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }} onClick={e => e.stopPropagation()}>
              {activeStory.caption && (
                <p style={{ fontSize: 16, color: 'white', lineHeight: 1.5, marginBottom: activeStory.cta_text ? 12 : 0 }}>{activeStory.caption}</p>
              )}
              {activeStory.cta_text && (
                <button
                  onClick={() => activeStory.cta_url && window.open(activeStory.cta_url, '_blank')}
                  style={{ padding: '10px 24px', borderRadius: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 14 }}
                >{activeStory.cta_text}</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
