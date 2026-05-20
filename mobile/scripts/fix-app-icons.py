"""
Full-bleed иконки для iOS/Android: градиент на весь квадрат 1024×1024, лодка поверх.
Исходники со скруглением и чёрными/белыми полями не подходят — iOS сам скругляет углы.

Запускается автоматически при expo prebuild (плагин withFixAppIcons).
Вручную: npm run icons:fix  или  python scripts/fix-app-icons.py
"""
from __future__ import annotations

import statistics
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
TARGETS = [
    ASSETS / "icon.png",
    ASSETS / "icon-owner.png",
    ASSETS / "adaptive-icon.png",
    ASSETS / "adaptive-icon-owner.png",
]
SIZE = 1024
BLACK_THRESHOLD = 42
WHITE_THRESHOLD = 188


def content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    min_x, min_y = w, h
    max_x, max_y = 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            if r <= BLACK_THRESHOLD and g <= BLACK_THRESHOLD and b <= BLACK_THRESHOLD:
                continue
            found = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if not found:
        raise ValueError("no visible content")
    return min_x, min_y, max_x + 1, max_y + 1


def is_foreground(r: int, g: int, b: int, a: int) -> bool:
    if a < 40:
        return False
    return r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD


def sample_band_color(pixels, w: int, h: int, y0: int, y1: int) -> tuple[int, int, int]:
    rs, gs, bs = [], [], []
    for y in range(y0, y1):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if is_foreground(r, g, b, a):
                continue
            if r <= BLACK_THRESHOLD and g <= BLACK_THRESHOLD and b <= BLACK_THRESHOLD:
                continue
            rs.append(r)
            gs.append(g)
            bs.append(b)
    if not rs:
        return (30, 80, 150)
    return (
        int(statistics.median(rs)),
        int(statistics.median(gs)),
        int(statistics.median(bs)),
    )


def make_gradient(size: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        color = tuple(
            int(top[i] * (1 - t) + bottom[i] * t)
            for i in range(3)
        )
        draw.line([(0, y), (size, y)], fill=color)
    return img


def fix_icon(path: Path, size: int = SIZE) -> None:
    src = Image.open(path)
    box = content_bbox(src)
    cropped = src.crop(box).convert("RGBA")
    w, h = cropped.size
    px = cropped.load()

    top_color = sample_band_color(px, w, h, 0, max(1, h // 5))
    bottom_color = sample_band_color(px, w, h, max(0, h - h // 5), h)

    fg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    fg_px = fg.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_foreground(r, g, b, a):
                fg_px[x, y] = (255, 255, 255, a)

    scale = size / max(w, h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    fg_scaled = fg.resize((new_w, new_h), Image.Resampling.LANCZOS)

    bg = make_gradient(size, top_color, bottom_color)
    offset = ((size - new_w) // 2, (size - new_h) // 2)
    bg.paste(fg_scaled, offset, fg_scaled)
    bg.save(path, format="PNG", optimize=True)
    print(
        f"OK {path.relative_to(ROOT)} {size}x{size} "
        f"gradient {top_color}->{bottom_color}"
    )


def main() -> int:
    missing = [p for p in TARGETS if not p.is_file()]
    if missing:
        for p in missing:
            print(f"MISSING {p}", file=sys.stderr)
        return 1
    for p in TARGETS:
        fix_icon(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
