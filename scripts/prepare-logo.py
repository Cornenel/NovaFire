"""Crop a clean shield emblem from the Nova Fire logo lockup."""
from PIL import Image

src = Image.open(r"public/brand/logo.png").convert("RGB")
w, h = src.size

# Shield lives in the upper portion of the lockup (above the wordmark).
# Empirically ~ top 62% contains the shield with padding.
shield = src.crop((0, 0, w, int(h * 0.58)))
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
pad = 28
left = max(0, left - pad)
top = max(0, top - pad)
right = min(sw - 1, right + pad)
bottom = min(sh - 1, bottom + pad)
emblem = shield.crop((left, top, right + 1, bottom + 1))

# Upscale for crisp retina display
ew, eh = emblem.size
target = 512
scale = target / max(ew, eh)
emblem = emblem.resize((max(1, int(ew * scale)), max(1, int(eh * scale))), Image.Resampling.LANCZOS)
emblem.save(r"public/brand/logo-mark.png", optimize=True)
print("wrote public/brand/logo-mark.png", emblem.size)

# Also write a fuller lockup cropped tightly (keep original colors; no pixel hacks)
full = src.crop((56, 74, 611, 881))
fw, fh = full.size
scale = 720 / fh
full = full.resize((max(1, int(fw * scale)), 720), Image.Resampling.LANCZOS)
full.save(r"public/brand/logo-lockup.png", optimize=True)
print("wrote public/brand/logo-lockup.png", full.size)
