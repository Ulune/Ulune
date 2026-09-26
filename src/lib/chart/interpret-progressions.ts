/**
 * Secondary-progression readings: the progressed position of each body and
 * its aspects to the birth chart. Wording comes from src/lib/content.
 */
import { TIGHT_ORB } from "./constants";
import { applyingWord, aspectInPractice, aspectIs, bodyIs, bodyKeywords, houseArea, pairTheme, signKeywords } from "./plain";
import { movingFamilyText } from "./interpret-transit";
import type { Locale } from "@/lib/i18n/locale";
import { aspectLinkPhrase, bodyAgree, bodyInline, bodyLabel, formatOrb, houseInline, inSign, lowerLead, signName } from "@/lib/i18n/astro";
import { pickBi } from "@/lib/content/types";
import { ORB_ABOUT, PROGRESSED_FAMILY, PROGRESSED_PACE, PROGRESSION_ABOUT } from "@/lib/content/astro-time";
import type { AngleId, AspectLink, BodyId, ElementReading, LocalDossier, NatalChart, Placement, ProgressedSky } from "./types";

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function natalBody(chart: NatalChart, id: BodyId): Placement | undefined {
  if (id in chart.angles) return chart.angles[id as AngleId];
  return chart.planets.find((p) => p.id === id);
}

function natalRef(id: BodyId) {
  return id === "ascendant" || id === "midheaven" || id === "descendant" || id === "ic" ? `angle:${id}` : `planet:${id}`;
}

export function progressedReading(
  placement: Placement,
  natal: NatalChart,
  aspects: AspectLink[],
  locale: Locale,
): ElementReading {
  const id = placement.id as BodyId;
  const fr = locale === "fr";
  const name = bodyLabel(id, locale);
  const natalP = natalBody(natal, id);
  const hits = aspects.filter((a) => a.a === placement.id).sort((a, b) => a.orb - b.orb).slice(0, 6);
  const area = houseArea(placement.house, locale);
  const moved = natalP && natalP.sign !== placement.sign;
  const lead = fr
    ? `${cap(bodyInline(id, locale))} ${bodyAgree(id, "progressé", "progressée")} est à ${placement.formatted} ${inSign(placement.sign, locale)}, dans votre ${houseInline(placement.house, locale)} (${area}).${moved ? ` À la naissance, ce point était ${inSign(natalP!.sign, locale)} : avec ce changement de signe, ${bodyKeywords(id, locale)} se colorent désormais de ${signKeywords(placement.sign, locale)}.` : " Ce point n’a pas changé de signe depuis la naissance."}`
    : `Your progressed ${name} is at ${placement.formatted} ${signName(placement.sign, locale)}, in your ${houseInline(placement.house, locale)} (${area}).${moved ? ` At birth it was in ${signName(natalP!.sign, locale)}: this change of sign is read as ${bodyKeywords(id, locale)} developing a more ${signKeywords(placement.sign, locale)} style.` : " It is still in the sign it had at birth."}`;
  const inChart: string[] = [];
  if (placement.retrograde) {
    inChart.push(
      fr
        ? "Ce point est rétrograde en progression : sa fonction se tourne davantage vers l’intérieur pendant ces années."
        : "It is retrograde by progression: its function turns more inward during these years.",
    );
  }
  const tight = hits.find((a) => a.orb <= TIGHT_ORB);
  if (tight) {
    inChart.push(
      fr
        ? `Son contact le plus serré : ${lowerLead(aspectLinkPhrase(tight.a, tight.type, tight.b, locale))} ${bodyAgree(tight.b, "natal", "natale")}, à ${formatOrb(tight.orb, locale)}°. Les progressions bougent lentement : un tel aspect reste actif environ un an de part et d’autre de l’exactitude.`
        : `Its tightest contact is ${aspectLinkPhrase(tight.a, tight.type, tight.b, locale)} (natal), at ${formatOrb(tight.orb, locale)}°. Progressions move slowly: an aspect like this stays active for about a year either side of exact.`,
    );
  } else if (!hits.length) {
    inChart.push(
      fr
        ? "Aucun aspect majeur serré à votre thème en ce moment : ce point progressé agit surtout par son signe et sa maison."
        : "No tight major aspect to your chart at the moment: this progressed point works mostly through its sign and house.",
    );
  }
  const rows = hits.map((a) => ({
    ref: `paspect:${a.id}`,
    label: fr ? `${aspectLinkPhrase(a.a, a.type, a.b, locale)} ${bodyAgree(a.b, "natal", "natale")}` : `${aspectLinkPhrase(a.a, a.type, a.b, locale)} (natal)`,
    detail: `${formatOrb(a.orb, locale)}°${applyingWord(a.applying, locale) ? ` · ${applyingWord(a.applying, locale)}` : ""}`,
    text: movingFamilyText(PROGRESSED_FAMILY, a.a, a.b, a.type, locale),
  }));
  const note = pickBi(PROGRESSED_PACE[id], locale) || pickBi(PROGRESSION_ABOUT, locale);
  const kindAngle = placement.kind === "angle";
  return {
    id: `progressed:${placement.id}`,
    kind: kindAngle ? "angle" : "planet",
    title: fr ? `${name} ${bodyAgree(id, "progressé", "progressée")}` : `Progressed ${name}`,
    kicker: fr
      ? `${placement.formatted} ${signName(placement.sign, locale)} · ${houseInline(placement.house, locale)} natale`
      : `${placement.formatted} ${signName(placement.sign, locale)} · natal ${houseInline(placement.house, locale)}`,
    paragraphs: [note, lead, ...inChart, ...rows.map((r) => r.text)],
    note,
    lead,
    facts: [
      { label: fr ? "Signe" : "Sign", value: `${placement.formatted} ${signName(placement.sign, locale)}`, ref: `sign:${placement.sign}` },
      { label: fr ? "Maison natale" : "Natal house", value: String(placement.house), ref: `house:${placement.house}` },
      ...(natalP ? [{ label: fr ? "À la naissance" : "At birth", value: `${natalP.formatted} ${signName(natalP.sign, locale)}`, ref: natalRef(id) }] : []),
    ],
    sections: inChart.length ? [{ id: "chart", title: fr ? "En ce moment" : "Right now", paragraphs: inChart }] : [],
    links: rows.length ? { title: fr ? "Contacts avec votre thème" : "Contacts with your chart", rows } : undefined,
    about: {
      title: fr ? "À propos des progressions" : "About progressions",
      paragraphs: [pickBi(PROGRESSION_ABOUT, locale), bodyIs(id, locale)].filter(Boolean),
    },
  };
}

export function progressedAspectReading(
  link: AspectLink,
  natal: NatalChart,
  sky: ProgressedSky,
  locale: Locale,
): ElementReading {
  const fr = locale === "fr";
  const moving = link.a in sky.angles ? sky.angles[link.a as AngleId] : sky.planets.find((p) => p.id === link.a);
  const natalP = natalBody(natal, link.b);
  const phrase = aspectLinkPhrase(link.a, link.type, link.b, locale);
  const orb = formatOrb(link.orb, locale);
  const app = applyingWord(link.applying, locale);
  const lead = movingFamilyText(PROGRESSED_FAMILY, link.a, link.b, link.type, locale);
  const inChart: string[] = [];
  if (moving && natalP) {
    inChart.push(
      fr
        ? `En progression, ${bodyInline(link.a, locale)} (${moving.formatted} ${inSign(moving.sign, locale)}) forme un aspect avec ${bodyInline(link.b, locale)} de votre thème (${natalP.formatted} ${inSign(natalP.sign, locale)}), en ${houseInline(natalP.house, locale)} (${houseArea(natalP.house, locale)}).`
        : `Progressed ${bodyLabel(link.a, locale)} (${moving.formatted} ${signName(moving.sign, locale)}) is aspecting your natal ${bodyLabel(link.b, locale)} (${natalP.formatted} ${signName(natalP.sign, locale)}), in your ${houseInline(natalP.house, locale)} (${houseArea(natalP.house, locale)}).`,
    );
  }
  const theme = pairTheme(link.a, link.b, locale);
  if (theme) inChart.push(theme);
  inChart.push(
    fr
      ? `Orbe ${orb}°${app ? `, ${app}` : ""}. Une progression d’un degré correspond à peu près à une année.`
      : `Orb ${orb}°${app ? `, ${app}` : ""}. One degree of progressed movement corresponds to roughly one year.`,
  );
  const note = aspectIs(link.type, locale);
  return {
    id: `paspect:${link.id}`,
    kind: "aspect",
    title: fr ? `Progressé · ${phrase}` : `Progressed · ${phrase}`,
    kicker: fr
      ? `${link.level === "major" ? "Majeur" : "Mineur"} · orbe ${orb}°${app ? ` · ${app}` : ""}`
      : `${link.level === "major" ? "Major" : "Minor"} · orb ${orb}°${app ? ` · ${app}` : ""}`,
    paragraphs: [note, lead, ...inChart],
    note,
    lead,
    facts: [{ label: fr ? "Orbe" : "Orb", value: `${orb}°${app ? ` · ${app}` : ""}` }],
    sections: [{ id: "chart", title: fr ? "Dans votre thème" : "In your chart", paragraphs: inChart }],
    links: {
      title: fr ? "Les deux points" : "The two points",
      rows: [
        { ref: `progressed:${link.a}`, label: fr ? `${bodyLabel(link.a, locale)} ${bodyAgree(link.a, "progressé", "progressée")}` : `Progressed ${bodyLabel(link.a, locale)}` },
        { ref: natalRef(link.b), label: fr ? `${bodyLabel(link.b, locale)} ${bodyAgree(link.b, "natal", "natale")}` : `Natal ${bodyLabel(link.b, locale)}` },
      ],
    },
    about: {
      title: fr ? "À propos des progressions" : "About progressions",
      paragraphs: [aspectInPractice(link.type, locale), pickBi(PROGRESSION_ABOUT, locale), pickBi(ORB_ABOUT, locale)],
    },
  };
}

export function buildProgressedDossier(natal: NatalChart, sky: ProgressedSky, locale: Locale): LocalDossier {
  const byId: Record<string, ElementReading> = {};
  const order: string[] = [];
  const add = (r: ElementReading) => {
    byId[r.id] = r;
    order.push(r.id);
  };
  for (const p of sky.planets) add(progressedReading(p, natal, sky.aspects, locale));
  for (const a of Object.values(sky.angles)) add(progressedReading(a, natal, sky.aspects, locale));
  for (const a of sky.aspects) add(progressedAspectReading(a, natal, sky, locale));
  return { byId, order };
}
