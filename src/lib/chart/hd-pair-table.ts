/*
 * Human Design's connection chart as a table (share and compare plan,
 * feature 5a; studio/tables/hd-pair-table.tsx draws it): the channels the
 * two form, by kind, then those with a single gate between them; the nine
 * centres in each chart and between them, with who conditions whom; every
 * gate either person activates, with the bodies that set it. As text for
 * Copy, and as CSV with ids, each part a section of its own (its header's
 * first cell names it, so a part's Copy finds its table). Pure: the words
 * come in (the page's book, the reading pack's names); tested in
 * scripts/hd-pair.test.mjs.
 */
import { HD_CENTER_IDS, HD_GATE_CENTER, type HdCenterId } from "./human-design";
import { HD_PAIR_KINDS, HD_PAIR_PEOPLE, type HdPairChannel, type HdPairContext, type HdPairKind, type HdPairPerson } from "./hd-pair";
import { hdActivationLabel, hdCenterLabel, hdCentreStateWord, hdGateTitle } from "@/lib/i18n/hd-ui";
import type { AppLocale } from "@/lib/i18n/messages";
import type { HdPairWordKey } from "@/lib/i18n/catalog/hd-pair-words";

/** The page's words (its book, through bookT). */
export type HdPairSay = (key: HdPairWordKey, vars?: Record<string, string | number>) => string;
/** Gate and channel names, from the reading pack once it has loaded. */
export type HdPairNamesOf = { gate: (n: number) => string; channel: (id: string) => string } | null;

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** The kinds' names, by the book's keys. */
export const KIND_WORD: Record<HdPairKind, HdPairWordKey> = {
  electromagnetic: "hdpKindElectromagnetic",
  companionship: "hdpKindCompanionship",
  dominance: "hdpKindDominance",
  compromise: "hdpKindCompromise",
};

/** The channels the table lists: those formed (by kind), then those with a single gate between the two. */
export function tableChannels(ctx: Pick<HdPairContext, "pair">): { formed: HdPairChannel[]; half: HdPairChannel[] } {
  const { pair } = ctx;
  return { formed: pair.formed, half: pair.channels.filter((ch) => !ch.kind && (ch.a.gates.length || ch.b.gates.length)) };
}

/** The active gates of either person, by number. */
export function tableGates(ctx: Pick<HdPairContext, "pair">): number[] {
  return [...ctx.pair.tones].filter(([, t]) => t !== "off").map(([g]) => g);
}

/** What one person holds of a channel: "34–20, whole", "Gate 20", "—". */
export function holdCell(ch: HdPairChannel, who: HdPairPerson, locale: AppLocale, w: HdPairSay): string {
  const h = ch[who];
  if (h.whole) return `${ch.gates[0]}–${ch.gates[1]}, ${w("hdpWhole")}`;
  return h.gates.length ? hdGateTitle(locale, h.gates[0]!) : "—";
}

/** A centre in one person's own chart: defined, undefined (some gates) or open. */
export function ownState(ctx: Pick<HdPairContext, "pair">, c: HdCenterId, who: HdPairPerson, locale: AppLocale): string {
  const centre = ctx.pair.centres.find((x) => x.id === c)!;
  const active = Object.entries(HD_GATE_CENTER).filter(([g, at]) => at === c && ctx.pair.gates[who].has(Number(g))).length;
  return hdCentreStateWord(locale, centre[who], active);
}

/** A centre between the two, in words. */
export function betweenState(ctx: Pick<HdPairContext, "pair" | "names">, c: HdCenterId, w: HdPairSay): string {
  const centre = ctx.pair.centres.find((x) => x.id === c)!;
  if (centre.by === "both") return w("hdpStateBoth");
  if (centre.by === "a" || centre.by === "b") return w("hdpStateOne", { who: ctx.names[centre.by], other: ctx.names[centre.by === "a" ? "b" : "a"] });
  if (centre.by === "together") return w("hdpStateTogether");
  return w("hdpStateOpen");
}

/** Who conditions whom at a centre: "TraceQA → Sample B", or "". */
export function conditionCell(ctx: Pick<HdPairContext, "pair" | "names">, c: HdCenterId, w: HdPairSay): string {
  const giver = HD_PAIR_PEOPLE.find((who) => ctx.pair.conditioning[who].includes(c));
  return giver ? w("hdpConditioning", { giver: ctx.names[giver], receiver: ctx.names[giver === "a" ? "b" : "a"] }) : "";
}

export function hdPairTextParts(ctx: HdPairContext, locale: AppLocale, w: HdPairSay, names: HdPairNamesOf): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const { pair, charts } = ctx;
  const who = ctx.names;
  const { formed, half } = tableChannels(ctx);
  const channelName = (id: string) => {
    const n = names?.channel(id);
    return n ? `${id} · ${n}` : id;
  };
  const holds = (ch: HdPairChannel) => HD_PAIR_PEOPLE.map((p) => `${who[p]}${colon}${holdCell(ch, p, locale, w)}`).join(" · ");
  return [
    {
      id: "channels",
      lines: [
        `${who.a} · ${who.b} · ${w("hdpKindsHead")}`,
        ...HD_PAIR_KINDS.flatMap((k) => formed.filter((ch) => ch.kind === k).map((ch) => `${channelName(ch.id)} · ${w(KIND_WORD[k])} · ${holds(ch)}`)),
        ...(formed.length ? [] : [w("hdpChannelsNone")]),
        ...(half.length ? [`${w("hdpUnformedRow")}${colon}${half.map((ch) => `${ch.id} (${holds(ch)})`).join(", ")}`] : []),
      ],
    },
    {
      id: "centres",
      lines: [
        w("hdpColCentres"),
        ...HD_CENTER_IDS.map((c) => {
          const cond = conditionCell(ctx, c, w);
          return `${hdCenterLabel(locale, c)}${colon}${who.a} ${ownState(ctx, c, "a", locale)} · ${who.b} ${ownState(ctx, c, "b", locale)} · ${betweenState(ctx, c, w)}${cond ? ` · ${cond}` : ""}`;
        }),
      ],
    },
    {
      id: "gates",
      lines: [
        w("hdpPartGates"),
        ...tableGates(ctx).map((g) => {
          const n = names?.gate(g);
          const acts = HD_PAIR_PEOPLE.filter((p) => pair.gates[p].has(g)).map(
            (p) => `${who[p]}${colon}${charts[p].activations.filter((x) => x.gate === g).map((x) => hdActivationLabel(locale, x)).join(", ")}`,
          );
          return `${hdGateTitle(locale, g)}${n ? ` · ${n}` : ""} · ${acts.join(" · ")}`;
        }),
      ],
    },
  ];
}

export function hdPairTableCsv(ctx: HdPairContext): string {
  const { pair, charts } = ctx;
  const { formed, half } = tableChannels(ctx);
  const held = (ch: HdPairChannel, p: HdPairPerson) => ch[p].gates.join("|");
  const rows: string[][] = [["channel", "id", "gates", "centres", "kind", "lead", "a", "b", "uncertain"]];
  for (const ch of [...formed, ...half]) {
    rows.push(["channel", ch.id, ch.gates.join("|"), ch.centers.join("|"), ch.kind ?? "", ch.lead ?? "", held(ch, "a"), held(ch, "b"), ctx.uncertain.has(ch.id) ? "1" : "0"]);
  }
  rows.push([]);
  rows.push(["centre", "id", "a", "b", "pair", "by", "conditions"]);
  for (const c of pair.centres) {
    const giver = HD_PAIR_PEOPLE.find((p) => pair.conditioning[p].includes(c.id)) ?? "";
    rows.push(["centre", c.id, c.a ? "1" : "0", c.b ? "1" : "0", c.pair ? "1" : "0", c.by ?? "", giver]);
  }
  rows.push([]);
  rows.push(["gate", "n", "centre", "a", "b"]);
  const acts = (p: HdPairPerson, g: number) =>
    charts[p].activations
      .filter((x) => x.gate === g)
      .map((x) => `${x.layer}:${x.body}:${x.gate}.${x.line}`)
      .join("|");
  for (const g of tableGates(ctx)) rows.push(["gate", String(g), HD_GATE_CENTER[g] ?? "", acts("a", g), acts("b", g)]);
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
