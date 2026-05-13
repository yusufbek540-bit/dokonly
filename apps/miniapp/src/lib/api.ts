const BASE = import.meta.env.VITE_API_URL ?? ''

function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getInitData(),
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  getShop: (slug: string) =>
    request<{ id: string; name: string; currency: string; logo_url: string | null }>(
      `/api/v1/shop/${slug}`,
    ),
  getProducts: (tenantId: string) =>
    request<any[]>(`/api/v1/shop/${tenantId}/products`),
  createOrder: (tenantId: string, body: object) =>
    request(`/api/v1/shop/${tenantId}/orders`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
