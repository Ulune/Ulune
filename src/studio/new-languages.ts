/*
 * The "new" label on the language picker's cards (languages plan, part 28):
 * the languages a release brought (`since` in map.ts: the three Chinese ones
 * came with 2.0) say "new" for the reader's first four weeks with that
 * release, counted from the first time this device opened the picker since.
 * Only that day is kept, as a date, beside what map.ts remembers
 * (REMEMBER_KEY): nothing personal, nothing sent.
 *
 * Read by the picker alone, so it downloads with the picker rather than with
 * every page. Pure but for the storage it is given, so the unit tests read it
 * as it is (scripts/studio-nav.test.mjs).
 */
import { LANGUAGES, REMEMBER_KEY, deviceStore, languageById, type LanguageId } from "./map";

/** The day this device first opened the language picker since each release that brought languages: { "2.0": "2026-10-13" }. */
export type PickerSeen = Readonly<Record<string, string>>;

/** How long a language says "new": the reader's first four weeks with the release that brought it. */
export const NEW_LANGUAGE_DAYS = 28;
const DAY_MS = 86_400_000;

type Store = Pick<Storage, "getItem" | "setItem">;

/** What map.ts keeps, and the days in it, read with care (anything but a real date is dropped); null when the storage cannot be read. */
function readKept(store: Store): { kept: Record<string, unknown>; seen: Record<string, string> } | null {
  let text: string | null;
  try {
    text = store.getItem(REMEMBER_KEY);
  } catch {
    return null;
  }
  let kept: Record<string, unknown> = {};
  try {
    const raw: unknown = JSON.parse(text ?? "{}");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) kept = raw as Record<string, unknown>;
  } catch {
    /* garbled: as on a first visit */
  }
  const days = kept.seen && typeof kept.seen === "object" && !Array.isArray(kept.seen) ? Object.entries(kept.seen) : [];
  const seen = Object.fromEntries(
    days.filter((e): e is [string, string] => typeof e[1] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e[1]) && !Number.isNaN(Date.parse(e[1]))),
  );
  return { kept, seen };
}

/**
 * The picker opens: the day it first did since each release that brought
 * languages, kept the first time (today, as a date). Null when nothing can be
 * kept (private mode, storage switched off or full): those languages are
 * then new for this visit.
 */
export function pickerSeen(now: number = Date.now(), store: Store | null | undefined = deviceStore()): PickerSeen | null {
  const read = store ? readKept(store) : null;
  if (!store || !read) return null;
  const { kept, seen } = read;
  const today = new Date(now).toISOString().slice(0, 10);
  let added = false;
  for (const l of LANGUAGES) {
    // Not kept yet, or a day still to come (the device's clock was ahead then, and "new" would last for months): today.
    if (l.since && (!seen[l.since] || seen[l.since]! > today)) {
      seen[l.since] = today;
      added = true;
    }
  }
  if (!added) return seen;
  try {
    store.setItem(REMEMBER_KEY, JSON.stringify({ ...kept, seen }));
    return seen;
  } catch {
    return null;
  }
}

/**
 * Whether a language's card says "new": one a release brought, within the
 * reader's first four weeks with it, counted from the day this device first
 * opened the picker since (pickerSeen). Nothing kept: new, for this visit.
 */
export function isNewLanguage(id: LanguageId, seen: PickerSeen | null | undefined, now: number): boolean {
  const since = languageById(id).since;
  if (!since) return false;
  const day = seen?.[since];
  const first = day ? Date.parse(day) : Number.NaN;
  if (Number.isNaN(first)) return true;
  return now - first < NEW_LANGUAGE_DAYS * DAY_MS;
}
