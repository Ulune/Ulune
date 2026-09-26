import type { AppLocale } from "@/lib/i18n/messages";
import type { PlaceHit } from "./types";

const MIN_QUERY = 2;
const FETCH_COUNT = 40;
const SHOW_COUNT = 8;

export type RankablePlace = {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  admin1?: string;
  population?: number;
  feature_code?: string;
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

const MAJOR_NAMES = new Set<string>();

/** Capitals and large cities so 2–3 letter prefixes hit real places, not villages. */
const MAJOR_CITIES: RankablePlace[] = [
  { name: "Paris", admin1: "Île-de-France", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris", population: 2_138_551, feature_code: "PPLC" },
  { name: "Lyon", admin1: "Auvergne-Rhône-Alpes", country: "France", latitude: 45.764, longitude: 4.8357, timezone: "Europe/Paris", population: 520_774, feature_code: "PPLA" },
  { name: "Marseille", admin1: "Provence-Alpes-Côte d'Azur", country: "France", latitude: 43.2965, longitude: 5.3698, timezone: "Europe/Paris", population: 870_731, feature_code: "PPLA" },
  { name: "London", admin1: "England", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", population: 8_982_000, feature_code: "PPLC" },
  { name: "Los Angeles", admin1: "California", country: "United States", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles", population: 3_898_747, feature_code: "PPLA2" },
  { name: "New York", admin1: "New York", country: "United States", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", population: 8_336_817, feature_code: "PPLA2" },
  { name: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin", population: 3_769_495, feature_code: "PPLC" },
  { name: "Madrid", country: "Spain", latitude: 40.4168, longitude: -3.7038, timezone: "Europe/Madrid", population: 3_223_334, feature_code: "PPLC" },
  { name: "Rome", admin1: "Lazio", country: "Italy", latitude: 41.9028, longitude: 12.4964, timezone: "Europe/Rome", population: 2_872_800, feature_code: "PPLC" },
  { name: "Milan", admin1: "Lombardy", country: "Italy", latitude: 45.4642, longitude: 9.19, timezone: "Europe/Rome", population: 1_396_059, feature_code: "PPLA" },
  { name: "Amsterdam", country: "Netherlands", latitude: 52.3676, longitude: 4.9041, timezone: "Europe/Amsterdam", population: 872_680, feature_code: "PPLC" },
  { name: "Brussels", country: "Belgium", latitude: 50.8503, longitude: 4.3517, timezone: "Europe/Brussels", population: 185_103, feature_code: "PPLC" },
  { name: "Vienna", country: "Austria", latitude: 48.2082, longitude: 16.3738, timezone: "Europe/Vienna", population: 1_897_491, feature_code: "PPLC" },
  { name: "Zurich", country: "Switzerland", latitude: 47.3769, longitude: 8.5417, timezone: "Europe/Zurich", population: 421_878, feature_code: "PPLA" },
  { name: "Geneva", country: "Switzerland", latitude: 46.2044, longitude: 6.1432, timezone: "Europe/Zurich", population: 201_818, feature_code: "PPLA" },
  { name: "Lisbon", country: "Portugal", latitude: 38.7223, longitude: -9.1393, timezone: "Europe/Lisbon", population: 544_851, feature_code: "PPLC" },
  { name: "Athens", country: "Greece", latitude: 37.9838, longitude: 23.7275, timezone: "Europe/Athens", population: 664_046, feature_code: "PPLC" },
  { name: "Oslo", country: "Norway", latitude: 59.9139, longitude: 10.7522, timezone: "Europe/Oslo", population: 693_491, feature_code: "PPLC" },
  { name: "Stockholm", country: "Sweden", latitude: 59.3293, longitude: 18.0686, timezone: "Europe/Stockholm", population: 975_904, feature_code: "PPLC" },
  { name: "Copenhagen", country: "Denmark", latitude: 55.6761, longitude: 12.5683, timezone: "Europe/Copenhagen", population: 602_481, feature_code: "PPLC" },
  { name: "Helsinki", country: "Finland", latitude: 60.1699, longitude: 24.9384, timezone: "Europe/Helsinki", population: 658_864, feature_code: "PPLC" },
  { name: "Dublin", country: "Ireland", latitude: 53.3498, longitude: -6.2603, timezone: "Europe/Dublin", population: 554_554, feature_code: "PPLC" },
  { name: "Prague", country: "Czechia", latitude: 50.0755, longitude: 14.4378, timezone: "Europe/Prague", population: 1_308_632, feature_code: "PPLC" },
  { name: "Warsaw", country: "Poland", latitude: 52.2297, longitude: 21.0122, timezone: "Europe/Warsaw", population: 1_790_658, feature_code: "PPLC" },
  { name: "Budapest", country: "Hungary", latitude: 47.4979, longitude: 19.0402, timezone: "Europe/Budapest", population: 1_752_286, feature_code: "PPLC" },
  { name: "Moscow", country: "Russia", latitude: 55.7558, longitude: 37.6173, timezone: "Europe/Moscow", population: 12_506_468, feature_code: "PPLC" },
  { name: "Istanbul", country: "Türkiye", latitude: 41.0082, longitude: 28.9784, timezone: "Europe/Istanbul", population: 15_462_452, feature_code: "PPLA" },
  { name: "Cairo", country: "Egypt", latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo", population: 9_539_673, feature_code: "PPLC" },
  { name: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792, timezone: "Africa/Lagos", population: 14_862_000, feature_code: "PPLA" },
  { name: "Nairobi", country: "Kenya", latitude: -1.2921, longitude: 36.8219, timezone: "Africa/Nairobi", population: 4_397_073, feature_code: "PPLC" },
  { name: "Cape Town", country: "South Africa", latitude: -33.9249, longitude: 18.4241, timezone: "Africa/Johannesburg", population: 4_332_276, feature_code: "PPLA" },
  { name: "Johannesburg", country: "South Africa", latitude: -26.2041, longitude: 28.0473, timezone: "Africa/Johannesburg", population: 5_635_127, feature_code: "PPLA" },
  { name: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai", population: 3_331_420, feature_code: "PPLA" },
  { name: "Mumbai", admin1: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata", population: 12_478_447, feature_code: "PPLA" },
  { name: "Delhi", country: "India", latitude: 28.7041, longitude: 77.1025, timezone: "Asia/Kolkata", population: 11_034_555, feature_code: "PPLC" },
  { name: "Bangkok", country: "Thailand", latitude: 13.7563, longitude: 100.5018, timezone: "Asia/Bangkok", population: 8_305_218, feature_code: "PPLC" },
  { name: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore", population: 5_637_000, feature_code: "PPLC" },
  { name: "Hong Kong", country: "Hong Kong", latitude: 22.3193, longitude: 114.1694, timezone: "Asia/Hong_Kong", population: 7_482_500, feature_code: "PPLC" },
  { name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo", population: 13_960_236, feature_code: "PPLC" },
  { name: "Seoul", country: "South Korea", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul", population: 9_733_509, feature_code: "PPLC" },
  { name: "Shanghai", country: "China", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai", population: 24_870_895, feature_code: "PPLA" },
  { name: "Beijing", country: "China", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai", population: 21_542_000, feature_code: "PPLC" },
  { name: "Sydney", admin1: "New South Wales", country: "Australia", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney", population: 5_312_163, feature_code: "PPLA" },
  { name: "Melbourne", admin1: "Victoria", country: "Australia", latitude: -37.8136, longitude: 144.9631, timezone: "Australia/Melbourne", population: 5_078_193, feature_code: "PPLA" },
  { name: "Auckland", country: "New Zealand", latitude: -36.8509, longitude: 174.7645, timezone: "Pacific/Auckland", population: 1_657_000, feature_code: "PPLA2" },
  { name: "Toronto", admin1: "Ontario", country: "Canada", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto", population: 2_794_356, feature_code: "PPLA" },
  { name: "Montreal", admin1: "Quebec", country: "Canada", latitude: 45.5017, longitude: -73.5673, timezone: "America/Toronto", population: 1_762_949, feature_code: "PPLA2" },
  { name: "Vancouver", admin1: "British Columbia", country: "Canada", latitude: 49.2827, longitude: -123.1207, timezone: "America/Vancouver", population: 662_248, feature_code: "PPLA2" },
  { name: "Mexico City", country: "Mexico", latitude: 19.4326, longitude: -99.1332, timezone: "America/Mexico_City", population: 9_209_944, feature_code: "PPLC" },
  { name: "São Paulo", country: "Brazil", latitude: -23.5558, longitude: -46.6396, timezone: "America/Sao_Paulo", population: 12_396_372, feature_code: "PPLA" },
  { name: "Rio de Janeiro", country: "Brazil", latitude: -22.9068, longitude: -43.1729, timezone: "America/Sao_Paulo", population: 6_748_309, feature_code: "PPLA" },
  { name: "Buenos Aires", country: "Argentina", latitude: -34.6037, longitude: -58.3816, timezone: "America/Argentina/Buenos_Aires", population: 2_890_151, feature_code: "PPLC" },
  { name: "Chicago", admin1: "Illinois", country: "United States", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago", population: 2_746_388, feature_code: "PPLA2" },
  { name: "Houston", admin1: "Texas", country: "United States", latitude: 29.7604, longitude: -95.3698, timezone: "America/Chicago", population: 2_304_580, feature_code: "PPLA2" },
  { name: "Miami", admin1: "Florida", country: "United States", latitude: 25.7617, longitude: -80.1918, timezone: "America/New_York", population: 442_241, feature_code: "PPLA2" },
  { name: "San Francisco", admin1: "California", country: "United States", latitude: 37.7749, longitude: -122.4194, timezone: "America/Los_Angeles", population: 873_965, feature_code: "PPLA2" },
  { name: "Boston", admin1: "Massachusetts", country: "United States", latitude: 42.3601, longitude: -71.0589, timezone: "America/New_York", population: 675_647, feature_code: "PPLA2" },
  { name: "Seattle", admin1: "Washington", country: "United States", latitude: 47.6062, longitude: -122.3321, timezone: "America/Los_Angeles", population: 737_015, feature_code: "PPLA2" },
  { name: "Nice", admin1: "Provence-Alpes-Côte d'Azur", country: "France", latitude: 43.7102, longitude: 7.262, timezone: "Europe/Paris", population: 342_669, feature_code: "PPLA2" },
  { name: "Toulouse", admin1: "Occitanie", country: "France", latitude: 43.6047, longitude: 1.4442, timezone: "Europe/Paris", population: 493_465, feature_code: "PPLA" },
  { name: "Bordeaux", admin1: "Nouvelle-Aquitaine", country: "France", latitude: 44.8378, longitude: -0.5792, timezone: "Europe/Paris", population: 260_958, feature_code: "PPLA" },
  { name: "Barcelona", admin1: "Catalonia", country: "Spain", latitude: 41.3874, longitude: 2.1686, timezone: "Europe/Madrid", population: 1_620_343, feature_code: "PPLA" },
];

export class PlaceLookupError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PlaceLookupError";
    this.status = status;
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export function foldPlaceQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

for (const city of MAJOR_CITIES) MAJOR_NAMES.add(foldPlaceQuery(city.name));

function placeScore(hit: RankablePlace, q: string): number {
  const name = foldPlaceQuery(hit.name);
  const admin = foldPlaceQuery(hit.admin1 ?? "");
  let score = 0;
  if (name === q) score += 50_000;
  else if (name.startsWith(q)) score += 400_000;
  else if (name.includes(q)) score += 30_000;
  else if (admin === q || admin.startsWith(q)) score += 8_000;
  else if (admin.includes(q)) score += 2_000;

  const feature = hit.feature_code ?? "";
  if (feature.startsWith("PCL") || feature === "MT" || feature === "LK" || feature === "ISL") {
    score -= 250_000;
  } else {
    score += FEATURE_WEIGHT[feature] ?? 0;
  }

  if (MAJOR_NAMES.has(name)) score += 120_000;

  const pop = hit.population ?? 0;
  score += Math.min(pop, 3_000_000) / 80;
  return score;
}

function mergeUnique(rows: RankablePlace[]): RankablePlace[] {
  const seen = new Set<string>();
  const out: RankablePlace[] = [];
  for (const row of rows) {
    const named = `${foldPlaceQuery(row.name)}|${foldPlaceQuery(row.country ?? "")}`;
    const geo = `${row.latitude.toFixed(1)}|${row.longitude.toFixed(1)}`;
    if (seen.has(named) || seen.has(geo)) continue;
    seen.add(named);
    seen.add(geo);
    out.push(row);
  }
  return out;
}

export function mapOpenMeteoHits(results: RankablePlace[] | undefined): PlaceHit[] {
  return (results ?? []).map((r) => {
    const bits = [r.name, r.admin1, r.country].filter(Boolean);
    return {
      label: bits.join(", "),
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone ?? "",
      country: r.country ?? "",
    };
  });
}

/** Rank Open-Meteo hits (plus a short major-city list) so "Par" yields Paris, not Par, Iran. */
export function rankPlaceHits(results: RankablePlace[] | undefined, query: string): PlaceHit[] {
  const q = foldPlaceQuery(query);
  if (q.length < MIN_QUERY) return [];
  const fromGazetteer = MAJOR_CITIES.filter((city) => {
    const name = foldPlaceQuery(city.name);
    return name === q || name.startsWith(q);
  });
  const merged = mergeUnique([...fromGazetteer, ...(results ?? [])]);
  merged.sort((a, b) => placeScore(b, q) - placeScore(a, q));
  return mapOpenMeteoHits(merged.slice(0, SHOW_COUNT));
}

/**
 * The built-in major cities alone, for when the geocoder can't be reached:
 * "Paris" or "Paris, France" still finds Paris ("Paris, Texas" does not).
 */
export function gazetteerHits(query: string): PlaceHit[] {
  const [head = "", ...rest] = query.split(",").map((part) => foldPlaceQuery(part));
  if (head.length < MIN_QUERY) return [];
  const where = rest.filter(Boolean);
  const hits = MAJOR_CITIES.filter((city) => {
    if (foldPlaceQuery(city.name) !== head) return false;
    const country = foldPlaceQuery(city.country ?? "");
    const admin = foldPlaceQuery(city.admin1 ?? "");
    return where.every((w) => country.startsWith(w) || admin.startsWith(w));
  });
  return mapOpenMeteoHits(hits);
}

/**
 * Open-Meteo geocoding, asked from Ulune's server (lib/chart/functions.ts,
 * searchPlaces). When the geocoder can't be reached, the major cities still
 * answer (gazetteerHits); a search the reader cancelled stays cancelled.
 */
export async function geocodePlace(
  q: string,
  language: AppLocale = "en",
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const query = q.trim();
  if (query.length < MIN_QUERY) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(FETCH_COUNT));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  const fallback = (message: string, status?: number): PlaceHit[] => {
    const local = gazetteerHits(query);
    if (local.length) return local;
    throw new PlaceLookupError(message, status);
  };
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, signal });
  } catch (err) {
    if (isAbortError(err)) throw err;
    return fallback("Place lookup failed.");
  }
  if (!res.ok) return fallback(`Place lookup failed (${res.status}).`, res.status);
  const body = (await res.json()) as OpenMeteoBody;
  return rankPlaceHits(body.results, query);
}
