# Dokonly Design System

> **Single source of truth for UI/UX in the Dokonly project.**
>
> This document defines design principles, tokens, components, and patterns used across all Dokonly applications (Telegram Mini App, Web Dashboard, Marketing site). Reference this file when building any UI.
>
> Located at `docs/design.md`. Reference in Claude Code via `@docs/design.md`.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Foundations](#2-foundations)
   - 2.1 Color System
   - 2.2 Typography
   - 2.3 Spacing & Sizing
   - 2.4 Border Radius
   - 2.5 Shadows & Elevation
   - 2.6 Motion & Animation
   - 2.7 Icons
3. [Components](#3-components)
4. [Patterns](#4-patterns)
5. [Layouts](#5-layouts)
6. [Theme System](#6-theme-system)
7. [Mobile-First Guidelines](#7-mobile-first-guidelines)
8. [Telegram-Native Patterns](#8-telegram-native-patterns)
9. [Globalization](#9-globalization)
10. [Accessibility](#10-accessibility)
11. [Tailwind Configuration](#11-tailwind-configuration)
12. [Code Conventions](#12-code-conventions)
13. [Do's and Don'ts](#13-dos-and-donts)

---

## 1. Design Principles

These principles guide every design decision. When in doubt, reference these.

### 1.1 Mobile-first, always

Every feature is designed for 375px width first, then adapted for larger screens. Web is an extension for power users, not the default. Acceptance criteria for any new UI:

- Works on 375px width without horizontal scroll
- Usable with one hand (primary actions in bottom 60% of viewport)
- No hover-dependent interactions
- Touch targets minimum 44×44px
- Single-tap actions (no precision required)

### 1.2 Telegram-native feel

The Mini App should feel like part of Telegram, not a website embedded in Telegram. This means:

- Use Telegram Theme Variables (`var(--tg-theme-*)`)
- Use Telegram MainButton for primary actions (not custom bottom buttons)
- Use Telegram BackButton for navigation (not custom ← in header)
- Use bottom sheets, not centered modals
- iOS-style toggle switches (green when on)
- Rounded buttons (12-14px radius)
- System font fallback
- Haptic feedback for important actions

### 1.3 Dual theme as a first-class citizen

Every component must work in both light and dark themes. No exceptions. Theme switching is smooth, with persistence via localStorage. Both themes feel equally intentional, not "light with dark variant added later."

### 1.4 Confident minimalism

Inspired by Linear, Vercel, Stripe Dashboard. Not:
- Узбекистанский орнамент (no ethnic patterns)
- Gradient backgrounds
- Cute illustrations or mascots
- Material Design 3 colorful look
- Bootstrap-generic UI

Yes:
- Generous whitespace
- Sharp typography
- Single accent color (green)
- Purposeful use of every visual element
- Clear visual hierarchy through scale and weight, not color

### 1.5 Globalization-ready

Every UI string goes through `t('key')`. Every monetary value displays with proper currency formatting based on tenant. Every date/time uses locale formatting. No hardcoded "UZS" or "сум" anywhere.

### 1.6 Performance is a feature

- Mobile-first means slow-network-first
- Skeleton loaders, not spinners
- Optimistic UI updates where safe
- Lazy load images (WebP/AVIF)
- Code-split routes
- Avoid layout shift

### 1.7 Honest empty states

Empty states are opportunities, not voids. "No products yet" becomes "Add your first product to start selling — try AI import to add 10 at once."

---

## 2. Foundations

### 2.1 Color System

All colors are defined as CSS custom properties. Components reference tokens, never raw hex values.

#### Light Theme Tokens

```css
:root[data-theme="light"] {
  /* Surfaces */
  --bg: #FAFAFA;
  --card: #FFFFFF;
  --subtle: #F4F4F5;
  --elevated: #FFFFFF;
  --overlay: rgba(9, 9, 11, 0.4);

  /* Text */
  --ink: #09090B;            /* Primary text */
  --ink-strong: #000000;     /* Headings */
  --muted: #71717A;          /* Secondary text */
  --muted-strong: #52525B;   /* Labels, small text */
  --disabled: #A1A1AA;       /* Disabled text */
  --inverse: #FAFAFA;        /* Text on dark backgrounds */

  /* Borders & Dividers */
  --border: #E4E4E7;
  --border-strong: #D4D4D8;
  --divider: #F4F4F5;

  /* Accent (Primary - Green) */
  --accent: #00B383;
  --accent-hover: #009970;
  --accent-active: #00805C;
  --accent-soft: #ECFDF5;
  --accent-soft-hover: #D1FAE5;
  --accent-ink: #064E3B;     /* Text on accent-soft */

  /* Semantic */
  --danger: #DC2626;
  --danger-soft: #FEE2E2;
  --warning: #D97706;
  --warning-soft: #FEF3C7;
  --success: #00B383;
  --success-soft: #ECFDF5;
  --info: #2563EB;
  --info-soft: #DBEAFE;

  /* Special */
  --focus-ring: rgba(0, 179, 131, 0.4);
}
```

#### Dark Theme Tokens

```css
:root[data-theme="dark"] {
  /* Surfaces */
  --bg: #09090B;
  --card: #141417;
  --subtle: #1C1C20;
  --elevated: #1F1F23;
  --overlay: rgba(0, 0, 0, 0.6);

  /* Text */
  --ink: #FAFAFA;
  --ink-strong: #FFFFFF;
  --muted: #A1A1AA;
  --muted-strong: #D4D4D8;
  --disabled: #52525B;
  --inverse: #09090B;

  /* Borders & Dividers */
  --border: #27272A;
  --border-strong: #3F3F46;
  --divider: #1C1C20;

  /* Accent (Primary - Brighter green for dark) */
  --accent: #00D199;
  --accent-hover: #00EBAB;
  --accent-active: #00FFBD;
  --accent-soft: rgba(0, 209, 153, 0.1);
  --accent-soft-hover: rgba(0, 209, 153, 0.15);
  --accent-ink: #00D199;

  /* Semantic */
  --danger: #F87171;
  --danger-soft: rgba(248, 113, 113, 0.1);
  --warning: #FBBF24;
  --warning-soft: rgba(251, 191, 36, 0.1);
  --success: #00D199;
  --success-soft: rgba(0, 209, 153, 0.1);
  --info: #60A5FA;
  --info-soft: rgba(96, 165, 250, 0.1);

  /* Special */
  --focus-ring: rgba(0, 209, 153, 0.5);
}
```

#### Color Usage Rules

**Surfaces (hierarchy from back to front):**
```
bg → card → elevated
       ↑
    subtle (for nested or muted backgrounds within card)
```

**Text on surfaces:**
- Headings: `--ink-strong`
- Body: `--ink`
- Captions: `--muted-strong`
- Helper text: `--muted`
- Disabled: `--disabled`

**Accent usage:**
- Primary buttons, primary CTAs
- Active states (selected tabs, active toggles)
- Links (subtle, only on hover)
- Badges for new/featured items
- NEVER use as decoration — accent must always indicate action or state

**Semantic colors:**
- `--danger`: destructive actions, errors, critical warnings
- `--warning`: cautions, expiring states, non-critical issues
- `--success`: positive feedback, completed states (often same as accent)
- `--info`: neutral informational messages

**Never use raw hex in components.** Always use tokens.

```tsx
// ❌ Wrong
<div className="bg-[#00B383]" />

// ✅ Right
<div className="bg-accent" />
```

#### Contrast Requirements

All text must meet WCAG AA contrast ratios:
- Body text on background: ≥ 4.5:1
- Large text (18pt+): ≥ 3:1
- UI elements (buttons, icons): ≥ 3:1

Our tokens are designed to meet these. If you need to use a custom color, verify with a contrast checker.

### 2.2 Typography

#### Font Families

```css
--font-display: 'Sora', system-ui, sans-serif;
--font-body: 'Outfit', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
--font-serif: 'Instrument Serif', Georgia, serif;
```

**Sora** — display headings, page titles. Weights: 600 (semibold), 700 (bold)

**Outfit** — body text, UI labels, buttons. Weights: 400, 500, 600

**JetBrains Mono** — numbers, prices, codes, identifiers. With tabular-nums for alignment.

**Instrument Serif** — italic accents, emotional emphasis. Use sparingly (max 1-2 per screen).

Load from Google Fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Outfit:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
```

#### Type Scale

Mobile-first scale. Sizes are absolute, line-heights are unitless multipliers.

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-2xs` | 11px | 1.4 | Tiny labels, timestamps |
| `text-xs` | 12px | 1.4 | Captions, small labels |
| `text-sm` | 13px | 1.5 | Secondary text, helper text |
| `text-base` | 15px | 1.5 | Body text (default) |
| `text-lg` | 17px | 1.4 | Emphasis body, large list items |
| `text-xl` | 20px | 1.3 | Small headings, card titles |
| `text-2xl` | 24px | 1.25 | Section headings |
| `text-3xl` | 30px | 1.2 | Page titles |
| `text-4xl` | 38px | 1.1 | Hero headings (landing) |
| `text-5xl` | 48px | 1.05 | Display headings (landing) |

#### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font-normal` | 400 | Body text default |
| `font-medium` | 500 | Emphasis within body, button labels |
| `font-semibold` | 600 | Headings, important labels |
| `font-bold` | 700 | Display headings only |

**Rule:** Never use `font-bold` (700) on body text. Use `font-semibold` (600) for emphasis. Reserve 700 for display/hero text.

#### Numbers and Prices

Always use JetBrains Mono for:
- Prices (`1 250 000 UZS`)
- Statistics (`+15%`)
- Order IDs (`#63IDO8BO38T2`)
- Counts (`243 customers`)

With `font-variant-numeric: tabular-nums` for tabular alignment in tables.

```tsx
<span className="font-mono tabular-nums">1 250 000 UZS</span>
```

#### Text Color Hierarchy

| Class | Token | Usage |
|-------|-------|-------|
| `text-ink-strong` | `--ink-strong` | Page titles, hero headings |
| `text-ink` | `--ink` | Body text (default) |
| `text-muted-strong` | `--muted-strong` | Subtitles, labels |
| `text-muted` | `--muted` | Captions, helper text, timestamps |
| `text-disabled` | `--disabled` | Disabled states |
| `text-accent` | `--accent` | Links, accent text |
| `text-danger` | `--danger` | Error messages |

### 2.3 Spacing & Sizing

8-point grid. All spacing values are multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0 | Reset |
| `space-1` | 4px | Tight spacing (icon + text) |
| `space-2` | 8px | Compact gaps, badges |
| `space-3` | 12px | Default gap (form fields) |
| `space-4` | 16px | Component padding (mobile) |
| `space-5` | 20px | Card padding |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Major section spacing |
| `space-10` | 40px | Page-level spacing |
| `space-12` | 48px | Hero spacing |
| `space-16` | 64px | Large hero (landing) |
| `space-20` | 80px | Section dividers (landing) |

#### Container Widths

| Token | Value | Usage |
|-------|-------|-------|
| `max-w-mobile` | 430px | Mobile Mini App max-width |
| `max-w-form` | 480px | Centered forms (auth, onboarding on web) |
| `max-w-prose` | 640px | Article content |
| `max-w-content` | 1200px | Main dashboard content |
| `max-w-screen` | 1440px | Full dashboard width |

#### Common Spacing Patterns

```tsx
// Card internal padding
<div className="p-5">           // 20px on mobile
<div className="p-5 sm:p-6">    // 20px mobile, 24px web

// Form field spacing
<div className="space-y-4">     // 16px between fields

// List item padding
<div className="px-4 py-3">     // 16px horizontal, 12px vertical

// Page padding (mobile)
<main className="px-4 py-6">    // 16px horizontal, 24px vertical
```

### 2.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0 | Reset |
| `rounded-sm` | 6px | Small chips, badges |
| `rounded` | 8px | Inputs (small), tags |
| `rounded-md` | 10px | Default for small elements |
| `rounded-lg` | 12px | Buttons, inputs (default) |
| `rounded-xl` | 14px | Cards (default) |
| `rounded-2xl` | 16px | Larger cards |
| `rounded-3xl` | 20px | Bottom sheets, prominent cards |
| `rounded-full` | 9999px | Pills, avatars, badges |

**Rule:** Use `rounded-lg` (12px) for most interactive elements (buttons, inputs). Use `rounded-xl` (14px) for cards.

### 2.5 Shadows & Elevation

#### Light Theme Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04);
--shadow-xl: 0 20px 32px rgba(0, 0, 0, 0.12), 0 8px 12px rgba(0, 0, 0, 0.06);
```

#### Dark Theme — Use Borders Instead

In dark mode, shadows are barely visible. Use subtle borders for elevation:

```css
:root[data-theme="dark"] {
  --shadow-sm: 0 0 0 1px rgba(255, 255, 255, 0.04);
  --shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
  --shadow-md: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 24px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 0 0 1px rgba(255, 255, 255, 0.12), 0 24px 48px rgba(0, 0, 0, 0.6);
}
```

#### Usage

- `shadow-sm` — subtle separation (rare)
- `shadow` — default for cards on background
- `shadow-md` — elevated cards (hover state on web, or "popped" cards)
- `shadow-lg` — modals, dropdowns, popovers
- `shadow-xl` — large overlays, prominent bottom sheets

### 2.6 Motion & Animation

#### Duration Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `duration-instant` | 100ms | Micro-interactions (button press) |
| `duration-fast` | 150ms | Hover states (web) |
| `duration-normal` | 200ms | Default transitions |
| `duration-slow` | 300ms | Page transitions, modal open |
| `duration-slower` | 500ms | Hero animations, celebrations |

#### Easing Functions

```css
--ease-linear: linear;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);          /* Default — smooth deceleration */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);      /* Symmetric, for back-and-forth */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* Slight bounce, for celebrations */
```

**Default for most UI:** `transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1)` (Tailwind's `transition duration-200 ease-out`).

#### Animation Patterns

```tsx
// Button press
className="active:scale-[0.98] transition-transform duration-100"

// Card hover (web only)
className="hover:shadow-md transition-shadow duration-150"

// Page enter
className="animate-in fade-in slide-in-from-bottom-2 duration-300"

// Modal/Sheet appear
className="animate-in slide-in-from-bottom duration-300 ease-out"

// Toast notification
className="animate-in slide-in-from-top fade-in duration-200"
```

#### Reduced Motion

Always respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2.7 Icons

Use **Lucide React** (`lucide-react`). Consistent stroke width: 2px. Default size: 20px (Tailwind `size-5`).

```tsx
import { ShoppingBag, Package, Users, TrendingUp } from 'lucide-react';

<ShoppingBag className="size-5 text-ink" />
```

#### Icon Sizing

| Class | Size | Usage |
|-------|------|-------|
| `size-4` | 16px | Inline with body text |
| `size-5` | 20px | Default UI icons |
| `size-6` | 24px | Navigation icons |
| `size-8` | 32px | Section icons |
| `size-10` | 40px | Empty state, hero icons |
| `size-12` | 48px | Major illustrations |

#### Emoji as Icons

For category icons and human-readable labels, use emoji directly:

```tsx
<div className="text-2xl">👗</div>  // Fashion category
```

Don't mix Lucide icons with emoji in the same row inconsistently. Emoji = "human/contextual", Lucide = "UI/functional".

---

## 3. Components

This section defines the core component library. All components live in `packages/ui/src/components/`. Each component must:

1. Support both light and dark themes (via CSS tokens)
2. Be keyboard-accessible (focus states, tab order)
3. Work on touch (44×44px min targets)
4. Be exported from `packages/ui/index.ts`
5. Have TypeScript types for props

### 3.1 Button

**Variants:** `primary`, `secondary`, `ghost`, `danger`, `link`

**Sizes:** `sm`, `md` (default), `lg`

**Props:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

**Implementation:**

```tsx
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        // Size
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-base',
        size === 'lg' && 'h-14 px-6 text-lg',
        // Variant
        variant === 'primary' && 'bg-accent text-inverse hover:bg-accent-hover focus-visible:ring-focus',
        variant === 'secondary' && 'bg-subtle text-ink hover:bg-border focus-visible:ring-focus',
        variant === 'ghost' && 'text-ink hover:bg-subtle focus-visible:ring-focus',
        variant === 'danger' && 'bg-danger text-inverse hover:opacity-90 focus-visible:ring-danger',
        variant === 'link' && 'text-accent hover:underline underline-offset-4 h-auto px-0',
        // Full width
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
}
```

**Usage:**

```tsx
<Button>Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="primary" fullWidth loading={isSaving}>Sign in</Button>
<Button variant="danger" icon={<Trash2 className="size-4" />}>Delete</Button>
<Button variant="link">Learn more</Button>
```

**Rules:**

- Primary button only ONE per screen/section (the main action)
- Use `secondary` for less important actions
- Use `ghost` for tertiary actions, toolbar buttons
- `danger` only for destructive actions (delete, cancel subscription)
- Full-width buttons on mobile for primary CTAs (or use Telegram MainButton)
- Min height 44px (md size = 44px) for touch
- Show loading state for any async action

### 3.2 Input

**Props:**

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}
```

**Implementation:**

```tsx
export function Input({
  label,
  helper,
  error,
  prefix,
  suffix,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || useId();

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-muted-strong">
          {label}
        </label>
      )}
      <div className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-card px-3 transition-colors',
        'focus-within:border-accent focus-within:ring-2 focus-within:ring-focus',
        error && 'border-danger focus-within:border-danger focus-within:ring-danger',
        props.disabled && 'opacity-50'
      )}>
        {prefix && <span className="text-muted">{prefix}</span>}
        <input
          id={inputId}
          className={cn(
            'flex-1 h-11 bg-transparent text-ink placeholder:text-muted outline-none',
            'disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {suffix && <span className="text-muted">{suffix}</span>}
      </div>
      {(helper || error) && (
        <p className={cn(
          'text-xs',
          error ? 'text-danger' : 'text-muted'
        )}>
          {error || helper}
        </p>
      )}
    </div>
  );
}
```

**Rules:**

- Always provide a label (use `sr-only` if hidden visually)
- Min height 44px for touch
- Show errors below the field (not as tooltip)
- Use `prefix`/`suffix` for currency symbols, units, search icons
- No floating labels (poor accessibility, hard to localize)

### 3.3 Card

**Props:**

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'elevated' | 'outlined';
  interactive?: boolean;
}
```

**Implementation:**

```tsx
export function Card({
  padding = 'md',
  variant = 'default',
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-150',
        // Variants
        variant === 'default' && 'bg-card shadow-sm',
        variant === 'subtle' && 'bg-subtle',
        variant === 'elevated' && 'bg-elevated shadow',
        variant === 'outlined' && 'bg-card border border-border',
        // Padding
        padding === 'none' && 'p-0',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-6',
        // Interactive
        interactive && 'cursor-pointer hover:shadow-md active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

**Usage:**

```tsx
<Card>
  <h3 className="text-lg font-semibold">Today's revenue</h3>
  <p className="font-mono text-3xl mt-2">1 250 000 UZS</p>
</Card>

<Card variant="outlined" interactive onClick={() => navigate(`/orders/${order.id}`)}>
  ...
</Card>
```

### 3.4 BottomSheet (Mobile) & Modal (Web)

**Both are the same component with different presentation modes.**

On mobile (<768px width or in Telegram Mini App): slides up from bottom.
On web: centered modal.

**Props:**

```tsx
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
}
```

**Implementation uses Radix UI Dialog primitive:**

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function Sheet({ open, onClose, title, description, size = 'md', children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(
          'fixed inset-0 z-40 bg-overlay backdrop-blur-sm',
          'data-[state=open]:animate-in data-[state=open]:fade-in',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out',
          'duration-200'
        )} />
        <Dialog.Content className={cn(
          'fixed z-50 bg-card shadow-xl',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 rounded-t-3xl pb-safe',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
          // Web: centered modal (md+)
          'sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:rounded-2xl sm:pb-0',
          'sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:fade-in',
          'sm:data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=closed]:fade-out',
          // Size
          size === 'sm' && 'sm:max-w-sm',
          size === 'md' && 'sm:max-w-md',
          size === 'lg' && 'sm:max-w-lg',
          size === 'full' && 'h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl',
          'duration-300 ease-out'
        )}>
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 rounded-full bg-border" />
          </div>

          {(title || description) && (
            <div className="px-5 pt-4 pb-2">
              {title && (
                <Dialog.Title className="text-xl font-semibold text-ink">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="text-sm text-muted mt-1">
                  {description}
                </Dialog.Description>
              )}
            </div>
          )}

          <div className="px-5 pb-5">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Rules:**

- NEVER use centered modals on mobile — always bottom sheets
- Include drag handle (1×12px bar at top) on mobile
- Use `pb-safe` to respect iPhone home indicator area
- Title is optional but recommended for accessibility
- Size `full` for complex forms or product editors

### 3.5 Tabs

**Props:**

```tsx
interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  items: TabItem[];
  variant?: 'underline' | 'pills' | 'segmented';
}

interface TabItem {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}
```

**Variants:**

**Underline** — default for mobile, full-width tabs with underline indicator:

```tsx
<Tabs variant="underline" value={status} onChange={setStatus} items={[
  { value: 'new', label: 'Новые', count: 3 },
  { value: 'preparing', label: 'Готовятся', count: 5 },
  { value: 'shipping', label: 'Доставка', count: 2 },
  { value: 'completed', label: 'Завершено' },
]} />
```

**Pills** — for filter chips, compact horizontal scrolling list

**Segmented** — iOS-style segmented control for binary/ternary choices

**Implementation (underline variant):**

```tsx
export function Tabs({ value, onChange, items, variant = 'underline' }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className="border-b border-border bg-bg sticky top-0 z-10">
        <div className="flex overflow-x-auto scrollbar-hide">
          {items.map((item) => {
            const active = item.value === value;
            return (
              <button
                key={item.value}
                onClick={() => onChange(item.value)}
                className={cn(
                  'flex-1 min-w-fit px-4 py-3 text-sm font-medium transition-colors relative',
                  'whitespace-nowrap flex items-center justify-center gap-2',
                  active ? 'text-ink' : 'text-muted hover:text-ink-strong'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-mono',
                    active ? 'bg-accent text-inverse' : 'bg-subtle text-muted-strong'
                  )}>
                    {item.count}
                  </span>
                )}
                {active && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  // ... pills, segmented variants
}
```

### 3.6 Toggle (iOS-style)

**Props:**

```tsx
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}
```

**Implementation:**

```tsx
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={cn(
      'flex items-center justify-between gap-4 cursor-pointer',
      disabled && 'opacity-50 cursor-not-allowed'
    )}>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <div className="text-base font-medium text-ink">{label}</div>}
          {description && <div className="text-sm text-muted mt-0.5">{description}</div>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
          checked ? 'bg-accent' : 'bg-border-strong'
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )} style={{ marginTop: '2px' }} />
      </button>
    </label>
  );
}
```

**Visual reference:** Looks identical to iOS Settings app toggles. Green when on (#00B383), gray when off.

### 3.7 Badge & Chip

**Badge** — small inline indicator (counts, statuses):

```tsx
<Badge>NEW</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="danger">Expired</Badge>
```

```tsx
interface BadgeProps {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', size = 'md', children }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      size === 'sm' && 'px-2 py-0.5 text-2xs',
      size === 'md' && 'px-2.5 py-1 text-xs',
      variant === 'default' && 'bg-subtle text-muted-strong',
      variant === 'accent' && 'bg-accent-soft text-accent-ink',
      variant === 'success' && 'bg-success-soft text-success',
      variant === 'warning' && 'bg-warning-soft text-warning',
      variant === 'danger' && 'bg-danger-soft text-danger',
      variant === 'info' && 'bg-info-soft text-info'
    )}>
      {children}
    </span>
  );
}
```

**Chip** — larger interactive selector (filter chips, tags):

```tsx
<Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
<Chip active={filter === 'featured'} onClick={() => setFilter('featured')}>Featured</Chip>
```

### 3.8 Avatar

```tsx
interface AvatarProps {
  src?: string;
  name?: string;     // For fallback initials
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const sizes = {
    xs: 'size-6 text-2xs',
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-12 text-base',
    xl: 'size-16 text-lg',
  };

  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className={cn(
      'rounded-full bg-subtle flex items-center justify-center overflow-hidden shrink-0',
      'font-medium text-muted-strong',
      sizes[size]
    )}>
      {src ? (
        <img src={src} alt={name || ''} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
```

### 3.9 List Item

Used for navigation menus, settings lists, order lists.

```tsx
interface ListItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;     // Custom trailing content
  trailingText?: string;           // Or simple text on the right
  showArrow?: boolean;             // Show chevron right
  onClick?: () => void;
  href?: string;
  badge?: number | string;
}

export function ListItem({ icon, title, subtitle, trailing, trailingText, showArrow, onClick, href, badge }: ListItemProps) {
  const Element = href ? 'a' : onClick ? 'button' : 'div';
  return (
    <Element
      onClick={onClick}
      href={href}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        (onClick || href) && 'hover:bg-subtle active:bg-border cursor-pointer',
      )}
    >
      {icon && (
        <div className="shrink-0 size-10 rounded-lg bg-subtle flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium text-ink truncate">{title}</div>
        {subtitle && (
          <div className="text-sm text-muted truncate mt-0.5">{subtitle}</div>
        )}
      </div>
      {badge !== undefined && (
        <Badge variant="accent" size="sm">{badge}</Badge>
      )}
      {trailingText && (
        <span className="text-sm text-muted">{trailingText}</span>
      )}
      {trailing}
      {showArrow && <ChevronRight className="size-5 text-muted shrink-0" />}
    </Element>
  );
}
```

### 3.10 Empty State

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      {emoji && <div className="text-5xl mb-4">{emoji}</div>}
      {icon && !emoji && (
        <div className="size-16 rounded-full bg-subtle flex items-center justify-center mb-4 text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
```

**Usage:**

```tsx
<EmptyState
  emoji="🛍"
  title="No products yet"
  description="Add your first product to start selling. Try AI import to add 10 at once."
  action={{ label: 'Add product', onClick: () => navigate('/products/new') }}
/>
```

### 3.11 Skeleton Loader

```tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'animate-pulse rounded bg-subtle',
      className
    )} />
  );
}
```

**Usage:**

```tsx
{isLoading ? (
  <div className="space-y-3">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
  </div>
) : (
  <ProductList products={products} />
)}
```

**Rule:** Always use skeleton loaders for content (lists, cards, text). Use spinners only for action feedback (button loading state).

### 3.12 Toast

Use `sonner` library (recommended) or custom. Mobile-friendly position: bottom on mobile, top-right on web.

```tsx
import { toast } from 'sonner';

toast.success('Product saved');
toast.error('Failed to save', { description: 'Check your connection and try again' });
toast.loading('Saving...');
```

**Toast styles override:**

```tsx
// In root layout
<Toaster
  position="top-center"
  toastOptions={{
    className: 'rounded-lg border border-border bg-card text-ink shadow-md',
    duration: 3000,
  }}
/>
```

---

## 4. Patterns

### 4.1 Forms

**Layout:**

- Single column on mobile (always)
- Max width `max-w-form` (480px) on web
- Vertical spacing between fields: `space-y-4` (16px)
- Labels above inputs, not floating
- Submit button at bottom, full-width on mobile

**Validation:**

- Validate on blur, not on every keystroke (annoying)
- Show errors below the field, inline with helper text style
- Use `aria-invalid` and `aria-describedby` for accessibility
- Disable submit button only when form has not been touched
- After submission attempt, show all errors at once

**Required vs Optional:**

- Mark optional fields with "(optional)" in label, not required with asterisk
- Reason: most fields ARE required, marking each adds noise

```tsx
<form className="space-y-4" onSubmit={handleSubmit}>
  <Input label="Product name" name="name" required />
  <Input label="Price" name="price" type="number" suffix="UZS" required />
  <Input label="Description (optional)" name="description" />

  <div className="flex gap-3 pt-2">
    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
    <Button type="submit" fullWidth loading={isSaving}>Save</Button>
  </div>
</form>
```

### 4.2 Lists

#### Infinite Scroll Pattern

For long lists (products, orders, customers). Use `react-intersection-observer` or similar.

```tsx
function ProductList() {
  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({...});
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage]);

  return (
    <div className="space-y-3">
      {data?.pages.flatMap(page => page.products).map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      {hasNextPage && <div ref={ref}><Skeleton className="h-20" /></div>}
    </div>
  );
}
```

#### Pull-to-Refresh

Use native pull-to-refresh in Telegram WebApp (already handled by Telegram) or library on web.

#### Swipe Actions (Mobile)

For lists where each item has actions (advance order status, delete, etc.). Use `react-swipeable-list` or custom.

```tsx
<SwipeableList>
  {orders.map(order => (
    <SwipeableItem
      key={order.id}
      onSwipeRight={() => advanceOrderStatus(order.id)}
      onSwipeLeft={() => openOrderActions(order.id)}
      rightAction={<div className="bg-accent text-inverse">Next status →</div>}
      leftAction={<div className="bg-info text-inverse">← Actions</div>}
    >
      <OrderCard order={order} />
    </SwipeableItem>
  ))}
</SwipeableList>
```

### 4.3 Navigation

#### Mobile Navigation

**Inside Telegram Mini App:**

- Use Telegram BackButton (via `window.Telegram.WebApp.BackButton`), not a custom ← in header
- Use Telegram MainButton for primary action of the screen
- Bottom navigation bar for top-level routes (Home, Catalog, Orders, Analytics, Settings)

```tsx
// Telegram BackButton hook
function useTelegramBackButton(onClick: () => void) {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.show();
    tg.BackButton.onClick(onClick);

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(onClick);
    };
  }, [onClick]);
}

// Telegram MainButton hook
function useTelegramMainButton({ text, onClick, color, disabled, loading }) {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);

    if (disabled) tg.MainButton.disable();
    else tg.MainButton.enable();

    if (loading) tg.MainButton.showProgress();
    else tg.MainButton.hideProgress();

    tg.MainButton.show();

    return () => tg.MainButton.hide();
  }, [text, onClick, disabled, loading]);
}
```

**Bottom Tab Bar component (for Mini App and PWA):**

```tsx
const tabs = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'catalog', label: 'Catalog', icon: Package, path: '/catalog' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/orders', badge: 3 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { id: 'more', label: 'More', icon: Menu, path: '/more' },
];

<nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border pb-safe">
  <div className="flex">
    {tabs.map(tab => (
      <NavLink
        key={tab.id}
        to={tab.path}
        className={({ isActive }) => cn(
          'flex-1 flex flex-col items-center gap-1 py-2 transition-colors',
          isActive ? 'text-accent' : 'text-muted'
        )}
      >
        <div className="relative">
          <tab.icon className="size-6" />
          {tab.badge && (
            <span className="absolute -top-1 -right-2 size-4 rounded-full bg-danger text-inverse text-2xs flex items-center justify-center">
              {tab.badge}
            </span>
          )}
        </div>
        <span className="text-2xs font-medium">{tab.label}</span>
      </NavLink>
    ))}
  </div>
</nav>
```

#### Web Navigation (Dashboard)

- Left sidebar (collapsible, persistent)
- Logo at top, nav items grouped logically
- User menu at bottom
- Breadcrumbs in main content header for deep nesting

```tsx
<aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
  <div className="p-5">
    <Logo />
  </div>
  <nav className="flex-1 px-3 space-y-1">
    {navItems.map(item => (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive ? 'bg-subtle text-ink' : 'text-muted hover:bg-subtle hover:text-ink'
        )}
      >
        <item.icon className="size-5" />
        <span>{item.label}</span>
        {item.badge && <Badge variant="accent" size="sm">{item.badge}</Badge>}
      </NavLink>
    ))}
  </nav>
  <div className="p-3 border-t border-border">
    <UserMenu />
  </div>
</aside>
```

### 4.4 Empty States

Every list, dashboard widget, and screen should have an empty state. See [Component 3.10](#310-empty-state). Use them consistently.

**Empty state hierarchy:**
1. **Encouraging primary CTA** — what to do next
2. **Brief explanation** — why this is empty / what this will be
3. **Optional secondary action** — alternative path (import, browse templates, etc.)

### 4.5 Loading States

**Page-level loading:** Full skeleton of page layout. Don't show "Loading..." text.

**Section loading:** Skeleton blocks matching final content shape.

**Action loading:** Button shows spinner inside, button disabled. Don't show separate modal.

**Background loading:** Toast or subtle inline indicator.

**Image loading:** Use `loading="lazy"` and `decoding="async"`. Placeholder bg with `bg-subtle`.

### 4.6 Error States

**Form errors:** Below the field, in `--danger` color.

**Section errors:** Card with red border, danger icon, message, and retry button.

```tsx
<Card variant="outlined" className="border-danger">
  <div className="flex items-start gap-3">
    <AlertCircle className="size-5 text-danger shrink-0 mt-0.5" />
    <div className="flex-1">
      <h4 className="font-medium text-ink">Couldn't load orders</h4>
      <p className="text-sm text-muted mt-1">Check your connection and try again.</p>
      <Button variant="secondary" size="sm" onClick={retry} className="mt-3">
        Try again
      </Button>
    </div>
  </div>
</Card>
```

**Page errors (404, 500):** Centered empty state with appropriate emoji and CTA.

### 4.7 Confirmation Patterns

**Destructive actions:** Always require confirmation via BottomSheet/Modal.

```tsx
<Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
  <h3 className="text-xl font-semibold mb-2">Delete product?</h3>
  <p className="text-muted mb-6">
    "{product.name}" will be permanently deleted. Existing orders are not affected.
  </p>
  <div className="flex gap-3">
    <Button variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>
      Cancel
    </Button>
    <Button variant="danger" fullWidth onClick={handleDelete}>
      Delete
    </Button>
  </div>
</Sheet>
```

**Non-destructive confirmations** (save, send): Just do it. Show success toast after.

**Unsaved changes:** Detect via form `isDirty` state. On navigation attempt, show confirmation.

---

## 5. Layouts

### 5.1 Mobile Mini App Layout

Telegram Mini App has specific constraints. The viewport adapts to Telegram's window.

**Structure:**

```
┌─────────────────────────┐
│  Telegram header        │  ← System (BackButton, Title)
├─────────────────────────┤
│                         │
│  Page content           │  ← Scrollable
│  (with safe top inset)  │
│                         │
│                         │
├─────────────────────────┤
│  Bottom Nav OR          │  ← Fixed
│  MainButton             │
└─────────────────────────┘
```

**Implementation:**

```tsx
// apps/miniapp/src/App.tsx
function App() {
  // Get Telegram theme + safe area
  const tg = window.Telegram?.WebApp;
  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, []);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 pb-20 pt-safe">
        {/* Content */}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
```

**Safe area helpers (Tailwind plugin or CSS):**

```css
.pt-safe { padding-top: env(safe-area-inset-top); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pl-safe { padding-left: env(safe-area-inset-left); }
.pr-safe { padding-right: env(safe-area-inset-right); }
```

**Page padding:**

```tsx
// Standard mobile page
<main className="px-4 py-6">
  {/* content */}
</main>
```

**Max width:**

Don't force `max-w-mobile` on Mini App — Telegram already constrains it. Only use max-width if running outside Telegram (browser preview).

### 5.2 Web Dashboard Layout

**Structure:**

```
┌──────────┬──────────────────────────────┐
│          │  Top bar (search, user menu) │
│          ├──────────────────────────────┤
│ Sidebar  │                              │
│          │  Page content                │
│          │  (with breadcrumbs)          │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

**Implementation:**

```tsx
// apps/dashboard/src/layouts/DashboardLayout.tsx
function DashboardLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <TopBar />
      <main className="ml-64 pt-16">
        <div className="max-w-content mx-auto px-8 py-6">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

**Responsive:** At <1024px, sidebar collapses to hamburger menu (rare for power-user dashboard).

### 5.3 Storefront Layout (Customer)

Customer-facing Mini App is even more constrained. Just product browsing and checkout.

```tsx
function StorefrontLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <StoreHeader />              {/* Logo, search, cart icon */}
      <main className="flex-1 pb-safe">
        <Outlet />
      </main>
      <FloatingCart />              {/* If cart has items */}
    </div>
  );
}
```

### 5.4 Landing Page Layout

```tsx
function MarketingLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingHeader />           {/* Logo, nav, CTA */}
      <main>
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
```

Sections use `max-w-screen` with internal `max-w-content` for text-heavy sections.

---

## 6. Theme System

### 6.1 Theme Implementation

Theme is controlled via `data-theme` attribute on root HTML element. CSS custom properties cascade.

**Setup:**

```tsx
// packages/ui/src/hooks/useTheme.ts
type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('dokonly-theme') as Theme) || 'system';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('dokonly-theme', newTheme);
    applyTheme(newTheme);
  };

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    const isDark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  };

  useEffect(() => {
    applyTheme(theme);

    // Listen to system theme changes if using 'system'
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  return { theme, setTheme };
}
```

**Theme Toggle Component:**

```tsx
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Cmd+J / Ctrl+J keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setTheme(isDark ? 'light' : 'dark');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDark, setTheme]);

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="size-10 rounded-full bg-card border border-border flex items-center justify-center transition-colors hover:bg-subtle"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
```

**Smooth Theme Transitions:**

```css
/* Apply globally for smooth theme switching */
:root {
  transition: background-color 250ms ease-out, color 250ms ease-out;
}

* {
  transition: background-color 250ms ease-out, border-color 250ms ease-out, color 250ms ease-out;
}

/* Disable transition during initial load to prevent flash */
.theme-transition-disabled,
.theme-transition-disabled * {
  transition: none !important;
}
```

Set initial theme in `<head>` to prevent FOUC:

```html
<script>
  (function() {
    const theme = localStorage.getItem('dokonly-theme') || 'system';
    const isDark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  })();
</script>
```

### 6.2 Telegram Theme Variables Integration

Inside Telegram Mini App, respect Telegram's theme by default:

```tsx
// Sync our theme with Telegram theme
function useSyncTelegramTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // Check Telegram's color scheme
    const tgTheme = tg.colorScheme; // 'light' or 'dark'
    setTheme(tgTheme);

    // Listen for theme changes from Telegram
    tg.onEvent('themeChanged', () => {
      setTheme(tg.colorScheme);
    });
  }, []);
}
```

**Optional:** Use Telegram's actual theme colors (matches user's Telegram skin):

```css
:root[data-theme="telegram"] {
  --bg: var(--tg-theme-bg-color, #FFFFFF);
  --card: var(--tg-theme-secondary-bg-color, #F4F4F5);
  --ink: var(--tg-theme-text-color, #09090B);
  --muted: var(--tg-theme-hint-color, #71717A);
  --accent: var(--tg-theme-button-color, #00B383);
  --link: var(--tg-theme-link-color, #00B383);
}
```

This is optional — by default we use our own theme so Dokonly looks consistent across Telegram themes.

---

## 7. Mobile-First Guidelines

### 7.1 Acceptance Criteria

Every UI must pass these before merging:

- [ ] Works at 375px viewport width without horizontal scroll
- [ ] Primary action reachable with thumb (bottom 60% of screen)
- [ ] All touch targets ≥ 44×44px
- [ ] No hover-dependent functionality
- [ ] Text readable without zoom at default browser settings
- [ ] Forms work with mobile keyboards (input modes, autocapitalize, autocomplete)
- [ ] Image rendering optimized for mobile bandwidth
- [ ] Works offline-ish (cached content visible, clear offline indicators)

### 7.2 Touch Targets

Minimum 44×44px (Apple HIG, WCAG 2.5.5). Easy way: button `size-md` is 44px tall by design.

For small icons (like a 16px close button), wrap in larger tappable area:

```tsx
<button className="size-11 flex items-center justify-center">  {/* 44px touch target */}
  <X className="size-4" />                                       {/* 16px visual */}
</button>
```

### 7.3 One-handed Use

**Primary actions in bottom 60%** of the screen. Top is for navigation/context only.

**Telegram MainButton** is the ideal — it's at the very bottom, large, native.

**For non-Telegram pages:** Use full-width primary button at bottom of form, or fixed bottom bar.

```tsx
<form className="pb-24"> {/* Space for fixed bottom button */}
  {/* form fields */}

  <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-card border-t border-border">
    <Button type="submit" fullWidth>Save</Button>
  </div>
</form>
```

### 7.4 Input Patterns

**Mobile keyboards:**

```tsx
<input type="email" inputMode="email" autoComplete="email" autoCapitalize="off" />
<input type="tel" inputMode="tel" autoComplete="tel" />
<input type="text" inputMode="numeric" pattern="[0-9]*" /> {/* For numbers without spinner */}
<input type="number" inputMode="decimal" /> {/* For prices */}
```

**Prevent zoom on input focus (iOS):** Use font-size ≥ 16px on inputs.

Already in our Input component (text-base = 15px... close enough with rem rounding, but verify on real device).

### 7.5 Handling Telegram WebApp APIs

```tsx
// Always check if running inside Telegram
const isTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;

// Haptic feedback
function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  if (['light', 'medium', 'heavy'].includes(type)) {
    tg.HapticFeedback.impactOccurred(type);
  } else {
    tg.HapticFeedback.notificationOccurred(type);
  }
}

// Use on important actions
<Button onClick={() => {
  hapticFeedback('success');
  handleSave();
}}>Save</Button>
```

---

## 8. Telegram-Native Patterns

### 8.1 MainButton

The big button at the bottom of Telegram Mini App. Native, not custom.

```tsx
useTelegramMainButton({
  text: 'Save product',
  onClick: handleSave,
  color: '#00B383', // Optional, defaults to Telegram theme
  textColor: '#FFFFFF',
  disabled: !isFormValid,
  loading: isSaving,
});
```

**Rule:** When a screen has one primary action, use MainButton. Don't add a redundant button in the page.

### 8.2 BackButton

Top-left native back button in Telegram. Use for navigation, NOT custom ← in header.

```tsx
useTelegramBackButton(() => {
  if (hasUnsavedChanges) {
    setShowConfirmDialog(true);
  } else {
    navigate(-1);
  }
});
```

### 8.3 Bottom Sheets Over Modals

On mobile, modals slide up from bottom (BottomSheet pattern). Never centered modals — they obscure the content the user is acting on and require precise tapping.

Use Sheet component (3.4) which handles this automatically based on viewport.

### 8.4 Telegram Theme Variables

If we choose to follow user's Telegram theme (rather than our own), reference:

```css
--tg-theme-bg-color
--tg-theme-text-color
--tg-theme-hint-color
--tg-theme-link-color
--tg-theme-button-color
--tg-theme-button-text-color
--tg-theme-secondary-bg-color
--tg-theme-header-bg-color
--tg-theme-accent-text-color
--tg-theme-section-bg-color
--tg-theme-section-header-text-color
--tg-theme-subtitle-text-color
--tg-theme-destructive-text-color
```

**Default decision:** We use OUR theme tokens (`--bg`, `--ink`, etc.) for consistency. Telegram theme is opt-in via settings.

### 8.5 Haptic Feedback

Use sparingly, only on meaningful actions:

- `light` — selection change, toggle
- `medium` — button press (rarely)
- `heavy` — significant action (rare)
- `success` — order placed, product saved
- `warning` — validation error
- `error` — failure, destructive action

---

## 9. Globalization

### 9.1 Localization (i18n)

**Library:** `i18next` + `react-i18next`

**Folder structure:**

```
apps/miniapp/src/locales/
├── uz/
│   ├── common.json
│   ├── onboarding.json
│   ├── catalog.json
│   └── orders.json
├── ru/
│   ├── common.json
│   ├── onboarding.json
│   ├── catalog.json
│   └── orders.json
├── en/
│   └── ...
```

**Setup:**

```tsx
// apps/miniapp/src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'onboarding', 'catalog', 'orders'],
  resources: {
    uz: { common: require('./locales/uz/common.json'), ... },
    ru: { common: require('./locales/ru/common.json'), ... },
    en: { common: require('./locales/en/common.json'), ... },
  },
  interpolation: { escapeValue: false },
});
```

**Usage:**

```tsx
import { useTranslation } from 'react-i18next';

function ProductCard({ product }) {
  const { t } = useTranslation('catalog');
  return (
    <Card>
      <h3>{product.name}</h3>
      <Button>{t('addToCart')}</Button>
    </Card>
  );
}
```

**Plurals:**

```json
{
  "productsCount_one": "{{count}} product",
  "productsCount_other": "{{count}} products",
  "productsCount_zero": "No products"
}
```

```tsx
{t('productsCount', { count: products.length })}
```

**Rules:**

- NEVER hardcode strings in components — always use `t('key')`
- One namespace per feature/route (`common`, `onboarding`, `catalog`, `orders`, `settings`, `analytics`)
- Use descriptive keys (`product.addToCart`, not `btn1`)
- For dynamic content (product names), use `name_translations` JSONB in DB

### 9.2 Currency Display

**Helper function:**

```tsx
// packages/shared/src/utils/currency.ts
export function formatCurrency(
  amount: number | string,
  currency: string,
  locale: string = 'ru-RU'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // For UZS, use no decimals (sum is always whole)
  const fractionDigits = ['UZS', 'KZT', 'KGS'].includes(currency) ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numericAmount);
}
```

**Usage:**

```tsx
<span className="font-mono tabular-nums">
  {formatCurrency(1250000, tenant.currency, locale)}
</span>
// → "1 250 000 ₽"  (for RUB)
// → "1 250 000 сум"  (for UZS with custom locale)
```

**For UZS specifically** (Intl doesn't have great UZS symbol):

```tsx
export function formatUZS(amount: number): string {
  const formatted = new Intl.NumberFormat('ru-RU').format(amount);
  return `${formatted} сум`;  // or 'so'm' for Uzbek
}
```

**Compact for headers** ("1.2M сум"):

```tsx
export function formatCurrencyCompact(amount: number, currency: string): string {
  if (amount < 1000) return `${amount} ${currency}`;
  if (amount < 1_000_000) return `${(amount / 1000).toFixed(1)}K ${currency}`;
  return `${(amount / 1_000_000).toFixed(1)}M ${currency}`;
}
```

### 9.3 Date/Time Formats

Use `date-fns` for formatting with locale support:

```tsx
import { format, formatDistance } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const localeMap = { ru, en: enUS };

format(new Date(), 'd MMM yyyy', { locale: localeMap[lang] });
// "13 мая 2026"

formatDistance(orderDate, new Date(), { addSuffix: true, locale: localeMap[lang] });
// "2 часа назад" / "2 hours ago"
```

### 9.4 RTL Support (Future)

For MENA expansion (Egypt, Morocco) in Phase 5. Not v1 priority, but plan ahead:

- Use logical CSS properties (`padding-inline-start` instead of `padding-left`)
- Use Tailwind logical utilities (`ps-4` instead of `pl-4`) when targeting RTL
- Avoid `left:` and `right:` positioning
- Test layouts with `<html dir="rtl">` periodically

Right now, just **don't add hostile-to-RTL patterns** (hardcoded `left/right`, directional icons that can't flip).

---

## 10. Accessibility

### 10.1 Color Contrast

All token combinations are designed to meet WCAG AA. Verify with browser tools when in doubt.

**Quick checks:**

- Body text on `--bg`: minimum 4.5:1 ✓
- Body text on `--card`: minimum 4.5:1 ✓
- `--muted` on `--bg`: meets 4.5:1 (used for non-critical text only)
- White on `--accent`: ≥ 4.5:1 ✓
- White on `--danger`: ≥ 4.5:1 ✓

### 10.2 Keyboard Navigation

- All interactive elements must be focusable
- Tab order matches visual order
- Focus visible always (don't remove default outline without replacing it)
- Use our focus ring styles consistently

```css
/* Default focus style */
*:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

### 10.3 Screen Reader Support

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<h1>-<h6>`)
- Provide alt text for images
- Use `aria-label` for icon-only buttons
- Use `aria-live` for dynamic content (toasts, loading states)
- Headings hierarchy: `<h1>` once per page, then `<h2>` for sections, `<h3>` for subsections

**Common patterns:**

```tsx
<button aria-label="Close" onClick={onClose}>
  <X className="size-5" />
</button>

<input aria-label="Search products" placeholder="Search..." />

<div role="alert" aria-live="polite">
  {error && <p>{error}</p>}
</div>
```

### 10.4 Focus Management

For modals/sheets: trap focus inside, return focus on close.

Radix UI Dialog (used in Sheet component) handles this automatically.

For custom interactive widgets, use `react-focus-lock` or implement manually.

### 10.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. Tailwind Configuration

Full config for the design system. Place in `packages/ui/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', '../../apps/*/src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: 'var(--bg)',
        card: 'var(--card)',
        subtle: 'var(--subtle)',
        elevated: 'var(--elevated)',
        overlay: 'var(--overlay)',

        // Text
        ink: 'var(--ink)',
        'ink-strong': 'var(--ink-strong)',
        muted: 'var(--muted)',
        'muted-strong': 'var(--muted-strong)',
        disabled: 'var(--disabled)',
        inverse: 'var(--inverse)',

        // Borders
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        divider: 'var(--divider)',

        // Accent
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-active': 'var(--accent-active)',
        'accent-soft': 'var(--accent-soft)',
        'accent-soft-hover': 'var(--accent-soft-hover)',
        'accent-ink': 'var(--accent-ink)',

        // Semantic
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',

        // Focus
        focus: 'var(--focus-ring)',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        'xs': ['12px', { lineHeight: '1.4' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.5' }],
        'lg': ['17px', { lineHeight: '1.4' }],
        'xl': ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.25' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['38px', { lineHeight: '1.1' }],
        '5xl': ['48px', { lineHeight: '1.05' }],
      },
      borderRadius: {
        'sm': '6px',
        DEFAULT: '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      maxWidth: {
        'mobile': '430px',
        'form': '480px',
        'prose': '640px',
        'content': '1200px',
        'screen': '1440px',
      },
      transitionTimingFunction: {
        'out-smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'in': 'in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'out': 'out 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        in: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        out: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(8px)' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Safe area utilities
    function ({ addUtilities }) {
      addUtilities({
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pl-safe': { paddingLeft: 'env(safe-area-inset-left)' },
        '.pr-safe': { paddingRight: 'env(safe-area-inset-right)' },
        '.scrollbar-hide': {
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
} satisfies Config;
```

### Global CSS (`packages/ui/src/styles/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Light theme tokens */
  :root,
  :root[data-theme="light"] {
    --bg: 250 250 250;
    --card: 255 255 255;
    --subtle: 244 244 245;
    --elevated: 255 255 255;
    --overlay: 9 9 11 / 0.4;
    --ink: 9 9 11;
    --ink-strong: 0 0 0;
    --muted: 113 113 122;
    --muted-strong: 82 82 91;
    --disabled: 161 161 170;
    --inverse: 250 250 250;
    --border: 228 228 231;
    --border-strong: 212 212 216;
    --divider: 244 244 245;
    --accent: 0 179 131;
    --accent-hover: 0 153 112;
    --accent-active: 0 128 92;
    --accent-soft: 236 253 245;
    --accent-soft-hover: 209 250 229;
    --accent-ink: 6 78 59;
    --danger: 220 38 38;
    --danger-soft: 254 226 226;
    --warning: 217 119 6;
    --warning-soft: 254 243 199;
    --success: 0 179 131;
    --success-soft: 236 253 245;
    --info: 37 99 235;
    --info-soft: 219 234 254;
    --focus-ring: 0 179 131 / 0.4;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04);
    --shadow-xl: 0 20px 32px rgba(0, 0, 0, 0.12), 0 8px 12px rgba(0, 0, 0, 0.06);
  }

  /* Dark theme tokens */
  :root[data-theme="dark"] {
    --bg: 9 9 11;
    --card: 20 20 23;
    --subtle: 28 28 32;
    --elevated: 31 31 35;
    --overlay: 0 0 0 / 0.6;
    --ink: 250 250 250;
    --ink-strong: 255 255 255;
    --muted: 161 161 170;
    --muted-strong: 212 212 216;
    --disabled: 82 82 91;
    --inverse: 9 9 11;
    --border: 39 39 42;
    --border-strong: 63 63 70;
    --divider: 28 28 32;
    --accent: 0 209 153;
    --accent-hover: 0 235 171;
    --accent-active: 0 255 189;
    --accent-soft: 0 209 153 / 0.1;
    --accent-soft-hover: 0 209 153 / 0.15;
    --accent-ink: 0 209 153;
    --danger: 248 113 113;
    --danger-soft: 248 113 113 / 0.1;
    --warning: 251 191 36;
    --warning-soft: 251 191 36 / 0.1;
    --success: 0 209 153;
    --success-soft: 0 209 153 / 0.1;
    --info: 96 165 250;
    --info-soft: 96 165 250 / 0.1;
    --focus-ring: 0 209 153 / 0.5;

    --shadow-sm: 0 0 0 1px rgba(255, 255, 255, 0.04);
    --shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
    --shadow-md: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 24px rgba(0, 0, 0, 0.5);
    --shadow-xl: 0 0 0 1px rgba(255, 255, 255, 0.12), 0 24px 48px rgba(0, 0, 0, 0.6);
  }

  body {
    @apply bg-bg text-ink font-sans antialiased;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: "cv11", "ss01";
  }

  /* Theme transitions */
  body, body * {
    transition:
      background-color 250ms ease-out,
      border-color 250ms ease-out,
      color 250ms ease-out;
  }

  /* Disable transitions during initial load */
  .theme-transition-disabled,
  .theme-transition-disabled * {
    transition: none !important;
  }

  /* Mono font tabular numbers */
  .font-mono {
    font-variant-numeric: tabular-nums;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Focus ring */
  *:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px rgb(var(--focus-ring));
  }
}
```

**Note on color format:** Tokens use `R G B` format (without `rgb()`) so they work with Tailwind's opacity modifiers: `bg-accent/10` → `rgb(var(--accent) / 0.1)`.

Update tailwind config color references to:

```ts
colors: {
  bg: 'rgb(var(--bg) / <alpha-value>)',
  // ...
}
```

---

## 12. Code Conventions

### 12.1 Component Structure

Standard component file structure:

```tsx
// packages/ui/src/components/Button.tsx
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(/* ... */)}
      disabled={disabled || loading}
      {...props}
    >
      {/* ... */}
    </button>
  );
});

Button.displayName = 'Button';
```

**Rules:**

- Use `forwardRef` for components that wrap native elements (input, button, etc.)
- Export interface separately for reusability
- Use `cn` utility (from `clsx` + `tailwind-merge`) for className composition
- Set `displayName` for debugging
- Default exports only for pages/routes, named exports for everything else

### 12.2 Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `Button.tsx`, `OrderCard.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useTheme.ts`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Types: `types.ts` or `feature.types.ts`

**Variables:**
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for config objects
- Types/Interfaces: `PascalCase`, optionally prefixed with `T` for generics (`TProduct`)

**CSS classes:**
- Tailwind utilities preferred over custom CSS
- Custom classes (rare): `kebab-case` with optional BEM (`.product-card__title`)

### 12.3 File Organization

```
packages/ui/src/
├── components/          # All reusable components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── ...
├── hooks/               # Reusable hooks
│   ├── useTheme.ts
│   ├── useTelegramWebApp.ts
│   └── ...
├── utils/               # Utility functions
│   ├── cn.ts            # className helper
│   ├── currency.ts
│   └── ...
├── tokens/              # Design tokens (TS exports for JS access)
│   ├── colors.ts
│   ├── typography.ts
│   └── ...
├── styles/
│   └── globals.css
└── index.ts             # Public API exports
```

### 12.4 TypeScript Patterns

**Strict typing:**

```tsx
// ❌ Wrong
function handleClick(e: any) {}

// ✅ Right
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {}
```

**Discriminated unions for variants:**

```tsx
type AlertProps =
  | { variant: 'success'; message: string }
  | { variant: 'error'; message: string; onRetry?: () => void };
```

**Type for props vs Interface:**

- Use `interface` for props that may be extended
- Use `type` for unions, intersections, and primitives

**No `any`:**

Use `unknown` if you don't know the type, then narrow with type guards.

### 12.5 Imports Order

```tsx
// 1. React
import { useState, useEffect } from 'react';

// 2. External libraries
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

// 3. Internal packages (alphabetical)
import { Button, Card } from '@dokonly/ui';
import { Product } from '@dokonly/shared';

// 4. Local imports (relative paths, deepest first)
import { ProductForm } from './ProductForm';
import { useProductsApi } from '../api/products';
import { formatPrice } from '../utils';
```

### 12.6 Component Patterns

**Avoid prop drilling:** Use Zustand stores or React Context.

**Prefer composition over configuration:**

```tsx
// ❌ Less flexible
<Card title="Revenue" icon={DollarSign} value="1.2M" trend="+15%" />

// ✅ Better
<Card>
  <CardHeader icon={<DollarSign />}>Revenue</CardHeader>
  <CardValue>1.2M</CardValue>
  <CardTrend direction="up">15%</CardTrend>
</Card>
```

**Use early returns:**

```tsx
function ProductCard({ product }: { product?: Product }) {
  if (!product) return null;
  if (product.deleted) return <DeletedPlaceholder />;

  return <Card>{/* ... */}</Card>;
}
```

---

## 13. Do's and Don'ts

### 13.1 Color & Theme

✅ **DO:**
- Use design tokens (`bg-card`, `text-ink`)
- Test every component in both light and dark themes
- Use accent color sparingly — for actions and state, not decoration
- Respect user's system theme preference by default

❌ **DON'T:**
- Use raw hex colors in components (`bg-[#00B383]`)
- Add a new color without updating tokens
- Use multiple accent colors (we have ONE green)
- Make light theme dimmer than necessary (it should feel airy, not gray)
- Use pure black `#000` or pure white `#FFF` for text (use tokens)

### 13.2 Typography

✅ **DO:**
- Use the type scale (don't invent new sizes)
- Pair Sora (display) with Outfit (body)
- Use mono for numbers, prices, IDs
- Maintain hierarchy: one h1, then h2 for sections

❌ **DON'T:**
- Use `font-bold` (700) on body text (use `font-semibold` 600)
- Use serif for body text (only for italic accents)
- Center-align long paragraphs
- Use all-caps for body text (only for labels < 12px)

### 13.3 Spacing

✅ **DO:**
- Use the 8-pt grid (4, 8, 12, 16, 24, 32, 48...)
- Use `space-y-*` for vertical rhythm in lists
- Give cards breathing room (min `p-5`)

❌ **DON'T:**
- Use odd values (`p-[13px]`, `mt-5.5`)
- Cram content tight to save vertical space
- Use negative margins to fix layout issues

### 13.4 Components

✅ **DO:**
- Use existing components from `@dokonly/ui` before creating new ones
- Add new shared components to `packages/ui/`, not in apps
- Follow Button/Input/Card patterns for new components
- Make components composable with `children` and slot patterns

❌ **DON'T:**
- Copy-paste a Button or Input — always use the shared component
- Add app-specific styling to shared components (use props/variants instead)
- Create deeply nested HTML — flatten where possible

### 13.5 Mobile UI

✅ **DO:**
- Design for thumb reach (primary actions in bottom 60%)
- Use Telegram MainButton for primary action on Mini App
- Use bottom sheets for modals on mobile
- Make touch targets ≥ 44×44px
- Test on real devices, not just browser dev tools

❌ **DON'T:**
- Put primary CTA in the top right of mobile screens
- Use hover states for critical functionality
- Use centered modals on mobile
- Add horizontal scrolling sections (except chip lists)
- Make text smaller than 13px

### 13.6 Forms

✅ **DO:**
- Labels above inputs (visible, not placeholder-only)
- Show validation errors below the field
- Disable submit button only when form has not been touched
- Use proper `inputMode` and `autoComplete` for mobile keyboards

❌ **DON'T:**
- Use floating labels (poor a11y, hard to localize)
- Show errors via tooltip
- Use red asterisks for required (mark optional instead)
- Auto-submit forms on blur

### 13.7 Imagery

✅ **DO:**
- Use WebP/AVIF for photos
- Set `loading="lazy"` for below-fold images
- Provide alt text for all images
- Use placeholders (`bg-subtle`) while loading

❌ **DON'T:**
- Load full-res images on mobile
- Use SVG for photos
- Ignore aspect ratio (causes layout shift)

### 13.8 Animation

✅ **DO:**
- Animate on state changes (open/close, in/out)
- Use `ease-out` for entering, `ease-in` for exiting
- Respect `prefers-reduced-motion`
- Keep durations short (150-300ms for most)

❌ **DON'T:**
- Animate everything (purposeful only)
- Use bounce animations on critical UI (jarring)
- Animate during user input (typing, scrolling)
- Auto-play animations on page load (subtle entrance is fine)

### 13.9 Performance

✅ **DO:**
- Use skeleton loaders, not spinners, for content
- Lazy-load routes (`React.lazy` + `Suspense`)
- Memoize expensive computations
- Use `key` props correctly in lists

❌ **DON'T:**
- Render large lists without virtualization (use `react-virtual`)
- Re-render entire trees on small state changes
- Use anonymous functions in render for event handlers (when it matters)

### 13.10 Globalization

✅ **DO:**
- Wrap every string in `t('key')`
- Use `formatCurrency()` for all monetary values
- Use `date-fns` with locale for dates
- Test layouts with longer translations (German, Russian)

❌ **DON'T:**
- Hardcode strings like "Save" or "Cancel"
- Hardcode "UZS" or "сум" (use tenant.currency)
- Use English month names directly
- Use concatenation for sentences (use interpolation)

---

## Appendix A: Component Checklist

When building a new component, verify:

- [ ] TypeScript interface for props (exported)
- [ ] Works in light AND dark theme
- [ ] Uses design tokens, no raw colors
- [ ] Mobile-first (works at 375px)
- [ ] Keyboard accessible (focus visible, tab order)
- [ ] Screen reader friendly (semantic HTML, aria-labels)
- [ ] Loading state (if async)
- [ ] Error state (if can fail)
- [ ] Empty state (if shows data)
- [ ] Disabled state
- [ ] Hover state (web only, optional)
- [ ] Active/pressed state
- [ ] Tested with longest translation
- [ ] Performance: no unnecessary re-renders
- [ ] Added to `packages/ui/src/index.ts` exports
- [ ] Used `forwardRef` if it wraps native element

---

## Appendix B: Common Mistakes to Avoid

1. **Hardcoded UZS**: Always use `tenant.currency`, never assume.

2. **Hardcoded Russian/Uzbek text**: Use `t('key')`, even for "obviously universal" things like buttons.

3. **Centered modals on mobile**: Use bottom sheets.

4. **Custom back button in header**: Use Telegram BackButton in Mini App.

5. **Two primary buttons**: Only ONE primary per screen. Use secondary for alternatives.

6. **Forgetting empty states**: Every list, dashboard widget needs one.

7. **Loading with spinners**: Use skeleton loaders for content.

8. **Hover-only interactions on mobile**: Not gonna work.

9. **`font-bold` (700) on body text**: Use `font-semibold` (600).

10. **Pure black/white text**: Use `--ink` and `--inverse` tokens.

11. **Modal-only confirmations for everything**: Toasts for success, modals only for destructive.

12. **Multiple accent colors**: We have ONE green. Use semantic colors (danger, warning, info) for non-accent states.

13. **`p-[13px]` and similar arbitrary values**: Stick to the 8-pt grid.

14. **Forgetting `font-mono` on numbers**: Tabular alignment matters in tables and rows.

15. **Not testing dark theme**: Half our users will use it. Always test.

---

## Appendix C: References & Inspiration

Good design references to study (not to copy):

- **Linear** (linear.app) — minimal, fast, keyboard-driven
- **Vercel Dashboard** — clean cards, great typography
- **Stripe Dashboard** — data-dense but readable
- **Cron / Notion Calendar** — slick interactions
- **Raycast** — beautiful dark theme execution
- **Telegram itself** — the platform we live inside, study its patterns
- **iOS Settings app** — perfect toggle/list pattern

Anti-references (what NOT to look like):

- ❌ Bootstrap default
- ❌ Material Design 3 (too Google)
- ❌ Bitrix24 (too dense, dated)
- ❌ Most banking apps (heavy, slow, distrustful UX)
- ❌ Shopify admin v2 (overly complex)

---

**This design system is a living document.** Update it as decisions evolve. Keep it in `docs/design.md` and reference in every Claude Code session via `@docs/design.md`.

Version: 1.0
Last updated: May 2026
