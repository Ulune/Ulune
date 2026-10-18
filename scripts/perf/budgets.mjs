// Performance budgets (plan, Phase 5): each measure against its limit on
// this test machine, pass or fail, and a non-zero exit when one fails.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/budgets.mjs [server,3d,wheel,bundle,scrub,chinese]
//
// server  the chart calculations in this process (warm, and the first cast)
// 3d      the counting WebGL harness (scripts/perf/gl3d/build.mjs first)
// wheel   node counts and per-node transitions (scripts/perf/wheel/build.mjs first)
// bundle  what "/" downloads for a returning reader (npm run build, serve.mjs on :9311)
// scrub   wheel updates per second while the scrubber is dragged (the same served build)
// engine  the calculations on the device: what a browser downloads (the build's own files) and
//         the engine's times with the CPU slowed 4× and 6× (scripts/perf/engine/timing.mjs)
// chinese what each Chinese language's pages download after "/", the term table, and the BaZi
//         and Flying Star engines' time with the CPU slowed 6× (the same served build)
//
// The limits are this machine's (2 cores, software rendering); a Mac is
// several times faster. They sit a little above what the app does today, so
// a regression fails and today passes; the plan's goals are in the notes.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { OUT, ROOT } from "./paths.mjs";

const want = new Set((process.argv[2] ?? "server,3d,wheel").split(","));
const rows = [];
const check = (area, what, value, limit, unit, better = "lower") => {
  const ok = better === "lower" ? value <= limit : value >= limit;
  rows.push({ area, what, value, limit, unit, better, ok });
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const node = (args, env = {}) =>
  execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 << 20 });
/** A script that imports the app's TypeScript (as this one is run). */
const nodeTs = (args, env = {}) => node(["--experimental-strip-types", "--import", "./scripts/register-ts.mjs", ...args], env);
/** The JSON a script printed (after anything it said before it). */
const jsonOf = (out) => JSON.parse(out.slice(Math.min(...["[", "{"].map((c) => out.indexOf(c)).filter((i) => i >= 0))));
// The returning reader's saved chart (scripts/perf/load/make-row.mjs), which bundle and chinese load
// pages with; made once on a machine that has none (CI's): without it "/" would be measured as a first visit.
if ((want.has("bundle") || want.has("chinese")) && !existsSync(join(OUT, "load/saved-row.json"))) {
  nodeTs([join(ROOT, "scripts/perf/load/make-row.mjs")]);
}

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
  // The place search's zones (on-device plan, W1-9, 17 Oct 2026): each place found comes with the zone of
  // the server's map, so a chart calculated on the device agrees with the server's. In a process of its own,
  // as a server function starts: the module, geo-tz's index and the regions of eight places scattered over
  // four continents, 170–260 ms (the first cast paid it before); then 0.03–0.08 ms for the eight (geo-tz keeps
  // what it read, and each search's list is kept a day anyway).
  const zones = jsonOf(nodeTs([join(ROOT, "scripts/perf/zones-bench.mjs")]));
  check("server", "a search's 8 places zoned, server cold", zones.cold, 800, "ms");
  check("server", "a search's 8 places zoned, warm", zones.warm, 2, "ms");
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
  // Part 12 (9 Oct): BaZi in the map, the picker (its card, mark and words) and the palette,
  // 0.3 (its page, texts and table load when opened): 279.4, 279.7 in one run of five (a
  // small chunk landing within the load); limit 280.
  // Part 16 (11 Oct): BaZi's Cycles page (the luck pillars) in the map, the routes, the meta and
  // the palette, 0.2 (its page, texts and table load when opened): 279.6, 280.4 when a small
  // chunk lands within the load; limit 281. A pass to trim the first load before the release
  // is due (each new page adds its route and map entry here).
  // The first-load trim (13 Oct 2026): the private space sheet's and settings' words, Your data's and
  // the AI accounts' (a book each, src/lib/i18n/catalog/*-words.ts, loaded with their code) left the
  // app's catalog: 280.3 (281.1 when a small chunk lands within the load) -> 274.2-274.9; limit 276,
  // so the next pages' routes and map entries spend the room deliberately.
  // Parts 25–29 (13–14 Oct) spent 0.5–0.8 of it: the switcher's homes, the reading card's term hook, the
  // guide's six languages and its questions: 275.0–275.3, 276.2 once when a small chunk landed within the
  // load. Languages plan, part 30 (14 Oct 2026), the trim's second pass: the Bodies tab's, the Look
  // tab's and the table's balance words became books loaded with their code (bodies-words.ts,
  // look-words.ts, tables-words.ts), and the guide's words one read by the guide alone
  // (guide-body-words.ts: still in "/"'s load, which draws the guide under a first visit's form, but
  // out of every other page's): 271.7, 272.9 when three small chunks fetched a round trip late (the
  // guide's links, two icons) land within the load (271.8 and 273.0 with the review's longer home
  // title); the limit stays 276. (Loading the guide only for
  // first visits saved 4.5 more, but when the page changed it before its code came, React dropped the
  // server's guide until it did.)
  // 2.0's last features, week 1 (17 Oct 2026): sharing by link and Compare's chart scopes took it to
  // 274.7, 275.8 when the small chunks landed within the load (the engine's split added nothing; the
  // scopes 0.6 in the wheel's chunk; the share item, host and mark 0.4, the inbox's store 0.5 and /s
  // 0.15; and /s's arrival, importing the studio's store and space-sync.ts, split space-sync and
  // lib/ai/call.ts out of the studio's chunk into chunks of their own, 0.9). The first-load review
  // brought it back: the private space's IndexedDB store left every page's load (spaceSupported in its
  // own file, -1.05), the arrival waits through the space's bridge, the share sheet's state joined the
  // wheel's chunk, which AI is called directly moved to lib/ai/providers.ts, the dormant AI plumbing
  // went behind AI_ENABLED and the offline offer's card loads when it asks: 272.2, 273.4 when the small
  // chunks land, as before the week.
  // Week 2 (17 Oct 2026) took it to 274.6, 275.9 with the small chunks (276.2–277.3 before the device's
  // own trims): Show mode's button and host, the flip between the last two charts, the switcher's rows and
  // asking for someone's chart, 1.1; Compare's button, its rows, its record and the C key, 0.7; the
  // calculations' setting in the birth form's note, 0.2. The review moved out of the first load what acts
  // only once pressed: Share and export's items (export-items.tsx, fetched as its button is pointed at,
  // focused or pressed, or at idle: 1.1 of the menu's own), each switcher row's "Compare with…" (with
  // the switcher's other rows, picker-extras.tsx), the flip's history cut to two ids checked when
  // offered, one Compare switch for the button, the C key, ⋯ and Show mode: 273.1, 274.3 when the small
  // chunks land within the load. The limit stays 276.
  // Week 3 (18 Oct 2026): its three pages, groups and notes load later; "/" 274.3–274.5 as built, 274.7 after the
  // review (a phone's short lens names, Pair and Logis, and Escape from a figure's SVG parts, 0.2).
  check("bundle", '"/" JavaScript with the load (returning reader)', home.jsUpFront / 1024, 276, "KB gz");
  // Style sheets: those the first paint waits for, and all of them once the
  // modes' own have loaded after it (the calendar's since part 55; the
  // table's, fetched when idle, grew with part 49: limit 46; numerology's
  // wheel and table page, parts 60 to 62: limit 48; the picture review's
  // fixes, part 81, with the modes they touch: limit 49; the motion plan,
  // 1.0.2: hover only where there is a pointer, exits, view transitions, the
  // Human Design build: limit 51).
  const cssUpFront = home.files.filter((f) => f.type === "stylesheet" && !f.later).reduce((n, f) => n + (f.gz ?? 0), 0);
  // (The review's improvements, parts 87f-g, the field errors, tab fades and the pick card: limit 32.5.
  // Languages plan, part 30 (14 Oct 2026): the wheel hint's × reaching 44 px for a finger (review item
  // T10) and the readings' lettered marks at 4.5:1 in both themes (the contrast check): 32.4 -> 32.5,
  // a hair over; limit 33.)
  check("bundle", '"/" style sheets up front', cssUpFront / 1024, 33, "KB gz");
  // (The review's improvements, parts 87f–j: the tables' phone layout, the
  // calendar's month marks and file menu, the pair switch: limit 52. Ulune 2.0's
  // reorganisation, R2–R5 (7 Oct 2026): the sections and lens bars in the shell's
  // sheet, the Calendar's layers menu and its sky without a chart: 52.2, limit 53;
  // the sheets the first paint waits for stay within their 32.5. Languages plan, part 6
  // (9 Oct): the solar terms in the Calendar's day, year and key, 0.3: 53.1, limit 53.5. 2.0's week 2
  // (17 Oct): Compare's toolbar button, its look folded into the rules it shares: 53.47 -> 53.50, a hair
  // under; the next rule here needs room made first. Week 3's review (18 Oct) made it: the two people's
  // rules written once for every Relationship page (pair.css, which "/" fetches with Synastry at idle) and
  // the numerology table's Compare rules gone with it (num.css), 79 B; then the Relationship toolbar's
  // second row (pair.css) and a phone's short lens names (shell.css): 53.50 -> 53.44.)
  check("bundle", '"/" style sheets with the modes\' own', home.cssGz / 1024, 53.5, "KB gz");
  // (The engine's worker, fetched when a chart is first calculated on the device, has its own row: engine.)
  const largest = Math.max(...home.files.filter((f) => f.type === "script" && !/\/engine-worker-/.test(f.file)).map((f) => f.gz ?? 0));
  // (The natal wheel's chunk: 79.4-80.2 since parts 96-97, as shared modules land in it or not; limit 81.
  // 77.4 since R6, TanStack Start's client and the helpers the other pages share having left it.)
  check("bundle", "largest script", largest / 1024, 81, "KB gz");
  // An encyclopedia page opened afresh (a search engine's visitor): its own code, never the
  // studio's. 159.8 on 7 Oct 2026 (238.3 while the wheel's chunk came with every page).
  // The best of three visits (review item T2, part 30): what loads with the page is what its load
  // asked for, and a slow answer (the first after a build, when this server compresses each file)
  // let a lazy part or two in before the load ended: 170 then 155 in a row (part 30: 151.8 four times,
  // 164.7 once). 147.5 since part 30's trim (the guide's, the Bodies tab's, the Look tab's and the
  // table's words left the catalog every page loads); a visit that brought the studio fails all the same.
  const enc = node([join(ROOT, "scripts/perf/load/chunks.mjs"), ...Array(3).fill("/encyclopedia/saturn"), "--json"]);
  const visits = jsonOf(enc);
  const entry = visits.reduce((best, v) => (v.jsUpFront < best.jsUpFront ? v : best));
  check("bundle", '"/encyclopedia/saturn" JavaScript with the load (best of 3)', entry.jsUpFront / 1024, 165, "KB gz");
  const studioFiles = (v) => v.files.filter((f) => /\/assets\/(wheel|_studio)-/.test(f.file)).length;
  check("bundle", '"/encyclopedia/saturn" downloads none of the studio', Math.max(...visits.map(studioFiles)), 0, "");
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

if (want.has("chinese")) {
  // The Chinese languages (languages plan, part 30: the plan's budgets table, each row "an entry in
  // npm run budgets, so a later change cannot quietly break it"), on the build served on :9311.
  // What a returning reader's browser fetches after "/" to open every page of a language, figure and
  // table (scripts/perf/load/languages.mjs): its pages, readings, tables and styles, and the Chinese
  // code the languages share, each file counted once; the term table apart (below). What "/" itself
  // fetched first is not counted again: among it the Chinese interface words (src/lib/chinese/words.ts,
  // 33.7 KB gz), which "/" fetches at idle with the Calendar's code (its day animals and solar terms
  // say a few of them). The plan asked for "about 40 KB gz per language, in line with the numerology
  // page"; review item T9 found Feng Shui at about 51 counting its pages, texts and engines, and asks
  // whether to trim its pairs' texts or load them when a palace opens. Counted whole, tables and
  // shared files included, on 14 Oct 2026 (part 30): Chinese astrology 50.5, BaZi 89.0 (its texts
  // 32.5 in one file), Feng Shui 86.4, of which 27.3 the three share. BaZi and Feng Shui fetched
  // Chinese astrology's texts too (16.8, zodiac-texts.ts) for its one-line `said` helper: moved to a
  // module of its own (src/lib/chinese/both.ts, the part's review), BaZi 72.3 and Feng Shui 69.7,
  // of which 10.6 the three share; Chinese astrology 51.2, its year-ahead and two-person texts
  // apart from the portraits (zodiac-time-texts.ts), so the Calendar's day animals fetch 5.5 of them
  // rather than 19.3. The limits sit a little above those numbers, so growth is a decision, not an
  // accident. On 16 Oct 2026 (BaZi part 20, Feng Shui's fixes and Pair, the encyclopedia's first
  // live Chinese family) they grew to 53.7, 77.7 and 87.7: the term registry once a family is live
  // (about 2.4 each), BaZi Pair's luck pillars (2.7), Feng Shui's Relationship page (13.0) and its
  // fixes (2.2). The owner accepted new limits with part 30's margins (review item RC5).
  // 2.0's last features, week 3 (18 Oct 2026): Feng Shui gained its fourth page, Cycles (share and compare
  // plan, feature 5d): 105.7 as built. The review trimmed what a reader really fetches first: the year's
  // readings (afflictions, the year's line) no longer import the home's (a mountain's code moved to
  // fengshui-home.ts), so Cycles alone fetches them as a chunk of 3.3 rather than the home's readings'
  // 12.7 (7 less for a reader of Cycles; the language's total is the same, Home fetching both); and
  // Cycles' 53 words left the Chinese traditions' book, which "/" fetches at idle for every reader
  // (40.6 -> 39.1), for a book of their own loaded with the page (2.2, now counted here). The cost of
  // Cycles, file by file: its page, engine, readings and texts 12.4; its words 2.2; its table 2.4; its
  // style sheet 1.5 (18.5 in all; with the review's Three Killings texts). 108.5 measured, limit 110 with
  // part 30's margin. Chinese astrology (53.9) and BaZi (78.0) are unchanged: the words left their row
  // too, as they were fetched by "/". The next saving is review item T9: Feng Shui's 45 pair texts (8.0
  // of the home's 13.0 texts) loaded when a palace's reading opens rather than with the page.
  const { termTable, languages } = jsonOf(nodeTs([join(ROOT, "scripts/perf/load/languages.mjs"), "--json"]));
  const LIMITS = { "chinese-astrology": ["Chinese astrology", 54.5], bazi: ["BaZi", 79.2], "feng-shui": ["Feng Shui", 110] };
  for (const l of languages) {
    const [name, limit] = LIMITS[l.language] ?? [l.language, 0];
    check("chinese", `${name}: its pages after "/", JS and CSS`, l.gz / 1024, limit, "KB gz");
  }
  // Every page drawn in both views, so a page that failed to open cannot pass as a small one.
  check("chinese", "pages not drawn (each page, figure and table)", languages.flatMap((l) => l.pages.filter((p) => !p.shown)).length, 0, "");
  // The solar terms and new moons of 1799–2201 (src/lib/chinese/time-table.ts), fetched once, by the
  // first Chinese page a reader opens: the plan's "about 40 KB gz, once". 29.0 on 14 Oct 2026.
  check("chinese", "the term and new-moon table", termTable.reduce((n, f) => n + f.gz, 0) / 1024, 40, "KB gz");
  // The engines' time in Chromium with the CPU slowed 6× through the DevTools protocol (Emulation.
  // setCPUThrottlingRate), the median of 9 timings (scripts/perf/chinese/timing.mjs). The plan: "a
  // full BaZi chart with luck pillars: under 5 ms on a 6× slowed phone", "a Flying Star chart: under
  // 2 ms". On 14 Oct 2026 (part 30): 0.43–0.50 ms and 0.05–0.06 ms, the CPU 5.5–6.3× slower (0.08 and
  // 0.01 unslowed; up to 0.9 and 0.1 with other jobs on the machine); the limits leave that noise room
  // and still catch a slower engine long before the plan's.
  // The protocol's throttle is coarse here (a fixed loop ran 2× to 6× slower from run to run), so the
  // slowdown the timings ran under is a row too: a run where it did not engage cannot pass for speed.
  const timing = jsonOf(nodeTs([join(ROOT, "scripts/perf/chinese/timing.mjs"), "--json"]));
  check("chinese", "a full BaZi chart with luck pillars, CPU 6× slower", timing.x6.bazi.median, 2, "ms");
  check("chinese", "a Flying Star chart, CPU 6× slower", timing.x6.stars.median, 0.3, "ms");
  check("chinese", "the slowdown those timings ran under (a fixed loop)", timing.x6.slowdown, 2.5, "×", "higher");
}

if (want.has("engine")) {
  // The calculations on the device (on-device plan, steps 2 and 6), on the build (npm run build):
  // what a reader's browser downloads the first time a chart is calculated on it — the worker's
  // script, the engine and the 1800–2399 files — and what an earlier era adds, brotli at quality 11
  // as an edge sends them (the ephemeris files hardly compress: 86–92 %). The plan's table: about
  // 2.1 MB the first time, 1.8 MB an era. Then the engine's times in Chromium with the CPU slowed 6×
  // (a cheap phone), the worker's code on a page's main thread (the protocol slows no worker). The
  // limits sit a little above the first measures (17 Oct 2026, below), so a regression fails.
  const { brotliCompressSync, constants } = await import("node:zlib");
  const { readdirSync, readFileSync } = await import("node:fs");
  const dir = join(ROOT, ".vercel/output/static/assets");
  const files = readdirSync(dir);
  const brKb = (name) => brotliCompressSync(readFileSync(join(dir, name)), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length / 1024;
  const named = (re) => files.find((f) => re.test(f)) ?? "";
  const worker = named(/^engine-worker-[\w-]+\.js$/);
  const era = (suffix) => ["sepl", "semo", "seas"].map((k) => named(new RegExp(`^${k}${suffix}-[\\w-]+\\.se1$`)));
  const first = [worker, named(/^swisseph-[\w-]+\.wasm$/), ...era("_18"), named(/^s136199s-[\w-]+\.se1$/), named(/^se90377s-[\w-]+\.se1$/), named(/^sefstars-[\w-]+\.txt$/)];
  if (first.some((f) => !f) || era("_12").some((f) => !f)) throw new Error("engine: the build has not the engine's files (npm run build)");
  const sum = (list) => list.reduce((n, f) => n + brKb(f), 0);
  // The first measures (17 Oct 2026): the worker 91.9 KB (the calculation code, Ulune's tz table, zod,
  // the engine's glue), the first download 2.07 MB (2,170,609 bytes: the engine 218 KB, the planets 405,
  // the Moon 1,151, Chiron and the asteroids 199, Eris, Sedna and the stars 60), the era 1200–1799
  // 1.72 MB. With the CPU slowed 6× (a fixed loop 6.5× slower): the engine from the browser's copy
  // 118 ms (324 ms the first visit, its files from a local server), a natal chart 32 ms, a Timing year
  // 2.48 s; unslowed 17 ms, 9.7 ms and 0.40 s. Limits: the sizes a few per cent above, the times
  // about half again (this machine's timings vary by a third from run to run).
  // Step 6 (17 Oct 2026, the device the default): the first chart (its files from a local server, the
  // engine started, the chart cast) 0.37 s unslowed, 0.40 s at 4× (a loop 2.9× slower), 0.69 s at 6×
  // (5.3×); over a real connection add the 2.2 MB's download, about 2 s on 4G and 10 s on a slow 3G
  // line, once. A Timing year 0.37, 1.61 and 2.52 s. The Calendar's own work on a device, in the
  // background and once (its files are kept by the browser): a year's sky file 0.75, 3.2 and 4.8 s; a year
  // view's 13 chunks 1.4, 7.2 and 12.3 s (a month's two or three, 0.3, 1.5 and 2.5 s).
  const ENGINE_LIMITS = {
    workerKb: 100,
    firstMb: 2.2,
    eraMb: 1.8,
    startMs: 200,
    natalMs: 50,
    yearMs: 3700,
    firstChartMs4: 1200,
    firstChartMs6: 1500,
    yearMs4: 2800,
    skyYearMs6: 7500,
    calendarYearMs6: 18000,
  };
  check("engine", "the worker's script", brKb(worker), ENGINE_LIMITS.workerKb, "KB br");
  check("engine", "first download: worker, engine, 1800–2399 files", sum(first) / 1024, ENGINE_LIMITS.firstMb, "MB br");
  check("engine", "an earlier era (1200–1799)", sum(era("_12")) / 1024, ENGINE_LIMITS.eraMb, "MB br");
  const timing = jsonOf(nodeTs([join(ROOT, "scripts/perf/engine/timing.mjs"), "--json"]));
  const { x4, x6 } = timing;
  check("engine", "the first chart (download, start, cast), CPU 4× slower", x4.firstChart, ENGINE_LIMITS.firstChartMs4, "ms");
  check("engine", "the first chart (download, start, cast), CPU 6× slower", x6.firstChart, ENGINE_LIMITS.firstChartMs6, "ms");
  check("engine", "engine start from the browser's copy, CPU 6× slower", x6.keptStart, ENGINE_LIMITS.startMs, "ms");
  check("engine", "a natal chart, CPU 6× slower", x6.natal.median, ENGINE_LIMITS.natalMs, "ms");
  check("engine", "a Timing year, CPU 4× slower", x4.timingYear.median, ENGINE_LIMITS.yearMs4, "ms");
  check("engine", "a Timing year, CPU 6× slower", x6.timingYear.median, ENGINE_LIMITS.yearMs, "ms");
  check("engine", "the Calendar: a year's sky file, CPU 6× slower", x6.skyYear.median, ENGINE_LIMITS.skyYearMs6, "ms");
  check("engine", "the Calendar: a year view's chunks, CPU 6× slower", x6.calendarYear.median, ENGINE_LIMITS.calendarYearMs6, "ms");
  check("engine", "the slowdown the 4× timings ran under (a fixed loop)", x4.slowdown, 2.4, "×", "higher");
  check("engine", "the slowdown the 6× timings ran under (a fixed loop)", x6.slowdown, 3.5, "×", "higher");
}

let failed = 0;
for (const r of rows) {
  if (!r.ok) failed += 1;
  const v = Number.isInteger(r.value) ? String(r.value) : r.value.toFixed(Math.abs(r.value) < 1 ? 2 : 1);
  console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.area.padEnd(7)} ${r.what.padEnd(52)} ${v.padStart(8)} ${r.better === "lower" ? "≤" : "≥"} ${r.limit} ${r.unit}`);
}
console.log(failed ? `${failed} budget(s) over` : `all ${rows.length} within budget`);
process.exit(failed ? 1 : 0);
