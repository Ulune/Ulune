import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BODYGRAPH_CENTERS,
  BODYGRAPH_CHANNELS,
  BODYGRAPH_GATES,
  BODYGRAPH_H,
  BODYGRAPH_W,
  GATE_R,
} from "../src/lib/chart/bodygraph-geometry.ts";
import { HD_CHANNELS, HD_GATE_CENTER } from "../src/lib/chart/human-design.ts";

/*
 * The bodygraph's eight drawing rules (the Human Design plan, "Drawing it
 * right"). The old drawing broke all of them: twelve channels ran over other
 * gates, two gates overlapped, and the Head and Ajna were upside down.
 */

const gates = Object.entries(BODYGRAPH_GATES).map(([n, g]) => ({ n: Number(n), p: [g.x, g.y], center: g.center }));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segDist(p, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}
function pathDist(p, pts) {
  let m = Infinity;
  for (let k = 0; k < pts.length - 1; k++) m = Math.min(m, segDist(p, pts[k], pts[k + 1]));
  return m;
}
function inside(poly, p) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function onRim(poly, p) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) m = Math.min(m, segDist(p, poly[i], poly[(i + 1) % poly.length]));
  return m;
}
function crossing(p, q, r, s) {
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
  const u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
  const a = (Math.abs(Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.atan2(s[1] - r[1], s[0] - r[0])) * 180) / Math.PI;
  const angle = Math.min(a % 180, 180 - (a % 180));
  return { at: [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])], angle };
}
const channelGates = (id) => HD_CHANNELS.find((c) => c.id === id).gates;

test("rule 1: all 64 gates, each on the rim of its own centre", () => {
  assert.equal(gates.length, 64);
  for (const g of gates) {
    assert.equal(g.center, HD_GATE_CENTER[g.n], `gate ${g.n} belongs to ${HD_GATE_CENTER[g.n]}`);
    const rim = onRim(BODYGRAPH_CENTERS[g.center].points, g.p);
    assert.ok(rim < 0.5, `gate ${g.n} is ${rim.toFixed(2)} units off its centre's rim`);
  }
  assert.equal(Object.keys(BODYGRAPH_CHANNELS).length, 36);
  for (const ch of HD_CHANNELS) assert.ok(BODYGRAPH_CHANNELS[ch.id], `channel ${ch.id} is drawn`);
});

test("rule 1: the standard layout (shapes and each gate's side and order)", () => {
  const C = BODYGRAPH_CENTERS;
  const G = (n) => BODYGRAPH_GATES[n];
  // Shapes: Head up, Ajna down, Heart up, Spleen pointing right, Solar Plexus left.
  assert.equal(C.head.shape, "tri-up");
  assert.equal(C.ajna.shape, "tri-down");
  assert.equal(C.heart.shape, "tri-up");
  assert.equal(C.spleen.shape, "tri-right");
  assert.equal(C.solarPlexus.shape, "tri-left");
  assert.equal(C.throat.shape, "square");
  assert.equal(C.g.shape, "diamond");
  assert.equal(C.sacral.shape, "square");
  assert.equal(C.root.shape, "square");
  const leftToRight = (...ns) => ns.slice(1).forEach((n, i) => assert.ok(G(ns[i]).x < G(n).x, `${ns[i]} left of ${n}`));
  const topToBottom = (...ns) => ns.slice(1).forEach((n, i) => assert.ok(G(ns[i]).y < G(n).y, `${ns[i]} above ${n}`));
  leftToRight(64, 61, 63);
  leftToRight(47, 24, 4);
  leftToRight(17, 43, 11);
  leftToRight(62, 23, 56);
  leftToRight(20, 31, 8, 33);
  topToBottom(35, 12, 45);
  topToBottom(16, 20);
  topToBottom(1, 10, 2);
  leftToRight(10, 1, 25);
  leftToRight(5, 14, 29);
  leftToRight(42, 3, 9);
  topToBottom(34, 27);
  leftToRight(53, 60, 52);
  topToBottom(54, 38, 58);
  topToBottom(19, 39, 41);
  topToBottom(48, 57, 44, 50, 32, 28, 18);
  topToBottom(36, 22, 37, 6, 49, 55, 30);
  assert.ok(G(50).x > G(44).x && G(50).x > G(32).x, "50 at the Spleen's point");
  assert.ok(G(6).x < G(37).x && G(6).x < G(49).x, "6 at the Solar Plexus's point");
  // Heart: 21 at the point, 26 and 40 on the base, 51 on the left side.
  assert.ok(G(21).y < G(51).y && G(51).y < G(26).y, "21 top, 51 between, 26 base");
  assert.equal(G(26).y, G(40).y);
  assert.ok(G(26).x < G(21).x && G(21).x < G(40).x);
  assert.ok(G(51).x < G(21).x);
  // Head above Ajna above Throat above G above Sacral above Root.
  topToBottom(61, 24, 23, 8, 1, 2, 14, 3, 60);
});

test("rule 2: gates never touch (22 units apart or more)", () => {
  let min = Infinity;
  let where = "";
  for (let i = 0; i < gates.length; i++)
    for (let j = i + 1; j < gates.length; j++) {
      const d = dist(gates[i].p, gates[j].p);
      if (d < min) [min, where] = [d, `${gates[i].n}/${gates[j].n}`];
    }
  assert.ok(min >= 2 * GATE_R + 3 - 1e-9, `closest gates ${where}: ${min.toFixed(2)} units`);
});

test("rule 3: no channel within 12.5 units of a gate that is not its own", () => {
  for (const ch of HD_CHANNELS) {
    const pts = BODYGRAPH_CHANNELS[ch.id].points;
    for (const g of gates) {
      if (ch.gates.includes(g.n)) continue;
      const d = pathDist(g.p, pts);
      assert.ok(d >= GATE_R + 3, `${ch.id} passes ${d.toFixed(2)} units from gate ${g.n}`);
    }
  }
});

test("rule 4: no channel runs through a centre", () => {
  for (const ch of HD_CHANNELS) {
    const pts = BODYGRAPH_CHANNELS[ch.id].points;
    const lens = pts.slice(1).map((p, k) => dist(pts[k], p));
    const total = lens.reduce((s, l) => s + l, 0);
    for (let s = GATE_R + 2; s < total - GATE_R - 2; s += 1) {
      let acc = 0;
      let k = 0;
      while (k < lens.length - 1 && acc + lens[k] < s) acc += lens[k++];
      const t = (s - acc) / lens[k];
      const p = [pts[k][0] + t * (pts[k + 1][0] - pts[k][0]), pts[k][1] + t * (pts[k + 1][1] - pts[k][1])];
      for (const [id, c] of Object.entries(BODYGRAPH_CENTERS)) {
        assert.ok(!inside(c.points, p), `${ch.id} runs through the ${id} at ${p.map((v) => v.toFixed(0))}`);
      }
    }
  }
});

test("rule 5: every channel shows 10 units of line or more between its gates", () => {
  for (const ch of HD_CHANNELS) {
    const visible = BODYGRAPH_CHANNELS[ch.id].length - 2 * GATE_R;
    assert.ok(visible >= 10, `${ch.id} shows ${visible.toFixed(1)} units`);
  }
});

test("rule 6: only the standard crossings, steep enough and clear of the gates", () => {
  const segs = [];
  for (const ch of HD_CHANNELS) {
    const pts = BODYGRAPH_CHANNELS[ch.id].points;
    for (let k = 0; k < pts.length - 1; k++) segs.push({ id: ch.id, p: pts[k], q: pts[k + 1] });
  }
  const found = new Set();
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i];
      const B = segs[j];
      if (A.id === B.id) continue;
      const ga = channelGates(A.id);
      const gb = channelGates(B.id);
      if (ga.some((g) => gb.includes(g))) continue;
      const x = crossing(A.p, A.q, B.p, B.q);
      if (!x) continue;
      found.add([A.id, B.id].sort().join(" × "));
      assert.ok(x.angle >= 20, `${A.id} × ${B.id} at ${x.angle.toFixed(0)}°`);
      for (const g of gates) assert.ok(dist(g.p, x.at) >= GATE_R + 8, `${A.id} × ${B.id} next to gate ${g.n}`);
    }
  const expected = ["34–20 × 44–26", "10–34 × 44–26", "15–5 × 44–26", "2–14 × 44–26", "44–26 × 46–29", "34–57 × 44–26", "10–57 × 34–20"]
    .map((s) => s.split(" × ").sort().join(" × "))
    .sort();
  assert.deepEqual([...found].sort(), expected);
});

test("rule 7: one bend, round the G's corner", () => {
  for (const ch of HD_CHANNELS) {
    const n = BODYGRAPH_CHANNELS[ch.id].points.length;
    assert.equal(n, ch.id === "34–20" ? 3 : 2, `${ch.id} has ${n - 1} segments`);
  }
  const bend = BODYGRAPH_CHANNELS["34–20"].points[1];
  assert.ok(bend[0] < BODYGRAPH_GATES[10].x - GATE_R - 3, "34–20 passes left of gate 10");
});

test("rule 8: everything fits the 470 × 674 box", () => {
  assert.equal(BODYGRAPH_W, 470);
  assert.equal(BODYGRAPH_H, 674);
  for (const g of gates) {
    assert.ok(g.p[0] - GATE_R >= 0 && g.p[0] + GATE_R <= BODYGRAPH_W, `gate ${g.n} x`);
    assert.ok(g.p[1] - GATE_R >= 0 && g.p[1] + GATE_R <= BODYGRAPH_H, `gate ${g.n} y`);
  }
  for (const [id, c] of Object.entries(BODYGRAPH_CENTERS))
    for (const p of c.points) assert.ok(p[0] >= 0 && p[0] <= BODYGRAPH_W && p[1] >= 0 && p[1] <= BODYGRAPH_H, `${id} point ${p}`);
});
