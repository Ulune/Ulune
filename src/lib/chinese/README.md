# The Chinese calendar engine

Pure TypeScript, no server code and no React: it runs in the browser and in
Node alike, and nothing it computes leaves the device. Every Chinese language
in Ulune (the zodiac, BaZi, Feng Shui, then Nine Star Ki, Zi Wei Dou Shu and
the almanac) reads time through it, so they agree with each other and with the
natal wheel. Nothing here is in any page's first download: the Calendar loads
`terms.ts` with its solar terms' layer, and the Chinese pages load the rest on
demand.

| File | What it holds |
| --- | --- |
| `time-table.ts` | Generated. Every solar term 1799–2201 and every new moon from December 1798 to January 2202, to the second (Swiss Ephemeris). |
| `delta-t.ts` | Generated. ΔT (TT − UT) every five years from 100 BC to AD 2500, as the Swiss Ephemeris has it. |
| `astro.ts` | The Sun and the Moon without Swiss: terms and new moons outside the table, and the equation of time. |
| `terms.ts` | Solar terms and new moons of any year, from the table or from `astro.ts`. |
| `lunar.ts` | The lunisolar calendar: months, leap months, Lunar New Year, conversions both ways. |
| `pillars.ts` | The four pillars of a birth, the three clocks, the day boundary, both year animals, uncertainty flags. |
| `names.ts` | Stems, branches, phases, the sixty pairs, the 24 terms, the animals: characters, pinyin, English, French. Independent of the rest. |
| `prefs.ts` | The reader's settings (clock, day boundary, characters, how a term is written, the animals drawn or written), kept in this browser; `chineseLabel` writes a term as chosen. |
| `use-chinese-prefs.ts` | The settings for React views, followed live. |
| `zodiac.ts`, `zodiac-reading.ts`, `zodiac-table.ts` | Chinese astrology: the four animals of a cast chart, what its page says, its table and CSV. |
| `zodiac-texts.ts` | What Chinese astrology says, in English and French: the twelve portraits, the sixty animal-and-phase pairs, the month, day and hour animals, each relation in practice. |
| `relations.ts` | The relations between branches (harmony, trine, clash, harm, punishment, destruction, self-punishment), by rule. |
| `zodiac-time.ts`, `zodiac-time-reading.ts`, `zodiac-time-table.ts` | The year ahead and its months, the day's animal, two people's animals: how animals meet, what the pages say, their tables. |
| `day-cycle.ts` | The day's place in the sixty-day cycle alone, for the Calendar's month (no tables). |
| `calendar-chinese.ts` | What the Calendar loads for its day's-animal reading. |
| `bazi.ts`, `bazi-reading.ts`, `bazi-texts.ts`, `bazi-table.ts` | BaZi, the Four Pillars: the Day Master, the Ten Gods of every stem shown and hidden, what the board says, its table. |
| `fengshui.ts`, `fengshui-texts.ts`, `fengshui-reading.ts`, `fengshui-table.ts` | Feng Shui, the personal half: the Kua number from the solar year and the yin or yang count, its trigram and group, the Eight Mansions' eight directions, the practical lines, what the page says, its table. |
| `animal-glyphs.ts` | The twelve animals as Ulune's own line drawings, in the planet glyphs' language (24 × 24, round strokes). |
| `words.ts` | The interface words (`src/lib/i18n/catalog/chinese.ts`), read apart from the app's catalog so they stay out of the first download. |

## What it computes

- **Solar terms**: the instant the Sun's apparent geocentric longitude (true
  equinox of date, aberration and nutation included) reaches each multiple of
  15°, as the Chinese standard GB/T 33661-2017 defines them. `termMs(year, term)`
  numbers them from Lichun (0, 315°) to Dahan (23, 300°); even numbers are the
  jie that open the solar months, odd ones the zhongqi that name lunar months.
- **New moons**: the instant the apparent longitudes of Sun and Moon are equal,
  counted by Meeus's lunation number (0 is 6 January 2000).
- **The lunar calendar** (`lunarDateOfDay`, `lunarDateAt`, `lunarNewYearDay`,
  `dayOfLunarDate`, `leapMonthOf`): a month starts on the day of a new moon;
  the month that holds the winter solstice is month 11; when the span from one
  month 11 to the next holds 13 months, the first without a principal term is
  the leap month. 2033's leap month follows month 11, as it should.
- **The four pillars** (`fourPillars`): year, month, day and hour, each a place
  0–59 in the sixty-cycle (0 = Jia-Zi), with the lunar birthday, both year
  animals, the margin in minutes to each boundary and an uncertainty flag per
  pillar.

All instants are UT milliseconds since 1970, like a JavaScript date (UT1, which
civil UTC follows within 0.9 s). Days are numbered from 1 January 1970.

## Conventions, and why

From the owner's answers of 6 October 2026:

1. **The year turns at Lichun** (the Sun at 315°), at the exact instant, for the
   pillars. Each month turns at its jie, with its stem from the year's (the
   "five tigers"). Year and month are read from the instant, so no time zone or
   clock can move them.
2. **True solar time for the hour** (and the day): local mean time from the
   birthplace's longitude (4 minutes a degree), plus the equation of time.
   Local mean time and the civil clock are options (`clock`).
3. **The day turns at 23:00** true solar time, the start of the Rat hour, which
   belongs to the next day for both pillars (the Zi Ping rule). Two other
   schools are options (`dayBoundary`): `split` keeps the day pillar until
   midnight but already counts 23:00–24:00 as the next day's Rat hour (夜子時),
   and `midnight` restarts the hours at midnight. The day pillar is the Julian
   day number + 49, modulo 60 (1 January 2000 is Wu-Wu; 1 October 1949 Jia-Zi).
4. **Traditional characters by default**, Simplified alongside (`hant`, `hans`).
5. **The southern hemisphere is read like the northern**: no latitude enters
   any calculation.
6. **Ulune's own engine**: libraries were used only to check it, never shipped.

Choices the engine makes itself:

- **The calendar's clock** is China's standard time (UTC+8, 120° E), except
  for 1913–1928, whose calendars the Republic's Central Observatory computed
  for Beijing (116°25′ E). The Hong Kong Observatory's tables show it: Lunar
  New Year 1916 fell on 3 February (the new moon came at 23:51 in Beijing,
  00:05 at 120° E), and the tenth months of 1914 and 1920 begin a day before
  120° E would put them. The calendars of 1912 and earlier were computed by the
  Qing observatory with the astronomy of its day; applied at 120° E the modern
  rules match them better than at Beijing (see Limits).
- **The lunar birthday** is the birthplace's own calendar date (on the civil
  clock when its offset is given, otherwise local mean time) looked up in
  China's calendar, the way a reader looks up their birthday. Someone born in
  Paris at 20:00 on 16 February 2026 was born on the eve of the Horse year,
  although it was already New Year's Day in China.
- **Both year animals**: `animal.lichun` (as BaZi and Feng Shui count) and
  `animal.lunarNewYear` (as most people learned it). Between Lunar New Year and
  Lichun they differ, and the page should say so.
- **Uncertainty**: a pillar is flagged when the birth lies within five minutes
  of its change (`nearMinutes`), since birth times are seldom known closer.
  Without a birth time the instant is the day's noon, the hour pillar is left
  out, and a pillar is flagged if it changes anywhere in that day.

## Accuracy

The table holds the Swiss Ephemeris 2.10.03 with the DE441 files the natal
charts use, rounded to the second. Checked on 7 October 2026:

| Check | Cases | Result |
| --- | --- | --- |
| Table against native Swiss (pyswisseph, same files) | 9,624 terms, 4,959 new moons, 1800–2200 | within 0.5 s (the rounding) |
| Principal terms against HKO's published times, 2022–2027 | 72 | identical to the minute (largest gap 30 s, mean +1.2 s) |
| All 24 terms against Japan's National Astronomical Observatory, 2025–2027 | 72 | identical to the minute (largest gap 30 s, mean −0.5 s) |
| Terms against sxtwl (VSOP87-based) | 9,624 | within 3.4 s for 1900–1999, 7.3 s for 1800–1899 (bar two dates its Qing-calendar corrections move by a day); later, its larger ΔT forecast |
| New moons against PyEphem | 4,959 | within 5.2 s for 1800–1999; later, its ΔT forecast |
| New moons and seasons against the US Naval Observatory | 101 + 32 (1800–2100) | within 50 s (USNO's minute rounding and ΔT) |
| Lunar dates against HKO's tables | 34 years, every day and every term's date | identical except 2057 and 2097 (below) and three explained term dates |
| Lunar dates against cnlunar (HKO's tables, 1901–2100) | 72,674 days | identical except the 2057 and 2097 months |
| Lunar dates against sxtwl, 1800–2200 | 146,462 days | 11 months differ: six Qing-era months, five far-future ΔT cases |
| Four pillars against lunar-python | 24,812 births, 1800–2200 | day and hour always equal; year and month equal except within 2 s of a term before 2030 (its own term times), within 4.2 min after (its ΔT forecast) |

Outside the table, `astro.ts` takes over: VSOP87 for the Sun (truncated as in
Meeus) with the IAU 1980 nutation, and Meeus's true new moons, both with a small
fitted correction to the Swiss Ephemeris for their slow drift. Over the table's
400 years they agree with it within 17.2 s for the terms and 17.6 s for the new
moons; the Sun's longitude stays within 0.85″ of Swiss from 600 BC to AD 2400,
and the new moons within 18 s for AD 1–2399. The equation of time agrees with
Swiss's `swe_time_equ` within 0.43 s, ΔT with Swiss's within 0.25 s.

A full conversion (`fourPillars`) takes about 0.03 ms. The engine and its table
weigh 31 KB gzipped (the table alone 22.6 KB), `names.ts` 2.9 KB.

## Limits, and the cases where references differ

- **The future depends on ΔT**, the Earth's slowing, which no one can forecast
  exactly: about a minute uncertain by 2050, several by 2200. Two published
  months differ from HKO's tables for that reason: HKO starts the 9th month of
  2057 on 28 September and the 7th month of 2097 on 7 August, but with today's
  forecast the new moons fall 36 s and 86 s after midnight, so the engine starts
  them a day later. HKO's tables assume a ΔT a minute or two larger; only time
  will tell. The same holds for the 2084 spring equinox (30 s after midnight).
- **HKO times its terms to the minute** and dates the rounded time: Dahan 1979
  came 5 s before midnight, which HKO dates the next day.
- **The day follows the Sun at the birthplace's longitude**, so where the
  civil date line bends (Samoa, Tonga and Kiribati's Line Islands keep a date
  meant for the far side of 180°), true solar and local mean time are a day
  behind the civil date. The civil clock option keeps the civil date.
- **Before 1913** the published calendars came from the Qing observatory's
  computations, which could be a quarter of an hour off. Applied at 120° E the
  modern rules reproduce them except for a month start now and then: from 1800
  to 1912, six months (1804, 1831, 1842, 1863, 1880, 1896) start a day apart
  from the historical calendar as sxtwl records it, and the date of one term in
  1912 differs from HKO's. Before 1645 China used other rules altogether; the
  engine applies the modern ones backwards there.

## Rebuilding the table

The table is generated; edit the script, never the output:

```sh
node scripts/chinese/build-time-table.mjs          # writes time-table.ts and delta-t.ts
node scripts/chinese/build-time-table.mjs --check  # only checks they are current
```

It loads `sweph-wasm` and the `ephe/` files as `calculate.server.ts` does,
solves every crossing by Newton's method, refuses a Moshier fallback, and
writes each term as its difference from the same term a year before, and each
lunation as its difference from a prediction by the lunations 12 and 14 before:
16-bit numbers, low bytes then high bytes, in base64. A unit test rebuilds it in
memory and compares.

## Tests

`scripts/chinese-table.test.mjs`, `chinese-calendar.test.mjs`,
`chinese-golden.test.mjs`, `chinese-pillars.test.mjs` and
`chinese-names.test.mjs`, in `npm run test:unit`. Their fixtures are in
`scripts/fixtures/chinese/`: HKO's tables and term times, USNO's moments, each
with its source and date, and a native Swiss sample built by
`scripts/chinese/build-swiss-sample.py`.
