/*
 * The 3D view's camera angles and the wheel layout it is built from: what
 * the flat chart needs to know about 3D before the 3D view itself (a
 * separate download, wheel-view3d.ts) has loaded.
 */

/** The wheel's layout, in chart units (chart-wheel.tsx). */
export type Wheel3DGeometry = {
  cx: number;
  cy: number;
  asc: number;
  rOuter: number;
  rSignIn: number;
  rDecanIn: number;
  rAspect: number;
  /** A bi-wheel's outer ring (transits, partner, progressions). */
  outer: { rIn: number; rOut: number } | null;
  houses: { id: number; ecl0: number; ecl1: number }[];
};

export const CAMERA_DEFAULT = { rx: 50, rz: 0 };
/** The camera's three angles: from the top, tilted (the default), low. */
export type CameraAngle = "top" | "tilt" | "low";
export const CAMERA_ANGLES: Record<CameraAngle, number> = { top: 24, tilt: 50, low: 68 };
export const CAMERA_RX_MIN = 24;
export const CAMERA_RX_MAX = 72;
