import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });

const errors = [];
const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});

await page.goto("http://127.0.0.1:8097/?studio=transits", { waitUntil: "networkidle", timeout: 45000 });
await page.getByTestId("studio-page-transits").waitFor({ timeout: 15000 });

const noNatal = page.getByTestId("studio-transits-empty");
if (await noNatal.count()) {
  const copy = (await noNatal.innerText()).trim();
  if (copy !== "Cast a birth chart first.") fail.push(`no-natal copy: ${copy}`);
}

async function ensureChart() {
  const wheel = page.locator("[data-testid='transit-sky'] svg[role='img']");
  if (await wheel.count()) return;
  await page.locator("#native-name").fill("Transit QA");
  await page.locator("#birth-date").fill("1990-06-15");
  await page.locator("#birth-time").fill("14:30");
  await page.locator("#birth-place").fill("Paris");
  await page.getByRole("button", { name: /cast/i }).first().click();
  await page.getByTestId("studio-page-transits").click();
  await page.locator("[data-testid='transit-sky'] svg[role='img']").waitFor({ timeout: 30000 });
}

await ensureChart();

await page.getByTestId("transit-date").fill("2026-08-27");
await page.getByTestId("transit-time").fill("12:00");
await page.waitForTimeout(600);

const natalHasRing = await page.locator("[data-testid='studio-natal'] [data-testid='transit-ring']").count();
if (natalHasRing) fail.push("natal page showed a transit ring");

await page.getByTestId("studio-transits").waitFor({ timeout: 15000 });
await page.getByTestId("transit-sky").waitFor({ timeout: 15000 });
await page.getByTestId("transit-clock").waitFor({ timeout: 5000 });
await page.getByTestId("transits-hello").waitFor({ timeout: 25000 });
await page.getByTestId("transit-table").waitFor({ timeout: 10000 });

const clockAbove = await page.evaluate(() => {
  const sky = document.querySelector("[data-testid='transit-sky']");
  const clock = document.querySelector("[data-testid='transit-clock']");
  const read = document.querySelector("[data-testid='transit-sky-read']");
  const wheel = document.querySelector("[data-testid='transit-sky'] .ulune-sky-wheel");
  const table = document.querySelector("[data-testid='transit-table'] table");
  const tableBand = document.querySelector("[data-testid='transit-table']");
  const tools = document.querySelector("[data-testid='cast-tools']");
  const hello = document.querySelector("[data-testid='transits-hello']");
  const packed =
    clock && read ? clock.getBoundingClientRect().top - read.getBoundingClientRect().bottom : 99;
  const toolsBelow =
    tools && tableBand
      ? tools.getBoundingClientRect().top >= tableBand.getBoundingClientRect().bottom - 2
      : false;
  const gap =
    hello && sky ? hello.getBoundingClientRect().top - sky.getBoundingClientRect().bottom : 0;
  return {
    inside: Boolean(sky && clock && sky.contains(clock)),
    packed,
    toolsBelow,
    gap,
    table: Boolean(table),
    clockOverWheel:
      clock && wheel
        ? clock.getBoundingClientRect().bottom <= wheel.getBoundingClientRect().top + 4
        : true,
  };
});
if (!clockAbove.inside) fail.push("clock is not inside Sky");
if (clockAbove.clockOverWheel) fail.push("desktop: clock sits above the wheel");
if (clockAbove.packed > 28) fail.push(`desktop: clock not packed under reading (${clockAbove.packed}px)`);
if (!clockAbove.table) fail.push("table is not a <table>");
if (!clockAbove.toolsBelow) fail.push("Bodies/Look are not below the table");
if (Math.abs(clockAbove.gap - 16) > 3) fail.push(`band gap sky-hello ${clockAbove.gap}px`);

try {
  await page.getByTestId("transit-ring").waitFor({ timeout: 25000 });
} catch {
  fail.push("transit ring did not appear");
}

const emptyRead = (await page.getByTestId("click-reading-empty").innerText()).trim();
if (emptyRead !== "Click a transit, a natal body, or an aspect in the wheel.") {
  fail.push(`empty reading: ${emptyRead}`);
}

const helloCopy = (await page.getByTestId("transits-hello").innerText()).toLowerCase();
if (!/applying|applicatif|no major applying|aucun majeur/.test(helloCopy)) {
  fail.push("hello-now did not show applying copy");
}

const headers = (await page.locator("[data-testid='transit-table'] thead th").allTextContents()).map(
  (h) => h.trim(),
);
if (headers.join("|") !== "Transit|Aspect|Natal|A|S|Exact") {
  fail.push(`table headers: ${headers.join(" / ")}`);
}
if (headers.includes("Type") || headers.includes("Orb") || headers.includes("Applying")) {
  fail.push(`stale table headers: ${headers.join(" / ")}`);
}
const applyingTitle = await page.locator("[data-testid='transit-col-a']").getAttribute("title");
if (applyingTitle === "Applying") fail.push("A header still titled Applying");

const chironSat = page.getByTestId("transit-row-tchiron_square_saturn");
if (await chironSat.count()) {
  const aText = (await chironSat.locator("[data-col='a']").innerText()).trim();
  const sText = (await chironSat.locator("[data-col='s']").innerText()).trim();
  const exact = (await chironSat.locator("[data-exact]").innerText()).trim();
  if (aText === "A" && (exact === "—" || !exact)) {
    fail.push("Chiron square Saturn is A with empty Exact");
  }
  if (aText === "A" && sText === "S") fail.push("Chiron square Saturn marked both A and S");
}

const rowDump = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("[data-testid='transit-table'] tbody tr")];
  return rows.map((tr) => ({
    testid: tr.getAttribute("data-testid"),
    transit: tr.getAttribute("data-transit"),
    aspect: tr.getAttribute("data-aspect"),
    natal: tr.getAttribute("data-natal"),
    orb: tr.querySelector("[data-col='aspect']")?.getAttribute("data-orb"),
    applying: (tr.querySelector("[data-col='a']")?.innerText || "").trim(),
    exact: (tr.querySelector("[data-exact]")?.innerText || "").trim(),
  }));
});
console.log("TABLE_ROW_TESTIDS", JSON.stringify(rowDump.map((r) => r.testid)));
const plutoAngles = rowDump.filter(
  (r) => r.transit === "pluto" && ["ascendant", "midheaven", "descendant", "ic"].includes(r.natal),
);
console.log("PLUTO_ANGLE_ROWS", JSON.stringify(plutoAngles));
for (const row of rowDump) {
  if (row.applying === "A" && (!row.exact || row.exact === "—")) {
    fail.push(`applying with empty Exact: ${row.testid}`);
  }
}
const angleOrb = { conjunction: 8, opposition: 8, square: 8, trine: 6, sextile: 4 };
for (const row of plutoAngles) {
  const orb = Number(row.orb);
  const cap = angleOrb[row.aspect];
  if (Number.isFinite(cap) && Number.isFinite(orb) && orb > cap + 1e-6) {
    fail.push(`out-of-orb Pluto angle still a row: ${row.testid} orb ${orb}`);
  }
}

const helloTitle = page.locator("[data-testid='transits-hello-0'] [data-hello-title]");
if (await helloTitle.count()) {
  const type = await helloTitle.evaluate((el) => {
    const cs = getComputedStyle(el);
    const copy = el.closest("[data-hello-cell], button, .ulune-hello-cell")?.querySelector("[data-hello-copy]");
    const copyCs = copy ? getComputedStyle(copy) : null;
    return {
      family: cs.fontFamily,
      size: parseFloat(cs.fontSize),
      copyFamily: copyCs?.fontFamily ?? "",
      copySize: copyCs ? parseFloat(copyCs.fontSize) : 0,
    };
  });
  const roles = await page.evaluate(() => {
    const first = (v) => v.replace(/['"]/g, "").split(",")[0].trim();
    const cs = getComputedStyle(document.documentElement);
    return {
      display: first(cs.getPropertyValue("--font-display")),
      sans: first(cs.getPropertyValue("--font-sans")),
    };
  });
  const hasFace = (fam, face) => new RegExp(face.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(fam);
  if (!hasFace(type.family, roles.display)) fail.push(`hello-now title not display (${type.family})`);
  if (Math.abs(type.size - 20) > 0.6) fail.push(`hello-now title ${type.size}px, want 20px`);
  if (!hasFace(type.copyFamily, roles.sans)) fail.push(`hello-now sentence not body (${type.copyFamily})`);
  if (type.copySize < 15.5 || type.copySize > 18.5) fail.push(`hello-now sentence ${type.copySize}px`);
}

const helloHit = page.getByTestId("transits-hello-0");
if (await helloHit.count()) {
  await helloHit.click();
  await page.waitForTimeout(400);
  const click = await page.locator("#click-reading").innerText();
  if (click.length < 8) fail.push("click reading empty after hello-now tap");
}

await page.screenshot({ path: "/workspace/screenshots/transits-desktop.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.getByTestId("studio-transits").waitFor({ timeout: 10000 });
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 8) fail.push(`mobile overflow ${overflow}px`);
const clock390 = await page.evaluate(() => {
  const date = document.querySelector("[data-testid='transit-date']");
  const now = document.querySelector("[data-testid='transit-now']");
  const live = document.querySelector(".ulune-transit-live");
  const d = date?.getBoundingClientRect();
  const n = now?.getBoundingClientRect();
  const l = live?.getBoundingClientRect();
  const nowCs = now ? getComputedStyle(now) : null;
  return {
    dateW: d?.width ?? 0,
    dateH: d?.height ?? 0,
    nowH: n?.height ?? 0,
    nowW: n?.width ?? 0,
    nowWrap: nowCs?.whiteSpace,
    nowUnderDate: Boolean(d && n && n.top > d.bottom - 4),
    nowOnDateRow: Boolean(d && n && Math.abs((n.bottom ?? 0) - (d.bottom ?? 0)) < 6),
    yearClipped: date ? date.scrollWidth > date.clientWidth + 1 : true,
    liveVisible: Boolean(l && l.width > 4 && l.height > 4),
    liveH: l?.height ?? 0,
  };
});
if (clock390.nowUnderDate || !clock390.nowOnDateRow) {
  fail.push("phone: Now wraps under the date instead of staying on the date row");
}
if (Math.abs(clock390.nowH - 44) > 2) fail.push(`phone Now hit ${clock390.nowH}`);
if (clock390.nowWrap !== "nowrap") fail.push(`phone Now wraps (${clock390.nowWrap})`);
if (clock390.yearClipped) fail.push("phone: date field clips the year");
if (!clock390.liveVisible) fail.push("phone: LIVE dot missing");
await page.screenshot({ path: "/workspace/screenshots/transits-mobile.png", fullPage: true });

await page.evaluate(() => window.scrollTo(0, 420));
await page.waitForTimeout(200);
const sticky = await page.evaluate(() => {
  const header = document.querySelector("header");
  const nav = document.querySelector("[data-testid='studio-nav']");
  const clock = document.querySelector("[data-testid='transit-clock']");
  if (!header || !nav || !clock) return { overlapHeader: true, overlapNav: true };
  const h = header.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  const c = clock.getBoundingClientRect();
  return {
    overlapHeader: c.top < h.bottom - 2,
    overlapNav: n.bottom > 0 && c.top < n.bottom - 2,
  };
});
if (sticky.overlapHeader) fail.push("phone sticky clock overlaps the header");
if (sticky.overlapNav) fail.push("phone sticky clock overlaps the tabs");
await page.screenshot({ path: "/workspace/screenshots/transits-mobile-sticky.png" });

const url = page.url();
if (!/[?&]studio=transits/.test(url)) fail.push("deep link studio=transits did not survive");

console.log("ERRORS", errors);
if (errors.length) fail.push("page errors");
if (fail.length) {
  console.error("FAIL", fail);
  await browser.close();
  process.exit(1);
}
console.log("PASS");
await browser.close();
