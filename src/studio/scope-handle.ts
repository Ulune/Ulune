import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { blankBirth, hydrateBirthInput, type SavedChart } from "@/lib/chart/library";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { createSlotStore, type ChartScope, type ScopeMoment, type ScopeState } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * A chart scope of its own, "a" to "d" (share and compare plan, feature 2,
 * the foundation, and ideas B7 and B8; scope.tsx says what a scope is).
 * Compare's view makes one per pane with useChartScopeHandle (with, in its
 * mixed ways, a page or a moment of the pane's own) and draws the pane inside
 * <ChartScopeProvider scope={…}> (scope-provider.tsx): the pages drawn there
 * read that chart, keep their own selection and run their own runtime
 * (modes/data.tsx). Outside the provider, the handle still gives the scope's
 * reading (useModeReading(scope)) and its selection (scope.state), for a
 * reading that shows both.
 *
 * A scope only reads its saved chart: what changes a chart (numerology's names
 * and Y's, the Chinese count, the birth form) stays the main scope's, and a
 * pair page's "A" list and Add go through `onChart` and `onAddPerson` when the
 * view gives them (nothing happens otherwise). Loaded with Compare only: none
 * of this is in the first download.
 */

export type ScopeSelectHow = "pick" | "choose" | "clear";

export type ChartScopeOptions = {
  id: "a" | "b" | "c" | "d";
  /** The saved chart the scope draws (null: nothing to draw). */
  row: SavedChart | null;
  /** The second person of its Relationship pages (synastry's and the Chinese pages'), then the composite's; chosen there afterwards. */
  partnerId?: string | null;
  compositePartnerId?: string | null;
  /**
   * The selection, when the view holds it (linked selection: both panes given
   * the same id). Left out, the scope keeps its own.
   */
  selectedId?: string | null;
  /** Every choice made in the scope (also when it keeps its own selection). */
  onSelect?: (next: string | null, how: ScopeSelectHow) => void;
  /** The reading stands beside the figure (Compare's layout decides; default no, a sheet over it). */
  readingBeside?: boolean;
  /** A pair page's A list or Swap asked for another chart in this scope. */
  onChart?: (rowId: string) => void;
  /** A pair page asked to add someone. */
  onAddPerson?: (page: StudioPage) => void;
  /** The pick card's Read: opens this scope's reading. */
  openReading?: () => void;
  /** A page of its own, other than the studio's (Compare's two languages and two moments, idea B7). */
  page?: StudioPage;
  /** A moment of its own, and how its dials move it (Compare's two moments, idea B7; scope-time.ts). */
  moment?: ScopeMoment;
  setMoment?: (patch: Partial<ScopeMoment>) => void;
};

const keepAsIs = () => {};

/** The scope's state, its runtimes' slots and its options: hand it to ChartScopeProvider (and to useModeReading for its reading). */
export function useChartScopeHandle(opts: ChartScopeOptions): ChartScope {
  const { locale } = useI18n();
  const row = opts.row;
  const chart = row?.chart ?? null;
  const input = useMemo(() => (row ? hydrateBirthInput(row) : blankBirth()), [row]);
  // The natal readings of this chart, as the workspace builds the main one's.
  const astro = usePack("astro", locale, Boolean(chart));
  const dossier = useMemo(() => (chart && astro ? astro.dossierFor(chart, locale) : null), [chart, astro, locale]);
  // Composite or Davison is the page's choice, shared by both panes (it follows the toolbar).
  const compositeKind = useStudioStore((s) => s.pair.compositeKind);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const controlled = opts.selectedId !== undefined;
  const [own, setOwn] = useState<string | null>(null);
  const selectedId = controlled ? (opts.selectedId ?? null) : own;
  // The selection as last set, read by the next toggle at once (two in a row before a render).
  const selRef = useRef(selectedId);
  selRef.current = selectedId;
  const set = useCallback((next: string | null, how: ScopeSelectHow) => {
    selRef.current = next;
    if (optsRef.current.selectedId === undefined) setOwn(next);
    optsRef.current.onSelect?.(next, how);
  }, []);
  const pick = useCallback((id: string) => set(selRef.current === id ? null : id, "pick"), [set]);
  const choose = useCallback((id: string) => set(selRef.current === id ? null : id, "choose"), [set]);
  const clear = useCallback(() => set(null, "clear"), [set]);

  const [partners, setPartners] = useState(() => ({
    partnerId: opts.partnerId ?? null,
    compositePartnerId: opts.compositePartnerId ?? opts.partnerId ?? null,
  }));
  // Another second person handed by the view replaces the one chosen here.
  const given = `${opts.partnerId ?? ""}|${opts.compositePartnerId ?? ""}`;
  const givenAt = useRef(given);
  useEffect(() => {
    if (givenAt.current === given) return;
    givenAt.current = given;
    const o = optsRef.current;
    setPartners({ partnerId: o.partnerId ?? null, compositePartnerId: o.compositePartnerId ?? o.partnerId ?? null });
  }, [given]);
  const setPartner = useCallback(
    (mode: "synastry" | "composite", id: string | null) =>
      setPartners((p) => (mode === "synastry" ? { ...p, partnerId: id } : { ...p, compositePartnerId: id })),
    [],
  );
  const applySaved = useCallback((next: SavedChart) => optsRef.current.onChart?.(next.id), []);
  const beginAddPartner = useCallback((page: StudioPage) => optsRef.current.onAddPerson?.(page), []);

  const pair = useMemo(
    () => ({ partnerId: partners.partnerId, compositePartnerId: partners.compositePartnerId, addingPartnerFor: null, anchorId: null, compositeKind }),
    [partners, compositeKind],
  );
  const state = useMemo<ScopeState>(
    () => ({
      chart,
      input,
      timeUnknown: row?.timeUnknown ?? false,
      activeId: row?.id ?? null,
      dossier,
      grok: row?.grok ?? null,
      creating: false,
      casting: false,
      composing: false,
      selectedId,
      pick,
      choose,
      clear,
      pair,
      setPartner,
      applySaved,
      beginAddPartner,
      setNumerologyY: keepAsIs,
    }),
    [chart, input, row, dossier, selectedId, pick, choose, clear, pair, setPartner, applySaved, beginAddPartner],
  );
  const [slots] = useState(createSlotStore);
  const readingBeside = opts.readingBeside ?? false;
  const openReading = useCallback(() => optsRef.current.openReading?.(), []);
  const canRead = Boolean(opts.openReading);
  const { page, moment } = opts;
  const setMoment = useCallback((patch: Partial<ScopeMoment>) => optsRef.current.setMoment?.(patch), []);
  return useMemo<ChartScope>(
    () => ({ id: opts.id, state, slots, readingBeside, openReading: canRead ? openReading : undefined, page, moment, setMoment: moment ? setMoment : undefined }),
    [opts.id, state, slots, readingBeside, canRead, openReading, page, moment, setMoment],
  );
}
