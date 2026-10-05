import { placeKey } from "./fold";

/**
 * The ways people write a country after a city ("Paris, France", "Londres,
 * UK", "Boston USA"): ISO code, English and French names, the usual short
 * forms. Used only to match what was typed to a place's country, whichever
 * language the geocoder answered in (geocode.ts). Written without accents:
 * every entry goes through `placeKey` before it is compared.
 */
const LINES: Record<string, string> = {
  FR: "france, fra, republique francaise",
  US: "usa, us, u s a, u s, united states, united states of america, etats unis, etats unis d amerique, etat unis, america",
  GB: "uk, u k, gb, gbr, great britain, united kingdom, royaume uni, grande bretagne, angleterre, england",
  DE: "germany, deutschland, allemagne, deu",
  ES: "spain, espana, espagne, esp",
  IT: "italy, italia, italie, ita",
  PT: "portugal, prt",
  CH: "switzerland, suisse, schweiz, svizzera, che",
  BE: "belgium, belgique, belgie, bel",
  NL: "netherlands, the netherlands, holland, pays bas, hollande, nederland, nld",
  LU: "luxembourg, lux",
  AT: "austria, autriche, osterreich, aut",
  IE: "ireland, irlande, eire, irl",
  NO: "norway, norvege, norge, nor",
  SE: "sweden, suede, sverige, swe",
  DK: "denmark, danemark, danmark, dnk",
  FI: "finland, finlande, suomi, fin",
  IS: "iceland, islande, island",
  PL: "poland, pologne, polska, pol",
  CZ: "czechia, czech republic, republique tcheque, tchequie, cze",
  SK: "slovakia, slovaquie",
  HU: "hungary, hongrie, magyarorszag",
  RO: "romania, roumanie",
  BG: "bulgaria, bulgarie",
  GR: "greece, grece, hellas, grc",
  TR: "turkey, turkiye, turquie, tur",
  RU: "russia, russie, russian federation, rus",
  UA: "ukraine",
  BY: "belarus, bielorussie",
  RS: "serbia, serbie",
  HR: "croatia, croatie, hrvatska",
  SI: "slovenia, slovenie",
  EG: "egypt, egypte, egy",
  MA: "morocco, maroc, mar",
  DZ: "algeria, algerie, dza",
  TN: "tunisia, tunisie, tun",
  SN: "senegal, sen",
  CI: "ivory coast, cote d ivoire, cote divoire",
  CM: "cameroon, cameroun",
  NG: "nigeria, nga",
  GH: "ghana",
  KE: "kenya",
  ET: "ethiopia, ethiopie",
  ZA: "south africa, afrique du sud, rsa",
  MG: "madagascar",
  RE: "reunion, la reunion",
  IR: "iran, persia, perse, irn",
  IQ: "iraq, irak",
  SY: "syria, syrie",
  LB: "lebanon, liban",
  IL: "israel",
  JO: "jordan, jordanie",
  SA: "saudi arabia, arabie saoudite",
  AE: "uae, u a e, united arab emirates, emirats arabes unis, emirats",
  AF: "afghanistan",
  PK: "pakistan",
  IN: "india, inde, ind",
  CN: "china, chine, chn",
  JP: "japan, japon, jpn",
  KR: "south korea, korea, coree du sud, coree, kor",
  TH: "thailand, thailande",
  VN: "vietnam, viet nam",
  ID: "indonesia, indonesie",
  PH: "philippines",
  SG: "singapore, singapour",
  AU: "australia, australie, aus",
  NZ: "new zealand, nouvelle zelande",
  CA: "canada, can",
  MX: "mexico, mexique, mex",
  BR: "brazil, bresil, brasil, bra",
  AR: "argentina, argentine, arg",
  CL: "chile, chili",
  CO: "colombia, colombie",
  PE: "peru, perou",
  CU: "cuba",
  HT: "haiti",
  VE: "venezuela",
};

/** What a country is called when typed (folded the way `placeKey` folds), to its ISO code. */
export const COUNTRY_BY_NAME: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [code, names] of Object.entries(LINES)) {
    map.set(code.toLowerCase(), code);
    for (const name of names.split(",")) map.set(placeKey(name), code);
  }
  return map;
})();
