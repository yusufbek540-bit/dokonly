import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец', admin: 'Администратор', manager: 'Менеджер', viewer: 'Наблюдатель',
}
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  return `${days} дней назад`
}

type NotifPrefs = { new_orders: boolean; payment_failures: boolean; low_stock: boolean; daily_summary: boolean }

const DEFAULT_PREFS: NotifPrefs = { new_orders: true, payment_failures: true, low_stock: false, daily_summary: false }

export function TeamPage() {
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState('manager')
  const [error, setError] = useState('')
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [memberPrefs, setMemberPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['merchant-team'],
    queryFn: api.merchant.team,
    retry: false,
  })

  const invite = useMutation({
    mutationFn: () => api.merchant.inviteTeam({ username: inviteUsername, role: inviteRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant-team'] })
      setShowInvite(false)
      setInviteUsername('')
      setError('')
    },
    onError: (e: Error) => setError(e.message),
  })

  const remove = useMutation({
    mutationFn: api.merchant.removeTeam,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-team'] }),
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">Команда</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          + Пригласить участника
        </button>
      </div>

      {showInvite && (
        <div className="mb-5 p-5 border rounded-2xl bg-white space-y-4">
          <h3 className="font-semibold">Пригласить в команду</h3>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telegram @username</label>
              <input
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Роль</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="admin">Администратор</option>
                <option value="manager">Менеджер</option>
                <option value="viewer">Наблюдатель</option>
              </select>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
            <p><b>Администратор</b> — полный доступ, кроме биллинга</p>
            <p><b>Менеджер</b> — заказы, продукты, клиенты</p>
            <p><b>Наблюдатель</b> — только просмотр</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowInvite(false); setError('') }} className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50">
              Отмена
            </button>
            <button
              onClick={() => invite.mutate()}
              disabled={!inviteUsername.trim() || invite.isPending}
              className="px-4 py-2 text-sm bg-accent text-white rounded-xl font-medium disabled:opacity-50 hover:bg-accent/90"
            >
              {invite.isPending ? 'Отправляем...' : 'Отправить приглашение'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (team as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm">Команды пока нет</p>
          <p className="text-xs mt-1">Пригласите сотрудников для совместной работы</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-5 py-3">Участник</th>
                <th className="text-left px-5 py-3">Роль</th>
                <th className="text-left px-5 py-3">Последняя активность</th>
                <th className="text-left px-5 py-3">Статус</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(team as any[]).map((m: any) => {
                const name = m.name ?? m.full_name ?? m.username ?? 'Участник'
                return (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent text-sm flex-shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{name}</p>
                          {m.username && <p className="text-xs text-gray-400">@{m.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{fmtDate(m.last_active_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {m.status === 'pending' ? 'Ожидает' : 'Активен'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setSelectedMember(m); setMemberPrefs({ ...DEFAULT_PREFS, ...(m.notification_prefs ?? {}) }) }}
                          className="text-gray-400 hover:text-accent transition-colors"
                          title="Настроить уведомления"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </button>
                        {m.role !== 'owner' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Удалить ${name} из команды?`)) remove.mutate(m.id)
                            }}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">Уведомления</h3>
            <p className="text-sm text-gray-400 mb-5">{selectedMember.username ?? selectedMember.email}</p>
            <div className="space-y-3">
              {([
                { key: 'new_orders', label: 'Новые заказы' },
                { key: 'payment_failures', label: 'Ошибки оплаты' },
                { key: 'low_stock', label: 'Низкий остаток' },
                { key: 'daily_summary', label: 'Ежедневный отчёт' },
              ] as const).map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-800">{item.label}</span>
                  <button
                    onClick={() => setMemberPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${memberPrefs[item.key] ? 'bg-accent' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${memberPrefs[item.key] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedMember(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">Отмена</button>
              <button
                onClick={async () => {
                  await api.merchant.updateTeamNotifications(selectedMember.id, memberPrefs).catch(() => {})
                  setSelectedMember(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
