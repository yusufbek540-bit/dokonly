import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'
import { PlanPicker } from '../PlanPicker'
import { AchievementsPage } from '../AchievementsPage'
import { MailingsView, CouponsView } from './SettingsTab'

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
  onTabChange?: (tab: string) => void
}

function MenuRow({ emoji, label, value, last, onPress }: { emoji: string; label: string; value?: string; last?: boolean; onPress?: () => void }) {
  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '13px 16px', background: 'var(--card)', textAlign: 'left',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        cursor: onPress ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
      {value && <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 4 }}>{value}</span>}
      <Icon name="chevronRight" size={15} color="var(--muted)" />
    </button>
  )
}

export function HomeTab({ tenant, onTabChange }: Props) {
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showMailings, setShowMailings] = useState(false)
  const [showCoupons, setShowCoupons] = useState(false)
  const { data: summary } = useQuery({ queryKey: ['seller-analytics', 'all'], queryFn: () => api.seller.analytics('all') })
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

  const quickActions = [
    {
      label: '+ Товар',
      onPress: () => onTabChange?.('catalog'),
    },
    {
      label: '📋 Заказы',
      onPress: () => onTabChange?.('orders'),
    },
    {
      label: '👁 Магазин',
      onPress: () => {
        if ((window as any).Telegram?.WebApp?.openLink) {
          (window as any).Telegram.WebApp.openLink(shopUrl)
        } else {
          window.open(shopUrl, '_blank')
        }
      },
    },
    {
      label: '🔗 Скопировать',
      onPress: () => navigator.clipboard?.writeText(shopUrl),
    },
  ]

  if (showMailings) return <MailingsView onBack={() => setShowMailings(false)} />
  if (showCoupons) return <CouponsView onBack={() => setShowCoupons(false)} />

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
          fontFamily: 'Sora',
          fontWeight: 700,
          fontSize: 24,
          color: 'white',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}>
          {tenant.name}
        </div>

        {/* Top-right actions */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 1,
        }}>
          {tenant.bot_username && (
            <div style={{
              height: 30,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              t.me/{tenant.bot_username}
            </div>
          )}
          <button
            onClick={() => navigator.clipboard?.writeText(shopUrl)}
            style={{
              height: 30,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '0 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="copy" size={12} color="white" />
            Копировать ссылку
          </button>
        </div>
      </div>

      {/* ── Padded content area ── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>

        {/* ── Subscription Status Card ── */}
        {isTrial ? (() => {
          // Badge config by state
          const badge = {
            early: { text: 'Free Trial', bg: 'linear-gradient(135deg, #00B5E2 0%, #0066CC 100%)' },
            warning: { text: 'Заканчивается', bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
            offer50: { text: '🔥 50% скидка', bg: 'linear-gradient(135deg, #FF6B35 0%, #E11D48 100%)' },
            expired_winback: { text: 'Trial истёк', bg: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' },
            expired: { text: 'Trial истёк', bg: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' },
          }[trialState]

          const progressBarColor = trialState === 'early' ? '#00B383'
            : trialState === 'warning' ? '#F59E0B'
            : '#EF4444'

          return (
            <div style={{
              padding: '16px',
              borderRadius: 16,
              border: trialState === 'offer50' ? '1px solid #FF6B3540'
                : trialState === 'expired_winback' ? '1px solid #EF444440'
                : '1px solid var(--border)',
              background: trialState === 'offer50'
                ? 'linear-gradient(135deg, rgba(255,107,53,0.06) 0%, rgba(225,29,72,0.06) 100%)'
                : 'var(--card)',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>
                    {trialState === 'offer50' ? '🔥 Ограниченное предложение'
                      : trialState === 'expired_winback' || trialState === 'expired' ? 'Пробный период завершён'
                      : 'Пробный период'}
                  </div>
                  {(trialState === 'early' || trialState === 'warning') && (
                    <div style={{ fontSize: 13, color: 'var(--muted-strong)', fontWeight: 600 }}>
                      Осталось {daysRemaining} {daysWord(daysRemaining)}
                    </div>
                  )}
                  {trialState === 'expired_winback' && (
                    <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
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
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--subtle)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      height: '100%',
                      width: `${trialProgressPct}%`,
                      borderRadius: 999,
                      background: progressBarColor,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                    Истекает {trialEndFormatted}
                  </div>
                </>
              )}

              {/* Warning state sub-text */}
              {trialState === 'warning' && (
                <div style={{ fontSize: 13, color: '#D97706', fontWeight: 500, marginBottom: 4 }}>
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
                  height: 44,
                  borderRadius: 12,
                  background: trialState === 'offer50' ? 'linear-gradient(135deg, #FF6B35 0%, #E11D48 100%)'
                    : trialState === 'expired_winback' ? '#EF4444'
                    : 'var(--accent)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
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
        })() : (
          /* Active subscription card */
          <div style={{
            padding: '16px',
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--card)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>
                  Подписка
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Следующее списание: не указано
                </div>
              </div>
              <span style={{
                background: 'var(--accent)',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999,
              }}>
                {(tenant.tier ?? 'Business').charAt(0).toUpperCase() + (tenant.tier ?? 'Business').slice(1)}
              </span>
            </div>
            <button
              onClick={() => setShowPlanPicker(true)}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                background: 'var(--subtle)',
                color: 'var(--ink)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                border: '1px solid var(--border)',
              }}
            >
              Управление подпиской
            </button>
          </div>
        )}

        {/* ── Status Badges Row (Plan / Achievements / Streak) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {/* Plan */}
          <button
            onClick={() => setShowPlanPicker(true)}
            style={{
              padding: '12px 10px',
              borderRadius: 14,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>🏆</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Тариф</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              {isTrial ? 'Trial' : (tenant.tier ?? 'Trial')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>→ Статус</div>
          </button>

          {/* Achievements */}
          <button
            onClick={() => setShowAchievements(true)}
            style={{
              padding: '12px 10px',
              borderRadius: 14,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>🎖</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Достижения</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              {achievements ? `${achievements.filter((a: any) => a.unlocked).length}/${achievements.length}` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>→ Открыть</div>
          </button>

          {/* Streak */}
          <div style={{
            padding: '12px 10px',
            borderRadius: 14,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>🔥</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Стрик</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              {daysPassed} {daysWord(daysPassed)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>работа</div>
          </div>
        </div>

        {/* ── AI Insights ── */}
        {summary && (() => {
          const s = summary as any
          const insights: { icon: string; text: string; action: string; onPress?: () => void }[] = []

          if (s.out_of_stock_count > 0) {
            insights.push({
              icon: '🔴',
              text: `${s.out_of_stock_count} ${s.out_of_stock_count === 1 ? 'товар закончился' : s.out_of_stock_count < 5 ? 'товара закончились' : 'товаров закончились'}`,
              action: 'Обновить склад →',
              onPress: () => onTabChange?.('catalog'),
            })
          }
          if (s.low_stock_count > 0) {
            insights.push({
              icon: '⚠️',
              text: `${s.low_stock_count} ${s.low_stock_count === 1 ? 'товар заканчивается' : 'товара заканчиваются'} (остаток ≤ 5)`,
              action: 'Пополнить →',
              onPress: () => onTabChange?.('catalog'),
            })
          }
          if (s.pending_too_long_count > 0) {
            insights.push({
              icon: '⏰',
              text: `${s.pending_too_long_count} ${s.pending_too_long_count === 1 ? 'заказ ожидает' : 'заказа ожидают'} подтверждения 2+ дня`,
              action: 'Обработать →',
              onPress: () => onTabChange?.('orders'),
            })
          }
          if (s.no_images_count > 0 && insights.length < 3) {
            insights.push({
              icon: '📸',
              text: `${s.no_images_count} ${s.no_images_count === 1 ? 'товар без фото' : 'товара без фото'} — добавьте, чтобы продавать лучше`,
              action: 'Добавить фото →',
              onPress: () => onTabChange?.('catalog'),
            })
          }
          if (s.no_description_count > 0 && insights.length < 3) {
            insights.push({
              icon: '✏️',
              text: `${s.no_description_count} ${s.no_description_count === 1 ? 'товар без описания' : 'товара без описания'}`,
              action: 'Заполнить →',
              onPress: () => onTabChange?.('catalog'),
            })
          }

          if (insights.length === 0) return null

          return (
            <div style={{
              borderRadius: 16,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Что требует внимания</span>
                </div>
              </div>
              {insights.slice(0, 3).map((ins, i, arr) => (
                <button
                  key={i}
                  onClick={ins.onPress}
                  disabled={!ins.onPress}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    textAlign: 'left',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: ins.onPress ? 'pointer' : 'default',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{ins.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 2, lineHeight: 1.4 }}>{ins.text}</div>
                    {ins.onPress && <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{ins.action}</div>}
                  </div>
                </button>
              ))}
            </div>
          )
        })()}

        {/* ── Stats Grid 2×2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</span>
                <Icon name={s.icon} size={14} color="var(--muted)" />
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Today's Pulse Strip ── */}
        {summary && (() => {
          const chips = [
            {
              label: 'Сегодня',
              value: fmtPrice(summary.today_revenue ?? 0, tenant.currency),
              trend: summary.yesterday_revenue != null
                ? (summary.today_revenue ?? 0) > summary.yesterday_revenue ? '▲' : (summary.today_revenue ?? 0) < summary.yesterday_revenue ? '▼' : null
                : null,
              trendUp: (summary.today_revenue ?? 0) >= (summary.yesterday_revenue ?? 0),
            },
            {
              label: 'Заказов сегодня',
              value: String(summary.today_orders ?? 0),
              trend: summary.yesterday_orders != null
                ? (summary.today_orders ?? 0) > summary.yesterday_orders ? '▲' : (summary.today_orders ?? 0) < summary.yesterday_orders ? '▼' : null
                : null,
              trendUp: (summary.today_orders ?? 0) >= (summary.yesterday_orders ?? 0),
            },
            {
              label: 'Вчера выручка',
              value: fmtPrice(summary.yesterday_revenue ?? 0, tenant.currency),
              trend: null,
              trendUp: true,
            },
            {
              label: 'Вчера заказов',
              value: String(summary.yesterday_orders ?? 0),
              trend: null,
              trendUp: true,
            },
          ]
          return (
            <div style={{
              display: 'flex',
              overflowX: 'auto',
              gap: 8,
              margin: '0 -16px',
              padding: '0 16px 4px',
              scrollbarWidth: 'none',
            }}>
              {chips.map(chip => (
                <div key={chip.label} style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderRadius: 14,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  minWidth: 120,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{chip.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                      {chip.value}
                    </span>
                    {chip.trend && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: chip.trendUp ? '#10B981' : '#EF4444' }}>
                        {chip.trend}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* ── Quick Actions (horizontal scroll) ── */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 8,
          margin: '0 -16px',
          padding: '0 16px 4px',
          scrollbarWidth: 'none',
        }}>
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={action.onPress}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* ── Onboarding Checklist (shown only when brand new: no products AND no orders) ── */}
        {(summary as any)?.product_count === 0 && (summary as any)?.total_orders === 0 && (() => {
          const steps = [
            {
              label: 'Добавить обложку и логотип магазина',
              done: !!(tenant?.cover_url || tenant?.logo_url),
            },
            {
              label: 'Добавить первый товар',
              done: ((summary as any)?.product_count ?? 0) > 0,
            },
            {
              label: 'Настроить способ оплаты',
              done: (tenant?.settings?.payment_methods?.length ?? 0) > 0,
            },
            {
              label: 'Проверить свой магазин',
              done: false,
            },
            {
              label: 'Поделиться с аудиторией',
              done: false,
            },
          ]
          const completedCount = steps.filter(s => s.done).length
          const progressPct = (completedCount / steps.length) * 100

          return (
            <div style={{
              padding: '16px',
              borderRadius: 16,
              border: '1px solid var(--border)',
              background: 'var(--card)',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                  Начните работу
                </div>
                <span style={{
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                }}>
                  {completedCount}/5
                </span>
              </div>

              {/* Sub-title */}
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                Начните за 5 шагов:
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Checkbox circle */}
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: step.done ? 'var(--accent)' : 'transparent',
                      border: step.done ? 'none' : '2px solid var(--border)',
                    }}>
                      {step.done && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    {/* Step text */}
                    <span style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: step.done ? 'var(--muted)' : 'var(--ink)',
                      textDecoration: step.done ? 'line-through' : 'none',
                      flex: 1,
                    }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6,
                borderRadius: 999,
                background: 'var(--subtle)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  transition: 'width 0.4s ease',
                }} />
              </div>

              {/* Motivational text when all done */}
              {completedCount === 5 && (
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
                  🎉 Вы готовы к продажам!
                </div>
              )}
            </div>
          )
        })()}

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
          <MenuRow emoji="📦" label="Товары" onPress={() => onTabChange?.('catalog')} />
          {(() => {
            const pendingCount = (orders as any[]).filter((o: any) => o.status === 'new' || o.status === 'created').length
            return (
              <button
                onClick={() => onTabChange?.('orders')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '13px 16px', background: 'var(--card)', textAlign: 'left',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>🛍</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Заказы</span>
                {pendingCount > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'white',
                    background: '#EF4444', borderRadius: 999,
                    padding: '2px 7px', minWidth: 20, textAlign: 'center',
                  }}>
                    {pendingCount}
                  </span>
                )}
                <Icon name="chevronRight" size={15} color="var(--muted)" />
              </button>
            )
          })()}
          <MenuRow emoji="📋" label="Категории" onPress={() => onTabChange?.('catalog')} />
          <MenuRow emoji="🚚" label="Способы доставки" onPress={() => onTabChange?.('more')} />
          <MenuRow emoji="🎟" label="Купоны и скидки" onPress={() => setShowCoupons(true)} />
          <MenuRow emoji="📊" label="Аналитика" last onPress={() => onTabChange?.('analytics')} />
        </div>

        {/* Group 2: Маркетинг и рост */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Маркетинг и рост
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'white',
            background: 'linear-gradient(135deg, #00B5E2 0%, #0066CC 100%)',
            padding: '2px 7px', borderRadius: 999,
          }}>
            Business+
          </span>
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow emoji="📨" label="Рассылки" onPress={() => setShowMailings(true)} />
          <MenuRow emoji="🎁" label="Программа лояльности" value="Скоро" />
          <MenuRow emoji="👥" label="Реферальная программа" value="Скоро" last />
        </div>

        {/* Group 3: Настройки */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>
          Настройки
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow emoji="💳" label="Способы оплаты" onPress={() => onTabChange?.('more')} />
          <MenuRow emoji="📦" label="Настройки заказов" onPress={() => onTabChange?.('more')} />
          <MenuRow emoji="🎨" label="Оформление магазина" onPress={() => onTabChange?.('more')} />
          {/* Bot row — custom value rendering */}
          <button
            onClick={() => onTabChange?.('more')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '13px 16px', background: 'var(--card)', textAlign: 'left',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>🤖</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Telegram-бот</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {!tenant.bot_username && <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Не подключён</span>}
              {tenant.bot_username && <span style={{ fontSize: 12, color: 'var(--muted)' }}>@{tenant.bot_username}</span>}
              <Icon name="chevronRight" size={15} color="var(--muted)" />
            </div>
          </button>
          <MenuRow emoji="📢" label="Канал Telegram" value="Настроить" last onPress={() => onTabChange?.('more')} />
        </div>

        {/* Group 4: Аккаунт */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>
          Аккаунт
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MenuRow
            emoji="💎"
            label="Подписка"
            value={(tenant.tier ?? 'Trial').charAt(0).toUpperCase() + (tenant.tier ?? 'Trial').slice(1)}
            onPress={() => setShowPlanPicker(true)}
          />
          <MenuRow emoji="🏆" label="Достижения" onPress={() => setShowAchievements(true)} />
          <MenuRow emoji="🌍" label="Язык" value="Русский" last />
        </div>

        {/* Group 5: Помощь */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>
          Помощь
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <button
            onClick={() => (window.Telegram?.WebApp as any)?.openTelegramLink('https://t.me/dokonly_support')}
            style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', background: 'var(--card)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>💬</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Поддержка</span>
              <Icon name="chevronRight" size={15} color="var(--muted)" />
            </div>
          </button>
          <button
            onClick={() => (window.Telegram?.WebApp as any)?.openTelegramLink('https://t.me/dokonly_news')}
            style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', background: 'var(--card)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>📰</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Новости Dokonly</span>
              <Icon name="chevronRight" size={15} color="var(--muted)" />
            </div>
          </button>
          <button
            onClick={() => (window.Telegram?.WebApp as any)?.openTelegramLink('https://t.me/dokonly_support')}
            style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', background: 'var(--card)',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>❓</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>FAQ и помощь</span>
              <Icon name="chevronRight" size={15} color="var(--muted)" />
            </div>
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8, paddingBottom: 4 }}>
          Dokonly v1.0
        </div>

      </div>

      {showPlanPicker && <PlanPicker onBack={() => setShowPlanPicker(false)} />}
      {showAchievements && <AchievementsPage onBack={() => setShowAchievements(false)} />}
    </div>
  )
}
