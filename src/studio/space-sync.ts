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
  COMPARE_RECORD as COMPARE,
  NOTE_RECORD as NOTE,
  type CompareRecord,
  type LibraryRecord as LibraryState,
  type PairRecord as PairState,
} from "@/lib/space/records";
import { chartsWritten, setSpaceBridge, type SpaceBridge } from "@/lib/space/state";
import type { LockMode } from "@/lib/space/store";
import type { Vault } from "@/lib/space/vault";
import { toast } from "@/lib/toast";
import { hydratePair, useStudioStore } from "@/studio/store";
import { adoptPreviousChart, previousChartId } from "@/studio/show/flip";

/*
 * The studio's charts in the private space (lib/space). While it is open,
 * every change to the library (a cast, a reading written, a chart removed,
 * another chosen), to the partners and to Compare is sealed into it, one record per
 * chart; when it opens, its charts come into the studio, with those cast in
 * this tab while just looking and those kept in the clear before private
 * spaces existed (which are then erased). When it locks, they leave the page.
 */

let vault: Vault | null = null;
/** The rows as last sealed (by identity: a changed row is a new object). */
let written = new Map<string, SavedChart>();
let writtenLibrary = "";
let writtenPair = "";
let writtenCompare = "";
let unsubscribe: (() => void) | null = null;
let chain: Promise<void> = Promise.resolve();
let pending = 0;
/** The space whose charts the studio holds now, once open() has read them and sealed those that joined. */
let joined: Vault | null = null;

/**
 * The studio's library is the open space's (a chart shared by a link waits for it before it is
 * looked for there: lib/share/arrive.ts, through the bridge, so that the /s page's code does not
 * import this file and pull it out of the studio's first download).
 */
function spaceJoined(): boolean {
  return Boolean(joined?.isOpen) && joined === vault;
}

function lang(): "en" | "fr" {
  return typeof document !== "undefined" && document.documentElement.lang === "fr" ? "fr" : "en";
}

async function flush(): Promise<void> {
  const v = vault;
  if (!v?.isOpen) return;
  const { rows, activeId, pair, compare } = useStudioStore.getState();
  const puts: [string, unknown][] = [];
  const deletes: string[] = [];
  const now = new Map<string, SavedChart>();
  for (const row of rows) {
    now.set(row.id, row);
    if (written.get(row.id) !== row) puts.push([CHART + row.id, toStoredRow(row)]);
  }
  // A chart forgotten: its note goes with it (share and compare plan, idea B6; its groups let go of it in studio/groups/kept-store.ts).
  for (const id of written.keys()) if (!now.has(id)) deletes.push(CHART + id, NOTE + id);
  // With the chart open before this one (share and compare plan, idea B3: the P key's).
  const previousId = previousChartId();
  const library: LibraryState = { order: rows.map((r) => r.id), activeId, ...(previousId ? { previousId } : {}) };
  const libraryText = JSON.stringify(library);
  if (libraryText !== writtenLibrary) puts.push([LIBRARY, library]);
  const partners: PairState = { partnerId: pair.partnerId, compositePartnerId: pair.compositePartnerId };
  const pairText = JSON.stringify(partners);
  if (pairText !== writtenPair) puts.push([PAIR, partners]);
  // Compare, its second chart and linked selection (studio/compare): kept like the partners, as the store holds it.
  const compareText = JSON.stringify(compare satisfies CompareRecord);
  if (compareText !== writtenCompare) puts.push([COMPARE, compare]);
  // The first view shows the chart that is open; another chosen, it goes.
  const shown = firstViewChart();
  if (shown && shown !== activeId) forgetFirstView();
  if (!puts.length && !deletes.length) return;
  await v.write(puts, deletes);
  written = now;
  writtenLibrary = libraryText;
  writtenPair = pairText;
  writtenCompare = compareText;
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
  const compared = await v.get<CompareRecord>(COMPARE).catch(() => null);
  written = new Map(kept.map((row) => [row.id, row]));
  writtenLibrary = library ? JSON.stringify({ order: library.order, activeId: library.activeId, ...(library.previousId ? { previousId: library.previousId } : {}) }) : "";
  writtenPair = partners ? JSON.stringify({ partnerId: partners.partnerId, compositePartnerId: partners.compositePartnerId }) : "";
  writtenCompare = compared ? JSON.stringify(compared) : "";

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
  // Compare as the space left it (its own record, written above), unless this tab opened it meanwhile.
  if (compared && !state.compare.on) useStudioStore.setState({ compare: { ...state.compare, ...compared } });
  const same = merged.length === state.rows.length && merged.every((row, i) => row === state.rows[i]);
  if (!same) useStudioStore.getState().restoreLibrary(merged, activeId);
  else if (activeId !== state.activeId) useStudioStore.getState().select(activeId ?? "");
  // The chart open before (idea B3), as the space remembers it, unless this tab has one of its own.
  adoptPreviousChart(library?.previousId);

  // The first view is kept only while the space stays unlocked on this device.
  if (v.meta.lock === "stay") {
    const snap = await v.get<FirstViewSnapshot>(FIRST_VIEW_RECORD).catch(() => null);
    setFirstViewSink(firstViewSink, snap?.id ?? null);
  } else {
    setFirstViewSink(null);
  }

  unsubscribe?.();
  unsubscribe = useStudioStore.subscribe((s, prev) => {
    if (s.rows !== prev.rows || s.activeId !== prev.activeId || s.pair !== prev.pair || s.compare !== prev.compare) schedule();
  });
  await queue();
  if (legacy && v.isOpen) {
    eraseLegacyData();
    toast(translate(lang(), "spaceLegacyMoved"));
  }
  joined = v;
  finishLibraryBoot();
}

/**
 * Charts added to the space underneath the studio (a backup's), or changed on
 * the reader's other devices (the synced account, feature 4: `fresh`, those
 * changed there): what waits is sealed first, then the library is read again.
 * The chart open stays open, unless another device deleted it.
 */
async function reload(fresh: readonly string[] = []): Promise<void> {
  const v = vault;
  if (!v?.isOpen || !unsubscribe) return; // not joined yet: open() reads everything when it is
  window.clearTimeout(pending);
  await queue();
  const { kept, library } = await readKept(v);
  // The rows already on the page stay the same objects (nothing about them changed), but those changed elsewhere.
  const state = useStudioStore.getState();
  const changedThere = new Set(fresh);
  const onPage = new Map(state.rows.map((row) => [row.id, row]));
  const rows = kept.map((row) => (changedThere.has(row.id) ? row : (onPage.get(row.id) ?? row)));
  written = new Map(rows.map((row) => [row.id, row]));
  writtenLibrary = library ? JSON.stringify({ order: library.order, activeId: library.activeId, ...(library.previousId ? { previousId: library.previousId } : {}) }) : "";
  const same = rows.length === state.rows.length && rows.every((row, i) => row === state.rows[i]);
  if (same) return;
  // Every chart deleted on another device: none left here either (the library would keep the last ones on screen).
  if (!rows.length) {
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
      formEpoch: state.formEpoch + 1,
    });
    return;
  }
  if (state.activeId && rows.some((r) => r.id === state.activeId) && !changedThere.has(state.activeId)) {
    useStudioStore.setState({ rows });
    return;
  }
  // The chart open changed on another device (it is drawn again), or went (another opens).
  useStudioStore.getState().restoreLibrary(rows, (state.activeId && rows.some((r) => r.id === state.activeId) ? state.activeId : null) ?? library?.activeId ?? rows[0]?.id ?? null);
}

function close(): void {
  unsubscribe?.();
  unsubscribe = null;
  window.clearTimeout(pending);
  vault = null;
  joined = null;
  written = new Map();
  writtenLibrary = "";
  writtenPair = "";
  writtenCompare = "";
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
    compare: { on: false, partnerId: null, linked: true },
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
  joined: spaceJoined,
};

/** The studio takes part in the private space from now on (called once, when it mounts). */
export function joinSpace(): void {
  setSpaceBridge(bridge);
}
