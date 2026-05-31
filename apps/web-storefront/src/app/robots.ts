import type { MetadataRoute } from 'next'
import { siteBaseUrl } from '@/content/marketing/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: new URL('/sitemap.xml', siteBaseUrl).toString(),
  }
}
