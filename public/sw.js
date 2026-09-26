/*
 * Ulune kept on this device (performance plan 1.14). Installed only when the
 * visitor says yes (src/lib/offline.ts); until then there is none.
 *
 * It keeps the app's own files and nothing else: server calls, sign-in and
 * every other request go to the network untouched, and nothing is sent
 * anywhere.
 *   - /assets/*: the app's code, styles and fonts. Their names change with
 *     their content, so a copy never goes stale: from the device once fetched.
 *   - The studio's page ("/"): from the network as always, and the last copy
 *     is kept, so saved charts still open without a connection. It is the same
 *     page for everyone; no other page (sign-in above all) is ever kept.
 * A new deploy needs nothing from here: its pages name new files, which are
 * fetched and kept in turn; the oldest files are let go past a limit.
 */
const FILES = "ulune-files-v1";
const PAGES = "ulune-pages-v1";
const MAX_FILES = 300;
const MAX_PAGES = 12;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([FILES, PAGES]);
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
  // Only the studio's page; every other page (sign-in, callbacks) is left
  // to the browser, as if there were no worker.
  if (req.mode === "navigate" && url.pathname === "/") event.respondWith(page(req, event));
});

async function file(req, event) {
  const cache = await caches.open(FILES);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") {
    event.waitUntil(cache.put(req, res.clone()).then(() => trim(cache, MAX_FILES)));
  }
  return res;
}

async function page(req, event) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
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
