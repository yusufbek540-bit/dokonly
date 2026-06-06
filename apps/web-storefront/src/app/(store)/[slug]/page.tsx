import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { fetchShop, fetchProducts, fetchStories } from '@/lib/api'
import { StoreClient } from './StoreClient'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const shop = await fetchShop(params.slug)
  if (!shop) return { title: 'Store not found' }
  return {
    title: shop.name,
    description: shop.description ?? `Shop at ${shop.name}`,
    openGraph: {
      title: shop.name,
      description: shop.description ?? `Shop at ${shop.name}`,
      images: shop.cover_url ? [shop.cover_url] : shop.logo_url ? [shop.logo_url] : [],
    },
  }
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const [shop, products, stories] = await Promise.all([
    fetchShop(params.slug),
    fetchProducts(params.slug),
    fetchStories(params.slug),
  ])

  if (!shop) notFound()

  return (
    <Suspense fallback={null}>
      <StoreClient shop={shop} products={products} stories={stories} slug={params.slug} />
    </Suspense>
  )
}
