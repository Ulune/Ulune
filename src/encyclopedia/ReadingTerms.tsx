import { Fragment } from "react";
import type { NatalChart } from "@/lib/chart/types";
import { aspectName, bodyLabel, houseName, signName } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/messages";
import { TermWord } from "./TermWord";
import type { TermKind } from "./term-ids";
import { tr } from "./words";

/*
 * Under a chart reading in the side panel, the entries of what it is about
 * (encyclopedia plan, part 7: on the wheel a click keeps choosing; the
 * selected item's panel offers its pages): a body with its sign and house,
 * an angle with its sign, a house with the sign on its cusp, an aspect with
 * its two bodies, a sign. Its own download, fetched with the first such
 * reading.
 */

type Item = { kind: TermKind; id: string | number; label: string };

function itemsFor(readingId: string, chart: NatalChart | null | undefined, locale: AppLocale): Item[] {
  const [kind, rest = ""] = readingId.split(":");
  const body = (id: string): Item => ({ kind: "body", id, label: bodyLabel(id, locale) });
  const sign = (id: string): Item => ({ kind: "sign", id, label: signName(id as never, locale) });
  const house = (n: number): Item => ({ kind: "house", id: n, label: houseName(n, locale) });
  if (kind === "planet" || kind === "angle") {
    const p = kind === "planet" ? chart?.planets.find((x) => x.id === rest) : chart?.angles[rest as keyof NatalChart["angles"]];
    const out = [body(rest)];
    if (p) out.push(sign(p.sign));
    if (p && kind === "planet" && "house" in p && typeof p.house === "number" && chart?.meta.timeUnknown !== true) out.push(house(p.house));
    return out;
  }
  if (kind === "house") {
    const n = Number(rest);
    const cusp = chart?.houses.find((h) => h.id === n);
    return [house(n), ...(cusp ? [sign(cusp.sign)] : [])];
  }
  if (kind === "sign") return [sign(rest)];
  if (kind === "aspect") {
    const a = chart?.aspects.find((x) => x.id === rest);
    return a ? [body(a.a), { kind: "aspect", id: a.type, label: aspectName(a.type, locale) }, body(a.b)] : [];
  }
  return [];
}

export function ReadingTerms({ readingId, chart }: { readingId: string; chart?: NatalChart | null }) {
  const { locale } = useI18n();
  const items = itemsFor(readingId, chart, locale);
  if (!items.length) return null;
  const lang = locale === "fr" ? "fr" : "en";
  return (
    <section className="ob-rc-sec ob-rc-terms" data-testid="reading-terms">
      <h3 className="ob-rc-h">{tr(lang, "encInPanel")}</h3>
      <p className="ob-rc-p">
        {items.map((x, i) => (
          <Fragment key={`${x.kind}:${x.id}`}>
            {i ? <span aria-hidden> · </span> : null}
            <TermWord kind={x.kind} id={x.id}>
              {x.label}
            </TermWord>
          </Fragment>
        ))}
      </p>
    </section>
  );
}
