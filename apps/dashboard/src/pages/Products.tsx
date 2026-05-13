import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, type Product } from '@/lib/api'

export function ProductsPage() {
  const qc = useQueryClient()
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
  })
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', description: '' })

  const create = useMutation({
    mutationFn: () =>
      api.createProduct({ name: form.name, price: Number(form.price), description: form.description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setAdding(false)
      setForm({ name: '', price: '', description: '' })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Товары</h1>
        <button
          onClick={() => setAdding(true)}
          className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          + Добавить
        </button>
      </div>

      {adding && (
        <div className="bg-white border rounded-2xl p-4 mb-4 space-y-3">
          <input
            placeholder="Название"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Цена"
            type="number"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Описание"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="bg-accent text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50"
            >
              Сохранить
            </button>
            <button
              onClick={() => setAdding(false)}
              className="bg-gray-100 px-4 py-2 rounded-xl text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="text-left px-4 py-3">Название</th>
                <th className="text-left px-4 py-3">Цена</th>
                <th className="text-left px-4 py-3">Остаток</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p: Product) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    {Number(p.price).toLocaleString()} {p.currency}
                  </td>
                  <td className="px-4 py-3">{p.stock ?? '∞'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove.mutate(p.id)}
                      disabled={remove.isPending}
                      className="text-red-400 hover:text-red-600 text-xs disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
