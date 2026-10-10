"""Paint app screens into the original iPhone photo, then clear outer background."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"
SRC_FRAME = Path(
    r"C:\Users\ku4en\.cursor\projects\c-Users-ku4en-Desktop-boatrent\assets"
    r"\c__Users_ku4en_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"582e4cde9b88446506dd271d250b0bb0_images_image-1cc446c8-2276-44c7-a16d-a5de2c435d0c.png"
)
LIST_SRC = ASSETS / "app-screen-list.png"
MAP_SRC = ASSETS / "app-screen-map.jpg"


def is_gray(r: int, g: int, b: int) -> bool:
    avg = (r + g + b) / 3
    return abs(r - g) < 14 and abs(g - b) < 14 and 120 <= avg <= 185


def flood_outer_white(px, w, h, threshold=235):
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


def detect_screen(px, w, h, outer):
    seeds = [(w // 2, 200), (w // 2, 320), (w // 2 - 80, 300), (w // 2 + 80, 300)]
    screen = [[False] * w for _ in range(h)]
    visited = [[False] * w for _ in range(h)]
    q = deque()
    for sx, sy in seeds:
        visited[sy][sx] = True
        q.append((sx, sy))
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        if r > 205 and g > 205 and b > 205 and not outer[y][x]:
            screen[y][x] = True
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                    visited[ny][nx] = True
                    nr, ng, nb, _ = px[nx, ny]
                    if nr > 205 and ng > 205 and nb > 205 and not outer[ny][nx]:
                        q.append((nx, ny))
    xs = [x for y in range(h) for x in range(w) if screen[y][x]]
    ys = [y for y in range(h) for x in range(w) if screen[y][x]]
    return min(xs), min(ys), max(xs), max(ys), screen


def prepare_map(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGB")
    w, h = src.size
    px = src.load()
    top = next(y for y in range(h) if not is_gray(*px[w // 2, y]))
    bottom = next(y for y in range(h - 1, -1, -1) if not is_gray(*px[w // 2, y]))
    top = max(0, top - 4)
    im = src.crop((0, top, w, bottom + 1)).convert("RGBA")
    mw, mh = im.size
    mpx = im.load()
    for y in range(mh):
        for x in range(mw):
            r, g, b, a = mpx[x, y]
            if not is_gray(r, g, b):
                continue
            cx, cy = mw // 2, mh // 2
            dx = 1 if x < cx else -1
            dy = 1 if y < cy else -1
            xx, yy = x, y
            for _ in range(120):
                xx += dx
                yy += dy
                if not (0 <= xx < mw and 0 <= yy < mh):
                    break
                rr, gg, bb, aa = mpx[xx, yy]
                if not is_gray(rr, gg, bb):
                    mpx[x, y] = (rr, gg, bb, 255)
                    break
    # Crop remaining white side gutters from the map UI card
    w, h = im.size
    px = im.load()

    def mostly_white_col(x: int) -> bool:
        white = 0
        step = max(1, h // 80)
        total = 0
        for y in range(0, h, step):
            total += 1
            r, g, b, _ = px[x, y]
            if r > 245 and g > 245 and b > 245:
                white += 1
        return white / max(1, total) > 0.72

    left = 0
    while left < w // 3 and mostly_white_col(left):
        left += 1
    right = w - 1
    while right > w * 2 // 3 and mostly_white_col(right):
        right -= 1
    im = im.crop((max(0, left - 1), 0, min(w, right + 2), h))

    # Steal status-bar strip from list screenshot so map sits under Dynamic Island cleanly
    list_im = Image.open(LIST_SRC).convert("RGBA")
    bar_h = 48
    bar = list_im.crop((0, 0, list_im.width, bar_h)).resize((im.width, bar_h), Image.Resampling.LANCZOS)
    padded = Image.new("RGBA", (im.width, im.height + bar_h), (255, 255, 255, 255))
    padded.paste(bar, (0, 0))
    padded.paste(im, (0, bar_h))
    padded.convert("RGB").save(ASSETS / "app-screen-map.jpg", quality=95)
    return padded


def fit_cover(screen: Image.Image, tw: int, th: int) -> Image.Image:
    sw, sh = screen.size
    scale = max(tw / sw, th / sh) * 1.02
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    screen = screen.resize((nw, nh), Image.Resampling.LANCZOS)
    lx = max(0, (nw - tw) // 2)
    ty = 0
    screen = screen.crop((lx, ty, lx + tw, ty + th))
    if screen.size != (tw, th):
        screen = screen.resize((tw, th), Image.Resampling.LANCZOS)
    return screen.convert("RGBA")


def build_one(base: Image.Image, outer, screen_mask, box, screen: Image.Image, out: Path):
    w, h = base.size
    L, T, R, B = box
    tw, th = R - L + 1, B - T + 1
    fitted = fit_cover(screen, tw, th)

    # Soft rounded mask slightly inside screen bbox so corners stay under bezel
    radius = int(tw * 0.165)
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle((2, 2, tw - 3, th - 3), radius=radius, fill=255)

    # Paint the whole rounded screen area; keep only Dynamic Island hardware pixels
    canvas = base.copy()
    cpx = canvas.load()
    spx = fitted.load()
    mpx = mask.load()
    island_y1 = T + int(th * 0.012)
    island_y2 = T + int(th * 0.045)
    island_x1 = L + int(tw * 0.33)
    island_x2 = L + int(tw * 0.67)
    for y in range(th):
        for x in range(tw):
            if mpx[x, y] < 128:
                continue
            gx, gy = L + x, T + y
            br, bg, bb, ba = cpx[gx, gy]
            in_island_zone = island_x1 <= gx <= island_x2 and island_y1 <= gy <= island_y2
            if in_island_zone and br < 40 and bg < 40 and bb < 40:
                continue
            sr, sg, sb, sa = spx[x, y]
            cpx[gx, gy] = (sr, sg, sb, 255)

    # Clear outer background
    for y in range(h):
        for x in range(w):
            if outer[y][x]:
                r, g, b, a = cpx[x, y]
                cpx[x, y] = (r, g, b, 0)

    # Clear top-right speckles
    for y in range(0, 24):
        for x in range(w - 16, w):
            r, g, b, a = cpx[x, y]
            cpx[x, y] = (r, g, b, 0)

    bb = canvas.getbbox()
    canvas.crop(bb).save(out, optimize=True)
    print("wrote", out.name, canvas.crop(bb).size)


def main():
    base = Image.open(SRC_FRAME).convert("RGBA")
    w, h = base.size
    px = base.load()
    outer = flood_outer_white(px, w, h)
    L, T, R, B, screen_mask = detect_screen(px, w, h, outer)
    print("screen box", L, T, R, B)

    list_screen = Image.open(LIST_SRC).convert("RGBA")
    map_screen = prepare_map(MAP_SRC)

    build_one(base, outer, screen_mask, (L, T, R, B), list_screen, ASSETS / "app-phone-list.png")
    build_one(base, outer, screen_mask, (L, T, R, B), map_screen, ASSETS / "app-phone-map.png")


if __name__ == "__main__":
    main()
