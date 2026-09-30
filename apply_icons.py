import os
from PIL import Image

sizes = {
    'mipmap-mdpi': (48, 48),
    'mipmap-hdpi': (72, 72),
    'mipmap-xhdpi': (96, 96),
    'mipmap-xxhdpi': (144, 144),
    'mipmap-xxxhdpi': (192, 192)
}

apps = [
    ('app_cliente', 'logos_generated/logo_cliente.png'),
    ('app_repartidor', 'logos_generated/logo_repartidor.png'),
    ('app_comercio', 'logos_generated/logo_comercio.png')
]

base_dir = "C:/Users/pilar/OneDrive/Escritorio/tequis_delivery/apps"

for app_folder, logo_path in apps:
    src_img = Image.open(logo_path)

    # 1. Copiar a assets y public del frontend web
    app_path = os.path.join(base_dir, app_folder)
    os.makedirs(os.path.join(app_path, "public"), exist_ok=True)
    os.makedirs(os.path.join(app_path, "src", "assets"), exist_ok=True)
    src_img.save(os.path.join(app_path, "public", "logo.png"))
    src_img.save(os.path.join(app_path, "src", "assets", "logo.png"))

    # 2. Reemplazar íconos de Android en cada resolución mipmap
    res_path = os.path.join(app_path, "android", "app", "src", "main", "res")
    for density, (w, h) in sizes.items():
        dir_path = os.path.join(res_path, density)
        os.makedirs(dir_path, exist_ok=True)

        resized = src_img.resize((w, h), Image.Resampling.LANCZOS)

        for icon_name in ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']:
            resized.save(os.path.join(dir_path, icon_name))

print("✅ Todos los íconos de Android y logotipos web han sido actualizados.")
