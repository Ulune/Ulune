import { chromium } from "playwright";
import { typeFaces, faceInFamily } from "./type-roles.mjs";

const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  localStorage.removeItem("ulune.look.v1");
  localStorage.removeItem("ulune.look.library.v1");
  localStorage.setItem("ulune.locale", "en");
});
await page.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 45000 });
await page.waitForSelector("html.theme-ready", { timeout: 20000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });
if (await page.getByTestId("new-chart").count()) {
  await page.getByTestId("new-chart").click();
  await page.waitForSelector("#birth-date", { timeout: 8000 });
}
await page.locator("#native-name").fill("TraceQA");
await page.locator("#birth-date").fill("15/06/1990");
await page.locator("#birth-time").fill("12:00");
await page.locator("#birth-place").fill("48.8566, 2.3522");
await page.locator("#birth-place").blur();
await page.getByTestId("cast-submit").click();
await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });

async function sample() {
  const roles = await typeFaces(page);
  const bits = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { fam: cs.fontFamily, text: (el.textContent || "").trim().slice(0, 40) };
    };
    return {
      brand: pick("[data-testid='app-header'] .font-display, header .font-display"),
      helloTitle: pick("[data-hello-title], .ulune-hello-title"),
      helloCopy: pick("[data-hello-copy], .ulune-hello-copy"),
      tableHead: pick("[data-testid='table-houses'] h2, [data-testid='table-points'] h2"),
      houseNum: pick("[data-testid='table-houses'] .ulune-house-id-n"),
      kicker: pick(".ulune-kicker"),
      body: { fam: getComputedStyle(document.body).fontFamily },
    };
  });
  return { roles, bits };
}

function expectPair(tag, sample, displayRe, sansRe) {
  const { roles, bits } = sample;
  if (!displayRe.test(roles.display)) fail.push(`${tag} --font-display ${roles.display}`);
  if (!sansRe.test(roles.sans)) fail.push(`${tag} --font-sans ${roles.sans}`);
  const check = (name, fam, face) => {
    if (!fam) {
      fail.push(`${tag} missing ${name}`);
      return;
    }
    if (!faceInFamily(fam, face)) fail.push(`${tag} ${name} ${fam} ≠ ${face}`);
  };
  check("body", bits.body.fam, roles.sans);
  if (bits.helloTitle) check("hello title", bits.helloTitle.fam, roles.display);
  if (bits.helloCopy) check("hello copy", bits.helloCopy.fam, roles.sans);
  if (bits.tableHead) check("table title", bits.tableHead.fam, roles.display);
  if (bits.houseNum) check("house index", bits.houseNum.fam, roles.mono);
  if (bits.kicker) check("kicker", bits.kicker.fam, roles.sans);
  if (bits.brand) check("wordmark", bits.brand.fam, roles.display);
}

const classic = await sample();
console.log("CLASSIC", classic.roles);
expectPair("classic", classic, /Cormorant/i, /Outfit/i);

const lookFold = page.locator("[data-fold='look']");
if (await lookFold.getAttribute("data-open") !== "1") {
  await lookFold.locator("button").first().click();
}
await page.locator("[data-testid='look-panel']").waitFor({ timeout: 8000 });
await page.locator("[data-pairing='editorial']").click();
await page.waitForTimeout(600);
const editorial = await sample();
console.log("EDITORIAL", editorial.roles);
expectPair("editorial", editorial, /Source Serif/i, /Source Sans/i);

await page.locator("[data-pairing='clean']").click();
await page.waitForTimeout(600);
const clean = await sample();
console.log("CLEAN", clean.roles);
expectPair("clean", clean, /IBM Plex Serif/i, /IBM Plex Sans/i);

await page.locator("[data-pairing='classic']").click();
await page.waitForTimeout(400);
const back = await sample();
expectPair("classic-back", back, /Cormorant/i, /Outfit/i);

if (fail.length) {
  console.error("QA FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  await browser.close();
  process.exit(1);
}
console.log("QA OK type pairing");
await browser.close();
