/**
 * Transit readings: where a moving planet is now against the birth chart,
 * and each contact it makes. Wording comes from src/lib/content.
 */
import { TIGHT_ORB } from "./constants";
import { applyingWord, aspectFamily, aspectInPractice, aspectIs, bodyAs, bodyIs, bodyKeywords, houseArea, minorAspectNote, pairTheme, signKeywords } from "./plain";
import type { Locale } from "@/lib/i18n/locale";
import { aspectLinkPhrase, bodyAgree, bodyInline, bodyLabel, bodyThe, houseInline, inSign, lowerLead, signName } from "@/lib/i18n/astro";
import { pickBi } from "@/lib/content/types";
import { ORB_ABOUT, TRANSIT_ABOUT, TRANSIT_FAMILY, TRANSIT_PACE } from "@/lib/content/astro-time";
import type { AspectLink, BodyId, ElementReading, LocalDossier, NatalChart, Placement, TransitSky } from "./types";
import { formatArc } from "@/lib/utils";

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function natalBody(chart: NatalChart, id: BodyId): Placement | undefined {
  if (id in chart.angles) return chart.angles[id as keyof NatalChart["angles"]];
  return chart.planets.find((p) => p.id === id);
}

function natalRef(id: BodyId) {
  return id === "ascendant" || id === "midheaven" || id === "descendant" || id === "ic" ? `angle:${id}` : `planet:${id}`;
}

/** The family sentence: "{moving} puts pressure on {natal}". */
export function movingFamilyText(
  table: typeof TRANSIT_FAMILY,
  moving: BodyId,
  natal: BodyId,
  type: AspectLink["type"],
  locale: Locale,
): string {
  const movingPhrase =
    locale === "fr"
      ? `${bodyInline(moving, locale)} (${bodyKeywords(moving, locale)})`
      : `${bodyThe(moving, locale)} (${bodyKeywords(moving, locale)})`;
  return (
    pickBi(table[aspectFamily(type)], locale)
      .replaceAll("{moving}", movingPhrase)
      .replaceAll("{natal}", bodyAs(natal, locale)) + minorAspectNote(type, locale)
  );
}

export function transitReading(
  placement: Placement,
  natal: NatalChart,
  aspects: AspectLink[],
  locale: Locale,
): ElementReading {
  const id = placement.id as BodyId;
  const fr = locale === "fr";
  const name = bodyLabel(id, locale);
  const hits = aspects.filter((a) => a.a === placement.id).sort((a, b) => a.orb - b.orb).slice(0, 6);
  const area = houseArea(placement.house, locale);
  const lead = fr
    ? `${cap(bodyInline(id, locale))} en transit est à ${placement.formatted} ${inSign(placement.sign, locale)} et traverse votre ${houseInline(placement.house, locale)} (${area}). Pendant ce passage, ${bodyKeywords(id, locale)} se ${hits.length ? "manifestent" : "font sentir"} surtout dans ce domaine.`
    : `Transiting ${name} is at ${placement.formatted} ${signName(placement.sign, locale)}, passing through your ${houseInline(placement.house, locale)} (${area}). While it is there, ${bodyKeywords(id, locale)} tend to show up mostly in this area.`;
  const inChart: string[] = [
    fr
      ? `En ${signName(placement.sign, locale)}, le transit se colore des traits du signe (${signKeywords(placement.sign, locale)}).`
      : `In ${signName(placement.sign, locale)}, it works in a ${signKeywords(placement.sign, locale)} way.`,
  ];
  if (placement.retrograde) {
    inChart.push(
      fr
        ? "La planète est rétrograde en ce moment : vue de la Terre, elle semble reculer. On lit cette phase comme un temps pour revoir et reprendre plutôt que pour lancer du nouveau."
        : "It is retrograde at the moment: seen from Earth, it appears to move backwards. This phase is read as a time to review and redo rather than to launch something new.",
    );
  }
  const tight = hits.find((a) => a.orb <= TIGHT_ORB);
  if (tight) {
    inChart.push(
      fr
        ? `Son contact le plus serré : ${lowerLead(aspectLinkPhrase(tight.a, tight.type, tight.b, locale))} ${bodyAgree(tight.b, "natal", "natale")}, à ${formatArc(tight.orb)}. C’est là que le transit se fait le plus sentir en ce moment.`
        : `Its tightest contact is ${aspectLinkPhrase(tight.a, tight.type, tight.b, locale)} (natal), at ${formatArc(tight.orb)}: that is where this transit is felt most right now.`,
    );
  } else if (!hits.length) {
    inChart.push(
      fr
        ? "Aucun aspect majeur serré à votre thème pour l’instant : le transit agit surtout par la maison qu’il traverse."
        : "No tight major aspect to your chart just now: this transit works mostly through the house it is crossing.",
    );
  }
  const rows = hits.map((a) => ({
    ref: `taspect:${a.id}`,
    label: fr ? `${aspectLinkPhrase(a.a, a.type, a.b, locale)} ${bodyAgree(a.b, "natal", "natale")}` : `${aspectLinkPhrase(a.a, a.type, a.b, locale)} (natal)`,
    detail: `${formatArc(a.orb)}${applyingWord(a.applying, locale) ? ` · ${applyingWord(a.applying, locale)}` : ""}`,
    text: movingFamilyText(TRANSIT_FAMILY, a.a, a.b, a.type, locale),
  }));
  const pace = TRANSIT_PACE[id];
  const note = pickBi(pace, locale) || pickBi(TRANSIT_ABOUT, locale);
  const paragraphs = [note, lead, ...inChart, ...rows.map((r) => r.text)];
  return {
    id: `transit:${placement.id}`,
    kind: "planet",
    title: fr ? `${name} en transit` : `Transiting ${name}`,
    kicker: fr
      ? `${placement.formatted} ${signName(placement.sign, locale)} · ${houseInline(placement.house, locale)} natale`
      : `${placement.formatted} ${signName(placement.sign, locale)} · natal ${houseInline(placement.house, locale)}`,
    paragraphs,
    note,
    lead,
    facts: [
      { label: fr ? "Signe" : "Sign", value: `${placement.formatted} ${signName(placement.sign, locale)}`, ref: `sign:${placement.sign}` },
      { label: fr ? "Maison natale" : "Natal house", value: String(placement.house), ref: `house:${placement.house}` },
      ...(placement.retrograde ? [{ label: fr ? "Mouvement" : "Motion", value: fr ? "Rétrograde" : "Retrograde" }] : []),
    ],
    sections: [{ id: "chart", title: fr ? "En ce moment" : "Right now", paragraphs: inChart }],
    links: rows.length ? { title: fr ? "Contacts avec votre thème" : "Contacts with your chart", rows } : undefined,
    about: {
      title: fr ? "À propos des transits" : "About transits",
      paragraphs: [pickBi(TRANSIT_ABOUT, locale), bodyIs(id, locale)].filter(Boolean),
    },
  };
}

export function transitAspectReading(
  link: AspectLink,
  natal: NatalChart,
  sky: TransitSky,
  locale: Locale,
): ElementReading {
  const fr = locale === "fr";
  const moving = sky.planets.find((p) => p.id === link.a);
  const natalP = natalBody(natal, link.b);
  const phrase = aspectLinkPhrase(link.a, link.type, link.b, locale);
  const orb = formatArc(link.orb);
  const app = applyingWord(link.applying, locale);
  const lead = movingFamilyText(TRANSIT_FAMILY, link.a, link.b, link.type, locale);
  const theme = pairTheme(link.a, link.b, locale);
  const inChart: string[] = [];
  if (moving && natalP) {
    inChart.push(
      fr
        ? `En transit, ${bodyInline(link.a, locale)} (${moving.formatted} ${inSign(moving.sign, locale)}) forme un aspect avec ${bodyInline(link.b, locale)} de votre thème (${natalP.formatted} ${inSign(natalP.sign, locale)}), en ${houseInline(natalP.house, locale)} (${houseArea(natalP.house, locale)}).`
        : `Transiting ${bodyLabel(link.a, locale)} (${moving.formatted} ${signName(moving.sign, locale)}) is aspecting your natal ${bodyLabel(link.b, locale)} (${natalP.formatted} ${signName(natalP.sign, locale)}), which sits in your ${houseInline(natalP.house, locale)} (${houseArea(natalP.house, locale)}).`,
    );
  }
  if (theme) inChart.push(theme);
  inChart.push(
    fr
      ? `Orbe ${orb}${app ? `, ${app}` : ""} : ${link.applying ? "le contact se rapproche encore de l’exactitude" : link.applying === false ? "le point exact est passé, l’effet diminue" : "le contact est actif"}.`
      : `Orb ${orb}${app ? `, ${app}` : ""}: ${link.applying ? "the contact is still getting closer to exact" : link.applying === false ? "the exact point has passed and the effect is fading" : "the contact is active"}.`,
  );
  const pace = pickBi(TRANSIT_PACE[link.a], locale);
  if (pace) inChart.push(pace);
  const note = aspectIs(link.type, locale);
  return {
    id: `taspect:${link.id}`,
    kind: "aspect",
    title: fr ? `Transit · ${phrase}` : `Transit · ${phrase}`,
    kicker: fr
      ? `${link.level === "major" ? "Majeur" : "Mineur"} · orbe ${orb}${app ? ` · ${app}` : ""}`
      : `${link.level === "major" ? "Major" : "Minor"} · orb ${orb}${app ? ` · ${app}` : ""}`,
    paragraphs: [note, lead, ...inChart],
    note,
    lead,
    facts: [{ label: fr ? "Orbe" : "Orb", value: `${orb}${app ? ` · ${app}` : ""}` }],
    sections: [{ id: "chart", title: fr ? "Dans votre thème" : "In your chart", paragraphs: inChart }],
    links: {
      title: fr ? "Les deux points" : "The two points",
      rows: [
        { ref: `transit:${link.a}`, label: fr ? `${bodyLabel(link.a, locale)} en transit` : `Transiting ${bodyLabel(link.a, locale)}` },
        { ref: natalRef(link.b), label: fr ? `${bodyLabel(link.b, locale)} ${bodyAgree(link.b, "natal", "natale")}` : `Natal ${bodyLabel(link.b, locale)}` },
      ],
    },
    about: {
      title: fr ? "À propos des transits" : "About transits",
      paragraphs: [aspectInPractice(link.type, locale), pickBi(TRANSIT_ABOUT, locale), pickBi(ORB_ABOUT, locale)],
    },
  };
}

export function buildTransitDossier(natal: NatalChart, sky: TransitSky, locale: Locale): LocalDossier {
  const byId: Record<string, ElementReading> = {};
  const order: string[] = [];
  const add = (r: ElementReading) => {
    byId[r.id] = r;
    order.push(r.id);
  };
  for (const p of sky.planets) add(transitReading(p, natal, sky.aspects, locale));
  for (const a of sky.aspects) add(transitAspectReading(a, natal, sky, locale));
  return { byId, order };
}
