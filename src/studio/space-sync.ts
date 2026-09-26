import {
  blankBirth,
  clearLocalLibrary,
  fromStoredRow,
  readLegacyLibrary,
  toStoredRow,
  unseenRows,
  type SavedChart,
  type StoredRow,
} from "@/lib/chart/library";
import {
  FIRST_VIEW_RECORD,
  firstViewChart,
  forgetFirstView,
  setFirstViewSink,
  settleFirstView,
  type FirstViewSink,
  type FirstViewSnapshot,
} from "@/lib/first-view";
import { translate } from "@/lib/i18n/messages";
import { eraseLegacyData, hasLegacyData } from "@/lib/space/legacy";
import {
  CHART_RECORD as CHART,
  LIBRARY_RECORD as LIBRARY,
  PAIR_RECORD as PAIR,
  type LibraryRecord as LibraryState,
  type PairRecord as PairState,
} from "@/lib/space/records";
import { chartsWritten, setSpaceBridge, type SpaceBridge } from "@/lib/space/state";
import type { LockMode } from "@/lib/space/store";
import type { Vault } from "@/lib/space/vault";
import { toast } from "@/lib/toast";
import { hydratePair, useStudioStore } from "@/studio/store";

/*
 * The studio's charts in the private space (lib/space). While it is open,
 * every change to the library (a cast, a reading written, a chart removed,
 * another chosen) and to the partners is sealed into it, one record per
 * chart; when it opens, its charts come into the studio, with those cast in
 * this tab while just looking and those kept in the clear before private
 * spaces existed (which are then erased). When it locks, they leave the page.
 */

let vault: Vault | null = null;
/** The rows as last sealed (by identity: a changed row is a new object). */
let written = new Map<string, SavedChart>();
let writtenLibrary = "";
let writtenPair = "";
let unsubscribe: (() => void) | null = null;
let chain: Promise<void> = Promise.resolve();
let pending = 0;

function lang(): "en" | "fr" {
  return typeof document !== "undefined" && document.documentElement.lang === "fr" ? "fr" : "en";
}

async function flush(): Promise<void> {
  const v = vault;
  if (!v?.isOpen) return;
  const { rows, activeId, pair } = useStudioStore.getState();
  const puts: [string, unknown][] = [];
  const deletes: string[] = [];
  const now = new Map<string, SavedChart>();
  for (const row of rows) {
    now.set(row.id, row);
    if (written.get(row.id) !== row) puts.push([CHART + row.id, toStoredRow(row)]);
  }
  for (const id of written.keys()) if (!now.has(id)) deletes.push(CHART + id);
  const library: LibraryState = { order: rows.map((r) => r.id), activeId };
  const libraryText = JSON.stringify(library);
  if (libraryText !== writtenLibrary) puts.push([LIBRARY, library]);
  const partners: PairState = { partnerId: pair.partnerId, compositePartnerId: pair.compositePartnerId };
  const pairText = JSON.stringify(partners);
  if (pairText !== writtenPair) puts.push([PAIR, partners]);
  // The first view shows the chart that is open; another chosen, it goes.
  const shown = firstViewChart();
  if (shown && shown !== activeId) forgetFirstView();
  if (!puts.length && !deletes.length) return;
  await v.write(puts, deletes);
  written = now;
  writtenLibrary = libraryText;
  writtenPair = pairText;
  if (deletes.length || puts.some(([name]) => name.startsWith(CHART))) chartsWritten();
}

function queue(): Promise<void> {
  chain = chain.then(flush).catch(() => {
    /* not written (the space was erased in another tab): the tab keeps it */
  });
  return chain;
}

function schedule(): void {
  window.clearTimeout(pending);
  pending = window.setTimeout(() => void queue(), 120);
}

const firstViewSink: FirstViewSink = {
  save: (snap) => {
    const v = vault;
    if (v?.isOpen) void v.put(FIRST_VIEW_RECORD, snap).catch(() => {});
  },
  forget: () => {
    const v = vault;
    if (v?.isOpen) void v.remove(FIRST_VIEW_RECORD).catch(() => {});
  },
};

/** The space's rows in the order they were kept (new ones, out of the order, first). */
function ordered(rows: SavedChart[], order: readonly string[] | undefined): SavedChart[] {
  if (!order?.length) return [...rows].sort((a, b) => b.savedAt - a.savedAt);
  const at = new Map(order.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (at.get(a.id) ?? -1) - (at.get(b.id) ?? -1));
}

/** The space's charts and library record, read. */
async function readKept(v: Vault): Promise<{ kept: SavedChart[]; library: LibraryState | null }> {
  const { rows: stored } = await v.list<StoredRow>(CHART);
  const library = await v.get<LibraryState>(LIBRARY).catch(() => null);
  const kept = ordered(
    stored.map(([, row]) => fromStoredRow(row)).filter((row): row is SavedChart => row !== null),
    library?.order,
  );
  return { kept, library };
}

/** The page's own first steps are over (library-boot.ts waits for a space that opens by itself). */
export function finishLibraryBoot(): void {
  const s = useStudioStore.getState();
  settleFirstView(Boolean(s.chart) && !s.creating);
  document.documentElement.removeAttribute("data-returning");
}

async function open(v: Vault): Promise<void> {
  // Back in the studio with the same space open: nothing to load again.
  if (vault === v && unsubscribe) {
    finishLibraryBoot();
    return;
  }
  vault = v;
  const { kept, library } = await readKept(v);
  const partners = await v.get<PairState>(PAIR).catch(() => null);
  written = new Map(kept.map((row) => [row.id, row]));
  writtenLibrary = library ? JSON.stringify({ order: library.order, activeId: library.activeId }) : "";
  writtenPair = partners ? JSON.stringify({ partnerId: partners.partnerId, compositePartnerId: partners.compositePartnerId }) : "";

  // Charts cast in this tab while just looking, and those kept in the clear
  // before private spaces: they join it.
  const state = useStudioStore.getState();
  const legacy = hasLegacyData() ? readLegacyLibrary() : null;
  const joining = unseenRows([...state.rows, ...(legacy?.rows ?? [])], kept);
  const merged = [...joining, ...kept];
  const activeId =
    (state.activeId && merged.some((r) => r.id === state.activeId) ? state.activeId : null) ??
    (library?.activeId && merged.some((r) => r.id === library.activeId) ? library.activeId : null) ??
    merged[0]?.id ??
    null;
  hydratePair({
    partnerId: state.pair.partnerId ?? partners?.partnerId ?? legacy?.partnerId ?? null,
    compositePartnerId: state.pair.compositePartnerId ?? partners?.compositePartnerId ?? legacy?.compositePartnerId ?? null,
  });
  const same = merged.length === state.rows.length && merged.every((row, i) => row === state.rows[i]);
  if (!same) useStudioStore.getState().restoreLibrary(merged, activeId);
  else if (activeId !== state.activeId) useStudioStore.getState().select(activeId ?? "");

  // The first view is kept only while the space stays unlocked on this device.
  if (v.meta.lock === "stay") {
    const snap = await v.get<FirstViewSnapshot>(FIRST_VIEW_RECORD).catch(() => null);
    setFirstViewSink(firstViewSink, snap?.id ?? null);
  } else {
    setFirstViewSink(null);
  }

  unsubscribe?.();
  unsubscribe = useStudioStore.subscribe((s, prev) => {
    if (s.rows !== prev.rows || s.activeId !== prev.activeId || s.pair !== prev.pair) schedule();
  });
  await queue();
  if (legacy && v.isOpen) {
    eraseLegacyData();
    toast(translate(lang(), "spaceLegacyMoved"));
  }
  finishLibraryBoot();
}

/**
 * Charts added to the space underneath the studio (a backup's): what waits is
 * sealed first, then the library is read again. The chart open stays open.
 */
async function reload(): Promise<void> {
  const v = vault;
  if (!v?.isOpen || !unsubscribe) return; // not joined yet: open() reads everything when it is
  window.clearTimeout(pending);
  await queue();
  const { kept, library } = await readKept(v);
  // The rows already on the page stay the same objects (nothing about them changed).
  const state = useStudioStore.getState();
  const onPage = new Map(state.rows.map((row) => [row.id, row]));
  const rows = kept.map((row) => onPage.get(row.id) ?? row);
  written = new Map(rows.map((row) => [row.id, row]));
  writtenLibrary = library ? JSON.stringify({ order: library.order, activeId: library.activeId }) : "";
  if (state.activeId && rows.some((r) => r.id === state.activeId)) {
    useStudioStore.setState({ rows });
    return;
  }
  useStudioStore.getState().restoreLibrary(rows, library?.activeId ?? rows[0]?.id ?? null);
}

function close(): void {
  unsubscribe?.();
  unsubscribe = null;
  window.clearTimeout(pending);
  vault = null;
  written = new Map();
  writtenLibrary = "";
  writtenPair = "";
  setFirstViewSink(null);
  clearLocalLibrary();
  const pair = useStudioStore.getState().pair;
  useStudioStore.setState({
    rows: [],
    activeId: null,
    creating: false,
    input: blankBirth(),
    chart: null,
    dossier: null,
    grok: null,
    selectedId: null,
    error: null,
    composeError: null,
    pair: { ...pair, partnerId: null, compositePartnerId: null, addingPartnerFor: null, anchorId: null },
    formEpoch: useStudioStore.getState().formEpoch + 1,
  });
}

function lockChanged(lock: LockMode): void {
  if (lock === "stay") {
    setFirstViewSink(firstViewSink, null);
    return;
  }
  // No copy of the wheel is kept for a space that locks.
  forgetFirstView();
  firstViewSink.forget();
  setFirstViewSink(null);
}

const bridge: SpaceBridge = {
  open: async (v) => {
    await open(v);
  },
  beforeLock: async () => {
    window.clearTimeout(pending);
    await queue();
  },
  close,
  lockChanged,
  reload,
};

/** The studio takes part in the private space from now on (called once, when it mounts). */
export function joinSpace(): void {
  setSpaceBridge(bridge);
}
