# Production

How ulune.app runs, for whoever deploys it. Nothing here is secret: Ulune needs no keys.

## The Vercel project

- **Build:** set by `vercel.json` (install `npm ci`, build `npm run build`); the build writes `.vercel/output` with Nitro's Vercel preset, and copies the engine, the ephemeris and the time zone map next to the server function (about 41 MB).
- **Node.js:** 22.x.
- **Functions:** Paris (`cdg1`) and a 90-second limit, both set in `vite.config.ts`.
- **Git:** this repository; `main` is production, other branches get previews.
- **Skew Protection:** on, so a page and its files always come from the same deploy.
- **Deployment Protection:** previews behind Vercel Authentication (the standard setting).

## Environment variables

- **None.** Production needs no environment variable.
- **Never set:** a database address, an authentication secret (the prototype's `BETTER_AUTH_*` and database variables are gone for good), analytics or advertising identifiers, or AI keys: readings written by an AI will use the reader's own key, kept on their device, never the server's.

## Domains

- `ulune.app` serves the site.
- `www.ulune.app`, `ulune.eu`, `www.ulune.eu`, `ulune.fr` and `www.ulune.fr` redirect permanently to `https://ulune.app`.
- The DNS records are the ones Vercel's Domains page shows for each name, entered at the registrar.

## Firewall and spending

- **Rate limits** (Vercel Firewall): `/api/report` and `/api/health`, 20 requests a minute per address. `/api/report` also refuses more than 60 a minute on its own.
- **Attack Challenge Mode:** off, unless the site is under attack.
- **Spend management:** on, with a monthly cap and an alert before it.

## What stays off

- **Web Analytics and Speed Insights:** off. The privacy notice promises no analytics.
- **Log drains:** none. The server logs nothing about the people who use it; `/api/report` keeps one masked line per report.
- **The Vercel toolbar on production:** off.

## Watching it

- `/api/health` answers 200 with the state of the engine and the time zone map; an uptime monitor may call it a few times an hour.

## At each release

1. Set `APP_VERSION` in `src/lib/app-identity.ts`, and add the version at the top of `src/lib/changes.ts` (What's new) with the date.
2. The checks on `main` are green (types, lint, unit and precision tests, build, deploy check), and so are the nightly end-to-end suites.
3. After the deploy: `/api/health` answers 200, a chart casts, and the other domains redirect.
