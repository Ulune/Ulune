/**
 * The panel's page tabs (Bodies: Planets, Aspects, …; Look: Profiles, …) stay in view: on a phone the
 * sheet scrolls, and the row used to scroll away, or be left above a shorter page. Scrolled down in a long
 * page, then switching to another, the tabs are on screen and the new page starts at its top.
 */
import { DEV, FIXTURE_A, castFixture, gotoApp, launch } from "./_lib.mjs";

const bad = [];
for (const width of [390, 1280]) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    await page.waitForSelector("#birth-date", { timeout: 20000 });
    await castFixture(page, FIXTURE_A);
    await page.waitForTimeout(1500);
    for (const [tab, scroller, pages] of [
      ["bodies", "bodies-tab", ["planets", "aspects", "angles", "marks"]],
      ["look", "look-tab", null],
    ]) {
      await page.getByTestId(`dock-tab-${tab}`).click();
      const root = page.getByTestId(scroller);
      await root.waitFor({ timeout: 10000 });
      await page.waitForTimeout(700);
      const ids = pages ?? (await page.evaluate((t) => [...document.querySelectorAll(`[data-testid^="${t}-page-"]`)].map((e) => e.getAttribute("data-testid").replace(`${t}-page-`, "")), tab));
      const tabsVisible = () =>
        page.evaluate(
          ([sel]) => {
            const sc = document.querySelector(`[data-testid="${sel}"]`);
            const row = sc?.querySelector('[role="tablist"]');
            if (!sc || !row) return { ok: false, why: "no tabs" };
            const a = sc.getBoundingClientRect();
            const r = row.getBoundingClientRect();
            const panelTop = a.top;
            // Nothing of the page shows above the tabs (the row's holder covers the panel's top edge)
            // and the row is whole on screen.
            const x = (r.left + r.right) / 2;
            const above = document.elementFromPoint(x, Math.max(a.top + 2, 0));
            const covered = Boolean(above?.closest(".ulune-dock-tabs"));
            return { ok: r.top >= panelTop - 1 && r.bottom <= a.bottom + 1 && r.height > 20 && covered, covered, top: Math.round(r.top - panelTop), scroll: Math.round(sc.scrollTop) };
          },
          [scroller],
        );
      for (const id of ids) {
        // Scroll the panel as far down as it goes, then switch page.
        await root.evaluate((el) => { el.scrollTop = el.scrollHeight; });
        await page.waitForTimeout(150);
        const during = await tabsVisible();
        if (!during.ok) bad.push(`${width} ${tab}: tabs out of view while scrolled (${JSON.stringify(during)})`);
        await page.getByTestId(`${tab}-page-${id}`).click({ force: true });
        await page.waitForTimeout(500);
        const after = await tabsVisible();
        if (!after.ok) bad.push(`${width} ${tab}→${id}: tabs out of view after switching (${JSON.stringify(after)})`);
        if (after.scroll > 2) bad.push(`${width} ${tab}→${id}: the new page does not start at its top (${after.scroll})`);
      }
    }
    console.log(`dock-tabs-${width} checked`);
  } finally {
    await browser.close();
  }
}
if (bad.length) {
  console.log("DOCK TABS FAIL");
  for (const b of [...new Set(bad)]) console.log("-", b);
  process.exit(1);
}
console.log("DOCK TABS OK", DEV);
