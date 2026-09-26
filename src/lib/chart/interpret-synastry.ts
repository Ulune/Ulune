/**
 * Synastry readings: each person's bodies and the aspects between the two
 * charts. Wording comes from src/lib/content.
 */
import { TIGHT_ORB } from "./constants";
import { applyingWord, aspectFamily, aspectInPractice, aspectIs, bodyIs, bodyKeywords, houseArea, minorAspectNote, pairTheme } from "./plain";
import type { Locale } from "@/lib/i18n/locale";
import { aspectLinkPhrase, bodyInline, bodyLabel, formatOrb, houseInline, inSign, lowerLead, signName } from "@/lib/i18n/astro";
import { pickBi } from "@/lib/content/types";
import { ORB_ABOUT, SYNASTRY_ABOUT, SYNASTRY_FAMILY } from "@/lib/content/astro-time";
import type { AngleId, AspectLink, BodyId, ElementReading, LocalDossier, NatalChart, Placement } from "./types";

function bodyOf(chart: NatalChart, id: BodyId): Placement | undefined {
  if (id in chart.angles) return chart.angles[id as AngleId];
  return chart.planets.find((p) => p.id === id);
}

function nameOf(chart: NatalChart): string {
  return chart.meta.name.trim() || (chart.meta.placeLabel.split(",")[0]?.trim() ?? "");
}

function who(chart: NatalChart, fallback: string): string {
  return nameOf(chart) || fallback;
}

/** French "de X" with elision before a vowel. */
function de(name: string) {
  return /^[aeiouyhéèêàâîôûAEIOUYHÉÈÊÀÂÎÔÛ]/.test(name) ? `d’${name}` : `de ${name}`;
}

function refA(id: BodyId) {
  return id === "ascendant" || id === "midheaven" || id === "descendant" || id === "ic" ? `angle:${id}` : `planet:${id}`;
}

function familyText(link: AspectLink, aName: string, bName: string, locale: Locale): string {
  return pickBi(SYNASTRY_FAMILY[aspectFamily(link.type)], locale)
    .replaceAll("{a}", aName)
    .replaceAll("{b}", bName)
    .replaceAll("{aBody}", `${locale === "fr" ? bodyInline(link.a, locale) : bodyLabel(link.a, locale)} (${bodyKeywords(link.a, locale)})`)
    .replaceAll("{bBody}", `${locale === "fr" ? bodyInline(link.b, locale) : bodyLabel(link.b, locale)} (${bodyKeywords(link.b, locale)})`)
    .concat(minorAspectNote(link.type, locale));
}

export function synastryBodyReading(
  placement: Placement,
  owner: NatalChart,
  other: NatalChart,
  aspects: AspectLink[],
  side: "a" | "b",
  locale: Locale,
): ElementReading {
  const fr = locale === "fr";
  const name = bodyLabel(placement.id, locale);
  const ownerName = who(owner, side === "a" ? "A" : "B");
  const otherName = who(other, side === "a" ? "B" : "A");
  const aName = side === "a" ? ownerName : otherName;
  const bName = side === "a" ? otherName : ownerName;
  const hits = aspects
    .filter((row) => row.level === "major")
    .filter((row) => (side === "a" ? row.a === placement.id : row.b === placement.id))
    .sort((x, y) => x.orb - y.orb)
    .slice(0, 6);
  const lead = fr
    ? `Chez ${ownerName}, ${bodyInline(placement.id, locale)} est à ${placement.formatted} ${inSign(placement.sign, locale)}, en ${houseInline(placement.house, locale)} (${houseArea(placement.house, locale)}). ${hits.length ? `Ce point forme ${hits.length} aspect${hits.length > 1 ? "s" : ""} majeur${hits.length > 1 ? "s" : ""} avec le thème ${de(otherName)} : c’est là que ${otherName} touche ${bodyKeywords(placement.id, locale)} ${de(ownerName)}.` : `Ce point ne forme aucun aspect majeur avec le thème ${de(otherName)}.`}`
    : `${ownerName}’s ${name} is at ${placement.formatted} ${signName(placement.sign, locale)}, in their ${houseInline(placement.house, locale)} (${houseArea(placement.house, locale)}). ${hits.length ? `It makes ${hits.length} major aspect${hits.length > 1 ? "s" : ""} to ${otherName}’s chart: this is where ${otherName} touches ${ownerName}’s ${bodyKeywords(placement.id, locale)}.` : `It makes no major aspect to ${otherName}’s chart.`}`;
  const inChart: string[] = [];
  const tight = hits.find((row) => row.orb <= TIGHT_ORB);
  if (tight) {
    inChart.push(
      fr
        ? `Le contact le plus serré : ${lowerLead(aspectLinkPhrase(tight.a, tight.type, tight.b, locale))}, à ${formatOrb(tight.orb, locale)}°. ${familyText(tight, aName, bName, locale)}`
        : `The tightest contact is ${aspectLinkPhrase(tight.a, tight.type, tight.b, locale)} at ${formatOrb(tight.orb, locale)}°. ${familyText(tight, aName, bName, locale)}`,
    );
  }
  const rows = hits.map((row) => ({
    ref: `saspect:${row.id}`,
    label: aspectLinkPhrase(row.a, row.type, row.b, locale),
    detail: `${formatOrb(row.orb, locale)}°`,
    text: familyText(row, aName, bName, locale),
  }));
  const note = bodyIs(placement.id, locale);
  return {
    id: side === "a" ? refA(placement.id) : `partner:${placement.id}`,
    kind: placement.kind === "angle" ? "angle" : "planet",
    title: `${name} · ${ownerName}`,
    kicker: fr
      ? `${placement.formatted} ${signName(placement.sign, locale)} · maison ${placement.house}`
      : `${placement.formatted} ${signName(placement.sign, locale)} · house ${placement.house}`,
    paragraphs: [note, lead, ...inChart, ...rows.map((r) => r.text)],
    note,
    lead,
    facts: [
      { label: fr ? "Signe" : "Sign", value: `${placement.formatted} ${signName(placement.sign, locale)}` },
      { label: fr ? "Maison" : "House", value: String(placement.house) },
    ],
    sections: inChart.length ? [{ id: "chart", title: fr ? "Entre vous" : "Between you", paragraphs: inChart }] : [],
    links: rows.length ? { title: fr ? `Contacts avec ${otherName}` : `Contacts with ${otherName}`, rows } : undefined,
    about: { title: fr ? "À propos de la synastrie" : "About synastry", paragraphs: [pickBi(SYNASTRY_ABOUT, locale)] },
  };
}

export function synastryAspectReading(link: AspectLink, a: NatalChart, b: NatalChart, locale: Locale): ElementReading {
  const fr = locale === "fr";
  const aPlace = bodyOf(a, link.a);
  const bPlace = bodyOf(b, link.b);
  const aName = who(a, "A");
  const bName = who(b, "B");
  const phrase = aspectLinkPhrase(link.a, link.type, link.b, locale);
  const orb = formatOrb(link.orb, locale);
  const app = applyingWord(link.applying, locale);
  const lead = familyText(link, aName, bName, locale);
  const inChart: string[] = [];
  const theme = pairTheme(link.a, link.b, locale);
  if (theme) inChart.push(theme);
  if (aPlace && bPlace) {
    inChart.push(
      fr
        ? `Chez ${aName}, ${bodyInline(link.a, locale)} est ${inSign(aPlace.sign, locale)} (${houseInline(aPlace.house, locale)} : ${houseArea(aPlace.house, locale)}) ; chez ${bName}, ${bodyInline(link.b, locale)} est ${inSign(bPlace.sign, locale)} (${houseInline(bPlace.house, locale)} : ${houseArea(bPlace.house, locale)}).`
        : `${aName}’s ${bodyLabel(link.a, locale)} is in ${signName(aPlace.sign, locale)} (${houseInline(aPlace.house, locale)}: ${houseArea(aPlace.house, locale)}); ${bName}’s ${bodyLabel(link.b, locale)} is in ${signName(bPlace.sign, locale)} (${houseInline(bPlace.house, locale)}: ${houseArea(bPlace.house, locale)}).`,
    );
  }
  inChart.push(
    fr
      ? `Orbe ${orb}° : ${link.orb < 2 ? "un contact serré, très sensible entre vous" : link.orb < 5 ? "un contact net" : "un contact plus diffus"}.`
      : `Orb ${orb}°: ${link.orb < 2 ? "a tight contact, strongly felt between you" : link.orb < 5 ? "a clear contact" : "a looser, more diffuse contact"}.`,
  );
  const note = aspectIs(link.type, locale);
  return {
    id: `saspect:${link.id}`,
    kind: "aspect",
    title: phrase,
    kicker: fr
      ? `${link.level === "major" ? "Majeur" : "Mineur"} · orbe ${orb}°${app ? ` · ${app}` : ""}`
      : `${link.level === "major" ? "Major" : "Minor"} · orb ${orb}°${app ? ` · ${app}` : ""}`,
    paragraphs: [note, lead, ...inChart],
    note,
    lead,
    facts: [{ label: fr ? "Orbe" : "Orb", value: `${orb}°` }],
    sections: [{ id: "chart", title: fr ? "Entre vous" : "Between you", paragraphs: inChart }],
    links: {
      title: fr ? "Les deux points" : "The two points",
      rows: [
        { ref: refA(link.a), label: `${bodyLabel(link.a, locale)} · ${aName}` },
        { ref: `partner:${link.b}`, label: `${bodyLabel(link.b, locale)} · ${bName}` },
      ],
    },
    about: {
      title: fr ? "À propos de la synastrie" : "About synastry",
      paragraphs: [aspectInPractice(link.type, locale), pickBi(SYNASTRY_ABOUT, locale), pickBi(ORB_ABOUT, locale)],
    },
  };
}

export function buildSynastryDossier(a: NatalChart, b: NatalChart, aspects: AspectLink[], locale: Locale): LocalDossier {
  const byId: Record<string, ElementReading> = {};
  const order: string[] = [];
  const add = (r: ElementReading) => {
    byId[r.id] = r;
    order.push(r.id);
  };
  for (const p of [...a.planets, ...Object.values(a.angles)]) add(synastryBodyReading(p, a, b, aspects, "a", locale));
  for (const p of [...b.planets, ...Object.values(b.angles)]) add(synastryBodyReading(p, b, a, aspects, "b", locale));
  for (const link of aspects) add(synastryAspectReading(link, a, b, locale));
  return { byId, order };
}
