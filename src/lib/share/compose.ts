/*
 * What the share sheet puts in a link (share plan, feature 1): the chart on
 * screen, and on a Relationship page its partner for "Share both" (S3), each
 * as it is cast, with the name and the place's name while the sender leaves
 * them in (S1). Numerology's names are names: they go with the name or not
 * at all. And the line the sheet shows of each: "Camille · 15 June 1990,
 * 12:00 · Paris".
 */
import { chartDisplayName, hydrateBirthInput, type SavedChart } from "@/lib/chart/library";
import { dateFormat } from "@/lib/intl-cache";
import { lensOf } from "@/studio/map";
import type { StudioPage } from "@/studio/url";
import type { SharedBirth } from "./format";

export type Keep = { name: boolean; place: boolean };

/** Whether the chart has a name of its own (an unnamed chart is called by its place and date, which the link carries anyway). */
export function hasOwnName(row: Pick<SavedChart, "input">): boolean {
  const name = row.input.name.trim();
  return Boolean(name) && name !== chartDisplayName({ ...row.input, name: "" }, "");
}

/** A kept chart as a link carries it. */
export function sharedBirthOf(row: Pick<SavedChart, "input" | "chart" | "timeUnknown">, keep: Keep): SharedBirth {
  const input = hydrateBirthInput(row);
  const meta = row.chart.meta;
  const timeUnknown = Boolean(row.timeUnknown || input.timeUnknown);
  const birth: SharedBirth = {
    date: input.date || meta.date,
    time: timeUnknown ? "" : input.time || meta.time,
    timeUnknown,
    latitude: Number.isFinite(input.latitude) ? input.latitude : meta.latitude,
    longitude: Number.isFinite(input.longitude) ? input.longitude : meta.longitude,
    houseSystem: input.houseSystem ?? "placidus",
  };
  if (input.zone) birth.zone = input.zone;
  if (input.tz) birth.tz = input.tz;
  if (input.fold === 0 || input.fold === 1) birth.fold = input.fold;
  if (input.chineseCount === "yang" || input.chineseCount === "yin") birth.chineseCount = input.chineseCount;
  if (keep.name) {
    if (hasOwnName(row)) birth.name = input.name.trim();
    const birthName = (input.birthName ?? "").trim();
    const currentName = (input.currentName ?? "").trim();
    if (birthName) birth.birthName = birthName;
    if (currentName) birth.currentName = currentName;
    // The Y's switched by hand go with the very name they were set for.
    const y = input.numerologyY;
    if (y && y.name === (birthName || input.name.trim()) && /^[vc]{1,32}$/.test(y.roles)) birth.numerologyY = y.roles;
  }
  if (keep.place && input.placeLabel.trim()) birth.placeLabel = input.placeLabel.trim();
  return birth;
}

/** Whether a page is a Relationship page, where "Share both" is offered (every pair page, the new ones included). */
export function isPairPage(page: StudioPage): boolean {
  return lensOf(page) === "relationship";
}

/** Composite keeps its own partner; every other Relationship page shares synastry's (store.ts, finishAddPartner). */
export function partnerSlot(page: StudioPage): "synastry" | "composite" {
  return page === "composite" ? "composite" : "synastry";
}

type PairState = {
  rows: readonly SavedChart[];
  activeId: string | null;
  pair: { partnerId: string | null; compositePartnerId: string | null };
};

/** The chart a Relationship page shows beside the one on screen, chosen as the page chooses it (usePairCharts, usePairPick); null when none. */
export function partnerRow(s: PairState, page: StudioPage): SavedChart | null {
  if (!isPairPage(page)) return null;
  const aId = s.activeId && s.rows.some((r) => r.id === s.activeId) ? s.activeId : (s.rows[0]?.id ?? null);
  const others = s.rows.filter((r) => r.id !== aId);
  const wanted = partnerSlot(page) === "composite" ? s.pair.compositePartnerId : s.pair.partnerId;
  // "" is a partner cleared by the reader: none.
  if (wanted === "") return null;
  return others.find((r) => r.id === wanted) ?? others[0] ?? null;
}

/** "15 June 1990" (or "15 juin 1990"), from yyyy-mm-dd, the date's own numbers whatever the calendar. */
export function birthDateText(date: string, locale: string): string {
  const m = /^(\d{1,4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const d = new Date(Date.UTC(2000, Number(m[2]) - 1, Number(m[3])));
  d.setUTCFullYear(Number(m[1]));
  return dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** The line the sheet shows of a birth in the link: name · date, time · place, only what goes. */
export function previewLine(birth: SharedBirth, locale: string, timeUnknownText: string): string {
  const moment = `${birthDateText(birth.date, locale)}, ${birth.timeUnknown ? timeUnknownText : birth.time}`;
  return [birth.name, moment, birth.placeLabel].filter(Boolean).join(" · ");
}
