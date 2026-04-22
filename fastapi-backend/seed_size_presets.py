"""
Seed Size Presets

Populates the database with initial size preset data
Run this after starting the server to populate default size presets
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.size_preset import SizePreset


async def seed_size_presets():
    """Seed initial size presets into the database"""

    async with AsyncSessionLocal() as db:
        try:
            # Check if presets already exist
            from sqlalchemy import select, func
            result = await db.execute(select(func.count()).select_from(SizePreset))
            count = result.scalar()

            if count > 0:
                print(f"Size presets already exist ({count} found). Skipping seed.")
                return

            # Default size presets
            presets = [
                {
                    "name": "Regular Size",
                    "description": "Single size option for simple items",
                    "preset_id": "1",
                    "labels": ["Regular"],
                    "is_default": False,
                    "is_active": True,
                    "sort_order": 1
                },
                {
                    "name": "Two Sizes",
                    "description": "Small and Large size options",
                    "preset_id": "2",
                    "labels": ["Small", "Large"],
                    "is_default": False,
                    "is_active": True,
                    "sort_order": 2
                },
                {
                    "name": "Three Sizes",
                    "description": "Small, Medium, and Large size options",
                    "preset_id": "3",
                    "labels": ["Small", "Medium", "Large"],
                    "is_default": True,  # This is the default
                    "is_active": True,
                    "sort_order": 3
                },
                {
                    "name": "Four Sizes",
                    "description": "XS, S, M, and L size options",
                    "preset_id": "4",
                    "labels": ["XS", "S", "M", "L"],
                    "is_default": False,
                    "is_active": True,
                    "sort_order": 4
                },
                {
                    "name": "Five Sizes",
                    "description": "XS, S, M, L, and XL size options",
                    "preset_id": "5",
                    "labels": ["XS", "S", "M", "L", "XL"],
                    "is_default": False,
                    "is_active": True,
                    "sort_order": 5
                }
            ]

            # Insert presets
            for preset_data in presets:
                labels = preset_data.pop("labels")
                new_preset = SizePreset(
                    **preset_data,
                    labels=labels  # JSON column stores list directly
                )
                db.add(new_preset)

            await db.commit()
            print(f"Successfully seeded {len(presets)} size presets")

            # Display seeded presets
            print("\nSeeded presets:")
            result = await db.execute(select(SizePreset).order_by(SizePreset.sort_order))
            presets = result.scalars().all()

            for preset in presets:
                labels = preset.labels  # Already a list from JSON column
                default_marker = " [DEFAULT]" if preset.is_default else ""
                print(f"  - {preset.name} ({preset.preset_id}): {', '.join(labels)}{default_marker}")

        except Exception as e:
            await db.rollback()
            print(f"Error seeding size presets: {e}")
            raise


if __name__ == "__main__":
    print("Seeding size presets...")
    asyncio.run(seed_size_presets())
    print("Done!")
