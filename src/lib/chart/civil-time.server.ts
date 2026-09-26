/**
 * Civil (wall-clock) time ↔ UTC, from the IANA tz database bundled with the
 * app *including* its pre-1970 history (tzdb-data.json, built by
 * scripts/build-tzdb.py) — never from the runtime's Intl/ICU zones. ICU ships
 * tzdb without "backzone": zones that agree only since 1970 are merged, so
 * Europe/Oslo reads as Europe/Berlin, Europe/Amsterdam as Europe/Brussels,
 * Atlantic/Reykjavik as Africa/Abidjan, and a birth in Oslo in the summer of
 * 1962 comes out an hour wrong. Here every zone keeps its own history.
 *
 * Also handled here, as professional chart software does:
 * - Before a zone adopted standard time its clocks kept Local Mean Time. The
 *   database's "LMT" is the mean time of the zone's main city; a birth
 *   elsewhere kept its own, so LMT is taken from the birthplace's longitude
 *   (4 minutes of time per degree) when one is given.
 * - A wall time that happened twice (clocks turned back) is reported as
 *   ambiguous with both readings; one that never happened (clocks turned
 *   forward) as nonexistent. Neither is silently guessed without a flag.
 */
import source from "./tzdb-data.json" with { type: "json" };

type RawZone = { y: [number, number, string][]; t: string; i: string; f: string; l?: number };
type Source = {
  version: string;
  source: string;
  zones: Record<string, RawZone>;
  links: Record<string, string>;
};

const DB = source as unknown as Source;

/** The tz database release the bundled data was built from, e.g. "2026a". */
export const TZDB_VERSION = DB.version;

/** A zone's local time at some instant. `offset` is seconds east of UTC. */
export type ZoneType = { offset: number; dst: boolean; abbr: string };

type PosixRule = {
  std: ZoneType;
  dst: ZoneType | null;
  start: RuleDate | null;
  end: RuleDate | null;
};

type RuleDate =
  | { kind: "M"; month: number; week: number; weekday: number; time: number }
  | { kind: "J"; day: number; time: number }
  | { kind: "N"; day: number; time: number };

type Zone = {
  id: string;
  types: ZoneType[];
  /** Transition instants, seconds since the Unix epoch, ascending. */
  at: number[];
  /** The type each transition starts. */
  to: number[];
  /** Local time after the last transition (POSIX TZ rule), if any. */
  rule: PosixRule | null;
  /**
   * When the zone's initial Local Mean Time ended (UTC seconds), or null. Only
   * before this is "LMT" the local clock of each place; a later "LMT" in the
   * database is a capital's mean time kept as legal time (Lisbon 1884–1912).
   */
  lmtUntil: number | null;
};

const zoneCache = new Map<string, Zone>();

const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);

/** The canonical zone for a tz identifier (links resolved), or null if unknown. */
export function canonicalZone(id: string | null | undefined): string | null {
  if (!id || typeof id !== "string") return null;
  if (own(DB.zones, id)) return id;
  const target = own(DB.links, id) ? DB.links[id] : undefined;
  return target && own(DB.zones, target) ? target : null;
}

function loadZone(id: string): Zone | null {
  const name = canonicalZone(id);
  if (!name) return null;
  const hit = zoneCache.get(name);
  if (hit) return hit;
  const raw = DB.zones[name];
  const types = raw.y.map(([offset, dst, abbr]) => ({ offset, dst: dst === 1, abbr }));
  const at: number[] = [];
  let t = 0;
  if (raw.t) {
    for (const part of raw.t.split(",")) {
      t += parseInt(part, 36);
      at.push(t);
    }
  }
  const to = [...raw.i].map((ch) => parseInt(ch, 36));
  const zone: Zone = {
    id: name,
    types,
    at,
    to,
    rule: raw.f ? parsePosix(raw.f) : null,
    lmtUntil: typeof raw.l === "number" ? raw.l : null,
  };
  zoneCache.set(name, zone);
  return zone;
}

/* ------------------------------------------------------------------ */
/* POSIX TZ rules (the TZif footer): local time after the last listed  */
/* transition, e.g. "CET-1CEST,M3.5.0,M10.5.0/3".                       */
/* ------------------------------------------------------------------ */

function parsePosix(spec: string): PosixRule | null {
  let i = 0;
  const name = (): string | null => {
    if (spec[i] === "<") {
      const end = spec.indexOf(">", i);
      if (end < 0) return null;
      const out = spec.slice(i + 1, end);
      i = end + 1;
      return out;
    }
    const m = /^[A-Za-z]{3,}/.exec(spec.slice(i));
    if (!m) return null;
    i += m[0].length;
    return m[0];
  };
  /** [+-]hh[:mm[:ss]] in seconds, or null. */
  const hms = (): number | null => {
    const m = /^([+-]?)(\d{1,3})(?::(\d{1,2}))?(?::(\d{1,2}))?/.exec(spec.slice(i));
    if (!m) return null;
    i += m[0].length;
    const v = Number(m[2]) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
    return m[1] === "-" ? -v : v;
  };
  const date = (): RuleDate | null => {
    let d: RuleDate | null = null;
    let m = /^M(\d{1,2})\.(\d)\.(\d)/.exec(spec.slice(i));
    if (m) {
      d = { kind: "M", month: Number(m[1]), week: Number(m[2]), weekday: Number(m[3]), time: 7200 };
    } else if ((m = /^J(\d{1,3})/.exec(spec.slice(i)))) {
      d = { kind: "J", day: Number(m[1]), time: 7200 };
    } else if ((m = /^(\d{1,3})/.exec(spec.slice(i)))) {
      d = { kind: "N", day: Number(m[1]), time: 7200 };
    }
    if (!d || !m) return null;
    i += m[0].length;
    if (spec[i] === "/") {
      i += 1;
      const t = hms();
      if (t == null) return null;
      d.time = t;
    }
    return d;
  };

  const stdName = name();
  if (stdName == null) return null;
  const stdOff = hms();
  if (stdOff == null) return null;
  // POSIX offsets count west of Greenwich as positive.
  const std: ZoneType = { offset: -stdOff, dst: false, abbr: stdName };
  if (i >= spec.length) return { std, dst: null, start: null, end: null };
  const dstName = name();
  if (dstName == null) return { std, dst: null, start: null, end: null };
  let dstOffset = std.offset + 3600;
  if (spec[i] !== "," && i < spec.length) {
    const v = hms();
    if (v != null) dstOffset = -v;
  }
  const dst: ZoneType = { offset: dstOffset, dst: true, abbr: dstName };
  if (spec[i] !== ",") return { std, dst: null, start: null, end: null };
  i += 1;
  const start = date();
  if (!start || spec[i] !== ",") return { std, dst: null, start: null, end: null };
  i += 1;
  const end = date();
  if (!end) return { std, dst: null, start: null, end: null };
  return { std, dst, start, end };
}

/** Days since 1970-01-01 of a proleptic Gregorian date (month 1–12). */
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Days since 1970-01-01 of a Julian-calendar date (month 1–12). */
export function daysFromJulian(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
  return jdn - 2440588;
}

/**
 * Dates before 15 October 1582 are read in the Julian calendar, the
 * convention of Swiss Ephemeris and of astrological software generally
 * (historical records before the reform are Julian).
 */
export function isJulianDate(y: number, m: number, d: number): boolean {
  return y < 1582 || (y === 1582 && (m < 10 || (m === 10 && d < 15)));
}

/** Days in a month of the Julian (every 4th year leap) or Gregorian calendar. */
export function monthLength(y: number, m: number, julian: boolean): number {
  if (m !== 2) return MONTH_DAYS[m - 1];
  const leap = julian ? y % 4 === 0 : isLeap(y);
  return leap ? 29 : 28;
}

/** The civil date of a day count since 1970-01-01. */
export function civilFromDays(z: number): { year: number; month: number; day: number } {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Seconds of local time (from 1970-01-01 00:00 local) at which `d` falls in `year`. */
function ruleLocalSeconds(d: RuleDate, year: number): number {
  let day: number;
  if (d.kind === "M") {
    const first = daysFromCivil(year, d.month, 1);
    const firstDow = (((first + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday (4)
    let dom = 1 + ((d.weekday - firstDow + 7) % 7) + (d.week - 1) * 7;
    const len = d.month === 2 && isLeap(year) ? 29 : MONTH_DAYS[d.month - 1];
    while (dom > len) dom -= 7;
    day = first + dom - 1;
  } else if (d.kind === "J") {
    // 1–365, February 29 never counted.
    const n = d.day;
    day = daysFromCivil(year, 1, 1) + n - 1 + (isLeap(year) && n >= 60 ? 1 : 0);
  } else {
    day = daysFromCivil(year, 1, 1) + d.day;
  }
  return day * 86400 + d.time;
}

/** A rule's transitions around a year, as [utc seconds, type] pairs, ascending. */
function ruleTransitions(rule: PosixRule, fromYear: number, toYear: number): Array<[number, ZoneType]> {
  if (!rule.dst || !rule.start || !rule.end) return [];
  const out: Array<[number, ZoneType]> = [];
  for (let y = fromYear; y <= toYear; y += 1) {
    // DST starts at a local standard-time moment and ends at a local DST one.
    out.push([ruleLocalSeconds(rule.start, y) - rule.std.offset, rule.dst]);
    out.push([ruleLocalSeconds(rule.end, y) - rule.dst.offset, rule.std]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

function yearOfSeconds(t: number): number {
  return civilFromDays(Math.floor(t / 86400)).year;
}

function ruleTypeAt(rule: PosixRule, t: number): ZoneType {
  if (!rule.dst || !rule.start || !rule.end) return rule.std;
  const y = yearOfSeconds(t);
  const events = ruleTransitions(rule, y - 1, y + 1);
  let current: ZoneType | null = null;
  for (const [at, type] of events) {
    if (at <= t) current = type;
    else break;
  }
  // Before the first event of year y-1 the state is the one the last event of
  // y-2 set, i.e. the type of that year's final transition.
  return current ?? events[events.length - 1][1];
}

/* ------------------------------------------------------------------ */

/**
 * Local Mean Time of a longitude (4 minutes of time per degree, east
 * positive), on the same side of the date line as `reference`, an offset the
 * place's calendar is known to keep: before 1867 Alaska counted its days with
 * Asia (+14:58 at Sitka, not −9:01), the Philippines with America until 1844,
 * and a Chukotka village across 180° with Anadyr, not with Alaska.
 */
export function lmtOffsetNear(longitude: number, reference: number): number {
  let offset = longitude * 240;
  while (offset - reference > 43200) offset -= 86400;
  while (offset - reference < -43200) offset += 86400;
  return offset;
}

/** The birthplace's own LMT in place of the zone's, while the zone was still on Local Mean Time. */
function withLmt(zone: Zone, type: ZoneType, t: number, lmtLongitude: number | undefined): ZoneType {
  if (lmtLongitude == null || zone.lmtUntil == null || t >= zone.lmtUntil || type.abbr !== "LMT") return type;
  return { offset: lmtOffsetNear(lmtLongitude, type.offset), dst: false, abbr: "LMT" };
}

function upperIndex(at: number[], t: number): number {
  // Number of transitions at or before t.
  let lo = 0;
  let hi = at.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (at[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function typeAtZone(zone: Zone, t: number, lmtLongitude?: number): ZoneType {
  const n = zone.at.length;
  let type: ZoneType;
  if (n === 0) type = zone.rule ? ruleTypeAt(zone.rule, t) : zone.types[0];
  else {
    const k = upperIndex(zone.at, t);
    if (k === 0) type = zone.types[0];
    else if (k === n && zone.rule) type = ruleTypeAt(zone.rule, t);
    else type = zone.types[zone.to[k - 1]];
  }
  return withLmt(zone, type, t, lmtLongitude);
}

/**
 * The local-time type in force in `zone` at a UTC instant (seconds since the
 * Unix epoch). With `lmtLongitude`, the zone's initial Local Mean Time is the
 * birthplace's own instead of the zone's main city's.
 */
export function zoneTypeAt(zoneId: string, utcSeconds: number, lmtLongitude?: number): ZoneType {
  const zone = loadZone(zoneId);
  if (!zone) throw new Error(`E:tz.unknown|${zoneId}`);
  return typeAtZone(zone, utcSeconds, lmtLongitude);
}

/** Every type a zone might be in within [t0, t1] (UTC seconds). */
function typesAround(zone: Zone, t0: number, t1: number, lmtLongitude?: number): ZoneType[] {
  const out: ZoneType[] = [typeAtZone(zone, t0, lmtLongitude)];
  const n = zone.at.length;
  for (let k = upperIndex(zone.at, t0); k < n && zone.at[k] <= t1; k += 1) {
    out.push(withLmt(zone, zone.types[zone.to[k]], zone.at[k], lmtLongitude));
  }
  // The LMT period can end without a listed transition (merged with a legal
  // mean time of the same offset): the zone's own offset resumes there.
  if (lmtLongitude != null && zone.lmtUntil != null && zone.lmtUntil > t0 && zone.lmtUntil <= t1) {
    out.push(typeAtZone(zone, zone.lmtUntil, lmtLongitude));
  }
  const lastAt = n ? zone.at[n - 1] : -Infinity;
  if (zone.rule && t1 >= lastAt) {
    const from = Math.max(t0, lastAt);
    for (const [at, type] of ruleTransitions(zone.rule, yearOfSeconds(from) - 1, yearOfSeconds(t1) + 1)) {
      if (at >= from && at <= t1) out.push(withLmt(zone, type, at, lmtLongitude));
    }
  }
  return out;
}

export type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number };

export type LocalReading = { utcSeconds: number } & ZoneType;

export type LocalResolution = LocalReading & {
  /**
   * "ambiguous": the clocks showed this time twice (turned back) — `readings`
   * holds both, earliest first, and `fold` picked one. "nonexistent": the
   * clocks skipped it (turned forward) — read with the offset in force just
   * before the change, i.e. as if the clock had not been changed yet.
   */
  kind: "normal" | "ambiguous" | "nonexistent";
  readings: LocalReading[];
};

/** Seconds of a wall-clock reading counted as if it were UTC. */
export function wallSeconds(w: Wall): number {
  return daysFromCivil(w.year, w.month, w.day) * 86400 + w.hour * 3600 + w.minute * 60 + w.second;
}

/**
 * The UTC instant(s) a wall-clock time in `zone` stands for.
 * `fold` chooses between the two readings of an ambiguous time: 0 the
 * earlier (usually still summer time), 1 the later.
 */
export function resolveWallTime(
  zoneId: string,
  wall: Wall,
  opts: { lmtLongitude?: number; fold?: 0 | 1 } = {},
): LocalResolution {
  const zone = loadZone(zoneId);
  if (!zone) throw new Error(`E:tz.unknown|${zoneId}`);
  const local = wallSeconds(wall);
  const window = 36 * 3600;
  const candidates = typesAround(zone, local - window, local + window, opts.lmtLongitude);
  const seen = new Set<number>();
  const readings: LocalReading[] = [];
  for (const type of candidates) {
    const u = local - type.offset;
    if (seen.has(u)) continue;
    seen.add(u);
    const actual = typeAtZone(zone, u, opts.lmtLongitude);
    if (actual.offset === type.offset) readings.push({ utcSeconds: u, ...actual });
  }
  readings.sort((a, b) => a.utcSeconds - b.utcSeconds);
  if (readings.length === 1) return { ...readings[0], kind: "normal", readings };
  if (readings.length > 1) {
    const pick = readings[opts.fold === 1 ? readings.length - 1 : 0];
    return { ...pick, kind: "ambiguous", readings };
  }
  // A gap: the clocks jumped from offset o1 to a larger o2 at some instant T,
  // skipping the wall times [T + o1, T + o2). Read it with o1, the offset in
  // force before the change (found at the earliest instant the wall time
  // could mean, which is before T).
  const maxOffset = Math.max(...candidates.map((c) => c.offset));
  const before = typeAtZone(zone, local - maxOffset, opts.lmtLongitude);
  // Reported with the offset it was read with (the one before the change).
  return { utcSeconds: local - before.offset, ...before, kind: "nonexistent", readings: [] };
}

/** "+02:00", "−04:56:02" — a UTC offset for display (seconds east of UTC). */
export function formatUtcOffset(offsetSeconds: number): string {
  const sign = offsetSeconds < 0 ? "−" : "+";
  const abs = Math.abs(offsetSeconds);
  const whole = Math.round(abs);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const base = `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return s ? `${base}:${String(s).padStart(2, "0")}` : base;
}

/** Every zone id the bundled database knows (canonical zones only). */
export function knownZones(): string[] {
  return Object.keys(DB.zones);
}
