// The inline scripts that run before the app (src/lib/boot.ts) are strings:
// a syntax slip would only show in a browser. They must parse, and run
// without throwing when storage is empty or broken (they fail open).
import { test } from "node:test";
import assert from "node:assert/strict";
import { bootScript, firstViewScript } from "../src/lib/boot.ts";

function fakeDom(storage) {
  const attrs = new Map();
  const root = {
    classList: { contains: () => false },
    style: { cssText: "" },
    hasAttribute: (k) => attrs.has(k),
    setAttribute: (k, v) => attrs.set(k, v),
    getAttribute: (k) => attrs.get(k) ?? null,
  };
  const appended = [];
  const document = {
    documentElement: root,
    head: { appendChild: (el) => appended.push(el) },
    body: { appendChild: (el) => appended.push(el) },
    createElement: (tag) => ({ tag, style: {}, setAttribute() {}, set innerHTML(v) { this.html = v; } }),
    querySelector: () => null,
  };
  return { document, root, attrs, appended, localStorage: storage };
}

function run(src, env, extra = {}) {
  const fn = new Function("document", "localStorage", "location", "innerWidth", "innerHeight", "URLSearchParams", "window", src);
  fn(env.document, env.localStorage, extra.location ?? { pathname: "/", search: "" }, extra.w ?? 1280, extra.h ?? 900, URLSearchParams, extra.window ?? {});
}

const store = (items) => ({ getItem: (k) => (k in items ? items[k] : null) });
const glyphs = { astronomicon: "/assets/a.woff2" };

test("both boot scripts parse", () => {
  assert.doesNotThrow(() => new Function(bootScript(glyphs)));
  assert.doesNotThrow(() => new Function(firstViewScript()));
});

test("they fail open: broken storage, empty storage", () => {
  const broken = { getItem: () => { throw new Error("blocked"); } };
  for (const s of [broken, store({})]) {
    const env = fakeDom(s);
    assert.doesNotThrow(() => run(bootScript(glyphs), env));
    assert.doesNotThrow(() => run(firstViewScript(), env));
    assert.equal(env.attrs.has("data-first-view"), false);
  }
});

test("a returning reader's first view is drawn only when it still fits", () => {
  const snap = { v: 1, id: "c1", theme: "dark", look: "", w: 1280, h: 900, x: 10, y: 20, s: 700, html: "<svg></svg>" };
  const items = {
    "orbis.charts.v1": "[{}]",
    "orbis.charts.active": "c1",
    "orbis.firstview.v1": JSON.stringify(snap),
  };
  const ok = fakeDom(store(items));
  run(bootScript(glyphs), ok);
  run(firstViewScript(), ok);
  assert.equal(ok.attrs.has("data-returning"), true);
  assert.equal(ok.attrs.has("data-first-view"), true);
  assert.equal(ok.appended.at(-1).html, "<svg></svg>");

  const cases = [
    [{ ...items, "orbis.charts.active": "c2" }, {}],
    [{ ...items, "ulune.studio.view": "table" }, {}],
    [{ ...items, "ulune.depth.v1": '{"lift":true,"view":"3d"}' }, {}],
    [items, { w: 1024 }],
    [items, { location: { pathname: "/", search: "?studio=transits" } }],
    [items, { location: { pathname: "/settings", search: "" } }],
  ];
  for (const [s, extra] of cases) {
    const env = fakeDom(store(s));
    run(bootScript(glyphs), env, extra);
    run(firstViewScript(), env, extra);
    assert.equal(env.attrs.has("data-first-view"), false, JSON.stringify(extra) + JSON.stringify(s).slice(0, 80));
  }
});

test("a private space marks a returning reader; a first view waits for a space that stays unlocked", () => {
  for (const flag of ["locked", "stay"]) {
    const env = fakeDom(store({ "ulune.space": flag }));
    run(bootScript(glyphs), env);
    assert.equal(env.attrs.has("data-returning"), true, flag);
    // No database here: the script gives up quietly, nothing drawn.
    assert.doesNotThrow(() => run(firstViewScript(), env));
    assert.equal(env.attrs.has("data-first-view"), false);
    assert.ok(!env.appended.some((el) => el.tag === "ulune-first-view"));
  }
});

test("a first view never lands once the app is past it", () => {
  const snap = { v: 1, id: "c1", theme: "dark", look: "", w: 1280, h: 900, x: 10, y: 20, s: 700, html: "<svg></svg>" };
  const items = { "orbis.charts.v1": "[{}]", "orbis.charts.active": "c1", "orbis.firstview.v1": JSON.stringify(snap) };
  const env = fakeDom(store(items));
  run(bootScript(glyphs), env);
  run(firstViewScript(), env, { window: { __uluneFirstViewOver: true } });
  assert.equal(env.attrs.has("data-first-view"), false);
});

test("the old name's display settings move to Ulune's once; the prototype's charts stay for 'Charts from before'", async () => {
  const { RENAME_BOOT, LEGACY_LIBRARY, LEGACY_ACTIVE, LEGACY_ACCOUNT_PREFIX, LEGACY_PREFIX, PREFIX } = await import("../src/lib/space/legacy.ts");
  const items = new Map([
    [`${LEGACY_PREFIX}theme`, "light"],
    [`${LEGACY_PREFIX}look.v1`, '{"accent":"gold"}'],
    [`${LEGACY_PREFIX}locale`, "fr"],
    [`${PREFIX}locale`, "en"],
    [LEGACY_LIBRARY, "[{}]"],
    [LEGACY_ACTIVE, "c1"],
    [`${LEGACY_ACCOUNT_PREFIX}u1`, "[]"],
    ["other.key", "x"],
  ]);
  const storage = {
    get length() {
      return items.size;
    },
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (k) => (items.has(k) ? items.get(k) : null),
    setItem: (k, v) => items.set(k, String(v)),
    removeItem: (k) => items.delete(k),
  };
  new Function("localStorage", RENAME_BOOT)(storage);
  assert.equal(items.get(`${PREFIX}theme`), "light");
  assert.equal(items.get(`${PREFIX}look.v1`), '{"accent":"gold"}');
  assert.equal(items.get(`${PREFIX}locale`), "en", "a setting already under the new name wins");
  assert.equal(items.has(`${LEGACY_PREFIX}theme`), false);
  assert.equal(items.has(`${LEGACY_PREFIX}locale`), false);
  assert.equal(items.get(LEGACY_LIBRARY), "[{}]");
  assert.equal(items.get(LEGACY_ACTIVE), "c1");
  assert.equal(items.get(`${LEGACY_ACCOUNT_PREFIX}u1`), "[]");
  assert.equal(items.get("other.key"), "x");
  // Run again: nothing more moves, nothing breaks; broken storage fails open.
  new Function("localStorage", RENAME_BOOT)(storage);
  assert.equal(items.get(`${PREFIX}theme`), "light");
  assert.doesNotThrow(() => new Function("localStorage", RENAME_BOOT)({ get length() { throw new Error("blocked"); } }));
});
