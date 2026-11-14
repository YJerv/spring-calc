#!/usr/bin/env python3
"""SC-007 Android and maskable icons drawn from the Concept A SVG."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BG = (0x20, 0x26, 0x30)
BLUE = (0x24, 0x57, 0xC5)
passed = 0
failed = 0


def check(cond, name, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print("  PASS  " + name)
    else:
        failed += 1
        print("  FAIL  " + name + (" — " + detail if detail else ""))


def png_size(path):
    with Image.open(path) as im:
        return im.size


def corner(path):
    with Image.open(path) as im:
        return im.convert("RGB").getpixel((0, 0))


def outside_safe_zone(path):
    with Image.open(path) as im:
        rgb = im.convert("RGB")
        w, h = rgb.size
        cx, cy = (w - 1) / 2, (h - 1) / 2
        limit = 0.33 * min(w, h) + 1.5
        bad = 0
        blue = 0
        for y in range(h):
            for x in range(w):
                px = rgb.getpixel((x, y))
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if dist > limit and px != BG:
                    bad += 1
                if dist <= limit and px == BLUE:
                    blue += 1
        return bad, blue


print("Launcher and store icons\n")
launchers = [
    ("android/app/src/main/res/mipmap-mdpi/ic_launcher.png", 48),
    ("android/app/src/main/res/mipmap-hdpi/ic_launcher.png", 72),
    ("android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", 96),
    ("android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", 144),
    ("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192),
    ("android/store_icon.png", 512),
]
for rel, size in launchers:
    path = ROOT / rel
    check(path.is_file() and png_size(path) == (size, size), rel + " is " + str(size) + " px")
    check(corner(path) == BG, rel + " is filled with #202630", str(corner(path)))

print("\nSplash images\n")
for rel, size in [
    ("android/app/src/main/res/drawable-mdpi/splash.png", 300),
    ("android/app/src/main/res/drawable-hdpi/splash.png", 450),
    ("android/app/src/main/res/drawable-xhdpi/splash.png", 600),
    ("android/app/src/main/res/drawable-xxhdpi/splash.png", 900),
    ("android/app/src/main/res/drawable-xxxhdpi/splash.png", 1200),
]:
    path = ROOT / rel
    check(path.is_file() and png_size(path) == (size, size), rel + " is " + str(size) + " px")
    check(corner(path) == BG, rel + " is filled with #202630")

print("\nMaskable safe zone\n")
maskables = [
    ("android/app/src/main/res/mipmap-mdpi/ic_maskable.png", 82),
    ("android/app/src/main/res/mipmap-hdpi/ic_maskable.png", 123),
    ("android/app/src/main/res/mipmap-xhdpi/ic_maskable.png", 164),
    ("android/app/src/main/res/mipmap-xxhdpi/ic_maskable.png", 246),
    ("android/app/src/main/res/mipmap-xxxhdpi/ic_maskable.png", 328),
    ("icons/icon-maskable-192.png", 192),
    ("icons/icon-maskable-512.png", 512),
]
for rel, size in maskables:
    path = ROOT / rel
    check(path.is_file() and png_size(path) == (size, size), rel + " is " + str(size) + " px")
    bad, blue = outside_safe_zone(path)
    check(bad == 0, rel + " stays #202630 outside the 66% safe zone", str(bad) + " pixels")
    check(blue > 0, rel + " still shows the blue spring inside the safe zone", str(blue))

feature = ROOT / "android/store/feature-graphic.png"
check(png_size(feature) == (1024, 500), "Feature graphic is 1024x500")
check(corner(feature) == BG, "Feature graphic background is #202630", str(corner(feature)))
check(not (ROOT / "android.keystore").exists(), "No signing key was created")
check(not list(ROOT.glob("*.keystore")) and not list((ROOT / "android").glob("*.keystore")),
      "No keystore file is in the tree")

print("\n" + str(passed) + " passed, " + str(failed) + " failed")
if failed:
    raise SystemExit(1)
print("All Android icon checks passed.")
