import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Order } from '@/lib/api'

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'new', label: 'Новые', color: 'bg-gray-100 text-gray-700' },
  { key: 'confirmed', label: 'Подтверждены', color: 'bg-blue-100 text-blue-700' },
  { key: 'packing', label: 'Сборка', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'shipped', label: 'Отправлены', color: 'bg-orange-100 text-orange-700' },
  { key: 'delivered', label: 'Доставлены', color: 'bg-green-100 text-green-700' },
]

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['confirmed'],
  confirmed: ['packing', 'new'],
  packing: ['shipped', 'confirmed'],
  shipped: ['delivered', 'packing'],
  delivered: ['shipped'],
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} мин`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч`
  return `${Math.floor(hrs / 24)} д`
}

interface SidePanelProps {
  order: Order
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
  isPending: boolean
}

function OrderSidePanel({ order, onClose, onStatusChange, isPending }: SidePanelProps) {
  const nexts = STATUS_TRANSITIONS[order.status] ?? []
  const col = COLUMNS.find((c) => c.key === order.status)

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/20" />
      <div
        className="relative bg-white w-96 h-full shadow-2xl flex flex-col z-50 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <p className="font-mono text-xs text-gray-400">#{(order.id || '').slice(0, 8).toUpperCase()}</p>
            <p className="font-bold text-lg">{fmt(Number(order.total))} {order.currency}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          <div>
            <p className="text-xs text-gray-400 mb-1">Статус</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${col?.color}`}>
              {col?.label ?? order.status}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Способ оплаты</p>
            <p className="text-sm font-medium">{order.payment_method}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Статус оплаты</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {order.payment_status === 'paid' ? '✓ Оплачено' : '⏳ Ожидает'}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Создан</p>
            <p className="text-sm">{new Date(order.created_at).toLocaleString('ru-RU')}</p>
          </div>

          {nexts.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-gray-400 mb-2">Перевести в статус</p>
              {nexts.map((next) => {
                const nextCol = COLUMNS.find((c) => c.key === next)
                return (
                  <button
                    key={next}
                    onClick={() => onStatusChange(order.id, next)}
                    disabled={isPending}
                    className="w-full text-sm bg-accent text-white rounded-lg py-2.5 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  >
                    → {nextCol?.label ?? next}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface OrderCardProps {
  order: Order
  isSelected: boolean
  isDragging: boolean
  onSelect: (id: string, e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onClick: (order: Order) => void
}

function OrderCard({ order, isSelected, isDragging, onSelect, onDragStart, onDragEnd, onClick }: OrderCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order.id)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if (e.shiftKey) { onSelect(order.id, e); return }
        onClick(order)
      }}
      className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer select-none transition-all ${
        isSelected ? 'ring-2 ring-accent border-accent' : 'hover:shadow-md hover:border-gray-300'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-gray-400">#{(order.id || '').slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold mt-0.5 truncate">{fmt(Number(order.total))} {order.currency}</p>
          <p className="text-xs text-gray-400 mt-0.5">{order.payment_method}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {order.payment_status === 'paid' ? '✓' : '⏳'}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
        </div>
      </div>
      {isSelected && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent flex items-center justify-center">
            <span className="text-white text-xs leading-none">✓</span>
          </div>
          <span className="text-xs text-accent font-medium">Выбран</span>
        </div>
      )}
    </div>
  )
}

export function OrdersPage() {
  const qc = useQueryClient()
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
  })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [panelOrder, setPanelOrder] = useState<Order | null>(null)
  const [filterPayment, setFilterPayment] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const lastSelectedRef = useRef<string | null>(null)

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      setSelectedIds(new Set())
    },
  })

  const handleSelect = useCallback((id: string, e: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    lastSelectedRef.current = id
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('orderId', id)
    setDragId(id)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('orderId')
    if (!id) return
    const order = (orders as Order[]).find((o) => o.id === id)
    if (!order || order.status === colKey) return
    advanceMutation.mutate({ id, status: colKey })
    setDragOverCol(null)
    setDragId(null)
  }, [orders, advanceMutation])

  const handleBulkAction = (status: string) => {
    selectedIds.forEach((id) => advanceMutation.mutate({ id, status }))
  }

  const filteredOrders = (orders as Order[]).filter((o) => {
    if (filterPayment && o.payment_method !== filterPayment) return false
    if (filterSearch && !o.id.toLowerCase().includes(filterSearch.toLowerCase())) return false
    return true
  })

  const paymentMethods = Array.from(new Set((orders as Order[]).map((o) => o.payment_method).filter(Boolean)))

  // Close panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOrder(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">Заказы</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-xs text-gray-400">Shift+клик — выбор · Drag — перемещение</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-white rounded-xl border">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Поиск по ID заказа..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">Все способы оплаты</option>
          {paymentMethods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l">
            <span className="text-sm font-medium text-accent">{selectedIds.size} выбрано</span>
            {COLUMNS.slice(1).map((col) => (
              <button
                key={col.key}
                onClick={() => handleBulkAction(col.key)}
                disabled={advanceMutation.isPending}
                className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium disabled:opacity-50 transition-colors"
              >
                → {col.label}
              </button>
            ))}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
            >
              Сбросить
            </button>
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {COLUMNS.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.status === col.key)
          const isOver = dragOverCol === col.key
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-64 flex flex-col"
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {/* Column header */}
              <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-xl transition-colors ${
                isOver ? 'bg-accent/10' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    col.key === 'new' ? 'bg-gray-400' :
                    col.key === 'confirmed' ? 'bg-blue-500' :
                    col.key === 'packing' ? 'bg-yellow-500' :
                    col.key === 'shipped' ? 'bg-orange-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-500">{colOrders.length}</span>
              </div>

              {/* Cards */}
              <div className={`flex-1 space-y-2 min-h-24 rounded-xl p-1 transition-colors ${
                isOver ? 'bg-accent/5 ring-2 ring-accent/30 ring-dashed' : ''
              }`}>
                {colOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    isSelected={selectedIds.has(o.id)}
                    isDragging={dragId === o.id}
                    onSelect={handleSelect}
                    onDragStart={handleDragStart}
                    onDragEnd={() => setDragId(null)}
                    onClick={(order) => setPanelOrder(order)}
                  />
                ))}
                {colOrders.length === 0 && (
                  <div className="h-20 flex items-center justify-center text-xs text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                    Пусто
                  </div>
                )}
              </div>

              {/* Column total */}
              {colOrders.length > 0 && (
                <div className="mt-2 text-xs text-gray-400 text-right px-1">
                  Итого: {fmt(colOrders.reduce((s, o) => s + Number(o.total), 0))} {colOrders[0]?.currency}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Side panel */}
      {panelOrder && (
        <OrderSidePanel
          order={panelOrder}
          onClose={() => setPanelOrder(null)}
          onStatusChange={(id, status) => {
            advanceMutation.mutate({ id, status })
            setPanelOrder(null)
          }}
          isPending={advanceMutation.isPending}
        />
      )}
    </div>
  )
}
