from decimal import Decimal

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.order import Customer, Order, OrderItem
from app.models.product import Product
from app.models.tenant import Tenant

router = Router()


class CheckoutStates(StatesGroup):
    waiting_payment_method = State()
    waiting_delivery_note = State()


@router.callback_query(F.data.startswith("buy:"))
async def add_to_cart(callback: CallbackQuery, state: FSMContext):
    product_id = callback.data.split(":", 1)[1]
    data = await state.get_data()
    cart: dict[str, int] = data.get("cart", {})
    cart[product_id] = cart.get(product_id, 0) + 1
    await state.update_data(cart=cart)

    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🛒 Оформить заказ", callback_data="checkout"),
        InlineKeyboardButton(text="📦 Продолжить покупки", callback_data="browse_catalog"),
    ]])
    await callback.message.answer("✅ Товар добавлен в корзину!", reply_markup=kb)
    await callback.answer()


@router.callback_query(F.data == "checkout")
async def start_checkout(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    if not data.get("cart"):
        await callback.answer("Корзина пуста!", show_alert=True)
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💳 Перевод на карту", callback_data="pay:manual_transfer")],
        [InlineKeyboardButton(text="💵 Наличными при получении", callback_data="pay:cash_on_delivery")],
        [InlineKeyboardButton(text="⭐ Telegram Stars", callback_data="pay:telegram_stars")],
    ])
    await callback.message.answer("Выберите способ оплаты:", reply_markup=kb)
    await state.set_state(CheckoutStates.waiting_payment_method)
    await callback.answer()


@router.callback_query(F.data.startswith("pay:"), CheckoutStates.waiting_payment_method)
async def select_payment(callback: CallbackQuery, state: FSMContext):
    method = callback.data.split(":", 1)[1]
    await state.update_data(payment_method=method)
    await callback.message.answer(
        "Укажите адрес доставки или удобное время получения (или напишите «самовывоз»):"
    )
    await state.set_state(CheckoutStates.waiting_delivery_note)
    await callback.answer()


@router.message(CheckoutStates.waiting_delivery_note, F.text)
async def place_order(message: Message, state: FSMContext):
    data = await state.get_data()
    cart: dict[str, int] = data.get("cart", {})
    if not cart:
        await message.answer("Корзина пуста!")
        await state.clear()
        return

    async with AsyncSessionLocal() as db:
        bot_info = await message.bot.me()
        tenant_result = await db.execute(
            select(Tenant).where(Tenant.bot_username == bot_info.username)
        )
        tenant = tenant_result.scalar_one_or_none()
        if not tenant:
            await message.answer("Ошибка: магазин не найден.")
            await state.clear()
            return

        # Upsert customer
        cust_result = await db.execute(
            select(Customer).where(
                Customer.tenant_id == tenant.id,
                Customer.telegram_id == message.from_user.id,
            )
        )
        customer = cust_result.scalar_one_or_none()
        if not customer:
            customer = Customer(
                tenant_id=tenant.id,
                telegram_id=message.from_user.id,
                first_name=message.from_user.first_name,
                last_name=message.from_user.last_name,
                username=message.from_user.username,
            )
            db.add(customer)
            await db.flush()

        # Build order items
        order_items: list[OrderItem] = []
        subtotal = Decimal("0")
        for product_id, qty in cart.items():
            prod_result = await db.execute(
                select(Product).where(Product.id == product_id)
            )
            product = prod_result.scalar_one_or_none()
            if product:
                item_total = product.price * qty
                subtotal += item_total
                order_items.append(OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    price=product.price,
                    quantity=qty,
                    subtotal=item_total,
                ))

        order = Order(
            tenant_id=tenant.id,
            customer_id=customer.id,
            status="new",
            payment_method=data["payment_method"],
            payment_status="pending",
            subtotal=subtotal,
            discount=Decimal("0"),
            total=subtotal,
            currency=tenant.currency,
            delivery_note=message.text,
        )
        db.add(order)
        await db.flush()

        for item in order_items:
            item.order_id = order.id
            db.add(item)

        await db.commit()
        order_id_short = str(order.id)[:8].upper()
        order_currency = tenant.currency

    await state.clear()
    await message.answer(
        f"✅ Заказ #{order_id_short} принят!\n\n"
        f"Сумма: {int(subtotal):,} {order_currency}\n"
        f"Мы свяжемся с вами для подтверждения."
    )
