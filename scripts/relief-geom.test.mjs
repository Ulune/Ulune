import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WALL,
  arcPoints,
  discBand,
  flattenPath,
  fromLineLocal,
  insidePoly,
  lineBand,
  lineFrame,
  polygonArea,
  strokeOutline,
  toLineLocal,
  wallBands,
  wallLight,
} from "../src/lib/depth/relief-geom.ts";

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/** The wheel's own annulus path (chart-wheel.tsx), for an asc of 0. */
function annulus(ecl0, ecl1, r0, r1) {
  const polar = (e, r) => {
    const rad = (((e % 360) + 360) % 360) * (Math.PI / 180);
    return { x: 360 - r * Math.cos(rad), y: 360 + r * Math.sin(rad) };
  };
  const span = (((ecl1 - ecl0) % 360) + 360) % 360;
  const large = span > 180 ? 1 : 0;
  const p0o = polar(ecl0, r1);
  const p1o = polar(ecl1, r1);
  const p1i = polar(ecl1, r0);
  const p0i = polar(ecl0, r0);
  return [
    `M ${p0o.x.toFixed(2)} ${p0o.y.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 0 ${p1o.x.toFixed(2)} ${p1o.y.toFixed(2)}`,
    `L ${p1i.x.toFixed(2)} ${p1i.y.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 1 ${p0i.x.toFixed(2)} ${p0i.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function inPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Is q on the solid: the top swept down to its floor (q − tW on the top for some t in [0, h])? */
function inSolid(q, pts, h) {
  for (let k = 0; k <= 400; k += 1) {
    const t = (h * k) / 400;
    if (inPoly({ x: q.x - t * WALL.x, y: q.y - t * WALL.y }, pts)) return true;
  }
  return false;
}

/** Is q on top ∪ floor ∪ walls, as the relief draws them? */
function drawn(q, pts, h, bands) {
  if (inPoly(q, pts)) return true;
  if (inPoly({ x: q.x - h * WALL.x, y: q.y - h * WALL.y }, pts)) return true;
  for (const b of bands) {
    const quad = [b.a, b.b, { x: b.b.x + h * WALL.x, y: b.b.y + h * WALL.y }, { x: b.a.x + h * WALL.x, y: b.a.y + h * WALL.y }];
    if (inPoly(q, quad)) return true;
  }
  return false;
}

/** A small deterministic random source. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function checkSolid(pts, h, label) {
  const bands = wallBands(pts);
  const r = rng(42);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - 2;
  const x1 = Math.max(...xs) + h * WALL.x + 2;
  const y0 = Math.min(...ys) - 2;
  const y1 = Math.max(...ys) + h * WALL.y + 2;
  let checked = 0;
  for (let i = 0; i < 4000; i += 1) {
    const q = { x: x0 + r() * (x1 - x0), y: y0 + r() * (y1 - y0) };
    const solid = inSolid(q, pts, h);
    const ink = drawn(q, pts, h, bands);
    if (solid !== ink) {
      // Allow a hair at the outline (sampling of the sweep, flattening of arcs).
      const ok = [
        [0.35, 0],
        [-0.35, 0],
        [0, 0.35],
        [0, -0.35],
      ].some(([dx, dy]) => inSolid({ x: q.x + dx, y: q.y + dy }, pts, h) !== solid);
      assert.ok(ok, `${label}: ${solid ? "missing" : "extra"} ink at ${q.x.toFixed(2)},${q.y.toFixed(2)}`);
    }
    checked += 1;
  }
  return checked;
}

test("paths: squares, relative moves and packed arc flags", () => {
  const [sq] = flattenPath("M 0 0 H 10 V 10 H 0 Z");
  assert.equal(sq.length, 4);
  assert.deepEqual(sq[2], { x: 10, y: 10 });
  const [rel] = flattenPath("m5 5 l10 0 l0 10z");
  assert.deepEqual(rel, [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }]);
  const [packed] = flattenPath("M0 0 a5 5 0 01 10 0 Z");
  assert.ok(packed.length > 3);
  assert.ok(packed.every((p) => near(Math.hypot(p.x - 5, p.y), 5, 1e-6)));
  assert.equal(flattenPath("M0 0 L1 1 Z M5 5 L6 6 L5 6 Z").length, 2);
});

test("arcs: points on the circle, the right way round, no longer than the step", () => {
  const pts = arcPoints(-10, 0, 10, 10, 0, 0, 1, 10, 0, 6);
  assert.equal(pts.length, 30);
  assert.ok(pts.every((p) => near(Math.hypot(p.x, p.y), 10, 1e-9)));
  // Sweep 1 from (-10,0) to (10,0) passes above (negative y) on screen.
  assert.ok(pts[14].y < 0);
  assert.deepEqual(pts.at(-1), { x: 10, y: 0 });
});

test("the wheel's annulus flattens onto its two radii", () => {
  const [pts] = flattenPath(annulus(30, 60, 300, 336));
  for (const p of pts) {
    const r = Math.hypot(p.x - 360, p.y - 360);
    assert.ok(near(r, 300, 0.02) || near(r, 336, 0.02), `radius ${r}`);
  }
});

test("walls: a square shows its bottom and its right side", () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const bands = wallBands(pts);
  assert.equal(bands.length, 2);
  for (const b of bands) {
    // Each wall hangs from an edge of the square and runs toward W.
    const face = { x: -(b.b.y - b.a.y), y: b.b.x - b.a.x };
    assert.ok(face.x * WALL.x + face.y * WALL.y > 0);
  }
  // Reversed winding: the same walls.
  assert.equal(wallBands([...pts].reverse()).length, 2);
});

test("walls: top ∪ walls ∪ floor is the solid, for blocks at every side of the wheel", () => {
  const shapes = {
    square: [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 20 },
      { x: 0, y: 20 },
    ],
    triangle: flattenPath("M 50 10 L 90 60 L 10 60 Z")[0],
  };
  for (const e of [0, 45, 100, 170, 200, 260, 300, 330]) {
    shapes[`sign@${e}`] = flattenPath(annulus(e, e + 30, 300, 336))[0];
    shapes[`house@${e}`] = flattenPath(annulus(e, e + 47, 164, 283))[0];
  }
  for (const [label, pts] of Object.entries(shapes)) {
    for (const h of [3, 12, 22]) checkSolid(pts, h, `${label} h=${h}`);
  }
});

test("walls, one facet per edge: top ∪ walls ∪ floor is still the solid", () => {
  for (const e of [0, 100, 200, 300]) {
    const pts = flattenPath(annulus(e, e + 30, 300, 336), 4)[0];
    const bands = wallBands(pts, 1);
    // Facets are single edges (or straight runs): no chord cuts under an arc.
    for (const b of bands) {
      const len = Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y);
      assert.ok(len < 36.5, `facet ${len.toFixed(1)} long`);
    }
    for (const h of [3, 8]) {
      const r = rng(7);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      for (let i = 0; i < 1500; i += 1) {
        const q = {
          x: Math.min(...xs) - 2 + r() * (Math.max(...xs) - Math.min(...xs) + h * WALL.x + 4),
          y: Math.min(...ys) - 2 + r() * (Math.max(...ys) - Math.min(...ys) + h * WALL.y + 4),
        };
        const solid = inSolid(q, pts, h);
        if (solid === drawn(q, pts, h, bands)) continue;
        const ok = [
          [0.35, 0],
          [-0.35, 0],
          [0, 0.35],
          [0, -0.35],
        ].some(([dx, dy]) => inSolid({ x: q.x + dx, y: q.y + dy }, pts, h) !== solid);
        assert.ok(ok, `sign@${e} h=${h}: ${solid ? "missing" : "extra"} ink at ${q.x.toFixed(2)},${q.y.toFixed(2)}`);
      }
    }
  }
});

test("line frames: the CSS transform lands exactly on the ribbon, at every height", () => {
  const r = rng(3);
  for (let i = 0; i < 40; i += 1) {
    const p1 = { x: r() * 600, y: r() * 600 };
    const p2 = { x: r() * 600, y: r() * 600 };
    const band = lineBand(p1, p2);
    if (!band) continue;
    const f = lineFrame(band.a, band.b);
    assert.ok(f.wPerp > 0, "the ribbon runs toward W");
    for (const q of [p1, p2, { x: r() * 600, y: r() * 600 }]) {
      const back = fromLineLocal(f, toLineLocal(f, q));
      assert.ok(near(back.x, q.x, 1e-6) && near(back.y, q.y, 1e-6), "round trip");
    }
    // A point t·W below the line, stretched to k, lands k·t·W below it —
    // as CSS draws rotate(θ) skewX(φ) scaleY(k) around a.
    const H = 7;
    const u = r() * f.len;
    const onLine = { x: f.a.x + f.e.x * u, y: f.a.y + f.e.y * u };
    const local = toLineLocal(f, { x: onLine.x + H * WALL.x, y: onLine.y + H * WALL.y });
    assert.ok(near(local.x, u, 1e-6) && near(local.y, H * f.wPerp, 1e-6), "a line point's floor is straight below in the frame");
    for (const k of [0.001, 0.25, 0.6, 1]) {
      const at = fromLineLocal(f, local, k);
      const c = Math.cos(f.rotate);
      const sn = Math.sin(f.rotate);
      const y = local.y * k;
      const x = local.x + Math.tan(f.skew) * y;
      const css = { x: f.a.x + c * x - sn * y, y: f.a.y + sn * x + c * y };
      assert.ok(near(at.x, css.x, 1e-6) && near(at.y, css.y, 1e-6), "the CSS matrix");
      assert.ok(near(at.x, onLine.x + k * H * WALL.x, 1e-6) && near(at.y, onLine.y + k * H * WALL.y, 1e-6), `height ${k}`);
    }
  }
});

test("strokes and polygons: a round-capped outline, and point-in-polygon", () => {
  const o = strokeOutline({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, 6);
  assert.equal(o.length, 14);
  // Every point is w/2 from the segment; the ends are round.
  for (const p of o) {
    const t = Math.max(0, Math.min(10, p.x));
    assert.ok(near(Math.hypot(p.x - t, p.y), 1, 1e-9));
  }
  assert.ok(o.some((p) => near(p.x, 11, 1e-9)) && o.some((p) => near(p.x, -1, 1e-9)));
  assert.ok(insidePoly({ x: 5, y: 0.5 }, o) && !insidePoly({ x: 5, y: 1.5 }, o));
  const sq = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  assert.ok(insidePoly({ x: 5, y: 5 }, sq) && !insidePoly({ x: 15, y: 5 }, sq) && !insidePoly({ x: -1, y: 5 }, sq));
});

test("discs and lines: their walls hang toward W", () => {
  const d = discBand({ x: 0, y: 0 }, 10);
  assert.ok(near(Math.hypot(d.a.x, d.a.y), 10) && near(Math.hypot(d.b.x, d.b.y), 10));
  const face = { x: -(d.b.y - d.a.y), y: d.b.x - d.a.x };
  assert.ok(face.x * WALL.x + face.y * WALL.y > 0);
  // Perpendicular to W: the widest part of the coin.
  assert.ok(near((d.b.x - d.a.x) * WALL.x + (d.b.y - d.a.y) * WALL.y, 0, 1e-9));
  const l = lineBand({ x: 0, y: 0 }, { x: 100, y: 0 });
  assert.ok(l && l.n0.y > 0);
  // A line running along W is seen edge-on: no ribbon.
  assert.equal(lineBand({ x: 0, y: 0 }, { x: WALL.x * 50, y: WALL.y * 50 }), null);
});

test("light: walls facing left are lit, walls facing right are in shade", () => {
  assert.ok(wallLight({ x: -1, y: 0 }) > wallLight({ x: 0, y: 1 }));
  assert.ok(wallLight({ x: 0, y: 1 }) > wallLight({ x: 1, y: 0 }) - 1e-9);
  assert.ok(wallLight({ x: 1, y: 0.2 }) >= 0.46);
  assert.ok(polygonArea([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]) > 0);
});
