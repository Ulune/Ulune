/**
 * Accessible names: every visible button, link, input and select has one,
 * and in French no aria-label is left in English.
 */
import { FIXTURE_A, castFixture, clickDockTab, goStudioPage, gotoApp, launch, setLang } from "./_lib.mjs";

const EN_WORDS = /\b(the|and|open|close|show|hide|zoom|chart|reading|remove|select|step|play|back|next|previous|settings|search)\b/i;

async function scan(page, tag, fr) {
  return page.evaluate(
    ({ tag, fr, en }) => {
      const out = [];
      const re = new RegExp(en, "i");
      const els = document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], [role=option]");
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none") continue;
        let name = el.getAttribute("aria-label") || "";
        const lb = el.getAttribute("aria-labelledby");
        if (!name && lb) name = lb.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
        if (!name && el.id) name = document.querySelector(`label[for="${el.id}"]`)?.textContent ?? "";
        if (!name && el.closest("label")) name = el.closest("label").textContent ?? "";
        if (!name) name = (el.textContent ?? "").trim();
        if (!name) name = el.getAttribute("title") || el.getAttribute("placeholder") || "";
        const id = el.getAttribute("data-testid") || el.id || el.className?.toString().slice(0, 40);
        if (!name.trim()) out.push(`${tag}: no name → ${el.tagName.toLowerCase()} ${id}`);
        const aria = el.getAttribute("aria-label");
        if (fr && aria && re.test(aria)) out.push(`${tag}: English aria-label → "${aria}" (${id})`);
      }
      return out;
    },
    { tag, fr, en: EN_WORDS.source },
  );
}

const problems = [];
for (const lang of ["en", "fr"]) {
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    const fr = lang === "fr";
    for (const mode of ["natal", "transits", "timing", "synastry", "design", "numerology"]) {
      await goStudioPage(page, mode).catch(() => {});
      await page.waitForTimeout(700);
      for (const tab of ["reading", "bodies", "look", "birth"]) {
        await clickDockTab(page, tab).catch(() => {});
        await page.waitForTimeout(200);
        problems.push(...(await scan(page, `${lang}/${mode}/${tab}`, fr)));
      }
    }
  } finally {
    await browser.close();
  }
}
const uniq = [...new Set(problems.map((p) => p.replace(/^[^:]+: /, "")))];
if (uniq.length) {
  console.log(uniq.join("\n"));
  console.log(`A11Y FAIL ${uniq.length}`);
  process.exit(1);
}
console.log("A11Y OK");
