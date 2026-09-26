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

async function attach(page) {
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console: " + msg.text());
  });
}

async function castTraceQA(page) {
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

const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await attach(desktop);
await desktop.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 45000 });
await desktop.waitForSelector("html.theme-ready", { timeout: 20000 });
await desktop.waitForSelector("#birth-date", { timeout: 20000 });
await desktop.screenshot({ path: join(SHOTS, "empty.png"), fullPage: true });

const dateType = await desktop.locator("#birth-date").getAttribute("type");
if (dateType && dateType !== "text") fail.push(`birth-date type=${dateType}`);

await castTraceQA(desktop);
await desktop.screenshot({ path: join(SHOTS, "natal-after-cast.png"), fullPage: true });

const natalBox = await desktop.getByTestId("studio-natal").boundingBox();
const birthBox = await desktop.locator("#cast-form").boundingBox();
if (natalBox && birthBox && natalBox.y > birthBox.y + 120) {
  fail.push(`wheel stage below birth fold (natal y=${natalBox.y} birth y=${birthBox.y})`);
}

await desktop.getByTestId("studio-page-transits").click();
await desktop.getByTestId("studio-transits").waitFor({ timeout: 20000 });
if (await desktop.getByTestId("studio-transits-chunk-retry").count()) {
  fail.push("transits chunk retry UI after cold click");
}
await desktop.screenshot({ path: join(SHOTS, "transits.png"), fullPage: true });

await desktop.getByTestId("studio-page-synastry").click();
await desktop.getByTestId("studio-synastry").waitFor({ timeout: 20000 });
if (!(await desktop.getByTestId("synastry-add-second").count()) && !(await desktop.getByTestId("synastry-add-second-wheel").count())) {
  fail.push("missing Add a second person");
}
await desktop.screenshot({ path: join(SHOTS, "synastry.png"), fullPage: true });

await desktop.getByTestId("studio-page-design").click();
await desktop.getByTestId("studio-humandesign").or(desktop.getByTestId("studio-design")).waitFor({ timeout: 20000 }).catch(() => {});
const hd = desktop.locator("[data-testid='studio-humandesign'], [data-testid='hd-sky'], [data-testid='studio-design']").first();
if (!(await hd.count())) fail.push("human design page missing");
await desktop.screenshot({ path: join(SHOTS, "hd.png"), fullPage: true });

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await attach(phone);
await phone.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 45000 });
await phone.waitForSelector("html.theme-ready", { timeout: 20000 });
await phone.waitForSelector("#birth-date", { timeout: 20000 });
await castTraceQA(phone);
await phone.screenshot({ path: join(SHOTS, "natal-390.png"), fullPage: true });
const phoneNatal = await phone.getByTestId("studio-natal").boundingBox();
if (!phoneNatal || phoneNatal.y > 520) fail.push(`390px wheel too far down y=${phoneNatal?.y}`);

await browser.close();

const real = errors.filter((e) => !/favicon|Download the React DevTools|net::ERR_ABORTED/i.test(e));
if (real.length) fail.push(...real.slice(0, 8));

if (fail.length) {
  console.error("QA FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("QA OK screenshots in", SHOTS);
