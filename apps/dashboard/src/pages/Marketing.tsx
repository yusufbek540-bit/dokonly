import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type Tab = 'mailings' | 'coupons' | 'loyalty' | 'referral' | 'stories' | 'abandoned'

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
  const [generatingAI, setGeneratingAI] = useState(false)

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
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Текст сообщения</label>
              <button
                type="button"
                disabled={generatingAI}
                onClick={async () => {
                  setGeneratingAI(true)
                  try {
                    const res = await api.merchant.generateMailing(newSubject || 'рассылка')
                    setNewContent(res.text)
                  } catch {}
                  setGeneratingAI(false)
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                🤖 {generatingAI ? 'Генерирую...' : 'AI текст'}
              </button>
            </div>
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

function LoyaltyTab() {
  const qc = useQueryClient()
  const { data: cfg, isLoading } = useQuery({ queryKey: ['merchant-loyalty'], queryFn: api.merchant.loyaltyConfig, retry: false })
  const [earnRate, setEarnRate] = useState<string>('')
  const [cashbackRate, setCashbackRate] = useState<string>('')
  const [isActive, setIsActive] = useState(false)
  const [initialized, setInitialized] = useState(false)

  if (cfg && !initialized) {
    setEarnRate(String(cfg.earn_rate ?? 5))
    setCashbackRate(String(cfg.cashback_rate ?? 3))
    setIsActive(cfg.is_active ?? false)
    setInitialized(true)
  }

  const save = useMutation({
    mutationFn: () => api.merchant.updateLoyaltyConfig({ earn_rate: Number(earnRate), cashback_rate: Number(cashbackRate), is_active: isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-loyalty'] }),
  })

  if (isLoading) return <div className="flex justify-center pt-12"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-lg space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Программа лояльности</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-gray-800">Активна</div>
            <div className="text-xs text-gray-500">Начисление баллов за покупки</div>
          </div>
          <button
            onClick={() => setIsActive(v => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative ${isActive ? 'bg-accent' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 bottom-0.5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Начисление (% от суммы)</label>
            <input type="number" value={earnRate} onChange={e => setEarnRate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Кешбэк (% баллами)</label>
            <input type="number" value={cashbackRate} onChange={e => setCashbackRate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
        </div>
        {cfg && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Участников', value: cfg.stats?.member_count ?? '—' },
              { label: 'Выдано баллов', value: cfg.stats?.points_issued ? Number(cfg.stats.points_issued).toLocaleString() : '—' },
              { label: 'Использовано', value: cfg.stats?.points_redeemed ? Number(cfg.stats.points_redeemed).toLocaleString() : '—' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="font-mono font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full h-10 rounded-xl bg-accent text-white font-semibold text-sm disabled:opacity-50"
        >
          {save.isPending ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function ReferralTab() {
  const qc = useQueryClient()
  const { data: cfg, isLoading } = useQuery({ queryKey: ['merchant-referral'], queryFn: api.merchant.referralConfig, retry: false })
  const [referrerReward, setReferrerReward] = useState('')
  const [refereeReward, setRefereeReward] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [initialized, setInitialized] = useState(false)

  if (cfg && !initialized) {
    setReferrerReward(String(cfg.referrer_reward ?? 100))
    setRefereeReward(String(cfg.referee_reward ?? 50))
    setIsActive(cfg.is_active ?? false)
    setInitialized(true)
  }

  const save = useMutation({
    mutationFn: () => api.merchant.updateReferralConfig({ referrer_reward: Number(referrerReward), referee_reward: Number(refereeReward), is_active: isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-referral'] }),
  })

  if (isLoading) return <div className="flex justify-center pt-12"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-lg space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Реферальная программа</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-gray-800">Активна</div>
            <div className="text-xs text-gray-500">Пригласи друга — получи бонус</div>
          </div>
          <button
            onClick={() => setIsActive(v => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative ${isActive ? 'bg-accent' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 bottom-0.5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Бонус пригласившему (баллы)</label>
            <input type="number" value={referrerReward} onChange={e => setReferrerReward(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Бонус приглашённому (баллы)</label>
            <input type="number" value={refereeReward} onChange={e => setRefereeReward(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
        </div>
        {cfg && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Приглашений', value: cfg.stats?.invited ?? '—' },
              { label: 'Завершили заказ', value: cfg.stats?.completed ?? '—' },
              { label: 'Выдано баллов', value: cfg.stats?.earned ? Number(cfg.stats.earned).toLocaleString() : '—' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="font-mono font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full h-10 rounded-xl bg-accent text-white font-semibold text-sm disabled:opacity-50"
        >
          {save.isPending ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function StoriesTab() {
  const qc = useQueryClient()
  const { data: stories = [], isLoading } = useQuery({ queryKey: ['merchant-stories'], queryFn: api.merchant.stories, retry: false })
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const create = useMutation({
    mutationFn: () => api.merchant.createStory({ title: newTitle, media_url: newUrl }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['merchant-stories'] }); setShowCreate(false); setNewTitle(''); setNewUrl('') },
  })
  const del = useMutation({
    mutationFn: api.merchant.deleteStory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-stories'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{(stories as any[]).length} историй</p>
        <button onClick={() => setShowCreate(true)} className="bg-accent text-white px-3 py-1.5 rounded-xl text-sm font-medium">
          + Добавить
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center pt-8"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>
      ) : (stories as any[]).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-sm">Историй нет. Добавьте первую!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {(stories as any[]).map((s: any) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {s.media_url && (
                <div className="aspect-[9/16] bg-gray-100 overflow-hidden">
                  {s.media_url.includes('video') || s.media_url.endsWith('.mp4')
                    ? <video src={s.media_url} className="w-full h-full object-cover" muted />
                    : <img src={s.media_url} alt={s.title} className="w-full h-full object-cover" />
                  }
                </div>
              )}
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 truncate">{s.title || 'История'}</span>
                <button onClick={() => del.mutate(s.id)} className="text-xs text-red-400 hover:text-red-600 ml-2 flex-shrink-0">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Новая история</h3>
            <div className="space-y-3 mb-4">
              <input placeholder="Заголовок" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" />
              <input placeholder="URL медиафайла (фото/видео)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => create.mutate()} disabled={!newUrl || create.isPending} className="flex-1 h-10 rounded-xl bg-accent text-white font-semibold text-sm disabled:opacity-50">
                {create.isPending ? '...' : 'Добавить'}
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 h-10 rounded-xl border text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AbandonedCartsTab() {
  const qc = useQueryClient()
  const { data: carts = [], isLoading } = useQuery({ queryKey: ['merchant-abandoned-carts'], queryFn: api.merchant.abandonedCarts, retry: false })

  const remind = useMutation({
    mutationFn: (id: string) => api.merchant.sendAbandonedCartReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-abandoned-carts'] }),
  })

  function timeAgo(iso: string) {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
    if (h < 1) return 'менее часа'
    if (h < 24) return `${h} ч назад`
    return `${Math.floor(h / 24)} дн назад`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{(carts as any[]).length} корзин</p>
        <div className="text-xs text-gray-400 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">💡 Конверсия +25% с напоминанием</div>
      </div>
      {isLoading ? (
        <div className="flex justify-center pt-8"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>
      ) : (carts as any[]).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-sm">Нет брошенных корзин</p>
          <p className="text-xs mt-1">Все покупатели завершили заказы!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-4 py-3">Покупатель</th>
                <th className="text-left px-4 py-3">Товары</th>
                <th className="text-left px-4 py-3">Сумма</th>
                <th className="text-left px-4 py-3">Когда</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(carts as any[]).map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.item_count ?? (c.items?.length ?? '—')} товара</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{c.total ? Number(c.total).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.abandoned_at ? timeAgo(c.abandoned_at) : '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remind.mutate(c.id)}
                      disabled={remind.isPending || c.reminder_sent}
                      className="text-xs px-2.5 py-1 rounded-lg bg-accent/10 text-accent font-medium hover:bg-accent/20 disabled:opacity-50"
                    >
                      {c.reminder_sent ? '✓ Отправлено' : '📨 Напомнить'}
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

      <div className="flex border-b mb-5 gap-0 overflow-x-auto scrollbar-hide">
        {([
          { id: 'mailings', label: '📨 Рассылки' },
          { id: 'coupons', label: '🎟 Купоны' },
          { id: 'loyalty', label: '⭐ Лояльность' },
          { id: 'referral', label: '🤝 Реферал' },
          { id: 'stories', label: '📸 Истории' },
          { id: 'abandoned', label: '🛒 Корзины' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
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
      {tab === 'loyalty' && <LoyaltyTab />}
      {tab === 'referral' && <ReferralTab />}
      {tab === 'stories' && <StoriesTab />}
      {tab === 'abandoned' && <AbandonedCartsTab />}
    </div>
  )
}
