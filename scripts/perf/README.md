# Performance measurements

The plan these serve: `the performance plan` in the project (live
doc: https://claude.ai/code/artifact/234d631c-02ac-4160-98ae-d75f35d6d12c).
Everything writes under `scripts/perf/.out/` (git-ignored); nothing else in
the repo is touched. Run from the repo root. Set `CHROME=/path/to/chrome` to
drive a particular Chromium (Playwright's own otherwise); compare runs made
with the same browser only.

| What | How |
|---|---|
| **Wheel** (hover, sweep, pin, unpin, theme, zoom on the real `ChartWheel`) | `node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/wheel/build.mjs` once after each change, then `node scripts/perf/wheel/ab.mjs natal classic base 3` (medians; variants `notrans`, `notips`, `nolift`, `nodefades`, `quiet`, `lean`) or `node scripts/perf/wheel/perf.mjs transit advanced hover,sweep,pin,theme`; one pin or theme switch task by task: `pinprof.mjs` / `themeprof.mjs transit classic`; a fresh wheel's entrance: `entrance.mjs natal classic 5` (fps, slow frames, work by kind, animations; `OVERRIDES="css"` for what-if runs) |
| **3D** (draws, GL calls, JS and garbage per frame, against a counting WebGL) | `node scripts/perf/gl3d/build.mjs && node scripts/perf/gl3d/harness.mjs` |
| **3D in the browser** (the wheel harness in 3D: entering, again, an orbit, a sweep, a pin, a theme switch) | after `build.mjs`: `node scripts/perf/wheel/view3d-med.mjs natal classic enter,reenter,orbit,sweep,pin,theme 3` (medians; `COUNT=1 node scripts/perf/wheel/view3d.mjs …` counts GL calls and draws per frame, `DPR=1` for a lighter stage); `WHEEL_DIST=scripts/perf/.out/<copy>` serves a saved build to compare two trees in one session; the 3D view's own framebuffer, hashed in 8 states: `fb3d.mjs natal all` (`SAVE=dir` writes them); JS profile of a 3D sweep: `D3=1 node scripts/perf/wheel/jsprof.mjs natal all` |
| **Server** (every calculation, warm, and the size of each answer) | `node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/server-bench.mjs` (add `--cpu-prof` for a profile) |
| **Interpolation** (Hermite between Swiss samples, arcseconds) | `node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/interpolation-check.mjs 60` |
| **Render** (render phase of the wheel, grid, panels; production React) | `NODE_ENV=production node --experimental-strip-types --import ./scripts/perf/register.mjs scripts/perf/render-bench.mjs` |
| **Timing views** (month and year grids, labels, scope filter) | `NODE_ENV=production node --experimental-strip-types --import ./scripts/perf/register.mjs scripts/perf/timing-bench.mjs` |
| **Load** (first and returning visits, Slow/Fast 4G at 4× CPU) | `npm run build`, then `node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/load/make-row.mjs`, `node scripts/perf/load/serve.mjs &` and `node scripts/perf/load/measure.mjs slow4g returning` (scenarios `first`, `returning`, `returning-fr`, and `returning-fv` / `returning-fv-fr` with the first view after `node scripts/perf/load/make-first-view.mjs`; `NOFONTS=1` loads no web fonts, as the baseline ran) |
| **Downloads per page** (gzip per file, up front and after the load) | with `serve.mjs` running: `node scripts/perf/load/chunks.mjs` (`--returning` for a saved chart) |
| **What is in each chunk** | `npx vite build --config scripts/perf/load/analyze.vite.config.mjs`, then `node scripts/perf/load/chunk-report.mjs`; `node scripts/perf/load/graph.mjs --why <module>` shows why a module is in the first download |

The wheel page is QA chart A (Paris, 15 Jun 1990, 12:00) and its transits on
24 Sep 2026, an 830 px wheel at DPR 2 on a 1000 × 860 stage.

## Baseline and Phase 0 (24 Sep 2026)

Cloud test machine, 2 cores, software rendering, Chromium headless shell;
medians of 3. The picture after Phase 0 is pixel-identical to the baseline.

| Wheel | | Sweep work | Sweep fps | Frames > 20 ms | Pin work | Pin longest task | Unpin work |
|---|---|---|---|---|---|---|---|
| Natal, classic | baseline | 1,990 ms | 34 | 40 | 105 ms | 31 ms | 97 ms |
| | Phase 0 | 1,854 ms | 41 | 35 | 137 ms | 25 ms | 74 ms |
| Transit bi-wheel, advanced | baseline | 3,819 ms | 9.3 | 17 | 514 ms | 145 ms | 317 ms |
| | Phase 0 | 2,949 ms | 11.5 | 22 | 395 ms | 77 ms | 240 ms |

A pin now paints its highlight first and builds the relief in a second task:
the longest task is shorter, the natal total a little higher. The bi-wheel
draws more frames per sweep, so more of them count as over 20 ms.

Theme switch, worst frame: natal 150 → 100 ms, bi-wheel 650 → 233 ms. The
cross-fade itself costs Chromium about four extra full style passes (capture,
start, end), so the bi-wheel's total theme work rose from 267 to 430 ms; each
pass shrinks with the wheel's node count (Phase 2).

Timing views (`timing-bench`): month grid 17.6 → 1.8 ms, year grid 206 →
4.4 ms, table labels 36.9 → 1.2 ms, scope filter 3.7 → 0.9 ms. Client
JavaScript: 590.2 → 583.9 KB gz (`tailwind-merge` gone).

## Phase 1: loading (24 Sep 2026)

Production build served locally (brotli, HTTP/1.1), Chromium headless shell
with 4× CPU, a 390 × 844 phone at DPR 2; medians of 3. The picture at rest is
pixel-identical to the baseline in every mode, wheel and table, both themes,
phone and desktop. The baseline could not reach Google Fonts from the test
machine, so it ran without web fonts; Phase 1's fonts ship with the app and
are counted, and the "no fonts" rows compare like with like.

| Downloads (gzip) | Baseline | Phase 1 |
|---|---|---|
| `/`: JavaScript with the load | 564.0 KB, 10 files | 251.5 KB, 26 files |
| `/login`, `/settings` | 321.2, 320.6 KB | 155.0, 155.3 KB |
| Unknown page | 317.9 KB, status 200 | 151.6 KB, status 404 |
| Render-blocking CSS | 28.9 KB + Google's stylesheet | 29.8 KB, with every `@font-face` and the 5 KB chart-symbol font inlined |
| After the load, returning reader | — | the reading text 72 KB (EN) / 80 KB (FR), then modes and tables at idle |

| Load run (ms) | Slow 4G before | Slow 4G after | Fast 4G before | Fast 4G after |
|---|---|---|---|---|
| First visit: first paint | 948 | 952 (968 no fonts) | 440 | 484 (528) |
| First visit: form ready | 2,758 | 2,214 (2,056) | 807 | 852 (817) |
| Returning: first paint | 956 | 996 (964) | 428 | 536 (476) |
| Returning: their chart's zodiac and houses (first view) | 4,053 with the wheel | 1,100 (1,088) | 2,088 with the wheel | 572 (528) |
| Returning: the wheel with its planets | 4,053 | 3,014 (2,927) | 2,088 | 1,605 (1,725) |
| Returning in French: the wheel | 4,126 | 3,080 | 1,997 | 1,785 |
| Returning: longest task | 1,020 | 851 (974) | 1,087 | 861 (915) |

The first paint of a returning visit is 40–120 ms later than before: the
reader's Look is now applied before it (no flash of the default Look), and
with the first view it draws the chart's ~500 frame marks. From then on the
wheel's mount is the longest task (0.8–0.9 s at 4× CPU): Phase 2.

Signed-in start-up (dev server, two charts): one session request instead of
two plus one per remount of a user reader; the AI keys at idle; the charts
from this device at once, then only ids and change times (0.4 KB) when
nothing changed, where the whole library came each time (172 KB of JSON for
two charts).

Chunks: TanStack Start lists a page's chunks and their direct imports only,
and Rolldown does not hoist deeper imports, so ten chunks (the UI text and
most of the natal wheel among them) were fetched a round trip late. The app
and the wheel now ship as chunks the page names up front (`vite.config.ts`,
`codeSplitting.groups`): 41 → 20 modulepreloads, 57 → 26 files.

## Phase 2: the flat wheel (25 Sep 2026, parts 1–4)

Wheel harness (`ab.mjs … base 3`), cloud test machine, medians of 3; the
Phase 1 tree and this one measured in the same session, interleaved. The
sweep crosses 10 planets; a pin is timed for 900 ms after the click.

| Wheel | | Sweep work | Sweep fps | Frames > 20 ms | Worst frame | Pin work | Pin longest task | Pin worst frame | Unpin work |
|---|---|---|---|---|---|---|---|---|---|
| Natal, classic | Phase 1 | 1,739 ms | 42.7 | 27 | 100 ms | 122 ms | 22 ms | 17 ms | 90 ms |
| | Phase 2 | 855 ms | 57.1 | 7 | 33 ms | 80 ms | 14 ms | 17 ms | 58 ms |
| Transit bi-wheel, classic (default) | Phase 1 | 1,887 ms | 37.4 | 39 | 83 ms | 119 ms | 26 ms | 17 ms | 92 ms |
| | Phase 2 | 945 ms | 55.3 | 10 | 50 ms | 84 ms | 13 ms | 17 ms | 63 ms |
| Transit bi-wheel, advanced | Phase 1 | 2,877 ms | 10.9 | 21 | 250 ms | 375 ms | 70 ms | 117 ms | 246 ms |
| | Phase 2 | 1,822 ms | 35.6 | 31 | 100 ms | 110 ms | 17 ms | 33 ms | 86 ms |

Theme switch (`perf.mjs … theme`, medians of 3), work / longest task /
worst frame: natal 225 / 54 / 100 ms before, 204 / 54 / 117 ms after;
advanced bi-wheel 409 / 155 / 217 ms before, 459 / 151 / 217 ms after (the
same within this machine's noise).

What each part did, and what it was worth:

- **Composited focus fades** (`src/components/wheel-fade.ts`): the live wheel
  snaps to each focus and a copy of the wheel as it was (built at idle, on
  the page's background) fades out over it, one layer's opacity on the
  compositor. The per-node fades come back with
  `localStorage["ulune.debug.fades"] = "node"` (harness: `&fades=node`, ab
  variant `nodefades`) for comparing. On the default bi-wheel, the per-node
  fades switched back on (everything else as now) sweep at 36.1 fps with
  1,906 ms of work, against 53.5 fps and 1,010 ms composited.
- **What restyled the whole wheel:** the hand cursor set on the `<svg>` (an
  inherited property: 4,254 nodes restyled on every hover), the dim rules
  keyed on `[data-kind]` (an attribute every node carries), the pin's
  `data-focus-fade` toggle, and the stage's closed-hand cursor on every press
  (now only when zoomed, where a drag moves the wheel). The copy has a cursor
  of its own and steps aside while the page's theme or Look changes.
- **Lean pinned relief** (decided): the busy bi-wheel's pin raises 11 pieces
  instead of 62 (225 nodes instead of 962, 23 SVGs instead of 92).
- **Difference-only painting:** `paintWheelFocus` 100 → 25 ms over a busy
  bi-wheel sweep (JS profile, `jsprof.mjs`).
- **Fewer renders:** a memoized zodiac, the 3D lens zoom in its bar, content-
  keyed body sets, the orb slider redrawing at most every 120 ms, the phone
  sheet's drag outside React.

New tools: `pinprof.mjs` and `themeprof.mjs` (a pin or a theme switch, task by
task, with a JS profile), ab variants `nodefades`, `tipsnap`, `partsnap`,
`aspsnap`, `restsnap` (which per-node fades cost what). The harness build now
inlines the lazy chunks (`codeSplitting: false`) and serves the self-hosted
fonts.

## Phase 2, part 5: one shape per aspect (25 Sep 2026)

An aspect was about 27 nodes: its line group (the line, six taper steps, a hit
line carrying a `<title>`, a casing) plus a hidden lit copy (~9) and a hidden
glyph mark (~6). Now the group holds the line, one filled path for both
tapered ends (`src/lib/chart/aspect-taper.ts`, re-cut by the focus paint for
the lit width), the casing under a major line and the chevron where shown.
The focus painter makes the lit copy and a focus-only glyph while the line is
lit and removes them after (`src/lib/chart/wheel-focus.ts`; glyphs from one
template per aspect type in the wheel's `<defs>`). The browser's tooltip gives
way to one Ulune label for the page (`src/components/wheel-tip.ts`).

Harness, medians of 3 (entrance: medians of 5), part 4 and part 5 in the same
session. Entrance frames over 20 ms as a share of the frames drawn.

| Wheel | | Nodes at rest | Sweep work | Sweep fps | Pin work | Unpin work | Entrance fps | Entrance frames > 20 ms | Entrance animations |
|---|---|---|---|---|---|---|---|---|---|
| Natal, classic | part 4 | 1,205 | 1,012 ms | 55.6 | 125 ms | 56 ms | 50.7 | 11% | 223 |
| | part 5 | 944 | 873 ms | 57.8 | 93 ms | 44 ms | 55.3 | 4% | 133 |
| Transit bi-wheel, classic | part 4 | 1,665 | 1,156 ms | 51.5 | 98 ms | 68 ms | 40.7 | 26% | 311 |
| | part 5 | 1,048 | 979 ms | 54.2 | 86 ms | 57 ms | 49.1 | 15% | 166 |
| Transit bi-wheel, advanced | part 4 | 3,920 | 2,046 ms | 32.1 | 136 ms | 119 ms | 13.7 | 70% | 817 |
| | part 5 | 1,637 | 1,394 ms | 43.6 | 88 ms | 62 ms | 31.6 | 46% | 327 |

Settled pictures against part 4 (rest, hover, pin, pin with the pointer
away, let go; natal, transits, synastry; 1280 dark and light, 390 dark): the
same but for the tapered ends, where a step's edge can land a shade apart
(at most ~800 pixels of a stage, all on the aspect circle), and the new label
where the pointer rests on a line.

New tool: `entrance.mjs` (the harness remounts the wheel, `__h.remount()`).

## Phase 2, part 6: the entrance in groups (25 Sep 2026)

The same choreography with fewer animations. An aspect arrives as one piece:
its group fades (`g[data-arrive]`) and a solid line in it still draws itself.
A sign's three decans fade together (`[data-decans]`, at the middle decan's
old moment, within 11 ms of each). A fresh wheel is styled once: the fit also
wrote its size as a custom property on the zoom port, which every node
inherits and nothing read, so the whole wheel restyled again as the zodiac
began to bloom (64 ms on the busy bi-wheel); and the rule hiding the 1° ticks
on a small wheel names its two paths by a class, so setting the fit band no
longer restyles every node with a `data-kind`. Seen side by side and
approved: chevrons, casings and the start dots of solid lines no longer show
before their line.

Harness, medians of 5, part 4 and part 6 in the same session.

| Wheel | | Entrance fps | Frames > 20 ms | Longest frame | Main-thread work | Animations |
|---|---|---|---|---|---|---|
| Natal, classic | part 4 | 50.7 | 11% | 150 ms | 1,069 ms | 223 |
| | part 6 | 58.4 | 2% | 50 ms | 895 ms | 104 |
| Transit bi-wheel, classic | part 4 | 40.7 | 26% | 133 ms | 1,073 ms | 311 |
| | part 6 | 51.9 | 14% | 67 ms | 887 ms | 133 |
| Transit bi-wheel, advanced | part 4 | 13.7 | 70% | 567 ms | 1,138 ms | 817 |
| | part 6 | 42.6 | 30% | 117 ms | 1,087 ms | 248 |

What-if runs on the busy bi-wheel (`OVERRIDES`, medians of 3): with every
per-node entrance animation off it reaches 48 fps here, so what is left is
the zodiac's, houses' and planets' own animations. On this machine the
entrance is bound by raster (software GL): the main thread is busy 10–20 ms
per frame. Settled pictures are unchanged from part 5.

In the classic look, the aspect glyphs shown at rest still come in with the
wheel, before their lines.

## Phase 2, part 7: the theme without a wheel render (25 Sep 2026)

The theme changed one thing in the wheel's own drawing: the aspect lines'
opacities. Both themes' values are carried on each line (`data-o-*`,
`data-ol-*`) and the focus paint writes the page theme's own, repainting
inside the switch's cross-fade; the chevrons and the configurations' fills
take theirs from CSS per theme. After a switch the markup is a fresh load's in
that theme (natal and busy bi-wheel, at rest and pinned; the lit copies of a
pinned focus used to keep the old theme's opacity).

Theme switch dark to light (`perf.mjs … theme`, 5 runs each, medians), part 6
→ part 7, natal / default bi-wheel / busy bi-wheel: script 26 / 28 / 31 → 17 /
18 / 15 ms; total work 206 / 169 / 221 → 198 / 183 / 233 ms (unchanged within
this machine's noise). What is left is the view transition itself: Chrome
restyles the whole page five or six times over one, its generated style sheet
changing at each step (a transition with no change at all costs 362 ms of
style on the busy bi-wheel's page, its fade copy included).
Moving the `theme-switching` class into the update made it worse (the old
picture's capture then restyled the page with every transition live: 101 →
194 ms).

## Phase 2, part 8: time steps without replayed arrivals (25 Sep 2026)

When the transit time changes, the aspect list reorders around the new cross
aspects and React moves the nodes in between; a moved node starts its CSS
animations over, so every time step replayed the arrival of most natal lines
(busy bi-wheel: 52 of 66 faded out and redrew themselves). An aspect is now
marked once its own arrival is over (`data-seen`) and never plays it again.
In a time jump's glide, the lines appearing with it start their arrival
finished (it played unseen under the glide's own fade), and the cross
aspects' hold before that fade is a delay instead of flat keyframes (a held
value costs nothing per frame). The bodies' turn is unchanged: from one frame
loop it would do the same style and paint work, and on this machine it moves
the main thread, not the frame rate (without it: 450 ms of work instead of
647, 56 fps either way once the arrivals are gone).

`glide.mjs` (the harness jumps its transits a month on, `__h.jump()`), medians
of 5, part 7 → part 8: busy bi-wheel 49.9 → 54.8 fps, frames over 20 ms 12 →
5, worst frame 67 → 67 ms, animations running 252 → 121; default bi-wheel
59.4 → 59.4 fps (already smooth). The entrance frames are unchanged (paused
and compared at 12 moments, natal and busy bi-wheel: 0 pixels apart).

**2.10, the canvas option, not done.** With the aspect web taken out of the
SVG altogether (ab variant `noweb`: the most a canvas could save), the busy
bi-wheel sweeps at 51.5 fps instead of 42.8 (1,200 ms of work instead of
1,512) and assembles at 51.3 fps instead of 42.6; natal gains nothing (57.6 →
58.7). A canvas would split the wheel into layers around it, draw its lines
unlike the SVG's and blur when zoomed.

## Phase 3: 3D in the browser (25 Sep 2026)

The wheel harness opens in 3D with `?view=3d` (or `__h.d3(true)`), and
`view3d.mjs` measures it in the real renderer: the time from the toggle to the
first frame with the canvas on stage, the build, an orbit (dragCamera each
frame, 2 s at 90°/s), a sweep over the planets where the view draws them, a
pin, a theme switch. On this machine WebGL is software (SwiftShader): a busy
chart draws 2–6 frames a second in 3D and the main thread waits on it in
"Commit", so frame rates here say nothing about a real GPU; what the page
itself spends (script, style, the work per frame in rAF, garbage) does.

Baseline (part 8), DPR 2, medians of 3, natal classic / busy bi-wheel
(transit advanced) / every body (natal all):

| | natal | busy bi-wheel | every body |
|---|---|---|---|
| First frame on stage, cold / again | 722 / 292 ms | 1,191 / 391 ms | 1,330 / 464 ms |
| Build (pictures, atlas, meshes) | 159 ms | 230 ms | 299 ms |
| Orbit: script per frame | 2.6 ms | 5.1 ms | 4.9 ms |
| Sweep: script, style | 353, 58 ms | 1,288, 194 ms | 2,137, 365 ms |
| Theme switch: builds, script | 3, 398 ms | 3, 520 ms | 3, 628 ms |
| Draws / GL calls per orbit frame (natal, COUNT=1) | 96 / 931 | | |

A 3D sweep was mostly `querySelector`: each hover painted the hidden live
chart, and the view read each body's and line's state back with a query per
body and per line (227 ms of a 24-planet sweep on the busiest chart).

Screenshots of a hovered 3D stage vary from run to run here (the compositor,
not the GL output), and a fixed wait can catch a camera move on a slow chart
before it ends; `fb3d.mjs` hashes the view's own framebuffer after the depth
loop has stopped, which is exact.

### Part 9: housekeeping, one redraw per theme switch, hovers without the hidden chart

- The view is handed the focus itself (`setFocus(focus, …)`); what is lit
  comes from each body's and line's attributes read once per build
  (`focusKeyOf`, the painter's own rule `inWheelFocus`). With the view on
  stage the hidden chart is not painted; it is painted again as the view
  closes.
- A theme switch drew the pictures three times (a wait for colours that no
  longer ease, and a redraw on any class change of the page): now once.
  Builds asked for before one has read the chart are merged; only the chart's
  own fonts hold a build up or redraw it.
- Indexed tubes (the same triangles: 429 vertices a tube, 110 a dash, instead
  of 2,304 and 540), solid meshes kept when unchanged, no redraw for a spring
  still waiting on its delay, the anisotropy extension looked up once, the
  canvas grown in 64 px steps while the stage is resized, QA handles only for
  automation (or `localStorage["ulune.debug.3d"] = "1"`).

Part 8 → part 9, medians of 3: sweep script 353 / 1,288 / 2,137 → 228 / 609 /
930 ms, style 58 / 194 / 365 → 8 / 15 / 19 ms; theme switch 3 → 1 build,
script 398 / 520 / 628 → 85 / 159 / 196 ms; entering and orbiting unchanged
within noise. Framebuffers bit-identical in 8 states × 3 charts.

The counting harness (`gl3d`) measures garbage by the heap between two
points, which the collector runs through; `alloc-prof.mjs` samples every
allocation instead: detailed natal, about 615 KB per frame drawn and 465 KB
per pick, mostly the curve sampling (`bezier`, `Math.hypot`'s own arrays),
`dashSegments` and the binormal.

### Part 10: frames and picking without garbage

Every orbit frame recomputed each tube's length, bend plane and dashes, and
the curve helpers made arrays at every sample (`bezier`, and `Math.hypot`,
which V8 gives an array of its own on every call); a pick sampled every tube
17 times the same way. Now a tube keeps its shape while its ends, bend,
radius and dash scale stay (a camera move reuses it all), the frame's lists,
matrices and points are reused, the sorts are stable insertion sorts (the
same order as a stable sort, without a comparator returning a boxed number
per comparison), and the curve and length helpers write into scratch arrays
(`bezierInto`, `bezierLengthOf`, `tubeBinormalOf`, `projectInto`, `hypot2`
and `hypot3`: V8's own algorithm, so the same bits in Chrome; tested against
the plain helpers in `gl-meshes.test.mjs`).

Part 9 → part 10, browser, medians of 3, natal / busy bi-wheel / every body:
orbit script per frame 2.5 / 4.3 / 6.2 → 2.1 / 2.1 / 2.7 ms (most of what is
left is the WebGL calls themselves), collections during a 2 s orbit 3 / 3 / 2
→ 0; sweep script 228 / 609 / 930 → 222 / 525 / 772 ms; pin script 58 / 55 /
66 → 52 / 50 / 51 ms. Counting harness (V8, mock GL): JS per frame 0.29 /
0.60 / 1.79 / 0.99 → 0.12 / 0.20 / 0.33 / 0.26 ms (default / detailed / every
body / bi-wheel); sampled garbage per frame (detailed) about 615 → 100 KB,
per pick 465 → 70 KB; collections over 400 frames 29 / 54 / 78 / 32 → 15 /
10 / 6 / 6. Framebuffers bit-identical to part 8's in 11 states × 3 charts
(the 8 at rest, and three moments of the entry: dashes long, tubes rising).

### Part 11: the instanced renderer (3.3)

Every tube, dash, stem, contact shadow, planet, label and mark was a draw of
its own, with 7 to 11 uniforms set before it. Where the context is WebGL 2
(Chrome, Safari 15 and later) they now go into two instance lists and are
drawn with `drawElementsInstanced` / `drawArraysInstanced`
(`gl/gl-instanced.ts`): the tube and quad shaders take the same numbers as
per-instance attributes (GLSL ES 3.00, `flat` so they stay exact across a
triangle), in exactly the order the draws went (a new run starts where the
mesh changes between a tube and a dash), so the picture is the same to the
bit. WebGL 1 keeps the draw-per-piece path; so does
`localStorage["ulune.debug.gl"] = "classic"`, for comparing.

Real browser, per orbit frame (`COUNT=1 view3d.mjs … orbit`), part 8 → part
11: natal 924 GL calls and 95 draws → 383 and 19; busy bi-wheel 4,320 and 962
→ 838 and 58; every body 5,991 and 1,329 → 1,106 and 80. Orbit script per
frame, part 10 → part 11: natal 2.1 → 1.5 ms, busy bi-wheel 2.1 → 1.8 ms,
every body 2.7 → 1.7 ms. (Software GL draws no faster for it: its time goes
to shading pixels. A real GPU's driver pays per draw call, which is what this
removes.) Framebuffers bit-identical to part 8's in 11 states × 3 charts.
What remains per run is attribute pointers (no base instance in WebGL 2);
vertex array objects would take off the enable/disable churn.

### Part 12: entering 3D again, and rebuilds that keep what did not change (3.2, 3.6)

- **A context that outlives its view for a moment.** Closing 3D lost the
  WebGL context and everything on it; opening it again made a new one,
  compiled every program and drew and uploaded every picture. Now the closing
  view parks the context (its canvas off the page and down to 1 px) with its
  programs, meshes and pictures; the next view takes it over. Parked 30 s
  unused, it goes. Once the 3D view's code has loaded (the pointer near its
  button), the context is made ahead at idle, so the first entry compiles
  nothing either.
- **Pictures kept by what drew them.** The chart's picture is kept with its
  markup, the page's styles around it (classes, inline styles and data from
  the chart up: the theme, the Look, the chart's settings), the fonts loaded,
  its size and place; the same again and the one on the GPU is used as it is.
  Each cell of the atlas (a planet, a label, an aspect's mark) is kept the
  same way as its own canvas, and placed again where nothing changed: a time
  step redraws only the cells that moved (98 of 164 kept on the busy
  bi-wheel). The marks the atlas draws are made in one pass over the chart
  (`tempAspectMarks`; one query per mark made it quadratic: 35 ms on the busy
  bi-wheel). All programs are compiled, then linked, and only then checked.
- **Cost:** the signatures take 2–24 ms of a build (the plate's markup, the
  cells'), where nothing can be kept.

Part 11 → part 12, medians of 3, natal / busy bi-wheel / every body: opening
3D again, first frame on stage 271 / 374 / 456 ms → 72 / 134 / 140 ms, the
build 129 / 187 / 235 → 18 / 27 / 26 ms (nothing drawn, nothing uploaded);
the first entry unchanged (this machine's first frames dominate it). A time
jump on the busy bi-wheel in 3D: build about 200 → 129 ms. Framebuffers
bit-identical to part 8's in 14 states × 3 charts (the 11, and reopened, a
time jump, another preset: pictures kept, cells kept and cells redrawn).

### Part 13: two picture changes, behind flags until decided

Two remaining 3D changes alter the picture a little; they are shown side by
side on the review page (https://claude.ai/artifact/5f6aeTp7p9CcGShcL81dDG)
and sit behind QA flags with today's behaviour as the default:

- `localStorage["ulune.debug.tex"]`: the chart picture's size. `pot` (today:
  1.3× the stage's device pixels rounded up to a power of two, which jumps to
  4096 past a stage of about 790 px on a Retina screen), `npot` (to the
  pixel: WebGL 2 mipmaps any size), `npot2048` (to the pixel, at most 2048 at
  the fit). The harness takes `?tex=…`.
- `localStorage["ulune.debug.gldpr"]`: the canvas's device-pixel cap, `3`
  (today) or `2`. The harness takes `?gldpr=…`, and `?w=…&h=…` sizes its
  stage.

Emulating a wide Retina stage (the harness at DPR 2.4), `pot` → `npot` →
`npot2048`: busy bi-wheel build on entering 395 → 258 → 227 ms, a time step
240 → 162 → 151 ms, texture 85 → 24 → 21 MB; natal build 284 → 150 → 142 ms.
About 3% of the stage's pixels differ, by a few shades at small text's edges.
On a 3× screen, cap 3 → 2: natal first frame 1,154 → 673 ms, build 318 → 140
ms; busy bi-wheel time step 277 → 140 ms; 4.4 → 2.0 M pixels a frame; visibly
softer edges up close. `buildprof.mjs` profiles entering 3D (or a rebuild,
`REBUILD=1`) by function.

### Part 14: the two picture changes, decided ("B and cap")

The chart picture is sized to the pixel wherever WebGL 2 is (`npot`), and the
3D canvas draws at most 2 device pixels per CSS pixel. `localStorage
["ulune.debug.tex"] = "pot"` and `["ulune.debug.gldpr"] = "3"` bring back the
earlier behaviour. The new defaults draw bit-identically to part 13 with the
flags set, and the old flags to part 13's defaults (fb3d.mjs, 14 states × 3
charts at DPR 2, one chart at DPR 3; `EXTRA="&tex=…&gldpr=…"`, `DPR=3`).

## Phase 4: data and server (25–26 Sep 2026)

| What | How |
|---|---|
| **Scrubbing** (the transit scrubber dragged at 60 Hz for 2 s over 20 days on a served build: wheel updates per second, server casts during the drag, time from letting go to the exact sky) | `npm run build`, `node scripts/perf/load/serve.mjs &` (it links the build's `ephe/` and `swisseph.wasm` into its working directory, as Vercel's), then `ULUNE_DEV=http://127.0.0.1:9311 node scripts/perf/wheel/scrub.mjs 3 1` (runs, CPU slowdown) |
| **Server** | `server-bench.mjs` as before |

### The scrub window (4.4, with 4.1 and 4.2)

While the time moves (dragging the scrubber, the arrow keys, Play, the
progressions slider), the sky is drawn on the client from a window of Swiss
samples: every body's longitude and speed, the sidereal time at Greenwich
and the true obliquity every 12 hours, in chunks of 32 days
(`src/lib/chart/sky-window.ts`, `/api/sky-window?t0=…`, 30 KB, 12 KB brotli,
52–60 ms to compute warm, kept a year by the edge and the browser). Since part
53 each chunk also carries the sky's own events for the calendar (phases,
eclipses, sign changes, stations, void-of-course spans, exact aspects: about
130, 9 KB of the chunk's 39; 120–160 ms warm with them), found on Swiss
(`src/lib/chart/sky-search.ts`, `scripts/sky-events.test.mjs`). Bodies
follow the cubic Hermite curve through both samples; the Ascendant,
Midheaven and Vertex are rebuilt from the interpolated sidereal time with
Swiss's own formulas (checked against `swe_houses_armc` to 4e-10″, the
Vertex's tropical swap included). Against the exact casts at random moments
and places: the Moon within 0.04″, Lilith 0.5″, everything else a few
thousandths; houses, motion and all 15,412 aspects of 60 skies identical
(`scripts/sky-window.test.mjs`). The exact cast replaces it once the moment
holds still for 150 ms; the tables show the exact times as "…" meanwhile.
Exact casts are kept per moment and chart in the tab, and a newer moment
aborts the one in flight.

Production build, test machine, 1× CPU, medians of 3 (`scrub.mjs`): during a
60 Hz drag the wheel moved 0 times a second before (the 50 ms debounce never
fired; nothing moved until letting go) and moves 26 times a second now, with
no server call; the exact sky follows 184 ms after letting go before, about
300 ms now (the 150 ms wait included). Play moves time every frame (one day
per second) instead of a cast every 300 ms. Outside the polar circles only:
there the exact casts carry on as before.

### Timing (4.3, 4.2)

The exacts are found as before (the same samples, the same sign changes, the
same polishing on the ephemeris), but each crossing is first located on the
Hermite curve between its two samples instead of by bisecting the ephemeris,
and the ephemeris at a sample's own day, or at a day just evaluated, is not
asked again. `server-bench`: timing month 156 → 39 ms, year 1,703 → 360 ms,
the same 2,784 exacts. Over 30 random chart-years (85,142 exacts), 85,088
exact times are identical to the second and 54 are one second apart (a true
exact near the half second: 42 equally close, 8 now closer, 4 before); none
appears or disappears (`probe/timing-sweep.mjs`, `probe/shift-check.mjs`).
The client keeps each month and year it has cast (switching day and month
views asks for nothing) and aborts what a newer view replaced. The year
table shows its first 250 rows at once and the rest in slices of 250 between
frames: longest task 1,115 → about 220 ms on this machine (Copy and CSV put
in the last rows first).

### Charts on the device (4.5, in part)

Saved charts are kept without their aspects and midpoints (rebuilt exactly
on load: `scripts/chart-store.test.mjs`), 46.3 → 18.4 KB each, so a
library fits about 2.5 times as many charts in the browser's ~5 MB. Charts
cast under older rules are kept whole until they are recast. The transit and
progression answers keep their shape (the scrub window took their size out
of the scrub).

## Phase 5: guardrails (26 Sep 2026)

`npm run budgets` (or `… budgets.mjs server,3d,wheel,bundle,scrub`) checks
each measure against a limit on this test machine and exits non-zero when
one is over: the calculations (first cast, warm cast and its answer, the
transit sky with exact times, a timing month and year, a scrub window chunk),
the 3D counting harness (GL calls and garbage per frame, four charts), the
wheel (nodes at rest per preset, none with a transition of its own), what
"/" downloads for a returning reader (`bundle`, with `serve.mjs` on :9311
after `npm run build`), and the scrub (`scrub`, the same served build). The
limits sit a little above today's numbers, so a regression fails; the
plan's goals are in the plan. On 26 Sep 2026 all 31 were within budget:

| Budget | Today | Limit |
|---|---|---|
| First cast (cold) / warm cast / its answer | 132 ms / 2.8 ms / 46 KB | 1,000 ms / 50 ms / 60 KB |
| Transit sky with exact times | 126 ms | 200 ms |
| Timing month / year / year's answer | 38 ms / 355 ms / 367 KB | 100 ms / 600 ms / 400 KB |
| Scrub window chunk / size | 58 ms / 29 KB | 150 ms / 35 KB |
| 3D GL calls per frame: natal / detailed / every body / bi-wheel | 304 / 532 / 1,156 / 785 | 360 / 620 / 1,300 / 900 |
| 3D garbage per frame | 2–8 KB | 8–16 KB |
| Wheel nodes: natal classic / advanced, transit classic / advanced | 956 / 1,231 / 1,060 / 1,649 | 1,050 / 1,350 / 1,170 / 1,800 |
| Nodes with their own transition | 0 | 0 |
| "/" JavaScript with the load, returning reader / style sheets / largest script | 256 / 39 / 73 KB gz | 262 / 42 / 80 KB gz |
| Scrub: wheel updates per second / casts during the drag / exact sky after | 26 / 0 / 258 ms | ≥ 20 / 0 / 600 ms |

Since part 55 (28 Sep 2026) the style sheets are counted twice: those the
first paint waits for (30.8 KB gz, limit 32) and all of them once the modes'
own have loaded after it (42.8 KB, limit 44; the calendar's month, bar and
Now panel added 0.9 KB there, none up front).

The `?perf` overlay (5.6): add `?perf` to the address (or set
`localStorage["ulune.debug.perf"] = "1"`) and a panel in the bottom-right
corner shows, once a second, the frames per second, the long tasks of the
last ten seconds and the longest, the wheel's node count, whether 3D is on
and the JS heap (Chrome). Plain DOM, loaded only when asked for; nothing is
sent anywhere.
