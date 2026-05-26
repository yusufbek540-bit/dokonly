import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function TwoFactorSetupPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const { data: setupData, isLoading: setupLoading } = useQuery({
    queryKey: ['2fa-setup'],
    queryFn: api.platform.auth.setup2fa,
    retry: false,
  })

  const verifyMutation = useMutation({
    mutationFn: (c: string) => api.platform.auth.verify2fa(c),
    onSuccess: (data) => {
      if (data.ok) {
        setVerified(true)
        setVerifyError('')
        setTimeout(() => navigate('/'), 1500)
      } else {
        setVerifyError('Неверный код, попробуйте ещё раз')
      }
    },
    onError: () => {
      setVerifyError('Неверный код, попробуйте ещё раз')
    },
  })

  function handleCopy() {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifyError('')
    verifyMutation.mutate(code)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display">Dokonly Admin</h1>
          <h2 className="text-base font-semibold text-gray-900">
            Настройка двухфакторной аутентификации
          </h2>
          <p className="text-sm text-gray-500">
            Требуется для первого входа в платформу
          </p>
        </div>

        {/* QR Code section */}
        <div className="flex flex-col items-center space-y-2">
          {setupLoading ? (
            <div className="w-40 h-40 border rounded-xl flex items-center justify-center bg-gray-50 text-sm text-gray-400">
              Загрузка...
            </div>
          ) : setupData?.qr_url ? (
            <img
              src={setupData.qr_url}
              alt="QR code for 2FA"
              className="w-40 h-40 rounded-xl border"
            />
          ) : (
            <div className="w-40 h-40 border rounded-xl flex items-center justify-center bg-gray-50 text-sm text-gray-400">
              QR недоступен
            </div>
          )}
          <p className="text-xs text-gray-500 text-center">
            Отсканируйте с Google Authenticator / Authy
          </p>
        </div>

        {/* Manual entry section */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowSecret((s) => !s)}
            className="text-sm text-gray-500 underline underline-offset-2"
          >
            {showSecret ? 'Скрыть секретный ключ' : 'Не работает QR-код?'}
          </button>

          {showSecret && (
            <div className="flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2">
              <span className="font-mono text-xs text-gray-800 flex-1 break-all select-all">
                {setupData?.secret ?? '—'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
                title="Скопировать"
              >
                {copied ? (
                  <span className="text-xs text-green-600 font-medium">Скопировано!</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Verification form */}
        <form onSubmit={handleVerify} className="space-y-3">
          {verified ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-green-700">2FA включена! Переходим...</p>
            </div>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-значный код"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent tracking-widest text-center"
                required
              />
              {verifyError && (
                <p className="text-red-500 text-sm">{verifyError}</p>
              )}
              <button
                type="submit"
                disabled={verifyMutation.isPending || code.length < 6}
                className="w-full bg-accent text-white rounded-xl py-2.5 font-medium disabled:opacity-50"
              >
                {verifyMutation.isPending ? 'Проверяем...' : 'Подтвердить и включить'}
              </button>
            </>
          )}
        </form>

        {/* Dev skip link */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
          >
            Пропустить (только для разработки)
          </button>
        </div>
      </div>
    </div>
  )
}
