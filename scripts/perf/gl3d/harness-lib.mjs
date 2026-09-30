// Drive the real WheelView3D.render()/pick() against a counting mock GL.
// Scenarios: default natal, detailed natal, heavy bi-wheel. Measures GL calls, draws,
// JS time per frame (V8, indicative only) and bytes allocated per frame.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { OUT } from "../paths.mjs";
const S = (f) => pathToFileURL(join(OUT, "gl3d/src", f)).href;
import { PerformanceObserver } from "node:perf_hooks";
let gcs = 0; new PerformanceObserver((l) => { gcs += l.getEntries().length; }).observe({ entryTypes: ["gc"] });
globalThis.window = { devicePixelRatio: 2, setTimeout, clearTimeout };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 0);
const { WheelView3D } = await import(S("wheel-view3d.js"));
const { makePrograms, makeMesh, makeIndexedMesh } = await import(S("gl-core.js"));
const { Instanced } = await import(S("gl-instanced.js"));
const { unitQuad, tubeMeshIndexed } = await import(S("gl-meshes.js"));
const { fitScale } = await import(S("math.js"));
const { makeSpring, settle } = await import(S("spring.js"));

function mockGL() {
  const names = "activeTexture attachShader bindBuffer bindTexture blendFunc bufferData clear clearColor clearDepth compileShader createBuffer createProgram createShader createTexture cullFace deleteBuffer deleteProgram deleteShader deleteTexture depthFunc depthMask disable disableVertexAttribArray drawArrays drawArraysInstanced drawElements drawElementsInstanced enable enableVertexAttribArray generateMipmap getAttribLocation getExtension getParameter getProgramInfoLog getProgramParameter getShaderInfoLog getShaderParameter getUniformLocation isContextLost linkProgram pixelStorei readPixels shaderSource texImage2D texParameterf texParameteri uniform1f uniform1i uniform2f uniform3f uniform3fv uniform4f uniform4fv uniformMatrix3fv uniformMatrix4fv useProgram vertexAttribDivisor vertexAttribPointer viewport bufferSubData".split(" ");
  const counts = new Int32Array(names.length);
  const gl = { TRIANGLES: 4, ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893, UNSIGNED_SHORT: 0x1403, DYNAMIC_DRAW: 0x88e8, STATIC_DRAW: 0x88e4, FLOAT: 0x1406, TEXTURE_2D: 0x0de1, BACK: 0x405, COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x100, DEPTH_TEST: 0xb71, BLEND: 0xbe2, CULL_FACE: 0xb44, LEQUAL: 0x203, ONE: 1, ONE_MINUS_SRC_ALPHA: 0x303, TEXTURE0: 0x84c0, VERTEX_SHADER: 0x8b31, FRAGMENT_SHADER: 0x8b30, COMPILE_STATUS: 0x8b81, LINK_STATUS: 0x8b82 };
  let bytes = 0;
  let attr = 0;
  const ret = { getShaderParameter: true, getProgramParameter: true, isContextLost: false };
  names.forEach((n, i) => {
    if (n === "createShader" || n === "createProgram" || n === "createBuffer" || n === "createTexture" || n === "getUniformLocation") gl[n] = function () { counts[i]++; return {}; };
    else if (n === "getAttribLocation") gl[n] = function () { counts[i]++; return attr++ % 3; };
    else if (n === "bufferData") gl[n] = function (_t, d) { counts[i]++; bytes += typeof d === "number" ? 0 : d.byteLength; };
    else if (n in ret) { const r = ret[n]; gl[n] = function () { counts[i]++; return r; }; }
    else gl[n] = function () { counts[i]++; };
  });
  gl.__calls = { clear() { counts.fill(0); }, entries() { return names.map((n, i) => [n, counts[i]]).filter(([, c]) => c > 0); }, values() { return [...counts]; } };
  gl.__bytes = () => bytes;
  return gl;
}

// The natal glyphs just inside the degree ticks, their degrees under them (chart-wheel.tsx, part 83).
const CX = 360, CY = 360, R_OUTER = 338, R_SIGN_IN = 300, R_DECAN_IN = 283, R_ASPECT = 164, R_PLANET = 243, R_LABEL = 216;
const polar = (ecl, r, asc) => { const a = ((((ecl - asc) % 360) + 360) % 360) * Math.PI / 180; return { x: CX - r * Math.cos(a), y: CY + r * Math.sin(a) }; };
const PATTERN = { conjunction: "arc", opposition: "solid", square: "solid", trine: "solid", sextile: "dash", quincunx: "dashdot", semisextile: "dots", semisquare: "dots", quintile: "dots" };
const DASH = { dash: [6, 3.5], dashdot: [7, 3, 0.01, 3], dots: [0.01, 3.2] };
const ANGLES = { conjunction: 0, opposition: 180, trine: 120, square: 90, sextile: 60, quincunx: 150, semisextile: 30, semisquare: 45, quintile: 72 };
const ORBS = { conjunction: 8, opposition: 8, trine: 8, square: 8, sextile: 6, quincunx: 3, semisextile: 2.5, semisquare: 2.5, quintile: 2 };
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export async function scenario({ name, sprites: nS, outer: nO, angles: nA, types, maxOrb, stage, bi }) {
  seed = 7;
  const W = stage;
  const vbSize = bi ? 916 : 786;
  const VB = { x: CX - vbSize / 2, y: CY - vbSize / 2, w: vbSize, h: vbSize };
  const scene = { clientWidth: W, clientHeight: W, getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: W }), dataset: {}, closest: () => null };
  const cam = { rx: 50, rz: 0 };
  const depth = {
    scene, lite: false, size: () => W, lensZoom: () => 1, kick() {}, addExtra: () => () => {}, unproject: () => null,
    sceneState: () => ({ width: W, height: W, perspective: Math.max(320, W * 1.6), originX: W / 2, originY: W / 2, rx: cam.rx, ry: 0, rz: cam.rz, scale: fitScale(cam.rx), zoom: 1, panX: 0, panY: 0 }),
  };
  const base = { viewBox: { baseVal: { x: VB.x, y: VB.y, width: VB.w, height: VB.h } }, clientWidth: W, clientHeight: W, getAttribute: () => null, setAttribute() {}, removeAttribute() {} };
  const v = new WheelView3D(depth, base, { geometry: () => null, rest: (f) => f() }, () => false);
  const gl = mockGL();
  const k = Math.min(W / VB.w, W / VB.h);
  v.gl = gl; v.canvas = { width: 0, height: 0, style: {}, isConnected: true }; v.progs = makePrograms(gl); v.ready = true; v.entered = true;
  // INST=1: the instanced renderer (WebGL 2), as the browser has it.
  if (process.env.INST === "1") v.inst = new Instanced(gl);
  const tube = tubeMeshIndexed(26, 12, 3), pill = tubeMeshIndexed(3, 10, 3);
  v.meshes = { quad: makeMesh(gl, unitQuad(), 2), tube: makeIndexedMesh(gl, tube.vertices, 4, tube.indices), pill: makeIndexedMesh(gl, pill.vertices, 4, pill.indices) };
  const asc = 17;
  v.geo = { cx: CX, cy: CY, asc, rOuter: R_OUTER, rSignIn: R_SIGN_IN, rDecanIn: R_DECAN_IN, rAspect: R_ASPECT, outer: bi ? { rIn: R_OUTER, rOut: 405 } : null, houses: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, ecl0: (asc + i * 30) % 360, ecl1: (asc + i * 30 + 30) % 360 })) };
  v.polar = { cx: CX, cy: CY, asc }; v.vb = VB;
  const fin = (r0, r1, deg, w, h) => { const a = polar(deg, r0, asc), b = polar(deg, r1, asc); return { x0: a.x, y0: a.y, x1: b.x, y1: b.y, w, h, color: [0.5, 0.5, 0.5], side: [0.4, 0.4, 0.4] }; };
  v.fins = { natal: Array.from({ length: 360 }, (_, d) => fin(d % 10 ? (d % 5 ? 278 : 275) : 270, 282.7, d, 1, 1)), outer: bi ? Array.from({ length: 360 }, (_, d) => fin(338.3, d % 10 ? 346 : 351, d, 1, 1)) : [] };
  const t0 = performance.now();
  v.buildStatic();
  const staticMs = performance.now() - t0;
  const staticBytes = gl.__bytes();
  v.frame = { k, ox: (W - VB.w * k) / 2, oy: (W - VB.h * k) / 2, vbx: VB.x, vby: VB.y };
  v.builtDpr = v.texDpr();
  settle(v.t, 1);
  // Bodies
  const bodies = [];
  for (let i = 0; i < nS; i++) bodies.push({ id: `planet:p${i}`, lon: rnd() * 360, sprite: true, outer: false });
  for (let i = 0; i < nO; i++) bodies.push({ id: `transit:t${i}`, lon: rnd() * 360, sprite: true, outer: true });
  for (let i = 0; i < nA; i++) bodies.push({ id: `angle:a${i}`, lon: (asc + i * 90) % 360, sprite: false, outer: false });
  for (const b of bodies.filter((b) => b.sprite)) {
    const p = polar(b.lon, b.outer ? 388 : R_PLANET, asc), l = polar(b.lon, b.outer ? 416 : R_LABEL, asc);
    const deg = Math.atan2(p.y - CY, p.x - CX) * 180 / Math.PI;
    v.sprites.set(b.id, { id: b.id, outer: b.outer, x: p.x, y: p.y, wave: ((((180 - deg) % 360) + 360) % 360) / 360, house: null, stem: [0.6, 0.6, 0.6], labelAt: l, rise: makeSpring(0), scale: makeSpring(1), alpha: makeSpring(1), halo: makeSpring(0), sink: makeSpring(0) });
    v.cells.set(`g:${b.id}`, { u0: 0, v0: 0, u1: 0.07, v1: 0.07, w: 48, h: 48 });
    v.cells.set(`l:${b.id}`, { u0: 0.1, v0: 0, u1: 0.13, v1: 0.02, w: 30, h: 14 });
  }
  // Aspects (natal–natal, natal–outer for bi-wheels)
  const counts = {};
  let id = 0;
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const A = bodies[i], B = bodies[j];
    if (!A.sprite && !B.sprite) continue;
    if (bi && A.outer && B.outer) continue;
    const d = Math.abs(((A.lon - B.lon + 540) % 360) - 180);
    for (const t of types) {
      const orb = Math.abs(d - ANGLES[t]);
      if (orb > Math.min(ORBS[t], maxOrb)) continue;
      const pat = PATTERN[t];
      counts[pat] = (counts[pat] ?? 0) + 1;
      const pa = polar(A.lon, R_ASPECT, asc), pb = polar(B.lon, R_ASPECT, asc);
      const w = 1.1 + 1.5 * (1 - orb / 8), o = 0.6;
      const tid = `aspect:${id++}`;
      const dash = DASH[pat] ? (DASH[pat].length % 2 ? [...DASH[pat], ...DASH[pat]] : DASH[pat]).map((n) => n / k) : null;
      v.tubes.set(tid, { id: tid, aspect: t, kind: "aspect", a: { sprite: A.sprite ? A.id : null, x: pa.x, y: pa.y }, b: { sprite: B.sprite ? B.id : null, x: pb.x, y: pb.y }, color: [0.7, 0.4, 0.3], w: { base: w, lit: w + 0.55, dim: w }, o: { base: o, lit: 0.8, dim: 0.15 }, dash, radius: makeSpring(0.85 + 0.55 * w), alpha: makeSpring(Math.min(1, 0.22 + o * 0.9)), arch: makeSpring(0), markAt: null, mark: makeSpring(0), now: null });
    }
  }
  if (arguments[0].returnOnly) { v.render(); return { v, cam, W }; }
  // One frame to warm up, then count one orbit frame.
  v.render();
  gl.__calls.clear();
  cam.rz += 1; v.render();
  const perFrame = Object.fromEntries([...gl.__calls.entries()].sort((a, b) => b[1] - a[1]));
  const total = [...gl.__calls.values()].reduce((s, n) => s + n, 0);
  const draws = v.draws;
  // Timing and allocation over an orbit of N frames.
  const N = 400;
  for (let i = 0; i < 100; i++) { cam.rz += 0.5; v.render(); }
  globalThis.gc?.();
  await new Promise((r) => setTimeout(r, 10)); const g0 = gcs;
  const h0 = process.memoryUsage().heapUsed;
  const s0 = performance.now();
  for (let i = 0; i < N; i++) { cam.rz += 0.5; v.render(); }
  const ms = (performance.now() - s0) / N;
  const h1 = process.memoryUsage().heapUsed;
  await new Promise((r) => setTimeout(r, 10)); const gRender = gcs - g0;
  // Picking: a pointer sweep over the stage.
  globalThis.gc?.();
  await new Promise((r) => setTimeout(r, 10)); const g1 = gcs;
  const p0h = process.memoryUsage().heapUsed;
  const p0 = performance.now();
  let _hits = 0; // a sink, so the picks cannot be optimised away
  for (let i = 0; i < N; i++) { if (v.pick((i * 37) % W, (i * 53) % W)) _hits++; }
  const pickMs = (performance.now() - p0) / N;
  const p1h = process.memoryUsage().heapUsed;
  await new Promise((r) => setTimeout(r, 10)); const gPick = gcs - g1;
  const tubes = v.tubes.size, sprites = v.sprites.size;
  console.log(JSON.stringify({ name, stage: W, k: +k.toFixed(3), sprites, tubes, patterns: counts, draws, glCallsPerFrame: total, uniformCalls: Object.entries(perFrame).filter(([n]) => n.startsWith("uniform")).reduce((s, [, n]) => s + n, 0), top: Object.fromEntries(Object.entries(perFrame).slice(0, 8)), jsMsPerFrame_V8: +ms.toFixed(3), allocKBPerFrame: +((h1 - h0) / N / 1024).toFixed(1), pickMs_V8: +pickMs.toFixed(3), pickAllocKB: +((p1h - p0h) / N / 1024).toFixed(1), staticMeshKB: Math.round(staticBytes / 1024), staticBuildMs: +staticMs.toFixed(1), gcDuringRender: gRender, gcDuringPick: gPick }, null, 0));
}

const MAJ = ["conjunction", "opposition", "trine", "square", "sextile"];
const ALL = Object.keys(ANGLES);
export const SCENARIOS = {
  default: { name: "natal default", sprites: 10, outer: 0, angles: 4, types: MAJ, maxOrb: 5, stage: 760, bi: false },
  detailed: { name: "natal detailed", sprites: 10, outer: 0, angles: 4, types: ALL, maxOrb: 8, stage: 760, bi: false },
  every: { name: "natal every body", sprites: 24, outer: 0, angles: 4, types: ALL, maxOrb: 8, stage: 760, bi: false },
  bi: { name: "bi-wheel", sprites: 10, outer: 10, angles: 4, types: ALL, maxOrb: 5, stage: 760, bi: true },
};
export async function setup(key) { return scenario({ ...SCENARIOS[key], returnOnly: true }); }
