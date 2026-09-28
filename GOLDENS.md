# Ulune goldens — the frozen sky contract

These are the model choices the goldens lock. A golden failure means the
engine moved; it does **not** mean the contract should be rewritten. Do not
"fix" a red golden by changing anything in the *Frozen* list below — raise it
first.

Run them with `npm test`.

## Frozen (never silently changed)

| Choice | Value | Where |
| --- | --- | --- |
| Zodiac | Tropical, apparent, Swiss files (`SEFLG_SWIEPH \| SEFLG_SPEED`). No sidereal, no ayanamsa. | `calculate.server.ts` |
| Ephemeris files | Astrodienst's 2026 files built on JPL **DE441** (`ephe/`, 600 BC – 2400 AD); dev reads exactly what production ships. A Moshier fallback (no file for the date) is detected from Swiss's return flag and warned. | `calculate.server.ts`, `ephe/` |
| Date entry | European `DD/MM/YYYY`, years 1–2399. `05/06/1990` is always 5 June. Dates before **15 Oct 1582** are **Julian** calendar dates. | `parse-birth.ts`, `birth-time.server.ts` |
| Timezone | IANA zone from the coordinates (**geo-tz**, comprehensive boundaries — one zone per country, so pre-1970 history survives); the picked place's geocoder zone only breaks ties or covers an offshore centre. Offsets from the **bundled tzdb with backzone** (`tzdb-data.json`), never the runtime's ICU (which merges Oslo into Berlin before 1970). | `birth-time.server.ts`, `civil-time.server.ts` |
| Local Mean Time | Before a zone's first standard time the offset is the **birthplace's** LMT (longitude × 4 min), on the calendar side of the date line the zone kept. A later "LMT" in tzdb (a capital's mean time kept as legal time: Lisbon 1884–1912, Lagos) is kept as tzdb has it. | `civil-time.server.ts` |
| Repeated / skipped hour | Repeated: flagged `ambiguous`, both readings kept, the **second** (after the clocks went back) unless `fold: 0`. Skipped: flagged `nonexistent`, read with the offset **before** the change. Never unflagged. | `civil-time.server.ts` |
| Overrides | `tz`: `"lmt"`, a fixed offset `"+05:30"`, or an IANA zone; anything else is refused (`E:tz.invalid`), never read as automatic. | `birth-time.server.ts` |
| Fixed stars | Swiss's catalogue (`sefstars.txt`), `swe_fixstar2_ut`, apparent of date with proper motion. | `calculate.server.ts` |
| Out of bounds | Declination beyond the **true obliquity of the date**, not a fixed 23.44°. | `anatomy.ts` |
| Display | Nearest minute (wheel) or second (tables, exports), **never rolling into the next degree or sign** (Swiss `swe_split_deg` with KEEP_DEG). | `utils.ts` |
| Exact times | Transit/progression exacts polished (bracketed Newton) to 0.0004″ and published to the second. | `transit-exact.ts` |
| Nodes | Natal/transits/progressions use the **true** node; south node = true node + 180°. | `calculate.server.ts` |
| Human Design nodes | **True** node, the natal chart's own, as Jovian Archive's charts use it (a third-party check against a real Jovian chart matched all four node rows with the true node, none with the mean one). Mean until part 46. | `hdBodiesAt` |
| Design moment | **88° of solar arc** before the Personality Sun — never 88 days. The span really runs 86.4–92.0 days. | `calculateHumanDesign` |
| Mandala start | Gate 41 at `HD_GATE_41_START = 302` (02°00′ Aquarius), Rave I Ching wheel order. Not retuned without a golden failure. | `human-design.ts` |
| Numerology | Pythagorean. **Y is always a vowel.** Masters 11/22/33 kept at every core, the personal year included; `digit` is always the 1–9 root. | `numerology.ts` |
| Lilith | `SE_OSCU_APOG` ("True Lilith"). | `calculate.server.ts` |
| Composite | Midpoint composite, **not** Davison. No Swiss recast. Positions are the shorter-arc circular midpoint; speed/latitude/declination are arithmetic means. | `composite.ts` |
| Pair orbs | Synastry and composite use the natal `bestAspect` / `aspectOrb` pair. There is no second orb table: a planet-to-angle trine is 6° in a synastry grid too. | `anatomy.ts`, `constants.ts` |
| Progressions | Secondary, day-for-a-year, tropical year `365.24219`. | `progressions.ts` |
| Unknown birth time | Bodies are still cast at local noon, but the chart is flagged `meta.timeUnknown` and every time-dependent point (ASC/MC/DSC/IC, Vertex/Anti-Vertex, Fortune/Spirit, house cusps) carries `uncertain: true`. **Never invent a birth time, and never present a noon angle as a known one.** | `calculate.server.ts`, `functions.ts` |
| Longitudes | IEEE floats end to end. **No `Math.round` on an ecliptic longitude** — rounding is display-only (`formatDegree`). | everywhere |
| Tolerance | Every longitude golden asserts ≤ **1 arcminute** against frozen Swiss values; the reference suite holds every number to **0.001″** against native Swiss Ephemeris. | `scripts/*-golden.test.mjs`, `scripts/swiss-reference.test.mjs` |

## House rules (Step 1)

- The requested house system drives the cusps **and** the Vertex, transit
  houses, and progressed angles — nothing silently falls back to Placidus.
- ASC/MC/DSC/IC house numbers come from `houseFromCusps`, not hardcoded
  1/10/7/4. Under whole-sign or equal houses the MC is routinely house 9 or 11.
- Placidus and Koch are undefined inside the polar circles: Swiss throws, and
  Ulune falls back to **Porphyry** for that chart rather than failing it.
  `meta.houseSystem` then reports the system actually used and
  `meta.houseSystemRequested` records what was asked for.
- A body whose `.se1` file is missing is skipped with a warning in
  `meta.warnings`; it does not abort the chart. The ten classical bodies and
  the nodes stay required.

## Pair rules (Step 3)

- The **composite ring is derived from the composite axes** under the charts'
  own house system — never by averaging the twelve natal cusps one at a time.
  Per-cusp averaging lets each cusp pick its own shorter arc, so for two charts
  with far-apart Ascendants the ring stops being monotonic and `houseFromCusps`
  dumps most bodies into house 1.
  - Quadrant systems (Placidus, Koch, Porphyry, Campanus, Regiomontanus,
    Alcabitius, Topocentric): cusps 1/4/7/10 **are** the midpoint ASC/IC/DSC/MC;
    the intermediate cusps sit at the mean of where the two natal charts put
    them inside that quadrant.
  - Equal: cusp 1 is the midpoint ASC, then every 30°. **The MC floats** — it is
    routinely house 9 or 11 and is not pinned to cusp 10.
  - Whole sign: cusp 1 is 0° of the midpoint ASC's sign. The MC floats.
  - Morinus: its cusp 1 is not the Ascendant, so the ring is anchored on the
    midpoint of the two natal first cusps and shaped by the mean cusp offsets.
- `buildComposite(A, A)` reproduces A exactly — cusps, angles, angle house
  numbers and bodies — in every house system. This is the invariant that catches
  a ring rule drifting.
- When the two midpoint axes do not bound a quadrant (the two charts' angles are
  close to opposite, so each midpoint took a different way round), the composite
  falls back to **equal houses from the composite Ascendant** and says so in
  `meta.warnings`. The axes themselves stay the midpoint axes.
- Mixed input warns rather than averaging silently: two different house systems
  (including a polar Porphyry fallback on one side), or a body only one chart
  has, land in `composite.meta.warnings`. A's system wins the ring.
- Unknown birth time propagates: if **either** chart is `timeUnknown` the
  composite carries `meta.timeUnknown`, and its angles and all twelve cusps carry
  `uncertain: true`. Longitudes are bit-identical to the known-time cast — the
  flags are the only difference, and no birth time is invented.
- Synastry house overlays are read with the shared `houseFromCusps` against the
  **host** chart's own cusps. A chart with no usable ring (a pre-cusp save, or a
  ring that no longer winds exactly once) gets **no overlays** rather than every
  body reported in house 1. Overlay reliability follows the host chart's
  `meta.timeUnknown` (`overlaysUncertain`).
- Synastry stays directional (A→B and B→A are both listed) and symmetric in orb.

## Human Design + numerology rules (Step 2)

- The Design search runs in **epoch milliseconds**, the same grid `designUtc`
  is published on — not in Julian days with a `Date` conversion afterwards.
  The reported timestamp is therefore the instant the design longitudes were
  actually evaluated, and `humandesign-golden` proves it by re-reading the Sun
  at `designUtc` through `calculateTransits`.
- Residual on the 88° arc: the engine throws above **1e-6°**, the goldens
  assert **1e-8°**. The floor is half a millisecond of solar motion (~6e-9°).
- Mean vs true node is a **visible** difference, not a rounding one: up to
  1.88° apart, which puts the node in a different gate in about 18% of charts.
  Human Design now uses the true node, so the bodygraph and the natal table
  agree on the node; a chart made elsewhere with the mean node can differ.
- Below the line: each line holds 6 colours of 6 tones of 5 bases (69,120
  bases around the wheel, `hd-variable.ts`), all cut from one integer count of
  bases so they can never disagree with the gate and line. An arrow of
  Variable points left for tones 1–3, right for 4–6; with a birth time it is
  marked when its tone changes within 30 minutes either side.
- Without a birth time the bodygraph is cast at noon and the day every hour
  (±12 h); rows, keys and channels that differ at any hour are marked, and the
  arrows are left out.
- Sun and Earth in each HD layer come from **one** Sun evaluation, so Earth is
  exactly Sun + 180° and the pair cannot straddle a gate boundary by an ulp.
- Numerology folds a name to A–Z before valuing it: accents decompose
  (`é` → `E`) and the letters NFD cannot decompose **expand** rather than
  disappear — `œ` → `OE`, `ß` → `SS`, `æ` → `AE`, `ø` → `O`, `ł` → `L`,
  `þ` → `TH`. Dropping them would silently change every number in the name.
- Vowels and consonants must partition the folded letters exactly: Soul Urge
  plus Personality always rebuild the Expression total.

## Fixtures

All Paris fixtures are `48.8566, 2.3522` (Europe/Paris), Placidus unless noted.

| Fixture | Moment | Locked in |
| --- | --- | --- |
| **A** | 1990-06-15 **12:00** — Sun 24°03′ Gemini, Moon 14°15′ Pisces, ASC 5°09′ Virgo | `natal-golden.test.mjs`, `scripts/e2e/_lib.mjs` (`assertFixtureA`) |
| Day | 1990-06-15 **14:30** (day chart, Fortune = ASC + Moon − Sun) | `natal-golden.test.mjs` |
| Night | 1990-06-15 **02:30** (night chart, Fortune reversed) | `natal-golden.test.mjs` |
| Koch / whole-sign | Fixture A moment, `houseSystem` swapped | `natal-golden.test.mjs` |
| DST fold | 1990-**09-30** 02:30 Europe/Paris — the repeated hour; the **later** (CET, +01:00) offset wins unless `fold: 0`, and the chart says `ambiguous`. The EU only moved the autumn change to October in 1996, so 1990-10-28 is an ordinary CET day | `natal-golden.test.mjs` |
| DST gap | 1990-03-25 02:30 Europe/Paris — never happened; read as CET (+01:00, before the change) = 01:30 UT, flagged `nonexistent` | `natal-golden.test.mjs` |
| Swiss reference | 60 charts 633–2399 (Julian before 1582, all 10 systems, polar) from native pyswisseph on the same files — every body, cusp, angle, lot, star to 0.001″ (`build-swiss-reference.py`) | `swiss-reference.test.mjs` |
| Time zones | 1,500 instants and 1,377 wall times (skipped and repeated hours) against Python zoneinfo on the same tzdb release with backzone (`build-tz-fixture.py`); Oslo 1962, Stockholm 1946, Amsterdam 1937, Reykjavik 1960, Nassau 1950, Buffalo 1880 (LMT), Paris 1905 (PMT), Porto 1880/1900, Sitka 1860, Manila 1840, Nuremberg 1500 (Julian) | `civil-time.test.mjs` |
| Polar | Tromsø 69.6492, 18.9553, 1990-06-15 12:00, Placidus requested → Porphyry used | `natal-golden.test.mjs` |
| Unknown time | Fixture A place/date, blank time | `natal-golden.test.mjs` |
| Transits | Fixture A natal + 2026-08-27 12:00 UTC | `transits-golden.test.mjs` |
| Timing | 12:00 natal, exacts must lock to 1′ or be dropped | `timing-golden.test.mjs` |
| Progressions | 14:30 natal progressed to 2026-08-27 12:30 UTC | `progressions-golden.test.mjs` |
| Synastry / composite | 14:30 vs 12:00 Paris — all 27 composite longitudes, all 12 cusps, both overlay directions | `synastry-golden.test.mjs`, `composite-golden.test.mjs` |
| Near-opposite pair | Paris 14:30 vs Paris 02:20 — Ascendants ~178° apart, the case per-cusp averaging broke | `composite-golden.test.mjs` |
| Incoherent axes | Paris 14:30 vs Quito 00:52 — midpoint ASC/MC do not bound a quadrant, so equal houses + warning | `composite-golden.test.mjs` |
| Human Design | 14:30 Paris — Personality Sun gate 12 line 2, Design Sun gate 36 line 4, profile 2/4, Manifesting Generator | `humandesign-golden.test.mjs` |
| Design arc | 1990-01-04 (perihelion, ~87.3 d) and 1990-07-04 (aphelion, ~91.2 d) as bracket ends, plus 2017-02-01 whose window crosses the 2016-12-31 leap second | `humandesign-golden.test.mjs` |
| Mean/true node split | 1998-10-15 12:00 Paris — true node gate 59 in both the natal table and the bodygraph (the mean node said 29) | `humandesign-golden.test.mjs` |
| Jovian node rows | Pensacola 1993-10-18 01:30 CDT — nodes 34.4 / 20.4 (Personality), 5.1 / 35.1 (Design), as published from a real Jovian Archive chart | `hd-variable.test.mjs` |
| Variable | 2000-01-01 12:00 UT — Determination c1 t3 left, Environment c6 t3 left, Motivation c6 t4 right, Perspective c1 t4 right | `hd-variable.test.mjs` |
| Master numbers | 1980-11-02 14:30 Paris — Life Path 22 (digit 4), Personal year 5 in 2026, Maturity 3 | `numerology-golden.test.mjs` |
| Ligature names | `Lœuillet` → Expression 3, Soul Urge 1, Personality 11 | `numerology-golden.test.mjs` |
