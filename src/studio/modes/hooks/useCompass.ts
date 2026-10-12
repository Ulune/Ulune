import { useCallback, useEffect, useRef, useState } from "react";

/*
 * The device's compass, for Feng Shui's facing (languages plan, part 22:
 * "on a phone, the sensor reads the heading on the device, with a
 * calibration hint … and a three-reading average"). Read only after the
 * reader asks (iPhones ask for permission then), only while the page that
 * asked is open: it stops when that page goes. Nothing is sent; nothing is
 * kept but the readings the page takes.
 *
 *   - iPhone and iPad: `deviceorientation` with `webkitCompassHeading`, the
 *     magnetic heading of the device's top edge, and `webkitCompassAccuracy`.
 *   - Android (Chrome, Firefox): `deviceorientationabsolute`, whose alpha
 *     turns counter-clockwise from magnetic north: the heading is 360 − alpha.
 *   - The screen's own turn (landscape) is added, so the heading is always
 *     the way the top of the screen points.
 *
 * The heading shown is a short circular average of the last samples, so it
 * holds still while the hand does.
 */

export type CompassState = "idle" | "asking" | "live" | "denied" | "none";

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type PermissionCapable = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const SAMPLES = 8;
/** Without a heading this long after starting, the device has no compass the page can read. */
const NONE_AFTER_MS = 3500;

export const compassSupported = (): boolean => typeof window !== "undefined" && "DeviceOrientationEvent" in window;

function screenTurn(): number {
  const a = typeof screen !== "undefined" ? screen.orientation?.angle : undefined;
  return typeof a === "number" ? a : 0;
}

/** The heading of an orientation event, or null when it carries none. */
export function headingOf(e: OrientationEventWithCompass, absolute: boolean): number | null {
  if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) return (e.webkitCompassHeading + screenTurn() + 360) % 360;
  if (absolute && typeof e.alpha === "number") return (360 - e.alpha + screenTurn() + 360) % 360;
  return null;
}

function circularMean(list: readonly number[]): number {
  const r = Math.PI / 180;
  const s = list.reduce((a, d) => a + Math.sin(d * r), 0);
  const c = list.reduce((a, d) => a + Math.cos(d * r), 0);
  return (Math.atan2(s, c) / r + 360) % 360;
}

export function useCompass(): {
  state: CompassState;
  heading: number | null;
  /** The device's own accuracy in degrees, when it says (iPhones); a large one asks for calibration. */
  accuracy: number | null;
  start: () => Promise<void>;
  stop: () => void;
} {
  const [state, setState] = useState<CompassState>("idle");
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const samples = useRef<number[]>([]);
  const off = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    off.current?.();
    off.current = null;
    samples.current = [];
    setHeading(null);
    setAccuracy(null);
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!compassSupported()) {
      setState("none");
      return;
    }
    off.current?.();
    setState("asking");
    const Ctor = window.DeviceOrientationEvent as PermissionCapable;
    if (typeof Ctor.requestPermission === "function") {
      try {
        if ((await Ctor.requestPermission()) !== "granted") {
          setState("denied");
          return;
        }
      } catch {
        setState("denied");
        return;
      }
    }
    let got = false;
    const onEvent = (absolute: boolean) => (ev: Event) => {
      const h = headingOf(ev as OrientationEventWithCompass, absolute || (ev as DeviceOrientationEvent).absolute === true);
      if (h == null) return;
      got = true;
      samples.current = [...samples.current, h].slice(-SAMPLES);
      setHeading(circularMean(samples.current));
      const acc = (ev as OrientationEventWithCompass).webkitCompassAccuracy;
      setAccuracy(typeof acc === "number" && acc >= 0 ? acc : null);
      setState("live");
    };
    const abs = onEvent(true);
    const rel = onEvent(false);
    window.addEventListener("deviceorientationabsolute", abs);
    window.addEventListener("deviceorientation", rel);
    const timer = window.setTimeout(() => {
      if (!got) {
        off.current?.();
        off.current = null;
        setState("none");
      }
    }, NONE_AFTER_MS);
    off.current = () => {
      window.removeEventListener("deviceorientationabsolute", abs);
      window.removeEventListener("deviceorientation", rel);
      window.clearTimeout(timer);
    };
  }, []);

  // Only while the page that asked is open.
  useEffect(() => () => off.current?.(), []);

  return { state, heading, accuracy, start, stop };
}
