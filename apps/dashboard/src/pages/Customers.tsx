import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const SEGMENTS = ['', 'new', 'returning', 'vip']
const SEGMENT_LABELS: Record<string, string> = { '': 'Все сегменты', new: 'Новые', returning: 'Постоянные', vip: 'VIP' }
const SEGMENT_COLORS: Record<string, string> = { new: 'bg-blue-100 text-blue-700', returning: 'bg-purple-100 text-purple-700', vip: 'bg-amber-100 text-amber-700' }

function fmtPrice(n: number, currency = 'UZS') {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CustomerPanel({ customer, onClose }: { customer: any; onClose: () => void }) {
  const totalSpent: number = customer.total_spent ?? 0
  const orderCount: number = customer.order_count ?? 0
  const aov = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0
  const segment = orderCount >= 5 ? 'vip' : orderCount >= 2 ? 'returning' : 'new'
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'notes'>('overview')
  const [newNote, setNewNote] = useState('')
  const [newTag, setNewTag] = useState('')
  const qc = useQueryClient()

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['customer-notes', customer.id],
    queryFn: () => api.merchant.customerNotes(customer.id),
    retry: false,
  })

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => api.merchant.addCustomerNote(customer.id, content),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-notes', customer.id] }); setNewNote('') },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.merchant.deleteCustomerNote(customer.id, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-notes', customer.id] }),
  })

  const addTagMutation = useMutation({
    mutationFn: (tag: string) => api.merchant.addCustomerTag(customer.id, tag),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-notes', customer.id] }); setNewTag('') },
  })

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => api.merchant.removeCustomerTag(customer.id, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-notes', customer.id] }),
  })

  const tags: string[] = customer.tags ?? []

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/20" />
      <div
        className="relative bg-white w-[480px] h-full shadow-2xl flex flex-col z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent text-lg">
              {(customer.name ?? customer.first_name ?? '?')[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-base">{customer.name ?? [customer.first_name, customer.last_name].filter(Boolean).join(' ') ?? 'Клиент'}</p>
              {customer.username && <p className="text-xs text-gray-400">@{customer.username}</p>}
              {customer.phone && <p className="text-xs text-gray-400">📞 {customer.phone}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5">
          {(['overview', 'orders', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' ? 'Обзор' : tab === 'orders' ? 'Заказы' : 'Заметки и теги'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Заказов', value: orderCount },
                  { label: 'Потрачено', value: totalSpent > 0 ? fmtPrice(totalSpent, customer.currency) : '—' },
                  { label: 'Средний чек', value: aov > 0 ? fmtPrice(aov, customer.currency) : '—' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="font-bold font-mono text-sm mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
              {/* Segment */}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_COLORS[segment] ?? 'bg-gray-100 text-gray-500'}`}>
                  {SEGMENT_LABELS[segment] ?? segment}
                </span>
                {customer.last_order_at && (
                  <span className="text-xs text-gray-400">Последний заказ: {fmtDate(customer.last_order_at)}</span>
                )}
              </div>
              {/* Contact */}
              {customer.telegram_id && (
                <a
                  href={`tg://user?id=${customer.telegram_id}`}
                  className="flex items-center gap-2 w-full py-2.5 px-4 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                  </svg>
                  Написать в Telegram
                </a>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              {(customer.orders ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Заказов нет</p>
              ) : (
                <div className="space-y-2">
                  {(customer.orders ?? []).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between p-3 border rounded-xl text-sm">
                      <div>
                        <p className="font-mono text-xs text-gray-400">#{o.id?.slice(0, 8)}</p>
                        <p className="font-medium">{fmtPrice(Number(o.total ?? 0), o.currency)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{fmtDate(o.created_at)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{o.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-5">
              {/* Tags section */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Теги</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                      {tag}
                      <button
                        onClick={() => removeTagMutation.mutate(tag)}
                        className="text-accent/60 hover:text-accent ml-0.5 text-xs leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {tags.length === 0 && <p className="text-xs text-gray-400">Тегов нет</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newTag.trim()) { addTagMutation.mutate(newTag.trim()) } }}
                    placeholder="Добавить тег..."
                    className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    onClick={() => { if (newTag.trim()) addTagMutation.mutate(newTag.trim()) }}
                    disabled={!newTag.trim() || addTagMutation.isPending}
                    className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Notes section */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Заметки</p>
                {notesLoading ? (
                  <div className="flex justify-center py-6"><div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" /></div>
                ) : (
                  <div className="space-y-2 mb-3">
                    {(notes as any[]).map((note: any) => (
                      <div key={note.id} className="flex gap-2 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{note.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{fmtDate(note.created_at)}</p>
                        </div>
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {(notes as any[]).length === 0 && <p className="text-xs text-gray-400">Заметок нет</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Добавить заметку..."
                    rows={2}
                    className="flex-1 text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    onClick={() => { if (newNote.trim()) addNoteMutation.mutate(newNote.trim()) }}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    className="px-3 bg-accent text-white text-sm rounded-lg disabled:opacity-40 self-end py-2"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['merchant-customers', segment],
    queryFn: () => api.merchant.customers({ segment: segment || undefined, limit: 100 }),
    retry: false,
  })

  const filtered = (customers as any[]).filter((c) => {
    if (!search) return true
    const name = [c.name, c.first_name, c.last_name, c.username, c.phone].filter(Boolean).join(' ').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">CRM — Клиенты</h1>
        <span className="text-sm text-gray-400">{filtered.length} клиентов</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-white rounded-xl border">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Поиск по имени, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {SEGMENTS.map((s) => <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm">Клиентов нет</p>
          <p className="text-xs mt-1">Клиенты появятся после первых заказов</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-4 py-3">Клиент</th>
                <th className="text-left px-4 py-3">Сегмент</th>
                <th className="text-left px-4 py-3">Заказов</th>
                <th className="text-left px-4 py-3">Потрачено</th>
                <th className="text-left px-4 py-3">Последний заказ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const name = c.name ?? [c.first_name, c.last_name].filter(Boolean).join(' ') ?? 'Клиент'
                const orderCount = c.order_count ?? 0
                const seg = orderCount >= 5 ? 'vip' : orderCount >= 2 ? 'returning' : 'new'
                return (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent text-sm flex-shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{name}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_COLORS[seg] ?? 'bg-gray-100 text-gray-500'}`}>
                        {SEGMENT_LABELS[seg]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{orderCount}</td>
                    <td className="px-4 py-3 font-mono">{c.total_spent ? fmtPrice(c.total_spent, c.currency) : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{c.last_order_at ? fmtDate(c.last_order_at) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <CustomerPanel customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
