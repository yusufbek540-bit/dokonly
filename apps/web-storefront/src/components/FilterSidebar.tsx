'use client'

interface Category {
  id: string | null
  name: string
  count: number
}

interface FilterSidebarProps {
  categories: Category[]
  selectedCategory: string | null
  onCategoryChange: (id: string | null) => void
  minPrice?: number
  maxPrice?: number
  onPriceChange?: (min: number, max: number) => void
  inStockOnly?: boolean
  onInStockChange?: (v: boolean) => void
}

export function FilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  inStockOnly = false,
  onInStockChange,
}: FilterSidebarProps) {
  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Categories */}
        {categories.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Категории
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => onCategoryChange(null)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                    selectedCategory === null
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={selectedCategory === null ? { background: 'var(--accent)' } : {}}
                >
                  <span>Все товары</span>
                  <span className={`text-xs ${selectedCategory === null ? 'text-white/70' : 'text-gray-400'}`}>
                    {categories.reduce((s, c) => s + c.count, 0)}
                  </span>
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id ?? 'uncategorized'}>
                  <button
                    onClick={() => onCategoryChange(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    style={selectedCategory === cat.id ? { background: 'var(--accent)' } : {}}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-xs ${selectedCategory === cat.id ? 'text-white/70' : 'text-gray-400'}`}>
                      {cat.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* In stock filter */}
        {onInStockChange && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Наличие
            </h3>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => onInStockChange(!inStockOnly)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  inStockOnly ? '' : 'bg-gray-200'
                }`}
                style={inStockOnly ? { background: 'var(--accent)' } : {}}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    inStockOnly ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">Только в наличии</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  )
}
