# Product Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move storefront home merchandising from category/product dumps to editable product collections.

**Architecture:** Collections are storefront merchandising groups stored in `tenant.settings.product_collections`; products store assigned collection ids in metadata as `collection_ids`. Default collections are generated when settings do not define them: `Новинки`, `На скидке`, and `Популярное`. Catalog remains category/search focused, but can receive a collection filter from the home page.

**Tech Stack:** FastAPI backend, SQLAlchemy metadata JSON, React miniapp, TanStack Query, local mock API state.

## Global Constraints

- Keep categories separate from collections.
- Home page must not show the category rail or a generic all-products grid.
- Home page shows only enabled collections, up to 6 products each in a 3-column grid.
- If a collection contains more than 6 products, show `Все` and open the catalog filtered to that collection.
- Seller can edit collection names, add collections, hide/remove collections.
- Product form supports assigning a product to multiple collections.
- Keep existing branch `feat/m6-m7-payments-promo-cart`.

---

### Task 1: Shared Collection Model

**Files:**
- Create: `apps/miniapp/src/lib/productCollections.ts`
- Modify: `apps/miniapp/src/lib/mockApiState.ts`
- Modify: `backend/app/services/tenant_settings.py`

**Interfaces:**
- Produces: `defaultProductCollections()`, `normalizeProductCollections(value)`, `productMatchesCollection(product, collection)`, and `productsForCollection(products, collection)`.
- Consumes: product fields `collection_ids`, `compare_at_price`, `price`, `is_featured`, `order_count`, `created_at`.

- [ ] Add shared miniapp helpers for defaults, normalization, matching, and sorting.
- [ ] Seed mock settings with default collections.
- [ ] Allow `product_collections` through backend settings persistence.

### Task 2: Product Persistence

**Files:**
- Modify: `backend/app/api/v1/endpoints/miniapp.py`
- Modify: `backend/app/schemas/product.py`
- Modify: `apps/miniapp/src/lib/mockApi.ts`

**Interfaces:**
- Produces product payload field `collection_ids: string[]`.
- Saves `collection_ids` inside product metadata.

- [ ] Add `collection_ids` to product create/update schemas.
- [ ] Store and return `collection_ids` in seller/public product payloads.
- [ ] Mirror the same behavior in mock API product create/update.

### Task 3: Seller Editing

**Files:**
- Modify: `apps/miniapp/src/pages/seller/tabs/CatalogTab.tsx`
- Modify: `apps/miniapp/src/pages/seller/tabs/SettingsTab.tsx`

**Interfaces:**
- Product form consumes normalized collections from tenant settings.
- Settings saves `product_collections` through `api.seller.updateSettings`.

- [ ] Replace the visible `Хит продаж` switch with a collection selector.
- [ ] Preserve `is_featured` by setting it from the `popular` collection selection.
- [ ] Add a settings sheet to rename, add, enable/disable, and remove collections.

### Task 4: Buyer Storefront

**Files:**
- Modify: `apps/miniapp/src/App.tsx`
- Modify: `apps/miniapp/src/pages/customer/HomeTab.tsx`
- Modify: `apps/miniapp/src/pages/customer/Storefront.tsx`

**Interfaces:**
- `onShowCatalog(filter?: string)` accepts `category:<name>` and `collection:<id>`.
- Catalog filters products by collection only when the filter starts with `collection:`.

- [ ] Remove categories from the main home layout.
- [ ] Render enabled collections on home with 6 products max and a 3-column grid.
- [ ] Only show collections with products.
- [ ] Make `Все` open catalog filtered to that collection.
- [ ] Keep catalog category rail for the catalog tab only.

### Task 5: Verification and Release

**Files:**
- No production files beyond tasks above.

**Interfaces:**
- Commands: `pnpm --filter miniapp typecheck`, targeted node assertions, remote GitHub build.

- [ ] Add a targeted node assertion that home uses collections and no longer uses the category rail in `PresetStorefront`.
- [ ] Run `pnpm --filter miniapp typecheck`.
- [ ] Run `git diff --check`.
- [ ] Commit, push, and watch GitHub Build checks.
