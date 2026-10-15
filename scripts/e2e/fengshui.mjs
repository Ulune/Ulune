/*
 * Feng Shui's personal half (languages plan, part 21), at /feng-shui, at
 * 1280 and 390 px, in English and French, with Fixture A (made up:
 * 15/06/1990, 12:00, Paris) and no yin or yang count, so both Kua numbers:
 *   - reached by its card in the language picker, under Chinese traditions,
 *     its ⓘ leading to its home in the encyclopedia;
 *   - (part 28) the picker's cards on a first visit: the three Chinese
 *     languages say "new" (their spoken names too), the Western ones do not;
 *     the Chinese ones give their pinyin and characters as Settings says
 *     (Traditional, Simplified, "Name and pinyin", "Name only", followed at
 *     once); Feng Shui's says a home is optional; the first opening's day is
 *     kept, and 30 days on nothing says "new";
 *   - the first read in the side panel: the Kua, its group, the best
 *     direction and the practice, for each count;
 *   - two roses: Kua 1 (Kan, East group: the south-east, east, south and
 *     north supportive) for the yang count, Kua 8 (Gen, West group) for the
 *     yin count, the north at the top; each wedge says its mansion;
 *   - a wedge's reading, the arrows walking round the rose, the Kua's
 *     reading with its working (11 − 1 = 10), the practical lines;
 *   - the table: both Kua, eight directions, eight practical lines;
 *   - Settings' "South at the top" followed at once;
 *   - (part 29) the first read: no method note for Fixture A, and "How Ulune
 *     calculates" at its end, naming the Eight Mansions school, its classic
 *     and the rule for 5;
 *   - (part 27, the review's FS7) the trigrams drawn by Ulune, never a
 *     font's ☰…☷: in the wedges, the centres, the Kua's card (its symbol
 *     kept for screen readers) and the first read;
 *   - nothing sent while the page works it out; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, launch, setLang, setView } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

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
    how: "How Ulune calculates",
    method: ["Eight Mansions school", "Ba Zhai Ming Jing", "it becomes 2 (Kun) for the yang count and 8 (Gen) for the yin count", "Swiss Ephemeris 2.10.03, JPL DE441"],
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
    how: "Comment Ulune calcule",
    method: ["l’école des Huit Demeures", "Ba Zhai Ming Jing", "il devient 2 (Kun) pour le compte yang et 8 (Gen) pour le compte yin", "Swiss Ephemeris 2.10.03, JPL DE441"],
  },
};
const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");

// The picker's cards (languages plan, part 28).
const CARDS = {
  en: {
    fresh: "New",
    needs: "A date is enough; a home is optional",
    names: { "chinese-astrology": "Chinese astrology", bazi: "BaZi", "feng-shui": "Feng Shui" },
  },
  fr: {
    fresh: "Nouveau",
    needs: "Une date suffit\u202f; un logement est facultatif",
    names: { "chinese-astrology": "Astrologie chinoise", bazi: "BaZi", "feng-shui": "Feng Shui" },
  },
};
const CHINESE = ["chinese-astrology", "bazi", "feng-shui"];
const WESTERN = ["astrology", "human-design", "numerology"];
/** Each language's pinyin, Traditional and Simplified characters. */
const OWN = { "chinese-astrology": ["shēngxiào", "生肖", "生肖"], bazi: ["bāzì", "八字", "八字"], "feng-shui": ["fēngshuǐ", "風水", "风水"] };

/** What each card of the open picker says: "new", its spoken name, its pinyin and characters, what it needs. */
const readCards = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("[data-testid=lang-picker] [data-testid^=lang-card-]")].map((b) => {
        const id = b.getAttribute("data-testid").slice(10);
        const hanzi = b.querySelector(".ob-langs-hanzi");
        return [
          id,
          {
            fresh: b.querySelector(`[data-testid=lang-new-${id}]`)?.textContent ?? null,
            label: b.getAttribute("aria-label"),
            pinyin: b.querySelector("[lang=zh-Latn-pinyin]")?.textContent ?? null,
            hanzi: hanzi?.textContent ?? null,
            hanziLang: hanzi?.getAttribute("lang") ?? null,
            cjk: /[\u3400-\u9fff]/.test(b.textContent),
            needs: b.querySelector(".ob-langs-needs")?.textContent ?? null,
          },
        ];
      }),
    ),
  );

/** Settings → Chinese traditions, changed in another tab: the open views follow at once. */
const setChinese = (page, prefs) =>
  page.evaluate((p) => {
    if (p) localStorage.setItem("ulune.chinese", JSON.stringify(p));
    else localStorage.removeItem("ulune.chinese");
    window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
  }, prefs);

/** The picker open on a first visit (its picture saved as `shot`); it is left open. */
async function pickerCards(page, label, lang, shot) {
  const c = CARDS[lang];
  let cards = await readCards(page);
  for (const id of CHINESE) {
    if (cards[id]?.fresh !== c.fresh) throw new Error(`${label}: ${id}'s card says ${JSON.stringify(cards[id]?.fresh)}, not "${c.fresh}"`);
    if (cards[id].label !== `${c.names[id]}, ${c.fresh}`) throw new Error(`${label}: ${id}'s card is named "${cards[id].label}"`);
  }
  for (const id of WESTERN) {
    if (cards[id]?.fresh !== null || cards[id].label !== null) throw new Error(`${label}: ${id}'s card says it is new (${JSON.stringify(cards[id])})`);
  }
  if ((await page.getByRole("button", { name: `BaZi, ${c.fresh}`, exact: true }).count()) !== 1) throw new Error(`${label}: no button named "BaZi, ${c.fresh}"`);
  // The day of this first opening is kept with the studio's other marks, as a date and nothing more.
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem("ulune.studio.last.v2") ?? "{}").seen);
  const keys = Object.keys(seen ?? {});
  if (keys.join() !== "2.0" || !/^\d{4}-\d{2}-\d{2}$/.test(seen["2.0"]) || Math.abs(Date.parse(seen["2.0"]) - Date.now()) > 2 * 86_400_000) {
    throw new Error(`${label}: kept ${JSON.stringify(seen)}`);
  }

  // Their own names as Settings says: by default the pinyin and the Traditional characters, each marked with its language.
  for (const [id, [pinyin, hant]] of Object.entries(OWN)) {
    if (cards[id].pinyin !== pinyin || cards[id].hanzi !== hant || cards[id].hanziLang !== "zh-Hant") throw new Error(`${label}: ${id}'s own name ${JSON.stringify(cards[id])}`);
  }
  for (const id of WESTERN) if (cards[id].cjk || cards[id].pinyin) throw new Error(`${label}: ${id}'s card has Chinese`);
  // Feng Shui's card: a date is enough, a home only if the reader wants one.
  if (cards["feng-shui"].needs !== c.needs) throw new Error(`${label}: Feng Shui needs "${cards["feng-shui"].needs}"`);
  await page.screenshot({ path: shot }).catch(() => {});

  // Simplified characters: 风水.
  await setChinese(page, { script: "hans" });
  await page.waitForFunction(() => document.querySelector("[data-testid=lang-card-feng-shui] .ob-langs-hanzi")?.getAttribute("lang") === "zh-Hans", null, { timeout: 4000 });
  cards = await readCards(page);
  for (const [id, [pinyin, , hans]] of Object.entries(OWN)) {
    if (cards[id].pinyin !== pinyin || cards[id].hanzi !== hans) throw new Error(`${label}: ${id} in Simplified ${JSON.stringify(cards[id])}`);
  }
  // "Name and pinyin": no characters.
  await setChinese(page, { show: "pinyin" });
  await page.waitForFunction(() => !/[\u3400-\u9fff]/.test(document.querySelector("[data-testid=lang-picker]")?.textContent ?? "字"), null, { timeout: 4000 });
  cards = await readCards(page);
  for (const [id, [pinyin]] of Object.entries(OWN)) if (cards[id].pinyin !== pinyin || cards[id].hanzi !== null) throw new Error(`${label}: ${id} with pinyin only ${JSON.stringify(cards[id])}`);
  // "Name only": neither, and "new" stays, beside the name.
  await setChinese(page, { show: "names" });
  await page.waitForFunction(() => !document.querySelector("[data-testid=lang-picker] [lang=zh-Latn-pinyin]"), null, { timeout: 4000 });
  cards = await readCards(page);
  for (const id of CHINESE) {
    if (cards[id].cjk || cards[id].pinyin || cards[id].fresh !== c.fresh) throw new Error(`${label}: ${id} with the name only ${JSON.stringify(cards[id])}`);
  }
  await assertNoOverflow(page);
  await setChinese(page, null);
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=lang-picker] .ob-langs-hanzi").length === 3, null, { timeout: 4000 });

  // Four weeks on (the first opening moved 30 days back): nothing says "new" any more.
  await page.waitForFunction(() => document.activeElement?.closest("[data-testid=lang-picker]"), null, { timeout: 4000 }).catch(() => {});
  await page.keyboard.press("Escape");
  await page.getByTestId("lang-picker").waitFor({ state: "detached", timeout: 4000 });
  await page.evaluate(() => {
    const kept = JSON.parse(localStorage.getItem("ulune.studio.last.v2") ?? "{}");
    kept.seen = { "2.0": new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10) };
    localStorage.setItem("ulune.studio.last.v2", JSON.stringify(kept));
  });
  await page.getByTestId("lang-button").click();
  await page.getByTestId("lang-card-feng-shui").waitFor({ timeout: 8000 });
  cards = await readCards(page);
  for (const id of [...CHINESE, ...WESTERN]) {
    if (cards[id]?.fresh !== null || cards[id].label !== null) throw new Error(`${label}: 30 days on, ${id} ${JSON.stringify(cards[id])}`);
  }
  if (cards.bazi.hanzi !== "八字") throw new Error(`${label}: 30 days on, BaZi's characters ${JSON.stringify(cards.bazi)}`);
}

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
    // Its ⓘ leads to Feng Shui's home in the encyclopedia, in the reader's language (encyclopedia plan, part 23).
    const info = await page.getByTestId("lang-info-feng-shui").getAttribute("href").catch(() => null);
    if (info !== (lang === "fr" ? "/encyclopedie/feng-shui" : "/encyclopedia/feng-shui")) throw new Error(`${label}: Feng Shui's ⓘ leads to ${info}`);
    await pickerCards(page, label, lang, join(SHOTS, `fengshui-picker-${lang}-${width}.png`));
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);
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
    // Part 29: no note for Fixture A; the first read ends on "How Ulune calculates", folded.
    const method = await page.evaluate(() => {
      const how = document.querySelector("[data-testid=fengshui-hello] [data-testid=method-notes]");
      return { notes: document.querySelectorAll("[data-testid=fengshui-hello] [data-testid=method-note]").length, title: how?.querySelector("summary")?.textContent?.trim(), open: how?.open, text: how?.textContent ?? "" };
    });
    if (method.notes || method.title !== w.how || method.open || !w.method.every((t) => method.text.includes(t))) throw new Error(`${label}: the method notes ${JSON.stringify(method).slice(0, 300)}`);
    // (part 27, FS7) The first read's Kua steps draw their trigram: Kan for Kua 1, Gen for Kua 8.
    const firstBars = await page.evaluate(() => ["yang", "yin"].map((c) => {
      const t = document.querySelector(`[data-testid=fengshui-hello-kua-${c}] [data-trigram]`);
      return `${t?.getAttribute("data-trigram")}:${t?.querySelectorAll("rect").length ?? 0}`;
    }));
    if (firstBars.join() !== "kan:5,gen:5") throw new Error(`${label}: the first read's trigrams ${firstBars}`);
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
    // (part 27, the review's FS7) The trigrams drawn by Ulune, never a font's ☰…☷: three bars, two for a broken line,
    // in each wedge, the centre, the Kua's card and the first read; the card keeps the symbol for screen readers.
    const drawn = await page.evaluate(() => {
      const bars = (sel) => document.querySelector(sel)?.querySelectorAll("rect").length ?? 0;
      const glyph = document.querySelector("[data-testid=fengshui-kua-yang] [data-trigram] svg");
      return {
        glyphs: [...document.querySelectorAll("[data-testid^=fengshui-rose-] text")].filter((t) => /[☰-☷]/u.test(t.textContent ?? "")).length,
        wedges: document.querySelectorAll("[data-testid=fengshui-rose-yang] [data-dir] [data-trigram]").length,
        north: bars("[data-testid=fengshui-wedge-yang-n] [data-trigram]"),
        south: bars("[data-testid=fengshui-wedge-yang-s] [data-trigram]"),
        centre: bars("[data-testid=fengshui-centre-yin] [data-trigram]"),
        card: document.querySelector("[data-testid=fengshui-kua-yang] [data-trigram]")?.getAttribute("data-trigram"),
        cardBars: glyph?.querySelectorAll("rect").length ?? 0,
        cardHeight: Math.round(glyph?.getBoundingClientRect().height ?? 0),
        said: document.querySelector("[data-testid=fengshui-kua-yang] [data-trigram] .sr-only")?.textContent,
      };
    });
    // Kan ☵ in the north (broken, whole, broken), Li ☲ in the south (whole, broken, whole), Gen ☶ for Kua 8.
    if (JSON.stringify(drawn) !== JSON.stringify({ glyphs: 0, wedges: 8, north: 5, south: 4, centre: 5, card: "kan", cardBars: 5, cardHeight: drawn.cardHeight, said: "☵" }) || drawn.cardHeight < 14) {
      throw new Error(`${label}: the trigrams drawn ${JSON.stringify(drawn)}`);
    }
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
