from fastapi import APIRouter

from app.api.v1.endpoints import me, tenants

router = APIRouter()
router.include_router(me.router)
router.include_router(tenants.router)
