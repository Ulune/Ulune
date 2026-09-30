/**
 * Natal readings. Every element of the wheel gets a structured reading:
 * note (what the thing is), lead (what it means in this chart), sections,
 * linked rows and an "About" block. Wording comes from src/lib/content.
 */
import { SIGN_IDS, SIGN_META, decanOf, signFromEcliptic } from "./constants";
import { aspectHolds, dignityHolds } from "./day-checks";
import { signDignity } from "./dignities";
import { daySpan, extent, isRough, signHolds } from "./unknown-time";
import {
  aspectInPractice,
  aspectIs,
  aspectParagraphs,
  aspectSentence,
  bodyAs,
  bodyCycle,
  bodyExample,
  bodyInHouse,
  bodyIs,
  houseArea,
  pairTheme,
  planetInSignText,
  pointInSignText,
  signKeywords,
  signOnCusp,
} from "./plain";
import type { Locale } from "@/lib/i18n/locale";
import {
  angleName,
  aspectLinkPhrase,
  bodyInline,
  bodyLabel,
  dignityName,
  elementName,
  faceLabelLocale,
  houseInline,
  houseName,
  inSign,
  modalityName,
  planetName,
  signDe,
  bodyBare,
  bodyPrep,
  bodyThe,
  joinList,
  signIs,
  signName,
  signThe,
} from "@/lib/i18n/astro";
import { fill, readingCopy } from "@/lib/i18n/readings";
import { pickBi } from "@/lib/content/types";
import {
  BASICS_TEXT,
  DIGNITY_TEXT,
  ELEMENT_TEXT,
  HOUSE_TEXT,
  MODALITY_TEXT,
  RETROGRADE_TEXT,
  SIGN_TEXT,
} from "@/lib/content/astro-signs-houses";
import { ORB_ABOUT } from "@/lib/content/astro-time";
import type {
  AspectLink,
  BodyId,
  ElementReading,
  LocalDossier,
  NatalChart,
  Placement,
  PlanetId,
  SignId,
} from "./types";
import { formatArc, formatDegree } from "@/lib/utils";

type HouseNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Rows = NonNullable<ElementReading["links"]>["rows"];

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Dossier id for a body or angle. */
function refFor(id: string): string {
  return id === "ascendant" || id === "midheaven" || id === "descendant" || id === "ic" ? `angle:${id}` : `planet:${id}`;
}

function placementsInHouse(chart: NatalChart, house: number): Placement[] {
  return chart.planets.filter((p) => p.house === house);
}

function placementsInSign(chart: NatalChart, sign: SignId): Placement[] {
  return chart.planets.filter((p) => p.sign === sign);
}

function aspectsFor(chart: NatalChart, id: BodyId): AspectLink[] {
  return chart.aspects.filter((a) => a.a === id || a.b === id);
}

const CLASSIC_IDS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
function isClassicPair(a: string, b: string) {
  return CLASSIC_IDS.includes(a) && CLASSIC_IDS.includes(b);
}

function faceIndex(ecliptic: number) {
  return Math.floor((((ecliptic % 30) + 30) % 30) / 10);
}

function aspectRows(chart: NatalChart, id: BodyId, locale: Locale, limit: number): Rows {
  const asp = aspectsFor(chart, id);
  const major = asp.filter((a) => a.level === "major").sort((a, b) => a.orb - b.orb);
  const minor = asp.filter((a) => a.level === "minor").sort((a, b) => a.orb - b.orb);
  return [...major, ...minor].slice(0, limit).map((a) => ({
    ref: `aspect:${a.id}`,
    label: aspectLinkPhrase(a.a, a.type, a.b, locale),
    detail: `${formatArc(a.orb)}`,
    text: aspectSentence(chart, a, id, locale),
  }));
}

function flatten(r: Pick<ElementReading, "note" | "lead" | "sections" | "links">): string[] {
  const out: string[] = [];
  if (r.lead) out.push(r.lead);
  for (const s of r.sections ?? []) out.push(...s.paragraphs);
  for (const row of r.links?.rows ?? []) if (row.text) out.push(row.text);
  return out;
}

function dignityKey(d: string) {
  return (d === "exalted" ? "exaltation" : d) as keyof typeof DIGNITY_TEXT;
}

/** "Mars rules your rising sign …" */
function chartRulerLine(chart: NatalChart, p: Placement, locale: Locale): string {
  const asc = chart.angles.ascendant.sign;
  if (locale === "fr") {
    return `${cap(bodyInline(p.id, locale))} gouverne votre signe ascendant, ${signThe(asc)} : c’est le maître de votre thème. Son signe, sa maison et ses aspects en disent long sur votre façon d’aborder la vie dans son ensemble.`;
  }
  return `${bodyThe(p.id, locale, true)} rules your rising sign, ${signName(asc, locale)}, which makes it your chart ruler: its sign, house and aspects say a lot about how you approach life as a whole.`;
}

function decanLine(sign: SignId, ecliptic: number, locale: Locale): string {
  const d = decanOf(ecliptic);
  const face = faceLabelLocale(d.face, locale);
  const own = d.faceSign === sign;
  if (locale === "fr") {
    return own
      ? `Il tombe dans le ${face} décan ${signDe(sign)}, le décan propre au signe, gouverné par ${bodyInline(d.ruler, locale)} : le style ${signDe(sign)} y est le plus pur.`
      : `Il tombe dans le ${face} décan ${signDe(sign)}, le décan ${signDe(d.faceSign)}, sous-gouverné par ${bodyInline(d.ruler, locale)} : il ajoute au style du signe une touche ${signDe(d.faceSign)} (${signKeywords(d.faceSign, locale)}).`;
  }
  return own
    ? `It falls in the ${face} decan of ${signName(sign, locale)}, the sign’s own decan, ruled by ${bodyThe(d.ruler, locale)}: the ${signName(sign, locale)} style in its purest form.`
    : `It falls in the ${face} decan of ${signName(sign, locale)}, the ${signName(d.faceSign, locale)} decan, sub-ruled by ${bodyThe(d.ruler, locale)}: it adds a touch of ${signName(d.faceSign, locale)} (${signKeywords(d.faceSign, locale)}) to the sign’s style.`;
}

function aboutTitle(locale: Locale, id: string) {
  return locale === "fr" ? `À propos ${bodyPrep(id, "de")}` : `About ${bodyThe(id, locale)}`;
}

function planetReading(chart: NatalChart, p: Placement, locale: Locale): ElementReading {
  const c = readingCopy(locale);
  const decan = decanOf(p.ecliptic);
  const dignity = p.kind === "planet" ? signDignity(p.id as PlanetId, p.ecliptic, chart.patterns.isDay) : null;
  const name = bodyLabel(p.id, locale);
  const kicker = fill(c.kickerPlanet, {
    formatted: p.formatted,
    sign: signName(p.sign, locale),
    face: faceLabelLocale(decan.face, locale),
    ruler: bodyBare(decan.ruler, locale),
    house: houseName(p.house, locale),
    rx: p.retrograde ? c.rx : "",
  });
  const lead = planetInSignText(p.id, p.sign, locale) ?? pointInSignText(p.id, p.sign, locale);
  const inChart: string[] = [];
  const inHouse = bodyInHouse(p.id, p.house, locale);
  if (inHouse) inChart.push(inHouse);
  if (chart.patterns.chartRuler === p.id) inChart.push(chartRulerLine(chart, p, locale));
  if (p.retrograde) {
    const rx = RETROGRADE_TEXT.byPlanet[p.id as keyof typeof RETROGRADE_TEXT.byPlanet];
    inChart.push(pickBi(rx ?? RETROGRADE_TEXT.general, locale));
  }
  inChart.push(decanLine(p.sign, p.ecliptic, locale));
  const rows = aspectRows(chart, p.id, locale, 10);
  const facts: ElementReading["facts"] = [
    { label: c.factSign, value: `${p.formatted} ${signName(p.sign, locale)}`, ref: `sign:${p.sign}` },
    { label: c.factHouse, value: String(p.house), ref: `house:${p.house}` },
    {
      label: c.factDecan,
      value: `${faceLabelLocale(decan.face, locale)} · ${planetName(decan.ruler, locale)}`,
      ref: `decan:${p.sign}-${faceIndex(p.ecliptic)}`,
    },
  ];
  if (dignity && dignity !== "peregrine") facts.push({ label: c.factDignity, value: dignityName(dignity, locale) });
  if (p.retrograde) facts.push({ label: c.factMotion, value: c.factRetro });
  const about = [bodyExample(p.id, locale), bodyCycle(p.id, locale)];
  if (dignity) about.push(pickBi(DIGNITY_TEXT[dignityKey(dignity)], locale));
  if (p.retrograde) about.push(pickBi(RETROGRADE_TEXT.general, locale));
  const structured = {
    note: bodyIs(p.id, locale),
    lead,
    sections: [{ id: "chart", title: c.secChart, paragraphs: inChart }],
    links: rows.length ? { title: c.secAspects, rows } : undefined,
  };
  return {
    id: `planet:${p.id}`,
    kind: "planet",
    title: name,
    kicker,
    paragraphs: [structured.note, ...flatten(structured)],
    ...structured,
    facts,
    about: { title: aboutTitle(locale, p.id), paragraphs: about.filter(Boolean) },
  };
}

function angleReading(chart: NatalChart, id: keyof NatalChart["angles"], locale: Locale): ElementReading {
  const c = readingCopy(locale);
  const a = chart.angles[id];
  const s = SIGN_TEXT[a.sign];
  const lead =
    id === "ascendant"
      ? pickBi(s.rising, locale)
      : id === "midheaven"
        ? pickBi(s.midheaven, locale)
        : signOnCusp(a.sign, id === "descendant" ? 7 : 4, locale);
  const inChart: string[] = [];
  const facts: ElementReading["facts"] = [
    { label: c.factSign, value: `${a.formatted} ${signName(a.sign, locale)}`, ref: `sign:${a.sign}` },
    { label: c.factHouse, value: String(a.house), ref: `house:${a.house}` },
  ];
  if (id === "ascendant") {
    const ruler = chart.planets.find((p) => p.id === chart.patterns.chartRuler);
    if (ruler) {
      inChart.push(
        locale === "fr"
          ? `Le maître de votre Ascendant, ${bodyInline(ruler.id, locale)}, est ${inSign(ruler.sign, locale)} en ${houseInline(ruler.house, locale)} (${houseArea(ruler.house, locale)}) : c’est dans ce domaine que votre façon d’être se met le plus en action.`
          : `Your Ascendant’s ruler, ${bodyThe(ruler.id, locale)}, is in ${signName(ruler.sign, locale)} in your ${houseInline(ruler.house, locale)} (${houseArea(ruler.house, locale)}): that is where your way of meeting the world is put to work most.`,
      );
      facts.push({ label: c.factRuler, value: bodyLabel(ruler.id, locale), ref: `planet:${ruler.id}` });
    }
  }
  const onAngle = chart.planets.filter((p) =>
    chart.aspects.some(
      (x) => x.type === "conjunction" && x.orb <= 5 && ((x.a === id && x.b === p.id) || (x.b === id && x.a === p.id)),
    ),
  );
  if (onAngle.length) {
    const list = joinList(onAngle.map((p) => bodyThe(p.id, locale)), locale);
    inChart.push(
      locale === "fr"
        ? `${cap(list)} ${onAngle.length > 1 ? "sont" : "est"} conjoint${onAngle.length > 1 ? "s" : ""} à cet angle : une planète sur un angle est très visible dans la vie et dans le caractère.`
        : `${cap(list)} ${onAngle.length > 1 ? "are" : "is"} conjunct this angle: a planet on an angle is very visible in character and in life.`,
    );
  }
  const rows = aspectRows(chart, id, locale, 8);
  const structured = {
    note: bodyIs(id, locale),
    lead,
    sections: inChart.length ? [{ id: "chart", title: c.secChart, paragraphs: inChart }] : [],
    links: rows.length ? { title: c.secAspects, rows } : undefined,
  };
  const name = angleName(id, locale);
  return {
    id: `angle:${id}`,
    kind: "angle",
    title: name,
    kicker: `${a.formatted} ${signName(a.sign, locale)} · ${houseName(a.house, locale)}`,
    paragraphs: [structured.note, ...flatten(structured)],
    ...structured,
    facts,
    about: {
      title: aboutTitle(locale, id),
      paragraphs: [bodyExample(id, locale), bodyCycle(id, locale), pickBi(BASICS_TEXT.angles, locale)].filter(Boolean),
    },
  };
}

function interceptedIn(chart: NatalChart, house: number): SignId[] {
  const cusp = chart.houses[house - 1];
  const next = chart.houses[house % 12];
  if (!cusp || !next) return [];
  const start = cusp.ecliptic;
  const end = next.ecliptic;
  const inside = (mid: number) => (start <= end ? mid >= start && mid < end : mid >= start || mid < end);
  return chart.patterns.intercepted.filter((s) => inside(SIGN_IDS.indexOf(s) * 30 + 15));
}

function houseReading(chart: NatalChart, house: number, locale: Locale): ElementReading {
  const c = readingCopy(locale);
  const cusp = chart.houses[house - 1];
  const signId = (cusp?.sign ?? "aries") as SignId;
  const text = HOUSE_TEXT[house as HouseNo];
  const tenants = placementsInHouse(chart, house);
  const hName = houseName(house, locale);
  const area = houseArea(house, locale);
  const lead =
    locale === "fr"
      ? `Votre ${houseInline(house, locale)} commence à ${cusp?.formatted ?? "—"} ${signName(signId, locale)}. ${signOnCusp(signId, house, locale)}`
      : `Your ${houseInline(house, locale)} begins at ${cusp?.formatted ?? "—"} ${signName(signId, locale)}. ${signOnCusp(signId, house, locale)}`;
  const inChart: string[] = [];
  const rows: Rows = [];
  if (tenants.length) {
    const names = joinList(tenants.map((t) => `${bodyThe(t.id, locale)} ${inSign(t.sign, locale)}`), locale);
    inChart.push(
      locale === "fr"
        ? `${cap(names)} ${tenants.length > 1 ? "occupent" : "occupe"} cette maison : ${tenants.length > 1 ? "ce sont les principaux acteurs" : "c’est le principal acteur"} de ce domaine (${area}).`
        : `${cap(names)} ${tenants.length > 1 ? "occupy" : "occupies"} this house: ${tenants.length > 1 ? "they are the main actors" : "it is the main actor"} in ${area}.`,
    );
    for (const t of tenants) {
      rows.push({
        ref: `planet:${t.id}`,
        label: `${bodyLabel(t.id, locale)} · ${signName(t.sign, locale)}`,
        detail: t.formatted,
        text: bodyInHouse(t.id, house, locale),
      });
    }
  } else {
    inChart.push(pickBi(text.empty, locale));
  }
  const ruler = SIGN_META[signId].ruler as PlanetId;
  const rulerP = chart.planets.find((p) => p.id === ruler);
  if (rulerP) {
    inChart.push(
      locale === "fr"
        ? `${signIs(signId, { m: "gouverné", f: "gouvernée", p: "gouvernés" })} par ${bodyInline(ruler, locale)}, qui se trouve en ${houseInline(rulerP.house, locale)} (${houseArea(rulerP.house, locale)}) : ce domaine de votre vie est donc lié à celui-ci.`
        : `${signName(signId, locale)} is ruled by ${bodyThe(ruler, locale)}, which sits in your ${houseInline(rulerP.house, locale)} (${houseArea(rulerP.house, locale)}): this area of your life is tied to that one.`,
    );
  }
  const swallowed = interceptedIn(chart, house);
  for (const s of swallowed) {
    inChart.push(
      locale === "fr"
        ? `${signIs(s, { m: "intercepté", f: "interceptée", p: "interceptés" })} dans cette maison : le signe y est entièrement contenu sans toucher de cuspide. Son style (${signKeywords(s, locale)}) joue ici un rôle réel mais moins visible.`
        : `${signName(s, locale)} is intercepted in this house: it lies wholly inside it without touching a cusp. Its style (${signKeywords(s, locale)}) plays a real but less visible part here.`,
    );
  }
  const facts: ElementReading["facts"] = [
    { label: c.factCusp, value: `${cusp?.formatted ?? ""} ${signName(signId, locale)}`.trim(), ref: `sign:${signId}` },
    { label: c.factRuler, value: planetName(ruler, locale), ref: rulerP ? `planet:${ruler}` : undefined },
    { label: c.factPlanets, value: String(tenants.length) },
  ];
  const structured = {
    note: pickBi(text.what, locale),
    lead,
    sections: [{ id: "chart", title: c.secChart, paragraphs: inChart }],
    links: rows.length ? { title: c.secTenants, rows } : undefined,
  };
  const about = [pickBi(text.example, locale), pickBi(BASICS_TEXT.houses, locale)];
  if (swallowed.length) about.push(pickBi(BASICS_TEXT.intercepted, locale));
  return {
    id: `house:${house}`,
    kind: "house",
    title: hName,
    kicker: tenants.length
      ? fill(c.houseKickerOcc, {
          formatted: cusp?.formatted ?? "",
          sign: signName(signId, locale),
          count: tenants.length,
          plural: tenants.length === 1 ? "" : "s",
        })
      : fill(c.houseKickerEmpty, { formatted: cusp?.formatted ?? "", sign: signName(signId, locale) }),
    paragraphs: [structured.note, ...flatten(structured)],
    ...structured,
    facts,
    about: { title: c.aboutTitleHouse, paragraphs: about },
  };
}

function signReading(chart: NatalChart, sign: SignId, locale: Locale): ElementReading {
  const c = readingCopy(locale);
  const meta = SIGN_META[sign];
  const text = SIGN_TEXT[sign];
  const tenants = placementsInSign(chart, sign);
  const cusps = chart.houses.filter((h) => h.sign === sign).map((h) => h.id);
  const intercepted = chart.patterns.intercepted.includes(sign);
  const fr = locale === "fr";
  let lead: string;
  if (tenants.length) {
    const list = joinList(tenants.map((t) => bodyThe(t.id, locale)), locale);
    lead = fr
      ? `Dans votre thème, ${signThe(sign)} contient ${list} : ${tenants.length > 1 ? "ces positions s’expriment" : "cette position s’exprime"} dans le style du signe.`
      : `In your chart, ${signName(sign, locale)} holds ${list}: ${tenants.length > 1 ? "these placements express themselves" : "this placement expresses itself"} in the sign’s style.`;
  } else if (cusps.length) {
    const list = cusps.map((n) => houseInline(n, locale)).join(", ");
    lead = fr
      ? `Aucune planète n’est ${inSign(sign, locale)} dans votre thème, mais le signe est sur la cuspide de votre ${list} : il colore la façon dont vous vivez ce domaine.`
      : `No planet is in ${signName(sign, locale)} in your chart, but the sign is on the cusp of your ${list}: it colours how you handle that area.`;
  } else {
    lead = fr
      ? `Aucune planète ni cuspide ne tombe ${inSign(sign, locale)} dans votre thème${intercepted ? " (le signe est intercepté)" : ""} : il y joue un rôle de fond.`
      : `No planet or house cusp falls in ${signName(sign, locale)} in your chart${intercepted ? " (the sign is intercepted)" : ""}: it plays a background role.`;
  }
  const style = [pickBi(text.strengths, locale), pickBi(text.pitfalls, locale), pickBi(text.example, locale)];
  const inChart: string[] = [];
  if (chart.angles.ascendant.sign === sign) {
    inChart.push(`${fr ? "C’est votre signe ascendant." : "It is your rising sign."} ${pickBi(text.rising, locale)}`);
  }
  if (chart.angles.midheaven.sign === sign) {
    inChart.push(`${fr ? "Il est sur votre Milieu du Ciel." : "It is on your Midheaven."} ${pickBi(text.midheaven, locale)}`);
  }
  for (const n of cusps) inChart.push(`${houseName(n, locale)}${fr ? "\u202f: " : ": "}${signOnCusp(sign, n, locale)}`);
  const rows: Rows = [
    ...tenants.map((t) => ({
      ref: `planet:${t.id}`,
      label: bodyLabel(t.id, locale),
      detail: `${t.formatted} · ${fr ? "M" : "H"}${t.house}`,
    })),
    ...cusps.map((n) => ({ ref: `house:${n}`, label: houseName(n, locale), detail: c.factCusp })),
  ];
  const facts: ElementReading["facts"] = [
    { label: c.factElement, value: cap(elementName(meta.element, locale)) },
    { label: c.factModality, value: cap(modalityName(meta.modality, locale)) },
    {
      label: c.factRuler,
      value: planetName(meta.ruler, locale),
      ref: chart.planets.some((p) => p.id === meta.ruler) ? `planet:${meta.ruler}` : undefined,
    },
  ];
  const sections = [{ id: "style", title: fr ? "Le style du signe" : "The sign’s style", paragraphs: style }];
  if (inChart.length) sections.push({ id: "chart", title: c.secChart, paragraphs: inChart });
  const structured = {
    note: pickBi(text.what, locale),
    lead,
    sections,
    links: rows.length ? { title: c.secLinks, rows } : undefined,
  };
  return {
    id: `sign:${sign}`,
    kind: "sign",
    title: signName(sign, locale),
    kicker: pickBi(text.keywords, locale),
    paragraphs: [structured.note, ...flatten(structured)],
    ...structured,
    facts,
    about: {
      title: c.aboutTitleSign,
      paragraphs: [
        pickBi(ELEMENT_TEXT[meta.element], locale),
        pickBi(MODALITY_TEXT[meta.modality], locale),
        pickBi(BASICS_TEXT.signs, locale),
      ],
    },
  };
}

function decanReading(chart: NatalChart, sign: SignId, face: 0 | 1 | 2, locale: Locale): ElementReading {
  const c = readingCopy(locale);
  const signIdx = SIGN_IDS.indexOf(sign);
  const decan = decanOf(signIdx * 30 + face * 10 + 5);
  const tenants = chart.planets.filter((p) => p.sign === sign && faceIndex(p.ecliptic) === face);
  const start = face * 10;
  const end = start + 10;
  const fr = locale === "fr";
  const span = fr ? `${start}°–${end}° ${signDe(sign)}` : `${start}°–${end}° ${signName(sign, locale)}`;
  const own = decan.faceSign === sign;
  const lead = fr
    ? own
      ? `Le ${faceLabelLocale(decan.face, locale)} décan ${signDe(sign)} va de ${start}° à ${end}°. C’est le décan propre au signe, gouverné par ${bodyInline(decan.ruler, locale)} : on y trouve le style ${signDe(sign)} sous sa forme la plus nette (${signKeywords(sign, locale)}).`
      : `Le ${faceLabelLocale(decan.face, locale)} décan ${signDe(sign)} va de ${start}° à ${end}°. C’est le décan ${signDe(decan.faceSign)}, sous-gouverné par ${bodyInline(decan.ruler, locale)} : il ajoute au style du signe une touche ${signDe(decan.faceSign)} (${signKeywords(decan.faceSign, locale)}).`
    : own
      ? `The ${faceLabelLocale(decan.face, locale)} decan of ${signName(sign, locale)} runs from ${start}° to ${end}°. It is the sign’s own decan, ruled by ${bodyThe(decan.ruler, locale)}: the ${signName(sign, locale)} style in its clearest form (${signKeywords(sign, locale)}).`
      : `The ${faceLabelLocale(decan.face, locale)} decan of ${signName(sign, locale)} runs from ${start}° to ${end}°. It is the ${signName(decan.faceSign, locale)} decan, sub-ruled by ${bodyThe(decan.ruler, locale)}: it adds a touch of ${signName(decan.faceSign, locale)} (${signKeywords(decan.faceSign, locale)}) to the sign’s style.`;
  const inChart = tenants.length
    ? [
        fr
          ? `Dans votre thème : ${joinList(tenants.map((t) => `${bodyThe(t.id, locale)} (${t.formatted})`), locale)}. ${tenants.length > 1 ? "Ces positions prennent" : "Cette position prend"} cette nuance.`
          : `In your chart: ${joinList(tenants.map((t) => `${bodyThe(t.id, locale)} (${t.formatted})`), locale)}. ${tenants.length > 1 ? "These placements take" : "This placement takes"} on this nuance.`,
      ]
    : [fr ? "Aucune planète natale ne se trouve dans ces 10°." : "No natal planet sits in these 10°."];
  const rows = tenants.map((t) => ({ ref: `planet:${t.id}`, label: bodyLabel(t.id, locale), detail: t.formatted }));
  const facts: ElementReading["facts"] = [
    { label: c.factSign, value: span, ref: `sign:${sign}` },
    {
      label: c.factRuler,
      value: planetName(decan.ruler, locale),
      ref: chart.planets.some((p) => p.id === decan.ruler) ? `planet:${decan.ruler}` : undefined,
    },
  ];
  const structured = {
    note: pickBi(BASICS_TEXT.decans, locale),
    lead,
    sections: [{ id: "chart", title: c.secChart, paragraphs: inChart }],
    links: rows.length ? { title: c.secTenants, rows } : undefined,
  };
  return {
    id: `decan:${sign}-${face}`,
    kind: "decan",
    title: fill(c.decanTitle, { face: faceLabelLocale(decan.face, locale), sign: fr ? signDe(sign) : signName(sign, locale) }),
    kicker: fill(c.decanKicker, { span, faceSign: signName(decan.faceSign, locale), ruler: bodyBare(decan.ruler, locale) }),
    paragraphs: flatten(structured),
    ...structured,
    facts,
    // What decans are in general opens here (reading-card.tsx), under the reading of this one.
    about: { title: fr ? "À propos des décans" : "About decans", paragraphs: [] },
  };
}

function aspectReading(chart: NatalChart, link: AspectLink, locale: Locale): ElementReading {
  const c = readingCopy(locale);
  const title = aspectLinkPhrase(link.a, link.type, link.b, locale);
  const paras = aspectParagraphs(chart, link, locale);
  const [lead, ...rest] = paras;
  const end = (id: string) => {
    const p = chart.planets.find((x) => x.id === id) ?? chart.angles[id as keyof NatalChart["angles"]];
    return {
      ref: refFor(id),
      label: bodyLabel(id, locale),
      detail: p ? `${p.formatted} ${signName(p.sign, locale)} · ${locale === "fr" ? "M" : "H"}${p.house}` : undefined,
      text: `${bodyLabel(id, locale)}${locale === "fr" ? "\u202f: " : ": "}${bodyAs(id as BodyId, locale)}.`,
    };
  };
  const structured = {
    note: aspectIs(link.type, locale),
    lead,
    sections: rest.length ? [{ id: "chart", title: c.secChart, paragraphs: rest.filter(Boolean) }] : [],
    links: { title: c.secLinks, rows: [end(link.a), end(link.b)] },
  };
  return {
    id: `aspect:${link.id}`,
    kind: "aspect",
    title,
    kicker: fill(c.aspectKicker, { level: link.level === "major" ? c.major : c.minor, orb: formatArc(link.orb) }),
    paragraphs: [structured.note, ...flatten(structured)],
    ...structured,
    facts: [{ label: c.factOrb, value: `${formatArc(link.orb)} · ${link.level === "major" ? c.major : c.minor}` }],
    about: {
      title: c.aboutTitleAspect,
      paragraphs: [
        ...(pairTheme(link.a, link.b, locale) && isClassicPair(link.a, link.b) ? [aspectInPractice(link.type, locale)] : []),
        pickBi(ORB_ABOUT, locale),
        pickBi(BASICS_TEXT.aspects, locale),
      ],
    },
  };
}

const dossiers = new WeakMap<NatalChart, Partial<Record<Locale, LocalDossier>>>();

/**
 * The dossier of this chart object in this language, built once. Opening a
 * chart used to build it two or three times over (the store, then the
 * workspace, then again for a signed-in library).
 */
export function dossierFor(chart: NatalChart, locale: Locale = "en"): LocalDossier {
  let entry = dossiers.get(chart);
  if (!entry) {
    entry = {};
    dossiers.set(chart, entry);
  }
  const known = entry[locale];
  if (known) return known;
  const built = buildDossier(chart, locale);
  entry[locale] = built;
  return built;
}

/**
 * Without a birth time, what a reading says that hangs on the hour: a first
 * section says so, and the facts that hang on it are marked ~ (as in the
 * table). The angles, the houses, the Vertex and the lots move with the hour;
 * a body keeps its sign and degree, but not its house, and a quick one (the
 * Moon) only roughly its degree; an aspect may not hold all day
 * (day-checks.ts).
 */
function withUnknownTime(chart: NatalChart, r: ElementReading, locale: Locale): ElementReading {
  const c = readingCopy(locale);
  const at = r.id.indexOf(":");
  const kind = r.id.slice(0, at);
  const id = r.id.slice(at + 1);
  const texts: string[] = [];
  let whole = false;
  let place = false;
  let decanMoves = false;
  if (kind === "angle") {
    texts.push(fill(c.timeAngle, { name: bodyThe(id, locale, true) }));
    whole = true;
  } else if (kind === "house") {
    texts.push(c.timeHouse);
    whole = true;
  } else if (kind === "planet") {
    const p = chart.planets.find((b) => b.id === id);
    if (p?.uncertain) {
      texts.push(fill(c.timePoint, { name: bodyThe(id, locale, true) }));
      whole = true;
    } else if (p) {
      texts.push(fill(c.timeHouseOf, { house: houseName(p.house, locale) }));
      const span = daySpan(chart, p);
      if (span && isRough(chart, p)) {
        place = true;
        const [lo, hi] = extent(span);
        decanMoves = Math.floor(lo / 10) !== Math.floor(hi / 10);
        const where = (lon: number) => `${formatDegree(lon)} ${signName(signFromEcliptic(lon), locale)}`;
        texts.push(
          fill(c.timeRough, {
            name: bodyThe(id, locale, true),
            arc: formatArc(Math.abs(span.end - span.start)),
            from: where(span.start),
            to: where(span.end),
          }),
        );
        if (!signHolds(chart, p)) {
          texts.push(
            fill(c.timeSigns, {
              name: bodyThe(id, locale, true),
              a: inSign(signFromEcliptic(span.start), locale),
              b: inSign(signFromEcliptic(span.end), locale),
            }),
          );
        }
      }
    }
  } else if (kind === "aspect") {
    const a = chart.aspects.find((x) => x.id === id);
    if (a && !aspectHolds(chart, a)) {
      texts.push(c.timeAspect);
      whole = true;
    }
  }
  if (!texts.length) return r;
  const text = texts.join(" ");
  const body = kind === "planet" ? chart.planets.find((b) => b.id === id) : undefined;
  // An angle, a house, a lot or an aspect that may not hold: every fact hangs on the time.
  const shaky = (label: string) =>
    whole ||
    label === c.factHouse ||
    label === c.factCusp ||
    (place && label === c.factSign) ||
    (decanMoves && label === c.factDecan) ||
    (label === c.factDignity && body != null && !dignityHolds(chart, body));
  const facts = r.facts?.map((f) => (shaky(f.label) ? { ...f, value: `~${f.value}` } : f));
  // "~" before the kicker's first number (the degree, the cusp, the orb), and before a body's house.
  let kicker = r.kicker;
  if (kicker && (whole || place)) kicker = kicker.replace(/\d/, (d) => `~${d}`);
  if (kicker && kind === "planet" && !whole) {
    const house = body ? houseName(body.house, locale) : "";
    if (house && kicker.includes(house)) kicker = kicker.replace(house, `~${house}`);
  }
  const [note, ...rest] = r.paragraphs;
  return {
    ...r,
    kicker,
    facts,
    sections: [{ id: "time", title: c.secTime, paragraphs: [text] }, ...(r.sections ?? [])],
    paragraphs: note == null ? [text, ...rest] : [note, text, ...rest],
  };
}

export function buildDossier(chart: NatalChart, locale: Locale = "en", notes: { unknownTime?: boolean } = {}): LocalDossier {
  const byId: Record<string, ElementReading> = {};
  const order: string[] = [];
  const unknown = chart.meta.timeUnknown === true && notes.unknownTime !== false;
  const add = (r: ElementReading) => {
    const read = unknown ? withUnknownTime(chart, r, locale) : r;
    byId[read.id] = read;
    order.push(read.id);
  };

  add(angleReading(chart, "ascendant", locale));
  add(angleReading(chart, "midheaven", locale));
  add(angleReading(chart, "descendant", locale));
  add(angleReading(chart, "ic", locale));

  for (const p of chart.planets) add(planetReading(chart, p, locale));
  for (let h = 1; h <= 12; h += 1) add(houseReading(chart, h, locale));
  for (const sign of Object.keys(SIGN_META) as SignId[]) add(signReading(chart, sign, locale));
  for (const sign of SIGN_IDS) {
    for (const face of [0, 1, 2] as const) add(decanReading(chart, sign, face, locale));
  }
  for (const a of chart.aspects) add(aspectReading(chart, a, locale));

  return { byId, order };
}

export { mergeGrokIntoDossier, natalRootReading } from "./dossier";

/**
 * Composite chart: the same readings as a birth chart, read as the chart of
 * the relationship. A first section says how to read "you" here.
 */
export function buildCompositeDossier(chart: NatalChart, locale: Locale): LocalDossier {
  // The natal "cast for 12:00" wording does not fit a composite.
  const base = buildDossier(chart, locale, { unknownTime: false });
  const fr = locale === "fr";
  const hint = {
    id: "composite",
    title: fr ? "Dans un thème composite" : "In a composite chart",
    paragraphs: [
      fr
        ? "Ce thème est celui de la relation, calculé à partir des points médians de vos deux thèmes. Lisez « vous » comme « vous deux, ensemble » : il décrit ce que la relation fait naître, pas l’une ou l’autre personne."
        : "This is the chart of the relationship, built from the midpoints of your two charts. Read “you” as “the two of you together”: it describes what the relationship brings out, not either person on their own.",
    ],
  };
  const byId: Record<string, ElementReading> = {};
  for (const [id, r] of Object.entries(base.byId)) {
    byId[id] = { ...r, sections: [hint, ...(r.sections ?? [])] };
  }
  return { byId, order: base.order };
}
