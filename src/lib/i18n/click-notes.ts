import { ASPECT_IDS, type ElementReading } from "../chart/types";
import type { AppLocale } from "./messages";
import { BODY_TEXT } from "@/lib/content/astro-bodies";
import { HOUSE_TEXT, SIGN_TEXT } from "@/lib/content/astro-signs-houses";
import { ASPECT_TEXT } from "@/lib/content/astro-aspects";

type Atom = { en: string; fr?: string };

const ATOM_BODIES = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
  "chiron", "northnode", "southnode", "lilith", "vertex", "antivertex", "fortune", "spirit",
  "ceres", "pallas", "juno", "vesta", "eris", "sedna",
  "ascendant", "midheaven", "descendant", "ic",
] as const;
const ATOM_ASPECTS = ["conjunction", "opposition", "sextile", "square", "trine"] as const;

function buildAtoms(): Record<string, Atom> {
  const out: Record<string, Atom> = {};
  for (const id of ATOM_BODIES) out[id] = { ...BODY_TEXT[id].what };
  for (const [sign, row] of Object.entries(SIGN_TEXT)) out[`sign.${sign}`] = { ...row.what };
  for (const [n, row] of Object.entries(HOUSE_TEXT)) out[`house.${n}`] = { ...row.what };
  for (const type of ATOM_ASPECTS) out[`aspect.${type}`] = { ...ASPECT_TEXT[type].what };
  return out;
}

/** The short "what is this" note shown at the top of a reading, built from src/lib/content. */
export const CLICK_NOTES = { id: "natal.click-notes", kind: "atoms", atoms: buildAtoms() };

const ASPECT_TYPES = [...ASPECT_IDS].sort((a, b) => b.length - a.length);

function atoms(): Record<string, Atom> {
  return CLICK_NOTES.atoms;
}

export const CLICK_ATOM_IDS = Object.keys(atoms());

export function clickAtomIdForTarget(readingId: string): string | null {
  if (!readingId) return null;
  const table = atoms();
  if (readingId.startsWith("planet:")) {
    const id = readingId.slice("planet:".length);
    return id in table ? id : null;
  }
  if (readingId.startsWith("angle:")) {
    const id = readingId.slice("angle:".length);
    return id in table ? id : null;
  }
  if (readingId.startsWith("house:")) {
    const id = `house.${readingId.slice("house:".length)}`;
    return id in table ? id : null;
  }
  if (readingId.startsWith("sign:")) {
    const id = `sign.${readingId.slice("sign:".length)}`;
    return id in table ? id : null;
  }
  if (readingId.startsWith("aspect:")) {
    const body = readingId.slice("aspect:".length);
    for (const type of ASPECT_TYPES) {
      if (body.includes(`_${type}_`)) {
        const id = `aspect.${type}`;
        return id in table ? id : null;
      }
    }
    return null;
  }
  return readingId in table ? readingId : null;
}

export function clickNote(readingId: string, locale: AppLocale = "en"): string | null {
  const atomId = clickAtomIdForTarget(readingId);
  if (!atomId) return null;
  const atom = atoms()[atomId];
  if (!atom?.en) return null;
  return (locale === "fr" ? atom.fr : atom.en) || atom.en;
}

/** Replace a dossier reading with Quill click.en, or null when no atom exists. */
export function applyClickNote(
  reading: ElementReading,
  locale: AppLocale = "en",
): ElementReading | null {
  const note = clickNote(reading.id, locale);
  if (!note) return null;
  return { ...reading, paragraphs: [note] };
}

const noted = new WeakMap<ElementReading, Partial<Record<AppLocale, ElementReading>>>();

/**
 * Keep the full reading and add the curated meaning as its `note`. The same
 * reading gets the same object back, so a pinned reading doesn't re-render
 * on every scrub tick.
 */
export function withClickNote(reading: ElementReading, locale: AppLocale = "en"): ElementReading {
  let entry = noted.get(reading);
  if (!entry) {
    entry = {};
    noted.set(reading, entry);
  }
  const known = entry[locale];
  if (known) return known;
  const note = clickNote(reading.id, locale);
  const out = note ? { ...reading, note } : reading;
  entry[locale] = out;
  return out;
}
