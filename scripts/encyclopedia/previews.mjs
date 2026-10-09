/*
 * The encyclopedia's preview images (encyclopedia plan, part 21: "each core
 * page has its own preview image (the glyph and the name in Ulune's style,
 * made at build time), so a shared link looks like Ulune"): one JPEG of
 * 1200 × 630 per core entry, the same for both languages (both names on it),
 * in public/previews/<id>.jpg, drawn with Ulune's own fonts and the entry's
 * figure where it has one.
 *
 * Made here, by a browser this script drives, and kept with the code: the
 * site's build has no browser. `previews/manifest.json` records what each
 * image was drawn from, so scripts/encyclopedia-previews.test.mjs knows when
 * an entry changed and its image must be drawn again:
 *
 *   node scripts/encyclopedia/previews.mjs          draws the new and changed ones
 *   node scripts/encyclopedia/previews.mjs --all    draws them all
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEncyclopedia, readContent } from "./build.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
export const PREVIEW_DIR = join(ROOT, "public", "previews");
export const PREVIEW_MANIFEST = join(PREVIEW_DIR, "manifest.json");
/** Bump to draw every image again when the design below changes. */
export const PREVIEW_DESIGN = 2;

const TRADITION_COLOUR = { astrology: "#d8b46a", "human-design": "#7fb0d8", numerology: "#a9c98a" };

/** The entries that get an image: every core page (combinations share their parts' images). */
export function previewEntries(data) {
  return Object.values(data.pages)
    .filter((p) => p.lang === "en" && p.kind !== "combination")
    .map((en) => ({ en, fr: data.pages[`fr/${en.id}`] }));
}

/** What an image is drawn from: when this changes, the image is drawn again. */
export function previewKey({ en, fr }) {
  const what = JSON.stringify([PREVIEW_DESIGN, en.glyph, en.title, fr.title, en.tradition, en.figure?.panels?.[0]?.svg ?? ""]);
  return createHash("sha256").update(what).digest("hex").slice(0, 16);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fonts = new Map();
/** Ulune's own fonts, inlined (the page the browser draws has no address to load them from). */
const font = (name, file, extra = "") => {
  if (!fonts.has(file)) fonts.set(file, readFileSync(join(ROOT, "src/assets/fonts", file)).toString("base64"));
  return `@font-face{font-family:"${name}";src:url(data:font/woff2;base64,${fonts.get(file)}) format("woff2");${extra}}`;
};

function html({ en, fr }) {
  const colour = TRADITION_COLOUR[en.tradition.id] ?? "#cfcfcf";
  const figure = en.figure?.panels?.[0];
  // Long names (a gate's "Gate 34 · Power") on two lines, the number apart.
  const [name, sub] = en.title.split(" · ");
  const [nameFr, subFr] = fr.title.split(" · ");
  const art = figure
    ? `<div class="figure">${figure.svg.replace(/ width="\d+" height="\d+"/, "")}</div>`
    : en.glyph
      ? `<div class="glyph">${esc(en.glyph)}</div>`
      : // No glyph, no figure: Ulune's star.
        `<div class="glyph star">✦</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${font("Fraunces", "Fraunces-latin-opsz.woff2", "font-weight:100 900;")}
${font("Fraunces", "Fraunces-latin-ext-opsz.woff2", "font-weight:100 900;")}
${font("Familjen Grotesk", "FamiljenGrotesk-latin-wght.woff2", "font-weight:400 700;")}
${font("Familjen Grotesk", "FamiljenGrotesk-latin-ext-wght.woff2", "font-weight:400 700;")}
${font("Ulune Classic", "UluneClassic.woff2")}
${font("Noto Sans Symbols", "NotoSansSymbols-astro.woff2")}
${font("Noto Sans Symbols 2", "NotoSansSymbols2-astro.woff2")}
:root{--color-bg:#121212;--color-bg-subtle:#1b1b1b;--color-fg:#f0ece4;--color-fg-muted:#c9c4bb;--color-fg-subtle:#8f8a82;--color-border:#2c2c2c;--color-border-strong:#4a4a4a;
--el-fire:oklch(0.70 0.21 22);--el-earth:oklch(0.70 0.17 148);--el-air:oklch(0.85 0.16 87);--el-water:oklch(0.66 0.17 245);
--aspect-conj:oklch(0.85 0.15 95);--aspect-hard:oklch(0.70 0.21 22);--aspect-soft:oklch(0.70 0.17 245);--aspect-minor:oklch(0.70 0.16 148);
--font-ui:"Familjen Grotesk",sans-serif;--font-display:"Fraunces",serif;--font-glyphs:"Ulune Classic","Noto Sans Symbols","Noto Sans Symbols 2",sans-serif}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#121212;color:var(--color-fg);font-family:var(--font-ui);display:flex;align-items:center;overflow:hidden}
.text{flex:1 1 auto;padding:0 40px 0 88px;display:flex;flex-direction:column;gap:22px}
.brand{font-family:var(--font-display);font-size:34px;letter-spacing:.01em;color:var(--color-fg-muted)}
.brand b{font-weight:400;color:var(--color-fg)}
.tag{align-self:flex-start;font-size:22px;padding:6px 16px;border-radius:999px;border:2px solid ${colour};color:${colour}}
h1{font-family:var(--font-display);font-weight:400;font-size:${name.length > 30 ? 62 : name.length > 18 ? 74 : 92}px;line-height:1.02;letter-spacing:-.01em}
.sub{font-family:var(--font-display);font-size:40px;color:var(--color-fg-muted);margin-top:-8px}
.fr{font-size:30px;color:var(--color-fg-subtle)}
.site{font-size:26px;color:var(--color-fg-subtle);margin-top:18px}
.art{flex:0 0 470px;height:630px;display:flex;align-items:center;justify-content:center;padding-right:60px}
.glyph{font-family:var(--font-glyphs);font-size:${[...en.glyph].length > 2 ? 150 : 260}px;line-height:1;color:var(--color-fg)}
.star{font-family:var(--font-display);color:var(--color-fg-subtle);font-size:220px}
.figure{width:400px;max-height:540px;display:flex;align-items:center;justify-content:center}
.figure svg{width:100%;height:auto;max-height:540px;overflow:visible}
${readFileSync(join(ROOT, "src/encyclopedia/encyclopedia.css"), "utf8").match(/\.f-svg[\s\S]*?(?=\.ob-enc-dial-control)/)?.[0] ?? ""}
</style></head><body>
<div class="text">
  <div class="brand">✦ <b>Ulune</b> · Encyclopedia</div>
  <div class="tag">${esc(en.tradition.name)}</div>
  <div><h1>${esc(name)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>
  <div class="fr">${esc(nameFr)}${subFr ? ` · ${esc(subFr)}` : ""}</div>
  <div class="site">ulune.app</div>
</div>
<div class="art">${art}</div>
</body></html>`;
}

async function main() {
  const all = process.argv.includes("--all");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const { data, errors } = buildEncyclopedia(readContent(join(ROOT, "content/encyclopedia")));
  if (errors.length) throw new Error("The encyclopedia has mistakes: build it first.");
  mkdirSync(PREVIEW_DIR, { recursive: true });
  const manifest = existsSync(PREVIEW_MANIFEST) ? JSON.parse(readFileSync(PREVIEW_MANIFEST, "utf8")) : {};
  const entries = previewEntries(data);
  const todo = only
    ? entries.filter((e) => only.includes(e.en.id))
    : entries.filter((e) => all || manifest[e.en.id] !== previewKey(e) || !existsSync(join(PREVIEW_DIR, `${e.en.id}.jpg`)));
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath: existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  let n = 0;
  for (const e of todo) {
    await page.setContent(html(e), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(PREVIEW_DIR, `${e.en.id}.jpg`), type: "jpeg", quality: 72 });
    manifest[e.en.id] = previewKey(e);
    n += 1;
    if (n % 50 === 0) console.log(`${n} of ${todo.length}`);
  }
  await browser.close();
  // An entry gone: its image goes too.
  const ids = new Set(entries.map((e) => e.en.id));
  for (const id of Object.keys(manifest)) if (!ids.has(id)) delete manifest[id];
  for (const f of readdirSync(PREVIEW_DIR)) if (f.endsWith(".jpg") && !ids.has(f.slice(0, -4))) unlinkSync(join(PREVIEW_DIR, f));
  writeFileSync(PREVIEW_MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 0)}\n`);
  console.log(`${n} drawn, ${entries.length} in all`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
