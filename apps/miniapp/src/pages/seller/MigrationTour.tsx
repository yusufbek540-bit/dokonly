import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface TourState {
  id: string
  tour_id: string
  current_step: number
  total_steps: number
}

interface TourStep {
  icon: string
  title: string
  body: string
  preview?: React.ReactNode
  cta?: string
}

const BUSINESS_STEPS: TourStep[] = [
  {
    icon: '🎨',
    title: 'Макеты витрины разблокированы',
    body: 'Теперь вы можете выбрать один из 5 макетов, чтобы сделать ваш магазин уникальным.',
    preview: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        {['Классический', 'Сетка', 'Лента', 'Минимальный', 'Карточки'].map((name, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            background: i === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            border: `1.5px solid ${i === 0 ? 'white' : 'rgba(255,255,255,0.2)'}`,
            fontSize: 12, fontWeight: 600, color: 'white',
            textAlign: 'center',
          }}>{name}</div>
        ))}
      </div>
    ),
    cta: 'Выбрать макет →',
  },
  {
    icon: '🔧',
    title: 'Блоки витрины настраиваются',
    body: 'Управляйте тем, что отображается на вашей витрине — включайте и выключайте истории, меняйте стиль категорий.',
    cta: 'Настроить блоки →',
  },
  {
    icon: '🤖',
    title: 'Функции ИИ разблокированы',
    body: 'ИИ помогает вам продавать больше: импорт фото, описания, ИИ-консультант, ИИ-рассылки.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {['Импорт фото через ИИ', 'Описания продуктов', 'ИИ-консультант для покупателей', 'ИИ-рассылки'].map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'white',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: 'white', flexShrink: 0 }} />
            {f}
          </div>
        ))}
      </div>
    ),
    cta: 'Попробовать импорт фото →',
  },
  {
    icon: '👥',
    title: 'Командная работа',
    body: 'Приглашайте до 3 участников команды. Гибкая система ролей: Владелец, Администратор, Менеджер, Наблюдатель.',
    cta: 'Пригласить участника →',
  },
  {
    icon: '🧑‍💼',
    title: 'CRM разблокирована',
    body: 'Смотрите полную историю каждого клиента, теги, сегменты и заметки — всё в одном месте.',
    cta: 'Перейти к клиентам →',
  },
  {
    icon: '📨',
    title: 'Массовые рассылки разблокированы',
    body: 'Достигайте своих клиентов с целевыми кампаниями. До 30 рассылок в месяц.',
    cta: 'Создать первую рассылку →',
  },
  {
    icon: '🎬',
    title: 'Истории и баннеры',
    body: 'Добавьте Instagram-стиль истории на вашу витрину — яркие, кликабельные, с CTA.',
    cta: 'Создать историю →',
  },
  {
    icon: '🎁',
    title: 'Программы лояльности и реферала',
    body: 'Поощряйте постоянных клиентов: баллы, кешбэк, реферальные коды — настройте под себя.',
    cta: 'Настроить лояльность →',
  },
  {
    icon: '📢',
    title: 'Кросспостинг в канал',
    body: 'Автоматически публикуйте новые товары в ваш Telegram-канал с красивыми карточками.',
    cta: 'Подключить канал →',
  },
  {
    icon: '🎉',
    title: 'Всё готово!',
    body: 'Ваш тарифный план Business активирован. Все функции доступны — начните использовать их прямо сейчас!',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {['🎨 5 макетов витрины', '🤖 ИИ-функции', '📨 Рассылки', '🎁 Лояльность', '👥 CRM', '📢 Кросспостинг'].map((f, i) => (
          <div key={i} style={{ fontSize: 13, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f}
          </div>
        ))}
      </div>
    ),
  },
]

const PREMIUM_STEPS: TourStep[] = [
  {
    icon: '🏪',
    title: 'Несколько магазинов',
    body: 'Управляйте несколькими магазинами из одного аккаунта. У каждого — свой каталог, клиенты и тема.',
    cta: 'Создать второй магазин →',
  },
  {
    icon: '♾️',
    title: 'Безлимитные товары и администраторы',
    body: 'Никаких лимитов — товары, администраторы, категории, рассылки без ограничений.',
    preview: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        {[['Товары', '∞'], ['Администраторы', '∞'], ['Категории', '∞'], ['Рассылки', '∞']].map(([label, val], i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 22, color: 'white' }}>{val}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '🤖',
    title: 'ИИ-консультант для покупателей',
    body: 'Ваши покупатели могут общаться с ИИ 24/7. Конверсия повышается на 15–30%.',
    cta: 'Включить ИИ-консультанта →',
  },
  {
    icon: '📸',
    title: 'ИИ-обработка фотографий',
    body: 'Автоматическое удаление фона, добавление водяного знака — ваши фото выглядят профессионально.',
    cta: 'Обработать существующие фото →',
  },
  {
    icon: '⭐',
    title: 'ИИ-рекомендации товаров',
    body: '"Вам также может понравиться" на каждой странице товара — увеличивает средний чек.',
    cta: 'Включить рекомендации →',
  },
  {
    icon: '🧪',
    title: 'A/B-тестирование тем',
    body: 'Проверяйте, какая тема конвертирует лучше. 50% посетителей видят тему A, 50% — тему B.',
    cta: 'Запустить первый тест →',
  },
  {
    icon: '📊',
    title: 'Когортная аналитика',
    body: 'Смотрите, какие когорты клиентов возвращаются. Тепловая карта удержания по месяцам.',
    cta: 'Смотреть когорты →',
  },
  {
    icon: '💎',
    title: 'Приоритетная поддержка',
    body: 'Прямой доступ к вашему персональному менеджеру. SLA — ответ в течение 1 часа.',
    cta: 'Написать менеджеру →',
  },
]

interface Props {
  tour: TourState
  onDone: () => void
}

export function MigrationTour({ tour, onDone }: Props) {
  const qc = useQueryClient()
  const steps = tour.tour_id === 'welcome_premium' ? PREMIUM_STEPS : BUSINESS_STEPS
  const [step, setStep] = useState(tour.current_step ?? 0)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const update = useMutation({
    mutationFn: (body: { current_step?: number; status: string }) =>
      api.seller.updateTour(tour.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-pending-tour'] })
    },
  })

  const current = steps[step]
  if (!current) return null
  const isLast = step === steps.length - 1

  function advance() {
    if (isLast) {
      update.mutate({ status: 'completed' })
      onDone()
    } else {
      const next = step + 1
      setStep(next)
      update.mutate({ current_step: next, status: 'in_progress' })
    }
  }

  function skip() {
    update.mutate({ status: 'skipped' })
    onDone()
  }

  if (showSkipConfirm) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'var(--bg)', borderRadius: 20,
          padding: 24, width: '100%', maxWidth: 360,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏩</div>
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 8 }}>
            Пропустить тур?
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
            Вы можете вернуться к туру через меню Помощь → Показать тур снова.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowSkipConfirm(false)}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: 'var(--subtle)', border: '1px solid var(--border)',
                fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
              }}
            >
              Продолжить
            </button>
            <button
              onClick={skip}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: 'var(--accent)', border: 'none',
                fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer',
              }}
            >
              Да, пропустить
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(160deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #000) 100%)',
      display: 'flex', flexDirection: 'column',
      padding: 'env(safe-area-inset-top) 0 0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
          Шаг {step + 1} из {steps.length}
        </div>
        <button
          onClick={() => setShowSkipConfirm(true)}
          style={{
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            fontSize: 13, color: 'white', cursor: 'pointer', fontWeight: 600,
          }}
        >
          Пропустить
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>{current.icon}</div>

        <h2 style={{
          fontFamily: 'Sora', fontWeight: 700, fontSize: 22,
          color: 'white', textAlign: 'center', marginBottom: 12, lineHeight: 1.3,
        }}>
          {current.title}
        </h2>

        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.85)',
          textAlign: 'center', lineHeight: 1.6, marginBottom: 8,
        }}>
          {current.body}
        </p>

        {current.preview}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 20 }}>
        {steps.map((_, i) => (
          <div
            key={i}
            onClick={() => i < step && setStep(i)}
            style={{
              width: i === step ? 20 : 6, height: 6,
              borderRadius: 999,
              background: i === step ? 'white' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
              cursor: i < step ? 'pointer' : 'default',
              transition: 'all 0.25s',
            }}
          />
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '0 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        {current.cta && !isLast && (
          <button
            onClick={advance}
            style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: 'white', border: 'none',
              fontFamily: 'Sora', fontWeight: 700, fontSize: 15,
              color: 'var(--accent)', cursor: 'pointer', marginBottom: 10,
            }}
          >
            {current.cta}
          </button>
        )}
        <button
          onClick={advance}
          style={{
            width: '100%', padding: '15px', borderRadius: 14,
            background: isLast ? 'white' : 'rgba(255,255,255,0.2)',
            border: isLast ? 'none' : '1.5px solid rgba(255,255,255,0.4)',
            fontFamily: 'Sora', fontWeight: 700, fontSize: 15,
            color: isLast ? 'var(--accent)' : 'white', cursor: 'pointer',
          }}
        >
          {isLast ? 'Готово 🎉' : 'Далее →'}
        </button>
      </div>
    </div>
  )
}
