/*
 * The Calendar as a section of its own (page reorganisation plan, R5), at
 * its own addresses, /calendar and /calendrier, reached by address:
 *   - the head: its own title and description, its address as the canonical
 *     one and its twin in the other language (hreflang), open to search
 *     engines, in both languages, as the server sends it;
 *   - without any chart, at 1280 and 390 px, in English and French: the
 *     sky's month (each day's Moon, the exact phases and the sky's events in
 *     words), one line inviting a cast, the personal layers listed
 *     unavailable with why; the day, the year, the events table, the sky's
 *     calendar file and the side panel's Now; the other Time pages still ask
 *     for a chart; nothing scrolls sideways;
 *   - the layers in View: grouped by language, reached and switched with the
 *     keyboard, the month following them;
 *   - the invitation opens the birth form, which leads back to the sky; a
 *     cast there (FIXTURE_A) brings your transits onto their days;
 *     numerology's personal days show only once its layer is on, and the
 *     choice is still there after a reload (the chart kept in a private
 *     space that stays unlocked here).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEV,
  FIXTURE_A,
  SHOTS,
  assertNoOverflow,
  clickDockTab,
  ensureShotsDir,
  gotoApp,
  keepCharts,
  launch,
  openCalendarView,
  openExport,
  pickPlace,
  setLang,
  setView,
} from "./_lib.mjs";

const SITE = "https://ulune.app";
const WORDS = {
  en: {
    invite: "Cast a chart to add your transits",
    phases: /New Moon|First quarter|Full Moon|Last quarter/,
    layers: { sky: "The sky", transits: "Your transits", numerology: "Personal day, month and year", terms: "Solar terms", animals: "The day’s animal", stars: "Flying stars" },
    langs: { astrology: "Astrology", numerology: "Numerology", chinese: "Chinese calendar" },
    nextTerm: "Next solar term",
    needs: "Needs a birth chart",
  },
  fr: {
    invite: "Calculez un thème pour ajouter vos transits",
    phases: /Nouvelle Lune|Premier quartier|Pleine Lune|Dernier quartier/,
    layers: { sky: "Le ciel", transits: "Vos transits", numerology: "Jour, mois et année personnels", terms: "Termes solaires", animals: "L’animal du jour", stars: "Étoiles volantes" },
    langs: { astrology: "Astrologie", numerology: "Numérologie", chinese: "Calendrier chinois" },
    nextTerm: "Prochain terme solaire",
    needs: "Nécessite un thème natal",
  },
};

function watch(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

/** The month's sky has arrived: every day has its Moon. */
async function skyMonth(page) {
  await page.getByTestId("studio-timing").waitFor({ timeout: 45000 });
  await page.getByTestId("calendar-month").waitFor({ timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll("[data-testid^=calendar-day-] .ulune-moon").length >= 28, null, { timeout: 45000 });
}

/** What the month shows: days with the sky's events, exact phases named, your transits and personal days. */
const monthState = (page, phases) =>
  page.evaluate((re) => {
    const days = [...document.querySelectorAll("[data-testid^=calendar-day-]")];
    const phase = new RegExp(re);
    return {
      days: days.length,
      sky: days.filter((d) => Number(d.getAttribute("data-sky")) > 0).length,
      phases: days.filter((d) => phase.test(d.getAttribute("aria-label") ?? "")).length,
      mine: days.filter((d) => Number(d.getAttribute("data-mine")) > 0).length,
      you: document.querySelectorAll(".ulune-cal-you").length,
      pd: document.querySelectorAll("[data-testid^=calendar-day-] .ulune-cal-pd").length,
      num: Boolean(document.querySelector("[data-testid=calendar-num]")),
    };
  }, phases.source);

/** Each layer's switch as View shows it: on or off, available, its name, the line under it, its language. */
const layerState = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("[data-testid^=calendar-layer-]")].map((b) => {
        const text = (id) => (id ? document.getElementById(id)?.textContent?.trim() ?? "" : "");
        const group = b.closest("[role=group]");
        return [
          b.getAttribute("data-testid").slice("calendar-layer-".length),
          {
            role: b.getAttribute("role"),
            on: b.getAttribute("aria-checked"),
            unavailable: b.getAttribute("aria-disabled") === "true",
            name: text(b.getAttribute("aria-labelledby")),
            line: text(b.getAttribute("aria-describedby")),
            lang: text(group?.getAttribute("aria-labelledby")),
          },
        ];
      }),
    ),
  );

async function closeView(page) {
  await page.keyboard.press("Escape");
  await page.getByTestId("calendar-view-pop").waitFor({ state: "detached", timeout: 4000 });
}

/** The head as the server sends it: what a search engine reads first. */
async function headOf(page, path) {
  const res = await page.request.get(`${DEV}${path}`);
  if (res.status() !== 200) throw new Error(`${path}: ${res.status()}`);
  const html = await res.text();
  const head = html.slice(0, html.indexOf("</head>"));
  const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`, "i").exec(tag)?.[1] ?? null;
  const links = [...head.matchAll(/<link [^>]*>/gi)].map((m) => m[0]);
  return {
    title: /<title>([^<]*)<\/title>/.exec(head)?.[1]?.replace(/&amp;/g, "&") ?? "",
    description: attr([...head.matchAll(/<meta [^>]*>/gi)].map((m) => m[0]).find((t) => /name="description"/.test(t)) ?? "", "content"),
    robots: /name="robots"/.test(head),
    canonical: attr(links.find((l) => /rel="canonical"/.test(l)) ?? "", "href"),
    alternates: links.filter((l) => /rel="alternate"/.test(l) && /hreflang=/i.test(l)).map((l) => `${attr(l, "hreflang")}=${attr(l, "href")}`),
  };
}

async function heads() {
  const { browser, page } = await launch(1280);
  try {
    const want = {
      "/calendar": { title: "Calendar · Ulune", description: /^The sky day by day: Moon phases, eclipses, retrogrades/ },
      "/calendrier": { title: "Calendrier · Ulune", description: /^Le ciel jour après jour\u202f: phases de la Lune, éclipses, rétrogradations/ },
    };
    for (const [path, w] of Object.entries(want)) {
      const h = await headOf(page, path);
      if (h.title !== w.title) throw new Error(`${path} title "${h.title}"`);
      if (!w.description.test(h.description ?? "")) throw new Error(`${path} description "${h.description}"`);
      if (h.robots) throw new Error(`${path} is kept out of search`);
      if (h.canonical !== `${SITE}${path}`) throw new Error(`${path} canonical ${h.canonical}`);
      const alt = [`en=${SITE}/calendar`, `fr=${SITE}/calendrier`, `x-default=${SITE}/calendar`];
      if (JSON.stringify(h.alternates) !== JSON.stringify(alt)) throw new Error(`${path} alternates ${JSON.stringify(h.alternates)}`);
    }
    // The other studio pages stay the home page for search engines.
    const transits = await headOf(page, "/astrology/transits");
    if (transits.canonical !== `${SITE}/` || transits.alternates.length) throw new Error(`/astrology/transits head ${JSON.stringify(transits)}`);
    // And in the page itself, once it runs.
    await gotoApp(page, "/calendrier");
    const live = await page.evaluate(() => ({
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      fr: document.querySelector('link[rel="alternate"][hreflang="fr"]')?.getAttribute("href"),
      en: document.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute("href"),
    }));
    if (live.title !== "Calendrier · Ulune" || live.canonical !== `${SITE}/calendrier` || live.fr !== `${SITE}/calendrier` || live.en !== `${SITE}/calendar`) {
      throw new Error(`/calendrier live head ${JSON.stringify(live)}`);
    }
    console.log("calendar heads OK");
  } finally {
    await browser.close();
  }
}

/** The Calendar without any chart, at one address and width, in its language. */
async function skyAlone(path, width, lang) {
  const { browser, page } = await launch(width);
  const errors = watch(page);
  const w = WORDS[lang];
  const label = `${path} ${width}`;
  try {
    await gotoApp(page, path);
    if (lang === "fr") await setLang(page, "fr");
    await skyMonth(page);
    if (new URL(page.url()).pathname !== path) throw new Error(`${label}: moved to ${page.url()}`);
    // The sky's month: events in words, the exact phases named, nothing of a chart.
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid^=calendar-day-]")].some((d) => Number(d.getAttribute("data-sky")) > 0), null, { timeout: 30000 });
    const m = await monthState(page, w.phases);
    if (m.days < 28 || m.sky < 3 || m.phases < 3 || m.mine || m.you || m.pd || m.num) throw new Error(`${label}: the sky's month ${JSON.stringify(m)}`);
    // One quiet line invites a cast; no birth form until asked for.
    const invite = (await page.getByTestId("calendar-invite").innerText()).trim();
    if (invite !== w.invite) throw new Error(`${label}: invitation "${invite}"`);
    if (await page.locator("#birth-date").count()) throw new Error(`${label}: the birth form shows`);
    // The side panel: the Reading tab alone, the Moon now.
    const tabs = await page.locator("[data-testid^=dock-tab-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    if (tabs.join() !== "dock-tab-reading") throw new Error(`${label}: dock tabs ${tabs.join()}`);
    await clickDockTab(page, "reading");
    await page.getByTestId("calendar-now-moon").waitFor({ timeout: 20000 });
    // The Chinese calendar's solar terms (languages plan, part 6), on by default: two a month,
    // each in its day as its characters, and the next one in the side panel.
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=calendar-term-]").length >= 2, null, { timeout: 20000 });
    const terms = await page.locator("[data-testid^=calendar-term-]").evaluateAll((els) => els.map((e) => e.textContent.trim()));
    if (!terms.every((t) => /^[\u4e00-\u9fff]{2}$/.test(t))) throw new Error(`${label}: the month's terms ${terms.join()}`);
    const next = await page.getByTestId("calendar-now-term").innerText();
    if (!/ · [a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+ [\u4e00-\u9fff]{2}/.test(next)) throw new Error(`${label}: the next term "${next}"`);
    const kicker = await page.locator("[data-testid=timing-hello] .ulune-cal-now-kicker").allInnerTexts();
    if (!kicker.some((k) => k.trim().toLowerCase() === w.nextTerm.toLowerCase())) throw new Error(`${label}: the panel's headings ${kicker.join(" | ")}`);
    await assertNoOverflow(page);
    if (width === 1280) await page.screenshot({ path: join(SHOTS, `calendar-sky-${lang}-${width}.png`) }).catch(() => {});
    // A day opens its reading, without a chart.
    const day = page.locator("[data-testid^=calendar-day-]").nth(10);
    await day.click();
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 15000 });
    if (width < 1024) await page.getByTestId("dock-tab-reading").click();

    // View: the layers by language; the personal ones unavailable, saying why.
    await openCalendarView(page);
    const layers = await layerState(page);
    const shape = Object.entries(layers).map(([id, l]) => `${id}:${l.role}:${l.on}:${l.unavailable ? "unavailable" : "available"}:${l.lang}`);
    const wantShape = [
      `sky:switch:true:available:${w.langs.astrology}`,
      `transits:switch:false:unavailable:${w.langs.astrology}`,
      `numerology:switch:false:unavailable:${w.langs.numerology}`,
      `terms:switch:true:available:${w.langs.chinese}`,
      // The day's animal (languages plan, part 11): everyone's, off until asked for.
      `animals:switch:false:available:${w.langs.chinese}`,
      // Feng Shui's flying stars (part 25): everyone's, off until asked for.
      `stars:switch:false:available:${w.langs.chinese}`,
    ];
    if (shape.join() !== wantShape.join()) throw new Error(`${label}: layers ${shape.join(" | ")}`);
    for (const [id, l] of Object.entries(layers)) {
      if (l.name !== w.layers[id]) throw new Error(`${label}: ${id} named "${l.name}"`);
      if (id !== "sky" && id !== "terms" && id !== "animals" && id !== "stars" && l.line !== w.needs) throw new Error(`${label}: ${id} says "${l.line}"`);
    }
    // An unavailable switch stays off when pressed (forced: Playwright waits for aria-disabled to go).
    await page.getByTestId("calendar-layer-transits").click({ force: true });
    await page.waitForTimeout(150);
    if ((await page.getByTestId("calendar-layer-transits").getAttribute("aria-checked")) !== "false") throw new Error(`${label}: an unavailable layer switched on`);
    if ((await page.locator("[data-testid=calendar-zone-select] option[value=birth]").count()) !== 0) throw new Error(`${label}: a birthplace's clock without a chart`);
    await assertNoOverflow(page);
    if (width === 390) await page.screenshot({ path: join(SHOTS, `calendar-view-${lang}-${width}.png`) }).catch(() => {});
    await closeView(page);

    // The day: its Moon and the sky's agenda, nothing of yours.
    await page.getByTestId("timing-scope-day").click();
    await page.getByTestId("calendar-moonbar").waitFor({ timeout: 20000 });
    await page.locator("[data-testid=calendar-row-sky]").first().waitFor({ timeout: 30000 });
    if (await page.locator("[data-testid=calendar-row-you], [data-testid=calendar-numday], [data-testid=calendar-effect]").count()) throw new Error(`${label}: a chart's rows in the day`);
    await assertNoOverflow(page);
    // The year: the new and full Moons, the seasons, the planets' signs; no big transits.
    await page.getByTestId("timing-scope-year").click();
    await page.getByTestId("calendar-year").waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll(".ulune-cal-tl-phase").length >= 12, null, { timeout: 45000 });
    if (await page.locator("[data-testid^=calendar-year-transit-], [data-testid=calendar-year-num]").count()) throw new Error(`${label}: a chart's lanes in the year`);
    // The year's solar terms: 24 on the line (a computer), a month's on its card (a phone).
    if (width >= 1024) {
      const ticks = await page.locator("[data-testid=calendar-timeline-terms] button").count();
      if (ticks !== 24) throw new Error(`${label}: ${ticks} solar terms in the year`);
    } else if (!(await page.locator(".ulune-cal-chip-term").count())) {
      throw new Error(`${label}: no solar terms on the month cards`);
    }
    await assertNoOverflow(page);
    await page.getByTestId("timing-scope-month").click();
    await page.getByTestId("calendar-month").waitFor({ timeout: 20000 });

    // The events table: the sky's rows, for everyone; its file holds the sky.
    await setView(page, "table");
    await page.getByTestId("timing-table").waitFor({ timeout: 20000 });
    await page.locator("[data-testid=calendar-table-row-sky]").first().waitFor({ timeout: 30000 });
    if (await page.locator("[data-testid=calendar-table-row-you], [data-testid=calendar-table-row-num], [data-testid=calendar-table-yours]").count()) throw new Error(`${label}: a chart's rows or filter in the table`);
    if (!(await page.getByTestId("calendar-invite").count())) throw new Error(`${label}: no invitation over the table`);
    await assertNoOverflow(page);
    await openExport(page);
    await page.getByTestId("calendar-ics-main").waitFor({ timeout: 8000 });
    if (await page.locator("[data-testid=calendar-ics-mine], [data-testid=export-png], [data-testid=export-copy]").count()) throw new Error(`${label}: a chart's ways out without a chart`);
    if (width === 1280) {
      await page.waitForFunction(() => !document.querySelector("[data-testid=calendar-ics-all]")?.disabled, null, { timeout: 30000 });
      const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.getByTestId("calendar-ics-all").click()]);
      if (!/^ulune-\d{4}-\d{2}\.ics$/.test(dl.suggestedFilename())) throw new Error(`${label}: the sky's file "${dl.suggestedFilename()}"`);
      const ics = await readFile(await dl.path(), "utf8");
      const events = ics.split("BEGIN:VEVENT").length - 1;
      if (!ics.startsWith("BEGIN:VCALENDAR") || events < 10) throw new Error(`${label}: the sky's file, ${events} events`);
      if (/SUMMARY:[^\r\n]*\b(your|votre)\b/i.test(ics)) throw new Error(`${label}: a transit in the sky's file`);
    } else {
      await page.keyboard.press("Escape");
    }
    await page.getByTestId("export-panel").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    await setView(page, "wheel");
    await page.getByTestId("calendar-month").waitFor({ timeout: 20000 });
    // The calendar file from the month too, in Export (a phone's ⋯).
    await openExport(page);
    await page.getByTestId("calendar-export-main").waitFor({ timeout: 8000 });
    if (await page.locator("[data-testid=calendar-export-mine]").count()) throw new Error(`${label}: "with my transits" without a chart`);
    await page.keyboard.press("Escape");
    await page.getByTestId("export-panel").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});

    // The other Time pages still ask for a chart.
    if (width === 1280 && lang === "en") {
      await gotoApp(page, "/astrology/transits");
      const line = (await page.getByTestId("birth-mode-line").innerText()).trim();
      if (line !== "To open Transits, cast a birth chart first.") throw new Error(`${label}: Transits without a chart: "${line}"`);
      // A 1.x address of the calendar leads here, still without a chart.
      await gotoApp(page, "/?studio=timing");
      await skyMonth(page);
      if (new URL(page.url()).pathname !== "/calendar") throw new Error(`/?studio=timing landed on ${page.url()}`);
    }
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`${label} the sky alone OK`);
  } finally {
    await browser.close();
  }
}

/** The layers by keyboard: View opens from its button, Tab reaches each switch, Space switches it. */
async function keyboard() {
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page, "/calendar");
    await skyMonth(page);
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid^=calendar-day-]")].some((d) => Number(d.getAttribute("data-sky")) > 0), null, { timeout: 30000 });
    await page.getByTestId("calendar-view").focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("calendar-view-pop").waitFor({ timeout: 8000 });
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "");
    await page.waitForFunction(() => document.activeElement?.closest("[data-testid=calendar-view-pop]"), null, { timeout: 4000 });
    // Tab from the clock to the first switch, then along the others.
    const seen = [];
    for (let i = 0; i < 6 && seen.length < 3; i += 1) {
      await page.keyboard.press("Tab");
      const id = await focused();
      if (id.startsWith("calendar-layer-")) seen.push(id);
    }
    if (seen.join() !== "calendar-layer-sky,calendar-layer-transits,calendar-layer-numerology") throw new Error(`Tab reached ${seen.join()}`);
    // Back to the sky's switch: its focus can be seen, Space switches it, the month follows.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    if ((await focused()) !== "calendar-layer-sky") throw new Error(`Shift+Tab reached ${await focused()}`);
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    if (ring === "none") throw new Error("the switch's focus is not seen");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelector("[data-testid=calendar-layer-sky]")?.getAttribute("aria-checked") === "false", null, { timeout: 4000 });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid^=calendar-day-]")].every((d) => d.getAttribute("data-sky") === "0"), null, { timeout: 4000 });
    if (await page.locator("[data-testid=calendar-legend] [data-testid=calendar-legend-yours]").count()) throw new Error("the key to your transits without them");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("[data-testid=calendar-layer-sky]")?.getAttribute("aria-checked") === "true", null, { timeout: 4000 });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid^=calendar-day-]")].some((d) => Number(d.getAttribute("data-sky")) > 0), null, { timeout: 4000 });
    // The solar terms' switch: off, the month's terms go; on, they come back.
    await page.getByTestId("calendar-layer-terms").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => !document.querySelector("[data-testid^=calendar-term-]"), null, { timeout: 4000 });
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=calendar-term-]").length >= 2, null, { timeout: 8000 });
    // The flying stars' switch (part 25): on, the month's jie carries its star and the key says so; the day has its bar.
    await page.getByTestId("calendar-layer-stars").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=calendar-star-]").length >= 1, null, { timeout: 8000 });
    const badge = await page.locator("[data-testid^=calendar-star-]").first().evaluate((e) => ({ month: e.getAttribute("data-month"), text: e.textContent, label: e.getAttribute("aria-label") ?? e.getAttribute("title") ?? "" }));
    if (!/^[1-9]$/.test(badge.month ?? "") || !badge.text.includes(`★${badge.month}`) || !/Month star \d to the centre/.test(badge.label)) throw new Error(`a star's badge ${JSON.stringify(badge)}`);
    if (!(await page.locator("[data-testid=calendar-legend-stars]").count())) throw new Error("no key to the flying stars");
    await page.keyboard.press("Escape");
    await page.getByTestId("calendar-view-pop").waitFor({ state: "detached", timeout: 4000 });
    await page.getByTestId("timing-scope-day").click();
    await page.getByTestId("calendar-stars").waitFor({ timeout: 20000 });
    const bar = await page.getByTestId("calendar-stars").textContent();
    if (!/The year’s \d .+ and the month’s \d .+ in the centre/.test(bar ?? "")) throw new Error(`the day's stars "${bar}"`);
    await page.getByTestId("timing-scope-month").click();
    await page.getByTestId("calendar-month").waitFor({ timeout: 20000 });
    await page.getByTestId("calendar-view").focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("calendar-view-pop").waitFor({ timeout: 8000 });
    await page.getByTestId("calendar-layer-stars").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => !document.querySelector("[data-testid^=calendar-star-]"), null, { timeout: 4000 });
    // Settings → Chinese traditions, "Name only" (in another tab): the days follow at once.
    await page.evaluate(() => {
      localStorage.setItem("ulune.chinese", JSON.stringify({ show: "names" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid^=calendar-term-]")].every((e) => /^[A-Z][A-Za-z’ ]+$/.test(e.textContent.trim())), null, { timeout: 4000 });
    await page.evaluate(() => localStorage.removeItem("ulune.chinese"));
    // Escape closes View and gives the focus back to its button.
    await page.keyboard.press("Escape");
    await page.getByTestId("calendar-view-pop").waitFor({ state: "detached", timeout: 4000 });
    if ((await focused()) !== "calendar-view") throw new Error(`after Escape the focus is on "${await focused()}"`);
    console.log("calendar layers by keyboard OK");
  } finally {
    await browser.close();
  }
}

/** The invitation, the form and back; a cast there; numerology's layer, kept across a reload. */
async function withChart() {
  const { browser, page } = await launch(1280);
  const errors = watch(page);
  try {
    await gotoApp(page);
    // The chart comes back after a reload: a private space that stays unlocked here.
    await keepCharts(page);
    await gotoApp(page, "/calendar");
    await skyMonth(page);
    // The invitation opens the form, which says why, and leads back to the sky.
    await page.getByTestId("calendar-invite-cast").click();
    await page.locator("#native-name").waitFor({ timeout: 8000 });
    const line = (await page.getByTestId("birth-mode-line").innerText()).trim();
    if (line !== "Cast your chart and your transits join the Calendar.") throw new Error(`form line "${line}"`);
    if (await page.getByTestId("guide").count()) throw new Error("the guide under the Calendar's form");
    await page.getByTestId("birth-back").click();
    await skyMonth(page);
    if (!(await page.getByTestId("calendar-invite").count())) throw new Error("back without the invitation");
    // From View's own invitation this time, a cast with FIXTURE_A.
    await openCalendarView(page);
    await page.getByTestId("calendar-layers-cast").click();
    await page.locator("#native-name").waitFor({ timeout: 8000 });
    await page.locator("#native-name").fill(FIXTURE_A.name);
    await page.locator("#birth-date").fill(FIXTURE_A.date);
    await page.locator("#birth-time").fill(FIXTURE_A.time);
    await pickPlace(page, FIXTURE_A.place);
    await page.getByTestId("cast-submit").click();
    // Back on the Calendar, with your transits on their days, the invitation gone.
    await skyMonth(page);
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid^=calendar-day-]")].some((d) => Number(d.getAttribute("data-mine")) > 0), null, { timeout: 45000 });
    if (await page.getByTestId("calendar-invite").count()) throw new Error("the invitation stays after the cast");
    if (new URL(page.url()).pathname !== "/calendar") throw new Error(`the cast left the Calendar for ${page.url()}`);
    let m = await monthState(page, WORDS.en.phases);
    if (m.pd || m.num) throw new Error(`numerology before its layer: ${JSON.stringify(m)}`);
    await openCalendarView(page);
    let layers = await layerState(page);
    if (layers.transits.on !== "true" || layers.transits.unavailable || layers.numerology.on !== "false" || layers.numerology.unavailable) {
      throw new Error(`layers with a chart ${JSON.stringify(layers)}`);
    }
    if (await page.getByTestId("calendar-layers-cast").count()) throw new Error("View still invites a cast");
    // Numerology's layer on: each day's personal day, the personal month in the title.
    await page.getByTestId("calendar-layer-numerology").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=calendar-day-] .ulune-cal-pd").length >= 28, null, { timeout: 8000 });
    await closeView(page);
    m = await monthState(page, WORDS.en.phases);
    const title = await page.getByTestId("calendar-num").innerText();
    if (!/^Personal month [1-9]$/.test(title)) throw new Error(`the personal month "${title}"`);
    // The side panel's For you has today's personal day.
    await clickDockTab(page, "reading");
    await page.getByTestId("calendar-now-num").waitFor({ timeout: 8000 });
    // Your transits off: numerology stays, your transits go.
    await openCalendarView(page);
    await page.getByTestId("calendar-layer-transits").click();
    await page.waitForFunction(() => !document.querySelector(".ulune-cal-you"), null, { timeout: 4000 });
    if ((await page.locator("[data-testid^=calendar-day-] .ulune-cal-pd").count()) < 28) throw new Error("numerology went with your transits");
    await page.getByTestId("calendar-layer-transits").click();
    await page.waitForFunction(() => Boolean(document.querySelector(".ulune-cal-you")), null, { timeout: 8000 });
    await closeView(page);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("ulune.calendar.v1") ?? "{}"));
    if (kept.layers?.numerology !== true || "sky" in kept || "yours" in kept) throw new Error(`kept ${JSON.stringify(kept)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, "calendar-layers-1280.png") }).catch(() => {});

    // A reload: the chart comes back from the space, the layer still on.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await skyMonth(page);
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=calendar-day-] .ulune-cal-pd").length >= 28, null, { timeout: 30000 });
    await openCalendarView(page);
    layers = await layerState(page);
    if (layers.numerology.on !== "true") throw new Error(`after a reload numerology is ${layers.numerology.on}`);
    // And off again: the personal days go.
    await page.getByTestId("calendar-layer-numerology").click();
    await page.waitForFunction(() => !document.querySelector("[data-testid^=calendar-day-] .ulune-cal-pd") && !document.querySelector("[data-testid=calendar-num]"), null, { timeout: 4000 });
    await closeView(page);
    // The table follows: your rows, no numerology's, and its for-whom filter.
    await setView(page, "table");
    await page.locator("[data-testid=calendar-table-row-you]").first().waitFor({ timeout: 30000 });
    await page.getByTestId("calendar-table-yours").waitFor({ timeout: 8000 });
    if (await page.locator("[data-testid=calendar-table-row-num]").count()) throw new Error("numerology's rows with its layer off");
    await setView(page, "wheel");
    if (errors.length) throw new Error(errors.join(" | "));
    console.log("calendar with a chart OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const fail = [];
const run = async (name, fn) => {
  try {
    await fn();
  } catch (err) {
    fail.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
};
await run("heads", heads);
await run("/calendar 1280", () => skyAlone("/calendar", 1280, "en"));
await run("/calendrier 1280", () => skyAlone("/calendrier", 1280, "fr"));
await run("/calendar 390", () => skyAlone("/calendar", 390, "en"));
await run("/calendrier 390", () => skyAlone("/calendrier", 390, "fr"));
await run("keyboard", keyboard);
await run("with a chart", withChart);
if (fail.length) {
  console.error("CALENDAR SECTION FAIL\n" + fail.map((f) => `- ${f}`).join("\n"));
  process.exit(1);
}
console.log("CALENDAR SECTION OK", DEV);
