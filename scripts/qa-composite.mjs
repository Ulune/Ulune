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
    .locator("[data-testid='studio-natal'], [data-testid='studio-composite']")
    .first()
    .waitFor({ timeout: 45000 });
}

const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
desktop.on("pageerror", (err) => errors.push(String(err)));
desktop.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});

await desktop.goto("http://127.0.0.1:8097/?studio=composite", { waitUntil: "networkidle", timeout: 45000 });
await desktop.getByTestId("studio-page-composite").waitFor({ timeout: 15000 });

const noNatal = desktop.getByTestId("studio-composite-empty");
if (await noNatal.count()) {
  const copy = (await noNatal.innerText()).trim();
  if (!copy.includes("Cast a birth chart first.")) fail.push(`no-natal copy: ${copy}`);
}

await castPerson(desktop, "Person A", "14:30");
await desktop.getByTestId("studio-page-composite").click();
await desktop.getByTestId("studio-composite").waitFor({ timeout: 15000 });
await desktop.getByTestId("composite-add-second").waitFor({ timeout: 5000 });

const oneCopy = (await desktop.getByTestId("composite-need-second").innerText()).trim();
if (oneCopy !== "Add a second person.") fail.push(`one-chart copy: ${oneCopy}`);
if (await desktop.getByTestId("composite-hello").count()) fail.push("Hello shown with one chart");
if (await desktop.getByTestId("composite-table").count()) fail.push("table shown with one chart");
const onePage = (await desktop.getByTestId("studio-composite").innerText()).replace(/\s+/g, " ");
if (onePage.includes("No major aspect in this composite")) fail.push("one-chart showed table empty copy");
if (await desktop.getByTestId("synastry-ring").count()) fail.push("one-chart showed a bi-wheel");

const emptyRead = (await desktop.getByTestId("click-reading-empty").innerText()).trim();
if (emptyRead !== "Click a body or an aspect in the wheel.") fail.push(`empty reading: ${emptyRead}`);

await desktop.getByTestId("composite-add-second-wheel").click();
await castPerson(desktop, "Person B", "12:00");
await desktop.getByTestId("studio-page-composite").click();
await desktop.getByTestId("composite-wheel").waitFor({ timeout: 20000 });
await desktop.getByTestId("composite-hello").waitFor({ timeout: 10000 });
await desktop.getByTestId("composite-table").waitFor({ timeout: 10000 });

if (await desktop.getByTestId("synastry-ring").count()) fail.push("composite used a bi-wheel");
if (await desktop.getByTestId("synastry-hello").count()) fail.push("composite showed Hello-meeting");
if (await desktop.locator("[data-natal-hello]").count()) fail.push("composite cloned natal Hello chrome");

const method = (await desktop.getByTestId("composite-method").innerText()).trim();
if (method !== "Midpoint composite") fail.push(`method label: ${method}`);

const sunLine = (await desktop.getByTestId("composite-hello-sun").locator("[data-hello-copy]").innerText()).trim();
const moonLine = (await desktop.getByTestId("composite-hello-moon").locator("[data-hello-copy]").innerText()).trim();
const ascLine = (await desktop.getByTestId("composite-hello-asc").locator("[data-hello-copy]").innerText()).trim();
if (sunLine !== "Your core identity: what you are aiming to become and where you want to shine.") fail.push(`hello sun: ${sunLine}`);
if (moonLine !== "Your emotional needs: what makes you feel safe and how you react under stress.") fail.push(`hello moon: ${moonLine}`);
if (ascLine !== "Your rising sign: how you come across and how you approach anything new.") fail.push(`hello asc: ${ascLine}`);

const helloId = await desktop.getByTestId("composite-hello").getAttribute("data-hello-id");
if (helloId !== "natal.hello") fail.push(`hello id ${helloId}`);

for (const [testid, title] of [
  ["composite-hello-sun", "Sun"],
  ["composite-hello-moon", "Moon"],
  ["composite-hello-asc", "Ascendant"],
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
}

const cols = await desktop.evaluate(() =>
  [...document.querySelectorAll("[data-testid='composite-table-cols'] th")].map((th) => th.getAttribute("data-col")),
);
if (JSON.stringify(cols) !== JSON.stringify(["a", "aspect", "b", "orb"])) {
  fail.push(`table cols: ${cols}`);
}

const headers = (await desktop.locator("[data-testid='composite-table'] thead th").allTextContents()).map((h) =>
  h.trim(),
);
if (JSON.stringify(headers) !== JSON.stringify(["Body", "Aspect", "Body", "Orb"])) {
  fail.push(`table headers: ${headers.join(" / ")}`);
}

if (await desktop.locator("[data-testid='composite-table'] [data-col='as-a']").count()) {
  fail.push("table has an A/S column");
}

const layout = await desktop.evaluate(() => {
  const sky = document.querySelector("[data-testid='composite-sky']");
  const pair = document.querySelector("[data-testid='composite-pair']");
  const hello = document.querySelector("[data-testid='composite-hello']");
  const table = document.querySelector("[data-testid='composite-table']");
  const tools = document.querySelector("[data-testid='cast-tools']");
  const wheel = document.querySelector("[data-testid='composite-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='composite-sky-read']");
  const tableEl = document.querySelector("[data-testid='composite-table'] table");
  const skyBox = sky?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const tableBox = table?.getBoundingClientRect();
  const toolsBox = tools?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const pairBox = pair?.getBoundingClientRect();
  const pad = sky ? parseFloat(getComputedStyle(sky).paddingTop) : 0;
  return {
    inside: Boolean(sky && pair && sky.contains(pair)),
    pairH: document.querySelector(".ulune-composite-pair-bar")?.getBoundingClientRect().height ?? 0,
    gapSkyHello: helloBox && skyBox ? helloBox.top - skyBox.bottom : 0,
    gapHelloTable: tableBox && helloBox ? tableBox.top - helloBox.bottom : 0,
    toolsBelow: Boolean(toolsBox && tableBox && toolsBox.top >= tableBox.bottom - 2),
    table: Boolean(tableEl),
    wheelPct: skyBox && wheelBox ? wheelBox.width / skyBox.width : 0,
    wheelMin: wheelBox?.width ?? 0,
    pad,
    pairOverWheel:
      pairBox && wheelBox ? pairBox.bottom <= wheelBox.top + 4 && pairBox.left < wheelBox.right - 40 : false,
    biwheel: Boolean(document.querySelector("[data-testid='synastry-ring']")),
  };
});
if (!layout.inside) fail.push("pair control is not inside Sky");
if (Math.abs(layout.pairH - 44) > 2) fail.push(`pair height ${layout.pairH}`);
if (Math.abs(layout.gapSkyHello - 16) > 3) fail.push(`band gap sky-hello ${layout.gapSkyHello}px`);
if (Math.abs(layout.gapHelloTable - 16) > 3) fail.push(`band gap hello-table ${layout.gapHelloTable}px`);
if (Math.abs(layout.pad - 24) > 1) fail.push(`sky pad ${layout.pad}px`);
if (!layout.toolsBelow) fail.push("Bodies/Look are not below the table");
if (!layout.table) fail.push("table is not a <table>");
if (layout.wheelPct < 0.5 || layout.wheelMin < 520) fail.push(`desktop wheel ${layout.wheelPct} ${layout.wheelMin}`);
if (layout.pairOverWheel) fail.push("desktop: pair sits above the wheel");
if (layout.biwheel) fail.push("desktop showed a bi-wheel");

await shot(desktop, "composite-desktop");

await desktop.setViewportSize({ width: 390, height: 844 });
await desktop.waitForTimeout(500);

const mobileLayout = await desktop.evaluate(() => {
  const nav = document.querySelector("[data-testid='studio-nav']");
  const pair = document.querySelector("[data-testid='composite-pair']");
  const wheel = document.querySelector("[data-testid='composite-sky'] .ulune-sky-wheel");
  const read = document.querySelector("[data-testid='composite-sky-read']");
  const hello = document.querySelector("[data-testid='composite-hello']");
  const table = document.querySelector("[data-testid='composite-table'] table");
  const cards = document.querySelectorAll("[data-testid='composite-table'] [data-card]");
  const navBox = nav?.getBoundingClientRect();
  const pairBox = pair?.getBoundingClientRect();
  const wheelBox = wheel?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const helloBox = hello?.getBoundingClientRect();
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  const sticky = pair ? getComputedStyle(pair).position : "";
  const pairBar = document.querySelector(".ulune-composite-pair-bar");
  const firstTh = document.querySelector("[data-testid='composite-table'] thead th");
  const headSticky = firstTh ? getComputedStyle(firstTh).position : "";
  return {
    pairUnderNav: Boolean(navBox && pairBox && pairBox.top >= navBox.bottom - 2),
    wheelAfterPair: Boolean(pairBox && wheelBox && wheelBox.top >= pairBox.bottom - 2),
    readAfterWheel: Boolean(wheelBox && readBox && readBox.top >= wheelBox.bottom - 2),
    pairH: pairBox?.height ?? 0,
    pairBarH: pairBar?.getBoundingClientRect().height ?? 0,
    helloMin: helloBox ? helloBox.height / 3 : 0,
    table: Boolean(table),
    cards: cards.length,
    overflow,
    sticky,
    freeze: firstTh ? getComputedStyle(firstTh).left : "",
    headSticky,
  };
});
if (!mobileLayout.pairUnderNav) fail.push("mobile: pair is not under studio tabs");
if (!mobileLayout.wheelAfterPair) fail.push("mobile: wheel is not under pair");
if (!mobileLayout.readAfterWheel) fail.push("mobile: reading is not under the wheel");
if (Math.abs(mobileLayout.pairH - 44) > 2) fail.push(`mobile pair height ${mobileLayout.pairH}`);
if (Math.abs(mobileLayout.pairBarH - 44) > 2) fail.push(`mobile pair bar ${mobileLayout.pairBarH}`);
if (mobileLayout.helloMin < 44) fail.push(`mobile hello cell ${mobileLayout.helloMin}`);
if (!mobileLayout.table) fail.push("mobile table is not a <table>");
if (mobileLayout.cards) fail.push("mobile used cards instead of freeze-column table");
if (mobileLayout.overflow > 8) fail.push(`mobile overflow ${mobileLayout.overflow}`);
if (mobileLayout.sticky !== "sticky") fail.push(`mobile pair not sticky (${mobileLayout.sticky})`);

await shot(desktop, "composite-mobile");

await desktop.close();
await browser.close();

if (errors.length) fail.push(...errors.slice(0, 8));
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
