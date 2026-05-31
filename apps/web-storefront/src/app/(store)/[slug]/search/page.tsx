import { notFound } from 'next/navigation'
import { fetchShop, fetchProducts } from '@/lib/api'
import { SearchClient } from './SearchClient'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { q?: string }
}) {
  const shop = await fetchShop(params.slug)
  if (!shop) return { title: 'Store not found' }
  return {
    title: searchParams.q ? `"${searchParams.q}" — ${shop.name}` : `Поиск — ${shop.name}`,
  }
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { q?: string }
}) {
  const [shop, products] = await Promise.all([
    fetchShop(params.slug),
    fetchProducts(params.slug),
  ])

  if (!shop) notFound()

  return (
    <SearchClient
      shop={shop}
      products={products}
      slug={params.slug}
      initialQuery={searchParams.q ?? ''}
    />
  )
}
