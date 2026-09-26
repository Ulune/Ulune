import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "screenshots");
await mkdir(SHOTS, { recursive: true });

const errors = [];
const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(String(e)));

async function castTraceQA() {
  if (await page.getByTestId("new-chart").count()) {
    await page.getByTestId("new-chart").click();
    await page.waitForSelector("#birth-date", { timeout: 8000 });
  }
  await page.locator("#native-name").fill("TraceQA");
  await page.locator("#birth-date").fill("15/06/1990");
  await page.locator("#birth-time").fill("12:00");
  await page.locator("#birth-place").fill("48.8566, 2.3522");
  await page.locator("#birth-place").blur();
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
}

await page.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 45000 });
await page.waitForSelector("html.theme-ready", { timeout: 20000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });
await castTraceQA();

const natalHouses = await page.locator("[data-testid=table-houses] tbody tr").evaluateAll((rows) =>
  rows.map((r) => ({
    house: (r.querySelector(".ulune-house-id-n, [data-house], td")?.textContent || "").trim(),
    dataHouse: r.getAttribute("data-house"),
    cells: [...r.querySelectorAll("td")].map((td) => (td.textContent || "").trim()),
  })),
);
const natalNums = await page.locator("[data-kind=house-num]").evaluateAll((els) =>
  els.map((el) => {
    const mark = el.querySelector("[data-glyph]");
    return {
      hl: el.getAttribute("data-hl"),
      paint: mark?.getAttribute("data-paint") ?? null,
      text: (mark?.querySelector("text")?.textContent || el.textContent || "").trim(),
    };
  }),
);

function expectHouses(label, rows) {
  const got = rows.map((r) => String(r.dataHouse || r.house).replace(/\D/g, "") || r.house);
  const want = Array.from({ length: 12 }, (_, i) => String(i + 1));
  if (got.join(",") !== want.join(",")) fail.push(`${label} house table: ${got.join(",")}`);
}

function expectWheelNums(label, nums) {
  const got = nums.map((n) => n.text).sort((a, b) => Number(a) - Number(b));
  const want = Array.from({ length: 12 }, (_, i) => String(i + 1));
  if (got.join(",") !== want.join(",")) fail.push(`${label} wheel nums: ${JSON.stringify(nums)}`);
  if (nums.some((n) => n.paint && n.paint !== "num" && n.paint !== "svg")) {
    fail.push(`${label} wheel nums paint: ${nums.map((n) => n.paint).join(",")}`);
  }
}

expectHouses("NATAL", natalHouses);
expectWheelNums("NATAL", natalNums);
console.log("NATAL HOUSE TABLE", JSON.stringify(natalHouses.map((h) => h.cells)));
console.log("NATAL WHEEL NUMS", JSON.stringify(natalNums));

await page.locator("[data-testid=table-houses]").screenshot({
  path: join(SHOTS, "house-table-natal.png"),
});
await page.locator(".ulune-wheel-zoom-inner, .ulune-wheel-stage").first().screenshot({
  path: join(SHOTS, "wheel-natal.png"),
});

async function pageWheel(name, clickTestId, waitTestId) {
  await page.getByTestId(clickTestId).click();
  await page.getByTestId(waitTestId).waitFor({ timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(400);
  const hasWheel = await page.locator(".ulune-wheel-zoom-inner").count();
  if (!hasWheel) {
    console.log(name, "no wheel");
    if (name === "TRANSITS" || name === "PROG") fail.push(`${name} missing wheel`);
    return;
  }
  const size0 = await page
    .locator(".ulune-wheel-zoom-inner")
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    })
    .catch(() => null);
  await page.waitForTimeout(1400);
  const size1 = await page
    .locator(".ulune-wheel-zoom-inner")
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    })
    .catch(() => null);
  const port = await page
    .locator(".ulune-wheel-zoom-port")
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        ar: cs.aspectRatio,
      };
    })
    .catch(() => null);
  const houses = await page
    .locator("[data-testid=table-houses] tbody tr")
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-house") || (r.querySelector("td")?.textContent || "").trim()))
    .catch(() => []);
  const nums = await page
    .locator("[data-kind=house-num]")
    .evaluateAll((els) =>
      els.map((el) => (el.querySelector("text")?.textContent || el.textContent || "").trim()),
    )
    .catch(() => []);
  console.log(name, { size0, size1, port, houseCol: houses, wheelNums: nums.sort((a, b) => Number(a) - Number(b)) });
  if (!size1 || size1.w < 280 || size1.h < 280) fail.push(`${name} wheel collapsed ${JSON.stringify(size1)}`);
  if (size0 && size1 && size1.w < size0.w * 0.5) fail.push(`${name} wheel shrank ${JSON.stringify({ size0, size1 })}`);
  if (houses.length === 12) expectHouses(name, houses.map((h) => ({ house: h, dataHouse: h })));
  if (nums.length === 12) {
    const want = Array.from({ length: 12 }, (_, i) => String(i + 1)).join(",");
    const got = [...nums].sort((a, b) => Number(a) - Number(b)).join(",");
    if (got !== want) fail.push(`${name} wheel nums ${got}`);
  }
  const shot = name.toLowerCase();
  await page.screenshot({ path: join(SHOTS, `wheel-${shot}.png`) });
}

await pageWheel("TRANSITS", "studio-page-transits", "studio-transits");
await pageWheel("SYNASTRY", "studio-page-synastry", "studio-synastry");
await pageWheel("PROG", "studio-page-progressions", "studio-progressions");
await page.getByTestId("studio-page-table").click();
await page.getByTestId("studio-table").waitFor({ timeout: 20000 });
const tableHouses = await page.locator("[data-testid=table-houses] tbody tr").evaluateAll((rows) =>
  rows.map((r) => ({
    house: (r.querySelector("[data-house], td")?.textContent || "").trim(),
    dataHouse: r.getAttribute("data-house"),
  })),
);
expectHouses("TABLE", tableHouses);
await page.locator("[data-testid=table-houses]").screenshot({
  path: join(SHOTS, "house-table-page.png"),
});

const real = errors.filter((e) => !/favicon|Download the React DevTools|net::ERR_ABORTED/i.test(e));
if (real.length) fail.push(...real.slice(0, 6));

if (fail.length) {
  console.error("QA FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  await browser.close();
  process.exit(1);
}
console.log("QA OK");
await browser.close();
