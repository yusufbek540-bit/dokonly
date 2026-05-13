from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.bot.setup import bot
import app.bot.handlers  # noqa: F401 — registers routers and middleware into dp
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.webhook_base_url:
        await bot.set_webhook(f"{settings.webhook_base_url}/api/v1/webhook/telegram")
    yield
    await bot.session.close()


app = FastAPI(
    title="Dokonly API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not settings.is_production else [
        "https://admin.dokonly.com",
        "https://miniapp.dokonly.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
