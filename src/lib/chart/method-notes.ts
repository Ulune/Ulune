/**
 * What a chart says about how it was calculated, when that is not the usual
 * way: houses built in another system than the one asked for (Placidus and
 * Koch have no cusps inside the polar circles, so the engine uses Porphyry),
 * positions from the Moshier approximation (no Swiss Ephemeris file covers
 * the date), a body or a fixed star left out. A precise tool says when it
 * changed its method.
 *
 * The engine sends codes (calculate.server.ts): `W:moshier`,
 * `W:body.skipped|<id>`, `W:star.unplaced|<id>`. Charts kept from before the
 * codes carry English sentences; the three known ones are read too, anything
 * else stays unsaid rather than shown untranslated.
 */
import { HOUSE_SYSTEM_LABEL, STAR_META } from "./constants";
import type { HouseSystemId, StarId } from "./types";
import { bodyLabel } from "@/lib/i18n/astro";
import type { AppLocale, MessageKey } from "@/lib/i18n/messages";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

type MethodMeta = {
  houseSystem?: HouseSystemId;
  houseSystemRequested?: HouseSystemId;
  warnings?: string[];
};

function starName(id: string): string {
  return STAR_META[id as StarId]?.name ?? id;
}

function noteFor(warning: string, t: Translate, locale: AppLocale): string | null {
  if (warning === "W:moshier" || /^No Swiss Ephemeris file covers/.test(warning)) return t("noteMoshier");
  const code = /^W:(body\.skipped|star\.unplaced)\|([a-z0-9_-]+)$/.exec(warning);
  if (code) {
    return code[1] === "body.skipped"
      ? t("noteBodySkipped", { body: bodyLabel(code[2], locale) })
      : t("noteStarUnplaced", { star: starName(code[2]) });
  }
  const oldBody = /^(.+?) could not be placed and was left out\b/.exec(warning);
  if (oldBody) return t("noteBodySkipped", { body: oldBody[1] });
  const oldStar = /^(.+?) could not be placed \(/.exec(warning);
  if (oldStar) return t("noteStarUnplaced", { star: oldStar[1] });
  return null;
}

/** The notes for a chart, in the reader's language; none for a usual cast. */
export function methodNotes(meta: MethodMeta | null | undefined, t: Translate, locale: AppLocale): string[] {
  if (!meta) return [];
  const notes: string[] = [];
  const asked = meta.houseSystemRequested;
  if (asked && meta.houseSystem && asked !== meta.houseSystem) {
    notes.push(
      t("noteHousesPolar", {
        used: t(HOUSE_SYSTEM_LABEL[meta.houseSystem]),
        asked: t(HOUSE_SYSTEM_LABEL[asked]),
      }),
    );
  }
  for (const warning of meta.warnings ?? []) {
    const note = noteFor(warning, t, locale);
    if (note && !notes.includes(note)) notes.push(note);
  }
  return notes;
}
