import { join } from "node:path";
import {
  FIXTURE_A,
  SHOTS,
  assertNoOverflow,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  ensureTheme,
  gotoApp,
  keepCharts,
  launch,
} from "./_lib.mjs";
import { faceInFamily, typeFaces } from "../type-roles.mjs";

const FAMILIES = ["astronomicon", "noto", "starfont-sans", "starfont-serif"];
const FAMILY_FACE = {
  astronomicon: "Astronomicon",
  noto: null,
  "starfont-sans": "StarFont Sans",
  "starfont-serif": "StarFont Serif",
};
const PAIRINGS = {
  classic: { display: "Fraunces", sans: "Familjen Grotesk" },
  editorial: { display: "Source Serif 4", sans: "Source Sans 3" },
  clean: { display: "IBM Plex Serif", sans: "IBM Plex Sans" },
};
const STROKES = { thin: "0.75", regular: "1", heavy: "1.45" };
const LIGHT_L_MAX = 0.86;
const LIGHT_L_MIN = 0.6;
const SWATCH_VARS = [
  "--el-fire",
  "--el-earth",
  "--el-air",
  "--el-water",
  "--aspect-conj",
  "--aspect-hard",
  "--aspect-soft",
  "--aspect-minor",
  "--aspect-outer-conj",
  "--aspect-outer-hard",
  "--aspect-outer-soft",
  "--aspect-outer-minor",
];

async function nextFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}

async function openLook(page, lookPage = "type") {
  await clickDockTab(page, "look");
  await page.getByTestId("look-tab").waitFor({ timeout: 8000 });
  const pageBtn = page.getByTestId(`look-page-${lookPage}`);
  await pageBtn.waitFor({ state: "attached", timeout: 8000 });
  await pageBtn.evaluate((el) => {
    if (el instanceof HTMLElement) el.click();
  });
  if (lookPage === "profiles") {
    await page.getByTestId("look-profiles").waitFor({ timeout: 8000 });
    return;
  }
  await page.getByTestId("look-panel").waitFor({ timeout: 8000 });
}

function glyphQuery(root) {
  const node = document.querySelector(root);
  if (!node) return { missing: true, count: 0, paints: [], faces: [], unknown: 0 };
  const els = [...node.querySelectorAll("[data-glyph]")];
  const paints = [];
  const faces = [];
  let unknown = 0;
  for (const el of els) {
    const paint = el.getAttribute("data-paint") || "";
    const face = el.getAttribute("data-glyph-face") || "";
    paints.push(paint);
    if (paint === "unknown") unknown += 1;
    if (paint === "font" && face) faces.push(face);
  }
  return { missing: false, count: els.length, paints, faces, unknown };
}

function checkGlyphs(report, label, expectedFace) {
  if (report.missing) throw new Error(`${label}: root missing`);
  if (report.count < 1) throw new Error(`${label}: no [data-glyph]`);
  if (report.unknown) throw new Error(`${label}: data-paint=unknown (${report.unknown})`);
  const bad = report.paints.filter((p) => p && p !== "svg" && p !== "font" && p !== "num");
  if (bad.length) throw new Error(`${label}: unexpected data-paint ${[...new Set(bad)].join(",")}`);
  const unique = [...new Set(report.faces)];
  if (unique.length > 1) throw new Error(`${label}: mixed glyph faces ${unique.join(" | ")}`);
  if (expectedFace && unique.length && unique.some((f) => f !== expectedFace)) {
    throw new Error(`${label}: expected face ${expectedFace}, got ${unique.join(" | ")}`);
  }
}

async function glyphsIn(page, selector) {
  return page.evaluate(glyphQuery, selector);
}

async function portSize(page) {
  return page.locator("[data-testid=studio-natal] .ulune-wheel-zoom-inner").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
}

function samePort(a, b, label) {
  if (Math.abs(a.w - b.w) > 8 || Math.abs(a.h - b.h) > 8) {
    throw new Error(`${label}: wheel port reflow ${a.w}×${a.h} → ${b.w}×${b.h}`);
  }
}

async function assertSurfaces(page, expectedFace) {
  const natal = await glyphsIn(page, "[data-testid=studio-natal]");
  checkGlyphs(natal, "studio-natal", expectedFace);

  await clickDockTab(page, "reading");
  await page.getByTestId("chart-snapshot").waitFor({ timeout: 8000 });
  const hello = await glyphsIn(page, "[data-testid=chart-snapshot]");
  checkGlyphs(hello, "chart-snapshot", expectedFace);

  await clickDockTab(page, "bodies");
  await page.getByTestId("planet-strip").waitFor({ timeout: 8000 });
  const strip = await glyphsIn(page, "[data-testid=planet-strip]");
  checkGlyphs(strip, "planet-strip", expectedFace);

  await clickDockTab(page, "data");
  const points = page.getByTestId("table-points");
  if (!(await points.count())) {
    await page.getByTestId("table-section-points").click();
  }
  await points.waitFor({ timeout: 8000 });
  const table = await glyphsIn(page, "[data-testid=table-points]");
  checkGlyphs(table, "table-points", expectedFace);

  await openLook(page);
}

async function assertPairing(page, id) {
  const want = PAIRINGS[id];
  await page.locator(`[data-pairing="${id}"]`).click();
  const vars = await typeFaces(page);
  if (!faceInFamily(vars.display, want.display)) {
    throw new Error(`${id}: --font-display ${vars.display} ≠ ${want.display}`);
  }
  if (!faceInFamily(vars.sans, want.sans)) {
    throw new Error(`${id}: --font-sans ${vars.sans} ≠ ${want.sans}`);
  }

  // Chrome is Look-independent: panel tabs keep the UI face whatever the pairing.
  const tab = await page.getByTestId("dock-tab-reading").evaluate((el) => getComputedStyle(el).fontFamily);
  if (!/Familjen Grotesk/.test(tab)) {
    throw new Error(`${id}: dock tab family ${tab} should stay the UI face`);
  }

  await clickDockTab(page, "reading");
  await page.getByTestId("chart-snapshot").waitFor({ timeout: 8000 });
  const title = await page.locator(".ulune-hello-title").first().evaluate((el) => getComputedStyle(el).fontFamily);
  if (!faceInFamily(title, want.display)) {
    throw new Error(`${id}: hello title family ${title} ≠ ${want.display}`);
  }

  await clickDockTab(page, "data");
  const points = page.getByTestId("table-points");
  if (!(await points.count())) {
    await page.getByTestId("table-section-points").click();
  }
  await points.waitFor({ timeout: 8000 });
  const cell = await page.locator("[data-testid=table-points] td").first().evaluate((el) => getComputedStyle(el).fontFamily);
  if (!faceInFamily(cell, want.sans)) {
    throw new Error(`${id}: table cell family ${cell} ≠ ${want.sans}`);
  }
  await openLook(page);
}

async function parseLookStorage(page) {
  return page.evaluate(() => {
    const liveRaw = localStorage.getItem("ulune.look.v1");
    const libRaw = localStorage.getItem("ulune.look.library.v1");
    return {
      live: liveRaw ? JSON.parse(liveRaw) : null,
      library: libRaw ? JSON.parse(libRaw) : null,
    };
  });
}

async function runViewport(width) {
  const { browser, page } = await launch(width);
  const errors = [];
  const onError = (msg) => {
    const text = typeof msg === "string" ? msg : msg?.message ?? String(msg);
    if (/Download the React DevTools|favicon|\[vite\]|Fast Refresh/i.test(text)) return;
    errors.push(text);
  };
  try {
    await gotoApp(page);
    // The chart comes back after the reloads below: a private space that stays unlocked here.
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    await openLook(page, "profiles");
    await page.getByTestId("look-profiles").waitFor({ timeout: 8000 });
    await openLook(page, "type");
    await page.getByTestId("look-panel").waitFor({ timeout: 8000 });

    for (const id of FAMILIES) {
      await page.locator(`[data-glyph-family="${id}"]`).click();
      await nextFrame(page);
      const natal = await glyphsIn(page, "[data-testid=studio-natal]");
      checkGlyphs(natal, `studio-natal after ${id} (1 rAF)`, FAMILY_FACE[id]);
      await assertSurfaces(page, FAMILY_FACE[id]);
      console.log(`${width} glyphs ${id}`);
    }

    const stored = await parseLookStorage(page);
    if (stored.live?.glyphFamily !== "starfont-serif") {
      throw new Error(`ulune.look.v1.glyphFamily=${stored.live?.glyphFamily}`);
    }
    if (stored.library?.live?.glyphFamily !== "starfont-serif") {
      throw new Error(`ulune.look.library.v1 live.glyphFamily=${stored.library?.live?.glyphFamily}`);
    }
    await page.reload({ waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    const afterReload = await parseLookStorage(page);
    if (afterReload.live?.glyphFamily !== "starfont-serif") {
      throw new Error(`reload lost glyphFamily (${afterReload.live?.glyphFamily})`);
    }
    await openLook(page);
    const pressed = await page.locator('[data-glyph-family="starfont-serif"]').getAttribute("aria-pressed");
    if (pressed !== "true") throw new Error("reload did not keep StarFont Serif pressed");

    for (const id of Object.keys(PAIRINGS)) {
      await assertPairing(page, id);
      console.log(`${width} pairing ${id}`);
    }

    const beforePort = await portSize(page);
    for (const [id, value] of Object.entries(STROKES)) {
      await page.locator(`[data-stroke="${id}"]`).click();
      const stroke = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--wheel-stroke").trim(),
      );
      if (stroke !== value) throw new Error(`stroke ${id}: --wheel-stroke=${stroke} expected ${value}`);
      samePort(beforePort, await portSize(page), `stroke ${id}`);
    }

    const scale = page.getByTestId("look-text-scale");
    await scale.fill("90");
    let fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    if (fontSize !== "90%") throw new Error(`text scale 90 → html.fontSize=${fontSize}`);
    samePort(beforePort, await portSize(page), "text scale 90");
    await scale.fill("115");
    fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    if (fontSize !== "115%") throw new Error(`text scale 115 → html.fontSize=${fontSize}`);
    samePort(beforePort, await portSize(page), "text scale 115");
    await scale.fill("100");
    console.log(`${width} stroke+scale`);

    await page.locator('[data-pairing="editorial"]').click();
    await openLook(page, "profiles");
    const save = page.locator("[data-look-save]");
    if (await save.isDisabled()) throw new Error("look save disabled after pairing change");
    await save.click();
    const profileBtn = page.locator("[data-look-profile]:not([data-look-profile=default])").first();
    await profileBtn.waitFor({ timeout: 4000 });
    const profileId = await profileBtn.getAttribute("data-look-profile");
    await page.getByTestId("look-rename").fill("Wave7");
    await page.getByTestId("look-rename").press("Enter");
    await page.waitForFunction(
      (id) => document.querySelector(`[data-look-profile="${id}"]`)?.textContent?.trim() === "Wave7",
      profileId,
      { timeout: 4000 },
    );
    await page.locator("[data-look-profile=default]").click();
    const facesDefault = await typeFaces(page);
    if (!faceInFamily(facesDefault.display, PAIRINGS.classic.display)) {
      throw new Error(`default profile did not restore classic (${facesDefault.display})`);
    }
    await page.locator(`[data-look-profile="${profileId}"]`).click();
    const facesSaved = await typeFaces(page);
    if (!faceInFamily(facesSaved.display, PAIRINGS.editorial.display)) {
      throw new Error(`saved profile did not restore editorial (${facesSaved.display})`);
    }

    await page.reload({ waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    const lib1 = await parseLookStorage(page);
    const kept = lib1.library?.profiles?.find((p) => p.id === profileId);
    if (!kept || kept.name !== "Wave7") {
      throw new Error(`reload lost profile Wave7: ${JSON.stringify(lib1.library?.profiles)}`);
    }
    await openLook(page, "profiles");
    await page.locator(`[data-look-delete="${profileId}"]`).click();
    await page.reload({ waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    const lib2 = await parseLookStorage(page);
    if (lib2.library?.profiles?.some((p) => p.id === profileId)) {
      throw new Error("deleted profile persisted after reload");
    }
    console.log(`${width} profiles`);

    if (width === 1280) {
      page.on("pageerror", (err) => onError(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") onError(msg.text());
      });
      await openLook(page);
      await ensureTheme(page, "light");
      await page.waitForFunction(() => document.documentElement.classList.contains("light"), null, {
        timeout: 8000,
      });
      const lightL = await page.evaluate((vars) => {
        const inline = document.documentElement.style;
        return vars.map((name) => {
          const raw = inline.getPropertyValue(name).trim();
          const m = raw.match(/oklch\(\s*([0-9.]+)/i);
          return { name, raw, l: m ? Number(m[1]) : null };
        });
      }, SWATCH_VARS);
      const bright = lightL.filter((row) => row.l == null || row.l > LIGHT_L_MAX);
      if (bright.length) {
        throw new Error(
          `light swatches above L ${LIGHT_L_MAX}: ${bright.map((b) => `${b.name}=${b.raw}`).join("; ")}`,
        );
      }
      const dim = lightL.filter((row) => row.l != null && row.l < LIGHT_L_MIN);
      if (dim.length) {
        throw new Error(
          `light swatches below L ${LIGHT_L_MIN}: ${dim.map((b) => `${b.name}=${b.raw}`).join("; ")}`,
        );
      }
      if (errors.length) throw new Error(`light theme console errors: ${errors.join(" | ")}`);
      console.log(`${width} light`);
    }

    await assertNoOverflow(page);
    await page.screenshot({
      path: join(SHOTS, `w7-look-${width}.png`),
      timeout: 4000,
      animations: "disabled",
    }).catch(() => {});
    console.log(`w7-look-${width} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const fail = [];
for (const width of [390, 1280]) {
  try {
    await runViewport(width);
  } catch (err) {
    fail.push(`${width}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (fail.length) {
  console.error("W7 LOOK FAIL\n" + fail.map((l) => "- " + l).join("\n"));
  process.exit(1);
}
console.log("W7 LOOK OK", SHOTS);
