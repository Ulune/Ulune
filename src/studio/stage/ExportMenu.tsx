import { Copy, Download, FileImage, Printer, Share2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AnchoredPopover } from "@/components/anchored-popover";
import { useI18n } from "@/lib/i18n/locale";
import { importWithRetry } from "@/lib/lazy-retry";
import { toast } from "@/lib/toast";
import { useStudioStore } from "@/studio/store";

/*
 * The export code is its own download, fetched when the menu is pointed at,
 * focused or opened, so it is there by the time an item is picked (copying
 * must happen within the click in Safari).
 */
type ExportCode = [typeof import("@/lib/export/chart-summary"), typeof import("@/lib/export/wheel-export")];
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

function slugName(name: string) {
  return name.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").toLowerCase() || "chart";
}

/** Stage footer: download the figure, print a chart sheet, copy a summary. */
export function ExportMenu() {
  const { locale, t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const timeUnknown = useStudioStore((s) => s.timeUnknown);
  const view = useStudioStore((s) => s.view);
  const page = useStudioStore((s) => s.page);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  if (!chart) return null;
  const name = slugName(`${chart.meta.name || "ulune"}-${page}`);
  const hasFigure = view === "wheel";

  async function run(kind: "png" | "svg" | "print" | "copy") {
    if (!chart) return;
    setBusy(true);
    try {
      const [{ chartSheetHtml, chartSummaryText, printHtml }, { figurePng, findFigureSvg, saveBlob, serializeFigure }] =
        exportCode ?? (await loadExportCode());
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
      const text = await serializeFigure(svgEl, size);
      if (kind === "svg") {
        saveBlob(`${name}.svg`, new Blob([text], { type: "image/svg+xml" }));
      } else {
        const vb = svgEl.viewBox.baseVal;
        const h = vb && vb.width ? Math.round((size * vb.height) / vb.width) : size;
        const png = await figurePng(text, size, h);
        if (!png) throw new Error("png");
        saveBlob(`${name}.png`, png);
      }
      toast(t("exportSaved"));
    } catch {
      toast(t("exportFailed"), "error");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  const item = (kind: "png" | "svg" | "print" | "copy", icon: React.ReactNode, label: string, disabled = false) => (
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
      <button
        ref={ref}
        type="button"
        className="ob-icon-btn ob-export-btn"
        data-testid="export-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("exportMenu")}
        title={t("exportMenu")}
        onPointerEnter={exportAhead}
        onFocus={exportAhead}
        onClick={() => {
          exportAhead();
          setOpen((v) => !v);
        }}
      >
        <Share2 className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
      <AnchoredPopover open={open} anchorRef={ref} onClose={close} hideLabel={t("hidePanel")} align="end" width={248} backdrop={false}>
        <div role="menu" aria-label={t("exportMenu")} className="ob-menu" data-testid="export-panel">
          {item("png", <FileImage className="size-4" strokeWidth={1.75} aria-hidden />, t("exportPng"), !hasFigure)}
          {item("svg", <Download className="size-4" strokeWidth={1.75} aria-hidden />, t("exportSvg"), !hasFigure)}
          {item("print", <Printer className="size-4" strokeWidth={1.75} aria-hidden />, t("exportPrint"))}
          {item("copy", <Copy className="size-4" strokeWidth={1.75} aria-hidden />, t("exportCopy"))}
        </div>
      </AnchoredPopover>
    </>
  );
}
