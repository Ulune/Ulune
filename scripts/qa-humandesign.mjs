import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });

const errors = [];
const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: true });
}

function track(page) {
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console: " + msg.text());
  });
}

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
track(page);
await page.addInitScript(() => {
  try {
    localStorage.setItem("ulune.locale", "en");
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.studio.page");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/?studio=design", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.locator("#birth-date").waitFor({ timeout: 20000 });
await page.waitForTimeout(400);

const noNatal = page.getByTestId("studio-humandesign-empty");
if (await noNatal.count()) {
  const copy = (await noNatal.innerText()).trim();
  if (copy !== "Cast a birth chart first.") fail.push(`no-natal copy: ${copy}`);
  if (await page.getByTestId("hd-hello").count()) fail.push("no-natal showed Hello");
  if (await page.getByTestId("hd-table").count()) fail.push("no-natal showed table");
  if (await page.getByTestId("hd-graph").count()) fail.push("no-natal showed an empty bodygraph");
  await noNatal.screenshot({ path: "/workspace/screenshots/humandesign-empty.png" });
} else {
  fail.push("missing empty natal state");
}

await page.locator("#birth-date").fill("1990-06-15");
await page.locator("#birth-time").fill("14:30");
await page.locator("#birth-place").fill("48.8566, 2.3522");
await page.getByTestId("cast-submit").click();
await page.getByTestId("studio-humandesign").waitFor({ timeout: 90000 });
await page.getByTestId("hd-sky").waitFor({ timeout: 20000 });
await page.getByTestId("hd-hello").waitFor({ timeout: 15000 });
await page.getByTestId("hd-table").waitFor({ timeout: 15000 });

if (!/[?&]studio=design/.test(page.url())) fail.push("deep link studio=design did not survive");

if (await page.locator("svg.ulune-wheel").count()) fail.push("human design showed a natal wheel");
if (await page.locator('[data-fold="mixer"]').count()) fail.push("human design showed Bodies mixer");

const bothPressed = await page.getByTestId("hd-view-both").getAttribute("aria-pressed");
if (bothPressed !== "true") fail.push(`default view is not Both (${bothPressed})`);

const caption = (await page.getByTestId("hd-caption").innerText()).trim();
if (caption !== "2/4 · Single") fail.push(`caption: ${caption}`);

const emptyRead = (await page.getByTestId("click-reading-empty").innerText()).trim();
if (emptyRead !== "Tap a channel, a gate, or a centre.") fail.push(`empty reading: ${emptyRead}`);

const typeLine = (await page.getByTestId("hd-hello-type").locator("[data-hello-copy]").innerText()).trim();
const stratLine = (await page.getByTestId("hd-hello-strategy").locator("[data-hello-copy]").innerText()).trim();
const authLine = (await page.getByTestId("hd-hello-authority").locator("[data-hello-copy]").innerText()).trim();
if (typeLine !== "Your energy type: how you are built to use energy and meet other people.") fail.push(`hello type: ${typeLine}`);
if (stratLine !== "The way of engaging with opportunities that works best for your type.") fail.push(`hello strategy: ${stratLine}`);
if (authLine !== "The inner signal Human Design says you can trust when deciding.") fail.push(`hello authority: ${authLine}`);

const typeTitle = (await page.getByTestId("hd-hello-type").locator("[data-hello-title]").innerText()).trim();
const stratTitle = (await page.getByTestId("hd-hello-strategy").locator("[data-hello-title]").innerText()).trim();
const authTitle = (await page.getByTestId("hd-hello-authority").locator("[data-hello-title]").innerText()).trim();
if (typeTitle !== "Manifesting Generator") fail.push(`hello type title ${typeTitle}`);
if (stratTitle !== "Wait to respond") fail.push(`hello strategy title ${stratTitle}`);
if (authTitle !== "Sacral") fail.push(`hello authority title ${authTitle}`);

const helloId = await page.getByTestId("hd-hello").getAttribute("data-hello-id");
if (helloId !== "hd.hello") fail.push(`hello id ${helloId}`);

for (const [testid, title] of [
  ["hd-hello-type", typeTitle],
  ["hd-hello-strategy", stratTitle],
  ["hd-hello-authority", authTitle],
]) {
  const type = await page.getByTestId(testid).evaluate((el) => {
    const label = el.querySelector("[data-hello-label]");
    const word = el.querySelector("[data-hello-title]");
    const copy = el.querySelector("[data-hello-copy]");
    const ls = label ? getComputedStyle(label) : null;
    const ts = word ? getComputedStyle(word) : null;
    const cs = copy ? getComputedStyle(copy) : null;
    return {
      labelFamily: ls?.fontFamily ?? "",
      labelSize: ls?.fontSize ?? "",
      titleFamily: ts?.fontFamily ?? "",
      titleSize: ts?.fontSize ?? "",
      title: (word?.textContent || "").trim(),
      copyFamily: cs?.fontFamily ?? "",
      copySize: cs ? parseFloat(cs.fontSize) : 0,
      minH: el.getBoundingClientRect().height,
    };
  });
  if (type.title !== title) fail.push(`${testid} title “${type.title}”`);
  const roles = await page.evaluate(() => {
    const first = (v) => v.replace(/['"]/g, "").split(",")[0].trim();
    const cs = getComputedStyle(document.documentElement);
    return {
      display: first(cs.getPropertyValue("--font-display")),
      sans: first(cs.getPropertyValue("--font-sans")),
    };
  });
  const hasFace = (fam, face) => new RegExp(face.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(fam);
  if (!hasFace(type.labelFamily, roles.sans)) fail.push(`${testid} label not body (${type.labelFamily})`);
  if (type.labelSize !== "12px") fail.push(`${testid} label size ${type.labelSize}`);
  if (!hasFace(type.titleFamily, roles.display)) fail.push(`${testid} title not display (${type.titleFamily})`);
  if (type.titleSize !== "20px") fail.push(`${testid} title size ${type.titleSize}`);
  if (!hasFace(type.copyFamily, roles.sans)) fail.push(`${testid} sentence not body (${type.copyFamily})`);
  if (type.copySize < 15.5 || type.copySize > 18.5) fail.push(`${testid} sentence size ${type.copySize}px`);
}

const headers = (await page.locator("[data-testid='hd-table'] thead th").allTextContents()).map((h) => h.trim());
if (headers.join("|") !== "Channel|Gates|Centers") fail.push(`table headers: ${headers.join(" / ")}`);

const rowA = page.getByTestId("hd-row-33-13");
const rowB = page.getByTestId("hd-row-2-14");
if ((await rowA.count()) !== 1) fail.push("missing channel 33–13");
if ((await rowB.count()) !== 1) fail.push("missing channel 2–14");
if ((await page.getByTestId("hd-table-empty").count()) !== 0) fail.push("Both view showed empty channels");

const controlH = await page.getByTestId("hd-control").evaluate((el) => el.getBoundingClientRect().height);
if (Math.abs(controlH - 44) > 2) fail.push(`control height ${controlH}px`);

const layout = await page.evaluate(() => {
  const sky = document.querySelector("[data-testid='hd-sky']");
  const hello = document.querySelector("[data-testid='hd-hello']");
  const table = document.querySelector("[data-testid='hd-table']");
  const tools = document.querySelector("[data-testid='cast-tools']");
  const graph = document.querySelector("[data-testid='hd-graph']");
  const wheelSlot = document.querySelector("[data-testid='hd-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='hd-sky-read']");
  const control = document.querySelector("[data-testid='hd-control']");
  const tableEl = document.querySelector("[data-testid='hd-table'] table");
  const mixer = document.querySelector("[data-fold='mixer']");
  const skyBox = sky?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const tableBox = table?.getBoundingClientRect();
  const toolsBox = tools?.getBoundingClientRect();
  const wheelBox = wheelSlot?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const controlBox = control?.getBoundingClientRect();
  const pad = sky ? parseFloat(getComputedStyle(sky).paddingTop) : 0;
  return {
    gapSkyHello: helloBox && skyBox ? helloBox.top - skyBox.bottom : 0,
    gapHelloTable: tableBox && helloBox ? tableBox.top - helloBox.bottom : 0,
    toolsBelow: Boolean(toolsBox && tableBox && toolsBox.top >= tableBox.bottom - 2),
    table: Boolean(tableEl),
    graphInSky: Boolean(sky && graph && sky.contains(graph)),
    controlInSky: Boolean(sky && control && sky.contains(control)),
    controlH: controlBox?.height ?? 0,
    wheelPct: skyBox && wheelBox ? wheelBox.width / skyBox.width : 0,
    wheelMin: wheelBox?.width ?? 0,
    pad,
    readSticky: read ? getComputedStyle(read).position : "",
    mixer: Boolean(mixer),
    natalEmpty: Boolean(document.querySelector("[data-testid='studio-humandesign-empty']")),
    helloCells: hello ? hello.querySelectorAll(".ulune-hello-cell").length : 0,
    readRight: Boolean(wheelBox && readBox && readBox.left >= wheelBox.right - 8),
  };
});
if (Math.abs(layout.gapSkyHello - 16) > 3) fail.push(`band gap sky-hello ${layout.gapSkyHello}px`);
if (Math.abs(layout.gapHelloTable - 16) > 3) fail.push(`band gap hello-table ${layout.gapHelloTable}px`);
if (Math.abs(layout.pad - 24) > 1) fail.push(`sky pad ${layout.pad}px`);
if (!layout.toolsBelow) fail.push("Look is not below the table");
if (!layout.table) fail.push("table is not a <table>");
if (!layout.graphInSky) fail.push("bodygraph is not in the sky slot");
if (!layout.controlInSky) fail.push("44px control is not in the sky");
if (Math.abs(layout.controlH - 44) > 2) fail.push(`desktop control ${layout.controlH}px`);
if (layout.wheelPct < 0.5 || layout.wheelMin < 520) fail.push(`desktop bodygraph slot ${layout.wheelPct} ${layout.wheelMin}`);
if (layout.readSticky !== "sticky") fail.push(`desktop reading not sticky (${layout.readSticky})`);
if (layout.mixer) fail.push("Bodies mixer present");
if (layout.natalEmpty) fail.push("showed empty natal after a chart was cast");
if (layout.helloCells !== 3) fail.push(`hello cells ${layout.helloCells}`);
if (!layout.readRight) fail.push("desktop: reading is not beside the bodygraph");

await page.getByTestId("hd-channel-33-13").click();
await page.waitForTimeout(250);
const clickChannel = await page.locator("#click-reading").innerText();
if (!/33–13/.test(clickChannel)) fail.push(`channel reading: ${clickChannel.slice(0, 80)}`);

await page.getByTestId("hd-gate-12").click();
await page.waitForTimeout(250);
const clickGate = await page.locator("#click-reading").innerText();
if (!/Gate 12/.test(clickGate)) fail.push(`gate reading: ${clickGate.slice(0, 80)}`);

await page.getByTestId("hd-center-sacral").click();
await page.waitForTimeout(250);
const clickCenter = await page.locator("#click-reading").innerText();
if (!/Sacral/.test(clickCenter)) fail.push(`center reading: ${clickCenter.slice(0, 80)}`);

await page.getByTestId("hd-view-personality").click();
await page.waitForTimeout(300);
if ((await page.getByTestId("hd-view-personality").getAttribute("aria-pressed")) !== "true") {
  fail.push("Personality toggle did not stick");
}
if ((await page.getByTestId("hd-table-empty").count()) !== 1) fail.push("Personality view still shows defined channels");
const persEmpty = (await page.getByTestId("hd-table-empty").innerText()).trim();
if (!/No defined channels/.test(persEmpty)) fail.push(`personality empty: ${persEmpty}`);
if ((await page.getByTestId("hd-gate-12").getAttribute("data-tone")) !== "personality") {
  fail.push("Personality Sun gate 12 is not marked personality");
}
if ((await page.getByTestId("hd-gate-14").getAttribute("data-tone")) !== "off") {
  fail.push("Design-only gate 14 still lit on Personality");
}

await page.getByTestId("hd-view-design").click();
await page.waitForTimeout(300);
if ((await page.getByTestId("hd-table-empty").count()) !== 1) fail.push("Design view still shows defined channels");
if ((await page.getByTestId("hd-gate-14").getAttribute("data-tone")) !== "design") {
  fail.push("Design Moon gate 14 is not marked design");
}
if ((await page.getByTestId("hd-gate-12").getAttribute("data-tone")) !== "off") {
  fail.push("Personality-only gate 12 still lit on Design");
}

await page.getByTestId("hd-view-both").click();
await page.waitForTimeout(300);
if ((await page.getByTestId("hd-row-33-13").count()) !== 1) fail.push("Both view lost channel 33–13");
if ((await page.getByTestId("hd-row-2-14").count()) !== 1) fail.push("Both view lost channel 2–14");

await shot(page, "humandesign-desktop");

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const mobileLayout = await page.evaluate(() => {
  const sky = document.querySelector("[data-testid='hd-sky']");
  const graph = document.querySelector("[data-testid='hd-graph']");
  const wheel = document.querySelector("[data-testid='hd-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='hd-sky-read']");
  const control = document.querySelector("[data-testid='hd-control']");
  const hello = document.querySelector("[data-testid='hd-hello']");
  const table = document.querySelector("[data-testid='hd-table'] table");
  const cards = document.querySelectorAll("[data-testid='hd-table'] [data-card]");
  const skyBox = sky?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const controlBox = control?.getBoundingClientRect();
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  const firstTh = document.querySelector("[data-testid='hd-table'] thead th");
  const firstTd = document.querySelector("[data-testid='hd-table'] tbody td");
  const cellEls = [...(hello?.querySelectorAll(".ulune-hello-cell") ?? [])];
  const cells = cellEls.map((el) => el.getBoundingClientRect());
  return {
    graphFull: Boolean(skyBox && wheelBox && wheelBox.width >= skyBox.width * 0.8),
    readUnder: Boolean(wheelBox && readBox && readBox.top >= wheelBox.bottom - 4),
    controlH: controlBox?.height ?? 0,
    controlSticky: control ? getComputedStyle(control).position : "",
    helloMin: cells.length ? Math.min(...cells.map((b) => b.height)) : 0,
    helloStacked: Boolean(cells[1] && cells[0] && cells[1].top >= cells[0].bottom - 2),
    table: Boolean(table),
    cards: cards.length,
    overflow,
    freeze: firstTd ? getComputedStyle(firstTd).position : "",
    headSticky: firstTh ? getComputedStyle(firstTh).position : "",
    graph: Boolean(graph),
  };
});
console.log("MOBILE_LAYOUT", mobileLayout);
if (!mobileLayout.graph) fail.push("mobile missing bodygraph");
if (!mobileLayout.graphFull) fail.push("mobile bodygraph is not full width");
if (!mobileLayout.readUnder) fail.push("mobile: reading is not under the bodygraph");
if (Math.abs(mobileLayout.controlH - 44) > 2) fail.push(`mobile control ${mobileLayout.controlH}px`);
if (mobileLayout.helloMin < 44) fail.push(`mobile hello cell ${mobileLayout.helloMin}`);
if (!mobileLayout.helloStacked) fail.push("mobile hello is not stacked");
if (!mobileLayout.table) fail.push("mobile table is not a <table>");
if (mobileLayout.cards) fail.push("mobile used cards instead of freeze-column table");
if (mobileLayout.overflow > 8) fail.push(`mobile overflow ${mobileLayout.overflow}`);
if (mobileLayout.freeze !== "sticky") fail.push(`mobile first column not frozen (${mobileLayout.freeze})`);

await shot(page, "humandesign-mobile");

await page.close();
await browser.close();

if (errors.length) fail.push(...errors.slice(0, 8));
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
