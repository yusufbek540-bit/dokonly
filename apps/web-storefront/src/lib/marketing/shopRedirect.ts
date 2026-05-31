import { headers } from 'next/headers'

const shopSlugPattern = /^[a-z0-9][a-z0-9-]{0,62}$/i

function isValidShopSlug(value: string): boolean {
  return shopSlugPattern.test(value)
}

export function resolveShopRedirect(searchParams: { shop?: string }): string | null {
  if (searchParams.shop) {
    return isValidShopSlug(searchParams.shop) ? `/${searchParams.shop}` : null
  }

  const envSlug = process.env.SHOP_SLUG
  if (envSlug) {
    return isValidShopSlug(envSlug) ? `/${envSlug}` : null
  }

  const headersList = headers()
  const host = headersList.get('host') ?? ''
  const match = host.match(/^([^.]+)\.dokonly\.com$/)
  if (match && match[1] !== 'www') {
    return isValidShopSlug(match[1]) ? `/${match[1]}` : null
  }

  return null
}
