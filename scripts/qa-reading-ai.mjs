import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

await mkdir("/workspace/screenshots", { recursive: true });

const errors = [];
const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});

await page.addInitScript(() => {
  try {
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    localStorage.setItem("ulune.studio.page", "natal");
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
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
await page.waitForTimeout(500);

const sun = page.locator('svg.ulune-wheel g[data-kind="planet"][data-body="sun"]');
if (await sun.count()) {
  await sun.click({ force: true });
} else {
  const stripSun = page.locator("button").filter({ hasText: /^Sun/ }).first();
  if (await stripSun.count()) await stripSun.click();
}
await page.waitForTimeout(400);

const click = page.locator('[data-fold="click"]');
await click.waitFor();
const clickText = (await click.innerText()).replace(/\s+/g, " ");
const dump = await click.locator('[data-testid="ask-grok"]').count();
const keys = await click.locator("#ai-key-grok, #ai-key-claude, [data-testid='ai-accounts-panel']").count();
const visibleConnect = /connect to ai|connect ai/i.test(clickText);
if (dump) fail.push("click panel still dumps Ask AI");
if (keys) fail.push("click panel still shows API key dump");
if (visibleConnect) fail.push("click panel shows Connect to AI");

const star = click.getByTestId("reading-ai");
if ((await star.count()) !== 1) fail.push("missing reading-header star");
const starBox = await star.boundingBox();
const iconBox = await star.locator("svg").boundingBox();
console.log("STAR", starBox, iconBox);
if (!starBox || Math.abs(starBox.width - 44) > 1 || Math.abs(starBox.height - 44) > 1) {
  fail.push(`reading star hit ${starBox?.width}x${starBox?.height}, expected 44x44`);
}
if (!iconBox || Math.abs(iconBox.width - 16) > 1 || Math.abs(iconBox.height - 16) > 1) {
  fail.push(`reading star icon ${iconBox?.width}x${iconBox?.height}, expected 16x16`);
}

const headerStar = page.getByTestId("ai-accounts");
const readingLabel = (await star.getAttribute("aria-label")) ?? "";
const headerLabel = (await headerStar.getAttribute("aria-label")) ?? "";
console.log("LABELS", { readingLabel, headerLabel });
if (readingLabel !== "Your AI") fail.push(`reading aria-label ${readingLabel}`);
if (headerLabel !== readingLabel) fail.push("reading star accessible name must match header star");

const readingGlyph = await star.getAttribute("innerHTML").catch(() => "");
void readingGlyph;
const readingPath = await star.locator("svg").innerHTML();
const headerPath = await headerStar.locator("svg").innerHTML();
if (readingPath !== headerPath) fail.push("reading star glyph does not match header star");

const paras = await click.locator(".ulune-read p").count();
const note = click.locator(".ulune-read");
const noteBox = (await note.count()) ? await note.boundingBox() : null;
console.log("NOTE", { paras, noteBox });
if (paras < 1 || paras > 2) fail.push(`click note should stay 1–2 paragraphs, got ${paras}`);

await click.screenshot({ path: "/workspace/screenshots/reading-ai-phone.png" });

await star.click();
await page.waitForTimeout(250);
const fromReading = await page.getByTestId("ai-accounts-panel").count();
if (!fromReading) fail.push("reading star did not open Your AI");
const headerExpanded = await headerStar.getAttribute("aria-expanded");
if (headerExpanded !== "true") fail.push("reading star must open the header Your AI surface");
const pop = await page.evaluate(() => {
  const el = document.querySelector("[data-testid='ai-accounts-panel']");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, width: r.width, vw: window.innerWidth };
});
console.log("POPOVER", pop);
if (!pop) fail.push("missing Your AI popover box");
else {
  if (pop.left < 15.5) fail.push(`popover left ${pop.left}, expected >= 16`);
  if (pop.right > pop.vw - 15.5) fail.push(`popover right ${pop.right} past 16px inset`);
}
const openOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("OPEN_OVERFLOW", openOverflow);
if (openOverflow > 8) fail.push(`phone overflow with Your AI open ${openOverflow}`);
await page.screenshot({ path: "/workspace/screenshots/reading-ai-phone-open.png" });

await page.getByRole("button", { name: /^hide$/i }).click();
await page.waitForTimeout(200);

await headerStar.click();
await page.waitForTimeout(250);
if ((await page.getByTestId("ai-accounts-panel").count()) < 1) fail.push("header star did not open Your AI");
await page.getByRole("button", { name: /^hide$/i }).click();
await page.waitForTimeout(200);

await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(400);
await page.getByTestId("studio-page-natal").click();
await page.waitForTimeout(300);
const sunDesk = page.locator('svg.ulune-wheel g[data-kind="planet"][data-body="sun"]');
if (await sunDesk.count()) await sunDesk.click({ force: true });
await page.waitForTimeout(300);
if ((await click.locator('[data-testid="ask-grok"]').count()) !== 0) {
  fail.push("desktop click column still dumps Ask AI");
}
if ((await click.locator(".ulune-read p").count()) < 1) {
  fail.push("desktop click column lost the short note");
}
if ((await click.getByTestId("reading-ai").count()) !== 1) fail.push("desktop missing reading star");
const deskStar = await click.getByTestId("reading-ai").boundingBox();
const deskIcon = await click.getByTestId("reading-ai").locator("svg").boundingBox();
console.log("DESK_STAR", deskStar, deskIcon);
if (!deskStar || Math.abs(deskStar.width - 44) > 1 || Math.abs(deskStar.height - 44) > 1) {
  fail.push(`desktop reading star hit ${deskStar?.width}x${deskStar?.height}`);
}
await click.locator(".ulune-sky-read-head").screenshot({ path: "/workspace/screenshots/reading-ai-desktop-head.png" });

const studios = [
  "transits",
  "timing",
  "synastry",
  "composite",
  "progressions",
  "numerology",
  "design",
];
for (const id of studios) {
  await page.getByTestId(`studio-page-${id}`).click();
  await page.waitForTimeout(id === "design" ? 1200 : 450);
  const fold = page.locator('[data-fold="click"]');
  if (!(await fold.count())) {
    fail.push(`${id} missing click reading`);
    continue;
  }
  if ((await fold.locator('[data-testid="ask-grok"]').count()) !== 0) {
    fail.push(`${id} click panel still dumps Ask AI`);
  }
  if ((await fold.getByTestId("reading-ai").count()) !== 1) {
    fail.push(`${id} missing reading star`);
  }
}

await page.getByTestId("studio-page-table").click();
await page.waitForTimeout(400);
if ((await page.locator('[data-testid="studio-table"] [data-testid="ask-grok"]').count()) !== 0) {
  fail.push("table studio dumps Ask AI");
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
