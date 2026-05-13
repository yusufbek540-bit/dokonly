import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

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
  useAuth.getState().setToken(data.session?.access_token ?? null)
  return data
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}
