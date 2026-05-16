import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const TIER_COLORS: Record<string, string> = {
  trial:    'bg-yellow-100 text-yellow-800',
  start:    'bg-blue-100 text-blue-800',
  business: 'bg-purple-100 text-purple-800',
  premium:  'bg-green-100 text-green-800',
}

const TIERS = ['', 'trial', 'start', 'business', 'premium']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`
  const days = Math.floor(diff / 86400)
  return `${days} дн. назад`
}

function TenantDetailPanel({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'products' | 'team' | 'settings' | 'activity' | 'notes'>('overview')
  const [editTier, setEditTier] = useState(tenant.tier ?? 'trial')
  const [suspendReason, setSuspendReason] = useState('')
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [noteInput, setNoteInput] = useState('')

  const { data: detail } = useQuery({
    queryKey: ['platform-tenant', tenant.id],
    queryFn: () => api.platform.tenant(tenant.id),
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['platform-tenant-activity', tenant.id],
    queryFn: () => api.platform.tenantActivity(tenant.id),
    enabled: activeTab === 'activity',
    retry: false,
  })

  const { data: subscription } = useQuery({
    queryKey: ['platform-tenant-subscription', tenant.id],
    queryFn: () => api.platform.tenantSubscription(tenant.id),
    enabled: activeTab === 'subscription',
    retry: false,
  })

  const { data: products } = useQuery({
    queryKey: ['platform-tenant-products', tenant.id],
    queryFn: () => api.platform.tenantProducts(tenant.id),
    enabled: activeTab === 'products',
    retry: false,
  })

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['platform-tenant-team', tenant.id],
    queryFn: () => api.platform.tenantTeam(tenant.id),
    enabled: activeTab === 'team',
    retry: false,
  })

  const { data: notes = [] } = useQuery({
    queryKey: ['platform-tenant-notes', tenant.id],
    queryFn: () => api.platform.tenantNotes(tenant.id),
    enabled: activeTab === 'notes',
    retry: false,
  })

  const addNoteMutation = useMutation({
    mutationFn: () => api.platform.addTenantNote(tenant.id, noteInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenant-notes', tenant.id] })
      setNoteInput('')
    },
  })

  const updateMut = useMutation({
    mutationFn: (body: object) => api.platform.updateTenant(tenant.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-tenants'] }),
  })

  const suspendMut = useMutation({
    mutationFn: (reason: string) => api.platform.suspendTenant(tenant.id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      setShowSuspendModal(false)
    },
  })

  const unsuspendMut = useMutation({
    mutationFn: () => api.platform.unsuspendTenant(tenant.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-tenants'] }),
  })

  const t = detail ?? tenant
  const shopUrl = `https://dokonly-miniapp.pages.dev?shop=${t.slug}`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50" onClick={onClose}>
      <div
        className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
            🏪
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 truncate">{t.name}</div>
            <div className="text-xs text-gray-400 font-mono">{t.slug}</div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[t.tier] ?? 'bg-gray-100 text-gray-600'}`}>
            {t.tier}
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto scrollbar-hide">
          {([
            { id: 'overview', label: 'Обзор' },
            { id: 'subscription', label: 'Подписка' },
            { id: 'products', label: 'Товары' },
            { id: 'team', label: 'Команда' },
            { id: 'settings', label: 'Настройки' },
            { id: 'activity', label: 'Активность' },
            { id: 'notes', label: 'Заметки' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-accent border-b-2 border-accent' : 'text-gray-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* Key stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Заказов',     value: t.stats?.total_orders ?? t.order_count ?? '—' },
                  { label: 'Товаров',     value: t.stats?.product_count ?? t.product_count ?? '—' },
                  { label: 'Покупателей', value: t.stats?.customer_count ?? t.customer_count ?? '—' },
                  { label: 'Выручка',     value: t.stats?.total_revenue ? (Number(t.stats.total_revenue) / 1000).toFixed(0) + 'K' : '—' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                    <div className="font-mono font-bold text-gray-800">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Info rows */}
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                {[
                  { label: 'Создан',      value: t.created_at ? fmtDate(t.created_at) : '—' },
                  { label: 'Бот',         value: t.bot_username ? `@${t.bot_username}` : 'Не настроен' },
                  { label: 'Статус',      value: t.is_active ? '✅ Активен' : '🚫 Отключён' },
                  { label: 'Последний вход', value: t.last_active_at ? fmtAgo(t.last_active_at) : '—' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between px-3 py-2.5 text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-[120px] h-9 flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors no-underline"
                >
                  👁 Магазин
                </a>
                {t.bot_username && (
                  <a
                    href={`https://t.me/${t.bot_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[120px] h-9 flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors no-underline"
                  >
                    💬 Telegram
                  </a>
                )}
                {t.is_active ? (
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="flex-1 min-w-[120px] h-9 rounded-xl bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    🚫 Заблокировать
                  </button>
                ) : (
                  <button
                    onClick={() => unsuspendMut.mutate()}
                    disabled={unsuspendMut.isPending}
                    className="flex-1 min-w-[120px] h-9 rounded-xl bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
                  >
                    ✅ Разблокировать
                  </button>
                )}
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Тариф</label>
                <select
                  value={editTier}
                  onChange={e => setEditTier(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent bg-white"
                >
                  {TIERS.filter(Boolean).map(tier => (
                    <option key={tier} value={tier}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-medium text-gray-800">Активен</div>
                  <div className="text-xs text-gray-500 mt-0.5">Доступ к мини-приложению</div>
                </div>
                <button
                  onClick={() => updateMut.mutate({ is_active: !t.is_active })}
                  className={`w-11 h-6 rounded-full transition-colors ${t.is_active ? 'bg-accent' : 'bg-gray-200'} relative`}
                >
                  <div className={`absolute top-0.5 bottom-0.5 w-5 rounded-full bg-white shadow transition-transform ${t.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <button
                onClick={() => updateMut.mutate({ tier: editTier })}
                disabled={updateMut.isPending || editTier === t.tier}
                className="w-full h-10 rounded-xl bg-accent text-white font-semibold text-sm disabled:opacity-50"
              >
                {updateMut.isPending ? 'Сохранение...' : 'Сохранить тариф'}
              </button>
            </>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-1">
              {(activity as any[]).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Активности нет</p>
              ) : (
                (activity as any[]).map((evt: any, i: number) => (
                  <div key={evt.id ?? i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{evt.description ?? evt.action ?? evt.type}</p>
                      {evt.user_name && (
                        <p className="text-xs text-gray-400 mt-0.5">by {evt.user_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {evt.created_at ? fmtAgo(evt.created_at) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-3">
              {!subscription ? (
                <p className="text-sm text-gray-400 text-center py-8">Загрузка...</p>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                    {[
                      { label: 'Тариф', value: subscription.tier ? (subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)) : '—' },
                      { label: 'Статус', value: subscription.status ?? '—' },
                      { label: 'Начало', value: subscription.started_at ? fmtDate(subscription.started_at) : '—' },
                      { label: 'Следующее списание', value: subscription.next_billing_at ? fmtDate(subscription.next_billing_at) : '—' },
                      { label: 'Сумма', value: subscription.amount ? `${Number(subscription.amount).toLocaleString()} ${subscription.currency ?? ''}` : '—' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between px-3 py-2.5 text-sm">
                        <span className="text-gray-500">{row.label}</span>
                        <span className="font-medium text-gray-800">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {subscription.invoices && subscription.invoices.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Счета</p>
                      <div className="space-y-1">
                        {subscription.invoices.slice(0, 5).map((inv: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                            <span className="text-gray-600">{inv.created_at ? fmtDate(inv.created_at) : '—'}</span>
                            <span className="font-mono text-gray-800">{Number(inv.amount).toLocaleString()} {inv.currency}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${inv.paid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {inv.paid ? 'Оплачен' : 'Ожидает'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-3">
              {!products ? (
                <p className="text-sm text-gray-400 text-center py-8">Загрузка...</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Всего товаров', value: products.total ?? '—' },
                      { label: 'Активных', value: products.active ?? '—' },
                      { label: 'Категорий', value: products.categories ?? '—' },
                      { label: 'С видео', value: products.with_video ?? '—' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                        <div className="font-mono font-bold text-gray-800">{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {products.top_products && products.top_products.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Топ по просмотрам</p>
                      {products.top_products.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                          <span className="text-gray-700 truncate flex-1 mr-2">{p.name}</span>
                          <span className="text-gray-400 text-xs">{p.view_count ?? 0} просм.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-1">
              {(teamMembers as any[]).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Нет участников команды</p>
              ) : (
                (teamMembers as any[]).map((m: any, i: number) => (
                  <div key={m.id ?? i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {(m.name || m.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{m.name ?? m.username ?? '—'}</p>
                      <p className="text-xs text-gray-400">{m.last_active_at ? fmtAgo(m.last_active_at) : 'Приглашён'}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 capitalize">{m.role}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="space-y-1">
                {(notes as any[]).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Нет заметок</p>
                ) : (
                  (notes as any[]).map((n: any, i: number) => (
                    <div key={n.id ?? i} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-sm text-gray-800">{n.content}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {n.author_name ?? n.author_email ?? 'Platform'} · {n.created_at ? fmtAgo(n.created_at) : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Добавить заметку..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-accent"
                />
                <button
                  onClick={() => addNoteMutation.mutate()}
                  disabled={!noteInput.trim() || addNoteMutation.isPending}
                  className="w-full h-9 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-50"
                >
                  {addNoteMutation.isPending ? 'Добавляем...' : 'Добавить заметку'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4" onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-2">Заблокировать магазин?</h3>
            <p className="text-sm text-gray-500 mb-4">Доступ к магазину будет прекращён.</p>
            <textarea
              placeholder="Причина блокировки (обязательно)"
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => suspendMut.mutate(suspendReason)}
                disabled={!suspendReason.trim() || suspendMut.isPending}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white font-semibold text-sm disabled:opacity-50"
              >
                {suspendMut.isPending ? '...' : 'Заблокировать'}
              </button>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 h-10 rounded-xl border text-sm font-semibold"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function PlatformTenantsPage() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const qc = useQueryClient()

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['platform-tenants', search, tierFilter],
    queryFn: () => api.platform.tenants({ q: search || undefined, tier: tierFilter || undefined, limit: 100 }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.platform.updateTenant(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      setEditTarget(null)
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Магазины</h1>
        <span className="text-sm text-gray-400">{tenants.length} магазинов</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          placeholder="Поиск по названию или slug..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent bg-white"
        >
          <option value="">Все тарифы</option>
          {TIERS.filter(Boolean).map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Магазин</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Тариф</th>
                <th className="px-4 py-3 font-medium">Бот</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: any) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(t)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TIER_COLORS[t.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.bot_username ? (
                      <span className="text-green-600 font-medium">@{t.bot_username}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.created_at ? fmtDate(t.created_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.is_active ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setEditTarget(t)}
                      className="text-accent hover:underline text-xs font-medium"
                    >
                      Изменить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel (slide-in) */}
      {selected && (
        <TenantDetailPanel tenant={selected} onClose={() => setSelected(null)} />
      )}

      {/* Quick edit modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">{editTarget.name}</h2>
            <p className="text-sm text-gray-500 font-mono mb-4">{editTarget.slug}</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Тариф</label>
                <select
                  defaultValue={editTarget.tier}
                  id="tier-select"
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none bg-white"
                >
                  {TIERS.filter(Boolean).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active-check" defaultChecked={editTarget.is_active} className="w-4 h-4" />
                <label htmlFor="active-check" className="text-sm font-medium text-gray-700">Активен</label>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  const tier = (document.getElementById('tier-select') as HTMLSelectElement).value
                  const is_active = (document.getElementById('active-check') as HTMLInputElement).checked
                  updateMutation.mutate({ id: editTarget.id, body: { tier, is_active } })
                }}
                disabled={updateMutation.isPending}
                className="flex-1 h-10 rounded-xl bg-accent text-white font-semibold text-sm"
              >
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 h-10 rounded-xl border text-sm font-semibold"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
