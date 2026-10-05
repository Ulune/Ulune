/**
 * A stand-in for Open-Meteo's geocoder, for the place-search tests: real
 * answers (5 Oct 2026, abridged) for the names that matter, and a prefix
 * search over them for the rest. Run it, then start the app with
 *   ULUNE_GEOCODER_URL=http://127.0.0.1:8099/v1/search
 * node scripts/e2e/_fake-geocoder.mjs [port]
 */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const P = (name, admin1, admin2, country, country_code, feature_code, population, latitude, longitude, timezone) => ({
  id: Math.round(latitude * 1000 + longitude), name, admin1, admin2, country, country_code, feature_code, population, latitude, longitude, timezone,
});
const FR = "Europe/Paris";
const ROWS = {
  paris: [
    P("Paris", "Île-de-France", "Département de Paris", "France", "FR", "PPLC", 2138551, 48.85341, 2.3488, FR),
    P("Les Paris", "Rhône-Alpes", "Savoie", "France", "FR", "PPL", undefined, 45.63972, 5.73742, FR),
    P("Paris 15 Vaugirard", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 229713, 48.8412, 2.3003, FR),
    P("Paris 13 Gobelins", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 181271, 48.8322, 2.3561, FR),
    P("Paris 17", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 159212, 48.8835, 2.3219, FR),
    P("Paris 20 Ménilmontant", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 185140, 48.8646, 2.3984, FR),
    P("Paris", "Texas", "Lamar", "United States", "US", "PPLA2", 24912, 33.66094, -95.55551, "America/Chicago"),
    P("Paris", "Tennessee", "Henry", "United States", "US", "PPLA2", 10156, 36.302, -88.32671, "America/Chicago"),
  ],
  teheran: [
    P("Téhéran", "Téhéran", undefined, "Iran", "IR", "PPLC", 7153309, 35.69439, 51.42151, "Asia/Tehran"),
    P("Teheran", "Illinois", "Mason", "États-Unis", "US", "PPL", undefined, 40.24, -89.97, "America/Chicago"),
    P("Teherán", "Provincia de Pinar del Río", undefined, "Cuba", "CU", "PPLL", undefined, 22.4, -83.7, "America/Havana"),
  ],
  "saint-etienne": [
    P("Saint-Étienne", "Rhône-Alpes", "Loire", "France", "FR", "PPLA2", 176280, 45.43389, 4.39, FR),
    P("Saint-Étienne-en-Dévoluy", "Région PACA", "Hautes-Alpes", "France", "FR", "PPLA4", 537, 44.69362, 5.94063, FR),
    P("Saint-Étienne-du-Rouvray", "Normandie", "Seine-Maritime", "France", "FR", "PPL", 28953, 49.37794, 1.10467, FR),
    P("Saint-Étienne-de-Montluc", "Pays de la Loire", "Loire-Atlantique", "France", "FR", "PPL", 6809, 47.27622, -1.78013, FR),
    P("Saint-Étienne-au-Mont", "Hauts-de-France", "Pas-de-Calais", "France", "FR", "PPL", 5078, 50.67794, 1.63084, FR),
    P("Saint-Étienne-lès-Remiremont", "Grand Est", "Vosges", "France", "FR", "PPL", 4156, 48.02287, 6.60868, FR),
  ],
  "saint etienne": [P("Saint-Étienne-de-Valoux", "Rhône-Alpes", "Ardèche", "France", "FR", "PPL", 211, 45.3, 4.8, FR)],
  "st etienne": [],
  springfield: [
    P("Springfield", "Missouri", "Greene", "United States", "US", "PPLA2", 170188, 37.21533, -93.29824, "America/Chicago"),
    P("Springfield", "Illinois", "Sangamon", "United States", "US", "PPLA", 114394, 39.80172, -89.64371, "America/Chicago"),
    P("Springfield", "Massachusetts", "Hampden", "United States", "US", "PPL", 154341, 42.10148, -72.58981, "America/New_York"),
    P("Springfield", "Ohio", "Clark", "United States", "US", "PPLA2", 59680, 39.92423, -83.80882, "America/New_York"),
    P("Palmyra", "Missouri", "Marion", "United States", "US", "PPLA2", 3616, 39.79421, -91.52321, "America/Chicago"),
    P("Jackson", "Minnesota", "Jackson", "United States", "US", "PPLA2", 3234, 43.62079, -94.9886, "America/Chicago"),
  ],
  londres: [
    P("Londres", "Angleterre", "Grand Londres", "Royaume-Uni", "GB", "PPLC", 8961989, 51.50853, -0.12574, "Europe/London"),
    P("Londres", "Catamarca", "Departamento de Belén", "Argentine", "AR", "PPL", 2627, -27.71257, -67.13551, "America/Argentina/Catamarca"),
  ],
  marciac: [P("Marciac", "Occitanie", "Gers", "France", "FR", "PPL", 1258, 43.5258, 0.1672, FR)],
};
// Cities for the prefix search (as the names themselves would be answered).
const CITIES = [
  P("Toulouse", "Occitanie", "Haute-Garonne", "France", "FR", "PPLA", 493465, 43.60426, 1.44367, FR),
  P("Lyon", "Rhône-Alpes", "Rhône", "France", "FR", "PPLA2", 522250, 45.74846, 4.84671, FR),
  P("Lyon", "Texas", "Burleson", "United States", "US", "PPL", 400, 30.4, -96.6, "America/Chicago"),
  P("Marseille", "Provence-Alpes-Côte d'Azur", "Bouches-du-Rhône", "France", "FR", "PPLA", 870731, 43.29695, 5.38107, FR),
  P("Oslo", "Oslo", undefined, "Norvège", "NO", "PPLC", 580000, 59.91273, 10.74609, "Europe/Oslo"),
  P("Bordeaux", "Nouvelle-Aquitaine", "Gironde", "France", "FR", "PPLA", 260958, 44.84044, -0.5805, FR),
  P("Nantes", "Pays de la Loire", "Loire-Atlantique", "France", "FR", "PPLA2", 309346, 47.21725, -1.55336, FR),
  P("Pau", "Nouvelle-Aquitaine", "Pyrénées-Atlantiques", "France", "FR", "PPLA2", 77000, 43.2951, -0.37077, FR),
  P("Auch", "Occitanie", "Gers", "France", "FR", "PPLA2", 22000, 43.64643, 0.58554, FR),
  P("Tarbes", "Occitanie", "Hautes-Pyrénées", "France", "FR", "PPLA2", 41000, 43.23282, 0.07808, FR),
  P("Marseillan", "Occitanie", "Hérault", "France", "FR", "PPL", 8000, 43.3566, 3.5399, FR),
  P("Toulon", "Provence-Alpes-Côte d'Azur", "Var", "France", "FR", "PPLA2", 171953, 43.12442, 5.928, FR),
  P("Marcillac", "Occitanie", "Aveyron", "France", "FR", "PPL", 1700, 44.4807, 2.4678, FR),
];

const fold = (v) => v.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

function answer(name) {
  const q = fold(name);
  if (q.length < 2) return [];
  if (q in ROWS) return ROWS[q];
  // "Paris, France": the geocoder reads the name before the comma.
  const all = [...Object.values(ROWS).flat(), ...CITIES];
  const seen = new Set();
  return all.filter((r) => {
    const key = `${r.name}|${r.latitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    const n = fold(r.name);
    return q.length === 2 ? n === q : n.startsWith(q);
  });
}

export function startFakeGeocoder(port = 8099) {
  const log = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const name = url.searchParams.get("name") ?? "";
    log.push(name);
    const results = answer(name);
    res.setHeader("content-type", "application/json");
    // The real one's pause.
    setTimeout(() => res.end(JSON.stringify(results.length ? { results, generationtime_ms: 1 } : { generationtime_ms: 0.4 })), Number(process.env.FAKE_GEOCODER_DELAY ?? 40));
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, log, close: () => server.close() })));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.argv[2] ?? 8099);
  await startFakeGeocoder(port);
  console.log(`fake geocoder on http://127.0.0.1:${port}/v1/search`);
}
