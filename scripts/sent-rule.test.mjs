/**
 * The rule the privacy suite and the Chinese suites hold every request to
 * (scripts/e2e/_sent.mjs; languages plan, part 30): a GET of one of the app's
 * own files at Ulune's address, with no body and no query of its own, or one
 * of Ulune's pages loaded anew. Fake requests, no browser: what passes and
 * what is "sent".
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEV } from "./e2e/_lib.mjs";
import { notAppFile } from "./e2e/_sent.mjs";

const at = (path) => new URL(path, DEV).href;
const ask = (url, { method = "GET", body = null, type = "script" } = {}) => ({
  url: () => url,
  method: () => method,
  postData: () => body,
  resourceType: () => type,
});

test("the app's own files and pages pass", () => {
  for (const [path, type] of [
    ["/assets/bazi-luck-reading-D6Mz6hIi.js", "script"],
    ["/assets/zodiac-BcOwWELd.css", "stylesheet"],
    ["/src/routes/_studio.tsx?t=1791950172249&tsr-split=component", "script"],
    ["/src/assets/fonts/FamiljenGrotesk-latin-wght.woff2?import&url", "script"],
    ["/src/lib/content/pack-astro.ts?t=1791945994730&lang=en", "script"],
    ["/node_modules/.vite/deps/react.js?v=ba67902d", "script"],
    ["/@vite/client", "script"],
    ["/@id/virtual:tanstack-start-dev-client-entry", "script"],
    ["/@tanstack-start/styles.css?routes=__root__%2C%2F_studio", "stylesheet"],
    ["/manifest.webmanifest", "manifest"],
    ["/icons/apple-touch-icon.png", "image"],
    ["/encyclopedia-offline.json", "fetch"],
    ["/previews/saturn.jpg", "image"],
    ["/feng-shui/home", "document"],
    ["/bazi/cycles?view=table", "document"],
    ["/encyclopedie/station", "document"],
  ]) {
    assert.equal(notAppFile(ask(at(path), { type })), "", path);
  }
  assert.equal(notAppFile(ask("data:image/png;base64,AAAA")), "", "a data address never leaves the browser");
});

test("anything else is sent: another site, a server call, a body, a word riding on an address", () => {
  const sent = [
    ask("https://example.org/pixel.gif"),
    ask(at("/_serverFn/eyJmaWxlIjoiIn0"), { method: "POST", body: "{}" }),
    ask(at("/api/sky-window?t0=1789948800000&v=3.2"), { type: "fetch" }),
    ask(at("/assets/app-CYft2bYc.js"), { method: "POST" }),
    ask(at("/assets/app-CYft2bYc.js"), { body: "facing=137.25" }),
    // The built files never carry a query; the development server's modules only its own.
    ask(at("/assets/app-CYft2bYc.js?facing=137.25")),
    ask(at("/sw.js?heading=203.4")),
    ask(at("/src/lib/chinese/fengshui-home.ts?t=1&year=1931")),
    // A page with a query that says more than which page and view.
    ask(at("/feng-shui/home?facing=137.25"), { type: "document" }),
    // An address of Ulune's that is none of its files.
    ask(at("/robots.txt"), { type: "fetch" }),
  ];
  for (const r of sent) assert.notEqual(notAppFile(r), "", r.url());
  assert.match(notAppFile(ask(at("/assets/app-CYft2bYc.js?facing=137.25"))), /a query on one of the app's files/);
});

test("a suite may allow more of Ulune's own addresses", () => {
  const page = ask(at("/encyclopedia/saturn"), { type: "fetch" });
  assert.notEqual(notAppFile(page), "", "fetched, not loaded as a page");
  assert.equal(notAppFile(page, [/^\/encyclopedia\/[a-z0-9-]+$/]), "");
});
