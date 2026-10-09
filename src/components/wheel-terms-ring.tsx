import { SOLAR_TERMS } from "@/lib/chinese/names";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import type { NatalChart } from "@/lib/chart/types";
import { arcSpan } from "@/lib/chart/wheel-layout";

/** The device's own Chinese font (languages plan: nothing downloaded). */
const CJK = '"PingFang TC", "PingFang SC", "Noto Sans CJK TC", "Noto Sans CJK SC", "Microsoft JhengHei", "Microsoft YaHei", sans-serif';

const ANGLES = ["ascendant", "midheaven", "descendant", "ic"] as const;
/** The shortest way round between two longitudes, degrees. */
const apart = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * The Chinese solar terms as a quiet ring round the zodiac (languages plan,
 * part 6: "the natal and transit wheels can show the 24 terms as a quiet
 * outer ring"), switched on in the Look tab, off by default. The terms are
 * the Sun's own degrees (Lichun 15° Aquarius, the jie at 15° of each sign,
 * the principal terms at 0°), so the ring needs no ephemeris. On a single
 * wheel: a tick at each just outside the zodiac, and its name in the
 * reader's chosen form (characters, or pinyin), leaving out a name an
 * angle's label (within 7°) or a stellium's bracket and count would cover.
 * A bi-wheel's outer ring lives there: its ticks notch the zodiac band's
 * outer edge instead, and the names wait for the single wheel and the
 * Calendar. Its own download, with the terms' names, when switched on.
 */
export function WheelTermsRing({
  at,
  single,
  radii,
  chart,
  visible,
  stelliums,
}: {
  /** The wheel's own placing: an ecliptic longitude at a radius, in its units. */
  at: (ecliptic: number, r: number) => { x: number; y: number };
  single: boolean;
  /** The zodiac's outer circle and its band's outer edge, and where the names go. */
  radii: { outer: number; signOut: number; name: number };
  chart: NatalChart;
  visible: ReadonlySet<string>;
  /** Stelliums are drawn (their brackets just outside the zodiac). */
  stelliums: boolean;
}) {
  const prefs = useChinesePrefs();
  const f = (n: number) => n.toFixed(2);
  const brackets = stelliums
    ? (chart.patterns.stelliums ?? []).flatMap((st) => {
        if (/^House\s+\d+$/i.test(st.place)) return [];
        const lons = st.members.map((m) => chart.planets.find((b) => b.id === m)?.ecliptic).filter((e): e is number => e != null);
        return lons.length >= 3 ? [arcSpan(lons)] : [];
      })
    : [];
  const taken = (lon: number) =>
    ANGLES.some((k) => {
      const ang = chart.angles[k];
      return Boolean(ang) && visible.has(k) && apart(ang!.ecliptic, lon) < 7;
    }) || brackets.some((span) => (((lon - (span.from - 3)) % 360) + 360) % 360 <= span.len + 6);
  return (
    <g data-kind="terms-ring" data-testid="wheel-terms-ring" aria-hidden pointerEvents="none">
      {SOLAR_TERMS.map((term) => {
        const len = term.kind === "jie" ? 6 : 4;
        const r0 = single ? radii.outer : radii.signOut;
        const a = at(term.longitude, r0);
        const b = at(term.longitude, single ? r0 + len : r0 - len);
        const p = single && !taken(term.longitude) ? at(term.longitude, radii.name) : null;
        return (
          <g key={term.id} data-term={term.id}>
            <line
              x1={f(a.x)}
              y1={f(a.y)}
              x2={f(b.x)}
              y2={f(b.y)}
              // On a bi-wheel, notches cut into the zodiac's coloured band.
              stroke={single ? "var(--color-fg-subtle)" : "var(--color-bg)"}
              strokeWidth={single ? (term.kind === "jie" ? 1.15 : 0.9) : 1.6}
            />
            {p ? (
              <text
                x={f(p.x)}
                y={f(p.y)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={prefs.show === "full" ? 8.5 : 7.5}
                fill="var(--color-fg-subtle)"
                lang={prefs.show === "full" ? (prefs.script === "hans" ? "zh-Hans" : "zh-Hant") : "zh-Latn-pinyin"}
                fontFamily={prefs.show === "full" ? CJK : "var(--font-ui)"}
              >
                {prefs.show === "full" ? term[prefs.script] : term.pinyin}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
