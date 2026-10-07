#!/usr/bin/env python3
"""
Build scripts/fixtures/chinese/swiss-sample.json: solar terms, new moons,
the equation of time and ΔT computed by an independent native build of the
Swiss Ephemeris (pyswisseph, C library 2.10.03) from the same ephemeris files
the app ships (ephe/). scripts/chinese-table.test.mjs holds the Chinese time
table (built in Node with sweph-wasm), the analytic Sun and Moon of
src/lib/chinese/astro.ts and its equation of time to these numbers.

  pip install pyswisseph
  python3 scripts/chinese/build-swiss-sample.py

Development only: nothing in the app imports Python or this file.
"""
import json
import os
import random

import swisseph as swe

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT = os.path.join(ROOT, "scripts", "fixtures", "chinese", "swiss-sample.json")
swe.set_ephe_path(os.path.join(ROOT, "ephe"))
FLAG = swe.FLG_SWIEPH | swe.FLG_SPEED
UNIX = 2440587.5
rng = random.Random(20261007)


def seconds(jd):
    return round((jd - UNIX) * 86400, 3)


def new_moon(jd):
    """The new moon nearest jd (UT): apparent longitudes of Sun and Moon equal."""
    for _ in range(40):
        sun = swe.calc_ut(jd, swe.SUN, FLAG)[0]
        moon = swe.calc_ut(jd, swe.MOON, FLAG)[0]
        step = (((moon[0] - sun[0] + 180) % 360) - 180) / (moon[3] - sun[3])
        jd -= step
        if abs(step) < 1e-9:
            break
    return jd


terms = []
for _ in range(120):
    year = rng.randint(1800, 2200)
    term = rng.randrange(24)  # 0 = Lichun (315°)
    lon = (315 + 15 * term) % 360
    # Lichun falls about 4 February; each term is about 15.2 days on.
    guess = swe.julday(year, 1, 1, 0) + 34 + 15.218 * term
    if term >= 22:  # Xiaohan (285°) and Dahan (300°) come before Lichun in the Gregorian year
        guess -= 365.2422
    jd = swe.solcross_ut(lon, guess - 10, swe.FLG_SWIEPH)
    if swe.revjul(jd)[0] != year:
        raise SystemExit("term %d of %d fell in another year" % (term, year))
    terms.append({"year": year, "term": term, "s": seconds(jd)})

moons = []
for _ in range(120):
    year = rng.uniform(1800, 2201)
    jd = new_moon(swe.julday(int(year), 1, 1, 0) + (year % 1) * 365.25)
    moons.append({"s": seconds(jd)})

eot = []
for _ in range(60):
    jd = swe.julday(rng.randint(1, 2399), 1, 1, 0) + rng.uniform(0, 365)
    eot.append({"s": seconds(jd), "minutes": round(swe.time_equ(jd) * 1440, 6)})

delta_t = []
for _ in range(60):
    jd = swe.julday(rng.randint(1, 2399), 1, 1, 0) + rng.uniform(0, 365)
    delta_t.append({"s": seconds(jd), "seconds": round(swe.deltat(jd) * 86400, 3)})

with open(OUT, "w") as f:
    json.dump(
        {
            "source": "pyswisseph %s (native Swiss Ephemeris) with the ephe/ files; scripts/chinese/build-swiss-sample.py" % swe.version,
            "units": "s: seconds since 1970 (UT); minutes: apparent minus mean solar time; seconds: TT - UT",
            "terms": terms,
            "moons": moons,
            "eot": eot,
            "deltaT": delta_t,
        },
        f,
        indent=1,
    )
    f.write("\n")
print("wrote", OUT)
