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
