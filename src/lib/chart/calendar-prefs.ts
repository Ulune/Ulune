/**
 * The calendar's own settings, kept in this browser only (a convenience:
 * without storage the defaults apply): which clock the times follow, and
 * whether the sky and your transits show.
 */
export type CalendarZone = "device" | "birth" | "utc";
export type CalendarPrefs = { zone: CalendarZone; sky: boolean; yours: boolean };

const KEY = "ulune.calendar.v1";
export const CALENDAR_DEFAULTS: CalendarPrefs = { zone: "device", sky: true, yours: true };

/** Sent when the calendar's settings change, so the other Time pages follow at once. */
export const PREFS_EVENT = "ulune:calendar-prefs";
let lastPrefs: CalendarPrefs | null = null;

export function loadCalendarPrefs(): CalendarPrefs {
  if (lastPrefs) return lastPrefs;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<CalendarPrefs> | null;
    if (!raw || typeof raw !== "object") return CALENDAR_DEFAULTS;
    return {
      zone: raw.zone === "birth" || raw.zone === "utc" ? raw.zone : "device",
      sky: raw.sky !== false,
      yours: raw.yours !== false,
    };
  } catch {
    return CALENDAR_DEFAULTS;
  }
}

export function saveCalendarPrefs(prefs: CalendarPrefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private window, full or blocked storage: the choice lasts the visit */
  }
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
