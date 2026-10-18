import { useEffect, useMemo, useState } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { ReadingPanel } from "@/components/reading-panel";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { chartDisplayName } from "@/lib/chart/library";
import { usePack, type PackKind } from "@/lib/content/packs";
import { compareWords } from "@/lib/i18n/catalog/compare-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { cn } from "@/lib/utils";
import { languageById, languageOf } from "@/studio/map";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { useModeDef } from "@/studio/modes/registry";
import { useWheelView } from "@/studio/modes/wheel-view";
import { ChartScopeContext, type ChartScope } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import { useStudioUrl } from "@/studio/use-studio-url";
import { relationshipPageOf } from "@/studio/compare/meet";
import { chooseBoth, chooseIn, useCompare, useScopeData, useScopeReading } from "@/studio/compare/compare-store";
import { linkedState, type Who } from "@/studio/compare/linked";
import { loadShared, type SharedFamily, type SharedItem } from "@/studio/compare/shared";

/*
 * The reading for two (share and compare plan, feature 2): in the Reading
 * tab while Compare is on, over the page's own reading, which waits under it
 * as it was (ReadingTab.tsx). With linked selection, the chosen element's
 * reading in each chart, one under the other, each headed by its person and
 * with its own Read more; a chart without that element says so in one line.
 * With it off, the reading of the chart chosen in last. With nothing chosen:
 * what Compare is beside Relationship, what the two share (idea B9), and each
 * person's first read, folded.
 */

/** The reading text a page's readings are built from (the Chinese pages' come with their code). */
function packKindOf(page: StudioPage): PackKind | null {
  const lang = languageOf(page);
  if (lang && languageById(lang).group === "chinese") return null;
  if (page === "design") return "hd";
  if (page === "numerology" || page === "numerology-cycles") return "num";
  return "astro";
}

/** As the page's own reading panel names its mode (ReadingTab.tsx). */
function askModeOf(page: StudioPage) {
  if (page === "numerology-cycles") return "numerology" as const;
  const lang = languageOf(page);
  if (lang && languageById(lang).group === "chinese") return undefined;
  return page as "natal";
}

/** At most this many of what they share are listed (the rest counted). */
const SHARED_MAX = 10;

export function CompareReading() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const linked = useStudioStore((s) => s.compare.linked);
  const scopes = useCompare((s) => s.scopes);
  const sel = useCompare((s) => s.sel);
  const anything = Boolean(sel.a || sel.b);
  const both = linked || Boolean(sel.together && sel.a && sel.b);
  const only: Who = sel.last ?? (sel.a ? "a" : "b");
  return (
    <div className="ob-compare-reading ulune-dock-scroll" data-testid="compare-reading" data-linked={linked ? "1" : "0"}>
      {!scopes.a || !scopes.b ? (
        <LoadingLines lines={4} />
      ) : !anything ? (
        <FirstRead a={scopes.a} b={scopes.b} />
      ) : both ? (
        <>
          <Jump />
          <Side who="a" scope={scopes.a} />
          <Side who="b" scope={scopes.b} />
        </>
      ) : (
        <>
          <p className="ob-compare-note" data-testid="compare-one">
            {T("cmpOneAtATime")}
          </p>
          <Side who={only} scope={only === "a" ? scopes.a : scopes.b} />
        </>
      )}
      <span hidden data-testid="compare-reading-page">
        {page}
      </span>
    </div>
  );
}

/** Over the two readings, a way to each person's: a long first reading puts the second far down. */
function Jump() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const rows = useCompare((s) => s.rows);
  const to = (who: Who) => {
    const el = document.getElementById(`ob-cmp-side-${who}`);
    el?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  };
  return (
    <nav className="ob-compare-jump" aria-label={T("cmpJump")} data-testid="compare-jump">
      {(["a", "b"] as const).map((who) => {
        const row = rows[who];
        return row ? (
          <button key={who} type="button" className="ob-compare-chip" data-testid={`compare-jump-${who}`} onClick={() => to(who)}>
            <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden /> {`${who.toUpperCase()} · ${chartDisplayName(row.input, t("untitled"))}`}
          </button>
        ) : null;
      })}
    </nav>
  );
}

/** A person's heading: their mark and letter, and their name. */
function Person({ who, name, as: Tag = "h3" }: { who: Who; name: string; as?: "h3" | "span" }) {
  return (
    <Tag className="ob-compare-who" data-testid={`compare-who-${who}`} tabIndex={Tag === "h3" ? -1 : undefined}>
      <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden />
      <span>{`${who.toUpperCase()} · ${name}`}</span>
    </Tag>
  );
}

/** A link inside a reading, followed in Compare: another element (chosen in both, when linked), another page, a moment. */
function useGo() {
  const { setPage } = useStudioUrl({ hydrate: false });
  return (who: Who, ref: string) => {
    if (ref.startsWith("transits-at:")) {
      const at = Number(ref.slice("transits-at:".length));
      if (!Number.isFinite(at)) return;
      useStudioStore.getState().pin(at);
      setPage("transits");
      return;
    }
    const across = /^go:(natal|design|numerology):(.+)$/.exec(ref);
    if (across) {
      chooseIn(who, across[2]!, "pick");
      setPage(across[1] as StudioPage);
      return;
    }
    if (ref.startsWith("calendar-year:")) {
      const year = Number(ref.slice("calendar-year:".length));
      if (!Number.isInteger(year)) return;
      // The Calendar is not compared: it opens as it is, and Compare is left (store.setPage).
      useStudioStore.setState({ calendarAt: { year } });
      setPage("timing");
      return;
    }
    chooseIn(who, ref, "pick");
  };
}

/** Whether a pane's reading may still be on its way: its text, its data. */
function usePending(scope: ChartScope, page: StudioPage, want: boolean): boolean {
  const { locale } = useI18n();
  const kind = packKindOf(page);
  const pack = usePack(kind ?? "astro", locale, want && kind != null);
  const data = useScopeData(scope, page) as { hd?: unknown; dossier?: unknown } | null | undefined;
  if (kind && !pack) return true;
  if (page === "natal") return !scope.state.dossier;
  if (data === undefined) return true;
  if (page === "design") return !data?.hd;
  if (page === "transits" || page === "progressions") return !data?.dossier;
  return false;
}

function Side({ who, scope }: { who: Who; scope: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const row = useCompare((s) => s.rows[who]);
  const id = useCompare((s) => s.sel[who]);
  const reading = useScopeReading(scope, page);
  const pending = usePending(scope, page, Boolean(id));
  const data = useScopeData(scope, page) as { hd?: HumanDesignChart | null } | undefined;
  const { readingDepth } = useWheelView();
  const go = useGo();
  const lang = languageOf(page);
  if (!row) return null;
  const name = chartDisplayName(row.input, t("untitled"));
  const state = id ? linkedState({ page, id, readingId: reading?.id ?? null, pending, hd: data?.hd }) : "lacks";
  return (
    <section id={`ob-cmp-side-${who}`} className="ob-compare-side" data-testid={`compare-side-${who}`} data-state={state} data-reading={state === "read" ? (reading?.id ?? "") : ""}>
      <Person who={who} name={name} />
      {state === "read" && reading ? (
        <div data-testid={`compare-note-${who}`}>
          {/* In its chart's scope: its ids are its own (two cards, one under the other). */}
          <ChartScopeContext.Provider value={scope}>
            <ReadingPanel
              reading={reading}
              grokPending={false}
              chart={row.chart}
              depth={readingDepth}
              onGo={(ref) => go(who, ref)}
              mode={askModeOf(page)}
              tradition={lang ?? "astrology"}
            />
          </ChartScopeContext.Provider>
        </div>
      ) : state === "wait" ? (
        <LoadingLines lines={3} />
      ) : (
        <p className="ob-compare-lacks" data-testid={`compare-lacks-${who}`}>
          {T("cmpLacks", { name })}
        </p>
      )}
    </section>
  );
}

/** With nothing chosen: what Compare is (and the way to Relationship), what the two share, and each person's first read. */
function FirstRead({ a, b }: { a: ChartScope; b: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const rows = useCompare((s) => s.rows);
  const { setPage } = useStudioUrl({ hydrate: false });
  const meet = relationshipPageOf(page);
  return (
    <section className="ob-compare-first" data-testid="compare-first">
      <p className="ob-compare-about">
        {T("cmpAbout")}
        {meet && rows.b ? (
          <>
            {" "}
            <button
              type="button"
              className="ob-compare-inline"
              data-testid="compare-meet-read"
              onClick={() => {
                useStudioStore.getState().setPartner("synastry", rows.b!.id);
                setPage(meet);
              }}
            >
              {T("cmpMeet")} ({t(PAGE_LABEL[meet])})
            </button>
          </>
        ) : null}
      </p>
      {rows.b ? <SharedList a={a} b={b} /> : null}
      <p className="ob-compare-hint">{T("cmpPickHint")}</p>
      <FirstOf who="a" scope={a} />
      {rows.b ? <FirstOf who="b" scope={b} /> : null}
    </section>
  );
}

/** One person's first read, folded: the page's own (its hello), or its reading when the page reads something unasked (a year). */
function FirstOf({ who, scope }: { who: Who; scope: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const row = useCompare((s) => s.rows[who]);
  const { def } = useModeDef(page);
  const reading = useScopeReading(scope, page);
  const { readingDepth } = useWheelView();
  const go = useGo();
  if (!row) return null;
  const name = chartDisplayName(row.input, t("untitled"));
  return (
    <details className="ob-compare-fold" data-testid={`compare-first-${who}`}>
      <summary>
        <Person who={who} name={T("cmpFirstRead", { name })} as="span" />
      </summary>
      <div className="ob-compare-fold-body">
        {/* Its own scope: a choice in the first read is that chart's (and the other's, linked). */}
        <ChartScopeContext.Provider value={scope}>
          {reading ? (
            <ReadingPanel reading={reading} grokPending={false} chart={row.chart} depth={readingDepth} onGo={(ref) => go(who, ref)} mode={askModeOf(page)} tradition={languageOf(page) ?? "astrology"} />
          ) : def ? (
            <def.HelloEmpty />
          ) : (
            <LoadingLines lines={3} />
          )}
        </ChartScopeContext.Provider>
      </div>
    </details>
  );
}

/** What they share (idea B9): each item chooses its element in both charts. */
function SharedList({ a, b }: { a: ChartScope; b: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const rows = useCompare((s) => s.rows);
  const lang = languageOf(page);
  const [family, setFamily] = useState<{ lang: string; code: SharedFamily } | null>(null);
  useEffect(() => {
    let live = true;
    void loadShared(page)?.then((code) => {
      if (live && lang) setFamily({ lang, code });
    });
    return () => {
      live = false;
    };
    // One download per language: the page within it changes nothing here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  const da = useScopeData(a, page);
  const db = useScopeData(b, page);
  const items = useMemo<SharedItem[] | null>(() => {
    if (!family || family.lang !== lang || !rows.a || !rows.b) return null;
    return family.code.sharedItems(
      page,
      { chart: rows.a.chart, data: da, count: rows.a.input.chineseCount },
      { chart: rows.b.chart, data: db, count: rows.b.input.chineseCount },
      locale,
      T,
    );
    // T follows the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, lang, page, rows.a, rows.b, da, db, locale]);
  return (
    <section className="ob-compare-shared" data-testid="compare-shared" aria-labelledby="ob-cmp-shared-h">
      <h3 id="ob-cmp-shared-h" className="ob-compare-h">
        {T("cmpShared")}
      </h3>
      {items === null ? (
        <LoadingLines lines={2} />
      ) : items.length ? (
        <>
          <p className="ob-compare-sub">{T("cmpSharedHint")}</p>
          <ul className="ob-compare-chips">
            {items.slice(0, SHARED_MAX).map((it) => (
              <li key={it.key}>
                <button type="button" className="ob-compare-chip" data-testid={`compare-shared-${it.key}`} data-ids={`${it.ids.a}|${it.ids.b}`} onClick={() => chooseBoth(it.ids)}>
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
          {items.length > SHARED_MAX ? <p className="ob-compare-sub">{T("cmpSharedMore", { n: items.length - SHARED_MAX })}</p> : null}
        </>
      ) : (
        <p className="ob-compare-sub" data-testid="compare-shared-none">
          {T("cmpSharedNone")}
        </p>
      )}
    </section>
  );
}
