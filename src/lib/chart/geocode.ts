import type { AppLocale } from "@/lib/i18n/messages";
import type { PlaceHit } from "./types";
import { RecentCache } from "./recent-cache";
import { COUNTRY_BY_NAME } from "./country-aliases";
import { foldPlaceQuery, placeKey } from "./fold";
import { MAJOR_CITIES } from "./gazetteer";
import { isAbortError } from "./abort";

export { foldPlaceQuery, placeKey };
export { isAbortError };

const MIN_QUERY = 2;
const FETCH_COUNT = 50;
const SHOW_COUNT = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RankablePlace = {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  population?: number;
  feature_code?: string;
  postcodes?: string[];
};

type OpenMeteoBody = { results?: RankablePlace[] };

const FEATURE_WEIGHT: Record<string, number> = {
  PPLC: 80_000,
  PPLA: 45_000,
  PPLA2: 25_000,
  PPLA3: 12_000,
  PPLA4: 6_000,
  PPL: 4_000,
  PPLL: 1_000,
  PPLX: 2_000,
};

export class PlaceLookupError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PlaceLookupError";
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/* What was typed                                                      */
/* ------------------------------------------------------------------ */

/** A typed place: the name, what is said after it (country, region), postal codes. */
export type ParsedPlaceQuery = { head: string; qualifiers: string[]; postcodes: string[] };

/**
 * "Paris", "Paris, France", "Téhéran,", "Paris, Île-de-France, France" (a
 * label as the list wrote it), "Toulouse 31200", "Springfield (Illinois)":
 * the name first, then whatever narrows it down. Trailing commas and
 * doubled spaces mean nothing.
 */
export function parsePlaceQuery(raw: string): ParsedPlaceQuery {
  const parts = raw
    .replace(/[()[\]]/g, ",")
    .replace(/[;|/]/g, ",")
    .replace(/\s[-–—]\s/g, ",")
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let head = parts[0] ?? "";
  const postcodes: string[] = [];
  const qualifiers: string[] = [];
  for (const part of parts.slice(1)) {
    if (/^\d{4,6}$/.test(part)) postcodes.push(part);
    else qualifiers.push(part);
  }
  head = head
    .replace(/(?:^|\s)(\d{4,6})(?=\s|$)/g, (_all, code: string) => {
      postcodes.push(code);
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  // Only a number was typed: that is what is looked up.
  if (!head && postcodes.length) head = postcodes.shift() ?? "";
  return { head, qualifiers, postcodes };
}

/** Changes of at most `max` letters; more is `max + 1` (and stops early). */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let min = i;
    for (let j = 1; j <= b.length; j += 1) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < min) min = v;
    }
    if (min > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well a place's name fits the name typed: 6 is the same name, 1 a place the geocoder found some other way. */
function nameTier(nameK: string, headK: string, headDigits: boolean): number {
  // Two to four letters are most likely the start of a longer name ("Par" is on its way to Paris, not Par, Cornwall).
  if (nameK === headK) return headK.length <= 3 ? 4.5 : headK.length === 4 ? 5 : 6;
  if (nameK.startsWith(headK)) {
    // "Paris 15 Vaugirard" for "Paris": a district, after the city itself.
    if (!headDigits && /^ \d/.test(nameK.slice(headK.length))) return 2.5;
    return 4;
  }
  if ((` ${nameK}`).includes(` ${headK}`)) return 3;
  if (headK.length >= 4) {
    const max = headK.length >= 7 ? 2 : 1;
    // A slip of the finger: the whole name, or its beginning while it is still being typed.
    if (editDistance(nameK, headK, max) <= max) return 3.4;
    if (editDistance(nameK.slice(0, headK.length), headK, 1) <= 1) return 3.2;
  }
  if (nameK.includes(headK)) return 2;
  return 1;
}

function isPopulated(code: string | undefined): boolean {
  return !code || code.startsWith("PPL");
}

function codeOf(place: RankablePlace): string {
  return (place.country_code ?? COUNTRY_BY_NAME.get(placeKey(place.country ?? "")) ?? "").toUpperCase();
}

/** Is `qualifier` (folded) said by this place: its country, region, county, district or postcode? */
function says(place: RankablePlace, fields: string[], code: string, qualifier: string): boolean {
  const alias = COUNTRY_BY_NAME.get(qualifier);
  if (alias && alias === code) return true;
  if (qualifier.length === 2 && qualifier === code.toLowerCase()) return true;
  return fields.some((field) => field === qualifier || (qualifier.length >= 3 && (` ${field}`).includes(` ${qualifier}`)));
}

function near(a: RankablePlace, b: RankablePlace): boolean {
  return Math.abs(a.latitude - b.latitude) < 0.12 && Math.abs(a.longitude - b.longitude) < 0.12;
}

type Scored = {
  place: RankablePlace;
  nameK: string;
  /** Its name is the name typed (and it is a place, not a country or a region). */
  exact: boolean;
  tier: number;
  /** Qualifiers (and postcodes) it satisfies. */
  matched: number;
  score: number;
  index: number;
};

/** Every candidate scored for what was typed; best first, the same place once. */
type Ranked = { rows: Scored[]; wanted: number; apiCount: number };

function scorePlaces(results: RankablePlace[] | undefined, parsed: ParsedPlaceQuery): Ranked {
  const headK = placeKey(parsed.head);
  if (headK.length < MIN_QUERY) return { rows: [], wanted: 0, apiCount: 0 };
  const headDigits = /\d/.test(headK);
  const qualifiers = parsed.qualifiers.map(placeKey).filter(Boolean);
  const wanted = qualifiers.length + parsed.postcodes.length;
  const api = results ?? [];
  // The big cities, so two or three letters reach them; the geocoder's own entry for the same city wins.
  const gazetteer = MAJOR_CITIES.filter((city) => {
    const k = placeKey(city.name);
    if (k !== headK && !k.startsWith(headK)) return false;
    return !api.some(
      (r) => isPopulated(r.feature_code) && near(r, city) && (placeKey(r.name) === k || (r.population ?? 0) >= (city.population ?? 0) * 0.5),
    );
  });
  const rows: Scored[] = [...api, ...gazetteer].map((place, index) => {
    const nameK = placeKey(place.name);
    let tier = nameTier(nameK, headK, headDigits);
    // A country, a region, a mountain: a name, not a birthplace.
    const feature = place.feature_code;
    if (feature?.startsWith("PCL")) tier -= 3;
    else if (!isPopulated(feature)) tier -= 2;
    const fields = [place.admin1, place.admin2, place.admin3, place.admin4, place.country].map((f) => placeKey(f ?? "")).filter(Boolean);
    const code = codeOf(place);
    let matched = qualifiers.filter((q) => says(place, fields, code, q)).length;
    matched += parsed.postcodes.filter((c) => place.postcodes?.some((p) => p.startsWith(c))).length;
    // How much of a place it is: by how many live there (a city of a million outweighs a village's exact name while it is being typed), then by its rank.
    const importance =
      (3_000_000 * Math.min(1, Math.log10((place.population ?? 0) + 1) / 7)) +
      (FEATURE_WEIGHT[feature ?? ""] ?? 0) +
      (index >= api.length ? 5_000 : 0) -
      (tier >= 4 && tier < 6 ? (nameK.length - headK.length) * 400 : 0);
    const exact = nameK === headK && tier > 3;
    return { place, nameK, exact, tier, matched, score: tier * 1_000_000 + matched * 10_000_000 + importance, index };
  });
  rows.sort((a, b) => b.score - a.score || a.index - b.index);
  const out: Scored[] = [];
  for (const row of rows) {
    // The same name within a few kilometres is one place (a gazetteer entry and the geocoder's, two spellings).
    if (out.some((o) => o.nameK === row.nameK && near(o.place, row.place))) continue;
    out.push(row);
  }
  return { rows: out, wanted, apiCount: api.length };
}

/* ------------------------------------------------------------------ */
/* What is shown                                                       */
/* ------------------------------------------------------------------ */

const populationFormats = new Map<string, Intl.NumberFormat>();

/** "2.1M people" / "2,1 M hab.": one more way to tell two places of one name apart. */
function populationText(population: number | undefined, locale: AppLocale): string {
  if (!population || population < 1000) return "";
  let format = populationFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    populationFormats.set(locale, format);
  }
  return `${format.format(population)} ${locale === "fr" ? "hab." : "people"}`;
}

function labelOf(place: RankablePlace, withCounty: boolean): string {
  const name = placeKey(place.name);
  const admin1 = place.admin1 && placeKey(place.admin1) !== name ? place.admin1 : undefined;
  const county =
    withCounty && place.admin2 && placeKey(place.admin2) !== name && placeKey(place.admin2) !== placeKey(admin1 ?? "") ? place.admin2 : undefined;
  return [place.name, county, admin1, place.country].filter(Boolean).join(", ");
}

function detailOf(place: RankablePlace, locale: AppLocale): string | undefined {
  const name = placeKey(place.name);
  const admin1 = placeKey(place.admin1 ?? "");
  const county = place.admin2 && placeKey(place.admin2) !== name && placeKey(place.admin2) !== admin1 ? place.admin2 : "";
  const text = [county, populationText(place.population, locale)].filter(Boolean).join(" · ");
  return text || undefined;
}

export function mapOpenMeteoHits(results: RankablePlace[] | undefined, locale: AppLocale = "en"): PlaceHit[] {
  const rows = results ?? [];
  const labels = rows.map((r) => labelOf(r, false));
  const seen = new Map<string, number>();
  for (const label of labels) seen.set(label, (seen.get(label) ?? 0) + 1);
  return rows.map((r, i) => ({
    // Two places with one label: the county tells them apart.
    label: (seen.get(labels[i]) ?? 0) > 1 ? labelOf(r, true) : labels[i],
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone ?? "",
    country: r.country ?? "",
    detail: detailOf(r, locale),
  }));
}

/**
 * Rank the geocoder's answers (plus the big cities) for what was typed:
 * what the typed qualifiers say (a country, a region) first, then the same
 * name, then names that begin with it, then the rest; larger places first
 * within each. "Par" yields Paris, not Par, Iran; "Paris" yields Paris before
 * its districts; "Paris, Texas" yields Paris, Texas.
 *
 * The first hit is marked `sure` when it is the one place the typed words
 * name exactly (its name, and each country or region typed after it), so the
 * form may take it without asking.
 */
export function rankPlaceHits(results: RankablePlace[] | undefined, query: string, locale: AppLocale = "en"): PlaceHit[] {
  return hitsOf(scorePlaces(results, parsePlaceQuery(query)), locale);
}

function hitsOf({ rows, wanted, apiCount }: Ranked, locale: AppLocale): PlaceHit[] {
  const shown = rows.slice(0, SHOW_COUNT);
  const hits = mapOpenMeteoHits(shown.map((r) => r.place), locale);
  // (Only the geocoder's own answer can be sure: the built-in cities stand in when it is silent.)
  const exact = rows.filter((r) => r.exact && r.matched >= wanted);
  if (hits.length && exact.length === 1 && exact[0] === rows[0] && rows[0].index < apiCount) hits[0].sure = true;
  return hits;
}

/* ------------------------------------------------------------------ */
/* Without the geocoder                                                */
/* ------------------------------------------------------------------ */

/**
 * The built-in major cities alone, for when the geocoder can't be reached:
 * "Paris" or "Paris, France" still finds Paris ("Paris, Texas" does not).
 */
export function gazetteerHits(query: string): PlaceHit[] {
  const parsed = parsePlaceQuery(query);
  const head = placeKey(parsed.head);
  if (head.length < MIN_QUERY) return [];
  const where = parsed.qualifiers.map(placeKey).filter(Boolean);
  const hits = MAJOR_CITIES.filter((city) => {
    const name = placeKey(city.name);
    if (name !== head && !(head.length >= 3 && name.startsWith(head))) return false;
    const fields = [city.admin1, city.country].map((f) => placeKey(f ?? "")).filter(Boolean);
    const code = codeOf(city);
    return where.every((w) => says(city, fields, code, w));
  });
  return mapOpenMeteoHits(hits);
}

/* ------------------------------------------------------------------ */
/* Asking Open-Meteo                                                   */
/* ------------------------------------------------------------------ */

/**
 * Open-Meteo's answers, remembered by the server for a day: typing "Paris"
 * asks for "Par", "Pari" and "Paris", and so do the next readers, so most
 * searches never reach Open-Meteo (600 calls a minute and 10,000 a day on its
 * free tier). The key is only the words typed and the language, tied to no
 * one; failures and the major-city fallback are not kept. Two layers: the
 * finished list per query (PLACE_CACHE) and the geocoder's raw answer per
 * name asked (UPSTREAM_CACHE), which "Paris" and "Paris, France" share.
 */
export const PLACE_CACHE = /* @__PURE__ */ new RecentCache<PlaceHit[]>(500, DAY_MS);
export const UPSTREAM_CACHE = /* @__PURE__ */ new RecentCache<RankablePlace[]>(500, DAY_MS);

/** The cache's key: the language, and the query without case or extra spaces. */
export function placeCacheKey(query: string, language: AppLocale): string {
  return `${language}:${query.trim().replace(/\s+/g, " ").toLowerCase()}`;
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** What of an answer is kept: no postal-sorting codes (Paris has hundreds). */
function keep(raw: RankablePlace): RankablePlace {
  const place: RankablePlace = {
    name: raw.name,
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    country: raw.country,
    country_code: raw.country_code,
    admin1: raw.admin1,
    admin2: raw.admin2,
    admin3: raw.admin3,
    admin4: raw.admin4,
    population: raw.population,
    feature_code: raw.feature_code,
  };
  const codes = (raw.postcodes ?? []).filter((p) => !/cedex/i.test(p)).slice(0, 40);
  if (codes.length) place.postcodes = codes;
  return place;
}

/** Open-Meteo's geocoder; the tests point ULUNE_GEOCODER_URL at a stand-in (scripts/e2e/_fake-geocoder.mjs). */
const GEOCODER_URL =
  (typeof process !== "undefined" ? process.env?.ULUNE_GEOCODER_URL : undefined) || "https://geocoding-api.open-meteo.com/v1/search";

/** One search of the geocoder, tried twice when it is busy or unreachable. */
async function askGeocoder(name: string, language: AppLocale, signal?: AbortSignal): Promise<RankablePlace[]> {
  const key = `${language}:${name.trim().toLowerCase()}`;
  const known = UPSTREAM_CACHE.get(key);
  if (known) return known;
  const url = new URL(GEOCODER_URL);
  url.searchParams.set("name", name.trim());
  url.searchParams.set("count", String(FETCH_COUNT));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  let status: number | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt) await pause(250, signal);
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" }, signal });
    } catch (err) {
      if (isAbortError(err)) throw err;
      continue;
    }
    status = res.status;
    if (res.ok) {
      try {
        const body = (await res.json()) as OpenMeteoBody;
        const rows = (body.results ?? []).map(keep);
        UPSTREAM_CACHE.set(key, rows);
        return rows;
      } catch (err) {
        if (isAbortError(err)) throw err;
        continue;
      }
    }
    // Busy: once more. Anything else will not change.
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new PlaceLookupError(status ? `Place lookup failed (${status}).` : "Place lookup failed.", status);
}

type OtherAsk = { ask: string; parsed: ParsedPlaceQuery; /** Only another way of writing the same name. */ spelling: boolean };

/**
 * Other ways to ask when the name as typed finds nothing exact ("Saint
 * Etienne" is answered with a village, "St Etienne" with nothing: the
 * geocoder knows Saint-Étienne with its hyphen; "Boston USA" and "Paris 15"
 * carry more than a name).
 */
function otherAsks(parsed: ParsedPlaceQuery): OtherAsk[] {
  const head = parsed.head;
  const out: OtherAsk[] = [];
  const spelled = head.replace(/\bst\.?(?=\s|-|$)/gi, "Saint").replace(/\bste\.?(?=\s|-|$)/gi, "Sainte");
  // Saint-Étienne for St Etienne, Aix-en-Provence for Aix en Provence.
  const hyphenated = /\s/.test(spelled) ? spelled.replace(/\s+/g, "-") : spelled;
  if (hyphenated !== head) out.push({ ask: hyphenated, parsed, spelling: true });
  const words = head.split(" ");
  if (words.length > 1) {
    for (const n of [3, 2, 1]) {
      if (words.length <= n) continue;
      const tail = words.slice(-n).join(" ");
      const code = COUNTRY_BY_NAME.get(placeKey(tail));
      // "Boston USA": a country after the name; a bare two-letter code is too likely to be part of a name.
      if (code && (n > 1 || tail.length >= 3)) {
        const shorter = words.slice(0, -n).join(" ");
        out.push({ ask: shorter, parsed: { ...parsed, head: shorter, qualifiers: [...parsed.qualifiers, tail] }, spelling: false });
        break;
      }
    }
  }
  if (/\s\d{1,3}$/.test(head)) out.push({ ask: head.replace(/\s\d{1,3}$/, ""), parsed, spelling: false });
  if (words.length > 1) {
    const shorter = words.slice(0, -1).join(" ");
    const last = words[words.length - 1];
    out.push({ ask: shorter, parsed: { ...parsed, head: shorter, qualifiers: [...parsed.qualifiers, last] }, spelling: false });
  }
  const seen = new Set<string>([head.toLowerCase()]);
  return out.filter((o) => (seen.has(o.ask.toLowerCase()) ? false : (seen.add(o.ask.toLowerCase()), true))).slice(0, 2);
}

/**
 * Open-Meteo geocoding, asked from Ulune's server (lib/chart/functions.ts,
 * searchPlaces). The words typed are read as a name and what narrows it
 * ("Paris, France", a label as listed, "Toulouse 31200"); when the name as
 * typed finds nothing like it, other spellings are asked at the same time
 * ("St Etienne" → Saint-Étienne). When the geocoder can't be reached, the
 * major cities still answer (gazetteerHits); a search the reader cancelled
 * stays cancelled.
 */
export async function geocodePlace(
  q: string,
  language: AppLocale = "en",
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const query = q.trim();
  const parsed = parsePlaceQuery(query);
  if (placeKey(parsed.head).length < MIN_QUERY) return [];
  const key = placeCacheKey(query, language);
  const known = PLACE_CACHE.get(key);
  if (known) return known;
  const state: { failure: PlaceLookupError | null } = { failure: null };
  const ask = async (name: string): Promise<RankablePlace[]> => {
    try {
      return await askGeocoder(name, language, signal);
    } catch (err) {
      if (isAbortError(err)) throw err;
      state.failure = err instanceof PlaceLookupError ? err : new PlaceLookupError("Place lookup failed.");
      return [];
    }
  };
  const first = await ask(parsed.head);
  let best = scorePlaces(first, parsed);
  const topTier = (ranked: Ranked = best) => ranked.rows.reduce((t, r) => Math.max(t, r.tier), 0);
  // Nothing of that very name: other spellings, and (when nothing even begins like it) other readings of the words.
  const pool = [...first];
  const tryAsks = async (asks: OtherAsk[]) => {
    const more = await Promise.all(asks.map((o) => ask(o.ask)));
    asks.forEach((o, i) => {
      pool.push(...more[i]);
      const tried = scorePlaces(pool, o.parsed);
      if (topTier(tried) > topTier() || (best.rows.length === 0 && tried.rows.length > 0)) best = tried;
    });
  };
  const alternatives = otherAsks(parsed);
  if (!state.failure && !best.rows.some((r) => r.exact)) {
    await tryAsks(alternatives.filter((o) => o.spelling));
    if (!state.failure && topTier() < 4) await tryAsks(alternatives.filter((o) => !o.spelling));
  }
  // The geocoder said nothing at all: the major cities answer, but only for now (never kept, never "sure").
  if (state.failure && first.length === 0) {
    const local = gazetteerHits(query);
    if (local.length) return local;
    throw state.failure;
  }
  const hits = hitsOf(best, language);
  if (!state.failure) PLACE_CACHE.set(key, hits);
  return hits;
}
