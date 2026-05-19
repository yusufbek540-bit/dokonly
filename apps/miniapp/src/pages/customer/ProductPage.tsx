import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCart } from '@/store/cart'
import { Icon } from '@/components/Icon'
import { useTelegramMainButton } from '@/hooks/useTelegram'

interface Props {
  tenantId: string
  productId: string
  currency: string
  shopSlug?: string
  botUsername?: string
  onBack: () => void
  onCheckout: () => void
  onProduct?: (id: string) => void
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

export function ProductPage({ tenantId, productId, currency, shopSlug, botUsername, onBack, onCheckout, onProduct }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const galleryTouchStart = useRef<number | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reviewSort, setReviewSort] = useState<'recent' | 'highest' | 'lowest'>('recent')
  const [showImageViewer, setShowImageViewer] = useState(false)

  const add = useCart((s) => s.add)
  const cartCount = useCart((s) => s.count)()
  const qc = useQueryClient()

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist', tenantId],
    queryFn: () => api.getWishlist(tenantId),
    retry: false,
  })

  const { mutate: toggleWishlist } = useMutation({
    mutationFn: (pid: string) => api.toggleWishlist(tenantId, pid),
    onMutate: async (pid: string) => {
      await qc.cancelQueries({ queryKey: ['wishlist', tenantId] })
      const prev = qc.getQueryData<string[]>(['wishlist', tenantId]) ?? []
      const next = prev.includes(pid)
        ? prev.filter(id => id !== pid)
        : [...prev, pid]
      qc.setQueryData(['wishlist', tenantId], next)
      return { prev }
    },
    onError: (_e: any, _v: any, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['wishlist', tenantId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['wishlist', tenantId] })
    },
  })

  const inWishlist = wishlistIds.includes(productId)

  const [showAllReviews, setShowAllReviews] = useState(false)

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: () => api.getProducts(tenantId),
  })

  const { data: reviewData } = useQuery({
    queryKey: ['product-reviews', tenantId, productId],
    queryFn: () => api.getProductReviews(tenantId, productId),
    retry: false,
  })

  const { data: recommendations = [] } = useQuery({
    queryKey: ['product-recommendations', tenantId, productId],
    queryFn: () => api.getRecommendations(tenantId, productId),
    retry: false,
    enabled: !!tenantId && !!productId,
  })

  const product = (allProducts as any[]).find(p => p.id === productId)
  const isAvailable = !!product && product.stock > 0
  const totalPrice = product ? Number(product.price) * qty : 0
  const t = product ? tone(product.name) : 0

  const handleAddToCart = () => {
    if (!product) return
    add({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      qty,
      size: selectedSize ?? undefined,
      color: selectedColor ?? undefined,
      tone: t,
      imageUrl: product.images?.[0] ?? undefined,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 3000)
  }

  useTelegramMainButton({
    text: added ? 'Добавлено ✓  В корзину' : `В корзину · ${fmtPrice(totalPrice, currency)}`,
    onClick: added ? onCheckout : handleAddToCart,
    isVisible: isAvailable,
    color: added ? '#059669' : null,
  })

  const clientSideSimilar = (allProducts as any[])
    .filter(p => p.id !== productId && p.is_active && p.category && p.category === product?.category)
    .slice(0, 4)
  const similar = (recommendations as any[]).length > 0 ? (recommendations as any[]) : clientSideSimilar

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!product) return null

  const images: string[] = product.images ?? []
  const sizes: string[] = product.sizes ?? []
  const colors: string[] = product.colors ?? []

  const productUrl = botUsername
    ? `https://t.me/${botUsername}/store?startapp=p_${productId}`
    : shopSlug
      ? `https://t.me/${shopSlug}bot/store?startapp=p_${productId}`
      : window.location.href

  const handleShare = () => {
    api.createShareIntent(tenantId, productId).catch(() => {})
    setShowShare(true)
  }

  const handleTelegramShare = () => {
    const tg = (window as any).Telegram?.WebApp
    if (botUsername && tg?.switchInlineQuery) {
      tg.switchInlineQuery(`${productId}`, ['users', 'groups', 'channels'])
    } else if (tg?.openLink) {
      tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(product.name)}`)
    }
    setShowShare(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(productUrl).then(() => {
      setCopied(true)
      setTimeout(() => { setCopied(false); setShowShare(false) }, 1200)
    })
  }

  const handleStoryShare = () => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.shareToStory) {
      tg.shareToStory(product.images?.[0] ?? '', { widget_link: { url: productUrl, name: product.name } })
    }
    setShowShare(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
      }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowLeft" size={18}/>
        </button>
        <div style={{ flex: 1, fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </div>
        {cartCount > 0 && (
          <button onClick={onCheckout} style={{ position: 'relative', width: 36, height: 36, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cart" size={18}/>
            <span style={{
              position: 'absolute', top: 2, right: 2,
              width: 16, height: 16, borderRadius: 999,
              background: 'var(--accent)', color: 'white',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{cartCount}</span>
          </button>
        )}
      </div>

      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 80 }}>
        {/* Image gallery */}
        <div
          style={{ position: 'relative', background: 'var(--subtle)' }}
          onTouchStart={e => { galleryTouchStart.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (galleryTouchStart.current === null || images.length <= 1) return
            const dx = e.changedTouches[0].clientX - galleryTouchStart.current
            if (Math.abs(dx) > 40) {
              if (dx < 0) setImgIdx(i => Math.min(i + 1, images.length - 1))
              else setImgIdx(i => Math.max(i - 1, 0))
            }
            galleryTouchStart.current = null
          }}
        >
          {images.length > 0 ? (
            <img
              src={images[imgIdx]}
              alt={product.name}
              onClick={() => setShowImageViewer(true)}
              style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
            />
          ) : (
            <div className="img-ph" data-tone={t} style={{ width: '100%', borderRadius: 0, fontSize: 16 }}>
              <span>{product.name.split(' ').slice(0, 2).join(' ')}</span>
            </div>
          )}
          {/* Share + Wishlist overlay — top-right of gallery */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
            <button
              onClick={handleShare}
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            <button
              onClick={() => {
                toggleWishlist(productId)
                ;(window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')
              }}
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill={inWishlist ? 'var(--accent)' : 'none'} stroke={inWishlist ? 'var(--accent)' : 'var(--ink)'} strokeWidth="1.5">
                <path d="M9 15.5S1.5 11 1.5 6A4 4 0 0 1 9 4.3 4 4 0 0 1 16.5 6C16.5 11 9 15.5 9 15.5z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {product.stock === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 16,
            }}>Нет в наличии</div>
          )}
          {images.length > 1 && (
            <>
              <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                {images.map((_: string, i: number) => (
                  <button key={i} onClick={() => setImgIdx(i)} style={{
                    width: i === imgIdx ? 20 : 6, height: 6, borderRadius: 999,
                    background: i === imgIdx ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s',
                  }}/>
                ))}
              </div>
              {imgIdx > 0 && (
                <button onClick={() => setImgIdx(i => i - 1)} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: 999,
                  background: 'rgba(255,255,255,0.85)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="arrowLeft" size={16}/>
                </button>
              )}
              {imgIdx < images.length - 1 && (
                <button onClick={() => setImgIdx(i => i + 1)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: 999,
                  background: 'rgba(255,255,255,0.85)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="arrowRight" size={16}/>
                </button>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', lineHeight: 1.25, flex: 1 }}>
              {product.name}
            </h1>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 18, color: product.compare_at_price ? 'var(--accent)' : 'var(--ink)' }}>
                {fmtPrice(Number(product.price), currency)}
              </div>
              {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--muted)', textDecoration: 'line-through' }}>
                  {fmtPrice(Number(product.compare_at_price), currency)}
                </div>
              )}
            </div>
          </div>
          {/* Rating badge */}
          {reviewData && reviewData.count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                {reviewData.avg_rating}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                ({reviewData.count} {reviewData.count === 1 ? 'отзыв' : reviewData.count < 5 ? 'отзыва' : 'отзывов'})
              </span>
            </div>
          )}
          {product.category && (
            <span style={{
              display: 'inline-block', marginTop: 6,
              padding: '3px 10px', borderRadius: 999,
              background: 'var(--subtle)', fontSize: 12, color: 'var(--muted)',
            }}>{product.category}</span>
          )}
        </div>

        {/* Sizes */}
        {sizes.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', marginBottom: 8 }}>Размер</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sizes.map((s: string) => (
                <button key={s} onClick={() => setSelectedSize(s === selectedSize ? null : s)} style={{
                  minWidth: 44, height: 40, borderRadius: 10,
                  border: `1.5px solid ${s === selectedSize ? 'var(--ink)' : 'var(--border)'}`,
                  background: s === selectedSize ? 'var(--ink)' : 'transparent',
                  color: s === selectedSize ? 'var(--bg)' : 'var(--ink)',
                  fontSize: 14, fontWeight: 600,
                  padding: '0 12px',
                  transition: 'all 0.15s',
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Colors */}
        {colors.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', marginBottom: 8 }}>Цвет</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {colors.map((c: string) => (
                <button key={c} onClick={() => setSelectedColor(c === selectedColor ? null : c)} style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: c,
                  border: c === selectedColor ? '2.5px solid var(--ink)' : '2px solid var(--border)',
                  outline: c === selectedColor ? '2px solid var(--bg)' : 'none',
                  outlineOffset: -4,
                  transition: 'all 0.15s',
                }}/>
              ))}
            </div>
          </div>
        )}

        {/* Qty */}
        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)' }}>Количество</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--subtle)', borderRadius: 12 }}>
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="minus" size={16}/>
            </button>
            <span style={{ minWidth: 28, textAlign: 'center', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15 }}>{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="plus" size={16}/>
            </button>
          </div>
        </div>

        {/* Video */}
        {product.video_url && (
          <div style={{ padding: '16px 16px 0' }}>
            <video
              src={product.video_url}
              controls
              playsInline
              style={{ width: '100%', borderRadius: 12, maxHeight: 300, background: '#000' }}
            />
          </div>
        )}

        {/* Description */}
        {product.description && (() => {
          const isLong = product.description.length > 200
          return (
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', marginBottom: 6 }}>Описание</div>
              <p style={{
                fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: 0,
                overflow: isLong && !descExpanded ? 'hidden' : 'visible',
                display: isLong && !descExpanded ? '-webkit-box' : 'block',
                WebkitLineClamp: isLong && !descExpanded ? 3 : 'unset' as any,
                WebkitBoxOrient: 'vertical' as any,
              }}>
                {product.description}
              </p>
              {isLong && (
                <button
                  onClick={() => setDescExpanded(e => !e)}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginTop: 6, background: 'none', padding: 0, border: 'none', cursor: 'pointer' }}
                >
                  {descExpanded ? 'Свернуть' : 'Читать далее'}
                </button>
              )}
            </div>
          )
        })()}

        {/* Stock badge */}
        {product.stock > 0 && product.stock <= 10 && (
          <div style={{ margin: '16px 16px 0', padding: '10px 14px', borderRadius: 10, background: '#FEF3C7' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#92400E' }}>Осталось {product.stock} шт.</span>
          </div>
        )}

        {/* Specifications */}
        {product.attributes && Object.keys(product.attributes).length > 0 && (() => {
          const ATTR_LABELS: Record<string, string> = {
            brand: 'Бренд', material: 'Материал', model: 'Модель',
            specifications: 'Характеристики', year: 'Год', dimensions: 'Размеры',
          }
          const entries = Object.entries(product.attributes as Record<string, string>).filter(([, v]) => v)
          if (!entries.length) return null
          return (
            <div style={{ padding: '24px 16px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-strong)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Характеристики
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {entries.map(([key, value], i) => (
                  <div key={key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '11px 14px',
                    borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'var(--card)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                      {ATTR_LABELS[key] ?? key}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Reviews section */}
        {reviewData && reviewData.count > 0 && (
          <div style={{ padding: '24px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-strong)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Отзывы ({reviewData.count})
              </div>
              {reviewData.reviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(v => !v)}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showAllReviews ? 'Свернуть' : 'Все отзывы'}
                </button>
              )}
            </div>
            {/* Sort selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {([['recent', 'Новые'], ['highest', 'Высокие ⭐'], ['lowest', 'Низкие']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setReviewSort(val)}
                  style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: reviewSort === val ? 'var(--accent)' : 'var(--subtle)',
                    color: reviewSort === val ? 'white' : 'var(--muted)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(showAllReviews
                ? [...reviewData.reviews]
                : [...reviewData.reviews].slice(0, 3)
              ).sort((a: any, b: any) =>
                reviewSort === 'recent' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                : reviewSort === 'highest' ? b.rating - a.rating
                : a.rating - b.rating
              ).map((r, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--card)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= r.rating ? 'var(--accent)' : 'none'} stroke="var(--accent)" strokeWidth="2">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                        </svg>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.reviewer_name}</span>
                  </div>
                  {r.text && (
                    <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>{r.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar products */}
        {similar.length > 0 && (
          <div style={{ padding: '24px 16px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-strong)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Похожие товары
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -16px', padding: '0 16px 4px' }}>
              {similar.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (onProduct) {
                      onProduct(p.id)
                    }
                  }}
                  style={{
                    flexShrink: 0, width: 140,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                    textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: 110, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 28 }}>📦</span>
                    </div>
                  )}
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                      {p.name}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
                      {fmtPrice(Number(p.price), currency)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share bottom sheet */}
      {showShare && (
        <div
          onClick={() => setShowShare(false)}
          onTouchMove={e => e.preventDefault()}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '20px 16px calc(28px + env(safe-area-inset-bottom))' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }}/>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
              Поделиться
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </div>
            {/* Referral earn callout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent)', marginBottom: 16 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>🎁</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Зарабатывайте с каждого заказа</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Ваш реферальный код добавится к ссылке автоматически</div>
              </div>
            </div>
            {/* Send via Telegram */}
            <button
              onClick={handleTelegramShare}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(37,161,228,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#25A1E4">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 6.628 5.374 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.829.941z"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Отправить в Telegram</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Поделитесь с друзьями в чате</div>
              </div>
            </button>
            {/* Share to Story */}
            {!!(window as any).Telegram?.WebApp?.shareToStory && product.images?.[0] && (
              <button
                onClick={handleStoryShare}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                  background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(131,58,180,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#833AB4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Добавить в Stories</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Поделитесь в Telegram Stories</div>
                </div>
              </button>
            )}
            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                background: copied ? 'var(--accent-soft)' : 'var(--card)',
                border: `1px solid ${copied ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: copied ? 'var(--accent-soft)' : 'var(--subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {copied
                  ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                }
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: copied ? 'var(--accent)' : 'var(--ink)' }}>
                  {copied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {productUrl}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Image viewer overlay */}
      {showImageViewer && images.length > 0 && (
        <div
          onClick={() => setShowImageViewer(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img
            src={images[imgIdx]}
            alt={product.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', touchAction: 'pinch-zoom' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setShowImageViewer(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          {images.length > 1 && (
            <>
              <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setImgIdx(i) }}
                    style={{ width: i === imgIdx ? 20 : 6, height: 6, borderRadius: 999, background: i === imgIdx ? 'white' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                  />
                ))}
              </div>
              {imgIdx > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); setImgIdx(i => i - 1) }}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
              )}
              {imgIdx < images.length - 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setImgIdx(i => i + 1) }}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
