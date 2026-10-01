import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onThemeApplied, useTheme } from "@/lib/theme";
import {
  applyLook,
  clearLook,
  cloneLook,
  cloneLookLibrary,
  createLookProfile,
  DEFAULT_LOOK_ID,
  defaultLook,
  emptyLookLibrary,
  loadLookLibrary,
  MAX_LOOK_PROFILES,
  nextLookProfileName,
  saveLookLibrary,
  sameLook,
  STROKE_SCALE,
  CLASSIC_PLANETS,
  type ClassicPlanet,
  type LookLibrary,
  type LookProfile,
  type LookState,
} from "@/lib/look";

type LookApi = {
  look: LookState;
  profiles: LookProfile[];
  activeId: string;
  dirty: boolean;
  setLook: (next: LookState) => void;
  patchLook: (fn: (prev: LookState) => LookState) => void;
  resetLook: () => void;
  applyDefault: () => void;
  applyProfile: (id: string) => void;
  saveProfile: (nameForNew?: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  strokeScale: number;
};

const LookContext = createContext<LookApi | null>(null);

/**
 * What changes how the wheel and glyphs are drawn, without the colour values:
 * those live in CSS variables (applyLook), so dragging a colour slider
 * re-renders none of the charts.
 */
export type LookShape = {
  glyphFamily: LookState["glyphFamily"];
  pairing: LookState["pairing"];
  textScale: number;
  stroke: LookState["stroke"];
  strokeScale: number;
  /** Which classic planets carry their own colour (the colour itself is `var(--planet-…)`). */
  planets: Partial<Record<ClassicPlanet, true>>;
};

const LookShapeContext = createContext<LookShape | null>(null);
/** Bumps once colours have settled after a change (for pictures drawn from them: the 3D view). */
const LookPaintContext = createContext(0);
const LookProfilesContext = createContext<Pick<LookApi, "profiles" | "applyProfile"> | null>(null);

/** A slider sends a change per pixel; storage and 3D pictures follow once it rests. */
const SETTLE_MS = 160;

export function LookProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const [library, setLibrary] = useState<LookLibrary>(emptyLookLibrary);
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const [paintRev, setPaintRev] = useState(0);
  const pendingSave = useRef<LookLibrary | null>(null);
  const saveTimer = useRef<number | null>(null);
  const paintTimer = useRef<number | null>(null);

  const flushSave = useCallback(() => {
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const next = pendingSave.current;
    pendingSave.current = null;
    if (next) saveLookLibrary(next);
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", onHide);
      flushSave();
      if (paintTimer.current != null) window.clearTimeout(paintTimer.current);
    };
  }, [flushSave]);

  const persist = useCallback(
    (next: LookLibrary) => {
      const cloned = cloneLookLibrary(next);
      setLibrary(cloned);
      // The picture follows at once through the CSS variables…
      applyLook(document.documentElement, cloned.live, themeRef.current);
      // …storage and the 3D view's pictures once the change rests.
      pendingSave.current = cloned;
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(flushSave, SETTLE_MS);
      if (paintTimer.current != null) window.clearTimeout(paintTimer.current);
      paintTimer.current = window.setTimeout(() => {
        paintTimer.current = null;
        setPaintRev((n) => n + 1);
      }, SETTLE_MS);
    },
    [flushSave],
  );

  // The Look's day and night swatches follow a theme switch inside its
  // cross-fade (the effect below reloads the library after it).
  useEffect(() => onThemeApplied((next) => applyLook(document.documentElement, libraryRef.current.live, next)), []);

  // The window moved to a screen with another gamut (a Mac with an external
  // display): the colours are painted for it (lib/color-gamut.ts).
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(color-gamut: p3)");
    const onChange = () => {
      applyLook(document.documentElement, libraryRef.current.live, themeRef.current);
      setPaintRev((n) => n + 1);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    // A change still settling is written first, so it is read back here.
    flushSave();
    const next = loadLookLibrary();
    setLibrary(next);
    saveLookLibrary(next);
    applyLook(document.documentElement, next.live, theme);
  }, [theme, flushSave]);

  const setLook = useCallback(
    (next: LookState) => {
      persist({ ...libraryRef.current, live: cloneLook(next) });
    },
    [persist],
  );

  const patchLook = useCallback(
    (fn: (prev: LookState) => LookState) => {
      const prev = libraryRef.current;
      persist({ ...prev, live: cloneLook(fn(prev.live)) });
    },
    [persist],
  );

  const resetLook = useCallback(() => {
    const next = defaultLook();
    clearLook(document.documentElement);
    persist({ ...libraryRef.current, live: next, activeId: DEFAULT_LOOK_ID });
  }, [persist]);

  const applyDefault = useCallback(() => {
    persist({ ...libraryRef.current, live: defaultLook(), activeId: DEFAULT_LOOK_ID });
  }, [persist]);

  const applyProfile = useCallback(
    (id: string) => {
      const prev = libraryRef.current;
      const row = prev.profiles.find((p) => p.id === id);
      if (!row) return;
      persist({ ...prev, live: cloneLook(row.look), activeId: id });
    },
    [persist],
  );

  const saveProfile = useCallback(
    (nameForNew?: string) => {
      const prev = libraryRef.current;
      const active = prev.profiles.find((p) => p.id === prev.activeId);
      if (active) {
        persist({
          ...prev,
          profiles: prev.profiles.map((p) => (p.id === active.id ? { ...p, look: cloneLook(prev.live) } : p)),
          activeId: active.id,
        });
        return;
      }
      if (prev.profiles.length >= MAX_LOOK_PROFILES) return;
      const name =
        nameForNew?.trim() ||
        nextLookProfileName(prev.profiles, (n) => `Look ${n}`);
      const row = createLookProfile(name, prev.live);
      persist({ ...prev, profiles: [...prev.profiles, row], activeId: row.id });
    },
    [persist],
  );

  const renameProfile = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed) return;
      const prev = libraryRef.current;
      persist({
        ...prev,
        profiles: prev.profiles.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
      });
    },
    [persist],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      const prev = libraryRef.current;
      const profiles = prev.profiles.filter((p) => p.id !== id);
      const activeId = prev.activeId === id ? DEFAULT_LOOK_ID : prev.activeId;
      const live = activeId === DEFAULT_LOOK_ID && prev.activeId === id ? defaultLook() : prev.live;
      persist({ live, activeId, profiles });
    },
    [persist],
  );

  const look = library.live;
  const active = library.profiles.find((p) => p.id === library.activeId);
  const dirty = active ? !sameLook(look, active.look) : !sameLook(look, defaultLook());

  const value = useMemo(
    () => ({
      look,
      profiles: library.profiles,
      activeId: library.activeId,
      dirty,
      setLook,
      patchLook,
      resetLook,
      applyDefault,
      applyProfile,
      saveProfile,
      renameProfile,
      deleteProfile,
      strokeScale: STROKE_SCALE[look.stroke],
    }),
    [
      look,
      library.profiles,
      library.activeId,
      dirty,
      setLook,
      patchLook,
      resetLook,
      applyDefault,
      applyProfile,
      saveProfile,
      renameProfile,
      deleteProfile,
    ],
  );

  const planetKey = CLASSIC_PLANETS.filter((id) => Boolean(look.planets[id])).join(",");
  const planets = useMemo(() => {
    const out: Partial<Record<ClassicPlanet, true>> = {};
    for (const id of planetKey ? (planetKey.split(",") as ClassicPlanet[]) : []) out[id] = true;
    return out;
  }, [planetKey]);
  const shape = useMemo<LookShape>(
    () => ({
      glyphFamily: look.glyphFamily,
      pairing: look.pairing,
      textScale: look.textScale,
      stroke: look.stroke,
      strokeScale: STROKE_SCALE[look.stroke],
      planets,
    }),
    [look.glyphFamily, look.pairing, look.textScale, look.stroke, planets],
  );
  const profilesValue = useMemo(
    () => ({ profiles: library.profiles, applyProfile }),
    [library.profiles, applyProfile],
  );

  return (
    <LookContext.Provider value={value}>
      <LookShapeContext.Provider value={shape}>
        <LookPaintContext.Provider value={paintRev}>
          <LookProfilesContext.Provider value={profilesValue}>{children}</LookProfilesContext.Provider>
        </LookPaintContext.Provider>
      </LookShapeContext.Provider>
    </LookContext.Provider>
  );
}

const DEFAULT_SHAPE: LookShape = (() => {
  const look = defaultLook();
  const planets: Partial<Record<ClassicPlanet, true>> = {};
  for (const id of CLASSIC_PLANETS) if (look.planets[id]) planets[id] = true;
  return {
    glyphFamily: look.glyphFamily,
    pairing: look.pairing,
    textScale: look.textScale,
    stroke: look.stroke,
    strokeScale: STROKE_SCALE[look.stroke],
    planets,
  };
})();

/** The Look as the charts need it: re-renders only when drawing changes, never for a colour. */
export function useLookShape(): LookShape {
  return useContext(LookShapeContext) ?? DEFAULT_SHAPE;
}

/** Counts settled colour changes: redraw pictures made from the colours (3D). */
export function useLookPaintRev(): number {
  return useContext(LookPaintContext);
}

/** Saved Look profiles, for pickers that don't follow every colour change. */
export function useLookProfiles(): Pick<LookApi, "profiles" | "applyProfile"> {
  return useContext(LookProfilesContext) ?? { profiles: [], applyProfile: () => {} };
}

export function useLook(): LookApi {
  const ctx = useContext(LookContext);
  if (!ctx) {
    return {
      look: defaultLook(),
      profiles: [],
      activeId: DEFAULT_LOOK_ID,
      dirty: false,
      setLook: () => {},
      patchLook: () => {},
      resetLook: () => {},
      applyDefault: () => {},
      applyProfile: () => {},
      saveProfile: () => {},
      renameProfile: () => {},
      deleteProfile: () => {},
      strokeScale: 1,
    };
  }
  return ctx;
}
