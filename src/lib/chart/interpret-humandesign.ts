/**
 * Human Design readings: type, strategy, authority, profile, definition,
 * centres, channels and gates. Wording comes from src/lib/content/hd.ts and
 * src/lib/i18n/hd-prose.ts.
 */
import type { ElementReading } from "./types";
import type { AppLocale } from "@/lib/i18n/messages";
import {
  bodiesOnGate,
  graphForView,
  HD_BODY_LABEL,
  HD_CENTER_IDS,
  HD_GATE_CENTER,
  HD_CHANNELS,
  type HdCenterId,
  type HdView,
  type HumanDesignChart,
} from "./human-design";
import { hdHelloCells } from "@/lib/i18n/hd-hello";
import {
  hdAuthorityLabel,
  hdCenterLabel,
  hdCenterState,
  hdChannelCentersLine,
  hdDefinitionLabel,
  hdGateTitle,
  hdLayerLabel,
  hdStrategyLabel,
  hdTypeLabel,
} from "@/lib/i18n/hd-ui";
import { hdAuthorityProse, hdCenterProse, hdStrategyProse, hdTypeProse } from "@/lib/i18n/hd-prose";
import { pickBi } from "@/lib/content/types";
import {
  HD_ABOUT,
  HD_CHANNEL_TEXT,
  HD_DEFINITION_TEXT,
  HD_GATE_TEXT,
  HD_LINE_TEXT,
  HD_PROFILE_TEXT,
} from "@/lib/content/hd";

function gateLabel(locale: AppLocale, n: number) {
  const name = pickBi(HD_GATE_TEXT[n]?.name, locale);
  return name ? `${hdGateTitle(locale, n)} · ${name}` : hdGateTitle(locale, n);
}

function channelLabel(locale: AppLocale, id: string) {
  const name = pickBi(HD_CHANNEL_TEXT[id]?.name, locale);
  return name ? `${id} · ${name}` : id;
}

function lineName(locale: AppLocale, line: number) {
  return pickBi(HD_LINE_TEXT[line as 1 | 2 | 3 | 4 | 5 | 6]?.name, locale);
}

export function hdReading(
  chart: HumanDesignChart,
  pickId: string | null,
  locale: AppLocale,
  view: HdView = "both",
): ElementReading | null {
  if (!pickId) return null;
  const hello = hdHelloCells(locale);
  const fr = locale === "fr";
  const inDesign = fr ? "Dans votre carte" : "In your design";
  const aboutTitle = fr ? "À propos du Human Design" : "About Human Design";

  if (pickId === "hello:type") {
    const cell = hello.find((c) => c.id === "type");
    const profile = HD_PROFILE_TEXT[chart.profile];
    return {
      id: pickId,
      kind: "house",
      title: hdTypeLabel(locale, chart.type),
      kicker: cell?.sentence ?? "",
      note: cell?.sentence,
      lead: hdTypeProse(locale, chart.type),
      paragraphs: [hdTypeProse(locale, chart.type), pickBi(profile?.what, locale), pickBi(HD_DEFINITION_TEXT[chart.definition], locale)].filter(Boolean),
      facts: [
        { label: fr ? "Profil" : "Profile", value: chart.profile, ref: "hello:profile" },
        { label: fr ? "Définition" : "Definition", value: hdDefinitionLabel(locale, chart.definition), ref: "hello:definition" },
        { label: fr ? "Stratégie" : "Strategy", value: hdStrategyLabel(locale, chart.strategy), ref: "hello:strategy" },
        { label: fr ? "Autorité" : "Authority", value: hdAuthorityLabel(locale, chart.authority), ref: "hello:authority" },
      ],
      sections: [
        {
          id: "chart",
          title: inDesign,
          paragraphs: [hdStrategyProse(locale, chart.strategy), hdAuthorityProse(locale, chart.authority)],
        },
      ],
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale), pickBi(HD_ABOUT.personalityDesign, locale)] },
    };
  }
  if (pickId === "hello:strategy") {
    const cell = hello.find((c) => c.id === "strategy");
    return {
      id: pickId,
      kind: "house",
      title: hdStrategyLabel(locale, chart.strategy),
      kicker: cell?.sentence ?? "",
      note: cell?.sentence,
      lead: hdStrategyProse(locale, chart.strategy),
      paragraphs: [hdStrategyProse(locale, chart.strategy), hdTypeProse(locale, chart.type)],
      facts: [{ label: fr ? "Type" : "Type", value: hdTypeLabel(locale, chart.type), ref: "hello:type" }],
      sections: [{ id: "chart", title: inDesign, paragraphs: [hdTypeProse(locale, chart.type)] }],
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale)] },
    };
  }
  if (pickId === "hello:authority") {
    const cell = hello.find((c) => c.id === "authority");
    return {
      id: pickId,
      kind: "house",
      title: hdAuthorityLabel(locale, chart.authority),
      kicker: cell?.sentence ?? "",
      note: cell?.sentence,
      lead: hdAuthorityProse(locale, chart.authority),
      paragraphs: [hdAuthorityProse(locale, chart.authority)],
      facts: [
        { label: fr ? "Type" : "Type", value: hdTypeLabel(locale, chart.type), ref: "hello:type" },
        { label: fr ? "Stratégie" : "Strategy", value: hdStrategyLabel(locale, chart.strategy), ref: "hello:strategy" },
      ],
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale)] },
    };
  }
  if (pickId === "hello:profile") {
    const p = HD_PROFILE_TEXT[chart.profile];
    const [a, b] = chart.profile.split("/").map(Number);
    const lines = [a, b].filter(Boolean).map((n, i) => ({
      ref: "",
      label: `${fr ? "Ligne" : "Line"} ${n} · ${lineName(locale, n)}`,
      detail: i === 0 ? (fr ? "consciente" : "conscious") : fr ? "inconsciente" : "unconscious",
      text: pickBi(HD_LINE_TEXT[n as 1 | 2 | 3 | 4 | 5 | 6]?.what, locale),
    }));
    return {
      id: pickId,
      kind: "house",
      title: `${fr ? "Profil" : "Profile"} ${chart.profile}${p ? ` · ${pickBi(p.name, locale)}` : ""}`,
      kicker: "",
      mark: chart.profile,
      note: pickBi(HD_ABOUT.profile, locale),
      lead: pickBi(p?.what, locale),
      paragraphs: [pickBi(p?.what, locale), ...lines.map((l) => l.text)].filter(Boolean),
      links: { title: fr ? "Les deux lignes" : "The two lines", rows: lines },
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale)] },
    };
  }
  if (pickId === "hello:definition") {
    return {
      id: pickId,
      kind: "house",
      title: `${fr ? "Définition" : "Definition"} · ${hdDefinitionLabel(locale, chart.definition)}`,
      kicker: "",
      note: pickBi(HD_ABOUT.definition, locale),
      lead: pickBi(HD_DEFINITION_TEXT[chart.definition], locale),
      paragraphs: [pickBi(HD_DEFINITION_TEXT[chart.definition], locale)],
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale)] },
    };
  }

  if (pickId.startsWith("channel:")) {
    const id = pickId.slice("channel:".length);
    const ch = HD_CHANNELS.find((row) => row.id === id);
    if (!ch) return null;
    const text = HD_CHANNEL_TEXT[id];
    const graph = graphForView(chart, view);
    const live = graph.channels.find((row) => row.id === id);
    const aBodies = bodiesOnGate(chart, ch.gates[0], view);
    const bBodies = bodiesOnGate(chart, ch.gates[1], view);
    const tone = !live
      ? fr
        ? "Non défini"
        : "Not defined"
      : live.mixed
        ? `${hdLayerLabel(locale, "personality")} + ${hdLayerLabel(locale, "design")}`
        : live.personality
          ? hdLayerLabel(locale, "personality")
          : hdLayerLabel(locale, "design");
    const state = live
      ? fr
        ? `Ce canal est défini dans votre carte : ses deux portes sont activées, donc ${hdCenterLabel(locale, ch.centers[0])} et ${hdCenterLabel(locale, ch.centers[1])} sont reliés en permanence. C’est un trait constant, présent quelle que soit la personne avec qui vous êtes.`
        : `This channel is defined in your chart: both gates are activated, so ${hdCenterLabel(locale, ch.centers[0])} and ${hdCenterLabel(locale, ch.centers[1])} are permanently linked. It is a consistent trait, present whoever you are with.`
      : fr
        ? `Ce canal n’est pas défini dans cette vue${aBodies.length || bBodies.length ? " : une seule de ses portes est activée, et l’autre moitié peut être apportée par une autre personne ou un transit" : ""}.`
        : `This channel is not defined in this view${aBodies.length || bBodies.length ? ": only one of its gates is activated, and the other half can be supplied by another person or a transit" : ""}.`;
    const act = (g: number, rows: typeof aBodies) =>
      rows.map((row) => `${hdLayerLabel(locale, row.layer)} ${HD_BODY_LABEL[row.body]} ${g}.${row.line}`).join(", ");
    return {
      id: pickId,
      kind: "house",
      title: channelLabel(locale, id),
      kicker: hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]),
      note: pickBi(HD_ABOUT.channel, locale),
      lead: pickBi(text?.what, locale),
      paragraphs: [pickBi(text?.what, locale), state].filter(Boolean),
      facts: [{ label: fr ? "Couche" : "Layer", value: tone }],
      sections: [{ id: "chart", title: inDesign, paragraphs: [state] }],
      links: {
        title: fr ? "Portes et centres" : "Gates and centres",
        rows: [
          ...ch.gates.map((g, i) => ({
            ref: `gate:${g}`,
            label: gateLabel(locale, g),
            detail: act(g, i === 0 ? aBodies : bBodies) || undefined,
          })),
          ...ch.centers.map((c) => ({ ref: `center:${c}`, label: hdCenterLabel(locale, c) })),
        ],
      },
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale)] },
    };
  }

  if (pickId.startsWith("gate:")) {
    const n = Number(pickId.slice(5));
    if (!Number.isInteger(n) || n < 1 || n > 64) return null;
    const text = HD_GATE_TEXT[n];
    const rows = bodiesOnGate(chart, n, view);
    const centerId = HD_GATE_CENTER[n];
    const graph = graphForView(chart, view);
    const channels = graph.channels.filter((ch) => ch.gates.includes(n));
    const state = rows.length
      ? channels.length
        ? fr
          ? "Cette porte est activée et fait partie d’un canal défini : son thème s’exprime de façon constante."
          : "This gate is activated and part of a defined channel: its theme is expressed consistently."
        : fr
          ? "Cette porte est activée, sans canal complet : son thème est présent chez vous, et se renforce quand quelqu’un active la porte opposée."
          : "This gate is activated but not part of a complete channel: its theme is present in you, and grows stronger when someone else activates the opposite gate."
      : fr
        ? "Cette porte n’est pas activée dans votre carte ; vous pouvez en vivre le thème à travers d’autres personnes ou des transits."
        : "This gate is not activated in your chart; you can experience its theme through other people or transits.";
    return {
      id: pickId,
      kind: "house",
      title: gateLabel(locale, n),
      kicker: centerId ? hdCenterLabel(locale, centerId) : "",
      mark: String(n),
      note: pickBi(HD_ABOUT.gate, locale),
      lead: pickBi(text?.what, locale),
      paragraphs: [pickBi(text?.what, locale), state, ...rows.map((row) => `${hdLayerLabel(locale, row.layer)} ${HD_BODY_LABEL[row.body]}, ${fr ? "ligne" : "line"} ${row.line}.`)].filter(Boolean),
      facts: [
        { label: fr ? "État" : "State", value: rows.length ? (fr ? "Activée" : "Activated") : fr ? "Non activée" : "Not activated" },
        ...(centerId ? [{ label: fr ? "Centre" : "Centre", value: hdCenterLabel(locale, centerId), ref: `center:${centerId}` }] : []),
      ],
      sections: [{ id: "chart", title: inDesign, paragraphs: [state] }],
      links:
        rows.length || channels.length
          ? {
              title: fr ? "Activations" : "Activations",
              rows: [
                ...rows.map((row) => ({
                  ref: "",
                  label: `${hdLayerLabel(locale, row.layer)} ${HD_BODY_LABEL[row.body]}`,
                  detail: `${n}.${row.line} · ${lineName(locale, row.line)}`,
                })),
                ...channels.map((ch) => ({
                  ref: `channel:${ch.id}`,
                  label: channelLabel(locale, ch.id),
                  detail: hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]),
                })),
              ],
            }
          : undefined,
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale)] },
    };
  }

  if (pickId.startsWith("center:")) {
    const id = pickId.slice(7) as HdCenterId;
    if (!HD_CENTER_IDS.includes(id)) return null;
    const graph = graphForView(chart, view);
    const defined = graph.centers.includes(id);
    const channels = graph.channels.filter((ch) => ch.centers.includes(id));
    const prose = hdCenterProse(locale, id, defined);
    return {
      id: pickId,
      kind: "house",
      title: hdCenterLabel(locale, id),
      kicker: hdCenterState(locale, defined),
      note: prose.role,
      lead: prose.state,
      paragraphs: [prose.role, prose.state],
      facts: [{ label: fr ? "État" : "State", value: hdCenterState(locale, defined) }],
      links: channels.length
        ? {
            title: fr ? "Canaux" : "Channels",
            rows: channels.map((ch) => ({
              ref: `channel:${ch.id}`,
              label: channelLabel(locale, ch.id),
              detail: hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]),
            })),
          }
        : undefined,
      about: { title: aboutTitle, paragraphs: [pickBi(HD_ABOUT.system, locale)] },
    };
  }

  return null;
}
