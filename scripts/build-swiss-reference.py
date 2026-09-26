#!/usr/bin/env python3
"""
Build scripts/fixtures/swiss-reference.json: charts computed by an
independent native build of Swiss Ephemeris (pyswisseph, C library
2.10.03) from the same ephemeris files the app ships (ephe/), which
scripts/swiss-reference.test.mjs holds the app's own numbers to — every body,
cusp, angle, lot and fixed star, to a millionth of an arc-second.

  pip install pyswisseph
  python3 scripts/build-swiss-reference.py

Times are given as UT (the charts are cast with a fixed "+00:00" offset), so
the reference checks the ephemeris and house computations alone; the
local-time → UT step has its own test (scripts/civil-time.test.mjs).
Dates before 15 Oct 1582 are Julian-calendar dates, as the app reads them.
"""
import json
import os
import random

import swisseph as swe

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "scripts", "fixtures", "swiss-reference.json")
swe.set_ephe_path(os.path.join(ROOT, "ephe"))

FLAG = swe.FLG_SWIEPH | swe.FLG_SPEED
EQ = FLAG | swe.FLG_EQUATORIAL
BODIES = {
    "sun": swe.SUN, "moon": swe.MOON, "mercury": swe.MERCURY, "venus": swe.VENUS, "mars": swe.MARS,
    "jupiter": swe.JUPITER, "saturn": swe.SATURN, "uranus": swe.URANUS, "neptune": swe.NEPTUNE,
    "pluto": swe.PLUTO, "chiron": swe.CHIRON, "northnode": swe.TRUE_NODE, "lilith": swe.OSCU_APOG,
    "ceres": swe.CERES, "pallas": swe.PALLAS, "juno": swe.JUNO, "vesta": swe.VESTA,
    "eris": swe.AST_OFFSET + 136199, "sedna": swe.AST_OFFSET + 90377,
}
SYSTEMS = {"placidus": b"P", "whole": b"W", "equal": b"E", "koch": b"K", "porphyry": b"O",
           "campanus": b"C", "regiomontanus": b"R", "alcabitius": b"B", "morinus": b"M", "topocentric": b"T"}
STARS = {"algol": ",bePer", "aldebaran": ",alTau", "regulus": ",alLeo", "spica": ",alVir",
         "antares": ",alSco", "fomalhaut": ",alPsA"}


def julian(y, m, d):
    return y < 1582 or (y == 1582 and (m < 10 or (m == 10 and d < 15)))


def near_file_edge(year, month):
    # Where two 600-year files meet (1 Jan 600, 1200, 1800) they overlap for a
    # few days and Swiss reads whichever it has open; the two agree only to
    # their own ~0.001″ precision. Keep reference dates away from those days.
    return (year % 600 == 0 and month == 1) or (year % 600 == 599 and month == 12)


def case(rng, i):
    while True:
        year = rng.choice([rng.randint(600, 1799), rng.randint(1800, 2399), rng.randint(1900, 2100)])
        month = rng.randint(1, 12)
        if not near_file_edge(year, month):
            break
    day = rng.randint(1, 28)
    hh, mm, ss = rng.randint(0, 23), rng.randint(0, 59), rng.randint(0, 59)
    polar = rng.random() < 0.1
    lat = round((1 if rng.random() < 0.5 else -1) * rng.uniform(66.7, 80) if polar else rng.uniform(-58, 64), 4)
    lon = round(rng.uniform(-180, 180), 4)
    system = list(SYSTEMS)[i % len(SYSTEMS)]
    cal = swe.JUL_CAL if julian(year, month, day) else swe.GREG_CAL
    jd_et, jd_ut = swe.utc_to_jd(year, month, day, hh, mm, float(ss), cal)
    out = {
        "input": {"date": f"{year:04d}-{month:02d}-{day:02d}", "time": f"{hh:02d}:{mm:02d}:{ss:02d}",
                  "latitude": lat, "longitude": lon, "houseSystem": system},
        "jdUt": jd_ut,
        "bodies": {},
    }
    for bid, ipl in BODIES.items():
        try:
            xx, ret = swe.calc_ut(jd_ut, ipl, FLAG)
        except swe.Error:
            continue  # no file covers the date (Eris/Sedna outside 1500–2102, Chiron before 675)
        eq, _ = swe.calc_ut(jd_ut, ipl, EQ)
        out["bodies"][bid] = {"lon": xx[0], "lat": xx[1], "speed": xx[3], "dec": eq[1]}
    # House systems that fail inside the polar circles fall back to Porphyry, as the app does.
    used = system
    try:
        cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, SYSTEMS[system])
    except swe.Error:
        used = "porphyry"
        cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b"O")
    out["houseSystem"] = used
    out["cusps"] = list(cusps)
    out["asc"], out["mc"], out["armc"], out["vertex"] = ascmc[0], ascmc[1], ascmc[2], ascmc[3]
    sun, moon = out["bodies"]["sun"], out["bodies"]["moon"]
    alt = swe.azalt(jd_ut, swe.ECL2HOR, (lon, lat, 0.0), 0.0, 0.0, (sun["lon"], sun["lat"], 1.0))[1]
    day_chart = alt > 0
    asc = ascmc[0]
    out["fortune"] = (asc + moon["lon"] - sun["lon"]) % 360 if day_chart else (asc + sun["lon"] - moon["lon"]) % 360
    out["spirit"] = (asc + sun["lon"] - moon["lon"]) % 360 if day_chart else (asc + moon["lon"] - sun["lon"]) % 360
    out["isDay"] = day_chart
    out["stars"] = {sid: swe.fixstar2_ut(name, jd_ut, swe.FLG_SWIEPH)[0][0] for sid, name in STARS.items()}
    out["obliquity"] = swe.calc_ut(jd_ut, swe.ECL_NUT, 0)[0][0]
    return out


def main():
    rng = random.Random(20260924)
    cases = [case(rng, i) for i in range(60)]
    header = swe.version
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"swisseph": header, "cases": cases}, fh, indent=None, separators=(",", ":"))
        fh.write("\n")
    print(f"{len(cases)} reference charts (Swiss Ephemeris {header}) → {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()
