"""
Public (unauthenticated) endpoints — help articles, etc.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/help-articles")
async def get_help_articles():
    return [
        {
            "id": "1",
            "slug": "how-to-order",
            "title": "Как сделать заказ",
            "category": "orders",
            "content": "1. Выберите товары\n2. Добавьте в корзину\n3. Оформите заказ",
        },
        {
            "id": "2",
            "slug": "payment-methods",
            "title": "Способы оплаты",
            "category": "payments",
            "content": "Принимаем: наличные при получении, перевод на карту, Telegram Stars.",
        },
        {
            "id": "3",
            "slug": "returns",
            "title": "Возврат товара",
            "category": "returns",
            "content": "Вы можете запросить возврат в течение 14 дней с момента получения заказа.",
        },
        {
            "id": "4",
            "slug": "delivery",
            "title": "Доставка",
            "category": "orders",
            "content": "Условия доставки устанавливает каждый продавец отдельно.",
        },
    ]
