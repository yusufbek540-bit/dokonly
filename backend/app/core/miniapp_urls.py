from typing import Union
from uuid import UUID

from app.core.config import settings


def master_miniapp_url() -> str:
    return settings.miniapp_url.rstrip("/")


def shop_miniapp_url(slug: str) -> str:
    return f"{master_miniapp_url()}?shop={slug}"


def product_miniapp_url(slug: str, product_id: Union[str, UUID]) -> str:
    return f"{shop_miniapp_url(slug)}&product={product_id}"
