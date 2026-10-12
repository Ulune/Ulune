/*
 * The words and icons of the 2.0 map (src/studio/map.ts): each section,
 * lens, language and tradition, by its id. The words are in the catalog
 * (catalog/sections.ts; the picker's own in catalog/picker-words.ts); a
 * language added to the registry adds its line here.
 */
import { CalendarDays, CircleDot, Library, type LucideIcon } from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PickerWordKey } from "@/studio/shell/picker-words";
import type { LanguageId, LensId, SectionId, TraditionId } from "@/studio/map";

export const SECTION_LABEL: Record<SectionId, MessageKey> = {
  charts: "sectionCharts",
  calendar: "sectionCalendar",
  encyclopedia: "sectionEncyclopedia",
};

/** The phone's bottom bar draws each section with its icon. */
export const SECTION_ICON: Record<SectionId, LucideIcon> = {
  charts: CircleDot,
  calendar: CalendarDays,
  encyclopedia: Library,
};

export const LENS_LABEL: Record<LensId, MessageKey> = {
  natal: "lensNatal",
  cycles: "lensCycles",
  relationship: "lensRelationship",
};

export const TRADITION_LABEL: Record<TraditionId, PickerWordKey> = {
  western: "traditionWestern",
  chinese: "traditionChinese",
};

/**
 * A language's words: its name, the short name a phone's toolbar shows
 * beside its lenses, the picker card's line on what it reads, and what it needs.
 */
export const LANGUAGE_WORDS: Record<LanguageId, { name: MessageKey; short: MessageKey; line: PickerWordKey; needs: PickerWordKey }> = {
  astrology: { name: "langAstrology", short: "langAstrologyShort", line: "langAstrologyLine", needs: "langNeedsTime" },
  "human-design": {
    name: "langHumanDesign",
    short: "langHumanDesignShort",
    line: "langHumanDesignLine",
    needs: "langNeedsTime",
  },
  numerology: { name: "langNumerology", short: "langNumerology", line: "langNumerologyLine", needs: "langNeedsName" },
  "chinese-astrology": {
    name: "langChineseAstrology",
    short: "langChineseAstrologyShort",
    line: "langChineseAstrologyLine",
    needs: "langNeedsDate",
  },
  bazi: { name: "langBazi", short: "langBaziShort", line: "langBaziLine", needs: "langNeedsDatePillar" },
  "feng-shui": { name: "langFengShui", short: "langFengShuiShort", line: "langFengShuiLine", needs: "langNeedsDateOnly" },
};
