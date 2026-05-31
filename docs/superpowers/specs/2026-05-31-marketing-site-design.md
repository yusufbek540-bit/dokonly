# Dokonly Marketing Site Design

Date: 2026-05-31
Status: approved design draft
Scope: planning only; no implementation in this document

## Goal

Build a Russian-first, Uzbek-supported public marketing website for Dokonly that converts ad traffic into:

1. Store creation clicks to the main Telegram bot.
2. Qualified leads for follow-up.
3. Demo engagement through an interactive phone mockup and a future Telegram storefront example.

The site must not include English public UI or SEO pages. Russian is the default language. Uzbek is available through a language switcher.

## Technical Placement

Use the existing Next.js app at `apps/web-storefront`.

Rationale:

- It is already in the monorepo and uses Next.js App Router.
- Next.js supports static SEO pages, metadata, sitemaps, blog/help routes, and interactive React components.
- It keeps the public marketing site separate from the Telegram Mini App while preserving the existing web storefront routes.

The current store route pattern `/:slug` remains available. Marketing routes reserve known top-level paths such as `/nishi`, `/blog`, `/pomoshch`, `/namuna`, `/tarify`, `/kontakt`, and `/uz`.

## Language And Routing

Russian default:

- `/`
- `/nishi`
- `/nishi/[slug]`
- `/blog`
- `/blog/[slug]`
- `/pomoshch`
- `/pomoshch/[slug]`
- `/namuna`
- `/tarify`
- `/kontakt`

Uzbek:

- `/uz`
- `/uz/sohalar`
- `/uz/sohalar/[slug]`
- `/uz/blog`
- `/uz/blog/[slug]`
- `/uz/yordam`
- `/uz/yordam/[slug]`
- `/uz/namuna`
- `/uz/tariflar`
- `/uz/aloqa`

Optional `/ru` should redirect to `/` to avoid duplicate canonical content. English public paths such as `/niches`, `/help`, `/demo`, `/pricing`, and `/contact` should redirect to the Russian-localized paths if they ever appear in old links or ads.

Each page must define:

- `title`
- `description`
- canonical URL
- Open Graph metadata
- `hreflang` links for Russian and Uzbek equivalents

## Navigation

Desktop navigation:

- Dokonly
- Продукт
- Ниши
- Демо
- Тарифы
- Блог
- Помощь
- RU / UZ
- Создать магазин

Mobile navigation:

- Логотип Dokonly
- RU / UZ
- Меню
- Sticky CTA: `Создать магазин`

Primary CTA:

- Russian: `Создать магазин`
- Uzbek: `Do‘kon yaratish`
- Destination: main Telegram bot URL from env, for example `NEXT_PUBLIC_CREATE_STORE_BOT_URL`.

Secondary CTAs:

- Russian: `Посмотреть пример`, `Открыть пример в Telegram`
- Uzbek: `Namunani ko‘rish`, `Telegram’da namunani ochish`
- Telegram example destination should come from env, for example `NEXT_PUBLIC_DEMO_BOT_URL`, and can be empty until the bot is ready.

## Homepage Structure

Approved structure:

1. Hero + interactive phone demo + three CTAs.
2. Trust strip.
3. Problem-to-solution section.
4. Eight niche cards.
5. How it works.
6. Feature proof.
7. Lead capture.
8. Blog/help preview.
9. FAQ.
10. Final CTA.

### Hero

Russian H1:

`Запустите магазин в Telegram за 10 минут`

Russian supporting copy:

`Dokonly помогает продавцам принимать заказы, показывать каталог, возвращать покупателей и управлять клиентами прямо в Telegram.`

Uzbek H1:

`Telegram’da do‘konni 10 daqiqada ishga tushiring`

Uzbek supporting copy:

`Dokonly sotuvchilarga katalog ko‘rsatish, buyurtma qabul qilish, mijozlarni qaytarish va Telegram ichida savdoni boshqarishga yordam beradi.`

Hero CTAs:

- Primary: create store.
- Secondary: try interactive demo.
- Text link: open the Telegram example when available.

### Interactive Phone Demo

Place above the fold on desktop and immediately after hero copy on mobile.

Demo states:

1. Storefront.
2. Product detail.
3. Cart.
4. Checkout.
5. Seller order view.
6. Customer CRM note/tag preview.

The demo uses local static data, not the backend. Niche selector changes products and visuals. Public tab labels must be localized:

- Russian: `Одежда`, `Косметика`, `Еда`, `Цветы`.
- Uzbek: `Kiyim`, `Kosmetika`, `Taom`, `Gullar`.

### Trust Strip

Use short credibility claims:

- `Без разработчика`
- `Каталог и заказы в Telegram`
- `Промокоды и брошенные корзины`
- `CRM для повторных продаж`

Uzbek equivalents:

- `Dasturchisiz`
- `Katalog va buyurtmalar Telegram’da`
- `Promokodlar va tashlab ketilgan savatlar`
- `Takroriy savdolar uchun CRM`

### Problem/Solution

Problems to express in public copy:

- RU: `Заказы теряются в личных сообщениях.` UZ: `Buyurtmalar shaxsiy xabarlarda yo‘qolib ketadi.`
- RU: `Продавец снова и снова отвечает на одни и те же вопросы.` UZ: `Sotuvchi bir xil savollarga qayta-qayta javob beradi.`
- RU: `Покупатели забывают товары в корзине.` UZ: `Mijozlar savatdagi mahsulotlarni unutib qo‘yadi.`
- RU: `Нет простой CRM для повторных продаж.` UZ: `Takroriy savdolar uchun sodda CRM yo‘q.`
- RU: `Telegram-канал дает внимание, но не всегда приводит к заказам.` UZ: `Telegram-kanal e’tibor beradi, lekin har doim buyurtmaga olib kelmaydi.`

Solutions to express in public copy:

- RU: `Удобный каталог.` UZ: `Qulay katalog.`
- RU: `Единый путь оформления заказа.` UZ: `Buyurtmani rasmiylashtirishning yagona yo‘li.`
- RU: `Панель заказов для продавца.` UZ: `Sotuvchi uchun buyurtmalar paneli.`
- RU: `Заметки и теги по клиентам.` UZ: `Mijozlar bo‘yicha izohlar va teglar.`
- RU: `Промокоды.` UZ: `Promokodlar.`
- RU: `Напоминания о корзине.` UZ: `Savat eslatmalari.`
- RU: `Сценарии для бота и канала.` UZ: `Bot va kanal uchun ssenariylar.`

### Lead Capture

Approved offer:

Russian:

`Получить пример магазина для моей ниши + консультацию`

Uzbek:

`Mening soham uchun do‘kon namunasi va konsultatsiya olish`

Form fields:

- Name.
- Telegram username.
- Business niche.
- Monthly order volume.
- Optional phone/email.
- Hidden UTM fields.
- Source page and locale.

Behavior:

- Ready users click `Создать магазин`.
- Interested but uncertain users submit the lead form.
- After submit, show confirmation and set expectation for Telegram follow-up.

## Niche Pages

Approved first-launch niches:

1. RU: `Одежда и бутики`; UZ: `Kiyim va butiklar`.
2. RU: `Косметика и красота`; UZ: `Kosmetika va go‘zallik`.
3. RU: `Еда, кафе и выпечка`; UZ: `Taom, kafe va pishiriqlar`.
4. RU: `Цветы и подарки`; UZ: `Gullar va sovg‘alar`.
5. RU: `Электроника и аксессуары`; UZ: `Elektronika va aksessuarlar`.
6. RU: `Дом, декор и мебель`; UZ: `Uy, dekor va mebel`.
7. RU: `Детские товары`; UZ: `Bolalar mahsulotlari`.
8. RU: `Услуги, курсы и записи`; UZ: `Xizmatlar, kurslar va yozilish`.

Recommended slugs:

| Niche | Russian URL | Uzbek URL |
| --- | --- | --- |
| Одежда и бутики | `/nishi/odezhda-butiki` | `/uz/sohalar/kiyim-butiklar` |
| Косметика и красота | `/nishi/kosmetika-krasota` | `/uz/sohalar/kosmetika-gozallik` |
| Еда, кафе и выпечка | `/nishi/eda-kafe-vypechka` | `/uz/sohalar/taom-kafe-pishiriqlar` |
| Цветы и подарки | `/nishi/tsvety-podarki` | `/uz/sohalar/gullar-sovgalar` |
| Электроника и аксессуары | `/nishi/elektronika-aksessuary` | `/uz/sohalar/elektronika-aksessuarlar` |
| Дом, декор и мебель | `/nishi/dom-dekor-mebel` | `/uz/sohalar/uy-dekor-mebel` |
| Детские товары | `/nishi/detskie-tovary` | `/uz/sohalar/bolalar-mahsulotlari` |
| Услуги, курсы и записи | `/nishi/uslugi-kursy-zapisi` | `/uz/sohalar/xizmatlar-kurslar-yozilish` |

Each niche page uses the same structure:

1. SEO H1 and niche-specific promise.
2. Pain points for that niche.
3. How Dokonly helps.
4. Sample phone/UI screenshots.
5. Buyer journey example.
6. Niche-specific feature proof.
7. Lead form.
8. Niche FAQ.
9. Related blog posts.
10. Final CTA.

Image strategy:

- Use generated niche visuals plus actual product UI screenshots.
- Product UI should remain visible and inspectable.
- Avoid generic dark stock images and decorative-only visuals.

Example Russian clothing page H1:

`Telegram-магазин для бутиков и продавцов одежды`

Example Uzbek clothing page H1:

`Butiklar va kiyim sotuvchilari uchun Telegram-do‘kon`

## Blog SEO Plan

Blog clusters:

1. Telegram commerce basics.
2. Niche-specific selling.
3. Sales and marketing.
4. Product/how-to education.

First 12 post topics:

1. RU: `Как создать Telegram-магазин в Узбекистане`
   UZ: `O‘zbekistonda Telegram-do‘konni qanday yaratish mumkin`
2. RU: `Мини-приложение Telegram для продаж: что это и кому подходит`
   UZ: `Savdo uchun Telegram mini-ilovasi: bu nima va kimga mos`
3. RU: `Как принимать заказы в Telegram без хаоса в личке`
   UZ: `Telegram’da buyurtmalarni tartibli qabul qilish`
4. RU: `Telegram-бот для интернет-магазина: пошаговый гид`
   UZ: `Internet-do‘kon uchun Telegram-bot: bosqichma-bosqich qo‘llanma`
5. RU: `Как бутику продавать одежду через Telegram`
   UZ: `Butik Telegram orqali kiyimni qanday sotishi mumkin`
6. RU: `Как магазину косметики увеличить повторные покупки`
   UZ: `Kosmetika do‘koni takroriy xaridlarni qanday oshiradi`
7. RU: `Как кафе и пекарне принимать предзаказы в Telegram`
   UZ: `Kafe va nonvoyxonalar Telegram’da oldindan buyurtma qabul qilishi`
8. RU: `Telegram-магазин для цветов и подарков`
   UZ: `Gullar va sovg‘alar uchun Telegram-do‘kon`
9. RU: `Промокоды для Telegram-магазина: идеи кампаний`
   UZ: `Telegram-do‘kon uchun promokod kampaniyalari`
10. RU: `Как вернуть покупателей с брошенной корзины`
    UZ: `Tashlab ketilgan savatdan mijozni qanday qaytarish mumkin`
11. RU: `CRM для маленького Telegram-магазина`
    UZ: `Kichik Telegram-do‘kon uchun CRM`
12. RU: `Как превратить Telegram-канал в витрину продаж`
    UZ: `Telegram-kanalni savdo vitrinasiga aylantirish`

Blog pages should include:

- Article schema.
- Author/date metadata.
- Related posts.
- CTA block after intro and at the end.
- Internal links to relevant niche and help pages.

## Help Center

Help center reference model: docs-style structure similar to `docs.tgshop.io`, adapted for Dokonly and conversion.

Routes:

- `/pomoshch`
- `/pomoshch/kak-nachat`
- `/pomoshch/sozdat-magazin`
- `/pomoshch/podklyuchit-telegram-bot`
- `/pomoshch/dobavit-tovary`
- `/pomoshch/import-tovarov`
- `/pomoshch/upravlenie-zakazami`
- `/pomoshch/oplata`
- `/pomoshch/dostavka`
- `/pomoshch/klienty-crm`
- `/pomoshch/promokody`
- `/pomoshch/napominaniya-o-korzine`
- `/pomoshch/integratsiya-kanala`
- `/pomoshch/analitika`
- `/pomoshch/nepoladki`

Uzbek equivalents:

- `/uz/yordam`
- `/uz/yordam/qanday-boshlash`
- `/uz/yordam/dokon-yaratish`
- `/uz/yordam/telegram-botni-ulash`
- `/uz/yordam/mahsulot-qoshish`
- `/uz/yordam/mahsulot-importi`
- `/uz/yordam/buyurtmalarni-boshqarish`
- `/uz/yordam/tolov`
- `/uz/yordam/yetkazib-berish`
- `/uz/yordam/mijozlar-crm`
- `/uz/yordam/promokodlar`
- `/uz/yordam/savat-eslatmalari`
- `/uz/yordam/kanal-integratsiyasi`
- `/uz/yordam/analitika`
- `/uz/yordam/muammolar`

Each help article should include:

- Short answer.
- Step-by-step guide.
- Screenshots or phone mockups.
- Related articles.
- CTA to create store or contact support.

Help home:

- Search input.
- Popular guides.
- Category cards.
- CTA band.

## Lead Backend

Create a backend lead capture endpoint:

- `POST /api/v1/public/leads`

Lead fields:

- `id`
- `locale`
- `name`
- `telegram_username`
- `phone`
- `email`
- `business_name`
- `niche`
- `monthly_order_volume`
- `message`
- `source_page`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `created_at`

Storage:

- PostgreSQL table, for example `marketing_leads`.

Notification:

- Send a Telegram notification to an internal chat when a lead is captured.
- Use env var such as `LEAD_ALERT_CHAT_ID`.
- If notification fails but database insert succeeds, return success to the user and log the notification error.

Validation:

- Require either Telegram username, phone, or email.
- Require niche.
- Rate-limit or throttle repeated submissions by IP/contact if needed.

## Behavioral CTA Strategy

Use these patterns ethically:

- Clarity: explain what happens after clicking `Создать магазин`.
- Risk reduction: show interactive demo before registration.
- Specificity: niche pages make the visitor feel the product is for them.
- Commitment ladder: create store for high intent, lead form for medium intent, blog/help for research intent.
- Repetition without noise: CTA after hero, demo, niche section, FAQ, and final band.
- Objection handling: FAQ before final CTA.
- Trust through usefulness: help center and blog prove product maturity.

Do not use fake scarcity, fake testimonials, or unverifiable metrics.

## Visual Direction

Approved direction: clean Telegram commerce in Russian and Uzbek, with no English labels in the public interface.

Characteristics:

- Product-led SaaS feel.
- Light surfaces, clear typography, restrained emerald/Telegram-inspired accents.
- Phone demo is the main visual signal.
- Niche visuals support context but do not overpower product UI.
- Avoid dark, aggressive, or generic startup gradients.

## SEO Requirements

Every indexable page must include:

- Unique metadata.
- One H1.
- Canonical URL.
- RU/UZ `hreflang`.
- Open Graph title/description/image.
- Structured data where relevant:
  - FAQ schema for FAQ sections.
  - Article schema for blog.
  - Breadcrumb schema for nested pages.
- Internal links to related niche/help/blog pages.
- Optimized image alt text in Russian or Uzbek.
- Sitemap and robots.

## Content Data Model

Use typed content modules first, not a CMS in v1.

Suggested files:

- `apps/web-storefront/src/content/marketing/locales.ts`
- `apps/web-storefront/src/content/marketing/niches.ts`
- `apps/web-storefront/src/content/marketing/blog.ts`
- `apps/web-storefront/src/content/marketing/help.ts`
- `apps/web-storefront/src/content/marketing/faqs.ts`

Each content item should have both `ru` and `uz` copy unless it is explicitly locale-specific.

## Implementation Phases

1. Route architecture and shared marketing layout.
2. Bilingual content model and SEO helpers.
3. Home page with interactive phone demo.
4. Niche pages for all eight niches.
5. Blog index and first posts.
6. Help center.
7. Lead capture backend endpoint, database table, and Telegram notification.
8. Analytics/UTM capture.
9. QA: SEO, accessibility, responsive layout, performance, and build checks.

## Acceptance Criteria

- Russian homepage works at `/`.
- Uzbek homepage works at `/uz`.
- All eight niche pages exist in both languages.
- Blog and help pages exist in both languages for the first content batch.
- Main CTA can be configured through env.
- Telegram example link can be configured later through env.
- Lead form stores leads and sends Telegram notification.
- Phone demo works without backend.
- Pages include metadata, canonical URLs, and `hreflang`.
- `pnpm --filter web-storefront typecheck` passes.
- `pnpm --filter web-storefront build` passes.
