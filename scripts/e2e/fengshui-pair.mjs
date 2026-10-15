/*
 * Feng Shui's Relationship lens, two people in one home (review items FS5
 * and FS32), at 1280 px and on a 390 px phone (a finger: touch), in English
 * and French, with two made-up charts (Fixture B, then Fixture A shown) and
 * no yin or yang count, so both Kua numbers for each person:
 *   - reached by the language picker: Feng Shui › Relationship, at
 *     /feng-shui/pair; Sample B is the second person, as on every Pair page;
 *   - the rose: eight wedges, both people's mansions in words, one Tab stop;
 *     the compass reads the yang counts first, Kua 1 and Kua 4, of one group:
 *     the north, the east, the south-east and the south supportive for both
 *     (outlined), the other four challenging for both, none mixed;
 *   - a wedge's reading, the arrows walking round the rose, Enter opening the
 *     direction reached; a Kua's reading, named for its person;
 *   - Sample B's yin count chosen (Kua 2): two groups, eight mixed directions,
 *     the east the best middle ground, the west supporting Sample B;
 *   - the first read in the side panel: each Kua, the groups, the best, the
 *     practice, each opening its reading; "How Ulune calculates" at its end;
 *   - (part 28) from Feng Shui, the chart switcher's pair button leads here;
 *   - the table: both counts of both people, the one on the compass marked;
 *     the eight directions; the practice; Copy and CSV;
 *   - (at 1280 in English, 390 in French) the second person added from the
 *     page, with a yin count in the birth form: back on the page with them as
 *     the partner, their one Kua (no choice offered), two groups;
 *   - a finger's targets 44 px tall; nothing sent; nothing scrolls sideways;
 *     no page error.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { FIXTURE_A, FIXTURE_B, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, clickDockTab, clickTestId, ensureShotsDir, gotoApp, openExport, pickPlace, setLang, setView, waitStudioPage } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

const WORDS = {
  en: {
    groups: "TraceQA (Kua 1) and Sample B (Kua 4) are both of the East group",
    east: "The east is supportive for you both: TraceQA’s Restoration direction and Sample B’s Harmony.",
    se: "The south-east is supportive for you both: TraceQA’s Growth direction and Sample B’s Stability.",
    kua: "TraceQA’s Kua number is 1: the trigram",
    two: "TraceQA (Kua 1) is of the East group and Sample B (Kua 2) of the West group",
    west: "The west is supportive for Sample B (Restoration) and challenging for TraceQA (Friction).",
    middle: "The best middle ground: the east",
    desk: "A desk you share could face east",
    first: "Your two Kua, step by step",
    how: "How Ulune calculates",
    school: "Eight Mansions school",
    compare: "Compare with Sample B (Feng Shui: two people’s directions)",
    copy: ["TraceQA · Sample B · The two Kua", "The eight directions for two", "In practice, for two"],
    noneMixed: "None: in the same group",
  },
  fr: {
    groups: "TraceQA (Kua 1) et Sample B (Kua 4) sont du même groupe, le groupe de l’Est",
    east: "L’est est favorable pour vous deux\u202f: la direction de Ressourcement pour TraceQA et d’Harmonie pour Sample B.",
    se: "Le sud-est est favorable pour vous deux\u202f: la direction de Croissance pour TraceQA et de Stabilité pour Sample B.",
    kua: "Le nombre Kua de TraceQA est le 1\u202f: le trigramme",
    two: "TraceQA (Kua 1) est du groupe de l’Est et Sample B (Kua 2) du groupe de l’Ouest",
    west: "L’ouest est favorable pour Sample B (Ressourcement) et difficile pour TraceQA (Friction).",
    middle: "Le meilleur compromis\u202f: l’est",
    desk: "Un bureau partagé pourrait faire face à l’est",
    first: "Vos deux Kua, pas à pas",
    how: "Comment Ulune calcule",
    school: "l’école des Huit Demeures",
    compare: "Comparer avec Sample B (Feng Shui\u202f: les directions de deux personnes)",
    copy: ["TraceQA · Sample B · Les deux Kua", "Les huit directions à deux", "En pratique, à deux"],
    noneMixed: "Aucune\u202f: dans le même groupe",
  },
};
const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");

async function waitNote(page, text, label, what) {
  await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), text, { timeout: 8000 }).catch(async () => {
    throw new Error(`${label}: ${what} "${(await note(page)).slice(0, 300)}"`);
  });
}

/** A press as the reader makes it: a tap on a phone, a click on a computer; in view first. */
async function press(page, testId, touch) {
  const el = page.getByTestId(testId).first();
  await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
  if (touch) await el.tap();
  else await el.click();
}

/** The figure as it stands: the wedges' kinds and mansions, the lists, the Tab stops. */
const figure = (page) =>
  page.evaluate(() => {
    const wedges = [...document.querySelectorAll("[data-testid^=fengshui-pair-wedge-]")];
    const list = (kind) => [...document.querySelectorAll(`[data-testid=fengshui-pair-list-${kind}] [data-testid^=fengshui-pair-dir-]`)].map((e) => e.getAttribute("data-testid").slice(18));
    return {
      wedges: wedges.length,
      kinds: Object.fromEntries(wedges.map((w) => [w.getAttribute("data-dir"), w.getAttribute("data-kind")])),
      words: wedges.map((w) => [...w.querySelectorAll(".ulune-fsp-word")].map((t) => t.textContent)).flat(),
      stops: wedges.filter((w) => w.getAttribute("tabindex") === "0").map((w) => w.getAttribute("data-dir")),
      shared: list("both-good"),
      hard: list("both-hard"),
      mixed: list("mixed"),
      outlined: document.querySelectorAll(".ulune-fsp-shared").length,
      none: [...document.querySelectorAll("[data-testid^=fengshui-pair-none-]")].map((e) => e.textContent),
      groups: document.querySelector("[data-testid=fengshui-pair-groups]")?.textContent ?? "",
      practice: document.querySelector("[data-testid=fengshui-pair-practice]")?.textContent ?? "",
      counts: [...document.querySelectorAll("[data-testid^=fengshui-pair-count-]")].map((b) => `${b.getAttribute("data-testid").slice(20)}:${b.getAttribute("aria-pressed")}`),
    };
  });

async function csvOf(page) {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), openExport(page).then(() => page.getByTestId("table-csv").click())]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.startsWith("﻿")) throw new Error("CSV without its byte-order mark");
  return text.slice(1).replace(/\r\n/g, "\n");
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
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);

    // ── The picker: Feng Shui, then its Relationship lens ──
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-feng-shui").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=lang-button]")?.getAttribute("data-language") === "feng-shui", null, { timeout: 8000 });
    await page.getByTestId("lens-relationship").waitFor({ state: "attached", timeout: 8000 });
    await clickTestId(page, "lens-relationship");
    await waitStudioPage(page, "fengshui-pair");
    await page.getByTestId("fengshui-pair").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/feng-shui/pair") throw new Error(`${label}: at ${page.url()}`);
    // The second person: synastry's, as on every Pair page.
    const second = await page.getByTestId("fengshui-pair-person-b").evaluate((s) => s.options[s.selectedIndex]?.textContent ?? "");
    if (second !== FIXTURE_B.name) throw new Error(`${label}: the second person is "${second}"`);

    // ── The rose, the yang counts: Kua 1 and Kua 4, one group ──
    let f = await figure(page);
    if (f.wedges !== 8 || f.words.length !== 16 || f.words.some((x) => !x.trim())) throw new Error(`${label}: the rose ${JSON.stringify(f)}`);
    if (f.stops.length !== 1) throw new Error(`${label}: ${f.stops.length} Tab stops on the rose`);
    if (f.shared.join() !== "e,s,n,se" || f.hard.join() !== "w,nw,ne,sw" || f.mixed.length || f.outlined !== 4) throw new Error(`${label}: the lists ${JSON.stringify(f)}`);
    if (!f.none.some((x) => x.includes(w.noneMixed))) throw new Error(`${label}: no word on the empty mixed list (${f.none})`);
    if (!f.groups.includes(w.groups)) throw new Error(`${label}: the groups "${f.groups}"`);
    if (!f.practice.includes(w.desk)) throw new Error(`${label}: the practice "${f.practice}"`);
    if (f.counts.join() !== "a-yang:true,a-yin:false,b-yang:true,b-yin:false") throw new Error(`${label}: the counts ${f.counts}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-pair-${lang}-${width}.png`) }).catch(() => {});

    // A wedge's reading; a Kua's, named for its person.
    await press(page, "fengshui-pair-wedge-e", touch);
    await reading();
    await waitNote(page, w.east, label, "the east's reading");
    await back();
    await press(page, "fengshui-pair-kua-a", touch);
    await reading();
    await waitNote(page, w.kua, label, "TraceQA's Kua");
    await back();

    // ── The keyboard: one Tab stop, the arrows walk round it, Enter opens the direction reached ──
    if (!touch) {
      await page.getByTestId("fengshui-pair-wedge-e").focus();
      await page.keyboard.press("ArrowRight");
      const at = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
      if (at !== "fengshui-pair-wedge-se") throw new Error(`${label}: the arrow went to ${at}`);
      await page.keyboard.press("Enter");
      await waitNote(page, w.se, label, "the south-east by keyboard");
      const pressed = await page.getByTestId("fengshui-pair-wedge-se").getAttribute("aria-pressed");
      if (pressed !== "true") throw new Error(`${label}: Enter did not choose the south-east`);
      await page.keyboard.press("End");
      if ((await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) !== "fengshui-pair-wedge-nw") throw new Error(`${label}: End`);
    }

    // ── Sample B's yin count: Kua 2, of the other group ──
    await press(page, "fengshui-pair-count-b-yin", touch);
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-pair]")?.getAttribute("data-groups") === "two", null, { timeout: 8000 });
    f = await figure(page);
    if (f.shared.length || f.hard.length || f.mixed.join() !== "e,w,ne,se,s,nw,n,sw" || f.outlined !== 0) throw new Error(`${label}: two groups ${JSON.stringify(f)}`);
    if (Object.values(f.kinds).some((k) => k !== "mixed")) throw new Error(`${label}: the kinds ${JSON.stringify(f.kinds)}`);
    if (!f.groups.includes(w.two)) throw new Error(`${label}: the groups "${f.groups}"`);
    if (f.counts.join() !== "a-yang:true,a-yin:false,b-yang:false,b-yin:true") throw new Error(`${label}: the counts ${f.counts}`);
    await press(page, "fengshui-pair-dir-w", touch);
    await reading();
    await waitNote(page, w.west, label, "the west's reading");
    await back();
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-pair-two-${lang}-${width}.png`) }).catch(() => {});
    if (touch) {
      // A finger's targets: the counts, the rows, the cards.
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("[data-testid^=fengshui-pair-count-], [data-testid^=fengshui-pair-dir-], [data-testid=fengshui-pair-groups], [data-testid=fengshui-pair-practice], [data-testid^=fengshui-pair-kua-]")]
          .map((b) => [b.getAttribute("data-testid"), Math.round(b.getBoundingClientRect().height)])
          .filter(([, h]) => h < 44),
      );
      if (small.length) throw new Error(`${label}: under 44 px for a finger ${JSON.stringify(small)}`);
      // The rose on top, the rest under it.
      const order = await page.evaluate(() => {
        const rose = document.querySelector("[data-testid=fengshui-pair-rose]").getBoundingClientRect();
        const kua = document.querySelector("[data-testid=fengshui-pair-kua-a]").getBoundingClientRect();
        return { roseW: Math.round(rose.width), below: kua.top >= rose.bottom - 1 };
      });
      if (!order.below || order.roseW < 300) throw new Error(`${label}: the phone's layout ${JSON.stringify(order)}`);
    }

    // ── The first read: nothing chosen ──
    await page.keyboard.press("Escape").catch(() => {});
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForFunction(() => !document.querySelector("[data-testid=click-note]"), null, { timeout: 4000 }).catch(() => {});
    if (touch) await clickDockTab(page, "reading");
    await page.getByTestId("fengshui-pair-hello").waitFor({ timeout: 8000 });
    const hello = await page.getByTestId("fengshui-pair-hello").evaluate((e) => ({
      text: e.textContent ?? "",
      steps: [...e.querySelectorAll("[data-testid^=fengshui-pair-hello-]")].map((s) => s.getAttribute("data-testid").slice(20)),
      how: e.querySelector("[data-testid=method-notes]")?.getAttribute("data-page") ?? "",
    }));
    if (hello.steps.join() !== "kua-a,kua-b,groups,best,practice") throw new Error(`${label}: the first read's steps ${hello.steps}`);
    if (!hello.text.includes(w.first) || !hello.text.includes(w.middle)) throw new Error(`${label}: the first read "${hello.text.slice(0, 300)}"`);
    if (hello.how !== "fengshui-pair" || !hello.text.includes(w.how)) throw new Error(`${label}: no "${w.how}" (${hello.how})`);
    await page.getByTestId("method-notes").evaluate((d) => (d.open = true));
    if (!(await page.getByTestId("method-notes").textContent()).includes(w.school)) throw new Error(`${label}: the school is not named`);
    await press(page, "fengshui-pair-hello-groups", touch);
    await reading();
    await waitNote(page, w.two, label, "the first read's groups");
    await back();

    // ── The switcher's pair button: from Feng Shui, Feng Shui's own Relationship page ──
    await page.keyboard.press("Escape").catch(() => {});
    await page.getByTestId("chart-chip").click();
    const pairButton = page.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"] [data-testid=chart-pair]`);
    const pairSays = await pairButton.getAttribute("aria-label");
    if (pairSays !== w.compare) throw new Error(`${label}: the pair button says "${pairSays}"`);
    await pairButton.click();
    await page.getByTestId("fengshui-pair").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/feng-shui/pair") throw new Error(`${label}: the pair button led to ${page.url()}`);

    // ── The table: both counts of both people, the compass's marked; the directions; the practice; Copy and CSV ──
    await setView(page, "table");
    await page.getByTestId("fengshui-pair-table").waitFor({ timeout: 10000 });
    const table = await page.evaluate(() => ({
      kua: [...document.querySelectorAll("[data-testid^=fengshui-pair-row-kua-]")].map((r) => `${r.getAttribute("data-testid").slice(22)}${r.getAttribute("data-compass") ? "*" : ""}`),
      dirs: document.querySelectorAll("[data-testid^=fengshui-pair-row-dir-]").length,
      practice: document.querySelectorAll("[data-testid^=fengshui-pair-row-practice-]").length,
    }));
    if (table.kua.join() !== "a-yang*,a-yin,b-yang,b-yin*" || table.dirs !== 8 || table.practice !== 4) throw new Error(`${label}: the table ${JSON.stringify(table)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-pair-table-${lang}-${width}.png`) }).catch(() => {});
    const csv = await csvOf(page);
    const sep = lang === "fr" ? ";" : ",";
    for (const row of [["kua", "a", "yang", "1", "kan", "east", "1", "0"], ["kua", "b", "yin", "2", "kun", "west", "1", "0"], ["dir", "w", "huo-hai", "challenging", "tian-yi", "supportive", "mixed", "b"], ["practice", "desk", "e"], ["practice", "bed", "w"]]) {
      if (!csv.split("\n").includes(row.join(sep))) throw new Error(`${label}: the CSV lacks ${row.join(sep)}\n${csv.slice(0, 400)}`);
    }
    await openExport(page);
    await page.getByTestId("table-copy").click();
    await page.waitForTimeout(300);
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    for (const line of w.copy) if (!copied.includes(line)) throw new Error(`${label}: Copy lacks "${line}" in "${copied.slice(0, 200)}"`);
    await page.keyboard.press("Escape").catch(() => {});
    await setView(page, "wheel");

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`fengshui-pair ${label} OK`);
  } finally {
    await browser.close();
  }
}

/**
 * The second person added from the page itself, with a yin count given in
 * the birth form: the cast comes back to Feng Shui's Relationship with that
 * person as the partner, whose Kua is then the yin count's alone (no choice
 * offered), while TraceQA, without a count, keeps both.
 */
async function addFromPage(width, lang) {
  const touch = width < 1024;
  const label = `${width} ${lang} adding`;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-feng-shui").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=lang-button]")?.getAttribute("data-language") === "feng-shui", null, { timeout: 8000 });
    await clickTestId(page, "lens-relationship");
    await waitStudioPage(page, "fengshui-pair");
    await page.getByTestId("fengshui-pair-need-second").waitFor({ timeout: 20000 });
    await press(page, "fengshui-pair-add-second-rose", touch);
    await page.locator("#birth-date").waitFor({ timeout: 8000 });
    await page.locator("#native-name").fill(FIXTURE_B.name);
    await page.locator("#birth-date").fill(FIXTURE_B.date);
    await page.locator("#birth-time").fill(FIXTURE_B.time);
    await pickPlace(page, FIXTURE_B.place);
    const options = page.getByTestId("birth-options");
    if (!(await options.evaluate((el) => el.open))) await options.locator("summary").click();
    await page.getByTestId("birth-count").selectOption("yin");
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("fengshui-pair").waitFor({ timeout: 45000 });
    if (new URL(page.url()).pathname !== "/feng-shui/pair") throw new Error(`${label}: back at ${page.url()}`);
    const second = await page.getByTestId("fengshui-pair-person-b").evaluate((s) => s.options[s.selectedIndex]?.textContent ?? "");
    if (second !== FIXTURE_B.name) throw new Error(`${label}: the second person is "${second}"`);
    const f = await figure(page);
    if (f.counts.join() !== "a-yang:true,a-yin:false") throw new Error(`${label}: the counts ${f.counts} (Sample B's is given)`);
    const groups = await page.getByTestId("fengshui-pair").getAttribute("data-groups");
    if (groups !== "two" || f.mixed.length !== 8) throw new Error(`${label}: ${groups}, ${f.mixed.length} mixed`);
    const bCard = await page.getByTestId("fengshui-pair-kua-b").textContent();
    if (!bCard.includes("Kua 2")) throw new Error(`${label}: Sample B's card "${bCard}"`);
    await assertNoOverflow(page);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`fengshui-pair ${label} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const failures = [];
for (const [width, lang] of [
  [1280, "en"],
  [390, "en"],
  [1280, "fr"],
  [390, "fr"],
]) {
  try {
    await run(width, lang);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
for (const [width, lang] of [
  [1280, "en"],
  [390, "fr"],
]) {
  try {
    await addFromPage(width, lang);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
if (failures.length) {
  console.error(`FENGSHUI-PAIR FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("FENGSHUI-PAIR OK");
