/**
 * Human Design's connection chart, its readings (share and compare plan,
 * feature 5a): every channel, gate and centre as it is between the two
 * people, the four kinds, the conditioning both ways, the open ground, the
 * pair's definition and bridges, each person's bodygraph as the pair reads
 * it and the summary; the first read's texts and the method notes. Each
 * reading starts with the two people; what an element is in general comes
 * after (the existing channel and gate texts) and in its "About". The
 * words are src/lib/content/hd-pair.ts's; this file only puts them
 * together. It ships in the Human Design reading pack (pack-hd.ts), one
 * language at a time.
 */
import type { ElementReading, ReadingLink, ReadingSection } from "./types";
import type { AppLocale } from "@/lib/i18n/messages";
import { HD_CENTER_IDS, HD_CHANNELS, HD_GATE_CENTER, type HdActivation, type HdCenterId, type HumanDesignChart } from "./human-design";
import {
  HD_PAIR_KINDS,
  HD_PAIR_PEOPLE,
  hdpKindRef,
  hdpPersonRef,
  pairCentre,
  pairChannel,
  parseHdpRef,
  type HdPair,
  type HdPairChannel,
  type HdPairContext,
  type HdPairKind,
  type HdPairPerson,
} from "./hd-pair";
import {
  hdActivationLabel,
  hdAuthorityFull,
  hdCenterLabel,
  hdCentreStateWord,
  hdChannelCentersLine,
  hdDefinitionLabel,
  hdFactLabel,
  hdGateTitle,
  hdGraphText,
  hdStrategyFull,
  hdTypeLabel,
} from "@/lib/i18n/hd-ui";
import { hdCenterProse } from "@/lib/i18n/hd-prose";
import { pickBi, type Bi } from "@/lib/content/types";
import { HD_CHANNEL_TEXT, HD_GATE_TEXT } from "@/lib/content/hd";
import {
  HDP_ABOUT,
  HDP_BRIDGE,
  HDP_CENTRE,
  HDP_CENTRE_BOTH,
  HDP_CENTRE_STATE,
  HDP_CENTRE_TOGETHER,
  HDP_CONDITION,
  HDP_CONDITIONING,
  HDP_DEFINITION_PHRASE,
  HDP_DEFINITION_TEXT,
  HDP_FIRST,
  HDP_GATE,
  HDP_KIND_TEXT,
  HDP_KINDS_ABOUT,
  HDP_METHOD,
  HDP_METHOD_TITLE,
  HDP_OPEN,
  HDP_OPEN_CENTRE,
  HDP_PERSON,
  HDP_THEME,
  HDP_UNFORMED,
  HDP_WORDS,
} from "@/lib/content/hd-pair";

export type HdPairNames = Record<HdPairPerson, string>;
export type { HdPairContext };

const OTHER: Record<HdPairPerson, HdPairPerson> = { a: "b", b: "a" };

function fill(text: string, vars: Record<string, string | number>): string {
  let s = text;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const say = (b: Bi, locale: AppLocale, vars: Record<string, string | number> = {}) => fill(pickBi(b, locale), vars);

/** ": ", or French's « : » with its narrow no-break space. */
const colon = (locale: AppLocale) => (locale === "fr" ? "\u202f: " : ": ");

/** French "de" before a name: "de Camille", "d’Anna" (a vowel or a mute h elides). */
export function deName(name: string, locale: AppLocale): string {
  if (locale !== "fr") return name;
  return /^(?:[aeiouhéèêëàâîïôûœæ]|y(?![aeiouéèêëàâîïôû]))/iu.test(name) ? `d’${name}` : `de ${name}`;
}

/** "a", "a and b", "a, b and c". */
function joinList(items: readonly string[], locale: AppLocale): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}${pickBi(HDP_WORDS.and, locale)}${items[items.length - 1]}`;
}

/** At most `max` items, then "and 3 more". */
function shortList(items: readonly string[], locale: AppLocale, max = 3): string {
  if (items.length <= max) return joinList(items, locale);
  return `${items.slice(0, max).join(", ")} ${say(HDP_WORDS.more, locale, { n: items.length - max })}`;
}

/** "gate 62", "gates 13 and 20"; « la porte 62 », « les portes 13 et 20 ». */
function gatesPhrase(gates: readonly number[], locale: AppLocale): string {
  const list = joinList(gates.map(String), locale);
  return say(gates.length === 1 ? HDP_WORDS.gateOne : HDP_WORDS.gateMany, locale, { list });
}

/** "1 channel", "11 channels", "no channel". */
function channelsPhrase(n: number, locale: AppLocale): string {
  if (n === 0) return pickBi(HDP_WORDS.channelNone, locale);
  return say(n === 1 ? HDP_WORDS.channelOne : HDP_WORDS.channelMany, locale, { n });
}

/** "6 electromagnetic, 2 of dominance, 3 of compromise": the kinds there are, in order. */
function kindsPhrase(pair: HdPair, locale: AppLocale): string {
  return HD_PAIR_KINDS.map((k) => {
    const n = pair.formed.filter((ch) => ch.kind === k).length;
    return n ? say(n === 1 ? HDP_WORDS.kindCount[k].one : HDP_WORDS.kindCount[k].many, locale, { n }) : "";
  })
    .filter(Boolean)
    .join(", ");
}

/** "20–57 · The Brainwave". */
function channelLabel(id: string, locale: AppLocale): string {
  const name = pickBi(HD_CHANNEL_TEXT[id]?.name, locale);
  return name ? `${id} · ${name}` : id;
}

/** "Gate 34 · Power". */
function gateLabel(n: number, locale: AppLocale): string {
  const name = pickBi(HD_GATE_TEXT[n]?.name, locale);
  return name ? `${hdGateTitle(locale, n)} · ${name}` : hdGateTitle(locale, n);
}

export function hdPairKindName(kind: HdPairKind, locale: AppLocale): string {
  return pickBi(HDP_KIND_TEXT[kind].name, locale);
}

/** The rows of one person's bodygraph on a gate: "Personality Venus 34.2". */
function actsOn(chart: HumanDesignChart, gate: number, locale: AppLocale): string[] {
  return chart.activations.filter((a: HdActivation) => a.gate === gate).map((a) => hdActivationLabel(locale, a));
}

/** What one person holds of a channel, as a table or a fact says it: "34–20, whole", "Gate 20", "—". */
export function holdText(ch: HdPairChannel, who: HdPairPerson, locale: AppLocale): string {
  const h = ch[who];
  if (h.whole) return `${ch.gates[0]}–${ch.gates[1]}, ${pickBi(HDP_WORDS.whole, locale)}`;
  return h.gates.length ? hdGateTitle(locale, h.gates[0]!) : "—";
}

/** The sentence that says what a formed channel is between the two. */
export function channelHere(ch: HdPairChannel, names: HdPairNames, locale: AppLocale): string {
  if (!ch.kind) return "";
  const k = HDP_KIND_TEXT[ch.kind];
  const [g1, g2] = ch.gates;
  if (ch.kind === "electromagnetic") return say(k.here, locale, { a: names.a, b: names.b, ga: ch.a.gates[0] ?? g1, gb: ch.b.gates[0] ?? g2 });
  if (ch.kind === "companionship") return say(k.here, locale, { g1, g2 });
  const lead = ch.lead ?? "a";
  const other = OTHER[lead];
  return say(k.here, locale, { lead: names[lead], other: names[other], deLead: deName(names[lead], locale), g1, g2, g: ch[other].gates[0] ?? "" });
}

/** A formed channel's short line for lists: who brings what ("TraceQA 61 · Sample B 24"). */
export function channelDetail(ch: HdPairChannel, names: HdPairNames): string {
  return HD_PAIR_PEOPLE.map((who) => `${names[who]} ${ch[who].whole ? `${ch.gates[0]}–${ch.gates[1]}` : ch[who].gates.length ? String(ch[who].gates[0]) : "—"}`).join(" · ");
}

/** The channels formed through a centre, as links. */
function channelsAt(pair: HdPair, centre: HdCenterId, names: HdPairNames, locale: AppLocale): ReadingLink[] {
  return pair.formed
    .filter((ch) => ch.centers.includes(centre))
    .map((ch) => ({ ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale), detail: `${hdPairKindName(ch.kind!, locale)} · ${channelDetail(ch, names)}` }));
}

const uncertainSection = (locale: AppLocale): ReadingSection => ({ id: "unknown", title: pickBi(HDP_WORDS.unknownTitle, locale), paragraphs: [pickBi(HDP_WORDS.uncertain, locale)] });

function channelReading(ctx: HdPairContext, id: string, locale: AppLocale): ElementReading | null {
  const ch = pairChannel(ctx.pair, id.slice("channel:".length));
  if (!ch) return null;
  const { names } = ctx;
  const what = pickBi(HD_CHANNEL_TEXT[ch.id]?.what, locale);
  const centres = hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]);
  const gateRows: ReadingLink[] = ch.gates.map((g) => ({
    ref: `gate:${g}`,
    label: gateLabel(g, locale),
    detail:
      HD_PAIR_PEOPLE.filter((who) => ctx.pair.gates[who].has(g))
        .map((who) => `${names[who]}${colon(locale)}${actsOn(ctx.charts[who], g, locale).join(", ")}`)
        .join(" · ") || undefined,
  }));
  const links = { title: pickBi(HDP_WORDS.whoBrings, locale), rows: [...gateRows, ...ch.centers.map((c) => ({ ref: `center:${c}`, label: hdCenterLabel(locale, c) }))] };
  const loose = ctx.uncertain.has(ch.id) ? [uncertainSection(locale)] : [];
  if (!ch.kind) {
    const [ga, gb] = ch.gates;
    const hasA = ch.a.gates;
    const hasB = ch.b.gates;
    let lead: string;
    if (!hasA.length && !hasB.length) lead = pickBi(HDP_UNFORMED.none, locale);
    else if (hasA.length && hasB.length) {
      const g = hasA[0]!;
      lead = say(HDP_UNFORMED.same, locale, { g, h: g === ga ? gb : ga });
    } else {
      const who: HdPairPerson = hasA.length ? "a" : "b";
      const g = ch[who].gates[0]!;
      lead = say(HDP_UNFORMED.one, locale, { who: names[who], g, h: g === ga ? gb : ga });
    }
    return {
      id,
      kind: "house",
      title: channelLabel(ch.id, locale),
      kicker: `${centres} · ${pickBi(HDP_WORDS.notFormed, locale)}`,
      lead,
      paragraphs: [lead, what].filter(Boolean),
      sections: [...loose, ...(what ? [{ id: "channel", title: pickBi(HDP_WORDS.theChannel, locale), paragraphs: [what] }] : [])],
      links,
      about: { title: pickBi(HDP_WORDS.aboutKinds, locale), paragraphs: [pickBi(HDP_KINDS_ABOUT, locale)] },
    };
  }
  const k = HDP_KIND_TEXT[ch.kind];
  const here = channelHere(ch, names, locale);
  const kindName = pickBi(k.name, locale);
  return {
    id,
    kind: "house",
    title: channelLabel(ch.id, locale),
    kicker: `${centres} · ${kindName}`,
    note: pickBi(k.line, locale),
    lead: here,
    paragraphs: [here, pickBi(k.what, locale), what].filter(Boolean),
    facts: [
      { label: pickBi(HDP_WORDS.kindWord, locale), value: kindName, ref: hdpKindRef(ch.kind) },
      ...HD_PAIR_PEOPLE.map((who) => ({ label: names[who], value: holdText(ch, who, locale), ref: hdpPersonRef(who) })),
    ],
    sections: [
      ...loose,
      { id: "between", title: pickBi(HDP_WORDS.between, locale), paragraphs: [pickBi(k.what, locale)] },
      ...(what ? [{ id: "channel", title: pickBi(HDP_WORDS.theChannel, locale), paragraphs: [what] }] : []),
    ],
    links,
    about: { title: pickBi(HDP_WORDS.aboutKinds, locale), paragraphs: [pickBi(HDP_KINDS_ABOUT, locale)] },
  };
}

function gateReading(ctx: HdPairContext, id: string, locale: AppLocale): ElementReading | null {
  const n = Number(id.slice(5));
  if (!Number.isInteger(n) || n < 1 || n > 64) return null;
  const { pair, names, charts } = ctx;
  const tone = pair.tones.get(n) ?? "off";
  const centre = HD_GATE_CENTER[n];
  const acts = (who: HdPairPerson) => joinList(actsOn(charts[who], n, locale), locale);
  const who = tone === "a" || tone === "b" ? tone : null;
  const lead =
    tone === "both"
      ? say(HDP_GATE.both, locale, { a: names.a, b: names.b, actsA: acts("a"), actsB: acts("b") })
      : who
        ? say(HDP_GATE.one, locale, { who: names[who], acts: acts(who) })
        : pickBi(HDP_GATE.none, locale);
  const formed = pair.formed.filter((ch) => ch.gates.includes(n));
  const state = formed.length
    ? say(HDP_GATE.formed, locale, { list: joinList(formed.map((ch) => `${ch.id} (${hdPairKindName(ch.kind!, locale).toLowerCase()})`), locale) })
    : tone !== "off"
      ? pickBi(HDP_GATE.loose, locale)
      : "";
  const what = pickBi(HD_GATE_TEXT[n]?.what, locale);
  const whose = tone === "both" ? `${names.a} · ${names.b}` : who ? names[who] : "";
  return {
    id,
    kind: "house",
    title: gateLabel(n, locale),
    kicker: [centre ? hdCenterLabel(locale, centre) : "", whose].filter(Boolean).join(" · "),
    mark: String(n),
    lead: [lead, state].filter(Boolean).join(" "),
    paragraphs: [lead, state, what].filter(Boolean),
    facts: [
      ...HD_PAIR_PEOPLE.map((p) => ({ label: names[p], value: pair.gates[p].has(n) ? actsOn(charts[p], n, locale).join(", ") : "—", ref: hdpPersonRef(p) })),
      ...(centre ? [{ label: hdGraphText(locale, "centreWord"), value: hdCenterLabel(locale, centre), ref: `center:${centre}` }] : []),
    ],
    sections: what ? [{ id: "gate", title: pickBi(HDP_WORDS.theGate, locale), paragraphs: [what] }] : undefined,
    links: {
      title: pickBi(HDP_WORDS.between, locale),
      rows: HD_CHANNELS.filter((ch) => ch.gates.includes(n)).map((c) => {
        const ch = pairChannel(pair, c.id)!;
        return { ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale), detail: ch.kind ? hdPairKindName(ch.kind, locale) : pickBi(HDP_WORDS.notFormed, locale) };
      }),
    },
    about: { title: pickBi(HDP_WORDS.aboutChart, locale), paragraphs: [pickBi(HDP_ABOUT, locale)] },
  };
}

/** The variables of a centre's texts. */
const centreVars = (c: HdCenterId, locale: AppLocale) => ({
  the: pickBi(HDP_CENTRE[c].the, locale),
  The: pickBi(HDP_CENTRE[c].The, locale),
  theme: pickBi(HDP_CENTRE[c].theme, locale),
});

/** A centre's conditioning text, one person defining it and the other open. */
function conditionText(c: HdCenterId, giver: HdPairPerson, names: HdPairNames, locale: AppLocale): string {
  const receiver = OTHER[giver];
  return say(HDP_CONDITION[c], locale, { giver: names[giver], receiver: names[receiver], deGiver: deName(names[giver], locale), deReceiver: deName(names[receiver], locale) });
}

function centreReading(ctx: HdPairContext, id: string, locale: AppLocale): ElementReading | null {
  const cid = id.slice(7) as HdCenterId;
  if (!HD_CENTER_IDS.includes(cid)) return null;
  const { pair, names } = ctx;
  const c = pairCentre(pair, cid);
  const vars = centreVars(cid, locale);
  let lead: string;
  let kicker: string;
  if (c.by === "both") {
    lead = say(HDP_CENTRE_BOTH, locale, vars);
    kicker = pickBi(HDP_CENTRE_STATE.both, locale);
  } else if (c.by === "a" || c.by === "b") {
    lead = conditionText(cid, c.by, names, locale);
    kicker = say(HDP_CENTRE_STATE.one, locale, { who: names[c.by], other: names[OTHER[c.by]] });
  } else if (c.by === "together") {
    const through = pair.formed.filter((ch) => ch.centers.includes(cid)).map((ch) => channelLabel(ch.id, locale));
    lead = say(HDP_CENTRE_TOGETHER, locale, { ...vars, channels: joinList(through, locale) });
    kicker = pickBi(HDP_CENTRE_STATE.together, locale);
  } else {
    lead = pickBi(HDP_OPEN_CENTRE[cid], locale);
    kicker = pickBi(HDP_CENTRE_STATE.open, locale);
  }
  const gates = Object.entries(HD_GATE_CENTER)
    .filter(([, centre]) => centre === cid)
    .map(([g]) => Number(g));
  const own = (who: HdPairPerson) => {
    const active = gates.filter((g) => pair.gates[who].has(g)).length;
    return hdCentreStateWord(locale, c[who], active);
  };
  const role = hdCenterProse(locale, cid, c.pair).role;
  const active = gates.filter((g) => pair.tones.get(g) !== "off");
  return {
    id,
    kind: "house",
    title: hdCenterLabel(locale, cid),
    kicker,
    note: role,
    lead,
    paragraphs: [lead, role],
    facts: HD_PAIR_PEOPLE.map((who) => ({ label: names[who], value: own(who), ref: hdpPersonRef(who) })),
    sections: [
      { id: "between", title: pickBi(HDP_WORDS.between, locale), paragraphs: [lead] },
      { id: "centre", title: pickBi(HDP_WORDS.theCentre, locale), paragraphs: [role] },
    ],
    links:
      channelsAt(pair, cid, names, locale).length || active.length
        ? {
            title: pickBi(HDP_WORDS.between, locale),
            rows: [
              ...channelsAt(pair, cid, names, locale),
              ...active.map((g) => ({
                ref: `gate:${g}`,
                label: gateLabel(g, locale),
                detail: HD_PAIR_PEOPLE.filter((who) => pair.gates[who].has(g))
                  .map((who) => names[who])
                  .join(" · "),
              })),
            ],
          }
        : undefined,
    about: { title: pickBi(HDP_WORDS.aboutConditioning, locale), paragraphs: [pickBi(HDP_ABOUT, locale)] },
  };
}

function kindReading(ctx: HdPairContext, id: string, kind: HdPairKind, locale: AppLocale): ElementReading {
  const { pair, names } = ctx;
  const k = HDP_KIND_TEXT[kind];
  const list = pair.formed.filter((ch) => ch.kind === kind);
  const what = pickBi(k.what, locale);
  return {
    id,
    kind: "house",
    title: pickBi(k.name, locale),
    kicker: channelsPhrase(list.length, locale),
    note: pickBi(k.line, locale),
    lead: what,
    paragraphs: [what, list.length ? "" : pickBi(HDP_WORDS.noneOfKind, locale), ...list.map((ch) => channelHere(ch, names, locale))].filter(Boolean),
    sections: list.length
      ? [{ id: "between", title: pickBi(HDP_WORDS.between, locale), paragraphs: list.map((ch) => `${channelLabel(ch.id, locale)}. ${channelHere(ch, names, locale)}`) }]
      : [{ id: "between", title: pickBi(HDP_WORDS.between, locale), paragraphs: [pickBi(HDP_WORDS.noneOfKind, locale)] }],
    links: list.length
      ? { title: pickBi(HDP_WORDS.ofKind, locale), rows: list.map((ch) => ({ ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale), detail: channelDetail(ch, names) })) }
      : undefined,
    about: { title: pickBi(HDP_WORDS.aboutKinds, locale), paragraphs: [pickBi(HDP_KINDS_ABOUT, locale)] },
  };
}

function conditioningReading(ctx: HdPairContext, id: string, giver: HdPairPerson, locale: AppLocale): ElementReading {
  const { pair, names } = ctx;
  const receiver = OTHER[giver];
  const vars = { giver: names[giver], receiver: names[receiver], deGiver: deName(names[giver], locale), deReceiver: deName(names[receiver], locale) };
  const list = pair.conditioning[giver];
  const lead = say(list.length ? HDP_CONDITIONING.what : HDP_CONDITIONING.none, locale, vars);
  return {
    id,
    kind: "house",
    title: say(HDP_WORDS.conditionTitle, locale, vars),
    kicker: list.map((c) => hdCenterLabel(locale, c)).join(" · "),
    lead,
    paragraphs: [lead, ...list.map((c) => conditionText(c, giver, names, locale))],
    sections: list.map((c) => ({ id: c, title: hdCenterLabel(locale, c), paragraphs: [conditionText(c, giver, names, locale)] })),
    links: list.length ? { title: pickBi(HDP_WORDS.centresWord, locale), rows: list.map((c) => ({ ref: `center:${c}`, label: hdCenterLabel(locale, c) })) } : undefined,
    about: { title: pickBi(HDP_WORDS.aboutConditioning, locale), paragraphs: [pickBi(HDP_ABOUT, locale)] },
  };
}

function openReading(ctx: HdPairContext, id: string, locale: AppLocale): ElementReading {
  const { pair } = ctx;
  const lead = pickBi(pair.open.length ? HDP_OPEN.what : HDP_OPEN.none, locale);
  return {
    id,
    kind: "house",
    title: pickBi(HDP_WORDS.openTitle, locale),
    kicker: pair.open.map((c) => hdCenterLabel(locale, c)).join(" · "),
    lead,
    paragraphs: [lead, ...pair.open.map((c) => pickBi(HDP_OPEN_CENTRE[c], locale))],
    sections: pair.open.map((c) => ({ id: c, title: hdCenterLabel(locale, c), paragraphs: [pickBi(HDP_OPEN_CENTRE[c], locale)] })),
    links: pair.open.length ? { title: pickBi(HDP_WORDS.centresWord, locale), rows: pair.open.map((c) => ({ ref: `center:${c}`, label: hdCenterLabel(locale, c) })) } : undefined,
    about: { title: pickBi(HDP_WORDS.aboutOpen, locale), paragraphs: [pickBi(HDP_ABOUT, locale)] },
  };
}

/** A split's bridge, in a sentence. */
export function bridgeText(ctx: HdPairContext, bridge: HdPair["bridges"][number], locale: AppLocale, short = false): string {
  const { names } = ctx;
  const other = OTHER[bridge.who];
  const gates = say(HDP_BRIDGE.gatesOf, locale, { name: names[other], deName: deName(names[other], locale), gates: gatesPhrase(bridge.gates, locale) });
  const vars = {
    who: names[bridge.who],
    deWho: deName(names[bridge.who], locale),
    other: names[other],
    deOther: deName(names[other], locale),
    parts: bridge.parts,
    apart: bridge.apart,
    gates,
    channels: joinList(bridge.channels, locale),
  };
  if (short) return bridge.gates.length && bridge.apart < bridge.parts ? say(HDP_BRIDGE.short, locale, vars) : "";
  if (bridge.apart >= bridge.parts || !bridge.gates.length) return say(HDP_BRIDGE.apart, locale, vars);
  return say(bridge.apart === 1 ? HDP_BRIDGE.joined : HDP_BRIDGE.partly, locale, vars);
}

function themeText(pair: HdPair, locale: AppLocale): string {
  const what = say(HDP_THEME.what, locale, { defined: pair.theme.defined, open: pair.theme.open });
  return pair.theme.open === 0 ? `${what} ${pickBi(HDP_THEME.full, locale)}` : what;
}

function definitionReading(ctx: HdPairContext, id: string, locale: AppLocale): ElementReading {
  const { pair, names } = ctx;
  const lead = pickBi(HDP_DEFINITION_TEXT[pair.definition], locale);
  const bridges = pair.bridges.map((b) => bridgeText(ctx, b, locale));
  const theme = themeText(pair, locale);
  const bridging = [...new Set(pair.bridges.flatMap((b) => b.channels))];
  return {
    id,
    kind: "house",
    title: say(HDP_WORDS.definitionTitle, locale, { definition: hdDefinitionLabel(locale, pair.definition) }),
    kicker: `${pickBi(HDP_WORDS.theme, locale)} ${pair.theme.defined}–${pair.theme.open}`,
    lead,
    paragraphs: [lead, theme, ...bridges],
    facts: [
      { label: hdFactLabel(locale, "definition"), value: hdDefinitionLabel(locale, pair.definition) },
      { label: pickBi(HDP_WORDS.theme, locale), value: `${pair.theme.defined}–${pair.theme.open}` },
      ...HD_PAIR_PEOPLE.map((who) => ({ label: names[who], value: hdDefinitionLabel(locale, pair.definitions[who]), ref: hdpPersonRef(who) })),
    ],
    sections: [
      { id: "theme", title: pickBi(HDP_WORDS.theme, locale), paragraphs: [theme] },
      ...(bridges.length ? [{ id: "bridges", title: pickBi(HDP_WORDS.bridges, locale), paragraphs: bridges }] : []),
    ],
    links: bridging.length ? { title: pickBi(HDP_WORDS.bridges, locale), rows: bridging.map((cid) => ({ ref: `channel:${cid}`, label: channelLabel(cid, locale) })) } : undefined,
    about: { title: pickBi(HDP_WORDS.aboutChart, locale), paragraphs: [pickBi(HDP_ABOUT, locale)] },
  };
}

function personReading(ctx: HdPairContext, id: string, who: HdPairPerson, locale: AppLocale): ElementReading {
  const { pair, names, charts } = ctx;
  const chart = charts[who];
  const name = names[who];
  const other = names[OTHER[who]];
  const centres = pair.centres.filter((c) => c[who]).map((c) => c.id);
  const whole = pair.channels.filter((ch) => ch[who].whole);
  const lead = say(HDP_PERSON.who, locale, {
    name,
    type: hdTypeLabel(locale, chart.type),
    profile: chart.profile,
    definition: pickBi(HDP_DEFINITION_PHRASE[chart.definition], locale),
  });
  const defines = centres.length
    ? say(HDP_PERSON.defines, locale, { name, centres: joinList(centres.map((c) => pickBi(HDP_CENTRE[c].the, locale)), locale) })
    : say(HDP_PERSON.definesNone, locale, { name, other, deOther: deName(other, locale) });
  const brings = whole.length ? say(HDP_PERSON.brings, locale, { name, list: joinList(whole.map((ch) => channelLabel(ch.id, locale)), locale) }) : say(HDP_PERSON.bringsNone, locale, { name });
  return {
    id,
    kind: "house",
    title: name,
    kicker: `${hdTypeLabel(locale, chart.type)} · ${chart.profile}`,
    lead,
    paragraphs: [lead, defines, brings],
    facts: [
      { label: hdFactLabel(locale, "type"), value: hdTypeLabel(locale, chart.type) },
      { label: hdFactLabel(locale, "strategy"), value: hdStrategyFull(locale, chart) },
      { label: hdFactLabel(locale, "authority"), value: hdAuthorityFull(locale, chart) },
      { label: hdFactLabel(locale, "profile"), value: chart.profile },
      { label: hdFactLabel(locale, "definition"), value: hdDefinitionLabel(locale, chart.definition) },
    ],
    sections: [{ id: "between", title: pickBi(HDP_WORDS.between, locale), paragraphs: [defines, brings] }],
    links: whole.length ? { title: pickBi(HDP_WORDS.between, locale), rows: whole.map((ch) => ({ ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale), detail: hdPairKindName(ch.kind!, locale) })) } : undefined,
    about: { title: pickBi(HDP_WORDS.aboutChart, locale), paragraphs: [pickBi(HDP_ABOUT, locale)] },
  };
}

/** The connection at a glance (the summary, and the first read's first step). */
export function hdPairSummary(ctx: HdPairContext, locale: AppLocale): string {
  const { pair } = ctx;
  if (!pair.formed.length) return pickBi(HDP_WORDS.summaryNone, locale);
  return say(HDP_WORDS.summary, locale, {
    channels: channelsPhrase(pair.formed.length, locale),
    kinds: kindsPhrase(pair, locale),
    defined: pair.theme.defined,
    theme: `${pair.theme.defined}–${pair.theme.open}`,
    definition: pickBi(HDP_DEFINITION_PHRASE[pair.definition], locale),
  });
}

function summaryReading(ctx: HdPairContext, id: string, locale: AppLocale): ElementReading {
  const { pair, names, charts } = ctx;
  const lead = hdPairSummary(ctx, locale);
  return {
    id,
    kind: "house",
    title: pickBi(HDP_WORDS.summaryTitle, locale),
    kicker: `${names.a} · ${names.b}`,
    lead,
    paragraphs: [lead, pickBi(HDP_ABOUT, locale)],
    facts: HD_PAIR_PEOPLE.map((who) => ({ label: names[who], value: `${hdTypeLabel(locale, charts[who].type)} · ${charts[who].profile}`, ref: hdpPersonRef(who) })),
    links: {
      title: pickBi(HDP_WORDS.between, locale),
      rows: HD_PAIR_KINDS.map((k) => ({ ref: hdpKindRef(k), label: hdPairKindName(k, locale), detail: channelsPhrase(pair.formed.filter((ch) => ch.kind === k).length, locale) })),
    },
    about: { title: pickBi(HDP_WORDS.aboutChart, locale), paragraphs: [pickBi(HDP_ABOUT, locale)] },
  };
}

/** The reading of what is chosen on the connection chart's page (null: nothing chosen, or not this page's). */
export function hdPairReading(ctx: HdPairContext | null, id: string | null, locale: AppLocale): ElementReading | null {
  if (!ctx || !id) return null;
  const ref = parseHdpRef(id);
  if (ref) {
    if (ref.kind === "summary") return summaryReading(ctx, id, locale);
    if (ref.kind === "open") return openReading(ctx, id, locale);
    if (ref.kind === "definition") return definitionReading(ctx, id, locale);
    if (ref.kind === "kind") return kindReading(ctx, id, ref.value, locale);
    if (ref.kind === "conditioning") return conditioningReading(ctx, id, ref.who, locale);
    return personReading(ctx, id, ref.who, locale);
  }
  if (id.startsWith("channel:")) return channelReading(ctx, id, locale);
  if (id.startsWith("gate:")) return gateReading(ctx, id, locale);
  if (id.startsWith("center:")) return centreReading(ctx, id, locale);
  return null;
}

export type HdPairFirstRead = {
  lead: string;
  /** Each step's text, by step: summary, the four kinds, conditioning-a, conditioning-b, open, definition. */
  texts: Record<string, string>;
  next: string;
};

/** The first read's texts (the page puts its labels and values beside them). */
export function hdPairFirstRead(ctx: HdPairContext, locale: AppLocale): HdPairFirstRead {
  const { pair, names } = ctx;
  const texts: Record<string, string> = {
    summary: say(HDP_FIRST.summary, locale, { channels: channelsPhrase(pair.formed.length, locale), defined: pair.theme.defined }).replace(/^./, (c) => c.toUpperCase()),
  };
  for (const k of HD_PAIR_KINDS) {
    const list = pair.formed.filter((ch) => ch.kind === k);
    const line = pickBi(HDP_KIND_TEXT[k].line, locale);
    if (!list.length) texts[k] = `${line}. ${pickBi(HDP_FIRST.kindNone, locale)}`;
    else if (k === "dominance" || k === "compromise") {
      const by = HD_PAIR_PEOPLE.filter((who) => list.some((ch) => ch.lead === who)).map((who) =>
        say(HDP_WORDS.leads, locale, { name: names[who], list: shortList(list.filter((ch) => ch.lead === who).map((ch) => ch.id), locale) }),
      );
      texts[k] = `${line}. ${by.join(locale === "fr" ? "\u202f; " : "; ")}.`;
    } else texts[k] = `${line}. ${pickBi(HDP_WORDS.between, locale)}${colon(locale)}${shortList(list.map((ch) => ch.id), locale)}.`;
  }
  for (const giver of HD_PAIR_PEOPLE) {
    const receiver = OTHER[giver];
    const vars = { giver: names[giver], receiver: names[receiver], deGiver: deName(names[giver], locale) };
    texts[`conditioning-${giver}`] = say(pair.conditioning[giver].length ? HDP_FIRST.condition : HDP_FIRST.conditionNone, locale, vars);
  }
  texts.open = pickBi(pair.open.length ? HDP_FIRST.openShort : HDP_FIRST.openNone, locale);
  const first = pickBi(HDP_DEFINITION_TEXT[pair.definition], locale).split(/(?<=[.!?])\s/)[0] ?? "";
  const bridge = pair.bridges.map((b) => bridgeText(ctx, b, locale, true)).filter(Boolean);
  texts.definition = [first, ...bridge].join(" ");
  return { lead: pickBi(HDP_FIRST.lead, locale), texts, next: pickBi(HDP_FIRST.next, locale) };
}

/** "How Ulune reads a connection chart": what it is and is not. */
export function hdPairMethod(locale: AppLocale): { title: string; items: string[] } {
  return { title: pickBi(HDP_METHOD_TITLE, locale), items: HDP_METHOD.map((b) => pickBi(b, locale)) };
}

/** A gate's or a channel's name for the figure's lines and the table (the pack's words). */
export { channelLabel as hdPairChannelLabel, gateLabel as hdPairGateLabel };
