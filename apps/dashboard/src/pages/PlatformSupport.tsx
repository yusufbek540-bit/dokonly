import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  resolved: 'Решён',
  closed: 'Закрыт',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}м`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}ч`
  return `${Math.floor(hrs / 24)}д`
}

interface TicketDetailProps {
  ticket: any
  onClose: () => void
}

function TicketDetail({ ticket, onClose }: TicketDetailProps) {
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  const replyMutation = useMutation({
    mutationFn: () =>
      api.platform.addTenantNote(ticket.tenant_id, `[${isInternal ? 'INTERNAL' : 'PUBLIC'}] ${reply}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-support'] })
      setReply('')
    },
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/20" />
      <div
        className="relative bg-white w-[520px] h-full shadow-2xl flex flex-col z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[ticket.status] ?? ticket.status}
              </span>
            </div>
            <p className="font-semibold text-base">{ticket.subject ?? 'Тикет'}</p>
            <p className="text-xs text-gray-400 mt-0.5">#{ticket.id?.slice(0, 8)} · {ticket.tenant_name ?? '—'} · {timeAgo(ticket.created_at)} назад</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-3">✕</button>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Original message */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">{ticket.user_name ?? 'Мерчант'}</span>
              <span className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleString('ru-RU')}</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.body ?? ticket.message ?? 'Нет сообщения'}</p>
          </div>

          {/* Replies */}
          {(ticket.replies ?? []).map((r: any, i: number) => (
            <div key={i} className={`rounded-xl p-4 ${r.is_internal ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">{r.author ?? 'Поддержка'}</span>
                {r.is_internal && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Внутренняя</span>}
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('ru-RU')}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-700">Ответ</span>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer ml-auto">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="w-4 h-4 accent-amber-500" />
              <span className={isInternal ? 'text-amber-700 font-medium' : 'text-gray-500'}>Внутренняя заметка</span>
            </label>
          </div>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={isInternal ? 'Заметка видна только команде...' : 'Ответ мерчанту...'}
            rows={3}
            className={`w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 ${
              isInternal ? 'border-amber-200 focus:ring-amber-300/30' : 'focus:ring-accent/30'
            }`}
          />
          <button
            onClick={() => replyMutation.mutate()}
            disabled={!reply.trim() || replyMutation.isPending}
            className="mt-2 w-full bg-accent text-white rounded-xl py-2.5 text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
          >
            {replyMutation.isPending ? 'Отправка...' : 'Отправить ответ'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlatformSupportPage() {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['platform-support'],
    queryFn: () => api.platform.tenants() as Promise<any[]>,
    select: (data) =>
      (data ?? []).flatMap((t: any) =>
        (t.support_tickets ?? []).map((tk: any) => ({ ...tk, tenant_name: t.name, tenant_id: t.id }))
      ),
  })

  const filtered = (tickets as any[]).filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (search && !(t.subject ?? '').toLowerCase().includes(search.toLowerCase()) && !t.id?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">Тикеты поддержки</h1>
        <span className="text-sm text-gray-400">{filtered.length} тикетов</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-white rounded-xl border flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Поиск по теме или ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 w-56"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none">
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none">
          <option value="">Все приоритеты</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm">Тикетов нет</p>
          <p className="text-xs mt-1">Все тихо — отличный знак!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-4 py-3">Тикет</th>
                <th className="text-left px-4 py-3">Магазин</th>
                <th className="text-left px-4 py-3">Приоритет</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="text-left px-4 py-3">Создан</th>
                <th className="text-left px-4 py-3">Обновлён</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr
                  key={t.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTicket(t)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-xs">{t.subject ?? 'Без темы'}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">#{t.id?.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.tenant_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                      {PRIORITY_LABELS[t.priority] ?? t.priority ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[t.status] ?? t.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(t.created_at)} назад</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{t.updated_at ? timeAgo(t.updated_at) + ' назад' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTicket && (
        <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  )
}
