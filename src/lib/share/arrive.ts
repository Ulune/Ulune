/*
 * A shared chart arriving (share plan, feature 1). The /s page has read the
 * link (lib/share/link.ts); here its charts are cast in the tab, kept as the
 * reader's private space allows, and opened on the page the link names (two
 * charts: that Relationship page, the second as the partner):
 *   - a space open: kept at once ("Camille's chart is now in your private
 *     space"); a birth it already keeps just opens, never twice;
 *   - a space locked: the chart opens in the tab's memory and is sealed into
 *     the space's inbox (lib/space/inbox.ts), which joins the space at the
 *     next unlock, after a reload or days later (S2); a space that has no
 *     inbox yet keeps nothing, and the page says to unlock it to keep it;
 *   - no space: it opens in memory, with the offer to create one.
 * A chart received carries "Shared with you, <date>" in the switcher until
 * the reader opens it there; the mark is kept in the sealed record only. A
 * link only adds: it never changes or removes a chart the reader keeps.
 */
import { showArrivalNote } from "@/components/share/share-state";
import { birthKey, saveLocalLibrary, toStoredRow, type StoredRow } from "@/lib/chart/library";
import type { BirthInput } from "@/lib/chart/types";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { importWithRetry } from "@/lib/lazy-retry";
import { CHART_RECORD } from "@/lib/space/records";
import { openVault, spaceBridge, useSpace, type SpaceStatus } from "@/lib/space/state";
import { toast } from "@/lib/toast";
import { pagePath } from "@/studio/map";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import { partnerSlot } from "./compose";
import type { SharedBirth, SharePayload } from "./format";

function say(key: keyof typeof shareWords, vars: Record<string, string> = {}): string {
  let text: string = shareWords[key][document.documentElement.lang === "fr" ? 1 : 0];
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return text;
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Waits for `test` to hold, at most `ms`; whether it did. */
async function until(test: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (!test()) {
    if (Date.now() > end) return false;
    await sleep(50);
  }
  return true;
}

/** A shared birth as the birth form would give it to a cast. */
export function birthInputOf(s: SharedBirth): BirthInput {
  const input: BirthInput = {
    name: s.name ?? "",
    date: s.date,
    time: s.time,
    latitude: s.latitude,
    longitude: s.longitude,
    placeLabel: s.placeLabel ?? "",
    houseSystem: s.houseSystem,
    timeUnknown: s.timeUnknown,
  };
  if (s.zone) input.zone = s.zone;
  if (s.tz) input.tz = s.tz;
  if (s.fold === 0 || s.fold === 1) input.fold = s.fold;
  if (s.birthName) input.birthName = s.birthName;
  if (s.currentName) input.currentName = s.currentName;
  if (s.numerologyY) input.numerologyY = { name: s.birthName || s.name || "", roles: s.numerologyY };
  if (s.chineseCount) input.chineseCount = s.chineseCount;
  return input;
}

/** Remember the tab's library as it is now (the studio reads it when it mounts). */
function saveTab(): void {
  const s = useStudioStore.getState();
  saveLocalLibrary(s.rows, s.activeId);
}

/** One birth cast in the tab, marked as shared; its new chart's id, or null when the cast failed. */
async function castShared(input: BirthInput, at: number): Promise<string | null> {
  const before = new Set(useStudioStore.getState().rows.map((r) => r.id));
  await useStudioStore.getState().cast(input, { replaceId: null });
  const s = useStudioStore.getState();
  const row = s.rows.find((r) => !before.has(r.id));
  if (!row) return null;
  useStudioStore.setState({ rows: s.rows.map((r) => (r.id === row.id ? { ...r, sharedAt: at } : r)) });
  saveTab();
  return row.id;
}

/** The births the open space keeps already, by birth (date, time, place, houses: library.ts, birthKey). */
async function keptBirths(): Promise<Set<string>> {
  const out = new Set<string>();
  const vault = openVault();
  if (!vault) return out;
  try {
    const { rows } = await vault.list<StoredRow>(CHART_RECORD);
    for (const [, row] of rows) if (row?.input) out.add(birthKey(row.input));
  } catch {
    /* looked for again once the studio holds the space's charts */
  }
  return out;
}

/** The first chart shown, the second beside it as the page's partner: found by birth, whichever copy the tab holds. */
function pick(keys: readonly string[], page: StudioPage): void {
  const s = useStudioStore.getState();
  const find = (key: string) => s.rows.find((r) => birthKey(r.input) === key);
  const a = find(keys[0]);
  if (a && (s.activeId !== a.id || !s.chart)) s.select(a.id);
  const b = keys[1] ? find(keys[1]) : undefined;
  if (b && b.id !== a?.id) useStudioStore.getState().setPartner(partnerSlot(page), b.id);
  saveTab();
}

/** Once the space's sheet is down (it asks to unlock on arrival), and only if the space is still locked. */
function whenSheetDown(fn: () => void): void {
  if (!useSpace.getState().sheet) {
    fn();
    return;
  }
  const stop = useSpace.subscribe((s) => {
    if (s.sheet) return;
    stop();
    fn();
  });
}

/**
 * Opens the shared charts. `go` takes the reader to a studio address (the
 * /s page's router). False when a cast failed (offline): the /s page offers
 * to try again with what it read.
 */
export async function receiveShared(payload: SharePayload, go: (href: string) => Promise<unknown>, locale: string): Promise<boolean> {
  // Every page looks for the space as it opens (SpaceGate): its answer first.
  await until(() => useSpace.getState().status !== "checking", 15_000);
  const at = Date.now();
  const inputs = payload.charts.map(birthInputOf);
  const keys = inputs.map((input) => birthKey(input));
  const both = inputs.length === 2 && keys[1] !== keys[0];
  const kept = useSpace.getState().status === "open" ? await keptBirths() : new Set<string>();

  const fresh: string[] = [];
  for (let i = 0; i < inputs.length; i++) {
    if (i === 1 && !both) break;
    if (kept.has(keys[i])) continue;
    // Opened twice in this tab: the copy here.
    if (useStudioStore.getState().rows.some((r) => birthKey(r.input) === keys[i])) continue;
    const id = await castShared(inputs[i], at);
    if (!id) return false;
    fresh.push(id);
  }

  // What the space allows now (it may have been unlocked while the charts were cast).
  const status: SpaceStatus = useSpace.getState().status;
  let sealed = fresh.length > 0;
  if (status === "locked" && fresh.length) {
    const { keepWhileLocked } = await importWithRetry(() => import("@/lib/space/inbox"));
    for (const id of fresh) {
      const row = useStudioStore.getState().rows.find((r) => r.id === id);
      const done = row ? await keepWhileLocked(toStoredRow(row)).catch(() => "no-key" as const) : "no-key";
      if (done !== "sealed") sealed = false;
    }
  }

  pick(both ? keys : keys.slice(0, 1), payload.page);
  await go(pagePath(payload.page, locale));
  const name = payload.charts[0].name;

  if (status === "open") {
    // The studio takes the space's charts and seals those cast here (studio/space-sync.ts, through the
    // space's bridge once the studio is up); then the right copies are picked.
    if (await until(() => spaceBridge()?.joined() ?? false, 20_000)) pick(both ? keys : keys.slice(0, 1), payload.page);
    if (!fresh.length) toast(name ? say("shareAlready", { name }) : say("shareAlreadyUnnamed"), "ok", 6000);
    else if (fresh.length === 2) toast(say("shareKeptBoth"), "ok", 6000);
    else {
      const newName = (kept.has(keys[0]) && payload.charts[1] ? payload.charts[1] : payload.charts[0]).name;
      toast(newName ? say("shareKept", { name: newName }) : say("shareKeptUnnamed"), "ok", 6000);
    }
  } else if (status === "locked" && fresh.length) {
    if (sealed) {
      whenSheetDown(() => {
        if (useSpace.getState().status === "locked") toast(say(fresh.length === 2 ? "shareLaterBoth" : "shareLater"), "ok", 6000);
      });
    } else {
      showArrivalNote({ kind: "unlock", both: fresh.length === 2 });
    }
  } else if (status === "none") {
    showArrivalNote({ kind: "offer", both });
  }
  return true;
}
