"""Build a clean transparent iPhone frame with a rounded screen hole."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\ku4en\.cursor\projects\c-Users-ku4en-Desktop-boatrent\assets"
    r"\c__Users_ku4en_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"582e4cde9b88446506dd271d250b0bb0_images_image-1cc446c8-2276-44c7-a16d-a5de2c435d0c.png"
)
OUT = ROOT / "src" / "assets" / "iphone-17-frame.png"
MASK_OUT = ROOT / "src" / "assets" / "iphone-17-silhouette.png"
META = ROOT / "src" / "assets" / "iphone-17-frame-meta.txt"


def flood_near_white(px, w, h, threshold=235):
    visited = [[False] * w for _ in range(h)]
    outer = [[False] * w for _ in range(h)]
    q = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    for x, y in q:
        visited[y][x] = True
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        if r >= threshold and g >= threshold and b >= threshold:
            outer[y][x] = True
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                    visited[ny][nx] = True
                    nr, ng, nb, _ = px[nx, ny]
                    if nr >= threshold and ng >= threshold and nb >= threshold:
                        q.append((nx, ny))
    return outer


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    px = src.load()
    print("source", w, h)

    outer = flood_near_white(px, w, h, 235)

    # Bright screen body
    seeds = [(w // 2, 200), (w // 2, 320), (w // 2 - 90, 320), (w // 2 + 90, 320)]
    screen = [[False] * w for _ in range(h)]
    visited_s = [[False] * w for _ in range(h)]
    sq = deque()
    for sx, sy in seeds:
        visited_s[sy][sx] = True
        sq.append((sx, sy))
    while sq:
        x, y = sq.popleft()
        r, g, b, _ = px[x, y]
        if r > 210 and g > 210 and b > 210 and not outer[y][x]:
            screen[y][x] = True
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited_s[ny][nx]:
                    visited_s[ny][nx] = True
                    nr, ng, nb, _ = px[nx, ny]
                    if nr > 210 and ng > 210 and nb > 210 and not outer[ny][nx]:
                        sq.append((nx, ny))

    xs = [x for y in range(h) for x in range(w) if screen[y][x]]
    ys = [y for y in range(h) for x in range(w) if screen[y][x]]
    left, top, right, bottom = min(xs), min(ys), max(xs), max(ys)
    print("bright screen", left, top, right, bottom)

    # Pull hole inward so rounded corners stay under black bezel
    inset_x = 6
    inset_y = 6
    hole_box = (left + inset_x, top + inset_y, right - inset_x, bottom - inset_y)
    radius = int((hole_box[2] - hole_box[0]) * 0.145)

    hole_mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(hole_mask).rounded_rectangle(hole_box, radius=radius, fill=255)

    # Keep Dynamic Island
    iw = int((right - left) * 0.33)
    ih = max(15, int((bottom - top) * 0.019))
    ix0 = w // 2 - iw // 2
    iy0 = top + int((bottom - top) * 0.02)
    island = Image.new("L", (w, h), 0)
    ImageDraw.Draw(island).rounded_rectangle((ix0, iy0, ix0 + iw, iy0 + ih), radius=ih // 2, fill=255)
    island = island.filter(ImageFilter.MaxFilter(5))
    hole_px = hole_mask.load()
    island_px = island.load()
    for y in range(h):
        for x in range(w):
            if island_px[x, y] > 0:
                hole_px[x, y] = 0

    # Phone silhouette = everything not outer white
    sil = Image.new("L", (w, h), 0)
    spx = sil.load()
    for y in range(h):
        for x in range(w):
            if not outer[y][x]:
                spx[x, y] = 255
    # Slight erode then dilate to clean fringe, keep smooth edge
    sil = sil.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))

    out = src.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = opx[x, y]
            if outer[y][x] or hole_px[x, y] > 0:
                opx[x, y] = (r, g, b, 0)
            else:
                # multiply by silhouette for clean edge
                opx[x, y] = (r, g, b, min(a, spx[x, y] if False else a))

    # Apply silhouette alpha to kill any leftover outside
    ra, ga, ba, aa = out.split()
    aa = ImageChops_multiply(aa, sil)
    out = Image.merge("RGBA", (ra, ga, ba, aa))

    bbox = out.getbbox()
    l, t, r, b = bbox
    l = max(0, l - 1)
    t = max(0, t - 1)
    r = min(w, r + 1)
    b = min(h, b + 1)
    cropped = out.crop((l, t, r, b))
    sil_c = sil.crop((l, t, r, b))
    cropped.save(OUT)
    sil_c.save(MASK_OUT)
    print("saved", OUT, cropped.size)

    cw, ch = cropped.size
    hl, ht, hr, hb = hole_box
    hl -= l
    ht -= t
    hr -= l
    hb -= t
    meta = {
        "left": hl / cw,
        "top": ht / ch,
        "width": (hr - hl) / cw,
        "height": (hb - ht) / ch,
        "radius_x": radius / (hr - hl),
        "radius_y": radius / (hb - ht),
        "aspect": f"{cw} / {ch}",
    }
    META.write_text("\n".join(f"{k}={v}" for k, v in meta.items()), encoding="utf-8")
    print(meta)


def ImageChops_multiply(a: Image.Image, b: Image.Image) -> Image.Image:
    from PIL import ImageChops

    return ImageChops.multiply(a, b)


if __name__ == "__main__":
    main()
