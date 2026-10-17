/**
 * What the page and the engine's worker say to each other (on-device plan,
 * step 2). Each request has the shape of the server function that does the
 * same work (lib/chart/functions.ts, server-input.ts), plus the birthplace's
 * zone, which the server would look up itself: so the page's one "calculate"
 * door (step 4) can send the same request to either place, and gets the same
 * answer back.
 *
 * Page → worker: { id, job } to ask, { id, cancel: true } to stop asking.
 * Worker → page: { id, ok: true, result, ms } or { id, ok: false, error },
 * `error` an "E:…" code or the engine's own message.
 */
import type { ZoneLookup } from "./birth-time";
import type { TransitNatalBody } from "./calculate";
import type { HumanDesignChart } from "../chart/human-design";
import type { SkyWindow } from "../chart/sky-window";
import type { SkyYear } from "../chart/sky-year";
import type { HouseSystemId, NatalChart, ProgressedSky, TimingCast, TransitSky } from "../chart/types";

/** A natal cast: castChart's input, and the birthplace's zone with where it came from. */
export type NatalRequest = {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  locale?: "en" | "fr";
  houseSystem?: HouseSystemId;
  timeUnknown?: boolean;
  zone?: string;
  tz?: string;
  fold?: 0 | 1;
  /** The place search's zone ("place"), Ulune's server's for typed coordinates (lookupZone), or the chart's own. */
  place: ZoneLookup;
};

/** castChart's answer. */
export type NatalAnswer = { chart: NatalChart; timeUnknown: boolean };

/** The zone the local times of an answer are written in (the natal chart's, meta.timezone). */
type InZone = { timezone: string };

/** castTransits' input. */
export type TransitsRequest = InZone & {
  at: string;
  latitude: number;
  longitude: number;
  natalCusps: number[];
  natalBodies: TransitNatalBody[];
  houseSystem?: HouseSystemId;
};

/** castProgressions' input. */
export type ProgressionsRequest = InZone & {
  natalUtc: string;
  targetUtc: string;
  latitude: number;
  longitude: number;
  natalCusps: number[];
  natalBodies: TransitNatalBody[];
  houseSystem?: HouseSystemId;
};

/** castHumanDesign's input. */
export type HumanDesignRequest = { natalUtc: string; spanMinutes?: number };

/** A Timing table: every exact in [from, to) (ISO moments, at most 370 days). */
export type TimingRequest = InZone & {
  from: string;
  to: string;
  latitude: number;
  longitude: number;
  natalBodies: TransitNatalBody[];
  houseSystem?: HouseSystemId;
};

/** What the engine holds and what its start cost. */
export type EngineStatus = {
  /** Ephemeris files mounted (Swiss's names). */
  files: string[];
  /** Milliseconds from the first request to an engine ready to calculate (0 once started). */
  startMs: number;
  /** Bytes fetched from the network and read from the browser's copy, since the worker started. */
  network: number;
  kept: number;
};

export type EngineJob =
  | { kind: "warm" }
  | { kind: "natal"; data: NatalRequest }
  | { kind: "transits"; data: TransitsRequest }
  | { kind: "progressions"; data: ProgressionsRequest }
  | { kind: "humanDesign"; data: HumanDesignRequest }
  | { kind: "skyWindow"; t0: number }
  | { kind: "skyYear"; year: number }
  | { kind: "timing"; data: TimingRequest };

export type EngineAnswers = {
  warm: EngineStatus;
  natal: NatalAnswer;
  transits: TransitSky;
  progressions: ProgressedSky;
  humanDesign: HumanDesignChart;
  skyWindow: SkyWindow;
  skyYear: SkyYear;
  timing: TimingCast;
};

export type ToEngine = { id: number; job: EngineJob } | { id: number; cancel: true };

export type FromEngine =
  | { id: number; ok: true; result: unknown; ms: number }
  | { id: number; ok: false; error: string; cancelled?: boolean };
