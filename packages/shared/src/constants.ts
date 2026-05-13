export const TIER_LIMITS = {
  start: { products: 100, stores: 1, admins: 1 },
  business: { products: 1500, stores: 3, admins: 5 },
  premium: { products: Infinity, stores: 10, admins: Infinity },
  enterprise: { products: Infinity, stores: Infinity, admins: Infinity },
} as const

export const SUPPORTED_LOCALES = ['ru', 'uz', 'en'] as const
export const SUPPORTED_CURRENCIES = ['UZS', 'USD'] as const
