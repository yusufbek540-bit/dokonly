from app.bot.middlewares.tenant import TenantMiddleware
from app.bot.setup import dp
from app.bot.handlers import registration, start

dp.update.middleware(TenantMiddleware())
dp.include_router(start.router)
dp.include_router(registration.router)
