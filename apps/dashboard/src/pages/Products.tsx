import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { api, type Product } from '@/lib/api'

type SortKey = 'name' | 'price' | 'stock' | 'created_at'
type SortDir = 'asc' | 'desc'
type ViewMode = 'table' | 'grid'

function fmt(n: number) { return Number(n).toLocaleString('ru-RU') }

function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function exportToCSV(products: Product[]) {
  const headers = ['ID', 'Название', 'Цена', 'Остаток', 'Активен']
  const rows = products.map((p) => [p.id, p.name, Number(p.price), p.stock ?? '', p.is_active ? 'Да' : 'Нет'])
  const csv = [headers, ...rows].map((r) => r.map(String).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'products.csv'; a.click()
  URL.revokeObjectURL(url)
}

interface InlineCellProps {
  value: string
  onSave: (v: string) => void
  type?: string
}

function InlineCell({ value, onSave, type = 'text' }: InlineCellProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const start = () => { setEditing(true); setVal(value); setTimeout(() => inputRef.current?.focus(), 50) }
  const save = () => { setEditing(false); if (val !== value) onSave(val) }
  const cancel = () => { setEditing(false); setVal(value) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
        className="w-full border border-accent rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    )
  }

  return (
    <span
      onDoubleClick={start}
      className="cursor-pointer hover:bg-accent/5 rounded px-1 py-0.5 -mx-1"
      title="Двойной клик — редактировать"
    >
      {value || '—'}
    </span>
  )
}

export function ProductsPage() {
  const qc = useQueryClient()
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
  })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<ViewMode>('table')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterMinPrice, setFilterMinPrice] = useState('')
  const [filterMaxPrice, setFilterMaxPrice] = useState('')
  const [filterInStock, setFilterInStock] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', description: '' })

  const create = useMutation({
    mutationFn: () =>
      api.createProduct({ name: form.name, price: Number(form.price), description: form.description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setAdding(false); setForm({ name: '', price: '', description: '' }) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const sortedFiltered = [...(products as Product[])]
    .filter((p) => {
      if (filterSearch && !p.name.toLowerCase().includes(filterSearch.toLowerCase())) return false
      if (filterActive === 'true' && !p.is_active) return false
      if (filterActive === 'false' && p.is_active) return false
      if (filterMinPrice && Number(p.price) < Number(filterMinPrice)) return false
      if (filterMaxPrice && Number(p.price) > Number(filterMaxPrice)) return false
      if (filterInStock && (p.stock === null || p.stock === 0)) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'ru')
      else if (sortKey === 'price') cmp = Number(a.price) - Number(b.price)
      else if (sortKey === 'stock') cmp = (a.stock ?? Infinity) - (b.stock ?? Infinity)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className={`ml-1 text-xs ${sortKey === k ? 'text-accent' : 'text-gray-300'}`}>
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  const allSelected = sortedFiltered.length > 0 && sortedFiltered.every((p) => selectedIds.has(p.id))
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(sortedFiltered.map((p) => p.id)))
  }
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkDelete = () => {
    if (!confirm(`Удалить ${selectedIds.size} товаров?`)) return
    selectedIds.forEach((id) => remove.mutate(id))
    setSelectedIds(new Set())
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">Товары</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'table' ? 'grid' : 'table')}
            className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
            title={view === 'table' ? 'Переключить в сетку' : 'Переключить в таблицу'}
          >
            {view === 'table' ? '⊞ Сетка' : '☰ Таблица'}
          </button>
          <button
            onClick={() => exportToCSV(sortedFiltered)}
            className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ↓ CSV
          </button>
          <button
            onClick={() => setAdding(true)}
            className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            + Добавить
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white border rounded-2xl p-4 mb-4 space-y-3">
          <input placeholder="Название" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Цена" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
          <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={create.isPending} className="bg-accent text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50">Сохранить</button>
            <button onClick={() => setAdding(false)} className="bg-gray-100 px-4 py-2 rounded-xl text-sm">Отмена</button>
          </div>
        </div>
      )}

      {/* Filter / search bar */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as any)} className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none">
          <option value="">Все статусы</option>
          <option value="true">Активные</option>
          <option value="false">Неактивные</option>
        </select>
        <button onClick={() => setShowFilters(!showFilters)} className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${showFilters ? 'bg-accent/10 text-accent border-accent/30' : 'hover:bg-gray-50'}`}>
          🎚 Фильтры
        </button>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l">
            <span className="text-sm font-medium text-accent">{selectedIds.size} выбрано</span>
            <button onClick={bulkDelete} disabled={remove.isPending} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50 transition-colors">Удалить</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Сбросить</button>
          </div>
        )}
        <span className="text-xs text-gray-400 ml-auto">{sortedFiltered.length} из {(products as Product[]).length}</span>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 mb-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Цена от</label>
            <input type="number" value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value)} placeholder="0" className="w-24 border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">до</label>
            <input type="number" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} placeholder="∞" className="w-24 border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={filterInStock} onChange={(e) => setFilterInStock(e.target.checked)} className="w-4 h-4 accent-accent" />
            Только в наличии
          </label>
          <button
            onClick={() => { setFilterMinPrice(''); setFilterMaxPrice(''); setFilterInStock(false); setFilterSearch(''); setFilterActive('') }}
            className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
          >
            Сбросить все
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center pt-12"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>
      ) : view === 'table' ? (
        /* Table view */
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-accent" />
                </th>
                <th className="px-2 py-3 w-12" />
                <th className="text-left px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleSort('name')}>
                  Название <SortIcon k="name" />
                </th>
                <th className="text-left px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleSort('price')}>
                  Цена <SortIcon k="price" />
                </th>
                <th className="text-left px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleSort('stock')}>
                  Остаток <SortIcon k="stock" />
                </th>
                <th className="text-left px-4 py-3">Активен</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Нет товаров</td></tr>
              ) : (
                sortedFiltered.map((p: Product) => (
                  <tr key={p.id} className={`border-b last:border-0 transition-colors ${selectedIds.has(p.id) ? 'bg-accent/5' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} className="w-4 h-4 accent-accent" />
                    </td>
                    <td className="px-2 py-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-lg">📦</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-xs">
                      <InlineCell
                        value={p.name}
                        onSave={() => {}}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <InlineCell
                        value={String(Number(p.price))}
                        type="number"
                        onSave={() => {}}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={p.stock !== null && p.stock > 0 ? '' : 'text-red-400'}>
                        {p.stock ?? '∞'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.is_active ? '✓ Да' : 'Нет'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { if (confirm('Удалить товар?')) remove.mutate(p.id) }}
                        disabled={remove.isPending}
                        className="text-red-400 hover:text-red-600 text-xs disabled:opacity-50 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedFiltered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400">Нет товаров</div>
          ) : (
            sortedFiltered.map((p: Product) => (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  selectedIds.has(p.id) ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => toggleOne(p.id)}
              >
                <div className="aspect-square bg-gray-50 relative">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">📦</div>
                  )}
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-accent"
                    />
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.is_active ? '✓' : '—'}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-sm font-semibold text-accent mt-0.5">{fmt(Number(p.price))} {p.currency}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Остаток: {p.stock ?? '∞'}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('Удалить?')) remove.mutate(p.id) }}
                    className="mt-2 w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
