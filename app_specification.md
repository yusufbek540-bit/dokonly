# Dokonly — Complete Application Specification

> **Purpose:** Single source of truth describing every screen, workflow, and integration in the Dokonly platform. Read this in conjunction with `plan.md` (product strategy), `design.md` (visual system), and `implementation_plan.md` (timeline).
>
> **Audience:** Claude Code (primary), engineering team, designers.
>
> **Reference in Claude Code:** `@docs/app_specification.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [The Three Sides — Conceptual Model](#3-the-three-sides--conceptual-model)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Database Architecture](#5-database-architecture)
6. [Platform Owner Application — `ops.dokonly.com`](#6-platform-owner-application)
7. [Merchant Application — Mobile (Telegram Mini App)](#7-merchant-application--mobile)
8. [Merchant Application — Web Dashboard](#8-merchant-application--web-dashboard)
9. [Buyer Application — Storefront](#9-buyer-application--storefront)
10. [Cross-cutting Workflows](#10-cross-cutting-workflows)
11. [Real-time & Notifications](#11-real-time--notifications)
12. [AI Pipeline](#12-ai-pipeline)
13. [Payment Integration Details](#13-payment-integration-details)
14. [Bot Infrastructure](#14-bot-infrastructure)
15. [Repository Structure](#15-repository-structure)
16. [API Specification](#16-api-specification)
17. [Implementation Order](#17-implementation-order)

---

## 1. Executive Summary

### What we're building

Dokonly is a **three-sided platform** for Telegram-commerce in emerging markets:

```
        ┌─────────────────────────────────────────────────┐
        │     DOKONLY PLATFORM (you operate this)        │
        │                                                 │
        │  - Manages merchants (your customers)          │
        │  - Collects subscription revenue               │
        │  - Provides infrastructure (bots, AI, etc.)    │
        └─────────────────────────────────────────────────┘
                          ▲
                          │ Pays subscription
                          │ Uses tools
                          │
        ┌─────────────────────────────────────────────────┐
        │     MERCHANTS (your customers)                  │
        │                                                 │
        │  - Run stores in Telegram                      │
        │  - Sell their products                         │
        │  - Manage their catalog, orders, customers     │
        └─────────────────────────────────────────────────┘
                          ▲
                          │ Pays for products
                          │ Browses, orders
                          │
        ┌─────────────────────────────────────────────────┐
        │     BUYERS (merchants' customers)               │
        │                                                 │
        │  - Browse merchant stores in Telegram          │
        │  - Buy products                                 │
        │  - Get loyalty rewards                         │
        └─────────────────────────────────────────────────┘
```

### Tech stack one-pager

| Layer | Technology |
|---|---|
| Backend API | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) |
| Background jobs | ARQ (Redis-backed) |
| Bot framework | aiogram 3 |
| Database | Supabase Pro (PostgreSQL 15+) with RLS |
| Cache & queues | Redis |
| Object storage | Cloudflare R2 (S3-compatible) |
| Frontend (3 apps) | React 18 + TypeScript + Vite + Tailwind |
| Mobile (Merchant) | Telegram Mini App |
| Web (Merchant) | `admin.dokonly.com` |
| Web (Platform Ops) | `ops.dokonly.com` |
| Storefront (Buyer) | Telegram Mini App (per-merchant bot) |
| Marketing site | `dokonly.uz`, `.com`, `.app` (Astro) |
| Hosting (backend) | Render / Railway |
| Hosting (frontend) | Cloudflare Pages |
| AI provider | OpenAI direct (GPT-5.5 / GPT-5.4-mini / GPT-5.4-nano) + Whisper transcription |
| Monitoring | Sentry + PostHog |
| Email | Resend (transactional) |

### Key principles

1. **Three sides with strict data isolation** — buyers see only one merchant; merchants see only their own data; platform admins see everything but tagged as platform actions
2. **Mobile-first for merchants and buyers** — both primarily use Telegram Mini Apps
3. **Web-second for power users** — desktop dashboards extend mobile, not replace it
4. **One codebase per side** — but shared design system and shared utilities
5. **Real-time where it matters** — order notifications, status updates, AI streaming
6. **AI is everywhere** — built-in from day one, not bolt-on later

---

## 2. System Architecture

### 2.1 High-level Architecture

```
                          ┌────────────────────┐
                          │   Telegram Cloud   │
                          └─────────┬──────────┘
                                    │ Webhooks
                                    ▼
┌───────────────────────────────────────────────────────────────┐
│                    DOKONLY BACKEND (FastAPI)                   │
│                                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Bot Router │  │  REST API    │  │  WebSocket Server    │ │
│  │             │  │              │  │                      │ │
│  │  - Webhook  │  │  - /v1/...   │  │  - Order updates     │ │
│  │  - Multi-bot│  │  - Auth      │  │  - Live AI responses │ │
│  │  - Routes   │  │  - 4 namespaces│ │  - Notifications     │ │
│  └─────────────┘  └──────────────┘  └──────────────────────┘ │
│         │              │                       │              │
│         └──────────────┴───────────────────────┘              │
│                        │                                       │
│                        ▼                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Domain Services (Python modules)            │  │
│  │  Tenants · Products · Orders · Payments · AI · etc.    │  │
│  └────────────────────────────────────────────────────────┘  │
│                        │                                       │
│         ┌──────────────┼──────────────┐                       │
│         ▼              ▼              ▼                       │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐           │
│  │  Supabase   │ │  Redis   │ │  Cloudflare R2   │           │
│  │  (Postgres) │ │ (cache/  │ │  (media storage) │           │
│  │             │ │  queues) │ │                  │           │
│  └─────────────┘ └──────────┘ └──────────────────┘           │
│         │              │                                       │
│         └──────────────┘                                       │
│                │                                               │
│                ▼                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            ARQ Background Workers                        │  │
│  │  AI imports · Mailings · Analytics · Webhooks delivery │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
        │                              │                     │
        ▼                              ▼                     ▼
   ┌──────────┐                  ┌─────────┐         ┌──────────┐
   │ OpenAI   │                  │  Email  │         │ Payment  │
   │  API     │                  │ (Resend)│         │Providers │
   │          │                  │         │         │          │
   │ GPT-5.5  │                  │         │         │ Click    │
   │ 5.4-mini │                  │         │         │ Payme    │
   │ 5.4-nano │                  │         │         │ Stripe   │
   │ Whisper  │                  │         │         │          │
   └──────────┘                  └─────────┘         └──────────┘
```

### 2.2 Frontend Applications

Four distinct frontend applications, all sharing `packages/ui` and `packages/shared`:

| App | URL | Audience | Primary Platform |
|---|---|---|---|
| **Marketing site** | `dokonly.uz` | Prospects | Web (desktop + mobile responsive) |
| **Platform Ops** | `ops.dokonly.com` | Dokonly team | Web only |
| **Merchant Web** | `admin.dokonly.com` | Merchants on desktop | Web only |
| **Merchant Mini App** | Inside per-merchant bot | Merchants on mobile | Telegram |
| **Storefront Mini App** | Inside per-merchant bot | Buyers | Telegram |

**Important:** The Merchant Mini App and Storefront Mini App are TWO DIFFERENT React apps that both run inside the same Telegram bot, but at different routes. When the merchant opens the bot, they see the admin app. When a buyer opens the bot's "Open Store" button, they see the storefront app.

### 2.3 Request Flow Examples

**Example A: Buyer places an order**

```
1. Buyer taps "Open Store" in merchant's Telegram bot
2. Telegram opens Mini App with URL: storefront.dokonly.com/<tenant_id>
3. Frontend loads catalog: GET /v1/storefront/catalog?tenant=<id>
4. Buyer adds product to cart, taps Checkout
5. Frontend submits: POST /v1/storefront/orders
6. Backend creates order in DB
7. Backend sends Telegram message to merchant (via merchant's bot)
8. Backend triggers WebSocket update to merchant's open dashboards
9. Backend returns order ID to buyer
10. Buyer sees confirmation screen
```

**Example B: Merchant processes an order**

```
1. Merchant gets Telegram notification about new order
2. Merchant taps notification → opens admin Mini App
3. Frontend loads orders: GET /v1/merchant/orders?status=new
4. Merchant swipes order right to advance status
5. Frontend submits: PATCH /v1/merchant/orders/<id>/status
6. Backend updates order, logs audit, sends notification to buyer
7. Backend triggers WebSocket update to other merchant devices
```

**Example C: Platform admin refunds a subscription**

```
1. Platform admin logs into ops.dokonly.com
2. Searches for tenant by name
3. Opens tenant detail page
4. Clicks Subscriptions tab → finds invoice → "Refund"
5. Confirms refund amount
6. Frontend submits: POST /v1/platform/tenants/<id>/refund
7. Backend calls payment provider to issue refund
8. Backend updates subscription status, logs platform audit
9. Backend sends email to merchant
```

---

## 3. The Three Sides — Conceptual Model

Understanding the three sides is critical. They have different goals, access levels, and UX patterns.

### 3.1 Platform Owner (Dokonly Team)

**Who they are:** You (the founders) + future team members (support, growth, finance).

**What they need:**
- See all merchants, all their activity (aggregated)
- Manage subscriptions, billing, refunds
- Handle customer support tickets
- Monitor platform health (uptime, errors, AI costs)
- Manage content (help articles, blog posts)
- Configure system (countries, currencies, feature flags)
- Manage their own team and permissions
- Review audit logs for compliance

**Access:**
- Login at `ops.dokonly.com` with email + password + 2FA
- Different role levels (Owner, Admin, Support, Finance, Read-only)
- Cannot see merchant private data (chat messages, product details) without justification logged in audit

**Mental model:** "I run a SaaS business. I need ops tools."

### 3.2 Merchant (Store Owner)

**Who they are:** Small/medium business owners — typically 25-45 years old in UZ — running their store via Telegram.

**What they need:**
- Set up their store in minutes
- Manage products (add, edit, organize)
- Process orders quickly (from new to delivered)
- Communicate with customers
- Run marketing campaigns
- See sales analytics
- Manage their team (if multi-person)
- Configure payments and shipping
- Track their subscription with Dokonly

**Access:**
- **Mobile:** Telegram-based auth (no password). Open their bot → Mini App.
- **Web:** Login at `admin.dokonly.com` via Telegram Login Widget OR email+password.
- They can have multiple stores (Premium tier).
- They can have team members with different roles.

**Mental model:** "I have a small business. I sell things. Help me sell more."

### 3.3 Buyer (Customer of Merchant)

**Who they are:** Telegram users in UZ (later in expansion markets) who buy from merchant stores.

**What they need:**
- Browse a store's catalog quickly
- See product details (photos, video, description, reviews)
- Add to cart, check out
- Pay easily (local methods)
- Track order status
- Get notifications
- Possibly return items
- Earn/redeem loyalty rewards

**Access:**
- No Dokonly account. Identified via Telegram user ID per merchant.
- Each merchant has their own "customer database" (data isolation).
- Same Telegram user can be a customer of multiple merchants — they have separate identities per merchant.

**Mental model:** "I want to buy something. Make it fast."

### 3.4 Data Isolation Rules

Critical for the platform to work correctly:

```
Platform Owner (ops.dokonly.com)
├── Can see: ALL merchants, ALL orders (aggregated), ALL payments, ALL system data
├── Cannot see (without justification): Specific merchant DMs, raw customer PII
└── All actions logged in platform_audit_logs

Merchant (admin.dokonly.com OR Mini App)
├── Can see: ONLY their own tenant data (products, orders, customers, analytics)
├── Cannot see: Other merchants' data, platform-level data, Dokonly internal data
├── Team members: See only what their role allows
└── All actions logged in audit_logs (tenant-scoped)

Buyer (Storefront Mini App)
├── Can see: ONE merchant's store (the bot they opened)
│   ├── Products of THAT merchant
│   ├── Their own cart and orders with THAT merchant
│   └── Their loyalty balance with THAT merchant
├── Cannot see: Other merchants, other buyers, merchant internal data
└── Tracked via Telegram user ID per tenant
```

**Implementation:** Row-Level Security (RLS) in Supabase + tenant_id filtering at API layer + JWT claims for platform admins.

### 3.5 Permission Matrix

#### Merchant Team Roles

| Action | Owner | Admin | Manager | Viewer |
|---|---|---|---|---|
| Edit store settings | ✓ | ✓ | ✕ | ✕ |
| Manage subscription/billing | ✓ | ✕ | ✕ | ✕ |
| Invite/remove team | ✓ | ✓ | ✕ | ✕ |
| Add/edit products | ✓ | ✓ | ✓ | ✕ |
| Delete products | ✓ | ✓ | ✕ | ✕ |
| Process orders | ✓ | ✓ | ✓ | ✕ |
| Cancel orders | ✓ | ✓ | ✕ | ✕ |
| Approve returns | ✓ | ✓ | ✕ | ✕ |
| Manage customers (CRM) | ✓ | ✓ | ✓ | View only |
| Send mass mailings | ✓ | ✓ | ✓ | ✕ |
| Configure payments | ✓ | ✓ | ✕ | ✕ |
| Configure loyalty | ✓ | ✓ | ✕ | ✕ |
| View analytics | ✓ | ✓ | ✓ | ✓ |
| Export data | ✓ | ✓ | ✓ | ✕ |
| Use AI features | ✓ | ✓ | ✓ | ✕ |

#### Platform Team Roles

| Action | Owner | Admin | Support | Finance | Read-only |
|---|---|---|---|---|---|
| Add/remove platform team | ✓ | ✕ | ✕ | ✕ | ✕ |
| Edit system configuration | ✓ | ✓ | ✕ | ✕ | ✕ |
| Manage feature flags | ✓ | ✓ | ✕ | ✕ | ✕ |
| View all tenants | ✓ | ✓ | ✓ | ✓ | ✓ |
| Impersonate merchant | ✓ | ✓ | ✓ | ✕ | ✕ |
| Issue refunds | ✓ | ✓ | ✕ | ✓ | ✕ |
| Manually adjust subscriptions | ✓ | ✓ | ✕ | ✓ | ✕ |
| Suspend tenant accounts | ✓ | ✓ | ✕ | ✕ | ✕ |
| Reply to support tickets | ✓ | ✓ | ✓ | ✕ | ✕ |
| View financial reports | ✓ | ✓ | ✕ | ✓ | ✓ |
| Publish help articles | ✓ | ✓ | ✓ | ✕ | ✕ |
| View audit logs | ✓ | ✓ | ✕ | ✓ | ✓ |

---

## 4. Authentication & Authorization

### 4.1 Three Authentication Systems

Each side uses a different auth mechanism:

#### Platform Owner Authentication
- **Method:** Email + password + 2FA (TOTP)
- **Endpoint:** `POST /v1/platform/auth/login`
- **Session:** JWT access token (15 min) + refresh token (7 days)
- **Storage:** httpOnly secure cookie for refresh, memory for access
- **2FA:** Required for all platform admin accounts
- **Password requirements:** 12+ chars, mixed case, number, special char
- **Account recovery:** Manual via owner approval (no self-serve reset for security)

#### Merchant Authentication
- **Method A (Mini App):** Telegram WebApp initData validation
- **Method B (Web):** Telegram Login Widget OR email/password as backup
- **Endpoint A:** `POST /v1/merchant/auth/telegram-webapp` (validates initData)
- **Endpoint B:** `POST /v1/merchant/auth/login` (email/password)
- **Endpoint C:** `POST /v1/merchant/auth/telegram-login-widget` (web login)
- **Session:** JWT access token (1 hour) + refresh token (30 days)
- **2FA:** Optional, recommended for Premium+
- **Account recovery:** Via verified phone or email

#### Buyer Authentication
- **Method:** Telegram WebApp initData (always, no other option)
- **Endpoint:** Implicit — `tenant_id` from URL + Telegram user from initData
- **Session:** Short-lived JWT (1 hour) tied to (tenant_id, telegram_user_id)
- **No login screen** — instant access via Telegram identity
- **Customer record:** Auto-created on first interaction with merchant's bot

### 4.2 JWT Claims Structure

```typescript
// Platform admin JWT
{
  sub: "platform_user_id",
  role: "owner" | "admin" | "support" | "finance" | "readonly",
  type: "platform",
  iat: 1234567890,
  exp: 1234568790
}

// Merchant JWT
{
  sub: "user_id",
  tenant_id: "tenant_uuid",        // active tenant context
  available_tenants: ["uuid1", "uuid2"],  // multi-store support
  role: "owner" | "admin" | "manager" | "viewer",
  permissions: ["products:write", "orders:read", ...],
  type: "merchant",
  iat: 1234567890,
  exp: 1234571490
}

// Buyer JWT
{
  sub: "telegram_user_id",
  tenant_id: "tenant_uuid",
  customer_id: "customer_uuid",
  type: "buyer",
  iat: 1234567890,
  exp: 1234571490
}
```

### 4.3 API Namespacing

Each side has its own URL namespace:

```
/v1/platform/*    → Platform admin endpoints (auth: platform JWT)
/v1/merchant/*    → Merchant endpoints (auth: merchant JWT)
/v1/storefront/*  → Buyer endpoints (auth: buyer JWT or initData)
/v1/public/*      → Public endpoints (no auth — health, prices, signup)
/v1/webhooks/*    → Incoming webhooks (Telegram, payment providers)
```

### 4.4 Middleware Stack

Every request passes through:

1. **CORS middleware** — restrict origins per environment
2. **Request ID middleware** — generates X-Request-ID for logging
3. **Auth middleware** — extracts JWT, validates, attaches user
4. **Rate limiting** — per-IP and per-token limits
5. **Tenant context middleware** (merchant + storefront only) — sets tenant_id in context
6. **RLS context middleware** — sets `auth.uid()` and `auth.tenant_id()` for Supabase RLS
7. **Audit logging middleware** — logs write actions (POST/PATCH/DELETE)
8. **Error handler** — returns standardized error responses

### 4.5 Standardized Error Responses

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "You have reached your plan's product limit (250)",
    "details": {
      "current": 250,
      "limit": 250,
      "feature": "product_count",
      "tier": "start"
    },
    "upgrade_url": "/billing/upgrade?to=business"
  },
  "request_id": "req_abc123"
}
```

Error codes are defined enums (see `apps/api/dokonly_api/errors.py`).

---

## 5. Database Architecture

### 5.1 Schema Organization

Tables grouped by domain. Each table has:
- `id` (UUID, primary key)
- `tenant_id` (UUID, foreign key) — except for platform-level tables
- `created_at`, `updated_at` (TIMESTAMPTZ)
- Soft delete where appropriate (`deleted_at` instead of hard delete)

### 5.2 Domain: Platform (no tenant_id)

```sql
-- Platform users (Dokonly team)
CREATE TABLE platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'support', 'finance', 'readonly')),
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform-wide audit log
CREATE TABLE platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id UUID NOT NULL REFERENCES platform_users(id),
  action TEXT NOT NULL,  -- 'tenant.suspended', 'refund.issued', etc.
  target_type TEXT,  -- 'tenant', 'subscription', 'platform_setting'
  target_id UUID,
  justification TEXT,  -- required for sensitive actions
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform settings (global config)
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES platform_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Example settings:
-- 'maintenance_mode' → {"enabled": false}
-- 'ai_global_budget_usd' → {"monthly_cap": 5000}
-- 'feature_flags_global' → {"new_onboarding": true}

-- Currencies supported by platform
CREATE TABLE currencies (
  code TEXT PRIMARY KEY,  -- 'UZS', 'KZT', 'USD', etc.
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Countries supported
CREATE TABLE countries (
  code TEXT PRIMARY KEY,  -- 'UZ', 'KZ', etc.
  name_translations JSONB NOT NULL,
  default_currency TEXT REFERENCES currencies(code),
  default_language TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  launched_at DATE,
  config JSONB DEFAULT '{}'  -- legal rules, available providers, etc.
);

-- Knowledge base articles
CREATE TABLE help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_translations JSONB NOT NULL,
  content_translations JSONB NOT NULL,
  video_url TEXT,
  category TEXT,
  position INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES platform_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Domain: Merchant Identity

```sql
-- End users (merchants + buyers + platform via Telegram)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  phone TEXT,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  default_language TEXT DEFAULT 'ru',
  country TEXT REFERENCES countries(code),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  password_hash TEXT,  -- optional, for web login fallback

  -- Mini tours seen (Section 10.5.5)
  mini_tours_seen JSONB DEFAULT '{}',
  -- e.g., {"storefront_theme": "2026-05-15T10:23Z", "mass_mailing": "2026-05-15T14:11Z"}

  -- News channel subscription prompt (Section 7.12)
  subscribed_to_news_channel_prompt_at TIMESTAMPTZ,
  -- When subscription prompt was shown to user. NULL = never shown (will show on next admin open).

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants (merchant stores)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),

  -- Bot
  bot_token_encrypted TEXT NOT NULL,
  bot_token_hash TEXT NOT NULL UNIQUE,
  bot_username TEXT NOT NULL UNIQUE,
  bot_added_at TIMESTAMPTZ,
  bot_inline_mode_enabled BOOLEAN DEFAULT FALSE,
  -- Tracked via getMe.supports_inline_queries. Required for product share feature.
  -- Merchant enables via @BotFather → /setinline → choose bot → set placeholder text.
  bot_inline_mode_checked_at TIMESTAMPTZ,

  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,  -- short URL identifier
  description TEXT,
  description_translations JSONB DEFAULT '{}',
  cover_url TEXT,
  logo_url TEXT,
  business_category TEXT NOT NULL,

  -- Localization
  country TEXT NOT NULL REFERENCES countries(code),
  currency TEXT NOT NULL REFERENCES currencies(code),
  default_language TEXT NOT NULL,
  supported_languages TEXT[] NOT NULL DEFAULT '{}',
  timezone TEXT NOT NULL,

  -- Contact info (shown to buyers)
  contact_phone TEXT,
  contact_email TEXT,
  contact_telegram TEXT,
  contact_instagram TEXT,
  contact_address TEXT,
  working_hours JSONB,

  -- Legal
  legal_status TEXT,
  legal_data JSONB DEFAULT '{}',

  -- Storefront Theme System (see Section 9.0)
  -- All tenants have these defaults; deeper customization is tier-gated
  layout TEXT NOT NULL DEFAULT 'boutique',
  -- 'boutique' | 'catalog' | 'lookbook' | 'marketplace' | 'bento'
  -- Старт: locked to 'boutique' (changeable via support)
  -- Бизнес+: choose from all 5 at onboarding, change anytime
  typography_bundle TEXT NOT NULL DEFAULT 'modern',
  -- 'modern' | 'editorial' | 'bold' | 'warm' | 'minimal'
  accent_color TEXT NOT NULL DEFAULT 'emerald',
  -- One of 12 preset color tokens: forest, emerald, mint, lime, ocean, sky,
  -- indigo, sunset, coral, rose, graphite, sand
  theme_preset_id TEXT,
  -- If applied a quick-start preset (Бизнес+ feature), reference here:
  -- 'modern_fashion', 'tech_store', 'cosy_home', 'sport_energy', 'premium_boutique', etc.

  -- Configurable blocks (Бизнес+ only — Старт uses layout defaults)
  storefront_blocks JSONB DEFAULT '{}',
  -- {
  --   "stories": {"enabled": true, "style": "instagram"},   // instagram | tiktok | hidden
  --   "featured_banner": {"enabled": true, "rotate": true},
  --   "trust_strip": {"enabled": true, "items": ["delivery", "contact", "rating"]},
  --   "categories": {"enabled": true, "style": "bento"},    // bento | burger | scrolling | tabs | grid
  --   "products_grid": {"enabled": true, "card_style": "vertical"},  // mandatory always true
  --   "about_block": {"enabled": false},
  --   "reviews_section": {"enabled": false},
  --   "recently_viewed": {"enabled": true}
  -- }

  -- Branding (Старт shows watermark, Бизнес+ can hide)
  show_dokonly_branding BOOLEAN DEFAULT TRUE,
  custom_favicon_url TEXT,  -- Бизнес+ only

  -- Channel integration
  telegram_channel_username TEXT,
  channel_subscription_required BOOLEAN DEFAULT FALSE,
  channel_bot_admin_verified BOOLEAN DEFAULT FALSE,

  -- Subscription state (denormalized from subscriptions table for quick checks)
  plan TEXT NOT NULL DEFAULT 'trial',
  plan_status TEXT NOT NULL DEFAULT 'trial',  -- 'trial', 'active', 'past_due', 'canceled', 'suspended'
  trial_ends_at TIMESTAMPTZ,
  plan_renewed_at TIMESTAMPTZ,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspended_reason TEXT,

  -- Settings (denormalized)
  settings JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_owner ON tenants(owner_id);
CREATE INDEX idx_tenants_bot_hash ON tenants(bot_token_hash);
CREATE INDEX idx_tenants_country ON tenants(country);
CREATE INDEX idx_tenants_plan ON tenants(plan_status, plan);

-- Tenant admins (team members)
CREATE TABLE tenant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
  permissions JSONB DEFAULT '[]',  -- override role defaults
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{}',
  UNIQUE(tenant_id, user_id)
);
```

### 5.4 Domain: Catalog

```sql
-- Product categories (created by merchant)
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES product_categories(id),  -- for hierarchy (v2)
  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}',
  slug TEXT NOT NULL,
  emoji TEXT,
  cover_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  products_count INTEGER DEFAULT 0,  -- denormalized
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,

  -- Identity
  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}',
  description TEXT,
  description_translations JSONB DEFAULT '{}',
  slug TEXT NOT NULL,
  sku TEXT,

  -- Pricing
  price DECIMAL(15, 2) NOT NULL,
  compare_at_price DECIMAL(15, 2),
  cost_per_item DECIMAL(15, 2),
  currency TEXT NOT NULL,

  -- Inventory
  stock INTEGER,  -- NULL = unlimited
  track_inventory BOOLEAN DEFAULT TRUE,
  low_stock_threshold INTEGER DEFAULT 5,

  -- Media
  images JSONB DEFAULT '[]',
  -- Each image: {id, url, alt, position, ai_processed: false}
  video_url TEXT,
  video_thumbnail_url TEXT,
  ai_processed_images JSONB DEFAULT '[]',

  -- Variants (sizes, colors, etc.)
  has_variants BOOLEAN DEFAULT FALSE,
  variant_options JSONB DEFAULT '[]',  -- [{name: "Size", values: ["S","M","L"]}]
  variants JSONB DEFAULT '[]',  -- combinations with own SKU/price/stock

  -- Attributes (characteristics)
  attributes JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  ai_generated_description BOOLEAN DEFAULT FALSE,

  -- SEO/Search
  tags TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,  -- for full-text search

  -- Stats (denormalized)
  views_count INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  revenue_total DECIMAL(15, 2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_tenant_active ON products(tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_featured ON products(tenant_id, is_featured) WHERE is_featured = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Stories (Instagram-style banners on storefront)
CREATE TABLE store_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  thumbnail_url TEXT,
  caption TEXT,
  link_type TEXT,  -- 'product', 'category', 'external_url', NULL
  link_target TEXT,  -- product_id, category_id, or full URL
  position INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 Domain: Orders & Customers

```sql
-- Customers (one per merchant)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  telegram_username TEXT,

  -- Profile (buyer-managed via Profile tab)
  -- REQUIRED:
  phone TEXT,                                -- required at first checkout, prefer verified via Telegram
  phone_verified_via_telegram BOOLEAN DEFAULT FALSE,
  -- TRUE if obtained via Telegram.WebApp.requestContact() with valid HMAC.
  -- FALSE if manually entered (older Telegram clients or buyer override).
  phone_verified_at TIMESTAMPTZ,             -- when verification happened
  -- AUTO-FILLED from Telegram (editable):
  first_name TEXT,                           -- from Telegram first_name
  last_name TEXT,                            -- opt-in, can add manually
  avatar_url TEXT,                           -- from Telegram photo_url, or custom upload
  custom_avatar_url TEXT,                    -- if buyer uploaded custom (overrides Telegram)
  -- OPT-IN:
  email TEXT,                                -- opt-in, valuable for receipts
  birthday DATE,                             -- opt-in, enables birthday rewards
  default_address TEXT,                      -- saved delivery address (last used)
  default_address_data JSONB,                -- {street, building, apt, city, region, postal_code}
  language TEXT,                             -- preferred language (auto from Telegram, editable)

  -- Legacy field (deprecated, kept for migration; use first_name + last_name)
  full_name TEXT,
  -- Legacy location field (use default_address now)
  location TEXT,

  -- CRM (merchant-managed, NOT visible to buyer)
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  segments TEXT[] DEFAULT '{}',  -- auto-computed: 'vip', 'lapsed', 'new', 'active'

  -- Analytics
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(15, 2) DEFAULT 0,
  avg_order_value DECIMAL(15, 2) DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,

  -- Attribution
  traffic_source_id UUID,
  referred_by_referral_id UUID,              -- if customer came via referral

  -- Loyalty link
  loyalty_account_id UUID,

  -- Privacy (for GDPR/data export/delete)
  data_export_requested_at TIMESTAMPTZ,
  deletion_requested_at TIMESTAMPTZ,         -- soft delete timestamp
  is_deleted BOOLEAN DEFAULT FALSE,          -- anonymized but kept for orders integrity

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, telegram_id)
);

CREATE INDEX idx_customers_tenant_telegram ON customers(tenant_id, telegram_id);
CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone) WHERE phone IS NOT NULL;

-- Wishlist (per-tenant favorite products)
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, customer_id, product_id)
);

CREATE INDEX idx_wishlist_customer ON wishlist_items(customer_id, added_at DESC);
CREATE INDEX idx_wishlist_product ON wishlist_items(product_id);

-- View tracking for "Recently viewed" feature
CREATE TABLE customer_product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 1,

  UNIQUE(tenant_id, customer_id, product_id)
);

CREATE INDEX idx_product_views_customer_recent ON customer_product_views(customer_id, last_viewed_at DESC);

-- Product shares (viral mechanic tracking)
-- Records every time customer shares a product via Telegram inline mode or Story.
-- Used for analytics, viral coefficient measurement, and referral attribution.
CREATE TABLE product_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shared_by_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- Referral attribution: which referral code was embedded in share
  referral_code TEXT,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  -- Share metadata
  share_method TEXT NOT NULL,
  -- 'inline_query' (chat picker), 'share_to_story' (Telegram Story),
  -- 'copy_link' (fallback if inline disabled)
  shared_to_chat_type TEXT,
  -- 'user', 'group', 'channel', NULL if unknown
  -- Outcome tracking
  link_click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  resulted_in_visit BOOLEAN DEFAULT FALSE,
  visit_count INTEGER DEFAULT 0,
  resulted_in_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  resulted_in_signup_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shares_tenant_product ON product_shares(tenant_id, product_id, created_at DESC);
CREATE INDEX idx_shares_referrer ON product_shares(shared_by_customer_id, created_at DESC);
CREATE INDEX idx_shares_referral_code ON product_shares(referral_code) WHERE referral_code IS NOT NULL;

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number TEXT NOT NULL,  -- "ORD-63IDO8BO38T2"

  -- Items (snapshot at order time)
  items JSONB NOT NULL,

  -- Pricing breakdown
  subtotal DECIMAL(15, 2) NOT NULL,
  discount_total DECIMAL(15, 2) DEFAULT 0,
  coupon_code TEXT,
  loyalty_points_used INTEGER DEFAULT 0,
  cashback_used DECIMAL(15, 2) DEFAULT 0,
  shipping_cost DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,

  -- Customer info (snapshot)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_location TEXT,
  customer_comment TEXT,

  -- Delivery
  delivery_method_id UUID REFERENCES delivery_methods(id),
  delivery_address TEXT,
  delivery_notes TEXT,
  delivery_eta TIMESTAMPTZ,

  -- Payment
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending', 'paid', 'partially_paid', 'refunded', 'failed', 'cancelled'
  payment_proof_url TEXT,
  payment_data JSONB DEFAULT '{}',
  external_payment_id TEXT,

  -- Split payment
  is_split_payment BOOLEAN DEFAULT FALSE,
  split_payment_data JSONB,

  -- Loyalty earned
  loyalty_points_earned INTEGER DEFAULT 0,
  cashback_earned DECIMAL(15, 2) DEFAULT 0,

  -- Referral
  referral_id UUID,

  -- Traffic attribution
  traffic_source_id UUID,
  utm_data JSONB DEFAULT '{}',

  -- Status funnel
  status TEXT NOT NULL DEFAULT 'created',
  -- 'created', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled', 'returned'
  status_history JSONB DEFAULT '[]',
  -- [{from, to, timestamp, user_id, reason}]

  -- Review
  review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
  review_text TEXT,
  review_at TIMESTAMPTZ,
  review_reminder_sent_at TIMESTAMPTZ,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  cancelled_by_user_id UUID REFERENCES users(id),

  -- Return tracking
  return_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, order_number)
);

CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Delivery methods
CREATE TABLE delivery_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}',
  description TEXT,
  cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  free_above_amount DECIMAL(15, 2),  -- free shipping threshold
  estimated_time_days INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Picking lists (for warehouse fulfillment)
CREATE TABLE picking_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  picker_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Returns & exchanges
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('return', 'exchange')),
  reason TEXT NOT NULL,
  reason_text TEXT,
  items JSONB NOT NULL,
  refund_amount DECIMAL(15, 2),
  exchange_items JSONB,
  status TEXT NOT NULL DEFAULT 'requested',
  -- 'requested', 'approved', 'rejected', 'received', 'completed', 'cancelled'
  photos JSONB DEFAULT '[]',
  customer_notes TEXT,
  admin_notes TEXT,
  status_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Carts (persistent across sessions for buyers)
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  telegram_user_id BIGINT,
  items JSONB NOT NULL DEFAULT '[]',
  applied_coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- For abandoned cart tracking
  recovery_sent_at TIMESTAMPTZ,
  abandoned BOOLEAN DEFAULT FALSE,
  abandoned_at TIMESTAMPTZ,
  recovered BOOLEAN DEFAULT FALSE
);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
  value DECIMAL(15, 2) NOT NULL,
  min_order_amount DECIMAL(15, 2),
  max_discount_amount DECIMAL(15, 2),  -- cap for percentage coupons
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  max_uses_per_customer INTEGER,
  applicable_categories UUID[],  -- empty = all
  applicable_products UUID[],
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);
```

### 5.6 Domain: Marketing & Loyalty

```sql
-- Mass mailings
CREATE TABLE mass_mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Content
  text TEXT NOT NULL,
  text_translations JSONB DEFAULT '{}',
  image_url TEXT,
  cta_button JSONB,  -- {text, url}

  -- Targeting
  segment_filter JSONB DEFAULT '{}',
  recipient_count INTEGER DEFAULT 0,

  -- AI
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,

  -- Schedule & status
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'

  -- Stats
  delivered_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  ordered_count INTEGER DEFAULT 0,  -- attribution to mailing
  revenue_attributed DECIMAL(15, 2) DEFAULT 0,

  -- Author
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mailing_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailing_id UUID NOT NULL REFERENCES mass_mailings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  ordered_at TIMESTAMPTZ,
  attributed_order_id UUID REFERENCES orders(id)
);

-- Loyalty
CREATE TABLE loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE,
  earn_rate_percent DECIMAL(5, 2) DEFAULT 1.0,
  cashback_rate_percent DECIMAL(5, 2) DEFAULT 1.0,
  point_to_currency_rate DECIMAL(10, 4) DEFAULT 0.01,
  min_redemption_points INTEGER DEFAULT 100,
  max_redemption_percent DECIMAL(5, 2) DEFAULT 50.0,  -- max % of order paid with points
  points_expiry_months INTEGER,
  tier_thresholds JSONB DEFAULT '{"silver": 1000, "gold": 5000, "platinum": 20000}',
  tier_benefits JSONB DEFAULT '{}',
  rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id),
  points_balance INTEGER DEFAULT 0,
  cashback_balance DECIMAL(15, 2) DEFAULT 0,
  lifetime_points_earned INTEGER DEFAULT 0,
  lifetime_points_redeemed INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  tier_progress INTEGER DEFAULT 0,
  next_tier_threshold INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES loyalty_accounts(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'adjustment')),
  points INTEGER DEFAULT 0,
  cashback DECIMAL(15, 2) DEFAULT 0,
  order_id UUID REFERENCES orders(id),
  description TEXT,
  adjusted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements (gamification for merchants)
-- See app_specification.md §7.11.X for full system design
-- Achievement definitions are PLATFORM-LEVEL (defined globally, available to all tenants)
CREATE TABLE achievement_definitions (
  id TEXT PRIMARY KEY,                         -- 'first_sale', '100_orders', etc.
  category TEXT NOT NULL,                      -- 'milestone' | 'feature_use' | 'engagement' | 'special'
  tier TEXT,                                   -- 'bronze' | 'silver' | 'gold' | 'platinum'
  icon TEXT NOT NULL,                          -- emoji or icon name
  name_translations JSONB NOT NULL,            -- {ru, uz, en}
  description_translations JSONB NOT NULL,
  condition_type TEXT NOT NULL,
  -- 'order_count', 'revenue', 'feature_first_use', 'streak_days',
  -- 'customer_count', 'review_rating', 'days_active', 'sphere_specific'
  condition_value JSONB NOT NULL,              -- {threshold: 100} or {feature: 'ai_import'}
  reward_type TEXT,                            -- 'badge_only' | 'discount' | 'feature_unlock' | NULL
  reward_value JSONB,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_hidden BOOLEAN DEFAULT FALSE,             -- 'special' achievements hidden until unlocked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant achievement unlocks
CREATE TABLE tenant_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_by_owner BOOLEAN DEFAULT FALSE,         -- shown in UI?
  -- Context at unlock moment (for "shareable" achievements):
  context JSONB DEFAULT '{}',                  -- {order_id, revenue, etc.}
  UNIQUE(tenant_id, achievement_id)
);

CREATE INDEX idx_achievements_tenant ON tenant_achievements(tenant_id, unlocked_at DESC);
CREATE INDEX idx_achievements_unseen ON tenant_achievements(tenant_id, seen_by_owner)
  WHERE seen_by_owner = FALSE;

-- Streaks tracking
-- One row per (tenant, streak_type). Updated by ARQ daily aggregation job.
CREATE TABLE tenant_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL,
  -- 'daily_orders' | 'daily_active' | 'weekly_revenue_grow'
  current_count INTEGER DEFAULT 0,
  max_count INTEGER DEFAULT 0,                 -- all-time max for this streak
  last_increment_at DATE,                      -- last date streak counted
  -- Freeze mechanic (vacation protection)
  is_frozen BOOLEAN DEFAULT FALSE,
  freeze_remaining INTEGER DEFAULT 1,          -- free freezes per month
  freeze_used_at TIMESTAMPTZ,
  -- Streak rewards
  milestones_hit INTEGER[] DEFAULT '{}',       -- [7, 30, 100] streak milestones
  UNIQUE(tenant_id, streak_type)
);

CREATE INDEX idx_streaks_active ON tenant_streaks(tenant_id, streak_type) WHERE current_count > 0;

-- Subscription discount campaigns (tracks usage to prevent re-application)
-- Replaces previous trial_extensions table (Stars-based system removed)
-- See §10.5.3 Trial Conversion Discount for full architecture
CREATE TABLE subscription_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  -- 'trial_ending' (50% off first month, days 13-14 of trial)
  -- 'trial_expired_winback' (30% off first month, 1-7 days post-expiry)
  -- 'cancellation_winback' (20% off for 3 months, 30 days post-cancellation)
  -- 'streak_reward' (10-50% off next month, from streak milestones)
  -- 'manual' (platform owner can issue custom discounts)
  discount_percent INTEGER NOT NULL,
  duration_months INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                      -- when this offer expires if not claimed
  claimed_at TIMESTAMPTZ,                      -- when user actually subscribed using this
  subscription_id UUID,                        -- which subscription it was applied to
  metadata JSONB DEFAULT '{}',
  UNIQUE(tenant_id, campaign_id)               -- one use per campaign per tenant
);

CREATE INDEX idx_discounts_tenant ON subscription_discounts(tenant_id, applied_at DESC);
CREATE INDEX idx_discounts_unclaimed ON subscription_discounts(tenant_id, expires_at)
  WHERE claimed_at IS NULL;

-- Dashboard AI insights (cached, generated every 6h)
CREATE TABLE dashboard_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  -- 'low_stock' | 'lapsed_vip' | 'revenue_dip' | 'no_description' | 'birthday_week' |
  -- 'pending_too_long' | 'returns_to_review' | 'mailing_opportunity'
  priority INTEGER DEFAULT 0,                  -- higher = more important, sort desc
  title_translations JSONB NOT NULL,
  description_translations JSONB NOT NULL,
  action_label_translations JSONB,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',                 -- {product_ids: [], customer_ids: [], count: 5}
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                       -- auto-cleanup after this time
);

CREATE INDEX idx_insights_tenant_active ON dashboard_insights(tenant_id, priority DESC)
  WHERE dismissed_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());

-- Platform news: NOT a database feature.
-- News are posted to a public Telegram channel (e.g., t.me/dokonly_news).
-- Merchants subscribe to receive native Telegram notifications.
-- See app_specification.md §7.3.8 (Menu Group 5) for "News" menu integration.
-- Channel username is stored in environment config: NEWS_TELEGRAM_CHANNEL.

-- Referrals
CREATE TABLE referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE,
  referrer_reward_type TEXT,  -- 'cashback', 'points', 'discount_coupon'
  referrer_reward_value DECIMAL(15, 2),
  referee_reward_type TEXT,
  referee_reward_value DECIMAL(15, 2),
  min_order_amount DECIMAL(15, 2),
  expires_after_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referrer_customer_id UUID NOT NULL REFERENCES customers(id),
  referee_customer_id UUID REFERENCES customers(id),
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending', 'completed', 'expired', 'cancelled'
  first_order_id UUID REFERENCES orders(id),
  referrer_reward_claimed_at TIMESTAMPTZ,
  referee_reward_claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel crossposting
CREATE TABLE channel_crossposting_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_username TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  auto_post_new_products BOOLEAN DEFAULT TRUE,
  auto_post_promotions BOOLEAN DEFAULT FALSE,
  post_template TEXT,
  hashtags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  channel_id TEXT NOT NULL,
  telegram_message_id BIGINT,
  status TEXT NOT NULL,
  error TEXT,
  views_count INTEGER DEFAULT 0,
  forwards_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.7 Domain: Payments & Subscriptions

```sql
-- Payment provider configurations (per tenant)
CREATE TABLE payment_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'manual_transfer', 'click', 'payme', etc.
  is_active BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}',
  -- For manual_transfer: {card_number, holder_name, bank, instructions}
  -- For click: {merchant_id, service_id, secret_key_encrypted}
  -- For payme: {merchant_id, secret_key_encrypted}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- Order payments (transactions)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  -- 'pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'
  external_id TEXT,  -- payment ID from provider
  metadata JSONB DEFAULT '{}',
  raw_response JSONB,  -- last response from provider
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Subscriptions (platform subscriptions for merchants)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('start', 'business', 'premium')),
  status TEXT NOT NULL,
  -- 'trial', 'active', 'past_due', 'canceled', 'expired', 'suspended'
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',  -- 'monthly', 'yearly'
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billing_date DATE,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  payment_method TEXT,
  payment_method_data JSONB DEFAULT '{}',  -- card last 4, etc.
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription invoices
CREATE TABLE subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  -- 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
  payment_provider TEXT,
  payment_id TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  due_date DATE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID REFERENCES subscription_invoices(id),
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL,
  initiated_by_platform_user UUID REFERENCES platform_users(id),
  initiated_by_merchant_user UUID REFERENCES users(id),
  external_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### 5.8 Domain: AI, Analytics, Integrations

```sql
-- AI usage tracking
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  task_type TEXT NOT NULL,
  -- 'product_extraction', 'consultant', 'translation', 'description_generation',
  -- 'voice_transcription', 'photo_processing', 'mailing_generation', 'seller_assistant'
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  duration_ms INTEGER,
  status TEXT NOT NULL,  -- 'success', 'failed', 'rate_limited'
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_tenant_date ON ai_usage_logs(tenant_id, created_at DESC);

-- AI imports (batch operations)
CREATE TABLE ai_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'photo_caption', 'voice', 'channel_post', 'csv', 'excel'
  source_data JSONB NOT NULL,
  result_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  total_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  ai_cost_usd DECIMAL(10, 4) DEFAULT 0,
  created_products_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- 'storefront_opened', 'product_viewed', 'add_to_cart', 'remove_from_cart',
  -- 'checkout_started', 'checkout_completed', 'order_placed', 'order_cancelled',
  -- 'mailing_clicked', 'story_viewed', etc.
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  utm_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned by month for performance:
CREATE INDEX idx_analytics_tenant_event_date
  ON analytics_events(tenant_id, event_type, created_at DESC);

-- Traffic sources
CREATE TABLE traffic_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  referrer TEXT,
  landing_url TEXT,
  first_visit_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  first_order_id UUID REFERENCES orders(id)
);

-- API tokens: NOT in v1.
-- Was originally Enterprise-tier feature. Removed entirely from v1.
-- May return in v1.5+ as Premium add-on if merchants request it.
-- Webhooks (outgoing) also deferred.

-- Webhooks (outgoing)
-- Webhooks: NOT in v1. Was Enterprise-tier feature. Removed entirely.
-- Tables `webhooks` and `webhook_deliveries` deferred to v1.5+.

-- Audit log (per-tenant)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);

-- Support: NOT a database feature.
-- Merchants get support by writing to a separate Telegram bot (e.g., @dokonly_support_bot).
-- Platform team handles inquiries via that bot (manual or via forwarding to internal team group).
-- See app_specification.md §7.X (Support Bot Architecture) for details.
-- If/when ticket volume grows, can be replaced with a proper ticket system in v1.2+.
```

### 5.9 Row-Level Security (RLS) Policies

Critical for multi-tenant data isolation. Applied to all tenant-scoped tables.

```sql
-- Example: products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_tenant_isolation ON products
  USING (tenant_id = auth.tenant_id());

-- For platform admins (separate role)
CREATE POLICY products_platform_admin ON products
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE platform_users.id = auth.uid()
        AND platform_users.is_active = TRUE
    )
  );

-- Buyers can read products but not modify
CREATE POLICY products_buyer_read ON products
  FOR SELECT
  USING (
    tenant_id = auth.tenant_id()
    AND is_active = TRUE
    AND deleted_at IS NULL
  );
```

Each domain has similar policies. The `auth.tenant_id()` function reads from JWT claims set by middleware.

---

## 6. Platform Owner Application

URL: `ops.dokonly.com`
Audience: Dokonly team (you + future employees)
Stack: React + TypeScript + Tailwind + shadcn/ui
Auth: Email + password + 2FA

This is the back-office for running the SaaS business. Web-only (you'll use it from a laptop).

### 6.1 Authentication Flow

#### Screen: Login Page (`/login`)
- Centered card on subtle background
- Logo at top
- Email field
- Password field
- "Sign in" button (primary)
- If 2FA enabled: redirect to `/login/2fa` with TOTP code input
- Forgot password? — disabled link with tooltip "Contact owner"
- No public signup (admin-created only)

#### Screen: 2FA Setup (`/setup-2fa`) — forced on first login
- Display QR code for authenticator app
- Display secret key for manual entry
- Input field for verification code
- "Verify and enable" button
- After success → redirect to dashboard

### 6.2 Dashboard (`/`)

**Purpose:** At-a-glance view of platform health and key metrics.

**Top Stats Row (KPI cards):**
- MRR (Monthly Recurring Revenue) — with trend vs last month
- Active Tenants (subscribed, not trial)
- Trial Tenants
- Churn Rate (last 30 days)
- AI Cost Today (cents) — alert if > daily budget threshold
- Active Support Tickets

**Charts:**
- Revenue chart (line, last 12 months) — MRR over time, broken down by tier
- Tenant growth chart (stacked bar) — new signups + churned per month
- AI cost chart (line) — daily AI spend per provider
- Conversion funnel — Trial → Active (with % drop-off)
- Top countries — bar chart by tenant count
- Top business categories — donut chart

**Recent Activity Feed:**
- Last 20 events: new tenant, subscription change, refund, support ticket, system alert

**Quick Actions:**
- Search tenant (Cmd+K modal)
- Create platform user
- Send announcement (broadcast email to all merchants)
- View system status

### 6.3 Tenants Management

#### Screen: All Tenants (`/tenants`)

**Top bar:**
- Search input (search by name, bot username, owner email, owner phone)
- Filters: Plan, Status, Country, Sign-up date range, Last active date range
- Sort: Recent / Revenue / Orders / Created date
- Export button (download CSV of filtered)
- "+ Create tenant" (for sales-assisted creation)

**Table columns:**
- Tenant name + bot username (clickable → detail)
- Owner (name + Telegram username)
- Country flag + country code
- Plan badge
- Status badge (with color: green/yellow/red)
- MRR contribution
- Last active (X days ago)
- Created date
- Actions menu (⋮): View, Impersonate, Suspend, Notes

#### Screen: Tenant Detail (`/tenants/<id>`)

**Tabs:**
1. **Overview** — summary
2. **Subscription** — billing & invoices
3. **Orders** — their orders (aggregated, no PII)
4. **Products** — catalog stats
5. **Team** — team members
6. **Settings** — config
7. **Activity Log** — what they've done
8. **Notes** — internal notes from platform team

##### Tab: Overview
- Top: tenant name, bot link (opens Telegram), avatar, plan badge, status
- Action buttons row:
  - "Impersonate" (start session as this merchant — logged in audit)
  - "Send message" (Telegram message to owner)
  - "Suspend" (with reason required, modal confirm)
  - "View Mini App" (open their storefront)
- Key metrics cards (lifetime totals)
- Recent activity timeline

##### Tab: Subscription
- Current plan card with details (price, renewal date)
- Actions: "Upgrade", "Downgrade", "Cancel", "Extend trial", "Issue refund"
- Invoices table with PDF download
- Payment method info
- Subscription history (plan changes log)

##### Tab: Orders
- Aggregate stats only (counts, revenue), NO individual order PII (privacy)
- Top 10 products by revenue (for this tenant)
- Order status distribution

##### Tab: Products
- Total products count (vs plan limit)
- Category breakdown
- AI-generated vs manual ratio
- Top viewed products (top 5)

##### Tab: Team
- List of team members
- Roles
- Last active
- Actions: "Remove from team" (with confirmation)

##### Tab: Settings
- Country, currency, language, timezone
- Feature overrides (manually enable/disable features for this tenant)
- AI budget override

##### Tab: Activity Log
- Combined view: audit_logs (their team) + their platform actions
- Filter by user, by action type, by date range
- Export

##### Tab: Notes
- Free-text notes from platform team
- Each note has author + timestamp
- Add note button

#### Screen: Impersonation (`/impersonate/<tenant_id>`)

When platform admin clicks "Impersonate":
1. Confirmation modal: "You are about to impersonate <merchant>. This action is logged. Confirm?"
2. Justification field (required, free text)
3. On confirm: open new tab to `admin.dokonly.com` with special JWT
4. Persistent red banner at top: "🔴 You are impersonating <merchant>. Click here to exit."
5. All actions performed are double-logged: in their audit_logs AND in platform_audit_logs

### 6.4 Subscriptions & Billing

#### Screen: Subscriptions Overview (`/billing`)

**Tabs:**
1. All Subscriptions — table view
2. Invoices — table of all invoices across all tenants
3. Refunds — refunds history
4. Failed Payments — needs attention

### 6.5 Support Tickets

#### Screen: Tickets List (`/support`)

- Filters: status, priority, assigned to
- Search by ticket number, tenant name, content
- SLA breach indicator (red dot for tickets approaching/breached SLA)

#### Screen: Ticket Detail (`/support/<id>`)

- Conversation thread with merchant
- Reply box (public reply OR internal note toggle)
- Side panel with tenant info card
- Suggested help articles (AI-suggested based on subject)

### 6.6 Platform Analytics

#### Screen: Growth (`/analytics/growth`)
- MRR chart, new tenants, activation rate, trial conversion, churn, cohort retention

#### Screen: Revenue (`/analytics/revenue`)
- Total revenue by month, by country, by plan, ARPU, LTV, refund rate

#### Screen: Product Usage (`/analytics/product`)
- Most-used features, AI feature adoption per plan, channel gate adoption

#### Screen: AI Costs (`/analytics/ai-costs`)
- Total spend by day, by provider, by task type, top spending tenants

### 6.7 Content Management

#### Screen: Help Articles (`/content/help`)
- List of articles, drag to reorder, categories
- Filter: published / draft
- "+ New article" button

#### Screen: Article Editor (`/content/help/<id>`)
- Slug, title (per language), markdown editor (per language)
- Video URL, category, position
- Publish toggle, preview pane, save/publish buttons

### 6.8 System Configuration

- `/config/countries` — supported countries
- `/config/payment-providers` — provider settings
- `/config/features` — feature flags
- `/config/ai` — AI model selection per task, cost limits

### 6.9 Team Management

#### Screen: Platform Team (`/team`)
- Table of platform users with role badges, 2FA status
- "+ Invite member" button (owner only)

#### Screen: Audit Log (`/audit`)
- Platform-wide audit log with filters and export

### 6.10 System Status (`/status`)
- API uptime, Database health, Redis health
- Sentry recent errors, Background workers status
- AI provider status, Recent incidents log

---

## 7. Merchant Application — Mobile (Telegram Mini App)

URL: opens inside merchant's bot via "Open Admin" button
Audience: Merchants on mobile
Stack: React + TypeScript + Tailwind + Telegram WebApp SDK
Auth: Telegram initData validation

This is the primary interface for merchants. Mobile-first, optimized for one-handed use.

### 7.1 Entry Flow

1. Merchant opens their bot in Telegram (e.g., `@malika_shop_bot`)
2. Bot shows main menu with inline keyboard:
   - 🛍 "Open Store" (for buyers — opens storefront Mini App)
   - ⚙️ "Manage Store" (for merchant — opens admin Mini App)
3. Tapping "Manage Store" → Mini App loads at `app.dokonly.com/admin?tenant=<id>`
4. Frontend reads initData, sends to backend
5. Backend validates HMAC of initData, identifies user
6. If user is owner/admin of this tenant → returns JWT + tenant info
7. If not → shows "Access denied" screen

### 7.2 Layout Structure

```
┌──────────────────────────┐
│  Telegram BackButton     │ ← native, hidden on root
├──────────────────────────┤
│  Page content (scroll)   │
│  pt-safe                 │ ← safe area top
├──────────────────────────┤
│  Bottom Navigation (5)   │ ← persistent
│  [Home] [Cat] [Ord] ...  │
│  pb-safe                 │
└──────────────────────────┘
```

**Bottom Nav items:**
- 🏠 Home (Dashboard)
- 📦 Catalog (Products + Categories)
- 🛍 Orders (with badge for new orders count)
- 📊 Analytics
- ⋯ More (settings, marketing, AI, team, billing)

### 7.3 Dashboard (`/`)

The Dashboard is the **first thing merchants see** after auth. It needs to deliver immediate value (today's metrics, pending actions), reinforce identity (store branding), and drive engagement (achievements, streaks, subscription engagement).

Inspired by best practices from Sellz (competitor) — but with deeper functionality.

#### Layout Overview

```
┌────────────────────────────────┐
│                                │
│   HERO HEADER                  │ ← Cover image + Store name
│   [Cover image]                │
│   Malika Beauty                │
│   [View Store ›]   [Edit]      │
│                                │
├────────────────────────────────┤
│   TODAY'S PULSE STRIP          │ ← Live KPIs (compact)
│   [Today] [Orders] [Conv]      │
├────────────────────────────────┤
│   SUBSCRIPTION CARD            │ ← Plan status + upgrade CTA
│   Free Trial · 5 Days Left     │
│   ▓▓▓░░░░░ Expires 28-05-2026  │
│   [Subscribe →]                │
├────────────────────────────────┤
│   STATUS BADGES                │ ← Achievements + Streaks summary
│   🏆 Plan: Trial               │
│   🎖 Achievements: 7/24        │
│   🔥 Streak: 12 days           │
├────────────────────────────────┤
│   AI INSIGHTS (Business+)      │ ← Smart suggestions
│   ⚠️ 5 products low on stock   │
│   💡 Try AI mailing for VIPs   │
├────────────────────────────────┤
│   RECENT ORDERS                │ ← Last 3 with quick advance
│   [Order #1] [Order #2] [...] │
│   View all orders ›            │
├────────────────────────────────┤
│   QUICK ACTIONS                │
│   [+ Add product]              │
│   [📨 Send mailing]            │
│   [👀 View as buyer]           │
├────────────────────────────────┤
│   MENU GROUPS                  │ ← Settings access (Sellz pattern)
│   Catalog & Operations         │
│   Marketing & Growth           │
│   Configuration                │
│   People                       │
│   Help & News                  │
└────────────────────────────────┘
[Bottom Nav: 🏠* 📦 🛍 📊 ⋯]
```

#### 7.3.1 Hero Header

```
┌────────────────────────────┐
│ ░░ Cover image overlay ░░   │
│ ░ (decorative pattern OR ░  │
│ ░  merchant's uploaded   ░  │
│ ░  cover)                ░  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                  [Edit]    │ ← top-right action
│                            │
│ Malika Beauty              │ ← display font, white, large
│ [View Store ›]             │ ← compact button, glass effect
└────────────────────────────┘
```

**Components:**

- **Cover image** (16:9 ratio at top):
  - Source: `tenants.cover_url` if uploaded
  - Fallback: decorative pattern with accent color tint (per `tenants.accent_color`)
  - Dark gradient overlay (top 30%, bottom 50%) for text legibility
  - Height: ~280px on mobile, ~320px on web
  
- **Store name** (display font, 28px mobile / 36px web):
  - Color: white with subtle shadow
  - Position: bottom-left of cover
  
- **"View Store" button**:
  - Compact pill with chevron
  - Glass blur background (`backdrop-filter: blur(20px)`)
  - Tap → opens storefront Mini App as buyer would see (preview mode)
  - For multi-store: tap shows store picker dropdown if `available_tenants.length > 1`
  
- **"Edit" button** (top-right):
  - Same glass effect
  - Tap → opens Settings → Store profile

**Multi-store switcher (Premium only):**
- If `available_tenants.length > 1`, store name has small dropdown arrow
- Tap → bottom sheet with all owned stores + "+ Create new store" option

#### 7.3.2 Today's Pulse Strip

Horizontal scrolling row of compact KPI chips. Updates real-time via WebSocket.

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Today    │ │ Orders   │ │ Conv     │ │ Active   │
│ 850K     │ │ 12       │ │ 8.4%     │ │ 47       │
│ ▲ +23%   │ │ ▲ +2     │ │ ▼ -1.2%  │ │ ▲ +5     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Chips show:**
- Label (Today / Orders / Conversion / Active)
- Value (mono font, prominent)
- Trend vs yesterday (▲ green / ▼ red / — gray)

**Tap chip:**
- Opens corresponding Analytics page filtered to today

**Performance:**
- Data fetched from `/v1/merchant/dashboard/today-pulse` (cached 60s)
- WebSocket pushes update specific chip on order events

#### 7.3.3 Subscription Status Card

The **engagement engine**. Replaces buried "Settings → Subscription" — promotes to home screen.

```
┌──────────────────────────────┐
│  Subscription Status         │
│                  [Free Trial]│ ← gradient badge
│                              │
│  Time Remaining              │
│                  5 Days Left │
│  ▓▓▓░░░░░░░░░░░ (62%)        │
│  Expires on 28-05-2026       │
│                              │
│  ┌──────────────────────────┐│
│  │  [Subscribe →]           ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

**State-specific rendering:**

**Trial state (Day 1-10 of 14):**
- Badge: "Free Trial" with gradient (cyan→blue)
- Progress bar: filled portion = days passed / 14
- Single CTA: **"Subscribe →"** — opens plan picker

**Trial state (Day 11-12, pre-expiry warning):**
- Badge changes to amber/orange "Trial ending soon"
- Sub-text: "Subscribe now to keep all features"
- Single CTA: "View plans"

**Trial state (Day 13-14, conversion offer active):**
- Badge: "🔥 50% off" with promo gradient
- Card content (see §10.5.3 for full UI):
  ```
  🔥 Limited offer
  Subscribe Business with
  50% off first month
  ~~499 000~~ 249 500 UZS
  
  [Claim 50% offer →]
  [Compare plans]
  ```
- Plan recommendation is smart (based on trial usage — see §10.5.3)

**Trial expired (within 7 days, win-back offer):**
- Badge: "Trial expired" (red)
- Sub-text: "🔥 30% off if you subscribe in next 7 days"
- CTA: "Subscribe with 30% off"

**Active subscription state:**
- Badge: "[Plan name]" in accent color (e.g., "Business" badge)
- "Next billing on 15-06-2026" instead of days remaining
- Progress bar shows month progress
- Single CTA: "Manage subscription"

**Past due state:**
- Badge: "Payment Issue" in red
- "Update payment method to continue"
- Single CTA: "Update payment"

**Cancelled state (within 30 days):**
- Badge: "Cancelled" in gray
- Sub-text: "🔥 20% off for 3 months if you reactivate"
- Single CTA: "Reactivate with 20% off"

**Cancelled state (>30 days):**
- Badge: "Cancelled" in gray
- Sub-text: "Reactivate to restore access"
- Single CTA: "Reactivate"

##### Conversion Discount Mechanic

Replaces previous Stars-based trial extension. See §10.5.3 for full architecture.

**Key principles:**
- **No micro-payments** — Dokonly accepts only UZS via Click/Payme/Uzum/Card (no Telegram Stars)
- **Conversion-focused** — discounts push toward paid subscription, not just delay decision
- **Smart targeting** — recommended plan based on trial usage
- **Once per campaign** — each tenant can use each discount campaign once

**Available campaigns:**

| Campaign | Trigger | Discount | Duration |
|---|---|---|---|
| `trial_ending` | Day 13-14 of trial | 50% off | 1 month |
| `trial_expired_winback` | Expired 1-7 days | 30% off | 1 month |
| `cancellation_winback` | Cancelled 30 days ago | 20% off | 3 months |
| `streak_reward` | Streak milestones | 10-50% off | 1 month |


#### 7.3.4 Status Badges (Plan / Achievements / Streaks)

Compact row showing **identity reinforcement** + gamification hooks.

```
┌──────────┬──────────┬──────────┐
│ 🏆 Plan   │ 🎖 Achieve│ 🔥 Streak│
│ Trial    │ 7/24     │ 12 days  │
│ → Status │ → Unlock │ → Detail │
└──────────┴──────────┴──────────┘
```

**Plan badge:**
- Shows current plan tier with icon
- Tap → opens Subscription page

**Achievements badge:**
- "X/Y unlocked"
- Recent achievement preview on hover/tap
- Pulsing dot if new achievement unlocked (unseen)
- Tap → opens Achievements page (see §7.11.X)

**Streak badge:**
- "X days" with fire emoji
- Tap → opens Streak detail with calendar view + freeze options
- Pulsing if at risk (no order today and current streak ≥ 3 days)

#### 7.3.5 AI Insights (Business+ only)

1-3 dynamic insights generated by `gpt-5.4-mini` based on tenant data.

```
┌──────────────────────────────┐
│ 💡 AI Insights               │
├──────────────────────────────┤
│ ⚠️ 5 products are out of      │
│    stock for 7+ days          │
│    [Restock or hide →]        │
├──────────────────────────────┤
│ 📈 Weekend revenue is 40%     │
│    lower than weekday         │
│    [Create weekend promo →]   │
├──────────────────────────────┤
│ 🎁 12 VIP customers haven't   │
│    ordered in 30 days         │
│    [Send win-back mailing →]  │
└──────────────────────────────┘
```

**Insight types:**
- **Inventory alerts** — low stock, out of stock too long
- **Revenue patterns** — weekend dip, monthly comparison
- **Customer attention** — lapsed VIPs, abandoned carts
- **Product opportunities** — products with no description, no photos
- **Marketing nudges** — birthdays this week, mailing performance
- **Operational** — orders pending too long, returns to review

**Generation:**
- ARQ worker runs every 6 hours (or on-demand if forced)
- Queries tenant data + sends summary to OpenAI
- Filters to most actionable (max 3)
- Stored in `dashboard_insights` table

#### 7.3.6 Recent Orders Section

Last 3 orders with quick advance actions.

```
┌──────────────────────────────┐
│ Recent Orders                │
│                  View all ›  │
├──────────────────────────────┤
│ #ORD-63ID8B  Малика А.       │
│ ● Created · 850 000 UZS      │
│ 14:32         [Confirm →]    │
├──────────────────────────────┤
│ #ORD-22XY4Z  Aziz K.         │
│ ●● Shipping · 350 000        │
│ Today 12:15   [Mark delivered]│
├──────────────────────────────┤
│ #ORD-91PQ7R  Nodira Z.       │
│ ●●● Delivered · 1 200 000    │
│ Yesterday     [Complete]     │
└──────────────────────────────┘
```

- Tap order card → order detail
- Tap action button → advance status (with confirmation)
- "View all" → orders tab

#### 7.3.7 Quick Actions Row

Horizontally scrollable action chips:

```
[+ Add product] [📨 Mailing] [👀 View store] [🔗 Invite team]
```

Tap → opens corresponding flow.

**Dynamic ordering:** Based on what merchant hasn't done yet:
- If no products → "Add product" first
- If no mailings → "Mailing" first
- If no team → "Invite team" first
- If everything done → standard order

#### 7.3.8 Menu Groups (Sellz-style Settings Access)

After dynamic content above, show settings menu in **5 visual groups** with iOS-style list items. Each group is a card with rounded corners and white background.

**Group 1: Catalog & Operations**
```
┌──────────────────────────────┐
│ 📋 Categories           ›    │
├──────────────────────────────┤
│ 🚚 Delivery Methods     ›    │
├──────────────────────────────┤
│ 📦 Products      (!)    ›    │ ← red dot if attention needed
├──────────────────────────────┤
│ 🛍 Orders        (3)    ›    │ ← count badge for pending
├──────────────────────────────┤
│ 🎟 Coupons              ›    │
├──────────────────────────────┤
│ 📊 Analytics            ›    │
└──────────────────────────────┘
```

**Group 2: Marketing & Growth (Business+)**
```
┌──────────────────────────────┐
│ 📨 Mailings             ›    │
├──────────────────────────────┤
│ 🎬 Stories              ›    │
├──────────────────────────────┤
│ 🎁 Loyalty Program      ›    │
├──────────────────────────────┤
│ 👥 Referrals            ›    │
├──────────────────────────────┤
│ 📢 Channel Crossposting ›    │
└──────────────────────────────┘
```

**Group 3: Configuration**
```
┌──────────────────────────────┐
│ 💳 Payment Systems      ›    │
├──────────────────────────────┤
│ 📋 Order Settings       ›    │
├──────────────────────────────┤
│ 🎨 Storefront Theme     ›    │
├──────────────────────────────┤
│ 🤖 Bot Identity   (!)   ›    │ ← red if inline mode disabled
├──────────────────────────────┤
│ 📢 Channel Integration  ›    │
└──────────────────────────────┘
```

**Group 4: People & Account**
```
┌──────────────────────────────┐
│ 👥 Team             (2) ›    │ ← active count
├──────────────────────────────┤
│ 💎 Subscription         ›    │
├──────────────────────────────┤
│ 🏆 Achievements    (3 new) › │ ← new badge
├──────────────────────────────┤
│ 🌍 Language: Русский    ›    │
└──────────────────────────────┘
```

**Group 5: Help & News**
```
┌──────────────────────────────┐
│ 💬 Support              ↗    │ ← external link to t.me/dokonly_support_bot
├──────────────────────────────┤
│ 📰 News & Updates       ↗    │ ← external link to t.me/dokonly_news
├──────────────────────────────┤
│ ❓ FAQ                  ›    │
└──────────────────────────────┘
```

- "Support" — opens support bot via `Telegram.WebApp.openTelegramLink(SUPPORT_BOT_URL)` (see §7.13)
- "News & Updates" — opens Telegram channel via `Telegram.WebApp.openTelegramLink()` (see §7.12)
- "FAQ" — opens FAQ page (in-app, knowledge base articles)

**Footer:**
```
─────────────────────────
Powered by Dokonly · v1.0
─────────────────────────
```

**Hide for Бизнес+ if `show_dokonly_branding=FALSE`:**
- Hide "Powered by Dokonly" text
- Keep version (smaller, gray)

#### 7.3.9 Attention Badges (Red Dot Pattern)

Many menu items can show red attention badges based on backend signals:

| Menu item | Badge condition |
|---|---|
| Products | Out-of-stock items with pending orders, products missing photos |
| Orders | Unverified payment screenshots awaiting review |
| Bot Identity | Inline mode not enabled (blocks Share feature) |
| Channel Integration | Bot not admin in channel after marked as enabled |
| Subscription | Trial ending in ≤3 days, payment failed |
| Achievements | New achievement unlocked but not seen |

**Badge types:**
- 🔴 Red dot — needs immediate attention
- (N) — count of items needing action
- (new) — informational, not urgent

Backend endpoint: `GET /v1/merchant/dashboard/badges` returns all current badges in one call.

#### 7.3.10 Empty States

**Brand new merchant (no products, no orders):**
- Hero shows default cover
- KPI strip shows zeros
- Subscription card shows trial state with extend option
- AI Insights replaced by **Onboarding Checklist**:
  ```
  Get started in 5 steps:
  ☐ Add store cover & logo
  ☐ Add first product
  ☐ Configure payment method  
  ☐ Test your store
  ☐ Share with your community
  
  Progress: 0/5
  ```
- Recent Orders shows "Your first order will appear here"
- Quick Actions emphasizes "Add product" + "View store"

**Active merchant pattern:**
- Same layout but populated with real data

### 7.4 Catalog (`/catalog`)

**Top bar:**
- Search input (sticky)
- Filter chips: All / Active / Out of stock / Featured / Categories

**Layout:** Grid 2 columns of product cards

**Product card:**
- Image (square, 1:1 ratio)
- Name (max 2 lines)
- Price (mono font)
- Stock indicator (small badge if low/out)
- Featured ⭐ icon if featured

**Floating Action Button (bottom right):**
- Big circular button with + icon
- Tap → bottom sheet with options:
  - 📷 Add manually
  - 🪄 Import from photos (AI)
  - 🎤 Import by voice (AI)
  - 📋 Import from Telegram channel
  - 📊 Import from Excel/CSV

**Plan limit indicator** (bottom):
- "247 / 250 products on Старт plan"
- Progress bar
- "Upgrade" link if near limit

#### Subscreen: Add/Edit Product (`/catalog/product/[new|<id>]`)

**Form sections:**

1. **Media section:**
   - Photo upload zone, up to 10 photos
   - Video upload (1 video, max 30s)
   - "🪄 Generate with AI" button (Business+)

2. **Basic info:**
   - Category dropdown (with "+ New category" inline)
   - Product name (with language toggle UZ/RU)
   - Description (with "Generate with AI" button)
   - SKU (optional)

3. **Pricing:**
   - Price (with currency suffix)
   - Compare-at price
   - Cost per item (margin analytics, hidden from buyers)

4. **Inventory:**
   - Stock quantity (with "Unlimited" toggle)
   - Track inventory toggle
   - Low stock threshold

5. **Variants section** (collapsed):
   - "Add variants" button
   - Option name (e.g., "Size"), values input
   - Auto-generates variant combinations table

6. **Attributes section** (sphere-specific):
   - For Fashion: Size, Color, Material, Brand
   - For Electronics: Brand, Model, Specifications

7. **Status & Visibility:**
   - Active toggle
   - Featured toggle
   - Tags (multi-input)

**Bottom:** Telegram MainButton "Save product"

#### Subscreen: AI Photo Import (`/catalog/import/photos`)

1. **Upload step:** Select 10–50 photos
2. **Processing step:** Progress 5 of 12 processed, cost estimate
3. **Review step:** Editable cards per detected product, bulk actions
4. **MainButton:** "Create 12 products"
5. **Success step:** "12 products added!"

#### Other Import Subscreens
- AI Voice Import (`/catalog/import/voice`) — record button, transcription, review
- Telegram Channel Import — connect, select posts, AI extract, review
- CSV/Excel Import — upload, column mapping, validation, import

#### Bulk Edit Mode (Business+)
- Activated via "Select" in catalog
- Checkboxes on each product
- Bottom toolbar: Change category, Update price, Set featured, Activate/deactivate, Delete

#### Categories Management (`/catalog/categories`)
- List with drag-handles
- Product count per category
- Edit/delete actions
- "+ Add category" button

### 7.5 Orders (`/orders`)

**Top:** Sticky tab bar
- 🆕 Новые (3) — 'created' status
- 🔄 В работе (5) — 'confirmed' status
- 🚚 Доставка (2) — 'shipping'
- ✅ Завершено — 'delivered' + 'completed'

**Order card:**
- Order ID short (#ORD-63ID...)
- Customer name + items summary
- Total (mono font, prominent)
- Time ago
- Right side: chevron + swipe hint
- **Swipe right** → advance to next status
- **Swipe left** → quick actions
- **Tap** → full order detail

#### Subscreen: Order Detail (`/orders/<id>`)

**Top:** BackButton + Order number

**Customer section:**
- Avatar + name + Telegram username
- Quick action buttons: 📞 Call, 💬 Message, 👤 View profile

**Items section:** Items list with photo, name, variant, quantity, price + totals

**Delivery section:** Method, Address, Notes, ETA

**Payment section:**
- Method icon + name
- Status (pending/paid)
- If manual transfer: photo of receipt (tappable)

**Status funnel timeline:**
- 5 dots connected by line
- Current step highlighted with accent
- Each step shows: status name, timestamp

**Actions section (context-dependent):**
- If 'created' → "Подтвердить заказ"
- If 'confirmed' → "Отметить отправленным"
- If 'shipping' → "Отметить доставленным"
- Always: "Отменить заказ" (with reason)
- For Premium+: "Создать чек-лист сборки"

#### Picking Checklist (Premium+)
- Items list with checkboxes
- Notes field
- "Complete picking" button when all checked

### 7.6 Customers / CRM (`/customers`) — Business+

**Top:** Search + Filters (Segment, Country, Language)
**Sort:** Recent / Total spent / Order count

**Customer card:** Avatar, name, stats, segment badges

#### Subscreen: Customer Detail
**Tabs:** Overview / Orders / Notes & Tags

**Overview Tab:**
- Stats: Total orders, AOV, Total spent, Last order date
- Languages, Locations
- Segment (auto)
- Loyalty status (points, tier)
- Lifetime journey chart

**Orders Tab:** All orders by this customer

**Notes & Tags Tab:** Manual notes, custom tags

### 7.7 Marketing (`/marketing`)

**Section cards:**
1. 📨 Mass Mailings (Business+)
2. 🎟 Coupons & Discounts
3. 🛍 Abandoned Carts (Business+)
4. 🎁 Loyalty Program (Business+)
5. 👥 Referrals
6. 📢 Channel Crossposting (Business+)
7. 🎬 Stories & Banners (Business+)

#### Mass Mailings (`/marketing/mailings`)
- List of mailings (draft, sent, scheduled)
- "+ New mailing" button

**New Mailing flow:**
- Step 1: Recipients (segment selector with filters)
- Step 2: Content (text, image, CTA, AI generate)
- Step 3: Schedule (now or later)
- Send to N customers (MainButton)

#### Coupons (`/marketing/coupons`)
- List of coupons (active, expired)
- Create form: code, type, value, min amount, max uses, applicable products, dates

#### Abandoned Carts (`/marketing/abandoned-carts`) — Business+
- List of carts inactive >30 min
- Manual or auto recovery messages

#### Loyalty Program (`/marketing/loyalty`) — Business+
**Setup wizard:**
- Earn rate
- Cashback rate
- Redemption rate
- Tier thresholds + benefits

**Active state:** stats, top loyalty customers, manual adjustments

#### Referrals (`/marketing/referrals`)
- Setup: rewards for referrer and referee, expiration
- Stats: referrals sent, completed, pending
- Top referrers list

#### Channel Crossposting (`/marketing/channel-posts`) — Business+
- Connect channel, verify admin
- Auto-post toggle
- Template editor
- Manual "Post now"
- Posts history

#### Stories & Banners (`/marketing/stories`) — Business+
- Instagram-style stories
- Create: media, caption, CTA link, expiration
- Drag to reorder

### 7.8 Analytics (`/analytics`)

**Top:** Time range selector

**Hero stats:** Revenue, Orders, AOV, Conversion rate

**Sections (cards):**
1. **Sales over time** — line chart
2. **Sales Funnel** (Business+) — visual funnel with drop-off
3. **Top Products** — by revenue, orders, views
4. **Customers** — new vs returning, by country, by language
5. **Traffic Sources** (Business+) — pie + conversion by source
6. **Cohort Retention** (Premium) — heatmap
7. **Returns & Refunds** (Premium) — rate, reasons, refunded amount

**Export button:** Download as Excel (Business+)

### 7.9 Team Management (`/team`) — Business+

**Members list:** avatar, name, role badge, last active
**Remove** action with confirmation
**"+ Invite member" button:** Telegram username/phone, role, custom permissions

**Notification preferences per member:**
- New orders (all/mine only/none)
- Payment failures
- Low stock alerts
- Daily summary

### 7.10 Settings (`/settings`)

**List of settings cards:**

1. 🏪 **Store profile** — name, description, contact info (phone, email, Telegram, Instagram, address, working hours)
2. 🎨 **Storefront theme** — typography, colors, layout, blocks (see §9.0)
3. 🤖 **Bot identity** — welcome message, bot menu, commands (separate from storefront)
4. 📋 **Categories** — product categories
5. 🚚 **Delivery methods**
6. 💳 **Payment methods** — configure providers
7. 📦 **Order settings** — required fields, min amount, confirmation message, forwarding
8. 📢 **Channel integration** — subscription gate, WebApp URL
9. 🌍 **Localization** — supported languages, default language
10. 🎁 **Loyalty & Referrals** — program configs
11. 🎬 **Stories & Banners** — manage storefront stories
12. 🔔 **Notifications** — what events trigger notifications to merchant
13. 👥 **Team** (Business+)
14. 📊 **Analytics export** (Business+) — automated weekly emails
17. 💎 **Subscription** — current plan, upgrade, invoices
18. 🌚 **Appearance** — admin app theme (light/dark/system)
19. ❓ **Help & Support**

#### Subscreen: Storefront Theme (`/settings/storefront-theme`)

**Tabs (or sections):**

**1. Branding (all tiers)**
- Logo upload (square, 512×512 recommended)
- Cover image upload (16:9, 1600×900 recommended)
- Live preview pane (375px frame on right)

**2. Typography (all tiers)**
- 5 typography bundle cards with live previews
- ● Modern · ○ Editorial · ○ Bold · ○ Warm · ○ Minimal
- Each shows: store name in display font + sample product card in body + price in mono

**3. Color (all tiers)**
- Grid of 12 accent color swatches
- Hover/tap to preview, click to select
- Indicator on currently selected
- Light/Dark variants shown side-by-side

**4. Layout (Business+ only)**
- 5 layout cards with thumbnails:
  - Boutique (default for Старт, locked)
  - Catalog
  - Lookbook
  - Marketplace
  - Bento
- For Старт tier: cards visible but locked with "Upgrade to Business" overlay
- Click any → opens full preview (mobile + desktop)

**5. Blocks (Business+ only)**
- For each block: enable toggle + style sub-selector
  - Stories: [on/off] + style (instagram / tiktok / hidden)
  - Featured banner: [on/off] + rotate (auto-rotate every 5s)
  - Trust strip: [on/off] + items checkboxes
  - Categories: [on/off] + style (bento / burger / scrolling / tabs / grid)
  - Products grid: card style (vertical / horizontal / image_only / compact) + columns (1 or 2)
  - About block: [on/off] + position
  - Reviews section: [on/off] + min rating filter
  - Recently viewed: [on/off]
- For Старт: section visible with "Upgrade" overlay

**6. Quick-start presets (Business+ only)**
- Section at top: "Apply a ready-made theme"
- 10 preset cards in horizontal scroll
- Click → applies preset, all sections update
- Confirmation modal: "This will replace your current settings"

**Save bar (sticky bottom):**
- Cancel / Save changes
- "Preview live" button → opens storefront with draft theme

#### Subscreen: Bot Identity (`/settings/bot`)

Separate from storefront theme. This is the **entry point** to the store.

**Sections:**

**1. Welcome message**
- Text editor (with placeholder variables: {name}, {store_name})
- For Бизнес+: add image (optional)
- Language picker — different welcome per language
- Live preview as Telegram chat bubble
- Default template per language:
  - RU: "Добро пожаловать в {store_name}! Нажмите кнопку чтобы открыть магазин."
  - UZ: "{store_name} ga xush kelibsiz! Magazin ochish uchun tugmani bosing."
  - EN: "Welcome to {store_name}! Tap the button to open the store."

**2. Bot menu button** (Business+ only)
- Default label: "🛍 Open Store"
- Customizable: text + emoji
- For Старт: locked to default

**3. Bot commands** (Business+ only)
- Default commands cannot be removed: /start, /help, /orders, /lang
- Add custom commands: command + description (sets in Telegram via setMyCommands)
- For Старт: defaults only

**4. Bot description** (all tiers)
- Short bio shown in bot profile (max 120 chars)
- Description (max 512 chars) — shown in chat list before /start

**5. Bot avatar** (all tiers)
- Note: Bot avatar set via @BotFather only
- Link to @BotFather instructions
- Show current avatar fetched from Telegram

**Save:** Updates apply via Telegram Bot API (`setMyCommands`, `setChatMenuButton`, `setMyDescription`).

#### Subscreen: Subscription (`/settings/subscription`)
- Current plan card with details
- Plan limits progress bars
- Actions: Upgrade, Change billing cycle, Update payment, Cancel
- Invoices list with PDF download
- Trial-specific: days remaining banner + Upgrade CTA

#### Subscreen: Channel Integration (`/settings/channel`)
- Channel username input
- "Verify bot is admin" button
- Status indicator
- Toggle: "Require subscription to access store"
- Custom WebApp URL display
- "Copy WebApp link" button

### 7.11 Achievements & Streaks (`/achievements`)

Gamification system for merchant engagement. Based on proven patterns from Duolingo (streaks), GitHub (achievements), and indie hacker communities (milestone celebration).

**Philosophy:** Achievements celebrate progress, streaks build habit. Both should feel rewarding, never guilt-inducing.

#### 7.11.1 Achievements Page (`/achievements`)

```
┌────────────────────────────┐
│ ← Achievements             │
│                            │
│  🏆 7 of 24 unlocked       │
│  ▓▓▓░░░░░░░ 29%            │
├────────────────────────────┤
│  Tabs:                     │
│  [All] [Milestones] [...]  │
├────────────────────────────┤
│  Recently unlocked         │
│  ┌────────────────────────┐│
│  │ 🎯 First Sale          ││
│  │ Unlocked 2 days ago    ││
│  │ "You made your first   ││
│  │  sale! 850 000 UZS"    ││
│  │ [Share achievement ↗]  ││
│  └────────────────────────┘│
├────────────────────────────┤
│  Milestones (Volume)       │
│  ┌──────────────┐ ┌────────┐│
│  │ ✓ 10 orders  │ │🔒50    ││
│  │              │ │orders  ││
│  └──────────────┘ └────────┘│
│  ┌──────────────┐ ┌────────┐│
│  │🔒 100 orders │ │🔒500   ││
│  │              │ │orders  ││
│  └──────────────┘ └────────┘│
├────────────────────────────┤
│  Feature Adoption          │
│  ┌──────────────┐ ┌────────┐│
│  │ ✓ AI Pioneer │ │ ✓ Team ││
│  │              │ │ Player ││
│  └──────────────┘ └────────┘│
│  ...                       │
├────────────────────────────┤
│  Engagement                │
│  Special (hidden until     │
│  unlocked)                 │
└────────────────────────────┘
```

**Card states:**
- **Locked** (🔒): Grayed out card with progress bar if applicable ("Add 4 more products to unlock")
- **Unlocked** (✓): Colorful card with icon + tier badge + unlock date
- **New** (🆕): Recently unlocked, not yet seen, pulsing animation

**Tap unlocked achievement:**
- Opens detail modal:
  - Large icon + name + description
  - Unlock date + context ("Made 850 000 UZS in this sale!")
  - "Share" button (creates social-friendly image + shares via Telegram)

#### 7.11.2 Achievement Categories & Definitions

**Onboarding milestones (auto-unlocked):**
| ID | Name | Trigger |
|---|---|---|
| `first_sale` | 🎯 First Sale | First order placed |
| `first_customer` | 👋 First Customer | First customer registered |
| `catalog_builder_10` | 📷 Catalog Builder | 10 products added |
| `catalog_builder_50` | 📚 Inventory Manager | 50 products added |
| `style_set` | 🎨 Style Set | Storefront theme configured |
| `payments_ready` | 💳 Payments Ready | First payment method configured |
| `delivery_ready` | 🚚 Ready to Ship | First delivery method configured |

**Volume milestones:**
| ID | Name | Trigger |
|---|---|---|
| `orders_50` | 🚀 Growing | 50 orders completed |
| `orders_100` | 💯 Centurion | 100 orders completed |
| `orders_500` | 🏆 Power Seller | 500 orders completed |
| `orders_1000` | 👑 Top Seller | 1000 orders completed |
| `revenue_1m` | 💰 1M Club | 1 000 000 UZS lifetime revenue |
| `revenue_10m` | 💎 10M Club | 10 000 000 UZS lifetime revenue |
| `revenue_100m` | 🌟 Elite Seller | 100 000 000 UZS lifetime revenue |

**Feature adoption:**
| ID | Name | Trigger |
|---|---|---|
| `ai_pioneer` | 🤖 AI Pioneer | First AI import used |
| `marketer` | 📨 Marketer | First mass mailing sent |
| `story_teller` | 🎬 Story Teller | First story posted |
| `team_player` | 👥 Team Player | First team member invited |
| `loyalty_pro` | 🎁 Loyalty Pro | Loyalty program activated |
| `referral_master` | 🔗 Referral Master | First referral order received |
| `cross_channel` | 📢 Cross-Channel | Channel crossposting enabled |

**Engagement:**
| ID | Name | Trigger |
|---|---|---|
| `hot_streak_7` | 🔥 Hot Streak | 7 days in a row with orders |
| `hot_streak_30` | 🌋 On Fire | 30 days streak |
| `quality_5star` | 🌟 Quality | 5-star rating from 10 customers |
| `fast_responder` | ⚡ Fast Responder | Replied to 10 customer messages within 1h |
| `data_driven` | 📊 Data-Driven | Checked analytics 30 times |

**Special (hidden until unlocked):**
| ID | Name | Trigger |
|---|---|---|
| `og` | 🎉 OG | Joined Dokonly in launch month |
| `internationalist` | 🌍 Internationalist | Sold to customers in 3+ countries |
| `survivor` | 💪 Survivor | Active 1 year on platform |
| `comeback` | 🎯 Comeback King | Reactivated after dormant 30+ days |

#### 7.11.3 Unlock Celebration Modal

When achievement unlocks (real-time via WebSocket):

```
┌────────────────────────────┐
│         🎉🎊🎉              │
│                            │
│      [Big icon 80px]       │
│                            │
│    Achievement Unlocked!   │
│                            │
│    💯 Centurion            │
│                            │
│    You completed your      │
│    100th order!            │
│                            │
│    "Your store is growing  │
│     well — this is a       │
│     real milestone."       │
│                            │
│  [Share to friends ↗]      │
│  [Continue]                │
└────────────────────────────┘
```

- Full-screen modal overlay
- Confetti animation (uses `react-confetti` or similar)
- Haptic feedback on mobile
- "Share to friends" → uses Telegram share to post achievement to merchant's network
- Auto-marks `seen_by_owner=TRUE` on close

#### 7.11.4 Streak Detail Page (`/streaks`)

```
┌────────────────────────────┐
│ ← Streaks                  │
├────────────────────────────┤
│  🔥 Daily Orders            │
│  12 days                   │
│  Best: 18 days             │
├────────────────────────────┤
│  Calendar (last 30 days)   │
│  ┌────────────────────────┐│
│  │ 30-day grid             ││
│  │ ● Days with orders     ││
│  │ ○ Days without         ││
│  │ ❄ Frozen days          ││
│  │ Today is at risk?      ││
│  └────────────────────────┘│
├────────────────────────────┤
│  Streak rewards            │
│  ✓ 7 days · Hot Streak ach │
│  ✓ 10 days · 10% off month │
│  🔒 30 days · 50% off month│
│     + "On Fire" badge      │
│  🔒 100 days · Featured in │
│     Dokonly newsletter     │
├────────────────────────────┤
│  Freeze for vacation       │
│  Freezes left: 1           │
│  [Use freeze (saves today)] │
│  Or freeze upcoming dates  │
│  [Schedule freeze]         │
├────────────────────────────┤
│  Other streaks:            │
│  ┌────────────────────────┐│
│  │ 🟢 Daily Active        ││
│  │ 5 days                 ││
│  └────────────────────────┘│
└────────────────────────────┘
```

**Streak types:**

| Type | Counts when | Visible by default |
|---|---|---|
| `daily_orders` | ≥1 order placed that day | ✓ |
| `daily_active` | Owner opens admin that day | (hidden, displayed in stats) |

**Freeze mechanic:**
- 1 free freeze per calendar month
- Tap "Use freeze" → today doesn't count against streak even if no orders
- Schedule freezes for upcoming vacation days (max 7 days ahead)
- Frozen days show ❄ in calendar grid
- Resets freeze counter on 1st of each month

**Streak rewards (subscription-based):**
- 7 days → unlock "Hot Streak" achievement badge
- 10 days → **10% off next month subscription** (auto-applied)
- 30 days → "On Fire" achievement + **50% off next month subscription**
- 100 days → Featured spot in Dokonly weekly newsletter + "Centurion" achievement

Discount auto-applied to next monthly billing via `subscription_discounts` table (campaign_id='streak_reward'). For trial users, discount is held and applied when they first subscribe.

**Streak protection:**
- Notification at 23:00 if streak at risk (no order today, streak ≥ 5)
- "Your X-day streak is at risk! [Use freeze] or [Send promo]"

#### 7.11.5 Notification Triggers

**Telegram notifications (via bot):**
- Achievement unlocked → "🎉 You unlocked '<name>'! Tap to see it."
- Streak milestone hit → "🔥 30-day streak! 50% off next month unlocked."
- Streak at risk → "🚨 Your 12-day streak ends in 2 hours. [Use freeze]"


**In-app notifications:**
- Same events but shown in admin notification bell
- New achievement → red dot on "🏆 Achievements" menu item

### 7.12 News & Updates (External Telegram Channel)

**Not an in-app feature.** News are published to a public Telegram channel that merchants can subscribe to for native Telegram notifications.

#### Why this approach (vs in-app news system)

- ✅ **Zero infrastructure** — no DB tables, no CRUD UI, no API endpoints
- ✅ **Native Telegram notifications** — subscribers get push when we post
- ✅ **Full Telegram capabilities** — stories, polls, voice notes, comments, reactions
- ✅ **Content team uses familiar tools** — just write in Telegram, no admin panel
- ✅ **Built-in analytics** — Telegram channel views, subscribers, engagement
- ✅ **Subscribe/unsubscribe handled by Telegram** — no opt-in flow needed
- ✅ **Universally accessible** — works on all platforms where Telegram works

#### Configuration

Stored in environment / config (not per-tenant):

```python
# apps/api/dokonly_api/config.py
NEWS_TELEGRAM_CHANNEL = "dokonly_news"  # placeholder — final name TBD
NEWS_TELEGRAM_CHANNEL_URL = f"https://t.me/{NEWS_TELEGRAM_CHANNEL}"
```

#### UI Integration Points

**1. Dashboard Menu Group 5 (Help & News)**

In Section 7.3.8 menu group:
```
┌──────────────────────────────┐
│ 💬 Support              ›    │
├──────────────────────────────┤
│ 📰 News & Updates       ↗    │ ← arrow up = external link
├──────────────────────────────┤
│ ❓ FAQ                  ›    │
└──────────────────────────────┘
```

Tap "📰 News & Updates" → `Telegram.WebApp.openTelegramLink(NEWS_TELEGRAM_CHANNEL_URL)` — opens channel in Telegram.

**2. Profile Page → Settings group**

In §7.13 More Menu:
- "📰 Get updates from Dokonly" link → opens channel

**3. One-time onboarding prompt** (Day 1 after signup)

After successful onboarding completion, show subtle non-blocking card:
```
┌────────────────────────────┐
│  📰 Stay updated            │
│                            │
│  Subscribe to our Telegram │
│  channel for new features, │
│  tips, and success stories │
│                            │
│  [Subscribe to channel ↗]  │
│  [Maybe later]             │
└────────────────────────────┘
```

State tracked in `users.subscribed_to_news_channel_prompt_at` — show once, never again.

**4. Bot welcome message**

In default welcome message (configurable per merchant for their own bot but our master bot uses this):
> "Welcome to Dokonly! Get product updates and tips on our channel: t.me/dokonly_news"

#### Major Announcements (Hybrid Push)

For **major releases** (e.g., v1.5 with direct Click integration), in addition to posting in the channel, the platform can send a one-time Telegram message via the master DokonlyBot to all active merchants:

> 🎉 New: Direct Click integration is now available!
> No more manual screenshots — payments confirmed instantly.
> [Learn more →] (opens channel post)

Done sparingly (maybe 4-6 times per year for major features). Tracked via simple env-based feature flag — no DB schema needed.

#### What This Replaces

**Removed from earlier spec versions:**
- ❌ `platform_news` table — gone
- ❌ `platform_news_reads` table — gone
- ❌ Section 7.12 News feed page with categories — gone
- ❌ News detail page with markdown body — gone
- ❌ News API endpoints — gone
- ❌ Platform Owner admin UI for managing news — gone
- ❌ Unread counter on menu item — gone (Telegram unread badge handles this)
- ❌ Targeting by plan/country/sphere — not needed at this scale

**Saved development time: ~3-4 days.** Trade-off: lose fine-grained targeting (which we don't need yet anyway).

### 7.13 Support (External Telegram Bot)

**Not an in-app feature.** Support is handled via a separate Telegram bot — same Sellz-style pattern as News (§7.12).

#### Why this approach (vs in-app ticket system)

- ✅ **Zero infrastructure** — no `support_tickets` table, no admin UI, no SLA tracking
- ✅ **Native Telegram chat** — merchant sees full conversation history in their chats
- ✅ **Familiar interface** — both sides use Telegram (no separate ticket portal)
- ✅ **Voice messages, photos, videos** — all natively supported
- ✅ **Push notifications** — Telegram handles delivery + read receipts
- ✅ **Support team works in Telegram** — using `tdesk` or admin group forwarding pattern

#### Configuration

```python
# apps/api/dokonly_api/config.py
SUPPORT_BOT_USERNAME = "dokonly_support_bot"  # placeholder — final name TBD
SUPPORT_BOT_URL = f"https://t.me/{SUPPORT_BOT_USERNAME}"
```

#### How It Works

**Merchant side:**
1. Tap "💬 Support" in admin menu
2. `Telegram.WebApp.openTelegramLink(SUPPORT_BOT_URL)` opens chat with @dokonly_support_bot
3. Merchant types question → message sent to support bot
4. Bot auto-replies with welcome + estimated response time
5. Real human responds via the bot (typically within SLA)
6. Conversation continues in Telegram thread

**Platform team side** (architecture options):

**Option A: Admin group forwarding** (simplest, recommended for early stage)
- @dokonly_support_bot forwards every incoming user message to an internal Telegram group
- Support team members are in the group
- They reply by mentioning the bot, which routes message back to user
- No custom infra — Telegram does the work
- Tools: `aiogram` handler or third-party services like `Manybot`

**Option B: Telegram desktop apps** (mid-volume)
- Support team uses Telegram Desktop with the bot's session
- See chats as a regular Telegram client
- Reply directly via @dokonly_support_bot interface

**Option C: Custom admin UI** (high volume, v1.2+)
- Build a simple inbox in Platform Owner panel
- Pull conversations from bot, reply via API
- Add SLA tracking, satisfaction ratings later

**Initial recommendation:** Option A for v1 — start with admin group forwarding.

#### Welcome Message (auto-response)

When merchant first writes to @dokonly_support_bot:

```
👋 Привет! Это поддержка Dokonly.

Опишите ваш вопрос и наша команда ответит в течение:
• Бизнес/Премиум: 1 час (9:00–21:00 UZ)
• Старт: 4 часа (9:00–21:00 UZ)

Прикладывайте скриншоты или видео — это поможет быстрее разобраться.

Часто задаваемые вопросы: t.me/dokonly_news/faq
```

#### SLA by Plan

| Plan | Business hours response SLA |
|---|---|
| Trial / Старт | 4 hours (9:00–21:00 UZ time) |
| Бизнес | 2 hours |
| Премиум | 1 hour |

These are **best-effort targets**, not contracted SLAs (avoid legal commitments at this stage).

For **Premium** merchants, support gets priority routing (1-hour target vs 4-hour for Старт).

#### UI Integration Points

**1. Dashboard Menu Group 5**
```
💬 Support              ↗   ← external link to support bot
```

**2. Empty states + error screens** ("Need help?" → support bot link)

**3. Bot inline mode setup failure** → "Contact support if you need help enabling inline mode"

**4. Subscription page** → "Billing questions? Contact support"

#### What This Replaces

**Removed from earlier spec:**
- ❌ `support_tickets` table — gone
- ❌ `support_ticket_messages` table — gone
- ❌ In-app ticket submission form — gone
- ❌ Ticket list page (`/support/tickets`) — gone
- ❌ Ticket detail page with thread — gone
- ❌ Platform Owner ticket management UI — gone
- ❌ SLA tracking automation — gone (manual targets only)
- ❌ Satisfaction rating flow — gone

**Saved development time: ~5-7 days.** Trade-off: less analytics on support quality. Acceptable for v1.

#### Future Migration Path

If support volume grows beyond ~50 conversations/day and Option A becomes unmanageable, build proper admin UI (Option C). Schema is documented above (commented out) — can be restored when needed.

For v1: keep it simple, scale infrastructure when problem actually exists.

### 7.14 More Menu / Profile (`/more`)
- User avatar + name + Telegram username
- Account: Switch store, Personal settings, Logout
- Help: **💬 Contact support** (bot link), **📰 News from Dokonly** (channel link), ❓ FAQ, What's new
- Legal: Terms, Privacy

---

## 8. Merchant Application — Web Dashboard

URL: `admin.dokonly.com`
Audience: Merchants on desktop/laptop (power users)
Stack: React + TypeScript + Tailwind + shadcn/ui

**Same data and features as the mobile Mini App, but with web-optimized layouts.** Built for merchants who run their store at scale and prefer keyboard + larger screens.

### 8.1 Layout

```
┌─────────────┬─────────────────────────────────────┐
│             │  Top bar                            │
│   Sidebar   │  - Store switcher                   │
│             │  - Global search (Cmd+K)            │
│ ▣ Home      │  - Notifications bell               │
│ 📦 Catalog  │  - Theme toggle                     │
│ 🛍 Orders   │  - User menu                        │
│ 👥 CRM      ├─────────────────────────────────────┤
│ 📨 Marketing│                                     │
│ 📊 Analytics│  Page content                       │
│ 👥 Team     │  (breadcrumbs at top)               │
│ 💎 Billing  │                                     │
│ ⚙️ Settings │                                     │
│             │                                     │
├─────────────┤                                     │
│  AI Helper  │ ← collapsible AI panel              │
├─────────────┤                                     │
│  Profile    │                                     │
└─────────────┴─────────────────────────────────────┘
```

### 8.2 Web-Specific Features

#### Orders — Kanban View

Instead of mobile's tabs + swipe, web shows full Kanban with all 5 columns:

```
┌─Created (3)──┬─Confirmed (5)─┬─Shipping (2)─┬─Delivered (12)─┬─Completed (45)─┐
│  [Order]     │  [Order]       │  [Order]     │  [Order]       │  [Order]       │
│  [Order]     │  [Order]       │  [Order]     │  [Order]       │  [Order]       │
│  [Order]     │  [Order]       │              │  [Order]       │  [Order]       │
└──────────────┴────────────────┴──────────────┴────────────────┴────────────────┘
```

- **Drag-and-drop:** drag orders between columns to advance status
- **Real-time updates:** WebSocket pushes when team member moves orders
- **Side panel:** click order → slides in from right with details, no leaving Kanban
- **Bulk selection:** shift+click to select multiple, bulk actions toolbar appears
- **Filtering bar at top:** date range, payment method, value range, customer

#### Catalog — Table View (with optional Grid toggle)

- **Table columns:** checkbox, image, name, category, price, stock, active toggle, featured, created, actions
- **Sortable columns**
- **Inline editing:** double-click cell → edit in place
- **Bulk operations:** select multiple → change category, update prices, set featured, activate/deactivate
- **Advanced filters sidebar:** price range, stock range, attributes, has video, has variants, created date
- **Export selected to Excel**
- **Grid view toggle:** show as cards instead of table (default for visual catalogs)

#### Analytics — Larger Charts, More Density

- **Multi-pane layout:** KPI cards top row, then 3-column grid of charts
- **Click any metric to drill down:** click "Top product" → product detail with full analytics
- **Comparison mode:** select two time periods to compare side-by-side
- **Annotations:** mark sales events, promotions on timeline
- **PDF export:** export full report as branded PDF

#### Settings — Two-Pane

- Left: settings categories navigation (vertical tabs)
- Right: settings content
- Save bar floats at bottom when changes detected
- Unsaved changes warning on navigation

### 8.3 Authentication

#### Login Flow (`/login`)

Three options:

**1. Telegram Login Widget (primary):**
- "Sign in with Telegram" button
- Opens Telegram in popup/redirect
- User confirms in Telegram
- Returns with auth data
- Backend validates HMAC, identifies user
- If user has tenants → JWT issued, redirect to dashboard

**2. Email + Password (fallback):**
- For users without Telegram on desktop
- Only available if user set password earlier
- Standard form with "Forgot password" flow

**3. QR Code Login:**
- QR code displayed
- User scans with their bot in Telegram (sends `/login_web`)
- Magic link auto-logs in browser
- For quick access without typing

### 8.4 Multi-Tab Coordination

Real-time sync across multiple browser tabs:
- WebSocket connection per session
- BroadcastChannel API for same-browser tab sync
- Optimistic updates with reconciliation
- "Another team member updated this" indicators when conflicts

### 8.5 Keyboard Shortcuts

Power-user features:

| Shortcut | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | Global search (orders, products, customers) |
| `G` then `O` | Go to Orders |
| `G` then `C` | Go to Catalog |
| `G` then `A` | Go to Analytics |
| `G` then `S` | Go to Settings |
| `N` | New (context-dependent) |
| `/` | Focus search |
| `?` | Show shortcuts cheatsheet |
| `Cmd+J` / `Ctrl+J` | Toggle theme |
| `Esc` | Close modal/panel |

### 8.6 AI Helper Panel (Sidebar)

Collapsible panel in sidebar (Business+):
- Quick AI assistant chat
- "Ask AI about your store"
- Context-aware: knows current page
- Examples: "How are sales today?", "Generate a mailing for VIP customers", "Find products without descriptions"

---

## 9. Buyer Application — Storefront

**Two surfaces**, same data, same theme system:

**1. Telegram Mini App storefront** (all tiers)
- URL: opens inside merchant's bot via "Open Store" button (e.g., `t.me/malika_shop_bot/store`)
- Audience: Telegram users (mobile-first)
- Stack: React + TypeScript + Tailwind + Telegram WebApp SDK
- Auth: Telegram `initData` validation, customer auto-created per tenant

**2. Web Storefront** (Премиум-only — see §9.10)
- URL: `<slug>.dokonly.com` (auto-provisioned) + optional custom domain
- Audience: Browser users (desktop + mobile web), Google search visitors, Instagram/WhatsApp shared links
- Stack: Next.js SSR + Cloudflare Workers cache
- Auth: Telegram Login Widget OR guest checkout

**Critical for conversion.** Must be fast, frictionless, theme-consistent across both surfaces. Cart, checkout, product detail pages stay **standardized** across all tenants (conversion-optimized, not customizable).

Sections 9.0–9.9 describe the **Mini App** experience in detail. Section 9.10 describes the **Web Storefront** layout differences and infrastructure.

### 9.0 Storefront Theme System

The storefront is the **only** part of the platform where merchants get visual differentiation. This is intentional — it's their brand, their identity. Cart, checkout, product detail pages stay **standardized** across all tenants (conversion-optimized, not customizable).

#### Theme System Philosophy

**Two-layer customization model:**

```
┌─────────────────────────────────────────┐
│  Layer 1: Design Tokens                 │
│  (available to ALL tiers including Start)│
│  - Logo + cover                          │
│  - Accent color (12 presets)             │
│  - Typography bundle (5 presets)         │
│  → "What does my brand look like?"       │
├─────────────────────────────────────────┤
│  Layer 2: Layout & Composition          │
│  (Business+ tier only)                   │
│  - Choose 1 of 5 layouts                 │
│  - Toggle storefront blocks on/off       │
│  - Categories display style              │
│  - Product card style                    │
│  → "How is my store organized?"          │
└─────────────────────────────────────────┘
```

**Standardized (NOT customizable on any tier):**
- Cart UI
- Checkout flow
- Product detail page structure
- Payment method selection screens
- Order tracking pages
- Returns flow

Why: these are conversion-critical. Amazon's checkout took 25 years to optimize. We're not letting merchants break it.

#### Tier Feature Matrix

| Feature | Старт | Бизнес | Премиум |
|---|---|---|---|
| Logo upload | ✓ | ✓ | ✓ |
| Cover image | ✓ | ✓ | ✓ |
| Accent color (12 presets) | ✓ | ✓ | ✓ |
| Typography bundle (5 presets) | ✓ | ✓ | ✓ |
| **Layout choice (5 options)** | ❌ (fixed: Boutique) | ✓ | ✓ |
| **Configurable blocks** | ❌ | ✓ | ✓ |
| **Categories display style** | ❌ (default: scrolling chips) | ✓ | ✓ |
| **Product card style** | ❌ (vertical default) | ✓ | ✓ |
| **Theme presets (quick-start)** | ❌ | ✓ | ✓ |
| **A/B test themes** | ❌ | ❌ | ✓ |
| **Custom favicon** | ❌ | ✓ | ✓ |
| Remove "Powered by Dokonly" | ❌ | ✓ | ✓ |

#### Layer 1: Design Tokens (All Tiers)

##### Typography Bundles (5)

Each bundle defines display + body + mono fonts, pre-tested for Cyrillic + Latin (UZ diacritics like ʻ verified):

| Bundle | Display | Body | Mono | Best for |
|---|---|---|---|---|
| **modern** | Sora | Outfit | JetBrains Mono | Electronics, Digital, Services |
| **editorial** | Instrument Serif | Inter | JetBrains Mono | Fashion, Beauty, Hobby |
| **bold** | Bricolage Grotesque | Inter | JetBrains Mono | Sport, Auto, Kids |
| **warm** | Fraunces | Outfit | JetBrains Mono | Home, Food, Pets |
| **minimal** | Geist | Geist | Geist Mono | Universal, premium-minimal |

**Implementation:**

```typescript
// packages/shared/src/themes/typography.ts
export const TYPOGRAPHY_BUNDLES = {
  modern: {
    display: { family: 'Sora', weights: [600, 700] },
    body: { family: 'Outfit', weights: [400, 500, 600] },
    mono: { family: 'JetBrains Mono', weights: [400, 500] },
  },
  editorial: {
    display: { family: 'Instrument Serif', weights: [400], italic: true },
    body: { family: 'Inter', weights: [400, 500, 600] },
    mono: { family: 'JetBrains Mono', weights: [400, 500] },
  },
  bold: {
    display: { family: 'Bricolage Grotesque', weights: [600, 700, 800] },
    body: { family: 'Inter', weights: [400, 500, 600] },
    mono: { family: 'JetBrains Mono', weights: [400, 500] },
  },
  warm: {
    display: { family: 'Fraunces', weights: [500, 600, 700] },
    body: { family: 'Outfit', weights: [400, 500, 600] },
    mono: { family: 'JetBrains Mono', weights: [400, 500] },
  },
  minimal: {
    display: { family: 'Geist', weights: [500, 600] },
    body: { family: 'Geist', weights: [400, 500] },
    mono: { family: 'Geist Mono', weights: [400, 500] },
  },
};
```

##### Accent Colors (12 presets)

No hex picker (UX catastrophe). 12 curated colors, each with light + dark variants + accessibility-verified contrast:

```typescript
export const ACCENT_COLORS = {
  // Greens (default category)
  forest:   { light: '#0F766E', dark: '#14B8A6', name: 'Forest' },
  emerald:  { light: '#00B383', dark: '#00D199', name: 'Emerald' },  // default
  mint:     { light: '#10B981', dark: '#34D399', name: 'Mint' },
  lime:     { light: '#65A30D', dark: '#84CC16', name: 'Lime' },
  
  // Blues
  ocean:    { light: '#0284C7', dark: '#38BDF8', name: 'Ocean' },
  sky:      { light: '#0EA5E9', dark: '#7DD3FC', name: 'Sky' },
  indigo:   { light: '#4F46E5', dark: '#818CF8', name: 'Indigo' },
  
  // Warms
  sunset:   { light: '#EA580C', dark: '#FB923C', name: 'Sunset' },
  coral:    { light: '#E11D48', dark: '#FB7185', name: 'Coral' },
  rose:     { light: '#DB2777', dark: '#F472B6', name: 'Rose' },
  
  // Neutrals
  graphite: { light: '#1F2937', dark: '#9CA3AF', name: 'Graphite' },
  sand:     { light: '#B45309', dark: '#FCD34D', name: 'Sand' },
};
```

##### Logo & Cover

- Logo: square (1:1), recommended 512×512 PNG with transparency
- Cover: 16:9 banner, recommended 1600×900 JPG/PNG
- Both stored in R2, auto-optimized to WebP

#### Layer 2: Layouts (Business+ Only)

5 layout archetypes. Each defines the overall structure and visual feel of the storefront home page.

| Layout | Best for | Key characteristics |
|---|---|---|
| **boutique** | Fashion, Beauty, Premium goods | Full-width hero, large vertical product cards, photography-first |
| **catalog** | Electronics, Auto parts, Spec-heavy | Compact density, specs visible on cards, filters prominent |
| **lookbook** | Premium fashion, Home decor | Story-heavy, large stories carousel, lifestyle imagery before products |
| **marketplace** | Multi-category, lots of SKUs | Grid 2x2, category-first navigation, search prominent |
| **bento** | Lifestyle, mixed inventory | Bento grid with mixed card sizes (some 2×, some 1×), magazine feel |

##### Layout Definitions (Storefront Home Page Structure)

**Boutique** (default for Старт, fashion-leaning):
```
[Cover full-width 16:9]
[Logo + Name + Description]
[Stories carousel — if enabled]
[Featured hero banner — single large]
[Categories: scrolling chips]
[Products: 2-col grid, large vertical cards]
```

**Catalog** (specs-focused):
```
[Compact header: logo + name + contact]
[Stories: small thumbnails — if enabled]
[Search bar prominent]
[Filter bar: price, brand, attributes]
[Categories: tab navigation]
[Products: 2-col compact cards with specs preview]
```

**Lookbook** (story-first):
```
[Cover full-width 16:9 with overlay]
[Logo + tagline]
[Stories: LARGE carousel (full-width)]
[Featured: 3-card horizontal carousel]
[Categories: bento cards with category images]
[Products: 1-col large cards (single column on mobile)]
```

**Marketplace** (multi-category):
```
[Compact header]
[Search bar HUGE]
[Quick links: New / Sale / Featured / Categories]
[Categories: large grid icons (4 per row)]
[Products: 2-col grid, compact cards]
[Trust strip: delivery, contact, rating]
```

**Bento** (magazine feel):
```
[Cover full-width]
[Logo + name]
[Stories: top row — if enabled]
[Bento grid mixing:
   - Featured product (2x2 large)
   - 4 regular products (1x1)
   - Category card (2x1)
   - Promo banner (1x2)
   ...repeating pattern]
```

#### Layer 2: Configurable Blocks (Business+ Only)

Within a chosen layout, merchants can toggle which blocks appear and customize their style:

```typescript
type StorefrontBlocks = {
  stories: {
    enabled: boolean;
    style: 'instagram' | 'tiktok' | 'hidden';
    // instagram: circular thumbnails top
    // tiktok: full-screen swipe entry
  };
  
  featured_banner: {
    enabled: boolean;
    rotate: boolean;       // auto-rotate every 5s
    products: UUID[];      // featured product IDs
  };
  
  trust_strip: {
    enabled: boolean;
    items: ('delivery' | 'contact' | 'rating' | 'returns_policy' | 'verified')[];
  };
  
  categories: {
    enabled: boolean;
    style: 'bento' | 'burger' | 'scrolling' | 'tabs' | 'grid_icons';
    // bento: mixed-size cards (magazine feel)
    // burger: hamburger button reveals category list (saves space)
    // scrolling: horizontal scroll chips (default)
    // tabs: sticky tabs at top
    // grid_icons: large category cards with images
  };
  
  products_grid: {
    enabled: true;          // mandatory, cannot be disabled
    card_style: 'vertical' | 'horizontal' | 'image_only' | 'compact';
    columns: 1 | 2;         // 1 = single column (premium feel), 2 = standard
  };
  
  about_block: {
    enabled: boolean;
    position: 'top' | 'bottom';
  };
  
  reviews_section: {
    enabled: boolean;
    min_rating: number;     // only show reviews >= this rating
  };
  
  recently_viewed: {
    enabled: boolean;       // shows products user previously viewed
  };
};
```

##### Product Card Styles

- **vertical** (default): image top, name + price below — universal
- **horizontal**: image left, info right — for text-heavy products (books, services)
- **image_only**: full-image card, text overlay on hover — for fashion/beauty
- **compact**: smaller card, more per screen — for marketplace volume

#### Theme Presets (Business+ Quick-Start)

Don't make merchants assemble from scratch. 10 pre-made themes combining everything:

| Preset | Layout | Typography | Accent | Categories | Stories |
|---|---|---|---|---|---|
| `modern_fashion` | boutique | editorial | rose | bento | on |
| `tech_store` | catalog | modern | indigo | tabs | off |
| `cosy_home` | lookbook | warm | sand | burger | on |
| `sport_energy` | marketplace | bold | lime | scrolling | on |
| `premium_boutique` | boutique | minimal | graphite | bento | on |
| `food_market` | marketplace | warm | sunset | grid_icons | on |
| `kids_playful` | marketplace | bold | sky | bento | on |
| `electronics_specs` | catalog | modern | ocean | tabs | off |
| `beauty_editorial` | lookbook | editorial | coral | bento | on |
| `auto_industrial` | catalog | bold | graphite | tabs | off |

Selecting a preset applies all 5 dimensions at once. Merchant can fine-tune after.

#### Onboarding Flow Integration (Updated)

The onboarding wizard (Section 7.3) is updated to include theme decisions:

**Existing steps:** Country → Sphere → Legal status → Store name & currency → Channel

**NEW Step 4.5: Visual Identity** (inserted before final success screen)

##### For Старт tier:

```
[Header: "Let's make your store look great"]

[Sub-header: "Pick your style — you can change anytime"]

────────────────────────────────────
1. TYPOGRAPHY BUNDLE
   [5 cards with live preview]
   ● Modern (default for Electronics/Tech)
   ○ Editorial
   ○ Bold
   ○ Warm
   ○ Minimal
   
   Default selection based on sphere:
   - Fashion → Editorial
   - Electronics → Modern  
   - Beauty → Editorial
   - Sport → Bold
   - Home → Warm
   - Food → Warm
   - Auto → Bold
   - Kids → Bold
   - Other → Modern

────────────────────────────────────
2. ACCENT COLOR
   [Grid of 12 color swatches]
   ○ Forest  ● Emerald  ○ Mint  ○ Lime
   ○ Ocean   ○ Sky      ○ Indigo
   ○ Sunset  ○ Coral    ○ Rose
   ○ Graphite ○ Sand
   
   Default selection based on sphere:
   - Fashion → Rose
   - Beauty → Rose or Coral
   - Electronics → Indigo or Ocean
   - Sport → Lime
   - Home → Sand
   - Food → Sunset
   - Auto → Graphite
   - Kids → Sky

────────────────────────────────────
3. LOGO (optional, can add later)
   [Upload zone]
   "Add logo now or skip"

────────────────────────────────────
[Live preview frame — updates as you change]
[Mobile-sized storefront preview]

[MainButton: "Continue"]
```

##### For Бизнес+ tier:

Same as Старт PLUS:

```
────────────────────────────────────
4. LAYOUT — How should your store be organized?

[5 layout cards with thumbnails]

● Boutique — "Fashion-forward, photo-heavy"
○ Catalog — "Specs and filters, organized"
○ Lookbook — "Story-driven, lifestyle"
○ Marketplace — "Many products, fast browsing"
○ Bento — "Magazine-style, unique"

[Click any → opens full preview]

Default selection based on sphere:
- Fashion → boutique or lookbook
- Electronics → catalog
- Beauty → lookbook
- Sport → marketplace
- Home → lookbook
- Food → marketplace
- Auto → catalog
- Kids → marketplace
- Other → boutique

────────────────────────────────────
ADVANCED (collapsed, "Customize blocks")
- Categories style: [Bento / Burger / Scrolling / Tabs / Grid]
- Stories: [On / Off]
- About block: [On / Off]
- Reviews section: [On / Off]
- Trust strip items: [delivery, contact, rating, returns]
```

##### Quick-Start Path for Бизнес+

Above the wizard, banner:
```
"Skip setup — pick a ready-made theme"

[10 theme preset cards, horizontal scroll]
[Click → applies everything, jumps to success]
```

#### Live Preview Architecture

During wizard, a Mini App-sized preview pane (375px wide) renders on the right (desktop) or below (mobile):

- Shows actual products from catalog (or placeholders if empty)
- Updates in real-time as user changes selections
- Toggles for Light / Dark theme view
- Toggle for Mobile (375px) / Tablet (768px) view

Implementation: iframe loading storefront with `?preview_mode=1&theme=<draft>` params, themes applied via CSS variables.

#### Bot Identity Customization (Separate from Storefront)

The **Telegram bot** (entry point) is configured separately from the **storefront** (what buyers see inside Mini App).

| Bot setting | Старт | Бизнес+ |
|---|---|---|
| Welcome message text | ✓ (template + edit) | ✓ |
| Welcome message image | ❌ | ✓ |
| Bot description (`/start` description) | ✓ | ✓ |
| Bot menu button label (default: "Open Store") | ❌ (fixed) | ✓ |
| Bot commands (`/orders`, `/help` etc.) | ❌ (defaults only) | ✓ (add custom) |
| Bot avatar (set via @BotFather) | ✓ | ✓ |

Bot identity configured in: **Settings → Bot Settings** (separate page from Settings → Storefront Theme).

#### Database Tier Enforcement

Backend enforces tier rules:

```python
# apps/api/dokonly_api/services/storefront_theme.py
async def update_storefront_theme(
    tenant_id: UUID,
    updates: dict,
    user: User,
):
    tenant = await get_tenant(tenant_id)
    
    # Layer 1 (all tiers)
    allowed_fields = {'typography_bundle', 'accent_color', 'logo_url', 'cover_url'}
    
    # Layer 2 (Business+)
    if tenant.plan in ('business', 'premium'):
        allowed_fields |= {'layout', 'storefront_blocks', 'theme_preset_id'}
    
    # Premium only
    if tenant.plan == 'premium':
        allowed_fields |= {'custom_favicon_url'}
    
    rejected = set(updates.keys()) - allowed_fields
    if rejected:
        raise PlanLimitExceeded(
            f"These customizations require upgrade: {rejected}",
            upgrade_url='/billing/upgrade'
        )
    
    await db.update('tenants', tenant_id, updates)
    await invalidate_storefront_cache(tenant_id)
```

#### Migration on Upgrade

When merchant upgrades Старт → Бизнес:
1. Current `typography_bundle`, `accent_color`, `logo_url`, `cover_url` preserved
2. `layout` stays as 'boutique' (current locked value)
3. Banner appears in dashboard: "You can now choose a layout and customize blocks"
4. CTA: "Customize storefront" → goes to theme editor with all options unlocked
5. No visual regression for existing buyers

### 9.0.5 App Shell & Bottom Navigation

The storefront must feel like a **real e-commerce app**, not a catalog with checkout. Achieved via persistent bottom navigation and native Telegram MainButton for primary actions.

#### App Shell Layout

```
┌────────────────────────────┐
│  Telegram BackButton       │ ← native, hidden on tab roots
├────────────────────────────┤
│                            │
│  Tab content (scrollable)  │ ← changes per tab
│  pt-safe                   │
│                            │
├────────────────────────────┤
│  Bottom Navigation         │ ← persistent on all tabs
│  [🏠] [🔍] [🛍3] [👤]      │
│  pb-safe                   │
└────────────────────────────┘

When MainButton is active (e.g., product page):
┌────────────────────────────┐
│  Tab content               │
│  pb-32                     │ ← extra padding for MainButton area
├────────────────────────────┤
│  Bottom Navigation         │
├────────────────────────────┤
│  [   Telegram MainButton  ]│ ← native, NOT custom button
│  pb-safe                   │
└────────────────────────────┘
```

#### Bottom Navigation — 4 Tabs

| Tab | Icon | Route | Purpose | Badge |
|---|---|---|---|---|
| 🏠 **Главная** | `Home` | `/` | Curated experience (stories, featured, recommendations) | — |
| 🔍 **Каталог** | `Search` | `/catalog` | Full browse with filters + search | — |
| 🛍 **Корзина** | `ShoppingBag` | `/cart` | Current cart contents | Item count (red dot) |
| 👤 **Профиль** | `User` | `/profile` | Personal data, orders, loyalty, referral, wishlist | New rewards count (accent) |

**Behavior:**
- Tabs persistent across navigation (always visible)
- Tap active tab → scroll to top + refresh
- Long-press cart tab → show mini preview (last 3 items added)
- Badge animations: scale up when count changes
- Active tab indicator: accent color icon + label, others muted

**Implementation:**

```tsx
// apps/storefront/src/components/BottomNav.tsx
const TABS = [
  { id: 'home',     icon: Home,         labelKey: 'tabs.home',     path: '/' },
  { id: 'catalog',  icon: Search,       labelKey: 'tabs.catalog',  path: '/catalog' },
  { id: 'cart',     icon: ShoppingBag,  labelKey: 'tabs.cart',     path: '/cart' },
  { id: 'profile',  icon: User,         labelKey: 'tabs.profile',  path: '/profile' },
];

export function BottomNav() {
  const cart = useCart();
  const profile = useProfile();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border pb-safe">
      <div className="flex">
        {TABS.map((tab) => {
          const badge = 
            tab.id === 'cart' && cart.itemCount > 0 ? cart.itemCount :
            tab.id === 'profile' && profile.newRewardsCount > 0 ? profile.newRewardsCount :
            null;
          
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center gap-1 py-2 transition-colors',
                isActive ? 'text-accent' : 'text-muted'
              )}
            >
              <div className="relative">
                <tab.icon className="size-6" />
                {badge !== null && (
                  <span className={cn(
                    'absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-2xs flex items-center justify-center',
                    'bg-danger text-white font-medium'
                  )}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-2xs font-medium">{t(tab.labelKey)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
```

#### Telegram MainButton — Primary Actions

Replace custom "buy/add" buttons with Telegram's native MainButton on screens that have a primary action:

| Screen | MainButton text |
|---|---|
| Product detail | "Добавить в корзину · 450 000 UZS" → "Добавлено ✓ В корзину" (3s) |
| Cart (not empty) | "Оформить заказ · 850 000 UZS" |
| Checkout (filled) | "Оформить заказ · 850 000 UZS" |
| Edit profile | "Сохранить" |
| Returns request form | "Отправить запрос" |
| Hidden | Home, Catalog, Cart (empty), Profile (root), most browse pages |

**MainButton hook pattern:**

```tsx
// On product detail page
function ProductDetail() {
  const { variant, quantity, addToCart } = useCart();
  const product = useProduct();
  const [justAdded, setJustAdded] = useState(false);
  
  const isAvailable = product.stock > 0 && variant?.available;
  const totalPrice = (variant?.price || product.price) * quantity;
  
  useTelegramMainButton({
    text: justAdded
      ? `${t('common.added')} ✓ ${t('cart.viewCart')}`
      : `${t('product.addToCart')} · ${formatCurrency(totalPrice)}`,
    onClick: justAdded ? goToCart : handleAdd,
    isVisible: isAvailable,
    color: justAdded ? '#00B383' : null,
    hapticOnClick: 'success',
  });
  
  async function handleAdd() {
    await addToCart({ productId, variantId: variant?.id, quantity });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);
  }
  
  // No custom Add to Cart button anywhere in JSX — MainButton handles it
  return (...);
}
```

#### Telegram BackButton Behavior

- Hidden on tab roots (Home, Catalog, Cart, Profile)
- Visible on all nested pages (product detail, checkout, order detail, edit profile, etc.)
- Hardware back / swipe back gesture works natively
- Inside a tab — back goes through history within tab, then exits tab to home

#### Navigation Patterns Within Tabs

**Home tab routes:**
- `/` — main storefront
- `/products/<id>` — product detail
- `/stories/<id>` — story viewer

**Catalog tab routes:**
- `/catalog` — main catalog (all products + filters)
- `/catalog/category/<slug>` — category filtered view
- `/catalog/search` — search results
- `/products/<id>` — product detail (same as Home)

**Cart tab routes:**
- `/cart` — cart view
- `/checkout` — checkout form
- `/orders/<id>/success` — order success
- `/orders/<id>/payment` — payment instructions (manual transfer)

**Profile tab routes:**
- `/profile` — profile home
- `/profile/edit` — edit personal info
- `/profile/orders` — order history
- `/profile/orders/<id>` — order detail
- `/profile/returns` — returns list
- `/profile/returns/new/<order_id>` — create return
- `/profile/wishlist` — saved favorites
- `/profile/loyalty` — loyalty card details
- `/profile/referral` — referral program
- `/profile/about` — about this store
- `/profile/privacy` — data export/delete
- `/profile/help` — help/FAQ

### 9.1 Entry Flow

1. Customer opens merchant's bot OR clicks "Open Store" button in merchant's channel
2. Telegram opens Mini App at `storefront.dokonly.com/<tenant_slug>`
3. Frontend extracts `tenant_slug` from URL + Telegram user from initData
4. Backend validates initData HMAC, identifies user, creates/fetches customer record for this tenant
5. **Channel subscription check (if enabled):**
   - If `tenant.channel_subscription_required` AND user not subscribed to merchant's channel
   - Show "Store Unavailable" gate screen
   - Otherwise → load storefront

### 9.2 Storefront Home (`/`)

**Layout is dynamic** — depends on `tenant.layout` (boutique / catalog / lookbook / marketplace / bento) and `tenant.storefront_blocks` configuration (Business+).

#### Universal Structure (Boutique layout shown — default)

```
┌────────────────────────┐
│  Store header          │ ← always present
│  - Cover + Logo        │
│  - Name + Verified ✓   │
│  - Description         │
│  - Contact buttons     │
├────────────────────────┤
│  Search bar (sticky)   │ ← always present
│  Cart icon (badge)     │
├────────────────────────┤
│  [Optional blocks       │
│   based on layout +     │
│   storefront_blocks]    │
│                         │
│   - Stories carousel    │ ← if enabled
│   - Featured banner     │ ← if enabled
│   - Trust strip         │ ← if enabled
│   - Categories          │ ← style varies by layout
│   - About block         │ ← if enabled (Business+)
│   - Reviews             │ ← if enabled (Business+)
│   - Recently viewed     │ ← if enabled
├────────────────────────┤
│  Products grid          │ ← always present (mandatory)
│  Style varies:          │
│  - 2-col vertical (default)
│  - 1-col large (lookbook)
│  - Bento mixed (bento)
│  - Compact (marketplace)
├────────────────────────┤
│  Floating cart button   │ ← if cart has items
│  (3) — 850 000 UZS      │
└────────────────────────┘
```

**Frontend implementation:** Each layout is a separate React component (`LayoutBoutique`, `LayoutCatalog`, etc.) that reads `tenant.storefront_blocks` and renders blocks accordingly.

```typescript
// apps/storefront/src/pages/home/index.tsx
function StorefrontHome() {
  const { tenant, theme } = useTenantTheme();
  
  const LayoutComponent = LAYOUTS[tenant.layout];  // 5 layout components
  
  return (
    <ThemeProvider theme={theme}>
      <LayoutComponent blocks={tenant.storefront_blocks} />
    </ThemeProvider>
  );
}
```
```

#### Store Header Components

- **Cover image** at top (16:9 banner)
- **Logo** circle overlaid on cover bottom
- **Store name** (large, display font)
- **Description** (small, 2 lines max)
- **Trust indicators:**
  - ✓ Verified badge (if applicable)
  - ⭐ Average rating (if has reviews)
  - 👥 Customer count (if many)
- **Contact action buttons** (small icons row):
  - 📞 Phone
  - 💬 Telegram chat
  - 📷 Instagram
  - 📍 Address (opens maps)

#### Stories Carousel

- Instagram-style ring of stories
- Each: circular thumbnail with media preview
- Tap to open full-screen story viewer
- Auto-advance (5s image, full duration video)
- Caption overlay at bottom
- CTA button if linked to product/category

#### Categories Chips

- Horizontal scrolling chips
- "All" + each category with product count
- Tap to filter products

#### Featured Section

- Hero carousel with 3-5 products
- Larger cards with promotion badges ("-30%", "NEW", "Bestseller")
- Auto-rotate every 5s

#### Products Grid

- 2-column grid (1-col on very narrow viewports)
- Card per product:
  - Image (1:1 ratio, lazy-loaded with blur placeholder)
  - **Wishlist heart** (top-right corner, tap to toggle) — fills accent color when active
  - Name (truncated to 2 lines)
  - Price (mono font, prominent)
  - Compare-at price (struck through if on sale)
  - Quick add button (small + icon, if no variants)
  - Video badge 🎬 if has video
  - Out-of-stock overlay if applicable
- Tap card → product detail
- Infinite scroll with skeleton loaders

#### Cart Indication (NO Floating Button)

Cart count is shown only via the **Cart tab badge** in bottom navigation. No floating FAB — keeps interface clean and uses native Telegram patterns.

When an item is added to cart from product card or detail page:
- Brief haptic feedback (`light`)
- Cart tab icon scales up + badge animates (count increments)
- Optional brief toast "Added to cart" (1.5s, dismissable)

### 9.2.5 Catalog Tab (`/catalog`)

Full-browse view. While Home is curated and editorial, Catalog is **functional discovery** — find what you want fast.

```
┌────────────────────────┐
│  Top bar (sticky)      │
│  🔍 Search products...  │ ← always visible, sticky
│         [Filter icon 🎚]│
├────────────────────────┤
│  Active filters chips  │ ← if filters applied
│  [Price ≤500K ×] [×]   │
├────────────────────────┤
│  Categories chips      │ ← horizontal scroll
│  [All] [👕 Clothes]    │
│  [👟 Shoes] [👜 Bags]  │
├────────────────────────┤
│  Sort: Newest ▼        │
│  243 products          │
├────────────────────────┤
│  Products grid (2col)  │
│  [Product] [Product]   │
│  [Product] [Product]   │
│  ...                   │
│  pb-20 (BottomNav)     │
└────────────────────────┘

[Telegram BottomNav: 🏠 🔍 🛍 👤] ← 🔍 active
```

#### Top Search Bar (sticky)

- Always visible at top of catalog
- Tap → opens full-screen search
- Search across: product names, descriptions, attributes, tags
- Recent searches saved (last 5)
- AI suggestions if Premium tenant ("Did you mean...")

#### Filter Panel

Triggered by 🎚 icon in top bar. Opens as bottom sheet.

**Filter sections:**

1. **Price range** — dual slider with min/max inputs
2. **Categories** — multi-select chips
3. **Availability** — toggle "In stock only"
4. **Has discount** — toggle
5. **Has video** — toggle
6. **Attributes** (dynamic based on tenant's products):
   - For Fashion: Size, Color, Material, Brand
   - For Electronics: Brand, Model, Specifications
   - For Auto: Car brand, Model, Year
- Sort options:
  - Newest (default)
  - Price: Low to High
  - Price: High to Low
  - Most popular
  - Best rated

**Bottom sheet actions:**
- "Reset all" — clears filters
- "Apply (showing 47)" — MainButton, shows filtered count

#### Categories Chips

- Horizontal scroll
- "All" + each category with product count
- Tap to filter (becomes single-select)
- Selected = accent color background

#### Sort Bar

- Sub-bar below filters: "Sort: <current option> ▼"
- Tap → bottom sheet with sort options
- Shows product count: "243 products" / "47 products (filtered)"

#### Search Screen (`/catalog/search`)

Full-screen search with:
- Input field with auto-focus
- Cancel button
- Recent searches list (last 5)
- Trending searches (top 5 across all customers — Premium feature)
- Live results as user types (debounced 300ms)
- Empty state if no results: "No products found. Try different keywords."

### 9.3 Product Detail (`/products/<id>`)

```
┌────────────────────────┐
│  Image gallery         │ ← swipeable, video inline
│  [Swipeable carousel]  │
│  • • • •               │
│              [↗] [❤]   │ ← share + wishlist (top-right overlay)
│  [Video if exists]     │
├────────────────────────┤
│  Product name (large)  │
│  ⭐ 4.5 (12 reviews)   │
├────────────────────────┤
│  Price                 │
│  450 000 UZS           │
│  ~~580 000~~ -22%      │
├────────────────────────┤
│  Variants              │
│  Size: [S] [M] [L]     │
│  Color: [○] [○] [○]    │
├────────────────────────┤
│  Quantity              │
│  [-] 1 [+]             │
├────────────────────────┤
│  Description           │
│  [Show more]           │
├────────────────────────┤
│  Specifications        │
├────────────────────────┤
│  Reviews (12)          │
│  [Show all]            │
├────────────────────────┤
│  Similar products      │ ← AI recommendations (Premium)
├────────────────────────┤
│  pb-32 (space for      │
│  MainButton)            │
└────────────────────────┘

[Telegram BottomNav: 🏠 🔍 🛍 👤]
[Telegram MainButton: "Добавить в корзину · 450 000 UZS"]
```

#### Image Gallery
- Swipeable horizontal carousel
- Pinch-to-zoom on tap
- Video plays inline (if exists, with controls)
- Track view event on first 2s
- **Action icons** in top-right corner of image gallery (both 44×44px tap target, 12px gap):
  - **Share icon** (↗ Lucide `Share2`) — see §9.3.5 Share Feature
  - **Wishlist heart icon** (❤):
    - Tap to toggle wishlist
    - Filled accent color when in wishlist
    - Outline when not
    - Haptic feedback on toggle
    - Optimistic UI update (instant visual, sync to backend)

#### Variants Selector
- Each option type as horizontal chip row (Size, Color, etc.)
- Selected chip highlighted with accent
- Out-of-stock variants grayed (tap shows "Out of stock" toast)
- Price updates if variants have different prices

#### Quantity Selector
- — / + buttons
- Validates against stock (if tracked)
- Min: 1, Max: stock or 99

#### Reviews Section
- Average rating + count
- Sort by: most recent / highest / lowest
- "Show all" → reviews page (collapsed view shows top 3)

#### AI Recommendations (Premium tier)
- Section: "You might also like"
- 3-5 products based on viewing history + cart
- Algorithm: vector similarity + collaborative filtering

#### MainButton
- "Add to cart" / "Out of stock" if no variants stockable
- After adding → text changes to "Added! Add another" for 2s
- Haptic feedback on success

### 9.3.5 Share Feature (Viral Mechanic)

**Critical for organic growth.** Every product share becomes a referral attribution. Used on Product Detail, Wishlist items, and Order Success screens.

#### Share Action Sheet

When user taps Share icon (↗) — opens bottom sheet:

```
┌────────────────────────────┐
│  ━━ (drag handle)          │
│  Share this product        │
├────────────────────────────┤
│  [📱 Send via Telegram]    │ ← native chat picker (inline mode)
│  [🎬 Share to Story]       │ ← Telegram Stories (if version supports)
│  [📋 Copy link]            │ ← fallback for any context
├────────────────────────────┤
│  Earn from sharing 🎁      │ ← if referral program active
│  When friends order via    │
│  your link, you get 5 000  │
│  UZS cashback              │
└────────────────────────────┘
```

#### Option 1: Telegram Chat Share (Primary)

Uses Telegram WebApp SDK `switchInlineQuery`. Bot responds via inline mode with rich preview.

```typescript
// apps/storefront/src/components/ShareSheet.tsx
function handleTelegramShare(product: Product, referralCode: string | null) {
  // Build inline query payload
  const query = `share_${product.id}${referralCode ? `_ref_${referralCode}` : ''}`;
  
  // Track share intent immediately
  trackShareIntent(product.id, 'inline_query', referralCode);
  
  // Open Telegram chat picker
  Telegram.WebApp.switchInlineQuery(query, ['users', 'groups', 'channels']);
}
```

**Backend inline_query handler:**

```python
# apps/api/dokonly_api/bot/handlers/inline.py
@router.inline_query()
async def handle_share_inline_query(query: InlineQuery, tenant: Tenant):
    # Parse query: "share_<product_id>" or "share_<product_id>_ref_<code>"
    parts = query.query.split('_')
    if parts[0] != 'share' or len(parts) < 2:
        await query.answer([], cache_time=0)
        return
    
    product_id = parts[1]
    ref_code = parts[3] if len(parts) >= 4 and parts[2] == 'ref' else None
    
    product = await get_product(product_id, tenant_id=tenant.id)
    if not product or not product.is_active:
        await query.answer([], cache_time=0)
        return
    
    # Build deep link to product (with referral attribution)
    deep_link_payload = f"product_{product_id}"
    if ref_code:
        deep_link_payload += f"_ref_{ref_code}"
    deep_link = f"https://t.me/{tenant.bot_username}/store?startapp={deep_link_payload}"
    
    # Render rich preview (text + image + button)
    result = InlineQueryResultArticle(
        id=f"share_{product_id}_{int(time.time())}",
        title=product.name,
        description=f"{format_price(product.price, tenant.currency)} · {tenant.name}",
        thumbnail_url=product.images[0]['url'] if product.images else tenant.logo_url,
        input_message_content=InputTextMessageContent(
            message_text=build_share_caption(product, tenant, ref_code),
            parse_mode="HTML",
            link_preview_options=LinkPreviewOptions(
                url=deep_link,
                prefer_large_media=True,
                show_above_text=True,
            ),
        ),
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="🛍 Open store",
                url=deep_link,
            )]
        ]),
    )
    
    await query.answer([result], cache_time=300, is_personal=True)


def build_share_caption(product, tenant, ref_code):
    """Build shared message text. Pre-filled, user can edit before sending."""
    discount_line = ""
    if product.compare_at_price and product.compare_at_price > product.price:
        discount = round((1 - product.price / product.compare_at_price) * 100)
        discount_line = f" 🔥 -{discount}%"
    
    return (
        f"<b>{product.name}</b>{discount_line}\n\n"
        f"💰 <b>{format_price(product.price, tenant.currency)}</b>\n\n"
        f"🏪 {tenant.name}\n"
        f"{'🎁 Get 10% off with my code!' if ref_code else ''}"
    )
```

**Recipient experience:**
1. Receives message in their Telegram chat with rich preview
2. Sees product photo, name, price, discount (if any), store name
3. Taps "Open store" button → opens Mini App at product page
4. If referral code attached → automatic attribution on first order

#### Option 2: Share to Telegram Story

Uses Telegram WebApp SDK `shareToStory()`. Available in Telegram 8.0+.

```typescript
function handleStoryShare(product: Product, referralCode: string | null) {
  const deepLink = buildProductDeepLink(product.id, referralCode);
  
  // Generate or use product's primary image
  const mediaUrl = product.images[0]?.url;
  
  if (!mediaUrl) {
    showToast("Product needs a photo to share to Story");
    return;
  }
  
  trackShareIntent(product.id, 'share_to_story', referralCode);
  
  Telegram.WebApp.shareToStory(mediaUrl, {
    text: `${product.name}\n${formatPrice(product.price, tenant.currency)}`,
    widget_link: {
      url: deepLink,
      name: 'Open store',
    },
  });
}
```

**Fallback if `shareToStory` unsupported:** show toast "Update Telegram to share to Story" + offer chat share instead.

#### Option 3: Copy Link (Fallback)

For when inline mode is disabled or chat share fails:

```typescript
function handleCopyLink(product: Product, referralCode: string | null) {
  const deepLink = buildProductDeepLink(product.id, referralCode);
  
  trackShareIntent(product.id, 'copy_link', referralCode);
  
  navigator.clipboard.writeText(deepLink);
  showToast("Link copied to clipboard");
  Telegram.WebApp.HapticFeedback.notificationOccurred('success');
}
```

#### Referral Attribution Logic

**Every share automatically includes the sharer's referral code** (if referral program is active for this tenant):

```typescript
async function getShareReferralCode(customerId: string, tenantId: string): Promise<string | null> {
  // Check if tenant has active referral program
  const program = await fetchReferralProgram(tenantId);
  if (!program?.is_active) return null;
  
  // Get or create referral code for this customer
  let code = await fetchMyReferralCode(customerId);
  if (!code) {
    // Generate: first_name(5) + random 2 digits
    code = generateReferralCode(customer.first_name);
    await createReferralCode(customerId, code);
  }
  
  return code;
}
```

**Deep link format:**
```
https://t.me/<bot_username>/store?startapp=product_<id>_ref_<code>
```

**On recipient open (bot `start` handler):**

```python
@router.message(CommandStart(deep_link=True))
async def handle_deep_link_start(message: Message, command: CommandObject, tenant: Tenant):
    payload = command.args  # e.g., "product_42_ref_MALIKA10"
    parts = payload.split('_')
    
    product_id = None
    ref_code = None
    
    if parts[0] == 'product':
        product_id = parts[1]
        if len(parts) >= 4 and parts[2] == 'ref':
            ref_code = parts[3]
    
    # Get or create customer for this recipient
    customer = await get_or_create_customer(
        tenant_id=tenant.id,
        telegram_id=message.from_user.id,
    )
    
    # Apply referral attribution if new customer + ref code valid
    if ref_code and customer.is_new and not customer.referred_by_referral_id:
        referral = await create_referral_record(
            tenant_id=tenant.id,
            referrer_code=ref_code,
            referee_customer_id=customer.id,
            triggered_by='share_link',
        )
        await update_customer_referred_by(customer.id, referral.id)
        
        # Update product_shares record (mark attribution)
        await mark_share_resulted_in_signup(
            referral_code=ref_code,
            product_id=product_id,
            customer_id=customer.id,
        )
    
    # Open Mini App to product page if provided
    web_app_url = f"{settings.STOREFRONT_URL}/{tenant.slug}/products/{product_id}"
    await send_welcome_with_button(message, web_app_url)
```

#### Inline Mode Setup Requirement

For Telegram chat share to work, **the merchant's bot must have inline mode enabled** via @BotFather:

1. @BotFather → `/mybots`
2. Select bot → "Bot Settings" → "Inline Mode" → "Turn on"
3. Set inline placeholder text (e.g., "Search products...")
4. Optional: set inline feedback to "100%" for analytics

**Onboarding integration:**

Added to onboarding wizard Step 4 (Bot Creation), after token verification:

```
✓ Bot connected successfully

⚙️ One more step — enable inline sharing
This lets your customers share products to their friends.

[How to enable] (opens guide)

Skip for now (you can enable later in Settings)
```

**Auto-detection:**

Backend periodically (or on bot config save) calls `getMe` API and checks `supports_inline_queries`:

```python
async def check_inline_mode(tenant: Tenant) -> bool:
    bot = await bot_registry.get(tenant)
    me = await bot.get_me()
    
    is_enabled = me.supports_inline_queries
    
    await db.update('tenants', tenant.id, {
        'bot_inline_mode_enabled': is_enabled,
        'bot_inline_mode_checked_at': datetime.utcnow(),
    })
    
    return is_enabled
```

If `bot_inline_mode_enabled=FALSE`:
- Share via chat → grayed out with tooltip "Ask seller to enable inline mode"
- Fallback to "Copy link" + "Share to Story" only
- Show banner in merchant admin: "Enable inline sharing to let customers share products"

#### Share Tracking & Analytics

Every share creates a `product_shares` record (see schema in §5.5).

**Tracked metrics:**
- Total shares per product
- Share method distribution (inline / story / copy)
- Click-through rate (shared link clicked)
- Conversion rate (share → signup → order)
- Top sharers (customers driving most viral growth)

**Merchant analytics (Business+, in Analytics tab):**
- Section "Viral & Referrals"
  - Top shared products
  - Share-to-order conversion %
  - Most active sharers leaderboard

**Update tracking on click:**

```python
# When user opens deep link from share
async def track_share_link_click(share_id: UUID, customer_id: UUID | None):
    await db.execute(
        "UPDATE product_shares SET "
        "  link_click_count = link_click_count + 1, "
        "  last_clicked_at = NOW(), "
        "  resulted_in_visit = TRUE, "
        "  visit_count = visit_count + 1 "
        "WHERE id = $1",
        share_id,
    )
```

**Update on order:**

```python
# When customer places order, check if they came via share
async def attribute_order_to_share(order: Order, customer: Customer):
    if not customer.referred_by_referral_id:
        return  # Direct customer, no attribution
    
    referral = await get_referral(customer.referred_by_referral_id)
    
    # Find matching product_shares record
    share = await db.fetch_one(
        "SELECT * FROM product_shares "
        "WHERE referral_code = $1 "
        "  AND resulted_in_signup_customer_id = $2 "
        "ORDER BY created_at DESC LIMIT 1",
        referral.referrer_code,
        customer.id,
    )
    
    if share:
        await db.update('product_shares', share.id, {
            'resulted_in_order_id': order.id,
        })
        
        # Trigger referrer reward if rules met
        await maybe_credit_referrer_reward(referral, order)
```

#### Edge Cases

| Scenario | Behavior |
|---|---|
| Bot inline mode disabled | Hide "Send via Telegram" option, show banner |
| Product deleted/inactive | Inline query returns empty result; copy link shows error |
| Product out of stock | Still shareable, preview shows "Out of stock" badge |
| Recipient is already customer (this merchant) | Open product page directly, no referral applied |
| Recipient opens same share link 2nd time | Open product, no double-attribution |
| Referral code invalid/expired | Open product page without attribution |
| `shareToStory` unsupported | Hide Story option, show inline + copy only |
| Customer has no first_name (no referral code) | Disable inline share with tooltip "Add your name to enable referrals" |

#### API Endpoints

```
POST   /v1/storefront/{tenant_slug}/products/{id}/share-intent
       # Track share intent before opening Telegram picker
       # Returns: share_id, referral_code, deep_link
POST   /v1/storefront/{tenant_slug}/shares/{share_id}/click
       # Track when deep link is opened
GET    /v1/merchant/analytics/viral
       # Top shared products, conversion rate, top sharers (Business+)
```

#### Settings Integration

In merchant's admin **Settings → Storefront → Sharing**:

- Toggle: "Enable product sharing" (default on)
- Toggle: "Show 'Earn from sharing' message" (requires active referral program)
- Customize share preview template (Business+):
  - Pre-filled text with placeholders: `{product_name}`, `{price}`, `{discount}`, `{store_name}`, `{referral_message}`
  - Live preview
- Inline mode status indicator (Connected / Not enabled — with setup instructions)

### 9.4 Cart (`/cart`)

```
┌────────────────────────┐
│  Cart                  │
├────────────────────────┤
│  [Product 1]           │
│  Size M · 1 × 450 000  │
│  [-] 1 [+]     [×]     │
├────────────────────────┤
│  [Product 2]           │
│  Color Red · 2×...     │
├────────────────────────┤
│  Coupon                │
│  [Enter code]    Apply │
│  ✓ -10% applied        │
├────────────────────────┤
│  Subtotal:   850 000   │
│  Discount:   -85 000   │
│  Shipping:    25 000   │
│  ─────────────────     │
│  Total:      790 000   │
├────────────────────────┤
│  Loyalty points        │ ← if applicable
│  Use 500 points (-50K) │
│  [Toggle]              │
├────────────────────────┤
│  MainButton:           │
│  "Checkout · 790 000"  │
└────────────────────────┘
```

#### Cart Item Card
- Photo + name + variant
- Quantity selector
- Line total
- Remove button (×)
- Swipe left to remove (mobile)

#### Coupon Application
- Input field with validation
- "Apply" button → backend validates
- Shows applied coupon with check mark
- Can remove (×)
- Error messages for invalid/expired

#### Loyalty Points (Business+ tenants only)
- Shows available points balance
- Toggle to use points
- Calculates discount based on point_to_currency_rate
- Respects max_redemption_percent (e.g., max 50% of order)

#### Empty Cart State

When cart is empty, shown as full-page empty state:

```
┌────────────────────────┐
│                        │
│        🛍              │
│                        │
│  Корзина пуста         │
│                        │
│  Найдите что-то        │
│  интересное в          │
│  каталоге              │
│                        │
│  [Перейти в каталог]   │ ← navigate to Catalog tab
│                        │
│  Или посмотрите:       │
│  • Рекомендации        │ ← shows AI recs (if Premium)
│  • Просмотренные       │ ← recently viewed products
│  • Избранное           │ ← if has wishlist items
│                        │
└────────────────────────┘
```

Tapping "Перейти в каталог" switches to Catalog tab. The empty cart screen acts as a discovery hub, not a dead end.

### 9.5 Checkout (`/checkout`)

```
┌────────────────────────┐
│  Checkout              │
├────────────────────────┤
│  Contact info          │
│  Name:    [Malika]     │ ← from Telegram first_name
│                        │
│  📞 Phone *            │
│  ┌──────────────────┐  │
│  │ + Share via      │  │ ← Telegram native button
│  │   Telegram       │  │   (first-time only)
│  └──────────────────┘  │
│                        │
│  (or once shared:)     │
│  +998 90 123 45 67  ✓ │ ← verified badge
│                        │
│  Email:   [_______]    │ ← only if required
├────────────────────────┤
│  Delivery              │
│  ● Self-pickup         │
│  ○ Courier (+25K)      │
│  ○ Discuss with seller │
├────────────────────────┤
│  Delivery address      │ ← if courier
│  [_______________]     │
├────────────────────────┤
│  Comment (optional)    │
│  [_______________]     │
├────────────────────────┤
│  Payment method        │
│  ● Click               │ ← prominent
│  ○ Payme               │
│  ○ Uzum                │
│  ○ Card transfer       │ ← manual bank transfer with screenshot
│  ○ Card payment        │ ← Visa/Mastercard via acquiring
│  ○ Cash on delivery    │
├────────────────────────┤
│  Order summary         │
│  ...                   │
├────────────────────────┤
│  MainButton:           │
│  "Place order"         │
└────────────────────────┘
```

#### Contact Info Section

**Phone — Native Telegram contact sharing (no SMS):**

For **first-time buyers** (no phone on file):
- Show prominent button: "📱 Share phone via Telegram"
- On tap → `Telegram.WebApp.requestContact()`
- Telegram shows native confirmation popup
- User confirms → phone arrives verified
- Backend validates HMAC signature (see §9.7.2 for full implementation)
- Phone saved with `phone_verified_via_telegram = TRUE`
- Field replaced with verified display: `+998 90 123 45 67 ✓`

For **returning buyers** (phone exists in `customers.phone`):
- Show pre-filled verified phone with ✓ badge
- "Use different number?" link → triggers `requestContact()` again
- Or manual override → falls back to unverified flag

For **older Telegram clients** (no `requestContact` support):
- Hide the share button, show manual input field
- Country-specific format validation (UZ: +998 XX XXX-XX-XX)
- Save with `phone_verified_via_telegram = FALSE`
- Banner: "Update Telegram to verify automatically"

**Name:**
- Pre-filled from Telegram `first_name`
- Editable but defaults to Telegram value
- 2-100 chars validation

**Email:**
- Only shown if merchant requires it for orders
- Regex validation
- Opt-in field — buyer can skip if not required

#### Delivery Section
- List of delivery methods configured by merchant
- First method selected by default
- Cost shown per method
- Free shipping threshold indicator if applicable
- Address field appears if method requires it

#### Payment Method Section
- Only methods enabled by merchant
- Recommended highlighted (Click/Payme for UZ)
- Each method: icon + name + brief description

#### Order Summary
- Collapsed by default (tap to expand)
- Shows items, subtotal, discount, shipping, total

#### MainButton
- Dynamic text: "Place order · 790 000 UZS"
- Disabled if required fields missing (esp. phone for first-timers)
- Loading state during submission

### 9.6 Post-Order Flows

#### Manual Transfer Flow
1. Order created with status='created', payment_status='pending'
2. Screen: "Order #ABC123 created"
3. Payment instructions card:
   - Bank card number (with copy button)
   - Holder name
   - Amount
   - "After paying, upload screenshot"
4. Upload screenshot button → file picker
5. After upload: "Awaiting seller confirmation"
6. Telegram notification to merchant
7. Merchant verifies and advances status manually

#### Click/Payme Flow
1. Order created
2. Backend initiates payment with provider
3. Redirect to provider payment page (in Telegram WebView)
4. Customer pays
5. Webhook from provider → backend updates order
6. Customer redirected back to Mini App
7. Success screen with order details
8. Push notification to customer via bot

#### Card Payment Flow (Visa/Mastercard via acquiring bank)
1. Order created
2. Customer enters card details on secure provider page (PCI DSS compliant)
3. 3D Secure verification (SMS or app confirmation)
4. Provider webhook → order confirmed
5. Customer redirected back to Mini App success screen

#### Cash on Delivery Flow
1. Order created with status='created', payment_status='pending'
2. Screen: "Order placed. You will pay on delivery."
3. Notify merchant
4. Merchant confirms manually

#### Order Success Screen
- Animated checkmark icon
- "Order #ABC123 placed!"
- Estimated delivery date (if configured)
- Order details summary
- "Track your order" → opens order detail
- "Continue shopping" → home

**Share section** (if `referral_programs.is_active = TRUE` for this tenant):
```
┌────────────────────────────┐
│  ✅ Order placed!           │
│  ...                        │
├────────────────────────────┤
│  💚 Share with friends      │
│  Get 5 000 UZS for each     │
│  friend who orders          │
│                            │
│  [Share to Telegram ↗]      │
│  [Share to Story 🎬]        │
│  [Copy link 📋]             │
└────────────────────────────┘
```

- Quick share actions for the **just-purchased product(s)**
- Pre-filled message: "Just got this from <Store>! Use my code for 10% off"
- Uses same Share Feature pipeline as §9.3.5
- Most active sharing moment — post-purchase enthusiasm

### 9.7 Profile Tab (`/profile`)

The Profile tab is the buyer's "account home" — their identity, history, rewards, and relationship with the store. **Critical for retention and repeat purchases.**

#### 9.7.1 Profile Home (`/profile`)

```
┌────────────────────────┐
│  [Avatar 64x64]        │ ← from Telegram or custom
│  Malika Alimova        │ ← name (editable)
│  @malika_a             │ ← Telegram username
│  📞 +998 90 123 45 67  │ ← phone (tap to edit)
│              [Edit ✎]   │
├────────────────────────┤
│  🎁 LOYALTY CARD       │ ← only if Business+ tenant has loyalty
│  ┌──────────────────┐  │
│  │ 🥉 Bronze        │  │
│  │ 350 points       │  │
│  │ ████████░░ 650/1000│ │
│  │ 650 to Silver    │  │
│  │ Cashback: 12 500 │  │
│  └──────────────────┘  │
├────────────────────────┤
│  📊 Stats              │
│  Orders: 12 · Spent: 1.2M │
│  Joined: 3 months ago  │
├────────────────────────┤
│  📦 Мои заказы (3 active) ›
│  ❤  Избранное (5)      ›
│  🎁 Программа лояльности ›
│  👥 Пригласить друга   ›
│  🔄 Возвраты           ›
├────────────────────────┤
│  ℹ  О магазине        ›
│  💬 Связаться с продавцом ›
│  ❓ Помощь и FAQ       ›
├────────────────────────┤
│  🔒 Приватность       ›
│  🌐 Язык: Русский     ›
│  Logout (closes Mini App) │
└────────────────────────┘

[BottomNav: 🏠 🔍 🛍 👤] ← 👤 active
```

**Header section:**
- Avatar (auto from Telegram, can override with custom upload — see §9.7.2)
- Full name (first_name + last_name)
- Telegram username with @ prefix
- Phone (required after first checkout, can edit anytime)
- "Edit" pencil icon top-right opens edit screen

**Loyalty card** (only shown if tenant has loyalty program active):
- Mini-card with tier badge (🥉 Bronze, 🥈 Silver, 🥇 Gold, 💎 Platinum)
- Current points balance
- Progress bar toward next tier
- Cashback balance
- Tap → full Loyalty page (§9.7.6)

**Quick stats:**
- Orders count
- Total spent (formatted currency)
- "Joined N ago" — relative time since first interaction

**Menu items** (each opens dedicated sub-page):
- Orders (with active count)
- Wishlist (with count)
- Loyalty program (if Business+)
- Referral (if program active)
- Returns
- About store
- Contact seller (opens Telegram chat with merchant)
- Help & FAQ
- Privacy & Data
- Language switcher
- Logout (closes Mini App)

#### 9.7.2 Edit Profile (`/profile/edit`)

```
┌────────────────────────┐
│  [Avatar (large)]      │ ← tap to change
│  📷 Изменить фото      │
├────────────────────────┤
│  Имя *                 │
│  [Malika_______]       │
├────────────────────────┤
│  Фамилия (необязательно)│
│  [Alimova______]       │
├────────────────────────┤
│  📞 Телефон *          │
│  +998 90 123 45 67     │
│  ✓ Подтверждён через   │
│    Telegram            │
│  [Изменить номер]      │
├────────────────────────┤
│  ✉ Email (необязательно)│
│  [_______________]     │
│  Используется для      │
│  чеков и подтверждений │
├────────────────────────┤
│  🎂 День рождения      │
│  (необязательно)       │
│  [____.__.____]        │
│  Получите бонус ко дню │
│  рождения!             │
├────────────────────────┤
│  🏠 Адрес доставки     │
│  (необязательно)       │
│  [Сохраним для        │
│   быстрого checkout]   │
│  [Edit address ›]      │
├────────────────────────┤
│  🌐 Язык               │
│  Русский ▼             │
└────────────────────────┘

[MainButton: Сохранить]
```

**Field rules:**

| Field | Required | Source | Editable | Notes |
|---|---|---|---|---|
| Avatar | No | Telegram photo_url | Yes (upload) | Custom upload overrides Telegram |
| First name | No (UX-yes) | Telegram first_name | Yes | Can't be empty if order placed |
| Last name | No | Telegram last_name | Yes | Optional, useful for delivery |
| Phone | YES | **Telegram requestContact** | Re-confirm via Telegram | Verified by Telegram, no SMS |
| Email | No (opt-in) | Manual | Yes | For receipts |
| Birthday | No (opt-in) | Manual | Yes | Enables birthday rewards |
| Address | No | Last checkout | Yes | Saved for quick checkout |
| Language | No | Telegram language_code | Yes | UI language preference |

**Phone verification — Native Telegram only:**

**Dokonly does NOT use SMS verification.** Instead, we use Telegram's native `requestContact` API which gives us the phone number **already verified by Telegram** (the one user registered with).

Benefits:
- ✅ Already Telegram-verified (no extra SMS step)
- ✅ One tap, doesn't leave the Mini App
- ✅ Free (vs SMS providers like Eskiz)
- ✅ Lower fraud risk
- ✅ Better UX — no code copy-paste

**Flow when buyer first needs phone (at checkout or profile edit):**

```typescript
// apps/storefront/src/components/PhoneRequest.tsx
function PhoneRequestButton() {
  const handleShareContact = () => {
    // Telegram Mini App SDK 8.0+
    Telegram.WebApp.requestContact((shared, response) => {
      if (!shared) {
        showToast("Phone is required to place an order");
        return;
      }
      
      // response = {
      //   contact: {
      //     phone_number: "998901234567",
      //     first_name: "Malika",
      //     last_name: "Alimova",
      //     user_id: 12345678
      //   },
      //   auth_date: 1747345678,
      //   hash: "abc123..."  // for server-side verification
      // }
      
      // Send to backend for HMAC validation + save
      submitVerifiedPhone(response);
    });
  };
  
  return (
    <Button onClick={handleShareContact}>
      📱 Поделиться номером Telegram
    </Button>
  );
}
```

**Backend verification** (HMAC check ensures contact came from Telegram, not spoofed):

```python
# apps/api/dokonly_api/services/contact_verification.py
import hashlib
import hmac
import json
from datetime import datetime, timedelta

async def verify_telegram_contact(
    bot_token: str,
    contact_payload: dict,
) -> Contact:
    """Verify Telegram contact response signature.
    
    The hash field in the response is HMAC-SHA256 of the contact data
    using bot's token as key. This proves contact came from Telegram,
    not spoofed by malicious user.
    """
    received_hash = contact_payload.pop('hash', None)
    if not received_hash:
        raise ContactVerificationError("Missing hash")
    
    auth_date = contact_payload.get('auth_date', 0)
    if datetime.utcnow().timestamp() - auth_date > 86400:
        raise ContactVerificationError("Contact data expired (>24h old)")
    
    # Build data check string (sorted keys)
    data_check = '\n'.join(
        f"{k}={json.dumps(v) if isinstance(v, dict) else v}"
        for k, v in sorted(contact_payload.items())
    )
    
    # Compute secret key from bot token
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256,
    ).digest()
    
    # Compute expected hash
    computed_hash = hmac.new(
        secret_key,
        data_check.encode(),
        hashlib.sha256,
    ).hexdigest()
    
    if not hmac.compare_digest(computed_hash, received_hash):
        raise ContactVerificationError("Invalid signature — contact may be spoofed")
    
    return Contact(**contact_payload['contact'])


# Then save to customers:
async def submit_verified_phone(
    tenant: Tenant,
    customer_id: UUID,
    contact_payload: dict,
):
    contact = await verify_telegram_contact(tenant.bot_token, contact_payload)
    
    await db.update('customers', customer_id, {
        'phone': contact.phone_number,
        'phone_verified_via_telegram': True,
        'phone_verified_at': datetime.utcnow(),
    })
```

**Fallback for older Telegram clients** (without `requestContact` support, < 8.0):

If `Telegram.WebApp.requestContact` is undefined in user's client:
1. Show manual input field
2. Save as `phone_verified_via_telegram = FALSE`
3. Banner: "Update Telegram to verify automatically"
4. Order can still proceed (we trust the input but flag for merchant)

**Editing phone later:**

If buyer wants to change phone (e.g., they sold their previous SIM):
1. Tap "Изменить номер" button
2. Triggers `requestContact()` again
3. Telegram shows confirmation popup with current Telegram phone
4. Buyer can either confirm (saves new number) or cancel
5. If they want a different phone than their Telegram one → manual input + unverified flag

**Schema update needed in `customers` table:**

```sql
ALTER TABLE customers
  ADD COLUMN phone_verified_via_telegram BOOLEAN DEFAULT FALSE,
  ADD COLUMN phone_verified_at TIMESTAMPTZ;
-- Remove if exists: phone_verification_code, phone_verification_attempts
```

**Avatar upload:**
- Max 5MB
- Square crop (auto)
- Stored in R2 at `customers/<id>/avatar.webp`
- Old avatar deleted on update
- "Reset to Telegram avatar" link to revert

**Save behavior:**
- Telegram MainButton "Сохранить"
- Validates fields (especially phone format)
- On success: toast "Профиль обновлён", back to profile home
- Snapshot of profile data captured at order time stays unchanged in old orders

#### 9.7.3 My Orders (`/profile/orders`)

```
┌────────────────────────┐
│  ← Мои заказы          │
├────────────────────────┤
│  Tabs:                 │
│  [Активные (3)] [Все]  │
│  [Завершенные] [Возвраты]│
├────────────────────────┤
│  Active orders:        │
│  ┌──────────────────┐  │
│  │ #ORD-63ID8       │  │
│  │ Сегодня 14:32    │  │
│  │ ●●○○○ Confirmed  │  │
│  │ 2 товара · 850K  │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ #ORD-62XYZ       │  │
│  │ Вчера            │  │
│  │ ●●●○○ Shipping   │  │
│  │ 1 товар · 320K   │  │
│  └──────────────────┘  │
└────────────────────────┘
```

**Tabs:**
- **Активные** (created, confirmed, shipping) — top priority
- **Все** — chronological list, all statuses
- **Завершенные** (delivered, completed) — past purchases
- **Возвраты** — return requests

**Order card:**
- Order number (`#ORD-XXX`)
- Date (today / yesterday / specific date)
- Status with mini funnel (5 dots, current filled)
- Items count + first item thumbnail
- Total amount
- Tap → order detail (§9.7.4)

**Empty states:**
- "Активные": "Нет активных заказов" + "Посмотреть каталог" CTA
- "Завершенные": "Ваши покупки появятся здесь"
- "Возвраты": "Возвратов не было"

#### 9.7.4 Order Detail — Customer View (`/profile/orders/<id>`)

```
┌────────────────────────┐
│  ← Заказ #ORD-63ID8    │
├────────────────────────┤
│  ●○○○○○ Получен        │
│  ●●○○○ Подтверждён     │
│  ●●●○○ В доставке      │
│  ●●●●○ Доставлен       │
│  ●●●●● Завершён        │
├────────────────────────┤
│  Items:                │
│  ┌──────────────────┐  │
│  │ [img] Платье         │
│  │ Size M · 1 шт     │  │
│  │ 450 000 UZS      │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ [img] Сумка         │
│  │ Чёрная · 1 шт     │  │
│  │ 400 000 UZS      │  │
│  └──────────────────┘  │
├────────────────────────┤
│  💳 Оплата             │
│  Click ✓ Оплачено      │
│  850 000 UZS           │
├────────────────────────┤
│  🚚 Доставка           │
│  Курьер                │
│  ул. Шота Руставели 10  │
│  📅 15 мая             │
├────────────────────────┤
│  💬 Связаться с продавцом │
│  ❌ Отменить заказ     │ ← only if status='created'
│  🔄 Запросить возврат  │ ← only if completed & in return window
│  ⭐ Оценить заказ      │ ← if delivered
├────────────────────────┤
│  🎁 Лояльность         │
│  +85 points начислено  │
│  +1 500 cashback       │
└────────────────────────┘
```

**Sections:**

1. **Visual status timeline** — 5 dots connected by line, current highlighted, completed checkmarked
2. **Items list** — photo, name, variant, qty, price
3. **Payment info** — method, status, amount
4. **Delivery info** — method, address, ETA
5. **Actions** (context-dependent):
   - "Связаться с продавцом" — always available, opens Telegram DM with merchant
   - "Отменить заказ" — only if `status='created'`, opens confirmation modal
   - "Запросить возврат" — only if `status='completed'` AND within return window (default 14 days)
   - "Оценить заказ" — only if delivered, opens 5-star rating + text
6. **Loyalty earned** (if applicable) — points + cashback from this order

#### 9.7.5 Wishlist (`/profile/wishlist`)

```
┌────────────────────────┐
│  ← Избранное (5)       │
├────────────────────────┤
│  Sort: Recently added ▼│
├────────────────────────┤
│  Products grid (2col)  │
│  Same as catalog,      │
│  but only wishlisted   │
│                        │
│  ┌────────┐ ┌────────┐ │
│  │[↗][❤] │ │[↗][❤] │ │ ← share + remove icons
│  │ [img]  │ │ [img]  │ │
│  │ Name   │ │ Name   │ │
│  │ Price  │ │ Price  │ │
│  └────────┘ └────────┘ │
└────────────────────────┘
```

**Simple list (per user decision, no collections in v1):**
- 2-column grid like catalog
- Each card has TWO icons in top-right overlay:
  - **Share icon** (↗) — opens share sheet (see §9.3.5)
  - **Filled heart icon** (❤) — tap to remove from wishlist (with brief confirm)
- Tap card body → product detail
- Empty state: "Нажмите ❤ на товаре чтобы сохранить"

**Backend:** `wishlist_items` table (already added in schema §5.5).

**Sort options:**
- Recently added (default)
- Price: Low to High
- Price: High to Low

**Filters** (limited):
- Available only (out of stock items shown grayed out by default)
- On sale only

#### 9.7.6 Loyalty Page (`/profile/loyalty`) — Business+ tenant

```
┌────────────────────────┐
│  ← Программа лояльности│
├────────────────────────┤
│  ┌──────────────────┐  │
│  │ 🥉 BRONZE         │  │
│  │                   │  │
│  │ 350 points        │  │
│  │ 12 500 UZS cashback│ │
│  │                   │  │
│  │ ████████░░         │  │
│  │ 650 to Silver 🥈  │  │
│  └──────────────────┘  │
├────────────────────────┤
│  Как заработать:       │
│  • 1 балл за 100 UZS   │
│  • Бонус на день рождения│
│  • Приведи друга →     │
├────────────────────────┤
│  Tier benefits:        │
│  🥉 Bronze (you) — 1%  │
│     cashback           │
│  🥈 Silver — 2% + free  │
│     shipping           │
│  🥇 Gold — 3% + priority│
│     support            │
│  💎 Platinum — 5% + early│
│     access             │
├────────────────────────┤
│  Recent activity:      │
│  +85 pts · Заказ #63   │
│  +1500₸ cashback · ... │
│  -200 pts · Использовано│
│  ...                   │
├────────────────────────┤
│  ℹ  Бонусы действуют 12 │
│     месяцев             │
└────────────────────────┘
```

**Sections:**
1. **Tier card** — large, prominent. Shows current tier + progress to next.
2. **Earning methods** — clear list (also links to referral)
3. **Tier benefits table** — what each tier unlocks
4. **Recent activity** — transactions log (last 20)
5. **Footer info** — expiry policy

Points/cashback redemption happens at **checkout**, not here.

#### 9.7.7 Referral Program (`/profile/referral`)

**Only shown if `referral_programs.is_active = TRUE` for tenant.**

```
┌────────────────────────┐
│  ← Пригласить друга    │
├────────────────────────┤
│  🎁 Получите 15 000 UZS │
│  за каждого друга,     │
│  который сделает       │
│  первый заказ от 200K  │
├────────────────────────┤
│  Ваш реферальный код:  │
│  ┌─────────────────┐   │
│  │   MALIKA10       │   │
│  └─────────────────┘   │
│  [📋 Скопировать]      │
│                        │
│  Ваша ссылка:          │
│  ┌─────────────────┐   │
│  │ t.me/malika_shop │   │
│  │ _bot?start=ref... │  │
│  └─────────────────┘   │
│  [📋 Копировать]       │
│                        │
│  [📤 Поделиться]       │
├────────────────────────┤
│  📊 Ваша статистика    │
│                        │
│  Приглашено:    5      │
│  Совершили заказ: 3    │
│  Ожидают:        2     │
│  ─────────────────     │
│  💰 Заработано:        │
│     45 000 UZS         │
├────────────────────────┤
│  Приглашённые друзья:  │
│  ┌──────────────────┐  │
│  │ 👤 @aziz_k        │  │
│  │ ✓ Заказал · +15K │  │
│  │ 3 дня назад      │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ 👤 Anonymous      │  │
│  │ ⏳ Зарегистрирован│  │
│  │ 5 дней назад     │  │
│  └──────────────────┘  │
│  ...                   │
├────────────────────────┤
│  Условия программы ›   │
└────────────────────────┘
```

**Top "Get N for each friend" section:**
- Dynamic reward amount from `referral_programs.referrer_reward_value`
- Reward type label: cashback / points / discount coupon
- Min order amount from `referral_programs.min_order_amount`

**Referral code:**
- Auto-generated unique per customer (e.g., `MALIKA10` — name-based for memorability)
- Big, copyable
- "📋 Скопировать" button — copies + haptic + toast "Скопировано"

**Referral link:**
- Format: `t.me/<bot_username>?start=ref_<code>`
- When friend clicks → bot starts → customer record created with `referred_by_referral_id` set
- Auto-detect: who referred whom

**Share button (📤 Поделиться):**
- Telegram native share — `tg.openTelegramLink(`https://t.me/share/url?url=${link}&text=${message}`)`
- Pre-filled message:
  > "Привет! Покупаю в [Store Name] — рекомендую. Получи скидку по моей ссылке: [link]"
- Customizable message (Premium-only later)

**Stats section:**
- Invited: total people who clicked link & signed up
- Completed: how many placed first qualifying order
- Pending: signed up but haven't ordered yet
- Total earned: sum of all rewards credited

**Friends list:**
- Each row:
  - Avatar (or generic icon if private)
  - Telegram username (or "Anonymous" if user has private profile)
  - Status: ✓ Заказал (with reward), ⏳ Зарегистрирован, ❌ Истёк
  - Reward amount (if claimed)
  - Time ago

**Terms page** — explains rules, min order, when reward credited, expiration.

#### 9.7.8 Returns (`/profile/returns`)

List of all return requests by this customer.

```
┌────────────────────────┐
│  ← Возвраты            │
├────────────────────────┤
│  Active (1)            │
│  ┌──────────────────┐  │
│  │ #RET-12 from #ORD-63│
│  │ ⏳ Awaiting review │  │
│  │ 1 item · 450K     │  │
│  └──────────────────┘  │
├────────────────────────┤
│  History               │
│  ┌──────────────────┐  │
│  │ #RET-11 from #ORD-55│
│  │ ✓ Refunded · 320K │  │
│  └──────────────────┘  │
│  ...                   │
├────────────────────────┤
│  No active returns?    │
│  Найдите заказ для     │
│  возврата:             │
│  [Перейти к заказам]   │
└────────────────────────┘
```

#### 9.7.9 Returns Flow — Create New (`/profile/returns/new/<order_id>`)

URL changed from `/orders/<id>/return` to `/profile/returns/new/<order_id>` for consistency. Same 5-step flow as previously described:

**Step 1:** Select items to return (checkboxes on each order item)

**Step 2:** Reason
- Radio options:
  - Wrong size
  - Defective product
  - Not as described
  - Changed my mind
  - Other
- Free text for details

**Step 3:** Photos (optional but encouraged)
- Upload 1-5 photos showing issue
- Min 1 photo if reason is "defective"

**Step 4:** Refund vs Exchange
- "I want a refund"
- "I want to exchange" → select replacement item

**Step 5:** Review and submit
- Summary of return request
- "Submit return request" → creates return record

After submission:
- Return status='requested'
- Merchant gets Telegram notification
- Customer can track status
- Merchant approves/rejects in their admin

#### 9.7.10 About Store (`/profile/about`)

```
┌────────────────────────┐
│  [Cover image]         │
│  [Logo]                │
│  Malika Beauty Store    │
│  ⭐ 4.8 (243 reviews)  │
├────────────────────────┤
│  Описание              │
│  Premium beauty products│
│  imported from Korea... │
│  [Show more]            │
├────────────────────────┤
│  📞 Контакты           │
│  +998 90 123 45 67     │
│  @malika_a              │
│  📷 @malikabeauty       │
│  📍 ул. Амира Темура 5  │
├────────────────────────┤
│  🕐 Часы работы        │
│  Пн-Пт: 9:00-19:00     │
│  Сб: 10:00-17:00       │
│  Вс: выходной          │
├────────────────────────┤
│  🚚 Доставка           │
│  Самовывоз: бесплатно  │
│  Курьер: 25 000 UZS    │
│  Доставка по Узбекистану│
├────────────────────────┤
│  🔄 Политика возврата  │
│  14 дней с момента     │
│  получения              │
│  [Подробнее]           │
├────────────────────────┤
│  Powered by Dokonly    │ ← only if show_dokonly_branding=TRUE
└────────────────────────┘
```

**Sections:**
- Store hero (cover + logo + name + rating)
- Full description (markdown supported)
- Contact info (all merchant-provided)
- Working hours
- Delivery methods overview
- Return policy
- Footer with Dokonly attribution (Старт tier only)

#### 9.7.11 Privacy & Data (`/profile/privacy`)

```
┌────────────────────────┐
│  ← Приватность         │
├────────────────────────┤
│  Ваши данные           │
│                        │
│  Магазин хранит:       │
│  • Имя и контакты      │
│  • История заказов     │
│  • История просмотров  │
│  • Избранное           │
├────────────────────────┤
│  📥 Скачать мои данные │
│  Получите JSON со всей │
│  вашей информацией     │
│  [Запросить выгрузку]  │
├────────────────────────┤
│  ⚠ Удалить профиль    │
│  Удалит ваши данные    │
│  навсегда. Заказы      │
│  останутся в системе   │
│  (с обезличенной       │
│  информацией)          │
│  [Удалить профиль]     │
├────────────────────────┤
│  Политика магазина:    │
│  [Условия использования]│
│  [Политика конфиденциальности]│
└────────────────────────┘
```

**Actions:**

**Export data:**
- POST `/v1/storefront/profile/privacy/export`
- Creates async job
- Generates JSON with all customer data: profile, orders, returns, wishlist, loyalty, referral activity
- Email link sent (if email provided) OR download from in-app notification
- Available for 7 days then deleted

**Delete profile:**
- Confirmation modal: "Это действие нельзя отменить"
- Type "УДАЛИТЬ" to confirm (prevents accidental tap)
- On confirm:
  - `customer.is_deleted = TRUE`
  - PII anonymized: name → "Удалённый пользователь", phone → null, email → null, address → null
  - Orders kept (revenue history important for merchant) but with anonymized buyer info
  - Wishlist deleted
  - Loyalty balance forfeited
  - Profile redirects to entry, fresh customer created on next interaction

#### 9.7.12 Help & FAQ (`/profile/help`)

Reads from platform-managed `help_articles` table.

- List of articles grouped by category (Делать заказ, Доставка, Оплата, Возвраты, etc.)
- Search bar at top
- Tap article → full markdown view
- "Не нашли ответ? Свяжитесь с продавцом" CTA at bottom

#### 9.7.13 Language Switcher (`/profile/language`)

- Radio list of supported languages (uz, ru, en — depends on `tenant.supported_languages`)
- Tap to select → applies immediately, Mini App reloads with new language

### 9.8 AI Consultant (`/chat`) — Premium tier

Accessed via floating chat icon on storefront.

**Layout:** Standard chat UI

- Welcome message: "Привет! Я ваш AI-помощник. Спрашивайте о товарах!"
- Quick suggestion chips: "What's new?", "Show best sellers", "Sizes guide"
- Text input at bottom
- Send button
- Streaming responses (token by token via WebSocket)

**AI capabilities:**
- Search products by description
- Recommend based on criteria
- Answer about sizes, materials
- Compare products
- Provide brand info
- Cannot: process orders directly, give arbitrary discounts

### 9.9 Channel Subscription Gate

URL: shown instead of storefront if user not subscribed and tenant requires it

```
┌────────────────────────┐
│                        │
│        🔒              │
│                        │
│  Store Unavailable     │
│                        │
│  Subscribe to the      │
│  channel to access     │
│  the store             │
│                        │
│  [Join channel]        │ ← opens t.me/<channel>
│  [I subscribed]        │ ← re-check button
│                        │
└────────────────────────┘
```

After "I subscribed" tap:
- Re-call backend to verify subscription via `getChatMember` API
- If verified → load storefront
- If not → toast error "Still not subscribed"

### 9.10 Web Storefront — Премиум Only

**Premium tier exclusive feature.** Each Premium tenant gets a **public web storefront** accessible from any browser — not just Telegram. This opens Google search traffic, sharing via Instagram/WhatsApp/social media, and access from desktop computers where Telegram Mini App isn't the natural surface.

#### 9.10.1 Why Web Storefront

**Strategic value (for merchant):**
- ✅ **SEO traffic** — Google indexes the storefront, organic visitors come from search
- ✅ **Outside-Telegram sharing** — Instagram bio links, WhatsApp shares, business cards, billboards
- ✅ **Desktop buyers** — UZ growing middle class shops from laptops, especially for electronics, fashion catalog browsing
- ✅ **Brand legitimacy** — "real website" still signals professionalism in UZ market vs Telegram-only
- ✅ **Google Ads / Yandex Ads** — paid acquisition campaigns drive traffic to web URL
- ✅ **One-link marketing** — single URL works everywhere; Telegram links require Telegram app installed

**Strategic value (for Dokonly):**
- ✅ **Premium tier justifier** — Web Storefront is the killer feature that drives Бизнес → Премиум upgrade conversion
- ✅ **Network effects** — every Premium storefront promoted in Google rankings = backlink to dokonly.com infrastructure
- ✅ **Reduced lock-in fear** — merchants worry about "what if I leave Telegram?" — Web Storefront removes that fear

#### 9.10.2 URL Strategy (subdomain + custom domain)

**Default — Subdomain (every Premium tenant gets one):**

`<tenant_slug>.dokonly.com`

Example: `malika-beauty.dokonly.com`

- **Auto-provisioned** at the moment merchant upgrades to Премиум
- Uses `tenants.slug` (URL-safe slug from store name)
- Wildcard SSL via Cloudflare (no per-tenant setup)
- DNS handled by us (CNAME `*.dokonly.com` → ingress)
- Slug can be edited in Settings (with redirect from old slug)

**Upgrade — Custom domain (optional, free with Premium):**

`malika-beauty.com` (merchant's own domain)

- Merchant points their domain to us via CNAME or A record
- We auto-issue SSL via Let's Encrypt / Cloudflare for SaaS
- Subdomain still works (301 redirect from subdomain → custom domain for SEO consolidation)
- Settings → Web Storefront → "Connect custom domain"

**Path-based NOT supported.** `dokonly.com/malika-beauty` would hurt SEO (all storefronts share dokonly.com authority, no per-merchant ranking). Subdomains give each merchant their own SEO entity.

#### 9.10.3 Layout — Desktop-First, Different from Mini App

The web storefront is **not just a desktop version of the Telegram Mini App**. It's a separately optimized layout for browser context.

**Key differences vs Mini App:**

| Aspect | Telegram Mini App | Web Storefront |
|---|---|---|
| Layout direction | Mobile-first, narrow | Desktop-first, wide |
| Max width | 100% (Telegram WebView) | 1280px centered |
| Navigation | Bottom nav (4 tabs) | Top nav bar + footer |
| Primary CTA | Telegram MainButton | In-page button |
| Auth | `Telegram.WebApp.initData` (automatic) | Telegram Login Widget OR guest |
| Hero | Compact cover | Full-bleed cover banner |
| Product grid | 2 columns on mobile | 3-4 columns on desktop |
| Cart | Tab in bottom nav | Slide-out sheet or icon → page |
| Search | Inside Catalog tab | Sticky in header |
| Categories | Scrolling chips | Mega-menu dropdown or sidebar |
| Hover states | None | Full hover interactions |
| Footer | None | About, Contact, Social, Channel |

```
Desktop Layout (≥1024px):
┌────────────────────────────────────────────────────────┐
│  [LOGO]  Catalog ▾  About  [Search...]  [♥] [🛒] [👤] │ ← sticky top
├────────────────────────────────────────────────────────┤
│                                                        │
│  [Full-bleed hero cover — 1280x400]                    │
│                                                        │
│  Malika Beauty                                         │
│  Premium cosmetics in Tashkent                         │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Featured                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ Prod │ │ Prod │ │ Prod │ │ Prod │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
├────────────────────────────────────────────────────────┤
│  All products              [Sort ▾] [Filter ▾]         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │      │ │      │ │      │ │      │                   │
│  │      │ │      │ │      │ │      │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│  [...more products in grid...]                         │
├────────────────────────────────────────────────────────┤
│  About | Contact | Telegram | Instagram | Powered by   │
│                                            Dokonly     │
└────────────────────────────────────────────────────────┘
```

```
Tablet Layout (768-1023px):
- 3 columns product grid
- Hamburger menu replaces top nav links
- Cart icon stays in header
- Hero slightly shorter
```

```
Mobile Layout (<768px):
- Single column product list
- Hamburger menu
- Bottom-fixed CTA on product detail
- Falls back to similar UX as Mini App but in browser context
```

#### 9.10.4 Theme System (Reuses Storefront Theme)

The same theme system applies (5 layouts × 5 typography × 12 accent colors). But the **layout types map differently for web context:**

| Layout (Mini App) | Layout (Web) |
|---|---|
| **boutique** | Hero-heavy, magazine feel, 3-col products with whitespace |
| **catalog** | Dense grid, filters sidebar, sort options, 4-col |
| **lookbook** | Full-bleed photo collages, story-driven scroll, 2-col with large images |
| **marketplace** | Tight 4-col grid, fast browsing, minimal UI chrome |
| **bento** | Mixed card sizes, editorial pattern |

Typography bundles + accent colors carry over identically. Cover, logo, blocks configuration — all same `tenants` settings shared between Mini App and Web Storefront.

**This means:** Merchant configures storefront theme **once** in admin. It renders correctly in both Telegram Mini App AND Web Storefront.

#### 9.10.5 Authentication for Web Buyers

Two parallel auth flows:

**Option 1: Telegram Login Widget (recommended, similar UX to Mini App):**

```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="malika_beauty_bot"
  data-size="medium"
  data-auth-url="https://malika-beauty.dokonly.com/auth/telegram-callback"
  data-request-access="write"></script>
```

- Buyer taps "Sign in with Telegram"
- Telegram opens browser auth popup
- Returns to storefront with verified Telegram user data
- Backend creates/links `customer` record by `telegram_id`
- Profile, orders, wishlist all sync between Mini App + Web

**Option 2: Guest checkout (no auth required):**

- Browse without login
- At checkout: phone number + name only (no Telegram auth)
- Phone goes into `customers` table without `telegram_id`
- If buyer later opens Mini App with same phone → backend auto-links accounts

**Important:** Phone verification via `Telegram.WebApp.requestContact` is NOT available on plain web. For web checkout, phone is unverified (`phone_verified_via_telegram = FALSE`). Merchant sees this flag and can manually verify if order amount is high.

#### 9.10.6 Storefront Activation Flow

In merchant admin, Settings → Web Storefront (visible only on Премиум):

```
┌─────────────────────────────────────┐
│  Web Storefront                     │
├─────────────────────────────────────┤
│  Status: ✓ Active                   │
│                                     │
│  Your URL:                          │
│  malika-beauty.dokonly.com    [↗]  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Open in browser  ↗         │   │
│  └─────────────────────────────┘   │
│                                     │
│  Custom domain (optional)           │
│  ┌─────────────────────────────┐   │
│  │ malika-beauty.com           │   │
│  └─────────────────────────────┘   │
│  [Connect custom domain]            │
│                                     │
│  ─────────────────────────────      │
│                                     │
│  SEO settings                       │
│  • Meta title: [auto-generated]     │
│  • Meta description: [auto]         │
│  • Open Graph image: [from cover]   │
│  • Verify with Google: [code]       │
│                                     │
│  Indexing:                          │
│  ☑ Allow Google to index store      │
│  ☑ Include in dokonly.com directory │
│                                     │
└─────────────────────────────────────┘
```

**Activation:**
1. Premium subscription → backend auto-creates subdomain
2. Wildcard SSL applies instantly (Cloudflare)
3. Storefront accessible immediately
4. Optional: connect custom domain (DNS config flow)
5. Optional: configure SEO meta tags

**Custom domain flow:**
1. Merchant enters domain (e.g., `malika-beauty.com`)
2. Backend validates: not already used, not blacklisted
3. Backend shows DNS records to add:
   - CNAME: `www` → `malika-beauty.dokonly.com`
   - A record: `@` → our ingress IP
4. Merchant adds DNS via their registrar
5. Backend polls every 5min for DNS propagation
6. Once verified: SSL provisioned via Let's Encrypt
7. Both subdomain + custom domain serve same content (subdomain 301 → custom)

#### 9.10.7 SEO Features

**Auto-generated (without merchant input):**
- Meta title: `{Store name} — {Sphere}` (e.g., "Malika Beauty — Cosmetics in Tashkent")
- Meta description: First 160 chars of store description
- Open Graph image: Cover image (resized to 1200x630)
- Twitter card metadata
- Structured data (Schema.org Product, Organization, BreadcrumbList)
- Sitemap.xml auto-generated and submitted to Google
- robots.txt with sane defaults

**Configurable in admin:**
- Override meta title
- Override meta description
- Google Search Console verification code
- Yandex Webmaster verification code
- Block indexing (for private stores)

**Per-product SEO:**
- URL: `/products/<slug>` (slug auto-generated from name, editable)
- Meta title: Product name + store name
- Structured data: Product schema with price, availability, reviews
- Alt text on images (from product name; AI can enhance per language)

#### 9.10.8 Performance Architecture

**Static-first approach:**
- Product pages cached as static HTML via Cloudflare Workers
- Cache invalidated when product changes
- Server-side rendered for SEO (Next.js or similar)
- Images served via R2 + Cloudflare image resizing
- Sub-second TTFB for product pages

**Cost implications:**
- Wildcard SSL: free (Cloudflare)
- Custom domain SSL: free (Let's Encrypt or Cloudflare for SaaS)
- CDN bandwidth: ~$5-10/мес at moderate Premium tenant traffic
- Static hosting: included in Cloudflare Workers free tier up to 100K requests/day
- **Total additional cost per Premium merchant: ~$0.50-2/мес** (still 85%+ gross margin)

#### 9.10.9 Schema Additions

```sql
ALTER TABLE tenants
  ADD COLUMN web_storefront_enabled BOOLEAN DEFAULT FALSE,
  -- Auto-set TRUE when subscription tier = 'premium' AND active.
  -- Set FALSE on downgrade or cancellation.

  ADD COLUMN custom_domain TEXT UNIQUE,
  -- e.g., 'malika-beauty.com'. NULL if using subdomain only.

  ADD COLUMN custom_domain_verified BOOLEAN DEFAULT FALSE,
  -- TRUE after DNS verification + SSL issuance complete.

  ADD COLUMN custom_domain_verified_at TIMESTAMPTZ,

  ADD COLUMN seo_title_override TEXT,
  ADD COLUMN seo_description_override TEXT,
  ADD COLUMN google_search_console_code TEXT,
  ADD COLUMN yandex_webmaster_code TEXT,
  ADD COLUMN allow_search_engine_indexing BOOLEAN DEFAULT TRUE,
  ADD COLUMN include_in_dokonly_directory BOOLEAN DEFAULT TRUE;
  -- If TRUE, store listed on dokonly.com/explore (helps SEO + discovery)

CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
```

#### 9.10.10 API Endpoints

```
# Web Storefront management (merchant admin)
GET    /v1/merchant/web-storefront           # Status, URL, settings
POST   /v1/merchant/web-storefront/enable    # Auto-on for Premium (idempotent)
POST   /v1/merchant/web-storefront/custom-domain    # Submit custom domain
DELETE /v1/merchant/web-storefront/custom-domain    # Remove custom domain
POST   /v1/merchant/web-storefront/verify-dns       # Manual re-check DNS propagation
PATCH  /v1/merchant/web-storefront/seo              # Update SEO settings

# Public storefront serving (rendered by Next.js / Cloudflare Workers)
GET    https://<slug>.dokonly.com/                  # Storefront home
GET    https://<slug>.dokonly.com/catalog           # Catalog page
GET    https://<slug>.dokonly.com/products/<slug>   # Product detail
GET    https://<slug>.dokonly.com/cart              # Cart page
GET    https://<slug>.dokonly.com/checkout          # Checkout flow
GET    https://<slug>.dokonly.com/sitemap.xml       # SEO sitemap
GET    https://<slug>.dokonly.com/robots.txt        # SEO robots
GET    https://<slug>.dokonly.com/api/products      # Product API for hydration
```

#### 9.10.11 Cross-Surface Customer Identity

A customer who exists in both Telegram Mini App and Web Storefront is the **same customer record**. Identity unification:

1. Buyer signs in via Telegram Login Widget on web → `telegram_id` resolves existing `customers` record
2. Buyer enters phone (verified via Mini App earlier) at web checkout → backend matches by phone
3. Buyer authenticates fresh on web → new customer record created → later linkage when buyer enters phone or signs in via Telegram

**No duplicate orders/loyalty:** Wishlist, orders, loyalty points all unified per-customer regardless of surface.

#### 9.10.12 What's NOT in v1 Web Storefront

To stay scope-realistic:
- ❌ Site builder / no-code page editor (uses theme system + cover/logo only)
- ❌ Custom JS / CSS injection
- ❌ Email signup forms (use Telegram channel link)
- ❌ Blog / content pages (use linked Telegram channel)
- ❌ Multi-language content management (theme system defines display language)
- ❌ Custom checkout flows (uses same checkout as Mini App)
- ❌ Subdomain vanity (e.g., `shop.malika-beauty.com`) — single host per tenant only

These may come in v1.5+ if Premium merchants request.

---

## 10. Cross-cutting Workflows

Detailed step-by-step flows for the most important business processes.

### 10.1 Onboarding Lifecycle (Signup to First Order)

**Step 1: Discovery**
- User finds dokonly.uz landing
- Clicks "Start free trial"
- Redirected to `t.me/DokonlyBot?start=signup`

**Step 2: Master Bot Greeting**
- DokonlyBot sends welcome with "Начать настройку" button (Mini App)

**Step 3: Onboarding Mini App**
- User taps button → opens onboarding Mini App
- **6-step wizard** (was 5, added Visual Identity step — see Section 9.0):
  1. Country
  2. Business sphere
  3. Legal status (UZ-specific)
  4. Store name + currency + bot name
  5. **Visual Identity** (typography bundle + accent color + logo + layout if Business+)
  6. Telegram channel (optional)
- At step 4 (store name), backend:
  - Creates `users` record if new
  - Creates `tenants` record (without bot_token yet)
  - Creates trial `subscriptions` (14 days, no card)
- At step 5, theme defaults pre-selected based on sphere (e.g., Fashion → Editorial+Rose+Boutique). User can change.
- Trial users get **full Business+ tier features during 14 days**, including layout choice and theme presets.

**Step 4: Bot Creation**
- "Create your bot" screen with @BotFather guide
- Visual step-by-step instructions
- User pastes token → backend validates via `getMe`
- If valid:
  - Encrypt token, store
  - Generate `bot_token_hash`
  - Set webhook
  - Send welcome message
  - Auto-check `getMe.supports_inline_queries` → set `bot_inline_mode_enabled` flag
- If invalid: error with troubleshooting

**Step 4.5: Enable Inline Mode (for sharing — recommended)**
- Shown after token validation (skippable)
- "Let your customers share products to friends"
- If `supports_inline_queries=false`:
  - Visual guide: open @BotFather → /mybots → choose bot → Bot Settings → Inline Mode → Turn on
  - Suggested placeholder text: "Search products..."
  - "Check again" button → re-runs `getMe`
- If enabled: ✅ "Inline sharing enabled"
- "Skip for now" → can enable later in Settings → Bot Identity

**Step 5: First Login & Empty Dashboard**
- Redirected to admin Mini App in their bot
- Onboarding checklist:
  - ☐ Add store details
  - ☐ Add first product
  - ☐ Configure payment methods
  - ☐ Add delivery method
  - ☐ Enable inline sharing (if not done in step 4.5)
  - ☐ Test your store

**Step 6: Add Products**
- Manual or AI import (available during trial)

**Step 7: Configure Store**
- Payment methods, delivery methods, channel binding

**Step 8: Share Store**
- "Your store is ready! Share it"
- QR code with bot link
- Social media post template
- "Test your store" → opens storefront

**Step 9: First Order**
- Telegram notification + email + dashboard
- Celebration toast

**Step 10: Trial Conversion**
- Day 7: "How's it going?"
- Day 10: "4 days left"
- Day 13: "Trial ends tomorrow"
- Day 14: Read-only mode (3 days grace)
- Day 17: Subscription cancelled (data retained 90 days)

### 10.2 Order Lifecycle (Cart to Review)

**Stage 1: Browse** — products viewed, cart filled, persisted in `carts` table

**Stage 2: Cart Abandonment Detection**
- If not converted in 30 min: `carts.abandoned=TRUE`
- 1 hour: send recovery message via bot (if Business+)
- 24 hours: send another (max 2 recovery messages)

**Stage 3: Checkout Started** — `checkout_started` event

**Stage 4: Order Created**
- `POST /v1/storefront/orders`
- Backend: status='created', payment_status='pending'
- Generates order_number, snapshots items
- Creates payment record
- For redirect providers: returns payment URL
- For manual: returns instructions
- Telegram notification to merchant
- Real-time WebSocket push

**Stage 5: Payment Confirmation**
- Click/Payme: webhook → `payment_status='paid'`
- Stars: `successful_payment` event → paid
- Manual: customer uploads screenshot → 'pending_verification' → merchant confirms
- COD: stays pending until delivery

**Stage 6: Confirmed (status='confirmed')**
- Merchant confirms in admin
- Premium+: picking checklist auto-created
- Notification: "Your order is being prepared"

**Stage 7: Shipping (status='shipping')**
- Notification: "Your order is on the way"
- ETA shown if configured

**Stage 8: Delivered (status='delivered')**
- Notification: "Order delivered. How was it?"
- Review request sent

**Stage 9: Completed (status='completed')**
- After 7 days from delivered OR customer leaves review
- Loyalty points awarded
- Cashback credited
- Referral reward issued if applicable

**Stage 10: Review**
- Reminder at delivery + 1 day
- Customer rates 1-5 + text
- Review visible on product page

### 10.3 Payment Flow per Provider

#### Manual Card Transfer
1. Order created with pending payment
2. Buyer sees card number + holder + bank
3. Buyer transfers via own banking app
4. Buyer uploads screenshot
5. Backend stores in `orders.payment_proof_url`
6. Telegram notification to merchant
7. Merchant reviews screenshot
8. Confirms or rejects payment

#### Click Integration
1. Order created
2. Backend calls Click API `prepare` endpoint
3. Returns payment URL
4. Frontend opens in WebView
5. Customer pays
6. Click sends `prepare` callback
7. 3DS if required
8. Click sends `complete` callback
9. Order marked paid

#### Payme Integration
1. Order created
2. Backend constructs Payme URL (merchant_id + amount + order_id)
3. Frontend opens in WebView
4. Customer pays
5. Payme webhooks: CreateTransaction → PerformTransaction → CheckTransaction
6. Order marked paid

#### Uzum Pay
1. Order created
2. Backend creates payment session via Uzum API
3. Frontend redirects to Uzum payment page (in WebView)
4. Customer pays
5. Webhook to backend → order marked paid

#### UzCard/Humo/Visa Direct (requires acquiring bank)
1. Order created
2. Frontend collects card via PCI-compliant iframe
3. Card details NEVER touch our servers
4. Bank tokenizes + charges
5. Webhook to backend
6. Order marked paid

#### Alif/Uzum Nasiya Installments (Premium)
1. Order created
2. Frontend redirects to Alif/Uzum form
3. Customer enters passport details
4. Provider approves/denies
5. Customer signs digitally if approved
6. Customer gets goods now, pays monthly to Alif/Uzum
7. Merchant gets full amount upfront (minus commission)

#### Cash on Delivery
1. Order created, payment_status='pending', method='cod'
2. No payment integration
3. Merchant collects cash at delivery
4. Merchant manually marks paid

### 10.4 Returns Workflow

**Step 1: Request**
- Customer on completed order
- Within return window (default 14 days)
- Taps "Request return" → 5-step form
- Submits → return.status='requested'
- Merchant notified

**Step 2: Merchant Review**
- Sees in Orders → Returns tab
- Reviews reason, photos, items, refund amount
- Decides: Approve / Reject / Negotiate via bot

**Step 3: Customer Returns Item**
- Ships back (or merchant arranges pickup)
- Merchant receives → status='received'

**Step 4: Resolution**
- Refund: merchant initiates via original payment method
- Exchange: ships replacement, linked exchange_items

**Step 5: Closure**
- status='completed', customer notified, analytics tracked

### 10.5 Subscription Lifecycle

#### Trial Stage (Days 0-14)
- Auto-created on signup
- Full Premium features access
- No payment method required
- Email reminders at days 7, 10, 13

#### Conversion Decision Point (Day 14)

**Option A: User upgrades**
- Selects plan, enters payment method
- Backend creates active subscription
- First invoice generated and paid

**Option B: User doesn't act**
- Day 14: status='past_due', 3-day grace period
- Read-only mode for merchant
- Storefront still works (don't punish customers)
- Final reminder sent

**Option C: Grace expires (Day 17)**
- status='expired'
- Storefront accessible for 30 days with limitations
- 90 days total: data archived
- Can reactivate by upgrading

#### Active Stage
- Auto-renewal monthly
- 3 days before renewal: notification
- On renewal day: charge attempt
- Success: invoice generated, continues
- Failure: 'past_due', 3 retries over 7 days

#### Plan Changes

**Upgrade mid-cycle:**
- Prorated charge
- Charge difference immediately
- New plan effective immediately

**Downgrade mid-cycle:**
- No immediate change
- New plan effective next renewal
- Warn if current usage exceeds new limits
- Force acknowledgment of data loss

#### Cancellation
1. User clicks "Cancel"
2. Retention modal:
   - "Why?" survey
   - Discount offer (% off next 3 months)
   - Pause subscription (1-3 months)
3. If proceeds:
   - status='canceled' (active until period end)
   - No more renewals
   - Data retained 90 days
   - Can reactivate

### 10.5.3 Trial Conversion Discount (50% off first month)

**Replaces previous Stars-based extension.** When trial ends, instead of extending via micro-payments, offer **50% off first month** as conversion incentive. This is more sales-driven (real revenue) vs extension (just delays decision).

#### Discount Tiers

| Trigger | Discount | Plan offered | Use case |
|---|---|---|---|
| Day 12 of trial (2 days remaining) | **50% off** first month | Recommended plan (based on usage) | Pre-expiry urgency |
| Trial expired (within 7 days) | **30% off** first month | All plans | Win-back |
| Cancelled subscription (within 30 days) | **20% off** for 3 months | Previous plan | Reactivation |

**Discounts apply to merchant's subscription** to Dokonly, NOT to buyer purchases.

#### Logic

```python
# apps/api/dokonly_api/services/discounts.py
DISCOUNT_CAMPAIGNS = {
    'trial_ending': {
        'discount_percent': 50,
        'duration_months': 1,
        'trigger': 'trial_ends_in_2_days',
        'plans': ['start', 'business', 'premium'],  # any plan
        'usable_once': True,
    },
    'trial_expired_winback': {
        'discount_percent': 30,
        'duration_months': 1,
        'trigger': 'trial_expired_7d_ago',
        'plans': ['start', 'business', 'premium'],
        'usable_once': True,
    },
    'cancellation_winback': {
        'discount_percent': 20,
        'duration_months': 3,
        'trigger': 'cancelled_30d_ago',
        'plans': ['previous_plan'],
        'usable_once': True,
    },
}
```

#### Smart Plan Recommendation

For "trial_ending" campaign, recommend specific plan based on trial usage:

```python
async def recommend_plan_for_trial(tenant: Tenant) -> str:
    usage = await get_trial_usage(tenant.id)
    
    # If they used Premium-only features (AI consultant, multi-store) → Premium
    if usage.used_ai_consultant or usage.created_second_store:
        return 'premium'
    
    # If they used Business+ features → Business
    if (usage.products_count > 250 or
        usage.team_members_invited > 0 or
        usage.mailings_sent > 0 or
        usage.layout_customized):
        return 'business'
    
    # Otherwise → Старт
    return 'start'
```

#### UI Flow

**Dashboard Subscription Card (Trial ending, day 12+):**

```
┌──────────────────────────────┐
│  Subscription Status         │
│                  [Free Trial]│
│                              │
│  Time Remaining              │
│                  2 Days Left │
│  ▓▓▓▓▓▓▓▓▓░ (88%)            │
│  Expires on 28-05-2026       │
│                              │
│  🔥 Limited offer            │
│  Subscribe Business with     │
│  50% off first month         │
│  ~~499 000~~ 249 500 UZS     │
│                              │
│  [Claim 50% offer →]         │
│  [Compare plans]             │
└──────────────────────────────┘
```

**State variations:**

| Trial state | Card contents |
|---|---|
| Day 0-10 | Normal trial card (no urgency) |
| Day 11-12 | Pre-expiry warning, soft upgrade CTA |
| Day 13-14 | "50% off offer" prominent, claim button |
| Expired 1-7 days | "Win-back: 30% off if you subscribe in next 7 days" |
| Expired 8-30 days | Normal upgrade flow (no special discount) |
| Cancelled (within 30d) | "20% off for 3 months" reactivation offer |

#### Discount Application

```python
# When merchant clicks "Claim offer"
async def apply_trial_conversion_discount(
    tenant: Tenant,
    user: User,
    plan: str,
    campaign_id: str,
):
    campaign = DISCOUNT_CAMPAIGNS[campaign_id]
    
    # Validate eligibility
    if not is_eligible_for_campaign(tenant, campaign):
        raise IneligibleError("Offer no longer available")
    
    # Calculate discount
    base_price = PRICING[plan]['monthly_uzs']
    discount_amount = base_price * (campaign['discount_percent'] / 100)
    discounted_price = base_price - discount_amount
    
    # Create subscription with discount applied
    subscription = await create_subscription(
        tenant_id=tenant.id,
        plan=plan,
        discount_percent=campaign['discount_percent'],
        discount_duration_months=campaign['duration_months'],
        campaign_id=campaign_id,
    )
    
    # Generate payment link (Click/Payme/Uzum/Card)
    invoice_url = await create_subscription_invoice(
        tenant_id=tenant.id,
        amount_uzs=discounted_price,
        plan=plan,
        provider='auto',  # picks best available
    )
    
    # Record discount usage (prevent re-use)
    await db.insert('subscription_discounts', {
        'tenant_id': tenant.id,
        'campaign_id': campaign_id,
        'discount_percent': campaign['discount_percent'],
        'duration_months': campaign['duration_months'],
        'applied_at': datetime.utcnow(),
        'subscription_id': subscription.id,
    })
    
    return invoice_url
```

#### Database

Replace the `trial_extensions` table (from earlier Stars version) with:

```sql
-- Subscription discount campaigns (tracks usage to prevent re-application)
CREATE TABLE subscription_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  -- 'trial_ending' | 'trial_expired_winback' | 'cancellation_winback' | 'streak_reward' | 'manual'
  discount_percent INTEGER NOT NULL,
  duration_months INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  subscription_id UUID,                        -- which subscription it was applied to
  metadata JSONB DEFAULT '{}',
  UNIQUE(tenant_id, campaign_id)               -- one use per campaign per tenant
);

CREATE INDEX idx_discounts_tenant ON subscription_discounts(tenant_id, applied_at DESC);
```

#### Notifications

**Trial ending (day 12):**
- Telegram message from bot: "🔥 Your trial ends in 2 days. Subscribe with 50% off first month — limited offer."
- Push to admin home Subscription Card (state changes to "Limited offer")
- Email if merchant provided one

**Win-back (trial expired 1 day ago):**
- Telegram message: "Don't lose your store data! Reactivate with 30% off first month."
- After 7 days no action → soft delete data (90-day retention)

**Cancellation win-back:**
- Sent 30 days after cancellation
- "We miss you! Come back with 20% off for 3 months."

#### Analytics Metrics

Tracked via `subscription_discounts` table:
- Trial-to-paid conversion rate (with discount vs without)
- Win-back conversion rate
- Most effective campaign
- ARPU impact of discounts (lower per-customer revenue but higher conversion volume)

These metrics inform whether discounts increase total revenue or just cannibalize full-price subscribers.

### 10.5.5 Migration Tours ("Welcome to Business/Premium")

When a merchant upgrades their subscription, they need to **discover what's newly unlocked**. Migration tours show them what's new without overwhelming.

#### Tour Triggers

Tours are triggered automatically on successful plan upgrade:

| From → To | Tour |
|---|---|
| Trial / Старт → Бизнес | "Welcome to Business" |
| Trial / Старт / Бизнес → Премиум | "Welcome to Premium" |
| Downgrades | NO tour — show "What you lost" reminder instead (see Trial Ending) |

**Trigger flow:**
1. Successful payment processed → `subscriptions.status` updated
2. ARQ worker `tours.create_migration_tour` enqueued
3. Worker creates `migration_tours_state` record (status='pending')
4. Bot sends Telegram notification: "🎉 Welcome to Business plan! [Open dashboard]"
5. Next time merchant opens admin (web OR Mini App) → tour modal appears
6. Tour persists across devices — start on mobile, continue on web

#### Welcome to Business Tour (10 features)

**Format:** Modal sequence with progress dots, skip option, can dismiss + resume.

**Steps:**

1. **Storefront layouts unlocked**
   - "You can now choose from 5 layouts to make your store unique"
   - Preview of 5 layout cards
   - CTA: "Pick a layout →" (opens Settings → Storefront Theme → Layout)
   - Skip: "Later"

2. **Storefront blocks configurable**
   - "Customize what appears on your storefront"
   - Mini demo: toggle stories on/off, change category style
   - CTA: "Customize blocks →"

3. **AI features unlocked**
   - "AI helps you sell more"
   - List: AI photo import · AI descriptions · AI consultant · AI mailing
   - CTA: "Try AI photo import →" (opens catalog import flow)

4. **Team collaboration**
   - "Invite up to 3 team members"
   - Diagram of roles (Owner / Admin / Manager / Viewer)
   - CTA: "Invite teammate →"

5. **CRM unlocked**
   - "See every customer's full history"
   - Preview screenshot of customer detail page
   - CTA: "View customers →"

6. **Mass mailings unlocked**
   - "Reach your customers with targeted campaigns"
   - "30 mailings per month"
   - CTA: "Create first mailing →"

7. **Stories & banners**
   - "Add Instagram-style stories to your storefront"
   - Preview demo
   - CTA: "Create story →"

8. **Loyalty + Referral programs**
   - "Reward repeat customers"
   - "Earn-and-burn points, cashback, referral codes"
   - CTA: "Set up loyalty →"

9. **Channel crossposting**
   - "Auto-post new products to your Telegram channel"
   - CTA: "Connect channel →"

10. **Final summary**
    - "🎉 You're all set!"
    - Recap of all features unlocked
    - "Got it" → closes tour, marks `status='completed'`
    - "Show again later" → keeps as `dismissed` (re-trigger via Help menu)

#### Welcome to Premium Tour (8 features — Premium-only deltas over Business)

**Steps:**

1. **Multi-store support**
   - "Run multiple stores from one account"
   - "Each store has its own catalog, customers, theme"
   - CTA: "Create second store →"

2. **Unlimited products & admins**
   - "No more limits"
   - Quick stats: Products ∞ · Admins ∞ · Categories ∞ · Mailings ∞

3. **AI consultant for buyers**
   - "Your buyers can chat with AI 24/7"
   - Demo of chat conversation
   - "Conversion lift: typically 15-30%"
   - CTA: "Enable AI consultant →"

4. **AI photo processing**
   - "Auto-remove backgrounds, watermark photos"
   - Before/after preview
   - CTA: "Process existing photos →"

5. **AI product recommendations**
   - "'You might also like' on every product page"
   - Demo of recommendation block
   - CTA: "Enable recommendations →"

6. **A/B testing storefront themes**
   - "Test which theme converts better"
   - Diagram: 50% visitors see theme A, 50% see B
   - CTA: "Run first test →"

7. **Cohort retention analytics**
   - "See which customer cohorts come back"
   - Preview of cohort retention heatmap
   - CTA: "View cohorts →"

8. **Priority support + Personal manager**
   - "Direct access to your account manager"
   - 1-hour SLA on tickets
   - "Your manager: [Avatar + Name]"
   - CTA: "Say hi to [Name] →" (opens Telegram chat with manager)

#### UI Pattern — Mobile (Mini App)

```
┌────────────────────────────┐
│  ✕ Skip tour              │ ← top right
├────────────────────────────┤
│  [Step icon 🎨]            │
│                            │
│  Step 1 of 10              │
│                            │
│  ## Storefront layouts     │
│     unlocked               │
│                            │
│  You can now choose from   │
│  5 layouts to make your    │
│  store unique.             │
│                            │
│  [Layout preview cards]    │
│                            │
│  ⊙ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪    │ ← progress dots
│                            │
│  [Pick a layout]   [Next]  │ ← MainButton + skip
└────────────────────────────┘
```

- Full-screen modal (no nav bars during tour)
- Telegram MainButton: "Next" → advances step
- Tap "Pick a layout" → opens feature page, marks step as completed
- Tap "Skip tour" → confirmation: "Are you sure? You can replay from Help menu"
- BackButton (Telegram native) → previous step

#### UI Pattern — Web (Dashboard)

```
┌──────────────────────────────────────┐
│  ░░ Backdrop overlay ░░               │
│  ┌────────────────────────────────┐  │
│  │  ✕                              │  │
│  │  [Step icon 🎨]   Step 1 of 10  │  │
│  │                                 │  │
│  │  ## Storefront layouts unlocked │  │
│  │                                 │  │
│  │  You can now choose from 5      │  │
│  │  layouts to make your store     │  │
│  │  unique.                        │  │
│  │                                 │  │
│  │  [Layout preview screenshots]   │  │
│  │                                 │  │
│  │  ⊙ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪ ⚪         │  │
│  │                                 │  │
│  │  [Skip] [Back]  [Pick a layout →]│  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- Centered modal (max-width 560px)
- Backdrop blur, click outside doesn't dismiss (must use Skip)
- Keyboard shortcuts: `→` next, `←` back, `Esc` skip confirmation

#### State Management

```sql
CREATE TABLE migration_tours_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tour_id TEXT NOT NULL,                       -- 'welcome_business', 'welcome_premium'

  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending', 'in_progress', 'completed', 'skipped', 'dismissed'
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  steps_completed INTEGER[] DEFAULT '{}',      -- which CTAs were tapped

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,                    -- updated each time tour resumed

  triggered_by_event TEXT NOT NULL,            -- 'subscription_upgraded'
  triggered_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, tenant_id, tour_id)
);

CREATE INDEX idx_tours_pending_per_user ON migration_tours_state(user_id, status)
  WHERE status IN ('pending', 'in_progress');
```

**On admin login (mobile or web):**

```python
@router.middleware
async def check_pending_tours(request, call_next):
    if user.is_authenticated and request.url.path.startswith('/admin'):
        pending = await db.fetch_one(
            "SELECT * FROM migration_tours_state "
            "WHERE user_id = $1 AND tenant_id = $2 "
            "AND status IN ('pending', 'in_progress') "
            "ORDER BY triggered_at ASC LIMIT 1",
            user.id, tenant.id
        )
        if pending:
            response = await call_next(request)
            response.headers['X-Pending-Tour'] = pending.tour_id
            return response
    return await call_next(request)
```

Frontend reads header on response → triggers tour modal.

#### Re-trigger via Help Menu

In **Settings → Help → "Show feature tour"** (or Profile → More → "Tour again"):

- Lists all tours available for current plan
- "Welcome to Business" — Completed ✓
- "Welcome to Premium" — Available
- "Storefront customization" — Available (mini-tour, see below)
- Tap any → resets `status='pending'`, opens tour

#### Mini Tours for Feature Discovery (Optional in v1)

Smaller tours triggered on **first use of a feature**, not on plan change:

| Feature | Trigger | Steps |
|---|---|---|
| Storefront Theme editor | First open | 3 steps |
| Mass Mailing creator | First open | 4 steps |
| AI Photo Import | First open | 5 steps |
| Loyalty Program setup | First open | 4 steps |
| Customer CRM | First open | 3 steps |

Same pattern as migration tours but shorter. **Decision: included in v1 scope** — strongly improves feature adoption.

State tracked via `mini_tours_seen` JSONB on `users` table:
```json
{"storefront_theme": "2026-05-15T10:23:00Z", "mass_mailing": "2026-05-15T14:11:00Z"}
```

#### Trial Ending Counter-Tour ("What You'll Lose")

Reverse of upgrade tour — shown 2 days before trial expires:

```
"Your trial ends Friday. Pick a plan to keep these features:"

Features actively used during trial:
✓ AI photo import (you used 3 times)
✓ Custom layout (you have 'Lookbook')
✓ Stories on storefront (3 active)
✓ Team member invited

If you don't upgrade, you'll be moved to Старт ($16/mo) and lose all of the above.

[Compare plans] [Continue trial reminder]
```

**Trigger:** ARQ scheduled job, day 12 of trial.

**Smart:** Only shows features merchant actually used. If they didn't try AI, doesn't mention AI loss (already proven they don't value it).

This is **retention play** — much more effective than generic "Trial ending soon" notification.

#### API Endpoints

```
GET    /v1/merchant/tours/pending        # Current user's pending tours
GET    /v1/merchant/tours/{tour_id}      # Tour content (steps, copy)
POST   /v1/merchant/tours/{tour_id}/start
POST   /v1/merchant/tours/{tour_id}/step/{n}/complete
POST   /v1/merchant/tours/{tour_id}/skip
POST   /v1/merchant/tours/{tour_id}/dismiss      # Hide, but can re-trigger
GET    /v1/merchant/tours/available      # All tours available for current plan
POST   /v1/merchant/tours/{tour_id}/restart      # Manual re-trigger from Help menu
```

### 10.6 Mass Mailing Flow

**Step 1: Composition**
- Marketing → Mailings → New
- Select segment (live count)
- Compose content (manual or AI-generated)
- Schedule (now or later)

**Step 2: Validation**
- Backend checks plan limits
- Validates segment not empty
- Validates content (no Telegram-forbidden patterns)

**Step 3: Scheduling**
- "Send now": queue immediately
- Scheduled: stored with `scheduled_at`, ARQ worker picks up at time

**Step 4: Sending (ARQ worker)**
- Fetches recipients matching segment
- For each customer:
  - Sends via merchant's bot (sendMessage or sendPhoto)
  - Inline keyboard if CTA
  - Rate-limited (30 msg/sec)
  - Records `mailing_recipients` entry
- Updates status='sending' → 'sent'

**Step 5: Tracking**
- Click tracking via UTM
- Orders within 48h: attributed
- Stats updated real-time

### 10.7 AI Photo Import Flow

**Step 1: Upload**
- Merchant uploads 10-50 photos
- Each uploaded to R2 via signed URL
- Frontend gets URLs

**Step 2: Processing Queue**
- POST /v1/merchant/ai-imports/photos
- Backend creates `ai_imports` (status='pending')
- Triggers ARQ worker

**Step 3: AI Extraction (per photo)**
- Worker loops through photos
- Sends to OpenAI `gpt-5.4-mini` with vision + JSON mode
- Prompt: extract name, description, price, category, attributes
- Receives structured output, validates via Pydantic
- Tracks cost in `ai_usage_logs`
- If photo has caption: included in prompt

**Step 4: Review**
- Frontend polls or WebSocket update on completion
- Shows review screen with editable cards
- Merchant adjusts
- "Create N products" → bulk insert

**Step 5: Post-Processing (background)**
- Premium: AI photo enhancement (background removal, auto-crop) runs async
- Updates `products.ai_processed_images`

### 10.8 Channel Subscription Gate Flow

#### Setup (Merchant Side)
1. Settings → Channel Integration
2. Enter channel username
3. Backend: "Add bot as admin"
4. Merchant adds bot as admin
5. Clicks "Verify"
6. Backend calls `getChatAdministrators` via bot API
7. Checks if our bot is admin
8. If yes: `channel_bot_admin_verified=TRUE`
9. Toggle "Require subscription" now available

#### Enforcement (Buyer Side)
1. Buyer opens bot, taps "Open Store"
2. Backend checks `channel_subscription_required`
3. If true: call `getChatMember(channel, buyer_telegram_id)`
4. If status in ['creator', 'administrator', 'member']: allow
5. Otherwise: show gate screen
6. Gate has "Join channel" → opens t.me/<channel>
7. After joining, "I subscribed" → re-check
8. If verified: load storefront

---

## 11. Real-time & Notifications

Multiple notification channels for different audiences and use cases.

### 11.1 WebSocket Architecture

**Use cases:**
- Live order updates on merchant dashboards
- Multi-tab/multi-device sync for merchant team
- AI streaming responses for buyer consultant
- Real-time notifications

**Implementation:**

```python
class WebSocketManager:
    def __init__(self):
        # Connection pools by audience
        self.merchant_connections: dict[str, set[WebSocket]] = {}
        self.platform_connections: set[WebSocket] = set()
        self.buyer_connections: dict[str, set[WebSocket]] = {}
    
    async def broadcast_to_tenant(self, tenant_id: str, event: dict):
        connections = self.merchant_connections.get(tenant_id, set())
        for ws in list(connections):
            try:
                await ws.send_json(event)
            except WebSocketDisconnect:
                connections.discard(ws)
```

**Event types:**

Merchant events:
- `order.created`
- `order.status_changed`
- `order.payment_received`
- `return.requested`
- `low_stock.alert`

Buyer events:
- `order.status_updated`
- `ai_chat.token` (for streaming)
- `ai_chat.complete`

Platform events:
- `tenant.signed_up`
- `tenant.upgraded`
- `ai_cost.alert`

**Frontend connection:**

```typescript
export function useWebSocket() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const ws = new WebSocket(`wss://api.dokonly.com/ws?token=${token}`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'order.created':
          queryClient.invalidateQueries(['orders']);
          toast.success('New order received!');
          break;
        case 'order.status_changed':
          queryClient.invalidateQueries(['orders', message.data.order_id]);
          break;
      }
    };
    
    return () => ws.close();
  }, [token]);
}
```

### 11.2 Telegram Notifications (to Merchants)

Sent via merchant's own bot to merchant's Telegram account.

| Event | When | Recipient |
|---|---|---|
| New order | Order created | Owner + admins (per preference) |
| Payment received | Manual verified or Click/Payme confirmed | Owner + admins |
| Order cancelled | Customer cancels | Owner |
| Return requested | Customer requests return | Owner + admins |
| Low stock | Product stock < threshold | Owner |
| Trial ending soon | Days 7, 10, 13 | Owner |
| Subscription renewed | Successful charge | Owner |
| Subscription failed | Failed charge | Owner |
| Team member joined | Invite accepted | Owner |
| Plan limit warning | 90% of limit reached | Owner |

**Format example (new order):**
```
🛍 Новый заказ!

#ORD-63ID8B
Клиент: Малика Алимова
Сумма: 850 000 UZS
Товары: 2 шт.
Оплата: Click

[Открыть заказ] [Все заказы]
```

### 11.3 Telegram Notifications (to Buyers)

Sent via merchant's bot to customers.

| Event | When |
|---|---|
| Order received | After successful order |
| Order confirmed | Merchant marks confirmed |
| Order shipping | Merchant marks shipped |
| Order delivered | Merchant marks delivered |
| Order cancelled | If merchant cancels |
| Refund issued | When refund processed |
| Mass mailing | Per merchant's campaign |
| Abandoned cart recovery | 1 hour after abandonment |
| Loyalty points earned | After order completion |
| Tier upgraded | When customer reaches new tier |
| Birthday greeting | On birthday (if known) |

### 11.4 Email Notifications

Sent via Resend. For events needing persistent record or longer content.

| Event | Recipient |
|---|---|
| Welcome email | New merchant after signup |
| Trial ending warning | Days 7, 10, 13 |
| Invoice paid | Merchant (with PDF) |
| Payment failed | Merchant |
| Subscription cancelled | Merchant |
| Refund issued | Merchant |
| Weekly analytics summary | Merchant (Business+) |
| Monthly platform report | Platform team |
| Critical error alerts | Platform on-call |

**Templates:** Stored in `apps/api/dokonly_api/email_templates/` as Jinja2 templates with per-language versions.

### 11.5 In-App Notifications

For merchants in admin dashboard.

- Bell icon in top bar shows unread count
- Notifications panel slides in on click
- Categories: Orders, Payments, System, Support
- Mark as read on click
- Persistent until dismissed
- Real-time updates via WebSocket

**Database:**

```sql
CREATE TABLE in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.6 Push Notifications (Post-v1)

For PWA installation. Not in v1 — Telegram bot notifications cover the use case.

---

## 12. AI Pipeline

Detailed architecture for all AI features. **Single provider: OpenAI direct.** Tiered model selection per task type for cost optimization.

### 12.1 Provider Strategy

**OpenAI direct only.** No OpenRouter, no Anthropic, no Groq. Single-vendor approach trades flexibility for simplicity, unified billing, consistent function-calling, and OpenAI's automatic prompt caching.

**Trade-offs accepted:**
- ❌ Vendor lock-in (mitigated by clean abstraction layer)
- ❌ No automatic fallback if OpenAI outages (mitigated by graceful degradation: temporarily disable AI features, continue core flows)
- ✅ One API key, one dashboard, one billing line
- ✅ Best structured outputs via `response_format`
- ✅ Native function calling for Seller Assistant
- ✅ Automatic prompt caching for prefixes >1024 tokens (no manual cache_control tags)
- ✅ Whisper, embeddings, moderation in same ecosystem
- ✅ DALL-E available for future image generation features

### 12.2 Tiered Model Selection

Three OpenAI text models + transcription + embeddings. Each task routed to the cheapest model that delivers acceptable quality.

| Tier | Model | Input $/M | Output $/M | Use For |
|---|---|---|---|---|
| **Premium** | `gpt-5.5` | $5.00 | $30.00 | Reasoning-heavy tasks where quality directly affects revenue |
| **Standard** | `gpt-5.4-mini` | $0.25 | $2.00 | Structured extraction, generation tasks (high volume) |
| **Budget** | `gpt-5.4-nano` | $0.05 | $0.40 | Simple classification, translations, batch operations |
| **Transcription** | `gpt-4o-mini-transcribe` | $0.003/min | — | Voice import (better than Whisper-1 on Russian/Uzbek) |
| **Embeddings** | `text-embedding-3-small` | $0.02/M tokens | — | AI recommendations, semantic search |

**Cost reality at scale:** A merchant doing 5 photo imports (20 photos each) + 100 consultant chats + 50 description generations per month costs roughly:
- Tiered approach: ~$3-5/month
- GPT-5.5 only: ~$25-30/month

On tariff Старт ($16/mo) tiered keeps margin healthy.

### 12.3 OpenAIRouter Architecture

Single provider, task-based model selection.

```python
# apps/api/dokonly_api/ai/router.py
from openai import AsyncOpenAI
from enum import Enum

class TaskType(str, Enum):
    # Premium tier
    CONSULTANT = "consultant"
    SELLER_ASSISTANT = "seller_assistant"
    
    # Standard tier
    PRODUCT_EXTRACTION = "product_extraction"
    DESCRIPTION_GENERATION = "description_generation"
    MAILING_GENERATION = "mailing_generation"
    RECOMMENDATIONS = "recommendations"
    
    # Budget tier
    TRANSLATION = "translation"
    CATEGORIZATION = "categorization"
    
    # Specialized
    VOICE_TRANSCRIPTION = "voice_transcription"
    EMBEDDING = "embedding"

TASK_CONFIG = {
    TaskType.CONSULTANT: {
        "model": "gpt-5.5",
        "max_tokens": 1500,
        "temperature": 0.7,
        "supports_caching": True,
    },
    TaskType.SELLER_ASSISTANT: {
        "model": "gpt-5.5",
        "max_tokens": 2000,
        "temperature": 0.3,
        "supports_caching": True,
        "supports_tools": True,
    },
    TaskType.PRODUCT_EXTRACTION: {
        "model": "gpt-5.4-mini",
        "max_tokens": 1000,
        "temperature": 0.2,
        "supports_vision": True,
        "response_format": "json_object",
    },
    TaskType.DESCRIPTION_GENERATION: {
        "model": "gpt-5.4-mini",
        "max_tokens": 500,
        "temperature": 0.5,
        "supports_vision": True,
    },
    TaskType.MAILING_GENERATION: {
        "model": "gpt-5.4-mini",
        "max_tokens": 800,
        "temperature": 0.8,  # creative
    },
    TaskType.RECOMMENDATIONS: {
        "model": "gpt-5.4-mini",
        "max_tokens": 200,
        "temperature": 0.3,
    },
    TaskType.TRANSLATION: {
        "model": "gpt-5.4-nano",
        "max_tokens": 500,
        "temperature": 0.1,
    },
    TaskType.CATEGORIZATION: {
        "model": "gpt-5.4-nano",
        "max_tokens": 50,
        "temperature": 0.0,
    },
    TaskType.VOICE_TRANSCRIPTION: {
        "model": "gpt-4o-mini-transcribe",
    },
    TaskType.EMBEDDING: {
        "model": "text-embedding-3-small",
    },
}

class OpenAIRouter:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            organization=settings.OPENAI_ORG_ID,
            timeout=60.0,
            max_retries=2,
        )
    
    async def complete(
        self,
        task: TaskType,
        messages: list,
        tenant_id: UUID,
        user_id: UUID | None = None,
        stream: bool = False,
        tools: list | None = None,
        **kwargs,
    ) -> AIResponse:
        # 1. Check tenant budget
        await self._check_budget(tenant_id)
        
        # 2. Get config
        config = TASK_CONFIG[task]
        
        # 3. Build request params
        params = {
            "model": config["model"],
            "messages": messages,
            "max_tokens": config.get("max_tokens", 1000),
            "temperature": config.get("temperature", 0.5),
            "stream": stream,
        }
        
        if config.get("response_format") == "json_object":
            params["response_format"] = {"type": "json_object"}
        
        if config.get("supports_tools") and tools:
            params["tools"] = tools
            params["tool_choice"] = "auto"
        
        # 4. Execute
        start = time.time()
        try:
            response = await self.client.chat.completions.create(**params)
            
            # 5. Log usage
            await self._log_usage(
                tenant_id=tenant_id,
                user_id=user_id,
                task=task,
                model=config["model"],
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
                cached_tokens=response.usage.prompt_tokens_details.cached_tokens or 0,
                cost_usd=self._calculate_cost(config["model"], response.usage),
                duration_ms=int((time.time() - start) * 1000),
                status="success",
            )
            
            return AIResponse.from_openai(response)
        except Exception as e:
            await self._log_usage(
                tenant_id=tenant_id, task=task, status="failed", error=str(e),
            )
            # Graceful degradation — see Section 12.6
            raise AIServiceUnavailable(str(e))
    
    async def transcribe(self, audio_url: str, tenant_id: UUID) -> str:
        await self._check_budget(tenant_id)
        config = TASK_CONFIG[TaskType.VOICE_TRANSCRIPTION]
        
        # Download audio from R2
        audio_data = await download_from_r2(audio_url)
        
        response = await self.client.audio.transcriptions.create(
            model=config["model"],
            file=("audio.mp3", audio_data),
            language=None,  # auto-detect
        )
        return response.text
    
    async def embed(self, text: str, tenant_id: UUID) -> list[float]:
        await self._check_budget(tenant_id)
        config = TASK_CONFIG[TaskType.EMBEDDING]
        
        response = await self.client.embeddings.create(
            model=config["model"],
            input=text,
        )
        return response.data[0].embedding
```

### 12.4 OpenAI Automatic Prompt Caching

OpenAI caches prompts automatically when prefix is >1024 tokens. **50% discount on cached input tokens** (no special API tags needed).

To maximize cache hits:
1. **Keep system prompt + reference data at the START of messages array** (cache prefix)
2. **Put dynamic content (user message) at the END**
3. **Don't change the prefix unnecessarily**

```python
# Good — cached prefix stays stable across requests
messages = [
    {"role": "system", "content": SYSTEM_PROMPT},       # ← cached
    {"role": "system", "content": catalog_context},     # ← cached
    {"role": "system", "content": store_settings},      # ← cached
    {"role": "user", "content": current_message},       # ← changes per request
]
```

The first 1024+ tokens of identical prefix get 50% input discount. Caches expire after 5-10 minutes of inactivity.

### 12.5 Cost Tracking & Budgets

Every AI call logged in `ai_usage_logs`. Budget enforced per tenant per month.

```python
TIER_AI_BUDGETS = {
    "trial": 5.00,      # $5 during 14-day trial
    "start": 1.00,      # $1/month on Старт
    "business": 5.00,   # $5/month on Бизнес
    "premium": 20.00,   # $20/month on Премиум
}

async def _check_budget(self, tenant_id: UUID):
    tenant = await get_tenant(tenant_id)
    monthly_limit = TIER_AI_BUDGETS[tenant.plan]
    
    current_usage = await db.fetch_val(
        "SELECT COALESCE(SUM(cost_usd), 0) FROM ai_usage_logs "
        "WHERE tenant_id = $1 AND created_at >= date_trunc('month', NOW())",
        tenant_id,
    )
    
    if current_usage >= monthly_limit:
        raise AIBudgetExceeded(
            current=current_usage,
            limit=monthly_limit,
            upgrade_url=f"/billing/upgrade?reason=ai_budget"
        )

def _calculate_cost(model: str, usage) -> float:
    """Calculate cost in USD based on token usage."""
    pricing = OPENAI_PRICING[model]
    
    # Use cached pricing when available (50% discount)
    cached = usage.prompt_tokens_details.cached_tokens or 0
    uncached_input = usage.prompt_tokens - cached
    
    cost = (
        (cached / 1_000_000) * pricing["cached_input"] +
        (uncached_input / 1_000_000) * pricing["input"] +
        (usage.completion_tokens / 1_000_000) * pricing["output"]
    )
    return cost

OPENAI_PRICING = {
    # Per 1M tokens (USD)
    "gpt-5.5":              {"input": 5.00,  "cached_input": 2.50,  "output": 30.00},
    "gpt-5.4-mini":         {"input": 0.25,  "cached_input": 0.125, "output": 2.00},
    "gpt-5.4-nano":         {"input": 0.05,  "cached_input": 0.025, "output": 0.40},
    "text-embedding-3-small": {"input": 0.02, "cached_input": 0.02, "output": 0.00},
}
```

### 12.6 Graceful Degradation (No Cross-Provider Fallback)

Since we use single provider, if OpenAI is unavailable we don't switch providers. Instead:

```python
class AIService:
    async def with_degradation(self, fn, fallback_value=None):
        try:
            return await fn()
        except (AIServiceUnavailable, openai.APIError) as e:
            # Log incident
            sentry_sdk.capture_exception(e)
            
            # Notify platform team if rate of failures > 5%
            await self._track_failure_rate()
            
            # Return safe fallback
            return fallback_value
```

**Per-feature degradation behavior:**

| Feature | OpenAI Down → Behavior |
|---|---|
| AI Consultant | Hide chat widget, show "Temporarily unavailable, contact seller directly" |
| Seller Assistant | Disable AI panel, show "AI helper unavailable" |
| Product extraction | Show "AI import unavailable. Add manually or try later" |
| Voice import | Disable voice button, show "Voice unavailable" |
| Description generation | Disable button, allow manual entry |
| Mailing generation | Disable "Generate with AI", allow manual writing |
| Recommendations | Hide recommendations block (don't break the page) |
| Embeddings (search) | Fall back to PostgreSQL full-text search |

**Critical:** Core platform (catalog, orders, payments) must work 100% without AI.

### 12.7 Per-Feature Flows

**Product Extraction from Photos**
- Input: Photo URL(s) + optional caption(s)
- Output: Structured product data (JSON)
- Model: `gpt-5.4-mini` with vision + JSON mode
- Target: <$0.003 per photo
- Flow:
  1. Photos uploaded to R2
  2. Send to OpenAI with `response_format={"type": "json_object"}`
  3. System prompt: "Extract product info from image..."
  4. User message: image + caption
  5. Parse JSON, validate via Pydantic
  6. Store in `ai_imports.result_data`

**Voice Transcription**
- Input: Audio file (mp3/ogg/wav, max 5 min)
- Output: Text transcript
- Model: `gpt-4o-mini-transcribe`
- Target: $0.003/minute
- Flow:
  1. Audio uploaded to R2
  2. Stream to OpenAI `audio.transcriptions.create`
  3. Auto-detect language
  4. Return transcript → feed into product extraction

**AI Consultant (Buyer-facing)**
- Input: Customer message + chat history
- Output: Helpful response in customer's language (streaming)
- Model: `gpt-5.5` (quality matters for conversion)
- Target: <$0.02 per conversation (with caching)
- Flow:
  1. Build cached prefix: system prompt + full catalog (in compact form) + store info
  2. Append conversation history
  3. Stream response via WebSocket (token by token)
  4. Detect customer's language from their message
  5. Respond in that language

**Seller Assistant (Merchant-facing)**
- Input: Merchant question
- Output: Answer with actionable suggestions (tool use)
- Model: `gpt-5.5` with tools
- Tools (function calling):
  - `query_products(filters)` — search products
  - `query_orders(filters)` — search orders  
  - `query_customers(filters)` — search customers
  - `query_analytics(metric, range)` — get analytics
  - `generate_mailing(topic, audience)` — draft mailing
- Flow:
  1. Receive merchant question
  2. Send to GPT-5.5 with tool definitions
  3. Model decides which tools to call
  4. Execute tool calls (scoped to tenant_id via RLS)
  5. Return tool results to model
  6. Model formulates final answer
  7. Stream to merchant via WebSocket

**Mailing Generation**
- Input: Topic, tone, audience description
- Output: 3 mailing options with text + emoji + CTA
- Model: `gpt-5.4-mini` with temperature 0.8 (creative)
- Target: <$0.002 per generation

**Description Generation**
- Input: Product photos + name + category
- Output: SEO-friendly description in store's languages
- Model: `gpt-5.4-mini` with vision
- Target: <$0.002 per product

**AI Recommendations**
- Input: Customer browsing history + cart
- Output: 3-5 product IDs
- Approach: Vector embeddings (`text-embedding-3-small`) + cosine similarity
- Storage: pgvector extension in Supabase
- Process:
  1. On product create/update: generate embedding from name + description, store
  2. On user action: compute "user vector" from viewed/carted products
  3. Find k-nearest products via pgvector
  4. Filter out already-purchased
  5. Return top 3-5

**Translation**
- Input: Source text + target language
- Output: Translated text
- Model: `gpt-5.4-nano` (very cheap, language tasks are simple)
- Target: <$0.0005 per translation
- Used for: auto-translating product names/descriptions when merchant adds them in one language

**Categorization**
- Input: Product name + description
- Output: Best-fit category from existing list
- Model: `gpt-5.4-nano` with temperature 0
- Target: <$0.0001 per categorization

**AI Photo Processing** (Premium tier)
- Background removal, auto-crop, watermarking
- Provider: NOT OpenAI — use Replicate (rembg model) or self-hosted Python (rembg lib)
- This is image processing, not language model task
- Cost: ~$0.001 per photo on Replicate, or compute-time on own server

### 12.8 Caching Strategies

**OpenAI Automatic Prompt Caching:**
- Used for Consultant, Seller Assistant
- Cache catalog data (changes hourly at most)
- Cache merchant context (changes weekly)
- 50% input cost reduction on cached prefixes
- No code changes — happens automatically for prefixes >1024 tokens

**Result Caching (Redis):**
- Description generations: cache by `(photo_hash, language)` for 7 days
- Recommendations: cache by `(customer_id, cart_signature)` for 1 hour
- Translations: cache permanently by `(text_hash, target_lang)` — translations don't go stale
- Embeddings: cache by `text_hash` for 30 days

### 12.9 Failure Mode Handling

```python
ERROR_HANDLING = {
    openai.RateLimitError: {
        "action": "retry_with_backoff",
        "max_retries": 3,
        "user_message": "AI is busy, retrying...",
    },
    openai.APIConnectionError: {
        "action": "fail_gracefully",
        "user_message": "AI temporarily unavailable",
    },
    openai.AuthenticationError: {
        "action": "alert_platform_team",
        "user_message": "AI configuration error",
    },
    openai.BadRequestError: {
        "action": "log_and_fail",
        "user_message": "Request couldn't be processed",
    },
}
```

On rate limit (429): exponential backoff up to 3 retries. After 3 failures, return graceful degradation response.

Alert platform team via Sentry if:
- Failure rate >5% over 15 minutes
- AuthenticationError (means API key issue)
- Daily cost exceeds threshold (set in admin)

---

## 13. Payment Integration Details

Each provider has specific integration requirements. Implementations follow the PaymentProvider ABC.

### 13.1 PaymentProvider Interface

```python
# apps/api/dokonly_api/payment/base.py
from abc import ABC, abstractmethod
from decimal import Decimal
from uuid import UUID

@dataclass
class PaymentResult:
    payment_id: UUID
    status: PaymentStatus
    redirect_url: str | None = None
    instructions: dict | None = None
    external_id: str | None = None
    metadata: dict = field(default_factory=dict)

class PaymentProvider(ABC):
    @abstractmethod
    async def create_payment(
        self,
        amount: Decimal,
        currency: str,
        order_id: UUID,
        tenant_id: UUID,
        metadata: dict,
    ) -> PaymentResult:
        ...
    
    @abstractmethod
    async def verify_payment(self, payment_id: UUID) -> PaymentStatus:
        ...
    
    @abstractmethod
    async def refund(
        self,
        payment_id: UUID,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> RefundResult:
        ...
    
    @abstractmethod
    async def handle_webhook(self, payload: dict, headers: dict) -> dict:
        ...
```

### 13.2 Manual Transfer Provider

**No external API.** Pure manual flow.

```python
class ManualTransferProvider(PaymentProvider):
    async def create_payment(self, amount, currency, order_id, tenant_id, metadata):
        # Fetch merchant's configured card details
        config = await get_provider_config(tenant_id, "manual_transfer")
        
        return PaymentResult(
            payment_id=uuid4(),
            status=PaymentStatus.PENDING,
            instructions={
                "card_number": config["card_number"],
                "holder_name": config["holder_name"],
                "bank": config["bank"],
                "amount": str(amount),
                "currency": currency,
                "reference": f"Order {metadata['order_number']}",
                "additional_text": config.get("instructions"),
            },
        )
    
    async def verify_payment(self, payment_id):
        # Manual verification — merchant confirms in admin
        return await get_payment_status(payment_id)
    
    async def refund(self, payment_id, amount=None, reason=None):
        # Manual refund — merchant transfers back to customer
        await mark_refunded(payment_id, amount, reason, manual=True)
        return RefundResult(success=True, external_id=None)
```

### 13.3 Click Provider

**Click API:** Two-step flow (prepare + complete) with merchant credentials.

**Setup requirements:**
- Click merchant account (Dokonly's or merchant's)
- merchant_id, service_id, secret_key

```python
class ClickProvider(PaymentProvider):
    BASE_URL = "https://api.click.uz/v2"
    
    async def create_payment(self, amount, currency, order_id, tenant_id, metadata):
        config = await get_provider_config(tenant_id, "click")
        
        # Generate payment URL for redirect
        params = {
            "service_id": config["service_id"],
            "merchant_id": config["merchant_id"],
            "amount": str(amount),
            "transaction_param": str(order_id),
            "return_url": f"{settings.STOREFRONT_URL}/orders/{order_id}/success",
            "card_type": "uzcard",  # or 'humo'
        }
        
        url = f"https://my.click.uz/services/pay?{urlencode(params)}"
        
        return PaymentResult(
            payment_id=uuid4(),
            status=PaymentStatus.PENDING,
            redirect_url=url,
            external_id=None,  # Click assigns later
        )
    
    async def handle_webhook(self, payload, headers):
        # Click sends 'prepare' then 'complete'
        action = payload.get("action")
        
        if action == "0":  # prepare
            return await self._handle_prepare(payload)
        elif action == "1":  # complete
            return await self._handle_complete(payload)
        
        return {"error": -3, "error_note": "Invalid action"}
    
    async def _handle_prepare(self, payload):
        # Validate signature, check amount, etc.
        signature = self._calc_signature(payload, "prepare")
        if signature != payload.get("sign_string"):
            return {"error": -1, "error_note": "Invalid signature"}
        
        # ... checks
        
        return {
            "click_trans_id": payload["click_trans_id"],
            "merchant_trans_id": payload["merchant_trans_id"],
            "merchant_prepare_id": str(uuid4()),
            "error": 0,
            "error_note": "Success",
        }
    
    async def _handle_complete(self, payload):
        # On successful payment
        order_id = payload["merchant_trans_id"]
        click_trans_id = payload["click_trans_id"]
        
        await update_payment_status(
            order_id=order_id,
            status=PaymentStatus.SUCCEEDED,
            external_id=click_trans_id,
        )
        
        return {
            "click_trans_id": click_trans_id,
            "merchant_trans_id": order_id,
            "merchant_confirm_id": str(uuid4()),
            "error": 0,
            "error_note": "Success",
        }
```

### 13.4 Payme Provider

**Payme API:** JSON-RPC over HTTPS with merchant authentication.

```python
class PaymeProvider(PaymentProvider):
    BASE_URL = "https://checkout.paycom.uz"
    
    async def create_payment(self, amount, currency, order_id, tenant_id, metadata):
        config = await get_provider_config(tenant_id, "payme")
        
        # Build Payme URL with base64-encoded params
        params = {
            "m": config["merchant_id"],
            "ac.order_id": str(order_id),
            "a": int(amount * 100),  # in tiyin (1/100 sum)
            "c": f"{settings.STOREFRONT_URL}/orders/{order_id}/success",
        }
        
        encoded = base64.b64encode(
            ";".join(f"{k}={v}" for k, v in params.items()).encode()
        ).decode()
        
        url = f"{self.BASE_URL}/{encoded}"
        
        return PaymentResult(
            payment_id=uuid4(),
            status=PaymentStatus.PENDING,
            redirect_url=url,
        )
    
    async def handle_webhook(self, payload, headers):
        # Payme JSON-RPC methods
        method = payload.get("method")
        params = payload.get("params", {})
        
        # Auth via Basic auth header
        if not self._validate_auth(headers):
            return {"error": {"code": -32504, "message": "Authentication failed"}}
        
        handlers = {
            "CheckPerformTransaction": self._check_perform,
            "CreateTransaction": self._create_transaction,
            "PerformTransaction": self._perform_transaction,
            "CancelTransaction": self._cancel_transaction,
            "CheckTransaction": self._check_transaction,
            "GetStatement": self._get_statement,
        }
        
        handler = handlers.get(method)
        if not handler:
            return {"error": {"code": -32601, "message": "Method not found"}}
        
        return await handler(params)
```

### 13.5 Direct Card Payment (UzCard/Humo/Visa/Mastercard) via Acquiring Bank

**Requires:** Acquiring bank partnership. Each bank has their own SDK.

Common pattern with PCI compliance:

```python
class DirectCardProvider(PaymentProvider):
    async def create_payment(self, amount, currency, order_id, tenant_id, metadata):
        # Bank generates iframe URL
        bank_response = await self.bank_api.create_payment_session(
            amount=amount,
            currency=currency,
            order_id=str(order_id),
            return_url=f"{settings.STOREFRONT_URL}/orders/{order_id}/success",
        )
        
        return PaymentResult(
            payment_id=uuid4(),
            status=PaymentStatus.PENDING,
            redirect_url=bank_response["payment_url"],
            external_id=bank_response["session_id"],
        )
    
    # Customer enters card details in bank's hosted iframe (never on our servers)
    # Bank handles 3DSecure, etc.
```

### 13.7 Alif/Uzum Nasiya Installments — Premium+

**Requires:** Partnership agreement. Installment is for buyer, but merchant gets full payment upfront.

```python
class AlifNasiyaProvider(PaymentProvider):
    async def create_payment(self, amount, currency, order_id, tenant_id, metadata):
        # Alif API call to create installment application
        response = await self.alif_api.create_application(
            amount=amount,
            customer_passport=metadata.get("passport"),
            customer_phone=metadata["phone"],
            term_months=metadata.get("term_months", 6),
        )
        
        return PaymentResult(
            payment_id=uuid4(),
            status=PaymentStatus.PENDING,
            redirect_url=response["application_url"],
            external_id=response["application_id"],
        )
```

### 13.8 Cash on Delivery

Simplest provider — no integration.

```python
class CashOnDeliveryProvider(PaymentProvider):
    async def create_payment(self, amount, currency, order_id, tenant_id, metadata):
        return PaymentResult(
            payment_id=uuid4(),
            status=PaymentStatus.PENDING,  # stays pending until delivery
            instructions={"text": "You will pay when the order is delivered."},
        )
    
    # Merchant manually marks as paid when collecting cash
```

### 13.9 Provider Registry

```python
PROVIDER_REGISTRY = {
    "manual_transfer": ManualTransferProvider,
    "cash_on_delivery": CashOnDeliveryProvider,
    "telegram_stars": TelegramStarsProvider,
    "click": ClickProvider,
    "payme": PaymeProvider,
    "uzcard_direct": DirectCardProvider,
    "humo_direct": DirectCardProvider,
    "visa_master": DirectCardProvider,
    "alif_nasiya": AlifNasiyaProvider,
    "uzum_nasiya": UzumNasiyaProvider,
    "kaspi": KaspiProvider,  # for KZ in v2
    # ... future providers
}

def get_provider(name: str) -> PaymentProvider:
    cls = PROVIDER_REGISTRY[name]
    return cls()
```

### 13.10 Payment Status State Machine

```
created → pending → processing → succeeded
                ↓
                failed
                ↓
                cancelled

succeeded → refunded (full)
succeeded → partially_refunded (partial)
```

### 13.11 Webhook Security

All payment webhooks validate signatures:

```python
# apps/api/dokonly_api/routes/webhooks.py
@router.post("/webhooks/{provider}/{tenant_id}")
async def payment_webhook(provider: str, tenant_id: UUID, request: Request):
    payload = await request.json()
    headers = dict(request.headers)
    
    provider_instance = get_provider(provider)
    
    # Provider-specific signature validation
    try:
        response = await provider_instance.handle_webhook(payload, headers)
        return response
    except SignatureInvalidError:
        raise HTTPException(401, "Invalid signature")
    except Exception as e:
        # Log but don't expose details
        log_error(e, context={"provider": provider, "tenant": tenant_id})
        raise HTTPException(500, "Internal error")
```

---

## 14. Bot Infrastructure

Multi-bot architecture: one platform backend serves many bots.

### 14.1 Multi-Bot Webhook Routing

Each merchant has their own Telegram bot. All webhooks route to the same backend.

**Telegram setup:** When bot is registered:
```python
await bot.set_webhook(
    url=f"https://api.dokonly.com/v1/webhooks/telegram/{bot_token_hash}",
    secret_token=settings.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates=["message", "callback_query", "pre_checkout_query", "successful_payment"],
)
```

**Backend routing:**

```python
@router.post("/webhooks/telegram/{bot_token_hash}")
async def telegram_webhook(
    bot_token_hash: str,
    update: dict,
    x_telegram_bot_api_secret_token: str = Header(),
):
    # 1. Verify webhook secret
    if x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(401)
    
    # 2. Identify tenant by token hash
    tenant = await get_tenant_by_bot_hash(bot_token_hash)
    if not tenant:
        return {"ok": True}  # Unknown bot, ignore
    
    # 3. Load tenant's bot instance
    bot = get_bot_for_tenant(tenant)
    
    # 4. Process update via aiogram
    await bot_router.process_update(update, bot=bot, tenant=tenant)
    
    return {"ok": True}
```

### 14.2 Bot Instance Caching

To avoid creating Bot instances on every request:

```python
# apps/api/dokonly_api/bot/registry.py
class BotRegistry:
    def __init__(self):
        self._bots: dict[UUID, Bot] = {}
    
    async def get(self, tenant: Tenant) -> Bot:
        if tenant.id not in self._bots:
            token = decrypt(tenant.bot_token_encrypted)
            self._bots[tenant.id] = Bot(token=token, default=DefaultBotProperties(parse_mode="HTML"))
        return self._bots[tenant.id]
    
    async def invalidate(self, tenant_id: UUID):
        if tenant_id in self._bots:
            await self._bots[tenant_id].session.close()
            del self._bots[tenant_id]

bot_registry = BotRegistry()
```

### 14.3 Bot Creation Flow

Detailed in Section 10.1, but technical details:

**Validation:**

```python
async def validate_and_register_bot(token: str, owner_user: User) -> Tenant:
    # 1. Verify token by calling getMe
    bot = Bot(token=token)
    try:
        me = await bot.get_me()
    except TelegramAPIError as e:
        raise InvalidBotToken(str(e))
    
    # 2. Check bot isn't already registered
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    existing = await get_tenant_by_bot_hash(token_hash)
    if existing:
        raise BotAlreadyRegistered("This bot is already linked to another store")
    
    # 3. Encrypt token
    encrypted_token = encrypt(token, key=settings.ENCRYPTION_KEY)
    
    # 4. Create tenant record (fill bot details)
    tenant.bot_username = me.username
    tenant.bot_token_encrypted = encrypted_token
    tenant.bot_token_hash = token_hash
    tenant.bot_added_at = datetime.utcnow()
    
    # 5. Set webhook
    await bot.set_webhook(
        url=f"{settings.WEBHOOK_BASE_URL}/v1/webhooks/telegram/{token_hash}",
        secret_token=settings.TELEGRAM_WEBHOOK_SECRET,
    )
    
    # 6. Set bot commands
    await bot.set_my_commands([
        BotCommand(command="start", description="Открыть магазин"),
        BotCommand(command="orders", description="Мои заказы"),
        BotCommand(command="help", description="Помощь"),
    ])
    
    # 7. Set bot menu button to open Mini App
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="🛍 Магазин",
            web_app=WebAppInfo(url=f"{settings.STOREFRONT_URL}/{tenant.slug}"),
        ),
    )
    
    await close_bot(bot)
    
    return tenant
```

### 14.4 Bot Handlers (aiogram routers)

**Structure:**

```
apps/api/dokonly_api/bot/
├── __init__.py
├── router.py             # main router that processes updates
├── registry.py           # BotRegistry
├── handlers/
│   ├── start.py          # /start command
│   ├── menu.py           # main menu callbacks
│   ├── orders.py         # /orders, view order
│   ├── payment.py        # pre_checkout_query, successful_payment
│   ├── help.py           # /help
│   └── ...
├── middlewares/
│   ├── tenant.py         # injects tenant into context
│   ├── customer.py       # creates/fetches customer
│   ├── i18n.py           # detects language
│   └── analytics.py      # tracks events
└── keyboards/
    ├── main_menu.py
    ├── order_card.py
    └── ...
```

**Example handler:**

```python
# apps/api/dokonly_api/bot/handlers/start.py
@router.message(CommandStart())
async def cmd_start(message: Message, tenant: Tenant, customer: Customer):
    # Welcome message based on tenant config
    welcome_text = tenant.settings.get(
        "welcome_message",
        DEFAULT_WELCOME[tenant.default_language]
    )
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🛍 Открыть магазин",
            web_app=WebAppInfo(url=f"{settings.STOREFRONT_URL}/{tenant.slug}"),
        )],
        [InlineKeyboardButton(
            text="📦 Мои заказы",
            callback_data="my_orders",
        )],
    ])
    
    await message.answer(
        welcome_text.format(name=customer.full_name or "друг", store_name=tenant.name),
        reply_markup=keyboard,
    )
```

### 14.5 Channel Admin Verification

When merchant wants to enable Channel Subscription Gate:

```python
async def verify_bot_is_channel_admin(tenant: Tenant, channel_username: str) -> bool:
    bot = await bot_registry.get(tenant)
    
    try:
        # Get all admins of the channel
        admins = await bot.get_chat_administrators(chat_id=f"@{channel_username}")
        
        # Check if our bot is in the list
        bot_info = await bot.get_me()
        is_admin = any(admin.user.id == bot_info.id for admin in admins)
        
        return is_admin
    except TelegramAPIError as e:
        if e.message.startswith("Forbidden"):
            return False  # Bot not in channel
        raise
```

### 14.6 Inline Keyboards & Callbacks

Standard pattern for stateful interactions:

```python
# Callback data format: action:resource:id:param
# Examples:
#   "order:view:abc-123"
#   "order:cancel:abc-123:confirm"

@router.callback_query(F.data.startswith("order:"))
async def handle_order_callback(query: CallbackQuery, tenant: Tenant):
    parts = query.data.split(":")
    action = parts[1]
    order_id = parts[2]
    
    if action == "view":
        order = await get_order(order_id, tenant_id=tenant.id)
        text = format_order_card(order)
        keyboard = make_order_actions_keyboard(order)
        await query.message.edit_text(text, reply_markup=keyboard)
    elif action == "cancel":
        # ... cancellation flow
        pass
    
    await query.answer()
```

### 14.7 Inline Query Handler (Product Sharing)

For the Share feature (see §9.3.5). When a customer shares a product via `switchInlineQuery`, the bot receives an `inline_query` update and must respond with a rich preview.

**Requirement:** Bot must have inline mode enabled via @BotFather (see §9.3.5 onboarding integration).

```python
# apps/api/dokonly_api/bot/handlers/inline.py
from aiogram import Router
from aiogram.types import (
    InlineQuery,
    InlineQueryResultArticle,
    InputTextMessageContent,
    LinkPreviewOptions,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)

router = Router()

@router.inline_query()
async def handle_share_inline_query(query: InlineQuery, tenant: Tenant):
    """
    Query format: "share_<product_id>" or "share_<product_id>_ref_<code>"
    """
    parts = query.query.split('_')
    
    if not parts or parts[0] != 'share' or len(parts) < 2:
        # Invalid query — return empty result
        await query.answer([], cache_time=0)
        return
    
    product_id = parts[1]
    ref_code = parts[3] if len(parts) >= 4 and parts[2] == 'ref' else None
    
    product = await get_product(product_id, tenant_id=tenant.id)
    if not product or not product.is_active or product.deleted_at:
        await query.answer([], cache_time=0)
        return
    
    # Build deep link with referral attribution
    deep_link_payload = f"product_{product_id}"
    if ref_code:
        deep_link_payload += f"_ref_{ref_code}"
    deep_link = (
        f"https://t.me/{tenant.bot_username}/store"
        f"?startapp={deep_link_payload}"
    )
    
    # Build rich preview
    result = InlineQueryResultArticle(
        id=f"share_{product_id}_{int(time.time())}",
        title=product.name,
        description=(
            f"{format_price(product.price, tenant.currency)} · {tenant.name}"
        ),
        thumbnail_url=(
            product.images[0]['url']
            if product.images
            else tenant.logo_url
        ),
        input_message_content=InputTextMessageContent(
            message_text=build_share_caption(product, tenant, ref_code),
            parse_mode="HTML",
            link_preview_options=LinkPreviewOptions(
                url=deep_link,
                prefer_large_media=True,
                show_above_text=True,
            ),
        ),
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="🛍 Open store", url=deep_link),
        ]]),
    )
    
    # Track share intent (analytics)
    await track_share_intent(
        tenant_id=tenant.id,
        product_id=product.id,
        referral_code=ref_code,
        method='inline_query',
        shared_by_telegram_id=query.from_user.id,
    )
    
    # Personal results — don't cache across users
    await query.answer([result], cache_time=300, is_personal=True)


def build_share_caption(product, tenant, ref_code):
    """Pre-filled message text. User can edit before sending."""
    discount_line = ""
    if product.compare_at_price and product.compare_at_price > product.price:
        discount = round(
            (1 - product.price / product.compare_at_price) * 100
        )
        discount_line = f" 🔥 -{discount}%"
    
    referral_line = ""
    if ref_code:
        referral_line = f"\n\n🎁 Use code <code>{ref_code}</code> for 10% off!"
    
    return (
        f"<b>{product.name}</b>{discount_line}\n\n"
        f"💰 <b>{format_price(product.price, tenant.currency)}</b>\n\n"
        f"🏪 {tenant.name}"
        f"{referral_line}"
    )


async def track_share_intent(tenant_id, product_id, referral_code, method, shared_by_telegram_id):
    """Create product_shares record at the moment of share intent."""
    # Resolve customer from Telegram ID
    customer = await get_customer_by_telegram_id(
        tenant_id=tenant_id,
        telegram_id=shared_by_telegram_id,
    )
    
    await db.insert('product_shares', {
        'tenant_id': tenant_id,
        'product_id': product_id,
        'shared_by_customer_id': customer.id if customer else None,
        'referral_code': referral_code,
        'share_method': method,
        'shared_to_chat_type': None,  # We don't know yet — updated on click
    })
```

**Deep link handler** (in `start.py`):

```python
@router.message(CommandStart(deep_link=True))
async def handle_deep_link_start(
    message: Message,
    command: CommandObject,
    tenant: Tenant,
):
    payload = command.args  # e.g., "product_42_ref_MALIKA10"
    parts = payload.split('_')
    
    product_id = None
    ref_code = None
    
    if len(parts) >= 2 and parts[0] == 'product':
        product_id = parts[1]
        if len(parts) >= 4 and parts[2] == 'ref':
            ref_code = parts[3]
    
    # Get or create customer for recipient
    customer = await get_or_create_customer(
        tenant_id=tenant.id,
        telegram_id=message.from_user.id,
        first_name=message.from_user.first_name,
    )
    is_new = customer.created_at >= datetime.utcnow() - timedelta(seconds=5)
    
    # Apply referral attribution (only for new customers)
    if ref_code and is_new and not customer.referred_by_referral_id:
        await apply_referral_attribution(
            tenant_id=tenant.id,
            referrer_code=ref_code,
            referee_customer_id=customer.id,
            product_id=product_id,
        )
    
    # Track share link click (regardless of attribution outcome)
    if ref_code and product_id:
        await track_share_click(
            tenant_id=tenant.id,
            product_id=product_id,
            referral_code=ref_code,
            customer_id=customer.id,
        )
    
    # Send welcome with deep link to product
    web_app_url = (
        f"{settings.STOREFRONT_URL}/{tenant.slug}"
        f"{'/products/' + product_id if product_id else ''}"
    )
    await send_welcome_with_button(message, web_app_url, tenant, customer)
```

### 14.8 Bot Commands Across Plans

| Command | Description | Available |
|---|---|---|
| `/start` | Welcome + open store | All |
| `/orders` | View customer's orders | All (buyers) |
| `/help` | Help message | All |
| `/admin` | Open admin Mini App | Tenant admins only |
| `/cancel` | Cancel current action | All |
| `/lang` | Change language | All |

### 14.9 Bot Rate Limiting

Telegram limits: 30 messages/sec per bot. Mass mailings respect this:

```python
# apps/api/dokonly_api/bot/rate_limiter.py
class BotRateLimiter:
    def __init__(self, max_per_sec: int = 25):  # leave headroom
        self.max_per_sec = max_per_sec
        self._counters: dict[UUID, list[float]] = {}
    
    async def acquire(self, tenant_id: UUID):
        now = time.time()
        timestamps = self._counters.setdefault(tenant_id, [])
        
        # Remove old timestamps (>1 second ago)
        timestamps[:] = [t for t in timestamps if now - t < 1.0]
        
        if len(timestamps) >= self.max_per_sec:
            wait_time = 1.0 - (now - timestamps[0])
            await asyncio.sleep(wait_time)
        
        timestamps.append(time.time())
```

---

## 15. Repository Structure

Complete monorepo layout.

```
dokonly/
├── apps/
│   ├── api/                              # FastAPI backend
│   │   ├── dokonly_api/
│   │   │   ├── __init__.py
│   │   │   ├── main.py                   # FastAPI app entrypoint
│   │   │   ├── config.py                 # Settings (pydantic-settings)
│   │   │   ├── database.py               # SQLAlchemy engine, session
│   │   │   ├── deps.py                   # FastAPI dependencies
│   │   │   ├── errors.py                 # Custom exceptions
│   │   │   ├── middleware/
│   │   │   │   ├── auth.py
│   │   │   │   ├── tenant.py
│   │   │   │   ├── rate_limit.py
│   │   │   │   └── audit.py
│   │   │   ├── models/                   # SQLAlchemy models
│   │   │   │   ├── tenant.py
│   │   │   │   ├── product.py
│   │   │   │   ├── order.py
│   │   │   │   ├── customer.py
│   │   │   │   ├── subscription.py
│   │   │   │   ├── loyalty.py
│   │   │   │   ├── platform.py
│   │   │   │   └── ...
│   │   │   ├── schemas/                  # Pydantic schemas
│   │   │   │   └── ...
│   │   │   ├── routes/                   # API endpoints
│   │   │   │   ├── platform/             # /v1/platform/*
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── tenants.py
│   │   │   │   │   ├── billing.py
│   │   │   │   │   ├── support.py
│   │   │   │   │   ├── analytics.py
│   │   │   │   │   ├── content.py
│   │   │   │   │   └── config.py
│   │   │   │   ├── merchant/             # /v1/merchant/*
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── tenants.py
│   │   │   │   │   ├── products.py
│   │   │   │   │   ├── categories.py
│   │   │   │   │   ├── orders.py
│   │   │   │   │   ├── customers.py
│   │   │   │   │   ├── marketing.py
│   │   │   │   │   ├── analytics.py
│   │   │   │   │   ├── ai.py
│   │   │   │   │   ├── settings.py
│   │   │   │   │   ├── team.py
│   │   │   │   │   ├── subscription.py
│   │   │   │   │   ├── returns.py
│   │   │   │   │   ├── loyalty.py
│   │   │   │   │   └── stories.py
│   │   │   │   ├── storefront/           # /v1/storefront/*
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── catalog.py
│   │   │   │   │   ├── cart.py
│   │   │   │   │   ├── orders.py
│   │   │   │   │   ├── checkout.py
│   │   │   │   │   ├── returns.py
│   │   │   │   │   ├── loyalty.py
│   │   │   │   │   └── chat.py           # AI consultant
│   │   │   │   ├── public/               # /v1/public/* (no auth)
│   │   │   │   │   ├── health.py
│   │   │   │   │   └── prices.py
│   │   │   │   │   └── ...
│   │   │   │   └── webhooks/             # /v1/webhooks/*
│   │   │   │       ├── telegram.py
│   │   │   │       ├── click.py
│   │   │   │       ├── payme.py
│   │   │   │       └── stripe.py
│   │   │   ├── bot/                      # aiogram bot handlers
│   │   │   │   ├── router.py
│   │   │   │   ├── registry.py
│   │   │   │   ├── rate_limiter.py
│   │   │   │   ├── handlers/
│   │   │   │   ├── middlewares/
│   │   │   │   └── keyboards/
│   │   │   ├── payment/                  # Payment providers
│   │   │   │   ├── base.py
│   │   │   │   ├── registry.py
│   │   │   │   └── providers/
│   │   │   │       ├── manual_transfer.py
│   │   │   │       ├── click.py
│   │   │   │       ├── payme.py
│   │   │   │       ├── telegram_stars.py
│   │   │   │       ├── cash_on_delivery.py
│   │   │   │       ├── direct_card.py
│   │   │   │       ├── alif_nasiya.py
│   │   │   │       └── uzum_nasiya.py
│   │   │   ├── ai/                       # AI layer
│   │   │   │   ├── router.py
│   │   │   │   ├── tasks.py              # TaskType enum
│   │   │   │   ├── providers/
│   │   │   │   │   ├── openrouter.py
│   │   │   │   │   ├── anthropic.py
│   │   │   │   │   └── groq.py
│   │   │   │   ├── tasks_impl/
│   │   │   │   │   ├── product_extraction.py
│   │   │   │   │   ├── consultant.py
│   │   │   │   │   ├── seller_assistant.py
│   │   │   │   │   ├── mailing_generation.py
│   │   │   │   │   ├── description_generation.py
│   │   │   │   │   ├── recommendations.py
│   │   │   │   │   └── photo_processing.py
│   │   │   │   └── prompts/              # Jinja2 templates
│   │   │   ├── services/                 # Business logic
│   │   │   │   ├── tenants.py
│   │   │   │   ├── products.py
│   │   │   │   ├── orders.py
│   │   │   │   ├── customers.py
│   │   │   │   ├── subscriptions.py
│   │   │   │   ├── notifications.py
│   │   │   │   ├── mailings.py
│   │   │   │   ├── loyalty.py
│   │   │   │   ├── referrals.py
│   │   │   │   ├── returns.py
│   │   │   │   └── ...
│   │   │   ├── legal_compliance/         # Per-country legal rules
│   │   │   │   ├── base.py
│   │   │   │   ├── uz.py
│   │   │   │   ├── kz.py
│   │   │   │   └── kg.py
│   │   │   ├── features/                 # Feature flags
│   │   │   │   ├── flags.py
│   │   │   │   └── limits.py
│   │   │   ├── i18n/                     # Server-side localization
│   │   │   │   └── locales/
│   │   │   │       ├── uz.json
│   │   │   │       ├── ru.json
│   │   │   │       └── en.json
│   │   │   ├── workers/                  # ARQ background tasks
│   │   │   │   ├── __init__.py
│   │   │   │   ├── ai_imports.py
│   │   │   │   ├── mass_mailing.py
│   │   │   │   ├── abandoned_carts.py
│   │   │   │   ├── analytics_aggregation.py
│   │   │   │   ├── subscription_renewals.py
│   │   │   │   ├── webhook_delivery.py
│   │   │   │   └── channel_crossposting.py
│   │   │   ├── websocket/
│   │   │   │   ├── manager.py
│   │   │   │   └── handlers.py
│   │   │   ├── utils/
│   │   │   │   ├── crypto.py             # encryption helpers
│   │   │   │   ├── currency.py           # formatCurrency, conversions
│   │   │   │   ├── country_config.py
│   │   │   │   ├── slug.py
│   │   │   │   ├── pagination.py
│   │   │   │   └── ...
│   │   │   ├── email_templates/
│   │   │   │   ├── welcome/
│   │   │   │   ├── invoice_paid/
│   │   │   │   └── ...
│   │   │   └── tests/
│   │   ├── alembic/
│   │   │   ├── env.py
│   │   │   └── versions/
│   │   ├── alembic.ini
│   │   ├── pyproject.toml
│   │   ├── uv.lock
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── miniapp/                          # Merchant Telegram Mini App
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   ├── pages/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── catalog/
│   │   │   │   ├── orders/
│   │   │   │   ├── customers/
│   │   │   │   ├── marketing/
│   │   │   │   ├── analytics/
│   │   │   │   ├── team/
│   │   │   │   ├── settings/
│   │   │   │   └── more/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/                      # TanStack Query hooks
│   │   │   ├── stores/                   # Zustand stores
│   │   │   ├── locales/
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── storefront/                       # Buyer Telegram Mini App
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── home/
│   │   │   │   ├── product/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── orders/
│   │   │   │   ├── returns/
│   │   │   │   ├── loyalty/
│   │   │   │   ├── chat/                 # AI consultant
│   │   │   │   └── gate/                 # Channel subscription gate
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── stores/
│   │   │   └── locales/
│   │   └── ...
│   │
│   ├── dashboard/                        # Merchant web dashboard (admin.dokonly.com)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── layouts/
│   │   │   │   └── DashboardLayout.tsx
│   │   │   ├── pages/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── catalog/
│   │   │   │   ├── orders/
│   │   │   │   ├── customers/
│   │   │   │   ├── marketing/
│   │   │   │   ├── analytics/
│   │   │   │   ├── team/
│   │   │   │   ├── billing/
│   │   │   │   └── settings/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── ops/                              # Platform ops (ops.dokonly.com)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── tenants/
│   │   │   │   ├── billing/
│   │   │   │   ├── support/
│   │   │   │   ├── analytics/
│   │   │   │   ├── content/
│   │   │   │   ├── config/
│   │   │   │   ├── team/
│   │   │   │   └── audit/
│   │   │   └── ...
│   │   └── ...
│   │
│   └── marketing/                        # dokonly.uz landing site
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.astro
│       │   │   ├── pricing.astro
│       │   │   ├── compare.astro         # vs Sellz
│       │   │   ├── blog/
│       │   │   └── help/                 # public knowledge base
│       │   ├── components/
│       │   └── layouts/
│       ├── public/
│       └── astro.config.mjs
│
├── packages/
│   ├── ui/                               # Shared design system
│   │   ├── src/
│   │   │   ├── components/               # Button, Card, Input, Sheet, etc.
│   │   │   ├── hooks/
│   │   │   ├── tokens/
│   │   │   └── styles/
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── shared/                           # Shared types, validators, utils
│   │   ├── src/
│   │   │   ├── types/                    # TypeScript types
│   │   │   ├── schemas/                  # Zod schemas
│   │   │   └── utils/                    # currency, date, etc.
│   │   └── package.json
│   │
│   └── tg-webapp/                        # Telegram WebApp SDK wrapper
│       ├── src/
│       │   ├── index.ts
│       │   ├── hooks/
│       │   │   ├── useMainButton.ts
│       │   │   ├── useBackButton.ts
│       │   │   ├── useHaptic.ts
│       │   │   └── useTheme.ts
│       │   └── types.ts
│       └── package.json
│
├── docs/
│   ├── plan.md
│   ├── design.md
│   ├── implementation_plan.md
│   ├── app_specification.md              # This file
│   ├── architecture.md
│   ├── api-spec.md
│   └── ...
│
├── infra/
│   ├── docker-compose.yml                # local dev
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   └── .github/
│       └── workflows/
│           ├── ci.yml
│           ├── deploy-api.yml
│           ├── deploy-frontend.yml
│           └── ...
│
├── scripts/
│   ├── seed_dev_data.py
│   ├── create_platform_user.py
│   └── ...
│
├── turbo.json
├── package.json                          # root
├── pnpm-workspace.yaml
├── .env.example
├── README.md
└── LICENSE
```

---

## 16. API Specification

Endpoints organized by namespace.

### 16.1 Platform API (`/v1/platform/*`)

Auth: Platform JWT (admin email/password + 2FA).

```
POST   /v1/platform/auth/login              # Email + password login
POST   /v1/platform/auth/verify-2fa         # TOTP code
POST   /v1/platform/auth/refresh            # Refresh token
POST   /v1/platform/auth/logout

GET    /v1/platform/dashboard               # KPIs
GET    /v1/platform/dashboard/activity      # Recent activity feed

GET    /v1/platform/tenants                 # List with filters
GET    /v1/platform/tenants/{id}            # Detail
PATCH  /v1/platform/tenants/{id}            # Update
POST   /v1/platform/tenants/{id}/suspend    # Suspend account
POST   /v1/platform/tenants/{id}/unsuspend
POST   /v1/platform/tenants/{id}/impersonate # Generate impersonation JWT
POST   /v1/platform/tenants/{id}/message    # Send Telegram message
POST   /v1/platform/tenants/{id}/notes      # Add internal note
GET    /v1/platform/tenants/{id}/activity   # Audit log for tenant

GET    /v1/platform/subscriptions
GET    /v1/platform/subscriptions/{id}
PATCH  /v1/platform/subscriptions/{id}      # Manual adjustments
POST   /v1/platform/subscriptions/{id}/cancel
POST   /v1/platform/subscriptions/{id}/extend-trial

GET    /v1/platform/invoices
GET    /v1/platform/invoices/{id}
GET    /v1/platform/invoices/{id}/pdf
POST   /v1/platform/invoices/{id}/refund    # Issue refund

# Support: NO API ENDPOINTS — see §7.13 (external Telegram bot approach)

GET    /v1/platform/analytics/growth
GET    /v1/platform/analytics/revenue
GET    /v1/platform/analytics/product
GET    /v1/platform/analytics/ai-costs

GET    /v1/platform/content/help-articles
POST   /v1/platform/content/help-articles
PATCH  /v1/platform/content/help-articles/{id}
DELETE /v1/platform/content/help-articles/{id}

GET    /v1/platform/config/countries
POST   /v1/platform/config/countries
PATCH  /v1/platform/config/countries/{code}
GET    /v1/platform/config/feature-flags
PATCH  /v1/platform/config/feature-flags/{key}

GET    /v1/platform/team
POST   /v1/platform/team/invite
PATCH  /v1/platform/team/{id}
DELETE /v1/platform/team/{id}

GET    /v1/platform/audit                   # Platform-wide audit log
GET    /v1/platform/system/status           # Health, errors, etc.
```

### 16.2 Merchant API (`/v1/merchant/*`)

Auth: Merchant JWT (Telegram or email).

```
POST   /v1/merchant/auth/telegram-webapp    # Validate Telegram initData
POST   /v1/merchant/auth/telegram-widget    # Validate Telegram Login Widget
POST   /v1/merchant/auth/login              # Email + password
POST   /v1/merchant/auth/refresh
POST   /v1/merchant/auth/logout

GET    /v1/merchant/me                      # Current user info
PATCH  /v1/merchant/me                      # Update profile

GET    /v1/merchant/tenants                 # User's tenants (multi-store)
POST   /v1/merchant/tenants                 # Create tenant (onboarding)
GET    /v1/merchant/tenants/{id}
PATCH  /v1/merchant/tenants/{id}            # Update store settings
POST   /v1/merchant/tenants/{id}/bot/register # Register bot with token
POST   /v1/merchant/tenants/{id}/bot/verify-channel # Verify bot is admin

GET    /v1/merchant/dashboard               # Today's KPIs
GET    /v1/merchant/dashboard/today-pulse   # Real-time pulse strip data
GET    /v1/merchant/dashboard/insights      # AI insights (cached 6h)
POST   /v1/merchant/dashboard/insights/{id}/dismiss # Dismiss insight
GET    /v1/merchant/dashboard/badges        # Attention badges for menu items

# Achievements
GET    /v1/merchant/achievements            # All achievements with locked/unlocked state
GET    /v1/merchant/achievements/{id}       # Achievement detail
POST   /v1/merchant/achievements/{id}/seen  # Mark unlock as seen by owner
POST   /v1/merchant/achievements/{id}/share # Generate share image + payload

# Streaks
GET    /v1/merchant/streaks                 # Current streaks (orders, active)
GET    /v1/merchant/streaks/{type}/calendar # 30-day calendar grid
POST   /v1/merchant/streaks/{type}/freeze   # Use freeze for today/upcoming
DELETE /v1/merchant/streaks/{type}/freeze/{date} # Cancel scheduled freeze

# News: NO API ENDPOINTS — see §7.12 (external Telegram channel approach)

# Subscription
GET    /v1/merchant/subscription            # Current state
POST   /v1/merchant/subscription/upgrade    # Upgrade plan
POST   /v1/merchant/subscription/cancel     # Cancel
POST   /v1/merchant/subscription/reactivate # Reactivate
GET    /v1/merchant/subscription/discounts  # Available conversion discounts (50% off trial ending, win-back, etc.)
POST   /v1/merchant/subscription/discounts/{campaign_id}/claim  # Claim discount → returns invoice URL
GET    /v1/merchant/subscription/invoices   # Past invoices

GET    /v1/merchant/products
POST   /v1/merchant/products
GET    /v1/merchant/products/{id}
PATCH  /v1/merchant/products/{id}
DELETE /v1/merchant/products/{id}
POST   /v1/merchant/products/bulk-update    # Bulk edit
POST   /v1/merchant/products/{id}/duplicate

GET    /v1/merchant/categories
POST   /v1/merchant/categories
PATCH  /v1/merchant/categories/{id}
DELETE /v1/merchant/categories/{id}
POST   /v1/merchant/categories/reorder

POST   /v1/merchant/upload/image            # Upload image to R2 (returns URL)
POST   /v1/merchant/upload/video

GET    /v1/merchant/stories
POST   /v1/merchant/stories
PATCH  /v1/merchant/stories/{id}
DELETE /v1/merchant/stories/{id}

GET    /v1/merchant/orders
GET    /v1/merchant/orders/{id}
PATCH  /v1/merchant/orders/{id}/status      # Advance status
POST   /v1/merchant/orders/{id}/cancel
POST   /v1/merchant/orders/{id}/picking-list # Premium

GET    /v1/merchant/customers
GET    /v1/merchant/customers/{id}
PATCH  /v1/merchant/customers/{id}          # Update notes, tags
POST   /v1/merchant/customers/{id}/loyalty/adjust # Manual adjustment

GET    /v1/merchant/returns
GET    /v1/merchant/returns/{id}
POST   /v1/merchant/returns/{id}/approve
POST   /v1/merchant/returns/{id}/reject
POST   /v1/merchant/returns/{id}/refund

GET    /v1/merchant/delivery-methods
POST   /v1/merchant/delivery-methods
PATCH  /v1/merchant/delivery-methods/{id}
DELETE /v1/merchant/delivery-methods/{id}

GET    /v1/merchant/payment-methods
PATCH  /v1/merchant/payment-methods/{provider} # Configure provider
POST   /v1/merchant/payment-methods/{provider}/test # Test connection

GET    /v1/merchant/coupons
POST   /v1/merchant/coupons
PATCH  /v1/merchant/coupons/{id}
DELETE /v1/merchant/coupons/{id}

GET    /v1/merchant/mailings
POST   /v1/merchant/mailings                # Create mailing
POST   /v1/merchant/mailings/{id}/send      # Send now
POST   /v1/merchant/mailings/{id}/cancel    # Cancel scheduled
GET    /v1/merchant/mailings/{id}/stats     # Delivery stats

GET    /v1/merchant/abandoned-carts
POST   /v1/merchant/abandoned-carts/{id}/send-recovery

GET    /v1/merchant/loyalty/program
PATCH  /v1/merchant/loyalty/program
GET    /v1/merchant/loyalty/customers

GET    /v1/merchant/referrals/program
PATCH  /v1/merchant/referrals/program
GET    /v1/merchant/referrals/list

GET    /v1/merchant/channel-crossposting/config
PATCH  /v1/merchant/channel-crossposting/config
POST   /v1/merchant/channel-crossposting/post  # Manual post

GET    /v1/merchant/analytics/overview
GET    /v1/merchant/analytics/sales
GET    /v1/merchant/analytics/funnel
GET    /v1/merchant/analytics/products
GET    /v1/merchant/analytics/customers
GET    /v1/merchant/analytics/traffic-sources
GET    /v1/merchant/analytics/cohorts
GET    /v1/merchant/analytics/returns
GET    /v1/merchant/analytics/viral             # Top shared products, share-to-order conversion, top sharers (Business+)
POST   /v1/merchant/analytics/export        # Excel export

POST   /v1/merchant/ai/extract-products     # From photos
POST   /v1/merchant/ai/transcribe-voice
POST   /v1/merchant/ai/generate-description
POST   /v1/merchant/ai/generate-mailing
POST   /v1/merchant/ai/process-photo
POST   /v1/merchant/ai/seller-assistant     # Chat with AI

GET    /v1/merchant/ai-imports
GET    /v1/merchant/ai-imports/{id}         # Check status of batch import

GET    /v1/merchant/team
POST   /v1/merchant/team/invite
PATCH  /v1/merchant/team/{id}
DELETE /v1/merchant/team/{id}
PATCH  /v1/merchant/team/{id}/notifications # Notification preferences

GET    /v1/merchant/subscription
POST   /v1/merchant/subscription/upgrade
POST   /v1/merchant/subscription/downgrade
POST   /v1/merchant/subscription/cancel
POST   /v1/merchant/subscription/reactivate
GET    /v1/merchant/subscription/invoices
GET    /v1/merchant/subscription/invoices/{id}/pdf

# Public API tokens: NOT in v1 (was Enterprise feature)
POST   /v1/merchant/api-tokens
DELETE /v1/merchant/api-tokens/{id}

GET    /v1/merchant/webhooks/{id}/deliveries

GET    /v1/merchant/audit-log
```

### 16.3 Storefront API (`/v1/storefront/*`)

Auth: Buyer JWT (from initData) OR raw initData on each request.

```
# Auth & access
POST   /v1/storefront/auth/init             # Validate initData, get JWT
GET    /v1/storefront/{tenant_slug}         # Storefront home (catalog overview)
GET    /v1/storefront/{tenant_slug}/access  # Check channel subscription gate

# Catalog (Home + Catalog tabs)
GET    /v1/storefront/{tenant_slug}/products              # List with filters
GET    /v1/storefront/{tenant_slug}/products/{id}         # Detail
GET    /v1/storefront/{tenant_slug}/products/search       # Search query
GET    /v1/storefront/{tenant_slug}/categories
GET    /v1/storefront/{tenant_slug}/stories
POST   /v1/storefront/{tenant_slug}/stories/{id}/view     # Track view
GET    /v1/storefront/{tenant_slug}/recommendations       # Personalized (Premium)
GET    /v1/storefront/{tenant_slug}/recently-viewed       # Customer's recent

# Cart
GET    /v1/storefront/{tenant_slug}/cart
POST   /v1/storefront/{tenant_slug}/cart/items
PATCH  /v1/storefront/{tenant_slug}/cart/items/{id}
DELETE /v1/storefront/{tenant_slug}/cart/items/{id}
POST   /v1/storefront/{tenant_slug}/cart/apply-coupon
DELETE /v1/storefront/{tenant_slug}/cart/coupon

# Wishlist (Profile → Wishlist)
GET    /v1/storefront/{tenant_slug}/wishlist             # List items
POST   /v1/storefront/{tenant_slug}/wishlist/{product_id} # Add product
DELETE /v1/storefront/{tenant_slug}/wishlist/{product_id} # Remove
GET    /v1/storefront/{tenant_slug}/wishlist/contains/{product_id} # Check if in wishlist

# Checkout & Orders
POST   /v1/storefront/{tenant_slug}/checkout/validate # Pre-validate before submit
POST   /v1/storefront/{tenant_slug}/orders            # Create order
GET    /v1/storefront/{tenant_slug}/orders            # My orders list
GET    /v1/storefront/{tenant_slug}/orders/{id}
POST   /v1/storefront/{tenant_slug}/orders/{id}/cancel
POST   /v1/storefront/{tenant_slug}/orders/{id}/upload-payment-proof # Manual transfer
POST   /v1/storefront/{tenant_slug}/orders/{id}/rate   # Rate completed order

# Returns
GET    /v1/storefront/{tenant_slug}/returns           # My returns list
POST   /v1/storefront/{tenant_slug}/returns           # Create return
GET    /v1/storefront/{tenant_slug}/returns/{id}

# Profile (My Account)
GET    /v1/storefront/{tenant_slug}/profile           # Customer profile
PATCH  /v1/storefront/{tenant_slug}/profile           # Update fields
POST   /v1/storefront/{tenant_slug}/profile/avatar    # Upload custom avatar
DELETE /v1/storefront/{tenant_slug}/profile/avatar    # Reset to Telegram avatar
GET    /v1/storefront/{tenant_slug}/profile/stats     # Orders count, total spent
POST   /v1/storefront/{tenant_slug}/profile/share-contact  # Receive Telegram requestContact response (HMAC-verified)

# Loyalty (Business+ tenant)
GET    /v1/storefront/{tenant_slug}/loyalty/account
GET    /v1/storefront/{tenant_slug}/loyalty/transactions
GET    /v1/storefront/{tenant_slug}/loyalty/program-info  # tier benefits, rates

# Referral
GET    /v1/storefront/{tenant_slug}/referrals/program     # Program rules (rewards, min order)
GET    /v1/storefront/{tenant_slug}/referrals/my-code     # My code + share link
GET    /v1/storefront/{tenant_slug}/referrals/my-stats    # Invited count, completed, earned
GET    /v1/storefront/{tenant_slug}/referrals/invited     # List of invited friends
POST   /v1/storefront/{tenant_slug}/referrals/use         # Apply referral code (for referee)

# Product sharing (viral mechanic — see §9.3.5)
POST   /v1/storefront/{tenant_slug}/products/{id}/share-intent  # Returns share_id + deep_link + referral_code
POST   /v1/storefront/{tenant_slug}/shares/{share_id}/click     # Track when deep link is opened
GET    /v1/storefront/{tenant_slug}/shares/my-history           # My share history with attribution

# About store
GET    /v1/storefront/{tenant_slug}/store-info       # Store profile for About page

# Privacy
POST   /v1/storefront/{tenant_slug}/profile/privacy/export   # Request data export (async)
POST   /v1/storefront/{tenant_slug}/profile/privacy/delete   # Delete profile (anonymize)
GET    /v1/storefront/{tenant_slug}/profile/privacy/exports  # List pending exports

# Help articles (public knowledge base from platform)
GET    /v1/storefront/{tenant_slug}/help/articles
GET    /v1/storefront/{tenant_slug}/help/articles/{slug}

# AI
POST   /v1/storefront/{tenant_slug}/ai/chat           # AI consultant (Premium tenant)
GET    /v1/storefront/{tenant_slug}/ai/recommendations # Recommended for me (Premium tenant)

# Events tracking
POST   /v1/storefront/{tenant_slug}/events            # Track analytics event
POST   /v1/storefront/{tenant_slug}/products/{id}/view # Track product view (for recently viewed)
```

### 16.4 Public API (`/v1/api/*`) — NOT in v1

Public API was originally Enterprise-tier. Removed entirely from v1 scope. May return in v1.5+ as paid add-on if merchants request programmatic access.

*Original spec removed; can be reconstructed from git history if/when needed.*

--- DEPRECATED SECTION BELOW ---

Auth: API token (Bearer).

```
GET    /v1/api/products
GET    /v1/api/products/{id}
POST   /v1/api/products
PATCH  /v1/api/products/{id}
DELETE /v1/api/products/{id}

GET    /v1/api/orders
GET    /v1/api/orders/{id}
PATCH  /v1/api/orders/{id}/status

GET    /v1/api/customers
GET    /v1/api/customers/{id}

GET    /v1/api/analytics/summary
GET    /v1/api/analytics/orders
GET    /v1/api/analytics/products
```

OpenAPI spec at `https://api.dokonly.com/v1/api/docs`.

### 16.5 Webhooks (`/v1/webhooks/*`)

Incoming webhooks from external services.

```
POST   /v1/webhooks/telegram/{bot_token_hash}   # Telegram updates
POST   /v1/webhooks/click/{tenant_id}           # Click callbacks
POST   /v1/webhooks/payme/{tenant_id}           # Payme JSON-RPC
POST   /v1/webhooks/stripe                      # Stripe (future)
```

### 16.6 Public Endpoints (`/v1/public/*`)

No auth required.

```
GET    /v1/public/health                    # Health check
GET    /v1/public/version                   # API version
GET    /v1/public/prices                    # Subscription pricing for landing
GET    /v1/public/help-articles             # Public knowledge base
GET    /v1/public/help-articles/{slug}
```

### 16.7 WebSocket (`/ws`)

```
WS     /ws?token=<jwt>                      # Establish connection
```

Server-sent event types defined in Section 11.1.

### 16.8 Error Response Format

All errors return standardized JSON:

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "You have reached your plan's product limit (250)",
    "details": {
      "current": 250,
      "limit": 250,
      "feature": "product_count",
      "tier": "start"
    },
    "upgrade_url": "/billing/upgrade?to=business"
  },
  "request_id": "req_abc123"
}
```

Common error codes:
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (422)
- `PLAN_LIMIT_EXCEEDED` (402)
- `AI_BUDGET_EXCEEDED` (402)
- `RATE_LIMITED` (429)
- `BOT_API_ERROR` (502)
- `PROVIDER_ERROR` (502)
- `INTERNAL_ERROR` (500)

---

## 17. Implementation Order

This section ties everything together: what to build first, dependencies between features, parallel work streams. Reference this alongside `implementation_plan.md` (16-week phased plan).

### 17.1 Build Order Principles

1. **Foundations first** — design system, infra, auth must work before features
2. **Tenant + Bot before everything else** — without tenants, nothing has context
3. **Catalog before Orders** — can't order what doesn't exist
4. **Manual flows before automated** — manual payments before Click/Payme integration
5. **Mobile UI before Web** — mobile is primary, web is enhancement
6. **Build all three sides together for each feature** — when building Orders, build merchant view + buyer view + platform view together

### 17.2 Dependency Graph

```
Phase 1: Foundations
   ├─ Monorepo setup
   ├─ Design system (packages/ui)
   ├─ Shared utilities (packages/shared)
   ├─ Telegram WebApp SDK (packages/tg-webapp)
   ├─ Backend skeleton (FastAPI + DB)
   └─ All 4 frontend apps with empty layouts

Phase 2: Identity & Tenants ────► requires Phase 1
   ├─ Platform auth (ops.dokonly.com login)
   ├─ Merchant auth (Telegram + email)
   ├─ Buyer auth (initData)
   ├─ Tenants CRUD
   ├─ Onboarding wizard
   └─ Bot registration flow

Phase 3: Catalog ──────────────► requires Phase 2
   ├─ Categories CRUD
   ├─ Products CRUD (all fields, variants, attributes)
   ├─ R2 image upload
   ├─ R2 video upload
   ├─ Store templates application
   ├─ Buyer-side product browsing
   ├─ Bulk edit (merchant)
   ├─ Stories
   └─ Excel/CSV import (no AI yet)

Phase 4: Cart & Checkout ──────► requires Phase 3
   ├─ Cart system (storefront)
   ├─ Cart persistence in DB
   ├─ Checkout flow (storefront)
   ├─ Delivery methods CRUD
   ├─ Coupons CRUD
   ├─ Customer auto-create from checkout
   └─ Order creation (no payment yet)

Phase 5: Simple Payments ──────► requires Phase 4
   ├─ PaymentProvider ABC
   ├─ ManualTransferProvider
   ├─ CashOnDeliveryProvider
   ├─ TelegramStarsProvider
   ├─ Payment configuration UI (merchant)
   └─ Payment method selection (storefront)

Phase 6: Orders ───────────────► requires Phase 5
   ├─ Order management (merchant)
   ├─ Status funnel (5 stages)
   ├─ Mobile tabs+swipe UX
   ├─ Web Kanban
   ├─ Order forwarding to Telegram group
   ├─ Customer-side order tracking
   └─ Bot notifications

Phase 7: External Payments ───► requires Phase 6 (and external dependencies)
   ├─ Click integration
   ├─ Payme integration
   ├─ Direct cards (when bank ready)
   ├─ Alif/Uzum Nasiya (when partnership ready)
   └─ Refund flows

Phase 8: AI Features ─────────► requires Phase 3
   ├─ AIRouter infrastructure
   ├─ Cost tracking + budgets
   ├─ AI photo import
   ├─ AI voice import
   ├─ Telegram channel import
   ├─ AI description generation
   ├─ AI consultant (buyer)
   ├─ AI seller assistant (merchant)
   ├─ AI recommendations (buyer)
   └─ AI photo processing

Phase 9: CRM & Returns ───────► requires Phase 6
   ├─ Customer detail page (CRM)
   ├─ Segments calculation
   ├─ Returns flow (customer side)
   └─ Returns management (merchant side)

Phase 10: Marketing & Loyalty ► requires Phase 6, 9
   ├─ Mass mailings with segmentation
   ├─ Abandoned cart recovery
   ├─ Loyalty program
   ├─ Referral program
   ├─ Channel crossposting
   └─ Picking checklist (Premium)

Phase 11: Analytics ──────────► requires data from Phase 6+
   ├─ Event tracking system
   ├─ Sales funnel
   ├─ Traffic sources
   ├─ Cohort retention
   ├─ Product analytics
   ├─ Customer analytics
   └─ Excel export

Phase 12: Team & Subscriptions
   ├─ Team management (merchant)
   ├─ Roles & permissions enforcement
   ├─ Subscription system
   ├─ Plan limits enforcement
   ├─ Trial flow
   ├─ Billing
   └─ Audit log

Phase 13: Platform Ops (parallel to merchant work)
   ├─ Platform dashboard
   ├─ Tenants management
   ├─ Subscriptions & billing tools
   ├─ Support tickets
   ├─ Content management
   ├─ Platform analytics
   ├─ Impersonation
   └─ Audit logs

Phase 14: NOT IN V1 (was Enterprise — removed)
   ├─ API access
   ├─ Webhooks (outgoing)
   ├─ Telegram Business integration
   └─ SLA tracking

Phase 15: Polish & Launch
   ├─ Performance optimization
   ├─ Error states everywhere
   ├─ Empty states
   ├─ Onboarding tours
   ├─ Help center
   ├─ Customer Discovery beta
   └─ Final QA
```

### 17.3 Parallel Work Streams

While main development proceeds linearly through phases, these tracks run in parallel:

**Track A: Legal & Partnerships** (Weeks 1-12)
- IT Park IP registration
- Click merchant account
- Payme merchant account
- Acquiring bank for cards
- Alif partnership
- Uzum Nasiya partnership

**Track B: Brand & Marketing** (Weeks 1-16)
- Logo finalization
- Brand book
- dokonly.uz landing
- Demo video
- Comparison page Dokonly vs Sellz
- Social media content

**Track C: Customer Discovery** (Continuous)
- Recruit 10 beta sellers
- Weekly user interviews
- Iterate on feedback
- Beta testing weeks 12-16

**Track D: Content & Education** (Weeks 8-16)
- Knowledge base articles (20+)
- Video tutorials (5-10)
- FAQ comprehensive
- Help center translations

### 17.4 First Implementation Steps for Claude Code

When starting the project, in order:

**Day 1:**
1. `pnpm init` in repo root
2. Setup Turborepo
3. Create `packages/ui` with base components (Button, Input, Card)
4. Create `packages/shared` with types
5. Create `packages/tg-webapp` with SDK hooks
6. Setup design tokens (CSS variables) per `design.md`

**Day 2:**
1. Setup `apps/api` with FastAPI + uv
2. Setup Supabase project, run initial migrations
3. Setup `.env.example` with all variables
4. Docker Compose for local Postgres + Redis
5. Create base FastAPI app with health endpoint

**Day 3:**
1. Setup `apps/miniapp` (Vite + React + TS)
2. Setup `apps/dashboard`
3. Setup `apps/ops`
4. Setup `apps/storefront`
5. Setup `apps/marketing` (Astro)
6. All apps showing "Hello world" with design system

**Day 4-5:**
1. Implement design system theme toggle (light/dark)
2. Setup i18next in all React apps
3. Implement Telegram BackButton + MainButton hooks
4. Setup TanStack Query for API calls

**Week 1 (rest):**
1. Implement platform auth (`/v1/platform/auth/login`)
2. Build login page in `apps/ops`
3. Create first platform user via script
4. Test auth flow end-to-end

**Week 2:**
1. Database migrations for all core tables
2. RLS policies setup
3. Tenant CRUD endpoints
4. Onboarding wizard UI in `apps/miniapp`
5. Bot registration validation

Each subsequent feature follows pattern:
1. Database migrations
2. API endpoints (merchant + platform + storefront as needed)
3. UI in mobile (`apps/miniapp` or `apps/storefront`)
4. UI in web (`apps/dashboard` or `apps/ops`)
5. Tests

### 17.5 Feature Acceptance Criteria

Every feature must satisfy before merging:

**Functional:**
- [ ] Works end-to-end across all three sides where applicable
- [ ] Tier gating correct (feature flag respected)
- [ ] Mobile UI matches design system
- [ ] Web UI matches design system
- [ ] Empty states present
- [ ] Loading states present
- [ ] Error states present

**Technical:**
- [ ] Tests added (unit for logic, e2e for flows)
- [ ] Migration committed
- [ ] No hardcoded strings (all via i18n)
- [ ] No hardcoded currencies (uses `tenant.currency`)
- [ ] RLS policies updated if new tables
- [ ] Sentry instrumentation
- [ ] PostHog event tracking

**Quality:**
- [ ] Tested on 375px viewport
- [ ] Tested in both themes
- [ ] Keyboard navigation works
- [ ] Performance: p95 latency <500ms for API
- [ ] No console errors in browser

### 17.6 What NOT to Build Yet

These are intentionally deferred (post-launch v1.1+):

- Mobile native apps (iOS/Android) — Mini App + PWA covers v1
- Marketplace / merchant discovery
- Reviews/ratings publishing
- Live chat between merchant and customer (use Telegram DM)
- Advanced inventory (multi-location, batches, expiry)
- A/B testing for mailings
- SMS integration (Eskiz, Playmobile)
- Email marketing campaigns (different from transactional)
- Fiscalization (Soliq.uz) — major external dependency
- Cryptocurrency payments
- Custom domains for storefronts
- Subcategories (1-level deep is fine for v1)
- Public API at any tier (removed entirely from v1)

### 17.7 Success Metrics by Phase

**End of Phase 4 (Catalog + Cart):**
- Can create test merchant
- Can add 10 products
- Can browse as buyer
- Can add to cart

**End of Phase 6 (Simple Orders):**
- Can place an order with Cash on Delivery
- Order appears in merchant dashboard
- Merchant can advance status
- Buyer sees status updates

**End of Phase 8 (AI Features):**
- Can import 10 products from photos in < 1 minute
- AI consultant responds in < 5 seconds

**End of Phase 12 (Subscriptions):**
- Can sign up with trial
- Trial expires correctly
- Upgrade flow works
- Plan limits enforced

**End of Phase 15 (Launch Ready):**
- 10 beta sellers actively using
- Zero critical bugs in Sentry
- Lighthouse score >90 on Mini App
- All sides (platform/merchant/buyer) work seamlessly

---

## Appendix A: Quick Reference Index

For Claude Code: when working on specific features, reference these sections:

| Working on... | Read... |
|---|---|
| Onboarding new merchant | §7.3, §10.1, §14.3 |
| Adding products | §7.4, §12.3, §16.2 |
| Order management | §7.5, §10.2, §11.2 |
| Payments | §13, §10.3 |
| AI features | §12, §10.7 |
| CRM | §7.6, §9.7 |
| Marketing | §7.7, §10.6 |
| Analytics | §7.8 |
| Platform ops | §6 |
| Buyer storefront | §9 |
| Database changes | §5 |
| API endpoints | §16 |
| Real-time updates | §11.1 |
| Bot infrastructure | §14 |
| Repository structure | §15 |

---

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **Platform Owner** | Dokonly team (you + future employees) |
| **Merchant** | Store owner using Dokonly to run their Telegram store |
| **Buyer** | End customer purchasing from a merchant's store |
| **Tenant** | A merchant's store record in our system (one tenant = one store) |
| **Multi-store** | One merchant having multiple separate stores (Premium feature) |
| **Mini App** | Telegram Web App (runs inside Telegram bot) |
| **Storefront** | The Mini App that buyers see (per-tenant) |
| **Admin Mini App** | The Mini App that merchants use to manage their store |
| **Bot** | The Telegram bot for a specific merchant store |
| **Master Bot** | DokonlyBot (@DokonlyBot) — used for initial signup |
| **Webhook** | URL where external services (Telegram, Click, Payme) send events |
| **Provider** | Payment service (Click, Payme, Stars, etc.) |
| **RLS** | Row-Level Security (Postgres feature) for tenant isolation |
| **JWT** | JSON Web Token for authentication |
| **R2** | Cloudflare's S3-compatible object storage |
| **ARQ** | Async task queue for Python (Redis-backed) |
| **Sphere** | Business category template (Fashion, Electronics, etc.) — see Section 8 of plan.md |

---

## Appendix C: Cross-References to Other Docs

This document focuses on **what to build**. Reference these for other concerns:

- **Strategy & vision:** `plan.md` — Why Dokonly, market analysis, competition
- **Visual design:** `design.md` — Colors, typography, components, themes, patterns
- **Timeline:** `implementation_plan.md` — 16-week phased plan with parallel tracks
- **Pricing source of truth:** `dokonly_pricing_builder.html` — All tiers and limits

---

**End of Application Specification**

Version: 1.0
Last updated: May 2026
Status: Living document — update as decisions evolve

