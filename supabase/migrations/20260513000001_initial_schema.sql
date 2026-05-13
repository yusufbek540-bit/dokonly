-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "pg_trgm";   -- for fast text search on product names

-- =============================================================================
-- ENUMS
-- =============================================================================
create type tier_slug as enum ('start', 'business', 'premium', 'enterprise');
create type order_status as enum ('new', 'confirmed', 'packing', 'shipped', 'delivered', 'cancelled');
create type payment_method as enum ('manual_transfer', 'cash_on_delivery', 'telegram_stars', 'click', 'payme');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type locale as enum ('ru', 'uz', 'en');
create type currency as enum ('UZS', 'USD', 'KZT', 'RUB');

-- =============================================================================
-- TENANTS (one row = one shop)
-- =============================================================================
create table tenants (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  slug            text unique not null,          -- used in bot deep links
  country         text not null default 'UZ',
  currency        currency not null default 'UZS',
  locale          locale not null default 'ru',
  tier            tier_slug not null default 'start',
  trial_ends_at   timestamptz,
  bot_token_hash  text unique,                   -- SHA-256 of the bot token
  bot_username    text,
  logo_url        text,
  cover_url       text,
  description     text,
  contact_info    jsonb default '{}',            -- {address, hours, telegram, instagram}
  settings        jsonb default '{}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- =============================================================================
-- TEAM MEMBERS (admins per tenant)
-- =============================================================================
create type team_role as enum ('owner', 'manager', 'warehouse', 'marketer', 'accountant');

create table team_members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        team_role not null default 'manager',
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- =============================================================================
-- CATEGORIES
-- =============================================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  slug        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- =============================================================================
-- PRODUCTS
-- =============================================================================
create table products (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  category_id  uuid references categories(id) on delete set null,
  name         text not null,
  description  text,
  price        numeric(14, 2) not null check (price >= 0),
  currency     currency not null default 'UZS',
  stock        integer,                          -- null = unlimited
  sku          text,
  images       text[] not null default '{}',
  video_url    text,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  meta         jsonb default '{}',              -- variants, attributes, etc.
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index products_tenant_active on products(tenant_id, is_active);
create index products_name_trgm on products using gin(name gin_trgm_ops);

-- =============================================================================
-- CUSTOMERS (Telegram users who bought from the store)
-- =============================================================================
create table customers (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  telegram_id         bigint not null,
  first_name          text,
  last_name           text,
  username            text,
  locale              locale not null default 'ru',
  total_orders        integer not null default 0,
  total_spent         numeric(14, 2) not null default 0,
  last_order_at       timestamptz,
  created_at          timestamptz not null default now(),
  unique (tenant_id, telegram_id)
);

-- =============================================================================
-- ORDERS
-- =============================================================================
create table orders (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  customer_id     uuid not null references customers(id),
  status          order_status not null default 'new',
  payment_method  payment_method not null,
  payment_status  payment_status not null default 'pending',
  payment_id      text,                          -- external payment reference
  subtotal        numeric(14, 2) not null,
  discount        numeric(14, 2) not null default 0,
  total           numeric(14, 2) not null,
  currency        currency not null default 'UZS',
  delivery_note   text,                          -- seller's delivery instruction
  customer_note   text,
  meta            jsonb default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_tenant_status on orders(tenant_id, status);
create index orders_tenant_created on orders(tenant_id, created_at desc);

-- =============================================================================
-- ORDER ITEMS
-- =============================================================================
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  product_name text not null,                   -- snapshot at time of order
  price        numeric(14, 2) not null,
  quantity     integer not null check (quantity > 0),
  subtotal     numeric(14, 2) not null
);

-- =============================================================================
-- PROMO CODES
-- =============================================================================
create table promo_codes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  code            text not null,
  discount_pct    numeric(5, 2),                -- e.g. 10.00 = 10%
  discount_fixed  numeric(14, 2),
  max_uses        integer,
  uses_count      integer not null default 0,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tenants_updated_at    before update on tenants    for each row execute function set_updated_at();
create trigger trg_products_updated_at   before update on products   for each row execute function set_updated_at();
create trigger trg_orders_updated_at     before update on orders     for each row execute function set_updated_at();

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================
alter table tenants       enable row level security;
alter table team_members  enable row level security;
alter table categories    enable row level security;
alter table products      enable row level security;
alter table customers     enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;
alter table promo_codes   enable row level security;

-- Helper: returns tenant IDs the current user belongs to
create or replace function my_tenant_ids()
returns setof uuid language sql security definer stable as $$
  select tenant_id from team_members where user_id = auth.uid()
  union
  select id from tenants where owner_id = auth.uid()
$$;

-- Tenants: owner sees their own
create policy "owner_tenant" on tenants for all using (owner_id = auth.uid());

-- Team members: members see their tenants
create policy "member_tenant" on team_members for all using (tenant_id in (select my_tenant_ids()));

-- Categories, products, promo codes: scoped to tenant
create policy "tenant_categories"   on categories   for all using (tenant_id in (select my_tenant_ids()));
create policy "tenant_products"     on products      for all using (tenant_id in (select my_tenant_ids()));
create policy "tenant_customers"    on customers     for all using (tenant_id in (select my_tenant_ids()));
create policy "tenant_orders"       on orders        for all using (tenant_id in (select my_tenant_ids()));
create policy "tenant_promo_codes"  on promo_codes   for all using (tenant_id in (select my_tenant_ids()));

-- Order items: accessible if the parent order is accessible
create policy "tenant_order_items" on order_items for all
  using (order_id in (select id from orders where tenant_id in (select my_tenant_ids())));
