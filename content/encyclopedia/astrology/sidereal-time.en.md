---
id: sidereal-time
lang: en
slug: sidereal-time
title: Sidereal time
aliases: [Local sidereal time, LST]
tradition: astrology
family: coordinates
kind: core
page: true
summary: Time by the stars rather than the Sun, telling which part of the sky is on the meridian; with the latitude it sets the angles and houses.
related: [house-system, midheaven, ascendant, declination, progression, decan]
sources:
  - Jean Meeus, Astronomical Algorithms, 1991
  - O. Neugebauer and R. A. Parker, Egyptian Astronomical Texts, 1960–1969
revised: 2026-10-07
---

## Meaning

Our clocks follow the Sun: a solar day runs from one noon to the next. The stars come back to the same place a little sooner, after about 23 hours 56 minutes 4 seconds, because the Earth moves along its orbit while it turns. Sidereal time, from the Latin *sidus*, a star, keeps time by the stars instead. It gains about four minutes a day on the clock, a whole day in a year.

Local sidereal time tells which part of the starry sky is crossing the meridian, the line from north to south overhead, at a given place and moment. Astronomers give it in hours, from 0 to 24: it equals the right ascension, the equatorial longitude, of the points crossing the meridian. Turned into degrees, at 15° an hour, it is often called the RAMC, the right ascension of the Midheaven.

This is the link between the clock and the chart. With the local sidereal time and the latitude of the place, the [[midheaven|Midheaven]], the [[ascendant|Ascendant]] and the cusps of every [[house-system|house system]] follow. Two people born at the same minute in Paris and in Lyon have slightly different sidereal times, and so slightly different angles.

## In practice

- **Before computers**, astrologers erected a chart by hand. They turned the birth time into Greenwich time, took the sidereal time for that day from an ephemeris, added the time elapsed with a small correction, then the longitude of the place, and looked up the angles in printed tables of houses arranged by sidereal time.
- **Not the sidereal zodiac**: sidereal time has nothing to do with the sidereal zodiac of Indian astrology. Every chart, tropical or sidereal, needs it to find its angles.
- **In progressions**, the angles are often moved forward from the birth sidereal time by a fixed arc for each year of life.

## Across traditions

- **Ancient Egypt** told the hours of the night by the rising of the decans, thirty-six star groups appearing one after another: a clock read from the turning sky, sidereal time in all but name. The same star groups became the [[decan|decans]] of astrology.
- **Human Design** needs no sidereal time for its gates and centres, which come from the planets’ longitudes alone.

## Origin and history

The Egyptian star clocks, painted on coffin lids from about 2100 BC, are the oldest known tables of time by the stars, as Otto Neugebauer and Richard Parker showed. Observatories later kept clocks running on sidereal time, so that a star’s passage over the meridian could be read straight from them. Today sidereal time is computed from Universal Time by formulas such as those in Jean Meeus’s *Astronomical Algorithms*. Mean sidereal time follows a steady equator; apparent sidereal time adds the slight nodding of the Earth’s axis, nutation, a difference of about a second at most.

## How Ulune calculates it

- The Table’s Chart part gives the local sidereal time of the birth, in hours, minutes and seconds, with the true obliquity of the ecliptic beneath it. Without a birth time it is marked ~.
- It is the RAMC that the Swiss Ephemeris returns with the houses: the apparent sidereal time at Greenwich plus the east longitude of the birthplace. For a chart that does not carry it, Ulune works it back from the Midheaven’s longitude and the true obliquity, which is exact because the Midheaven lies on the ecliptic.
- While the time is being moved, the transit angles come from the apparent sidereal time at Greenwich and the true obliquity, sampled every twelve hours and interpolated, with the same formulas Swiss uses. Once the time settles, the exact cast takes over.
- The progressed angles start from the birth RAMC and add the Naibod arc, 0°59′08″, for each year of life.
