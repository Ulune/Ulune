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

async function ensureChart(page) {
  if (await page.getByTestId("timing-sky").count()) return;
  await page.locator("#native-name").fill("Timing QA");
  await page.locator("#birth-date").fill("1990-06-15");
  await page.locator("#birth-time").fill("14:30");
  await page.locator("#birth-place").fill("48.8566, 2.3522");
  await page.locator("#birth-place").blur();
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("studio-page-timing").click();
  await page.getByTestId("timing-sky").waitFor({ timeout: 60000 });
}

const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
desktop.on("pageerror", (err) => errors.push(String(err)));
desktop.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});

await desktop.goto("http://127.0.0.1:8097/?studio=timing", { waitUntil: "networkidle", timeout: 45000 });
await desktop.getByTestId("studio-page-timing").waitFor({ timeout: 15000 });

const noNatal = desktop.getByTestId("studio-timing-empty");
if (await noNatal.count()) {
  const copy = (await noNatal.innerText()).trim();
  if (!copy.includes("Cast a birth chart first.")) fail.push(`no-natal copy: ${copy}`);
}

await ensureChart(desktop);
await desktop.getByTestId("timing-hello").waitFor({ timeout: 45000 });
await desktop.getByTestId("timing-table").waitFor({ timeout: 15000 });
await desktop.getByTestId("timing-scope").waitFor({ timeout: 5000 });

const wheel = await desktop.locator("[data-testid='timing-sky'] svg[role='img']").count();
if (wheel) fail.push("timing sky showed a natal/transit wheel");

const natalHello = await desktop.locator("[data-natal-hello]").count();
if (natalHello) fail.push("timing page cloned natal Hello");

const transitsHello = await desktop.getByTestId("transits-hello").count();
if (transitsHello) fail.push("timing page showed Hello-now");

const colKeys = await desktop.evaluate(() =>
  [...document.querySelectorAll("[data-testid='timing-table-cols'] th")].map((th) => th.getAttribute("data-col")),
);
if (JSON.stringify(colKeys) !== JSON.stringify(["when", "transit", "aspect", "natal", "a", "s"])) {
  fail.push(`table cols: ${colKeys}`);
}

const emptyRead = desktop.getByTestId("click-reading-empty");
if (await emptyRead.count()) {
  const copy = (await emptyRead.innerText()).trim();
  if (copy !== "Click a date, a body, or an aspect.") fail.push(`reading empty: ${copy}`);
}

const layout = await desktop.evaluate(() => {
  const sky = document.querySelector("[data-testid='timing-sky']");
  const scope = document.querySelector("[data-testid='timing-scope']");
  const hello = document.querySelector("[data-testid='timing-hello']");
  const table = document.querySelector("[data-testid='timing-table']");
  const tools = document.querySelector("[data-testid='cast-tools']");
  const read = document.querySelector("[data-testid='timing-sky-read']");
  const cal = document.querySelector(".ulune-timing-cal");
  const skyBox = sky?.getBoundingClientRect();
  const calBox = cal?.getBoundingClientRect();
  const readBox = read?.getBoundingClientRect();
  const gapSkyHello = hello && sky ? hello.getBoundingClientRect().top - sky.getBoundingClientRect().bottom : 0;
  const gapHelloTable = table && hello ? table.getBoundingClientRect().top - hello.getBoundingClientRect().bottom : 0;
  const toolsBelow = tools && table ? tools.getBoundingClientRect().top >= table.getBoundingClientRect().bottom - 2 : false;
  return {
    scopeInside: Boolean(sky && scope && sky.contains(scope)),
    helloTitle: getComputedStyle(document.querySelector("[data-testid='timing-hello'] .ulune-hello-title") ?? document.body).fontSize,
    gapSkyHello,
    gapHelloTable,
    toolsBelow,
    calWidth: calBox?.width ?? 0,
    skyWidth: skyBox?.width ?? 0,
    readWidth: readBox?.width ?? 0,
    sideBySide: Boolean(calBox && readBox && Math.abs(calBox.top - readBox.top) < 80),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

if (!layout.scopeInside) fail.push("Day/Month/Year is not inside the sky");
if (!layout.toolsBelow) fail.push("Bodies/Look is not below the table");
if (layout.gapSkyHello < 12 || layout.gapSkyHello > 24) fail.push(`sky-hello gap ${layout.gapSkyHello}`);
if (layout.gapHelloTable < 12 || layout.gapHelloTable > 24) fail.push(`hello-table gap ${layout.gapHelloTable}`);
if (layout.helloTitle && !layout.helloTitle.startsWith("20")) fail.push(`hello title ${layout.helloTitle}`);
if (!layout.sideBySide) fail.push("desktop calendar and reading are not side by side");
if (layout.calWidth < 520) fail.push(`calendar narrower than 520px: ${layout.calWidth}`);
if (layout.overflowX > 2) fail.push(`desktop overflow ${layout.overflowX}`);

await desktop.getByTestId("timing-scope-month").click();
await desktop.getByTestId("timing-month").waitFor({ timeout: 45000 });
const monthCells = await desktop.locator("[data-testid='timing-month'] .ulune-timing-grid .ulune-timing-cell").count();
if (monthCells < 28) fail.push(`month grid cells ${monthCells}`);
const monthHello = await desktop.evaluate(() =>
  [...document.querySelectorAll("[data-testid='timing-hello'] [data-hello-cell]")].map((el) => ({
    cell: el.getAttribute("data-hello-cell"),
    copy: (el.querySelector("[data-hello-copy]")?.textContent || "").trim(),
  })),
);
const monthFilled = monthHello.filter((row) => row.cell && row.cell !== "empty");
if (monthFilled.some((row) => row.cell === "moon")) {
  fail.push(`month Hello-next still includes the Moon (${monthFilled.map((r) => r.cell).join(",")})`);
}
if (monthFilled.length === 0) {
  const emptyCopy = monthHello[0]?.copy ?? "";
  if (emptyCopy !== "No exact major aspect this month.") {
    fail.push(`month Hello-next empty “${emptyCopy}”`);
  }
}

await desktop.getByTestId("timing-scope-year").click();
await desktop.getByTestId("timing-year").waitFor({ timeout: 60000 });
const yearCells = await desktop.locator("[data-testid='timing-year'] .ulune-timing-year-cell").count();
if (yearCells !== 12) fail.push(`year cells ${yearCells}`);

const august = desktop.getByTestId("timing-month-2026-08");
if (await august.count()) {
  await august.click();
  await desktop.getByTestId("timing-month").waitFor({ timeout: 20000 });
}

await desktop.getByTestId("timing-scope-day").click();
await desktop.getByTestId("timing-strip").waitFor({ timeout: 45000 });

await shot(desktop, "timing-desktop");

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (err) => errors.push("mobile " + String(err)));
mobile.on("console", (msg) => {
  if (msg.type() === "error") errors.push("mobile console: " + msg.text());
});
await mobile.goto("http://127.0.0.1:8097/?studio=timing", { waitUntil: "networkidle", timeout: 45000 });
await ensureChart(mobile);
await mobile.getByTestId("timing-sky").waitFor({ timeout: 45000 });
await mobile.getByTestId("timing-hello").waitFor({ timeout: 45000 });

const mobileLayout = await mobile.evaluate(() => {
  const sky = document.querySelector("[data-testid='timing-sky']");
  const scope = document.querySelector("[data-testid='timing-scope']");
  const cal = document.querySelector(".ulune-timing-cal");
  const read = document.querySelector("[data-testid='timing-sky-read']");
  const nav = document.querySelector("[data-testid='studio-nav']");
  return {
    scopeInside: Boolean(sky && scope && sky.contains(scope)),
    stacked: Boolean(cal && read && read.getBoundingClientRect().top >= cal.getBoundingClientRect().bottom - 4),
    navStick: nav?.getAttribute("data-transits-stick") === "1",
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    calWidth: cal?.getBoundingClientRect().width ?? 0,
    skyWidth: sky?.getBoundingClientRect().width ?? 0,
  };
});
if (!mobileLayout.scopeInside) fail.push("mobile: scope not inside sky");
if (!mobileLayout.stacked) fail.push("mobile: reading is not under the calendar");
if (!mobileLayout.navStick) fail.push("mobile: studio tabs not sticky for timing");
if (mobileLayout.overflowX > 2) fail.push(`mobile overflow ${mobileLayout.overflowX}`);
if (mobileLayout.skyWidth && mobileLayout.calWidth < mobileLayout.skyWidth - 56) {
  fail.push(`mobile calendar not full width ${mobileLayout.calWidth} / ${mobileLayout.skyWidth}`);
}

await shot(mobile, "timing-mobile");
await browser.close();

const consoleErrors = errors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
if (consoleErrors.length) fail.push(...consoleErrors.slice(0, 8));

console.log(JSON.stringify({ ok: fail.length === 0, fail, layout, mobileLayout }, null, 2));
if (fail.length) process.exit(1);
