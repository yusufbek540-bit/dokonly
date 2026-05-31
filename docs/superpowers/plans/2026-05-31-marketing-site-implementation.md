# Dokonly Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Russian-first and Uzbek-supported Dokonly marketing website inside `apps/web-storefront`, including niche pages, SEO content, an interactive phone demo, and lead capture with backend storage and Telegram notification.

**Architecture:** Keep the existing store routes under `/:slug` and add explicit localized marketing routes for the public website. Use typed local content modules for v1 so SEO pages are static and reviewable. Store marketing leads in the existing FastAPI/PostgreSQL backend through `POST /api/v1/public/leads`, with notification failure isolated from lead submission success.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, TypeScript, FastAPI, Pydantic v2, SQLAlchemy async, PostgreSQL, Telegram Bot API.

---

## Source Spec

- Design spec: `docs/superpowers/specs/2026-05-31-marketing-site-design.md`
- Current branch: `codex/marketing-site-plan`
- Main frontend app: `apps/web-storefront`
- Main backend app: `backend`

## Scope Check

This plan keeps the marketing website and lead capture endpoint together because the lead form cannot be verified end-to-end without the backend endpoint. The work is split into small tasks so each commit leaves the repo in a buildable state.

## File Structure

### Frontend Content And Utilities

- Create `apps/web-storefront/src/content/marketing/types.ts`
  - Owns locale, route, CTA, page metadata, niche, blog, help, and FAQ TypeScript types.
- Create `apps/web-storefront/src/content/marketing/routes.ts`
  - Owns localized route constants and English-route redirect targets.
- Create `apps/web-storefront/src/content/marketing/site.ts`
  - Owns global navigation, CTAs, trust strip, hero copy, problem/solution copy, final CTA copy, and footer content.
- Create `apps/web-storefront/src/content/marketing/niches.ts`
  - Owns all eight niche records in Russian and Uzbek.
- Create `apps/web-storefront/src/content/marketing/blog.ts`
  - Owns first SEO blog batch in Russian and Uzbek.
- Create `apps/web-storefront/src/content/marketing/help.ts`
  - Owns help center categories and article bodies in Russian and Uzbek.
- Create `apps/web-storefront/src/content/marketing/faqs.ts`
  - Owns reusable FAQ items in Russian and Uzbek.
- Create `apps/web-storefront/src/lib/marketing/i18n.ts`
  - Owns locale parsing, alternate-locale lookup, and label helpers.
- Create `apps/web-storefront/src/lib/marketing/seo.ts`
  - Owns metadata builders, canonical URLs, hreflang alternates, and JSON-LD builders.
- Create `apps/web-storefront/src/lib/marketing/shopRedirect.ts`
  - Owns existing store redirect behavior for `?shop=` and `<slug>.dokonly.com`.
- Create `apps/web-storefront/src/lib/marketing/leads.ts`
  - Owns the frontend lead submission client.

### Frontend Components

- Create `apps/web-storefront/src/components/marketing/MarketingLayout.tsx`
- Create `apps/web-storefront/src/components/marketing/MarketingHeader.tsx`
- Create `apps/web-storefront/src/components/marketing/MarketingFooter.tsx`
- Create `apps/web-storefront/src/components/marketing/MarketingButton.tsx`
- Create `apps/web-storefront/src/components/marketing/PhoneDemo.tsx`
- Create `apps/web-storefront/src/components/marketing/LeadForm.tsx`
- Create `apps/web-storefront/src/components/marketing/NicheCard.tsx`
- Create `apps/web-storefront/src/components/marketing/BlogCard.tsx`
- Create `apps/web-storefront/src/components/marketing/HelpSearch.tsx`
- Create `apps/web-storefront/src/components/marketing/StructuredData.tsx`

### Frontend Pages

- Modify `apps/web-storefront/src/app/page.tsx`
- Create `apps/web-storefront/src/app/uz/page.tsx`
- Create `apps/web-storefront/src/app/nishi/page.tsx`
- Create `apps/web-storefront/src/app/nishi/[slug]/page.tsx`
- Create `apps/web-storefront/src/app/uz/sohalar/page.tsx`
- Create `apps/web-storefront/src/app/uz/sohalar/[slug]/page.tsx`
- Create `apps/web-storefront/src/app/blog/page.tsx`
- Create `apps/web-storefront/src/app/blog/[slug]/page.tsx`
- Create `apps/web-storefront/src/app/uz/blog/page.tsx`
- Create `apps/web-storefront/src/app/uz/blog/[slug]/page.tsx`
- Create `apps/web-storefront/src/app/pomoshch/page.tsx`
- Create `apps/web-storefront/src/app/pomoshch/[slug]/page.tsx`
- Create `apps/web-storefront/src/app/uz/yordam/page.tsx`
- Create `apps/web-storefront/src/app/uz/yordam/[slug]/page.tsx`
- Create `apps/web-storefront/src/app/namuna/page.tsx`
- Create `apps/web-storefront/src/app/uz/namuna/page.tsx`
- Create `apps/web-storefront/src/app/tarify/page.tsx`
- Create `apps/web-storefront/src/app/uz/tariflar/page.tsx`
- Create `apps/web-storefront/src/app/kontakt/page.tsx`
- Create `apps/web-storefront/src/app/uz/aloqa/page.tsx`
- Create `apps/web-storefront/src/app/sitemap.ts`
- Create `apps/web-storefront/src/app/robots.ts`
- Modify `apps/web-storefront/src/app/layout.tsx`
- Modify `apps/web-storefront/src/app/globals.css`
- Modify `apps/web-storefront/next.config.js`

### Backend Lead Capture

- Create `backend/app/models/marketing.py`
- Create `backend/app/schemas/marketing.py`
- Create `backend/app/services/marketing_leads.py`
- Create `backend/tests/test_marketing_leads.py`
- Modify `backend/app/api/v1/endpoints/public.py`
- Modify `backend/app/core/config.py`
- Modify `backend/app/models/__init__.py`
- Modify `backend/app/main.py`
- Modify `.env.example`

---

### Task 1: Frontend Route And Content Contracts

**Files:**
- Create: `apps/web-storefront/src/content/marketing/types.ts`
- Create: `apps/web-storefront/src/content/marketing/routes.ts`
- Create: `apps/web-storefront/src/content/marketing/site.ts`
- Create: `apps/web-storefront/src/content/marketing/niches.ts`
- Create: `apps/web-storefront/src/content/marketing/blog.ts`
- Create: `apps/web-storefront/src/content/marketing/help.ts`
- Create: `apps/web-storefront/src/content/marketing/faqs.ts`
- Create: `apps/web-storefront/src/lib/marketing/i18n.ts`
- Create: `apps/web-storefront/src/lib/marketing/seo.ts`
- Create: `apps/web-storefront/src/lib/marketing/shopRedirect.ts`
- Modify: `apps/web-storefront/next.config.js`

- [ ] **Step 1: Add shared marketing types**

Create `apps/web-storefront/src/content/marketing/types.ts` with these exports:

```ts
export type Locale = 'ru' | 'uz'

export type LocalizedText = Record<Locale, string>

export interface LocalizedRoute {
  ru: string
  uz: string
}

export interface PageSeo {
  title: LocalizedText
  description: LocalizedText
  ogImage?: string
}

export interface CtaCopy {
  label: LocalizedText
  href: LocalizedRoute
}

export interface Niche {
  id: string
  slug: LocalizedRoute
  name: LocalizedText
  h1: LocalizedText
  promise: LocalizedText
  description: LocalizedText
  painPoints: Record<Locale, string[]>
  benefits: Record<Locale, string[]>
  buyerFlow: Record<Locale, string[]>
  proof: LocalizedText
  faqs: Array<{ question: LocalizedText; answer: LocalizedText }>
  image: string
  relatedBlogIds: string[]
}

export interface BlogPost {
  id: string
  slug: LocalizedRoute
  title: LocalizedText
  description: LocalizedText
  category: LocalizedText
  date: string
  readingMinutes: number
  body: Record<Locale, string[]>
  relatedNicheIds: string[]
}

export interface HelpArticle {
  id: string
  slug: LocalizedRoute
  categoryId: string
  title: LocalizedText
  description: LocalizedText
  steps: Record<Locale, string[]>
  relatedArticleIds: string[]
}

export interface FaqItem {
  question: LocalizedText
  answer: LocalizedText
}
```

- [ ] **Step 2: Add localized routes and redirect map**

Create `apps/web-storefront/src/content/marketing/routes.ts`:

```ts
import type { Locale, LocalizedRoute } from './types'

export const defaultLocale: Locale = 'ru'
export const locales: Locale[] = ['ru', 'uz']

export const marketingRoutes = {
  home: { ru: '/', uz: '/uz' },
  niches: { ru: '/nishi', uz: '/uz/sohalar' },
  blog: { ru: '/blog', uz: '/uz/blog' },
  help: { ru: '/pomoshch', uz: '/uz/yordam' },
  demo: { ru: '/namuna', uz: '/uz/namuna' },
  pricing: { ru: '/tarify', uz: '/uz/tariflar' },
  contact: { ru: '/kontakt', uz: '/uz/aloqa' },
} satisfies Record<string, LocalizedRoute>

export const englishPathRedirects: Record<string, string> = {
  '/ru': '/',
  '/niches': '/nishi',
  '/help': '/pomoshch',
  '/demo': '/namuna',
  '/pricing': '/tarify',
  '/contact': '/kontakt',
}

export function getRoute(route: LocalizedRoute, locale: Locale): string {
  return route[locale]
}

export function localePrefix(locale: Locale): string {
  return locale === 'uz' ? '/uz' : ''
}
```

- [ ] **Step 3: Add site-level copy**

Create `apps/web-storefront/src/content/marketing/site.ts` with Russian and Uzbek public labels only:

```ts
import { marketingRoutes } from './routes'

export const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dokonly.com'
export const createStoreBotUrl = process.env.NEXT_PUBLIC_CREATE_STORE_BOT_URL ?? 'https://t.me/dokonlybot'
export const telegramExampleUrl = process.env.NEXT_PUBLIC_DEMO_BOT_URL ?? ''

export const navigation = [
  { label: { ru: 'Продукт', uz: 'Mahsulot' }, href: marketingRoutes.home },
  { label: { ru: 'Ниши', uz: 'Sohalar' }, href: marketingRoutes.niches },
  { label: { ru: 'Демо', uz: 'Namuna' }, href: marketingRoutes.demo },
  { label: { ru: 'Тарифы', uz: 'Tariflar' }, href: marketingRoutes.pricing },
  { label: { ru: 'Блог', uz: 'Blog' }, href: marketingRoutes.blog },
  { label: { ru: 'Помощь', uz: 'Yordam' }, href: marketingRoutes.help },
]

export const ctas = {
  createStore: { label: { ru: 'Создать магазин', uz: 'Do‘kon yaratish' }, href: { ru: createStoreBotUrl, uz: createStoreBotUrl } },
  viewDemo: { label: { ru: 'Посмотреть пример', uz: 'Namunani ko‘rish' }, href: marketingRoutes.demo },
  openTelegramExample: { label: { ru: 'Открыть пример в Telegram', uz: 'Telegram’da namunani ochish' }, href: { ru: telegramExampleUrl, uz: telegramExampleUrl } },
  leadOffer: { label: { ru: 'Получить пример магазина для моей ниши + консультацию', uz: 'Mening soham uchun do‘kon namunasi va konsultatsiya olish' }, href: marketingRoutes.contact },
}

export const homeCopy = {
  seo: {
    title: {
      ru: 'Dokonly - Telegram-магазин за 10 минут',
      uz: 'Dokonly - Telegram do‘kon 10 daqiqada',
    },
    description: {
      ru: 'Запустите каталог, прием заказов, промокоды и CRM для продаж в Telegram без разработчика.',
      uz: 'Telegram ichida katalog, buyurtmalar, promokodlar va CRMni dasturchisiz ishga tushiring.',
    },
  },
  hero: {
    h1: { ru: 'Запустите магазин в Telegram за 10 минут', uz: 'Telegram’da do‘konni 10 daqiqada ishga tushiring' },
    body: {
      ru: 'Dokonly помогает продавцам принимать заказы, показывать каталог, возвращать покупателей и управлять клиентами прямо в Telegram.',
      uz: 'Dokonly sotuvchilarga katalog ko‘rsatish, buyurtma qabul qilish, mijozlarni qaytarish va Telegram ichida savdoni boshqarishga yordam beradi.',
    },
  },
  trust: {
    ru: ['Без разработчика', 'Каталог и заказы в Telegram', 'Промокоды и брошенные корзины', 'CRM для повторных продаж'],
    uz: ['Dasturchisiz', 'Katalog va buyurtmalar Telegram’da', 'Promokodlar va tashlab ketilgan savatlar', 'Takroriy savdolar uchun CRM'],
  },
  problems: {
    ru: ['Заказы теряются в личных сообщениях.', 'Продавец снова и снова отвечает на одни и те же вопросы.', 'Покупатели забывают товары в корзине.', 'Нет простой CRM для повторных продаж.', 'Telegram-канал дает внимание, но не всегда приводит к заказам.'],
    uz: ['Buyurtmalar shaxsiy xabarlarda yo‘qolib ketadi.', 'Sotuvchi bir xil savollarga qayta-qayta javob beradi.', 'Mijozlar savatdagi mahsulotlarni unutib qo‘yadi.', 'Takroriy savdolar uchun sodda CRM yo‘q.', 'Telegram-kanal e’tibor beradi, lekin har doim buyurtmaga olib kelmaydi.'],
  },
  solutions: {
    ru: ['Удобный каталог.', 'Единый путь оформления заказа.', 'Панель заказов для продавца.', 'Заметки и теги по клиентам.', 'Промокоды.', 'Напоминания о корзине.', 'Сценарии для бота и канала.'],
    uz: ['Qulay katalog.', 'Buyurtmani rasmiylashtirishning yagona yo‘li.', 'Sotuvchi uchun buyurtmalar paneli.', 'Mijozlar bo‘yicha izohlar va teglar.', 'Promokodlar.', 'Savat eslatmalari.', 'Bot va kanal uchun ssenariylar.'],
  },
}
```

- [ ] **Step 4: Add niche, blog, help, and FAQ content**

Create `niches.ts`, `blog.ts`, `help.ts`, and `faqs.ts` using the exact niche names, slugs, blog titles, and help routes from `docs/superpowers/specs/2026-05-31-marketing-site-design.md`. Each exported array must use `satisfies Niche[]`, `satisfies BlogPost[]`, `satisfies HelpArticle[]`, or `satisfies FaqItem[]` so `pnpm --filter web-storefront typecheck` fails when a Russian or Uzbek field is missing.

Required niche ids:

```ts
export const requiredNicheIds = [
  'fashion-boutiques',
  'beauty-cosmetics',
  'food-cafes-bakeries',
  'flowers-gifts',
  'electronics-accessories',
  'home-decor-furniture',
  'kids-products',
  'services-courses-bookings',
] as const
```

Required first blog ids:

```ts
export const requiredBlogIds = [
  'create-telegram-store-uzbekistan',
  'telegram-mini-app-sales',
  'telegram-orders-without-chaos',
  'telegram-bot-online-store-guide',
  'boutique-sell-clothes-telegram',
  'cosmetics-repeat-purchases',
  'cafe-bakery-preorders-telegram',
  'flowers-gifts-telegram-store',
  'promo-codes-telegram-store',
  'recover-abandoned-carts',
  'crm-small-telegram-store',
  'telegram-channel-sales-showcase',
] as const
```

Required help ids:

```ts
export const requiredHelpIds = [
  'getting-started',
  'create-store',
  'connect-telegram-bot',
  'add-products',
  'import-products',
  'manage-orders',
  'payments',
  'delivery',
  'customers-crm',
  'promos',
  'cart-reminders',
  'channel-integration',
  'analytics',
  'troubleshooting',
] as const
```

- [ ] **Step 5: Add i18n helpers**

Create `apps/web-storefront/src/lib/marketing/i18n.ts`:

```ts
import type { Locale, LocalizedRoute, LocalizedText } from '@/content/marketing/types'

export function isLocale(value: string): value is Locale {
  return value === 'ru' || value === 'uz'
}

export function oppositeLocale(locale: Locale): Locale {
  return locale === 'ru' ? 'uz' : 'ru'
}

export function text(value: LocalizedText, locale: Locale): string {
  return value[locale]
}

export function routeFor(route: LocalizedRoute, locale: Locale): string {
  return route[locale]
}
```

- [ ] **Step 6: Add SEO helpers**

Create `apps/web-storefront/src/lib/marketing/seo.ts`:

```ts
import type { Metadata } from 'next'
import { siteBaseUrl } from '@/content/marketing/site'
import type { Locale, LocalizedRoute, PageSeo, FaqItem, BlogPost } from '@/content/marketing/types'

export function absoluteUrl(path: string): string {
  return new URL(path, siteBaseUrl).toString()
}

export function buildMetadata(seo: PageSeo, locale: Locale, route: LocalizedRoute): Metadata {
  const title = seo.title[locale]
  const description = seo.description[locale]
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(route[locale]),
      languages: {
        ru: absoluteUrl(route.ru),
        uz: absoluteUrl(route.uz),
      },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(route[locale]),
      images: seo.ogImage ? [seo.ogImage] : [],
      locale: locale === 'ru' ? 'ru_RU' : 'uz_UZ',
      type: 'website',
    },
  }
}

export function faqJsonLd(items: FaqItem[], locale: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question[locale],
      acceptedAnswer: { '@type': 'Answer', text: item.answer[locale] },
    })),
  }
}

export function articleJsonLd(post: BlogPost, locale: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title[locale],
    description: post.description[locale],
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Dokonly' },
  }
}
```

- [ ] **Step 7: Preserve shop redirect behavior**

Create `apps/web-storefront/src/lib/marketing/shopRedirect.ts`:

```ts
import { headers } from 'next/headers'

export function resolveShopRedirect(searchParams: { shop?: string }): string | null {
  if (searchParams.shop) return `/${searchParams.shop}`

  const headersList = headers()
  const host = headersList.get('host') ?? ''
  const match = host.match(/^([^.]+)\.dokonly\.com$/)
  if (match && match[1] !== 'www') return `/${match[1]}`

  return null
}
```

- [ ] **Step 8: Add English route redirects**

Modify `apps/web-storefront/next.config.js` to include:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/ru', destination: '/', permanent: true },
      { source: '/niches', destination: '/nishi', permanent: true },
      { source: '/help', destination: '/pomoshch', permanent: true },
      { source: '/demo', destination: '/namuna', permanent: true },
      { source: '/pricing', destination: '/tarify', permanent: true },
      { source: '/contact', destination: '/kontakt', permanent: true },
    ]
  },
}

module.exports = nextConfig
```

Keep any existing `nextConfig` keys that are already in the file.

- [ ] **Step 9: Verify contracts**

Run:

```bash
pnpm --filter web-storefront typecheck
```

Expected: command exits 0.

- [ ] **Step 10: Commit**

```bash
git add apps/web-storefront/src/content/marketing apps/web-storefront/src/lib/marketing apps/web-storefront/next.config.js
git commit -m "feat: add marketing content contracts"
```

---

### Task 2: Shared Marketing Layout And Styles

**Files:**
- Create: `apps/web-storefront/src/components/marketing/MarketingLayout.tsx`
- Create: `apps/web-storefront/src/components/marketing/MarketingHeader.tsx`
- Create: `apps/web-storefront/src/components/marketing/MarketingFooter.tsx`
- Create: `apps/web-storefront/src/components/marketing/MarketingButton.tsx`
- Create: `apps/web-storefront/src/components/marketing/StructuredData.tsx`
- Modify: `apps/web-storefront/src/app/layout.tsx`
- Modify: `apps/web-storefront/src/app/globals.css`

- [ ] **Step 1: Add shared button**

Create `MarketingButton.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

interface MarketingButtonProps {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

const variantClass = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'bg-white text-gray-950 ring-1 ring-gray-200 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:text-gray-950 hover:bg-gray-100',
}

export function MarketingButton({ href, children, variant = 'primary', className = '' }: MarketingButtonProps) {
  const isExternal = href.startsWith('http')
  const classes = `inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition ${variantClass[variant]} ${className}`

  if (isExternal) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  )
}
```

- [ ] **Step 2: Add structured data component**

Create `StructuredData.tsx`:

```tsx
interface StructuredDataProps {
  data: Record<string, unknown>
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

- [ ] **Step 3: Add header, footer, and layout**

Create `MarketingHeader.tsx`, `MarketingFooter.tsx`, and `MarketingLayout.tsx` using `navigation`, `ctas`, and `routeFor`. Header requirements:

- Desktop nav contains `Продукт`, `Ниши`, `Демо`, `Тарифы`, `Блог`, `Помощь` for Russian and Uzbek equivalents on Uzbek pages.
- Mobile header contains Dokonly logo text, language switch link, menu button, and sticky bottom `Создать магазин` or `Do‘kon yaratish` button.
- No public English labels.

Core `MarketingLayout.tsx` shape:

```tsx
import type { ReactNode } from 'react'
import type { Locale, LocalizedRoute } from '@/content/marketing/types'
import { MarketingHeader } from './MarketingHeader'
import { MarketingFooter } from './MarketingFooter'

interface MarketingLayoutProps {
  locale: Locale
  currentRoute: LocalizedRoute
  children: ReactNode
}

export function MarketingLayout({ locale, currentRoute, children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-950">
      <MarketingHeader locale={locale} currentRoute={currentRoute} />
      <main>{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  )
}
```

- [ ] **Step 4: Update root metadata template and font defaults**

Modify `apps/web-storefront/src/app/layout.tsx` so metadata is not store-only:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dokonly.com'),
  title: {
    default: 'Dokonly',
    template: '%s | Dokonly',
  },
  description: 'Dokonly помогает продавцам запускать магазины и принимать заказы в Telegram.',
}
```

- [ ] **Step 5: Add marketing CSS primitives**

Modify `apps/web-storefront/src/app/globals.css` with reusable classes:

```css
.marketing-shell {
  width: min(1180px, calc(100% - 32px));
  margin-inline: auto;
}

.marketing-section {
  padding-block: clamp(56px, 8vw, 104px);
}

.marketing-card {
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  border-radius: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}
```

- [ ] **Step 6: Verify**

Run:

```bash
pnpm --filter web-storefront typecheck
```

Expected: command exits 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web-storefront/src/components/marketing apps/web-storefront/src/app/layout.tsx apps/web-storefront/src/app/globals.css
git commit -m "feat: add marketing layout"
```

---

### Task 3: Homepage And Interactive Phone Demo

**Files:**
- Modify: `apps/web-storefront/src/app/page.tsx`
- Create: `apps/web-storefront/src/app/uz/page.tsx`
- Create: `apps/web-storefront/src/components/marketing/PhoneDemo.tsx`
- Create: `apps/web-storefront/src/components/marketing/NicheCard.tsx`

- [ ] **Step 1: Add `PhoneDemo`**

Create `PhoneDemo.tsx` as a client component with four localized niche tabs and six states:

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { Locale } from '@/content/marketing/types'

interface PhoneDemoProps {
  locale: Locale
}

const tabs = [
  { id: 'fashion', label: { ru: 'Одежда', uz: 'Kiyim' }, product: { ru: 'Летнее платье', uz: 'Yozgi ko‘ylak' } },
  { id: 'beauty', label: { ru: 'Косметика', uz: 'Kosmetika' }, product: { ru: 'Сыворотка для лица', uz: 'Yuz uchun serum' } },
  { id: 'food', label: { ru: 'Еда', uz: 'Taom' }, product: { ru: 'Набор круассанов', uz: 'Kruassan to‘plami' } },
  { id: 'flowers', label: { ru: 'Цветы', uz: 'Gullar' }, product: { ru: 'Букет роз', uz: 'Atirgul guldastasi' } },
]

const states = [
  { ru: 'Каталог', uz: 'Katalog' },
  { ru: 'Товар', uz: 'Mahsulot' },
  { ru: 'Корзина', uz: 'Savat' },
  { ru: 'Оформление', uz: 'Rasmiylashtirish' },
  { ru: 'Заказ продавцу', uz: 'Sotuvchiga buyurtma' },
  { ru: 'CRM', uz: 'CRM' },
]

export function PhoneDemo({ locale }: PhoneDemoProps) {
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  const [activeState, setActiveState] = useState(0)
  const tab = useMemo(() => tabs.find((item) => item.id === activeTab) ?? tabs[0], [activeTab])

  return (
    <div className="w-full max-w-[390px]">
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`min-h-9 shrink-0 rounded-lg px-3 text-sm font-semibold ${activeTab === item.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'}`}
          >
            {item.label[locale]}
          </button>
        ))}
      </div>
      <div className="rounded-[32px] bg-gray-950 p-3 shadow-2xl">
        <div className="overflow-hidden rounded-[24px] bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-bold">Dokonly</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Telegram</span>
          </div>
          <div className="space-y-4 p-4">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">{states[activeState][locale]}</p>
              <h3 className="mt-2 text-lg font-bold text-gray-950">{tab.product[locale]}</h3>
              <p className="mt-1 text-sm text-gray-600">{locale === 'ru' ? 'Цена, остатки и оформление заказа в одном месте.' : 'Narx, qoldiq va buyurtma bir joyda.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="aspect-square rounded-xl bg-gradient-to-br from-gray-100 to-emerald-50 p-3">
                  <div className="h-14 rounded-lg bg-white shadow-sm" />
                  <div className="mt-3 h-2 rounded bg-gray-300" />
                  <div className="mt-2 h-2 w-2/3 rounded bg-gray-200" />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setActiveState((activeState + 1) % states.length)}
              className="min-h-11 w-full rounded-lg bg-emerald-600 text-sm font-bold text-white"
            >
              {locale === 'ru' ? 'Следующий шаг' : 'Keyingi qadam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace root fallback with Russian homepage**

Modify `apps/web-storefront/src/app/page.tsx`:

- Keep `?shop=` and `<slug>.dokonly.com` redirect by calling `resolveShopRedirect`.
- Remove the English fallback text.
- Render the Russian homepage using `MarketingLayout`, `PhoneDemo`, niche cards, blog/help previews, and CTA sections. Task 8 adds the lead form to the lead capture section after the form component exists.
- The page must include these sections in this order: hero, trust strip, problem-to-solution, eight niche cards, how it works, feature proof, lead capture CTA, blog/help preview, FAQ, and final CTA.

Root page opening code:

```tsx
import { redirect } from 'next/navigation'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { MarketingButton } from '@/components/marketing/MarketingButton'
import { PhoneDemo } from '@/components/marketing/PhoneDemo'
import { NicheCard } from '@/components/marketing/NicheCard'
import { niches } from '@/content/marketing/niches'
import { blogPosts } from '@/content/marketing/blog'
import { helpArticles } from '@/content/marketing/help'
import { homeCopy, ctas } from '@/content/marketing/site'
import { marketingRoutes } from '@/content/marketing/routes'
import { buildMetadata } from '@/lib/marketing/seo'
import { resolveShopRedirect } from '@/lib/marketing/shopRedirect'

export const metadata = buildMetadata(homeCopy.seo, 'ru', marketingRoutes.home)

export default function RootPage({ searchParams }: { searchParams: { shop?: string } }) {
  const shopRedirect = resolveShopRedirect(searchParams)
  if (shopRedirect) redirect(shopRedirect)

  return (
    <MarketingLayout locale="ru" currentRoute={marketingRoutes.home}>
      <section className="marketing-section">
        <div className="marketing-shell grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1 className="text-5xl font-bold tracking-normal text-gray-950">{homeCopy.hero.h1.ru}</h1>
            <p className="mt-5 text-lg leading-8 text-gray-600">{homeCopy.hero.body.ru}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <MarketingButton href={ctas.createStore.href.ru}>{ctas.createStore.label.ru}</MarketingButton>
              <MarketingButton href={marketingRoutes.demo.ru} variant="secondary">{ctas.viewDemo.label.ru}</MarketingButton>
            </div>
          </div>
          <PhoneDemo locale="ru" />
        </div>
      </section>
      <section className="border-y border-gray-200 bg-white py-5">
        <div className="marketing-shell grid gap-3 text-sm font-semibold text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
          {homeCopy.trust.ru.map((item) => <div key={item}>{item}</div>)}
        </div>
      </section>
      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-8 lg:grid-cols-2">
          <div>{homeCopy.problems.ru.map((item) => <p key={item} className="mb-3 text-gray-700">{item}</p>)}</div>
          <div>{homeCopy.solutions.ru.map((item) => <p key={item} className="mb-3 font-semibold text-gray-950">{item}</p>)}</div>
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-shell grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {niches.map((niche) => <NicheCard key={niche.id} niche={niche} locale="ru" />)}
        </div>
      </section>
      <section className="marketing-section bg-white">
        <div className="marketing-shell grid gap-4 lg:grid-cols-3">
          {blogPosts.slice(0, 3).map((post) => <article key={post.id} className="marketing-card p-5"><h2 className="font-bold">{post.title.ru}</h2><p className="mt-2 text-sm text-gray-600">{post.description.ru}</p></article>)}
          {helpArticles.slice(0, 3).map((article) => <article key={article.id} className="marketing-card p-5"><h2 className="font-bold">{article.title.ru}</h2><p className="mt-2 text-sm text-gray-600">{article.description.ru}</p></article>)}
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="marketing-card p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-950">Получить пример магазина для моей ниши + консультацию</h2>
            <p className="mt-3 text-gray-600">Оставьте заявку, и мы покажем, как Dokonly будет выглядеть для вашего бизнеса.</p>
            <div className="mt-6">
              <MarketingButton href={marketingRoutes.contact.ru}>{ctas.leadOffer.label.ru}</MarketingButton>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
```

- [ ] **Step 3: Add Uzbek homepage**

Create `apps/web-storefront/src/app/uz/page.tsx` with the same section order and `locale="uz"`. Use `buildMetadata(homeCopy.seo, 'uz', marketingRoutes.home)`.

- [ ] **Step 4: Verify homepage build**

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web-storefront/src/app/page.tsx apps/web-storefront/src/app/uz/page.tsx apps/web-storefront/src/components/marketing/PhoneDemo.tsx apps/web-storefront/src/components/marketing/NicheCard.tsx
git commit -m "feat: add marketing homepage"
```

---

### Task 4: Niche Pages

**Files:**
- Create: `apps/web-storefront/src/app/nishi/page.tsx`
- Create: `apps/web-storefront/src/app/nishi/[slug]/page.tsx`
- Create: `apps/web-storefront/src/app/uz/sohalar/page.tsx`
- Create: `apps/web-storefront/src/app/uz/sohalar/[slug]/page.tsx`
- Modify: `apps/web-storefront/src/components/marketing/NicheCard.tsx`

- [ ] **Step 1: Add niche lookup helpers**

Add these exports to `apps/web-storefront/src/content/marketing/niches.ts`:

```ts
import type { Locale } from './types'

export function getNicheBySlug(slug: string, locale: Locale) {
  return niches.find((niche) => niche.slug[locale].split('/').pop() === slug) ?? null
}

export function getNicheRoute(id: string, locale: Locale) {
  const niche = niches.find((item) => item.id === id)
  return niche ? niche.slug[locale] : locale === 'ru' ? '/nishi' : '/uz/sohalar'
}
```

- [ ] **Step 2: Add Russian niche index**

Create `apps/web-storefront/src/app/nishi/page.tsx`:

```tsx
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { NicheCard } from '@/components/marketing/NicheCard'
import { marketingRoutes } from '@/content/marketing/routes'
import { niches } from '@/content/marketing/niches'
import { buildMetadata } from '@/lib/marketing/seo'

const seo = {
  title: { ru: 'Ниши для Telegram-магазина', uz: 'Telegram do‘kon uchun sohalar' },
  description: { ru: 'Выберите свою нишу и посмотрите, как Dokonly помогает продавать в Telegram.', uz: 'Sohangizni tanlang va Dokonly Telegram savdosiga qanday yordam berishini ko‘ring.' },
}

export const metadata = buildMetadata(seo, 'ru', marketingRoutes.niches)

export default function NicheIndexPage() {
  return (
    <MarketingLayout locale="ru" currentRoute={marketingRoutes.niches}>
      <section className="marketing-section">
        <div className="marketing-shell">
          <h1 className="text-4xl font-bold tracking-normal text-gray-950">Ниши, для которых подходит Dokonly</h1>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {niches.map((niche) => <NicheCard key={niche.id} niche={niche} locale="ru" />)}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
```

- [ ] **Step 3: Add Uzbek niche index**

Create `apps/web-storefront/src/app/uz/sohalar/page.tsx` with the same structure, `locale="uz"`, Uzbek H1 `Dokonly mos keladigan sohalar`, and `buildMetadata(seo, 'uz', marketingRoutes.niches)`.

- [ ] **Step 4: Add detail pages with static params**

Create Russian and Uzbek detail pages that:

- call `generateStaticParams`
- call `getNicheBySlug`
- call `notFound()` when slug is invalid
- render H1, pain points, benefits, phone/UI screenshot area, buyer flow, proof, CTA block, FAQ, related blog posts, and final CTA. Task 8 replaces the CTA block with `LeadForm` after the form component exists.
- include FAQ JSON-LD through `StructuredData`

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
```

Expected: both commands exit 0 and build lists static niche paths for Russian and Uzbek.

- [ ] **Step 5: Commit**

```bash
git add apps/web-storefront/src/app/nishi apps/web-storefront/src/app/uz/sohalar apps/web-storefront/src/content/marketing/niches.ts apps/web-storefront/src/components/marketing/NicheCard.tsx
git commit -m "feat: add bilingual niche pages"
```

---

### Task 5: Blog Pages

**Files:**
- Create: `apps/web-storefront/src/components/marketing/BlogCard.tsx`
- Create: `apps/web-storefront/src/app/blog/page.tsx`
- Create: `apps/web-storefront/src/app/blog/[slug]/page.tsx`
- Create: `apps/web-storefront/src/app/uz/blog/page.tsx`
- Create: `apps/web-storefront/src/app/uz/blog/[slug]/page.tsx`
- Modify: `apps/web-storefront/src/content/marketing/blog.ts`

- [ ] **Step 1: Add blog helpers**

Add to `blog.ts`:

```ts
import type { Locale } from './types'

export function getBlogPostBySlug(slug: string, locale: Locale) {
  return blogPosts.find((post) => post.slug[locale].split('/').pop() === slug) ?? null
}

export function getRelatedPosts(currentId: string, limit = 3) {
  return blogPosts.filter((post) => post.id !== currentId).slice(0, limit)
}
```

- [ ] **Step 2: Add blog index and detail pages**

Create Russian and Uzbek blog index pages using `BlogCard`. Create detail pages with:

- `generateStaticParams`
- `buildMetadata`
- `articleJsonLd`
- CTA block after intro and at the end
- links to related niche pages where `relatedNicheIds` exists

- [ ] **Step 3: Verify**

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web-storefront/src/app/blog apps/web-storefront/src/app/uz/blog apps/web-storefront/src/components/marketing/BlogCard.tsx apps/web-storefront/src/content/marketing/blog.ts
git commit -m "feat: add bilingual blog pages"
```

---

### Task 6: Help Center Pages

**Files:**
- Create: `apps/web-storefront/src/components/marketing/HelpSearch.tsx`
- Create: `apps/web-storefront/src/app/pomoshch/page.tsx`
- Create: `apps/web-storefront/src/app/pomoshch/[slug]/page.tsx`
- Create: `apps/web-storefront/src/app/uz/yordam/page.tsx`
- Create: `apps/web-storefront/src/app/uz/yordam/[slug]/page.tsx`
- Modify: `apps/web-storefront/src/content/marketing/help.ts`

- [ ] **Step 1: Add help helpers**

Add to `help.ts`:

```ts
import type { Locale } from './types'

export function getHelpArticleBySlug(slug: string, locale: Locale) {
  return helpArticles.find((article) => article.slug[locale].split('/').pop() === slug) ?? null
}

export function getRelatedHelpArticles(currentId: string) {
  return helpArticles.filter((article) => article.id !== currentId).slice(0, 4)
}
```

- [ ] **Step 2: Add searchable help home**

Create `HelpSearch.tsx` as a client component with a text input and filtered list. Public labels:

- Russian input label: `Поиск по помощи`
- Uzbek input label: `Yordam bo‘yicha qidirish`
- Russian empty state: `Ничего не найдено`
- Uzbek empty state: `Hech narsa topilmadi`

- [ ] **Step 3: Add help article pages**

Create Russian and Uzbek help pages that render:

- short answer from `description`
- ordered steps from `steps[locale]`
- related articles
- CTA to create store or contact support
- breadcrumb JSON-LD through `StructuredData`

- [ ] **Step 4: Verify**

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web-storefront/src/app/pomoshch apps/web-storefront/src/app/uz/yordam apps/web-storefront/src/components/marketing/HelpSearch.tsx apps/web-storefront/src/content/marketing/help.ts
git commit -m "feat: add bilingual help center"
```

---

### Task 7: Demo, Pricing, Contact, Sitemap, And Robots

**Files:**
- Create: `apps/web-storefront/src/app/namuna/page.tsx`
- Create: `apps/web-storefront/src/app/uz/namuna/page.tsx`
- Create: `apps/web-storefront/src/app/tarify/page.tsx`
- Create: `apps/web-storefront/src/app/uz/tariflar/page.tsx`
- Create: `apps/web-storefront/src/app/kontakt/page.tsx`
- Create: `apps/web-storefront/src/app/uz/aloqa/page.tsx`
- Create: `apps/web-storefront/src/app/sitemap.ts`
- Create: `apps/web-storefront/src/app/robots.ts`

- [ ] **Step 1: Add demo pages**

Create `/namuna` and `/uz/namuna` with:

- H1 Russian: `Посмотрите пример магазина в Telegram`
- H1 Uzbek: `Telegram do‘kon namunasini ko‘ring`
- `PhoneDemo`
- CTA to create store
- optional Telegram example CTA only when `telegramExampleUrl` is not empty

- [ ] **Step 2: Add pricing pages**

Create `/tarify` and `/uz/tariflar` with v1 pricing content:

- Russian H1: `Тарифы Dokonly`
- Uzbek H1: `Dokonly tariflari`
- Three plan blocks: `Старт`, `Рост`, `Команда`; Uzbek: `Start`, `O‘sish`, `Jamoa`
- CTA to create store and consultation CTA linking to the contact page. Task 8 embeds the lead form after the form component exists.

- [ ] **Step 3: Add contact pages**

Create `/kontakt` and `/uz/aloqa` with consultation copy and a primary CTA section. Task 8 embeds the lead form as the primary action after the form component exists.

- [ ] **Step 4: Add sitemap**

Create `apps/web-storefront/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { siteBaseUrl } from '@/content/marketing/site'
import { marketingRoutes } from '@/content/marketing/routes'
import { niches } from '@/content/marketing/niches'
import { blogPosts } from '@/content/marketing/blog'
import { helpArticles } from '@/content/marketing/help'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = Object.values(marketingRoutes).flatMap((route) => [route.ru, route.uz])
  const dynamicRoutes = [
    ...niches.flatMap((niche) => [niche.slug.ru, niche.slug.uz]),
    ...blogPosts.flatMap((post) => [post.slug.ru, post.slug.uz]),
    ...helpArticles.flatMap((article) => [article.slug.ru, article.slug.uz]),
  ]

  return [...staticRoutes, ...dynamicRoutes].map((path) => ({
    url: new URL(path, siteBaseUrl).toString(),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '/' || path === '/uz' ? 1 : 0.7,
  }))
}
```

- [ ] **Step 5: Add robots**

Create `apps/web-storefront/src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'
import { siteBaseUrl } from '@/content/marketing/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', siteBaseUrl).toString(),
  }
}
```

- [ ] **Step 6: Verify**

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web-storefront/src/app/namuna apps/web-storefront/src/app/uz/namuna apps/web-storefront/src/app/tarify apps/web-storefront/src/app/uz/tariflar apps/web-storefront/src/app/kontakt apps/web-storefront/src/app/uz/aloqa apps/web-storefront/src/app/sitemap.ts apps/web-storefront/src/app/robots.ts
git commit -m "feat: add marketing utility pages"
```

---

### Task 8: Frontend Lead Form

**Files:**
- Create: `apps/web-storefront/src/components/marketing/LeadForm.tsx`
- Create: `apps/web-storefront/src/lib/marketing/leads.ts`
- Modify: home, niche, demo, pricing, and contact pages to include `LeadForm`

- [ ] **Step 1: Add lead submission client**

Create `apps/web-storefront/src/lib/marketing/leads.ts`:

```ts
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface MarketingLeadInput {
  locale: 'ru' | 'uz'
  name: string
  telegram_username?: string
  phone?: string
  email?: string
  business_name?: string
  niche: string
  monthly_order_volume?: string
  message?: string
  source_page: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export async function submitMarketingLead(input: MarketingLeadInput): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await fetch(`${apiBase}/api/v1/public/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.ok) return { ok: true }

  const data = await response.json().catch(() => null)
  return { ok: false, message: data?.detail ?? 'Request failed' }
}
```

- [ ] **Step 2: Add lead form component**

Create `LeadForm.tsx` as a client component with this public interface:

```ts
interface LeadFormProps {
  locale: 'ru' | 'uz'
  defaultNiche?: string
}
```

The component includes:

- `name`, `telegram_username`, `niche`, and `monthly_order_volume` visible fields
- optional `phone`, `email`, `business_name`, and `message`
- hidden UTM fields from `useSearchParams`
- source page from `window.location.pathname`
- success copy Russian: `Спасибо. Мы напишем вам в Telegram.`
- success copy Uzbek: `Rahmat. Sizga Telegram’da yozamiz.`
- error copy Russian: `Укажите Telegram, телефон или email.`
- error copy Uzbek: `Telegram, telefon yoki email kiriting.`

- [ ] **Step 3: Wire forms into pages**

Place `LeadForm` in:

- homepage lead capture section
- every niche detail page
- `/kontakt`
- `/uz/aloqa`
- pricing consultation block

- [ ] **Step 4: Verify**

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web-storefront/src/components/marketing/LeadForm.tsx apps/web-storefront/src/lib/marketing/leads.ts apps/web-storefront/src/app
git commit -m "feat: add marketing lead form"
```

---

### Task 9: Backend Lead Storage And Notification

**Files:**
- Create: `backend/app/models/marketing.py`
- Create: `backend/app/schemas/marketing.py`
- Create: `backend/app/services/marketing_leads.py`
- Create: `backend/tests/test_marketing_leads.py`
- Modify: `backend/app/api/v1/endpoints/public.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Modify: `.env.example`

- [ ] **Step 1: Add model**

Create `backend/app/models/marketing.py`:

```py
import uuid

from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin


class MarketingLead(Base, TimestampMixin):
    __tablename__ = "marketing_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    locale = Column(String(2), nullable=False, default="ru")
    name = Column(String(200), nullable=False)
    telegram_username = Column(String(100))
    phone = Column(String(50))
    email = Column(String(200))
    business_name = Column(String(200))
    niche = Column(String(100), nullable=False)
    monthly_order_volume = Column(String(100))
    message = Column(Text)
    source_page = Column(Text, nullable=False)
    utm_source = Column(String(200))
    utm_medium = Column(String(200))
    utm_campaign = Column(String(200))
    utm_content = Column(String(200))
    utm_term = Column(String(200))
```

- [ ] **Step 2: Add schemas**

Create `backend/app/schemas/marketing.py`:

```py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class MarketingLeadCreate(BaseModel):
    locale: str = Field(default="ru", pattern="^(ru|uz)$")
    name: str = Field(min_length=2, max_length=200)
    telegram_username: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=200)
    business_name: str | None = Field(default=None, max_length=200)
    niche: str = Field(min_length=2, max_length=100)
    monthly_order_volume: str | None = Field(default=None, max_length=100)
    message: str | None = Field(default=None, max_length=2000)
    source_page: str = Field(min_length=1, max_length=1000)
    utm_source: str | None = Field(default=None, max_length=200)
    utm_medium: str | None = Field(default=None, max_length=200)
    utm_campaign: str | None = Field(default=None, max_length=200)
    utm_content: str | None = Field(default=None, max_length=200)
    utm_term: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def require_contact(self) -> "MarketingLeadCreate":
        if not (self.telegram_username or self.phone or self.email):
            raise ValueError("telegram_username, phone, or email is required")
        return self


class MarketingLeadResponse(BaseModel):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Add notification service**

Create `backend/app/services/marketing_leads.py`:

```py
import logging

import httpx

from app.core.config import settings
from app.models.marketing import MarketingLead

logger = logging.getLogger(__name__)


def format_marketing_lead_alert(lead: MarketingLead) -> str:
    parts = [
        "Новая заявка Dokonly",
        f"Имя: {lead.name}",
        f"Ниша: {lead.niche}",
        f"Страница: {lead.source_page}",
    ]
    if lead.telegram_username:
        parts.append(f"Telegram: {lead.telegram_username}")
    if lead.phone:
        parts.append(f"Телефон: {lead.phone}")
    if lead.email:
        parts.append(f"Email: {lead.email}")
    if lead.business_name:
        parts.append(f"Бизнес: {lead.business_name}")
    if lead.monthly_order_volume:
        parts.append(f"Заказы в месяц: {lead.monthly_order_volume}")
    if lead.utm_campaign:
        parts.append(f"UTM campaign: {lead.utm_campaign}")
    return "\n".join(parts)


async def send_marketing_lead_alert(lead: MarketingLead) -> None:
    if not settings.telegram_bot_token or not settings.lead_alert_chat_id:
        return

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": settings.lead_alert_chat_id, "text": format_marketing_lead_alert(lead)},
        )
        response.raise_for_status()
```

- [ ] **Step 4: Register settings and model**

Add to `backend/app/core/config.py`:

```py
lead_alert_chat_id: str = ""
```

Add to `backend/app/models/__init__.py`:

```py
from app.models.marketing import MarketingLead
```

Add `"MarketingLead"` to `__all__`.

- [ ] **Step 5: Add startup migration block**

Append to `MIGRATIONS` in `backend/app/main.py`:

```py
    # 004 - marketing lead capture
    """
    CREATE TABLE IF NOT EXISTS marketing_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        locale VARCHAR(2) NOT NULL DEFAULT 'ru',
        name VARCHAR(200) NOT NULL,
        telegram_username VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(200),
        business_name VARCHAR(200),
        niche VARCHAR(100) NOT NULL,
        monthly_order_volume VARCHAR(100),
        message TEXT,
        source_page TEXT NOT NULL,
        utm_source VARCHAR(200),
        utm_medium VARCHAR(200),
        utm_campaign VARCHAR(200),
        utm_content VARCHAR(200),
        utm_term VARCHAR(200),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON marketing_leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_marketing_leads_niche ON marketing_leads(niche);
    """,
```

- [ ] **Step 6: Add endpoint**

Modify `backend/app/api/v1/endpoints/public.py`:

```py
import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.marketing import MarketingLead
from app.schemas.marketing import MarketingLeadCreate, MarketingLeadResponse
from app.services.marketing_leads import send_marketing_lead_alert

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/public", tags=["public"])


@router.post("/leads", response_model=MarketingLeadResponse, status_code=status.HTTP_201_CREATED)
async def create_marketing_lead(
    body: MarketingLeadCreate,
    db: AsyncSession = Depends(get_db),
):
    lead = MarketingLead(**body.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    try:
        await send_marketing_lead_alert(lead)
    except Exception as exc:
        logger.warning("Marketing lead alert failed: %s", exc)

    return lead
```

Keep the existing `/help-articles` endpoint below this new route.

- [ ] **Step 7: Add backend tests**

Create `backend/tests/test_marketing_leads.py`:

```py
import pytest
from pydantic import ValidationError

from app.schemas.marketing import MarketingLeadCreate
from app.services.marketing_leads import format_marketing_lead_alert


def test_marketing_lead_requires_contact() -> None:
    with pytest.raises(ValidationError):
        MarketingLeadCreate(
            locale="ru",
            name="Yusuf",
            niche="Одежда",
            source_page="/nishi/odezhda-butiki",
        )


def test_marketing_lead_accepts_telegram_contact() -> None:
    lead = MarketingLeadCreate(
        locale="ru",
        name="Yusuf",
        telegram_username="@seller",
        niche="Одежда",
        source_page="/nishi/odezhda-butiki",
    )
    assert lead.telegram_username == "@seller"


def test_marketing_lead_alert_contains_key_fields() -> None:
    class Lead:
        name = "Yusuf"
        niche = "Одежда"
        source_page = "/nishi/odezhda-butiki"
        telegram_username = "@seller"
        phone = None
        email = None
        business_name = "Test Boutique"
        monthly_order_volume = "50-100"
        utm_campaign = "may-ads"

    text = format_marketing_lead_alert(Lead())
    assert "Новая заявка Dokonly" in text
    assert "@seller" in text
    assert "may-ads" in text
```

- [ ] **Step 8: Update env example**

Add to `.env.example`:

```bash
LEAD_ALERT_CHAT_ID=
NEXT_PUBLIC_CREATE_STORE_BOT_URL=
NEXT_PUBLIC_DEMO_BOT_URL=
NEXT_PUBLIC_SITE_URL=https://dokonly.com
```

- [ ] **Step 9: Verify backend**

Run:

```bash
cd backend && python -m pytest tests/test_marketing_leads.py -q
cd backend && python -m ruff check app tests
```

Expected: both commands exit 0.

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/marketing.py backend/app/schemas/marketing.py backend/app/services/marketing_leads.py backend/app/api/v1/endpoints/public.py backend/app/core/config.py backend/app/models/__init__.py backend/app/main.py backend/tests/test_marketing_leads.py .env.example
git commit -m "feat: capture marketing leads"
```

---

### Task 10: Visual Assets And Final Frontend QA

**Files:**
- Create: `apps/web-storefront/public/marketing/niches/odezhda-butiki.webp`
- Create: `apps/web-storefront/public/marketing/niches/kosmetika-krasota.webp`
- Create: `apps/web-storefront/public/marketing/niches/eda-kafe-vypechka.webp`
- Create: `apps/web-storefront/public/marketing/niches/tsvety-podarki.webp`
- Create: `apps/web-storefront/public/marketing/niches/elektronika-aksessuary.webp`
- Create: `apps/web-storefront/public/marketing/niches/dom-dekor-mebel.webp`
- Create: `apps/web-storefront/public/marketing/niches/detskie-tovary.webp`
- Create: `apps/web-storefront/public/marketing/niches/uslugi-kursy-zapisi.webp`
- Modify: `apps/web-storefront/src/content/marketing/niches.ts`

- [ ] **Step 1: Generate or create niche images**

Create eight 1600x1000 WebP images with no embedded text. Use product-focused scenes that match each niche:

- clothing boutique: bright rack, folded clothes, phone storefront visible
- cosmetics: skincare products, clean counter, phone storefront visible
- cafe/bakery: pastries and pre-order flow, phone storefront visible
- flowers/gifts: bouquet and gift box, phone storefront visible
- electronics/accessories: headphones and charger accessories, phone storefront visible
- home/decor/furniture: small decor items and chair, phone storefront visible
- kids products: toys and baby products, phone storefront visible
- services/courses/bookings: consultation desk and booking flow, phone storefront visible

- [ ] **Step 2: Wire images into niche content**

Update each `image` field in `niches.ts` to use the matching `/marketing/niches/*.webp` path.

- [ ] **Step 3: Run public-copy scan**

Run:

```bash
rg -n "Open your store|Learn about|Create store|demo bot|Fashion|Beauty|Food|Flowers|Pricing|Contact|Help|Niches" apps/web-storefront/src/app apps/web-storefront/src/components/marketing apps/web-storefront/src/content/marketing
```

Expected: no public English UI matches. Internal variable names are allowed only outside JSX text and content strings.

- [ ] **Step 4: Run build checks**

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
```

Expected: both commands exit 0.

- [ ] **Step 5: Browser verification**

Start the app:

```bash
pnpm --filter web-storefront dev
```

Open these URLs in the in-app browser:

- `http://localhost:3002/`
- `http://localhost:3002/uz`
- `http://localhost:3002/nishi/odezhda-butiki`
- `http://localhost:3002/uz/sohalar/kiyim-butiklar`
- `http://localhost:3002/blog/create-telegram-store-uzbekistan`
- `http://localhost:3002/pomoshch/kak-nachat`
- `http://localhost:3002/namuna`
- `http://localhost:3002/kontakt`

Check:

- hero text is visible without overlap at desktop and mobile widths
- phone demo changes tabs and states
- CTA buttons open configured Telegram URLs or localized pages
- lead form shows validation when no contact is entered
- all visible public labels are Russian or Uzbek
- existing store route still works with `http://localhost:3002/?shop=test` redirecting to `/test`

- [ ] **Step 6: Commit**

```bash
git add apps/web-storefront/public/marketing apps/web-storefront/src/content/marketing/niches.ts
git commit -m "feat: add marketing niche visuals"
```

---

### Task 11: End-To-End Lead Flow QA

**Files:**
- No planned file creation unless verification exposes a defect.

- [ ] **Step 1: Start backend**

Run:

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Expected: backend starts and `/health` returns `{"status":"ok"}`.

- [ ] **Step 2: Start storefront**

Run:

```bash
pnpm --filter web-storefront dev
```

Expected: storefront starts on `http://localhost:3002`.

- [ ] **Step 3: Submit lead from browser**

Use `/kontakt` and submit:

- name: `Тест`
- Telegram: `@testlead`
- niche: `Одежда`
- monthly order volume: `50-100`

Expected:

- frontend shows Russian success copy
- backend returns HTTP 201 for `POST /api/v1/public/leads`
- if `LEAD_ALERT_CHAT_ID` is empty, submission still succeeds

- [ ] **Step 4: Submit Uzbek lead**

Use `/uz/aloqa` and submit:

- name: `Test`
- Telegram: `@testleaduz`
- niche: `Kiyim`
- monthly order volume: `50-100`

Expected:

- frontend shows Uzbek success copy
- backend returns HTTP 201

- [ ] **Step 5: Final verification commands**

Run:

```bash
pnpm --filter web-storefront typecheck
pnpm --filter web-storefront build
cd backend && python -m pytest tests/test_marketing_leads.py -q
cd backend && python -m ruff check app tests
git status --short --branch
```

Expected:

- frontend typecheck exits 0
- frontend build exits 0
- backend tests exit 0
- backend ruff exits 0
- git status shows only intended committed changes or a clean tree

---

## Acceptance Checklist

- [ ] Russian homepage works at `/`.
- [ ] Uzbek homepage works at `/uz`.
- [ ] All eight niche pages exist in both languages.
- [ ] Blog and help pages exist in both languages for the first content batch.
- [ ] Main CTA is configured through `NEXT_PUBLIC_CREATE_STORE_BOT_URL`.
- [ ] Telegram example link is configured through `NEXT_PUBLIC_DEMO_BOT_URL`.
- [ ] Lead form stores leads and attempts Telegram notification.
- [ ] Phone demo works without backend.
- [ ] Pages include metadata, canonical URLs, and `hreflang`.
- [ ] Sitemap and robots routes exist.
- [ ] Existing `/:slug` storefront route still works.
- [ ] `pnpm --filter web-storefront typecheck` passes.
- [ ] `pnpm --filter web-storefront build` passes.
- [ ] `cd backend && python -m pytest tests/test_marketing_leads.py -q` passes.
- [ ] `cd backend && python -m ruff check app tests` passes.
