import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useTelegram } from '@/hooks/useTelegram'
import { CatalogContent } from '@/pages/customer/Storefront'
import { HomeTab } from '@/pages/customer/HomeTab'
import { CartTab } from '@/pages/customer/CartTab'
import { ProfileTab } from '@/pages/customer/ProfileTab'
import { ProductPage } from '@/pages/customer/ProductPage'
import { Checkout } from '@/pages/customer/Checkout'
import { SellerApp } from '@/pages/seller/SellerApp'
import { useCart } from '@/store/cart'
import { Icon } from '@/components/Icon'

/**
 * URL param logic:
 *
 *  ?shop=slug  →  merchant's own bot opened the mini app.
 *                 Check role: if caller is the owner → seller admin panel
 *                             if caller is a buyer  → storefront
 *
 *  (no ?shop)  →  Dokonly master bot. New merchant onboarding / registration.
 */
const SHOP_SLUG = new URLSearchParams(window.location.search).get('shop')

export type BuyerScreen = 'storefront' | 'product' | 'checkout'
type BuyerTab = 'home' | 'catalog' | 'cart' | 'profile'

// ─── Theme ───────────────────────────────────────────────────────────────────

const ACCENT_COLORS: Record<string, [string, string]> = {
  forest:   ['#0F766E', 'rgba(15,118,110,0.12)'],
  emerald:  ['#00B383', 'rgba(0,179,131,0.12)'],
  mint:     ['#10B981', 'rgba(16,185,129,0.12)'],
  lime:     ['#65A30D', 'rgba(101,163,13,0.12)'],
  ocean:    ['#0284C7', 'rgba(2,132,199,0.12)'],
  sky:      ['#0EA5E9', 'rgba(14,165,233,0.12)'],
  indigo:   ['#4F46E5', 'rgba(79,70,229,0.12)'],
  sunset:   ['#EA580C', 'rgba(234,88,12,0.12)'],
  coral:    ['#E11D48', 'rgba(225,29,72,0.12)'],
  rose:     ['#DB2777', 'rgba(219,39,119,0.12)'],
  graphite: ['#1F2937', 'rgba(31,41,55,0.12)'],
  sand:     ['#B45309', 'rgba(180,83,9,0.12)'],
}

const TYPOGRAPHY_BUNDLES: Record<string, [string, string]> = {
  modern:    ["'Sora', system-ui, sans-serif",                "'Outfit', system-ui, sans-serif"],
  editorial: ["'Instrument Serif', Georgia, serif",           "'Inter', system-ui, sans-serif"],
  bold:      ["'Bricolage Grotesque', system-ui, sans-serif", "'Inter', system-ui, sans-serif"],
  warm:      ["'Fraunces', Georgia, serif",                   "'Outfit', system-ui, sans-serif"],
}

function applyShopTheme(accentColor: string, typographyBundle?: string) {
  const [accent, accentSoft] = ACCENT_COLORS[accentColor] ?? ACCENT_COLORS.emerald
  document.documentElement.style.setProperty('--accent', accent)
  document.documentElement.style.setProperty('--accent-soft', accentSoft)

  const [fontDisplay, fontBody] = TYPOGRAPHY_BUNDLES[typographyBundle ?? 'modern'] ?? TYPOGRAPHY_BUNDLES.modern
  document.documentElement.style.setProperty('--font-display', fontDisplay)
  document.documentElement.style.setProperty('--font-body', fontBody)
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        border: '3px solid var(--accent)', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ShopNotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 999, background: 'var(--subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <path d="M9 22V12h6v10"/>
        </svg>
      </div>
      <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 22, marginBottom: 8, color: 'var(--ink)' }}>
        Магазин не найден
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>
        Проверьте ссылку или обратитесь к продавцу.
      </p>
    </div>
  )
}

// ─── Bottom navigation ────────────────────────────────────────────────────────

interface BottomNavProps {
  tab: BuyerTab
  onTab: (t: BuyerTab) => void
  cartCount: number
}

function BottomNav({ tab, onTab, cartCount }: BottomNavProps) {
  const tabs: { id: BuyerTab; label: string; icon: string }[] = [
    { id: 'home',    label: 'Главная', icon: 'home' },
    { id: 'catalog', label: 'Каталог', icon: 'search' },
    { id: 'cart',    label: 'Корзина', icon: 'cart' },
    { id: 'profile', label: 'Профиль', icon: 'star' },
  ]

  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 40,
      background: 'var(--bg)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch',
      height: `calc(64px + env(safe-area-inset-bottom))`,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(t => {
        const active = tab === t.id
        return (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              position: 'relative',
              color: active ? 'var(--accent)' : 'var(--muted)',
              transition: 'color 0.15s',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon name={t.icon} size={22} color={active ? 'var(--accent)' : 'var(--muted)'}/>
              {t.id === 'cart' && cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -7,
                  minWidth: 17, height: 17, borderRadius: 999,
                  background: '#EF4444', color: 'white',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, lineHeight: 1 }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Channel Gate Screen ─────────────────────────────────────────────────────

function ChannelGateScreen({ channel, tenantId, onUnlock }: { channel: string; tenantId: string; onUnlock: () => void }) {
  const handle = channel.startsWith('@') ? channel.slice(1) : channel
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function handleCheck() {
    setChecking(true)
    setError('')
    try {
      const result = await api.checkChannelMembership(tenantId)
      if (result.is_member) {
        onUnlock()
      } else {
        setError('Вы ещё не подписаны. Подпишитесь на канал и попробуйте снова.')
      }
    } catch {
      setError('Не удалось проверить подписку. Попробуйте снова.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 999, background: 'var(--subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 12 }}>
        Магазин закрыт
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32, maxWidth: 280 }}>
        Чтобы открыть магазин, подпишитесь на Telegram-канал <b>@{handle}</b>
      </p>
      <button
        onClick={() => {
          const url = `https://t.me/${handle}`;
          (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, '_blank')
        }}
        style={{
          width: '100%', maxWidth: 280, height: 52, borderRadius: 14,
          background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15,
          marginBottom: 12, border: 'none', cursor: 'pointer',
        }}
      >
        Подписаться на канал
      </button>
      {error && (
        <div style={{
          maxWidth: 280, marginBottom: 12, padding: '10px 14px',
          borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: 13,
        }}>
          {error}
        </div>
      )}
      <button
        onClick={handleCheck}
        disabled={checking}
        style={{
          fontSize: 14, color: 'var(--muted)', fontWeight: 500, padding: '8px 0',
          background: 'none', border: 'none', cursor: checking ? 'not-allowed' : 'pointer',
          opacity: checking ? 0.6 : 1,
        }}
      >
        {checking ? 'Проверяем...' : 'Я подписался ✓'}
      </button>
    </div>
  )
}

// ─── AI Consultant ───────────────────────────────────────────────────────────

type ChatMsg = { role: 'user' | 'assistant'; content: string }

function AiConsultantView({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const suggestions = ['Что новенького?', 'Хиты продаж', 'Гид по размерам']

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const userMsg: ChatMsg = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await api.aiChat(tenantId, next)
      setMessages([...next, { role: 'assistant', content: res.reply }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Извините, не удалось получить ответ. Попробуйте позже.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
            AI Консультант
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Онлайн · Отвечает мгновенно</div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 999, background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>🤖</span>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Welcome message */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
          </div>
          <div style={{
            maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 12px 4px',
            background: 'var(--card)', border: '1px solid var(--border)',
            fontSize: 14, color: 'var(--ink)', lineHeight: 1.5,
          }}>
            Привет! Я ваш AI-помощник. Спрашивайте о товарах!
          </div>
        </div>

        {/* Suggestion chips (only when no messages sent yet) */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 40 }}>
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  border: '1px solid var(--accent)', cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
          }}>
            {m.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>🤖</span>
              </div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
              borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--card)',
              color: m.role === 'user' ? 'white' : 'var(--ink)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
            </div>
            <div style={{
              padding: '12px 16px', borderRadius: '12px 12px 12px 4px',
              background: 'var(--card)', border: '1px solid var(--border)',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: 999, background: 'var(--muted)',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
              <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)} }`}</style>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border)',
        background: 'var(--bg)', display: 'flex', gap: 8, alignItems: 'flex-end',
        flexShrink: 0, paddingBottom: `calc(12px + env(safe-area-inset-bottom))`,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="Напишите вопрос..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12, fontSize: 14,
            border: '1.5px solid var(--border)', background: 'var(--card)',
            color: 'var(--ink)', outline: 'none', resize: 'none',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: input.trim() && !loading ? 'var(--accent)' : 'var(--subtle)',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? 'white' : 'var(--muted)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── ShopApp ─────────────────────────────────────────────────────────────────

/**
 * Opened via merchant's own bot (?shop=slug).
 * Loads shop info + role check in parallel, then routes to admin or storefront.
 */
function ShopApp() {
  useTelegram()
  const slug = SHOP_SLUG!

  const [tab, setTab] = useState<BuyerTab>('home')
  const [productId, setProductId] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [gateUnlocked, setGateUnlocked] = useState(false)
  const [catalogInitCat, setCatalogInitCat] = useState<string | undefined>(undefined)
  const [showAiConsultant, setShowAiConsultant] = useState(false)

  const cartCount = useCart((s) => s.count)()

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => api.getShop(slug),
    retry: false,
  })

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['shop-role', slug],
    queryFn: () => api.getShopRole(slug),
    retry: false,
    enabled: !!shop,
  })

  // Fetch products once at the top — TanStack Query cache deduplicates
  const { data: products = [] } = useQuery({
    queryKey: ['products', shop?.id],
    queryFn: () => api.getProducts(shop!.id) as Promise<any[]>,
    enabled: !!shop?.id,
  })

  // Apply merchant theme when shop data arrives (buyer only)
  useEffect(() => {
    if (shop && roleData?.role !== 'owner') {
      applyShopTheme(shop.accent_color ?? 'emerald', shop.typography_bundle ?? shop.settings?.typography_bundle)
    }
  }, [shop, roleData])

  if (shopLoading || (shop && roleLoading)) return <Spinner />
  if (!shop) return <ShopNotFound />

  const gateEnabled = shop.settings?.channel_subscription_gate === true
  const channelUsername = shop.settings?.channel_username as string | undefined

  if (gateEnabled && channelUsername && !gateUnlocked && !roleLoading && roleData?.role !== 'owner') {
    return <ChannelGateScreen channel={channelUsername} tenantId={shop.id} onUnlock={() => setGateUnlocked(true)} />
  }

  // Owner → seller admin panel for this shop
  if (roleData?.role === 'owner') {
    return <SellerApp tenantSlug={slug} shop={shop} />
  }

  // Tab switch — clear product detail
  const handleTabChange = (t: BuyerTab) => {
    setProductId(null)
    if (t !== 'catalog') setCatalogInitCat(undefined)
    setTab(t)
  }

  const handleShowCatalog = (category?: string) => {
    setCatalogInitCat(category)
    setProductId(null)
    setTab('catalog')
  }

  // AI Consultant overlay
  if (showAiConsultant) {
    return <AiConsultantView tenantId={shop.id} onClose={() => setShowAiConsultant(false)} />
  }

  // Checkout flow (full screen, no tabs)
  if (showCheckout) {
    return (
      <Checkout
        tenantId={shop.id}
        currency={shop.currency}
        shopSettings={shop.settings}
        onBack={() => setShowCheckout(false)}
        onDone={() => { setShowCheckout(false); handleTabChange('home') }}
        onTrackOrder={() => { setShowCheckout(false); handleTabChange('profile') }}
      />
    )
  }

  // Product detail overlay (over current tab)
  if (productId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        <ProductPage
          tenantId={shop.id}
          productId={productId}
          currency={shop.currency}
          shopSlug={slug}
          botUsername={(shop as any).bot_username}
          onBack={() => setProductId(null)}
          onCheckout={() => setShowCheckout(true)}
          onProduct={setProductId}
        />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tab === 'home' && (
          <HomeTab
            shop={shop}
            tenantId={shop.id}
            products={products}
            onProduct={setProductId}
            onShowCatalog={handleShowCatalog}
          />
        )}
        {tab === 'catalog' && (
          <CatalogContent
            shop={shop}
            onProduct={setProductId}
            initialCategory={catalogInitCat}
          />
        )}
        {tab === 'cart' && (
          <CartTab
            currency={shop.currency}
            tenantId={shop.id}
            shopSettings={shop.settings}
            onCheckout={() => setShowCheckout(true)}
            onShowCatalog={() => handleTabChange('catalog')}
          />
        )}
        {tab === 'profile' && (
          <ProfileTab
            tenantId={shop.id}
            currency={shop.currency}
            shop={shop}
            onProduct={setProductId}
          />
        )}
      </div>

      {/* AI Consultant floating button — Premium feature */}
      {shop.settings?.ai_consultant_enabled && (
        <button
          onClick={() => setShowAiConsultant(true)}
          style={{
            position: 'fixed',
            bottom: `calc(76px + env(safe-area-inset-bottom))`,
            right: 16,
            width: 52, height: 52,
            borderRadius: 999,
            background: 'var(--accent)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 30,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      <BottomNav tab={tab} onTab={handleTabChange} cartCount={cartCount} />
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  useTelegram()

  // No ?shop param → Dokonly master bot → merchant onboarding / registration
  if (!SHOP_SLUG) {
    return <SellerApp tenantSlug={null} shop={null} />
  }

  return <ShopApp />
}
