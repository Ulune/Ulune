/**
 * The encyclopedia (encyclopedia plan, parts 1 to 5): its home, the A–Z and
 * the search as one types; an entry's page in English and French, also with
 * JavaScript off, with its head (title, description, canonical, its twin,
 * structured data), the link to its twin and the next and previous pages of
 * its family; an entry with no page answering 404 while its card shows; the
 * short card of a linked word on hover and on keyboard focus, closed with
 * Escape; the sheet a tap opens on a phone; the setting for how links look;
 * the ⌘K palette's entries; what leaves the browser: nothing but the pages
 * and the app's own files, nothing typed into the search; and the interface's
 * language: the address's (/encyclopedie, /calendrier: French) while the
 * reader has saved no choice, the saved choice once there is one; and from
 * the studio (part 7): the tables' signs, houses, rulers, aspects and shapes,
 * the side panel's entries of the chosen thing and its glossary's words, each
 * linking to its entry without choosing the row it sits in.
 */
import { join } from "node:path";
import { DEV, SHOTS, assertNoOverflow, ensureShotsDir, gotoApp, launch, setLang, setView } from "./_lib.mjs";

const fail = (why) => {
  throw new Error(why);
};
const origin = new URL(DEV).origin;
const path = (page) => new URL(page.url()).pathname;
/** A word nobody would search for, to find in requests if the search leaked. */
const SECRET = "zqxwv";

/** Waits until the search's results hold this entry first (or nothing, for null). */
async function searchFor(page, text, firstId) {
  const input = page.getByTestId("enc-search-input");
  await input.fill("");
  await input.pressSequentially(text, { delay: 25 });
  if (firstId === null) {
    await page.locator("[data-testid=enc-results] .ob-enc-none").waitFor({ timeout: 8000 });
    return;
  }
  await page.waitForFunction(
    (id) => document.querySelector("[data-testid=enc-results] [data-entry]")?.getAttribute("data-entry") === id,
    firstId,
    { timeout: 8000 },
  ).catch(async () => {
    const got = await page.locator("[data-testid=enc-results] [data-entry]").evaluateAll((els) => els.map((e) => e.getAttribute("data-entry")));
    fail(`search "${text}": first ${got[0]}, expected ${firstId} (${got.join(", ")})`);
  });
}

/**
 * Every visible control of the page's content (and of an open card) has a
 * name; a French page has no English label; a control that is not a word in
 * a sentence is at least 24 px tall.
 */
async function accessible(page, fr) {
  return page.evaluate((fr) => {
    const out = [];
    const english = /\b(the|and|open|close|show|hide|search|next|previous|letters|related|read)\b/i;
    const scope = [...document.querySelectorAll("main, [data-testid=term-card], [data-testid=term-sheet]")];
    for (const root of scope) {
      for (const el of root.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [tabindex='0']")) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none") continue;
        const id = el.getAttribute("data-testid") || el.getAttribute("data-term") || el.className?.toString().slice(0, 30);
        let name = el.getAttribute("aria-label") || "";
        if (!name && el.id) name = document.querySelector(`label[for="${el.id}"]`)?.textContent ?? "";
        if (!name) name = (el.textContent ?? "").trim();
        if (!name.trim()) out.push(`no name: ${el.tagName.toLowerCase()} ${id}`);
        const aria = el.getAttribute("aria-label");
        if (fr && aria && english.test(aria)) out.push(`English label on a French page: "${aria}"`);
        // Words inside running text are exempt (WCAG 2.5.8, inline); a card's name is a link the size of its card.
        const inline = el.closest("p, li, td, th") && cs.display === "inline";
        const box = el.classList.contains("ob-enc-card-link") ? el.closest(".ob-enc-card, .ob-enc-hit").getBoundingClientRect() : r;
        if (!inline && box.height < 24) out.push(`a ${Math.round(box.height)} px target: ${el.tagName.toLowerCase()} ${id}`);
      }
    }
    return out;
  }, fr);
}

await ensureShotsDir();

// ---------------------------------------------------------------- a computer: home, search, pages, cards, privacy
{
  const { browser, page } = await launch(1280);
  const requests = [];
  // Everything the encyclopedia's pages ask for, until the studio opens for the palette.
  let recording = true;
  page.on("request", (r) => recording && requests.push({ url: r.url(), method: r.method(), body: r.postData() ?? "" }));
  try {
    await gotoApp(page, "/encyclopedia");
    await page.getByTestId("enc-home").waitFor({ timeout: 30000 });
    if ((await page.locator("main h1").innerText()).trim() !== "Encyclopedia") fail("home: no title");
    // Search first, then the traditions, then A–Z.
    const order = await page.evaluate(() =>
      ["enc-search", "enc-traditions", "enc-az"].map((id) => document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect().top ?? -1),
    );
    if (!(order[0] >= 0 && order[0] < order[1] && order[1] < order[2])) fail(`home: the parts are out of order ${order}`);
    const traditions = await page.locator("[data-testid=enc-traditions] [data-tradition]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tradition")));
    if (traditions.join() !== "astrology,human-design,numerology") fail(`home: traditions ${traditions}`);
    // A–Z: every entry, a page as a link.
    const rows = await page.locator("[data-testid=enc-az] li[data-entry]").count();
    if (rows < 69) fail(`A–Z lists ${rows} entries`);
    if ((await page.locator('[data-testid=enc-az] li[data-entry="retrograde"] a').getAttribute("href")) !== "/encyclopedia/retrograde") fail("A–Z: Retrograde is not a link to its page");
    // Since part 15 every entry has its page: no word in the A–Z is a card only.
    if ((await page.locator("[data-testid=enc-az] li[data-entry] button[data-term]").count()) !== 0) fail("A–Z: an entry without its page");
    if ((await page.locator('[data-testid=enc-az] li[data-entry="master-numbers"] a').getAttribute("href")) !== "/encyclopedia/master-numbers") fail("A–Z: Master numbers is not a link to its page");
    await page.locator("[data-testid=enc-letters] a", { hasText: /^D$/ }).click();
    await page.waitForFunction(() => location.hash === "#az-d", null, { timeout: 4000 });
    const top = await page.locator("#az-d").evaluate((el) => el.getBoundingClientRect().top);
    // Under the sticky top bar, at the top of the window.
    if (top < 40 || top > 120) fail(`the letter D jumped to ${top}px`);
    console.log("home and A–Z OK");

    // Search as letters are typed: a typo, accents, the other language, a glyph, nothing found.
    await page.getByTestId("enc-search-input").scrollIntoViewIfNeeded();
    await searchFor(page, "retrogarde", "retrograde");
    const group = page.locator("[data-testid=enc-results] [data-tradition=astrology]").first();
    if (!/Astrology/.test((await group.locator("h3").textContent()) ?? "")) fail("search: results not grouped under their tradition");
    if (!/backwards through the zodiac/.test(await group.innerText())) fail("search: no summary with the result");
    await searchFor(page, "éclipse", "eclipse");
    await searchFor(page, "chemin de vie", "life-path");
    if (!/Life Path/.test(await page.locator('[data-testid=enc-results] [data-entry="life-path"]').innerText())) fail("search: a French name did not find the English entry");
    await searchFor(page, "℞", "retrograde");
    await searchFor(page, SECRET, null);
    if (!/zqxwv/.test(await page.getByTestId("enc-search-count").innerText())) fail("search: nothing found is not said");
    await searchFor(page, "eclipse", "eclipse");
    await page.getByTestId("enc-search-input").press("Enter");
    await page.waitForURL(`${origin}/encyclopedia/eclipse`, { timeout: 10000 });
    console.log("search OK");

    // An entry's page and its head.
    await gotoApp(page, "/encyclopedia/retrograde");
    await page.getByTestId("enc-entry").waitFor();
    const head = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      alternates: [...document.querySelectorAll('link[rel="alternate"]')].map((l) => `${l.getAttribute("hreflang")} ${l.getAttribute("href")}`),
      data: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? "{}")),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    }));
    const summary = (await page.getByTestId("enc-summary").innerText()).trim();
    if (head.title !== "Retrograde · Encyclopedia · Ulune") fail(`head: title "${head.title}"`);
    if (head.description !== summary) fail("head: the description is not the summary");
    if (head.canonical !== "https://ulune.app/encyclopedia/retrograde") fail(`head: canonical ${head.canonical}`);
    const wanted = ["en https://ulune.app/encyclopedia/retrograde", "fr https://ulune.app/encyclopedie/retrograde", "x-default https://ulune.app/encyclopedia/retrograde"];
    if (wanted.some((a) => !head.alternates.includes(a))) fail(`head: alternates ${head.alternates}`);
    const term = head.data.find((d) => d["@type"] === "DefinedTerm");
    if (!term || term.name !== "Retrograde" || term.url !== head.canonical || term.inLanguage !== "en") fail(`head: structured data ${JSON.stringify(term)}`);
    if (head.robots) fail("an entry's page is kept out of search");
    const sections = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
    if (sections.join() !== "meaning,practice,history,calculation") fail(`sections ${sections}`);
    for (const id of ["enc-related", "enc-sources", "enc-revised", "enc-licence", "enc-crumbs"]) await page.getByTestId(id).waitFor({ timeout: 4000 });
    const report = await page.getByTestId("enc-report").getAttribute("href");
    if (!/^mailto:[^?]+\?subject=Ulune%20[\d.]+.*Retrograde/.test(report ?? "")) fail(`report an error: ${report}`);
    const crumbs = await page.getByTestId("enc-crumbs").innerText();
    if (!/Encyclopedia[\s›]+Astrology[\s›]+The sky’s cycles[\s›]+Retrograde/.test(crumbs)) fail(`breadcrumbs: ${crumbs}`);
    await page.screenshot({ path: join(SHOTS, "encyclopedia-entry-1280.png"), fullPage: true });
    console.log("entry page and head OK");

    // The short card: on hover after a moment, gone when the pointer leaves.
    const word = page.locator('[data-section=practice] [data-term="station"]').first();
    await word.scrollIntoViewIfNeeded();
    await word.hover();
    const card = page.getByTestId("term-card");
    await card.waitFor({ timeout: 4000 });
    const text = await card.innerText();
    if (!/Station/.test(text) || !/Astrology/.test(text) || !/stand still/.test(text) || !/Read the full page/.test(text)) fail(`card: ${text}`);
    if ((await word.getAttribute("aria-describedby")) !== "ob-term-card-text") fail("card: the word is not described by it");
    await page.mouse.move(5, 5);
    await card.waitFor({ state: "detached", timeout: 4000 });
    // The keyboard: focus shows it at once, Escape closes it and leaves the focus on the word.
    await page.keyboard.press("Shift");
    await word.focus();
    await card.waitFor({ timeout: 4000 });
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached", timeout: 4000 });
    if (!(await word.evaluate((el) => el === document.activeElement))) fail("Escape moved the focus");
    // A click opens the page, in the app.
    await word.click();
    await page.waitForURL(`${origin}/encyclopedia/station`, { timeout: 10000 });
    await page.getByTestId("enc-entry").waitFor();
    if ((await page.getByTestId("term-card").count()) !== 0) fail("a card stayed open on the next page");
    console.log("cards on hover and focus OK");

    // Previous and next in the family; the twin in the other language.
    if ((await page.getByTestId("enc-prev").getAttribute("href")) !== "/encyclopedia/retrograde") fail("station: previous is not Retrograde");
    await page.getByTestId("enc-next").click();
    await page.waitForURL(`${origin}/encyclopedia/ingress`, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Ingress", null, { timeout: 8000 });
    // The family's last page has no next (Season, after Eclipse and Void of course).
    await page.goto(`${origin}/encyclopedia/equinox-and-solstice`, { waitUntil: "load" });
    await page.getByTestId("enc-entry").waitFor();
    if ((await page.getByTestId("enc-next").count()) !== 0) fail("season: the last page of its family has a next");
    await page.goto(`${origin}/encyclopedia/eclipse`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Eclipse", null, { timeout: 8000 });
    await page.getByTestId("enc-twin").click();
    await page.waitForURL(`${origin}/encyclopedie/eclipse`, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Éclipse", null, { timeout: 8000 });
    if ((await page.locator("main").getAttribute("lang")) !== "fr") fail("the French page is not marked French");
    if (!/Dernière révision le 7 octobre 2026/.test(await page.getByTestId("enc-revised").innerText())) fail("the French page's date");
    if ((await page.title()) !== "Éclipse · Encyclopédie · Ulune") fail(`French title: ${await page.title()}`);
    await page.getByTestId("enc-crumbs").getByRole("link", { name: "Les cycles du ciel" }).click();
    await page.waitForURL(`${origin}/encyclopedie/astrologie#family-cycles`, { timeout: 10000 });
    await page.getByTestId("enc-tradition").waitFor();
    // A tradition's home: its families as cards, each with its summary and its link.
    const decan = page.locator('#decan');
    if ((await decan.locator("a").count()) !== 1 || !/Un tiers de signe/.test(await decan.innerText())) fail("a page with its summary on its tradition's home");
    if ((await page.locator('[data-entry="station"] a').getAttribute("href")) !== "/encyclopedie/station") fail("a page on its tradition's home");
    console.log("previous, next, twin, tradition home OK");

    // Names and targets, in both languages, the card open too.
    const a11y = [];
    // The last, the French Station: its card for "rétrograde" is scanned too.
    for (const [p, fr] of [["/encyclopedia", false], ["/encyclopedie", true], ["/encyclopedia/retrograde", false], ["/encyclopedie/numerologie", true], ["/encyclopedie/station", true]]) {
      await gotoApp(page, p);
      await page.locator("main h1").waitFor();
      a11y.push(...(await accessible(page, fr)).map((m) => `${p}: ${m}`));
    }
    const near = page.locator('[data-section=meaning] [data-term="retrograde"]').first();
    await near.hover();
    await page.getByTestId("term-card").waitFor({ timeout: 4000 });
    a11y.push(...(await accessible(page, true)).map((m) => `card: ${m}`));
    if (a11y.length) fail(`accessibility:\n${[...new Set(a11y)].join("\n")}`);
    console.log("names and targets OK");

    // ⌘K: the encyclopedia's entries among the palette's answers.
    recording = false;
    await gotoApp(page, "/");
    await page.waitForSelector("#birth-date, [data-testid=chart-chip]", { timeout: 30000 });
    await page.locator("body").click({ position: { x: 5, y: 400 } }).catch(() => {});
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-palette").waitFor({ timeout: 8000 });
    await page.keyboard.type("eclipse");
    await page.getByTestId("cmd-enc:eclipse").click({ timeout: 8000 });
    await page.waitForURL(`${origin}/encyclopedia/eclipse`, { timeout: 10000 });
    console.log("palette OK");
  } finally {
    await browser.close();
  }

  // What left the browser: the pages and the app's own files, by GET, from Ulune only; never what was typed.
  const problems = [];
  for (const r of requests) {
    const u = new URL(r.url);
    if (u.protocol === "data:" || u.protocol === "blob:") continue;
    if (u.origin !== origin) problems.push(`a request to another site: ${r.url.slice(0, 90)}`);
    else if (r.method !== "GET") problems.push(`${r.method} ${u.pathname}`);
    else if (/^\/(_serverFn|api)\//.test(u.pathname)) problems.push(`a call to the server: ${u.pathname}`);
    if (`${r.url} ${r.body}`.toLowerCase().includes(SECRET)) problems.push(`the search went out: ${r.url.slice(0, 90)}`);
  }
  if (problems.length) fail(`privacy:\n${[...new Set(problems)].join("\n")}`);
  console.log(`privacy OK (${requests.length} requests, all to Ulune's own pages and files)`);
}

// ---------------------------------------------------------------- without JavaScript: the server's page, complete
{
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const res = await page.goto(`${DEV}/encyclopedie/eclipse`, { waitUntil: "load", timeout: 45000 });
    if (res?.status() !== 200) fail(`no JavaScript: ${res?.status()}`);
    if ((await page.locator("main h1").innerText()).trim() !== "Éclipse") fail("no JavaScript: no title");
    const body = (await page.locator("main").textContent()) ?? "";
    for (const bit of ["Sens", "En pratique", "Origine et histoire", "Comment Ulune le calcule", "Voir aussi", "Sources", "Hérodote", "In English"]) {
      if (!body.includes(bit)) fail(`no JavaScript: "${bit}" missing`);
    }
    if ((await page.locator('a[hreflang="en"][href="/encyclopedia/eclipse"]').count()) !== 1) fail("no JavaScript: no link to the twin");
    // The search answers a sent form.
    await page.goto(`${DEV}/encyclopedia?q=retrogarde`, { waitUntil: "load" });
    if ((await page.locator('[data-testid=enc-results] [data-entry="retrograde"]').count()) !== 1) fail("no JavaScript: the search did not answer");
    // An unknown address, in either language: not found, 404.
    for (const p of ["/encyclopedia/nothing-here", "/encyclopedie/nothing-here"]) {
      const lost = await page.goto(`${DEV}${p}`, { waitUntil: "load" });
      if (lost?.status() !== 404) fail(`${p}: ${lost?.status()}, not 404`);
      if ((await page.locator('meta[name="robots"]').getAttribute("content")) !== "noindex") fail(`${p}: not kept out of search`);
    }
    await context.close();
    console.log("without JavaScript OK");
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- a phone: the card as a sheet, by a tap
{
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await gotoApp(page, "/encyclopedia/retrograde");
    await page.getByTestId("enc-entry").waitFor({ timeout: 30000 });
    await assertNoOverflow(page);
    const word = page.locator('[data-section=practice] [data-term="station"]').first();
    await word.scrollIntoViewIfNeeded();
    await word.tap();
    const sheet = page.getByTestId("term-sheet");
    await sheet.waitFor({ timeout: 6000 });
    if (path(page) !== "/encyclopedia/retrograde") fail("a tap went to the page instead of the card");
    const box = await sheet.boundingBox();
    if (!box || box.y + box.height < 844 - 40 || box.y < 400) fail(`the sheet is not at the bottom: ${JSON.stringify(box)}`);
    for (const id of ["term-read", "term-close"]) {
      const b = await page.getByTestId(id).boundingBox();
      if (!b || b.height < 44) fail(`${id} is ${b?.height}px tall, not 44`);
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SHOTS, "encyclopedia-sheet-390.png") });
    // A tap outside closes it; a tap on "Read the full page" opens the page.
    await page.locator(".ob-term-scrim").tap({ position: { x: 20, y: 120 } });
    await sheet.waitFor({ state: "detached", timeout: 4000 });
    await word.tap();
    await sheet.waitFor({ timeout: 6000 });
    await page.getByTestId("term-read").tap();
    await page.waitForURL(`${origin}/encyclopedia/station`, { timeout: 10000 });
    await page.getByTestId("enc-entry").waitFor();
    await assertNoOverflow(page);
    await gotoApp(page, "/encyclopedie");
    await page.getByTestId("enc-home").waitFor();
    await assertNoOverflow(page);
    await context.close();
    console.log("phone sheet OK");
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- the interface's language: the address's, until the reader chooses
{
  const { browser, page } = await launch(1280);
  try {
    // As the server sends it: <html lang> is the address's language, English elsewhere.
    for (const [p, lang] of [["/encyclopedie/eclipse", "fr"], ["/encyclopedie", "fr"], ["/calendrier", "fr"], ["/encyclopedia/eclipse", "en"], ["/calendar", "en"], ["/", "en"]]) {
      const html = await (await page.request.get(`${DEV}${p}`)).text();
      const got = /<html[^>]* lang="([^"]+)"/.exec(html)?.[1];
      if (got !== lang) fail(`${p}: the server's <html lang> is ${got}, not ${lang}`);
    }
    // The top bar's words say which language the interface speaks.
    const shown = async () => ({
      lang: await page.evaluate(() => document.documentElement.lang),
      bar: await page.getByTestId("section-charts").first().getAttribute("aria-label"),
    });
    const expect = async (where, lang) => {
      await page.waitForFunction((l) => document.documentElement.lang === l, lang, { timeout: 8000 }).catch(() => {});
      const s = await shown();
      if (s.lang !== lang || s.bar !== (lang === "fr" ? "Thèmes" : "Charts")) fail(`${where}: the interface is ${JSON.stringify(s)}, not ${lang}`);
    };
    // Nothing saved (a browser in English): the French address opens in French, the English one in English.
    await gotoApp(page, "/encyclopedie/eclipse");
    await page.getByTestId("enc-entry").waitFor({ timeout: 30000 });
    await expect("/encyclopedie/eclipse", "fr");
    await page.getByTestId("enc-twin").click();
    await page.waitForURL(`${origin}/encyclopedia/eclipse`, { timeout: 10000 });
    await expect("its English twin", "en");
    if (await page.evaluate(() => localStorage.getItem("ulune.locale"))) fail("a language was saved without being chosen");
    // The Calendar's French address too, once the studio runs.
    await gotoApp(page, "/calendrier");
    await page.getByTestId("studio-timing").waitFor({ timeout: 45000 });
    await page.waitForTimeout(500);
    if ((await page.evaluate(() => document.documentElement.lang)) !== "fr") fail("/calendrier: the interface is not in French");
    if ((await page.getByTestId("calendar-invite").innerText({ timeout: 30000 })).trim() !== "Calculez un thème pour ajouter vos transits") fail("/calendrier: its words are not French");
    // A choice, once saved, wins on every address: English chosen on a French one…
    await gotoApp(page, "/encyclopedie");
    await page.getByTestId("enc-home").waitFor();
    await expect("/encyclopedie", "fr");
    await setLang(page, "en");
    if ((await page.evaluate(() => localStorage.getItem("ulune.locale"))) !== "en") fail("choosing English saved nothing");
    await gotoApp(page, "/encyclopedie/eclipse");
    await page.getByTestId("enc-entry").waitFor();
    await expect("/encyclopedie/eclipse with English saved", "en");
    // The page itself stays in its own language.
    if ((await page.locator("main h1").innerText()).trim() !== "Éclipse") fail("the French page changed language");
    // …and French on an English one.
    await setLang(page, "fr");
    await gotoApp(page, "/encyclopedia");
    await page.getByTestId("enc-home").waitFor();
    await expect("/encyclopedia with French saved", "fr");
    if ((await page.locator("main h1").innerText()).trim() !== "Encyclopedia") fail("the English home changed language");
    console.log("interface language by address OK");
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- the setting: how links look, kept on this device
{
  const { browser, page } = await launch(1280);
  try {
    const decoration = (loc) => loc.evaluate((el) => ({ line: getComputedStyle(el).textDecorationLine, style: getComputedStyle(el).textDecorationStyle }));
    await gotoApp(page, "/settings");
    await page.getByTestId("settings-term-links").waitFor({ timeout: 20000 });
    const sample = page.locator("[data-testid=term-links-sample] .ob-term");
    let d = await decoration(sample);
    if (d.line !== "underline" || d.style !== "dotted") fail(`subtle by default: ${JSON.stringify(d)}`);
    await page.getByTestId("term-links-underline").check();
    d = await decoration(sample);
    if (d.style !== "solid") fail(`clearly underlined: ${JSON.stringify(d)}`);
    // Kept, and set before the page paints.
    await page.reload({ waitUntil: "domcontentloaded" });
    if ((await page.evaluate(() => document.documentElement.getAttribute("data-term-links"))) !== "underline") fail("the choice was not kept");
    await page.waitForSelector("html.theme-ready");
    if (!(await page.getByTestId("term-links-underline").isChecked())) fail("the setting does not show the choice");
    await gotoApp(page, "/encyclopedia/retrograde");
    d = await decoration(page.locator('[data-section=practice] [data-term="station"]').first());
    if (d.style !== "solid") fail(`an entry's links, clearly underlined: ${JSON.stringify(d)}`);
    await gotoApp(page, "/settings");
    await page.getByTestId("term-links-none").check();
    d = await decoration(sample);
    if (d.line !== "none") fail(`no mark: ${JSON.stringify(d)}`);
    await page.getByTestId("term-links-subtle").check();
    if (await page.evaluate(() => document.documentElement.hasAttribute("data-term-links") || localStorage.getItem("ulune.term-links"))) fail("subtle is not the default again");
    console.log("link setting OK");
  } finally {
    await browser.close();
  }
}

// From the studio (part 7): the tables and the side panel link to the entries.
{
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page);
    await page.getByTestId("sample-chart").click();
    await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
    await setView(page, "table");
    const saturn = page.locator("tr[data-body=saturn]").first();
    await saturn.waitFor({ timeout: 15000 });
    // Each kind of cell that names a term is a link to its entry.
    const links = await page.evaluate(() => {
      const href = (sel) => document.querySelector(sel)?.getAttribute("href") ?? null;
      return {
        sign: href("tr[data-body=saturn] td[data-col=position] a.ob-term"),
        house: href("tr[data-body=saturn] td[data-col=house] a.ob-term"),
        cusp: href("tr[data-house='10'] td[data-col=cusp] a.ob-term"),
        ruler: href("tr[data-house='1'] td[data-col=ruler] a.ob-term"),
        aspect: href("tr[data-aspect] td[data-col=aspect] a.ob-term"),
        element: href(".ob-bal[data-group=elements] a.ob-term"),
        pick: Boolean(document.querySelector("tr[data-body=saturn] td[data-col=body] a.ob-term")),
      };
    });
    for (const [k, v] of Object.entries(links)) {
      if (k === "pick") continue;
      if (!v || !/^\/encyclopedia\/[a-z0-9-]+$/.test(v)) fail(`the table's ${k} link: ${v}`);
    }
    if (links.pick) fail("the row's own name became a link (it chooses the row)");
    // The row still chooses its reading; the side panel then names its entries.
    await saturn.locator("td[data-col=body] button").click();
    await page.getByTestId("reading-terms").waitFor({ timeout: 8000 });
    const panel = await page.getByTestId("reading-terms").evaluate((el) => [...el.querySelectorAll("a.ob-term")].map((a) => a.getAttribute("href")));
    if (panel[0] !== "/encyclopedia/saturn" || panel.length !== 3) fail(`the panel's entries ${JSON.stringify(panel)}`);
    // Part 16: the reading's own text links its words, never its subject.
    await page.waitForFunction(() => document.querySelector('[data-testid=reading-card] .ob-rc-lead a.ob-term, [data-testid=reading-card] .ob-rc-p a.ob-term'), null, { timeout: 8000 });
    const inText = await page.evaluate(() =>
      [...document.querySelectorAll("[data-testid=reading-card] .ob-rc-lead a.ob-term, [data-testid=reading-card] section:not(.ob-rc-terms) .ob-rc-p a.ob-term")].map((a) => [a.textContent, a.getAttribute("href")]),
    );
    if (!inText.some(([w, h]) => w === "Taurus" && h === "/encyclopedia/taurus")) fail(`the reading's words: ${JSON.stringify(inText)}`);
    if (inText.some(([w]) => w === "Saturn")) fail("the reading links its own subject");
    // A word pressed in a row opens its entry and leaves the row's choice alone.
    const chosen = await page.evaluate(() => document.querySelector("tr[data-body=saturn]")?.getAttribute("data-selected"));
    const sign = links.sign;
    const marsSign = page.locator("tr[data-body=mars] td[data-col=position] a.ob-term");
    await marsSign.scrollIntoViewIfNeeded();
    await marsSign.click();
    // The app moves there itself (no page load).
    await page.waitForFunction(() => location.pathname.startsWith("/encyclopedia/"), null, { timeout: 10000 });
    await page.getByTestId("enc-back").waitFor({ timeout: 10000 });
    await page.getByTestId("enc-back").click();
    await page.locator("tr[data-body=saturn]").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => document.querySelector("tr[data-body=saturn]")?.getAttribute("data-selected"));
    if (chosen !== "1" || after !== "1") fail(`the chosen row ${chosen} → ${after} (a sign's link chose Mars?)`);
    if (!sign) fail("no sign link");
    // The glossary's words link to their entries.
    await page.getByTestId("glossary").locator("summary").click();
    await page.locator("[data-testid=glossary] dt a.ob-term").first().waitFor({ timeout: 8000 });
    const words = await page.locator("[data-testid=glossary] dt a.ob-term").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
    if (words.length < 20 || words.some((h) => !/^\/encyclopedia\/[a-z0-9-]+$/.test(h))) fail(`the glossary's links ${words.slice(0, 5)}`);
    console.log("links from the studio OK");
  } finally {
    await browser.close();
  }
}

console.log("ENCYCLOPEDIA OK");
