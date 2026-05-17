from fastapi import APIRouter

from app.api.v1.endpoints import ai, me, miniapp, orders, platform, products, promo, public, shop, tenants, webhook

router = APIRouter()
router.include_router(me.router)
router.include_router(tenants.router)
router.include_router(products.router_categories)
router.include_router(products.router_products)
router.include_router(orders.router)
router.include_router(webhook.router)
router.include_router(shop.router)
router.include_router(miniapp.router)
router.include_router(ai.router)
router.include_router(promo.router)
router.include_router(platform.router)
router.include_router(public.router)
