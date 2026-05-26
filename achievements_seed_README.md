# Achievements Seed — Usage Guide

This folder contains the seed data and loader for Dokonly's achievement system.

## Files

| File | Purpose |
|---|---|
| `achievements_seed.json` | Source of truth — all 29 achievement definitions with translations |
| `load_achievements.py` | Python script to load/sync seed into PostgreSQL |
| `README.md` | This file |

## Achievement Categories (5)

| Category | Count | Examples |
|---|---|---|
| **milestone / onboarding** | 7 | First sale, First customer, Catalog Builder (10/50), Style Set, Payments Ready, Delivery Ready |
| **milestone / volume** | 7 | 50/100/500/1000 orders, 1M/10M/100M revenue |
| **feature_use** | 7 | AI Pioneer, Marketer, Story Teller, Team Player, Loyalty Pro, Referral Master, Cross-Channel |
| **engagement** | 5 | Hot Streak (7d/30d), Quality, Fast Responder, Data-Driven |
| **special** (some hidden) | 3 | OG, Internationalist (hidden), Comeback (hidden) |

**Total: 29 achievements**

## Tier System

| Tier | Color | Meaning |
|---|---|---|
| 🥉 Bronze | Bronze | Easy unlocks — first steps |
| 🥈 Silver | Silver | Some effort required |
| 🥇 Gold | Gold | Significant accomplishment |
| 💎 Platinum | Platinum | Elite — long-term commitment |

## Reward Types

- `badge_only` — just a badge unlocked (most achievements)
- `discount` — auto-applied subscription discount (Power Seller, 10M Club, Top Seller, 30-day streak, OG, Survivor)
- `feature_unlock` — special feature granted (Elite Seller → newsletter feature)

## How to Run the Loader

### Initial load (first time)

```bash
# 1. Place files in your monorepo:
mkdir -p apps/api/seeds apps/api/scripts
cp achievements_seed.json apps/api/seeds/
cp load_achievements.py apps/api/scripts/

# 2. Set database URL
export DATABASE_URL="postgresql://dokonly:dev@localhost:5432/dokonly_dev"

# 3. Run loader (after `achievement_definitions` migration is applied)
cd apps/api
python scripts/load_achievements.py
```

### Update existing definitions (after editing seed)

```bash
python scripts/load_achievements.py --update
```

This re-applies seed values to existing rows. **Does NOT delete obsolete achievements** (would orphan tenant unlocks).

### Dry-run (preview changes)

```bash
python scripts/load_achievements.py --dry-run
python scripts/load_achievements.py --update --dry-run
```

## Translation Keys

Each achievement has `name_translations` and `description_translations` in 3 languages:

- `ru` — Russian (default for UZ market merchants)
- `uz` — Uzbek (Latin script with diacritics: oʻ, gʻ)
- `en` — English (for international expansion)

**Adding more languages later:** Just edit the JSON and re-run with `--update`. New keys added per-translation are safe.

## Condition Types

Each achievement has a `condition_type` that maps to backend event checking logic. See `$condition_types_reference` in the JSON for full list.

Example condition values:

```json
{ "condition_type": "order_count", "condition_value": { "threshold": 100 } }
{ "condition_type": "feature_first_use", "condition_value": { "feature": "ai_import" } }
{ "condition_type": "streak_days", "condition_value": { "streak_type": "daily_orders", "threshold": 30 } }
```

## Backend Integration (Phase 8)

Once loaded, backend workers check unlock conditions on relevant events:

```python
# Example: order placed event
async def on_order_placed(order: Order):
    tenant_id = order.tenant_id

    # Get current order count
    order_count = await get_completed_order_count(tenant_id)

    # Find achievements that may unlock at this count
    candidates = await db.fetch_all("""
        SELECT * FROM achievement_definitions
        WHERE condition_type = 'order_count'
        AND (condition_value->>'threshold')::int = $1
        AND is_active = TRUE
        AND id NOT IN (
            SELECT achievement_id FROM tenant_achievements
            WHERE tenant_id = $2
        )
    """, order_count, tenant_id)

    for achievement in candidates:
        await unlock_achievement(tenant_id, achievement['id'], context={
            'order_id': order.id,
            'order_number': order.order_number,
            'order_total': order.total,
        })
```

The `unlock_achievement` function:
1. Inserts into `tenant_achievements` (sets `seen_by_owner=FALSE`)
2. Sends Telegram notification via bot
3. Pushes WebSocket update to admin dashboard (real-time celebration modal)
4. If achievement has `reward_value` with discount → inserts into `subscription_discounts`

## Editing the Seed

When adding/modifying achievements:

1. **Edit `achievements_seed.json`**
2. **Test with `--dry-run`** to confirm changes
3. **Apply with `--update`** flag
4. **Increment `$schema_version`** and `$last_updated` in the JSON
5. **Commit to git** — seed file is source of truth

### Adding a new achievement

Add an entry to the `achievements` array. Required fields:
- `id` (snake_case, must be unique)
- `category` (`milestone` | `feature_use` | `engagement` | `special`)
- `tier` (bronze/silver/gold/platinum) — optional but recommended
- `icon` (single emoji or icon name)
- `name_translations` and `description_translations` (ru/uz/en at minimum)
- `condition_type` (must match one in `$condition_types_reference`)
- `condition_value` (object matching the condition type)

Optional fields:
- `reward_type` and `reward_value`
- `display_order` (sort order on UI page)
- `is_hidden` (true for "secret" special achievements)
- `subcategory` (free-form, e.g., "onboarding", "volume")

### Removing an achievement

**Don't delete from JSON if it's already in production** — this would orphan tenant unlocks.

Instead:
1. Set `is_active: false` in JSON
2. Run `--update`
3. UI will hide it from new tenants but preserve historical unlocks

## Discounts Mapping

Achievements with `reward_type: "discount"` reference a `campaign_id` that maps to entries in `subscription_discounts` table.

When achievement unlocks with reward, backend:
1. Creates `subscription_discounts` row with `campaign_id` (e.g., `achievement_power_seller`)
2. Discount auto-applies to next billing cycle
3. Notification: "🎉 You unlocked 'Power Seller' — 15% off next month!"

Discount campaigns currently used by achievements:
- `achievement_power_seller` — 15% off, 1 month (orders_500)
- `achievement_top_seller` — 30% off, 1 month (orders_1000)
- `achievement_10m_club` — 20% off, 1 month (revenue_10m)
- `streak_30_days` — 50% off, 1 month (hot_streak_30, also streak system)
- `og_lifetime_discount` — 20% off, 12 months (og)
- `survivor_anniversary` — 25% off, 1 month (survivor)

See app_specification.md §10.5.3 for full discount campaign architecture.

## Related Documentation

- **app_specification.md §5** — `achievement_definitions` and `tenant_achievements` schema
- **app_specification.md §7.11** — Achievement UI (page, celebration modal, share)
- **app_specification.md §10.5.3** — Subscription discounts (referenced from reward_value)
- **implementation_plan.md Phase 8 Week 16** — Achievement system implementation tasks
