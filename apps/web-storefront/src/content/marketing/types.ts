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
