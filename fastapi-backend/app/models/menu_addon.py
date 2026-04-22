"""
Menu Item - Addon Association Table
Many-to-many relationship between menu items and addons
"""

from sqlalchemy import Column, Integer, ForeignKey
from app.core.database import Base


class MenuItemAddon(Base):
    """Association table for menu items and addons"""

    __tablename__ = "menu_item_addons"

    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), primary_key=True)
    addon_id = Column(Integer, ForeignKey("addons.id", ondelete="CASCADE"), primary_key=True)

    def __repr__(self):
        return f"<MenuItemAddon(menu_item_id={self.menu_item_id}, addon_id={self.addon_id})>"
