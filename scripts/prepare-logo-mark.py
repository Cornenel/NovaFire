"""Flood-fill remove exterior black plate; keep interior black (extinguisher)."""
from PIL import Image
from collections import deque

src = Image.open(r"public/brand/logo-mark.png").convert("RGBA")
w, h = src.size
px = src.load()

visited = [[False] * w for _ in range(h)]
q = deque()

def is_bg(x, y):
    r, g, b, a = px[x, y]
    return a < 20 or r + g + b <= 35

for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2)]:
    if is_bg(x, y):
        q.append((x, y))
        visited[y][x] = True

while q:
    x, y = q.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_bg(nx, ny):
            visited[ny][nx] = True
            q.append((nx, ny))

out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
op = out.load()
for y in range(h):
    for x in range(w):
        if visited[y][x]:
            op[x, y] = (0, 0, 0, 0)
        else:
            op[x, y] = px[x, y]

# Trim transparent padding
bbox = out.getbbox()
if bbox:
    out = out.crop(bbox)

# Normalize to ~512 max side
ow, oh = out.size
scale = 512 / max(ow, oh)
out = out.resize((max(1, int(ow * scale)), max(1, int(oh * scale))), Image.Resampling.LANCZOS)
out.save(r"public/brand/logo-mark.png", optimize=True)
print("wrote transparent mark", out.size, "bbox was", bbox)
