// Harness stub: the default Look, without auth or storage.
import type { ReactNode } from "react";
import { CLASSIC_PLANETS, defaultLook, DEFAULT_LOOK_ID, STROKE_SCALE } from "@/lib/look";

const look = defaultLook();
const LOOK = {
  look,
  profiles: [],
  activeId: DEFAULT_LOOK_ID,
  dirty: false,
  signedIn: false,
  setLook() {},
  patchLook() {},
  resetLook() {},
  applyDefault() {},
  applyProfile() {},
  saveProfile() {},
  renameProfile() {},
  deleteProfile() {},
  strokeScale: STROKE_SCALE[look.stroke],
};
const planets: Record<string, true> = {};
for (const id of CLASSIC_PLANETS) if (look.planets[id]) planets[id] = true;
const SHAPE = {
  glyphFamily: look.glyphFamily,
  pairing: look.pairing,
  textScale: look.textScale,
  stroke: look.stroke,
  strokeScale: STROKE_SCALE[look.stroke],
  planets,
};
export function useLook() {
  return LOOK as never;
}
export function useLookShape() {
  return SHAPE as never;
}
export function useLookPaintRev() {
  return 0;
}
export function useLookProfiles() {
  return { profiles: [], applyProfile() {} } as never;
}
export function LookProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
