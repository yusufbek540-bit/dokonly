import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number) {
  return n.toLocaleString('en', { minimumFractionDigits: 2 }) + ' USD'
}

const TIER_INFO: Record<string, { label: string; color: string; price: string; features: string[] }> = {
  trial: {
    label: 'Trial', color: '#F59E0B', price: 'Бесплатно 14 дней',
    features: ['Полный Premium доступ', 'Без кредитной карты', 'До 100 товаров'],
  },
  start: {
    label: 'Start', color: '#3B82F6', price: '$29 / мес',
    features: ['До 500 товаров', 'Базовая аналитика', 'Купоны и промокоды', 'Поддержка по email'],
  },
  business: {
    label: 'Business', color: '#8B5CF6', price: '$79 / мес',
    features: ['Безлимит товаров', 'CRM и рассылки', 'Брошенные корзины', 'Программа лояльности', 'Командный доступ'],
  },
  premium: {
    label: 'Premium', color: '#10B981', price: '$199 / мес',
    features: ['Всё из Business', 'AI-помощник', 'Web-витрина', 'Когортный анализ', 'Приоритетная поддержка'],
  },
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Активна', past_due: 'Просрочена', cancelled: 'Отменена', expired: 'Истекла', trial: 'Trial',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#10B981', past_due: '#F59E0B', cancelled: '#EF4444', expired: '#6B7280', trial: '#F59E0B',
}
const INV_STATUS_COLORS: Record<string, string> = {
  paid: '#10B981', pending: '#F59E0B', failed: '#EF4444',
}

export function BillingPage() {
  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['merchant-subscription'],
    queryFn: api.merchant.subscription,
    retry: false,
  })

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['merchant-invoices'],
    queryFn: api.merchant.invoices,
    retry: false,
  })

  const tier = (sub as any)?.tier ?? 'trial'
  const tierInfo = TIER_INFO[tier] ?? TIER_INFO.start
  const status = (sub as any)?.status ?? 'trial'
  const nextBilling = (sub as any)?.next_billing_date
  const trialEndsAt = (sub as any)?.trial_ends_at

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Биллинг и подписка</h1>

      {/* Current plan card */}
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Текущий тариф</div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-display" style={{ color: tierInfo.color }}>{tierInfo.label}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: `${STATUS_COLORS[status] ?? '#6B7280'}18`, color: STATUS_COLORS[status] ?? '#6B7280' }}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">{tierInfo.price}</div>
          </div>
          {subLoading && <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2">
          {tierInfo.features.map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500 flex-shrink-0">✓</span> {f}
            </div>
          ))}
        </div>

        {/* Billing info */}
        <div className="pt-3 border-t border-gray-50 flex flex-wrap gap-6">
          {nextBilling && (
            <div>
              <div className="text-xs text-gray-400">Следующая оплата</div>
              <div className="text-sm font-medium text-gray-800 mt-0.5">{fmtDate(nextBilling)}</div>
            </div>
          )}
          {trialEndsAt && tier === 'trial' && (
            <div>
              <div className="text-xs text-gray-400">Trial заканчивается</div>
              <div className="text-sm font-medium text-amber-600 mt-0.5">{fmtDate(trialEndsAt)}</div>
            </div>
          )}
          {(sub as any)?.amount && (
            <div>
              <div className="text-xs text-gray-400">Стоимость</div>
              <div className="text-sm font-medium text-gray-800 mt-0.5">{fmtMoney((sub as any).amount)} / мес</div>
            </div>
          )}
        </div>

        {/* Upgrade buttons */}
        {tier !== 'premium' && (
          <div className="pt-3 border-t border-gray-50">
            <div className="text-xs text-gray-500 mb-3">Перейти на другой тариф:</div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TIER_INFO).filter(([k]) => k !== tier && k !== 'trial').map(([plan, info]) => (
                <button key={plan}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors border-2"
                  style={{ borderColor: info.color, color: info.color, background: `${info.color}10` }}
                >
                  {info.label} — {info.price}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">История платежей</h2>
        </div>
        {invLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : (invoices as any[]).length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p className="text-3xl mb-2">🧾</p>
            <p>Платежей пока нет</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-6 py-3 font-medium">Инвойс</th>
                <th className="text-left px-6 py-3 font-medium">Дата</th>
                <th className="text-left px-6 py-3 font-medium">Тариф</th>
                <th className="text-left px-6 py-3 font-medium">Сумма</th>
                <th className="text-left px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {(invoices as any[]).map((inv: any) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">#{String(inv.id).slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-gray-600">{inv.created_at ? fmtDate(inv.created_at) : '—'}</td>
                  <td className="px-6 py-4 text-gray-800">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${TIER_INFO[inv.tier]?.color ?? '#6B7280'}18`, color: TIER_INFO[inv.tier]?.color ?? '#6B7280' }}>
                      {TIER_INFO[inv.tier]?.label ?? inv.tier ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold text-gray-900">{fmtMoney(inv.amount ?? 0)}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${INV_STATUS_COLORS[inv.status] ?? '#6B7280'}18`, color: INV_STATUS_COLORS[inv.status] ?? '#6B7280' }}>
                      {inv.status === 'paid' ? 'Оплачен' : inv.status === 'pending' ? 'Ожидает' : inv.status === 'failed' ? 'Не оплачен' : (inv.status ?? '—')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline">
                        PDF ↓
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
