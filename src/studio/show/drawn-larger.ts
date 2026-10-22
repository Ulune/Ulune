import type { StudioPage } from "@/studio/url";

/*
 * The pages drawn at a set size (pillars, cards, a wheel of numbers): Show
 * mode (share and compare plan, idea B2) draws them larger on a large screen
 * (show.css), and so does Compare's pane that shows one, two to a screen
 * (studio/compare/compare.css). Apart, so Compare reads the list without
 * Show mode's code.
 */
export const DRAWN_LARGER: ReadonlySet<StudioPage> = new Set<StudioPage>([
  "numerology",
  "numerology-cycles",
  "numerology-pair",
  "zodiac",
  "zodiac-years",
  "zodiac-pair",
  "bazi",
  "bazi-luck",
  "bazi-pair",
  "fengshui",
  "fengshui-pair",
  "fengshui-home",
  "fengshui-cycles",
]);
