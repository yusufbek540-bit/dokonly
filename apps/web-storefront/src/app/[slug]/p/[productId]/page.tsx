import { notFound } from 'next/navigation'
import { fetchShop, fetchProduct, fetchProductReviews, fetchProducts } from '@/lib/api'
import { ProductDetailClient } from './ProductDetailClient'

export async function generateMetadata({
  params,
}: {
  params: { slug: string; productId: string }
}) {
  const [shop, product] = await Promise.all([
    fetchShop(params.slug),
    fetchProduct(params.slug, params.productId),
  ])
  if (!shop || !product) return { title: 'Product not found' }
  return {
    title: `${product.name} — ${shop.name}`,
    description: product.description ?? `Buy ${product.name} at ${shop.name}`,
    openGraph: {
      title: `${product.name} — ${shop.name}`,
      images:
        product.images && product.images.length > 0
          ? [product.images[0]]
          : product.image_url
          ? [product.image_url]
          : [],
    },
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string; productId: string }
}) {
  const [shop, product, reviews, allProducts] = await Promise.all([
    fetchShop(params.slug),
    fetchProduct(params.slug, params.productId),
    fetchProductReviews(params.slug, params.productId),
    fetchProducts(params.slug),
  ])

  if (!shop || !product) notFound()

  // Build related products: same category, exclude current
  const relatedProducts = allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        (product.category_id ? p.category_id === product.category_id : true)
    )
    .slice(0, 4)

  return (
    <ProductDetailClient
      shop={shop}
      product={product}
      reviews={reviews}
      relatedProducts={relatedProducts}
      slug={params.slug}
    />
  )
}
