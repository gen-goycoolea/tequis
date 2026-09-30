import os
from PIL import Image, ImageDraw, ImageFont

def create_app_logo(app_type, bg_color, text_color, text_str):
    size = 512
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Draw main background circle
    margin = 16
    draw.ellipse([margin, margin, size - margin, size - margin], fill=bg_color)

    # Center circle for icon
    inner_margin = 80
    draw.ellipse([inner_margin, inner_margin - 30, size - inner_margin, size - inner_margin - 30], fill=(255, 255, 255, 240))

    # Draw pin shape
    pin_x, pin_y = size // 2 + 30, size // 2 - 20
    draw.ellipse([pin_x - 50, pin_y - 60, pin_x + 50, pin_y + 40], fill=(200, 50, 40) if app_type != 'CLIENTE' else (230, 80, 50))
    draw.ellipse([pin_x - 35, pin_y - 45, pin_x + 35, pin_y + 25], fill=(255, 255, 255))

    # Scooter / Bike / Store shape representation
    scooter_x, scooter_y = size // 2 - 60, size // 2 - 10
    if app_type == 'REPARTIDOR':
        # Draw Scooter & Delivery Box
        draw.rectangle([scooter_x - 50, scooter_y - 50, scooter_x, scooter_y], fill=(210, 80, 40)) # Box
        draw.ellipse([scooter_x - 40, scooter_y + 20, scooter_x - 10, scooter_y + 50], fill=(50, 50, 50)) # Wheel
        draw.ellipse([scooter_x + 30, scooter_y + 20, scooter_x + 60, scooter_y + 50], fill=(50, 50, 50)) # Wheel
        draw.polygon([(scooter_x - 20, scooter_y), (scooter_x + 30, scooter_y), (scooter_x + 20, scooter_y + 25), (scooter_x - 20, scooter_y + 25)], fill=(230, 140, 40))
    elif app_type == 'COMERCIO':
        # Draw Store Awning / Chef Hat
        draw.polygon([(scooter_x - 20, scooter_y - 60), (scooter_x + 50, scooter_y - 60), (scooter_x + 60, scooter_y - 30), (scooter_x - 30, scooter_y - 30)], fill=(230, 80, 50))
        draw.rectangle([scooter_x - 20, scooter_y - 30, scooter_x + 50, scooter_y + 20], fill=(255, 255, 255), outline=(40, 40, 40), width=3)
    else: # CLIENTE
        # Draw Shopping Bag + Scooter
        draw.rectangle([scooter_x - 20, scooter_y - 20, scooter_x + 40, scooter_y + 40], fill=(240, 180, 50)) # Bag
        draw.ellipse([scooter_x + 20, scooter_y + 20, scooter_x + 50, scooter_y + 50], fill=(50, 50, 50)) # Wheel

    # Fork & Steam Icon inside pin
    draw.polygon([(pin_x - 10, pin_y - 15), (pin_x - 10, pin_y + 10), (pin_x + 10, pin_y - 10)], fill=(0, 70, 70))

    # Text at the bottom
    try:
        font = ImageFont.truetype("arial.ttf", 46)
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text_str, font=font)
    text_w = bbox[2] - bbox[0]
    text_x = (size - text_w) // 2
    text_y = size - 110
    draw.text((text_x, text_y), text_str, fill=text_color, font=font)

    return img

os.makedirs("logos_generated", exist_ok=True)

# 1. REPARTIDOR (Teal Background #0096A6, Orange Text #FFA726)
img_repartidor = create_app_logo('REPARTIDOR', (0, 150, 166, 255), (255, 167, 38, 255), 'REPARTIDOR')
img_repartidor.save("logos_generated/logo_repartidor.png")

# 2. COMERCIO (Orange Background #F57C00, Dark Teal Text #004D40)
img_comercio = create_app_logo('COMERCIO', (245, 124, 0, 255), (0, 77, 64, 255), 'COMERCIO')
img_comercio.save("logos_generated/logo_comercio.png")

# 3. CLIENTE (Terracotta Background #C65346, Navy Text #00363A)
img_cliente = create_app_logo('CLIENTE', (198, 83, 70, 255), (0, 54, 58, 255), 'CLIENTE')
img_cliente.save("logos_generated/logo_cliente.png")

print("✅ Logos creados exitosamente en logos_generated/")
