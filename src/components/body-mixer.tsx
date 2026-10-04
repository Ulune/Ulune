import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  ASPECT_COLOR,
  ASPECT_ORBS,
  MAJOR_ASPECT_IDS,
  MIDPOINT_DEFS,
  ORB_MAX,
  ORB_MIN,
  ORB_STEP,
  PLANET_ELEMENT,
  PLANET_META,
  STAR_META,
} from "@/lib/chart/constants";
import {
  cloneAspectFilter,
  LUMINARY_BONUS,
  isAllAspects,
  isMajorPreset,
  type AspectFilter,
} from "@/lib/chart/aspect-filter";
import {
  mixerSectionsOpen,
  MIXER_SECTIONS,
  PRESET_ORDER,
  SECTION_BODIES,
  type MixerSectionId,
  type NamedPresetId,
  type PresetId,
} from "@/lib/chart/chart-view";
import {
  CONFIG_LABEL,
  cloneOverlays,
  overlayOn,
  OVERLAY_IDS,
  type OverlayFilter,
  type OverlayId,
} from "@/lib/chart/overlay-filter";
import type { AspectId, BodyId, NatalChart, PlanetId } from "@/lib/chart/types";
import { ASPECT_IDS, MIDPOINT_IDS, STAR_IDS } from "@/lib/chart/types";
import { LookProfiles } from "@/components/look-profiles";
import { mixerPlanetPaint, type PlanetPaints } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { aspectName, bodyBare, formatOrb, planetAbbr } from "@/lib/i18n/astro";
import { useI18n, type Locale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { AspectGlyph, MidpointGlyph, PlanetGlyph, StarGlyph } from "./glyphs";
import { toast } from "@/lib/toast";

const ANGLE_ABBR: Record<string, string> = {
  ascendant: "ASC",
  midheaven: "MC",
  descendant: "DSC",
  ic: "IC",
};

const ASPECT_ABBR: Record<AspectId, string> = {
  conjunction: "Conj",
  opposition: "Opp",
  trine: "Tri",
  square: "Sqr",
  sextile: "Sxt",
  quincunx: "Qcx",
  semisextile: "SSx",
  semisquare: "SSq",
  quintile: "Qnt",
};

const PRESET_LABEL: Record<NamedPresetId | "custom", MessageKey> = {
  minimal: "presetMinimal",
  classic: "presetClassic",
  advanced: "presetAdvanced",
  all: "presetAll",
  clear: "presetNone",
  custom: "presetCustom",
};

const PRESET_HINT: Record<NamedPresetId | "custom", MessageKey> = {
  minimal: "presetHintMinimal",
  classic: "presetHintClassic",
  advanced: "presetHintAdvanced",
  all: "presetHintAll",
  clear: "presetHintClear",
  custom: "presetHintCustom",
};

const PRESET_DATA: Record<NamedPresetId | "custom", string> = {
  minimal: "minimal",
  classic: "classic",
  advanced: "advanced",
  all: "all",
  clear: "none",
  custom: "custom",
};

const CHIP_ON = "border-border-strong bg-bg-subtle text-fg";
// Off: quieter grey and a lighter frame, at full opacity so the name stays readable (WCAG AA).
const CHIP_OFF = "border-border bg-bg text-fg-subtle hover:text-fg-muted";
const CHIP_MIXED = "border-border-strong text-fg";
const BODY_CHIP =
  "inline-flex h-[var(--ctl-h)] min-w-[var(--ctl-h)] items-center justify-center gap-1.5 ulune-chip-radius border px-2 leading-none text-xs transition-[border-color,background-color,opacity,color,transform] duration-[var(--motion-press)] ease-[var(--ease-out)] active:scale-[0.97]";
const PRESET_CHIP =
  "inline-flex h-8 items-center ulune-chip-radius border px-2.5 text-xs transition-colors duration-[var(--motion-ui)]";

const ORB_MARKS = [ORB_MIN, 2, 4, 6, ORB_MAX] as const;

/** How often a moving orb slider redraws the wheel (ms). */
const ORB_COMMIT_MS = 120;

function orbMarkPercent(value: number): number {
  return ((value - ORB_MIN) / (ORB_MAX - ORB_MIN)) * 100;
}

function orbMarkLabel(value: number, locale: Locale, anyLabel: string): string {
  if (value >= ORB_MAX) return anyLabel;
  if (Number.isInteger(value)) return `${value}°`;
  return `${formatOrb(value, locale)}°`;
}

function glyphColor(
  id: BodyId,
  on: boolean,
  planets: PlanetPaints,
): string {
  return mixerPlanetPaint(id, on, planets, PLANET_ELEMENT);
}

type Props = {
  /** Exclusive Bodies dock page; omit or "all" for legacy stacked accordion.
   * Composite pages: planets (+asteroids), marks (stars+midpoints), aspects (+overlays). */
  page?: "all" | "planets" | "angles" | "points" | "marks" | "aspects" | MixerSectionId;
  chart: NatalChart;
  visible: Set<BodyId>;
  onChange: (next: Set<BodyId>) => void;
  aspectFilter: AspectFilter;
  onAspectFilterChange: (next: AspectFilter) => void;
  overlays?: OverlayFilter;
  onOverlaysChange?: (next: OverlayFilter) => void;
  starVisible?: Set<string>;
  onStarVisibleChange?: (next: Set<string>) => void;
  midpointVisible?: Set<string>;
  onMidpointVisibleChange?: (next: Set<string>) => void;
  activePreset: PresetId;
};

const OVERLAY_KEY: Record<
  OverlayId,
  | "overlayApplying"
  | "overlayStationary"
  | "overlayFast"
  | "overlayAngularity"
  | "overlayRuler"
  | "overlaySect"
  | "overlayDignity"
  | "overlayCombust"
  | "overlayVoc"
  | "overlayOob"
  | "overlayAnaretic"
  | "overlayReceptions"
  | "overlayConfigs"
  | "overlayUnaspected"
  | "overlayStelliums"
  | "overlayHemisphere"
  | "overlayQuadrant"
> = {
  applyingSeparating: "overlayApplying",
  stationary: "overlayStationary",
  fast: "overlayFast",
  angularity: "overlayAngularity",
  chartRuler: "overlayRuler",
  sect: "overlaySect",
  dignity: "overlayDignity",
  combust: "overlayCombust",
  vocMoon: "overlayVoc",
  oob: "overlayOob",
  anaretic: "overlayAnaretic",
  receptions: "overlayReceptions",
  configurations: "overlayConfigs",
  unaspected: "overlayUnaspected",
  stelliums: "overlayStelliums",
  hemisphere: "overlayHemisphere",
  quadrant: "overlayQuadrant",
};

function shortBody(id: BodyId, locale: "en" | "fr"): string {
  if (id in PLANET_META) return planetAbbr(id as PlanetId, locale);
  return ANGLE_ABBR[id] ?? id;
}

function MixerSection({
  id,
  title,
  kicker,
  open,
  onToggle,
  allButton,
  flat,
  children,
}: {
  id: string;
  title: string;
  kicker: string;
  open: boolean;
  onToggle: () => void;
  allButton?: ReactNode;
  /** Exclusive Bodies page: no accordion chrome. */
  flat?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  if (flat) {
    return (
      <div data-mixer-section={id} data-flat="1" className="flex flex-col gap-[var(--space-2)]">
        <div className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="ulune-kicker text-fg-subtle">{title}</p>
            <p className="mt-1 text-xs text-fg-muted">{kicker}</p>
          </div>
          {allButton ? (
            <div className="flex flex-wrap gap-1.5 sm:justify-end">{allButton}</div>
          ) : null}
        </div>
        {children}
      </div>
    );
  }
  return (
    <div data-mixer-section={id} className="border-t border-border pt-[var(--space-3)]">
      <div className="mb-[var(--space-2)] flex flex-col gap-[var(--space-2)] sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          data-section-toggle={id}
          aria-expanded={open}
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-1.5">
            <ChevronDown
              className={`size-3.5 shrink-0 text-fg-subtle transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
            />
            <span className="ulune-kicker text-fg-subtle">{title}</span>
          </span>
          <span className="mt-1 block text-xs text-fg-muted">{kicker}</span>
          <span className="sr-only">{open ? t("mixerCollapse") : t("mixerExpand")}</span>
        </button>
        {allButton ? (
          <div className="flex flex-wrap gap-1.5 sm:justify-end">{allButton}</div>
        ) : null}
      </div>
      <div className={open ? undefined : "hidden"}>{children}</div>
    </div>
  );
}

export function ChartViewPresets({
  activePreset,
  hasCustom,
  dirty,
  onApplyPreset,
  onApplyCustom,
  onSaveCustom,
}: {
  activePreset: PresetId;
  hasCustom: boolean;
  dirty: boolean;
  onApplyPreset: (id: NamedPresetId) => void;
  onApplyCustom: () => void;
  onSaveCustom: () => void;
}) {
  const { t } = useI18n();
  const hintKey =
    activePreset === "custom" && !hasCustom && dirty
      ? "presetHintCustomEmpty"
      : PRESET_HINT[activePreset];

  return (
    <div data-testid="chart-presets" className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_ORDER.map((id) => {
          const active = activePreset === id;
          return (
            <button
              key={id}
              type="button"
              data-preset={PRESET_DATA[id]}
              aria-pressed={active}
              onClick={() => onApplyPreset(id)}
              className={`${PRESET_CHIP} ${
                active ? CHIP_ON : "border-border text-fg-muted hover:border-border-strong hover:text-fg"
              }`}
            >
              {t(PRESET_LABEL[id])}
            </button>
          );
        })}
        <button
          type="button"
          data-preset="custom"
          aria-pressed={activePreset === "custom"}
          disabled={!hasCustom && activePreset !== "custom"}
          title={
            !hasCustom && activePreset !== "custom" ? t("presetHintCustomEmpty") : undefined
          }
          onClick={onApplyCustom}
          className={`${PRESET_CHIP} ${
            activePreset === "custom"
              ? CHIP_ON
              : "border-border text-fg-muted hover:border-border-strong hover:text-fg disabled:opacity-40"
          }`}
        >
          {t("presetCustom")}
        </button>
        <button
          type="button"
          data-save-custom
          disabled={!dirty && Boolean(hasCustom) && activePreset === "custom"}
          title={!dirty && Boolean(hasCustom) && activePreset === "custom" ? t("customSaved") : undefined}
          onClick={() => {
            onSaveCustom();
            toast(t("toastViewSaved"));
          }}
          className={`${PRESET_CHIP} border-border text-fg-muted hover:border-border-strong hover:text-fg disabled:opacity-40`}
        >
          {t("saveCustom")}
        </button>
      </div>
      <p className="text-xs text-fg-muted">{t(hintKey)}</p>
      <LookProfiles compact />
    </div>
  );
}

export function BodyMixer({
  page = "all",
  chart,
  visible,
  onChange,
  aspectFilter,
  onAspectFilterChange,
  overlays: overlaysProp,
  onOverlaysChange,
  starVisible: starProp,
  onStarVisibleChange,
  midpointVisible: midpointProp,
  onMidpointVisibleChange,
  activePreset,
}: Props) {
  const { locale, t } = useI18n();
  const look = useLookShape();
  const [localOverlays, setLocalOverlays] = useState<OverlayFilter>(() => ({
    on: new Set(),
    configs: new Set(),
  }));
  const [localStars, setLocalStars] = useState<Set<string>>(() => new Set());
  const [localMids, setLocalMids] = useState<Set<string>>(() => new Set());
  const [openSections, setOpenSections] = useState<Record<MixerSectionId, boolean>>(() => {
    const on = mixerSectionsOpen(activePreset);
    return Object.fromEntries(MIXER_SECTIONS.map((id) => [id, on])) as Record<MixerSectionId, boolean>;
  });

  const overlays = overlaysProp ?? localOverlays;
  const starVisible = starProp ?? localStars;
  const midpointVisible = midpointProp ?? localMids;

  useEffect(() => {
    if (activePreset === "custom") return;
    const on = mixerSectionsOpen(activePreset);
    setOpenSections(Object.fromEntries(MIXER_SECTIONS.map((id) => [id, on])) as Record<MixerSectionId, boolean>);
  }, [activePreset]);

  function toggleSection(id: MixerSectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function commitBodies(next: Set<BodyId>) {
    onChange(next);
  }

  function commitOverlays(next: OverlayFilter) {
    if (onOverlaysChange) onOverlaysChange(next);
    else setLocalOverlays(next);
  }

  function commitStars(next: Set<string>) {
    if (onStarVisibleChange) onStarVisibleChange(next);
    else setLocalStars(next);
  }

  function commitMids(next: Set<string>) {
    if (onMidpointVisibleChange) onMidpointVisibleChange(next);
    else setLocalMids(next);
  }

  function toggle(id: BodyId) {
    const next = new Set(visible);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commitBodies(next);
  }

  function toggleGroup(bodies: BodyId[]) {
    const allOn = bodies.every((id) => visible.has(id));
    const next = new Set(visible);
    if (allOn) {
      for (const id of bodies) next.delete(id);
    } else {
      for (const id of bodies) next.add(id);
    }
    commitBodies(next);
  }

  function toggleOverlay(id: OverlayId) {
    const next = cloneOverlays(overlays);
    if (next.on.has(id)) {
      next.on.delete(id);
      if (id === "configurations") next.configs.clear();
    } else {
      next.on.add(id);
    }
    commitOverlays(next);
  }

  function toggleConfig(id: string) {
    const next = cloneOverlays(overlays);
    if (next.configs.has(id)) next.configs.delete(id);
    else next.configs.add(id);
    commitOverlays(next);
  }

  function toggleStar(id: string) {
    const next = new Set(starVisible);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commitStars(next);
  }

  function toggleStarGroup() {
    const allOn = STAR_IDS.every((id) => starVisible.has(id));
    commitStars(allOn ? new Set() : new Set(STAR_IDS));
  }

  function toggleMidpoint(id: string) {
    const next = new Set(midpointVisible);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commitMids(next);
  }

  function toggleMidpointGroup() {
    const allOn = MIDPOINT_IDS.every((id) => midpointVisible.has(id));
    commitMids(allOn ? new Set() : new Set(MIDPOINT_IDS));
  }

  function commitAspects(next: AspectFilter) {
    onAspectFilterChange(next);
  }

  function setAspectTypes(ids: readonly AspectId[]) {
    const next = cloneAspectFilter(aspectFilter);
    next.types = new Set(ids);
    commitAspects(next);
  }

  function toggleAspectType(id: AspectId) {
    const next = cloneAspectFilter(aspectFilter);
    if (next.types.has(id)) next.types.delete(id);
    else next.types.add(id);
    commitAspects(next);
  }


  function toggleAspectTarget(key: "toAngles" | "toNodes" | "toPoints" | "toLuminaries" | "toAsteroids" | "toPlanets") {
    const next = cloneAspectFilter(aspectFilter);
    next[key] = !next[key];
    commitAspects(next);
  }

  function setMaxOrb(n: number) {
    const next = cloneAspectFilter(aspectFilter);
    next.maxOrb = n;
    // The slider sets every aspect's orb at once.
    next.orbs = {};
    if (next.types.size === 0) next.types = new Set(ASPECT_IDS);
    commitAspects(next);
  }

  // The orb slider shows its value at once and redraws the wheel at most
  // every ORB_COMMIT_MS while it moves (each redraw lays the wheel out again),
  // then where it stops.
  const [orbDraft, setOrbDraft] = useState<number | null>(null);
  const orbRef = useRef({ timer: 0, pending: null as number | null, last: 0 });
  const setMaxOrbRef = useRef(setMaxOrb);
  setMaxOrbRef.current = setMaxOrb;
  useEffect(() => {
    const o = orbRef.current;
    return () => window.clearTimeout(o.timer);
  }, []);
  function flushOrb() {
    const o = orbRef.current;
    window.clearTimeout(o.timer);
    o.timer = 0;
    const n = o.pending;
    o.pending = null;
    if (n == null) return;
    o.last = performance.now();
    setMaxOrbRef.current(n);
  }
  function moveOrb(n: number) {
    const o = orbRef.current;
    setOrbDraft(n);
    o.pending = n;
    const wait = ORB_COMMIT_MS - (performance.now() - o.last);
    if (wait <= 0) flushOrb();
    else if (!o.timer) o.timer = window.setTimeout(flushOrb, wait);
  }
  function settleOrb() {
    flushOrb();
    setOrbDraft(null);
  }
  // Once the wheel has caught up with the slider, the slider shows the view's own value again.
  useEffect(() => {
    if (orbDraft != null && !orbRef.current.timer && aspectFilter.maxOrb === orbDraft) setOrbDraft(null);
  }, [aspectFilter.maxOrb, orbDraft]);

  /** One aspect's own orb (review 3 Oct, C3): up to the widest the chart computes for it. */
  function setTypeOrb(id: AspectId, n: number) {
    const next = cloneAspectFilter(aspectFilter);
    const max = ASPECT_ORBS[id];
    next.orbs = { ...next.orbs, [id]: Math.min(max, Math.max(ORB_MIN, Math.round(n * 2) / 2)) };
    commitAspects(next);
  }
  function resetTypeOrbs() {
    const next = cloneAspectFilter(aspectFilter);
    next.orbs = {};
    commitAspects(next);
  }
  function toggleLumBonus() {
    const next = cloneAspectFilter(aspectFilter);
    next.lumBonus = !next.lumBonus;
    commitAspects(next);
  }
  const typeOrb = (id: AspectId) => aspectFilter.orbs[id] ?? Math.min(aspectFilter.maxOrb, ASPECT_ORBS[id]);
  const ownOrbs = Object.keys(aspectFilter.orbs).length > 0;

  const allAspectsOn = isAllAspects(aspectFilter);
  const majorOn = isMajorPreset(aspectFilter);
  const noneOn = aspectFilter.types.size === 0;
  const orbShown = orbDraft ?? aspectFilter.maxOrb;
  const orbLabel = orbShown >= ORB_MAX ? t("orbAny") : `${formatOrb(orbShown, locale)}°`;

  const configs = chart.patterns.configurations ?? [];
  const showConfigSub = overlayOn(overlays, "configurations") && configs.length > 0;
  const starsAllOn = STAR_IDS.every((id) => starVisible.has(id));
  const starsSomeOn = !starsAllOn && STAR_IDS.some((id) => starVisible.has(id));
  const midsAllOn = MIDPOINT_IDS.every((id) => midpointVisible.has(id));
  const midsSomeOn = !midsAllOn && MIDPOINT_IDS.some((id) => midpointVisible.has(id));
  const overlaysAllOn = OVERLAY_IDS.every((id) => overlayOn(overlays, id));
  const overlaysSomeOn = !overlaysAllOn && OVERLAY_IDS.some((id) => overlayOn(overlays, id));

  function groupAllButton(groupId: string, bodies: BodyId[], label: string) {
    const allOn = bodies.every((id) => visible.has(id));
    const someOn = !allOn && bodies.some((id) => visible.has(id));
    return (
      <button
        type="button"
        data-group-all={groupId}
        data-on={allOn ? "1" : someOn ? "m" : "0"}
        aria-pressed={allOn}
        title={allOn ? t("hideAllGroup", { group: label }) : t("showAllGroup", { group: label })}
        onClick={() => toggleGroup(bodies)}
        className={`${PRESET_CHIP} ${allOn ? CHIP_ON : someOn ? CHIP_MIXED : "border-border text-fg-muted hover:border-border-strong hover:text-fg"}`}
      >
        {t("groupAll")}
      </button>
    );
  }

  function bodyChips(bodies: BodyId[]) {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {bodies.map((id) => {
          const on = visible.has(id);
          const name =
            // The name alone on a chip (review 3 Oct, C14: "Le Soleil", "La Lune" beside "Mercure").
            bodyBare(id, locale);
          const abbr =
            id in PLANET_META ? planetAbbr(id as PlanetId, locale) : (ANGLE_ABBR[id] ?? id);
          return (
            <li key={id}>
              <button
                type="button"
                data-body={id}
                data-on={on ? "1" : "0"}
                aria-pressed={on}
                title={on ? t("hideBody", { name }) : t("showBody", { name })}
                onClick={() => toggle(id)}
                className={`${BODY_CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                <span
                  style={{ color: glyphColor(id, on, look.planets) }}
                  className="grid size-5 shrink-0 place-items-center"
                >
                  <PlanetGlyph id={id} size={16} />
                </span>
                <span className="pr-0.5 ulune-micro sm:hidden">{abbr}</span>
                <span className="hidden pr-0.5 sm:inline">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const paged = page !== "all";
  const show = (id: "planets" | MixerSectionId) => {
    if (!paged) return true;
    if (page === "planets") return id === "planets" || id === "asteroids" || id === "points";
    if (page === "marks") return id === "stars" || id === "midpoints";
    if (page === "aspects") return id === "aspects" || id === "overlays";
    return page === id;
  };

  return (
    <div data-testid="body-mixer" data-page={paged ? page : "all"} className="flex flex-col gap-3">
      {show("planets") ? (
      <div>
        <div className="mb-[var(--space-2)] flex items-center justify-between gap-[var(--space-2)]">
          <div>
            <p className="ulune-kicker text-fg-subtle">{t("groupPlanetsTitle")}</p>
            <p className="mt-1 text-xs text-fg-muted">{t("groupPlanetsKicker")}</p>
          </div>
          {groupAllButton("planets", SECTION_BODIES.planets, t("groupPlanets"))}
        </div>
        {page === "planets" ? (
          <div className="flex flex-col gap-[var(--space-3)]">
            <div>
              <p className="ulune-kicker mb-1.5 text-fg-subtle">{t("bodiesBandLuminaries")}</p>
              {bodyChips(["sun", "moon"] as const)}
            </div>
            <div>
              <p className="ulune-kicker mb-1.5 text-fg-subtle">{t("bodiesBandClassical")}</p>
              {bodyChips(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const)}
            </div>
          </div>
        ) : (
          bodyChips(SECTION_BODIES.planets)
        )}
      </div>
      ) : null}

      {show("angles") ? (
      <MixerSection
        id="angles"
        flat={paged}
        title={t("groupAnglesTitle")}
        kicker={t("groupAnglesKicker")}
        open={paged || openSections.angles}
        onToggle={paged ? () => undefined : () => toggleSection("angles")}
        allButton={groupAllButton("angles", SECTION_BODIES.angles, t("groupAngles"))}
      >
        {bodyChips(SECTION_BODIES.angles)}
      </MixerSection>
      ) : null}

      {show("asteroids") ? (
      <MixerSection
        id="asteroids"
        flat={paged}
        title={page === "planets" ? t("bodiesBandAsteroids") : t("groupAsteroidsTitle")}
        kicker={t("groupAsteroidsKicker")}
        open={paged || openSections.asteroids}
        onToggle={paged ? () => undefined : () => toggleSection("asteroids")}
        allButton={groupAllButton("asteroids", SECTION_BODIES.asteroids, t("groupAsteroids"))}
      >
        {bodyChips(SECTION_BODIES.asteroids)}
      </MixerSection>
      ) : null}

      {show("points") ? (
      <MixerSection
        id="points"
        flat={paged}
        title={page === "planets" ? t("bodiesBandPoints") : t("groupPointsTitle")}
        kicker={t("groupPointsKicker")}
        open={paged || openSections.points}
        onToggle={paged ? () => undefined : () => toggleSection("points")}
        allButton={groupAllButton("points", SECTION_BODIES.points, t("groupPoints"))}
      >
        {bodyChips(SECTION_BODIES.points)}
      </MixerSection>
      ) : null}

      

      {show("stars") ? (
      <MixerSection
        id="stars"
        flat={paged}
        title={t("groupStarsTitle")}
        kicker={t("groupStarsKicker")}
        open={paged || openSections.stars}
        onToggle={paged ? () => undefined : () => toggleSection("stars")}
        allButton={
          <button
            type="button"
            data-group-all="stars"
            data-on={starsAllOn ? "1" : starsSomeOn ? "m" : "0"}
            aria-pressed={starsAllOn}
            title={
              starsAllOn
                ? t("hideAllGroup", { group: t("groupStars") })
                : t("showAllGroup", { group: t("groupStars") })
            }
            onClick={toggleStarGroup}
            className={`${PRESET_CHIP} ${starsAllOn ? CHIP_ON : starsSomeOn ? CHIP_MIXED : "border-border text-fg-muted hover:border-border-strong hover:text-fg"}`}
          >
            {t("groupAll")}
          </button>
        }
      >
        <ul className="flex flex-wrap gap-1.5">
          {STAR_IDS.map((id) => {
            const on = starVisible.has(id);
            const hit = (chart.stars ?? []).find((s) => s.id === id);
            const name = hit?.name ?? STAR_META[id].name;
            return (
              <li key={id}>
                <button
                  type="button"
                  data-star={id}
                  data-on={on ? "1" : "0"}
                  aria-pressed={on}
                  title={on ? t("hideBody", { name }) : t("showBody", { name })}
                  onClick={() => toggleStar(id)}
                  className={`${BODY_CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                >
                  <span
                    style={{ color: on ? "var(--color-fg)" : "var(--color-fg-subtle)" }}
                    className="grid size-5 shrink-0 place-items-center"
                  >
                    <StarGlyph size={14} />
                  </span>
                  <span className="pr-0.5">{name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </MixerSection>
      ) : null}

      {show("midpoints") ? (
      <MixerSection
        id="midpoints"
        flat={paged}
        title={t("groupMidpointsTitle")}
        kicker={t("groupMidpointsKicker")}
        open={paged || openSections.midpoints}
        onToggle={paged ? () => undefined : () => toggleSection("midpoints")}
        allButton={
          <button
            type="button"
            data-group-all="midpoints"
            data-on={midsAllOn ? "1" : midsSomeOn ? "m" : "0"}
            aria-pressed={midsAllOn}
            title={
              midsAllOn
                ? t("hideAllGroup", { group: t("groupMidpoints") })
                : t("showAllGroup", { group: t("groupMidpoints") })
            }
            onClick={toggleMidpointGroup}
            className={`${PRESET_CHIP} ${midsAllOn ? CHIP_ON : midsSomeOn ? CHIP_MIXED : "border-border text-fg-muted hover:border-border-strong hover:text-fg"}`}
          >
            {t("groupAll")}
          </button>
        }
      >
        <ul className="flex flex-wrap gap-1.5">
          {MIDPOINT_IDS.map((id) => {
            const on = midpointVisible.has(id);
            const def = MIDPOINT_DEFS.find((d) => d.id === id);
            const name = def ? `${shortBody(def.a, locale)}/${shortBody(def.b, locale)}` : id;
            return (
              <li key={id}>
                <button
                  type="button"
                  data-midpoint={id}
                  data-on={on ? "1" : "0"}
                  aria-pressed={on}
                  title={on ? t("hideBody", { name }) : t("showBody", { name })}
                  onClick={() => toggleMidpoint(id)}
                  className={`${BODY_CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                >
                  <span
                    style={{ color: on ? "var(--color-fg)" : "var(--color-fg-subtle)" }}
                    className="grid size-5 shrink-0 place-items-center"
                  >
                    <MidpointGlyph size={14} />
                  </span>
                  <span className="pr-0.5 ulune-micro sm:hidden">{name}</span>
                  <span className="hidden pr-0.5 sm:inline">{name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </MixerSection>
      ) : null}

      {show("aspects") ? (
      <MixerSection
        id="aspects"
        flat={paged}
        title={t("groupAspects")}
        kicker={t("groupAspectsKicker")}
        open={paged || openSections.aspects}
        onToggle={paged ? () => undefined : () => toggleSection("aspects")}
        allButton={
          <div className="ob-seg3" role="radiogroup" aria-label={t("aspectPresetLabel")}>
            {(
              [
                ["all", allAspectsOn, () => setAspectTypes(ASPECT_IDS), t("aspectAll")],
                ["major", majorOn, () => setAspectTypes(MAJOR_ASPECT_IDS), t("aspectMajor")],
                ["none", noneOn, () => setAspectTypes([]), t("aspectNone")],
              ] as const
            ).map(([id, on, apply, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                data-aspect-preset={id}
                aria-checked={on}
                aria-pressed={on}
                className={on ? "is-on" : undefined}
                onClick={apply}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div data-testid="aspect-mixer">
          <div className="mb-3 rounded-md border border-border bg-bg px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="orb-slider" className="ulune-kicker text-fg-subtle">
                {t("orbMax")}
              </label>
              <span data-testid="orb-value" className="font-mono text-xs tabular-nums text-fg">
                {orbLabel}
              </span>
            </div>
            <div className="ulune-orb-scale mt-1">
              <input
                id="orb-slider"
                data-testid="orb-slider"
                type="range"
                min={ORB_MIN}
                max={ORB_MAX}
                step={ORB_STEP}
                value={orbShown}
                title={t("tightHint")}
                aria-valuemin={ORB_MIN}
                aria-valuemax={ORB_MAX}
                aria-valuenow={orbShown}
                aria-valuetext={orbLabel}
                onChange={(e) => moveOrb(Number(e.target.value))}
                onPointerUp={settleOrb}
                onKeyUp={settleOrb}
                onBlur={settleOrb}
                className="ulune-orb-slider w-full"
              />
              <div className="ulune-orb-marks" aria-hidden>
                {ORB_MARKS.map((value) => (
                  <span
                    key={value}
                    className="ulune-orb-mark ulune-micro text-fg-subtle"
                    style={{ left: `${orbMarkPercent(value)}%` }}
                  >
                    {orbMarkLabel(value, locale, t("orbAny"))}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <details className="ulune-orbs mb-3 rounded-md border border-border bg-bg px-3 py-2" data-testid="orbs-by-aspect" open={ownOrbs || aspectFilter.lumBonus || undefined}>
            <summary className="ulune-kicker cursor-pointer text-fg-subtle">{t("orbsByAspect")}</summary>
            <p className="mt-1 text-xs text-fg-muted">{t("orbsByAspectHint")}</p>
            <ul className="mt-2 grid gap-1">
              {ASPECT_IDS.filter((id) => aspectFilter.types.has(id)).map((id) => {
                const v = typeOrb(id);
                const name = aspectName(id, locale);
                return (
                  <li key={id} className="flex items-center justify-between gap-2" data-orb-type={id}>
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-fg">
                      <span style={{ color: ASPECT_COLOR[id] }} className="grid size-5 shrink-0 place-items-center">
                        <AspectGlyph id={id} size={15} />
                      </span>
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <button type="button" className="ob-icon-btn ob-icon-btn--quiet" aria-label={t("orbNarrower", { name })} disabled={v <= ORB_MIN} onClick={() => setTypeOrb(id, v - 0.5)}>
                        −
                      </button>
                      <span className="w-12 text-center font-mono text-xs tabular-nums text-fg" data-testid={`orb-${id}`}>
                        {formatOrb(v, locale)}°
                      </span>
                      <button type="button" className="ob-icon-btn ob-icon-btn--quiet" aria-label={t("orbWider", { name })} disabled={v >= ASPECT_ORBS[id]} onClick={() => setTypeOrb(id, v + 0.5)}>
                        +
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" data-testid="orb-lights" checked={aspectFilter.lumBonus} onChange={toggleLumBonus} />
                {t("orbLights", { n: String(LUMINARY_BONUS) })}
              </label>
              {ownOrbs ? (
                <button type="button" className="text-xs text-fg-muted underline" onClick={resetTypeOrbs}>
                  {t("orbsReset")}
                </button>
              ) : null}
            </div>
          </details>
          <ul className="flex flex-wrap gap-1.5">
            {ASPECT_IDS.map((id) => {
              const on = aspectFilter.types.has(id);
              const name = aspectName(id, locale);
              const color = ASPECT_COLOR[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    data-aspect={id}
                    data-on={on ? "1" : "0"}
                    aria-pressed={on}
                    title={on ? t("hideAspect", { name }) : t("showAspect", { name })}
                    onClick={() => toggleAspectType(id)}
                    className={`${BODY_CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                  >
                    <span
                      style={{ color: on ? color : "var(--color-fg-subtle)" }}
                      className="grid size-5 shrink-0 place-items-center"
                    >
                      <AspectGlyph id={id} size={16} />
                    </span>
                    <span className="pr-0.5 ulune-micro sm:hidden">{ASPECT_ABBR[id]}</span>
                    <span className="hidden pr-0.5 sm:inline">{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3" data-testid="aspect-targets">
            <p className="ulune-kicker mb-1.5 text-fg-subtle">{t("aspectToTargets")}</p>
            <ul className="flex flex-wrap gap-1.5">
              {(
                [
                  ["toLuminaries", "aspectToLuminaries", "aspectToLuminariesHint", "aspect-to-luminaries"],
                  ["toPlanets", "aspectToPlanets", "aspectToPlanetsHint", "aspect-to-planets"],
                  ["toAngles", "aspectToAxes", "aspectToAxesHint", "aspect-to-angles"],
                  ["toNodes", "aspectToNodes", "aspectToNodesHint", "aspect-to-nodes"],
                  ["toPoints", "aspectToPoints", "aspectToPointsHint", "aspect-to-points"],
                  ["toAsteroids", "aspectToAsteroids", "aspectToAsteroidsHint", "aspect-to-asteroids"],
                ] as const
              ).map(([key, labelKey, hintKey, testId]) => {
                const on = aspectFilter[key];
                return (
                  <li key={key}>
                    <button
                      type="button"
                      data-testid={testId}
                      data-on={on ? "1" : "0"}
                      aria-pressed={on}
                      title={t(hintKey)}
                      onClick={() => toggleAspectTarget(key)}
                      className={`${BODY_CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                    >
                      <span className="px-0.5">{t(labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </MixerSection>
      ) : null}

      {show("overlays") ? (
      <MixerSection
        id="overlays"
        flat={paged}
        title={t("groupOverlaysTitle")}
        kicker={t("groupOverlaysKicker")}
        open={paged || openSections.overlays}
        onToggle={paged ? () => undefined : () => toggleSection("overlays")}
        allButton={
          <button
            type="button"
            data-group-all="overlays"
            data-on={overlaysAllOn ? "1" : overlaysSomeOn ? "m" : "0"}
            aria-pressed={overlaysAllOn}
            title={
              overlaysAllOn
                ? t("hideAllGroup", { group: t("groupOverlaysTitle") })
                : t("showAllGroup", { group: t("groupOverlaysTitle") })
            }
            onClick={() => {
              const next = cloneOverlays(overlays);
              if (OVERLAY_IDS.every((id) => next.on.has(id))) {
                next.on.clear();
                next.configs.clear();
              } else {
                for (const id of OVERLAY_IDS) next.on.add(id);
              }
              commitOverlays(next);
            }}
            className={`${PRESET_CHIP} ${overlaysAllOn ? CHIP_ON : overlaysSomeOn ? CHIP_MIXED : "border-border text-fg-muted hover:border-border-strong hover:text-fg"}`}
          >
            {t("groupAll")}
          </button>
        }
      >
        <ul className="flex flex-wrap gap-1.5">
          {OVERLAY_IDS.map((id) => {
            const on = overlayOn(overlays, id);
            const name = t(OVERLAY_KEY[id]);
            return (
              <li key={id}>
                <button
                  type="button"
                  data-overlay={id}
                  data-on={on ? "1" : "0"}
                  aria-pressed={on}
                  onClick={() => toggleOverlay(id)}
                  className={`${BODY_CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                >
                  <span className="px-0.5">{name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {showConfigSub ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {configs.map((c) => {
              const on = overlays.configs.has(c.id);
              const name = CONFIG_LABEL[c.type][locale];
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    data-config={c.id}
                    data-on={on ? "1" : "0"}
                    aria-pressed={on}
                    onClick={() => toggleConfig(c.id)}
                    className={`${BODY_CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                  >
                    <span className="px-0.5">{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </MixerSection>
      ) : null}
    </div>
  );
}
