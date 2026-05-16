import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const TIER_COLORS: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800',
  start: 'bg-blue-100 text-blue-800',
  business: 'bg-purple-100 text-purple-800',
  premium: 'bg-green-100 text-green-800',
}

const TIERS = ['', 'trial', 'start', 'business', 'premium']

export function PlatformTenantsPage() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const qc = useQueryClient()

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['platform-tenants', search, tierFilter],
    queryFn: () => api.platform.tenants({ q: search || undefined, tier: tierFilter || undefined, limit: 100 }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.platform.updateTenant(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      setSelected(null)
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold font-display mb-6">Магазины</h1>

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

      {/* Tenant count */}
      <p className="text-sm text-gray-500 mb-3">{tenants.length} магазинов</p>

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
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
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
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('ru') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.is_active ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(t)}
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

      {/* Edit modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">{selected.name}</h2>
            <p className="text-sm text-gray-500 font-mono mb-4">{selected.slug}</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Тариф</label>
                <select
                  defaultValue={selected.tier}
                  id="tier-select"
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none bg-white"
                >
                  {TIERS.filter(Boolean).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active-check" defaultChecked={selected.is_active} className="w-4 h-4" />
                <label htmlFor="active-check" className="text-sm font-medium text-gray-700">Активен</label>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  const tier = (document.getElementById('tier-select') as HTMLSelectElement).value
                  const is_active = (document.getElementById('active-check') as HTMLInputElement).checked
                  updateMutation.mutate({ id: selected.id, body: { tier, is_active } })
                }}
                disabled={updateMutation.isPending}
                className="flex-1 h-10 rounded-xl bg-accent text-white font-semibold text-sm"
              >
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setSelected(null)}
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
