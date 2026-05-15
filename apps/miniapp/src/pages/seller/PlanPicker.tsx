import { Icon } from '@/components/Icon'

const PLANS = [
  {
    id: 'start',
    name: 'Старт',
    priceUZS: 199000,
    priceUSD: 16,
    popular: false,
    features: [
      '250 товаров',
      '10 категорий',
      '5 GB хранилища',
      '1 Telegram-бот',
      'Базовая аналитика',
      'Поддержка в чате',
    ],
  },
  {
    id: 'business',
    name: 'Бизнес',
    priceUZS: 499000,
    priceUSD: 40,
    popular: true,
    features: [
      '2 500 товаров',
      '50 категорий',
      '25 GB хранилища',
      'Рассылки и сегменты',
      'Программа лояльности',
      'Расширенная аналитика',
      'Приоритетная поддержка',
    ],
  },
  {
    id: 'premium',
    name: 'Премиум',
    priceUZS: 999000,
    priceUSD: 80,
    popular: false,
    features: [
      'Безлимит товаров',
      'Безлимит категорий',
      '100 GB хранилища',
      'Несколько магазинов',
      'AI-фичи в полном объёме',
      'Веб-витрина (dokonly.com)',
      'Персональный менеджер',
    ],
  },
]

function fmtPrice(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
}

interface Props {
  onBack: () => void
}

export function PlanPicker({ onBack }: Props) {
  function openSupport() {
    ;(window as any).Telegram?.WebApp?.openTelegramLink?.('https://t.me/dokonly_support') ??
      window.open('https://t.me/dokonly_support', '_blank')
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'var(--bg)',
      overflow: 'auto',
    }}>
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
          Тарифы
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
        {/* Title block */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>
            Выберите тариф
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            14 дней Trial — бесплатно, карта не нужна
          </p>
        </div>

        {/* Plan cards */}
        {PLANS.map(plan => (
          <div
            key={plan.id}
            style={{
              position: 'relative',
              background: 'var(--card)',
              border: plan.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 16,
              padding: '20px 16px',
            }}
          >
            {/* Popular badge */}
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'var(--accent)',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999,
              }}>
                Популярный
              </div>
            )}

            {/* Plan name */}
            <div style={{
              fontFamily: 'Sora',
              fontWeight: 700,
              fontSize: 20,
              color: 'var(--ink)',
              marginBottom: 6,
            }}>
              {plan.name}
            </div>

            {/* Price */}
            <div style={{
              fontFamily: 'JetBrains Mono',
              fontWeight: 700,
              fontSize: 22,
              color: plan.popular ? 'var(--accent)' : 'var(--ink)',
              marginBottom: 4,
            }}>
              {fmtPrice(plan.priceUZS)} / мес
            </div>

            {/* USD equivalent */}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              ≈ ${plan.priceUSD}
            </div>

            {/* Features list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {plan.features.map(feat => (
                <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: 'var(--accent-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name="check" size={10} color="var(--accent)" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{feat}</span>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <button
              onClick={openSupport}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 12,
                background: plan.popular ? 'var(--accent)' : 'var(--subtle)',
                color: plan.popular ? 'white' : 'var(--ink)',
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Подключить
            </button>
          </div>
        ))}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          Все тарифы включают 0% комиссии с заказов
        </div>
      </div>
    </div>
  )
}
