export type ProductCollectionRule = 'manual' | 'new' | 'sale' | 'popular'

export interface ProductCollection {
  id: string
  title: string
  enabled: boolean
  rule: ProductCollectionRule
  sort_order: number
}

export function defaultProductCollections(): ProductCollection[] {
  return [
    { id: 'new', title: 'Новинки', enabled: true, rule: 'new', sort_order: 1 },
    { id: 'sale', title: 'На скидке', enabled: true, rule: 'sale', sort_order: 2 },
    { id: 'popular', title: 'Популярное', enabled: true, rule: 'popular', sort_order: 3 },
  ]
}

function normalizeId(value: unknown, fallback: string) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return text || fallback
}

export function normalizeProductCollections(value: unknown): ProductCollection[] {
  const defaults = defaultProductCollections()
  const incoming = Array.isArray(value) ? value : []
  const merged = incoming.length > 0 ? incoming : defaults
  const seen = new Set<string>()

  const normalized = merged
    .map((item: any, index) => {
      const fallback = defaults[index]?.id ?? `collection-${index + 1}`
      const id = normalizeId(item?.id ?? item?.title, fallback)
      if (seen.has(id)) return null
      seen.add(id)
      const defaultMatch = defaults.find((entry) => entry.id === id)
      const rule = item?.rule === 'new' || item?.rule === 'sale' || item?.rule === 'popular'
        ? item.rule
        : defaultMatch?.rule ?? 'manual'
      return {
        id,
        title: String(item?.title ?? defaultMatch?.title ?? `Подборка ${index + 1}`).trim() || `Подборка ${index + 1}`,
        enabled: item?.enabled !== false,
        rule,
        sort_order: Number(item?.sort_order ?? defaultMatch?.sort_order ?? index + 1),
      }
    })
    .filter(Boolean) as ProductCollection[]

  return normalized.sort((a, b) => a.sort_order - b.sort_order)
}

export function productCollectionIds(product: any): string[] {
  const ids = product?.collection_ids
  if (Array.isArray(ids)) return ids.map(String)
  return []
}

export function productMatchesCollection(product: any, collection: ProductCollection): boolean {
  const ids = productCollectionIds(product)
  if (ids.includes(collection.id)) return true
  if (collection.rule === 'sale') {
    return !!product?.compare_at_price && Number(product.compare_at_price) > Number(product?.price ?? 0)
  }
  if (collection.rule === 'popular') {
    return !!product?.is_featured || Number(product?.order_count ?? 0) > 0
  }
  if (collection.rule === 'new') {
    return true
  }
  return false
}

function timestamp(product: any) {
  const parsed = Date.parse(String(product?.created_at ?? product?.updated_at ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function productsForCollection(products: any[], collection: ProductCollection): any[] {
  const matched = products.filter((product) => product?.is_active !== false && productMatchesCollection(product, collection))
  if (collection.rule === 'new') {
    return matched.sort((a, b) => timestamp(b) - timestamp(a) || Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
  }
  if (collection.rule === 'popular') {
    return matched.sort((a, b) => Number(b.order_count ?? 0) - Number(a.order_count ?? 0) || Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
  }
  return matched.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
}
