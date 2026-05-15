import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCart } from '@/store/cart'
import { Icon } from '@/components/Icon'

interface Props {
  tenantId: string
  productId: string
  currency: string
  shopSlug?: string
  botUsername?: string
  onBack: () => void
  onCheckout: () => void
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

export function ProductPage({ tenantId, productId, currency, shopSlug, botUsername, onBack, onCheckout }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

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

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', tenantId, productId],
    queryFn: () => api.getProducts(tenantId).then(ps => ps.find((p: any) => p.id === productId)),
  })

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
  const t = tone(product.name)

  const handleShare = () => {
    const tg = (window as any).Telegram?.WebApp
    if (botUsername && tg?.switchInlineQuery) {
      tg.switchInlineQuery(`${productId}`, ['users', 'groups', 'channels'])
    } else {
      const url = botUsername
        ? `https://t.me/${botUsername}?start=p_${productId}`
        : `https://dokonly-miniapp.pages.dev?shop=${shopSlug ?? ''}`
      if (navigator.share) {
        navigator.share({ title: product.name, url }).catch(() => navigator.clipboard?.writeText(url))
      } else if (tg?.openLink) {
        tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(product.name)}`)
      } else {
        navigator.clipboard?.writeText(url)
      }
    }
  }

  const handleAddToCart = () => {
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
    setTimeout(() => setAdded(false), 1800)
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
        {/* Wishlist heart */}
        <button
          onClick={() => toggleWishlist(productId)}
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: inWishlist ? 'var(--accent-soft)' : 'var(--subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill={inWishlist ? 'var(--accent)' : 'none'} stroke={inWishlist ? 'var(--accent)' : 'var(--ink)'} strokeWidth="1.5">
            <path d="M9 15.5S1.5 11 1.5 6A4 4 0 0 1 9 4.3 4 4 0 0 1 16.5 6C16.5 11 9 15.5 9 15.5z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Share */}
        <button
          onClick={handleShare}
          style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
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

      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 96 }}>
        {/* Image gallery */}
        <div style={{ position: 'relative', background: 'var(--subtle)' }}>
          {images.length > 0 ? (
            <img
              src={images[imgIdx]}
              alt={product.name}
              style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div className="img-ph" data-tone={t} style={{ width: '100%', borderRadius: 0, fontSize: 16 }}>
              <span>{product.name.split(' ').slice(0, 2).join(' ')}</span>
            </div>
          )}
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

        {/* Description */}
        {product.description && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', marginBottom: 6 }}>Описание</div>
            <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{product.description}</p>
          </div>
        )}

        {/* Stock badge */}
        {product.stock > 0 && product.stock <= 10 && (
          <div style={{ margin: '16px 16px 0', padding: '10px 14px', borderRadius: 10, background: '#FEF3C7' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#92400E' }}>Осталось {product.stock} шт.</span>
          </div>
        )}
      </div>

      {/* Add to cart bar */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        zIndex: 30,
      }}>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          style={{
            width: '100%', height: 52, borderRadius: 14,
            background: added ? '#059669' : product.stock === 0 ? 'var(--subtle)' : 'var(--accent)',
            color: product.stock === 0 ? 'var(--muted)' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontWeight: 700, fontSize: 15,
            transition: 'background 0.2s',
          }}
        >
          {added ? (
            <><Icon name="check" size={18}/> Добавлено</>
          ) : product.stock === 0 ? (
            'Нет в наличии'
          ) : (
            <>В корзину · {fmtPrice(Number(product.price) * qty, currency)}</>
          )}
        </button>
      </div>
    </div>
  )
}
