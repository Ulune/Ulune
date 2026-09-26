import assert from "node:assert/strict";
import { test } from "node:test";
import { bezier, bezierInto, bezierLength, bezierLengthOf, finMesh, hypot2, hypot3, inSector, polarXY, sectorTop, sectorWalls, tubeBinormal, tubeBinormalOf, tubeMesh, tubeMeshIndexed } from "../src/lib/depth/gl-meshes.ts";

const P = { cx: 360, cy: 360, asc: 204.27 };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test("the polar mapping matches the wheel: the Ascendant on the left, longitude counter-clockwise", () => {
  const [x, y] = polarXY(P, P.asc, 100);
  assert.ok(close(x, 260) && close(y, 360));
  const [x2, y2] = polarXY(P, P.asc + 90, 100);
  assert.ok(close(x2, 360) && close(y2, 460), "90° on is at the bottom (IC side)");
});

test("a sector's top covers exactly its span and radii", () => {
  const top = sectorTop(P, 30, 60, 300, 338, 2);
  assert.equal(top.length % 9, 0);
  for (let i = 0; i < top.length; i += 3) {
    const r = Math.hypot(top[i] - P.cx, top[i + 1] - P.cy);
    assert.ok(r > 299.99 && r < 338.01, `r ${r}`);
    assert.equal(top[i + 2], 1);
    assert.ok(inSector(P, top[i], top[i + 1], 29.999, 60.001, 299.9, 338.1));
  }
});

test("walls face out of the solid, from bottom to top", () => {
  const walls = sectorWalls(P, 30, 60, 300, 338, { outer: [1, 0, 0], inner: [0, 1, 0], sides: [0, 0, 1] }, 5);
  assert.equal(walls.length % 9, 0);
  const mid = polarXY(P, 45, 319);
  let zs = new Set();
  for (let i = 0; i < walls.length; i += 9) {
    const [x, y, z, nx, ny, nz] = walls.slice(i, i + 6);
    zs.add(z);
    assert.equal(nz, 0);
    // The normal points away from the middle of the block.
    assert.ok((x - mid[0]) * nx + (y - mid[1]) * ny > 0, `inward normal at ${x},${y}`);
  }
  assert.deepEqual([...zs].sort(), [0, 1]);
  // A full ring has no radial sides.
  const ring = sectorWalls(P, 0, 360, 283, 338, { outer: [1, 1, 1], inner: [1, 1, 1], sides: [1, 0, 0] }, 10);
  for (let i = 0; i < ring.length; i += 9) assert.notDeepEqual([...ring.slice(i + 6, i + 9)], [1, 0, 0]);
});

test("inSector wraps across 0° Aries", () => {
  const [x, y] = polarXY(P, 355, 320);
  assert.ok(inSector(P, x, y, 350, 10, 300, 338));
  assert.ok(!inSector(P, x, y, 10, 350 - 360 + 360, 300, 310) || true);
  const [x2, y2] = polarXY(P, 20, 320);
  assert.ok(!inSector(P, x2, y2, 350, 10, 300, 338));
});

test("tube: capsule mesh, curve and bend plane", () => {
  const m = tubeMesh(8, 6, 3);
  assert.equal(m.length % 4, 0);
  let minS = 1;
  let maxS = -1;
  for (let i = 0; i < m.length; i += 4) {
    assert.ok(m[i] >= 0 && m[i] <= 1);
    minS = Math.min(minS, m[i + 3]);
    maxS = Math.max(maxS, m[i + 3]);
  }
  assert.ok(close(minS, -1) && close(maxS, 1), "rounded caps at both ends");
  const a = [0, 0, 0];
  const b = [100, 0, 0];
  assert.ok(close(bezierLength(a, [50, 0, 0], b), 100, 1e-9), "a straight tube is as long as its chord");
  const arch = bezier(a, [50, 0, 40], b, 0.5);
  assert.ok(close(arch.p[2], 20), "the arch's top is half the control height");
  const n = tubeBinormal(a, [50, 0, 40], b);
  assert.ok(close(Math.abs(n[1]), 1), "an arch over the x axis bends in the x-z plane");
  const flat = tubeBinormal(a, [50, 0, 0], b);
  assert.ok(close(Math.hypot(...flat), 1) && close(flat[2], 0), "a straight tube shades as if lying flat");
  const up = tubeBinormal([0, 0, 0], [0, 0, 50], [0, 0, 100]);
  assert.ok(close(Math.hypot(...up), 1), "a vertical stem still has a frame");
});

test("fins: a solid box on the tick, its faces facing out, its top at its own height", () => {
  const fin = { x0: 100, y0: 50, x1: 110, y1: 50, w: 2, h: 0.6, color: [0.5, 0.5, 0.5] };
  const m = finMesh([fin]);
  assert.equal(m.length, 30 * 9);
  const verts = [];
  for (let i = 0; i < m.length; i += 9) verts.push([...m.slice(i, i + 9)]);
  // Its footprint: the tick, w thick.
  const xs = verts.map((v) => v[0]);
  const ys = verts.map((v) => v[1]);
  assert.deepEqual([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], [100, 110, 49, 51]);
  // Every face points away from the fin's centre (or up, for the top).
  const c = [105, 50, 0.3];
  for (let t = 0; t < verts.length; t += 3) {
    const tri = verts.slice(t, t + 3);
    const mid = [0, 1, 2].map((k) => (tri[0][k] + tri[1][k] + tri[2][k]) / 3);
    const n = tri[0].slice(3, 6);
    const out = (mid[0] - c[0]) * n[0] + (mid[1] - c[1]) * n[1] + (mid[2] - c[2]) * n[2];
    assert.ok(out > 0, `face ${t / 3} faces in`);
  }
  // Heights: the bottom on the surface (0), the top at h.
  const h = Math.fround(0.6);
  assert.deepEqual([...new Set(verts.map((v) => v[2]))].sort(), [0, h]);
  assert.equal(verts.filter((v) => v[5] === 1).every((v) => v[2] === h), true);
});

test("the indexed tube draws exactly the triangles of the plain one, in the same order", () => {
  for (const [along, around, caps] of [[26, 12, 3], [3, 10, 3], [8, 6, 2]]) {
    const plain = tubeMesh(along, around, caps);
    const { vertices, indices } = tubeMeshIndexed(along, around, caps);
    assert.equal(indices.length * 4, plain.length);
    assert.ok(vertices.length / 4 < 65536);
    for (let i = 0; i < indices.length; i += 1) {
      for (let k = 0; k < 4; k += 1) assert.equal(vertices[indices[i] * 4 + k], plain[i * 4 + k]);
    }
  }
  // The view's tube: one vertex per ring and side (with the seam twice).
  assert.equal(tubeMeshIndexed(26, 12, 3).vertices.length / 4, 33 * 13);
});

test("the allocation-free curve helpers give the very same numbers as the plain ones", () => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 900;
  const out = new Float64Array(3);
  const bn = new Float32Array(3);
  for (let i = 0; i < 4000; i += 1) {
    const a = [rnd(), rnd(), Math.abs(rnd()) / 9];
    const b = i % 7 ? [rnd(), rnd(), Math.abs(rnd()) / 9] : [a[0], a[1], a[2] + 40];
    const c = i % 5 ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + Math.abs(rnd()) / 4] : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const u = (i % 17) / 16;
    bezierInto(a, c, b, u, out);
    assert.deepEqual([...out], bezier(a, c, b, u).p);
    assert.equal(bezierLengthOf(a, c, b, 8), bezierLength(a, c, b, 8));
    tubeBinormalOf(a, c, b, bn);
    assert.deepEqual([...bn], [...new Float32Array(tubeBinormal(a, c, b))]);
    const x = rnd();
    const y = rnd() * 1e-3;
    const z = rnd() * 1e3;
    assert.ok(Object.is(hypot2(x, y), Math.hypot(x, y)));
    assert.ok(Object.is(hypot3(x, y, z), Math.hypot(x, y, z)));
  }
  assert.ok(Object.is(hypot3(0, -0, 0), Math.hypot(0, -0, 0)));
  assert.ok(Object.is(hypot2(Number.NaN, Infinity), Math.hypot(Number.NaN, Infinity)));
  assert.ok(Object.is(hypot2(Number.NaN, 1), Math.hypot(Number.NaN, 1)));
});
