from fastapi import APIRouter

from app.api.v1.endpoints import me, tenants, products, orders

router = APIRouter()
router.include_router(me.router)
router.include_router(tenants.router)
router.include_router(products.router_categories)
router.include_router(products.router_products)
router.include_router(orders.router)
