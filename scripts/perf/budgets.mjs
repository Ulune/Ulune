// Performance budgets (plan, Phase 5): each measure against its limit on
// this test machine, pass or fail, and a non-zero exit when one fails.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/budgets.mjs [server,3d,wheel,bundle,scrub]
//
// server  the chart calculations in this process (warm, and the first cast)
// 3d      the counting WebGL harness (scripts/perf/gl3d/build.mjs first)
// wheel   node counts and per-node transitions (scripts/perf/wheel/build.mjs first)
// bundle  what "/" downloads for a returning reader (npm run build, serve.mjs on :9311)
// scrub   wheel updates per second while the scrubber is dragged (the same served build)
//
// The limits are this machine's (2 cores, software rendering); a Mac is
// several times faster. They sit a little above what the app does today, so
// a regression fails and today passes; the plan's goals are in the notes.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./paths.mjs";

const want = new Set((process.argv[2] ?? "server,3d,wheel").split(","));
const rows = [];
const check = (area, what, value, limit, unit, better = "lower") => {
  const ok = better === "lower" ? value <= limit : value >= limit;
  rows.push({ area, what, value, limit, unit, better, ok });
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const node = (args, env = {}) =>
  execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 << 20 });

if (want.has("server")) {
  const calc = await import("../../src/lib/chart/calculate.server.ts");
  const { chunkStart } = await import("../../src/lib/chart/sky-window.ts");
  const t = () => performance.now();
  let s = t();
  const natal = await calc.calculateNatal({ name: "", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 });
  check("server", "first cast (cold engine)", t() - s, 1000, "ms");
  const warm = [];
  for (let i = 0; i < 9; i += 1) {
    s = t();
    await calc.calculateNatal({ name: "", placeLabel: "Paris", date: "1990-06-15", time: `12:0${i}`, latitude: 48.8566, longitude: 2.3522 });
    warm.push(t() - s);
  }
  check("server", "cast, warm", median(warm), 50, "ms");
  check("server", "cast answer", JSON.stringify({ chart: natal, timeUnknown: false }).length / 1024, 60, "KB");
  const cusps = natal.houses.map((h) => h.ecliptic);
  const bodies = [...natal.planets, ...Object.values(natal.angles)].map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic }));
  const at = Date.parse("2026-09-24T12:00:00Z");
  const tr = [];
  for (let i = 0; i < 7; i += 1) {
    s = t();
    await calc.calculateTransits({ utc: new Date(at + i * 3_600_000), latitude: 48.8566, longitude: 2.3522, natalCusps: cusps, natalBodies: bodies });
    tr.push(t() - s);
  }
  check("server", "transit sky with exact times (once time settles)", median(tr), 200, "ms");
  // The calendar: the year's sky file on the server (once a year for everyone,
  // then kept at the edge), your transits on the device from the chunks.
  s = t();
  const yearFile = await calc.calculateSkyYear(2026);
  check("server", "year sky file", t() - s, 2000, "ms");
  check("server", "year sky file, size", JSON.stringify(yearFile).length / 1024, 100, "KB");
  const { transitsFromWindows } = await import("../../src/lib/chart/personal-transits.ts");
  const from = Date.parse("2026-01-01T00:00:00Z");
  const to = Date.parse("2027-01-01T00:00:00Z");
  const wins = [];
  for (let c = chunkStart(from - 2 * 86_400_000); c <= to + 2 * 86_400_000; c += 32 * 86_400_000) wins.push(await calc.calculateSkyWindow(c));
  s = t();
  const hits = transitsFromWindows(wins, bodies, from, to);
  check("device", "transits of a year from the chunks", t() - s, 500, "ms");
  check("device", "transits of a year found", hits.length > 2000 ? 1 : 0, 1, "", "higher");
  s = t();
  const win = await calc.calculateSkyWindow(chunkStart(at + 90 * 86_400_000));
  // With the sky's own events since part 53 (about 130 a chunk, found and polished on Swiss).
  check("server", "scrub window chunk", t() - s, 300, "ms");
  check("server", "scrub window chunk, size", JSON.stringify(win).length / 1024, 45, "KB");
}

if (want.has("3d")) {
  node([join(ROOT, "scripts/perf/gl3d/build.mjs")]);
  const out = node([join(ROOT, "scripts/perf/gl3d/harness.mjs")], { INST: "1" });
  const runs = out.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  const limits = { "natal default": [360, 8], "natal detailed": [620, 8], "natal every body": [1300, 16], "bi-wheel transits": [900, 12] };
  for (const r of runs) {
    const key = Object.keys(limits).find((k) => r.name.startsWith(k));
    if (!key) continue;
    check("3d", `${key}: GL calls per frame`, r.glCallsPerFrame, limits[key][0], "");
    check("3d", `${key}: garbage per frame`, Math.max(0, r.allocKBPerFrame), limits[key][1], "KB");
  }
}

if (want.has("wheel")) {
  node([join(ROOT, "scripts/perf/wheel/build.mjs")]);
  const { open, waitWheel } = await import("./wheel/lib.mjs");
  const limits = { "natal classic": 1050, "natal advanced": 1350, "transit classic": 1170, "transit advanced": 1800 };
  for (const key of Object.keys(limits)) {
    const [mode, preset] = key.split(" ");
    const { browser, page } = await open({});
    await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}`);
    await waitWheel(page);
    const r = await page.evaluate(() => {
      const svg = document.querySelector("svg.ulune-wheel[data-depth-base]");
      const all = svg.getElementsByTagName("*");
      let transitions = 0;
      for (const el of all) {
        if (getComputedStyle(el).transitionDuration.split(",").some((d) => parseFloat(d) > 0)) transitions += 1;
      }
      return { nodes: all.length, transitions };
    });
    await browser.close();
    check("wheel", `${key}: nodes at rest`, r.nodes, limits[key], "");
    check("wheel", `${key}: nodes with their own transition`, r.transitions, 0, "");
  }
}

if (want.has("bundle")) {
  const out = node([join(ROOT, "scripts/perf/load/chunks.mjs"), "/", "--returning", "--json"]);
  const [home] = JSON.parse(out.slice(out.indexOf("[")));
  // Part 86 (the glyphs laid out by their own widths, their degrees under the yokes): 263, limit 265.
  // The review's improvements (parts 87f-g: orbs by aspect, the hidden pick's note, the
  // phones' pick card, the links between systems): 265.4, limit 267 (the note and the
  // aspect grid already load later).
  // TanStack Start 1.168.60, the fix for CVE-2026-102989 (4 Oct 2026): its router is a little
  // larger, 266.5-267.0 → 267.4; limit 268.
  // UI plan, parts 96-97 (4-5 Oct 2026): the phone's ⋯ menu, the table's links in the toolbar,
  // the other pages' bar with the studio's four pages: 268.3-269.0 depending on where Rolldown
  // puts the shared icons and menus (the Settings page's styles and the not-found page's bar
  // left the first load to make room); limit 269.5.
  // Ulune 2.0's reorganisation, R1–R5 (7 Oct 2026): the studio as one layout route split
  // from the first script, the sections and lens bars, the address's language: 273.0 when
  // the private space's button (4.7) arrives within the load, 268.3 when just after; limit
  // 274. The next saving is the UI text: both languages ship in every first load (catalog
  // 93 KB minified); one language up front would win back more than this.
  // R6, back to the same place (7 Oct 2026): what the studio's parts keep as it leaves the
  // page, 1.4; TanStack Start's client and a few helpers in chunks of their own (the pages
  // outside the studio no longer download the wheel), 0.5 more on "/": 275.2-276.0, limit 276.5.
  // Numerology's Cycles (7 Oct): its page in the map, its words and its view's name, 0.3:
  // 276.3, and 277.1 in one run of four (a small chunk landing within the load); limit 277.5.
  // Encyclopedia parts 18–21 and their fixes (8 Oct): the bridge to "In your chart", the reading
  // opposite an angle, the offline copy's check, the space's encyclopedia records, 0.3 (the
  // rest loads later): 277.4, 277.7 when a small chunk lands within the load; limit 278.
  // Part 22 (8 Oct): the AI keys' store moved from the wheel's chunk to the shared one, so a
  // reader with a private space no longer downloads the wheel on the encyclopedia's pages; on
  // "/", where both load, the same code in another file: 277.7-278.0; limit 278.5.
  // Languages plan, part 6 (9 Oct): the yin or yang count kept with a chart, the form's
  // way to its field, the solar terms as sky events and the wheel's way to their ring,
  // 0.5-0.9 (their words, names and table load when used): 278.2-278.6; limit 279.
  // Languages plan, part 11 (9 Oct): Chinese astrology's two new pages (the year ahead, two
  // people) in the map, the routes and the palette, the Calendar's day's-animal switch and
  // the reading's drawn mark, 0.5 (the pages, their words and the day's engine load when
  // used): 279.0-279.1; limit 279.5.
  check("bundle", '"/" JavaScript with the load (returning reader)', home.jsUpFront / 1024, 279.5, "KB gz");
  // Style sheets: those the first paint waits for, and all of them once the
  // modes' own have loaded after it (the calendar's since part 55; the
  // table's, fetched when idle, grew with part 49: limit 46; numerology's
  // wheel and table page, parts 60 to 62: limit 48; the picture review's
  // fixes, part 81, with the modes they touch: limit 49; the motion plan,
  // 1.0.2: hover only where there is a pointer, exits, view transitions, the
  // Human Design build: limit 51).
  const cssUpFront = home.files.filter((f) => f.type === "stylesheet" && !f.later).reduce((n, f) => n + (f.gz ?? 0), 0);
  // (The review's improvements, parts 87f-g, the field errors, tab fades and the pick card: limit 32.5.)
  check("bundle", '"/" style sheets up front', cssUpFront / 1024, 32.5, "KB gz");
  // (The review's improvements, parts 87f–j: the tables' phone layout, the
  // calendar's month marks and file menu, the pair switch: limit 52. Ulune 2.0's
  // reorganisation, R2–R5 (7 Oct 2026): the sections and lens bars in the shell's
  // sheet, the Calendar's layers menu and its sky without a chart: 52.2, limit 53;
  // the sheets the first paint waits for stay within their 32.5. Languages plan, part 6
  // (9 Oct): the solar terms in the Calendar's day, year and key, 0.3: 53.1, limit 53.5.)
  check("bundle", '"/" style sheets with the modes\' own', home.cssGz / 1024, 53.5, "KB gz");
  const largest = Math.max(...home.files.filter((f) => f.type === "script").map((f) => f.gz ?? 0));
  // (The natal wheel's chunk: 79.4-80.2 since parts 96-97, as shared modules land in it or not; limit 81.
  // 77.4 since R6, TanStack Start's client and the helpers the other pages share having left it.)
  check("bundle", "largest script", largest / 1024, 81, "KB gz");
  // An encyclopedia page opened afresh (a search engine's visitor): its own code, never the
  // studio's. 159.8 on 7 Oct 2026 (238.3 while the wheel's chunk came with every page).
  const enc = node([join(ROOT, "scripts/perf/load/chunks.mjs"), "/encyclopedia/saturn", "--json"]);
  const [entry] = JSON.parse(enc.slice(enc.indexOf("[")));
  check("bundle", '"/encyclopedia/saturn" JavaScript with the load', entry.jsUpFront / 1024, 165, "KB gz");
  check("bundle", '"/encyclopedia/saturn" downloads none of the studio', entry.files.filter((f) => /\/assets\/(wheel|_studio)-/.test(f.file)).length, 0, "");
  // The same for a reader with a private space, whose code comes with every page (encyclopedia
  // plan, part 22: until 8 Oct 2026 it brought the chart library, and the studio's chunk with it).
  const spaced = node([join(ROOT, "scripts/perf/load/chunks.mjs"), "/encyclopedia/saturn", "--json", "--space"]);
  const [withSpace] = JSON.parse(spaced.slice(spaced.indexOf("[")));
  check("bundle", '"/encyclopedia/saturn" with a private space: none of the studio', withSpace.files.filter((f) => /\/assets\/(wheel|_studio)-/.test(f.file)).length, 0, "");
  // "A page from the server, first visit: readable in under 1 second on a 4G phone" (the plan's
  // table): its first paint on Lighthouse's slow 4G, the network only (this machine's CPU is slow).
  const slow = node([join(ROOT, "scripts/perf/load/chunks.mjs"), "/encyclopedia/saturn", "--json", "--4g"]);
  const [on4g] = JSON.parse(slow.slice(slow.indexOf("[")));
  check("bundle", '"/encyclopedia/saturn" first paint on a 4G phone', on4g.fcp ?? Infinity, 1000, "ms");
  // The encyclopedia's own pieces (the plan's table): a page with its figure, a tradition's card
  // texts, a language's search index, the words its readings link, the whole of it offline.
  const { gzipSync } = await import("node:zlib");
  const { readFileSync } = await import("node:fs");
  const { buildEncyclopedia, readContent } = await import("../encyclopedia/build.mjs");
  const { data } = buildEncyclopedia(readContent(join(ROOT, "content/encyclopedia")));
  const gzKb = (v) => gzipSync(JSON.stringify(v)).length / 1024;
  const most = (o) => Math.max(...Object.values(o).map(gzKb));
  // (The plan: 3 to 6 KB of text plus its figure. Gate pages, with three figures, are the largest.)
  check("bundle", "encyclopedia: the largest page, with its figure", most(data.pages), 12, "KB gz");
  // (The plan: about 30. Astrology's, with its 580 combination pages' summaries, is the largest.)
  check("bundle", "encyclopedia: a tradition's card texts", most(data.cards), 40, "KB gz");
  // (The plan: about 150; 70 and 76 on 8 Oct 2026, the combinations found by their names only.)
  check("bundle", "encyclopedia: a language's search index", most(data.search), 100, "KB gz");
  check("bundle", "encyclopedia: the words a reading links", most(data.lexicon), 25, "KB gz");
  const offline = JSON.parse(readFileSync(join(ROOT, ".vercel/output/static/encyclopedia-offline.json"), "utf8"));
  // (The plan: 3 to 4 MB per language; 3.3 and 3.5 on 8 Oct 2026, the shared files included.)
  check("bundle", "encyclopedia kept offline, one language", Math.max(offline.bytes.en, offline.bytes.fr) / 1048576 + offline.bytes.shared / 1048576, 4, "MB");
}

if (want.has("scrub")) {
  const out = node([join(ROOT, "scripts/perf/wheel/scrub.mjs"), "3", "1"], { ULUNE_DEV: process.env.ULUNE_DEV ?? "http://127.0.0.1:9311" });
  const res = JSON.parse(out.trim().split("\n").pop());
  check("scrub", "wheel updates per second while dragging", res.median.updatesPerSec, 20, "/s", "higher");
  check("scrub", "server casts during the drag", res.median.castsDuringDrag, 0, "");
  check("scrub", "exact sky after letting go", res.median.exactAfterMs, 600, "ms");
}

let failed = 0;
for (const r of rows) {
  if (!r.ok) failed += 1;
  const v = Number.isInteger(r.value) ? String(r.value) : r.value.toFixed(1);
  console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.area.padEnd(6)} ${r.what.padEnd(52)} ${v.padStart(8)} ${r.better === "lower" ? "≤" : "≥"} ${r.limit} ${r.unit}`);
}
console.log(failed ? `${failed} budget(s) over` : `all ${rows.length} within budget`);
process.exit(failed ? 1 : 0);
