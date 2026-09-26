// Ulune's app icons, drawn from the tab icon (public/favicon.svg): the Home
// Screen and Dock icon (apple-touch-icon, full-bleed: the system rounds it),
// the manifest's icons (192 and 512, and a maskable 512 whose drawing keeps
// inside the safe circle) and /favicon.ico (16, 32, 48).
//
//   node scripts/app-icons.mjs        (then check public/icons/ and public/favicon.ico)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = fs.readFileSync(path.join(root, "public/favicon.svg"), "utf8");
const out = path.join(root, "public/icons");
fs.mkdirSync(out, { recursive: true });

// Full-bleed: the square without its rounded corners.
const fullBleed = svg.replace(/<rect([^>]*?)rx="[^"]*"/, "<rect$1");
// Maskable: full-bleed, the drawing scaled into the safe zone (a circle 80% wide).
const maskable = fullBleed.replace(
  /(<rect[^>]*\/>)([\s\S]*)(<\/svg>)/,
  (_, rect, body, end) => `${rect}<g transform="translate(50 50) scale(0.72) translate(-50 -50)">${body}</g>${end}`,
);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const shoot = async (source, size, file, transparent) => {
    await page.setViewportSize({ width: size, height: size });
    const sized = source.replace("<svg ", `<svg width="${size}" height="${size}" `);
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
    await page.screenshot({ path: path.join(out, file), omitBackground: transparent });
  };
  await shoot(fullBleed, 180, "apple-touch-icon.png", false);
  await shoot(svg, 192, "icon-192.png", true);
  await shoot(svg, 512, "icon-512.png", true);
  await shoot(maskable, 512, "icon-maskable-512.png", false);
  await shoot(svg, 256, "favicon-256.png", true);
} finally {
  await browser.close();
}
// /favicon.ico from the 256 px drawing (Pillow writes the three sizes).
execFileSync("python3", [
  "-c",
  "import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], sizes=[(16,16),(32,32),(48,48)])",
  path.join(out, "favicon-256.png"),
  path.join(root, "public/favicon.ico"),
]);
fs.rmSync(path.join(out, "favicon-256.png"));
for (const f of fs.readdirSync(out)) console.log(`public/icons/${f}: ${fs.statSync(path.join(out, f)).size} bytes`);
console.log(`public/favicon.ico: ${fs.statSync(path.join(root, "public/favicon.ico")).size} bytes`);
