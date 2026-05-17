import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

/**
 * Root page: resolve shop slug from host header (for production <slug>.dokonly.com)
 * or fall back to SHOP_SLUG env var (for development/preview).
 */
export default function RootPage({
  searchParams,
}: {
  searchParams: { shop?: string }
}) {
  // Priority: ?shop= query param → SHOP_SLUG env var → host-based slug
  const shopParam = searchParams.shop
  if (shopParam) redirect(`/${shopParam}`)

  const envSlug = process.env.SHOP_SLUG
  if (envSlug) redirect(`/${envSlug}`)

  // Try to extract from host header
  const headersList = headers()
  const host = headersList.get('host') ?? ''
  const dokonlyMatch = host.match(/^([^.]+)\.dokonly\.com/)
  if (dokonlyMatch) redirect(`/${dokonlyMatch[1]}`)

  // Fallback: show a simple landing page directing to a store
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--accent)' }}>
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Dokonly
        </h1>
        <p className="text-gray-500 mb-6">
          Open your store link to start shopping, or add <code className="bg-gray-100 px-1 rounded">?shop=yourslug</code> to the URL.
        </p>
        <a
          href="https://dokonly.com"
          className="inline-flex items-center gap-2 text-sm font-medium text-white px-5 py-2.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        >
          Learn about Dokonly
        </a>
      </div>
    </div>
  )
}
