/**
 * The wheel's 3D view: the chart as one solid object in one 3D space, drawn
 * with WebGL (see the 3D GL plan).
 *
 *  - The chart is a thick disc; the zodiac is a ring standing on it (its outer
 *    wall carries each sign's colour); a bi-wheel's outer ring is a step up.
 *    Their faces carry the chart's own picture, unlit, exactly as it is drawn
 *    flat, so everything stays as readable as the flat chart.
 *  - Planets float over their places on stems (billboards that face you, a
 *    soft shadow at the foot), matte as in the flat chart.
 *  - Aspects are round tubes joining the planets they link — real volume,
 *    matte, thicker for tighter orbs. Pinned, the focus's aspects arch up.
 *  - Pinned, the focus's sign, house and decan stand up as real prisms, and
 *    planets standing in a raised house rise with it.
 *  - The degree graduations (the natal ticks inside the zodiac, a bi-wheel's
 *    pins outside it) stand up as solid fins, the 10° ones above the ring:
 *    the two rings of marks read apart, whatever the angle.
 * One depth buffer: nothing is a stack of flat pictures, and everything
 * occludes everything else as it should. The camera is the depth
 * controller's (the same numbers as the CSS camera, gl-math.ts), so the
 * pointer mapping agrees with what is drawn.
 *
 * Entering, the view starts as an exact copy of the flat chart and grows out
 * of it: the aspects slide from the inner circle up to the planets as they
 * rise. The live chart stays in the page, invisible, for the pointer.
 */
import { SPRINGS, aim, makeSpring, settle, stepSpring, type Spring, type SpringParams } from "@/lib/depth/spring";
import { cameraAxes, chartToScene, clipMatrix, normalGL, pot, projectChart, projectInto, rotation, toGL, type ChartFrame, type Vec3 } from "@/lib/depth/gl-math";
import { bezierInto, bezierLengthOf, dashSegments, finMesh, hypot2, hypot3, inSector, rectTop, sectorTop, sectorWalls, tubeBinormalOf, tubeMeshIndexed, unitQuad, type Fin, type Polar, type RGB } from "@/lib/depth/gl-meshes";
import type { Mat4 } from "@/lib/depth/math";
import type { AspectRank, Ranked } from "@/lib/chart/wheel-rank";
import type { DepthController, Tier } from "./depth-controller";
import { CAMERA_DEFAULT, type Wheel3DGeometry } from "./camera";
import { releaseCanvas, renderLayer, settleAnimations, type ViewBox } from "./raster";
import { INSTANCED_SPECS, Instanced, InstanceList, QUAD_FLOATS, TUBE_FLOATS } from "./gl/gl-instanced";
import { focusKeyOf, inWheelFocus, tempAspectMarks, type FocusKey, type WheelFocus } from "@/lib/chart/wheel-focus";
import {
  bindMesh,
  createContext,
  drawMesh,
  dropMesh,
  linkAll,
  makeIndexedMesh,
  makeMesh,
  PROGRAM_SPECS,
  resolveRGB,
  unbindAttribs,
  uploadTexture,
  type GL,
  type Mesh,
  type Programs,
} from "./gl/gl-core";

export {
  CAMERA_ANGLES,
  CAMERA_DEFAULT,
  CAMERA_RX_MAX,
  CAMERA_RX_MIN,
  type CameraAngle,
  type Wheel3DGeometry,
} from "./camera";

/** Heights as a share of the stage's width. */
const H = {
  /** The chart's thickness under the plate. */
  rim: 0.016,
  /** The zodiac ring's height above the plate. */
  zodiac: 0.02,
  /** A bi-wheel's outer ring: a terrace just below the zodiac, whose coloured
   *  wall stays in sight all round. */
  outer: 0.011,
  /** Where natal planets float, above the plate. */
  body: 0.08,
  /** Where outer bodies float, above the outer ring (a level of their own). */
  outerBody: 0.095,
  /** The tallest graduation fins (10°) inside the zodiac: a touch above the ring. */
  tick: 0.023,
  /** … and a bi-wheel's pins on its outer ring: well above the zodiac, so the two rings of marks read apart. */
  outerTick: 0.022,
} as const;
/** Graduation fins by band: their share of the tallest fin, and how thick they are (units). */
const FIN: Record<string, { h: number; w: number; rank: number }> = {
  "tick-fine": { h: 0.24, w: 0.95, rank: 0 },
  "tick-mid": { h: 0.5, w: 1.2, rank: 1 },
  "tick-coarse": { h: 1, w: 1.5, rank: 2 },
};
/** Fins stand this far off the surfaces and walls they touch (units): no shared faces. */
const FIN_GAP = 0.3;
/** Pinned: the focus rises highest, what it involves next, what those touch least. */
const SPRITE_RISE: Record<Tier, number> = { 0: 0.045, 1: 0.024, 2: 0.011 };
/** Only the focus and what it directly involves stand up; what they touch is lit in place. */
const BLOCK_RISE: Record<Tier, number> = { 0: 0.05, 1: 0.034, 2: 0 };
/** How high a pinned focus's aspects arch (share of width, the tightest orb). */
const ARCH = 0.075;
/** Dashes read as dashes on a tube: the flat chart's pattern, longer. */
const DASH_3D = 3.2;
/** The cascade when pinned: the focus first, then what it involves, then the rest. */
const STAGGER_MS: Record<Tier, number> = { 0: 0, 1: 90, 2: 200 };
/**
 * Everything a focus leaves out sinks toward the plate: its float height
 * drops by SINK_DEPTH (to about a third) when pinned, by HOVER_SINK of that
 * on a hover (after the pointer rests), rippling out from the focus.
 */
const SINK_DEPTH = 0.65;
const HOVER_SINK = 0.6;
const SINK: SpringParams = { k: 140, c: 24 };
/** A sunk body steps back less than it used to fade: its depth separates it. */
const SUNK_ALPHA = 0.6;
/** Walls meet what they stand on in a slightly darker band this tall (units). */
const GROUND_BAND = 6;
/**
 * Smallest a planet's disc and a degree label's text get on screen (px): a
 * far body on a small stage is drawn bigger instead (never past MAX_BOOST).
 */
const MIN_GLYPH_PX = 16;
const MIN_LABEL_PX = 9;
const MAX_BOOST = 1.8;
/** A label's text height as a share of its plate. */
const LABEL_TEXT = 0.66;
/** The pointer reaches a planet from this far (px): a mouse, a finger. */
const PICK_REACH = { fine: 12, coarse: 18 } as const;

/** How much bigger to draw something so it is at least `min` px on screen. */
function boost(sizeUnits: number, unitPx: number, min: number): number {
  const px = sizeUnits * unitPx;
  return px > 0 ? Math.max(1, Math.min(MAX_BOOST, min / px)) : 1;
}
const SINK_DELAY = { pinned: 60, hover: 120, leave: 150 } as const;
/** Ripple: ms per degree of angle from the focus, capped. */
const SINK_RIPPLE = { perDeg: 0.5, max: 90 } as const;

/** Calm, exact motion: no bounce (practical), and quick fades. */
const EASE: SpringParams = { k: 170, c: 26 };
const FADE: SpringParams = { k: 420, c: 41 };

/** Atlas cells: a planet's disc and glyph, its degree label, an aspect's mark. */
const GLYPH_HALF = 24;
const MARK_HALF = 12;
/** The planet's disc radius (the focus halo goes round it), units. */
const DISC_R = 13.2;
/** Key light, in view space (x right, y down, z toward you): upper left, in front. */
const LIGHT: Vec3 = (() => {
  const v = [-0.42, -0.58, 0.7];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n] as Vec3;
})();

/** Which side of a tube's triangles faces away (the mesh winds inward). */
const TUBE_CULL = 0x0405; // gl.BACK

/** Base-SVG pieces the 3D view draws itself (everything else is the chart's picture). */
const OFF_PLATE =
  "[data-kind='planet'], [data-kind='transit'], g[data-aspect][data-hl], [data-kind='aspect-marks'], [data-kind='aspect-top'], [data-kind='reception'], [data-kind='cfg'], path[data-kind='tick-fine'], path[data-kind='tick-mid'], path[data-kind='tick-coarse']";

function stage(t: number, at: number, end = 1): number {
  const x = Math.max(0, Math.min(1, (t - at) / Math.max(1e-6, end - at)));
  return x * x * (3 - 2 * x);
}

const mixN = (a: number, b: number, t: number) => a + (b - a) * t;

type Cell = { u0: number; v0: number; u1: number; v1: number; w: number; h: number };
/** An atlas drawn (no canvas: the one on the GPU is it already), its cells, what drew it, and how many cells came from the last one. */
type Atlas = { canvas: HTMLCanvasElement | null; cells: Map<string, Cell>; sig: string; copied: number };
type CellJob = { key: string; roots: Element[]; skip: (el: Element) => boolean; box: ViewBox; force?: (el: Element) => boolean };

type Sprite = {
  id: string;
  /** Its node in the live chart, and what puts it in a focus (read once per build). */
  el: Element;
  key: FocusKey;
  outer: boolean;
  x: number;
  y: number;
  /** Its place in the entry wave (0 at the Ascendant, round to 1). */
  wave: number;
  /** The house under its stem (it stands on it when that house is raised). */
  house: number | null;
  stem: RGB;
  labelAt: { x: number; y: number } | null;
  rise: Spring;
  scale: Spring;
  alpha: Spring;
  halo: Spring;
  /** 0 at its float height … 1 sunk toward the plate (outside the focus). */
  sink: Spring;
  /** Where it stood in the frame last drawn (units), and in which frame. */
  nowFoot: number;
  nowZ: number;
  nowSeen: number;
  /** Its disc, and its label's, drawn in that frame: depth, disc scale, label boost. */
  upDepth: number;
  upScale: number;
  upLabel: number;
  /** Its cells in the atlas (looked up again when the atlas is). */
  cellsOf: Map<string, Cell> | null;
  glyphCell: Cell | null;
  labelCell: Cell | null;
};

type End = { sprite: string | null; x: number; y: number };

type Tube = {
  id: string;
  aspect: string | null;
  kind: "aspect" | "reception" | "cfg";
  /** What puts an aspect's line in a focus (read once per build). */
  key: FocusKey | null;
  a: End;
  b: End;
  color: RGB;
  /** The flat chart's stroke for each paint mode, px (width) and opacity. */
  w: { base: number; lit: number; dim: number };
  o: { base: number; lit: number; dim: number };
  /** The flat line's dash pattern (on, off, on, off…), units; null when solid. */
  dash: number[] | null;
  /** 3D targets (springs), px. */
  radius: Spring;
  alpha: Spring;
  arch: Spring;
  markAt: { x: number; y: number } | null;
  mark: Spring;
  /** Where it was in the frame last drawn (units), for drawing and picking. */
  now: TubeNow | null;
  /** Its shape, kept while it stays (a camera move reuses it). */
  geo: TubeGeo | null;
  /** Its mark drawn in that frame: how far off. */
  upDepth: number;
  cellsOf: Map<string, Cell> | null;
  markCell: Cell | null;
};

/** A tube in the frame last drawn (units): its ends, bend and middle, radius, opacity, depth. */
type TubeNow = { a: Float64Array; b: Float64Array; c: Float64Array; mid: Float64Array; r: number; alpha: number; depth: number };

/** A tube's shape for its ends, bend, radius and dash scale (`key`): length, bend plane, dashes (stretches of the curve). */
type TubeGeo = { key: Float64Array; dash: number[] | null; len: number; bn: Float32Array; solid: boolean; ranges: Float64Array; count: number };

/** Heights now (units): the surface each thing stands on. */
type Layout = { t: number; k: number; tRing: number; tLink: number; zodiac: number; outer: number; rim: number; houseTop: Map<number, number> };

type LabelItem = { id: string; x: number; y: number; hw: number; hh: number; w: number; rank: number };
type Disc = { id: string; x: number; y: number; r: number };

/** Scratch for a frame: a projected point (x, y, w), a point on a curve. */
const PRJ = new Float64Array(3);
const PT = new Float64Array(3);
/** The meshes' attribute layouts: [name, size, offset]. */
const WALL_LAYOUT: [string, number, number][] = [
  ["a_pos", 3, 0],
  ["a_normal", 3, 3],
  ["a_color", 3, 6],
];
const TOP_LAYOUT: [string, number, number][] = [["a_pos", 3, 0]];
const TUBE_LAYOUT: [string, number, number][] = [["a_t", 4, 0]];
const QUAD_LAYOUT: [string, number, number][] = [["a_q", 2, 0]];
/** A quad lying flat on the chart. */
const FLAT = { right: [1, 0, 0] as Vec3, up: [0, -1, 0] as Vec3, toward: [0, 0, 1] as Vec3 };
/** One tube (or one dash of it) into an instance list: mesh 0 the tube, 1 the dash. */
function putTube(list: InstanceList, mesh: number, a: Float64Array, b: Float64Array, c: Float64Array, bn: Float32Array, r: number, alpha: number, color: RGB, u0: number, u1: number) {
  const i = list.add(mesh);
  const d = list.data;
  d[i] = a[0];
  d[i + 1] = a[1];
  d[i + 2] = a[2];
  d[i + 3] = r;
  d[i + 4] = b[0];
  d[i + 5] = b[1];
  d[i + 6] = b[2];
  d[i + 7] = alpha;
  d[i + 8] = c[0];
  d[i + 9] = c[1];
  d[i + 10] = c[2];
  d[i + 11] = bn[0];
  d[i + 12] = bn[1];
  d[i + 13] = bn[2];
  d[i + 14] = color[0];
  d[i + 15] = color[1];
  d[i + 16] = color[2];
  d[i + 17] = u0;
  d[i + 18] = u1;
}

/** One quad into an instance list (the same numbers the quad program took as uniforms). */
function putQuad(list: InstanceList, cx: number, cy: number, cz: number, lift: number, halfW: number, halfH: number, cell: Cell | null, halo: RGB | null, haloA: number, r0: number, r1: number, r2: number, mode: number, alpha: number) {
  const i = list.add(0);
  const d = list.data;
  d[i] = cx;
  d[i + 1] = cy;
  d[i + 2] = cz;
  d[i + 3] = lift;
  d[i + 4] = 0;
  d[i + 5] = 0;
  d[i + 6] = halfW;
  d[i + 7] = halfH;
  d[i + 8] = cell?.u0 ?? 0;
  d[i + 9] = cell?.v0 ?? 0;
  d[i + 10] = cell?.u1 ?? 1;
  d[i + 11] = cell?.v1 ?? 1;
  d[i + 12] = halo ? halo[0] : 0;
  d[i + 13] = halo ? halo[1] : 0;
  d[i + 14] = halo ? halo[2] : 0;
  d[i + 15] = halo ? haloA : 0;
  d[i + 16] = r0;
  d[i + 17] = r1;
  d[i + 18] = r2;
  d[i + 19] = mode;
  d[i + 20] = alpha;
}

/**
 * A WebGL context with what it holds: the programs, the meshes, and the
 * chart's pictures, each kept with what drew it. A view that closes leaves it
 * parked a moment (its canvas off the page and down to 1 px): the next view
 * takes it over, with nothing to compile, and with pictures it may still use
 * (the same chart: no drawing, no upload). Parked 30 s unused, it goes.
 */
type Kit = {
  canvas: HTMLCanvasElement;
  gl: GL;
  webgl2: boolean;
  progs: Programs;
  inst: Instanced | null;
  meshes: Record<string, Mesh | null>;
  staticKey: string;
  chartTex: WebGLTexture | null;
  plateSig: string;
  atlasTex: WebGLTexture | null;
  atlasSig: string;
  cells: Map<string, Cell>;
};
const PARK_MS = 30000;
let parked: { kit: Kit; timer: number; lost: () => void } | null = null;
/** 3D views open now (one warming ahead would only make a context nobody takes). */
let openViews = 0;

/** A new context, its programs linked together, its fixed meshes made. */
function makeKit(): Kit | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.className = "ulune-depth-gl";
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("data-testid", "wheel-gl");
  const got = createContext(canvas);
  if (!got) return null;
  const gl = got.gl;
  let progs: Programs;
  let inst: Instanced | null = null;
  try {
    // Tubes and quads in a few draws where WebGL 2 is (the same picture).
    const instanced = got.webgl2 && !classicGL();
    const specs = [PROGRAM_SPECS.wall, PROGRAM_SPECS.top, PROGRAM_SPECS.tube, PROGRAM_SPECS.quad, ...(instanced ? INSTANCED_SPECS : [])];
    const [wall, top, tube, quad, iTube, iQuad] = linkAll(gl, specs);
    progs = { wall, top, tube, quad };
    if (instanced && iTube && iQuad) inst = new Instanced(gl as WebGL2RenderingContext, [iTube, iQuad]);
  } catch {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  const meshes: Record<string, Mesh | null> = {};
  meshes.quad = makeMesh(gl, unitQuad(), 2);
  // (Indexed: the same triangles, each ring's vertices shaded once.)
  const tube = tubeMeshIndexed(26, 12, 3);
  const pill = tubeMeshIndexed(3, 10, 3);
  meshes.tube = makeIndexedMesh(gl, tube.vertices, 4, tube.indices);
  meshes.pill = makeIndexedMesh(gl, pill.vertices, 4, pill.indices);
  return { canvas, gl, webgl2: got.webgl2, progs, inst, meshes, staticKey: "", chartTex: null, plateSig: "", atlasTex: null, atlasSig: "", cells: new Map() };
}

/** Everything of a kit given back to the GPU, and the context let go. */
function dropKit(kit: Kit) {
  const gl = kit.gl;
  if (!gl.isContextLost()) {
    for (const mesh of Object.values(kit.meshes)) dropMesh(gl, mesh);
    if (kit.chartTex) gl.deleteTexture(kit.chartTex);
    if (kit.atlasTex) gl.deleteTexture(kit.atlasTex);
    for (const p of Object.values(kit.progs)) gl.deleteProgram(p.prog);
    kit.inst?.destroy();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  kit.canvas.remove();
  kit.canvas.width = 0;
  kit.canvas.height = 0;
}

function parkKit(kit: Kit) {
  if (parked) dropParked();
  kit.canvas.remove();
  // Its drawing buffer goes; the programs, meshes and pictures stay.
  kit.canvas.width = 1;
  kit.canvas.height = 1;
  const lost = () => {
    if (parked?.kit === kit) {
      window.clearTimeout(parked.timer);
      parked = null;
    }
  };
  kit.canvas.addEventListener("webglcontextlost", lost);
  parked = { kit, timer: window.setTimeout(dropParked, PARK_MS), lost };
}

function takeParked(): Kit | null {
  const p = parked;
  if (!p) return null;
  parked = null;
  window.clearTimeout(p.timer);
  p.kit.canvas.removeEventListener("webglcontextlost", p.lost);
  if (p.kit.gl.isContextLost()) return null;
  return p.kit;
}

function dropParked() {
  const p = parked;
  if (!p) return;
  parked = null;
  window.clearTimeout(p.timer);
  p.kit.canvas.removeEventListener("webglcontextlost", p.lost);
  dropKit(p.kit);
  releaseCells();
}

/**
 * Make the context and its programs ahead of the first 3D view (at idle, once
 * the 3D view's code has loaded: the pointer is near its button). The view
 * that opens takes it over.
 */
export function warmView3D() {
  if (parked || openViews > 0 || typeof document === "undefined") return;
  const kit = makeKit();
  if (kit) parkKit(kit);
}

/** The fonts that finished loading so far (a picture drawn before one did is not reused after). */
let fontEpoch = 0;
if (typeof document !== "undefined" && document.fonts) {
  document.fonts.addEventListener("loadingdone", () => {
    fontEpoch += 1;
  });
}

/** Attributes that say where the chart is in its life, not how it looks. */
const VOLATILE = new Set(["data-focus-kind", "data-focus-id", "data-view3d", "data-depth-base", "data-entering", "data-gliding", "data-focus-fade", "data-depth-build-ms", "data-depth-gl", "data-depth-camera", "data-depth-lite", "data-depth-reuse", "data-depth-kit"]);
/** Classes that come and go on the page as it moves or switches theme. */
const VOLATILE_CLASS = /\b(is-moving|theme-switching)\b/g;

/**
 * What the chart's styles hang on around it: the classes, inline styles and
 * data of the page from the chart up (the theme, the Look, the chart's own
 * settings), the fonts loaded, the device's pixels.
 */
function styleSig(base: SVGSVGElement): string {
  const parts: string[] = [String(fontEpoch), String(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)];
  for (let el: Element | null = base; el; el = el.parentElement) {
    parts.push(el.tagName);
    for (const name of el.getAttributeNames()) {
      if (VOLATILE.has(name)) continue;
      const v = el.getAttribute(name) ?? "";
      parts.push(name, name === "class" ? v.replace(VOLATILE_CLASS, "").replace(/\s+/g, " ").trim() : v);
    }
  }
  return parts.join("\u0001");
}

/**
 * The markup of what a picture draws (`skip`ped subtrees left out): its
 * elements, attributes and text. The same markup and styles draw the same
 * picture.
 */
function markupOf(roots: Element[], skip: (el: Element) => boolean): string {
  const out: string[] = [];
  const walk = (el: Element) => {
    if (skip(el)) {
      out.push("~");
      return;
    }
    out.push("<", el.tagName);
    for (const name of el.getAttributeNames()) if (!VOLATILE.has(name)) out.push(" ", name, "=", el.getAttribute(name) ?? "");
    out.push(">");
    for (const c of el.childNodes) {
      if (c.nodeType === 3) out.push(c.nodeValue ?? "");
      else if (c.nodeType === 1) walk(c as Element);
    }
    out.push("</>");
  };
  for (const r of roots) walk(r);
  return out.join("\u0001");
}

/**
 * The last atlas's cells, each as drawn (a canvas of its own), by what drew
 * it: the next atlas draws a cell that did not change from it, exactly as it
 * would draw a fresh one.
 */
let cellsPrev = new Map<string, HTMLCanvasElement>();

function releaseCells() {
  for (const c of cellsPrev.values()) releaseCanvas(c);
  cellsPrev = new Map();
}

/**
 * The chart picture's size: "npot" (to the pixel where WebGL 2 is, the
 * default), "npot2048" (to the pixel, at most 2048 at the fit) or "pot" (a
 * power of two, as before 26 Sep 2026); for comparing (QA),
 * `localStorage["ulune.debug.tex"]` picks one.
 */
function texMode(): string {
  try {
    return (typeof window !== "undefined" && window.localStorage.getItem("ulune.debug.tex")) || "npot";
  } catch {
    return "npot";
  }
}
/**
 * The 3D canvas's device pixels per CSS pixel, at most 2 (3x screens draw at
 * 2x: less than half the pixels shaded per frame); `localStorage["ulune.debug.gldpr"]`
 * = "3" draws them at 3x, as before 26 Sep 2026.
 */
function glDprCap(): number {
  try {
    const v = Number((typeof window !== "undefined" && window.localStorage.getItem("ulune.debug.gldpr")) || 2);
    return Number.isFinite(v) && v >= 1 ? v : 2;
  } catch {
    return 2;
  }
}

/**
 * The instanced renderer is on wherever WebGL 2 is; for comparing (QA),
 * `localStorage["ulune.debug.gl"] = "classic"` draws every piece on its own.
 */
function classicGL(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("ulune.debug.gl") === "classic";
  } catch {
    return false;
  }
}

/**
 * Stable sorts for the frame's short lists, in place, without the comparator
 * calls of Array.sort (each returned a boxed number: garbage every frame).
 * Insertion: the same order as a stable sort by the same rule.
 */
function sortTubesFar(list: Tube[]) {
  for (let i = 1; i < list.length; i += 1) {
    const x = list[i];
    const k = (x.now as TubeNow).depth;
    let j = i - 1;
    while (j >= 0 && (list[j].now as TubeNow).depth < k) {
      list[j + 1] = list[j];
      j -= 1;
    }
    list[j + 1] = x;
  }
}
function sortUprightFar(list: (Sprite | Tube)[]) {
  for (let i = 1; i < list.length; i += 1) {
    const x = list[i];
    const k = x.upDepth;
    let j = i - 1;
    while (j >= 0 && list[j].upDepth < k) {
      list[j + 1] = list[j];
      j -= 1;
    }
    list[j + 1] = x;
  }
}
/** The focus's labels first, then what it involves, then the rest; the nearer first within each. */
function sortLabels(list: LabelItem[]) {
  for (let i = 1; i < list.length; i += 1) {
    const x = list[i];
    let j = i - 1;
    while (j >= 0 && (list[j].rank < x.rank || (list[j].rank === x.rank && list[j].w > x.w))) {
      list[j + 1] = list[j];
      j -= 1;
    }
    list[j + 1] = x;
  }
}
const isSprite = (u: Sprite | Tube): u is Sprite => "wave" in u;

type Block = {
  id: string;
  ecl0: number;
  ecl1: number;
  r0: number;
  r1: number;
  onRing: boolean;
  top: Mesh | null;
  walls: Mesh | null;
  tier: Tier;
  rise: Spring;
  glow: Spring;
  /** Its foot and top in the frame last drawn (units). */
  z0: number;
  z1: number;
};

export type View3DHooks = {
  /** The layers were rebuilt: the painter must re-read the view. */
  rebuilt?(): void;
  /** Run `fn` with the chart painted at rest (no focus), for the pictures. */
  rest<T>(fn: () => T): T;
  /** The chart's layout in chart units. */
  geometry(): Wheel3DGeometry;
  /** WebGL is missing or was lost for good: the chart goes back to flat. */
  failed?(): void;
};

function num(el: Element | null | undefined, attr: string) {
  return Number(el?.getAttribute(attr) ?? NaN);
}

/** Where an aspect's glyph shows (its group's data-mark-at, chart-wheel.tsx). */
function markAtOf(g: Element): { x: number; y: number } | null {
  const v = (g.getAttribute("data-mark-at") ?? "").split(" ").map(Number);
  return v.length === 2 && v.every(Number.isFinite) ? { x: v[0], y: v[1] } : null;
}

/** A rect's box as drawn: a label turned along the radius (rotate(a cx cy)) takes its turned bounds. */
function turnedBox(r: Element): { x: number; y: number; w: number; h: number } {
  const x = num(r, "x");
  const y = num(r, "y");
  const w = num(r, "width");
  const h = num(r, "height");
  const m = /rotate\(\s*([-\d.]+)(?:[ ,]+([-\d.]+)[ ,]+([-\d.]+))?\s*\)/.exec(r.getAttribute("transform") ?? "");
  if (!m) return { x, y, w, h };
  const a = (Number(m[1]) * Math.PI) / 180;
  const cx = m[2] != null ? Number(m[2]) : 0;
  const cy = m[3] != null ? Number(m[3]) : 0;
  const pts = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ].map(([px, py]) => ({
    x: cx + (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a),
    y: cy + (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a),
  }));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/** How long a build waits for the chart's fonts at most (then draws anyway). */
const FONT_WAIT_MS = 1500;

/** A font family as the page names it and as a FontFace does: unquoted, lower case. */
function familyKey(name: string): string {
  return name.trim().replace(/^["']|["']$/g, "").toLowerCase();
}

/** The font families the chart's text is set in (every family of each stack). */
function chartFamilies(svg: SVGSVGElement): Set<string> {
  const out = new Set<string>();
  const seen = new Set<string>();
  for (const t of svg.querySelectorAll("text")) {
    const stack = getComputedStyle(t).fontFamily;
    if (seen.has(stack)) continue;
    seen.add(stack);
    for (const f of stack.split(",")) out.add(familyKey(f));
  }
  return out;
}

/**
 * Wait (at most `maxMs`) for the fonts the chart uses that are still loading:
 * its pictures are drawn with them. Other fonts of the page never hold it up.
 */
function fontsReady(families: Set<string>, maxMs: number): Promise<void> {
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts || fonts.status === "loaded") return Promise.resolve();
  const loading: Promise<unknown>[] = [];
  fonts.forEach((f) => {
    if (f.status === "loading" && families.has(familyKey(f.family))) loading.push(f.loaded.catch(() => undefined));
  });
  if (!loading.length) return Promise.resolve();
  return Promise.race([Promise.all(loading).then(() => undefined), new Promise<void>((r) => window.setTimeout(r, maxMs))]);
}

export class WheelView3D {
  private depth: DepthController;
  private base: SVGSVGElement;
  private hooks: View3DHooks;
  private reduced: () => boolean;
  private t = makeSpring(0, SPRINGS.view);
  entered = false;

  private canvas: HTMLCanvasElement | null = null;
  private gl: GL | null = null;
  private progs: Programs | null = null;
  /** The instanced renderer (WebGL 2), and the frame's instance lists. */
  private inst: Instanced | null = null;
  private tubeList = new InstanceList(TUBE_FLOATS);
  private quadList = new InstanceList(QUAD_FLOATS);
  private tubeMeshes: (Mesh | null | undefined)[] = [null, null];
  /** Draw calls in the frame last drawn (`draws` counts the pieces drawn). */
  private calls = 0;
  /** The chart picture's side, px (QA). */
  private texSide = 0;
  private webgl2 = false;
  /** Counted among the open views. */
  private open = false;
  /** What drew the chart's picture and the atlas now on the GPU (the same again: nothing is drawn or uploaded). */
  private plateSig = "";
  private atlasSig = "";
  /** What the last build could keep: the chart's picture, the atlas, and how many of the atlas's cells. */
  private reuse = { plate: false, atlas: false, cells: 0, of: 0 };
  private lost = false;
  private meshes: Record<string, Mesh | null> = {};
  private chartTex: WebGLTexture | null = null;
  private atlasTex: WebGLTexture | null = null;
  private cells = new Map<string, Cell>();

  private geo: Wheel3DGeometry | null = null;
  private polar: Polar = { cx: 0, cy: 0, asc: 0 };
  private frame: ChartFrame | null = null;
  private vb: ViewBox = { x: 0, y: 0, w: 1, h: 1 };
  private sprites = new Map<string, Sprite>();
  private tubes = new Map<string, Tube>();
  private blocks = new Map<string, Block>();
  /** The graduations as fins: inside the zodiac (on the plate) and a bi-wheel's pins (on its outer ring). */
  private fins: { natal: Fin[]; outer: Fin[] } = { natal: [], outer: [] };
  private colors = {
    halo: [0.78, 0.63, 0.35] as RGB,
    neutral: [0.3, 0.3, 0.34] as RGB,
    edge: [0.16, 0.16, 0.19] as RGB,
    glass: [0.4, 0.4, 0.45] as RGB,
    signs: new Map<string, RGB>(),
    decans: new Map<string, RGB>(),
    /** Shading (floor, span) of walls and tubes: pale sides on a pale chart. */
    shadeWall: [0.5, 0.56] as [number, number],
    shadeTube: [0.46, 0.62] as [number, number],
    /** Contact shadows: their colour and strength. */
    shadow: [0, 0, 0] as RGB,
    shadowK: 1,
  };
  /** Was the last focus a pin (an unpin lets go at once; a hover lingers)? */
  private lastPinned = false;
  /** The chart's focus as last handed over (null: none yet). */
  private focus: WheelFocus | null = null;
  /** Is the view on stage (its canvas over the hidden live chart)? */
  onStage(): boolean {
    return this.ready && !this.lost;
  }

  /** What is in focus ("" for nothing): on stage, the live chart does not show it. */
  focusId(): string {
    return this.focus?.id ?? "";
  }

  private offLoop: (() => void) | null = null;
  private generation = 0;
  private building = false;
  /** The build under way has started reading the chart (a change after that needs another). */
  private reading = false;
  private again = false;
  private againFirst = false;
  /** The page's theme the pictures were drawn in (only a switch between light and dark redraws them). */
  private lightBuilt: boolean | null = null;
  /** The font families the chart's text is set in (a font loading elsewhere never redraws it). */
  private families = new Set<string>();
  /** The inputs the solid meshes were built from: unchanged, they are kept. */
  private staticKey = "";
  /** A spring moved this frame (one only waiting on its delay draws nothing new). */
  private moved = false;
  /** When the canvas last had to change size, and the timer that sizes it exactly once it settles. */
  private sizedAt = -Infinity;
  private sizeTimer = 0;
  private ready = false;
  private exitDone: (() => void) | null = null;
  private dirty = true;
  private lastCam = "";
  /**
   * Degree labels that would cover another label or a planet on screen fade
   * back (the one in focus, then the nearer, keeps its place): the target
   * set while drawing, the eased value used.
   */
  private labelTarget = new Map<string, number>();
  private labelFade = new Map<string, number>();
  private lastBuildMs = 0;
  private resizeObs: ResizeObserver | null = null;
  private themeObs: MutationObserver | null = null;
  private zoomObs: MutationObserver | null = null;
  private rebuildTimer = 0;
  private watchingFonts = false;
  private builtK = 0;
  /** Scratch reused by every frame (nothing is allocated while the camera moves). */
  private lay: Layout = { t: 0, k: 1, tRing: 0, tLink: 0, zodiac: 0, outer: 0, rim: 0, houseTop: new Map() };
  private frameNo = 0;
  private mvp32 = new Float32Array(16);
  private nrm32 = new Float32Array(9);
  private uvmap32 = new Float32Array(4);
  private bn32 = new Float32Array(3);
  private pa = new Float64Array(3);
  private pb = new Float64Array(3);
  private pc = new Float64Array(3);
  private raised: Block[] = [];
  private pend: Tube[] = [];
  private upright: (Sprite | Tube)[] = [];
  private dcItems: LabelItem[] = [];
  private dcDiscs: Disc[] = [];
  private dcOrder: LabelItem[] = [];
  private dcKept: LabelItem[] = [];
  /** Colours resolved during a build (many pieces share one). */
  private rgbCache = new Map<string, RGB>();
  private builtDpr = 0;
  private draws = 0;
  /** The live chart hides only once the canvas has drawn over it (render), so the stage is never empty in between. */
  private revealOnDraw = false;

  constructor(depth: DepthController, base: SVGSVGElement, hooks: View3DHooks, reduced: () => boolean) {
    this.depth = depth;
    this.base = base;
    this.hooks = hooks;
    this.reduced = reduced;
  }

  /** Progress of the view, 0 (flat) … 1 (fully in 3D). */
  progress(): number {
    return Math.max(0, Math.min(1, this.t.x));
  }

  private size(): number {
    return this.depth.size();
  }

  /** Height of a surface now, stack px (the pointer tests the plate and rings at these). */
  zOf(name: "plate" | "zodiac" | "outerRing"): number {
    const s = stage(this.progress(), 0.04) * this.size();
    if (name === "zodiac") return H.zodiac * s;
    if (name === "outerRing") return (this.geo?.outer ? H.outer : H.zodiac) * s;
    return 0;
  }

  /** The 3D view paints its own pieces: no copies for the focus painter. */
  paintRoots(): Element[] {
    return [];
  }

  // ─── lifecycle ────────────────────────────────────────────────────────

  enter() {
    if (this.entered) return;
    this.entered = true;
    if (!this.open) {
      this.open = true;
      openViews += 1;
    }
    this.offLoop ??= this.depth.addExtra((now, dt) => this.step(now, dt));
    if (!this.watchingFonts && typeof document !== "undefined" && document.fonts) {
      document.fonts.addEventListener("loadingdone", this.onFonts);
      this.watchingFonts = true;
    }
    if (!this.resizeObs && typeof ResizeObserver !== "undefined") {
      this.resizeObs = new ResizeObserver(() => this.onResize());
      this.resizeObs.observe(this.depth.scene);
    }
    // A switch between light and dark repaints the chart's colours (at once:
    // the page cross-fades, nothing eases): its pictures are drawn again.
    // Other class changes on the page (theme-switching, theme-ready…) draw
    // nothing. (The wheel asks for the same redraw inside the switch; the two
    // make one build.)
    if (!this.themeObs && typeof MutationObserver !== "undefined") {
      this.themeObs = new MutationObserver(() => {
        const light = document.documentElement.classList.contains("light");
        if (this.lightBuilt !== null && light !== this.lightBuilt) this.rebuild();
      });
      this.themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      // Zooming the stage scales the canvas: draw it at the new resolution.
      const port = this.depth.scene.closest(".ulune-wheel-zoom-port");
      if (port) {
        this.zoomObs = new MutationObserver(() => {
          this.dirty = true;
          this.depth.kick();
        });
        this.zoomObs.observe(port, { attributes: true, attributeFilter: ["data-zoom"] });
      }
    }
    void this.build(true);
  }

  /** A font the chart uses has loaded: its pictures are drawn again. */
  private onFonts = (e: Event) => {
    const faces = (e as Event & { fontfaces?: readonly FontFace[] }).fontfaces;
    if (!faces || !this.families.size || faces.some((f) => this.families.has(familyKey(f.family)))) this.later(0);
  };

  /** Draw the pictures again soon (coalesced). */
  private later(ms: number) {
    if (typeof window === "undefined") return;
    window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => this.rebuild(), ms);
  }

  private onResize() {
    this.dirty = true;
    this.depth.kick();
    // The camera follows at once (the frame is read every frame); the
    // pictures are drawn again for the new size once it settles.
    const f = this.measure();
    if (f && this.builtK && Math.abs(f.k / this.builtK - 1) > 0.12) this.later(260);
  }

  /** Back to the flat chart; `onDone` runs once the view is gone. */
  exit(onDone?: () => void) {
    if (!this.entered) {
      onDone?.();
      return;
    }
    this.entered = false;
    this.generation += 1;
    this.depth.setCamera(null, SPRINGS.view);
    // Everything settles down with the view: what was in focus stays lit as
    // it flattens, nothing stands up.
    this.applyFocus(this.focus, null, new Map(), new Map(), false);
    if (this.reduced() || !this.ready) {
      settle(this.t, 0);
      this.teardown();
      onDone?.();
      return;
    }
    aim(this.t, 0, SPRINGS.view);
    this.exitDone = onDone ?? null;
    this.depth.kick();
  }

  /**
   * The live chart was replaced (a new chart, another mode): follow the new
   * one. The canvas keeps its last picture until the new one is drawn, and the
   * new chart stays hidden under it from the start.
   */
  setBase(svg: SVGSVGElement) {
    if (svg === this.base) return;
    const mode = this.base.getAttribute("data-view3d");
    this.base.removeAttribute("data-view3d");
    this.base = svg;
    if (mode) svg.setAttribute("data-view3d", mode);
    this.rebuild();
  }

  /** The chart re-rendered (time scrub, new bodies): draw it again. */
  rebuild() {
    if (!this.entered) return;
    void this.build(false);
  }

  /** Fit: the default camera and the whole chart (no lens zoom). */
  resetCamera() {
    if (!this.entered) return;
    this.depth.setCamera({ ...CAMERA_DEFAULT }, SPRINGS.view);
    this.depth.resetLens();
  }

  destroy() {
    this.generation += 1;
    this.entered = false;
    this.teardown();
  }

  // ─── building ─────────────────────────────────────────────────────────

  /** The live SVG's mapping from chart units to stack px (viewBox, meet). */
  private measure(): ChartFrame | null {
    const vbv = this.base.viewBox.baseVal;
    const w = this.base.clientWidth || this.depth.scene.clientWidth;
    const h = this.base.clientHeight || w;
    if (!vbv || !vbv.width || !w) return null;
    const k = Math.min(w / vbv.width, h / vbv.height);
    return { k, ox: (w - vbv.width * k) / 2, oy: (h - vbv.height * k) / 2, vbx: vbv.x, vby: vbv.y };
  }

  /** Device px per scene px for the canvas (a zoomed stage scales it). */
  private dpr(): number {
    if (typeof window === "undefined") return 1;
    const scene = this.depth.scene;
    const rect = scene.getBoundingClientRect();
    const zoom = scene.clientWidth ? rect.width / scene.clientWidth : 1;
    const want = (window.devicePixelRatio || 1) * Math.max(1, zoom);
    return this.depth.lite ? Math.min(1, want) : Math.min(want, glDprCap());
  }

  /** Device px per scene px for the chart's pictures: the lens zoom magnifies them too. */
  private texDpr(): number {
    const want = this.dpr() * Math.max(1, this.depth.lensZoom());
    return this.depth.lite ? Math.min(1.5, want) : Math.min(want, 6);
  }

  private ensureGL(): boolean {
    if (this.gl && this.canvas && !this.lost) return true;
    // A context parked by a view that closed (or made ahead), else a new one.
    const took = takeParked();
    const kit = took ?? makeKit();
    if (!kit) return false;
    this.depth.scene.dataset.depthKit = took ? "kept" : "new";
    kit.canvas.addEventListener("webglcontextlost", this.onLost);
    kit.canvas.addEventListener("webglcontextrestored", this.onRestored);
    this.canvas = kit.canvas;
    this.gl = kit.gl;
    this.webgl2 = kit.webgl2;
    this.progs = kit.progs;
    this.inst = kit.inst;
    this.meshes = kit.meshes;
    this.staticKey = kit.staticKey;
    this.chartTex = kit.chartTex;
    this.plateSig = kit.plateSig;
    this.atlasTex = kit.atlasTex;
    this.atlasSig = kit.atlasSig;
    this.cells = kit.cells;
    this.lost = false;
    this.depth.scene.dataset.depthGl = kit.webgl2 ? "webgl2" : "webgl1";
    return true;
  }

  /** Leave the context and what it holds parked for the next view (a lost one is let go). */
  private park() {
    const gl = this.gl;
    const canvas = this.canvas;
    const progs = this.progs;
    if (!gl || !canvas || !progs || this.lost || gl.isContextLost()) {
      this.dropGL();
      return;
    }
    for (const b of this.blocks.values()) {
      dropMesh(gl, b.top);
      dropMesh(gl, b.walls);
      b.top = null;
      b.walls = null;
    }
    canvas.removeEventListener("webglcontextlost", this.onLost);
    canvas.removeEventListener("webglcontextrestored", this.onRestored);
    parkKit({
      canvas,
      gl,
      webgl2: this.webgl2,
      progs,
      inst: this.inst,
      meshes: this.meshes,
      staticKey: this.staticKey,
      chartTex: this.chartTex,
      plateSig: this.plateSig,
      atlasTex: this.atlasTex,
      atlasSig: this.atlasSig,
      cells: this.cells,
    });
    this.meshes = {};
    this.inst = null;
    this.staticKey = "";
    this.chartTex = null;
    this.plateSig = "";
    this.atlasTex = null;
    this.atlasSig = "";
    this.cells = new Map();
    this.progs = null;
    this.gl = null;
    this.canvas = null;
    this.ready = false;
    this.revealOnDraw = false;
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.ready = false;
    this.depth.scene.dataset.depthGl = "lost";
    // The live chart comes back while the context is away.
    this.base.removeAttribute("data-view3d");
    if (this.canvas) this.canvas.style.visibility = "hidden";
  };

  private onRestored = () => {
    // Everything on the GPU is gone: start over on a fresh context.
    this.dropGL();
    this.rebuild();
  };

  private async build(first: boolean) {
    if (this.building) {
      // A build that has not read the chart yet will draw this change too;
      // one reading it already needs another after it.
      if (first) this.againFirst = true;
      if (this.reading || first) this.again = true;
      return;
    }
    this.building = true;
    this.reading = false;
    const gen = ++this.generation;
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      this.families = chartFamilies(this.base);
      await fontsReady(this.families, FONT_WAIT_MS);
      if (gen !== this.generation || !this.entered) return;
      this.reading = true;
      this.lightBuilt = document.documentElement.classList.contains("light");
      const frame = this.measure();
      if (!frame) return;
      if (!this.ensureGL()) {
        this.depth.scene.dataset.depthGl = "failed";
        this.hooks.failed?.();
        return;
      }
      const gl = this.gl as GL;
      const t0 = performance.now();
      const geo = this.hooks.geometry();
      this.geo = geo;
      this.polar = { cx: geo.cx, cy: geo.cy, asc: geo.asc };
      const vbv = this.base.viewBox.baseVal;
      this.vb = { x: vbv.x, y: vbv.y, w: vbv.width, h: vbv.height };
      const dpr = this.texDpr();
      const maxTex = Math.min(4096, (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || 2048);
      const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
      // The chart's picture: 1.3× the stage's device pixels, to the pixel on
      // WebGL 2 (which mipmaps any size); a power of two on WebGL 1, which
      // needs one for mipmaps (or with the "pot" flag: see texMode).
      const want = Math.round(this.vb.w * frame.k * dpr * 1.3);
      const tm = texMode();
      const npot = this.webgl2 && tm !== "pot";
      const cap = touch ? 2048 : tm === "npot2048" && this.depth.lensZoom() <= 1.01 ? Math.min(2048, maxTex) : maxTex;
      const side = Math.min(cap, npot ? want : pot(want));
      this.texSide = side;
      // Pictures of the chart at rest (focus painted off, fades finished).
      // Each is kept with what drew it: the same markup and styles again
      // (reopening 3D, a rebuild that changed only the tubes), and the one on
      // the GPU is used as it is.
      const offPlate = (el: Element) => el.matches(OFF_PLATE);
      const pics = this.hooks.rest(() => {
        settleAnimations(this.base);
        const style = styleSig(this.base);
        const plateSig = `${side}|${frame.k}|${this.vb.x},${this.vb.y},${this.vb.w},${this.vb.h}|${style}|${markupOf([this.base], offPlate)}`;
        const keep = Boolean(this.chartTex) && plateSig === this.plateSig;
        const chart = keep ? null : renderLayer(this.base, [this.base], offPlate, this.vb, side, frame.k, null, { ignoreHidden: true });
        this.readColors();
        this.readSprites();
        this.readTubes(frame.k);
        this.readTicks();
        return { chart, keep, plateSig, atlas: this.drawAtlas(frame.k, dpr, style) };
      });
      if (gen !== this.generation || !this.entered || (!pics.chart && !pics.keep)) return;
      if (pics.chart) {
        this.chartTex = uploadTexture(gl, pics.chart, { mipmaps: true, aniso: 8 }, this.chartTex);
        this.plateSig = pics.plateSig;
        releaseCanvas(pics.chart);
      }
      this.reuse = { plate: pics.keep, atlas: false, cells: pics.atlas?.copied ?? 0, of: pics.atlas?.cells.size ?? 0 };
      if (pics.atlas) {
        if (pics.atlas.canvas) {
          this.atlasTex = uploadTexture(gl, pics.atlas.canvas, { mipmaps: true, aniso: 4 }, this.atlasTex);
          this.atlasSig = pics.atlas.sig;
          releaseCanvas(pics.atlas.canvas);
        } else this.reuse.atlas = true;
        this.cells = pics.atlas.cells;
      }
      this.depth.scene.dataset.depthReuse = `${this.reuse.plate ? "plate" : "-"} ${this.reuse.atlas ? "atlas" : "-"} ${this.reuse.cells}/${this.reuse.of}`;
      this.buildStatic();
      for (const b of this.blocks.values()) {
        dropMesh(gl, b.top);
        dropMesh(gl, b.walls);
        b.top = null;
        b.walls = null;
      }
      this.frame = frame;
      this.builtK = frame.k;
      this.builtDpr = dpr;
      this.lastBuildMs = performance.now() - t0;
      this.depth.scene.dataset.depthBuildMs = String(Math.round(this.lastBuildMs));
      // On stage: the canvas over the (now invisible) live chart.
      const canvas = this.canvas as HTMLCanvasElement;
      if (!canvas.isConnected) this.depth.scene.appendChild(canvas);
      canvas.style.visibility = "";
      if (this.base.getAttribute("data-view3d") !== "gl") this.revealOnDraw = true;
      this.ready = true;
      this.dirty = true;
      if (first) {
        const cam = this.depth.getCamera() ?? { ...CAMERA_DEFAULT };
        if (this.reduced()) {
          this.depth.setCamera(cam);
          settle(this.t, 1);
        } else {
          this.depth.setCamera(cam, SPRINGS.view);
          aim(this.t, 1, SPRINGS.view);
        }
      }
      this.depth.kick();
      this.hooks.rebuilt?.();
    } finally {
      this.building = false;
      this.reading = false;
      if (this.again && this.entered) {
        const first = this.againFirst;
        this.again = false;
        this.againFirst = false;
        void this.build(first);
      }
    }
  }

  /** A CSS colour as RGB, resolved once per build. */
  private rgb(css: string, host: Element = this.depth.scene): RGB {
    const key = host === this.depth.scene ? css : "";
    const hit = key ? this.rgbCache.get(key) : undefined;
    if (hit) return hit;
    const c = resolveRGB(host, css);
    if (key) this.rgbCache.set(key, c);
    return c;
  }

  /** Colours of the solid parts, read from the page's theme. */
  private readColors() {
    this.rgbCache.clear();
    // The theme's 3D tokens (styles.css --gl-*): on the light theme the sides
    // stay pale, the edge is cream, shadows are warm and soft.
    const cs = getComputedStyle(this.depth.scene);
    const pair = (name: string, fallback: [number, number]): [number, number] => {
      const v = cs.getPropertyValue(name).trim().split(/\s+/).map(Number);
      return v.length >= 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]) ? [v[0], v[1]] : fallback;
    };
    this.colors.shadeWall = pair("--gl-shade-wall", [0.5, 0.56]);
    this.colors.shadeTube = pair("--gl-shade-tube", [0.46, 0.62]);
    const k = Number.parseFloat(cs.getPropertyValue("--gl-shadow-k"));
    this.colors.shadowK = Number.isFinite(k) ? k : 1;
    this.colors.shadow = this.rgb("var(--depth-shadow-color, #000)");
    this.colors.halo = this.rgb("var(--color-halo)");
    this.colors.neutral = this.rgb("var(--gl-neutral, color-mix(in oklab, var(--color-fg) 24%, var(--color-bg-elevated)))");
    this.colors.edge = this.rgb("var(--gl-edge, color-mix(in oklab, var(--color-fg) 14%, var(--color-bg)))");
    this.colors.glass = this.rgb("var(--relief-glass)");
    // A sign's wall continues its colour strip as the flat chart shows it
    // (the colour at 92% over the card).
    this.colors.signs.clear();
    for (const g of this.base.querySelectorAll('g[data-kind="sign-band"]')) {
      const strip = g.querySelector('[data-kind="sign-color"]');
      const sign = g.getAttribute("data-sign");
      const fill = strip?.getAttribute("fill");
      if (sign) this.colors.signs.set(sign, this.rgb(fill ? `color-mix(in srgb, ${fill} 92%, var(--color-bg-elevated))` : "var(--color-fg-muted)"));
    }
    this.colors.decans.clear();
    for (const g of this.base.querySelectorAll<HTMLElement>('[data-kind="decan-glyph"]')) {
      const key = g.getAttribute("data-decan");
      if (key) this.colors.decans.set(key, this.rgb(`color-mix(in oklab, ${g.style.color || "var(--color-fg-muted)"} var(--gl-decan-keep, 70%), var(--relief-bg-wall))`));
    }
  }

  /**
   * The graduations, read off the chart (its bands, colours, and which it
   * shows at this size): one fin per degree, the longest mark where bands
   * meet, pulled a hair off the ring wall it stands against.
   */
  private readTicks() {
    const geo = this.geo;
    const out: { natal: Map<number, Fin & { rank: number }>; outer: Map<number, Fin & { rank: number }> } = { natal: new Map(), outer: new Map() };
    if (!geo) {
      this.fins = { natal: [], outer: [] };
      return;
    }
    const { cx, cy } = this.polar;
    const bgPlate = this.rgb("var(--color-bg-elevated)");
    const bgOuter = this.rgb("var(--color-bg)");
    // How much of the mark's colour a fin's sides keep (paler on cream).
    const fk = Number.parseFloat(getComputedStyle(this.depth.scene).getPropertyValue("--gl-fin-keep"));
    const finKeep = Number.isFinite(fk) ? Math.max(0, Math.min(1, fk)) : 0.45;
    const re = /M\s*([-\d.]+)[\s,]+([-\d.]+)\s*L\s*([-\d.]+)[\s,]+([-\d.]+)/g;
    for (const path of this.base.querySelectorAll<SVGPathElement>("path[data-kind^='tick-']")) {
      const spec = FIN[path.getAttribute("data-kind") ?? ""];
      if (!spec || getComputedStyle(path).display === "none") continue;
      const outer = Boolean(path.closest("[data-kind='outer-ring']"));
      // The flat mark's colour as it shows (its opacity over what is under it).
      const ink = this.rgb(path.getAttribute("stroke") || "var(--color-fg-muted)");
      const a = Math.max(0, Math.min(1, Number(path.getAttribute("opacity") ?? 1)));
      const bg = outer ? bgOuter : bgPlate;
      const color: RGB = [ink[0] * a + bg[0] * (1 - a), ink[1] * a + bg[1] * (1 - a), ink[2] * a + bg[2] * (1 - a)];
      // Their sides are quieter than the mark on top (a fence of dark posts
      // would shout on a light chart).
      const side: RGB = [color[0] * finKeep + bg[0] * (1 - finKeep), color[1] * finKeep + bg[1] * (1 - finKeep), color[2] * finKeep + bg[2] * (1 - finKeep)];
      const wall = outer ? geo.rOuter : geo.rDecanIn;
      const d = path.getAttribute("d") ?? "";
      re.lastIndex = 0;
      for (let m = re.exec(d); m; m = re.exec(d)) {
        const p = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
        if (p.some((n) => !Number.isFinite(n))) continue;
        const ends = [
          { x: p[0], y: p[1] },
          { x: p[2], y: p[3] },
        ].map((q) => {
          const r = Math.hypot(q.x - cx, q.y - cy) || 1;
          if (Math.abs(r - wall) > 0.6) return q;
          const k = (r + (outer ? FIN_GAP : -FIN_GAP)) / r;
          return { x: cx + (q.x - cx) * k, y: cy + (q.y - cy) * k };
        });
        const ang = Math.round(((Math.atan2(ends[0].y - cy, ends[0].x - cx) * 180) / Math.PI) * 20);
        const band = outer ? out.outer : out.natal;
        const had = band.get(ang);
        if (had && had.rank >= spec.rank) continue;
        band.set(ang, { x0: ends[0].x, y0: ends[0].y, x1: ends[1].x, y1: ends[1].y, w: spec.w, h: spec.h, color, side, rank: spec.rank });
      }
    }
    this.fins = { natal: [...out.natal.values()], outer: [...out.outer.values()] };
  }

  private houseAt(x: number, y: number): number | null {
    const geo = this.geo;
    if (!geo) return null;
    for (const h of geo.houses) if (inSector(this.polar, x, y, h.ecl0, h.ecl1, 0, 1e9)) return h.id;
    return null;
  }

  /** Planets and outer bodies: where they stand, and their springs (kept across rebuilds). */
  private readSprites() {
    const seen = new Set<string>();
    const cx = this.polar.cx;
    const cy = this.polar.cy;
    for (const el of this.base.querySelectorAll("[data-kind='planet'], [data-kind='transit']")) {
      const id = el.getAttribute("data-hl");
      const halo = el.querySelector(":scope > .ulune-wheel-halo");
      const x = num(halo, "cx");
      const y = num(halo, "cy");
      if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      seen.add(id);
      const rect = el.querySelector(":scope > rect");
      const labelAt = rect ? { x: num(rect, "x") + num(rect, "width") / 2, y: num(rect, "y") + num(rect, "height") / 2 } : null;
      const deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
      const wave = ((((180 - deg) % 360) + 360) % 360) / 360;
      const outer = el.getAttribute("data-kind") === "transit";
      const stem = this.rgb(`color-mix(in oklab, ${(el as HTMLElement).style.color || "var(--color-fg-muted)"} var(--gl-stem-keep, 60%), var(--gl-stem-base, var(--color-fg-muted)))`);
      const s = this.sprites.get(id);
      const key = focusKeyOf(el);
      if (s) {
        Object.assign(s, { el, key, x, y, wave, outer, stem, labelAt, house: outer ? null : this.houseAt(x, y) });
      } else {
        this.sprites.set(id, {
          id,
          el,
          key,
          outer,
          x,
          y,
          wave,
          house: outer ? null : this.houseAt(x, y),
          stem,
          labelAt,
          rise: makeSpring(0, EASE),
          scale: makeSpring(1, FADE),
          alpha: makeSpring(1, FADE),
          halo: makeSpring(0, FADE),
          sink: makeSpring(0, SINK),
          nowFoot: 0,
          nowZ: 0,
          nowSeen: -1,
          upDepth: 0,
          upScale: 1,
          upLabel: 1,
          cellsOf: null,
          glyphCell: null,
          labelCell: null,
        });
      }
    }
    for (const id of [...this.sprites.keys()]) if (!seen.has(id)) this.sprites.delete(id);
  }

  /** Aspects, receptions and pattern lines: the tubes and whom they join. */
  private readTubes(k: number) {
    const seen = new Set<string>();
    const add = (id: string, aspect: string | null, kind: Tube["kind"], line: Element, ends: string | null, host: Element, markAt: { x: number; y: number } | null) => {
      const [ea, eb] = (ends ?? "").split(" ");
      const end = (hl: string | undefined, x: number, y: number): End => ({ sprite: hl && this.sprites.has(hl) ? hl : null, x, y });
      // A line's ends: the two degrees it joins, carried as data (its own
      // x1…y2 stop short where its ends taper; a conjunction's yoke is a
      // path); a plain line's own ends otherwise.
      const coord = (n: string) => {
        const v = num(line, `data-${n}`);
        return Number.isFinite(v) ? v : num(line, n);
      };
      const x1 = coord("x1");
      const y1 = coord("y1");
      const x2 = coord("x2");
      const y2 = coord("y2");
      if (![x1, y1, x2, y2].every(Number.isFinite)) return;
      seen.add(id);
      // A tube is thick: the family's own colour (on cream the flat line's
      // deeper ink would make it heavy).
      const stroke = line.getAttribute("data-jewel") || line.getAttribute("stroke") || "var(--color-fg-muted)";
      const wAttr = (m: string) => Number(line.getAttribute(`data-w-${m}`) ?? line.getAttribute("stroke-width") ?? 1.5);
      // Opacities per theme: the light theme's are its own (data-ol-*).
      const day = document.documentElement.classList.contains("light");
      const oAttr = (m: string) =>
        Number((day ? line.getAttribute(`data-ol-${m}`) : null) ?? line.getAttribute(`data-o-${m}`) ?? line.getAttribute("opacity") ?? 0.7);
      const dashAttr = (line.getAttribute("stroke-dasharray") ?? "").split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
      const at = markAt;
      const data = {
        id,
        aspect,
        kind,
        key: kind === "aspect" ? focusKeyOf(line) : null,
        a: end(ea, x1, y1),
        b: end(eb, x2, y2),
        color: /currentcolor/i.test(stroke) ? this.rgb(stroke, host) : this.rgb(stroke),
        w: { base: wAttr("base"), lit: wAttr("lit"), dim: wAttr("dim") },
        o: { base: oAttr("base"), lit: oAttr("lit"), dim: oAttr("dim") },
        // (An odd pattern repeats twice, as SVG does.)
        dash: dashAttr.length >= 2 ? (dashAttr.length % 2 ? [...dashAttr, ...dashAttr] : dashAttr).map((n) => n / k) : null,
        markAt: at,
      };
      const t = this.tubes.get(id);
      if (t) Object.assign(t, data);
      else {
        const r3 = this.radius3d(data.w.base);
        this.tubes.set(id, {
          ...data,
          radius: makeSpring(r3, FADE),
          alpha: makeSpring(this.alpha3d(data.o.base, "base"), FADE),
          arch: makeSpring(0, EASE),
          mark: makeSpring(0, FADE),
          now: null,
          geo: null,
          upDepth: 0,
          cellsOf: null,
          markCell: null,
        });
      }
    };
    for (const g of this.base.querySelectorAll("g[data-aspect][data-hl]")) {
      const line = g.querySelector("[data-aspect-line]");
      const id = g.getAttribute("data-hl");
      if (line && id) add(id, g.getAttribute("data-aspect"), "aspect", line, g.getAttribute("data-ends"), g, markAtOf(g));
    }
    for (const g of this.base.querySelectorAll("[data-kind='reception']")) {
      const lines = g.querySelectorAll("line");
      const line = lines[1] ?? lines[0];
      const id = g.getAttribute("data-hl");
      if (line && id) add(id, null, "reception", line, g.getAttribute("data-ends"), g, null);
    }
    for (const line of this.base.querySelectorAll("[data-kind='cfg']")) {
      const id = line.getAttribute("data-hl") ?? `cfg:${line.getAttribute("data-ends")}`;
      add(id, null, "cfg", line, line.getAttribute("data-ends"), line, null);
    }
    for (const id of [...this.tubes.keys()]) if (!seen.has(id)) this.tubes.delete(id);
  }

  /** A tube's radius in 3D for a flat stroke of width `w` px: rounder, readable. */
  private radius3d(w: number): number {
    return 0.85 + 0.55 * w;
  }

  /** A tube's opacity in 3D for a flat stroke's opacity: a touch more solid. */
  private alpha3d(o: number, mode: "base" | "lit" | "dim"): number {
    if (mode === "lit") return 1;
    if (mode === "dim") return Math.max(0.12, o * 1.8);
    return Math.min(1, 0.22 + o * 0.9);
  }

  /** Draw the atlas: each planet's disc and glyph, its degree label, each aspect's mark. */
  private drawAtlas(k: number, dpr: number, style: string): Atlas | null {
    const jobs: CellJob[] = [];
    for (const el of this.base.querySelectorAll("[data-kind='planet'], [data-kind='transit']")) {
      const id = el.getAttribute("data-hl");
      const s = id ? this.sprites.get(id) : null;
      if (!id || !s) continue;
      const rect = el.querySelector(":scope > rect");
      const text = el.querySelector(":scope > text");
      const halo = el.querySelector(":scope > .ulune-wheel-halo");
      jobs.push({
        key: `g:${id}`,
        roots: [el],
        skip: (n) => n === rect || n === text || n === halo,
        box: { x: s.x - GLYPH_HALF, y: s.y - GLYPH_HALF, w: GLYPH_HALF * 2, h: GLYPH_HALF * 2 },
      });
      if (rect && text) {
        const b = turnedBox(rect);
        jobs.push({ key: `l:${id}`, roots: [rect, text], skip: () => false, box: { x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 } });
      }
    }
    // The marks are made only while they show (wheel-focus.ts): each is made
    // for its picture here and taken away after.
    const temps: Element[] = [];
    const marks = tempAspectMarks(
      this.base,
      [...this.tubes.values()].filter((t) => t.markAt).map((t) => t.id),
    );
    for (const t of this.tubes.values()) {
      if (!t.markAt) continue;
      const g = marks.get(t.id);
      if (!g) continue;
      temps.push(g);
      jobs.push({
        key: `m:${t.id}`,
        roots: [g],
        skip: () => false,
        force: (n) => n === g,
        box: { x: t.markAt.x - MARK_HALF, y: t.markAt.y - MARK_HALF, w: MARK_HALF * 2, h: MARK_HALF * 2 },
      });
    }
    try {
      return this.paintAtlas(jobs, k, dpr, style);
    } finally {
      for (const g of temps) g.remove();
    }
  }

  private paintAtlas(jobs: CellJob[], k: number, dpr: number, style: string): Atlas | null {
    if (!jobs.length) return null;
    const rho = Math.max(1.5, Math.min(5, k * dpr * 1.6));
    const PAD = 4;
    const W = 2048;
    let x = PAD;
    let y = PAD;
    let rowH = 0;
    const placed: { job: CellJob; x: number; y: number; w: number; h: number }[] = [];
    for (const job of jobs) {
      const w = Math.ceil(job.box.w * rho);
      const h = Math.ceil(job.box.h * rho);
      if (x + w + PAD > W) {
        x = PAD;
        y += rowH + PAD;
        rowH = 0;
      }
      placed.push({ job, x, y, w, h });
      x += w + PAD;
      rowH = Math.max(rowH, h);
    }
    const Hh = pot(y + rowH + PAD);
    const cellOf = (p: (typeof placed)[number]): Cell => ({ u0: (p.x + 0.5) / W, v0: (p.y + 0.5) / Hh, u1: (p.x + p.w - 0.5) / W, v1: (p.y + p.h - 0.5) / Hh, w: p.job.box.w, h: p.job.box.h });
    // What draws each cell: its markup, the styles, its size and place.
    const sigOf = placed.map((p) => {
      const b = p.job.box;
      return `${p.job.key}|${p.w}x${p.h}|${rho}|${k}|${b.x},${b.y},${b.w},${b.h}|${style}|${markupOf(p.job.roots, p.job.skip)}`;
    });
    const sigs: string[] = [String(Hh)];
    placed.forEach((p, i) => sigs.push(`${p.x},${p.y}`, sigOf[i]));
    const sig = sigs.join("\u0002");
    // The very atlas on the GPU already (reopening 3D on the same chart): nothing to draw.
    if (this.atlasTex && sig === this.atlasSig) {
      const cells = new Map<string, Cell>();
      for (const p of placed) cells.set(p.job.key, cellOf(p));
      return { canvas: null, cells, sig, copied: placed.length };
    }
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = Hh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const cells = new Map<string, Cell>();
    // A cell drawn from the same markup, styles, size and place as one of the
    // last atlas is not drawn again: its own picture is placed as it was.
    const next = new Map<string, HTMLCanvasElement>();
    let copied = 0;
    for (const [i, p] of placed.entries()) {
      const sig = sigOf[i];
      let c = cellsPrev.get(sig) ?? null;
      if (c) copied += 1;
      else {
        try {
          c = renderLayer(this.base, p.job.roots, p.job.skip, p.job.box, p.w, k, null, { ignoreHidden: true, force: p.job.force });
        } catch {
          c = null;
        }
      }
      if (!c) continue;
      ctx.drawImage(c, 0, 0, c.width, c.height, p.x, p.y, p.w, p.h);
      next.set(sig, c);
      cells.set(p.job.key, cellOf(p));
    }
    for (const [key, c] of cellsPrev) if (next.get(key) !== c) releaseCanvas(c);
    cellsPrev = next;
    return { canvas, cells, sig, copied };
  }

  /** The chart's body: the plate, its edge, the zodiac ring, a bi-wheel's outer ring. */
  private buildStatic() {
    const gl = this.gl;
    const geo = this.geo;
    if (!gl || !geo) return;
    const p = this.polar;
    const m = this.meshes;
    // The same chart (a rebuild for the time, a filter, a font): the solids stand as they are.
    const key = JSON.stringify([this.vb, p, geo.rDecanIn, geo.rOuter, geo.outer, this.colors.edge, this.colors.neutral, [...this.colors.signs], this.fins]);
    if (key === this.staticKey && m.plate && m.slab && m.ringTop && m.ringWalls) return;
    this.staticKey = key;
    m.plate = makeMesh(gl, rectTop(this.vb.x, this.vb.y, this.vb.w, this.vb.h), 3, m.plate);
    const rBase = geo.outer ? geo.outer.rOut : geo.rOuter;
    m.slab = makeMesh(gl, sectorWalls(p, 0, 360, 0, rBase, { outer: this.colors.edge }, 2), 9, m.slab);
    m.ringTop = makeMesh(gl, sectorTop(p, 0, 360, geo.rDecanIn, geo.rOuter, 1.5), 3, m.ringTop);
    const walls: number[] = [...sectorWalls(p, 0, 360, geo.rDecanIn, geo.rOuter, { inner: this.colors.neutral }, 2)];
    const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
    SIGNS.forEach((sign, i) => {
      walls.push(...sectorWalls(p, i * 30, i * 30 + 30, geo.rDecanIn, geo.rOuter, { outer: this.colors.signs.get(sign) ?? this.colors.neutral }, 2));
    });
    m.ringWalls = makeMesh(gl, new Float32Array(walls), 9, m.ringWalls);
    m.finsNatal = makeMesh(gl, finMesh(this.fins.natal), 9, m.finsNatal);
    m.finsOuter = makeMesh(gl, finMesh(this.fins.outer), 9, m.finsOuter);
    if (geo.outer) {
      m.outerTop = makeMesh(gl, sectorTop(p, 0, 360, geo.outer.rIn, geo.outer.rOut, 1.5), 3, m.outerTop);
      // (Its inner side lies against the zodiac's wall, which stands taller.)
      m.outerWalls = makeMesh(gl, sectorWalls(p, 0, 360, geo.outer.rIn, geo.outer.rOut, { outer: this.colors.neutral }, 2), 9, m.outerWalls);
    } else {
      dropMesh(gl, m.outerTop);
      dropMesh(gl, m.outerWalls);
      m.outerTop = null;
      m.outerWalls = null;
    }
  }

  private blockShape(id: string): { ecl0: number; ecl1: number; r0: number; r1: number; onRing: boolean; color: RGB } | null {
    const geo = this.geo;
    if (!geo) return null;
    const sep = id.indexOf(":");
    const kind = id.slice(0, sep);
    const key = id.slice(sep + 1);
    const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
    if (kind === "sign") {
      const i = SIGNS.indexOf(key);
      if (i < 0) return null;
      return { ecl0: i * 30, ecl1: i * 30 + 30, r0: geo.rSignIn, r1: geo.rOuter, onRing: true, color: this.colors.signs.get(key) ?? this.colors.neutral };
    }
    if (kind === "decan") {
      const dash = key.lastIndexOf("-");
      const i = SIGNS.indexOf(key.slice(0, dash));
      const face = Number(key.slice(dash + 1));
      if (i < 0 || !(face >= 0 && face <= 2)) return null;
      const e0 = i * 30 + face * 10;
      return { ecl0: e0, ecl1: e0 + 10, r0: geo.rDecanIn, r1: geo.rSignIn, onRing: true, color: this.colors.decans.get(key) ?? this.colors.neutral };
    }
    if (kind === "house") {
      const h = geo.houses.find((x) => String(x.id) === key);
      if (!h) return null;
      return { ecl0: h.ecl0, ecl1: h.ecl1, r0: geo.rAspect, r1: geo.rDecanIn, onRing: false, color: this.colors.glass };
    }
    return null;
  }

  private ensureBlockMeshes(b: Block) {
    const gl = this.gl;
    if (!gl || b.top) return;
    const shape = this.blockShape(b.id);
    if (!shape) return;
    b.top = makeMesh(gl, sectorTop(this.polar, shape.ecl0, shape.ecl1, shape.r0, shape.r1, 1.5), 3);
    b.walls = makeMesh(gl, sectorWalls(this.polar, shape.ecl0, shape.ecl1, shape.r0, shape.r1, { outer: shape.color, inner: shape.color, sides: shape.color }, 1.5), 9);
  }

  private dropGL() {
    const gl = this.gl;
    if (gl && !gl.isContextLost()) {
      for (const mesh of Object.values(this.meshes)) dropMesh(gl, mesh);
      for (const b of this.blocks.values()) {
        dropMesh(gl, b.top);
        dropMesh(gl, b.walls);
      }
      if (this.chartTex) gl.deleteTexture(this.chartTex);
      if (this.atlasTex) gl.deleteTexture(this.atlasTex);
      if (this.progs) for (const p of Object.values(this.progs)) gl.deleteProgram(p.prog);
      this.inst?.destroy();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    for (const b of this.blocks.values()) {
      b.top = null;
      b.walls = null;
    }
    this.meshes = {};
    this.inst = null;
    this.staticKey = "";
    this.chartTex = null;
    this.plateSig = "";
    this.atlasTex = null;
    this.atlasSig = "";
    this.progs = null;
    this.gl = null;
    if (this.canvas) {
      this.canvas.removeEventListener("webglcontextlost", this.onLost);
      this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
      this.canvas.remove();
      this.canvas.width = 0;
      this.canvas.height = 0;
    }
    this.canvas = null;
    this.ready = false;
  }

  private teardown() {
    window.clearTimeout(this.rebuildTimer);
    window.clearTimeout(this.sizeTimer);
    if (this.open) {
      this.open = false;
      openViews -= 1;
    }
    this.park();
    this.sprites.clear();
    this.tubes.clear();
    this.blocks.clear();
    this.pend.length = 0;
    this.upright.length = 0;
    this.raised.length = 0;
    if (this.watchingFonts) {
      document.fonts.removeEventListener("loadingdone", this.onFonts);
      this.watchingFonts = false;
    }
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    this.themeObs?.disconnect();
    this.themeObs = null;
    this.zoomObs?.disconnect();
    this.zoomObs = null;
    this.base.removeAttribute("data-view3d");
    delete this.depth.scene.dataset.depthGl;
    this.offLoop?.();
    this.offLoop = null;
  }

  // ─── focus ────────────────────────────────────────────────────────────

  /**
   * The chart's focus: what it is, what the ranking involves (with tiers), the
   * aspects' ranks, and whether it is pinned (only a pin raises anything: a
   * hover lights things in place). Worked out from the focus itself: the
   * hidden live chart is not painted for the view to read back.
   */
  setFocus(f: WheelFocus, ranked: Map<string, Ranked>, aspects: Map<string, AspectRank> = new Map(), pinned = false) {
    this.focus = f;
    this.applyFocus(f, f.id, ranked, aspects, pinned);
  }

  /** The focus `f` (null: none), `exact` the id it centres on (null: none, as the view closes). */
  private applyFocus(f: WheelFocus | null, exact: string | null, ranked: Map<string, Ranked>, aspects: Map<string, AspectRank>, pinned: boolean) {
    const d = this.size();
    const reduce = this.reduced();
    const now = performance.now();
    const go = (s: Spring, v: number, p: SpringParams, delay = 0) => {
      if (reduce) settle(s, v);
      else aim(s, v, p, now, delay);
    };
    const kind = f?.kind ?? "";
    const exactId = f?.id ?? null;
    // The ripple's centre: the focus itself when it is a body.
    const centre = exact ? this.sprites.get(exact) : undefined;
    const angleOf = (sp: Sprite) => Math.atan2(sp.y - this.polar.cy, sp.x - this.polar.cx);
    const wasPinned = this.lastPinned;
    this.lastPinned = Boolean(kind) && pinned;
    for (const s of this.sprites.values()) {
      const inFocus = f ? inWheelFocus(s.key, f) : false;
      const isExact = Boolean(exactId) && s.key.hl === exactId;
      // (Its resting opacity is in its picture already.)
      const baseO = Number((s.el as HTMLElement).style?.getPropertyValue("--wheel-base-o") || 1) || 1;
      // The flat chart's focus paint: what is not in focus steps back.
      const dim = (kind === "natal" && !inFocus) || (kind === "transit" && s.outer && !inFocus);
      // Everything the focus leaves out sinks toward the plate (fully on a
      // pin, partway on a hover), so the focus and its partners stand clear.
      const tier = ranked.get(s.id)?.tier;
      const involved = tier != null || inFocus;
      const sinkTo = !kind || involved ? 0 : pinned ? 1 : HOVER_SINK;
      // (Depth separates it now: it steps back less than it used to fade.)
      go(s.alpha, dim ? SUNK_ALPHA / baseO : 1, FADE);
      go(s.scale, inFocus && kind ? 1.1 : sinkTo > 0 ? 0.94 : 1, FADE);
      go(s.halo, isExact ? 0.65 : 0, FADE);
      const rise = pinned && tier != null ? SPRITE_RISE[tier] * d : 0;
      const up = rise > s.rise.x + 0.5;
      go(s.rise, rise, EASE, up && tier != null ? STAGGER_MS[tier] : 0);
      if (Math.abs(sinkTo - s.sink.target) > 1e-3) {
        let delay = 0;
        if (sinkTo > s.sink.target) {
          // Sinking: after the pointer rests (hover) or the focus has started
          // up (pin), rippling out from the focus.
          const deg = centre ? Math.abs(((((angleOf(s) - angleOf(centre)) * 180) / Math.PI + 540) % 360) - 180) : 0;
          delay = (pinned ? SINK_DELAY.pinned : SINK_DELAY.hover) + Math.min(SINK_RIPPLE.max, deg * SINK_RIPPLE.perDeg);
        } else if (!kind && !wasPinned) {
          // A hover let go: wait a moment, in case the next one is right there.
          delay = SINK_DELAY.leave;
        }
        go(s.sink, sinkTo, SINK, delay);
      }
    }
    for (const t of this.tubes.values()) {
      // Lit: in the focus, or one of the focus's own aspects.
      const on = t.kind === "aspect" && f ? (t.key ? inWheelFocus(t.key, f) : false) || (Boolean(exact) && t.aspect != null && f.aspects.has(t.aspect)) : false;
      const mode: "base" | "lit" | "dim" = !kind ? "base" : on ? "lit" : t.kind === "cfg" ? "base" : "dim";
      const rank = t.aspect ? aspects.get(t.aspect) : undefined;
      const s = rank?.strength ?? 0.5;
      const pin = pinned && on && rank != null && rank.tier < 2;
      go(t.radius, this.radius3d(t.w[mode]) * (pin ? 1 + 0.3 * s : 1), FADE);
      go(t.alpha, this.alpha3d(t.o[mode], mode), FADE);
      go(t.arch, pin ? ARCH * d * (0.4 + 0.6 * s) : 0, EASE, pin ? 90 + 40 * Math.min(rank?.order ?? 0, 8) : 0);
      go(t.mark, on && exact ? 1 : 0, FADE);
    }
    this.syncBlocks(ranked, pinned, now);
    this.dirty = true;
    this.depth.kick();
  }

  /** Signs, houses and decans of the focus: raised when pinned, lit in place on hover. */
  private syncBlocks(ranked: Map<string, Ranked>, pinned: boolean, now: number) {
    const d = this.size();
    const reduce = this.reduced();
    const want = new Map<string, Tier>();
    if (this.entered) {
      for (const [id, r] of ranked) {
        if (!/^(sign|house|decan):/.test(id)) continue;
        if (!pinned && r.tier === 2) continue;
        want.set(id, r.tier);
      }
    }
    let n = 0;
    for (const [id, tier] of want) {
      let b = this.blocks.get(id);
      if (!b) {
        const shape = this.blockShape(id);
        if (!shape) continue;
        b = { id, ...shape, top: null, walls: null, tier, rise: makeSpring(0, EASE), glow: makeSpring(0, FADE), z0: 0, z1: 0 };
        this.blocks.set(id, b);
      }
      b.tier = tier;
      const rise = pinned ? BLOCK_RISE[tier] * d : 0;
      const delay = STAGGER_MS[tier] + (tier === 2 ? 22 * Math.min(n++, 8) : 0);
      const glow = pinned ? (tier === 0 ? 0.5 : tier === 2 ? 0.45 : 0) : tier === 0 ? 1 : 0.6;
      if (reduce) {
        settle(b.rise, rise);
        settle(b.glow, glow);
      } else {
        const up = rise > b.rise.x + 0.5;
        aim(b.rise, rise, EASE, now, up ? delay : 0);
        aim(b.glow, glow, FADE);
      }
    }
    for (const b of this.blocks.values()) {
      if (want.has(b.id)) continue;
      if (reduce) {
        settle(b.rise, 0);
        settle(b.glow, 0);
      } else {
        aim(b.rise, 0, EASE);
        aim(b.glow, 0, FADE);
      }
    }
  }

  // ─── frame ────────────────────────────────────────────────────────────

  /** Advance a spring; note whether it moved (one still waiting on its delay keeps the loop going, but draws nothing new). */
  private adv(s: Spring, dt: number, now: number): boolean {
    const x = s.x;
    const busy = stepSpring(s, dt, now);
    if (s.x !== x) this.moved = true;
    return busy;
  }

  private step(now: number, dt: number): boolean {
    this.moved = false;
    let busy = this.adv(this.t, dt, now);
    for (const s of this.sprites.values()) {
      busy = this.adv(s.rise, dt, now) || busy;
      busy = this.adv(s.scale, dt, now) || busy;
      busy = this.adv(s.alpha, dt, now) || busy;
      busy = this.adv(s.halo, dt, now) || busy;
      busy = this.adv(s.sink, dt, now) || busy;
    }
    for (const t of this.tubes.values()) {
      busy = this.adv(t.radius, dt, now) || busy;
      busy = this.adv(t.alpha, dt, now) || busy;
      busy = this.adv(t.arch, dt, now) || busy;
      busy = this.adv(t.mark, dt, now) || busy;
    }
    for (const b of [...this.blocks.values()]) {
      busy = this.adv(b.rise, dt, now) || busy;
      busy = this.adv(b.glow, dt, now) || busy;
      if (b.rise.target === 0 && b.glow.target === 0 && b.rise.x <= 0.05 && b.glow.x <= 0.005) {
        if (this.gl) {
          dropMesh(this.gl, b.top);
          dropMesh(this.gl, b.walls);
        }
        this.blocks.delete(b.id);
      }
    }
    if (!this.entered && this.t.x <= 0.001 && this.t.target === 0) {
      settle(this.t, 0);
      this.teardown();
      const done = this.exitDone;
      this.exitDone = null;
      done?.();
      return false;
    }
    const cam = this.depth.sceneState();
    const camKey = `${cam.rx.toFixed(3)}|${cam.rz.toFixed(3)}|${cam.width}|${cam.height}|${(cam.zoom ?? 1).toFixed(4)}|${(cam.panX ?? 0).toFixed(2)}|${(cam.panY ?? 0).toFixed(2)}`;
    if (camKey !== this.lastCam) {
      this.lastCam = camKey;
      this.dirty = true;
    }
    // Labels fade out of each other's way (targets from the last frame drawn;
    // dt is in seconds: about 120 ms to get most of the way).
    const ease = 1 - Math.exp(-dt / 0.12);
    for (const [id, target] of this.labelTarget) {
      const v = this.labelFade.get(id) ?? 1;
      if (Math.abs(target - v) > 0.01) {
        this.labelFade.set(id, v + (target - v) * ease);
        this.moved = true;
        busy = true;
      } else if (v !== target) {
        this.labelFade.set(id, target);
        this.dirty = true;
      }
    }
    if (this.moved) this.dirty = true;
    if (this.dirty) this.render();
    return busy;
  }

  /** Heights now (units): the surface each thing stands on (one object, filled again each time). */
  private layout(): Layout {
    const f = this.frame;
    const d = this.size();
    const k = f?.k || 1;
    const t = this.progress();
    const tRing = stage(t, 0.04);
    const L = this.lay;
    L.houseTop.clear();
    for (const b of this.blocks.values()) {
      if (b.id.startsWith("house:")) L.houseTop.set(Number(b.id.slice(6)), (Math.max(0, b.rise.x) * t) / k);
    }
    L.t = t;
    L.k = k;
    L.tRing = tRing;
    L.tLink = stage(t, 0.1, 0.85);
    L.zodiac = (H.zodiac * d * tRing) / k;
    L.outer = ((this.geo?.outer ? H.outer : H.zodiac) * d * tRing) / k;
    L.rim = (H.rim * d * tRing) / k;
    return L;
  }

  /** The surface a sprite's stem stands on now (units). */
  private footOf(s: Sprite, L: Layout): number {
    return s.outer ? L.outer : s.house != null ? (L.houseTop.get(s.house) ?? 0) : 0;
  }

  /** Where a sprite floats now (units), over its foot; `sink` as it stands (or at rest: 0). */
  private floatZ(s: Sprite, L: Layout, foot: number, sink = s.sink.x): number {
    const d = this.size();
    const lift = stage(L.t, 0.08 + 0.2 * s.wave, 0.62 + 0.2 * s.wave);
    const sunk = 1 - SINK_DEPTH * Math.max(0, Math.min(1, sink));
    return foot + ((s.outer ? H.outerBody : H.body) * d * lift * sunk + Math.max(0, s.rise.x) * L.t) / L.k;
  }

  /** Where a sprite's foot and centre are now (units), for QA. */
  private spriteAt(s: Sprite, L: Layout, sink = s.sink.x): { foot: number; z: number } {
    const foot = this.footOf(s, L);
    return { foot, z: this.floatZ(s, L, foot, sink) };
  }

  /**
   * Size the drawing buffer for the stage: exactly, at rest. While the stage
   * is being resized (a panel sliding open), in 64 px steps, so it is not
   * reallocated every frame; exactly again once the size has settled.
   */
  private fitBuffer(canvas: HTMLCanvasElement, w: number, h: number) {
    if (canvas.width === w && canvas.height === h) return;
    const now = performance.now();
    const resizing = now - this.sizedAt < 200;
    this.sizedAt = now;
    if (!resizing) {
      canvas.width = w;
      canvas.height = h;
      return;
    }
    window.clearTimeout(this.sizeTimer);
    this.sizeTimer = window.setTimeout(() => {
      this.dirty = true;
      this.depth.kick();
    }, 250);
    const fits = canvas.width >= w && canvas.height >= h && canvas.width - w < 128 && canvas.height - h < 128;
    if (fits) return;
    canvas.width = Math.min(4096, Math.ceil(w / 64) * 64);
    canvas.height = Math.min(4096, Math.ceil(h / 64) * 64);
  }

  private render() {
    this.dirty = false;
    const gl = this.gl;
    const progs = this.progs;
    const frame = this.frame ?? this.measure();
    const canvas = this.canvas;
    if (!gl || !progs || !frame || !canvas || !this.ready || this.lost || gl.isContextLost()) return;
    // Follow the stage: the live frame (a panel opened) and the canvas size.
    const live = this.measure();
    if (live) this.frame = live;
    const f = this.frame as ChartFrame;
    const scene = this.depth.scene;
    const W = scene.clientWidth;
    const Hh = scene.clientHeight || W;
    if (!W || !Hh) return;
    const dpr = this.dpr();
    this.fitBuffer(canvas, Math.max(1, Math.min(4096, Math.round(W * dpr))), Math.max(1, Math.min(4096, Math.round(Hh * dpr))));
    // (The buffer can be a step larger than the stage while it is resized: the picture fills it all the same.)
    const bw = canvas.width;
    const bh = canvas.height;
    // Pictures drawn for another resolution (the page zoomed, the lens moved in): draw them again once it settles.
    const texDpr = this.texDpr();
    if (Math.abs(texDpr / (this.builtDpr || texDpr) - 1) > 0.34) this.later(300);
    const st = this.depth.sceneState();
    const vp = { x: 0, y: 0, w: W, h: Hh };
    const clip = clipMatrix(st, f, vp, 0.9 * W, -1.3 * W);
    const mvp = toGL(clip, this.mvp32);
    const nrm = normalGL(rotation(st), this.nrm32);
    const axes = cameraAxes(st);
    const L = this.layout();
    const t = L.t;
    const k = L.k;
    gl.viewport(0, 0, bw, bh);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    this.draws = 0;
    this.calls = 0;
    const m = this.meshes;
    const geo = this.geo;
    const uvmap = this.uvmap32;
    uvmap[0] = 1 / this.vb.w;
    uvmap[1] = 1 / this.vb.h;
    uvmap[2] = -this.vb.x / this.vb.w;
    uvmap[3] = -this.vb.y / this.vb.h;

    // ── solids: the chart's edge, the rings' walls, raised blocks' walls ──
    const wall = progs.wall;
    gl.useProgram(wall.prog);
    gl.uniformMatrix4fv(wall.u.u_mvp, false, mvp);
    gl.uniformMatrix3fv(wall.u.u_nrm, false, nrm);
    gl.uniform3fv(wall.u.u_light, LIGHT);
    gl.uniform3f(wall.u.u_tint, 1, 1, 1);
    gl.uniform1f(wall.u.u_alpha, 1);
    gl.uniform1f(wall.u.u_lit, t);
    gl.uniform2f(wall.u.u_shade, this.colors.shadeWall[0], this.colors.shadeWall[1]);
    const drawWalls = (mesh: Mesh | null | undefined, z0: number, z1: number) => {
      if (!mesh || Math.abs(z1 - z0) < 1e-3) return;
      bindMesh(gl, wall, mesh, WALL_LAYOUT);
      gl.uniform2f(wall.u.u_z, z0, z1);
      // A grounding band at its foot: about 6 units, never past 40% of it.
      gl.uniform1f(wall.u.u_ground, Math.min(GROUND_BAND, 0.4 * Math.abs(z1 - z0)));
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      this.draws += 1;
      this.calls += 1;
    };
    drawWalls(m.slab, -L.rim, 0);
    drawWalls(m.ringWalls, 0, L.zodiac);
    if (geo?.outer) drawWalls(m.outerWalls, 0, L.outer);
    const raised = this.raised;
    raised.length = 0;
    for (const b of this.blocks.values()) {
      const base = b.onRing ? L.zodiac : 0;
      const top = base + (Math.max(0, b.rise.x) * t) / k;
      if (top - base > 0.05 || b.glow.x > 0.004) {
        this.ensureBlockMeshes(b);
        b.z0 = base;
        b.z1 = top;
        raised.push(b);
      }
      if (top - base > 0.05) drawWalls(b.walls, base, top);
    }
    unbindAttribs(gl, wall);

    // ── faces carrying the chart's picture ──
    const top = progs.top;
    gl.useProgram(top.prog);
    gl.uniformMatrix4fv(top.u.u_mvp, false, mvp);
    gl.uniform4fv(top.u.u_uvmap, uvmap);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.chartTex);
    gl.uniform1i(top.u.u_tex, 0);
    gl.uniform1f(top.u.u_useTex, 1);
    gl.uniform1f(top.u.u_alpha, 1);
    const drawTop = (mesh: Mesh | null | undefined, z: number) => {
      if (!mesh) return;
      bindMesh(gl, top, mesh, TOP_LAYOUT);
      gl.uniform2f(top.u.u_z, z, z);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      this.draws += 1;
      this.calls += 1;
    };
    drawTop(m.plate, 0);
    drawTop(m.ringTop, L.zodiac);
    if (geo?.outer) drawTop(m.outerTop, L.outer);
    for (const b of raised) if (b.z1 - b.z0 > 0.05) drawTop(b.top, b.z1);

    // ── graduations: solid fins standing on their surfaces (flat marks at
    //    first, growing with the rings) ──
    gl.useProgram(wall.prog);
    const drawFins = (mesh: Mesh | null | undefined, z0: number, tall: number) => {
      const fin = (tall * this.size() * L.tRing) / k;
      if (!mesh) return;
      bindMesh(gl, wall, mesh, WALL_LAYOUT);
      gl.uniform2f(wall.u.u_z, z0, z0 + fin);
      gl.uniform1f(wall.u.u_ground, 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      this.draws += 1;
      this.calls += 1;
    };
    drawFins(m.finsNatal, 0.04, H.tick);
    if (geo?.outer) drawFins(m.finsOuter, L.outer + 0.04, H.outerTick);
    unbindAttribs(gl, wall);

    // ── stems (opaque tubes) ──
    // Instanced (WebGL 2): the tubes gather into a list, drawn in the same
    // order in one draw per run of a mesh; otherwise each is a draw.
    const I = this.inst;
    const tube = progs.tube;
    const TL = this.tubeList;
    TL.clear();
    this.tubeMeshes[0] = m.tube;
    this.tubeMeshes[1] = m.pill;
    const tubeProg = I ? I.tube : tube;
    gl.useProgram(tubeProg.prog);
    gl.uniformMatrix4fv(tubeProg.u.u_mvp, false, mvp);
    gl.uniformMatrix3fv(tubeProg.u.u_nrm, false, nrm);
    gl.uniform3fv(tubeProg.u.u_light, LIGHT);
    gl.uniform1f(tubeProg.u.u_lit, t);
    gl.uniform2f(tubeProg.u.u_shade, this.colors.shadeTube[0], this.colors.shadeTube[1]);
    // Tubes are closed: only their outside is drawn (a see-through tube would
    // otherwise show its far wall through the near one).
    gl.enable(gl.CULL_FACE);
    gl.cullFace(TUBE_CULL);
    const flushTubes = () => {
      if (!I || !TL.n) return;
      this.calls += I.drawTubes(TL, this.tubeMeshes);
      TL.clear();
    };
    /** One tube (its curve a → c → b, units), solid or dashed. */
    const drawTube = (a: Float64Array, c: Float64Array, b: Float64Array, r: number, color: RGB, alpha: number, g: TubeGeo | null) => {
      if (!m.tube || !m.pill || alpha < 0.004 || r <= 0) return;
      // (A stem has no shape kept: worked out here, as for a tube's.)
      const len = g ? g.len : bezierLengthOf(a, c, b, 8);
      if (len < 1e-3 && Math.abs(a[2] - b[2]) < 1e-3) return;
      let bn: Float32Array = this.bn32;
      if (g) bn = g.bn;
      else tubeBinormalOf(a, c, b, bn);
      if (I) {
        if (!g || g.solid) {
          putTube(TL, 0, a, b, c, bn, r, alpha, color, 0, 1);
          this.draws += 1;
          return;
        }
        const u = g.ranges;
        for (let i = 0; i < g.count; i += 1) putTube(TL, 1, a, b, c, bn, r, alpha, color, u[2 * i], u[2 * i + 1]);
        this.draws += g.count;
        return;
      }
      gl.uniform3f(tube.u.u_a, a[0], a[1], a[2]);
      gl.uniform3f(tube.u.u_b, b[0], b[1], b[2]);
      gl.uniform3f(tube.u.u_c, c[0], c[1], c[2]);
      gl.uniform3fv(tube.u.u_bn, bn);
      gl.uniform1f(tube.u.u_r, r);
      gl.uniform3f(tube.u.u_color, color[0], color[1], color[2]);
      gl.uniform1f(tube.u.u_alpha, alpha);
      if (!g || g.solid) {
        bindMesh(gl, tube, m.tube, TUBE_LAYOUT);
        gl.uniform2f(tube.u.u_range, 0, 1);
        drawMesh(gl, m.tube);
        this.draws += 1;
        this.calls += 1;
        return;
      }
      // Dashed: each dash is a short solid capsule of its own (a hollow tube
      // cut open would show its inside through the gaps).
      bindMesh(gl, tube, m.pill, TUBE_LAYOUT);
      const u = g.ranges;
      for (let i = 0; i < g.count; i += 1) {
        gl.uniform2f(tube.u.u_range, u[2 * i], u[2 * i + 1]);
        drawMesh(gl, m.pill);
        this.draws += 1;
        this.calls += 1;
      }
    };
    const A = this.pa;
    const B = this.pb;
    const C = this.pc;
    for (const s of this.sprites.values()) {
      const foot = this.footOf(s, L);
      const z = this.floatZ(s, L, foot);
      s.nowFoot = foot;
      s.nowZ = z;
      s.nowSeen = this.frameNo;
      const h = z - foot;
      if (h > 0.3) {
        A[0] = s.x;
        A[1] = s.y;
        A[2] = foot;
        B[0] = s.x;
        B[1] = s.y;
        B[2] = z;
        C[0] = s.x;
        C[1] = s.y;
        C[2] = (A[2] + B[2]) / 2;
        drawTube(A, C, B, 0.9 / k, s.stem, Math.min(1, s.alpha.x) * stage(t, 0.05, 0.4), null);
      }
    }

    // ── aspects: tubes between the bodies they join ──
    const sceneM = chartToScene(st, f);
    const pend = this.pend;
    pend.length = 0;
    const dashScale = mixN(1, DASH_3D, L.tLink);
    for (const tb of this.tubes.values()) {
      const r2 = tb.w.base / 2 / k;
      const rNow = mixN(tb.w.base / 2 / k, Math.max(0, tb.radius.x) / k, L.tLink);
      const aNow = mixN(Math.min(1, tb.o.base), Math.max(0, Math.min(1, tb.alpha.x)), L.tLink);
      const z0 = Math.max(r2, rNow);
      const n = tb.now ?? (tb.now = { a: new Float64Array(3), b: new Float64Array(3), c: new Float64Array(3), mid: new Float64Array(3), r: 0, alpha: 0, depth: 0 });
      this.endAt(tb.a, z0, L, n.a);
      this.endAt(tb.b, z0, L, n.b);
      const h = (Math.max(0, tb.arch.x) * t) / k;
      n.c[0] = (n.a[0] + n.b[0]) / 2;
      n.c[1] = (n.a[1] + n.b[1]) / 2;
      n.c[2] = (n.a[2] + n.b[2]) / 2 + 2 * h;
      n.r = rNow;
      n.alpha = aNow;
      bezierInto(n.a, n.c, n.b, 0.5, n.mid);
      projectInto(sceneM, n.mid[0], n.mid[1], n.mid[2], PRJ);
      n.depth = PRJ[2];
      const g = this.tubeGeo(tb, n, dashScale);
      if (aNow >= 0.985) drawTube(n.a, n.c, n.b, rNow, tb.color, 1, g);
      else pend.push(tb);
    }
    flushTubes();
    // See-through tubes after the solid ones, farthest first, not hiding each other.
    gl.depthMask(false);
    sortTubesFar(pend);
    for (const tb of pend) {
      const n = tb.now as TubeNow;
      drawTube(n.a, n.c, n.b, n.r, tb.color, n.alpha, tb.geo);
    }
    flushTubes();
    if (!I) unbindAttribs(gl, tube);
    gl.disable(gl.CULL_FACE);

    // ── flat and upright quads: shadows, highlights, labels, planets, marks ──
    const quad = progs.quad;
    const quadProg = I ? I.quad : quad;
    const QL = this.quadList;
    QL.clear();
    gl.useProgram(quadProg.prog);
    gl.uniformMatrix4fv(quadProg.u.u_mvp, false, mvp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.uniform1i(quadProg.u.u_tex, 0);
    const sh = this.colors.shadow;
    gl.uniform3f(quadProg.u.u_shadow, sh[0], sh[1], sh[2]);
    if (I) {
      // (Shadows lie flat; the planets, labels and marks face you: set per batch.)
      gl.uniform3fv(I.quad.u.u_right, FLAT.right);
      gl.uniform3fv(I.quad.u.u_up, FLAT.up);
      gl.uniform3fv(I.quad.u.u_toward, FLAT.toward);
    } else if (m.quad) bindMesh(gl, quad, m.quad, QUAD_LAYOUT);
    const flushQuads = () => {
      if (!I || !QL.n) return;
      this.calls += I.drawQuads(QL, m.quad);
      QL.clear();
    };
    const drawQuad = (
      cx: number,
      cy: number,
      cz: number,
      halfW: number,
      halfH: number,
      axesOf: { right: Vec3; up: Vec3; toward: Vec3 },
      lift: number,
      alpha: number,
      cell: Cell | null,
      mode: number,
      halo: RGB | null,
      haloA: number,
      r0: number,
      r1: number,
      r2: number,
    ) => {
      if (!m.quad || alpha < 0.004 || (mode === 0 && !cell)) return;
      this.draws += 1;
      if (I) {
        putQuad(QL, cx, cy, cz, lift, halfW, halfH, cell, halo, haloA, r0, r1, r2, mode, alpha);
        return;
      }
      gl.uniform3f(quad.u.u_centre, cx, cy, cz);
      gl.uniform3fv(quad.u.u_right, axesOf.right);
      gl.uniform3fv(quad.u.u_up, axesOf.up);
      gl.uniform3fv(quad.u.u_toward, axesOf.toward);
      gl.uniform4f(quad.u.u_box, 0, 0, halfW, halfH);
      gl.uniform1f(quad.u.u_lift, lift);
      gl.uniform4f(quad.u.u_uv, cell?.u0 ?? 0, cell?.v0 ?? 0, cell?.u1 ?? 1, cell?.v1 ?? 1);
      gl.uniform1f(quad.u.u_mode, mode);
      gl.uniform1f(quad.u.u_alpha, alpha);
      if (halo) gl.uniform4f(quad.u.u_halo, halo[0], halo[1], halo[2], haloA);
      else gl.uniform4f(quad.u.u_halo, 0, 0, 0, 0);
      gl.uniform3f(quad.u.u_ring, r0, r1, r2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.calls += 1;
    };
    // Soft contact shadows where the stems stand: tight and darker under a
    // body close to the plate, wider and softer under a raised one — the
    // clearest cue for how high something floats.
    for (const s of this.sprites.values()) {
      const h = Math.max(0, (s.nowZ - s.nowFoot) / ((H.body * this.size()) / k || 1));
      const radius = 7 + 9 * Math.min(1.7, h);
      const strength = Math.max(0.5, Math.min(1.2, 1.25 - 0.25 * h));
      drawQuad(s.x, s.y, s.nowFoot, radius, radius, FLAT, 0.2, 0.3 * this.colors.shadowK * strength * s.alpha.x * stage(t, 0.05, 0.5), null, 1, null, 0, radius, 0, 0);
    }
    flushQuads();
    // The focus's signs, houses and decans, lit in place.
    if (!I) unbindAttribs(gl, quad);
    gl.useProgram(top.prog);
    gl.uniformMatrix4fv(top.u.u_mvp, false, mvp);
    gl.uniform4fv(top.u.u_uvmap, uvmap);
    gl.uniform1f(top.u.u_useTex, 0);
    const hc = this.colors.halo;
    for (const b of raised) {
      const g = Math.max(0, Math.min(1, b.glow.x));
      if (g < 0.004 || !b.top) continue;
      const a = 0.14 * g;
      gl.uniform4f(top.u.u_color, hc[0] * a, hc[1] * a, hc[2] * a, a);
      drawTop(b.top, b.z1 + 0.15 / k);
    }
    unbindAttribs(gl, top);
    gl.useProgram(quadProg.prog);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    if (I) {
      gl.uniform3fv(I.quad.u.u_right, axes.right);
      gl.uniform3fv(I.quad.u.u_up, axes.up);
      gl.uniform3fv(I.quad.u.u_toward, axes.toward);
    } else if (m.quad) bindMesh(gl, quad, m.quad, QUAD_LAYOUT);
    // Each planet with its degree label where the flat chart puts it (so
    // clustered planets keep their labels apart), at the planet's height and
    // facing you: when the chart is flat, exactly the flat chart.
    this.linkCells();
    const up = this.upright;
    up.length = 0;
    const fit = (st.scale ?? 1) * (st.zoom ?? 1);
    for (const s of this.sprites.values()) {
      projectInto(sceneM, s.x, s.y, s.nowZ, PRJ);
      const depth = PRJ[2];
      // Never too small to read: a far body on a small stage grows a little.
      const unitPx = (f.k * fit) / depth;
      s.upDepth = depth;
      s.upScale = Math.max(0.5, s.scale.x) * boost(2 * DISC_R * Math.max(0.5, s.scale.x), unitPx, MIN_GLYPH_PX);
      s.upLabel = s.labelCell ? boost(LABEL_TEXT * s.labelCell.h, unitPx, MIN_LABEL_PX) : 1;
      up.push(s);
    }
    this.declutterLabels(sceneM, fit, f.k);
    for (const tb of this.tubes.values()) {
      const n = tb.now;
      if (!tb.markCell || !n || tb.mark.x < 0.004) continue;
      projectInto(sceneM, n.mid[0], n.mid[1], n.mid[2], PRJ);
      tb.upDepth = PRJ[2];
      up.push(tb);
    }
    sortUprightFar(up);
    for (const u of up) {
      if (isSprite(u)) {
        const s = u;
        const sc = s.upScale;
        drawQuad(s.x, s.y, s.nowZ, GLYPH_HALF * sc, GLYPH_HALF * sc, axes, DISC_R + 2, s.alpha.x, s.glyphCell, 0, hc, Math.max(0, s.halo.x), DISC_R * sc, (0.9 / k) * sc, 0.45 * sc);
        const label = s.labelCell;
        if (label && s.labelAt) {
          const lb = s.upLabel;
          drawQuad(s.labelAt.x, s.labelAt.y, s.nowZ, (label.w / 2) * lb, (label.h / 2) * lb, axes, 3, s.alpha.x * (this.labelFade.get(s.id) ?? 1), label, 0, null, 0, 1, 0, 0);
        }
      } else {
        const n = u.now as TubeNow;
        drawQuad(n.mid[0], n.mid[1], n.mid[2], MARK_HALF, MARK_HALF, axes, MARK_HALF, u.mark.x, u.markCell, 0, null, 0, 1, 0, 0);
      }
    }
    flushQuads();
    if (!I) unbindAttribs(gl, quad);
    gl.depthMask(true);
    this.frameNo += 1;
    // The first picture is on the canvas: the live chart under it can go, in the same frame.
    if (this.revealOnDraw) {
      this.revealOnDraw = false;
      this.base.setAttribute("data-view3d", "gl");
    }
  }

  /** Where a tube's end is now (units), into `out`: its body's place as the tube rises to it. */
  private endAt(e: End, z0: number, L: Layout, out: Float64Array) {
    const s = e.sprite ? this.sprites.get(e.sprite) : undefined;
    if (!s || s.nowSeen !== this.frameNo) {
      out[0] = e.x;
      out[1] = e.y;
      out[2] = z0;
      return;
    }
    out[0] = mixN(e.x, s.x, L.tLink);
    out[1] = mixN(e.y, s.y, L.tLink);
    out[2] = mixN(z0, s.nowZ, L.tLink);
  }

  /**
   * A tube's shape: its length, the plane it bends in, and its dashes (as
   * stretches of the curve). Kept while its ends, bend, radius and dash
   * pattern stay put: a camera move reuses it all.
   */
  private tubeGeo(tb: Tube, n: TubeNow, dashScale: number): TubeGeo {
    const g = tb.geo ?? (tb.geo = { key: new Float64Array(11).fill(Number.NaN), dash: null, len: 0, bn: new Float32Array(3), solid: true, ranges: new Float64Array(0), count: 0 });
    const key = g.key;
    const { a, b, c } = n;
    if (
      g.dash === tb.dash &&
      key[0] === a[0] &&
      key[1] === a[1] &&
      key[2] === a[2] &&
      key[3] === b[0] &&
      key[4] === b[1] &&
      key[5] === b[2] &&
      key[6] === c[0] &&
      key[7] === c[1] &&
      key[8] === c[2] &&
      key[9] === n.r &&
      key[10] === dashScale
    )
      return g;
    key[0] = a[0];
    key[1] = a[1];
    key[2] = a[2];
    key[3] = b[0];
    key[4] = b[1];
    key[5] = b[2];
    key[6] = c[0];
    key[7] = c[1];
    key[8] = c[2];
    key[9] = n.r;
    key[10] = dashScale;
    g.dash = tb.dash;
    g.len = bezierLengthOf(a, c, b, 8);
    tubeBinormalOf(a, c, b, g.bn);
    g.solid = true;
    g.count = 0;
    if (!tb.dash) return g;
    const dash = tb.dash.map((x) => x * dashScale);
    const period = dash.reduce((sum, x) => sum + x, 0);
    if (period <= 0 || g.len < period) return g;
    g.solid = false;
    // The flat line's pattern, centred so both ends look alike: dashes are
    // capsules, dots are balls (their stretches of the curve, by length).
    const N = 32;
    const cum = new Float64Array(N + 1);
    let px = a[0];
    let py = a[1];
    let pz = a[2];
    for (let i = 1; i <= N; i += 1) {
      bezierInto(a, c, b, i / N, PT);
      cum[i] = cum[i - 1] + hypot3(PT[0] - px, PT[1] - py, PT[2] - pz);
      px = PT[0];
      py = PT[1];
      pz = PT[2];
    }
    const total = cum[N];
    const uAt = (d: number) => {
      let i = 1;
      while (i < N && cum[i] < d) i += 1;
      const fr = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
      return (i - 1 + Math.max(0, Math.min(1, fr))) / N;
    };
    const segs = dashSegments(total, dash, n.r);
    if (g.ranges.length < segs.length * 2) g.ranges = new Float64Array(segs.length * 2);
    for (let i = 0; i < segs.length; i += 1) {
      g.ranges[2 * i] = uAt(segs[i][0]);
      g.ranges[2 * i + 1] = uAt(segs[i][1]);
    }
    g.count = segs.length;
    return g;
  }

  /** Each sprite's and tube's cells in the atlas, found again when the atlas is. */
  private linkCells() {
    const cells = this.cells;
    for (const s of this.sprites.values()) {
      if (s.cellsOf === cells) continue;
      s.cellsOf = cells;
      s.glyphCell = cells.get(`g:${s.id}`) ?? null;
      s.labelCell = cells.get(`l:${s.id}`) ?? null;
    }
    for (const tb of this.tubes.values()) {
      if (tb.cellsOf === cells) continue;
      tb.cellsOf = cells;
      tb.markCell = cells.get(`m:${tb.id}`) ?? null;
    }
  }

  /**
   * Screen-space pass over the degree labels: one that covers a label kept
   * before it, or another planet's disc, is set to fade to 30%. Labels in
   * the focus go first, then the nearer.
   */
  private declutterLabels(sceneM: Mat4, fit: number, k: number) {
    const items = this.dcItems;
    const discs = this.dcDiscs;
    let ni = 0;
    let nd = 0;
    for (const s of this.sprites.values()) {
      if (s.nowSeen !== this.frameNo) continue;
      projectInto(sceneM, s.x, s.y, s.nowZ, PRJ);
      const unitPx = (k * fit) / PRJ[2];
      const sc = Math.max(0.5, s.scale.x) * boost(2 * DISC_R * Math.max(0.5, s.scale.x), unitPx, MIN_GLYPH_PX);
      if (s.alpha.x > 0.2) {
        const d = discs[nd] ?? (discs[nd] = { id: "", x: 0, y: 0, r: 0 });
        d.id = s.id;
        d.x = PRJ[0];
        d.y = PRJ[1];
        d.r = DISC_R * sc * unitPx;
        nd += 1;
      }
      const cell = s.labelCell;
      if (!cell || !s.labelAt) continue;
      projectInto(sceneM, s.labelAt.x, s.labelAt.y, s.nowZ, PRJ);
      const u = (k * fit) / PRJ[2];
      const lb = boost(LABEL_TEXT * cell.h, u, MIN_LABEL_PX);
      // The focus first, then what it involves (not sinking), then the rest.
      const rank = s.halo.x > 0.3 ? 2 : s.sink.target < 0.5 ? 1 : 0;
      const it = items[ni] ?? (items[ni] = { id: "", x: 0, y: 0, hw: 0, hh: 0, w: 0, rank: 0 });
      it.id = s.id;
      it.x = PRJ[0];
      it.y = PRJ[1];
      it.hw = (cell.w / 2) * lb * u;
      it.hh = (cell.h / 2) * lb * u;
      it.w = PRJ[2];
      it.rank = rank;
      ni += 1;
    }
    const order = this.dcOrder;
    order.length = 0;
    for (let i = 0; i < ni; i += 1) order.push(items[i]);
    sortLabels(order);
    const kept = this.dcKept;
    kept.length = 0;
    for (const it of order) {
      let hitsLabel = false;
      for (const o of kept) {
        if (Math.abs(o.x - it.x) < o.hw + it.hw - 1 && Math.abs(o.y - it.y) < o.hh + it.hh - 1) {
          hitsLabel = true;
          break;
        }
      }
      let hitsDisc = false;
      if (!hitsLabel) {
        for (let i = 0; i < nd; i += 1) {
          const d = discs[i];
          if (d.id !== it.id && Math.max(Math.abs(d.x - it.x) - it.hw, 0) ** 2 + Math.max(Math.abs(d.y - it.y) - it.hh, 0) ** 2 < (d.r - 1) ** 2) {
            hitsDisc = true;
            break;
          }
        }
      }
      const clear = !hitsLabel && !hitsDisc;
      if (clear) kept.push(it);
      this.labelTarget.set(it.id, clear ? 1 : 0.3);
    }
    for (const id of this.labelTarget.keys()) if (!this.sprites.has(id)) this.labelTarget.delete(id);
  }

  // ─── pointer ──────────────────────────────────────────────────────────

  /**
   * What stands under a client point among the view's own pieces: a planet,
   * an aspect's mark or tube, a raised block. (The plate and the rings are
   * tested by the chart itself, at their heights: zOf.)
   */
  pick(clientX: number, clientY: number, coarse = false): string | null {
    const f = this.frame;
    if (!f || !this.ready) return null;
    const scene = this.depth.scene;
    const rect = scene.getBoundingClientRect();
    const zoom = scene.clientWidth ? rect.width / scene.clientWidth : 1;
    if (!zoom) return null;
    const px = (clientX - rect.left) / zoom;
    const py = (clientY - rect.top) / zoom;
    const st = this.depth.sceneState();
    const m = chartToScene(st, f);
    // Chart units → scene px at depth w: the fit, the frame and the lens.
    const fit = (st.scale ?? 1) * (st.zoom ?? 1);
    const L = this.layout();
    // Planets: the disc under the point (the one in front); else the nearest
    // within reach (a finger reaches further), one in the focus first.
    let best: string | null = null;
    let bestW = Infinity;
    let near: string | null = null;
    let nearScore = Infinity;
    const reachPx = coarse ? PICK_REACH.coarse : PICK_REACH.fine;
    for (const s of this.sprites.values()) {
      const foot = this.footOf(s, L);
      projectInto(m, s.x, s.y, this.floatZ(s, L, foot), PRJ);
      const x = PRJ[0];
      const y = PRJ[1];
      const w = PRJ[2];
      const unitPx = (f.k * fit) / w;
      const sc = Math.max(0.5, s.scale.x) * boost(2 * DISC_R * Math.max(0.5, s.scale.x), unitPx, MIN_GLYPH_PX);
      const r = (DISC_R + 1) * sc * unitPx;
      // A body sinking out of another focus is still found where it stands
      // at rest: it must not slip out from under a pointer on its way to it
      // (crossing its neighbour's house on the way sank it out of reach).
      let dRest = Infinity;
      if (s.sink.x > 0.01) {
        projectInto(m, s.x, s.y, this.floatZ(s, L, foot, 0), PRJ);
        dRest = hypot2(PRJ[0] - px, PRJ[1] - py);
      }
      const d = Math.min(hypot2(x - px, y - py), dRest);
      if (d <= r + 1 && w < bestW) {
        best = s.id;
        bestW = w;
      }
      if (d <= Math.max(r + 3, reachPx)) {
        const score = d + (s.sink.target > 0.5 ? 1000 : 0);
        if (score < nearScore) {
          near = s.id;
          nearScore = score;
        }
      }
    }
    if (best) return best;
    if (near) return near;
    // Their degree labels (upright boxes where the flat chart puts them).
    this.linkCells();
    for (const s of this.sprites.values()) {
      const cell = s.labelCell;
      if (!cell || !s.labelAt || (this.labelFade.get(s.id) ?? 1) < 0.5) continue;
      projectInto(m, s.labelAt.x, s.labelAt.y, this.floatZ(s, L, this.footOf(s, L)), PRJ);
      const k = (f.k * fit) / PRJ[2];
      const lb = boost(LABEL_TEXT * cell.h, k, MIN_LABEL_PX);
      if (Math.abs(PRJ[0] - px) <= (cell.w / 2) * lb * k + 2 && Math.abs(PRJ[1] - py) <= (cell.h / 2) * lb * k + 2) return s.id;
    }
    // Aspect marks, then tubes (the nearest centreline within reach), where
    // they were last drawn.
    for (const t of this.tubes.values()) {
      const n = t.now;
      if (!n || t.mark.x < 0.5) continue;
      projectInto(m, n.mid[0], n.mid[1], n.mid[2], PRJ);
      if (hypot2(PRJ[0] - px, PRJ[1] - py) <= (MARK_HALF * f.k * fit) / PRJ[2]) return t.id;
    }
    let tube: string | null = null;
    let tubeD = Infinity;
    for (const t of this.tubes.values()) {
      const n = t.now;
      if (!n) continue;
      let prevX = 0;
      let prevY = 0;
      for (let i = 0; i <= 16; i += 1) {
        bezierInto(n.a, n.c, n.b, i / 16, PT);
        projectInto(m, PT[0], PT[1], PT[2], PRJ);
        if (i > 0) {
          const d = segDist(px, py, prevX, prevY, PRJ[0], PRJ[1]);
          const reach = Math.max(4.5, (n.r * f.k * fit) / PRJ[2] + 2);
          if (d <= reach && d < tubeD) {
            tubeD = d;
            tube = t.id;
          }
        }
        prevX = PRJ[0];
        prevY = PRJ[1];
      }
    }
    if (tube) return tube;
    // Raised blocks: their tops, highest first.
    const up = [...this.blocks.values()].filter((b) => b.rise.x > 1).sort((a, b) => b.rise.x - a.rise.x);
    for (const b of up) {
      const zPx = ((b.onRing ? L.zodiac : 0) + (b.rise.x * L.t) / L.k) * f.k;
      const q = this.depth.unproject(clientX, clientY, zPx);
      if (q && inSector(this.polar, q.x, q.y, b.ecl0, b.ecl1, b.r0, b.r1)) return b.id;
    }
    return null;
  }

  // ─── QA ───────────────────────────────────────────────────────────────

  /** A snapshot of the scene for tests (heights in stack px). */
  debugState() {
    const L = this.layout();
    const k = L.k;
    return {
      ready: this.ready,
      t: this.progress(),
      draws: this.draws,
      calls: this.calls,
      instanced: Boolean(this.inst),
      reuse: { ...this.reuse },
      texSide: this.texSide,
      buildMs: Math.round(this.lastBuildMs),
      zodiac: L.zodiac * k,
      canvas: this.canvas ? { w: this.canvas.width, h: this.canvas.height, css: this.canvas.clientWidth } : null,
      sprites: [...this.sprites.values()].map((s) => {
        const at = this.spriteAt(s, L);
        return { id: s.id, z: at.z * k, foot: at.foot * k, alpha: s.alpha.x, scale: s.scale.x, halo: s.halo.x, sink: s.sink.x, sinkTo: s.sink.target };
      }),
      tubes: [...this.tubes.values()].map((t) => ({
        id: t.id,
        kind: t.kind,
        ends: [t.a.sprite, t.b.sprite],
        r: (t.now?.r ?? 0) * k,
        alpha: t.now?.alpha ?? 0,
        arch: t.arch.x,
        mark: t.mark.x,
        z: t.now ? [t.now.a[2] * k, t.now.b[2] * k] : null,
      })),
      blocks: [...this.blocks.values()].map((b) => ({ id: b.id, tier: b.tier, rise: b.rise.x, glow: b.glow.x, walls: Boolean(b.walls) })),
    };
  }

  /** Where a planet (or an aspect's middle) is on screen now, client px (QA). */
  screenOf(id: string): { x: number; y: number } | null {
    const f = this.frame;
    if (!f) return null;
    const st = this.depth.sceneState();
    const m = chartToScene(st, f);
    const L = this.layout();
    let p: number[] | null = null;
    const s = this.sprites.get(id);
    if (s) p = [s.x, s.y, this.spriteAt(s, L).z];
    const t = this.tubes.get(id);
    if (!p && t?.now) p = [t.now.mid[0], t.now.mid[1], t.now.mid[2]];
    if (!p) return null;
    const q = projectChart(m, p[0], p[1], p[2]);
    const scene = this.depth.scene;
    const rect = scene.getBoundingClientRect();
    const zoom = scene.clientWidth ? rect.width / scene.clientWidth : 1;
    return { x: rect.left + q.x * zoom, y: rect.top + q.y * zoom };
  }

  /** How much of the canvas is drawn (0..1), sampled: proves pixels, not just state. */
  debugInk(): number {
    const gl = this.gl;
    if (!gl || !this.ready) return 0;
    this.render();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let n = 0;
    let all = 0;
    for (let i = 3; i < px.length; i += 4 * 37) {
      all += 1;
      if (px[i] > 40) n += 1;
    }
    return all ? n / all : 0;
  }
}

function segDist(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2));
  return hypot2(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** The base-SVG selector of everything the 3D view draws itself. */
export const VIEW3D_OFF_PLATE = OFF_PLATE;

