import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1 import router as api_v1_router
from app.bot.setup import bot, dp
import app.bot.handlers  # noqa: F401 — registers routers and middleware into dp
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.models import Base  # noqa: F401 — also registers all model subclasses
from app.workers import close_pool, init_pool

logger = logging.getLogger(__name__)

MIGRATIONS = [
    # 001 - wishlist_items and compare_at_price
    """
    ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(14, 2);
    CREATE TABLE IF NOT EXISTS wishlist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_telegram_id BIGINT NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_wishlist UNIQUE (tenant_id, customer_telegram_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist_items(tenant_id, customer_telegram_id);
    """,
    # 002 - mass_mailings
    """
    CREATE TABLE IF NOT EXISTS mass_mailings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        text TEXT NOT NULL,
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        recipient_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_mailings_tenant ON mass_mailings(tenant_id);
    """,
    # 003 - carts table for abandoned cart tracking
    """
    CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        telegram_user_id BIGINT NOT NULL,
        customer_name TEXT,
        items JSONB NOT NULL DEFAULT '[]',
        total_amount DECIMAL(14, 2),
        abandoned BOOLEAN DEFAULT FALSE,
        abandoned_at TIMESTAMPTZ,
        recovery_sent_at TIMESTAMPTZ,
        recovered BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_carts_tenant ON carts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(tenant_id, telegram_user_id)
    """,
    # 004 - seller CRM metadata on customers
    """
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS crm JSONB NOT NULL DEFAULT '{"tags": [], "notes": []}'::jsonb
    """,
    # seed - restore demo tenant (migrated from Supabase)
    """
    INSERT INTO tenants (
        id, owner_id, name, slug, country, currency, locale, tier,
        bot_token_enc, bot_token_hash, bot_username,
        accent_color, typography_bundle,
        contact_info, settings, is_active
    )
    SELECT
        '5a534d64-86d5-4659-b48a-228206f56918'::uuid,
        'a414389d-a2c3-5c42-8486-095020e84b01'::uuid,
        'Test', 'test', 'UZ', 'UZS', 'ru', 'start',
        'gAAAAABqBhc40h_mWWxwqgmAxSLrfvPYWRm0kzFnCHvHBOJ55VR9GGxatUoU7KpMzWBlQMw-7M_W0q9r-DJZ68u7VXfGLg71nPAx9sanQwMNxKFgRDfp0oeC9YLAu1zcXqoiJHfeafoT',
        'fd449ae2be0a9438f13b87ede592b9998cf067d1b52f842a37769cb9a118db59',
        'dokonlydemobot', 'sand', 'bold',
        '{}'::jsonb,
        '{"description": "", "legal_status": "individual", "business_category": "fashion"}'::jsonb,
        true
    WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'test')
    """,
]


async def run_migrations() -> None:
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("DB schema created (create_all)")
    except Exception as e:
        logger.warning(f"create_all warning: {e}")
    try:
        async with AsyncSessionLocal() as session:
            for sql_block in MIGRATIONS:
                for stmt in sql_block.split(";"):
                    stmt = stmt.strip()
                    if stmt:
                        await session.execute(text(stmt))
            await session.commit()
        logger.info("DB migrations applied")
    except Exception as e:
        logger.warning(f"Migration warning (may already exist): {e}")


async def _ensure_all_menu_buttons() -> None:
    """Set web_app menu button on every tenant bot so ?startapp= deep links work."""
    import httpx
    from app.core.crypto import decrypt
    from app.models.tenant import Tenant
    from sqlalchemy import select
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Tenant).where(Tenant.bot_token_enc.isnot(None), Tenant.is_active == True)  # noqa: E712
            )
            tenants = result.scalars().all()
        async with httpx.AsyncClient(timeout=10) as client:
            for tenant in tenants:
                try:
                    raw_token = decrypt(tenant.bot_token_enc)
                    mini_app_url = f"{settings.miniapp_url}?shop={tenant.slug}"
                    await client.post(
                        f"https://api.telegram.org/bot{raw_token}/setChatMenuButton",
                        json={"menu_button": {"type": "web_app", "text": "Открыть магазин", "web_app": {"url": mini_app_url}}},
                    )
                except Exception:
                    pass
        logger.info(f"Menu buttons refreshed for {len(tenants)} tenant(s)")
    except Exception as e:
        logger.warning(f"Menu button refresh warning: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Dokonly backend starting — build 2026-05-18-v5")
    await run_migrations()
    await init_pool()
    if settings.webhook_base_url:
        await bot.set_webhook(f"{settings.webhook_base_url}/api/v1/webhook/telegram")
    else:
        asyncio.create_task(dp.start_polling(bot, handle_signals=False))
    asyncio.create_task(_ensure_all_menu_buttons())
    yield
    await dp.stop_polling()
    await close_pool()
    await bot.session.close()


app = FastAPI(
    title="Dokonly API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not settings.is_production else settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
