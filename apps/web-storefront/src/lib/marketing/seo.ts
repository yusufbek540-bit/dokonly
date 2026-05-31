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
