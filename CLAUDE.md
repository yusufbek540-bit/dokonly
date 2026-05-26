# Dokonly Project Memory

## Canonical Working Copy

- Use `/Users/yusufbek/Developer/Dokonly` as the active working repository.
- Do not use `/Users/yusufbek/Documents/Antigravity/Dokonly` for new work. That older clone is stale and its `.git` object store was affected by macOS/iCloud `dataless` placeholder files, which caused Git commands such as `push` and object traversal to hang.
- Current active branch for the M6/M7 payments, promo, and cart work: `feat/m6-m7-payments-promo-cart`.

## Verified Workflow

Use these commands from `/Users/yusufbek/Developer/Dokonly`:

```bash
pnpm install --frozen-lockfile
pnpm --filter miniapp typecheck
pnpm --filter dashboard typecheck
pnpm --filter miniapp build
pnpm --filter dashboard build
```

The branch was successfully pushed from the new working copy after recloning outside `Documents`.
