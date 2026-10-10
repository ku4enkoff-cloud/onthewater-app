"""Composite app screens into the transparent iPhone frame."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"
FRAME = ASSETS / "iphone-17-frame.png"
SILHOUETTE = ASSETS / "iphone-17-silhouette.png"
META = ASSETS / "iphone-17-frame-meta.txt"

SCREENS = [
    (ASSETS / "app-screen-list.png", ASSETS / "app-phone-list.png"),
    (ASSETS / "app-screen-map.jpg", ASSETS / "app-phone-map.png"),
]


def read_meta() -> dict[str, float | str]:
    data: dict[str, float | str] = {}
    for line in META.read_text(encoding="utf-8").splitlines():
        k, v = line.split("=", 1)
        data[k] = v if k == "aspect" else float(v)
    return data


def compose(screen_path: Path, out_path: Path, meta: dict[str, float | str]) -> None:
    frame = Image.open(FRAME).convert("RGBA")
    sil = Image.open(SILHOUETTE).convert("L")
    fw, fh = frame.size

    left = float(meta["left"]) * fw
    top = float(meta["top"]) * fh
    width = float(meta["width"]) * fw
    height = float(meta["height"]) * fh
    radius = float(meta["radius_x"]) * width

    screen = Image.open(screen_path).convert("RGBA")
    target = (max(1, int(round(width))), max(1, int(round(height))))
    sw, sh = screen.size
    scale = max(target[0] / sw, target[1] / sh)
    nw, nh = max(target[0], int(round(sw * scale))), max(target[1], int(round(sh * scale)))
    screen = screen.resize((nw, nh), Image.Resampling.LANCZOS)
    left_crop = max(0, (nw - target[0]) // 2)
    top_crop = 0
    screen = screen.crop((left_crop, top_crop, left_crop + target[0], top_crop + target[1]))
    if screen.size != target:
        screen = screen.resize(target, Image.Resampling.LANCZOS)

    mask = Image.new("L", target, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, target[0] - 1, target[1] - 1), radius=int(radius), fill=255)

    canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    canvas.paste(screen, (int(round(left)), int(round(top))), mask)
    canvas.alpha_composite(frame)

    # Clip everything to phone silhouette so corners never stick out
    r, g, b, a = canvas.split()
    a = ImageChops.multiply(a, sil.resize(canvas.size, Image.Resampling.NEAREST))
    canvas = Image.merge("RGBA", (r, g, b, a))
    canvas.save(out_path, optimize=True)
    print("wrote", out_path.name, canvas.size, "bbox", canvas.getbbox())


def main() -> None:
    meta = read_meta()
    for src, dst in SCREENS:
        compose(src, dst, meta)


if __name__ == "__main__":
    main()
