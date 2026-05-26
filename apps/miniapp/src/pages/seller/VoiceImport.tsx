import { useState, useRef } from 'react'
import { api } from '@/lib/api'

interface Props {
  currency: string
  onClose: () => void
  onProductCreated: () => void
}

type Step = 'record' | 'processing' | 'review' | 'done'

export function VoiceImport({ currency, onClose, onProductCreated }: Props) {
  const [step, setStep] = useState<Step>('record')
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [products, setProducts] = useState<{ name: string; price: number; description: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function fmtPrice(n: number) {
    return currency === 'UZS' ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум' : n.toLocaleString() + ' ' + currency
  }
  void fmtPrice // used in review step indirectly

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setError('Нет доступа к микрофону')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function processAudio() {
    if (!audioUrl) return
    setStep('processing')
    setError(null)
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
      const { url } = await api.seller.uploadFile(file)
      // Call AI voice import endpoint
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/v1/miniapp/ai-voice-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': (window as any).Telegram?.WebApp?.initData ?? '' },
        body: JSON.stringify({ audio_url: url }),
      })
      if (!res.ok) throw new Error('AI не смог распознать голос')
      const data = await res.json()
      setProducts(data.products ?? [{ name: '', price: 0, description: '' }])
      setStep('review')
    } catch (e: any) {
      setError(e.message ?? 'Ошибка обработки')
      setStep('record')
    }
  }

  async function saveProducts() {
    setSaving(true)
    for (const p of products) {
      if (!p.name.trim()) continue
      await api.seller.createProduct({ name: p.name, price: p.price, description: p.description, is_active: true })
    }
    setSaving(false)
    setStep('done')
    onProductCreated()
  }

  const fmtSecs = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', padding: 0 }}>
          ← Назад
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>AI голосовой импорт</span>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        {error && (
          <div style={{ width: '100%', background: 'var(--danger)', color: '#fff', borderRadius: 12, padding: '10px 14px', fontSize: 13 }}>{error}</div>
        )}

        {step === 'record' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎙</div>
              <p style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600, marginBottom: 4 }}>
                {recording ? 'Запись...' : 'Нажмите и опишите товар'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                {recording ? fmtSecs(seconds) : 'Назовите название, цену, описание'}
              </p>
            </div>

            {/* Record button */}
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: 88, height: 88, borderRadius: '50%',
                background: recording ? 'var(--danger)' : 'var(--accent)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recording ? '0 0 0 8px rgba(255,59,48,0.2)' : '0 4px 20px rgba(0,0,0,0.12)',
                transition: 'all 0.2s',
              }}
            >
              {recording
                ? <span style={{ width: 24, height: 24, background: '#fff', borderRadius: 4 }} />
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
              }
            </button>

            {audioUrl && !recording && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                <audio src={audioUrl} controls style={{ width: '100%', borderRadius: 8 }} />
                <button
                  onClick={processAudio}
                  style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                >
                  Отправить в AI →
                </button>
                <button onClick={() => { setAudioUrl(null); chunksRef.current = []; setSeconds(0) }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>
                  Записать заново
                </button>
              </div>
            )}
          </>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>AI распознаёт запись...</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Обычно занимает 5–15 секунд</p>
          </div>
        )}

        {step === 'review' && (
          <div style={{ width: '100%' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Проверьте данные</p>
            {products.map((p, i) => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 14, marginBottom: 10 }}>
                <input
                  value={p.name}
                  onChange={(e) => setProducts(products.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Название"
                  style={{ width: '100%', fontSize: 15, fontWeight: 600, color: 'var(--ink)', border: 'none', background: 'none', outline: 'none', marginBottom: 6 }}
                />
                <input
                  type="number"
                  value={p.price || ''}
                  onChange={(e) => setProducts(products.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))}
                  placeholder="Цена"
                  style={{ width: '100%', fontSize: 14, color: 'var(--muted)', border: 'none', background: 'none', outline: 'none', marginBottom: 4 }}
                />
                <textarea
                  value={p.description}
                  onChange={(e) => setProducts(products.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                  placeholder="Описание"
                  rows={2}
                  style={{ width: '100%', fontSize: 13, color: 'var(--muted)', border: 'none', background: 'none', outline: 'none', resize: 'none' }}
                />
              </div>
            ))}
            <button
              onClick={saveProducts}
              disabled={saving}
              style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1, marginTop: 8 }}
            >
              {saving ? 'Создаём...' : `Создать ${products.length} товар${products.length > 1 ? (products.length < 5 ? 'а' : 'ов') : ''}`}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Товары добавлены!</p>
            <button onClick={onClose} style={{ marginTop: 16, padding: '12px 32px', borderRadius: 14, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
