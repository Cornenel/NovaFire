"""Crop a clean shield emblem from the Nova Fire logo lockup."""
from PIL import Image

src = Image.open(r"public/brand/logo.png").convert("RGB")
w, h = src.size

# Wordmark begins ~765px on the 1024px lockup; shield ends ~715–725px.
# Crop through the gap below the shield so the gold border is never clipped.
shield_bottom = min(h, 755)
shield = src.crop((0, 0, w, shield_bottom))
sp = shield.load()
sw, sh = shield.size

xs, ys = [], []
for y in range(sh):
    for x in range(sw):
        r, g, b = sp[x, y]
        if r + g + b > 30:
            xs.append(x)
            ys.append(y)

left, top, right, bottom = min(xs), min(ys), max(xs), max(ys)
pad_x, pad_top, pad_bottom = 32, 32, 48
left = max(0, left - pad_x)
top = max(0, top - pad_top)
right = min(sw - 1, right + pad_x)
bottom = min(sh - 1, bottom + pad_bottom)
emblem = shield.crop((left, top, right + 1, bottom + 1))

ew, eh = emblem.size
target = 560
scale = target / max(ew, eh)
emblem = emblem.resize(
    (max(1, int(ew * scale)), max(1, int(eh * scale))),
    Image.Resampling.LANCZOS,
)
emblem.save(r"public/brand/logo-mark.png", optimize=True)
print("wrote public/brand/logo-mark.png", emblem.size)
