# Production

How ulune.app runs, for whoever deploys it. Nothing here is secret: Ulune needs no keys.

## The Vercel project

- **Build:** set by `vercel.json` (install `npm ci`, build `npm run build`); the build writes `.vercel/output` with Nitro's Vercel preset, and copies the engine, the ephemeris and the time zone map next to the server function (about 41 MB).
- **Node.js:** 22.x.
- **Functions:** Paris (`cdg1`) and a 90-second limit, both set in `vite.config.ts`.
- **Git:** this repository; `main` is production, other branches (including `v2`, see Branches and releases) get previews.
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

## Branches and releases

Two lines run side by side, so a bug fix never waits for 2.0.

- **`main`** is what ulune.app serves: the 1.x line. Every release is made here (1.0.5, 1.1.0, …), tagged `v1.0.5`, and deployed by Vercel on push.
- **`v2`** carries the 2.0 work (new languages, the encyclopedia, the new page layout). It is never deployed to production; each push gets a Vercel preview behind Vercel Authentication, and CI runs its checks like `main`'s.

How a fix travels:

1. Fix it on `main` (a short-lived branch or straight on `main`), bump the version, tag, push: released.
2. Bring it into `v2` at once: `git switch v2 && git merge main`. Merge, never cherry-pick, so the two lines never disagree about what has been fixed.
3. `v2` leaves the version in `src/lib/app-identity.ts`, `package.json` and the top of `src/lib/changes.ts` alone while it is being built, so those merges stay free of conflicts. The 2.0.0 What's new entry and version are written on `v2` only when 2.0 is ready.

Rules for `v2` work that touches what people have saved: everything a 1.x private space, backup or settings file holds must still open in 2.0, and a 2.0 file is never written in a form 1.x would choke on while both lines are live.

Releasing 2.0: merge `main` into `v2` one last time, run every check (the unit tests, all the end-to-end suites, the budgets, the deploy check, a Vercel preview), then merge `v2` into `main` (a fast-forward, since `main` is already inside it), tag `v2.0.0` and push. `v2` is kept for 2.0.x fixes if 1.x is retired, or deleted.

## At each release

1. Set `APP_VERSION` in `src/lib/app-identity.ts`, and add the version at the top of `src/lib/changes.ts` (What's new) with the date.
2. The checks on `main` are green (types, lint, unit and precision tests, build, deploy check), and so are the nightly end-to-end suites.
3. After the deploy: `/api/health` answers 200, a chart casts, and the other domains redirect.
