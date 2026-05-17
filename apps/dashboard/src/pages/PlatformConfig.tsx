import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type Tab = 'countries' | 'payment' | 'features' | 'ai'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'countries', label: 'Страны', icon: '🌍' },
  { key: 'payment', label: 'Платёжные провайдеры', icon: '💳' },
  { key: 'features', label: 'Feature Flags', icon: '🚩' },
  { key: 'ai', label: 'AI Config', icon: '🤖' },
]

const ALL_COUNTRIES = [
  { code: 'UZ', name: 'Узбекистан', currency: 'UZS' },
  { code: 'KZ', name: 'Казахстан', currency: 'KZT' },
  { code: 'KG', name: 'Кыргызстан', currency: 'KGS' },
  { code: 'TJ', name: 'Таджикистан', currency: 'TJS' },
  { code: 'RU', name: 'Россия', currency: 'RUB' },
  { code: 'TR', name: 'Турция', currency: 'TRY' },
  { code: 'AE', name: 'ОАЭ', currency: 'AED' },
]

const PAYMENT_PROVIDERS = [
  { key: 'click', name: 'Click', country: 'UZ', logo: '🔵' },
  { key: 'payme', name: 'Payme', country: 'UZ', logo: '🟢' },
  { key: 'uzum', name: 'Uzum Pay', country: 'UZ', logo: '🟣' },
  { key: 'stripe', name: 'Stripe', country: 'Global', logo: '💜' },
  { key: 'payze', name: 'Payze', country: 'KZ/KG', logo: '🟡' },
  { key: 'stars', name: 'Telegram Stars', country: 'Global', logo: '⭐' },
]

const FEATURE_FLAGS = [
  { key: 'web_storefront', label: 'Web Storefront (Premium)', description: 'Enable web store for Premium tenants' },
  { key: 'ai_consultant', label: 'AI Consultant Chat', description: 'AI chat assistant for buyers' },
  { key: 'loyalty_program', label: 'Loyalty Program', description: 'Points, cashback, tiers' },
  { key: 'referral_program', label: 'Referral Program', description: 'Invite friends, earn rewards' },
  { key: 'stories', label: 'Stories', description: 'Instagram-style stories in storefront' },
  { key: 'video_products', label: 'Video Products', description: 'Product video upload & playback' },
  { key: 'multi_currency', label: 'Multi-currency', description: 'Show prices in multiple currencies' },
  { key: 'pos_mode', label: 'POS Mode', description: 'Offline point-of-sale for Business+' },
  { key: 'crm', label: 'CRM / Customers Tab', description: 'Advanced customer management' },
  { key: 'team_management', label: 'Team Management', description: 'Multi-staff access for merchants' },
]

const AI_MODELS = [
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast, cheap)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (balanced)' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 (most capable)' },
]

function SaveBanner({ saved }: { saved: boolean }) {
  if (!saved) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold animate-bounce">
      ✓ Сохранено
    </div>
  )
}

function CountriesTab() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-config-countries'],
    queryFn: api.platform.config.countries,
    retry: false,
  })

  const [enabled, setEnabled] = useState<string[]>([])

  // Sync from server once
  useState(() => {
    if (data?.enabled_countries) setEnabled(data.enabled_countries)
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.platform.config.updateCountries({ enabled_countries: enabled }),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['platform-config-countries'] })
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const toggleCountry = (code: string) => {
    setEnabled(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>

  const activeCountries = data?.enabled_countries ?? ['UZ']

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Выберите страны, в которых работает платформа. Это влияет на доступные платёжные методы и валюты.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALL_COUNTRIES.map(c => {
          const active = activeCountries.includes(c.code)
          return (
            <div
              key={c.code}
              onClick={() => toggleCountry(c.code)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${active ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-gray-200'}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-accent bg-accent' : 'border-gray-300'}`}>
                {active && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-400">{c.code} · {c.currency}</div>
              </div>
            </div>
          )
        })}
      </div>
      <button
        onClick={() => save()}
        disabled={isPending}
        className="mt-2 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? 'Сохраняем...' : 'Сохранить'}
      </button>
      <SaveBanner saved={saved} />
    </div>
  )
}

function PaymentTab() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-config-payment'],
    queryFn: api.platform.config.paymentProviders,
    retry: false,
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: (providers: any) => api.platform.config.updatePaymentProviders({ providers }),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['platform-config-payment'] })
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const [providers, setProviders] = useState<Record<string, { enabled: boolean; api_key?: string; secret_key?: string; merchant_id?: string }>>(
    () => Object.fromEntries(PAYMENT_PROVIDERS.map(p => [p.key, { enabled: false }]))
  )

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>

  const serverProviders = data?.providers ?? {}

  const mergedProviders = Object.fromEntries(
    PAYMENT_PROVIDERS.map(p => [p.key, { enabled: false, ...serverProviders[p.key] }])
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Настройте платёжные провайдеры для каждого региона. API ключи хранятся в зашифрованном виде.</p>
      <div className="space-y-3">
        {PAYMENT_PROVIDERS.map(p => {
          const cfg = mergedProviders[p.key]
          const isEnabled = cfg.enabled
          return (
            <div key={p.key} className={`rounded-xl border ${isEnabled ? 'border-accent/30 bg-accent/5' : 'border-gray-100'} overflow-hidden`}>
              <div className="flex items-center gap-3 p-4">
                <span className="text-2xl">{p.logo}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.country}</div>
                </div>
                <button
                  onClick={() => setProviders(prev => ({
                    ...prev,
                    [p.key]: { ...prev[p.key], enabled: !prev[p.key]?.enabled },
                  }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${isEnabled ? 'bg-accent' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {isEnabled && (
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100">
                  {['api_key', 'secret_key', 'merchant_id'].map(field => (
                    <div key={field}>
                      <label className="text-xs font-medium text-gray-500 block mb-1">{field.replace('_', ' ').toUpperCase()}</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        defaultValue={cfg[field as keyof typeof cfg] as string ?? ''}
                        onChange={e => setProviders(prev => ({
                          ...prev,
                          [p.key]: { ...prev[p.key], [field]: e.target.value },
                        }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <button
        onClick={() => save(providers)}
        disabled={isPending}
        className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? 'Сохраняем...' : 'Сохранить'}
      </button>
      <SaveBanner saved={saved} />
    </div>
  )
}

function FeaturesTab() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-config-features'],
    queryFn: api.platform.config.features,
    retry: false,
  })

  const [flags, setFlags] = useState<Record<string, boolean>>({})

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.platform.config.updateFeatures({ flags }),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['platform-config-features'] })
      setTimeout(() => setSaved(false), 2000)
    },
  })

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>

  const serverFlags: Record<string, boolean> = data?.flags ?? {}
  const mergedFlags = { ...Object.fromEntries(FEATURE_FLAGS.map(f => [f.key, true])), ...serverFlags, ...flags }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Управляйте включением функций для всей платформы. Некоторые флаги перекрываются настройками тарифного плана.</p>
      <div className="space-y-2">
        {FEATURE_FLAGS.map(f => {
          const enabled = mergedFlags[f.key] ?? true
          return (
            <div key={f.key} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-800">{f.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{f.description}</div>
              </div>
              <button
                onClick={() => setFlags(prev => ({ ...prev, [f.key]: !enabled }))}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${enabled ? 'bg-accent' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )
        })}
      </div>
      <button
        onClick={() => save()}
        disabled={isPending}
        className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? 'Сохраняем...' : 'Сохранить изменения'}
      </button>
      <SaveBanner saved={saved} />
    </div>
  )
}

function AIConfigTab() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-config-ai'],
    queryFn: api.platform.config.aiConfig,
    retry: false,
  })

  const [form, setForm] = useState({
    default_model: 'claude-haiku-4-5',
    product_description_model: 'claude-haiku-4-5',
    chat_model: 'claude-sonnet-4-6',
    daily_cost_limit_usd: '50',
    per_tenant_daily_limit_usd: '5',
    alert_threshold_pct: '80',
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.platform.config.updateAiConfig(form),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['platform-config-ai'] })
      setTimeout(() => setSaved(false), 2000)
    },
  })

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>

  const serverForm = data ?? {}

  const displayForm = { ...form, ...serverForm }

  const ModelSelect = ({ field, label }: { field: keyof typeof form; label: string }) => (
    <div>
      <label className="text-sm font-medium text-gray-600 block mb-1.5">{label}</label>
      <select
        defaultValue={displayForm[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        {AI_MODELS.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
  )

  const NumberInput = ({ field, label, suffix }: { field: keyof typeof form; label: string; suffix?: string }) => (
    <div>
      <label className="text-sm font-medium text-gray-600 block mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          defaultValue={displayForm[field]}
          onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        {suffix && <span className="text-sm text-gray-400 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Модели по задачам</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ModelSelect field="default_model" label="Модель по умолчанию" />
          <ModelSelect field="product_description_model" label="Описания продуктов" />
          <ModelSelect field="chat_model" label="AI Консультант (чат)" />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Лимиты расходов</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberInput field="daily_cost_limit_usd" label="Дневной лимит (платформа)" suffix="USD" />
          <NumberInput field="per_tenant_daily_limit_usd" label="Лимит на тенант/день" suffix="USD" />
          <NumberInput field="alert_threshold_pct" label="Порог уведомления" suffix="%" />
        </div>
        <p className="text-xs text-gray-400">
          Уведомление отправляется в Telegram при достижении {displayForm.alert_threshold_pct}% от дневного лимита.
          После достижения 100% — AI функции временно отключаются.
        </p>
      </div>

      <button
        onClick={() => save()}
        disabled={isPending}
        className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? 'Сохраняем...' : 'Сохранить конфигурацию'}
      </button>
      <SaveBanner saved={saved} />
    </div>
  )
}

export function PlatformConfigPage() {
  const [tab, setTab] = useState<Tab>('countries')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Конфигурация системы</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-gray-100 overflow-x-auto pb-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'countries' && <CountriesTab />}
        {tab === 'payment' && <PaymentTab />}
        {tab === 'features' && <FeaturesTab />}
        {tab === 'ai' && <AIConfigTab />}
      </div>
    </div>
  )
}
