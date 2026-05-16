import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface ExtractedProduct {
  name: string
  description: string
  price: number
  category: string
  images: string[]
}

interface Props {
  currency: string
  onClose: () => void
  onProductsCreated: () => void
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function ReviewCard({
  product,
  index,
  currency,
  onChange,
  onRemove,
}: {
  product: ExtractedProduct
  index: number
  currency: string
  onChange: (idx: number, field: keyof ExtractedProduct, value: string | number) => void
  onRemove: (idx: number) => void
}) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    }}>
      {product.images[0] && (
        <img
          src={product.images[0]}
          alt={product.name}
          style={{ width: '100%', height: 140, objectFit: 'cover' }}
        />
      )}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 999,
            background: 'var(--accent)', color: 'white',
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <button
            onClick={() => onRemove(index)}
            style={{ marginLeft: 'auto', fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
          >
            Удалить
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Название</div>
          <input
            value={product.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
            style={{
              width: '100%', border: '1px solid var(--border)', borderRadius: 10,
              padding: '8px 10px', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
              background: 'var(--bg)', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Цена</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={product.price}
              onChange={(e) => onChange(index, 'price', Number(e.target.value))}
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 10,
                padding: '8px 10px', fontSize: 14, fontFamily: 'JetBrains Mono', color: 'var(--ink)',
                background: 'var(--bg)', outline: 'none',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{currency}</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Описание</div>
          <textarea
            value={product.description}
            onChange={(e) => onChange(index, 'description', e.target.value)}
            rows={2}
            style={{
              width: '100%', border: '1px solid var(--border)', borderRadius: 10,
              padding: '8px 10px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5,
              background: 'var(--bg)', outline: 'none', resize: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function AIPhotoImport({ currency, onClose, onProductsCreated }: Props) {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'creating'>('upload')
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [importId, setImportId] = useState<string | null>(null)
  const [products, setProducts] = useState<ExtractedProduct[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useMutation({
    mutationFn: api.seller.uploadFile,
  })

  const startImport = useMutation({
    mutationFn: api.seller.startAiPhotoImport,
    onSuccess: (data) => {
      setImportId(data.id)
      setStep('processing')
    },
  })

  const { data: importStatus } = useQuery({
    queryKey: ['ai-import', importId],
    queryFn: () => api.seller.getAiImport(importId!),
    enabled: !!importId && step === 'processing',
    refetchInterval: (query) => {
      const d = query.state.data
      if (!d || d.status === 'pending' || d.status === 'processing') return 2000
      return false
    },
  })

  useEffect(() => {
    if (importStatus?.status === 'done') {
      setProducts(importStatus.products ?? [])
      setStep('review')
    }
  }, [importStatus?.status])

  const createProducts = useMutation({
    mutationFn: async () => {
      for (const p of products) {
        await api.seller.createProduct({
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          images: p.images,
          is_active: true,
        })
      }
    },
    onSuccess: () => {
      onProductsCreated()
      onClose()
    },
  })

  const handleFiles = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 50)
    if (imageFiles.length === 0) return

    setSelectedCount(imageFiles.length)
    setUploading(true)
    const urls: string[] = []
    for (const file of imageFiles) {
      try {
        const result = await uploadFile.mutateAsync(file)
        urls.push(result.url)
      } catch {
        // skip failed uploads
      }
    }
    setUploadedUrls(urls)
    setUploading(false)
  }, [uploadFile])

  function updateProduct(idx: number, field: keyof ExtractedProduct, value: string | number) {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  function removeProduct(idx: number) {
    setProducts(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 14, padding: '4px 0', fontWeight: 600 }}
        >
          ← Назад
        </button>
        <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
          AI из фото
        </div>
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: 16 }}>
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📸</div>
            <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
              Загрузите фотографии
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
              ИИ автоматически распознает товары, заполнит названия, описания и цены. Загрузите до 50 фото.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            {!uploading && uploadedUrls.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '16px 32px', borderRadius: 16,
                  background: 'var(--accent)', border: 'none',
                  fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'white',
                  cursor: 'pointer', width: '100%', maxWidth: 300,
                }}
              >
                Выбрать фотографии
              </button>
            )}

            {uploading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 999,
                  border: '3px solid var(--accent)', borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                }}/>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: 14, color: 'var(--muted)' }}>Загружаем фотографии...</p>
              </div>
            )}

            {!uploading && uploadedUrls.length > 0 && (
              <div style={{ width: '100%', maxWidth: 340 }}>
                <div style={{
                  padding: 16, borderRadius: 16,
                  background: 'rgba(0,179,131,0.08)', border: '1.5px solid rgba(0,179,131,0.3)',
                  marginBottom: 20, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>
                    {uploadedUrls.length} фото готово
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Из {selectedCount} выбранных успешно загружено {uploadedUrls.length}
                  </div>
                </div>

                <button
                  onClick={() => startImport.mutate(uploadedUrls)}
                  disabled={startImport.isPending}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 14,
                    background: 'var(--accent)', border: 'none',
                    fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'white',
                    cursor: 'pointer', marginBottom: 10,
                    opacity: startImport.isPending ? 0.7 : 1,
                  }}
                >
                  {startImport.isPending ? 'Запускаем...' : `Анализировать ${uploadedUrls.length} фото →`}
                </button>
                <button
                  onClick={() => { setUploadedUrls([]); setSelectedCount(0); fileInputRef.current?.click() }}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 14,
                    background: 'var(--subtle)', border: '1px solid var(--border)',
                    fontSize: 14, color: 'var(--muted)', cursor: 'pointer',
                  }}
                >
                  Выбрать другие фото
                </button>
              </div>
            )}

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
              {['ИИ распознаёт название, цену и описание', 'Вы проверяете и редактируете перед созданием', 'Все товары добавляются за один клик'].map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 999,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                  }}>{i + 1}</div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 999,
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, fontSize: 36,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              🤖
            </div>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }`}</style>
            <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
              ИИ анализирует фотографии
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8, maxWidth: 280 }}>
              Это может занять 30–60 секунд. Мы распознаём товары и заполняем карточки автоматически.
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {importStatus?.status === 'processing' ? 'Обрабатываем...' : 'В очереди...'}
            </p>
          </div>
        )}

        {step === 'review' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>
                Проверьте товары
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                ИИ нашёл {products.length} товаров. Проверьте и отредактируйте перед добавлением.
              </p>
            </div>

            {products.map((p, i) => (
              <ReviewCard
                key={i}
                product={p}
                index={i}
                currency={currency}
                onChange={updateProduct}
                onRemove={removeProduct}
              />
            ))}

            {products.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
                <p style={{ fontSize: 14 }}>Все товары удалены</p>
              </div>
            )}
          </div>
        )}

        {step === 'creating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 999,
              border: '4px solid var(--accent)', borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite', marginBottom: 20,
            }}/>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Создаём товары...</p>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {step === 'review' && products.length > 0 && (
        <div style={{
          padding: '12px 16px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: 'var(--bg)', borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={() => { setStep('creating'); createProducts.mutate() }}
            disabled={createProducts.isPending}
            style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: 'var(--accent)', border: 'none',
              fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: 'white',
              cursor: 'pointer',
              opacity: createProducts.isPending ? 0.7 : 1,
            }}
          >
            Создать {products.length} {products.length === 1 ? 'товар' : products.length < 5 ? 'товара' : 'товаров'}
          </button>
        </div>
      )}
    </div>
  )
}
