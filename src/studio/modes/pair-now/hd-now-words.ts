import type { HdNowChannel, HdPairNow, HdPairPerson } from "@/lib/chart/hd-pair";
import type { HdNames } from "@/lib/chart/hd-focus";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { hdBodyLabel, hdCenterLabel } from "@/lib/i18n/hd-ui";
import type { AppLocale } from "@/lib/i18n/messages";
import { dateFormat } from "@/lib/intl-cache";

/*
 * "You two, now" on Human Design's connection chart (share and compare plan,
 * feature 5e), said in a line: the moment, a channel the moment completes and
 * what it meets, the centres it defines between the two. The part
 * (hd-now.tsx), the figure's line and card (design-pair.tsx) and the table's
 * part (tables/pair-now-hd-part.tsx) say it the same way.
 */

/** French "de" before a name. */
const deName = (name: string): string => (/^(?:[aeiouhéèêëàâîïôûœæ]|y(?![aeiouéèêëàâîïôû]))/iu.test(name) ? `d’${name}` : `de ${name}`);

/** "Today at 09:40". */
export function hdNowTime(at: number, locale: AppLocale): string {
  return pnwWord(locale, "ptnTodayAt", { time: dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at)) });
}

/** "34–20 · Charisma". */
export function hdNowTitle(c: HdNowChannel, names: HdNames | null): string {
  const name = names?.channel(c.channel.id);
  return name ? `${c.channel.id} · ${name}` : c.channel.id;
}

/** What the moment meets and brings, in a line: "with TraceQA’s gate 34 · Sun in 20". */
export function hdNowWith(c: HdNowChannel, moment: HdPairNow["moment"], people: Record<HdPairPerson, string>, locale: AppLocale): string {
  const meets =
    c.by === "sky"
      ? pnwWord(locale, "ptnHdSky")
      : c.by === "both"
        ? pnwWord(locale, "ptnHdWithBoth", { h: c.held ?? "" })
        : pnwWord(locale, "ptnHdWith", { name: people[c.by], deName: deName(people[c.by]), h: c.held ?? "" });
  const brings = c.brings.map((g) => pnwWord(locale, "ptnHdBodies", { g, bodies: moment.filter((m) => m.gate === g).map((m) => hdBodyLabel(locale, m.body)).join(", ") }));
  return [meets, ...brings].join(" · ");
}

/** "Defined between you for now: Throat and G." (or "" when none). */
export function hdNowCentresLine(now: HdPairNow, locale: AppLocale): string {
  if (!now.centres.length) return "";
  const names = now.centres.map((c) => hdCenterLabel(locale, c));
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")}${locale === "fr" ? " et " : " and "}${names[names.length - 1]}` : names[0]!;
  return pnwWord(locale, "ptnHdCentres", { list });
}
