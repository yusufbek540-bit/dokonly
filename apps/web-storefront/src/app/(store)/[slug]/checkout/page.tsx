import { fetchShop } from '@/lib/api'
import { CheckoutClient } from './CheckoutClient'
import { notFound } from 'next/navigation'

export default async function CheckoutPage({ params }: { params: { slug: string } }) {
  const shop = await fetchShop(params.slug)
  if (!shop) notFound()
  return <CheckoutClient shop={shop} slug={params.slug} />
}
