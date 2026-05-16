import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/Icon'
import { api } from '@/lib/api'
import { useTelegramMainButton } from '@/hooks/useTelegram'

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

  useTelegramMainButton({
    text: creating ? 'Создание...' : 'Сохранить черновик',
    onClick: () => { if (title.trim() && text.trim() && !creating) createMailing() },
    isVisible: showForm,
    disabled: !title.trim() || !text.trim() || creating,
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

  const canCreateCode = !!(code.trim() && discountValue.trim() && !creating)
  useTelegramMainButton({
    text: creating ? 'Создание...' : 'Создать купон',
    onClick: () => { if (canCreateCode) createCode() },
    isVisible: showForm,
    disabled: !canCreateCode,
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── NotificationsSheet ────────────────────────────────────────────────────────
function NotificationsSheet({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient()
  const prefs: Record<string, boolean> = (tenant.settings as any)?.notification_preferences ?? {}
  const [vals, setVals] = useState<Record<string, boolean>>({
    new_order:           prefs.new_order           ?? true,
    low_stock:           prefs.low_stock            ?? true,
    new_review:          prefs.new_review           ?? true,
    payment_screenshot:  prefs.payment_screenshot   ?? true,
    order_cancelled:     prefs.order_cancelled      ?? true,
  })
  const [saving, setSaving] = useState(false)

  const EVENTS = [
    { key: 'new_order',          label: 'Новый заказ' },
    { key: 'low_stock',          label: 'Товар заканчивается' },
    { key: 'new_review',         label: 'Новый отзыв' },
    { key: 'payment_screenshot', label: 'Скриншот оплаты' },
    { key: 'order_cancelled',    label: 'Отмена заказа' },
  ]

  async function handleSave() {
    setSaving(true)
    try {
      await api.seller.updateSettings({ notification_preferences: vals })
      qc.invalidateQueries({ queryKey: ['seller-tenant'] })
      onClose()
    } catch { } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
        Уведомления
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: -8, lineHeight: 1.5 }}>
        Выберите, о каких событиях вы хотите получать уведомления в Telegram.
      </div>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {EVENTS.map((ev, idx) => (
          <div
            key={ev.key}
            onClick={() => setVals(v => ({ ...v, [ev.key]: !v[ev.key] }))}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', background: 'var(--card)', cursor: 'pointer',
              borderBottom: idx < EVENTS.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{ev.label}</span>
            <div style={{
              width: 46, height: 26, borderRadius: 999, flexShrink: 0,
              background: vals[ev.key] ? 'var(--accent)' : 'var(--border)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3,
                left: vals[ev.key] ? 23 : 3,
                width: 20, height: 20, borderRadius: 999,
                background: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', height: 50, borderRadius: 14,
          background: 'var(--accent)', color: 'white',
          fontWeight: 700, fontSize: 16, opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  )
}

// ── LocalizationSheet ─────────────────────────────────────────────────────────
function LocalizationSheet({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [defaultLang, setDefaultLang] = useState<string>(
    tenant.settings?.default_language ?? 'ru'
  )
  const [supportedLangs, setSupportedLangs] = useState<string[]>(
    (tenant.settings as any)?.supported_languages ?? ['ru']
  )
  const [saving, setSaving] = useState(false)

  const LANGS = [
    { code: 'ru', label: 'Русский' },
    { code: 'uz', label: "O'zbek" },
    { code: 'en', label: 'English' },
  ]

  function toggleSupported(code: string) {
    setSupportedLangs(prev => {
      if (prev.includes(code)) {
        const next = prev.filter(l => l !== code)
        if (defaultLang === code) setDefaultLang(next[0] ?? 'ru')
        return next.length === 0 ? prev : next
      }
      return [...prev, code]
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const langs = supportedLangs.includes(defaultLang)
        ? supportedLangs
        : [defaultLang, ...supportedLangs]
      await api.seller.updateSettings({ default_language: defaultLang, supported_languages: langs })
      qc.invalidateQueries({ queryKey: ['seller-tenant'] })
      onClose()
    } catch { } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
        Язык магазина
      </div>

      {/* Default language */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
          Язык по умолчанию
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {LANGS.map((lang, idx) => (
            <div
              key={lang.code}
              onClick={() => {
                setDefaultLang(lang.code)
                if (!supportedLangs.includes(lang.code)) {
                  setSupportedLangs(prev => [...prev, lang.code])
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', background: 'var(--card)', cursor: 'pointer',
                borderBottom: idx < LANGS.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                border: `2px solid ${defaultLang === lang.code ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {defaultLang === lang.code && (
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--accent)' }} />
                )}
              </div>
              <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{lang.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supported languages */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
          Поддерживаемые языки
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {LANGS.map((lang, idx) => {
            const checked = supportedLangs.includes(lang.code)
            return (
              <div
                key={lang.code}
                onClick={() => toggleSupported(lang.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px', background: 'var(--card)', cursor: 'pointer',
                  borderBottom: idx < LANGS.length - 1 ? '1px solid var(--border)' : 'none',
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
                <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{lang.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', height: 50, borderRadius: 14,
          background: 'var(--accent)', color: 'white',
          fontWeight: 700, fontSize: 16, opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  )
}

// ─── AbandonedCartsView ───────────────────────────────────────────────────────

export function AbandonedCartsView({ onBack }: { onBack: () => void }) {
  const { data: carts = [], isLoading } = useQuery({
    queryKey: ['seller-abandoned-carts'],
    queryFn: () => api.seller.mailings(), // placeholder — uses mailings endpoint; backend filters abandoned
    staleTime: 60000,
  })

  const sendMutation = useMutation({
    mutationFn: (customerId: string) =>
      api.seller.createMailing({ type: 'abandoned_cart', customer_id: customerId, auto: false }),
  })

  function fmtTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'меньше часа'
    if (hours < 24) return `${hours} ч назад`
    return `${Math.floor(hours / 24)} дн назад`
  }

  const abandonedCarts = (carts as any[]).filter((m: any) => m.type === 'abandoned_cart' || m.abandoned_at)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>Брошенные корзины</span>
      </div>
      <div style={{ flex: 1, padding: '16px 16px 100px' }}>
        {/* Info banner */}
        <div style={{ borderRadius: 14, background: 'var(--accent-soft)', border: '1px solid var(--accent)', padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>💡 Как это работает</div>
          <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5 }}>
            Покупатели добавившие товары в корзину, но не оформившие заказ в течение 30+ минут. Отправьте напоминание — конверсия +25%.
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : abandonedCarts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 8 }}>Нет брошенных корзин</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Все покупатели завершили заказы — отличный результат!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {abandonedCarts.map((cart: any) => (
              <div key={cart.id} style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {(cart.customer_name ?? 'П').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{cart.customer_name ?? 'Покупатель'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtTime(cart.abandoned_at ?? cart.created_at)}</div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                    {cart.total_amount ? `${Number(cart.total_amount).toLocaleString()} сум` : '—'}
                  </div>
                </div>
                {cart.items?.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                    {(cart.items as any[]).map((i: any) => i.name ?? 'Товар').join(', ')}
                  </div>
                )}
                <button
                  onClick={() => sendMutation.mutate(cart.customer_id)}
                  disabled={sendMutation.isPending}
                  style={{ width: '100%', height: 38, borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: sendMutation.isPending ? 0.7 : 1 }}
                >
                  📨 Отправить напоминание
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── StoriesView ──────────────────────────────────────────────────────────────

export function StoriesView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [caption, setCaption] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [expiresHours, setExpiresHours] = useState('24')
  const [mediaUrl, setMediaUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['seller-stories'],
    queryFn: () => api.seller.stories(),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.seller.createStory(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-stories'] })
      setShowForm(false)
      setCaption(''); setCtaText(''); setCtaUrl(''); setMediaUrl('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.seller.deleteStory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-stories'] }),
  })

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setUploading(true)
    try {
      const { url } = await api.seller.uploadFile(f)
      setMediaUrl(url)
    } catch { } finally { setUploading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>Stories и Баннеры</span>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '7px 14px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 13 }}
        >+ Добавить</button>
      </div>
      <div style={{ flex: 1, padding: '16px 16px 100px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (stories as any[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 8 }}>Нет активных stories</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Добавьте stories или баннеры чтобы привлечь внимание покупателей</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(stories as any[]).map((s: any) => {
              const expired = s.expires_at && new Date(s.expires_at) < new Date()
              return (
                <div key={s.id} style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {s.media_url && (
                    <div style={{ height: 140, overflow: 'hidden', background: 'var(--subtle)' }}>
                      <img src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>
                        {s.caption || '(без текста)'}
                      </div>
                      {s.cta_text && (
                        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>🔗 {s.cta_text}</div>
                      )}
                      <div style={{ fontSize: 11, color: expired ? 'var(--danger)' : 'var(--muted)', marginTop: 4 }}>
                        {expired ? '⏰ Истёк' : s.expires_at ? `До ${new Date(s.expires_at).toLocaleDateString('ru')}` : 'Бессрочно'}
                      </div>
                    </div>
                    <button
                      onClick={() => confirm('Удалить story?') && deleteMutation.mutate(s.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <Icon name="x" size={14} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 4 }}>Новая story</div>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%', height: 100, borderRadius: 12, border: '2px dashed var(--border)', background: mediaUrl ? 'none' : 'var(--subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', padding: 0 }}
            >
              {mediaUrl
                ? <img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : uploading ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>Загрузка...</div>
                : <><div style={{ fontSize: 28 }}>📸</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>Добавить медиа</div></>
              }
            </button>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Текст story (необязательно)"
              style={{ width: '100%', height: 80, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--subtle)', fontSize: 14, color: 'var(--ink)', resize: 'none' }}
            />
            <input
              value={ctaText}
              onChange={e => setCtaText(e.target.value)}
              placeholder="Текст кнопки CTA (необязательно)"
              style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--subtle)', fontSize: 14, color: 'var(--ink)' }}
            />
            {ctaText && (
              <input
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="Ссылка для кнопки"
                style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--subtle)', fontSize: 14, color: 'var(--ink)' }}
              />
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Срок показа</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['12', '24', '48', '168', '0'].map(h => (
                  <button
                    key={h}
                    onClick={() => setExpiresHours(h)}
                    style={{ flex: 1, height: 36, borderRadius: 8, background: expiresHours === h ? 'var(--accent)' : 'var(--subtle)', color: expiresHours === h ? 'white' : 'var(--ink)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  >
                    {h === '0' ? '∞' : h === '168' ? '7д' : h + 'ч'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}
              >Отмена</button>
              <button
                onClick={() => createMutation.mutate({
                  media_url: mediaUrl || null,
                  caption: caption.trim() || null,
                  cta_text: ctaText.trim() || null,
                  cta_url: ctaUrl.trim() || null,
                  expires_at: expiresHours === '0' ? null : new Date(Date.now() + Number(expiresHours) * 3600 * 1000).toISOString(),
                })}
                disabled={createMutation.isPending}
                style={{ flex: 2, height: 48, borderRadius: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: createMutation.isPending ? 0.7 : 1 }}
              >{createMutation.isPending ? 'Создание...' : 'Добавить story'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LoyaltyProgramView ───────────────────────────────────────────────────────

export function LoyaltyProgramView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const { data: config, isLoading } = useQuery({
    queryKey: ['seller-loyalty-config'],
    queryFn: () => api.seller.loyaltyConfig(),
  })
  const [earnRate, setEarnRate] = useState('')
  const [cashbackRate, setCashbackRate] = useState('')
  const [minRedeem, setMinRedeem] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [initialized, setInitialized] = useState(false)

  if (!initialized && config) {
    setEarnRate(String(config.earn_rate ?? 10))
    setCashbackRate(String(config.cashback_rate ?? 1))
    setMinRedeem(String(config.min_redeem_amount ?? 1000))
    setIsActive(config.is_active ?? false)
    setInitialized(true)
  }

  const saveMutation = useMutation({
    mutationFn: (body: object) => api.seller.updateLoyaltyConfig(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-loyalty-config'] }),
  })

  const TIERS = [
    { name: 'Bronze', emoji: '🥉', from: 0, to: 1000, cashback: '1%' },
    { name: 'Silver', emoji: '🥈', from: 1000, to: 3000, cashback: '2%' },
    { name: 'Gold', emoji: '🥇', from: 3000, to: 7000, cashback: '3%' },
    { name: 'Platinum', emoji: '💎', from: 7000, to: null, cashback: '5%' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Программа лояльности</span>
      </div>
      <div style={{ flex: 1, padding: '16px 16px 120px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Active toggle */}
            <div style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Программа активна</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Покупатели накапливают и тратят баллы</div>
              </div>
              <div
                onClick={() => setIsActive(v => !v)}
                style={{ width: 46, height: 26, borderRadius: 999, background: isActive ? 'var(--accent)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                <div style={{ position: 'absolute', top: 3, left: isActive ? 22 : 3, width: 20, height: 20, borderRadius: 999, background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* Settings */}
            <div style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>НАЧИСЛЕНИЕ БАЛЛОВ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>Баллов за 1 000 UZS покупки</div>
                  <input
                    value={earnRate}
                    onChange={e => setEarnRate(e.target.value)}
                    type="number"
                    style={{ width: 70, height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--subtle)', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}
                  />
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>КЭШБЭК</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>1 балл = % от суммы заказа</div>
                  <input
                    value={cashbackRate}
                    onChange={e => setCashbackRate(e.target.value)}
                    type="number"
                    step="0.1"
                    style={{ width: 70, height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--subtle)', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}
                  />
                </div>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>МИНИМУМ ДЛЯ СПИСАНИЯ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>Минимальная сумма заказа (UZS)</div>
                  <input
                    value={minRedeem}
                    onChange={e => setMinRedeem(e.target.value)}
                    type="number"
                    style={{ width: 90, height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--subtle)', textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}
                  />
                </div>
              </div>
            </div>

            {/* Tiers */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Уровни покупателей</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {TIERS.map(tier => (
                <div key={tier.name} style={{ borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{tier.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{tier.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {tier.to ? `${tier.from.toLocaleString()} – ${tier.to.toLocaleString()} баллов` : `${tier.from.toLocaleString()}+ баллов`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{tier.cashback} кэшбэк</div>
                </div>
              ))}
            </div>

            {/* Stats */}
            {config?.stats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Участников', value: config.stats.members ?? 0 },
                  { label: 'Баллов выдано', value: (config.stats.points_issued ?? 0).toLocaleString() },
                  { label: 'Баллов списано', value: (config.stats.points_redeemed ?? 0).toLocaleString() },
                  { label: 'Экономия покупателей', value: (config.stats.discount_given ?? 0).toLocaleString() + ' UZS' },
                ].map(s => (
                  <div key={s.label} style={{ borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {!isLoading && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => saveMutation.mutate({ is_active: isActive, earn_rate: Number(earnRate), cashback_rate: Number(cashbackRate), min_redeem_amount: Number(minRedeem) })}
            disabled={saveMutation.isPending}
            style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', opacity: saveMutation.isPending ? 0.7 : 1 }}
          >{saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}</button>
        </div>
      )}
    </div>
  )
}

// ─── ReferralProgramView ──────────────────────────────────────────────────────

export function ReferralProgramView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const { data: config, isLoading } = useQuery({
    queryKey: ['seller-referral-config'],
    queryFn: () => api.seller.referralConfig(),
  })
  const [referrerBonus, setReferrerBonus] = useState('500')
  const [refereeBonus, setRefereeBonus] = useState('300')
  const [expiryDays, setExpiryDays] = useState('30')
  const [isActive, setIsActive] = useState(false)
  const [initialized, setInitialized] = useState(false)

  if (!initialized && config) {
    setReferrerBonus(String(config.referrer_bonus ?? 500))
    setRefereeBonus(String(config.referee_bonus ?? 300))
    setExpiryDays(String(config.expiry_days ?? 30))
    setIsActive(config.is_active ?? false)
    setInitialized(true)
  }

  const saveMutation = useMutation({
    mutationFn: (body: object) => api.seller.updateReferralConfig(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-referral-config'] }),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Реферальная программа</span>
      </div>
      <div style={{ flex: 1, padding: '16px 16px 120px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Active toggle */}
            <div style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Программа активна</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Покупатели получают бонусы за приглашения</div>
              </div>
              <div
                onClick={() => setIsActive(v => !v)}
                style={{ width: 46, height: 26, borderRadius: 999, background: isActive ? 'var(--accent)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                <div style={{ position: 'absolute', top: 3, left: isActive ? 22 : 3, width: 20, height: 20, borderRadius: 999, background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* Rewards setup */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Вознаграждения</div>
            <div style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Бонус пригласившего</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Баллы после первого заказа реферала</div>
                </div>
                <input
                  value={referrerBonus}
                  onChange={e => setReferrerBonus(e.target.value)}
                  type="number"
                  style={{ width: 80, height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--subtle)', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}
                />
              </div>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Бонус нового покупателя</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Баллы на первый заказ</div>
                </div>
                <input
                  value={refereeBonus}
                  onChange={e => setRefereeBonus(e.target.value)}
                  type="number"
                  style={{ width: 80, height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--subtle)', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}
                />
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Срок действия ссылки</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Дней до истечения реферальной ссылки</div>
                </div>
                <input
                  value={expiryDays}
                  onChange={e => setExpiryDays(e.target.value)}
                  type="number"
                  style={{ width: 70, height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--subtle)', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}
                />
              </div>
            </div>

            {/* Stats */}
            {config?.stats && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Статистика</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Приглашений отправлено', value: config.stats.referrals_sent ?? 0 },
                    { label: 'Завершено', value: config.stats.referrals_completed ?? 0 },
                    { label: 'В процессе', value: config.stats.referrals_pending ?? 0 },
                    { label: 'Баллов выдано', value: (config.stats.points_issued ?? 0).toLocaleString() },
                  ].map(s => (
                    <div key={s.label} style={{ borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {config.stats.top_referrers?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Топ рефереров</div>
                    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      {(config.stats.top_referrers as any[]).map((r: any, i: number, arr: any[]) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{r.name ?? 'Покупатель'}</div>
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{r.referral_count} чел.</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {!isLoading && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => saveMutation.mutate({ is_active: isActive, referrer_bonus: Number(referrerBonus), referee_bonus: Number(refereeBonus), expiry_days: Number(expiryDays) })}
            disabled={saveMutation.isPending}
            style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', opacity: saveMutation.isPending ? 0.7 : 1 }}
          >{saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}</button>
        </div>
      )}
    </div>
  )
}

// ─── ChannelCrosspostingView ──────────────────────────────────────────────────

export function ChannelCrosspostingView({ tenant, onBack }: { tenant: any; onBack: () => void }) {
  const qc = useQueryClient()
  const [channelUsername, setChannelUsername] = useState(tenant.settings?.crosspost_channel ?? '')
  const [autoPost, setAutoPost] = useState(tenant.settings?.auto_crosspost ?? false)
  const [template, setTemplate] = useState(tenant.settings?.crosspost_template ?? '🛍 {product_name}\n\n{description}\n\n💰 {price}\n\n[Купить]({url})')
  const [saving, setSaving] = useState(false)

  const { data: posts = [] } = useQuery({
    queryKey: ['seller-channel-posts'],
    queryFn: () => api.seller.channelPosts(),
  })

  const postMutation = useMutation({
    mutationFn: (body: object) => api.seller.createChannelPost(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-channel-posts'] }),
  })

  async function handleSave() {
    setSaving(true)
    try {
      await api.seller.updateSettings({ crosspost_channel: channelUsername, auto_crosspost: autoPost, crosspost_template: template })
      qc.invalidateQueries({ queryKey: ['seller-tenant'] })
    } catch { } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Кросспостинг в канал</span>
      </div>
      <div style={{ flex: 1, padding: '16px 16px 120px' }}>
        {/* Channel setup */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Настройка канала</div>
        <div style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Username канала</div>
            <input
              value={channelUsername}
              onChange={e => setChannelUsername(e.target.value)}
              placeholder="@channel_name"
              style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--subtle)', fontSize: 14, color: 'var(--ink)' }}
            />
          </div>
          <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Авто-постинг новых товаров</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Публиковать автоматически при добавлении</div>
            </div>
            <div
              onClick={() => setAutoPost((v: boolean) => !v)}
              style={{ width: 46, height: 26, borderRadius: 999, background: autoPost ? 'var(--accent)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ position: 'absolute', top: 3, left: autoPost ? 22 : 3, width: 20, height: 20, borderRadius: 999, background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        </div>

        {/* Template editor */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Шаблон поста</div>
        <div style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 8 }}>
          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={6}
            style={{ width: '100%', padding: '8px 0', background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', fontFamily: 'monospace', resize: 'none' }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
          Переменные: {'{product_name}'} {'{description}'} {'{price}'} {'{url}'}
        </div>

        {/* Manual post button */}
        {channelUsername && (
          <button
            onClick={() => postMutation.mutate({ type: 'manual', template })}
            disabled={postMutation.isPending}
            style={{ width: '100%', height: 46, borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 20, opacity: postMutation.isPending ? 0.7 : 1 }}
          >📢 {postMutation.isPending ? 'Публикация...' : 'Опубликовать сейчас'}</button>
        )}

        {/* Posts history */}
        {(posts as any[]).length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>История публикаций</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(posts as any[]).slice(0, 10).map((p: any) => (
                <div key={p.id} style={{ borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{p.type === 'auto' ? '🤖' : '📢'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{p.product_name ?? 'Публикация'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleString('ru')}</div>
                  </div>
                  <div style={{ fontSize: 12, color: p.status === 'sent' ? '#10B981' : 'var(--danger)', fontWeight: 600 }}>
                    {p.status === 'sent' ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
        >{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}

// ─── TeamView ─────────────────────────────────────────────────────────────────

export function TeamView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'operator'>('operator')
  const ROLES = [
    { id: 'owner', label: 'Владелец', color: '#8B5CF6' },
    { id: 'manager', label: 'Менеджер', color: '#3B82F6' },
    { id: 'operator', label: 'Оператор', color: '#10B981' },
  ]

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['seller-team'],
    queryFn: () => api.seller.teamMembers(),
  })

  const inviteMutation = useMutation({
    mutationFn: (body: object) => api.seller.inviteTeamMember(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-team'] })
      setShowInvite(false); setInviteUsername('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.seller.removeTeamMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-team'] }),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', flex: 1 }}>Команда</span>
        <button
          onClick={() => setShowInvite(true)}
          style={{ padding: '7px 14px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 13 }}
        >+ Пригласить</button>
      </div>
      <div style={{ flex: 1, padding: '16px 16px 100px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (members as any[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 8 }}>Только вы в команде</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Пригласите сотрудников чтобы они помогали управлять магазином</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {(members as any[]).map((m: any, i: number, arr: any[]) => {
              const roleInfo = ROLES.find(r => r.id === m.role) ?? ROLES[2]
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {m.avatar_url ? <img src={m.avatar_url} style={{ width: 40, height: 40, borderRadius: 999, objectFit: 'cover' }} /> : (m.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{m.name ?? m.username ?? 'Участник'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {m.last_active_at ? `Был(а) ${new Date(m.last_active_at).toLocaleDateString('ru')}` : 'Приглашение отправлено'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: `${roleInfo.color}20`, color: roleInfo.color }}>
                    {roleInfo.label}
                  </span>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => confirm(`Удалить ${m.name ?? m.username ?? 'участника'} из команды?`) && removeMutation.mutate(m.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <Icon name="x" size={13} color="var(--danger)" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Notification prefs info */}
        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 14, background: 'var(--subtle)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>💡 Уведомления команды</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Каждый участник может настроить личные уведомления: новые заказы, сбои оплаты, остатки товаров и ежедневные сводки — через бот Dokonly.
          </div>
        </div>
      </div>

      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Пригласить в команду</div>
            <input
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              placeholder="@telegram_username"
              style={{ width: '100%', height: 48, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--subtle)', fontSize: 15, color: 'var(--ink)' }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Роль</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {ROLES.filter(r => r.id !== 'owner').map(r => (
                  <button
                    key={r.id}
                    onClick={() => setInviteRole(r.id as 'manager' | 'operator')}
                    style={{ flex: 1, height: 40, borderRadius: 10, background: inviteRole === r.id ? `${r.color}20` : 'var(--subtle)', border: `1.5px solid ${inviteRole === r.id ? r.color : 'var(--border)'}`, color: inviteRole === r.id ? r.color : 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >{r.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowInvite(false)}
                style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--subtle)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}
              >Отмена</button>
              <button
                onClick={() => inviteMutation.mutate({ username: inviteUsername.replace('@', ''), role: inviteRole })}
                disabled={!inviteUsername.trim() || inviteMutation.isPending}
                style={{ flex: 2, height: 48, borderRadius: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: (!inviteUsername.trim() || inviteMutation.isPending) ? 0.6 : 1 }}
              >{inviteMutation.isPending ? 'Отправка...' : 'Отправить приглашение'}</button>
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
  const [editLayout, setEditLayout] = useState(false)
  const [pickedLayout, setPickedLayout] = useState<string>(
    tenant.layout ?? tenant.settings?.layout ?? 'boutique'
  )
  const layoutMutation = useMutation({
    mutationFn: (layout: string) => api.seller.updateSettings({ layout }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditLayout(false)
    },
  })
  const [showCoupons, setShowCoupons]   = useState(false)
  const [showMailings, setShowMailings] = useState(false)
  const [editOrderSettings, setEditOrderSettings] = useState(false)
  const [editNotifications, setEditNotifications] = useState(false)
  const [editLocalization, setEditLocalization] = useState(false)
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
      { id: 'discuss',  label: 'Обсудить с продавцом', enabled: false, price: 0 },
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
  const [editWelcomeMsg, setEditWelcomeMsg] = useState(false)
  const [welcomeMsg, setWelcomeMsg] = useState(tenant.settings?.welcome_message ?? '')
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

  const anySettingsSheet = editProfile || editDelivery || editPayment || editAppearance || editTypography || editOrderSettings
  const anySettingsPending = updateSettingsMutation.isPending || deliveryMutation.isPending || paymentMutation.isPending || appearanceMutation.isPending || typographyMutation.isPending || orderSettingsMutation.isPending

  useTelegramMainButton({
    text: anySettingsPending ? 'Сохранение...' : 'Сохранить',
    onClick: () => {
      if (editProfile) handleSaveProfile()
      else if (editDelivery) deliveryMutation.mutate({ delivery_methods: deliveryMethods })
      else if (editPayment) savePaymentSettings()
      else if (editAppearance) appearanceMutation.mutate(pickedColor)
      else if (editTypography) typographyMutation.mutate(pickedTypo)
      else if (editOrderSettings) saveOrderSettings()
    },
    isVisible: anySettingsSheet,
    disabled: anySettingsPending,
  })

  const [showTeam, setShowTeam] = useState(false)
  const [editBlocks, setEditBlocks] = useState(false)
  const [blocksConfig, setBlocksConfig] = useState(() => ({
    stories_enabled: tenant.settings?.stories_enabled ?? true,
    stories_style: tenant.settings?.stories_style ?? 'instagram',
    featured_banner_enabled: tenant.settings?.featured_banner_enabled ?? true,
    featured_banner_autorotate: tenant.settings?.featured_banner_autorotate ?? true,
    trust_strip_enabled: tenant.settings?.trust_strip_enabled ?? true,
    trust_strip_items: tenant.settings?.trust_strip_items ?? ['delivery', 'returns', 'payment', 'rating'],
    categories_enabled: tenant.settings?.categories_enabled ?? true,
    categories_style: tenant.settings?.categories_style ?? 'scrolling',
    card_style: tenant.settings?.card_style ?? 'vertical',
    card_columns: tenant.settings?.card_columns ?? 2,
    about_block_enabled: tenant.settings?.about_block_enabled ?? true,
    reviews_enabled: tenant.settings?.reviews_enabled ?? true,
    reviews_min_rating: tenant.settings?.reviews_min_rating ?? 1,
    recently_viewed_enabled: tenant.settings?.recently_viewed_enabled ?? true,
  }))
  const blocksMutation = useMutation({
    mutationFn: (cfg: object) => api.seller.updateSettings(cfg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-me'] })
      setEditBlocks(false)
    },
  })

  const [showAbandonedCarts, setShowAbandonedCarts] = useState(false)
  const [showStories, setShowStories] = useState(false)
  const [showLoyaltyProgram, setShowLoyaltyProgram] = useState(false)
  const [showReferralProgram, setShowReferralProgram] = useState(false)
  const [showChannelCrossposting, setShowChannelCrossposting] = useState(false)

  if (showCoupons) return <CouponsView onBack={() => setShowCoupons(false)} />
  if (showMailings) return <MailingsView onBack={() => setShowMailings(false)} />
  if (showTeam) return <TeamView onBack={() => setShowTeam(false)} />
  if (showAbandonedCarts) return <AbandonedCartsView onBack={() => setShowAbandonedCarts(false)} />
  if (showStories) return <StoriesView onBack={() => setShowStories(false)} />
  if (showLoyaltyProgram) return <LoyaltyProgramView onBack={() => setShowLoyaltyProgram(false)} />
  if (showReferralProgram) return <ReferralProgramView onBack={() => setShowReferralProgram(false)} />
  if (showChannelCrossposting) return <ChannelCrosspostingView tenant={tenant} onBack={() => setShowChannelCrossposting(false)} />

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
              icon="star"
              label="Приветственное сообщение"
              value={tenant.settings?.welcome_message ? 'Настроено' : 'По умолчанию'}
              onPress={() => { setWelcomeMsg(tenant.settings?.welcome_message ?? ''); setEditWelcomeMsg(true) }}
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
          onPress={() => { setPickedColor(accentColorId); setEditAppearance(true) }}
          prefix={
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: accentHex, flexShrink: 0,
              marginRight: 4,
            }} />
          }
        />
        {(tier === 'business' || tier === 'premium') ? (
          <Row
            icon="star"
            label="Макет магазина"
            value={pickedLayout.charAt(0).toUpperCase() + pickedLayout.slice(1)}
            onPress={() => { setPickedLayout(tenant.layout ?? tenant.settings?.layout ?? 'boutique'); setEditLayout(true) }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            <Icon name="star" size={16} color="var(--muted)" />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>Макет магазина</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #00B5E2 0%, #0066CC 100%)', padding: '2px 7px', borderRadius: 999 }}>Business+</span>
          </div>
        )}
        {(tier === 'business' || tier === 'premium') ? (
          <Row
            icon="box"
            label="Блоки витрины"
            value="Настроить"
            noBorder
            onPress={() => setEditBlocks(true)}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'var(--card)' }}>
            <Icon name="box" size={16} color="var(--muted)" />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>Блоки витрины</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #00B5E2 0%, #0066CC 100%)', padding: '2px 7px', borderRadius: 999 }}>Business+</span>
          </div>
        )}
      </Section>

      {/* ── Layout picker modal ─────────────────────────────────────────────── */}
      {editLayout && (
        <BottomSheet onClose={() => setEditLayout(false)}>
          <div style={{ padding: '20px 16px 8px' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 4 }}>
              Макет магазина
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Структура главной страницы вашего магазина
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {([
                { id: 'boutique',    emoji: '🛍', label: 'Boutique',     hint: 'Мода, Красота — крупные фото, hero-баннер' },
                { id: 'catalog',     emoji: '📋', label: 'Catalog',      hint: 'Электроника, Авто — фильтры, компактные карточки' },
                { id: 'lookbook',    emoji: '📖', label: 'Lookbook',     hint: 'Премиум, Декор — stories на первом плане' },
                { id: 'marketplace', emoji: '🏪', label: 'Marketplace',  hint: 'Много категорий — поиск и сетка категорий' },
                { id: 'bento',       emoji: '🗃', label: 'Bento',        hint: 'Lifestyle — журнальная раскладка карточек' },
              ] as { id: string; emoji: string; label: string; hint: string }[]).map(layout => (
                <button
                  key={layout.id}
                  onClick={() => setPickedLayout(layout.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                    padding: '14px 16px', borderRadius: 14,
                    border: pickedLayout === layout.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: pickedLayout === layout.id ? 'var(--accent-soft)' : 'var(--card)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{layout.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: pickedLayout === layout.id ? 'var(--accent)' : 'var(--ink)' }}>{layout.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{layout.hint}</div>
                  </div>
                  {pickedLayout === layout.id && (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 16px 32px' }}>
            <button
              onClick={() => layoutMutation.mutate(pickedLayout)}
              disabled={layoutMutation.isPending}
              style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', opacity: layoutMutation.isPending ? 0.7 : 1 }}
            >
              {layoutMutation.isPending ? 'Сохраняем...' : 'Применить макет'}
            </button>
          </div>
        </BottomSheet>
      )}

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
            {/* Inject Google Fonts for live preview */}
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700&family=Outfit:wght@400;600&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600&family=Bricolage+Grotesque:wght@700&family=Fraunces:wght@400;700&display=swap');
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {([
                { id: 'modern',    label: 'Modern',    display: 'Sora',                body: 'Outfit',            mono: 'JetBrains Mono', hint: 'Электроника, Технологии' },
                { id: 'editorial', label: 'Editorial', display: 'Instrument Serif',    body: 'Inter',             mono: 'JetBrains Mono', hint: 'Мода, Красота' },
                { id: 'bold',      label: 'Bold',      display: 'Bricolage Grotesque', body: 'Inter',             mono: 'JetBrains Mono', hint: 'Спорт, Авто' },
                { id: 'warm',      label: 'Warm',      display: 'Fraunces',            body: 'Outfit',            mono: 'JetBrains Mono', hint: 'Дом, Еда' },
                { id: 'minimal',   label: 'Minimal',   display: 'Geist',               body: 'Geist',             mono: 'JetBrains Mono', hint: 'Универсальный, Премиум' },
              ] as { id: string; label: string; display: string; body: string; mono: string; hint: string }[]).map(typo => (
                <button
                  key={typo.id}
                  onClick={() => setPickedTypo(typo.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: 0, overflow: 'hidden',
                    borderRadius: 14,
                    border: pickedTypo === typo.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: 'var(--card)',
                  }}
                >
                  {/* Live preview area */}
                  <div style={{ padding: '14px 16px 10px', background: pickedTypo === typo.id ? 'var(--accent-soft)' : 'var(--card)' }}>
                    {/* Store name in display font */}
                    <div style={{ fontFamily: `'${typo.display}', serif`, fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.2 }}>
                      {tenant.name ?? 'Название магазина'}
                    </div>
                    {/* Mini product card preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--subtle)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: `'${typo.body}', sans-serif`, fontWeight: 600, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2 }}>Товар в каталоге</div>
                        <div style={{ fontFamily: `'${typo.mono}', monospace`, fontWeight: 700, fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>12 990 сум</div>
                      </div>
                    </div>
                  </div>
                  {/* Label row */}
                  <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: pickedTypo === typo.id ? 'var(--accent)' : 'var(--ink)' }}>{typo.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>{typo.hint}</span>
                    </div>
                    {pickedTypo === typo.id && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
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
        />
        <Row
          icon="star"
          label="Программа лояльности"
          onPress={() => setShowLoyaltyProgram(true)}
        />
        <Row
          icon="users"
          label="Реферальная программа"
          onPress={() => setShowReferralProgram(true)}
        />
        <Row
          icon="send"
          label="Stories и Баннеры"
          onPress={() => setShowStories(true)}
        />
        <Row
          icon="cart"
          label="Брошенные корзины"
          onPress={() => setShowAbandonedCarts(true)}
        />
        <Row
          icon="send"
          label="Кросспостинг в канал"
          onPress={() => setShowChannelCrossposting(true)}
        />
        {(tier === 'business' || tier === 'premium') ? (
          <Row
            icon="users"
            label="Команда"
            value="Сотрудники"
            noBorder
            onPress={() => setShowTeam(true)}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'var(--card)' }}>
            <Icon name="users" size={16} color="var(--muted)" />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>Команда</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #00B5E2 0%, #0066CC 100%)', padding: '2px 7px', borderRadius: 999 }}>Business+</span>
          </div>
        )}
      </Section>

      {/* ── Section 5b: Уведомления & Локализация ───────────────────────────── */}
      <Section title="Уведомления и язык">
        <Row
          icon="info"
          label="Уведомления"
          value="Настроить"
          onPress={() => setEditNotifications(true)}
        />
        <Row
          icon="info"
          label="Язык магазина"
          value={tenant.settings?.default_language === 'uz' ? "O'zbek" : tenant.settings?.default_language === 'en' ? 'English' : 'Русский'}
          onPress={() => setEditLocalization(true)}
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
      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Приветственное сообщение
      ══════════════════════════════════════════════════════════════════════ */}
      {editWelcomeMsg && (
        <BottomSheet onClose={() => setEditWelcomeMsg(false)}>
          <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
              Приветственное сообщение
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Отправляется покупателям при первом открытии бота
            </div>
            <textarea
              value={welcomeMsg}
              onChange={e => setWelcomeMsg(e.target.value)}
              placeholder={`Добро пожаловать в ${tenant.name}! Нажмите кнопку чтобы открыть магазин.`}
              rows={4}
              maxLength={500}
              style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{welcomeMsg.length}/500</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 12px', borderRadius: 10, background: 'var(--subtle)' }}>
              💡 Переменные: <code>{'{{name}}'}</code> — имя покупателя, <code>{'{{store_name}}'}</code> — название магазина
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditWelcomeMsg(false)} style={{ flex: 1, height: 46, borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                Отмена
              </button>
              <button
                onClick={() => {
                  updateSettingsMutation.mutate({ welcome_message: welcomeMsg || null })
                  setEditWelcomeMsg(false)
                }}
                disabled={updateSettingsMutation.isPending}
                style={{ flex: 2, height: 46, borderRadius: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: updateSettingsMutation.isPending ? 0.7 : 1 }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

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

      {/* ── Notifications modal ─────────────────────────────────────────────── */}
      {editNotifications && (
        <BottomSheet onClose={() => setEditNotifications(false)}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>
          <NotificationsSheet tenant={tenant} onClose={() => setEditNotifications(false)} />
        </BottomSheet>
      )}

      {/* ── Localization modal ──────────────────────────────────────────────── */}
      {editLocalization && (
        <BottomSheet onClose={() => setEditLocalization(false)}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>
          <LocalizationSheet tenant={tenant} onClose={() => setEditLocalization(false)} />
        </BottomSheet>
      )}

      {/* ── Blocks config modal ─────────────────────────────────────────────── */}
      {editBlocks && (
        <BottomSheet onClose={() => setEditBlocks(false)}>
          <div style={{ padding: '20px 16px 8px' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 4 }}>
              Блоки витрины
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Настройте видимость и стиль блоков</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

              {/* Stories */}
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>🎬 Stories</span>
                  <button onClick={() => setBlocksConfig(c => ({ ...c, stories_enabled: !c.stories_enabled }))} style={{ width: 44, height: 26, borderRadius: 999, background: blocksConfig.stories_enabled ? 'var(--accent)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 999, background: 'white', left: blocksConfig.stories_enabled ? 22 : 2, transition: 'left 0.2s' }} />
                  </button>
                </div>
                {blocksConfig.stories_enabled && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg)', display: 'flex', gap: 8 }}>
                    {(['instagram', 'tiktok', 'hidden'] as const).map(s => (
                      <button key={s} onClick={() => setBlocksConfig(c => ({ ...c, stories_style: s }))} style={{ flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1.5px solid', borderColor: blocksConfig.stories_style === s ? 'var(--accent)' : 'var(--border)', background: blocksConfig.stories_style === s ? 'var(--accent-soft)' : 'var(--card)', color: blocksConfig.stories_style === s ? 'var(--accent)' : 'var(--muted)' }}>
                        {s === 'instagram' ? 'Instagram' : s === 'tiktok' ? 'TikTok' : 'Скрыто'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Featured Banner */}
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'var(--card)', borderBottom: blocksConfig.featured_banner_enabled ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>🖼 Баннер</span>
                  <button onClick={() => setBlocksConfig(c => ({ ...c, featured_banner_enabled: !c.featured_banner_enabled }))} style={{ width: 44, height: 26, borderRadius: 999, background: blocksConfig.featured_banner_enabled ? 'var(--accent)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 999, background: 'white', left: blocksConfig.featured_banner_enabled ? 22 : 2, transition: 'left 0.2s' }} />
                  </button>
                </div>
                {blocksConfig.featured_banner_enabled && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Автопрокрутка</span>
                    <button onClick={() => setBlocksConfig(c => ({ ...c, featured_banner_autorotate: !c.featured_banner_autorotate }))} style={{ width: 44, height: 26, borderRadius: 999, background: blocksConfig.featured_banner_autorotate ? 'var(--accent)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                      <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 999, background: 'white', left: blocksConfig.featured_banner_autorotate ? 22 : 2, transition: 'left 0.2s' }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Categories */}
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'var(--card)', borderBottom: blocksConfig.categories_enabled ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>📂 Категории</span>
                  <button onClick={() => setBlocksConfig(c => ({ ...c, categories_enabled: !c.categories_enabled }))} style={{ width: 44, height: 26, borderRadius: 999, background: blocksConfig.categories_enabled ? 'var(--accent)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 999, background: 'white', left: blocksConfig.categories_enabled ? 22 : 2, transition: 'left 0.2s' }} />
                  </button>
                </div>
                {blocksConfig.categories_enabled && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['bento', 'burger', 'scrolling', 'tabs', 'grid'] as const).map(s => (
                      <button key={s} onClick={() => setBlocksConfig(c => ({ ...c, categories_style: s }))} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1.5px solid', borderColor: blocksConfig.categories_style === s ? 'var(--accent)' : 'var(--border)', background: blocksConfig.categories_style === s ? 'var(--accent-soft)' : 'var(--card)', color: blocksConfig.categories_style === s ? 'var(--accent)' : 'var(--muted)', textTransform: 'capitalize' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product card style */}
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>📦 Карточки товаров</span>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Стиль карточки</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {(['vertical', 'horizontal', 'image_only', 'compact'] as const).map(s => (
                      <button key={s} onClick={() => setBlocksConfig(c => ({ ...c, card_style: s }))} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1.5px solid', borderColor: blocksConfig.card_style === s ? 'var(--accent)' : 'var(--border)', background: blocksConfig.card_style === s ? 'var(--accent-soft)' : 'var(--card)', color: blocksConfig.card_style === s ? 'var(--accent)' : 'var(--muted)', textTransform: 'capitalize' }}>
                        {s === 'image_only' ? 'Только фото' : s === 'compact' ? 'Компактный' : s === 'horizontal' ? 'Горизонтальный' : 'Вертикальный'}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Колонки</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([1, 2] as const).map(n => (
                      <button key={n} onClick={() => setBlocksConfig(c => ({ ...c, card_columns: n }))} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: '1.5px solid', borderColor: blocksConfig.card_columns === n ? 'var(--accent)' : 'var(--border)', background: blocksConfig.card_columns === n ? 'var(--accent-soft)' : 'var(--card)', color: blocksConfig.card_columns === n ? 'var(--accent)' : 'var(--muted)' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* About block */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>ℹ️ О магазине</span>
                <button onClick={() => setBlocksConfig(c => ({ ...c, about_block_enabled: !c.about_block_enabled }))} style={{ width: 44, height: 26, borderRadius: 999, background: blocksConfig.about_block_enabled ? 'var(--accent)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 999, background: 'white', left: blocksConfig.about_block_enabled ? 22 : 2, transition: 'left 0.2s' }} />
                </button>
              </div>

              {/* Reviews */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>⭐ Отзывы</span>
                <button onClick={() => setBlocksConfig(c => ({ ...c, reviews_enabled: !c.reviews_enabled }))} style={{ width: 44, height: 26, borderRadius: 999, background: blocksConfig.reviews_enabled ? 'var(--accent)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 999, background: 'white', left: blocksConfig.reviews_enabled ? 22 : 2, transition: 'left 0.2s' }} />
                </button>
              </div>

              {/* Recently viewed */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>🕐 Недавно просмотренные</span>
                <button onClick={() => setBlocksConfig(c => ({ ...c, recently_viewed_enabled: !c.recently_viewed_enabled }))} style={{ width: 44, height: 26, borderRadius: 999, background: blocksConfig.recently_viewed_enabled ? 'var(--accent)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 999, background: 'white', left: blocksConfig.recently_viewed_enabled ? 22 : 2, transition: 'left 0.2s' }} />
                </button>
              </div>

            </div>
          </div>
          <div style={{ padding: '0 16px 32px' }}>
            <button
              onClick={() => blocksMutation.mutate(blocksConfig)}
              disabled={blocksMutation.isPending}
              style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', opacity: blocksMutation.isPending ? 0.7 : 1 }}
            >
              {blocksMutation.isPending ? 'Сохраняем...' : 'Сохранить блоки'}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
