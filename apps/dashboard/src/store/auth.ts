import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const CUSTOM_DASHBOARD_TOKEN_KEY = 'dokonly_dashboard_token'

interface AuthStore {
  token: string | null
  isPlatformAdmin: boolean
  setToken: (t: string | null) => void
}

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function tokenIsPlatformAdmin(token: string | null) {
  return decodeJwtPayload(token)?.is_platform_admin === true
}

export const useAuth = create<AuthStore>((set) => ({
  token: null,
  isPlatformAdmin: false,
  setToken: (t) => set({ token: t, isPlatformAdmin: tokenIsPlatformAdmin(t) }),
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
