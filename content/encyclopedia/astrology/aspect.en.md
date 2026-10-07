---
id: aspect
lang: en
slug: aspect
title: Aspect
aliases: [aspects, planetary aspect]
tradition: astrology
family: aspects
kind: core
page: true
summary: "A set angle between two bodies of a chart, measured along the zodiac, that astrology reads as a relationship between what they stand for."
related: [conjunction, opposition, trine, square, sextile, orb, applying, quincunx]
sources:
  - Claudius Ptolemy, Tetrabiblos, c. 150
  - Johannes Kepler, De Fundamentis Astrologiae Certioribus, 1601
  - Johannes Kepler, Harmonices Mundi, 1619
  - William Lilly, Christian Astrology, 1647
  - Dane Rudhyar, The Lunation Cycle, 1967
revised: 2026-10-07
---

## Meaning

An aspect is an angle between two bodies of a chart, measured along the zodiac, that astrology treats as a relationship between them. Two planets 120° apart are in [[trine|trine]]; 90° apart, in [[square|square]]. The word comes from the Latin *aspectus*, a look or a glance: the old texts say that planets in aspect see each other, and that planets with no aspect between them do not.

If the planets say *what* and the signs and houses say *how* and *where*, the aspects say how these parts of a person get along: whether they blend, support each other, argue, or hardly speak. Without its aspects a chart is a list of separate placements; with them, it becomes a set of relationships.

Each aspect divides the circle by a whole number. The [[conjunction|conjunction]] is the circle undivided (0°), the [[opposition|opposition]] its half (180°), the trine a third (120°), the square a quarter (90°), the [[sextile|sextile]] a sixth (60°). These five are the major aspects, often called Ptolemaic. Finer divisions give the minor aspects, such as the [[semi-sextile|semi-sextile]] (30°), the [[semi-square|semi-square]] (45°), the [[quintile|quintile]] (72°) and the [[quincunx|quincunx]] (150°).

Aspects are usually sorted into families. The trine and the sextile are called soft: the two functions cooperate with little friction. The square and the opposition are called hard: the two pull against each other and ask for an answer. The conjunction is neither by nature, and takes the colour of the bodies it joins. Hard does not mean bad: much of what a person builds grows out of a tension worked with over the years, while an easy gift can go unused because it never insists.

No aspect is read on its own. Its weight depends on the bodies it joins (the Sun, the Moon and the ruler of the Ascendant count most), on how close it is to exact (its [[orb|orb]]), on whether it is still forming or already passing ([[applying|applying or separating]]), and on the signs and houses involved.

## In practice

A simple way into any aspect is a sentence in three parts: the first body, the kind of contact, the second body.

- **[[mercury|Mercury]] square [[saturn|Saturn]]**: thought meets limits. Often read as someone who doubts their own words, checks them twice and, with practice, becomes precise.
- **[[venus|Venus]] trine [[jupiter|Jupiter]]**: affection and generosity in easy agreement. Warmth comes naturally; the work is to give it a direction.
- **[[sun|Sun]] opposite [[moon|Moon]]**: will and needs on opposite sides of the sky, a birth near the Full Moon, often lived as a see-saw until both are given their time.

In a chart with many aspects, begin with the tightest, then those to the Sun, the Moon, the ruler of the Ascendant and the angles. Notice the overall balance too: many trines and sextiles, many squares and oppositions, or a planet with no major aspect at all. Three or four bodies linked together form a pattern, such as a [[grand-trine|grand trine]] or a [[t-square|T-square]], read as one figure.

## Across traditions

- **Indian astrology** speaks of a planet’s glance, *drishti*. Every planet looks fully at the seventh sign from its own; Mars also looks at the fourth and eighth, Jupiter at the fifth and ninth, Saturn at the third and tenth. The glance runs one way: a planet may look at another that does not look back.
- **Chinese astrology** relates the twelve earthly branches by their distance around the circle: branches four apart form the *three harmonies* (sān hé), branches six apart *clash* (chōng). The shapes recall the trine and the opposition, read with rules of their own.

## Origin and history

In the *Tetrabiblos* (2nd century), Claudius Ptolemy names four configurations, which join whole signs whatever the exact degrees: the opposition, the trine, the square and the sextile. He grounds them in simple fractions of the circle and in ratios also used in music, and calls the trine and the sextile harmonious, the square and the opposition discordant. Signs one or five apart are inconjunct: nothing joins them. The conjunction is not on his list; later usage adds it to make the five Ptolemaic aspects. By the seventeenth century, astrologers such as William Lilly (*Christian Astrology*, 1647) weighed aspects by their degrees, giving each planet an orb.

Johannes Kepler looked for more. In *De Fundamentis Astrologiae Certioribus* (1601) he set out three new aspects, the quintile (72°), the biquintile (144°) and the sesquiquadrate (135°), saying that years of weather observations bore them out; in *Harmonices Mundi* (1619) he placed all the aspects within his theory of cosmic harmony.

In the twentieth century, Dane Rudhyar read every aspect as a phase in the cycle two planets begin at their conjunction, on the model of the Moon’s phases (*The Lunation Cycle*, 1967): the same angle means something different while the cycle grows and while it wanes.

## How Ulune calculates it

- Ulune measures the angle between every pair of bodies and points in the chart, from the ten planets to the asteroids, the lots and the four angles, using positions from Swiss Ephemeris. The angle is the shorter arc between two longitudes, from 0° to 180°.
- It knows nine aspects: the five majors and four minors, the quincunx, the semi-sextile, the semi-square and the quintile. The sesquiquadrate, the biquintile and finer divisions are not computed.
- A pair is in aspect when its angle falls within the orb of one of the nine, and never holds two aspects at once.
- The two ends of an axis (the Ascendant and the Descendant, the Midheaven and the IC, the lunar nodes, the Vertex and the Anti-Vertex) are never paired. An aspect to one end mirrors one to the other end; when both are within orb, the Table shows them once, with the mirror beneath.
- The Table lists every aspect, majors first and tightest first, with its orb, its phase and a mark when it is [[out-of-sign|out of sign]]. The wheel draws a chosen set: by default, the five majors within 5°.

## Correspondences

| Aspect | Angle | Part of the circle | Signs apart | In Ulune |
| --- | --- | --- | --- | --- |
| [[conjunction]] | 0° | the whole | none | major |
| [[semi-sextile]] | 30° | one twelfth | one | minor |
| [[semi-square]] | 45° | one eighth | one or two | minor |
| [[sextile]] | 60° | one sixth | two | major |
| [[quintile]] | 72° | one fifth | two or three | minor |
| [[square]] | 90° | one quarter | three | major |
| [[trine]] | 120° | one third | four | major |
| [[quincunx]] | 150° | five twelfths | five | minor |
| [[opposition]] | 180° | one half | six | major |
