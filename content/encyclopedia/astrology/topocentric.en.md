---
id: topocentric
lang: en
slug: topocentric
title: Topocentric
aliases: [Topocentric houses, Polich-Page, Polich–Page houses, Polich and Page]
tradition: astrology
family: house-systems
kind: core
page: true
summary: A quadrant system devised by the Argentine astrologers Polich and Page in the 1960s, whose cusps stay very close to Placidus by a simpler rule.
related: [house-system, placidus, koch, house]
sources:
  - "Deborah Houlding, The Houses: Temples of the Sky, 1998"
  - Dieter Koch and Alois Treindl, Swiss Ephemeris, 1997
revised: 2026-10-07
---

## Meaning

Topocentric houses aim at the same picture as [[placidus|Placidus]], houses as stages of the sky’s daily turn, but reach it by a simpler rule. Instead of following each degree’s own rising time, they treat the birthplace as if it lay at a lower latitude. For each cusp between the angles, they compute an ordinary rising degree there. The result is a set of cusps that stays within a fraction of a degree of Placidus at most inhabited latitudes.

Precisely: for the 12th cusp, turn the sky back by 30° of sidereal time, and compute the [[ascendant|Ascendant]] for a latitude whose tangent is two thirds of the birthplace’s. For the 11th, turn it back by 60° and use one third. The 2nd and 3rd cusps follow the same pattern below the horizon, and opposite cusps are 180° apart. The four angles are the cusps of the 1st, 4th, 7th and 10th houses.

Its name means centred on the place, from the Greek topos. In numbers, the difference from Placidus is small: at most about 0.3° at 45° of latitude, 0.7° at 52°, and 2.3° at 60°. On the equator the two coincide.

Its advantage over Placidus is a closed formula that can be computed at any latitude. Its limit is that, close to the polar circles and inside them, the cusps it gives can come out of zodiac order, which makes the houses hard to read.

## In practice

- **A Placidus alternative.** Astrologers who like the Placidus picture but prefer a closed formula use it, and their charts rarely differ from Placidus by more than a degree.
- **Planets within a degree of a cusp** are the only ones likely to change house between Topocentric and Placidus at mid-latitudes; for those, it is worth comparing.
- **High latitudes.** Above about 60°, the gap with Placidus grows, and near the polar circles the system itself becomes unreliable.

## Origin and history

The system was published in the 1960s by two Argentine astrologers, Wendel Polich and A. P. Nelson Page, which is why it is also called the Polich–Page system. It became one of the standard options of astrological software, offered beside Placidus and Koch. Deborah Houlding’s history of the houses (1998) places it among the modern quadrant systems, with Koch.

## How Ulune calculates it

Choose Topocentric in the birth form’s options. The Swiss Ephemeris computes the cusps with its code T. The Ascendant, the IC, the Descendant and the [[midheaven|Midheaven]] are the cusps of the 1st, 4th, 7th and 10th houses.

Topocentric is computed at every latitude, so Ulune never replaces it with Porphyry. Close to the polar circles and inside them, its cusps can come out of zodiac order. Inside them, at some times of day, the Swiss Ephemeris also puts its Midheaven opposite the point Equal or Porphyry houses would give. Ulune keeps both as the Swiss Ephemeris gives them, and reads the chart’s angles from them. In a composite chart in Topocentric, the angles are the midpoint angles and the other cusps keep, inside each quadrant, the average of their places in the two charts.

## Correspondences

| Correspondence | Topocentric |
| --- | --- |
| What it divides | Time, by a geometric rule close to Placidus |
| Cusps 1, 4, 7, 10 | Ascendant, IC, Descendant, Midheaven |
| Authors | Wendel Polich and A. P. Nelson Page, 1960s |
| Gap with Placidus | About 0.3° at 45° of latitude, 2.3° at 60° |
| Swiss Ephemeris code | T |
| Closest system | [[placidus]] |
