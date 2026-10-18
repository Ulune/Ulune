/*
 * Show mode (share and compare plan, idea B2): the page as a presentation.
 *   - 1920 × 1080 (a TV), English, two charts: the toolbar's button, then
 *     the birth chart: the frame gone (top bar, sections, toolbar, footer,
 *     zoom), the wheel larger, the reading in large type beside it, the full
 *     screen where the browser grants it; a planet tapped, its reading;
 *     the bar at the top, gone once the mouse is still and back when it
 *     moves; the next and previous chart from the bar and Page Up / Page
 *     Down, P back to the chart before (idea B3); Escape leaves and puts
 *     everything back (the panel's tab, the focus on the button, the full
 *     screen left); the F key in and out. Human Design and BaZi (drawn
 *     larger), Compare's toggle in the bar, the bar in French.
 *   - Reduced motion: the bar neither slides nor fades.
 *   - 390 × 844, a phone, French, through ⋯: the hint to turn it, the
 *     reading under the figure, a planet tapped, the bar's Leave; held
 *     sideways (844 × 390), the reading beside the figure.
 * No page may scroll sideways, and no page error.
 */
import { chromium } from "playwright";
import { FIXTURE_A, FIXTURE_B, castFixture, goStudioPage, gotoApp, setLang } from "./_lib.mjs";

const failures = [];
const fail = (msg) => failures.push(msg);
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

async function fresh(viewport, opts = {}) {
  const context = await browser.newContext({ viewport, ...opts });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { context, page, errors };
}

const showing = (page) => page.evaluate(() => document.documentElement.hasAttribute("data-show"));
const waitShow = (page, on = true) => page.waitForFunction((want) => document.documentElement.hasAttribute("data-show") === want, on, { timeout: 15000 });

/** Seen: present, drawn and not hidden. */
const seen = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  }, selector);

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const where = (page) => page.getByTestId("show-where").innerText().then((s) => s.replace(/\s+/g, " ").trim());
const zoomOf = (page, selector) => page.evaluate((sel) => Number(getComputedStyle(document.querySelector(sel)).zoom || 1), selector);
const box = (page, selector) => page.evaluate((sel) => {
  const r = document.querySelector(sel)?.getBoundingClientRect();
  return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
}, selector);
/** A square figure's drawn size: its SVG keeps its square inside its box (the smaller side). */
const drawn = async (page, selector) => {
  const b = await box(page, selector);
  return b ? Math.min(b.w, b.h) : 0;
};

/** Taps the Sun on the wheel (its glyph's place: the wheel's hits are geometric). */
async function tapSun(page, how = "click") {
  const sun = page.locator("[data-kind=planet][data-body=sun] circle").first();
  const b = await sun.boundingBox();
  if (!b) throw new Error("no Sun on the wheel");
  if (how === "tap") await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

/* ---------------------------------------------------------------- 1920 × 1080, English */
{
  const { context, page, errors } = await fresh({ width: 1920, height: 1080 });
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await castFixture(page, FIXTURE_B);
    // The panel on its Look tab, to see it put back.
    await page.getByTestId("dock-tab-look").click();
    const wheelBefore = await drawn(page, "[data-testid=studio-natal] svg.ulune-wheel");

    await page.getByTestId("show-open").click();
    await waitShow(page);
    await page.getByTestId("show-bar").waitFor({ state: "visible" });
    for (const sel of ["[data-testid=stage-toolbar]", "[data-testid=top-left]", "[data-testid=top-right]", ".ob-foot", ".ob-panel-head"]) {
      if (await seen(page, sel)) fail(`1920: ${sel} still shown in Show mode`);
    }
    if (!(await seen(page, "[data-testid=dock] [data-testid=click-reading-empty], [data-testid=dock] [data-testid=click-note]"))) fail("1920: no reading beside the wheel");
    if (!/^Birth chart · Sample B$/.test(await where(page))) fail(`1920: the bar says "${await where(page)}"`);
    await page.waitForTimeout(400);
    const wheel = await drawn(page, "[data-testid=studio-natal] svg.ulune-wheel");
    if (!wheelBefore || wheel < wheelBefore + 40) fail(`1920: the wheel did not grow (${Math.round(wheelBefore)} → ${Math.round(wheel)} px)`);
    const zoom = await zoomOf(page, ".ob-panel-pane");
    if (!(zoom >= 1.3)) fail(`1920: the reading's type is not larger (zoom ${zoom})`);
    if (await overflow(page)) fail("1920: the page scrolls sideways in Show mode");
    const fullscreen = await page
      .waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!fullscreen) console.log("  (the browser did not grant the full screen: Show mode fills the window)");

    // A planet tapped: its reading, in the large type.
    await tapSun(page);
    await page.getByTestId("click-note").filter({ hasText: "Sun" }).first().waitFor({ timeout: 8000 }).catch(() => fail("1920: the Sun's reading did not come"));

    // The bar goes once the mouse is still, comes back when it moves.
    await page.waitForFunction(() => !document.querySelector("[data-testid=show-bar]")?.hasAttribute("data-shown"), null, { timeout: 6000 }).catch(() => fail("1920: the bar stayed with the mouse still"));
    await page.mouse.move(400, 300);
    await page.mouse.move(420, 320);
    await page.waitForFunction(() => document.querySelector("[data-testid=show-bar]")?.hasAttribute("data-shown"), null, { timeout: 3000 }).catch(() => fail("1920: the bar did not come back on a move"));

    // The next chart, Page Up back, P back to the chart before.
    await page.getByTestId("show-next").click();
    await page.waitForFunction(() => /TraceQA/.test(document.querySelector("[data-testid=show-where]")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => fail("1920: the next chart did not open"));
    // A button of the bar pressed with the mouse keeps the focus, not the bar: it goes once the mouse is still.
    await page.mouse.move(700, 700);
    await page
      .waitForFunction(() => {
        const bar = document.querySelector("[data-testid=show-bar]");
        return Boolean(bar) && !bar.hasAttribute("data-shown") && getComputedStyle(bar).opacity === "0";
      }, null, { timeout: 6000 })
      .catch(() => fail("1920: the bar stayed on screen after a click on its button"));
    await page.locator("body").focus().catch(() => {});
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.keyboard.press("PageUp");
    await page.waitForFunction(() => /Sample B/.test(document.querySelector("[data-testid=show-where]")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => fail("1920: Page Up did not go back"));
    await page.keyboard.press("p");
    await page.waitForFunction(() => /TraceQA/.test(document.querySelector("[data-testid=show-where]")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => fail("1920: P did not flip to the chart before"));
    if (!(await showing(page))) fail("1920: changing charts left Show mode");

    // Escape leaves and puts everything back.
    await page.keyboard.press("Escape");
    await waitShow(page, false);
    if (!(await seen(page, "[data-testid=stage-toolbar]"))) fail("1920: the toolbar did not come back");
    if ((await page.getByTestId("dock-tab-look").getAttribute("aria-selected")) !== "true") fail("1920: the panel's tab was not put back");
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "show-open", null, { timeout: 3000 }).catch(async () => fail(`1920: the focus went to ${await page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName)}`));
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 }).catch(() => fail("1920: the full screen was not left"));

    // F in, F out.
    await page.keyboard.press("f");
    await waitShow(page).catch(() => fail("1920: F did not open Show mode"));
    await page.keyboard.press("f");
    await waitShow(page, false).catch(() => fail("1920: F did not leave Show mode"));
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 }).catch(() => fail("1920: F left the full screen on"));

    // Human Design: the bodygraph larger, its reading beside it.
    await goStudioPage(page, "design");
    await page.getByTestId("hd-graph").waitFor({ timeout: 30000 });
    await page.waitForTimeout(400);
    const hdBefore = await box(page, "[data-testid=hd-graph]");
    await page.keyboard.press("f");
    await waitShow(page);
    await page.waitForTimeout(400);
    const hd = await box(page, "[data-testid=hd-graph]");
    if (!hd || !hdBefore || hd.h < hdBefore.h) fail(`1920: the bodygraph shrank (${hdBefore?.h} → ${hd?.h})`);
    if (!/^Human Design · TraceQA$/.test(await where(page))) fail(`1920 HD: the bar says "${await where(page)}"`);
    if (await overflow(page)) fail("1920 HD: the page scrolls sideways");
    await page.keyboard.press("Escape");
    await waitShow(page, false);

    // BaZi: drawn larger on a large screen.
    await goStudioPage(page, "bazi");
    await page.getByTestId("studio-bazi").waitFor({ timeout: 30000 });
    await page.getByTestId("show-open").click();
    await waitShow(page);
    if (!(await page.evaluate(() => document.documentElement.hasAttribute("data-show-larger")))) fail("1920 BaZi: not drawn larger");
    const larger = await page.evaluate(() => Number(getComputedStyle(document.querySelector(".ob-figure > :not(.ob-zoom-slot)")).zoom || 1));
    if (!(larger > 1.2)) fail(`1920 BaZi: the pillars' zoom is ${larger}`);
    if (await overflow(page)) fail("1920 BaZi: the page scrolls sideways");
    // Compare's toggle, where the page has Compare.
    const compare = page.getByTestId("show-compare");
    if (await compare.count()) {
      await page.mouse.move(600, 400);
      await compare.click();
      await page.waitForFunction(() => document.querySelector("[data-testid=show-compare]")?.getAttribute("aria-pressed") === "true", null, { timeout: 8000 }).catch(() => fail("1920 BaZi: Compare's toggle did not turn it on"));
      if (!(await showing(page))) fail("1920 BaZi: Compare left Show mode");
      await page.getByTestId("show-compare").click();
      await page.waitForFunction(() => document.querySelector("[data-testid=show-compare]")?.getAttribute("aria-pressed") === "false", null, { timeout: 8000 }).catch(() => fail("1920 BaZi: Compare's toggle did not turn it off"));
    } else fail("1920 BaZi: no Compare toggle in the bar");
    await page.mouse.move(700, 500);
    await page.getByTestId("show-leave").click();
    await waitShow(page, false);
    if (await page.evaluate(() => document.documentElement.hasAttribute("data-show-larger"))) fail("1920 BaZi: still drawn larger once left");

    // In French.
    await goStudioPage(page, "natal");
    await setLang(page, "fr");
    await page.getByTestId("show-open").click();
    await waitShow(page);
    if (!/^Thème natal · TraceQA$/.test(await where(page))) fail(`1920 fr: the bar says "${await where(page)}"`);
    if (!/Quitter/.test(await page.getByTestId("show-leave").innerText())) fail("1920 fr: Leave is not in French");
    if (!/Échap pour quitter/.test(await page.getByTestId("show-bar").innerText())) fail("1920 fr: the keys' hint is not in French");
    await page.keyboard.press("Escape");
    await waitShow(page, false);
    if (errors.length) fail(`1920: ${errors.join(" | ")}`);
    console.log("1920 OK: the frame hidden, the wheel larger, the reading large, a planet's reading, the bar, next/previous, P, Escape, F, Human Design, BaZi larger, Compare, French");
  } catch (e) {
    fail(`1920: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- reduced motion */
{
  const { context, page, errors } = await fresh({ width: 1280, height: 800 }, { reducedMotion: "reduce" });
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("show-open").click();
    await waitShow(page);
    const motion = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector("[data-testid=show-bar]"));
      return { duration: cs.transitionDuration, transform: cs.transform };
    });
    // (The app's own rule leaves every transition a hundredth of a millisecond.)
    const longest = Math.max(...motion.duration.split(",").map((d) => parseFloat(d) * (/ms$/.test(d.trim()) ? 0.001 : 1)));
    if (longest > 0.001 || motion.transform !== "none") fail(`reduced motion: the bar moves (${JSON.stringify(motion)})`);
    await page.keyboard.press("Escape");
    await waitShow(page, false);
    if (errors.length) fail(`reduced motion: ${errors.join(" | ")}`);
    console.log("reduced motion OK: the bar neither slides nor fades");
  } catch (e) {
    fail(`reduced motion: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- 390 × 844, a phone, French */
{
  const { context, page, errors } = await fresh({ width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  try {
    await gotoApp(page);
    await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("stage-more").click();
    await page.getByTestId("more-show").click();
    await waitShow(page);
    const hint = page.getByTestId("show-rotate");
    await hint.waitFor({ timeout: 4000 }).catch(() => fail("390: no hint to turn the phone"));
    if ((await hint.count()) && !/Tournez votre téléphone/.test(await hint.innerText())) fail("390: the hint is not in French");
    if (await seen(page, "[data-testid=stage-toolbar]")) fail("390: the toolbar is still shown");
    if (await seen(page, ".ob-sections")) fail("390: the sections bar is still shown");
    if (await seen(page, "[data-testid=dock-tab-look]")) fail("390: the panel's tabs are still shown");
    const sheet = await box(page, "[data-testid=dock] .ob-panel-pane");
    const stage = await box(page, "[data-testid=studio-natal] .ulune-wheel-port");
    if (!sheet || !stage || sheet.y < stage.y + stage.h - 4) fail(`390: the reading is not under the figure (${JSON.stringify({ sheet, stage })})`);
    if (stage && stage.w < 300) fail(`390: the wheel is ${stage.w} px wide`);
    // Once the bar has gone (a tap on it is the bar's); the hint lets taps through.
    await page.waitForFunction(() => !document.querySelector("[data-testid=show-bar]")?.hasAttribute("data-shown"), null, { timeout: 6000 }).catch(() => fail("390: the bar stayed"));
    await tapSun(page, "tap");
    await page.getByTestId("click-note").filter({ hasText: "Soleil" }).first().waitFor({ timeout: 8000 }).catch(() => fail("390: the Sun's reading did not come"));
    if (await overflow(page)) fail("390: the page scrolls sideways");
    // A tap brings the bar: Leave.
    await page.touchscreen.tap(195, 120);
    await page.getByTestId("show-leave").tap();
    await waitShow(page, false);
    if (!(await seen(page, "[data-testid=dock-tab-reading]"))) fail("390: the panel's tabs did not come back");

    // Held sideways: the reading beside the figure.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    await page.getByTestId("stage-more").click();
    await page.getByTestId("more-show").click();
    await waitShow(page);
    await page.waitForTimeout(400);
    const side = await box(page, "[data-testid=dock]");
    if (!side || side.x < 844 * 0.45 || side.y > 2 || side.h < 380) fail(`844 × 390: the reading is not beside the figure (${JSON.stringify(side)})`);
    if (await overflow(page)) fail("844 × 390: the page scrolls sideways");
    await page.touchscreen.tap(200, 200);
    await page.getByTestId("show-leave").tap();
    await waitShow(page, false);
    if (errors.length) fail(`390: ${errors.join(" | ")}`);
    console.log("390 OK: through ⋯, the hint to turn it, the reading under the wheel, the Sun's reading, Leave; sideways, the reading beside it");
  } catch (e) {
    fail(`390: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

await browser.close();
if (failures.length) {
  console.error(`SHOW FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("SHOW OK");
