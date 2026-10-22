import { useEffect, useMemo, useState } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { ReadingPanel } from "@/components/reading-panel";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { chartDisplayName } from "@/lib/chart/library";
import type { ElementReading } from "@/lib/chart/types";
import { usePack, type PackKind } from "@/lib/content/packs";
import { compareWords } from "@/lib/i18n/catalog/compare-words";
import { useI18n } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { importWithRetry } from "@/lib/lazy-retry";
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
import type { AgreeList } from "@/studio/compare/agree";
import type { CompareMode } from "@/studio/compare/compare-modes";
import { relationshipPageOf } from "@/studio/compare/meet";
import { chooseAll, chooseBoth, chooseIn, setLangPage, useCompare, useScopeData, useScopeReading } from "@/studio/compare/compare-store";
import { linkedState, WHO, type Who } from "@/studio/compare/linked";
import { momentWords, pageWords } from "@/studio/compare/pane-words";
import { loadShared, type SharedFamily, type SharedItem, type SharedSay } from "@/studio/compare/shared";
import { groupShared, pairsOf, type GroupItem } from "@/studio/compare/shared-group";

/*
 * The reading for two or more (share and compare plan, feature 2, ideas B7,
 * B8 and B9): in the Reading tab while Compare is on, over the page's own
 * reading, which waits under it as it was (ReadingTab.tsx).
 *   - With linked selection, the element chosen, in every chart: for two,
 *     both readings one under the other, each headed by its person, with its
 *     own Read more; for three or four, a short list, names first, each
 *     opening its full reading. A chart without that element says so in one
 *     line.
 *   - With it off (and always between two languages, which share no
 *     elements), the reading of the chart chosen in last.
 *   - With nothing chosen: what this way of comparing is; what the two share
 *     (B9), what all three or four share and what most of them do (B8), or
 *     where two languages agree (B7); and each pane's first read, folded.
 */

type T = ReturnType<typeof bookT<typeof compareWords>>;

/** The reading text a page's readings are built from (the Chinese pages' come with their code). */
function packKindOf(page: StudioPage): PackKind | null {
  const lang = languageOf(page);
  if (lang && languageById(lang).group === "chinese") return null;
  if (page === "design") return "hd";
  // Human Design's Cycles (feature 5b) reads from its own text.
  if (page === "design-cycles") return "hdcycles";
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

/** The page a pane draws: its own (the mixed ways), else the studio's. */
const pageIn = (scope: ChartScope | null, page: StudioPage): StudioPage => scope?.page ?? page;

/** How a pane is named in the reading: "A · Camille"; in the mixed ways, by what it shows ("B · Human Design · Natal", "B · Transits · 2027"). */
function useWhoLine(): (who: Who) => string {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const mode = useCompare((s) => s.mode);
  const rows = useCompare((s) => s.rows);
  const scopes = useCompare((s) => s.scopes);
  return (who) => {
    const letter = who.toUpperCase();
    const row = rows[who];
    const name = row ? chartDisplayName(row.input, t("untitled")) : "";
    if (mode === "people") return `${letter} · ${name}`;
    const at = pageIn(scopes[who], page);
    const moment = scopes[who]?.moment;
    return [letter, pageWords(at, t, T), mode === "moments" && moment ? momentWords(at, moment, locale, T) : ""].filter(Boolean).join(" · ");
  };
}

export function CompareReading() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const linkOn = useStudioStore((s) => s.compare.linked);
  const scopes = useCompare((s) => s.scopes);
  const shown = useCompare((s) => s.shown);
  const mode = useCompare((s) => s.mode);
  const sel = useCompare((s) => s.sel);
  const linked = linkOn && mode !== "languages";
  const ready = shown.every((w) => scopes[w]);
  const chosen = shown.filter((w) => sel[w]);
  const together = linked || Boolean(sel.together && chosen.length > 1);
  const only: Who = sel.last && shown.includes(sel.last) ? sel.last : (chosen[0] ?? "a");
  const many = shown.length > 2;
  let body;
  if (!ready) body = <LoadingLines lines={4} />;
  else if (!chosen.length) body = <FirstRead />;
  else if (together && many) body = <Group people={sel.together ? chosen : shown} />;
  else if (together)
    body = (
      <>
        <Jump people={shown} />
        {shown.map((w) => (
          <Side key={w} who={w} scope={scopes[w]!} />
        ))}
      </>
    );
  else
    body = (
      <>
        {mode === "people" ? (
          <p className="ob-compare-note" data-testid="compare-one">
            {T("cmpOneAtATime")}
          </p>
        ) : null}
        <Side who={only} scope={scopes[only]!} />
      </>
    );
  return (
    <div className="ob-compare-reading ulune-dock-scroll" data-testid="compare-reading" data-linked={linked ? "1" : "0"} data-mode={mode} data-count={shown.length}>
      {body}
      <span hidden data-testid="compare-reading-page">
        {page}
      </span>
    </div>
  );
}

/** Over the two readings, a way to each one: a long first reading puts the second far down. */
function Jump({ people }: { people: Who[] }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const rows = useCompare((s) => s.rows);
  const line = useWhoLine();
  const to = (who: Who) => {
    const el = document.getElementById(`ob-cmp-side-${who}`);
    el?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  };
  return (
    <nav className="ob-compare-jump" aria-label={T("cmpJump")} data-testid="compare-jump">
      {people.map((who) =>
        rows[who] ? (
          <button key={who} type="button" className="ob-compare-chip" data-testid={`compare-jump-${who}`} onClick={() => to(who)}>
            <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden /> {line(who)}
          </button>
        ) : null,
      )}
    </nav>
  );
}

/** A pane's heading: its mark, and its letter and person (or what it shows). */
function Person({ who, text, as: Tag = "h3" }: { who: Who; text: string; as?: "h3" | "span" }) {
  return (
    <Tag className="ob-compare-who" data-testid={`compare-who-${who}`} tabIndex={Tag === "h3" ? -1 : undefined}>
      <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden />
      <span>{text}</span>
    </Tag>
  );
}

/** A link inside a reading, followed in Compare: another element (chosen in every chart, when linked), another page, a moment. */
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
      const to = across[1] as StudioPage;
      const { mode } = useCompare.getState();
      // Two languages: a link in B's reading turns B to that page, when it is another language than A's.
      if (mode === "languages" && who !== "a") {
        if (languageOf(to) !== languageOf(useStudioStore.getState().page)) setLangPage(to);
        chooseIn(who, across[2]!, "pick");
        return;
      }
      chooseIn(who, across[2]!, "pick");
      setPage(to);
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
  // Human Design's Cycles: until its moment's sky is in.
  if (page === "design-cycles") return !(data as { ctx?: unknown } | null)?.ctx;
  return false;
}

/** One pane's reading of the element chosen: its state ("read", "wait", "lacks") and what it needs to say so. */
function useLinkedReading(who: Who, scope: ChartScope) {
  const studioPage = useStudioStore((s) => s.page);
  const page = pageIn(scope, studioPage);
  const row = useCompare((s) => s.rows[who]);
  const id = useCompare((s) => s.sel[who]);
  const reading = useScopeReading(scope, page);
  const pending = usePending(scope, page, Boolean(id));
  const data = useScopeData(scope, page) as { hd?: HumanDesignChart | null } | undefined;
  const state = id ? linkedState({ page, id, readingId: reading?.id ?? null, pending, hd: data?.hd }) : "lacks";
  return { page, row, reading, state };
}

/** The line a pane without the element shows: not in that person's chart, or (two moments) not on that page. */
function lacksLine(mode: CompareMode, page: StudioPage, name: string, t: (key: MessageKey) => string, T: T): string {
  return mode === "moments" ? T("cmpLacksPage", { page: t(PAGE_LABEL[page]) }) : T("cmpLacks", { name });
}

function Side({ who, scope }: { who: Who; scope: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const mode = useCompare((s) => s.mode);
  const { page, row, reading, state } = useLinkedReading(who, scope);
  const { readingDepth } = useWheelView();
  const go = useGo();
  const line = useWhoLine();
  if (!row) return null;
  const name = chartDisplayName(row.input, t("untitled"));
  return (
    <section id={`ob-cmp-side-${who}`} className="ob-compare-side" data-testid={`compare-side-${who}`} data-state={state} data-reading={state === "read" ? (reading?.id ?? "") : ""}>
      <Person who={who} text={line(who)} />
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
              tradition={languageOf(page) ?? "astrology"}
            />
          </ChartScopeContext.Provider>
        </div>
      ) : state === "wait" ? (
        <LoadingLines lines={3} />
      ) : (
        <p className="ob-compare-lacks" data-testid={`compare-lacks-${who}`}>
          {lacksLine(mode, page, name, t, T)}
        </p>
      )}
    </section>
  );
}

/** A reading's first sentence, for a short list. */
function firstLine(r: ElementReading): string {
  const text = (r.lead ?? r.note ?? r.paragraphs[0] ?? "").replace(/\s+/g, " ").trim();
  const sentence = /^.+?[.!?…](?=\s|$)/.exec(text)?.[0] ?? text;
  return sentence.length > 180 ? `${sentence.slice(0, 177).replace(/\s+\S*$/, "")}…` : sentence;
}

/** Three or four people, one element: a short list, names first, each opening its full reading. */
function Group({ people }: { people: Who[] }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const scopes = useCompare((s) => s.scopes);
  return (
    <section className="ob-compare-group" data-testid="compare-group" aria-labelledby="ob-cmp-group-h">
      <h3 id="ob-cmp-group-h" className="ob-compare-h">
        {T("cmpEveryone")}
      </h3>
      <ul className="ob-compare-rows">
        {people.map((w) => (scopes[w] ? <GroupRow key={w} who={w} scope={scopes[w]!} /> : null))}
      </ul>
    </section>
  );
}

function GroupRow({ who, scope }: { who: Who; scope: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const mode = useCompare((s) => s.mode);
  const { page, row, reading, state } = useLinkedReading(who, scope);
  const { readingDepth } = useWheelView();
  const go = useGo();
  if (!row) return null;
  const name = chartDisplayName(row.input, t("untitled"));
  const head = (
    <span className="ob-compare-row-who">
      <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden />
      <span className="ob-compare-row-name">{`${who.toUpperCase()} · ${name}`}</span>
    </span>
  );
  return (
    <li className="ob-compare-row" id={`ob-cmp-side-${who}`} data-testid={`compare-row-${who}`} data-state={state} data-reading={state === "read" ? (reading?.id ?? "") : ""}>
      {state === "read" && reading ? (
        <details className="ob-compare-fold ob-compare-row-fold">
          <summary>
            <span className="ob-compare-row-text">
              {head}
              <span className="ob-compare-row-title">{reading.title}</span>
              <span className="ob-compare-row-line">{firstLine(reading)}</span>
            </span>
          </summary>
          <div className="ob-compare-fold-body" data-testid={`compare-note-${who}`}>
            <ChartScopeContext.Provider value={scope}>
              <ReadingPanel reading={reading} grokPending={false} chart={row.chart} depth={readingDepth} onGo={(ref) => go(who, ref)} mode={askModeOf(page)} tradition={languageOf(page) ?? "astrology"} />
            </ChartScopeContext.Provider>
          </div>
        </details>
      ) : (
        <div className="ob-compare-row-text">
          {head}
          {state === "wait" ? (
            <LoadingLines lines={1} />
          ) : (
            <span className="ob-compare-row-line" data-testid={`compare-lacks-${who}`}>
              {lacksLine(mode, page, name, t, T)}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

/** With nothing chosen: what this way of comparing is, what they share (or where two languages agree), and each pane's first read. */
function FirstRead() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const rows = useCompare((s) => s.rows);
  const scopes = useCompare((s) => s.scopes);
  const shown = useCompare((s) => s.shown);
  const mode = useCompare((s) => s.mode);
  const { setPage } = useStudioUrl({ hydrate: false });
  const meet = mode === "people" && shown.length === 2 ? relationshipPageOf(page) : null;
  const about = mode === "languages" ? T("cmpAboutLanguages") : mode === "moments" ? T("cmpAboutMoments") : shown.length > 2 ? T("cmpAboutGroup") : T("cmpAbout");
  return (
    <section className="ob-compare-first" data-testid="compare-first">
      <p className="ob-compare-about">
        {about}
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
      {mode === "people" && shown.length === 2 && rows.b ? <SharedList a={scopes.a!} b={scopes.b!} /> : null}
      {mode === "people" && shown.length > 2 ? <GroupShared /> : null}
      {mode === "languages" ? <AgreeSection /> : null}
      {/* The two languages' and two moments' line above says how to choose. */}
      {mode === "people" ? <p className="ob-compare-hint">{T(shown.length > 2 ? "cmpPickHintGroup" : "cmpPickHint")}</p> : null}
      {shown.map((w) => (rows[w] && scopes[w] ? <FirstOf key={w} who={w} scope={scopes[w]!} /> : null))}
    </section>
  );
}

/** One pane's first read, folded: its page's own (its hello), or its reading when the page reads something unasked (a year). */
function FirstOf({ who, scope }: { who: Who; scope: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const studioPage = useStudioStore((s) => s.page);
  const page = pageIn(scope, studioPage);
  const row = useCompare((s) => s.rows[who]);
  const mode = useCompare((s) => s.mode);
  const { def } = useModeDef(page);
  const reading = useScopeReading(scope, page);
  const { readingDepth } = useWheelView();
  const go = useGo();
  const line = useWhoLine();
  if (!row) return null;
  const name = chartDisplayName(row.input, t("untitled"));
  return (
    <details className="ob-compare-fold" data-testid={`compare-first-${who}`}>
      <summary>
        <Person who={who} text={mode === "people" ? `${who.toUpperCase()} · ${T("cmpFirstRead", { name })}` : line(who)} as="span" />
      </summary>
      <div className="ob-compare-fold-body">
        {/* Its own scope: a choice in the first read is that chart's (and the others', linked). */}
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

/** The code that finds what two charts share on this page, its language's (one download per language). */
function useFamily(page: StudioPage): SharedFamily | null {
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
  return family && family.lang === lang ? family.code : null;
}

/** What two share (idea B9): each item chooses its element in both charts. */
function SharedList({ a, b }: { a: ChartScope; b: ChartScope }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const rows = useCompare((s) => s.rows);
  const family = useFamily(page);
  const da = useScopeData(a, page);
  const db = useScopeData(b, page);
  const items = useMemo<SharedItem[] | null>(() => {
    if (!family || !rows.a || !rows.b) return null;
    return family.sharedItems(page, { chart: rows.a.chart, data: da, count: rows.a.input.chineseCount }, { chart: rows.b.chart, data: db, count: rows.b.input.chineseCount }, locale, T);
    // T follows the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, page, rows.a, rows.b, da, db, locale]);
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
          <Chips items={items.slice(0, SHARED_MAX).map((it) => ({ key: it.key, label: it.label, ids: it.ids }))} onChoose={(ids) => chooseBoth(ids as { a: string; b: string })} />
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

/** Chips that choose their element in the charts that have it. */
function Chips({ items, onChoose, testId = "compare-shared" }: { items: { key: string; label: string; ids: Partial<Record<Who, string>> }[]; onChoose: (ids: Partial<Record<Who, string>>) => void; testId?: string }) {
  return (
    <ul className="ob-compare-chips">
      {items.map((it) => (
        <li key={it.key + it.label}>
          <button
            type="button"
            className="ob-compare-chip"
            data-testid={`${testId}-${it.key}`}
            data-ids={WHO.filter((w) => it.ids[w] != null)
              .map((w) => it.ids[w])
              .join("|")}
            data-who={WHO.filter((w) => it.ids[w] != null).join("")}
            onClick={() => onChoose(it.ids)}
          >
            {it.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** What three or four share (idea B8): what all of them do, then what most of them do, with their count. */
function GroupShared() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const rows = useCompare((s) => s.rows);
  const scopes = useCompare((s) => s.scopes);
  const shown = useCompare((s) => s.shown);
  const family = useFamily(page);
  const data: Record<Who, unknown> = {
    a: useScopeData(scopes.a, page),
    b: useScopeData(scopes.b, page),
    c: useScopeData(scopes.c, page),
    d: useScopeData(scopes.d, page),
  };
  const { a: da, b: db, c: dc, d: dd } = data;
  const found = useMemo(() => {
    if (!family || shown.some((w) => !rows[w])) return null;
    // An animal at different places in two charts reads "in both charts" for two: here, in several.
    const say: SharedSay = (key, vars) => (key === "cmpBothAnimal" ? T("cmpAnimalAt", vars) : T(key, vars));
    const side = (w: Who) => ({ chart: rows[w]!.chart, data: data[w], count: rows[w]!.input.chineseCount });
    const pairs = pairsOf(shown).map(([x, y]) => ({ x, y, items: family.sharedItems(page, side(x), side(y), locale, say) }));
    return groupShared(shown, pairs);
    // T follows the locale; the four data are listed one by one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, page, rows, shown, da, db, dc, dd, locale]);
  const n = shown.length;
  return (
    <section className="ob-compare-shared" data-testid="compare-shared" data-count={n} aria-labelledby="ob-cmp-shared-h">
      <h3 id="ob-cmp-shared-h" className="ob-compare-h">
        {T(n > 3 ? "cmpSharedAll4" : "cmpSharedAll3")}
      </h3>
      {found === null ? (
        <LoadingLines lines={2} />
      ) : (
        <>
          {found.all.length ? (
            <>
              <p className="ob-compare-sub">{T("cmpSharedAllHint")}</p>
              <Chips items={found.all.slice(0, SHARED_MAX)} onChoose={chooseAll} />
            </>
          ) : (
            <p className="ob-compare-sub" data-testid="compare-shared-none">
              {T("cmpSharedNoneAll")}
            </p>
          )}
          {found.most.length ? (
            <div className="ob-compare-most" data-testid="compare-most">
              <h4 className="ob-compare-h4">{T("cmpSharedMost")}</h4>
              <Chips
                testId="compare-most"
                items={found.most.slice(0, SHARED_MAX).map((g: GroupItem) => ({ ...g, label: T("cmpSharedCount", { label: g.label, n: g.count, of: n }) }))}
                onChoose={chooseAll}
              />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/** Where two languages agree (idea B7; agree.ts, its own download): each item chooses its element in both panes. */
function AgreeSection() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const rows = useCompare((s) => s.rows);
  const scopes = useCompare((s) => s.scopes);
  const [code, setCode] = useState<typeof import("@/studio/compare/agree") | null>(null);
  useEffect(() => {
    let live = true;
    void importWithRetry(() => import("@/studio/compare/agree")).then((m) => {
      if (live) setCode(m);
    });
    return () => {
      live = false;
    };
  }, []);
  const pageA = pageIn(scopes.a, page);
  const pageB = pageIn(scopes.b, page);
  const da = useScopeData(scopes.a, page);
  const db = useScopeData(scopes.b, page);
  const list = useMemo<AgreeList | null | undefined>(() => {
    if (!code || !rows.a) return undefined;
    return code.agreeItems({ page: pageA, chart: rows.a.chart, data: da }, { page: pageB, chart: rows.a.chart, data: db }, locale, T);
    // T follows the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, rows.a, pageA, pageB, da, db, locale]);
  return (
    <section className="ob-compare-shared" data-testid="compare-agree" aria-labelledby="ob-cmp-agree-h">
      <h3 id="ob-cmp-agree-h" className="ob-compare-h">
        {T("cmpAgree")}
      </h3>
      {list === undefined ? (
        <LoadingLines lines={2} />
      ) : list === null ? (
        <p className="ob-compare-sub" data-testid="compare-agree-none">
          {T("cmpAgreeNone")}
        </p>
      ) : (
        <>
          <p className="ob-compare-sub">{T(list.why)}</p>
          {list.items.length ? (
            <>
              <p className="ob-compare-sub">{T("cmpAgreeHint")}</p>
              <Chips testId="compare-agree" items={list.items} onChoose={(ids) => chooseBoth(ids as { a: string; b: string })} />
            </>
          ) : (
            <p className="ob-compare-sub" data-testid="compare-agree-not">
              {T("cmpAgreeNot")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
