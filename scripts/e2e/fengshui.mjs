/*
 * Feng Shui's personal half (languages plan, part 21), at /feng-shui, at
 * 1280 and 390 px, in English and French, with Fixture A (made up:
 * 15/06/1990, 12:00, Paris) and no yin or yang count, so both Kua numbers:
 *   - reached by its card in the language picker, under Chinese traditions,
 *     with no ⓘ yet;
 *   - the first read in the side panel: the Kua, its group, the best
 *     direction and the practice, for each count;
 *   - two roses: Kua 1 (Kan, East group: the south-east, east, south and
 *     north supportive) for the yang count, Kua 8 (Gen, West group) for the
 *     yin count, the north at the top; each wedge says its mansion;
 *   - a wedge's reading, the arrows walking round the rose, the Kua's
 *     reading with its working (11 − 1 = 10), the practical lines;
 *   - the table: both Kua, eight directions, eight practical lines;
 *   - Settings' "South at the top" followed at once;
 *   - nothing sent while the page works it out; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, launch, setLang, setView } from "./_lib.mjs";

const WORDS = {
  en: {
    first: "Your Kua, step by step",
    both: "both Kua numbers are shown",
    growth: "The south-east is your Growth direction",
    restoration: "The east is your Restoration direction",
    working: "For the yang count, 11 − 1 = 10.",
    five: "5 has no trigram of its own",
    desk: "At a desk, face south-east",
    mansion: "Growth",
  },
  fr: {
    first: "Votre Kua, pas à pas",
    both: "les deux nombres Kua sont montrés",
    growth: "Le sud-est est votre direction de Croissance",
    restoration: "L’est est votre direction de Ressourcement",
    working: "Pour le compte yang, 11 − 1 = 10.",
    five: "Le 5 n’a pas de trigramme propre",
    desk: "À un bureau, faites face au sud-est",
    mansion: "Croissance",
  },
};
const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");

async function waitNote(page, text, label, what) {
  await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), text, { timeout: 8000 }).catch(async () => {
    throw new Error(`${label}: ${what} "${(await note(page)).slice(0, 300)}"`);
  });
}

/** The wedges of one rose: their direction, mansion, kind and where their middle is drawn. */
const wedges = (page, count) =>
  page.evaluate((c) =>
    [...document.querySelectorAll(`[data-testid=fengshui-rose-${c}] [data-dir]`)].map((g) => {
      const r = g.getBoundingClientRect();
      return { dir: g.getAttribute("data-dir"), mansion: g.getAttribute("data-mansion"), good: g.getAttribute("data-supportive") === "1", y: r.top + r.height / 2, words: g.textContent };
    }),
  count);

async function run(width, lang) {
  const { browser, page } = await launch(width);
  const label = `${width} ${lang}`;
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const w = WORDS[lang];
  const phone = width < 1024;
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-feng-shui").waitFor({ timeout: 8000 });
    if (await page.getByTestId("lang-info-feng-shui").count()) throw new Error(`${label}: an ⓘ to a home that does not exist yet`);
    const sent = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (r.method() !== "GET" || /_serverFn|\/api\//.test(u.pathname)) sent.push(`${r.method()} ${u.pathname}`);
    });
    await page.getByTestId("lang-card-feng-shui").click();
    await page.getByTestId("fengshui").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/feng-shui") throw new Error(`${label}: at ${page.url()}`);

    // The first read, nothing chosen yet.
    if (phone) await clickDockTab(page, "reading");
    await page.getByTestId("fengshui-hello").waitFor({ timeout: 8000 });
    const steps = await page.locator("[data-testid^=fengshui-hello-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(15)));
    if (steps.join() !== "kua-yang,group-yang,best-yang,practice-yang,kua-yin,group-yin,best-yin,practice-yin") throw new Error(`${label}: the first read's steps ${steps}`);
    const hello = await page.getByTestId("fengshui-hello").evaluate((e) => e.textContent);
    if (!hello.includes(w.first) || !hello.includes(w.both)) throw new Error(`${label}: the first read "${hello.slice(0, 200)}"`);
    await page.getByTestId("fengshui-hello-best-yang").click();
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await waitNote(page, w.growth, label, "the first read's best direction");
    await page.screenshot({ path: join(SHOTS, `fengshui-first-${lang}-${width}.png`) }).catch(() => {});
    if (phone) await clickDockTab(page, "reading").catch(() => {});

    // Two roses, the north at the top.
    const note1 = await page.getByTestId("fengshui-both-note").textContent();
    if (!note1.includes(w.both)) throw new Error(`${label}: the note "${note1}"`);
    const yang = await wedges(page, "yang");
    const yin = await wedges(page, "yin");
    if (yang.length !== 8 || yin.length !== 8) throw new Error(`${label}: ${yang.length} and ${yin.length} wedges`);
    const good = (list) => list.filter((x) => x.good).map((x) => x.dir).join();
    if (good(yang) !== "n,e,se,s" || good(yin) !== "ne,sw,w,nw") throw new Error(`${label}: supportive ${good(yang)} / ${good(yin)}`);
    if (yang.find((x) => x.dir === "se").mansion !== "sheng-qi" || !yang.find((x) => x.dir === "se").words.includes(w.mansion)) throw new Error(`${label}: the south-east's wedge ${JSON.stringify(yang.find((x) => x.dir === "se"))}`);
    if (!(yang.find((x) => x.dir === "n").y < yang.find((x) => x.dir === "s").y)) throw new Error(`${label}: the north is not at the top`);
    const centres = await page.evaluate(() => [...document.querySelectorAll("[data-testid^=fengshui-centre-]")].map((e) => e.querySelector(".ulune-fs-centre-n")?.textContent));
    if (centres.join() !== "1,8") throw new Error(`${label}: the centres ${centres}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-${lang}-${width}.png`) }).catch(() => {});

    // A wedge's reading; the arrows walk round the rose and Enter reads the next.
    const east = page.getByTestId("fengshui-wedge-yang-e");
    await east.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await east.click();
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.restoration, label, "the east's reading");
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await east.focus();
    await page.keyboard.press("ArrowRight");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    if (focused !== "fengshui-wedge-yang-se") throw new Error(`${label}: the arrow went to ${focused}`);
    await page.keyboard.press("Enter");
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.growth, label, "the south-east's reading by keyboard");
    if (phone) await clickDockTab(page, "reading").catch(() => {});

    // The Kua's working, the yin count's rule for 5, the practical lines.
    for (const [id, text, what] of [
      ["fengshui-kua-yang", w.working, "the Kua's working"],
      ["fengshui-kua-yin", w.five, "the yin Kua's rule for 5"],
      ["fengshui-practice-yang", w.desk, "the practical lines"],
    ]) {
      await page.getByTestId(id).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.getByTestId(id).click();
      if (phone) await clickDockTab(page, "reading");
      await waitNote(page, text, label, what);
      if (phone) await clickDockTab(page, "reading").catch(() => {});
    }

    // The table.
    await setView(page, "table");
    await page.getByTestId("fengshui-table").waitFor({ timeout: 10000 });
    const rows = await page.evaluate(() => ({
      kua: document.querySelectorAll("[data-testid^=fengshui-row-kua-]").length,
      dirs: document.querySelectorAll("[data-testid^=fengshui-row-dir-]").length,
      practice: document.querySelectorAll("[data-testid^=fengshui-row-practice-]").length,
    }));
    if (rows.kua !== 2 || rows.dirs !== 8 || rows.practice !== 8) throw new Error(`${label}: the table ${JSON.stringify(rows)}`);
    await assertNoOverflow(page);
    await setView(page, "wheel");
    await page.getByTestId("fengshui").waitFor({ timeout: 10000 });

    // Settings → Chinese traditions → South at the top (another tab): the roses follow at once.
    await page.evaluate(() => {
      localStorage.setItem("ulune.chinese", JSON.stringify({ compass: "south" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-rose-yang]")?.getAttribute("data-top") === "south", null, { timeout: 4000 });
    const turned = await wedges(page, "yang");
    if (!(turned.find((x) => x.dir === "s").y < turned.find((x) => x.dir === "n").y)) throw new Error(`${label}: the south is not at the top`);
    await page.screenshot({ path: join(SHOTS, `fengshui-south-${lang}-${width}.png`) }).catch(() => {});
    await page.evaluate(() => localStorage.removeItem("ulune.chinese"));

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`fengshui ${label} OK`);
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
if (failures.length) {
  console.error(`FENGSHUI FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("FENGSHUI OK");
