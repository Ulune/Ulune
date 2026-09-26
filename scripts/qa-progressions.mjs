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

await page.goto("http://127.0.0.1:8097/?studio=progressions", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(500);
const noNatal = page.getByTestId("studio-progressions-empty");
if (await noNatal.count()) {
  const copy = (await noNatal.innerText()).trim();
  if (copy !== "Cast a birth chart first.") fail.push(`no-natal copy: ${copy}`);
  await noNatal.screenshot({ path: "/workspace/screenshots/progressions-empty.png" });
} else {
  fail.push("missing empty natal state");
}

await page.locator("#native-name").fill("Progressions QA");
await page.locator("#birth-date").fill("1990-06-15");
await page.locator("#birth-time").fill("14:30");
await page.locator("#birth-place").fill("48.8566, 2.3522");
await page.getByTestId("cast-submit").click();
await page.getByTestId("studio-progressions").waitFor({ timeout: 45000 });
await page.getByTestId("progressions-sky").waitFor({ timeout: 20000 });
await page.getByTestId("progressions-hello").waitFor({ timeout: 25000 });
await page.getByTestId("progressions-table").waitFor({ timeout: 15000 });

await page.getByTestId("progressions-date").fill("2026-08-27");
await page.getByTestId("progressions-date").blur();
await page.waitForTimeout(1600);

if (!/[?&]studio=progressions/.test(page.url())) fail.push("deep link studio=progressions did not survive");

const today = (await page.getByTestId("progressions-today").innerText()).trim();
if (today !== "Today") fail.push(`clock button: ${today}`);

const method = (await page.getByTestId("progressions-method").innerText()).trim();
if (method !== "Secondary · day for a year") fail.push(`method label: ${method}`);

try {
  await page.getByTestId("progressed-ring").waitFor({ timeout: 25000 });
} catch {
  fail.push("progressed outer ring did not appear");
}

const emptyRead = (await page.getByTestId("click-reading-empty").innerText()).trim();
if (emptyRead !== "Click a body or an aspect in the wheel.") fail.push(`empty reading: ${emptyRead}`);

const sunLine = (await page.getByTestId("progressions-hello-sun").locator("[data-hello-copy]").innerText()).trim();
const moonLine = (await page.getByTestId("progressions-hello-moon").locator("[data-hello-copy]").innerText()).trim();
const ascLine = (await page.getByTestId("progressions-hello-asc").locator("[data-hello-copy]").innerText()).trim();
if (sunLine !== "Your core identity: what you are aiming to become and where you want to shine.") fail.push(`hello sun: ${sunLine}`);
if (moonLine !== "Your emotional needs: what makes you feel safe and how you react under stress.") fail.push(`hello moon: ${moonLine}`);
if (ascLine !== "Your rising sign: how you come across and how you approach anything new.") fail.push(`hello asc: ${ascLine}`);

const helloId = await page.getByTestId("progressions-hello").getAttribute("data-hello-id");
if (helloId !== "natal.hello") fail.push(`hello id ${helloId}`);

for (const [testid, title] of [
  ["progressions-hello-sun", "Sun"],
  ["progressions-hello-moon", "Moon"],
  ["progressions-hello-asc", "Ascendant"],
]) {
  const root = page.getByTestId(testid);
  const type = await root.evaluate((el) => {
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

const headers = (await page.locator("[data-testid='progressions-table'] thead th").allTextContents()).map((h) =>
  h.trim(),
);
if (headers.join("|") !== "Progressed|Aspect|Natal|A|S|Exact") {
  fail.push(`table headers: ${headers.join(" / ")}`);
}

const moonSat = page.getByTestId("progression-row-pmoon_opposition_saturn");
if (!(await moonSat.count())) fail.push("missing pMoon opposition natal Saturn row");
else {
  const aText = (await moonSat.locator("[data-col='a']").innerText()).trim();
  const exact = (await moonSat.locator("[data-exact]").innerText()).trim();
  if (aText !== "A") fail.push(`pMoon opposition Saturn applying: ${aText}`);
  if (!exact || exact === "—") fail.push("pMoon opposition Saturn missing Exact");
}

const layout = await page.evaluate(() => {
  const sky = document.querySelector("[data-testid='progressions-sky']");
  const clock = document.querySelector("[data-testid='progressions-clock']");
  const bar = document.querySelector(".ulune-progressions-clock-bar");
  const hello = document.querySelector("[data-testid='progressions-hello']");
  const table = document.querySelector("[data-testid='progressions-table']");
  const tools = document.querySelector("[data-testid='cast-tools']");
  const wheel = document.querySelector("[data-testid='progressions-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='progressions-sky-read']");
  const tableEl = document.querySelector("[data-testid='progressions-table'] table");
  const skyBox = sky?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const tableBox = table?.getBoundingClientRect();
  const toolsBox = tools?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const clockBox = clock?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const pad = sky ? parseFloat(getComputedStyle(sky).paddingTop) : 0;
  return {
    inside: Boolean(sky && clock && sky.contains(clock)),
    clockH: bar?.getBoundingClientRect().height ?? 0,
    gapSkyHello: helloBox && skyBox ? helloBox.top - skyBox.bottom : 0,
    gapHelloTable: tableBox && helloBox ? tableBox.top - helloBox.bottom : 0,
    toolsBelow: Boolean(toolsBox && tableBox && toolsBox.top >= tableBox.bottom - 2),
    table: Boolean(tableEl),
    wheelPct: skyBox && wheelBox ? wheelBox.width / skyBox.width : 0,
    wheelMin: wheelBox?.width ?? 0,
    pad,
    clockOverWheel:
      clockBox && wheelBox ? clockBox.bottom <= wheelBox.top + 4 && clockBox.left < wheelBox.right - 40 : false,
    readSticky: read ? getComputedStyle(read.parentElement).position : "",
    natalZeros: Boolean(document.querySelector("[data-testid='studio-progressions-empty']")),
  };
});
if (!layout.inside) fail.push("date clock is not inside Sky");
if (Math.abs(layout.clockH - 44) > 2) fail.push(`clock height ${layout.clockH}`);
if (Math.abs(layout.gapSkyHello - 16) > 3) fail.push(`band gap sky-hello ${layout.gapSkyHello}px`);
if (Math.abs(layout.gapHelloTable - 16) > 3) fail.push(`band gap hello-table ${layout.gapHelloTable}px`);
if (Math.abs(layout.pad - 24) > 1) fail.push(`sky pad ${layout.pad}px`);
if (!layout.toolsBelow) fail.push("Bodies/Look are not below the table");
if (!layout.table) fail.push("table is not a <table>");
if (layout.wheelPct < 0.5 || layout.wheelMin < 520) fail.push(`desktop wheel ${layout.wheelPct} ${layout.wheelMin}`);
if (layout.clockOverWheel) fail.push("desktop: date sits above the wheel");
if (layout.natalZeros) fail.push("showed empty natal after a chart was cast");

await page.getByTestId("progressions-hello-sun").click();
await page.waitForTimeout(400);
const click = await page.locator("#click-reading").innerText();
if (click.length < 8) fail.push("click reading empty after Hello Sun tap");
if (!/Progressed Sun|Sun progressé/i.test(click)) fail.push(`hello sun reading: ${click.slice(0, 80)}`);

await shot(page, "progressions-desktop");

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const mobileLayout = await page.evaluate(() => {
  const nav = document.querySelector("[data-testid='studio-nav']");
  const clock = document.querySelector("[data-testid='progressions-clock']");
  const scrub = document.querySelector("[data-testid='progressions-scrubber']");
  const wheel = document.querySelector("[data-testid='progressions-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='progressions-sky-read']");
  const hello = document.querySelector("[data-testid='progressions-hello']");
  const table = document.querySelector("[data-testid='progressions-table'] table");
  const cards = document.querySelectorAll("[data-testid='progressions-table'] [data-card]");
  const navBox = nav?.getBoundingClientRect();
  const clockBox = clock?.getBoundingClientRect();
  const scrubBox = scrub?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  const sticky = clock ? getComputedStyle(clock).position : "";
  const firstTh = document.querySelector("[data-testid='progressions-table'] thead th");
  const firstTd = document.querySelector("[data-testid='progressions-table'] tbody td");
  const bar = document.querySelector(".ulune-progressions-clock-bar");
  return {
    clockUnderNav: Boolean(navBox && clockBox && clockBox.top >= navBox.bottom - 2),
    scrubAfterClock: Boolean(clockBox && scrubBox && scrubBox.top >= clockBox.bottom - 2),
    wheelAfterScrub: Boolean(scrubBox && wheelBox && wheelBox.top >= scrubBox.bottom - 2),
    readAfterWheel: Boolean(wheelBox && readBox && readBox.top >= wheelBox.bottom - 2),
    clockH: clockBox?.height ?? 0,
    barH: bar?.getBoundingClientRect().height ?? 0,
    helloMin: helloBox ? helloBox.height / 3 : 0,
    table: Boolean(table),
    cards: cards.length,
    overflow,
    sticky,
    freeze: firstTd ? getComputedStyle(firstTd).position : "",
    headSticky: firstTh ? getComputedStyle(firstTh).position : "",
  };
});
console.log("MOBILE_LAYOUT", mobileLayout);
if (!mobileLayout.clockUnderNav) fail.push("mobile: date is not under studio tabs");
if (!mobileLayout.scrubAfterClock) fail.push("mobile: slider is not under the date");
if (!mobileLayout.wheelAfterScrub) fail.push("mobile: wheel is not under the slider");
if (!mobileLayout.readAfterWheel) fail.push("mobile: reading is not under the wheel");
if (Math.abs(mobileLayout.clockH - 44) > 2) fail.push(`mobile date height ${mobileLayout.clockH}`);
if (Math.abs(mobileLayout.barH - 44) > 2) fail.push(`mobile date bar ${mobileLayout.barH}`);
if (mobileLayout.helloMin < 44) fail.push(`mobile hello cell ${mobileLayout.helloMin}`);
if (!mobileLayout.table) fail.push("mobile table is not a <table>");
if (mobileLayout.cards) fail.push("mobile used cards instead of freeze-column table");
if (mobileLayout.overflow > 8) fail.push(`mobile overflow ${mobileLayout.overflow}`);
if (mobileLayout.sticky !== "sticky") fail.push(`mobile date not sticky (${mobileLayout.sticky})`);
if (mobileLayout.freeze !== "sticky") fail.push(`mobile first column not frozen (${mobileLayout.freeze})`);

await shot(page, "progressions-mobile");

await page.evaluate(() => window.scrollTo(0, 420));
await page.waitForTimeout(200);
const sticky = await page.evaluate(() => {
  const header = document.querySelector("header");
  const nav = document.querySelector("[data-testid='studio-nav']");
  const clock = document.querySelector("[data-testid='progressions-clock']");
  if (!header || !nav || !clock) return { overlapHeader: true, overlapNav: true };
  const h = header.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  const c = clock.getBoundingClientRect();
  return {
    overlapHeader: c.top < h.bottom - 2,
    overlapNav: n.bottom > 0 && c.top < n.bottom - 2,
    clockH: c.height,
  };
});
if (sticky.overlapHeader) fail.push("phone sticky date overlaps the header");
if (sticky.overlapNav) fail.push("phone sticky date overlaps the tabs");
await page.screenshot({ path: "/workspace/screenshots/progressions-mobile-sticky.png" });

await page.close();
await browser.close();

if (errors.length) fail.push(...errors.slice(0, 8));
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
