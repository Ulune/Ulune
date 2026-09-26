// Ulune's share card, public/og.jpg (1200 × 630): the wordmark, the address
// and the app's own wheel (the sample chart, 1 Jan 2000, London), taken from
// the running development app, so the card shows the wheel as it is drawn.
//
//   node scripts/og-card.mjs [app address, default http://localhost:8097/]
//
// Needs the dev server up (the launcher, or `npx vite dev --port 8097`).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = process.argv[2] ?? "http://localhost:8097/";
const out = path.join(root, "public/og.jpg");
const fonts = path.join(root, "src/assets/fonts");
const b64 = (p) => fs.readFileSync(p).toString("base64");

const browser = await chromium.launch();
try {
  // 1. The wheel, on a transparent background.
  const page = await browser.newPage({ viewport: { width: 1500, height: 1250 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await page.goto(app, { waitUntil: "networkidle" });
  await page.getByTestId("sample-chart").click();
  const svg = page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost)");
  await svg.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(6000); // the entrance, then rest
  await page.addStyleTag({
    content: "html, body, body * { background: transparent !important; background-image: none !important; box-shadow: none !important; }",
  });
  await page.evaluate(() => {
    // The first-visit hint over the wheel is not part of the chart.
    const close = document.querySelector('[aria-label="Close the hint"]');
    if (close?.parentElement) close.parentElement.style.visibility = "hidden";
  });
  await page.waitForTimeout(300);
  const wheel = (await svg.screenshot({ omitBackground: true })).toString("base64");

  // 2. The card, with the app's own fonts.
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Fraunces"; src: url(data:font/woff2;base64,${b64(`${fonts}/Fraunces-latin-opsz.woff2`)}) format("woff2"); font-weight: 500 700; }
@font-face { font-family: "Familjen Grotesk"; src: url(data:font/woff2;base64,${b64(`${fonts}/FamiljenGrotesk-latin-wght.woff2`)}) format("woff2"); font-weight: 400 600; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #111111; }
.card { position: relative; width: 1200px; height: 630px;
  background: radial-gradient(circle at 880px 315px, rgba(240, 239, 236, 0.07), rgba(17, 17, 17, 0) 330px), #111111; }
.wheel { position: absolute; left: 585px; top: 20px; width: 590px; height: 590px; }
.brand { position: absolute; left: 84px; top: 214px; display: flex; align-items: center; gap: 26px;
  font-family: "Fraunces", serif; font-weight: 500; font-size: 128px; letter-spacing: -0.02em; line-height: 1;
  color: #f0efec; font-variation-settings: "opsz" 144; }
.brand svg { width: 52px; height: 52px; fill: #f0efec; flex: none; transform: translateY(-4px); }
.addr { position: absolute; left: 88px; top: 380px; font-family: "Familjen Grotesk", sans-serif; font-weight: 500;
  font-size: 34px; letter-spacing: 0.01em; color: #b8b6b0; }
</style></head><body><div class="card">
<img class="wheel" src="data:image/png;base64,${wheel}" alt="">
<div class="brand"><svg viewBox="0 0 12 12"><path d="M6 0C6.4 3.1 8.9 5.6 12 6 8.9 6.4 6.4 8.9 6 12 5.6 8.9 3.1 6.4 0 6 3.1 5.6 5.6 3.1 6 0Z"/></svg><span>Ulune</span></div>
<div class="addr">ulune.app</div>
</div></body></html>`;
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await card.setContent(html, { waitUntil: "load" });
  await card.evaluate(() => document.fonts.ready);
  await card.waitForTimeout(300);
  await card.screenshot({ path: out, type: "jpeg", quality: 90 });
  console.log(`${path.relative(root, out)}: ${fs.statSync(out).size} bytes`);
} finally {
  await browser.close();
}
