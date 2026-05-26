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

## Step 2: Deploy Merchant Miniapp to Cloudflare Pages

Already live at `https://dokonly-miniapp.pages.dev` (deployed via wrangler CLI).

To redeploy after backend URL is known:
```bash
cd apps/miniapp
VITE_API_URL=https://<railway-url>.up.railway.app npm run build
wrangler pages deploy dist/ --project-name dokonly-miniapp
```

---

## Step 3: Deploy Admin Dashboard to Cloudflare Pages

Already live at `https://dokonly-dashboard.pages.dev`.

To redeploy:
```bash
cd apps/dashboard
VITE_API_URL=https://<railway-url>.up.railway.app npm run build
wrangler pages deploy dist/ --project-name dokonly-dashboard
```

---

## Step 4: Update Merchant Bot Menu Buttons

After backend is live, run once to update all merchant bots to permanent URL:
```bash
cd backend
source .venv/bin/activate
python scripts/fix_menu_buttons.py
```
