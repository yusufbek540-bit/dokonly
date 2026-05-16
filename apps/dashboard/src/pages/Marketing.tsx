import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type Tab = 'mailings' | 'coupons'

const STATUS_LABELS: Record<string, string> = { draft: 'Черновик', scheduled: 'Запланировано', sent: 'Отправлено' }
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
}

const DISCOUNT_TYPE_LABELS: Record<string, string> = { percent: '%', fixed: 'фикс.' }

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function MailingsTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newSubject, setNewSubject] = useState('')

  const { data: mailings = [], isLoading } = useQuery({
    queryKey: ['merchant-mailings'],
    queryFn: api.merchant.mailings,
    retry: false,
  })

  const create = useMutation({
    mutationFn: () => api.merchant.createMailing({ subject: newSubject, content: newContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant-mailings'] })
      setShowCreate(false)
      setNewContent('')
      setNewSubject('')
    },
  })

  const send = useMutation({
    mutationFn: api.merchant.sendMailing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-mailings'] }),
  })

  const del = useMutation({
    mutationFn: api.merchant.deleteMailing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-mailings'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{(mailings as any[]).length} рассылок</p>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-accent text-white px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          + Новая рассылка
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 border rounded-2xl bg-gray-50 space-y-3">
          <h3 className="font-semibold text-sm">Новая рассылка</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Тема</label>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Например: Скидки к праздникам"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Текст сообщения</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Текст рассылки..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm border rounded-xl hover:bg-gray-100">
              Отмена
            </button>
            <button
              onClick={() => create.mutate()}
              disabled={!newSubject.trim() || !newContent.trim() || create.isPending}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded-xl font-medium disabled:opacity-50 hover:bg-accent/90"
            >
              {create.isPending ? 'Создаём...' : 'Создать черновик'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center pt-8">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (mailings as any[]).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📨</p>
          <p className="text-sm">Рассылок ещё нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(mailings as any[]).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-4 border rounded-2xl bg-white hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </div>
                <p className="font-medium text-sm">{m.subject ?? 'Без темы'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.recipients_count ? `${m.recipients_count} получателей` : 'Все клиенты'} · {fmtDate(m.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {m.status === 'draft' && (
                  <button
                    onClick={() => send.mutate(m.id)}
                    disabled={send.isPending}
                    className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50"
                  >
                    Отправить
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Удалить рассылку?')) del.mutate(m.id)
                  }}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CouponsTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newType, setNewType] = useState('percent')
  const [newValue, setNewValue] = useState('')
  const [newMin, setNewMin] = useState('')

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['merchant-coupons'],
    queryFn: api.merchant.coupons,
    retry: false,
  })

  const create = useMutation({
    mutationFn: () => api.merchant.createCoupon({
      code: newCode, discount_type: newType,
      discount_value: Number(newValue),
      min_order_amount: newMin ? Number(newMin) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant-coupons'] })
      setShowCreate(false)
      setNewCode('')
      setNewValue('')
      setNewMin('')
    },
  })

  const del = useMutation({
    mutationFn: api.merchant.deleteCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-coupons'] }),
  })

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{(coupons as any[]).length} купонов</p>
        <button
          onClick={() => { setShowCreate(true); setNewCode(generateCode()) }}
          className="bg-accent text-white px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          + Новый купон
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 border rounded-2xl bg-gray-50 space-y-3">
          <h3 className="font-semibold text-sm">Новый купон</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Код купона</label>
              <div className="flex gap-2">
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="flex-1 border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <button onClick={() => setNewCode(generateCode())} className="text-xs text-accent px-2 py-1 border rounded-lg hover:bg-gray-100">
                  🔀
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Тип</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="percent">Процент %</option>
                <option value="fixed">Фиксированный</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Размер скидки</label>
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                type="number"
                className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder={newType === 'percent' ? '10' : '50000'}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Мин. сумма заказа</label>
              <input
                value={newMin}
                onChange={(e) => setNewMin(e.target.value)}
                type="number"
                className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Не задано"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm border rounded-xl hover:bg-gray-100">Отмена</button>
            <button
              onClick={() => create.mutate()}
              disabled={!newCode.trim() || !newValue || create.isPending}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded-xl font-medium disabled:opacity-50 hover:bg-accent/90"
            >
              {create.isPending ? 'Создаём...' : 'Создать купон'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center pt-8">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (coupons as any[]).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🎟</p>
          <p className="text-sm">Купонов ещё нет</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-4 py-3">Код</th>
                <th className="text-left px-4 py-3">Скидка</th>
                <th className="text-left px-4 py-3">Мин. сумма</th>
                <th className="text-left px-4 py-3">Использований</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(coupons as any[]).map((c: any) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discount_value}{DISCOUNT_TYPE_LABELS[c.discount_type] ?? ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.min_order_amount ? c.min_order_amount.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 font-mono">{c.usage_count ?? 0}{c.max_uses ? `/${c.max_uses}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active !== false ? 'Активен' : 'Истёк'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (window.confirm('Удалить купон?')) del.mutate(c.id)
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function MarketingPage() {
  const [tab, setTab] = useState<Tab>('mailings')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">Маркетинг</h1>
      </div>

      <div className="flex border-b mb-5 gap-0">
        {([
          { id: 'mailings', label: '📨 Рассылки' },
          { id: 'coupons', label: '🎟 Купоны' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mailings' && <MailingsTab />}
      {tab === 'coupons' && <CouponsTab />}
    </div>
  )
}
