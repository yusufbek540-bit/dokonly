import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { Login } from '@/pages/Login'
import { Layout } from '@/components/Layout'
import { ProductsPage } from '@/pages/Products'
import { OrdersPage } from '@/pages/Orders'

export default function App() {
  const { token, setToken } = useAuth()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [setToken])

  if (token === null) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div className="text-2xl font-bold font-display">Обзор</div>} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
