import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'
import { Onboarding } from './Onboarding'
import { HomeTab } from './tabs/HomeTab'
import { CatalogTab } from './tabs/CatalogTab'
import { OrdersTab } from './tabs/OrdersTab'
import { SettingsTab } from './tabs/SettingsTab'
import { AnalyticsTab } from './tabs/AnalyticsTab'
import { CustomersTab } from './tabs/CustomersTab'
import { MigrationTour } from './MigrationTour'

type Tab = 'home' | 'catalog' | 'orders' | 'analytics' | 'customers' | 'more'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home',      label: 'Главная',    icon: 'home'       },
  { id: 'catalog',   label: 'Товары',     icon: 'box'        },
  { id: 'orders',    label: 'Заказы',     icon: 'cart'       },
  { id: 'analytics', label: 'Статистика', icon: 'starFilled' },
  { id: 'customers', label: 'Клиенты',    icon: 'users'      },
  { id: 'more',      label: 'Ещё',        icon: 'moreH'      },
]

interface Props {
  /**
   * Slug from URL — present when opened via merchant's own bot (?shop=slug).
   * Null when opened via the Dokonly master bot (merchant registration flow).
   */
  tenantSlug: string | null
  /**
   * Pre-loaded public shop data (id, name, currency). Already fetched in App.tsx.
   * Null in the master-bot / onboarding context.
   */
  shop: { id: string; name: string; currency: string; logo_url: string | null } | null
}

function NoInitData() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
        Откройте через Telegram
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
        Панель продавца доступна только через Telegram Mini App.
      </p>
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 999,
        border: '3px solid var(--accent)', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite', marginBottom: 16,
      }}/>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function SellerApp({ tenantSlug, shop }: Props) {
  useEffect(() => {
    const pref = localStorage.getItem('dokonly_admin_theme') ?? 'system'
    const tgScheme = (window as any).Telegram?.WebApp?.colorScheme ?? 'light'
    const resolved = pref === 'system' ? tgScheme : pref
    document.documentElement.dataset.theme = resolved
  }, [])

  const [tab, setTab] = useState<Tab>('home')
  const [overrideTenant, setOverrideTenant] = useState<any>(null)
  const qc = useQueryClient()

  const hasInitData = !!window.Telegram?.WebApp?.initData

  // Fetch seller profile (tenant info + tg_user) via initData auth
  const { data: sellerMe, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-me'],
    queryFn: api.seller.me,
    enabled: hasInitData,
    retry: 2,
  })

  const tenant = overrideTenant ?? (sellerMe as any)?.tenant ?? null

  // ALL hooks must be declared before any early returns
  const [tourDismissed, setTourDismissed] = useState(false)
  const { data: pendingTour } = useQuery({
    queryKey: ['seller-pending-tour'],
    queryFn: api.seller.pendingTour,
    enabled: !!tenant,
    retry: false,
  })
  const { data: newOrdersCount } = useQuery({
    queryKey: ['seller-new-orders-count'],
    queryFn: async () => {
      const orders = await api.seller.orders('new')
      return orders.length
    },
    enabled: !!tenant,
    refetchInterval: 30000,
  })
  const { data: badges } = useQuery({
    queryKey: ['seller-badges'],
    queryFn: api.seller.badges,
    enabled: !!tenant,
    refetchInterval: 60000,
    retry: false,
  })

  // Early returns after all hooks
  if (!hasInitData) return <NoInitData />
  if (isLoading) return <Spinner label="Загружаем магазин..." />
  if (isError) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📶</div>
      <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
        Нет соединения
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
        Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова.
      </p>
      <button
        onClick={() => refetch()}
        style={{
          padding: '14px 32px', borderRadius: 14,
          background: 'var(--accent)', color: 'white',
          fontWeight: 700, fontSize: 15,
        }}
      >
        Попробовать снова
      </button>
    </div>
  )

  // No tenant yet → onboarding wizard
  if (!tenant) {
    return (
      <Onboarding
        tgUser={(sellerMe as any)?.tg_user}
        onDone={({ tenant: newTenant, openAddProduct }) => {
          setOverrideTenant(newTenant)
          qc.invalidateQueries({ queryKey: ['seller-me'] })
          if (openAddProduct) setTab('catalog')
        }}
      />
    )
  }

  const currentShop = shop ?? { id: tenant.id, name: tenant.name, currency: tenant.currency, logo_url: tenant.logo_url }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
          {tab === 'home'      && currentShop.name}
          {tab === 'catalog'   && 'Каталог'}
          {tab === 'orders'    && `Заказы${newOrdersCount ? ` (${newOrdersCount})` : ''}`}
          {tab === 'analytics' && 'Аналитика'}
          {tab === 'customers' && 'Клиенты'}
          {tab === 'more'      && 'Ещё'}
        </div>
        {tab === 'home' && (() => {
          const tier = tenant.tier ?? 'start'
          const isTrial = !tenant.tier || tier === 'trial' || tier === 'start'
          const tierLabel = isTrial ? 'Trial' : tier.charAt(0).toUpperCase() + tier.slice(1)
          return (
            <span style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 999,
              background: isTrial ? 'var(--accent-soft)' : 'rgba(0,179,131,0.15)',
              color: 'var(--accent)', fontWeight: 700,
            }}>{tierLabel}</span>
          )
        })()}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 64 }}>
        {tab === 'home'      && <HomeTab      tenant={tenant} onTabChange={(t) => setTab(t as Tab)} />}
        {tab === 'catalog'   && <CatalogTab   tenant={tenant} />}
        {tab === 'orders'    && <OrdersTab    tenant={tenant} />}
        {tab === 'analytics' && <AnalyticsTab tenant={tenant} />}
        {tab === 'customers' && <CustomersTab tenant={tenant} />}
        {tab === 'more'      && <SettingsTab  tenant={tenant} />}
      </div>

      {/* Migration tour */}
      {pendingTour && !tourDismissed && (
        <MigrationTour tour={pendingTour} onDone={() => setTourDismissed(true)} />
      )}

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => {
          const badgeCount = t.id === 'orders'
            ? ((newOrdersCount ?? 0) + ((badges as any)?.orders ?? 0))
            : t.id === 'catalog'
            ? ((badges as any)?.products ?? 0)
            : 0
          const hasDot = t.id === 'more' && (badges as any)?.subscription
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px 0 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
              transition: 'color 0.15s',
              position: 'relative',
            }}>
              <div style={{ position: 'relative' }}>
                <Icon name={t.icon} size={22} color={tab === t.id ? 'var(--accent)' : 'var(--muted)'}/>
                {badgeCount > 0 && (
                  <div style={{
                    position: 'absolute', top: -4, right: -6,
                    minWidth: 16, height: 16, borderRadius: 999,
                    background: '#EF4444', color: 'white',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', border: '1.5px solid var(--bg)',
                  }}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </div>
                )}
                {hasDot && (
                  <div style={{
                    position: 'absolute', top: -2, right: -4,
                    width: 8, height: 8, borderRadius: 999,
                    background: '#EF4444', border: '1.5px solid var(--bg)',
                  }}/>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
