from app.bot.middlewares.tenant import TenantMiddleware
from app.bot.setup import dp
from app.bot.handlers import catalog, checkout, registration, start

dp.update.middleware(TenantMiddleware())
dp.include_router(start.router)
dp.include_router(registration.router)
dp.include_router(catalog.router)
dp.include_router(checkout.router)
