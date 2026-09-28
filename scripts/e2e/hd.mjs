/*
 * The Human Design chart (parts 44–46 of the launch):
 *   - the drawing: 64 gates, 36 channels, 9 centres, no two gates touching on
 *     screen, nothing copied over the chart;
 *   - a click lights a piece where it is drawn: its disc does not move, it
 *     gets the ring, what it connects to stays, the rest fades, and the line
 *     under the chart names it; empty space lets it go;
 *   - pointing outlines without fading; the keyboard walks every piece and
 *     Enter opens it; zooming keeps clicks on the piece drawn there;
 *   - on a phone a tap near a gate chooses it, a card names it above the
 *     sheet, and Read opens its reading.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { DEV, SHOTS, ensureShotsDir, goStudioPage, gotoApp } from "./_lib.mjs";

function watch(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function openDesign(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("ulune.hint.wheel.v1", "1");
    } catch {
      /* no storage: the hint shows, which the checks do not mind */
    }
  });
  await gotoApp(page, "/");
  await page.getByTestId("sample-chart").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
  await goStudioPage(page, "design");
  await page.getByTestId("hd-graph").waitFor({ timeout: 30000 });
  await page.waitForTimeout(900);
}

const discOf = (page, n) =>
  page.evaluate((n) => {
    const r = document.querySelector(`[data-testid="hd-gate-${n}"] .hd-gate-disc`).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
  }, n);

async function desktop() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(20000);
    const errors = watch(page);
    await openDesign(page);

    // The drawing.
    const counts = await page.evaluate(() => ({
      gates: document.querySelectorAll('[data-testid^="hd-gate-"]').length,
      channels: document.querySelectorAll('[data-testid^="hd-channel-"]').length,
      centres: document.querySelectorAll('[data-testid^="hd-center-"]').length,
      copies: document.querySelectorAll('[data-testid="hd-box"] .ulune-relief').length,
    }));
    if (counts.gates !== 64 || counts.channels !== 36 || counts.centres !== 9) throw new Error(`drawing ${JSON.stringify(counts)}`);
    const touching = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[data-testid^="hd-gate-"] .hd-gate-disc')].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 };
      });
      let n = 0;
      for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) if (Math.hypot(d[i].x - d[j].x, d[i].y - d[j].y) < d[i].r + d[j].r) n++;
      return n;
    });
    if (touching) throw new Error(`${touching} pairs of gates touch on screen`);
    const shapes = await page.evaluate(() => ({
      head: document.querySelector('[data-testid="hd-center-head"]').getAttribute("data-shape"),
      ajna: document.querySelector('[data-testid="hd-center-ajna"]').getAttribute("data-shape"),
      heart: document.querySelector('[data-testid="hd-center-heart"]').getAttribute("data-shape"),
    }));
    if (shapes.head !== "tri-up" || shapes.ajna !== "tri-down" || shapes.heart !== "tri-up") throw new Error(`shapes ${JSON.stringify(shapes)}`);

    // Pointing: an outline, a name, nothing fades.
    await page.getByTestId("hd-center-sacral").hover();
    await page.waitForTimeout(300);
    const hover = await page.evaluate(() => ({
      focus: document.querySelector('[data-testid="hd-graph"]').getAttribute("data-focus"),
      hero: document.querySelector('[data-testid="hd-center-sacral"]').getAttribute("data-hover"),
      say: document.querySelector('[data-testid="hd-say"]').textContent,
      faded: [...document.querySelectorAll("[data-part]")].filter((el) => Number(getComputedStyle(el).opacity) < 0.9).length,
    }));
    if (hover.focus !== "hover" || hover.hero !== "hero" || !/Sacral/.test(hover.say) || hover.faded) throw new Error(`pointing ${JSON.stringify(hover)}`);

    // A click: in place, a ring, the rest faded, named.
    await page.mouse.move(2, 2);
    const before = await discOf(page, 34);
    await page.getByTestId("hd-gate-34").click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    const after = await discOf(page, 34);
    if (Math.abs(after.x - before.x) > 0.5 || Math.abs(after.y - before.y) > 0.5 || Math.abs(after.w - before.w) > 0.5) {
      throw new Error(`the chosen gate moved: ${JSON.stringify({ before, after })}`);
    }
    const pinned = await page.evaluate(() => ({
      focus: document.querySelector('[data-testid="hd-graph"]').getAttribute("data-focus"),
      hero: document.querySelector('[data-testid="hd-gate-34"]').getAttribute("data-hero"),
      channel: document.querySelector('[data-testid="hd-channel-34-20"]').getAttribute("data-lit"),
      far: Number(getComputedStyle(document.querySelector('[data-testid="hd-gate-64"]')).opacity),
      near: Number(getComputedStyle(document.querySelector('[data-testid="hd-gate-10"]')).opacity),
      say: document.querySelector('[data-testid="hd-say"]').textContent,
      copies: document.querySelectorAll(".ulune-relief").length,
    }));
    if (pinned.focus !== "pinned" || pinned.hero !== "1" || pinned.channel !== "1" || pinned.far > 0.3 || pinned.near < 0.99 || pinned.copies) {
      throw new Error(`chosen gate ${JSON.stringify(pinned)}`);
    }
    if (!/Gate 34/.test(pinned.say)) throw new Error(`line under the chart: ${pinned.say}`);
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    if (!/Gate 34/.test(await page.getByTestId("click-note").innerText())) throw new Error("the reading is not gate 34's");
    await page.screenshot({ path: join(SHOTS, "hd-pick-1280.png") });

    // Empty space lets it go.
    const box = await page.getByTestId("hd-graph").boundingBox();
    await page.mouse.click(box.x + 6, box.y + 6);
    await page.waitForTimeout(300);
    if (await page.getByTestId("hd-graph").getAttribute("data-focus")) throw new Error("empty space did not let the gate go");

    // Keyboard: one Tab stop, the arrows walk, Enter opens.
    await page.getByTestId("hd-keys").focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);
    const walked = await page.getByTestId("hd-say").innerText();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const said = await page.getByTestId("hd-keys-said").innerText();
    if (!/Opened/.test(said) || !walked) throw new Error(`keyboard: "${walked}" / "${said}"`);
    if ((await page.getByTestId("hd-graph").getAttribute("data-focus")) !== "pinned") throw new Error("Enter did not choose the piece");
    const tabStops = await page.evaluate(() => document.querySelectorAll('[data-testid="hd-box"] [tabindex="0"]').length);
    if (tabStops !== 1) throw new Error(`${tabStops} Tab stops in the chart`);
    await page.keyboard.press("Escape");

    // Zoom: a click still lands on the gate drawn there.
    await page.getByTestId("hd-zoom-in").click();
    await page.getByTestId("hd-zoom-in").click();
    await page.waitForTimeout(500);
    if ((await page.getByTestId("hd-zoom").getAttribute("data-zoom")) !== "1.50") throw new Error("zoom did not reach 1.5");
    const z = await discOf(page, 59);
    await page.mouse.click(z.x, z.y);
    await page.waitForTimeout(300);
    if ((await page.getByTestId("hd-gate-59").getAttribute("data-hero")) !== "1") throw new Error("a click on the zoomed chart missed gate 59");
    await page.getByTestId("hd-zoom-fit").click();
    await page.waitForTimeout(500);
    if ((await page.getByTestId("hd-zoom").getAttribute("data-zoom")) !== "1.00") throw new Error("Fit did not reset the zoom");

    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("hd-1280 OK");
  } finally {
    await browser.close();
  }
}

async function phone() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    const errors = watch(page);
    await openDesign(page);
    // A tap beside a small gate still chooses it; the chart keeps its size.
    const g = await discOf(page, 34);
    const w0 = (await page.getByTestId("hd-graph").boundingBox()).width;
    await page.touchscreen.tap(g.x + 9, g.y + 6);
    await page.waitForTimeout(400);
    if ((await page.getByTestId("hd-gate-34").getAttribute("data-hero")) !== "1") throw new Error("a tap beside gate 34 did not choose it");
    const card = page.getByTestId("hd-card");
    await card.waitFor({ timeout: 5000 });
    if (!/Gate 34/.test(await card.innerText())) throw new Error("the card does not name gate 34");
    const cardBox = await card.boundingBox();
    const sheet = await page.locator(".ob-panel").boundingBox();
    if (cardBox.y + cardBox.height > sheet.y + 1) throw new Error("the card is under the sheet");
    const w1 = (await page.getByTestId("hd-graph").boundingBox()).width;
    if (Math.abs(w1 - w0) > 1) throw new Error(`the chart shrank after a tap (${w0} → ${w1})`);
    if ((await page.locator(".ob-panel").getAttribute("data-detent")) !== "peek") throw new Error("a tap raised the sheet");
    await page.getByTestId("hd-card-read").click();
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    if (await card.count()) throw new Error("the card stayed over the open sheet");
    await page.screenshot({ path: join(SHOTS, "hd-read-390.png") });
    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("hd-390 OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
await desktop();
await phone();
console.log("HD OK", DEV);
