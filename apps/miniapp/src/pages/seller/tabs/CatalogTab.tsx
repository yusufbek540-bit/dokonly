import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

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

function ProductForm({ mode, currency, onSave, onClose }: {
  mode: FormMode
  currency: string
  onSave: (data: any) => void
  onClose: () => void
}) {
  const p = mode.type === 'edit' ? mode.product : null
  const [name, setName] = useState(p?.name ?? '')
  const [price, setPrice] = useState(p?.price ?? '')
  const [compareAtPrice, setCompareAtPrice] = useState(p?.compare_at_price?.toString() ?? '')
  const [stock, setStock] = useState(p?.stock?.toString() ?? '')
  const [description, setDescription] = useState(p?.description ?? '')
  const [categoryId, setCategoryId] = useState<string>(p?.category_id ?? '')
  const [active, setActive] = useState(p?.is_active ?? true)
  const [featured, setFeatured] = useState(p?.is_featured ?? false)
  const [images, setImages] = useState<string[]>(p?.images ?? [])
  const [sizesStr, setSizesStr] = useState<string>((p?.sizes ?? []).join(', '))
  const [colorsStr, setColorsStr] = useState<string>((p?.colors ?? []).join(', '))
  const [videoUrl, setVideoUrl] = useState<string>(p?.video_url ?? '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['seller-categories'],
    queryFn: api.seller.categories,
  })

  const canSave = name.trim() && price

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
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {images.map((url, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={url} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                  <button
                    onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 999, background: 'var(--danger)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="x" size={10} color="white"/>
                  </button>
                </div>
              ))}
              {images.length < 5 && (
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
          {[
            { label: 'Название*', val: name, set: setName, placeholder: 'Название товара' },
            { label: 'Описание', val: description, set: setDescription, placeholder: 'Описание товара (необязательно)' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input
                value={f.val}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: '100%', height: 46, padding: '0 12px',
                  borderRadius: 12, background: 'var(--card)',
                  border: '1px solid var(--border)', outline: 'none',
                  fontSize: 14, color: 'var(--ink)',
                }}
              />
            </div>
          ))}
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
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 6 }}>Видео (URL)</label>
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              style={{ width: '100%', height: 46, padding: '0 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', outline: 'none', fontSize: 14, color: 'var(--ink)' }}
            />
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
          <button
            disabled={!canSave}
            onClick={() => {
              const sizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean)
              const colors = colorsStr.split(',').map(s => s.trim()).filter(Boolean)
              onSave({
                name, price: Number(price),
                compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
                stock: stock ? Number(stock) : null,
                description,
                category_id: categoryId || null,
                is_active: active, is_featured: featured, images,
                sizes, colors,
                video_url: videoUrl.trim() || null,
              })
            }}
            style={{
              width: '100%', height: 50, borderRadius: 14, marginTop: 4,
              background: canSave ? 'var(--accent)' : 'var(--subtle)',
              color: canSave ? 'white' : 'var(--muted)',
              fontWeight: 700, fontSize: 15,
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
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
                onClick={() => confirm(`Удалить "${cat.name}"?`) && deleteMutation.mutate(cat.id)}
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'out_of_stock' | 'featured'>('all')

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {visible.map((p: any) => (
              <div key={p.id} style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'var(--card)', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
              }}>
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
                  {p.is_featured && (
                    <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14, lineHeight: 1 }}>⭐</div>
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
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <button
                      onClick={() => setForm({ type: 'edit', product: p })}
                      style={{ flex: 1, height: 30, borderRadius: 8, background: 'var(--subtle)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => confirm('Удалить товар?') && deleteMutation.mutate(p.id)}
                      style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="x" size={13} color="var(--danger)"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                  onClick={() => {/* TODO: open plan picker */}}
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
        <button onClick={() => setForm({ type: 'new' })} style={{
          position: 'fixed', right: 20, bottom: 80,
          width: 52, height: 52, borderRadius: 999,
          background: 'var(--accent)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-md)', zIndex: 25,
        }}>
          <Icon name="plus" size={22}/>
        </button>
      )}

      {form && (
        <ProductForm
          mode={form}
          currency={tenant.currency}
          onSave={handleSave}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}
