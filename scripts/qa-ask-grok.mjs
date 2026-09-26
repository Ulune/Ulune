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

await page.addInitScript(() => {
  try {
    if (sessionStorage.getItem("qa-ask-ready")) return;
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    sessionStorage.setItem("qa-ask-ready", "1");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

const newBtn = page.getByRole("button", { name: /^new$/i });
if (await newBtn.count()) await newBtn.first().click();

await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("Oslo");
await page.getByRole("button", { name: /cast/i }).click();
await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
await page.waitForTimeout(600);

const sun = page.locator('svg.ulune-wheel g[data-kind="planet"][data-body="sun"]');
if (await sun.count()) await sun.click({ force: true });
await page.waitForTimeout(400);

const clickDump = await page.locator('[data-fold="click"] [data-testid="ask-grok"]').count();
if (clickDump) fail.push("click panel still dumps Ask AI");

await page.getByTestId("reading-ai").click();
await page.getByTestId("ai-accounts-panel").waitFor({ timeout: 8000 }).catch(() => fail.push("Your AI did not open"));

const box = page.getByTestId("ask-grok");
if (await box.count()) {
  const elaborate = await page.getByTestId("ask-grok-submit").innerText();
  const placeholder = await page.locator("#ask-grok-q").getAttribute("placeholder");
  console.log("ELABORATE", elaborate);
  console.log("PLACEHOLDER", placeholder);
  if (!/elaborate/i.test(elaborate)) fail.push("missing elaborate CTA");
  if (!/Mars in Libra/i.test(placeholder ?? "")) fail.push("placeholder missing example");

  await page.locator('[data-testid="ai-accounts-panel"]').screenshot({ path: "/workspace/screenshots/ask-grok-idle.png" });

  await page.locator("#ask-grok-q").fill("How does Mars in Libra colour this Venus, and the rest of the chart?");
  await page.waitForTimeout(150);
  const sendLabel = await page.getByTestId("ask-grok-submit").innerText();
  console.log("SEND_LABEL", sendLabel);
  if (!/^Ask$/i.test(sendLabel.trim())) fail.push(`expected Ask, got ${sendLabel}`);

  await page.getByTestId("ask-grok-submit").click();
  await page.getByText(/Writing/i).waitFor({ timeout: 8000 }).catch(() => fail.push("no writing state"));
  await page.locator('[data-testid="ai-accounts-panel"]').screenshot({ path: "/workspace/screenshots/ask-grok-pending.png" });

  const grokReply = page.locator('[data-testid="ask-grok"] p').filter({ hasText: /Mars|Libra|Venus/i });
  try {
    await grokReply.first().waitFor({ timeout: 50000 });
  } catch {
    fail.push("no grok reply");
  }
  const thread = (await box.innerText()).replace(/\s+/g, " ").slice(0, 500);
  console.log("THREAD", thread);
  if (!/Mars/i.test(thread)) fail.push("reply did not mention Mars");

  await page.locator('[data-testid="ai-accounts-panel"]').screenshot({ path: "/workspace/screenshots/ask-grok-reply.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.locator('[data-testid="ai-accounts-panel"]').screenshot({ path: "/workspace/screenshots/ask-grok-mobile.png" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log("MOBILE_OVERFLOW", overflow);
  if (overflow > 8) fail.push(`mobile overflow ${overflow}`);

  await page.locator('[aria-label="Language"]').getByRole("button", { name: "FR" }).click();
  await page.waitForTimeout(700);
  const frCta = await page.getByTestId("ask-grok-submit").innerText().catch(() => "");
  console.log("FR_CTA", frCta);
  if (!/Demander|approfondir|plus loin/i.test(frCta)) fail.push("french CTA missing");
} else {
  console.log("ASK_SKIPPED_NOT_CONNECTED");
  await page.locator('[data-testid="ai-accounts-panel"]').screenshot({ path: "/workspace/screenshots/ask-grok-idle.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/workspace/screenshots/ask-grok-mobile.png" });
}

console.log("ERRORS", errors);
if (errors.length) fail.push("page errors");
if (fail.length) {
  console.error("FAIL", fail);
  await browser.close();
  process.exit(1);
}
console.log("PASS");
await browser.close();
