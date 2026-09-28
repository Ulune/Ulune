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
// The keyboard: a menu takes the focus and gives it back, arrows move along
// tab strips, the wheel is one stop whose parts the arrows walk.
{
  const { browser, page } = await launch(1280);
  const fail = (msg) => problems.push(`keys: ${msg}`);
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.id ?? "");
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "natal");
    await clickDockTab(page, "reading");

    await page.getByTestId("account-menu").focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("account-menu-panel").waitFor({ timeout: 8000 });
    await page.waitForTimeout(200);
    const inside = await page.evaluate(() =>
      Boolean(document.querySelector("[data-testid=account-menu-panel]")?.contains(document.activeElement)),
    );
    if (!inside) fail("the menu did not take the focus");
    const first = await focused();
    await page.keyboard.press("ArrowDown");
    if ((await focused()) === first) fail("ArrowDown did not move in the menu");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    if ((await focused()) !== "account-menu") fail(`the focus went to "${await focused()}" after Escape`);

    await page.getByTestId("dock-tab-reading").focus();
    await page.keyboard.press("ArrowRight");
    const dock = await page.evaluate(() => ({
      focus: document.activeElement?.getAttribute("data-testid"),
      chosen: document.querySelector("[data-testid=dock-tab-bodies]")?.getAttribute("aria-selected"),
      stops: [...document.querySelectorAll("[data-testid^=dock-tab-]")].filter((t) => t.tabIndex === 0).length,
    }));
    if (dock.focus !== "dock-tab-bodies" || dock.chosen !== "true" || dock.stops !== 1) fail(`dock tabs ${JSON.stringify(dock)}`);
    await page.keyboard.press("ArrowLeft");

    await page.getByTestId("mode-group-chart").focus();
    await page.keyboard.press("ArrowRight");
    const group = await page.evaluate(() => ({
      focus: document.activeElement?.getAttribute("data-testid"),
      chosen: document.querySelector("[data-testid=mode-group-time]")?.getAttribute("aria-selected"),
    }));
    if (group.focus !== "mode-group-time" || group.chosen === "true") fail(`modes ${JSON.stringify(group)}`);

    const list = page.getByTestId("wheel-keys");
    await list.focus();
    await page.waitForTimeout(150);
    const a = await list.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    const b = await list.getAttribute("aria-activedescendant");
    if (!a || !b || a === b) fail(`the wheel's arrows: ${a} → ${b}`);
    const name = await page.evaluate((id) => document.getElementById(id)?.textContent?.trim() ?? "", b);
    await page.keyboard.press("PageDown");
    const kindJump = await list.getAttribute("aria-activedescendant");
    if (kindJump === b) fail("Page Down did not move");
    await page.keyboard.press("PageUp");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    const said = (await page.getByTestId("wheel-keys-said").textContent()) ?? "";
    if (!name || !said.includes(name)) fail(`said "${said}" for "${name}"`);
    const stops = await page.evaluate(() => document.querySelectorAll('svg.ulune-wheel [tabindex="0"]').length);
    if (stops) fail(`${stops} parts of the wheel are still Tab stops`);
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
