import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const NAV_ITEMS = [
  { id: 'profile',    label: 'Профиль магазина',  icon: '🏪' },
  { id: 'payments',   label: 'Способы оплаты',    icon: '💳' },
  { id: 'delivery',   label: 'Доставка',          icon: '🚚' },
  { id: 'orders',     label: 'Настройки заказов', icon: '📦' },
  { id: 'bot',        label: 'Бот',               icon: '🤖' },
  { id: 'channel',    label: 'Канал',             icon: '📢' },
  { id: 'storefront', label: 'Веб-витрина',       icon: '🌐', premiumOnly: true },
  { id: 'subscription', label: 'Подписка',        icon: '💎' },
]

const CURRENCIES = ['UZS', 'USD', 'RUB', 'KZT']
const PAYMENT_METHODS = ['manual_transfer', 'click', 'payme', 'cash', 'card']
const PAYMENT_LABELS: Record<string, string> = {
  manual_transfer: 'Перевод на карту',
  click: 'Click',
  payme: 'Payme',
  cash: 'Наличные при получении',
  card: 'Банковская карта',
}
const DELIVERY_METHODS = ['courier', 'pickup', 'post', 'digital']
const DELIVERY_LABELS: Record<string, string> = {
  courier: '🚚 Курьер',
  pickup: '🏪 Самовывоз',
  post: '📮 Почта',
  digital: '📧 Цифровая доставка',
}

function ProfileSection({ tenant, onSave }: { tenant: any; onSave: (d: any) => void }) {
  const [name, setName] = useState(tenant?.name ?? '')
  const [desc, setDesc] = useState(tenant?.description ?? '')
  const [phone, setPhone] = useState(tenant?.phone ?? '')
  const [email, setEmail] = useState(tenant?.email ?? '')
  const [address, setAddress] = useState(tenant?.address ?? '')

  const dirty = name !== (tenant?.name ?? '') || desc !== (tenant?.description ?? '') ||
    phone !== (tenant?.phone ?? '') || email !== (tenant?.email ?? '') || address !== (tenant?.address ?? '')

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Профиль магазина</h2>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Название</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Описание</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Расскажите о вашем магазине..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Телефон</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="+998 90 000 00 00"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="shop@example.com"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Адрес</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Ташкент, ул. Амира Тимура 1"
        />
      </div>
      {dirty && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => onSave({ name, description: desc, phone, email, address })}
            className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Сохранить
          </button>
        </div>
      )}
    </div>
  )
}

function PaymentsSection({ settings }: { settings: any }) {
  const [enabled, setEnabled] = useState<string[]>(settings?.payment_methods ?? [])
  const [cardNumber, setCardNumber] = useState(settings?.card_number ?? '')
  const [holderName, setHolderName] = useState(settings?.card_holder ?? '')

  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: (body: object) => fetch('/api/v1/miniapp/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant'] }),
  })

  function toggle(m: string) {
    setEnabled(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Способы оплаты</h2>
      <div className="space-y-2">
        {PAYMENT_METHODS.map((m) => (
          <label key={m} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={enabled.includes(m)}
              onChange={() => toggle(m)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm font-medium">{PAYMENT_LABELS[m]}</span>
          </label>
        ))}
      </div>
      {enabled.includes('manual_transfer') && (
        <div className="p-4 bg-blue-50 rounded-xl space-y-3 border border-blue-100">
          <p className="text-xs font-semibold text-blue-700">Реквизиты для перевода</p>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Номер карты</label>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="8600 0000 0000 0000"
              maxLength={19}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Имя владельца</label>
            <input
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="MALIKA ALIMOVA"
            />
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button
          onClick={() => save.mutate({ payment_methods: enabled, card_number: cardNumber, card_holder: holderName })}
          disabled={save.isPending}
          className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {save.isPending ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function DeliverySection({ settings }: { settings: any }) {
  const [enabled, setEnabled] = useState<string[]>(settings?.delivery_methods ?? [])

  function toggle(m: string) {
    setEnabled(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Доставка</h2>
      <div className="space-y-2">
        {DELIVERY_METHODS.map((m) => (
          <label key={m} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={enabled.includes(m)}
              onChange={() => toggle(m)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm font-medium">{DELIVERY_LABELS[m]}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <button className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
          Сохранить
        </button>
      </div>
    </div>
  )
}

function OrderSettingsSection({ settings }: { settings: any }) {
  const [minAmount, setMinAmount] = useState(String(settings?.min_order_amount ?? ''))
  const [confirmMsg, setConfirmMsg] = useState(settings?.confirmation_message ?? '')
  const [requirePhone, setRequirePhone] = useState(settings?.require_phone ?? true)
  const [requireAddress, setRequireAddress] = useState(settings?.require_address ?? false)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Настройки заказов</h2>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Минимальная сумма заказа</label>
        <input
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          type="number"
          className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="0"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Сообщение подтверждения</label>
        <textarea
          value={confirmMsg}
          onChange={(e) => setConfirmMsg(e.target.value)}
          rows={3}
          className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Спасибо за заказ! Мы свяжемся с вами скоро."
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">Обязательные поля оформления</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requirePhone}
            onChange={(e) => setRequirePhone(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm">Номер телефона</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requireAddress}
            onChange={(e) => setRequireAddress(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm">Адрес доставки</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
          Сохранить
        </button>
      </div>
    </div>
  )
}

function BotSection({ settings }: { settings: any }) {
  const [welcome, setWelcome] = useState(settings?.welcome_message ?? '')
  const [groupChatId, setGroupChatId] = useState(String(settings?.group_chat_id ?? ''))
  const [fullscreen, setFullscreen] = useState(() => localStorage.getItem('tg_fullscreen') === '1')

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Настройки бота</h2>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Приветственное сообщение</label>
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          rows={4}
          className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Добро пожаловать в наш магазин! 👋"
        />
        <p className="text-xs text-gray-400 mt-1">Это сообщение покупатели видят при старте бота.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">ID группы для уведомлений</label>
        <input
          value={groupChatId}
          onChange={(e) => setGroupChatId(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="-100123456789"
        />
        <p className="text-xs text-gray-400 mt-1">Новые заказы будут пересылаться в эту группу.</p>
      </div>
      <div className="p-4 border rounded-xl">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium">Полноэкранный режим</p>
            <p className="text-xs text-gray-400 mt-0.5">Открывать приложение на весь экран</p>
          </div>
          <div
            onClick={() => {
              const next = !fullscreen
              setFullscreen(next)
              localStorage.setItem('tg_fullscreen', next ? '1' : '0')
              const tg = (window as any).Telegram?.WebApp
              if (next) tg?.requestFullscreen?.()
              else tg?.exitFullscreen?.()
            }}
            className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${fullscreen ? 'bg-accent' : 'bg-gray-200'}`}
            style={{ position: 'relative', flexShrink: 0 }}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${fullscreen ? 'left-6' : 'left-1'}`} />
          </div>
        </label>
      </div>
      <div className="flex justify-end">
        <button className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
          Сохранить
        </button>
      </div>
    </div>
  )
}

function ChannelSection({ settings }: { settings: any }) {
  const [channelId, setChannelId] = useState(String(settings?.channel_id ?? ''))
  const [gateEnabled, setGateEnabled] = useState(settings?.channel_gate_enabled ?? false)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Telegram-канал</h2>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">ID или @username канала</label>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="@mychannel или -100123456789"
        />
      </div>
      <div className="p-4 border rounded-xl space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium">Шлагбаум подписки</p>
            <p className="text-xs text-gray-400 mt-0.5">Только подписчики канала могут видеть магазин</p>
          </div>
          <div
            onClick={() => setGateEnabled((v: boolean) => !v)}
            className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${gateEnabled ? 'bg-accent' : 'bg-gray-200'}`}
            style={{ position: 'relative', flexShrink: 0 }}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${gateEnabled ? 'left-6' : 'left-1'}`} />
          </div>
        </label>
      </div>
      <div className="flex justify-end">
        <button className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
          Сохранить
        </button>
      </div>
    </div>
  )
}

function SubscriptionSection({ tenant }: { tenant: any }) {
  const tier = tenant?.tier ?? 'trial'
  const TIER_LABELS: Record<string, string> = { trial: 'Пробный', start: 'Старт', business: 'Бизнес', premium: 'Премиум' }
  const TIER_COLORS: Record<string, string> = {
    trial: 'bg-gray-100 text-gray-600',
    start: 'bg-blue-100 text-blue-700',
    business: 'bg-purple-100 text-purple-700',
    premium: 'bg-amber-100 text-amber-700',
  }
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Подписка</h2>
      <div className="p-5 border rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${TIER_COLORS[tier] ?? 'bg-gray-100 text-gray-600'}`}>
            {TIER_LABELS[tier] ?? tier}
          </span>
          {tenant?.trial_ends_at && (
            <span className="text-xs text-gray-400">
              до {new Date(tenant.trial_ends_at).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Товары', value: tier === 'premium' ? '∞' : tier === 'business' ? '500' : '50' },
            { label: 'Заказов/мес', value: tier === 'premium' ? '∞' : tier === 'business' ? '∞' : '100' },
            { label: 'Администраторов', value: tier === 'premium' ? '∞' : tier === 'business' ? '3' : '1' },
          ].map((f) => (
            <div key={f.label} className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="font-mono font-bold text-lg">{f.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
      {tier !== 'premium' && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl">
          <p className="text-sm font-semibold text-gray-800 mb-1">Хотите больше функций?</p>
          <p className="text-xs text-gray-500 mb-3">Перейдите на Business или Premium для AI, CRM, рассылок и многого другого.</p>
          <button className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            Повысить тариф
          </button>
        </div>
      )}
    </div>
  )
}

function StorefrontSection({ tenant }: { tenant: any }) {
  const slug = tenant?.slug ?? ''
  const storefrontUrl = `https://${slug}.dokonly.com`
  const [metaTitle, setMetaTitle] = useState(tenant?.seo_title ?? '')
  const [metaDesc, setMetaDesc] = useState(tenant?.seo_description ?? '')
  const [allowIndex, setAllowIndex] = useState(tenant?.allow_indexing ?? true)
  const [googleCode, setGoogleCode] = useState(tenant?.google_verification ?? '')
  const [copied, setCopied] = useState(false)
  const domain = ''

  const isPremium = tenant?.tier === 'premium'
  if (!isPremium) {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Веб-витрина</h2>
        <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl text-center">
          <div className="text-4xl mb-3">🌐</div>
          <p className="font-semibold text-gray-800 mb-1">Только в Премиум</p>
          <p className="text-sm text-gray-500 mb-4">
            Публичная веб-витрина доступна на плане Премиум. Ваши покупатели смогут найти магазин через Google.
          </p>
          <button className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            Перейти на Премиум
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Веб-витрина</h2>

      {/* Status + URL */}
      <div className="p-4 border border-green-200 bg-green-50 rounded-xl flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">Активна</p>
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-green-700 underline hover:no-underline truncate block"
          >
            {storefrontUrl}
          </a>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(storefrontUrl).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
          className="text-xs text-green-700 font-medium px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
        >
          {copied ? 'Скопировано!' : 'Копировать'}
        </button>
      </div>

      {/* Custom domain — coming in v1.1 */}
      <div className="space-y-2 opacity-60">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Собственный домен
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-normal">Скоро</span>
        </h3>
        <div className="flex gap-2">
          <input
            value={domain}
            disabled
            placeholder="malika-beauty.com"
            className="flex-1 border rounded-xl px-3 py-2 text-sm font-mono bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <button
            disabled
            className="bg-gray-200 text-gray-400 px-4 py-2 rounded-xl text-sm font-medium cursor-not-allowed"
          >
            Подключить
          </button>
        </div>
        <p className="text-xs text-gray-400">Подключение собственного домена будет доступно в следующем обновлении.</p>
      </div>

      {/* SEO settings */}
      <div className="space-y-3 border-t pt-5">
        <h3 className="text-sm font-semibold text-gray-700">SEO-настройки</h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Заголовок страницы (meta title)</label>
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder={`${tenant?.name} — интернет-магазин`}
            maxLength={60}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-xs text-gray-400 mt-0.5">{metaTitle.length}/60 символов</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Описание (meta description)</label>
          <textarea
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            placeholder={tenant?.description ?? 'Описание магазина для поисковых систем'}
            maxLength={160}
            rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-xs text-gray-400 mt-0.5">{metaDesc.length}/160 символов</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Код верификации Google Search Console</label>
          <input
            value={googleCode}
            onChange={(e) => setGoogleCode(e.target.value)}
            placeholder="google-site-verification=..."
            className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowIndex}
            onChange={(e) => setAllowIndex(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <div>
            <span className="text-sm font-medium">Разрешить индексацию в Google</span>
            <p className="text-xs text-gray-400">Снимите галочку, чтобы скрыть магазин от поисковиков</p>
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <button className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
          Сохранить SEO
        </button>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: api.getTenant,
  })

  const qc = useQueryClient()
  const saveTenant = useMutation({
    mutationFn: (body: object) => fetch('/api/v1/tenants/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant'] }),
  })

  const settings = (tenant as any)?.settings ?? {}

  return (
    <div className="flex gap-0 h-full">
      {/* Left nav */}
      <div className="w-52 flex-shrink-0 border-r pr-4 pt-1">
        <h1 className="text-lg font-bold font-display mb-4">Настройки</h1>
        <nav className="space-y-0.5">
          {NAV_ITEMS.filter((item) => !item.premiumOnly || (tenant as any)?.tier === 'premium').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 pl-6 pt-1 overflow-y-auto pb-16">
        {activeSection === 'profile'      && <ProfileSection tenant={tenant} onSave={(d) => saveTenant.mutate(d)} />}
        {activeSection === 'payments'     && <PaymentsSection settings={settings} />}
        {activeSection === 'delivery'     && <DeliverySection settings={settings} />}
        {activeSection === 'orders'       && <OrderSettingsSection settings={settings} />}
        {activeSection === 'bot'          && <BotSection settings={settings} />}
        {activeSection === 'channel'      && <ChannelSection settings={settings} />}
        {activeSection === 'storefront'   && <StorefrontSection tenant={tenant} />}
        {activeSection === 'subscription' && <SubscriptionSection tenant={tenant} />}
      </div>
    </div>
  )
}
