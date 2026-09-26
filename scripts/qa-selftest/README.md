# Self-test runs (development)

For a browser this machine can only watch, not drive (Safari on the Mac), the
app can run its checks by itself (`src/lib/qa-selftest.ts`).

1. Once, create the report folder in the project root: `mkdir .qa-selftest`
   (git-ignored). Without it the dev server keeps no reports.
2. Open the development app with `?qa=<suite>`, for example
   `http://127.0.0.1:8097/?qa=safari`.
3. The page walks the suite. Each step runs under a yellow banner and key
   states stay on screen a few seconds, for screenshots. The report (steps,
   frame times, console messages, lost WebGL contexts) is saved as
   `.qa-selftest/reports/<time>-<suite>.json`.
4. At the end the page puts the reader's storage back as it was (Look,
   theme, last mode) and reloads without the flag.
5. A private space stays out of the run: if it is open (or opens by itself),
   it is locked, so none of the run's charts are written into it, and its
   sheets are closed as they come; unlock it again afterwards (one that stays
   unlocked on this device opens by itself). With no chart on screen, the run
   draws the sample chart first.

Suites: `natal` (hover, aspect labels, a pin, the theme switch, the entrance),
`3d` (enter, orbit and glide, wheel zoom, pan, the angle button, arrow keys),
`time` (the transit scrubber and Play, the progressions slider, a Timing year
and its table), `modes` (synastry, composite, Human Design, numerology),
`phone` (the app at 390 × 844 in a frame), `space` (the private space's
building blocks: what the browser offers for passkeys, Argon2id against the C
reference's answer, and a whole throwaway space in its own database, from
creating it to its backup, then erased), and `safari` (all six).

The space suite never opens the reader's own space. Passkeys need a person
(Touch ID), so it only asks the browser about them; try one by hand: Sign in,
make a space with a passkey, lock it, unlock it with the passkey.

Development only: `Shell.tsx` loads the run behind `import.meta.env.DEV`, and
the report route (`plugin.mjs`) exists only in `vite dev`, for local requests.
