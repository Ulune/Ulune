# Security

Ulune keeps nothing about its visitors on its server, and what a visitor
chooses to keep stays on their device, encrypted. A flaw that could break
either promise matters most, and so does anything that could run code in a
visitor's browser or misuse Ulune's server.

## Reporting a problem

Please report it privately, never in a public issue:

- on GitHub: [report a vulnerability](https://github.com/ulune/ulune/security/advisories/new);
- or by e-mail: limiel.ulune@protonmail.com.

Say what you found, how to reproduce it and what it could let someone do.
Leave real people's birth details out: the sample chart or an invented birth
is enough.

## What happens next

Ulune is made by one person: there is no bounty and no fixed timetable, but
every report is read and answered. A fix ships as soon as it is ready, with
credit in its notes if you would like it.

## What is covered

- The site at [ulune.app](https://ulune.app) and this code: the server (chart
  calculations, place search, the AI relay, error reports, the health check),
  the private space's encryption, and the pages' security headers.
- Not covered: the services Ulune relies on (Vercel, Open-Meteo, the AI
  providers a visitor connects), which have their own ways to report.
