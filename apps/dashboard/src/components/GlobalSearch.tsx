import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'

interface SearchResult {
  type: 'order' | 'product' | 'tenant'
  id: string
  title: string
  subtitle: string
  path: string
  icon: string
}

interface GlobalSearchProps {
  onClose: () => void
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const isPlatformAdmin = useAuth((state) => state.isPlatformAdmin)

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results: SearchResult[] = query.trim().length < 1
    ? []
    : [
        ...(orders as any[])
          .filter((o) =>
            o.id.toLowerCase().includes(query.toLowerCase()) ||
            (o.payment_method ?? '').toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5)
          .map((o) => ({
            type: 'order' as const,
            id: o.id,
            title: `Заказ #${(o.id || '').slice(0, 8).toUpperCase()}`,
            subtitle: `${Number(o.total).toLocaleString()} ${o.currency} · ${o.status}`,
            path: '/orders',
            icon: '🛒',
          })),
        ...(products as any[])
          .filter((p) =>
            (p.name ?? '').toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5)
          .map((p) => ({
            type: 'product' as const,
            id: p.id,
            title: p.name,
            subtitle: `${Number(p.price).toLocaleString()} · ${p.is_active ? 'Активен' : 'Неактивен'}`,
            path: '/products',
            icon: '📦',
          })),
      ]

  const quickLinks = [
    { icon: '🛒', label: 'Заказы', path: '/orders' },
    { icon: '📦', label: 'Товары', path: '/products' },
    { icon: '📊', label: 'Аналитика', path: '/' },
    ...(isPlatformAdmin ? [{ icon: '🏪', label: 'Магазины', path: '/platform/tenants' }] : []),
  ]

  const items = query.trim() ? results : []

  const go = useCallback((path: string) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[activeIdx]) go(items[activeIdx].path)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <span className="text-gray-400 text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Поиск заказов, товаров, клиентов..."
            className="flex-1 text-base outline-none placeholder-gray-400"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Results or quick links */}
        <div className="max-h-80 overflow-y-auto">
          {query.trim() ? (
            items.length > 0 ? (
              <div className="py-2">
                {items.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => go(r.path)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i === activeIdx ? 'bg-accent/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg w-7 flex-shrink-0">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
                    </div>
                    <span className="text-xs text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded capitalize flex-shrink-0">
                      {r.type === 'order' ? 'Заказ' : r.type === 'product' ? 'Товар' : 'Магазин'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm">Ничего не найдено по «{query}»</p>
              </div>
            )
          ) : (
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Быстрый переход</p>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((l) => (
                  <button
                    key={l.path}
                    onClick={() => go(l.path)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors"
                  >
                    <span className="text-lg">{l.icon}</span>
                    <span className="text-sm font-medium">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> навигация</span>
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↵</kbd> перейти</span>
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  )
}
