import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
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

export function PlatformSubscriptionsPage() {
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
      q: search || undefined,
      tier: tierFilter || undefined,
      status: statusFilter || undefined,
      skip: page * PER_PAGE,
      limit: PER_PAGE,
    }),
    refetchInterval: 60000,
  })

  const extendMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => api.platform.extendTrial(id, days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-subscriptions'] })
      setExtendModal(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.platform.cancelSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-subscriptions'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Подписки</h1>
        <span className="text-sm text-gray-400">{(subs as any[]).length} результатов</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Поиск по магазину..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="flex-1 min-w-48 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-accent"
        />
        <select
          value={tierFilter}
          onChange={e => { setTierFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-accent bg-white"
        >
          <option value="">Все тарифы</option>
          <option value="trial">Trial</option>
          <option value="start">Start</option>
          <option value="business">Business</option>
          <option value="premium">Premium</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-accent bg-white"
        >
          <option value="">Все статусы</option>
          <option value="active">Активна</option>
          <option value="cancelled">Отменена</option>
          <option value="expired">Истекла</option>
          <option value="past_due">Просрочена</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : (subs as any[]).length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Нет данных</div>
        ) : (
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
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${TIER_COLORS[sub.tier] ?? '#6B7280'}18`, color: TIER_COLORS[sub.tier] ?? '#6B7280' }}
                      >
                        {(sub.tier ?? 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: `${STATUS_COLORS[sub.status] ?? '#6B7280'}18`, color: STATUS_COLORS[sub.status] ?? '#6B7280' }}
                      >
                        {STATUS_LABELS[sub.status] ?? sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{sub.start_date ? fmtDate(sub.start_date) : '—'}</td>
                    <td className="px-5 py-4 text-gray-600">{sub.next_billing_date ? fmtDate(sub.next_billing_date) : '—'}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.tier === 'trial' && (
                          <button
                            onClick={() => { setExtendModal(sub); setExtendDays(7) }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 font-medium hover:bg-amber-100 transition-colors"
                          >
                            + Продлить
                          </button>
                        )}
                        {sub.status === 'active' && sub.tier !== 'trial' && (
                          <button
                            onClick={() => {
                              if (confirm(`Отменить подписку ${sub.tenant_name ?? sub.tenant?.name}?`)) {
                                cancelMutation.mutate(sub.id)
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 font-medium hover:bg-red-100 transition-colors"
                          >
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

      {/* Pagination */}
      {(subs as any[]).length === PER_PAGE && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Назад
          </button>
          <span className="flex items-center text-sm text-gray-500">Стр. {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50"
          >
            Вперёд →
          </button>
        </div>
      )}

      {/* Extend trial modal */}
      {extendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg mb-2">Продлить Trial</h3>
            <p className="text-sm text-gray-500 mb-4">{extendModal.tenant_name ?? extendModal.tenant?.name}</p>
            <div className="flex gap-2 mb-4">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setExtendDays(d)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    extendDays === d ? 'bg-accent text-white border-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d} дн.
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setExtendModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={() => extendMutation.mutate({ id: extendModal.id, days: extendDays })}
                disabled={extendMutation.isPending}
                className="flex-2 flex-[2] py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-60"
              >
                {extendMutation.isPending ? '...' : `Продлить на ${extendDays} дн.`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
