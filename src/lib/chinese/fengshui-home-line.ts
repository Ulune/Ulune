/*
 * A kept home in a few words, under its name in the chart switcher
 * (reorganisation plan, R9: "People and places"): its facing and the
 * mountain it falls in ("172.5° · Wu"); a map's facing as it was given
 * ("180° on a map": a map reads true north, and its mountain waits for the
 * declination at the chart's place, which the home page works out); with no
 * facing, the year it was built ("Built in 1998"); with neither, nothing.
 *
 * Light on purpose, so the switcher shows a home without downloading the
 * home page's engine: the reading of a typed facing, the 24 mountains' names
 * and the degrees' format are those of fengshui-home-state.ts (parseFacing),
 * fengshui-home.ts (mountainAt) and fengshui-home-reading.ts (fmtDeg), and
 * scripts/chinese-fengshui-rooms.test.mjs holds them to those.
 */
import { placeWord } from "@/lib/i18n/places-words";
import type { HomeCore } from "./fengshui-home-core";

/** The 24 mountains' names, clockwise from Ren (N1, 337.5° to 352.5°). */
const MOUNTAIN_NAMES = "Ren Zi Gui Chou Gen Yin Jia Mao Yi Chen Xun Si Bing Wu Ding Wei Kun Shen Geng You Xin Xu Qian Hai".split(" ");

/** A typed facing in [0, 360), or null. Accepts "172.5", "172,5", "172.5°". */
export function facingOf(typed: string): number | null {
  const t = typed.trim().replace(",", ".").replace(/°$/, "");
  if (!/^\d{1,3}(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n < 360 ? n : null;
}

/** The name of the mountain a bearing falls in ("Wu" for 180°). */
export function mountainNameAt(degrees: number): string {
  return MOUNTAIN_NAMES[Math.floor((((degrees - 337.5) % 360) + 360) % 360 / 15)]!;
}

/** The line under a home's name: "172.5° · Wu", "180° on a map", "Built in 1998", or "". */
export function homeLine(home: Pick<HomeCore, "typed" | "source" | "year">, locale: string): string {
  const deg = facingOf(home.typed);
  if (deg != null) {
    const d = `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 }).format(deg)}°`;
    return home.source === "map" ? placeWord(locale, "placesOnMap", { deg: d }) : `${d} · ${mountainNameAt(deg)}`;
  }
  const year = home.year.trim();
  return /^\d{4}$/.test(year) ? placeWord(locale, "placesBuilt", { year }) : "";
}
