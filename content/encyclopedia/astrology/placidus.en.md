---
id: placidus
lang: en
slug: placidus
title: Placidus
aliases: [Placidus houses, Placidian houses, Semi-arc system, Placidus de Titis]
tradition: astrology
family: house-systems
kind: core
page: true
summary: The time-based house system named after Placidus de Titis, which divides the time each degree takes to rise and set, and Ulune’s default.
related: [house-system, topocentric, koch, porphyry, intercepted, house]
sources:
  - Claudius Ptolemy, Tetrabiblos, c. 150
  - Placidus de Titis, Tabulae primi mobilis, 1657
  - "Deborah Houlding, The Houses: Temples of the Sky, 1998"
  - Dieter Koch and Alois Treindl, Swiss Ephemeris, 1997
revised: 2026-10-07
---

## Meaning

Placidus divides the houses by time. Every degree of the zodiac rises in the east, climbs to the top of the sky and sets in the west, and each takes its own time to do it. Placidus cuts each degree’s climb into three equal parts of time. The cusp of the 12th house is the degree that has done a third of its climb since rising; the cusp of the 11th has done two thirds. Below the horizon, the cusps of the 2nd and 3rd are found the same way, with the time each degree spends under the earth.

Precisely: a degree’s diurnal semi-arc is the part of its daily circle between the horizon and the meridian. The cusp of the 11th is the ecliptic degree whose distance from the meridian is one third of its own semi-arc, both measured in right ascension. For the 12th, it is two thirds. Because every degree has a different semi-arc, there is no simple formula: the cusps are found by successive approximation. The angles are the cusps of the 1st, 4th, 7th and 10th houses, and opposite cusps are 180° apart.

The idea behind it is that a house is a stage of the daily turn of the sky. A planet in the 12th has just risen and is climbing; one in the 10th is near its highest point. That makes Placidus a natural partner of techniques that also measure time, such as primary directions.

Its limits come from the same idea. Far from the equator, some degrees rise very fast and others very slowly, so the houses grow very unequal and [[intercepted|intercepted signs]] are common. Inside the polar circles, some degrees of the zodiac never rise and others never set; they have no semi-arc to divide, and the system cannot be drawn at all.

## In practice

- **The most common choice.** Placidus is the default of most modern Western astrology and software, and much of the modern literature on the houses assumes its cusps.
- **Good for timing.** Astrologers who work with primary directions or with the diurnal motion of planets often keep it for that reason.
- **Check high latitudes.** At 45° north or south, Placidus houses range from about 18° to 52° of the zodiac; above about 55°, a single house can cover more than two signs. There it is worth comparing with [[porphyry|Porphyry]] or [[equal-houses|Equal houses]].
- **A close cousin.** [[topocentric|Topocentric houses]] give nearly the same cusps by another route.

## Origin and history

Placidus de Titis (1603–1668) was an Italian monk who taught mathematics at Pavia. He saw his astrology as a return to Ptolemy’s principles, and built his house division, like his primary directions, on the semi-arcs of the planets and degrees. His Tabulae primi mobilis appeared in 1657. In 19th-century England, printed tables of houses, such as those published under the name Raphael, gave Placidus cusps. The system became the default of English-language astrology. Software kept that habit, and Placidus is still the system most charts are cast in today.

## How Ulune calculates it

Placidus is Ulune’s default house system: a chart that names no system, or an unknown one, is cast in Placidus. The Swiss Ephemeris computes the cusps with its code P. The Ascendant, the IC, the Descendant and the [[midheaven|Midheaven]] are the cusps of the 1st, 4th, 7th and 10th houses. The table gives each cusp to the arc-second, with the size of each house.

Inside the polar circles, beyond about 66°34′ of latitude, the Swiss Ephemeris finds no Placidus cusps. Ulune then builds that chart’s houses with Porphyry, and a note under the chart says: “Houses in Porphyry: Placidus has no cusps inside the polar circles.” Progressed angles and the Vertex follow the same fallback. In a composite chart in Placidus, the angles are the midpoint angles and the other cusps keep, inside each quadrant, the average of their places in the two charts.

## Correspondences

| Correspondence | Placidus |
| --- | --- |
| What it divides | Time: each degree’s own semi-arc |
| Cusps 1, 4, 7, 10 | Ascendant, IC, Descendant, Midheaven |
| Named after | Placidus de Titis (1603–1668) |
| Swiss Ephemeris code | P |
| Inside the polar circles | No cusps; Ulune uses [[porphyry]] |
| Closest system | [[topocentric]] |
