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

await page.goto("http://127.0.0.1:8097/?studio=numerology", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.locator("#birth-date").waitFor({ timeout: 20000 });
await page.waitForTimeout(400);
const noNatal = page.getByTestId("studio-numerology-empty");
if (await noNatal.count()) {
  const copy = (await noNatal.innerText()).trim();
  if (copy !== "Cast a birth chart first.") fail.push(`no-natal copy: ${copy}`);
  if (await page.getByTestId("numerology-hello").count()) fail.push("no-natal showed Hello");
  if (await page.getByTestId("numerology-table").count()) fail.push("no-natal showed table");
  if (await page.getByTestId("numerology-ring").count()) fail.push("no-natal showed a ring of zeros");
  await noNatal.screenshot({ path: "/workspace/screenshots/numerology-empty.png" });
} else {
  fail.push("missing empty natal state");
}

await page.locator("#birth-date").fill("1990-06-15");
await page.locator("#birth-time").fill("14:30");
await page.locator("#birth-place").fill("48.8566, 2.3522");
await page.getByTestId("cast-submit").click();
await page.getByTestId("studio-numerology").waitFor({ timeout: 90000 });
await page.getByTestId("numerology-sky").waitFor({ timeout: 20000 });
await page.getByTestId("numerology-hello").waitFor({ timeout: 15000 });
await page.getByTestId("numerology-table").waitFor({ timeout: 15000 });

if (!/[?&]studio=numerology/.test(page.url())) fail.push("deep link studio=numerology did not survive");

const system = (await page.getByTestId("numerology-system").innerText()).trim();
if (system !== "Pythagorean") fail.push(`system label: ${system}`);

const core = (await page.getByTestId("numerology-core").innerText()).trim();
if (core !== "4") fail.push(`Life Path center: ${core}`);
const lifeDigit = page.getByTestId("numerology-digit-4");
if ((await lifeDigit.getAttribute("data-life")) !== "1") fail.push("Life Path digit 4 is not highlighted");

if (await page.locator("svg.ulune-wheel").count()) fail.push("numerology showed a wheel");
if (await page.locator('[data-fold="mixer"]').count()) fail.push("numerology showed Bodies mixer");

const emptyRead = (await page.getByTestId("click-reading-empty").innerText()).trim();
if (emptyRead !== "Click a number in the ring.") fail.push(`empty reading: ${emptyRead}`);

const lpLine = (await page.getByTestId("numerology-hello-lifepath").locator("[data-hello-copy]").innerText()).trim();
const exLine = (await page.getByTestId("numerology-hello-expression").locator("[data-hello-copy]").innerText()).trim();
const suLine = (await page.getByTestId("numerology-hello-soulurge").locator("[data-hello-copy]").innerText()).trim();
if (lpLine !== "From your full birth date: the main theme and lessons of your life.") fail.push(`hello lifepath: ${lpLine}`);
if (exLine !== "From your full birth name: your natural abilities and how you use them.") fail.push(`hello expression: ${exLine}`);
if (suLine !== "From the vowels of your name: what you want deep down.") fail.push(`hello soulurge: ${suLine}`);

const lpTitle = (await page.getByTestId("numerology-hello-lifepath").locator("[data-hello-title]").innerText()).trim();
const exTitle = (await page.getByTestId("numerology-hello-expression").locator("[data-hello-title]").innerText()).trim();
const suTitle = (await page.getByTestId("numerology-hello-soulurge").locator("[data-hello-title]").innerText()).trim();
if (lpTitle !== "4") fail.push(`hello lifepath title ${lpTitle}`);
if (exTitle !== "—") fail.push(`hello expression title ${exTitle} (name was invented)`);
if (suTitle !== "—") fail.push(`hello soulurge title ${suTitle} (name was invented)`);

const helloId = await page.getByTestId("numerology-hello").getAttribute("data-hello-id");
if (helloId !== "numerology.hello") fail.push(`hello id ${helloId}`);

for (const [testid, title] of [
  ["numerology-hello-lifepath", lpTitle],
  ["numerology-hello-expression", exTitle],
  ["numerology-hello-soulurge", suTitle],
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

const headers = (await page.locator("[data-testid='numerology-table'] thead th").allTextContents()).map((h) =>
  h.trim(),
);
if (headers.join("|") !== "Number|Digit|From") fail.push(`table headers: ${headers.join(" / ")}`);

const year = await page.evaluate(() => new Date().getFullYear());
const froms = await page.locator("[data-testid='numerology-table'] tbody [data-col='from']").allTextContents();
const fromList = froms.map((s) => s.trim());
if (fromList[0] !== "Birthday") fail.push(`from birthday: ${fromList[0]}`);
if (fromList[1] !== "Personality") fail.push(`from personality: ${fromList[1]}`);
if (fromList[2] !== "Maturity") fail.push(`from maturity: ${fromList[2]}`);
if (fromList[3] !== `Personal year (${year})`) fail.push(`from personal year: ${fromList[3]}`);

const bday = (await page.getByTestId("numerology-row-birthday").locator("[data-col='number']").innerText()).trim();
const bdayDigit = (await page.getByTestId("numerology-row-birthday").locator("[data-col='digit']").innerText()).trim();
if (bday !== "6") fail.push(`birthday number ${bday}`);
if (bdayDigit !== "6") fail.push(`birthday digit ${bdayDigit}`);

const pers = (await page.getByTestId("numerology-row-personality").locator("[data-col='number']").innerText()).trim();
const mat = (await page.getByTestId("numerology-row-maturity").locator("[data-col='number']").innerText()).trim();
if (pers !== "—") fail.push(`personality without name: ${pers}`);
if (mat !== "—") fail.push(`maturity without name: ${mat}`);

const pyear = (await page.getByTestId("numerology-row-personalYear").locator("[data-col='number']").innerText()).trim();
if (year === 2026 && pyear !== "4") fail.push(`personal year ${pyear} (expected 4 in 2026)`);

const layout = await page.evaluate(() => {
  const sky = document.querySelector("[data-testid='numerology-sky']");
  const hello = document.querySelector("[data-testid='numerology-hello']");
  const table = document.querySelector("[data-testid='numerology-table']");
  const tools = document.querySelector("[data-testid='cast-tools']");
  const ring = document.querySelector("[data-testid='numerology-ring']");
  const wheelSlot = document.querySelector("[data-testid='numerology-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='numerology-sky-read']");
  const tableEl = document.querySelector("[data-testid='numerology-table'] table");
  const mixer = document.querySelector("[data-fold='mixer']");
  const skyBox = sky?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const tableBox = table?.getBoundingClientRect();
  const toolsBox = tools?.getBoundingClientRect();
  const wheelBox = wheelSlot?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const pad = sky ? parseFloat(getComputedStyle(sky).paddingTop) : 0;
  return {
    gapSkyHello: helloBox && skyBox ? helloBox.top - skyBox.bottom : 0,
    gapHelloTable: tableBox && helloBox ? tableBox.top - helloBox.bottom : 0,
    toolsBelow: Boolean(toolsBox && tableBox && toolsBox.top >= tableBox.bottom - 2),
    table: Boolean(tableEl),
    ringInSky: Boolean(sky && ring && sky.contains(ring)),
    wheelPct: skyBox && wheelBox ? wheelBox.width / skyBox.width : 0,
    wheelMin: wheelBox?.width ?? 0,
    pad,
    readSticky: read ? getComputedStyle(read).position : "",
    mixer: Boolean(mixer),
    natalZeros: Boolean(document.querySelector("[data-testid='studio-numerology-empty']")),
    helloCells: hello ? hello.querySelectorAll(".ulune-hello-cell").length : 0,
    readRight: Boolean(wheelBox && readBox && readBox.left >= wheelBox.right - 8),
  };
});
if (Math.abs(layout.gapSkyHello - 16) > 3) fail.push(`band gap sky-hello ${layout.gapSkyHello}px`);
if (Math.abs(layout.gapHelloTable - 16) > 3) fail.push(`band gap hello-table ${layout.gapHelloTable}px`);
if (Math.abs(layout.pad - 24) > 1) fail.push(`sky pad ${layout.pad}px`);
if (!layout.toolsBelow) fail.push("Look is not below the table");
if (!layout.table) fail.push("table is not a <table>");
if (!layout.ringInSky) fail.push("ring is not in the sky slot");
if (layout.wheelPct < 0.5 || layout.wheelMin < 520) fail.push(`desktop ring slot ${layout.wheelPct} ${layout.wheelMin}`);
if (layout.readSticky !== "sticky") fail.push(`desktop reading not sticky (${layout.readSticky})`);
if (layout.mixer) fail.push("Bodies mixer present");
if (layout.natalZeros) fail.push("showed empty natal after a chart was cast");
if (layout.helloCells !== 3) fail.push(`hello cells ${layout.helloCells}`);
if (!layout.readRight) fail.push("desktop: reading is not beside the ring");

await page.getByTestId("numerology-digit-4").click();
await page.waitForTimeout(300);
const click = await page.locator("#click-reading").innerText();
if (click.length < 8) fail.push("click reading empty after ring tap");
if (!/4/.test(click)) fail.push(`ring 4 reading: ${click.slice(0, 80)}`);

await shot(page, "numerology-desktop");

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const mobileLayout = await page.evaluate(() => {
  const sky = document.querySelector("[data-testid='numerology-sky']");
  const ring = document.querySelector("[data-testid='numerology-ring']");
  const wheel = document.querySelector("[data-testid='numerology-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='numerology-sky-read']");
  const hello = document.querySelector("[data-testid='numerology-hello']");
  const table = document.querySelector("[data-testid='numerology-table'] table");
  const cards = document.querySelectorAll("[data-testid='numerology-table'] [data-card]");
  const skyBox = sky?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  const firstTh = document.querySelector("[data-testid='numerology-table'] thead th");
  const firstTd = document.querySelector("[data-testid='numerology-table'] tbody td");
  const cellEls = [...(hello?.querySelectorAll(".ulune-hello-cell") ?? [])];
  const cells = cellEls.map((el) => el.getBoundingClientRect());
  return {
    ringFull: Boolean(skyBox && wheelBox && wheelBox.width >= skyBox.width * 0.8),
    readUnder: Boolean(wheelBox && readBox && readBox.top >= wheelBox.bottom - 4),
    helloMin: cells.length ? Math.min(...cells.map((b) => b.height)) : 0,
    helloStacked: Boolean(cells[1] && cells[0] && cells[1].top >= cells[0].bottom - 2),
    table: Boolean(table),
    cards: cards.length,
    overflow,
    freeze: firstTd ? getComputedStyle(firstTd).position : "",
    headSticky: firstTh ? getComputedStyle(firstTh).position : "",
    ring: Boolean(ring),
  };
});
console.log("MOBILE_LAYOUT", mobileLayout);
if (!mobileLayout.ring) fail.push("mobile missing ring");
if (!mobileLayout.ringFull) fail.push("mobile ring is not full width");
if (!mobileLayout.readUnder) fail.push("mobile: reading is not under the ring");
if (mobileLayout.helloMin < 44) fail.push(`mobile hello cell ${mobileLayout.helloMin}`);
if (!mobileLayout.helloStacked) fail.push("mobile hello is not stacked");
if (!mobileLayout.table) fail.push("mobile table is not a <table>");
if (mobileLayout.cards) fail.push("mobile used cards instead of freeze-column table");
if (mobileLayout.overflow > 8) fail.push(`mobile overflow ${mobileLayout.overflow}`);
if (mobileLayout.freeze !== "sticky") fail.push(`mobile first column not frozen (${mobileLayout.freeze})`);

await shot(page, "numerology-mobile");

await page.close();
await browser.close();

if (errors.length) fail.push(...errors.slice(0, 8));
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
