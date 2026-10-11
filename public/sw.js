/*
 * Ulune kept on this device (performance plan 1.14). Installed only when the
 * visitor says yes (src/lib/offline.ts); until then there is none.
 *
 * It keeps the app's own files and the sky of the dates opened, nothing else:
 * server calls, sign-in and every other request go to the network untouched,
 * and nothing is sent anywhere.
 *   - /assets/*: the app's code, styles and fonts. Their names change with
 *     their content, so a copy never goes stale: from the device once fetched.
 *   - The sky's files (/api/sky-window, /api/sky-year): the same for
 *     everyone, asked for by date and version only, never changing for a
 *     given address; kept so the calendar's months open offline.
 *   - The studio's pages ("/" and its paths: /astrology…, /human-design,
 *     /numerology, /numerology/cycles, /chinese-astrology (and /cycles, /pair), /bazi (and /cycles), /calendar,
 *     /calendrier): from the
 *     network as always (checked with the server, never an older copy from
 *     the browser's cache), and the last copy is kept, so saved charts still
 *     open without a connection. It is the same page for everyone; no other
 *     page (sign-in above all) is ever kept.
 *   - The encyclopedia's pages (/encyclopedia…, /encyclopedie…): from the
 *     network, the last 60 read kept; without a connection, the page kept,
 *     else the encyclopedia's home of that language, marked as a copy (the
 *     page then draws the address asked from the data kept on the device).
 *   - "Keep the encyclopedia on this device" (src/lib/encyclopedia-offline.ts,
 *     part 21): the page sends the list of its files for a language
 *     (/encyclopedia-offline.json); they are fetched and kept apart, never let
 *     go until the reader turns it off or a new list replaces them.
 * A new deploy needs nothing from here: its pages name new files, which are
 * fetched and kept in turn; the oldest files are let go past a limit.
 */
const FILES = "ulune-files-v1";
const PAGES = "ulune-pages-v1";
const SKY = "ulune-sky-v1";
const MAX_FILES = 300;
const MAX_PAGES = 12;
const MAX_SKY = 120;
const ENC_PAGES = "ulune-enc-pages-v1";
const MAX_ENC_PAGES = 60;
/** The encyclopedia kept whole, by language, and the files both need. */
const ENC_KEPT = { en: "ulune-enc-en-v1", fr: "ulune-enc-fr-v1", shared: "ulune-enc-shared-v1" };
const ENCYCLOPEDIA = /^\/(?:encyclopedia|encyclopedie)(?:\/[a-z0-9-]+)?\/?$/;
/** The studio's paths (src/studio/map.ts): the same page, each kept under its own address. */
const STUDIO = /^\/(?:astrology(?:\/(?:transits|progressions|synastry|composite))?|human-design|numerology(?:\/cycles)?|chinese-astrology(?:\/(?:cycles|pair))?|bazi(?:\/cycles)?|calendar|calendrier)?\/?$/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([FILES, PAGES, SKY, ENC_PAGES, ...Object.values(ENC_KEPT)]);
      for (const key of await caches.keys()) {
        // Legacy names: the caches from before the name Ulune went too.
        if ((key.startsWith("ulune-") || key.startsWith("orbis-")) && !keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(file(req, event));
    return;
  }
  if (url.pathname === "/api/sky-window" || url.pathname === "/api/sky-year") {
    event.respondWith(file(req, event, SKY, MAX_SKY));
    return;
  }
  // Only the studio's and the encyclopedia's pages; every other page
  // (sign-in, callbacks) is left to the browser, as if there were no worker.
  if (req.mode === "navigate" && STUDIO.test(url.pathname)) event.respondWith(page(req, event));
  else if (req.mode === "navigate" && ENCYCLOPEDIA.test(url.pathname)) event.respondWith(encyclopediaPage(req, event, url));
});

/** An encyclopedia page: the network's, kept; offline, the one kept, else the home of its language as a copy. */
async function encyclopediaPage(req, event, url) {
  const cache = await caches.open(ENC_PAGES);
  try {
    const res = await fetch(req.url, { cache: "no-cache", credentials: "same-origin", redirect: "manual" });
    const html = (res.headers.get("content-type") || "").includes("text/html");
    const keepable = !/no-store|private/.test(res.headers.get("cache-control") || "");
    if (res.ok && html && keepable && res.type === "basic") {
      event.waitUntil(cache.put(req.url, res.clone()).then(() => trim(cache, MAX_ENC_PAGES)));
    }
    return res;
  } catch (err) {
    const exact = await caches.match(req.url);
    if (exact) return exact;
    const home = new URL(url.pathname.startsWith("/encyclopedie") ? "/encyclopedie" : "/encyclopedia", self.location.origin).href;
    const base = (await caches.match(home)) || (await anyEncyclopediaPage(cache, url.pathname.startsWith("/encyclopedie")));
    if (!base) throw err;
    // Marked as a copy: the page draws the address asked from its own data (src/lib/error-report.ts expects the mismatch).
    const text = (await base.text()).replace("<head>", '<head><meta name="ulune-offline-copy" content="1">');
    return new Response(text, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function anyEncyclopediaPage(cache, fr) {
  for (const key of (await cache.keys()).reverse()) {
    if (new URL(key.url).pathname.startsWith(fr ? "/encyclopedie" : "/encyclopedia")) return cache.match(key);
  }
  return null;
}

/*
 * "Keep the encyclopedia on this device": { type: "enc-keep", lang, files,
 * pages } fetches and keeps a language's files (and the shared ones), telling
 * the page how far it is; { type: "enc-drop", lang } lets them go.
 */
self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  const reply = (data) => event.source?.postMessage(data);
  if (msg.type === "enc-keep" && (msg.lang === "en" || msg.lang === "fr")) {
    event.waitUntil(keepEncyclopedia(msg, reply));
  } else if (msg.type === "enc-drop") {
    event.waitUntil(
      (async () => {
        for (const lang of msg.lang === "en" || msg.lang === "fr" ? [msg.lang] : ["en", "fr"]) await caches.delete(ENC_KEPT[lang]);
        if (!(await caches.has(ENC_KEPT.en)) && !(await caches.has(ENC_KEPT.fr))) await caches.delete(ENC_KEPT.shared);
        reply({ type: "enc-dropped", lang: msg.lang ?? null });
      })(),
    );
  }
});

async function keepEncyclopedia(msg, reply) {
  const own = await caches.open(ENC_KEPT[msg.lang]);
  const shared = await caches.open(ENC_KEPT.shared);
  const same = (u) => new URL(u, self.location.origin).origin === self.location.origin;
  const jobs = [...(msg.files || []).filter(same).map((u) => [own, u]), ...(msg.shared || []).filter(same).map((u) => [shared, u]), ...(msg.pages || []).filter(same).map((u) => [own, u])];
  // A new list replaces the old one: what it no longer names goes.
  const wanted = new Set(jobs.map(([, u]) => new URL(u, self.location.origin).href));
  for (const c of [own]) for (const key of await c.keys()) if (!wanted.has(key.url)) await c.delete(key);
  let done = 0;
  let failed = 0;
  const queue = jobs.slice();
  const worker = async () => {
    while (queue.length) {
      const [cache, u] = queue.shift();
      try {
        if (!(await cache.match(u))) {
          const res = await fetch(u, { credentials: "same-origin" });
          if (res.ok) await cache.put(u, res);
          else failed += 1;
        }
      } catch {
        failed += 1;
      }
      done += 1;
      if (done % 25 === 0 || done === jobs.length) reply({ type: "enc-progress", lang: msg.lang, done, total: jobs.length, failed });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  reply({ type: "enc-kept", lang: msg.lang, total: jobs.length, failed });
}

async function file(req, event, name = FILES, max = MAX_FILES) {
  const cache = await caches.open(name);
  // Kept anywhere (the encyclopedia kept whole too).
  const hit = (await cache.match(req)) || (await caches.match(req));
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") {
    event.waitUntil(cache.put(req, res.clone()).then(() => trim(cache, max)));
  }
  return res;
}

async function page(req, event) {
  const cache = await caches.open(PAGES);
  try {
    // Always asked of the server (a copy the browser's cache kept could be older than the code).
    const res = await fetch(req.url, { cache: "no-cache", credentials: "same-origin", redirect: "manual" });
    const html = (res.headers.get("content-type") || "").includes("text/html");
    const keepable = !/no-store|private/.test(res.headers.get("cache-control") || "");
    if (res.ok && html && keepable && res.type === "basic") {
      event.waitUntil(cache.put(req.url, res.clone()).then(() => trim(cache, MAX_PAGES)));
    }
    return res;
  } catch (err) {
    // No connection: the last copy of this view of the studio, or of "/".
    const hit = (await cache.match(req.url)) || (await cache.match(new URL("/", self.location.origin).href));
    if (hit) return hit;
    throw err;
  }
}

/** The oldest kept first: let go of them past the limit. */
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}
