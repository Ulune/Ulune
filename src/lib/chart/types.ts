export const SIGN_IDS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type SignId = (typeof SIGN_IDS)[number];

export const PLANET_IDS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "northnode",
  "southnode",
  "lilith",
  "vertex",
  "antivertex",
  "fortune",
  "spirit",
  "ceres",
  "pallas",
  "juno",
  "vesta",
  "eris",
  "sedna",
] as const;

export type PlanetId = (typeof PLANET_IDS)[number];

export const ANGLE_IDS = ["ascendant", "midheaven", "descendant", "ic"] as const;
export type AngleId = (typeof ANGLE_IDS)[number];

export const ASPECT_IDS = [
  "conjunction",
  "opposition",
  "trine",
  "square",
  "sextile",
  "quincunx",
  "semisextile",
  "semisquare",
  "quintile",
] as const;

export type AspectId = (typeof ASPECT_IDS)[number];

export type BodyId = PlanetId | AngleId;

export type ElementId = "fire" | "earth" | "air" | "water";
export type ModalityId = "cardinal" | "fixed" | "mutable";

export const HOUSE_SYSTEM_IDS = [
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
] as const;
export type HouseSystemId = (typeof HOUSE_SYSTEM_IDS)[number];

export const STAR_IDS = ["algol", "aldebaran", "regulus", "spica", "antares", "fomalhaut"] as const;
export type StarId = (typeof STAR_IDS)[number];

export const MIDPOINT_IDS = [
  "sun-moon",
  "sun-ascendant",
  "moon-ascendant",
  "venus-mars",
  "mars-saturn",
] as const;
export type MidpointId = (typeof MIDPOINT_IDS)[number];

export type DignityKind = "domicile" | "exalted" | "detriment" | "fall" | "peregrine";
export type HouseTempo = "angular" | "succedent" | "cadent";

export type BodyFlags = {
  angular: boolean;
  tempo: HouseTempo;
  dignity: DignityKind | null;
  inSect: boolean | null;
  combust: boolean;
  cazimi: boolean;
  anaretic: boolean;
  ariesPoint: boolean;
  oob: boolean;
  fast: boolean;
  /** Missing on charts cast before CALC_VERSION 3. */
  slow?: boolean;
  stationary: boolean;
  unaspected: boolean;
};

export type ConfigType =
  | "tsquare"
  | "grandTrine"
  | "grandCross"
  | "yod"
  | "kite"
  | "mysticRectangle";

export type AspectConfiguration = {
  id: string;
  type: ConfigType;
  members: BodyId[];
  apex: BodyId | null;
};

export type StarHit = {
  id: StarId;
  name: string;
  ecliptic: number;
  conjunct: { body: BodyId; orb: number } | null;
};

export type MidpointHit = {
  id: MidpointId;
  a: BodyId;
  b: BodyId;
  ecliptic: number;
  sign: SignId;
  formatted: string;
};

export type Placement = {
  id: BodyId;
  kind: "planet" | "point" | "asteroid" | "angle";
  name: string;
  sign: SignId;
  ecliptic: number;
  signDegree: number;
  formatted: string;
  house: number;
  retrograde: boolean;
  /** Tropical longitude speed in degrees/day (Swiss). Missing on pre-Swiss saves. */
  speed?: number;
  /**
   * Swift: one of the seven traditional planets moving forward faster than
   * its mean daily motion (motionFlags). Missing on pre-Swiss saves.
   */
  fast?: boolean;
  /** Slow: the same planets moving forward at or below their mean daily motion. */
  slow?: boolean;
  /** Ecliptic latitude, degrees. */
  latitude?: number;
  /** Equatorial declination, degrees. */
  declination?: number;
  stationary?: boolean;
  /**
   * The station this body is at (natal casts, when stationary): its moment
   * (UTC ISO, to the second) and whether it turns direct there (else it
   * turns retrograde).
   */
  station?: { utc: string; direct: boolean };
  /**
   * Depends on the birth time, which is unknown — this longitude is the noon
   * placeholder, not a known position. Angles, Vertex and the lots only.
   */
  uncertain?: boolean;
};

export type HouseCusp = {
  id: number;
  label: string;
  sign: SignId;
  ecliptic: number;
  formatted: string;
  /** Cast from a placeholder noon because the birth time is unknown. */
  uncertain?: boolean;
};

export type AspectLink = {
  id: string;
  type: AspectId;
  label: string;
  level: "major" | "minor";
  a: BodyId;
  b: BodyId;
  aName: string;
  bName: string;
  orb: number;
  applying: boolean | null;
  /** UTC ISO of the perfecting (transit-to-natal only). Null when Swiss cannot lock a pass. */
  exactUtc?: string | null;
};

export type RankedBody = {
  id: BodyId;
  score: number;
  dignity: DignityKind | null;
  inSect: boolean | null;
};

export type WeightedBalance = {
  elements: Record<ElementId, number>;
  modalities: Record<ModalityId, number>;
  polarity: { positive: number; negative: number };
  hemisphere: { east: number; west: number; north: number; south: number };
  quadrants: [number, number, number, number];
  angularity: { angular: number; succedent: number; cadent: number };
};

export type TightestAspect = {
  a: BodyId;
  b: BodyId;
  type: AspectId;
  orb: number;
  applying: boolean | null;
};

export type ChartPatterns = {
  chartRuler: PlanetId;
  chartRulerTraditional: PlanetId;
  chartRulerModern: PlanetId;
  intercepted: SignId[];
  duplicated: SignId[];
  stelliums: { place: string; members: BodyId[] }[];
  elementCounts: Record<ElementId, number>;
  modalityCounts: Record<ModalityId, number>;
  retrogrades: BodyId[];
  isDay: boolean;
  vocMoon: boolean;
  flags: Partial<Record<BodyId, BodyFlags>>;
  receptions: { a: BodyId; b: BodyId }[];
  configurations: AspectConfiguration[];
  hemisphere: { east: BodyId[]; west: BodyId[]; north: BodyId[]; south: BodyId[] };
  quadrants: [BodyId[], BodyId[], BodyId[], BodyId[]];
  weights: WeightedBalance;
  ranking: RankedBody[];
  tightest: TightestAspect | null;
  dominant: AspectConfiguration | null;
};

export type NatalChart = {
  meta: {
    name: string;
    date: string;
    time: string;
    /** A relationship chart cast for the moment and place halfway (davison.ts, review 3 Oct P6). */
    relationship?: "davison";
    placeLabel: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utc: string;
    /** The system the cusps were actually built with. */
    houseSystem: HouseSystemId;
    /** Set only when `houseSystem` is a fallback (polar Placidus/Koch). */
    houseSystemRequested?: HouseSystemId;
    zodiac: "tropical";
    ephemeris: "swiss";
    lilith: "true";
    /**
     * No birth time was given. Bodies are cast at local noon; every angle,
     * Vertex and lot is a placeholder and carries `uncertain`.
     */
    timeUnknown?: boolean;
    /** Bodies Swiss could not place (missing .se1), skipped rather than fatal. */
    warnings?: string[];
    /** How the local birth time became UTC (absent on charts cast before it was recorded). */
    birthTime?: BirthTimeInfo;
    /** Version of the calculation rules the chart was cast with (see CALC_VERSION). */
    calc?: number;
    /** True obliquity of the ecliptic at birth (degrees): the out-of-bounds limit. */
    obliquity?: number;
    /** Julian Day (UT) the chart was computed for, as Swiss Ephemeris received it. */
    jdUt?: number;
    /** ΔT = TT − UT at birth, in seconds (Swiss Ephemeris's model). */
    deltaT?: number;
    /** The right ascension of the MC at birth (degrees): the local sidereal time × 15. */
    armc?: number;
    /** The Sun's altitude above the horizon at birth (degrees; negative below). */
    sunAltitude?: number;
    /**
     * Without a birth time: each body's longitude at the start and the end of
     * the birth day (local noon ± 12 hours), from Swiss Ephemeris.
     */
    dayRange?: Partial<Record<PlanetId, [number, number]>>;
    /** Without a birth time: each body's declination at the start and the end of the birth day. */
    dayDecl?: Partial<Record<PlanetId, [number, number]>>;
    /**
     * The Moon's course from the birth moment, from Swiss: its next exact
     * Ptolemaic aspect to the Sun … Pluto before it leaves its sign (null:
     * void of course), and when it leaves it.
     */
    moonCourse?: {
      next: { utc: string; body: PlanetId; type: AspectId } | null;
      leaves: { utc: string; sign: SignId };
    };
  };
  angles: Record<AngleId, Placement>;
  planets: Placement[];
  houses: HouseCusp[];
  aspects: AspectLink[];
  patterns: ChartPatterns;
  stars: StarHit[];
  midpoints: MidpointHit[];
};

/**
 * The local birth time's reading: the zone, the offset from UTC in force and
 * why. Shown with the chart so a professional can check it against the
 * record, and change it (BirthInput.tz / fold) when they know better.
 */
export type BirthTimeInfo = {
  /** IANA zone of the birthplace. */
  zone: string;
  /** Where the zone came from: the coordinates, the chosen place's record, a coarse fallback, or the user. */
  zoneSource: "coordinates" | "place" | "approximate" | "chosen";
  /** Offset from UTC used, in seconds east (fractional for Local Mean Time). */
  offset: number;
  /** The offset for display, "+01:00", "−04:56:02". */
  offsetLabel: string;
  /** "CET", "CEST", "EST", "LMT", or "UTC+05:30" for a fixed offset. */
  abbr: string;
  /** Summer (daylight-saving) time was in force. */
  dst: boolean;
  /** "zone": the zone's history; "lmt": the birthplace's Local Mean Time; "offset": a fixed offset given by the user. */
  basis: "zone" | "lmt" | "offset";
  /** The user's override when not automatic: "lmt", "+05:30", or a zone id. */
  choice?: string;
  /** The clocks showed this time twice ("ambiguous") or skipped it ("nonexistent"). */
  local: "normal" | "ambiguous" | "nonexistent";
  /** Which reading of an ambiguous time was used: 0 the first, 1 the second. */
  fold?: 0 | 1;
  /** Both readings of an ambiguous time, first one first. */
  readings?: { offset: number; offsetLabel: string; abbr: string; dst: boolean }[];
  /** The calendar the date was read in: Julian before 15 October 1582, Gregorian from then on. */
  calendar?: "gregorian" | "julian";
  /** IANA tz database release used. */
  tzdb: string;
};

export type BirthInput = {
  name: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  placeLabel: string;
  houseSystem?: HouseSystemId;
  /** `time` is a noon placeholder, not a given birth time. */
  timeUnknown?: boolean;
  /** The chosen place's IANA zone from the geocoder (a tie-break for the coordinate lookup). */
  zone?: string;
  /** Time zone override: "auto" (default), "lmt", a fixed offset "+05:30", or an IANA zone. */
  tz?: string;
  /** For a local time the clocks showed twice: 0 the first occurrence, 1 the second (default: after the clocks went back). */
  fold?: 0 | 1;
  /**
   * Numerology's names, kept on the device with the chart and never sent: the
   * full name at birth (the core numbers come from it; left empty, from `name`
   * when that is a typed name) and the name used now, when it differs (its
   * minor numbers).
   */
  birthName?: string;
  currentName?: string;
  /**
   * Numerology, kept on the device with the chart and never sent: the Y's of
   * the birth name switched by hand ("v" a vowel, "c" a consonant, in order),
   * with the name they were set for (another name leaves them aside).
   */
  numerologyY?: { name: string; roles: string };
};

export type PlaceHit = {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country: string;
  /** What tells it from another place of the name (county, how many live there). */
  detail?: string;
  /** The one place the typed words name exactly: the form may take it without asking. */
  sure?: boolean;
};

/** A short labelled fact at the top of a reading; `ref` jumps to that reading. */
export type ReadingFact = { label: string; value: string; ref?: string };
/** A row that points at another reading (aspects, tenants, cusps). */
export type ReadingLink = { ref: string; label: string; detail?: string; text?: string };
export type ReadingSection = { id: string; title: string; paragraphs: string[] };

export type ElementReading = {
  id: string;
  kind: "planet" | "house" | "sign" | "aspect" | "angle" | "decan";
  title: string;
  kicker: string;
  /** Flat text of the whole reading (AI prompts, copy, older surfaces). */
  paragraphs: string[];
  /** Structured form, when a builder provides it. */
  lead?: string;
  facts?: ReadingFact[];
  sections?: ReadingSection[];
  links?: { title: string; rows: ReadingLink[] };
  /** Teaching text about this kind of element, shown on request. */
  about?: { title: string; paragraphs: string[] };
  /** Short text drawn in the reading's mark when it has no glyph (numbers, gates). */
  mark?: string;
  /** Composed (AI) text for this element, shown above the local reading. */
  ai?: string[];
  /** Short curated meaning (click note), shown as the first section. */
  note?: string;
};

export type LocalDossier = {
  byId: Record<string, ElementReading>;
  order: string[];
};

export type GrokSection = {
  title: string;
  body: string;
};

export type GrokReading = {
  locale?: "en" | "fr";
  portraitTitle: string;
  portrait: string;
  planets: Record<string, { headline: string; body: string; aspects: string }>;
  houses: Record<string, { headline: string; body: string }>;
  signs: Record<string, { body: string }>;
  angles: Record<string, { headline: string; body: string }>;
  aspects: Record<string, { body: string }>;
  sections: GrokSection[];
};

export type TransitSky = {
  meta: {
    utc: string;
    timezone: string;
    local: string;
    latitude: number;
    longitude: number;
    /** House system the transit Vertex and angle passes were cast with. */
    houseSystem?: HouseSystemId;
    warnings?: string[];
    /**
     * Drawn on the client from the scrub window while time moves
     * (sky-window.ts): positions within a fraction of an arcsecond of Swiss,
     * no exact times yet; the exact cast replaces it once time settles.
     */
    provisional?: boolean;
  };
  planets: Placement[];
  aspects: AspectLink[];
};

export type ProgressedSky = {
  meta: {
    natalUtc: string;
    targetUtc: string;
    progressedUtc: string;
    timezone: string;
    local: string;
    latitude: number;
    longitude: number;
    tropicalYearDays: number;
    method: "secondary";
    yearsOfLife: number;
    houseSystem: HouseSystemId;
    houseSystemRequested?: HouseSystemId;
    warnings?: string[];
    /** From the scrub window, without exact dates yet (see TransitSky). */
    provisional?: boolean;
  };
  planets: Placement[];
  angles: Record<AngleId, Placement>;
  aspects: AspectLink[];
};

export type TimingHit = {
  id: string;
  moving: BodyId;
  natal: BodyId;
  type: AspectId;
  exactUtc: string;
};

export type TimingCast = {
  meta: {
    from: string;
    to: string;
    timezone: string;
    latitude: number;
    longitude: number;
  };
  hits: TimingHit[];
};

export type HouseOverlay = {
  body: BodyId;
  house: number;
};

export type SynastryPair = {
  aspects: AspectLink[];
  majors: AspectLink[];
  overlays: {
    aInB: HouseOverlay[];
    bInA: HouseOverlay[];
  };
};

export type CastResult = {
  chart: NatalChart;
  dossier: LocalDossier;
};

