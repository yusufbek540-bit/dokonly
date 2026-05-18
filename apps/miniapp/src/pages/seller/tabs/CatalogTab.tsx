import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'
import { useTelegramMainButton } from '@/hooks/useTelegram'
import { tgConfirm } from '@/lib/tgConfirm'
import { AIPhotoImport } from '../AIPhotoImport'
import { CSVImport } from '../CSVImport'
import { VoiceImport } from '../VoiceImport'
import { ChannelImport } from '../ChannelImport'
import { PlanPicker } from '../PlanPicker'

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

function tone(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % 8
}

interface Props { tenant: any }

type FormMode = { type: 'new' } | { type: 'edit'; product: any }

// Sphere → attribute keys shown in product form
const SPHERE_ATTRS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  fashion:     [{ key: 'brand', label: 'Бренд', placeholder: 'Nike, Zara…' }, { key: 'material', label: 'Материал', placeholder: 'Хлопок, Кожа…' }],
  clothing:    [{ key: 'brand', label: 'Бренд', placeholder: 'Nike, Zara…' }, { key: 'material', label: 'Материал', placeholder: 'Хлопок, Кожа…' }],
  shoes:       [{ key: 'brand', label: 'Бренд', placeholder: 'Adidas, Timberland…' }, { key: 'material', label: 'Материал', placeholder: 'Кожа, Текстиль…' }],
  electronics: [{ key: 'brand', label: 'Бренд', placeholder: 'Samsung, Apple…' }, { key: 'model', label: 'Модель', placeholder: 'Galaxy S24, iPhone 15…' }, { key: 'specifications', label: 'Характеристики', placeholder: 'RAM 8GB, 128GB…' }],
  tech:        [{ key: 'brand', label: 'Бренд', placeholder: 'Samsung, Apple…' }, { key: 'model', label: 'Модель', placeholder: 'Galaxy S24…' }, { key: 'specifications', label: 'Характеристики', placeholder: 'RAM 8GB, 128GB…' }],
  auto:        [{ key: 'brand', label: 'Марка', placeholder: 'BMW, Toyota…' }, { key: 'model', label: 'Модель', placeholder: 'X5, Camry…' }, { key: 'year', label: 'Год', placeholder: '2022' }],
  furniture:   [{ key: 'brand', label: 'Бренд', placeholder: 'IKEA, Hoff…' }, { key: 'material', label: 'Материал', placeholder: 'Дерево, МДФ…' }, { key: 'dimensions', label: 'Размеры', placeholder: '100×60×75 см' }],
}

function getSphereAttrs(category: string): { key: string; label: string; placeholder: string }[] {
  const cat = (category ?? '').toLowerCase()
  if (cat.includes('одежд') || cat.includes('cloth') || cat.includes('fashion')) return SPHERE_ATTRS.fashion
  if (cat.includes('обув') || cat.includes('shoe')) return SPHERE_ATTRS.shoes
  if (cat.includes('электрон') || cat.includes('electronic')) return SPHERE_ATTRS.electronics
  if (cat.includes('техник') || cat.includes('tech') || cat.includes('гаджет')) return SPHERE_ATTRS.tech
  if (cat.includes('авто') || cat.includes('auto')) return SPHERE_ATTRS.auto
  if (cat.includes('мебел') || cat.includes('furni')) return SPHERE_ATTRS.furniture
  return [{ key: 'brand', label: 'Бренд', placeholder: 'Название бренда' }]
}

function ProductForm({ mode, currency, sphere, onSave, onClose }: {
  mode: FormMode
  currency: string
  sphere?: string
  onSave: (data: any) => void
  onClose: () => void
}) {
  const p = mode.type === 'edit' ? mode.product : null
  const [name, setName] = useState(p?.name ?? '')
  const [price, setPrice] = useState(p?.price ?? '')
  const [compareAtPrice, setCompareAtPrice] = useState(p?.compare_at_price?.toString() ?? '')
  const [costPerItem, setCostPerItem] = useState(p?.cost_per_item?.toString() ?? '')
  const [stock, setStock] = useState(p?.stock?.toString() ?? '')
  const [description, setDescription] = useState(p?.description ?? '')
  const [categoryId, setCategoryId] = useState<string>(p?.category_id ?? '')
  const [active, setActive] = useState(p?.is_active ?? true)
  const [featured, setFeatured] = useState(p?.is_featured ?? false)
  const [images, setImages] = useState<string[]>(p?.images ?? [])
  const [sizesStr, setSizesStr] = useState<string>((p?.sizes ?? []).join(', '))
  const [colorsStr, setColorsStr] = useState<string>((p?.colors ?? []).join(', '))
  const [videoUrl, setVideoUrl] = useState<string>(p?.video_url ?? '')
  const [sku, setSku] = useState<string>(p?.sku ?? '')
  const [seoTitle, setSeoTitle] = useState<string>(p?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState<string>(p?.seo_description ?? '')
  const [trackInventory, setTrackInventory] = useState<boolean>(p?.track_inventory ?? true)
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(p?.low_stock_threshold?.toString() ?? '5')
  const [tagsStr, setTagsStr] = useState<string>((p?.tags ?? []).join(', '))
  const [attributes, setAttributes] = useState<Record<string, string>>(p?.attributes ?? {})
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [removingBgIdx, setRemovingBgIdx] = useState<number | null>(null)
  const [fillingFromPhoto, setFillingFromPhoto] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const sphereAttrs = getSphereAttrs(sphere ?? '')

  const { data: categories = [] } = useQuery({
    queryKey: ['seller-categories'],
    queryFn: api.seller.categories,
  })

  const canSave = name.trim() && price

  const handleSaveClick = () => {
    if (!canSave) return
    const sizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean)
    const colors = colorsStr.split(',').map(s => s.trim()).filter(Boolean)
    const filteredAttrs: Record<string, string> = {}
    for (const [k, v] of Object.entries(attributes)) {
      if (v.trim()) filteredAttrs[k] = v.trim()
    }
    onSave({
      name, price: Number(price),
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      cost_per_item: costPerItem ? Number(costPerItem) : null,
      stock: stock ? Number(stock) : null,
      description,
      category_id: categoryId || null,
      is_active: active, is_featured: featured, images,
      sizes, colors,
      video_url: videoUrl.trim() || null,
      sku: sku.trim() || null,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      track_inventory: trackInventory,
      low_stock_threshold: lowStockThreshold ? Number(lowStockThreshold) : null,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      attributes: Object.keys(filteredAttrs).length > 0 ? filteredAttrs : undefined,
    })
  }

  useTelegramMainButton({
    text: mode.type === 'edit' ? 'Сохранить товар' : 'Добавить товар',
    onClick: handleSaveClick,
    isVisible: true,
    disabled: !canSave,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--overlay)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%', background: 'var(--bg)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '90vh', overflow: 'auto',
        animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 0' }}>
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
            {mode.type === 'new' ? 'Новый товар' : 'Редактировать'}
          </span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Image upload section */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 8 }}>
              Фото товара
            </label>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
              {images.map((url, i) => (
                <div key={i} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, width: 80 }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <img
                      src={url}
                      onClick={() => setLightboxUrl(url)}
                      style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 10px 10px', display: 'block', cursor: 'zoom-in' }}
                    />
                    <button
                      onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 999, background: 'var(--danger)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="x" size={10} color="white"/>
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      if (removingBgIdx === i) return
                      setRemovingBgIdx(i)
                      try {
                        const res = await api.seller.removeBackground(url)
                        setImages(imgs => imgs.map((u, j) => j === i ? res.url : u))
                      } catch { /* silently fail */ }
                      finally { setRemovingBgIdx(null) }
                    }}
                    disabled={removingBgIdx === i}
                    style={{
                      width: 80, height: 26, borderRadius: 8,
                      background: 'var(--accent-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                      opacity: removingBgIdx === i ? 0.7 : 1,
                      cursor: removingBgIdx === i ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {removingBgIdx === i
                      ? <><div style={{ width: 10, height: 10, borderRadius: 999, border: '1.5px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/> Удаляю...</>
                      : <><Icon name="sparkles" size={12} color="var(--accent)"/> Убрать фон</>
                    }
                  </button>
                </div>
              ))}
              {images.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ width: 80, height: 80, borderRadius: 10, border: '1.5px dashed var(--border)', background: 'var(--subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}
                >
                  {uploading
                    ? <div style={{ width: 20, height: 20, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
                    : <>
                        <Icon name="plus" size={18} color="var(--muted)"/>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Фото</span>
                      </>
                  }
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                e.target.value = ''
                setUploading(true)
                try {
                  const result = await api.seller.uploadFile(file)
                  setImages(imgs => [...imgs, result.url])
                } catch (err) {
                  // silently fail or show inline error
                } finally {
                  setUploading(false)
                }
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)' }}>Название*</label>
              {images.length > 0 && (
                <button
                  type="button"
                  disabled={fillingFromPhoto}
                  onClick={async () => {
                    setFillingFromPhoto(true)
                    try {
                      const res = await api.seller.fillFromPhoto(images[0])
                      if (res.name) setName(res.name)
                      if (res.description) setDescription(res.description)
                      if (res.price) setPrice(String(res.price))
                    } catch { /* silently fail */ }
                    finally { setFillingFromPhoto(false) }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 8,
                    background: fillingFromPhoto ? 'var(--subtle)' : 'var(--accent-soft)',
                    fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                    opacity: fillingFromPhoto ? 0.6 : 1, cursor: fillingFromPhoto ? 'not-allowed' : 'pointer',
                  }}
                >
                  {fillingFromPhoto
                    ? <><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} /> Анализирую...</>
                    : <>🤖 AI из фото</>
                  }
                </button>
              )}
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Название товара"
              style={{
                width: '100%', height: 46, padding: '0 12px',
                borderRadius: 12, background: 'var(--card)',
                border: '1px solid var(--border)', outline: 'none',
                fontSize: 14, color: 'var(--ink)',
              }}
            />
          </div>
          {/* Description with AI */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)' }}>Описание</label>
              <button
                type="button"
                disabled={!name.trim() || generatingDesc}
                onClick={async () => {
                  if (!name.trim() || generatingDesc) return
                  setGeneratingDesc(true)
                  try {
                    const res = await api.seller.generateDescription(name, categoryId || undefined)
                    setDescription(res.description)
                  } catch {
                    // silently fail
                  } finally {
                    setGeneratingDesc(false)
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 8,
                  background: (!name.trim() || generatingDesc) ? 'var(--subtle)' : 'var(--accent-soft)',
                  border: 'none', cursor: (!name.trim() || generatingDesc) ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                  opacity: (!name.trim() || generatingDesc) ? 0.6 : 1,
                }}
              >
                {generatingDesc
                  ? <><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />  Генерирую...</>
                  : <>🤖 AI-описание</>
                }
              </button>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание товара (необязательно)"
              rows={3}
              style={{
                width: '100%', padding: '12px',
                borderRadius: 12, background: 'var(--card)',
                border: '1px solid var(--border)', outline: 'none',
                fontSize: 14, color: 'var(--ink)',
                resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Категория</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              style={{
                width: '100%', height: 46, padding: '0 12px',
                borderRadius: 12, background: 'var(--card)',
                border: '1px solid var(--border)', outline: 'none',
                fontSize: 14, color: categoryId ? 'var(--ink)' : 'var(--muted)',
                appearance: 'none', WebkitAppearance: 'none',
              }}
            >
              <option value="">Без категории</option>
              {(categories as any[]).map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Цена*</label>
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                type="number"
                style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Старая цена</label>
              <input
                value={compareAtPrice}
                onChange={e => setCompareAtPrice(e.target.value)}
                placeholder="0"
                type="number"
                style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Остаток</label>
              <input
                value={stock}
                onChange={e => setStock(e.target.value)}
                placeholder="∞"
                type="number"
                style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>
                Порог «мало»
              </label>
              <input
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(e.target.value)}
                placeholder="5"
                type="number"
                style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Уведомить при остатке</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Отслеживать остаток</span>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Блокировать заказы когда 0</div>
            </div>
            <button
              onClick={() => setTrackInventory(v => !v)}
              style={{
                width: 48, height: 28, borderRadius: 999,
                background: trackInventory ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 22, height: 22,
                borderRadius: 999, background: 'white',
                left: trackInventory ? 23 : 3, transition: 'left 0.2s',
              }}/>
            </button>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>
              Себестоимость
            </label>
            <input
              value={costPerItem}
              onChange={e => setCostPerItem(e.target.value)}
              placeholder="0"
              type="number"
              style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Скрыто от покупателей</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Размеры</label>
              <input
                value={sizesStr}
                onChange={e => setSizesStr(e.target.value)}
                placeholder="S, M, L, XL"
                style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Цвета</label>
              <input
                value={colorsStr}
                onChange={e => setColorsStr(e.target.value)}
                placeholder="Красный, Синий"
                style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Видео</label>
            {videoUrl ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <video
                  src={videoUrl}
                  controls
                  style={{ width: '100%', borderRadius: 12, maxHeight: 200, background: '#000', display: 'block' }}
                />
                <button
                  onClick={() => setVideoUrl('')}
                  style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 999, background: 'rgba(0,0,0,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="x" size={12} color="white"/>
                </button>
              </div>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
                style={{ width: '100%', height: 60, borderRadius: 12, border: '1.5px dashed var(--border)', background: 'var(--subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, color: 'var(--muted)', cursor: uploadingVideo ? 'not-allowed' : 'pointer' }}
              >
                {uploadingVideo
                  ? <><div style={{ width: 18, height: 18, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/> Загружаю...</>
                  : <><Icon name="video" size={18} color="var(--muted)"/> Загрузить видео</>
                }
              </button>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                e.target.value = ''
                setUploadingVideo(true)
                try {
                  const result = await api.seller.uploadFile(file)
                  setVideoUrl(result.url)
                } catch { /* silently fail */ }
                finally { setUploadingVideo(false) }
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>SKU / Артикул</label>
            <input
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="SKU-001"
              style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}
            />
          </div>
          {/* Attributes section (sphere-specific) */}
          {sphereAttrs.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Характеристики
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sphereAttrs.map(attr => (
                  <div key={attr.key}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>
                      {attr.label}
                    </label>
                    <input
                      value={attributes[attr.key] ?? ''}
                      onChange={e => setAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                      placeholder={attr.placeholder}
                      style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>SEO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Meta заголовок</label>
                <input
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  placeholder={name || 'Заголовок для поисковиков'}
                  style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{seoTitle.length}/60</div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Meta описание</label>
                <textarea
                  value={seoDescription}
                  onChange={e => setSeoDescription(e.target.value)}
                  placeholder="Краткое описание для поисковых систем"
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{seoDescription.length}/160</div>
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Теги</label>
            <input
              value={tagsStr}
              onChange={e => setTagsStr(e.target.value)}
              placeholder="новинка, скидка, хит"
              style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Через запятую, для фильтрации и поиска</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Активен</span>
            <button
              onClick={() => setActive((a: boolean) => !a)}
              style={{
                width: 48, height: 28, borderRadius: 999,
                background: active ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 22, height: 22,
                borderRadius: 999, background: 'white',
                left: active ? 23 : 3, transition: 'left 0.2s',
              }}/>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>⭐ Хит продаж</span>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Показывается в разделе «Хиты»</div>
            </div>
            <button
              onClick={() => setFeatured((f: boolean) => !f)}
              style={{
                width: 48, height: 28, borderRadius: 999,
                background: featured ? '#F59E0B' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 22, height: 22,
                borderRadius: 999, background: 'white',
                left: featured ? 23 : 3, transition: 'left 0.2s',
              }}/>
            </button>
          </div>
        </div>
      </div>
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={18} color="white"/>
          </button>
          <img
            src={lightboxUrl}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  )
}

function CategoriesView({ tenant }: { tenant: any }) {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['seller-categories'],
    queryFn: api.seller.categories,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => api.seller.createCategory({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-categories'] }); setNewName('') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.seller.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-categories'] }),
  })

  return (
    <div>
      {/* Add category input */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Название категории"
          onKeyDown={e => e.key === 'Enter' && newName.trim() && createMutation.mutate(newName.trim())}
          style={{ flex:1, height:44, padding:'0 12px', borderRadius:10, background:'var(--card)', border:'1px solid var(--border)', fontSize:14, color:'var(--ink)', outline:'none' }}
        />
        <button
          disabled={!newName.trim() || createMutation.isPending}
          onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
          style={{ width:44, height:44, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
        >
          <Icon name="plus" size={20} color="white"/>
        </button>
      </div>

      {/* Category list */}
      {isLoading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:24, height:24, borderRadius:999, border:'2px solid var(--accent)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:14 }}>Нет категорий</div>
          <div style={{ fontSize:12, marginTop:4 }}>Добавьте категорию выше</div>
        </div>
      ) : (
        <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid var(--border)' }}>
          {(categories as any[]).map((cat, i) => (
            <div key={cat.id} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'13px 16px', background:'var(--card)',
              borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ width:34, height:34, borderRadius:8, background:'var(--subtle)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>
                📋
              </div>
              <span style={{ flex:1, fontSize:14, fontWeight:500, color:'var(--ink)' }}>{cat.name}</span>
              <button
                onClick={() => tgConfirm(`Удалить "${cat.name}"?`, () => deleteMutation.mutate(cat.id))}
                style={{ width:32, height:32, borderRadius:8, background:'var(--danger-soft)', display:'flex', alignItems:'center', justifyContent:'center' }}
              >
                <Icon name="x" size={14} color="var(--danger)"/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CatalogTab({ tenant }: Props) {
  const qc = useQueryClient()
  const [view, setView] = useState<'products' | 'categories'>('products')
  const [form, setForm] = useState<FormMode | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showAIImport, setShowAIImport] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [showVoiceImport, setShowVoiceImport] = useState(false)
  const [showChannelImport, setShowChannelImport] = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'out_of_stock' | 'featured'>('all')
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: api.seller.products,
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.seller.createProduct(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-products'] }); setForm(null) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.seller.updateProduct(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-products'] }); setForm(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.seller.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-products'] }),
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, body }: { ids: string[]; body: object }) => {
      await Promise.all(ids.map(id => api.seller.updateProduct(id, body)))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      setSelected(new Set())
      setBulkMode(false)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => api.seller.deleteProduct(id)))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      setSelected(new Set())
      setBulkMode(false)
    },
  })

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visible = products.filter((p: any) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'active') return p.is_active !== false
    if (filter === 'inactive') return p.is_active === false
    if (filter === 'out_of_stock') return p.stock === 0
    if (filter === 'featured') return !!p.is_featured
    return true
  })

  const handleSave = (data: any) => {
    if (!form) return
    if (form.type === 'new') createMutation.mutate(data)
    else updateMutation.mutate({ id: form.product.id, body: data })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: 'var(--ink)', flex: 1 }}>Товары</div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {filter !== 'all' ? `${visible.length} / ` : ''}{products.length}
          </span>
          {view === 'products' && !bulkMode && (
            <button
              onClick={() => { setBulkMode(true); setSelected(new Set()) }}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', background: 'none', padding: '4px 8px', borderRadius: 8 }}
            >
              Выбрать
            </button>
          )}
          {view === 'products' && bulkMode && (
            <button
              onClick={() => { setBulkMode(false); setSelected(new Set()) }}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', background: 'none', padding: '4px 8px', borderRadius: 8 }}
            >
              Отмена
            </button>
          )}
        </div>
        {/* View toggle */}
        <div style={{ display:'flex', marginBottom:10, background:'var(--subtle)', borderRadius:10, padding:3 }}>
          {[
            { id:'products', label:'Товары' },
            { id:'categories', label:'Категории' },
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id as any)} style={{
              flex:1, height:34, borderRadius:8, fontSize:13, fontWeight:600,
              background: view === v.id ? 'var(--card)' : 'transparent',
              color: view === v.id ? 'var(--ink)' : 'var(--muted)',
              boxShadow: view === v.id ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {view === 'products' && (
          <>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={16} color="var(--muted)" style={{ position: 'absolute', left: 12, top: 14 }}/>
              <input
                placeholder="Поиск"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', height: 44, paddingLeft: 38, paddingRight: 12,
                  borderRadius: 10, background: 'var(--subtle)',
                  border: 'none', outline: 'none',
                  fontSize: 14, color: 'var(--ink)',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingTop: 10, paddingBottom: 2, marginLeft: -16, marginRight: -16, paddingLeft: 16 }}>
              {[
                { id: 'all', label: 'Все' },
                { id: 'active', label: 'Активные' },
                { id: 'inactive', label: 'Скрытые' },
                { id: 'featured', label: '⭐ Хиты' },
                { id: 'out_of_stock', label: 'Нет в наличии' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id as any)} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                  background: filter === f.id ? 'var(--accent)' : 'var(--subtle)',
                  color: filter === f.id ? 'white' : 'var(--muted-strong)',
                  fontSize: 13, fontWeight: filter === f.id ? 700 : 500,
                  border: 'none', whiteSpace: 'nowrap',
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '0 16px 100px' }}>
        {view === 'categories' ? (
          <CategoriesView tenant={tenant}/>
        ) : isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 8 }}>
              {search ? 'Ничего не найдено' : 'Нет товаров'}
            </div>
            {!search && (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Добавьте первый товар, чтобы начать продавать
              </div>
            )}
          </div>
        ) : (
          <>
          {/* Bulk action bar */}
          {bulkMode && selected.size > 0 && (
            <div style={{
              position: 'sticky', top: 0, zIndex: 10, marginBottom: 10,
              padding: '10px 12px', borderRadius: 14,
              background: 'var(--accent)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white', flex: 1 }}>
                {selected.size} выбрано
              </span>
              <button
                onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selected), body: { is_active: true } })}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 12, fontWeight: 600 }}
              >
                ✓ Активировать
              </button>
              <button
                onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selected), body: { is_active: false } })}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 12, fontWeight: 600 }}
              >
                👁 Скрыть
              </button>
              <button
                onClick={() => tgConfirm(`Удалить ${selected.size} товаров?`, () => bulkDeleteMutation.mutate(Array.from(selected)))}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.4)', color: 'white', fontSize: 12, fontWeight: 600 }}
              >
                🗑 Удалить
              </button>
            </div>
          )}
          {bulkMode && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <button
                onClick={() => setSelected(new Set(visible.map((p: any) => p.id)))}
                style={{ fontSize: 13, color: 'var(--accent)', background: 'none', fontWeight: 600 }}
              >
                Выбрать все ({visible.length})
              </button>
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  style={{ fontSize: 13, color: 'var(--muted)', background: 'none' }}
                >
                  Снять выбор
                </button>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {visible.map((p: any) => (
              <div key={p.id} style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'var(--card)', border: `1px solid ${bulkMode && selected.has(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', flexDirection: 'column',
                position: 'relative',
                opacity: bulkMode && selected.size > 0 && !selected.has(p.id) ? 0.7 : 1,
              }}
              onClick={bulkMode ? () => toggleSelect(p.id) : undefined}
              >
                {/* Product image - square top section */}
                <div style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden', background: 'var(--subtle)' }}>
                  {p.images?.[0]
                    ? <img src={p.images[0]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div className="img-ph" data-tone={tone(p.name)} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                        <span style={{ padding: 4, textAlign: 'center', lineHeight: 1.3 }}>{p.name.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                  }
                  {/* Inactive badge */}
                  {!p.is_active && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>
                      Скрыт
                    </div>
                  )}
                  {/* Out of stock badge */}
                  {p.stock === 0 && p.is_active && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>
                      Нет
                    </div>
                  )}
                  {/* Featured badge */}
                  {p.is_featured && !bulkMode && (
                    <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14, lineHeight: 1 }}>⭐</div>
                  )}
                  {/* Bulk select indicator */}
                  {bulkMode && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 24, height: 24, borderRadius: 999,
                      background: selected.has(p.id) ? 'var(--accent)' : 'rgba(255,255,255,0.8)',
                      border: `2px solid ${selected.has(p.id) ? 'var(--accent)' : 'rgba(0,0,0,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected.has(p.id) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                {/* Product info bottom section */}
                <div style={{ padding: '10px 10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {p.category && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {p.category}
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.name}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                    {fmtPrice(Number(p.price), tenant.currency)}
                  </div>
                  {p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5 && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#D97706' }}>
                      ⚠ Осталось {p.stock} шт
                    </div>
                  )}
                  {!bulkMode && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button
                        onClick={() => setForm({ type: 'edit', product: p })}
                        style={{ flex: 1, height: 30, borderRadius: 8, background: 'var(--subtle)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => tgConfirm('Удалить товар?', () => deleteMutation.mutate(p.id))}
                        style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Icon name="x" size={13} color="var(--danger)"/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Plan limit indicator */}
      {view === 'products' && products.length > 0 && (() => {
        const tier = tenant.tier ?? 'start'
        const limit = tier === 'start' || tier === 'trial' ? 250 : null
        if (!limit) return null
        const pct = Math.min(100, (products.length / limit) * 100)
        const nearLimit = products.length >= limit * 0.9
        return (
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: nearLimit ? 'var(--danger)' : 'var(--muted)' }}>
                {products.length} / {limit} товаров на тарифе Старт
              </span>
              {nearLimit && (
                <button
                  onClick={() => setShowPlanPicker(true)}
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'none', padding: 0 }}
                >
                  Upgrade →
                </button>
              )}
            </div>
            <div style={{ height: 3, borderRadius: 999, background: 'var(--subtle)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: 999,
                background: nearLimit ? 'var(--danger)' : 'var(--accent)',
                transition: 'width 0.3s',
              }}/>
            </div>
          </div>
        )
      })()}

      {/* FAB — only show on products view */}
      {view === 'products' && (
        <button onClick={() => setShowAddSheet(true)} style={{
          position: 'fixed', right: 20, bottom: 80,
          width: 52, height: 52, borderRadius: 999,
          background: 'var(--accent)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-md)', zIndex: 25,
        }}>
          <Icon name="plus" size={22}/>
        </button>
      )}

      {/* Add product options sheet */}
      {showAddSheet && (
        <div
          onClick={() => setShowAddSheet(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '20px 16px calc(28px + env(safe-area-inset-bottom))' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }}/>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 16 }}>
              Добавить товар
            </div>
            {([
              { emoji: '✏️', label: 'Добавить вручную', desc: 'Заполните карточку товара', action: (() => { setShowAddSheet(false); setForm({ type: 'new' }) }) as (() => void) | null },
              { emoji: '📸', label: 'AI из фото', desc: 'Загрузите фото — AI заполнит описание', action: (() => { setShowAddSheet(false); setShowAIImport(true) }) as (() => void) | null, soon: false },
              { emoji: '🎙', label: 'AI голосом', desc: 'Опишите товар голосом', action: (() => { setShowAddSheet(false); setShowVoiceImport(true) }) as (() => void) | null, soon: false },
              { emoji: '📢', label: 'Импорт из канала', desc: 'Загрузить посты из Telegram', action: (() => { setShowAddSheet(false); setShowChannelImport(true) }) as (() => void) | null, soon: false },
              { emoji: '📄', label: 'Импорт CSV', desc: 'Загрузить таблицу Excel/CSV', action: (() => { setShowAddSheet(false); setShowCSVImport(true) }) as (() => void) | null, soon: false },
            ] as { emoji: string; label: string; desc: string; action: (() => void) | null; soon?: boolean }[]).map(opt => (
              <button
                key={opt.label}
                onClick={opt.action ?? undefined}
                disabled={!opt.action}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 14, marginBottom: 8,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  cursor: opt.action ? 'pointer' : 'default',
                  opacity: opt.action ? 1 : 0.6,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{opt.desc}</div>
                </div>
                {opt.soon && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 999, padding: '2px 8px' }}>
                    Скоро
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {form && (
        <ProductForm
          mode={form}
          currency={tenant.currency}
          sphere={tenant.category ?? ''}
          onSave={handleSave}
          onClose={() => setForm(null)}
        />
      )}

      {showAIImport && (
        <AIPhotoImport
          currency={tenant.currency}
          onClose={() => setShowAIImport(false)}
          onProductsCreated={() => {
            qc.invalidateQueries({ queryKey: ['seller-products'] })
            setShowAIImport(false)
          }}
        />
      )}

      {showCSVImport && (
        <CSVImport
          currency={tenant.currency}
          onClose={() => setShowCSVImport(false)}
          onProductsCreated={() => {
            qc.invalidateQueries({ queryKey: ['seller-products'] })
            setShowCSVImport(false)
          }}
        />
      )}

      {showVoiceImport && (
        <VoiceImport
          currency={tenant.currency}
          onClose={() => setShowVoiceImport(false)}
          onProductCreated={() => { qc.invalidateQueries({ queryKey: ['seller-products'] }); setShowVoiceImport(false) }}
        />
      )}
      {showChannelImport && (
        <ChannelImport
          currency={tenant.currency}
          onClose={() => setShowChannelImport(false)}
          onProductsCreated={() => { qc.invalidateQueries({ queryKey: ['seller-products'] }); setShowChannelImport(false) }}
        />
      )}

      {showPlanPicker && <PlanPicker onBack={() => setShowPlanPicker(false)} />}
    </div>
  )
}
