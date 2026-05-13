import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { Login } from '@/pages/Login'

export default function App() {
  const { token, setToken } = useAuth()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [setToken])

  if (token === null) return <Login />
  return <div className="p-8 text-gray-500">Loading dashboard...</div>
}
