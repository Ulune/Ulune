/*
 * What a page may ask of the network while it works on the device
 * (languages plan, part 30: "no request leaves while a Chinese page
 * calculates, casts or reads the compass"): GET requests to Ulune's own
 * address for Ulune's own files, and nothing else. Anything other than a
 * GET, any other site, a server call (/_serverFn/, /api/) or an address of
 * Ulune's that is not one of its files is "sent". Used by the privacy suite
 * and by each Chinese suite's own check, so they hold to one rule.
 *
 * The app's files, as the browser asks for them:
 *   - /assets/…: the built app's code, styles and fonts (and the
 *     encyclopedia's entries), named by their content;
 *   - /src/…, /node_modules/…, /@vite/client, /@react-refresh, /@id/…,
 *     /@fs/…, /@tanstack-start/…: the same, from the development server;
 *   - the calculations' engine and its ephemeris files (on-device plan): the
 *     build's /assets/…, the development server's /ephe/… (the same for
 *     everyone, fetched once by the engine's worker, never with a chart);
 *   - the icons and the manifest the page names, the offline worker's own
 *     script (/sw.js) and the list of the encyclopedia's files it keeps
 *     (/encyclopedia-offline.json), the pictures of the encyclopedia's
 *     link previews (/previews/…).
 * None of them carries a query, but for the development server's own
 * (its cache stamps and kinds of import, `?t=…`, `?v=…`, `?import`…): a
 * word riding on one of the app's own addresses is sent all the same
 * (part 30, the review). A page of Ulune's loaded anew (a reload, Back, a
 * link followed) is allowed too, when it is one of the studio's addresses,
 * Settings or an encyclopedia page and its query only says which page and
 * view it shows. Data and blob addresses never leave the browser.
 */
import { DEV } from "./_lib.mjs";

const ORIGIN = new URL(DEV).origin;

/** The app's own files, by their path. */
export const APP_FILES = [
  /^\/assets\/[\w.@~-]+$/,
  /^\/(?:src|node_modules)\//,
  /^\/@(?:vite\/client$|react-refresh$|id\/|fs\/|tanstack-start\/)/,
  /^\/(?:favicon\.(?:ico|svg)|manifest\.webmanifest|sw\.js|encyclopedia-offline\.json)$/,
  /^\/(?:icons\/[\w-]+\.png|previews\/[\w-]+\.jpg)$/,
  /^\/ephe\/[\w.-]+\.(?:se1|txt)$/,
];

/** The development server's modules, and the only query they may carry: its own (cache stamps, kinds of import, a route list). */
const DEV_MODULES = /^\/(?:src\/|node_modules\/|ephe\/|@)/;
const DEV_QUERY = new Set(["t", "v", "import", "url", "raw", "inline", "direct", "worker", "worker_file", "type", "used", "lang", "tsr-split", "routes", "html-proxy", "index"]);

/**
 * Ulune's own pages: the studio's addresses (src/studio/map.ts), Settings, the encyclopedia's pages,
 * and /s, where a share link lands (its chart is after "#", which no request ever carries).
 */
export const APP_PAGES =
  /^\/(?:astrology(?:\/(?:transits|progressions|synastry|composite))?|human-design(?:\/pair)?|numerology(?:\/cycles)?|chinese-astrology(?:\/(?:cycles|pair))?|bazi(?:\/(?:cycles|pair))?|feng-shui(?:\/home)?|calendar|calendrier|settings|s|(?:encyclopedia|encyclopedie)(?:\/[a-z0-9-]+)?)?\/?$/;

/** What a page's address may carry (src/studio/url.ts): the page, the view, the dock's pages. */
const PAGE_QUERY = new Set(["studio", "view", "bodies", "look"]);

/**
 * Why this request is not a GET of one of the app's own files, or "" when it
 * is. `extra`: more paths allowed for this suite (an encyclopedia's pages).
 */
export function notAppFile(request, extra = []) {
  const url = request.url();
  const u = new URL(url);
  if (u.protocol === "data:" || u.protocol === "blob:") return "";
  const what = `${request.method()} ${u.origin === ORIGIN ? u.pathname : url.slice(0, 120)}`;
  if (u.origin !== ORIGIN) return `${what} (another site)`;
  if (request.method() !== "GET") return what;
  if (request.postData()) return `${what} (with a body)`;
  if (APP_FILES.some((re) => re.test(u.pathname))) {
    const riding = [...u.searchParams.keys()].filter((k) => !(DEV_MODULES.test(u.pathname) && DEV_QUERY.has(k)));
    return riding.length ? `${what}${u.search.slice(0, 80)} (a query on one of the app's files)` : "";
  }
  if (extra.some((re) => re.test(u.pathname))) return "";
  if (request.resourceType() === "document" && APP_PAGES.test(u.pathname) && [...u.searchParams.keys()].every((k) => PAGE_QUERY.has(k))) return "";
  return `${what}${u.search ? ` ${u.search.slice(0, 80)}` : ""} (not one of the app's files)`;
}

/**
 * Watches what the page sends from now on: the list of requests that are
 * not the app's own files by GET. `list.stop()` ends the watch (a part that
 * may ask the server, such as the Calendar's sky, comes after).
 */
export function watchSent(page, extra = []) {
  const sent = [];
  const on = (r) => {
    const why = notAppFile(r, extra);
    if (why) sent.push(why);
  };
  page.on("request", on);
  sent.stop = () => page.off("request", on);
  return sent;
}
