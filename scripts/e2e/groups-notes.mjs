/*
 * Groups in the chart switcher and private notes on a chart (share and
 * compare plan, ideas B5 and B6), end to end.
 *
 *   1. No private space (1280, English): the switcher's Groups row unfolds one
 *      quiet line ("Create your private space to sort your charts into
 *      groups."), its words the way in; the Birth tab's Notes say the same for
 *      notes; nothing is written to IndexedDB or plain storage.
 *   2. With a space: groups made (a suggestion, a name typed, a name taken
 *      refused), charts sorted into them from their rows, sealed in
 *      state/groups; the switcher shows the charts group by group under
 *      headings that fold (and stay folded for the tab), a chart ticked stays
 *      where it was until the switcher opens again; the filter (All, a group,
 *      by click and arrow keys); renamed (Escape leaves a name as it was,
 *      without closing the switcher), moved; ⌘K lists "Clients 2026 › Sample B".
 *   3. A note on a chart: sealed a moment after typing (note/<id>), today's
 *      date at the start of a line; the switcher's search finds a chart by its
 *      note only once asked ("Search notes too"), saying so; after a reload
 *      everything is there; locked, the groups and notes leave the page (the
 *      Groups row then says to unlock), and come back on unlock.
 *   4. A group deleted: its charts stay. A chart forgotten: its note's record
 *      goes and it leaves every group.
 *   5. On a phone (390, French, touch): the same in French, every control of
 *      theirs 44 px, no sideways scroll; in the light theme too.
 * Screenshots in screenshots/e2e/groups-notes-*.png.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import {
  FIXTURE_A,
  FIXTURE_B,
  SHOTS,
  VIEWPORTS,
  assertNoOverflow,
  castFixture,
  clickDockTab,
  createSpace,
  databases,
  ensureShotsDir,
  ensureTheme,
  gotoApp,
  readSpaceRecord,
  setLang,
  unlockSpace,
} from "./_lib.mjs";

const fail = (why) => {
  throw new Error(why);
};
const NOTE = "Zqv read on 12 Oct; asked about work";
/** Made-up names on the fixtures' births: seven charts bring the switcher's search. */
const MORE = ["Fixture three", "Fixture four", "Fixture five", "Fixture six", "Fixture seven"].map((name, i) => ({ ...(i % 2 ? FIXTURE_B : FIXTURE_A), name }));

/** The switcher open (not one on its way out, which keeps its parts a moment for its exit). */
const SWITCHER = "[data-testid=chart-picker]:not([data-leaving] *)";

async function openSwitcher(page) {
  const picker = page.locator(SWITCHER);
  await page.locator("[data-leaving] [data-testid=chart-picker]").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 2; i += 1) {
    if (await picker.isVisible().catch(() => false)) return picker;
    await page.getByTestId("chart-chip").click();
    if (await picker.waitFor({ timeout: 4000 }).then(() => true, () => false)) return picker;
  }
  fail("the switcher did not open");
}

async function closeSwitcher(page) {
  if (await page.locator(SWITCHER).isVisible().catch(() => false)) await page.keyboard.press("Escape");
  await page.getByTestId("chart-picker").waitFor({ state: "detached", timeout: 8000 });
}

/**
 * The switcher with its groups. Right after a page opens, their code and records come at idle, and a
 * switcher opened before has its plain list that time (its charts never move under the pointer): as
 * a reader would, open it again.
 */
async function openWithGroups(page) {
  const until = Date.now() + 20000;
  for (;;) {
    const picker = await openSwitcher(page);
    if (await picker.getByTestId("group-filter").waitFor({ timeout: 1500 }).then(() => true, () => false)) return picker;
    if (Date.now() > until) fail("the switcher never showed the groups");
    await closeSwitcher(page);
    await page.waitForTimeout(500);
  }
}

/** The Groups row unfolded (the groups' panel, or the quiet line without a space). */
async function openGroups(page) {
  const picker = await openSwitcher(page);
  const row = picker.getByTestId("groups-row");
  await row.waitFor({ timeout: 15000 });
  if ((await row.getAttribute("aria-expanded")) !== "true") await row.click();
  return picker;
}

const groupsRecord = async (page) => (await readSpaceRecord(page, "state/groups"))?.groups ?? [];

/** Waits until the sealed groups say what `check` asks. */
async function sealedGroups(page, check, what) {
  const until = Date.now() + 8000;
  let last = null;
  while (Date.now() < until) {
    last = await groupsRecord(page).catch(() => null);
    if (last && check(last)) return last;
    await page.waitForTimeout(150);
  }
  fail(`${what}: the sealed groups ${JSON.stringify(last)}`);
}

async function idOf(page, name) {
  const library = await readSpaceRecord(page, "state/library");
  for (const id of library?.order ?? []) {
    const row = await readSpaceRecord(page, `chart/${id}`);
    if (row?.input?.name === name) return id;
  }
  fail(`no kept chart named ${name}`);
}

/** Everything plain the browser keeps for the site, as text. */
const plainStorage = (page) => page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);

/** A control's size as laid out, for a finger (not its picture while the switcher grows in). */
const boxOf = (locator) => locator.evaluate((el) => ({ w: el.offsetWidth, h: el.offsetHeight }));

async function computer() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: VIEWPORTS[1280] });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const sent = [];
  page.on("request", (r) => sent.push(`${r.url()} ${r.postData() ?? ""}`));
  try {
    // 1. No private space.
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await castFixture(page, FIXTURE_B);
    let picker = await openGroups(page);
    const need = picker.getByTestId("groups-need");
    await need.waitFor({ timeout: 8000 });
    if ((await need.innerText()).trim() !== "Create your private space to sort your charts into groups.") fail(`the quiet line: "${await need.innerText()}"`);
    if (await picker.getByTestId("chart-groups").count()) fail("a chart's groups without a space");
    await page.screenshot({ path: join(SHOTS, "groups-notes-need-1280.png"), animations: "disabled" });
    // Its first words are the way in.
    await picker.getByTestId("groups-need-way-in").click();
    await page.getByTestId("space-sheet").waitFor({ timeout: 20000 });
    await page.waitForFunction(() => document.querySelector("[data-testid=space-sheet]")?.contains(document.activeElement), null, { timeout: 5000 });
    await page.keyboard.press("Escape");
    await page.getByTestId("space-sheet").waitFor({ state: "detached", timeout: 10000 });
    await clickDockTab(page, "birth");
    const notesNeed = page.getByTestId("notes-need");
    await notesNeed.waitFor({ timeout: 15000 });
    if ((await notesNeed.innerText()).trim() !== "Create your private space to keep notes on your charts.") fail(`the notes' quiet line: "${await notesNeed.innerText()}"`);
    if (await page.getByTestId("notes-text").count()) fail("a notes field without a space");
    if ((await databases(page)).includes("ulune-space")) fail("a database without a space");
    console.log("no space: the quiet lines, nothing kept");

    // 2. Groups, with a space.
    await createSpace(page);
    picker = await openGroups(page);
    await picker.getByTestId("groups-panel").waitFor({ timeout: 15000 });
    if (!/Sort your charts into groups of your own/.test(await picker.getByTestId("groups-panel").innerText())) fail("the groups' first line");
    await page.screenshot({ path: join(SHOTS, "groups-notes-first-1280.png"), animations: "disabled" });
    await picker.locator("[data-testid=group-suggest]", { hasText: "Family" }).click();
    await picker.locator("[data-testid=group-item][data-group=Family]").waitFor({ timeout: 8000 });
    await picker.getByTestId("group-new-name").fill("Clients");
    await picker.getByTestId("group-new-name").press("Enter");
    await picker.locator("[data-testid=group-item][data-group=Clients]").waitFor({ timeout: 8000 });
    // A name a group already has (case aside) is refused, and said.
    await picker.getByTestId("group-new-name").fill("family");
    await picker.getByTestId("group-new-add").click();
    await picker.locator("[role=alert]", { hasText: "A group already has this name." }).waitFor({ timeout: 5000 });
    await picker.getByTestId("group-new-name").fill("");
    await sealedGroups(page, (g) => g.map((x) => x.name).join() === "Family,Clients", "two groups made");
    await closeSwitcher(page);

    // Sorted from the rows: TraceQA in Family, Sample B in Family and Clients.
    picker = await openSwitcher(page);
    const rowOf = (name) => picker.locator(`[data-testid=chart-row][data-name="${name}"]`).first();
    await rowOf(FIXTURE_A.name).getByTestId("chart-groups").click();
    await rowOf(FIXTURE_A.name).locator("[data-testid=group-toggle][data-group=Family]").click();
    await rowOf(FIXTURE_B.name).getByTestId("chart-groups").click();
    await rowOf(FIXTURE_B.name).locator("[data-testid=group-toggle][data-group=Family]").click();
    await rowOf(FIXTURE_B.name).locator("[data-testid=group-toggle][data-group=Clients]").click();
    // Ticked, a chart stays where it was until the switcher opens again (its groups still unfolded under it).
    if ((await rowOf(FIXTURE_B.name).locator("[data-testid=group-toggle][aria-pressed=true]").count()) !== 2) fail("Sample B's groups, ticked");
    await page.screenshot({ path: join(SHOTS, "groups-notes-row-1280.png"), animations: "disabled" });
    const idA = await idOf(page, FIXTURE_A.name);
    const idB = await idOf(page, FIXTURE_B.name);
    await sealedGroups(page, (g) => g[0]?.members.join() === `${idA},${idB}` && g[1]?.members.join() === idB, "charts sorted");
    await closeSwitcher(page);

    // By group: headings that fold, a chart in two groups under both, the filter.
    picker = await openSwitcher(page);
    const heads = async () => picker.getByTestId("group-head").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    if ((await heads()).join("|") !== "Family, 2 charts|Clients, one chart") fail(`the headings: ${await heads()}`);
    const sectionNames = (group) => picker.locator(`[data-testid=group-section][data-group="${group}"] [data-testid=chart-row]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-name")));
    if ((await sectionNames("Family")).join() !== `${FIXTURE_B.name},${FIXTURE_A.name}` && (await sectionNames("Family")).join() !== `${FIXTURE_A.name},${FIXTURE_B.name}`) fail(`Family's charts: ${await sectionNames("Family")}`);
    if ((await sectionNames("Clients")).join() !== FIXTURE_B.name) fail(`Clients' charts: ${await sectionNames("Clients")}`);
    await page.screenshot({ path: join(SHOTS, "groups-notes-switcher-1280.png"), animations: "disabled" });
    await picker.locator("[data-testid=group-section][data-group=Family] [data-testid=group-head]").click();
    if (await picker.locator("[data-testid=group-section][data-group=Family] [data-testid=chart-row]").count()) fail("a folded heading still shows its charts");
    await closeSwitcher(page);
    picker = await openSwitcher(page);
    if ((await picker.locator("[data-testid=group-section][data-group=Family] [data-testid=group-head]").getAttribute("aria-expanded")) !== "false") fail("the folded heading did not stay folded for the tab");
    await picker.locator("[data-testid=group-section][data-group=Family] [data-testid=group-head]").click();
    // The filter: a group alone, then All again by the arrow keys.
    await picker.locator("[data-testid=group-chip][data-group=Clients]").click();
    const shown = async () => picker.getByTestId("chart-row").evaluateAll((els) => els.map((e) => e.getAttribute("data-name")));
    if ((await shown()).join() !== FIXTURE_B.name) fail(`Clients alone: ${await shown()}`);
    await picker.locator("[data-testid=group-chip][aria-checked=true]").press("ArrowRight");
    if ((await picker.locator("[data-testid=group-chip][aria-checked=true]").getAttribute("data-group")) !== "") fail("ArrowRight from the last group does not come back to All");
    if ((await picker.getByTestId("group-section").count()) < 2) fail("All does not show the groups' headings again");
    await closeSwitcher(page);

    // Renamed (Escape first leaves it as it was, and the switcher open), then moved up.
    picker = await openGroups(page);
    const clients = picker.locator("[data-testid=group-item][data-group=Clients]");
    await clients.getByTestId("group-rename").click();
    await picker.getByTestId("group-rename-field").fill("Something else");
    await picker.getByTestId("group-rename-field").press("Escape");
    if (!(await page.locator(SWITCHER).isVisible())) fail("Escape in a group's name closed the switcher");
    await clients.getByTestId("group-rename").click();
    await picker.getByTestId("group-rename-field").fill("Clients 2026");
    await picker.getByTestId("group-rename-field").press("Enter");
    const renamed = picker.locator('[data-testid=group-item][data-group="Clients 2026"]');
    await renamed.waitFor({ timeout: 5000 });
    // Back on its own Rename button, for a keyboard.
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "group-rename", null, { timeout: 3000 });
    await renamed.getByTestId("group-up").click();
    await sealedGroups(page, (g) => g.map((x) => x.name).join() === "Clients 2026,Family", "renamed and moved");
    await page.screenshot({ path: join(SHOTS, "groups-notes-manage-1280.png"), animations: "disabled" });
    await closeSwitcher(page);

    // ⌘K: a chart under its group, found by the group's name.
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-palette").waitFor({ timeout: 8000 });
    await page.keyboard.type("clients 2026");
    const found = await page.locator("[data-testid^='cmd-chart:'] .ob-palette-label").evaluateAll((els) => els.map((e) => e.textContent));
    if (!found.includes(`Clients 2026 › ${FIXTURE_B.name}`) || found.some((t) => t.includes(FIXTURE_A.name))) fail(`⌘K, "clients 2026": ${JSON.stringify(found)}`);
    await page.keyboard.press("Escape");
    console.log("groups: made, sorted, shown by group, filtered, renamed, moved, in ⌘K");

    // 3. A note on TraceQA.
    await openSwitcher(page);
    await page.locator(`[data-testid=chart-row][data-name="${FIXTURE_A.name}"]`).first().getByRole("button").first().click();
    await clickDockTab(page, "birth");
    const field = page.getByTestId("notes-text");
    await field.waitFor({ timeout: 15000 });
    await field.fill(NOTE);
    await page.waitForFunction(() => /^Kept at \d{2}:\d{2}\.$/.test(document.querySelector("[data-testid=notes-status]")?.textContent ?? ""), null, { timeout: 8000 });
    if ((await readSpaceRecord(page, `note/${idA}`))?.text !== NOTE) fail("the sealed note");
    // Today's date, at the start of a new line.
    await field.press("End");
    await page.getByTestId("notes-stamp").click();
    await page.waitForFunction((note) => /\n\d{1,2} [A-Z][a-z]{2,3} \d{4} — $/.test(document.querySelector("[data-testid=notes-text]")?.value ?? "") && document.querySelector("[data-testid=notes-text]")?.value.startsWith(note), NOTE, { timeout: 5000 });
    // The caret after the date, in the field.
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "notes-text", null, { timeout: 3000 });
    await page.keyboard.type("follow-up in spring");
    await field.blur();
    await page.waitForTimeout(900);
    const sealed = await readSpaceRecord(page, `note/${idA}`);
    if (!/\n\d{1,2} [A-Z][a-z]{2,3} \d{4} — follow-up in spring$/.test(sealed?.text ?? "")) fail(`the note with its date: ${JSON.stringify(sealed)}`);
    await page.getByTestId("chart-notes").screenshot({ path: join(SHOTS, "groups-notes-note-1280.png"), animations: "disabled" });

    // Seven charts: the search, which finds a chart by its note once asked.
    for (const f of MORE) await castFixture(page, f);
    picker = await openSwitcher(page);
    await picker.getByTestId("chart-search").fill("spring");
    await picker.locator(".ob-picker-none").waitFor({ timeout: 5000 });
    if (await picker.getByTestId("note-hits").count()) fail("the search looked in notes before it was asked");
    await picker.getByTestId("search-notes").check();
    const hits = picker.locator("[data-testid=note-hits] [data-testid=chart-row]");
    await hits.first().waitFor({ timeout: 5000 });
    if ((await hits.evaluateAll((els) => els.map((e) => e.getAttribute("data-name")))).join() !== FIXTURE_A.name) fail("the note's search");
    if (!/Found in their notes/i.test(await picker.innerText())) fail("the search does not say the chart was found in its note");
    if ((await picker.innerText()).includes("spring")) fail("the switcher shows a note's text");
    await page.screenshot({ path: join(SHOTS, "groups-notes-search-1280.png"), animations: "disabled" });
    await picker.getByTestId("chart-search").fill("");
    await closeSwitcher(page);
    console.log("note: sealed, dated, found by the search when asked");

    // After a reload (the space stays signed in): all there.
    await page.reload({ waitUntil: "load" });
    await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
    await openWithGroups(page);
    await closeSwitcher(page);
    await clickDockTab(page, "birth");
    await page.getByTestId("notes-text").waitFor({ timeout: 15000 });
    console.log("after a reload: the groups and the notes");

    // Locked: they leave the page; the Groups row says to unlock; unlocked, they are back.
    await page.getByTestId("space-button").click();
    await page.getByTestId("space-lock-now").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "locked");
    if (await page.getByTestId("notes-text").count()) fail("a note on screen after locking");
    await castFixture(page, { ...FIXTURE_B, name: "Fixture eight" });
    picker = await openGroups(page);
    const locked = picker.getByTestId("groups-need");
    await locked.waitFor({ timeout: 8000 });
    if ((await locked.getAttribute("data-need")) !== "locked" || !/Unlock your private space to see your groups\./.test(await locked.innerText())) fail(`locked: "${await locked.innerText()}"`);
    if (await picker.getByTestId("group-filter").count()) fail("the groups' filter while locked");
    await closeSwitcher(page);
    await unlockSpace(page);
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    await openWithGroups(page);
    await closeSwitcher(page);
    console.log("locked: gone from the page; unlocked: back");

    // 4. Family deleted: its charts stay.
    const before = (await readSpaceRecord(page, "state/library")).order.length;
    picker = await openGroups(page);
    await picker.locator("[data-testid=group-item][data-group=Family] [data-testid=group-delete]").click();
    await picker.getByTestId("group-delete-confirm").click();
    await page.getByTestId("toast").filter({ hasText: "“Family” deleted. Its charts stay." }).first().waitFor({ timeout: 5000 });
    await sealedGroups(page, (g) => g.map((x) => x.name).join() === "Clients 2026", "Family deleted");
    if ((await readSpaceRecord(page, "state/library")).order.length !== before) fail("deleting a group took charts with it");
    await closeSwitcher(page);

    // TraceQA forgotten: its note goes, and it leaves every group (Sample B too, for the groups' check).
    await openSwitcher(page);
    await page.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"]`).first().getByRole("button").first().click();
    await openSwitcher(page);
    await page.getByTestId("chart-remove").click();
    await page.getByTestId("chart-remove-confirm").click();
    await sealedGroups(page, (g) => g[0]?.members.length === 0, "Sample B forgotten");
    await openSwitcher(page);
    await page.locator(`[data-testid=chart-row][data-name="${FIXTURE_A.name}"]`).first().getByRole("button").first().click();
    await openSwitcher(page);
    await page.getByTestId("chart-remove").click();
    await page.getByTestId("chart-remove-confirm").click();
    const until = Date.now() + 8000;
    while (Date.now() < until && (await readSpaceRecord(page, `note/${idA}`)) !== null) await page.waitForTimeout(150);
    if ((await readSpaceRecord(page, `note/${idA}`)) !== null) fail("the forgotten chart's note is still sealed");
    console.log("a group deleted, its charts kept; a chart forgotten, its note gone and out of its groups");

    // Nothing of it in plain storage or in any request.
    if (/Zqv|Clients 2026|follow-up/.test(await plainStorage(page))) fail("a group's name or a note in plain storage");
    for (const s of sent) if (/Zqv|Clients%202026|Clients 2026|follow-up/i.test(s)) fail(`a request carries a group or a note: ${s.slice(0, 120)}`);
    if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
  } catch (e) {
    await page.screenshot({ path: join(SHOTS, "groups-notes-failed-1280.png"), animations: "disabled" }).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

async function phone() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[390], hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await gotoApp(page);
    await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await castFixture(page, FIXTURE_B);
    let picker = await openGroups(page);
    const need = picker.getByTestId("groups-need");
    await need.waitFor({ timeout: 8000 });
    if ((await need.innerText()).trim() !== "Créez votre espace privé pour ranger vos thèmes en groupes.") fail(`French quiet line: "${await need.innerText()}"`);
    await closeSwitcher(page);
    await createSpace(page);
    picker = await openGroups(page);
    await picker.locator("[data-testid=group-suggest]", { hasText: "Famille" }).click();
    await picker.locator("[data-testid=group-item][data-group=Famille]").waitFor({ timeout: 8000 });
    await page.screenshot({ path: join(SHOTS, "groups-notes-manage-390-fr.png"), animations: "disabled" });
    // A finger's targets: 44 px.
    const small = [];
    for (const id of ["group-rename", "group-down", "group-delete", "group-new-add", "group-new-name", "group-suggest"]) {
      const el = picker.getByTestId(id).first();
      if (!(await el.count())) continue;
      const b = await boxOf(el);
      if (b.h < 44) small.push(`${id} ${b.w}×${b.h}`);
    }
    await closeSwitcher(page);
    picker = await openSwitcher(page);
    const row = picker.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"]`).first();
    const tag = row.getByTestId("chart-groups");
    if ((await tag.getAttribute("aria-label")) !== `Groupes de ${FIXTURE_B.name}`) fail(`the tag's name: ${await tag.getAttribute("aria-label")}`);
    const tb = await boxOf(tag);
    if (tb.h < 44 || tb.w < 44) small.push(`chart-groups ${tb.w}×${tb.h}`);
    await tag.click();
    const toggle = row.locator("[data-testid=group-toggle][data-group=Famille]");
    const gb = await boxOf(toggle);
    if (gb.h < 44) small.push(`group-toggle ${gb.w}×${gb.h}`);
    await toggle.click();
    await page.screenshot({ path: join(SHOTS, "groups-notes-row-390-fr.png"), animations: "disabled" });
    await closeSwitcher(page);
    picker = await openSwitcher(page);
    for (const id of ["group-chip", "group-head"]) {
      const b = await boxOf(picker.getByTestId(id).first());
      if (b.h < 44) small.push(`${id} ${b.w}×${b.h}`);
    }
    const head = await picker.getByTestId("group-head").first().getAttribute("aria-label");
    if (head !== "Famille, un thème") fail(`French heading: "${head}"`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, "groups-notes-switcher-390-fr.png"), animations: "disabled" });
    await closeSwitcher(page);
    // The note, in French, in the sheet's Birth tab.
    await clickDockTab(page, "birth");
    const field = page.getByTestId("notes-text");
    await field.waitFor({ timeout: 15000 });
    await field.fill("Zqv lu le 12 oct. ; question sur le travail");
    await page.waitForFunction(() => /^Gardées à \d{2}:\d{2}\.$/.test(document.querySelector("[data-testid=notes-status]")?.textContent ?? ""), null, { timeout: 8000 });
    const sb = await boxOf(page.getByTestId("notes-stamp"));
    if (sb.h < 44) small.push(`notes-stamp ${sb.w}×${sb.h}`);
    if (small.length) fail(`under 44 px on a finger: ${small.join(", ")}`);
    await field.blur();
    await page.getByTestId("chart-notes").scrollIntoViewIfNeeded();
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, "groups-notes-note-390-fr.png"), animations: "disabled" });
    // In the light theme too.
    await ensureTheme(page, "light");
    await page.getByTestId("chart-notes").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(SHOTS, "groups-notes-note-390-fr-light.png"), animations: "disabled" });
    picker = await openSwitcher(page);
    await picker.getByTestId("group-filter").waitFor({ timeout: 8000 });
    await page.screenshot({ path: join(SHOTS, "groups-notes-switcher-390-fr-light.png"), animations: "disabled" });
    await closeSwitcher(page);
    if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
    console.log("phone, French: the same, 44 px for a finger, no sideways scroll, light theme");
  } catch (e) {
    await page.screenshot({ path: join(SHOTS, "groups-notes-failed-390.png"), animations: "disabled" }).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
await computer();
await phone();
console.log("GROUPS AND NOTES OK");
