"""
QR Code Generator Utility

Generates QR code images and print-ready templates for table management.
Uses qrcode library with custom styling (QuickServe orange theme).
"""

from io import BytesIO
from typing import Optional, Dict, Any
from qrcode import QRCode
from qrcode.constants import ERROR_CORRECT_M
from PIL import Image, ImageDraw, ImageFont
import os


# QuickServe Brand Colors
BRAND_COLOR = "#ec7813"  # Orange
BRAND_COLOR_DARK = "#d66a10"  # Dark orange
WHITE = "#FFFFFF"
BLACK = "#000000"
LIGHT_GRAY = "#F3F4F6"


def generate_qr_image(
    qr_data: str,
    size: str = "medium",
    include_color: bool = True,
    include_logo: bool = False
) -> BytesIO:
    """
    Generate QR code image with custom styling.

    Args:
        qr_data: Data to encode in QR code (e.g., "QS-TABLE-5")
        size: Image size - "small" (256px), "medium" (512px), "large" (1024px)
        include_color: Use brand color instead of black
        include_logo: Add logo placeholder in center (future enhancement)

    Returns:
        BytesIO: PNG image data
    """
    # Size mapping
    size_map = {
        "small": 256,
        "medium": 512,
        "large": 1024
    }

    img_size = size_map.get(size, 512)
    box_size = img_size // 25  # QR module size

    # Create QR code instance
    qr = QRCode(
        version=1,
        error_correction=ERROR_CORRECT_M,  # Medium error correction for logo support
        box_size=box_size,
        border=4,  # Quiet zone
    )

    qr.add_data(qr_data)
    qr.make(fit=True)

    # Generate QR code image
    if include_color:
        # Convert hex to RGB
        fill_color = _hex_to_rgb(BRAND_COLOR)
        img = qr.make_image(fill_color=fill_color, back_color=WHITE)
    else:
        img = qr.make_image(fill_color=BLACK, back_color=WHITE)

    # Convert to RGB if needed (for PIL operations)
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # Resize to exact dimensions
    img = img.resize((img_size, img_size), Image.Resampling.LANCZOS)

    # Add logo placeholder if requested (future: add actual logo)
    if include_logo:
        img = _add_logo_overlay(img, img_size)

    # Save to BytesIO
    img_io = BytesIO()
    img.save(img_io, format='PNG', optimize=True)
    img_io.seek(0)

    return img_io


def generate_print_template(
    table_number: int,
    location: str,
    qr_data: str,
    restaurant_name: str = "QuickServe",
    access_code: str = None
) -> BytesIO:
    """
    Generate print-ready QR code template for table stands.

    Args:
        table_number: Table number
        location: Table location (Indoor, Outdoor, etc.)
        qr_data: QR code data
        restaurant_name: Restaurant name for branding
        access_code: 6-character access code for manual entry

    Returns:
        BytesIO: PNG image data (print-ready)
    """
    # Template dimensions (A6 ratio-ish, good for table stands)
    width = 600
    height = 800

    # Create white background
    img = Image.new('RGB', (width, height), WHITE)
    draw = ImageDraw.Draw(img)

    # Load fonts (with fallbacks)
    try:
        title_font = ImageFont.truetype("arial.ttf", 48)
        subtitle_font = ImageFont.truetype("arial.ttf", 32)
        small_font = ImageFont.truetype("arial.ttf", 24)
        tiny_font = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        # Fallback to default font
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        tiny_font = ImageFont.load_default()

    # Draw decorative border
    border_margin = 20
    border_color = _hex_to_rgb(BRAND_COLOR)
    draw.rectangle(
        [border_margin, border_margin, width - border_margin, height - border_margin],
        outline=border_color,
        width=4
    )

    # Draw inner border
    inner_margin = 30
    draw.rectangle(
        [inner_margin, inner_margin, width - inner_margin, height - inner_margin],
        outline=_hex_to_rgb(LIGHT_GRAY),
        width=2
    )

    # Title: "Scan to Order"
    title_text = "Scan to Order"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x, 60), title_text, fill=border_color, font=title_font)

    # Restaurant name
    name_bbox = draw.textbbox((0, 0), restaurant_name, font=small_font)
    name_width = name_bbox[2] - name_bbox[0]
    name_x = (width - name_width) // 2
    draw.text((name_x, 120), restaurant_name, fill=_hex_to_rgb("#6B7280"), font=small_font)

    # Generate QR code (medium size)
    qr_io = generate_qr_image(qr_data, size="medium", include_color=True)
    qr_img = Image.open(qr_io)

    # Calculate QR position (centered, below title)
    qr_size = 350
    qr_x = (width - qr_size) // 2
    qr_y = 180

    # Resize QR to fit
    qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)

    # Draw QR code with shadow/border
    shadow_offset = 4
    qr_shadow_rect = [
        qr_x - shadow_offset,
        qr_y - shadow_offset,
        qr_x + qr_size + shadow_offset,
        qr_y + qr_size + shadow_offset
    ]
    draw.rectangle(qr_shadow_rect, fill=_hex_to_rgb("#E5E7EB"))

    # Paste QR code
    img.paste(qr_img, (qr_x, qr_y))

    # Draw border around QR
    draw.rectangle(
        [qr_x - 8, qr_y - 8, qr_x + qr_size + 8, qr_y + qr_size + 8],
        outline=border_color,
        width=3
    )

    # Table number label
    table_label = f"Table {table_number}"
    table_bbox = draw.textbbox((0, 0), table_label, font=subtitle_font)
    table_width = table_bbox[2] - table_bbox[0]
    table_x = (width - table_width) // 2
    draw.text((table_x, qr_y + qr_size + 30), table_label, fill=BLACK, font=subtitle_font)

    # Location label
    loc_text = f"Location: {location}"
    loc_bbox = draw.textbbox((0, 0), loc_text, font=small_font)
    loc_width = loc_bbox[2] - loc_bbox[0]
    loc_x = (width - loc_width) // 2
    draw.text((loc_x, qr_y + qr_size + 75), loc_text, fill=_hex_to_rgb("#6B7280"), font=small_font)

    # Access Code (for manual entry)
    if access_code:
        # Access code background
        code_bg_y = qr_y + qr_size + 110
        draw.rectangle(
            [50, code_bg_y, width - 50, code_bg_y + 50],
            fill=_hex_to_rgb("#FEF3C7")  # Light yellow background
        )
        draw.rectangle(
            [50, code_bg_y, width - 50, code_bg_y + 50],
            outline=border_color,
            width=2
        )

        # "No QR?" label
        no_qr_label = "No QR Scanner?"
        no_qr_bbox = draw.textbbox((0, 0), no_qr_label, font=tiny_font)
        no_qr_width = no_qr_bbox[2] - no_qr_bbox[0]
        no_qr_x = (width - no_qr_width) // 2
        draw.text((no_qr_x, code_bg_y + 8), no_qr_label, fill=_hex_to_rgb("#92400E"), font=tiny_font)

        # Access code
        code_label = f"Code: {access_code}"
        code_bbox = draw.textbbox((0, 0), code_label, font=subtitle_font)
        code_width = code_bbox[2] - code_bbox[0]
        code_x = (width - code_width) // 2
        draw.text((code_x, code_bg_y + 28), code_label, fill=border_color, font=subtitle_font)

    # Divider line
    divider_y = qr_y + qr_size + 130
    draw.line(
        [(100, divider_y), (width - 100, divider_y)],
        fill=_hex_to_rgb(LIGHT_GRAY),
        width=2
    )

    # Instructions
    instructions = [
        "1. Open your camera app",
        "2. Point at the QR code",
        "3. Tap the link that appears",
        "4. Browse & order from the menu"
    ]

    inst_y = divider_y + 30
    for i, instruction in enumerate(instructions):
        inst_bbox = draw.textbbox((0, 0), f"{i+1}. {instruction}", font=tiny_font)
        inst_width = inst_bbox[2] - inst_bbox[0]
        inst_x = (width - inst_width) // 2
        draw.text((inst_x, inst_y), f"{i+1}. {instruction}", fill=_hex_to_rgb("#4B5563"), font=tiny_font)
        inst_y += 30

    # Footer
    footer_text = "Powered by QuickServe"
    footer_bbox = draw.textbbox((0, 0), footer_text, font=tiny_font)
    footer_width = footer_bbox[2] - footer_bbox[0]
    footer_x = (width - footer_width) // 2
    draw.text((footer_x, height - 40), footer_text, fill=_hex_to_rgb("#9CA3AF"), font=tiny_font)

    # Save to BytesIO
    img_io = BytesIO()
    img.save(img_io, format='PNG', optimize=True, dpi=(300, 300))
    img_io.seek(0)

    return img_io


def generate_batch_qr_codes(
    tables: list[Dict[str, Any]],
    size: str = "medium"
) -> BytesIO:
    """
    Generate multiple QR codes as a single image (grid layout).

    Args:
        tables: List of table dicts with 'id', 'table_number', 'qr_code'
        size: QR code size

    Returns:
        BytesIO: PNG image with all QR codes in grid
    """
    # Configuration
    qr_size = 256 if size == "small" else (512 if size == "medium" else 1024)
    margin = 40
    cols = 2  # 2 QR codes per row

    # Calculate grid dimensions
    rows = (len(tables) + cols - 1) // cols
    img_width = cols * qr_size + (cols + 1) * margin
    img_height = rows * qr_size + (rows + 1) * margin + 100  # Extra space for title

    # Create white background
    img = Image.new('RGB', (img_width, img_height), WHITE)
    draw = ImageDraw.Draw(img)

    # Load fonts
    try:
        title_font = ImageFont.truetype("arial.ttf", 36)
        label_font = ImageFont.truetype("arial.ttf", 24)
    except OSError:
        title_font = ImageFont.load_default()
        label_font = ImageFont.load_default()

    # Title
    title_text = f"QuickServe QR Codes - {len(tables)} Tables"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (img_width - title_width) // 2
    draw.text((title_x, 30), title_text, fill=_hex_to_rgb(BRAND_COLOR), font=title_font)

    # Generate and place QR codes
    for idx, table in enumerate(tables):
        row = idx // cols
        col = idx % cols

        x = margin + col * (qr_size + margin)
        y = 100 + margin + row * (qr_size + margin)

        # Generate QR code
        qr_io = generate_qr_image(table['qr_code'], size=size, include_color=True)
        qr_img = Image.open(qr_io)
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)

        # Paste QR code
        img.paste(qr_img, (x, y))

        # Add table label below QR
        label_text = f"Table {table['table_number']}"
        label_bbox = draw.textbbox((0, 0), label_text, font=label_font)
        label_width = label_bbox[2] - label_bbox[0]
        label_x = x + (qr_size - label_width) // 2

        # Draw label background
        draw.rectangle(
            [x, y + qr_size, x + qr_size, y + qr_size + 40],
            fill=_hex_to_rgb(LIGHT_GRAY)
        )
        draw.text((label_x, y + qr_size + 8), label_text, fill=BLACK, font=label_font)

    # Save to BytesIO
    img_io = BytesIO()
    img.save(img_io, format='PNG', optimize=True)
    img_io.seek(0)

    return img_io


def _hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def _add_logo_overlay(img: Image.Image, img_size: int) -> Image.Image:
    """
    Add logo overlay to QR code (placeholder for future).

    Args:
        img: QR code image
        img_size: Image size

    Returns:
        Image with logo overlay
    """
    # Logo size (about 20% of QR size)
    logo_size = img_size // 5

    # Create white square for logo
    logo_x = (img_size - logo_size) // 2
    logo_y = (img_size - logo_size) // 2

    # Draw white background for logo
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [logo_x - 5, logo_y - 5, logo_x + logo_size + 5, logo_y + logo_size + 5],
        fill=WHITE
    )

    # TODO: Add actual logo image here
    # For now, draw a placeholder circle with "QS" text
    draw.ellipse(
        [logo_x, logo_y, logo_x + logo_size, logo_y + logo_size],
        fill=_hex_to_rgb(BRAND_COLOR)
    )

    try:
        font = ImageFont.truetype("arial.ttf", int(logo_size * 0.6))
    except OSError:
        font = ImageFont.load_default()

    text = "QS"
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]

    text_x = logo_x + (logo_size - text_width) // 2
    text_y = logo_y + (logo_size - text_height) // 2 - text_bbox[1]

    draw.text((text_x, text_y), text, fill=WHITE, font=font)

    return img
