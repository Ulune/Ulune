import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const SHOTS = existsSync("/workspace") ? "/workspace/screenshots" : join(process.cwd(), "screenshots");
await mkdir(SHOTS, { recursive: true });

/** Bodies drawn as PlanetGlyph on the natal ring. Angles are ASC/MC labels. */
const WHEEL_BODIES = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "northnode",
  "southnode",
  "lilith",
  "vertex",
  "antivertex",
  "fortune",
  "spirit",
  "ceres",
  "juno",
  "vesta",
  "eris",
  "sedna",
];

const MIXER_BODIES = [
  ...WHEEL_BODIES,
  "ascendant",
  "midheaven",
  "descendant",
  "ic",
];

const SVG_ONLY = new Set([
  "vertex",
  "antivertex",
  "fortune",
  "spirit",
  "ascendant",
  "midheaven",
  "descendant",
  "ic",
]);

const PAIRINGS = {
  classic: "Outfit",
  editorial: "Source Sans 3",
  clean: "IBM Plex Sans",
};

const errors = [];
const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});
page.on("pageerror", (err) => errors.push("page: " + String(err)));

await page.addInitScript(() => {
  try {
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.look.v1");
    localStorage.removeItem("ulune.look.library.v1");
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 30000 });
await page.waitForSelector("html.theme-ready", { timeout: 20000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

if (await page.getByTestId("studio-natal").count()) {
  await page.getByTestId("new-chart").click();
  await page.waitForSelector("#birth-date", { timeout: 8000 });
}

await page.locator("#native-name").fill("Glyph Check");
await page.locator("#birth-date").fill("1990-06-15");
await page.locator("#birth-time").fill("14:30");
await page.locator("#birth-place").fill("Paris");
await page.getByTestId("cast-submit").click();
await page.locator(".ulune-wheel").waitFor({ timeout: 40000 });

const mixerFold = page.locator('[data-fold="mixer"]');
await mixerFold.scrollIntoViewIfNeeded();
if ((await mixerFold.getAttribute("data-open")) !== "1") {
  await mixerFold.locator("button[aria-expanded]").first().click();
}
await page.getByTestId("body-mixer").waitFor({ timeout: 8000 });
await page.locator('[data-preset="all"]').click();
await page.waitForTimeout(400);

const lookFold = page.locator('[data-fold="look"]');
await lookFold.scrollIntoViewIfNeeded();
if ((await lookFold.getAttribute("data-open")) !== "1") {
  await lookFold.locator("button[aria-expanded]").first().click();
}
await page.getByTestId("look-panel").waitFor({ state: "visible", timeout: 8000 });

async function auditPairing(pairing, suffix) {
  const face = PAIRINGS[pairing];
  await page.locator(`[data-pairing="${pairing}"]`).click();
  await page.evaluate(async (name) => {
    try {
      await document.fonts.load(`64px "${name}"`);
    } catch {
      /* ignore */
    }
    await document.fonts.ready;
  }, face);
  await page.waitForFunction(
    () => {
      const mark = document.querySelector('[data-kind="house-num"][data-hl="house:1"] [data-glyph]');
      return mark?.getAttribute("data-paint") === "font";
    },
    { timeout: 12000 },
  );

  const stack = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--font-glyphs"),
  );
  const lookRe = new RegExp(face.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (!lookRe.test(stack)) fail.push(`${pairing}: --font-glyphs missing Look face ${face} (${stack})`);
  if (!/^[^,]*Outfit|^[^,]*Source Sans|^[^,]*IBM Plex/i.test(stack.trim())) {
    fail.push(`${pairing}: --font-glyphs Look face is not first (${stack})`);
  }
  if (!/Noto Sans Symbols/.test(stack)) {
    fail.push(`${pairing}: --font-glyphs missing Noto (${stack})`);
  }
  const notoAt = stack.indexOf("Noto Sans Symbols");
  const genericAt = stack.search(/system-ui|sans-serif/);
  if (genericAt >= 0 && notoAt > genericAt) {
    fail.push(`${pairing}: Noto must sit before generics (${stack})`);
  }

  const report = await page.evaluate(
    ({ ids, faceName, svgOnly }) => {
      const missing = [];
      const empty = [];
      const wrongFace = [];
      const shouldSvg = [];
      const tofu = [];
      const svgOnlySet = new Set(svgOnly);
      for (const id of ids) {
        const host = document.querySelector(`[data-kind="planet"][data-body="${id}"]`);
        const mark = host?.querySelector("[data-glyph]");
        if (!host || !mark) {
          missing.push(id);
          continue;
        }
        const paint = mark.getAttribute("data-paint");
        if (svgOnlySet.has(id) && paint !== "svg") {
          shouldSvg.push(`${id}:${paint}`);
        }
        if (paint === "font") {
          const text = mark.querySelector("text");
          const raw = (text?.textContent ?? "").replace(/\uFE0E/g, "");
          if (!raw) empty.push(id);
          const textFam = text ? getComputedStyle(text).fontFamily : "";
          if (!new RegExp(faceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(textFam)) {
            wrongFace.push(`${id}:${textFam}`);
          }
          try {
            const box = text?.getBBox?.();
            if (box && box.width < 0.5 && box.height < 0.5) tofu.push(id);
          } catch {
            /* not rendered */
          }
        } else if (paint === "svg") {
          if (!mark.querySelector("path, circle, rect")) empty.push(id);
        } else {
          empty.push(id);
        }
      }
      return { missing, empty, wrongFace, shouldSvg, tofu };
    },
    { ids: WHEEL_BODIES, faceName: face, svgOnly: [...SVG_ONLY] },
  );

  if (report.missing.length) fail.push(`${pairing} missing on wheel: ${report.missing.join(",")}`);
  if (report.empty.length) fail.push(`${pairing} empty mark: ${report.empty.join(",")}`);
  if (report.wrongFace.length) fail.push(`${pairing} font paint not Look ${face}: ${report.wrongFace.join(",")}`);
  if (report.shouldSvg.length) fail.push(`${pairing} SVG-only id used font: ${report.shouldSvg.join(",")}`);
  if (report.tofu.length) fail.push(`${pairing} font glyph has empty bbox: ${report.tofu.join(",")}`);

  const mixerEmpty = await page.evaluate(
    ({ ids, svgOnly }) => {
      const blank = [];
      const svgOnlySet = new Set(svgOnly);
      for (const id of ids) {
        const chip = document.querySelector(`[data-testid="body-mixer"] [data-body="${id}"] [data-glyph]`);
        if (!chip) {
          blank.push(id);
          continue;
        }
        const paint = chip.getAttribute("data-paint");
        if (svgOnlySet.has(id) && paint !== "svg") {
          blank.push(`${id}:expected-svg`);
          continue;
        }
        if (paint === "font") {
          const raw = (chip.querySelector("text")?.textContent ?? "").replace(/\uFE0E/g, "");
          if (!raw) blank.push(id);
        } else if (paint === "svg") {
          if (!chip.querySelector("path, circle, rect")) blank.push(id);
        } else {
          blank.push(id);
        }
      }
      return blank;
    },
    { ids: MIXER_BODIES, svgOnly: [...SVG_ONLY] },
  );
  if (mixerEmpty.length) fail.push(`${pairing} mixer blank: ${mixerEmpty.join(",")}`);

  for (const angle of ["ascendant", "midheaven", "descendant", "ic"]) {
    const n = await page.locator(`[data-kind="angle"][data-body="${angle}"]`).count();
    if (!n) fail.push(`${pairing} angle spoke missing: ${angle}`);
  }

  const houseReport = await page.evaluate((faceName) => {
    const blank = [];
    const notFont = [];
    const wrongFace = [];
    const look = new RegExp(faceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    for (let n = 1; n <= 12; n += 1) {
      const host = document.querySelector(`[data-kind="house-num"][data-hl="house:${n}"]`);
      const mark = host?.querySelector("[data-glyph]");
      if (!mark) {
        blank.push(String(n));
        continue;
      }
      const paint = mark.getAttribute("data-paint");
      if (paint !== "num" && paint !== "font" && paint !== "svg") {
        notFont.push(`${n}:${paint}`);
        continue;
      }
      if (paint === "svg") {
        if (!mark.querySelector("path, circle, rect")) blank.push(`${n}:empty-svg`);
        continue;
      }
      const text = mark.querySelector("text");
      const raw = (text?.textContent ?? "").replace(/\uFE0E/g, "");
      if (raw !== String(n)) blank.push(`${n}:${raw}`);
      if (paint === "num") {
        const fam = text ? getComputedStyle(text).fontFamily : "";
        if (!/mono|plex|ibm/i.test(fam)) wrongFace.push(`${n}:${fam}`);
      }
    }
    return { blank, notFont, wrongFace };
  }, face);
  if (houseReport.blank.length) fail.push(`${pairing} house numbers blank: ${houseReport.blank.join(",")}`);
  if (houseReport.notFont.length) {
    fail.push(`${pairing} house numbers missing paint: ${houseReport.notFont.join(",")}`);
  }
  if (houseReport.wrongFace.length) {
    fail.push(`${pairing} house face mismatch: ${houseReport.wrongFace.join(",")}`);
  }

  const signBlank = await page.evaluate(() => {
    const blank = [];
    const seen = new Set();
    for (const host of document.querySelectorAll('[data-kind="sign-glyph"]')) {
      const id = host.getAttribute("data-sign");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const mark = host.querySelector("[data-glyph]");
      if (!mark) {
        blank.push(id);
        continue;
      }
      const paint = mark.getAttribute("data-paint");
      if (paint === "font") {
        const raw = (mark.querySelector("text")?.textContent ?? "").replace(/\uFE0E/g, "");
        if (!raw) blank.push(id);
      } else if (paint === "svg") {
        if (!mark.querySelector("path, circle, rect")) blank.push(id);
      } else {
        blank.push(id);
      }
    }
    return blank;
  });
  if (signBlank.length) fail.push(`${pairing} sign glyphs blank: ${signBlank.join(",")}`);

  await page.locator(".ulune-wheel").screenshot({
    path: join(SHOTS, `glyph-fonts-${pairing}${suffix}.png`),
  });
}

for (const pairing of Object.keys(PAIRINGS)) {
  await auditPairing(pairing, "");
}

const form = await page.evaluate(() => {
  const sky = document.querySelector(".ulune-sky-wheel");
  const port = document.querySelector(".ulune-wheel-zoom-port");
  const stage = document.querySelector(".ulune-wheel-stage");
  const bar = document.querySelector(".ulune-wheel-zoom-bar");
  if (!sky || !port || !stage || !bar) return { ok: false, reason: "missing nodes" };
  const skyBox = sky.getBoundingClientRect();
  const portBox = port.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const barBox = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const gap = parseFloat(cs.gap) || 0;
  const d = Math.min(port.clientWidth, port.clientHeight) - 16;
  const diameterOk = Math.abs(stageBox.width - d) <= 2.5 && Math.abs(stageBox.height - d) <= 2.5;
  const overlay = cs.position === "absolute";
  const insetRight = Math.abs(skyBox.right - barBox.right - 16) <= 3;
  const insetBottom = Math.abs(skyBox.bottom - barBox.bottom - 16) <= 3;
  const gapOk = Math.abs(gap - 8) <= 1;
  return {
    ok: diameterOk && overlay && insetRight && insetBottom && gapOk && d > 200,
    diameterOk,
    overlay,
    insetRight,
    insetBottom,
    gapOk,
    d,
    stw: stageBox.width,
    sth: stageBox.height,
    gap,
    right: skyBox.right - barBox.right,
    bottom: skyBox.bottom - barBox.bottom,
  };
});
if (!form.ok) fail.push(`Form zoom layout ${JSON.stringify(form)}`);

const zoomBar = page.getByTestId("wheel-zoom-bar");
if (!(await zoomBar.count())) fail.push("missing wheel zoom bar");
const inBtn = page.getByTestId("wheel-zoom-in");
const outBtn = page.getByTestId("wheel-zoom-out");
const fitBtn = page.getByTestId("wheel-zoom-fit");
for (const [name, loc] of [
  ["in", inBtn],
  ["out", outBtn],
  ["fit", fitBtn],
]) {
  const box = await loc.boundingBox();
  if (!box || box.height < 43 || box.width < 43) {
    fail.push(`zoom ${name} hit < 44px (${box ? `${box.width}x${box.height}` : "missing"})`);
  }
}
await inBtn.click();
await page.waitForTimeout(80);
const zoomed = await page.locator(".ulune-wheel-zoom-port").getAttribute("data-zoom");
if (!zoomed || Number(zoomed) <= 1.01) fail.push(`zoom + did not grow (data-zoom=${zoomed})`);
if (Number(zoomed) > 2.5 + 0.01) fail.push(`zoom exceeded 2.5× (data-zoom=${zoomed})`);
await fitBtn.click();
await page.waitForTimeout(80);
const fitted = await page.locator(".ulune-wheel-zoom-port").getAttribute("data-zoom");
if (!fitted || Number(fitted) > 1.01) fail.push(`Fit did not return to 1× (data-zoom=${fitted})`);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await auditPairing("classic", "-mobile");
await auditPairing("editorial", "-mobile");
await auditPairing("clean", "-mobile");

const mobileZoom = await page.getByTestId("wheel-zoom-in").boundingBox();
if (!mobileZoom || mobileZoom.height < 43 || mobileZoom.width < 43) {
  fail.push(`mobile zoom hit < 44px (${mobileZoom ? `${mobileZoom.width}x${mobileZoom.height}` : "missing"})`);
}
const mobileForm = await page.evaluate(() => {
  const sky = document.querySelector(".ulune-sky-wheel");
  const port = document.querySelector(".ulune-wheel-zoom-port");
  const stage = document.querySelector(".ulune-wheel-stage");
  const bar = document.querySelector(".ulune-wheel-zoom-bar");
  if (!sky || !port || !stage || !bar) return { ok: false };
  const skyBox = sky.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const barBox = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const d = Math.min(port.clientWidth, port.clientHeight) - 16;
  const overlay = cs.position === "absolute";
  const fullWidth = stageBox.width / skyBox.width >= 0.88;
  const insetRight = Math.abs(skyBox.right - barBox.right - 16) <= 3;
  const insetBottom = Math.abs(skyBox.bottom - barBox.bottom - 16) <= 3;
  return {
    ok: overlay && fullWidth && insetRight && insetBottom && Math.abs(stageBox.width - d) <= 2.5,
    overlay,
    fullWidth,
    insetRight,
    insetBottom,
    d,
    stw: stageBox.width,
    skyW: skyBox.width,
  };
});
if (!mobileForm.ok) fail.push(`phone Form zoom layout ${JSON.stringify(mobileForm)}`);

await page.setViewportSize({ width: 1280, height: 800 });
await page.getByTestId("studio-page-table").click();
await page.getByTestId("studio-table").waitFor({ timeout: 8000 });
const tableBlank = await page.evaluate((ids) => {
  const blank = [];
  for (const id of ids) {
    const row = document.querySelector(`[data-testid="studio-table"] [data-body="${id}"] [data-glyph]`);
    if (!row) blank.push(id);
  }
  return blank;
}, MIXER_BODIES);
if (tableBlank.length) fail.push(`table missing glyphs: ${tableBlank.join(",")}`);
await page.getByTestId("studio-table").screenshot({
  path: join(SHOTS, "glyph-fonts-table.png"),
});

await page.getByTestId("studio-page-natal").click();
await page.locator(".ulune-wheel").waitFor();
await page.locator('[data-kind="planet"][data-body="ceres"]').click({ force: true });
await page.waitForTimeout(300);
const reading = await page.locator('[data-fold="click"]').innerText();
if (!/ceres/i.test(reading)) fail.push(`click reading did not open Ceres: ${reading.slice(0, 180)}`);
const readingGlyph = await page.locator('[data-fold="click"] [data-glyph="ceres"]').count();
if (!readingGlyph) fail.push("click reading missing Ceres glyph");

await page.getByTestId("studio-page-numerology").click();
await page.getByTestId("numerology-sky").waitFor({ timeout: 15000 });
if (await page.locator('[data-testid="numerology-sky"] [data-testid="wheel-zoom"]').count()) {
  fail.push("numerology sky must not have wheel zoom");
}

await page.getByTestId("studio-page-design").click();
await page.getByTestId("hd-sky").waitFor({ timeout: 20000 });
if (await page.locator('[data-testid="hd-sky"] [data-testid="wheel-zoom"]').count()) {
  fail.push("HD sky must not have wheel zoom");
}

if (errors.length) fail.push("page errors: " + errors.slice(0, 5).join(" | "));

await browser.close();

if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
