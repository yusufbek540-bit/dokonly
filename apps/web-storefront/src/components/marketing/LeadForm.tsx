'use client'

import { Suspense, useState } from 'react'
import type { FormEvent } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { submitMarketingLead, type MarketingLeadInput } from '@/lib/marketing/leads'

interface LeadFormProps {
  locale: 'ru' | 'uz'
  defaultNiche?: string
  variant?: 'standalone' | 'embedded'
}

type LeadFormState = Pick<
  MarketingLeadInput,
  'name' | 'telegram_username' | 'phone' | 'email' | 'business_name' | 'niche' | 'monthly_order_volume' | 'message'
>

const copy = {
  ru: {
    title: 'Заявка на консультацию',
    intro: 'Оставьте контакты, и мы покажем, как Dokonly подойдет вашей нише.',
    name: 'Имя',
    telegram: 'Telegram',
    phone: 'Телефон',
    email: 'Email',
    businessName: 'Название бизнеса',
    niche: 'Ниша',
    monthlyOrderVolume: 'Заказов в месяц',
    message: 'Что хотите продавать',
    optional: 'необязательно',
    submit: 'Отправить заявку',
    submitting: 'Отправляем...',
    success: 'Спасибо. Мы напишем вам в Telegram.',
    contactError: 'Укажите Telegram, телефон или email.',
    serverError: 'Не удалось отправить заявку. Попробуйте еще раз.',
    orderOptions: ['До 50', '50-200', '200-500', 'Больше 500'],
  },
  uz: {
    title: 'Konsultatsiya arizasi',
    intro: 'Kontaktlaringizni qoldiring, Dokonly sohangizga qanday mos kelishini ko‘rsatamiz.',
    name: 'Ism',
    telegram: 'Telegram',
    phone: 'Telefon',
    email: 'Email',
    businessName: 'Biznes nomi',
    niche: 'Soha',
    monthlyOrderVolume: 'Oyiga buyurtmalar',
    message: 'Nima sotmoqchisiz',
    optional: 'ixtiyoriy',
    submit: 'Ariza yuborish',
    submitting: 'Yuborilmoqda...',
    success: 'Rahmat. Sizga Telegram’da yozamiz.',
    contactError: 'Telegram, telefon yoki email kiriting.',
    serverError: 'Arizani yuborib bo‘lmadi. Yana urinib ko‘ring.',
    orderOptions: ['50 gacha', '50-200', '200-500', '500 dan ko‘p'],
  },
} as const

const initialState: LeadFormState = {
  name: '',
  telegram_username: '',
  phone: '',
  email: '',
  business_name: '',
  niche: '',
  monthly_order_volume: '',
  message: '',
}

function clean(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const formClass = {
  standalone: 'rounded-lg border border-emerald-200 bg-white p-5 shadow-sm md:p-6',
  embedded: 'bg-transparent',
} as const

function LeadFormFields({ locale, defaultNiche, variant = 'standalone' }: LeadFormProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const text = copy[locale]
  const [form, setForm] = useState<LeadFormState>({ ...initialState, niche: defaultNiche ?? '' })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof LeadFormState, value: string) {
    setError(null)
    setStatus('idle')
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const hasContact = Boolean(clean(form.telegram_username ?? '') || clean(form.phone ?? '') || clean(form.email ?? ''))
    if (!hasContact) {
      setError(text.contactError)
      return
    }

    setStatus('submitting')
    const result = await submitMarketingLead({
      locale,
      name: form.name.trim(),
      telegram_username: clean(form.telegram_username ?? ''),
      phone: clean(form.phone ?? ''),
      email: clean(form.email ?? ''),
      business_name: clean(form.business_name ?? ''),
      niche: form.niche.trim(),
      monthly_order_volume: clean(form.monthly_order_volume ?? ''),
      message: clean(form.message ?? ''),
      source_page: pathname,
      utm_source: clean(searchParams.get('utm_source') ?? ''),
      utm_medium: clean(searchParams.get('utm_medium') ?? ''),
      utm_campaign: clean(searchParams.get('utm_campaign') ?? ''),
      utm_content: clean(searchParams.get('utm_content') ?? ''),
      utm_term: clean(searchParams.get('utm_term') ?? ''),
    }).catch(() => ({ ok: false as const, message: 'Request failed' }))

    if (result.ok) {
      setStatus('success')
      setForm({ ...initialState, niche: defaultNiche ?? '' })
      return
    }

    setStatus('idle')
    setError(text.serverError)
  }

  return (
    <form onSubmit={handleSubmit} className={formClass[variant]} aria-busy={status === 'submitting'}>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">{text.title}</p>
        <p className="mt-3 text-sm leading-6 text-gray-600">{text.intro}</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-800">
          {text.name}
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 px-3 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold text-gray-800">
          {text.telegram}
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 px-3 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.telegram_username}
            onChange={(event) => updateField('telegram_username', event.target.value)}
            placeholder="@username"
          />
        </label>
        <label className="block text-sm font-semibold text-gray-800">
          {text.phone} <span className="font-normal text-gray-500">({text.optional})</span>
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 px-3 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            inputMode="tel"
          />
        </label>
        <label className="block text-sm font-semibold text-gray-800">
          {text.email} <span className="font-normal text-gray-500">({text.optional})</span>
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 px-3 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            type="email"
          />
        </label>
        <label className="block text-sm font-semibold text-gray-800">
          {text.businessName} <span className="font-normal text-gray-500">({text.optional})</span>
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 px-3 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.business_name}
            onChange={(event) => updateField('business_name', event.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold text-gray-800">
          {text.niche}
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 px-3 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.niche}
            onChange={(event) => updateField('niche', event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold text-gray-800">
          {text.monthlyOrderVolume}
          <select
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-base text-gray-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.monthly_order_volume}
            onChange={(event) => updateField('monthly_order_volume', event.target.value)}
          >
            <option value="">{text.optional}</option>
            {text.orderOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-gray-800 sm:col-span-2">
          {text.message} <span className="font-normal text-gray-500">({text.optional})</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-lg border border-gray-200 px-3 py-3 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={form.message}
            onChange={(event) => updateField('message', event.target.value)}
          />
        </label>
      </div>

      <input type="hidden" name="utm_source" value={searchParams.get('utm_source') ?? ''} />
      <input type="hidden" name="utm_medium" value={searchParams.get('utm_medium') ?? ''} />
      <input type="hidden" name="utm_campaign" value={searchParams.get('utm_campaign') ?? ''} />
      <input type="hidden" name="utm_content" value={searchParams.get('utm_content') ?? ''} />
      <input type="hidden" name="utm_term" value={searchParams.get('utm_term') ?? ''} />

      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {status === 'success' ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status" aria-live="polite">
          {text.success}
        </p>
      ) : null}
      {status === 'submitting' ? (
        <p className="sr-only" role="status" aria-live="polite">
          {text.submitting}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {status === 'submitting' ? text.submitting : text.submit}
      </button>
    </form>
  )
}

export function LeadForm(props: LeadFormProps) {
  const pathname = usePathname()
  const formKey = `${pathname}:${props.defaultNiche ?? ''}`

  return (
    <Suspense fallback={<div className="min-h-[520px] rounded-lg border border-emerald-200 bg-white" />}>
      <LeadFormFields key={formKey} {...props} />
    </Suspense>
  )
}
