import { HOUSE_SYSTEM_LABEL, decanOf } from "./constants";
import { houseArea } from "./plain";
import type { NatalChart } from "./types";
import type { Locale } from "@/lib/i18n/locale";
import {
  aspectLinkPhrase,
  bodyLabel,
  elementName,
  faceLabelLocale,
  modalityName,
  planetName,
  signName,
} from "@/lib/i18n/astro";
import { translate } from "@/lib/i18n/messages";

/**
 * The chart as an AI reads it: positions, houses, patterns and aspects. It
 * says nothing of who or where: the name, the birth date and time, the place
 * and its coordinates stay on the device.
 */
export function dumpChartForPrompt(
  chart: NatalChart,
  locale: Locale = "en",
  compact = false,
): string {
  const { meta, angles, planets, houses, aspects, patterns } = chart;
  const fr = locale === "fr";
  const systemName = translate(locale, HOUSE_SYSTEM_LABEL[meta.houseSystem] ?? "housePlacidus");
  const lines: string[] = [];
  lines.push(
    fr
      ? `Thème natal — zodiaque tropical, maisons ${systemName}, Swiss Ephemeris (nœud Nord réel, Lilith réelle)`
      : `Natal chart — tropical zodiac, ${systemName} houses, Swiss Ephemeris (true node, true Lilith)`,
  );
  // Positions only: no name, birth date, time or place goes to an AI.
  lines.push("");
  if (!compact) {
    lines.push(fr ? "LEXIQUE (pour l’écriture)" : "GLOSSARY (for the writing)");
    if (fr) {
      lines.push("Soleil = le soi, la fierté, l’intrigue d’une vie — pas l’humeur (Lune) ni la première impression (Ascendant).");
      lines.push("Lune = climat intérieur, besoin, mémoire, ce qui rassure le corps.");
      lines.push("Mercure = penser et parler. Vénus = aimer, valoriser, faire la paix. Mars = désirer, se fâcher, agir.");
      lines.push("Jupiter = grandir et trop dire oui. Saturne = limite, temps, autorité gagnée.");
      lines.push("Uranus = rupture, liberté. Neptune = aspiration, brouillard. Pluton = pouvoir, perte, retour.");
      lines.push("Maison = une pièce de la vie (1 corps, 4 maison, 7 l’autre, 10 vocation…). Signe = la manière. Aspect = la conversation entre deux fonctions.");
      lines.push("Conjonction 0° même pièce. Opposition 180° face à face. Carré 90° même rythme, buts différents. Trigone 120° même élément, facilité. Sextile 60° occasion si on la saisit.");
      lines.push("Maître du thème = planète qui gouverne le signe de l’Ascendant. Décan = face de 10° dans le signe. Rétrograde = la fonction se travaille d’abord à l’intérieur.");
    } else {
      lines.push("Sun = core self, pride, the plot of a life — not mood (Moon) and not first impression (Ascendant).");
      lines.push("Moon = inner weather, need, memory, what makes the body feel safe.");
      lines.push("Mercury = how you think and speak. Venus = what you love, value, and make peace with. Mars = desire, anger, how you go after a want.");
      lines.push("Jupiter = where you grow and overdo. Saturn = limit, time, earned authority.");
      lines.push("Uranus = rupture, freedom. Neptune = longing, fog. Pluto = power, loss, return.");
      lines.push("House = a room of a life (1 body, 4 home, 7 the other, 10 vocation…). Sign = the manner. Aspect = the conversation between two functions.");
      lines.push("Conjunction 0° same room. Opposition 180° across the table. Square 90° same pace, different aims. Trine 120° same element, ease. Sextile 60° opportunity if taken.");
      lines.push("Chart ruler = planet ruling the Ascendant sign. Decan = 10° face inside the sign. Retrograde = the function is processed inwardly first.");
    }
    lines.push("");
  }
  lines.push("ANGLES");
  lines.push(
    `ASC ${angles.ascendant.formatted} ${signName(angles.ascendant.sign, locale)} (${fr ? "maître du thème" : "chart ruler"}: ${planetName(patterns.chartRuler, locale)})`,
  );
  lines.push(`MC  ${angles.midheaven.formatted} ${signName(angles.midheaven.sign, locale)}`);
  lines.push(`DSC ${angles.descendant.formatted} ${signName(angles.descendant.sign, locale)}`);
  lines.push(`IC  ${angles.ic.formatted} ${signName(angles.ic.sign, locale)}`);
  lines.push("");
  lines.push(fr ? "PLANÈTES ET POINTS" : "PLANETS & POINTS");
  const planetRows = compact
    ? planets.filter((p) =>
        ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode", "lilith"].includes(
          p.id,
        ),
      )
    : planets;
  for (const p of planetRows) {
    const rx = p.retrograde ? " Rx" : "";
    const decan = decanOf(p.ecliptic);
    const life = houseArea(p.house, fr ? "fr" : "en");
    lines.push(
      `${bodyLabel(p.id, locale)}${rx} ${p.formatted} ${signName(p.sign, locale)} · ${fr ? "maison" : "house"} ${p.house} (${life}) · ${faceLabelLocale(decan.face, locale)} ${fr ? "décan" : "decan"} ${planetName(decan.ruler, locale)}`,
    );
  }
  lines.push("");
  lines.push(fr ? "CUSPIDES" : "HOUSE CUSPS");
  for (const h of houses) {
    const tenants = planetRows.filter((pl) => pl.house === h.id).map((pl) => bodyLabel(pl.id, locale));
    lines.push(
      `${fr ? "M" : "H"}${h.id} ${h.formatted} ${signName(h.sign, locale)}${tenants.length ? ` — ${tenants.join(", ")}` : ""}`,
    );
  }
  if (patterns.intercepted.length) {
    lines.push(
      `${fr ? "Signes interceptés" : "Intercepted signs"}: ${patterns.intercepted.map((s) => signName(s, locale)).join(", ")}`,
    );
  }
  if (patterns.stelliums.length) {
    lines.push(
      `Stelliums: ${patterns.stelliums
        .map((s) => {
          const place = s.place.replace(/^House\s+/i, fr ? "Maison " : "House ");
          return `${place} (${s.members.map((m) => bodyLabel(m, locale)).join(", ")})`;
        })
        .join("; ")}`,
    );
  }
  lines.push(
    fr
      ? `Éléments (10 cœur) : ${elementName("fire", locale)} ${patterns.elementCounts.fire}, ${elementName("earth", locale)} ${patterns.elementCounts.earth}, ${elementName("air", locale)} ${patterns.elementCounts.air}, ${elementName("water", locale)} ${patterns.elementCounts.water}`
      : `Elements (core 10): fire ${patterns.elementCounts.fire}, earth ${patterns.elementCounts.earth}, air ${patterns.elementCounts.air}, water ${patterns.elementCounts.water}`,
  );
  lines.push(
    fr
      ? `Modalités : ${modalityName("cardinal", locale)} ${patterns.modalityCounts.cardinal}, ${modalityName("fixed", locale)} ${patterns.modalityCounts.fixed}, ${modalityName("mutable", locale)} ${patterns.modalityCounts.mutable}`
      : `Modalities: cardinal ${patterns.modalityCounts.cardinal}, fixed ${patterns.modalityCounts.fixed}, mutable ${patterns.modalityCounts.mutable}`,
  );
  if (patterns.retrogrades.length) {
    lines.push(
      `${fr ? "Rétrogrades" : "Retrogrades"}: ${patterns.retrogrades.map((id) => bodyLabel(id, locale)).join(", ")}`,
    );
  }
  lines.push("");
  lines.push(fr ? "ASPECTS MAJEURS" : "MAJOR ASPECTS");
  const majors = aspects
    .filter((a) => a.level === "major")
    .sort((a, b) => a.orb - b.orb);
  const listed = majors.slice(0, compact ? 14 : 22);
  for (const a of listed) {
    lines.push(
      `${aspectLinkPhrase(a.a, a.type, a.b, locale)} · ${fr ? "orbe" : "orb"} ${fr ? a.orb.toFixed(2).replace(".", ",") : a.orb.toFixed(2)}°${a.applying === true ? (fr ? " applicatif" : " applying") : a.applying === false ? (fr ? " séparatif" : " separating") : ""}`,
    );
  }
  return lines.join("\n");
}
