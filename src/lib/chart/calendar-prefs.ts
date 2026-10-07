/**
 * The calendar's own settings, kept in this browser only (a convenience:
 * without storage the defaults apply): which clock the times follow, and
 * which layers show (calendar-layers.ts). Nothing here leaves the device.
 */
import { cleanChoices, type LayerChoices } from "./calendar-layers";

export type CalendarZone = "device" | "birth" | "utc";
export type CalendarPrefs = {
  zone: CalendarZone;
  /** The layers the reader switched; a layer never switched follows its default. */
  layers: LayerChoices;
};

const KEY = "ulune.calendar.v1";
export const CALENDAR_DEFAULTS: CalendarPrefs = { zone: "device", layers: {} };

/** Sent when the calendar's settings change, so the other Time pages follow at once. */
export const PREFS_EVENT = "ulune:calendar-prefs";
let lastPrefs: CalendarPrefs | null = null;

type Store = Pick<Storage, "getItem" | "setItem">;

/** This browser's storage, or nothing when it is blocked (reading it can throw). */
function browserStore(): Store | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The settings from what was kept. Before the layers (Ulune 1.x) the View
 * menu had two switches, the sky and "For you": they are the layers "sky"
 * and "transits" now, and a choice made then is read as theirs. Numerology,
 * which rode with "For you", is a layer of its own and starts off.
 */
export function parseCalendarPrefs(raw: unknown): CalendarPrefs {
  if (!raw || typeof raw !== "object") return CALENDAR_DEFAULTS;
  const r = raw as { zone?: unknown; layers?: unknown; sky?: unknown; yours?: unknown };
  const layers = cleanChoices(r.layers);
  if (r.layers === undefined) {
    if (r.sky === false) layers.sky = false;
    if (r.yours === false) layers.transits = false;
  }
  return { zone: r.zone === "birth" || r.zone === "utc" ? r.zone : "device", layers };
}

export function loadCalendarPrefs(store?: Store): CalendarPrefs {
  // This visit's last choice first: with storage blocked it still holds for the visit.
  if (!store && lastPrefs) return lastPrefs;
  try {
    const raw: unknown = JSON.parse((store ?? browserStore())?.getItem(KEY) ?? "null");
    return parseCalendarPrefs(raw);
  } catch {
    return CALENDAR_DEFAULTS;
  }
}

export function saveCalendarPrefs(prefs: CalendarPrefs, store?: Store): void {
  try {
    (store ?? browserStore())?.setItem(KEY, JSON.stringify({ zone: prefs.zone, layers: cleanChoices(prefs.layers) }));
  } catch {
    /* private window, full or blocked storage: the choice lasts the visit */
  }
  // A store of its own (the unit tests): the page's memory and its event stay out of it.
  if (store) return;
  // Transits follow the same clock (review 3 Oct, T4): tell them it changed.
  lastPrefs = prefs;
  try {
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch {
    /* no window */
  }
}

/** This device's time zone (IANA), or UTC when the browser will not say. */
export function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "Europe/Paris" → "Paris", "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function zoneCity(zone: string): string {
  if (zone === "UTC" || zone === "Etc/UTC") return "UTC";
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

/** The offset of a zone at a moment, "UTC+2", "UTC−3:30", "UTC". */
export function zoneOffset(zone: string, ms: number): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date(ms));
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(raw);
    if (!m) return "UTC";
    const hours = String(Number(m[2]));
    return `UTC${m[1] === "-" ? "−" : "+"}${hours}${m[3] === "00" ? "" : `:${m[3]}`}`;
  } catch {
    return "UTC";
  }
}
