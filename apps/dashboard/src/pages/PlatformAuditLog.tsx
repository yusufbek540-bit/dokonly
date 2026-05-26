import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const PAGE_SIZE = 50

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-gray-100 text-gray-600',
  suspend: 'bg-orange-100 text-orange-700',
  unsuspend: 'bg-teal-100 text-teal-700',
  invite: 'bg-purple-100 text-purple-700',
  cancel: 'bg-red-100 text-red-700',
  extend: 'bg-amber-100 text-amber-700',
}

function actionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find(k => action?.toLowerCase().startsWith(k))
  return key ? ACTION_COLORS[key] : 'bg-gray-100 text-gray-600'
}

export function PlatformAuditLogPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [skip, setSkip] = useState(0)

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['platform-audit', actionFilter, skip],
    queryFn: () => api.platform.auditLog({
      action: actionFilter || undefined,
      skip,
      limit: PAGE_SIZE,
    }),
    refetchInterval: 30000,
  })

  function fmtDateFull(iso: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('ru', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Журнал аудита</h1>
          <p className="text-sm text-gray-400 mt-0.5">Все действия на платформе</p>
        </div>
        <button
          onClick={() => {
            const rows = (entries as any[]).map((e: any) =>
              [fmtDateFull(e.created_at), e.actor_email ?? e.actor_id, e.action, e.target_type, e.target_id, JSON.stringify(e.meta ?? {})].join('\t')
            ).join('\n')
            const blob = new Blob([`Дата\tАктор\tДействие\tТип\tID\tМета\n${rows}`], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = 'audit-log.tsv'; a.click()
            URL.revokeObjectURL(url)
          }}
          className="text-sm text-accent font-medium border border-accent/30 px-4 py-2 rounded-xl hover:bg-accent/5"
        >
          ↓ Экспорт
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setSkip(0) }}
          placeholder="Фильтр по действию..."
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent w-56"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (entries as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-sm">Нет записей аудита</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Время</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Актор</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Действие</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Объект</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Детали</th>
              </tr>
            </thead>
            <tbody>
              {(entries as any[]).map((e: any, i: number) => (
                <tr key={e.id ?? i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap font-mono">{fmtDateFull(e.created_at)}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-700">{e.actor_email ?? e.actor_name ?? '—'}</p>
                    {e.actor_role && <p className="text-xs text-gray-400">{e.actor_role}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionColor(e.action)}`}>
                      {e.action ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {e.target_type && <span className="text-gray-400 mr-1">{e.target_type}:</span>}
                    <span className="font-mono text-xs">{e.target_id ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">
                    {e.description || (e.meta ? JSON.stringify(e.meta) : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Показано {skip + 1}–{skip + Math.min(PAGE_SIZE, (entries as any[]).length)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
            disabled={skip === 0}
            className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            ← Назад
          </button>
          <button
            onClick={() => setSkip(skip + PAGE_SIZE)}
            disabled={(entries as any[]).length < PAGE_SIZE}
            className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            Вперёд →
          </button>
        </div>
      </div>
    </div>
  )
}
