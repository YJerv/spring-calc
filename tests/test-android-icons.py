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

print("\nAdaptive foreground, round and monochrome\n")
foreground = [
    ("android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png", 108),
    ("android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png", 162),
    ("android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png", 216),
    ("android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png", 324),
    ("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png", 432),
]
for rel, size in foreground:
    path = ROOT / rel
    check(path.is_file() and png_size(path) == (size, size), rel + " is " + str(size) + " px")
    with Image.open(path) as im:
        check(im.mode == "RGBA" and im.getpixel((0, 0))[3] == 0, rel + " background is transparent")
        blues = 0
        rgb = im.convert("RGBA")
        for y in range(0, size, max(1, size // 24)):
            for x in range(0, size, max(1, size // 24)):
                px = rgb.getpixel((x, y))
                if px[3] > 200 and px[:3] == BLUE:
                    blues += 1
        check(blues > 0, rel + " keeps the blue spring")
for rel, size in [
    ("android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", 48),
    ("android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", 72),
    ("android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", 96),
    ("android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", 144),
    ("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", 192),
]:
    path = ROOT / rel
    check(path.is_file() and png_size(path) == (size, size), rel + " is " + str(size) + " px")
    with Image.open(path) as im:
        check(im.convert("RGBA").getpixel((0, 0))[3] == 0, rel + " is cropped to a circle")
        check(im.convert("RGB").getpixel((size // 2, size // 5)) == BG, rel + " keeps the #202630 field")
for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    text = (ROOT / "android/app/src/main/res/mipmap-anydpi-v26" / name).read_text(encoding="utf-8")
    check("@color/icon_background" in text and "@mipmap/ic_launcher_foreground" in text and "@drawable/ic_launcher_monochrome" in text,
          name + " has background, foreground and monochrome")
mono = (ROOT / "android/app/src/main/res/drawable/ic_launcher_monochrome.xml").read_text(encoding="utf-8")
check("ic_launcher_monochrome" not in "" and "#FFFFFF" in mono, "Monochrome spring is a single white colour")
manifest = (ROOT / "android/app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
check('android:roundIcon="@mipmap/ic_launcher_round"' in manifest, "The manifest names the round icon")
gradle = (ROOT / "android/app/build.gradle").read_text(encoding="utf-8")
check("https://yjerv.github.io/spring-calc/" in gradle and "uk.co.yjerv.springcalc" in gradle,
      "The debug project points at the live site with the existing package name")
check('versionCode 3' in gradle and 'versionName "1.4.1"' in gradle,
      "The wrapper is versionCode 3, versionName 1.4.1")
twa = (ROOT / "android/twa-manifest.json").read_text(encoding="utf-8")
check('"appVersion": "1.4.1"' in twa and '"appVersionCode": 3' in twa,
      "twa-manifest.json matches versionCode 3 and versionName 1.4.1")

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
