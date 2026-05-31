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
