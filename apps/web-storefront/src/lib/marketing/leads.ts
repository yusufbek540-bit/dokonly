const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')
).replace(/\/$/, '')

export interface MarketingLeadInput {
  locale: 'ru' | 'uz'
  name: string
  telegram_username?: string
  phone?: string
  email?: string
  business_name?: string
  niche: string
  monthly_order_volume?: string
  message?: string
  source_page: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export async function submitMarketingLead(input: MarketingLeadInput): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${apiBase}/api/v1/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (response.ok) return { ok: true }

    const data = await response.json().catch(() => null)
    return { ok: false, message: data?.detail ?? 'Request failed' }
  } catch {
    return { ok: false, message: 'Request failed' }
  }
}
