/**
 * Damped springs for the depth engine: acceleration = (−k·(x − target) − c·v).
 * Integrated in fixed 1/120 s sub-steps (semi-implicit Euler), so the motion
 * is the same at 30, 60 or 120 fps.
 */

export type SpringParams = { k: number; c: number };

export type Spring = {
  x: number;
  v: number;
  target: number;
  k: number;
  c: number;
  /** performance.now() before which the spring holds still (stagger). */
  holdUntil: number;
};

/** Stiffness / damping pairs, tuned by eye (mass = 1). */
export const SPRINGS = {
  /** Something rising toward the viewer: quick, a little overshoot. */
  lift: { k: 340, c: 24 },
  /** Something settling back onto the plate: no bounce. */
  drop: { k: 260, c: 32 },
  /** The chart leaning toward the pointer. */
  tilt: { k: 120, c: 22 },
  /** The camera sliding over to what you point at. */
  origin: { k: 180, c: 27 },
  /** The whole chart tipping into (or out of) the 3D view. */
  view: { k: 90, c: 19 },
  /** A press: the element dips toward the plate. */
  press: { k: 600, c: 40 },
  /** Cinematic camera moves: the 3D entry swoop, exits, resets (~1.2 s). */
  swoop: { k: 24, c: 9.4 },
  /** Something rising in the 3D view when pinned: unhurried, a soft overshoot. */
  rise3d: { k: 150, c: 17 },
  /** The camera gliding on after an orbit drag is let go (no bounce, ~0.6 s). */
  glide: { k: 64, c: 16 },
  /** The 3D view's lens following the mouse wheel or a pinch: quick, no bounce. */
  lens: { k: 260, c: 33 },
} as const satisfies Record<string, SpringParams>;

const STEP = 1 / 120;
const EPS_X = 0.01;
const EPS_V = 0.01;

export function makeSpring(x: number, params: SpringParams = SPRINGS.lift): Spring {
  return { x, v: 0, target: x, k: params.k, c: params.c, holdUntil: 0 };
}

/** Aim a spring somewhere new, optionally with different physics and a start delay. */
export function aim(s: Spring, target: number, params?: SpringParams, now = 0, delayMs = 0) {
  s.target = target;
  if (params) {
    s.k = params.k;
    s.c = params.c;
  }
  s.holdUntil = delayMs > 0 ? now + delayMs : 0;
}

/** Jump straight to the target (reduced motion, first paint). */
export function settle(s: Spring, target = s.target) {
  s.target = target;
  s.x = target;
  s.v = 0;
  s.holdUntil = 0;
}

export function isAtRest(s: Spring): boolean {
  return Math.abs(s.x - s.target) < EPS_X && Math.abs(s.v) < EPS_V;
}

/**
 * Advance by `dtSec` in fixed sub-steps, so motion keeps wall-clock time even
 * on a slow device (clamped to 1/4 s so a tab coming back from the background
 * doesn't jump). Returns true while the spring is still moving.
 */
export function stepSpring(s: Spring, dtSec: number, now = 0): boolean {
  if (s.holdUntil && now < s.holdUntil) return true;
  if (isAtRest(s)) {
    s.x = s.target;
    s.v = 0;
    return false;
  }
  let left = Math.min(Math.max(dtSec, 0), 0.25);
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    const a = -s.k * (s.x - s.target) - s.c * s.v;
    s.v += a * h;
    s.x += s.v * h;
    left -= h;
  }
  if (isAtRest(s)) {
    s.x = s.target;
    s.v = 0;
    return false;
  }
  return true;
}

/** Damping ratio ζ = c / (2·√k): 1 is critical, below 1 overshoots. */
export function dampingRatio(p: SpringParams): number {
  return p.c / (2 * Math.sqrt(p.k));
}
