import { create } from "zustand";

/*
 * What the reader gave on Feng Shui's home page (languages plan, part 22):
 * the facing as typed (or taken from the compass), where it was read, the
 * compass readings taken, and the year the home was built. Kept in memory
 * only, while Ulune stays open: never in this browser's storage, never sent.
 */
export type HomeSource = "compass" | "map" | "phone";

type HomeInput = {
  /** The facing as the field shows it ("172.5"); empty before one is given. */
  typed: string;
  source: HomeSource;
  /** The compass readings taken towards the next facing, up to three. */
  readings: number[];
  year: string;
  setTyped: (typed: string, source?: HomeSource) => void;
  setSource: (source: HomeSource) => void;
  addReading: (deg: number) => void;
  clearReadings: () => void;
  setYear: (year: string) => void;
};

export const useHomeInput = create<HomeInput>((set) => ({
  typed: "",
  source: "compass",
  readings: [],
  year: "",
  setTyped: (typed, source) => set((s) => ({ typed, source: source ?? (s.source === "phone" ? "compass" : s.source) })),
  setSource: (source) => set({ source }),
  addReading: (deg) => set((s) => ({ readings: [...s.readings, deg].slice(-3) })),
  clearReadings: () => set({ readings: [] }),
  setYear: (year) => set({ year }),
}));

/** The typed facing as a number in [0, 360), or null. Accepts "172.5", "172,5", "172.5°". */
export function parseFacing(typed: string): number | null {
  const t = typed.trim().replace(",", ".").replace(/°$/, "");
  if (!/^\d{1,3}(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n < 360 ? n : null;
}

/** The typed year, if it is one Ulune can place in a period (1864 to 2100). */
export function parseYear(typed: string): number | null {
  const t = typed.trim();
  if (!/^\d{4}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1864 && n <= 2100 ? n : null;
}
