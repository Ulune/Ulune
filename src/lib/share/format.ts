/*
 * What a share link holds (share plan, feature 1): one or two births and the
 * page the link opens, packed into a few dozen bytes before they are sealed
 * (lib/share/link.ts).
 *
 * A birth goes as it is cast: the date, the time (or none), the coordinates
 * to a millionth of a degree, the house system, how the local time is read
 * (the place's zone, a chosen zone or offset, which of two readings of an
 * ambiguous time) and the Chinese traditions' yin or yang count. The name
 * and the place's name go only while the sender leaves them in (S1, both on
 * by default); numerology's names are names, so they go with the name or not
 * at all. Nothing else of the sender's goes: no AI reading, no notes.
 *
 * Packed (version 1), big-endian:
 *   head    1 byte: the page's code (bits 0–5), two charts (bit 6), 0 (bit 7)
 *   chart   (once, or twice for "Share both")
 *     flags  2 bytes: time unknown (0), the fold (1–2: none, the first,
 *            the second), the count (3–4: none, yang, yin), then present:
 *            zone (5), time-zone choice (6), name (7), place (8), birth name
 *            (9), name used now (10), numerology's Y's (11); the house
 *            system's code (12–15)
 *     moment 5 bytes: year (12 bits), month (4), day (5), second of the day
 *            (17), 0 (2)
 *     place  2 × 4 bytes: latitude and longitude, in millionths of a degree
 *     then the texts present, in the flags' order, each its UTF-8 length in
 *     a byte and its bytes; numerology's Y's as "v" and "c".
 *
 * Read strictly: every length, range and reserved bit is checked, the dates
 * and times as the birth form reads them (lib/chart/parse-birth.ts), the
 * coordinates and house systems as the server accepts them
 * (lib/chart/server-input.ts), a time-zone choice against Ulune's own zone
 * table (zones.ts), and the names cleaned of control and direction marks.
 * A link only ever adds charts: it can hold at most two and names no chart
 * of the reader's, so it can never change or remove one.
 */
import { parseDate, parseTime } from "@/lib/chart/parse-birth";
import type { HouseSystemId } from "@/lib/chart/types";
import type { StudioPage } from "@/studio/url";
import { ByteReader, ByteWriter, ShareLinkError, utf8 } from "./bytes";
import { isKnownZone } from "./zones";

export type SharedBirth = {
  /** yyyy-mm-dd, as the chart keeps it (Julian before 15 October 1582, as the form reads it). */
  date: string;
  /** "HH:MM" or "HH:MM:SS"; "" when the time is unknown. */
  time: string;
  timeUnknown: boolean;
  latitude: number;
  longitude: number;
  houseSystem: HouseSystemId;
  /** The place's IANA zone (a tie-break for the server's lookup). */
  zone?: string;
  /** A chosen time-zone reading: "lmt", an offset "+05:30", or an IANA zone. */
  tz?: string;
  fold?: 0 | 1;
  chineseCount?: "yang" | "yin";
  name?: string;
  placeLabel?: string;
  birthName?: string;
  currentName?: string;
  /** Numerology's Y's switched by hand, "v" or "c" each, for the birth name the link carries. */
  numerologyY?: string;
};

export type SharePayload = {
  /** The page the link opens (an unknown code opens the birth chart). */
  page: StudioPage;
  /** One chart, or two for a Relationship page's "Share both" (the chart shown, then its partner). */
  charts: [SharedBirth] | [SharedBirth, SharedBirth];
};

/*
 * Codes never change and are never reused: a link made today must open the
 * same page years from now. A new page takes the next free code (every page
 * must have one: the type says so, so a new page does not build without it).
 */
export const PAGE_CODES: Record<StudioPage, number> = {
  natal: 0,
  transits: 1,
  timing: 2,
  synastry: 3,
  composite: 4,
  progressions: 5,
  numerology: 6,
  design: 7,
  "numerology-cycles": 8,
  zodiac: 9,
  "zodiac-years": 10,
  "zodiac-pair": 11,
  bazi: 12,
  "bazi-luck": 13,
  "bazi-pair": 14,
  fengshui: 15,
  "fengshui-home": 16,
  "fengshui-pair": 17,
  "fengshui-cycles": 18,
  "design-pair": 19,
  "numerology-pair": 20,
};

/** House systems by code, in the same spirit: append only. */
export const HOUSE_CODES: readonly HouseSystemId[] = [
  "placidus",
  "whole",
  "equal",
  "koch",
  "porphyry",
  "campanus",
  "regiomontanus",
  "alcabitius",
  "morinus",
  "topocentric",
];

/** The longest names and place a link keeps (characters); every text is also at most 255 bytes. */
export const NAME_MAX = 64;
export const PLACE_MAX = 100;
export const NUMEROLOGY_NAME_MAX = 100;
const ZONE_MAX = 40;
const ROLES_MAX = 32;

const FLAG = {
  unknown: 1 << 0,
  zone: 1 << 5,
  tz: 1 << 6,
  name: 1 << 7,
  place: 1 << 8,
  birthName: 1 << 9,
  currentName: 1 << 10,
  roles: 1 << 11,
} as const;

/*
 * What a name may not carry: control characters, invisible format marks and
 * the marks that turn the direction of text (a name could otherwise make the
 * words after it read backwards), and angle brackets. The joiners some
 * scripts and emoji need (U+200C, U+200D) stay.
 */
// eslint-disable-next-line no-control-regex
const UNWANTED = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b\u200e\u200f\u2028-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb<>]/g;

/** A name or place cleaned for a link: no control or direction marks, one space between words, at most `max` characters and 255 bytes. */
export function cleanText(raw: string, max: number): string {
  let s = raw.normalize("NFC").replace(UNWANTED, "").replace(/\s+/gu, " ").trim();
  let chars = Array.from(s);
  if (chars.length > max) chars = chars.slice(0, max);
  while (chars.length && utf8(chars.join("")).length > 255) chars.pop();
  s = chars.join("").trim();
  return s;
}

/** A chosen time-zone reading in the form the server writes it ("lmt", "+05:30", "-04:56:02", a zone), or null when none is chosen. */
export function canonicalTz(raw: string | undefined): string | null {
  const s = (raw ?? "").trim().replace(/\u2212/g, "-");
  if (!s || s === "auto") return null;
  if (s.toLowerCase() === "lmt") return "lmt";
  const m = /^(?:UTC|GMT)?\s*([+-])(\d{1,2})(?::?(\d{2}))?(?::(\d{2}))?$/i.exec(s);
  if (m) {
    const two = (n: string | undefined) => String(Number(n ?? 0)).padStart(2, "0");
    return `${m[1]}${two(m[2])}:${two(m[3])}${m[4] && Number(m[4]) ? `:${two(m[4])}` : ""}`;
  }
  return s;
}

/** A time-zone choice as a link may carry it: "lmt", an offset within ±15:00 as the server writes it, or a zone Ulune knows. */
function tzFits(s: string): boolean {
  if (s === "lmt") return true;
  const m = /^[+-](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) return Number(m[1]) <= 15 && Number(m[2]) < 60 && (m[3] === undefined || (Number(m[3]) > 0 && Number(m[3]) < 60));
  return isKnownZone(s);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The second of the day a time names (0 when it is unknown). */
function secondsOf(birth: SharedBirth): number {
  if (birth.timeUnknown) return 0;
  const t = parseTime(birth.time);
  if (t.unknown) throw new ShareLinkError("time");
  return t.hour * 3600 + t.minute * 60 + t.second;
}

function writeBirth(w: ByteWriter, birth: SharedBirth): void {
  const { year, month, day } = parseDate(birth.date);
  const second = secondsOf(birth);
  const lat = Math.round(birth.latitude * 1e6);
  const lon = Math.round(birth.longitude * 1e6);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90e6 || Math.abs(lon) > 180e6) throw new ShareLinkError("coordinates");
  const house = HOUSE_CODES.indexOf(birth.houseSystem ?? "placidus");
  if (house < 0) throw new ShareLinkError("houses");

  const zone = birth.zone && birth.zone.length <= ZONE_MAX ? birth.zone : "";
  const tz = canonicalTz(birth.tz) ?? "";
  if (tz.length > ZONE_MAX) throw new ShareLinkError("tz");
  // Which names go is the sheet's choice (lib/share/compose.ts): here, what is given.
  const name = cleanText(birth.name ?? "", NAME_MAX);
  const place = cleanText(birth.placeLabel ?? "", PLACE_MAX);
  const birthName = cleanText(birth.birthName ?? "", NUMEROLOGY_NAME_MAX);
  const currentName = cleanText(birth.currentName ?? "", NUMEROLOGY_NAME_MAX);
  // The Y's belong to a birth name: none goes without one.
  const roles = (birthName || name) && birth.numerologyY && /^[vc]{1,32}$/.test(birth.numerologyY) ? birth.numerologyY : "";

  let flags = house << 12;
  if (birth.timeUnknown) flags |= FLAG.unknown;
  if (birth.fold === 0 || birth.fold === 1) flags |= (birth.fold + 1) << 1;
  if (birth.chineseCount === "yang") flags |= 1 << 3;
  else if (birth.chineseCount === "yin") flags |= 2 << 3;
  if (zone) flags |= FLAG.zone;
  if (tz) flags |= FLAG.tz;
  if (name) flags |= FLAG.name;
  if (place) flags |= FLAG.place;
  if (birthName) flags |= FLAG.birthName;
  if (currentName) flags |= FLAG.currentName;
  if (roles) flags |= FLAG.roles;
  w.u16(flags);

  // 12 + 4 + 5 + 17 bits, two spare: 40 bits in five bytes.
  const hi = (year << 9) | (month << 5) | day; // 21 bits
  w.u8(hi >>> 13);
  w.u8((hi >>> 5) & 0xff);
  w.u8(((hi & 0x1f) << 3) | (second >>> 14));
  w.u8((second >>> 6) & 0xff);
  w.u8((second & 0x3f) << 2);
  w.i32(lat);
  w.i32(lon);
  if (zone) w.text(zone);
  if (tz) w.text(tz);
  if (name) w.text(name);
  if (place) w.text(place);
  if (birthName) w.text(birthName);
  if (currentName) w.text(currentName);
  if (roles) w.text(roles);
}

/** The payload packed (the sheet's side). Throws ShareLinkError for a birth no link can carry. */
export function packShare(payload: SharePayload): Uint8Array<ArrayBuffer> {
  // A link adds one chart, or two for "Share both": never more.
  if (payload.charts.length !== 1 && payload.charts.length !== 2) throw new ShareLinkError("count");
  const w = new ByteWriter();
  const code = PAGE_CODES[payload.page];
  const two = payload.charts.length === 2;
  w.u8(code | (two ? 1 << 6 : 0));
  for (const birth of payload.charts) writeBirth(w, birth);
  return w.done();
}

/** A name read back from a link: cleaned again, and nothing when nothing is left. */
function readName(r: ByteReader, max: number): string | undefined {
  const text = cleanText(r.text(), max);
  return text || undefined;
}

function readBirth(r: ByteReader): SharedBirth {
  const flags = r.u16();
  const house = HOUSE_CODES[flags >>> 12];
  if (!house) throw new ShareLinkError("houses");
  const foldBits = (flags >>> 1) & 3;
  const countBits = (flags >>> 3) & 3;
  if (foldBits === 3 || countBits === 3) throw new ShareLinkError("flags");

  const b0 = r.u8();
  const b1 = r.u8();
  const b2 = r.u8();
  const b3 = r.u8();
  const b4 = r.u8();
  if (b4 & 3) throw new ShareLinkError("reserved");
  const hi = (b0 << 13) | (b1 << 5) | (b2 >>> 3);
  const year = hi >>> 9;
  const month = (hi >>> 5) & 15;
  const day = hi & 31;
  const second = ((b2 & 7) << 14) | (b3 << 6) | (b4 >>> 2);
  // The date as the birth form reads it: a year Ulune's ephemeris covers, a real day (Julian before 1582).
  const date = `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
  try {
    parseDate(date);
  } catch {
    throw new ShareLinkError("date");
  }
  if (second >= 86400) throw new ShareLinkError("time");
  const timeUnknown = Boolean(flags & FLAG.unknown);
  if (timeUnknown && second !== 0) throw new ShareLinkError("time");
  const h = Math.floor(second / 3600);
  const m = Math.floor((second % 3600) / 60);
  const s = second % 60;
  const time = timeUnknown ? "" : s ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;

  const lat = r.i32();
  const lon = r.i32();
  if (Math.abs(lat) > 90e6 || Math.abs(lon) > 180e6) throw new ShareLinkError("coordinates");

  const birth: SharedBirth = { date, time, timeUnknown, latitude: lat / 1e6, longitude: lon / 1e6, houseSystem: house };
  if (foldBits) birth.fold = (foldBits - 1) as 0 | 1;
  if (countBits) birth.chineseCount = countBits === 1 ? "yang" : "yin";
  if (flags & FLAG.zone) {
    const zone = r.text();
    // Only a tie-break for the server's lookup: one this version does not know is left out.
    if (zone.length <= ZONE_MAX && isKnownZone(zone)) birth.zone = zone;
  }
  if (flags & FLAG.tz) {
    const tz = r.text();
    // A reading of the time this version cannot make would give another chart: refused.
    if (tz.length > ZONE_MAX || !tzFits(tz)) throw new ShareLinkError("tz");
    birth.tz = tz;
  }
  const name = flags & FLAG.name ? readName(r, NAME_MAX) : undefined;
  const place = flags & FLAG.place ? readName(r, PLACE_MAX) : undefined;
  const birthName = flags & FLAG.birthName ? readName(r, NUMEROLOGY_NAME_MAX) : undefined;
  const currentName = flags & FLAG.currentName ? readName(r, NUMEROLOGY_NAME_MAX) : undefined;
  if (name) birth.name = name;
  if (place) birth.placeLabel = place;
  if (birthName) birth.birthName = birthName;
  if (currentName) birth.currentName = currentName;
  if (flags & FLAG.roles) {
    const roles = r.text();
    if (!/^[vc]+$/.test(roles) || roles.length > ROLES_MAX) throw new ShareLinkError("roles");
    // Only with a birth name to go with.
    if (birth.birthName || birth.name) birth.numerologyY = roles;
  }
  return birth;
}

/** The page a code opens; a code this version does not know opens the birth chart. */
function pageOf(code: number): StudioPage {
  for (const [page, c] of Object.entries(PAGE_CODES) as [StudioPage, number][]) if (c === code) return page;
  return "natal";
}

/** The payload read back (the /s page's side), every field checked; throws ShareLinkError. */
export function unpackShare(bytes: Uint8Array): SharePayload {
  const r = new ByteReader(bytes);
  const head = r.u8();
  if (head & 0x80) throw new ShareLinkError("reserved");
  const page = pageOf(head & 0x3f);
  const a = readBirth(r);
  const charts: SharePayload["charts"] = head & 0x40 ? [a, readBirth(r)] : [a];
  r.end();
  return { page, charts };
}
