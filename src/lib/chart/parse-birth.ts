export type NormalizedBirth = {
  name: string;
  date: string;
  time: string;
  placeLabel: string;
  latitude: number;
  longitude: number;
  coordsFromText: boolean;
  timeUnknown: boolean;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  janv: 1,
  janvier: 1,
  feb: 2,
  february: 2,
  fev: 2,
  fevrier: 2,
  février: 2,
  mar: 3,
  march: 3,
  mars: 3,
  apr: 4,
  april: 4,
  avr: 4,
  avril: 4,
  may: 5,
  mai: 5,
  jun: 6,
  june: 6,
  juin: 6,
  jul: 7,
  july: 7,
  juil: 7,
  juillet: 7,
  aug: 8,
  august: 8,
  aout: 8,
  août: 8,
  sep: 9,
  sept: 9,
  september: 9,
  septembre: 9,
  oct: 10,
  october: 10,
  octobre: 10,
  nov: 11,
  november: 11,
  novembre: 11,
  dec: 12,
  december: 12,
  decembre: 12,
  décembre: 12,
};

/** Earliest and latest birth years the shipped ephemeris files cover (ephe/: 600 BC – 2399 AD). */
export const MIN_BIRTH_YEAR = 1;
export const MAX_BIRTH_YEAR = 2399;

/**
 * Days in a month. Dates before 15 October 1582 are Julian-calendar dates
 * (every fourth year a leap year), as the chart calculation reads them.
 */
function daysInMonth(year: number, month: number, day = 1): number {
  const julian = year < 1582 || (year === 1582 && (month < 10 || (month === 10 && day < 15)));
  if (month !== 2) return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  const leap = julian ? year % 4 === 0 : (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? 29 : 28;
}

type CoordPart = { value: number; axis: "lat" | "lon" | null };

/**
 * One coordinate: decimal ("-74.006", "74.006 W", "W 74.006"), degrees-
 * minutes-seconds ("74°00'22\"W", "40° 42′ 46″ N") or the astrological
 * notation of atlases and Astro-Databank ("40n43", "74w00", "2e20'15").
 * A hemisphere letter sets the sign and says which axis it is.
 */
function parseCoordPart(raw: string): CoordPart | null {
  const s = raw
    .trim()
    .replace(/[\u2032\u2019\u00b4]/g, "'")
    .replace(/[\u2033\u201d]/g, '"')
    .replace(/''/g, '"')
    .replace(/\u00ba/g, "°")
    .replace(/\u2212/g, "-");
  if (!s) return null;
  const axisOf = (h: string) => (/[ns]/i.test(h) ? ("lat" as const) : ("lon" as const));
  const signOf = (h: string) => (/[sw]/i.test(h) ? -1 : 1);

  // Astrological notation: degrees, hemisphere letter, minutes[, seconds].
  let m = /^(\d{1,3})\s*([nsew])\s*(\d{1,2}(?:\.\d+)?)(?:\s*[':]\s*(\d{1,2}(?:\.\d+)?)\s*"?)?$/i.exec(s);
  if (m) {
    const min = Number(m[3]);
    const sec = Number(m[4] ?? 0);
    if (min >= 60 || sec >= 60) return null;
    return { value: signOf(m[2]) * (Number(m[1]) + min / 60 + sec / 3600), axis: axisOf(m[2]) };
  }

  // Decimal or D°M'S", with an optional hemisphere letter before or after.
  m =
    /^([nsew])?\s*([+-])?\s*(\d{1,3}(?:\.\d+)?)\s*(?:°|d\b)?\s*(?:(\d{1,2}(?:\.\d+)?)\s*')?\s*(?:(\d{1,2}(?:\.\d+)?)\s*")?\s*([nsew])?$/i.exec(
      s,
    );
  if (!m) return null;
  const [, pre, sign, deg, min, sec, post] = m;
  if (pre && post) return null;
  if ((min && deg.includes(".")) || (sec && (!min || min.includes(".")))) return null;
  if (Number(min ?? 0) >= 60 || Number(sec ?? 0) >= 60) return null;
  const hemi = pre ?? post;
  if (hemi && sign === "-") return null;
  const magnitude = Number(deg) + Number(min ?? 0) / 60 + Number(sec ?? 0) / 3600;
  const value = (sign === "-" ? -1 : 1) * (hemi ? signOf(hemi) : 1) * magnitude;
  return { value, axis: hemi ? axisOf(hemi) : null };
}

/**
 * Coordinates typed instead of a place name: "48.8566, 2.3522",
 * "40.7128 N 74.0060 W", "40°42'46\"N 74°00'22\"W", "48n52 2e20" — latitude
 * first unless hemisphere letters say otherwise. Null if it is not a pair.
 */
export function parseCoords(text: string): { latitude: number; longitude: number } | null {
  const s = text.trim().replace(/\s+/g, " ");
  if (!s || !/\d/.test(s)) return null;
  const splits: Array<[string, string]> = [];
  const sep = /[,;]/.exec(s);
  if (sep && s.indexOf(sep[0], sep.index + 1) < 0) {
    splits.push([s.slice(0, sep.index), s.slice(sep.index + 1)]);
  } else if (!sep) {
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === " ") splits.push([s.slice(0, i), s.slice(i + 1)]);
    }
  }
  const readings: Array<{ latitude: number; longitude: number }> = [];
  for (const [left, right] of splits) {
    const a = parseCoordPart(left);
    const b = parseCoordPart(right);
    if (!a || !b) continue;
    if (a.axis && b.axis && a.axis === b.axis) continue;
    const latFirst = a.axis === "lat" || b.axis === "lon" || (!a.axis && !b.axis);
    const lat = latFirst ? a.value : b.value;
    const lon = latFirst ? b.value : a.value;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    readings.push({ latitude: lat, longitude: lon });
  }
  // Two ways to read the same text ("48.85 N 2.35": is the N the first
  // number's or the second's?) that disagree: refuse rather than guess a place.
  const first = readings[0];
  if (!first) return null;
  const agree = readings.every(
    (r) => Math.abs(r.latitude - first.latitude) < 1e-12 && Math.abs(r.longitude - first.longitude) < 1e-12,
  );
  return agree ? first : null;
}

export function parseDate(raw: string): { year: number; month: number; day: number } {
  const s = raw.trim();
  if (!s) throw new Error("E:birth.date.missing");

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return checkDate(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12) return checkDate(y, b, a);
    if (b > 12) return checkDate(y, a, b);
    return checkDate(y, b, a);
  }

  m = s.match(/^(\d{1,2})\s+([A-Za-zéûôàèùîç.]+)\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase().replace(/\./g, "")];
    if (!month) throw new Error(`E:birth.month.unreadable|${raw}`);
    return checkDate(+m[3], month, +m[1]);
  }

  m = s.match(/^([A-Za-zéûôàèùîç.]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase().replace(/\./g, "")];
    if (!month) throw new Error(`E:birth.month.unreadable|${raw}`);
    return checkDate(+m[3], month, +m[2]);
  }

  throw new Error("E:birth.date.format");
}

function checkDate(year: number, month: number, day: number) {
  if (year < MIN_BIRTH_YEAR || year > MAX_BIRTH_YEAR) {
    throw new Error("E:birth.year.range");
  }
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month, day)) {
    throw new Error("E:birth.date.invalid");
  }
  return { year, month, day };
}

export function parseTime(raw: string): {
  hour: number;
  minute: number;
  second: number;
  unknown: boolean;
} {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return { hour: 12, minute: 0, second: 0, unknown: true };

  let rest = s;
  let pm = false;
  let am = false;
  if (/\bp\.?m\.?\b/.test(rest)) {
    pm = true;
    rest = rest.replace(/\s*p\.?m\.?\b/, "");
  } else if (/\ba\.?m\.?\b/.test(rest)) {
    am = true;
    rest = rest.replace(/\s*a\.?m\.?\b/, "");
  }

  let hour = 0;
  let minute = 0;
  let second = 0;
  const m = rest.match(/^(\d{1,2})[:h.](\d{2})(?::(\d{2}))?$/);
  if (m) {
    hour = +m[1];
    minute = +m[2];
    second = m[3] ? +m[3] : 0;
  } else if (/^\d{3,4}$/.test(rest)) {
    const pad = rest.padStart(4, "0");
    hour = +pad.slice(0, 2);
    minute = +pad.slice(2, 4);
  } else {
    throw new Error("E:birth.time.format");
  }

  if (pm && hour < 12) hour += 12;
  if (am && hour === 12) hour = 0;
  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error("E:birth.time.invalid");
  }
  return { hour, minute, second, unknown: false };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Display a stored or typed date as European DD/MM/YYYY. Incomplete strings stay as typed. */
export function formatEuropeanDate(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  try {
    const d = parseDate(s);
    return `${pad(d.day)}/${pad(d.month)}/${d.year}`;
  } catch {
    return s;
  }
}

/**
 * Finished European date (D/M/YYYY or DD/MM/YYYY) — used to auto-advance.
 * Does not rewrite the field while the user is still typing.
 */
export function isCompleteBirthDate(raw: string): boolean {
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw.trim())) return false;
  try {
    parseDate(raw);
    return true;
  } catch {
    return false;
  }
}

/** A valid 24h time to cast with: HH:MM, or HH:MM:SS for a rectified time. */
export function isValidBirthTime(raw: string): boolean {
  if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(raw.trim())) return false;
  try {
    return !parseTime(raw).unknown;
  } catch {
    return false;
  }
}

/** Finished 24h time (HH:MM). Seconds are extra; do not treat HH:MM:SS as the advance point. */
export function isCompleteBirthTime(raw: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(raw.trim())) return false;
  try {
    const t = parseTime(raw);
    return !t.unknown;
  } catch {
    return false;
  }
}

/**
 * Insert `/` after DD and MM while typing DD/MM/YYYY.
 * Backspace is allowed to remove a trailing slash; typing `/` after a single
 * digit pads that part (5/ → 05/). ISO and month-name input is left alone.
 */
export function maskEuropeanDate(raw: string, _prev = "", deleting = false): string {
  if (/[a-zA-Z]/.test(raw)) return raw;
  if (/^\d{4}-/.test(raw.trim())) return raw;

  const sepTyped = !deleting && /[./-]$/.test(raw);
  let digits = raw.replace(/\D/g, "").slice(0, 8);

  if (sepTyped) {
    if (digits.length === 1) digits = digits.padStart(2, "0");
    else if (digits.length === 3) digits = `${digits.slice(0, 2)}${digits.slice(2).padStart(2, "0")}`;
  }

  if (digits.length === 0) return "";
  if (digits.length <= 1) return digits;
  if (digits.length === 2) return deleting ? digits : `${digits}/`;
  if (digits.length <= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) {
    const body = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    return deleting ? body : `${body}/`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Insert `:` after HH while typing HH:MM (seconds stay optional).
 * Backspace may remove a trailing colon; `9:` pads to `09:`.
 */
export function maskBirthTime(raw: string, _prev = "", deleting = false): string {
  if (/[a-zA-Z]/.test(raw)) return raw;

  const sepTyped = !deleting && /[:h.]$/i.test(raw);
  let digits = raw.replace(/\D/g, "").slice(0, 6);

  if (sepTyped && digits.length === 1) digits = digits.padStart(2, "0");

  if (digits.length === 0) return "";
  if (digits.length <= 1) return digits;
  if (digits.length === 2) return deleting ? digits : `${digits}:`;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
}

/** Place the caret after `digitCount` digits, skipping an auto-inserted separator. */
export function caretAfterMaskedDigits(formatted: string, digitCount: number, passSep: boolean): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] < "0" || formatted[i] > "9") continue;
    seen++;
    if (seen !== digitCount) continue;
    let pos = i + 1;
    if (passSep && (formatted[pos] === "/" || formatted[pos] === ":")) pos++;
    return pos;
  }
  return formatted.length;
}

/** Blank time is unknown. Explicit `timeUnknown` stays unknown even if time is noon. Never infer unknown from `"12:00"` alone. */
export function resolveTimeUnknown(input: { time?: string; timeUnknown?: boolean }): boolean {
  if (!(input.time ?? "").trim()) return true;
  return input.timeUnknown === true;
}

export function normalizeBirth(input: {
  name?: string;
  date: string;
  time: string;
  placeLabel: string;
  latitude?: number;
  longitude?: number;
  timeUnknown?: boolean;
}): NormalizedBirth {
  const d = parseDate(input.date);
  const t = parseTime(input.time);
  const coords = parseCoords(input.placeLabel);
  return {
    name: (input.name ?? "").trim(),
    date: `${d.year}-${pad(d.month)}-${pad(d.day)}`,
    // Keep the seconds the user typed (14:30:45) — they shift the angles by
    // arcminutes. Plain HH:MM inputs stay HH:MM.
    time: t.second ? `${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)}` : `${pad(t.hour)}:${pad(t.minute)}`,
    placeLabel: input.placeLabel.trim(),
    latitude: coords?.latitude ?? input.latitude ?? NaN,
    longitude: coords?.longitude ?? input.longitude ?? NaN,
    coordsFromText: Boolean(coords),
    timeUnknown: resolveTimeUnknown(input) || t.unknown,
  };
}
