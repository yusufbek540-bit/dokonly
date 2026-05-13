from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.ai.tasks.product_description import generate_description
from app.core.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class DescriptionRequest(BaseModel):
    name: str
    locale: str = "ru"


@router.post("/product-description")
async def ai_product_description(
    body: DescriptionRequest,
    user: dict = Depends(get_current_user),
):
    description = await generate_description(body.name, body.locale)
    return {"description": description}
