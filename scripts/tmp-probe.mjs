import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:8097/", { waitUntil: "load" });
await page.waitForSelector("html.theme-ready");
await page.waitForSelector("#birth-date, [data-testid=chart-chip]");
if (!(await page.getByTestId("studio-natal").count())) {
  await page.locator("#native-name").fill("TraceQA");
  await page.locator("#birth-date").fill("15/06/1990");
  await page.locator("#birth-time").fill("12:00");
  await page.locator("#birth-place").fill("Paris, France");
  const list = page.locator("#birth-place-list [role=option] button");
  try { await list.first().waitFor({ timeout: 10000 }); await list.first().click(); }
  catch { await page.locator("#birth-place").press("Enter"); }
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 60000 });
}
await page.waitForTimeout(600);
const out = await page.evaluate(() => {
  const rows = [];
  let el = document.querySelector(".ulune-wheel");
  while (el && el !== document.documentElement) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    rows.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className && String(el.className).slice(0, 60)) || "",
      top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width),
      ovY: cs.overflowY, flex: cs.flex, ar: cs.aspectRatio, minH: cs.minHeight, maxH: cs.maxHeight, disp: cs.display,
    });
    el = el.parentElement;
  }
  const root = getComputedStyle(document.documentElement);
  return { rows, vars: { header: root.getPropertyValue("--ulune-header-h"), nav: root.getPropertyValue("--ulune-nav-h"), shellHeader: root.getPropertyValue("--shell-header-h") }, vh: document.documentElement.clientHeight };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
