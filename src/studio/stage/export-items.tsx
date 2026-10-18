import { Copy, Download, FileImage, Printer, Send, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { openAskSheet, openShareSheet } from "@/components/share/share-state";
import { useI18n } from "@/lib/i18n/locale";
import { prefetch } from "@/lib/lazy-component";
import { importWithRetry } from "@/lib/lazy-retry";
import { toast } from "@/lib/toast";
import { MODE_META } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import type { NatalChart } from "@/lib/chart/types";

/*
 * The ways out of Share and export (ExportMenu.tsx) and of the phone's ⋯ menu
 * (MorePanel.tsx), as menu items: their own download, fetched when the menu's
 * button is pointed at, focused or pressed (or at idle), never with the first
 * page, since they only act once the menu is open (2.0's first-load review,
 * 17 Oct 2026).
 */

/*
 * The export code is its own download, fetched when the menu is pointed at,
 * focused or opened (ExportMenu.tsx), and as these items are drawn, so it is
 * there by the time an item is picked (copying must happen within the click
 * in Safari).
 */
type ExportCode = [
  typeof import("@/lib/export/chart-summary"),
  typeof import("@/lib/export/wheel-export"),
];
let exportCode: ExportCode | null = null;
let exportLoading: Promise<ExportCode> | null = null;

function loadExportCode(): Promise<ExportCode> {
  if (exportCode) return Promise.resolve(exportCode);
  exportLoading ??= importWithRetry(
    () => Promise.all([import("@/lib/export/chart-summary"), import("@/lib/export/wheel-export")]),
    { attempts: 2 },
  ).then(
    (code) => (exportCode = code),
    (err: unknown) => {
      exportLoading = null;
      throw err;
    },
  );
  return exportLoading;
}

function exportAhead() {
  loadExportCode().catch(() => {});
}

/** The share sheet's code (components/share/share-ui.tsx, drawn by ExportMenu.tsx's ShareHost), ahead when "Share a link" is pointed at or focused. */
const shareAhead = () => prefetch(() => import("@/components/share/share-ui"));

function slugName(name: string) {
  return (
    name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .toLowerCase() || "chart"
  );
}

const CAPTION_KEY = "ulune.export.caption";

/** The band under an exported image: the name, then the birth's date, time, place and houses. */
function figureCaption(
  chart: NatalChart,
  locale: string,
  timeUnknown: boolean,
  t: ReturnType<typeof useI18n>["t"],
) {
  const m = chart.meta;
  const line = [
    formatEuropeanDate(m.date) || m.date,
    timeUnknown || m.timeUnknown ? t("timeUnknown") : m.time,
    m.placeLabel,
    HOUSE_SYSTEM_LABEL[m.houseSystem] ? t(HOUSE_SYSTEM_LABEL[m.houseSystem]) : "",
  ].filter(Boolean);
  void locale;
  return { title: m.name || "Ulune", line: line.join(" · ") };
}

/**
 * The ways out, as menu items: a link to the chart (share plan, feature 1),
 * download the figure, print a chart sheet, copy a summary, then what the
 * page adds (the Calendar's file, a table's text and CSV) in `extraSlot`.
 * Drawn in the Share and export menu on a computer and in the toolbar's ⋯
 * menu on a phone (UI plan, part 96).
 */
export function ExportItems({
  close,
  extraSlot,
}: {
  close: () => void;
  extraSlot?: (el: HTMLElement | null) => void;
}) {
  const { locale, t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const timeUnknown = useStudioStore((s) => s.timeUnknown);
  const view = useStudioStore((s) => s.view);
  const page = useStudioStore((s) => s.page);
  const [busy, setBusy] = useState(false);
  // Whose chart and which moment, in a band under the image (on by default; off for privacy).
  const [withCaption, setWithCaption] = useState(() => {
    try {
      // Off until asked for: an image is often shared, and birth details are personal.
      return typeof window !== "undefined" && window.localStorage.getItem(CAPTION_KEY) === "1";
    } catch {
      return false;
    }
  });
  // A page's own items, drawn into the menu's end: picking one closes it too.
  const [extra, setExtra] = useState<HTMLElement | null>(null);
  useEffect(() => {
    extraSlot?.(extra);
    if (!extra) return;
    const picked = (e: MouseEvent) => {
      // After the item's own click has run (React handles it at the root, later in the bubble).
      if ((e.target as HTMLElement).closest("[role=menuitem]:not(:disabled)")) window.setTimeout(close, 0);
    };
    extra.addEventListener("click", picked);
    return () => {
      extra.removeEventListener("click", picked);
      extraSlot?.(null);
    };
  }, [extra, extraSlot, close]);
  useEffect(exportAhead, []);
  // Opened before this download came (the menu's panel took the focus itself): the first item takes it.
  useEffect(() => {
    const at = document.activeElement;
    if (at instanceof HTMLElement && at.classList.contains("ob-popover")) at.querySelector<HTMLElement>("[role=menuitem]:not(:disabled)")?.focus({ preventScroll: true });
  }, []);
  // Ask someone for their chart (share and compare plan, idea B4): a link to Ulune's birth form for them, with or without a chart here.
  const ask = (
    <button
      type="button"
      role="menuitem"
      className="ob-menu-item"
      data-testid="ask-open"
      onClick={() => {
        close();
        openAskSheet();
      }}
    >
      <Send className="size-4" strokeWidth={1.75} aria-hidden />
      <span>{t("askChart")}</span>
    </button>
  );
  // No chart (the Calendar's sky alone, reorganisation plan R5; Feng Shui's Home, FS13): the request, then the page's own items, its file and its table.
  if (!chart)
    return (
      <>
        {ask}
        {extraSlot ? <div ref={setExtra} className="ob-menu-extra" /> : null}
      </>
    );
  const name = slugName(`${chart.meta.name || "ulune"}-${page}`);
  // A picture of the figure, where it is one drawing: not the Calendar's days nor numerology's cycles.
  const hasFigure = view === "wheel" && !MODE_META[page].noPicture;

  async function run(kind: "png" | "svg" | "print" | "copy") {
    if (!chart) return;
    setBusy(true);
    try {
      const [
        { chartSheetHtml, chartSummaryText, printHtml },
        { figurePng, findFigureSvg, saveBlob, serializeFigure },
      ] = exportCode ?? (await loadExportCode());
      if (kind === "copy") {
        await navigator.clipboard.writeText(chartSummaryText(chart, locale, timeUnknown));
        toast(t("exportCopied"));
        return;
      }
      const svgEl = findFigureSvg();
      if (kind === "print") {
        const natalSvg = page === "natal" && svgEl ? await serializeFigure(svgEl, 900) : null;
        printHtml(chartSheetHtml(chart, locale, natalSvg, timeUnknown));
        return;
      }
      if (!svgEl) {
        toast(t("exportNoFigure"), "error");
        return;
      }
      const size = 1600;
      const text = await serializeFigure(
        svgEl,
        size,
        withCaption ? figureCaption(chart, locale, timeUnknown, t) : null,
      );
      if (kind === "svg") {
        saveBlob(`${name}.svg`, new Blob([text], { type: "image/svg+xml" }));
      } else {
        const h = Number(/^<svg[^>]*\sheight="(\d+)"/.exec(text)?.[1]) || size;
        const png = await figurePng(text, size, h);
        if (!png) throw new Error("png");
        saveBlob(`${name}.png`, png);
      }
      toast(t("exportSaved"));
    } catch {
      toast(t("exportFailed"), "error");
    } finally {
      setBusy(false);
      close();
    }
  }

  const item = (
    kind: "png" | "svg" | "print" | "copy",
    icon: React.ReactNode,
    label: string,
    disabled = false,
  ) => (
    <button
      type="button"
      role="menuitem"
      className="ob-menu-item"
      data-testid={`export-${kind}`}
      disabled={disabled || busy}
      onClick={() => void run(kind)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {/* A link to the chart first (share plan, feature 1): its sheet comes when asked for (ShareHost above). */}
      <button
        type="button"
        role="menuitem"
        className="ob-menu-item"
        data-testid="share-open"
        onPointerEnter={shareAhead}
        onFocus={shareAhead}
        onClick={() => {
          close();
          openShareSheet();
        }}
      >
        <Share2 className="size-4" strokeWidth={1.75} aria-hidden />
        <span>{t("shareLink")}</span>
      </button>
      {ask}
      {/* The picture's ways out only where there is a picture (part 97: no greyed items on a table). */}
      {hasFigure
        ? item(
            "png",
            <FileImage className="size-4" strokeWidth={1.75} aria-hidden />,
            t("exportPng"),
          )
        : null}
      {hasFigure
        ? item(
            "svg",
            <Download className="size-4" strokeWidth={1.75} aria-hidden />,
            t("exportSvg"),
          )
        : null}
      {hasFigure ? (
        <label className="ob-menu-item ob-menu-check" data-testid="export-caption">
          <input
            type="checkbox"
            checked={withCaption}
            onChange={(e) => {
              setWithCaption(e.target.checked);
              try {
                window.localStorage.setItem(CAPTION_KEY, e.target.checked ? "1" : "0");
              } catch {
                /* this visit only */
              }
            }}
          />
          <span>{t("exportCaption")}</span>
        </label>
      ) : null}
      {item(
        "print",
        <Printer className="size-4" strokeWidth={1.75} aria-hidden />,
        t("exportPrint"),
      )}
      {item("copy", <Copy className="size-4" strokeWidth={1.75} aria-hidden />, t("exportCopy"))}
      {extraSlot ? <div ref={setExtra} className="ob-menu-extra" /> : null}
    </>
  );
}
