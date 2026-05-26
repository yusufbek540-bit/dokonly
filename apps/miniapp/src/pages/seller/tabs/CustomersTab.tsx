import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

const NOTES_KEY = 'dokonly_seller_customer_notes'
interface CustomerMeta { note: string; tags: string[] }

function loadMeta(key: string): CustomerMeta {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[key] ?? { note: '', tags: [] }
  } catch { return { note: '', tags: [] } }
}

function saveMeta(key: string, meta: CustomerMeta) {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    const all = raw ? JSON.parse(raw) : {}
    localStorage.setItem(NOTES_KEY, JSON.stringify({ ...all, [key]: meta }))
  } catch {}
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

function fmtDateFull(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface CustomerData {
  name: string
  phone: string
  email?: string
  telegramId: number | null
  orderCount: number
  totalSpent: number
  lastOrderAt: string
  orders: any[]
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', shipping: 'Доставка',
  delivered: 'Доставлен', completed: 'Завершён', cancelled: 'Отменён',
}
const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6', confirmed: '#8B5CF6', shipping: '#F59E0B',
  delivered: '#10B981', completed: '#00B383', cancelled: '#EF4444',
}

function CustomerDetail({ customer, currency, onBack }: { customer: CustomerData; currency: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'notes'>('overview')
  const storageKey = customer.telegramId ? `tg_${customer.telegramId}` : `phone_${customer.phone}`
  const [note, setNote] = useState(() => loadMeta(storageKey).note)
  const [tags, setTags] = useState<string[]>(() => loadMeta(storageKey).tags)
  const [tagInput, setTagInput] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  const aov = customer.orderCount > 0 ? customer.totalSpent / customer.orderCount : 0
  const segment = customer.orderCount >= 5 ? 'VIP' : customer.orderCount >= 2 ? 'Постоянный' : 'Новый'
  const segmentColor = customer.orderCount >= 5 ? '#F59E0B' : customer.orderCount >= 2 ? '#8B5CF6' : '#3B82F6'

  const TABS = [
    { id: 'overview' as const, label: 'Обзор' },
    { id: 'orders' as const, label: 'Заказы' },
    { id: 'notes' as const, label: 'Заметки' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>{customer.name}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: segmentColor + '20', color: segmentColor, fontWeight: 700 }}>
          {segment}
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, height: 42, fontSize: 14, fontWeight: 600,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '16px', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Overview tab ── */}
        {activeTab === 'overview' && (
          <>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Заказов', value: customer.orderCount },
                { label: 'Средний чек', value: fmtPrice(aov, currency) },
                { label: 'Потрачено', value: fmtPrice(customer.totalSpent, currency) },
                { label: 'Последний заказ', value: customer.lastOrderAt ? fmtDate(customer.lastOrderAt) : '—' },
              ].map(s => (
                <div key={s.label} style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Email display */}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 12,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  fontSize: 13, color: 'var(--ink)', textDecoration: 'none',
                }}
              >
                <span>✉️</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email}</span>
              </a>
            )}

            {/* Quick actions */}
            {(customer.phone || customer.telegramId) && (
              <div style={{ display: 'flex', gap: 10 }}>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    style={{
                      flex: 1, height: 44, borderRadius: 12,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none',
                    }}
                  >
                    <span>📞</span> Позвонить
                  </a>
                )}
                {customer.telegramId && (
                  <button
                    onClick={() => {
                      const url = `tg://user?id=${customer.telegramId}`
                      ;(window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, '_blank')
                    }}
                    style={{
                      flex: 1, height: 44, borderRadius: 12,
                      background: 'var(--accent)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer',
                    }}
                  >
                    <span>💬</span> Написать
                  </button>
                )}
              </div>
            )}

            {/* Segment info */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: segmentColor + '15', border: `1px solid ${segmentColor}40` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: segmentColor }}>
                {segment === 'VIP' ? '⭐ VIP-покупатель' : segment === 'Постоянный' ? '🔄 Постоянный покупатель' : '🆕 Новый покупатель'}
              </span>
            </div>
          </>
        )}

        {/* ── Orders tab ── */}
        {activeTab === 'orders' && (
          <>
            {customer.orders.length > 0 ? (
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {customer.orders.map((o: any, i: number, arr: any[]) => {
                  const orderId = '#' + (o.id ?? '').slice(0, 8).toUpperCase()
                  const statusColor = STATUS_COLORS[o.status] ?? '#888'
                  return (
                    <div
                      key={o.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', background: 'var(--card)',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: 999, background: statusColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--ink)' }}>{orderId}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {STATUS_LABELS[o.status] ?? o.status} · {o.created_at ? fmtDateFull(o.created_at) : ''}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)', flexShrink: 0 }}>
                        {fmtPrice(Number(o.total ?? 0), currency)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 14 }}>Нет заказов</div>
              </div>
            )}
          </>
        )}

        {/* ── Notes & Tags tab ── */}
        {activeTab === 'notes' && (
          <>
            {/* Tags */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>Теги</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {tags.map(tag => (
                  <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
                    <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{tag}</span>
                    <button onClick={() => {
                      const newTags = tags.filter(x => x !== tag)
                      setTags(newTags)
                      saveMeta(storageKey, { note, tags: newTags })
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      const newTags = [...tags, tagInput.trim()]
                      setTags(newTags)
                      setTagInput('')
                      saveMeta(storageKey, { note, tags: newTags })
                    }
                  }}
                  placeholder="Добавить тег..."
                  style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--ink)', outline: 'none' }}
                />
                <button
                  onClick={() => {
                    if (tagInput.trim()) {
                      const newTags = [...tags, tagInput.trim()]
                      setTags(newTags)
                      setTagInput('')
                      saveMeta(storageKey, { note, tags: newTags })
                    }
                  }}
                  style={{ height: 40, padding: '0 14px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600 }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Заметка</div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Добавьте заметку об этом покупателе..."
                rows={4}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  fontSize: 14, color: 'var(--ink)', resize: 'none', outline: 'none',
                  fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
                }}
              />
              {note && (
                <button
                  onClick={() => {
                    saveMeta(storageKey, { note, tags })
                    setNoteSaved(true)
                    setTimeout(() => setNoteSaved(false), 2000)
                  }}
                  style={{ marginTop: 10, height: 40, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  {noteSaved ? '✓ Сохранено' : 'Сохранить'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface Props { tenant: any }

export function CustomersTab({ tenant }: Props) {
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<'' | 'new' | 'returning' | 'vip'>('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => api.seller.orders(),
  })

  const customers = useMemo(() => {
    const map = new Map<string, CustomerData>()

    for (const order of orders as any[]) {
      const key = order.customer_telegram_id
        ? String(order.customer_telegram_id)
        : `${order.customer_name}_${order.customer_phone}`
      const existing = map.get(key)
      if (existing) {
        existing.orderCount++
        existing.totalSpent += Number(order.total ?? 0)
        if (order.created_at > existing.lastOrderAt) existing.lastOrderAt = order.created_at
        if (order.customer_email && !existing.email) existing.email = order.customer_email
        existing.orders.push(order)
      } else {
        map.set(key, {
          name: order.customer_name ?? 'Покупатель',
          phone: order.customer_phone ?? '',
          email: order.customer_email ?? undefined,
          telegramId: order.customer_telegram_id ?? null,
          orderCount: 1,
          totalSpent: Number(order.total ?? 0),
          lastOrderAt: order.created_at ?? '',
          orders: [order],
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [orders])

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} currency={tenant.currency} onBack={() => setSelectedCustomer(null)} />
  }

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false
      }
      if (segmentFilter) {
        const seg = c.orderCount >= 5 ? 'vip' : c.orderCount >= 2 ? 'returning' : 'new'
        if (seg !== segmentFilter) return false
      }
      return true
    })
  }, [customers, search, segmentFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px' }}>
        {/* Summary row */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 28, color: 'var(--accent)' }}>
            {customers.length}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8 }}>
            уникальных покупателей
          </span>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <Icon
            name="search"
            size={16}
            color="var(--muted)"
            style={{ position: 'absolute', left: 12, top: 14 }}
          />
          <input
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 44,
              paddingLeft: 38,
              paddingRight: 12,
              borderRadius: 10,
              background: 'var(--subtle)',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Segment filter chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }}>
          {([
            { id: '' as const, label: 'Все' },
            { id: 'new' as const, label: 'Новые' },
            { id: 'returning' as const, label: 'Постоянные' },
            { id: 'vip' as const, label: 'VIP' },
          ]).map(seg => (
            <button
              key={seg.id}
              onClick={() => setSegmentFilter(seg.id)}
              style={{
                flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 999,
                background: segmentFilter === seg.id ? 'var(--accent)' : 'var(--card)',
                border: `1px solid ${segmentFilter === seg.id ? 'var(--accent)' : 'var(--border)'}`,
                color: segmentFilter === seg.id ? 'white' : 'var(--ink)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="screen-scroll" style={{ flex: 1, paddingBottom: 80 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '2.5px solid var(--accent)',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 32px' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: 'var(--subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Icon name="users" size={28} color="var(--muted)"/>
            </div>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
              Покупателей пока нет
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Здесь появятся покупатели, когда поступят первые заказы
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 32px' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
              Ничего не найдено
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Попробуйте другой запрос
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((c, i) => (
              <div
                key={i}
                onClick={() => setSelectedCustomer(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'white',
                  fontFamily: 'Sora',
                  fontWeight: 700,
                  fontSize: 16,
                }}>
                  {(c.name[0] ?? '?').toUpperCase()}
                </div>

                {/* Name + phone */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </div>
                  {c.phone ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {c.phone}
                    </div>
                  ) : null}
                </div>

                {/* Right side: orders count + total + last date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                    {c.orderCount} {c.orderCount === 1 ? 'заказ' : c.orderCount < 5 ? 'заказа' : 'заказов'}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    fontFamily: 'JetBrains Mono',
                  }}>
                    {fmtPrice(c.totalSpent, tenant.currency)}
                  </div>
                  {c.lastOrderAt ? (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {fmtDate(c.lastOrderAt)}
                    </div>
                  ) : null}
                </div>
                <Icon name="chevronRight" size={15} color="var(--muted)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
