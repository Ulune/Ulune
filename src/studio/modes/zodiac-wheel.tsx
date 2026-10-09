import { useRef, type KeyboardEvent } from "react";
import { AnimalGlyph } from "@/components/animal-glyph";
import { BRANCHES, PHASES } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { branchAngle } from "@/lib/chinese/zodiac";
import { branchRef } from "@/lib/chinese/zodiac-reading";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { useWheelView } from "@/studio/modes/wheel-view";
import { CJK, animalChar, hanziLang } from "@/lib/chinese/animal-chars";

/*
 * The wheel of the twelve animals (languages plan, parts 7–11), each in its
 * compass place (the Rat at the north, at the top; the Rabbit east, the
 * Horse south, the Rooster west), in its branch's phase colour, with the
 * animals of one person (Chinese astrology's Natal page) or two (its Pair
 * page) as badges inside the ring, the relations between them as lines
 * (harmonies and trines solid, clashes dashed across), this year's and this
 * month's animals on the rim and a pillar in the centre. One Tab stop for
 * the ring; the arrows walk round it, Enter opens an animal.
 */

const C = 200;
const R_OUT = 188;
const R_IN = 116;

const at = (angle: number, r: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};
const f = (n: number) => n.toFixed(2);

/** A sector of the ring between two radii, centred on an angle (degrees clockwise from the top). */
function sector(angle: number, r0: number, r1: number): string {
  const a0 = at(angle - 15, r1);
  const a1 = at(angle + 15, r1);
  const b1 = at(angle + 15, r0);
  const b0 = at(angle - 15, r0);
  return `M ${f(a0.x)} ${f(a0.y)} A ${r1} ${r1} 0 0 1 ${f(a1.x)} ${f(a1.y)} L ${f(b1.x)} ${f(b1.y)} A ${r0} ${r0} 0 0 0 ${f(b0.x)} ${f(b0.y)} Z`;
}

/** A person's animal on the wheel: its place's initial in a badge (Y, M, D, H; A, M, J, H in French). */
export type WheelBadge = {
  /** Unique on the wheel ("year", "b-day"). */
  key: string;
  branch: number;
  initial: string;
  /** The reading it opens. */
  ref: string;
  /** Its place, for the tests ("year", "day"). */
  place: string;
  testId: string;
  uncertain?: boolean;
  /** On the Pair page: the first person's (filled) or the second's (a ring). */
  person?: "a" | "b";
};

/** A relation drawn between two animals: a harmony or a trine solid, a clash dashed across. */
export type WheelLine = { ref: string; kind: "harmony" | "trine" | "clash"; a: number; b: number };

export function AnimalWheel({
  badges,
  lines,
  mine,
  stopBranch,
  nowYearBranch,
  nowMonthBranch,
  centre,
  label,
}: {
  badges: readonly WheelBadge[];
  lines: readonly WheelLine[];
  /** What a cell says of the animal's place in this chart, for a screen reader ("yours: year, month"), or "". */
  mine: (branch: number) => string;
  /** The animal that holds the ring's one Tab stop when nothing on it is chosen. */
  stopBranch: number;
  nowYearBranch: number;
  nowMonthBranch: number;
  centre: { hanzi: string | null; name: string; sub: string };
  label: string;
}) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const ring = useRef<SVGGElement>(null);
  const selectedBranch = /^zk:branch:(\d+)$/.exec(w.selectedId ?? "")?.[1];
  const stop = selectedBranch != null ? Number(selectedBranch) : stopBranch;
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const el = (e.target as Element).closest<SVGGElement>("[data-branch]");
    if (!el) return;
    const b = Number(el.dataset.branch);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (b + 1) % 12;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (b + 11) % 12;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 11;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      w.pick(branchRef(b));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ring.current?.querySelector<SVGGElement>(`[data-branch="${next}"]`)?.focus();
  };
  const nowYear = new Date().getFullYear();
  // Badges by animal: one person's stack inward from the ring; two people's stand side by side, each stacking.
  const byBranch = new Map<number, WheelBadge[]>();
  for (const b of badges) byBranch.set(b.branch, [...(byBranch.get(b.branch) ?? []), b]);
  return (
    <svg viewBox="-24 -24 448 448" className="ulune-zk-wheel" role="group" aria-label={label} data-testid="zodiac-wheel">
      <circle cx={C} cy={C} r={R_OUT} className="ulune-zk-rim" />
      <g ref={ring} onKeyDown={onKey}>
        {BRANCHES.map((b) => {
          const angle = branchAngle(b.index);
          const here = byBranch.get(b.index) ?? [];
          const animal = chineseLabel(b, locale, prefs);
          const ref = branchRef(b.index);
          const on = w.selectedId === ref || here.some((x) => w.selectedId === x.ref);
          // Each animal's words stand upright, stacked at its cell's middle (the cells are about as
          // wide as they are deep all round the ring): the branch, the animal, its name.
          const mid = at(angle, (R_IN + R_OUT) / 2);
          const phase = PHASES.find((p) => p.id === b.phase)!;
          const spoken = [
            `${animal.name}${animal.pinyin ? ` (${animal.pinyin})` : ""}`,
            (locale === "fr" ? phase.fr : phase.en).toLowerCase(),
            mine(b.index),
            b.index === nowYearBranch ? cnWord(locale, "zkSectorNow") : "",
            b.index === nowMonthBranch ? cnWord(locale, "zkSectorNowMonth") : "",
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <g
              key={b.id}
              data-branch={b.index}
              data-mine={here.length || undefined}
              data-phase={b.phase}
              data-testid={`zodiac-sector-${b.id}`}
              className={cn("ulune-zk-sector", here.length && "is-mine", on && "is-on")}
              role="button"
              tabIndex={b.index === stop ? 0 : -1}
              aria-label={spoken}
              aria-pressed={on}
              onClick={() => w.choose(ref)}
              {...previewProps(ref)}
            >
              <path d={sector(angle, R_IN, R_OUT)} className="ulune-zk-cell" />
              {prefs.show !== "names" ? (
                <text x={f(mid.x)} y={f(mid.y - 25)} className="ulune-zk-branch" lang={prefs.show === "full" ? hanziLang(prefs.script) : undefined}>
                  {prefs.show === "full" ? `${b[prefs.script]} ${b.pinyin}` : b.pinyin}
                </text>
              ) : null}
              {prefs.animals === "drawings" ? (
                <>
                  <AnimalGlyph animal={b.animal} size={28} x={f(mid.x - 14)} y={f(mid.y - (prefs.show === "names" ? 21 : 17))} className="ulune-zk-glyph" />
                  <text x={f(mid.x)} y={f(mid.y + (prefs.show === "names" ? 19 : 22))} className="ulune-zk-name">
                    {animal.name}
                  </text>
                </>
              ) : prefs.show === "full" ? (
                <>
                  <text x={f(mid.x)} y={f(mid.y - 2)} className="ulune-zk-hanzi" lang={hanziLang(prefs.script)} fontFamily={CJK}>
                    {animalChar(b.animal, prefs.script)}
                  </text>
                  <text x={f(mid.x)} y={f(mid.y + 21)} className="ulune-zk-name">
                    {animal.name}
                  </text>
                </>
              ) : (
                <text x={f(mid.x)} y={f(mid.y + 4)} className="ulune-zk-name is-big">
                  {animal.name}
                </text>
              )}
            </g>
          );
        })}
      </g>
      {/* The relations (part 8): harmonies and trines as lines, clashes dashed across. */}
      <g className="ulune-zk-lines" data-testid="zodiac-lines" aria-hidden>
        {lines.map((l) => {
          const a = at(branchAngle(l.a), R_IN);
          const b = at(branchAngle(l.b), R_IN);
          const on = w.selectedId === l.ref;
          return (
            <line
              key={l.ref}
              x1={f(a.x)}
              y1={f(a.y)}
              x2={f(b.x)}
              y2={f(b.y)}
              data-kind={l.kind}
              className={cn("ulune-zk-line", on && "is-on")}
              onClick={() => w.choose(l.ref)}
            />
          );
        })}
      </g>
      {/* The animals: a badge each, inside the ring at its animal; several on one animal stack inward. */}
      {[...byBranch.entries()].flatMap(([branch, list]) => {
        const two = list.some((x) => x.person === "b") && list.some((x) => x.person !== "b");
        const count = { a: 0, b: 0 };
        return list.map((x) => {
          const side = x.person === "b" ? "b" : "a";
          const i = count[side]++;
          const pt = at(branchAngle(branch) + (two ? (side === "a" ? -7 : 7) : 0), 98 - i * 24);
          return (
            <g
              key={x.key}
              className={cn("ulune-zk-badge", w.selectedId === x.ref && "is-on", x.uncertain && "is-uncertain", x.person === "b" && "is-b")}
              data-testid={x.testId}
              data-place={x.place}
              data-person={x.person}
              onClick={() => w.choose(x.ref)}
              aria-hidden
            >
              <circle cx={f(pt.x)} cy={f(pt.y)} r={11} />
              <text x={f(pt.x)} y={f(pt.y)}>
                {x.initial}
              </text>
            </g>
          );
        });
      })}
      {/* Now: this year's animal and this month's, on the rim. */}
      {(() => {
        const y = at(branchAngle(nowYearBranch), R_OUT + 13);
        const m = at(branchAngle(nowMonthBranch), R_OUT + 5);
        return (
          <g className="ulune-zk-now" aria-hidden data-testid="zodiac-now">
            <text x={f(y.x)} y={f(y.y)} className="ulune-zk-now-year" data-branch={nowYearBranch}>
              {nowYear}
            </text>
            <circle cx={f(m.x)} cy={f(m.y)} r={3.2} className="ulune-zk-now-month" data-branch={nowMonthBranch} />
          </g>
        );
      })()}
      {/* The centre: a pillar, its name and what it is. */}
      <g className="ulune-zk-centre" aria-hidden>
        {centre.hanzi ? (
          <text x={C} y={C - 14} className="ulune-zk-centre-hanzi" lang={hanziLang(prefs.script)} fontFamily={CJK}>
            {centre.hanzi}
          </text>
        ) : null}
        <text x={C} y={centre.hanzi ? C + 18 : C - 4} className="ulune-zk-centre-name">
          {centre.name}
        </text>
        <text x={C} y={centre.hanzi ? C + 36 : C + 16} className="ulune-zk-centre-sub">
          {centre.sub}
        </text>
      </g>
    </svg>
  );
}
