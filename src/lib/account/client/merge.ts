/*
 * The synced account's rules on the device for what syncs and how two copies of a record become
 * one (share and compare plan, feature 4; docs/sync-protocol.md, section 6, "What devices do").
 * Pure, no imports: the sync engine (engine.ts) calls it, and scripts/account-client.test.mjs
 * holds every record kind to it.
 *
 * What syncs: every record of the private space but those that belong to one device: its check
 * record, the instant first view, the inbox's key, when a backup was last made, the AI keys (the
 * owner's decision: never synced), the partners chosen and Compare as left on this device, the
 * encyclopedia's pages recently read, and the engine's own state (sync/…). The space's description
 * (its id and its ways in, wrapped) syncs too, as the record "space/ways": the same passphrase,
 * passkeys and recovery code open the space on every device.
 *
 * How two copies meet, when both changed since they last agreed (a conflict):
 *   - a record on its own (a chart, a note, an encyclopedia note): the later write wins, by the
 *     time its device wrote it; a tie goes to the larger text, so both devices pick the same;
 *   - a change beats a deletion: a chart (or a note) changed on one device and deleted on the other
 *     comes back everywhere, so nothing is ever lost without the reader having seen it go;
 *   - lists are merged item by item against the copy both started from (the base, kept by the
 *     engine): the library's order, the groups (by id; a group's name by its time, its charts as a
 *     set; a group deleted on one device stays deleted: the base is its deletion mark), the homes
 *     (by id, the later one), the encyclopedia's bookmarks (by page), the ways in (by kind and
 *     passkey);
 *   - what belongs to one device inside a list record stays that device's: the chart open and the
 *     one open before it (state/library), the home open (fs/homes).
 * Without a base (a first sync), lists are joined: nothing is taken out.
 */

/** The space's description as a record: its id, its passkeys' user and its ways in, wrapped. */
export const SPACE_WAYS = "space/ways";
/** The engine's own state, sealed in the space, never synced. */
export const SYNC_PREFIX = "sync/";

const DEVICE_ONLY = new Set(["sys/check", "view/first", "inbox/key", "state/backup", "state/ai", "state/pair", "state/compare", "enc/recent"]);

/** Whether a record of the space syncs (false: it stays on this device). */
export function syncs(name: string): boolean {
  return name.length > 0 && name.length <= 512 && !DEVICE_ONLY.has(name) && !name.startsWith(SYNC_PREFIX);
}

export type Kind = "record" | "library" | "groups" | "homes" | "bookmarks" | "ways";

export function kindOf(name: string): Kind {
  if (name === "state/library") return "library";
  if (name === "state/groups") return "groups";
  if (name === "fs/homes") return "homes";
  if (name === "enc/bookmarks") return "bookmarks";
  if (name === SPACE_WAYS) return "ways";
  return "record";
}

/** Whether the engine keeps a kind's last synced value (its base), for three-way merges. */
export function keepsBase(kind: Kind): boolean {
  return kind !== "record";
}

/** One side of a conflict: its value (null: absent or deleted) and when its device wrote it (ms). */
export type Side = { value: unknown; t: number };

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** JSON with its keys in order: two equal values, one text, whatever order their keys came in. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (isObj(v)) {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

export function same(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

/** Of two values, the one written later; a tie to the larger text (the same choice on every device). */
function later(a: Side, b: Side): Side {
  if (a.t !== b.t) return a.t > b.t ? a : b;
  return canonical(a.value) >= canonical(b.value) ? a : b;
}

/* ------------------------------------------------------------ lists */

/**
 * Two lists of items with ids merged against their base. An item both have: `pick` chooses (or
 * merges). Only one has it: kept when it was added there, or changed there since the base; dropped
 * when the other deleted it and it is as the base had it. The order: the remote's when this device
 * did not reorder (its base items in the base's order), otherwise this device's; then what the
 * other list adds, in its order.
 */
export function mergeById<T>(
  local: readonly T[],
  remote: readonly T[],
  base: readonly T[] | null,
  id: (x: T) => string,
  pick: (l: T, r: T, b: T | undefined) => T,
): T[] {
  const L = new Map(local.map((x) => [id(x), x]));
  const R = new Map(remote.map((x) => [id(x), x]));
  const B = base ? new Map(base.map((x) => [id(x), x])) : null;
  const kept = new Map<string, T>();
  for (const key of new Set([...L.keys(), ...R.keys()])) {
    const l = L.get(key);
    const r = R.get(key);
    const b = B?.get(key);
    if (l !== undefined && r !== undefined) kept.set(key, pick(l, r, b));
    else if (l !== undefined) {
      // Only here: the other side deleted it (it was in the base), unless it changed here since.
      if (!B || b === undefined || !same(l, b)) kept.set(key, l);
    } else if (r !== undefined) {
      if (!B || b === undefined || !same(r, b)) kept.set(key, r);
    }
  }
  const localOrder = local.map(id);
  const remoteOrder = remote.map(id);
  const baseOrder = base ? base.map(id) : null;
  const unmoved = baseOrder !== null && same(localOrder.filter((k) => baseOrder.includes(k)), baseOrder.filter((k) => localOrder.includes(k)));
  const [first, second] = unmoved ? [remoteOrder, localOrder] : [localOrder, remoteOrder];
  const out: T[] = [];
  const placed = new Set<string>();
  for (const key of [...first, ...second]) {
    const item = kept.get(key);
    if (item === undefined || placed.has(key)) continue;
    placed.add(key);
    out.push(item);
  }
  return out;
}

/** Two lists of ids merged the same way (an id has no content: it is there or not). */
export function mergeIds(local: readonly string[], remote: readonly string[], base: readonly string[] | null): string[] {
  return mergeById(local, remote, base, (x) => x, (l) => l);
}

/** The newer of two items by their own time field (`at`, `savedAt`), ties to the larger text. */
function newer<T>(field: string): (l: T, r: T) => T {
  return (l, r) => {
    const tl = Number((l as Obj)[field]) || 0;
    const tr = Number((r as Obj)[field]) || 0;
    return later({ value: l, t: tl }, { value: r, t: tr }).value as T;
  };
}

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/* ------------------------------------------------------------ the kinds */

type Library = { order: string[]; activeId: string | null; previousId?: string };

function library(v: unknown): Library | null {
  if (!isObj(v)) return null;
  return {
    order: ids(v.order),
    activeId: typeof v.activeId === "string" ? v.activeId : null,
    ...(typeof v.previousId === "string" ? { previousId: v.previousId } : {}),
  };
}

/** The library: its order merged; the chart open (and the one before) stay this device's. `hasBase` false: never synced. */
function mergeLibrary(local: unknown, remote: unknown, base: unknown, hasBase: boolean): Library | null {
  const l = library(local);
  const r = library(remote);
  if (!l && !r) return null;
  const order = mergeIds(l?.order ?? [], r?.order ?? [], hasBase ? (library(base)?.order ?? []) : null);
  const activeId = l ? l.activeId : (r?.activeId ?? null);
  const previousId = l ? l.previousId : undefined;
  return { order, activeId, ...(previousId ? { previousId } : {}) };
}

type Group = { id: string; name: string; members: string[]; at: number };

function groups(v: unknown): Group[] {
  const list = isObj(v) ? v.groups : null;
  if (!Array.isArray(list)) return [];
  return list.flatMap((g) =>
    isObj(g) && typeof g.id === "string" && typeof g.name === "string"
      ? [{ id: g.id, name: g.name, members: ids(g.members), at: typeof g.at === "number" ? g.at : 0 }]
      : [],
  );
}

/** Case and accents aside, as the groups compare names (studio/groups/kept.ts, fold). */
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const GROUPS_MAX = 24;

/**
 * The groups: by id; a name changed on one side wins, on both the later; the charts in a group
 * merged as a set. Two groups of one name (made on two devices) become one, the smaller id's, with
 * the charts of both. At most 24, in order.
 */
function mergeGroups(local: unknown, remote: unknown, base: unknown, hasBase: boolean): { groups: Group[] } | null {
  const B = hasBase ? groups(base) : null;
  const merged = mergeById(groups(local), groups(remote), B, (g) => g.id, (l, r, b) => {
    const name = b && l.name === b.name ? r.name : b && r.name === b.name ? l.name : (later({ value: l, t: l.at }, { value: r, t: r.at }).value as Group).name;
    return { id: l.id, name, members: mergeIds(l.members, r.members, b ? b.members : null), at: Math.max(l.at, r.at) };
  });
  const out: Group[] = [];
  for (const g of merged) {
    const twin = out.find((o) => fold(o.name) === fold(g.name));
    if (!twin) {
      out.push({ ...g, members: [...g.members] });
      continue;
    }
    // One name, two groups: the smaller id stays, with both's charts.
    const keep = twin.id <= g.id ? twin : g;
    const other = keep === twin ? g : twin;
    const joined = { ...keep, members: [...new Set([...keep.members, ...other.members])], at: Math.max(keep.at, other.at) };
    out[out.indexOf(twin)] = joined;
  }
  const kept = out.slice(0, GROUPS_MAX);
  return kept.length ? { groups: kept } : null;
}

type Homes = { homes: Obj[]; activeId: string | null };

function homes(v: unknown): Homes {
  if (!isObj(v)) return { homes: [], activeId: null };
  return {
    homes: Array.isArray(v.homes) ? v.homes.filter((h): h is Obj => isObj(h) && typeof h.id === "string") : [],
    activeId: typeof v.activeId === "string" ? v.activeId : null,
  };
}

const HOMES_MAX = 12;

/** The homes: by id, the one saved later; the home open stays this device's (when it is still kept). */
function mergeHomes(local: unknown, remote: unknown, base: unknown, hasBase: boolean, localHere: boolean): Homes | null {
  const l = homes(local);
  const r = homes(remote);
  const list = mergeById(l.homes, r.homes, hasBase ? homes(base).homes : null, (h) => String(h.id), newer<Obj>("savedAt")).slice(0, HOMES_MAX);
  if (!list.length) return null;
  const want = localHere ? l.activeId : r.activeId;
  return { homes: list, activeId: want && list.some((h) => h.id === want) ? want : null };
}

function pages(v: unknown): Obj[] {
  return Array.isArray(v) ? v.filter((p): p is Obj => isObj(p) && typeof p.id === "string") : [];
}

/** The encyclopedia's bookmarks: by page; the newest first, as the page lists them. */
function mergeBookmarks(local: unknown, remote: unknown, base: unknown, hasBase: boolean): Obj[] | null {
  const list = mergeById(pages(local), pages(remote), hasBase ? pages(base) : null, (p) => String(p.id), newer<Obj>("at"));
  list.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
  return list.length ? list : null;
}

type Ways = { id: string; passkeyUser: string; wraps: Obj[] };

function ways(v: unknown): Ways | null {
  if (!isObj(v) || typeof v.id !== "string" || typeof v.passkeyUser !== "string" || !Array.isArray(v.wraps)) return null;
  return { id: v.id, passkeyUser: v.passkeyUser, wraps: v.wraps.filter((w): w is Obj => isObj(w) && typeof w.kind === "string") };
}

/** A wrap's place: the passphrase and the recovery code are one each, passkeys one per credential. */
const wrapKey = (w: Obj) => (w.kind === "passkey" ? `passkey:${String(w.credId)}` : String(w.kind));

/** Ways in that still open the space: a recovery code and something else. */
export function waysUsable(wraps: readonly Obj[]): boolean {
  return wraps.some((w) => w.kind === "recovery") && wraps.some((w) => w.kind !== "recovery");
}

/**
 * The space's ways in: the passphrase, the recovery code and each passkey merged by their place,
 * the later change winning when both changed one. Never another space's (another id), and never a
 * set that would not open the space: then this device's stay.
 */
function mergeWays(local: Side, remote: Side, base: unknown, hasBase: boolean): Ways | null {
  const l = ways(local.value);
  const r = ways(remote.value);
  if (!l) return r;
  if (!r || r.id !== l.id) return l;
  const b = hasBase ? ways(base) : null;
  const wraps = mergeById(l.wraps, r.wraps, b && b.id === l.id ? b.wraps : null, wrapKey, (lw, rw, bw) => {
    if (same(lw, rw)) return lw;
    if (bw && same(lw, bw)) return rw;
    if (bw && same(rw, bw)) return lw;
    return local.t >= remote.t ? lw : rw;
  });
  return waysUsable(wraps) ? { id: l.id, passkeyUser: l.passkeyUser, wraps } : l;
}

/* ------------------------------------------------------------ the rules, for the engine */

/**
 * What this device keeps when the server's copy arrives and this device's own did not change
 * since they last agreed: the server's, but what belongs to this device inside it stays (the
 * chart open, the home open), and the space's ways in only if they are this space's.
 */
export function adopt(name: string, local: unknown, remote: unknown): unknown {
  const kind = kindOf(name);
  if (kind === "library") {
    const r = library(remote);
    const l = library(local);
    if (!r) return null;
    if (!l) return r;
    return { order: r.order, activeId: l.activeId, ...(l.previousId ? { previousId: l.previousId } : {}) };
  }
  if (kind === "homes") {
    const r = homes(remote);
    if (!r.homes.length) return null;
    const want = local === null ? r.activeId : homes(local).activeId;
    return { homes: r.homes, activeId: want && r.homes.some((h) => h.id === want) ? want : null };
  }
  if (kind === "ways") {
    const l = ways(local);
    const r = ways(remote);
    if (!r || !waysUsable(r.wraps)) return local;
    if (l && r.id !== l.id) return local;
    return r;
  }
  return remote;
}

/**
 * Both copies changed since they last agreed (`base`, the value both had then; `hasBase` false
 * when this device never synced it): the value this device keeps, null for deleted. Its device
 * then sends it, unless it is the server's already.
 */
export function merge(name: string, local: Side, remote: Side, base: unknown, hasBase: boolean): unknown {
  const kind = kindOf(name);
  if (kind === "record") {
    // A change beats a deletion; two changes, the later.
    if (local.value === null) return remote.value;
    if (remote.value === null) return local.value;
    return later(local, remote).value;
  }
  if (kind === "library") return mergeLibrary(local.value, remote.value, base, hasBase);
  if (kind === "groups") return mergeGroups(local.value, remote.value, base, hasBase);
  if (kind === "homes") return mergeHomes(local.value, remote.value, base, hasBase, local.value !== null);
  if (kind === "bookmarks") return mergeBookmarks(local.value, remote.value, base, hasBase);
  return mergeWays(local, remote, base, hasBase);
}

/**
 * Whether what this device keeps is what the server holds, what belongs to one device aside (the
 * chart open, the home open): if not, this device sends its copy.
 */
export function agrees(name: string, kept: unknown, server: unknown): boolean {
  const kind = kindOf(name);
  if (kind === "library") return same(library(kept)?.order ?? null, library(server)?.order ?? null);
  if (kind === "homes") return same(homes(kept).homes, homes(server).homes);
  return same(kept, server);
}
