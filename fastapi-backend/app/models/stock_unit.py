"""
Stock Unit Enumeration for Dynamic Measuring
Supports count, volume, and weight units for inventory tracking
"""

from enum import Enum


class StockUnit(str, Enum):
    """Dynamic measuring units for inventory items

    Count units (discrete items):
    - pcs: Individual pieces
    - pack: Packaged items
    - box: Boxed items
    - dozen: Dozen (12 items)

    Volume units (liquids):
    - ml: Milliliter
    - l: Liter
    - gal: Gallon
    - oz_fl: Fluid Ounce

    Weight units (solids):
    - g: Gram
    - kg: Kilogram
    - oz: Ounce
    - lb: Pound
    """

    # Count units (discrete items)
    PCS = "pcs"           # Pieces
    PACK = "pack"         # Pack
    BOX = "box"           # Box
    DOZEN = "dozen"       # Dozen (12)

    # Volume units (liquids)
    ML = "ml"             # Milliliter
    L = "l"               # Liter
    GAL = "gal"           # Gallon
    OZ_FL = "oz_fl"       # Fluid Ounce

    # Weight units (solids)
    G = "g"               # Gram
    KG = "kg"             # Kilogram
    OZ = "oz"             # Ounce
    LB = "lb"             # Pound

    @classmethod
    def get_display_name(cls, unit: str) -> str:
        """Get human-readable name for unit

        Args:
            unit: The unit code (e.g., 'pcs', 'l', 'kg')

        Returns:
            Human-readable display name
        """
        display_names = {
            "pcs": "Pieces",
            "pack": "Pack",
            "box": "Box",
            "dozen": "Dozen",
            "ml": "Milliliters",
            "l": "Liters",
            "gal": "Gallons",
            "oz_fl": "Fl. Oz",
            "g": "Grams",
            "kg": "Kilograms",
            "oz": "Ounces",
            "lb": "Pounds",
        }
        return display_names.get(unit, unit)

    @classmethod
    def get_unit_type(cls, unit: str) -> str:
        """Get unit category: count, volume, or weight

        Args:
            unit: The unit code (e.g., 'pcs', 'l', 'kg')

        Returns:
            Unit type: 'count', 'volume', 'weight', or 'unknown'
        """
        if unit in ["pcs", "pack", "box", "dozen"]:
            return "count"
        elif unit in ["ml", "l", "gal", "oz_fl"]:
            return "volume"
        elif unit in ["g", "kg", "oz", "lb"]:
            return "weight"
        return "unknown"

    @classmethod
    def get_all_units(cls) -> list[dict]:
        """Get all available units with their metadata

        Returns:
            List of dicts with unit code, display name, and type
        """
        return [
            # Count units
            {"value": "pcs", "label": "Pieces", "type": "count"},
            {"value": "pack", "label": "Pack", "type": "count"},
            {"value": "box", "label": "Box", "type": "count"},
            {"value": "dozen", "label": "Dozen", "type": "count"},
            # Volume units
            {"value": "ml", "label": "Milliliters", "type": "volume"},
            {"value": "l", "label": "Liters", "type": "volume"},
            {"value": "gal", "label": "Gallons", "type": "volume"},
            {"value": "oz_fl", "label": "Fl. Oz", "type": "volume"},
            # Weight units
            {"value": "g", "label": "Grams", "type": "weight"},
            {"value": "kg", "label": "Kilograms", "type": "weight"},
            {"value": "oz", "label": "Ounces", "type": "weight"},
            {"value": "lb", "label": "Pounds", "type": "weight"},
        ]

    @classmethod
    def get_units_by_type(cls, unit_type: str) -> list[dict]:
        """Get units filtered by type

        Args:
            unit_type: 'count', 'volume', or 'weight'

        Returns:
            List of units of the specified type
        """
        return [u for u in cls.get_all_units() if u["type"] == unit_type]
