import { useState, useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
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
  layout?: string
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

type PresetId = 'boutique' | 'marketplace' | 'food' | 'minimal'

const PRESET_ALIASES: Record<string, PresetId> = {
  boutique: 'boutique',
  lookbook: 'boutique',
  bento: 'boutique',
  marketplace: 'marketplace',
  catalog: 'marketplace',
  food: 'food',
  minimal: 'minimal',
}

const PRESET_COPY: Record<PresetId, {
  eyebrow: string
  headline: string
  cta: string
  section: string
  chip: string
  bg: string
  hero: string
  heroText: string
  card: string
  radius: number
  productTitle: string
}> = {
  boutique: {
    eyebrow: 'Закрытая подборка',
    headline: 'Новая коллекция в один аккуратный Telegram-магазин',
    cta: 'Смотреть коллекцию',
    section: 'Избранное',
    chip: 'Бутик',
    bg: '#f6f0e7',
    hero: 'linear-gradient(135deg, #181410 0%, #5d4934 48%, #efe0c8 100%)',
    heroText: '#fff8ec',
    card: '#fffaf2',
    radius: 24,
    productTitle: 'Редакционная подборка',
  },
  marketplace: {
    eyebrow: 'Умный каталог',
    headline: 'Каталог, фильтры и товары в одном сценарии',
    cta: 'Открыть каталог',
    section: 'Популярное сейчас',
    chip: 'Маркетплейс',
    bg: '#f3f7fb',
    hero: 'linear-gradient(135deg, #0f172a 0%, #126e82 52%, #d7f7ff 100%)',
    heroText: '#ffffff',
    card: '#ffffff',
    radius: 18,
    productTitle: 'Популярные товары',
  },
  food: {
    eyebrow: 'Свежий заказ',
    headline: 'Меню, доставка и повторные заказы без переписки',
    cta: 'Выбрать товары',
    section: 'Сегодня берут',
    chip: 'Доставка',
    bg: '#fff8ef',
    hero: 'linear-gradient(135deg, #4a2418 0%, #d16b46 52%, #fff0c7 100%)',
    heroText: '#fffaf2',
    card: '#fffdf8',
    radius: 22,
    productTitle: 'Меню и товары',
  },
  minimal: {
    eyebrow: 'Чистая витрина',
    headline: 'Чистая подача для товаров с высоким доверием',
    cta: 'Посмотреть товары',
    section: 'Рекомендации',
    chip: 'Minimal',
    bg: '#f7f7f4',
    hero: 'linear-gradient(135deg, #111111 0%, #5d625d 50%, #f1f0ea 100%)',
    heroText: '#ffffff',
    card: '#ffffff',
    radius: 12,
    productTitle: 'Выбранные позиции',
  },
}

function categoryName(product: any) {
  return product.category ?? product.category_name ?? product.category_title ?? null
}

function imageOf(product: any) {
  return product.images?.[0] ?? product.image_url ?? null
}

function clampText(text: string, max = 62) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function presetBorder(preset: PresetId) {
  if (preset === 'minimal') return '1px solid rgba(17,17,17,0.12)'
  if (preset === 'marketplace') return '1px solid rgba(2,132,199,0.12)'
  if (preset === 'food') return '1px solid rgba(209,107,70,0.16)'
  return '1px solid rgba(111,90,63,0.14)'
}

function presetShadow(preset: PresetId) {
  if (preset === 'minimal') return '0 1px 0 rgba(17,17,17,0.06)'
  if (preset === 'marketplace') return '0 18px 34px rgba(15, 44, 67, 0.10)'
  if (preset === 'food') return '0 18px 34px rgba(117, 58, 34, 0.10)'
  return '0 20px 40px rgba(63, 48, 31, 0.12)'
}

type StoryHighlight = {
  id: string
  title: string
  coverUrl: string | null
  items: any[]
}

function storyMediaUrl(story: any) {
  return story?.media_url || story?.image_url || null
}

function isVideoMedia(url?: string | null) {
  return !!url && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)
}

function StorefrontMedia({ src, style }: { src?: string | null; style?: CSSProperties }) {
  if (!src) return null
  if (isVideoMedia(src)) {
    return (
      <video
        src={src}
        muted
        playsInline
        autoPlay
        loop
        style={style}
      />
    )
  }
  return <img src={src} alt="" style={style} />
}

function highlightSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function buildStoryHighlights(stories: any[]): StoryHighlight[] {
  const groups = new Map<string, StoryHighlight>()
  const activeStories = stories
    .filter((story: any) => story.kind !== 'banner' && story.is_active !== false)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  activeStories.forEach((story: any, index: number) => {
    const rawTitle = story.highlight_title || story.title || story.caption || `Story ${index + 1}`
    const title = String(rawTitle).trim() || `Story ${index + 1}`
    const id = story.highlight_id || highlightSlug(title) || `highlight-${story.id || index}`
    const existing = groups.get(id)
    const coverUrl = story.highlight_cover_url || storyMediaUrl(story)
    if (existing) {
      existing.items.push(story)
      if (!existing.coverUrl && coverUrl) existing.coverUrl = coverUrl
      return
    }
    groups.set(id, { id, title, coverUrl: coverUrl || null, items: [story] })
  })

  return Array.from(groups.values())
}

function openStoryTarget(item: any, onShowCatalog: (category?: string) => void) {
  const url = item?.cta_url || ''
  if (url.startsWith('category:')) {
    onShowCatalog(url.replace('category:', ''))
    return
  }
  if (url) window.open(url, '_blank')
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function CompactHeader({ shop }: { shop: ShopData }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
    }}>
      {shop.logo_url && (
        <img
          src={shop.logo_url}
          alt={shop.name}
          style={{ width: 32, height: 32, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      <span style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
        {shop.name}
      </span>
      {(shop as any).is_verified && (
        <div style={{
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
  )
}

function StoriesRow({ stories, setActiveStory, onShowCatalog }: { stories: any[]; setActiveStory: (s: any) => void; onShowCatalog: (category?: string) => void }) {
  if (!stories.length) return null
  const banners = stories.filter((s: any) => s.kind === 'banner' && s.is_active !== false)
  const highlights = buildStoryHighlights(stories)
  return (
    <>
      {banners.length > 0 && (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {banners.map((banner: any) => {
            const mediaUrl = banner.media_url || banner.image_url
            return (
              <button
                key={banner.id}
                onClick={() => openStoryTarget(banner, onShowCatalog)}
                style={{
                  minHeight: 112,
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  textAlign: 'left',
                  position: 'relative',
                  padding: 0,
                }}
              >
                <StorefrontMedia src={mediaUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: mediaUrl ? 'linear-gradient(90deg, rgba(0,0,0,0.62), rgba(0,0,0,0.14))' : 'linear-gradient(135deg, var(--accent-soft), var(--card))' }} />
                <div style={{ position: 'relative', padding: 16, maxWidth: '78%' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: mediaUrl ? 'rgba(255,255,255,0.72)' : 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Баннер</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: mediaUrl ? 'white' : 'var(--ink)', marginTop: 6, lineHeight: 1.2 }}>
                    {banner.title || banner.caption || 'Акция магазина'}
                  </div>
                  {banner.cta_text && (
                    <div style={{ display: 'inline-flex', marginTop: 10, padding: '6px 10px', borderRadius: 999, background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 800 }}>
                      {banner.cta_text}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
      {highlights.length > 0 && (
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {highlights.map((highlight) => {
            const mediaUrl = highlight.coverUrl
            return (
              <button
                key={highlight.id}
                onClick={() => setActiveStory(highlight.items[0])}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{
                  width: 60, height: 60, borderRadius: 999,
                  padding: 2,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #005c40 100%)',
                  flexShrink: 0,
                }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', border: '2px solid var(--bg)', background: 'var(--subtle)' }}>
                    {mediaUrl
                      ? <StorefrontMedia src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎬</div>
                    }
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 500, maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {highlight.title}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

function TrustStrip({ shop, shopStats }: { shop: ShopData; shopStats: any }) {
  if (shop.settings?.show_trust_strip === false) return null
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
}

// Compact 2-col product grid card
function GridProductCard({
  p, shop, wishlistIds, justAdded, toggleWishlist, handleQuickAdd, handleViewProduct,
}: {
  p: any; shop: ShopData; wishlistIds: string[]; justAdded: string | null;
  toggleWishlist: (id: string) => void; handleQuickAdd: (e: React.MouseEvent, p: any) => void; handleViewProduct: (id: string) => void;
}) {
  const inWishlist = wishlistIds.includes(p.id)
  return (
    <button key={p.id} onClick={() => handleViewProduct(p.id)} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {p.images?.[0]
          ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', aspectRatio: '1/1', borderRadius: 12, objectFit: 'cover' }}/>
          : <div className="img-ph" data-tone={tone(p.name)}><span>{p.name.split(' ').slice(0, 2).join(' ')}</span></div>
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
  )
}

// Full-width single-column product card (for lookbook)
function LargeProductCard({
  p, shop, wishlistIds, justAdded, imageHeight, toggleWishlist, handleQuickAdd, handleViewProduct,
}: {
  p: any; shop: ShopData; wishlistIds: string[]; justAdded: string | null; imageHeight?: number;
  toggleWishlist: (id: string) => void; handleQuickAdd: (e: React.MouseEvent, p: any) => void; handleViewProduct: (id: string) => void;
}) {
  const inWishlist = wishlistIds.includes(p.id)
  const h = imageHeight ?? 200
  const hasDiscount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
  return (
    <button
      onClick={() => handleViewProduct(p.id)}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column',
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        {p.images?.[0]
          ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: h, objectFit: 'cover', display: 'block' }}/>
          : <div className="img-ph" data-tone={tone(p.name)} style={{ height: h }}><span>{p.name.split(' ').slice(0, 2).join(' ')}</span></div>
        }
        {p.stock === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 12,
          }}>Нет в наличии</div>
        )}
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
        <button
          onClick={e => { e.stopPropagation(); toggleWishlist(p.id) }}
          type="button"
          aria-label={inWishlist ? 'Убрать из избранного' : 'Добавить в избранное'}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: 999,
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
      <div style={{ padding: '12px 14px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4 }}>
            {p.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              {fmtPrice(Number(p.price), shop.currency)}
            </span>
            {hasDiscount && (
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through' }}>
                {fmtPrice(Number(p.compare_at_price), shop.currency)}
              </span>
            )}
          </div>
        </div>
        {!p.sizes?.length && !p.colors?.length && p.stock !== 0 && (
          <button
            onClick={e => handleQuickAdd(e, p)}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: justAdded === p.id ? 'var(--accent)' : 'var(--subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, transform 0.15s',
              transform: justAdded === p.id ? 'scale(0.9)' : 'scale(1)',
            }}
          >
            {justAdded === p.id
              ? <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <Icon name="plus" size={16} color="var(--ink)"/>
            }
          </button>
        )}
      </div>
    </button>
  )
}

// ─── Catalog Layout ─────────────────────────────────────────────────────────

function CatalogLayout({
  shop, tenantId, activeProducts, onProduct, onShowCatalog, stories, shopStats,
  uniqueCats, catCounts, wishlistIds, justAdded, toggleWishlist, handleQuickAdd, handleViewProduct, setActiveStory,
}: {
  shop: ShopData; tenantId: string; activeProducts: any[]; onProduct: (id: string) => void;
  onShowCatalog: (cat?: string) => void; stories: any[]; shopStats: any;
  uniqueCats: string[]; catCounts: Record<string, number>; wishlistIds: string[];
  justAdded: string | null; toggleWishlist: (id: string) => void;
  handleQuickAdd: (e: React.MouseEvent, p: any) => void; handleViewProduct: (id: string) => void;
  setActiveStory: (s: any) => void;
}) {
  return (
    <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24 }}>
      <CompactHeader shop={shop} />

      {/* Small stories row */}
      <StoriesRow stories={stories} setActiveStory={setActiveStory} onShowCatalog={onShowCatalog} />

      {/* Prominent search bar */}
      <div style={{ padding: '14px 16px 0' }}>
        <button
          onClick={() => onShowCatalog()}
          style={{
            width: '100%', height: 52, borderRadius: 14,
            background: 'var(--card)', border: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
            paddingLeft: 16, paddingRight: 16,
            cursor: 'pointer',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ flex: 1, fontSize: 15, color: 'var(--muted)', textAlign: 'left' }}>Поиск товаров...</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Categories: tab-style sticky nav */}
      {uniqueCats.length > 0 && (
        <div style={{
          display: 'flex', gap: 0, padding: '12px 0 0', overflowX: 'auto', scrollbarWidth: 'none',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
        }}>
          <button
            onClick={() => onShowCatalog()}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '10px 16px',
              fontSize: 13, fontWeight: 600, color: 'var(--accent)',
              background: 'none', border: 'none', borderBottom: '2px solid var(--accent)',
              whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
            }}
          >
            Все
          </button>
          {uniqueCats.map(c => (
            <button
              key={c}
              onClick={() => onShowCatalog(c)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '10px 16px',
                fontSize: 13, fontWeight: 500, color: 'var(--muted)',
                background: 'none', border: 'none', borderBottom: '2px solid transparent',
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              }}
            >
              {c}
              <span style={{ fontSize: 11, color: 'var(--muted-strong)', fontWeight: 600 }}>
                {catCounts[c]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 2-col compact product grid */}
      {activeProducts.length > 0 ? (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {activeProducts.map((p: any) => (
              <GridProductCard
                key={p.id}
                p={p} shop={shop} wishlistIds={wishlistIds}
                justAdded={justAdded} toggleWishlist={toggleWishlist}
                handleQuickAdd={handleQuickAdd} handleViewProduct={handleViewProduct}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛍</div>
          <p style={{ fontSize: 14 }}>Товары появятся скоро</p>
        </div>
      )}
    </div>
  )
}

// ─── Lookbook Layout ─────────────────────────────────────────────────────────

function LookbookLayout({
  shop, tenantId, activeProducts, onProduct, onShowCatalog, stories, shopStats,
  featured, wishlistIds, justAdded, toggleWishlist, handleQuickAdd, handleViewProduct, setActiveStory,
}: {
  shop: ShopData; tenantId: string; activeProducts: any[]; onProduct: (id: string) => void;
  onShowCatalog: (cat?: string) => void; stories: any[]; shopStats: any;
  featured: any[]; wishlistIds: string[]; justAdded: string | null;
  toggleWishlist: (id: string) => void; handleQuickAdd: (e: React.MouseEvent, p: any) => void;
  handleViewProduct: (id: string) => void; setActiveStory: (s: any) => void;
}) {
  const hasCover = !!shop.cover_url
  return (
    <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24 }}>

      {/* Full-width cover 240px */}
      <div style={{ height: 240, position: 'relative', overflow: 'hidden', background: hasCover ? 'var(--subtle)' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent) 100%)' }}>
        {hasCover ? (
          <>
            <img src={shop.cover_url!} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }}/>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--accent) 0%, rgba(0,0,0,0.15) 100%)', opacity: 0.88 }}/>
        )}
        {/* Overlay text */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 26, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
            {shop.name}
          </div>
          {shop.description && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.4)', lineHeight: 1.4 }}>
              {shop.description.slice(0, 80)}{shop.description.length > 80 ? '...' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Logo + tagline centered below cover */}
      {shop.logo_url && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 16px 0', gap: 8 }}>
          <img src={shop.logo_url} alt={shop.name} style={{ width: 56, height: 56, borderRadius: 999, objectFit: 'cover', border: '3px solid var(--border)', marginTop: -36, background: 'var(--bg)', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}/>
          {(shopStats?.avg_rating != null || (shopStats?.customer_count ?? 0) >= 10) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {shopStats?.avg_rating != null && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>⭐ {shopStats.avg_rating} ({shopStats.review_count})</span>
              )}
              {(shopStats?.customer_count ?? 0) >= 10 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>👥 {shopStats!.customer_count}+</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stories: large full-width carousel */}
      {stories.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 16px 10px' }}>
            Stories
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', scrollSnapType: 'x mandatory', gap: 12, padding: '0 16px' }}>
            {stories.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setActiveStory(s)}
                style={{
                  flexShrink: 0, width: 'calc(100% - 32px)', scrollSnapAlign: 'start',
                  borderRadius: 16, overflow: 'hidden', position: 'relative', height: 200,
                  background: 'var(--subtle)', border: 'none', cursor: 'pointer',
                }}
              >
                {s.media_url
                  ? <img src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎬</div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }}/>
                {s.caption && (
                  <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, fontSize: 14, fontWeight: 600, color: 'white', textAlign: 'left', lineHeight: 1.3 }}>
                    {s.caption}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Featured 3-card small horizontal carousel */}
      {featured.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 10px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Хиты</div>
            <button onClick={() => onShowCatalog()} style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', background: 'none', border: 'none' }}>
              Смотреть все
            </button>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: 10, padding: '0 16px', scrollbarWidth: 'none' }}>
            {featured.slice(0, 5).map((p: any) => {
              const hasDiscount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
              return (
                <button
                  key={p.id}
                  onClick={() => handleViewProduct(p.id)}
                  style={{
                    flexShrink: 0, width: 160, background: 'var(--card)',
                    border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', textAlign: 'left',
                  }}
                >
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}/>
                    : <div className="img-ph" data-tone={tone(p.name)} style={{ height: 110 }}><span>{p.name.split(' ').slice(0, 2).join(' ')}</span></div>
                  }
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                        {fmtPrice(Number(p.price), shop.currency)}
                      </span>
                      {hasDiscount && (
                        <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', borderRadius: 5, padding: '1px 5px', fontWeight: 700 }}>
                          -{Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Products: 1-col large cards */}
      {activeProducts.length > 0 ? (
        <div style={{ padding: '24px 16px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Коллекция
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activeProducts.map((p: any) => (
              <LargeProductCard
                key={p.id}
                p={p} shop={shop} wishlistIds={wishlistIds}
                justAdded={justAdded} imageHeight={200}
                toggleWishlist={toggleWishlist} handleQuickAdd={handleQuickAdd} handleViewProduct={handleViewProduct}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛍</div>
          <p style={{ fontSize: 14 }}>Товары появятся скоро</p>
        </div>
      )}
    </div>
  )
}

// ─── Marketplace Layout ──────────────────────────────────────────────────────

function MarketplaceLayout({
  shop, tenantId, activeProducts, onProduct, onShowCatalog, stories, shopStats,
  uniqueCats, catCounts, wishlistIds, justAdded, toggleWishlist, handleQuickAdd, handleViewProduct, setActiveStory,
}: {
  shop: ShopData; tenantId: string; activeProducts: any[]; onProduct: (id: string) => void;
  onShowCatalog: (cat?: string) => void; stories: any[]; shopStats: any;
  uniqueCats: string[]; catCounts: Record<string, number>; wishlistIds: string[];
  justAdded: string | null; toggleWishlist: (id: string) => void;
  handleQuickAdd: (e: React.MouseEvent, p: any) => void; handleViewProduct: (id: string) => void;
  setActiveStory: (s: any) => void;
}) {
  const quickLinks = ['Новинки', 'Скидки', 'Хиты', 'Все категории']
  return (
    <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24 }}>

      {/* Compact header */}
      <CompactHeader shop={shop} />

      {/* Huge search bar */}
      <div style={{ padding: '14px 16px 0' }}>
        <button
          onClick={() => onShowCatalog()}
          style={{
            width: '100%', height: 60, borderRadius: 16,
            background: 'var(--card)', border: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12,
            paddingLeft: 18, paddingRight: 18,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ flex: 1, fontSize: 16, color: 'var(--muted)', textAlign: 'left' }}>Поиск товаров</span>
          <div style={{
            padding: '5px 10px', borderRadius: 8,
            background: 'var(--accent)', fontSize: 12, fontWeight: 600, color: 'white',
          }}>
            Найти
          </div>
        </button>
      </div>

      {/* Quick links row */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {quickLinks.map((link, i) => (
          <button
            key={link}
            onClick={() => {
              if (i === 3) onShowCatalog()
              else onShowCatalog()
            }}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '8px 16px', borderRadius: 999,
              background: i === 0 ? 'var(--accent)' : 'var(--card)',
              border: i === 0 ? 'none' : '1px solid var(--border)',
              fontSize: 13, fontWeight: 600,
              color: i === 0 ? 'white' : 'var(--ink)',
              whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
            }}
          >
            {link}
          </button>
        ))}
      </div>

      {/* Categories: large 2-per-row icon grid */}
      {uniqueCats.length > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Категории</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {uniqueCats.slice(0, 6).map((c, idx) => {
              const palettes = ['linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)']
              const catProducts = activeProducts.filter((p: any) => p.category === c)
              const coverImg = catProducts.find((p: any) => p.images?.[0])?.images?.[0]
              return (
                <button
                  key={c}
                  onClick={() => onShowCatalog(c)}
                  style={{
                    height: 90, borderRadius: 14, overflow: 'hidden',
                    position: 'relative', border: 'none', cursor: 'pointer',
                    background: coverImg ? 'var(--subtle)' : palettes[idx % palettes.length],
                  }}
                >
                  {coverImg && (
                    <img src={coverImg} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}/>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}/>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{c}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{catCounts[c]} товаров</div>
                  </div>
                </button>
              )
            })}
            {uniqueCats.length > 6 && (
              <button
                onClick={() => onShowCatalog()}
                style={{
                  height: 90, borderRadius: 14, border: '1.5px dashed var(--border)',
                  background: 'var(--card)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ fontSize: 20 }}>...</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Ещё {uniqueCats.length - 6}</div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Products: 2-col compact grid */}
      {activeProducts.length > 0 ? (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Все товары</div>
            <button onClick={() => onShowCatalog()} style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', background: 'none', border: 'none' }}>
              Каталог <Icon name="chevronRight" size={13} color="var(--accent)"/>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {activeProducts.slice(0, 6).map((p: any) => (
              <GridProductCard
                key={p.id}
                p={p} shop={shop} wishlistIds={wishlistIds}
                justAdded={justAdded} toggleWishlist={toggleWishlist}
                handleQuickAdd={handleQuickAdd} handleViewProduct={handleViewProduct}
              />
            ))}
          </div>
          {activeProducts.length > 6 && (
            <button
              onClick={() => onShowCatalog()}
              style={{
                width: '100%', height: 46, marginTop: 14, borderRadius: 12,
                border: '1.5px solid var(--border)', background: 'var(--card)',
                color: 'var(--ink)', fontSize: 14, fontWeight: 600,
              }}
            >
              Смотреть все товары ({activeProducts.length})
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛍</div>
          <p style={{ fontSize: 14 }}>Товары появятся скоро</p>
        </div>
      )}

      {/* Trust strip */}
      <div style={{ marginTop: 12 }}>
        <TrustStrip shop={shop} shopStats={shopStats} />
      </div>
    </div>
  )
}

// ─── Bento Layout ────────────────────────────────────────────────────────────

function BentoLayout({
  shop, tenantId, activeProducts, onProduct, onShowCatalog, stories, shopStats,
  wishlistIds, justAdded, toggleWishlist, handleQuickAdd, handleViewProduct, setActiveStory,
}: {
  shop: ShopData; tenantId: string; activeProducts: any[]; onProduct: (id: string) => void;
  onShowCatalog: (cat?: string) => void; stories: any[]; shopStats: any;
  wishlistIds: string[]; justAdded: string | null; toggleWishlist: (id: string) => void;
  handleQuickAdd: (e: React.MouseEvent, p: any) => void; handleViewProduct: (id: string) => void;
  setActiveStory: (s: any) => void;
}) {
  const hasCover = !!shop.cover_url

  // Build bento groups: [featured, [small, small], featured, [small, small], ...]
  const bentoItems: Array<{ type: 'full'; p: any } | { type: 'pair'; left: any; right: any }> = []
  let i = 0
  while (i < activeProducts.length) {
    if (bentoItems.length === 0 || bentoItems.length % 3 === 0) {
      // Full width
      bentoItems.push({ type: 'full', p: activeProducts[i] })
      i++
    } else {
      // Pair
      const left = activeProducts[i]
      const right = activeProducts[i + 1]
      if (left && right) {
        bentoItems.push({ type: 'pair', left, right })
        i += 2
      } else if (left) {
        bentoItems.push({ type: 'full', p: left })
        i++
      } else {
        break
      }
    }
  }

  return (
    <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24 }}>

      {/* Cover 180px */}
      <div style={{ height: 180, position: 'relative', overflow: 'hidden', background: hasCover ? 'var(--subtle)' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent) 100%)' }}>
        {hasCover ? (
          <>
            <img src={shop.cover_url!} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }}/>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--accent) 0%, rgba(0,0,0,0.15) 100%)', opacity: 0.88 }}/>
        )}
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          {shop.logo_url && (
            <img src={shop.logo_url} alt={shop.name} style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }}/>
          )}
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {shop.name}
          </div>
        </div>
      </div>

      {/* Stories row */}
      <StoriesRow stories={stories} setActiveStory={setActiveStory} onShowCatalog={onShowCatalog} />

      {/* Bento product grid */}
      {activeProducts.length > 0 ? (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Товары</div>
            <button onClick={() => onShowCatalog()} style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', background: 'none', border: 'none' }}>
              Все <Icon name="chevronRight" size={13} color="var(--accent)"/>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bentoItems.map((item, idx) => {
              if (item.type === 'full') {
                return (
                  <LargeProductCard
                    key={item.p.id}
                    p={item.p} shop={shop} wishlistIds={wishlistIds}
                    justAdded={justAdded} imageHeight={200}
                    toggleWishlist={toggleWishlist} handleQuickAdd={handleQuickAdd} handleViewProduct={handleViewProduct}
                  />
                )
              }
              // pair
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <GridProductCard
                    p={item.left} shop={shop} wishlistIds={wishlistIds}
                    justAdded={justAdded} toggleWishlist={toggleWishlist}
                    handleQuickAdd={handleQuickAdd} handleViewProduct={handleViewProduct}
                  />
                  <GridProductCard
                    p={item.right} shop={shop} wishlistIds={wishlistIds}
                    justAdded={justAdded} toggleWishlist={toggleWishlist}
                    handleQuickAdd={handleQuickAdd} handleViewProduct={handleViewProduct}
                  />
                </div>
              )
            })}
          </div>
          {activeProducts.length > 8 && (
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
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛍</div>
          <p style={{ fontSize: 14 }}>Товары появятся скоро</p>
        </div>
      )}
    </div>
  )
}

function PresetProductCard({
  p, shop, preset, wishlistIds, justAdded, toggleWishlist, handleQuickAdd, handleViewProduct, featured = false,
}: {
  p: any
  shop: ShopData
  preset: PresetId
  wishlistIds: string[]
  justAdded: string | null
  toggleWishlist: (id: string) => void
  handleQuickAdd: (e: React.MouseEvent, p: any) => void
  handleViewProduct: (id: string) => void
  featured?: boolean
}) {
  const copy = PRESET_COPY[preset]
  const inWishlist = wishlistIds.includes(p.id)
  const img = imageOf(p)
  const hasDiscount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => handleViewProduct(p.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleViewProduct(p.id)
        }
      }}
      style={{
        minWidth: featured ? 220 : undefined,
        textAlign: 'left',
        border: presetBorder(preset),
        borderRadius: copy.radius,
        background: copy.card,
        overflow: 'hidden',
        boxShadow: presetShadow(preset),
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: featured ? '4/3' : preset === 'minimal' ? '16/10' : '1/1.08', background: 'rgba(15,23,42,0.04)' }}>
        {img ? (
          <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div className="img-ph" data-tone={tone(p.name)} style={{ width: '100%', height: '100%', borderRadius: 0 }}>
            <span>{p.name.split(' ').slice(0, 2).join(' ')}</span>
          </div>
        )}
        {hasDiscount && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            borderRadius: 999, background: 'var(--accent)', color: 'white',
            padding: '4px 8px', fontSize: 11, fontWeight: 800,
          }}>
            -{Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)}%
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); toggleWishlist(p.id) }}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: 999,
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(15,23,42,0.12)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill={inWishlist ? 'var(--accent)' : 'none'} stroke={inWishlist ? 'var(--accent)' : '#6b7280'} strokeWidth="1.6">
            <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.8a3.5 3.5 0 0 1 6.5 1.7C14.5 9.5 8 13.5 8 13.5z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div style={{ padding: featured ? 15 : 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {categoryName(p) && (
              <div style={{
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: preset === 'minimal' ? '#71717a' : 'var(--accent)',
                marginBottom: 5,
              }}>
                {categoryName(p)}
              </div>
            )}
            <div style={{
              fontSize: featured ? 15 : 13,
              fontWeight: 820,
              color: '#111827',
              lineHeight: 1.25,
              minHeight: featured ? 38 : 33,
            }}>
              {clampText(p.name, featured ? 52 : 38)}
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: featured ? 14 : 12, fontWeight: 800, color: '#111827' }}>
                {fmtPrice(Number(p.price), shop.currency)}
              </span>
              {hasDiscount && (
                <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>
                  {fmtPrice(Number(p.compare_at_price), shop.currency)}
                </span>
              )}
            </div>
          </div>
          {p.stock !== 0 && (
            <button
              onClick={e => handleQuickAdd(e, p)}
              type="button"
              aria-label="Добавить"
              style={{
                width: 34, height: 34, borderRadius: preset === 'minimal' ? 999 : 11,
                flexShrink: 0,
                background: justAdded === p.id ? 'var(--accent)' : preset === 'boutique' ? '#1d1712' : '#111827',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: justAdded === p.id ? 'scale(0.92)' : 'scale(1)',
                transition: 'transform 0.16s, background 0.16s',
              }}
            >
              {justAdded === p.id
                ? <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <Icon name="plus" size={15} color="white" />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PresetStorefront({
  preset, shop, activeProducts, onShowCatalog, stories, shopStats, uniqueCats, catCounts,
  wishlistIds, justAdded, toggleWishlist, handleQuickAdd, handleViewProduct, setActiveStory,
}: {
  preset: PresetId
  shop: ShopData
  activeProducts: any[]
  onShowCatalog: (cat?: string) => void
  stories: any[]
  shopStats: any
  uniqueCats: string[]
  catCounts: Record<string, number>
  wishlistIds: string[]
  justAdded: string | null
  toggleWishlist: (id: string) => void
  handleQuickAdd: (e: React.MouseEvent, p: any) => void
  handleViewProduct: (id: string) => void
  setActiveStory: (s: any) => void
}) {
  const copy = PRESET_COPY[preset]
  const featured = activeProducts.filter((p: any) => p.is_featured).concat(activeProducts).filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
  const heroProduct = featured[0] ?? activeProducts[0]
  const activeBanners = stories.filter((s: any) => s.kind === 'banner' && s.is_active !== false)
  const heroBanners = activeBanners.filter((s: any) => s.media_url || s.image_url)
  const announcements = activeBanners.filter((s: any) => !(s.media_url || s.image_url))
  const [heroBannerIndex, setHeroBannerIndex] = useState(0)
  const activeHeroBanner = heroBanners.length ? heroBanners[heroBannerIndex % heroBanners.length] : null
  const heroImage = activeHeroBanner?.media_url || activeHeroBanner?.image_url || shop.cover_url || (heroProduct ? imageOf(heroProduct) : null)
  const heroTitle = clampText(activeHeroBanner?.title || activeHeroBanner?.caption || copy.headline, 82)
  const heroCaption = activeHeroBanner?.title ? activeHeroBanner?.caption : null
  const heroCta = activeHeroBanner?.cta_text || (activeHeroBanner?.cta_url ? 'Смотреть' : null)
  const storyHighlights = buildStoryHighlights(stories).slice(0, 8)
  const announcement = announcements[0]
  const gridCols = preset === 'marketplace' ? '1fr 1fr' : preset === 'minimal' ? '1fr' : '1fr 1fr'

  useEffect(() => {
    if (heroBanners.length <= 1) return
    const timer = setInterval(() => setHeroBannerIndex((i) => (i + 1) % heroBanners.length), 4600)
    return () => clearInterval(timer)
  }, [heroBanners.length])

  function openAnnouncement(item: any) {
    openStoryTarget(item, onShowCatalog)
  }

  return (
    <div className="screen-scroll" style={{ flex: 1, paddingBottom: 24, background: copy.bg }}>
      <div style={{
        padding: '14px 18px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        textAlign: 'center',
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: preset === 'minimal' ? 999 : 16,
          background: '#fff', border: presetBorder(preset),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: presetShadow(preset),
        }}>
          {shop.logo_url ? <img src={shop.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 900, color: 'var(--accent)' }}>{shop.name.slice(0, 1)}</span>}
        </div>
        <div style={{ maxWidth: '82%', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{shop.name}</div>
        </div>
      </div>

      <div style={{ padding: '0' }}>
        <div
          style={{
            width: '100%',
            height: 'clamp(300px, 48dvh, 390px)',
            minHeight: 300,
            position: 'relative',
            overflow: 'hidden',
            border: 'none',
            borderRadius: 0,
            background: copy.hero,
            textAlign: 'left',
            boxShadow: 'none',
          }}
        >
          {heroImage && (
            <StorefrontMedia src={heroImage} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: 1,
            }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,7,18,0.70) 0%, rgba(3,7,18,0.30) 38%, rgba(3,7,18,0.02) 72%, transparent 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 42, zIndex: 3 }}>
            <div style={{
              maxWidth: 280,
              fontSize: 'clamp(26px, 8.4vw, 40px)',
              lineHeight: 1,
              fontWeight: 950,
              letterSpacing: '-0.035em',
              color: 'white',
              textShadow: '0 2px 22px rgba(0,0,0,0.30)',
            }}>
              {heroTitle}
            </div>
            {heroCaption && (
              <div style={{ marginTop: 14, maxWidth: 250, color: 'rgba(255,255,255,0.92)', fontSize: 17, lineHeight: 1.18, fontWeight: 650, textShadow: '0 2px 18px rgba(0,0,0,0.28)' }}>
                {clampText(heroCaption, 72)}
              </div>
            )}
            {heroCta && (
              <button
                type="button"
                onClick={() => activeHeroBanner ? openStoryTarget(activeHeroBanner, onShowCatalog) : onShowCatalog()}
                style={{
                  marginTop: 22,
                  minHeight: 46,
                  maxWidth: '92%',
                  borderRadius: 999,
                  padding: '0 14px 0 18px',
                  background: 'rgba(255,255,255,0.94)',
                  color: '#111827',
                  boxShadow: '0 16px 38px rgba(0,0,0,0.22)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 13,
                  fontSize: 14,
                  fontWeight: 820,
                  lineHeight: 1.15,
                  whiteSpace: 'normal',
                  textAlign: 'center',
                }}
              >
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{heroCta}</span>
                <span style={{ width: 26, height: 26, borderRadius: 999, background: '#1f2937', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ›
                </span>
              </button>
            )}
          </div>

          {heroBanners.length > 1 && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, zIndex: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 8 }}>
              {heroBanners.map((b: any, i: number) => (
                <div key={b.id ?? i} style={{
                  width: i === heroBannerIndex % heroBanners.length ? 34 : 28,
                  height: 5,
                  borderRadius: 999,
                  background: i === heroBannerIndex % heroBanners.length ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.34)',
                  transition: 'width 0.2s ease, background 0.2s ease',
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {storyHighlights.length > 0 && (
        <div style={{ padding: '16px 16px 0', display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {storyHighlights.map((highlight: StoryHighlight) => {
            const mediaUrl = highlight.coverUrl
            return (
              <button key={highlight.id} onClick={() => setActiveStory(highlight.items[0])} style={{ width: 76, flexShrink: 0, background: 'none', border: 'none', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, margin: '0 auto', padding: 2, borderRadius: 999, background: 'linear-gradient(135deg, var(--accent), rgba(17,24,39,0.7))' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', border: `3px solid ${copy.bg}`, background: '#fff' }}>
                    {mediaUrl ? <StorefrontMedia src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span />}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#374151', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{highlight.title}</div>
              </button>
            )
          })}
        </div>
      )}

      {uniqueCats.length > 0 && (
        <div style={{
          padding: '18px 18px 0',
          display: preset === 'marketplace' ? 'grid' : 'flex',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          overflowX: preset === 'marketplace' ? undefined : 'auto',
          scrollbarWidth: 'none',
        }}>
          {uniqueCats.slice(0, preset === 'marketplace' ? 6 : 8).map((c, idx) => (
            <button
              key={c}
              onClick={() => onShowCatalog(c)}
              style={{
                flexShrink: 0,
                minWidth: preset === 'marketplace' ? undefined : 126,
                minHeight: preset === 'marketplace' ? 78 : 44,
                borderRadius: preset === 'minimal' ? 999 : preset === 'boutique' ? 18 : 16,
                border: presetBorder(preset),
                background: preset === 'marketplace' ? '#ffffff' : 'rgba(255,255,255,0.82)',
                padding: preset === 'marketplace' ? '12px 13px' : '0 15px',
                textAlign: preset === 'marketplace' ? 'left' : 'center',
                boxShadow: preset === 'marketplace' ? '0 12px 24px rgba(15,23,42,0.06)' : '0 8px 18px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{c}</div>
              <div style={{ marginTop: preset === 'marketplace' ? 5 : 0, fontSize: 11, color: '#6b7280' }}>{catCounts[c]} товаров</div>
            </button>
          ))}
        </div>
      )}

      {announcement && (
        <div style={{ padding: '18px 18px 0' }}>
          <button onClick={() => openAnnouncement(announcement)} style={{
            width: '100%', minHeight: 76, borderRadius: preset === 'minimal' ? 12 : 20, border: presetBorder(preset),
            background: '#ffffff',
            textAlign: 'left',
            padding: '14px 15px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            boxShadow: presetShadow(preset),
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Объявление</div>
              <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.25, fontWeight: 850, color: '#111827' }}>{announcement.title || announcement.caption}</div>
              {announcement.caption && announcement.title && (
                <div style={{ marginTop: 3, fontSize: 12, color: '#6b7280', lineHeight: 1.3 }}>{announcement.caption}</div>
              )}
            </div>
            {announcement.cta_text && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent)', fontSize: 12, fontWeight: 850, flexShrink: 0 }}>
                {announcement.cta_text}
              </div>
            )}
            <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="chevronRight" size={18} color="white" />
            </div>
          </button>
        </div>
      )}

      {activeProducts.length > 0 ? (
        <div style={{ padding: '24px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{copy.section}</div>
              <h2 style={{ margin: '5px 0 0', fontSize: 22, lineHeight: 1.05, letterSpacing: '-0.035em', color: '#111827' }}>{copy.productTitle}</h2>
            </div>
            <button onClick={() => onShowCatalog()} style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>Все</button>
          </div>

          {preset === 'food' && featured.length > 0 && (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14 }}>
              {featured.slice(0, 4).map((p: any) => (
                <PresetProductCard
                  key={p.id}
                  p={p}
                  shop={shop}
                  preset={preset}
                  featured
                  wishlistIds={wishlistIds}
                  justAdded={justAdded}
                  toggleWishlist={toggleWishlist}
                  handleQuickAdd={handleQuickAdd}
                  handleViewProduct={handleViewProduct}
                />
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: preset === 'minimal' ? 12 : 11 }}>
            {activeProducts.slice(0, preset === 'minimal' ? 5 : 6).map((p: any) => (
              <PresetProductCard
                key={p.id}
                p={p}
                shop={shop}
                preset={preset}
                wishlistIds={wishlistIds}
                justAdded={justAdded}
                toggleWishlist={toggleWishlist}
                handleQuickAdd={handleQuickAdd}
                handleViewProduct={handleViewProduct}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛍</div>
          <p style={{ fontSize: 14 }}>Товары появятся скоро</p>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <TrustStrip shop={shop} shopStats={shopStats} />
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HomeTab({ shop, tenantId, products, onProduct, onShowCatalog }: Props) {
  const qc = useQueryClient()
  const addToCart = useCart(s => s.add)
  const activeProducts = products.filter((p: any) => p.is_active)
  const featuredProducts = activeProducts.filter((p: any) => p.is_featured)
  const featured = (featuredProducts.length > 0 ? featuredProducts : activeProducts).slice(0, 5)
  const preview = activeProducts.slice(0, 4)

  const uniqueCats = Array.from(new Set(activeProducts.map(categoryName).filter(Boolean))) as string[]
  const catCounts: Record<string, number> = {}
  for (const c of uniqueCats) catCounts[c] = activeProducts.filter((p: any) => categoryName(p) === c).length

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
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null)
  const [storyProgress, setStoryProgress] = useState(0)
  const storyHighlights = useMemo(
    () => buildStoryHighlights(stories as any[]),
    [stories],
  )
  const storyViewerItems = useMemo(
    () => storyHighlights.flatMap((highlight, highlightIndex) =>
      highlight.items.map((story, storyIndex) => ({
        ...story,
        __highlight_id: highlight.id,
        __highlight_title: highlight.title,
        __highlight_index: highlightIndex,
        __story_index: storyIndex,
      })),
    ),
    [storyHighlights],
  )
  const activeStory = activeStoryId ? storyViewerItems.find((s: any) => s.id === activeStoryId) ?? null : null
  const activeStoryIndex = activeStory ? storyViewerItems.findIndex((s: any) => s.id === activeStory.id) : -1
  const activeHighlight = activeStory
    ? storyHighlights.find((highlight) => highlight.id === activeStory.__highlight_id)
    : null
  const activeHighlightStoryIndex = activeHighlight && activeStory
    ? activeHighlight.items.findIndex((s: any) => s.id === activeStory.id)
    : -1

  function openStory(item: any) {
    if (item?.id) setActiveStoryId(item.id)
  }

  function goToStory(index: number) {
    if (index < 0) {
      setActiveStoryId(storyViewerItems[0]?.id ?? null)
      return
    }
    if (index >= storyViewerItems.length) {
      setActiveStoryId(null)
      return
    }
    setActiveStoryId(storyViewerItems[index].id)
  }

  useEffect(() => {
    if (!activeStory) return
    setStoryProgress(0)
    const interval = setInterval(() => {
      setStoryProgress(p => {
        if (p >= 100) {
          goToStory(activeStoryIndex + 1)
          return 0
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [activeStory?.id, activeStoryIndex, storyViewerItems.length])

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

  // Story viewer overlay — shared across all layouts
  const storyOverlay = activeStory ? (
    <div
      style={{ position: 'fixed', inset: 0, background: '#050507', zIndex: 200, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: '12px 12px 8px' }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
          {(activeHighlight?.items ?? [activeStory]).map((s: any, index: number) => (
            <div key={s.id ?? index} style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.34)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: 999,
                background: 'white',
                width: index < activeHighlightStoryIndex ? '100%' : index === activeHighlightStoryIndex ? `${storyProgress}%` : '0%',
                transition: index === activeHighlightStoryIndex ? 'width 0.1s linear' : 'none',
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }}>
            <StorefrontMedia src={activeHighlight?.coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, color: 'white', fontSize: 13, fontWeight: 850, textShadow: '0 1px 10px rgba(0,0,0,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeHighlight?.title || activeStory.title || 'Story'}
          </div>
          <button
            type="button"
            onClick={() => setActiveStoryId(null)}
            style={{ width: 34, height: 34, borderRadius: 999, background: 'rgba(255,255,255,0.14)', color: 'white', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Закрыть stories"
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', zIndex: 12 }}>
        <button
          type="button"
          onClick={() => goToStory(activeStoryIndex - 1)}
          aria-label="Предыдущая story"
          style={{ background: 'transparent', border: 'none' }}
        />
        <button
          type="button"
          onClick={() => goToStory(activeStoryIndex + 1)}
          aria-label="Следующая story"
          style={{ background: 'transparent', border: 'none' }}
        />
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {storyMediaUrl(activeStory) ? (
          <StorefrontMedia src={storyMediaUrl(activeStory)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, background: 'linear-gradient(145deg, #111827, #0f766e)' }}>🎬</div>
        )}
        {(activeStory.title || activeStory.caption || activeStory.cta_text) && (
          <div
            data-story-bottom-center
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 18,
              padding: '96px 22px 34px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 48%, transparent 100%)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {activeStory.title && (
              <div style={{ maxWidth: 320, fontSize: 24, color: 'white', lineHeight: 1.08, fontWeight: 950, letterSpacing: '-0.035em', marginBottom: activeStory.caption ? 8 : 0 }}>
                {activeStory.title}
              </div>
            )}
            {activeStory.caption && (
              <p style={{ maxWidth: 320, fontSize: 15, color: 'rgba(255,255,255,0.92)', lineHeight: 1.45, marginBottom: activeStory.cta_text ? 14 : 0, fontWeight: 650 }}>
                {activeStory.caption}
              </p>
            )}
            {activeStory.cta_text && (
              <button
                type="button"
                onClick={() => openStoryTarget(activeStory, onShowCatalog)}
                style={{
                  pointerEvents: 'auto',
                  minHeight: 46,
                  maxWidth: '92%',
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: 'white',
                  color: '#111827',
                  fontWeight: 900,
                  fontSize: 14,
                  lineHeight: 1.15,
                  textAlign: 'center',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  boxShadow: '0 14px 30px rgba(0,0,0,0.24)',
                }}
              >
                {activeStory.cta_text}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null

  const layout = shop.layout ?? shop.settings?.layout ?? 'boutique'
  const preset = PRESET_ALIASES[layout] ?? 'boutique'

  const sharedLayoutProps = {
    shop, tenantId, activeProducts, onProduct, onShowCatalog,
    stories: stories as any[], shopStats, wishlistIds,
    justAdded, toggleWishlist, handleQuickAdd, handleViewProduct, setActiveStory: openStory,
  }

  if (['boutique', 'marketplace', 'food', 'minimal'].includes(preset)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <PresetStorefront
          preset={preset}
          shop={shop}
          activeProducts={activeProducts}
          onShowCatalog={onShowCatalog}
          stories={stories as any[]}
          shopStats={shopStats}
          uniqueCats={uniqueCats}
          catCounts={catCounts}
          wishlistIds={wishlistIds}
          justAdded={justAdded}
          toggleWishlist={toggleWishlist}
          handleQuickAdd={handleQuickAdd}
          handleViewProduct={handleViewProduct}
          setActiveStory={openStory}
        />
        {storyOverlay}
      </div>
    )
  }

  // ── Catalog ──
  if (layout === 'catalog') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <CatalogLayout {...sharedLayoutProps} uniqueCats={uniqueCats} catCounts={catCounts} />
        {storyOverlay}
      </div>
    )
  }

  // ── Lookbook ──
  if (layout === 'lookbook') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <LookbookLayout {...sharedLayoutProps} featured={featured} />
        {storyOverlay}
      </div>
    )
  }

  // ── Marketplace ──
  if (layout === 'marketplace') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <MarketplaceLayout {...sharedLayoutProps} uniqueCats={uniqueCats} catCounts={catCounts} />
        {storyOverlay}
      </div>
    )
  }

  // ── Bento ──
  if (layout === 'bento') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <BentoLayout {...sharedLayoutProps} />
        {storyOverlay}
      </div>
    )
  }

  // ── Boutique (default) ──────────────────────────────────────────────────────
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
        {storyHighlights.length > 0 && (
          <div style={{ padding: '12px 16px 0', display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {storyHighlights.map((highlight) => (
              <button
                key={highlight.id}
                onClick={() => openStory(highlight.items[0])}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{
                  width: 60, height: 60, borderRadius: 999,
                  padding: 2,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #005c40 100%)',
                  flexShrink: 0,
                }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', border: '2px solid var(--bg)', background: 'var(--subtle)' }}>
                    {highlight.coverUrl
                      ? <StorefrontMedia src={highlight.coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎬</div>
                    }
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 500, maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {highlight.title}
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

        {/* About block */}
        {shop.settings?.about_block_enabled !== false && (shop.description || shop.contact_info?.phone || shop.contact_info?.telegram || shop.contact_info?.instagram || shop.contact_info?.address || shop.settings?.working_hours) && (
          <div style={{ padding: '0 16px 20px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>О магазине</div>
              {shop.description && (
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>{shop.description}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {shop.contact_info?.phone && (
                  <a href={`tel:${shop.contact_info.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <span style={{ fontSize: 16 }}>📞</span>
                    <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>{shop.contact_info.phone}</span>
                  </a>
                )}
                {shop.contact_info?.telegram && (
                  <a href={`https://t.me/${shop.contact_info.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <span style={{ fontSize: 16 }}>✈️</span>
                    <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>{shop.contact_info.telegram.startsWith('@') ? shop.contact_info.telegram : `@${shop.contact_info.telegram}`}</span>
                  </a>
                )}
                {shop.contact_info?.instagram && (
                  <a href={`https://instagram.com/${shop.contact_info.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <span style={{ fontSize: 16 }}>📸</span>
                    <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>{shop.contact_info.instagram.startsWith('@') ? shop.contact_info.instagram : `@${shop.contact_info.instagram}`}</span>
                  </a>
                )}
                {shop.contact_info?.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
                    <span style={{ fontSize: 14, color: 'var(--muted)' }}>{shop.contact_info.address}</span>
                  </div>
                )}
                {shop.settings?.working_hours && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>🕐</span>
                    <span style={{ fontSize: 14, color: 'var(--muted)' }}>{shop.settings.working_hours}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reviews summary block */}
        {shop.settings?.reviews_enabled !== false && (shopStats?.review_count ?? 0) > 0 && shopStats && (
          <div style={{ padding: '0 16px 20px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Отзывы покупателей</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)', lineHeight: 1, fontFamily: 'JetBrains Mono' }}>
                    {shopStats.avg_rating != null ? Number(shopStats.avg_rating).toFixed(1) : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 4, justifyContent: 'center' }}>
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= Math.round(shopStats.avg_rating ?? 0) ? '#F59E0B' : 'var(--border)'}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                    {shopStats.review_count} {shopStats.review_count === 1 ? 'отзыв' : shopStats.review_count < 5 ? 'отзыва' : 'отзывов'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    {shopStats.customer_count >= 10 && `${shopStats.customer_count}+ довольных покупателей`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
      {storyOverlay}
    </div>
  )
}
