---
id: orb
lang: en
slug: orb
title: Orb
aliases: [orbs, orb of influence, partile, platic, moiety]
tradition: astrology
family: aspects
kind: core
page: true
summary: "The leeway around an aspect’s exact angle: how far two bodies may stray from it, in degrees, and still count as in aspect."
related: [aspect, exact, applying, out-of-sign, conjunction, window]
sources:
  - William Lilly, Christian Astrology, 1647
revised: 2026-10-07
---

## Meaning

Two bodies seldom stand at an exact angle. Venus may be 117° from Mars rather than 120°, and most astrologers still call that a trine, three degrees from exact. The orb names both sides of this: the margin an [[aspect|aspect]] is allowed (a trine may be given 8°), and how far a particular aspect is from exact (this trine has an orb of 3°).

The usual rule is that the closer to exact, the stronger the aspect. A contact within a degree is read as a defining trait; one near the edge of its orb as a background note. An [[exact|exact]] aspect is rare and striking, while a wide one is still a thread, only a thinner one.

Orbs are a convention, not a measurement. Astrologers broadly agree that the major aspects deserve more room than the minor ones, and the conjunction and the opposition the most, but the numbers vary from school to school: from about 6° to 10° for a conjunction, from 1° to 3° for a minor aspect, often a little more when the Sun or the Moon is involved. A narrow orb keeps fewer, stronger aspects; a wide one finds more connections at the price of noise. No setting is the true one; what matters is knowing which one a chart was read with.

There are two ways of thinking about it. Most modern astrology gives the orb to the aspect: so many degrees for a trine, fewer for a sextile. Older astrology gave it to the planet: each body shone with a sphere of light of its own, wider for the Sun and the Moon, and two planets were joined when their spheres met.

## In practice

- Venus at 10° Taurus and Mars at 15° Virgo are 125° apart: a trine with an orb of 5°. Move Mars to 20° Virgo and they are 130° apart, 10° from exact; most astrologers would no longer count a trine.
- Read the tightest aspects first. A list sorted by orb is a fair first ranking of what stands out in a chart.
- Orb and motion go together: an aspect 3° from exact and [[applying|applying]] is still gathering; at the same orb but separating, it is fading.
- In a [[transit|transit]], the orb becomes time. A slow planet can stay within a degree of an exact aspect to the birth chart for weeks or months, the span Ulune calls a [[window|window]].
- An orb can carry an aspect across the border between two signs, so that the degrees make an aspect the signs do not: an [[out-of-sign|out-of-sign aspect]].

## Origin and history

Traditional astrology measured orbs by planet. In *Christian Astrology* (1647), William Lilly gives his table: 15° for the Sun, 12° for the Moon, 9° for Saturn and Jupiter, 7° for Mars, Venus and Mercury. Two planets were in aspect when the distance from exact fell within half of their two orbs added together, their moieties: for the Moon and Saturn, 12° and 9° make 21°, so 10°30′.

Lilly also distinguished a partile aspect, with both planets at the same degree of their signs (Venus at 9° Aries and Jupiter at 9° Leo make a partile trine), from a platic one, within orb but not exact to the degree. Most modern astrology, and most astrology software, Ulune included, sets orbs by aspect instead of by planet.

## How Ulune calculates it

Ulune casts a birth chart with these orbs:

| Aspect | Orb | To an angle |
| --- | --- | --- |
| Conjunction, opposition, square | 8° | 8° |
| Trine | 8° | 6° |
| Sextile | 6° | 4° |
| Quincunx | 3° | 3° |
| Semi-sextile, semi-square | 2°30′ | 2°30′ |
| Quintile | 2° | 2° |

- “To an angle” means an aspect to the Ascendant, the Descendant, the Midheaven or the IC. The cast gives no extra orb to the Sun or the Moon.
- The orb shown is the distance from exact, in degrees and minutes. The Table sets it beside the orb allowed (“1°12′ of 8°”) with a bar for its strength, full when exact and empty at the edge of the orb, and can keep only the aspects within 3° or within 1°.
- The wheel draws fewer lines than the Table lists. Its views set a limit: the conjunction, opposition, square and trine within 3° in Minimal, the five majors within 5° in Classic (the default), all nine aspects within 6° in Advanced, the full orbs in All. Under Bodies, then Aspects, a Max orb slider runs from ½° to 8°, each aspect can be given an orb of its own, and a box gives the Sun and the Moon 2° more. These settings only narrow what is drawn: no line is ever wider than the orbs in the table above.
- [[transit|Transits]] and [[progression|progressions]] to the birth chart use the same orbs, and their tables list the major aspects. [[synastry|Synastry]] uses tighter ones: 6° for the conjunction, opposition, square and trine and 4° for the sextile, a degree more for these when the Sun or the Moon is involved; 2° for the quincunx and 1°30′ for the other minor aspects; never wider than the birth chart’s own orb for that pair.
- Without a birth time, an aspect that may leave its orb, or become exact, at another hour of the day is marked ~.
