/**
 * What the Progressions and Composite panels say before anything is chosen:
 * what only that mode can say about the Sun, the Moon and the Ascendant (the
 * natal sentences, "Your core identity…", only repeated the birth chart).
 */
import type { Locale } from "@/lib/i18n/locale";
import { bodyAgree, bodyBare, inSign, signName } from "@/lib/i18n/astro";
import { SIGN_IDS } from "@/lib/chart/constants";
import type { Placement, SignId } from "@/lib/chart/types";

export type ModeHelloId = "sun" | "moon" | "ascendant";

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function nextSign(sign: SignId): SignId {
  return SIGN_IDS[(SIGN_IDS.indexOf(sign) + 1) % 12];
}

/** "Progressed Sun" · "Soleil progressé" · "Lune progressée". */
export function progressedTitle(id: ModeHelloId, locale: Locale): string {
  const name = bodyBare(id, locale);
  return locale === "fr" ? `${name} ${bodyAgree(id, "progressé", "progressée")}` : `Progressed ${name}`;
}

/**
 * Where the progressed body stands in its sign, how long it has been there
 * and when it moves on, from its speed (a day after birth is a year of life,
 * so its speed in degrees a day is its pace in degrees a year).
 */
export function progressedLine(
  p: Placement,
  natal: Placement | undefined,
  yearsOfLife: number,
  locale: Locale,
): string {
  const fr = locale === "fr";
  const parts: string[] = [];
  const speed = typeof p.speed === "number" && Number.isFinite(p.speed) ? p.speed : null;
  const into = p.signDegree;
  // The age it entered the sign it is in, at its present pace.
  const entered = speed && speed > 0 ? yearsOfLife - into / speed : null;
  const since = entered != null ? Math.max(0, Math.round(entered)) : null;
  if (natal && natal.sign === p.sign && entered != null && entered > 0.5) {
    // Gone round the zodiac and back (the Moon, every 27 years or so).
    parts.push(
      fr
        ? `De retour ${inSign(p.sign, locale)}, son signe de naissance, depuis l’âge de ${since}\u00a0ans environ.`
        : `Back in ${signName(p.sign, locale)}, its birth sign, since about age ${since}.`,
    );
  } else if (natal && natal.sign !== p.sign) {
    if (since != null) {
      parts.push(
        fr
          ? `${cap(inSign(p.sign, locale))} depuis l’âge de ${since}\u00a0ans environ\u202f; ${inSign(natal.sign, locale)} à la naissance.`
          : `In ${signName(p.sign, locale)} since about age ${since}; in ${signName(natal.sign, locale)} at birth.`,
      );
    } else {
      parts.push(
        fr
          ? `${cap(inSign(p.sign, locale))}\u202f; ${inSign(natal.sign, locale)} à la naissance.`
          : `In ${signName(p.sign, locale)}; in ${signName(natal.sign, locale)} at birth.`,
      );
    }
  } else {
    parts.push(fr ? `${cap(inSign(p.sign, locale))}, comme à la naissance.` : `In ${signName(p.sign, locale)}, as at birth.`);
  }
  if (speed != null && speed > 0) {
    const years = (30 - into) / speed;
    const next = nextSign(p.sign);
    if (years < 2) {
      const months = Math.max(1, Math.round(years * 12));
      parts.push(
        fr
          ? `Entre ${inSign(next, locale)} dans ${months}\u00a0mois environ.`
          : `Moves into ${signName(next, locale)} in about ${months} month${months === 1 ? "" : "s"}.`,
      );
    } else {
      const age = Math.round(yearsOfLife + years);
      parts.push(
        fr ? `Entre ${inSign(next, locale)} vers ${age}\u00a0ans.` : `Moves into ${signName(next, locale)} at about age ${age}.`,
      );
    }
  } else if (speed != null && speed < 0) {
    parts.push(fr ? "Rétrograde en progression." : "Retrograde by progression.");
  }
  return parts.join(" ");
}

const COMPOSITE_ROLE: Record<ModeHelloId, { en: string; fr: string }> = {
  sun: {
    en: "What the relationship is for: what the two of you build and show together.",
    fr: "Ce pour quoi la relation existe\u202f: ce que vous construisez et montrez ensemble.",
  },
  moon: {
    en: "Its emotional climate: what makes you both feel at home together.",
    fr: "Son climat affectif\u202f: ce qui vous fait vous sentir chez vous, ensemble.",
  },
  ascendant: {
    en: "How you come across as a pair, and how you meet the world together.",
    fr: "La façon dont vous apparaissez à deux, et abordez le monde ensemble.",
  },
};

/** "Composite Sun" · "Soleil composite". */
export function compositeTitle(id: ModeHelloId, locale: Locale): string {
  const name = bodyBare(id, locale);
  return locale === "fr" ? `${name} composite` : `Composite ${name}`;
}

/**
 * The relationship's own Sun, Moon or Ascendant: its role, then its sign's
 * style (the sign's keywords, from the reading text once it has come).
 */
export function compositeLine(id: ModeHelloId, p: Placement, locale: Locale, style = ""): string {
  const fr = locale === "fr";
  const role = fr ? COMPOSITE_ROLE[id].fr : COMPOSITE_ROLE[id].en;
  if (!style) return role;
  return fr ? `${role} ${cap(inSign(p.sign, locale))}\u202f: ${style}.` : `${role} In ${signName(p.sign, locale)}: ${style}.`;
}
