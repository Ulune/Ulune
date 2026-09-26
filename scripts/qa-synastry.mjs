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

async function castPerson(page, name, time) {
  const newBtn = page.getByTestId("new-chart");
  if (await newBtn.count()) await newBtn.click();
  await page.locator("#native-name").fill(name);
  await page.locator("#birth-date").fill("1990-06-15");
  await page.locator("#birth-time").fill(time);
  await page.locator("#birth-place").fill("48.8566, 2.3522");
  await page.locator("#birth-place").blur();
  await page.getByTestId("cast-submit").click();
  await page
    .locator("[data-testid='studio-natal'], [data-testid='studio-synastry']")
    .first()
    .waitFor({ timeout: 45000 });
}

const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
desktop.on("pageerror", (err) => errors.push(String(err)));
desktop.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});

await desktop.goto("http://127.0.0.1:8097/?studio=synastry", { waitUntil: "networkidle", timeout: 45000 });
await desktop.getByTestId("studio-page-synastry").waitFor({ timeout: 15000 });

const noNatal = desktop.getByTestId("studio-synastry-empty");
if (await noNatal.count()) {
  const copy = (await noNatal.innerText()).trim();
  if (!copy.includes("Cast a birth chart first.")) fail.push(`no-natal copy: ${copy}`);
}

await castPerson(desktop, "Person A", "14:30");
await desktop.getByTestId("studio-page-synastry").click();
await desktop.getByTestId("studio-synastry").waitFor({ timeout: 15000 });
await desktop.getByTestId("synastry-add-second").waitFor({ timeout: 5000 });

const oneCopy = (await desktop.getByTestId("synastry-need-second").innerText()).trim();
if (oneCopy !== "Add a second person.") fail.push(`one-chart copy: ${oneCopy}`);
if (await desktop.getByTestId("synastry-hello").count()) fail.push("Hello-meeting shown with one chart");
if (await desktop.getByTestId("synastry-table").count()) fail.push("table shown with one chart");
const onePage = (await desktop.getByTestId("studio-synastry").innerText()).replace(/\s+/g, " ");
if (onePage.includes("No major aspect between these two charts")) {
  fail.push("one-chart showed table empty copy");
}
if (onePage.includes("No major aspect between the two Suns") || onePage.includes("No major aspect between the two Moons")) {
  fail.push("one-chart showed Hello empty copy");
}

const emptyRead = (await desktop.getByTestId("click-reading-empty").innerText()).trim();
if (emptyRead !== "Click a body or an aspect in the wheel.") fail.push(`empty reading: ${emptyRead}`);

await desktop.getByTestId("synastry-add-second-wheel").click();
await castPerson(desktop, "Person B", "12:00");
await desktop.getByTestId("studio-page-synastry").click();
await desktop.getByTestId("synastry-ring").waitFor({ timeout: 20000 });
await desktop.getByTestId("synastry-hello").waitFor({ timeout: 10000 });
await desktop.getByTestId("synastry-table").waitFor({ timeout: 10000 });

const natalHello = await desktop.locator("[data-natal-hello]").count();
if (natalHello) fail.push("synastry cloned natal Hello");

const transitsHello = await desktop.getByTestId("transits-hello").count();
if (transitsHello) fail.push("synastry showed Hello-now");

const sunLine = (await desktop.getByTestId("synastry-hello-sun").locator("[data-hello-copy]").innerText()).trim();
const moonLine = (await desktop.getByTestId("synastry-hello-moon").locator("[data-hello-copy]").innerText()).trim();
const ascLine = (await desktop.getByTestId("synastry-hello-asc").locator("[data-hello-copy]").innerText()).trim();
if (!/^Conjunction · \d+\.\d+°\.$/.test(sunLine)) fail.push(`hello sun: ${sunLine}`);
if (!/^Conjunction · \d+\.\d+°\.$/.test(moonLine)) fail.push(`hello moon: ${moonLine}`);
if (ascLine !== "No major aspect between the two Ascendants.") fail.push(`hello asc: ${ascLine}`);

for (const [testid, title] of [
  ["synastry-hello-sun", "Sun"],
  ["synastry-hello-moon", "Moon"],
  ["synastry-hello-asc", "Ascendant"],
]) {
  const root = desktop.getByTestId(testid);
  if ((await root.locator("[data-hello-label]").count()) !== 1) fail.push(`${testid} missing 12px label`);
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
      copyLh: cs && cs.fontSize ? parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) : 0,
    };
  });
  if (type.title !== title) fail.push(`${testid} title “${type.title}”`);
  const roles = await desktop.evaluate(() => {
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
  if (Math.abs(type.copyLh - 1.45) > 0.06) fail.push(`${testid} sentence line-height ${type.copyLh.toFixed(3)}`);
}

const sunRow = desktop.getByTestId("synastry-row-ssun_conjunction_sun");
const moonRow = desktop.getByTestId("synastry-row-smoon_conjunction_moon");
if (!(await sunRow.count())) fail.push("missing Sun–Sun table row");
if (!(await moonRow.count())) fail.push("missing Moon–Moon table row");
if (await desktop.getByTestId("synastry-row-sascendant_opposition_ascendant").count()) {
  fail.push("Asc–Asc opposition is not Swiss for this pair");
}

const helloSunOrb = await desktop.getByTestId("synastry-hello-sun").getAttribute("data-orb");
const tableSunOrb = await sunRow.getAttribute("data-orb");
if (helloSunOrb && tableSunOrb && helloSunOrb !== tableSunOrb) {
  fail.push(`Sun–Sun hello orb ${helloSunOrb} != table ${tableSunOrb}`);
}

const cols = await desktop.evaluate(() =>
  [...document.querySelectorAll("[data-testid='synastry-table-cols'] th")].map((th) => th.getAttribute("data-col")),
);
if (JSON.stringify(cols) !== JSON.stringify(["a", "aspect", "b", "orb", "as-a", "as-s"])) {
  fail.push(`table cols: ${cols}`);
}

const headers = (await desktop.locator("[data-testid='synastry-table'] thead th").allTextContents()).map((h) =>
  h.trim(),
);
if (headers[1] !== "Aspect" || headers[3] !== "Orb" || headers[4] !== "A" || headers[5] !== "S") {
  fail.push(`table headers: ${headers.join(" / ")}`);
}

const layout = await desktop.evaluate(() => {
  const sky = document.querySelector("[data-testid='synastry-sky']");
  const pair = document.querySelector("[data-testid='synastry-pair']");
  const hello = document.querySelector("[data-testid='synastry-hello']");
  const table = document.querySelector("[data-testid='synastry-table']");
  const tools = document.querySelector("[data-testid='cast-tools']");
  const wheel = document.querySelector("[data-testid='synastry-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='synastry-sky-read']");
  const tableEl = document.querySelector("[data-testid='synastry-table'] table");
  const skyBox = sky?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const tableBox = table?.getBoundingClientRect();
  const toolsBox = tools?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const pairBox = pair?.getBoundingClientRect();
  return {
    inside: Boolean(sky && pair && sky.contains(pair)),
    pairH: document.querySelector(".ulune-synastry-pair-bar")?.getBoundingClientRect().height ?? 0,
    gapSkyHello: helloBox && skyBox ? helloBox.top - skyBox.bottom : 0,
    gapHelloTable: tableBox && helloBox ? tableBox.top - helloBox.bottom : 0,
    toolsBelow: Boolean(toolsBox && tableBox && toolsBox.top >= tableBox.bottom - 2),
    table: Boolean(tableEl),
    wheelPct: skyBox && wheelBox ? wheelBox.width / skyBox.width : 0,
    wheelMin: wheelBox?.width ?? 0,
    readSticky: read ? getComputedStyle(read).position : "",
    pairOverWheel:
      pairBox && wheelBox ? pairBox.bottom <= wheelBox.top + 4 && pairBox.left < wheelBox.right - 40 : false,
  };
});
if (!layout.inside) fail.push("pair control is not inside Sky");
if (Math.abs(layout.pairH - 44) > 2) fail.push(`pair height ${layout.pairH}`);
if (Math.abs(layout.gapSkyHello - 16) > 3) fail.push(`band gap sky-hello ${layout.gapSkyHello}px`);
if (Math.abs(layout.gapHelloTable - 16) > 3) fail.push(`band gap hello-table ${layout.gapHelloTable}px`);
if (!layout.toolsBelow) fail.push("Bodies/Look are not below the table");
if (!layout.table) fail.push("table is not a <table>");
if (layout.wheelPct < 0.5 || layout.wheelMin < 520) fail.push(`desktop wheel ${layout.wheelPct} ${layout.wheelMin}`);
if (layout.pairOverWheel) fail.push("desktop: pair sits above the wheel");

await shot(desktop, "synastry-desktop");

await desktop.setViewportSize({ width: 390, height: 844 });
await desktop.waitForTimeout(500);

const mobileLayout = await desktop.evaluate(() => {
  const nav = document.querySelector("[data-testid='studio-nav']");
  const pair = document.querySelector("[data-testid='synastry-pair']");
  const wheel = document.querySelector("[data-testid='synastry-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='synastry-sky-read']");
  const hello = document.querySelector("[data-testid='synastry-hello']");
  const table = document.querySelector("[data-testid='synastry-table'] table");
  const cards = document.querySelectorAll("[data-testid='synastry-table'] [data-card]");
  const navBox = nav?.getBoundingClientRect();
  const pairBox = pair?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  const sticky = pair ? getComputedStyle(pair).position : "";
  const pairBar = document.querySelector(".ulune-synastry-pair-bar");
  const caption = document.querySelector("[data-testid='synastry-caption']");
  const captionBox = caption?.getBoundingClientRect();
  const pairBarBox = pairBar?.getBoundingClientRect();
  return {
    pairUnderNav: Boolean(navBox && pairBox && pairBox.top >= navBox.bottom - 2),
    wheelAfterPair: Boolean(pairBox && wheelBox && wheelBox.top >= pairBox.bottom - 2),
    readAfterWheel: Boolean(wheelBox && readBox && readBox.top >= wheelBox.bottom - 2),
    pairH: pairBox?.height ?? 0,
    pairBarH: pairBarBox?.height ?? 0,
    captionVisible: Boolean(captionBox && captionBox.height > 8 && captionBox.bottom > 0 && captionBox.top < window.innerHeight),
    captionUnderBar: Boolean(pairBox && captionBox && captionBox.top >= pairBox.bottom - 1),
    captionCovered: Boolean(pairBox && captionBox && pairBox.bottom > captionBox.top + 1),
    overlapPx: pairBox && captionBox ? +(pairBox.bottom - captionBox.top).toFixed(1) : 0,
    helloMin: helloBox ? helloBox.height / 3 : 0,
    table: Boolean(table),
    cards: cards.length,
    overflow,
    sticky,
  };
});
if (!mobileLayout.pairUnderNav) fail.push("mobile: pair is not under studio tabs");
if (!mobileLayout.wheelAfterPair) fail.push("mobile: wheel is not under pair");
if (!mobileLayout.readAfterWheel) fail.push("mobile: reading is not under the wheel");
if (Math.abs(mobileLayout.pairH - 44) > 2) fail.push(`mobile pair ${mobileLayout.pairH}, expected 44`);
if (Math.abs(mobileLayout.pairBarH - 44) > 2) fail.push(`mobile pair bar ${mobileLayout.pairBarH}`);
if (!mobileLayout.captionVisible) fail.push("mobile: inner/outer caption missing");
if (!mobileLayout.captionUnderBar) fail.push("mobile: caption is not under the 44px pair");
if (mobileLayout.captionCovered) fail.push("mobile: sticky pair covers the sky caption");
if (mobileLayout.helloMin < 44) fail.push(`mobile hello cell ${mobileLayout.helloMin}`);
if (!mobileLayout.table) fail.push("mobile table is not a <table>");
if (mobileLayout.cards) fail.push("mobile used cards instead of freeze-column table");
if (mobileLayout.overflow > 8) fail.push(`mobile overflow ${mobileLayout.overflow}`);
if (mobileLayout.sticky !== "sticky") fail.push(`mobile pair not sticky (${mobileLayout.sticky})`);

await desktop.evaluate(() => window.scrollTo(0, 520));
await desktop.waitForTimeout(250);
const scrolled = await desktop.evaluate(() => {
  const pair = document.querySelector("[data-testid='synastry-pair']");
  const caption = document.querySelector("[data-testid='synastry-caption']");
  const pb = pair?.getBoundingClientRect();
  const cb = caption?.getBoundingClientRect();
  const cs = caption ? getComputedStyle(caption) : null;
  return {
    pairH: pb?.height ?? 0,
    pairBottom: pb?.bottom ?? 0,
    capTop: cb?.top ?? 0,
    captionVisible: Boolean(cb && cs?.display !== "none" && cb.height > 8 && cb.bottom > 0 && cb.top < window.innerHeight),
    covered: Boolean(pb && cb && cs?.display !== "none" && cb.height > 8 && pb.bottom > cb.top + 1),
  };
});
if (Math.abs(scrolled.pairH - 44) > 2) fail.push(`scrolled pair ${scrolled.pairH}, expected 44`);
if (!scrolled.captionVisible) fail.push("mobile: caption not visible after scroll");
if (scrolled.covered) {
  fail.push(`mobile: sticky pair covers the sky caption after scroll (${scrolled.pairBottom} over ${scrolled.capTop})`);
}

await shot(desktop, "synastry-mobile");

await desktop.close();
await browser.close();

if (errors.length) fail.push(...errors.slice(0, 8));
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
