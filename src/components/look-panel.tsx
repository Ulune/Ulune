import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PlanetGlyph } from "./glyphs";
import { useLook } from "@/lib/look-provider";
import { useTheme } from "@/lib/theme";
import {
  applyHueChip,
  ASPECT_KEYS,
  CLASSIC_PLANETS,
  DEFAULT_LOOK,
  DEFAULT_LOOK_DAY,
  ELEMENT_KEYS,
  factoryDayFor,
  HUE_CHIPS,
  nearestHueChip,
  oklchCss,
  resolveSwatch,
  type AspectKey,
  type ClassicPlanet,
  type ElementKey,
  type HueChipId,
  type LookState,
  type Oklch,
  type StrokeWeight,
  type TypePairing,
} from "@/lib/look";
import { elementName, planetName } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  GLYPH_FAMILY_IDS,
  type GlyphFamily,
} from "@/lib/chart/glyphs";
import type { PlanetId } from "@/lib/chart/types";
import { setDepthPrefs, useDepthPrefs } from "@/lib/depth/prefs";
import { supportsWebGL } from "./depth/gl/support";
import { whenIdle } from "@/lib/lazy-component";

const GLYPH_LABEL: Record<GlyphFamily, MessageKey> = {
  noto: "lookGlyphsNoto",
  astronomicon: "lookGlyphsAstronomicon",
  "starfont-sans": "lookGlyphsStarSans",
  "starfont-serif": "lookGlyphsStarSerif",
};

const CHIP =
  "inline-flex h-[var(--control-h)] min-w-[var(--control-h)] items-center justify-center ulune-chip-radius border text-xs transition-colors duration-[var(--motion-ui)]";
const PRESET =
  "inline-flex min-h-[var(--control-h)] items-center ulune-chip-radius border px-2.5 text-xs transition-colors duration-[var(--motion-ui)]";
const CHIP_ON = "border-border-strong bg-bg-subtle text-fg";
const CHIP_OFF = "border-border text-fg-muted hover:border-border-strong hover:text-fg";

const HUE_KEY: Record<HueChipId, MessageKey> = {
  ruby: "hueRuby",
  coral: "hueCoral",
  amber: "hueAmber",
  gold: "hueGold",
  leaf: "hueLeaf",
  teal: "hueTeal",
  sky: "hueSky",
  indigo: "hueIndigo",
  violet: "hueViolet",
  rose: "hueRose",
  stone: "hueStone",
  silver: "hueSilver",
};

const ELEMENT_KICKER: Record<ElementKey, MessageKey> = {
  fire: "lookFireKicker",
  earth: "lookEarthKicker",
  air: "lookAirKicker",
  water: "lookWaterKicker",
};

const ASPECT_LABEL: Record<AspectKey, MessageKey> = {
  conj: "lookAspectConj",
  hard: "lookAspectHard",
  soft: "lookAspectSoft",
  minor: "lookAspectMinor",
};

const PAIRING_LABEL: Record<TypePairing, MessageKey> = {
  classic: "lookPairingClassic",
  editorial: "lookPairingEditorial",
  clean: "lookPairingClean",
};

const STROKE_LABEL: Record<StrokeWeight, MessageKey> = {
  thin: "lookStrokeThin",
  regular: "lookStrokeRegular",
  heavy: "lookStrokeHeavy",
};

function HueRow<K extends string>({
  color,
  onChange,
  nightMap,
  dayMap,
  mapKey,
}: {
  color: Oklch;
  onChange: (next: Oklch) => void;
  nightMap?: Record<K, Oklch>;
  dayMap?: Record<K, Oklch>;
  mapKey?: K;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const active = nearestHueChip(color);
  return (
    <ul className="flex flex-wrap gap-1.5">
      {HUE_CHIPS.map((chip) => {
        const preview = { h: chip.h, c: chip.c, l: color.l };
        const factoryDay =
          nightMap && dayMap && mapKey ? factoryDayFor(preview, nightMap, dayMap, mapKey) : null;
        const painted = resolveSwatch(preview, theme, factoryDay);
        const on = active === chip.id;
        return (
          <li key={chip.id}>
            <button
              type="button"
              data-hue={chip.id}
              aria-pressed={on}
              title={t(HUE_KEY[chip.id])}
              onClick={() => onChange(applyHueChip(color, chip))}
              className={`${CHIP} ${on ? "border-border-strong" : "border-border hover:border-border-strong"}`}
            >
              <span
                className="size-4 rounded-full border border-border"
                style={{ background: oklchCss(painted) }}
              />
              <span className="sr-only">{t(HUE_KEY[chip.id])}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Sliders({
  color,
  onChange,
}: {
  color: Oklch;
  onChange: (next: Oklch) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 flex items-center justify-between">
          <span className="ulune-kicker text-fg-subtle">{t("lookChroma")}</span>
          <span className="ulune-micro tabular-nums text-fg">{Math.round(color.c * 100)}</span>
        </span>
        <input
          type="range"
          min={1}
          max={22}
          step={1}
          value={Math.round(color.c * 100)}
          onChange={(e) => onChange({ ...color, c: Number(e.target.value) / 100 })}
          className="ulune-orb-slider w-full"
        />
      </label>
      <label className="block">
        <span className="mb-1 flex items-center justify-between">
          <span className="ulune-kicker text-fg-subtle">{t("lookLightness")}</span>
          <span className="ulune-micro tabular-nums text-fg">{Math.round(color.l * 100)}</span>
        </span>
        <input
          type="range"
          min={36}
          max={86}
          step={1}
          value={Math.round(color.l * 100)}
          onChange={(e) => onChange({ ...color, l: Number(e.target.value) / 100 })}
          className="ulune-orb-slider w-full"
        />
      </label>
    </div>
  );
}

function SwatchRow<K extends string>({
  name,
  kicker,
  swatchId,
  color,
  onChange,
  nightMap,
  dayMap,
  mapKey,
}: {
  name: string;
  kicker?: string;
  swatchId: string;
  color: Oklch;
  onChange: (next: Oklch) => void;
  nightMap: Record<K, Oklch>;
  dayMap: Record<K, Oklch>;
  mapKey: K;
}) {
  const { theme } = useTheme();
  const preview = resolveSwatch(color, theme, factoryDayFor(color, nightMap, dayMap, mapKey));
  return (
    <div data-swatch={swatchId} className="border-t border-border pt-[var(--space-3)]">
      <div className="mb-[var(--space-2)] flex items-center gap-[var(--space-2)]">
        <span
          className="size-5 shrink-0 rounded-full border border-border"
          style={{ background: oklchCss(preview) }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="ulune-kicker text-fg-subtle">{name}</p>
          {kicker ? <p className="mt-1 text-xs text-fg-muted">{kicker}</p> : null}
        </div>
      </div>
      <HueRow color={color} onChange={onChange} nightMap={nightMap} dayMap={dayMap} mapKey={mapKey} />
      <Sliders color={color} onChange={onChange} />
    </div>
  );
}

export type LookPanelPage = "type" | "elements" | "aspects" | "planets" | "all";

export function LookPanel({ page = "all" }: { page?: LookPanelPage }) {
  const depth = useDepthPrefs();
  /**
   * The 3D view needs WebGL: checked once the page is idle (the server cannot
   * know, and the probe costs a context); the button shows meanwhile.
   */
  const [can3d, setCan3d] = useState(true);
  useEffect(() => whenIdle(() => setCan3d(supportsWebGL()), 3000), []);
  const { locale, t } = useI18n();
  const { look, patchLook, resetLook } = useLook();
  const [planetsOpen, setPlanetsOpen] = useState(false);
  const paged = page !== "all";
  const show = (id: LookPanelPage) => !paged || page === id;

  const [outerOpen, setOuterOpen] = useState(false);

  function setElement(key: ElementKey, color: Oklch) {
    patchLook((prev) => ({
      ...prev,
      elements: { ...prev.elements, [key]: color },
    }));
  }

  function setAspect(key: AspectKey, color: Oklch) {
    patchLook((prev) => ({
      ...prev,
      aspects: { ...prev.aspects, [key]: color },
    }));
  }

  function setOuterAspect(key: AspectKey, color: Oklch) {
    patchLook((prev) => ({
      ...prev,
      outerAspects: { ...DEFAULT_LOOK.outerAspects, ...prev.outerAspects, [key]: color },
    }));
  }

  function setPlanet(id: ClassicPlanet, color: Oklch | null) {
    patchLook((prev) => {
      const planets: LookState["planets"] = { ...prev.planets };
      if (color) planets[id] = color;
      else delete planets[id];
      return { ...prev, planets };
    });
  }

  return (
    <div data-testid="look-panel" data-look-page={page} className="flex flex-col gap-3">
      {show("type") ? (
        <>
          <div>
            <p className="ulune-kicker text-fg-muted">{t("lookType")}</p>
            <p className="mt-1 text-xs text-fg-muted">{t("lookTypeKicker")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["classic", "editorial", "clean"] as TypePairing[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  data-pairing={id}
                  aria-pressed={look.pairing === id}
                  onClick={() => patchLook((prev) => ({ ...prev, pairing: id }))}
                  className={`${PRESET} ${look.pairing === id ? CHIP_ON : CHIP_OFF}`}
                >
                  {t(PAIRING_LABEL[id])}
                </button>
              ))}
            </div>
          </div>

          <div className={paged ? undefined : "border-t border-border pt-[var(--space-3)]"}>
            <p className="ulune-kicker text-fg-muted">{t("lookGlyphs")}</p>
            <p className="mt-1 text-xs text-fg-muted">{t("lookGlyphsKicker")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GLYPH_FAMILY_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-glyph-family={id}
                  aria-pressed={look.glyphFamily === id}
                  onClick={() => patchLook((prev) => ({ ...prev, glyphFamily: id }))}
                  className={`${PRESET} ${look.glyphFamily === id ? CHIP_ON : CHIP_OFF}`}
                >
                  {t(GLYPH_LABEL[id])}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-[var(--space-3)]">
            <label className="block">
              <span className="mb-1 flex items-center justify-between">
                <span className="ulune-kicker text-fg-muted">{t("lookTextSize")}</span>
                <span className="ulune-micro tabular-nums text-fg">
                  {Math.round(look.textScale * 100)}%
                </span>
              </span>
              <input
                type="range"
                data-testid="look-text-scale"
                min={90}
                max={115}
                step={1}
                value={Math.round(look.textScale * 100)}
                onChange={(e) =>
                  patchLook((prev) => ({ ...prev, textScale: Number(e.target.value) / 100 }))
                }
                className="ulune-orb-slider w-full"
              />
            </label>
          </div>
        </>
      ) : null}

      {show("elements") ? (
        <>
          <div className={paged ? undefined : "border-t border-border pt-[var(--space-3)]"}>
            <p className="ulune-kicker text-fg-muted">{t("lookElements")}</p>
            <p className="mt-1 text-xs text-fg-muted">{t("lookElementsKicker")}</p>
          </div>
          {ELEMENT_KEYS.map((key) => (
            <SwatchRow
              key={key}
              swatchId={key}
              name={elementName(key, locale)}
              kicker={t(ELEMENT_KICKER[key])}
              color={look.elements[key]}
              onChange={(next) => setElement(key, next)}
              nightMap={DEFAULT_LOOK.elements}
              dayMap={DEFAULT_LOOK_DAY.elements}
              mapKey={key}
            />
          ))}
        </>
      ) : null}

      {show("aspects") ? (
        <>
          <div className={paged ? undefined : "border-t border-border pt-[var(--space-3)]"}>
            <p className="ulune-kicker text-fg-muted">{t("lookAspects")}</p>
            <p className="mt-1 text-xs text-fg-muted">{t("lookAspectsKicker")}</p>
          </div>
          {ASPECT_KEYS.map((key) => (
            <SwatchRow
              key={key}
              swatchId={key}
              name={t(ASPECT_LABEL[key])}
              color={look.aspects[key]}
              onChange={(next) => setAspect(key, next)}
              nightMap={DEFAULT_LOOK.aspects}
              dayMap={DEFAULT_LOOK_DAY.aspects}
              mapKey={key}
            />
          ))}

          <div className="border-t border-border pt-[var(--space-3)]">
            {paged ? (
              <div>
                <p className="ulune-kicker text-fg-muted">{t("lookOuterAspects")}</p>
                <p className="mt-1 text-xs text-fg-muted">{t("lookOuterAspectsKicker")}</p>
              </div>
            ) : (
              <button
                type="button"
                data-section-toggle="look-outer-aspects"
                aria-expanded={outerOpen}
                onClick={() => setOuterOpen((v) => !v)}
                className="flex w-full items-start justify-between gap-[var(--space-2)] text-left"
              >
                <span>
                  <span className="flex items-center gap-1.5">
                    <ChevronDown
                      className={`size-3.5 shrink-0 text-fg-muted transition-transform ${outerOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                    <span className="ulune-kicker text-fg-muted">{t("lookOuterAspects")}</span>
                  </span>
                  <span className="mt-1 block text-xs text-fg-muted">{t("lookOuterAspectsKicker")}</span>
                </span>
              </button>
            )}
            <div className={paged || outerOpen ? "mt-3 flex flex-col gap-3" : "hidden"}>
              {ASPECT_KEYS.map((key) => (
                <SwatchRow
                  key={`outer-${key}`}
                  swatchId={`outer-${key}`}
                  name={t(ASPECT_LABEL[key])}
                  color={look.outerAspects[key]}
                  onChange={(next) => setOuterAspect(key, next)}
                  nightMap={DEFAULT_LOOK.outerAspects}
                  dayMap={DEFAULT_LOOK_DAY.outerAspects}
                  mapKey={key}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {show("planets") ? (
        <div className={paged ? undefined : "border-t border-border pt-[var(--space-3)]"}>
          {paged ? (
            <div>
              <p className="ulune-kicker text-fg-muted">{t("lookPlanets")}</p>
              <p className="mt-1 text-xs text-fg-muted">{t("lookPlanetsKicker")}</p>
            </div>
          ) : (
            <button
              type="button"
              data-section-toggle="look-planets"
              aria-expanded={planetsOpen}
              onClick={() => setPlanetsOpen((v) => !v)}
              className="flex w-full items-start justify-between gap-[var(--space-2)] text-left"
            >
              <span>
                <span className="flex items-center gap-1.5">
                  <ChevronDown
                    className={`size-3.5 shrink-0 text-fg-muted transition-transform ${planetsOpen ? "rotate-0" : "-rotate-90"}`}
                  />
                  <span className="ulune-kicker text-fg-muted">{t("lookPlanets")}</span>
                </span>
                <span className="mt-1 block text-xs text-fg-muted">{t("lookPlanetsKicker")}</span>
              </span>
            </button>
          )}
          <div className={paged || planetsOpen ? "mt-3 flex flex-col gap-3" : "hidden"}>
            {CLASSIC_PLANETS.map((id) => {
              const override = look.planets[id];
              const auto = !override;
              const color = override ?? look.elements.fire;
              return (
                <div key={id} data-planet-row={id} className="border-t border-border pt-[var(--space-3)]">
                  <div className="mb-[var(--space-2)] flex items-center justify-between gap-[var(--space-2)]">
                    <span className="flex items-center gap-2">
                      <span
                        className="grid size-5 place-items-center"
                        style={{ color: auto ? "var(--color-fg)" : `var(--planet-${id})` }}
                      >
                        <PlanetGlyph id={id} size={16} />
                      </span>
                      <span className="text-sm text-fg">{planetName(id as PlanetId, locale)}</span>
                    </span>
                    <button
                      type="button"
                      data-planet-auto={id}
                      aria-pressed={auto}
                      onClick={() => setPlanet(id, null)}
                      className={`${PRESET} ${auto ? CHIP_ON : CHIP_OFF}`}
                    >
                      {t("lookAuto")}
                    </button>
                  </div>
                  <HueRow color={color} onChange={(next) => setPlanet(id, next)} />
                  {!auto ? <Sliders color={color} onChange={(next) => setPlanet(id, next)} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {show("type") ? (
        <div className={paged ? undefined : "border-t border-border pt-[var(--space-3)]"}>
          <p className="ulune-kicker text-fg-muted">{t("lookStroke")}</p>
          <p className="mt-1 text-xs text-fg-muted">{t("lookStrokeKicker")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["thin", "regular", "heavy"] as StrokeWeight[]).map((id) => (
              <button
                key={id}
                type="button"
                data-stroke={id}
                aria-pressed={look.stroke === id}
                onClick={() => patchLook((prev) => ({ ...prev, stroke: id }))}
                className={`${PRESET} ${look.stroke === id ? CHIP_ON : CHIP_OFF}`}
              >
                {t(STROKE_LABEL[id])}
              </button>
            ))}
          </div>
          {/* The flat chart has no depth of its own (part 82): only the 3D view, where WebGL runs. */}
          {can3d ? (
            <>
              <p className="ulune-kicker mt-[var(--space-4)] text-fg-muted">{t("lookDepth")}</p>
              <p className="mt-1 text-xs text-fg-muted">{t("lookDepthKicker")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5" data-testid="look-depth">
                <button
                  type="button"
                  data-depth-pref="view"
                  aria-pressed={depth.view === "3d"}
                  onClick={() => setDepthPrefs({ view: depth.view === "3d" ? "flat" : "3d" })}
                  className={`${PRESET} ${depth.view === "3d" ? CHIP_ON : CHIP_OFF}`}
                >
                  {t("depthView3d")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!paged ? (
        <div className="border-t border-border pt-[var(--space-3)]">
          <button
            type="button"
            data-look-reset
            onClick={resetLook}
            className={`${PRESET} ${CHIP_OFF}`}
          >
            {t("lookReset")}
          </button>
          <p className="mt-2 text-xs text-fg-muted">{t("lookResetHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
