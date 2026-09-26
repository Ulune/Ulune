import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});
page.on("pageerror", (err) => errors.push("page: " + String(err)));

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("svg[role='img']", { timeout: 25000 });
await page.waitForTimeout(900);

let body = await page.locator("body").innerText();
console.log("INITIAL_HAS_LIBRA", body.includes("Libra"));
console.log("INITIAL_HAS_DECAN", /2nd decan/i.test(body) || /Venus/.test(body));
console.log("INITIAL_NIGHT", body.includes("Night chart"));
console.log("INITIAL_TICK_LEGEND", body.includes("1° ticks"));

await page.screenshot({ path: "/workspace/screenshots/qa-desktop.png" });

// Recast for Paris without picking a suggestion
await page.locator("#birth-place").fill("Paris");
await page.getByRole("button", { name: /cast chart/i }).click();
await page.waitForTimeout(4000);
body = await page.locator("body").innerText();
console.log("PARIS_PLACE", body.includes("Paris"));
console.log("PARIS_HAS_SVG", (await page.locator("svg[role='img']").count()) > 0);
console.log("PARIS_ERROR", /could not/i.test(body) ? body.match(/could not[^\n]*/i)?.[0] : "none");
console.log("STILL_CASTING", await page.getByRole("button", { name: /casting/i }).count());
console.log("BODY_SNIP\n", body.slice(0, 1400));

await page.screenshot({ path: "/workspace/screenshots/qa-full.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/qa-mobile.png" });
console.log("ERRORS", errors);
await browser.close();
if (errors.length) process.exit(1);
