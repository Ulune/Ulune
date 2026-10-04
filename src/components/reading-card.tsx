import { ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { SIGN_META } from "@/lib/chart/constants";
import type { AspectId } from "@/lib/chart/types";
import type { ElementReading, NatalChart, SignId } from "@/lib/chart/types";
import type { ReadingDepth } from "@/lib/chart/chart-view";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { useI18n } from "@/lib/i18n/locale";
import { AspectGlyph, PlanetGlyph, SignGlyph } from "./glyphs";
import { MoonGlyph } from "./moon-glyph";
import { ASPECT_IDS } from "@/lib/chart/types";
import { SIGN_IDS, decanOf } from "@/lib/chart/constants";
import { previewProps } from "@/lib/depth/preview-bus";
import { aspectVisible } from "@/lib/chart/aspect-filter";
import { useChartView } from "@/lib/chart/use-chart-view";
import type { ReadingLink } from "@/lib/chart/types";


function aspectTypeFromReadingId(id: string): AspectId | null {
  const body = id.startsWith("aspect:") ? id.slice(7) : id;
  const ranked = [...ASPECT_IDS].sort((a, b) => b.length - a.length);
  for (const type of ranked) {
    // Chart aspects (sun_trine_moon), a slow transit's window (win:saturn:square:sun:…),
    // two planets of the sky (sky:aspect-sun-trine-uranus-…).
    if (body.includes(`_${type}_`) || body.includes(`:${type}:`) || body.includes(`-${type}-`)) return type;
  }
  return null;
}

/** A calendar event's mark, from its id (lib/chart/sky-events.ts, skyEventId). */
function SkyEventMark({ id, size }: { id: string; size: number }) {
  const [kind, a, b] = id.split("-");
  if (kind === "phase") return <MoonGlyph elong={Number(a) * 90} size={size} />;
  if (kind === "eclipse") {
    return <span className={a === "lunar" ? "ulune-cal-eclipse is-lunar" : "ulune-cal-eclipse"} style={{ width: size, height: size }} aria-hidden />;
  }
  if (kind === "ingress" || kind === "station") return <PlanetGlyph id={a ?? ""} size={size} />;
  if (kind === "aspect" && b && (ASPECT_IDS as readonly string[]).includes(b)) return <AspectGlyph id={b as AspectId} size={size} />;
  if (kind === "void") return <PlanetGlyph id="moon" size={size} />;
  return null;
}

export function ReadingMark({ reading, size = 26 }: { reading: ElementReading; size?: number }) {
  const raw = reading.id.includes(":") ? reading.id.slice(reading.id.indexOf(":") + 1) : reading.id;
  // A row of the Human Design columns (act:design:mars): its body's glyph.
  if (reading.id.startsWith("act:")) return <PlanetGlyph id={reading.id.split(":")[2] ?? ""} size={size} />;
  if (reading.id.startsWith("sky:")) return <SkyEventMark id={reading.id.slice(4)} size={size} />;
  if (reading.id.startsWith("moon:")) return <PlanetGlyph id="moon" size={size} />;
  if (reading.mark) return <span className="ob-rc-mark-text">{reading.mark}</span>;
  if (reading.kind === "planet" || reading.kind === "angle") {
    return <PlanetGlyph id={raw} size={size} />;
  }
  if (reading.kind === "sign") {
    return <SignGlyph id={raw as SignId} size={size} />;
  }
  if (reading.kind === "aspect") {
    const type = aspectTypeFromReadingId(reading.id);
    return type ? <AspectGlyph id={type} size={size} /> : <span className="text-sm">∠</span>;
  }
  if (reading.kind === "house") {
    return /^\d+$/.test(raw) ? <span className="ob-rc-mark-text">{raw}</span> : null;
  }
  if (reading.kind === "decan") {
    const dash = raw.lastIndexOf("-");
    const sign = raw.slice(0, dash) as SignId;
    const face = Number(raw.slice(dash + 1));
    const signIdx = SIGN_IDS.indexOf(sign);
    if (signIdx < 0 || face < 0 || face > 2) return null;
    return <PlanetGlyph id={decanOf(signIdx * 30 + face * 10 + 5).ruler} size={size} />;
  }
  return null;
}


function hasMark(reading: ElementReading) {
  if (reading.mark) return true;
  if (reading.kind !== "house") return true;
  return /^house:\d+$/.test(reading.id);
}

export type CardDepth = "short" | "full";
const DEPTH_KEY = "ulune.reading.depth";

function loadDepth(): CardDepth | null {
  try {
    const raw = window.localStorage.getItem(DEPTH_KEY);
    return raw === "short" || raw === "full" ? raw : null;
  } catch {
    return null;
  }
}

/** Short/Full, remembered per device; the view's depth is the first default. */
export function useCardDepth(viewDepth: ReadingDepth) {
  const fallback: CardDepth = viewDepth === "full" ? "full" : "short";
  const [depth, setDepth] = useState<CardDepth>(fallback);
  useEffect(() => {
    setDepth(loadDepth() ?? fallback);
  }, [fallback]);
  const set = (next: CardDepth) => {
    setDepth(next);
    try {
      window.localStorage.setItem(DEPTH_KEY, next);
    } catch {
      /* ignore */
    }
  };
  return [depth, set] as const;
}

const ASPECT_FAMILY: Record<string, string> = {
  conjunction: "conj",
  opposition: "hard",
  square: "hard",
  trine: "soft",
  sextile: "soft",
};

function signOfReading(reading: ElementReading, chart: NatalChart | null | undefined): SignId | null {
  const raw = reading.id.slice(reading.id.indexOf(":") + 1);
  if (reading.kind === "sign") return raw as SignId;
  if (reading.kind === "decan") return raw.slice(0, raw.lastIndexOf("-")) as SignId;
  if (!chart) return null;
  if (reading.kind === "planet") return chart.planets.find((p) => p.id === raw)?.sign ?? null;
  if (reading.kind === "angle") return chart.angles[raw as keyof NatalChart["angles"]]?.sign ?? null;
  if (reading.kind === "house") return chart.houses[Number(raw) - 1]?.sign ?? null;
  return null;
}

/** Colour of the reading's mark: the planet's own paint, else its sign's element. */
function useMarkColor(reading: ElementReading, chart: NatalChart | null | undefined) {
  const look = useLookShape();
  // Human Design's two layers: the Design in red, the Personality in ink.
  if (reading.id.startsWith("act:design:")) return "var(--hd-design-ink, var(--color-fg))";
  if (reading.id.startsWith("act:personality:")) return "var(--color-fg)";
  if (reading.kind === "aspect") {
    const type = aspectTypeFromReadingId(reading.id);
    return `var(--aspect-${type && ASPECT_FAMILY[type] ? ASPECT_FAMILY[type] : "minor"})`;
  }
  // The calendar's sky, days and Moon: in ink (the sky's aspects above, in their family's colour).
  if (/^(sky|moon|day):/.test(reading.id)) return "var(--color-fg)";
  const sign = signOfReading(reading, chart);
  if (!sign || !SIGN_META[sign]) return "var(--color-fg-muted)";
  if (reading.kind === "planet") return planetPaint(reading.id.slice(7), sign, look.planets);
  return `var(--el-${SIGN_META[sign].element})`;
}

/**
 * Readings that open with this chart and keep what the element is in general
 * for "About": a birth chart's own elements, and the bodygraph's gates,
 * channels and centres (not the Human Design keys, numerology or timing).
 */
const PERSONAL_FIRST = /^(planet|angle|house|sign|decan|aspect|gate|channel|center|core):/;

/**
 * One reading, laid out for scanning: mark, title and the facts that locate
 * it (each fact opens its own reading), then the meaning, the lead, what it
 * does in this chart and the rows it connects to. Full depth adds the longer
 * sections; "About" holds the teaching text for this kind of element.
 */
export function ReadingCard({
  reading,
  chart,
  depth,
  onDepth,
  onGo,
  back,
  onBack,
}: {
  reading: ElementReading;
  chart?: NatalChart | null;
  depth: CardDepth;
  onDepth: (d: CardDepth) => void;
  onGo?: (ref: string) => void;
  back?: string | null;
  onBack?: () => void;
}) {
  const { t } = useI18n();
  const color = useMarkColor(reading, chart);
  const full = depth === "full";
  // A body's aspects, as the wheel draws them (review 3 Oct, C2): those on the
  // wheel first, then the ones its filters leave off, under their own heading.
  const view = useChartView();
  const offWheel = (row: ReadingLink) => {
    if (!chart || !row.ref.startsWith("aspect:") || (reading.kind !== "planet" && reading.kind !== "angle")) return false;
    const a = chart.aspects.find((x) => `aspect:${x.id}` === row.ref);
    if (!a) return false;
    return !(view.visible.has(a.a) && view.visible.has(a.b) && aspectVisible(a, view.aspectFilter));
  };
  const linkRows = reading.links?.rows ?? [];
  const shownRows = linkRows.filter((r) => !offWheel(r));
  const offRows = linkRows.filter(offWheel);
  const structured = reading.lead != null || Boolean(reading.sections?.length);
  // Without a birth time, what hangs on the hour says so first (interpret-local.ts).
  const timeNote = reading.sections?.find((s) => s.id === "time");
  const otherSections = reading.sections?.filter((s) => s.id !== "time");
  const lead = structured ? reading.lead : reading.paragraphs[0];
  const rest = structured ? [] : reading.paragraphs.slice(1);
  // A reading starts with what the element does in this chart ("The Sun in
  // Capricorn…", "In your chart: Personality Venus…"); what the element is in
  // general ("The Sun is the star…", "A gate is one of the 64…") opens its
  // "About" instead of outweighing it.
  const noteInAbout = Boolean(reading.note && lead && reading.about) && PERSONAL_FIRST.test(reading.id);

  return (
    <article
      key={reading.id}
      className="ob-rc ulune-read"
      data-testid="reading-card"
      data-kind={reading.kind}
      data-depth={depth}
      style={{ ["--rc-tint" as string]: color }}
      aria-labelledby="ob-rc-title"
    >
      {back && onBack ? (
        <button type="button" className="ob-rc-back" data-testid="reading-back" onClick={onBack}>
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
          <span>{t("readingBack", { name: back })}</span>
        </button>
      ) : null}
      <header className="ob-rc-head">
        {hasMark(reading) ? (
          <span className="ob-rc-mark" style={{ color }} aria-hidden>
            <ReadingMark reading={reading} size={22} />
          </span>
        ) : null}
        <div className="ob-rc-heading">
          <h2 id="ob-rc-title" className="ob-rc-title">
            {reading.title}
          </h2>
          {reading.kicker && !reading.facts?.length ? <p className="ob-rc-kicker">{reading.kicker}</p> : null}
        </div>
        <div className="ob-rc-depth" role="radiogroup" aria-label={t("readingDepthLabel")}>
          {(["short", "full"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={depth === d}
              data-testid={`reading-depth-${d}`}
              className={depth === d ? "is-on" : undefined}
              onClick={() => onDepth(d)}
            >
              {d === "short" ? t("readingShort") : t("readingFull")}
            </button>
          ))}
        </div>
      </header>

      {reading.facts?.length ? (
        <ul className="ob-rc-facts" data-testid="reading-facts">
          {reading.facts.map((f) => (
            <li key={`${f.label}-${f.value}`}>
              {f.ref && onGo ? (
                <button
                  type="button"
                  className="ob-rc-fact is-link"
                  data-ref={f.ref}
                  onClick={() => onGo(f.ref!)}
                  {...previewProps(f.ref)}
                  aria-label={`${f.label}: ${f.value}. ${t("readingOpen")}`}
                >
                  <span className="ob-rc-fact-k">{f.label}</span>
                  <span className="ob-rc-fact-v">{f.value}</span>
                </button>
              ) : (
                <span className="ob-rc-fact">
                  <span className="ob-rc-fact-k">{f.label}</span>
                  <span className="ob-rc-fact-v">{f.value}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {reading.ai?.length ? (
        <section className="ob-rc-sec ob-rc-ai" data-testid="reading-ai">
          <h3 className="ob-rc-h">{t("readingComposed")}</h3>
          {(full ? reading.ai : reading.ai.slice(0, 1)).map((p, i) => (
            <p key={i} className="ob-rc-p">
              {p}
            </p>
          ))}
        </section>
      ) : null}

      {timeNote ? (
        <section className="ob-rc-sec" data-section="time" data-testid="reading-time">
          <h3 className="ob-rc-h">{timeNote.title}</h3>
          {timeNote.paragraphs.map((p, i) => (
            <p key={i} className="ob-rc-p">
              {p}
            </p>
          ))}
        </section>
      ) : null}

      {reading.note && !noteInAbout ? (
        <p className="ob-rc-note" data-testid="reading-note">
          {reading.note}
        </p>
      ) : null}

      {lead ? <p className={noteInAbout ? "ob-rc-lead ob-rc-lead--first" : "ob-rc-lead"}>{lead}</p> : null}

      {otherSections?.map((s) =>
        s.paragraphs.length ? (
          <section key={s.id} className="ob-rc-sec" data-section={s.id}>
            <h3 className="ob-rc-h">{s.title}</h3>
            {(full ? s.paragraphs : s.paragraphs.slice(0, 1)).map((p, i) => (
              <p key={i} className="ob-rc-p">
                {p}
              </p>
            ))}
            {!full && s.paragraphs.length > 1 ? (
              <button type="button" className="ob-rc-more" onClick={() => onDepth("full")}>
                {t("readingMore", { n: s.paragraphs.length - 1 })}
              </button>
            ) : null}
          </section>
        ) : null,
      )}

      {rest.length ? (
        full ? (
          <div className="ob-rc-sec">
            {rest.map((p, i) => (
              <p key={i} className="ob-rc-p">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <button type="button" className="ob-rc-more" onClick={() => onDepth("full")}>
            {t("readingMore", { n: rest.length })}
          </button>
        )
      ) : null}

      {reading.links?.rows.length ? (
        <section className="ob-rc-sec" data-testid="reading-links">
          <h3 className="ob-rc-h">{reading.links.title}</h3>
          {[shownRows, offRows].map((rows, gi) =>
            rows.length ? (
              <div key={gi} data-group={gi ? "off-wheel" : "on-wheel"}>
                {gi ? <p className="ob-rc-subh" data-testid="reading-links-off">{t("readingOffWheel")}</p> : null}
                <ul className="ob-rc-rows">
                  {rows.map((row) => (
                    <li key={`${row.ref}-${row.label}`}>
                      <button
                        type="button"
                        className="ob-rc-row"
                        data-ref={row.ref}
                        disabled={!onGo || !row.ref}
                        onClick={() => onGo?.(row.ref)}
                        {...previewProps(row.ref)}
                      >
                        <span className="ob-rc-row-main">
                          <span className="ob-rc-row-label">{row.label}</span>
                          {row.detail ? <span className="ob-rc-row-detail">{row.detail}</span> : null}
                        </span>
                        {full && row.text ? <span className="ob-rc-row-text">{row.text}</span> : null}
                        <ChevronRight className="ob-rc-row-go size-4" strokeWidth={1.75} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </section>
      ) : null}

      {reading.about && (reading.about.paragraphs.length || noteInAbout) ? (
        <details className="ob-rc-about" data-testid="reading-about">
          <summary>{reading.about.title}</summary>
          {noteInAbout ? (
            <p className="ob-rc-p" data-testid="reading-note">
              {reading.note}
            </p>
          ) : null}
          {reading.about.paragraphs.map((p, i) => (
            <p key={i} className="ob-rc-p">
              {p}
            </p>
          ))}
        </details>
      ) : null}
    </article>
  );
}
