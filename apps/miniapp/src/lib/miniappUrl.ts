export function miniappBaseUrl() {
  return (import.meta.env.VITE_MINIAPP_URL ?? window.location.origin).replace(/\/$/, '')
}

export function shopMiniappUrl(slug: string) {
  return `${miniappBaseUrl()}?shop=${slug}`
}
