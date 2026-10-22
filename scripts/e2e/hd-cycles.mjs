/*
 * Human Design's Cycles (share and compare plan, feature 5b, decision R2),
 * /human-design/cycles, at 1280 px in English (dark) and 390 px in French on
 * a touch screen (light), with the two made-up charts (Fixture B, then
 * Fixture A shown: TraceQA) and the dial set to Sunday 18 October 2026,
 * 08:43 in Paris:
 *   - the lens: Cycles between Natal and Relationship, Alt+2 from the
 *     bodygraph and Alt+1 back;
 *   - the moment's thirteen bodies in their gates and lines (the strip, three
 *     chips ringed); on the figure, the three channels the moment completes
 *     with TraceQA's gates (63–4, 28–38, 42–53, each with its spark), the
 *     moment's own (32–54, 41–30), the five centres it defines for her; the
 *     gate of the week 32.5, the Moon's 54.6;
 *   - a completed channel's reading starts with her gate and the moment's,
 *     and lights the channel;
 *   - the life cycles found on this device: Saturn's return behind her (one
 *     passage, January 2020), Uranus's opposition ahead (three), Chiron's
 *     return ahead, the second Saturn return ahead (three); the solar return
 *     of 2026 on 15 June at 04:53 in Paris, the next year's; "Show on the
 *     dial" pins the dial there (the Sun back in her gate 12.2), Now lets it
 *     follow the clock again;
 *   - the dial a day forward and back; the keyboard walks the figure from
 *     one Tab stop, Enter reads a piece; the first read's ten steps and the
 *     method notes; on a phone a tap near a gate keeps the figure whole
 *     behind a card that names it;
 *   - the table: the 13 bodies, the channels, the 9 centres, every passage,
 *     the solar return; its CSV and Copy;
 *   - Compare with the two people: both bodygraphs under the same moment,
 *     each with its own life cycles;
 *   - contrast of the page's own words in both themes; nothing sent beyond
 *     the app's own files (the sky and the cycles are worked out on the
 *     device, the door's default); nothing scrolls sideways.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { DEV, FIXTURE_A, FIXTURE_B, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, ensureShotsDir, ensureTheme, goStudioPage, gotoApp, openExport, openTimePicker, setLang, setView, studioPageNow, waitStudioPage } from "./_lib.mjs";
import { contrastScan, formatIssue } from "./_contrast.mjs";
import { watchSent } from "./_sent.mjs";

/** The dial's moment: 18 October 2026, 08:43 in Paris (the browser's clock here). */
const AT = Date.UTC(2026, 9, 18, 6, 43);
/** TraceQA's solar return in 2026 (scripts/hd-cycles.test.mjs finds it on the engine). */
const SOLAR_2026 = Date.UTC(2026, 5, 15, 2, 53, 46);
const DAY = 86_400_000;

const WORDS = {
  en: {
    channel: "Your gate 63 and the moment’s gate 4 (Jupiter 4.4) complete this channel",
    uranus: "Ahead: Uranus will pass the point 3 times, turning back and forward again",
    solar: "15 Jun 2026, 04:53",
    first: "Your cycles, step by step",
    card: ["63", "Head"],
    copy: ["63–4", "Saturn return · 23 Jan 2020 · direct · at 29 · Gate 61.4 · behind you"],
    lens: "Cycles",
  },
  fr: {
    channel: "Votre porte 63 et la porte 4 du moment (Jupiter 4.4) complètent ce canal",
    uranus: "À venir\u202f: Uranus passera 3 fois sur ce point, en rebroussant chemin puis en repartant",
    solar: "15 juin 2026, 04:53",
    first: "Vos cycles, pas à pas",
    card: ["63", "Tête"],
    copy: ["63–4", "Retour de Saturne · 23 janv. 2020 · direct · à 29 ans · Porte 61.4 · derrière vous"],
    lens: "Cycles",
  },
};

/** The moment's bodies, gate.line (the engine's, as scripts/hd-cycles.test.mjs checks them). */
const STRIP = {
  sun: "32.5",
  earth: "42.5",
  moon: "54.6",
  northnode: "30.4",
  southnode: "29.4",
  mercury: "43.1",
  venus: "28.3",
  mars: "33.5",
  jupiter: "4.4",
  saturn: "21.1",
  uranus: "20.6",
  neptune: "25.5",
  pluto: "41.2",
};

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

const rootAttr = (page, name) => page.evaluate((n) => document.querySelector("[data-testid=hd-cycles]")?.getAttribute(n) ?? null, name);

/** The dial on a moment: its root says it, and the sky for that moment is in (data-moment). */
async function waitMoment(page, at, label) {
  await page.waitForFunction((ms) => ["data-at", "data-moment"].every((n) => document.querySelector("[data-testid=hd-cycles]")?.getAttribute(n) === String(ms)), at, { timeout: 20000 }).catch(async () => {
    throw new Error(`${label}: the page stands at ${await rootAttr(page, "data-at")} (its sky ${await rootAttr(page, "data-moment")}), not ${new Date(at).toISOString()}`);
  });
}

/** The dial within a minute of a moment (a moment pinned from elsewhere on the page), the sky for it in. */
async function waitNear(page, at, label) {
  await page.waitForFunction(
    (ms) => {
      const root = document.querySelector("[data-testid=hd-cycles]");
      return Math.abs(Number(root?.getAttribute("data-at")) - ms) < 60_000 && root?.getAttribute("data-moment") === root?.getAttribute("data-at");
    },
    at,
    { timeout: 20000 },
  ).catch(async () => {
    throw new Error(`${label}: the page stands at ${await rootAttr(page, "data-at")}, not near ${new Date(at).toISOString()}`);
  });
}

/** The page's own parts as drawn: the strip, the figure's channels and centres, the lists. */
const pageFacts = (page) =>
  page.evaluate(() => {
    const svg = document.querySelector("[data-testid=hd-cycles-graph]");
    const chips = [...document.querySelectorAll("[data-testid^=hd-cycles-body-]")];
    const kinds = Object.fromEntries([...svg.querySelectorAll("[data-testid^=hd-channel-][data-kind]")].map((c) => [c.getAttribute("data-testid").slice(11), c.getAttribute("data-kind")]));
    return {
      strip: Object.fromEntries(chips.map((c) => [c.getAttribute("data-testid").slice(15), `${c.getAttribute("data-gate")}.${c.getAttribute("data-line")}`])),
      ringed: chips.filter((c) => c.hasAttribute("data-completes")).map((c) => c.getAttribute("data-testid").slice(15)),
      chipHeights: chips.map((c) => c.getBoundingClientRect().height),
      em: Object.keys(kinds).filter((k) => kinds[k] === "electromagnetic").sort(),
      kinds,
      sparks: svg.querySelectorAll(".hd-spark").length,
      tone: Object.fromEntries([4, 63, 32, 12, 64].map((n) => [n, svg.querySelector(`[data-testid=hd-gate-${n}]`)?.getAttribute("data-tone")])),
      by: Object.fromEntries([...svg.querySelectorAll("[data-testid^=hd-center-][data-by]")].map((c) => [c.getAttribute("data-center"), c.getAttribute("data-by")])),
      completes: [...document.querySelectorAll("[data-testid^=hd-cycles-channel-]")].map((r) => r.getAttribute("data-testid").slice(18)),
      centres: [...document.querySelectorAll("[data-testid^=hd-cycles-centre-]")].map((r) => r.getAttribute("data-testid").slice(17)),
      week: document.querySelector("[data-testid=hd-cycles-week]")?.getAttribute("data-gate"),
      moon: document.querySelector("[data-testid=hd-cycles-moon]")?.getAttribute("data-gate"),
      focusable: svg.querySelectorAll("[tabindex]").length,
      columns: document.querySelectorAll("[data-testid=hd-cycles-box] .ulune-hd-col").length,
    };
  });

async function contrast(page, label) {
  const issues = [];
  for (const root of [".ulune-hdc-side", ".ulune-hdc-strip"]) {
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
  // The dial's clock is the browser's: Paris, so 08:43 is typed and read as the page shows it.
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch, timezoneId: "Europe/Paris" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const w = WORDS[lang];
  /** On a phone, the sheet folded again (a tap on its open tab folds it): the page's own parts come back. */
  const fold = async () => {
    if (!touch || (await page.locator(".ob-panel").getAttribute("data-detent")) === "peek") return;
    await page.getByTestId("dock-tab-reading").click();
    await page.waitForFunction(() => document.querySelector(".ob-panel")?.getAttribute("data-detent") === "peek", null, { timeout: 5000 }).catch(() => {});
  };
  /** A part of the page pressed: in view first (the page scrolls on a phone), then its reading. */
  const pressRow = async (testId) => {
    await fold();
    const row = page.getByTestId(testId);
    await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await row.click();
  };
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await ensureTheme(page, touch ? "light" : "dark");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    // Nothing but the app's own files, by GET, from here (_sent.mjs): the sky, the cycles and the bodygraphs are worked out on the device.
    const sent = watchSent(page);

    // ── The lens: Cycles between Natal and Relationship ──
    await goStudioPage(page, "design");
    await page.getByTestId("hd-graph").waitFor({ timeout: 30000 });
    const lenses = await page.locator("[data-testid^=lens-]").evaluateAll((els) => els.map((e) => e.dataset.testid));
    if (lenses.join() !== "lens-natal,lens-cycles,lens-relationship") throw new Error(`${label}: Human Design's lenses ${lenses}`);
    if (!touch) {
      if ((await page.getByTestId("lens-cycles").innerText()).trim() !== w.lens) throw new Error(`${label}: the lens reads "${await page.getByTestId("lens-cycles").innerText()}"`);
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
      await page.keyboard.press("Alt+2");
      await waitStudioPage(page, "design-cycles");
      await page.keyboard.press("Alt+1");
      await waitStudioPage(page, "design");
      await page.keyboard.press("Alt+2");
      await waitStudioPage(page, "design-cycles");
    } else await goStudioPage(page, "design-cycles");
    await page.getByTestId("hd-cycles-graph").waitFor({ timeout: 30000 });
    if (new URL(page.url()).pathname !== "/human-design/cycles") throw new Error(`${label}: the page's address is ${page.url()}`);
    if ((await studioPageNow(page)) !== "design-cycles") throw new Error(`${label}: on ${await studioPageNow(page)}`);

    // ── The dial on 18 October 2026, 08:43 in Paris ──
    await openTimePicker(page, "hd-cycles-dial", "hd-cycles-clock");
    await page.getByTestId("hd-cycles-date").fill("18/10/2026");
    await page.getByTestId("hd-cycles-time").fill("08:43");
    if ((await page.getByTestId("hd-cycles-clock").getAttribute("data-live")) !== "0") throw new Error(`${label}: typing a moment did not pin the dial`);
    await page.keyboard.press("Escape");
    await page.getByTestId("hd-cycles-clock").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    await waitMoment(page, AT, label);

    // ── The strip, the figure, the lists ──
    const facts = await pageFacts(page);
    if (JSON.stringify(facts.strip) !== JSON.stringify(STRIP)) throw new Error(`${label}: the moment's bodies ${JSON.stringify(facts.strip)}`);
    if (facts.ringed.sort().join() !== "earth,jupiter,venus") throw new Error(`${label}: the chips ringed ${facts.ringed}`);
    if (touch && facts.chipHeights.some((h) => h < 43.5)) throw new Error(`${label}: a chip under 44 px ${facts.chipHeights}`);
    if ((await rootAttr(page, "data-completes")) !== "63–4,28–38,42–53") throw new Error(`${label}: the moment completes ${await rootAttr(page, "data-completes")}`);
    if (facts.em.join() !== "28-38,42-53,63-4") throw new Error(`${label}: the channels completed on the figure ${facts.em}`);
    if (facts.sparks !== 3) throw new Error(`${label}: ${facts.sparks} sparks, not 3`);
    for (const id of ["32-54", "41-30"]) if (!facts.kinds[id] || facts.kinds[id] === "electromagnetic") throw new Error(`${label}: the moment's own ${id} is drawn as ${facts.kinds[id]}`);
    if (facts.tone[4] !== "b" || facts.tone[63] !== "a" || facts.tone[32] !== "b" || facts.tone[64] !== "off") throw new Error(`${label}: whose gates ${JSON.stringify(facts.tone)}`);
    for (const c of ["head", "ajna", "solarPlexus", "spleen", "root"]) if (!["b", "together"].includes(facts.by[c])) throw new Error(`${label}: the ${c} marked ${facts.by[c]}`);
    if (facts.completes.join() !== "63-4,28-38,42-53") throw new Error(`${label}: the list of what it completes ${facts.completes}`);
    if (facts.centres.join() !== "head,ajna,solarPlexus,spleen,root") throw new Error(`${label}: the centres it defines ${facts.centres}`);
    if (facts.week !== "32" || facts.moon !== "54") throw new Error(`${label}: the week's gate ${facts.week}, the Moon's ${facts.moon}`);
    if (facts.focusable || facts.columns) throw new Error(`${label}: ${facts.focusable} pieces of the figure in the Tab order, ${facts.columns} columns`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `hd-cycles-${lang}-${width}.png`) }).catch(() => {});

    // ── A channel the moment completes: its reading, lit on the figure ──
    await pressRow("hd-cycles-channel-63-4");
    await waitNote(page, w.channel, label, "the completed channel's reading");
    if (!(await page.locator("[data-testid=hd-cycles-graph] [data-testid=hd-channel-63-4][data-lit]").count())) throw new Error(`${label}: the channel chosen is not lit`);
    await fold();

    // ── The life cycles, found on this device ──
    await page.getByTestId("hd-cycles-life-saturn2").waitFor({ timeout: 30000 });
    const life = await page.evaluate(() => [...document.querySelectorAll("[data-testid^=hd-cycles-life-][data-passages]")].map((r) => `${r.getAttribute("data-testid").slice(15)}:${r.getAttribute("data-passages")}:${r.getAttribute("data-cycle-status")}`));
    if (life.join() !== "saturn1:1:past,uranus:3:coming,chiron:1:coming,saturn2:3:coming") throw new Error(`${label}: the life cycles ${life}`);
    if (!/2020/.test(await page.getByTestId("hd-cycles-life-saturn1").innerText())) throw new Error(`${label}: Saturn's return says "${await page.getByTestId("hd-cycles-life-saturn1").innerText()}"`);
    await pressRow("hd-cycles-life-uranus");
    await waitNote(page, w.uranus, label, "the Uranus opposition's reading");
    if (!(await page.locator("[data-testid=hd-cycles-graph] [data-testid=hd-gate-52][data-lit]").count())) throw new Error(`${label}: the opposition's gate 52 is not lit`);
    await fold();

    // ── The solar return: 2026's, then 2027's ──
    const solarRow = page.getByTestId("hd-cycles-solar-row");
    await solarRow.waitFor({ timeout: 20000 });
    if ((await page.getByTestId("hd-cycles-solar-year").innerText()).trim() !== "2026") throw new Error(`${label}: the solar return's year ${await page.getByTestId("hd-cycles-solar-year").innerText()}`);
    const solarAt = Number(await solarRow.getAttribute("data-at"));
    if (!(Math.abs(solarAt - SOLAR_2026) < 60_000)) throw new Error(`${label}: the solar return at ${new Date(solarAt).toISOString()}`);
    if (!(await solarRow.innerText()).includes(w.solar)) throw new Error(`${label}: the solar return says "${await solarRow.innerText()}"`);
    await page.getByTestId("hd-cycles-solar-next").click();
    await page.waitForFunction(() => new Date(Number(document.querySelector("[data-testid=hd-cycles-solar-row]")?.getAttribute("data-at"))).getUTCFullYear() === 2027, null, { timeout: 15000 }).catch(() => {
      throw new Error(`${label}: the next year's solar return did not come`);
    });
    if ((await page.getByTestId("hd-cycles-solar-year").innerText()).trim() !== "2027") throw new Error(`${label}: the year after is not 2027`);
    await page.getByTestId("hd-cycles-solar-prev").click();
    await page.waitForFunction((ms) => document.querySelector("[data-testid=hd-cycles-solar-row]")?.getAttribute("data-at") === String(ms), solarAt, { timeout: 15000 });
    if ((await rootAttr(page, "data-at")) !== String(AT)) throw new Error(`${label}: changing the solar return's year moved the dial`);

    if (!touch) {
      // ── The first read: ten steps; the method notes ──
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.keyboard.press("Escape");
      await page.getByTestId("hd-cycles-hello").waitFor({ timeout: 8000 });
      await page.waitForFunction(() => !document.querySelector("[data-testid=hd-cycles-hello][data-empty]"), null, { timeout: 15000 });
      const steps = await page.locator("[data-testid^=hd-cycles-hello-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(16)));
      if (steps.join() !== "moment,week,moon,completes,centres,life-saturn1,life-uranus,life-chiron,life-saturn2,solar") throw new Error(`${label}: the first read's steps ${steps}`);
      if (!(await page.getByTestId("hd-cycles-hello").evaluate((e) => e.textContent ?? "")).includes(w.first)) throw new Error(`${label}: the first read's title`);
      if (!(await page.getByTestId("hd-cycles-method").count())) throw new Error(`${label}: no method notes`);
      await page.getByTestId("hd-cycles-hello-week").click();
      await page.getByTestId("click-note").waitFor({ timeout: 8000 });
      await page.keyboard.press("Escape");
      // ── The keyboard: one Tab stop on the figure; the arrows walk it, Enter reads a piece ──
      await page.getByTestId("hd-cycles-keys").focus();
      const first = await page.getByTestId("hd-cycles-keys").getAttribute("aria-activedescendant");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      const moved = await page.getByTestId("hd-cycles-keys").getAttribute("aria-activedescendant");
      if (!first || moved === first) throw new Error(`${label}: the arrows did not walk the figure (${first} → ${moved})`);
      if (!(await page.evaluate(() => document.querySelector("[data-testid=hd-cycles-graph] [data-hover=hero]")?.getAttribute("data-part")))) throw new Error(`${label}: the piece reached is not lit`);
      await page.keyboard.press("Enter");
      await page.getByTestId("click-note").waitFor({ timeout: 8000 });
      if (!(await page.getByTestId("hd-cycles-keys-said").innerText())) throw new Error(`${label}: Enter said nothing`);
      await page.keyboard.press("Escape");
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    } else {
      // ── A phone: a tap beside gate 63 keeps the figure whole behind a card; Read opens it ──
      await page.getByTestId("hd-cycles-graph").evaluate((el) => el.scrollIntoView({ block: "start" }));
      const disc = await page.evaluate(() => {
        const r = document.querySelector("[data-testid=hd-cycles-graph] [data-testid=hd-gate-63] .hd-gate-disc").getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      const w0 = (await page.getByTestId("hd-cycles-graph").boundingBox()).width;
      await page.touchscreen.tap(disc.x + 4, disc.y + 4);
      const card = page.getByTestId("hd-cycles-card");
      await card.waitFor({ timeout: 8000 });
      const cardText = await card.innerText();
      for (const t of w.card) if (!cardText.includes(t)) throw new Error(`${label}: the card "${cardText}"`);
      if (await page.getByTestId("pick-card").count()) throw new Error(`${label}: a second card`);
      if ((await page.locator(".ob-panel").getAttribute("data-detent")) !== "peek") throw new Error(`${label}: a tap raised the sheet`);
      if (Math.abs((await page.getByTestId("hd-cycles-graph").boundingBox()).width - w0) > 1) throw new Error(`${label}: the figure shrank after a tap`);
      await page.getByTestId("hd-cycles-card-read").click();
      await page.getByTestId("click-note").waitFor({ timeout: 8000 });
      await page.waitForTimeout(500);
      // Above the open sheet: the figure and the dial, whole; the lists wait under the sheet.
      const half = await page.evaluate(() => {
        const z = document.querySelector("[data-testid=hd-cycles-zoom]").getBoundingClientRect();
        const sheet = document.querySelector(".ob-panel").getBoundingClientRect();
        return { zoomBottom: z.bottom, sheetTop: sheet.top, w: z.width, side: document.querySelector(".ulune-hdc-side").getBoundingClientRect().height };
      });
      if (half.zoomBottom > half.sheetTop + 1 || half.w < 120 || half.side !== 0) throw new Error(`${label}: the figure above the open sheet ${JSON.stringify(half)}`);
      await page.screenshot({ path: join(SHOTS, `hd-cycles-read-${lang}-${width}.png`) }).catch(() => {});
      await fold();
    }

    // ── The dial: a day forward, the figure follows; back to the moment ──
    await page.getByTestId("hd-cycles-dial-forward").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("hd-cycles-dial-forward").click();
    await waitMoment(page, AT + DAY, `${label} a day later`);
    const moon2 = await page.getByTestId("hd-cycles-body-moon").getAttribute("data-gate");
    if (moon2 === "54") throw new Error(`${label}: a day later the Moon is still in gate 54`);
    await page.getByTestId("hd-cycles-dial-back").click();
    await waitMoment(page, AT, `${label} back`);

    // ── The table: its parts, its CSV and Copy ──
    await setView(page, "table");
    await page.getByTestId("hd-cycles-table").waitFor({ timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=hd-cycles-row-life-]").length === 8, null, { timeout: 30000 }).catch(() => {});
    const table = await page.evaluate(() => ({
      bodies: document.querySelectorAll("[data-testid^=hd-cycles-row-body-]").length,
      channels: [...document.querySelectorAll("[data-testid^=hd-cycles-row-]")].map((r) => r.getAttribute("data-testid").slice(14)).filter((id) => /^\d+-\d+$/.test(id)),
      centres: document.querySelectorAll("[data-testid^=hd-cycles-row-centre-]").length,
      life: document.querySelectorAll("[data-testid^=hd-cycles-row-life-]").length,
      solar: document.querySelectorAll("[data-testid=hd-cycles-row-solar]").length,
    }));
    if (table.bodies !== 13 || table.channels.join() !== "63-4,28-38,42-53,32-54,41-30" || table.centres !== 9 || table.life !== 8 || table.solar !== 1) throw new Error(`${label}: the table ${JSON.stringify(table)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `hd-cycles-table-${lang}-${width}.png`) }).catch(() => {});
    const csv = await csvOf(page);
    const sep = lang === "fr" ? ";" : ",";
    const lines = csv.split("\n");
    for (const row of [
      ["moment", "jupiter", "4", "4"],
      ["channel", "63–4", "63|4", "head|ajna", "temporary", "63", "4", "jupiter:4.4"],
      ["centre", "head", "0", "together", "63–4"],
      ["cycle", "saturn1", "saturn"],
      ["solar", "2026", "2026-06-15T02:53:4"],
    ]) {
      if (!lines.some((l) => l.startsWith(row.join(sep)))) throw new Error(`${label}: the CSV lacks ${row.join(sep)}…\n${csv.slice(0, 400)}`);
    }
    const passages = lines.filter((l) => l.startsWith(`cycle${sep}`) && !l.startsWith(`cycle${sep}id${sep}`));
    if (passages.length !== 8) throw new Error(`${label}: the CSV's passages ${passages.length}`);
    await openExport(page);
    await page.getByTestId("table-copy").click();
    await page.waitForTimeout(300);
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    for (const line of w.copy) if (!copied.includes(line)) throw new Error(`${label}: Copy lacks "${line}" in "${copied.slice(0, 300)}"`);
    await page.keyboard.press("Escape").catch(() => {});
    await setView(page, "wheel");
    await page.getByTestId("hd-cycles-graph").waitFor({ timeout: 15000 });

    // ── "Show on the dial": the dial at the solar return, the Sun back in her gate; Now follows the clock again ──
    await page.getByTestId("hd-cycles-solar-show").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("hd-cycles-solar-show").click();
    await waitNear(page, solarAt, `${label} the solar return on the dial`);
    if ((await page.getByTestId("hd-cycles-body-sun").getAttribute("data-gate")) !== "12" || (await page.getByTestId("hd-cycles-body-sun").getAttribute("data-line")) !== "2") throw new Error(`${label}: at the solar return the Sun is not in 12.2`);
    await page.getByTestId("hd-cycles-now").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("hd-cycles-now").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=hd-cycles-now]")?.getAttribute("data-live") === "1", null, { timeout: 5000 }).catch(() => {
      throw new Error(`${label}: Now did not let the dial follow the clock`);
    });
    const now = Number(await rootAttr(page, "data-at"));
    if (!(Math.abs(now - Date.now()) < 5 * 60_000)) throw new Error(`${label}: after Now the page stands at ${new Date(now).toISOString()}`);

    // ── Compare with the two people: both bodygraphs under the same moment, each with its own life cycles ──
    if (!touch) {
      await page.getByTestId("compare-toggle").click();
      await page.getByTestId("compare").waitFor({ timeout: 15000 });
      for (const who of ["a", "b"]) {
        await page.locator(`[data-testid=compare-pane-${who}] [data-testid=hd-cycles-life-saturn1]`).waitFor({ state: "attached", timeout: 30000 }).catch(() => {
          throw new Error(`${label}: Compare's pane ${who} found no life cycles`);
        });
      }
      const panes = await page.evaluate(() =>
        ["a", "b"].map((w) => {
          const pane = document.querySelector(`[data-testid=compare-pane-${w}]`);
          const height = (sel) => Math.round(pane?.querySelector(sel)?.getBoundingClientRect().height ?? 0);
          return {
            at: pane?.querySelector("[data-testid=hd-cycles]")?.getAttribute("data-at"),
            saturn: pane?.querySelector("[data-testid=hd-cycles-life-saturn1]")?.textContent ?? "",
            // A pane is a narrow stage: the strip, the figure, the dial and the lists one under the other, none squeezed away.
            strip: height(".ulune-hdc-strip"),
            side: height(".ulune-hdc-side"),
            life: height("[data-testid=hd-cycles-life]"),
          };
        }),
      );
      if (!/2020/.test(panes[0].saturn) || !/2016/.test(panes[1].saturn)) throw new Error(`${label}: Compare's life cycles ${JSON.stringify(panes)}`);
      if (!panes[0].at || panes[0].at !== panes[1].at) throw new Error(`${label}: Compare's panes stand at ${panes[0].at} and ${panes[1].at}`);
      for (const p of panes) if (p.strip < 24 || p.life < 100 || p.side < p.life) throw new Error(`${label}: a Compare pane squeezes its parts ${JSON.stringify(panes)}`);
      await page.screenshot({ path: join(SHOTS, `hd-cycles-compare-${lang}-${width}.png`) }).catch(() => {});
      await page.getByTestId("compare-leave").click();
      await page.getByTestId("compare").waitFor({ state: "detached", timeout: 8000 });
    }

    // ── Contrast, both themes ──
    await page.getByTestId("hd-cycles-week").waitFor({ timeout: 15000 });
    for (const theme of ["dark", "light"]) {
      await ensureTheme(page, theme);
      await page.waitForTimeout(500);
      await contrast(page, `${label} ${theme}`);
    }
    await page.screenshot({ path: join(SHOTS, `hd-cycles-themes-${lang}-${width}.png`) }).catch(() => {});

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`hd-cycles ${label} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const failures = [];
for (const [width, lang] of [
  [1280, "en"],
  [390, "fr"],
]) {
  try {
    await run(width, lang);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
if (failures.length) {
  console.error(`HD-CYCLES FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`HD-CYCLES OK (${DEV})`);
