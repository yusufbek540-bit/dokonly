import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export function SetupPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [currency, setCurrency] = useState('UZS')
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () => api.createTenant({ name, slug, currency }),
    onSuccess: async () => {
      await api.configureBotMenu().catch(() => {})
      qc.invalidateQueries({ queryKey: ['tenant'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) setSlug(toSlug(value))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Создайте свой магазин</h1>
          <p className="text-gray-500 text-sm mt-1">Это займёт меньше минуты</p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Название магазина</label>
            <input
              placeholder="Мой Цветочный"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Адрес магазина (slug)</label>
            <div className="flex items-center border rounded-xl overflow-hidden focus-within:border-accent">
              <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r">dokonly.com/</span>
              <input
                placeholder="my-shop"
                value={slug}
                onChange={(e) => { setSlug(toSlug(e.target.value)); setSlugEdited(true) }}
                className="flex-1 px-3 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Валюта</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent bg-white"
            >
              <option value="UZS">UZS — Узбекский сум</option>
              <option value="USD">USD — Доллар США</option>
              <option value="RUB">RUB — Российский рубль</option>
              <option value="KZT">KZT — Казахстанский тенге</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => create.mutate()}
          disabled={!name || !slug || create.isPending}
          className="w-full bg-accent text-white rounded-xl py-2.5 font-medium disabled:opacity-40"
        >
          {create.isPending ? 'Создаём...' : 'Создать магазин'}
        </button>
      </div>
    </div>
  )
}
