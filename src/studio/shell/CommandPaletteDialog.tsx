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
import { useEncyclopediaCommands } from "@/encyclopedia/palette";
import { pickerWord } from "@/studio/shell/picker-words";
import { PRESET_ORDER, type NamedPresetId } from "@/lib/chart/chart-view";
import { useChartView } from "@/lib/chart/use-chart-view";
import { setDepthPrefs, useDepthPrefs } from "@/lib/depth/prefs";
import type { MessageKey } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/locale";
import { useLookProfiles } from "@/lib/look-provider";
import { placeWord } from "@/lib/i18n/places-words";
import { useTheme } from "@/lib/theme";
import { openKeptHome, readHomeList, useHomeList } from "@/studio/modes/fengshui-home-list";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { enterCompare, leaveCompare } from "@/studio/compare/gate";
import { openAskSheet } from "@/components/share/share-state";
import { flipRow } from "@/studio/show/flip";
import { enterShowMode } from "@/studio/show/show-state";
import { useStudioStore } from "@/studio/store";
import {
  ENCYCLOPEDIA_PATHS,
  LANGUAGES,
  LENSES,
  languageOf,
  lastLanguage,
  lensesOf,
  pageFor,
  pagesOf,
} from "@/studio/map";
import { LANGUAGE_WORDS, LENS_LABEL } from "@/studio/shell/map-ui";
import { languageAliases, paletteFinds, paletteWords, typedWords } from "@/studio/shell/palette-find";
import { useStudioUrl } from "@/studio/use-studio-url";

/**
 * `find`: listed only once something is typed (aspects, signs, houses, words: too many to show at rest).
 * `terms`: other names it is found by, never shown (a Chinese language's pinyin and characters: palette-find.ts).
 */
type Cmd = { id: string; section: string; label: string; hint?: string; terms?: string; keys?: string; find?: boolean; run: () => void };

const PRESET_LABEL: Record<NamedPresetId, MessageKey> = {
  minimal: "presetMinimal",
  classic: "presetClassic",
  advanced: "presetAdvanced",
  all: "presetAll",
  clear: "presetNone",
};

/**
 * The palette itself (CommandPalette.tsx opens it): every section, language,
 * lens, mode, chart, home kept (reorganisation plan, R9), body, Look profile
 * and setting, searched as you type, case and accents aside, the Chinese
 * languages by their pinyin and characters too (palette-find.ts, languages
 * plan, part 28). Its own download, fetched when the page is idle so ⌘K
 * still opens at once.
 */
export function CommandPaletteDialog({ onClose }: { onClose: () => void }) {
  const { locale, setLocale, t } = useI18n();
  const { setTheme } = useTheme();
  // Profiles only: the palette doesn't re-render for every Look colour tick.
  const look = useLookProfiles();
  const navigate = useNavigate();
  const { setPage, setView } = useStudioUrl({ hydrate: false });
  const rows = useStudioStore((s) => s.rows);
  const page = useStudioStore((s) => s.page);
  const chart = useStudioStore((s) => s.chart);
  const activeId = useStudioStore((s) => s.activeId);
  const compareOn = useStudioStore((s) => s.compare.on);
  // The chart open before this one (idea B3).
  const back = useStudioStore((s) => flipRow(s));
  const view = useStudioStore((s) => s.view);
  const chartView = useChartView();
  const depth = useDepthPrefs();
  // The homes kept in the open private space (fengshui-home-list.ts), read if they aren't yet.
  const homes = useHomeList((s) => s.homes);
  useEffect(() => {
    void readHomeList();
  }, []);
  const [q, setQ] = useState("");
  // The encyclopedia's entries, after everything else (src/encyclopedia/palette.ts).
  const pages = useEncyclopediaCommands(q, locale);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = onClose;

  useEffect(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [];
    // The map (page reorganisation, R8): the sections, every language, every
    // lens of a language that has several, and every page of a lens.
    const here = languageOf(page) ?? lastLanguage();
    const secSections = t("sectionsNav");
    list.push(
      { id: "section:charts", section: secSections, label: t("sectionCharts"), run: () => setPage(pageFor(lastLanguage())) },
      { id: "section:calendar", section: secSections, label: t("sectionCalendar"), run: () => setPage("timing") },
      {
        id: "section:encyclopedia",
        section: secSections,
        label: t("sectionEncyclopedia"),
        run: () => void navigate({ href: locale === "fr" ? ENCYCLOPEDIA_PATHS.fr : ENCYCLOPEDIA_PATHS.en }),
      },
    );
    // A Chinese language, its lenses and its pages are also found by its pinyin and characters (part 28).
    const secLanguages = pickerWord(locale, "paletteLanguages");
    for (const l of LANGUAGES) {
      const words = LANGUAGE_WORDS[l.id];
      list.push({
        id: `lang:${l.id}`,
        section: secLanguages,
        label: t(words.name),
        hint: pickerWord(locale, words.line),
        terms: languageAliases(l.id),
        keys: l.id === here ? "L" : undefined,
        run: () => setPage(pageFor(l.id)),
      });
    }
    const secLenses = t("lensesLabel");
    for (const l of LANGUAGES) {
      const lenses = lensesOf(l.id);
      if (lenses.length < 2) continue;
      for (const lens of lenses) {
        list.push({
          id: `lens:${l.id}:${lens}`,
          section: secLenses,
          label: t(LENS_LABEL[lens]),
          hint: t(LANGUAGE_WORDS[l.id].name),
          terms: languageAliases(l.id),
          keys: l.id === here ? `Alt+${LENSES.indexOf(lens) + 1}` : undefined,
          run: () => setPage(pageFor(l.id, lens)),
        });
      }
    }
    const secModes = t("paletteModes");
    for (const l of LANGUAGES) {
      const name = t(LANGUAGE_WORDS[l.id].name);
      for (const lens of lensesOf(l.id)) {
        for (const p of pagesOf(l.id, lens)) {
          // A page named as its language (Human Design) is the language's own entry.
          if (t(PAGE_LABEL[p]) === name) continue;
          list.push({
            id: `mode:${p}`,
            section: secModes,
            label: t(PAGE_LABEL[p]),
            hint: `${name} › ${t(LENS_LABEL[lens])}`,
            terms: languageAliases(l.id),
            run: () => setPage(p),
          });
        }
      }
    }
    if (chart) {
      list.push({
        id: "view:toggle",
        section: secModes,
        label: view === "table" ? t("viewWheel") : t("viewTable"),
        keys: "T",
        run: () => setView(view === "table" ? "wheel" : "table"),
      });
      // Compare (studio/compare): on (on the page shown, or its language's Natal page), or off again.
      list.push({
        id: "compare:toggle",
        section: secModes,
        label: t("compare"),
        hint: compareOn ? "✓" : undefined,
        keys: "C",
        run: () => (compareOn ? leaveCompare() : enterCompare(null, setPage)),
      });
      // Show mode (idea B2): the page on screen as a presentation, where one is on screen (its button is there).
      list.push({
        id: "show:mode",
        section: secModes,
        label: t("showMode"),
        keys: "F",
        run: () => {
          if (document.querySelector("[data-testid=show-open]")) enterShowMode();
        },
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
    // Back to the chart open before this one (idea B3), as the P key does.
    if (back) {
      const id = back.id;
      list.push({
        id: "chart:previous",
        section: secCharts,
        label: t("flipBack", { name: chartDisplayName(back.input, t("untitled")) }),
        keys: "P",
        run: () => useStudioStore.getState().select(id),
      });
    }
    list.push({ id: "chart:new", section: secCharts, label: t("newNatal"), run: () => useStudioStore.getState().startNew() });
    // Ask someone for their chart (idea B4): a link to Ulune's birth form for them.
    // (Once the palette has given the focus back, a frame after it closes: the sheet then takes it.)
    list.push({ id: "chart:ask", section: secCharts, label: t("askChart"), run: () => window.requestAnimationFrame(() => window.requestAnimationFrame(openAskSheet)) });
    // "Compare with Sample B", found by typing: beside the chart shown (studio/compare).
    if (chart) {
      for (const r of rows) {
        if (r.id === activeId) continue;
        list.push({
          id: `compare:${r.id}`,
          section: secCharts,
          label: t("compareWith", { name: chartDisplayName(r.input, t("untitled")) }),
          find: true,
          run: () => enterCompare(r.id, setPage),
        });
      }
    }
    // A home opens on Feng Shui's Home page, as from the switcher; the chart stays.
    const secHomes = placeWord(locale, "placesHomes");
    for (const h of homes) {
      list.push({
        id: `home:${h.id}`,
        section: secHomes,
        label: h.name,
        hint: t("langFengShui"),
        run: () =>
          void openKeptHome(h.id).then((ok) => {
            if (ok) setPage("fengshui-home");
          }),
      });
    }
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
  }, [t, locale, page, rows, homes, chart, activeId, compareOn, back, view, look, setPage, setView, setTheme, setLocale, navigate, chartView, depth.view]);

  // Each command's words, case and accents set aside once (palette-find.ts): "bazi", "bāzì" and 八字 find BaZi.
  const hays = useMemo(() => cmds.map((c) => paletteWords(c.label, c.hint, c.section, c.terms)), [cmds]);
  const results = useMemo(() => {
    const words = typedWords(q);
    if (!words.length) return cmds.filter((c) => !c.find);
    return cmds.filter((_, i) => paletteFinds(words, hays[i]!)).concat(pages);
  }, [cmds, hays, q, pages]);

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
