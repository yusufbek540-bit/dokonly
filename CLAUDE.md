# Dokonly Project Memory

## Canonical Working Copy

- Use `/Users/yusufbek/Documents/Antigravity/Dokonly` as the active working repository.
- Do not use `/Users/yusufbek/Developer/Dokonly` for new work unless the user explicitly asks to inspect the old clone.
- Current active branch for the M6/M7 payments, promo, and cart work: `feat/m6-m7-payments-promo-cart`.

## Verified Workflow

Use these commands from `/Users/yusufbek/Documents/Antigravity/Dokonly`:

```bash
pnpm install --frozen-lockfile
pnpm --filter miniapp typecheck
pnpm --filter dashboard typecheck
pnpm --filter miniapp build
pnpm --filter dashboard build
```

The branch was successfully pushed from the new working copy after recloning outside `Documents`.
