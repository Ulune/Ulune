import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { chartDisplayName } from "@/lib/chart/library";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { aspectLinkPhrase, bodyLabel, houseName, signName } from "@/lib/i18n/astro";
import { SIGN_IDS } from "@/lib/chart/constants";
import { formatArc } from "@/lib/utils";
import { GLOSSARY_ORDER, glossaryBody, glossaryTerm } from "@/lib/i18n/glossary";
import { PRESET_ORDER, type NamedPresetId } from "@/lib/chart/chart-view";
import { useChartView } from "@/lib/chart/use-chart-view";
import { setDepthPrefs, useDepthPrefs } from "@/lib/depth/prefs";
import type { MessageKey } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/locale";
import { useLookProfiles } from "@/lib/look-provider";
import { useTheme } from "@/lib/theme";
import { GROUP_LABEL, PAGE_LABEL } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";
import { MODE_GROUPS, type StudioPage } from "@/studio/url";
import { useStudioUrl } from "@/studio/use-studio-url";

/** `find`: listed only once something is typed (aspects, signs, houses, words: too many to show at rest). */
type Cmd = { id: string; section: string; label: string; hint?: string; keys?: string; find?: boolean; run: () => void };

const PRESET_LABEL: Record<NamedPresetId, MessageKey> = {
  minimal: "presetMinimal",
  classic: "presetClassic",
  advanced: "presetAdvanced",
  all: "presetAll",
  clear: "presetNone",
};

/**
 * The palette itself (CommandPalette.tsx opens it): every mode, chart, body,
 * Look profile and setting, searched as you type. Its own download, fetched
 * when the page is idle so ⌘K still opens at once.
 */
export function CommandPaletteDialog({ onClose }: { onClose: () => void }) {
  const { locale, setLocale, t } = useI18n();
  const { setTheme } = useTheme();
  // Profiles only: the palette doesn't re-render for every Look colour tick.
  const look = useLookProfiles();
  const navigate = useNavigate();
  const { setPage, setView } = useStudioUrl({ hydrate: false });
  const rows = useStudioStore((s) => s.rows);
  const chart = useStudioStore((s) => s.chart);
  const view = useStudioStore((s) => s.view);
  const chartView = useChartView();
  const depth = useDepthPrefs();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = onClose;

  useEffect(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [];
    const secModes = t("paletteModes");
    MODE_GROUPS.forEach((g, gi) => {
      for (const page of g.pages) {
        list.push({
          id: `mode:${page}`,
          section: secModes,
          label: t(PAGE_LABEL[page as StudioPage]),
          hint: t(GROUP_LABEL[g.id]),
          keys: g.pages[0] === page ? String(gi + 1) : undefined,
          run: () => setPage(page as StudioPage),
        });
      }
    });
    if (chart) {
      list.push({
        id: "view:toggle",
        section: secModes,
        label: view === "table" ? t("viewWheel") : t("viewTable"),
        keys: "T",
        run: () => setView(view === "table" ? "wheel" : "table"),
      });
    }
    const secCharts = t("charts");
    for (const r of rows) {
      list.push({
        id: `chart:${r.id}`,
        section: secCharts,
        label: chartDisplayName(r.input, t("untitled")),
        hint: [formatEuropeanDate(r.input.date), r.input.placeLabel.split(",")[0]].filter(Boolean).join(" · "),
        run: () => useStudioStore.getState().select(r.id),
      });
    }
    list.push({ id: "chart:new", section: secCharts, label: t("newNatal"), run: () => useStudioStore.getState().startNew() });
    if (chart) {
      const secBodies = t("paletteBodies");
      for (const p of chart.planets) {
        list.push({
          id: `body:${p.id}`,
          section: secBodies,
          label: bodyLabel(p.id, locale),
          // Where it stands, in words (review 3 Oct, C9): "18°43′ Aries · 9th house".
          hint: `${p.formatted} ${signName(p.sign, locale)} · ${houseName(p.house, locale)}`,
          run: () => {
            setPage("natal");
            useStudioStore.setState({ selectedId: `planet:${p.id}`, dock: "reading", dockOpen: true });
          },
        });
      }
      for (const a of ["ascendant", "midheaven"] as const) {
        const at = chart.angles[a];
        list.push({
          id: `body:${a}`,
          section: secBodies,
          label: bodyLabel(a, locale),
          hint: at ? `${at.formatted} ${signName(at.sign, locale)}` : undefined,
          run: () => {
            setPage("natal");
            useStudioStore.setState({ selectedId: `angle:${a}`, dock: "reading", dockOpen: true });
          },
        });
      }
    }
    const pick = (id: string) => {
      setPage("natal");
      useStudioStore.setState({ selectedId: id, dock: "reading", dockOpen: true });
    };
    if (chart) {
      // The chart's aspects, signs and houses, found by name ("venus trine", "scorpio", "house 7").
      const secAspects = t("paletteAspects");
      for (const a of chart.aspects) {
        list.push({ id: `aspect:${a.id}`, section: secAspects, label: aspectLinkPhrase(a.a, a.type, a.b, locale), hint: formatArc(a.orb), find: true, run: () => pick(`aspect:${a.id}`) });
      }
      const secPlaces = t("palettePlaces");
      for (const s of SIGN_IDS) list.push({ id: `sign:${s}`, section: secPlaces, label: signName(s, locale), find: true, run: () => pick(`sign:${s}`) });
      for (let h = 1; h <= 12; h += 1) {
        const cusp = chart.houses[h - 1];
        list.push({ id: `house:${h}`, section: secPlaces, label: houseName(h, locale), hint: cusp ? `${cusp.formatted} ${signName(cusp.sign, locale)}` : undefined, find: true, run: () => pick(`house:${h}`) });
      }
      // What the wheel shows, as actions.
      const secView = t("paletteView");
      for (const id of PRESET_ORDER) {
        list.push({ id: `preset:${id}`, section: secView, label: t(PRESET_LABEL[id]), hint: t("paletteDetail"), find: true, run: () => chartView.applyPreset(id) });
      }
      list.push({
        id: "view:3d",
        section: secView,
        label: depth.view === "3d" ? t("palette2d") : t("palette3d"),
        run: () => {
          setPage("natal");
          setDepthPrefs({ view: depth.view === "3d" ? "flat" : "3d" });
        },
      });
    }
    // The glossary's words, each with the start of its sentence.
    const secWords = t("glossaryTitle");
    for (const id of GLOSSARY_ORDER) {
      const body = glossaryBody(id, locale);
      list.push({
        id: `word:${id}`,
        section: secWords,
        label: glossaryTerm(id, locale),
        hint: body.length > 72 ? `${body.slice(0, 70)}…` : body,
        find: true,
        run: () => {
          void navigate({ to: "/guide" }).then(() => {
            window.setTimeout(() => {
              const box = document.querySelector<HTMLDetailsElement>("[data-testid=guide-glossary]");
              if (box) box.open = true;
              window.setTimeout(() => document.querySelector(`[data-term="${id}"]`)?.scrollIntoView({ block: "center" }), 250);
            }, 150);
          });
        },
      });
    }
    const secLook = t("dockLook");
    for (const p of look.profiles) {
      list.push({ id: `look:${p.id}`, section: secLook, label: p.name, run: () => look.applyProfile(p.id) });
    }
    const secSettings = t("shellSettings");
    list.push(
      { id: "set:light", section: secSettings, label: t("useLight"), run: () => setTheme("light") },
      { id: "set:dark", section: secSettings, label: t("useDark"), run: () => setTheme("dark") },
      { id: "set:en", section: secSettings, label: "English", run: () => setLocale("en") },
      { id: "set:fr", section: secSettings, label: "Français", run: () => setLocale("fr") },
      { id: "set:open", section: secSettings, label: t("shellSettings"), run: () => void navigate({ to: "/settings" }) },
    );
    return list;
  }, [t, locale, rows, chart, view, look, setPage, setView, setTheme, setLocale, navigate, chartView, depth.view]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cmds.filter((c) => !c.find);
    const words = needle.split(/\s+/);
    return cmds.filter((c) => {
      const hay = `${c.label} ${c.hint ?? ""} ${c.section}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [cmds, q]);

  if (typeof document === "undefined") return null;

  const runAt = (i: number) => {
    const c = results[i];
    if (!c) return;
    close();
    c.run();
  };

  let lastSection = "";
  return createPortal(
    <div className="ob-palette-scrim" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="ob-palette" role="dialog" aria-modal="true" aria-label={t("paletteTitle")} data-testid="command-palette">
        <div className="ob-palette-input">
          <Search className="size-4" strokeWidth={1.75} aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="ob-palette-list"
            aria-activedescendant={results[active] ? `ob-cmd-${active}` : undefined}
            aria-label={t("paletteTitle")}
            placeholder={t("palettePlaceholder")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(active);
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
          />
          <kbd className="ob-kbd">Esc</kbd>
        </div>
        <ul id="ob-palette-list" role="listbox" className="ob-palette-list">
          {results.length === 0 ? <li className="ob-palette-none">{t("paletteNone")}</li> : null}
          {results.map((c, i) => {
            const head = c.section !== lastSection ? c.section : null;
            lastSection = c.section;
            return (
              <li key={c.id} role="presentation">
                {head ? <p className="ob-palette-sec">{head}</p> : null}
                <div
                  id={`ob-cmd-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-testid={`cmd-${c.id}`}
                  className="ob-palette-item"
                  onPointerMove={() => setActive(i)}
                  onClick={() => runAt(i)}
                >
                  <span className="ob-palette-label">{c.label}</span>
                  {c.hint ? <span className="ob-palette-hint">{c.hint}</span> : null}
                  {c.keys ? <kbd className="ob-kbd">{c.keys}</kbd> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
