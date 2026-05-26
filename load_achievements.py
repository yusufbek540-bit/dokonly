"""
Dokonly Achievement Seeder
==========================

Loads achievement_definitions from achievements_seed.json into the database.

Usage:
    python scripts/load_achievements.py
    python scripts/load_achievements.py --update    # update existing definitions
    python scripts/load_achievements.py --dry-run   # show what would change

Place at: apps/api/scripts/load_achievements.py
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

import asyncpg
import click

# Adjust this import to match your project structure:
# from dokonly_api.config import settings
# Or load from environment:
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://dokonly:dev@localhost:5432/dokonly_dev",
)

SEED_FILE = Path(__file__).parent.parent / "seeds" / "achievements_seed.json"


async def load_seed_data() -> dict[str, Any]:
    """Read seed JSON file."""
    if not SEED_FILE.exists():
        click.echo(f"❌ Seed file not found: {SEED_FILE}", err=True)
        sys.exit(1)

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data


async def get_existing_ids(conn: asyncpg.Connection) -> set[str]:
    """Get all existing achievement IDs from database."""
    rows = await conn.fetch("SELECT id FROM achievement_definitions")
    return {row["id"] for row in rows}


async def insert_achievement(
    conn: asyncpg.Connection,
    achievement: dict[str, Any],
) -> None:
    """Insert single achievement definition."""
    await conn.execute(
        """
        INSERT INTO achievement_definitions (
            id, category, tier, icon,
            name_translations, description_translations,
            condition_type, condition_value,
            reward_type, reward_value,
            display_order, is_active, is_hidden
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        """,
        achievement["id"],
        achievement["category"],
        achievement.get("tier"),
        achievement["icon"],
        json.dumps(achievement["name_translations"]),
        json.dumps(achievement["description_translations"]),
        achievement["condition_type"],
        json.dumps(achievement["condition_value"]),
        achievement.get("reward_type"),
        json.dumps(achievement.get("reward_value")) if achievement.get("reward_value") else None,
        achievement.get("display_order", 0),
        True,
        achievement.get("is_hidden", False),
    )


async def update_achievement(
    conn: asyncpg.Connection,
    achievement: dict[str, Any],
) -> None:
    """Update existing achievement definition (preserves id)."""
    await conn.execute(
        """
        UPDATE achievement_definitions SET
            category = $2,
            tier = $3,
            icon = $4,
            name_translations = $5,
            description_translations = $6,
            condition_type = $7,
            condition_value = $8,
            reward_type = $9,
            reward_value = $10,
            display_order = $11,
            is_hidden = $12
        WHERE id = $1
        """,
        achievement["id"],
        achievement["category"],
        achievement.get("tier"),
        achievement["icon"],
        json.dumps(achievement["name_translations"]),
        json.dumps(achievement["description_translations"]),
        achievement["condition_type"],
        json.dumps(achievement["condition_value"]),
        achievement.get("reward_type"),
        json.dumps(achievement.get("reward_value")) if achievement.get("reward_value") else None,
        achievement.get("display_order", 0),
        achievement.get("is_hidden", False),
    )


@click.command()
@click.option("--update", is_flag=True, help="Update existing definitions if found")
@click.option("--dry-run", is_flag=True, help="Show what would change without modifying DB")
def main(update: bool, dry_run: bool) -> None:
    """Load achievement definitions from JSON seed file into database."""

    async def run() -> None:
        data = await load_seed_data()
        achievements = data["achievements"]
        total = len(achievements)

        click.echo(f"📚 Loaded {total} achievement definitions from seed")
        click.echo(f"   Schema version: {data['$schema_version']}")
        click.echo(f"   Last updated:   {data['$last_updated']}")
        click.echo()

        conn = await asyncpg.connect(DATABASE_URL)
        try:
            existing_ids = await get_existing_ids(conn)
            new_ids = {a["id"] for a in achievements} - existing_ids
            update_ids = {a["id"] for a in achievements} & existing_ids
            obsolete_ids = existing_ids - {a["id"] for a in achievements}

            click.echo(f"   New:      {len(new_ids)} achievements")
            click.echo(f"   Existing: {len(update_ids)} achievements")
            click.echo(f"   Obsolete: {len(obsolete_ids)} achievements (not in seed)")
            click.echo()

            if dry_run:
                click.echo("🔍 Dry run — no changes applied")
                if new_ids:
                    click.echo(f"   Would insert: {sorted(new_ids)}")
                if update and update_ids:
                    click.echo(f"   Would update: {sorted(update_ids)}")
                if obsolete_ids:
                    click.echo(f"   Obsolete (manual review): {sorted(obsolete_ids)}")
                return

            inserted = 0
            updated = 0

            async with conn.transaction():
                for achievement in achievements:
                    if achievement["id"] in new_ids:
                        await insert_achievement(conn, achievement)
                        inserted += 1
                        click.echo(f"  ✓ Inserted: {achievement['id']}")
                    elif achievement["id"] in update_ids and update:
                        await update_achievement(conn, achievement)
                        updated += 1
                        click.echo(f"  ↻ Updated:  {achievement['id']}")

            click.echo()
            click.echo(f"✅ Done. {inserted} inserted, {updated} updated.")

            if obsolete_ids:
                click.echo()
                click.echo(f"⚠️  {len(obsolete_ids)} obsolete achievements in DB (not in seed):")
                for oid in sorted(obsolete_ids):
                    click.echo(f"   - {oid}")
                click.echo("   Review manually; do not auto-delete (tenants may have unlocks).")

        finally:
            await conn.close()

    asyncio.run(run())


if __name__ == "__main__":
    main()
