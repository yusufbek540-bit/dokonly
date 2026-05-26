import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type TabId = 'subscriptions' | 'invoices' | 'refunds' | 'failed'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number, currency = 'USD') {
  return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency
}

const TIER_COLORS: Record<string, string> = {
  trial: '#F59E0B', start: '#3B82F6', business: '#8B5CF6', premium: '#10B981',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#10B981', cancelled: '#EF4444', expired: '#6B7280', past_due: '#F59E0B',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Активна', cancelled: 'Отменена', expired: 'Истекла', past_due: 'Просрочена',
}

function Spinner() {
  return (
    <div className="flex items-center justify-center p-16">
      <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
    </div>
  )
}

function Empty() {
  return <div className="text-center py-12 text-gray-400 text-sm">Нет данных</div>
}

function SubscriptionsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [extendModal, setExtendModal] = useState<any>(null)
  const [extendDays, setExtendDays] = useState(7)
  const [page, setPage] = useState(0)
  const PER_PAGE = 50

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['platform-subscriptions', search, tierFilter, statusFilter, page],
    queryFn: () => api.platform.subscriptions({
      q: search || undefined, tier: tierFilter || undefined,
      status: statusFilter || undefined, skip: page * PER_PAGE, limit: PER_PAGE,
    }),
    refetchInterval: 60000,
  })

  const extendMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => api.platform.extendTrial(id, days),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-subscriptions'] }); setExtendModal(null) },
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.platform.cancelSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-subscriptions'] }),
  })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Поиск по магазину..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="flex-1 min-w-48 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-accent"
        />
        <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none bg-white">
          <option value="">Все тарифы</option>
          <option value="trial">Trial</option>
          <option value="start">Start</option>
          <option value="business">Business</option>
          <option value="premium">Premium</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none bg-white">
          <option value="">Все статусы</option>
          <option value="active">Активна</option>
          <option value="cancelled">Отменена</option>
          <option value="expired">Истекла</option>
          <option value="past_due">Просрочена</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? <Spinner /> : (subs as any[]).length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Магазин</th>
                  <th className="text-left px-5 py-3 font-medium">Тариф</th>
                  <th className="text-left px-5 py-3 font-medium">Статус</th>
                  <th className="text-left px-5 py-3 font-medium">Начало</th>
                  <th className="text-left px-5 py-3 font-medium">След. оплата</th>
                  <th className="text-right px-5 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {(subs as any[]).map((sub: any) => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{sub.tenant_name ?? sub.tenant?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub.tenant?.slug ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${TIER_COLORS[sub.tier] ?? '#6B7280'}18`, color: TIER_COLORS[sub.tier] ?? '#6B7280' }}>
                        {(sub.tier ?? 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: `${STATUS_COLORS[sub.status] ?? '#6B7280'}18`, color: STATUS_COLORS[sub.status] ?? '#6B7280' }}>
                        {STATUS_LABELS[sub.status] ?? sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{sub.start_date ? fmtDate(sub.start_date) : '—'}</td>
                    <td className="px-5 py-4 text-gray-600">{sub.next_billing_date ? fmtDate(sub.next_billing_date) : '—'}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.tier === 'trial' && (
                          <button onClick={() => { setExtendModal(sub); setExtendDays(7) }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 font-medium hover:bg-amber-100 transition-colors">
                            + Продлить
                          </button>
                        )}
                        {sub.status === 'active' && sub.tier !== 'trial' && (
                          <button
                            onClick={() => { if (confirm(`Отменить подписку ${sub.tenant_name ?? sub.tenant?.name}?`)) cancelMutation.mutate(sub.id) }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 font-medium hover:bg-red-100 transition-colors">
                            Отменить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(subs as any[]).length === PER_PAGE && (
        <div className="flex justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">← Назад</button>
          <span className="flex items-center text-sm text-gray-500">Стр. {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50">Вперёд →</button>
        </div>
      )}

      {extendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg mb-2">Продлить Trial</h3>
            <p className="text-sm text-gray-500 mb-4">{extendModal.tenant_name ?? extendModal.tenant?.name}</p>
            <div className="flex gap-2 mb-4">
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setExtendDays(d)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${extendDays === d ? 'bg-accent text-white border-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {d} дн.
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExtendModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Отмена</button>
              <button onClick={() => extendMutation.mutate({ id: extendModal.id, days: extendDays })}
                disabled={extendMutation.isPending}
                className="flex-[2] py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-60">
                {extendMutation.isPending ? '...' : `Продлить на ${extendDays} дн.`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoicesTab() {
  const [page, setPage] = useState(0)
  const [refundModal, setRefundModal] = useState<any>(null)
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundReason, setRefundReason] = useState('')
  const qc = useQueryClient()
  const PER_PAGE = 50
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['platform-invoices', page],
    queryFn: () => api.platform.invoices({ skip: page * PER_PAGE, limit: PER_PAGE }),
  })

  const refundMutation = useMutation({
    mutationFn: () => api.platform.issueRefund(refundModal.id, refundAmount, refundReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-invoices'] })
      setRefundModal(null)
    },
  })

  const STATUS_INV_COLORS: Record<string, string> = {
    paid: '#10B981', pending: '#F59E0B', failed: '#EF4444', refunded: '#8B5CF6',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {isLoading ? <Spinner /> : (invoices as any[]).length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Инвойс</th>
                <th className="text-left px-5 py-3 font-medium">Магазин</th>
                <th className="text-left px-5 py-3 font-medium">Дата</th>
                <th className="text-left px-5 py-3 font-medium">Сумма</th>
                <th className="text-left px-5 py-3 font-medium">Статус</th>
                <th className="text-right px-5 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {(invoices as any[]).map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">#{String(inv.id).slice(0, 8).toUpperCase()}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{inv.tenant_name ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-500">{inv.created_at ? fmtDate(inv.created_at) : '—'}</td>
                  <td className="px-5 py-4 font-mono font-semibold text-gray-900">{fmtMoney(inv.amount ?? 0, inv.currency)}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${STATUS_INV_COLORS[inv.status] ?? '#6B7280'}18`, color: STATUS_INV_COLORS[inv.status] ?? '#6B7280' }}>
                      {inv.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.pdf_url && (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer"
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-medium hover:bg-gray-100 transition-colors">
                          PDF ↓
                        </a>
                      )}
                      {inv.status === 'paid' && !inv.refunded && (
                        <button
                          onClick={() => { setRefundModal(inv); setRefundAmount(inv.amount ?? 0); setRefundReason('') }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 font-medium hover:bg-purple-100 transition-colors">
                          Возврат
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(invoices as any[]).length === PER_PAGE && (
        <div className="flex justify-center gap-3 p-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40 hover:bg-gray-50">← Назад</button>
          <span className="flex items-center text-sm text-gray-500">Стр. {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Вперёд →</button>
        </div>
      )}

      {refundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg mb-1">Оформить возврат</h3>
            <p className="text-xs text-gray-400 font-mono mb-0.5">#{String(refundModal.id).slice(0, 8).toUpperCase()}</p>
            <p className="text-sm text-gray-500 mb-4">{refundModal.tenant_name ?? '—'}</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Сумма возврата</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(Number(e.target.value))}
                  min={0}
                  max={refundModal.amount ?? undefined}
                  step={0.01}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Причина</label>
                <textarea
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  rows={3}
                  placeholder="Укажите причину возврата..."
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Отмена</button>
              <button
                onClick={() => refundMutation.mutate()}
                disabled={refundMutation.isPending || refundAmount <= 0}
                className="flex-[2] py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60 hover:bg-purple-700 transition-colors">
                {refundMutation.isPending ? '...' : 'Подтвердить возврат'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RefundsTab() {
  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['platform-refunds'],
    queryFn: () => api.platform.refunds(),
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {isLoading ? <Spinner /> : (refunds as any[]).length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Возврат</th>
                <th className="text-left px-5 py-3 font-medium">Магазин</th>
                <th className="text-left px-5 py-3 font-medium">Дата</th>
                <th className="text-left px-5 py-3 font-medium">Сумма</th>
                <th className="text-left px-5 py-3 font-medium">Причина</th>
                <th className="text-left px-5 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {(refunds as any[]).map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">#{String(r.id).slice(0, 8).toUpperCase()}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{r.tenant_name ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-500">{r.created_at ? fmtDate(r.created_at) : '—'}</td>
                  <td className="px-5 py-4 font-mono font-semibold text-gray-900">{fmtMoney(r.amount ?? 0, r.currency)}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{r.reason ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                      {r.status ?? 'processed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FailedPaymentsTab() {
  const qc = useQueryClient()
  const { data: failed = [], isLoading } = useQuery({
    queryKey: ['platform-failed-payments'],
    queryFn: () => api.platform.failedPayments(),
    refetchInterval: 30000,
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.platform.extendTrial(id, 3),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-failed-payments'] }),
  })

  return (
    <div className="space-y-4">
      {(failed as any[]).length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
          <span className="font-bold">{(failed as any[]).length}</span> платежей требуют внимания
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? <Spinner /> : (failed as any[]).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm">Нет проблемных платежей</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Магазин</th>
                  <th className="text-left px-5 py-3 font-medium">Тариф</th>
                  <th className="text-left px-5 py-3 font-medium">Сумма</th>
                  <th className="text-left px-5 py-3 font-medium">Дата сбоя</th>
                  <th className="text-left px-5 py-3 font-medium">Попытки</th>
                  <th className="text-right px-5 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {(failed as any[]).map((f: any) => (
                  <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{f.tenant_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{f.tenant_email ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                        {(f.tier ?? '').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-gray-900">{fmtMoney(f.amount ?? 0, f.currency)}</td>
                    <td className="px-5 py-4 text-gray-500">{f.failed_at ? fmtDate(f.failed_at) : '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{f.attempt_count ?? 1} / 3</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => retryMutation.mutate(f.subscription_id)}
                        disabled={retryMutation.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 font-medium hover:bg-amber-100 transition-colors"
                      >
                        + 3 дня grace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function PlatformSubscriptionsPage() {
  const [tab, setTab] = useState<TabId>('subscriptions')

  const TABS = [
    { id: 'subscriptions' as TabId, label: 'Все подписки' },
    { id: 'invoices' as TabId, label: 'Инвойсы' },
    { id: 'refunds' as TabId, label: 'Возвраты' },
    { id: 'failed' as TabId, label: '⚠ Проблемные платежи' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Подписки и биллинг</h1>

      <div className="flex border-b gap-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'refunds' && <RefundsTab />}
      {tab === 'failed' && <FailedPaymentsTab />}
    </div>
  )
}
