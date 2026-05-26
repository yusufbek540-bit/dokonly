import { useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  currency: string
  onClose: () => void
  onProductsCreated: () => void
}

type Step = 'input' | 'processing' | 'review' | 'done'

export function ChannelImport({ currency, onClose, onProductsCreated }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [channelUrl, setChannelUrl] = useState('')
  const [products, setProducts] = useState<{ name: string; price: number; description: string; imageUrl?: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  void currency // available for future price formatting

  async function analyze() {
    const username = channelUrl.replace('https://t.me/', '').replace('@', '').trim()
    if (!username) { setError('Введите ссылку на канал'); return }
    setError(null)
    setStep('processing')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/v1/miniapp/ai-channel-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': (window as any).Telegram?.WebApp?.initData ?? '' },
        body: JSON.stringify({ channel_username: username }),
      })
      if (!res.ok) throw new Error('Не удалось получить посты из канала')
      const data = await res.json()
      setProducts(data.products ?? [])
      setStep('review')
    } catch (e: any) {
      setError(e.message ?? 'Ошибка')
      setStep('input')
    }
  }

  async function saveAll() {
    setSaving(true)
    let count = 0
    for (const p of products) {
      if (!p.name.trim()) continue
      await api.seller.createProduct({ name: p.name, price: p.price, description: p.description, is_active: true })
      count++
    }
    setSaving(false)
    setDoneCount(count)
    setStep('done')
    onProductsCreated()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', padding: 0 }}>
          ← Назад
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Импорт из канала</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {step === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                Вставьте ссылку на ваш Telegram-канал. AI проанализирует посты с товарами и предложит их добавить в каталог.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ссылка на канал
                </label>
                <input
                  type="text"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://t.me/your_channel"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ background: 'var(--accent-soft)', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>ℹ️ Как это работает</p>
              <ul style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                <li>AI читает последние посты канала</li>
                <li>Находит товары с ценами и описаниями</li>
                <li>Вы проверяете и редактируете перед сохранением</li>
              </ul>
            </div>

            <button
              onClick={analyze}
              disabled={!channelUrl.trim()}
              style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: channelUrl.trim() ? 'pointer' : 'not-allowed', opacity: channelUrl.trim() ? 1 : 0.5 }}
            >
              Анализировать канал
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>AI анализирует канал...</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Может занять до 30 секунд</p>
          </div>
        )}

        {step === 'review' && (
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              Найдено {products.length} товар{products.length > 1 ? (products.length < 5 ? 'а' : 'ов') : ''}
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Проверьте и отредактируйте данные перед сохранением</p>

            {products.map((p, i) => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <input
                      value={p.name}
                      onChange={(e) => setProducts(products.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      style={{ width: '100%', fontSize: 15, fontWeight: 600, color: 'var(--ink)', border: 'none', background: 'none', outline: 'none', marginBottom: 4 }}
                    />
                    <input
                      type="number"
                      value={p.price || ''}
                      onChange={(e) => setProducts(products.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))}
                      placeholder="Цена"
                      style={{ width: '100%', fontSize: 14, color: 'var(--accent)', fontWeight: 700, border: 'none', background: 'none', outline: 'none', marginBottom: 4 }}
                    />
                    <textarea
                      value={p.description}
                      onChange={(e) => setProducts(products.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                      rows={2}
                      style={{ width: '100%', fontSize: 13, color: 'var(--muted)', border: 'none', background: 'none', outline: 'none', resize: 'none' }}
                    />
                  </div>
                  <button
                    onClick={() => setProducts(products.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', padding: 4, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                <p style={{ fontSize: 15 }}>Нет товаров для импорта</p>
                <button onClick={() => setStep('input')} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer' }}>
                  ← Попробовать другой канал
                </button>
              </div>
            )}

            {products.length > 0 && (
              <button
                onClick={saveAll}
                disabled={saving}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1, marginTop: 8 }}
              >
                {saving ? 'Создаём...' : `Создать ${products.length} товар${products.length > 1 ? (products.length < 5 ? 'а' : 'ов') : ''}`}
              </button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>✅</span>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Готово!</p>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>Добавлено {doneCount} товар{doneCount !== 1 ? (doneCount < 5 ? 'а' : 'ов') : ''}</p>
            <button onClick={onClose} style={{ marginTop: 16, padding: '12px 32px', borderRadius: 14, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              В каталог
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
