import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

interface Achievement {
  id: string
  category: 'milestone' | 'feature' | 'streak' | 'community'
  icon: string
  name_ru: string
  desc_ru: string
  tier: 'bronze' | 'silver' | 'gold'
  unlocked: boolean
  progress?: number
  target?: number
}

interface AchievementsResponse {
  achievements: Achievement[]
  unlocked_count: number
  total_count: number
}

interface Props {
  onBack: () => void
}

const TIER_LABELS: Record<string, string> = {
  bronze: '🥉 Бронза',
  silver: '🥈 Серебро',
  gold: '🥇 Золото',
}

const CATEGORY_TABS: { label: string; value: Achievement['category'] | null }[] = [
  { label: 'Все', value: null },
  { label: 'Вехи', value: 'milestone' },
  { label: 'Функции', value: 'feature' },
  { label: 'Стрики', value: 'streak' },
  { label: 'Сообщество', value: 'community' },
]

export function AchievementsPage({ onBack }: Props) {
  const [activeCategory, setActiveCategory] = useState<Achievement['category'] | null>(null)
  const [celebration, setCelebration] = useState<Achievement | null>(null)

  const { data, isLoading, isError } = useQuery<AchievementsResponse>({
    queryKey: ['seller-achievements'],
    queryFn: api.seller.achievements,
  })

  const achievements = data?.achievements ?? []
  const unlockedCount = data?.unlocked_count ?? 0
  const totalCount = data?.total_count ?? 0
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  // Detect newly unlocked achievements since last visit
  const prevUnlockedRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!data) return
    const nowUnlocked = new Set(achievements.filter(a => a.unlocked).map(a => a.id))
    if (prevUnlockedRef.current !== null) {
      const newlyUnlocked = achievements.find(
        a => a.unlocked && !prevUnlockedRef.current!.has(a.id)
      )
      if (newlyUnlocked) {
        setCelebration(newlyUnlocked)
        ;(window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success')
      }
    }
    prevUnlockedRef.current = nowUnlocked
  }, [data])

  const filtered = achievements
    .filter(a => activeCategory === null || a.category === activeCategory)
    .sort((a, b) => {
      if (a.unlocked === b.unlocked) return 0
      return a.unlocked ? -1 : 1
    })

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'var(--bg)',
      overflow: 'auto',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Sticky header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'var(--subtle)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
          Достижения
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14 }}>Не удалось загрузить достижения</div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {/* Progress section */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
              🏆 {unlockedCount} из {totalCount} разблокировано
            </div>
            <div style={{
              height: 8,
              borderRadius: 999,
              background: 'var(--subtle)',
              overflow: 'hidden',
              marginBottom: 6,
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: 999,
                background: 'var(--accent)',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              {pct}% завершено
            </div>
          </div>

          {/* Category filter tabs */}
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 8,
            padding: '0 16px 12px',
            scrollbarWidth: 'none',
          }}>
            {CATEGORY_TABS.map(tab => {
              const isActive = activeCategory === tab.value
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveCategory(tab.value)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px',
                    borderRadius: 999,
                    background: isActive ? 'var(--accent)' : 'var(--subtle)',
                    color: isActive ? 'white' : 'var(--ink)',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Achievement grid */}
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: 14 }}>Достижений пока нет</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              padding: '0 16px 40px',
            }}>
              {filtered.map(achievement => (
                <div
                  key={achievement.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    opacity: achievement.unlocked ? 1 : 0.45,
                  }}
                >
                  {/* Top: icon + tier badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      background: achievement.unlocked ? 'var(--accent-soft)' : 'var(--subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      flexShrink: 0,
                    }}>
                      {achievement.icon}
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      textAlign: 'right',
                      lineHeight: 1.3,
                      marginTop: 2,
                    }}>
                      {TIER_LABELS[achievement.tier]}
                    </span>
                  </div>

                  {/* Name */}
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: achievement.unlocked ? 'var(--ink)' : 'var(--muted)',
                    lineHeight: 1.3,
                  }}>
                    {achievement.name_ru}
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }}>
                    {achievement.desc_ru}
                  </div>

                  {/* Status / Progress */}
                  {achievement.unlocked ? (
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#10B981', marginTop: 'auto' }}>
                      ✓ Разблокировано
                    </div>
                  ) : achievement.progress !== undefined && achievement.target !== undefined ? (
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                          {achievement.progress} / {achievement.target}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                          {Math.round((achievement.progress / achievement.target) * 100)}%
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, Math.round((achievement.progress / achievement.target) * 100))}%`,
                          background: 'var(--accent)',
                          borderRadius: 2,
                        }}/>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginTop: 'auto' }}>
                      🔒 Заблокировано
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Celebration modal */}
      {celebration && (
        <div
          onClick={() => setCelebration(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 320, background: 'var(--card)', borderRadius: 24, padding: '32px 24px', textAlign: 'center' }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉🎊🎉</div>
            <div style={{
              width: 80, height: 80, borderRadius: 999, margin: '0 auto 16px',
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
            }}>
              {celebration.icon}
            </div>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>
              Достижение разблокировано!
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>
              {celebration.name_ru}
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 24 }}>
              {celebration.desc_ru}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  const tg = (window as any).Telegram?.WebApp
                  const text = `🏆 Я только что разблокировал достижение «${celebration.name_ru}» в Dokonly!`
                  if (tg?.switchInlineQuery) {
                    tg.switchInlineQuery(text, ['users', 'groups'])
                  } else {
                    const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`
                    tg?.openLink?.(url) ?? window.open(url, '_blank')
                  }
                  setCelebration(null)
                }}
                style={{ width: '100%', height: 46, borderRadius: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Поделиться с друзьями ↗
              </button>
              <button
                onClick={() => setCelebration(null)}
                style={{ width: '100%', height: 46, borderRadius: 12, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
