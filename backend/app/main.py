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


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_migrations()
    await init_pool()
    if settings.webhook_base_url:
        await bot.set_webhook(f"{settings.webhook_base_url}/api/v1/webhook/telegram")
    else:
        asyncio.create_task(dp.start_polling(bot, handle_signals=False))
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
