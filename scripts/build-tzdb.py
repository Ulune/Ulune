#!/usr/bin/env python3
"""
Build src/lib/chart/tzdb-data.json: every time zone's full history from the
IANA tz database *with* its pre-1970 "backzone" data, for the birth-time
conversion (src/lib/chart/civil-time.server.ts).

Why not the runtime's own Intl/ICU zones: ICU ships tzdb without backzone,
where zones that agree since 1970 are merged — Europe/Oslo is Europe/Berlin,
Europe/Amsterdam is Europe/Brussels, Atlantic/Reykjavik is Africa/Abidjan,
America/Nassau is America/Toronto — so births before 1970 in those countries
come out up to an hour wrong (Oslo, summer 1962; Stockholm 1946; Nassau 1950).

Input is a zic source that already folds backzone in for the zones of
zone.tab (make PACKRATDATA=backzone PACKRATLIST=zone.tab tzdata.zi); Debian /
Ubuntu ship exactly that as /usr/share/zoneinfo/tzdata.zi ("# ddeps backzone
zone.tab"). Compiled with zic, every zone's TZif is read back.

  python3 scripts/build-tzdb.py [/usr/share/zoneinfo/tzdata.zi]

Output per zone: its local-time types [offset seconds, is DST, abbreviation],
the UTC instants of its transitions (delta-encoded, base 36) with the type
each one starts, the POSIX TZ rule that carries on after the last one, and
when its initial Local Mean Time ended (from the source's first Zone line —
the compiled data merges it with a legal mean time of the same offset).
"""
import json
import os
import re
import struct
import subprocess
import sys
import tempfile

SRC = sys.argv[1] if len(sys.argv) > 1 else "/usr/share/zoneinfo/tzdata.zi"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "chart", "tzdb-data.json")


def b36(n: int) -> str:
    if n == 0:
        return "0"
    neg = n < 0
    n = abs(n)
    digits = ""
    while n:
        n, r = divmod(n, 36)
        digits = "0123456789abcdefghijklmnopqrstuvwxyz"[r] + digits
    return ("-" if neg else "") + digits


def read_tzif(path: str):
    data = open(path, "rb").read()
    if data[:4] != b"TZif":
        raise ValueError(f"{path}: not TZif")
    version = data[4:5]

    def header(off):
        return struct.unpack(">6l", data[off + 20 : off + 44])

    isutc, isstd, leap, timecnt, typecnt, charcnt = header(0)
    if version < b"2":
        raise ValueError(f"{path}: TZif v1 only")
    # Skip the v1 (32-bit) block to the v2 header.
    v1 = 44 + timecnt * 4 + timecnt + typecnt * 6 + charcnt + leap * 8 + isstd + isutc
    isutc, isstd, leap, timecnt, typecnt, charcnt = header(v1)
    p = v1 + 44
    times = list(struct.unpack(f">{timecnt}q", data[p : p + timecnt * 8]))
    p += timecnt * 8
    idx = list(data[p : p + timecnt])
    p += timecnt
    types = []
    for _ in range(typecnt):
        utoff, isdst, abbrind = struct.unpack(">lBB", data[p : p + 6])
        types.append((utoff, isdst, abbrind))
        p += 6
    chars = data[p : p + charcnt]
    p += charcnt + leap * 12 + isstd + isutc
    footer = data[p:].strip(b"\n").decode()

    def abbr(i):
        end = chars.index(b"\0", i)
        return chars[i:end].decode()

    return times, idx, [(u, d, abbr(a)) for (u, d, a) in types], footer

MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
          "september", "october", "november", "december"]
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def days_from_civil(y, m, d):
    y -= m <= 2
    era = (y if y >= 0 else y - 399) // 400
    yoe = y - era * 400
    doy = (153 * (m + (-3 if m > 2 else 9)) + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def hms(text):
    """[-]h[:mm[:ss]] → seconds."""
    neg = text.startswith("-")
    parts = [int(x) for x in text.lstrip("-").split(":")] + [0, 0]
    v = parts[0] * 3600 + parts[1] * 60 + parts[2]
    return -v if neg else v


def pick(prefix, names):
    hits = [i for i, n in enumerate(names) if n.startswith(prefix.lower())]
    if len(hits) != 1:
        raise ValueError(f"ambiguous or unknown name {prefix!r}")
    return hits[0]


def until_utc(tokens, stdoff):
    """UTC seconds of a Zone line's UNTIL (year [month [day [time]]]), read in that line's own time."""
    year = int(tokens[0])
    month = pick(tokens[1], MONTHS) + 1 if len(tokens) > 1 else 1
    day_spec = tokens[2] if len(tokens) > 2 else "1"
    time_spec = tokens[3] if len(tokens) > 3 else "0"
    first = days_from_civil(year, month, 1)
    length = days_from_civil(year + (month == 12), month % 12 + 1, 1) - first
    if day_spec.isdigit():
        day = first + int(day_spec) - 1
    elif day_spec.startswith("last"):
        wd = pick(day_spec[4:], WEEKDAYS)
        day = first + length - 1
        while (day + 3) % 7 != wd:  # 1970-01-01 was a Thursday (index 3 from Monday)
            day -= 1
    else:
        op = ">=" if ">=" in day_spec else "<="
        name, num = day_spec.split(op)
        wd = pick(name, WEEKDAYS)
        day = first + int(num) - 1
        step = 1 if op == ">=" else -1
        while (day + 3) % 7 != wd:
            day += step
    suffix = time_spec[-1] if time_spec[-1] in "wsugz" else "w"
    seconds = hms(time_spec.rstrip("wsugz") or "0")
    local = day * 86400 + seconds
    # The first line of a zone keeps no summer time: wall and standard are its own offset.
    return local if suffix in "ugz" else local - stdoff


def lmt_ends(text):
    """For each zone whose history starts in Local Mean Time: when that period ends (UTC)."""
    out = {}
    for line in text.splitlines():
        if not line.startswith("Z "):
            continue
        f = line.split()
        name, stdoff, fmt, until = f[1], hms(f[2]), f[4], f[5:]
        if fmt == "LMT" and until:
            out[name] = until_utc(until, stdoff)
    return out


def main():
    text = open(SRC, encoding="utf-8").read()
    version = re.search(r"^# version (\S+)", text, re.M)
    ddeps = re.search(r"^# ddeps (.*)$", text, re.M)
    if not version:
        sys.exit("no '# version' line: not a tzdata.zi file")
    if not ddeps or "backzone" not in ddeps.group(1):
        sys.exit("this tzdata.zi was built without backzone: pre-1970 history would be lost")
    zones, links = [], {}
    for line in text.splitlines():
        if line.startswith("Z "):
            zones.append(line.split()[1])
        elif line.startswith("L "):
            _, target, alias = line.split()[:3]
            links[alias] = target

    lmt_until = lmt_ends(text)
    out_zones = {}
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["zic", "-b", "fat", "-d", tmp, SRC], check=True)
        for name in sorted(zones):
            times, idx, types, footer = read_tzif(os.path.join(tmp, name))
            # Drop types no transition uses (keep type 0: the state before the
            # first transition), and re-index.
            used = sorted({0, *idx})
            remap = {old: new for new, old in enumerate(used)}
            kept = [types[i] for i in used]
            deltas, prev = [], 0
            for t in times:
                deltas.append(b36(t - prev))
                prev = t
            out_zones[name] = {
                "y": [[u, d, a] for (u, d, a) in kept],
                "t": ",".join(deltas),
                "i": "".join("0123456789abcdefghijklmnopqrstuvwxyz"[remap[i]] for i in idx),
                "f": footer,
            }
            # The zone's own Local Mean Time ends here (tzdb's first Zone line).
            # A later "LMT" is a capital's mean time kept as legal time
            # (Lisbon 1884–1912, Lagos 1914) and is not the birthplace's.
            if name in lmt_until:
                out_zones[name]["l"] = lmt_until[name]
            if len(kept) > 36:
                sys.exit(f"{name}: {len(kept)} types do not fit one base-36 digit")

    # Links resolve to zones (some aliases chain through another alias).
    def resolve(name, depth=0):
        if name in out_zones:
            return name
        if depth > 8 or name not in links:
            return None
        return resolve(links[name], depth + 1)

    out_links = {}
    for alias in sorted(links):
        target = resolve(alias)
        if target and alias not in out_zones:
            out_links[alias] = target

    payload = {
        "version": version.group(1),
        "source": f"IANA tz database {version.group(1)} with backzone ({ddeps.group(1).strip()})",
        "zones": out_zones,
        "links": out_links,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"), ensure_ascii=False)
        fh.write("\n")
    print(f"tzdb {version.group(1)}: {len(out_zones)} zones, {len(out_links)} links → {os.path.relpath(OUT)} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
