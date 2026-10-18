/*
 * Human Design's Relationship lens, the connection chart (share and compare
 * plan, feature 5a), at 1280 px in English and 390 px in French on a touch
 * screen, in both themes, with two made-up charts (Fixture B, then Fixture A
 * shown: TraceQA, a Manifesting Generator, and Sample B, a Projector):
 *   - from Human Design the chart switcher's pair button opens its own
 *     Relationship page, /human-design/pair, not astrology's Synastry; Alt+3
 *     from the bodygraph too, and Compare's "See how they meet";
 *   - the figure: 64 gates, each TraceQA's (a disc), Sample B's (a ring) or
 *     both's; the 11 channels they form, by kind (6 electromagnetic, 2 of
 *     dominance led by Sample B, 3 of compromise), a spark on each
 *     electromagnetic one; the other 25 not drawn; the eight centres defined
 *     between them, each marked by who defines it, the Solar Plexus open; no
 *     columns;
 *   - the legend: whose gates, the four kinds with their counts, each a
 *     button that lights its channels and opens its reading; the centres'
 *     key, the conditioning both ways, the open ground, the definition;
 *   - a channel's reading starts with who brings which gate, a centre's
 *     with who conditions whom; the side panel's first read takes nine steps;
 *   - the keyboard: one Tab stop on the figure, the arrows walk its pieces,
 *     Enter opens one;
 *   - on a phone a tap near a gate keeps the figure whole behind a card that
 *     names it; Read opens its reading;
 *   - the table: the channels by kind (and the half ones), the centres, the
 *     gates; its CSV and Copy;
 *   - Share both: one link with the two charts, which opens this page with
 *     the partner set;
 *   - contrast of the page's own words in both themes; nothing sent beyond
 *     the app's own files (the bodygraphs are cast on the device, the door's
 *     default); nothing scrolls sideways.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { DEV, FIXTURE_A, FIXTURE_B, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, ensureTheme, goStudioPage, gotoApp, openExport, setLang, setView, waitStudioPage } from "./_lib.mjs";
import { contrastScan, formatIssue } from "./_contrast.mjs";
import { watchSent } from "./_sent.mjs";

const WORDS = {
  en: {
    pairButton: "Relationship with Sample B (Human Design: connection chart)",
    people: ["TraceQA", "Manifesting Generator · 2/4 · Single", "Sample B", "Projector · 4/6 · Split"],
    kinds: ["Electromagnetic", "Companionship", "Dominance", "Compromise"],
    em: "TraceQA brings gate 20 and Sample B gate 57: this channel is whole in neither of you",
    centre: "TraceQA defines the Sacral and Sample B has it open",
    kindNote: "One gate each: together you complete the channel",
    first: "The two of you, step by step",
    card: ["Gate 20", "Throat", "TraceQA"],
    copy: ["20–57", "Electromagnetic", "TraceQA: Gate 20 · Sample B: Gate 57"],
    sheet: "Human Design: connection chart",
  },
  fr: {
    pairButton: "Relation avec Sample B (Human Design\u202f: carte de connexion)",
    people: ["TraceQA", "Générateur manifesteur · 2/4 · Simple", "Sample B", "Projecteur · 4/6 · Double"],
    kinds: ["Électromagnétique", "Compagnonnage", "Dominance", "Compromis"],
    em: "TraceQA apporte la porte 20 et Sample B la porte 57\u202f: ce canal n’est complet chez aucun de vous",
    centre: "TraceQA définit le Sacral, que Sample B a ouvert",
    kindNote: "Une porte chacun\u202f: ensemble, vous complétez le canal",
    first: "Vous deux, pas à pas",
    card: ["Porte 20", "Gorge", "TraceQA"],
    copy: ["20–57", "Électromagnétique", "TraceQA\u202f: Porte 20 · Sample B\u202f: Porte 57"],
    sheet: "Human Design\u202f: carte de connexion",
  },
};

/** What the two fixtures form (lib/chart/hd-pair.ts, worked out in scripts/hd-pair.test.mjs's way). */
const FORMED = {
  "61-24": "electromagnetic",
  "63-4": "electromagnetic",
  "20-57": "electromagnetic",
  "15-5": "electromagnetic",
  "28-38": "electromagnetic",
  "42-53": "electromagnetic",
  "25-51": "dominance",
  "44-26": "dominance",
  "11-56": "compromise",
  "33-13": "compromise",
  "2-14": "compromise",
};
const MARKS = { head: "together", ajna: "b", throat: "both", g: "both", heart: "b", sacral: "a", spleen: "b", root: "together" };

const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");
async function waitNote(page, text, label, what) {
  await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), text, { timeout: 10000 }).catch(async () => {
    throw new Error(`${label}: ${what} "${(await note(page)).slice(0, 300)}"`);
  });
}

async function csvOf(page) {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), openExport(page).then(() => page.getByTestId("table-csv").click())]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.startsWith("﻿")) throw new Error("CSV without its byte-order mark");
  return text.slice(1).replace(/\r\n/g, "\n");
}

/** The figure as drawn: gates by whose, channels by kind, centres' marks. */
const figureFacts = (page) =>
  page.evaluate(() => {
    const svg = document.querySelector("[data-testid=hd-pair-graph]");
    const gates = [...svg.querySelectorAll("[data-testid^=hd-gate-]")];
    const channels = [...svg.querySelectorAll("[data-testid^=hd-channel-]")];
    return {
      gates: gates.length,
      tones: Object.fromEntries(["a", "b", "both", "off"].map((t) => [t, gates.filter((g) => g.getAttribute("data-tone") === t).length])),
      tone: Object.fromEntries([20, 57, 11, 64].map((n) => [n, svg.querySelector(`[data-testid=hd-gate-${n}]`)?.getAttribute("data-tone")])),
      rings: svg.querySelectorAll(".hd-gate-ring").length,
      channels: channels.length,
      formed: Object.fromEntries(channels.filter((c) => c.getAttribute("data-kind")).map((c) => [c.getAttribute("data-testid").slice(11), c.getAttribute("data-kind")])),
      drawn: channels.filter((c) => !c.getAttribute("data-kind") && c.querySelector(".hd-line")).length,
      sparks: svg.querySelectorAll(".hd-spark").length,
      centres: svg.querySelectorAll("[data-testid^=hd-center-]").length,
      defined: [...svg.querySelectorAll("[data-testid^=hd-center-][data-defined]")].map((c) => c.getAttribute("data-center")),
      marks: Object.fromEntries([...svg.querySelectorAll("[data-testid^=hd-mark-]")].map((m) => [m.getAttribute("data-testid").slice(8), m.getAttribute("data-by")])),
      columns: document.querySelectorAll("[data-testid=hd-pair-box] .ulune-hd-col").length,
      focusable: svg.querySelectorAll("[tabindex]").length,
    };
  });

async function contrast(page, label) {
  const issues = [];
  for (const root of [".ulune-hdp-people", ".ulune-hdp-side"]) {
    const { checked, issues: found } = await contrastScan(page, { root });
    if (!checked) issues.push(`${root}: nothing measured`);
    for (const i of found) issues.push(`${root}: ${formatIssue(i)}`);
  }
  if (issues.length) throw new Error(`${label}: contrast\n  ${issues.join("\n  ")}`);
}

async function run(width, lang) {
  const touch = width < 1024;
  const label = `${width} ${lang}${touch ? " touch" : ""}`;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const w = WORDS[lang];
  const reading = async () => {
    if (touch) await clickDockTab(page, "reading");
  };
  const back = async () => {
    if (touch) await clickDockTab(page, "reading").catch(() => {});
  };
  /** On a phone, the sheet folded again (a tap on its open tab folds it): the page's own parts come back. */
  const fold = async () => {
    if (!touch || (await page.locator(".ob-panel").getAttribute("data-detent")) === "peek") return;
    await page.getByTestId("dock-tab-reading").click();
    await page.waitForFunction(() => document.querySelector(".ob-panel")?.getAttribute("data-detent") === "peek", null, { timeout: 5000 }).catch(() => {});
  };
  let link = "";
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await ensureTheme(page, touch ? "light" : "dark");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    // Nothing but the app's own files, by GET, from here (_sent.mjs): the bodygraphs are cast on the device.
    const sent = watchSent(page);

    // ── From Human Design, the switcher's pair button opens its own Relationship page ──
    await goStudioPage(page, "design");
    await page.getByTestId("hd-graph").waitFor({ timeout: 30000 });
    await page.getByTestId("chart-chip").click();
    const pairButton = page.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"] [data-testid=chart-pair]`);
    const pairSays = await pairButton.getAttribute("aria-label");
    if (pairSays !== w.pairButton) throw new Error(`${label}: the pair button says "${pairSays}"`);
    await pairButton.click();
    await page.getByTestId("hd-pair-graph").waitFor({ timeout: 30000 });
    if (new URL(page.url()).pathname !== "/human-design/pair") throw new Error(`${label}: the pair button led to ${page.url()}`);
    if (await page.getByTestId("studio-synastry").count()) throw new Error(`${label}: the pair button opened Synastry`);
    if (!touch) {
      // Alt+1 back to the bodygraph, Alt+3 to the two people again.
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
      await page.keyboard.press("Alt+1");
      await waitStudioPage(page, "design");
      await page.keyboard.press("Alt+3");
      await waitStudioPage(page, "design-pair");
      await page.getByTestId("hd-pair-graph").waitFor({ timeout: 30000 });
      // From Compare on the bodygraph, "See how they meet" leads here with the same two (meet.ts).
      await goStudioPage(page, "design");
      await page.getByTestId("compare-toggle").click();
      await page.getByTestId("compare").waitFor({ timeout: 15000 });
      await page.getByTestId("compare-meet").click();
      await waitStudioPage(page, "design-pair");
      await page.getByTestId("compare").waitFor({ state: "detached", timeout: 8000 });
      await page.getByTestId("hd-pair-graph").waitFor({ timeout: 30000 });
    }
    const persons = await page.evaluate(() => [...document.querySelectorAll("[data-testid^=design-pair-person-]")].map((s) => s.selectedOptions?.[0]?.textContent));
    if (persons.join() !== `${FIXTURE_A.name},${FIXTURE_B.name}`) throw new Error(`${label}: the two people ${persons}`);

    // ── The figure ──
    const fig = await figureFacts(page);
    if (fig.gates !== 64 || fig.channels !== 36 || fig.centres !== 9 || fig.columns !== 0) throw new Error(`${label}: the drawing ${JSON.stringify(fig)}`);
    if (JSON.stringify(Object.entries(fig.formed).sort()) !== JSON.stringify(Object.entries(FORMED).sort())) throw new Error(`${label}: the channels formed ${JSON.stringify(fig.formed)}`);
    if (fig.drawn !== 0) throw new Error(`${label}: ${fig.drawn} channels not formed are drawn`);
    if (fig.sparks !== 6) throw new Error(`${label}: ${fig.sparks} sparks, not 6`);
    if (fig.tone[20] !== "a" || fig.tone[57] !== "b" || fig.tone[11] !== "both" || fig.tone[64] !== "off") throw new Error(`${label}: whose gates ${JSON.stringify(fig.tone)}`);
    // TraceQA's 20 gates and Sample B's 19, five of them shared.
    if (fig.tones.a !== 15 || fig.tones.b !== 14 || fig.tones.both !== 5 || fig.rings !== fig.tones.b + fig.tones.both) throw new Error(`${label}: the gates' marks ${JSON.stringify(fig.tones)} rings ${fig.rings}`);
    if (fig.defined.length !== 8 || fig.defined.includes("solarPlexus")) throw new Error(`${label}: the centres defined ${fig.defined}`);
    if (JSON.stringify(Object.entries(fig.marks).sort()) !== JSON.stringify(Object.entries(MARKS).sort())) throw new Error(`${label}: the centres' marks ${JSON.stringify(fig.marks)}`);
    if (fig.focusable) throw new Error(`${label}: ${fig.focusable} pieces of the figure in the Tab order (one stop: the list)`);
    const people = await page.getByTestId("hd-pair-people").innerText();
    for (const t of w.people) if (!people.includes(t)) throw new Error(`${label}: the people "${people}"`);

    // ── The legend: the four kinds with their counts ──
    const kinds = await page.evaluate(() => [...document.querySelectorAll("[data-testid^=hd-pair-kind-]")].map((b) => [b.getAttribute("data-kind"), b.getAttribute("data-count"), b.querySelector(".ulune-hdp-kind-name")?.textContent, b.getBoundingClientRect().height]));
    if (kinds.map((k) => `${k[0]}:${k[1]}`).join() !== "electromagnetic:6,companionship:0,dominance:2,compromise:3") throw new Error(`${label}: the kinds ${JSON.stringify(kinds)}`);
    if (kinds.map((k) => k[2]).join() !== w.kinds.join()) throw new Error(`${label}: the kinds' names ${kinds.map((k) => k[2])}`);
    if (kinds.some((k) => k[3] < (touch ? 44 : 24))) throw new Error(`${label}: a kind under its tap size ${kinds.map((k) => k[3])}`);
    const side = await page.evaluate(() => ({
      a: document.querySelector("[data-testid=hd-pair-cond-a] .ulune-hdp-row-v")?.textContent,
      b: document.querySelector("[data-testid=hd-pair-cond-b] .ulune-hdp-row-v")?.textContent,
      open: document.querySelector("[data-testid=hd-pair-open] .ulune-hdp-row-v")?.textContent,
      def: document.querySelector("[data-testid=hd-pair-definition] .ulune-hdp-row-v")?.textContent,
    }));
    const centre = lang === "fr" ? { sacral: "Sacral", rest: "Ajna, Cœur, Rate", open: "Plexus solaire", def: "Simple · 8–1" } : { sacral: "Sacral", rest: "Ajna, Heart, Spleen", open: "Solar Plexus", def: "Single · 8–1" };
    if (side.a !== centre.sacral || side.b !== centre.rest || side.open !== centre.open || side.def !== centre.def) throw new Error(`${label}: the centres' rows ${JSON.stringify(side)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `hd-pair-${lang}-${width}.png`) }).catch(() => {});

    if (touch) {
      // A tap beside gate 20, the sheet folded: the figure keeps its size, a card in the sheet's row names it, Read opens it.
      const disc = await page.evaluate(() => {
        const r = document.querySelector("[data-testid=hd-gate-20] .hd-gate-disc").getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      const w0 = (await page.getByTestId("hd-pair-graph").boundingBox()).width;
      await page.touchscreen.tap(disc.x + 6, disc.y + 5);
      const card = page.getByTestId("hd-pair-card");
      await card.waitFor({ timeout: 8000 });
      const cardText = await card.innerText();
      for (const t of w.card) if (!cardText.includes(t)) throw new Error(`${label}: the card "${cardText}"`);
      if (await page.getByTestId("pick-card").count()) throw new Error(`${label}: a second card`);
      if ((await page.locator(".ob-panel").getAttribute("data-detent")) !== "peek") throw new Error(`${label}: a tap raised the sheet`);
      if (Math.abs((await page.getByTestId("hd-pair-graph").boundingBox()).width - w0) > 1) throw new Error(`${label}: the figure shrank after a tap`);
      await page.getByTestId("hd-pair-card-read").click();
      await waitNote(page, w.card[0], label, "the card's reading");
      if (await card.count()) throw new Error(`${label}: the card stayed over the open sheet`);
      await page.waitForTimeout(500);
      // Above the open sheet, the figure alone, whole.
      const half = await page.evaluate(() => {
        const z = document.querySelector("[data-testid=hd-pair-zoom]").getBoundingClientRect();
        const sheet = document.querySelector(".ob-panel").getBoundingClientRect();
        return { zoomBottom: z.bottom, sheetTop: sheet.top, w: z.width, side: document.querySelector(".ulune-hdp-side").getBoundingClientRect().height };
      });
      if (half.zoomBottom > half.sheetTop + 1 || half.w < 120 || half.side !== 0) throw new Error(`${label}: the figure above the open sheet ${JSON.stringify(half)}`);
      await page.screenshot({ path: join(SHOTS, `hd-pair-read-${lang}-${width}.png`) }).catch(() => {});
      await fold();
    }

    // A kind: its channels lit on the figure, its reading.
    await page.getByTestId("hd-pair-kind-electromagnetic").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("hd-pair-kind-electromagnetic").click();
    await reading();
    await waitNote(page, w.kindNote, label, "the kind's reading");
    const lit = await page.evaluate(() => [...document.querySelectorAll("[data-testid=hd-pair-graph] [data-testid^=hd-channel-][data-lit]")].map((c) => c.getAttribute("data-testid").slice(11)).sort());
    if (lit.join() !== Object.keys(FORMED).filter((k) => FORMED[k] === "electromagnetic").sort().join()) throw new Error(`${label}: the kind lit ${lit}`);
    await back();

    if (!touch) {
      // A channel chosen on the figure: who brings which gate.
      await page.locator("[data-testid=hd-channel-20-57] .hd-hit").click({ force: true });
      await waitNote(page, w.em, label, "the channel's reading");
      const say = await page.getByTestId("hd-pair-say").innerText();
      if (!say.startsWith("20–57")) throw new Error(`${label}: the line under the chart "${say}"`);
      // A centre: who conditions whom.
      await page.getByTestId("hd-center-sacral").click({ force: true });
      await waitNote(page, w.centre, label, "the centre's reading");
      // Nothing chosen: the first read, nine steps.
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.keyboard.press("Escape");
      await page.getByTestId("hd-pair-hello").waitFor({ timeout: 8000 });
      const steps = await page.locator("[data-testid^=hd-pair-hello-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(14)));
      if (steps.join() !== "summary,electromagnetic,companionship,dominance,compromise,conditioning-a,conditioning-b,open,definition") throw new Error(`${label}: the first read's steps ${steps}`);
      if (!(await page.getByTestId("hd-pair-hello").evaluate((e) => e.textContent ?? "")).includes(w.first)) throw new Error(`${label}: the first read's title`);
      if (!(await page.getByTestId("hd-pair-method").count())) throw new Error(`${label}: no method notes`);
      // The keyboard: one Tab stop on the figure; the arrows walk it, Enter opens a piece.
      await page.getByTestId("hd-pair-keys").focus();
      const first = await page.getByTestId("hd-pair-keys").getAttribute("aria-activedescendant");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      const moved = await page.getByTestId("hd-pair-keys").getAttribute("aria-activedescendant");
      if (!first || moved === first) throw new Error(`${label}: the arrows did not walk the figure (${first} → ${moved})`);
      const hovered = await page.evaluate(() => document.querySelector("[data-testid=hd-pair-graph] [data-hover=hero]")?.getAttribute("data-part"));
      if (!hovered) throw new Error(`${label}: the piece reached is not lit`);
      await page.keyboard.press("Enter");
      await page.getByTestId("click-note").waitFor({ timeout: 8000 });
      const said = await page.getByTestId("hd-pair-keys-said").innerText();
      if (!said) throw new Error(`${label}: Enter said nothing`);
      await page.keyboard.press("Escape");
    }

    // ── The table: its parts, its CSV and Copy ──
    await setView(page, "table");
    await page.getByTestId("hd-pair-table").waitFor({ timeout: 15000 });
    const table = await page.evaluate(() => ({
      channels: [...document.querySelectorAll("[data-testid^=hd-pair-row-][data-kind]")].map((r) => r.getAttribute("data-kind")),
      centres: document.querySelectorAll("[data-testid^=hd-pair-row-centre-]").length,
      gates: document.querySelectorAll("[data-testid^=hd-pair-row-gate-]").length,
    }));
    const formedRows = table.channels.filter((k) => k !== "none");
    if (formedRows.join() !== "electromagnetic,electromagnetic,electromagnetic,electromagnetic,electromagnetic,electromagnetic,dominance,dominance,compromise,compromise,compromise" || table.centres !== 9 || table.gates !== 34)
      throw new Error(`${label}: the table ${JSON.stringify(table)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `hd-pair-table-${lang}-${width}.png`) }).catch(() => {});
    const csv = await csvOf(page);
    const sep = lang === "fr" ? ";" : ",";
    for (const row of [
      ["channel", "20–57", "20|57", "throat|spleen", "electromagnetic", "", "20", "57", "0"],
      ["channel", "25–51", "25|51", "g|heart", "dominance", "b", "", "25|51", "0"],
      ["centre", "sacral", "1", "0", "1", "a", "a"],
      ["centre", "solarPlexus", "0", "0", "0", "", ""],
    ]) {
      if (!csv.split("\n").includes(row.join(sep))) throw new Error(`${label}: the CSV lacks ${row.join(sep)}\n${csv.slice(0, 400)}`);
    }
    await openExport(page);
    await page.getByTestId("table-copy").click();
    await page.waitForTimeout(300);
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    for (const line of w.copy) if (!copied.includes(line)) throw new Error(`${label}: Copy lacks "${line}" in "${copied.slice(0, 300)}"`);
    await page.keyboard.press("Escape").catch(() => {});
    await setView(page, "wheel");
    await page.getByTestId("hd-pair-graph").waitFor({ timeout: 15000 });

    // ── Share both: one link, the two charts, this page ──
    if (!touch) {
      await openExport(page);
      await page.getByTestId("share-open").click();
      await page.getByTestId("share-sheet").waitFor();
      if (!(await page.getByTestId("share-opens").innerText()).includes(w.sheet)) throw new Error(`${label}: the sheet does not name this page`);
      await page.getByTestId("share-both").click();
      await page.waitForFunction(() => document.querySelectorAll("[data-testid^=share-preview-]").length === 2, null, { timeout: 4000 }).catch(() => {
        throw new Error(`${label}: Share both shows one line`);
      });
      const lines = await page.locator("[data-testid^=share-preview-]").allInnerTexts();
      if (!/TraceQA/.test(lines[0] ?? "") || !/Sample B/.test(lines[1] ?? "")) throw new Error(`${label}: the two lines ${JSON.stringify(lines)}`);
      await page.waitForFunction(() => /^https?:\/\/.+\/s#\d\./.test(document.querySelector("[data-testid=share-link]")?.value ?? ""), null, { timeout: 10000 });
      link = await page.getByTestId("share-link").inputValue();
      await page.getByTestId("share-close").click();
      await page.getByTestId("share-sheet").waitFor({ state: "detached", timeout: 4000 });
    }

    // ── Contrast, both themes ──
    for (const theme of ["dark", "light"]) {
      await ensureTheme(page, theme);
      await page.waitForTimeout(500);
      await contrast(page, `${label} ${theme}`);
    }
    await page.screenshot({ path: join(SHOTS, `hd-pair-light-${lang}-${width}.png`) }).catch(() => {});

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`hd-pair ${label} OK`);
  } finally {
    await browser.close();
  }
  return link;
}

/** The link of "Share both" opened in a fresh browser: this page, with the two people set, cast on the device. */
async function arrive(link) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[1280] });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const sent = watchSent(page);
    await page.goto(link, { waitUntil: "load", timeout: 45000 });
    await page.waitForFunction(() => location.pathname === "/human-design/pair", null, { timeout: 30000 });
    // Both bodygraphs cast on this fresh device: the engine's files come first (a few seconds).
    await page.getByTestId("hd-pair-graph").waitFor({ state: "attached", timeout: 45000 }).catch(async () => {
      const seen = await page.evaluate(() => ({
        loading: Boolean(document.querySelector("[data-testid=hd-pair-loading]")),
        need: Boolean(document.querySelector("[data-testid=hd-pair-need-second]")),
        error: document.querySelector("[data-testid=hd-pair-error]")?.textContent ?? null,
        page: document.querySelector("[data-testid=studio-nav]")?.getAttribute("data-page"),
      }));
      throw new Error(`arrival: no connection chart ${JSON.stringify(seen)} ${errors.join(" | ")}`);
    });
    await page.waitForFunction(() => document.querySelector("[data-testid=design-pair-person-b]")?.selectedOptions?.[0]?.textContent === "Sample B", null, { timeout: 10000 }).catch(() => {});
    const a = await page.getByTestId("design-pair-person-a").evaluate((el) => el.selectedOptions[0]?.textContent);
    const b = await page.getByTestId("design-pair-person-b").evaluate((el) => el.selectedOptions[0]?.textContent);
    if (a !== FIXTURE_A.name || b !== FIXTURE_B.name) throw new Error(`arrival: the pair shown is ${a} and ${b}`);
    const kinds = await page.evaluate(() => [...document.querySelectorAll("[data-testid=hd-pair-graph] [data-kind]")].length);
    if (kinds !== 11) throw new Error(`arrival: ${kinds} channels formed`);
    if (sent.length) throw new Error(`arrival: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`arrival: ${errors.join(" | ")}`);
    console.log("hd-pair Share both OK: one link, the two charts, the connection chart with the partner set");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const failures = [];
let link = "";
for (const [width, lang] of [
  [1280, "en"],
  [390, "fr"],
]) {
  try {
    const got = await run(width, lang);
    if (got) link = got;
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
if (link) {
  try {
    await arrive(link);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
} else failures.push("no Share both link to open");
if (failures.length) {
  console.error(`HD-PAIR FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`HD-PAIR OK (${DEV})`);
