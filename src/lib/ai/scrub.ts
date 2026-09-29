import type { NatalChart } from "@/lib/chart/types";
import type { AppLocale } from "@/lib/i18n/messages";

/*
 * The last check before any text leaves for an AI: the names and birthplaces
 * of the charts in play are replaced by "Person A" / "Person B" and "the
 * birthplace". The chart summary already carries positions only (lib/chart/
 * dump.ts); this catches the reading texts, which name the people they are
 * about (a synastry reads "Alex's Venus"), and a name typed into a question.
 */

export type Hidden = { text: string; as: string };

const WORD = /[\p{L}\p{N}]/u;

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Each chart's name, and its birthplace's name, with what stands in for them.
 * `names[i]` adds the other names of chart i's person (numerology's full
 * name at birth and name used now), each whole and word by word.
 */
export function personalWords(
  charts: readonly (NatalChart | null | undefined)[],
  locale: AppLocale,
  names: readonly (readonly (string | null | undefined)[] | undefined)[] = [],
): Hidden[] {
  const fr = locale === "fr";
  const out: Hidden[] = [];
  charts.forEach((chart, i) => {
    if (!chart) return;
    const who = `${fr ? "Personne" : "Person"} ${String.fromCharCode(65 + i)}`;
    const place = fr ? "le lieu de naissance" : "the birthplace";
    const name = chart.meta.name.trim();
    // A composite is named "A · B": each part is a name of its own.
    for (const part of name.split(" · ")) {
      if (part.trim().length >= 2) out.push({ text: part.trim(), as: who });
    }
    for (const other of names[i] ?? []) {
      const whole = (other ?? "").trim().replace(/\s+/g, " ");
      if (whole.length < 2) continue;
      out.push({ text: whole, as: who });
      for (const word of whole.split(" ")) if (word.length >= 2 && word !== whole) out.push({ text: word, as: who });
    }
    const label = chart.meta.placeLabel.trim();
    if (label && !/^-?\d/.test(label)) {
      out.push({ text: label, as: place });
      for (const part of label.split(",")) {
        if (part.trim().length >= 3) out.push({ text: part.trim(), as: place });
      }
    }
  });
  // Longest first, so "Paris, France" goes before "Paris".
  return out.sort((a, b) => b.text.length - a.text.length);
}

/**
 * `text` with every whole-word occurrence of a hidden word replaced. Names and
 * places are matched as written, so a birthplace called "Nice" leaves "nice"
 * alone; one typed in lower case is also found capitalised, as at the start
 * of a sentence.
 */
export function hideWords(text: string, hidden: readonly Hidden[]): string {
  let out = text;
  for (const { text: word, as } of hidden) {
    const first = word.charAt(0);
    const upper = first.toUpperCase();
    const head = first !== upper ? `[${escape(first)}${escape(upper)}]` : escape(first);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${head}${escape(word.slice(1))}(?![\\p{L}\\p{N}])`, "gu");
    out = out.replace(re, as);
  }
  return out;
}

/** Whether `text` still holds one of the hidden words (a test's check). */
export function holdsHidden(text: string, hidden: readonly Hidden[]): boolean {
  return hidden.some(({ text: word }) => {
    let at = text.indexOf(word);
    while (at >= 0) {
      const before = at > 0 ? text.charAt(at - 1) : "";
      const after = text.charAt(at + word.length);
      if (!WORD.test(before) && !WORD.test(after)) return true;
      at = text.indexOf(word, at + 1);
    }
    return false;
  });
}
