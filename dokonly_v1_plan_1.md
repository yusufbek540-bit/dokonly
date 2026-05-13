# Dokonly v1 — План разработки (v2.0)

> **Документ для Claude Code.** Открой в начале сессии разработки и обращайся к нему в течение работы. Можно прокидывать в подзадачи через `@docs/plan.md`.
>
> **Версия 2.0** — обновлено после конкурентного анализа Sellz 5.0, стратегического pivot к глобальному позиционированию, и решений по mobile-first + dual frontend.

---

## 0. Контекст продукта

**Dokonly** — глобальная Telegram-commerce платформа для emerging markets. Запускается с Узбекистаном как первым рынком, далее масштабируется на CIS, Юго-Восточную Азию, MENA и Латинскую Америку.

Это **не «продукт для UZ с амбициями»**, а **глобальный продукт с глубокой локализацией** под каждый рынок. Эта разница принципиальна — для архитектуры, маркетинга, и для будущих инвесторов.

### Что это такое в одном предложении

SaaS-конструктор Telegram-магазинов для микро- и малого бизнеса, который позволяет за 5 минут создать полнофункциональный магазин с собственным ботом, Mini App витриной, локальными платежами и AI-инструментами — без программирования, без юр.лица, без бюрократии.

### Подписочная модель

4 тарифа (Старт / Бизнес / Премиум / Enterprise), 14-дневный trial **без карты**. Никаких комиссий с заказов. Никакой зависимости от Telegram Stars или иностранных платёжных систем.

### Команда

3 со-фаундера, бутстрап-старт из Ташкента. Главный разработчик — не программист по образованию, ведёт разработку через Claude Code.

### Целевая аудитория (для запуска в UZ)

**Амбициозные продавцы с 30–500 заказами в месяц** — НЕ «мелкие бедные продавцы», а те кто хочет масштабироваться. Большинство работают без юр.лица или как самозанятые. Профиль:

- Магазины косметики, одежды, цветов, electronics, food, accessories
- Продают через Instagram-посты + DM или Telegram-канал + ручная обработка заказов
- Хотят системности, но не готовы к Bitrix24/Shopify (сложно, дорого, не локализовано)
- Готовы платить $16–80/мес за нормальный инструмент

### Что НЕ входит в v1 (сознательное сужение scope)

**Категория «Фискализация и налоговый учёт» — отложено полностью:**
- Онлайн-фискализация через Soliq.uz (требует партнёра, юр.договор, лицензию ЦБ)
- ИКПУ-коды, НДС-учёт, документы для бухгалтера
- Интеграция с 1С / SAP / ERP

*Обоснование:* 95% целевой аудитории v1 — физлица и самозанятые, для которых фискализация **не требуется по закону UZ**. Для остальных 5% — могут использовать внешние решения параллельно. Реализация заняла бы 9–14 недель + партнёрские договоры + поддержка налоговых изменений. В v2 — рассмотрим интегрированную фискализацию через партнёра как фичу Премиум/Enterprise.

**Другие функции отложенные:**
- Прямая интеграция Click/Payme через их API (требует юр.договоров с банками) — в v1 через manual transfer + Telegram Stars
- Рассрочка Alif/Uzum Nasiya (требует партнёрских договоров)
- Sync с Uzum/Wildberries
- SMS-рассылки (требует Eskiz/Playmobile)
- Веб-сайты для магазинов на собственных доменах — в v2/v3 как премиум-фича
- Иерархия категорий товаров (подкатегории) — в v2
- Публичный API для клиентов
- SLA с финансовой компенсацией

**Что ВХОДИТ в v1:** ~60 функций — каталог, заказы, AI-импорт, маркетинг, аналитика, команда, Mini App витрина, мульти-бот архитектура, manual payments, Telegram Stars, cash on delivery, Channel Subscription Gate, расширенная аналитика, сегментированный mass mailing, business templates по 15 сферам, dual frontend (Mini App + Web Dashboard).

---

## 1. Стратегическое позиционирование

### Фрейминг

❌ **НЕ:** «Dokonly — для узбекских продавцов в Telegram»

✅ **ДА:** «Dokonly — современная commerce-платформа Telegram для emerging markets. Сейчас доступна в Узбекистане.»

### Почему это важно

1. **Архитектурно:** заставляет с первого дня делать i18n, multi-currency, payment abstraction, country-config — иначе через год будет дорогой рефакторинг
2. **Маркетингово:** «глобальный продукт» сильнее звучит для всех аудиторий — местных продавцов («они серьёзные»), будущих рынков («они уже работали в похожих условиях»), инвесторов («это масштабируется»)
3. **Стратегически:** позволяет не размазываться по фичам только под UZ, а делать **переиспользуемые модули** с конфигурацией per-country

### Дифференциация vs главный конкурент (Sellz)

Sellz — глобальная Telegram-commerce платформа (v5.0, в Telegram App Store). После детального анализа мы выявили **9 ключевых преимуществ Dokonly**:

1. **Click + Payme как первый класс** — у Sellz эти провайдеры есть в UI, но НЕ активны. Окно возможностей закроется через 3–6 месяцев. Dokonly должен запуститься с **рабочей интеграцией** в v1
2. **AI-first подход** — AI-импорт фото с подписями, голосовой импорт, AI-консультант на узбекском. У Sellz нет AI-фич вообще
3. **14 дней trial без карты** (vs 5 дней у Sellz)
4. **В 100x больше товаров за те же деньги** в среднем тарифе:
   - Sellz Pro: 15 товаров за $36/мес → $2.40 за товар
   - Dokonly Бизнес: 1500 товаров за $40/мес → $0.027 за товар
5. **Manual card transfer** как первоклассная фича — для физлиц без юр.лица. У Sellz нет
6. **Видео товара в базовом тарифе** — у Sellz залочено за paywall (Pro+)
7. **Расширенная аналитика** — воронка, retention, AOV, revenue trends. У Sellz базовая (страны, языки, просмотры)
8. **Mass mailing с сегментацией** — по последней покупке, AOV, локации, языку. У Sellz простой broadcast
9. **Wizard самозанятого** в onboarding (UZ) — для нашей целевой аудитории. У Sellz никаких юр-помощников

### Прайсинг — финал

| Тариф | UZS/мес | USD/мес | Товаров | Магазинов | Админов |
|---|---|---|---|---|---|
| **Старт** | 199 000 | $16 | 100 | 1 | 1 |
| **Бизнес** ⭐ POPULAR | 499 000 | $40 | 1 500 | 3 | 5 |
| **Премиум** | 999 000 | $80 | ∞ | 10 | ∞ |
| **Enterprise** | от 2 500 000 | от $200 | индивидуально | индивидуально | индивидуально |

**14 дней trial БЕЗ карты.** Чистая подписка, без комиссий с заказов.

Sellz Lite ($9 за 9 товаров) — это **trap pricing**, искусственное ограничение. Мы не подстраиваемся.

### Брендинг

**Имя:** Dokonly — гибрид узб. «dokon» (магазин) + англ. суффикса «-ly» (как Shopify, Calendly). Двойной смысл: «Dokon + only» = только магазин, фокус.

**Дизайн:** Direction B (Tech-минимализм) с dual theme (light + dark) и theme toggle (⌘+J / Ctrl+J).

**Палитра light:** bg #FAFAFA, card #FFFFFF, subtle #F4F4F5, ink #09090B, muted #71717A, accent #00B383 (зелёный), accent-soft #ECFDF5

**Палитра dark:** bg #09090B, card #141417, subtle #1C1C20, elevated #1F1F23, ink #FAFAFA, muted #A1A1AA, accent #00D199 (более яркий зелёный), accent-soft rgba(0,209,153,0.1)

**Шрифты:** Sora (display), Outfit (body), JetBrains Mono (числа и коды), Instrument Serif (italic accents)

---

## 2. Целевые рынки и Roadmap экспансии

Roadmap прописан в плане v1 явно, чтобы архитектурные решения сразу учитывали будущие рынки.

### Phase 1 — Uzbekistan (месяцы 0–6)

**Цель:** Запуск, продуктовая валидация, первые 200 платящих клиентов.

**Платежи v1:** Click и Payme (через manual setup в v1, прямая интеграция в v1.5), Telegram Stars, manual card transfer, cash on delivery.

**Языки v1:** Русский + Узбекский (латиница), English как опция.

**Legal-фичи:** Wizard самозанятого, manual card transfer, опциональная привязка к юр.лицу.

### Phase 2 — Kazakhstan + Kyrgyzstan (месяцы 6–12)

**Казахстан:** Kaspi Pay доминирует, но Telegram-commerce есть. Похожий профиль продавца, русский язык работает «из коробки».

**Кыргызстан:** Меньше рынок, но easy expansion из UZ (язык, валюта похожая, есть узбекская диаспора). Платежи: MBank, Optima.

**Что добавляется:**
- Валюты KZT, KGS
- Языки KK (казахский), KG (кыргызский)
- Payment providers: KaspiProvider, MBankProvider, OptimaProvider
- Country-specific legal-config для KZ и KG

### Phase 3 — расширение по CIS (месяцы 12–24)

**Таджикистан, Туркменистан** — близкие рынки, похожий профиль.

**Азербайджан** — отдельный рынок, но похожий мелкий бизнес-профиль. Платежи: Azerpost.

**Армения, Грузия** — Telegram распространён, локальные платежные системы.

### Phase 4 — Russia + Восточная Европа (месяцы 24+)

**Россия** — огромный рынок, но политические/санкционные риски + сильные конкуренты типа TGShop.io. Рассматриваем как pilot.

**Беларусь, Молдова** — меньшие рынки, easier entry после RU.

### Phase 5 — Emerging Markets mature stage (месяцы 36+)

**Юго-Восточная Азия:** Индонезия, Вьетнам, Филиппины. Telegram-commerce там реально летит, профиль продавца похож на UZ (small business, manual payments, бутстрап).

**MENA:** Египет, Марокко. Telegram популярен, локальные платежи отличаются (Fawry, K-Net).

**Латинская Америка:** Аргентина, Колумбия. Telegram-commerce растёт.

### Архитектурные импликации roadmap

Каждое архитектурное решение в v1 должно отвечать на вопрос: **«Можно ли добавить новую страну/валюту/платёжный провайдер без переписывания кода?»** Если нет — переделать в v1, а не копить долг.

---

## 3. Конкурентный анализ и позиционирование

### Главный конкурент — Sellz (детально)

**Что это:** Глобальная Telegram-commerce платформа, v5.0, в Telegram App Store. Не MVP — зрелый продукт.

**Их тарифы (в Telegram Stars, конвертация ~$0.018/star):**

| Тариф | 1 мес (Stars) | $/мес | Товаров | Категорий | Платежи |
|---|---|---|---|---|---|
| Lite | 499 ⭐ | ~$9 | 9 | 1 | Stars + cash |
| Pro | 1 999 ⭐ | ~$36 | 15 | 5 | + карты + крипта |
| Max | 3 999 ⭐ | ~$72 | ∞ | ∞ | Всё |

**Их платежные провайдеры (скриншот из админки):**
- ✅ Активны: Cash, Telegram Stars
- ❌ Неактивны (но в списке): **Click**, **Paycom**, Toncoin, Stripe, Paymega, Paycassma

**Это критическая находка.** Sellz уже подготовил слоты для Click и Payme — они знают про UZ и могут активировать в любой момент. У нас окно 3–6 месяцев чтобы запуститься с **рабочей интеграцией** этих провайдеров.

**Их сильные стороны:**
- Listing в Telegram App Store (огромное distribution)
- Зрелый UI (5 major-релизов), нативно-телеграмный
- Team management с детальными permissions
- Channel Subscription Gate (обязательная подписка на канал для доступа к магазину)
- Multi-step заказы (5 статусов с финальным «получен отзыв»)
- Образовательные экраны перед сложными фичами

**Их слабые стороны (наши возможности):**
1. Click/Payme не активны
2. Узбекского языка нет
3. Аналитика базовая (только страны/языки/просмотры)
4. Mass mailing без сегментации (простой broadcast)
5. Видео товара залочено за paywall
6. 5 дней trial vs наши 14
7. Агрессивный upsell через искусственные лимиты (9 товаров на Lite)
8. Нет AI-фич
9. Telegram Stars как основной способ оплаты (неудобно в UZ — нужна международная карта)

### Другие игроки

**TGShop.io** (RU): $36–71/мес. Не локализован под UZ, без AI. Прямой конкурент Sellz, не нам.

**Salez.app:** $29–799/мес + комиссии. Retail-система с курьерами/POS. Другой сегмент.

**OsonDokon** (UZ, 2026): Basic 400k сум ($32), Pro 700k ($56). Серьёзный конкурент: веб+TG, Nasiya, multi-branch, SEO, CRM. **Не Telegram-first, нет глубокого AI.** Слабее по mobile UX.

**Billz.io** (Calvin Klein, Levi's, L'Occitane): Enterprise retail-management для 600 магазинов. Другой сегмент — не угроза для micro.

**@ShopsBuilderBot:** НЕ от Telegram, сторонний, мало раскручен. Не угроза.

### Маркетинговое позиционирование на лендинге

**Главное сравнение** (для русскоязычных рынков):

> «Sellz Pro: 15 товаров за $36/мес.
> Dokonly Бизнес: **1500 товаров** за $40/мес.
> Плюс Click, Payme, AI на узбекском и **14 дней бесплатно**.»

**Месседж для UZ:**
> «Без юр.лица. Без бюрократии. Платите в сумах через Click, Payme или картой. Без Apple ID, без покупки звёзд, без сложностей.»

**Глобальный месседж** (для будущих рынков):
> «Built for emerging markets. Local payments, native languages, AI-first.»

---


## 4. Архитектурные принципы

Все архитектурные решения проходят через **5 фильтров**. Если фича не проходит — переделать перед merge.

### 4.1 Globalization-first

**Принцип:** Никакой UZ-специфики хардкодом. Всё через конфигурацию.

#### i18n с первого дня

- Все строки UI через `t('key')` — нет хардкода
- Файлы локализации: `locales/uz.json`, `ru.json`, `en.json` (v1) + готовы для `kk.json`, `kg.json`, `ar.json`, `id.json` (будущие рынки)
- Использовать `i18next` для frontend (поддержка plural forms, datetime formatting)
- Backend: `babel` для серверных строк (email-шаблоны, push-уведомления)
- **Acceptance:** `grep -rn "Введите" src/` должно вернуть 0 результатов. Все строки через `t()`.

#### Multi-currency

- Каждый tenant имеет поле `currency` (UZS, KZT, RUB, USD, EUR, и т.д.)
- Все цены хранятся в БД с currency code, не в одной валюте с конвертацией
- Форматирование сумм per-locale: `formatCurrency(amount, currency, locale)` (например, `1500 000 so'm` для UZS+UZ, `1,500 ₸` для KZT+KZ)
- Telegram Stars — отдельная виртуальная валюта, не примешивается к фиатным
- **Acceptance:** Нет в коде строк `* 12500` или `UZS_TO_USD_RATE`. Каждый magnitude приходит с валютой.

#### Country-config

- Файлы `config/countries/{code}.yml` — конфигурация per-country
- Что в конфиге: доступные платёжные провайдеры, legal-формы, налоговые правила, языки по умолчанию, форматы номеров телефона, минимальная длина паролей, и т.д.
- Backend читает через `CountryConfig.load(country_code)` и кэширует в Redis
- **Acceptance:** Добавление нового рынка = 1 yml файл + новые реализации платёжных провайдеров. Никаких изменений в core-коде.

#### Legal compliance module

- Отдельный модуль `legal_compliance/` с правилами per-country
- Manual card transfer работает в UZ, КГ, ТЖ. **Незаконно в EU.** Правила в `legal_compliance/uz.py`, `legal_compliance/ee.py`, и т.д.
- При регистрации tenant — проверка `LegalCompliance.is_allowed(country, feature)` перед включением фичи
- Wizard самозанятого — UZ-only фича, в других странах скрыта или заменена на местные аналоги

### 4.2 Mobile-first

**Принцип:** Каждая фича сначала работает на мобиле, потом расширяется на веб. Не наоборот.

#### Acceptance criteria для каждой фичи

1. **Работает на 375px ширине** — iPhone SE, маленькие Android. Без горизонтального скролла. Без обрезаний.
2. **Используется одной рукой** — главные действия (CTA) в нижних 60% экрана, не в шапке
3. **Не зависит от hover, right-click, или сложных жестов**

#### Mobile UI паттерны (Telegram Mini App)

- **Bottom navigation** для основных разделов (Каталог, Заказы, Аналитика, Настройки)
- **Telegram MainButton** для primary действий (Сохранить, Подтвердить заказ) — внизу экрана, нативный telegram-стиль
- **Telegram BackButton** для навигации — нативный, не свой ← в углу
- **Pull-to-refresh** для всех списков (заказы, продукты, клиенты)
- **Infinite scroll** для длинных списков (нет пагинации)
- **Sticky filters/search** сверху, не в боковой панели
- **Swipe actions** на элементах списков (заказы, товары) — следующий статус, удалить, дублировать
- **Long-press** для контекстного меню
- **Skeleton loaders** при загрузке, не spinners
- **Bottom sheets** для модальных окон (как Telegram), не центрированные modals

#### Telegram-native UI стиль

Главный принцип: Mini App должен выглядеть **как часть Telegram, не как сайт внутри Telegram**.

- Использовать **Telegram Theme Variables** (`var(--tg-theme-bg-color)`, `--tg-theme-text-color`, `--tg-theme-button-color`, и т.д.) — автоматическое light/dark из настроек Telegram
- Toggle switches как у Telegram (зелёные iOS-стиль)
- Buttons как у Telegram (закруглённые, синие/зелёные accent)
- Списки с separator-линиями как в Telegram
- Иконки — emoji + SF Symbols (на iOS) / Material Icons (на Android)
- Анимации — короткие 0.2s ease-out, как в Telegram

#### Web Dashboard (admin.dokonly.com)

Не «упрощённая копия мобилки», а **расширение для тех кто за компьютером**:

- Sidebar навигация вместо bottom-nav
- Канбан-доска для заказов (drag-and-drop)
- Bulk-операции (выбрать несколько товаров → массовое редактирование)
- Расширенная аналитика с большими графиками
- Экспорт в Excel/CSV
- Клавиатурные сокращения
- Multi-pane layouts (список + детали)

Веб — это **удобство для power-users**. Mobile — это **must-have для всех**.

### 4.3 Multi-tenant архитектура

- Каждый магазин = свой Telegram-бот (через @BotFather)
- Один backend обслуживает все боты через webhook routing
- Идентификация tenant: `tenant_id` по `bot_token_hash` (SHA-256 от токена)
- Row-Level Security в Supabase: все таблицы имеют `tenant_id`, RLS-policy проверяет `auth.uid()` против tenant.owner_id
- Multi-store: один владелец может иметь несколько магазинов (см. Бизнес/Премиум тарифы)
- Один tenant может иметь несколько админов (см. лимиты тарифов)

### 4.4 Payment provider abstraction

**Принцип:** Добавление нового провайдера = одна реализация интерфейса, никаких изменений в checkout-коде.

```python
# backend/payment/base.py
class PaymentProvider(ABC):
    @abstractmethod
    async def create_payment(self, amount: Decimal, currency: str, metadata: dict) -> PaymentResult: ...

    @abstractmethod
    async def verify_payment(self, payment_id: str) -> PaymentStatus: ...

    @abstractmethod
    async def refund(self, payment_id: str, amount: Optional[Decimal]) -> RefundResult: ...

# backend/payment/providers/click.py
class ClickProvider(PaymentProvider): ...

# backend/payment/providers/payme.py
class PaymeProvider(PaymentProvider): ...

# backend/payment/providers/manual_transfer.py
class ManualTransferProvider(PaymentProvider): ...

# backend/payment/providers/telegram_stars.py
class TelegramStarsProvider(PaymentProvider): ...
```

Roadmap провайдеров v1:
- ✅ ManualTransferProvider (UZ-specific, для физлиц)
- ✅ TelegramStarsProvider (для покупателей с зарубежными картами)
- ✅ CashOnDeliveryProvider (наличные при получении)
- 🚧 ClickProvider (через P2P merchant в v1, прямая API в v1.5)
- 🚧 PaymeProvider (через P2P merchant в v1, прямая API в v1.5)

Roadmap провайдеров v2+:
- KaspiProvider (KZ)
- MBankProvider, OptimaProvider (KG)
- StripeProvider (международный фолбэк)
- TonProvider (крипта)

### 4.5 Feature flags per-country

**Принцип:** Никаких `if (country === 'UZ')` в коде. Всё через feature flags.

```python
# config/countries/uz.yml
features:
  manual_card_transfer: true
  click_provider: true
  payme_provider: true
  self_employed_wizard: true
  telegram_stars: true

# config/countries/kz.yml
features:
  manual_card_transfer: true
  kaspi_provider: true
  telegram_stars: true
  self_employed_wizard: false  # в КЗ другая legal-форма

# Usage in code:
if features.is_enabled(tenant.country, "manual_card_transfer"):
    show_manual_transfer_option()
```

---

## 5. Технологический стек

### Backend

- **Python 3.12** + **FastAPI** — REST API с автогенерацией OpenAPI docs
- **SQLAlchemy 2.0** (async) + **Alembic** — ORM и миграции
- **Pydantic 2** — валидация схем, AI structured outputs
- **aiogram 3** — Telegram Bot API
- **ARQ** — очереди задач на Redis
- **Redis** — кэш, сессии, очереди
- **httpx** — HTTP клиент для внешних API
- **Babel** — серверная локализация (email-шаблоны, push)

### Frontend

**Два отдельных приложения с shared design-system:**

- **`apps/miniapp/`** — Telegram Mini App для продавцов и покупателей
- **`apps/dashboard/`** — Web-админка `admin.dokonly.com`
- **`packages/ui/`** — shared React-компоненты (Button, Card, Input, и т.д.)
- **`packages/shared/`** — shared types, validators, helpers

Стек обоих фронтов:
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** (адаптировано)
- **TanStack Query** — server state
- **Zustand** — client state
- **i18next** + **react-i18next** — локализация
- **Telegram WebApp SDK** — только в miniapp

### Инфраструктура

- **Supabase Pro** — managed PostgreSQL с Row-Level Security ($25/мес)
- **Cloudflare R2** — хранилище фото/видео товаров (S3-совместимое, $0 egress)
- **Cloudflare Pages** — деплой фронтов (бесплатно)
- **Render** или **Railway** — деплой бэкенда ($7–20/мес для starter)
- **Sentry** — мониторинг ошибок (free tier)
- **PostHog** — продуктовая аналитика (free до 1M events)

### AI слой

Провайдер-агностичная архитектура через `AIRouter`:

- **OpenRouter** — основной роутер для всех LLM-задач (Anthropic, OpenAI, Google, Mistral)
- **Anthropic SDK напрямую** — для критичных задач с prompt caching (AI-консультант для покупателей)
- **Groq** — для Whisper транскрипций (голосовой импорт каталога)

```python
# backend/ai/router.py
class AIRouter:
    async def complete(
        self,
        task: TaskType,  # "product_extraction", "consultant", "translation", etc.
        messages: list,
        **kwargs
    ) -> AIResponse:
        provider = self._select_provider(task)
        return await provider.complete(messages, **kwargs)
```

### Tooling

- **uv** — менеджер пакетов Python (быстрее pip)
- **ruff** — линтер и форматтер
- **mypy** — статическая типизация
- **pytest** + **pytest-asyncio** — тесты
- **Docker** + **docker-compose** — локальная разработка
- **GitHub Actions** — CI/CD
- **Turborepo** — для monorepo (apps + packages)

---

## 6. Структура проекта

Monorepo с турборепо. Два frontend + один backend + shared packages.

```
dokonly/
├── apps/
│   ├── api/                                # FastAPI бэкенд
│   │   ├── dokonly_api/
│   │   │   ├── __init__.py
│   │   │   ├── main.py                    # FastAPI app entrypoint
│   │   │   ├── config.py                  # Settings через pydantic-settings
│   │   │   ├── database.py                # SQLAlchemy engine, session
│   │   │   ├── deps.py                    # FastAPI dependencies
│   │   │   ├── models/                    # SQLAlchemy модели
│   │   │   │   ├── tenant.py
│   │   │   │   ├── product.py
│   │   │   │   ├── order.py
│   │   │   │   ├── customer.py
│   │   │   │   ├── subscription.py
│   │   │   │   ├── template.py
│   │   │   │   └── ...
│   │   │   ├── schemas/                   # Pydantic схемы
│   │   │   ├── routes/                    # API endpoints
│   │   │   │   ├── auth.py
│   │   │   │   ├── tenants.py
│   │   │   │   ├── products.py
│   │   │   │   ├── orders.py
│   │   │   │   ├── payments.py
│   │   │   │   ├── ai.py
│   │   │   │   ├── analytics.py
│   │   │   │   └── webhooks.py            # Telegram webhooks
│   │   │   ├── bot/                       # aiogram handlers
│   │   │   │   ├── router.py              # Multi-bot routing
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── start.py
│   │   │   │   │   ├── catalog.py
│   │   │   │   │   ├── checkout.py
│   │   │   │   │   └── ...
│   │   │   │   └── middlewares/
│   │   │   ├── payment/                   # Payment providers
│   │   │   │   ├── base.py               # PaymentProvider ABC
│   │   │   │   └── providers/
│   │   │   │       ├── click.py
│   │   │   │       ├── payme.py
│   │   │   │       ├── manual_transfer.py
│   │   │   │       ├── telegram_stars.py
│   │   │   │       ├── cash_on_delivery.py
│   │   │   │       └── kaspi.py          # (v2)
│   │   │   ├── ai/                        # AI слой
│   │   │   │   ├── router.py             # AIRouter
│   │   │   │   ├── providers/
│   │   │   │   │   ├── openrouter.py
│   │   │   │   │   ├── anthropic.py
│   │   │   │   │   └── groq.py
│   │   │   │   ├── tasks/                # Domain-specific AI tasks
│   │   │   │   │   ├── product_extraction.py
│   │   │   │   │   ├── consultant.py
│   │   │   │   │   ├── translation.py
│   │   │   │   │   └── mailing_generation.py
│   │   │   │   └── prompts/              # Prompt templates
│   │   │   ├── legal_compliance/         # Country-specific legal rules
│   │   │   │   ├── base.py
│   │   │   │   ├── uz.py
│   │   │   │   ├── kz.py
│   │   │   │   └── ...
│   │   │   ├── i18n/                     # Server-side translations
│   │   │   │   └── locales/
│   │   │   │       ├── uz.json
│   │   │   │       ├── ru.json
│   │   │   │       └── en.json
│   │   │   ├── workers/                  # ARQ background tasks
│   │   │   │   ├── ai_imports.py
│   │   │   │   ├── mass_mailing.py
│   │   │   │   └── analytics.py
│   │   │   ├── utils/
│   │   │   │   ├── currency.py           # formatCurrency, conversions
│   │   │   │   ├── country_config.py     # CountryConfig.load()
│   │   │   │   └── feature_flags.py
│   │   │   └── tests/
│   │   ├── alembic/
│   │   │   └── versions/
│   │   ├── alembic.ini
│   │   ├── pyproject.toml
│   │   └── README.md
│   │
│   ├── miniapp/                            # Telegram Mini App (React)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── seller/                # Админка продавца
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── Catalog/
│   │   │   │   │   ├── Orders/
│   │   │   │   │   ├── Analytics/
│   │   │   │   │   ├── Settings/
│   │   │   │   │   └── Onboarding/
│   │   │   │   └── customer/              # Витрина покупателя
│   │   │   │       ├── Storefront.tsx
│   │   │   │       ├── ProductPage.tsx
│   │   │   │       ├── Cart.tsx
│   │   │   │       └── Checkout.tsx
│   │   │   ├── components/                # App-specific components
│   │   │   ├── hooks/
│   │   │   │   ├── useTelegramWebApp.ts
│   │   │   │   ├── useTenant.ts
│   │   │   │   └── ...
│   │   │   ├── api/                       # TanStack Query hooks
│   │   │   ├── stores/                    # Zustand stores
│   │   │   ├── locales/
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── dashboard/                          # Web-админка (React)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/                     # Те же модули что в miniapp,
│       │   │   ├── Dashboard.tsx          # но с web-layout (sidebar + tables)
│       │   │   ├── Catalog/
│       │   │   ├── Orders/
│       │   │   │   └── KanbanBoard.tsx    # Web-only канбан с drag-and-drop
│       │   │   ├── Analytics/
│       │   │   └── ...
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── api/
│       │   ├── stores/
│       │   ├── locales/
│       │   └── styles/
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   ├── ui/                                 # Shared design system
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── BottomSheet.tsx       # Mobile-specific
│   │   │   │   ├── Tabs.tsx
│   │   │   │   └── ...
│   │   │   ├── tokens/                   # Design tokens
│   │   │   │   ├── colors.ts             # Light + Dark palettes
│   │   │   │   ├── typography.ts
│   │   │   │   ├── spacing.ts
│   │   │   │   └── animation.ts
│   │   │   └── styles/
│   │   │       └── global.css
│   │   └── package.json
│   │
│   └── shared/                             # Shared types, validators
│       ├── src/
│       │   ├── types/                    # TypeScript types
│       │   ├── validators/               # Zod schemas
│       │   └── utils/
│       └── package.json
│
├── docs/
│   ├── plan.md                            # Этот файл
│   ├── architecture.md
│   ├── api-spec.md
│   └── ...
│
├── infra/                                  # Docker, deploy configs
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── .github/
│       └── workflows/
│
├── turbo.json
├── package.json                            # Root package.json
├── pnpm-workspace.yaml
└── README.md
```

---


## 7. Database Schema

Все таблицы используют `tenant_id` (UUID, foreign key) для multi-tenancy. Row-Level Security (RLS) включена в Supabase.

### 7.1 Core tables

#### `tenants` — магазины (главная таблица)

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  bot_token TEXT NOT NULL,                      -- зашифрован
  bot_token_hash TEXT NOT NULL UNIQUE,          -- SHA-256, для routing
  bot_username TEXT NOT NULL UNIQUE,            -- @example_shop_bot

  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,                               -- R2 URL
  business_category TEXT NOT NULL,              -- 'fashion', 'electronics', etc.

  -- Globalization
  country TEXT NOT NULL,                        -- ISO-3166: 'UZ', 'KZ', 'RU', etc.
  currency TEXT NOT NULL,                       -- ISO-4217: 'UZS', 'KZT', etc.
  default_language TEXT NOT NULL,               -- ISO-639: 'ru', 'uz', 'en'
  supported_languages TEXT[] NOT NULL DEFAULT '{}',  -- ['ru', 'uz']
  timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',

  -- Legal (country-specific)
  legal_status TEXT,                            -- 'individual', 'self_employed', 'ip', 'llc'
  legal_data JSONB DEFAULT '{}',                -- inn, ogrn, address, etc.

  -- Subscription
  plan TEXT NOT NULL DEFAULT 'trial',           -- 'trial', 'start', 'business', 'premium', 'enterprise'
  trial_ends_at TIMESTAMPTZ,
  plan_renewed_at TIMESTAMPTZ,

  -- Template
  template_id TEXT,                             -- 'fashion_minimal', 'electronics_modern', etc.

  -- Channel integration
  telegram_channel_username TEXT,
  channel_subscription_required BOOLEAN DEFAULT FALSE,

  -- Settings (denormalized for performance)
  settings JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_owner ON tenants(owner_id);
CREATE INDEX idx_tenants_bot_token_hash ON tenants(bot_token_hash);
CREATE INDEX idx_tenants_country ON tenants(country);
CREATE INDEX idx_tenants_plan ON tenants(plan);
```

#### `users` — владельцы магазинов и админы

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  phone TEXT,
  email TEXT,
  full_name TEXT,
  default_language TEXT DEFAULT 'ru',
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tenant_admins` — связь tenant ↔ admin (для multi-admin)

```sql
CREATE TABLE tenant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'admin',           -- 'owner', 'admin', 'manager'
  permissions JSONB DEFAULT '{}',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, user_id)
);
```

### 7.2 Catalog tables

#### `product_categories` — категории товаров (созданные продавцом)

```sql
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- localized via JSONB if needed
  name_translations JSONB DEFAULT '{}',         -- {"ru": "Платья", "uz": "Ko'ylaklar"}
  emoji TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_tenant ON product_categories(tenant_id);
```

#### `products` — товары

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}',
  description TEXT,
  description_translations JSONB DEFAULT '{}',

  -- Pricing
  price DECIMAL(15, 2) NOT NULL,                -- в валюте tenant.currency
  compare_at_price DECIMAL(15, 2),              -- для отображения скидки
  cost_per_item DECIMAL(15, 2),                 -- для аналитики маржи

  -- Inventory
  stock INTEGER,                                -- NULL = unlimited
  sku TEXT,

  -- Media
  images JSONB DEFAULT '[]',                    -- [{url, alt, position}]
  video_url TEXT,                               -- R2 URL, в базовом тарифе!

  -- Variations (размеры, цвета)
  variants JSONB DEFAULT '[]',                  -- [{name, options, prices}]

  -- Attributes (характеристики)
  attributes JSONB DEFAULT '{}',                -- {color: "red", size: "M"}

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,            -- "ТОП" / Featured

  -- SEO/Search
  tags TEXT[] DEFAULT '{}',
  search_keywords TEXT,

  views_count INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(tenant_id, is_active);
CREATE INDEX idx_products_featured ON products(tenant_id, is_featured) WHERE is_featured = TRUE;
```

### 7.3 Order tables

#### `customers` — клиенты магазинов

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,

  -- Contact info (from checkout)
  full_name TEXT,
  phone TEXT,
  email TEXT,
  telegram_username TEXT,
  location TEXT,
  language TEXT,                                -- detected from Telegram

  -- Analytics
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(15, 2) DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,

  -- Segmentation tags (для mass mailing)
  segments TEXT[] DEFAULT '{}',                 -- ['vip', 'lapsed', 'new']

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, telegram_id)
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_segments ON customers USING GIN(segments);
```

#### `orders` — заказы

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number TEXT NOT NULL,                   -- "63IDO8BO38T2" — short ID

  -- Items (denormalized)
  items JSONB NOT NULL,                         -- [{product_id, name, price, quantity, variants}]

  -- Pricing
  subtotal DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(15, 2) DEFAULT 0,
  coupon_code TEXT,
  shipping_cost DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,

  -- Customer info (snapshot)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_location TEXT,
  customer_comment TEXT,

  -- Delivery
  delivery_method_id UUID REFERENCES delivery_methods(id),
  delivery_address TEXT,
  delivery_notes TEXT,

  -- Payment
  payment_method TEXT NOT NULL,                 -- 'manual_transfer', 'telegram_stars', 'click', etc.
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded', 'failed'
  payment_proof_url TEXT,                       -- скрин чека для manual transfer
  payment_data JSONB DEFAULT '{}',

  -- Status (5-stage funnel)
  status TEXT NOT NULL DEFAULT 'created',
  -- 'created'    — Заказ создан, в обработке
  -- 'confirmed'  — Заказ подтверждён, готовится
  -- 'shipping'   — Заказ в доставке, в пути
  -- 'delivered'  — Заказ доставлен
  -- 'completed'  — Заказ завершён, отзыв получен

  -- Status history
  status_history JSONB DEFAULT '[]',            -- [{status, timestamp, changed_by}]

  -- Review
  review_rating INTEGER,                        -- 1-5
  review_text TEXT,
  review_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_created ON orders(tenant_id, created_at DESC);
```

#### `delivery_methods` — методы доставки

```sql
CREATE TABLE delivery_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `coupons` — промокоды

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL,                           -- 'fixed', 'percentage'
  value DECIMAL(15, 2) NOT NULL,
  min_order_amount DECIMAL(15, 2),
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);
```

### 7.4 Marketing tables

#### `mass_mailings` — рассылки

```sql
CREATE TABLE mass_mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Content
  text TEXT NOT NULL,
  image_url TEXT,
  cta_button JSONB,                             -- {text, url}

  -- Segmentation (наша differentiation vs Sellz)
  segment_filter JSONB DEFAULT '{}',
  -- Example: {"min_orders": 1, "min_spent": 100000, "languages": ["uz"]}

  -- AI generation
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,

  -- Schedule
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',         -- 'draft', 'scheduled', 'sending', 'sent', 'failed'

  -- Stats
  recipients_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.5 Subscriptions and billing

#### `subscriptions` — подписки на платформу

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  plan TEXT NOT NULL,                           -- 'start', 'business', 'premium', 'enterprise'
  status TEXT NOT NULL,                         -- 'trial', 'active', 'past_due', 'canceled', 'expired'

  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  payment_method TEXT,                          -- 'click', 'payme', 'card', 'crypto'
  payment_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `subscription_invoices` — счета

```sql
CREATE TABLE subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,                         -- 'pending', 'paid', 'failed', 'refunded'

  payment_provider TEXT,
  payment_id TEXT,                              -- external payment id

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.6 Analytics tables

#### `analytics_events` — события для аналитики

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,                     -- 'product_view', 'add_to_cart', 'checkout_start', 'order_placed'
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Партиционирование по месяцам для performance:
CREATE INDEX idx_analytics_tenant_date ON analytics_events(tenant_id, created_at DESC);
CREATE INDEX idx_analytics_type ON analytics_events(tenant_id, event_type, created_at DESC);
```

### 7.7 AI imports tracking

#### `ai_imports` — история AI-импортов

```sql
CREATE TABLE ai_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                           -- 'photo_caption', 'voice', 'channel_post', 'csv'
  source_data JSONB NOT NULL,                   -- input
  result_data JSONB,                            -- output
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'failed'
  error TEXT,
  created_products_count INTEGER DEFAULT 0,
  ai_cost_usd DECIMAL(10, 4),                   -- для контроля costs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

---

## 8. Store Templates (15 сфер)

При onboarding продавец выбирает **категорию своего магазина**. Это **не product category**, а **business sphere** — определяет template (preset настроек).

### Список 15 сфер

```python
# config/store_templates.py
STORE_TEMPLATES = [
    {
        "id": "fashion",
        "name_translations": {"ru": "Мода и стиль", "uz": "Moda va uslub", "en": "Fashion & Style"},
        "emoji": "👗",
        "layout": "grid_2col",
        "theme_preset": "minimal_premium",
        "default_attributes": ["size", "color", "material"],
        "required_fields": ["size_chart"],
        "video_recommended": True,
    },
    {
        "id": "electronics",
        "name_translations": {"ru": "Электроника и техника", "uz": "Elektronika va texnika", "en": "Electronics"},
        "emoji": "📱",
        "layout": "grid_2col",
        "theme_preset": "tech_modern",
        "default_attributes": ["brand", "model", "specifications"],
        "required_fields": ["warranty", "specifications"],
    },
    {
        "id": "beauty",
        "name_translations": {"ru": "Красота и здоровье", "uz": "Go'zallik va sog'liq", "en": "Beauty & Health"},
        "emoji": "💄",
        "layout": "grid_2col",
        "theme_preset": "warm_elegant",
        "default_attributes": ["volume", "scent", "skin_type"],
        "video_recommended": True,
    },
    {
        "id": "home",
        "name_translations": {"ru": "Товары для дома и интерьера", "uz": "Uy va interyer mahsulotlari", "en": "Home & Interior"},
        "emoji": "🏠",
        "layout": "grid_2col",
        "theme_preset": "cozy_warm",
        "default_attributes": ["dimensions", "material", "color"],
    },
    {
        "id": "auto",
        "name_translations": {"ru": "Авто-товары", "uz": "Avtomobil mahsulotlari", "en": "Auto"},
        "emoji": "🚗",
        "layout": "list_with_specs",
        "theme_preset": "energetic_bold",
        "default_attributes": ["car_brand", "car_model", "year", "compatible"],
    },
    {
        "id": "kids",
        "name_translations": {"ru": "Детские товары", "uz": "Bolalar uchun mahsulotlar", "en": "Kids"},
        "emoji": "🧸",
        "layout": "grid_2col",
        "theme_preset": "playful_colorful",
        "default_attributes": ["age", "size", "gender"],
    },
    {
        "id": "hobby",
        "name_translations": {"ru": "Хобби и творчество", "uz": "Hobbi va ijodkorlik", "en": "Hobby & Crafts"},
        "emoji": "🎨",
        "layout": "grid_2col",
        "theme_preset": "creative_vibrant",
    },
    {
        "id": "sport",
        "name_translations": {"ru": "Спорт и отдых", "uz": "Sport va dam olish", "en": "Sport & Outdoor"},
        "emoji": "⚽",
        "layout": "grid_2col",
        "theme_preset": "energetic_bold",
        "default_attributes": ["size", "color"],
    },
    {
        "id": "food",
        "name_translations": {"ru": "Продукты питания", "uz": "Oziq-ovqat mahsulotlari", "en": "Food"},
        "emoji": "🍎",
        "layout": "horizontal_cards",
        "theme_preset": "fresh_warm",
        "default_attributes": ["weight", "expiry_date", "ingredients"],
    },
    {
        "id": "pets",
        "name_translations": {"ru": "Товары для животных", "uz": "Hayvonlar uchun mahsulotlar", "en": "Pets"},
        "emoji": "🐾",
        "layout": "grid_2col",
        "theme_preset": "playful_colorful",
        "default_attributes": ["pet_type", "age", "size"],
    },
    {
        "id": "books",
        "name_translations": {"ru": "Книги и образование", "uz": "Kitoblar va ta'lim", "en": "Books & Education"},
        "emoji": "📚",
        "layout": "list_with_text",
        "theme_preset": "minimal_serif",
        "default_attributes": ["author", "publisher", "year", "language"],
    },
    {
        "id": "construction",
        "name_translations": {"ru": "Стройматериалы", "uz": "Qurilish materiallari", "en": "Construction"},
        "emoji": "🔨",
        "layout": "list_with_specs",
        "theme_preset": "industrial",
        "default_attributes": ["dimensions", "weight", "material"],
    },
    {
        "id": "digital",
        "name_translations": {"ru": "Цифровые товары", "uz": "Raqamli mahsulotlar", "en": "Digital Goods"},
        "emoji": "💻",
        "layout": "grid_2col",
        "theme_preset": "tech_modern",
        "delivery_methods": ["instant_download"],
        "default_payment": ["card", "crypto"],
    },
    {
        "id": "services",
        "name_translations": {"ru": "Услуги", "uz": "Xizmatlar", "en": "Services"},
        "emoji": "🛠",
        "layout": "list_with_text",
        "theme_preset": "minimal_premium",
        "skip_inventory": True,
    },
    {
        "id": "other",
        "name_translations": {"ru": "Другое", "uz": "Boshqa", "en": "Other"},
        "emoji": "📦",
        "layout": "grid_2col",
        "theme_preset": "minimal_neutral",
    },
]
```

### Что определяет template

1. **`layout`** — раскладка витрины для покупателя:
   - `grid_2col` — сетка 2 колонки (стандарт, mobile-friendly)
   - `list_with_specs` — список с характеристиками (electronics, construction)
   - `list_with_text` — список с длинным текстом (books, services)
   - `horizontal_cards` — горизонтальные карточки (food)

2. **`theme_preset`** — цветовая палитра:
   - `minimal_premium` — серо-чёрный, аккуратный
   - `tech_modern` — синий + зелёный accent
   - `warm_elegant` — бежевые тёплые тона
   - `playful_colorful` — яркие цвета (kids, pets)
   - `energetic_bold` — красно-чёрный (sport, auto)
   - `cozy_warm` — тёплые бежевые (home)
   - `industrial` — серый + жёлтый (construction)
   - `fresh_warm` — оранжево-зелёный (food)
   - `minimal_serif` — белый с serif шрифтами (books)
   - `creative_vibrant` — фиолетово-розовый (hobby)
   - `minimal_neutral` — нейтральный по умолчанию

3. **`default_attributes`** — характеристики товара по умолчанию (продавец может изменить):
   - Fashion: size, color, material
   - Electronics: brand, model, specifications
   - Auto: car_brand, car_model, year, compatible

4. **`video_recommended`** — баннер «Добавьте видео — это увеличит продажи на 30%» при создании товара

5. **`delivery_methods`** — для digital: только instant_download

6. **`default_payment`** — приоритетные методы оплаты для категории

**Все эти настройки — defaults**. Продавец может изменить любое после onboarding.

---


## 9. Onboarding Wizard (5 шагов)

Mobile-first wizard в Telegram Mini App. Каждый шаг — отдельный экран, BackButton для возврата, MainButton для «Далее».

### Шаг 1 — Страна

**Зачем:** Определяет доступные платежные провайдеры, legal-фичи, валюту по умолчанию, язык интерфейса по умолчанию.

**UI:**
- Заголовок: «Где находится ваш бизнес?»
- Поиск по списку стран (по умолчанию определяем по Telegram language_code)
- Карточки: 🇺🇿 Узбекистан, 🇰🇿 Казахстан, 🇰🇬 Кыргызстан, 🇹🇯 Таджикистан, ...
- В v1: только UZ кликабельно. Другие — disabled с подписью «Скоро»

**После выбора:**
- Загружается `CountryConfig.load('UZ')`
- Устанавливаются defaults: currency=UZS, default_language='ru', timezone='Asia/Tashkent'

### Шаг 2 — Сфера магазина (Business Template)

**Зачем:** Определяет template (layout, theme, defaults), tailored onboarding hints, analytics segmentation.

**UI:**
- Заголовок: «Что вы продаёте?»
- Grid 2 колонки с emoji + название из 15 sphere
- Карточка выбранной сферы подсвечивается accent-цветом

**После выбора:**
- Применяется template (layout, theme_preset, default_attributes)
- В аналитике tenant.business_category = выбранному

### Шаг 3 — Юр.статус (для UZ — wizard самозанятого)

**Зачем (UZ-specific):** Определяет доступные платежи и legal-фичи.

**Условия показа:** только для UZ (через feature flag). Для других стран — пропускается или адаптируется.

**UI:**
- Заголовок: «Как вы оформлены юридически?»
- Опции (radio):
  - 🚀 «Физлицо — пока без оформления» (default)
  - 📋 «Самозанятый» (показать «Стать самозанятым за 15 минут?» с CTA на wizard)
  - 🏢 «ИП»
  - 🏛 «ООО / юр.лицо»

**Логика после выбора:**
- Физлицо → доступны: manual_card_transfer, telegram_stars, cash_on_delivery
- Самозанятый+ → доступны: + click, payme (через P2P merchant в v1)
- ИП/ООО → доступны: всё включая прямую интеграцию (в v1.5)

**Wizard «Стать самозанятым» (опциональный sub-flow):**
1. Что это даёт (4% налог, легально, +платежные методы)
2. Какие документы нужны (паспорт, ИНН)
3. Открыть Soliq.uz через WebView (без auto-fill — пользователь сам делает)
4. После регистрации — return в onboarding с обновлённым статусом

### Шаг 4 — Название магазина + валюта

**Зачем:** Brand identity + финансовая настройка.

**UI:**
- Поле «Название магазина» (валидация: 2–50 символов)
- Поле «Описание» (опционально, до 200 символов)
- Dropdown «Валюта» (по умолчанию из CountryConfig — UZS для UZ)
- Поле «Имя бота» — auto-generated `<shop_name>_bot`, можно изменить (валидация: уникальность + правила Telegram)

**После сохранения:**
- Создаётся tenant в БД
- Регистрируется бот через @BotFather (через user в auto-mode или manual instructions)
- Сохраняется bot_token (шифрованно)

### Шаг 5 — Привязка Telegram-канала (опционально)

**Зачем:** Включает фичи Channel Integration (Subscription Gate, WebApp URL для канала).

**UI:**
- Заголовок: «Есть Telegram-канал?»
- Опции:
  - «Да, добавить» — поле для `@channel_username` + инструкция добавить бота как админа
  - «Нет / пропустить» — переход к финальному экрану

**После привязки:**
- Backend проверяет, что бот добавлен админом
- Сохраняется `telegram_channel_username`
- Опционально показывается toggle «Требовать подписку на канал для доступа к магазину»

### Финальный экран

- ✅ «Ваш магазин готов!»
- Большой QR-код с ссылкой на бота
- Кнопки:
  - «Добавить первый товар» (CTA primary)
  - «Импортировать каталог через AI»
  - «Пригласить команду»
  - «Изучить настройки»

---

## 10. Channel Integration

Группа фич которые превращают Telegram-канал продавца в growth-инструмент.

### 10.1 Channel Subscription Gate

**Что это:** Покупатель не может открыть магазин (Mini App), пока не подпишется на Telegram-канал продавца.

**Как работает:**
1. Продавец в настройках включает toggle «Требовать подписку на канал»
2. Продавец указывает `@channel_username` и добавляет бот как админа канала
3. При открытии Mini App клиентом → backend вызывает `bot.get_chat_member(channel_id, user_id)`
4. Если `status` ∈ `('member', 'administrator', 'creator')` → доступ открыт
5. Если нет → показываем экран:
   - 🔒 Иконка lock
   - «Магазин недоступен»
   - «Подпишитесь на канал чтобы открыть магазин»
   - Кнопка «Подписаться» → открывает канал через `tg://resolve?domain=<channel>`
   - После подписки кнопка «Я подписался» → re-check → пускаем

**Backend implementation:**

```python
# api/dokonly_api/routes/storefront.py
@router.get("/storefront/access")
async def check_access(tenant_id: UUID, telegram_user_id: int):
    tenant = await get_tenant(tenant_id)

    if not tenant.channel_subscription_required:
        return {"access": "granted"}

    channel = tenant.telegram_channel_username
    bot = get_bot_for_tenant(tenant)

    try:
        member = await bot.get_chat_member(f"@{channel}", telegram_user_id)
        if member.status in ("member", "administrator", "creator"):
            return {"access": "granted"}
        else:
            return {"access": "denied", "reason": "not_subscribed", "channel": channel}
    except TelegramAPIError:
        return {"access": "denied", "reason": "channel_check_failed"}
```

### 10.2 WebApp URL для встраивания в канал

**Что это:** Короткий URL для встраивания в Telegram-канал продавца как кнопка «Открыть магазин».

**Формат:** `dokonly.app/<shop_id_short>` или Mini App link через `t.me/<bot_username>?startapp=<param>`

**UI в админке:**
- Раздел Settings → Channel Integration
- Поле readonly с URL
- Кнопка «Копировать»
- Инструкция: «Вставьте эту ссылку в пост вашего канала как кнопку → клиенты не покидают Telegram»

### 10.3 Welcome message в боте

**Что это:** Первое сообщение, которое получает покупатель при открытии бота магазина (от `/start`).

**Что входит:**
- Текст приветствия (default template, продавец может менять)
- Опционально картинка
- Inline-кнопка «Открыть магазин» → запускает Mini App

**Default template (на 3 языках):**

```python
WELCOME_DEFAULTS = {
    "ru": "Добро пожаловать в {shop_name}! Здесь вы можете посмотреть каталог и оформить заказ. Нажмите кнопку ниже, чтобы открыть магазин.",
    "uz": "{shop_name} ga xush kelibsiz! Bu yerda siz katalogni ko'rishingiz va buyurtma berishingiz mumkin. Magazin ochish uchun pastdagi tugmani bosing.",
    "en": "Welcome to {shop_name}! Here you can browse our catalog and place an order. Click the button below to open the store."
}
```

Язык выбирается по `tenant.default_language` (определён через CountryConfig в onboarding).

### 10.4 Order forwarding в Telegram-группу команды

**Что это:** Продавец указывает chat_id Telegram-группы команды → все новые заказы автоматически пересылаются туда с кнопками «Взять в работу», «Отказать».

**UI в админке:**
- Settings → Order Settings → Forward orders
- Поле «Chat ID группы команды» (с инструкцией как узнать chat_id)
- Toggle «Включить пересылку»

**Backend:**

```python
# api/dokonly_api/services/orders.py
async def on_order_created(order: Order):
    tenant = await get_tenant(order.tenant_id)

    # Send to customer
    await send_order_confirmation(order)

    # Forward to team group if configured
    if tenant.settings.get("order_forwarding_chat_id"):
        await forward_order_to_team(
            chat_id=tenant.settings["order_forwarding_chat_id"],
            order=order
        )
```

---

## 11. Order Management Patterns

**Два разных UX-паттерна для разных платформ.** Не унификация — каждая платформа использует свой нативный паттерн.

### 11.1 Mobile (Telegram Mini App) — Tab-based + Swipe Actions

**Структура:**

```
┌─────────────────────────────────┐
│  Tabs: Новые(3) Готовятся(5)... │  ← sticky top
├─────────────────────────────────┤
│  [Search + Filters]              │
├─────────────────────────────────┤
│  🛍 Заказ #63IDO8BO38T2          │
│  Иван Петров • 250 000 сум       │
│  2 мин назад              [→]    │  ← swipe right = next status
│                                  │
│  🛍 Заказ #82ABC1XYZ             │
│  Малика А. • 180 000 сум         │
│  15 мин назад             [→]    │
├─────────────────────────────────┤
│         [MainButton]             │  ← context action
└─────────────────────────────────┘
```

**Tabs:**
- Новые (status=created) с бейджем количества
- Готовятся (status=confirmed)
- Доставка (status=shipping)
- Завершено (status ∈ delivered + completed) — свёрнуто по умолчанию

**Swipe actions:**
- Swipe right на заказе → диалог «Подтвердить переход в следующий статус?» → запись в status_history
- Swipe left → быстрые действия: связаться с клиентом, повторить, отменить
- Long-press → меню действий

**Не использовать на мобиле:**
- Канбан с несколькими колонками (не поместится)
- Drag-and-drop (плохо на тач)
- Bulk-операции с чекбоксами (мало места)

### 11.2 Web Dashboard — Канбан с drag-and-drop

**Структура:**

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│  Новые   │ Готовятся│ Доставка │ Доставлено│Завершено│
│   (3)    │   (5)    │   (2)    │   (12)   │   (45)  │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Card     │ Card     │ Card     │ Card     │ Card     │
│ #63ID... │ #82AB... │ #91XY... │ #11ZQ... │ #00AA... │
│          │          │          │          │          │
│ Card     │ Card     │          │ Card     │ Card     │
│          │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Web-only фичи:**
- Drag-and-drop между колонками = смена статуса
- Bulk-операции: выбрать несколько заказов → массово изменить статус, экспортировать
- Расширенные фильтры (по дате, сумме, клиенту, продукту)
- Экспорт в Excel/CSV
- Side panel с детальной информацией заказа без открытия отдельной страницы

### 11.3 Воронка статусов (общая для mobile + web)

5 статусов, линейная воронка. Финальный шаг — **«Завершён (отзыв получен)»**, не «Доставлен». Это лучше для retention аналитики и автоматического сбора отзывов.

```
Создан → Подтверждён → В доставке → Доставлен → Завершён
created → confirmed   → shipping   → delivered → completed
```

**Переходы:**
- Создан → Подтверждён: продавец подтвердил оплату и принял в работу
- Подтверждён → В доставке: продавец отдал курьеру или клиенту в самовывоз
- В доставке → Доставлен: курьер подтвердил доставку (manual или auto через GPS — v2)
- Доставлен → Завершён: автоматически через 7 дней OR клиент оставил отзыв

**Backward transitions:**
- Любой → Отменён (с указанием причины)
- Любой → Возврат (с указанием суммы возврата)

---

## 12. Categories — две сущности

**Важно:** различать **категорию магазина** (business_category) и **категории товаров** (product_categories).

### 12.1 Business Category (категория магазина)

- Выбирается **один раз в onboarding** из 15 sphere
- Определяет template (layout, theme, defaults)
- Может быть изменена позже в Settings (с предупреждением что theme и attributes могут поменяться)
- Используется для:
  - Аналитики по сегментам (для нас как платформы)
  - Discovery в будущем (Telegram App Store, marketplace)
  - Tailored onboarding hints

### 12.2 Product Categories (категории товаров)

- Создаются продавцом сами
- Лимиты по тарифам:
  - **Старт** ($16): до 10 категорий
  - **Бизнес** ($40): до 50 категорий
  - **Премиум** ($80): безлимит
- Плоский список в v1 (не иерархия). Подкатегории в v2.
- Поддерживают локализацию (name_translations JSONB)
- Можно reorder через drag-and-drop (web) или up/down arrows (mobile)

**UI создания на мобиле:**
- Простая модалка с полем «Название» + optional emoji
- BottomSheet снизу
- MainButton «Создать»

### 12.3 Подкатегории — в v2

В v1 не делаем иерархию. Аргумент: добавляет сложности UI на мобиле, большинство магазинов имеют <20 категорий, плоский список достаточен.

В v2 добавим:
- 1 уровень вложенности (Парфюмерия → Женская / Мужская)
- Breadcrumb навигация
- Хлебные крошки в Mini App
- Поиск по всем уровням

---

## 13. Store Settings (новые поля)

Помимо стандартных настроек (название, описание, обложка), добавляются:

### 13.1 Welcome message

См. раздел 10.3 — настраиваемое приветственное сообщение бота с template.

### 13.2 Required customer data

Toggle для каждого поля что требовать на чекауте:

- ☐ Имя
- ☑ Контактный номер (по умолчанию включено)
- ☐ Email
- ☐ Telegram @username
- ☐ Местоположение
- ☐ Комментарий

Минимум одно поле обязательно (валидация на frontend и backend).

### 13.3 Минимальная сумма заказа

- Поле "Минимальная сумма заказа" (в валюте магазина)
- На чекауте: если cart_total < min_amount → блокируется submit с сообщением «Минимальный заказ N сум»
- Помогает повысить AOV (средний чек)

### 13.4 Order forwarding в Telegram-группу

См. раздел 10.4 — пересылка новых заказов в группу команды.

### 13.5 Order confirmation message

Кастомизируемое сообщение, которое отправляется клиенту после оформления заказа.

**Default templates:**

```python
ORDER_CONFIRMATION_DEFAULTS = {
    "ru": "Спасибо за заказ! Ваш заказ принят, мы свяжемся с вами в ближайшее время. Ценим ваше доверие!",
    "uz": "Buyurtmangiz uchun rahmat! Buyurtmangiz qabul qilindi, tez orada siz bilan bog'lanamiz. Ishonchingiz uchun minnatdormiz!",
    "en": "Thank you for your order! Your order has been accepted, we will contact you shortly. We appreciate your trust!"
}
```

### 13.6 Branding (премиум фича)

В Старт-тарифе у магазина внизу витрины подпись «Powered by Dokonly». В Бизнес+ можно убрать.

В Премиум: возможность загрузить favicon и кастомные цвета (override theme_preset).

---


## 14. AI-фичи (дифференциация vs Sellz)

У Sellz **нет AI-фич вообще**. Это наша главная differentiation. Все AI-фичи строятся через `AIRouter` для провайдер-агностичности.

### 14.1 AI-импорт каталога

**Use case:** Продавец не хочет вручную добавлять 100 товаров. У него есть фотки на телефоне с подписями, или папка с фото, или старый Telegram-канал.

#### Метод 1: Фото с подписями

- Продавец загружает 10–50 фото через Mini App
- Для каждого фото: AI извлекает название, цену, описание, characteristics из подписи (или генерирует если подпись пустая)
- AI определяет категорию автоматически
- Продавец проверяет на экране ревью и подтверждает

**Промпт:**

```python
PRODUCT_EXTRACTION_PROMPT = """
You are extracting product information from a photo with caption for an e-commerce store.

Store category: {business_category}
Store language: {language}

Photo caption: "{caption}"

Extract structured data:
- name: short product name (2-5 words)
- description: longer description (1-3 sentences)
- price: numeric value in {currency} (extract from caption if mentioned)
- attributes: relevant attributes for category (size, color, material, etc.)
- suggested_category: from existing categories or "new"

Return as JSON.
"""
```

**Backend flow:**
1. Upload фото на R2
2. Отправить URL + caption в OpenRouter с моделью Claude Haiku (быстро + дёшево)
3. Получить structured output, валидировать через Pydantic
4. Сохранить в `ai_imports` table со status='completed'
5. После подтверждения продавца — создать products

#### Метод 2: Голосовой импорт

- Продавец нажимает «Голосом» → диктует список товаров
- Запись → Groq Whisper (быстро + дёшево, $0.04/час)
- Транскрипт → AI парсит на отдельные товары
- Экран ревью → подтверждение

**Пример голоса:**
> «Платье красное размер M 350 тысяч сум, есть в количестве 5 штук. Платье синее размер L 320 тысяч сум»

→ AI выдаёт 2 товара с правильными атрибутами.

#### Метод 3: Telegram-канал

- Продавец указывает свой Telegram-канал
- Бот читает последние 100 постов (через user-bot с ограничениями)
- Каждый пост → AI извлекает товар (если это товарный пост, а не объявление)
- Экран ревью

**Лимит:** не более 100 постов за один импорт, чтобы не превышать AI costs.

#### Метод 4: CSV/Excel

- Простой импорт через файл
- Маппинг колонок (имя/цена/описание/категория)
- Без AI, чисто механический

### 14.2 AI-консультант для покупателей

**Use case:** Покупатель в Mini App задаёт вопросы про товар на родном языке.

- Доступен в Премиум-тарифе
- Использует Anthropic SDK напрямую с prompt caching (для скорости и cost-efficiency)
- Знает каталог магазина (через embedding или просто feed в prompt context при <500 товарах)
- Отвечает на узбекском, русском, английском (детект языка автоматический)

**Пример диалога:**

> Покупатель: «Bu ko'ylak kichkina bolaga bo'ladi 4 yoshli?» (Это платье подойдёт ребёнку 4 года?)
>
> AI: «Bu ko'ylak XS-M razmerlarda mavjud. 4 yoshli bolaga XS razmer to'g'ri kelishi mumkin, lekin aniq o'lchov tablitsasini ko'rib chiqing.» (Это платье есть в размерах XS-M. Для 4-летнего ребёнка может подойти XS, но проверьте таблицу размеров.)

**Архитектура:**

```python
# ai/tasks/consultant.py
@anthropic_with_cache
async def consultant_response(tenant_id: UUID, customer_message: str, conversation_history: list):
    catalog_context = await build_cached_catalog_context(tenant_id)  # cached prompt

    response = await anthropic.messages.create(
        model="claude-sonnet-4",
        system=[
            {"type": "text", "text": "You are a helpful sales consultant for {store_name}..."},
            {"type": "text", "text": catalog_context, "cache_control": {"type": "ephemeral"}},
        ],
        messages=conversation_history + [{"role": "user", "content": customer_message}],
    )
    return response
```

### 14.3 AI для mass mailing

**Use case:** Продавец не знает что писать в рассылке. Просит AI помочь.

- В разделе «Создать рассылку» кнопка «Сгенерировать с AI»
- Продавец указывает: тема (распродажа / новинка / поздравление), сегмент клиентов, тональность
- AI генерирует текст на 3 языках одновременно (или на языке выбранного сегмента)
- Продавец редактирует и отправляет

### 14.4 AI для переводов

- При создании товара продавец вводит название на одном языке
- AI автоматически переводит на остальные supported_languages магазина
- Хранится в `name_translations` JSONB
- При показе товара клиенту — выбирается перевод по его языку Telegram

---

## 15. Платёжная архитектура

### 15.1 Провайдеры в v1

| Провайдер | Тип | UZ | KZ | KG | RU |
|---|---|---|---|---|---|
| ManualTransferProvider | Manual P2P | ✅ | ✅ | ✅ | ✅ |
| TelegramStarsProvider | Telegram Stars | ✅ | ✅ | ✅ | ✅ |
| CashOnDeliveryProvider | Наличные | ✅ | ✅ | ✅ | ✅ |
| ClickProvider (v1) | P2P merchant | ✅ | ❌ | ❌ | ❌ |
| PaymeProvider (v1) | P2P merchant | ✅ | ❌ | ❌ | ❌ |
| ClickProvider (v1.5) | Direct API | ✅ | ❌ | ❌ | ❌ |
| PaymeProvider (v1.5) | Direct API | ✅ | ❌ | ❌ | ❌ |

### 15.2 Manual Card Transfer — главная фича для физлиц UZ

**Зачем:** Большинство UZ-продавцов работают как физлица без юр.лица. Прямая интеграция Click/Payme требует юр.договоров. Manual transfer работает легально (P2P переводы разрешены, Dokonly = информационный посредник).

**Flow продавца (настройка):**
1. Settings → Payments → Manual Card Transfer
2. Указывает реквизиты:
   - Номер карты (или несколько)
   - Имя получателя на карте
   - Банк (Hamkorbank, Asia Alliance Bank, etc.)
3. Опционально: instructions для клиента («Переведите и пришлите скрин чека»)

**Flow покупателя (на чекауте):**
1. Выбирает «Перевод на карту» как метод оплаты
2. Видит реквизиты + instructions
3. Делает перевод вне Telegram через свой банк-клиент
4. Прикрепляет скрин чека в Mini App
5. Submit заказа

**Flow продавца (подтверждение):**
1. Получает уведомление о новом заказе
2. Видит скрин чека
3. Проверяет приход на свой банк-аккаунт (manual)
4. Подтверждает заказ (status: created → confirmed)

**Backend:**

```python
# payment/providers/manual_transfer.py
class ManualTransferProvider(PaymentProvider):
    async def create_payment(self, amount, currency, metadata):
        # Просто создаёт payment record со статусом 'pending'
        # без реальной финансовой транзакции
        return PaymentResult(
            payment_id=uuid4(),
            status="pending",
            instructions=await self._get_seller_instructions(metadata["tenant_id"]),
        )

    async def verify_payment(self, payment_id):
        # Manual verification — продавец сам подтверждает в админке
        # Просто возвращает текущий статус из БД
        return await self._get_status_from_db(payment_id)
```

### 15.3 Telegram Stars

**Зачем:** Покупатели с зарубежными картами могут купить Stars через Apple/Google Pay и заплатить.

**Особенности:**
- Telegram забирает комиссию ~30%
- Для UZ-покупателей сложно (нужна международная карта)
- Хороший fallback для туристов, экспатов

**Реализация:**
- Используем Telegram Bot API `sendInvoice` с `provider_token=""` (для Stars)
- Webhook `pre_checkout_query` для подтверждения
- Webhook `successful_payment` для финализации

### 15.4 Click / Payme — стратегия v1 и v1.5

**v1 (через P2P merchant):**
- Dokonly как платформа имеет аккаунты Click Merchant и Payme Merchant
- Продавец указывает свои реквизиты для вывода
- Платёж клиента идёт на Dokonly, потом мы переводим продавцу за вычетом комиссии
- **Минус:** нужен юр.договор Dokonly с банками, KYC процедура, лицензия

**v1.5 (прямая интеграция):**
- Продавец сам регистрируется в Click/Payme как merchant
- Получает свой merchant_id и secret_key
- Dokonly использует его credentials для API-вызовов
- **Плюс:** деньги идут сразу продавцу, никакого посредника

**В v1 запускаемся с v1-подходом**, как только получим юр.лицо в IT Park (3–4 недели) — переходим на v1.5.

---

## 16. Mass Mailing с сегментацией (vs Sellz simple broadcast)

У Sellz простой broadcast — отправка всем клиентам. Наша differentiation — **сегментация + AI**.

### 16.1 Сегменты клиентов

Автоматические (вычисляются на лету):
- **VIP** — total_spent > 1 000 000 сум
- **Active** — заказы в последние 30 дней
- **Lapsed** — нет заказов более 60 дней
- **New** — первый заказ <14 дней назад
- **No orders** — есть в customers, но нет заказов

Manual теги — продавец может добавлять свои (например, «оптовики», «постоянные»).

Фильтры на лету:
- По языку (uz, ru, en)
- По стране (UZ, KZ, RU)
- По локации (если указана)
- По типу товаров в истории (купил из категории «Платья»)
- По AOV (выше/ниже)

### 16.2 AI-генерация контента

См. раздел 14.3 — генерация текста рассылки через AI.

### 16.3 Расписание и stats

- Можно запланировать на конкретное время
- После отправки видим: delivered_count, clicked_count (по UTM в кнопках)
- А/B testing — в v2

### 16.4 Лимиты по тарифам

| Тариф | Рассылок в месяц | Получателей за раз | AI-генерация |
|---|---|---|---|
| Старт | 5 | 200 | ❌ |
| Бизнес | 30 | 2000 | ✅ |
| Премиум | ∞ | ∞ | ✅ |

---

## 17. Расширенная аналитика (vs Sellz базовая)

У Sellz базовая аналитика (страны, языки, просмотры). Наша differentiation — **воронка, retention, AOV, revenue trends**.

### 17.1 Dashboard главной аналитики

**Главные метрики (last 30 days):**
- Revenue (с % vs previous period)
- Orders count (с %)
- AOV (средний чек, с %)
- Conversion rate (visitors → orders)

**Графики:**
- Revenue по дням (sparkline)
- Top 5 продаваемых товаров
- Orders by status (donut chart)
- Customers by country + language (как у Sellz)

### 17.2 Воронка продаж

Этапы воронки:
1. Опен Mini App
2. Просмотр товара (хотя бы 1)
3. Добавление в корзину
4. Начало чекаута
5. Завершение заказа

Для каждого этапа: количество + % drop-off от предыдущего.

### 17.3 Retention cohort analysis

- Разбивка клиентов по cohort'ам (по дате первого заказа)
- % клиентов которые сделали 2-й, 3-й, 4-й заказ
- Repeat purchase rate

### 17.4 Product analytics

Для каждого товара:
- Views, add-to-cart, orders
- Conversion rate (views → orders)
- Revenue, AOV
- Топ товаров по разным метрикам

### 17.5 Customer analytics

Для каждого клиента:
- Lifetime value (LTV)
- Total orders, AOV
- Recency (дни с последнего заказа)
- Segment (VIP / Active / Lapsed)

### 17.6 Export

В Бизнес+: экспорт всех данных в Excel/CSV (orders, products, customers).

---

## 18. План реализации (этапы)

Этапы для Claude Code. Каждый этап завершается работающей фичей с тестами. Между этапами — проверка acceptance criteria.

### Этап 0: Базовый setup (1 неделя)

- [ ] Создать monorepo с Turborepo
- [ ] Setup `apps/api` (FastAPI + uv + ruff + mypy)
- [ ] Setup `apps/miniapp` (Vite + React + TS + Tailwind)
- [ ] Setup `apps/dashboard` (Vite + React + TS + Tailwind)
- [ ] Setup `packages/ui` (shared design system)
- [ ] Setup `packages/shared` (types, validators)
- [ ] Docker Compose для локальной dev
- [ ] Подключить Supabase Pro
- [ ] Подключить Cloudflare R2
- [ ] CI/CD через GitHub Actions
- [ ] Базовый Sentry + PostHog

**Acceptance:** `docker compose up` запускает всё локально. `pnpm dev` запускает оба фронта. `pnpm build` собирает оба фронта без ошибок.

### Этап 1: Architecture foundations (1 неделя)

- [ ] i18n setup в обоих фронтах (i18next + 3 locales)
- [ ] i18n setup в backend (Babel)
- [ ] CountryConfig система (config/countries/*.yml + loader)
- [ ] Feature flags per-country
- [ ] Legal compliance modules (base + uz.py)
- [ ] PaymentProvider ABC + базовая структура
- [ ] AIRouter ABC + базовая структура
- [ ] Multi-tenant middleware (bot_token_hash routing)

**Acceptance:** Можно создать новую страну через 1 yml файл. Все hardcoded строки в коде проходят `grep` test.

### Этап 2: Auth + Tenants (1 неделя)

- [ ] Telegram auth (через initData validation)
- [ ] Users table + endpoints
- [ ] Tenants table + endpoints
- [ ] RLS policies в Supabase
- [ ] Onboarding wizard (5 шагов) в Mini App
- [ ] Bot registration через @BotFather (manual instructions в v1, auto в v1.5)
- [ ] Сохранение bot_token (шифрованно)

**Acceptance:** Можно зарегистрироваться через Telegram, пройти onboarding, создать tenant с правильными country/currency/business_category, получить рабочий бот.

### Этап 3: Bot infrastructure (1 неделя)

- [ ] Multi-bot webhook routing
- [ ] Базовые handlers (/start, /help)
- [ ] Welcome message с template
- [ ] Открытие Mini App из бота
- [ ] Channel Subscription Gate
- [ ] Bot админ middleware

**Acceptance:** Каждый tenant получает свой бот. /start показывает welcome message. Mini App открывается. Channel Subscription Gate работает.

### Этап 4: Catalog v1 (2 недели)

- [ ] Product Categories CRUD (с лимитами по тарифам)
- [ ] Products CRUD (без AI)
- [ ] Image upload на R2 (с resize/optimization)
- [ ] Video upload на R2 (с компрессией)
- [ ] Store Templates система (15 sphere)
- [ ] Tailored attributes по template
- [ ] Featured products (Избранное)
- [ ] Mini App витрина для покупателя (catalog, product page, search)

**Acceptance:** Продавец создаёт категории и товары (mobile + web). Покупатель видит каталог в Mini App. Layout и attributes соответствуют выбранному template.

### Этап 5: Cart + Checkout (1 неделя)

- [ ] Cart system (с persistence в localStorage + sync с backend)
- [ ] Checkout flow в Mini App
- [ ] Required customer data settings (с валидацией)
- [ ] Minimum order amount
- [ ] Delivery methods CRUD
- [ ] Coupons CRUD

**Acceptance:** Покупатель добавляет товары в корзину, оформляет заказ. Валидация работает. Купоны применяются.

### Этап 6: Payments v1 (1.5 недели)

- [ ] ManualTransferProvider implementation
- [ ] TelegramStarsProvider implementation
- [ ] CashOnDeliveryProvider implementation
- [ ] UI для настройки payment methods
- [ ] UI для покупателя на чекауте
- [ ] Скрин чека upload для manual transfer

**Acceptance:** Работают 3 метода оплаты. Продавец видит заказы с информацией об оплате. Manual transfer flow полный.

### Этап 7: Order Management (1.5 недели)

- [ ] Orders CRUD
- [ ] 5-stage status funnel
- [ ] Mobile: Tab-based view со swipe actions
- [ ] Web: Канбан с drag-and-drop
- [ ] Order forwarding в Telegram-группу команды
- [ ] Order confirmation messages
- [ ] Status notifications для клиента

**Acceptance:** Полный flow от создания до завершения работает на mobile + web. Уведомления приходят. Forwarding работает.

### Этап 8: Click/Payme integration v1 (1 неделя)

- [ ] ClickProvider (через P2P merchant)
- [ ] PaymeProvider (через P2P merchant)
- [ ] Webhook handlers
- [ ] UI для продавца

**Acceptance:** Можно оплатить заказ через Click и Payme в тестовом режиме.

### Этап 9: AI v1 — фото импорт (1.5 недели)

- [ ] AIRouter implementation (OpenRouter + Anthropic + Groq)
- [ ] Photo + caption AI extraction
- [ ] Review screen в админке
- [ ] Bulk apply
- [ ] Cost tracking

**Acceptance:** Продавец загружает 10 фото с подписями → получает 10 готовых товаров после review за <30 секунд.

### Этап 10: AI v2 — голос + канал (1 неделя)

- [ ] Voice import (через Groq Whisper)
- [ ] Telegram channel import
- [ ] CSV/Excel import

**Acceptance:** Все 4 метода импорта работают.

### Этап 11: AI consultant (1 неделя)

- [ ] Anthropic SDK с prompt caching
- [ ] Catalog context builder
- [ ] Multi-language detection
- [ ] UI в Mini App для покупателей

**Acceptance:** Покупатель может задать вопрос на узбекском и получить релевантный ответ про каталог за <5 секунд.

### Этап 12: Analytics (1.5 недели)

- [ ] Event tracking
- [ ] Dashboard главной аналитики
- [ ] Sales funnel
- [ ] Retention cohorts
- [ ] Product analytics
- [ ] Customer analytics
- [ ] Export в Excel

**Acceptance:** Все метрики считаются правильно. Dashboard работает на mobile + web.

### Этап 13: Mass Mailing с сегментацией (1 неделя)

- [ ] Segmentation engine
- [ ] Mailing composer (с AI-generation)
- [ ] Scheduling
- [ ] Send via ARQ workers
- [ ] Click tracking

**Acceptance:** Можно отправить рассылку только VIP-клиентам, с AI-генерированным текстом на узбекском, по расписанию.

### Этап 14: Subscriptions + Billing (1 неделя)

- [ ] Subscription system
- [ ] Trial logic (14 дней без карты)
- [ ] Plan limits enforcement
- [ ] Renewal flow
- [ ] Invoice generation

**Acceptance:** Trial автоматически становится платным после 14 дней. Лимиты тарифов работают.

### Этап 15: Coupons + Promotions (0.5 недели)

- [ ] Coupons UI
- [ ] Coupon application at checkout
- [ ] Validation rules

**Acceptance:** Купоны работают (fixed + percentage), валидация min_amount работает.

### Этап 16: Team Management (0.5 недели)

- [ ] Tenant admins CRUD
- [ ] Invite via Telegram
- [ ] Permissions per role

**Acceptance:** Владелец приглашает менеджера через @username, тот получает доступ с ограниченными правами.

### Этап 17: Web Dashboard polish (1 неделя)

- [ ] Side panel layouts
- [ ] Bulk operations
- [ ] Keyboard shortcuts
- [ ] Advanced filters
- [ ] Export improvements

**Acceptance:** Web-версия удобна для power-users, имеет фичи которых нет на mobile.

### Этап 18: Polish + Launch prep (1 неделя)

- [ ] Performance optimization
- [ ] Error handling polish
- [ ] Empty states
- [ ] Skeleton loaders
- [ ] Toasts/notifications
- [ ] Onboarding tour
- [ ] Help center / FAQ
- [ ] Customer Discovery с 3-5 продавцами
- [ ] Final QA

**Acceptance:** Готовы к запуску. Чек-лист пройден (см. раздел 22).

**Итого:** ~18 недель (4–5 месяцев) с 1 разработчиком. С Claude Code и agentic подходом — может быть быстрее.

---


## 19. .env.example

```bash
# === Application ===
APP_NAME=dokonly
APP_ENV=development                              # development | staging | production
APP_DEBUG=true
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
MINIAPP_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3002

# === Security ===
SECRET_KEY=changeme_to_random_64_chars
ENCRYPTION_KEY=changeme_to_random_32_chars       # для шифрования bot_token

# === Database (Supabase) ===
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dokonly
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# === Redis ===
REDIS_URL=redis://localhost:6379/0

# === Storage (Cloudflare R2) ===
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=dokonly-media
R2_PUBLIC_URL=https://media.dokonly.com

# === AI ===
OPENROUTER_API_KEY=sk-or-...
ANTHROPIC_API_KEY=sk-ant-...                     # для prompt caching
GROQ_API_KEY=gsk_...                             # для Whisper

# Cost limits
AI_BUDGET_PER_TENANT_USD=10.00                   # max per tenant per month
AI_BUDGET_TOTAL_USD=1000.00                      # global cap

# === Telegram ===
TELEGRAM_BOT_API_URL=https://api.telegram.org
TELEGRAM_WEBHOOK_SECRET=changeme_random_string

# === Payments ===
# Click (v1.5)
CLICK_MERCHANT_ID=
CLICK_SECRET_KEY=
CLICK_SERVICE_ID=

# Payme (v1.5)
PAYME_MERCHANT_ID=
PAYME_SECRET_KEY=

# === Monitoring ===
SENTRY_DSN=
POSTHOG_API_KEY=
POSTHOG_HOST=https://app.posthog.com

# === Email (для email-рассылок, в v2) ===
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@dokonly.com

# === Feature flags ===
FEATURE_AI_IMPORT=true
FEATURE_AI_CONSULTANT=true
FEATURE_CHANNEL_GATE=true
FEATURE_DIRECT_CLICK=false                       # true когда v1.5
FEATURE_DIRECT_PAYME=false                       # true когда v1.5

# === Trial / Subscription ===
TRIAL_DAYS=14
TRIAL_PRODUCTS_LIMIT=20
GRACE_PERIOD_DAYS=3                              # после истечения подписки

# === Rate limits ===
API_RATE_LIMIT_PER_MINUTE=60
AI_RATE_LIMIT_PER_TENANT_PER_HOUR=20
MAILING_MAX_PER_DAY=10
```

---

## 20. Полезные команды для Claude Code

### Backend (apps/api)

```bash
# Install deps
uv sync

# Run dev server
uv run uvicorn dokonly_api.main:app --reload --port 8000

# Run migrations
uv run alembic upgrade head

# Create new migration
uv run alembic revision --autogenerate -m "description"

# Run tests
uv run pytest

# Lint + format
uv run ruff check --fix
uv run ruff format
uv run mypy .

# Start ARQ worker
uv run arq dokonly_api.workers.WorkerSettings
```

### Frontend (apps/miniapp, apps/dashboard)

```bash
# Install (в корне monorepo)
pnpm install

# Dev (одно приложение)
pnpm --filter miniapp dev
pnpm --filter dashboard dev

# Dev (всё параллельно через turborepo)
pnpm dev

# Build (production)
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Database

```bash
# Подключиться к Supabase локально
psql $DATABASE_URL

# Создать backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup.sql

# Сбросить локальную БД и пересоздать
docker compose down -v && docker compose up -d
uv run alembic upgrade head
```

### Telegram

```bash
# Зарегистрировать webhook для бота
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.dokonly.com/webhook/<bot_token_hash>"}'

# Удалить webhook (для локальной dev через ngrok)
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

---

## 21. Что НЕ делать в v1 (важно!)

Список фич которые **точно НЕ делаем** в v1, чтобы не размывать scope:

1. **Фискализация и налоговый учёт** — отдельная категория, см. раздел 0
2. **Сайты для магазинов на собственных доменах** — в v2/v3
3. **Иерархия категорий товаров** (подкатегории) — в v2
4. **A/B testing для рассылок** — в v2
5. **Прямая интеграция Click/Payme** (свой merchant) — в v1.5 после IT Park регистрации
6. **Рассрочка Alif/Uzum Nasiya** — требует партнёрских договоров
7. **Sync с Uzum/Wildberries** — отдельный большой проект
8. **SMS-рассылки** — требует Eskiz/Playmobile
9. **Email-рассылки коммерческие** — требует GDPR-compliance модуля
10. **Публичный API** для клиентов
11. **Webhook для клиентов** (Zapier-like)
12. **SLA с финансовой компенсацией**
13. **Mobile native apps** (iOS/Android) — пока только Telegram Mini App + Web
14. **Платежи в крипте (TON)** — фича Sellz Max, отложено в v2
15. **Marketplace** — discovery магазинов на платформе. Возможно в v2-v3.
16. **Customer accounts** — клиенты пока не имеют своих аккаунтов на платформе, только через Telegram identity
17. **Loyalty programs** (баллы, кэшбек) — в v2
18. **Reviews/ratings от клиентов** — в v1 минимально (только review_rating + review_text в order), без публикации
19. **Live chat** между продавцом и клиентом — пока через Telegram прямые сообщения
20. **Advanced inventory management** (multi-location, batches, expiry) — в v2

---

## 22. Чек-лист готовности к запуску v1

### Технический

- [ ] Все 18 этапов реализации завершены
- [ ] Test coverage >70% для backend critical paths
- [ ] E2E test для основных flows (signup → catalog → checkout → order)
- [ ] Performance: API p95 latency <500ms
- [ ] Mobile: Lighthouse score >90 для Mini App
- [ ] Error rate <1% в production
- [ ] Sentry alerts настроены
- [ ] Backup стратегия настроена (daily Supabase backups)
- [ ] Monitoring dashboards (uptime, latency, errors)

### Платежи и legal

- [ ] Юр.лицо в IT Park зарегистрировано
- [ ] Click merchant account настроен (для v1.5)
- [ ] Payme merchant account настроен (для v1.5)
- [ ] Юр.консультация пройдена, terms & conditions опубликованы
- [ ] Privacy Policy опубликован
- [ ] Оплата подписки Dokonly работает (Click/Payme/card)

### Маркетинг и launch

- [ ] Домены куплены (dokonly.uz, dokonly.com, dokonly.app)
- [ ] Лендинг на dokonly.uz live
- [ ] Сравнительная страница «Dokonly vs Sellz» опубликована
- [ ] Соцсети: @dokonly в Telegram, Instagram, YouTube — созданы
- [ ] Видео-демо (1-2 минуты) записано
- [ ] Customer Discovery с 5+ продавцами пройдено
- [ ] 10 beta-клиентов готовы к запуску

### Brand

- [ ] Логотип Dokonly финализирован (дизайнер)
- [ ] Brand guidelines документ создан
- [ ] Favicon, social previews, OG images

### Поддержка

- [ ] @dokonly_support бот настроен
- [ ] FAQ в Mini App
- [ ] Help center на dokonly.uz/help
- [ ] Telegram-канал @dokonly_news для апдейтов

---

## 23. Стратегия итераций после запуска

### Месяц 1 (Launch month)

- Фокус: первые 50 платящих клиентов
- Customer Discovery — каждую неделю интервью с 3-5 клиентами
- Реакция на feedback в течение 48 часов
- Bug fixes — приоритет 1

### Месяц 2-3

- Прямая интеграция Click/Payme (v1.5)
- A/B testing onboarding wizard
- Расширение AI-импорта (новые источники)
- Первые рассылки product updates

### Месяц 4-6

- Подготовка к Phase 2 (Kazakhstan)
- KaspiProvider implementation
- KK языковая локализация
- Изучение KZ-рынка через partnerships

### Месяц 6-12

- Запуск в Kazakhstan
- Запуск в Кыргызстан
- Marketplace prototype (discovery магазинов на платформе)
- Mobile native apps research (Capacitor / React Native)

---

## 24. Инфраструктура и расходы

### Месячные расходы на старте (первые 3 месяца)

| Сервис | $/мес |
|---|---|
| Supabase Pro | $25 |
| Cloudflare R2 (Storage) | $5–15 (зависит от volume фото/видео) |
| Cloudflare Pages | $0 |
| Render (Backend) | $7–20 (Starter plan) |
| Sentry | $0 (free tier) |
| PostHog | $0 (free до 1M events) |
| OpenRouter | $20–100 (зависит от объёма AI) |
| Anthropic | $20–50 (AI consultant) |
| Groq | $5–20 (Whisper) |
| Domains (dokonly.uz, .com, .app) | $50/год = $4/мес |
| **ИТОГО** | **$90–250/мес** |

### Масштабирование (при 500 клиентах)

| Сервис | $/мес |
|---|---|
| Supabase | $25–100 (Team plan если нужно) |
| Cloudflare R2 | $30–100 |
| Render → AWS / Railway Pro | $50–200 |
| Sentry | $26 (Team plan) |
| PostHog | $0–50 |
| AI слой (OpenRouter + Anthropic + Groq) | $300–1500 |
| Domains + SSL | $10 |
| **ИТОГО** | **$450–2000/мес** |

При 500 клиентах × $40/мес (средний) = $20 000/мес revenue. Margin ~90%.

### Cost optimization

- AI cost tracking per tenant — ограничить sebak на тарифе
- Caching агрессивно через Redis (catalog, settings, country_config)
- Image optimization (WebP/AVIF, lazy loading)
- Database query optimization (indexes, materialized views для analytics)
- CDN для всех статических ассетов через Cloudflare

---

## 25. Стратегия запуска

### Pre-launch (за 4 недели)

1. **Beta-клиенты** — 10 продавцов из UZ, бесплатно используют 2 месяца
2. **Customer Discovery** — еженедельные интервью, итерация на feedback
3. **Content creation** — 5 видео-туториалов, 10 статей в блоге
4. **Influencer outreach** — 3-5 UZ Telegram-каналов про бизнес/предпринимательство

### Launch day

1. Запостить в свой Telegram-канал @dokonly_news
2. Запостить в Instagram (3 reels + post)
3. Press release в местные tech-СМИ (it.uz, anhor.uz)
4. Запостить на Product Hunt (английская версия)
5. Запостить в Telegram-чатах для предпринимателей UZ

### First week

1. Daily monitoring всех каналов на feedback
2. Hotfix workflow готов (можно деплоить за <30 мин)
3. Support ответы в <2 часа
4. Daily team standup для координации

### First month

1. Customer success — proactive outreach к каждому новому клиенту
2. Onboarding success rate >70% (от signup до первого заказа)
3. Trial-to-paid conversion >15%
4. NPS опросы

### Key metrics для Month 1

- **Activated tenants** — прошли onboarding и добавили хотя бы 1 товар
- **Active tenants** — получили хотя бы 1 заказ
- **Paying tenants** — оплатили подписку после trial
- **Revenue** — total subscription revenue
- **Churn rate** — % cancellations

**Цели Month 1:**
- 100+ signed up
- 50+ activated
- 30+ active
- 10+ paying
- $400+ revenue

---

## Приложение A: Domain-Driven Design boundaries

Для navigation в коде — какие модули как разделены:

- **Tenants context** — магазины, владельцы, админы, подписки
- **Catalog context** — категории, товары, варианты, attributes
- **Orders context** — заказы, статусы, история, отзывы
- **Customers context** — клиенты магазинов, сегментация
- **Payments context** — провайдеры, транзакции, refunds
- **Marketing context** — рассылки, купоны, AI-генерация
- **Analytics context** — events, agregation, reports
- **AI context** — router, providers, tasks, prompts
- **Channel Integration context** — channel gate, welcome message, forwarding
- **Globalization context** — i18n, currencies, country configs
- **Legal Compliance context** — country-specific rules, self-employed wizard

---

## Приложение B: Acceptance criteria для каждой PR

Перед merge каждого PR — проверка:

1. ✅ **Mobile-first:** работает на 375px ширине, одной рукой, без hover
2. ✅ **i18n:** все строки через `t('key')`, нет хардкода
3. ✅ **Multi-currency:** нет хардкода UZS, всё через `tenant.currency`
4. ✅ **Multi-tenant:** все queries фильтруются по `tenant_id`, RLS не сломана
5. ✅ **Tests:** unit-тесты для нового кода, e2e для critical paths
6. ✅ **Performance:** новые endpoints с p95 <500ms
7. ✅ **A11y:** базовая accessibility (keyboard nav, screen readers)
8. ✅ **TypeScript:** нет `any`, нет `// @ts-ignore` без обоснования
9. ✅ **Security:** нет утечек credentials в логах, validation на backend
10. ✅ **Docs:** обновлены README и комментарии для нетривиальной логики

---

## Приложение C: AI Task таксономия

Все AI-задачи в системе через `AIRouter` с указанием task_type:

| Task Type | Provider | Model | Cost target |
|---|---|---|---|
| `product_extraction` | OpenRouter | Claude Haiku | <$0.001/call |
| `product_translation` | OpenRouter | Claude Haiku | <$0.0005/call |
| `voice_transcription` | Groq | Whisper Large | <$0.04/час |
| `consultant_response` | Anthropic (direct) | Claude Sonnet 4 | <$0.01/call (с caching) |
| `mailing_generation` | OpenRouter | Claude Sonnet | <$0.005/call |
| `category_suggestion` | OpenRouter | Claude Haiku | <$0.0001/call |

Каждый task имеет budget cap per tenant и retry logic с fallback на другую модель.

---

## Приложение D: Telegram-native UX checklist

При разработке Mini App — проверка соответствия нативному Telegram UX:

- [ ] Использован Telegram Theme Variables (`var(--tg-theme-*)`)
- [ ] BackButton через Telegram WebApp SDK, не свой ←
- [ ] MainButton для primary действий, не свой button внизу
- [ ] BottomSheets для модалок (не центрированные modals)
- [ ] iOS-style toggles
- [ ] Закруглённые buttons (radius 14px)
- [ ] System fonts (-apple-system, SF Pro / Roboto на Android)
- [ ] Анимации 0.2s ease-out
- [ ] Haptic feedback через `WebApp.HapticFeedback`
- [ ] Тестирование на iPhone SE (375px) + iPhone 16 Pro Max (430px) + Android (360px)

---

**Конец плана v2.0**

Версия: 2.0  
Дата: Май 2026  
Следующая ревизия: после первых 100 платящих клиентов (ожидается ~3 месяца после launch)
