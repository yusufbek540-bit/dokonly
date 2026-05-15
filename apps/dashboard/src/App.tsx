import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { api } from '@/lib/api'
import { Login } from '@/pages/Login'
import { SetupPage } from '@/pages/Setup'
import { Layout } from '@/components/Layout'
import { ProductsPage } from '@/pages/Products'
import { OrdersPage } from '@/pages/Orders'
import { PlatformOverviewPage } from '@/pages/PlatformOverview'
import { PlatformTenantsPage } from '@/pages/PlatformTenants'

export default function App() {
  const { token, setToken } = useAuth()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
      setAuthReady(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [setToken])

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: api.getTenant,
    enabled: !!token,
    retry: false,
  })

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!token) return <Login />

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!tenant) return <SetupPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <div>
                <h1 className="text-2xl font-bold font-display mb-4">Обзор</h1>
                <div className="bg-white rounded-2xl border p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-900 mb-1">{tenant.name}</p>
                  <p>Slug: <span className="font-mono">{tenant.slug}</span></p>
                  <p>Валюта: {tenant.currency}</p>
                  <p className="mt-3 text-xs text-gray-400">
                    Ссылка для покупателей:{' '}
                    <a
                      href={`https://dokonly-miniapp.pages.dev?shop=${tenant.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-accent underline"
                    >
                      dokonly-miniapp.pages.dev?shop={tenant.slug}
                    </a>
                  </p>
                </div>
              </div>
            }
          />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/platform" element={<PlatformOverviewPage />} />
          <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
