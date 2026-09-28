# Ulune

Astrology charts, Human Design and numerology, calculated with the Swiss
Ephemeris. Free, with no account: your charts stay on your device.

[ulune.app](https://ulune.app)

## Private by design

- No accounts, no cookies, no analytics, no advertising.
- To draw a chart, its date, time and coordinates go to Ulune's server, which
  calculates and answers and keeps nothing. Names never leave the device.
- Charts you choose to keep stay in your browser, encrypted (AES-256-GCM)
  under your passphrase, a passkey or your recovery code.
- No AI in version 1.0: the readings are fixed texts. (Readings written with
  a visitor's own AI key are in the code, switched off until 1.1:
  `src/lib/features.ts`.)
- The [privacy notice](https://ulune.app/privacy) says the rest.

## Run it

Node 22 or later.

```sh
npm ci
npm run dev           # http://127.0.0.1:8097
npm test              # unit tests, then the end-to-end suites (the dev server must be running)
npm run test:unit     # the unit and precision tests alone (what CI runs on every push)
npm run build         # the Vercel output, in .vercel/output
npm run check:deploy  # serves that build as Vercel does, and casts two charts through it
```

Where things are: `src/lib/chart` (the engine and its inputs), `src/studio`
(the app), `src/lib/space` (the private space), `scripts` (tests and checks).
`GOLDENS.md` lists what the reference charts lock; `PRODUCTION.md` how the
site runs; `.github/workflows/ci.yml` the checks on every push, and the
end-to-end suites each night.

## Licence

Copyright © 2026 Limiel.

Ulune is free software: you can redistribute it and/or modify it under the
terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version. It is distributed in the hope that it will be useful, but
without any warranty; see [LICENSE](LICENSE).

It rests on the work of others: the Swiss Ephemeris, © Astrodienst AG, used
under the AGPL; fonts under the SIL Open Font License (their texts are in
`src/assets/fonts`); place data from Open-Meteo and GeoNames (CC BY 4.0);
time zone boundaries © OpenStreetMap contributors (ODbL). Human Design is
named descriptively; Ulune is independent of Jovian Archive. Every credit:
[ulune.app/credits](https://ulune.app/credits).

## Contributing

For now Ulune takes issues, not code: [report a bug, a wrong position or an
idea](https://github.com/ulune/ulune/issues/new/choose), after a look at
[CONTRIBUTING.md](CONTRIBUTING.md). Security problems go privately: see
[SECURITY.md](SECURITY.md).

## Contact

limiel.ulune@protonmail.com, for a question, a wrong position or a security
problem.
