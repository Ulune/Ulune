/**
 * Human Design readings: type, strategy, authority, profile, definition, the
 * cross, centres, channels, gates and the rows of the two columns, plus the
 * first read shown before anything is chosen. Each reading starts with this
 * chart; what the element is in general opens its "About". Wording comes
 * from src/lib/content/hd.ts, src/lib/content/hd-first.ts and
 * src/lib/i18n/hd-prose.ts.
 */
import type { ElementReading, NatalChart, ReadingLink } from "./types";
import { bodyBare, signName } from "@/lib/i18n/astro";
import type { AppLocale } from "@/lib/i18n/messages";
import {
  bodiesOnGate,
  graphForView,
  HD_CENTER_IDS,
  HD_GATE_CENTER,
  HD_CHANNELS,
  type HdActivation,
  type HdCenterId,
  type HdView,
  type HumanDesignChart,
} from "./human-design";
import { hdCrossGates, hdCrossOf } from "./hd-cross";
import { hdCrossName } from "./hd-cross-names";
import { hdActId, hdActivationOf, parseHdActId } from "./hd-rows";
import { hdArrowsOf } from "./hd-variable";
import { hdHelloCells } from "@/lib/i18n/hd-hello";
import {
  hdAngleLabel,
  hdArrowLabel,
  hdAuthorityLabel,
  hdColorLabel,
  hdUnknownText,
  hdCenterLabel,
  hdCenterState,
  hdCentreStateWord,
  hdChannelCentersLine,
  hdDefinitionLabel,
  hdFactLabel,
  hdGateTitle,
  hdGraphText,
  hdLayerLabel,
  hdStrategyLabel,
  hdTypeLabel,
  hdWhoLabel,
} from "@/lib/i18n/hd-ui";
import { hdAuthorityProse, hdCenterProse, hdStrategyProse, hdTypeProse } from "@/lib/i18n/hd-prose";
import { pickBi, type Bi } from "@/lib/content/types";
import {
  HD_ABOUT,
  HD_CHANNEL_TEXT,
  HD_DEFINITION_TEXT,
  HD_GATE_TEXT,
  HD_LINE_TEXT,
  HD_PROFILE_TEXT,
} from "@/lib/content/hd";
import {
  HD_AUTHORITY_STEP,
  HD_BODY_TEXT,
  HD_CROSS_TEXT,
  HD_DEFINITION_STEP,
  HD_IN_CHART,
  HD_NEXT,
  HD_PROFILE_STEP,
  HD_SIGNPOSTS,
  HD_SIGNPOSTS_LINE,
  HD_STRATEGY_STEP,
  HD_TYPE_STEP,
  HD_UNKNOWN_TEXT,
  HD_VARIABLE_TEXT,
} from "@/lib/content/hd-first";

function fill(text: string, vars: Record<string, string | number>): string {
  let s = text;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

function fillBi(b: Bi, locale: AppLocale, vars: Record<string, string | number>): string {
  return fill(pickBi(b, locale), vars);
}

function gateLabel(locale: AppLocale, n: number) {
  const name = pickBi(HD_GATE_TEXT[n]?.name, locale);
  return name ? `${hdGateTitle(locale, n)} · ${name}` : hdGateTitle(locale, n);
}

function channelLabel(locale: AppLocale, id: string) {
  const name = pickBi(HD_CHANNEL_TEXT[id]?.name, locale);
  return name ? `${id} · ${name}` : id;
}

/** A gate's name ("Power"), or "" if it has none. */
export function hdGateName(locale: AppLocale, n: number): string {
  return pickBi(HD_GATE_TEXT[n]?.name, locale);
}

/** A channel's name ("Charisma"), or "" if it has none. */
export function hdChannelName(locale: AppLocale, id: string): string {
  return pickBi(HD_CHANNEL_TEXT[id]?.name, locale);
}

function lineName(locale: AppLocale, line: number) {
  return pickBi(HD_LINE_TEXT[line as 1 | 2 | 3 | 4 | 5 | 6]?.name, locale);
}

function lineText(locale: AppLocale, line: number) {
  return pickBi(HD_LINE_TEXT[line as 1 | 2 | 3 | 4 | 5 | 6]?.what, locale);
}

/** "a", "a and b", "a, b and c". */
function joinList(items: string[], locale: AppLocale): string {
  const and = pickBi(HD_IN_CHART.and, locale);
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}${and}${items[items.length - 1]}`;
}

/** "Personality Venus, line 2 (Hermit)". */
function whoOnLine(locale: AppLocale, row: HdActivation): string {
  return `${hdWhoLabel(locale, row)}, ${hdGraphText(locale, "lineWord")} ${row.line} (${lineName(locale, row.line)})`;
}

/** Every channel through a gate, the defined ones first, each with its state in this view. */
function channelsThrough(chart: HumanDesignChart, n: number, view: HdView, locale: AppLocale): ReadingLink[] {
  const graph = graphForView(chart, view);
  const rows = HD_CHANNELS.filter((ch) => ch.gates.includes(n)).map((ch) => {
    const on = graph.channels.some((c) => c.id === ch.id);
    const other = ch.gates[0] === n ? ch.gates[1] : ch.gates[0];
    const otherOn = graph.gates.has(other);
    const state = on
      ? hdGraphText(locale, "channelDefined")
      : graph.gates.has(n) || otherOn
        ? hdGraphText(locale, "channelHalfShort")
        : hdGraphText(locale, "channelOpen");
    return {
      on,
      link: {
        ref: `channel:${ch.id}`,
        label: channelLabel(locale, ch.id),
        detail: `${hdChannelCentersLine(locale, ch.centers[0], ch.centers[1])} · ${state}`,
      },
    };
  });
  return rows.sort((a, b) => Number(b.on) - Number(a.on)).map((r) => r.link);
}

/** Without a birth time: the section that says this could differ at another hour. */
function unknownSection(locale: AppLocale, kind: "row" | "key" | "channel") {
  return { id: "unknown", title: hdUnknownText(locale, "title"), paragraphs: [pickBi(HD_UNKNOWN_TEXT[kind], locale)] };
}

/** The five steps shown before anything is chosen, with what to look at next. */
export function hdFirstRead(chart: HumanDesignChart, locale: AppLocale) {
  const [a, b] = chart.profile.split("/").map(Number);
  const signs = HD_SIGNPOSTS[chart.type];
  return {
    profileName: pickBi(HD_PROFILE_TEXT[chart.profile]?.name, locale),
    steps: [
      {
        id: "type" as const,
        text: pickBi(HD_TYPE_STEP[chart.type], locale),
        extra: signs
          ? fillBi(HD_SIGNPOSTS_LINE, locale, { notSelf: pickBi(signs.notSelf, locale), signature: pickBi(signs.signature, locale) })
          : undefined,
      },
      { id: "strategy" as const, text: pickBi(HD_STRATEGY_STEP[chart.strategy], locale) },
      { id: "authority" as const, text: pickBi(HD_AUTHORITY_STEP[chart.authority], locale) },
      {
        id: "profile" as const,
        text: a && b ? fillBi(HD_PROFILE_STEP, locale, { a, b, aName: lineName(locale, a), bName: lineName(locale, b) }) : "",
      },
      { id: "definition" as const, text: pickBi(HD_DEFINITION_STEP[chart.definition], locale) },
    ],
    next: pickBi(HD_NEXT, locale),
  };
}

export function hdReading(
  chart: HumanDesignChart,
  pickId: string | null,
  locale: AppLocale,
  view: HdView = "both",
  natal?: NatalChart | null,
): ElementReading | null {
  const reading = withAstrology(hdReadingOf(chart, pickId, locale, view), pickId, natal ?? null, locale);
  if (!reading || !chart.uncertain || !pickId) return reading;
  // Without a birth time, what could differ at another hour of that day says so first.
  const u = chart.uncertain;
  const key = pickId.startsWith("hello:") ? pickId.slice(6) : null;
  const gate = pickId.startsWith("gate:") ? Number(pickId.slice(5)) : null;
  let kind: "row" | "key" | "channel" | null = null;
  if (key && u.keys.includes(key)) kind = "key";
  else if (pickId.startsWith("channel:") && u.channels.includes(pickId.slice(8))) kind = "channel";
  else if (u.rows.includes(pickId)) kind = "row";
  else if (gate !== null && chart.activations.some((a) => a.gate === gate && u.rows.includes(hdActId(a.layer, a.body)))) kind = "row";
  if (!kind) return reading;
  const section = unknownSection(locale, kind);
  return { ...reading, sections: [section, ...(reading.sections ?? [])], paragraphs: [...reading.paragraphs, ...section.paragraphs] };
}

/**
 * A Personality activation is the birth chart's own planet (review 3 Oct,
 * R4): "Astrology · Sun 24°03′ Gemini · 10th house", opening the planet on
 * the chart.
 */
function withAstrology(reading: ElementReading | null, pickId: string | null, natal: NatalChart | null, locale: AppLocale): ElementReading | null {
  const act = parseHdActId(pickId);
  if (!reading || !act || act.layer !== "personality" || !natal) return reading;
  const p = natal.planets.find((x) => x.id === act.body);
  if (!p) return reading;
  const fr = locale === "fr";
  const value = fr
    ? `${bodyBare(p.id, locale)} ${p.formatted} ${signName(p.sign, locale)} · maison ${p.house}`
    : `${bodyBare(p.id, locale)} ${p.formatted} ${signName(p.sign, locale)} · house ${p.house}`;
  return { ...reading, facts: [...(reading.facts ?? []), { label: fr ? "Astrologie" : "Astrology", value, ref: `go:natal:planet:${p.id}` }] };
}

function hdReadingOf(
  chart: HumanDesignChart,
  pickId: string | null,
  locale: AppLocale,
  view: HdView,
): ElementReading | null {
  if (!pickId) return null;
  const hello = hdHelloCells(locale);
  const fr = locale === "fr";
  const inDesign = fr ? "Dans votre schéma" : "In your chart";
  const aboutTitle = fr ? "À propos du Human Design" : "About Human Design";
  // Each card's About by its subject (review 3 Oct, H5): the system's own words stay on the Type's.
  const aboutOf = (en: string, frTitle: string, paragraphs: string[]) => ({ title: fr ? frTitle : en, paragraphs });
  const cross = hdCrossOf(chart);
  const crossFact = cross
    ? [{ label: hdFactLabel(locale, "cross"), value: hdCrossGates(cross), ref: "hello:cross" }]
    : [];

  if (pickId === "hello:type") {
    const cell = hello.find((c) => c.id === "type");
    const profile = HD_PROFILE_TEXT[chart.profile];
    const signs = HD_SIGNPOSTS[chart.type];
    const signposts = signs
      ? fillBi(HD_SIGNPOSTS_LINE, locale, { notSelf: pickBi(signs.notSelf, locale), signature: pickBi(signs.signature, locale) })
      : "";
    return {
      id: pickId,
      kind: "house",
      title: hdTypeLabel(locale, chart.type),
      kicker: cell?.sentence ?? "",
      note: cell?.sentence,
      lead: hdTypeProse(locale, chart.type),
      paragraphs: [hdTypeProse(locale, chart.type), signposts, pickBi(profile?.what, locale), pickBi(HD_DEFINITION_TEXT[chart.definition], locale)].filter(Boolean),
      facts: [
        { label: hdFactLabel(locale, "profile"), value: chart.profile, ref: "hello:profile" },
        { label: hdFactLabel(locale, "definition"), value: hdDefinitionLabel(locale, chart.definition), ref: "hello:definition" },
        { label: hdFactLabel(locale, "strategy"), value: hdStrategyLabel(locale, chart.strategy), ref: "hello:strategy" },
        { label: hdFactLabel(locale, "authority"), value: hdAuthorityLabel(locale, chart.authority), ref: "hello:authority" },
        ...crossFact,
      ],
      sections: [
        // Under its own heading, without its "Signposts:" again.
        ...(signposts ? [{ id: "signposts", title: hdGraphText(locale, "signposts"), paragraphs: [signposts.replace(/^[^:]+?\s*:\s*/, "").replace(/^./, (c) => c.toUpperCase())] }] : []),
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
      paragraphs: [hdStrategyProse(locale, chart.strategy), hdAuthorityProse(locale, chart.authority)],
      facts: [
        { label: hdFactLabel(locale, "type"), value: hdTypeLabel(locale, chart.type), ref: "hello:type" },
        { label: hdFactLabel(locale, "authority"), value: hdAuthorityLabel(locale, chart.authority), ref: "hello:authority" },
      ],
      // Not the Type's paragraph again: how the strategy meets this chart's authority.
      sections: [{ id: "chart", title: inDesign, paragraphs: [hdAuthorityProse(locale, chart.authority)] }],
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
        { label: hdFactLabel(locale, "type"), value: hdTypeLabel(locale, chart.type), ref: "hello:type" },
        { label: hdFactLabel(locale, "strategy"), value: hdStrategyLabel(locale, chart.strategy), ref: "hello:strategy" },
      ],
    };
  }
  if (pickId === "hello:profile") {
    const p = HD_PROFILE_TEXT[chart.profile];
    const [a, b] = chart.profile.split("/").map(Number);
    const suns = [hdActivationOf(chart, "personality", "sun"), hdActivationOf(chart, "design", "sun")];
    const lines = [a, b].filter(Boolean).map((n, i) => ({
      ref: suns[i] ? hdActId(suns[i]!.layer, "sun") : "",
      label: `${hdGraphText(locale, "lineWordCap")} ${n} · ${lineName(locale, n)}`,
      detail: suns[i] ? `${hdWhoLabel(locale, suns[i]!)} ${suns[i]!.gate}.${suns[i]!.line}` : undefined,
      text: lineText(locale, n),
    }));
    return {
      id: pickId,
      kind: "house",
      title: `${hdFactLabel(locale, "profile")} ${chart.profile}${p ? ` · ${pickBi(p.name, locale)}` : ""}`,
      kicker: "",
      mark: chart.profile,
      note: pickBi(HD_ABOUT.profile, locale),
      lead: pickBi(p?.what, locale),
      paragraphs: [pickBi(p?.what, locale), ...lines.map((l) => l.text)].filter(Boolean),
      links: { title: fr ? "Les deux lignes" : "The two lines", rows: lines },
      about: aboutOf("About profiles", "À propos des profils", []),
    };
  }
  if (pickId === "hello:definition") {
    return {
      id: pickId,
      kind: "house",
      title: `${hdFactLabel(locale, "definition")} · ${hdDefinitionLabel(locale, chart.definition)}`,
      kicker: "",
      note: pickBi(HD_ABOUT.definition, locale),
      lead: pickBi(HD_DEFINITION_TEXT[chart.definition], locale),
      paragraphs: [pickBi(HD_DEFINITION_TEXT[chart.definition], locale)],
      about: aboutOf("About definition", "À propos de la définition", []),
    };
  }
  if (pickId === "hello:layers") {
    const suns = [hdActivationOf(chart, "personality", "sun"), hdActivationOf(chart, "design", "sun")].filter(
      (r): r is HdActivation => Boolean(r),
    );
    return {
      id: pickId,
      kind: "house",
      title: hdGraphText(locale, "layersTitle"),
      kicker: "",
      lead: pickBi(HD_ABOUT.personalityDesign, locale),
      paragraphs: [pickBi(HD_ABOUT.personalityDesign, locale)],
      facts: suns.map((r) => ({ label: hdWhoLabel(locale, r), value: `${r.gate}.${r.line}`, ref: hdActId(r.layer, r.body) })),
      about: aboutOf("About Personality and Design", "À propos de la Personnalité et du Design", []),
    };
  }
  if (pickId === "hello:cross") {
    if (!cross) return null;
    const angle = cross.angle ? hdAngleLabel(locale, cross.angle) : "";
    const four = [
      hdActivationOf(chart, "personality", "sun"),
      hdActivationOf(chart, "personality", "earth"),
      hdActivationOf(chart, "design", "sun"),
      hdActivationOf(chart, "design", "earth"),
    ].filter((r): r is HdActivation => Boolean(r));
    const lead = fillBi(HD_CROSS_TEXT.mine, locale, {
      gates: hdCrossGates(cross),
      ps: cross.personality[0],
      pe: cross.personality[1],
      ds: cross.design[0],
      de: cross.design[1],
    });
    return {
      id: pickId,
      kind: "house",
      // Its name (review 3 Oct, H3), the gates under it.
      title: hdCrossName(cross, locale) ?? hdGraphText(locale, "crossTitle"),
      kicker: `${hdGraphText(locale, "crossTitle")} · ${hdCrossGates(cross)}`,
      lead,
      paragraphs: [lead, cross.angle ? pickBi(HD_CROSS_TEXT.angle[cross.angle], locale) : ""].filter(Boolean),
      facts: [
        ...four.map((r) => ({ label: hdWhoLabel(locale, r), value: `${r.gate}.${r.line}`, ref: hdActId(r.layer, r.body) })),
        ...(angle ? [{ label: hdGraphText(locale, "angleWord"), value: angle }] : []),
        { label: hdFactLabel(locale, "profile"), value: chart.profile, ref: "hello:profile" },
      ],
      sections: cross.angle ? [{ id: "angle", title: angle, paragraphs: [pickBi(HD_CROSS_TEXT.angle[cross.angle], locale)] }] : undefined,
      links: {
        title: fr ? "Les quatre portes" : "The four gates",
        rows: four.map((r) => ({ ref: `gate:${r.gate}`, label: gateLabel(locale, r.gate), detail: hdWhoLabel(locale, r) })),
      },
      about: aboutOf("About the Incarnation Cross", "À propos de la Croix d’incarnation", [pickBi(HD_CROSS_TEXT.what, locale)]),
    };
  }

  const act = parseHdActId(pickId);
  if (act) {
    const row = hdActivationOf(chart, act.layer, act.body);
    if (!row) return null;
    const n = row.gate;
    const centerId = HD_GATE_CENTER[n];
    const who = hdWhoLabel(locale, row);
    const here = fillBi(HD_IN_CHART.rowHere, locale, { act: who, gate: n, line: row.line, lineName: lineName(locale, row.line) });
    const body = pickBi(HD_BODY_TEXT[row.body], locale);
    const gateText = pickBi(HD_GATE_TEXT[n]?.what, locale);
    const lead = [here, body].filter(Boolean).join(" ");
    // The Sun and North Node rows carry an arrow of Variable (with a birth time).
    const arrow = hdArrowsOf(chart).find((a) => a.layer === row.layer && a.body === row.body);
    const variable = arrow
      ? {
          id: "variable",
          title: `${hdArrowLabel(locale, arrow.id)} · ${hdColorLabel(locale, arrow.id, arrow.color)}`,
          paragraphs: [
            [
              fillBi(HD_VARIABLE_TEXT.arrow[arrow.id], locale, { name: hdColorLabel(locale, arrow.id, arrow.color), color: arrow.color }),
              fillBi(arrow.left ? HD_VARIABLE_TEXT.left : HD_VARIABLE_TEXT.right, locale, { tone: arrow.tone }),
              arrow.steady ? "" : pickBi(HD_VARIABLE_TEXT.unsteady, locale),
            ]
              .filter(Boolean)
              .join(" "),
            pickBi(HD_VARIABLE_TEXT.about, locale),
          ],
        }
      : null;
    return {
      id: pickId,
      kind: "planet",
      title: `${who} ${n}.${row.line}`,
      kicker: gateLabel(locale, n),
      lead,
      paragraphs: [lead, gateText, lineText(locale, row.line)].filter(Boolean),
      facts: [
        { label: hdGraphText(locale, "gateWord"), value: hdGateName(locale, n) ? `${n} · ${hdGateName(locale, n)}` : String(n), ref: `gate:${n}` },
        { label: hdGraphText(locale, "lineWordCap"), value: `${row.line} · ${lineName(locale, row.line)}` },
        ...(centerId ? [{ label: hdGraphText(locale, "centreWord"), value: hdCenterLabel(locale, centerId), ref: `center:${centerId}` }] : []),
      ],
      sections: [
        ...(gateText ? [{ id: "gate", title: gateLabel(locale, n), paragraphs: [gateText] }] : []),
        { id: "line", title: `${hdGraphText(locale, "lineWordCap")} ${row.line} · ${lineName(locale, row.line)}`, paragraphs: [lineText(locale, row.line)] },
        ...(variable ? [variable] : []),
      ],
      links: { title: hdGraphText(locale, "channelsWord"), rows: channelsThrough(chart, n, view, locale) },
      about: aboutOf("About Personality and Design", "À propos de la Personnalité et du Design", [pickBi(HD_ABOUT.personalityDesign, locale)]),
    };
  }

  if (pickId.startsWith("channel:")) {
    const id = pickId.slice("channel:".length);
    const ch = HD_CHANNELS.find((row) => row.id === id);
    if (!ch) return null;
    const text = HD_CHANNEL_TEXT[id];
    const graph = graphForView(chart, view);
    const live = graph.channels.find((row) => row.id === id);
    const [ga, gb] = ch.gates;
    const aBodies = bodiesOnGate(chart, ga, view);
    const bBodies = bodiesOnGate(chart, gb, view);
    const onGate = (g: number, rows: HdActivation[]) =>
      hdGraphText(locale, "onGate", { who: joinList(rows.map((r) => hdWhoLabel(locale, r)), locale), gate: g });
    const inChart = live
      ? fillBi(HD_IN_CHART.channelBoth, locale, { a: onGate(ga, aBodies), b: onGate(gb, bBodies) })
      : aBodies.length || bBodies.length
        ? fillBi(HD_IN_CHART.channelHalf, locale, {
            a: aBodies.length ? onGate(ga, aBodies) : onGate(gb, bBodies),
            open: aBodies.length ? gb : ga,
          })
        : pickBi(HD_IN_CHART.channelNone, locale);
    const tone = !live
      ? aBodies.length || bBodies.length
        ? hdGraphText(locale, "channelHalfShort")
        : hdGraphText(locale, "channelOpen")
      : live.mixed
        ? `${hdLayerLabel(locale, "personality")} + ${hdLayerLabel(locale, "design")}`
        : live.personality
          ? hdLayerLabel(locale, "personality")
          : hdLayerLabel(locale, "design");
    const state = live
      ? fr
        ? `Ce canal est défini dans votre schéma\u202f: ses deux portes sont activées, donc ${hdCenterLabel(locale, ch.centers[0])} et ${hdCenterLabel(locale, ch.centers[1])} sont reliés en permanence. C’est un trait constant, présent quelle que soit la personne avec qui vous êtes.`
        : `This channel is defined in your chart: both gates are activated, so ${hdCenterLabel(locale, ch.centers[0])} and ${hdCenterLabel(locale, ch.centers[1])} are permanently linked. It is a consistent trait, present whoever you are with.`
      : fr
        ? `Ce canal n’est pas défini dans cette vue${aBodies.length || bBodies.length ? "\u202f: une seule de ses portes est activée, et l’autre moitié peut être apportée par une autre personne ou un transit" : ""}.`
        : `This channel is not defined in this view${aBodies.length || bBodies.length ? ": only one of its gates is activated, and the other half can be supplied by another person or a transit" : ""}.`;
    const lead = [inChart, pickBi(text?.what, locale)].filter(Boolean).join(" ");
    return {
      id: pickId,
      kind: "house",
      title: channelLabel(locale, id),
      kicker: hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]),
      note: pickBi(HD_ABOUT.channel, locale),
      lead,
      paragraphs: [lead, state].filter(Boolean),
      facts: [{ label: fr ? "Couche" : "Layer", value: tone }],
      sections: [{ id: "chart", title: inDesign, paragraphs: [state] }],
      links: {
        title: fr ? "Portes et centres" : "Gates and centres",
        rows: [
          ...ch.gates.map((g, i) => {
            const rows = i === 0 ? aBodies : bBodies;
            return {
              ref: `gate:${g}`,
              label: gateLabel(locale, g),
              detail: rows.map((row) => `${hdWhoLabel(locale, row)} ${g}.${row.line}`).join(", ") || undefined,
            };
          }),
          ...ch.centers.map((c) => ({ ref: `center:${c}`, label: hdCenterLabel(locale, c) })),
        ],
      },
      about: aboutOf("About channels", "À propos des canaux", []),
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
    // The gate or gates across its channels (review 3 Oct, H5): 10, 20, 34 and 57 have two or three.
    const partners = HD_CHANNELS.filter((ch) => ch.gates.includes(n)).map((ch) => (ch.gates[0] === n ? ch.gates[1] : ch.gates[0]));
    const partnerWords =
      partners.length > 1
        ? fr
          ? `une porte partenaire (${partners.join(", ").replace(/, (\d+)$/, " ou $1")})`
          : `a partner gate (${partners.join(", ").replace(/, (\d+)$/, " or $1")})`
        : fr
          ? `la porte partenaire, la ${partners[0]}`
          : `the partner gate, ${partners[0]}`;
    const state = rows.length
      ? channels.length
        ? fr
          ? "Cette porte est activée et fait partie d’un canal défini\u202f: son thème s’exprime de façon constante."
          : "This gate is activated and part of a defined channel: its theme is expressed consistently."
        : fr
          ? `Cette porte est activée, sans canal complet\u202f: son thème est présent chez vous, et se renforce quand quelqu’un active ${partnerWords}.`
          : `This gate is activated but not part of a complete channel: its theme is present in you, and grows stronger when someone else activates ${partnerWords}.`
      : fr
        ? "Cette porte n’est pas activée dans votre schéma\u202f; vous pouvez en vivre le thème à travers d’autres personnes ou des transits."
        : "This gate is not activated in your chart; you can experience its theme through other people or transits.";
    const inChart = rows.length
      ? fillBi(HD_IN_CHART.gateBy, locale, { acts: joinList(rows.map((r) => whoOnLine(locale, r)), locale) })
      : pickBi(HD_IN_CHART.gateNone, locale);
    const lead = [inChart, pickBi(text?.what, locale)].filter(Boolean).join(" ");
    const linesSeen = [...new Set(rows.map((r) => r.line))];
    return {
      id: pickId,
      kind: "house",
      title: gateLabel(locale, n),
      kicker: centerId ? hdCenterLabel(locale, centerId) : "",
      mark: String(n),
      note: pickBi(HD_ABOUT.gate, locale),
      lead,
      paragraphs: [lead, state].filter(Boolean),
      facts: [
        ...(rows.length
          ? rows.map((r) => ({ label: hdWhoLabel(locale, r), value: `${n}.${r.line}`, ref: hdActId(r.layer, r.body) }))
          : [{ label: fr ? "État" : "State", value: fr ? "Non activée" : "Not activated" }]),
        ...(centerId ? [{ label: hdGraphText(locale, "centreWord"), value: hdCenterLabel(locale, centerId), ref: `center:${centerId}` }] : []),
      ],
      sections: [
        {
          id: "chart",
          title: inDesign,
          paragraphs: [
            state,
            ...linesSeen.map((line) => `${hdGraphText(locale, "lineWordCap")} ${line} · ${lineName(locale, line)}. ${lineText(locale, line)}`),
          ],
        },
      ],
      links: { title: hdGraphText(locale, "channelsWord"), rows: channelsThrough(chart, n, view, locale) },
      about: aboutOf("About gates", "À propos des portes", []),
    };
  }

  if (pickId.startsWith("center:")) {
    const id = pickId.slice(7) as HdCenterId;
    if (!HD_CENTER_IDS.includes(id)) return null;
    const graph = graphForView(chart, view);
    const defined = graph.centers.includes(id);
    const channels = graph.channels.filter((ch) => ch.centers.includes(id));
    const prose = hdCenterProse(locale, id, defined);
    const gates = Object.entries(HD_GATE_CENTER)
      .filter(([, c]) => c === id)
      .map(([g]) => Number(g));
    const active = gates.filter((g) => graph.gates.has(g));
    return {
      id: pickId,
      kind: "house",
      title: hdCenterLabel(locale, id),
      kicker: hdCentreStateWord(locale, defined, active.length),
      note: prose.role,
      lead: prose.state,
      paragraphs: [prose.state, prose.role, hdCenterState(locale, defined, active.length)],
      facts: [
        { label: fr ? "État" : "State", value: hdCentreStateWord(locale, defined, active.length) },
        { label: hdGraphText(locale, "gatesWord"), value: hdGraphText(locale, "gatesActive", { n: active.length, m: gates.length }) },
      ],
      links:
        channels.length || active.length
          ? {
              title: hdGraphText(locale, "channelsAndGates"),
              rows: [
                ...channels.map((ch) => ({
                  ref: `channel:${ch.id}`,
                  label: channelLabel(locale, ch.id),
                  detail: hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]),
                })),
                ...active.map((g) => ({
                  ref: `gate:${g}`,
                  label: gateLabel(locale, g),
                  detail: bodiesOnGate(chart, g, view)
                    .map((r) => `${hdWhoLabel(locale, r)} ${g}.${r.line}`)
                    .join(", "),
                })),
              ],
            }
          : undefined,
      about: aboutOf("About centres", "À propos des centres", []),
    };
  }

  return null;
}
