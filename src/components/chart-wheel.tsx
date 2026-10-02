import { markSeen, seenBefore } from "@/lib/seen-once";
import { settleIn } from "@/lib/settle";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
} from "react";
import { computeAspects } from "@/lib/chart/anatomy";
import {
  ASPECT_COLOR,
  ELEMENT_COLOR,
  OUTER_ASPECT_COLOR,
  SIGN_IDS,
  SIGN_META,
  decanOf,
} from "@/lib/chart/constants";
import {
  layerShowsCross,
  layerShowsNatal,
  layerShowsOuter,
  type AspectLayer,
} from "@/lib/chart/chart-view";
import {
  aspectVisible,
  DEFAULT_ASPECT_FILTER,
  type AspectFilter,
} from "@/lib/chart/aspect-filter";
import {
  defaultOverlays,
  overlayOn,
  type OverlayFilter,
} from "@/lib/chart/overlay-filter";
import type {
  AspectLink,
  DignityKind,
  NatalChart,
} from "@/lib/chart/types";
import {
  aspectLinkPhrase,
  bodyAgree,
  bodyBare,
  bodyLabel,
  faceLabelLocale,
  signDe,
  signName,
} from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { planetPaint } from "@/lib/look";
import { useLookPaintRev, useLookShape } from "@/lib/look-provider";
import { quietChartMotionEvents } from "@/lib/quiet-motion-events";
import { captureFirstView, claimFirstView } from "@/lib/first-view";
import { whenIdle } from "@/lib/lazy-component";
import { fanAngles, fanAnglesBy } from "@/lib/chart/fan-angles";
import { GLYPH_INK } from "@/lib/chart/glyph-ink";
import {
  cacheWheelPaint,
  paintWheelFocus,
  resolveWheelFocus,
  type WheelFocusCtx,
  type WheelPaintCache,
} from "@/lib/chart/wheel-focus";
import { CenteredAspectGlyph, MidpointGlyph, MONO_STACK, PlanetGlyph, SignGlyph, StarGlyph } from "./glyphs";
import { cssVar, textInk, useTextInkVersion } from "@/lib/chart/text-ink";
import { WheelZoom, type WheelLens } from "./wheel-zoom";
import { DepthController, LENS_MAX, LENS_MIN } from "./depth/depth-controller";
import { WHEEL_DEPTH_ADAPTER } from "./depth/wheel-depth";
import { rankWheelFocus, rankedIds } from "@/lib/chart/wheel-rank";
import { CAMERA_ANGLES, CAMERA_DEFAULT, CAMERA_RX_MAX, CAMERA_RX_MIN, type CameraAngle, type Wheel3DGeometry } from "./depth/camera";
import type { WheelView3D } from "./depth/wheel-view3d";
import { loadView3D, preloadView3D, view3dNow } from "./depth/load-view3d";
import { getDepthPrefs, onDepthReset, setDepthPrefs, subscribeDepthPrefs, useDepthPrefs } from "@/lib/depth/prefs";
import { prefersReducedMotion } from "@/lib/depth/env";
import { announceChartHover, onChartPreview } from "@/lib/depth/preview-bus";
import { onThemeApplied } from "@/lib/theme";
import { aspectLook, ink, lineInk, turn, yokeLanes, yokeSpan, type YokeSpan } from "@/lib/chart/wheel-style";
import { taperGeo, tipsPath } from "@/lib/chart/aspect-taper";
import { hideWheelTip, showWheelTip } from "./wheel-tip";
import { AspectStrip } from "./aspect-strip";
import { WheelAspectGrid, type GridRow } from "./wheel-aspect-grid";
import { WheelHint } from "./wheel-hint";
import { WheelKeys } from "./wheel-keys";
import { arcSpan, boxesOverlap, placeBadges, placeBeside, placeLabels, type Disc, type LabelPlace, type OBox } from "@/lib/chart/wheel-layout";
import { createSelectionStore, type SelectionStore } from "@/lib/chart/selection-store";
import { getWheelPrefs, subscribeWheelPrefs } from "@/lib/chart/wheel-prefs";
import { WheelToggles } from "./wheel-toggles";
import type { AspectId } from "@/lib/chart/types";
import { formatArc } from "@/lib/utils";

const CX = 360;
const CY = 360;
const PHI = 1.6180339887;
const R_OUTER = 338;
const R_SIGN_OUT = 336;
const R_SIGN_IN = 300;
const R_DECAN_IN = 283;
const R_TICK_OUT = 283;
const R_TICK_1 = 278;
const R_TICK_5 = 275;
const R_TICK_10 = 270;
/*
 * The planets' glyphs sit just inside the degree ticks, beside the signs they
 * are read against, a golden-ratio step beyond the golden-ratio ring; each
 * one's degree close under it, or just under the yokes there (`labelAt`).
 */
const R_LABEL = Math.round(R_OUTER / PHI);
const R_PLANET = R_LABEL + 34;
const R_ASPECT = Math.round(R_OUTER / (PHI * Math.sqrt(PHI)));
/** House numbers: between the aspect circle and the degree labels. */
const R_HOUSE_NUM = R_ASPECT + 18;
/** Planet glyphs: the first thing read on the wheel (part 85a: 21 → 26). */
const GLYPH = 26;
/** Aspect type mark in the middle of a lit line — smaller than planet glyphs. */
const ASPECT_MARK = 20;
const ASPECT_MARK_CONJ = 16;
const ASPECT_MARK_QUINTILE = 26;
const ASPECT_MARK_DISK = 10;
const ASPECT_MARK_MIN_SPAN = 22;
/**
 * A glyph's reach: its hit zone, where a lead line stops short of it, the
 * room its degree and the yokes keep. The glyphs stand bare on the wheel
 * (part 86, no disc behind them, as on Astrodienst and Astro Gold).
 */
const PLANET_DISK = 16;
/** The marks around a glyph (rings, overlay marks) were placed for a 13-unit disc: they scale with it. */
const MK = PLANET_DISK / 13;
const mk = (n: number) => Number((n * MK).toFixed(2));
/** The disc of a glyph in focus, grown 1.4 times (styles.css): its degree label keeps clear of it. */
const PLANET_DISK_GROWN = PLANET_DISK * 1.4;
/**
 * Crowded glyphs (part 86) stand side by side this far apart, ink to ink:
 * about 2 px on a computer's wheel, 1 px on a phone's. Each pair takes the
 * room its own two glyphs need across the spoke (a Moon is narrower than a
 * Saturn), and their degrees along the spokes keep theirs.
 */
const GLYPH_GAP = 2.5;
/** A face's glyph can ink a little wider than the drawn one measured in glyph-ink.ts. */
const GLYPH_INK_ROOM = 1.04;
/** Between two degrees along their spokes, at their inner ends (units). */
const DEG_SIDE_GAP = 1;
const R_STAR = R_OUTER + 5;
const EMPTY_IDS = new Set<string>();
/** How long a fresh wheel's entrance takes, all staging included (ms). */
const WHEEL_ENTER_MS = 1600;
/** A build on screen this long counts as seen: cut shorter (a quick switch), it plays whole next time. */
const WHEEL_SEEN_AFTER_MS = 700;
/** An aspect's own arrival, its longest part (a line drawing itself: 600 ms), with a margin. */
const ASPECT_ARRIVE_MS = 700;

// A reader who left the chart in 3D gets the 3D view's code straight away.
if (typeof window !== "undefined" && getDepthPrefs().view === "3d") preloadView3D();
/**
 * The 3D view's QA handles on its stage (`__uluneView3d`, `__uluneDepth`):
 * for automated tests, or with `localStorage["ulune.debug.3d"] = "1"`.
 * Nobody else holds a view that has closed.
 */
function qaHandles(): boolean {
  if (typeof navigator !== "undefined" && navigator.webdriver) return true;
  try {
    return window.localStorage.getItem("ulune.debug.3d") === "1";
  } catch {
    return false;
  }
}
type QaStage = HTMLElement & { __uluneView3d?: WheelView3D };
/** Let go of a view's QA handle once it has closed. */
function dropQaHandle(scene: HTMLElement | null, v: WheelView3D) {
  const s = scene as QaStage | null;
  if (s?.__uluneView3d === v) delete s.__uluneView3d;
}
const DIGNITY_MARK: Record<DignityKind, string> = {
  domicile: "D",
  exalted: "E",
  detriment: "d",
  fall: "f",
  peregrine: "P",
};
/** Exterior degree pins — same lengths as the inner tick band, pointing out. */
const R_XTICK_1 = R_OUTER + (R_TICK_OUT - R_TICK_1);
const R_XTICK_5 = R_OUTER + (R_TICK_OUT - R_TICK_5);
const R_XTICK_10 = R_OUTER + (R_TICK_OUT - R_TICK_10);
const TRANSIT_GLYPH = 18;
const TRANSIT_DISK = 11;
const TRANSIT_PAD = 3;
/** Just outside the pin ticks, with a short leader — not a second orbit. */
const R_TRANSIT = R_XTICK_10 + TRANSIT_DISK + 26;
const R_TRANSIT_LABEL = R_TRANSIT + 28;
const TRANSIT_MIN_SEP = ((TRANSIT_DISK * 2 + TRANSIT_PAD) / R_TRANSIT) * (180 / Math.PI);

/* Strokes carry `vector-effect: non-scaling-stroke` (see `.ulune-wheel` in
   styles.css), so every width below is device pixels at any wheel size. A
   390px wheel keeps the same ink as a 700px one instead of fading to haze;
   nothing may go under ~0.7px or it lands between pixel rows. */
const HAIR_FINE = 1;
const HAIR_MID = 1.15;
const HAIR_COARSE = 1.35;
const HAIR_DECAN = 0.8;
const HAIR_LEAD = 1;
const RING = 1.15;
/** House cusps by kind (angles are drawn by their own axis). */
const CUSP_ANGLE_W = 1.8;
const CUSP_SUCCEDENT_W = 1.3;
const CUSP_CADENT_W = 1.1;
/**
 * Conjunctions are yokes. Between two natal bodies: a fine line from one
 * glyph's disc down to a lane just inside the glyph ring, along it, and up
 * into the other's (conjunct bodies are always fanned apart, so a yoke is
 * never a speck). A yoke that shares any stretch with a narrower one runs a
 * lane deeper, so a stellium's conjunctions nest like brackets and can be
 * counted; yokes that only meet at a body share a lane, like a comb. Three
 * lanes at most (the degree labels sit just under them; past the third,
 * yokes share it). Across
 * the two rings, or between two outer bodies, the yoke hangs from their
 * degrees on the aspect circle instead. Lanes sit further apart on a small
 * wheel (its strokes do not shrink with it).
 */
const YOKE_IN = { lg: 6, sm: 7 } as const;
const YOKE_STEP = { lg: 4.2, sm: 6.5 } as const;
const YOKE_LANES = { lg: 3, sm: 3 } as const;
/**
 * Aspect lines on a small wheel (a phone): their widths are device pixels at
 * any size (non-scaling strokes), so on a wheel under ~430 px they weighed as
 * much as on a large one and crowded it. Thinner there; the orb still sets
 * each line's weight against the others.
 */
const ASPECT_LINE_K = { lg: 1, sm: 0.7 } as const;
/** Radius of a yoke's rounded corners (units). */
const YOKE_CORNER = 2.6;
/** A yoke is never shorter than this (degrees): a planet on an angle still gets one. */
const YOKE_MIN_LEN = 3;
/** A yoke's leg starts this far inside its glyph's disc, under the disc, so the two meet cleanly. */
const YOKE_TUCK = 2;
/** A degree under a yoke starts this far below its lane (units: the line, and a little air). */
const YOKE_CLEAR = { lg: 2.6, sm: 3.6 } as const;
/** Aspect lines shorter than this carry no direction chevrons at rest (units). */
const CHEVRON_MIN_LEN = 40;
/**
 * An aspect line lands exactly on its body's degree; over its last
 * TAPER units (a longer stretch on a small wheel, whose strokes do not
 * shrink with it) it narrows in steps to a fine point, so the lines meeting
 * at one body stay apart right up to its dot.
 */
const TAPER = { lg: 14, sm: 18 } as const;
/** The dot marking a body's degree on the aspect circle (units). */
const DEGREE_DOT_R = 2.4;
/** A line shows its glyph at rest (the switch under the chart) when it is this long, this far from the next glyph (units). */
const REST_MARK_MIN_LEN = 40;
const REST_MARK_GAP = 24;
/** Degree labels: text size (units) on a desktop-sized wheel and on a small one (degree only). */
const LABEL_FONT = 9;
const LABEL_FONT_SM = 13;
/** The outer ring's degrees (transits, a partner) keep their size: they sit outside, with room. */
const TRANSIT_LABEL_FONT = 10.5;
const TRANSIT_LABEL_FONT_SM = 16;
/** A degree along its planet's line: the gap after the glyph's disc, and before the line takes over again (units). */
const DEG_GAP = 2.5;
/** The outer ring's: enough for a level label to clear its neighbour's near the top and bottom of the wheel. */
const TRANSIT_LABEL_RING2 = { lg: 18, sm: 24 } as const;
/** House numbers: their size, and where they step in when a house is too full. */
const HOUSE_NUM_R = 11;
const HOUSE_NUM_FONT = 12;
/** A house cusp's degree, written along the cusp at its inner end (desktop-sized wheels). */
const CUSP_DEG_FONT = 8.5;
/** Where along the cusp it starts (units past the aspect circle), and how far beside the line. */
const CUSP_DEG_IN = 5;
const CUSP_DEG_SIDE = 4.6;
/** An angle's degree and sign, one line from its name. */
const ANGLE_DEG_FONT = 9;
const ANGLE_DEG_DY = 12;
/** Configurations are filled when chosen, or when a chart has no more than this many (else lines only). */
const CFG_FILL_MAX = 3;
/** A stellium's bracket just outside the zodiac, and its count. */
const STELLIUM_R = R_OUTER + 7;
const STELLIUM_LABEL_R = R_OUTER + 17;

/**
 * Both viewBoxes leave the same slim margin past the furthest ink, so the
 * biwheel is not drawn 12% smaller than the natal wheel in the same port.
 */
const VIEWBOX_PAD = 18;
function viewBoxFor(extent: number) {
  const half = Math.ceil(extent + VIEWBOX_PAD);
  return { x: CX - half, y: CY - half, size: half * 2, vb: `${CX - half} ${CY - half} ${half * 2} ${half * 2}` };
}
/** ASC/DSC label ring plus half a three-letter label. */
const NATAL_VIEW = viewBoxFor(R_OUTER + 24 + 13);
/** Outer degree-label box, measured at its widest (retrograde) corner. */
const BIWHEEL_VIEW = viewBoxFor(R_TRANSIT_LABEL + 24);

function polar(ecliptic: number, r: number, asc: number) {
  const ccw = ((ecliptic - asc) % 360 + 360) % 360;
  const rad = (ccw * Math.PI) / 180;
  return {
    x: CX - r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
    ccw,
  };
}

/** Midpoint of an aspect chord. Very short lines (conjunctions) sit on the
 *  planet, so the mark is pulled toward the wheel centre to stay readable. */
function aspectMarkPoint(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const x = (p1.x + p2.x) / 2;
  const y = (p1.y + p2.y) / 2;
  if (Math.hypot(p2.x - p1.x, p2.y - p1.y) >= ASPECT_MARK_MIN_SPAN) return { x, y };
  const vx = x - CX;
  const vy = y - CY;
  const r = Math.hypot(vx, vy) || 1;
  const pull = ASPECT_MARK_DISK + 6;
  return { x: x - (vx / r) * pull, y: y - (vy / r) * pull };
}

function annulus(ecl0: number, ecl1: number, r0: number, r1: number, asc: number) {
  const span = ((ecl1 - ecl0) % 360 + 360) % 360;
  if (span < 0.15) return "";
  const large = span > 180 ? 1 : 0;
  const p0o = polar(ecl0, r1, asc);
  const p1o = polar(ecl1, r1, asc);
  const p1i = polar(ecl1, r0, asc);
  const p0i = polar(ecl0, r0, asc);
  return [
    `M ${p0o.x.toFixed(2)} ${p0o.y.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 0 ${p1o.x.toFixed(2)} ${p1o.y.toFixed(2)}`,
    `L ${p1i.x.toFixed(2)} ${p1i.y.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 1 ${p0i.x.toFixed(2)} ${p0i.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** Which 10° face (0/1/2) of its sign a longitude falls in. */
function faceIndex(ecliptic: number) {
  return Math.floor((((ecliptic % 30) + 30) % 30) / 10);
}

function lineAt(ecliptic: number, r0: number, r1: number, asc: number) {
  const a = polar(ecliptic, r0, asc);
  const b = polar(ecliptic, r1, asc);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

/** Point on the segment from `from` toward `to`, inset from `to` by `inset` units. */
function toward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  inset: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.max(0, 1 - inset / len);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function tickPath(from: number, to: number, step: number, r0: number, r1: number, asc: number) {
  const parts: string[] = [];
  for (let i = from; i < to; i += step) {
    const a = polar(i, r0, asc);
    const b = polar(i, r1, asc);
    parts.push(`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
  }
  return parts.join(" ");
}

/**
 * A painted mark a pointer can land on: a disc of radius `core`, or the
 * `hw`×`hh` half-extents of a label box. Slop is not baked in — see `hitTest`.
 */
type HitTarget = { id: string; x: number; y: number; core: number; hw?: number; hh?: number };
/**
 * Forgiveness around a painted mark for a finger, in CSS pixels at any wheel
 * size. A mouse gets none: it lights what it is on, nothing around it.
 */
const TOUCH_SLOP_PX = 5;
/** How near an aspect line a finger may land and still take it (CSS pixels, each side). */
const ASPECT_HIT_PX = 4.5;
/** The same for a mouse: close to the line as drawn, enough to catch a hairline. */
const ASPECT_HIT_MOUSE_PX = 3;

/** Signed distance to the painted mark: 0 or less means the pointer is on it. */
function targetDist(t: HitTarget, x: number, y: number) {
  if (t.hw != null && t.hh != null) {
    const dx = Math.abs(x - t.x) - t.hw;
    const dy = Math.abs(y - t.y) - t.hh;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  }
  return Math.hypot(x - t.x, y - t.y) - t.core;
}

/** Distance from a point to a line segment. */
function distToSeg(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

type YokeGeo = {
  lane: number;
  /** Radius of its lane. */
  r: number;
  d: string;
  /** Its outline as a polyline: for picking, and for house numbers to keep clear of. */
  pts: { x: number; y: number }[];
  /** Where its glyph sits when lit: on the lane, at its middle. */
  mark: { x: number; y: number };
};

/**
 * A conjunction's yoke: from each end (`top`: the radius it starts at, inside
 * a glyph's disc or on the aspect circle) down to its lane at radius `r`,
 * rounded into the lane, and along it. An end at the lane's own radius (an
 * angle's axis crossing the lane) has no leg: the lane meets the axis. A yoke
 * never runs shorter than YOKE_MIN_LEN: legs to closer ends slant in.
 */
function yokeGeo(span: YokeSpan, top: readonly [number, number], r: number, lane: number, asc: number): YokeGeo {
  const half = Math.max(span.len, YOKE_MIN_LEN) / 2;
  const [a0, a1] = [span.from, span.from + span.len];
  const [b0, b1] = [span.mid - half, span.mid + half];
  const corner = (YOKE_CORNER / r) * (180 / Math.PI);
  const at = (e: number, rr: number) => {
    const q = polar(e, rr, asc);
    return { x: q.x, y: q.y };
  };
  const f = (n: number) => n.toFixed(2);
  const leg0 = top[0] - r > YOKE_CORNER + 0.5;
  const leg1 = top[1] - r > YOKE_CORNER + 0.5;
  const cmd: string[] = [];
  const pts: { x: number; y: number }[] = [];
  const arc0 = leg0 ? b0 + corner : b0;
  const arc1 = leg1 ? b1 - corner : b1;
  if (leg0) {
    const s = at(a0, top[0]);
    const k = at(b0, r + YOKE_CORNER);
    const q = at(b0, r);
    const c = at(arc0, r);
    cmd.push(`M ${f(s.x)} ${f(s.y)} L ${f(k.x)} ${f(k.y)} Q ${f(q.x)} ${f(q.y)} ${f(c.x)} ${f(c.y)}`);
    pts.push(s, k, c);
  } else {
    const c = at(arc0, r);
    cmd.push(`M ${f(c.x)} ${f(c.y)}`);
    pts.push(c);
  }
  // The zodiac runs counter-clockwise on screen: sweep 0.
  const e = at(arc1, r);
  cmd.push(`A ${r} ${r} 0 0 0 ${f(e.x)} ${f(e.y)}`);
  const n = Math.max(2, Math.ceil((arc1 - arc0) / 2));
  for (let i = 1; i < n; i += 1) pts.push(at(arc0 + ((arc1 - arc0) * i) / n, r));
  pts.push(e);
  if (leg1) {
    const q = at(b1, r);
    const k = at(b1, r + YOKE_CORNER);
    const s = at(a1, top[1]);
    cmd.push(`Q ${f(q.x)} ${f(q.y)} ${f(k.x)} ${f(k.y)} L ${f(s.x)} ${f(s.y)}`);
    pts.push(k, s);
  }
  return { lane, r, d: cmd.join(" "), pts, mark: at(span.mid, r) };
}

/**
 * Two small chevrons either side of a line's middle: pointing in (closing:
 * applying) or out (opening: separating).
 */
function chevronPath(p1: { x: number; y: number }, p2: { x: number; y: number }, applying: boolean): string {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const ux = (p2.x - p1.x) / len;
  const uy = (p2.y - p1.y) / len;
  const nx = -uy;
  const ny = ux;
  const off = 7;
  const s = 3;
  const f = (n: number) => n.toFixed(2);
  const one = (side: 1 | -1) => {
    // The chevron's tip points toward the middle (applying) or away from it.
    const dir = applying ? -side : side;
    const cx = mx + ux * off * side;
    const cy = my + uy * off * side;
    const tip = { x: cx + ux * s * dir, y: cy + uy * s * dir };
    const b1 = { x: cx - ux * s * dir + nx * s, y: cy - uy * s * dir + ny * s };
    const b2 = { x: cx - ux * s * dir - nx * s, y: cy - uy * s * dir - ny * s };
    return `M ${f(b1.x)} ${f(b1.y)} L ${f(tip.x)} ${f(tip.y)} L ${f(b2.x)} ${f(b2.y)}`;
  };
  return `${one(1)} ${one(-1)}`;
}

/**
 * A planet's degree as written along its line (part 85a): the axes' size and
 * font, no box; a small wheel shows the degree only. Retrograde is marked
 * beside the glyph, so every degree has the same length.
 */
function labelSpec(formatted: string, _retrograde: boolean, fit: "sm" | "lg") {
  if (fit === "sm") {
    const txt = `${formatted.split("°")[0]}°`;
    return { txt, font: LABEL_FONT_SM, w: txt.length * 0.6 * LABEL_FONT_SM + 1, h: LABEL_FONT_SM + 1 };
  }
  const txt = formatted;
  return { txt, font: LABEL_FONT, w: txt.length * 0.6 * LABEL_FONT + 1, h: LABEL_FONT + 1 };
}

/** The outer ring's degree labels (transits, a partner): level, in a small box, as before. */
function transitLabelSpec(formatted: string, retrograde: boolean, fit: "sm" | "lg") {
  if (fit === "sm") {
    const txt = `${formatted.split("°")[0]}°`;
    return { txt, font: TRANSIT_LABEL_FONT_SM, w: txt.length * 0.62 * TRANSIT_LABEL_FONT_SM + 8, h: 22 };
  }
  const txt = `${formatted}${retrograde ? " ℞" : ""}`;
  return { txt, font: TRANSIT_LABEL_FONT, w: txt.length * 0.62 * TRANSIT_LABEL_FONT + 7, h: 16 };
}

/**
 * Where a degree goes along its planet's line: from just past the glyph's disc
 * straight in along the glyph's spoke (a fanned glyph's too, so neighbours'
 * degrees never cross), turned to read left to right. `tail` is where the
 * line takes over again, on to the planet's true degree on the aspect circle.
 */
function radialLabel(
  glyph: { x: number; y: number },
  w: number,
  from = PLANET_DISK_GROWN - 1,
): LabelPlace & { start: number; end: number; tail: { x: number; y: number } } {
  const dx = CX - glyph.x;
  const dy = CY - glyph.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Clear of the glyph grown in focus (1.4 times), so lighting a planet never
  // covers its degree; below the yokes there (labelAt).
  const start = from;
  const mid = start + w / 2;
  let rot = (Math.atan2(uy, ux) * 180) / Math.PI;
  if (rot > 90) rot -= 180;
  else if (rot < -90) rot += 180;
  const end = start + w;
  return {
    x: glyph.x + ux * mid,
    y: glyph.y + uy * mid,
    rot,
    at: "radial",
    start,
    end,
    tail: { x: glyph.x + ux * (end + DEG_GAP), y: glyph.y + uy * (end + DEG_GAP) },
  };
}

/** SVG rotation for a turned label (around its centre). */
function labelTurn(place: LabelPlace | undefined): string | undefined {
  return place && place.rot ? `rotate(${place.rot.toFixed(2)} ${place.x.toFixed(2)} ${place.y.toFixed(2)})` : undefined;
}

type PinwheelRadii = {
  rDecanIn: number;
  rSignIn: number;
  rSignOut: number;
  rOuter: number;
};

/** The natal zodiac's rings. */
const NATAL_RADII: PinwheelRadii = { rDecanIn: R_DECAN_IN, rSignIn: R_SIGN_IN, rSignOut: R_SIGN_OUT, rOuter: R_OUTER };

/**
 * The zodiac: sign bands, decans, sign lines (385 nodes, 48 glyphs). Its
 * drawing depends on the Ascendant and the language only: memoized, so a
 * transit scrub or a filter change does not rebuild it.
 */
const PinwheelLayer = memo(function PinwheelLayer({
  radii,
  k,
  asc,
  interactive,
  hoverProps,
}: {
  radii: PinwheelRadii;
  k: string;
  asc: number;
  interactive: boolean;
  hoverProps: (id: string) => object;
}) {
  const { locale, t } = useI18n();
  const { rDecanIn, rSignIn, rSignOut, rOuter } = radii;
  return (
    <g data-pinwheel={k}>
      {SIGN_IDS.map((sign, i) => {
        const start = i * 30;
        const end = start + 30;
        const id = `sign:${sign}`;
        const rColorIn = rSignOut - 14;
        const mid = polar(start + 15, (rSignIn + rColorIn) / 2, asc);
        const el = SIGN_META[sign].element;
        const color = ELEMENT_COLOR[el];
        return (
          <g
            key={`${k}-${sign}`}
            data-hl={id}
            data-sign={sign}
            data-kind="sign-band"
            data-dimmable
            className="ulune-dim-band"
            // Entrance order: the zodiac sweeps in from the Ascendant.
            style={{ ["--enter" as string]: (i - Math.floor((((asc % 360) + 360) % 360) / 30) + 12) % 12 }}
          >
            <path
              d={annulus(start, end, rSignIn, rColorIn, asc)}
              fill="var(--color-bg)"
              stroke="none"
              className={interactive ? "focus:outline-none" : "pointer-events-none"}
              data-wheel={interactive ? id : undefined}
              data-hl={id}
              data-sign={sign}
              data-kind="sign"
              {...(interactive ? hoverProps(id) : {})}
            >
              <title>{signName(sign, locale)}</title>
            </path>
            <path
              d={annulus(start, end, rColorIn, rSignOut, asc)}
              fill={color}
              fillOpacity={0.92}
              stroke="none"
              className="pointer-events-none ulune-dim-sign-color"
              data-kind="sign-color"
            />
            <g
              transform={`translate(${mid.x}, ${mid.y})`}
              className="pointer-events-none ulune-dim-sign-glyph"
              style={{ color: ink(color) }}
              data-hl={id}
              data-sign={sign}
              data-kind="sign-glyph"
            >
              <g transform="translate(-11, -11)">
                <SignGlyph id={sign} size={22} />
              </g>
            </g>
          </g>
        );
      })}

      {SIGN_IDS.map((sign, i) => {
        const start = i * 30;
        // Entrance: a sign's three decans fade in together, a third of a
        // step behind its band (where its middle decan came when each decan
        // had its own fade, a third of a step apart).
        return (
          <g
            key={`${k}-${sign}-decans`}
            data-decans={sign}
            style={{ ["--enter" as string]: ((i - Math.floor((((asc % 360) + 360) % 360) / 30) + 12) % 12) + 1 / 3 }}
          >
            {[0, 1, 2].map((face) => {
              const ecl0 = start + face * 10;
              const ecl1 = ecl0 + 10;
              const decan = decanOf(ecl0 + 5);
              const mid = polar(ecl0 + 5, (rSignIn + rDecanIn) / 2, asc);
              const color = ELEMENT_COLOR[SIGN_META[decan.faceSign].element];
              const key = `${sign}-${face}`;
              const id = `decan:${key}`;
              return (
                <g key={`${k}-${key}`} data-decan-cell>
                  <path
                    d={annulus(ecl0, ecl1, rDecanIn, rSignIn, asc)}
                    fill={color}
                    fillOpacity={0.08}
                    stroke="var(--color-border-strong)"
                    strokeWidth={HAIR_DECAN}
                    data-kind="decan-cell"
                  >
                    <title>
                      {t("decanTooltip", {
                        face: faceLabelLocale(decan.face, locale),
                        sign: locale === "fr" ? signDe(sign) : signName(sign, locale),
                        ruler: bodyBare(decan.ruler, locale),
                      })}
                    </title>
                  </path>
                  <g
                    transform={`translate(${mid.x}, ${mid.y})`}
                    className="pointer-events-none ulune-dim-decan-glyph"
                    style={{ color: ink(color) }}
                    data-hl={id}
                    data-decan={key}
                    data-kind="decan-glyph"
                  >
                    <g transform="translate(-6.5, -6.5)">
                      <PlanetGlyph id={decan.ruler} size={13} />
                    </g>
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}

      {SIGN_IDS.map((sign, i) => {
        // A sign boundary: an ink line through the decans and the glyph
        // panel (a gap in the page colour vanished across the panels, which
        // are the page colour too), and a gap across the colour strip, where
        // ink would muddy the colour. 0° of the cardinal signs is heavier.
        const rColorIn = rSignOut - 14;
        const cardinal = i % 3 === 0;
        return (
          <g key={`${k}-sep-${sign}`} className="pointer-events-none" data-kind="sign-line" data-cardinal={cardinal ? "1" : undefined}>
            <line
              {...lineAt(i * 30, rDecanIn, rColorIn, asc)}
              stroke="var(--wheel-sign-line)"
              strokeWidth={cardinal ? 1.4 : 1}
            />
            <line {...lineAt(i * 30, rColorIn, rOuter, asc)} stroke="var(--color-bg)" strokeWidth={RING} opacity={0.85} />
          </g>
        );
      })}
    </g>
  );
});

/**
 * The zoom bar and port, holding the 3D lens's zoom: a lens step re-renders
 * the bar, not the wheel (each mouse-wheel tick in 3D rebuilt every node).
 */
function LensZoom({
  depthRef,
  lens,
  ...rest
}: Omit<ComponentProps<typeof WheelZoom>, "lens"> & {
  depthRef: MutableRefObject<DepthController | null>;
  lens: Omit<WheelLens, "zoom"> | null;
}) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const depth = depthRef.current;
    if (!depth) return;
    setZoom(depth.lensZoom());
    return depth.onLens(setZoom);
  }, [depthRef]);
  return <WheelZoom {...rest} lens={lens ? { ...lens, zoom } : null} />;
}

type WheelProps = {
  chart: NatalChart;
  selectedId: string | null;
  visible: Set<string>;
  aspectFilter?: AspectFilter;
  overlays?: OverlayFilter;
  starVisible?: Set<string>;
  midpointVisible?: Set<string>;
  onSelect: (id: string) => void;
  /** Outer transiting bodies. Natal page must omit this. */
  transits?: NatalChart["planets"];
  /** Outer-to-inner aspects (transit / progression / synastry). Drawn in the inner disc. */
  crossAspects?: AspectLink[];
  outerKind?: "transit" | "synastry" | "progressions";
  aspectLayer?: AspectLayer;
  /**
   * The saved chart this natal wheel shows: its resting zodiac and houses are
   * kept on the device for the next visit's first view (lib/first-view.ts).
   */
  firstView?: string;
};

type WheelPaintApi = { refresh: () => void };

type WheelViewProps = Omit<WheelProps, "selectedId"> & {
  selectedIdRef: MutableRefObject<string | null>;
  paintApi: MutableRefObject<WheelPaintApi>;
  /** The pin, for the pieces outside the SVG that follow it (the count strip). */
  selection: SelectionStore;
};

/**
 * Selection is painted onto the existing SVG (same path as hover). A wrapper
 * holds `selectedId` so tapping a planet does not reconcile the whole wheel.
 */
export const ChartWheel = memo(function ChartWheel({
  selectedId,
  ...rest
}: WheelProps) {
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const paintApi = useRef<WheelPaintApi>({ refresh: () => {} });
  useEffect(() => quietChartMotionEvents(), []);
  const [selection] = useState(() => createSelectionStore(selectedId));
  useLayoutEffect(() => {
    paintApi.current.refresh();
    selection.set(selectedId);
  }, [selectedId, selection]);
  return <ChartWheelView {...rest} selectedIdRef={selectedIdRef} paintApi={paintApi} selection={selection} />;
});

const ChartWheelView = memo(function ChartWheelView({
  chart,
  visible,
  aspectFilter,
  overlays: overlaysProp,
  starVisible: starProp,
  midpointVisible: midpointProp,
  onSelect,
  transits,
  crossAspects,
  outerKind = "transit",
  aspectLayer = "both",
  firstView,
  selectedIdRef,
  paintApi,
  selection,
}: WheelViewProps) {
  const { locale, t } = useI18n();
  // Colours are CSS variables: only what changes the drawing re-renders the wheel.
  const { planets: lookPlanets, strokeScale } = useLookShape();
  const lookPaintRev = useLookPaintRev();
  const filter = aspectFilter ?? DEFAULT_ASPECT_FILTER;
  const overlays = overlaysProp ?? defaultOverlays();
  const starVisible = starProp ?? EMPTY_IDS;
  const midpointVisible = midpointProp ?? EMPTY_IDS;
  const applySep = overlayOn(overlays, "applyingSeparating");
  const asc = chart.angles.ascendant.ecliptic;
  /** Where a longitude falls in the entrance wave: 0 at the Ascendant, round the zodiac to 1. */
  const enterAt = (ecl: number) => ((((ecl - asc) % 360) + 360) % 360) / 360;
  /** No birth time: angles, cusps and house numbers are a noon placeholder. */
  const timeUnknown = chart.meta.timeUnknown === true;
  // Hover is painted onto the SVG in the same frame as the pointer move —
  // React state would rebuild the whole wheel and feel like lag.
  const svgRef = useRef<SVGSVGElement>(null);
  /** The ids of this wheel's glyph filters (two wheels on a page each have their own). */
  const glyphFx = `ulune-gfx${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hoverIdRef = useRef<string | null>(null);
  const cacheRef = useRef<WheelPaintCache | null>(null);
  const ctxRef = useRef<WheelFocusCtx | null>(null);
  /** Paint the focus for `hover` (with the pin, or a panel's preview), at once. */
  const paintNowRef = useRef<(hover: string | null) => void>(() => {});
  // Depth: the scene around the SVG, the controller the 3D view turns, and
  // the id another panel asks us to preview.
  const sceneRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<DepthController | null>(null);
  const previewIdRef = useRef<string | null>(null);
  const structureDirtyRef = useRef(true);
  const view3dRef = useRef<WheelView3D | null>(null);
  /** The wheel's layout in chart units, for the 3D view's solids. */
  const geometryRef = useRef<Wheel3DGeometry | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  /**
   * A drag in the 3D view: an orbit (the left button, one finger) or a pan of
   * the zoomed view (the right or middle button, or with Shift); where it
   * started, where it is, and whether it moved.
   */
  const orbitRef = useRef<{
    mode: "orbit" | "pan";
    x: number;
    y: number;
    /** The last point (a pan moves by the difference). */
    lx: number;
    ly: number;
    rx: number;
    rz: number;
    moved: boolean;
    id: number;
    /** Recent camera positions (for the glide when the drag is let go). */
    trail: { t: number; rx: number; rz: number }[];
  } | null>(null);
  /** The last press came from a finger or a pen (the 3D view's picking reaches further). */
  const coarsePointerRef = useRef(false);
  /** The next pin comes from the wheel itself (a pin from the panel or a table turns the 3D chart). */
  const wheelPickRef = useRef(false);
  /** The 3D camera's angle preset last chosen (the zoom bar shows and cycles it). */
  const [camAngle, setCamAngle] = useState<CameraAngle>("tilt");
  /** The wheel's detail band (wheel-zoom.tsx): a small wheel gets shorter, bigger labels. */
  const [fit, setFit] = useState<"sm" | "lg">("lg");
  const depthView = useDepthPrefs().view;
  /**
   * The element under the pointer showing the hand, while it is over
   * something: the cursor is set on it, not on the SVG (an inherited change on
   * the root restyled every node of the wheel on each hover).
   */
  const cursorElRef = useRef<SVGElement | null>(null);
  const pointAt = (target: EventTarget | null, on: boolean) => {
    const el = on && target instanceof SVGElement ? target : null;
    const prev = cursorElRef.current;
    if (prev === el) return;
    if (prev) prev.style.removeProperty("cursor");
    if (el) el.style.cursor = "pointer";
    cursorElRef.current = el;
  };
  const orbitClickRef = useRef(false);
  /** A right-button pan just ended: swallow its context menu. */
  const panMenuRef = useRef(false);
  /** Let go of the pointer hover (entering or leaving the 3D view swaps what is under it). */
  const clearHoverRef = useRef(() => {
    if (hoverIdRef.current === null) return;
    hoverIdRef.current = null;
    announceChartHover(null);
  });
  // Glyph fan + tick bands are derived geometry — memoize so selection
  // clicks and transit scrubs don't redo work whose inputs haven't changed.
  const shownPlanets = useMemo(
    () => chart.planets.filter((p) => visible.has(p.id)),
    [chart, visible],
  );
  const bodies = useMemo(
    () => [...shownPlanets, ...Object.values(chart.angles).filter((a) => visible.has(a.id))],
    [shownPlanets, chart, visible],
  );
  const placed = useMemo(() => layoutPlanets(shownPlanets, asc, fit), [shownPlanets, asc, fit]);
  const showTransits = Boolean(transits);
  const synastryMode = outerKind === "synastry";
  const progressedMode = outerKind === "progressions";
  const biWheel = showTransits;
  const layer: AspectLayer = biWheel ? aspectLayer : "natal";
  const showNatalLayer = layerShowsNatal(layer);
  const showOuterLayer = biWheel && layerShowsOuter(layer);
  const showCrossLayer = biWheel && layerShowsCross(layer);
  const outerHit = useCallback(
    (id: string) => (synastryMode ? `partner:${id}` : progressedMode ? `progressed:${id}` : `transit:${id}`),
    [synastryMode, progressedMode],
  );
  const crossPrefix = synastryMode ? "saspect" : progressedMode ? "paspect" : "taspect";
  const R_NATAL_CHORD = R_ASPECT;
  const R_CROSS_CHORD = R_ASPECT;
  const R_OUTER_CHORD = R_ASPECT;
  const transitPlaced = useMemo(
    () =>
      transits ? layoutTransits(transits.filter((p) => visible.has(p.id)), asc) : [],
    [transits, visible, asc],
  );
  /** The planets' glyph discs, which labels and house numbers keep clear of. */
  const glyphDiscs = useMemo<Disc[]>(() => placed.map((p) => ({ x: p.x, y: p.y, r: PLANET_DISK })), [placed]);
  const transitLabelAt = useMemo(() => {
    const items = transitPlaced.map((p) => {
      const spec = transitLabelSpec(p.formatted, p.retrograde, fit);
      return { id: p.id, angle: p.display, w: spec.w, h: spec.h };
    });
    const discs = transitPlaced.map((p) => ({ x: p.x, y: p.y, r: TRANSIT_DISK }));
    // Kept inside the drawing, and beside the wheel just clear of each glyph.
    return placeLabels(items, (e, r) => polar(e, r, asc), { x: CX, y: CY }, {
      r1: R_TRANSIT_LABEL,
      r2: R_TRANSIT_LABEL + TRANSIT_LABEL_RING2[fit],
      discs,
      half: BIWHEEL_VIEW.size / 2,
      own: { r: R_TRANSIT, radius: TRANSIT_DISK },
    });
  }, [transitPlaced, fit, asc]);
  const outerAspects = useMemo(() => {
    if (!transits?.length) return [];
    return computeAspects(transits.filter((p) => visible.has(p.id))).map((a) => ({
      ...a,
      id: `outer:${a.id}`,
    }));
  }, [transits, visible]);
  /** The id a natal body answers to on the wheel (a planet, or one of the angles). */
  const natalHl = useCallback(
    (id: string) => (Object.values(chart.angles).some((x) => x.id === id) ? `angle:${id}` : `planet:${id}`),
    [chart],
  );
  const chords = useMemo(() => {
    const rows: {
      a: AspectLink;
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      /** True longitudes of the two ends. */
      e1: number;
      e2: number;
      /** Ink for the line and its mark (a shade deeper on the light theme). */
      color: string;
      /** The family's own colour (the 3D view's tubes: thick, they need no deeper ink). */
      jewel: string;
      focusId: string;
      /** The bodies at either end, as the wheel names them (the 3D view joins them). */
      ends: string;
      /** A conjunction is drawn as a yoke, not a chord. */
      yoke: YokeGeo | null;
      /** A yoke under the glyphs: the arc it spans and the radius of its lane (the degrees start below it). */
      underAt?: { span: YokeSpan; r: number };
      /** Where its glyph shows at rest (long major lines on a chart with few aspects), if it does. */
      restMark: { x: number; y: number } | null;
    }[] = [];
    const add = (
      a: AspectLink,
      pa: { ecliptic: number },
      pb: { ecliptic: number },
      r: number,
      color: string,
      focusId: string,
      ends: string,
    ) => {
      if (!aspectVisible(a, filter)) return;
      rows.push({
        a,
        p1: polar(pa.ecliptic, r, asc),
        p2: polar(pb.ecliptic, r, asc),
        e1: pa.ecliptic,
        e2: pb.ecliptic,
        color: lineInk(color),
        jewel: color,
        focusId,
        ends,
        yoke: null,
        restMark: null,
      });
    };
    if (showNatalLayer) {
      for (const a of chart.aspects) {
        if (!visible.has(a.a) || !visible.has(a.b)) continue;
        const pa = bodies.find((b) => b.id === a.a);
        const pb = bodies.find((b) => b.id === a.b);
        if (pa && pb) add(a, pa, pb, R_NATAL_CHORD, ASPECT_COLOR[a.type], `aspect:${a.id}`, `${natalHl(a.a)} ${natalHl(a.b)}`);
      }
    }
    if (showCrossLayer && crossAspects) {
      for (const a of crossAspects) {
        if (!visible.has(a.a) || !visible.has(a.b)) continue;
        const pa = synastryMode
          ? bodies.find((b) => b.id === a.a)
          : (transits ?? []).find((b) => b.id === a.a);
        const pb = synastryMode
          ? (transits ?? []).find((b) => b.id === a.b)
          : bodies.find((b) => b.id === a.b);
        const ends = synastryMode ? `${natalHl(a.a)} ${outerHit(a.b)}` : `${outerHit(a.a)} ${natalHl(a.b)}`;
        if (pa && pb) add(a, pa, pb, R_CROSS_CHORD, OUTER_ASPECT_COLOR[a.type], `${crossPrefix}:${a.id}`, ends);
      }
    }
    if (showOuterLayer) {
      for (const a of outerAspects) {
        const pa = (transits ?? []).find((b) => b.id === a.a);
        const pb = (transits ?? []).find((b) => b.id === a.b);
        if (pa && pb) add(a, pa, pb, R_OUTER_CHORD, OUTER_ASPECT_COLOR[a.type], `oaspect:${a.id}`, `${outerHit(a.a)} ${outerHit(a.b)}`);
      }
    }
    // Conjunctions between two natal bodies: yokes under their glyphs, from
    // disc to disc, nested in lanes (a stellium's reads as brackets).
    const shownAt = new Map<string, number>();
    for (const p of placed) shownAt.set(natalHl(p.id), p.display);
    const natal = (hl: string) => hl.startsWith("planet:") || hl.startsWith("angle:");
    const conj = rows.filter((r) => r.a.type === "conjunction");
    const underGlyphs = conj.filter((r) => r.ends.split(" ").every(natal));
    const step = YOKE_STEP[fit];
    const glyphSpans = underGlyphs.map((r) => {
      const [ha, hb] = r.ends.split(" ");
      return yokeSpan(shownAt.get(ha) ?? r.e1, shownAt.get(hb) ?? r.e2);
    });
    const glyphLanes = yokeLanes(glyphSpans, YOKE_LANES[fit]);
    underGlyphs.forEach((r, i) => {
      const [ha, hb] = r.ends.split(" ");
      // The end the yoke leaves going round in zodiac order comes first.
      const [first, second] = turn(shownAt.get(ha) ?? r.e1, shownAt.get(hb) ?? r.e2) >= 0 ? [ha, hb] : [hb, ha];
      const lane = glyphLanes[i];
      const rr = R_PLANET - PLANET_DISK - YOKE_IN[fit] - lane * step;
      // Up into a planet's disc; an angle's axis crosses the lane itself.
      const top = (hl: string) => (hl.startsWith("planet:") ? R_PLANET - PLANET_DISK + YOKE_TUCK : rr);
      r.yoke = yokeGeo(glyphSpans[i], [top(first), top(second)], rr, lane, asc);
      r.underAt = { span: glyphSpans[i], r: rr };
    });
    // Every line lands exactly on its bodies' degrees on the aspect circle,
    // on the dot each body has there (the ends taper to a point so the lines
    // meeting at a body stay apart). The other conjunctions (across the rings,
    // between outer bodies) hang from those degrees, nested the same way.
    const atDegrees = conj.filter((r) => !r.yoke);
    const degreeSpans = atDegrees.map((r) => yokeSpan(r.e1, r.e2));
    const degreeLanes = yokeLanes(degreeSpans, YOKE_LANES[fit]);
    atDegrees.forEach((r, i) => {
      const lane = degreeLanes[i];
      r.yoke = yokeGeo(degreeSpans[i], [R_ASPECT, R_ASPECT], R_ASPECT - YOKE_IN[fit] - lane * step, lane, asc);
    });
    // Glyphs at rest (the switch under the chart shows them): each line's
    // glyph slid along its line clear of the others, the tightest orbs
    // choosing first; a line with no room left shows its glyph on hover only.
    {
      const taken: { x: number; y: number }[] = [];
      for (const r of [...rows].sort((x, y) => x.a.orb - y.a.orb)) {
        if (r.yoke) continue;
        if (Math.hypot(r.p2.x - r.p1.x, r.p2.y - r.p1.y) < REST_MARK_MIN_LEN) continue;
        for (const t of [0.5, 0.4, 0.6, 0.32, 0.68, 0.26, 0.74]) {
          const q = { x: r.p1.x + (r.p2.x - r.p1.x) * t, y: r.p1.y + (r.p2.y - r.p1.y) * t };
          if (taken.every((m) => Math.hypot(m.x - q.x, m.y - q.y) >= REST_MARK_GAP)) {
            taken.push(q);
            r.restMark = q;
            break;
          }
        }
      }
    }
    // Entrance order: the tightest orb draws itself first.
    const byOrb = [...rows].sort((x, y) => x.a.orb - y.a.orb);
    const ranked = rows.map((r) => ({ ...r, rank: byOrb.indexOf(r) }));
    // Painted widest first: the tightest aspects lie on top.
    return ranked.sort((x, y) => y.a.orb - x.a.orb);
  }, [
    placed,
    fit,
    showNatalLayer,
    showCrossLayer,
    showOuterLayer,
    chart.aspects,
    crossAspects,
    outerAspects,
    bodies,
    transits,
    visible,
    filter,
    asc,
    synastryMode,
    crossPrefix,
    natalHl,
    outerHit,
    R_NATAL_CHORD,
    R_CROSS_CHORD,
    R_OUTER_CHORD,
  ]);
  /** The aspect types on the wheel: one mark template each (wheel-focus.ts copies it). */
  const markTypes = useMemo(() => [...new Set(chords.map((r) => r.a.type))], [chords]);
  /**
   * What a line says when the pointer rests on it (the Ulune tooltip, and the
   * line's accessible name): its bodies and type, orb, and whether it is
   * closing or opening.
   */
  const aspectTips = useMemo(() => {
    // On a bi-wheel a line says which rings it joins ("Transits × Your
    // chart: …"), in the order its bodies are named.
    const outer = synastryMode
      ? t("wheelRingOuter")
      : progressedMode
        ? t("progressionLegendOuter")
        : t("transitLegendOuter");
    const inner = synastryMode ? t("wheelRingInner") : t("transitLegendInner");
    const colon = locale === "fr" ? "\u202f: " : ": ";
    const m = new Map<string, string>();
    for (const { a, focusId } of chords) {
      const orb = formatArc(a.orb);
      const dir = a.applying === true ? ` · ${t("applying")}` : a.applying === false ? ` · ${t("separating")}` : "";
      const tag = !showTransits
        ? ""
        : focusId.startsWith(`${crossPrefix}:`)
          ? synastryMode
            ? `${inner} × ${outer}`
            : `${outer} × ${inner}`
          : focusId.startsWith("oaspect:")
            ? outer
            : inner;
      m.set(
        focusId,
        `${tag ? tag + colon : ""}${t("aspectTooltip", { phrase: aspectLinkPhrase(a.a, a.type, a.b, locale), orb })}${dir}`,
      );
    }
    return m;
  }, [chords, locale, t, showTransits, synastryMode, progressedMode, crossPrefix]);
  const aspectTipsRef = useRef(aspectTips);
  aspectTipsRef.current = aspectTips;
  useEffect(() => () => hideWheelTip(), []);
  /** Where the yokes under the glyphs run (the degree labels, house numbers and their marks keep clear of them). */
  const yokeDots = useMemo<Disc[]>(() => {
    const out: Disc[] = [];
    for (const row of chords) {
      if (row.yoke && row.yoke.r > R_ASPECT) for (const p of row.yoke.pts) out.push({ x: p.x, y: p.y, r: 1.5 });
    }
    return out;
  }, [chords]);
  /**
   * Where the cusp degrees can go: along each cusp's inner end, on its house's
   * side of the line or the other (desktop-sized wheels; a cusp an angle falls
   * on is named by the angle already). `cuspDegs` picks the side.
   */
  const cuspDegSpots = useMemo(() => {
    if (fit !== "lg" || timeUnknown) return [];
    const onAngle = (ecl: number) =>
      (["ascendant", "midheaven", "descendant", "ic"] as const).some((k) => {
        const a = chart.angles[k];
        return a != null && Math.abs(((((a.ecliptic - ecl) % 360) + 540) % 360) - 180) < 0.5;
      });
    return chart.houses.flatMap((house) => {
      if (house.uncertain === true || onAngle(house.ecliptic)) return [];
      const p0 = polar(house.ecliptic, R_ASPECT + CUSP_DEG_IN, asc);
      const p1 = polar(house.ecliptic, R_ASPECT + CUSP_DEG_IN + 10, asc);
      const q = polar(house.ecliptic + 1, R_ASPECT + CUSP_DEG_IN, asc);
      const nl = Math.hypot(q.x - p0.x, q.y - p0.y) || 1;
      const deg = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
      const flip = Math.cos((deg * Math.PI) / 180) < 0;
      // The text runs out along the cusp from `at` either way (a flipped one ends there).
      const len = house.formatted.length * 0.6 * CUSP_DEG_FONT;
      const ux = Math.cos((deg * Math.PI) / 180);
      const uy = Math.sin((deg * Math.PI) / 180);
      const sides = [1, -1].map((side) => {
        const at = { x: p0.x + ((q.x - p0.x) / nl) * CUSP_DEG_SIDE * side, y: p0.y + ((q.y - p0.y) / nl) * CUSP_DEG_SIDE * side };
        const box: OBox = { cx: at.x + (ux * len) / 2, cy: at.y + (uy * len) / 2, hw: len / 2 + 1.5, hh: CUSP_DEG_FONT / 2 + 1.5, rot: deg };
        return { at, box };
      });
      return [{ house, deg, flip, sides }];
    });
  }, [fit, timeUnknown, chart.houses, chart.angles, asc]);
  /**
   * Degree labels: each close under its glyph (clear of it grown in focus),
   * or just under the yokes there, touching no other label (wheel-layout.ts).
   */
  const labelAt = useMemo(() => {
    // Each degree along its planet's line, from the glyph toward the aspect
    // circle (part 85a): as thin across as a line of text, so wherever the
    // glyphs fan apart their degrees do too.
    // A degree under a yoke starts below its lane, so the yokes of a
    // stellium never cross the degrees (part 86).
    const lanes = chords.flatMap((c) => (c.underAt ? [c.underAt] : []));
    const out = new Map<string, ReturnType<typeof radialLabel>>();
    for (const p of placed) {
      const spec = labelSpec(p.formatted, p.retrograde, fit);
      let start = PLANET_DISK_GROWN - 1;
      for (const { span, r } of lanes) {
        const half = Math.max(span.len, YOKE_MIN_LEN) / 2 + 0.2;
        if (Math.abs(turn(span.mid, p.display)) <= half) start = Math.max(start, R_PLANET - r + YOKE_CLEAR[fit]);
      }
      out.set(p.id, radialLabel({ x: p.x, y: p.y }, spec.w, start));
    }
    return out;
  }, [placed, fit, chords]);
  /** The degree labels as drawn (house numbers and their marks keep clear of them). */
  const labelBoxes = useMemo<OBox[]>(
    () =>
      placed.flatMap((p) => {
        const place = labelAt.get(p.id);
        if (!place) return [];
        const spec = labelSpec(p.formatted, p.retrograde, fit);
        return [{ cx: place.x, cy: place.y, hw: spec.w / 2, hh: spec.h / 2, rot: place.rot }];
      }),
    [placed, labelAt, fit],
  );
  /** Where each house number's text goes so its digits' ink is centred in its disc (text-ink.ts; null until the font is in). */
  const inkVersion = useTextInkVersion();
  const numInk = useMemo(() => {
    const stack = cssVar("--font-mono", MONO_STACK);
    const at = new Map<number, { x: number; y: number } | null>();
    return (n: number) => {
      if (!at.has(n)) {
        const ink = inkVersion ? textInk(stack, 600, String(n)) : null;
        at.set(n, ink ? { x: Number((ink.dx * HOUSE_NUM_FONT).toFixed(3)), y: Number((ink.dy * HOUSE_NUM_FONT).toFixed(3)) } : null);
      }
      return at.get(n) ?? null;
    };
  }, [inkVersion]);
  /** House numbers: in the middle of their house, clear of the planets' discs, the yokes under them and their degrees. */
  const badgeAt = useMemo(() => {
    return placeBadges(
      chart.houses.map((h, i) => {
        const next = chart.houses[(i + 1) % chart.houses.length];
        const span = ((next.ecliptic - h.ecliptic) % 360 + 360) % 360;
        return { id: String(h.id), from: h.ecliptic, to: next.ecliptic, mid: (h.ecliptic + span / 2) % 360 };
      }),
      (e, r) => polar(e, r, asc),
      { r: R_HOUSE_NUM, rIn: R_ASPECT + HOUSE_NUM_R + 1, radius: HOUSE_NUM_R, discs: [...glyphDiscs, ...yokeDots], boxes: labelBoxes },
    );
  }, [chart.houses, asc, glyphDiscs, yokeDots, labelBoxes]);
  const numbers = useMemo<OBox[]>(
    () => [...badgeAt.values()].map((b) => ({ cx: b.x, cy: b.y, hw: HOUSE_NUM_R, hh: HOUSE_NUM_R, rot: 0 })),
    [badgeAt],
  );
  /**
   * The cusp degrees as written: each on its house's side of the cusp, or
   * where a degree label covers it there, the other side; covered there too,
   * it is not written (the table has it). A house number's disc covers it too.
   */
  const cuspDegs = useMemo(
    () =>
      cuspDegSpots.flatMap(({ house, deg, flip, sides }) => {
        const side = sides.find((c) => labelBoxes.every((b) => !boxesOverlap(c.box, b)) && numbers.every((b) => !boxesOverlap(c.box, b)));
        return side ? [{ house, at: side.at, deg, flip }] : [];
      }),
    [cuspDegSpots, labelBoxes, numbers],
  );
  const ticks = useMemo(
    () => ({
      fine: tickPath(0, 360, 1, R_TICK_1, R_TICK_OUT, asc),
      mid: tickPath(0, 360, 5, R_TICK_5, R_TICK_OUT, asc),
      coarse: tickPath(0, 360, 10, R_TICK_10, R_TICK_OUT, asc),
    }),
    [asc],
  );
  const outerTicks = useMemo(
    () =>
      showTransits
        ? {
            fine: tickPath(0, 360, 1, R_OUTER, R_XTICK_1, asc),
            mid: tickPath(0, 360, 5, R_OUTER, R_XTICK_5, asc),
            coarse: tickPath(0, 360, 10, R_OUTER, R_XTICK_10, asc),
          }
        : null,
    [asc, showTransits],
  );
  const wheelKey = `${chart.meta.date}|${chart.meta.time}|${chart.meta.latitude}|${chart.meta.longitude}|${synastryMode ? "s" : progressedMode ? "p" : showTransits ? "t" : "n"}`;
  /** The angles' names: outside the zodiac; on a double wheel, between the pins and the outer ring's glyphs. */
  const angleLabelR = showTransits ? R_OUTER + 27 : R_OUTER + 24;
  /** Cusp degrees are written on desktop-sized wheels (a phone wheel has no room for them): `cuspDegs`. */
  const cuspDegrees = fit === "lg";
  const flagsMap = chart.patterns.flags ?? {};
  const shownStars = useMemo(
    () => (chart.stars ?? []).filter((s) => starVisible.has(s.id)),
    [chart, starVisible],
  );
  const shownMids = useMemo(
    () => (chart.midpoints ?? []).filter((m) => midpointVisible.has(m.id)),
    [chart, midpointVisible],
  );
  /** The aspects the wheel draws, for the count strip. */
  const stripRows = useMemo(() => chords.map((r) => ({ id: r.a.id, type: r.a.type })), [chords]);
  /** The natal aspects the wheel draws, for the grid beside it on wide stages. */
  const gridRows = useMemo<GridRow[]>(
    () =>
      chords
        .filter((r) => r.focusId.startsWith("aspect:"))
        .map((r) => ({ id: r.focusId, aspect: r.a.id, type: r.a.type, a: r.a.a, b: r.a.b, orb: r.a.orb })),
    [chords],
  );
  /** Aspect types the filter hides that this chart has (the strip can show them again). */
  const hiddenTypes = useMemo(() => {
    const out = new Map<AspectId, number>();
    const probe = (a: AspectLink) => {
      if (filter.types.has(a.type)) return;
      if (!visible.has(a.a) || !visible.has(a.b)) return;
      if (!aspectVisible(a, { ...filter, types: new Set([a.type]) })) return;
      out.set(a.type, (out.get(a.type) ?? 0) + 1);
    };
    if (showNatalLayer) chart.aspects.forEach(probe);
    if (showCrossLayer) (crossAspects ?? []).forEach(probe);
    if (showOuterLayer) outerAspects.forEach(probe);
    return out;
  }, [filter, visible, chart.aspects, crossAspects, outerAspects, showNatalLayer, showCrossLayer, showOuterLayer]);
  const configMembers = useMemo(() => {
    if (!overlayOn(overlays, "configurations") || overlays.configs.size === 0) return null;
    const set = new Set<string>();
    for (const c of chart.patterns.configurations ?? []) {
      if (!overlays.configs.has(c.id)) continue;
      for (const m of c.members) set.add(m);
      if (c.apex) set.add(c.apex);
    }
    return set.size ? set : null;
  }, [overlays, chart]);

  const focusCtx = useMemo<WheelFocusCtx>(
    () => ({
      chart,
      visible,
      filter,
      bodies,
      shownPlanets,
      shownStars,
      shownMids,
      configMembers,
      crossAspects: showCrossLayer ? (crossAspects ?? null) : null,
      outerAspects: showOuterLayer ? outerAspects : null,
      outerKind,
      aspectLayer: layer,
      outerBodies: (transits ?? [])
        .filter((p) => visible.has(p.id))
        .map((p) => ({ id: p.id, sign: p.sign, ecliptic: p.ecliptic })),
    }),
    [chart, visible, filter, bodies, shownPlanets, shownStars, shownMids, configMembers, crossAspects, outerAspects, outerKind, layer, showCrossLayer, showOuterLayer, transits],
  );
  ctxRef.current = focusCtx;
  geometryRef.current = {
    cx: CX,
    cy: CY,
    asc,
    rOuter: R_OUTER,
    rSignIn: R_SIGN_IN,
    rDecanIn: R_DECAN_IN,
    rAspect: R_ASPECT,
    outer: showTransits ? { rIn: R_OUTER, rOut: R_TRANSIT + TRANSIT_DISK + 6 } : null,
    houses: chart.houses.map((h, i) => ({ id: h.id, ecl0: h.ecliptic, ecl1: chart.houses[(i + 1) % chart.houses.length].ecliptic })),
  };

  paintNowRef.current = (hover) => {
    const svg = svgRef.current;
    const ctx = ctxRef.current;
    if (!svg || !ctx) return;
    const view3d = view3dRef.current;
    const roots = view3d ? view3d.paintRoots() : [];
    // With the 3D view on stage the live chart is hidden under it: it is not
    // painted (the view is handed the focus itself). It is painted again as
    // the view closes.
    const paintLive = !view3d?.onStage();
    const selected = selectedIdRef.current;
    // A click pins the highlight until it is cleared. Hover only previews
    // when nothing is selected.
    const preview = previewIdRef.current;
    const focusId = selected ?? hover ?? preview;
    const focus = resolveWheelFocus(focusId, ctx);
    // The flat chart answers at once: no fade, no rise, nothing waits (part 82).
    if (paintLive) {
      const cache = cacheRef.current ?? (cacheRef.current = cacheWheelPaint(svg, roots));
      paintWheelFocus(svg, cache, focus, selected, roots, { marks: getWheelPrefs().marks });
    }
    const depth = depthRef.current;
    if (!depth) return;
    structureDirtyRef.current = false;
    if (view3d) {
      // In the 3D view, depth comes from the strata: bodies rise on their
      // stems and the lit aspects stand up as arcs, ranked like the flat
      // chart's focus: the focus itself, what it directly involves, what
      // those touch (wheel-rank.ts).
      const outerPrefix = synastryMode ? "partner" : progressedMode ? "progressed" : "transit";
      const rank = rankWheelFocus(focus, ctx);
      view3d.setFocus(focus, rankedIds(rank, outerPrefix), rank.aspects, Boolean(selected));
    }
  };
  paintApi.current.refresh = () => paintNowRef.current(hoverIdRef.current);

  useEffect(() => {
    // A press anywhere off the chart and its companions lets go of the pin, at once.
    const onDoc = (e: PointerEvent) => {
      const selected = selectedIdRef.current;
      if (!selected) return;
      const node = e.target;
      if (!(node instanceof Element)) return;
      if (node.closest("[data-chart-pick]")) return;
      chooseRef.current(selected);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [selectedIdRef]);

  // When the outer ring jumps in time (Now, a new date, another partner) its
  // bodies glide round the ring to where they now stand, glyphs and labels
  // kept upright, and the aspects that hang on them fade back in once they
  // land. Scrubbing (updates in quick succession) follows directly.
  const outerWasRef = useRef<{ svg: SVGSVGElement | null; at: Map<string, number>; t: number } | null>(null);
  /** Ends a glide's hold on the arriving lines' own animations (styles.css, data-gliding). */
  const glideEndRef = useRef(0);
  useEffect(() => () => window.clearTimeout(glideEndRef.current), []);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const now = performance.now();
    const was = outerWasRef.current;
    const at = new Map(transitPlaced.map((p) => [p.id, p.display]));
    outerWasRef.current = { svg, at, t: now };
    if (!svg || !was || was.svg !== svg || now - was.t < 320 || prefersReducedMotion() || view3dRef.current?.entered) return;
    const easing = "cubic-bezier(0.65, 0, 0.35, 1)";
    const ms = 900;
    let moved = false;
    for (const [id, d] of at) {
      const from = was.at.get(id);
      if (from == null) continue;
      // The ring runs counter-clockwise on screen: back by the shortest way.
      const delta = ((((d - from) % 360) + 540) % 360) - 180;
      if (Math.abs(delta) < 0.3) continue;
      moved = true;
      const sel = `[data-transit="${id}"]`;
      for (const el of svg.querySelectorAll<SVGGraphicsElement>(`[data-kind="transit"]${sel}, [data-kind="tlead"]${sel}, [data-kind="tpin"]${sel}`)) {
        const pivot = (node: SVGGraphicsElement, box: string, origin: string) => {
          node.style.transformBox = box;
          node.style.transformOrigin = origin;
          return () => {
            node.style.transformBox = "";
            node.style.transformOrigin = "";
          };
        };
        const done = pivot(el, "view-box", `${CX}px ${CY}px`);
        el.animate([{ transform: `rotate(${delta}deg)` }, { transform: "rotate(0deg)" }], { duration: ms, easing }).onfinish = done;
        // Glyph and degree label stay upright on the way round, each turning
        // around its own centre — given as a point: WebKit ignores
        // transform-box: fill-box on text and would swing the label wide.
        for (const part of el.querySelectorAll<SVGGraphicsElement>(":scope > rect, :scope > text, .ulune-glyph-scale")) {
          let undo = () => {};
          if (!part.classList.contains("ulune-glyph-scale")) {
            const n = (a: string) => Number(part.getAttribute(a) ?? 0);
            const c = part.tagName.toLowerCase() === "rect" ? { x: n("x") + n("width") / 2, y: n("y") + n("height") / 2 } : { x: n("x"), y: n("y") };
            undo = pivot(part, "view-box", `${c.x.toFixed(2)}px ${c.y.toFixed(2)}px`);
          }
          part.animate([{ rotate: `${-delta}deg` }, { rotate: "0deg" }], { duration: ms, easing }).onfinish = undo;
        }
      }
    }
    if (!moved) return;
    // The cross aspects wait for the bodies and fade in as they arrive. Held
    // back by a delay rather than keyframes at 0: a held value costs nothing
    // per frame, and the lines were restyled on every frame of the glide.
    for (const g of svg.querySelectorAll<SVGGElement>('g[data-aspect][data-hl^="taspect:"], g[data-aspect][data-hl^="saspect:"], g[data-aspect][data-hl^="paspect:"], g[data-aspect][data-hl^="oaspect:"]')) {
      g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: (ms + 250) * 0.3, delay: (ms + 250) * 0.7, easing: "linear", fill: "backwards" });
    }
    // The lines that appear with the jump take that fade: their own arrival
    // (fading in, drawing themselves) would play unseen under it, on every
    // frame of the glide (styles.css).
    svg.setAttribute("data-gliding", "");
    window.clearTimeout(glideEndRef.current);
    glideEndRef.current = window.setTimeout(() => svg.removeAttribute("data-gliding"), ms + 250);
  }, [transitPlaced]);

  // Cinematic entrance: a fresh wheel (a new chart, another mode) assembles
  // itself — the zodiac sweeping in from the Ascendant, the houses, the
  // planets in a wave, then the aspects drawing themselves, tightest orb first
  // (styles.css, the motion plan). Declared first: the attribute
  // must be there before anything computes the fresh wheel's styles.
  // A returning reader's first view already shows this wheel's zodiac and
  // houses (lib/first-view.ts): the natal wheel's first mount takes over from
  // it, and only the planets and lines fly in.
  const firstViewRef = useRef(firstView);
  firstViewRef.current = firstView;
  /** Whether this wheel builds or settles, decided once for its key (an effect run again keeps it). */
  const entranceRef = useRef<{ key: string; full: boolean } | null>(null);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handoff = firstViewRef.current ? claimFirstView(svg) : null;
    if (prefersReducedMotion()) {
      handoff?.done();
      return;
    }
    // The full build once per chart and kind of wheel in a visit; seen
    // before (another mode, back to it, the table and back), it settles in
    // (lib/settle.ts). A build cut short by a quick switch plays whole again.
    const sight = `wheel|${wheelKey}`;
    if (entranceRef.current?.key !== wheelKey) {
      entranceRef.current = { key: wheelKey, full: !seenBefore(sight) || Boolean(handoff) };
    }
    if (!entranceRef.current.full) {
      const stop = settleIn(svg, { scale: 0.985 });
      handoff?.done();
      return stop;
    }
    svg.setAttribute("data-entering", "");
    const started = performance.now();
    const id = window.setTimeout(() => {
      svg.removeAttribute("data-entering");
      markSeen(sight);
      handoff?.done();
    }, WHEEL_ENTER_MS);
    return () => {
      window.clearTimeout(id);
      svg.removeAttribute("data-entering");
      if (performance.now() - started >= WHEEL_SEEN_AFTER_MS) markSeen(sight);
      handoff?.done();
    };
  }, [wheelKey]);

  // An aspect already on the wheel never plays its arrival again. When the
  // list reorders around it (a time step brings other cross aspects), React
  // moves its node, and a moved node starts its CSS animations over: a
  // transit step redrew most of the natal lines. Each aspect is marked once
  // its own arrival is over (styles.css, data-seen). After the entrance's
  // effect: a fresh wheel's lines are marked once its entrance is over.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const fresh = [...svg.querySelectorAll("g[data-aspect][data-hl]:not([data-seen])")];
    if (!fresh.length) return;
    const wait = svg.hasAttribute("data-entering") ? WHEEL_ENTER_MS : ASPECT_ARRIVE_MS;
    window.setTimeout(() => {
      for (const g of fresh) if (g.isConnected) g.setAttribute("data-seen", "");
    }, wait);
  }, [chords]);

  // Keep the resting wheel for the next visit's first view: once its
  // entrance is over and the page is idle, and again when the page is hidden
  // or left (so it shows the latest theme, Look and layout).
  useEffect(() => {
    const svg = svgRef.current;
    if (!firstView || !svg) return;
    const save = () => captureFirstView(svg, firstView);
    const onHidden = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", save);
    let tries = 0;
    let stopIdle = () => {};
    let retry = 0;
    const attempt = () => {
      stopIdle = whenIdle(() => {
        // Busy (in focus, zoomed, in 3D): look again a little later.
        if (!save() && ++tries < 5) retry = window.setTimeout(attempt, 4000);
      }, 4000);
    };
    const start = window.setTimeout(attempt, WHEEL_ENTER_MS + 400);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", save);
      window.clearTimeout(start);
      window.clearTimeout(retry);
      stopIdle();
    };
  }, [firstView, wheelKey]);

  // One depth controller per wheel; the base SVG is re-attached on remount.
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const stack = stackRef.current;
    if (!scene || !stack) return;
    const depth = new DepthController(scene, stack, WHEEL_DEPTH_ADAPTER, {
      reducedMotion: prefersReducedMotion,
      // The 3D view draws with WebGL: the live chart stays flat under it.
      cssCamera: false,
    });
    depth.setTiltRange(CAMERA_RX_MIN, CAMERA_RX_MAX);
    depthRef.current = depth;
    // The mouse wheel (or a trackpad pinch) zooms the 3D view around the
    // pointer; the flat chart leaves it to the page (and the zoom port).
    const onWheel = (e: WheelEvent) => {
      if (!view3dRef.current?.entered) return;
      e.preventDefault();
      e.stopPropagation();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scene.clientHeight || 600 : 1;
      const dy = Math.max(-240, Math.min(240, e.deltaY * unit));
      // A pinch arrives as ctrl + small steps: let it zoom faster.
      depth.zoomLens(2 ** (-dy / (e.ctrlKey ? 110 : 420)), { x: e.clientX, y: e.clientY });
    };
    scene.addEventListener("wheel", onWheel, { passive: false });
    // A pan with the right button: no context menu when it moved.
    const onMenu = (e: MouseEvent) => {
      if (!panMenuRef.current) return;
      panMenuRef.current = false;
      e.preventDefault();
    };
    scene.addEventListener("contextmenu", onMenu);
    const offPrefs = subscribeDepthPrefs(() => paintNowRef.current(hoverIdRef.current));
    // The switches under the chart: with highlighting on hover off, what the
    // pointer (or a panel) was lighting lets go at once; the glyphs follow theirs.
    const offWheelPrefs = subscribeWheelPrefs(() => {
      if (!getWheelPrefs().hover) {
        previewIdRef.current = null;
        clearHoverRef.current();
        hideWheelTip();
      }
      paintNowRef.current(hoverIdRef.current);
    });
    const offPreview = onChartPreview((id) => {
      // A panel's preview is a hover too: none while highlighting on hover is off.
      previewIdRef.current = getWheelPrefs().hover ? id : null;
      paintNowRef.current(hoverIdRef.current);
    });
    const offReset = onDepthReset(() => view3dRef.current?.resetCamera());
    return () => {
      scene.removeEventListener("wheel", onWheel);
      scene.removeEventListener("contextmenu", onMenu);
      offPrefs();
      offWheelPrefs();
      offPreview();
      offReset();
      view3dRef.current?.destroy();
      view3dRef.current = null;
      depth.destroy();
      depthRef.current = null;
    };
  }, []);

  /** Enter or leave the 3D view to match the device preference. */
  const syncView3dRef = useRef<() => void>(() => {});
  syncView3dRef.current = () => {
    const depth = depthRef.current;
    const svg = svgRef.current;
    if (!depth || !svg) return;
    const want = getDepthPrefs().view === "3d";
    const cur = view3dRef.current;
    const scene = sceneRef.current;
    if (want) {
      if (cur && cur.entered) return;
      // The 3D view is its own download: once it lands, try again (if 3D is
      // still wanted and this wheel still stands); if it cannot load, flat.
      const mod = view3dNow();
      if (!mod) {
        loadView3D().then(
          () => syncView3dRef.current(),
          () => setDepthPrefs({ view: "flat" }),
        );
        return;
      }
      if (cur) cur.destroy();
      const v = new mod.WheelView3D(
        depth,
        svg,
        {
          geometry: () => geometryRef.current as Wheel3DGeometry,
          // No WebGL here (or it was lost for good): back to the flat chart.
          failed: () => setDepthPrefs({ view: "flat" }),
          rebuilt: () => {
            cacheRef.current = null;
            paintNowRef.current(hoverIdRef.current);
          },
          // The 3D layers are pictures of the chart at rest: paint the focus
          // off for the moment of the copy (nothing is drawn in between).
          rest: <T,>(fn: () => T): T => {
            const base = svgRef.current;
            const ctx = ctxRef.current;
            if (!base || !ctx) return fn();
            const roots = view3dRef.current?.paintRoots() ?? [];
            const cache = cacheRef.current ?? (cacheRef.current = cacheWheelPaint(base, roots));
            paintWheelFocus(base, cache, resolveWheelFocus(null, ctx), null, roots);
            try {
              return fn();
            } finally {
              paintNowRef.current(hoverIdRef.current);
            }
          },
        },
        prefersReducedMotion,
      );
      view3dRef.current = v;
      // For QA: the view and its camera, reachable from the page.
      if (scene && qaHandles()) Object.assign(scene, { __uluneView3d: v, __uluneDepth: depth });
      scene?.setAttribute("data-depth-view", "3d");
      clearHoverRef.current();
      v.enter();
      cacheRef.current = null;
      paintNowRef.current(hoverIdRef.current);
    } else if (cur && cur.entered) {
      scene?.setAttribute("data-depth-view", "flat");
      // A sprite that was under the pointer is about to vanish without a
      // pointerleave: let go of its hover now, or it would stay lifted.
      clearHoverRef.current();
      cur.exit(() => {
        if (view3dRef.current === cur) view3dRef.current = null;
        dropQaHandle(scene, cur);
        cacheRef.current = null;
        structureDirtyRef.current = true;
        paintNowRef.current(hoverIdRef.current);
      });
      cacheRef.current = null;
      paintNowRef.current(hoverIdRef.current);
    }
  };
  useEffect(() => subscribeDepthPrefs(() => syncView3dRef.current()), []);

  // Recache only when the SVG structure actually changes — not on every
  // parent render, and not when selection is painted through the wrapper.
  useLayoutEffect(() => {
    cacheRef.current = null;
    const depth = depthRef.current;
    const svg = svgRef.current;
    const v = view3dRef.current;
    if (depth && svg && depth.getBase() !== svg && v) {
      // The SVG remounted (new chart or mode): the 3D view follows it — it
      // keeps showing the last picture until the new one is drawn (no flat
      // flash in between).
      if (v.entered) v.setBase(svg);
      else {
        v.destroy();
        dropQaHandle(sceneRef.current, v);
        view3dRef.current = null;
      }
    }
    depth?.setBase(svg);
    if (view3dRef.current?.entered) view3dRef.current.rebuild();
    else syncView3dRef.current();
    structureDirtyRef.current = true;
    paintNowRef.current(hoverIdRef.current);
  }, [
    chart,
    visible,
    filter,
    overlays,
    lookPlanets,
    strokeScale,
    transits,
    crossAspects,
    locale,
    starVisible,
    midpointVisible,
    wheelKey,
    layer,
    chords,
    fit,
  ]);

  // A Look colour reaches the flat wheel at once through its CSS variable. The
  // 3D view paints colours into its pictures, so it redraws once the change
  // has settled (not on every slider tick).
  useEffect(() => {
    if (!lookPaintRev) return;
    const v = view3dRef.current;
    if (v?.entered) v.rebuild();
  }, [lookPaintRev]);

  // A theme switch changes the colours (CSS variables) and the lines'
  // opacities, which the focus paint writes for the theme: the wheel is
  // repainted inside the switch's cross-fade, never re-rendered (performance
  // plan 2.6). The 3D view paints colours into its pictures: it redraws.
  useEffect(
    () =>
      onThemeApplied(() => {
        structureDirtyRef.current = true;
        const v = view3dRef.current;
        if (v?.entered) v.rebuild();
        paintNowRef.current(hoverIdRef.current);
      }),
    [],
  );

  // Keyboard path only — pointer targeting is resolved geometrically by the
  // svg-level handlers below, so glyphs never fight over overlapping DOM
  // hit areas.
  // One identity for the wheel's life (it only reaches refs), so the
  // memoized zodiac is not rebuilt by every render.
  const hoverProps = useCallback(
    (id: string) => ({
      // Out of the Tab order: the wheel is one stop, its parts a list the
      // arrows walk (WheelKeys). Focus by script still lights them.
      tabIndex: -1,
      onFocus: (e: ReactFocusEvent<SVGElement>) => {
        hoverIdRef.current = id;
        paintNowRef.current(id);
        // Walking the chart with Tab in 3D turns each body to the front.
        turnRef.current(id);
        // A line reached with Tab says what it is, by its glyph's place.
        const tip = aspectTipsRef.current.get(id);
        const at = tip ? e.currentTarget.getAttribute("data-mark-at")?.split(" ").map(Number) : null;
        const m = at && at.length === 2 ? svgRef.current?.getScreenCTM() : null;
        if (tip && at && m) showWheelTip(tip, m.a * at[0] + m.c * at[1] + m.e, m.b * at[0] + m.d * at[1] + m.f);
      },
      onBlur: () => {
        hideWheelTip();
        if (hoverIdRef.current !== id) return;
        hoverIdRef.current = null;
        paintNowRef.current(null);
      },
      onKeyDown: (e: ReactKeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pickRef.current();
          onSelectRef.current(id);
        }
      },
    }),
    [],
  );

  // Geometric hit model: every point target (glyphs, degree labels, angle
  // markers) plus every aspect segment, in wheel coordinates.
  const hitModel = useMemo(() => {
    const points: HitTarget[] = [];
    // A label's box (a turned one is taken as its turned bounds).
    const labelBox = (place: LabelPlace | undefined, fallback: { x: number; y: number }, w: number, h: number) => {
      const at = place ?? fallback;
      const turned = place && Math.abs(Math.sin((place.rot * Math.PI) / 180)) > 0.5;
      return { x: at.x, y: at.y, hw: turned ? h / 2 : w / 2, hh: turned ? w / 2 : h / 2 };
    };
    for (const p of placed) {
      points.push({ id: `planet:${p.id}`, x: p.x, y: p.y, core: PLANET_DISK });
      const spec = labelSpec(p.formatted, p.retrograde, fit);
      const b = labelBox(labelAt.get(p.id), polar(p.display, R_LABEL, asc), spec.w, spec.h);
      points.push({ id: `planet:${p.id}`, x: b.x, y: b.y, core: 0, hw: b.hw, hh: b.hh });
    }
    for (const p of transitPlaced) {
      points.push({ id: outerHit(p.id), x: p.x, y: p.y, core: TRANSIT_DISK });
      const spec = transitLabelSpec(p.formatted, p.retrograde, fit);
      const b = labelBox(transitLabelAt.get(p.id), polar(p.display, R_TRANSIT_LABEL, asc), spec.w, spec.h);
      points.push({ id: outerHit(p.id), x: b.x, y: b.y, core: 0, hw: b.hw, hh: b.hh });
    }
    for (const s of shownStars) {
      const pt = polar(s.ecliptic, showTransits ? R_XTICK_10 + 5 : R_STAR, asc);
      points.push({ id: `star:${s.id}`, x: pt.x, y: pt.y, core: 8 });
    }
    for (const m of shownMids) {
      const pt = polar(m.ecliptic, R_PLANET, asc);
      points.push({ id: `mp:${m.id}`, x: pt.x, y: pt.y, core: 8 });
    }
    // House number discs are point targets too — otherwise a nearby planet's
    // core would swallow them.
    for (let i = 0; i < chart.houses.length; i += 1) {
      const h = chart.houses[i];
      const n = chart.houses[(i + 1) % 12];
      const span = ((n.ecliptic - h.ecliptic) % 360 + 360) % 360;
      const mid = badgeAt.get(String(h.id)) ?? polar((h.ecliptic + span / 2) % 360, R_HOUSE_NUM, asc);
      points.push({ id: `house:${h.id}`, x: mid.x, y: mid.y, core: HOUSE_NUM_R });
    }
    for (const key of ["ascendant", "midheaven", "descendant", "ic"] as const) {
      if (!visible.has(key)) continue;
      const tip = polar(chart.angles[key].ecliptic, R_OUTER + 8, asc);
      points.push({ id: `angle:${key}`, x: tip.x, y: tip.y, core: 8 });
      const lp = polar(chart.angles[key].ecliptic, angleLabelR, asc);
      points.push({ id: `angle:${key}`, x: lp.x, y: lp.y, core: 0, hw: 16, hh: 8 });
    }
    const segs: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const row of chords) {
      const y = row.yoke;
      if (y) {
        for (let i = 1; i < y.pts.length; i += 1) {
          segs.push({ id: row.focusId, x1: y.pts[i - 1].x, y1: y.pts[i - 1].y, x2: y.pts[i].x, y2: y.pts[i].y });
        }
        continue;
      }
      segs.push({ id: row.focusId, x1: row.p1.x, y1: row.p1.y, x2: row.p2.x, y2: row.p2.y });
    }
    if (!biWheel && overlayOn(overlays, "receptions")) {
      for (const r of chart.patterns.receptions ?? []) {
        if (!visible.has(r.a) || !visible.has(r.b)) continue;
        const pa = bodies.find((b) => b.id === r.a);
        const pb = bodies.find((b) => b.id === r.b);
        if (!pa || !pb) continue;
        const p1 = polar(pa.ecliptic, R_ASPECT, asc);
        const p2 = polar(pb.ecliptic, R_ASPECT, asc);
        const id = `reception:${[r.a, r.b].sort().join("-")}`;
        segs.push({ id, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      }
    }
    return { points, segs };
  }, [placed, transitPlaced, chart, visible, bodies, asc, showTransits, angleLabelR, shownStars, shownMids, overlays, biWheel, chords, outerHit, fit, labelAt, transitLabelAt, badgeAt]);

  // Nearest-target-wins hit test: landing on a painted mark beats everything,
  // then aspect lines, then (for a finger) the slop around a mark, then the
  // ring zones: a sign, a decan or a house (the chart's ground). A mouse takes
  // what it is on: no slop round the marks, and lines within a hairline's
  // reach. `unitsPerPx` converts the CSS-pixel slop into wheel units.
  const hitAt = (
    x: number,
    y: number,
    unitsPerPx: number,
    allow: (id: string) => boolean = () => true,
    coarse = true,
  ): { id: string | null; ground: boolean } => {
    let best: HitTarget | null = null;
    let bestD = Infinity;
    for (const pt of hitModel.points) {
      if (!allow(pt.id)) continue;
      const d = targetDist(pt, x, y);
      if (d < bestD) {
        bestD = d;
        best = pt;
      }
    }
    if (best && bestD <= 0) return { id: best.id, ground: false };
    let seg: string | null = null;
    let segD = (coarse ? ASPECT_HIT_PX : ASPECT_HIT_MOUSE_PX) * unitsPerPx;
    for (const s of hitModel.segs) {
      if (!allow(s.id)) continue;
      const d = distToSeg(x, y, s.x1, s.y1, s.x2, s.y2);
      if (d < segD) {
        segD = d;
        seg = s.id;
      }
    }
    if (seg) return { id: seg, ground: false };
    if (coarse && best && bestD <= TOUCH_SLOP_PX * unitsPerPx) return { id: best.id, ground: false };
    const r = Math.hypot(x - CX, y - CY);
    const ccw = ((Math.atan2(y - CY, CX - x) * 180) / Math.PI + 360) % 360;
    const ecl = (asc + ccw) % 360;
    const signIdx = Math.floor(ecl / 30) % 12;
    const signId = `sign:${SIGN_IDS[signIdx]}`;
    if (r >= R_SIGN_IN && r <= R_OUTER && allow(signId)) return { id: signId, ground: true };
    if (r >= R_DECAN_IN && r < R_SIGN_IN) {
      const decanId = `decan:${SIGN_IDS[signIdx]}-${faceIndex(ecl)}`;
      if (allow(decanId)) return { id: decanId, ground: true };
    }
    if (r >= R_ASPECT && r < R_DECAN_IN) {
      for (let i = 0; i < chart.houses.length; i += 1) {
        const h = chart.houses[i];
        const n = chart.houses[(i + 1) % 12];
        const span = ((n.ecliptic - h.ecliptic) % 360 + 360) % 360;
        const off = ((ecl - h.ecliptic) % 360 + 360) % 360;
        if (off < span && allow(`house:${h.id}`)) return { id: `house:${h.id}`, ground: true };
      }
    }
    return { id: null, ground: true };
  };
  const hitTest = (x: number, y: number, unitsPerPx: number, allow?: (id: string) => boolean, coarse = true): string | null =>
    hitAt(x, y, unitsPerPx, allow, coarse).id;

  /**
   * Hit test in the 3D view: the view's own pieces first (planets, aspect
   * tubes and marks, raised blocks — tested where they are drawn), then the
   * surfaces at their heights: the zodiac ring, a bi-wheel's outer ring, the
   * plate.
   */
  const hitTest3D = (clientX: number, clientY: number, coarse = false): string | null => {
    const depth = depthRef.current;
    const v = view3dRef.current;
    if (!depth || !v) return null;
    // A finger reaches a planet from further than a mouse does.
    const own = v.pick(clientX, clientY, coarse);
    if (own) return own;
    const isWeb = (id: string) => /^(aspect|taspect|paspect|saspect|oaspect|reception):/.test(id);
    const isZodiac = (id: string) => id.startsWith("sign:") || id.startsWith("decan:");
    const isSprite = (id: string) => /^(planet|transit|progressed|partner):/.test(id);
    const pz = depth.unproject(clientX, clientY, v.zOf("zodiac"));
    if (pz) {
      const r = Math.hypot(pz.x - CX, pz.y - CY);
      if (r >= R_DECAN_IN && r <= R_OUTER) return hitTest(pz.x, pz.y, pz.unitsPerPx, isZodiac);
    }
    if (showTransits) {
      const po = depth.unproject(clientX, clientY, v.zOf("outerRing"));
      if (po) {
        const r = Math.hypot(po.x - CX, po.y - CY);
        if (r > R_OUTER && r <= R_TRANSIT + TRANSIT_DISK + 6) return hitTest(po.x, po.y, po.unitsPerPx, (id) => id.startsWith("star:"));
      }
    }
    const p0 = depth.unproject(clientX, clientY, 0);
    if (!p0) return null;
    return hitTest(p0.x, p0.y, p0.unitsPerPx, (id) => !isWeb(id) && !isZodiac(id) && !isSprite(id));
  };

  /**
   * The pointer's target, painted in the same moment: on at once, off the
   * moment the pointer leaves it (part 82: nothing lingers). With highlighting
   * on hover switched off, only a click lights the chart.
   */
  const setHover = (id: string | null) => {
    const next = id && getWheelPrefs().hover ? id : null;
    if (next === hoverIdRef.current) return;
    hoverIdRef.current = next;
    announceChartHover(next);
    paintNowRef.current(next);
  };

  /**
   * The 3D chart turns a body to the front (nearest you, the bottom of the
   * view): a body chosen in the panel or a table, or reached with Tab.
   */
  const turnToFront = (id: string | null) => {
    const depth = depthRef.current;
    const svg = svgRef.current;
    if (!id || !depth || !svg || !view3dRef.current?.entered) return;
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
    const halo = svg.querySelector(`[data-hl="${esc}"]:is([data-kind="planet"], [data-kind="transit"]) > .ulune-wheel-halo`);
    const x = Number(halo?.getAttribute("cx"));
    const y = Number(halo?.getAttribute("cy"));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const phi = (Math.atan2(y - CY, x - CX) * 180) / Math.PI;
    const cam = depth.getCamera() ?? CAMERA_DEFAULT;
    depth.setCamera({ rx: cam.rx, rz: 90 - phi });
  };
  const turnRef = useRef(turnToFront);
  turnRef.current = turnToFront;
  useEffect(() => {
    const off = selection.subscribe(() => {
      if (wheelPickRef.current) {
        wheelPickRef.current = false;
        return;
      }
      turnRef.current(selection.get());
    });
    return () => {
      off();
    };
  }, [selection]);
  /** Mark the next pin as the wheel's own (for a moment: a pin that changes nothing leaves no mark behind). */
  const pickFromWheel = () => {
    wheelPickRef.current = true;
    window.setTimeout(() => {
      wheelPickRef.current = false;
    }, 250);
  };
  const pickRef = useRef(pickFromWheel);
  /**
   * A pin from the wheel, a key or a click away: the chart shows it in this
   * very moment (painted straight onto the SVG, the store's own toggle), and
   * the studio (the panel, the strip, the address) follows through `onSelect`
   * once that frame is on screen: the panel takes longer to draw than the
   * chart's highlight, and made the click wait for it.
   */
  const choose = (id: string) => {
    selectedIdRef.current = selectedIdRef.current === id ? null : id;
    paintNowRef.current(hoverIdRef.current);
    window.requestAnimationFrame(() => window.setTimeout(() => onSelectRef.current(id), 0));
  };
  const chooseRef = useRef(choose);
  chooseRef.current = choose;

  // The keyboard's walk through the wheel (WheelKeys): the part reached is
  // lit like a pointed one, turned to the front in 3D, and named by the tip.
  const keysPoint = useCallback((id: string | null, el: Element | null, label: string) => {
    hoverIdRef.current = id;
    paintNowRef.current(id);
    if (!id) {
      hideWheelTip();
      return;
    }
    turnRef.current(id);
    if (!el || view3dRef.current?.entered) {
      hideWheelTip();
      return;
    }
    const at = el.getAttribute("data-mark-at")?.split(" ").map(Number);
    const m = at && at.length === 2 ? svgRef.current?.getScreenCTM() : null;
    if (at && m) {
      showWheelTip(label, m.a * at[0] + m.c * at[1] + m.e, m.b * at[0] + m.d * at[1] + m.f);
    } else {
      const r = el.getBoundingClientRect();
      showWheelTip(label, r.left + r.width / 2, r.top + r.height / 2);
    }
  }, []);
  const keysPick = useCallback((id: string) => {
    pickRef.current();
    chooseRef.current(id);
  }, []);

  /** The camera from the top, tilted or low (the zoom bar's angle button). */
  const setCameraAngle = (a: CameraAngle) => {
    const depth = depthRef.current;
    if (!depth || !view3dRef.current?.entered) return;
    const cam = depth.getCamera() ?? CAMERA_DEFAULT;
    depth.setCamera({ rx: CAMERA_ANGLES[a], rz: cam.rz });
    setCamAngle(a);
  };

  /**
   * Keys on the chart: Escape lets go of a pin; in 3D the arrows orbit (5° a
   * press), + and − zoom, 0 fits.
   */
  const onChartKey = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape" && selectedIdRef.current) {
      e.preventDefault();
      pickFromWheel();
      choose(selectedIdRef.current);
      return;
    }
    const depth = depthRef.current;
    if (!depth || !view3dRef.current?.entered || e.altKey || e.metaKey || e.ctrlKey) return;
    const cam = depth.getCamera() ?? CAMERA_DEFAULT;
    const turn = { ArrowLeft: [0, 5], ArrowRight: [0, -5], ArrowUp: [5, 0], ArrowDown: [-5, 0] }[e.key];
    if (turn) {
      e.preventDefault();
      depth.setCamera({ rx: Math.max(CAMERA_RX_MIN, Math.min(CAMERA_RX_MAX, cam.rx + turn[0])), rz: cam.rz + turn[1] });
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      depth.stepLens(1);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      depth.stepLens(-1);
    } else if (e.key === "0") {
      e.preventDefault();
      view3dRef.current?.resetCamera();
      depth.resetLens();
      setCamAngle("tilt");
    }
  };

  /** In the 3D view the zoom bar, the wheel and a pinch drive its lens, not the page zoom. */
  const lens: Omit<WheelLens, "zoom"> | null =
    depthView === "3d"
      ? {
          min: LENS_MIN,
          max: LENS_MAX,
          step: (dir) => depthRef.current?.stepLens(dir),
          zoomAt: (factor, x, y) => depthRef.current?.zoomLens(factor, { x, y }),
          pan: (dx, dy) => depthRef.current?.panLens(dx, dy),
          angle: { at: camAngle, set: setCameraAngle },
        }
      : null;

  const toSvgPoint = (e: { clientX: number; clientY: number; currentTarget: EventTarget }) => {
    const depth = depthRef.current;
    if (depth && !depth.isFlat()) {
      const p = depth.unproject(e.clientX, e.clientY, 0);
      if (p) return p;
    }
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const vb = svg.viewBox.baseVal;
    return {
      x: ((e.clientX - rect.left) / rect.width) * vb.width + vb.x,
      y: ((e.clientY - rect.top) / rect.height) * vb.height + vb.y,
      // Wheel units per CSS pixel — a 390px wheel needs ~2.2× the slop of a
      // desktop one to give the same finger-sized target.
      unitsPerPx: vb.width / rect.width,
    };
  };

  return (
    <>
    <LensZoom
      depthRef={depthRef}
      lens={lens}
      tools={<WheelToggles in3d={depthView === "3d"} />}
      onFit={setFit}
      legend={<AspectStrip rows={stripRows} hidden={hiddenTypes} ctx={focusCtx} selection={selection} />}
      aside={biWheel ? null : <WheelAspectGrid rows={gridRows} ctx={focusCtx} selection={selection} onSelect={onSelect} />}
    >
    <div className="ulune-wheel-stage relative mx-auto w-full" data-chart-pick>
      <WheelHint selection={selection} />
      <div
        ref={sceneRef}
        className="ulune-depth"
        data-testid="wheel-depth"
        data-depth-view="flat"
        onPointerDown={(e) => {
          const depth = depthRef.current;
          if (!depth || !view3dRef.current?.entered) return;
          if (orbitRef.current && orbitRef.current.id !== e.pointerId) {
            // A second finger: a pinch (the zoom port zooms the lens), not an orbit.
            orbitRef.current = null;
            sceneRef.current?.classList.remove("is-orbiting");
            return;
          }
          const pan = e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
          if (e.button !== 0 && !pan) return;
          if (e.button === 1) e.preventDefault();
          const cam = depth.getCamera() ?? CAMERA_DEFAULT;
          orbitRef.current = {
            mode: pan ? "pan" : "orbit",
            x: e.clientX,
            y: e.clientY,
            lx: e.clientX,
            ly: e.clientY,
            rx: cam.rx,
            rz: cam.rz,
            moved: false,
            id: e.pointerId,
            trail: [],
          };
        }}
        onPointerMove={(e) => {
          const o = orbitRef.current;
          const depth = depthRef.current;
          const scene = sceneRef.current;
          if (!o || !depth || !scene || o.id !== e.pointerId) return;
          const dx = e.clientX - o.x;
          const dy = e.clientY - o.y;
          if (!o.moved && Math.hypot(dx, dy) < 5) return;
          if (!o.moved) {
            o.moved = true;
            scene.setPointerCapture(e.pointerId);
            scene.classList.add("is-orbiting");
          }
          if (o.mode === "pan") {
            depth.panLens(e.clientX - o.lx, e.clientY - o.ly);
            o.lx = e.clientX;
            o.ly = e.clientY;
            return;
          }
          // Like grabbing the plate: dragging down brings the view over the
          // top of the chart, dragging up tips it further toward the horizon;
          // left and right turn it.
          const at = (x: number, y: number) => ({
            rx: Math.max(CAMERA_RX_MIN, Math.min(CAMERA_RX_MAX, o.rx - (y - o.y) * 0.25)),
            rz: o.rz - (x - o.x) * 0.35,
          });
          const { rx, rz } = at(e.clientX, e.clientY);
          depth.dragCamera(rx, rz);
          // Every sample the browser gathered since the last event (a busy
          // page coalesces moves): the glide's speed stays true.
          const native = e.nativeEvent as PointerEvent;
          const samples = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
          for (const c of samples.length ? samples : [native]) o.trail.push({ t: c.timeStamp, ...at(c.clientX, c.clientY) });
          while (o.trail.length > 12) o.trail.shift();
        }}
        onPointerUp={(e) => {
          const o = orbitRef.current;
          if (!o || o.id !== e.pointerId) return;
          if (o.moved && o.mode === "pan") {
            // Only a left-button (Shift) pan is followed by a click to swallow;
            // a right-button one by its context menu.
            if (e.button === 0) orbitClickRef.current = true;
            panMenuRef.current = e.button === 2;
          } else if (o.moved) {
            orbitClickRef.current = true;
            // Let go while moving: the chart glides on and eases to a stop.
            // The speed is the drag's over its last moments, faded by how long
            // the finger rested before letting go (a pause means "stop here").
            // (Sparse moves — a slow device — reach further back for a second sample.)
            const b = o.trail[o.trail.length - 1];
            const within = (ms: number) => (b ? o.trail.find((p) => p !== b && b.t - p.t <= ms) : undefined);
            // (A very slow device may space its moves further still: then the one before.)
            const a = within(120) ?? within(260) ?? o.trail[o.trail.length - 2];
            if (a && b) {
              const dt = Math.max(8, b.t - a.t) / 1000;
              // A pause is time beyond the device's own spacing of moves: on a slow
              // device the release comes a whole frame after the last move.
              const spacing = Math.min(400, (b.t - a.t) / Math.max(1, o.trail.indexOf(b) - o.trail.indexOf(a)));
              const rest = Math.exp(-Math.max(0, e.timeStamp - b.t - spacing) / 100);
              const cap = (v: number) => Math.max(-300, Math.min(300, v * 0.55 * rest));
              depthRef.current?.glideCamera(cap((b.rx - a.rx) / dt), cap((b.rz - a.rz) / dt));
            }
          }
          orbitRef.current = null;
          sceneRef.current?.classList.remove("is-orbiting");
        }}
        onPointerCancel={() => {
          orbitRef.current = null;
          sceneRef.current?.classList.remove("is-orbiting");
        }}
        onClickCapture={(e) => {
          if (!orbitClickRef.current) return;
          orbitClickRef.current = false;
          e.stopPropagation();
          e.preventDefault();
        }}
        onDoubleClick={() => view3dRef.current?.resetCamera()}
        onKeyDown={onChartKey}
      >
      <WheelKeys svgRef={svgRef} selection={selection} onPoint={keysPoint} onPick={keysPick} />
      <div ref={stackRef} className="ulune-depth-stack">
      <svg
        ref={svgRef}
        key={wheelKey}
        viewBox={showTransits ? BIWHEEL_VIEW.vb : NATAL_VIEW.vb}
        className="ulune-wheel h-full w-full origin-center select-none"
        style={{ ["--glyph-shadow" as string]: `url(#${glyphFx}-shadow)`, ["--glyph-glow" as string]: `url(#${glyphFx}-glow)` }}
        data-bi={showTransits ? "1" : undefined}
        role="img"
        aria-label={t("wheelAria")}
        onPointerMove={(e) => {
          if (orbitRef.current?.moved) return;
          let id: string | null;
          if (view3dRef.current?.entered) {
            id = hitTest3D(e.clientX, e.clientY, e.pointerType !== "mouse");
          } else {
            const pt = toSvgPoint(e);
            if (!pt) return;
            id = hitTest(pt.x, pt.y, pt.unitsPerPx, undefined, e.pointerType !== "mouse");
          }
          pointAt(e.target, Boolean(id));
          setHover(id);
          // A line the mouse rests on says what it is (wheel-tip.ts), when pointing lights the chart.
          const tip = id && e.pointerType === "mouse" && getWheelPrefs().hover ? aspectTipsRef.current.get(id) : undefined;
          if (tip) showWheelTip(tip, e.clientX, e.clientY);
          else hideWheelTip();
        }}
        onPointerLeave={() => {
          pointAt(null, false);
          setHover(null);
          hideWheelTip();
        }}
        // Keep pointer clicks from moving DOM focus onto whichever node
        // happens to be painted on top — targeting is purely geometric.
        onPointerDown={(e) => {
          e.preventDefault();
          coarsePointerRef.current = e.pointerType !== "mouse";
          hideWheelTip();
        }}
        onClick={(e) => {
          const pt = toSvgPoint(e);
          const hit = view3dRef.current?.entered
            ? { id: hitTest3D(e.clientX, e.clientY, coarsePointerRef.current), ground: false }
            : pt
              ? hitAt(pt.x, pt.y, pt.unitsPerPx, undefined, coarsePointerRef.current)
              : { id: null, ground: true };
          pickFromWheel();
          const pinned = selectedIdRef.current;
          // With something pinned, the chart's ground lets go of it: a sign, a
          // decan or a house away from its marks, or empty space. The whole
          // wheel is there to click away, not only its edge. A mark (a body, a
          // line, a label, a house number) takes the pin instead.
          if (hit.id && !(pinned && hit.ground)) {
            choose(hit.id);
            return;
          }
          if (pinned) choose(pinned);
        }}
      >
        {(() => {
          // Transparent backdrop so pointer events fire across the whole
          // stage, including unpainted gaps. Always the viewBox itself.
          const vb = showTransits ? BIWHEEL_VIEW : NATAL_VIEW;
          return <rect data-backdrop="" x={vb.x} y={vb.y} width={vb.size} height={vb.size} fill="transparent" />;
        })()}
        <circle cx={CX} cy={CY} r={R_OUTER} fill="var(--color-bg-elevated)" />
        <circle
          cx={CX}
          cy={CY}
          r={R_OUTER}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth={RING}
        />

        <PinwheelLayer
          radii={NATAL_RADII}
          k="in"
          asc={asc}
          interactive
          hoverProps={hoverProps}
        />

        {/* Tick bands are tagged so the 1° band can drop out on a small wheel,
            where 360 marks 2px apart read as a grey ring, not as degrees. */}
        {/* The 1° marks in the 5° and 10° marks' ink (part 82: they read
            against the ground), at their own length and weight. */}
        <path
          d={ticks.fine}
          data-kind="tick-fine"
          className="ulune-tick-fine"
          fill="none"
          stroke="var(--color-fg-muted)"
          strokeWidth={HAIR_FINE}
          opacity={0.75}
        />
        <path
          d={ticks.mid}
          data-kind="tick-mid"
          fill="none"
          stroke="var(--color-fg-muted)"
          strokeWidth={HAIR_MID}
          opacity={0.75}
        />
        <path
          d={ticks.coarse}
          data-kind="tick-coarse"
          fill="none"
          stroke="var(--color-fg-muted)"
          strokeWidth={HAIR_COARSE}
        />

        {chart.houses.map((house, i) => {
          const next = chart.houses[(i + 1) % 12];
          const id = `house:${house.id}`;
          // Cusps stop at the pinwheel's interior tip — nothing but the sign
          // bars may cross the decan band.
          const cusp = lineAt(house.ecliptic, R_ASPECT, R_DECAN_IN, asc);
          const isAngle = house.id === 1 || house.id === 4 || house.id === 7 || house.id === 10;
          // Cusps by kind: angular, then succedent, then cadent (lighter).
          const succedent = house.id % 3 === 2;
          // Without a birth time the cusps are a noon placeholder: draw them
          // as a guess, not as the frame of the chart.
          const uncertain = timeUnknown || house.uncertain === true;
          return (
            <g
              key={house.id}
              data-house={house.id}
              data-cusp={house.ecliptic.toFixed(3)}
              data-uncertain={uncertain ? "1" : undefined}
              style={{ ["--enter" as string]: house.id - 1 }}
            >
              <path
                d={annulus(house.ecliptic, next.ecliptic, R_ASPECT, R_DECAN_IN, asc)}
                fill="transparent"
                className="focus:outline-none"
                data-wheel={id}
                data-hl={id}
                data-kind="house"
                {...hoverProps(id)}
              >
                <title>
                  {t("houseTooltip", { n: house.id, sign: signName(house.sign, locale) })}
                </title>
              </path>
              {/* House cusps are the strongest lines after the ASC/MC axes. */}
              <line
                {...cusp}
                stroke={isAngle ? "var(--color-fg)" : "var(--color-fg-muted)"}
                strokeWidth={isAngle ? CUSP_ANGLE_W : succedent ? CUSP_SUCCEDENT_W : CUSP_CADENT_W}
                strokeDasharray={uncertain ? "3 3" : undefined}
                opacity={uncertain ? (isAngle ? 0.3 : 0.22) : isAngle ? 1 : succedent ? 0.8 : 0.6}
                data-kind="cusp"
                data-cusp-kind={isAngle ? "angular" : succedent ? "succedent" : "cadent"}
                data-cusp-house={house.id}
                className="pointer-events-none ulune-dim-cusp"
              />
            </g>
          );
        })}

        <g className="pointer-events-none" data-overlay-washes>
          {overlayOn(overlays, "hemisphere")
            ? chart.houses.map((house, i) => {
                const next = chart.houses[(i + 1) % 12];
                const east = [10, 11, 12, 1, 2, 3].includes(house.id);
                return (
                  <path
                    key={`hemi-${house.id}`}
                    d={annulus(house.ecliptic, next.ecliptic, R_ASPECT, R_DECAN_IN, asc)}
                    fill={east ? "var(--el-air)" : "var(--el-earth)"}
                    fillOpacity={east ? 0.08 : 0.05}
                  />
                );
              })
            : null}
          {overlayOn(overlays, "quadrant")
            ? chart.houses.map((house, i) => {
                const next = chart.houses[(i + 1) % 12];
                const q = Math.floor((house.id - 1) / 3);
                const fill =
                  q === 0
                    ? "var(--el-fire)"
                    : q === 1
                      ? "var(--el-earth)"
                      : q === 2
                        ? "var(--el-air)"
                        : "var(--el-water)";
                return (
                  <path
                    key={`quad-${house.id}`}
                    d={annulus(house.ecliptic, next.ecliptic, R_ASPECT, R_DECAN_IN, asc)}
                    fill={fill}
                    fillOpacity={0.06}
                  />
                );
              })
            : null}
          {overlayOn(overlays, "sect")
            ? chart.houses.map((house, i) => {
                const next = chart.houses[(i + 1) % 12];
                const dayHalf = house.id >= 7;
                return (
                  <path
                    key={`sect-${house.id}`}
                    d={annulus(house.ecliptic, next.ecliptic, R_ASPECT, R_DECAN_IN, asc)}
                    fill={dayHalf ? "var(--aspect-conj)" : "var(--el-water)"}
                    fillOpacity={0.05}
                  />
                );
              })
            : null}
          {overlayOn(overlays, "stelliums")
            ? (chart.patterns.stelliums ?? []).flatMap((st, idx) => {
                const houseN = /^House\s+(\d+)$/i.exec(st.place);
                if (houseN) {
                  const hid = Number(houseN[1]);
                  const house = chart.houses.find((h) => h.id === hid);
                  const next = chart.houses.find((h) => h.id === (hid === 12 ? 1 : hid + 1));
                  if (!house || !next) return [];
                  return [
                    <path
                      key={`st-h-${idx}`}
                      d={annulus(house.ecliptic, next.ecliptic, R_ASPECT, R_DECAN_IN, asc)}
                      fill="var(--color-fg)"
                      fillOpacity={0.1}
                    />,
                  ];
                }
                const sign = SIGN_IDS.find((s) => SIGN_META[s].name === st.place);
                if (!sign) return [];
                const start = SIGN_IDS.indexOf(sign) * 30;
                const out = [
                  <path
                    key={`st-s-${idx}`}
                    d={annulus(start, start + 30, R_SIGN_IN, R_SIGN_OUT, asc)}
                    fill="var(--color-fg)"
                    fillOpacity={0.14}
                  />,
                ];
                // A bracket just outside the zodiac over the stellium's bodies,
                // with its count: "7 in ♒" at a glance (single wheel only: a
                // bi-wheel's outer ring lives there).
                const at = st.members
                  .map((m) => bodies.find((b) => b.id === m)?.ecliptic)
                  .filter((e): e is number => e != null);
                if (!showTransits && at.length >= 3) {
                  const span = arcSpan(at);
                  const a0 = span.from - 1.2;
                  const a1 = span.from + span.len + 1.2;
                  const p0 = polar(a0, STELLIUM_R, asc);
                  const p1 = polar(a1, STELLIUM_R, asc);
                  const e0 = polar(a0, STELLIUM_R - 5, asc);
                  const e1 = polar(a1, STELLIUM_R - 5, asc);
                  const large = a1 - a0 > 180 ? 1 : 0;
                  const f = (n: number) => n.toFixed(2);
                  // The count sits at the bracket's middle unless an angle's
                  // label is there; then at the first clear spot along it.
                  const clear = (e: number) =>
                    (["ascendant", "midheaven", "descendant", "ic"] as const).every((k) => {
                      const ang = chart.angles[k];
                      return !ang || !visible.has(k) || Math.abs(((((ang.ecliptic - e) % 360) + 540) % 360) - 180) > 9;
                    });
                  const mid = span.from + span.len / 2;
                  const spot = [0, 1, -1, 2, -2, 3, -3].map((k) => mid + k * 4).find(clear);
                  const lp = spot != null ? polar(spot, STELLIUM_LABEL_R, asc) : null;
                  out.push(
                    <g key={`st-b-${idx}`} data-kind="stellium-bracket" data-sign={sign} style={{ color: ink(ELEMENT_COLOR[SIGN_META[sign].element]) }}>
                      <path
                        d={`M ${f(e0.x)} ${f(e0.y)} L ${f(p0.x)} ${f(p0.y)} A ${STELLIUM_R} ${STELLIUM_R} 0 ${large} 0 ${f(p1.x)} ${f(p1.y)} L ${f(e1.x)} ${f(e1.y)}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.85}
                      />
                      {lp ? (
                        <g transform={`translate(${f(lp.x)} ${f(lp.y)})`}>
                          <text x={-2} y={0} textAnchor="end" dominantBaseline="central" fontSize={10} fontFamily="var(--font-mono)" fontWeight={600} fill="currentColor">
                            {at.length}
                          </text>
                          <g transform="translate(0 -5)">
                            <SignGlyph id={sign} size={10} />
                          </g>
                        </g>
                      ) : null}
                    </g>,
                  );
                }
                return out;
              })
            : null}
        </g>

        <circle
          cx={CX}
          cy={CY}
          r={R_ASPECT}
          fill="var(--color-bg)"
          stroke="var(--wheel-aspect-ring)"
          strokeWidth={RING}
          data-kind="aspect-ring"
        />

        {placed.map((p) => {
          const stroke = "var(--color-fg-muted)";
          // Radial through the whole tick band at the TRUE degree, then a
          // short slant to the (possibly fanned) glyph — no gap at the ticks.
          const tickOuter = polar(p.ecliptic, R_TICK_OUT, asc);
          const tickJoin = polar(p.ecliptic, R_TICK_10, asc);
          const glyph = { x: p.x, y: p.y };
          const glyphFromTick = toward(tickJoin, glyph, PLANET_DISK);
          const inner = polar(p.ecliptic, R_ASPECT, asc);
          // The line resumes past the degree written along it (radialLabel).
          const glyphFromInner = labelAt.get(p.id)?.tail ?? toward(inner, glyph, PLANET_DISK);
          // In a stellium the glyph is fanned off its degree. Pin the true
          // longitude on the tick ring so the leader reads as a pointer to a
          // marked degree, not as a stray line.
          const fanned = Math.abs(((p.display - p.ecliptic + 540) % 360) - 180) > 0.05;
          return (
            <g
              key={`lead-${p.id}`}
              className="pointer-events-none ulune-dim-lead"
              style={{ ["--enter" as string]: enterAt(p.ecliptic) }}
              data-hl={`planet:${p.id}`}
              data-body={p.id}
              data-kind="lead"
              data-fanned={fanned ? "1" : undefined}
              data-dimmable
            >
              {fanned ? (
                <circle cx={tickOuter.x} cy={tickOuter.y} r={1.7} fill="var(--color-fg-muted)" />
              ) : null}
              <polyline
                points={`${tickOuter.x.toFixed(2)},${tickOuter.y.toFixed(2)} ${tickJoin.x.toFixed(2)},${tickJoin.y.toFixed(2)} ${glyphFromTick.x.toFixed(2)},${glyphFromTick.y.toFixed(2)}`}
                fill="none"
                stroke={stroke}
                strokeWidth={HAIR_LEAD}
                strokeLinecap="butt"
                strokeLinejoin="round"
                opacity={0.45}
              />
              <line
                x1={glyphFromInner.x}
                y1={glyphFromInner.y}
                x2={inner.x}
                y2={inner.y}
                stroke={stroke}
                strokeWidth={HAIR_LEAD}
                strokeLinecap="butt"
                opacity={0.45}
              />
            </g>
          );
        })}

        {showTransits
          ? transitPlaced.map((p) => {
              const stroke = "var(--color-fg-muted)";
              const tickOuter = polar(p.ecliptic, R_TICK_OUT, asc);
              const tickJoin = polar(p.ecliptic, R_TICK_10, asc);
              const inner = polar(p.ecliptic, R_ASPECT, asc);
              return (
                <g
                  key={`tpin-${p.id}`}
                  className="pointer-events-none ulune-dim-tpin"
                  data-hl={outerHit(p.id)}
                  data-transit={p.id}
                  data-kind="tpin"
                  data-dimmable
                >
                  <polyline
                    points={`${tickOuter.x.toFixed(2)},${tickOuter.y.toFixed(2)} ${tickJoin.x.toFixed(2)},${tickJoin.y.toFixed(2)} ${inner.x.toFixed(2)},${inner.y.toFixed(2)}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.8}
                    strokeLinecap="butt"
                    strokeLinejoin="round"
                    opacity={0.45}
                  />
                  <circle cx={tickOuter.x} cy={tickOuter.y} r={1.7} fill="var(--color-fg-subtle)" />
                </g>
              );
            })
          : null}

        {/* The detected configurations as faint filled shapes under the lines
            (a T-square's triangle, a grand trine's, a kite…), when that
            overlay is on. */}
        {!biWheel && overlayOn(overlays, "configurations") && (overlays.configs.size > 0 || (chart.patterns.configurations ?? []).length <= CFG_FILL_MAX) ? (
          <g data-kind="cfg-fills" className="pointer-events-none">
            {(chart.patterns.configurations ?? [])
              .filter((c) => !overlays.configs.size || overlays.configs.has(c.id))
              .map((c) => {
                const at = c.members
                  .filter((m) => visible.has(m))
                  .map((m) => bodies.find((b) => b.id === m)?.ecliptic)
                  .filter((e): e is number => e != null)
                  .sort((x, y) => x - y);
                if (at.length < 3) return null;
                const pts = at.map((e) => polar(e, R_ASPECT - 2, asc)).map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ");
                const hard = c.type === "tsquare" || c.type === "grandCross";
                const fill = c.type === "yod" ? ASPECT_COLOR.quincunx : hard ? ASPECT_COLOR.square : ASPECT_COLOR.trine;
                return (
                  <polygon
                    key={`cfgf-${c.id}`}
                    points={pts}
                    data-cfg-type={c.type}
                    // Its strength per theme is styles.css's: a theme switch
                    // re-renders nothing here.
                    data-strong={overlays.configs.size ? "" : undefined}
                    fill={fill}
                    stroke="none"
                  />
                );
              })}
          </g>
        ) : null}

        {chords.map((row) => {
          const { a, p1, p2, color, jewel, focusId: id, rank, ends, yoke, restMark } = row;
          const lineScale = strokeScale * ASPECT_LINE_K[fit];
          const visBase = aspectLook(a, "base", lineScale, "dark");
          const visLit = aspectLook(a, "lit", lineScale, "dark");
          const visDim = aspectLook(a, "dim", lineScale, "dark");
          // Only the opacities differ on the light theme (widths and dashes
          // don't): both are carried, and the focus paint writes the theme's
          // own (wheel-focus.ts), so a theme switch re-renders nothing here.
          const dayBase = aspectLook(a, "base", lineScale, "light").opacity;
          const dayLit = aspectLook(a, "lit", lineScale, "light").opacity;
          const dayDim = aspectLook(a, "dim", lineScale, "light").opacity;
          // What the paint, the 3D view and the relief read off every line.
          const lineData = {
            stroke: color,
            strokeWidth: visBase.width,
            strokeLinecap: "round" as const,
            strokeDasharray: visBase.dash,
            // A solid line draws itself along its length when it appears.
            pathLength: visBase.dash ? undefined : 1,
            "data-draw": visBase.dash ? undefined : "",
            "data-hl": id,
            "data-aspect": a.id,
            "data-kind": "aspect",
            "data-aspect-line": "",
            "data-pattern": visBase.pattern,
            "data-jewel": jewel,
            "data-w-base": visBase.width,
            "data-o-base": visBase.opacity,
            "data-ol-base": dayBase,
            "data-w-lit": visLit.width,
            "data-o-lit": visLit.opacity,
            "data-ol-lit": dayLit,
            "data-w-dim": visDim.width,
            "data-o-dim": visDim.opacity,
            "data-ol-dim": dayDim,
            style: { ["--line-ink" as string]: color },
            className: "pointer-events-none",
          };
          const long = !yoke && Math.hypot(p2.x - p1.x, p2.y - p1.y) >= CHEVRON_MIN_LEN;
          const taper = taperGeo(p1, p2, TAPER[fit]);
          // Where its glyph shows (wheel-focus.ts makes the mark when it does).
          const mark = restMark ?? (yoke ? yoke.mark : aspectMarkPoint(p1, p2));
          return (
            <g
              key={id}
              data-hl={id}
              data-aspect={a.id}
              data-orb={a.orb.toFixed(2)}
              data-level={a.level}
              data-type={a.type}
              data-ends={ends}
              data-mark-at={`${mark.x} ${mark.y}`}
              data-rest={restMark ? "1" : undefined}
              // It arrives as one piece (styles.css): the group fades in, a
              // solid line in it drawing itself too; a solid yoke, alone in
              // its group, only draws itself.
              data-arrive={yoke && !visBase.dash ? undefined : ""}
              // A named group (the wheel is one image; its parts are listed by WheelKeys).
              role="group"
              aria-label={aspectTips.get(id)}
              className="focus:outline-none"
              style={{ ["--enter" as string]: Math.min(rank, 16) }}
              {...hoverProps(id)}
            >
              {yoke ? (
                /* A conjunction: a yoke joining the two bodies (under their
                   glyphs, or hanging from their degrees). Its ends (x1…y2)
                   are the two degrees on the aspect circle, where the 3D
                   view joins it when a body has no sprite. */
                <path
                  d={yoke.d}
                  fill="none"
                  strokeLinejoin="round"
                  data-x1={p1.x.toFixed(2)}
                  data-y1={p1.y.toFixed(2)}
                  data-x2={p2.x.toFixed(2)}
                  data-y2={p2.y.toFixed(2)}
                  data-yoke={yoke.r > R_ASPECT ? "glyphs" : "degrees"}
                  data-lane={yoke.lane}
                  data-pts={yoke.pts.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ")}
                  {...lineData}
                />
              ) : (
                <>
                  {/* Casing: a band of the disc's colour under a major line, so
                      crossing and near-parallel lines part cleanly (not over
                      the tapered ends: it would cut the lines meeting there). */}
                  {a.level === "major" ? (
                    <line
                      x1={taper.a.x}
                      y1={taper.a.y}
                      x2={taper.b.x}
                      y2={taper.b.y}
                      stroke="var(--color-bg)"
                      strokeWidth={visLit.width + 2.2}
                      strokeLinecap="round"
                      className="ulune-aspect-case pointer-events-none"
                    />
                  ) : null}
                  {/* The line proper; its ends (data-x1…y2) are the two
                      degrees it joins, where the 3D view joins it too. */}
                  <line
                    x1={taper.a.x}
                    y1={taper.a.y}
                    x2={taper.b.x}
                    y2={taper.b.y}
                    data-x1={p1.x.toFixed(2)}
                    data-y1={p1.y.toFixed(2)}
                    data-x2={p2.x.toFixed(2)}
                    data-y2={p2.y.toFixed(2)}
                    {...lineData}
                  />
                  {/* Its ends narrow to a point on each body's degree: both
                      ends in one shape (aspect-taper.ts), re-cut by the focus
                      paint for the lit width (data-w-* are the line's widths). */}
                  <path
                    d={tipsPath(p1, p2, TAPER[fit], visBase.width)}
                    fill={color}
                    data-kind="aspect-tip"
                    data-aspect-tip=""
                    data-hl={id}
                    data-aspect={a.id}
                    data-taper={`${p1.x} ${p1.y} ${p2.x} ${p2.y} ${TAPER[fit]}`}
                    data-w-base={visBase.width}
                    data-o-base={visBase.opacity}
                    data-ol-base={dayBase}
                    data-w-lit={visLit.width}
                    data-o-lit={visLit.opacity}
                    data-ol-lit={dayLit}
                    data-w-dim={visDim.width}
                    data-o-dim={visDim.opacity}
                    data-ol-dim={dayDim}
                    className="pointer-events-none"
                  />
                </>
              )}
              {applySep && long && a.applying != null ? (
                <path
                  className="ulune-aspect-dir pointer-events-none"
                  data-dir={a.applying ? "applying" : "separating"}
                  d={chevronPath(p1, p2, a.applying)}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  // A shade over its line's, per theme (styles.css).
                  style={{
                    ["--dir-o" as string]: Math.min(1, visBase.opacity + 0.1),
                    ["--dir-ol" as string]: Math.min(1, dayBase + 0.1),
                  }}
                />
              ) : null}
            </g>
          );
        })}

        {showTransits
          ? transitPlaced.map((p) => (
              <line
                key={`olong-${p.id}`}
                {...lineAt(p.ecliptic, R_ASPECT, R_TRANSIT - TRANSIT_DISK - 2, asc)}
                data-kind="olong"
                data-transit={p.id}
                stroke="var(--color-fg)"
                strokeWidth={1.8}
                opacity={0}
                className="pointer-events-none"
              />
            ))
          : null}

        {!biWheel && overlayOn(overlays, "configurations")
          ? chart.aspects.map((a) => {
              if (!visible.has(a.a) || !visible.has(a.b)) return null;
              if (!aspectVisible(a, filter)) return null;
              const configs = chart.patterns.configurations ?? [];
              const chosen = overlays.configs.size
                ? configs.filter((c) => overlays.configs.has(c.id))
                : configs;
              const inShape = chosen.some(
                (c) => c.members.includes(a.a) && c.members.includes(a.b),
              );
              if (!inShape) return null;
              const pa = bodies.find((b) => b.id === a.a);
              const pb = bodies.find((b) => b.id === a.b);
              if (!pa || !pb) return null;
              const p1 = polar(pa.ecliptic, R_ASPECT, asc);
              const p2 = polar(pb.ecliptic, R_ASPECT, asc);
              return (
                <line
                  key={`cfg-${a.id}`}
                  data-kind="cfg"
                  data-cfg={a.id}
                  data-ends={`${natalHl(a.a)} ${natalHl(a.b)}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="var(--color-halo)"
                  strokeWidth={overlays.configs.size ? 1.8 : 1.8}
                  strokeLinecap="round"
                  opacity={overlays.configs.size ? 0.55 : 0.28}
                  className="pointer-events-none"
                />
              );
            })
          : null}

        {!biWheel && overlayOn(overlays, "receptions")
          ? (chart.patterns.receptions ?? []).map((r) => {
              if (!visible.has(r.a) || !visible.has(r.b)) return null;
              const pa = bodies.find((b) => b.id === r.a);
              const pb = bodies.find((b) => b.id === r.b);
              if (!pa || !pb) return null;
              const p1 = polar(pa.ecliptic, R_ASPECT, asc);
              const p2 = polar(pb.ecliptic, R_ASPECT, asc);
              const id = `reception:${[r.a, r.b].sort().join("-")}`;
              return (
                <g
                  key={id}
                  className="focus:outline-none ulune-dim-reception"
                  data-hl={id}
                  data-body-a={r.a}
                  data-body-b={r.b}
                  data-ends={`${natalHl(r.a)} ${natalHl(r.b)}`}
                  data-kind="reception"
                  data-dimmable
                  {...hoverProps(id)}
                >
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="transparent"
                    strokeWidth={8}
                  />
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="var(--color-halo)"
                    strokeWidth={1.8}
                    strokeDasharray="1.6 3.2"
                    strokeLinecap="round"
                    opacity={0.7}
                    className="pointer-events-none"
                  />
                </g>
              );
            })
          : null}

        {/* In a focus, the lit lines are drawn again here, above every
            line, each on a band of the ground's colour: a dimmed line never
            crosses a lit one. wheel-focus.ts makes these copies while their
            lines are lit, and only then (React leaves this group empty). */}
        <g data-kind="aspect-top" data-painted="" className="pointer-events-none" aria-hidden="true" />

        {/* Each body's degree on the aspect circle: the dot its aspect lines
            land on (drawn over their tapered ends, on a ring of the ground's
            colour, so the meeting point reads exactly). */}
        <g data-kind="degree-dots" className="pointer-events-none">
          {placed.map((p) => {
            const at = polar(p.ecliptic, R_ASPECT, asc);
            return (
              <circle
                key={`deg-${p.id}`}
                cx={at.x}
                cy={at.y}
                r={DEGREE_DOT_R}
                fill="var(--color-fg-muted)"
                stroke="var(--color-bg)"
                strokeWidth={1.2}
                data-kind="degree-dot"
                data-hl={`planet:${p.id}`}
                data-body={p.id}
                data-dimmable
              />
            );
          })}
          {showTransits
            ? transitPlaced.map((p) => {
                const at = polar(p.ecliptic, R_ASPECT, asc);
                return (
                  <circle
                    key={`tdeg-${p.id}`}
                    cx={at.x}
                    cy={at.y}
                    r={DEGREE_DOT_R}
                    fill="var(--color-fg-subtle)"
                    stroke="var(--color-bg)"
                    strokeWidth={1.2}
                    data-kind="degree-dot"
                    data-hl={outerHit(p.id)}
                    data-transit={p.id}
                    data-dimmable
                  />
                );
              })
            : null}
        </g>

        {/* Cusp degrees along each cusp's inner end, just inside its house
            (a cusp an angle falls on is named by the angle already), above
            the lines: a yoke passing under one is cut by its halo. */}
        {cuspDegrees ? (
          <g data-kind="cusp-degs" className="pointer-events-none">
            {cuspDegs.map(({ house, at, deg, flip }) => {
              return (
                <text
                  key={`cdeg-${house.id}`}
                  x={at.x}
                  y={at.y}
                  transform={`rotate(${(flip ? deg + 180 : deg).toFixed(2)} ${at.x.toFixed(2)} ${at.y.toFixed(2)})`}
                  textAnchor={flip ? "end" : "start"}
                  dominantBaseline="central"
                  fontSize={CUSP_DEG_FONT}
                  fontFamily="var(--font-mono)"
                  stroke="var(--color-bg-elevated)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  className="ulune-dim-cusp-deg"
                  data-kind="cusp-deg"
                  data-cusp-house={house.id}
                >
                  {house.formatted}
                </text>
              );
            })}
          </g>
        ) : null}

        {/* House numbers render above the leader lines and the yokes so they
            are never crossed out (they keep clear of both where the house
            has room); each number's ink, not its em box, is centred in its
            disc (text-ink.ts). */}
        {chart.houses.map((house, i) => {
          const next = chart.houses[(i + 1) % 12];
          const span = ((next.ecliptic - house.ecliptic) % 360 + 360) % 360;
          const midEcl = (house.ecliptic + span / 2) % 360;
          // In the middle of its house, unless a planet would touch it (then
          // slid along the house, or stepped in: wheel-layout.ts).
          const mid = badgeAt.get(String(house.id)) ?? polar(midEcl, R_HOUSE_NUM, asc);
          const id = `house:${house.id}`;
          const uncertain = timeUnknown || house.uncertain === true;
          // Intercepted signs: a sign lying wholly inside the house.
          const intercepted = SIGN_IDS.filter((_, k) => {
            const a = (((k * 30 - house.ecliptic) % 360) + 360) % 360;
            return a > 0.01 && a + 30 < span - 0.01;
          });
          return (
            <g
              key={`hnum-${house.id}`}
              className="pointer-events-none ulune-dim-house-num"
              style={{ ["--enter" as string]: house.id - 1 }}
              data-hl={id}
              data-kind="house-num"
              data-uncertain={uncertain ? "1" : undefined}
              opacity={uncertain ? 0.38 : 1}
            >
              <circle
                cx={mid.x}
                cy={mid.y}
                r={HOUSE_NUM_R}
                fill="var(--color-bg-elevated)"
                stroke="none"
                strokeWidth={RING}
              />
              {intercepted.length && !uncertain ? (
                <g data-kind="intercepted" data-signs={intercepted.join(" ")}>
                  {intercepted.map((sign, k) => {
                    // Beside the number along its ring, on whichever side
                    // touches no glyph, yoke, degree label or the number itself.
                    const at = placeBeside(
                      { ecl: (mid as { ecl?: number }).ecl ?? midEcl, r: Math.hypot(mid.x - CX, mid.y - CY) },
                      k,
                      (e, r) => polar(e, r, asc),
                      9.5,
                      [...glyphDiscs, ...yokeDots, { x: mid.x, y: mid.y, r: HOUSE_NUM_R }],
                      undefined,
                      undefined,
                      labelBoxes,
                    );
                    return (
                      <g key={sign} transform={`translate(${(at.x - 6).toFixed(2)} ${(at.y - 6).toFixed(2)})`} style={{ color: ink(ELEMENT_COLOR[SIGN_META[sign].element]) }}>
                        <title>{t("interceptedSign", { sign: signName(sign, locale) })}</title>
                        <rect x={-2} y={-2} width={16} height={16} rx={4} fill="var(--color-bg-elevated)" stroke="currentColor" strokeWidth={1} strokeDasharray="2 1.6" />
                        <SignGlyph id={sign} size={12} />
                      </g>
                    );
                  })}
                </g>
              ) : null}
              {/* The number sits at the origin of its own group: anything that
                  scales it (a raised copy) grows it around its centre in every
                  browser — WebKit ignores transform-box on text and would
                  scale it around the chart's corner instead. */}
              <g transform={`translate(${mid.x.toFixed(2)} ${mid.y.toFixed(2)})`}>
                <text
                  className="ulune-house-num-mark"
                  data-glyph={`house-${house.id}`}
                  data-paint="num"
                  x={numInk(house.id)?.x ?? 0}
                  y={numInk(house.id)?.y ?? 0}
                  textAnchor="middle"
                  dominantBaseline={numInk(house.id) ? undefined : "central"}
                  fill="var(--color-fg-muted)"
                  fontSize={HOUSE_NUM_FONT}
                  fontWeight={600}
                  style={{ fontFamily: "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace" }}
                >
                  {house.id}
                </text>
              </g>
            </g>
          );
        })}

        {/* Aspect glyphs sit above every line (a later line or its casing
            would cut through one drawn with its own line). wheel-focus.ts
            makes a line's mark while it shows (in a focus, or at rest on a
            chart with few aspects), from its type's template here. */}
        {/* The glyphs' slight shadow, and the aura of the one in focus
            (styles.css, .ulune-glyph-at): the glyphs stand bare, the shadow
            lifts them off the lines that pass under them. */}
        <defs data-kind="glyph-fx">
          <filter id={`${glyphFx}-shadow`} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feDropShadow dx={0} dy={0.7} stdDeviation={1.1} className="ulune-glyph-shadow" />
          </filter>
          {/* A subtle aura of the glyph's own colour, following its shape: the glyph
              spread and blurred under itself, so it is the planet's colour in
              each Look (white or black when plain, its traditional colour, its
              element's). */}
          <filter id={`${glyphFx}-glow`} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceGraphic" operator="dilate" radius={0.6} result="spread" />
            <feGaussianBlur in="spread" stdDeviation={1.5} result="soft" />
            <feComponentTransfer in="soft" result="aura">
              <feFuncA type="linear" slope={0.5} />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="aura" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <defs data-kind="mark-templates">
          {markTypes.map((type) => (
            <g key={type} data-mark-template={type}>
              <g className="ulune-aspect-mark-pop">
                <circle r={ASPECT_MARK_DISK} fill="var(--color-bg-elevated)" stroke="currentColor" strokeWidth={1.8} />
                <CenteredAspectGlyph
                  id={type}
                  size={type === "conjunction" ? ASPECT_MARK_CONJ : type === "quintile" ? ASPECT_MARK_QUINTILE : ASPECT_MARK}
                />
              </g>
            </g>
          ))}
        </defs>
        <g data-kind="aspect-marks" data-painted="" className="pointer-events-none" />

        {(["ascendant", "midheaven", "descendant", "ic"] as const).map((key) => {
          if (!visible.has(key)) return null;
          const angle = chart.angles[key];
          const tip = polar(angle.ecliptic, R_OUTER + 8, asc);
          const label = polar(angle.ecliptic, angleLabelR, asc);
          const names = { ascendant: "ASC", midheaven: "MC", descendant: "DSC", ic: "IC" };
          const id = `angle:${key}`;
          // The axis runs from the aspect circle out through the zodiac, so
          // where the angle falls in its sign is plain; it skips the sign's
          // glyph panel only where it would cross the glyph itself.
          const inSign = ((angle.ecliptic % 30) + 30) % 30;
          const clearOfGlyph = Math.abs(inSign - 15) > 4.5;
          const rColorIn = R_SIGN_OUT - 14;
          const axis = [
            lineAt(angle.ecliptic, R_ASPECT, R_DECAN_IN, asc),
            clearOfGlyph ? lineAt(angle.ecliptic, R_DECAN_IN, rColorIn, asc) : lineAt(angle.ecliptic, R_DECAN_IN, R_SIGN_IN, asc),
            lineAt(angle.ecliptic, rColorIn, R_OUTER + 2, asc),
          ];
          const arrow = key === "ascendant" || key === "midheaven";
          const arrowPts = (() => {
            const tipA = polar(angle.ecliptic, R_OUTER + 10, asc);
            const base = polar(angle.ecliptic, R_OUTER + 2, asc);
            const dx = tipA.x - base.x;
            const dy = tipA.y - base.y;
            const l = Math.hypot(dx, dy) || 1;
            const nx = (-dy / l) * 3.8;
            const ny = (dx / l) * 3.8;
            const f = (n: number) => n.toFixed(2);
            return `${f(tipA.x)},${f(tipA.y)} ${f(base.x + nx)},${f(base.y + ny)} ${f(base.x - nx)},${f(base.y - ny)}`;
          })();
          // A noon placeholder is drawn as a ghost — dashed axis, hollow tip,
          // "?" on the label — so the rising degree is never read as known.
          const uncertain = timeUnknown || angle.uncertain === true;
          return (
            <g
              key={key}
              className="focus:outline-none"
              style={{ ["--enter" as string]: ["ascendant", "midheaven", "descendant", "ic"].indexOf(key) }}
              data-hl={id}
              data-body={key}
              data-kind="angle"
              data-uncertain={uncertain ? "1" : undefined}
              data-dimmable
              role="group"
              aria-label={`${bodyLabel(key, locale)} ${angle.formatted} ${signName(angle.sign, locale)}${uncertain ? ` · ${t("timeUnknown")}` : ""}`}
              {...hoverProps(id)}
            >
              {uncertain ? (
                <title>
                  {names[key]} · {t("timeUnknown")}
                </title>
              ) : null}
              <g data-kind="angle-axis" className="pointer-events-none" opacity={uncertain ? 0.3 : 0.92}>
                {axis.map((seg, i) => (
                  <line
                    key={i}
                    {...seg}
                    stroke="var(--color-fg)"
                    strokeWidth={CUSP_ANGLE_W}
                    strokeDasharray={uncertain ? "3 3" : undefined}
                  />
                ))}
              </g>
              {arrow ? (
                <polygon
                  points={arrowPts}
                  data-kind="angle-arrow"
                  fill={uncertain ? "none" : "var(--color-fg)"}
                  stroke={uncertain ? "var(--color-fg)" : "none"}
                  strokeWidth={uncertain ? RING : undefined}
                  strokeLinejoin="round"
                  opacity={uncertain ? 0.4 : 1}
                />
              ) : (
                <circle
                  cx={tip.x}
                  cy={tip.y}
                  r={uncertain ? 3.2 : 2.8}
                  fill={uncertain ? "none" : "var(--color-fg)"}
                  stroke={uncertain ? "var(--color-fg)" : "none"}
                  strokeWidth={uncertain ? RING : undefined}
                  opacity={uncertain ? 0.4 : 1}
                />
              )}
              {showTransits ? (
                // On a double wheel the name sits over the outer ring's leaders: on its own chip.
                <rect
                  x={label.x - (names[key].length + (uncertain ? 1 : 0)) * 4.6 - 4}
                  y={label.y - 7.5}
                  width={(names[key].length + (uncertain ? 1 : 0)) * 9.2 + 8}
                  height={15}
                  rx={3}
                  fill="var(--color-bg)"
                  data-kind="angle-chip"
                  className="pointer-events-none"
                />
              ) : null}
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-fg)"
                fontSize={11}
                fontFamily="var(--font-display)"
                fontWeight={600}
                letterSpacing="0.14em"
                opacity={uncertain ? 0.4 : 1}
              >
                {uncertain ? `${names[key]}?` : names[key]}
              </text>
              {!showTransits && !uncertain && fit === "lg" ? (() => {
                // Its degree and sign under the name (outward at the top and
                // bottom of the wheel, below it at the sides).
                const side = Math.abs(label.y - CY) < 150;
                const dy = side ? ANGLE_DEG_DY : Math.sign(label.y - CY) * ANGLE_DEG_DY;
                const txt = angle.formatted;
                const w = txt.length * 0.6 * ANGLE_DEG_FONT;
                const x0 = label.x - (w + 11) / 2;
                return (
                  <g data-kind="angle-deg-row" className="pointer-events-none" style={{ color: ink(ELEMENT_COLOR[SIGN_META[angle.sign].element]) }}>
                    <text
                      x={x0}
                      y={label.y + dy}
                      dominantBaseline="central"
                      fontSize={ANGLE_DEG_FONT}
                      fontFamily="var(--font-mono)"
                      data-kind="angle-deg"
                    >
                      {txt}
                    </text>
                    <g transform={`translate(${(x0 + w + 2).toFixed(2)} ${(label.y + dy - 4.5).toFixed(2)})`}>
                      <SignGlyph id={angle.sign} size={9} />
                    </g>
                  </g>
                );
              })() : null}
            </g>
          );
        })}

        {placed.map((p) => {
          const color = ink(planetPaint(p.id, p.sign, lookPlanets));
          const id = `planet:${p.id}`;
          const flags = flagsMap[p.id];
          const outOfSect = overlayOn(overlays, "sect") && flags?.inSect === false;
          const isolated = overlayOn(overlays, "unaspected") && flags?.unaspected;
          const spec = labelSpec(p.formatted, p.retrograde, fit);
          const place = labelAt.get(p.id);
          const labelPt = place ?? polar(p.display, R_LABEL, asc);
          const rulerT = chart.patterns.chartRulerTraditional ?? chart.patterns.chartRuler;
          const rulerM = chart.patterns.chartRulerModern ?? chart.patterns.chartRuler;
          const isTradRuler = overlayOn(overlays, "chartRuler") && p.id === rulerT;
          const isModRuler = overlayOn(overlays, "chartRuler") && p.id === rulerM && rulerM !== rulerT;
          return (
            <g
              key={p.id}
              className="focus:outline-none"
              style={{
                color,
                ["--wheel-base-o" as string]: isolated ? 0.55 : outOfSect ? 0.42 : 1,
                // Entrance: a wave around the zodiac from the Ascendant.
                ["--enter" as string]: enterAt(p.ecliptic),
              }}
              data-hl={id}
              data-body={p.id}
              data-kind="planet"
              data-dimmable
              {...hoverProps(id)}
            >
              <title>
                {bodyLabel(p.id, locale)} {p.formatted} {signName(p.sign, locale)}
                {p.retrograde ? " Rx" : ""}
              </title>
              {/* Tooltip zone only — hover/click targeting is geometric. */}
              <circle cx={p.x} cy={p.y} r={PLANET_DISK} fill="transparent" />
              {overlayOn(overlays, "angularity") && flags?.angular ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={mk(18.5)}
                  fill="none"
                  stroke="var(--color-halo)"
                  strokeWidth={1.8}
                  opacity={0.4}
                  className="pointer-events-none"
                />
              ) : null}
              {isTradRuler ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={mk(17.2)}
                  fill="none"
                  stroke={ink("var(--aspect-conj)")}
                  strokeWidth={1.8}
                  opacity={0.85}
                  className="pointer-events-none"
                />
              ) : null}
              {isModRuler ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={mk(19.4)}
                  fill="none"
                  stroke={ink("var(--aspect-conj)")}
                  strokeWidth={1.8}
                  strokeDasharray="2.2 2"
                  opacity={0.75}
                  className="pointer-events-none"
                />
              ) : null}
              {overlayOn(overlays, "combust") && flags?.cazimi ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={mk(15.4)}
                  fill="none"
                  stroke={ink("var(--aspect-conj)")}
                  strokeWidth={1.8}
                  opacity={0.9}
                  className="pointer-events-none"
                />
              ) : null}
              {overlayOn(overlays, "combust") && flags?.combust ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={mk(15.4)}
                  fill="none"
                  stroke={ink("var(--aspect-hard)")}
                  strokeWidth={1.8}
                  strokeDasharray="2 1.6"
                  opacity={0.8}
                  className="pointer-events-none"
                />
              ) : null}
              {isolated ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={mk(16.2)}
                  fill="none"
                  stroke="var(--color-fg-muted)"
                  strokeWidth={RING}
                  strokeDasharray="1.4 2.4"
                  opacity={0.7}
                  className="pointer-events-none"
                />
              ) : null}
              <circle
                className="ulune-wheel-halo pointer-events-none"
                cx={p.x}
                cy={p.y}
                r={mk(13.2)}
                fill="none"
                stroke="var(--color-halo)"
                strokeWidth={1.8}
              />
              <g className="ulune-glyph-at" transform={`translate(${p.x}, ${p.y})`}>
                <g className="ulune-glyph-scale">
                  <g transform={`translate(${-GLYPH / 2}, ${-GLYPH / 2})`}>
                    <PlanetGlyph id={p.id} size={GLYPH} />
                  </g>
                </g>
              </g>
              <g className="pointer-events-none">
                {overlayOn(overlays, "dignity") && flags?.dignity ? (
                  <text
                    x={p.x + mk(11)}
                    y={p.y - mk(10)}
                    textAnchor="middle"
                    fill="var(--color-fg)"
                    fontSize={7}
                    fontFamily="var(--font-mono)"
                    opacity={0.85}
                  >
                    {DIGNITY_MARK[flags.dignity]}
                  </text>
                ) : null}
                {overlayOn(overlays, "stationary") && flags?.stationary ? (
                  <rect
                    x={p.x + mk(7)}
                    y={p.y + mk(6)}
                    width={5}
                    height={5}
                    fill="var(--color-fg)"
                    opacity={0.8}
                  />
                ) : null}
                {overlayOn(overlays, "fast") && flags?.fast ? (
                  <polygon
                    points={`${p.x + mk(10)},${p.y + mk(5)} ${p.x + mk(16)},${p.y + mk(8.5)} ${p.x + mk(10)},${p.y + mk(12)}`}
                    fill={ink("var(--el-fire)")}
                    opacity={0.85}
                  />
                ) : null}
                {overlayOn(overlays, "vocMoon") && p.id === "moon" && chart.patterns.vocMoon ? (
                  <text
                    x={p.x - mk(11)}
                    y={p.y - mk(10)}
                    textAnchor="middle"
                    fill="var(--el-water)"
                    fontSize={7}
                    fontFamily="var(--font-sans)"
                    fontWeight={600}
                  >
                    v
                  </text>
                ) : null}
                {overlayOn(overlays, "oob") && flags?.oob ? (
                  <text
                    x={p.x - mk(11)}
                    y={p.y + mk(12)}
                    textAnchor="middle"
                    fill="var(--color-fg)"
                    fontSize={8}
                    fontFamily="var(--font-sans)"
                  >
                    {(p.declination ?? 0) >= 0 ? "↑" : "↓"}
                  </text>
                ) : null}
              </g>
              {/* Its degree, along its line toward the aspect circle, in its colour (part 85a).
                  The box draws nothing: the 3D view reads where the degree stands from it. */}
              <rect
                x={labelPt.x - spec.w / 2}
                y={labelPt.y - spec.h / 2}
                width={spec.w}
                height={spec.h}
                fill="none"
                stroke="none"
                transform={labelTurn(place)}
                className="pointer-events-none"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="currentColor"
                fontSize={spec.font}
                fontFamily="var(--font-mono)"
                transform={labelTurn(place)}
                data-label-at={place ? String(place.at) : undefined}
                data-kind="planet-deg"
                className="ulune-planet-deg pointer-events-none"
              >
                {spec.txt}
              </text>
              {p.retrograde ? (() => {
                // At the glyph's outer corner on one side (clear of its degree;
                // the ring keeps room for it beside a crowded neighbour, planetGap).
                const len = Math.hypot(CX - p.x, CY - p.y) || 1;
                const ux = (CX - p.x) / len;
                const uy = (CY - p.y) / len;
                const rx = p.x - ux * RX_OUT - uy * RX_SIDE;
                const ry = p.y - uy * RX_OUT + ux * RX_SIDE;
                return (
                <text
                  x={rx}
                  y={ry}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="currentColor"
                  fontSize={rxFont(fit)}
                  fontFamily="var(--font-mono)"
                  data-kind="retro"
                  className="pointer-events-none"
                >
                  ℞
                </text>
                );
              })() : null}
            </g>
          );
        })}

        {overlayOn(overlays, "anaretic")
          ? [...placed, ...Object.values(chart.angles).filter((a) => visible.has(a.id))]
              .filter((p) => flagsMap[p.id]?.anaretic || flagsMap[p.id]?.ariesPoint)
              .map((p) => {
                const tick = lineAt(p.ecliptic, R_TICK_10, R_TICK_OUT + 4, asc);
                const aries = flagsMap[p.id]?.ariesPoint;
                return (
                  <line
                    key={`deg-${p.id}`}
                    {...tick}
                    stroke={aries ? "var(--el-fire)" : "var(--color-fg)"}
                    strokeWidth={aries ? 2 : 1.8}
                    opacity={0.8}
                    className="pointer-events-none"
                  />
                );
              })
          : null}

        {shownMids.map((m) => {
          const id = `mp:${m.id}`;
          const pt = polar(m.ecliptic, R_PLANET, asc);
          const tick = lineAt(m.ecliptic, R_PLANET - 9, R_PLANET + 9, asc);
          const color = ink(ELEMENT_COLOR[SIGN_META[m.sign].element]);
          return (
            <g
              key={id}
              className="focus:outline-none"
              style={{ color }}
              data-hl={id}
              data-body-a={m.a}
              data-body-b={m.b}
              data-kind="mp"
              data-dimmable
              {...hoverProps(id)}
            >
              <title>
                {bodyLabel(m.a, locale)} / {bodyLabel(m.b, locale)} {m.formatted}{" "}
                {signName(m.sign, locale)}
              </title>
              <line
                {...tick}
                stroke="currentColor"
                strokeWidth={1.8}
                className="pointer-events-none"
              />
              <g transform={`translate(${pt.x - 5.5}, ${pt.y - 5.5})`} className="pointer-events-none">
                <MidpointGlyph size={11} />
              </g>
            </g>
          );
        })}

        {shownStars.map((s) => {
          const id = `star:${s.id}`;
          const pt = polar(s.ecliptic, showTransits ? R_XTICK_10 + 5 : R_STAR, asc);
          const tick = lineAt(
            s.ecliptic,
            showTransits ? R_XTICK_10 : R_OUTER - 7,
            (showTransits ? R_XTICK_10 + 5 : R_STAR) + 3,
            asc,
          );
          return (
            <g
              key={id}
              className="focus:outline-none"
              data-hl={id}
              data-kind="star"
              data-dimmable
              {...hoverProps(id)}
            >
              <title>
                {s.name}
                {s.conjunct
                  ? ` · ${bodyLabel(s.conjunct.body, locale)} ${formatArc(s.conjunct.orb)}`
                  : ""}
              </title>
              <line
                {...tick}
                stroke="var(--color-fg-muted)"
                strokeWidth={RING}
                className="pointer-events-none"
              />
              <g
                transform={`translate(${pt.x - 5.5}, ${pt.y - 5.5})`}
                className="pointer-events-none"
              >
                <StarGlyph size={11} />
              </g>
            </g>
          );
        })}

        {showTransits && outerTicks ? (
          <g data-kind="outer-ring" data-testid={progressedMode ? "progressed-ring" : synastryMode ? "synastry-ring" : "transit-ring"}>
            <path
              d={outerTicks.fine}
              data-kind="tick-fine"
              className="ulune-tick-fine"
              fill="none"
              stroke="var(--color-fg-muted)"
              strokeWidth={HAIR_FINE}
              opacity={0.75}
            />
            <path
              d={outerTicks.mid}
              data-kind="tick-mid"
              fill="none"
              stroke="var(--color-fg-muted)"
              strokeWidth={HAIR_MID}
              opacity={0.75}
            />
            <path
              d={outerTicks.coarse}
              data-kind="tick-coarse"
              fill="none"
              stroke="var(--color-fg-muted)"
              strokeWidth={HAIR_COARSE}
            />
            <circle
              cx={CX}
              cy={CY}
              r={R_OUTER}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={RING}
            />
            <circle
              cx={CX}
              cy={CY}
              r={R_TRANSIT + TRANSIT_DISK + 6}
              fill="none"
              stroke="var(--color-fg-subtle)"
              strokeWidth={1.25}
              strokeDasharray="4 6"
              opacity={0.95}
            />
            {transitPlaced.map((p) => {
              const stroke = "var(--color-fg-muted)";
              const rim = polar(p.ecliptic, R_OUTER, asc);
              const tickJoin = polar(p.ecliptic, R_XTICK_10, asc);
              const glyph = { x: p.x, y: p.y };
              const glyphFromTick = toward(tickJoin, glyph, TRANSIT_DISK);
              return (
                <g
                  key={`tlead-${p.id}`}
                  className="pointer-events-none ulune-dim-tlead"
                  data-hl={outerHit(p.id)}
                  data-transit={p.id}
                  data-kind="tlead"
                  data-dimmable
                >
                  <polyline
                    points={`${rim.x.toFixed(2)},${rim.y.toFixed(2)} ${tickJoin.x.toFixed(2)},${tickJoin.y.toFixed(2)} ${glyphFromTick.x.toFixed(2)},${glyphFromTick.y.toFixed(2)}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={HAIR_LEAD}
                    strokeLinecap="butt"
                    strokeLinejoin="round"
                    opacity={0.45}
                  />
                </g>
              );
            })}
            {transitPlaced.map((p) => {
              const color = ink(planetPaint(p.id, p.sign, lookPlanets));
              const id = outerHit(p.id);
              const spec = labelSpec(p.formatted, p.retrograde, fit);
              const place = transitLabelAt.get(p.id);
              const labelPt = place ?? polar(p.display, R_TRANSIT_LABEL, asc);
              return (
                <g
                  key={`t-${p.id}`}
                  className="focus:outline-none ulune-dim-transit"
                  style={{ color, ["--enter" as string]: enterAt(p.ecliptic) }}
                  data-hl={id}
                  data-transit={p.id}
                  data-kind="transit"
                  data-dimmable
                  {...hoverProps(id)}
                >
                  <title>
                    {synastryMode
                      ? `${bodyLabel(p.id, locale)} ${p.formatted} ${signName(p.sign, locale)}${p.retrograde ? " Rx" : ""}`
                      : progressedMode
                        ? `${t("progressedBody", { name: bodyLabel(p.id, locale), progressed: bodyAgree(p.id, "progressé", "progressée") })} ${p.formatted} ${signName(p.sign, locale)}${p.retrograde ? " Rx" : ""}`
                        : `${t("transiting", { name: bodyLabel(p.id, locale) })} ${p.formatted} ${signName(p.sign, locale)}${p.retrograde ? " Rx" : ""}`}
                  </title>
                  <circle cx={p.x} cy={p.y} r={TRANSIT_DISK} fill="transparent" />
                  <circle
                    className="ulune-wheel-halo pointer-events-none"
                    cx={p.x}
                    cy={p.y}
                    r={11.2}
                    fill="none"
                    stroke="var(--color-halo)"
                    strokeWidth={1.8}
                  />
                  <g className="ulune-glyph-at" transform={`translate(${p.x}, ${p.y})`}>
                    <g className="ulune-glyph-scale">
                      <g transform={`translate(${-TRANSIT_GLYPH / 2}, ${-TRANSIT_GLYPH / 2})`}>
                        <PlanetGlyph id={p.id} size={TRANSIT_GLYPH} />
                      </g>
                    </g>
                  </g>
                  <rect
                    x={labelPt.x - spec.w / 2}
                    y={labelPt.y - spec.h / 2}
                    width={spec.w}
                    height={spec.h}
                    rx={3}
                    fill="var(--color-bg-elevated)"
                    transform={labelTurn(place)}
                    data-label-at={place ? String(place.at) : undefined}
                    className="pointer-events-none"
                  />
                  <text
                    x={labelPt.x}
                    y={labelPt.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--color-fg)"
                    fontSize={spec.font}
                    fontFamily="var(--font-mono)"
                    transform={labelTurn(place)}
                    className="pointer-events-none"
                  >
                    {spec.txt}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>
      </div>
      </div>
    </div>
    </LensZoom>
    </>
  );
});

/** The retrograde mark: out from the glyph toward the ticks, and to one side of it (units). */
const RX_OUT = 12;
const RX_SIDE = 10;
const rxFont = (fit: "sm" | "lg") => (fit === "sm" ? 11 : 8);

/**
 * How far a glyph reaches across its spoke on one side (units): its ink seen
 * along the ring there (taken as round: the corners of its box are empty),
 * or its retrograde mark if that is on this side.
 */
function sideReach(p: NatalChart["planets"][number], higher: boolean, asc: number, fit: "sm" | "lg"): number {
  const [x0, y0, x1, y1] = GLYPH_INK[p.id] ?? [4, 3, 20, 21];
  const k = (GLYPH / 24) * GLYPH_INK_ROOM;
  const hw = ((x1 - x0) / 2) * k;
  const hh = ((y1 - y0) / 2) * k;
  const pt = polar(p.ecliptic, R_PLANET, asc);
  const len = Math.hypot(pt.x - CX, pt.y - CY) || 1;
  const ux = (CX - pt.x) / len;
  const uy = (CY - pt.y) / len;
  // Along the ring, toward higher longitudes.
  const ahead = polar(p.ecliptic + 0.5, R_PLANET, asc);
  const ax = ahead.x - pt.x;
  const ay = ahead.y - pt.y;
  const al = Math.hypot(ax, ay) || 1;
  const reach = Math.hypot((ax / al) * hw, (ay / al) * hh);
  if (!p.retrograde) return reach;
  // The mark sits on the side (-uy, ux) points to (the render below).
  const rxHigher = -uy * ax + ux * ay > 0;
  return rxHigher === higher ? Math.max(reach, RX_SIDE + rxFont(fit) * 0.36) : reach;
}

/** The least angle (degrees) between two neighbours on the natal ring, b after a: their glyphs, and their degrees. */
function planetGap(a: NatalChart["planets"][number], b: NatalChart["planets"][number], asc: number, fit: "sm" | "lg"): number {
  const glyphs = (sideReach(a, true, asc, fit) + sideReach(b, false, asc, fit) + GLYPH_GAP) / R_PLANET;
  const la = labelSpec(a.formatted, a.retrograde, fit);
  const lb = labelSpec(b.formatted, b.retrograde, fit);
  // The degrees run in along the spokes and close in toward their ends.
  const deepest = Math.max(PLANET_DISK_GROWN - 1, PLANET_DISK + YOKE_IN[fit] + (YOKE_LANES[fit] - 1) * YOKE_STEP[fit] + YOKE_CLEAR[fit]);
  const inner = R_PLANET - deepest - Math.max(la.w, lb.w);
  const degrees = ((la.h + lb.h) / 2 + DEG_SIDE_GAP) / inner;
  return (Math.max(glyphs, degrees) * 180) / Math.PI;
}

function layoutPlanets(planets: NatalChart["planets"], asc: number, fit: "sm" | "lg") {
  const items = planets.map((p) => ({ ...p, radius: R_PLANET, display: p.ecliptic, x: 0, y: 0 }));
  const fanned = fanAnglesBy(
    items.map((p) => p.ecliptic),
    (i, j) => planetGap(planets[i], planets[j], asc, fit),
  );
  items.forEach((p, i) => {
    p.display = fanned[i] ?? p.ecliptic;
    const pt = polar(p.display, p.radius, asc);
    p.x = pt.x;
    p.y = pt.y;
  });
  return items;
}

function layoutTransits(planets: NatalChart["planets"], asc: number) {
  const items = planets.map((p) => ({
    ...p,
    radius: R_TRANSIT,
    display: p.ecliptic,
    x: 0,
    y: 0,
  }));
  const fanned = fanAngles(
    items.map((p) => p.ecliptic),
    TRANSIT_MIN_SEP,
  );
  items.forEach((p, i) => {
    p.display = fanned[i] ?? p.ecliptic;
    const pt = polar(p.display, p.radius, asc);
    p.x = pt.x;
    p.y = pt.y;
  });
  return items;
}

export { PlanetStrip } from "./planet-strip";
