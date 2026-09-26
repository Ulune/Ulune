import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

await mkdir("/workspace/screenshots", { recursive: true });

const helloCopy = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/lib/i18n/natal-hello.json"), "utf8"),
);
if (helloCopy.id !== "natal.hello" || !Array.isArray(helloCopy.cells) || helloCopy.cells.length !== 3) {
  throw new Error("natal-hello.json must be the Quill Hello band");
}
const emptyCopy = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/lib/i18n/natal-empty.json"), "utf8"),
);
if (emptyCopy.id !== "natal.empty-reading" || emptyCopy.en !== "Click a body, a house, or an aspect in the wheel.") {
  throw new Error("natal-empty.json must be Quill’s empty click-reading line");
}
const clickNotes = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/lib/i18n/click-notes.json"), "utf8"),
);
if (clickNotes.id !== "natal.click-notes" || !clickNotes.atoms?.sun?.en) {
  throw new Error("click-notes.json must be Quill’s click.en atoms");
}
if (/plot of a life/.test(clickNotes.atoms.sun.en)) {
  throw new Error("sun click.en must not be teach.en");
}
if (/The (Sun|Moon|Ascendant) is the native/.test(JSON.stringify(helloCopy))) {
  throw new Error("natal-hello.json still has the long first sentences");
}
const QUILL = Object.fromEntries(helloCopy.cells.map((cell) => [cell.id, { label: cell.label, en: cell.en }]));
if (helloCopy.cells.map((cell) => cell.id).join(",") !== "sun,moon,ascendant") {
  throw new Error("Hello cells must be sun, moon, ascendant in that order");
}
for (const cell of helloCopy.cells) {
  if (/The (Sun|Moon|Ascendant) is the native/.test(cell.en)) {
    throw new Error(`natal-hello.json still has the long ${cell.id} sentence`);
  }
}

async function helloTypeContract(page, fail, viewport) {
  const ids = [
    ["natal-hello-sun", QUILL.sun],
    ["natal-hello-moon", QUILL.moon],
    ["natal-hello-asc", QUILL.ascendant],
  ];
  const boxes = [];
  for (const [testid, cell] of ids) {
    const root = page.getByTestId(testid);
    const box = await root.boundingBox();
    boxes.push(box);
    const label = await root.locator("[data-hello-label]").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { family: cs.fontFamily, size: cs.fontSize };
    });
    const title = await root.locator("[data-hello-title]").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { family: cs.fontFamily, text: (el.textContent || "").trim() };
    });
    const copy = await root.locator("[data-hello-copy]").evaluate((el) => {
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const lh = parseFloat(cs.lineHeight);
      return {
        family: cs.fontFamily,
        size,
        lhRatio: size ? lh / size : 0,
        lines: lh ? el.getBoundingClientRect().height / lh : 0,
        clamp: cs.webkitLineClamp,
        text: (el.textContent || "").trim(),
      };
    });
    if (title.text !== cell.label) fail.push(`${testid} title “${title.text}”`);
    const roles = await page.evaluate(() => {
      const first = (v) => v.replace(/['"]/g, "").split(",")[0].trim();
      const cs = getComputedStyle(document.documentElement);
      return {
        display: first(cs.getPropertyValue("--font-display")),
        sans: first(cs.getPropertyValue("--font-sans")),
      };
    });
    const has = (fam, face) => new RegExp(face.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(fam);
    if (!has(label.family, roles.sans)) fail.push(`${testid} label not body (${label.family})`);
    if (label.size !== "12px") fail.push(`${testid} label size ${label.size}`);
    if (!has(title.family, roles.display)) fail.push(`${testid} title not display (${title.family})`);
    if (has(copy.family, roles.display) && roles.display !== roles.sans) {
      fail.push(`${testid} sentence is display (${copy.family})`);
    }
    if (!has(copy.family, roles.sans)) fail.push(`${testid} sentence not body (${copy.family})`);
    if (copy.size < 15.5 || copy.size > 18.5) fail.push(`${testid} sentence size ${copy.size}px`);
    if (Math.abs(copy.lhRatio - 1.45) > 0.06) fail.push(`${testid} sentence line-height ${copy.lhRatio.toFixed(3)}`);
    if (copy.clamp !== "2") fail.push(`${testid} line-clamp ${copy.clamp}`);
    if (copy.lines > 2.2) fail.push(`${testid} wraps ${copy.lines.toFixed(2)} lines at ${viewport}`);
    if (copy.text !== cell.en) fail.push(`${testid} copy mismatch`);
    if (/The (Sun|Moon|Ascendant) is the native/.test(copy.text)) {
      fail.push(`${testid} still has the long first sentence`);
    }
  }
  return boxes;
}

const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function openBirth(page) {
  const birth = page.locator('[data-fold="birth"]');
  if ((await birth.getAttribute("data-open")) !== "1") {
    await birth.locator("button[aria-expanded]").first().click();
  }
}

async function castDemo(page) {
  await openBirth(page);
  await page.locator("#native-name").fill("Demo");
  await page.locator("#birth-date").fill("1990-06-15");
  await page.locator("#birth-time").fill("14:30");
  await page.locator("#birth-place").fill("Paris");
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
}

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (err) => fail.push(`pageerror ${String(err)}`));
await page.addInitScript(() => {
  try {
    if (sessionStorage.getItem("qa-natal-booted")) return;
    sessionStorage.setItem("qa-natal-booted", "1");
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.folds.v3");
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    localStorage.setItem("ulune.studio.page", "natal");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

await castDemo(page);
await page.waitForTimeout(500);

if ((await page.getByTestId("studio-page-natal").getAttribute("aria-selected")) !== "true") {
  fail.push("post-cast tab is not natal");
}
if (/[?&]studio=/.test(page.url())) fail.push(`natal URL still has studio param (${page.url()})`);

const sky = page.getByTestId("natal-sky");
const hello = page.getByTestId("chart-snapshot");
const natalTable = page.getByTestId("natal-table");
const mixer = page.locator('[data-fold="mixer"]');
const look = page.locator('[data-fold="look"]');
const wheel = page.locator("svg.ulune-wheel");

const order = await page.evaluate(() => {
  const natal = document.querySelector("[data-testid=studio-natal]");
  if (!natal) return [];
  return [...natal.children].map((el) => {
    if (el.getAttribute("data-testid") === "natal-sky") return "sky";
    if (el.getAttribute("data-testid") === "chart-snapshot") return "hello";
    if (el.getAttribute("data-testid") === "natal-table") return "table";
    if (el.getAttribute("data-testid") === "cast-tools") return "tools";
    return el.getAttribute("data-testid") || el.tagName;
  });
});
if (order[0] !== "sky" || order[1] !== "hello" || order[2] !== "table") {
  fail.push(`band order ${JSON.stringify(order)}`);
}

const skyBox = await sky.boundingBox();
const helloBox = await hello.boundingBox();
const tableBox = await natalTable.boundingBox();
const mixerBox = await mixer.boundingBox();
const wheelBox = await wheel.boundingBox();
const wheelCol = await page.locator(".ulune-sky-wheel").boundingBox();
const readBox = await page.getByTestId("natal-sky-read").boundingBox();

if (!skyBox || !wheelBox || !readBox || !wheelCol) fail.push("sky/wheel/reading missing");
else {
  if (wheelBox.y > 800 * 0.62) fail.push(`desktop wheel below the fold (y=${Math.round(wheelBox.y)})`);
  if (readBox.x < wheelBox.x + wheelBox.width * 0.45) {
    fail.push("desktop reading is not beside the wheel");
  }
  const pad = await sky.evaluate((el) => getComputedStyle(el).paddingTop);
  if (pad !== "24px") fail.push(`sky padding-top ${pad}`);
  if (wheelCol.width + 8 < 520) fail.push(`desktop wheel column narrower than 520 (${Math.round(wheelCol.width)})`);
  const inner = skyBox.width - 48;
  const ratio = wheelCol.width / inner;
  if (ratio < 0.5 || ratio > 0.62) fail.push(`desktop wheel width ratio ${ratio.toFixed(2)}`);
}

if (mixerBox && wheelBox && mixerBox.y <= wheelBox.y) fail.push("mixer still above the wheel");
if (helloBox && wheelBox && helloBox.y + 4 < wheelBox.y + wheelBox.height * 0.4) {
  fail.push("hello band is not under the sky");
}
if (tableBox && helloBox && tableBox.y < helloBox.y) fail.push("table band above hello");

const helloText = (await hello.innerText()).replace(/\s+/g, " ");
if (!/Sun/.test(helloText) || !/Moon/.test(helloText) || !/Ascendant/.test(helloText)) {
  fail.push(`hello missing sun/moon/ascendant: ${helloText.slice(0, 180)}`);
}
if (/Chart ruler|Tightest aspect|Dominant configuration/.test(helloText)) {
  fail.push("hello still has ruler/sect/config chips");
}
if (/The Sun is the native|The Moon is the native|The Ascendant is the native/.test(helloText)) {
  fail.push("hello still has the long first sentences");
}
if (/Gemini|Pisces|Libra|\d+°/.test(helloText)) {
  fail.push("hello composed planet-in-sign");
}
if ((await hello.getByTestId("natal-hello-sun").count()) !== 1) fail.push("missing sun cell");
if ((await hello.getByTestId("natal-hello-moon").count()) !== 1) fail.push("missing moon cell");
if ((await hello.getByTestId("natal-hello-asc").count()) !== 1) fail.push("missing asc cell");

const desktopHello = await helloTypeContract(page, fail, "1280");
if (desktopHello.every(Boolean)) {
  const widths = desktopHello.map((b) => b.width);
  if (Math.max(...widths) - Math.min(...widths) > 2) {
    fail.push(`hello cells not equal width (${widths.map((w) => Math.round(w)).join(",")})`);
  }
}

if ((await mixer.getAttribute("data-open")) !== "0") fail.push("mixer open by default");
if ((await look.getAttribute("data-open")) !== "0") fail.push("look open by default");

const tableTag = await natalTable.locator("table.ulune-data-table").count();
if (!tableTag) fail.push("natal table band has no table");
if (await natalTable.locator("article").count()) fail.push("natal table band still has cards");
if (await natalTable.getByTestId("table-identity").count()) {
  fail.push("Identity still sits in the natal table band between Hello and Table");
}
const natalFirstSection = await natalTable.locator("section[data-testid]").first().getAttribute("data-testid");
if (natalFirstSection !== "table-points") {
  fail.push(`natal table does not start with Points (${natalFirstSection})`);
}
const gapChrome = await page.evaluate(() => {
  const hello = document.querySelector("[data-testid=chart-snapshot]");
  const table = document.querySelector("[data-testid=natal-table]");
  const points = table?.querySelector("[data-testid=table-points]");
  if (!hello || !table || !points) return "missing";
  const helloBottom = hello.getBoundingClientRect().bottom;
  const pointsTop = points.getBoundingClientRect().top;
  const between = [...table.children].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > helloBottom + 1 && r.top < pointsTop - 1;
  });
  return between.map((el) => el.getAttribute("data-testid") || el.className || el.tagName).join(",") || "";
});
if (gapChrome) fail.push(`chrome between Hello and Table: ${gapChrome}`);

const emptyRead = page.getByTestId("click-reading-empty");
if (!(await emptyRead.count())) fail.push("missing empty click-reading copy");
else {
  const empty = await emptyRead.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { text: (el.textContent || "").trim(), family: cs.fontFamily, size: parseFloat(cs.fontSize) };
  });
  if (empty.text !== emptyCopy.en) {
    fail.push(`empty click-reading copy “${empty.text}”`);
  }
  if (/cormorant|garamond|serif/i.test(empty.family) && !/sans/i.test(empty.family)) {
    fail.push(`empty click-reading still display serif (${empty.family})`);
  }
  if (empty.size < 15.5 || empty.size > 18.5) fail.push(`empty click-reading not body size (${empty.size}px)`);
}
const skyReadText = (await page.getByTestId("natal-sky-read").innerText()).replace(/\s+/g, " ");
if (/Nothing selected/.test(skyReadText)) fail.push("empty click-reading still says Nothing selected");

await page.screenshot({ path: "/workspace/screenshots/natal-demo-desktop.png" });

await page.getByTestId("natal-hello-sun").click();
await page.waitForTimeout(200);
const reading = (await page.getByTestId("natal-sky-read").innerText()).replace(/\s+/g, " ");
if (!reading.includes(clickNotes.atoms.sun.en)) {
  fail.push(`click slot is not sun click.en: ${reading.slice(0, 180)}`);
}
if (/The Sun is the plot of a life/.test(reading)) fail.push("click slot still shows teach.en");
if (/In (Aries|Taurus|Gemini|Cancer|Leo) you/.test(reading)) {
  fail.push("click slot is a planet-in-sign essay");
}
const sunStar = page.getByTestId("natal-sky-read").getByTestId("reading-ai");
const sunStarBox = await sunStar.boundingBox();
const sunStarIcon = await sunStar.locator("svg").boundingBox();
if (!sunStarBox || Math.abs(sunStarBox.width - 44) > 1 || Math.abs(sunStarBox.height - 44) > 1) {
  fail.push(`reading star hit ${sunStarBox?.width}x${sunStarBox?.height}, expected 44x44`);
}
if (!sunStarIcon || Math.abs(sunStarIcon.width - 16) > 1 || Math.abs(sunStarIcon.height - 16) > 1) {
  fail.push(`reading star icon ${sunStarIcon?.width}x${sunStarIcon?.height}, expected 16x16`);
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(200);
await page.evaluate(() => window.scrollTo(0, 520));
await page.waitForTimeout(200);
const pin = await page.evaluate(() => {
  const header = document.querySelector("header");
  const readHead = document.querySelector("[data-testid='natal-sky-read'] .ulune-sky-read-head");
  const star = document.querySelector("[data-testid='natal-sky-read'] [data-testid='reading-ai']");
  const h = header?.getBoundingClientRect();
  const r = readHead?.getBoundingClientRect();
  const s = star?.getBoundingClientRect();
  const cs = readHead ? getComputedStyle(readHead.parentElement) : null;
  return {
    headerBottom: h?.bottom ?? 0,
    readTop: r?.top ?? 0,
    starTop: s?.top ?? 0,
    starH: s?.height ?? 0,
    covered: Boolean(h && r && r.top + 1 < h.bottom),
    starCovered: Boolean(h && s && s.top + 1 < h.bottom),
    sticky: cs?.position ?? "",
  };
});
if (pin.covered) fail.push(`desktop 1440: click reading sits under chrome (${Math.round(pin.readTop)} < ${Math.round(pin.headerBottom)})`);
if (pin.starCovered) fail.push(`desktop 1440: reading star sits under chrome (${Math.round(pin.starTop)} < ${Math.round(pin.headerBottom)})`);
if (Math.abs(pin.starH - 44) > 1) fail.push(`desktop 1440 star hit ${pin.starH}`);
await page.setViewportSize({ width: 1280, height: 800 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(150);

await page.locator("svg.ulune-wheel [data-kind='planet']").first().click({ force: true });
await page.waitForTimeout(200);

const tableTab = page.getByTestId("studio-page-table");
await tableTab.scrollIntoViewIfNeeded();
await tableTab.click();
await page.getByTestId("studio-table").waitFor({ state: "visible", timeout: 20000 });
if (!/[?&]studio=table(?:&|$)/.test(page.url())) fail.push(`table URL missing (${page.url()})`);
if (!(await page.getByTestId("studio-table").locator("table").count())) {
  fail.push("studio table page is not a table");
}
if (!(await page.getByTestId("studio-table").getByTestId("table-identity").count())) {
  fail.push("studio table lost Identity");
}
await page.screenshot({ path: "/workspace/screenshots/natal-demo-table.png" });

await page.reload({ waitUntil: "networkidle", timeout: 45000 });
await page.getByTestId("studio-table").waitFor({ timeout: 15000 });
if (!/[?&]studio=table(?:&|$)/.test(page.url())) fail.push(`table URL lost on reload (${page.url()})`);

await page.getByTestId("studio-page-numerology").scrollIntoViewIfNeeded();
await page.getByTestId("studio-page-numerology").click();
await page.getByTestId("studio-numerology").waitFor({ timeout: 15000 });
if (!(await page.getByTestId("numerology-ring").count())) fail.push("numerology missing 1–9 ring");
if (!(await page.getByTestId("numerology-hello").count())) fail.push("numerology missing Hello");
if (!(await page.getByTestId("numerology-table").count())) fail.push("numerology missing table");
if (!/[?&]studio=numerology/.test(page.url())) fail.push(`numerology URL missing (${page.url()})`);

await page.getByTestId("studio-page-design").click();
await page.getByTestId("studio-humandesign").waitFor({ timeout: 15000 });
if (!(await page.getByTestId("hd-graph").count())) fail.push("human design missing bodygraph");
await page.getByTestId("studio-page-natal").click();
await page.getByTestId("studio-natal").waitFor({ timeout: 15000 });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 8) fail.push(`phone overflow ${overflow}`);
const chromeHits = await page.evaluate(() => {
  const ai = document.querySelector("[data-testid='ai-accounts']")?.getBoundingClientRect();
  const neu = document.querySelector("[data-testid='new-chart']")?.getBoundingClientRect();
  const sign = document.querySelector("[data-testid='sign-in']")?.getBoundingClientRect();
  return { aiH: ai?.height ?? 0, aiW: ai?.width ?? 0, newH: neu?.height ?? 0, signH: sign?.height ?? 0 };
});
if (Math.abs(chromeHits.aiH - 44) > 2 || Math.abs(chromeHits.aiW - 44) > 2) {
  fail.push(`phone Your AI hit ${chromeHits.aiW}x${chromeHits.aiH}, expected 44x44`);
}
if (chromeHits.newH < 43) fail.push(`phone New hit ${chromeHits.newH}`);
if (chromeHits.signH && Math.abs(chromeHits.signH - 44) > 2) {
  fail.push(`phone Sign in hit ${chromeHits.signH}, expected 44`);
}

const mWheel = await wheel.boundingBox();
const mRead = await page.getByTestId("natal-sky-read").boundingBox();
const mHello = await hello.boundingBox();
const mMixer = await mixer.boundingBox();
if (!mWheel) fail.push("phone wheel missing");
else {
  if (mWheel.y > 844 * 0.55) fail.push(`phone wheel below the fold (y=${Math.round(mWheel.y)})`);
  if (mRead && mRead.y + 8 < mWheel.y + mWheel.height) fail.push("phone reading not under the wheel");
  if (mRead && mWheel) {
    const col = await page.locator(".ulune-sky-wheel").boundingBox();
    const gap = mRead.y - ((col?.y ?? mWheel.y) + (col?.height ?? mWheel.height));
    if (Math.abs(gap - 16) > 6) fail.push(`phone sky gap ${Math.round(gap)}`);
  }
  if (mMixer && mMixer.y <= mWheel.y) fail.push("phone mixer above the wheel");
}
const sunCell = await page.getByTestId("natal-hello-sun").boundingBox();
const moonCell = await page.getByTestId("natal-hello-moon").boundingBox();
if (!sunCell || sunCell.height < 44) fail.push(`phone hello row too short (${sunCell?.height})`);
if (sunCell && moonCell && moonCell.y < sunCell.y + sunCell.height - 4) {
  fail.push("phone hello is not one cell per row");
}
if (mHello && mWheel && mHello.y < mWheel.y) fail.push("phone hello above the wheel");

await page.getByTestId("natal-hello-sun").click();
await page.waitForTimeout(200);
const phoneReading = (await page.getByTestId("natal-sky-read").innerText()).replace(/\s+/g, " ");
if (!phoneReading.includes(clickNotes.atoms.sun.en)) {
  fail.push(`phone click slot is not sun click.en: ${phoneReading.slice(0, 180)}`);
}
if (/The Sun is the plot of a life/.test(phoneReading)) fail.push("phone click slot still shows teach.en");
const phoneStar = page.getByTestId("natal-sky-read").getByTestId("reading-ai");
const phoneStarBox = await phoneStar.boundingBox();
const phoneStarIcon = await phoneStar.locator("svg").boundingBox();
if (!phoneStarBox || Math.abs(phoneStarBox.width - 44) > 1 || Math.abs(phoneStarBox.height - 44) > 1) {
  fail.push(`phone reading star hit ${phoneStarBox?.width}x${phoneStarBox?.height}, expected 44x44`);
}
if (!phoneStarIcon || Math.abs(phoneStarIcon.width - 16) > 1 || Math.abs(phoneStarIcon.height - 16) > 1) {
  fail.push(`phone reading star icon ${phoneStarIcon?.width}x${phoneStarIcon?.height}, expected 16x16`);
}

await page.setViewportSize({ width: 360, height: 800 });
await page.waitForTimeout(300);
await helloTypeContract(page, fail, "360");
await page.screenshot({ path: "/workspace/screenshots/natal-demo-phone-360.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);

const freeze = await page.evaluate(() => {
  const td = document.querySelector("[data-testid=natal-table] td:first-child");
  if (!td) return "";
  return getComputedStyle(td).position;
});
if (freeze !== "sticky") fail.push(`phone body column not frozen (${freeze})`);

await page.screenshot({ path: "/workspace/screenshots/natal-demo-phone.png" });

await browser.close();
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("NATAL_PRESENTATION_OK");
