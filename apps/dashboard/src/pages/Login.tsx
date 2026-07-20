import { useState } from 'react'
import { signIn } from '@/store/auth'
import { api } from '@/lib/api'

const createStoreBotUrl = import.meta.env.VITE_CREATE_STORE_BOT_URL ?? 'https://t.me/dokonlybot'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [twoFaState, setTwoFaState] = useState<'idle' | 'checking' | 'setup_needed' | 'verify_needed'>('idle')
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaError, setTwoFaError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await signIn(email, password)
      // After successful sign-in, check 2FA status for platform users
      try {
        setTwoFaState('checking')
        const status = await api.platform.auth.status2fa()
        if (status.required && !status.enabled) {
          setTwoFaState('setup_needed')
        } else if (status.required && status.enabled) {
          setTwoFaState('verify_needed')
        } else {
          setTwoFaState('idle')
        }
      } catch {
        // Not a platform user or endpoint unavailable — proceed normally
        setTwoFaState('idle')
      }
    } catch (err: unknown) {
      setTwoFaState('idle')
      setError(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  async function submitTwoFa(e: React.FormEvent) {
    e.preventDefault()
    setTwoFaError('')
    try {
      const result = await api.platform.auth.verify2fa(twoFaCode)
      if (result.ok) {
        setTwoFaState('idle')
      } else {
        setTwoFaError('Неверный код, попробуйте ещё раз')
      }
    } catch {
      setTwoFaError('Неверный код, попробуйте ещё раз')
    }
  }

  if (twoFaState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Проверка безопасности...</p>
        </div>
      </div>
    )
  }

  if (twoFaState === 'setup_needed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold font-display">Dokonly Admin</h1>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
            <p className="text-sm font-medium text-amber-800">Требуется двухфакторная аутентификация</p>
            <p className="text-sm text-amber-700">
              Для платформенных пользователей обязательна настройка 2FA перед входом.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { window.location.href = '/setup-2fa' }}
            className="w-full bg-accent text-white rounded-xl py-2.5 font-medium"
          >
            Настроить двухфакторную аутентификацию →
          </button>
        </div>
      </div>
    )
  }

  if (twoFaState === 'verify_needed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form
          onSubmit={submitTwoFa}
          className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm space-y-4"
        >
          <h1 className="text-2xl font-bold font-display">Dokonly Admin</h1>
          <p className="text-sm text-gray-600">
            Введите 6-значный код из вашего приложения-аутентификатора.
          </p>
          {twoFaError && <p className="text-red-500 text-sm">{twoFaError}</p>}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-значный код"
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
            className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent tracking-widest text-center"
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={twoFaCode.length < 6}
            className="w-full bg-accent text-white rounded-xl py-2.5 font-medium disabled:opacity-50"
          >
            Подтвердить
          </button>
        </form>
      </div>
    )
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
          Войти
        </button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">или</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.open(createStoreBotUrl, '_blank', 'noopener,noreferrer')}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-800 hover:border-accent hover:text-accent"
        >
          Создать магазин в Telegram
        </button>

        <p className="text-center text-xs leading-relaxed text-gray-500">
          Новые магазины создаются через Telegram-бота. Email-вход нужен только для уже подключенного web dashboard.
        </p>
      </form>
    </div>
  )
}
