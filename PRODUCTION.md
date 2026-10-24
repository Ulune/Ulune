# Production

How ulune.app runs, for whoever deploys it. Nothing here is secret: Ulune needs no keys to run. The synced account's secrets come only when sync launches, and live in the Vercel project, never here.

## The Vercel project

- **Build:** set by `vercel.json` (install `npm ci`, build `npm run build`); the build writes `.vercel/output` with Nitro's Vercel preset, and copies the engine, the ephemeris and the time zone map next to the server function (about 41 MB).
- **Node.js:** 22.x.
- **Functions:** Paris (`cdg1`) and a 90-second limit; the synced account's (`/api/account/**`) in Frankfurt (`fra1`), beside its future database, with 30 seconds; and the account's daily clean-up, `/api/account/cleanup` at 03:17 UTC, which refuses to run until `CRON_SECRET` is set. All set in `vite.config.ts`.
- **Git:** this repository; `main` is production, other branches get previews (see Branches and releases).
- **Skew Protection:** on, so a page and its files always come from the same deploy.
- **Deployment Protection:** previews behind Vercel Authentication (the standard setting).

## Environment variables

- **None to run.** Production needs no environment variable. Without the account's, every account operation answers `503 unavailable`, and the app offers no sync: Settings says it is "not available yet", and nothing else changes.
- **When sync launches** (not before; `docs/sync-protocol.md`, section 15, step by step): `ACCOUNT_DATABASE_URL` (set by Vercel's Neon integration: the database in Frankfurt, AWS eu-central-1, connected with the prefix `ACCOUNT_`), `ACCOUNT_SESSION_SECRET` (32 random bytes, marked Sensitive), `CRON_SECRET` (another 32, sent by Vercel with the daily clean-up) and, if ever needed, `ACCOUNT_ORIGINS` (the pages allowed to use passkeys; `https://ulune.app` by default). For Production only: a preview syncs only with a database of its own. `ULUNE_ACCOUNT_STORE=none` turns the account off again at any time, whatever else is set.
- **Never set:** any other database address (the prototype's `BETTER_AUTH_*` and `DATABASE_URL` are gone for good; the account reads only `ACCOUNT_DATABASE_URL`), analytics or advertising identifiers, or AI keys: readings written by an AI will use the reader's own key, kept on their device, never the server's.

## Domains

- `ulune.app` serves the site.
- `www.ulune.app`, `ulune.eu`, `www.ulune.eu`, `ulune.fr` and `www.ulune.fr` redirect permanently to `https://ulune.app`.
- The DNS records are the ones Vercel's Domains page shows for each name, entered at the registrar.

## Firewall and spending

- **Rate limits** (Vercel Firewall): `/api/report` and `/api/health`, 20 requests a minute per address. `/api/report` also refuses more than 60 a minute on its own.
- **When sync launches,** the account's five rules too (`docs/sync-protocol.md`, section 10; the server's own limits are per instance, so these are the real ones):
  1. `/api/account/v1/` (path starts with): 120 requests per 60 seconds per IP, then deny (429).
  2. The sign-in paths, `/api/account/v1/passkey/finish`, `/api/account/v1/passphrase/sign-in`, `/api/account/v1/recovery/sign-in`, `/api/account/v1/session/renew` and `/api/account/v1/link/take`: 20 per 60 seconds per IP, deny.
  3. `/api/account/v1/account/begin` and `/api/account/v1/account/create`: 10 per 10 minutes per IP, deny.
  4. `/api/account/v1/link/` (path starts with): 30 per 60 seconds per IP, deny.
  5. Deny `/api/account/cleanup` unless the request comes from Vercel's cron (user agent `vercel-cron/1.0`); the route checks `CRON_SECRET` anyway.
- **Attack Challenge Mode:** off, unless the site is under attack.
- **Spend management:** on, with a monthly cap and an alert before it.

## What stays off

- **Web Analytics and Speed Insights:** off. The privacy notice promises no analytics.
- **Log drains:** none. The server logs nothing about the people who use it; `/api/report` keeps one masked line per report.
- **The Vercel toolbar on production:** off.

## Watching it

- `/api/health` answers 200 with the version, the state of the engine and the time zone map; an uptime monitor may call it a few times an hour.

## Branches and releases

- **`main`** is what ulune.app serves: the 2.x line since 2.0's release. Every release is made here (2.0.1, 2.1.0, …), tagged (`v2.0.1`), and deployed by Vercel on push.
- **A fix** goes on `main` (a short-lived branch, or straight on `main`): fix, bump the version, add its entry at the top of What's new, tag, push.
- **A larger version** is built on a branch of its own beside `main`, as 2.0 was on `v2`. Every fix released on `main` goes into it at once, by merging `main` (never cherry-picking, so the two never disagree about what has been fixed); the branch leaves the version and the top of What's new alone until it is ready, so those merges stay free of conflicts. Each push gets a Vercel preview behind Vercel Authentication, never production.
- **Releasing a branch:** merge `main` into it one last time, run every check (the unit tests, all the end-to-end suites, the budgets, the deploy check, a Vercel preview), write the version and its What's new entry, then merge it into `main` (a fast-forward, since `main` is already inside it), tag and push.
- **What comes next:** the 2.0.x fixes on `main`; then 2.5 (the Log page, and notes everywhere); then 3.0.

What people have saved must keep opening: everything an earlier version's private space, backup or settings file holds still opens in the next one, and a new version never writes a file in a form that a version still in use would choke on.

**2.0 was released from `v2`** (24 October 2026): `main` (1.0.4) was already inside `v2`, so there was nothing to merge; `v2` became 2.0.0 and is merged into `main` as a fast-forward, tagged `v2.0.0`. Once `main` is pushed with it, `v2` can be deleted, on GitHub and on the Mac; CI runs on `v2` until then.

## At each release

1. Set `APP_VERSION` in `src/lib/app-identity.ts` and the version in `package.json` and `package-lock.json` (`npm version <version> --no-git-tag-version` sets both), and add the version at the top of `src/lib/changes.ts` (What's new) with the date. `scripts/changes.test.mjs` checks that they agree.
2. The checks on `main` are green (types, lint, unit and precision tests, build, deploy check), and so are the nightly end-to-end suites.
3. After the deploy: `/api/health` answers 200 with the new version, a chart casts, and the other domains redirect.
