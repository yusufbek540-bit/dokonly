import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/Icon'
import { api } from '@/lib/api'

interface Props { tenant: any }

// ─── Helper components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 8, paddingLeft: 4,
      }}>
        {title}
      </div>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  icon, label, value, valueColor, onPress, danger, noBorder, prefix,
}: {
  icon: string
  label: string
  value?: string
  valueColor?: string
  onPress?: () => void
  danger?: boolean
  noBorder?: boolean
  prefix?: React.ReactNode
}) {
  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '14px 16px', background: 'var(--card)',
        borderBottom: noBorder ? 'none' : '1px solid var(--border)',
        textAlign: 'left', cursor: onPress ? 'pointer' : 'default',
        opacity: 1,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: danger ? 'var(--danger-soft)' : 'var(--subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} color={danger ? 'var(--danger)' : 'var(--muted-strong)'} />
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: danger ? 'var(--danger)' : 'var(--ink)' }}>
        {label}
      </span>
      {prefix}
      {value && (
        <span style={{ fontSize: 13, color: valueColor ?? 'var(--muted)' }}>{value}</span>
      )}
      {onPress && <Icon name="chevronRight" size={16} color="var(--muted)" />}
    </button>
  )
}

function ToggleRow({ icon, label, value, onChange }: {
  icon: string; label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '14px 16px', background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: 'var(--subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={16} color="var(--muted-strong)" />
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 48, height: 28, borderRadius: 999,
          background: value ? 'var(--accent)' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, width: 22, height: 22,
          borderRadius: 999, background: 'white',
          left: value ? 23 : 3, transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

// ─── Bottom-sheet shell ────────────────────────────────────────────────────────

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--bg)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90vh', overflow: 'auto',
          animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        {children}
      </div>
    </div>
  )
}

// ─── Color map ─────────────────────────────────────────────────────────────────

const ACCENT_COLORS: Record<string, string> = {
  emerald: '#00B383',
  forest: '#2D6A4F',
  mint: '#4ECDC4',
  lime: '#8BC34A',
  ocean: '#1565C0',
  sky: '#03A9F4',
  indigo: '#5C6BC0',
  sunset: '#F4A261',
  coral: '#E76F51',
  rose: '#E91E63',
  graphite: '#607D8B',
  sand: '#C4A882',
}

// ─── Payment method definitions ────────────────────────────────────────────────

const ALL_PAYMENT_METHODS = [
  { id: 'cash',  label: 'Наличные',          emoji: '💵', alwaysEnabled: true  },
  { id: 'card',  label: 'Банковская карта',   emoji: '💳', alwaysEnabled: false },
  { id: 'click', label: 'Click',              emoji: '🟢', alwaysEnabled: false },
  { id: 'payme', label: 'Payme',              emoji: '🔵', alwaysEnabled: false },
  { id: 'uzum',  label: 'Uzum Bank',          emoji: '🟣', alwaysEnabled: false },
]

// ─── Days remaining helper ─────────────────────────────────────────────────────

function trialDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  const expires = created + 14 * 24 * 60 * 60 * 1000
  const remaining = Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000))
  return Math.max(0, remaining)
}

// ─── Main component ────────────────────────────────────────────────────────────

// ─── MailingsView ─────────────────────────────────────────────────────────────

export function MailingsView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: mailings = [], isLoading } = useQuery({
    queryKey: ['seller-mailings'],
    queryFn: api.seller.mailings,
  })

  const { mutate: createMailing, isPending: creating } = useMutation({
    mutationFn: () => api.seller.createMailing({ title, text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-mailings'] })
      setTitle(''); setText(''); setShowForm(false); setError('')
    },
    onError: (e: any) => setError(e.message ?? 'Ошибка'),
  })

  const { mutate: sendMailing } = useMutation({
    mutationFn: (id: string) => api.seller.sendMailing(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-mailings'] })
      setSendingId(null)
    },
    onError: (e: any) => { setError(e.message ?? 'Ошибка'); setSendingId(null) },
  })

  const { mutate: deleteMailing } = useMutation({
    mutationFn: (id: string) => api.seller.deleteMailing(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-mailings'] }),
  })

  const STATUS_LABELS: Record<string, string> = { draft: 'Черновик', sending: 'Отправка', sent: 'Отправлено', failed: 'Ошибка' }
  const STATUS_COLORS: Record<string, string> = { draft: 'var(--muted)', sending: '#F59E0B', sent: 'var(--accent)', failed: 'var(--danger)' }

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
          style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrowLeft" size={18} />
        </button>
        <span style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Рассылки</span>
        <button
          onClick={() => setShowForm(true)}
          style={{ height: 34, padding: '0 14px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 13 }}
        >
          + Создать
        </button>
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '16px', paddingBottom: 32 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (mailings as any[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📨</div>
            <p style={{ fontSize: 14 }}>Рассылок пока нет</p>
            <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Создайте рассылку, чтобы отправить<br/>сообщение всем покупателям</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(mailings as any[]).map((m: any) => (
              <div key={m.id} style={{
                padding: '14px 16px', background: 'var(--card)',
                borderRadius: 14, border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{m.text}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[m.status] ?? 'var(--muted)', flexShrink: 0 }}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </div>
                {m.status === 'sent' && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    ✓ Отправлено {m.sent_count} из {m.recipient_count}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {m.status === 'draft' && (
                    <button
                      onClick={() => { setSendingId(m.id); sendMailing(m.id) }}
                      disabled={sendingId === m.id}
                      style={{
                        flex: 1, height: 36, borderRadius: 10,
                        background: 'var(--accent)', color: 'white',
                        fontWeight: 600, fontSize: 13,
                        opacity: sendingId === m.id ? 0.7 : 1,
                      }}
                    >
                      {sendingId === m.id ? 'Отправка...' : '📨 Отправить'}
                    </button>
                  )}
                  <button
                    onClick={() => deleteMailing(m.id)}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create form BottomSheet */}
      {showForm && (
        <BottomSheet onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>
          <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>Новая рассылка</div>
            <input
              placeholder="Заголовок"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
            />
            <textarea
              placeholder="Текст сообщения"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'inherit' }}
            />
            {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
            <button
              disabled={!title.trim() || !text.trim() || creating}
              onClick={() => createMailing()}
              style={{
                height: 50, borderRadius: 14,
                background: title && text ? 'var(--accent)' : 'var(--subtle)',
                color: title && text ? 'white' : 'var(--muted)',
                fontWeight: 700, fontSize: 15,
              }}
            >
              {creating ? 'Создание...' : 'Сохранить черновик'}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── CouponsView ─────────────────────────────────────────────────────────────

export function CouponsView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [restrictProducts, setRestrictProducts] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'expired'>('active')
  const [error, setError] = useState('')

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['seller-promo-codes'],
    queryFn: api.seller.promoCodes,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['seller-products-for-coupon'],
    queryFn: () => api.seller.products(),
    enabled: showForm,
  })

  const { mutate: createCode, isPending: creating } = useMutation({
    mutationFn: () => api.seller.createPromoCode({
      code, discount_type: discountType, discount_value: Number(discountValue),
      max_uses: maxUses ? Number(maxUses) : null,
      min_order_amount: minAmount ? Number(minAmount) : null,
      expires_at: expiresAt || null,
      applicable_product_ids: restrictProducts && selectedProductIds.length > 0 ? selectedProductIds : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-promo-codes'] })
      setCode(''); setDiscountValue(''); setMaxUses(''); setMinAmount(''); setExpiresAt('')
      setRestrictProducts(false); setSelectedProductIds([]); setShowForm(false); setError('')
    },
    onError: (e: any) => setError(e.message ?? 'Ошибка'),
  })

  const { mutate: deleteCode } = useMutation({
    mutationFn: (id: string) => api.seller.deletePromoCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-promo-codes'] }),
  })

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
          style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrowLeft" size={18} />
        </button>
        <span style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Купоны</span>
        <button
          onClick={() => setShowForm(true)}
          style={{ height: 34, padding: '0 14px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 13 }}
        >
          + Создать
        </button>
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '16px', paddingBottom: 32 }}>
        {/* Filter chips */}
        {(codes as any[]).length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {([['all', 'Все'], ['active', 'Активные'], ['expired', 'Истёкшие']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setCouponFilter(id)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: couponFilter === id ? 'var(--accent)' : 'var(--subtle)',
                  border: `1px solid ${couponFilter === id ? 'var(--accent)' : 'var(--border)'}`,
                  color: couponFilter === id ? 'white' : 'var(--muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (codes as any[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎟</div>
            <p style={{ fontSize: 14 }}>Купонов пока нет</p>
          </div>
        ) : (() => {
          const now = Date.now()
          const filtered = (codes as any[]).filter((c: any) => {
            if (couponFilter === 'active') return c.is_active && (!c.expires_at || new Date(c.expires_at).getTime() > now)
            if (couponFilter === 'expired') return !c.is_active || (c.expires_at && new Date(c.expires_at).getTime() <= now)
            return true
          })
          return filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>Нет купонов</div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((c: any) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                      {c.code}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: c.is_active ? 'var(--accent-soft)' : 'var(--subtle)',
                      color: c.is_active ? 'var(--accent)' : 'var(--muted)',
                    }}>
                      {c.discount_type === 'percent' ? `-${c.discount_value}%` : `-${c.discount_value}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Использований: {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}
                    {c.min_order_amount ? ` · мин. ${c.min_order_amount.toLocaleString()}` : ''}
                    {c.expires_at ? ` · до ${new Date(c.expires_at).toLocaleDateString('ru')}` : ''}
                    {c.applicable_product_ids?.length > 0 ? ` · ${c.applicable_product_ids.length} тов.` : ''}
                  </div>
                </div>
                <button
                  onClick={() => deleteCode(c.id)}
                  style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="x" size={14} color="var(--danger)" />
                </button>
              </div>
            ))}
          </div>
          )
        })()}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowForm(false)}>
          <div style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 16 }}>Новый купон</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                placeholder="Код (напр. SALE20)"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                style={{ height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                {(['percent', 'fixed'] as const).map(t => (
                  <button key={t} onClick={() => setDiscountType(t)} style={{
                    flex: 1, height: 40, borderRadius: 10,
                    background: discountType === t ? 'var(--accent-soft)' : 'var(--subtle)',
                    border: `1.5px solid ${discountType === t ? 'var(--accent)' : 'var(--border)'}`,
                    color: discountType === t ? 'var(--accent)' : 'var(--ink)',
                    fontWeight: 600, fontSize: 13,
                  }}>
                    {t === 'percent' ? '% Скидка' : 'Фикс. сумма'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  placeholder={discountType === 'percent' ? 'Процент (1-100)' : 'Сумма скидки'}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  type="number"
                  style={{ flex: 1, height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
                />
                <input
                  placeholder="Макс. исп. (∞)"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  type="number"
                  style={{ width: 120, height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  placeholder="Мин. сумма заказа"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  type="number"
                  style={{ flex: 1, height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
                />
                <input
                  placeholder="Срок до (дата)"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  type="date"
                  style={{ flex: 1, height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
                />
              </div>
              {/* Product restriction toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Ограничить товарами</span>
                <button
                  onClick={() => { setRestrictProducts(v => !v); setSelectedProductIds([]) }}
                  style={{
                    width: 44, height: 26, borderRadius: 999,
                    background: restrictProducts ? 'var(--accent)' : 'var(--border)',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, width: 22, height: 22,
                    borderRadius: 999, background: 'white',
                    left: restrictProducts ? 20 : 2, transition: 'left 0.2s',
                  }}/>
                </button>
              </div>
              {restrictProducts && (
                <div style={{ maxHeight: 160, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)' }}>
                  {(products as any[]).filter((p: any) => p.is_active).map((p: any) => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={e => setSelectedProductIds(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>{p.name}</span>
                    </label>
                  ))}
                  {(products as any[]).filter((p: any) => p.is_active).length === 0 && (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>Нет активных товаров</div>
                  )}
                </div>
              )}
              {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
              <button
                disabled={!code || !discountValue || creating}
                onClick={() => createCode()}
                style={{
                  height: 50, borderRadius: 14,
                  background: code && discountValue ? 'var(--accent)' : 'var(--subtle)',
                  color: code && discountValue ? 'white' : 'var(--muted)',
                  fontWeight: 700, fontSize: 15,
                }}
              >
                {creating ? 'Создание...' : 'Создать купон'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SettingsTab({ tenant }: Props) {
  const queryClient = useQueryClient()

  // UI state
  const [editProfile, setEditProfile]   = useState(false)
  const [editBot, setEditBot]           = useState(false)
  const [editDelivery, setEditDelivery] = useState(false)
  const [editPayment, setEditPayment]   = useState(false)
  const [editAppearance, setEditAppearance] = useState(false)
  const [showCoupons, setShowCoupons]   = useState(false)
  const [showMailings, setShowMailings] = useState(false)
  const [editOrderSettings, setEditOrderSettings] = useState(false)
  const [channelGate, setChannelGate]   = useState(
    tenant.settings?.channel_subscription_gate ?? false,
  )
  const [channelUsername, setChannelUsername] = useState<string>(
    tenant.settings?.channel_username ?? '',
  )

  // Photo upload state
  const [logoUrl, setLogoUrl]             = useState<string>(tenant.logo_url ?? '')
  const [coverUrl, setCoverUrl]           = useState<string>(tenant.cover_url ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)

  // File input refs
  const logoInputRef  = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Delivery methods state
  const [deliveryMethods, setDeliveryMethods] = useState<any[]>(
    tenant.settings?.delivery_methods ?? [
      { id: 'pickup',   label: 'Самовывоз',          enabled: true,  price: 0 },
      { id: 'delivery', label: 'Доставка курьером',   enabled: false, price: 0 },
    ],
  )

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    tenant.settings?.payment_methods ?? ['cash'],
  )
  const [transferCardNumber, setTransferCardNumber] = useState<string>(
    tenant.settings?.transfer_card_number ?? '',
  )
  const [transferCardHolder, setTransferCardHolder] = useState<string>(
    tenant.settings?.transfer_card_holder ?? '',
  )

  // Order settings state
  const [minOrderAmount, setMinOrderAmount] = useState<string>(
    tenant.settings?.min_order_amount ? String(tenant.settings.min_order_amount) : '',
  )
  const [requiredFields, setRequiredFields] = useState<string[]>(
    tenant.settings?.required_checkout_fields ?? ['name', 'phone'],
  )
  const [orderConfirmationMsg, setOrderConfirmationMsg] = useState<string>(
    tenant.settings?.order_confirmation_message ?? '',
  )

  // Profile form
  const [profileName, setProfileName] = useState<string>(tenant.name ?? '')
  const [profileDesc, setProfileDesc] = useState<string>(tenant.description ?? '')
  const [profilePhone, setProfilePhone] = useState<string>(tenant.contact_info?.phone ?? '')
  const [profileTelegram, setProfileTelegram] = useState<string>(tenant.contact_info?.telegram ?? '')
  const [profileInstagram, setProfileInstagram] = useState<string>(tenant.contact_info?.instagram ?? '')
  const [profileAddress, setProfileAddress] = useState<string>(tenant.contact_info?.address ?? '')
  const [profileWorkingHours, setProfileWorkingHours] = useState<string>(tenant.contact_info?.working_hours ?? '')
  const [profileReturnPolicy, setProfileReturnPolicy] = useState<string>(tenant.settings?.return_policy ?? '')
  const [profileError, setProfileError] = useState('')

  // Bot form
  const [botToken, setBotToken]       = useState('')
  const [botError, setBotError]       = useState('')
  const [editGroupChat, setEditGroupChat] = useState(false)
  const [groupChatId, setGroupChatId] = useState<string>(
    tenant.settings?.notify_group_chat_id ? String(tenant.settings.notify_group_chat_id) : '',
  )

  // ── Mutations ────────────────────────────────────────────────────────────────

  const updateSettingsMutation = useMutation({
    mutationFn: (body: object) => api.seller.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      queryClient.invalidateQueries({ queryKey: ['seller-analytics'] })
      setEditProfile(false)
      setProfileError('')
    },
    onError: (err: Error) => {
      setProfileError(err.message || 'Не удалось сохранить изменения')
    },
  })

  const deliveryMutation = useMutation({
    mutationFn: (body: object) => api.seller.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditDelivery(false)
    },
  })

  const paymentMutation = useMutation({
    mutationFn: (body: object) => api.seller.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditPayment(false)
    },
  })

  const savePaymentSettings = () => {
    paymentMutation.mutate({
      payment_methods: paymentMethods,
      transfer_card_number: transferCardNumber.trim() || null,
      transfer_card_holder: transferCardHolder.trim() || null,
    })
  }

  const orderSettingsMutation = useMutation({
    mutationFn: (body: object) => api.seller.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditOrderSettings(false)
    },
  })

  const saveOrderSettings = () => {
    orderSettingsMutation.mutate({
      min_order_amount: minOrderAmount ? Number(minOrderAmount) : null,
      required_checkout_fields: requiredFields,
      order_confirmation_message: orderConfirmationMsg.trim() || null,
    })
  }

  const [pickedColor, setPickedColor] = useState<string>(
    tenant.accent_color ?? tenant.settings?.accent_color ?? 'emerald'
  )

  const [editTypography, setEditTypography] = useState(false)
  const [pickedTypo, setPickedTypo] = useState<string>(
    tenant.typography_bundle ?? tenant.settings?.typography_bundle ?? 'modern'
  )

  const typographyMutation = useMutation({
    mutationFn: (bundle: string) => api.seller.updateSettings({ typography_bundle: bundle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditTypography(false)
    },
  })

  const appearanceMutation = useMutation({
    mutationFn: (color: string) => api.seller.updateSettings({ accent_color: color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditAppearance(false)
    },
  })

  const setupBotMutation = useMutation({
    mutationFn: (token: string) => api.seller.setupBot(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditBot(false)
      setBotToken('')
      setBotError('')
    },
    onError: (err: Error) => {
      setBotError(err.message || 'Не удалось подключить бота. Проверьте токен.')
    },
  })

  const groupChatMutation = useMutation({
    mutationFn: (chatId: string) => api.seller.updateSettings({ notify_group_chat_id: chatId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditGroupChat(false)
    },
  })

  // ── Derived values ───────────────────────────────────────────────────────────

  const tier = tenant.tier ?? 'trial'
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const isOnTrial = tier === 'trial'
  const daysLeft = isOnTrial && tenant.created_at ? trialDaysRemaining(tenant.created_at) : 0

  const typographyBundle = tenant.typography_bundle ?? tenant.settings?.typography_bundle ?? 'modern'
  const accentColorId    = tenant.accent_color ?? tenant.settings?.accent_color ?? 'emerald'
  const accentHex        = ACCENT_COLORS[accentColorId] ?? '#00B383'

  const shopUrl    = `https://dokonly.app?shop=${tenant.slug}`
  const shopDisplay = `?shop=${tenant.slug}`

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleCopyShopUrl() {
    navigator.clipboard?.writeText(shopUrl)
  }

  function handleSaveProfile() {
    setProfileError('')
    if (!profileName.trim()) {
      setProfileError('Название магазина не может быть пустым')
      return
    }
    updateSettingsMutation.mutate({
      name: profileName.trim(),
      description: profileDesc.trim(),
      logo_url: logoUrl,
      cover_url: coverUrl,
      contact_info: {
        phone: profilePhone.trim(),
        telegram: profileTelegram.trim(),
        instagram: profileInstagram.trim(),
        address: profileAddress.trim(),
        working_hours: profileWorkingHours.trim(),
      },
      return_policy: profileReturnPolicy.trim(),
    })
  }

  function handleSetupBot() {
    setBotError('')
    if (!botToken.trim()) {
      setBotError('Введите токен бота')
      return
    }
    setupBotMutation.mutate(botToken.trim())
  }

  function openEditProfile() {
    setProfileName(tenant.name ?? '')
    setProfileDesc(tenant.description ?? '')
    setProfilePhone(tenant.contact_info?.phone ?? '')
    setProfileTelegram(tenant.contact_info?.telegram ?? '')
    setProfileInstagram(tenant.contact_info?.instagram ?? '')
    setProfileAddress(tenant.contact_info?.address ?? '')
    setProfileWorkingHours(tenant.contact_info?.working_hours ?? '')
    setProfileReturnPolicy(tenant.settings?.return_policy ?? '')
    setProfileError('')
    setLogoUrl(tenant.logo_url ?? '')
    setCoverUrl(tenant.cover_url ?? '')
    setEditProfile(true)
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const { url } = await api.seller.uploadFile(file)
      setLogoUrl(url)
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const { url } = await api.seller.uploadFile(file)
      setCoverUrl(url)
    } finally {
      setCoverUploading(false)
      e.target.value = ''
    }
  }

  function toggleDelivery(id: string) {
    setDeliveryMethods(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))
  }

  function updateDeliveryPrice(id: string, price: number) {
    setDeliveryMethods(prev => prev.map(m => m.id === id ? { ...m, price } : m))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (showCoupons) return <CouponsView onBack={() => setShowCoupons(false)} />
  if (showMailings) return <MailingsView onBack={() => setShowMailings(false)} />

  return (
    <div className="screen-scroll" style={{ flex: 1, padding: '16px 16px 100px' }}>

      {/* ── Profile header card ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
        borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)',
        marginBottom: 24,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #c4b8a8 0%, #a8957e 60%, #877462 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'white', flexShrink: 0,
        }}>
          {tenant.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tenant.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            dokonly.app/{tenant.slug}
          </div>
        </div>
        <button
          onClick={openEditProfile}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="moreH" size={16} />
        </button>
      </div>

      {/* ── Section 1: Магазин ──────────────────────────────────────────────── */}
      <Section title="Магазин">
        <Row
          icon="box"
          label="Информация о магазине"
          onPress={openEditProfile}
        />
        <Row
          icon="copy"
          label="Ссылка на магазин"
          value={shopDisplay}
          onPress={handleCopyShopUrl}
        />
        <Row
          icon="truck"
          label="Способы доставки"
          value={`${deliveryMethods.filter(m => m.enabled).length} способ`}
          onPress={() => setEditDelivery(true)}
        />
        <Row
          icon="creditCard"
          label="Способы оплаты"
          value={`${paymentMethods.length + 1} метода`}
          onPress={() => setEditPayment(true)}
        />
        <Row
          icon="box"
          label="Настройки заказов"
          value={tenant.settings?.min_order_amount ? `Мин. ${tenant.settings.min_order_amount}` : undefined}
          onPress={() => {
            setMinOrderAmount(tenant.settings?.min_order_amount ? String(tenant.settings.min_order_amount) : '')
            setRequiredFields(tenant.settings?.required_checkout_fields ?? ['name', 'phone'])
            setOrderConfirmationMsg(tenant.settings?.order_confirmation_message ?? '')
            setEditOrderSettings(true)
          }}
          noBorder
        />
      </Section>

      {/* ── Section 2: Telegram Bot ─────────────────────────────────────────── */}
      <Section title="Telegram Bot">
        {!tenant.bot_username ? (
          /* Prominent connect card */
          <div style={{
            padding: 16, borderRadius: 16,
            background: 'var(--accent-soft)',
            border: '1px solid rgba(0,179,131,0.2)',
            marginBottom: 0,
          }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--ink)',
              marginBottom: 4,
            }}>
              🤖 Подключите Telegram-бота
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              Покупатели откроют магазин через вашего бота
            </div>
            <button
              onClick={() => setEditBot(true)}
              style={{
                width: '100%', height: 44, borderRadius: 12,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 15,
              }}
            >
              Подключить →
            </button>
          </div>
        ) : (
          <>
            <Row
              icon="send"
              label="Бот подключён"
              value={`@${tenant.bot_username}`}
              valueColor="var(--accent)"
            />
            <Row
              icon="copy"
              label="Ссылка на бота"
              value={`t.me/${tenant.bot_username}`}
              onPress={() => navigator.clipboard?.writeText(`https://t.me/${tenant.bot_username}`)}
            />
            <Row
              icon="send"
              label="Уведомления в группу"
              value={tenant.settings?.notify_group_chat_id ? 'Настроено' : 'Не задано'}
              onPress={() => {
                setGroupChatId(tenant.settings?.notify_group_chat_id ? String(tenant.settings.notify_group_chat_id) : '')
                setEditGroupChat(true)
              }}
            />
            <Row
              icon="sparkles"
              label="Изменить бота"
              onPress={() => { setBotToken(''); setBotError(''); setEditBot(true) }}
              noBorder
            />
          </>
        )}
      </Section>

      {/* ── Section 3: Telegram-канал ───────────────────────────────────────── */}
      <Section title="Telegram-канал">
        <ToggleRow
          icon="send"
          label="Закрытый магазин"
          value={channelGate}
          onChange={(v) => {
            setChannelGate(v)
            if (!v) {
              updateSettingsMutation.mutate({ channel_subscription_gate: false })
            }
          }}
        />
        {channelGate && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--card)',
            borderBottom: 'none',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={channelUsername}
              onChange={e => setChannelUsername(e.target.value)}
              placeholder="@channel_username"
              style={{
                flex: 1, height: 40, borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--subtle)',
                padding: '0 12px', fontSize: 14, color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => updateSettingsMutation.mutate({
                channel_subscription_gate: channelGate,
                channel_username: channelUsername,
              })}
              disabled={updateSettingsMutation.isPending}
              style={{
                height: 40, paddingLeft: 14, paddingRight: 14,
                borderRadius: 10, background: 'var(--accent)',
                color: 'white', fontWeight: 600, fontSize: 14,
                flexShrink: 0,
                opacity: updateSettingsMutation.isPending ? 0.7 : 1,
              }}
            >
              Сохранить
            </button>
          </div>
        )}
      </Section>

      {/* ── Section 4: Внешний вид ──────────────────────────────────────────── */}
      <Section title="Внешний вид">
        <Row
          icon="star"
          label="Типографика"
          value={typographyBundle}
          onPress={() => { setPickedTypo(typographyBundle); setEditTypography(true) }}
        />
        <Row
          icon="sparkles"
          label="Акцентный цвет"
          value={accentColorId}
          noBorder
          onPress={() => { setPickedColor(accentColorId); setEditAppearance(true) }}
          prefix={
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: accentHex, flexShrink: 0,
              marginRight: 4,
            }} />
          }
        />
      </Section>

      {/* ── Color picker modal ───────────────────────────────────────────────── */}
      {editAppearance && (
        <BottomSheet onClose={() => setEditAppearance(false)}>
          <div style={{ padding: '20px 16px 8px' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 4 }}>
              Акцентный цвет
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Цвет кнопок и акцентов магазина
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {(Object.entries(ACCENT_COLORS) as [string, string][]).map(([id, hex]) => (
                <button
                  key={id}
                  onClick={() => setPickedColor(id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: 8, borderRadius: 12,
                    border: pickedColor === id ? `2px solid ${hex}` : '2px solid transparent',
                    background: pickedColor === id ? `${hex}18` : 'transparent',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: hex,
                    boxShadow: pickedColor === id ? `0 0 0 3px ${hex}44` : 'none',
                  }}/>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                    {id}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => appearanceMutation.mutate(pickedColor)}
              disabled={appearanceMutation.isPending}
              style={{
                width: '100%', height: 48, borderRadius: 12,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 15, marginBottom: 16,
                opacity: appearanceMutation.isPending ? 0.7 : 1,
              }}
            >
              {appearanceMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── Typography picker modal ─────────────────────────────────────────── */}
      {editTypography && (
        <BottomSheet onClose={() => setEditTypography(false)}>
          <div style={{ padding: '20px 16px 8px' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 4 }}>
              Типографика
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Шрифты заголовков и текста магазина
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {([
                { id: 'modern',   display: 'Sora',                 body: 'Outfit',  hint: 'Электроника, Технологии' },
                { id: 'editorial',display: 'Instrument Serif',     body: 'Inter',   hint: 'Мода, Красота' },
                { id: 'bold',     display: 'Bricolage Grotesque',  body: 'Inter',   hint: 'Спорт, Авто, Детское' },
                { id: 'warm',     display: 'Fraunces',             body: 'Outfit',  hint: 'Дом, Еда' },
                { id: 'minimal',  display: 'Geist',                body: 'Geist',   hint: 'Универсальный, Премиум' },
              ] as { id: string; display: string; body: string; hint: string }[]).map(typo => (
                <button
                  key={typo.id}
                  onClick={() => setPickedTypo(typo.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 14, width: '100%', textAlign: 'left',
                    border: pickedTypo === typo.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: pickedTypo === typo.id ? 'var(--accent-soft)' : 'var(--card)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                      {typo.id.charAt(0).toUpperCase() + typo.id.slice(1)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {typo.display} / {typo.body} · {typo.hint}
                    </div>
                  </div>
                  {pickedTypo === typo.id && (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => typographyMutation.mutate(pickedTypo)}
              disabled={typographyMutation.isPending}
              style={{
                width: '100%', height: 48, borderRadius: 12,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 15, marginBottom: 16,
                opacity: typographyMutation.isPending ? 0.7 : 1,
              }}
            >
              {typographyMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── Order settings modal ─────────────────────────────────────────────── */}
      {editOrderSettings && (
        <BottomSheet onClose={() => setEditOrderSettings(false)}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>
          <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
              Настройки заказов
            </div>

            {/* Min order amount */}
            <label style={{ display: 'block' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Минимальная сумма заказа
              </div>
              <input
                type="number"
                placeholder="0 — без ограничений"
                value={minOrderAmount}
                onChange={e => setMinOrderAmount(e.target.value)}
                style={{ width: '100%', height: 46, padding: '0 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', boxSizing: 'border-box' }}
              />
            </label>

            {/* Required checkout fields */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
                Обязательные поля при оформлении
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {[
                  { id: 'name', label: 'Имя покупателя' },
                  { id: 'phone', label: 'Номер телефона' },
                  { id: 'email', label: 'Email покупателя' },
                  { id: 'address', label: 'Адрес доставки' },
                  { id: 'note', label: 'Примечание к заказу' },
                ].map((field, idx, arr) => {
                  const checked = requiredFields.includes(field.id)
                  return (
                    <div
                      key={field.id}
                      onClick={() => setRequiredFields(prev => checked ? prev.filter(f => f !== field.id) : [...prev, field.id])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px', background: 'var(--card)',
                        borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                        background: checked ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{field.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Confirmation message */}
            <label style={{ display: 'block' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Сообщение после оформления заказа
              </div>
              <textarea
                placeholder="Спасибо! Мы свяжемся с вами в течение часа."
                value={orderConfirmationMsg}
                onChange={e => setOrderConfirmationMsg(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </label>

            <button
              onClick={saveOrderSettings}
              disabled={orderSettingsMutation.isPending}
              style={{
                height: 50, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 15,
                opacity: orderSettingsMutation.isPending ? 0.7 : 1,
              }}
            >
              {orderSettingsMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── Section 5: Маркетинг ────────────────────────────────────────────── */}
      <Section title="Маркетинг">
        <Row
          icon="send"
          label="Рассылки"
          onPress={() => setShowMailings(true)}
        />
        <Row
          icon="coupon"
          label="Купоны и скидки"
          onPress={() => setShowCoupons(true)}
          noBorder
        />
      </Section>

      {/* ── Section 6: Подписка ─────────────────────────────────────────────── */}
      <Section title="Подписка">
        <Row
          icon="starFilled"
          label="Тарифный план"
          value={tierLabel}
          noBorder={!isOnTrial}
        />
        {isOnTrial && (
          <Row
            icon="info"
            label="Срок пробного периода"
            value={daysLeft > 0 ? `${daysLeft} дн. осталось` : 'Истёк'}
            valueColor={daysLeft <= 3 ? 'var(--danger)' : 'var(--muted)'}
            noBorder
          />
        )}
      </Section>

      {/* ── Section 6: Аккаунт ─────────────────────────────────────────────── */}
      <Section title="Аккаунт">
        <Row
          icon="x"
          label="Удалить магазин"
          danger
          noBorder
          onPress={() => alert('Функция будет доступна в следующей версии')}
        />
      </Section>

      {/* ── Section 7: Помощь ──────────────────────────────────────────────── */}
      <Section title="Помощь">
        <Row
          icon="send"
          label="Поддержка Dokonly"
          onPress={() => {
            const tg = (window as any).Telegram?.WebApp
            tg?.openTelegramLink?.('https://t.me/dokonly_support') ?? window.open('https://t.me/dokonly_support', '_blank')
          }}
        />
        <Row
          icon="starFilled"
          label="Новости Dokonly"
          onPress={() => {
            const tg = (window as any).Telegram?.WebApp
            tg?.openTelegramLink?.('https://t.me/dokonly') ?? window.open('https://t.me/dokonly', '_blank')
          }}
        />
        <Row
          icon="info"
          label="Закрыть приложение"
          noBorder
          onPress={() => {
            (window as any).Telegram?.WebApp?.close?.()
          }}
        />
      </Section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
        Dokonly v1.0 · {tenant.slug}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Информация о магазине
      ══════════════════════════════════════════════════════════════════════ */}
      {editProfile && (
        <BottomSheet onClose={() => setEditProfile(false)}>
          {/* drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          <div style={{ padding: '16px 20px 32px' }}>
            <div style={{
              fontFamily: 'Sora', fontWeight: 700, fontSize: 18,
              color: 'var(--ink)', marginBottom: 20,
            }}>
              Информация о магазине
            </div>

            {/* Hidden file inputs */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoFileChange}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverFileChange}
            />

            {/* Cover photo upload */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Обложка
              </div>
              <div style={{
                width: '100%', height: 150, borderRadius: 14,
                overflow: 'hidden', position: 'relative',
                background: coverUrl
                  ? 'transparent'
                  : 'linear-gradient(135deg, var(--subtle) 0%, var(--border) 100%)',
                border: '1.5px solid var(--border)',
              }}>
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Cover"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 6,
                  }}>
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Обложка</span>
                  </div>
                )}
                {/* Camera overlay button */}
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  style={{
                    position: 'absolute', bottom: 8, right: 8,
                    width: 32, height: 32, borderRadius: 999,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {coverUploading
                    ? <span style={{ fontSize: 14, color: 'white' }}>...</span>
                    : <span style={{ fontSize: 14 }}>📷</span>
                  }
                </button>
              </div>
            </div>

            {/* Logo upload */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                style={{
                  width: 80, height: 80, borderRadius: 999,
                  overflow: 'hidden', flexShrink: 0,
                  border: '2px solid var(--border)',
                  background: 'linear-gradient(135deg, #c4b8a8 0%, #a8957e 60%, #877462 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {logoUploading ? (
                  <span style={{ fontSize: 18, color: 'white' }}>...</span>
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ width: 80, height: 80, borderRadius: 999, objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{
                    fontFamily: 'Sora', fontWeight: 700, fontSize: 26, color: 'white',
                  }}>
                    {(profileName || tenant.name || '?')[0]?.toUpperCase()}
                  </span>
                )}
              </button>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                  Логотип
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Нажмите на круг, чтобы изменить
                </div>
              </div>
            </div>

            {/* Name */}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Название
              </div>
              <input
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Название магазина"
                style={{
                  width: '100%', height: 48, borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--card)',
                  padding: '0 14px', fontSize: 15, color: 'var(--ink)',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Description */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Описание
              </div>
              <textarea
                value={profileDesc}
                onChange={e => setProfileDesc(e.target.value)}
                placeholder="Расскажите о вашем магазине..."
                rows={4}
                style={{
                  width: '100%', borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--card)',
                  padding: '12px 14px', fontSize: 15, color: 'var(--ink)',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Contact info */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
              Контакты
            </div>
            {[
              { label: '📞 Телефон', value: profilePhone, setter: setProfilePhone, placeholder: '+998 90 123 45 67' },
              { label: '💬 Telegram', value: profileTelegram, setter: setProfileTelegram, placeholder: '@username' },
              { label: '📷 Instagram', value: profileInstagram, setter: setProfileInstagram, placeholder: '@handle' },
              { label: '📍 Адрес', value: profileAddress, setter: setProfileAddress, placeholder: 'г. Ташкент, ул. ...' },
            ].map(field => (
              <label key={field.label} style={{ display: 'block', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{field.label}</div>
                <input
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', height: 44, borderRadius: 10,
                    border: '1.5px solid var(--border)', background: 'var(--card)',
                    padding: '0 12px', fontSize: 14, color: 'var(--ink)',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            ))}

            {/* Working hours */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, marginTop: 8 }}>
              Часы работы
            </div>
            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>🕐 Расписание</div>
              <textarea
                value={profileWorkingHours}
                onChange={e => setProfileWorkingHours(e.target.value)}
                placeholder={'Пн-Пт: 9:00–19:00\nСб: 10:00–17:00\nВс: выходной'}
                rows={3}
                style={{
                  width: '100%', borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'var(--card)',
                  padding: '10px 12px', fontSize: 14, color: 'var(--ink)',
                  boxSizing: 'border-box', resize: 'none', lineHeight: 1.5,
                }}
              />
            </label>

            {/* Return policy */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, marginTop: 8 }}>
              Политика возврата
            </div>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>🔄 Условия возврата</div>
              <textarea
                value={profileReturnPolicy}
                onChange={e => setProfileReturnPolicy(e.target.value)}
                placeholder="Возврат в течение 14 дней с момента получения при сохранении товарного вида"
                rows={3}
                style={{
                  width: '100%', borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'var(--card)',
                  padding: '10px 12px', fontSize: 14, color: 'var(--ink)',
                  boxSizing: 'border-box', resize: 'none', lineHeight: 1.5,
                }}
              />
            </label>

            {/* Error */}
            {profileError && (
              <div style={{
                marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                background: 'var(--danger-soft)', color: 'var(--danger)',
                fontSize: 13, fontWeight: 500,
              }}>
                {profileError}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSaveProfile}
              disabled={updateSettingsMutation.isPending}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 16,
                opacity: updateSettingsMutation.isPending ? 0.7 : 1,
              }}
            >
              {updateSettingsMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setEditProfile(false)}
              style={{
                width: '100%', marginTop: 12, fontSize: 14,
                color: 'var(--muted)', background: 'none', fontWeight: 500,
              }}
            >
              Отмена
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Способы доставки
      ══════════════════════════════════════════════════════════════════════ */}
      {editDelivery && (
        <BottomSheet onClose={() => setEditDelivery(false)}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          <div style={{ padding: '16px 20px 32px' }}>
            <div style={{
              fontFamily: 'Sora', fontWeight: 700, fontSize: 18,
              color: 'var(--ink)', marginBottom: 20,
            }}>
              Способы доставки
            </div>

            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24 }}>
              {deliveryMethods.map((method, i) => (
                <div key={method.id} style={{
                  padding: '14px 16px',
                  background: 'var(--card)',
                  borderBottom: i < deliveryMethods.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                      {method.label}
                    </span>
                    <button
                      onClick={() => toggleDelivery(method.id)}
                      style={{
                        width: 48, height: 28, borderRadius: 999,
                        background: method.enabled ? 'var(--accent)' : 'var(--border)',
                        position: 'relative', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 3, width: 22, height: 22,
                        borderRadius: 999, background: 'white',
                        left: method.enabled ? 23 : 3, transition: 'left 0.2s',
                      }} />
                    </button>
                  </div>
                  {method.enabled && method.id !== 'pickup' && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                        Стоимость доставки ({tenant.currency ?? 'UZS'})
                      </label>
                      <input
                        type="number"
                        value={method.price}
                        onChange={e => updateDeliveryPrice(method.id, Number(e.target.value))}
                        placeholder="0"
                        style={{
                          width: '100%', height: 40, padding: '0 12px',
                          borderRadius: 10, background: 'var(--subtle)',
                          border: '1px solid var(--border)', fontSize: 14,
                          color: 'var(--ink)', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => deliveryMutation.mutate({ delivery_methods: deliveryMethods })}
              disabled={deliveryMutation.isPending}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 16,
                opacity: deliveryMutation.isPending ? 0.7 : 1,
              }}
            >
              {deliveryMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>

            <button
              onClick={() => setEditDelivery(false)}
              style={{
                width: '100%', marginTop: 12, fontSize: 14,
                color: 'var(--muted)', background: 'none', fontWeight: 500,
              }}
            >
              Отмена
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Способы оплаты
      ══════════════════════════════════════════════════════════════════════ */}
      {editPayment && (
        <BottomSheet onClose={() => setEditPayment(false)}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          <div style={{ padding: '16px 20px 32px' }}>
            <div style={{
              fontFamily: 'Sora', fontWeight: 700, fontSize: 18,
              color: 'var(--ink)', marginBottom: 12,
            }}>
              Способы оплаты
            </div>

            <div style={{
              fontSize: 13, color: 'var(--muted)',
              marginBottom: 20, lineHeight: 1.5,
            }}>
              Наличные всегда доступны. Для онлайн-оплаты подключите систему.
            </div>

            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24 }}>
              {ALL_PAYMENT_METHODS.map((pm, i) => {
                const isEnabled = paymentMethods.includes(pm.id) || pm.alwaysEnabled
                return (
                  <div key={pm.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px', background: 'var(--card)',
                    borderBottom: i < ALL_PAYMENT_METHODS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{pm.emoji}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                      {pm.label}
                    </span>
                    {pm.alwaysEnabled ? (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Всегда</span>
                    ) : (
                      <button
                        onClick={() =>
                          setPaymentMethods(prev =>
                            prev.includes(pm.id)
                              ? prev.filter(id => id !== pm.id)
                              : [...prev, pm.id],
                          )
                        }
                        style={{
                          width: 48, height: 28, borderRadius: 999,
                          background: isEnabled ? 'var(--accent)' : 'var(--border)',
                          position: 'relative', flexShrink: 0,
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 3, width: 22, height: 22,
                          borderRadius: 999, background: 'white',
                          left: isEnabled ? 23 : 3, transition: 'left 0.2s',
                        }} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bank card transfer details */}
            {paymentMethods.includes('card') && (
              <div style={{ marginBottom: 20, padding: '16px', borderRadius: 14, background: 'var(--subtle)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
                  💳 Реквизиты для перевода
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Номер карты</label>
                    <input
                      value={transferCardNumber}
                      onChange={e => setTransferCardNumber(e.target.value)}
                      placeholder="8600 0000 0000 0000"
                      maxLength={19}
                      style={{
                        width: '100%', height: 44, padding: '0 12px',
                        borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)',
                        outline: 'none', fontSize: 14, fontFamily: 'JetBrains Mono', color: 'var(--ink)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Владелец карты</label>
                    <input
                      value={transferCardHolder}
                      onChange={e => setTransferCardHolder(e.target.value)}
                      placeholder="Имя Фамилия"
                      style={{
                        width: '100%', height: 44, padding: '0 12px',
                        borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)',
                        outline: 'none', fontSize: 14, color: 'var(--ink)',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Покупатели увидят эти реквизиты после оформления заказа
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={savePaymentSettings}
              disabled={paymentMutation.isPending}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 16,
                opacity: paymentMutation.isPending ? 0.7 : 1,
              }}
            >
              {paymentMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>

            <button
              onClick={() => setEditPayment(false)}
              style={{
                width: '100%', marginTop: 12, fontSize: 14,
                color: 'var(--muted)', background: 'none', fontWeight: 500,
              }}
            >
              Отмена
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Подключить бота
      ══════════════════════════════════════════════════════════════════════ */}
      {editBot && (
        <BottomSheet onClose={() => setEditBot(false)}>
          {/* drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          <div style={{ padding: '16px 20px 32px' }}>
            <div style={{
              fontFamily: 'Sora', fontWeight: 700, fontSize: 18,
              color: 'var(--ink)', marginBottom: 16,
            }}>
              Подключить бота
            </div>

            {/* Instructions card */}
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--subtle)', marginBottom: 20,
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--muted-strong)',
                marginBottom: 8,
              }}>
                Как получить токен:
              </div>
              {[
                'Откройте @BotFather',
                'Отправьте /newbot',
                'Введите имя и username',
                'Скопируйте токен',
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    marginBottom: i < 3 ? 6 : 0,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Token input */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Токен бота
              </div>
              <input
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="123456789:AABBccDDeeFF..."
                style={{
                  width: '100%', height: 48, borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--card)',
                  padding: '0 14px', fontSize: 14, color: 'var(--ink)',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Error */}
            {botError && (
              <div style={{
                marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                background: 'var(--danger-soft)', color: 'var(--danger)',
                fontSize: 13, fontWeight: 500,
              }}>
                {botError}
              </div>
            )}

            {/* Connect button */}
            <button
              onClick={handleSetupBot}
              disabled={setupBotMutation.isPending}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 16,
                opacity: setupBotMutation.isPending ? 0.7 : 1,
              }}
            >
              {setupBotMutation.isPending ? 'Подключение...' : 'Подключить'}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setEditBot(false)}
              style={{
                width: '100%', marginTop: 12, fontSize: 14,
                color: 'var(--muted)', background: 'none', fontWeight: 500,
              }}
            >
              Отмена
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Уведомления в группу
      ══════════════════════════════════════════════════════════════════════ */}
      {editGroupChat && (
        <BottomSheet onClose={() => setEditGroupChat(false)}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          <div style={{ padding: '16px 20px 32px' }}>
            <div style={{
              fontFamily: 'Sora', fontWeight: 700, fontSize: 18,
              color: 'var(--ink)', marginBottom: 8,
            }}>
              Уведомления в группу
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Новые заказы будут дублироваться в указанный групповой чат или канал
            </div>

            <div style={{
              padding: '12px 16px', borderRadius: 14,
              background: 'var(--subtle)', marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-strong)', marginBottom: 6 }}>
                Как получить ID чата:
              </div>
              {[
                'Добавьте бота в группу/канал',
                'Назначьте бота администратором',
                'Отправьте /start в группу',
                'Скопируйте ID из ответа',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 3 ? 6 : 0 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                ID группового чата
              </div>
              <input
                value={groupChatId}
                onChange={e => setGroupChatId(e.target.value)}
                placeholder="-100123456789"
                style={{
                  width: '100%', height: 48, borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--card)',
                  padding: '0 14px', fontSize: 14, color: 'var(--ink)',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            <button
              onClick={() => groupChatMutation.mutate(groupChatId.trim())}
              disabled={groupChatMutation.isPending}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontWeight: 700, fontSize: 16,
                opacity: groupChatMutation.isPending ? 0.7 : 1,
              }}
            >
              {groupChatMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>

            {groupChatId && (
              <button
                onClick={() => { setGroupChatId(''); groupChatMutation.mutate('') }}
                disabled={groupChatMutation.isPending}
                style={{
                  width: '100%', marginTop: 10, height: 44, borderRadius: 12,
                  background: 'var(--danger-soft)', color: 'var(--danger)',
                  fontWeight: 600, fontSize: 14,
                }}
              >
                Отключить уведомления
              </button>
            )}

            <button
              onClick={() => setEditGroupChat(false)}
              style={{
                width: '100%', marginTop: 12, fontSize: 14,
                color: 'var(--muted)', background: 'none', fontWeight: 500,
              }}
            >
              Отмена
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
