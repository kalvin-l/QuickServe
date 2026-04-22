"""Quick script to add sample data"""
import asyncio
import sys
sys.path.insert(0, '.')

from app.core.database import AsyncSessionLocal, get_db
from app.models.category import Category
from app.models.menu_item import MenuItem, ItemStatus, Temperature

async def add_data():
    async with AsyncSessionLocal() as db:
        # Add categories
        cat1 = Category(name="Coffee", scope="menu")
        cat2 = Category(name="Tea", scope="menu")
        cat3 = Category(name="Pastries", scope="menu")

        db.add_all([cat1, cat2, cat3])
        await db.flush()

        # Add menu items
        item1 = MenuItem(
            name="Cappuccino",
            description="Classic espresso with steamed milk foam",
            category_id=cat1.id,
            price=12000,
            temperature=Temperature.HOT,
            prep_time="5-7 mins",
            featured=True,
            popular=True,
            available=True,
            status=ItemStatus.PUBLISHED
        )

        item2 = MenuItem(
            name="Iced Latte",
            description="Espresso with cold milk and ice",
            category_id=cat1.id,
            price=13500,
            temperature=Temperature.COLD,
            prep_time="5-7 mins",
            featured=True,
            available=True,
            status=ItemStatus.PUBLISHED
        )

        item3 = MenuItem(
            name="Green Tea",
            description="Freshly brewed green tea",
            category_id=cat2.id,
            price=8000,
            temperature=Temperature.HOT,
            prep_time="3-5 mins",
            available=True,
            status=ItemStatus.PUBLISHED
        )

        db.add_all([item1, item2, item3])
        await db.commit()

        print("Added 3 categories and 3 menu items!")

if __name__ == "__main__":
    asyncio.run(add_data())
