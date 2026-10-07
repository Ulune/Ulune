---
id: house-system
lang: en
slug: house-system
title: House system
aliases: [House systems, Placidus, Koch, Whole Sign, Equal houses, Porphyry, Campanus, Regiomontanus, Alcabitius, Morinus, Topocentric]
tradition: astrology
family: house-systems
kind: core
page: true
summary: The method that divides the sky into the twelve houses, from Placidus and Koch to Whole Sign and Equal houses, each drawing the cusps its own way.
related: [placidus, whole-sign, equal-houses, porphyry, koch, intercepted, house, sidereal-time]
sources:
  - Claudius Ptolemy, Tetrabiblos, c. 150
  - Vettius Valens, Anthology, 2nd century
  - Regiomontanus, Tabulae directionum, 1490
  - William Lilly, Christian Astrology, 1647
  - Placidus de Titis, Tabulae primi mobilis, 1657
  - Margaret Hone, The Modern Text-Book of Astrology, 1951
  - "Deborah Houlding, The Houses: Temples of the Sky, 1998"
  - "Robert Hand, Whole Sign Houses: The Oldest House System, 2000"
  - Chris Brennan, Hellenistic Astrology, 2017
  - Dieter Koch and Alois Treindl, Swiss Ephemeris, 1997
revised: 2026-10-07
---

## Meaning

Every chart has twelve [[house|houses]], but there is no single way to draw them. A house system is the rule that sets where each house begins, its cusp. All systems fix the houses to the horizon and the meridian of the birthplace, and the zodiac turns through them once a day. They differ on what to cut into twelve: the zodiac itself, the time each degree takes to rise, or a circle of the local sky.

They fall into three groups.

- **Sign and degree systems.** [[whole-sign|Whole sign houses]] make each sign one house, starting with the rising sign. [[equal-houses|Equal houses]] count twelve arcs of 30° from the degree of the [[ascendant|Ascendant]].
- **Quadrant systems.** The four angles begin the 1st, 4th, 7th and 10th houses, and each quarter between them is split in three. [[porphyry|Porphyry]] splits the zodiac’s own arc. [[placidus|Placidus]], [[koch|Koch]], [[alcabitius|Alcabitius]] and [[topocentric|Topocentric]] split time. [[campanus|Campanus]] and [[regiomontanus|Regiomontanus]] split a circle of the sky.
- **A system apart.** [[morinus|Morinus]] divides the celestial equator from the meridian and ignores both the Ascendant and the latitude.

On the equator, the time-based and space-based quadrant systems coincide. Further north or south they drift apart, and the houses grow unequal: at 60° of latitude, a Placidus house can span anything from about 11° to 85°. Unequal houses also leave some signs with no cusp, the [[intercepted|intercepted signs]].

## In practice

- **No system is the true one.** Tradition reads each as another way of asking the same question. Most astrologers keep one, and compare another when a planet sits within a few degrees of a cusp.
- **Habits differ by school.** Placidus leads in modern Western astrology. Many horary astrologers use Regiomontanus, as William Lilly did. Koch is popular in German-speaking countries, and Hellenistic and Indian astrology work with whole signs.
- **The angles stay put.** Outside the polar circles, the Ascendant and the [[midheaven|Midheaven]] do not depend on the system; only the cusps between them move.

## Across traditions

- **Jyotish** usually counts its houses, the bhavas, sign by sign from the rising sign. Another method, named after the 11th-century astronomer Śrīpati, takes Porphyry’s points as the middles of the houses, not their beginnings.
- **Human Design** has no houses at all.

## Origin and history

The earliest horoscopic texts usually count the houses sign by sign. Ptolemy measures the place of the Ascendant from 5° above the horizon to 25° below it. Vettius Valens describes splitting the quadrants between the angles, the method later named after Porphyry. Medieval astrologers preferred quadrant systems: first Alcabitius’, then Regiomontanus’, whose tables were printed in 1490 and which Lilly used in 1647. Placidus de Titis published his tables in the 1650s, and printed tables of houses later made his system the default in English. The 20th century added Koch and Topocentric, revived Equal houses through Margaret Hone, and brought whole signs back from the 1990s. Deborah Houlding’s history of the houses (1998) tells the whole story.

## How Ulune calculates it

Ulune offers ten systems in the birth form’s options, with Placidus as the default; the choice can be changed later by editing the chart. The Swiss Ephemeris computes the twelve cusps for the moment and place, each system by its own code letter. The Ascendant, the Midheaven and the [[vertex|Vertex]] come from the same computation.

Placidus and Koch have no cusps inside the polar circles, beyond about 66°34′ north or south. There Ulune builds the houses with Porphyry, and a note under the chart says so; progressed angles and the Vertex follow suit. The other eight systems are computed at every latitude, as the Swiss Ephemeris gives them. Inside the polar circles, Campanus, Regiomontanus and Topocentric cusps can come out of zodiac order. At some times of day, these three also put the Midheaven opposite the point the other systems give.

A body belongs to the house whose cusp it has passed, up to the next cusp in zodiac order. Ulune does not move a planet just before a cusp into the next house, and places the angles the same way. In [[synastry]], one person’s bodies fall in the other’s houses. A [[composite]] chart rebuilds its houses from the midpoint angles, in the first chart’s system. Without a birth time, the houses are cast for 12:00 and marked ~.

## Correspondences

| System | What it divides | Angles on the cusps | Polar circles, in Ulune |
| --- | --- | --- | --- |
| [[placidus]] | Time: each degree’s own semi-arc | All four | Porphyry |
| [[koch]] | Time: the Midheaven’s semi-arc | All four | Porphyry |
| [[topocentric]] | Time, by a geometric rule close to Placidus | All four | Computed |
| [[alcabitius]] | Time: the Ascendant’s semi-arc, on the equator | All four | Computed |
| [[porphyry]] | The zodiac between the angles | All four | Computed |
| [[campanus]] | The prime vertical | All four | Computed |
| [[regiomontanus]] | The celestial equator, from the east point | All four | Computed |
| [[equal-houses]] | The zodiac, from the Ascendant | Ascendant and Descendant | Computed |
| [[whole-sign]] | The signs | None | Computed |
| [[morinus]] | The celestial equator, from the meridian | None | Computed |
