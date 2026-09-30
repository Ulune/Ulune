import { MousePointer2 } from "lucide-react";
import { AspectGlyph } from "./glyphs";
import { useI18n } from "@/lib/i18n/locale";
import { setWheelPrefs, useWheelPrefs } from "@/lib/chart/wheel-prefs";

/**
 * The chart's two switches, in its zoom bar (part 82): highlighting what the
 * pointer is on (a click always pins), and every aspect's glyph on its line at
 * rest (pointing or a click shows a line's glyph either way). Kept on this
 * device. A touch screen has no pointing, so it offers the glyphs only; the
 * 3D view draws its own glyphs, so it offers the highlighting only.
 */
export function WheelToggles({ in3d }: { in3d: boolean }) {
  const { t } = useI18n();
  const prefs = useWheelPrefs();
  return (
    <>
      <button
        type="button"
        className="ulune-wheel-zoom-btn ulune-wheel-switch ulune-wheel-switch-hover"
        data-testid="wheel-hover-switch"
        aria-pressed={prefs.hover}
        aria-label={t("wheelHoverToggle")}
        title={t("wheelHoverToggle")}
        onClick={() => setWheelPrefs({ hover: !prefs.hover })}
      >
        <MousePointer2 className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
      {in3d ? null : (
        <button
          type="button"
          className="ulune-wheel-zoom-btn ulune-wheel-switch"
          data-testid="wheel-marks-switch"
          aria-pressed={prefs.marks}
          aria-label={t("wheelMarksToggle")}
          title={t("wheelMarksToggle")}
          onClick={() => setWheelPrefs({ marks: !prefs.marks })}
        >
          <AspectGlyph id="trine" size={24} />
        </button>
      )}
    </>
  );
}
