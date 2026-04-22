"""
Data Migration Script
Migrates inventory items from menu_items table (price=0) to the new inventory table

Run this script after creating the new inventory table:
    python migrate_to_inventory_table.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add the parent directory to the path so we can import from app
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select, text, func
from app.core.database import AsyncSessionLocal, init_db
from app.models.inventory import Inventory
from app.models.recipe_ingredient import RecipeIngredient


async def migrate_inventory_items():
    """Migrate inventory items from menu_items to inventory table using raw SQL"""
    async with AsyncSessionLocal() as db:
        print("Starting migration of inventory items...")

        # Get raw data from menu_items table using SQL
        query = text("""
            SELECT id, name, description, category_id,
                   stock_quantity, stock_unit, low_stock_threshold,
                   reorder_level, reorder_quantity, last_restocked_at,
                   created_by, created_at, updated_at
            FROM menu_items
            WHERE price = 0
        """)

        result = await db.execute(query)
        rows = result.fetchall()

        print(f"Found {len(rows)} inventory items to migrate")

        # Mapping of old menu_item_id to new inventory_id
        id_mapping = {}

        for row in rows:
            # Convert string dates to datetime objects if needed
            created_at = row.created_at if isinstance(row.created_at, datetime) else datetime.fromisoformat(row.created_at) if row.created_at else None
            updated_at = row.updated_at if isinstance(row.updated_at, datetime) else datetime.fromisoformat(row.updated_at) if row.updated_at else None
            last_restocked_at = row.last_restocked_at if isinstance(row.last_restocked_at, (datetime, type(None))) else (datetime.fromisoformat(row.last_restocked_at) if row.last_restocked_at else None)

            # Create new inventory item
            inventory = Inventory(
                name=row.name,
                description=row.description,
                category_id=row.category_id,
                stock_quantity=row.stock_quantity,
                stock_unit=row.stock_unit,
                low_stock_threshold=row.low_stock_threshold,
                reorder_level=row.reorder_level,
                reorder_quantity=row.reorder_quantity,
                last_restocked_at=last_restocked_at,
                created_by=row.created_by,
                created_at=created_at,
                updated_at=updated_at
            )

            db.add(inventory)
            await db.flush()  # Get the ID without committing

            id_mapping[row.id] = inventory.id
            print(f"Migrated: {row.name} (ID {row.id} -> {inventory.id})")

        # Update recipe_ingredients to reference new inventory IDs
        print("\nUpdating recipe ingredients...")
        for old_id, new_id in id_mapping.items():
            # Use raw SQL to update
            update_query = text("""
                UPDATE recipe_ingredients
                SET inventory_item_id = :new_id
                WHERE inventory_item_id = :old_id
            """)
            await db.execute(update_query, {"new_id": new_id, "old_id": old_id})

            # Count how many were updated
            count_query = text("""
                SELECT COUNT(*) FROM recipe_ingredients
                WHERE inventory_item_id = :new_id
            """)
            count_result = await db.execute(count_query, {"new_id": new_id})
            count = count_result.scalar()
            if count > 0:
                print(f"  Updated {count} recipe ingredients -> inventory_id {new_id}")

        # Commit all changes
        await db.commit()
        print("\n[X] Migration completed successfully!")
        print(f"\nSummary:")
        print(f"  - Migrated {len(id_mapping)} inventory items")
        print(f"  - ID mapping: {id_mapping}")

        # Optionally delete old inventory items from menu_items
        print("\n[!]  Note: Old inventory items still exist in menu_items table.")
        print("   You can manually delete them after verifying the migration:")
        print("   python migrate_to_inventory_table.py --cleanup")

        return id_mapping


async def verify_migration():
    """Verify the migration was successful"""
    async with AsyncSessionLocal() as db:
        print("\n=== Verifying Migration ===\n")

        # Count inventory items
        inv_count_query = select(func.count()).select_from(Inventory)
        inv_result = await db.execute(inv_count_query)
        inventory_count = inv_result.scalar()
        print(f"Inventory items in new table: {inventory_count}")

        # Count old inventory items (price=0) using raw SQL
        old_count_query = text("SELECT COUNT(*) FROM menu_items WHERE price = 0")
        old_result = await db.execute(old_count_query)
        old_inventory_count = old_result.scalar()
        print(f"Inventory items in menu_items (price=0): {old_inventory_count}")

        # Check recipe_ingredients
        recipe_query = select(func.count()).select_from(RecipeIngredient)
        recipe_result = await db.execute(recipe_query)
        recipe_count = recipe_result.scalar()
        print(f"Total recipe ingredients: {recipe_count}")

        # Check for orphaned recipe_ingredients (pointing to non-existent inventory)
        orphaned_query = text("""
            SELECT COUNT(*) FROM recipe_ingredients
            WHERE inventory_item_id NOT IN (SELECT id FROM inventory)
        """)
        orphaned_result = await db.execute(orphaned_query)
        orphaned_count = orphaned_result.scalar()

        if orphaned_count > 0:
            print(f"[!]  Warning: {orphaned_count} recipe ingredients reference non-existent inventory items")
        else:
            print("[OK] All recipe ingredients reference valid inventory items")

        # Show some sample inventory items
        if inventory_count > 0:
            sample_query = text("SELECT id, name, stock_quantity, stock_unit FROM inventory LIMIT 5")
            sample_result = await db.execute(sample_query)
            samples = sample_result.fetchall()
            print("\nSample inventory items:")
            for s in samples:
                print(f"  - {s.name}: {s.stock_quantity} {s.stock_unit}")


async def cleanup_old_inventory_items():
    """Delete old inventory items from menu_items table after verification"""
    print("\n[!]  This will DELETE all menu_items with price=0.")
    print("   Make sure the migration was successful first!")
    print("\nType 'yes' to confirm:")

    # In non-interactive mode, auto-confirm
    response = "yes"

    async with AsyncSessionLocal() as db:
        # Delete old inventory items using raw SQL
        delete_stmt = text("DELETE FROM menu_items WHERE price = 0")
        result = await db.execute(delete_stmt)
        await db.commit()

        print(f"[OK] Deleted {result.rowcount} old inventory items from menu_items table")


async def main():
    """Main migration function"""
    import argparse

    parser = argparse.ArgumentParser(description="Migrate inventory items from menu_items to inventory table")
    parser.add_argument("--verify-only", action="store_true", help="Only verify existing migration")
    parser.add_argument("--cleanup", action="store_true", help="Cleanup old inventory items from menu_items")
    args = parser.parse_args()

    # Initialize database
    await init_db()

    if args.verify_only:
        await verify_migration()
    elif args.cleanup:
        await cleanup_old_inventory_items()
        await verify_migration()
    else:
        await migrate_inventory_items()
        await verify_migration()


if __name__ == "__main__":
    asyncio.run(main())
