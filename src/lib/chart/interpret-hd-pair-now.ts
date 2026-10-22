/**
 * "You two, now" on Human Design's connection chart, its readings (share and
 * compare plan, feature 5e): the planets' gates at this moment over the two
 * people's bodygraphs. The part as a whole (the channels the moment completes
 * for the two and the centres it defines between them), and each of those
 * channels by what it meets: one person's gate, a gate both hold, or the
 * moment alone. The words are src/lib/content/hd-pair-now.ts's and the
 * channels' own (content/hd.ts); it ships in the connection chart's reading
 * pack (pack-hd-pair.ts), one language at a time.
 *
 *   hdp:now           the part
 *   hdp:now:34-20     one channel the moment completes
 */
import { HD_CHANNEL_TEXT } from "@/lib/content/hd";
import { HDN_TEXT } from "@/lib/content/hd-pair-now";
import { pickBi, type Bi } from "@/lib/content/types";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { hdBodyLabel, hdCenterLabel, hdChannelCentersLine } from "@/lib/i18n/hd-ui";
import type { AppLocale } from "@/lib/i18n/messages";
import { dateFormat } from "@/lib/intl-cache";
import { HDP_NOW, hdpNowRef, type HdNowChannel, type HdPairContext, type HdPairNow } from "./hd-pair";
import type { ElementReading, ReadingFact } from "./types";

function fill(text: string, vars: Record<string, string | number>): string {
  let s = text;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
const say = (b: Bi, locale: AppLocale, vars: Record<string, string | number> = {}) => fill(pickBi(b, locale), vars);

/** French "de" before a name: "de Camille", "d’Anna". */
const deName = (name: string): string => (/^(?:[aeiouhéèêëàâîïôûœæ]|y(?![aeiouéèêëàâîïôû]))/iu.test(name) ? `d’${name}` : `de ${name}`);

/** "20–57 · The Brainwave". */
function channelLabel(id: string, locale: AppLocale): string {
  const name = pickBi(HD_CHANNEL_TEXT[id]?.name, locale);
  return name ? `${id} · ${name}` : id;
}

/** "Sun, Mercury". */
const bodiesOf = (c: HdNowChannel, locale: AppLocale) => [...new Set(c.bodies)].map((b) => hdBodyLabel(locale, b)).join(", ");

/** "a, b and c", « a, b et c ». */
function joinList(items: readonly string[], locale: AppLocale): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}${locale === "fr" ? " et " : " and "}${items[items.length - 1]}`;
}

/** "Today at 09:40", in the reader's clock. */
export function hdNowWhen(at: number, locale: AppLocale): string {
  return pnwWord(locale, "ptnTodayAt", { time: dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at)) });
}

/** What the moment meets in one channel, in a sentence. */
export function hdNowChannelText(c: HdNowChannel, ctx: Pick<HdPairContext, "names">, locale: AppLocale): string {
  const channel = channelLabel(c.channel.id, locale);
  const bodies = bodiesOf(c, locale);
  if (c.by === "sky") return say(HDN_TEXT.bySky, locale, { g: c.channel.gates[0], h: c.channel.gates[1], bodies, channel });
  const g = c.brings[0]!;
  if (c.by === "both") return say(HDN_TEXT.byBoth, locale, { g, h: c.held ?? "", bodies, channel });
  const name = ctx.names[c.by];
  return say(HDN_TEXT.byPerson, locale, { g, h: c.held ?? "", bodies, channel, name, deName: deName(name) });
}

const channelsWord = (n: number, locale: AppLocale) => (n === 1 ? pickBi(HDN_TEXT.channelOne, locale) : say(HDN_TEXT.channelMany, locale, { n }));

function about(locale: AppLocale): NonNullable<ElementReading["about"]> {
  return { title: pnwWord(locale, "ptnAbout"), paragraphs: [pickBi(HDN_TEXT.about, locale)] };
}

/** The part's lead: how many channels the moment completes for the two, or that it completes none. */
export function hdNowLead(now: HdPairNow, locale: AppLocale): string {
  return now.channels.length ? say(HDN_TEXT.lead, locale, { n: channelsWord(now.channels.length, locale) }) : pickBi(HDN_TEXT.quiet, locale);
}

/** The centres line, or "" when the moment defines none that the two leave open. */
export function hdNowCentres(now: HdPairNow, locale: AppLocale): string {
  return now.centres.length ? say(HDN_TEXT.centres, locale, { list: joinList(now.centres.map((c) => hdCenterLabel(locale, c)), locale) }) : "";
}

function momentFacts(now: HdPairNow, locale: AppLocale): ReadingFact[] {
  return now.moment.map((m) => ({ label: hdBodyLabel(locale, m.body), value: `${m.gate}.${m.line}`, ref: `gate:${m.gate}` }));
}

/** "You two, now" on the connection chart: the part, or one channel the moment completes; null for another id. */
export function hdPairNowReading(ctx: HdPairContext, now: HdPairNow, at: number, id: string | null, locale: AppLocale): ElementReading | null {
  if (!id || !id.startsWith(HDP_NOW)) return null;
  const when = hdNowWhen(at, locale);
  if (id === HDP_NOW) {
    const lead = hdNowLead(now, locale);
    const centres = hdNowCentres(now, locale);
    const lines = now.channels.map((c) => hdNowChannelText(c, ctx, locale));
    return {
      id,
      kind: "house",
      title: pnWord(locale, "ptnHead"),
      kicker: `${when} · ${channelsWord(now.channels.length, locale)}`,
      lead,
      paragraphs: [lead, ...lines, ...(centres ? [centres] : [])],
      facts: momentFacts(now, locale),
      sections: [
        ...(lines.length ? [{ id: "channels", title: pickBi(HDN_TEXT.whatItMeets, locale), paragraphs: lines }] : []),
        ...(centres ? [{ id: "centres", title: pickBi(HDN_TEXT.centresTitle, locale), paragraphs: [centres] }] : []),
      ],
      links: now.channels.length
        ? { title: pickBi(HDN_TEXT.whatItMeets, locale), rows: now.channels.map((c) => ({ ref: hdpNowRef(c.channel.id), label: channelLabel(c.channel.id, locale), detail: hdChannelCentersLine(locale, c.channel.centers[0], c.channel.centers[1]) })) }
        : undefined,
      about: about(locale),
    };
  }
  const c = now.channels.find((x) => hdpNowRef(x.channel.id) === id);
  if (!c) return null;
  const lead = hdNowChannelText(c, ctx, locale);
  const what = pickBi(HD_CHANNEL_TEXT[c.channel.id]?.what, locale);
  return {
    id,
    kind: "house",
    title: channelLabel(c.channel.id, locale),
    kicker: `${pnWord(locale, "ptnHead")} · ${when}`,
    lead,
    paragraphs: [lead, what].filter(Boolean),
    facts: [
      ...c.brings.map((g) => ({ label: pickBi(HDN_TEXT.moment, locale), value: `${g} · ${joinList(c.bodies.filter((b) => now.moment.some((m) => m.body === b && m.gate === g)).map((b) => hdBodyLabel(locale, b)), locale)}`, ref: `gate:${g}` })),
      ...(c.held != null ? [{ label: c.by === "both" ? `${ctx.names.a} · ${ctx.names.b}` : ctx.names[c.by as "a" | "b"], value: String(c.held), ref: `gate:${c.held}` }] : []),
    ],
    sections: what ? [{ id: "channel", title: pickBi(HDN_TEXT.theChannel, locale), paragraphs: [what] }] : undefined,
    links: { title: pnWord(locale, "ptnHead"), rows: [{ ref: HDP_NOW, label: when }, { ref: `channel:${c.channel.id}`, label: channelLabel(c.channel.id, locale) }] },
    about: about(locale),
  };
}
