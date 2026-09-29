import type {
  BirthInput,
  GrokReading,
  LocalDossier,
  NatalChart,
} from "./types";
import { forgetFirstView, keepFirstViewFor } from "@/lib/first-view";
import { fullChart, slimChart, type StoredChart } from "./chart-store";
import { formatEuropeanDate } from "./parse-birth";
import {
  LEGACY_ACCOUNT_PREFIX,
  LEGACY_ACTIVE,
  LEGACY_COMPOSITE,
  LEGACY_LIBRARY,
  LEGACY_SYNASTRY,
  legacyKeysHere,
} from "@/lib/space/legacy";

export type SavedChart = {
  id: string;
  input: BirthInput;
  chart: NatalChart;
  dossier: LocalDossier;
  grok: GrokReading | null;
  timeUnknown: boolean;
  savedAt: number;
};

/** Fresh instance per row so no two charts share (and can cross-pollute) one dossier object. */
export function emptyDossier(): LocalDossier {
  return { byId: {}, order: [] };
}

/*
 * The studio's library lives in this tab's memory. Nothing personal is
 * written to the browser's storage: while "just looking" the charts go when
 * the tab closes, and in a private space they are kept encrypted
 * (studio/space-sync.ts writes them there, lib/space).
 */

/** Survives SPA remounts (settings → home) within the tab. */
let sessionLibrary: { rows: SavedChart[]; activeId: string | null } | null = null;

function canStore() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function parseRows(raw: string | null): SavedChart[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Omit<SavedChart, "chart"> & { chart: StoredChart }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && row.id && row.input && row.chart)
      .map((row) => ({
        ...row,
        chart: fullChart(row.chart),
        dossier: emptyDossier(),
        savedAt: typeof row.savedAt === "number" ? row.savedAt : 0,
      }));
  } catch {
    return [];
  }
}

/** A chart as it is kept: without its dossier, the chart without what is rebuilt on load. */
export type StoredRow = Omit<SavedChart, "chart" | "dossier"> & { chart: StoredChart };

export function toStoredRow(row: SavedChart): StoredRow {
  return {
    id: row.id,
    input: row.input,
    chart: slimChart(row.chart),
    grok: row.grok,
    timeUnknown: row.timeUnknown,
    savedAt: row.savedAt,
  };
}

export function fromStoredRow(row: StoredRow): SavedChart | null {
  if (!row || !row.id || !row.input || !row.chart) return null;
  return { ...row, chart: fullChart(row.chart), dossier: emptyDossier(), grok: row.grok ?? null, timeUnknown: Boolean(row.timeUnknown) };
}

/** This tab's library: what the studio showed before a remount, or nothing yet. */
export function loadLocalLibrary(): { rows: SavedChart[]; activeId: string | null } {
  if (!sessionLibrary) return { rows: [], activeId: null };
  const { rows, activeId } = sessionLibrary;
  return {
    rows,
    activeId: activeId && rows.some((r) => r.id === activeId) ? activeId : (rows[0]?.id ?? null),
  };
}

/** Remember the library for this tab (memory only). */
export function saveLocalLibrary(rows: SavedChart[], activeId: string | null): boolean {
  sessionLibrary = { rows, activeId };
  // A first view (lib/first-view.ts) goes with its chart.
  keepFirstViewFor(rows.map((row) => row.id));
  return true;
}

/** The tab forgets its library (the private space locked, or everything erased). */
export function clearLocalLibrary() {
  sessionLibrary = null;
  forgetFirstView();
}

/** The charts from before the private space (lib/space/legacy.ts), merged: the library first, then an account's copies not already there. */
export function readLegacyLibrary(): {
  rows: SavedChart[];
  activeId: string | null;
  partnerId: string | null;
  compositePartnerId: string | null;
} {
  const empty = { rows: [], activeId: null, partnerId: null, compositePartnerId: null };
  if (!canStore()) return empty;
  try {
    const rows = parseRows(localStorage.getItem(LEGACY_LIBRARY));
    for (const k of legacyKeysHere()) {
      if (k.startsWith(LEGACY_ACCOUNT_PREFIX)) rows.push(...unseenRows(parseRows(localStorage.getItem(k)), rows));
    }
    const active = localStorage.getItem(LEGACY_ACTIVE);
    return {
      rows,
      activeId: active && rows.some((r) => r.id === active) ? active : (rows[0]?.id ?? null),
      partnerId: localStorage.getItem(LEGACY_SYNASTRY),
      compositePartnerId: localStorage.getItem(LEGACY_COMPOSITE),
    };
  } catch {
    return empty;
  }
}

/**
 * The rows of `candidates` that `held` lacks: a chart is the same by id, or by
 * birth (date, time, place, houses; birthKey). The first of two alike wins.
 */
export function unseenRows(candidates: readonly SavedChart[], held: readonly SavedChart[]): SavedChart[] {
  const seen = new Set(held.flatMap((row) => [row.id, birthKey(row.input)]));
  const out: SavedChart[] = [];
  for (const row of candidates) {
    const key = birthKey(row.input);
    if (seen.has(row.id) || seen.has(key)) continue;
    seen.add(row.id);
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function chartDisplayName(input: BirthInput, untitled = "Untitled"): string {
  const named = input.name.trim();
  if (named) return named;
  const place = input.placeLabel.split(",")[0]?.trim();
  // The date as the form writes it (15/06/1990), not as it is stored.
  if (place && input.date) return `${place} · ${formatEuropeanDate(input.date)}`;
  if (place) return place;
  if (input.date) return formatEuropeanDate(input.date);
  return untitled;
}

/** A cast chart's name as `chartDisplayName` gives it. */
export function chartNameOf(chart: NatalChart, untitled = "Untitled"): string {
  const m = chart.meta;
  return chartDisplayName({ name: m.name, date: m.date, time: m.time, latitude: m.latitude, longitude: m.longitude, placeLabel: m.placeLabel }, untitled);
}

export function isBlankBirth(input: BirthInput): boolean {
  return !input.name.trim() && !input.date.trim() && !input.time.trim() && !input.placeLabel.trim();
}

export function birthKey(input: BirthInput): string {
  const lat = Number.isFinite(input.latitude) ? input.latitude.toFixed(4) : "";
  const lng = Number.isFinite(input.longitude) ? input.longitude.toFixed(4) : "";
  const houses = input.houseSystem ?? "placidus";
  const unknown = input.timeUnknown === true || !input.time.trim() ? "u" : "k";
  const tz = input.tz && input.tz !== "auto" ? `|${input.tz}` : "";
  const fold = input.fold === 0 ? "|f0" : "";
  return `${input.date}|${input.time}|${lat}|${lng}|${houses}|${unknown}${tz}${fold}`;
}

/** Form / persist input: empty time when unknown; house system from meta if the row dropped it. */
export function hydrateBirthInput(row: {
  input: BirthInput;
  chart: NatalChart;
  timeUnknown: boolean;
}): BirthInput {
  return {
    ...birthTimeChoices(row.chart),
    ...row.input,
    time: row.timeUnknown ? "" : row.input.time,
    timeUnknown: row.timeUnknown,
    houseSystem:
      row.input.houseSystem ?? row.chart.meta.houseSystemRequested ?? row.chart.meta.houseSystem,
  };
}

/**
 * The time-zone choices a chart was cast with (BirthInput.tz / fold / zone),
 * read back from its meta — rows stored remotely keep only the chart — so a
 * recast reads the birth time exactly as before.
 */
export function birthTimeChoices(chart: NatalChart): Pick<BirthInput, "tz" | "fold" | "zone"> {
  const bt = chart.meta.birthTime;
  if (!bt) return {};
  return {
    ...(bt.choice ? { tz: bt.choice } : {}),
    ...(bt.local === "ambiguous" && bt.fold != null ? { fold: bt.fold } : {}),
    ...(bt.zoneSource === "place" ? { zone: bt.zone } : {}),
  };
}

export function blankBirth(): BirthInput {
  return {
    name: "",
    date: "",
    time: "",
    latitude: Number.NaN,
    longitude: Number.NaN,
    placeLabel: "",
    houseSystem: "placidus",
  };
}

export function upsertInMemory(
  rows: SavedChart[],
  entry: Omit<SavedChart, "id" | "savedAt"> & { id?: string | null },
): { rows: SavedChart[]; id: string } {
  const existing = entry.id ? rows.find((r) => r.id === entry.id) : undefined;

  const saved: SavedChart = {
    id: existing?.id ?? crypto.randomUUID(),
    input: entry.input,
    chart: entry.chart,
    dossier: entry.dossier,
    grok: entry.grok,
    timeUnknown: entry.timeUnknown,
    savedAt: Date.now(),
  };

  const next = existing
    ? rows.map((r) => (r.id === existing.id ? saved : r))
    : [saved, ...rows];

  return { rows: next, id: saved.id };
}

export const EMPTY_BIRTH: BirthInput = blankBirth();
