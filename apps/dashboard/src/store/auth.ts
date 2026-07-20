import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const CUSTOM_DASHBOARD_TOKEN_KEY = 'dokonly_dashboard_token'

interface AuthStore {
  token: string | null
  setToken: (t: string | null) => void
}

export const useAuth = create<AuthStore>((set) => ({
  token: null,
  setToken: (t) => set({ token: t }),
}))

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  localStorage.removeItem(CUSTOM_DASHBOARD_TOKEN_KEY)
  useAuth.getState().setToken(data.session?.access_token ?? null)
  return data
}

export function getStoredDashboardToken() {
  return localStorage.getItem(CUSTOM_DASHBOARD_TOKEN_KEY)
}

export async function signInWithTelegramDashboardToken(token: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/telegram-dashboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { access_token: string }
  localStorage.setItem(CUSTOM_DASHBOARD_TOKEN_KEY, data.access_token)
  useAuth.getState().setToken(data.access_token)
  return data
}
