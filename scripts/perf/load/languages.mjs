// What each Chinese language's pages download after "/" (languages plan, part 30: the plan's
// budgets table, "each language's own code and texts, about 40 KB gz per language"; review item
// T9). A returning reader with two charts kept (so the pair pages draw a pair) opens "/" and waits
// for it to settle: the load, then what "/" fetches after it (the reading text, the Western pages it
// prefetches at idle, the table). Then each page of the language (src/studio/map.ts), in its figure
// and in its table: every script and style sheet those pages fetch that "/" had not, counted once,
// in gzip bytes of the build on disk (gzip -9, as chunks.mjs counts). What several languages share
// (the Chinese calendar, the words) counts in each, as a reader who opens one of them pays for it;
// the term and new-moon table counts apart, in a row of its own (termTable below), found by its data.
// Needs serve.mjs on :9311 (npm run build first).
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/load/languages.mjs [--json] [bazi,feng-shui]
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { ROOT, OUT, CHROME } from "../paths.mjs";
import { termTableFiles } from "./term-table.mjs";

const { chromium } = createRequire(join(ROOT, "package.json"))("playwright");
const { LANGUAGES, LENSES, PAGE_PATHS } = await import("../../../src/studio/map.ts");
const { MODE_META } = await import("../../../src/studio/modes/meta.ts");

const BASE = "http://127.0.0.1:9311";
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const only = args.find((a) => !a.startsWith("--"))?.split(",");
const ROW = join(OUT, "load/saved-row.json");
if (!existsSync(ROW)) throw new Error("make the returning reader's chart first: scripts/perf/load/make-row.mjs");
const rowA = JSON.parse(readFileSync(ROW, "utf8"));
// The second chart: the same birth under another name, enough for the pair pages to draw a pair.
const rowB = { ...rowA, id: "11111111-2222-4333-8444-666666666666", input: { ...rowA.input, name: "Sample B" } };

const gz = new Map();
function gzBytes(pathname) {
  const p = join(ROOT, ".vercel/output/static", pathname);
  if (!existsSync(p)) return 0;
  if (!gz.has(p)) gz.set(p, gzipSync(readFileSync(p), { level: 9 }).length);
  return gz.get(p);
}

const chinese = LANGUAGES.filter((l) => l.group === "chinese" && (!only || only.includes(l.id)));
const table = new Set(termTableFiles());
const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const report = [];

/** Until no script or style sheet has been asked for in `quiet` ms (at least `min` ms in all). */
async function settle(page, seen, { min = 0, quiet = 2500 } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  const start = Date.now();
  let count = -1;
  let since = Date.now();
  while (Date.now() - start < 30000) {
    if (seen.size !== count) {
      count = seen.size;
      since = Date.now();
    }
    if (Date.now() - since >= quiet && Date.now() - start >= min) return;
    await page.waitForTimeout(250);
  }
}

for (const language of chinese) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(
    ([a, b]) => {
      try {
        if (!localStorage.getItem("orbis.charts.v1")) {
          localStorage.setItem("orbis.charts.v1", JSON.stringify([JSON.parse(a), JSON.parse(b)]));
          localStorage.setItem("orbis.charts.active", JSON.parse(a).id);
        }
      } catch {
        /* storage blocked */
      }
    },
    [JSON.stringify(rowA), JSON.stringify(rowB)],
  );
  const page = await ctx.newPage();
  const seen = new Set();
  page.on("request", (req) => {
    const type = req.resourceType();
    if ((type === "script" || type === "stylesheet") && req.url().startsWith(BASE)) seen.add(`${type}|${new URL(req.url()).pathname}`);
  });
  // "/" and all it fetches after its load (the idle prefetches start within 4 to 6 s).
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 120000 });
  await settle(page, seen, { min: 9000 });
  const home = new Set(seen);
  const pages = LENSES.flatMap((lens) => language.lenses[lens] ?? []);
  const visited = [];
  for (const id of pages) {
    for (const view of ["wheel", "table"]) {
      await page.goto(`${BASE}${PAGE_PATHS[id]}?view=${view}`, { waitUntil: "load", timeout: 120000 });
      const stage = view === "table" ? "studio-table" : MODE_META[id].stageTestId;
      const shown = await page
        .locator(`[data-testid="${stage}"], [data-testid="${MODE_META[id].emptyTestId ?? `${stage}-empty`}"]`)
        .first()
        .waitFor({ timeout: 30000 })
        .then(() => true)
        .catch(() => false);
      await settle(page, seen);
      visited.push({ id, view, shown });
    }
  }
  const files = [...seen]
    .filter((k) => !home.has(k))
    .map((k) => {
      const [type, file] = k.split("|");
      return { file, type, gz: gzBytes(file), table: table.has(file) };
    })
    .sort((a, b) => b.gz - a.gz);
  const own = files.filter((f) => !f.table);
  const sum = (type) => own.filter((f) => f.type === type).reduce((n, f) => n + f.gz, 0);
  report.push({ language: language.id, pages: visited, jsGz: sum("script"), cssGz: sum("stylesheet"), gz: sum("script") + sum("stylesheet"), termTable: files.some((f) => f.table), files });
  await ctx.close();
}
await browser.close();

const termTable = [...table].map((file) => ({ file, gz: gzBytes(file) }));
if (asJson) console.log(JSON.stringify({ termTable, languages: report }, null, 1));
else {
  for (const t of termTable) console.log(`the term and new-moon table: ${(t.gz / 1024).toFixed(1)} KB gz (${t.file})`);
  for (const r of report) {
    const missed = r.pages.filter((p) => !p.shown).map((p) => `${p.id} ${p.view}`);
    console.log(`${r.language}: ${(r.gz / 1024).toFixed(1)} KB gz after "/" (JS ${(r.jsGz / 1024).toFixed(1)}, CSS ${(r.cssGz / 1024).toFixed(1)}; ${r.files.length} files${r.termTable ? ", the term table apart" : ""})${missed.length ? `; not shown: ${missed.join(", ")}` : ""}`);
    for (const f of r.files) console.log(`   ${f.type.padEnd(10)} ${(f.gz / 1024).toFixed(1).padStart(6)} KB  ${f.table ? "(term table) " : ""}${f.file}`);
  }
  // What more than one language fetches: counted in each of them above.
  const by = new Map();
  for (const r of report) for (const f of r.files) if (!f.table) by.set(f.file, { ...f, langs: [...(by.get(f.file)?.langs ?? []), r.language] });
  const shared = [...by.values()].filter((f) => f.langs.length > 1);
  if (shared.length) {
    console.log(`shared by several of them: ${(shared.reduce((n, f) => n + f.gz, 0) / 1024).toFixed(1)} KB gz`);
    for (const f of shared) console.log(`   ${f.type.padEnd(10)} ${(f.gz / 1024).toFixed(1).padStart(6)} KB  ${f.file}  (${f.langs.join(", ")})`);
  }
}
