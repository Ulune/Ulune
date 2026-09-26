/**
 * A self-test run for a browser the test machine can only watch, not drive
 * (Safari on a Mac). Open the development app with `?qa=<suite>` and the page
 * walks the suite by itself: each step acts through the page (clicks, pointer
 * moves on the wheel, the time slider), measures the frames it took, and holds
 * its result on screen for a few seconds under a banner, for screenshots. The
 * report goes to the dev server, which keeps it in `.qa-selftest/reports/`
 * (scripts/qa-selftest). The suites are fixed here; nothing comes from outside.
 *
 * The reader's own storage (Look, theme, the last mode) is kept aside at the
 * start and put back at the end, then the page reloads without the flag. A
 * private space is locked for the run, so none of its charts are written into
 * it (its owner unlocks it again afterwards), and no sheet covers the page;
 * with nothing on screen, the run draws the sample chart. The space suite
 * tries the private space's building blocks with a throwaway space of its
 * own, in its own database, erased at the end. Development only: Shell.tsx
 * loads this behind import.meta.env.DEV.
 */

import { loadSpaceRuntime } from "@/lib/space/load";
import { closeSpaceSheet, useSpace } from "@/lib/space/state";

type Stats = {
  frames: number;
  fps: number;
  p50: number;
  p95: number;
  max: number;
  over25: number;
  over50: number;
};

type Step = {
  name: string;
  ok: boolean;
  ms: number;
  data?: unknown;
  error?: string;
};

const SNAPSHOT = "ulune.qa.snapshot";
const RESTORE_NEXT = "ulune.qa.restore-next";
/** A pointer id no real pointer uses; setPointerCapture is told to allow it. */
const QA_POINTER = 4242;

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const frame = () => new Promise<number>((r) => requestAnimationFrame(r));

function stats(ts: number[]): Stats {
  const d = ts.slice(1).map((t, i) => t - ts[i]);
  const s = [...d].sort((a, b) => a - b);
  const pick = (q: number) => (s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0);
  const span = ts.length > 1 ? ts[ts.length - 1] - ts[0] : 0;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    frames: d.length,
    fps: span > 0 ? r1((d.length * 1000) / span) : 0,
    p50: r1(pick(0.5)),
    p95: r1(pick(0.95)),
    max: r1(s.length ? s[s.length - 1] : 0),
    over25: d.filter((x) => x > 25).length,
    over50: d.filter((x) => x > 50).length,
  };
}

/** Frame times from now until stop(). */
function recordFrames() {
  const ts: number[] = [];
  let on = true;
  const tick = (t: number) => {
    ts.push(t);
    if (on) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    stop: () => {
      on = false;
      return stats(ts);
    },
  };
}

async function framesFor(ms: number) {
  const rec = recordFrames();
  await sleep(ms);
  return rec.stop();
}

const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const byTest = <T extends Element = HTMLElement>(id: string) => q<T>(`[data-testid="${id}"]`);

async function until<T>(fn: () => T | null | undefined | false, ms = 15000, step = 100): Promise<T> {
  const end = performance.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() > end) throw new Error("timed out");
    await sleep(step);
  }
}

function center(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function click(el: Element | null, what: string) {
  if (!(el instanceof HTMLElement)) throw new Error(`no ${what}`);
  el.click();
}

// ── Pointer events, as a mouse would send them ──────────────────────────────

let captureAllowed = false;
function allowSyntheticCapture() {
  if (captureAllowed) return;
  captureAllowed = true;
  const proto = Element.prototype;
  const set = proto.setPointerCapture;
  const release = proto.releasePointerCapture;
  proto.setPointerCapture = function (id: number) {
    if (id === QA_POINTER) return;
    set.call(this, id);
  };
  proto.releasePointerCapture = function (id: number) {
    if (id === QA_POINTER) return;
    release.call(this, id);
  };
}

type PointerOpts = { buttons?: number; button?: number; shiftKey?: boolean; target?: Element | null };
let lastOver: Element | null = null;

function pointer(type: string, x: number, y: number, o: PointerOpts = {}) {
  const target = o.target ?? document.elementFromPoint(x, y) ?? document.body;
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    button: o.button ?? 0,
    buttons: o.buttons ?? 0,
    shiftKey: Boolean(o.shiftKey),
    view: window,
  };
  if (type === "pointermove" && target !== lastOver) {
    if (lastOver) {
      lastOver.dispatchEvent(new PointerEvent("pointerout", { ...init, pointerId: QA_POINTER, pointerType: "mouse", isPrimary: true, relatedTarget: target }));
      lastOver.dispatchEvent(new MouseEvent("mouseout", { ...init, relatedTarget: target }));
    }
    target.dispatchEvent(new PointerEvent("pointerover", { ...init, pointerId: QA_POINTER, pointerType: "mouse", isPrimary: true, relatedTarget: lastOver }));
    target.dispatchEvent(new MouseEvent("mouseover", { ...init, relatedTarget: lastOver }));
    lastOver = target;
  }
  target.dispatchEvent(new PointerEvent(type, { ...init, pointerId: QA_POINTER, pointerType: "mouse", isPrimary: true }));
  const mouse = { pointermove: "mousemove", pointerdown: "mousedown", pointerup: "mouseup" }[type];
  if (mouse) target.dispatchEvent(new MouseEvent(mouse, init));
  return target;
}

/** Pointer out of the page's content (a hover ends). */
function pointerAway() {
  pointer("pointermove", 2, 2);
}

function clickAt(x: number, y: number) {
  const t = pointer("pointerdown", x, y, { buttons: 1 });
  pointer("pointerup", x, y, { target: t });
  t.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window }));
}

/** A drag along the points, one move per frame. */
async function drag(points: { x: number; y: number }[], o: { shiftKey?: boolean } = {}) {
  allowSyntheticCapture();
  const [first] = points;
  const down = pointer("pointerdown", first.x, first.y, { buttons: 1, shiftKey: o.shiftKey });
  for (const p of points.slice(1)) {
    await frame();
    pointer("pointermove", p.x, p.y, { buttons: 1, shiftKey: o.shiftKey, target: down });
  }
  const last = points[points.length - 1];
  pointer("pointerup", last.x, last.y, { shiftKey: o.shiftKey, target: down });
}

function line(a: { x: number; y: number }, b: { x: number; y: number }, n: number) {
  return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
}

function wheelAt(x: number, y: number, deltaY: number) {
  const target = document.elementFromPoint(x, y) ?? document.body;
  target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, deltaY, deltaMode: 0, view: window }));
}

function key(k: string, target: Element | null = document.activeElement) {
  const t = target ?? document.body;
  t.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, composed: true }));
  t.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true, cancelable: true, composed: true }));
}

function setRange(el: HTMLInputElement, value: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, String(value));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// ── The page around the run ─────────────────────────────────────────────────

function banner() {
  const el = document.createElement("div");
  el.setAttribute("data-qa-banner", "");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:6px",
    "transform:translateX(-50%)",
    "z-index:2147483647",
    "pointer-events:none",
    "font:600 13px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace",
    "color:#111",
    "background:#ffd24a",
    "border-radius:6px",
    "padding:4px 10px",
    "white-space:pre",
    "box-shadow:0 2px 8px rgba(0,0,0,.35)",
  ].join(";");
  document.body.appendChild(el);
  return el;
}

function snapshotStorage() {
  if (sessionStorage.getItem(SNAPSHOT)) return;
  const all: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k != null) all[k] = localStorage.getItem(k) ?? "";
  }
  sessionStorage.setItem(SNAPSHOT, JSON.stringify(all));
}

/** Puts the stored snapshot back; true when there was one. */
function restoreStorage(): boolean {
  const raw = sessionStorage.getItem(SNAPSHOT);
  if (!raw) return false;
  const all = JSON.parse(raw) as Record<string, string>;
  const now: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k != null) now.push(k);
  }
  for (const k of now) if (!(k in all)) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(all)) if (localStorage.getItem(k) !== v) localStorage.setItem(k, v);
  return true;
}

function captureErrors() {
  const errors: string[] = [];
  const onError = (e: ErrorEvent) => errors.push(`error: ${e.message} @ ${e.filename}:${e.lineno}`);
  const onRejection = (e: PromiseRejectionEvent) => errors.push(`rejection: ${String((e.reason as Error)?.stack ?? e.reason)}`);
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args: unknown[]) => {
    errors.push(`console.error: ${args.map(String).join(" ").slice(0, 400)}`);
    origError.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    errors.push(`console.warn: ${args.map(String).join(" ").slice(0, 400)}`);
    origWarn.apply(console, args);
  };
  const lost: string[] = [];
  const onLost = (e: Event) => lost.push(`webglcontextlost on ${(e.target as Element).tagName}`);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  document.addEventListener("webglcontextlost", onLost, true);
  return {
    errors,
    lost,
    stop() {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("webglcontextlost", onLost, true);
      console.error = origError;
      console.warn = origWarn;
    },
  };
}

function environment() {
  let renderer = "none";
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    }
  } catch (err) {
    renderer = String(err);
  }
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return {
    ua: navigator.userAgent,
    dpr: devicePixelRatio,
    viewport: [innerWidth, innerHeight],
    screen: [screen.width, screen.height],
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    visibility: document.visibilityState,
    focus: document.hasFocus(),
    renderer,
    theme: document.documentElement.classList.contains("light") ? "light" : "dark",
    lang: document.documentElement.lang,
    load: nav
      ? { ttfb: Math.round(nav.responseStart), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) }
      : null,
  };
}

// ── Studio navigation (as scripts/e2e/_lib.mjs does it) ─────────────────────

const MODE_GROUP: Record<string, string> = {
  natal: "chart",
  transits: "time",
  timing: "time",
  progressions: "time",
  synastry: "pair",
  composite: "pair",
  design: "systems",
  numerology: "systems",
};

async function goMode(id: string) {
  const table = byTest("view-table");
  if (table?.getAttribute("aria-pressed") === "true") click(byTest("view-wheel"), "wheel view");
  click(byTest(`mode-group-${MODE_GROUP[id]}`), `mode group ${MODE_GROUP[id]}`);
  const alone = Object.values(MODE_GROUP).filter((g) => g === MODE_GROUP[id]).length === 1;
  if (!alone) {
    const tab = await until(() => byTest(`studio-page-${id}`), 8000);
    click(tab, `studio page ${id}`);
  }
  await sleep(300);
}

const wheel = () => q<SVGSVGElement>("svg.ulune-wheel:not(.ulune-wheel-ghost)");

/** Moon on the transit ring, for counting how often the drawn sky changes. */
function moonAt() {
  const r = q("[data-testid=transit-ring] [data-kind=transit][data-transit=moon]")?.getBoundingClientRect();
  return r ? `${r.x.toFixed(1)},${r.y.toFixed(1)}` : "none";
}

/** Server calls that finished after `since` (performance time). */
function serverCallsAfter(since: number) {
  return performance
    .getEntriesByType("resource")
    .filter((e) => e.name.includes("/_serverFn") && e.startTime >= since)
    .map((e) => ({ start: Math.round(e.startTime - since), end: Math.round((e as PerformanceResourceTiming).responseEnd - since) }));
}

// ── The suites ─────────────────────────────────────────────────────────────

type Ctx = {
  step: (name: string, fn: () => Promise<unknown>, holdMs?: number) => Promise<void>;
  hold: (label: string, ms: number) => Promise<void>;
};

async function natalSuite({ step }: Ctx) {
  await step("idle frames, natal wheel", () => framesFor(3000));

  await step(
    "hover every planet",
    async () => {
      const svg = await until(wheel);
      const planets = [...svg.querySelectorAll('[data-kind="planet"]')].slice(0, 14);
      if (!planets.length) throw new Error("no planets on the wheel");
      const rec = recordFrames();
      for (const p of planets) {
        const c = center(p);
        pointer("pointermove", c.x, c.y);
        await sleep(220);
      }
      const frames = rec.stop();
      pointerAway();
      return { planets: planets.length, frames };
    },
    1500,
  );

  await step(
    "hover an aspect line (its label)",
    async () => {
      const svg = await until(wheel);
      const lines = [...svg.querySelectorAll('[data-kind="aspect"]')];
      for (const l of lines.slice(0, 12)) {
        const c = center(l);
        pointer("pointermove", c.x, c.y);
        await sleep(250);
        const tip = q(".ulune-wheel-tip");
        if (tip && getComputedStyle(tip).opacity !== "0" && tip.textContent) {
          return { lines: lines.length, tip: tip.textContent.slice(0, 80) };
        }
      }
      return { lines: lines.length, tip: null };
    },
    5000,
  );
  pointerAway();

  await step(
    "pin the Sun",
    async () => {
      const svg = await until(wheel);
      const sun = svg.querySelector('[data-kind="planet"][data-hl="sun"]') ?? svg.querySelector('[data-kind="planet"]');
      if (!sun) throw new Error("no planet to pin");
      const c = center(sun);
      const rec = recordFrames();
      clickAt(c.x, c.y);
      await sleep(1200);
      return { pinned: sun.getAttribute("data-hl"), frames: rec.stop(), hint: byTest("wheel-hint")?.textContent?.slice(0, 80) ?? null };
    },
    6000,
  );

  await step(
    "theme switch with the pin held",
    async () => {
      const light = document.documentElement.classList.contains("light");
      click(byTest("account-menu"), "account menu");
      await until(() => byTest("account-menu-panel"), 8000);
      const rec = recordFrames();
      click(byTest(light ? "theme-dark" : "theme-light"), "theme button");
      await until(() => document.documentElement.classList.contains("light") !== light, 8000);
      await sleep(1500);
      const frames = rec.stop();
      key("Escape");
      return { to: light ? "dark" : "light", frames };
    },
    7000,
  );

  await step("theme back", async () => {
    const light = document.documentElement.classList.contains("light");
    click(byTest("account-menu"), "account menu");
    await until(() => byTest("account-menu-panel"), 8000);
    const rec = recordFrames();
    click(byTest(light ? "theme-dark" : "theme-light"), "theme button");
    await until(() => document.documentElement.classList.contains("light") !== light, 8000);
    await sleep(1500);
    const frames = rec.stop();
    key("Escape");
    return { to: light ? "dark" : "light", frames };
  });

  await step("unpin", async () => {
    const svg = await until(wheel);
    const c = center(svg);
    clickAt(c.x, c.y);
    await sleep(800);
    return true;
  });

  await step(
    "entrance after a mode switch",
    async () => {
      await goMode("transits");
      await until(() => byTest("transit-ring"), 20000);
      await sleep(1500);
      const rec = recordFrames();
      await goMode("natal");
      await sleep(2500);
      return rec.stop();
    },
    2000,
  );
}

async function depthSuite({ step }: Ctx) {
  const scene = () => byTest("wheel-depth");
  await step(
    "3D: enter",
    async () => {
      const btn = byTest("wheel-depth-3d");
      if (!btn) throw new Error("no 3D button");
      const rec = recordFrames();
      click(btn, "3D button");
      await until(() => scene()?.getAttribute("data-depth-view") === "3d" || q("canvas.ulune-depth-gl, .ulune-depth canvas"), 15000);
      await sleep(2500);
      return { view: scene()?.getAttribute("data-depth-view"), canvas: Boolean(q(".ulune-depth canvas")), frames: rec.stop() };
    },
    5000,
  );

  await step(
    "3D: orbit (drag), then the glide",
    async () => {
      const s = scene();
      if (!s) throw new Error("no scene");
      const c = center(s);
      const rec = recordFrames();
      await drag(line({ x: c.x - 160, y: c.y }, { x: c.x + 200, y: c.y + 60 }, 60));
      const during = rec.stop();
      const glide = await framesFor(1500);
      return { during, glide };
    },
    4000,
  );

  await step(
    "3D: zoom with the wheel",
    async () => {
      const s = scene();
      if (!s) throw new Error("no scene");
      const c = center(s);
      const rec = recordFrames();
      for (let i = 0; i < 8; i++) {
        wheelAt(c.x, c.y, -60);
        await frame();
      }
      await sleep(900);
      return rec.stop();
    },
    4000,
  );

  await step(
    "3D: pan (Shift + drag)",
    async () => {
      const s = scene();
      if (!s) throw new Error("no scene");
      const c = center(s);
      const rec = recordFrames();
      await drag(line({ x: c.x, y: c.y }, { x: c.x + 120, y: c.y - 80 }, 40), { shiftKey: true });
      await sleep(600);
      return rec.stop();
    },
    3000,
  );

  await step(
    "3D: the angle button",
    async () => {
      const b = byTest("wheel-camera-angle");
      if (!b) return "no angle button";
      const rec = recordFrames();
      click(b, "angle button");
      await sleep(1600);
      return rec.stop();
    },
    4000,
  );

  await step(
    "3D: arrow keys",
    async () => {
      const s = scene();
      if (!s) throw new Error("no scene");
      (q("svg.ulune-wheel") as SVGElement | null)?.focus?.();
      const rec = recordFrames();
      for (let i = 0; i < 12; i++) {
        key("ArrowLeft", document.activeElement ?? s);
        await sleep(60);
      }
      await sleep(600);
      return rec.stop();
    },
    3000,
  );

  await step(
    "3D: hover planets",
    async () => {
      const svg = await until(wheel);
      const planets = [...svg.querySelectorAll('[data-kind="planet"]')].slice(0, 10);
      const rec = recordFrames();
      for (const p of planets) {
        const c = center(p);
        pointer("pointermove", c.x, c.y);
        await sleep(200);
      }
      pointerAway();
      return rec.stop();
    },
    2000,
  );

  await step("3D: leave", async () => {
    const rec = recordFrames();
    click(byTest("wheel-depth-3d"), "3D button");
    await sleep(2500);
    return { view: scene()?.getAttribute("data-depth-view"), frames: rec.stop() };
  });
}

async function timeSuite({ step }: Ctx) {
  await step(
    "transits: open",
    async () => {
      await goMode("transits");
      await until(() => byTest("transit-ring"), 20000);
      await sleep(2000);
      return true;
    },
    4000,
  );

  await step(
    "transits: drag the scrubber 20 days in 2 s",
    async () => {
      const el = await until(() => byTest<HTMLInputElement>("transit-scrubber"), 10000);
      const v0 = Number(el.value);
      // Development pages load hundreds of modules: make room for the calls to count.
      performance.setResourceTimingBufferSize(5000);
      performance.clearResourceTimings();
      const t0 = performance.now();
      const rec = recordFrames();
      let last = moonAt();
      let changes = 0;
      let watching = true;
      const watch = () => {
        if (!watching) return;
        const m = moonAt();
        if (m !== last) {
          changes++;
          last = m;
        }
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
      for (let i = 1; i <= 120; i++) {
        setRange(el, v0 + (i / 120) * 20 * 86_400_000);
        const due = t0 + i * (2000 / 120);
        await sleep(Math.max(0, due - performance.now()));
      }
      const dragMs = performance.now() - t0;
      watching = false;
      const frames = rec.stop();
      const released = performance.now();
      await sleep(2500);
      const calls = serverCallsAfter(t0);
      const during = calls.filter((c) => c.start <= dragMs).length;
      const after = calls.find((c) => c.start > dragMs);
      return {
        updatesPerSec: Math.round((changes / (dragMs / 1000)) * 10) / 10,
        frames,
        callsDuringDrag: during,
        exactAfterMs: after ? Math.round(after.end - (released - t0)) : null,
      };
    },
    4000,
  );

  await step(
    "transits: Play for 3 s",
    async () => {
      const play = await until(() => byTest("transit-scrubber-play"), 8000);
      let last = moonAt();
      let changes = 0;
      let watching = true;
      const watch = () => {
        if (!watching) return;
        const m = moonAt();
        if (m !== last) {
          changes++;
          last = m;
        }
        requestAnimationFrame(watch);
      };
      const rec = recordFrames();
      requestAnimationFrame(watch);
      click(play, "play");
      await sleep(3000);
      click(byTest("transit-scrubber-play"), "pause");
      watching = false;
      return { updatesPerSec: Math.round((changes / 3) * 10) / 10, frames: rec.stop() };
    },
    2000,
  );

  await step("transits: back to now", async () => {
    const now = byTest("transit-now");
    if (now) now.click();
    await sleep(1500);
    return Boolean(now);
  });

  await step(
    "progressions: drag the slider",
    async () => {
      await goMode("progressions");
      const el = await until(() => byTest<HTMLInputElement>("progressions-slider"), 20000);
      await sleep(1500);
      const v0 = Number(el.value);
      const span = Number(el.max) - Number(el.min);
      const rec = recordFrames();
      for (let i = 1; i <= 60; i++) {
        setRange(el, Math.min(Number(el.max), v0 + (i / 60) * span * 0.05));
        await frame();
      }
      await sleep(1500);
      const frames = rec.stop();
      setRange(el, v0);
      await sleep(800);
      return frames;
    },
    3000,
  );

  await step(
    "timing: a year, then its table",
    async () => {
      await goMode("timing");
      const yearBtn = await until(() => byTest("timing-scope-year"), 20000);
      const t0 = performance.now();
      const rec0 = recordFrames();
      click(yearBtn, "year");
      await until(() => document.querySelector('[data-testid="timing-year"] [data-count]:not([data-count="0"])'), 30000);
      const yearMs = Math.round(performance.now() - t0);
      const yearFrames = rec0.stop();
      await sleep(1500);
      const t1 = performance.now();
      click(byTest("view-table"), "table view");
      await until(() => document.querySelector('[data-testid="timing-table"] tbody tr'), 30000);
      const tableMs = Math.round(performance.now() - t1);
      const rows = document.querySelectorAll('[data-testid="timing-table"] tbody tr').length;
      const wrap = byTest("table-wrap");
      const rec = recordFrames();
      if (wrap) {
        for (let i = 0; i < 40; i++) {
          wrap.scrollTop += 150;
          await frame();
        }
      }
      const scroll = rec.stop();
      await sleep(1000);
      click(byTest("view-wheel"), "wheel view");
      await sleep(500);
      byTest("timing-scope-month")?.click();
      await sleep(800);
      return { yearMs, yearFrames, tableMs, rows, scroll };
    },
    2000,
  );
}

async function modesSuite({ step }: Ctx) {
  for (const id of ["synastry", "composite", "design", "numerology"]) {
    await step(
      `${id}: open`,
      async () => {
        const t0 = performance.now();
        await goMode(id);
        await sleep(2500);
        const need = byTest(`${id}-need-second`);
        return { ms: Math.round(performance.now() - t0), needsSecondChart: Boolean(need) };
      },
      4000,
    );
  }
  await step("back to the natal chart", async () => {
    await goMode("natal");
    await sleep(1500);
    return true;
  });
}

async function phoneSuite({ step }: Ctx) {
  await step(
    "phone width (390 × 844) in a frame",
    async () => {
      const f = document.createElement("iframe");
      f.src = "/";
      f.setAttribute("data-qa-frame", "");
      f.style.cssText = "position:fixed;right:12px;top:40px;width:390px;height:844px;border:2px solid #ffd24a;border-radius:12px;z-index:2147483646;background:#000";
      document.body.appendChild(f);
      await new Promise<void>((r) => f.addEventListener("load", () => r(), { once: true }));
      await sleep(5000);
      const doc = f.contentDocument;
      const overflow = doc ? doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1 : null;
      return { overflow };
    },
    8000,
  );
  q("[data-qa-frame]")?.remove();
}

// ── The private space's building blocks ─────────────────────────────────────
// In this browser's own IndexedDB and WebCrypto, with a throwaway space: the
// reader's space ("ulune-space") is never opened here. A passkey needs a
// person (Touch ID), so passkeys are only asked about, not made.

const QA_SPACE_DB = "ulune-qa-space";
const QA_PASS = "correct horse battery staple";
/**
 * Argon2id of QA_PASS, salt 16 bytes of 7, the space's settings: the C
 * reference's answer (argon2-cffi), as in scripts/space-vault.test.mjs.
 */
const QA_ARGON_KNOWN = "799f12b9e17710824482d829835acb69f5a9355bf774c4f07342823b11b90928";

type PasskeyApi = {
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
  isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  isConditionalMediationAvailable?: () => Promise<boolean>;
};

async function answer<T>(fn: (() => Promise<T>) | undefined): Promise<T | string> {
  if (!fn) return "absent";
  try {
    return await fn();
  } catch (err) {
    return `threw: ${String((err as Error)?.message ?? err)}`;
  }
}

async function spaceSuite({ step }: Ctx) {
  await step("space: what this browser offers", async () => {
    const [{ spaceSupported }, { passkeysPossible, passkeyPrfLikely }] = await Promise.all([
      import("@/lib/space/store"),
      import("@/lib/space/passkey-support"),
    ]);
    const pkc = (typeof PublicKeyCredential === "undefined" ? null : PublicKeyCredential) as unknown as PasskeyApi | null;
    return {
      supported: spaceSupported(),
      secure: window.isSecureContext,
      passkeys: passkeysPossible(),
      prfLikely: await passkeyPrfLikely(),
      capabilities: await answer(pkc?.getClientCapabilities?.bind(pkc)),
      platformAuthenticator: await answer(pkc?.isUserVerifyingPlatformAuthenticatorAvailable?.bind(pkc)),
      conditional: await answer(pkc?.isConditionalMediationAvailable?.bind(pkc)),
      persisted: await answer(navigator.storage?.persisted?.bind(navigator.storage)),
      databasesListed: typeof indexedDB?.databases === "function",
    };
  });

  await step("space: Argon2id, as a passphrase uses it", async () => {
    const [{ argon2idAsync }, { ARGON }] = await Promise.all([
      import("@noble/hashes/argon2.js"),
      import("@/lib/space/crypto"),
    ]);
    const runs: number[] = [];
    let hex = "";
    // The page keeps drawing meanwhile (the sheet's spinner): frames too.
    const rec = recordFrames();
    for (let i = 0; i < 2; i++) {
      const t0 = performance.now();
      const out = await argon2idAsync(new TextEncoder().encode(QA_PASS), new Uint8Array(16).fill(7), { ...ARGON, dkLen: 32 });
      runs.push(Math.round(performance.now() - t0));
      hex = Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    const frames = rec.stop();
    if (hex !== QA_ARGON_KNOWN) throw new Error(`Argon2id gave ${hex}`);
    return { ms: runs, settings: ARGON, frames };
  });

  await step("space: a whole space in a throwaway database", async () => {
    const [{ idbStore }, { Vault, WrongSecret, openBackup, parseBackup }] = await Promise.all([
      import("@/lib/space/store"),
      import("@/lib/space/vault"),
    ]);
    const store = idbStore(QA_SPACE_DB);
    const ms: Record<string, number> = {};
    const time = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const t0 = performance.now();
      try {
        return await fn();
      } finally {
        ms[name] = Math.round(performance.now() - t0);
      }
    };
    const chart = { id: "qa1", input: { name: "Sample", date: "01/01/2000", time: "12:00" }, savedAt: Date.now() };
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

    const run = async () => {
      const { vault, recoveryCode } = await time("create", () => Vault.create(store, { passphrase: QA_PASS }));
      await time("write", () => vault.write([["chart/qa1", chart], ["state/qa", { at: 1 }]]));
      vault.lock();
      const byPass = await time("unlock, passphrase", () => Vault.unlock(store, { passphrase: QA_PASS }));
      if (!same(await byPass.get("chart/qa1"), chart)) throw new Error("passphrase: the record read back differs");
      const refused = await time("wrong passphrase", () =>
        Vault.unlock(store, { passphrase: `${QA_PASS}!` }).then(
          () => false,
          (err: unknown) => err instanceof WrongSecret,
        ),
      );
      if (!refused) throw new Error("a wrong passphrase was not refused");
      const byCode = await time("unlock, recovery code", () => Vault.unlock(store, { recovery: recoveryCode }));
      if (!same(await byCode.get("chart/qa1"), chart)) throw new Error("recovery code: the record read back differs");
      // "Stay unlocked on this device": the browser keeps the key (a CryptoKey in IndexedDB).
      await time("stay unlocked", () => byCode.setLockMode("stay"));
      const kept = await time("unlock on this device", () => Vault.unlockOnDevice(idbStore(QA_SPACE_DB)));
      if (!kept || !same(await kept.get("chart/qa1"), chart)) throw new Error("the key kept on this device did not open the space");
      const text = JSON.stringify(await time("backup", () => kept.backup()));
      const backup = parseBackup(text);
      if (!backup) throw new Error("the backup did not read back as one");
      if (text.includes("Sample") || text.includes("01/01/2000")) throw new Error("the backup holds readable data");
      const opened = await time("open the backup", () => openBackup(backup, { passphrase: QA_PASS }));
      if (!same(opened.get("chart/qa1"), chart)) throw new Error("backup: the record read back differs");
      return { backupBytes: text.length };
    };

    // A run cut short may have left its space: start clean, and end clean.
    await store.erase();
    let result: unknown = null;
    let failure: unknown = null;
    try {
      result = await run();
    } catch (err) {
      failure = err;
    }
    await time("erase", () => store.erase());
    const left =
      typeof indexedDB.databases === "function"
        ? (await indexedDB.databases()).some((d) => d.name === QA_SPACE_DB)
        : null;
    if (failure) throw failure;
    if (left) throw new Error("the throwaway database was left behind");
    return { ...(result as object), ms, left };
  });
}

const SUITES: Record<string, ((ctx: Ctx) => Promise<void>)[]> = {
  natal: [natalSuite],
  "3d": [depthSuite],
  time: [timeSuite],
  modes: [modesSuite],
  phone: [phoneSuite],
  space: [spaceSuite],
  safari: [natalSuite, depthSuite, timeSuite, modesSuite, phoneSuite, spaceSuite],
};

/**
 * The run keeps out of the reader's private space: locked now if it is open
 * (and again should it open meanwhile), its sheets closed as they come.
 * Returns the way to stop watching.
 */
function keepSpaceOut(): () => void {
  const lock = () => void loadSpaceRuntime().then((m) => m.lockSpace()).catch(() => {});
  if (useSpace.getState().status === "open") lock();
  if (useSpace.getState().sheet) closeSpaceSheet();
  return useSpace.subscribe((s, prev) => {
    if (s.status === "open" && prev.status !== "open") lock();
    if (s.sheet) closeSpaceSheet();
  });
}

/** Just looking, the page may start with no chart: the sample chart, drawn. */
async function ensureChart(): Promise<void> {
  if (wheel()) return;
  const sample = await until(() => byTest<HTMLElement>("sample-chart"), 15000).catch(() => null);
  if (!sample) return;
  sample.click();
  await until(wheel, 30000).catch(() => null);
  await sleep(2500);
}

async function send(report: unknown) {
  try {
    await fetch("/__qa/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(report),
    });
  } catch {
    // The banner still shows the summary.
  }
}

export async function runSelfTest(suite: string) {
  const home = `${location.pathname}`;
  // The last run's second pass: put the storage back once more, then leave.
  if (suite === "restore") {
    restoreStorage();
    sessionStorage.removeItem(SNAPSHOT);
    sessionStorage.removeItem(RESTORE_NEXT);
    location.replace(home);
    return;
  }
  const suites = SUITES[suite];
  if (!suites) return;
  snapshotStorage();
  const bar = banner();
  const caught = captureErrors();
  const steps: Step[] = [];
  const started = new Date().toISOString();
  let n = 0;
  const hold = async (label: string, ms: number) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      bar.textContent = `QA ${suite} · ${label} · holding ${Math.ceil((end - Date.now()) / 1000)} s`;
      await sleep(250);
    }
  };
  const step = async (name: string, fn: () => Promise<unknown>, holdMs = 0) => {
    n += 1;
    bar.textContent = `QA ${suite} · ${n}. ${name}`;
    const t0 = performance.now();
    const errorsBefore = caught.errors.length;
    try {
      const data = await fn();
      steps.push({ name, ok: true, ms: Math.round(performance.now() - t0), data });
    } catch (err) {
      steps.push({ name, ok: false, ms: Math.round(performance.now() - t0), error: String((err as Error)?.message ?? err) });
    }
    if (caught.errors.length > errorsBefore) {
      const last = steps[steps.length - 1];
      last.data = { result: last.data, errors: caught.errors.slice(errorsBefore) };
    }
    if (holdMs) await hold(`${n}. ${name}`, holdMs);
  };

  const env = environment();
  const spaceWatch = keepSpaceOut();
  await until(() => wheel() || byTest("empty-cast") || byTest("studio-natal") || byTest("sample-chart"), 30000).catch(
    () => null,
  );
  await sleep(1500);
  await ensureChart();
  for (const s of suites) {
    try {
      await s({ step, hold });
    } catch (err) {
      steps.push({ name: "suite", ok: false, ms: 0, error: String(err) });
    }
  }
  caught.stop();
  spaceWatch();
  const failed = steps.filter((s) => !s.ok).length;
  await send({ suite, started, finished: new Date().toISOString(), env, steps, errors: caught.errors, contextLost: caught.lost });
  bar.textContent = `QA ${suite} · done · ${steps.length} steps, ${failed} failed, ${caught.errors.length} console messages`;
  await sleep(6000);
  // Put the reader's storage back and reload without the flag; the next load
  // puts it back once more (the page may write while it unloads).
  restoreStorage();
  sessionStorage.setItem(RESTORE_NEXT, "1");
  location.replace(`${home}?qa=restore`);
}
