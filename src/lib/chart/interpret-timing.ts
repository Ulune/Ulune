import { browserZone } from "@/lib/chart/client-zone";
import { aspectInPractice, bodyIs, bodyKeywords, pairTheme } from "./plain";
import { movingFamilyText } from "./interpret-transit";
import { pickBi } from "@/lib/content/types";
import { TIMING_ABOUT, TRANSIT_FAMILY, TRANSIT_PACE } from "@/lib/content/astro-time";
import type { Locale } from "../i18n/locale";
import { aspectLinkPhrase, aspectName, bodyInline, bodyLabel, inSign } from "../i18n/astro";
import { applyingFromExactDays } from "./transit-exact";
import type { AngleId, BodyId, ElementReading, NatalChart, TimingHit } from "./types";
import { timingWhen } from "./timing-window";
import { dateFormat } from "@/lib/intl-cache";

function natalOf(chart: NatalChart, id: TimingHit["natal"]) {
  if (id in chart.angles) return chart.angles[id as AngleId];
  return chart.planets.find((p) => p.id === id);
}

function formatLocal(iso: string, tz: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: tz,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function timingExactReading(
  hit: TimingHit,
  chart: NatalChart,
  locale: Locale,
  nowMs: number,
): ElementReading {
  const natal = natalOf(chart, hit.natal);
  const tz = browserZone(chart.meta.timezone);
  const when = formatLocal(hit.exactUtc, tz, locale);
  const phrase = aspectLinkPhrase(hit.moving, hit.type, hit.natal, locale);
  const days = (Date.parse(hit.exactUtc) - nowMs) / 86_400_000;
  const applying = applyingFromExactDays(days, null);
  const app =
    applying === true ? (locale === "fr" ? "applicatif" : "applying") : applying === false ? (locale === "fr" ? "séparatif" : "separating") : "";
  const fr = locale === "fr";
  const nPos = natal ? `${natal.formatted} ${inSign(natal.sign, locale)}` : "";
  const first = fr
    ? `Exact le ${when} : ${bodyInline(hit.moving, locale)} en transit forme ${aspectName(hit.type, locale).toLowerCase() === "conjonction" ? "une conjonction" : `un ${aspectName(hit.type, locale).toLowerCase()}`} exact avec ${bodyInline(hit.natal, locale)} de votre thème${nPos ? ` (${nPos})` : ""}.`
    : `Exact on ${when}: transiting ${bodyLabel(hit.moving, locale)} makes an exact ${aspectName(hit.type, locale).toLowerCase()} to your natal ${bodyLabel(hit.natal, locale)}${nPos ? ` (${nPos})` : ""}.`;
  const lead = movingFamilyText(TRANSIT_FAMILY, hit.moving as BodyId, hit.natal as BodyId, hit.type, locale);
  const second = fr
    ? `${app ? `Il est actuellement ${app}. ` : ""}L’effet se fait sentir avant et après la date exacte : ${pickBi(TRANSIT_PACE[hit.moving as BodyId], locale) || "plus la planète est lente, plus la période est longue."}`
    : `${app ? `It is currently ${app}. ` : ""}The effect is felt before and after the exact date: ${pickBi(TRANSIT_PACE[hit.moving as BodyId], locale) || "the slower the planet, the longer the period."}`;
  const theme = pairTheme(hit.moving as BodyId, hit.natal as BodyId, locale);
  return {
    id: `timing:${hit.id}`,
    kind: "aspect",
    title: `Exact · ${phrase}`,
    kicker: when,
    paragraphs: [first, lead, second, ...(theme ? [theme] : [])],
    note: first,
    lead,
    facts: [
      { label: fr ? "Exact" : "Exact", value: when },
      ...(app ? [{ label: fr ? "Phase" : "Phase", value: app }] : []),
    ],
    sections: [{ id: "chart", title: fr ? "Dans votre thème" : "In your chart", paragraphs: [second, ...(theme ? [theme] : [])] }],
    links: {
      title: fr ? "Où cela se voit" : "Where it shows",
      rows: [
        {
          ref: `timing:body:${hit.moving}`,
          label: fr ? `${bodyLabel(hit.moving, locale)} en transit` : `Transiting ${bodyLabel(hit.moving, locale)}`,
        },
      ],
    },
    about: {
      title: fr ? "À propos des moments" : "About timing",
      paragraphs: [pickBi(TIMING_ABOUT, locale), aspectInPractice(hit.type, locale)],
    },
  };
}

export function timingDateReading(
  label: string,
  hits: TimingHit[],
  locale: Locale,
  tz: string,
): ElementReading {
  const fr = locale === "fr";
  const lines = hits.slice(0, 12).map((h) => {
    const when = timingWhen(h.exactUtc, tz, locale, "time");
    return `${when} · ${aspectName(h.type, locale)} natal ${bodyLabel(h.natal, locale)} (${bodyLabel(h.moving, locale)})`;
  });
  const empty = fr ? "Aucun majeur exact sur cette date." : "No major exact on this date.";
  const count = fr
    ? `${hits.length} aspect${hits.length === 1 ? "" : "s"} majeur${hits.length === 1 ? "" : "s"} exact${hits.length === 1 ? "" : "s"} ce jour-là.`
    : `${hits.length} major aspect${hits.length === 1 ? "" : "s"} perfect${hits.length === 1 ? "s" : ""} on this day.`;
  return {
    id: `timing:date:${label}`,
    kind: "aspect",
    title: label,
    kicker: `${hits.length} exact${hits.length === 1 ? "" : "s"}`,
    paragraphs: hits.length ? lines : [empty],
    note: pickBi(TIMING_ABOUT, locale),
    lead: hits.length ? count : empty,
    links: hits.length
      ? {
          title: fr ? "Exacts" : "Exacts",
          rows: hits.slice(0, 24).map((h) => ({
            ref: `timing:${h.id}`,
            label: `${bodyLabel(h.moving, locale)} · ${aspectName(h.type, locale)} · ${bodyLabel(h.natal, locale)}`,
            detail: timingWhen(h.exactUtc, tz, locale, "time"),
          })),
        }
      : undefined,
  };
}

export function timingBodyReading(
  moving: TimingHit["moving"],
  hits: TimingHit[],
  locale: Locale,
  tz: string,
): ElementReading {
  const name = bodyLabel(moving, locale);
  const fr = locale === "fr";
  const lines = hits.slice(0, 12).map((h) => {
    const when = timingWhen(h.exactUtc, tz, locale, "table");
    return `${when} · ${aspectName(h.type, locale)} natal ${bodyLabel(h.natal, locale)}`;
  });
  const empty = fr ? `Aucun majeur exact pour ${name} dans cette vue.` : `No major exact for ${name} in this view.`;
  return {
    id: `timing:body:${moving}`,
    kind: "planet",
    title: fr ? `${name} en transit` : `Transiting ${name}`,
    kicker: `${hits.length} exact${hits.length === 1 ? "" : "s"}`,
    paragraphs: [...(hits.length ? lines : [empty]), bodyIs(moving, locale)],
    note: pickBi(TRANSIT_PACE[moving as BodyId], locale) || undefined,
    lead: hits.length
      ? fr
        ? `Dans la période affichée, ${bodyInline(moving, locale)} en transit forme ${hits.length} aspect${hits.length > 1 ? "s" : ""} exact${hits.length > 1 ? "s" : ""} à votre thème : ${bodyKeywords(moving as BodyId, locale)} y sont en jeu.`
        : `In the period shown, transiting ${name} makes ${hits.length} exact aspect${hits.length > 1 ? "s" : ""} to your chart, bringing ${bodyKeywords(moving as BodyId, locale)} into play.`
      : empty,
    links: hits.length
      ? {
          title: fr ? "Exacts dans cette vue" : "Exacts in this view",
          rows: hits.slice(0, 24).map((h) => ({
            ref: `timing:${h.id}`,
            label: `${aspectName(h.type, locale)} · ${bodyLabel(h.natal, locale)}`,
            detail: timingWhen(h.exactUtc, tz, locale, "table"),
          })),
        }
      : undefined,
    about: { title: fr ? `À propos : ${name}` : `About ${name}`, paragraphs: [bodyIs(moving, locale), pickBi(TIMING_ABOUT, locale)] },
  };
}
