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
import { PlatformSubscriptionsPage } from '@/pages/PlatformSubscriptions'
import { PlatformAnalyticsPage } from '@/pages/PlatformAnalytics'
import { PlatformTeamPage } from '@/pages/PlatformTeam'
import { PlatformAuditLogPage } from '@/pages/PlatformAuditLog'
import { PlatformStatusPage } from '@/pages/PlatformStatus'
import { PlatformSupportPage } from '@/pages/PlatformSupport'
import { PlatformContentPage } from '@/pages/PlatformContent'
import { MerchantHome } from '@/pages/MerchantHome'

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
          <Route path="/" element={<MerchantHome tenant={tenant} />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/platform" element={<PlatformOverviewPage />} />
          <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
          <Route path="/platform/subscriptions" element={<PlatformSubscriptionsPage />} />
          <Route path="/platform/analytics" element={<PlatformAnalyticsPage />} />
          <Route path="/platform/team" element={<PlatformTeamPage />} />
          <Route path="/platform/audit" element={<PlatformAuditLogPage />} />
          <Route path="/platform/status" element={<PlatformStatusPage />} />
          <Route path="/platform/support" element={<PlatformSupportPage />} />
          <Route path="/platform/content" element={<PlatformContentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
