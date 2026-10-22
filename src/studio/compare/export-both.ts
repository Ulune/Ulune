import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import type { NatalChart } from "@/lib/chart/types";
import { figurePng, findFigureSvg, saveBlob, serializeFigure, type FigureCaption } from "@/lib/export/wheel-export";
import type { useI18n } from "@/lib/i18n/locale";
import { toast } from "@/lib/toast";
import { useCompare } from "@/studio/compare/compare-store";
import type { Who } from "@/studio/compare/linked";

/*
 * "Both side by side" (share and compare plan, decision C5) and "All side by
 * side" (idea B8): Compare's figures in one picture, in a row, A on the left,
 * as the toolbar's single export draws one (lib/export/wheel-export.ts: the
 * paint inlined, the glyphs' fonts embedded), as SVG or PNG. Each chart's
 * name and birth go in a band under it only when "Name and birth details on
 * the image" is ticked, off by default, as for one chart. Three or four are
 * drawn a little smaller each, so the picture stays a reasonable size. Made
 * on the device; loaded when asked for.
 */

type T = ReturnType<typeof useI18n>["t"];

/** The band under one figure: the name, then the birth's date, time, place and houses (as ExportMenu.tsx's). */
function captionOf(chart: NatalChart, timeUnknown: boolean, t: T): FigureCaption {
  const m = chart.meta;
  const line = [
    formatEuropeanDate(m.date) || m.date,
    timeUnknown || m.timeUnknown ? t("timeUnknown") : m.time,
    m.placeLabel,
    HOUSE_SYSTEM_LABEL[m.houseSystem] ? t(HOUSE_SYSTEM_LABEL[m.houseSystem]) : "",
  ].filter(Boolean);
  return { title: m.name || "Ulune", line: line.join(" · ") };
}

function slug(name: string): string {
  return (
    name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .toLowerCase() || "ulune-compare"
  );
}

const NS = "http://www.w3.org/2000/svg";
/** Each figure's width in the picture (two; three or four), and the room around and between them. */
const SIZE = 1200;
const SIZE_MANY = 900;
const GAP = 48;

export async function exportBoth(kind: "png" | "svg", opts: { panes: readonly Who[]; withCaption: boolean; locale: string; t: T; file: string }): Promise<void> {
  const { t } = opts;
  try {
    const svgs = opts.panes.map((who) => {
      const pane = document.querySelector(`[data-testid="compare-pane-${who}"]`);
      return pane ? findFigureSvg(pane) : null;
    });
    if (svgs.length < 2 || svgs.some((svg) => !svg)) {
      toast(t("exportNoFigure"), "error");
      return;
    }
    const { rows } = useCompare.getState();
    const size = svgs.length > 2 ? SIZE_MANY : SIZE;
    const captions = opts.panes.map((who) => rows[who]).map((row) => (opts.withCaption && row ? captionOf(row.chart, row.timeUnknown, t) : null));
    const texts = await Promise.all(svgs.map((svg, i) => serializeFigure(svg!, size, captions[i] ?? null)));
    const parser = new DOMParser();
    const parts = texts.map((text) => parser.parseFromString(text, "image/svg+xml").documentElement);
    const heights = parts.map((p) => Number(p.getAttribute("height")) || size);
    const width = size * parts.length + GAP * (parts.length + 1);
    const height = Math.max(...heights) + GAP * 2;
    const out = document.createElementNS(NS, "svg");
    out.setAttribute("xmlns", NS);
    out.setAttribute("width", String(width));
    out.setAttribute("height", String(height));
    out.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const ground = document.createElementNS(NS, "rect");
    ground.setAttribute("width", String(width));
    ground.setAttribute("height", String(height));
    ground.setAttribute("fill", getComputedStyle(document.body).backgroundColor || "#fff");
    out.appendChild(ground);
    parts.forEach((part, i) => {
      const node = document.importNode(part, true);
      node.setAttribute("x", String(GAP + i * (size + GAP)));
      node.setAttribute("y", String(GAP + (height - GAP * 2 - heights[i]!) / 2));
      out.appendChild(node);
    });
    const text = new XMLSerializer().serializeToString(out);
    const name = slug(opts.file);
    if (kind === "svg") {
      saveBlob(`${name}.svg`, new Blob([text], { type: "image/svg+xml" }));
    } else {
      const png = await figurePng(text, width, height);
      if (!png) throw new Error("png");
      saveBlob(`${name}.png`, png);
    }
    toast(t("exportSaved"));
  } catch {
    toast(t("exportFailed"), "error");
  }
}
