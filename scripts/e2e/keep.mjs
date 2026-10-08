/**
 * The reader's own encyclopedia (encyclopedia plan, part 20): without a
 * private space, Bookmark says where bookmarks are kept and offers the way
 * in, and the pages read stay in the tab; with one, a page is bookmarked and
 * given a note, both sealed in the space (read back here only with the key
 * the browser keeps), listed on the encyclopedia's home with the pages read,
 * still there after a reload; the pages read can be cleared, a note deleted;
 * nothing of them goes to the browser's plain storage or over the network.
 */
import { DEV, createSpace, gotoApp, launch, readSpaceRecord } from "./_lib.mjs";

const fail = (why) => {
  throw new Error(why);
};
const origin = new URL(DEV).origin;
const NOTE = "Zqxwv: I notice this when the week is long.";

const { browser, page } = await launch(1280);
const requests = [];
page.on("request", (r) => requests.push({ url: r.url(), body: r.postData() ?? "" }));
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

/** To an entry by the encyclopedia's own search (the tab keeps its memory). */
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
  await page.getByTestId("enc-keep").waitFor({ timeout: 10000 });
}
const home = async () => {
  await page.getByTestId("enc-crumbs").locator("a").first().click();
  await page.getByTestId("enc-home").waitFor({ timeout: 10000 });
};

try {
  // 1. No private space: Bookmark explains, the pages read stay in the tab.
  await gotoApp(page, "/encyclopedia/saturn");
  await page.getByTestId("enc-bookmark").click({ timeout: 15000 });
  await page.getByTestId("enc-keep-need").waitFor({ timeout: 5000 });
  if (!/Sign in to keep them/.test(await page.getByTestId("enc-keep-way-in").innerText())) fail("the way in");
  await go("trine", "trine");
  await home();
  await page.getByTestId("enc-shelf-recent").waitFor({ timeout: 8000 });
  const read = await page.locator("[data-testid=enc-shelf-recent] li").evaluateAll((els) => els.map((e) => e.getAttribute("data-entry")));
  if (read.join() !== "trine,saturn") fail(`recently read in the tab: ${read}`);
  if (!/Kept in this tab only/.test(await page.getByTestId("enc-shelf").innerText())) fail("the tab-only line");
  console.log("without a space OK");

  // 2. A private space, made here: the pages read join it, sealed.
  await createSpace(page);
  await page.waitForFunction(() => !/Kept in this tab only/.test(document.querySelector("[data-testid=enc-shelf]")?.textContent ?? ""), null, { timeout: 8000 });
  const recentRecord = await readSpaceRecord(page, "enc/recent");
  if (!recentRecord || recentRecord.map((p) => p.id).join() !== "trine,saturn") fail(`the sealed pages read: ${JSON.stringify(recentRecord)?.slice(0, 120)}`);
  console.log("space OK");

  // 3. Saturn bookmarked and given a note.
  await go("saturn", "saturn");
  await page.getByTestId("enc-bookmark").click();
  await page.waitForSelector("[data-testid=enc-bookmark][aria-pressed=true]", { timeout: 5000 });
  await page.getByTestId("enc-note-add").click();
  await page.getByTestId("enc-note-text").fill(NOTE);
  await page.waitForFunction(() => /^Kept on /.test(document.querySelector("[data-testid=enc-note-status]")?.textContent ?? ""), null, { timeout: 8000 });
  const marks = await readSpaceRecord(page, "enc/bookmarks");
  if (!marks || marks[0]?.id !== "saturn" || marks[0].title.fr !== "Saturne") fail(`the sealed bookmarks: ${JSON.stringify(marks)?.slice(0, 160)}`);
  const note = await readSpaceRecord(page, "enc/note/saturn");
  if (note?.text !== NOTE) fail("the sealed note");
  console.log("bookmark and note OK");

  // 4. The home's shelf; the pages read cleared.
  await home();
  await page.getByTestId("enc-shelf-bookmarks").waitFor({ timeout: 8000 });
  if (!/Saturn/.test(await page.getByTestId("enc-shelf-bookmarks").innerText())) fail("the bookmark on the shelf");
  if (!/Saturn — Zqxwv: I notice this when the week is long\./.test(await page.getByTestId("enc-shelf-notes").innerText())) fail("the note on the shelf");
  await page.getByTestId("enc-shelf-clear").click();
  await page.getByTestId("enc-shelf-recent").waitFor({ state: "detached", timeout: 5000 });
  if ((await readSpaceRecord(page, "enc/recent")) !== null) fail("the pages read are still sealed after Clear");
  console.log("shelf OK");

  // 5. After a reload (the space stays unlocked on this device): still there; the note deleted.
  await page.reload({ waitUntil: "load" });
  await page.getByTestId("enc-shelf-bookmarks").waitFor({ timeout: 20000 });
  await page.locator("[data-testid=enc-shelf-notes] a").first().click();
  await page.getByTestId("enc-note").waitFor({ timeout: 10000 });
  if ((await page.getByTestId("enc-note-text").inputValue()) !== NOTE) fail("the note after a reload");
  await page.getByTestId("enc-note-delete").click();
  await page.getByTestId("enc-note").waitFor({ state: "detached", timeout: 5000 });
  if ((await readSpaceRecord(page, "enc/note/saturn")) !== null) fail("the deleted note is still sealed");
  console.log("reload and delete OK");

  // 6. Nothing of it in plain storage, nothing sent.
  const plain = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
  // (The look's colours name the planets, --pm-saturn: what matters is no page kept, no note.)
  if (/zqxwv|"id":"(saturn|trine)"|\/encyclopedia\/(saturn|trine)|enc\/(note|bookmarks|recent)/i.test(plain)) fail("bookmarks, notes or pages read in plain storage");
  for (const r of requests) {
    const u = new URL(r.url);
    if (u.protocol === "data:" || u.protocol === "blob:") continue;
    if (u.origin !== origin) fail(`a request to another site: ${r.url.slice(0, 90)}`);
    if (/zqxwv/i.test(`${r.url} ${r.body}`)) fail(`the note went out: ${r.url.slice(0, 90)}`);
  }
  if (errors.length) fail(`page errors:\n${errors.join("\n")}`);
  console.log("privacy OK");
} finally {
  await browser.close();
}
console.log("KEEP OK");
