#!/usr/bin/env python3
"""Build Android launcher, splash, store and feature-graphic images.

Reads the PWA icon already in this repo. Prefers icons/icon.svg via
rsvg-convert so each density stays sharp. Falls back to resizing
icons/icon-512.png with Pillow.

Usage, from anywhere:

    python3 android/scripts/generate-icons.py

Install, if the commands are missing:

    sudo apt-get install -y librsvg2-bin python3-pil
    # or: pip install pillow
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ANDROID = ROOT / "android"
SVG = ROOT / "icons" / "icon.svg"
PNG = ROOT / "icons" / "icon-512.png"
# Concept A background. The spring must sit inside the adaptive-icon safe zone.
BG = (0x20, 0x26, 0x30, 255)
CREAM = (220, 226, 234, 255)
GOLD = (36, 87, 197, 255)
GOLD_SOFT = (220, 226, 234, 255)
SAFE = 0.66

# Same destinations and pixel sizes as Bubblewrap's TwaGenerator.
LAUNCHER = [
    ("app/src/main/res/mipmap-mdpi/ic_launcher.png", 48),
    ("app/src/main/res/mipmap-hdpi/ic_launcher.png", 72),
    ("app/src/main/res/mipmap-xhdpi/ic_launcher.png", 96),
    ("app/src/main/res/mipmap-xxhdpi/ic_launcher.png", 144),
    ("app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192),
    ("store_icon.png", 512),
]
MASKABLE = [
    ("app/src/main/res/mipmap-mdpi/ic_maskable.png", 82),
    ("app/src/main/res/mipmap-hdpi/ic_maskable.png", 123),
    ("app/src/main/res/mipmap-xhdpi/ic_maskable.png", 164),
    ("app/src/main/res/mipmap-xxhdpi/ic_maskable.png", 246),
    ("app/src/main/res/mipmap-xxxhdpi/ic_maskable.png", 328),
]
SPLASH = [
    ("app/src/main/res/drawable-mdpi/splash.png", 300),
    ("app/src/main/res/drawable-hdpi/splash.png", 450),
    ("app/src/main/res/drawable-xhdpi/splash.png", 600),
    ("app/src/main/res/drawable-xxhdpi/splash.png", 900),
    ("app/src/main/res/drawable-xxxhdpi/splash.png", 1200),
]


def require_pillow():
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        sys.exit(
            "Pillow is not installed. Install it with:\n"
            "  sudo apt-get install -y python3-pil\n"
            "  # or: pip install pillow"
        )
    return Image, ImageDraw, ImageFont


def render_svg(size: int, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        [
            "rsvg-convert",
            "--width",
            str(size),
            "--height",
            str(size),
            "--output",
            str(dest),
            str(SVG),
        ]
    )


def render_png(size: int, dest: Path, master) -> None:
    Image, _, _ = require_pillow()
    dest.parent.mkdir(parents=True, exist_ok=True)
    image = master.resize((size, size), Image.Resampling.LANCZOS)
    image.save(dest, format="PNG")


def flatten(path: Path) -> None:
    """Play and some launchers dislike a transparent margin. Fill any
    leftover alpha with the Concept A background."""
    Image, _, _ = require_pillow()
    image = Image.open(path).convert("RGBA")
    base = Image.new("RGBA", image.size, BG)
    base.alpha_composite(image)
    base.convert("RGB").save(path, format="PNG")


def write_maskable(size: int, dest: Path) -> None:
    """Scale the SVG to the 66% safe zone and fill the rest with #202630."""
    Image, _, _ = require_pillow()
    dest.parent.mkdir(parents=True, exist_ok=True)
    inner = max(1, int(round(size * SAFE)))
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "raw.png"
        render_svg(inner, raw)
        art = Image.open(raw).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), BG)
    offset = (size - inner) // 2
    canvas.alpha_composite(art, (offset, offset))
    canvas.convert("RGB").save(dest, format="PNG")


def write_feature_graphic(icon_path: Path) -> None:
    Image, ImageDraw, ImageFont = require_pillow()
    width, height = 1024, 500
    canvas = Image.new("RGB", (width, height), BG[:3])
    draw = ImageDraw.Draw(canvas)
    icon = Image.open(icon_path).convert("RGBA")
    icon = icon.resize((300, 300), Image.Resampling.LANCZOS)
    canvas.paste(icon, (64, 100), icon)

    def font(path: str, size: int):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            return ImageFont.load_default()

    regular = "/usr/share/fonts/truetype/macos/Inter-Regular.ttf"
    medium = "/usr/share/fonts/truetype/macos/Inter-Medium.ttf"
    bold = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
    dejavu = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    dejavu_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    title_font = font(bold, 42) if Path(bold).exists() else font(dejavu_bold, 36)
    sub_font = font(medium, 24) if Path(medium).exists() else font(dejavu, 22)
    body_font = font(regular, 22) if Path(regular).exists() else font(dejavu, 20)

    x = 412
    # Two lines so the name stays inside the 1024×500 frame.
    draw.text((x, 145), "Helical Spring", font=title_font, fill=CREAM[:3])
    draw.text((x, 198), "Designer", font=title_font, fill=CREAM[:3])
    draw.rectangle((x, 268, x + 180, 272), fill=GOLD[:3])
    draw.text((x, 296), "BS EN 13906-1  ·  BS EN 15800", font=sub_font, fill=GOLD_SOFT[:3])
    draw.text((x, 340), "Metric compression springs", font=body_font, fill=CREAM[:3])

    out = ANDROID / "store" / "feature-graphic.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, format="PNG")
    print(f"wrote {out.relative_to(ROOT)}")


def main() -> None:
    use_svg = shutil.which("rsvg-convert") and SVG.is_file()
    master = None
    if not use_svg:
        if not PNG.is_file():
            sys.exit(f"No icon source found. Expected {SVG} or {PNG}")
        Image, _, _ = require_pillow()
        master = Image.open(PNG).convert("RGBA")
        print(f"rsvg-convert not found; resizing {PNG.relative_to(ROOT)}")
    else:
        print(f"rendering {SVG.relative_to(ROOT)} with rsvg-convert")

    for rel, size in LAUNCHER + SPLASH:
        dest = ANDROID / rel
        if use_svg:
            render_svg(size, dest)
        else:
            render_png(size, dest, master)
        flatten(dest)
        print(f"wrote {dest.relative_to(ROOT)} ({size}px)")

    if not use_svg:
        sys.exit("rsvg-convert is required so maskable icons are drawn from the SVG.")
    for rel, size in MASKABLE:
        write_maskable(size, ANDROID / rel)
        print(f"wrote {(ANDROID / rel).relative_to(ROOT)} ({size}px, 66% safe zone)")
    for name, size in (
        ("icon-maskable-512.png", 512),
        ("icon-maskable-192.png", 192),
    ):
        dest = ROOT / "icons" / name
        write_maskable(size, dest)
        print(f"wrote {dest.relative_to(ROOT)} ({size}px, 66% safe zone)")

    with tempfile.TemporaryDirectory() as tmp:
        icon512 = Path(tmp) / "icon-512.png"
        if use_svg:
            render_svg(512, icon512)
        else:
            render_png(512, icon512, master)
        flatten(icon512)
        write_feature_graphic(icon512)


if __name__ == "__main__":
    main()
