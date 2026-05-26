import { useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'

interface Props {
  currency: string
  onClose: () => void
  onProductsCreated: () => void
}

type Step = 'upload' | 'mapping' | 'review' | 'importing' | 'done'

const FIELD_OPTIONS = [
  { value: 'name', label: 'Название *' },
  { value: 'price', label: 'Цена *' },
  { value: 'description', label: 'Описание' },
  { value: 'category', label: 'Категория' },
  { value: 'stock', label: 'Остаток' },
  { value: 'skip', label: 'Пропустить' },
]

const TEMPLATE_HEADERS = 'Название,Цена,Описание,Категория,Остаток на складе'

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  return lines.map(line => {
    const cols: string[] = []
    let inQuote = false, cur = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    return cols
  })
}

function guessMapping(header: string): string {
  const h = header.toLowerCase().trim()
  if (h.includes('назван') || h.includes('name') || h.includes('товар') || h.includes('title')) return 'name'
  if (h.includes('цен') || h.includes('price') || h.includes('стоим')) return 'price'
  if (h.includes('описан') || h.includes('desc')) return 'description'
  if (h.includes('катег') || h.includes('categ') || h.includes('раздел')) return 'category'
  if (h.includes('остат') || h.includes('stock') || h.includes('кол') || h.includes('qty') || h.includes('склад')) return 'stock'
  return 'skip'
}

interface ParsedProduct {
  name: string
  price: string
  description: string
  category: string
  stock: string
}

export function CSVImport({ currency, onClose, onProductsCreated }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<string[]>([])
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [importDone, setImportDone] = useState(0)
  const [importFailed, setImportFailed] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function fmtPrice(val: string) {
    const n = parseFloat(val.replace(/\s/g, '').replace(',', '.'))
    if (isNaN(n)) return val
    if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
    return n.toLocaleString() + ' ' + currency
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) return
      setRows(parsed)
      const headers = parsed[0]
      setMapping(headers.map(h => guessMapping(h)))
      setStep('mapping')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_HEADERS + '\n'], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function buildProducts() {
    const dataRows = rows.slice(1)
    const nameIdx = mapping.indexOf('name')
    const priceIdx = mapping.indexOf('price')
    const descIdx = mapping.indexOf('description')
    const catIdx = mapping.indexOf('category')
    const stockIdx = mapping.indexOf('stock')

    return dataRows
      .map(row => ({
        name: nameIdx >= 0 ? (row[nameIdx] ?? '') : '',
        price: priceIdx >= 0 ? (row[priceIdx] ?? '') : '',
        description: descIdx >= 0 ? (row[descIdx] ?? '') : '',
        category: catIdx >= 0 ? (row[catIdx] ?? '') : '',
        stock: stockIdx >= 0 ? (row[stockIdx] ?? '') : '',
      }))
      .filter(p => p.name.trim())
  }

  function proceedToReview() {
    const nameIdx = mapping.indexOf('name')
    const priceIdx = mapping.indexOf('price')
    if (nameIdx < 0 || priceIdx < 0) return
    setProducts(buildProducts())
    setStep('review')
  }

  function removeProduct(idx: number) {
    setProducts(prev => prev.filter((_, i) => i !== idx))
  }

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setEditName(products[idx].name)
    setEditPrice(products[idx].price)
  }

  function saveEdit(idx: number) {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, name: editName, price: editPrice } : p))
    setEditingIdx(null)
  }

  async function startImport() {
    setImportTotal(products.length)
    setImportProgress(0)
    setImportDone(0)
    setImportFailed(0)
    setStep('importing')

    let done = 0
    let failed = 0

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      try {
        await api.seller.createProduct({
          name: p.name,
          price: Number(p.price.replace(/\s/g, '').replace(',', '.')) || 0,
          description: p.description || undefined,
          category: p.category || undefined,
          stock: p.stock ? (Number(p.stock) || null) : null,
          is_active: true,
        })
        done++
      } catch {
        failed++
      }
      setImportProgress(i + 1)
      setImportDone(done)
      setImportFailed(failed)
    }

    setStep('done')
  }

  const canProceedMapping = mapping.indexOf('name') >= 0 && mapping.indexOf('price') >= 0

  const headers = rows[0] ?? []
  const previewRows = rows.slice(1, 4)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'var(--subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14L6 9l5-5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 17, color: 'var(--ink)', flex: 1 }}>
          Импорт CSV/Excel
        </span>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['upload', 'mapping', 'review', 'importing', 'done'] as Step[]).map((s, i) => (
            <div
              key={s}
              style={{
                width: 6, height: 6, borderRadius: 999,
                background: step === s ? 'var(--accent)' : (['upload', 'mapping', 'review', 'importing', 'done'].indexOf(step) > i ? 'var(--accent-soft)' : 'var(--border)'),
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 16px 40px' }}>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 20,
                padding: '48px 24px',
                textAlign: 'center',
                background: dragOver ? 'var(--accent-soft)' : 'var(--card)',
                transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ fontSize: 64, lineHeight: 1, color: 'var(--muted)' }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                Перетащите файл CSV или Excel
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                .csv, .xlsx — до 5 МБ
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: 8,
                  padding: '12px 28px',
                  borderRadius: 12,
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Выбрать файл
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={downloadTemplate}
                style={{
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'none',
                  textDecoration: 'underline',
                }}
              >
                Скачать шаблон
              </button>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Заголовки: Название, Цена, Описание, Категория, Остаток
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                Сопоставление колонок
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Укажите что означает каждая колонка
              </div>
            </div>

            {/* Mapping table */}
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {headers.map((header, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: 'var(--card)',
                  borderBottom: i < headers.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{header || `Колонка ${i + 1}`}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {previewRows.map(r => r[i] || '—').join(' · ')}
                    </div>
                  </div>
                  <select
                    value={mapping[i] ?? 'skip'}
                    onChange={e => setMapping(prev => {
                      const next = [...prev]
                      next[i] = e.target.value
                      return next
                    })}
                    style={{
                      height: 36, padding: '0 8px',
                      borderRadius: 8,
                      background: mapping[i] && mapping[i] !== 'skip' ? 'var(--accent-soft)' : 'var(--subtle)',
                      border: '1px solid var(--border)',
                      fontSize: 13,
                      color: mapping[i] && mapping[i] !== 'skip' ? 'var(--accent-ink)' : 'var(--muted)',
                      outline: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {FIELD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {!canProceedMapping && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--danger-soft)',
                fontSize: 13,
                color: 'var(--danger)',
                fontWeight: 500,
              }}>
                Необходимо сопоставить колонки «Название» и «Цена»
              </div>
            )}

            <button
              onClick={proceedToReview}
              disabled={!canProceedMapping}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: canProceedMapping ? 'var(--accent)' : 'var(--border)',
                color: canProceedMapping ? 'white' : 'var(--muted)',
                fontSize: 15, fontWeight: 700,
                transition: 'all 0.2s',
              }}
            >
              Продолжить ({rows.length - 1} строк)
            </button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                  {products.length} товаров к импорту
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  Проверьте и отредактируйте при необходимости
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: 14, background: 'var(--card)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  {editingIdx === idx ? (
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Название"
                        autoFocus
                        style={{
                          height: 40, padding: '0 10px', borderRadius: 8,
                          background: 'var(--subtle)', border: '1px solid var(--border)',
                          fontSize: 14, color: 'var(--ink)', outline: 'none', width: '100%',
                        }}
                      />
                      <input
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        placeholder="Цена"
                        type="text"
                        style={{
                          height: 40, padding: '0 10px', borderRadius: 8,
                          background: 'var(--subtle)', border: '1px solid var(--border)',
                          fontSize: 14, color: 'var(--ink)', outline: 'none', width: '100%',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => saveEdit(idx)}
                          style={{
                            flex: 1, height: 36, borderRadius: 8,
                            background: 'var(--accent)', color: 'white',
                            fontSize: 13, fontWeight: 700,
                          }}
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingIdx(null)}
                          style={{
                            flex: 1, height: 36, borderRadius: 8,
                            background: 'var(--subtle)', color: 'var(--muted)',
                            fontSize: 13, fontWeight: 600,
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }}
                      onClick={() => startEdit(idx)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {p.name || <span style={{ color: 'var(--danger)' }}>Без названия</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                            {fmtPrice(p.price)}
                          </span>
                          {p.category && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.category}</span>
                          )}
                          {p.stock && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Остаток: {p.stock}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removeProduct(idx) }}
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'var(--danger-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 1l10 10M11 1L1 11" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
                <div style={{ fontSize: 14 }}>Все товары удалены</div>
                <button
                  onClick={() => setStep('upload')}
                  style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginTop: 8, background: 'none' }}
                >
                  Загрузить новый файл
                </button>
              </div>
            )}

            {products.length > 0 && (
              <button
                onClick={startImport}
                style={{
                  width: '100%', height: 52, borderRadius: 14,
                  background: 'var(--accent)', color: 'white',
                  fontSize: 15, fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Импортировать {products.length} товаров
              </button>
            )}
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 40 }}>
            {/* Spinner */}
            <div style={{
              width: 64, height: 64, borderRadius: 999,
              border: '4px solid var(--accent-soft)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.8s linear infinite',
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                Импортируем товары…
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                Создано {importDone} из {importTotal}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'var(--subtle)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'var(--accent)',
                width: importTotal > 0 ? `${Math.round((importProgress / importTotal) * 100)}%` : '0%',
                transition: 'width 0.3s',
              }}/>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {importTotal > 0 ? `${Math.round((importProgress / importTotal) * 100)}%` : '0%'}
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 48, textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 999,
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40,
            }}>
              ✅
            </div>
            <div>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
                Импорт завершён!
              </div>
              <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: importFailed > 0 ? 6 : 0 }}>
                {importDone} товаров добавлено
              </div>
              {importFailed > 0 && (
                <div style={{ fontSize: 13, color: 'var(--danger)' }}>
                  + {importFailed} ошибок пропущено
                </div>
              )}
            </div>
            <button
              onClick={onProductsCreated}
              style={{
                marginTop: 16,
                width: '100%', maxWidth: 280,
                height: 52, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                fontSize: 16, fontWeight: 700,
              }}
            >
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
