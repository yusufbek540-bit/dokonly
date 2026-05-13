import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    LabeledPrice,
    Message,
    PreCheckoutQuery,
)
from sqlalchemy import select, update as sa_update

from app.core.database import AsyncSessionLocal
from app.models.order import Customer, Order, OrderItem
from app.models.product import Product
from app.models.promo import PromoCode
from app.models.tenant import Tenant
from app.workers import arq_pool

router = Router()


class CheckoutStates(StatesGroup):
    waiting_payment_method = State()
    waiting_promo = State()
    waiting_delivery_note = State()
    waiting_stars_payment = State()


_STARS_RATE = Decimal("100")  # 1 Star = 100 units of tenant currency


def _promo_is_valid(promo: PromoCode) -> bool:
    if not promo.is_active:
        return False
    if promo.max_uses is not None and promo.used_count >= promo.max_uses:
        return False
    if promo.expires_at is not None and promo.expires_at < datetime.now(tz=timezone.utc):
        return False
    return True


def _compute_discount(subtotal: Decimal, discount_type: str, discount_value: Decimal) -> Decimal:
    if discount_type == "percent":
        result = subtotal * discount_value / Decimal("100")
    else:
        result = min(discount_value, subtotal)
    return result.quantize(Decimal("0.01"))


async def _ask_promo(message: Message, state: FSMContext) -> None:
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Пропустить", callback_data="skip_promo"),
    ]])
    await message.answer("Введите промокод или нажмите «Пропустить»:", reply_markup=kb)
    await state.set_state(CheckoutStates.waiting_promo)


async def _continue_after_promo(message: Message, state: FSMContext, tenant: Tenant | None) -> None:
    data = await state.get_data()
    payment_method = data.get("payment_method")

    if payment_method == "telegram_stars":
        await _send_stars_invoice(message, state, tenant)
    else:
        await message.answer(
            "Укажите адрес доставки или удобное время получения (или напишите «самовывоз»):"
        )
        await state.set_state(CheckoutStates.waiting_delivery_note)


async def _send_stars_invoice(message: Message, state: FSMContext, tenant: Tenant | None) -> None:
    if not tenant:
        await message.answer("Ошибка: магазин не найден.")
        await state.clear()
        return

    data = await state.get_data()
    cart: dict[str, int] = data.get("cart", {})

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Product).where(Product.id.in_(cart.keys())))
        products = {str(p.id): p for p in result.scalars().all()}

    subtotal = Decimal("0")
    names: list[str] = []
    cart_snapshot: list[dict] = []
    for product_id, qty in cart.items():
        product = products.get(product_id)
        if product:
            price = Decimal(str(product.price))
            subtotal += price * qty
            names.append(f"{product.name} ×{qty}")
            cart_snapshot.append({
                "product_id": str(product.id),
                "product_name": product.name,
                "price": str(price),
                "quantity": qty,
                "subtotal": str(price * qty),
            })

    discount = Decimal("0")
    if data.get("promo_discount_type"):
        discount = _compute_discount(subtotal, data["promo_discount_type"], Decimal(data["promo_discount_value"]))

    final_total = subtotal - discount
    stars_amount = max(1, int((final_total / _STARS_RATE).to_integral_value()))
    payload = f"dokonly_{tenant.id}"

    await state.update_data(
        stars_payload=payload,
        cart_snapshot=cart_snapshot,
        stars_subtotal=str(subtotal),
        stars_discount=str(discount),
    )
    await state.set_state(CheckoutStates.waiting_stars_payment)

    await message.bot.send_invoice(
        chat_id=message.chat.id,
        title="Оплата заказа",
        description=", ".join(names) or "Товары из корзины",
        payload=payload,
        currency="XTR",
        prices=[LabeledPrice(label="Итого", amount=stars_amount)],
    )


@router.callback_query(F.data.startswith("buy:"))
async def add_to_cart(callback: CallbackQuery, state: FSMContext):
    product_id = callback.data.split(":", 1)[1]
    data = await state.get_data()
    cart: dict[str, int] = data.get("cart", {})
    is_first_item = not cart
    cart[product_id] = cart.get(product_id, 0) + 1
    await state.update_data(cart=cart)

    if is_first_item and arq_pool:
        await arq_pool.enqueue_job(
            "send_cart_reminder",
            callback.from_user.id,
            _defer_by=timedelta(hours=2),
            _job_id=f"cart_reminder:{callback.from_user.id}",
        )

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
    await _ask_promo(callback.message, state)
    await callback.answer()


@router.message(CheckoutStates.waiting_promo, F.text)
async def handle_promo(message: Message, state: FSMContext, tenant: Tenant | None):
    code = message.text.strip().upper()
    if tenant:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(PromoCode).where(
                    PromoCode.tenant_id == tenant.id,
                    PromoCode.code == code,
                )
            )
            promo = result.scalar_one_or_none()

        if promo and _promo_is_valid(promo):
            await state.update_data(
                promo_id=str(promo.id),
                promo_code=code,
                promo_discount_type=promo.discount_type,
                promo_discount_value=str(promo.discount_value),
            )
            await message.answer(f"✅ Промокод «{code}» применён!")
        else:
            await message.answer("❌ Промокод недействителен. Продолжаем без скидки.")

    await _continue_after_promo(message, state, tenant)


@router.callback_query(F.data == "skip_promo", CheckoutStates.waiting_promo)
async def skip_promo(callback: CallbackQuery, state: FSMContext, tenant: Tenant | None):
    await callback.answer()
    await _continue_after_promo(callback.message, state, tenant)


@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery, state: FSMContext):
    current = await state.get_state()
    if current != CheckoutStates.waiting_stars_payment:
        await query.answer(ok=False, error_message="Платёж устарел, начните заново.")
        return
    data = await state.get_data()
    if query.invoice_payload != data.get("stars_payload"):
        await query.answer(ok=False, error_message="Платёж устарел, начните заново.")
        return
    await query.answer(ok=True)


@router.message(F.successful_payment, CheckoutStates.waiting_stars_payment)
async def handle_successful_payment(message: Message, state: FSMContext, tenant: Tenant | None):
    if not tenant:
        await message.answer("Ошибка: магазин не найден.")
        await state.clear()
        return

    data = await state.get_data()
    cart_snapshot: list[dict] = data.get("cart_snapshot", [])
    charge_id = message.successful_payment.telegram_payment_charge_id
    stars_total = message.successful_payment.total_amount
    subtotal = Decimal(data.get("stars_subtotal", "0"))
    discount = Decimal(data.get("stars_discount", "0"))
    promo_id: str | None = data.get("promo_id")

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Order).where(Order.payment_id == charge_id))
        if existing.scalar_one_or_none():
            await message.answer("Этот заказ уже оформлен.")
            await state.clear()
            return

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

        order = Order(
            tenant_id=tenant.id,
            customer_id=customer.id,
            status="new",
            payment_method="telegram_stars",
            payment_status="paid",
            payment_id=charge_id,
            subtotal=subtotal,
            discount=discount,
            total=subtotal - discount,
            currency="XTR",
            meta={"stars_amount": stars_total},
        )
        db.add(order)
        await db.flush()

        for item in cart_snapshot:
            db.add(OrderItem(
                order_id=order.id,
                product_id=item["product_id"],
                product_name=item["product_name"],
                price=Decimal(item["price"]),
                quantity=item["quantity"],
                subtotal=Decimal(item["subtotal"]),
            ))

        await db.execute(
            sa_update(Customer)
            .where(Customer.id == customer.id)
            .values(
                total_orders=Customer.total_orders + 1,
                total_spent=Customer.total_spent + (subtotal - discount),
            )
        )

        if promo_id:
            await db.execute(
                sa_update(PromoCode)
                .where(PromoCode.id == uuid.UUID(promo_id))
                .values(used_count=PromoCode.used_count + 1)
            )

        await db.commit()
        order_id_short = str(order.id)[:8].upper()

    await state.clear()
    await message.answer(
        f"⭐ Оплата получена! Заказ #{order_id_short} оформлен.\n"
        f"Спасибо за покупку!"
    )


@router.message(CheckoutStates.waiting_delivery_note, F.text)
async def place_order(message: Message, state: FSMContext, tenant: Tenant | None):
    if not tenant:
        await message.answer("Ошибка: магазин не найден.")
        await state.clear()
        return

    data = await state.get_data()
    cart: dict[str, int] = data.get("cart", {})
    if not cart:
        await message.answer("Корзина пуста!")
        await state.clear()
        return

    promo_id: str | None = data.get("promo_id")

    async with AsyncSessionLocal() as db:
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

        prod_result = await db.execute(select(Product).where(Product.id.in_(cart.keys())))
        products = {str(p.id): p for p in prod_result.scalars().all()}

        order_items: list[OrderItem] = []
        subtotal = Decimal("0")
        for product_id, qty in cart.items():
            product = products.get(product_id)
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

        discount = Decimal("0")
        if data.get("promo_discount_type"):
            discount = _compute_discount(
                subtotal,
                data["promo_discount_type"],
                Decimal(data["promo_discount_value"]),
            )

        order = Order(
            tenant_id=tenant.id,
            customer_id=customer.id,
            status="new",
            payment_method=data["payment_method"],
            payment_status="pending",
            subtotal=subtotal,
            discount=discount,
            total=subtotal - discount,
            currency=tenant.currency,
            delivery_note=message.text,
        )
        db.add(order)
        await db.flush()

        for item in order_items:
            item.order_id = order.id
            db.add(item)

        await db.execute(
            sa_update(Customer)
            .where(Customer.id == customer.id)
            .values(
                total_orders=Customer.total_orders + 1,
                total_spent=Customer.total_spent + (subtotal - discount),
            )
        )

        if promo_id:
            await db.execute(
                sa_update(PromoCode)
                .where(PromoCode.id == uuid.UUID(promo_id))
                .values(used_count=PromoCode.used_count + 1)
            )

        await db.commit()
        order_id_short = str(order.id)[:8].upper()
        order_currency = tenant.currency
        manual_transfer = (tenant.settings or {}).get("manual_transfer")
        payment_method = data["payment_method"]

    await state.clear()
    await message.answer(
        f"✅ Заказ #{order_id_short} принят!\n\n"
        f"Сумма: {int(subtotal):,} {order_currency}"
        + (f"\nСкидка: -{int(discount):,} {order_currency}" if discount else "")
        + f"\nИтого: {int(subtotal - discount):,} {order_currency}\n"
        f"Мы свяжемся с вами для подтверждения."
    )

    if payment_method == "manual_transfer" and manual_transfer:
        await message.answer(
            f"💳 <b>Реквизиты для перевода:</b>\n\n"
            f"Банк: {manual_transfer['bank_name']}\n"
            f"Карта: <code>{manual_transfer['card_number']}</code>\n"
            f"Получатель: {manual_transfer['card_holder']}\n\n"
            f"После перевода пришлите скриншот продавцу."
        )
