import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

interface Props {
  onBack: () => void
  daysPassed: number
}

const STREAK_REWARDS = [
  { days: 7, label: 'Достижение «Hot Streak»', icon: '🔥' },
  { days: 10, label: '10% скидка на следующий месяц', icon: '💸' },
  { days: 30, label: 'Достижение «On Fire» + 50% скидка', icon: '🌟' },
  { days: 100, label: 'Фичер в рассылке Dokonly', icon: '👑' },
]

export function StreakDetailPage({ onBack, daysPassed }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['seller-streak'],
    queryFn: api.seller.streak,
  })

  const currentStreak = data?.current_streak ?? daysPassed
  const bestStreak = data?.best_streak ?? daysPassed
  const todayAtRisk = data?.today_at_risk ?? false
  const calendar = data?.calendar ?? []

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg)', overflow: 'auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button
          onClick={onBack}
          style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--subtle)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Стрики</span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
        </div>
      ) : (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>

          {/* Hero card */}
          <div style={{
            padding: '20px', borderRadius: 20,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 100%)',
            color: 'white', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔥</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 36 }}>{currentStreak}</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>дней подряд заказы</div>
            {todayAtRisk && (
              <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', fontSize: 12, fontWeight: 600 }}>
                ⚠ Сегодня стрик под угрозой — заказов ещё нет
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
              Лучший результат: {bestStreak} дней
            </div>
          </div>

          {/* 30-day calendar */}
          {calendar.length > 0 && (
            <div style={{ padding: '16px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Последние 30 дней
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                  <div key={d} style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', fontWeight: 600 }}>{d}</div>
                ))}
                {(() => {
                  const today = new Date()
                  const firstDay = new Date(today)
                  firstDay.setDate(today.getDate() - 29)
                  // pad to align with Monday start
                  const dayOfWeek = (firstDay.getDay() + 6) % 7
                  const pads = Array(dayOfWeek).fill(null)
                  return [
                    ...pads.map((_, i) => <div key={`pad-${i}`}/>),
                    ...calendar.map(entry => {
                      const isToday = entry.date === today.toISOString().slice(0, 10)
                      return (
                        <div
                          key={entry.date}
                          title={entry.date}
                          style={{
                            aspectRatio: '1',
                            borderRadius: 6,
                            background: entry.has_orders ? 'var(--accent)' : 'var(--subtle)',
                            border: isToday ? '2px solid var(--accent)' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9,
                          }}
                        >
                          {isToday ? '•' : ''}
                        </div>
                      )
                    }),
                  ]
                })()}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }}/>
                  Есть заказы
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--subtle)', border: '1px solid var(--border)' }}/>
                  Нет заказов
                </div>
              </div>
            </div>
          )}

          {/* Streak rewards */}
          <div style={{ padding: '16px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Награды за стрик
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {STREAK_REWARDS.map(reward => {
                const achieved = currentStreak >= reward.days
                return (
                  <div
                    key={reward.days}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: achieved ? 1 : 0.5 }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: achieved ? 'var(--accent-soft)' : 'var(--subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {reward.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {reward.days} дней: {reward.label}
                      </div>
                    </div>
                    {achieved
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>✓</span>
                      : <span style={{ fontSize: 11, color: 'var(--muted)' }}>🔒</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          {/* Freeze info */}
          <div style={{ padding: '16px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              ❄ Заморозка стрика
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 10 }}>
              1 бесплатная заморозка в месяц. Замороженный день не прервёт стрик, даже без заказов.
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Функция заморозки будет доступна в следующем обновлении.
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
