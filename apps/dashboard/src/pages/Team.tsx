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

export function TeamPage() {
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState('manager')
  const [error, setError] = useState('')

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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
