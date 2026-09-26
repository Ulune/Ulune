#!/usr/bin/env python3
"""
Build scripts/fixtures/tz-zoneinfo.json: what Python's zoneinfo says about
random instants and wall-clock times in every zone, read from a system tz
database of the same release as src/lib/chart/tzdb-data.json *with* its
backzone history (Debian/Ubuntu tzdata). scripts/civil-time.test.mjs holds the
app's own tz code to it: offsets, summer time, abbreviations, and which
instant(s) a wall time stands for — the skipped and repeated hours included.

  python3 scripts/build-tz-fixture.py
"""
import json
import os
import random
import re
import struct
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "scripts", "fixtures", "tz-zoneinfo.json")
DATA = json.load(open(os.path.join(ROOT, "src", "lib", "chart", "tzdb-data.json"), encoding="utf-8"))
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)

system = open("/usr/share/zoneinfo/tzdata.zi", encoding="utf-8").read()
version = re.search(r"^# version (\S+)", system, re.M).group(1)
if version != DATA["version"] or "backzone" not in re.search(r"^# ddeps (.*)$", system, re.M).group(1):
    raise SystemExit(f"system tzdata {version} does not match the app's {DATA['version']} with backzone")


def transitions(zone):
    raw = open(f"/usr/share/zoneinfo/{zone}", "rb").read()
    hdr = lambda o: struct.unpack(">6l", raw[o + 20 : o + 44])
    isutc, isstd, leap, n, typecnt, charcnt = hdr(0)
    o = 44 + n * 5 + typecnt * 6 + charcnt + leap * 8 + isstd + isutc
    _, _, _, n, _, _ = hdr(o)
    return list(struct.unpack(f">{n}q", raw[o + 44 : o + 44 + n * 8]))


def wall_case(zi, zone, local):
    readings = []
    for fold in (0, 1):
        aware = local.replace(tzinfo=zi, fold=fold)
        u = aware.timestamp()
        back = datetime.fromtimestamp(u, zi).replace(tzinfo=None)
        readings.append((u, back == local))
    if readings[0][1] and readings[1][1] and readings[0][0] != readings[1][0]:
        kind = "ambiguous"
    elif not readings[0][1]:
        kind = "nonexistent"
    else:
        kind = "normal"
    w = [local.year, local.month, local.day, local.hour, local.minute, local.second]
    return [zone, w, kind, readings[0][0], readings[1][0]]


def main():
    rng = random.Random(20260924)
    zones = sorted(DATA["zones"])
    lo = int((datetime(1800, 1, 1, tzinfo=timezone.utc) - EPOCH).total_seconds())
    hi = int((datetime(2100, 1, 1, tzinfo=timezone.utc) - EPOCH).total_seconds())
    inst = []
    for _ in range(1500):
        zone = rng.choice(zones)
        t = rng.randint(lo, hi)
        dt = (EPOCH + timedelta(seconds=t)).astimezone(ZoneInfo(zone))
        inst.append([zone, t, int(dt.utcoffset().total_seconds()), 1 if dt.dst() else 0, dt.tzname()])
    wall = []
    for _ in range(600):
        zone = rng.choice(zones)
        t = rng.randint(lo, hi)
        local = (EPOCH + timedelta(seconds=t)).astimezone(ZoneInfo(zone)).replace(tzinfo=None)
        wall.append(wall_case(ZoneInfo(zone), zone, local))
    # Wall times inside and at the edges of real skipped / repeated hours.
    for _ in range(900):
        zone = rng.choice(zones)
        ts = [t for t in transitions(zone) if -5e9 < t < 4.1e9]
        if not ts:
            continue
        T = rng.choice(ts)
        zi = ZoneInfo(zone)
        before = (EPOCH + timedelta(seconds=T - 1)).astimezone(zi).utcoffset().total_seconds()
        after = (EPOCH + timedelta(seconds=T)).astimezone(zi).utcoffset().total_seconds()
        if before == after:
            continue
        a, b = sorted((T + before, T + after))
        L = rng.choice([a - 1, a, (a + b) // 2, b - 1, b])
        wall.append(wall_case(zi, zone, (EPOCH + timedelta(seconds=L)).replace(tzinfo=None)))
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"tzdb": version, "instants": inst, "walls": wall}, fh, separators=(",", ":"))
        fh.write("\n")
    kinds = {k: sum(1 for w in wall if w[2] == k) for k in ("normal", "ambiguous", "nonexistent")}
    print(f"tzdb {version}: {len(inst)} instants, {len(wall)} wall times {kinds} → {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()
