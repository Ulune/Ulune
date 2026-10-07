---
id: exact
lang: en
slug: exact
title: Exact
aliases: [Exact aspect, Perfection]
tradition: astrology
family: techniques
kind: core
page: true
summary: The minute an aspect or a crossing is precise to the degree, minute and second, the peak of a transit.
related: [window, transit, orb, applying, progression]
sources:
  - William Lilly, Christian Astrology, 1647
revised: 2026-10-07
---

## Meaning

An aspect is exact when the distance between two bodies is precisely the aspect’s angle: 0° for a conjunction, 90° for a square, 120° for a trine. Before that moment the aspect is [[applying]], the bodies drawing closer to the angle; after it the aspect separates. The same word serves for a crossing, such as a planet entering a sign or a Moon phase: the moment the line is reached.

Tradition reads the exact moment as the peak of an aspect, the point where its theme is at its clearest. The time around it matters too. An aspect is felt within its [[orb]], growing as it applies and fading as it separates, and many astrologers find the build-up as telling as the peak itself. An exact time is best read as the centre of a period rather than as a deadline.

How long the approach lasts depends on the moving body. The Moon moves about thirteen degrees a day, so a lunar [[transit]] closes its last degree in a couple of hours. The Sun takes a day or two to cross the same degree. A slow planet can hover near exact for weeks, and a [[retrograde]] can bring it back to the same degree two or three times: that longer period is the [[window|transit window]].

## In practice

- **As a marker**: an exact date is a useful note in a journal. Many people look back at what they dreamt, met or decided on and around the day.
- **A slow transit with three passes**: the first exact pass often opens the theme, the retrograde pass reworks it, and the last pass settles it. The whole stretch counts; the exact dates are its peaks.
- **Fast triggers**: the day a slow transit is exact, the Moon or the Sun crossing a related point is often read as the moment it shows itself.
- **In progressions**: one day of the sky stands for a year of life, so an hour of the [[progression|progressed]] sky is about fifteen days of life. A progressed exact date is the centre of a season, not of a day.

## Origin and history

Older astrology spoke of an aspect *perfecting*: in horary astrology, a question is answered yes when the two significators come to an exact aspect. William Lilly, in *Christian Astrology* (1647), separates a *partile* aspect, whose bodies stand in the same degree number of their signs, from a *platic* one, held within the bodies’ orbs. Before computers, astrologers found exact times by hand, from daily positions in printed ephemerides, usually to the nearest hour or so. Software now gives them to the minute.

## How Ulune calculates it

- To find an exact moment, Ulune samples the moving body’s positions, looks for the interval where the distance to the aspect’s angle changes sign, and then refines the moment inside it with Newton’s method. It stops when the arc is within about 0.0004″.
- The moment is kept to the second and shown to the minute in the calendar. A pass that never comes within 1′ of exact is dropped: Ulune never invents an exact date.
- Your transits are found this way on your device, from the sky’s positions at 12-hour steps, joined by a smooth curve through each position and speed. A slow planet’s window is traced from its daily positions.
- The sky’s own events in the calendar, such as the exact aspects among the planets from the Sun to Pluto, the Moon’s phases, the sign changes and the stations, are found with the Swiss Ephemeris and are the same for everyone.
- For a progression, the exact moment is found in the progressed sky and then turned back into a date of life, also to the second.
- In a transit’s reading, Ulune also gives an estimate of how long it is within 1°, from the moving body’s speed at the exact moment. It leaves this out near a station, or when the span would be more than four months on each side.
