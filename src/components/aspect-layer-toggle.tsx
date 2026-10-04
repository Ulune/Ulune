import type { ReactNode } from "react";
import { RingsMenu } from "@/components/rings-menu";
import type { AspectLayer } from "@/lib/chart/chart-view";
import { useI18n } from "@/lib/i18n/locale";

type Kind = "transit" | "synastry" | "progressions";

/** The switch's words (review 3 Oct, P2): who each layer is, and one line saying what it draws. */
function layerWords(kind: Kind, t: ReturnType<typeof useI18n>["t"], names?: { a: string; b: string }) {
  if (kind === "synastry") {
    const a = firstName(names?.a) || "A";
    const b = firstName(names?.b) || "B";
    return {
      natal: { label: a, line: t("layerOwnLine", { name: a }) },
      outer: { label: b, line: t("layerOwnLine", { name: b }) },
      both: { label: t("layerBothCharts"), line: t("layerBothChartsLine") },
      cross: { label: t("layerBetween"), line: t("layerBetweenLine", { a, b }) },
    };
  }
  const outer = kind === "transit" ? "layerTransits" : "layerProgressed";
  const cross = kind === "transit" ? "layerTransitsToYou" : "layerProgressedToYou";
  const crossLine = kind === "transit" ? "layerTransitsToYouLine" : "layerProgressedToYouLine";
  const outerLine = kind === "transit" ? "layerTransitsLine" : "layerProgressedLine";
  return {
    natal: { label: t("layerYourChart"), line: t("layerYourChartLine") },
    outer: { label: t(outer), line: t(outerLine) },
    both: { label: t("layerBoth"), line: t("layerBothLine") },
    cross: { label: t(cross), line: t(crossLine) },
  };
}

/** "Camille" for Camille Marie Laurent: a switch's word. */
function firstName(name: string | undefined): string {
  const n = (name ?? "").trim();
  return n.length > 12 ? (n.split(/\s+/)[0] ?? n) : n;
}

export function AspectLayerToggle({
  value,
  onChange,
  kind,
  names,
}: {
  value: AspectLayer;
  onChange: (next: AspectLayer) => void;
  kind: Kind;
  /** The two people, for synastry's words. */
  names?: { a: string; b: string };
}) {
  const { t } = useI18n();
  const words = layerWords(kind, t, names);
  const order: AspectLayer[] = ["natal", "outer", "both", "cross"];
  // One button in the stage's toolbar, its choices said in its menu (UI plan, part 93).
  return (
    <RingsMenu
      testId="aspect-layer"
      ariaLabel={t("aspectLayer")}
      value={value}
      onChange={onChange}
      options={order.map((id) => ({ value: id, label: words[id].label, line: words[id].line }))}
    />
  );
}

/** Wheel stays in the natal box; banner / aspect / footer stay in-flow around it. */
export function BiWheelFrame({
  kind,
  value,
  onChange,
  children,
  footer,
  banner,
  names,
}: {
  kind: Kind;
  names?: { a: string; b: string };
  value: AspectLayer;
  onChange: (next: AspectLayer) => void;
  children: ReactNode;
  footer?: ReactNode;
  banner?: ReactNode;
}) {
  return (
    <div className="ulune-biwheel">
      {banner ? <div className="ulune-biwheel-banner">{banner}</div> : null}
      <AspectLayerToggle kind={kind} value={value} onChange={onChange} names={names} />
      {children}
      {footer ? <div className="ulune-biwheel-footer">{footer}</div> : null}
    </div>
  );
}
