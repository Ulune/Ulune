import type { ReactNode } from "react";
import { SegmentedToggle } from "@/components/segmented-toggle";
import type { AspectLayer } from "@/lib/chart/chart-view";
import { useI18n } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";

const OUTER_LABEL: Record<"transit" | "synastry" | "progressions", MessageKey> = {
  transit: "aspectLayerOuterTransits",
  progressions: "aspectLayerOuterProgressed",
  synastry: "aspectLayerOuterPartner",
};

const CROSS_LABEL: Record<"transit" | "synastry" | "progressions", MessageKey> = {
  transit: "aspectLayerCrossTransits",
  progressions: "aspectLayerCrossProgressed",
  synastry: "aspectLayerCrossPartner",
};

export function AspectLayerToggle({
  value,
  onChange,
  kind,
}: {
  value: AspectLayer;
  onChange: (next: AspectLayer) => void;
  kind: "transit" | "synastry" | "progressions";
}) {
  const { t } = useI18n();
  return (
    <div className="ulune-aspect-layer" data-testid="aspect-layer">
      <SegmentedToggle
        ariaLabel={t("aspectLayer")}
        value={value}
        onChange={onChange}
        options={[
          {
            value: "natal",
            testId: "aspect-layer-natal",
            label: t("aspectLayerNatal"),
            title: t("aspectLayerNatalHint"),
          },
          {
            value: "outer",
            testId: "aspect-layer-outer",
            label: t(OUTER_LABEL[kind]),
            title: t("aspectLayerOuterHint"),
          },
          {
            value: "both",
            testId: "aspect-layer-both",
            label: t("aspectLayerBoth"),
            title: t("aspectLayerBothHint"),
          },
          {
            value: "cross",
            testId: "aspect-layer-cross",
            label: t(CROSS_LABEL[kind]),
            title: t("aspectLayerCrossHint"),
          },
        ]}
      />
    </div>
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
}: {
  kind: "transit" | "synastry" | "progressions";
  value: AspectLayer;
  onChange: (next: AspectLayer) => void;
  children: ReactNode;
  footer?: ReactNode;
  banner?: ReactNode;
}) {
  return (
    <div className="ulune-biwheel">
      {banner ? <div className="ulune-biwheel-banner">{banner}</div> : null}
      <AspectLayerToggle kind={kind} value={value} onChange={onChange} />
      {children}
      {footer ? <div className="ulune-biwheel-footer">{footer}</div> : null}
    </div>
  );
}
