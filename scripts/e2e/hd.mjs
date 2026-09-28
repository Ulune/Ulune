/*
 * The Human Design chart (parts 44–46 of the launch):
 *   - the drawing: 64 gates, 36 channels, 9 centres, no two gates touching on
 *     screen, nothing copied over the chart;
 *   - a click lights a piece where it is drawn: its disc does not move, it
 *     gets the ring, what it connects to stays, the rest fades, and the line
 *     under the chart names it; empty space lets it go;
 *   - pointing outlines without fading; the keyboard walks every piece and
 *     Enter opens it; zooming keeps clicks on the piece drawn there;
 *   - the facts above the chart and the two columns beside it, tied to the
 *     chart both ways; the first read; the activations in the Table view;
 *     the layer switch explaining itself;
 *   - on a phone a tap near a gate chooses it, a card names it above the
 *     sheet, and Read opens its reading; the columns come under the chart.
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
    // While the list has the keyboard's focus, the chart shows the ring.
    const ring = await page.evaluate(() => getComputedStyle(document.querySelector("[data-testid=hd-zoom]")).outlineStyle);
    if (ring !== "solid") throw new Error(`no focus ring on the chart (${ring})`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const said = await page.getByTestId("hd-keys-said").innerText();
    if (!/Opened/.test(said) || !walked) throw new Error(`keyboard: "${walked}" / "${said}"`);
    if ((await page.getByTestId("hd-graph").getAttribute("data-focus")) !== "pinned") throw new Error("Enter did not choose the piece");
    const tabStops = await page.evaluate(() => ({
      chart: document.querySelectorAll('[data-testid="hd-box"] .ulune-figure-keys [tabindex="0"]').length,
      columns: [...document.querySelectorAll('[data-testid="hd-col-design"], [data-testid="hd-col-personality"]')].map((c) => c.querySelectorAll('[tabindex="0"]').length),
      all: document.querySelectorAll('[data-testid="hd-box"] [tabindex="0"]').length,
    }));
    if (tabStops.chart !== 1 || tabStops.columns.join() !== "1,1" || tabStops.all !== 3) throw new Error(`Tab stops ${JSON.stringify(tabStops)}`);
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

    await page.getByTestId("hd-zoom-fit").click();
    await page.keyboard.press("Escape");
    await page.getByTestId("hd-graph").click({ position: { x: 6, y: 6 } });
    await page.waitForTimeout(300);

    // The facts above the chart: the five keys and the cross, each opening its reading.
    const facts = await page.evaluate(() => [...document.querySelectorAll("[data-fact]")].map((b) => b.getAttribute("data-fact")));
    if (facts.join() !== "type,strategy,authority,profile,definition,cross") throw new Error(`facts ${facts}`);
    if (!/Manifesting Generator/.test(await page.getByTestId("hd-fact-type").innerText())) throw new Error("the type fact");
    if (!/38\/39 \| 48\/21/.test(await page.getByTestId("hd-fact-cross").innerText())) throw new Error("the cross fact");
    await page.getByTestId("hd-fact-authority").click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    if ((await page.getByTestId("hd-center-solarPlexus").getAttribute("data-hero")) !== "1") throw new Error("the authority did not light the Solar Plexus");
    if (!/Emotional/.test(await page.getByTestId("click-note").innerText())) throw new Error("the authority's reading");
    await page.getByTestId("hd-fact-authority").click();
    await page.waitForTimeout(300);

    // The first read: five steps, in Human Design's order, with this chart's words.
    await page.getByTestId("hd-hello").waitFor({ timeout: 8000 });
    const steps = await page.evaluate(() => [...document.querySelectorAll("[data-testid=hd-hello] [data-hello-cell]")].map((b) => b.getAttribute("data-hello-cell")));
    if (steps.join() !== "type,strategy,authority,profile,definition") throw new Error(`first read ${steps}`);
    await page.waitForFunction(() => /Signposts/.test(document.querySelector("[data-testid=hd-hello-type]")?.textContent ?? ""), null, { timeout: 8000 });

    // The columns: 13 rows each, in Jovian Archive's order, tied to the chart.
    const cols = await page.evaluate(() =>
      ["design", "personality"].map((l) => [...document.querySelectorAll(`[data-testid=hd-col-${l}] [data-act]`)].map((r) => r.getAttribute("data-act").split(":")[2])),
    );
    const order = "sun,earth,northnode,southnode,moon,mercury,venus,mars,jupiter,saturn,uranus,neptune,pluto";
    if (cols[0].join() !== order || cols[1].join() !== order) throw new Error(`columns ${JSON.stringify(cols)}`);
    if (!/38\.1/.test(await page.getByTestId("hd-row-personality-sun").innerText())) throw new Error("the Personality Sun row");
    const rowTops = await page.evaluate(() => ["design", "personality"].map((l) => Math.round(document.querySelector(`[data-testid=hd-row-${l}-sun]`).getBoundingClientRect().top)));
    if (Math.abs(rowTops[0] - rowTops[1]) > 1) throw new Error(`the two columns' rows are not level ${rowTops}`);
    // Pointing at a row outlines its gate; pointing at a gate lights its rows.
    await page.getByTestId("hd-row-personality-venus").hover();
    await page.waitForTimeout(300);
    if ((await page.getByTestId("hd-gate-34").getAttribute("data-hover")) !== "hero") throw new Error("a row did not outline its gate");
    await page.getByTestId("hd-gate-26").hover();
    await page.waitForTimeout(300);
    if (!(await page.getByTestId("hd-row-design-mars").getAttribute("data-hover"))) throw new Error("a gate did not light its row");
    await page.mouse.move(2, 2);
    // A gate chosen: its row stays bright, the others fade.
    await page.getByTestId("hd-gate-34").click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    const rowsLit = await page.evaluate(() => ({
      venus: document.querySelector("[data-testid=hd-row-personality-venus]").getAttribute("data-lit"),
      faded: Number(getComputedStyle(document.querySelector("[data-testid=hd-row-design-moon]")).opacity),
    }));
    if (rowsLit.venus !== "1" || rowsLit.faded > 0.5) throw new Error(`rows with gate 34 ${JSON.stringify(rowsLit)}`);
    // A row chosen: its gate lights, the reading is the body's.
    await page.getByTestId("hd-row-design-sun").click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    if ((await page.getByTestId("hd-gate-48").getAttribute("data-hero")) !== "1") throw new Error("a row did not light its gate");
    if ((await page.getByTestId("hd-row-design-sun").getAttribute("data-hero")) !== "1") throw new Error("the chosen row has no ring");
    if (!/Design Sun 48\.4/.test(await page.getByTestId("click-note").innerText())) throw new Error("the row's reading");
    await page.screenshot({ path: join(SHOTS, "hd-row-1280.png") });
    await page.getByTestId("hd-graph").click({ position: { x: 6, y: 6 } });

    // The layer switch explains itself once per layer, and the other column dims.
    await page.getByTestId("hd-view-design").click();
    await page.getByTestId("hd-layer-hint").waitFor({ timeout: 5000 });
    if (!/Design, in red/.test(await page.getByTestId("hd-layer-hint").innerText())) throw new Error("the layer hint");
    if ((await page.getByTestId("hd-col-personality").getAttribute("data-dim")) !== "1") throw new Error("the hidden layer's column did not dim");
    await page.getByTestId("hd-view-both").click();
    await page.waitForTimeout(200);
    if (!/^Both:/.test(await page.getByTestId("hd-layer-hint").innerText())) throw new Error("Both did not explain itself");
    await page.getByTestId("hd-view-design").click();
    await page.waitForTimeout(300);
    if (await page.getByTestId("hd-layer-hint").count()) throw new Error("the layer hint came back for a layer already explained");
    await page.getByTestId("hd-view-both").click();

    // The arrows of Variable, by the Sun and North Node rows, with their names.
    const arrows = await page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll("[data-testid^=hd-arrow-]")].map((a) => [a.getAttribute("data-testid").slice(9), `${a.getAttribute("data-dir")} ${a.getAttribute("title")}`])),
    );
    if (
      !/^left Determination: Appetite/.test(arrows.determination ?? "") ||
      !/^left Environment: Shores/.test(arrows.environment ?? "") ||
      !/^right Motivation: Innocence/.test(arrows.motivation ?? "") ||
      !/^right Perspective: Survival/.test(arrows.perspective ?? "")
    ) {
      throw new Error(`arrows ${JSON.stringify(arrows)}`);
    }
    await page.getByTestId("hd-row-personality-northnode").click();
    await page.mouse.move(2, 2);
    await page.locator('[data-testid=click-note] [data-section="variable"]').waitFor({ timeout: 8000 });
    if (!/Perspective · Survival/i.test(await page.locator('[data-testid=click-note] [data-section="variable"]').innerText())) throw new Error("the Personality Node's arrow in its reading");
    // The true node (Jovian Archive's): the Personality North Node in 31.3.
    if (!/31\.3/.test(await page.getByTestId("hd-row-personality-northnode").innerText())) throw new Error("the North Node row is not the true node's");
    // A column's header opens the reading on the two layers.
    await page.getByTestId("hd-col-head-design").click();
    await page.waitForTimeout(400);
    if (!/Personality and Design/.test(await page.getByTestId("click-note").innerText())) throw new Error("the layers reading");
    await page.getByTestId("hd-col-head-design").click();

    // The Table view: the 26 activations, then the defined channels.
    await page.getByTestId("view-table").click();
    await page.getByTestId("hd-acts").waitFor({ timeout: 8000 });
    const table = await page.evaluate(() => ({
      acts: document.querySelectorAll("[data-testid=hd-acts] tbody tr").length,
      channels: document.querySelectorAll("[data-testid=hd-channels] tbody tr").length,
      venus: document.querySelector("[data-testid=hd-act-personality-venus]")?.textContent ?? "",
    }));
    if (table.acts !== 26 || table.channels !== 4 || !/34/.test(table.venus)) throw new Error(`table ${JSON.stringify(table)}`);
    await page.getByTestId("hd-act-design-mars").click();
    await page.waitForTimeout(400);
    if (!/Design Mars 26\.6/.test(await page.getByTestId("click-note").innerText())) throw new Error("a table row's reading");
    await page.getByTestId("view-wheel").click();

    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("hd-1280 OK");
  } finally {
    await browser.close();
  }
}

/** Without a birth time: cast at noon, what could differ marked ~, no arrows. */
async function noTime() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(20000);
    const errors = watch(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ulune.hint.wheel.v1", "1");
      } catch {
        /* no storage: the hint shows, which the checks do not mind */
      }
    });
    await gotoApp(page, "/");
    await page.waitForSelector("#birth-date", { timeout: 20000 });
    await page.locator("#native-name").fill("No time");
    await page.locator("#birth-date").fill("01/01/2000");
    await page.getByTestId("time-unknown").check();
    await page.locator("#birth-place").fill("London");
    await page.locator("#birth-place-list [role=option]").first().waitFor({ timeout: 15000 });
    await page.locator("#birth-place").press("ArrowDown");
    await page.locator("#birth-place").press("Enter");
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    await goStudioPage(page, "design");
    await page.getByTestId("hd-unknown").waitFor({ timeout: 30000 });
    const marks = await page.evaluate(() => ({
      rows: [...document.querySelectorAll(".ulune-hd-row[data-uncertain]")].map((r) => r.getAttribute("data-act")),
      facts: [...document.querySelectorAll(".ulune-hd-fact[data-uncertain]")].map((r) => r.getAttribute("data-fact")),
      arrows: document.querySelectorAll("[data-testid^=hd-arrow-]").length,
      when: document.querySelector("[data-testid=hd-col-personality] .ulune-hd-col-when")?.textContent ?? "",
    }));
    if (!marks.rows.includes("act:personality:moon") || !marks.rows.includes("act:design:moon")) throw new Error(`rows ${JSON.stringify(marks)}`);
    if (marks.rows.includes("act:personality:pluto")) throw new Error("Pluto marked");
    if (!marks.facts.includes("profile") || marks.arrows !== 0 || /:/.test(marks.when)) throw new Error(`no time ${JSON.stringify(marks)}`);
    await page.getByTestId("hd-row-personality-moon").click();
    await page.locator('[data-testid=click-note] [data-section="unknown"]').waitFor({ timeout: 8000 });
    await page.screenshot({ path: join(SHOTS, "hd-no-time-1280.png") });
    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("hd-no-time OK");
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
    // Facts on two lines, the chart across the width, the columns under it.
    const stack = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return { zoom: r("[data-testid=hd-zoom]"), colD: r("[data-testid=hd-col-design]"), colP: r("[data-testid=hd-col-personality]") };
    });
    if (stack.zoom.width < 340 || stack.colD.top < stack.zoom.bottom || Math.abs(stack.colD.top - stack.colP.top) > 1 || stack.colP.left < stack.colD.right) {
      throw new Error(`phone layout ${JSON.stringify(stack)}`);
    }
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
    await page.waitForTimeout(600);
    // The chart left above the sheet is whole (the columns and facts wait).
    const half = await page.evaluate(() => {
      const z = document.querySelector("[data-testid=hd-zoom]").getBoundingClientRect();
      const sheet = document.querySelector(".ob-panel").getBoundingClientRect();
      const svg = document.querySelector("[data-testid=hd-graph]").getBoundingClientRect();
      return { zoomBottom: z.bottom, sheetTop: sheet.top, w: svg.width, cols: document.querySelector("[data-testid=hd-col-design]").getBoundingClientRect().height };
    });
    if (half.zoomBottom > half.sheetTop + 1 || half.w < 120 || half.cols !== 0) throw new Error(`the chart above the half sheet ${JSON.stringify(half)}`);
    await page.screenshot({ path: join(SHOTS, "hd-read-390.png") });
    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("hd-390 OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
await desktop();
await noTime();
await phone();
console.log("HD OK", DEV);
