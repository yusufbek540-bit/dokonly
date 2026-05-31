import type { MetadataRoute } from 'next'
import { blogPosts } from '@/content/marketing/blog'
import { helpArticles } from '@/content/marketing/help'
import { niches } from '@/content/marketing/niches'
import { marketingRoutes } from '@/content/marketing/routes'
import { siteBaseUrl } from '@/content/marketing/site'

function absoluteUrl(path: string) {
  return new URL(path, siteBaseUrl).toString()
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = Object.values(marketingRoutes).flatMap((route) => [route.ru, route.uz])
  const nicheRoutes = niches.flatMap((niche) => [niche.slug.ru, niche.slug.uz])
  const blogRoutes = blogPosts.flatMap((post) => [post.slug.ru, post.slug.uz])
  const helpRoutes = helpArticles.flatMap((article) => [article.slug.ru, article.slug.uz])
  const routes = Array.from(new Set([...staticRoutes, ...nicheRoutes, ...blogRoutes, ...helpRoutes]))

  return routes.map((route) => ({
    url: absoluteUrl(route),
    changeFrequency: 'weekly',
    priority: route === '/' || route === '/uz' ? 1 : 0.7,
  }))
}
