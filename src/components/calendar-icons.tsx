import { AspectGlyph, PlanetGlyph, SignGlyph } from "@/components/glyphs";
import { MoonGlyph } from "@/components/moon-glyph";
import { ASPECT_COLOR, ELEMENT_COLOR, SIGN_META } from "@/lib/chart/constants";
import { seasonOf, type PhaseIndex, type SkyAspect, type SkyEvent } from "@/lib/chart/sky-events";
import { SIGN_IDS } from "@/lib/chart/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale";

const PHASE_ELONG: Record<PhaseIndex, number> = { 0: 0, 1: 90, 2: 180, 3: 270 };

/** A sign's glyph in its element's colour. */
export function SignMark({ sign, size }: { sign: number; size: number }) {
  const id = SIGN_IDS[((sign % 12) + 12) % 12]!;
  return (
    <span className="ulune-cal-sign" style={{ color: ELEMENT_COLOR[SIGN_META[id].element] }} aria-hidden>
      <SignGlyph id={id} size={size} />
    </span>
  );
}

/** Two bodies and their aspect: moving, aspect, natal (or the sky's two planets). */
export function PairIcon({ a, type, b, size = 14 }: { a: string; type: SkyAspect; b: string; size?: number }) {
  return (
    <span className="ulune-cal-icon" aria-hidden>
      <PlanetGlyph id={a} size={size} />
      <span style={{ color: ASPECT_COLOR[type] }}>
        <AspectGlyph id={type} size={Math.round(size * 0.8)} />
      </span>
      <PlanetGlyph id={b} size={size} />
    </span>
  );
}

/**
 * An event's glyphs: the phase drawn, planet → sign, planet ℞ or D, the Sun
 * for a season, an eclipse disc, the two planets of an aspect, v/c for a
 * void-of-course Moon.
 */
export function SkyEventIcon({ ev, size = 13 }: { ev: SkyEvent; size?: number }) {
  const { locale } = useI18n();
  if (ev.k === "phase") return <MoonGlyph elong={PHASE_ELONG[ev.phase]} size={size} />;
  if (ev.k === "eclipse") return <span className={cn("ulune-cal-eclipse", ev.kind === "lunar" && "is-lunar")} style={{ width: size, height: size }} aria-hidden />;
  if (ev.k === "station") {
    return (
      <span className="ulune-cal-icon" aria-hidden>
        <PlanetGlyph id={ev.body} size={size} />
        <span className="ulune-cal-turn">{ev.turn === "rx" ? "℞" : "D"}</span>
      </span>
    );
  }
  if (ev.k === "aspect") return <PairIcon a={ev.a} type={ev.type} b={ev.b} size={size} />;
  if (ev.k === "void") {
    return (
      <span className="ulune-cal-vc" aria-hidden>
        {locale === "fr" ? "VC" : "v/c"}
      </span>
    );
  }
  if (seasonOf(ev) != null) {
    return (
      <span className="ulune-cal-icon" style={{ color: "var(--aspect-conj)" }} aria-hidden>
        <PlanetGlyph id="sun" size={size} />
      </span>
    );
  }
  return (
    <span className="ulune-cal-icon" aria-hidden>
      <PlanetGlyph id={ev.body} size={size} />
      {ev.rx ? <span className="ulune-cal-turn">℞</span> : null}
      <span className="ulune-cal-arrow">→</span>
      <SignMark sign={ev.sign} size={size - 1} />
    </span>
  );
}
