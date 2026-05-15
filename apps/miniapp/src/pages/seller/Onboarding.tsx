import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/Icon'

interface Props {
  tgUser: any
  onDone: (tenant: any) => void
}

// ── Static data ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'UZ', flag: '🇺🇿', name: 'Узбекистан',    currency: 'UZS' },
  { code: 'KZ', flag: '🇰🇿', name: 'Казахстан',     currency: 'KZT' },
  { code: 'RU', flag: '🇷🇺', name: 'Россия',         currency: 'RUB' },
  { code: 'KG', flag: '🇰🇬', name: 'Кыргызстан',    currency: 'KGS' },
  { code: 'TJ', flag: '🇹🇯', name: 'Таджикистан',   currency: 'TJS' },
  { code: 'TM', flag: '🇹🇲', name: 'Туркменистан',  currency: 'TMT' },
  { code: 'AZ', flag: '🇦🇿', name: 'Азербайджан',   currency: 'AZN' },
  { code: 'GE', flag: '🇬🇪', name: 'Грузия',         currency: 'GEL' },
  { code: 'AM', flag: '🇦🇲', name: 'Армения',        currency: 'AMD' },
  { code: 'UA', flag: '🇺🇦', name: 'Украина',        currency: 'UAH' },
  { code: 'BY', flag: '🇧🇾', name: 'Беларусь',       currency: 'BYR' },
  { code: 'OTHER', flag: '🌍', name: 'Другая страна', currency: 'USD' },
]

const BUSINESS_CATEGORIES = [
  { id: 'fashion',      emoji: '👗', label: 'Одежда и мода' },
  { id: 'electronics',  emoji: '📱', label: 'Электроника' },
  { id: 'beauty',       emoji: '💄', label: 'Красота и уход' },
  { id: 'food',         emoji: '🍎', label: 'Еда и напитки' },
  { id: 'flowers',      emoji: '💐', label: 'Цветы' },
  { id: 'accessories',  emoji: '👜', label: 'Аксессуары' },
  { id: 'kids',         emoji: '🧸', label: 'Детские товары' },
  { id: 'sport',        emoji: '⚽', label: 'Спорт и фитнес' },
  { id: 'home',         emoji: '🏠', label: 'Дом и интерьер' },
  { id: 'books',        emoji: '📚', label: 'Книги и обучение' },
  { id: 'auto',         emoji: '🚗', label: 'Авто-товары' },
  { id: 'pets',         emoji: '🐾', label: 'Зоотовары' },
  { id: 'digital',      emoji: '💻', label: 'Цифровые товары' },
  { id: 'services',     emoji: '🛠',  label: 'Услуги' },
  { id: 'other',        emoji: '📦', label: 'Другое' },
]

const LEGAL_OPTIONS = [
  { id: 'individual',    emoji: '🚀', label: 'Физлицо',        sub: 'Без оформления, начните продавать сейчас' },
  { id: 'self_employed', emoji: '📋', label: 'Самозанятый',    sub: '4% налог, доступны Click и Payme' },
  { id: 'ip',            emoji: '🏢', label: 'ИП',             sub: 'Индивидуальный предприниматель' },
  { id: 'llc',           emoji: '🏛',  label: 'ООО / Юр.лицо', sub: 'Полная интеграция с Click и Payme' },
]

const TYPOGRAPHY_BUNDLES = [
  { id: 'modern',    label: 'Современный', desc: 'Чистый и технологичный',   style: { fontWeight: 600, letterSpacing: '0.03em' } },
  { id: 'editorial', label: 'Editorial',   desc: 'Премиум, классика',         style: { fontStyle: 'italic' as const, fontFamily: 'Georgia, serif' } },
  { id: 'bold',      label: 'Жирный',      desc: 'Выразительный, яркий',      style: { fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em' } },
  { id: 'warm',      label: 'Тёплый',      desc: 'Дружелюбный, уютный',       style: { fontWeight: 500, letterSpacing: '-0.01em' } },
  { id: 'minimal',   label: 'Минимал',     desc: 'Сдержанный, воздушный',     style: { fontWeight: 300, letterSpacing: '0.12em' } },
]

const ACCENT_COLORS = [
  { id: 'forest',   hex: '#2D6A4F', label: 'Лес'     },
  { id: 'emerald',  hex: '#00B383', label: 'Изумруд' },
  { id: 'mint',     hex: '#4ECDC4', label: 'Мята'    },
  { id: 'lime',     hex: '#8BC34A', label: 'Лайм'    },
  { id: 'ocean',    hex: '#1565C0', label: 'Океан'   },
  { id: 'sky',      hex: '#03A9F4', label: 'Небо'    },
  { id: 'indigo',   hex: '#5C6BC0', label: 'Индиго'  },
  { id: 'sunset',   hex: '#F4A261', label: 'Закат'   },
  { id: 'coral',    hex: '#E76F51', label: 'Коралл'  },
  { id: 'rose',     hex: '#E91E63', label: 'Роза'    },
  { id: 'graphite', hex: '#607D8B', label: 'Графит'  },
  { id: 'sand',     hex: '#C4A882', label: 'Песок'   },
]

// Sphere → typography + color defaults (from business_spheres_seed.json)
const SPHERE_DEFAULTS: Record<string, { typography: string; color: string }> = {
  fashion:      { typography: 'editorial', color: 'rose' },
  electronics:  { typography: 'modern',   color: 'indigo' },
  beauty:       { typography: 'editorial', color: 'coral' },
  food:         { typography: 'warm',     color: 'sunset' },
  flowers:      { typography: 'editorial', color: 'rose' },
  accessories:  { typography: 'editorial', color: 'rose' },
  kids:         { typography: 'bold',     color: 'sky' },
  sport:        { typography: 'bold',     color: 'lime' },
  home:         { typography: 'warm',     color: 'sand' },
  books:        { typography: 'editorial', color: 'graphite' },
  auto:         { typography: 'bold',     color: 'graphite' },
  pets:         { typography: 'warm',     color: 'sky' },
  digital:      { typography: 'modern',   color: 'ocean' },
  services:     { typography: 'minimal',  color: 'graphite' },
  other:        { typography: 'modern',   color: 'emerald' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',
  м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',
  щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}

function slugify(s: string) {
  return s.toLowerCase()
    .split('').map(c => TRANSLIT[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Steps: 0=country · 1=sphere · 2=legal · 3=name → create · 4=bot → setup · 5=visual → save · 6=success
const TOTAL_STEPS = 6

// ── Component ─────────────────────────────────────────────────────────────────

export function Onboarding({ tgUser: _tgUser, onDone }: Props) {
  const [step, setStep]               = useState(0)
  const [country, setCountry]         = useState('UZ')
  const [category, setCategory]       = useState('')
  const [legal, setLegal]             = useState('individual')
  const [name, setName]               = useState('')
  const [botToken, setBotToken]       = useState('')
  const [typography, setTypography]   = useState('modern')
  const [accentColor, setAccentColor] = useState('emerald')
  const [botUsername, setBotUsername] = useState('')
  const [botSkipped, setBotSkipped]   = useState(false)
  const [error, setError]             = useState('')
  const [tenant, setTenant]           = useState<any>(null)

  const currency = COUNTRIES.find(c => c.code === country)?.currency ?? 'UZS'

  const handleSelectCategory = (id: string) => {
    setCategory(id)
    const defaults = SPHERE_DEFAULTS[id]
    if (defaults) { setTypography(defaults.typography); setAccentColor(defaults.color) }
  }

  // Step 3 → create tenant
  const createMutation = useMutation({
    mutationFn: () => api.seller.onboard({
      name: name.trim(),
      slug: slugify(name.trim()),
      country,
      currency,
      business_category: category,
      legal_status: legal,
    }),
    onSuccess: (t) => { setTenant(t); setStep(4) },
    onError: (e: Error) => {
      const msg = e.message
      if (msg.includes('already exists')) {
        setError('Магазин уже создан. Попробуйте перезапустить приложение.')
      } else if (msg.includes('already taken')) {
        setError('Такое название уже занято. Попробуйте другое.')
      } else if (msg === 'Load failed' || msg === 'Failed to fetch' || msg.includes('network')) {
        setError('Ошибка соединения. Проверьте интернет и нажмите «Создать магазин» ещё раз.')
      } else {
        try { setError(JSON.parse(msg)?.detail ?? msg) } catch { setError(msg) }
      }
    },
  })

  function friendlyError(e: Error): string {
    const msg = e.message
    if (msg === 'Load failed' || msg === 'Failed to fetch' || msg.includes('network')) {
      return 'Ошибка соединения. Проверьте интернет и попробуйте снова.'
    }
    try { return JSON.parse(msg)?.detail ?? msg } catch { return msg }
  }

  // Step 4 → connect bot
  const botMutation = useMutation({
    mutationFn: () => api.seller.setupBot(botToken.trim()),
    onSuccess: (data) => { setBotUsername(data.bot_username); setStep(5) },
    onError: (e: Error) => setError(friendlyError(e)),
  })

  // Step 5 → save visual identity
  const themeMutation = useMutation({
    mutationFn: () => api.seller.updateSettings({ typography_bundle: typography, accent_color: accentColor }),
    onSuccess: () => setStep(6),
    onError: (e: Error) => setError(friendlyError(e)),
  })

  const isPending = createMutation.isPending || botMutation.isPending || themeMutation.isPending

  const canNext = () => {
    if (step === 0) return !!country
    if (step === 1) return !!category
    if (step === 2) return !!legal
    if (step === 3) return name.trim().length >= 2
    if (step === 4) return botToken.trim().length > 10
    if (step === 5) return true
    return false
  }

  const handleNext = () => {
    setError('')
    if (step < 3)  { setStep(s => s + 1); return }
    if (step === 3) { createMutation.mutate(); return }
    if (step === 4) { botMutation.mutate(); return }
    if (step === 5) { themeMutation.mutate(); return }
  }

  const handleBack = () => { setError(''); setStep(s => s - 1) }

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === 6) {
    const accent = ACCENT_COLORS.find(c => c.id === accentColor)?.hex ?? '#00B383'
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 26, color: 'var(--ink)', marginBottom: 10 }}>
          Магазин готов!
        </h1>
        {botUsername ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24, maxWidth: 280 }}>
              Бот <b>@{botUsername}</b> настроен. Поделитесь ссылкой с покупателями — они откроют магазин прямо в Telegram.
            </p>
            <div style={{
              padding: '14px 20px', borderRadius: 14, marginBottom: 14, width: '100%', maxWidth: 300,
              background: `${accent}18`, border: `1px solid ${accent}40`,
            }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: accent, fontWeight: 700 }}>
                t.me/{botUsername}
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(`https://t.me/${botUsername}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                padding: '11px 22px', borderRadius: 12,
                background: accent, color: 'white', fontSize: 14, fontWeight: 600,
              }}
            >
              <Icon name="copy" size={15} color="white"/> Скопировать ссылку
            </button>
          </>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24, maxWidth: 280 }}>
            Магазин создан. Добавьте бота в Настройках → «Подключить бота», чтобы поделиться им с покупателями.
          </p>
        )}
        <button
          onClick={() => onDone(tenant)}
          style={{
            padding: '14px 32px', borderRadius: 14,
            background: 'var(--subtle)', color: 'var(--ink)',
            fontWeight: 700, fontSize: 15,
          }}
        >
          Открыть панель управления →
        </button>
      </div>
    )
  }

  // ── Wizard steps 0–5 ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Progress bar */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 999,
              background: i <= step ? 'var(--accent)' : 'var(--border)',
              opacity: i < step ? 0.35 : 1,
              transition: 'all 0.3s',
            }}/>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Шаг {step + 1} из {TOTAL_STEPS}</div>
      </div>

      <div className="screen-scroll" style={{ flex: 1, padding: '0 16px 120px' }}>

        {/* ── Step 0: Country ─────────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginBottom: 6, marginTop: 16 }}>
              В какой стране вы продаёте?
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
              Влияет на валюту и доступные платёжные системы
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => setCountry(c.code)} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px', borderRadius: 14, textAlign: 'left',
                  border: `1.5px solid ${country === c.code ? 'var(--accent)' : 'var(--border)'}`,
                  background: country === c.code ? 'var(--accent-soft)' : 'var(--card)',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.currency}</div>
                  </div>
                  {country === c.code && (
                    <div style={{
                      width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="check" size={12} color="white"/>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 1: Business sphere ──────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginBottom: 6, marginTop: 16 }}>
              Что вы продаёте?
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
              Оформление и настройки адаптируются под вашу сферу
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {BUSINESS_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => handleSelectCategory(c.id)} style={{
                  padding: '14px 12px', borderRadius: 14, textAlign: 'left',
                  border: `1.5px solid ${category === c.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: category === c.id ? 'var(--accent-soft)' : 'var(--card)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{c.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{c.label}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Legal status ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginBottom: 6, marginTop: 16 }}>
              Как вы оформлены?
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
              Влияет на доступные способы оплаты
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LEGAL_OPTIONS.map(o => (
                <button key={o.id} onClick={() => setLegal(o.id)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                  border: `1.5px solid ${legal === o.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: legal === o.id ? 'var(--accent-soft)' : 'var(--card)',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{o.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{o.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{o.sub}</div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 2,
                    border: `2px solid ${legal === o.id ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {legal === o.id && <div style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--accent)' }}/>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Store name ──────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginBottom: 6, marginTop: 16 }}>
              Как называется ваш магазин?
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
              Покупатели увидят это название в Telegram
            </p>
            <input
              placeholder="Например: Ботаник Flowers"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              autoFocus
              style={{
                width: '100%', height: 52, padding: '0 16px',
                borderRadius: 14, background: 'var(--card)',
                border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                outline: 'none', fontSize: 16, color: 'var(--ink)',
              }}
            />
            {error && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Bot token ───────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginBottom: 6, marginTop: 16 }}>
              Подключите своего бота
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              Покупатели будут открывать ваш магазин через <b>собственного</b> Telegram-бота.
            </p>

            <div style={{ padding: 16, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Как получить токен:</div>
              {[
                { n: '1', text: 'Откройте ', link: '@BotFather', href: 'https://t.me/BotFather' },
                { n: '2', text: 'Отправьте команду ', code: '/newbot' },
                { n: '3', text: 'Введите имя и username бота' },
                { n: '4', text: 'Скопируйте токен и вставьте ниже' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 999, flexShrink: 0, fontSize: 11, fontWeight: 700,
                    background: 'var(--accent)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{s.n}</div>
                  <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                    {s.text}
                    {s.link && <a href={s.href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>{s.link}</a>}
                    {s.code && <code style={{ background: 'var(--subtle)', padding: '1px 6px', borderRadius: 5, fontFamily: 'JetBrains Mono', fontSize: 12 }}>{s.code}</code>}
                  </span>
                </div>
              ))}
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', display: 'block', marginBottom: 8 }}>
              Токен бота
            </label>
            <input
              placeholder="123456789:AABBccDDeeFF..."
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              style={{
                width: '100%', height: 48, padding: '0 14px',
                borderRadius: 12, background: 'var(--card)',
                border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                outline: 'none', fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--ink)',
              }}
            />
            {error && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              Хранится в зашифрованном виде
            </div>
          </>
        )}

        {/* ── Step 5: Visual identity ─────────────────────────────────────── */}
        {step === 5 && (
          <>
            <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginBottom: 6, marginTop: 16 }}>
              Оформление магазина
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
              Подобрали под вашу сферу — можно изменить в любой момент
            </p>

            {/* Typography */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', marginBottom: 12 }}>
                Стиль шрифтов
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TYPOGRAPHY_BUNDLES.map(b => (
                  <button key={b.id} onClick={() => setTypography(b.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 14, textAlign: 'left',
                    border: `1.5px solid ${typography === b.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: typography === b.id ? 'var(--accent-soft)' : 'var(--card)',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: typography === b.id ? 'var(--accent)' : 'var(--subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17,
                      color: typography === b.id ? 'white' : 'var(--ink)',
                      ...b.style,
                    }}>Аа</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{b.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.desc}</div>
                    </div>
                    {typography === b.id && (
                      <div style={{
                        width: 20, height: 20, borderRadius: 999, background: 'var(--accent)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="check" size={11} color="white"/>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)', marginBottom: 12 }}>
                Акцентный цвет
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {ACCENT_COLORS.map(c => (
                  <button key={c.id} onClick={() => setAccentColor(c.id)} title={c.label} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '8px 4px', borderRadius: 12,
                    border: `2px solid ${accentColor === c.id ? c.hex : 'transparent'}`,
                    background: accentColor === c.id ? `${c.hex}18` : 'transparent',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 999, background: c.hex,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: accentColor === c.id ? `0 0 0 3px ${c.hex}44` : 'none',
                    }}>
                      {accentColor === c.id && <Icon name="check" size={14} color="white"/>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.2, textAlign: 'center' }}>{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 20, padding: '10px 14px', borderRadius: 10, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
          </>
        )}

      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 30,
        padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button onClick={handleBack} disabled={isPending} style={{
              width: 52, height: 52, borderRadius: 14, background: 'var(--subtle)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="arrowLeft" size={18}/>
            </button>
          )}
          <button
            disabled={!canNext() || isPending}
            onClick={handleNext}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: canNext() && !isPending ? 'var(--accent)' : 'var(--subtle)',
              color:      canNext() && !isPending ? 'white'          : 'var(--muted)',
              fontWeight: 700, fontSize: 15, transition: 'background 0.2s',
            }}
          >
            {isPending
              ? step === 3 ? 'Создаём магазин...'
              : step === 4 ? 'Подключаем бота...'
              : 'Сохраняем...'
              : step < 3 ? 'Далее →'
              : step === 3 ? 'Создать магазин'
              : step === 4 ? 'Подключить бота'
              : step === 5 ? 'Готово →'
              : 'Далее →'
            }
          </button>
        </div>

        {/* Skip bot step */}
        {step === 4 && !isPending && (
          <button
            onClick={() => { setBotSkipped(true); setStep(5) }}
            style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0', textAlign: 'center' }}
          >
            Пропустить — настрою позже
          </button>
        )}
      </div>
    </div>
  )
}
