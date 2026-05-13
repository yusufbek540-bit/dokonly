import { useState } from 'react'
import { signIn, signUp } from '@/store/auth'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') await signIn(email, password)
      else await signUp(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={submit}
        className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold font-display">Dokonly Admin</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent"
          required
        />
        <button
          type="submit"
          className="w-full bg-accent text-white rounded-xl py-2.5 font-medium"
        >
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
          className="w-full text-sm text-gray-500"
        >
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  )
}
