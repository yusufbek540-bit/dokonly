# Production Deployment

## Architecture
- **Backend API** → Railway (Python/FastAPI, auto-deploys on push)
- **Merchant miniapp** → Cloudflare Pages (`dokonly-miniapp.pages.dev`)
- **Admin dashboard** → Cloudflare Pages (`dokonly-dashboard.pages.dev`)
- **Database** → Supabase (already live)
- **Media storage** → Cloudflare R2 (already live)

---

## Step 1: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select this repo, set **Root Directory** to `backend`
3. Railway will detect the `Dockerfile` and build automatically
4. Add a **Redis** service: click "+ New" → Database → Redis
5. Set **Environment Variables** in Railway dashboard (get values from your `.env` file):

```
APP_ENV=production
SECRET_KEY=<from .env>
TELEGRAM_BOT_TOKEN=<from .env>
DATABASE_URL=<from .env>
SUPABASE_URL=<from .env>
SUPABASE_ANON_KEY=<from .env>
SUPABASE_SERVICE_ROLE_KEY=<from .env>
SUPABASE_JWT_SECRET=<from .env>
OPENAI_API_KEY=<from .env>
CLOUDFLARE_ACCOUNT_ID=<from .env>
R2_ACCESS_KEY_ID=<from .env>
R2_SECRET_ACCESS_KEY=<from .env>
R2_BUCKET_NAME=dokonly-media
R2_PUBLIC_URL=<from .env>
REDIS_URL=${{Redis.REDIS_URL}}
MINIAPP_URL=https://dokonly-miniapp.pages.dev
WEBHOOK_BASE_URL=https://<your-railway-url>.up.railway.app
```

6. After deploy, Railway shows your URL → update `WEBHOOK_BASE_URL` variable with it.

---

## Runtime Pinning

Use the repo-pinned runtime everywhere:

- Node: `.node-version` / `.nvmrc` → `20.19.0`
- pnpm: `packageManager` → `pnpm@10.33.2`

Cloudflare Pages supports pinning language versions through environment variables or version files. This repo uses `.node-version`; keep the Cloudflare project on the V2 build system and do not rely on the local machine's Node/Wrangler runtime.

---

## Step 2: Deploy Merchant Miniapp to Cloudflare Pages

Already live at `https://dokonly-miniapp.pages.dev` (deployed via wrangler CLI).

Preferred deploy path: **Cloudflare Pages Git integration**.

Cloudflare Pages should build directly from GitHub whenever the branch is pushed. This avoids local `vite`/`wrangler` runtime hangs and gives clean deployment logs in the Cloudflare dashboard.

Cloudflare Pages settings:

```text
Project name: dokonly-miniapp
Git repository: yusufbek540-bit/dokonly
Production branch: main
Root directory: /
Build command: corepack enable && corepack prepare pnpm@10.33.2 --activate && pnpm install --frozen-lockfile && pnpm --filter miniapp build
Build output directory: apps/miniapp/dist
Node version: 20.19.0
```

Cloudflare Pages environment variables:

```text
NODE_VERSION=20.19.0
VITE_API_URL=https://dokonly-backend-production.up.railway.app
```

For branch previews, Cloudflare will create preview deployments for pushed branches if preview deployments are enabled.

Local Wrangler deploy remains a fallback only:

```bash
CLOUDFLARE_NO_UPDATE_CHECK=1 WRANGLER_SEND_METRICS=false VITE_API_URL=https://dokonly-backend-production.up.railway.app pnpm deploy:miniapp
```

Do not deploy an old `apps/miniapp/dist`. If `pnpm build:miniapp` does not complete, use Cloudflare/GitHub build logs instead of direct upload.

---

## Step 3: Deploy Admin Dashboard to Cloudflare Pages

Already live at `https://dokonly-dashboard.pages.dev`.

To redeploy from the repo root:
```bash
VITE_API_URL=https://<railway-url>.up.railway.app pnpm deploy:dashboard
```

Recommended dashboard Cloudflare Pages settings:

```text
Project name: dokonly-dashboard
Git repository: yusufbek540-bit/dokonly
Production branch: main
Root directory: /
Build command: corepack enable && corepack prepare pnpm@10.33.2 --activate && pnpm install --frozen-lockfile && pnpm --filter dashboard build
Build output directory: apps/dashboard/dist
Node version: 20.19.0
```

To verify Cloudflare auth before deploying:
```bash
pnpm wrangler:whoami
```

---

## Step 4: Update Merchant Bot Menu Buttons

After backend is live, run once to update all merchant bots to permanent URL:
```bash
cd backend
source .venv/bin/activate
python scripts/fix_menu_buttons.py
```
