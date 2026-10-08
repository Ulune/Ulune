/**
 * "In your chart" (encyclopedia plan, part 18): with no chart in the tab, an
 * encyclopedia page shows nothing of it and downloads nothing for it; with
 * the sample chart open, the encyclopedia's home lists the pages that speak
 * of it, a page says where its subject is in the chart (Saturn, a sign, a
 * combination page, the Life Path), "Open its reading" goes back to the
 * studio with that reading open, the part can be hidden and shown again, and
 * nothing leaves the browser but the pages and the app's own files.
 */
import { DEV, goStudioPage, gotoApp, launch } from "./_lib.mjs";

const fail = (why) => {
  throw new Error(why);
};
const origin = new URL(DEV).origin;

const { browser, page } = await launch(1280);
const requests = [];
page.on("request", (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() ?? "" }));
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

/** To an entry by the encyclopedia's own links and search (the tab keeps its memory, as a reader's would). */
async function go(id, query) {
  if (!(await page.getByTestId("enc-search-input").count())) {
    await page.getByTestId("enc-crumbs").locator("a").first().click();
    await page.getByTestId("enc-home").waitFor({ timeout: 10000 });
  }
  const input = page.getByTestId("enc-search-input");
  await input.fill("");
  await input.pressSequentially(query, { delay: 20 });
  const hit = page.locator(`[data-testid=enc-results] [data-entry="${id}"] a`).first();
  await hit.waitFor({ timeout: 8000 });
  await hit.click();
  await page.getByTestId("enc-entry").waitFor({ timeout: 10000 });
}

try {
  // 1. No chart in the tab: nothing, not even the download.
  await gotoApp(page, "/encyclopedia/saturn");
  await page.getByTestId("enc-entry").waitFor();
  await page.waitForTimeout(1200);
  if ((await page.getByTestId("enc-mine").count()) !== 0) fail("“In your chart” without a chart");
  if (requests.some((r) => /InYourChart/.test(r.url))) fail("its code downloaded without a chart");
  console.log("no chart, nothing OK");

  // 2. The sample chart, then the encyclopedia by its section link.
  await gotoApp(page, "/astrology");
  await page.getByTestId("sample-chart").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
  await page.waitForTimeout(1500);
  const before = requests.length;
  await page.locator("[data-testid=section-encyclopedia]:visible").first().click();
  await page.waitForURL(/\/encyclopedia$/, { timeout: 15000 });
  const index = page.getByTestId("enc-mine-index");
  await index.waitFor({ timeout: 10000 });
  for (const g of ["signs", "houses", "angles", "aspects", "numbers"]) {
    await index.locator(`[data-group=${g}] li a`).first().waitFor({ timeout: 8000 }).catch(() => fail(`the home's index has no ${g}`));
  }
  if ((await index.locator("[data-group=signs] li a").count()) !== 10) fail("the ten planets in their signs");
  console.log("home index OK");

  // 3. A planet in its sign, from the index: "Yes".
  const sunLink = index.locator("[data-group=signs] li[data-entry^='sun-in-'] a");
  const sunHref = await sunLink.getAttribute("href");
  await sunLink.click();
  await page.waitForURL(`${origin}${sunHref}`, { timeout: 10000 });
  const mine = page.getByTestId("enc-mine");
  await mine.waitFor({ timeout: 10000 });
  if (!/^Yes: your Sun is in /.test((await mine.locator("p").first().innerText()).trim())) fail(`the Sun's own page: ${await mine.innerText()}`);
  console.log("combination page OK");

  // 4. Saturn: its place, its aspects, its links; then "Open its reading".
  await go("saturn", "saturn");
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Saturn", null, { timeout: 8000 });
  await mine.waitFor({ timeout: 10000 });
  const text = await mine.innerText();
  if (!/Your Saturn: in \w+ at \d+°\d\d′, in the \d+(st|nd|rd|th) house/.test(text)) fail(`Saturn: ${text}`);
  if ((await mine.locator("a[href^='/encyclopedia/saturn-in-']").count()) < 2) fail("Saturn's sign and house link to their pages");
  if (!/nothing is sent or kept/.test(text)) fail("the note on where it is worked out");
  // The life path on its page.
  await go("life-path", "life path");
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Life Path", null, { timeout: 8000 });
  await page.waitForFunction(() => /Your Life Path is \d+\./.test(document.querySelector("[data-testid=enc-mine]")?.textContent ?? ""), null, { timeout: 10000 });
  await go("saturn", "saturn");
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Saturn", null, { timeout: 8000 });
  await page.getByTestId("enc-mine-reading").click();
  await page.waitForFunction(() => !/\/encyclop/.test(location.pathname), null, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-focus-id") === "planet:saturn", null, { timeout: 15000 });
  console.log("Saturn and its reading OK");

  // Human Design: once its page has drawn the bodygraph in this tab, the type's page knows it.
  await goStudioPage(page, "design");
  await page.getByTestId("hd-graph").waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator("[data-testid=section-encyclopedia]:visible").first().click();
  await page.waitForURL(/\/encyclopedia$/, { timeout: 15000 });
  await go("hd-generator", "generator");
  await page.waitForFunction(() => /You are a |Your type is /.test(document.querySelector("[data-testid=enc-mine]")?.textContent ?? ""), null, { timeout: 10000 });
  if ((await page.getByTestId("enc-mine").locator("a[href^='/encyclopedia/']").count()) < 1) fail("the type links to its page");
  console.log("Human Design OK");

  // 5. Hidden, it stays hidden from page to page; shown again.
  await page.locator("[data-testid=section-encyclopedia]:visible").first().click();
  await page.waitForURL(/\/encyclopedia$/, { timeout: 15000 });
  await go("scorpio", "scorpio");
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Scorpio", null, { timeout: 8000 });
  await mine.waitFor({ timeout: 10000 });
  await page.getByTestId("enc-mine-toggle").click();
  if ((await mine.getAttribute("data-hidden")) !== "") fail("hide");
  await go("trine", "trine");
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Trine", null, { timeout: 8000 });
  await page.waitForSelector("[data-testid=enc-mine][data-hidden]", { timeout: 10000 });
  await page.getByTestId("enc-mine-toggle").click();
  await page.waitForFunction(() => /Your trines|Your chart has no trine/.test(document.querySelector("[data-testid=enc-mine]")?.textContent ?? ""), null, { timeout: 8000 });
  console.log("hide and show OK");

  // 6. French: the same, in its words.
  await go("saturn", "saturn");
  await page.getByTestId("enc-twin").click();
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Saturne", null, { timeout: 8000 });
  await page.waitForFunction(() => /Votre Saturne\u202f: en /.test(document.querySelector("[data-testid=enc-mine]")?.textContent ?? ""), null, { timeout: 10000 });
  console.log("French OK");

  // 7. What left the browser after the chart: the pages and the app's own files, by GET; nothing of the chart.
  const problems = [];
  for (const r of requests.slice(before)) {
    const u = new URL(r.url);
    if (u.protocol === "data:" || u.protocol === "blob:") continue;
    if (u.origin !== origin) problems.push(`another site: ${r.url.slice(0, 90)}`);
    else if (r.method !== "GET" && !/_serverFn/.test(u.pathname)) problems.push(`${r.method} ${u.pathname}`);
    if (/1990|Paris|saturn.*capricorn/i.test(`${u.search} ${r.body}`)) problems.push(`the chart went out: ${r.url.slice(0, 90)}`);
  }
  // Nothing personal in the browser's storage: only the yes/no of the switch.
  const stored = await page.evaluate(() => Object.keys(localStorage).map((k) => `${k}=${localStorage.getItem(k)}`));
  const personal = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d\d-\d\d|"utc"|\b(aries|taurus|gemini|cancer|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/i;
  const kept = stored.filter((s) => personal.test(s));
  if (kept.length) problems.push(`stored: ${kept.join(" ").slice(0, 300)}`);
  if (stored.some((s) => s.startsWith("ulune.enc.mine=") && s !== "ulune.enc.mine=hidden")) problems.push("the switch keeps more than a yes or no");
  if (problems.length) fail(`privacy:\n${[...new Set(problems)].join("\n")}`);
  if (errors.length) fail(`page errors:\n${errors.join("\n")}`);
  console.log("privacy OK");
} finally {
  await browser.close();
}
console.log("YOUR CHART OK");
