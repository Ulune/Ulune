import { create } from "zustand";
import { importWithRetry } from "@/lib/lazy-retry";
import { openVault } from "@/lib/space/state";
import { setStaleReloadCheck } from "@/lib/stale-chunks";
import { castChart, searchPlaces } from "@/lib/chart/functions";
import { loadPack, packNow } from "@/lib/content/packs";
import {
  blankBirth,
  chartDisplayName,
  emptyDossier,
  hydrateBirthInput,
  saveLocalLibrary,
  upsertInMemory,
  type SavedChart,
} from "@/lib/chart/library";
import { normalizeBirth, parseCoords, resolveTimeUnknown } from "@/lib/chart/parse-birth";
import { chartMoved, needsSwissUpgrade } from "@/lib/chart/visibility";
import type { BirthInput, GrokReading, LocalDossier, NatalChart } from "@/lib/chart/types";
import { aiAccountNow } from "@/lib/ai/use-ai-account";
import { providerName } from "@/lib/ai/providers";
import { aiFailureText } from "@/lib/ai/failure-text";
import { personalWords, type Hidden } from "@/lib/ai/scrub";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { errorForState } from "@/lib/i18n/errors";
import { loadDockOpen, saveDockOpen } from "@/studio/dock/dock-layout";
import { loadStudioView, type StudioPage, type StudioView } from "@/studio/url";

export type DockTab = "reading" | "bodies" | "look" | "birth";

/**
 * The synastry and composite partners (chart ids), as the studio opens: from
 * the private space, or from what versions before it left in this browser
 * (studio/space-sync.ts, library-boot.ts). Kept in memory like the library.
 */
export function hydratePair(pair: { partnerId: string | null; compositePartnerId: string | null }) {
  const now = useStudioStore.getState().pair;
  useStudioStore.setState({
    pair: { ...now, partnerId: pair.partnerId, compositePartnerId: pair.compositePartnerId },
  });
}

type I18nBind = {
  locale: "en" | "fr";
  untitled: string;
  couldNotCast: string;
  couldNotSaveLocal: string;
};

const i18n: I18nBind = {
  locale: "en",
  untitled: "Untitled",
  couldNotCast: "Could not cast",
  couldNotSaveLocal: "Could not save",
};

export function bindStudioI18n(next: Partial<I18nBind>) {
  Object.assign(i18n, next);
}

let hydrated = false;
let castGen = 0;
let composeGen = 0;
let draft = false;
let composingLock = false;
let creatingLock = false;
let swissUpgrade: string | null = null;
let locale: "en" | "fr" = "en";

export function studioFlags() {
  return {
    hydrated,
    draft,
    composingLock,
    creatingLock,
  };
}

export function setStudioLocale(v: "en" | "fr") {
  locale = v;
}

/** A natal cast's deadline: a minute (the server stops at 90 s anyway). */
const CAST_TIMEOUT_MS = 60_000;
function castDeadline(): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(CAST_TIMEOUT_MS)
    : undefined;
}

/**
 * Where the birth is, found on this device: typed coordinates, the place
 * picked from the list, or else the first answer of the place search (which
 * goes through Ulune's server). The cast itself then carries coordinates only.
 */
async function resolvePlace(
  input: BirthInput,
  lang: AppLocale,
): Promise<{ latitude: number; longitude: number; placeLabel: string; zone?: string }> {
  const typed = parseCoords(input.placeLabel);
  if (typed) {
    return { ...typed, placeLabel: `${typed.latitude.toFixed(4)}, ${typed.longitude.toFixed(4)}` };
  }
  const label = input.placeLabel.trim();
  if (Number.isFinite(input.latitude) && Number.isFinite(input.longitude)) {
    return { latitude: input.latitude, longitude: input.longitude, placeLabel: label, zone: input.zone };
  }
  if (!label) throw new Error("E:place.missing");
  let hits;
  try {
    hits = await searchPlaces({ data: { q: label, locale: lang } });
  } catch (err) {
    const code = errorForState(err);
    throw new Error(code === "E:net.offline" || code === "E:net.unreachable" || code === "E:net.timeout" ? code : "E:place.lookup");
  }
  const hit = hits[0];
  if (!hit) throw new Error(`E:place.notfound|${label.replace(/\s+/g, " ").slice(0, 100)}`);
  return { latitude: hit.latitude, longitude: hit.longitude, placeLabel: hit.label, zone: hit.timezone || undefined };
}

/**
 * The names and birthplaces an AI must not see: the chart in view first
 * ("Person A"), then the synastry and composite partners, then every other
 * saved chart (lib/ai/scrub.ts).
 */
export function aiHiddenWords(lang: AppLocale): Hidden[] {
  const s = useStudioStore.getState();
  const byId = (id: string | null) => (id ? s.rows.find((r) => r.id === id)?.chart : undefined);
  const charts = [s.chart, byId(s.pair.partnerId), byId(s.pair.compositePartnerId)];
  const seen = new Set(charts);
  for (const row of s.rows) if (!seen.has(row.chart)) charts.push(row.chart);
  // Numerology's names (part 64) stand for their person too.
  const names = charts.map((chart) => {
    const input = chart && chart === s.chart ? s.input : s.rows.find((r) => r.chart === chart)?.input;
    return input ? [input.birthName, input.currentName] : undefined;
  });
  return personalWords(charts, lang, names);
}

type LibrarySlice = {
  rows: SavedChart[];
  activeId: string | null;
  creating: boolean;
  input: BirthInput;
  chart: NatalChart | null;
  dossier: LocalDossier | null;
  grok: GrokReading | null;
  timeUnknown: boolean;
  casting: boolean;
  composing: boolean;
  error: string | null;
  composeError: string | null;
  formEpoch: number;
};

type NavSlice = {
  page: StudioPage;
  /**
   * The page just pressed, while it is on its way (use-studio-url.ts): the
   * bars show it at once, so the press answers before the page is drawn.
   */
  navPage: StudioPage | null;
  /** A year for the Calendar to open on (a reading's "Calendar" link), taken once by useTiming. */
  calendarAt: { year: number } | null;
  view: StudioView;
  dock: DockTab;
  dockOpen: boolean;
};

type StudioState = LibrarySlice &
  NavSlice & {
    selectedId: string | null;
    time: { at: number; live: boolean; spanOrigin: number; progressionTarget: number };
    pair: {
      partnerId: string | null;
      compositePartnerId: string | null;
      addingPartnerFor: StudioPage | null;
      anchorId: string | null;
      /** The relationship chart shown: the composite (midpoints) or the Davison (review 3 Oct, P6); for the visit. */
      compositeKind: "composite" | "davison";
    };
    applySaved: (row: SavedChart) => void;
    restoreLibrary: (rows: SavedChart[], pickId?: string | null) => void;
    persistRow: (entry: {
      id?: string | null;
      input: BirthInput;
      chart: NatalChart;
      dossier: LocalDossier;
      grok: GrokReading | null;
      timeUnknown: boolean;
    }) => Promise<string>;
    cast: (
      next: BirthInput,
      opts?: { keepGrok?: boolean; replaceId?: string | null; previous?: NatalChart },
    ) => Promise<void>;
    /** `quiet`: asked by a language switch, not the reader; no key means nothing to do. */
    compose: (lang?: "en" | "fr", opts?: { quiet?: boolean }) => Promise<void>;
    startNew: (opts?: { keepChart?: boolean; partner?: boolean }) => void;
    edit: (id: string) => void;
    remove: (id: string) => Promise<void>;
    select: (id: string) => void;
    pick: (id: string) => void;
    /** Choose on the chart itself: selected, the panel left as it is. */
    choose: (id: string) => void;
    clear: () => void;
    setInput: (next: BirthInput) => void;
    /** Numerology: the birth name's Y's switched by hand (none: as the rule says), kept with the chart. */
    setNumerologyY: (next: BirthInput["numerologyY"] | null) => void;
    /**
     * Numerology's names (the full name at birth, the name used now), kept
     * with the chart at once: they change no position, so no new cast.
     */
    setNumerologyNames: (next: Pick<BirthInput, "birthName" | "currentName">) => void;
    setPage: (page: StudioPage) => void;
    setNavPage: (page: StudioPage | null) => void;
    setView: (view: StudioView) => void;
    openDock: (tab: DockTab) => void;
    toggleDock: () => void;
    beginEdit: () => void;
    setPartner: (mode: "synastry" | "composite", id: string | null) => void;
    beginAddPartner: (mode: StudioPage) => void;
    finishAddPartner: (newId: string) => void;
    discardDraft: () => void;
    pin: (at: number) => void;
    now: () => void;
    setProgressionTarget: (at: number) => void;
  };

export const useStudioStore = create<StudioState>((set, get) => ({
  rows: [],
  activeId: null,
  creating: false,
  input: blankBirth(),
  chart: null,
  dossier: null,
  grok: null,
  timeUnknown: false,
  casting: false,
  composing: false,
  error: null,
  composeError: null,
  formEpoch: 0,
  selectedId: null,
  page: "natal",
  navPage: null,
  calendarAt: null,
  view: loadStudioView(),
  dock: "birth",
  dockOpen: loadDockOpen(),
  time: { at: Date.now(), live: true, spanOrigin: Date.now(), progressionTarget: Date.now() },
  pair: { partnerId: null, compositePartnerId: null, addingPartnerFor: null, anchorId: null, compositeKind: "composite" },

  applySaved: (row) => {
    draft = false;
    creatingLock = false;
    composingLock = false;
    const input = hydrateBirthInput(row);
    set({
      creating: false,
      activeId: row.id,
      input,
      chart: row.chart,
      // Ready at once when the reading text has loaded; otherwise the
      // workspace builds it when the text arrives.
      dossier: packNow("astro", locale)?.dossierFor(row.chart, locale) ?? null,
      grok: row.grok,
      timeUnknown: row.timeUnknown,
      error: null,
      composeError: null,
      formEpoch: get().formEpoch + 1,
    });
    if (needsSwissUpgrade(row.chart) && swissUpgrade !== row.id) {
      void get().cast(input, { keepGrok: true, replaceId: row.id, previous: row.chart });
    }
  },

  restoreLibrary: (rows, pickId) => {
    if (composingLock || draft || creatingLock) {
      if (rows.length) {
        const active = get().activeId;
        const stillThere = Boolean(active && rows.some((r) => r.id === active));
        const keep =
          (stillThere ? active : null) ??
          (pickId && rows.some((r) => r.id === pickId) ? pickId : null) ??
          rows[0]?.id ??
          null;
        set({ rows, ...(stillThere ? {} : { activeId: keep }) });
        saveLocalLibrary(rows, keep);
      }
      hydrated = true;
      return;
    }
    if (!rows.length && (get().chart || get().rows.length)) {
      hydrated = true;
      return;
    }
    hydrated = true;
    const pick = (pickId ? rows.find((r) => r.id === pickId) : undefined) ?? rows[0];
    saveLocalLibrary(rows, pick?.id ?? null);
    set({ rows });
    if (pick) get().applySaved(pick);
    else {
      set({
        activeId: null,
        creating: false,
        input: blankBirth(),
        chart: null,
        dossier: null,
        grok: null,
      });
    }
  },

  persistRow: async (entry) => {
    const local = upsertInMemory(get().rows, entry);
    set({ rows: local.rows, activeId: local.id });
    const ok = saveLocalLibrary(local.rows, local.id);
    if (!ok) set({ error: i18n.couldNotSaveLocal });
    return local.id;
  },

  cast: async (next, opts) => {
    const gen = ++castGen;
    const replaceId =
      opts?.replaceId !== undefined ? opts.replaceId : creatingLock ? null : get().activeId;
    set({ casting: true, error: null, composeError: null });
    if (!opts?.keepGrok) set({ grok: null });
    try {
      // The date and time are read here first, so a mistyped one never
      // leaves the device.
      normalizeBirth({ ...next, placeLabel: "" });
      const place = await resolvePlace(next, locale);
      if (gen !== castGen) return;
      const result = await castChart({
        // A cast is well under a second; one with no answer in a minute stops here.
        signal: castDeadline(),
        data: {
          date: next.date,
          time: next.time,
          latitude: place.latitude,
          longitude: place.longitude,
          houseSystem: next.houseSystem,
          timeUnknown: resolveTimeUnknown(next),
          zone: place.zone,
          tz: next.tz,
          fold: next.fold,
          locale,
        },
      });
      if (gen !== castGen) return;
      // The server never had the place's name: it goes back on the chart here.
      result.chart.meta.placeLabel = place.placeLabel;
      // A recast under newer calculation rules can move the chart (a
      // historical time zone corrected, Local Mean Time of the birthplace):
      // an AI reading written for the old positions no longer describes it.
      const keepGrok = Boolean(opts?.keepGrok) && !(opts?.previous && chartMoved(opts.previous, result.chart));
      if (opts?.keepGrok && !keepGrok) set({ grok: null });
      // Numerology's names and Y's are kept without a cast, so they may have
      // changed while this one ran: the latest win, while this cast is still
      // about the chart on screen (or the one being made).
      const live = get();
      const sameChart = replaceId ? live.activeId === replaceId && !live.creating : live.creating;
      const named: BirthInput = {
        ...withoutKept(next),
        ...keptOf(sameChart ? live.input : next),
        name: next.name.trim() || result.chart.meta.name,
        placeLabel: result.chart.meta.placeLabel,
        latitude: result.chart.meta.latitude,
        longitude: result.chart.meta.longitude,
        date: result.chart.meta.date,
        time: result.timeUnknown ? "" : result.chart.meta.time,
        timeUnknown: Boolean(result.timeUnknown),
        houseSystem: result.chart.meta.houseSystemRequested ?? result.chart.meta.houseSystem,
      };
      result.chart.meta.name = named.name || chartDisplayName(named, i18n.untitled);
      const payload = { ...named, name: result.chart.meta.name };
      if (replaceId) swissUpgrade = replaceId;
      draft = false;
      creatingLock = false;
      composingLock = false;
      const nextDossier = packNow("astro", locale)?.dossierFor(result.chart, locale) ?? null;
      const page = get().page;
      const keepPage =
        page === "transits" ||
        page === "timing" ||
        page === "synastry" ||
        page === "composite" ||
        page === "progressions" ||
        page === "numerology" ||
        page === "design";
      set((s) => ({
        chart: result.chart,
        dossier: nextDossier,
        timeUnknown: Boolean(result.timeUnknown),
        input: payload,
        creating: false,
        selectedId:
          s.selectedId && (!nextDossier || nextDossier.byId[s.selectedId]) ? s.selectedId : null,
        page: !opts?.keepGrok && !keepPage ? "natal" : s.page,
        dock: opts?.keepGrok ? s.dock : "reading",
        dockOpen: true,
      }));
      const newId = await get().persistRow({
        id: replaceId,
        input: payload,
        chart: result.chart,
        dossier: nextDossier ?? emptyDossier(),
        grok: keepGrok ? get().grok : null,
        timeUnknown: Boolean(result.timeUnknown),
      });
      const adding = get().pair.addingPartnerFor;
      if (adding) {
        const anchor = get().pair.anchorId;
        get().finishAddPartner(newId);
        const row = get().rows.find((r) => r.id === anchor);
        if (row) get().applySaved(row);
        set({ page: adding, dock: "reading", dockOpen: true, creating: false });
      }
    } catch (err) {
      if (gen !== castGen) return;
      // A code the reader's language turns into a sentence (lib/i18n/errors.ts).
      set({ error: errorForState(err) });
    } finally {
      if (gen === castGen) set({ casting: false });
    }
  },

  compose: async (lang = locale, opts) => {
    const chart = get().chart;
    if (!chart) return;
    const account = aiAccountNow();
    const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
      translate(lang, key, vars);
    if (!account) {
      if (!opts?.quiet) set({ composeError: t("aiNeedKey") });
      return;
    }
    const gen = ++composeGen;
    const targetId = get().activeId;
    set({ composing: true, composeError: null });
    try {
      const [{ composeNatalReading }, astro] = await Promise.all([
        importWithRetry(() => import("@/lib/ai/run")),
        loadPack("astro", lang),
      ]);
      const outcome = await composeNatalReading({
        chart,
        locale: lang,
        account,
        dump: astro.dumpChartForPrompt,
        hidden: aiHiddenWords(lang),
      });
      if (gen !== composeGen) return;
      if (outcome.ok) {
        set({ grok: outcome.value });
        if (targetId && targetId === get().activeId) {
          const next = get().rows.map((row) => (row.id === targetId ? { ...row, grok: outcome.value } : row));
          set({ rows: next });
          saveLocalLibrary(next, targetId);
        }
      } else {
        set({ composeError: aiFailureText(outcome.kind, t, providerName(account.provider), "couldNotCompose") });
      }
    } catch {
      if (gen !== composeGen) return;
      set({ composeError: t("couldNotCompose") });
    } finally {
      if (gen === composeGen) set({ composing: false });
    }
  },

  startNew: (opts) => {
    if (creatingLock) {
      draft = true;
      composingLock = true;
      if (!get().creating) set({ creating: true, dock: "birth", dockOpen: true });
      else set({ dock: "birth", dockOpen: true });
      window.requestAnimationFrame(() => {
        document.getElementById("native-name")?.focus();
        document.getElementById("cast-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    draft = true;
    creatingLock = true;
    composingLock = true;
    castGen += 1;
    composeGen += 1;
    set({
      casting: false,
      composing: false,
      creating: true,
      input: blankBirth(),
      chart: opts?.keepChart ? get().chart : null,
      dossier: opts?.keepChart ? get().dossier : null,
      grok: opts?.keepChart ? get().grok : null,
      error: null,
      composeError: null,
      timeUnknown: false,
      formEpoch: get().formEpoch + 1,
      dock: "birth",
      dockOpen: true,
      pair: opts?.partner
        ? { ...get().pair, addingPartnerFor: get().page }
        : get().pair,
    });
    window.requestAnimationFrame(() => {
      document.getElementById("native-name")?.focus();
      document.getElementById("cast-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  },

  edit: (id) => {
    const row = get().rows.find((r) => r.id === id);
    if (!row) return;
    get().applySaved(row);
    set({ dock: "birth", dockOpen: true });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("cast-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("native-name")?.focus();
      });
    });
  },

  remove: async (id) => {
    const next = get().rows.filter((row) => row.id !== id);
    set({ rows: next });
    saveLocalLibrary(next, creatingLock ? get().activeId : (next[0]?.id ?? null));
    const pair = get().pair;
    if (pair.partnerId === id) get().setPartner("synastry", null);
    if (pair.compositePartnerId === id) get().setPartner("composite", null);
    if (get().activeId !== id) return;
    set({ activeId: next[0]?.id ?? null });
    if (creatingLock) return;
    const pick = next[0];
    if (pick) get().applySaved(pick);
    else {
      set({
        activeId: null,
        creating: false,
        input: blankBirth(),
        chart: null,
        dossier: null,
        grok: null,
        dock: "birth",
        dockOpen: true,
      });
    }
  },

  select: (id) => {
    const row = get().rows.find((r) => r.id === id);
    if (row) get().applySaved(row);
  },
  pick: (id) => {
    const next = get().selectedId === id ? null : id;
    set({
      selectedId: next,
      dock: next ? "reading" : get().dock,
      dockOpen: next ? true : get().dockOpen,
    });
  },
  // Choosing something on the chart itself lights it and readies its reading,
  // but never opens the panel: the chart stays whole, and the reader opens the
  // reading when they want it (the card over the stage, ReadCard.tsx, or the
  // panel's Reading tab). An open panel turns to the reading at once. (A row
  // of a table or a list is picked: it asks for its reading.)
  choose: (id) => {
    const next = get().selectedId === id ? null : id;
    set({
      selectedId: next,
      dock: next && get().dockOpen ? "reading" : get().dock,
    });
  },
  clear: () => set({ selectedId: null }),
  setInput: (next) => set({ input: next }),
  setNumerologyY: (next) => {
    keepWithChart((input) => {
      const { numerologyY: _drop, ...rest } = input;
      return next ? { ...rest, numerologyY: next } : rest;
    });
  },
  setNumerologyNames: (next) => {
    const birthName = (next.birthName ?? "").trim();
    const currentName = (next.currentName ?? "").trim();
    keepWithChart((input) => {
      const { birthName: _b, currentName: _c, ...rest } = input;
      return { ...rest, ...(birthName ? { birthName } : {}), ...(currentName ? { currentName } : {}) };
    });
  },
  setPage: (page) => set({ page, navPage: null }),
  setNavPage: (navPage) => set({ navPage }),
  setView: (view) => set({ view }),
  openDock: (tab) => {
    saveDockOpen(true);
    set({ dock: tab, dockOpen: true });
  },
  toggleDock: () => {
    const next = !get().dockOpen;
    saveDockOpen(next);
    set({ dockOpen: next });
  },
  beginEdit: () => {
    draft = true;
    composingLock = true;
    if (!get().chart) {
      creatingLock = true;
      set({ creating: true });
    }
  },
  setPartner: (mode, id) => {
    set({
      pair:
        mode === "synastry"
          ? { ...get().pair, partnerId: id }
          : { ...get().pair, compositePartnerId: id },
    });
  },
  beginAddPartner: (mode) => {
    const anchor = get().activeId;
    get().startNew({ keepChart: true, partner: true });
    set({ pair: { ...get().pair, addingPartnerFor: mode, anchorId: anchor } });
  },
  finishAddPartner: (newId) => {
    const mode = get().pair.addingPartnerFor;
    if (mode === "synastry") {
      set({ pair: { ...get().pair, partnerId: newId, addingPartnerFor: null, anchorId: null } });
    } else if (mode === "composite") {
      set({
        pair: { ...get().pair, compositePartnerId: newId, addingPartnerFor: null, anchorId: null },
      });
    } else set({ pair: { ...get().pair, addingPartnerFor: null, anchorId: null } });
  },
  discardDraft: () => {
    const anchor = get().pair.anchorId ?? get().activeId;
    draft = false;
    creatingLock = false;
    composingLock = false;
    set({
      creating: false,
      pair: { ...get().pair, addingPartnerFor: null, anchorId: null },
    });
    const row = get().rows.find((r) => r.id === anchor) ?? get().rows[0];
    if (row) get().applySaved(row);
    else {
      set({
        activeId: null,
        input: blankBirth(),
        chart: null,
        dossier: null,
        grok: null,
        timeUnknown: false,
        formEpoch: get().formEpoch + 1,
      });
    }
  },
  pin: (at) => {
    const t = get().time;
    const year = 365.25 * 24 * 60 * 60 * 1000;
    const spanOrigin = at < t.spanOrigin - year || at > t.spanOrigin + year ? at : t.spanOrigin;
    set({ time: { ...t, at, live: false, spanOrigin } });
  },
  now: () => {
    const at = Date.now();
    set({ time: { ...get().time, at, live: true, spanOrigin: at } });
  },
  setProgressionTarget: (at) => set({ time: { ...get().time, progressionTarget: at } }),
}));

/** What a chart keeps beside its birth, changed without a cast: numerology's names and Y's (parts 60, 64). */
type Kept = Pick<BirthInput, "birthName" | "currentName" | "numerologyY">;

function keptOf(input: BirthInput): Kept {
  const birthName = (input.birthName ?? "").trim();
  const currentName = (input.currentName ?? "").trim();
  return {
    ...(birthName ? { birthName } : {}),
    ...(currentName ? { currentName } : {}),
    ...(input.numerologyY ? { numerologyY: input.numerologyY } : {}),
  };
}

function withoutKept(input: BirthInput): BirthInput {
  const { birthName: _b, currentName: _c, numerologyY: _y, ...rest } = input;
  return rest;
}

/** The same birth moment and place: the chart on screen, whichever copy of it. */
function sameBirth(a: NatalChart, b: NatalChart): boolean {
  return (
    a === b ||
    (a.meta.date === b.meta.date && a.meta.time === b.meta.time && a.meta.latitude === b.meta.latitude && a.meta.longitude === b.meta.longitude)
  );
}

/**
 * Change what a chart keeps beside its birth (numerology's names and Y's):
 * in the input now, and in the saved chart on screen (in this tab, or in the
 * private space when one is open) without a new cast. A chart being created,
 * or a second person being added, gets them with its cast instead; a saved
 * chart that is not the one on screen is never written.
 */
function keepWithChart(patch: (input: BirthInput) => BirthInput) {
  const s = useStudioStore.getState();
  useStudioStore.setState({ input: patch(s.input) });
  if (s.creating || s.pair.addingPartnerFor || !s.chart) return;
  const row = s.activeId ? s.rows.find((r) => r.id === s.activeId) : undefined;
  if (!row || !sameBirth(row.chart, s.chart)) return;
  const input = patch(row.input);
  if (JSON.stringify(keptOf(input)) === JSON.stringify(keptOf(row.input))) return;
  void s.persistRow({
    id: row.id,
    input,
    chart: row.chart,
    dossier: row.dossier,
    grok: row.grok,
    timeUnknown: row.timeUnknown,
  });
}

// A reload for a code file gone after a deploy would lose the charts kept only
// in this tab (no private space open): the page then asks first (lib/stale-chunks.ts).
setStaleReloadCheck(() => useStudioStore.getState().rows.length > 0 && !openVault());
