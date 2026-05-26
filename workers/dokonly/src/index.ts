const MINIAPP_ORIGIN = "https://dokonly-miniapp.pages.dev"

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "dokonly" })
    }

    const target = new URL(url.pathname + url.search, MINIAPP_ORIGIN)
    return Response.redirect(target.toString(), 302)
  },
}
