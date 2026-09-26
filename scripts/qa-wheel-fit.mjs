/**
 * Wheel fit / crispness gate (plan Step 4).
 *
 * For each fixture × viewport: cast, then measure the painted SVG content box
 * (backdrop rect excluded) against the zoom port and the surrounding chrome.
 * Fails when any painted wheel pixel falls outside the port or lands on the
 * dock, the mode nav or the zoom bar.
 *
 *   node scripts/qa-wheel-fit.mjs [outDir]
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const DEV = process.env.ULUNE_DEV ?? "http://127.0.0.1:8097";
const OUT = process.argv[2] ?? "screenshots/wheel-fit";
/** 1px of slack: getBoundingClientRect is subpixel, `overflow: clip` is not. */
const SLACK = 1.5;

const FIXTURES = [
  { key: "fixture-a", name: "TraceQA", date: "15/06/1990", time: "12:00", place: "Paris, France" },
  // Feb 1962 Aquarius pile-up: Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn all
  // inside ~5°, so the fan runs at full stretch.
  { key: "stellium", name: "Stellium", date: "05/02/1962", time: "06:00", place: "Paris, France" },
];
const VIEWPORTS = [
  { key: "1280x800", width: 1280, height: 800 },
  { key: "390x844", width: 390, height: 844 },
];

const MEASURE = () => {
  const svg = document.querySelector(".ulune-wheel");
  if (!svg) return { error: "no .ulune-wheel" };
  const port = svg.closest(".ulune-wheel-zoom-port");
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  };
  // Painted content only: the viewBox-sized transparent backdrop is a direct
  // child rect and would always report a full-viewBox box.
  const skip = new Set(Array.from(svg.children).filter((el) => el.tagName === "rect"));
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const el of svg.querySelectorAll("path,line,polyline,polygon,circle,ellipse,rect,text,use")) {
    if (skip.has(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const rect = el.getBoundingClientRect();
    if (!(rect.width || rect.height)) continue;
    l = Math.min(l, rect.left);
    t = Math.min(t, rect.top);
    r = Math.max(r, rect.right);
    b = Math.max(b, rect.bottom);
  }
  const angles = {};
  for (const key of ["ascendant", "midheaven", "descendant", "ic"]) {
    const g = svg.querySelector(`[data-kind="angle"][data-body="${key}"]`);
    angles[key] = g
      ? { present: true, box: box(g), uncertain: g.getAttribute("data-uncertain") }
      : { present: false };
  }
  // stroke-width is in user units; a hairline is only real once scaled to the
  // device. Anything under ~0.7 device px paints as a grey smear.
  const scale = (svg.getBoundingClientRect().width / svg.viewBox.baseVal.width) * (window.devicePixelRatio || 1);
  const hairlines = [];
  for (const el of svg.querySelectorAll("path,line,polyline,circle,rect")) {
    const cs = getComputedStyle(el);
    if (cs.stroke === "none" || cs.strokeOpacity === "0") continue;
    const u = Number(cs.strokeWidth.replace("px", ""));
    const dev = u * scale;
    if (Number.isFinite(u) && u > 0 && dev < 0.7) {
      hairlines.push({ tag: el.tagName, kind: el.getAttribute("data-kind"), u, dev: Number(dev.toFixed(2)) });
    }
  }
  return {
    content: { l, t, r, b, w: r - l, h: b - t },
    svg: box(svg),
    port: box(port),
    stage: box(svg.closest(".ulune-wheel-stage")),
    zoomBar: box(document.querySelector(".ulune-wheel-zoom-bar")),
    dock: box(document.querySelector(".ulune-dock")),
    nav: box(document.querySelector(".ulune-mode-nav, .ulune-mode-groups")),
    caption: box(document.querySelector(".ulune-stage-caption")),
    view: { l: 0, t: 0, r: document.documentElement.clientWidth, b: document.documentElement.clientHeight },
    scrollY: window.scrollY,
    pageScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    angles,
    hairlines: hairlines.slice(0, 8),
    hairlineCount: hairlines.length,
    scale,
    scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

function overlap(a, b) {
  if (!a || !b) return 0;
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return w > SLACK && h > SLACK ? Math.round(Math.min(w, h)) : 0;
}

async function pickPlace(page, query) {
  await page.locator("#birth-place").fill(query);
  const list = page.locator("#birth-place-list [role=option] button");
  try {
    await list.first().waitFor({ timeout: 12000 });
    await list.first().click();
  } catch {
    await page.locator("#birth-place").press("Enter");
  }
}

async function cast(page, fx) {
  await page.waitForSelector("#birth-date, [data-testid=chart-chip]", { timeout: 25000 });
  if (await page.getByTestId("studio-natal").count()) {
    const picker = page.getByTestId("chart-picker");
    if (!(await picker.isVisible().catch(() => false))) await page.getByTestId("chart-chip").click();
    await page.getByTestId("new-chart").click();
    await page.waitForSelector("#birth-date", { timeout: 10000 });
  }
  await page.locator("#native-name").fill(fx.name);
  await page.locator("#birth-date").fill(fx.date);
  await page.locator("#birth-time").fill(fx.time);
  await pickPlace(page, fx.place);
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 60000 });
  await page.locator(".ulune-wheel").first().waitFor({ timeout: 30000 });
}

const fails = [];
const rows = [];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(DEV, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("html.theme-ready", { timeout: 25000 });

  for (const fx of FIXTURES) {
    await cast(page, fx);
    await page.waitForTimeout(700);
    const m = await page.evaluate(MEASURE);
    if (m.error) {
      fails.push(`${fx.key} @ ${vp.key}: ${m.error}`);
      continue;
    }
    const clip = {
      left: Math.round(Math.max(0, m.port.l - m.content.l)),
      top: Math.round(Math.max(0, m.port.t - m.content.t)),
      right: Math.round(Math.max(0, m.content.r - m.port.r)),
      bottom: Math.round(Math.max(0, m.content.b - m.port.b)),
    };
    const viewClip = {
      left: Math.round(Math.max(0, m.view.l - m.content.l)),
      top: Math.round(Math.max(0, m.view.t - m.content.t)),
      right: Math.round(Math.max(0, m.content.r - m.view.r)),
      bottom: Math.round(Math.max(0, m.content.b - m.view.b)),
    };
    const hits = {
      dock: overlap(m.content, m.dock),
      nav: overlap(m.content, m.nav),
      zoomBar: overlap(m.content, m.zoomBar),
    };
    const worstClip = Math.max(clip.left, clip.top, clip.right, clip.bottom);
    const worstView = Math.max(viewClip.left, viewClip.top, viewClip.right, viewClip.bottom);
    rows.push({ fixture: fx.key, viewport: vp.key, clip, viewClip, hits, content: {
      w: Math.round(m.content.w), h: Math.round(m.content.h),
    }, port: { w: Math.round(m.port.w), h: Math.round(m.port.h) },
      fill: `${Math.round((m.content.w / m.port.w) * 100)}%`,
      hairlines: m.hairlineCount, scrollX: m.scrollX, angles: m.angles });
    if (worstClip > SLACK) fails.push(`${fx.key} @ ${vp.key}: clipped by port ${JSON.stringify(clip)}`);
    if (worstView > SLACK) fails.push(`${fx.key} @ ${vp.key}: outside viewport ${JSON.stringify(viewClip)}`);
    for (const [what, px] of Object.entries(hits)) {
      if (px) fails.push(`${fx.key} @ ${vp.key}: wheel overlaps ${what} by ${px}px`);
    }
    if (m.hairlineCount) {
      fails.push(`${fx.key} @ ${vp.key}: ${m.hairlineCount} sub-pixel strokes ${JSON.stringify(m.hairlines)}`);
    }
    if (m.scrollX > 1) fails.push(`${fx.key} @ ${vp.key}: horizontal overflow ${m.scrollX}px`);
    await page.screenshot({ path: join(OUT, `${fx.key}-${vp.key}.png`) });
  }
  if (errors.length) fails.push(`console @ ${vp.key}: ${errors.slice(0, 4).join(" | ")}`);
  await page.close();
}

await browser.close();
for (const r of rows) {
  console.log(`${r.fixture} @ ${r.viewport}  content ${r.content.w}×${r.content.h} in port ${r.port.w}×${r.port.h} (${r.fill})`);
  console.log(`  portClip ${JSON.stringify(r.clip)}  viewClip ${JSON.stringify(r.viewClip)}  hits ${JSON.stringify(r.hits)}  hairlines ${r.hairlines}`);
}
if (fails.length) {
  console.error(`FAIL (${fails.length})`);
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("PASS");
