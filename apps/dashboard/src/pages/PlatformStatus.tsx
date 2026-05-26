import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: 'OK', cls: 'bg-green-100 text-green-700' },
    healthy: { label: 'Healthy', cls: 'bg-green-100 text-green-700' },
    degraded: { label: 'Degraded', cls: 'bg-amber-100 text-amber-700' },
    down: { label: 'Down', cls: 'bg-red-100 text-red-700' },
    unknown: { label: 'Unknown', cls: 'bg-gray-100 text-gray-500' },
  }
  const s = map[status?.toLowerCase()] ?? { label: status ?? '—', cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: '#10B981', healthy: '#10B981',
    degraded: '#F59E0B',
    down: '#EF4444',
  }
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ background: colors[status?.toLowerCase()] ?? '#9CA3AF' }}
    />
  )
}

export function PlatformStatusPage() {
  const { data: status, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['platform-status'],
    queryFn: api.platform.systemStatus,
    refetchInterval: 60000,
  })

  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  const services = status?.services ?? {}
  const incidents = status?.recent_incidents ?? []
  const workers = status?.workers ?? []
  const aiProviders = status?.ai_providers ?? {}

  const allOk = Object.values(services).every((v: any) => ['ok', 'healthy'].includes(String(v?.status ?? v).toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Статус системы</h1>
          <p className="text-sm text-gray-400 mt-0.5">Последнее обновление: {lastChecked}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${allOk ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <div className={`w-2 h-2 rounded-full ${allOk ? 'bg-green-500' : 'bg-amber-500'}`} />
            {isLoading ? 'Проверяем...' : allOk ? 'Все системы работают' : 'Есть проблемы'}
          </div>
          <button
            onClick={() => refetch()}
            className="text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            Обновить
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Core services */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Основные сервисы</h2>
            {Object.keys(services).length === 0 ? (
              <p className="text-sm text-gray-400">Нет данных</p>
            ) : (
              <div className="space-y-0">
                {Object.entries(services).map(([name, val]: [string, any]) => {
                  const s = typeof val === 'object' ? val : { status: val }
                  return (
                    <div key={name} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <StatusDot status={s.status} />
                        <span className="text-sm font-medium text-gray-700 capitalize">{name.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {s.latency_ms !== undefined && (
                          <span className="text-xs text-gray-400 font-mono">{s.latency_ms}ms</span>
                        )}
                        {s.uptime_pct !== undefined && (
                          <span className="text-xs text-gray-400">{s.uptime_pct}% uptime</span>
                        )}
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Background workers */}
          {workers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Фоновые задачи</h2>
              <div className="space-y-0">
                {(workers as any[]).map((w: any) => (
                  <div key={w.name} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <StatusDot status={w.status} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{w.name}</p>
                        {w.last_run && <p className="text-xs text-gray-400">Последний запуск: {new Date(w.last_run).toLocaleTimeString('ru')}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {w.queue_size !== undefined && (
                        <span className="text-xs text-gray-400">Очередь: {w.queue_size}</span>
                      )}
                      <StatusBadge status={w.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI providers */}
          {Object.keys(aiProviders).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">AI провайдеры</h2>
              <div className="space-y-0">
                {Object.entries(aiProviders).map(([name, val]: [string, any]) => {
                  const s = typeof val === 'object' ? val : { status: val }
                  return (
                    <div key={name} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <StatusDot status={s.status} />
                        <span className="text-sm font-medium text-gray-700 capitalize">{name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {s.latency_ms !== undefined && (
                          <span className="text-xs text-gray-400 font-mono">{s.latency_ms}ms</span>
                        )}
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent incidents */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Последние инциденты</h2>
            {incidents.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm">Нет инцидентов за последние 30 дней</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(incidents as any[]).map((inc: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${inc.resolved ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{inc.title}</p>
                      {inc.description && <p className="text-xs text-gray-500 mt-0.5">{inc.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {inc.started_at ? new Date(inc.started_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        {inc.resolved && inc.resolved_at ? ` — Устранён ${new Date(inc.resolved_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ' — В процессе'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
