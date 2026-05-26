import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  support: 'Поддержка',
  finance: 'Финансы',
  analyst: 'Аналитик',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  support: 'bg-green-100 text-green-700',
  finance: 'bg-amber-100 text-amber-700',
  analyst: 'bg-gray-100 text-gray-700',
}

export function PlatformTeamPage() {
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('support')
  const [inviteError, setInviteError] = useState('')

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['platform-team'],
    queryFn: api.platform.team,
    refetchInterval: 60000,
  })

  const inviteMutation = useMutation({
    mutationFn: () => api.platform.inviteTeamMember({ email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-team'] })
      setShowInvite(false)
      setInviteEmail('')
      setInviteError('')
    },
    onError: (e: any) => setInviteError(e.message ?? 'Ошибка'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.platform.removeTeamMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-team'] }),
  })

  function fmtDate(iso: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Команда</h1>
          <p className="text-sm text-gray-400 mt-0.5">Участники платформы Dokonly</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          + Пригласить
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (members as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 text-sm">Нет участников команды</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Участник</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Роль</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">2FA</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Последний вход</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(members as any[]).map((m: any) => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm flex items-center justify-center">
                        {(m.name || m.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.name || '—'}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold ${m.two_factor_enabled ? 'text-green-600' : 'text-red-500'}`}>
                      {m.two_factor_enabled ? '✓ Включён' : '✕ Выключен'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{fmtDate(m.last_active_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => {
                          if (confirm(`Удалить ${m.email} из команды?`)) {
                            removeMutation.mutate(m.id)
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Удалить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Пригласить участника</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="team@dokonly.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  <option value="admin">Администратор</option>
                  <option value="support">Поддержка</option>
                  <option value="finance">Финансы</option>
                  <option value="analyst">Аналитик</option>
                </select>
              </div>
              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteError('') }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={() => inviteMutation.mutate()}
                disabled={!inviteEmail || inviteMutation.isPending}
                className="flex-1 bg-accent text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {inviteMutation.isPending ? 'Отправляем...' : 'Пригласить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
