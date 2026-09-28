/*
 * What leaves the reader's browser. Casts two charts, visits every mode, asks
 * two AIs (one called from the page, one through Ulune's relay), and checks
 * every request the page made:
 *   - no name or place name typed by the reader appears in any request,
 *     except the place search, which carries the place typed there, and the
 *     birth date only in the calculations, which need it;
 *   - a cast carries a date, a time and coordinates, and no name or place;
 *   - nothing goes to the geocoder from the page (Ulune's server asks it);
 *   - an AI request carries positions, not the name, date, time or place;
 *   - Timing asks only for the sky, by date (the transits are worked out in
 *     the page), and nothing else goes with those requests.
 * The AI providers are answered here (page.route): no real key is used.
 */
import {
  AI_ON,
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  castFixture,
  goStudioPage,
  gotoApp,
  launch,
} from "./_lib.mjs";

const NAMES = [FIXTURE_A.name, FIXTURE_B.name, "Oslo", "Paris"];
const DATES = ["15/06/1990", "1990-06-15", "03/11/1987", "1987-11-03"];
const PERSONAL = [...NAMES, ...DATES];
/** The place search carries the place typed into it, and only that. */
const PLACE_SEARCH_OK = ["Paris", "Oslo", "Paris, France", "Oslo, Norway"];

const MODES = ["natal", "transits", "timing", "progressions", "synastry", "composite", "design", "numerology"];

const READING = `@@TITLE@@
A test epithet
@@PORTRAIT@@
${"A portrait written for the test, long enough to count as a portrait. ".repeat(4)}
@@SECTION@@ Identity — Sun, Moon, Rising
${"Some words for the test. ".repeat(6)}
@@SECTION@@ Synthesis
${"More words for the test. ".repeat(6)}
@@END@@`;

function isServerFn(url) {
  return url.includes("/_serverFn/");
}

function decodeFnName(url) {
  const id = url.split("/_serverFn/")[1]?.split("?")[0] ?? "";
  try {
    return JSON.parse(Buffer.from(id, "base64url").toString("utf8")).export ?? id;
  } catch {
    return id;
  }
}

/** Save a key in Your AI; returns the line saying where requests go. */
async function addKey(page, provider, key) {
  await page.getByTestId("ai-accounts").click();
  await page.locator(`#ai-key-${provider}`).fill(key);
  await page.locator(`#ai-key-${provider}`).press("Enter");
  await page.getByTestId("ai-route").waitFor({ timeout: 8000 });
  const route = await page.getByTestId("ai-route").innerText();
  // The popover's backdrop closes it.
  await page.mouse.click(5, 5);
  await page.getByTestId("ai-accounts-popover").waitFor({ state: "hidden", timeout: 8000 });
  return route;
}

async function run() {
  const { browser, page } = await launch(1280);
  const seen = [];
  page.on("request", (r) => {
    seen.push({ url: r.url(), method: r.method(), body: r.postData() ?? "" });
  });
  const aiBodies = [];
  await page.route("https://api.anthropic.com/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
    aiBodies.push({ via: "direct", body: req.postData() ?? "", headers: req.headers() });
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ content: [{ type: "text", text: READING }] }),
    });
  });
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await castFixture(page, FIXTURE_B);
    // Back to A, so B is the second person.
    await page.getByTestId("chart-chip").click();
    await page.locator("[data-testid=chart-row]").filter({ hasText: FIXTURE_A.name }).getByRole("button").first().click();
    for (const mode of MODES) {
      await goStudioPage(page, mode);
      await page.getByTestId(`studio-${mode === "design" ? "humandesign" : mode}`).waitFor({ timeout: 30000 });
      await page.waitForTimeout(400);
    }
    console.log("modes visited");

    await goStudioPage(page, "natal");
    if (!AI_ON) {
      // AI readings wait for v1.1: nothing of them shows.
      await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
      const sun = page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost) [data-kind=planet][data-body=sun]").first();
      await sun.evaluate((el) => el instanceof SVGElement && el.focus());
      await page.keyboard.press("Enter");
      await page.getByTestId("click-note").waitFor({ timeout: 20000 });
      for (const id of ["ai-accounts", "compose-grok", "reading-ask", "natal-portrait"]) {
        if (await page.getByTestId(id).count()) throw new Error(`AI is off, yet "${id}" shows`);
      }
      console.log("no AI on screen");
    } else {
    // Your AI: a Claude key (called from the page), then compose the natal reading.
    await addKey(page, "claude", "sk-ant-test-0000000000000000");
    await page.getByTestId("compose-grok").click();
    await page.getByTestId("portrait").waitFor({ timeout: 20000 });
    console.log("composed with the direct provider");

    // A second provider that goes through the relay: its request to Ulune's
    // server is inspected (the relay's own call fails here: no network to it).
    const route = await addKey(page, "grok", "xai-test-000000000000000000");
    if (!/Ulune/.test(route)) throw new Error(`relay provider not said to go through Ulune: "${route}"`);
    // Ask about the Sun: the question box sends the focus and the positions.
    const sun = page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost) [data-kind=planet][data-body=sun]").first();
    await sun.evaluate((el) => el instanceof SVGElement && el.focus());
    await page.keyboard.press("Enter");
    await page.getByTestId("reading-ask").click();
    await page.getByTestId("ask-grok-submit").click();
    await page.waitForFunction(
      () => document.querySelector("[data-testid=ask-grok] [role=alert]") || document.querySelector("[data-testid=ask-grok] ol li"),
      null,
      { timeout: 45000 },
    );
    console.log("asked through the relay");
    }
  } finally {
    await browser.close();
  }

  const failures = [];
  const fnCalls = seen.filter((r) => isServerFn(r.url));
  for (const r of seen) {
    const name = isServerFn(r.url) ? decodeFnName(r.url) : "";
    // A time zone's name is not the place: the coordinates already say where.
    let text = `${r.url}\n${r.body}`.split("Europe/Paris").join("").split("Europe/Oslo").join("");
    if (name.startsWith("searchPlaces")) {
      for (const ok of PLACE_SEARCH_OK) text = text.split(ok).join("");
    }
    // The calculations need the birth moment (they get it without a name);
    // nothing else may carry it.
    for (const word of name.startsWith("cast") ? NAMES : PERSONAL) {
      if (text.includes(word)) failures.push(`${r.method} ${name || r.url.slice(0, 80)} carries "${word}"`);
    }
    if (/open-meteo/.test(r.url)) failures.push(`the page asked the geocoder itself: ${r.url.slice(0, 80)}`);
  }
  const casts = fnCalls.filter((r) => decodeFnName(r.url).startsWith("castChart"));
  if (casts.length < 2) failures.push(`expected 2 casts, saw ${casts.length}`);
  for (const c of casts) {
    if (/"name"|"placeLabel"/.test(c.body)) failures.push(`a cast carries a name or place field: ${c.body.slice(0, 200)}`);
    if (!/"latitude"/.test(c.body) || !/"date"/.test(c.body)) failures.push("a cast lacks its date or coordinates");
  }
  if (!AI_ON) {
    // No request to an AI provider, and none to the relay.
    for (const r of seen) if (/anthropic|openai|googleapis|x\.ai/.test(new URL(r.url).host)) failures.push(`AI is off, yet a request went to ${r.url.slice(0, 80)}`);
    if (fnCalls.some((r) => decodeFnName(r.url).startsWith("relayAi"))) failures.push("AI is off, yet a request went to the relay");
  }
  if (AI_ON && !aiBodies.length) failures.push("no request reached the direct AI provider");
  for (const a of aiBodies) {
    for (const word of PERSONAL) if (a.body.includes(word)) failures.push(`the AI request carries "${word}"`);
    if (!/Sun|Soleil/.test(a.body) || !/ASC/.test(a.body)) failures.push("the AI request lacks the positions");
    if (a.headers["anthropic-dangerous-direct-browser-access"] !== "true") failures.push("direct call without its browser header");
  }
  const relayed = fnCalls.filter((r) => decodeFnName(r.url).startsWith("relayAi"));
  if (AI_ON && !relayed.length) failures.push("no request went to the relay");
  for (const r of relayed) {
    if (!/Person A|Personne A|ASC/.test(r.body)) failures.push("the relayed prompt lacks the positions");
  }

  // Timing asks the server only for the sky, by date; the transits are worked out here.
  if (fnCalls.some((r) => /^castTiming/.test(decodeFnName(r.url)))) failures.push("Timing sent the chart to the server");
  let skyAsks = 0;
  for (const r of seen) {
    const u = new URL(r.url);
    if (u.pathname !== "/api/sky-window" && u.pathname !== "/api/sky-year") continue;
    skyAsks += 1;
    const keys = [...u.searchParams.keys()].sort().join(",");
    if (r.method !== "GET" || r.body || !(keys === "t0,v" || keys === "v,y")) failures.push(`a sky request carries more than a date: ${r.method} ${r.url.slice(0, 100)}`);
  }
  if (!skyAsks) failures.push("Timing asked for no sky");

  if (failures.length) {
    console.error(failures.join("\n"));
    throw new Error(`${failures.length} privacy failure(s)`);
  }
  console.log(`privacy ok: ${seen.length} requests, ${casts.length} casts, ${aiBodies.length} direct AI and ${relayed.length} relayed AI requests checked (${DEV})`);
}

await run();
