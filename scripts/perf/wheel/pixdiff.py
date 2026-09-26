#!/usr/bin/env python3
"""Compare two folders of PNGs (same names): pixels that differ, the largest
channel difference, and where. python3 scripts/perf/wheel/pixdiff.py A B [heatdir]"""
import os
import sys

from PIL import Image, ImageChops

a_dir, b_dir = sys.argv[1], sys.argv[2]
heat = sys.argv[3] if len(sys.argv) > 3 else None
if heat:
    os.makedirs(heat, exist_ok=True)
worst = 0
for name in sorted(os.listdir(a_dir)):
    if not name.endswith(".png"):
        continue
    pb = os.path.join(b_dir, name)
    if not os.path.exists(pb):
        print(f"{name}: missing in {b_dir}")
        continue
    a = Image.open(os.path.join(a_dir, name)).convert("RGBA")
    b = Image.open(pb).convert("RGBA")
    if a.size != b.size:
        print(f"{name}: size {a.size} vs {b.size}")
        worst = max(worst, 255)
        continue
    d = ImageChops.difference(a, b)
    px = d.get_flattened_data() if hasattr(d, "get_flattened_data") else d.getdata()
    n = 0
    mx = 0
    for p in px:
        m = max(p)
        if m:
            n += 1
            if m > mx:
                mx = m
    worst = max(worst, mx)
    box = d.convert("RGB").getbbox()
    print(f"{name}: {n} px differ, max {mx}, box {box}")
    if heat and n:
        d.convert("L").point(lambda v: 255 if v else 0).save(os.path.join(heat, name))
print(f"worst channel difference: {worst}")
