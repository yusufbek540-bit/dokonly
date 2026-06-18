const PREFIX = 'dokonly_wishlist_'

function key(tenantId: string) {
  return `${PREFIX}${tenantId}`
}

export function readLocalWishlist(tenantId: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(tenantId)) || '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeLocalWishlist(tenantId: string, ids: string[]) {
  if (typeof window === 'undefined') return
  const unique = Array.from(new Set(ids.filter(Boolean)))
  window.localStorage.setItem(key(tenantId), JSON.stringify(unique))
}

export function mergeWishlist(remote: string[], local: string[]) {
  return Array.from(new Set([...local, ...remote]))
}

export function toggleLocalWishlist(tenantId: string, productId: string) {
  const current = readLocalWishlist(tenantId)
  const inWishlist = !current.includes(productId)
  const next = inWishlist ? [productId, ...current] : current.filter((id) => id !== productId)
  writeLocalWishlist(tenantId, next)
  return { inWishlist, ids: next }
}
