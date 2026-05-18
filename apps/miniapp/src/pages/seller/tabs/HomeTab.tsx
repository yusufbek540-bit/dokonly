import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'
import { PlanPicker } from '../PlanPicker'
import { AchievementsPage } from '../AchievementsPage'
import { StreakDetailPage } from '../StreakDetailPage'
import { MailingsView, CouponsView, AbandonedCartsView, StoriesView, LoyaltyProgramView, ReferralProgramView, ChannelCrosspostingView, TeamView } from './SettingsTab'

function HomeSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </span>
        {action}
      </div>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function HomeRow({ icon, label, value, sub, noBorder, onPress, iconColor }: {
  icon: string; label: string; value?: string | number; sub?: string;
  noBorder?: boolean; onPress?: () => void; iconColor?: string;
}) {
  const inner = (
    <>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: 'var(--subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} color={iconColor ?? 'var(--muted-strong)'} />
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
      {value !== undefined && (
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}>{value}</span>
      )}
      {onPress && <Icon name="chevronRight" size={16} color="var(--muted)" />}
    </>
  )
  const shared: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '14px 16px', background: 'var(--card)',
    borderBottom: noBorder ? 'none' : '1px solid var(--border)',
    textAlign: 'left',
  }
  return onPress
    ? <button onClick={onPress} style={{ ...shared, cursor: 'pointer' }}>{inner}</button>
    : <div style={shared}>{inner}</div>
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', shipping: 'Доставка',
  delivered: 'Доставлен', completed: 'Завершён', cancelled: 'Отменён',
}
const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6', confirmed: '#8B5CF6', shipping: '#F59E0B',
  delivered: '#10B981', completed: '#00B383', cancelled: '#EF4444',
}

interface Props {
  tenant: any
  onTabChange?: (tab: string, deepLink?: string) => void
}

function MenuRow({ icon, label, value, last, onPress, badge }: { icon: string; label: string; value?: string; last?: boolean; onPress?: () => void; badge?: React.ReactNode }) {
  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '14px 16px', background: 'var(--card)', textAlign: 'left',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        cursor: onPress ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: 'var(--subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} color="var(--muted-strong)" />
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
      {badge}
      {value && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{value}</span>}
      <Icon name="chevronRight" size={15} color="var(--muted)" />
    </button>
  )
}

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: 'На рассмотрении', approved: 'Одобрен',
  rejected: 'Отклонён', refunded: 'Возврат выполнен', exchanged: 'Обмен',
}
const RETURN_STATUS_COLORS: Record<string, string> = {
  requested: '#F59E0B', approved: '#3B82F6',
  rejected: '#EF4444', refunded: '#10B981', exchanged: '#8B5CF6',
}

function SellerHelpView({ onBack }: { onBack: () => void }) {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['help-articles'],
    queryFn: () => api.getHelpArticles(),
    retry: false,
  })
  const [expanded, setExpanded] = useState<string | null>(null)

  const grouped = (articles as { id: string; category: string; title: string; content: string; slug: string }[]).reduce(
    (acc, a) => {
      if (!acc[a.category]) acc[a.category] = []
      acc[a.category].push(a)
      return acc
    },
    {} as Record<string, typeof articles>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="chevronLeft" size={22} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>FAQ и помощь</span>
      </div>
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (articles as any[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)', fontSize: 14 }}>
            Статьи пока не добавлены
          </div>
        ) : Object.entries(grouped).map(([category, cats]) => (
          <div key={category}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{category}</div>
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {(cats as any[]).map((a: any, i: number, arr: any[]) => (
                <div key={a.id}>
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--card)', borderBottom: i < arr.length - 1 || expanded === a.id ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{a.title}</span>
                    <Icon name={expanded === a.id ? 'chevronDown' : 'chevronRight'} size={15} color="var(--muted)" />
                  </button>
                  {expanded === a.id && (
                    <div style={{ padding: '14px 16px', background: 'var(--subtle)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{a.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Contact support link */}
        <button
          onClick={() => (window.Telegram?.WebApp as any)?.openTelegramLink('https://t.me/dokonly_support')}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, background: 'var(--card)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Написать в поддержку</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>@dokonly_support_bot</div>
          </div>
          <Icon name="chevronRight" size={15} color="var(--muted)" />
        </button>
      </div>
    </div>
  )
}

function SellerReturnsView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['seller-returns'],
    queryFn: api.seller.returns,
  })
  const [selected, setSelected] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.seller.approveReturn(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-returns'] }); setSelected(null) },
  })
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.seller.rejectReturn(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-returns'] }); setSelected(null); setShowReject(false); setRejectReason('') },
  })
  const refundMutation = useMutation({
    mutationFn: (id: string) => api.seller.markReturnRefunded(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-returns'] }); setSelected(null) },
  })

  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => { setSelected(null); setShowReject(false); setRejectReason('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="chevronLeft" size={22} color="var(--ink)" />
          </button>
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Возврат #{selected.id?.slice(0, 8).toUpperCase()}</span>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Статус</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: RETURN_STATUS_COLORS[selected.status] ?? 'var(--muted)' }}>
                {RETURN_STATUS_LABELS[selected.status] ?? selected.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Заказ</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>#{selected.order_id?.slice(0, 8).toUpperCase()}</span>
            </div>
            {selected.reason && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Причина</span>
                <span style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right', maxWidth: '60%' }}>{selected.reason}</span>
              </div>
            )}
            {selected.description && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Описание</span>
                <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>{selected.description}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Дата</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{timeAgo(selected.created_at)}</span>
            </div>
          </div>

          {selected.status === 'requested' && !showReject && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => approveMutation.mutate(selected.id)}
                disabled={approveMutation.isPending}
                style={{ flex: 1, height: 46, borderRadius: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: approveMutation.isPending ? 0.7 : 1 }}
              >
                ✓ Одобрить
              </button>
              <button
                onClick={() => setShowReject(true)}
                style={{ flex: 1, height: 46, borderRadius: 12, background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
              >
                ✕ Отклонить
              </button>
            </div>
          )}
          {showReject && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                placeholder="Причина отклонения..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowReject(false)} style={{ flex: 1, height: 46, borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                  Назад
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ id: selected.id, reason: rejectReason })}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  style={{ flex: 2, height: 46, borderRadius: 12, background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: (!rejectReason.trim() || rejectMutation.isPending) ? 0.6 : 1 }}
                >
                  Подтвердить отклонение
                </button>
              </div>
            </div>
          )}
          {selected.status === 'approved' && (
            <button
              onClick={() => refundMutation.mutate(selected.id)}
              disabled={refundMutation.isPending}
              style={{ width: '100%', height: 46, borderRadius: 12, background: '#10B981', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: refundMutation.isPending ? 0.7 : 1 }}
            >
              💰 Возврат выполнен
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="chevronLeft" size={22} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Возвраты</span>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (returns as any[]).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <p>Нет возвратов</p>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(returns as any[]).map((r: any) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', width: '100%' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
                  Возврат #{r.id?.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Заказ #{r.order_id?.slice(0, 8).toUpperCase()} · {timeAgo(r.created_at)}</div>
                {r.reason && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.reason}</div>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: RETURN_STATUS_COLORS[r.status] ?? 'var(--muted)', borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
                {RETURN_STATUS_LABELS[r.status] ?? r.status}
              </span>
              <Icon name="chevronRight" size={15} color="var(--muted)" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function HomeTab({ tenant, onTabChange }: Props) {
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showStreak, setShowStreak] = useState(false)
  const [showMailings, setShowMailings] = useState(false)
  const [showCoupons, setShowCoupons] = useState(false)
  const [showStories, setShowStories] = useState(false)
  const [showLoyaltyProgram, setShowLoyaltyProgram] = useState(false)
  const [showReferralProgram, setShowReferralProgram] = useState(false)
  const [showChannelCrossposting, setShowChannelCrossposting] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const [showAbandonedCarts, setShowAbandonedCarts] = useState(false)
  const [showReturns, setShowReturns] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showNewOrderSheet, setShowNewOrderSheet] = useState(false)
  const [newOrderName, setNewOrderName] = useState('')
  const [newOrderPhone, setNewOrderPhone] = useState('')
  const [newOrderNote, setNewOrderNote] = useState('')
  const [newOrderTotal, setNewOrderTotal] = useState('')
  const [creatingOrder, setCreatingOrder] = useState(false)
  const { data: summary } = useQuery({ queryKey: ['seller-analytics', 'all'], queryFn: () => api.seller.analytics('all') })
  const { data: weekSummary } = useQuery({
    queryKey: ['seller-analytics', 'week'],
    queryFn: () => api.seller.analytics('week'),
    staleTime: 5 * 60 * 1000,
  })
  const { data: monthSummary } = useQuery({
    queryKey: ['seller-analytics', 'month'],
    queryFn: () => api.seller.analytics('month'),
    staleTime: 5 * 60 * 1000,
  })
  const { data: orders = [] } = useQuery({ queryKey: ['seller-orders'], queryFn: () => api.seller.orders() })
  const recentOrders = orders.slice(0, 3)

  const { data: achievements } = useQuery({ queryKey: ['seller-achievements'], queryFn: api.seller.achievements })


  // Subscription state machine
  const isTrial = !tenant.tier || tenant.tier === 'trial' || tenant.tier === 'start'
  const createdAt = tenant.created_at ? new Date(tenant.created_at) : new Date()
  const trialEndDate = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysPassed = Math.floor((now.getTime() - createdAt.getTime()) / msPerDay)
  const daysRemaining = Math.max(0, 14 - daysPassed)
  const trialProgressPct = Math.min(100, (daysPassed / 14) * 100)
  const trialExpiredDaysAgo = daysPassed > 14 ? daysPassed - 14 : 0
  const trialEndFormatted = trialEndDate.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })

  type TrialState = 'early' | 'warning' | 'offer50' | 'expired_winback' | 'expired'
  const trialState: TrialState = daysPassed <= 10 ? 'early'
    : daysPassed <= 12 ? 'warning'
    : daysPassed <= 14 ? 'offer50'
    : trialExpiredDaysAgo <= 7 ? 'expired_winback'
    : 'expired'

  const daysWord = (n: number) => n === 1 ? 'день' : n < 5 ? 'дня' : 'дней'

  const shopUrl = `https://dokonly-miniapp.pages.dev?shop=${tenant.slug}`

  const stats = [
    { label: 'Выручка', value: summary ? fmtPrice(summary.total_revenue, tenant.currency) : '—', icon: 'creditCard' },
    { label: 'Заказы', value: summary?.total_orders ?? '—', icon: 'box' },
    { label: 'Новые', value: summary?.new_orders ?? '—', icon: 'starFilled' },
    { label: 'Товары', value: summary?.product_count ?? '—', icon: 'cart' },
  ]

  // Dynamic quick action ordering: prioritize based on merchant state
  const hasProducts = (summary?.product_count ?? 0) > 0
  const hasOrders = (summary?.total_orders ?? 0) > 0
  const hasMailings = false // mailings not in summary
  const allQuickActions = [
    {
      label: '+ Товар',
      priority: hasProducts ? 3 : 1,
      onPress: () => onTabChange?.('catalog'),
    },
    {
      label: 'Заказы',
      priority: hasOrders ? 2 : 4,
      onPress: () => onTabChange?.('orders'),
    },
    {
      label: 'Рассылка',
      priority: hasProducts && hasOrders ? 3 : 2,
      onPress: () => onTabChange?.('more'),
    },
    {
      label: 'Магазин',
      priority: 4,
      onPress: () => {
        if ((window as any).Telegram?.WebApp?.openLink) {
          (window as any).Telegram.WebApp.openLink(shopUrl)
        } else {
          window.open(shopUrl, '_blank')
        }
      },
    },
    {
      label: 'Скопировать',
      priority: 5,
      onPress: () => navigator.clipboard?.writeText(shopUrl),
    },
    {
      label: '➕ Новый заказ',
      priority: 6,
      onPress: () => setShowNewOrderSheet(true),
    },
  ]
  const quickActions = [...allQuickActions].sort((a, b) => a.priority - b.priority).slice(0, 5)
  void hasMailings

  if (showMailings) return <MailingsView onBack={() => setShowMailings(false)} />
  if (showCoupons) return <CouponsView onBack={() => setShowCoupons(false)} />
  if (showStories) return <StoriesView onBack={() => setShowStories(false)} />
  if (showLoyaltyProgram) return <LoyaltyProgramView onBack={() => setShowLoyaltyProgram(false)} />
  if (showReferralProgram) return <ReferralProgramView onBack={() => setShowReferralProgram(false)} />
  if (showChannelCrossposting) return <ChannelCrosspostingView tenant={tenant} onBack={() => setShowChannelCrossposting(false)} />
  if (showTeam) return <TeamView onBack={() => setShowTeam(false)} />
  if (showAbandonedCarts) return <AbandonedCartsView onBack={() => setShowAbandonedCarts(false)} />
  if (showReturns) return <SellerReturnsView onBack={() => setShowReturns(false)} />
  if (showHelp) return <SellerHelpView onBack={() => setShowHelp(false)} />
  if (showStreak) return <StreakDetailPage onBack={() => setShowStreak(false)} daysPassed={daysPassed} />

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero Header (full-width, no padding) ── */}
      <div style={{
        position: 'relative',
        height: 200,
        overflow: 'hidden',
        background: tenant.cover_url
          ? undefined
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        backgroundImage: tenant.cover_url ? `url(${tenant.cover_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        {/* Dark overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)',
        }} />

        {/* Store name – bottom left */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 1,
        }}>
          {(() => {
            const firstName = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.first_name
            return firstName ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                Привет, {firstName}!
              </div>
            ) : null
          })()}
          <div style={{
            fontFamily: 'Sora',
            fontWeight: 700,
            fontSize: 24,
            color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {tenant.name}
          </div>
        </div>

        {/* Top-right: open bot button */}
        {tenant.bot_username && (
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1,
          }}>
            <button
              onClick={() => {
                const url = `https://t.me/${tenant.bot_username}`
                if ((window as any).Telegram?.WebApp?.openTelegramLink) {
                  (window as any).Telegram.WebApp.openTelegramLink(url)
                } else {
                  window.open(url, '_blank')
                }
              }}
              style={{
                height: 30,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '0 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Открыть магазин ›
            </button>
          </div>
        )}
      </div>

      {/* ── Padded content area ── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>

        {/* ── Subscription Status Card ── */}
        {isTrial ? (() => {
          // Badge config by state
          const badge = {
            early: { text: 'Free Trial', bg: 'linear-gradient(135deg, #00B5E2 0%, #0066CC 100%)' },
            warning: { text: 'Заканчивается', bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
            offer50: { text: '50% скидка', bg: 'linear-gradient(135deg, #FF6B35 0%, #E11D48 100%)' },
            expired_winback: { text: 'Trial истёк', bg: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' },
            expired: { text: 'Trial истёк', bg: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' },
          }[trialState]

          const progressBarColor = trialState === 'early' ? '#00B383'
            : trialState === 'warning' ? '#F59E0B'
            : '#EF4444'

          const cardBg = trialState === 'offer50'
            ? 'linear-gradient(135deg, #1a0a00 0%, #2d1200 100%)'
            : trialState === 'expired_winback' || trialState === 'expired'
            ? 'linear-gradient(135deg, #1a0000 0%, #2d0808 100%)'
            : 'linear-gradient(135deg, #0a1628 0%, #0f2744 50%, #0a1e38 100%)'

          return (
            <div style={{
              padding: '16px',
              borderRadius: 20,
              border: trialState === 'offer50' ? '1px solid rgba(255,107,53,0.3)'
                : trialState === 'expired_winback' ? '1px solid rgba(239,68,68,0.3)'
                : '1px solid rgba(99,163,255,0.2)',
              background: cardBg,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <style>{`
                @keyframes ctaPulse {
                  0%, 100% { box-shadow: 0 0 0 0 rgba(0,179,131,0.5); }
                  60% { box-shadow: 0 0 0 10px rgba(0,179,131,0); }
                }
                @keyframes offerPulse {
                  0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.5); }
                  60% { box-shadow: 0 0 0 10px rgba(255,107,53,0); }
                }
              `}</style>
              {/* Subtle glow orb */}
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 120, height: 120, borderRadius: '50%',
                background: trialState === 'offer50' ? 'rgba(255,107,53,0.12)'
                  : 'rgba(99,163,255,0.1)',
                pointerEvents: 'none',
              }} />
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 2 }}>
                    {trialState === 'offer50' ? 'Ограниченное предложение'
                      : trialState === 'expired_winback' || trialState === 'expired' ? 'Пробный период завершён'
                      : 'Пробный период'}
                  </div>
                  {(trialState === 'early' || trialState === 'warning') && (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                      Осталось {daysRemaining} {daysWord(daysRemaining)}
                    </div>
                  )}
                  {trialState === 'expired_winback' && (
                    <div style={{ fontSize: 13, color: '#FCA5A5', fontWeight: 600 }}>
                      Истёк {trialExpiredDaysAgo} {daysWord(trialExpiredDaysAgo)} назад
                    </div>
                  )}
                </div>
                <span style={{
                  background: badge.bg,
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  {badge.text}
                </span>
              </div>

              {/* Progress bar — only for early/warning states */}
              {(trialState === 'early' || trialState === 'warning') && (
                <>
                  <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      height: '100%',
                      width: `${trialProgressPct}%`,
                      borderRadius: 999,
                      background: progressBarColor,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                    Истекает {trialEndFormatted}
                  </div>
                </>
              )}

              {/* Warning state sub-text */}
              {trialState === 'warning' && (
                <div style={{ fontSize: 13, color: '#FCD34D', fontWeight: 500, marginBottom: 4 }}>
                  Подпишитесь сейчас, чтобы сохранить все функции
                </div>
              )}

              {/* 50% offer promo block */}
              {trialState === 'offer50' && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,107,53,0.08)',
                  border: '1px solid rgba(255,107,53,0.2)',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    Подпишитесь на Business
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: '#00B383' }}>
                      249 500 сум
                    </span>
                    <span style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 13,
                      color: 'var(--muted)',
                      textDecoration: 'line-through',
                    }}>
                      499 000 сум
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    50% скидка на первый месяц
                  </div>
                </div>
              )}

              {/* Expired win-back offer */}
              {trialState === 'expired_winback' && (
                <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 500, marginBottom: 12 }}>
                  🔥 30% скидка, если подпишетесь в течение 7 дней
                </div>
              )}

              {/* Expired (no offer) */}
              {trialState === 'expired' && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                  Выберите тариф, чтобы продолжить
                </div>
              )}

              {/* Primary CTA */}
              <button
                onClick={() => setShowPlanPicker(true)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: trialState === 'offer50' ? 'linear-gradient(135deg, #FF6B35 0%, #E11D48 100%)'
                    : trialState === 'expired_winback' ? '#EF4444'
                    : 'var(--accent)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  animation: trialState === 'offer50' ? 'offerPulse 2s ease-in-out infinite'
                    : 'ctaPulse 2.5s ease-in-out infinite',
                }}
              >
                {trialState === 'early' ? 'Выбрать тариф'
                  : trialState === 'warning' ? 'Смотреть тарифы'
                  : trialState === 'offer50' ? 'Получить скидку 50% →'
                  : trialState === 'expired_winback' ? 'Подписаться со скидкой 30%'
                  : 'Выбрать тариф'}
                {trialState !== 'offer50' && trialState !== 'expired_winback' && (
                  <Icon name="arrowRight" size={14} color="white" />
                )}
              </button>

              {/* Secondary CTA for offer state */}
              {trialState === 'offer50' && (
                <button
                  onClick={() => setShowPlanPicker(true)}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: 12,
                    background: 'transparent',
                    color: 'var(--muted-strong)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    marginTop: 8,
                  }}
                >
                  Сравнить тарифы
                </button>
              )}
            </div>
          )
        })() : (() => {
          const subStatus = tenant.subscription_status as string | undefined
          const isPastDue = subStatus === 'past_due'
          const isCancelled = subStatus === 'cancelled'
          const cancelledDaysAgo = tenant.cancelled_at
            ? Math.floor((Date.now() - new Date(tenant.cancelled_at).getTime()) / 86400000)
            : 0

          if (isPastDue) {
            return (
              <div style={{ padding: '16px', borderRadius: 16, border: '2px solid #EF4444', background: '#FEF2F2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div>
                    <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: '#991B1B' }}>Проблема с оплатой</div>
                    <div style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>Обновите способ оплаты, чтобы не потерять доступ</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlanPicker(true)}
                  style={{ width: '100%', height: 44, borderRadius: 12, background: '#EF4444', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
                >
                  🔧 Обновить способ оплаты
                </button>
              </div>
            )
          }

          if (isCancelled) {
            const hasWinback = cancelledDaysAgo <= 30
            return (
              <div style={{ padding: '16px', borderRadius: 16, border: '2px solid #F59E0B', background: '#FFFBEB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{hasWinback ? '💛' : '😔'}</span>
                  <div>
                    <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: '#92400E' }}>
                      {hasWinback ? 'Подписка отменена' : 'Подписка завершена'}
                    </div>
                    <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                      {hasWinback
                        ? `Ещё ${30 - cancelledDaysAgo} дн. для возобновления со скидкой 20%`
                        : 'Возобновите подписку для доступа к функциям'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlanPicker(true)}
                  style={{ width: '100%', height: 44, borderRadius: 12, background: '#F59E0B', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
                >
                  {hasWinback ? '🎉 Возобновить со скидкой 20%' : '↩ Возобновить подписку'}
                </button>
              </div>
            )
          }

          /* Active subscription card */
          const nextBilling = tenant.next_billing_at
            ? new Date(tenant.next_billing_at).toLocaleDateString('ru', { day: 'numeric', month: 'short' })
            : null
          return (
            <div style={{ padding: '16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>
                    Подписка
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {nextBilling ? `Следующее списание: ${nextBilling}` : 'Активна'}
                  </div>
                </div>
                <span style={{ background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                  {(tenant.tier ?? 'Business').charAt(0).toUpperCase() + (tenant.tier ?? 'Business').slice(1)}
                </span>
              </div>
              <button
                onClick={() => setShowPlanPicker(true)}
                style={{ width: '100%', height: 44, borderRadius: 12, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '1px solid var(--border)' }}
              >
                Управление подпиской
              </button>
            </div>
          )
        })()}

        {/* ── Dashboard ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Hero revenue card */}
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', padding: '18px 18px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Выручка всего</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 28, color: 'var(--ink)', lineHeight: 1.15 }}>
                  {summary ? fmtPrice(summary.total_revenue, tenant.currency) : '—'}
                </div>
                {summary?.yesterday_revenue != null && (
                  <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                    color: (summary.today_revenue ?? 0) >= summary.yesterday_revenue ? '#10B981' : '#EF4444' }}>
                    {(summary.today_revenue ?? 0) >= summary.yesterday_revenue ? '▲' : '▼'} Сегодня: {fmtPrice(summary.today_revenue ?? 0, tenant.currency)}
                  </div>
                )}
              </div>
              <svg width="72" height="36" viewBox="0 0 72 36" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                {[5,9,7,14,11,18,13,22,17,26,20,28].map((h, i) => (
                  <rect key={i} x={i * 6} y={36 - h} width={4} height={h} rx={1.5}
                    fill={i === 11 ? 'var(--accent)' : 'var(--accent-soft)'} />
                ))}
              </svg>
            </div>
          </div>

          {/* 2-column metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Заказы', value: String(summary?.total_orders ?? '—'), sub: 'всего' },
              { label: 'Новые', value: String(summary?.new_orders ?? '—'), sub: 'ожидают' },
              { label: 'Сегодня', value: summary?.today_revenue != null ? fmtPrice(summary.today_revenue, tenant.currency) : '—', sub: summary?.today_orders != null ? `${summary.today_orders} заказов` : undefined },
              { label: 'Неделя', value: weekSummary?.total_revenue != null ? fmtPrice(weekSummary.total_revenue, tenant.currency) : '—', sub: weekSummary?.total_orders != null ? `${weekSummary.total_orders} заказов` : undefined },
              { label: 'Месяц', value: monthSummary?.total_revenue != null ? fmtPrice(monthSummary.total_revenue, tenant.currency) : '—', sub: monthSummary?.total_orders != null ? `${monthSummary.total_orders} заказов` : undefined },
              { label: 'Товары', value: String(summary?.product_count ?? '—'), sub: 'активных' },
            ].map(metric => (
              <div key={metric.label} style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>{metric.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{metric.value}</div>
                {metric.sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{metric.sub}</div>}
              </div>
            ))}
          </div>
        </div>


        {/* ── Recent Orders ── */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
              Последние заказы
            </div>
            <button
              onClick={() => onTabChange?.('orders')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--accent)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Все заказы
              <Icon name="chevronRight" size={13} color="var(--accent)" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              <Icon name="box" size={36} color="var(--border)" />
              <div style={{ marginTop: 12, fontSize: 14 }}>Заказов пока нет</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Поделитесь ссылкой на магазин с покупателями</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentOrders.map((o: any) => (
                <div key={o.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: 'var(--subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="box" size={18} color="var(--muted)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                      {o.customer_name || 'Покупатель'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                        {fmtPrice(Number(o.total), tenant.currency)}
                      </span>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: STATUS_COLORS[o.status] + '20',
                        color: STATUS_COLORS[o.status],
                        fontWeight: 600,
                      }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                    {o.created_at ? timeAgo(o.created_at) : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Menu Groups ── */}

        {/* Group 1: Каталог и операции */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>
          Каталог и операции
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow icon="refreshCw"   label="Возвраты"         onPress={() => setShowReturns(true)} />
          <MenuRow icon="truck"       label="Способы доставки" onPress={() => onTabChange?.('more', 'delivery')} />
          <MenuRow icon="creditCard"  label="Способы оплаты"   onPress={() => onTabChange?.('more', 'payment')} />
          <MenuRow icon="barChart"    label="Аналитика"        onPress={() => onTabChange?.('analytics')} last />
        </div>

        {/* Group 2: Маркетинг и рост */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Маркетинг и рост</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #00B5E2 0%, #0066CC 100%)', padding: '2px 7px', borderRadius: 999 }}>Business+</span>
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow icon="coupon"    label="Купоны и скидки"         onPress={() => setShowCoupons(true)} />
          <MenuRow icon="send"      label="Рассылки"                onPress={() => setShowMailings(true)} />
          <MenuRow icon="play"      label="Stories и баннеры"       onPress={() => setShowStories(true)} />
          <MenuRow icon="gift"      label="Программа лояльности"    onPress={() => setShowLoyaltyProgram(true)} />
          <MenuRow icon="users"     label="Реферальная программа"   onPress={() => setShowReferralProgram(true)} />
          <MenuRow icon="megaphone" label="Кросспостинг в канал"    onPress={() => setShowChannelCrossposting(true)} />
          <MenuRow icon="cart"      label="Брошенные корзины"       onPress={() => setShowAbandonedCarts(true)} last />
        </div>

        {/* Group 3: Настройки */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>Настройки</div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow icon="box"        label="Настройки заказов" onPress={() => onTabChange?.('more', 'orders')} />
          <MenuRow icon="sparkles"   label="Оформление"        onPress={() => onTabChange?.('more', 'design')} />
          <MenuRow
            icon="bot" label="Telegram-бот"
            value={tenant.bot_username ? `@${tenant.bot_username}` : undefined}
            onPress={() => onTabChange?.('more', 'bot')}
            badge={!tenant.bot_username ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: '#EF4444', borderRadius: 999, padding: '2px 7px' }}>!</span>
            ) : undefined}
          />
          <MenuRow
            icon="pin" label="Канал Telegram"
            value={tenant.settings?.channel_id ? 'Настроен' : 'Настроить'}
            onPress={() => onTabChange?.('more', 'channel')}
            last
            badge={!tenant.settings?.channel_id ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: '#F59E0B', borderRadius: 999, padding: '2px 7px' }}>!</span>
            ) : undefined}
          />
        </div>

        {/* Group 4: Аккаунт */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>Аккаунт</div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow icon="gem"     label="Подписка"   value={(tenant.tier ?? 'Trial').charAt(0).toUpperCase() + (tenant.tier ?? 'Trial').slice(1)} onPress={() => setShowPlanPicker(true)} />
          <MenuRow icon="users"   label="Команда"    onPress={() => setShowTeam(true)} />
          <MenuRow icon="trophy"  label="Достижения" onPress={() => setShowAchievements(true)} />
          <MenuRow icon="globe"   label="Язык"       value="Русский" last />
        </div>

        {/* Group 5: Помощь */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>Помощь</div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow icon="send" label="Поддержка"      onPress={() => (window.Telegram?.WebApp as any)?.openTelegramLink('https://t.me/dokonly_support')} />
          <MenuRow icon="info" label="Новости Dokonly" onPress={() => (window.Telegram?.WebApp as any)?.openTelegramLink('https://t.me/dokonly_news')} />
          <MenuRow icon="info" label="FAQ и помощь"   onPress={() => setShowHelp(true)} last />
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 8, paddingBottom: 4 }}>
          {tenant.tier === 'business' || tenant.tier === 'premium'
            ? <span style={{ opacity: 0.5 }}>v1.0</span>
            : <span>Powered by <span style={{ fontWeight: 600 }}>Dokonly</span> · v1.0</span>
          }
        </div>

      </div>

      {showPlanPicker && <PlanPicker onBack={() => setShowPlanPicker(false)} />}
      {showAchievements && <AchievementsPage onBack={() => setShowAchievements(false)} />}

      {showNewOrderSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Новый заказ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={newOrderName} onChange={e => setNewOrderName(e.target.value)} placeholder="Имя покупателя*" style={{ height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }} />
              <input value={newOrderPhone} onChange={e => setNewOrderPhone(e.target.value)} placeholder="Телефон" type="tel" style={{ height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }} />
              <input value={newOrderTotal} onChange={e => setNewOrderTotal(e.target.value)} placeholder="Сумма заказа*" type="number" style={{ height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }} />
              <textarea value={newOrderNote} onChange={e => setNewOrderNote(e.target.value)} placeholder="Заметка (необязательно)" rows={2} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowNewOrderSheet(false)} style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--subtle)', border: 'none', fontSize: 15, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>Отмена</button>
              <button
                disabled={!newOrderName.trim() || !newOrderTotal.trim() || creatingOrder}
                onClick={async () => {
                  if (!newOrderName.trim() || !newOrderTotal.trim()) return
                  setCreatingOrder(true)
                  try {
                    await api.seller.createOrderManually({ customer_name: newOrderName.trim(), customer_phone: newOrderPhone.trim(), items: [], total: Number(newOrderTotal), note: newOrderNote.trim() || undefined })
                    setShowNewOrderSheet(false); setNewOrderName(''); setNewOrderPhone(''); setNewOrderTotal(''); setNewOrderNote('')
                  } catch { /* silently fail */ } finally { setCreatingOrder(false) }
                }}
                style={{ flex: 2, height: 48, borderRadius: 12, background: 'var(--accent)', border: 'none', fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', opacity: (!newOrderName.trim() || !newOrderTotal.trim() || creatingOrder) ? 0.6 : 1 }}
              >
                {creatingOrder ? 'Создание...' : 'Создать заказ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
